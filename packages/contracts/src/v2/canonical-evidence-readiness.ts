import { z } from "zod";
import {
  DECISION_BUYING_INTENT_EVIDENCE_CODES_V1,
  DECISION_DIALOGUE_EVIDENCE_CODES_V1,
} from "./decision-observability.js";
import { CartLineV1Schema } from "./customer-size-cart.js";
import {
  CanonicalProductIdV1Schema,
  canonicalizeProductIdsV1,
  MAX_CANONICAL_PRODUCT_IDS_PER_EFFECT_V1,
} from "./canonical-identifiers.js";
import {
  canonicalJsonV1,
  EffectBindingV1Schema,
} from "./canonical-commerce-bindings.js";
import { DETERMINISTIC_READINESS_REASON_CODES_V1 } from "./readiness-reason-codes.js";
export { DETERMINISTIC_READINESS_REASON_CODES_V1 } from "./readiness-reason-codes.js";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const BoundedIdSchema = z.string().trim().min(1).max(128);
/** Technical envelope only; cart capacity is enforced by CartCapacityPolicyV1. */
export const MAX_READINESS_PRODUCT_IDS_V1 = MAX_CANONICAL_PRODUCT_IDS_PER_EFFECT_V1;
/** Bounded tolerance for clocks on independent app, POS, and database hosts. */
export const MAX_EFFECT_FUTURE_CLOCK_SKEW_MS_V1 = 5 * 60 * 1_000;
/** Readiness is deliberately short-lived and must be re-evaluated near commit. */
export const MAX_EFFECT_READINESS_LIFETIME_MS_V1 = 60_000;

export const EFFECT_READINESS_TEMPORAL_STATUSES_V1 = [
  "VALID",
  "INVALID_TIMESTAMP",
  "INVALID_INTERVAL",
  "LIFETIME_EXCEEDED",
  "FUTURE",
  "STALE",
] as const;
export type EffectReadinessTemporalStatusV1 =
  typeof EFFECT_READINESS_TEMPORAL_STATUSES_V1[number];

/** Pure transaction-time classification shared by sales and Meta readiness. */
export function validateEffectReadinessTemporalWindowV1(input: Readonly<{
  checkedAt: string;
  expiresAt: string;
  now: Date;
}>): EffectReadinessTemporalStatusV1 {
  const checkedAt = Date.parse(input.checkedAt);
  const expiresAt = Date.parse(input.expiresAt);
  const now = input.now.getTime();
  if (![checkedAt, expiresAt, now].every(Number.isFinite)) return "INVALID_TIMESTAMP";
  if (expiresAt <= checkedAt) return "INVALID_INTERVAL";
  if (expiresAt - checkedAt > MAX_EFFECT_READINESS_LIFETIME_MS_V1) {
    return "LIFETIME_EXCEEDED";
  }
  if (checkedAt > now + MAX_EFFECT_FUTURE_CLOCK_SKEW_MS_V1) return "FUTURE";
  if (expiresAt <= now) return "STALE";
  return "VALID";
}

// Single ingress choke point: arbitrary product-ID input becomes a bounded,
// deterministic envelope; invalidity is data for BLOCKED, never an exception.
export function canonicalizeReadinessProductIdsV1(
  input: unknown,
): Readonly<{
  productIds: readonly string[];
  unresolved: boolean;
  invalid: boolean;
}> {
  return canonicalizeProductIdsV1(input);
}

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
  productId: CanonicalProductIdV1Schema.nullable(),
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

export function canonicalBuyingIntentAuthorizesCartMutationV1(
  intent: CanonicalBuyingIntentV1,
  action: "ADD_LINE" | "SET_QUANTITY",
  productId: string,
): boolean {
  const requestedActions: readonly CanonicalBuyingIntentV1["requestedAction"][] =
    intent.contributors.includes("MODEL_STRUCTURED_OUTPUT")
      ? action === "ADD_LINE"
        ? ["ADD_TO_CART"]
        : ["SET_QUANTITY"]
      : action === "ADD_LINE"
        ? ["ADD_TO_CART", "OPEN_CART"]
        : ["SET_QUANTITY", "OPEN_CART"];
  return intent.decision === "COMMITTED" &&
    intent.contributors.includes("DETERMINISTIC_RUNTIME") &&
    intent.productId === productId &&
    requestedActions.includes(intent.requestedAction);
}

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

const DeterministicCartMutationPayloadV1Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ADD_LINE"), line: CartLineV1Schema }).strict(),
  z.object({ kind: z.literal("REMOVE_LINE"), lineId: z.string().uuid() }).strict(),
  z.object({
    kind: z.literal("SET_QUANTITY"),
    lineId: z.string().uuid(),
    quantity: z.number().int().positive().max(20),
  }).strict(),
]);

