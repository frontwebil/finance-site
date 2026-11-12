/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

export function SendMessageToUser({ chat_id }: { chat_id: any }) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => setToast(null), 2800);

    return () => clearTimeout(timeout);
  }, [toast]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

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
          parse_mode: "HTML",
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.message || "Помилка відправки повідомлення");
      }

      setMessage("");
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

            <textarea
              placeholder="Введіть текст повідомлення..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />

            <div className="modal__buttons">
              <button onClick={() => setIsOpenModal(false)} disabled={isLoading}>
                Скасувати
              </button>

              <button onClick={handleSend} disabled={!message.trim() || isLoading}>
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

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
