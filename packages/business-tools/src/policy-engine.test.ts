import { describe, expect, it } from "vitest";
import { PolicyBundleV1Schema } from "@lana/contracts";
import { deriveClosingCustomerState, evaluateShopPolicy, type PolicyCartLineInput } from "./policy-engine.js";

const metadata = {
  authority: "ADMIN_POLICY", sourceVersion: "2026-07-22.2", observedAt: "2026-07-22T00:00:00.000Z",
  expiresAt: null, freshForSeconds: null, freshnessState: "FRESH",
} as const;

function policy() {
  return PolicyBundleV1Schema.parse({
    schemaVersion: 1, policyBundleId: "lana-shopwide-sales", policyVersion: "2026-07-22.2",
    shopId: "LANA_DESIGN", status: "ACTIVE", effectiveAt: "2026-07-22T00:00:00.000Z",
    effectiveUntil: null, supersedesPolicyVersion: null, scope: "SHOP_WIDE",
    commerceAuthority: {
      bomAuthority: "PANCAKE_POS", priceAuthority: "PANCAKE_POS", inventoryAuthority: "PANCAKE_POS",
      allowGoogleSheetsPriceOverride: false, allowAdminPriceOverride: false, missingPriceBehavior: "DO_NOT_QUOTE", metadata,
    },
    shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata },
    multiItemOffer: { minimumProductCount: 2, discountBps: 500, countingUnit: "PARENT_PRODUCT_UNIT", setAndComboCountAsOne: true, scope: "SHOP_WIDE", metadata },
    negotiation: {
      secondConcession: { freeShipping: true, fixedDiscountVnd: 0 },
      finalConcession: { freeShipping: true, fixedDiscountVnd: 20_000 },
      stacking: { multiItemDiscountWithSecondConcession: true, multiItemDiscountWithFinalConcession: true, deduplicateFreeShipping: true },
      scope: "SHOP_WIDE", metadata,
    },
    closing: { customerStates: ["READY", "HESITANT", "CAUTIOUS"], decisionMode: "DETERMINISTIC_POLICY_ONLY", allowUnlistedOffers: false, metadata },
  });
}

const now = new Date("2026-07-22T01:00:00.000Z");
function line(overrides: Partial<PolicyCartLineInput> = {}): PolicyCartLineInput {
  return {
    lineId: "line-1", shopId: "LANA_DESIGN", parentProductId: "CB182", offerKind: "SET", quantity: 1,
    priceEvidence: {
      authority: "PANCAKE_POS", shopId: "LANA_DESIGN", parentProductId: "CB182", offerKind: "SET",
      sourceVersion: "pos-r1", observedAt: "2026-07-22T00:00:00.000Z", expiresAt: "2026-07-24T00:00:00.000Z",
      freshForSeconds: 172_800, unitPriceVnd: 700_000,
    },
    ...overrides,
  };
}

describe("shop-wide policy engine", () => {
  it("stacks five percent, final 20k and free shipping for a deterministic cautious transition", () => {
    const result = evaluateShopPolicy({
      policy: policy(), lines: [line({ quantity: 2 })],
      closingEvidence: { previousState: "HESITANT", purchaseReady: false, priceObjectionCount: 2, secondConcessionAlreadyApplied: true }, now,
    });
    expect(result).toMatchObject({ status: "AUTHORIZED", customerState: "CAUTIOUS", parentProductUnitCount: 2, subtotalVnd: 1_400_000, shippingFeeVnd: 30_000, discountTotalVnd: 120_000, grandTotalVnd: 1_310_000 });
    if (result.status === "AUTHORIZED") expect(result.adjustments.map(({ kind }) => kind)).toEqual(["PERCENT_DISCOUNT", "FREE_SHIPPING", "FIXED_DISCOUNT"]);
  });

  it("does not allow a caller to jump directly to CAUTIOUS", () => {
    expect(deriveClosingCustomerState({ previousState: "READY", purchaseReady: false, priceObjectionCount: 2, secondConcessionAlreadyApplied: true })).toBeNull();
    expect(evaluateShopPolicy({
      policy: policy(), lines: [line()],
      closingEvidence: { previousState: "READY", purchaseReady: false, priceObjectionCount: 2, secondConcessionAlreadyApplied: true }, now,
    })).toEqual({ status: "BLOCKED", reasonCode: "CLOSING_TRANSITION_NOT_ALLOWED", canQuotePrice: false });
  });

  it("counts a set or combo line as one parent product per quantity", () => {
    const result = evaluateShopPolicy({
      policy: policy(), lines: [line()],
      closingEvidence: { previousState: null, purchaseReady: true, priceObjectionCount: 0, secondConcessionAlreadyApplied: false }, now,
    });
    expect(result).toMatchObject({ status: "AUTHORIZED", parentProductUnitCount: 1, discountTotalVnd: 0 });
  });

  it("fails closed for missing, stale, mismatched or duplicate POS evidence", () => {
    const ready = { previousState: null, purchaseReady: true, priceObjectionCount: 0, secondConcessionAlreadyApplied: false } as const;
    expect(evaluateShopPolicy({ policy: policy(), lines: [line({ priceEvidence: { ...line().priceEvidence, unitPriceVnd: null } })], closingEvidence: ready, now })).toMatchObject({ status: "BLOCKED", reasonCode: "POS_PRICE_MISSING" });
    expect(evaluateShopPolicy({ policy: policy(), lines: [line({ priceEvidence: { ...line().priceEvidence, observedAt: "2026-07-19T00:00:00.000Z", expiresAt: "2026-07-21T00:00:00.000Z" } })], closingEvidence: ready, now })).toMatchObject({ status: "BLOCKED", reasonCode: "POS_PRICE_STALE" });
    expect(evaluateShopPolicy({ policy: policy(), lines: [line({ priceEvidence: { ...line().priceEvidence, shopId: "OTHER" } })], closingEvidence: ready, now })).toMatchObject({ status: "BLOCKED", reasonCode: "PRICE_EVIDENCE_IDENTITY_MISMATCH" });
    expect(evaluateShopPolicy({ policy: policy(), lines: [line(), line()], closingEvidence: ready, now })).toMatchObject({ status: "BLOCKED", reasonCode: "DUPLICATE_LINE_ID" });
  });

  it("uses the second concession without inventing the final fixed discount", () => {
    const result = evaluateShopPolicy({
      policy: policy(), lines: [line({ priceEvidence: { ...line().priceEvidence, unitPriceVnd: 870_000 } })],
      closingEvidence: { previousState: "READY", purchaseReady: false, priceObjectionCount: 1, secondConcessionAlreadyApplied: false }, now,
    });
    if (result.status !== "AUTHORIZED") throw new Error("expected authorization");
    expect(result.adjustments).toEqual([{ ruleId: "SHOP_WIDE_SECOND_FREE_SHIPPING", kind: "FREE_SHIPPING", amountVnd: 30_000, percentageBps: null }]);
  });
});