export const DeterministicCartMutationEvidenceV1Schema = z.object({
  schemaVersion: z.literal(1),
  authorityVersion: z.literal("DETERMINISTIC_CART_MUTATION_EVIDENCE_V1"),
  action: z.enum(["ADD_LINE", "REMOVE_LINE", "SET_QUANTITY"]),
  authorityKind: z.enum([
    "CANONICAL_BUYING_INTENT",
    "DETERMINISTIC_REMOVE_CLASSIFIER",
  ]),
  authorityEvidenceHash: Sha256Schema,
  mutation: DeterministicCartMutationPayloadV1Schema,
  mutationPayloadHash: Sha256Schema,
  sourceMessageIdHash: Sha256Schema,
  commandIdHash: Sha256Schema,
  beforeCartStateHash: Sha256Schema,
  afterCartStateHash: Sha256Schema,
  evidenceHash: Sha256Schema,
  evaluatedAt: z.string().datetime(),
  contributor: z.literal("DETERMINISTIC_RUNTIME"),
  authorization: z.literal("NONE"),
}).strict().superRefine((value, context) => {
  if (value.beforeCartStateHash === value.afterCartStateHash) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["afterCartStateHash"],
      message: "cart mutation evidence must bind a changed cart state",
    });
  }
  if (value.action === "REMOVE_LINE" &&
    value.authorityKind !== "DETERMINISTIC_REMOVE_CLASSIFIER") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["authorityKind"],
      message: "remove mutation requires deterministic removal authority",
    });
  }
  if (value.action !== "REMOVE_LINE" &&
    value.authorityKind !== "CANONICAL_BUYING_INTENT") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["authorityKind"],
      message: "add and quantity mutations require canonical buying intent authority",
    });
  }
  if (value.action !== value.mutation.kind) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["mutation"],
      message: "cart mutation evidence action must match its typed payload",
    });
  }
});
export type DeterministicCartMutationEvidenceV1 = z.infer<
  typeof DeterministicCartMutationEvidenceV1Schema
>;

export const ProtectedClaimScopeV1Schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("PRODUCT"),
    productId: CanonicalProductIdV1Schema,
    variantId: CanonicalProductIdV1Schema.nullable(),
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

const CART_SCOPED_PROTECTED_CLAIM_TYPES_V1 = new Set<ProtectedClaimV1["type"]>([
  "SHIPPING_FEE", "FREESHIP", "PROMOTION_OFFER",
]);

export function requiredProtectedClaimTypesForEffectV1(
  effect: DeterministicEffectReadinessV1["effect"],
  protectedClaimTypes: readonly ProtectedClaimV1["type"][] = [],
): readonly ProtectedClaimV1["type"][] {
  if (effect === "PROTECTED_OUTBOUND") return protectedClaimTypes;
  if (effect === "CART_OPEN" || effect === "CART_MUTATION" || effect === "CART_READY") {
    return ["PRICE", "STOCK"];
  }
  return ["PRICE", "STOCK", "ETA"];
}

function protectedClaimScopeKeyV1(claim: ProtectedClaimV1): string {
  if (claim.scope.kind === "PRODUCT") {
    return `PRODUCT:${claim.scope.productId}:${claim.scope.variantId ?? ""}`;
  }
  if (claim.scope.kind === "CART") {
    return `CART:${claim.scope.cartId}:${claim.scope.cartVersion}`;
  }
  return `SHOP:${claim.scope.shopId}`;
}

// Shared semantic-validation choke point used when readiness is created and again
// inside the DB transaction, so required coverage and conflicts cannot drift.
export function validateEffectClaimSemanticsV1(input: Readonly<{
  effect: DeterministicEffectReadinessV1["effect"];
  productIds: readonly string[];
  cartId: string | null;
  cartVersion: number | null;
  protectedClaimTypes?: readonly ProtectedClaimV1["type"][];
  claims: readonly ProtectedClaimV1[];
}>): Readonly<{ missing: boolean; conflict: boolean }> {
  const requiredTypes = requiredProtectedClaimTypesForEffectV1(
    input.effect,
    input.protectedClaimTypes,
  );
  const missing = requiredTypes.some((type) => {
    if (CART_SCOPED_PROTECTED_CLAIM_TYPES_V1.has(type)) {
      return !input.claims.some((claim) => claim.type === type && claim.scope.kind === "CART" &&
        claim.scope.cartId === input.cartId && claim.scope.cartVersion === input.cartVersion);
    }
    return input.productIds.some((productId) => !input.claims.some((claim) =>
      claim.type === type && claim.scope.kind === "PRODUCT" &&
      claim.scope.productId === productId
    ));
  });
  const contentByClaimKey = new Map<string, Set<string>>();
  for (const claim of input.claims) {
    if (claim.type === "PRODUCT_MEDIA" || claim.type === "PROMOTION_OFFER") continue;
    const key = `${claim.type}:${protectedClaimScopeKeyV1(claim)}`;
    const contents = contentByClaimKey.get(key) ?? new Set<string>();
    contents.add(claim.provenance.contentHash);
    contentByClaimKey.set(key, contents);
  }
  return {
    missing,
    conflict: [...contentByClaimKey.values()].some((contents) => contents.size > 1),
  };
}

