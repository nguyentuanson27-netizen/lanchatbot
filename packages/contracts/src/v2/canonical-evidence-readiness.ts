import { z } from "zod";
import {
  DECISION_BUYING_INTENT_EVIDENCE_CODES_V1,
  DECISION_DIALOGUE_EVIDENCE_CODES_V1,
} from "./decision-observability.js";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const BoundedIdSchema = z.string().trim().min(1).max(128);

function uniqueValues(
  values: readonly string[],
  context: z.RefinementCtx,
  path: (string | number)[],
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "values must be unique",
    });
  }
}

const EvidenceContributorV1Schema = z.enum([
  "DETERMINISTIC_RUNTIME",
  "MODEL_STRUCTURED_OUTPUT",
]);

export const CanonicalDialogueEvidenceV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("CANONICAL_DIALOGUE_EVIDENCE_V1"),
  act: z.enum([
    "QUESTION",
    "REQUEST",
    "CORRECTION",
    "CONFIRMATION",
    "REJECTION",
    "STATEMENT",
    "AMBIGUOUS",
  ]),
  contributors: z.array(EvidenceContributorV1Schema).min(1).max(2),
  confidenceBand: z.enum(["LOW", "MEDIUM", "HIGH"]),
  sourceMessageIdHash: Sha256Schema,
  evidenceHash: Sha256Schema,
  reasonCodes: z.array(z.enum(DECISION_DIALOGUE_EVIDENCE_CODES_V1)).max(16),
  authorization: z.literal("NONE"),
}).strict().superRefine((value, context) => {
  uniqueValues(value.contributors, context, ["contributors"]);
  uniqueValues(value.reasonCodes, context, ["reasonCodes"]);
});
export type CanonicalDialogueEvidenceV1 = z.infer<
  typeof CanonicalDialogueEvidenceV1Schema
>;

export const CanonicalBuyingIntentV1Schema = z.object({
  schemaVersion: z.literal(1),
  authorityVersion: z.literal("CANONICAL_BUYING_INTENT_V1"),
  decision: z.enum(["NONE", "CONSIDERING", "COMMITTED", "NEGATED"]),
  requestedAction: z.enum([
    "NONE",
    "OPEN_CART",
    "ADD_TO_CART",
    "SET_QUANTITY",
    "PROCEED_TO_PAYMENT",
  ]),
  quantity: z.number().int().min(1).max(20).nullable(),
  productId: BoundedIdSchema.nullable(),
  contributors: z.array(EvidenceContributorV1Schema).max(2),
  sourceMessageIdHash: Sha256Schema,
  evidenceHash: Sha256Schema.nullable(),
  reasonCodes: z.array(z.enum(DECISION_BUYING_INTENT_EVIDENCE_CODES_V1)).max(16),
  evaluatedAt: z.string().datetime(),
  authorization: z.literal("NONE"),
}).strict().superRefine((value, context) => {
  uniqueValues(value.contributors, context, ["contributors"]);
  uniqueValues(value.reasonCodes, context, ["reasonCodes"]);
  if (value.decision === "NONE") {
    if (
      value.requestedAction !== "NONE" ||
      value.quantity !== null ||
      value.productId !== null ||
      value.contributors.length !== 0 ||
      value.evidenceHash !== null ||
      value.reasonCodes.length !== 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NONE buying intent cannot carry evidence, scope, or requested action",
      });
    }
    return;
  }
  if (value.contributors.length === 0 || value.evidenceHash === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "observed buying intent requires contributors and evidence hash",
    });
  }
  if (value.decision === "COMMITTED") {
    if (value.requestedAction === "NONE") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "committed buying intent requires a requested action",
      });
    }
    return;
  }
  if (
    value.requestedAction !== "NONE" ||
    value.quantity !== null ||
    value.productId !== null
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "only committed buying intent may carry action, quantity, or product scope",
    });
  }
});
export type CanonicalBuyingIntentV1 = z.infer<
  typeof CanonicalBuyingIntentV1Schema
