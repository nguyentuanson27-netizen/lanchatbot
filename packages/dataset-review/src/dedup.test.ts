import { describe, expect, it } from "vitest";
import { customerSequenceFingerprint } from "./dedup.js";

describe("customerSequenceFingerprint", () => {
  it("is stable across whitespace and casing differences", () => {
    const a = customerSequenceFingerprint(["Cho Xin Giá", "  chốt size M "]);
    const b = customerSequenceFingerprint(["cho xin giá", "chốt size m"]);
    expect(a).toBe(b);
  });

  it("differs when the customer script differs", () => {
    const a = customerSequenceFingerprint(["cho xin giá"]);
    const b = customerSequenceFingerprint(["cho xin size"]);
    expect(a).not.toBe(b);
  });

  it("ignores shop messages by only receiving the customer sequence", () => {
    // Two conversations with identical customer scripts but different shop
    // replies produce the same fingerprint because only customer text is passed.
    const a = customerSequenceFingerprint(["mẫu này bao nhiêu", "ok chốt"]);
    const b = customerSequenceFingerprint(["mẫu này bao nhiêu", "ok chốt"]);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
