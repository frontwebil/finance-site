# Щоденні авторозсилки — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вкладка «Розсилки» в адмінці зі щоденними Telegram-розсилками за розкладом (Київ), які відправляє ендпоінт `/api/cron/broadcasts`, що його щохвилини викликає cron-job.org, з журналом подій.

**Architecture:** Розклад, запуски та логи зберігаються в PostgreSQL (Prisma). Cron-ендпоінт перевіряє `CRON_SECRET`, одразу відповідає й у `after()` створює належні запуски та відправляє пачками до ~45 с з орендою (`lockedUntil`) і курсором по `User.id`. Чиста логіка (час за Києвом, валідація, класифікація помилок Telegram, рішення про зупинку) винесена в `lib/` і покрита unit-тестами.

**Tech Stack:** Next.js 16.4 (App Router, `cacheComponents`), React 19, Prisma 7 + PostgreSQL (`@prisma/adapter-pg`), Vitest (новий dev-залежність), Telegram Bot API.

**Spec:** `docs/superpowers/specs/2026-11-12-auto-broadcasts-design.md`

## Global Constraints

- Перед кодом Next.js читати відповідний гайд у `node_modules/next/dist/docs/` (`AGENTS.md`). `maxDuration` і `after` — з `next/server` / route segment config.
- Часовий пояс розкладу — `Europe/Kyiv`; `sendTime` — рядок `"HH:MM"` (00:00–23:59).
- Темп відправки ≤ 25 повідомлень/с; бюджет одного cron-виклику ~45 с; `export const maxDuration = 60`; оренда запуску `lockedUntil = now + 70 с`.
- Пропуск, якщо `now - nextRunAt > 3 год` → запуск `skipped` + лог `warn`.
- Аварійна зупинка через битий контент: `run.sent === 0` і ≥ 25 помилок типу `content` → `failed` + лог `error`.
- Прогрес (`cursor`, `sent`, `failed`, `errorSummary`) записується кожні 25 повідомлень.
- Логи старші 30 днів видаляються в кожному cron-виклику. Cron «активний», якщо `lastCalledAt` < 3 хв тому.
- `message` ≤ 4096 символів (ліміт Telegram); текст кнопки обов'язковий, коли `buttonType !== "none"`; посилання — тільки `http:`/`https:`.
- Весь текст інтерфейсу й логів — українською.
- Нових runtime-залежностей не додавати (дату за Києвом рахувати через `Intl`). Єдина нова dev-залежність — `vitest`.
- **Не надсилати жодного реального повідомлення користувачам і не змінювати БД з `.env` без явного «так» від користувача в чаті.** `.env` може вказувати на бойову базу з реальними підписниками.
- Робота в гілці `feature/auto-broadcasts` (зараз `master`).

## Review Focus

- **Перехід на літній/зимовий час.** Розсилка о `03:30` у ніч переходу має спрацювати рівно один раз за цю дату, а наступного дня — у правильний момент. Тести в Task 1.
- **Зміна часу після сьогоднішнього запуску.** Розсилка пройшла о 10:00, о 11:00 адмін змінює час на 12:00 → сьогодні повторно не йде, наступна — завтра о 12:00. Тест у Task 1, використання в Task 5.
- **Задовгий текст / битий HTML.** `message` > 4096 символів відхиляє форма (Task 2). Битий HTML, на якому Telegram відповідає `400 can't parse entities` усім підряд, зупиняє запуск після 25 спроб, а не пробігає всю базу (Task 2/4).
- **Чужий виклик cron-ендпоінту.** Без заголовка, з неправильним секретом або коли `CRON_SECRET` не задано — нічого не запускається. Тести в Task 4.
- **Два cron-виклики одночасно** (cron-job.org повторив запит). Оренда `lockedUntil` не дає двом процесам відправляти той самий запуск; `@@unique([scheduleId, scheduledFor])` не дає створити запуск двічі. Ручна перевірка в Task 4 (два паралельні `curl`).

---

### Task 1: Vitest і розрахунок часу за Києвом

**Files:**
- Modify: `package.json` (devDependency `vitest`, скрипт `"test": "vitest run"`)
- Create: `vitest.config.ts` (alias `@` → корінь репо, `environment: "node"`)
- Create: `lib/kyiv-time.ts`
- Test: `lib/kyiv-time.test.ts`

