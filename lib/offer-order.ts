const MAX_REORDER_IDS = 500;

/** Returns a copy of `list` with the item at `from` moved to index `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  if (from === to || from < 0 || to < 0 || from >= copy.length || to >= copy.length) {
    return copy;
  }
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Validates `{ ids: string[] }` — the full list of offer ids in their new order. */
export function parseReorderPayload(input: unknown): string[] | null {
  if (!input || typeof input !== "object") return null;
  const ids = (input as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_REORDER_IDS) return null;
  if (!ids.every((id): id is string => typeof id === "string" && id.length > 0)) return null;
  if (new Set(ids).size !== ids.length) return null;
  return ids;
}
