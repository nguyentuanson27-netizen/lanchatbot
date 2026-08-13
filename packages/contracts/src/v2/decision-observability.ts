import { z } from "zod";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const ReasonCodeSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Z][A-Z0-9_.:-]*$/u);
const ReasonCodesSchema = z.array(ReasonCodeSchema).max(20);

export const DialogueEvidenceSourceV1Schema = z.enum([
  "NONE",
  "DETERMINISTIC_RUNTIME",
  "MODEL_STRUCTURED_OUTPUT",
  "HYBRID_RUNTIME",
]);

export const DialogueEvidenceV1Schema = z.object({
  source: DialogueEvidenceSourceV1Schema,
  codes: z.array(ReasonCodeSchema).max(16),
  evidenceHash: Sha256Schema.nullable(),
}).strict().superRefine((value, context) => {
  const absent = value.codes.length === 0 && value.evidenceHash === null;
  if ((value.source === "NONE") !== absent) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "NONE dialogue evidence must not carry codes or a hash",
    });
  }
});

export const BuyingIntentDecisionV1Schema = z.enum([
  "NONE",
  "CONSIDERING",
  "COMMITTED",
  "NEGATED",
]);

export const BuyingIntentRequestedActionV1Schema = z.enum([
  "NONE",
  "OPEN_CART",
  "ADD_TO_CART",
  "SET_QUANTITY",
  "PROCEED_TO_PAYMENT",
]);

export const BuyingIntentObservationV1Schema = z.object({
  authorityVersion: z.literal("HYBRID_BUYING_INTENT_V1"),
  decision: BuyingIntentDecisionV1Schema,
  source: z.enum([
    "DETERMINISTIC",
    "MODEL_STRUCTURED_OUTPUT",
    "HYBRID_RUNTIME",
  ]).nullable(),
  requestedAction: BuyingIntentRequestedActionV1Schema,
  quantity: z.number().int().min(1).max(20).nullable(),
  confidenceBand: z.enum(["UNKNOWN", "LOW", "MEDIUM", "HIGH"]),
  evidenceReasonCodes: z.array(ReasonCodeSchema).max(16),
  evidenceHash: Sha256Schema.nullable(),
}).strict().superRefine((value, context) => {
  if (value.decision === "NONE") {
    if (
      value.source !== null ||
      value.requestedAction !== "NONE" ||
      value.quantity !== null ||
      value.evidenceReasonCodes.length > 0 ||
      value.evidenceHash !== null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NONE buying intent must not carry authority evidence or action",
      });
    }
    return;
  }
  if (value.source === null || value.evidenceHash === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "observed buying intent requires a source and evidence hash",
    });
  }
  if (
    value.decision !== "COMMITTED" &&
    (value.requestedAction !== "NONE" || value.quantity !== null)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "only committed buying intent may carry a requested action or quantity",
    });
  }
});

export const ProtectedClaimTypeV1Schema = z.enum([
  "PRICE",
  "STOCK",
  "SIZE_FIT",
  "ETA",
  "SHIPPING_FEE",
  "FREESHIP",
  "PROMOTION_OFFER",
  "PRODUCT_MEDIA",
]);

export const ProtectedClaimValidationV1Schema = z.object({
  verifierVersion: z.literal("LEGACY_GUARD_V1"),
  outcome: z.enum([
    "NOT_EVALUATED",
    "NO_PROTECTED_CLAIMS",
    "VALIDATED",
    "PARTIALLY_BLOCKED",
    "BLOCKED",
  ]),
  claimTypes: z.array(ProtectedClaimTypeV1Schema).max(8),
  validatedCount: z.number().int().nonnegative().max(8),
  rejectedCount: z.number().int().nonnegative().max(8),
  reasonCodes: ReasonCodesSchema,
}).strict().superRefine((value, context) => {
  if (value.validatedCount + value.rejectedCount > value.claimTypes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "claim validation counts cannot exceed the bounded claim types",
    });
  }
  if (
    (value.outcome === "NOT_EVALUATED" ||
      value.outcome === "NO_PROTECTED_CLAIMS") &&
    (value.validatedCount !== 0 || value.rejectedCount !== 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "unvalidated claim observations cannot report validated counts",
    });
  }
  if (
    value.outcome === "VALIDATED" &&
    (value.validatedCount !== value.claimTypes.length || value.rejectedCount !== 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "VALIDATED requires every declared protected claim type to pass",
    });
  }
  if (value.outcome === "BLOCKED" && value.rejectedCount === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "BLOCKED protected claims require a rejected count",
    });
  }
});

export const ReadinessObservationV1Schema = z.object({
  rulesetVersion: z.literal("LEGACY_READINESS_OBSERVATION_V1"),
  outcome: z.enum([
    "NOT_EVALUATED",
    "LEGACY_READY",
    "LEGACY_NOT_READY",
  ]),
  productScope: z.enum([
    "NOT_REQUIRED",
    "UNRESOLVED",
    "RESOLVED",
    "AMBIGUOUS",
    "STALE",
  ]),
  reasonCodes: ReasonCodesSchema,
}).strict();

export const ObservedConversationPhaseV1Schema = z.enum([
  "NOT_EVALUATED",
  "DISCOVERY",
  "PRODUCT_MATCHED",
  "FACTS_PRESENTED",
  "FIT_CONSULTING",
  "MEASUREMENTS_REQUIRED",
  "SIZE_RECOMMENDED",
  "OBJECTION_HANDLING",
  "READY_TO_BUY",
  "CART_OPEN",
  "ORDER_REVIEW",
  "ORDER_PREVIEW",
  "PURCHASE_CONFIRMED",
  "HANDED_OFF",
  "POST_SALE",
]);

