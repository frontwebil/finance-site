import { Prisma, type BroadcastRun } from "@/app/generated/prisma/client";
import { logBroadcast } from "./broadcast-log";
import {
  applySendResult,
  emptyTickProgress,
  mergeErrorSummaries,
  shouldAbortForBrokenContent,
  topErrors,
} from "./broadcast-progress";
import type { BroadcastContent, ButtonType } from "./broadcast-validation";
import { computeNextRunAt, formatKyivTime } from "./kyiv-time";
import prisma from "./prisma";
import { sendTelegramMessage } from "./telegram";

export const TICK_BUDGET_MS = 45_000;
const LEASE_MS = 70_000;
const LATE_SKIP_MS = 3 * 60 * 60 * 1000;
const LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const USERS_PER_BATCH = 25;
const MIN_SEND_INTERVAL_MS = 40; // ≤ 25 messages per second

type RunWithTitle = BroadcastRun & { schedule: { title: string } };
type RunOutcome = "continue" | "stop-tick";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function runContent(run: BroadcastRun): BroadcastContent {
  return {
    message: run.message,
    buttonType: run.buttonType as ButtonType,
    buttonText: run.buttonText,
    buttonUrl: run.buttonUrl,
  };
}

async function cleanupLogs(now: Date) {
  await prisma.broadcastLog.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - LOG_RETENTION_MS) } },
  });
}

async function planDueRuns(now: Date) {
  const due = await prisma.broadcastSchedule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
  });

  for (const schedule of due) {
    const scheduledFor = schedule.nextRunAt!;
    try {
      const nextRunAt = computeNextRunAt(schedule.sendTime, now, scheduledFor);
      const late = now.getTime() - scheduledFor.getTime() > LATE_SKIP_MS;
      const snapshot = {
        scheduleId: schedule.id,
        scheduledFor,
        message: schedule.message,
        buttonType: schedule.buttonType,
        buttonText: schedule.buttonText,
        buttonUrl: schedule.buttonUrl,
      };

      if (late) {
        const [run] = await prisma.$transaction([
          prisma.broadcastRun.create({
            data: { ...snapshot, status: "skipped", finishedAt: now },
          }),
          prisma.broadcastSchedule.update({
            where: { id: schedule.id },
            data: { nextRunAt },
          }),
        ]);
        await logBroadcast(
          "warn",
          `«${schedule.title}»: пропущено запуск ${formatKyivTime(scheduledFor)} — cron не викликався вчасно`,
          { scheduleId: schedule.id, runId: run.id },
        );
        continue;
      }

      const lastUser = await prisma.user.findFirst({
        orderBy: { id: "desc" },
        select: { id: true },
      });
      const maxUserId = lastUser?.id ?? 0;
      const [run] = await prisma.$transaction([
        prisma.broadcastRun.create({
          data: { ...snapshot, status: "running", maxUserId },
        }),
        prisma.broadcastSchedule.update({
          where: { id: schedule.id },
          data: { nextRunAt },
        }),
      ]);
      const recipients = await prisma.user.count({ where: { id: { lte: maxUserId } } });
      await logBroadcast(
        "info",
        `«${schedule.title}»: розсилку розпочато (${recipients} отримувачів)`,
        { scheduleId: schedule.id, runId: run.id },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue; // another cron call already created this run
      }
      await logBroadcast(
        "error",
        `«${schedule.title}»: не вдалося запланувати запуск — ${errorMessage(error)}`,
        { scheduleId: schedule.id },
      );
    }
  }
}

