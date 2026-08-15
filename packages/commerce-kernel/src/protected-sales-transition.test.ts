import { describe, expect, it } from "vitest";
import { PolicyBundleV1Schema } from "@lana/contracts";
import {
  applyCheckoutDetailsTransitionV1,
  computeCanonicalOrderPreviewHashV1,
  deriveCanonicalPurchaseConfirmationV1,
  replayCanonicalCartRepriceNegotiationV1,
  validateOrderPreviewTransitionV1,
} from "./index.js";

const now = new Date("2026-08-14T05:00:00.000Z");
const cartId = "10000000-0000-4000-8000-000000000001";

const policyMetadata = {
  authority: "ADMIN_POLICY" as const,
  sourceVersion: "policy-v1",
  observedAt: "2026-08-14T04:00:00.000Z",
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
  effectiveAt: "2026-08-14T04:00:00.000Z",
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
    metadata: policyMetadata,
  },
  shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata: policyMetadata },
  multiItemOffer: {
    minimumProductCount: 3,
    discountBps: 500,
    countingUnit: "PARENT_PRODUCT_UNIT",
    setAndComboCountAsOne: true,
    scope: "SHOP_WIDE",
    metadata: policyMetadata,
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
    metadata: policyMetadata,
  },
  closing: {
    customerStates: ["READY", "HESITANT", "CAUTIOUS"],
    decisionMode: "DETERMINISTIC_POLICY_ONLY",
    allowUnlistedOffers: false,
    metadata: policyMetadata,
  },
});

