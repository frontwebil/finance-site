import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cloudinarySignature, validateImageFile } from "./cloudinary";

const MB = 1024 * 1024;

describe("validateImageFile", () => {
  it("accepts a 1 MB png", () => {
    expect(validateImageFile({ type: "image/png", size: MB })).toBeNull();
  });
  it("rejects gif", () => {
    expect(validateImageFile({ type: "image/gif", size: MB })).toEqual(expect.any(String));
  });
  it("rejects an empty file", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 0 })).toEqual(expect.any(String));
  });
  it("rejects files over 5 MB", () => {
    expect(validateImageFile({ type: "image/webp", size: 5 * MB + 1 })).toEqual(expect.any(String));
  });
});

describe("cloudinarySignature", () => {
  it("signs sorted params joined with & plus the secret", () => {
    const expected = createHash("sha1").update("folder=offers&timestamp=1s").digest("hex");
    expect(cloudinarySignature({ timestamp: "1", folder: "offers" }, "s")).toBe(expected);
  });
});
