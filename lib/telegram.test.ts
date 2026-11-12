import { afterEach, describe, expect, it, vi } from "vitest";
import { WEB_APP_URL } from "@/data/offers";
import { buildReplyMarkup, classifyTelegramError, sendTelegramMessage } from "./telegram";
import type { BroadcastContent } from "./broadcast-validation";

const plain: BroadcastContent = {
  message: "hi",
  buttonType: "none",
  buttonText: null,
  buttonUrl: null,
  photoUrl: null,
};
const PHOTO = "https://res.cloudinary.com/demo/image/upload/broadcasts/a.png";

describe("classifyTelegramError", () => {
  it.each([
    [429, "Too Many Requests: retry after 5", "rate_limited"],
    [403, "Forbidden: bot was blocked by the user", "user"],
    [400, "Bad Request: chat not found", "user"],
    [400, "Bad Request: user is deactivated", "user"],
    [400, "Bad Request: can't parse entities: Unsupported start tag", "content"],
    [400, "Bad Request: wrong file identifier/HTTP URL specified", "content"],
    [401, "Unauthorized", "fatal"],
    [404, "Not Found", "fatal"],
    [502, "Bad Gateway", "network"],
  ] as const)("%i %s → %s", (status, description, kind) => {
    expect(classifyTelegramError(status, description)).toBe(kind);
  });
});

describe("buildReplyMarkup", () => {
  it("builds a mini app button with WEB_APP_URL", () => {
    expect(
      buildReplyMarkup({ ...plain, buttonType: "miniapp", buttonText: "Open" }),
    ).toEqual({ inline_keyboard: [[{ text: "Open", web_app: { url: WEB_APP_URL } }]] });
  });

  it("builds a link button", () => {
    expect(
      buildReplyMarkup({ ...plain, buttonType: "link", buttonText: "Go", buttonUrl: "https://x.com" }),
    ).toEqual({ inline_keyboard: [[{ text: "Go", url: "https://x.com" }]] });
  });

  it("returns undefined without a button", () => {
    expect(buildReplyMarkup(plain)).toBeUndefined();
  });
});

describe("sendTelegramMessage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns ok and sends HTML to the chat", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendTelegramMessage("TOKEN", "123", plain)).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/botTOKEN/sendMessage");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ chat_id: "123", text: "hi", parse_mode: "HTML" });
    expect(body.reply_markup).toBeUndefined();
  });

  it("sends a photo with caption and button via sendPhoto", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage("TOKEN", "123", {
      ...plain,
      buttonType: "link",
      buttonText: "Go",
      buttonUrl: "https://x.com",
      photoUrl: PHOTO,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/botTOKEN/sendPhoto");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      chat_id: "123",
      photo: PHOTO,
      caption: "hi",
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "Go", url: "https://x.com" }]] },
    });
  });

  it("omits caption and keyboard for a bare photo", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage("TOKEN", "123", { ...plain, message: "", photoUrl: PHOTO });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ chat_id: "123", photo: PHOTO });
  });

  it("reports rate limiting with retryAfter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: false,
              error_code: 429,
              description: "Too Many Requests: retry after 7",
              parameters: { retry_after: 7 },
            }),
            { status: 429 },
          ),
      ),
    );

    expect(await sendTelegramMessage("TOKEN", "123", plain)).toMatchObject({
      ok: false,
      kind: "rate_limited",
      status: 429,
      retryAfter: 7,
    });
  });

  it("reports network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      }),
    );

    expect(await sendTelegramMessage("TOKEN", "123", plain)).toMatchObject({
      ok: false,
      kind: "network",
      status: 0,
    });
  });
});