**Interfaces:**
- Produces:
  - `isValidSendTime(value: unknown): value is string` — `/^([01]\d|2[0-3]):[0-5]\d$/`
  - `kyivDateKey(instant: Date): string` — `"YYYY-MM-DD"` за Києвом
  - `computeNextRunAt(sendTime: string, now: Date, lastRunFor?: Date | null): Date` — найраніший момент `sendTime` за Києвом, що `> now` і чия київська дата `> kyivDateKey(lastRunFor)` (якщо передано)
  - `formatKyivTime(instant: Date): string` — `"дд.мм HH:MM"` для UI/логів

- [ ] **Step 1: Створити гілку й закомітити spec**

```bash
git checkout -b feature/auto-broadcasts
git add docs/superpowers/specs/2026-11-12-auto-broadcasts-design.md docs/superpowers/plans/2026-11-12-auto-broadcasts.md
git commit -m "docs: auto-broadcasts design and plan"
```

- [ ] **Step 2: Встановити vitest, додати конфіг і скрипт**

Run: `npm install -D vitest`

- [ ] **Step 3: Написати падаючі тести `lib/kyiv-time.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { computeNextRunAt, isValidSendTime, kyivDateKey } from "./kyiv-time";

describe("computeNextRunAt", () => {
  it("returns today when the time is still ahead (winter, UTC+2)", () => {
    expect(computeNextRunAt("10:00", new Date("2026-11-12T07:00:00Z")).toISOString())
      .toBe("2026-11-12T08:00:00.000Z");
  });
  it("is strictly after now", () => {
    expect(computeNextRunAt("10:00", new Date("2026-11-12T08:00:00Z")).toISOString())
      .toBe("2026-11-13T08:00:00.000Z");
  });
  it("uses summer offset (UTC+3)", () => {
    expect(computeNextRunAt("10:00", new Date("2026-07-01T05:00:00Z")).toISOString())
      .toBe("2026-07-01T07:00:00.000Z");
  });
  it("skips a Kyiv date that already had a run", () => {
    expect(
      computeNextRunAt("12:00", new Date("2026-11-12T09:00:00Z"), new Date("2026-11-12T08:00:00Z")).toISOString(),
    ).toBe("2026-11-13T10:00:00.000Z");
  });
  it("handles the spring-forward gap (03:30 does not exist on 2027-03-28)", () => {
    expect(computeNextRunAt("03:30", new Date("2027-03-27T12:00:00Z")).toISOString())
      .toBe("2027-03-28T01:30:00.000Z");
  });
  it("fires once on the fall-back date and correctly the next day", () => {
    const first = computeNextRunAt("03:30", new Date("2026-10-24T12:00:00Z"));
    expect(["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"]).toContain(first.toISOString());
    expect(computeNextRunAt("03:30", first, first).toISOString()).toBe("2026-10-26T01:30:00.000Z");
  });
});

describe("helpers", () => {
  it("validates HH:MM", () => {
    expect(isValidSendTime("09:05")).toBe(true);
    expect(isValidSendTime("24:00")).toBe(false);
    expect(isValidSendTime("9:05")).toBe(false);
  });
  it("gives the Kyiv date, not the UTC date", () => {
    expect(kyivDateKey(new Date("2026-11-12T23:30:00Z"))).toBe("2026-11-13");
  });
});
```

- [ ] **Step 4: Переконатися, що тести падають**

Run: `npm test -- lib/kyiv-time.test.ts`
Expected: FAIL — `Failed to resolve import "./kyiv-time"`

- [ ] **Step 5: Реалізувати `lib/kyiv-time.ts`**

Зміщення пояса брати з `Intl.DateTimeFormat("en-US", { timeZone: "Europe/Kyiv", hourCycle: "h23", year/month/day/hour/minute/second: "numeric" }).formatToParts(instant)`: `offset = Date.UTC(parts…) - instant`. Перетворення київського `(дата, HH:MM)` в UTC: `guess = Date.UTC(local) - offset(Date.UTC(local))`, потім `guess = Date.UTC(local) - offset(guess)` — це дає `01:30Z` для неіснуючого 03:30 (тест вище). `computeNextRunAt` перебирає київські дати, починаючи з `kyivDateKey(now)`, максимум 3 дні вперед, і повертає перший кандидат, що задовольняє обидві умови.

- [ ] **Step 6: Переконатися, що тести проходять**

Run: `npm test -- lib/kyiv-time.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/kyiv-time.ts lib/kyiv-time.test.ts
git commit -m "feat: Kyiv schedule time helpers with vitest"
```

---

### Task 2: Валідація контенту та клієнт Telegram (і перехід ручної розсилки на них)

