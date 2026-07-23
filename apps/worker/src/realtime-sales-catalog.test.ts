import { describe, expect, it } from "vitest";
import { cartSelectionFromSnapshot } from "./realtime-sales-catalog.js";

const observedAt = "2026-07-23T02:00:00.000Z";
const now = new Date("2026-07-23T03:00:00.000Z");

function snapshot(stockQuantity = 3) {
  return {
    schema_version: 3,
    release_id: "pos-release-1",
    catalog_version: "catalog-v3",
    policy_version: "fulfillment-v2",
    shop_alias: "LANA",
    brand: "lanadesign",
    product_id: "CB182",
    synced_at: observedAt,
    data_status: "OK",
    fulfillment_policy: {
      tinh_trang: "READY_STOCK",
      can_order_when_zero: false,
      prep_min_days: 1,
      prep_max_days: 2,
      zero_stock_policy: "",
      zero_stock_prep_min_days: null,
      zero_stock_prep_max_days: null,
      eta_valid_until: "",
    },
    selling_rules: {
      allow_mixed_sizes: true,
      allow_component_sale: false,
      source_version: "registry:CB182:7",
    },
    shipping_eta: {
      DEFAULT: { transit_min_days: 2, transit_max_days: 4 },
    },
    offers: {
      SET: {
        list_price: 799_000,
        sale_price: 699_000,
        price_status: "OK",
        rows: [
          {
            offer_type: "SET",
            price_sku: "CB182-SET",
            color: "BE",
            size: "M",
            stock_quantity: stockQuantity,
            list_price: 799_000,
            sale_price: 699_000,
            stock_status: "OK",
            components: [
              {
                product_sku: "CB182-AO",
                variation_sku: "CB182-AO-BE-M",
                quantity: 1,
                color: "BE",
                size: "M",
              },
              {
                product_sku: "CB182-CV",
                variation_sku: "CB182-CV-BE-M",
                quantity: 1,
                color: "BE",
                size: "M",
              },
            ],
          },
        ],
      },
    },
  };
}

describe("realtime sales catalog", () => {
  it("builds a POS-authoritative cart line with BOM, selling rules and ETA", () => {
    const result = cartSelectionFromSnapshot(snapshot(), {
      shopAlias: "LANA",
      productId: "CB182",
      offerType: "SET",
      size: "M",
      color: "BE",
      quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
      deliveryAddress: "Tân Châu, Tây Ninh",
    }, now);

    expect(result).toMatchObject({
      status: "READY",
      line: {
        parentProductId: "CB182",
        offerKind: "SET",
        posUnitPriceVnd: 699_000,
        allowMixedSizes: true,
        allowComponentSale: false,
        components: [
          { componentProductId: "CB182_AO", componentRole: "TOP", size: "M" },
          { componentProductId: "CB182_CV", componentRole: "SKIRT", size: "M" },
        ],
        priceAuthority: {
          metadata: {
            authority: "PANCAKE_POS",
            freshForSeconds: 172_800,
          },
        },
      },
      eta: { minDays: 3, maxDays: 6 },
    });
  });

  it("requires a verified size and never fabricates price or stock", () => {
    expect(cartSelectionFromSnapshot(snapshot(), {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: null, color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
    }, now)).toMatchObject({ status: "SIZE_REQUIRED", availableSizes: ["M"] });

    const missingPrice = snapshot();
    missingPrice.offers.SET.sale_price = null as never;
    missingPrice.offers.SET.rows[0]!.sale_price = null as never;
    expect(cartSelectionFromSnapshot(missingPrice, {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
    }, now)).toMatchObject({ status: "PRICE_UNAVAILABLE" });

    expect(cartSelectionFromSnapshot(snapshot(0), {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
    }, now)).toMatchObject({ status: "OUT_OF_STOCK" });
  });

  it("separates the 48-hour storage window from fact freshness", () => {
    expect(cartSelectionFromSnapshot(snapshot(), {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
    }, new Date("2026-07-25T02:00:00.001Z")))
      .toMatchObject({ status: "STALE", reasonCode: "CATALOG_PRICE_STALE" });
  });
});
