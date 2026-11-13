## Авторозсилки та cron-job.org

Щоденні розсилки в Telegram налаштовуються в адмінці на вкладці **«Розсилки»** (`/admin/broadcasts`): назва, час за Києвом, текст, кнопка (Mini app / посилання / без кнопки), увімкнено чи ні. Отримувачі — усі користувачі з таблиці `User`.

Сайт сам не «прокидається» в потрібний час — його щохвилини викликає cron-job.org, а сайт перевіряє, чи настав час якоїсь розсилки, і відправляє її пачками (≈25 повідомлень/с).

### Налаштування (один раз)

1. Додайте змінну `CRON_SECRET` — довгий випадковий рядок — у `.env` і в налаштування хостингу. Згенерувати можна так:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. На [cron-job.org](https://cron-job.org) → **Create cronjob**:
   - **URL:** `https://<ваш-домен>/api/cron/broadcasts`
   - **Execution schedule:** Every minute
   - **Advanced → Headers:** `Authorization` = `Bearer <CRON_SECRET>`
3. (Опційно) увімкніть у cron-job.org сповіщення про невдалі виклики.

Без правильного заголовка ендпоінт відповідає `401` і нічого не відправляє.

### Де дивитися, що відбувається

- **Вкладка «Розсилки» → «Журнал»** — старт і завершення кожної розсилки, кількість успішних/невдалих повідомлень з причинами (наприклад, «bot was blocked by the user ×12»), пропуски та помилки. Записи зберігаються 30 днів.
- **«⚠ Cron не викликав сайт N хв»** над списком — cron-job.org перестав викликати сайт понад 3 хвилини. Перевірте завдання на cron-job.org і `CRON_SECRET`.
- Якщо cron не працював більше 3 годин після часу розсилки, вона пропускається на цей день (щоб не надіслати застаріле повідомлення) — у журналі буде запис «пропущено».

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
