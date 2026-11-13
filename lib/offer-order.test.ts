import { describe, expect, it } from "vitest";
import { moveItem, parseReorderPayload } from "./offer-order";

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  it("moves an item down", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item up", () => {
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("does not mutate the input", () => {
    moveItem(list, 0, 3);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("returns the same order for out-of-range or equal positions", () => {
    expect(moveItem(list, 0, -1)).toEqual(list);
    expect(moveItem(list, 3, 4)).toEqual(list);
    expect(moveItem(list, 2, 2)).toEqual(list);
  });
});

describe("parseReorderPayload", () => {
  it("accepts a list of unique ids", () => {
    expect(parseReorderPayload({ ids: ["x", "y"] })).toEqual(["x", "y"]);
  });

  it("rejects duplicates", () => {
    expect(parseReorderPayload({ ids: ["x", "x"] })).toBeNull();
  });

  it("rejects non-string or empty ids", () => {
    expect(parseReorderPayload({ ids: ["x", 1] })).toBeNull();
    expect(parseReorderPayload({ ids: ["x", ""] })).toBeNull();
  });

  it("rejects a missing or empty list", () => {
    expect(parseReorderPayload({})).toBeNull();
    expect(parseReorderPayload({ ids: [] })).toBeNull();
    expect(parseReorderPayload(null)).toBeNull();
  });
});
