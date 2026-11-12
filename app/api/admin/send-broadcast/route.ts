import { WEB_APP_URL } from "@/data/offers";
import { verifySession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const BATCH_SIZE = 25;

export async function POST(req: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, buttonText, buttonType, buttonUrl, cursor, maxId } =
      await req.json();
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    const normalizedType =
      buttonType === "link" || buttonType === "none" ? buttonType : "miniapp";
    const normalizedText =
      typeof buttonText === "string" ? buttonText.trim() : "";
    const normalizedUrl =
      normalizedType === "miniapp"
        ? WEB_APP_URL
        : typeof buttonUrl === "string"
          ? buttonUrl.trim()
          : "";

    if (!normalizedMessage || (normalizedType !== "none" && !normalizedText)) {
      return NextResponse.json(
        { error: "Повідомлення та текст кнопки обов'язкові" },
        { status: 400 },
      );
    }

    if (normalizedType === "link") {
      try {
        const url = new URL(normalizedUrl);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new Error("Unsupported URL protocol");
        }
      } catch {
        return NextResponse.json(
          { error: "Некоректне посилання для кнопки" },
          { status: 400 },
        );
      }
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

    const button =
      normalizedType === "link"
        ? { text: normalizedText, url: normalizedUrl }
        : normalizedType === "miniapp"
          ? { text: normalizedText, web_app: { url: WEB_APP_URL } }
          : null;
    let failed = 0;

    for (const user of users) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: user.chat_id.toString(),
              text: normalizedMessage,
              parse_mode: "HTML",
              ...(button
                ? { reply_markup: { inline_keyboard: [[button]] } }
                : {}),
            }),
          },
        );
        const data = await response.json();
        if (!response.ok || !data.ok) failed += 1;
      } catch (error) {
        console.error(`Broadcast message failed for user ${user.id}:`, error);
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
