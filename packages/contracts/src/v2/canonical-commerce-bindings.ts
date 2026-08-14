import { z } from "zod";
import {
  CartLineV1Schema,
  CartV1Schema,
  MAX_CART_LINES_V1,
} from "./customer-size-cart.js";
import { PolicyBundleV1Schema } from "./product-policy-media.js";
import {
  CanonicalProductIdV1Schema,
  MAX_CANONICAL_PRODUCT_IDS_PER_EFFECT_V1,
} from "./canonical-identifiers.js";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const ExactBoundedIdSchema = z.string().min(1).max(256).superRefine((value, context) => {
  if (value !== value.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "identifier cannot contain boundary whitespace",
    });
  }
});

export function canonicalJsonV1(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("CANONICAL_JSON_UNSUPPORTED_VALUE");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJsonV1).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => {
    if (record[key] === undefined) throw new Error("CANONICAL_JSON_UNDEFINED_PROPERTY");
    return `${JSON.stringify(key)}:${canonicalJsonV1(record[key])}`;
  }).join(",")}}`;
}

export const CanonicalCartStateV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("CANONICAL_CART_STATE_V1"),
  cart: CartV1Schema,
}).strict();
export type CanonicalCartStateV1 = z.infer<typeof CanonicalCartStateV1Schema>;

export function canonicalCartStateV1(cart: z.input<typeof CartV1Schema>): CanonicalCartStateV1 {
  return CanonicalCartStateV1Schema.parse({
    schemaVersion: 1,
    contractVersion: "CANONICAL_CART_STATE_V1",
    cart,
  });
}

export function canonicalCartStateHashPreimageV1(
  input: z.input<typeof CanonicalCartStateV1Schema>,
): string {
  const state = CanonicalCartStateV1Schema.parse(input);
  return `CANONICAL_CART_STATE_V1\n${canonicalJsonV1(state)}`;
}

export const CartOfferBindingV1Schema = z.object({
  lineId: z.string().uuid(),
  productId: CanonicalProductIdV1Schema,
  offerId: CanonicalProductIdV1Schema,
  quantity: z.number().int().positive().max(20),
  unitPriceVnd: z.number().int().nonnegative().nullable(),
  priceFactRef: ExactBoundedIdSchema.nullable(),
}).strict();
export type CartOfferBindingV1 = z.infer<typeof CartOfferBindingV1Schema>;

export function canonicalCartOfferBindingsV1(
  lines: readonly z.input<typeof CartLineV1Schema>[],
): readonly CartOfferBindingV1[] {
  return lines.map((rawLine) => {
    const line = CartLineV1Schema.parse(rawLine);
    return CartOfferBindingV1Schema.parse({
      lineId: line.lineId,
      productId: line.parentProductId,
      offerId: line.offerId,
      quantity: line.quantity,
      unitPriceVnd: line.posUnitPriceVnd,
      priceFactRef: line.priceAuthority?.priceFactRef ?? null,
    });
  }).sort((left, right) => left.lineId.localeCompare(right.lineId));
}

const EffectCartBindingV1Schema = z.object({
  cartId: z.string().uuid(),
  cartRevision: z.number().int().positive(),
  cartStateHash: Sha256Schema,
  offerBindings: z.array(CartOfferBindingV1Schema).min(1).max(MAX_CART_LINES_V1),
}).strict().superRefine((value, context) => {
  const lineIds = value.offerBindings.map(({ lineId }) => lineId);
  if (new Set(lineIds).size !== lineIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["offerBindings"], message: "offer line bindings must be unique" });
  }
  const sorted = [...lineIds].sort((left, right) => left.localeCompare(right));
  if (lineIds.some((lineId, index) => lineId !== sorted[index])) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["offerBindings"], message: "offer bindings must use canonical line-ID order" });
  }
});

export const EffectBindingV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("EFFECT_BINDING_V1"),
  pageId: ExactBoundedIdSchema,
  conversationId: ExactBoundedIdSchema,
  sourceMessageIdHash: Sha256Schema,
  conversationRevision: z.number().int().nonnegative(),
  salesCycleRevision: z.number().int().nonnegative().nullable(),
  productIds: z.array(CanonicalProductIdV1Schema)
    .max(MAX_CANONICAL_PRODUCT_IDS_PER_EFFECT_V1),
  cart: EffectCartBindingV1Schema.nullable(),
  preview: z.object({
    previewId: z.string().uuid(),
    previewHash: Sha256Schema,
  }).strict().nullable(),
  claimSetHash: Sha256Schema.nullable(),
  parentReadinessHash: Sha256Schema.nullable(),
  payloadHash: Sha256Schema.nullable(),
}).strict().superRefine((value, context) => {
  if (new Set(value.productIds).size !== value.productIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["productIds"], message: "product bindings must be unique" });
  }
  const sorted = [...value.productIds].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  if (value.productIds.some((productId, index) => productId !== sorted[index])) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["productIds"], message: "product bindings must use canonical order" });
  }
  if (value.cart !== null) {
    const cartProducts = [...new Set(value.cart.offerBindings.map(({ productId }) => productId))]
      .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
    if (cartProducts.some((productId) => !value.productIds.includes(productId))) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["productIds"], message: "cart offer products must be included in effect products" });
    }
  }
});
export type EffectBindingV1 = z.infer<typeof EffectBindingV1Schema>;

export function effectBindingHashPreimageV1(input: z.input<typeof EffectBindingV1Schema>): string {
  const binding = EffectBindingV1Schema.parse(input);
  return `EFFECT_BINDING_V1\n${canonicalJsonV1(binding)}`;
}

export const CartMutationActionV1Schema = z.enum([
  "ADD_LINE",
  "REMOVE_LINE",
  "SET_QUANTITY",
]);
export type CartMutationActionV1 = z.infer<typeof CartMutationActionV1Schema>;

export const CanonicalCartMutationPayloadV1Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ADD_LINE"), line: CartLineV1Schema }).strict(),
  z.object({ kind: z.literal("REMOVE_LINE"), lineId: z.string().uuid() }).strict(),
  z.object({
    kind: z.literal("SET_QUANTITY"),
    lineId: z.string().uuid(),
    quantity: z.number().int().positive().max(20),
  }).strict(),
]);
export type CanonicalCartMutationPayloadV1 = z.infer<
  typeof CanonicalCartMutationPayloadV1Schema
>;

export const CartMutationAuthorityBindingV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("CART_MUTATION_AUTHORITY_BINDING_V1"),
  sourceMessageIdHash: Sha256Schema,
  action: CartMutationActionV1Schema,
  productId: CanonicalProductIdV1Schema,
  offerId: CanonicalProductIdV1Schema,
  authorityKind: z.enum([
    "CANONICAL_BUYING_INTENT",
    "DETERMINISTIC_REMOVE_CLASSIFIER",
  ]),
  authorityEvidenceHash: Sha256Schema,
  bindingHash: Sha256Schema,
}).strict().superRefine((value, context) => {
  const expected = value.action === "REMOVE_LINE"
    ? "DETERMINISTIC_REMOVE_CLASSIFIER"
    : "CANONICAL_BUYING_INTENT";
  if (value.authorityKind !== expected) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["authorityKind"], message: "authority kind must match mutation action" });
  }
});
export type CartMutationAuthorityBindingV1 = z.infer<
  typeof CartMutationAuthorityBindingV1Schema
>;

export function cartMutationAuthorityBindingHashPreimageV1(
  input: z.input<typeof CartMutationAuthorityBindingV1Schema>,
): string {
  const { bindingHash: _bindingHash, ...binding } = CartMutationAuthorityBindingV1Schema.parse(input);
  return `CART_MUTATION_AUTHORITY_BINDING_V1\n${canonicalJsonV1(binding)}`;
}

export const CartMutationReceiptV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("CART_MUTATION_RECEIPT_V1"),
  sequence: z.number().int().nonnegative().max(MAX_CART_LINES_V1 - 1),
  commandIdHash: Sha256Schema,
  mutation: CanonicalCartMutationPayloadV1Schema,
  mutationPayloadHash: Sha256Schema,
  authority: CartMutationAuthorityBindingV1Schema,
  beforeCartStateHash: Sha256Schema,
  afterCartStateHash: Sha256Schema,
  customerState: z.enum(["READY", "HESITANT", "CAUTIOUS"]),
  appliedAt: z.string().datetime(),
  evaluatedAt: z.string().datetime(),
  evidenceHash: Sha256Schema,
  contributor: z.literal("DETERMINISTIC_RUNTIME"),
  authorization: z.literal("NONE"),
}).strict().superRefine((value, context) => {
  if (value.mutation.kind !== value.authority.action) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["authority", "action"], message: "receipt authority must bind its exact mutation action" });
  }
  if (value.mutation.kind === "ADD_LINE" && (
    value.authority.productId !== value.mutation.line.parentProductId ||
    value.authority.offerId !== value.mutation.line.offerId
  )) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["authority"], message: "receipt authority must bind the exact added product and offer" });
  }
  if (value.beforeCartStateHash === value.afterCartStateHash) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["afterCartStateHash"], message: "receipt must bind a changed cart" });
  }
  if (Date.parse(value.evaluatedAt) < Date.parse(value.appliedAt)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["evaluatedAt"], message: "receipt readiness cannot precede mutation application" });
  }
});
export type CartMutationReceiptV1 = z.infer<typeof CartMutationReceiptV1Schema>;

export function cartMutationReceiptHashPreimageV1(
  input: z.input<typeof CartMutationReceiptV1Schema>,
): string {
  const { evidenceHash: _evidenceHash, ...receipt } = CartMutationReceiptV1Schema.parse(input);
  return `CART_MUTATION_RECEIPT_V1\n${canonicalJsonV1(receipt)}`;
}

const VersionedPolicyReferenceV1Schema = z.object({
  id: ExactBoundedIdSchema,
  version: ExactBoundedIdSchema,
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
}).strict();

export const CanonicalCartReplayContextV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("CANONICAL_CART_REPLAY_CONTEXT_V1"),
  shopId: ExactBoundedIdSchema,
  policyRef: VersionedPolicyReferenceV1Schema,
  policyBundle: PolicyBundleV1Schema,
  customerState: z.enum(["READY", "HESITANT", "CAUTIOUS"]).nullable(),
}).strict().superRefine((value, context) => {
  if (value.policyBundle.shopId !== value.shopId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["policyBundle", "shopId"], message: "replay policy must belong to the exact shop" });
  }
  if (value.policyBundle.policyBundleId !== value.policyRef.id ||
    value.policyBundle.policyVersion !== value.policyRef.version) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["policyRef"], message: "replay policy identity must match its locked reference" });
  }
});
export type CanonicalCartReplayContextV1 = z.infer<
  typeof CanonicalCartReplayContextV1Schema
>;

const RuntimePolicyPinBindingV1Schema = z.object({
  scopeType: z.literal("SALES_EPISODE"),
  scopeId: ExactBoundedIdSchema,
  channel: z.enum(["CANARY_LIVE", "PUBLISHED"]),
  bundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
}).strict();

const CanonicalCartDraftV1Schema = z.object({
  identity: z.object({
    cartId: z.string().uuid(),
    salesEpisodeId: z.string().uuid(),
    customerProfileId: z.string().uuid(),
  }).strict(),
  // The current CART_OPEN authority is one deterministic product selection.
  // Later additions use CartMutationBatchEvidenceV1 rather than widening this seed.
  lines: z.array(CartLineV1Schema).length(1),
  shopId: ExactBoundedIdSchema,
  policyRef: VersionedPolicyReferenceV1Schema,
}).strict();

export const CartOpenEvidenceV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("CART_OPEN_EVIDENCE_V1"),
  sourceMessageIdHash: Sha256Schema,
  commandIdHash: Sha256Schema,
  cartDraftRef: VersionedPolicyReferenceV1Schema,
  draft: CanonicalCartDraftV1Schema,
  replayContext: CanonicalCartReplayContextV1Schema,
  policyPin: RuntimePolicyPinBindingV1Schema,
  createdAt: z.string().datetime(),
  evidenceHash: Sha256Schema,
}).strict().superRefine((value, context) => {
  if (value.replayContext.customerState !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["replayContext", "customerState"], message: "cart open derives READY state during replay" });
  }
  if (value.draft.shopId !== value.replayContext.shopId ||
    canonicalJsonV1(value.draft.policyRef) !== canonicalJsonV1(value.replayContext.policyRef)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["draft"], message: "cart draft must bind the exact replay shop and policy" });
  }
});
export type CartOpenEvidenceV1 = z.infer<typeof CartOpenEvidenceV1Schema>;

export function cartOpenEvidenceHashPreimageV1(
  input: z.input<typeof CartOpenEvidenceV1Schema>,
): string {
  const { evidenceHash: _evidenceHash, ...evidence } = CartOpenEvidenceV1Schema.parse(input);
  return `CART_OPEN_EVIDENCE_V1\n${canonicalJsonV1(evidence)}`;
}

export const NegotiationTransitionEvidenceV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("NEGOTIATION_TRANSITION_EVIDENCE_V1"),
  sourceMessageIdHash: Sha256Schema,
  commandIdHash: Sha256Schema,
  eventIdHash: Sha256Schema,
  evidenceIdHash: Sha256Schema,
  objectionEvidenceIdHash: Sha256Schema.nullable(),
  intent: z.enum(["PURCHASE_READY", "PRICE_OBJECTION", "OTHER"]),
  reasonCode: ExactBoundedIdSchema.nullable(),
  observedAt: z.string().datetime(),
  evidenceHash: Sha256Schema,
}).strict().superRefine((value, context) => {
  if (value.intent === "PRICE_OBJECTION") {
    if (value.objectionEvidenceIdHash === null || value.reasonCode === null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["objectionEvidenceIdHash"], message: "price objection requires exact objection evidence" });
    }
  } else if (value.objectionEvidenceIdHash !== null || value.reasonCode !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["intent"], message: "non-objection transition cannot carry objection authority" });
  }
});
export type NegotiationTransitionEvidenceV1 = z.infer<
  typeof NegotiationTransitionEvidenceV1Schema
>;

export function negotiationTransitionEvidenceHashPreimageV1(
  input: z.input<typeof NegotiationTransitionEvidenceV1Schema>,
): string {
  const { evidenceHash: _evidenceHash, ...evidence } =
    NegotiationTransitionEvidenceV1Schema.parse(input);
  return `NEGOTIATION_TRANSITION_EVIDENCE_V1\n${canonicalJsonV1(evidence)}`;
}

export const CartMutationBatchEvidenceV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("CART_MUTATION_BATCH_EVIDENCE_V1"),
  sourceMessageIdHash: Sha256Schema,
  initialCartStateHash: Sha256Schema,
  finalCartStateHash: Sha256Schema,
  receipts: z.array(CartMutationReceiptV1Schema).min(1).max(MAX_CART_LINES_V1),
  replayContext: CanonicalCartReplayContextV1Schema,
  evidenceHash: Sha256Schema,
}).strict().superRefine((value, context) => {
  if (value.replayContext.customerState !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["replayContext", "customerState"], message: "mutation receipts carry their own exact replay customer state" });
  }
  const commandIds = new Set<string>();
  value.receipts.forEach((receipt, index) => {
    if (receipt.sequence !== index) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["receipts", index, "sequence"], message: "receipt sequence must be contiguous and zero-based" });
    }
    if (commandIds.has(receipt.commandIdHash)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["receipts", index, "commandIdHash"], message: "mutation command hashes must be unique" });
    }
    commandIds.add(receipt.commandIdHash);
    if (receipt.authority.sourceMessageIdHash !== value.sourceMessageIdHash) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["receipts", index, "authority", "sourceMessageIdHash"], message: "every receipt authority must bind the batch source message" });
    }
    const expectedBefore = index === 0
      ? value.initialCartStateHash
      : value.receipts[index - 1]!.afterCartStateHash;
    if (receipt.beforeCartStateHash !== expectedBefore) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["receipts", index, "beforeCartStateHash"], message: "receipt chain must connect before to prior after" });
    }
    if (index < value.receipts.length - 1 &&
      receipt.afterCartStateHash === value.finalCartStateHash) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["receipts", index, "afterCartStateHash"], message: "only the final receipt may bind the final cart state" });
    }
  });
  if (value.receipts.at(-1)?.afterCartStateHash !== value.finalCartStateHash) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["finalCartStateHash"], message: "only the final receipt may bind the final cart state" });
  }
});
export type CartMutationBatchEvidenceV1 = z.infer<
  typeof CartMutationBatchEvidenceV1Schema
>;

export function cartMutationBatchEvidenceHashPreimageV1(
  input: z.input<typeof CartMutationBatchEvidenceV1Schema>,
): string {
  const { evidenceHash: _evidenceHash, ...batch } = CartMutationBatchEvidenceV1Schema.parse(input);
  return `CART_MUTATION_BATCH_EVIDENCE_V1\n${canonicalJsonV1(batch)}`;
}
