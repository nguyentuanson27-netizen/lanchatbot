import { describe, expect, it } from "vitest";
import { applyCanonicalCartDecisionV2, evaluateShopPolicy } from "./index.js";
import { PolicyBundleV1Schema } from "@lana/contracts";

describe("commerce kernel architecture boundary", () => {
  it("exports the one deterministic cart reducer and policy evaluator", () => {
    expect(typeof applyCanonicalCartDecisionV2).toBe("function");
    expect(typeof evaluateShopPolicy).toBe("function");
  });

  it.each([
    [" P-001", "P-001"],
    ["P-001", " P-001"],
    ["p-001", "P-001"],
  ])("does not silently normalize product identity %s against %s", (lineProductId, evidenceProductId) => {
    const metadata = {
      authority: "ADMIN_POLICY" as const,
      sourceVersion: "policy-v1",
      observedAt: "2026-08-14T00:00:00.000Z",
      expiresAt: null,
      freshForSeconds: null,
      freshnessState: "FRESH" as const,
    };
    const policy = PolicyBundleV1Schema.parse({
      schemaVersion: 1,
      policyBundleId: "policy-1",
      policyVersion: "v1",
      shopId: "LANA",
      status: "ACTIVE",
      effectiveAt: "2026-08-14T00:00:00.000Z",
      effectiveUntil: null,
      supersedesPolicyVersion: null,
      scope: "SHOP_WIDE",
      commerceAuthority: {
        bomAuthority: "PANCAKE_POS",
        priceAuthority: "PANCAKE_POS",
        inventoryAuthority: "PANCAKE_POS",
        allowGoogleSheetsPriceOverride: false,
        allowAdminPriceOverride: false,
        missingPriceBehavior: "DO_NOT_QUOTE",
        metadata,
      },
      shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata },
      multiItemOffer: {
        minimumProductCount: 3,
        discountBps: 500,
        countingUnit: "PARENT_PRODUCT_UNIT",
        setAndComboCountAsOne: true,
        scope: "SHOP_WIDE",
        metadata,
      },
      negotiation: {
        secondConcession: { freeShipping: true, fixedDiscountVnd: 0 },
        finalConcession: { freeShipping: true, fixedDiscountVnd: 20_000 },
        stacking: {
          multiItemDiscountWithSecondConcession: true,
          multiItemDiscountWithFinalConcession: true,
          deduplicateFreeShipping: true,
        },
        scope: "SHOP_WIDE",
        metadata,
      },
      closing: {
        customerStates: ["READY", "HESITANT", "CAUTIOUS"],
        decisionMode: "DETERMINISTIC_POLICY_ONLY",
        allowUnlistedOffers: false,
        metadata,
      },
    });

    expect(evaluateShopPolicy({
      policy,
      lines: [{
        lineId: "line-1",
        shopId: "LANA",
        parentProductId: lineProductId,
        offerKind: "DIRECT",
        quantity: 1,
        priceEvidence: {
          authority: "PANCAKE_POS",
          shopId: "LANA",
          parentProductId: evidenceProductId,
          offerKind: "DIRECT",
          sourceVersion: "pos-v1",
          observedAt: "2026-08-14T00:00:00.000Z",
          expiresAt: "2026-08-16T00:00:00.000Z",
          freshForSeconds: 172_800,
          unitPriceVnd: 100_000,
        },
      }],
      closingEvidence: {
        previousState: null,
        purchaseReady: true,
        priceObjectionCount: 0,
        secondConcessionAlreadyApplied: false,
      },
      now: new Date("2026-08-14T01:00:00.000Z"),
    })).toMatchObject({ status: "BLOCKED" });
  });
});
