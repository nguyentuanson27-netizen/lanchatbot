import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { canonicalJsonV1 } from "./canonical-commerce-bindings.js";
import { canonicalCartVariantScopeV2, validateCartEffectClaimSemanticsV1, type ProtectedClaimV1 } from "./canonical-evidence-readiness.js";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const line = (size: string, quantity = 1, offerId = "AO", parentProductId = "SV2447") => ({
  parentProductId, offerId, quantity, posUnitPriceVnd: 499000, priceFactRef: "price-v1",
  components: [{ componentProductId: "SV2447_AO", componentSku: "SV2447_AO", componentRole: "TOP" as const,
    size, color: "__NO_COLOR__", quantity: 1 }],
});
const scope = (l: ReturnType<typeof line>) => "cv2:" + hash(canonicalJsonV1({
  version: "CART_VARIANT_SCOPE_V2", parentProductId: l.parentProductId, offerId: l.offerId, components: l.components,
}));
const claims = (l: ReturnType<typeof line>, stock: number, legacy = false): ProtectedClaimV1[] => ["PRICE", "STOCK"].map((type, i) => ({
  schemaVersion: 1, claimId: `00000000-0000-4000-8000-00000000000${i}`,
  type, scope: { kind: "PRODUCT", productId: l.parentProductId, variantId: legacy ? l.offerId : scope(l) },
  provenance: { authority: "POS_SNAPSHOT", sourceVersion: type === "PRICE" ? "price-v1" : "stock-v1",
    evidenceRef: "fixture", contentHash: hash(type === "PRICE" ? "499000" : String(stock)),
    observedAt: "2026-10-30T00:00:00.000Z", expiresAt: "2026-10-30T00:05:00.000Z" },
  value: type === "PRICE" ? { amountVnd: 499000, currency: "VND" } : { status: "IN_STOCK", availableQuantity: stock },
  authorization: "NONE",
} as ProtectedClaimV1));
const check = (lines: ReturnType<typeof line>[], c = lines.flatMap(l => claims(l, l.components[0]!.size === "M" ? 14 : 8))) =>
  validateCartEffectClaimSemanticsV1({ effect: "CART_MUTATION", lines, claims: c, variantHash: hash } as Parameters<typeof validateCartEffectClaimSemanticsV1>[0]);

describe("cart variant claim readiness", () => {
  it("keeps identity stable under line identity/quantity/price and component ordering, not multiplicity", () => {
    const a=line("M"), b={...a,components:[...a.components,{...a.components[0]!,componentProductId:"OTHER",componentSku:"OTHER",componentRole:"TOP" as const}]};
    expect(canonicalCartVariantScopeV2(a,hash)).toBe(scope(a));
    expect(canonicalCartVariantScopeV2({...a,quantity:9} as typeof a,hash)).toBe(scope(a));
    expect(canonicalCartVariantScopeV2(b,hash)).toBe(canonicalCartVariantScopeV2({...b,components:[...b.components].reverse()},hash));
    expect(canonicalCartVariantScopeV2({...a,components:[...a.components,...a.components]},hash)).not.toBe(scope(a));
  });
  it("fails closed without a local SHA256 implementation or with an invalid digest", () => {
    const m=line("M");
    expect(validateCartEffectClaimSemanticsV1({effect:"CART_MUTATION",lines:[m],claims:claims(m,14)}).mismatch).toBe(true);
    expect(validateCartEffectClaimSemanticsV1({effect:"CART_MUTATION",lines:[m],claims:claims(m,14),variantHash:()=>"fake"}).mismatch).toBe(true);
  });
  it("accepts independent M14/L8 scopes without an offer-wide stock conflict", () => {
    expect(check([line("M"), line("L")])).toEqual({ missing: false, conflict: false, mismatch: false });
  });
  it("aggregates repeated M demand, never one capacity per line", () => {
    expect(check([line("M", 7), line("M", 7)])).toEqual({ missing: false, conflict: false, mismatch: false });
    expect(check([line("M", 8), line("M", 7)]).mismatch).toBe(true);
  });
  it("blocks same-component aliases even when each offer has enough stock", () => {
    expect(check([line("M"), line("M", 1, "SET")]).mismatch).toBe(true);
    const other=line("M",1,"SET","SQ2447");other.components[0]!.componentSku="SV2447_AO_M";
    expect(check([line("M"),other]).mismatch).toBe(true);
    const unknown=line("L",1,"SET");unknown.components[0]!.size=null as unknown as string;
    expect(check([line("M"),unknown]).mismatch).toBe(true);
  });
  it("keeps conflict, source-price matching, missing evidence and tamper guards", () => {
    const m=line("M");
    expect(check([m],[...claims(m,14),...claims(m,3)]).conflict).toBe(true);
    expect(check([{...m,priceFactRef:"other"}],claims(m,14)).mismatch).toBe(true);
    expect(check([m],[]).missing).toBe(true);
    expect(check([line("L")],claims(m,14)).mismatch).toBe(true);
  });
  it("rejects mixed namespaces and legacy scopes across distinct sizes", () => {
    const m = line("M"), l = line("L");
    expect(check([m,l], [...claims(m,14), ...claims(l,8,true)]).mismatch).toBe(true);
    expect(check([m,l], [...claims(m,14,true), ...claims(l,8,true)]).mismatch).toBe(true);
  });
});
