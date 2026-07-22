import { PolicyBundleV1Schema, type CartLineV1 } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import { applyCanonicalCartDecisionV2, createCanonicalCartV2 } from "./canonical-cart-engine.js";

const now = new Date("2026-07-22T06:00:00.000Z");
const metadata = { authority: "ADMIN_POLICY", sourceVersion: "policy-1", observedAt: "2026-07-22T00:00:00.000Z", expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" } as const;
const policy = PolicyBundleV1Schema.parse({
  schemaVersion: 1, policyBundleId: "lana-sales", policyVersion: "policy-1", shopId: "LANA_DESIGN", status: "ACTIVE",
  effectiveAt: "2026-07-22T00:00:00.000Z", effectiveUntil: null, supersedesPolicyVersion: null, scope: "SHOP_WIDE",
  commerceAuthority: { bomAuthority: "PANCAKE_POS", priceAuthority: "PANCAKE_POS", inventoryAuthority: "PANCAKE_POS", allowGoogleSheetsPriceOverride: false, allowAdminPriceOverride: false, missingPriceBehavior: "DO_NOT_QUOTE", metadata },
  shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata },
  multiItemOffer: { minimumProductCount: 2, discountBps: 500, countingUnit: "PARENT_PRODUCT_UNIT", setAndComboCountAsOne: true, scope: "SHOP_WIDE", metadata },
  negotiation: { secondConcession: { freeShipping: true, fixedDiscountVnd: 0 }, finalConcession: { freeShipping: true, fixedDiscountVnd: 20_000 }, stacking: { multiItemDiscountWithSecondConcession: true, multiItemDiscountWithFinalConcession: true, deduplicateFreeShipping: true }, scope: "SHOP_WIDE", metadata },
  closing: { customerStates: ["READY", "HESITANT", "CAUTIOUS"], decisionMode: "DETERMINISTIC_POLICY_ONLY", allowUnlistedOffers: false, metadata },
});

const line = (lineId: string, parentProductId: string, price = 700_000): CartLineV1 => ({
  lineId, parentProductId, offerId: `${parentProductId}-DIRECT`, offerKind: "DIRECT", quantity: 1,
  components: [{ componentProductId: parentProductId, componentSku: `${parentProductId}-M`, componentRole: "DRESS", color: "BE", size: "M", quantity: 1 }],
  allowMixedSizes: false, allowComponentSale: false, posUnitPriceVnd: price,
  priceAuthority: { priceFactRef: `pos:${parentProductId}`, shopId: "LANA_DESIGN", parentProductId, offerId: `${parentProductId}-DIRECT`, offerPriceKind: "DIRECT", componentProductId: null, metadata: { authority: "PANCAKE_POS", sourceVersion: "pos-1", observedAt: "2026-07-22T05:00:00.000Z", expiresAt: "2026-07-24T05:00:00.000Z", freshForSeconds: 172_800, freshnessState: "FRESH" } },
  lineTotalVnd: price,
});

function created(lines: readonly CartLineV1[]) {
  const result = createCanonicalCartV2({ identity: { cartId: "10000000-0000-4000-8000-000000000001", salesEpisodeId: "11000000-0000-4000-8000-000000000001", customerProfileId: "12000000-0000-4000-8000-000000000001" }, lines, shopId: "LANA_DESIGN", policy, now });
  if (result.status !== "CREATED") throw new Error(result.reasonCode);
  return result.cart;
}

