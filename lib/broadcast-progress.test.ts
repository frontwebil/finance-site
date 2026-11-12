import { describe, expect, it } from "vitest";
import {
  applySendResult,
  emptyTickProgress,
  mergeErrorSummaries,
  shouldAbortForBrokenContent,
  topErrors,
  type TickProgress,
} from "./broadcast-progress";

const blocked = {
  ok: false as const,
  kind: "user" as const,
  status: 403,
  description: "Forbidden: bot was blocked by the user",
};
const badHtml = {
  ok: false as const,
  kind: "content" as const,
  status: 400,
  description: "Bad Request: can't parse entities",
};

describe("applySendResult", () => {
  it("counts a success", () => {
    expect(applySendResult(emptyTickProgress(), { ok: true }).sent).toBe(1);
  });

  it("aggregates user and content failures by description", () => {
    let p = emptyTickProgress();
    p = applySendResult(p, blocked);
    p = applySendResult(p, blocked);
    p = applySendResult(p, badHtml);
    expect(p).toEqual({
      sent: 0,
      failed: 3,
      contentFailures: 1,
      errorSummary: { [blocked.description]: 2, [badHtml.description]: 1 },
    });
  });

  it("leaves progress untouched on rate limiting", () => {
    const p = emptyTickProgress();
    const next = applySendResult(p, {
      ok: false,
      kind: "rate_limited",
      status: 429,
      description: "Too Many Requests",
      retryAfter: 3,
    });
    expect(next).toEqual(p);
  });
});

describe("shouldAbortForBrokenContent", () => {
  const progress = (sent: number, contentFailures: number): TickProgress => ({
    sent,
    failed: contentFailures,
    contentFailures,
    errorSummary: {},
  });

  it("aborts after 25 content failures with nothing sent", () => {
    expect(shouldAbortForBrokenContent(0, progress(0, 25))).toBe(true);
  });
  it("keeps going below the threshold", () => {
    expect(shouldAbortForBrokenContent(0, progress(0, 24))).toBe(false);
  });
  it("keeps going when earlier ticks already sent messages", () => {
    expect(shouldAbortForBrokenContent(1, progress(0, 30))).toBe(false);
  });
  it("keeps going when this tick sent something", () => {
    expect(shouldAbortForBrokenContent(0, progress(1, 30))).toBe(false);
  });
});

describe("topErrors", () => {
  it("sorts by count descending and limits", () => {
    expect(topErrors({ a: 1, b: 5, c: 3 }, 2)).toEqual([
      { description: "b", count: 5 },
      { description: "c", count: 3 },
    ]);
  });
});

describe("mergeErrorSummaries", () => {
  it("adds counts for the same description", () => {
    expect(mergeErrorSummaries({ a: 1, b: 2 }, { b: 3, c: 1 })).toEqual({ a: 1, b: 5, c: 1 });
  });
});
