import { describe, expect, it } from "vitest";
import { catalogSnapshotKey, resolveCatalogFacts } from "./catalog-projection.js";

const now = new Date("2026-07-15T10:00:00.000Z");

function snapshot() {
  return {
    schema_version: 3,
    release_id: "release-1",
    catalog_version: "catalog-v2",
    policy_version: "policy-v1",
    shop_alias: "LANA",
    brand: "lanadesign",
    product_id: "SQ149",
    synced_at: "2026-07-15T09:50:00.000Z",
    data_status: "OK",
    fulfillment_policy: {
      tinh_trang: "READY_STOCK",
      can_order_when_zero: false,
      prep_min_days: 1,
      prep_max_days: 2,
      zero_stock_policy: "PRE_ORDER",
      zero_stock_prep_min_days: 5,
      zero_stock_prep_max_days: 10,
      eta_valid_until: "2026-07-20T00:00:00.000Z",
    },
    shipping_eta: {
      TAY_NINH: { transit_min_days: 2, transit_max_days: 3 },
    },
    offers: {
      SET_QUAN: {
        list_price: 799_000,
        sale_price: 699_000,
        price_status: "OK",
        rows: [
          { offer_type: "SET_QUAN", color: "DEN", size: "S", stock_quantity: 0, list_price: 799_000, sale_price: 699_000, stock_status: "OK" },
          { offer_type: "SET_QUAN", color: "DEN", size: "M", stock_quantity: 3, list_price: 799_000, sale_price: 699_000, stock_status: "OK" },
          { offer_type: "SET_QUAN", color: "DO", size: "L", stock_quantity: 2, list_price: 799_000, sale_price: 699_000, stock_status: "OK" },
        ],
      },
    },
  };
}

