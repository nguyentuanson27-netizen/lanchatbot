import { describe, expect, it } from "vitest";
import { DecisionObservabilityV1Schema } from "./decision-observability.js";

const validObservability = {
  schemaVersion: 1,
  dialogueEvidence: {
    source: "HYBRID_RUNTIME",
    codes: ["MODEL_BUYING_COMMITTED", "TEXT_OCCASION"],
    evidenceHash: "a".repeat(64),
  },
  buyingIntent: {
    authorityVersion: "HYBRID_BUYING_INTENT_V1",
    decision: "COMMITTED",
    source: "MODEL_STRUCTURED_OUTPUT",
    requestedAction: "OPEN_CART",
    quantity: 2,
    confidenceBand: "HIGH",
    evidenceReasonCodes: ["MODEL_BUYING_COMMITTED"],
    evidenceHash: "b".repeat(64),
  },
  protectedClaimValidation: {
    verifierVersion: "LEGACY_GUARD_V1",
    outcome: "VALIDATED",
    claimTypes: ["PRICE", "PRODUCT_MEDIA"],
    validatedCount: 2,
    rejectedCount: 0,
    reasonCodes: [],
  },
  readiness: {
    rulesetVersion: "LEGACY_READINESS_OBSERVATION_V1",
    outcome: "LEGACY_READY",
    productScope: "RESOLVED",
    reasonCodes: [],
  },
  phaseBarrier: {
    contractVersion: "LEGACY_PHASE_BARRIER_OBSERVATION_V1",
    phase: "CART_OPEN",
    phaseSource: "SALES_CYCLE_STAGE_V1",
    barrier: "BARRIER_PRICE",
    barrierSource: "WAVE2_STRATEGY_V1",
  },
  context: {
    schemaVersion: 1,
    contextVersion: "LEGACY_CONTEXT_V1",
  },
  strategyCta: {
    rulesetVersion: "WAVE2_STRATEGY_V1",
    strategy: "STRATEGY_ANSWER_OBJECTION",
    cta: "ASK_BUDGET",
    source: "MODEL_WITH_DETERMINISTIC_POLICY",
  },
  reconciliation: {
    contractVersion: "BF01_RECONCILIATION_V1",
    outcome: "NOT_APPLIED",
    reasonCodes: [],
  },
  guard: {
    contractVersion: "AGENT_PROPOSAL_GUARD_V1",
    outcome: "ALLOWED",
    reasonCodes: [],
    planHash: "c".repeat(64),
  },
  sideEffectPlan: {
    contractVersion: "REALTIME_COMMIT_PLAN_V1",
    disposition: "PLANNED",
    effectTypes: ["META_OUTBOX", "SALES_CYCLE_STATE"],
    reasonCodes: [],
  },
} as const;

describe("DecisionObservabilityV1Schema", () => {
  it("accepts the bounded versioned DF-P1 decision envelope", () => {
    expect(DecisionObservabilityV1Schema.parse(validObservability))
      .toEqual(validObservability);
  });

  it("rejects raw customer or model text at every strict boundary", () => {
    expect(() => DecisionObservabilityV1Schema.parse({
      ...validObservability,
      dialogueEvidence: {
        ...validObservability.dialogueEvidence,
        rawText: "Số điện thoại 0900000000",
      },
    })).toThrow();
    expect(() => DecisionObservabilityV1Schema.parse({
      ...validObservability,
      providerPayload: { candidate: "raw model response" },
    })).toThrow();
  });

  it("rejects unbounded reason codes and unrestricted phase values", () => {
    expect(() => DecisionObservabilityV1Schema.parse({
      ...validObservability,
      guard: {
        ...validObservability.guard,
        reasonCodes: Array.from({ length: 21 }, (_, index) => `REASON_${index}`),
      },
    })).toThrow();
    expect(() => DecisionObservabilityV1Schema.parse({
      ...validObservability,
      phaseBarrier: {
        ...validObservability.phaseBarrier,
        phase: "customer supplied free text",
      },
    })).toThrow();
  });

  it("rejects contradictory observations that could misstate authority", () => {
    expect(() => DecisionObservabilityV1Schema.parse({
      ...validObservability,
      dialogueEvidence: {
        source: "NONE",
        codes: ["TEXT_OCCASION"],
        evidenceHash: "a".repeat(64),
      },
    })).toThrow();
    expect(() => DecisionObservabilityV1Schema.parse({
      ...validObservability,
      phaseBarrier: {
        ...validObservability.phaseBarrier,
        phase: "NOT_EVALUATED",
        phaseSource: "SALES_CYCLE_STAGE_V1",
      },
    })).toThrow();
    expect(() => DecisionObservabilityV1Schema.parse({
      ...validObservability,
      sideEffectPlan: {
        ...validObservability.sideEffectPlan,
        disposition: "NONE",
      },
    })).toThrow();
  });
});
