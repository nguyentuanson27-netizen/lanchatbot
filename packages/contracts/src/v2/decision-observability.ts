import { z } from "zod";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

function registeredCodeSchema(
  registryName: string,
  values: readonly string[],
) {
  const registry = new Set(values);
  return z.string().refine((value) => registry.has(value), {
    message: `expected a registered ${registryName} code`,
  });
}

export const DECISION_DIALOGUE_EVIDENCE_CODES_V1 = [
  "DIRECT_PURCHASE_VERB",
  "SHIP_REQUEST",
  "CONFIRMED_SIZE",
  "CONFIRMED_COLOR",
  "COMPONENT_SELECTION",
  "MODEL_BUYING_COMMITTED",
  "TEXT_OCCASION",
  "TEXT_STYLE",
  "TEXT_BUDGET",
  "TEXT_PRICE_OBJECTION",
  "TEXT_FIT_OBJECTION",
  "TEXT_MATERIAL_OBJECTION",
  "TEXT_TRUST_OBJECTION",
  "TEXT_DELIVERY_OBJECTION",
  "TEXT_CHOICE_OVERLOAD",
  "STATE_OBJECTION",
  "STATE_PRODUCT_MATCHED",
  "STATE_BUYING_SIGNAL",
  "STATE_MEASUREMENTS_PRESENT",
  "REQUESTED_MATERIAL_PROOF",
  "REQUESTED_SOCIAL_PROOF",
  "MODEL_ANALYSIS_ACCEPTED",
  "DETERMINISTIC_FALLBACK",
] as const;

export const DECISION_BUYING_INTENT_EVIDENCE_CODES_V1 = [
  "DIRECT_PURCHASE_VERB",
  "SHIP_REQUEST",
  "CONFIRMED_SIZE",
  "CONFIRMED_COLOR",
  "COMPONENT_SELECTION",
  "MODEL_BUYING_COMMITTED",
] as const;

export const DECISION_GUARD_REASON_CODES_V1 = [
  "INVALID_AGENT_PROPOSAL",
  "NO_REPLY_OVERRIDE_BUYING_SIGNAL",
  "PREMATURE_ORDER_INFO_REQUEST",
  "UNVERIFIED_PRODUCT",
  "RAW_URL_IN_TEXT",
  "UNVERIFIED_ATTACHMENT",
  "UNAUTHORIZED_PRICE",
  "UNAUTHORIZED_STOCK",
  "UNAUTHORIZED_ETA",
  "UNAUTHORIZED_PROMOTION",
  "UNAUTHORIZED_FREESHIP",
  "UNAUTHORIZED_SHIP_FEE",
  "SIZE_RECOMMENDATION_CLAIM_REQUIRED",
  "SIZE_RECOMMENDATION_UNDECLARED",
  "SIZE_RECOMMENDATION_MISSING_PROVENANCE",
  "SIZE_RECOMMENDATION_SOURCE_INVALID",
  "SIZE_RECOMMENDATION_EVIDENCE_BASIS_INVALID",
  "SIZE_RECOMMENDATION_PRODUCT_SCOPE_MISMATCH",
  "SIZE_RECOMMENDATION_VARIANT_SCOPE_MISMATCH",
  "SIZE_RECOMMENDATION_MEASUREMENT_SCOPE_MISMATCH",
  "SIZE_RECOMMENDATION_STALE",
  "SIZE_RECOMMENDATION_VALUE_MISMATCH",
] as const;

export const DECISION_RECONCILIATION_REASON_CODES_V1 = [
  "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED",
  "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
  "BF01_MODEL_CLARIFICATION_REPAIR",
  "BF01_APPROVED_FALLBACK_USED",
  "BF01_REPAIR_QUOTA_UNAVAILABLE",
] as const;

const PRE_SALE_POLICY_REASON_CODES = [
  "EXCHANGE_AND_RETURN",
  "EXCHANGE_SIZE",
  "EXCHANGE_COLOR",
  "EXCHANGE_MODEL",
  "RETURN_AND_REFUND",
  "TRY_ON",
  "REFUSED_PARCEL_FEE",
  "SHIPPING_FEE",
  "DELIVERY_TIME",
  "SHOPEE_PRICE",
  "IMAGE_ACCURACY",
  "WASHING_CARE",
  "UNSUPPORTED_POLICY",
].map((intent) => `PRE_SALE_POLICY_${intent}`);

