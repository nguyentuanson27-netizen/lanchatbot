import { describe, expect, it } from "vitest";
import {
  buildDecisionObservabilityV1,
  reconcileDecisionObservabilityV1,
} from "./decision-observability.js";

describe("DF-P1 decision observability", () => {
  it("accepts additive DF05/DF06 canonical authority and readiness evidence", () => {
    const result = buildDecisionObservabilityV1({
      dialogueEvidenceCodes: ["DIRECT_PURCHASE_VERB"],
      dialogueEvidenceSource: "DETERMINISTIC_RUNTIME",
      dialogueEvidenceHash: "1".repeat(64),
      buyingIntent: {
        authorityVersion: "CANONICAL_BUYING_INTENT_V1",
        decision: "COMMITTED", source: "DETERMINISTIC",
        requestedAction: "OPEN_CART", quantity: 1, confidence: 1,
        reasonCodes: ["DIRECT_PURCHASE_VERB"], evidenceHash: "2".repeat(64),
      },
      protectedClaimTypes: ["PRICE", "STOCK"],
      protectedClaimOutcome: "VALIDATED", protectedClaimValidatedCount: 2,
      protectedClaimRejectedCount: 0, protectedClaimReasonCodes: [],
      canonicalClaimCount: 2, canonicalClaimSetHash: "4".repeat(64),
      guardOutcome: "ALLOWED", guardReasonCodes: [], guardedPlanHash: "3".repeat(64),
      phase: "CART_OPEN", phaseSource: "SALES_CYCLE_STAGE_V1",
      barrier: "NONE", strategy: "NONE", cta: "NONE",
      strategyUsesModelEvidence: false,
      readinessOutcome: "READY",
      readinessRulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
      productScope: "RESOLVED", sideEffectTypes: ["CART"], sideEffectReasonCodes: [],
    });
    expect(result.buyingIntent).toMatchObject({
      authorityVersion: "CANONICAL_BUYING_INTENT_V1", evidenceHash: "2".repeat(64),
    });
    expect(result.dialogueEvidence.evidenceHash).toBe("1".repeat(64));
    expect(result.protectedClaimValidation).toMatchObject({
      canonicalClaimCount: 2, canonicalClaimSetHash: "4".repeat(64),
    });
    expect(result.readiness).toMatchObject({
      rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1", outcome: "READY",
    });
  });

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
      protectedClaimOutcome: "VALIDATED",
      protectedClaimValidatedCount: 2,
      protectedClaimRejectedCount: 0,
      protectedClaimReasonCodes: [],
      guardOutcome: "ALLOWED",
      guardReasonCodes: [],
      guardedPlanHash: "a".repeat(64),
      phase: "CART_OPEN",
      phaseSource: "SALES_CYCLE_STAGE_V1",
      barrier: "BARRIER_PRICE",
      strategy: "STRATEGY_ANSWER_OBJECTION",
      cta: "ASK_BUDGET",
      strategyUsesModelEvidence: true,
      readinessOutcome: "NOT_EVALUATED",
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
      readiness: { outcome: "NOT_EVALUATED" },
      context: { contextVersion: "LEGACY_CONTEXT_V1" },
      strategyCta: {
        source: "MODEL_WITH_DETERMINISTIC_POLICY",
      },
      sideEffectPlan: {
        disposition: "PLANNED",
        effectTypes: ["META_OUTBOX", "SALES_CYCLE_STATE"],
      },
    });
    expect(typeof result.dialogueEvidence.evidenceHash).toBe("string");
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
      protectedClaimOutcome: "BLOCKED",
      protectedClaimValidatedCount: 0,
      protectedClaimRejectedCount: 1,
      protectedClaimReasonCodes: ["SIZE_RECOMMENDATION_CLAIM_REQUIRED"],
      guardOutcome: "BLOCKED",
      guardReasonCodes: ["SIZE_RECOMMENDATION_CLAIM_REQUIRED"],
      guardedPlanHash: "b".repeat(64),
      phase: "FIT_CONSULTING",
      phaseSource: "LEGACY_CONVERSATION_STAGE_V1",
      barrier: "BARRIER_FIT",
      strategy: "STRATEGY_ASK_CLARIFY",
      cta: "ASK_MEASUREMENTS",
      strategyUsesModelEvidence: false,
      readinessOutcome: "NOT_EVALUATED",
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
        outcome: "NOT_EVALUATED",
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
      protectedClaimOutcome: "NO_PROTECTED_CLAIMS",
      protectedClaimValidatedCount: 0,
      protectedClaimRejectedCount: 0,
      protectedClaimReasonCodes: [],
      guardOutcome: "ALLOWED",
      guardReasonCodes: [],
      guardedPlanHash: "c".repeat(64),
      phase: "DISCOVERY",
      phaseSource: "LEGACY_CONVERSATION_STAGE_V1",
      barrier: "NONE",
      strategy: "STRATEGY_ASK_CLARIFY",
      cta: "ASK_OCCASION",
      strategyUsesModelEvidence: false,
      readinessOutcome: "NOT_EVALUATED",
      productScope: "NOT_REQUIRED",
      sideEffectTypes: [],
      sideEffectReasonCodes: [],
    });

    const reconciled = reconcileDecisionObservabilityV1(initial, [
      "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED",
      "BF01_MODEL_CLARIFICATION_REPAIR",
      "PHONE_0900000000",
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
    expect(reconciled.readiness).toEqual(initial.readiness);
    expect(JSON.stringify(reconciled)).not.toContain("PHONE_0900000000");
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

  it("normalizes an evidence-free model source before schema validation", () => {
    const result = buildDecisionObservabilityV1({
      dialogueEvidenceCodes: [],
      dialogueEvidenceSource: "MODEL_STRUCTURED_OUTPUT",
      buyingIntent: {
        decision: "NONE",
        source: null,
        requestedAction: "NONE",
        quantity: null,
        confidence: null,
        reasonCodes: [],
      },
      protectedClaimTypes: [],
      protectedClaimOutcome: "NO_PROTECTED_CLAIMS",
      protectedClaimValidatedCount: 0,
      protectedClaimRejectedCount: 0,
      protectedClaimReasonCodes: [],
      guardOutcome: "ALLOWED",
      guardReasonCodes: [],
      guardedPlanHash: "d".repeat(64),
      phase: "DISCOVERY",
      phaseSource: "LEGACY_CONVERSATION_STAGE_V1",
      barrier: "NOT_EVALUATED",
      strategy: "NONE",
      cta: "NONE",
      strategyUsesModelEvidence: false,
      readinessOutcome: "NOT_EVALUATED",
      productScope: "NOT_REQUIRED",
      sideEffectTypes: ["CONVERSATION_STATE"],
      sideEffectReasonCodes: [],
    });

    expect(result.dialogueEvidence).toEqual({
      source: "NONE",
      codes: [],
      evidenceHash: null,
    });
  });

  it("drops unregistered reason codes before validating persistence", () => {
    const result = buildDecisionObservabilityV1({
      dialogueEvidenceCodes: ["UNKNOWN_DIALOGUE_CODE"],
      dialogueEvidenceSource: "MODEL_STRUCTURED_OUTPUT",
      buyingIntent: {
        decision: "NONE",
        source: null,
        requestedAction: "NONE",
        quantity: null,
        confidence: null,
        reasonCodes: ["UNKNOWN_BUYING_CODE"],
      },
      protectedClaimTypes: [],
      protectedClaimOutcome: "NO_PROTECTED_CLAIMS",
      protectedClaimValidatedCount: 0,
      protectedClaimRejectedCount: 0,
      protectedClaimReasonCodes: [],
      guardOutcome: "ALLOWED",
      guardReasonCodes: ["UNKNOWN_GUARD_CODE"],
      guardedPlanHash: "f".repeat(64),
      phase: "DISCOVERY",
      phaseSource: "LEGACY_CONVERSATION_STAGE_V1",
      barrier: "NOT_EVALUATED",
      strategy: "NONE",
      cta: "NONE",
      strategyUsesModelEvidence: false,
      readinessOutcome: "NOT_EVALUATED",
      productScope: "NOT_REQUIRED",
      sideEffectTypes: ["CONVERSATION_STATE"],
      sideEffectReasonCodes: ["UNKNOWN_SIDE_EFFECT_CODE"],
    });

    expect(result.dialogueEvidence).toEqual({
      source: "NONE",
      codes: [],
      evidenceHash: null,
    });
    expect(result.guard.reasonCodes).toEqual([]);
    expect(result.sideEffectPlan.reasonCodes).toEqual([]);
  });

  it("records mixed validated and rejected claim types independently", () => {
    const result = buildDecisionObservabilityV1({
      dialogueEvidenceCodes: ["TEXT_PRICE_OBJECTION"],
      dialogueEvidenceSource: "DETERMINISTIC_RUNTIME",
      buyingIntent: {
        decision: "NONE",
        source: null,
        requestedAction: "NONE",
        quantity: null,
        confidence: null,
        reasonCodes: [],
      },
      protectedClaimTypes: ["PRICE", "PRODUCT_MEDIA"],
      protectedClaimOutcome: "PARTIALLY_BLOCKED",
      protectedClaimValidatedCount: 1,
      protectedClaimRejectedCount: 1,
      protectedClaimReasonCodes: ["UNVERIFIED_ATTACHMENT"],
      guardOutcome: "BLOCKED",
      guardReasonCodes: ["UNVERIFIED_ATTACHMENT"],
      guardedPlanHash: "e".repeat(64),
      phase: "PRODUCT_MATCHED",
      phaseSource: "LEGACY_CONVERSATION_STAGE_V1",
      barrier: "BARRIER_PRICE",
      strategy: "STRATEGY_ANSWER_OBJECTION",
      cta: "ASK_BUDGET",
      strategyUsesModelEvidence: false,
      readinessOutcome: "NOT_EVALUATED",
      productScope: "RESOLVED",
      sideEffectTypes: ["META_OUTBOX"],
      sideEffectReasonCodes: ["UNVERIFIED_ATTACHMENT"],
    });

    expect(result.protectedClaimValidation).toMatchObject({
      outcome: "PARTIALLY_BLOCKED",
      claimTypes: ["PRICE", "PRODUCT_MEDIA"],
      validatedCount: 1,
      rejectedCount: 1,
    });
    expect(result.readiness.outcome).toBe("NOT_EVALUATED");
  });

  it("keeps a non-claim guard failure out of claim and readiness reasons", () => {
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
      protectedClaimTypes: [],
      protectedClaimOutcome: "NO_PROTECTED_CLAIMS",
      protectedClaimValidatedCount: 0,
      protectedClaimRejectedCount: 0,
      protectedClaimReasonCodes: [],
      guardOutcome: "BLOCKED",
      guardReasonCodes: ["RAW_URL_IN_TEXT"],
      guardedPlanHash: "1".repeat(64),
      phase: "DISCOVERY",
      phaseSource: "LEGACY_CONVERSATION_STAGE_V1",
      barrier: "NOT_EVALUATED",
      strategy: "NONE",
      cta: "NONE",
      strategyUsesModelEvidence: false,
      readinessOutcome: "NOT_EVALUATED",
      productScope: "NOT_REQUIRED",
      sideEffectTypes: ["CONVERSATION_STATE"],
      sideEffectReasonCodes: ["RAW_URL_IN_TEXT"],
    });

    expect(result.protectedClaimValidation.reasonCodes).toEqual([]);
    expect(result.readiness.reasonCodes).toEqual([]);
    expect(result.guard.reasonCodes).toEqual(["RAW_URL_IN_TEXT"]);
  });

});