export interface CartEffectClaimLineV1 {
  readonly parentProductId: string;
  readonly offerId: string;
  readonly quantity: number;
  readonly posUnitPriceVnd: number | null;
  readonly priceFactRef: string | null;
}

/** Exact cart-line claim semantics shared by the worker and transaction guard. */
export function validateCartEffectClaimSemanticsV1(input: Readonly<{
  effect: DeterministicEffectReadinessV1["effect"];
  lines: readonly CartEffectClaimLineV1[];
  claims: readonly ProtectedClaimV1[];
  cartId?: string | null;
  cartVersion?: number | null;
  protectedClaimTypes?: readonly ProtectedClaimV1["type"][];
}>): Readonly<{ missing: boolean; conflict: boolean; mismatch: boolean }> {
  const requiredTypes = requiredProtectedClaimTypesForEffectV1(
    input.effect,
    input.protectedClaimTypes,
  )
    .filter((type) => !CART_SCOPED_PROTECTED_CLAIM_TYPES_V1.has(type));
  let missing = false;
  let mismatch = input.claims.some((claim) => {
    if (claim.scope.kind !== "PRODUCT" || !requiredTypes.includes(claim.type)) {
      return false;
    }
    const { productId, variantId } = claim.scope;
    return !input.lines.some((line) =>
      line.parentProductId === productId && line.offerId === variantId
    );
  });
  const quantityByOffer = new Map<string, number>();
  for (const line of input.lines) {
    const key = `${line.parentProductId}\u0000${line.offerId}`;
    quantityByOffer.set(key, (quantityByOffer.get(key) ?? 0) + line.quantity);
  }
  for (const line of input.lines) {
    const scoped = input.claims.filter((claim) =>
      claim.scope.kind === "PRODUCT" &&
      claim.scope.productId === line.parentProductId
    );
    for (const type of requiredTypes) {
      const matches = scoped.filter((claim) =>
        claim.type === type && claim.scope.kind === "PRODUCT" &&
        claim.scope.variantId === line.offerId
      );
      if (matches.length === 0) {
        missing = true;
        continue;
      }
      for (const claim of matches) {
        if (claim.type === "PRICE" && (
          line.posUnitPriceVnd === null ||
          claim.value.amountVnd !== line.posUnitPriceVnd ||
          (line.priceFactRef !== null && claim.provenance.sourceVersion !== line.priceFactRef)
        )) mismatch = true;
        if (claim.type === "STOCK") {
          const requiredQuantity = quantityByOffer.get(
            `${line.parentProductId}\u0000${line.offerId}`,
          ) ?? line.quantity;
          const orderable = claim.value.status === "PRE_ORDER" || (
            (claim.value.status === "IN_STOCK" || claim.value.status === "LOW_STOCK") &&
            claim.value.availableQuantity !== null &&
            claim.value.availableQuantity >= requiredQuantity
          );
          if (!orderable) mismatch = true;
        }
      }
    }
  }
  const base = validateEffectClaimSemanticsV1({
    effect: input.effect,
    productIds: [...new Set(input.lines.map(({ parentProductId }) => parentProductId))],
    cartId: input.cartId ?? null,
    cartVersion: input.cartVersion ?? null,
    ...(input.protectedClaimTypes === undefined
      ? {}
      : { protectedClaimTypes: input.protectedClaimTypes }),
    claims: input.claims,
  });
  return { missing: missing || base.missing, conflict: base.conflict, mismatch };
}