**Files:**
- Create: `lib/broadcast-validation.ts`, `lib/telegram.ts`
- Test: `lib/broadcast-validation.test.ts`, `lib/telegram.test.ts`
- Modify: `app/api/admin/send-broadcast/route.ts` (використати нові функції; поведінка й відповіді ендпоінту не змінюються)

**Interfaces:**
- Consumes: `isValidSendTime` (Task 1)
- Produces:
  - `type ButtonType = "miniapp" | "link" | "none"`
  - `type BroadcastContent = { message: string; buttonType: ButtonType; buttonText: string | null; buttonUrl: string | null }` (для `miniapp` `buttonUrl = null`, URL береться з `WEB_APP_URL`; для `none` обидва `null`)
  - `type ScheduleInput = BroadcastContent & { title: string; sendTime: string; isActive: boolean }`
  - `type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }`
  - `parseBroadcastContent(input: unknown): Parsed<BroadcastContent>`
  - `parseScheduleInput(input: unknown): Parsed<ScheduleInput>` (+ `title` 1–100 символів, `sendTime` валідний, `isActive` boolean, за замовчуванням `true`)
  - `type TelegramErrorKind = "rate_limited" | "user" | "content" | "fatal" | "network"`
  - `type TelegramSendResult = { ok: true } | { ok: false; kind: TelegramErrorKind; status: number; description: string; retryAfter?: number }`
  - `classifyTelegramError(status: number, description: string): TelegramErrorKind`
  - `buildReplyMarkup(content: BroadcastContent): object | undefined`
  - `sendTelegramMessage(token: string, chatId: string, content: BroadcastContent): Promise<TelegramSendResult>` (виняток `fetch` → `kind: "network"`, `status: 0`)

- [ ] **Step 1: Написати падаючі тести**

`lib/broadcast-validation.test.ts`:
- `rejects empty message` → `parseBroadcastContent({ message: "  ", buttonType: "none" }).ok === false`
- `rejects message over 4096 chars` → `message: "a".repeat(4097)` → `ok: false`, `error` містить `4096`
- `accepts 4096 chars` → `ok: true`
- `requires button text when button is present` → `{ message: "hi", buttonType: "link", buttonText: " ", buttonUrl: "https://x.com" }` → `ok: false`
- `rejects non-http link` → `buttonUrl: "javascript:alert(1)"` → `ok: false`
- `normalizes miniapp` → `{ message: " hi ", buttonType: "miniapp", buttonText: "Відкрити", buttonUrl: "https://ignored" }` → `value` дорівнює `{ message: "hi", buttonType: "miniapp", buttonText: "Відкрити", buttonUrl: null }`
- `unknown buttonType falls back to miniapp` (поведінка нинішньої ручної розсилки)
- `parseScheduleInput rejects bad sendTime` → `sendTime: "25:00"` → `ok: false`
- `parseScheduleInput requires title`

`lib/telegram.test.ts`:
- `classifyTelegramError(429, "Too Many Requests: retry after 5") === "rate_limited"`
- `classifyTelegramError(403, "Forbidden: bot was blocked by the user") === "user"`
- `classifyTelegramError(400, "Bad Request: chat not found") === "user"`
- `classifyTelegramError(400, "Bad Request: user is deactivated") === "user"`
- `classifyTelegramError(400, "Bad Request: can't parse entities: ...") === "content"`
- `classifyTelegramError(401, "Unauthorized") === "fatal"`, `classifyTelegramError(404, "Not Found") === "fatal"`
- `buildReplyMarkup` для `miniapp` → `{ inline_keyboard: [[{ text, web_app: { url: WEB_APP_URL } }]] }`; для `link` → `[[{ text, url }]]`; для `none` → `undefined`
- `sendTelegramMessage` з `vi.stubGlobal("fetch", …)`: відповідь `{ ok: false, error_code: 429, description: "...", parameters: { retry_after: 7 } }` зі статусом 429 → `{ ok: false, kind: "rate_limited", retryAfter: 7 }`; `fetch` кидає → `kind: "network"`; тіло запиту містить `parse_mode: "HTML"` і `chat_id`.

- [ ] **Step 2: Переконатися, що тести падають**

Run: `npm test -- lib/broadcast-validation.test.ts lib/telegram.test.ts`
Expected: FAIL — модулі не знайдено

- [ ] **Step 3: Реалізувати `lib/broadcast-validation.ts` і `lib/telegram.ts`**

