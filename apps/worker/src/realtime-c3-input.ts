import {
  buildProtectedClaimsFromVerifiedFactSetV1,
  buildProductPresentationEvidenceV1,
  type CanonicalDecisionEvidenceV1,
} from "@lana/business-tools";
import {
  FinalTurnEvidenceV2Schema,
  ProductBindingV2Schema,
  canonicalJsonV1,
  type BusinessFactEnvelopeV1,
  type DeterministicEffectReadinessV1,
  type ProductFactsV2,
  type ProtectedClaimV1,
} from "@lana/contracts";
import {
  outboundRuntimePolicy,
  runtimePolicyBundleReference,
  type RuntimePolicyResolution,
  type SalesCycleRuntimeState,
} from "@lana/chat-runtime";
import { buildContextV2 } from "./context-v2.js";
import { missingRealtimeCheckoutFields } from "./realtime-sales-cycle.js";
import {
  trackCCurrentCartClaims,
  type TrackCCurrentCartBinding,
} from "./track-c-c3-cart-binding.js";

/** Built after the commerce transition, before C3 chooses or writes a reply. */
export function buildRealtimeC3Input(input: Readonly<{
  sourceMessagePk: string;
  canonicalEvidence: CanonicalDecisionEvidenceV1;
  preConversationRevision: number;
  finalConversationRevision: number;
  preSalesRevision: number;
  commerceState: SalesCycleRuntimeState;
  productId: string | null;
  catalogVersion: string | null;
  facts: readonly BusinessFactEnvelopeV1[];
  productFacts: ProductFactsV2 | null;
  policyResolution: RuntimePolicyResolution | null;
  cartReadiness: readonly DeterministicEffectReadinessV1[];
  now: Date;
}>) {
  const finalTurnEvidence = FinalTurnEvidenceV2Schema.parse({
    schemaVersion: 2,
    contractVersion: "FINAL_TURN_EVIDENCE_V2",
    sourceMessagePk: input.sourceMessagePk,
    sourceMessageIdHash: input.canonicalEvidence.buyingIntent.sourceMessageIdHash,
    preTransitionConversationRevision: input.preConversationRevision,
    finalConversationRevision: input.finalConversationRevision,
    preTransitionSalesCycleRevision: input.preSalesRevision,
    finalSalesCycleRevision: input.commerceState.revision,
  });
  const productBinding = ProductBindingV2Schema.parse({
    schemaVersion: 2,
    contractVersion: "PRODUCT_BINDING_V2",
    status: input.productId === null ? "UNRESOLVED" : "RESOLVED",
    productIds: input.productId === null ? [] : [input.productId],
    catalogVersion: input.catalogVersion,
  });
  const productClaims = buildProtectedClaimsFromVerifiedFactSetV1({
    facts: input.facts,
    sizeClaim: null,
  }).claims.filter((claim) =>
    claim.type !== "ETA" &&
    claim.scope.kind === "PRODUCT" &&
    claim.scope.productId === input.productId &&
    Date.parse(claim.provenance.expiresAt) > input.now.getTime()
  );
  const bundle = outboundRuntimePolicy(input.policyResolution);
  const cart = input.commerceState.cart;
  const pinnedPolicy = input.commerceState.commerceContext?.policyRef;
  const currentPolicy = bundle === null ? null : runtimePolicyBundleReference(bundle);
  const readbackReady = cart !== null && input.cartReadiness.some((readiness) =>
    readiness.effect === "CART_READY" && readiness.outcome === "READY" &&
    readiness.cartId === cart.value.cartId &&
    readiness.cartVersion === cart.value.revision
  );
  const currentCart: TrackCCurrentCartBinding | null = cart === null ||
      !readbackReady ||
      bundle === null || pinnedPolicy === undefined || pinnedPolicy === null ||
      currentPolicy === null ||
      canonicalJsonV1(pinnedPolicy) !== canonicalJsonV1(currentPolicy)
    ? null
    : {
        cart: cart.value,
        cartExpiresAt: cart.expiresAt,
        policySourceVersion: `${bundle.policy.policyBundleId}:${bundle.policy.policyVersion}`,
        policyEvidenceRef: `policy:${currentPolicy.contentHash}`,
        claimExpiresAt: new Date(Math.min(
          Date.parse(cart.expiresAt),
          bundle.policy.effectiveUntil === null
            ? Number.POSITIVE_INFINITY
            : Date.parse(bundle.policy.effectiveUntil),
        )).toISOString(),
      };
  let cartClaims: readonly ProtectedClaimV1[] = [];
  if (currentCart !== null) {
    try {
      cartClaims = trackCCurrentCartClaims(currentCart, input.now);
    } catch {
      // Invalid or expired cart facts do not erase independent product facts.
    }
  }
  const productPresentation = input.productFacts === null ? null :
    buildProductPresentationEvidenceV1(input.productFacts, input.now);
  const context = buildContextV2({
    canonicalEvidence: input.canonicalEvidence,
    verifiedClaims: [...productClaims, ...cartClaims].slice(0, 32),
    finalCommerceState: input.commerceState,
    readiness: [],
    finalTurnEvidence,
    productBinding,
    ...(input.productFacts?.attributes === undefined
      ? {} : { productAttributes: input.productFacts.attributes }),
    ...(productPresentation === null ? {} : { productPresentation }),
    owner: "BOT",
    handoffReasonCode: null,
    now: input.now,
  });
  return Object.freeze({
    context,
    currentCart: cartClaims.length === 0 ? null : currentCart,
    checkoutRequestedFields: input.commerceState.stage === "CART_OPEN" ||
        input.commerceState.stage === "ORDER_PREVIEW"
      ? missingRealtimeCheckoutFields(input.commerceState)
      : [],
    paymentOptions: bundle?.artifacts.paymentPolicy?.bankTransfer
      ? ["COD", "BANK_TRANSFER"] as const
      : ["COD"] as const,
  });
}
