import { describe, expect, it } from "vitest";
import {
  buildDecisionObservabilityV1,
  reconcileDecisionObservabilityV1,
} from "./decision-observability.js";

describe("DF-P1 decision observability", () => {
  it("summarizes current decision inputs without retaining customer/model text", () => {
    const result = buildDecisionObservabilityV1({
      dialogueEvidenceCodes: ["TEXT_OCCASION", "MODEL_BUYING_COMMITTED"],
      dialogueEvidenceSource: "HYBRID_RUNTIME",
      buyingIntent: {
        decision: "COMMITTED",
        source: "MODEL_STRUCTURED_OUTPUT",
        requestedAction: "OPEN_CART",
        quantity: 2,
        confidence: 0.97,
        reasonCodes: ["MODEL_BUYING_COMMITTED"],
      },
      protectedClaimTypes: ["PRODUCT_MEDIA", "PRICE", "PRICE"],
      guardOutcome: "ALLOWED",
      guardReasonCodes: [],
      guardedPlanHash: "a".repeat(64),
      phase: "CART_OPEN",
      phaseSource: "SALES_CYCLE_STAGE_V1",
      barrier: "BARRIER_PRICE",
      strategy: "STRATEGY_ANSWER_OBJECTION",
      cta: "ASK_BUDGET",
      strategyUsesModelEvidence: true,
      productScope: "RESOLVED",
      sideEffectTypes: ["SALES_CYCLE_STATE", "META_OUTBOX", "META_OUTBOX"],
      sideEffectReasonCodes: [],
    });

    expect(result).toMatchObject({
      schemaVersion: 1,
      buyingIntent: {
        authorityVersion: "HYBRID_BUYING_INTENT_V1",
        decision: "COMMITTED",
        requestedAction: "OPEN_CART",
        quantity: 2,
        confidenceBand: "HIGH",
      },
      protectedClaimValidation: {
        outcome: "VALIDATED",
        claimTypes: ["PRICE", "PRODUCT_MEDIA"],
        validatedCount: 2,
        rejectedCount: 0,
      },
      readiness: { outcome: "LEGACY_READY" },
      context: { contextVersion: "LEGACY_CONTEXT_V1" },
      strategyCta: {
        source: "MODEL_WITH_DETERMINISTIC_POLICY",
      },
      sideEffectPlan: {
        disposition: "PLANNED",
        effectTypes: ["META_OUTBOX", "SALES_CYCLE_STATE"],
      },
    });
    expect(result.dialogueEvidence.evidenceHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.buyingIntent.evidenceHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(result)).not.toContain("0900000000");
  });

  it("records a guarded safe fallback without presenting it as canonical readiness", () => {
    const result = buildDecisionObservabilityV1({
      dialogueEvidenceCodes: [],
      dialogueEvidenceSource: "NONE",
      buyingIntent: {
        decision: "NONE",
        source: null,
        requestedAction: "NONE",
        quantity: null,
        confidence: null,
        reasonCodes: [],
      },
      protectedClaimTypes: ["SIZE_FIT"],
      guardOutcome: "BLOCKED",
      guardReasonCodes: ["SIZE_RECOMMENDATION_CLAIM_REQUIRED"],
      guardedPlanHash: "b".repeat(64),
      phase: "FIT_CONSULTING",
      phaseSource: "LEGACY_CONVERSATION_STAGE_V1",
      barrier: "BARRIER_FIT",
      strategy: "STRATEGY_ASK_CLARIFY",
      cta: "ASK_MEASUREMENTS",
      strategyUsesModelEvidence: false,
      productScope: "RESOLVED",
      sideEffectTypes: ["META_OUTBOX"],
      sideEffectReasonCodes: ["SIZE_RECOMMENDATION_CLAIM_REQUIRED"],
    });

    expect(result).toMatchObject({
      protectedClaimValidation: {
        outcome: "BLOCKED",
        validatedCount: 0,
        rejectedCount: 1,
      },
      readiness: {
        rulesetVersion: "LEGACY_READINESS_OBSERVATION_V1",
        outcome: "LEGACY_NOT_READY",
      },
      sideEffectPlan: { disposition: "SAFE_FALLBACK_PLANNED" },
    });
  });

  it("updates only reconciliation observability when BF-01 replaces NO_REPLY", () => {
    const initial = buildDecisionObservabilityV1({
      dialogueEvidenceCodes: ["TEXT_OCCASION"],
      dialogueEvidenceSource: "DETERMINISTIC_RUNTIME",
      buyingIntent: {
        decision: "NONE",
        source: null,
        requestedAction: "NONE",
        quantity: null,
        confidence: null,
        reasonCodes: [],
      },
      protectedClaimTypes: [],
      guardOutcome: "ALLOWED",
      guardReasonCodes: [],
      guardedPlanHash: "c".repeat(64),
      phase: "DISCOVERY",
      phaseSource: "LEGACY_CONVERSATION_STAGE_V1",
      barrier: "NONE",
      strategy: "STRATEGY_ASK_CLARIFY",
      cta: "ASK_OCCASION",
      strategyUsesModelEvidence: false,
      productScope: "NOT_REQUIRED",
      sideEffectTypes: [],
      sideEffectReasonCodes: [],
    });

    const reconciled = reconcileDecisionObservabilityV1(initial, [
      "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED",
      "BF01_MODEL_CLARIFICATION_REPAIR",
    ]);

    expect(reconciled.reconciliation).toEqual({
      contractVersion: "BF01_RECONCILIATION_V1",
      outcome: "OVERRIDDEN",
      reasonCodes: [
        "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED",
        "BF01_MODEL_CLARIFICATION_REPAIR",
      ],
    });
    expect(reconciled.buyingIntent).toEqual(initial.buyingIntent);
    expect(reconciled.sideEffectPlan).toEqual({
      ...initial.sideEffectPlan,
      disposition: "PLANNED",
      effectTypes: ["META_OUTBOX"],
      reasonCodes: [
        "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED",
        "BF01_MODEL_CLARIFICATION_REPAIR",
      ],
    });
  });
});
