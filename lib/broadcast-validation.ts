import { isValidSendTime } from "./kyiv-time";

export const MAX_MESSAGE_LENGTH = 4096;
export const MAX_TITLE_LENGTH = 100;

export type ButtonType = "miniapp" | "link" | "none";

export type BroadcastContent = {
  message: string;
  buttonType: ButtonType;
  buttonText: string | null;
  buttonUrl: string | null;
};

export type ScheduleInput = BroadcastContent & {
  title: string;
  sendTime: string;
  isActive: boolean;
};

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function parseBroadcastContent(input: unknown): Parsed<BroadcastContent> {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const message = asTrimmedString(data.message);
  const buttonType: ButtonType =
    data.buttonType === "link" || data.buttonType === "none" ? data.buttonType : "miniapp";
  const buttonText = asTrimmedString(data.buttonText);
  const buttonUrl = asTrimmedString(data.buttonUrl);

  if (!message || (buttonType !== "none" && !buttonText)) {
    return { ok: false, error: "Повідомлення та текст кнопки обов'язкові" };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Повідомлення задовге: максимум ${MAX_MESSAGE_LENGTH} символів`,
    };
  }

  if (buttonType === "link" && !isHttpUrl(buttonUrl)) {
    return { ok: false, error: "Некоректне посилання для кнопки" };
  }

  return {
    ok: true,
    value: {
      message,
      buttonType,
      buttonText: buttonType === "none" ? null : buttonText,
      buttonUrl: buttonType === "link" ? buttonUrl : null,
    },
  };
}

export function parseScheduleInput(input: unknown): Parsed<ScheduleInput> {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const title = asTrimmedString(data.title);

  if (!title) {
    return { ok: false, error: "Назва розсилки обов'язкова" };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Назва задовга: максимум ${MAX_TITLE_LENGTH} символів` };
  }
  if (!isValidSendTime(data.sendTime)) {
    return { ok: false, error: "Некоректний час розсилки (формат ГГ:ХХ)" };
  }
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    return { ok: false, error: "Некоректне значення «Увімкнено»" };
  }

  const content = parseBroadcastContent(data);
  if (!content.ok) return content;

  return {
    ok: true,
    value: {
      ...content.value,
      title,
      sendTime: data.sendTime,
      isActive: data.isActive ?? true,
    },
  };
}