`user` для 400 — за підрядками без урахування регістру: `chat not found`, `user is deactivated`, `peer_id_invalid`, `bot was kicked`, `not enough rights`; 403 — завжди `user`; 401/404 — `fatal`; 429 — `rate_limited`; інший 400 — `content`; решта статусів (5xx) — `network` (тимчасова). Тексти помилок валідації — ті самі, що зараз у `send-broadcast/route.ts` і `SendBroadcast.tsx`.

- [ ] **Step 4: Переконатися, що тести проходять**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Перевести `app/api/admin/send-broadcast/route.ts` на `parseBroadcastContent` + `sendTelegramMessage`**

Формат запиту/відповіді (`attempted`, `failed`, `nextCursor`, `maxId`, `done`, тексти помилок) не змінюється.

- [ ] **Step 6: Перевірити типи й лінт**

Run: `npx tsc --noEmit && npm run lint`
Expected: без помилок

- [ ] **Step 7: Commit**

```bash
git add lib/broadcast-validation.ts lib/broadcast-validation.test.ts lib/telegram.ts lib/telegram.test.ts app/api/admin/send-broadcast/route.ts
git commit -m "feat: shared broadcast validation and Telegram client"
```

---

### Task 3: Моделі Prisma

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces (Prisma Client): `prisma.broadcastSchedule`, `prisma.broadcastRun`, `prisma.broadcastLog`, `prisma.cronHeartbeat`

- [ ] **Step 1: Додати моделі**

```prisma
model BroadcastSchedule {
  id         String    @id @default(uuid())
  title      String
  message    String
  buttonType String    @default("miniapp")
  buttonText String?
  buttonUrl  String?
  sendTime   String
  isActive   Boolean   @default(true)
  nextRunAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  runs       BroadcastRun[]

  @@index([isActive, nextRunAt])
  @@map("broadcast_schedules")
}

model BroadcastRun {
  id           String            @id @default(uuid())
  scheduleId   String
  schedule     BroadcastSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  scheduledFor DateTime
  message      String
  buttonType   String
  buttonText   String?
  buttonUrl    String?
  status       String            @default("running") // running | done | failed | skipped
  maxUserId    Int               @default(0)
  cursor       Int               @default(0)
  sent         Int               @default(0)
  failed       Int               @default(0)
  errorSummary Json              @default("{}")
  lockedUntil  DateTime?
  startedAt    DateTime          @default(now())
  finishedAt   DateTime?

  @@unique([scheduleId, scheduledFor])
  @@index([status])
  @@map("broadcast_runs")
}

model BroadcastLog {
  id         Int      @id @default(autoincrement())
  createdAt  DateTime @default(now())
  level      String   // info | warn | error
  message    String
  scheduleId String?
  runId      String?
  details    Json?

  @@index([createdAt])
  @@index([scheduleId, createdAt])
  @@map("broadcast_logs")
}

model CronHeartbeat {
  id           Int      @id @default(1)
  lastCalledAt DateTime

  @@map("cron_heartbeat")
}
```

`BroadcastLog.scheduleId/runId` — без relation, щоб логи переживали видалення розсилки.

- [ ] **Step 2: Згенерувати клієнт і перевірити типи**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: без помилок

- [ ] **Step 3: Застосувати схему до БД — тільки після «так» від користувача**

У репо немає `prisma/migrations`, тож база, імовірно, ведеться через `db push`. Запитати користувача, на яку базу вказує `DATABASE_URL` і чи можна виконати (зміни лише додають 4 нові таблиці):