describe("protected sales transition kernel", () => {
  it("normalizes and merges an exact checkout patch without trusting proposed state", () => {
    const first = applyCheckoutDetailsTransitionV1({
      current: null,
      details: { fullName: "  Nguyen   Van A ", phone: " 0984 997 797 " },
      appliedAt: now,
    });
    expect(first).toEqual({
      status: "APPLIED",
      draft: {
        fullName: "Nguyen Van A",
        phone: "0984 997 797",
        address: null,
        paymentMethod: null,
        updatedAt: now.toISOString(),
      },
    });
    if (first.status !== "APPLIED") throw new Error("TEST_CHECKOUT_CAPTURE_FAILED");
    expect(applyCheckoutDetailsTransitionV1({
      current: first.draft,
      details: { address: "  Tan Chau,   Tay Ninh ", paymentMethod: "COD" },
      appliedAt: now,
    })).toMatchObject({
      status: "APPLIED",
      draft: {
        fullName: "Nguyen Van A",
        phone: "0984 997 797",
        address: "Tan Chau, Tay Ninh",
        paymentMethod: "COD",
      },
    });
  });

  it("validates preview recipient/payment against the replayed checkout draft", () => {
    const checkoutDraft = {
      fullName: "Nguyen Van A",
      phone: "0984997797",
      address: "Tan Chau, Tay Ninh",
      paymentMethod: "COD" as const,
      updatedAt: now.toISOString(),
    };
    const fact = {
      status: "MATCHED" as const,
      sourceVersionBefore: "fact-v1",
      sourceVersionAfter: "fact-v1",
      checkedAt: now.toISOString(),
    };
    const artifact = {
      schemaVersion: 1 as const,
      previewId: "20000000-0000-4000-8000-000000000001",
      cartId,
      cartVersion: 3,
      stage: "ORDER_PREVIEW" as const,
      recipient: {
        fullName: checkoutDraft.fullName,
        phone: checkoutDraft.phone,
        address: checkoutDraft.address,
        retentionClass: "CART_48H_OPERATIONAL" as const,
      },
      payment: { method: "COD" as const, bankTransferPolicyRef: null },
      revalidation: {
        cartId,
        cartVersion: 3,
        price: fact,
        inventory: fact,
        size: fact,
        eta: fact,
        eligible: true,
        checkedAt: now.toISOString(),
      },
      createdAt: now.toISOString(),
      expiresAt: "2026-08-14T05:05:00.000Z",
    };
    const preview = { ...artifact, previewHash: computeCanonicalOrderPreviewHashV1(artifact) };
    const input = {
      stage: "CART_OPEN" as const,
      cart: { cartId, revision: 3, status: "READY_FOR_CONFIRMATION" as const },
      cartExpiresAt: "2026-08-14T06:00:00.000Z",
      checkoutDraft,
      preview,
      now,
    };
    expect(validateOrderPreviewTransitionV1(input)).toMatchObject({ status: "APPLIED" });
    expect(validateOrderPreviewTransitionV1({
      ...input,
      preview: {
        ...preview,
        recipient: { ...preview.recipient, phone: "0900000000" },
      },
    })).toMatchObject({ status: "BLOCKED", reasonCode: "PREVIEW_INTEGRITY_INVALID" });
  });

  it("derives the exact confirmation identity from cart, preview and current message", () => {
    const confirmation = deriveCanonicalPurchaseConfirmationV1({
      conversationKey: "page-1:conversation-1",
      cart: { cartId, revision: 3 },
      preview: {
        previewId: "20000000-0000-4000-8000-000000000001",
        previewHash: `sha256:${"a".repeat(64)}` as const,
      },
      sourceMessageId: "mid-confirm-1",
      confirmedAt: now,
    });
    expect(confirmation).toMatchObject({
      cartId,
      cartVersion: 3,
      previewId: "20000000-0000-4000-8000-000000000001",
      previewHash: `sha256:${"a".repeat(64)}`,
      sourceMessageId: "mid-confirm-1",
      confirmedAt: now.toISOString(),
    });
    expect(deriveCanonicalPurchaseConfirmationV1({
      conversationKey: "page-1:conversation-1",
      cart: { cartId, revision: 3 },
      preview: {
        previewId: "20000000-0000-4000-8000-000000000001",
        previewHash: `sha256:${"a".repeat(64)}` as const,
      },
      sourceMessageId: "mid-confirm-1",
      confirmedAt: now,
    })).toEqual(confirmation);
  });

  it("replays the exact negotiation ledger update caused by a cart transition", () => {
    const before = {
      schemaVersion: 2 as const,
      negotiationId: `negotiation:${cartId}`,
      cartId,
      cartVersion: 1,
      stateVersion: 1,
      customerState: "READY" as const,
      consumedObjectionEvidenceIds: [],
      processedEvents: [],
      quote: {
        policyBundleId: policy.policyBundleId,
        policyVersion: policy.policyVersion,
        customerState: "READY" as const,
        parentProductUnitCount: 1,
        subtotalVnd: 100_000,
        shippingFeeVnd: 30_000,
        adjustments: [],
        discountTotalVnd: 0,
        grandTotalVnd: 130_000,
      },
      updatedAt: "2026-08-14T04:59:00.000Z",
    };
    const result = replayCanonicalCartRepriceNegotiationV1({
      state: before,
      commandId: "sales:event-1:cart-ready",
      mutationReasonCode: "OTHER",
      cart: {
        cartId,
        cartVersion: 2,
        lines: [{
          lineId: "line-1",
          shopId: "LANA",
          parentProductId: "SP-001",
          offerKind: "DIRECT",
          quantity: 1,
          priceEvidence: {
            authority: "PANCAKE_POS",
            shopId: "LANA",
            parentProductId: "SP-001",
            offerKind: "DIRECT",
            sourceVersion: "pos-v1",
            observedAt: "2026-08-14T04:00:00.000Z",
            expiresAt: "2026-08-16T04:00:00.000Z",
            freshForSeconds: 172_800,
            unitPriceVnd: 100_000,
          },
        }],
      },
      policy,
      occurredAt: now,
      authorizationNow: now,
    });
    expect(result).toMatchObject({
      status: "APPLIED",
      state: {
        cartVersion: 2,
        stateVersion: 2,
        customerState: "READY",
        quote: { grandTotalVnd: 130_000 },
      },
    });
    if (result.status !== "APPLIED") throw new Error("TEST_NEGOTIATION_REPRICE_FAILED");
    expect(result.state.processedEvents.at(-1)?.eventId)
      .toBe("sales:event-1:cart-ready:cart-mutated");
  });
});