export const DeterministicEffectReadinessV1Schema = z.object({
  schemaVersion: z.literal(1),
  rulesetVersion: z.literal("DETERMINISTIC_EFFECT_READINESS_V1"),
  effect: z.enum([
    "PROTECTED_OUTBOUND",
    "CART_OPEN",
    "CART_MUTATION",
    "CART_READY",
    "PREVIEW_READY",
    "PURCHASE_CONFIRMATION_READY",
    // Compatibility-only vocabulary. Transactional DF06 consumers must not
    // accept these legacy aggregate stages as protected-effect authority.
    "ORDER_PREVIEW",
    "PURCHASE_CONFIRMATION",
  ]),
  outcome: z.enum(["READY", "BLOCKED"]),
  pageId: BoundedIdSchema,
  conversationId: BoundedIdSchema,
  sourceMessageIdHash: Sha256Schema,
  conversationRevision: z.number().int().nonnegative(),
  salesCycleRevision: z.number().int().nonnegative().nullable(),
  productIds: z.array(CanonicalProductIdV1Schema).max(MAX_READINESS_PRODUCT_IDS_V1),
  cartId: BoundedIdSchema.nullable(),
  cartVersion: z.number().int().nonnegative().nullable(),
  cartStateHash: Sha256Schema.nullable().optional().default(null),
  orderPreviewId: BoundedIdSchema.nullable(),
  orderPreviewHash: Sha256Schema.nullable(),
  buyingIntentHash: Sha256Schema.nullable(),
  deterministicEvidenceHash: Sha256Schema.nullable(),
  claimSetHash: Sha256Schema.nullable(),
  binding: EffectBindingV1Schema,
  bindingHash: Sha256Schema,
  readinessHash: Sha256Schema,
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
  const expectedBinding = {
    pageId: value.pageId,
    conversationId: value.conversationId,
    sourceMessageIdHash: value.sourceMessageIdHash,
    conversationRevision: value.conversationRevision,
    salesCycleRevision: value.salesCycleRevision,
    productIds: value.productIds,
    cartId: value.cartId,
    cartVersion: value.cartVersion,
    cartStateHash: value.cartStateHash,
    orderPreviewId: value.orderPreviewId,
    orderPreviewHash: value.orderPreviewHash,
    claimSetHash: value.claimSetHash,
  };
  const actualBinding = {
    pageId: value.binding.pageId,
    conversationId: value.binding.conversationId,
    sourceMessageIdHash: value.binding.sourceMessageIdHash,
    conversationRevision: value.binding.conversationRevision,
    salesCycleRevision: value.binding.salesCycleRevision,
    productIds: value.binding.productIds,
    cartId: value.binding.cart?.cartId ?? null,
    cartVersion: value.binding.cart?.cartRevision ?? null,
    cartStateHash: value.binding.cart?.cartStateHash ?? null,
    orderPreviewId: value.binding.preview?.previewId ?? null,
    orderPreviewHash: value.binding.preview?.previewHash ?? null,
    claimSetHash: value.binding.claimSetHash,
  };
  if (value.outcome === "READY" &&
    canonicalJsonV1(expectedBinding) !== canonicalJsonV1(actualBinding)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["binding"],
      message: "readiness compatibility fields must exactly match EffectBindingV1",
    });
  }
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
    if (value.effect === "CART_MUTATION" && value.deterministicEvidenceHash === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cart mutation requires typed deterministic command evidence",
      });
    }
    if ((value.effect === "PURCHASE_CONFIRMATION" ||
      value.effect === "PURCHASE_CONFIRMATION_READY") &&
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
  const needsCart = value.effect === "CART_OPEN" || value.effect === "CART_MUTATION" ||
    value.effect === "CART_READY" || value.effect === "PREVIEW_READY" ||
    value.effect === "PURCHASE_CONFIRMATION_READY" ||
    value.effect === "ORDER_PREVIEW" || value.effect === "PURCHASE_CONFIRMATION";
  if (value.outcome === "READY" && needsCart &&
    (value.cartId === null || value.cartVersion === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ready cart/order effects require cart identity and version",
    });
  }
  const changesOrUsesCart = value.effect === "CART_OPEN" || needsCart;
  if (value.outcome === "READY" && changesOrUsesCart && value.cartStateHash === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cartStateHash"],
      message: "ready cart effects require an exact final-cart state hash",
    });
  }
  const needsPreview = value.effect === "PREVIEW_READY" ||
    value.effect === "PURCHASE_CONFIRMATION_READY" ||
    value.effect === "PURCHASE_CONFIRMATION";
  if (value.outcome === "READY" && needsPreview &&
    (value.orderPreviewId === null || value.orderPreviewHash === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "purchase confirmation requires order preview identity and hash",
    });
  }
  const needsParent = value.effect === "PREVIEW_READY" ||
    value.effect === "PURCHASE_CONFIRMATION_READY" ||
    (value.effect === "PROTECTED_OUTBOUND" && value.binding.cart !== null);
  if (value.outcome === "READY" && needsParent &&
    value.binding.parentReadinessHash === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["binding", "parentReadinessHash"],
      message: "layered commerce readiness requires the exact prior readiness artifact",
    });
  }
});
export type DeterministicEffectReadinessV1 = z.infer<
  typeof DeterministicEffectReadinessV1Schema
>;

export function deterministicEffectReadinessHashPreimageV1(
  input: z.input<typeof DeterministicEffectReadinessV1Schema>,
): string {
  const parsed = DeterministicEffectReadinessV1Schema.parse(input);
  const { readinessHash: _readinessHash, ...readiness } = parsed;
  return `DETERMINISTIC_EFFECT_READINESS_V1\n${canonicalJsonV1(readiness)}`;
}
