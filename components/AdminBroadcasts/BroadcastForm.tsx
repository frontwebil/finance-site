"use client";

import { useState, type FormEvent } from "react";
import {
  MAX_MESSAGE_LENGTH,
  parseScheduleInput,
  type ButtonType,
  type ScheduleInput,
} from "@/lib/broadcast-validation";

type BroadcastFormProps = {
  initial?: ScheduleInput;
  onSubmit: (values: ScheduleInput) => Promise<void>;
  onClose: () => void;
};

const BUTTON_TYPES: Array<{ value: ButtonType; label: string }> = [
  { value: "miniapp", label: "Mini app" },
  { value: "link", label: "Посилання" },
  { value: "none", label: "Без кнопки" },
];

export default function BroadcastForm({ initial, onSubmit, onClose }: BroadcastFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [sendTime, setSendTime] = useState(initial?.sendTime ?? "10:00");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [buttonType, setButtonType] = useState<ButtonType>(initial?.buttonType ?? "miniapp");
  const [buttonText, setButtonText] = useState(initial?.buttonText ?? "Відкрити");
  const [buttonUrl, setButtonUrl] = useState(initial?.buttonUrl ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseScheduleInput({
      title,
      sendTime,
      message,
      buttonType,
      buttonText,
      buttonUrl,
      isActive,
    });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSubmit(parsed.value);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не вдалося зберегти розсилку");
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <form
        className="modal bc-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bc-form-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 id="bc-form-title">{initial ? "Редагувати розсилку" : "Нова розсилка"}</h3>

        <div className="bc-form__row">
          <label className="bc-field bc-field--grow">
            <span>Назва</span>
            <input
              type="text"
              value={title}
              maxLength={100}
              placeholder="Наприклад, Ранкова підбірка"
              onChange={(event) => setTitle(event.target.value)}
              disabled={saving}
            />
          </label>
          <label className="bc-field">
            <span>Час (Київ)</span>
            <input
              type="time"
              value={sendTime}
              onChange={(event) => setSendTime(event.target.value)}
              disabled={saving}
              required
            />
          </label>
        </div>

        <label className="bc-field">
          <span>Текст повідомлення</span>
          <textarea
            value={message}
            rows={6}
            placeholder="Введіть текст повідомлення..."
            onChange={(event) => setMessage(event.target.value)}
            disabled={saving}
          />
          <small className={message.trim().length > MAX_MESSAGE_LENGTH ? "bc-hint bc-hint--error" : "bc-hint"}>
            Підтримується HTML-форматування Telegram · {message.trim().length} / {MAX_MESSAGE_LENGTH}
          </small>
        </label>

        <fieldset className="bc-field">
          <legend>Тип кнопки</legend>
          <div className="bc-options">
            {BUTTON_TYPES.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="bc-button-type"
                  checked={buttonType === option.value}
                  onChange={() => setButtonType(option.value)}
                  disabled={saving}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        {buttonType !== "none" && (
          <label className="bc-field">
            <span>Текст кнопки</span>
            <input
              type="text"
              value={buttonText}
              onChange={(event) => setButtonText(event.target.value)}
              disabled={saving}
            />
          </label>
        )}

        {buttonType === "link" && (
          <label className="bc-field">
            <span>Посилання</span>
            <input
              type="url"
              value={buttonUrl}
              placeholder="https://example.com"
              onChange={(event) => setButtonUrl(event.target.value)}
              disabled={saving}
            />
          </label>
        )}

        <label className="bc-checkbox">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={saving}
          />
          Увімкнено — відправляти щодня
        </label>

        {error && (
          <p className="bc-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__buttons">
          <button type="button" onClick={close} disabled={saving}>
            Скасувати
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Збереження..." : "Зберегти"}
          </button>
        </div>
      </form>
    </div>
  );
}