Run: `npx prisma db push`
Expected: `Your database is now in sync with your Prisma schema`, без попереджень про втрату даних (якщо є попередження — зупинитись і запитати).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: broadcast schedule, run, log models"
```

---

### Task 4: Виконавець розсилок і cron-ендпоінт

**Files:**
- Create: `lib/cron-auth.ts`, `lib/broadcast-progress.ts`, `lib/broadcast-log.ts`, `lib/broadcast-runner.ts`
- Create: `app/api/cron/broadcasts/route.ts`
- Test: `lib/cron-auth.test.ts`, `lib/broadcast-progress.test.ts`

**Interfaces:**
- Consumes: `computeNextRunAt`, `formatKyivTime` (Task 1); `BroadcastContent`, `sendTelegramMessage`, `TelegramSendResult` (Task 2); моделі Task 3
- Produces:
  - `isAuthorizedCronRequest(authorization: string | null, secret: string | undefined): boolean`
  - `type TickProgress = { sent: number; failed: number; contentFailures: number; errorSummary: Record<string, number> }`
  - `applySendResult(p: TickProgress, r: TelegramSendResult): TickProgress` (`ok` → `sent+1`; `user`/`content` → `failed+1`, `errorSummary[description]+1`, `content` → ще `contentFailures+1`; `rate_limited`/`network`/`fatal` не змінюють лічильників — їх обробляє виконавець)
  - `shouldAbortForBrokenContent(runSentBefore: number, p: TickProgress): boolean` → `runSentBefore + p.sent === 0 && p.contentFailures >= 25`
  - `topErrors(summary: Record<string, number>, limit = 5): Array<{ description: string; count: number }>` (за спаданням)
  - `logBroadcast(level: "info" | "warn" | "error", message: string, ctx?: { scheduleId?: string; runId?: string; details?: unknown }): Promise<void>` (пише в `BroadcastLog` і дублює в `console`; власні помилки ковтає з `console.error`)
  - `runCronTick(startedAt: Date): Promise<void>` — прибирання логів → планування → відправка до `startedAt + 45 с`

- [ ] **Step 1: Написати падаючі тести**

`lib/cron-auth.test.ts`:
- `isAuthorizedCronRequest("Bearer s3cret", "s3cret") === true`
- `isAuthorizedCronRequest(null, "s3cret") === false`
- `isAuthorizedCronRequest("Bearer wrong", "s3cret") === false`
- `isAuthorizedCronRequest("Bearer s3cret", undefined) === false`, `… ""` → `false`
- `isAuthorizedCronRequest("s3cret", "s3cret") === false` (без префікса `Bearer `)

`lib/broadcast-progress.test.ts`:
- `applySendResult` для `{ ok: true }`, для `kind: "user"` і `kind: "content"` з тим самим `description` двічі → `errorSummary[description] === 2`
- `rate_limited` не змінює прогрес
- `shouldAbortForBrokenContent(0, { …, sent: 0, contentFailures: 25 }) === true`; `(0, contentFailures: 24) === false`; `(1, contentFailures: 30) === false`; `(0, sent: 1, contentFailures: 30) === false`
- `topErrors({ a: 1, b: 5, c: 3 }, 2)` → `[{ description: "b", count: 5 }, { description: "c", count: 3 }]`

- [ ] **Step 2: Переконатися, що тести падають**

Run: `npm test -- lib/cron-auth.test.ts lib/broadcast-progress.test.ts`
Expected: FAIL — модулі не знайдено

- [ ] **Step 3: Реалізувати `lib/cron-auth.ts` (`timingSafeEqual` по SHA-256 обох рядків, щоб уникнути помилки різної довжини) і `lib/broadcast-progress.ts`**

- [ ] **Step 4: Переконатися, що тести проходять**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Реалізувати `lib/broadcast-log.ts` і `lib/broadcast-runner.ts`**

`runCronTick(startedAt)`:
1. `broadcastLog.deleteMany({ createdAt < startedAt - 30 днів })`.
2. **Планування.** Для кожної `broadcastSchedule` з `isActive: true, nextRunAt <= startedAt`:
   - `late = startedAt - nextRunAt > 3 год` → у `$transaction`: `broadcastRun.create({ status: "skipped", finishedAt: now, …знімок })` + `nextRunAt = computeNextRunAt(sendTime, startedAt, nextRunAt)`; лог `warn` `«{title}»: пропущено запуск {formatKyivTime(nextRunAt)} — cron не викликався вчасно`.
   - інакше `maxUserId` = максимальний `User.id`; у `$transaction`: `broadcastRun.create({ status: "running", scheduledFor: nextRunAt, maxUserId, …знімок })` + той самий зсув `nextRunAt`; лог `info` `«{title}»: розсилку розпочато ({count} отримувачів)`.
   - Помилка Prisma `P2002` (дубль) → пропустити тихо.
3. **Відправка.** Якщо `BOT_TELEGRAM_TOKEN` не задано і є `running` запуски — кожен → `failed`, лог `error` `«{title}»: BOT_TELEGRAM_TOKEN не налаштований`. Інакше по черзі для `running` запусків (за `startedAt` asc), поки не вичерпано дедлайн:
   - захопити: `updateMany({ where: { id, status: "running", OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }, data: { lockedUntil: now + 70 с } })`; `count === 0` → наступний запуск.
   - читати користувачів `id > cursor, id <= maxUserId` по 25 (`select: { id, chat_id }`), відправляти послідовно з паузою, щоб між стартами відправок було ≥ 40 мс; після кожного користувача `applySendResult`, `cursor = user.id` (окрім випадків нижче).
   - `rate_limited` → записати прогрес (без цього користувача), зняти оренду, лог `warn` `«{title}»: Telegram обмежив швидкість, продовжимо через {retryAfter} с`, **завершити весь tick**.
   - `network` → записати прогрес (без цього користувача), зняти оренду, лог `warn`, завершити tick.
   - `fatal` → `failed`, `finishedAt`, лог `error` з `description`.
   - `shouldAbortForBrokenContent(run.sent, progress)` → `failed`, лог `error` `«{title}»: зупинено — Telegram відхиляє повідомлення: {description}`.
   - кожні 25 користувачів і перед виходом: `update({ cursor, sent: { increment }, failed: { increment }, errorSummary: злиття })`.
   - користувачі скінчилися → `done`, `finishedAt`, `lockedUntil: null`; лог `info` `«{title}»: завершено — успішно {sent}, помилок {failed}` (рівень `warn`, якщо `failed > 0`) з `details: { topErrors }`.
   - дедлайн → записати прогрес, `lockedUntil: null`.
4. Будь-який неочікуваний виняток — `logBroadcast("error", "Помилка виконання розсилок: …")`.

- [ ] **Step 6: Реалізувати `app/api/cron/broadcasts/route.ts`**

`export const maxDuration = 60`. Обробники `GET` і `POST` спільні: `CRON_SECRET` не задано → `500 { error: "CRON_SECRET не налаштований" }`; `!isAuthorizedCronRequest(req.headers.get("authorization"), secret)` → `console.warn` + `401 { error: "Unauthorized" }`; інакше `cronHeartbeat.upsert({ where: { id: 1 }, … lastCalledAt: now })`, `after(() => runCronTick(now))`, `200 { ok: true }`.

- [ ] **Step 7: Перевірити авторизацію на dev-сервері**

Додати `CRON_SECRET=<випадковий рядок>` у `.env` (не комітиться). Запустити dev через preview `dev`.

Run: `curl -i http://localhost:3000/api/cron/broadcasts` → `401`
Run: `curl -i -H "Authorization: Bearer wrong" http://localhost:3000/api/cron/broadcasts` → `401`
Run: `curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/broadcasts` → `200 {"ok":true}`, у `cron_heartbeat` оновився `lastCalledAt`

