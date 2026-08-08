import { describe, expect, it } from "vitest";
import {
  ClosingStrategyAdminContentV1Schema,
} from "./admin-policy-control.js";
import {
  ClosingStrategyAdminContentV1Schema as LegacyClosingStrategyAdminContentV1Schema,
} from "./admin-policy-control-base.js";

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
      promptTemplate: "  Collect the next verified checkout field.  ",
    },
    {
      state: "HESITANT" as const,
      nextAction: "APPLY_SECOND_CONCESSION" as const,
      promptTemplate: "  Use the reviewed second concession only.  ",
    },
    {
      state: "CAUTIOUS" as const,
      nextAction: "HANDOFF" as const,
      promptTemplate: "  Handoff when policy requires human ownership.  ",
    },
  ],
  sourceMetadata: {
    source: "ADMIN" as const,
    sourceReference: "  bf01-compat  ",
    sourceVersion: "  closing-strategy-v1  ",
    observedAt: "2026-08-08T00:00:00.000Z",
  },
};

describe("BF-01 closing strategy compatibility", () => {
  it("preserves legacy parse normalization exactly when BF-01 fields are absent", () => {
    expect(ClosingStrategyAdminContentV1Schema.parse(base)).toEqual(
      LegacyClosingStrategyAdminContentV1Schema.parse(base),
    );
  });

  it("normalizes the approved fallback after legacy normalization succeeds", () => {
    const parsed = ClosingStrategyAdminContentV1Schema.parse({
      ...base,
      replyReconciliationPolicy: "CLARIFY_RECONCILED_V1",
      replyReconciliationFallbackText:
        "  Chị muốn em làm rõ phần nào để em trả lời đúng ý chị?  ",
    });

    expect(parsed.steps[0]?.promptTemplate).toBe(
      "Collect the next verified checkout field.",
    );
    expect(parsed.sourceMetadata.sourceReference).toBe("bf01-compat");
    expect(parsed.replyReconciliationFallbackText).toBe(
      "Chị muốn em làm rõ phần nào để em trả lời đúng ý chị?",
    );
  });
});
