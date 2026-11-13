import { after, NextResponse } from "next/server";
import { runCronTick } from "@/lib/broadcast-runner";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import prisma from "@/lib/prisma";

export const maxDuration = 60;

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET не налаштований" }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    console.warn("[broadcast] Unauthorized cron call");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  await prisma.cronHeartbeat.upsert({
    where: { id: 1 },
    create: { id: 1, lastCalledAt: now },
    update: { lastCalledAt: now },
  });

  after(() => runCronTick(now));

  return NextResponse.json({ ok: true });
}

export const GET = handle;
export const POST = handle;
