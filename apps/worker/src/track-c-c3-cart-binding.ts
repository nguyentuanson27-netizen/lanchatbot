import {
  buildProtectedCartPolicyClaimsV1,
} from "@lana/business-tools";
import {
  CartV1Schema,
  canonicalJsonV1,
  type CartV1,
  type ProtectedClaimV1,
} from "@lana/contracts";

/** One canonical cart and its pinned policy, captured for a single decision. */
export type TrackCCurrentCartBinding = Readonly<{
  cart: CartV1;
  cartExpiresAt: string;
  policySourceVersion: string;
  policyEvidenceRef: string;
  claimExpiresAt: string;
}>;

export function trackCCurrentCartClaims(
  binding: TrackCCurrentCartBinding,
  at: Date,
): readonly ProtectedClaimV1[] {
  const cart = CartV1Schema.parse(binding.cart);
  if (!Number.isFinite(at.getTime()) ||
      Date.parse(binding.cartExpiresAt) <= at.getTime() ||
      Date.parse(binding.claimExpiresAt) <= at.getTime() ||
      Date.parse(binding.claimExpiresAt) > Date.parse(binding.cartExpiresAt) ||
      binding.policySourceVersion.trim() === "" ||
      binding.policyEvidenceRef.trim() === "") {
    throw new Error("TRACK_C_CURRENT_CART_BINDING_STALE");
  }
  return buildProtectedCartPolicyClaimsV1({
    cart,
    policySourceVersion: binding.policySourceVersion,
    policyEvidenceRef: binding.policyEvidenceRef,
    expiresAt: binding.claimExpiresAt,
    includeNegativeFreeShipping: true,
  });
}

export function trackCCartClaimIsCurrent(
  claim: ProtectedClaimV1,
  binding: TrackCCurrentCartBinding | null,
  at: Date,
): boolean {
  if (claim.scope.kind !== "CART" || binding === null ||
      claim.scope.cartId !== binding.cart.cartId ||
      claim.scope.cartVersion !== binding.cart.revision) return false;
  return trackCCurrentCartClaims(binding, at).some((current) =>
    current.claimId === claim.claimId &&
    canonicalJsonV1(current) === canonicalJsonV1(claim)
  );
}
