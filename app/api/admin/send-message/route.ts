import { verifySession } from "@/lib/auth";
import { parseBroadcastContent } from "@/lib/broadcast-validation";
import { sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const chatId = typeof body?.chat_id === "string" || typeof body?.chat_id === "number"
      ? String(body.chat_id).trim()
      : "";
    if (!chatId) {
      return NextResponse.json({ error: "Chat ID обов'язковий" }, { status: 400 });
    }

    // Personal messages always carry a button; "Перейти" is the historical default text.
    const content = parseBroadcastContent({
      ...body,
      buttonType: body.buttonType === "link" ? "link" : "miniapp",
      buttonText: body.buttonText || "Перейти",
    });
    if (!content.ok) {
      return NextResponse.json({ error: content.error }, { status: 400 });
    }

    const token = process.env.BOT_TELEGRAM_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "BOT_TELEGRAM_TOKEN не налаштований" },
        { status: 500 },
      );
    }

    const result = await sendTelegramMessage(token, chatId, content.value);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.description || "Помилка Telegram API" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send Telegram message error:", error);

    return NextResponse.json(
      { error: "Помилка відправки повідомлення" },
      { status: 500 },
    );
  }
}
