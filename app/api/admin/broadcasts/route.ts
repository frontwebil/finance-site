import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { logBroadcast } from "@/lib/broadcast-log";
import { getCronLastCalledAt, listSchedulesWithLastRun } from "@/lib/broadcast-schedules";
import { parseScheduleInput } from "@/lib/broadcast-validation";
import { computeNextRunAt } from "@/lib/kyiv-time";
import prisma from "@/lib/prisma";

export async function GET() {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [schedules, cronLastCalledAt] = await Promise.all([
    listSchedulesWithLastRun(),
    getCronLastCalledAt(),
  ]);
  return NextResponse.json({ schedules, cronLastCalledAt });
}

export async function POST(request: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseScheduleInput(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const input = parsed.value;
  const schedule = await prisma.broadcastSchedule.create({
    data: {
      ...input,
      nextRunAt: input.isActive ? computeNextRunAt(input.sendTime, new Date()) : null,
    },
  });

  await logBroadcast(
    "info",
    `«${schedule.title}»: створено (щодня о ${schedule.sendTime}${schedule.isActive ? "" : ", вимкнено"})`,
    { scheduleId: schedule.id },
  );

  return NextResponse.json({ schedule }, { status: 201 });
}
