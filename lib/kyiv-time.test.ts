import { describe, expect, it } from "vitest";
import { computeNextRunAt, formatKyivTime, isValidSendTime, kyivDateKey } from "./kyiv-time";

describe("computeNextRunAt", () => {
  it("returns today when the time is still ahead (winter, UTC+2)", () => {
    expect(computeNextRunAt("10:00", new Date("2026-11-12T07:00:00Z")).toISOString())
      .toBe("2026-11-12T08:00:00.000Z");
  });
  it("is strictly after now", () => {
    expect(computeNextRunAt("10:00", new Date("2026-11-12T08:00:00Z")).toISOString())
      .toBe("2026-11-13T08:00:00.000Z");
  });
  it("uses summer offset (UTC+3)", () => {
    expect(computeNextRunAt("10:00", new Date("2026-07-01T05:00:00Z")).toISOString())
      .toBe("2026-07-01T07:00:00.000Z");
  });
  it("skips a Kyiv date that already had a run", () => {
    expect(
      computeNextRunAt("12:00", new Date("2026-11-12T09:00:00Z"), new Date("2026-11-12T08:00:00Z")).toISOString(),
    ).toBe("2026-11-13T10:00:00.000Z");
  });
  it("handles the spring-forward gap (03:30 does not exist on 2027-03-28)", () => {
    expect(computeNextRunAt("03:30", new Date("2027-03-27T12:00:00Z")).toISOString())
      .toBe("2027-03-28T01:30:00.000Z");
  });
  it("fires once on the fall-back date and correctly the next day", () => {
    const first = computeNextRunAt("03:30", new Date("2026-10-24T12:00:00Z"));
    expect(["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"]).toContain(first.toISOString());
    expect(computeNextRunAt("03:30", first, first).toISOString()).toBe("2026-10-26T01:30:00.000Z");
  });
});

describe("helpers", () => {
  it("validates HH:MM", () => {
    expect(isValidSendTime("09:05")).toBe(true);
    expect(isValidSendTime("24:00")).toBe(false);
    expect(isValidSendTime("9:05")).toBe(false);
  });
  it("gives the Kyiv date, not the UTC date", () => {
    expect(kyivDateKey(new Date("2026-11-12T23:30:00Z"))).toBe("2026-11-13");
  });
  it("formats Kyiv time as dd.mm HH:MM", () => {
    expect(formatKyivTime(new Date("2026-11-12T08:05:00Z"))).toBe("12.11 10:05");
  });
});
