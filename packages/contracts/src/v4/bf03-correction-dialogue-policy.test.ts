import { describe, expect, it } from "vitest";
import { ClosingStrategyAdminContentV1Schema } from "./admin-policy-control.js";

const base = {
  schemaVersion: 1 as const,
  kind: "CLOSING_STRATEGY" as const,
  decisionMode: "DETERMINISTIC_POLICY_ONLY" as const,
  retryMayEscalateConcession: false as const,
  okConfirmsOnlyAtOrderPreview: true as const,
  steps: [
    {
      state: "READY" as const,
      nextAction: "COLLECT_SIZE" as const,
      promptTemplate: "Collect the next verified checkout field.",
    },
    {
      state: "HESITANT" as const,
      nextAction: "APPLY_SECOND_CONCESSION" as const,
      promptTemplate: "Use the reviewed second concession only.",
    },
    {
      state: "CAUTIOUS" as const,
      nextAction: "HANDOFF" as const,
      promptTemplate: "Handoff when policy requires human ownership.",
    },
  ],
  sourceMetadata: {
    source: "ADMIN" as const,
    sourceReference: "bf03-test",
    sourceVersion: "closing-strategy-v1",
    observedAt: "2026-08-09T00:00:00.000Z",
  },
};

describe("BF-03 correction dialogue policy", () => {
  it("keeps existing artifacts valid with implicit LEGACY behavior", () => {
    expect(ClosingStrategyAdminContentV1Schema.safeParse(base).success).toBe(true);
  });

  it("accepts independently selectable correction containment", () => {
    const parsed = ClosingStrategyAdminContentV1Schema.parse({
      ...base,
      replyReconciliationPolicy: "CLARIFY_RECONCILED_V1",
      replyReconciliationFallbackText:
        "Chị muốn em làm rõ phần nào để em trả lời đúng ý chị?",
      correctionDialoguePolicy: "CORRECTION_CONTAINMENT_V1",
    });
    expect(parsed.correctionDialoguePolicy).toBe("CORRECTION_CONTAINMENT_V1");
    expect(parsed.replyReconciliationPolicy).toBe("CLARIFY_RECONCILED_V1");
  });

  it("accepts explicit LEGACY and rejects unknown correction policy values", () => {
    expect(ClosingStrategyAdminContentV1Schema.safeParse({
      ...base,
      correctionDialoguePolicy: "LEGACY",
    }).success).toBe(true);
    expect(ClosingStrategyAdminContentV1Schema.safeParse({
      ...base,
      correctionDialoguePolicy: "CORRECTION_REGEX_ALWAYS_WINS",
    }).success).toBe(false);
  });
});
