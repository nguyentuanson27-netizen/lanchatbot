import { createHash } from "node:crypto";
import type { DecisionObservabilityV1 } from "@lana/contracts";

type DialogueEvidenceSource =
  DecisionObservabilityV1["dialogueEvidence"]["source"];
type BuyingIntent = DecisionObservabilityV1["buyingIntent"];
type ProtectedClaimType =
  DecisionObservabilityV1["protectedClaimValidation"]["claimTypes"][number];
type GuardOutcome = DecisionObservabilityV1["guard"]["outcome"];
type Phase = DecisionObservabilityV1["phaseBarrier"]["phase"];
type PhaseSource = DecisionObservabilityV1["phaseBarrier"]["phaseSource"];
type Barrier = DecisionObservabilityV1["phaseBarrier"]["barrier"];
type Strategy = DecisionObservabilityV1["strategyCta"]["strategy"];
type Cta = DecisionObservabilityV1["strategyCta"]["cta"];
type ProductScope = DecisionObservabilityV1["readiness"]["productScope"];
type SideEffectType =
  DecisionObservabilityV1["sideEffectPlan"]["effectTypes"][number];

const REASON_CODE = /^[A-Z0-9][A-Z0-9_.:-]{0,127}$/u;

export interface BuildDecisionObservabilityInput {
  readonly dialogueEvidenceCodes: readonly string[];
  readonly dialogueEvidenceSource: DialogueEvidenceSource;
  readonly buyingIntent: Readonly<{
    decision: BuyingIntent["decision"];
    source: BuyingIntent["source"];
    requestedAction: BuyingIntent["requestedAction"];
    quantity: number | null;
    confidence: number | null;
    reasonCodes: readonly string[];
  }>;
  readonly protectedClaimTypes: readonly ProtectedClaimType[];
  readonly guardOutcome: GuardOutcome;
  readonly guardReasonCodes: readonly string[];
  readonly guardedPlanHash: string | null;
  readonly phase: Phase;
  readonly phaseSource: PhaseSource;
  readonly barrier: Barrier;
  readonly strategy: Strategy;
  readonly cta: Cta;
  readonly strategyUsesModelEvidence: boolean;
  readonly productScope: ProductScope;
  readonly sideEffectTypes: readonly SideEffectType[];
  readonly sideEffectReasonCodes: readonly string[];
}

function boundedCodes(values: readonly string[], maximum = 20): string[] {
  return [...new Set(values.filter((value) => REASON_CODE.test(value)))]
    .sort()
    .slice(0, maximum);
}

function sortedUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort() as T[];
}

function evidenceHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function confidenceBand(
  value: number | null,
): BuyingIntent["confidenceBand"] {
  if (value === null || !Number.isFinite(value)) return "UNKNOWN";
  if (value >= 0.9) return "HIGH";
  if (value >= 0.7) return "MEDIUM";
  return "LOW";
}

