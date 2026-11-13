import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "./prisma";

export type BroadcastLogLevel = "info" | "warn" | "error";

export async function logBroadcast(
  level: BroadcastLogLevel,
  message: string,
  ctx: { scheduleId?: string; runId?: string; details?: unknown } = {},
): Promise<void> {
  const consoleMethod =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  consoleMethod(`[broadcast] ${message}`, ctx.details ?? "");

  try {
    await prisma.broadcastLog.create({
      data: {
        level,
        message,
        scheduleId: ctx.scheduleId ?? null,
        runId: ctx.runId ?? null,
        ...(ctx.details === undefined
          ? {}
          : { details: ctx.details as Prisma.InputJsonValue }),
      },
    });
  } catch (error) {
    console.error("[broadcast] Failed to write broadcast log:", error);
  }
}
