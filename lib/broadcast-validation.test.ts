import { describe, expect, it } from "vitest";
import { parseBroadcastContent, parseScheduleInput } from "./broadcast-validation";

describe("parseBroadcastContent", () => {
  it("rejects empty message", () => {
    expect(parseBroadcastContent({ message: "  ", buttonType: "none" }).ok).toBe(false);
  });

  it("rejects message over 4096 chars", () => {
    const result = parseBroadcastContent({ message: "a".repeat(4097), buttonType: "none" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("4096");
  });

  it("accepts 4096 chars", () => {
    expect(parseBroadcastContent({ message: "a".repeat(4096), buttonType: "none" }).ok).toBe(true);
  });

  it("requires button text when button is present", () => {
    expect(
      parseBroadcastContent({
        message: "hi",
        buttonType: "link",
        buttonText: " ",
        buttonUrl: "https://x.com",
      }).ok,
    ).toBe(false);
  });

  it("rejects non-http link", () => {
    expect(
      parseBroadcastContent({
        message: "hi",
        buttonType: "link",
        buttonText: "Go",
        buttonUrl: "javascript:alert(1)",
      }).ok,
    ).toBe(false);
  });

  it("normalizes miniapp", () => {
    const result = parseBroadcastContent({
      message: " hi ",
      buttonType: "miniapp",
      buttonText: "Відкрити",
      buttonUrl: "https://ignored",
    });
    expect(result).toEqual({
      ok: true,
      value: { message: "hi", buttonType: "miniapp", buttonText: "Відкрити", buttonUrl: null },
    });
  });

  it("normalizes none to null button fields", () => {
    expect(
      parseBroadcastContent({ message: "hi", buttonType: "none", buttonText: "x", buttonUrl: "https://x.com" }),
    ).toEqual({
      ok: true,
      value: { message: "hi", buttonType: "none", buttonText: null, buttonUrl: null },
    });
  });

  it("unknown buttonType falls back to miniapp", () => {
    const result = parseBroadcastContent({ message: "hi", buttonType: "weird", buttonText: "Go" });
    expect(result.ok && result.value.buttonType).toBe("miniapp");
  });
});

describe("parseScheduleInput", () => {
  const base = { title: "Ранкова", sendTime: "10:00", message: "hi", buttonType: "none" };

  it("accepts a valid schedule and defaults isActive to true", () => {
    const result = parseScheduleInput(base);
    expect(result.ok && result.value).toMatchObject({ title: "Ранкова", sendTime: "10:00", isActive: true });
  });

  it("rejects bad sendTime", () => {
    expect(parseScheduleInput({ ...base, sendTime: "25:00" }).ok).toBe(false);
  });

  it("requires title", () => {
    expect(parseScheduleInput({ ...base, title: "  " }).ok).toBe(false);
  });

  it("rejects title over 100 chars", () => {
    expect(parseScheduleInput({ ...base, title: "a".repeat(101) }).ok).toBe(false);
  });

  it("respects isActive false", () => {
    const result = parseScheduleInput({ ...base, isActive: false });
    expect(result.ok && result.value.isActive).toBe(false);
  });
});
