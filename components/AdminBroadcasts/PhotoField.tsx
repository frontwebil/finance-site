"use client";

import Image from "next/image";
import { useId, useState, type ChangeEvent } from "react";
import "./photo-field.css";

type PhotoFieldProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
};

export default function PhotoField({
  value,
  onChange,
  onUploadingChange,
  disabled,
}: PhotoFieldProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    onUploadingChange?.(busy);
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/broadcasts/upload", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as {
        photoUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.photoUrl) {
        throw new Error(result.error || "Не вдалося завантажити фото");
      }
      onChange(result.photoUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не вдалося завантажити фото");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photo-field">
      <span className="photo-field__label">Фото (необов&apos;язково)</span>

      {value ? (
        <div className="photo-field__preview">
          <Image src={value} alt="Фото розсилки" width={160} height={120} />
          <div className="photo-field__actions">
            <label htmlFor={inputId} className="photo-field__button">
              Замінити
            </label>
            <button
              type="button"
              className="photo-field__button photo-field__button--danger"
              onClick={() => onChange(null)}
              disabled={disabled || uploading}
            >
              Прибрати фото
            </button>
          </div>
        </div>
      ) : (
        <label htmlFor={inputId} className="photo-field__button">
          {uploading ? "Завантаження..." : "+ Додати фото"}
        </label>
      )}

      <input
        id={inputId}
        className="photo-field__input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={upload}
        disabled={disabled || uploading}
      />

      {uploading && value && <small className="photo-field__hint">Завантаження...</small>}
      {!error && <small className="photo-field__hint">JPG, PNG або WebP до 5 МБ</small>}
      {error && (
        <small className="photo-field__error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
