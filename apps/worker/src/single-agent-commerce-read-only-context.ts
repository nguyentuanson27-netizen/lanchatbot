import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import type { RuntimePolicyBundle } from "@lana/chat-runtime";
import type { RuntimeProductEvidence, TrustedContext } from "./single-agent-semantic-verifier-boundary.js";

export const commerceHash = (value: unknown): string =>
  createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
const stateFields = ["conversationOwner", "revision", "currentProductId", "consideredSize", "salesStage",
  "bindingVersion", "recipient", "permission", "privacyAllowed", "customerProfileId", "customerProfileRevision", "measurementFingerprint"];

/** The resolver already validates artifact hashes/lifecycle. This bridge owns scope and public projection. */
export function publicPolicyLiteral(bundle: RuntimePolicyBundle, pageId: string, shopId: string, now: Date): TrustedContext["policyLiterals"][number] {
  const policy = bundle.policy, shop = bundle.artifacts.shopPolicy;
  if (bundle.pageId !== pageId || policy.shopId !== shopId || shop.shopId !== shopId || policy.status !== "ACTIVE" ||
    Date.parse(policy.effectiveAt) > now.getTime() ||
    (policy.effectiveUntil !== null && Date.parse(policy.effectiveUntil) <= now.getTime())) throw new Error("POLICY_SCOPE_OR_FRESHNESS");
  const version = commerceHash({ policyVersion: policy.policyVersion,
    references: [...bundle.versionReferences].sort((a, b) => a.artifactKey.localeCompare(b.artifactKey)) });
  return { ref: `policy:${version}`, sourceVersion: version, observedAt: shop.sourceMetadata.observedAt,
    // Existing policy effectiveUntil=null is versioned, not a fabricated expiry. Active pointers are re-read at the final gate.
    expiresAt: policy.effectiveUntil,
    text: canonicalJsonV1({ customerCare: shop.customerCare ?? null,
      shipping: { defaultFeeVnd: policy.shipping.defaultFeeVnd }, multiItemOffer: {
        minimumProductCount: policy.multiItemOffer.minimumProductCount, discountBps: policy.multiItemOffer.discountBps,
        countingUnit: policy.multiItemOffer.countingUnit, setAndComboCountAsOne: policy.multiItemOffer.setAndComboCountAsOne,
      } }),
  };
}

/** Mechanical projection only: never selects relevant history or interprets customer language. */
export function buildReadOnlyContext(input: {
  state: TrustedContext["state"];
  subjects?: TrustedContext["boundSubjects"];
  claims?: unknown[];
  products?: RuntimeProductEvidence[];
  policies?: TrustedContext["policyLiterals"];
  receipts?: TrustedContext["effectReceipts"];
  cartBinding?: TrustedContext["cartBinding"];
}): TrustedContext {
  const subjects = [...(input.subjects ?? [])].sort((a, b) => a.ref.localeCompare(b.ref));
  const products = [...(input.products ?? [])].sort((a, b) => a.ref.localeCompare(b.ref));
  const claims = [...(input.claims ?? [])].sort((a, b) => canonicalJsonV1(a).localeCompare(canonicalJsonV1(b)));
  const policies = [...(input.policies ?? [])].sort((a, b) => a.ref.localeCompare(b.ref));
  const state = Object.fromEntries(stateFields.filter(k => Object.hasOwn(input.state, k)).map(k => [k, input.state[k]]));
  state.factSnapshotVersion = commerceHash({ subjects, products, claims, policies, cart: input.cartBinding ?? null });
  const context = { boundSubjects: subjects, protectedClaims: claims, runtimeProducts: products,
    policyLiterals: policies, effectReceipts: input.receipts ?? [], state,
    ...(input.cartBinding ? { cartBinding: input.cartBinding } : {}) };
  // Canonical key ordering keeps the existing exact-snapshot binding stable on unchanged source readback.
  return JSON.parse(canonicalJsonV1(context)) as TrustedContext;
}