const IMAGE_REQUEST_REASON_CODES = [
  "FEEDBACK",
  "DETAIL",
  "BACK",
  "SIZE_GUIDE",
  "PRODUCT_ONLY",
  "GENERIC",
].map((intent) => `IMAGE_REQUEST_${intent}`);

const IMAGE_SELECTION_REASON_CODES = [
  "NO_FEEDBACK_IMAGE_AVAILABLE",
  "NO_IMAGE_FOR_DETAIL",
  "NO_IMAGE_FOR_BACK",
  "NO_IMAGE_FOR_SIZE_GUIDE",
  "NO_IMAGE_FOR_PRODUCT_ONLY",
  "NO_IMAGE_FOR_GENERIC",
  "AMBIGUOUS_COMPONENT",
  "COMPONENT_NOT_FOUND",
  "MEDIA_FACTS_STALE",
  "NO_VERIFIED_MEDIA",
];

const MEDIA_COUNT_REASON_CODES = Array.from(
  { length: 11 },
  (_, total) => Array.from({ length: total + 1 }, (_, count) => [
    `MEDIA_USABLE_${count}_OF_${total}`,
    `MEDIA_UNCERTAIN_${count}_OF_${total}`,
    `MEDIA_UNUSABLE_${count}_OF_${total}`,
  ]).flat(),
).flat();

export const DECISION_CUSTOMER_URL_REASON_CODES_V1 = [
  "CUSTOMER_URL_APPROVED_FIRST_PARTY_PRODUCT",
  "CUSTOMER_URL_APPROVED_SHOP_CDN",
  "CUSTOMER_URL_CREDENTIALS_FORBIDDEN",
  "CUSTOMER_URL_DECEPTIVE_HOST",
  "CUSTOMER_URL_EXPLANATION_BOUNDARY_INVALID",
  "CUSTOMER_URL_EXPLANATION_LENGTH_INVALID",
  "CUSTOMER_URL_EXPLANATION_MODEL_FAILED",
  "CUSTOMER_URL_EXPLANATION_MODEL_UNAVAILABLE",
  "CUSTOMER_URL_EXPLANATION_QUOTA_DENIED",
  "CUSTOMER_URL_EXPLANATION_RAW_URL",
  "CUSTOMER_URL_EXPLANATION_SAFETY_INVALID",
  "CUSTOMER_URL_EXPLANATION_UNVERIFIED_CLAIM",
  "CUSTOMER_URL_HTTPS_REQUIRED",
  "CUSTOMER_URL_INVALID",
  "CUSTOMER_URL_LIMIT_EXCEEDED",
  "CUSTOMER_URL_MEDIA_NOT_VERIFIED",
  "CUSTOMER_URL_MIXED_TRUST",
  "CUSTOMER_URL_MULTI_PRODUCT_POLICY_REQUIRED",
  "CUSTOMER_URL_PATH_NOT_APPROVED",
  "CUSTOMER_URL_PORT_FORBIDDEN",
  "CUSTOMER_URL_PRIVATE_ADDRESS",
  "CUSTOMER_URL_PRODUCT_NOT_FOUND",
  "CUSTOMER_URL_QUERY_FORBIDDEN",
  "CUSTOMER_URL_RESIDUAL_PRODUCT_UNRESOLVED",
  "CUSTOMER_URL_SAFE_EXPLANATION_FALLBACK",
  "CUSTOMER_URL_SAFE_EXPLANATION_SENT",
  "CUSTOMER_URL_SCHEME_FORBIDDEN",
  "CUSTOMER_URL_STRICT_BLOCK_ALL",
  "CUSTOMER_URL_UNSUPPORTED_EXTERNAL",
] as const;

