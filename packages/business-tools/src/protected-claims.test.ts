import { describe, expect, it } from "vitest";
import {
  buildProtectedClaimsFromCartSelectionsV1,
  buildProtectedClaimsFromVerifiedFactsV1,
  hashProtectedClaimSetV1,
} from "./protected-claims.js";

const HASH = "a".repeat(64);

describe("DF05 typed protected-claim provenance", () => {
  it("adapts fresh cart facts into typed price, stock, and ETA claims", () => {
    const result = buildProtectedClaimsFromCartSelectionsV1([{
      productId: "SP-001", variantId: "SET-M", priceVnd: 1_250_000,
      priceVersion: "price:7", inventoryVersion: "inventory:9",
      etaVersion: "eta:2", eta: { minDays: 2, maxDays: 4 },
      observedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:05:00.000Z",
    }]);
    expect(result.map(({ type }) => type)).toEqual(["ETA", "PRICE", "STOCK"]);
    expect(result.every(({ authorization }) => authorization === "NONE")).toBe(true);
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
