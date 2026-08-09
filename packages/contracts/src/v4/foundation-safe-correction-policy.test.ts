import { describe, expect, it } from "vitest";
import {
  AdminArtifactContentV1Schema,
  ClosingStrategyAdminContentV1Schema,
} from "./admin-policy-control.js";

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
    sourceReference: "foundation-test",
    sourceVersion: "closing-strategy-v1",
    observedAt: "2026-08-09T00:00:00.000Z",
  },
};

describe("foundation-safe correction policy boundary", () => {
  it("keeps the accepted artifact valid without a BF-03 field", () => {
    expect(ClosingStrategyAdminContentV1Schema.parse(base)).toEqual(base);
    expect(AdminArtifactContentV1Schema.parse(base)).toEqual(base);
  });

  it.each(["CORRECTION_CONTAINMENT_V1", "LEGACY"] as const)(
    "rejects publishable correctionDialoguePolicy=%s",
    (correctionDialoguePolicy) => {
      const attemptedActivation = {
        ...base,
        correctionDialoguePolicy,
      };
      expect(ClosingStrategyAdminContentV1Schema.safeParse(attemptedActivation).success)
        .toBe(false);
      expect(AdminArtifactContentV1Schema.safeParse(attemptedActivation).success)
        .toBe(false);
    },
  );
});
