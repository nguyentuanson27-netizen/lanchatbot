import { describe, expect, it } from "vitest";
import { ProductFactsV2Schema } from "@lana/contracts";
import { projectProductFactsV2, type ProductFactsV2StaticSources } from "./product-facts-v2-projection.js";
import { buildProductAttributesV1 } from "./product-attributes.js";
import {
  buildProductFactsV2RedisWrites,
  reconstructProductFactsV2RedisProjection,
} from "./product-facts-v2.js";

const observedAt = "2026-07-22T00:00:00.000Z";
const untilReplaced = <T extends "GOOGLE_SHEETS_PRODUCT_REGISTRY" | "ADMIN_POLICY">(authority: T) => ({ authority, sourceVersion: "1", observedAt, expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" as const });
const staticSources: ProductFactsV2StaticSources = {
  identity: { parentProductId: "CB182", shopId: "LANA", brand: "LANA", active: true, availableOfferKinds: ["SET", "COMPONENT", "COMBO_3"], metadata: untilReplaced("GOOGLE_SHEETS_PRODUCT_REGISTRY") },
  content: { productName: "CB182", description: null, productUrl: null, metadata: { authority: "WEBSTORE_XML" as const, sourceVersion: "1", observedAt, expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" as const } },
  sellingRules: { allowMixedSizes: true, allowComponentSale: true, metadata: untilReplaced("GOOGLE_SHEETS_PRODUCT_REGISTRY") },
  fulfillment: { appliesToParentProductId: "CB182", policyType: "READY_STOCK" as const, canOrderWhenZero: false, etaToCustomer: { minDays: 3, maxDays: 7, validUntil: null }, metadata: { authority: "GOOGLE_SHEETS_FULFILLMENT_POLICY" as const, sourceVersion: "1", observedAt, expiresAt: "2026-07-29T00:00:00.000Z", expiryBasis: "DEFAULT_7_DAY_TTL" as const, freshForSeconds: 604_800 as const, freshnessState: "FRESH" as const } },
  sizeChart: null,
  media: { assets: [], metadata: { authority: "QDRANT_STABLE" as const, sourceVersion: "1", observedAt, expiresAt: "2026-08-21T00:00:00.000Z", freshForSeconds: 2_592_000 as const, freshnessState: "FRESH" as const } },
  attributes: buildProductAttributesV1({
    productId: "CB182",
    observedAt,
    data: {
      materials: ["LỤA"], materialComponents: { AO: ["LỤA"] }, colors: ["KEM"],
      styles: ["THANH LỊCH"], silhouettes: [], occasions: [], designAttributes: null,
      careInstructions: null, wearProperties: null, backCoverage: null, designComplexity: null,
    },
  }),
};

function snapshot() {
  const setComponents = [
    { component_id: "1", quantity: 1, product_sku: "CB182-AO", variation_sku: "" },
    { component_id: "2", quantity: 1, product_sku: "CB182-CV", variation_sku: "" },
  ];
  const comboComponents = [
    ...setComponents,
    { component_id: "3", quantity: 1, product_sku: "CB182-QUAN", variation_sku: "" },
  ];
  const row = (priceSku: string, price: number, componentsValue: typeof comboComponents = []) => ({ price_sku: priceSku, color: "KEM", size: "S", stock_quantity: 2, list_price: null, sale_price: price, stock_status: "OK", bom_status: componentsValue.length ? "OK" : "NOT_APPLICABLE", parent_variation_id: `${priceSku}-S`, parent_variation_sku: `${priceSku}-S`, components: componentsValue });
  return {
    schema_version: 3, release_id: "r1", shop_alias: "LANA", brand: "LANA", product_id: "CB182", synced_at: observedAt,
    offers: {
      SET: { list_price: null, sale_price: 870_000, price_status: "OK", rows: [row("CB182", 870_000, setComponents)] },
      COMBO_3: { list_price: null, sale_price: 1_200_000, price_status: "OK", rows: [row("CB182-COMBO", 1_200_000, comboComponents)] },
      AO: { list_price: null, sale_price: 450_000, price_status: "OK", rows: [row("CB182-AO", 450_000)] },
      QUAN: { list_price: null, sale_price: 500_000, price_status: "OK", rows: [row("CB182-QUAN", 500_000)] },
    },
  };
}

describe("ProductFactsV2 POS projection", () => {
  it("keeps offer-specific BOM, exact POS prices and inventory separate", () => {
    const projected = projectProductFactsV2({ posSnapshot: snapshot(), primaryOfferType: "SET", primaryOfferKind: "SET", staticSources, now: new Date("2026-07-22T01:00:00.000Z") });
    expect(projected.bom.components).toHaveLength(3);
    expect(projected.bom.offerCompositions).toEqual([
      expect.objectContaining({ offerKind: "SET", componentProductIds: ["CB182-AO", "CB182-CV"] }),
      expect.objectContaining({ offerKind: "COMBO_3", componentProductIds: ["CB182-AO", "CB182-CV", "CB182-QUAN"] }),
    ]);
    expect(projected.pricing.setPrice?.salePriceVnd).toBe(870_000);
    expect(projected.pricing.comboThreePiecePrice?.salePriceVnd).toBe(1_200_000);
    expect(projected.pricing.componentPrices).toEqual(expect.arrayContaining([
      expect.objectContaining({ componentProductId: "CB182-AO", price: expect.objectContaining({ salePriceVnd: 450_000 }) }),
      { componentProductId: "CB182-CV", price: null },
    ]));
    expect(projected.pricing.metadata).toMatchObject({ authority: "PANCAKE_POS", sourceVersion: "r1" });
    expect(projected.inventory.variants.filter(({ offerKind }) => offerKind === "SET")).toHaveLength(1);
    expect(projected.inventory.variants.filter(({ offerKind }) => offerKind === "COMBO_3")).toHaveLength(1);
    expect(projected.inventory.variants.filter(({ offerKind }) => offerKind === "COMPONENT")).toHaveLength(2);
    expect(projected.attributes).toMatchObject({ productId: "CB182", materials: ["LỤA"] });
    const mismatched = ProductFactsV2Schema.safeParse({
      ...projected,
      attributes: { ...projected.attributes!, productId: "OTHER" },
    });
    expect(mismatched.success).toBe(false);
    if (!mismatched.success) {
      expect(mismatched.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ["attributes", "productId"] }),
      ]));
    }
    const writes = buildProductFactsV2RedisWrites(projected);
    expect(reconstructProductFactsV2RedisProjection({
      manifest: writes.manifestWrite.value,
      stable: writes.dataWrites.find(({ key }) => key.endsWith(":stable"))?.value ?? null,
      bom: writes.dataWrites.find(({ key }) => key.endsWith(":bom"))?.value ?? null,
      priceInventory: writes.dataWrites.find(({ key }) => key.endsWith(":price_inventory"))?.value ?? null,
    })?.attributes).toEqual(projected.attributes);
  });

  it("rejects a POS snapshot for another parent product", () => {
    expect(() => projectProductFactsV2({ posSnapshot: { ...snapshot(), product_id: "OTHER" }, primaryOfferType: "SET", primaryOfferKind: "SET", staticSources, now: new Date() })).toThrow("PRODUCT_FACTS_V2_POS_IDENTITY_MISMATCH");
  });

  it("rejects future and partially invalid primary BOM snapshots", () => {
    expect(() => projectProductFactsV2({
      posSnapshot: { ...snapshot(), synced_at: "2026-07-23T00:00:00.000Z" }, primaryOfferType: "SET", primaryOfferKind: "SET", staticSources,
      now: new Date("2026-07-22T00:00:00.000Z"),
    })).toThrow("PRODUCT_FACTS_V2_POS_SNAPSHOT_FROM_FUTURE");
    const incomplete = snapshot();
    incomplete.offers.SET.rows.push({ ...incomplete.offers.SET.rows[0]!, bom_status: "NOT_FOUND" });
    expect(() => projectProductFactsV2({ posSnapshot: incomplete, primaryOfferType: "SET", primaryOfferKind: "SET", staticSources, now: new Date("2026-07-22T01:00:00.000Z") })).toThrow("PRODUCT_FACTS_V2_POS_BOM_INCOMPLETE:SET");
  });
});
