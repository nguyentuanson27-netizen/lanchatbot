import { describe, expect, it } from "vitest";
import {
  resolveTrackCCandidateClaimReferences,
  type ClaimReferenceRegistryEntry,
} from "./track-c-claim-reference-resolver.js";

const errors = {
  invalid: "INVALID",
  unknown: "UNKNOWN",
  duplicate: "DUPLICATE",
  textMismatch: "TEXT_MISMATCH",
} as const;

function priceEntry(subject: string, value: string): ClaimReferenceRegistryEntry {
  return {
    contentHash: "a".repeat(64),
    protectedProposition: "PRICE",
    placeholders: null,
    protectedValueBindings: { CLAIM_SUBJECT: subject, CLAIM_VALUE: value },
  };
}

function output(text: string, claimRef = "CLAIM_001") {
  return {
    segments: [{
      kind: "VERIFIED_CLAIM",
      role: "ANSWER",
      protectedProposition: "PRICE",
      protectedResolution: "SUPPORTED",
      text,
      claimRef,
    }],
    strategy: "ANSWER_VERIFIED_FACTS",
    cta: "NONE",
  };
}

describe("resolveTrackCCandidateClaimReferences", () => {
  it.each([
    ["missing", "Mẫu {{CLAIM_VALUE}} ạ."],
    ["duplicate", "Mẫu {{CLAIM_SUBJECT}} giá {{CLAIM_VALUE}}, {{CLAIM_VALUE}} ạ."],
    ["unknown", "Mẫu {{CLAIM_SUBJECT}} giá {{CLAIM_OTHER}} ạ."],
  ])("fails closed for a %s protected-value binding", (_name, text) => {
    expect(() => resolveTrackCCandidateClaimReferences(
      output(text),
      new Map([["CLAIM_001", priceEntry("SQ9012", "849.000đ")]]),
      errors,
    )).toThrow("TEXT_MISMATCH");
  });

  it("keeps each protected price bound to its own product subject", () => {
    const result = resolveTrackCCandidateClaimReferences({
      segments: [
        {
          ...output("{{CLAIM_SUBJECT}} giá {{CLAIM_VALUE}} ạ.").segments[0],
          claimRef: "CLAIM_001",
        },
        {
          ...output("{{CLAIM_SUBJECT}} giá {{CLAIM_VALUE}} ạ.").segments[0],
          claimRef: "CLAIM_002",
        },
      ],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    }, new Map([
      ["CLAIM_001", priceEntry("SQ9012", "849.000đ")],
      ["CLAIM_002", priceEntry("SV9031", "1.299.000đ")],
    ]), errors) as {
      segments: Array<{ text: string; claimContentHash: string; claimRef?: string }>;
    };

    expect(result.segments).toEqual([
      expect.objectContaining({ text: "SQ9012 giá 849.000đ ạ." }),
      expect.objectContaining({ text: "SV9031 giá 1.299.000đ ạ." }),
    ]);
    expect(result.segments.every((segment) => segment.claimRef === undefined)).toBe(true);
  });
});
