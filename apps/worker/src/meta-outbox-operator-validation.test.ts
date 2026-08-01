import { describe, expect, it } from "vitest";
import { isSupportedMetaResponseGroupId } from "./meta-outbox-operator-validation.js";

describe("meta outbox operator response-group validation", () => {
  it("accepts legacy UUID v4 response groups", () => {
    expect(isSupportedMetaResponseGroupId("50000000-0000-4000-8000-000000000001")).toBe(true);
  });

  it("accepts deterministic UUID v5 response groups", () => {
    expect(isSupportedMetaResponseGroupId("50000000-0000-5000-8000-000000000001")).toBe(true);
  });

  it.each([
    "50000000-0000-3000-8000-000000000001",
    "50000000-0000-5000-7000-000000000001",
    "not-a-uuid",
  ])("rejects unsupported or malformed response group %s", (value) => {
    expect(isSupportedMetaResponseGroupId(value)).toBe(false);
  });
});