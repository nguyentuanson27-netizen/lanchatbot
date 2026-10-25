import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import type { RuntimePolicyBundle } from "@lana/chat-runtime";
import type { RuntimeProductEvidence, TrustedContext } from "./single-agent-semantic-verifier-boundary.js";

export const commerceHash = (value: unknown): string =>
  createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
export const commerceUuid = (hash: string): string =>
  `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;

/** Remove only exact product-field duplicates already supplied in the current snapshot.
 * Used for response-budget accounting and owner wire projection; never mutate stored results. */
export function omitCurrentProductDuplicates(value: Record<string, unknown>, current: RuntimeProductEvidence | undefined) {
  const projected = {...value};
  for (const key of ["content", "attributes", "presentation", "sizeCharts"] as const) {
    if (projected[key] !== undefined && current?.[key] !== undefined &&
      canonicalJsonV1(projected[key]) === canonicalJsonV1(current[key])) delete projected[key];
  }
  return projected;
}
const stateFields = ["conversationOwner", "revision", "currentProductId", "consideredSize", "salesStage",
  "bindingVersion", "recipient", "permission", "privacyAllowed", "customerProfileId", "customerProfileRevision", "measurementFingerprint",
  "customerMeasurements", "fitPreference", "preferences", "cartQuote", "cartItems", "checkoutStatus", "sizeMeasurementFingerprints", "conversationRevision", "customerStateUpdatePending"];

/** The resolver already validates artifact hashes/lifecycle. This bridge owns scope and public projection. */
export function publicPolicyLiteral(bundle: RuntimePolicyBundle, pageId: string, shopId: string, now: Date): TrustedContext["policyLiterals"][number] {
  const policy = bundle.policy, shop = bundle.artifacts.shopPolicy;
  if (bundle.pageId !== pageId || policy.shopId !== shopId || shop.shopId !== shopId || policy.status !== "ACTIVE" ||
    Date.parse(policy.effectiveAt) > now.getTime() ||
    (policy.effectiveUntil !== null && Date.parse(policy.effectiveUntil) <= now.getTime())) throw new Error("POLICY_SCOPE_OR_FRESHNESS");
  const version = commerceHash({ policyVersion: policy.policyVersion,
    references: [...bundle.versionReferences].sort((a, b) => a.artifactKey.localeCompare(b.artifactKey)) });
  const care = shop.customerCare;
  return { ref: `policy:${version}`, sourceVersion: version, observedAt: shop.sourceMetadata.observedAt,
    // Existing policy effectiveUntil=null is versioned, not a fabricated expiry. Active pointers are re-read at the final gate.
    expiresAt: policy.effectiveUntil,
    // Shared source meaning for both models, including the owner-approved relation
    // between HOLD_UP_ONLY and unused exchange stock. Not a customer eligibility decision.
    text: canonicalJsonV1({ customerCare: care ? { ...care, inspection: { ...care.inspection,
      ...(care.inspection.tryOnMode === "HOLD_UP_ONLY"
        ? { tryOnModeDescription: "Chỉ ướm bên ngoài, không mặc vào người." +
          (care.exchange.requiredConditions.unused
            ? " Với đổi hàng yêu cầu chưa sử dụng, mặc thử vào người không đáp ứng điều kiện này; còn tem, chưa giặt hay chưa mặc ra ngoài không thay đổi kết luận đó. Giới hạn này áp dụng cho đổi hàng theo exchange, không tự loại trừ trả hàng do lỗi theo returns."
            : "") } : {}),
    } } : null,
      payment: { allowedMethods: shop.allowedPaymentMethods },
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
  const seen = new Set<string>();
  const claims = [...(input.claims ?? [])].filter(c => { const serialized = canonicalJsonV1(c);
    if (seen.has(serialized)) return false; seen.add(serialized); return true;
  }).sort((a, b) => canonicalJsonV1(a).localeCompare(canonicalJsonV1(b)));
  const policies = [...(input.policies ?? [])].sort((a, b) => a.ref.localeCompare(b.ref));
  const state = Object.fromEntries(stateFields.filter(k => Object.hasOwn(input.state, k)).map(k => [k, input.state[k]]));
  state.factSnapshotVersion = commerceHash({ subjects, products, claims, policies, cart: input.cartBinding ?? null });
  const context = { boundSubjects: subjects, protectedClaims: claims, runtimeProducts: products,
    policyLiterals: policies, effectReceipts: input.receipts ?? [], state,
    ...(input.cartBinding ? { cartBinding: input.cartBinding } : {}) };
  // Canonical key ordering keeps the existing exact-snapshot binding stable on unchanged source readback.
  return JSON.parse(canonicalJsonV1(context)) as TrustedContext;
}
