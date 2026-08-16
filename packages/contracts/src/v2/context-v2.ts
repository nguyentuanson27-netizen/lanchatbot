import { z } from "zod";
import {
  CanonicalProductIdV1Schema,
} from "./canonical-identifiers.js";
import {
  ProtectedClaimTypeV1Schema,
} from "./decision-observability.js";
import {
  DECISION_DIALOGUE_EVIDENCE_CODES_V1,
} from "./decision-observability.js";
import { ProtectedClaimV1Schema } from "./canonical-evidence-readiness.js";
import { SalesCycleStageV1Schema } from "../v3/sales-cycle.js";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const BoundedReasonCodeSchema = z.string().regex(/^[A-Z0-9][A-Z0-9_.:-]{0,127}$/u);

export const ConversationPhaseV2ValueSchema = z.enum([
  "DISCOVERY",
  "PRODUCT_EVALUATION",
  "FIT_CONSULTATION",
  "CART_ACTIVE",
  "ORDER_REVIEW",
  "ORDER_CONFIRMED",
]);
export type ConversationPhaseV2Value = z.infer<
  typeof ConversationPhaseV2ValueSchema
>;

export const ConversationPhaseV2Schema = z.object({
  schemaVersion: z.literal(2),
  contractVersion: z.literal("CONVERSATION_PHASE_V2"),
  phase: ConversationPhaseV2ValueSchema,
  source: z.literal("CANONICAL_COMMERCE_STATE_V1"),
  sourceStage: SalesCycleStageV1Schema,
  salesCycleRevision: z.number().int().nonnegative(),
  authority: z.literal("SHADOW_ONLY"),
}).strict();
export type ConversationPhaseV2 = z.infer<typeof ConversationPhaseV2Schema>;

export interface DeriveConversationPhaseV2Input {
  readonly commerceStage: z.infer<typeof SalesCycleStageV1Schema>;
  readonly hasCart: boolean;
  readonly hasPreview: boolean;
  readonly hasConfirmation: boolean;
  readonly salesCycleRevision: number;
}

function assertCommerceArtifacts(
  input: DeriveConversationPhaseV2Input,
): void {
  const invalid =
    (input.hasConfirmation && (!input.hasPreview || !input.hasCart)) ||
    (input.hasPreview && !input.hasCart) ||
    (input.commerceStage === "ORDER_PREVIEW" && !input.hasPreview) ||
    (input.commerceStage === "PURCHASE_CONFIRMED" && !input.hasConfirmation) ||
    (input.commerceStage === "CART_OPEN" && !input.hasCart);
  if (invalid) throw new Error("CONVERSATION_PHASE_V2_STATE_INVALID");
}

/**
 * Pure projection of canonical commerce state. It deliberately accepts no
 * transcript, regex-stage, Wave 2 barrier, ownership or handoff input.
 */
export function deriveConversationPhaseV2(
  input: DeriveConversationPhaseV2Input,
): ConversationPhaseV2 {
  assertCommerceArtifacts(input);
  const phase: ConversationPhaseV2Value = input.hasConfirmation
    ? "ORDER_CONFIRMED"
    : input.hasPreview
      ? "ORDER_REVIEW"
      : input.commerceStage === "CART_OPEN" || input.hasCart
        ? "CART_ACTIVE"
        : input.commerceStage === "MEASUREMENTS_REQUIRED" ||
            input.commerceStage === "SIZE_RECOMMENDED"
          ? "FIT_CONSULTATION"
          : input.commerceStage === "FACTS_PRESENTED"
            ? "PRODUCT_EVALUATION"
            : "DISCOVERY";
  return ConversationPhaseV2Schema.parse({
    schemaVersion: 2,
    contractVersion: "CONVERSATION_PHASE_V2",
    phase,
    source: "CANONICAL_COMMERCE_STATE_V1",
    sourceStage: input.commerceStage,
    salesCycleRevision: input.salesCycleRevision,
    authority: "SHADOW_ONLY",
  });
}