export const DECISION_SIDE_EFFECT_REASON_CODES_V1 = [
  ...DECISION_GUARD_REASON_CODES_V1,
  ...DECISION_RECONCILIATION_REASON_CODES_V1,
  ...PRE_SALE_POLICY_REASON_CODES,
  ...IMAGE_REQUEST_REASON_CODES,
  ...IMAGE_SELECTION_REASON_CODES,
  ...MEDIA_COUNT_REASON_CODES,
  ...DECISION_CUSTOMER_URL_REASON_CODES_V1,
  "MEDIA_INPUT_LIMIT_EXCEEDED",
  "PRE_SALE_POLICY_UNAVAILABLE",
  "MEDIA_CLARIFICATION_EXHAUSTED",
  "MEDIA_CLARIFICATION_EXPLICIT_CODE",
  "MEDIA_CLARIFICATION_SELECTED",
  "MEDIA_CLARIFICATION_REJECTED",
  "MEDIA_CLARIFICATION_UNRESOLVED",
  "MEDIA_CLARIFICATION_REQUIRED",
  "MEDIA_PARTIAL_MATCHES_PRESERVED",
  "MEDIA_UNCERTAIN_RATIO_EXCEEDED",
  "MEDIA_NO_USABLE_ASSET",
  "MULTI_PRODUCT_CANDIDATE_LIMIT_EXCEEDED",
  "MULTI_PRODUCT_SELECTION_REQUIRED",
  "MULTI_PRODUCT_CLARIFICATION_MODEL_UNAVAILABLE",
  "MULTI_PRODUCT_CLARIFICATION_QUOTA_DENIED",
  "MULTI_PRODUCT_CLARIFICATION_MODEL_FAILED",
  "MULTI_PRODUCT_CLARIFICATION_REJECTED",
  "MULTI_PRODUCT_UNVERIFIED_PRODUCT",
  "MULTI_PRODUCT_DRAFT_BOUNDARY_INVALID",
  "MULTI_PRODUCT_CANDIDATE_OMITTED",
  "MULTI_PRODUCT_UNVERIFIED_COMMERCIAL_CLAIM",
  "PRODUCT_UNRESOLVED_REQUIRES_HANDOFF",
  "MULTI_FACT_UNAVAILABLE_REQUIRES_HANDOFF",
  "MULTI_FACT_REPLY_EMPTY",
  "MULTI_PRODUCT_FACT_UNAVAILABLE",
  "GROUNDED_SCHEMA_INVALID",
  "GROUNDED_DRAFT_FALLBACK",
  "VERIFIED_FACTS_UNAVAILABLE",
  "CROSS_PRODUCT_FACT_BLOCKED",
  "REQUESTED_FACT_BLOCK_UNAVAILABLE",
  "MODEL_URL_IN_ADVISORY",
  "MODEL_FACT_IN_ADVISORY",
  "GROUNDED_IMAGE_INDEX_OUT_OF_RANGE",
  "LEGACY_UNACCENTED_REPLY_REPLACED",
  "SIZE_RECOMMENDATION_REPAIRED",
  "SIZE_RECOMMENDATION_REPAIR_UNAVAILABLE",
  "SIZE_RECOMMENDATION_REPAIR_FAILED",
  "SIZE_CHART_POLICY_BUNDLE_UNAVAILABLE",
  "SIZE_CHART_POLICY_BUNDLE_STALE",
  "SIZE_CHART_POLICY_BUNDLE_PARSE_FAILED",
  "SIZE_CHART_POLICY_BUNDLE_INTEGRITY_FAILED",
  "SIZE_CHART_PUBLISHED_ARTIFACT_MISSING",
  "SIZE_CHART_ARTIFACT_NOT_PUBLISHED",
  "SIZE_CHART_ARTIFACT_UNVERIFIED",
  "SIZE_CHART_MEASUREMENT_BASIS_UNSUPPORTED",
  "SIZE_CHART_SCOPE_MISMATCH",
  "POLICY_ARTIFACT_SCHEMA_INVALID",
  "POLICY_CONTENT_HASH_MISMATCH",
  "POLICY_LIFECYCLE_INVALID",
  "POLICY_POINTER_SCOPE_DUPLICATE",
  "POLICY_POINTER_VERSION_MISMATCH",
  "NO_VERIFIED_SIZE_CHART_FOR_SCOPE",
  "MISSING_REQUIRED_CHART_MEASUREMENTS",
  "NO_USABLE_BODY_DATA_OR_PAST_SIZE",
  "PROFILE_OUTSIDE_VERIFIED_CHART",
  "BOUNDARY_REQUIRES_CUSTOMER_FIT_PREFERENCE",
  "MEASUREMENTS_MATCHES_VERIFIED_CHART",
  "BODY_PROFILE_MATCHES_VERIFIED_CHART",
  "PAST_SIZE_MATCHES_VERIFIED_CHART",
  "FIT_PREFERENCE_FITTED",
  "FIT_PREFERENCE_RELAXED",
  "BOUNDARY_POLICY_PREFER_SMALLER_SIZE",
  "BOUNDARY_POLICY_PREFER_LARGER_SIZE",
  "CLARIFICATION_RETRY_EXHAUSTED",
  "CHECKOUT_DETAILS_MISSING",
  "CLARIFICATION_REQUEST_INVALID",
  "CLARIFICATION_RETRY_INVALID",
  "CLARIFICATION_NOT_ACTIVE",
  "CLARIFICATION_RESOLVE_REJECTED",
  "ORDER_PREVIEW_STATE_INVALID",
  "PURCHASE_CONFIRMATION_REJECTED",
  "PURCHASE_CONFIRMED",
  "CART_REMOVE_FAILED",
  "NEGOTIATION_STATE_MISSING",
  "NEGOTIATION_FAILED",
  "CHECKOUT_DETAILS_REJECTED",
  "CHECKOUT_DRAFT_INCOMPLETE",
  "BANK_TRANSFER_POLICY_UNAVAILABLE",
  "CART_READY_REJECTED",
  "CHECKOUT_REVALIDATION_UNAVAILABLE",
  "ORDER_PREVIEW_REJECTED",
  "CART_QUANTITY_CHANGE_FAILED",
  "CART_ADD_FAILED",
  "SALES_STAGE_NOT_READY_FOR_CART",
  "CART_OPEN_FAILED",
  "CATALOG_SNAPSHOT_INVALID",
  "CATALOG_SELECTION_IDENTITY_INVALID",
  "CATALOG_TIMESTAMP_FROM_FUTURE",
  "CATALOG_PRICE_STALE",
  "CART_OFFER_NOT_FOUND",
  "CART_SIZE_REQUIRED",
  "CART_SIZE_NOT_FOUND",
  "CART_COLOR_REQUIRED",
  "CART_COLOR_NOT_FOUND",
  "CART_VARIANT_AMBIGUOUS",
  "CART_PRICE_NOT_FOUND",
  "CART_VARIANT_OUT_OF_STOCK",
  "CART_QUANTITY_EXCEEDS_STOCK",
  "CART_BOM_INVALID",
  "CART_ETA_UNAVAILABLE",
  "PRICE_CHANGED_BEFORE_CONFIRMATION",
  "STOCK_CHANGED_BEFORE_CONFIRMATION",
  "SIZE_CHANGED_BEFORE_CONFIRMATION",
  "ETA_CHANGED_BEFORE_CONFIRMATION",
  "PRICE_UNAVAILABLE",
  "STOCK_UNAVAILABLE",
  "SIZE_RULE_UNAVAILABLE",
  "ETA_UNAVAILABLE",
  "POLICY_UNAVAILABLE",
  "PAYMENT_RECEIPT_REVIEW_REQUIRED",
] as const;

