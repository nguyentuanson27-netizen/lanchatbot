import { describe, expect, it } from "vitest";
import { ClosingStrategyAdminContentV1Schema } from "./admin-policy-control.js";

const base = {
  schemaVersion: 1 as const,
  kind: "CLOSING_STRATEGY" as const,
  decisionMode: "DETERMINISTIC_POLICY_ONLY" as const,
  retryMayEscalateConcession: false as const,
  okConfirmsOnlyAtOrderPreview: true as const,
  steps: [
    { state: "READY" as const, nextAction: "COLLECT_SIZE" as const, promptTemplate: "Collect verified checkout fields." },
    { state: "HESITANT" as const, nextAction: "APPLY_SECOND_CONCESSION" as const, promptTemplate: "Use only reviewed concessions." },
    { state: "CAUTIOUS" as const, nextAction: "HANDOFF" as const, promptTemplate: "Handoff when policy requires it." },
  ],
  sourceMetadata: {
    source: "ADMIN" as const,
    sourceReference: "bf06-test",
    sourceVersion: "closing-strategy-v1",
    observedAt: "2026-08-09T00:00:00.000Z",
  },
};

describe("BF-06 media partial-resolution policy", () => {
  it.each(["LEGACY", "PER_ASSET_V1"] as const)(
    "accepts the reviewed %s selection in an immutable closing-strategy artifact",
    (mediaPartialResolutionPolicy) => {
      expect(ClosingStrategyAdminContentV1Schema.parse({
        ...base,
        mediaPartialResolutionPolicy,
      })).toMatchObject({ mediaPartialResolutionPolicy });
    },
  );

  it("keeps existing artifacts valid and rejects unreviewed values", () => {
    expect(ClosingStrategyAdminContentV1Schema.safeParse(base).success).toBe(true);
    expect(ClosingStrategyAdminContentV1Schema.safeParse({
      ...base,
      mediaPartialResolutionPolicy: "IGNORE_ALL_FAILURES",
    }).success).toBe(false);
  });
});