async function claimRun(runId: string): Promise<boolean> {
  const now = new Date();
  const { count } = await prisma.broadcastRun.updateMany({
    where: {
      id: runId,
      status: "running",
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: { lockedUntil: new Date(now.getTime() + LEASE_MS) },
  });
  return count === 1;
}

async function processRun(run: RunWithTitle, token: string, deadline: number): Promise<RunOutcome> {
  const title = run.schedule.title;
  const ctx = { scheduleId: run.scheduleId, runId: run.id };
  const content = runContent(run);
  const baseSummary = (run.errorSummary ?? {}) as Record<string, number>;
  let tick = emptyTickProgress();
  let cursor = run.cursor;
  let lastSendAt = 0;

  const totals = () => ({
    cursor,
    sent: run.sent + tick.sent,
    failed: run.failed + tick.failed,
    errorSummary: mergeErrorSummaries(baseSummary, tick.errorSummary),
  });

  const save = (data: Prisma.BroadcastRunUpdateInput = {}) =>
    prisma.broadcastRun.update({ where: { id: run.id }, data: { ...totals(), ...data } });

  const finishFailed = async (reason: string) => {
    await save({ status: "failed", finishedAt: new Date(), lockedUntil: null });
    await logBroadcast("error", `«${title}»: ${reason}`, {
      ...ctx,
      details: { topErrors: topErrors(totals().errorSummary) },
    });
  };

  while (true) {
    const users = await prisma.user.findMany({
      where: { id: { gt: cursor, lte: run.maxUserId } },
      orderBy: { id: "asc" },
      take: USERS_PER_BATCH,
      select: { id: true, chat_id: true },
    });

    if (users.length === 0) {
      const final = totals();
      await save({ status: "done", finishedAt: new Date(), lockedUntil: null });
      await logBroadcast(
        final.failed > 0 ? "warn" : "info",
        `«${title}»: завершено — успішно ${final.sent}, помилок ${final.failed}`,
        { ...ctx, details: { topErrors: topErrors(final.errorSummary) } },
      );
      return "continue";
    }

    for (const user of users) {
      if (Date.now() >= deadline) {
        await save({ lockedUntil: null });
        return "stop-tick";
      }

      const wait = lastSendAt + MIN_SEND_INTERVAL_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastSendAt = Date.now();

      const result = await sendTelegramMessage(token, user.chat_id.toString(), content);

      if (!result.ok && result.kind === "rate_limited") {
        await save({ lockedUntil: null });
        await logBroadcast(
          "warn",
          `«${title}»: Telegram обмежив швидкість, продовжимо через ${result.retryAfter ?? 60} с`,
          ctx,
        );
        return "stop-tick";
      }
      if (!result.ok && result.kind === "network") {
        await save({ lockedUntil: null });
        await logBroadcast(
          "warn",
          `«${title}»: тимчасова помилка зв'язку з Telegram (${result.description}), продовжимо наступного разу`,
          ctx,
        );
        return "stop-tick";
      }
      if (!result.ok && result.kind === "fatal") {
        await finishFailed(`зупинено — Telegram відхилив токен бота: ${result.description}`);
        return "continue";
      }

      tick = applySendResult(tick, result);
      cursor = user.id;

      if (shouldAbortForBrokenContent(run.sent, tick)) {
        const [top] = topErrors(tick.errorSummary, 1);
        await finishFailed(
          `зупинено — Telegram відхиляє повідомлення: ${top?.description ?? "невідома помилка"}`,
        );
        return "continue";
      }
    }

    await save();
  }
}

async function processRunningRuns(deadline: number) {
  const runs = await prisma.broadcastRun.findMany({
    where: { status: "running" },
    orderBy: { startedAt: "asc" },
    include: { schedule: { select: { title: true } } },
  });
  if (runs.length === 0) return;

  const token = process.env.BOT_TELEGRAM_TOKEN;
  if (!token) {
    for (const run of runs) {
      if (!(await claimRun(run.id))) continue;
      await prisma.broadcastRun.update({
        where: { id: run.id },
        data: { status: "failed", finishedAt: new Date(), lockedUntil: null },
      });
      await logBroadcast("error", `«${run.schedule.title}»: BOT_TELEGRAM_TOKEN не налаштований`, {
        scheduleId: run.scheduleId,
        runId: run.id,
      });
    }
    return;
  }

  for (const run of runs) {
    if (Date.now() >= deadline) return;
    if (!(await claimRun(run.id))) continue;
    try {
      if ((await processRun(run, token, deadline)) === "stop-tick") return;
    } catch (error) {
      // The lease expires on its own, so the next call resumes from the last saved cursor.
      await logBroadcast(
        "error",
        `«${run.schedule.title}»: помилка під час відправки — ${errorMessage(error)}`,
        { scheduleId: run.scheduleId, runId: run.id },
      );
    }
  }
}

export async function runCronTick(startedAt: Date): Promise<void> {
  const deadline = startedAt.getTime() + TICK_BUDGET_MS;
  try {
    await cleanupLogs(startedAt);
    await planDueRuns(startedAt);
    await processRunningRuns(deadline);
  } catch (error) {
    await logBroadcast("error", `Помилка виконання розсилок: ${errorMessage(error)}`);
  }
}
