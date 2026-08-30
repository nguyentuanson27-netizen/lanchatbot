import { createHash } from "node:crypto";
import {
  canonicalCartOfferBindingsV1,
  canonicalBuyingIntentAuthorizesCartOpenV1,
  canonicalBuyingIntentAuthorizesCartMutationV1,
  canonicalizeReadinessProductIdsV1,
  DeterministicEffectReadinessV1Schema,
  deterministicEffectReadinessHashPreimageV1,
  effectBindingHashPreimageV1,
  MAX_CART_LINES_V1,
  MAX_EFFECT_READINESS_LIFETIME_MS_V1,
  validateCartEffectClaimSemanticsV1,
  validateEffectClaimSemanticsV1,
  type CanonicalBuyingIntentV1,
  type CartLineV1,
  type DeterministicEffectReadinessV1,
  type ProtectedClaimV1,
} from "@lana/contracts";
import { hashCanonicalBuyingIntentV1 } from "./canonical-evidence.js";
import { hashProtectedClaimSetV1 } from "./protected-claims.js";

export interface EvaluateDeterministicEffectReadinessV1Input {
  readonly effect: DeterministicEffectReadinessV1["effect"];
  readonly pageId: string;
  readonly conversationId: string;
  readonly sourceMessageIdHash: string;
  readonly conversationRevision: number;
  readonly salesCycleRevision: number | null;
  readonly productIds: readonly string[];
  readonly cartId: string | null;
  readonly cartVersion: number | null;
  readonly cartStateHash: string | null;
  readonly cartLines?: readonly CartLineV1[];
  readonly orderPreviewId: string | null;
  readonly orderPreviewHash: string | null;
  readonly buyingIntent: CanonicalBuyingIntentV1 | null;
  readonly claims: readonly ProtectedClaimV1[];
  readonly protectedClaimTypes?: readonly ProtectedClaimV1["type"][];
  readonly deterministicEvidenceHash?: string | null;
  readonly parentReadinessHash?: string | null;
  readonly payloadHash?: string | null;
  readonly mutationAction?: "ADD_LINE" | "REMOVE_LINE" | "SET_QUANTITY" | null;
  readonly mutationQuantity?: number | null;
  readonly checkedAt: Date;
}

