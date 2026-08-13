import { createHash } from "node:crypto";
import {
  DECISION_BUYING_INTENT_EVIDENCE_CODES_V1,
  DECISION_DIALOGUE_EVIDENCE_CODES_V1,
  DECISION_GUARD_REASON_CODES_V1,
  DECISION_RECONCILIATION_REASON_CODES_V1,
  DECISION_SIDE_EFFECT_REASON_CODES_V1,
  DecisionObservabilityV1Schema,
  type DecisionObservabilityV1,
} from "@lana/contracts";

type DialogueEvidenceSource =
  DecisionObservabilityV1["dialogueEvidence"]["source"];
type BuyingIntent = DecisionObservabilityV1["buyingIntent"];
type ProtectedClaimType =
  DecisionObservabilityV1["protectedClaimValidation"]["claimTypes"][number];
type ProtectedClaimOutcome =
  DecisionObservabilityV1["protectedClaimValidation"]["outcome"];
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
const DIALOGUE_CODES = new Set<string>(DECISION_DIALOGUE_EVIDENCE_CODES_V1);
const BUYING_CODES = new Set<string>(DECISION_BUYING_INTENT_EVIDENCE_CODES_V1);
const GUARD_CODES = new Set<string>(DECISION_GUARD_REASON_CODES_V1);
const RECONCILIATION_CODES = new Set<string>(
  DECISION_RECONCILIATION_REASON_CODES_V1,
);
const SIDE_EFFECT_CODES = new Set<string>(DECISION_SIDE_EFFECT_REASON_CODES_V1);
const PROTECTED_CLAIM_REASON_CODES = new Set<string>([
  "UNAUTHORIZED_PRICE",
  "UNAUTHORIZED_STOCK",
  "UNAUTHORIZED_ETA",
  "UNAUTHORIZED_PROMOTION",
  "UNAUTHORIZED_FREESHIP",
  "UNAUTHORIZED_SHIP_FEE",
  "UNVERIFIED_ATTACHMENT",
  ...DECISION_GUARD_REASON_CODES_V1.filter((code) =>
    code.startsWith("SIZE_RECOMMENDATION_")
  ),
]);

export function protectedClaimReasonCodes(
  values: readonly string[],
): readonly string[] {
  return boundedCodes(values, 20, PROTECTED_CLAIM_REASON_CODES);
}

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
  readonly protectedClaimOutcome: ProtectedClaimOutcome;
  readonly protectedClaimValidatedCount: number;
  readonly protectedClaimRejectedCount: number;
  readonly protectedClaimReasonCodes: readonly string[];
  readonly guardOutcome: GuardOutcome;
  readonly guardReasonCodes: readonly string[];
  readonly guardedPlanHash: string | null;
  readonly phase: Phase;
  readonly phaseSource: PhaseSource;
  readonly barrier: Barrier;
  readonly strategy: Strategy;
  readonly cta: Cta;
  readonly strategyUsesModelEvidence: boolean;
  readonly readinessOutcome: DecisionObservabilityV1["readiness"]["outcome"];
  readonly productScope: ProductScope;
  readonly sideEffectTypes: readonly SideEffectType[];
  readonly sideEffectReasonCodes: readonly string[];
}

function boundedCodes(
  values: readonly string[],
  maximum = 20,
  allowed?: ReadonlySet<string>,
): string[] {
  return [...new Set(values.filter((value) =>
    REASON_CODE.test(value) && (allowed === undefined || allowed.has(value))
  ))]
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

export interface ProtectedClaimValidationSummary {
  readonly outcome: ProtectedClaimOutcome;
  readonly claimTypes: readonly ProtectedClaimType[];
  readonly validatedCount: number;
  readonly rejectedCount: number;
}

export function buildDecisionObservabilityV1(
  input: BuildDecisionObservabilityInput,
): DecisionObservabilityV1 {
  const dialogueCodes = boundedCodes(input.dialogueEvidenceCodes, 16, DIALOGUE_CODES);
  const buyingReasonCodes = boundedCodes(input.buyingIntent.reasonCodes, 16, BUYING_CODES);
  const guardReasonCodes = boundedCodes(input.guardReasonCodes, 20, GUARD_CODES);
  const protectedClaimReasonCodes = boundedCodes(
    input.protectedClaimReasonCodes,
    20,
    GUARD_CODES,
  );
  const sideEffectReasonCodes = boundedCodes(
    input.sideEffectReasonCodes,
    20,
    SIDE_EFFECT_CODES,
  );
  const claimTypes = sortedUnique(input.protectedClaimTypes).slice(0, 8);
  const sideEffectTypes = sortedUnique(input.sideEffectTypes).slice(0, 8);
  const dialogueEvidenceSource = dialogueCodes.length === 0
    ? "NONE"
    : input.dialogueEvidenceSource === "NONE"
      ? "DETERMINISTIC_RUNTIME"
      : input.dialogueEvidenceSource;
  const sideEffectDisposition = sideEffectTypes.length === 0
    ? "NONE"
    : input.guardOutcome === "BLOCKED"
      ? "SAFE_FALLBACK_PLANNED"
      : "PLANNED";
  const observation: DecisionObservabilityV1 = {
    schemaVersion: 1,
    dialogueEvidence: {
      source: dialogueEvidenceSource,
      codes: dialogueCodes,
      evidenceHash: dialogueCodes.length > 0
        ? evidenceHash([dialogueEvidenceSource, dialogueCodes])
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
      outcome: input.protectedClaimOutcome,
      claimTypes,
      validatedCount: input.protectedClaimValidatedCount,
      rejectedCount: input.protectedClaimRejectedCount,
      reasonCodes: protectedClaimReasonCodes,
    },
    readiness: {
      rulesetVersion: "LEGACY_READINESS_OBSERVATION_V1",
      outcome: input.readinessOutcome,
      productScope: input.productScope,
      reasonCodes: [],
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
  // Validate the normalized envelope at the persistence boundary. This keeps
  // additive observability from making an otherwise valid runtime commit fail
  // later in the database adapter with an internally inconsistent source/hash.
  return DecisionObservabilityV1Schema.parse(observation);
}

export function reconcileDecisionObservabilityV1(
  current: DecisionObservabilityV1,
  reasonCodes: readonly string[],
): DecisionObservabilityV1 {
  const reconciliationReasonCodes = boundedCodes(
    reasonCodes,
    20,
    RECONCILIATION_CODES,
  );
  const sideEffectReasonCodes = boundedCodes(
    [...current.sideEffectPlan.reasonCodes, ...reasonCodes],
    20,
    SIDE_EFFECT_CODES,
  );
  const reconciled: DecisionObservabilityV1 = {
    ...current,
    reconciliation: {
      contractVersion: "BF01_RECONCILIATION_V1",
      outcome: "OVERRIDDEN",
      reasonCodes: reconciliationReasonCodes,
    },
    sideEffectPlan: {
      ...current.sideEffectPlan,
      disposition: "PLANNED",
      effectTypes: sortedUnique([
        ...current.sideEffectPlan.effectTypes,
        "META_OUTBOX",
      ]),
      reasonCodes: sideEffectReasonCodes,
    },
  };
  return DecisionObservabilityV1Schema.parse(reconciled);
}
