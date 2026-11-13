"use client";

import Image from "next/image";
import { useState, type FormEvent, type ChangeEvent, type DragEvent } from "react";
import { moveItem } from "@/lib/offer-order";
import AdminSidebar from "@/components/AdminSidebar/AdminSidebar";
import LogoutButton from "@/components/AdminDashboard/LogoutButton";
import OfferCard from "@/components/OfferCard";
import "@/components/AdminDashboard/page.css";
import "./page.css";

type Offer = {
  id: string;
  name: string;
  logoUrl: string;
  maxAmount: number;
  minRate: number;
  currency: string;
  promoText: string | null;
  buttonText: string;
  affiliateUrl: string;
  isActive: boolean;
  order: number;
};

type OfferForm = Omit<
  Offer,
  "id" | "maxAmount" | "minRate" | "order" | "promoText"
> & {
  maxAmount: string;
  minRate: string;
  order: string;
  promoText: string;
};

const emptyForm: OfferForm = {
  name: "",
  logoUrl: "",
  maxAmount: "",
  minRate: "",
  currency: "₴",
  promoText: "",
  buttonText: "Отримати →",
  affiliateUrl: "",
  isActive: true,
  order: "0",
};

type AdminOffersPageProps = {
  initialOffers: Offer[];
};

export default function AdminOffersPage({
  initialOffers,
}: AdminOffersPageProps) {
  const [offers, setOffers] = useState(initialOffers);
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  async function saveOrder(next: Offer[]) {
    const previous = offers;
    const reordered = next.map((offer, index) => ({ ...offer, order: index }));
    setOffers(reordered);
    if (editingId) {
      const edited = reordered.find((offer) => offer.id === editingId);
      if (edited) updateForm("order", String(edited.order));
    }
    setSavingOrder(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/offers/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((offer) => offer.id) }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Не вдалося зберегти порядок");
      }
      setNotice("Порядок збережено");
    } catch (reason) {
      setOffers(previous);
      setError(reason instanceof Error ? reason.message : "Не вдалося зберегти порядок");
    } finally {
      setSavingOrder(false);
    }
  }

  function moveOffer(from: number, to: number) {
    if (savingOrder || from === to || to < 0 || to >= offers.length) return;
    void saveOrder(moveItem(offers, from, to));
  }

  function resetDrag() {
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDragStart(event: DragEvent<HTMLElement>, index: number) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", offers[index].id);
    setDragIndex(index);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, index: number) {
    if (dragIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropIndex !== index) setDropIndex(index);
  }

  function handleDrop(event: DragEvent<HTMLElement>, index: number) {
    event.preventDefault();
    if (dragIndex !== null) moveOffer(dragIndex, index);
    resetDrag();
  }

  function updateForm<K extends keyof OfferForm>(
    key: K,
    value: OfferForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editOffer(offer: Offer) {
    setEditingId(offer.id);
    setForm({
      ...offer,
      maxAmount: String(offer.maxAmount),
      minRate: String(offer.minRate),
      promoText: offer.promoText ?? "",
      order: String(offer.order),
    });
    setError("");
    setNotice("");
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    try {
      const payload = {
        ...form,
        maxAmount: Number(form.maxAmount),
        minRate: Number(form.minRate),
        order: Number(form.order),
        promoText: form.promoText.trim() || null,
      };
      const response = await fetch(
        editingId ? `/api/admin/offers/${editingId}` : "/api/admin/offers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as {
        offer?: Offer;
        error?: string;
      };
      if (!response.ok || !result.offer) {
        throw new Error(result.error ?? "Не вдалося зберегти офер");
      }
      const savedOffer = result.offer;

      setOffers((current) =>
        editingId
          ? current.map((offer) =>
              offer.id === savedOffer.id ? savedOffer : offer,
            )
          : [...current, savedOffer],
      );
      resetForm();
      setNotice(editingId ? "Зміни збережено" : "Офер додано");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Не вдалося зберегти офер",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setError("");
    setNotice("");
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/admin/offers/upload", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        logoUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.logoUrl) {
        throw new Error(result.error ?? "Не вдалося завантажити логотип");
      }
      updateForm("logoUrl", result.logoUrl);
      setNotice("Логотип завантажено");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не вдалося завантажити логотип",
      );
    } finally {
      setUploading(false);
    }
  }

  async function deleteOffer(offer: Offer) {
    if (!window.confirm(`Видалити офер «${offer.name}»?`)) return;

    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/offers/${offer.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Не вдалося видалити офер");
      }

      setOffers((current) => current.filter((item) => item.id !== offer.id));
      if (editingId === offer.id) resetForm();
      setNotice("Офер видалено");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Не вдалося видалити офер",
      );
    }
  }

  const previewOffer = {
    id: editingId ?? "preview",
    name: form.name || "Назва оферу",
    logoUrl: form.logoUrl,
    maxAmount: Number(form.maxAmount) || 0,
    minRate: Number(form.minRate) || 0,
    currency: form.currency || "₴",
    promoText: form.promoText || null,
    buttonText: form.buttonText || "Отримати →",
    affiliateUrl: form.affiliateUrl || "#",
  };

  return (
    <main className="dashboard-page">
      <AdminSidebar active="offers" />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Керування</p>
            <h1>Офери</h1>
          </div>
          <LogoutButton />
        </header>

        {error && (
          <p className="offers-message offers-message--error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="offers-message offers-message--success" role="status">
            {notice}
          </p>
        )}

        <div className="offers-layout">
          <section className="panel offers-list" aria-label="Усі офери">
            <div className="panel__header">
              <h2>Усі офери</h2>
              <span>{offers.length} загалом</span>
            </div>
            {offers.length > 1 && (
              <p className="offers-list__hint">
                Змінюйте порядок на сайті стрілочками ↑ ↓ або перетягуванням рядка за ⠿ (на
                комп&apos;ютері).
              </p>
            )}
            {offers.length === 0 ? (
              <p className="users-empty">Оферів ще немає. Додайте перший.</p>
            ) : (
              <div className="offers-list__items" aria-busy={savingOrder}>
                {offers.map((offer, index) => (
                  <article
                    className={[
                      "offer-row",
                      dragIndex === index ? "offer-row--dragging" : "",
                      dropIndex === index && dragIndex !== null && dragIndex !== index
                        ? dragIndex < index
                          ? "offer-row--drop-after"
                          : "offer-row--drop-before"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={offer.id}
                    draggable={!savingOrder}
                    onDragStart={(event) => handleDragStart(event, index)}
                    onDragOver={(event) => handleDragOver(event, index)}
                    onDrop={(event) => handleDrop(event, index)}
                    onDragEnd={resetDrag}
                  >
                    <div className="offer-row__order">
                      <span className="offer-row__handle" aria-hidden="true" title="Перетягніть">
                        ⠿
                      </span>
                      <button
                        className="offer-row__arrow"
                        type="button"
                        onClick={() => moveOffer(index, index - 1)}
                        disabled={savingOrder || index === 0}
                        aria-label={`Підняти «${offer.name}» вище`}
                      >
                        ↑
                      </button>
                      <button
                        className="offer-row__arrow"
                        type="button"
                        onClick={() => moveOffer(index, index + 1)}
                        disabled={savingOrder || index === offers.length - 1}
                        aria-label={`Опустити «${offer.name}» нижче`}
                      >
                        ↓
                      </button>
                    </div>
                    {offer.logoUrl ? (
                      <Image
                        className="offer-row__logo"
                        src={offer.logoUrl}
                        alt=""
                        width={80}
                        height={48}
                        unoptimized
                      />
                    ) : (
                      <div className="offer-row__logo offer-row__logo--empty">
                        Лого
                      </div>
                    )}
                    <div className="offer-row__details">
                      <strong>{offer.name}</strong>
                      <span>
                        до {offer.maxAmount.toLocaleString("uk-UA")}{" "}
                        {offer.currency} · від {offer.minRate}%
                      </span>
                      <span
                        className={
                          offer.isActive
                            ? "offer-status offer-status--active"
                            : "offer-status"
                        }
                      >
                        {offer.isActive ? "Активний" : "Вимкнений"}
                      </span>
                    </div>
                    <div className="offer-row__actions">
                      <button
                        className="offer-action"
                        type="button"
                        onClick={() => editOffer(offer)}
                      >
                        Змінити
                      </button>
                      <button
                        className="offer-action offer-action--delete"
                        type="button"
                        onClick={() => deleteOffer(offer)}
                      >
                        Видалити
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="offers-editor-column">
            <section className="panel offers-form-panel">
              <div className="panel__header">
                <h2>{editingId ? "Редагувати офер" : "Новий офер"}</h2>
                {editingId && (
                  <button
                    className="offer-action"
                    type="button"
                    onClick={resetForm}
                  >
                    Скасувати
                  </button>
                )}
              </div>

              <form className="offer-form" onSubmit={submitForm}>
                <label>
                  Назва
                  <input
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                  />
                </label>

                <div className="offer-form__upload">
                  <label>
                    Логотип (JPG, PNG або WebP, до 5 МБ)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={uploadLogo}
                      disabled={uploading}
                    />
                  </label>
                  {uploading && <span>Завантаження логотипа...</span>}
                  {form.logoUrl && (
                    <Image
                      src={form.logoUrl}
                      alt="Завантажений логотип"
                      width={120}
                      height={50}
                      unoptimized
                    />
                  )}
                </div>

                <div className="offer-form__grid">
                  <label>
                    Максимальна сума
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={form.maxAmount}
                      onChange={(event) =>
                        updateForm("maxAmount", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Мінімальна ставка (%)
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minRate}
                      onChange={(event) =>
                        updateForm("minRate", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Валюта
                    <input
                      required
                      maxLength={8}
                      value={form.currency}
                      onChange={(event) =>
                        updateForm("currency", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Порядок показу
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.order}
                      onChange={(event) =>
                        updateForm("order", event.target.value)
                      }
                    />
                  </label>
                </div>

                <label>
                  Промо-текст (необов’язково)
                  <input
                    maxLength={80}
                    value={form.promoText}
                    onChange={(event) =>
                      updateForm("promoText", event.target.value)
                    }
                  />
                </label>
                <label>
                  Текст кнопки
                  <input
                    required
                    maxLength={40}
                    value={form.buttonText}
                    onChange={(event) =>
                      updateForm("buttonText", event.target.value)
                    }
                  />
                </label>
                <label>
                  Партнерське посилання
                  <input
                    required
                    type="url"
                    placeholder="https://..."
                    value={form.affiliateUrl}
                    onChange={(event) =>
                      updateForm("affiliateUrl", event.target.value)
                    }
                  />
                </label>
                <label className="offer-form__checkbox">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      updateForm("isActive", event.target.checked)
                    }
                  />
                  Показувати на сайті
                </label>
                <button
                  className="offer-form__submit"
                  type="submit"
                  disabled={saving || uploading}
                >
                  {saving
                    ? "Збереження..."
                    : editingId
                      ? "Зберегти зміни"
                      : "Додати офер"}
                </button>
              </form>
            </section>

            <section className="offers-preview" aria-label="Попередній перегляд">
              <h2>Попередній перегляд</h2>
              <OfferCard offer={previewOffer} />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
