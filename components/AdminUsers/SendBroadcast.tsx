"use client";

import { useState } from "react";
import PhotoField from "@/components/AdminBroadcasts/PhotoField";
import { WEB_APP_URL } from "@/data/offers";
import { MAX_CAPTION_LENGTH } from "@/lib/broadcast-validation";

type BroadcastBatchResult = {
  attempted: number;
  failed: number;
  nextCursor: number;
  maxId: number;
  done: boolean;
};

export default function SendBroadcast() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [buttonText, setButtonText] = useState("Відкрити");
  const [buttonType, setButtonType] = useState<"miniapp" | "link" | "none">(
    "miniapp",
  );
  const [buttonUrl, setButtonUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0 });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closeModal = () => {
    if (isSending) return;
    setIsOpen(false);
    setConfirming(false);
    setError(null);
    setResult(null);
  };

  const handleBroadcast = async () => {
    const trimmedMessage = message.trim();
    const trimmedButtonText = buttonText.trim();
    const effectiveButtonUrl =
      buttonType === "miniapp" ? WEB_APP_URL : buttonUrl.trim();

    if (!trimmedMessage && !photoUrl) {
      setError("Введіть текст повідомлення або додайте фото.");
      return;
    }

    if (buttonType !== "none" && !trimmedButtonText) {
      setError("Введіть текст кнопки.");
      return;
    }

    if (photoUrl && trimmedMessage.length > MAX_CAPTION_LENGTH) {
      setError(`Текст під фото задовгий: максимум ${MAX_CAPTION_LENGTH} символи.`);
      return;
    }

    if (buttonType === "link") {
      try {
        const url = new URL(effectiveButtonUrl);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new Error("Unsupported URL protocol");
        }
      } catch {
        setError("Введіть коректне посилання (http:// або https://).");
        return;
      }
    }

    // In-modal confirmation instead of window.confirm(), which some embedded browsers block.
    if (!confirming) {
      setError(null);
      setConfirming(true);
      return;
    }

    setConfirming(false);
    setIsSending(true);
    setError(null);
    setResult(null);
    setProgress({ sent: 0, failed: 0 });

    let cursor = 0;
    let maxId: number | null = null;
    let sent = 0;
    let failed = 0;

    try {
      while (true) {
        const response = await fetch("/api/admin/send-broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmedMessage,
            buttonText: trimmedButtonText,
            buttonType,
            buttonUrl: effectiveButtonUrl,
            photoUrl,
            cursor,
            maxId,
          }),
        });

        const data = (await response.json()) as
          | BroadcastBatchResult
          | { error?: string };
        if (!response.ok || !("attempted" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Не вдалося продовжити розсилку.",
          );
        }

        sent += data.attempted - data.failed;
        failed += data.failed;
        cursor = data.nextCursor;
        maxId = data.maxId;
        setProgress({ sent, failed });

        if (data.done) break;
      }

      setResult(
        `Розсилку завершено. Успішно: ${sent}, з помилками: ${failed}.`,
      );
    } catch (sendError) {
      setError(
        `${sendError instanceof Error ? sendError.message : "Помилка розсилки"} Успішно: ${sent}, з помилками: ${failed}.`,
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="broadcast-button"
        onClick={() => setIsOpen(true)}
      >
        Запустити розсилку
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="broadcast-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="broadcast-title">Розсилка користувачам</h3>

            {result ? (
              <>
                <p className="broadcast-result">{result}</p>
                <div className="modal__buttons">
                  <button type="button" onClick={closeModal}>
                    Готово
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="broadcast-warning">
                  Повідомлення буде надіслано всім користувачам зі списку.
                </p>
                <PhotoField
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  onUploadingChange={setUploading}
                  disabled={isSending}
                />
                <textarea
                  placeholder={
                    photoUrl
                      ? "Текст під фото (необов'язково, до 1024 символів)..."
                      : "Введіть текст повідомлення..."
                  }
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  disabled={isSending}
                />

                <fieldset className="broadcast-field">
                  <legend>Тип кнопки</legend>
                  <div className="broadcast-options">
                    <label>
                      <input
                        type="radio"
                        name="broadcast-button-type"
                        checked={buttonType === "miniapp"}
                        onChange={() => setButtonType("miniapp")}
                        disabled={isSending}
                      />
                      Mini app
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="broadcast-button-type"
                        checked={buttonType === "link"}
                        onChange={() => setButtonType("link")}
                        disabled={isSending}
                      />
                      Посилання
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="broadcast-button-type"
                        checked={buttonType === "none"}
                        onChange={() => setButtonType("none")}
                        disabled={isSending}
                      />
                      Без кнопки
                    </label>
                  </div>
                </fieldset>

                {buttonType !== "none" && (
                  <>
                    <div className="broadcast-field">
                      <label htmlFor="broadcast-button-text">
                        Текст кнопки
                      </label>
                      <input
                        id="broadcast-button-text"
                        type="text"
                        value={buttonText}
                        onChange={(event) => setButtonText(event.target.value)}
                        disabled={isSending}
                      />
                    </div>
                    {buttonType === "link" && (
                      <div className="broadcast-field">
                        <label htmlFor="broadcast-button-url">Посилання</label>
                        <input
                          id="broadcast-button-url"
                          type="url"
                          value={buttonUrl}
                          onChange={(event) => setButtonUrl(event.target.value)}
                          placeholder="https://example.com"
                          disabled={isSending}
                        />
                      </div>
                    )}
                  </>
                )}

                {isSending && (
                  <p className="broadcast-progress" aria-live="polite">
                    Надіслано: {progress.sent}; помилок: {progress.failed}
                  </p>
                )}
                {error && (
                  <p className="broadcast-error" role="alert">
                    {error}
                  </p>
                )}
                {confirming && (
                  <p className="broadcast-confirm" role="alert">
                    Точно надіслати це повідомлення всім користувачам зі списку?
                  </p>
                )}

                <div className="modal__buttons">
                  <button
                    type="button"
                    onClick={confirming ? () => setConfirming(false) : closeModal}
                    disabled={isSending}
                  >
                    {confirming ? "Назад" : "Скасувати"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBroadcast}
                    disabled={isSending || uploading || (!message.trim() && !photoUrl)}
                  >
                    {isSending
                      ? "Надсилається..."
                      : confirming
                        ? "Так, надіслати всім"
                        : "Надіслати всім"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .broadcast-button {
          border: 0;
          border-radius: 10px;
          background: #0837d3;
          color: #fff;
          padding: 10px 16px;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        .broadcast-button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .broadcast-warning,
        .broadcast-progress,
        .broadcast-result,
        .broadcast-error {
          margin: 0 0 14px;
          font-size: 14px;
        }

        .broadcast-warning,
        .broadcast-progress {
          color: #475569;
        }

        .broadcast-error {
          color: #b91c1c;
        }

        .broadcast-confirm {
          margin: 14px 0 0;
          padding: 10px 12px;
          border-radius: 10px;
          background: #fef3c7;
          color: #92400e;
          font-size: 14px;
          font-weight: 600;
        }

        .broadcast-result {
          color: #166534;
        }

        .broadcast-field {
          margin: 14px 0 0;
          padding: 0;
          border: 0;
        }

        .broadcast-field label,
        .broadcast-field legend {
          display: block;
          margin-bottom: 8px;
          color: #1f2937;
          font-size: 13px;
          font-weight: 600;
        }

        .broadcast-field input[type="text"],
        .broadcast-field input[type="url"] {
          box-sizing: border-box;
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px 12px;
          background: #fff;
          font: inherit;
        }

        .broadcast-options {
          display: flex;
          gap: 16px;
        }

        .broadcast-options label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