>;

export const DeterministicConfirmationEvidenceV1Schema = z.object({
  schemaVersion: z.literal(1),
  authorityVersion: z.literal("DETERMINISTIC_CONFIRMATION_EVIDENCE_V1"),
  classifierVersion: z.enum([
    "LEGACY_CONFIRMATION_V1",
    "CONFIRMATION_CLASSIFIER_V2",
  ]),
  decision: z.literal("CONFIRM"),
  reasonCode: z.literal("CONFIRMATION_DETERMINISTIC_MATCH"),
  sourceMessageIdHash: Sha256Schema,
  evidenceHash: Sha256Schema,
  evaluatedAt: z.string().datetime(),
  authorization: z.literal("NONE"),
}).strict();
export type DeterministicConfirmationEvidenceV1 = z.infer<
  typeof DeterministicConfirmationEvidenceV1Schema
>;

export const ProtectedClaimScopeV1Schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("PRODUCT"),
    productId: BoundedIdSchema,
    variantId: BoundedIdSchema.nullable(),
  }).strict(),
  z.object({
    kind: z.literal("CART"),
    cartId: BoundedIdSchema,
    cartVersion: z.number().int().nonnegative(),
  }).strict(),
  z.object({
    kind: z.literal("SHOP"),
    shopId: BoundedIdSchema,
  }).strict(),
]);

const ProtectedClaimAuthorityV1Schema = z.enum([
  "POS_LIVE",
  "POS_SNAPSHOT",
  "VERIFIED_SIZE_ENGINE_V1",
  "FULFILLMENT_POLICY_V1",
  "CART_POLICY_V1",
  "MEDIA_SELECTOR_V2",
]);

const ProtectedClaimProvenanceV1Schema = z.object({
  authority: ProtectedClaimAuthorityV1Schema,
  sourceVersion: z.string().trim().min(1).max(256),
  evidenceRef: z.string().trim().min(1).max(512),
  contentHash: Sha256Schema,
  observedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
}).strict().superRefine((value, context) => {
  if (Date.parse(value.expiresAt) <= Date.parse(value.observedAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiresAt"],
      message: "protected claim provenance must expire after observation",
    });
  }
});

const ProtectedClaimBase = z.object({
  schemaVersion: z.literal(1),
  claimId: z.string().uuid(),
  scope: ProtectedClaimScopeV1Schema,
  provenance: ProtectedClaimProvenanceV1Schema,
  authorization: z.literal("NONE"),
});