export const ConversationBarrierV2ValueSchema = z.enum([
  "PRODUCT_CONTEXT_UNREADY",
  "VERIFIED_CLAIMS_UNREADY",
  "MEASUREMENTS_REQUIRED",
  "CART_STATE_UNREADY",
  "CHECKOUT_DETAILS_REQUIRED",
  "EFFECT_READINESS_BLOCKED",
]);
export type ConversationBarrierV2Value = z.infer<
  typeof ConversationBarrierV2ValueSchema
>;

const ProductScopeV2Schema = z.enum([
  "NOT_REQUIRED",
  "UNRESOLVED",
  "RESOLVED",
  "AMBIGUOUS",
  "STALE",
]);

export const ConversationBarriersV2Schema = z.object({
  schemaVersion: z.literal(2),
  contractVersion: z.literal("CONVERSATION_BARRIERS_V2"),
  active: z.array(ConversationBarrierV2ValueSchema).max(6),
  lifecycle: z.literal("UNTIL_AUTHORITATIVE_STATE_CHANGES"),
  conversationRevision: z.number().int().nonnegative(),
  salesCycleRevision: z.number().int().nonnegative().nullable(),
  source: z.literal("CANONICAL_EVIDENCE_AND_COMMERCE_STATE_V1"),
  authority: z.literal("SHADOW_ONLY"),
}).strict().superRefine((value, context) => {
  if (new Set(value.active).size !== value.active.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["active"],
      message: "active barriers must be unique",
    });
  }
});
export type ConversationBarriersV2 = z.infer<
  typeof ConversationBarriersV2Schema
>;

export interface DeriveConversationBarriersV2Input {
  readonly productScope: z.infer<typeof ProductScopeV2Schema>;
  readonly commerceStage: z.infer<typeof SalesCycleStageV1Schema>;
  readonly hasCart: boolean;
  readonly hasActiveClarification: boolean;
  readonly readiness: Readonly<{
    outcome: "NOT_EVALUATED" | "READY" | "BLOCKED";
    reasonCodes: readonly string[];
  }>;
  readonly conversationRevision: number;
  readonly salesCycleRevision: number | null;
}

const CLAIM_READINESS_CODE = /(?:CLAIM|PRICE|STOCK|SIZE|ETA|POLICY|FACT)/u;

/**
 * Finite barriers are recomputed from the current authoritative snapshot.
 * They are not persisted as an FSM and disappear as soon as their typed input
 * is resolved. Handoff/ownership is intentionally outside this contract.
 */
export function deriveConversationBarriersV2(
  input: DeriveConversationBarriersV2Input,
): ConversationBarriersV2 {
  const active: ConversationBarrierV2Value[] = [];
  if (input.productScope === "UNRESOLVED" ||
      input.productScope === "AMBIGUOUS" ||
      input.productScope === "STALE") {
    active.push("PRODUCT_CONTEXT_UNREADY");
  }
  if (input.readiness.outcome === "BLOCKED") {
    active.push(
      input.readiness.reasonCodes.some((code) => CLAIM_READINESS_CODE.test(code))
        ? "VERIFIED_CLAIMS_UNREADY"
        : "EFFECT_READINESS_BLOCKED",
    );
  }
  if (input.commerceStage === "MEASUREMENTS_REQUIRED") {
    active.push("MEASUREMENTS_REQUIRED");
  }
  if ((input.commerceStage === "CART_OPEN" ||
      input.commerceStage === "ORDER_PREVIEW" ||
      input.commerceStage === "PURCHASE_CONFIRMED" ||
      input.commerceStage === "HANDED_OFF") && !input.hasCart) {
    active.push("CART_STATE_UNREADY");
  }
  if (input.hasActiveClarification) {
    active.push("CHECKOUT_DETAILS_REQUIRED");
  }
  return ConversationBarriersV2Schema.parse({
    schemaVersion: 2,
    contractVersion: "CONVERSATION_BARRIERS_V2",
    active,
    lifecycle: "UNTIL_AUTHORITATIVE_STATE_CHANGES",
    conversationRevision: input.conversationRevision,
    salesCycleRevision: input.salesCycleRevision,
    source: "CANONICAL_EVIDENCE_AND_COMMERCE_STATE_V1",
    authority: "SHADOW_ONLY",
  });
}

