/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import PhotoField from "@/components/AdminBroadcasts/PhotoField";
import { WEB_APP_URL } from "@/data/offers";
import { MAX_CAPTION_LENGTH } from "@/lib/broadcast-validation";

export function SendMessageToUser({ chat_id }: { chat_id: any }) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [message, setMessage] = useState("");
  const [buttonText, setButtonText] = useState("Відкрити");
  const [buttonType, setButtonType] = useState<"miniapp" | "link">("miniapp");
  const [buttonUrl, setButtonUrl] = useState(WEB_APP_URL);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const canSend = (Boolean(message.trim()) || Boolean(photoUrl)) && !uploading && !isLoading;
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => setToast(null), 2800);

    return () => clearTimeout(timeout);
  }, [toast]);

  const handleSend = async () => {
    if (!canSend) return;

    if (photoUrl && message.trim().length > MAX_CAPTION_LENGTH) {
      setToast({
        type: "error",
        message: `Текст під фото задовгий: максимум ${MAX_CAPTION_LENGTH} символи`,
      });
      return;
    }

    const trimmedButtonText = buttonText.trim();
    const effectiveButtonUrl = buttonType === "miniapp" ? WEB_APP_URL : buttonUrl.trim();

    if (!trimmedButtonText) {
      setToast({ type: "error", message: "Введіть текст кнопки" });
      return;
    }

    if (buttonType === "link" && !effectiveButtonUrl) {
      setToast({ type: "error", message: "Додайте посилання для кнопки" });
      return;
    }

    if (buttonType === "link") {
      try {
        new URL(effectiveButtonUrl);
      } catch {
        setToast({ type: "error", message: "Некоректне посилання для кнопки" });
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chat_id.toString(),
          message,
          buttonText: trimmedButtonText,
          buttonType,
          buttonUrl: effectiveButtonUrl,
          photoUrl,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Помилка відправки повідомлення");
      }

      setMessage("");
      setButtonText("Відкрити");
      setButtonType("miniapp");
      setButtonUrl(WEB_APP_URL);
      setPhotoUrl(null);
      setIsOpenModal(false);
      setToast({ type: "success", message: "Повідомлення успішно надіслано" });
    } catch (error) {
      console.error(error);
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Не вдалося надіслати повідомлення",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className="users-table__send-button"
        onClick={() => setIsOpenModal(true)}
      >
        Повідомлення
      </button>

      {isOpenModal && (
        <div className="modal-overlay" onClick={() => setIsOpenModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Надіслати повідомлення</h3>

            <PhotoField
              value={photoUrl}
              onChange={setPhotoUrl}
              onUploadingChange={setUploading}
              disabled={isLoading}
            />

            <textarea
              placeholder={
                photoUrl
                  ? "Текст під фото (необов'язково, до 1024 символів)..."
                  : "Введіть текст повідомлення..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />

            <div className="cta-block">
              <label className="field-label">Текст кнопки</label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Наприклад: Відкрити"
              />
            </div>

            <div className="cta-block">
              <label className="field-label">Тип кнопки</label>
              <div className="toggle-group" role="radiogroup" aria-label="Тип кнопки">
                {[
                  { value: "miniapp", label: "Mini app" },
                  { value: "link", label: "Посилання" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`toggle-option ${buttonType === option.value ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="buttonType"
                      checked={buttonType === option.value}
                      onChange={() => setButtonType(option.value as "miniapp" | "link")}
                    />
                    <span className="checkmark" aria-hidden="true" />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {buttonType === "link" && (
              <div className="cta-block">
                <label className="field-label">Посилання</label>
                <input
                  type="url"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            )}

            <div className="modal__buttons">
              <button onClick={() => setIsOpenModal(false)} disabled={isLoading}>
                Скасувати
              </button>

              <button onClick={handleSend} disabled={!canSend}>
                {isLoading ? (
                  <>
                    <span className="send-btn-spinner" />
                    Надсилається...
                  </>
                ) : (
                  "Відправити"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 9999,
            padding: "12px 16px",
            borderRadius: 12,
            background: toast.type === "success" ? "#1f9d62" : "#d93025",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            minWidth: 220,
            maxWidth: 320,
          }}
        >
          {toast.message}
        </div>
      )}

      <style jsx>{`
        .send-btn-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          margin-right: 8px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          vertical-align: middle;
        }

        .cta-block {
          margin-top: 14px;
        }

        .field-label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
        }

        input[type="text"],
        input[type="url"],
        textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px 12px;
          font: inherit;
          background: #fff;
          box-sizing: border-box;
        }

        textarea {
          resize: vertical;
          min-height: 110px;
        }

        .toggle-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .toggle-option {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 999px;
          background: #f9fafb;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s ease;
        }

        .toggle-option.selected {
          background: #e6f7ee;
          border-color: #22a06b;
          color: #0f6d42;
        }

        .toggle-option input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .checkmark {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid #9ca3af;
          position: relative;
          display: inline-block;
          background: #fff;
        }

        .toggle-option.selected .checkmark {
          border-color: #22a06b;
          background: #22a06b;
        }

        .toggle-option.selected .checkmark::after {
          content: "";
          position: absolute;
          left: 4px;
          top: 1px;
          width: 4px;
          height: 8px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
