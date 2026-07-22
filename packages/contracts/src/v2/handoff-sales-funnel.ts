import { z } from "zod";

const Sha256ReferenceSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/, "expected a lowercase sha256: reference");

export const HandoffCategoryV2Schema = z.enum([
  "AFTER_SALES",
  "CUSTOMER_REQUESTED_HUMAN",
  "BUSINESS_FACT_UNAVAILABLE",
  "POLICY_UNAVAILABLE",
  "AMBIGUOUS_REQUEST",
  "SAFETY_OR_COMPLIANCE",
  "SYSTEM_FAILURE",
  "ADMIN_REQUEST",
]);
export type HandoffCategoryV2 = z.infer<typeof HandoffCategoryV2Schema>;

export const HandoffReasonV2Schema = z.enum([
  "AFTER_SALES_REQUEST",
  "ORDER_STATUS",
  "DELIVERY_TRACKING",
  "DELIVERY_DELAY",
  "CHANGE_DELIVERY_INFO",
  "CANCEL_ORDER",
  "PAYMENT_AFTER_ORDER",
  "EXCHANGE",
  "RETURN",
  "REFUND",
  "DEFECT",
  "WARRANTY",
  "WRONG_OR_MISSING_ITEM",
  "CUSTOMER_REQUESTED_HUMAN",
  "PRICE_UNAVAILABLE",
  "STOCK_UNAVAILABLE",
  "SIZE_RULE_UNAVAILABLE",
  "ETA_UNAVAILABLE",
  "PRICE_CHANGED_BEFORE_CONFIRMATION",
  "STOCK_CHANGED_BEFORE_CONFIRMATION",
  "SIZE_CHANGED_BEFORE_CONFIRMATION",
  "ETA_CHANGED_BEFORE_CONFIRMATION",
  "PAYMENT_RECEIPT_REVIEW_REQUIRED",
  "POLICY_UNAVAILABLE",
  "PRODUCT_AMBIGUOUS",
  "UNSUPPORTED_REQUEST",
  "SAFETY_OR_COMPLIANCE",
  "DEPENDENCY_FAILURE",
  "ADMIN_REQUEST",
]);
export type HandoffReasonV2 = z.infer<typeof HandoffReasonV2Schema>;

const AfterSalesHandoffReasons = new Set<HandoffReasonV2>([
  "AFTER_SALES_REQUEST",
  "ORDER_STATUS",
  "DELIVERY_TRACKING",
  "DELIVERY_DELAY",
  "CHANGE_DELIVERY_INFO",
  "CANCEL_ORDER",
  "PAYMENT_AFTER_ORDER",
  "EXCHANGE",
  "RETURN",
  "REFUND",
  "DEFECT",
  "WARRANTY",
  "WRONG_OR_MISSING_ITEM",
]);

export const HandoffCustomerMessagePolicyV2Schema = z.enum([
  "HOLDING_REPLY_THEN_HANDOFF",
  "SILENT_HANDOFF",
]);
export type HandoffCustomerMessagePolicyV2 = z.infer<
  typeof HandoffCustomerMessagePolicyV2Schema
>;

export const HandoffTagV2Schema = z.enum(["VAN_DON", "NHAN_VIEN"]);
export type HandoffTagV2 = z.infer<typeof HandoffTagV2Schema>;

export const HandoffEvidenceV2Schema = z
  .object({
    source: z.enum([
      "INBOUND_MESSAGE",
      "CONVERSATION_STATE",
      "BUSINESS_TOOL",
      "POLICY_ENGINE",
      "ADMIN_CONTROL",
    ]),
    referenceHash: Sha256ReferenceSchema,
    observedAt: z.string().datetime(),
  })
  .strict();
export type HandoffEvidenceV2 = z.infer<typeof HandoffEvidenceV2Schema>;

