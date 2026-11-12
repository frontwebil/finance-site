import type { TelegramSendResult } from "./telegram";

export const BROKEN_CONTENT_THRESHOLD = 25;

export type TickProgress = {
  sent: number;
  failed: number;
  contentFailures: number;
  errorSummary: Record<string, number>;
};

export function emptyTickProgress(): TickProgress {
  return { sent: 0, failed: 0, contentFailures: 0, errorSummary: {} };
}

/** Counts a send outcome. Rate limits, network and fatal errors are handled by the runner. */
export function applySendResult(p: TickProgress, r: TelegramSendResult): TickProgress {
  if (r.ok) return { ...p, sent: p.sent + 1 };
  if (r.kind !== "user" && r.kind !== "content") return p;
  return {
    sent: p.sent,
    failed: p.failed + 1,
    contentFailures: p.contentFailures + (r.kind === "content" ? 1 : 0),
    errorSummary: {
      ...p.errorSummary,
      [r.description]: (p.errorSummary[r.description] ?? 0) + 1,
    },
  };
}

export function shouldAbortForBrokenContent(runSentBefore: number, p: TickProgress): boolean {
  return runSentBefore + p.sent === 0 && p.contentFailures >= BROKEN_CONTENT_THRESHOLD;
}

export function mergeErrorSummaries(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const merged = { ...a };
  for (const [description, count] of Object.entries(b)) {
    merged[description] = (merged[description] ?? 0) + count;
  }
  return merged;
}

export function topErrors(
  summary: Record<string, number>,
  limit = 5,
): Array<{ description: string; count: number }> {
  return Object.entries(summary)
    .map(([description, count]) => ({ description, count }))
    .sort((x, y) => y.count - x.count)
    .slice(0, limit);
}
