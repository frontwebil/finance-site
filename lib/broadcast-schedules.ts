import type {
  BroadcastLog,
  BroadcastRun,
  BroadcastSchedule,
} from "@/app/generated/prisma/client";
import type { BroadcastLogLevel } from "./broadcast-log";
import prisma from "./prisma";

export const LOGS_PAGE_SIZE = 50;

export type ScheduleWithLastRun = BroadcastSchedule & { lastRun: BroadcastRun | null };

export async function listSchedulesWithLastRun(): Promise<ScheduleWithLastRun[]> {
  const schedules = await prisma.broadcastSchedule.findMany({
    orderBy: [{ sendTime: "asc" }, { createdAt: "asc" }],
    include: { runs: { orderBy: { startedAt: "desc" }, take: 1 } },
  });
  return schedules.map(({ runs, ...schedule }) => ({ ...schedule, lastRun: runs[0] ?? null }));
}

export async function getLastRun(scheduleId: string): Promise<BroadcastRun | null> {
  return prisma.broadcastRun.findFirst({
    where: { scheduleId },
    orderBy: { scheduledFor: "desc" },
  });
}

export async function getCronLastCalledAt(): Promise<Date | null> {
  const heartbeat = await prisma.cronHeartbeat.findUnique({ where: { id: 1 } });
  return heartbeat?.lastCalledAt ?? null;
}

const LOG_LEVELS: BroadcastLogLevel[] = ["info", "warn", "error"];

export function parseLogLevel(value: string | null): BroadcastLogLevel | undefined {
  return LOG_LEVELS.find((level) => level === value);
}

export async function listBroadcastLogs(params: {
  scheduleId?: string;
  level?: BroadcastLogLevel;
  before?: number;
}): Promise<{ logs: BroadcastLog[]; nextBefore: number | null }> {
  const logs = await prisma.broadcastLog.findMany({
    where: {
      ...(params.scheduleId ? { scheduleId: params.scheduleId } : {}),
      ...(params.level ? { level: params.level } : {}),
      ...(params.before ? { id: { lt: params.before } } : {}),
    },
    orderBy: { id: "desc" },
    take: LOGS_PAGE_SIZE + 1,
  });
  const hasMore = logs.length > LOGS_PAGE_SIZE;
  const page = hasMore ? logs.slice(0, LOGS_PAGE_SIZE) : logs;
  return { logs: page, nextBefore: hasMore ? page[page.length - 1].id : null };
}
