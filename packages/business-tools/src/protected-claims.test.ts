import { describe, expect, it } from "vitest";
import {
  buildProtectedCartPolicyClaimsV1,
  buildProtectedMediaClaimsV1,
  buildProtectedClaimsFromCartSelectionsV1,
  buildProtectedClaimsFromVerifiedFactsV1,
  hashProtectedClaimSetV1,
} from "./protected-claims.js";

const HASH = "a".repeat(64);

describe("DF05 typed protected-claim provenance", () => {
  it("adapts canonical cart policy decisions into shipping and promotion claims", () => {
    const claims = buildProtectedCartPolicyClaimsV1({
      cart: {
        cartId: "10000000-0000-4000-8000-000000000001",
        revision: 2,
        adjustments: [{
          adjustmentId: "10000000-0000-4000-8000-000000000004",
          kind: "FIXED_DISCOUNT",
          amountVnd: 20_000,
          percentageBps: null,
          policyAuthorization: {
            policyBundleId: "policy-1",
            policyBundleVersion: "v1",
            ruleId: "FINAL_DISCOUNT",
            decisionId: "10000000-0000-4000-8000-000000000005",
            authorizedAt: "2026-08-13T05:00:00.000Z",
          },
        }],
        shippingFeeVnd: 30_000,
        updatedAt: "2026-08-13T05:00:00.000Z",
      },
      policySourceVersion: "policy-1:v1",
      policyEvidenceRef: "policy:sha256:safe-ref",
      expiresAt: "2026-08-13T05:05:00.000Z",
    });
    expect(claims.map(({ type }) => type)).toEqual(["PROMOTION_OFFER", "SHIPPING_FEE"]);
    expect(claims.every(({ scope }) => scope.kind === "CART")).toBe(true);
  });

  it("hashes verified media identity without retaining its URL or credentials", () => {
    const result = buildProtectedMediaClaimsV1({
      productId: "SP-001",
      imageUrls: ["https://user:secret@example.invalid/private.jpg?token=secret"],
      sourceVersion: "media-v2:7",
      observedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:01:00.000Z",
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: "PRODUCT_MEDIA", authorization: "NONE" });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("example.invalid");
  });

  it("adapts fresh cart facts into typed price, stock, and ETA claims", () => {
    const result = buildProtectedClaimsFromCartSelectionsV1([{
      productId: "SP-001", variantId: "SET-M", priceVnd: 1_250_000,
      priceVersion: "price:7", inventoryVersion: "inventory:9",
      etaVersion: "eta:2", eta: { minDays: 2, maxDays: 4 },
      sourceAuthority: "POS_SNAPSHOT",
      stockStatus: "PRE_ORDER", stockAvailableQuantity: 0,
      observedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:05:00.000Z",
      etaExpiresAt: "2026-08-13T05:03:00.000Z",
    }]);
    expect(result.map(({ type }) => type)).toEqual(["ETA", "PRICE", "STOCK"]);
    expect(result.every(({ authorization }) => authorization === "NONE")).toBe(true);
    expect(result.find(({ type }) => type === "STOCK")).toMatchObject({
      provenance: { authority: "POS_SNAPSHOT" },
      value: { status: "PRE_ORDER", availableQuantity: 0 },
    });
    expect(result.find(({ type }) => type === "ETA")?.provenance.expiresAt)
      .toBe("2026-08-13T05:03:00.000Z");
  });

  it("builds finite price, stock, ETA and size claims from verified sources", () => {
    const result = buildProtectedClaimsFromVerifiedFactsV1({
      facts: {
        schemaVersion: 1,
        status: "OK",
        source: "POS_LIVE",
        observedAt: "2026-08-13T05:00:00.000Z",
        expiresAt: "2026-08-13T05:05:00.000Z",
        productId: "SP-001",
        reasonCode: null,
        facts: {
          schemaVersion: 1,
          productId: "SP-001",
          parentProductId: "SP-001",
          offerType: "SET",
          listPriceVnd: 1_300_000,
          salePriceVnd: 1_250_000,
          sizes: ["S", "M", "L"],
          stockStatus: "IN_STOCK",
          stockQuantity: 3,
          deliveryEta: { minDays: 2, maxDays: 4 },
          fulfillmentPolicy: "STANDARD",
          imageUrls: ["https://user:secret@example.invalid/private.jpg?token=secret"],
        },
      },
      sizeClaim: {
        id: "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e362",
        type: "SIZE_RECOMMENDATION",
        value: { recommendedSizes: ["M"], alternativeSizes: ["L"] },
        productId: "SP-001",
        variantId: null,
        evidenceRef: "size-engine:v1:opaque",
        source: "VERIFIED_SIZE_ENGINE_V1",
        observedAt: "2026-08-13T05:00:00.000Z",
        expiresAt: "2026-08-13T05:05:00.000Z",
        customerProfileId: "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e361",
        customerProfileRevision: 2,
        measurementFingerprint: HASH,
        evidenceBasis: {
          kind: "CURRENT_MEASUREMENTS",
          measurementFingerprint: HASH,
          sourceEventHashes: [HASH],
        },
      },
    });

    expect(result.reasonCodes).toEqual([]);
    expect(result.claims.map(({ type }) => type)).toEqual([
      "ETA",
      "PRICE",
      "SIZE_FIT",
      "STOCK",
    ]);
    expect(result.claims.every(({ authorization }) => authorization === "NONE"))
      .toBe(true);
    expect(hashProtectedClaimSetV1(result.claims)).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(result.claims)).not.toContain("secret");
    expect(JSON.stringify(result.claims)).not.toContain("example.invalid");
  });

  it("fails closed when verified facts have no finite expiry", () => {
    const result = buildProtectedClaimsFromVerifiedFactsV1({
      facts: {
        schemaVersion: 1,
        status: "OK",
        source: "POS_SNAPSHOT",
        observedAt: "2026-08-13T05:00:00.000Z",
        expiresAt: null,
        productId: "SP-001",
        reasonCode: null,
        facts: {
          schemaVersion: 1,
          productId: "SP-001",
          parentProductId: "SP-001",
          offerType: "SET",
          listPriceVnd: 1_300_000,
          salePriceVnd: null,
          sizes: [],
          stockStatus: "UNKNOWN",
          stockQuantity: null,
          deliveryEta: null,
          fulfillmentPolicy: null,
          imageUrls: [],
        },
      },
      sizeClaim: null,
    });

    expect(result).toEqual({
      claims: [],
      reasonCodes: ["PROTECTED_CLAIM_EXPIRY_REQUIRED"],
    });
  });

  it("rejects cross-product size provenance", () => {
    const result = buildProtectedClaimsFromVerifiedFactsV1({
      facts: null,
      sizeClaim: {
        id: "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e362",
        type: "SIZE_RECOMMENDATION",
        value: { recommendedSizes: ["M"], alternativeSizes: [] },
        productId: "SP-OTHER",
        variantId: null,
        evidenceRef: "size-engine:v1:opaque",
        source: "VERIFIED_SIZE_ENGINE_V1",
        observedAt: "2026-08-13T05:00:00.000Z",
        expiresAt: "2026-08-13T05:05:00.000Z",
        customerProfileId: "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e361",
        customerProfileRevision: 2,
        measurementFingerprint: HASH,
        evidenceBasis: {
          kind: "CURRENT_MEASUREMENTS",
          measurementFingerprint: HASH,
          sourceEventHashes: [HASH],
        },
      },
      expectedProductId: "SP-001",
    });

    expect(result).toEqual({
      claims: [],
      reasonCodes: ["PROTECTED_CLAIM_PRODUCT_SCOPE_MISMATCH"],
    });
  });
});