describe("canonical cart engine", () => {
  it("derives totals and 5% multi-item offer instead of accepting caller totals", () => {
    const cart = created([line("13000000-0000-4000-8000-000000000001", "CB182"), line("13000000-0000-4000-8000-000000000002", "SV695", 500_000)]);
    expect(cart).toMatchObject({ revision: 1, subtotalVnd: 1_200_000, discountTotalVnd: 60_000, shippingFeeVnd: 30_000, grandTotalVnd: 1_170_000 });
  });

  it("removes the 5% offer when the customer removes an item", () => {
    const cart = created([line("13000000-0000-4000-8000-000000000001", "CB182"), line("13000000-0000-4000-8000-000000000002", "SV695", 500_000)]);
    const result = applyCanonicalCartDecisionV2({ cart, expectedCartVersion: 1, mutation: { kind: "REMOVE_LINE", lineId: "13000000-0000-4000-8000-000000000002" }, shopId: "LANA_DESIGN", policy, customerState: "READY", now });
    expect(result).toMatchObject({ status: "APPLIED", cart: { revision: 2, discountTotalVnd: 0, grandTotalVnd: 730_000 } });
  });

  it("applies each concession tier once and can mark a verified cart ready", () => {
    const cart = created([line("13000000-0000-4000-8000-000000000001", "CB182")]);
    const hesitant = applyCanonicalCartDecisionV2({ cart, expectedCartVersion: 1, mutation: null, shopId: "LANA_DESIGN", policy, customerState: "HESITANT", now });
    if (hesitant.status !== "APPLIED") throw new Error(hesitant.reasonCode);
    expect(hesitant.cart).toMatchObject({ shippingFeeVnd: 30_000, discountTotalVnd: 30_000, grandTotalVnd: 700_000 });
    const cautious = applyCanonicalCartDecisionV2({ cart: hesitant.cart, expectedCartVersion: 2, mutation: null, shopId: "LANA_DESIGN", policy, customerState: "CAUTIOUS", readyForConfirmation: true, now });
    expect(cautious).toMatchObject({ status: "APPLIED", cart: { revision: 3, status: "READY_FOR_CONFIRMATION", discountTotalVnd: 50_000, grandTotalVnd: 680_000 } });
  });

  it("blocks stale POS evidence and stale cart CAS", () => {
    const cart = created([line("13000000-0000-4000-8000-000000000001", "CB182")]);
    expect(applyCanonicalCartDecisionV2({ cart, expectedCartVersion: 9, mutation: null, shopId: "LANA_DESIGN", policy, customerState: "READY", now })).toMatchObject({ status: "BLOCKED", reasonCode: "CART_VERSION_CONFLICT" });
    const staleLine = line("13000000-0000-4000-8000-000000000009", "STALE");
    const stale = { ...staleLine, priceAuthority: { ...staleLine.priceAuthority!, metadata: { ...staleLine.priceAuthority!.metadata, observedAt: "2026-07-19T00:00:00.000Z", expiresAt: "2026-07-21T00:00:00.000Z" } } };
    expect(createCanonicalCartV2({ identity: { cartId: "10000000-0000-4000-8000-000000000009", salesEpisodeId: "11000000-0000-4000-8000-000000000009", customerProfileId: "12000000-0000-4000-8000-000000000009" }, lines: [stale], shopId: "LANA_DESIGN", policy, now })).toMatchObject({ status: "BLOCKED", reasonCode: "POLICY_BLOCKED", policyReasonCode: "POS_PRICE_STALE" });
  });

  it("changes verified size and SKU atomically and blocks ready carts with no size", () => {
    const cart = created([line("13000000-0000-4000-8000-000000000001", "CB182")]);
    const changed = applyCanonicalCartDecisionV2({ cart, expectedCartVersion: 1, mutation: { kind: "SET_COMPONENT_VARIANT", lineId: cart.lines[0]!.lineId, componentProductId: "CB182", componentSku: "CB182-L-BLACK", size: "L", color: "BLACK" }, shopId: "LANA_DESIGN", policy, customerState: "READY", now });
    expect(changed).toMatchObject({ status: "APPLIED", cart: { lines: [{ components: [{ componentSku: "CB182-L-BLACK", size: "L", color: "BLACK" }] }] } });

    const missingSizeLine = { ...line("13000000-0000-4000-8000-000000000009", "SV695"), components: [{ ...line("13000000-0000-4000-8000-000000000009", "SV695").components[0]!, size: null }] };
    const missing = created([missingSizeLine]);
    expect(applyCanonicalCartDecisionV2({ cart: missing, expectedCartVersion: 1, mutation: null, shopId: "LANA_DESIGN", policy, customerState: "READY", readyForConfirmation: true, now })).toMatchObject({ status: "BLOCKED", reasonCode: "CART_MUTATION_INVALID" });
  });
});