export const ProtectedClaimV1Schema = z.discriminatedUnion("type", [
  ProtectedClaimBase.extend({
    type: z.literal("PRICE"),
    value: z.object({
      amountVnd: z.number().int().nonnegative(),
      currency: z.literal("VND"),
    }).strict(),
  }).strict(),
  ProtectedClaimBase.extend({
    type: z.literal("STOCK"),
    value: z.object({
      status: z.enum([
        "IN_STOCK",
        "LOW_STOCK",
        "OUT_OF_STOCK",
        "PRE_ORDER",
        "COMING_SOON",
        "UNKNOWN",
      ]),
      availableQuantity: z.number().int().nonnegative().nullable(),
    }).strict(),
  }).strict(),
  ProtectedClaimBase.extend({
    type: z.literal("SIZE_FIT"),
    value: z.object({
      recommendedSizes: z.array(BoundedIdSchema).min(1).max(4),
      alternativeSizes: z.array(BoundedIdSchema).max(4),
      customerProfileId: z.string().uuid(),
      customerProfileRevision: z.number().int().positive(),
      measurementFingerprint: Sha256Schema,
      evidenceBasis: z.enum(["MEASUREMENTS", "BODY_PROFILE", "PAST_SIZE"]),
    }).strict(),
  }).strict(),
  ProtectedClaimBase.extend({
    type: z.literal("ETA"),
    value: z.object({
      minDays: z.number().int().nonnegative(),
      maxDays: z.number().int().nonnegative(),
    }).strict().refine((value) => value.maxDays >= value.minDays, {
      message: "ETA maximum must be greater than or equal to minimum",
    }),
  }).strict(),
  ProtectedClaimBase.extend({
    type: z.literal("SHIPPING_FEE"),
    value: z.object({
      amountVnd: z.number().int().nonnegative(),
      currency: z.literal("VND"),
    }).strict(),
  }).strict(),
  ProtectedClaimBase.extend({
    type: z.literal("FREESHIP"),
    value: z.object({ eligible: z.boolean() }).strict(),
  }).strict(),
  ProtectedClaimBase.extend({
    type: z.literal("PROMOTION_OFFER"),
    value: z.object({
      adjustmentId: BoundedIdSchema,
      amountVnd: z.number().int().nonnegative(),
    }).strict(),
  }).strict(),
  ProtectedClaimBase.extend({
    type: z.literal("PRODUCT_MEDIA"),
    value: z.object({ assetId: BoundedIdSchema, assetSha256: Sha256Schema }).strict(),
  }).strict(),
]).superRefine((claim, context) => {
  const expectedAuthorities: Readonly<Record<typeof claim.type, readonly string[]>> = {
    PRICE: ["POS_LIVE", "POS_SNAPSHOT"],
    STOCK: ["POS_LIVE", "POS_SNAPSHOT"],
    SIZE_FIT: ["VERIFIED_SIZE_ENGINE_V1"],
    ETA: ["POS_LIVE", "POS_SNAPSHOT", "FULFILLMENT_POLICY_V1"],
    SHIPPING_FEE: ["CART_POLICY_V1"],
    FREESHIP: ["CART_POLICY_V1"],
    PROMOTION_OFFER: ["CART_POLICY_V1"],
    PRODUCT_MEDIA: ["MEDIA_SELECTOR_V2"],
  };
  if (!expectedAuthorities[claim.type].includes(claim.provenance.authority)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["provenance", "authority"],
      message: "protected claim authority does not match claim type",
    });
  }
  const requiresCartScope = claim.type === "SHIPPING_FEE" ||
    claim.type === "FREESHIP" || claim.type === "PROMOTION_OFFER";
  if (requiresCartScope && claim.scope.kind !== "CART") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["scope"],
      message: "cart adjustment claims require cart scope",
    });
  }
  if (!requiresCartScope && claim.scope.kind !== "PRODUCT") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["scope"],
      message: "product claims require product scope",
    });
  }
});
export type ProtectedClaimV1 = z.infer<typeof ProtectedClaimV1Schema>;

export const DETERMINISTIC_READINESS_REASON_CODES_V1 = [
  "BUYING_INTENT_MISSING",
  "BUYING_INTENT_SCOPE_MISMATCH",
  "PRODUCT_UNRESOLVED",
  "PRODUCT_AMBIGUOUS",
  "CLAIM_MISSING",
  "CLAIM_STALE",
  "CLAIM_SCOPE_MISMATCH",
  "CLAIM_CONFLICT",
  "STATE_REVISION_MISMATCH",
  "CART_REQUIRED",
  "CART_VERSION_MISMATCH",
  "ORDER_PREVIEW_REQUIRED",
  "ORDER_PREVIEW_MISMATCH",
  "EFFECT_NOT_SUPPORTED",
  "DETERMINISTIC_EVIDENCE_MISSING",
] as const;