export const ContextV2Schema = z.object({
  schemaVersion: z.literal(2),
  contractVersion: z.literal("CONTEXT_V2"),
  authority: z.literal("SHADOW_ONLY"),
  sourceMessageIdHash: Sha256Schema,
  conversationRevision: z.number().int().nonnegative(),
  salesCycleRevision: z.number().int().nonnegative().nullable(),
  dialogueEvidence: z.object({
    act: z.enum([
      "QUESTION", "REQUEST", "CORRECTION", "CONFIRMATION", "REJECTION",
      "STATEMENT", "AMBIGUOUS",
    ]),
    confidenceBand: z.enum(["LOW", "MEDIUM", "HIGH"]),
    evidenceHash: Sha256Schema,
    reasonCodes: z.array(z.enum(DECISION_DIALOGUE_EVIDENCE_CODES_V1)).max(16),
  }).strict(),
  verifiedClaimSetHash: Sha256Schema.nullable(),
  verifiedClaimTypes: z.array(ProtectedClaimTypeV1Schema).max(8),
  verifiedClaims: z.array(ProtectedClaimV1Schema).max(32),
  phase: ConversationPhaseV2Schema,
  barriers: ConversationBarriersV2Schema,
  buyingIntent: z.object({
    decision: z.enum(["NONE", "CONSIDERING", "COMMITTED", "NEGATED"]),
    requestedAction: z.enum([
      "NONE", "OPEN_CART", "ADD_TO_CART", "SET_QUANTITY", "PROCEED_TO_PAYMENT",
    ]),
    productId: CanonicalProductIdV1Schema.nullable(),
    evidenceHash: Sha256Schema.nullable(),
  }).strict(),
  cartReadiness: z.object({
    effect: z.enum([
      "CART_OPEN", "CART_MUTATION", "CART_READY", "PREVIEW_READY",
      "PURCHASE_CONFIRMATION_READY",
    ]),
    outcome: z.enum(["READY", "BLOCKED"]),
    readinessHash: Sha256Schema,
    expiresAt: z.string().datetime(),
  }).strict().nullable(),
  ownership: z.object({
    owner: z.enum(["BOT", "HUMAN"]),
    handoffActive: z.boolean(),
    reasonCode: BoundedReasonCodeSchema.nullable(),
  }).strict().superRefine((value, context) => {
    if (value.handoffActive !== (value.owner === "HUMAN")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "handoff activity must remain a separate ownership observation",
      });
    }
  }),
  consumerContractVersions: z.object({
    strategy: z.literal("CONTEXT_V2_STRATEGY_INPUT_V1"),
    cta: z.literal("CONTEXT_V2_CTA_INPUT_V1"),
    postMedia: z.literal("CONTEXT_V2_POST_MEDIA_INPUT_V1"),
    outputInterpretation: z.literal("CONTEXT_V2_OUTPUT_INTERPRETATION_V1"),
    audit: z.literal("CONTEXT_V2_AUDIT_V1"),
  }).strict(),
  contextHash: Sha256Schema,
}).strict().superRefine((value, context) => {
  const claimTypes = [...new Set(value.verifiedClaims.map(({ type }) => type))].sort();
  if (JSON.stringify(claimTypes) !== JSON.stringify([...value.verifiedClaimTypes].sort())) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["verifiedClaimTypes"],
      message: "verified claim types must match the typed claim envelope",
    });
  }
  if ((value.verifiedClaims.length === 0) !== (value.verifiedClaimSetHash === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["verifiedClaimSetHash"],
      message: "verified claim set hash must identify whether claims are present",
    });
  }
  if (value.phase.salesCycleRevision !== value.salesCycleRevision ||
      value.barriers.salesCycleRevision !== value.salesCycleRevision ||
      value.barriers.conversationRevision !== value.conversationRevision) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Context V2 components must bind the same revisions",
    });
  }
});
export type ContextV2 = z.infer<typeof ContextV2Schema>;