export function evaluateDeterministicEffectReadinessV1(
  input: EvaluateDeterministicEffectReadinessV1Input,
): DeterministicEffectReadinessV1 {
  const reasons = new Set<DeterministicEffectReadinessV1["reasonCodes"][number]>();
  const canonicalProducts = canonicalizeReadinessProductIdsV1(input.productIds);
  const productIds = [...canonicalProducts.productIds];
  if (canonicalProducts.unresolved) reasons.add("PRODUCT_UNRESOLVED");
  if (canonicalProducts.invalid) reasons.add("PRODUCT_SCOPE_INVALID");
  const usesCartCapacity = input.effect === "CART_OPEN" ||
    input.effect === "CART_MUTATION" || input.effect === "CART_READY";
  if (usesCartCapacity && productIds.length > MAX_CART_LINES_V1) {
    reasons.add("CART_CAPACITY_EXCEEDED");
  }

  const requiresIntent = input.effect === "CART_OPEN" || (
    input.effect === "CART_MUTATION" && input.mutationAction !== "REMOVE_LINE"
  );
  if (requiresIntent) {
    if (input.buyingIntent?.decision !== "COMMITTED") {
      reasons.add("BUYING_INTENT_MISSING");
    } else if (!input.buyingIntent.contributors.includes("DETERMINISTIC_RUNTIME")) {
      reasons.add("BUYING_INTENT_MISSING");
    } else if (
      input.buyingIntent.productId === null ||
      !productIds.includes(input.buyingIntent.productId)
    ) {
      reasons.add("BUYING_INTENT_SCOPE_MISMATCH");
    } else if (input.effect === "CART_OPEN") {
      const seedLine = input.cartLines?.find(({ parentProductId }) =>
        parentProductId === input.buyingIntent?.productId
      );
      if (seedLine === undefined || !canonicalBuyingIntentAuthorizesCartOpenV1(
        input.buyingIntent,
        seedLine.parentProductId,
        seedLine.quantity,
      )) reasons.add("BUYING_INTENT_SCOPE_MISMATCH");
    }
  }
  if (
    input.effect === "CART_MUTATION" &&
    input.mutationAction !== null &&
    input.mutationAction !== undefined &&
    input.mutationAction !== "REMOVE_LINE" &&
    input.buyingIntent !== null &&
    input.buyingIntent.productId !== null &&
    !canonicalBuyingIntentAuthorizesCartMutationV1(
      input.buyingIntent,
      input.mutationAction,
      input.buyingIntent.productId,
      input.mutationQuantity ?? -1,
    )
  ) reasons.add("BUYING_INTENT_SCOPE_MISMATCH");
  if (input.effect === "CART_MUTATION" && !input.deterministicEvidenceHash) {
    reasons.add("DETERMINISTIC_EVIDENCE_MISSING");
  }

  const nowMs = input.checkedAt.getTime();
  for (const claim of input.claims) {
    if (Date.parse(claim.provenance.expiresAt) <= nowMs) {
      reasons.add("CLAIM_STALE");
    }
    if (claim.scope.kind === "PRODUCT" && !productIds.includes(claim.scope.productId)) {
      reasons.add("CLAIM_SCOPE_MISMATCH");
    }
    if (claim.scope.kind === "CART" &&
      (claim.scope.cartId !== input.cartId || claim.scope.cartVersion !== input.cartVersion)) {
      reasons.add("CLAIM_SCOPE_MISMATCH");
    }
  }
  const claimSemantics = input.cartLines === undefined
    ? validateEffectClaimSemanticsV1({
        effect: input.effect,
        productIds,
        cartId: input.cartId,
        cartVersion: input.cartVersion,
        protectedClaimTypes: input.protectedClaimTypes ?? [],
        claims: input.claims,
      })
    : validateCartEffectClaimSemanticsV1({
        effect: input.effect,
        lines: input.cartLines.map((line) => ({
          parentProductId: line.parentProductId,
          offerId: line.offerId,
          quantity: line.quantity,
          posUnitPriceVnd: line.posUnitPriceVnd,
          priceFactRef: line.priceAuthority?.priceFactRef ?? null,
        })),
        cartId: input.cartId,
        cartVersion: input.cartVersion,
        protectedClaimTypes: input.protectedClaimTypes ?? [],
        claims: input.claims,
      });
  if (claimSemantics.missing) reasons.add("CLAIM_MISSING");
  if ("mismatch" in claimSemantics && claimSemantics.mismatch) {
    reasons.add("OFFER_BINDING_MISMATCH");
  }
  if (input.effect === "PROTECTED_OUTBOUND" &&
    (input.protectedClaimTypes?.length ?? 0) === 0 &&
    !input.deterministicEvidenceHash) {
    reasons.add("CLAIM_MISSING");
  }
  if ((input.effect === "PURCHASE_CONFIRMATION" ||
    input.effect === "PURCHASE_CONFIRMATION_READY") &&
    !input.deterministicEvidenceHash) {
    reasons.add("DETERMINISTIC_EVIDENCE_MISSING");
  }
  if (claimSemantics.conflict) reasons.add("CLAIM_CONFLICT");

  const needsCart = input.effect === "CART_OPEN" || input.effect === "CART_MUTATION" ||
    input.effect === "CART_READY" || input.effect === "PREVIEW_READY" ||
    input.effect === "PURCHASE_CONFIRMATION_READY" ||
    input.effect === "ORDER_PREVIEW" || input.effect === "PURCHASE_CONFIRMATION";
  if (needsCart && (input.cartId === null || input.cartVersion === null)) {
    reasons.add("CART_REQUIRED");
  }
  if (input.effect !== "PROTECTED_OUTBOUND" && input.cartStateHash === null) {
    reasons.add("CART_STATE_BINDING_MISSING");
  }
  const needsPreview = input.effect === "PREVIEW_READY" ||
    input.effect === "PURCHASE_CONFIRMATION_READY" ||
    input.effect === "PURCHASE_CONFIRMATION";
  if (needsPreview &&
    (input.orderPreviewId === null || input.orderPreviewHash === null)) {
    reasons.add("ORDER_PREVIEW_REQUIRED");
  }
  const needsParent = input.effect === "PREVIEW_READY" ||
    input.effect === "PURCHASE_CONFIRMATION_READY" ||
    (input.effect === "PROTECTED_OUTBOUND" && input.cartId !== null);
  if (needsParent && !input.parentReadinessHash) reasons.add("PARENT_READINESS_MISSING");

  let offerBindings: ReturnType<typeof canonicalCartOfferBindingsV1> = [];
  if (input.cartLines !== undefined && input.cartLines.length <= MAX_CART_LINES_V1) {
    try {
      offerBindings = canonicalCartOfferBindingsV1(input.cartLines);
    } catch {
      reasons.add("OFFER_BINDING_MISMATCH");
    }
  }
  if (input.cartId !== null && offerBindings.length === 0) {
    reasons.add("CART_STATE_BINDING_MISSING");
  }
  const offerProductIds = [...new Set(offerBindings.map(({ productId }) => productId))]
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const canBindCart = input.cartId !== null && input.cartVersion !== null &&
    input.cartStateHash !== null && offerBindings.length > 0 &&
    offerProductIds.length === productIds.length &&
    offerProductIds.every((productId, index) => productId === productIds[index]);
  if (input.cartId !== null && offerBindings.length > 0 && !canBindCart) {
    reasons.add("OFFER_BINDING_MISMATCH");
  }

  const freshExpiries = input.claims
    .map((claim) => Date.parse(claim.provenance.expiresAt))
    .filter((expiry) => Number.isFinite(expiry) && expiry > nowMs);
  const expiresAtMs = Math.min(
    nowMs + MAX_EFFECT_READINESS_LIFETIME_MS_V1,
    ...freshExpiries,
  );
  const claimSetHash = input.claims.length === 0 ? null : hashProtectedClaimSetV1(input.claims);
  const binding = {
    schemaVersion: 1 as const,
    contractVersion: "EFFECT_BINDING_V1" as const,
    pageId: input.pageId,
    conversationId: input.conversationId,
    sourceMessageIdHash: input.sourceMessageIdHash,
    conversationRevision: input.conversationRevision,
    salesCycleRevision: input.salesCycleRevision,
    productIds,
    cart: !canBindCart
      ? null
      : {
          cartId: input.cartId,
          cartRevision: input.cartVersion,
          cartStateHash: input.cartStateHash,
          offerBindings: [...offerBindings],
        },
    preview: input.orderPreviewId === null || input.orderPreviewHash === null
      ? null
      : { previewId: input.orderPreviewId, previewHash: input.orderPreviewHash },
    claimSetHash,
    parentReadinessHash: input.parentReadinessHash ?? null,
    payloadHash: input.payloadHash ?? null,
  };
  const bindingHash = createHash("sha256")
    .update(effectBindingHashPreimageV1(binding), "utf8")
    .digest("hex");
  const readinessWithoutHash = {
    schemaVersion: 1,
    rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
    effect: input.effect,
    outcome: reasons.size === 0 ? "READY" : "BLOCKED",
    pageId: input.pageId,
    conversationId: input.conversationId,
    sourceMessageIdHash: input.sourceMessageIdHash,
    conversationRevision: input.conversationRevision,
    salesCycleRevision: input.salesCycleRevision,
    productIds,
    cartId: input.cartId,
    cartVersion: input.cartVersion,
    cartStateHash: input.cartStateHash,
    orderPreviewId: input.orderPreviewId,
    orderPreviewHash: input.orderPreviewHash,
    buyingIntentHash: input.buyingIntent === null
      ? null
      : hashCanonicalBuyingIntentV1(input.buyingIntent),
    deterministicEvidenceHash: input.deterministicEvidenceHash ?? null,
    claimSetHash,
    binding,
    bindingHash,
    protectedClaimTypes: [...new Set(input.protectedClaimTypes ?? [])].sort(),
    checkedAt: input.checkedAt.toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    reasonCodes: [...reasons].sort(),
    authorization: "NONE",
  } as const;
  const readinessWithPlaceholder = {
    ...readinessWithoutHash,
    readinessHash: "0".repeat(64),
  };
  const readinessHash = createHash("sha256")
    .update(deterministicEffectReadinessHashPreimageV1(readinessWithPlaceholder), "utf8")
    .digest("hex");
  return DeterministicEffectReadinessV1Schema.parse({
    ...readinessWithoutHash,
    readinessHash,
  });
}
