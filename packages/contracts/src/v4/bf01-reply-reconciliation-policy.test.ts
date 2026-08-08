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
    sourceReference: "bf01-test",
    sourceVersion: "closing-strategy-v1",
    observedAt: "2026-08-08T00:00:00.000Z",
  },
};

describe("BF-01 closing-strategy policy extension", () => {
  it("keeps existing closing-strategy artifacts valid as LEGACY", () => {
    expect(ClosingStrategyAdminContentV1Schema.safeParse(base).success).toBe(true);
  });

  it("accepts CLARIFY_RECONCILED_V1 only with an approved fallback", () => {
    expect(ClosingStrategyAdminContentV1Schema.safeParse({
      ...base,
      replyReconciliationPolicy: "CLARIFY_RECONCILED_V1",
      replyReconciliationFallbackText:
        "Chị muốn em làm rõ phần nào để em trả lời đúng ý chị?",
    }).success).toBe(true);

    expect(ClosingStrategyAdminContentV1Schema.safeParse({
      ...base,
      replyReconciliationPolicy: "CLARIFY_RECONCILED_V1",
    }).success).toBe(false);
  });

  it("rejects fallback text on LEGACY and unknown policy values", () => {
    expect(ClosingStrategyAdminContentV1Schema.safeParse({
      ...base,
      replyReconciliationPolicy: "LEGACY",
      replyReconciliationFallbackText: "Should not be active.",
    }).success).toBe(false);

    expect(ClosingStrategyAdminContentV1Schema.safeParse({
      ...base,
      replyReconciliationPolicy: "UNSAFE_ALWAYS_REPLY",
      replyReconciliationFallbackText: "No.",
    }).success).toBe(false);
  });
});