export function buildDecisionObservabilityV1(
  input: BuildDecisionObservabilityInput,
): DecisionObservabilityV1 {
  const dialogueCodes = boundedCodes(input.dialogueEvidenceCodes, 16);
  const buyingReasonCodes = boundedCodes(input.buyingIntent.reasonCodes, 16);
  const guardReasonCodes = boundedCodes(input.guardReasonCodes);
  const sideEffectReasonCodes = boundedCodes(input.sideEffectReasonCodes);
  const claimTypes = sortedUnique(input.protectedClaimTypes).slice(0, 8);
  const sideEffectTypes = sortedUnique(input.sideEffectTypes).slice(0, 8);
  const protectedClaimOutcome = input.guardedPlanHash === null
    ? "NOT_EVALUATED"
    : claimTypes.length === 0
      ? "NO_PROTECTED_CLAIMS"
      : input.guardOutcome === "ALLOWED"
        ? "VALIDATED"
        : "BLOCKED";
  const sideEffectDisposition = sideEffectTypes.length === 0
    ? "NONE"
    : input.guardOutcome === "BLOCKED"
      ? "SAFE_FALLBACK_PLANNED"
      : "PLANNED";
  const readinessOutcome = input.guardOutcome === "NOT_EVALUATED"
    ? "NOT_EVALUATED"
    : input.guardOutcome === "BLOCKED"
      ? "LEGACY_NOT_READY"
      : "LEGACY_READY";

  return {
    schemaVersion: 1,
    dialogueEvidence: {
      source: input.dialogueEvidenceSource,
      codes: dialogueCodes,
      evidenceHash: dialogueCodes.length > 0
        ? evidenceHash([input.dialogueEvidenceSource, dialogueCodes])
        : null,
    },
    buyingIntent: {
      authorityVersion: "HYBRID_BUYING_INTENT_V1",
      decision: input.buyingIntent.decision,
      source: input.buyingIntent.source,
      requestedAction: input.buyingIntent.requestedAction,
      quantity: input.buyingIntent.quantity,
      confidenceBand: confidenceBand(input.buyingIntent.confidence),
      evidenceReasonCodes: buyingReasonCodes,
      evidenceHash: input.buyingIntent.decision !== "NONE"
        ? evidenceHash([
            input.buyingIntent.source,
            input.buyingIntent.decision,
            input.buyingIntent.requestedAction,
            input.buyingIntent.quantity,
            buyingReasonCodes,
          ])
        : null,
    },
    protectedClaimValidation: {
      verifierVersion: "LEGACY_GUARD_V1",
      outcome: protectedClaimOutcome,
      claimTypes,
      validatedCount: protectedClaimOutcome === "VALIDATED"
        ? claimTypes.length
        : 0,
      rejectedCount: protectedClaimOutcome === "BLOCKED"
        ? claimTypes.length
        : 0,
      reasonCodes: guardReasonCodes,
    },
    readiness: {
      rulesetVersion: "LEGACY_READINESS_OBSERVATION_V1",
      outcome: readinessOutcome,
      productScope: input.productScope,
      reasonCodes: guardReasonCodes,
    },
    phaseBarrier: {
      contractVersion: "LEGACY_PHASE_BARRIER_OBSERVATION_V1",
      phase: input.phase,
      phaseSource: input.phaseSource,
      barrier: input.barrier,
      barrierSource: input.barrier === "NOT_EVALUATED"
        ? "NONE"
        : "WAVE2_STRATEGY_V1",
    },
    context: {
      schemaVersion: 1,
      contextVersion: "LEGACY_CONTEXT_V1",
    },
    strategyCta: {
      rulesetVersion: input.strategy === "NONE"
        ? "NONE"
        : "WAVE2_STRATEGY_V1",
      strategy: input.strategy,
      cta: input.cta,
      source: input.strategy === "NONE"
        ? "NONE"
        : input.strategyUsesModelEvidence
          ? "MODEL_WITH_DETERMINISTIC_POLICY"
          : "DETERMINISTIC_RUNTIME",
    },
    reconciliation: {
      contractVersion: "BF01_RECONCILIATION_V1",
      outcome: "NOT_APPLIED",
      reasonCodes: [],
    },
    guard: {
      contractVersion: "AGENT_PROPOSAL_GUARD_V1",
      outcome: input.guardOutcome,
      reasonCodes: guardReasonCodes,
      planHash: input.guardedPlanHash,
    },
    sideEffectPlan: {
      contractVersion: "REALTIME_COMMIT_PLAN_V1",
      disposition: sideEffectDisposition,
      effectTypes: sideEffectTypes,
      reasonCodes: sideEffectReasonCodes,
    },
  };
}

export function reconcileDecisionObservabilityV1(
  current: DecisionObservabilityV1,
  reasonCodes: readonly string[],
): DecisionObservabilityV1 {
  return {
    ...current,
    readiness: {
      ...current.readiness,
      outcome: "LEGACY_READY",
    },
    reconciliation: {
      contractVersion: "BF01_RECONCILIATION_V1",
      outcome: "OVERRIDDEN",
      reasonCodes: boundedCodes(reasonCodes),
    },
    sideEffectPlan: {
      ...current.sideEffectPlan,
      disposition: "PLANNED",
      effectTypes: sortedUnique([
        ...current.sideEffectPlan.effectTypes,
        "META_OUTBOX",
      ]),
      reasonCodes: boundedCodes([
        ...current.sideEffectPlan.reasonCodes,
        ...reasonCodes,
      ]),
    },
  };
}