export const DeterministicEffectReadinessV1Schema = z.object({
  schemaVersion: z.literal(1),
  rulesetVersion: z.literal("DETERMINISTIC_EFFECT_READINESS_V1"),
  effect: z.enum([
    "PROTECTED_OUTBOUND",
    "CART_OPEN",
    "CART_MUTATION",
    "ORDER_PREVIEW",
    "PURCHASE_CONFIRMATION",
  ]),
  outcome: z.enum(["READY", "BLOCKED"]),
  pageId: BoundedIdSchema,
  conversationId: BoundedIdSchema,
  sourceMessageIdHash: Sha256Schema,
  conversationRevision: z.number().int().nonnegative(),
  salesCycleRevision: z.number().int().nonnegative().nullable(),
  productIds: z.array(BoundedIdSchema).max(3),
  cartId: BoundedIdSchema.nullable(),
  cartVersion: z.number().int().nonnegative().nullable(),
  orderPreviewId: BoundedIdSchema.nullable(),
  orderPreviewHash: Sha256Schema.nullable(),
  buyingIntentHash: Sha256Schema.nullable(),
  deterministicEvidenceHash: Sha256Schema.nullable(),
  claimSetHash: Sha256Schema.nullable(),
  protectedClaimTypes: z.array(z.enum([
    "PRICE", "STOCK", "SIZE_FIT", "ETA", "SHIPPING_FEE", "FREESHIP",
    "PROMOTION_OFFER", "PRODUCT_MEDIA",
  ])).max(8),
  checkedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  reasonCodes: z.array(z.enum(DETERMINISTIC_READINESS_REASON_CODES_V1)).max(16),
  authorization: z.literal("NONE"),
}).strict().superRefine((value, context) => {
  uniqueValues(value.productIds, context, ["productIds"]);
  uniqueValues(value.reasonCodes, context, ["reasonCodes"]);
  uniqueValues(value.protectedClaimTypes, context, ["protectedClaimTypes"]);
  if (Date.parse(value.expiresAt) <= Date.parse(value.checkedAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiresAt"],
      message: "readiness must expire after it is checked",
    });
  }
  if (value.outcome === "READY") {
    const payloadOnlyProtectedOutbound = value.effect === "PROTECTED_OUTBOUND" &&
      value.protectedClaimTypes.length === 0 &&
      value.deterministicEvidenceHash !== null;
    if (
      value.reasonCodes.length > 0 ||
      value.productIds.length === 0 ||
      (value.claimSetHash === null && !payloadOnlyProtectedOutbound)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ready effects require product and claim bindings without block reasons",
      });
    }
    const requiresBuyingIntent = value.effect === "CART_OPEN";
    if (requiresBuyingIntent && value.buyingIntentHash === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["buyingIntentHash"],
        message: "ready cart changes require canonical buying intent",
      });
    }
    if (value.effect === "CART_MUTATION" && value.buyingIntentHash === null &&
      value.deterministicEvidenceHash === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cart mutation requires canonical intent or deterministic command evidence",
      });
    }
    if (value.effect === "PURCHASE_CONFIRMATION" &&
      value.deterministicEvidenceHash === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deterministicEvidenceHash"],
        message: "purchase confirmation requires deterministic evidence",
      });
    }
    if (value.effect === "PROTECTED_OUTBOUND" &&
      value.protectedClaimTypes.length === 0 &&
      value.deterministicEvidenceHash === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["protectedClaimTypes"],
        message: "protected outbound requires exact claim-type bindings",
      });
    }
  } else if (value.reasonCodes.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reasonCodes"],
      message: "blocked readiness requires a deterministic reason",
    });
  }
  const needsCart = value.effect === "CART_MUTATION" ||
    value.effect === "ORDER_PREVIEW" || value.effect === "PURCHASE_CONFIRMATION";
  if (value.outcome === "READY" && needsCart &&
    (value.cartId === null || value.cartVersion === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ready cart/order effects require cart identity and version",
    });
  }
  if (value.outcome === "READY" && value.effect === "PURCHASE_CONFIRMATION" &&
    (value.orderPreviewId === null || value.orderPreviewHash === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "purchase confirmation requires order preview identity and hash",
    });
  }
});
export type DeterministicEffectReadinessV1 = z.infer<
  typeof DeterministicEffectReadinessV1Schema
>;
