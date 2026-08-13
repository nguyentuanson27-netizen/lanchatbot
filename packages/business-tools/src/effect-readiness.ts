import {
  canonicalBuyingIntentAuthorizesCartMutationV1,
  canonicalizeReadinessProductIdsV1,
  DeterministicEffectReadinessV1Schema,
  validateEffectClaimSemanticsV1,
  type CanonicalBuyingIntentV1,
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
  readonly orderPreviewId: string | null;
  readonly orderPreviewHash: string | null;
  readonly buyingIntent: CanonicalBuyingIntentV1 | null;
  readonly claims: readonly ProtectedClaimV1[];
  readonly protectedClaimTypes?: readonly ProtectedClaimV1["type"][];
  readonly deterministicEvidenceHash?: string | null;
  readonly mutationAction?: "ADD_LINE" | "REMOVE_LINE" | "SET_QUANTITY" | null;
  readonly checkedAt: Date;
}

export function evaluateDeterministicEffectReadinessV1(
  input: EvaluateDeterministicEffectReadinessV1Input,
): DeterministicEffectReadinessV1 {
  const reasons = new Set<DeterministicEffectReadinessV1["reasonCodes"][number]>();
  const canonicalProducts = canonicalizeReadinessProductIdsV1(input.productIds);
  const productIds = canonicalProducts.productIds;
  if (canonicalProducts.unresolved) reasons.add("PRODUCT_UNRESOLVED");
  if (canonicalProducts.invalid) reasons.add("PRODUCT_SCOPE_INVALID");
  if (canonicalProducts.capacityExceeded) reasons.add("CART_CAPACITY_EXCEEDED");

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
  const claimSemantics = validateEffectClaimSemanticsV1({
    effect: input.effect,
    productIds,
    cartId: input.cartId,
    cartVersion: input.cartVersion,
    protectedClaimTypes: input.protectedClaimTypes ?? [],
    claims: input.claims,
  });
  if (claimSemantics.missing) reasons.add("CLAIM_MISSING");
  if (input.effect === "PROTECTED_OUTBOUND" &&
    (input.protectedClaimTypes?.length ?? 0) === 0 &&
    !input.deterministicEvidenceHash) {
    reasons.add("CLAIM_MISSING");
  }
  if (input.effect === "PURCHASE_CONFIRMATION" &&
    !input.deterministicEvidenceHash) {
    reasons.add("DETERMINISTIC_EVIDENCE_MISSING");
  }
  if (claimSemantics.conflict) reasons.add("CLAIM_CONFLICT");

  const needsCart = input.effect === "CART_MUTATION" ||
    input.effect === "ORDER_PREVIEW" || input.effect === "PURCHASE_CONFIRMATION";
  if (needsCart && (input.cartId === null || input.cartVersion === null)) {
    reasons.add("CART_REQUIRED");
  }
  if (input.effect !== "PROTECTED_OUTBOUND" && input.cartStateHash === null) {
    reasons.add("CART_STATE_BINDING_MISSING");
  }
  if (input.effect === "PURCHASE_CONFIRMATION" &&
    (input.orderPreviewId === null || input.orderPreviewHash === null)) {
    reasons.add("ORDER_PREVIEW_REQUIRED");
  }

  const freshExpiries = input.claims
    .map((claim) => Date.parse(claim.provenance.expiresAt))
    .filter((expiry) => Number.isFinite(expiry) && expiry > nowMs);
  const expiresAtMs = Math.min(nowMs + 60_000, ...freshExpiries);
  return DeterministicEffectReadinessV1Schema.parse({
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
    claimSetHash: input.claims.length === 0 ? null : hashProtectedClaimSetV1(input.claims),
    protectedClaimTypes: [...new Set(input.protectedClaimTypes ?? [])].sort(),
    checkedAt: input.checkedAt.toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    reasonCodes: [...reasons].sort(),
    authorization: "NONE",
  });
}