const DialogueEvidenceCodeSchema = registeredCodeSchema(
  "dialogue evidence",
  DECISION_DIALOGUE_EVIDENCE_CODES_V1,
);
const BuyingIntentEvidenceCodeSchema = registeredCodeSchema(
  "buying intent evidence",
  DECISION_BUYING_INTENT_EVIDENCE_CODES_V1,
);
const GuardReasonCodeSchema = registeredCodeSchema(
  "guard reason",
  DECISION_GUARD_REASON_CODES_V1,
);
const ReconciliationReasonCodeSchema = registeredCodeSchema(
  "reconciliation reason",
  DECISION_RECONCILIATION_REASON_CODES_V1,
);
const SideEffectReasonCodeSchema = registeredCodeSchema(
  "side-effect reason",
  DECISION_SIDE_EFFECT_REASON_CODES_V1,
);

const GuardReasonCodesSchema = z.array(GuardReasonCodeSchema).max(20);
const ReconciliationReasonCodesSchema = z
  .array(ReconciliationReasonCodeSchema)
  .max(20);
const SideEffectReasonCodesSchema = z.array(SideEffectReasonCodeSchema).max(20);

export const DialogueEvidenceSourceV1Schema = z.enum([
  "NONE",
  "DETERMINISTIC_RUNTIME",
  "MODEL_STRUCTURED_OUTPUT",
  "HYBRID_RUNTIME",
]);

