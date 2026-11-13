import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth";

describe("isAuthorizedCronRequest", () => {
  it("accepts the matching bearer secret", () => {
    expect(isAuthorizedCronRequest("Bearer s3cret", "s3cret")).toBe(true);
  });
  it("rejects a missing header", () => {
    expect(isAuthorizedCronRequest(null, "s3cret")).toBe(false);
  });
  it("rejects a wrong secret", () => {
    expect(isAuthorizedCronRequest("Bearer wrong", "s3cret")).toBe(false);
  });
  it("rejects when the secret is not configured", () => {
    expect(isAuthorizedCronRequest("Bearer s3cret", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
  });
  it("requires the Bearer prefix", () => {
    expect(isAuthorizedCronRequest("s3cret", "s3cret")).toBe(false);
  });
});
