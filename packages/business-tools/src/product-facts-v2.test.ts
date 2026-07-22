import { describe, expect, it } from "vitest";
import {
  buildProductFactsV2RedisWrites,
  inspectProductFactsV2Freshness,
  productFactsV2ProjectionKeys,
  reconstructProductFactsV2RedisProjection,
  resolveProductFactsV2,
  shouldPublishProductFactsV2Manifest,
} from "./product-facts-v2.js";

const observedAt = "2026-07-22T00:00:00.000Z";
const priceExpiry = "2026-07-24T00:00:00.000Z";
const bomExpiry = "2026-07-29T00:00:00.000Z";
const fulfillmentExpiry = "2026-07-29T00:00:00.000Z";
const mediaExpiry = "2026-08-21T00:00:00.000Z";

const posShortMetadata = {
  authority: "PANCAKE_POS", sourceVersion: "pos-1", observedAt,
  expiresAt: priceExpiry, freshForSeconds: 172_800, freshnessState: "FRESH",
} as const;
const facts = {
  schemaVersion: 2,
  productId: "CB182",
  identity: {
    parentProductId: "CB182", shopId: "LANA", brand: "LANA", active: true,
    availableOfferKinds: ["SET", "COMPONENT", "COMBO_3"],
    metadata: { authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY", sourceVersion: "sheet-1", observedAt, expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" },
  },
  content: {
    productName: "Set CB182", description: "Set ba món", productUrl: "https://example.com/cb182",
    metadata: { authority: "WEBSTORE_XML", sourceVersion: "xml-1", observedAt, expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" },
  },
  bom: {
    components: [
      { componentProductId: "CB182-AO", sku: "CB182-AO", role: "TOP", quantity: 1, required: true },
      { componentProductId: "CB182-CV", sku: "CB182-CV", role: "SKIRT", quantity: 1, required: true },
      { componentProductId: "CB182-QUAN", sku: "CB182-QUAN", role: "PANTS", quantity: 1, required: true },
    ],
    offerCompositions: [
      { offerKind: "SET", posOfferKey: "SET", componentProductIds: ["CB182-AO", "CB182-CV"] },
      { offerKind: "COMBO_3", posOfferKey: "COMBO_3", componentProductIds: ["CB182-AO", "CB182-CV", "CB182-QUAN"] },
    ],
    metadata: { ...posShortMetadata, expiresAt: bomExpiry, freshForSeconds: 604_800 },
  },
  pricing: {
    setPrice: { currency: "VND", listPriceVnd: null, salePriceVnd: 870_000 },
    comboThreePiecePrice: { currency: "VND", listPriceVnd: null, salePriceVnd: 1_200_000 },
    componentPrices: [
      { componentProductId: "CB182-AO", price: { currency: "VND", listPriceVnd: null, salePriceVnd: 450_000 } },
      { componentProductId: "CB182-CV", price: null },
      { componentProductId: "CB182-QUAN", price: { currency: "VND", listPriceVnd: null, salePriceVnd: 500_000 } },
    ],
    metadata: posShortMetadata,
  },
  inventory: {
    variants: [
      { variantId: "v-set", sku: "CB182-SET-S", offerKind: "SET", posOfferKey: "SET", componentProductId: null, color: "KEM", size: "S", remainQuantity: 2, sellableQuantity: 2, stockStatus: "IN_STOCK" },
      { variantId: "v-ao", sku: "CB182-AO-S", offerKind: "COMPONENT", posOfferKey: "AO", componentProductId: "CB182-AO", color: "KEM", size: "S", remainQuantity: 2, sellableQuantity: 2, stockStatus: "IN_STOCK" },
    ],
    metadata: posShortMetadata,
  },
  sellingRules: {
    allowMixedSizes: true, allowComponentSale: true,
    metadata: { authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY", sourceVersion: "sheet-1", observedAt, expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" },
  },
  fulfillment: {
    appliesToParentProductId: "CB182", policyType: "READY_STOCK", canOrderWhenZero: false,
    etaToCustomer: { minDays: 3, maxDays: 7, validUntil: null },
    metadata: { authority: "GOOGLE_SHEETS_FULFILLMENT_POLICY", sourceVersion: "eta-1", observedAt, expiresAt: fulfillmentExpiry, expiryBasis: "DEFAULT_7_DAY_TTL", freshForSeconds: 604_800, freshnessState: "FRESH" },
  },
  sizeChart: null,
  media: {
    assets: [],
    metadata: { authority: "QDRANT_STABLE", sourceVersion: "q-1", observedAt, expiresAt: mediaExpiry, freshForSeconds: 2_592_000, freshnessState: "FRESH" },
  },
} as const;

describe("ProductFactsV2 runtime resolver", () => {
  it("keeps Redis storage retention separate from allowed freshness", () => {
    const view = inspectProductFactsV2Freshness(facts, new Date("2026-07-25T00:00:00.000Z"));
    expect(view).toEqual({
      bom: "FRESH", pricing: "STALE", inventory: "STALE", fulfillment: "FRESH",
      retainedForAudit: { bom: true, priceInventory: true },
    });
  });

  it("never quotes a null POS component price", () => {
    expect(resolveProductFactsV2(facts, {
      intent: "PRICE", offerKind: "COMPONENT", componentProductId: "CB182-CV",
    }, new Date("2026-07-23T00:00:00.000Z"))).toMatchObject({
      status: "BLOCKED", reasonCode: "PRICE_MISSING", canQuotePrice: false,
    });
  });

  it("resolves an exact component variant while facts are fresh", () => {
    expect(resolveProductFactsV2(facts, {
      intent: "STOCK", offerKind: "COMPONENT", componentProductId: "CB182-AO", color: "kem", size: "s",
    }, new Date("2026-07-23T00:00:00.000Z"))).toMatchObject({
      status: "OK",
      price: { salePriceVnd: 450_000 },
      variants: [{ sku: "CB182-AO-S", sellableQuantity: 2 }],
    });
  });

  it("blocks a stale price even while its Redis value may still exist", () => {
    expect(resolveProductFactsV2(facts, {
      intent: "PRICE", offerKind: "SET",
    }, new Date("2026-07-25T00:00:00.000Z"))).toMatchObject({
      status: "BLOCKED", reasonCode: "PRICE_STALE",
    });
  });

  it("answers a fresh parent ETA without requiring a fresh or available price", () => {
    const noPrice = structuredClone(facts) as any;
    noPrice.pricing.setPrice = null;
    expect(resolveProductFactsV2(noPrice, {
      intent: "ETA", offerKind: "SET",
    }, new Date("2026-07-25T00:00:00.000Z"))).toMatchObject({
      status: "OK", price: null, etaToCustomer: { minDays: 3, maxDays: 7 },
    });
  });

  it("uses distinct projection keys for BOM and volatile facts", () => {
    const first = productFactsV2ProjectionKeys("Lana", "CB-182", "release-1");
    const collisionCandidate = productFactsV2ProjectionKeys("Lana", "CB_182", "release-1");
    expect(first.stable).toContain(":g:");
    expect(first.manifest).toMatch(/^facts:v2:[a-f0-9]{32}:manifest$/u);
    expect(first.manifest).not.toBe(collisionCandidate.manifest);
  });

  it("stores stable, BOM and price/inventory groups with independent retention", () => {
    const plan = buildProductFactsV2RedisWrites(facts);
    expect(plan.generation).toBe("pos-1");
    expect(plan.manifestCondition).toBe("ONLY_IF_OBSERVED_AT_NEWER");
    expect(plan.dataWrites.map(({ ttlSeconds }) => ttlSeconds)).toEqual([2_592_000, 2_592_000, 604_800]);
    expect(plan.manifestWrite.ttlSeconds).toBe(604_800);
    expect(reconstructProductFactsV2RedisProjection({
      manifest: plan.manifestWrite.value,
      stable: plan.dataWrites[0]!.value,
      bom: plan.dataWrites[1]!.value,
      priceInventory: plan.dataWrites[2]!.value,
    })).toMatchObject({ productId: "CB182", pricing: { setPrice: { salePriceVnd: 870_000 } } });
  });

  it("rejects a torn Redis generation and an older manifest", () => {
    const current = buildProductFactsV2RedisWrites(facts);
    const torn = JSON.stringify({ generation: "other", payload: facts.bom });
    expect(reconstructProductFactsV2RedisProjection({
      manifest: current.manifestWrite.value,
      stable: current.dataWrites[0]!.value,
      bom: torn,
      priceInventory: current.dataWrites[2]!.value,
    })).toBeNull();
    const olderManifest = JSON.stringify({
      ...JSON.parse(current.manifestWrite.value), observedAt: "2026-07-21T00:00:00.000Z",
    });
    expect(shouldPublishProductFactsV2Manifest(current.manifestWrite.value, olderManifest)).toBe(false);
    expect(shouldPublishProductFactsV2Manifest(current.manifestWrite.value, "not-json")).toBe(false);
    expect(shouldPublishProductFactsV2Manifest(null, "not-json")).toBe(false);
  });

  it("does not resolve inactive products", () => {
    const inactive = structuredClone(facts) as any;
    inactive.identity.active = false;
    expect(resolveProductFactsV2(inactive, { intent: "PRICE", offerKind: "SET" }, new Date("2026-07-23T00:00:00.000Z"))).toMatchObject({
      status: "BLOCKED", reasonCode: "PRODUCT_INACTIVE",
    });
  });
});
