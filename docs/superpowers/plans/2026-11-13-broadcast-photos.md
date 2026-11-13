# Фото в розсилках — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Необов'язкове фото в щоденних і ручній розсилках (Cloudinary → `sendPhoto` з підписом і кнопкою).

**Architecture:** `photoUrl` додається в `BroadcastContent`, схему та знімок запуску; `sendTelegramMessage` обирає метод API; спільний Cloudinary-хелпер обслуговує оферів і розсилки.

**Tech Stack:** Next.js 16.4, Prisma 7, Vitest 4, Telegram Bot API, Cloudinary.

**Spec:** `docs/superpowers/specs/2026-11-13-broadcast-photos-design.md`

## Global Constraints
- Фото — тільки `https:` URL; JPG/PNG/WebP, ≤ 5 МБ; папка Cloudinary `broadcasts`.
- З фото: текст необов'язковий, ≤ 1024 символи. Без фото: текст обов'язковий, ≤ 4096.
- Відповідь маршруту оферів `{ logoUrl }` не змінюється.
- Реальна відправка — лише в тестову базу (2 користувачі), як погоджено раніше.

## Review Focus
- Фото без тексту й без кнопки → `sendPhoto` без `caption` і без `reply_markup` (Task 1).
- Текст 1025 символів з фото → відхилено; без фото → прийнято (Task 1).
- Редагування розсилки: прибрали фото → `photoUrl: null` зберігається, а не лишається старе (Task 3, перевірка в браузері).
- Telegram не може забрати фото (`400 wrong file identifier/HTTP URL specified`) → класифікується як `content` (Task 1).

---

### Task 1: Валідація та відправка фото

**Files:** Modify `lib/broadcast-validation.ts`, `lib/telegram.ts`; Test `lib/broadcast-validation.test.ts`, `lib/telegram.test.ts`

**Interfaces — Produces:**
- `BroadcastContent = { message; buttonType; buttonText; buttonUrl; photoUrl: string | null }`
- `MAX_CAPTION_LENGTH = 1024`
- `sendTelegramMessage` → `POST …/sendPhoto` з `{ chat_id, photo, caption?, parse_mode: "HTML", reply_markup? }`, коли `photoUrl`

- [ ] Тести (RED): фото без тексту приймається; без тексту й фото — відхиляється; з фото 1025 → `ok:false` з «1024», 1024 → ok; `photoUrl: "http://x/a.png"` / `"javascript:…"` → відхилено; наявні очікування `toEqual` отримують `photoUrl: null`; `classifyTelegramError(400, "Bad Request: wrong file identifier/HTTP URL specified") === "content"`; `sendTelegramMessage` з фото кличе `sendPhoto`, тіло має `photo`, `caption`, без `text`; з фото й порожнім текстом — без `caption`.
- [ ] Run `npm test` → FAIL
- [ ] Реалізація
- [ ] Run `npm test` → PASS; `npx tsc --noEmit` → помилки лише там, де `BroadcastContent` будується без `photoUrl` (виправити в Task 3)
- [ ] Commit `feat: photo support in broadcast validation and Telegram client`

### Task 2: Спільне завантаження в Cloudinary

**Files:** Create `lib/cloudinary.ts`, `lib/cloudinary.test.ts`, `app/api/admin/broadcasts/upload/route.ts`; Modify `app/api/admin/offers/upload/route.ts`

**Interfaces — Produces:**
- `validateImageFile(file: { type: string; size: number }): string | null` (текст помилки або `null`)
- `cloudinarySignature(params: Record<string, string>, apiSecret: string): string` (sha1 відсортованих `k=v` через `&` + secret)
- `uploadImageToCloudinary(file: File, folder: string): Promise<{ ok: true; url: string } | { ok: false; status: number; error: string }>`
- `POST /api/admin/broadcasts/upload` (`verifySession`) → `{ photoUrl }`

- [ ] Тести (RED): `validateImageFile` — png 1 МБ → null; gif → помилка; 0 байт → помилка; 5 МБ + 1 → помилка; `cloudinarySignature({ timestamp: "1", folder: "offers" }, "s")` === sha1(`folder=offers&timestamp=1s`)
- [ ] Run → FAIL; реалізація; Run → PASS
- [ ] Маршрут оферів переводиться на хелпер (відповідь `{ logoUrl }`, тексти помилок ті самі); новий маршрут розсилок
- [ ] `npx tsc --noEmit` (окрім очікуваних з Task 1), commit `feat: shared Cloudinary upload with broadcasts endpoint`

### Task 3: Схема, виконавець, UI

**Files:** Modify `prisma/schema.prisma`, `lib/broadcast-runner.ts`, `components/AdminBroadcasts/{types.ts,page.tsx,BroadcastForm.tsx,style.css}`, `components/AdminUsers/SendBroadcast.tsx`

- [ ] `photoUrl String?` у `BroadcastSchedule` і `BroadcastRun`; `npx prisma generate`; `npx prisma db push` (тестова база, лише додає колонки)
- [ ] Виконавець: знімок `photoUrl` при створенні запуску; `runContent` повертає `photoUrl`
- [ ] UI: поле фото (input file → `/api/admin/broadcasts/upload`, прев'ю `next/image`, «Прибрати фото»), лічильник 4096/1024, позначка «📷 з фото» в картці; те саме поле в `SendBroadcast` (тіло запиту з `photoUrl`, клієнтська перевірка: текст або фото)
- [ ] `npm test && npx tsc --noEmit && npm run lint` → чисто
- [ ] Браузер (localhost:3000): завантажити фото, створити вимкнену розсилку з фото, відредагувати й прибрати фото → `photoUrl: null`; реальний запуск з фото в тестову базу через локальний cron-виклик → лог «завершено — успішно 2»; прибрати тестові дані
- [ ] `npm run build`; commit `feat: photo field for scheduled and manual broadcasts`