export const HandoffProvenanceV2Schema = z
  .object({
    decisionSource: z.enum(["DETERMINISTIC_RULE_ENGINE", "ADMIN_CONTROL"]),
    rulesetVersion: z.string().trim().min(1).max(128),
    evidence: z.array(HandoffEvidenceV2Schema).min(1).max(20),
  })
  .strict();
export type HandoffProvenanceV2 = z.infer<typeof HandoffProvenanceV2Schema>;

/**
 * Represents an actual handoff. The absence of this object means no handoff was
 * selected; consumers must not manufacture an empty/no-op handoff decision.
 */
export const HandoffDecisionV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    decisionId: z.string().uuid(),
    category: HandoffCategoryV2Schema,
    reason: HandoffReasonV2Schema,
    customerMessagePolicy: HandoffCustomerMessagePolicyV2Schema,
    customerMessages: z.array(z.string().trim().min(1).max(500)).max(1),
    tag: HandoffTagV2Schema,
    provenance: HandoffProvenanceV2Schema,
    decidedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((value, context) => {
    const isAfterSales = value.category === "AFTER_SALES";

    if (isAfterSales && !AfterSalesHandoffReasons.has(value.reason)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "AFTER_SALES handoff requires an after-sales reason",
      });
    }
    if (!isAfterSales && AfterSalesHandoffReasons.has(value.reason)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "after-sales reasons must use the AFTER_SALES category",
      });
    }

    if (isAfterSales) {
      if (value.customerMessagePolicy !== "HOLDING_REPLY_THEN_HANDOFF") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customerMessagePolicy"],
          message: "after-sales handoff must send one holding reply before handoff",
        });
      }
      if (value.customerMessages.length !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customerMessages"],
          message: "after-sales handoff requires exactly one holding reply",
        });
      }
      if (value.tag !== "VAN_DON") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tag"],
          message: "after-sales handoff must request the VAN_DON tag",
        });
      }
      return;
    }

    if (value.customerMessagePolicy !== "SILENT_HANDOFF") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerMessagePolicy"],
        message: "non-after-sales handoff must remain silent",
      });
    }
    if (value.customerMessages.length !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerMessages"],
        message: "silent handoff cannot contain a customer message",
      });
    }
    if (value.tag !== "NHAN_VIEN") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tag"],
        message: "non-after-sales handoff must request the NHAN_VIEN tag",
      });
    }
  });
export type HandoffDecisionV2 = z.infer<typeof HandoffDecisionV2Schema>;

export const FunnelMilestoneV1Schema = z.enum([
  "PRICE_ASKED",
  "SIZE_CONSULTED",
  "PURCHASE_CONFIRMED",
  "SALE_CONVERTED",
]);
export type FunnelMilestoneV1 = z.infer<typeof FunnelMilestoneV1Schema>;

export const VerifiedClosedOrderTagEvidenceV1Schema = z
  .object({
    source: z.literal("VERIFIED_PANCAKE_TAG"),
    tag: z.literal("DA_CHOT_DON"),
    verified: z.literal(true),
    observationId: z.string().uuid(),
    observedAt: z.string().datetime(),
  })
  .strict();
export type VerifiedClosedOrderTagEvidenceV1 = z.infer<
  typeof VerifiedClosedOrderTagEvidenceV1Schema
>;

export const FunnelEventV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: z.string().uuid(),
    episodeId: z.string().uuid(),
    subjectHash: Sha256ReferenceSchema,
    conversationHash: Sha256ReferenceSchema,
    milestone: FunnelMilestoneV1Schema,
    occurredAt: z.string().datetime(),
    productId: z.string().trim().min(1).max(128).nullable(),
    source: z.enum([
      "INBOUND_MESSAGE",
      "BUSINESS_TOOL",
      "AGENT_OUTPUT",
      "VERIFIED_PANCAKE_TAG",
      "SYSTEM",
    ]),
    conversionEvidence: VerifiedClosedOrderTagEvidenceV1Schema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const isConversion = value.milestone === "SALE_CONVERTED";
    if (isConversion && value.source !== "VERIFIED_PANCAKE_TAG") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source"],
        message: "SALE_CONVERTED must originate from a verified Pancake tag observation",
      });
    }
    if (isConversion && value.conversionEvidence === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conversionEvidence"],
        message: "SALE_CONVERTED requires verified DA_CHOT_DON evidence",
      });
    }
    if (!isConversion && value.conversionEvidence !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conversionEvidence"],
        message: "only SALE_CONVERTED can carry conversion evidence",
      });
    }
  });
