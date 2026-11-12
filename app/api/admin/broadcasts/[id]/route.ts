import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { logBroadcast } from "@/lib/broadcast-log";
import { getLastRun } from "@/lib/broadcast-schedules";
import { parseScheduleInput } from "@/lib/broadcast-validation";
import { computeNextRunAt } from "@/lib/kyiv-time";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const NOT_FOUND = { error: "Розсилку не знайдено" };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.broadcastSchedule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  const parsed = parseScheduleInput(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const input = parsed.value;
  const lastRun = input.isActive ? await getLastRun(id) : null;
  const schedule = await prisma.broadcastSchedule.update({
    where: { id },
    data: {
      ...input,
      nextRunAt: input.isActive
        ? computeNextRunAt(input.sendTime, new Date(), lastRun?.scheduledFor)
        : null,
    },
  });

  const action =
    existing.isActive === schedule.isActive
      ? "змінено"
      : schedule.isActive
        ? "увімкнено"
        : "вимкнено";
  await logBroadcast("info", `«${schedule.title}»: ${action}`, { scheduleId: id });

  return NextResponse.json({ schedule });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.broadcastSchedule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  await prisma.broadcastSchedule.delete({ where: { id } });
  await logBroadcast("info", `«${existing.title}»: видалено`, { scheduleId: id });

  return NextResponse.json({ success: true });
}
