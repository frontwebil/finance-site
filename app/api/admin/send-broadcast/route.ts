import { parseBroadcastContent } from "@/lib/broadcast-validation";
import { verifySession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

const BATCH_SIZE = 25;

export async function POST(req: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { cursor, maxId } = body ?? {};
    const content = parseBroadcastContent(body);

    if (!content.ok) {
      return NextResponse.json({ error: content.error }, { status: 400 });
    }

    const normalizedCursor = Number.isSafeInteger(cursor) && cursor >= 0 ? cursor : 0;
    let broadcastMaxId: number;
    if (maxId === null || maxId === undefined) {
      const lastUser = await prisma.user.findFirst({
        orderBy: { id: "desc" },
        select: { id: true },
      });
      broadcastMaxId = lastUser?.id ?? 0;
    } else if (Number.isSafeInteger(maxId) && maxId >= 0) {
      broadcastMaxId = maxId;
    } else {
      return NextResponse.json({ error: "Некоректний курсор розсилки" }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { gt: normalizedCursor, lte: broadcastMaxId },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      select: { id: true, chat_id: true },
    });

    if (users.length === 0) {
      return NextResponse.json({
        attempted: 0,
        failed: 0,
        nextCursor: normalizedCursor,
        maxId: broadcastMaxId,
        done: true,
      });
    }

    const token = process.env.BOT_TELEGRAM_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "BOT_TELEGRAM_TOKEN не налаштований" },
        { status: 500 },
      );
    }

    let failed = 0;

    for (const user of users) {
      const result = await sendTelegramMessage(token, user.chat_id.toString(), content.value);
      if (!result.ok) {
        if (result.kind === "network") {
          console.error(`Broadcast message failed for user ${user.id}:`, result.description);
        }
        failed += 1;
      }
    }

    const nextCursor = users[users.length - 1].id;
    return NextResponse.json({
      attempted: users.length,
      failed,
      nextCursor,
      maxId: broadcastMaxId,
      done: users.length < BATCH_SIZE || nextCursor >= broadcastMaxId,
    });
  } catch (error) {
    console.error("Telegram broadcast error:", error);
    return NextResponse.json(
      { error: "Помилка розсилки повідомлень" },
      { status: 500 },
    );
  }
}