(Без розкладів у БД це нічого не відправляє.)

- [ ] **Step 8: Перевірити виконавця без реальних повідомлень — тільки з дозволу користувача**

Запитати користувача, як тестувати безпечно (наприклад, тестова база з 1–2 своїми `chat_id`). Без такої бази — перевірити гілку «нема токена»: перезапустити dev з порожнім `BOT_TELEGRAM_TOKEN`, створити (через Prisma Studio або Task 5 API) активну розсилку з `nextRunAt` = 1 хв тому, викликати ендпоінт двічі паралельно:

Run: `curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/broadcasts & curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/broadcasts; wait`
Expected: рівно один `BroadcastRun` для цього слота зі статусом `failed`; у `broadcast_logs` записи `розсилку розпочато` і `BOT_TELEGRAM_TOKEN не налаштований`; `nextRunAt` зсунуто на завтра.

- [ ] **Step 9: Commit**

```bash
git add lib/cron-auth.ts lib/cron-auth.test.ts lib/broadcast-progress.ts lib/broadcast-progress.test.ts lib/broadcast-log.ts lib/broadcast-runner.ts app/api/cron/broadcasts/route.ts
git commit -m "feat: cron endpoint and scheduled broadcast runner"
```

---

### Task 5: Адмін-API розсилок і логів

**Files:**
- Create: `lib/broadcast-schedules.ts` (запити для API і сторінки)
- Create: `app/api/admin/broadcasts/route.ts`, `app/api/admin/broadcasts/[id]/route.ts`, `app/api/admin/broadcasts/logs/route.ts`

