import { WEB_APP_URL } from "@/data/offers";
import type { BroadcastContent } from "./broadcast-validation";

export type TelegramErrorKind = "rate_limited" | "user" | "content" | "fatal" | "network";

export type TelegramSendResult =
  | { ok: true }
  | {
      ok: false;
      kind: TelegramErrorKind;
      status: number;
      description: string;
      retryAfter?: number;
    };

const USER_LEVEL_400_PATTERNS = [
  "chat not found",
  "user is deactivated",
  "peer_id_invalid",
  "bot was kicked",
  "not enough rights",
];

export function classifyTelegramError(status: number, description: string): TelegramErrorKind {
  if (status === 429) return "rate_limited";
  if (status === 403) return "user";
  if (status === 401 || status === 404) return "fatal";
  if (status === 400) {
    const normalized = description.toLowerCase();
    return USER_LEVEL_400_PATTERNS.some((pattern) => normalized.includes(pattern))
      ? "user"
      : "content";
  }
  return "network";
}

export function buildReplyMarkup(content: BroadcastContent): object | undefined {
  if (content.buttonType === "none" || !content.buttonText) return undefined;
  const button =
    content.buttonType === "link"
      ? { text: content.buttonText, url: content.buttonUrl }
      : { text: content.buttonText, web_app: { url: WEB_APP_URL } };
  return { inline_keyboard: [[button]] };
}

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
  parameters?: { retry_after?: number };
};

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  content: BroadcastContent,
): Promise<TelegramSendResult> {
  const replyMarkup = buildReplyMarkup(content);
  const markup = replyMarkup ? { reply_markup: replyMarkup } : {};
  const [method, payload] = content.photoUrl
    ? [
        "sendPhoto",
        {
          chat_id: chatId,
          photo: content.photoUrl,
          ...(content.message ? { caption: content.message, parse_mode: "HTML" } : {}),
          ...markup,
        },
      ]
    : [
        "sendMessage",
        { chat_id: chatId, text: content.message, parse_mode: "HTML", ...markup },
      ];

  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      ok: false,
      kind: "network",
      status: 0,
      description: error instanceof Error ? error.message : "Network error",
    };
  }

  const data = (await response.json().catch(() => ({}))) as TelegramApiResponse;
  if (response.ok && data.ok) return { ok: true };

  const description = data.description || `HTTP ${response.status}`;
  const retryAfter = data.parameters?.retry_after;
  return {
    ok: false,
    kind: classifyTelegramError(response.status, description),
    status: response.status,
    description,
    ...(typeof retryAfter === "number" ? { retryAfter } : {}),
  };
}
