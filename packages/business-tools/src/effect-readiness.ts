import {
  DeterministicEffectReadinessV1Schema,
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
  readonly orderPreviewId: string | null;
  readonly orderPreviewHash: string | null;
  readonly buyingIntent: CanonicalBuyingIntentV1 | null;
  readonly claims: readonly ProtectedClaimV1[];
  readonly protectedClaimTypes?: readonly ProtectedClaimV1["type"][];
  readonly deterministicEvidenceHash?: string | null;
  readonly checkedAt: Date;
}

function scopeKey(claim: ProtectedClaimV1): string {
  return JSON.stringify(claim.scope);
}

function requiredClaimTypes(
  input: EvaluateDeterministicEffectReadinessV1Input,
): readonly ProtectedClaimV1["type"][] {
  if (input.effect === "PROTECTED_OUTBOUND") return input.protectedClaimTypes ?? [];
  if (input.effect === "CART_OPEN" || input.effect === "CART_MUTATION") {
    return ["PRICE", "STOCK"];
  }
  return ["PRICE", "STOCK", "ETA"];
}

const CART_SCOPED_CLAIM_TYPES = new Set<ProtectedClaimV1["type"]>([
  "SHIPPING_FEE",
  "FREESHIP",
  "PROMOTION_OFFER",
]);

export function evaluateDeterministicEffectReadinessV1(
  input: EvaluateDeterministicEffectReadinessV1Input,
): DeterministicEffectReadinessV1 {
  const reasons = new Set<DeterministicEffectReadinessV1["reasonCodes"][number]>();
  const canonicalProductIds = [...new Set(input.productIds)].sort();
  const productIds = canonicalProductIds.slice(0, 50);
  if (productIds.length === 0) reasons.add("PRODUCT_UNRESOLVED");
  if (canonicalProductIds.length !== input.productIds.length || canonicalProductIds.length > 3) {
    reasons.add("PRODUCT_AMBIGUOUS");
  }

  const requiresIntent = input.effect === "CART_OPEN";
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
  if (input.effect === "CART_MUTATION" &&
    !input.deterministicEvidenceHash &&
    (input.buyingIntent?.decision !== "COMMITTED" ||
      !input.buyingIntent.contributors.includes("DETERMINISTIC_RUNTIME"))) {
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
  for (const productId of productIds) {
    for (const type of requiredClaimTypes(input).filter((value) =>
      !CART_SCOPED_CLAIM_TYPES.has(value)
    )) {
      const matching = input.claims.filter((claim) =>
        claim.type === type && claim.scope.kind === "PRODUCT" &&
        claim.scope.productId === productId
      );
      if (matching.length === 0) reasons.add("CLAIM_MISSING");
    }
  }
  for (const type of requiredClaimTypes(input).filter((value) =>
    CART_SCOPED_CLAIM_TYPES.has(value)
  )) {
    if (!input.claims.some((claim) => claim.type === type && claim.scope.kind === "CART" &&
      claim.scope.cartId === input.cartId && claim.scope.cartVersion === input.cartVersion)) {
      reasons.add("CLAIM_MISSING");
    }
  }
  if (input.effect === "PROTECTED_OUTBOUND" &&
    (input.protectedClaimTypes?.length ?? 0) === 0 &&
    !input.deterministicEvidenceHash) {
    reasons.add("CLAIM_MISSING");
  }
  if (input.effect === "PURCHASE_CONFIRMATION" &&
    !input.deterministicEvidenceHash) {
    reasons.add("DETERMINISTIC_EVIDENCE_MISSING");
  }
  const contentByClaimKey = new Map<string, Set<string>>();
  for (const claim of input.claims) {
    if (claim.type === "PRODUCT_MEDIA" || claim.type === "PROMOTION_OFFER") continue;
    const key = `${claim.type}:${scopeKey(claim)}`;
    const values = contentByClaimKey.get(key) ?? new Set<string>();
    values.add(claim.provenance.contentHash);
    contentByClaimKey.set(key, values);
  }
  if ([...contentByClaimKey.values()].some((values) => values.size > 1)) {
    reasons.add("CLAIM_CONFLICT");
  }

  const needsCart = input.effect === "CART_MUTATION" ||
    input.effect === "ORDER_PREVIEW" || input.effect === "PURCHASE_CONFIRMATION";
  if (needsCart && (input.cartId === null || input.cartVersion === null)) {
    reasons.add("CART_REQUIRED");
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