**Interfaces:**
- Consumes: `parseScheduleInput` (Task 2), `computeNextRunAt` (Task 1), моделі Task 3, `logBroadcast` (Task 4)
- Produces:
  - `type ScheduleWithLastRun = BroadcastSchedule & { lastRun: BroadcastRun | null }`
  - `listSchedulesWithLastRun(): Promise<ScheduleWithLastRun[]>` (за `sendTime` asc)
  - `getCronLastCalledAt(): Promise<Date | null>`
  - `listBroadcastLogs(params: { scheduleId?: string; level?: "info" | "warn" | "error"; before?: number }): Promise<{ logs: BroadcastLog[]; nextBefore: number | null }>` (по 50, `id` desc)
  - `GET /api/admin/broadcasts` → `{ schedules: ScheduleWithLastRun[], cronLastCalledAt: string | null }`
  - `POST /api/admin/broadcasts` (тіло — `ScheduleInput`) → `201 { schedule }`; `nextRunAt = isActive ? computeNextRunAt(sendTime, now) : null`
  - `PATCH /api/admin/broadcasts/[id]` (тіло — повний `ScheduleInput`) → `{ schedule }`; `nextRunAt = isActive ? computeNextRunAt(sendTime, now, lastRun?.scheduledFor) : null`
  - `DELETE /api/admin/broadcasts/[id]` → `{ success: true }`
  - `GET /api/admin/broadcasts/logs?scheduleId=&level=&before=` → `{ logs, nextBefore }`
  - Усі — `verifySession()` → інакше `401`; невалідне тіло → `400 { error }` з тексту `parseScheduleInput`; не знайдено → `404 { error: "Розсилку не знайдено" }`. Відповіді серіалізують `Date` в ISO (BigInt тут немає).

- [ ] **Step 1: Реалізувати `lib/broadcast-schedules.ts` і три route-файли**

У `[id]/route.ts` `params` — `Promise<{ id: string }>` (звірити з `app/api/admin/offers/[id]/route.ts` і гайдом route handlers у `node_modules/next/dist/docs/`). Створення/редагування/видалення пишуть лог `info`: `«{title}»: створено (щодня о {sendTime})`, `«{title}»: змінено`, `«{title}»: видалено`, `«{title}»: увімкнено/вимкнено`.

- [ ] **Step 2: Перевірити типи й лінт**

Run: `npx tsc --noEmit && npm run lint`
Expected: без помилок

- [ ] **Step 3: Перевірити API на dev-сервері (неактивна розсилка — нічого не відправить)**

Без cookie: `curl -i http://localhost:3000/api/admin/broadcasts` → `401`. Через залогінену вкладку браузера preview (`javascript_tool` з `fetch`): `POST` з `isActive: false` → `201`; `POST` з `sendTime: "25:00"` → `400`; `PATCH` того ж id з `isActive: true, sendTime: "10:00"` → `nextRunAt` = наступні 10:00 за Києвом; `GET logs` містить «створено» і «змінено»; `DELETE` → `success`, лог «видалено» лишився.

- [ ] **Step 4: Commit**

```bash
git add lib/broadcast-schedules.ts app/api/admin/broadcasts
git commit -m "feat: admin API for scheduled broadcasts and logs"
```

---

### Task 6: Спільний sidebar і сторінка «Розсилки»

**Files:**
- Create: `components/AdminSidebar/AdminSidebar.tsx`
- Modify: `components/AdminDashboard/page.tsx`, `components/AdminUsers/page.tsx`, `components/AdminOffers/page.tsx` (замінити розмітку `<aside className="sidebar">` на `<AdminSidebar active=… />`)
- Create: `app/admin/broadcasts/page.tsx`
- Create: `components/AdminBroadcasts/page.tsx`, `components/AdminBroadcasts/BroadcastForm.tsx`, `components/AdminBroadcasts/BroadcastLogs.tsx`, `components/AdminBroadcasts/style.css`

**Interfaces:**
- Consumes: `listSchedulesWithLastRun`, `getCronLastCalledAt` (Task 5) — на сервері; HTTP API Task 5 — на клієнті; `ScheduleInput`, `ButtonType` (Task 2); `formatKyivTime` (Task 1)
- Produces:
  - `AdminSidebar({ active }: { active: "home" | "users" | "offers" | "broadcasts" })` — пункти «Головна» `/admin`, «Користувачі» `/admin/users`, «Офери» `/admin/offers`, «Розсилки» `/admin/broadcasts`; активний — `className="is-active"` + `aria-current="page"`
  - `AdminBroadcastsPage({ initialSchedules, initialCronLastCalledAt })` (client)
  - `BroadcastForm({ initial?: ScheduleInput; onSubmit(values: ScheduleInput): Promise<void>; onClose(): void })`
  - `BroadcastLogs({ schedules: Array<{ id: string; title: string }> })`

- [ ] **Step 1: Винести `AdminSidebar` і підключити в трьох наявних сторінках**

