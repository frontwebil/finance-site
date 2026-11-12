import { verifySession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { chat_id, message } = await req.json();
    if (!chat_id || !message?.trim()) {
      return NextResponse.json(
        { error: "Chat ID та повідомлення обов'язкові" },
        { status: 400 },
      );
    }

    const token = process.env.BOT_TELEGRAM_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "BOT_TELEGRAM_TOKEN не налаштований" },
        { status: 500 },
      );
    }

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );

    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: data.description || "Помилка Telegram API" },
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