describe("canonical catalog projection", () => {
  it("builds a stable Redis key", () => {
    expect(catalogSnapshotKey("Lana", "sq-149")).toBe("catalog:offer:LANA:SQ_149");
  });

  it("resolves verified price, stock and available sizes", () => {
    const result = resolveCatalogFacts(snapshot(), {
      shopAlias: "LANA",
      productId: "SQ149",
      intent: "PRICE",
      offerType: "SET_QUAN",
      color: "DEN",
      size: "M",
      deliveryRegion: null,
    }, now);
    expect(result.status).toBe("OK");
    expect(result.facts).toMatchObject({
      salePriceVnd: 699_000,
      stockStatus: "IN_STOCK",
      stockQuantity: 3,
      sizes: ["M"],
      deliveryEta: null,
      fulfillmentPolicy: "READY_STOCK",
    });
  });

  it("adds parent preparation time to verified regional transit time", () => {
    const result = resolveCatalogFacts(snapshot(), {
      shopAlias: "LANA",
      productId: "SQ149",
      intent: "ETA",
      offerType: "SET_QUAN",
      color: null,
      size: null,
      deliveryRegion: "Tây Ninh",
    }, now);
    expect(result.status).toBe("OK");
    expect(result.facts?.deliveryEta).toEqual({ minDays: 3, maxDays: 5 });
  });

  it("fails closed for missing region and stale snapshots", () => {
    const missingRegion = resolveCatalogFacts(snapshot(), {
      shopAlias: "LANA", productId: "SQ149", intent: "ETA",
      offerType: null, color: null, size: null, deliveryRegion: null,
    }, now);
    expect(missingRegion).toMatchObject({ status: "NOT_FOUND", reasonCode: "DELIVERY_REGION_REQUIRED" });

    const stale = resolveCatalogFacts({ ...snapshot(), synced_at: "2026-07-15T09:00:00.000Z" }, {
      shopAlias: "LANA", productId: "SQ149", intent: "STOCK",
      offerType: null, color: null, size: null, deliveryRegion: null,
    }, now);
    expect(stale).toMatchObject({ status: "STALE", reasonCode: "CATALOG_SNAPSHOT_STALE" });
  });

  it("does not substitute a different offer when the requested offer is missing", () => {
    const result = resolveCatalogFacts(snapshot(), {
      shopAlias: "LANA", productId: "SQ149", intent: "PRICE",
      offerType: "AO", color: null, size: null, deliveryRegion: null,
    }, now);
    expect(result).toMatchObject({ status: "NOT_FOUND", reasonCode: "OFFER_NOT_FOUND" });
  });

  it("fails closed when POS/BOM row status is invalid", () => {
    const broken = snapshot();
    broken.offers.SET_QUAN.rows[1]!.stock_status = "BOM_REQUIRED_MISSING";
    const result = resolveCatalogFacts(broken, {
      shopAlias: "LANA", productId: "SQ149", intent: "STOCK",
      offerType: "SET_QUAN", color: "DEN", size: "M", deliveryRegion: null,
    }, now);
    expect(result).toMatchObject({ status: "ERROR", reasonCode: "VARIANT_BOM_REQUIRED_MISSING" });
  });

  it("rejects an invalid ETA validity timestamp", () => {
    const invalid = snapshot();
    invalid.fulfillment_policy.eta_valid_until = "not-a-date";
    const result = resolveCatalogFacts(invalid, {
      shopAlias: "LANA", productId: "SQ149", intent: "ETA",
      offerType: "SET_QUAN", color: null, size: null, deliveryRegion: "Tay Ninh",
    }, now);
    expect(result).toMatchObject({ status: "NOT_FOUND", reasonCode: "ETA_DATA_MISSING_OR_EXPIRED" });
  });

  it("allows verified positive stock and price but blocks ETA when only policy is missing", () => {
    const missingPolicy = { ...snapshot(), data_status: "FULFILLMENT_POLICY_NOT_FOUND", fulfillment_policy: null };
    const price = resolveCatalogFacts(missingPolicy, {
      shopAlias: "LANA", productId: "SQ149", intent: "PRICE",
      offerType: "SET_QUAN", color: "DEN", size: "M", deliveryRegion: null,
    }, now);
    expect(price).toMatchObject({ status: "OK", facts: { stockStatus: "IN_STOCK", fulfillmentPolicy: null } });
    const eta = resolveCatalogFacts(missingPolicy, {
      shopAlias: "LANA", productId: "SQ149", intent: "ETA",
      offerType: "SET_QUAN", color: null, size: null, deliveryRegion: "Tay Ninh",
    }, now);
    expect(eta).toMatchObject({ status: "NOT_FOUND", reasonCode: "FULFILLMENT_POLICY_NOT_FOUND" });
  });

  it("allows ETA when ETA_VALID_UNTIL is intentionally blank", () => {
    const noExpiry = snapshot();
    noExpiry.fulfillment_policy.eta_valid_until = "";
    const result = resolveCatalogFacts(noExpiry, {
      shopAlias: "LANA", productId: "SQ149", intent: "ETA",
      offerType: "SET_QUAN", color: null, size: null, deliveryRegion: "Tay Ninh",
    }, now);
    expect(result).toMatchObject({
      status: "OK",
      facts: { deliveryEta: { minDays: 3, maxDays: 5 } },
    });
  });

  it("uses preorder status and preparation ETA only for an orderable zero-stock variant", () => {
    const orderable = snapshot();
    orderable.fulfillment_policy.can_order_when_zero = true;
    const stock = resolveCatalogFacts(orderable, {
      shopAlias: "LANA", productId: "SQ149", intent: "STOCK",
      offerType: "SET_QUAN", color: "DEN", size: "S", deliveryRegion: null,
    }, now);
    expect(stock).toMatchObject({
      status: "OK",
      facts: {
        stockQuantity: 0,
        stockStatus: "PRE_ORDER",
        fulfillmentPolicy: "PRE_ORDER",
      },
    });

    const eta = resolveCatalogFacts(orderable, {
      shopAlias: "LANA", productId: "SQ149", intent: "ETA",
      offerType: "SET_QUAN", color: "DEN", size: "S", deliveryRegion: "Tay Ninh",
    }, now);
    expect(eta).toMatchObject({
      status: "OK",
      facts: {
        stockStatus: "PRE_ORDER",
        deliveryEta: { minDays: 7, maxDays: 13 },
        fulfillmentPolicy: "PRE_ORDER",
      },
    });

    const inStockEta = resolveCatalogFacts(orderable, {
      shopAlias: "LANA", productId: "SQ149", intent: "ETA",
      offerType: "SET_QUAN", color: "DEN", size: "M", deliveryRegion: "Tay Ninh",
    }, now);
    expect(inStockEta).toMatchObject({
      status: "OK",
      facts: {
        stockStatus: "IN_STOCK",
        deliveryEta: { minDays: 3, maxDays: 5 },
        fulfillmentPolicy: "READY_STOCK",
      },
    });
  });
});
