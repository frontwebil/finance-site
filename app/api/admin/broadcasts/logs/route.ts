import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { listBroadcastLogs, parseLogLevel } from "@/lib/broadcast-schedules";

export async function GET(request: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const before = Number(searchParams.get("before"));
  const result = await listBroadcastLogs({
    scheduleId: searchParams.get("scheduleId") || undefined,
    level: parseLogLevel(searchParams.get("level")),
    before: Number.isSafeInteger(before) && before > 0 ? before : undefined,
  });

  return NextResponse.json(result);
}