export type FunnelEventV1 = z.infer<typeof FunnelEventV1Schema>;

export const SalesEpisodeOutcomeV1Schema = z.enum([
  "IN_PROGRESS",
  "ABANDONED",
  "HANDED_OFF",
  "CONVERTED",
]);
export type SalesEpisodeOutcomeV1 = z.infer<typeof SalesEpisodeOutcomeV1Schema>;

export const SalesAttributionTouchV1Schema = z
  .object({
    source: z.enum([
      "ORGANIC_MESSENGER",
      "META_AD",
      "UPSALE_MESSAGE",
      "HUMAN_FOLLOW_UP",
      "UNKNOWN",
    ]),
    occurredAt: z.string().datetime(),
    pageId: z.string().trim().min(1).max(64),
    campaignId: z.string().trim().min(1).max(128).nullable(),
    adId: z.string().trim().min(1).max(128).nullable(),
    variantId: z.string().trim().min(1).max(128).nullable(),
  })
  .strict();
export type SalesAttributionTouchV1 = z.infer<typeof SalesAttributionTouchV1Schema>;

export const SalesAttributionV1Schema = z
  .object({
    model: z.literal("FIRST_AND_LAST_TOUCH"),
    firstTouch: SalesAttributionTouchV1Schema,
    lastTouch: SalesAttributionTouchV1Schema,
  })
  .strict();
export type SalesAttributionV1 = z.infer<typeof SalesAttributionV1Schema>;

/**
 * Analytics episode identifiers are hashes only. Raw sender IDs, conversation
 * IDs, names, phone numbers and addresses deliberately have no schema fields.
 */
export const SalesEpisodeV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    episodeId: z.string().uuid(),
    definitionVersion: z.string().trim().min(1).max(128),
    subjectHash: Sha256ReferenceSchema,
    conversationHash: Sha256ReferenceSchema,
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime().nullable(),
    outcome: SalesEpisodeOutcomeV1Schema,
    highestMilestone: FunnelMilestoneV1Schema.nullable(),
    attribution: SalesAttributionV1Schema,
    conversionEvidence: VerifiedClosedOrderTagEvidenceV1Schema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const startedAt = Date.parse(value.startedAt);
    const endedAt = value.endedAt === null ? null : Date.parse(value.endedAt);

    if (value.outcome === "IN_PROGRESS" && value.endedAt !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endedAt"],
        message: "an in-progress sales episode cannot have endedAt",
      });
    }
    if (value.outcome !== "IN_PROGRESS" && value.endedAt === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endedAt"],
        message: "a terminal sales episode requires endedAt",
      });
    }
    if (endedAt !== null && endedAt < startedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endedAt"],
        message: "endedAt cannot precede startedAt",
      });
    }

    const isConverted = value.outcome === "CONVERTED";
    if (isConverted && value.highestMilestone !== "SALE_CONVERTED") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["highestMilestone"],
        message: "a converted episode must reach SALE_CONVERTED",
      });
    }
    if (isConverted && value.conversionEvidence === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conversionEvidence"],
        message: "a converted episode requires verified DA_CHOT_DON evidence",
      });
    }
    if (!isConverted && value.highestMilestone === "SALE_CONVERTED") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["highestMilestone"],
        message: "SALE_CONVERTED requires the CONVERTED outcome",
      });
    }
    if (!isConverted && value.conversionEvidence !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conversionEvidence"],
        message: "only a converted episode can carry conversion evidence",
      });
    }
  });
export type SalesEpisodeV1 = z.infer<typeof SalesEpisodeV1Schema>;