export const ObservedBarrierV1Schema = z.enum([
  "NOT_EVALUATED",
  "NONE",
  "BARRIER_PRICE",
  "BARRIER_FIT",
  "BARRIER_MATERIAL",
  "BARRIER_TRUST",
  "BARRIER_DELIVERY",
  "CHOICE_OVERLOAD",
]);

export const PhaseBarrierObservationV1Schema = z.object({
  contractVersion: z.literal("LEGACY_PHASE_BARRIER_OBSERVATION_V1"),
  phase: ObservedConversationPhaseV1Schema,
  phaseSource: z.enum([
    "NONE",
    "LEGACY_CONVERSATION_STAGE_V1",
    "SALES_CYCLE_STAGE_V1",
  ]),
  barrier: ObservedBarrierV1Schema,
  barrierSource: z.enum(["NONE", "WAVE2_STRATEGY_V1"]),
}).strict().superRefine((value, context) => {
  if ((value.phase === "NOT_EVALUATED") !== (value.phaseSource === "NONE")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "phase source must identify whether the legacy phase was evaluated",
    });
  }
  if (
    (value.barrier === "NOT_EVALUATED") !== (value.barrierSource === "NONE")
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "barrier source must identify whether the barrier was evaluated",
    });
  }
});

export const ContextObservationV1Schema = z.object({
  schemaVersion: z.literal(1),
  contextVersion: z.literal("LEGACY_CONTEXT_V1"),
}).strict();

export const ObservedStrategyV1Schema = z.enum([
  "NONE",
  "STRATEGY_RECOMMEND_PRODUCT",
  "STRATEGY_SHOW_PROOF",
  "STRATEGY_ANSWER_OBJECTION",
  "STRATEGY_ASK_CLARIFY",
  "STRATEGY_CLOSE",
]);

export const ObservedCtaV1Schema = z.enum([
  "NONE",
  "ASK_OCCASION",
  "ASK_STYLE",
  "ASK_BUDGET",
  "ASK_MEASUREMENTS",
  "ASK_PROOF_PREFERENCE",
  "REDUCE_TO_TWO",
  "POST_MEDIA_CLOSE",
  "NO_ADDITIONAL_CTA",
]);

export const StrategyCtaObservationV1Schema = z.object({
  rulesetVersion: z.enum(["NONE", "WAVE2_STRATEGY_V1"]),
  strategy: ObservedStrategyV1Schema,
  cta: ObservedCtaV1Schema,
  source: z.enum([
    "NONE",
    "DETERMINISTIC_RUNTIME",
    "MODEL_WITH_DETERMINISTIC_POLICY",
  ]),
}).strict().superRefine((value, context) => {
  const absent = value.rulesetVersion === "NONE" &&
    value.strategy === "NONE" && value.cta === "NONE" && value.source === "NONE";
  if ((value.strategy === "NONE") !== absent) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "absent strategy/CTA observations must be consistently NONE",
    });
  }
});

export const ReconciliationObservationV1Schema = z.object({
  contractVersion: z.literal("BF01_RECONCILIATION_V1"),
  outcome: z.enum(["NOT_APPLIED", "PRESERVED", "OVERRIDDEN", "REJECTED"]),
  reasonCodes: ReasonCodesSchema,
}).strict();

export const GuardObservationV1Schema = z.object({
  contractVersion: z.literal("AGENT_PROPOSAL_GUARD_V1"),
  outcome: z.enum(["NOT_EVALUATED", "ALLOWED", "BLOCKED"]),
  reasonCodes: ReasonCodesSchema,
  planHash: Sha256Schema.nullable(),
}).strict().superRefine((value, context) => {
  if ((value.outcome === "NOT_EVALUATED") !== (value.planHash === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "evaluated guards require the bounded guarded-plan hash",
    });
  }
});

export const SideEffectTypeV1Schema = z.enum([
  "META_OUTBOX",
  "PANCAKE_TAG_OUTBOX",
  "CONVERSATION_STATE",
  "SALES_CYCLE_STATE",
  "CART",
  "ORDER",
  "HANDOFF",
  "ROUTING",
  "NETWORK",
]);

export const SideEffectPlanObservationV1Schema = z.object({
  contractVersion: z.literal("REALTIME_COMMIT_PLAN_V1"),
  disposition: z.enum([
    "NONE",
    "PLANNED",
    "SAFE_FALLBACK_PLANNED",
    "BLOCKED",
  ]),
  effectTypes: z.array(SideEffectTypeV1Schema).max(9),
  reasonCodes: ReasonCodesSchema,
}).strict().superRefine((value, context) => {
  if ((value.disposition === "NONE") !== (value.effectTypes.length === 0)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "NONE side-effect disposition must have no planned effect types",
    });
  }
});

export const DecisionObservabilityV1Schema = z.object({
  schemaVersion: z.literal(1),
  dialogueEvidence: DialogueEvidenceV1Schema,
  buyingIntent: BuyingIntentObservationV1Schema,
  protectedClaimValidation: ProtectedClaimValidationV1Schema,
  readiness: ReadinessObservationV1Schema,
  phaseBarrier: PhaseBarrierObservationV1Schema,
  context: ContextObservationV1Schema,
  strategyCta: StrategyCtaObservationV1Schema,
  reconciliation: ReconciliationObservationV1Schema,
  guard: GuardObservationV1Schema,
  sideEffectPlan: SideEffectPlanObservationV1Schema,
}).strict();

export type DecisionObservabilityV1 = z.infer<
  typeof DecisionObservabilityV1Schema
>;