- [ ] **Step 2: Реалізувати `app/admin/broadcasts/page.tsx`**

Так само, як `app/admin/offers/page.tsx`: `Suspense` + `await connection()` + дані з `lib/broadcast-schedules.ts`, дати передаються як ISO-рядки.

- [ ] **Step 3: Реалізувати компоненти `AdminBroadcasts`**

За ескізом зі spec (розділ «Сторінка `/admin/broadcasts`»):
- Topbar: eyebrow «Керування», h1 «Розсилки», кнопки «+ Нова розсилка» і `LogoutButton`.
- Статус cron: `● Cron активний — останній виклик {N} с/хв тому`, якщо < 3 хв; інакше `⚠ Cron не викликав сайт {N} хв — перевірте cron-job.org`; якщо `null` — `⚠ Cron ще жодного разу не викликав сайт — налаштуйте cron-job.org`.
- Картка розсилки: назва, `{sendTime} щодня`, перемикач увімк/вимк, «Редагувати», «Видалити»; `Наступна: {formatKyivTime(nextRunAt)}` або `Вимкнено`; останній запуск: `✓ {sent} / ✗ {failed}` (`done`), `⏳ відправляється — оброблено {sent+failed}` (`running`), `✗ зупинено` (`failed`), `пропущено` (`skipped`).
- Порожній стан: «Ще немає розсилок. Створіть першу — вона відправлятиметься щодня у вказаний час.»
- Список оновлюється `GET /api/admin/broadcasts` кожні 15 с, поки вкладка відкрита.
- `BroadcastForm` — модалка зі стилями `.modal`, як `SendBroadcast.tsx`: «Назва», «Час (Київ)» (`<input type="time">`), текст (з підказкою «Підтримується HTML-форматування Telegram», лічильник `n / 4096`), тип кнопки, текст кнопки, посилання, «Увімкнено». Помилки API показує під формою.
- Видалення — `window.confirm("Видалити розсилку «{title}»?")`, а якщо `lastRun.status === "running"` — `"…Відправка, що зараз триває, буде зупинена."`.
- `BroadcastLogs` — фільтри «Усі розсилки ▾» і «Усі рівні ▾», рядки `дата · рівень · повідомлення`, під записами з `details.topErrors` — `опис ×N`; кнопка «Показати ще» за `nextBefore`. Перезавантажується при зміні фільтрів і після кожної дії у формі.
- Мобільна ширина: картки й журнал в одну колонку, без горизонтального скролу.

- [ ] **Step 4: Перевірити типи й лінт**

Run: `npx tsc --noEmit && npm run lint`
Expected: без помилок

- [ ] **Step 5: Перевірити в браузері preview**

Залогінитись в адмінку (користувач логіниться сам або дає дозвіл використати `ADMIN_LOGIN`/`ADMIN_PASSWORD` з `.env` на localhost). Перевірити: пункт «Розсилки» є й активний на всіх 4 сторінках; створення **вимкненої** розсилки → картка з'являється, у журналі «створено»; помилка валідації (порожній текст) показується; редагування, перемикач, видалення працюють і логуються; індикатор cron відповідає реальному `lastCalledAt`; `resize_window` mobile — без горизонтального скролу; `read_console_messages` — без помилок. Скриншот сторінки.

- [ ] **Step 6: Commit**

```bash
git add components/AdminSidebar components/AdminDashboard/page.tsx components/AdminUsers/page.tsx components/AdminOffers/page.tsx app/admin/broadcasts components/AdminBroadcasts
git commit -m "feat: admin broadcasts tab with schedule management and logs"
```

---

### Task 7: README з налаштуванням cron-job.org і фінальна перевірка

**Files:**
- Modify: `README.md` (новий розділ «Авторозсилки та cron-job.org» на початку файлу)

- [ ] **Step 1: Написати розділ README**

Зміст — з розділу spec «Налаштування cron-job.org»: змінна `CRON_SECRET` (в `.env` і на хостингу), URL `https://<домен>/api/cron/broadcasts`, розклад «Every minute», заголовок `Authorization: Bearer <CRON_SECRET>` у «Advanced → Headers», опційні сповіщення про збої; де дивитися логи (вкладка «Розсилки» → «Журнал»); що означає «⚠ Cron не викликав сайт».

- [ ] **Step 2: Повна перевірка**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: усе зелене; `build` проходить (`prisma generate && next build`)

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: cron-job.org setup for auto-broadcasts"
```