export const DialogueEvidenceV1Schema = z.object({
  source: DialogueEvidenceSourceV1Schema,
  codes: z.array(DialogueEvidenceCodeSchema).max(16),
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
  authorityVersion: z.enum([
    "HYBRID_BUYING_INTENT_V1",
    "CANONICAL_BUYING_INTENT_V1",
  ]),
  decision: BuyingIntentDecisionV1Schema,
  source: z.enum([
    "DETERMINISTIC",
    "MODEL_STRUCTURED_OUTPUT",
    "HYBRID_RUNTIME",
  ]).nullable(),
  requestedAction: BuyingIntentRequestedActionV1Schema,
  quantity: z.number().int().min(1).max(20).nullable(),
  confidenceBand: z.enum(["UNKNOWN", "LOW", "MEDIUM", "HIGH"]),
  evidenceReasonCodes: z.array(BuyingIntentEvidenceCodeSchema).max(16),
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
  canonicalClaimCount: z.number().int().nonnegative().max(16).optional(),
  canonicalClaimSetHash: Sha256Schema.nullable().optional(),
  reasonCodes: GuardReasonCodesSchema,
}).strict().superRefine((value, context) => {
  const uniqueClaimCount = new Set(value.claimTypes).size;
  if (uniqueClaimCount !== value.claimTypes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["claimTypes"],
      message: "protected claim types must be unique",
    });
  }
  if (value.validatedCount + value.rejectedCount !== value.claimTypes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "claim validation counts must account for every claim type once",
    });
  }
  if (
    (value.outcome === "NOT_EVALUATED" ||
      value.outcome === "NO_PROTECTED_CLAIMS") &&
    (value.claimTypes.length !== 0 ||
      value.validatedCount !== 0 ||
      value.rejectedCount !== 0 ||
      value.reasonCodes.length !== 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "unvalidated claim observations must remain empty",
    });
  }
  if (
    value.outcome === "VALIDATED" &&
    (value.claimTypes.length === 0 ||
      value.validatedCount !== value.claimTypes.length ||
      value.rejectedCount !== 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "VALIDATED requires at least one declared protected claim type and every claim to pass",
    });
  }
  if (
    value.outcome === "PARTIALLY_BLOCKED" &&
    (value.validatedCount === 0 || value.rejectedCount === 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "PARTIALLY_BLOCKED requires both validated and rejected claims",
    });
  }
  if (
    value.outcome === "BLOCKED" &&
    (value.validatedCount !== 0 ||
      value.rejectedCount !== value.claimTypes.length ||
      value.rejectedCount === 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "BLOCKED requires every protected claim type to be rejected",
    });
  }
});

export const ReadinessObservationV1Schema = z.object({
  rulesetVersion: z.enum([
    "LEGACY_READINESS_OBSERVATION_V1",
    "DETERMINISTIC_EFFECT_READINESS_V1",
  ]),
  outcome: z.enum([
    "NOT_EVALUATED",
    "LEGACY_READY",
    "LEGACY_NOT_READY",
    "READY",
    "BLOCKED",
  ]),
  productScope: z.enum([
    "NOT_REQUIRED",
    "UNRESOLVED",
    "RESOLVED",
    "AMBIGUOUS",
    "STALE",
  ]),
  reasonCodes: GuardReasonCodesSchema,
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
  const present = value.rulesetVersion === "WAVE2_STRATEGY_V1" &&
    value.strategy !== "NONE" && value.source !== "NONE";
  if (!absent && !present) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "strategy/CTA observations must be consistently absent or authoritative",
    });
  }
});

export const ReconciliationObservationV1Schema = z.object({
  contractVersion: z.literal("BF01_RECONCILIATION_V1"),
  outcome: z.enum(["NOT_APPLIED", "PRESERVED", "OVERRIDDEN", "REJECTED"]),
  reasonCodes: ReconciliationReasonCodesSchema,
}).strict();

export const GuardObservationV1Schema = z.object({
  contractVersion: z.literal("AGENT_PROPOSAL_GUARD_V1"),
  outcome: z.enum(["NOT_EVALUATED", "ALLOWED", "BLOCKED"]),
  reasonCodes: GuardReasonCodesSchema,
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
  reasonCodes: SideEffectReasonCodesSchema,
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
