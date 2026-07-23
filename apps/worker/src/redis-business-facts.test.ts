import type { CatalogFactQuery, CatalogSnapshotV3 } from "@lana/business-tools";
import { describe, expect, it } from "vitest";
import { businessFactMaxAgeSeconds, catalogPolicyContext } from "./redis-business-facts.js";

const snapshot = (tinhTrang: string, canOrderWhenZero: boolean): CatalogSnapshotV3 => ({
  schema_version: 3,
  release_id: "release-1",
  catalog_version: "catalog-v2",
  policy_version: "policy-v1",
  shop_alias: "LANA",
  brand: "lanadesign",
  product_id: "SV695",
  synced_at: "2026-07-17T00:00:00.000Z",
  data_status: "OK",
  fulfillment_policy: {
    tinh_trang: tinhTrang,
    can_order_when_zero: canOrderWhenZero,
    prep_min_days: 5,
    prep_max_days: 8,
    zero_stock_policy: "",
    zero_stock_prep_min_days: null,
    zero_stock_prep_max_days: null,
    eta_valid_until: "",
  },
  shipping_eta: {},
  selling_rules: {
    allow_mixed_sizes: false,
    allow_component_sale: false,
    source_version: "product-registry:SV695",
  },
  offers: {},
});

const query = (intent: CatalogFactQuery["intent"]): CatalogFactQuery => ({
  shopAlias: "LANA",
  productId: "SV695",
  intent,
  offerType: null,
  color: null,
  size: null,
  deliveryRegion: null,
});

describe("business-fact freshness policy", () => {
  it("keeps all strict ready-stock facts on the short freshness window", () => {
    const value = snapshot("READY_STOCK", false);
    expect(catalogPolicyContext(value)).toEqual({
      fulfillmentPolicy: "READY_STOCK",
      canOrderWhenZero: false,
    });
    for (const intent of ["INFO", "PRICE", "STOCK", "SIZE", "ETA"] as const) {
      expect(businessFactMaxAgeSeconds(value, query(intent), 7_200, 172_800)).toBe(7_200);
    }
  });

  it("allows retained price and ETA but keeps stock and size volatile for preorder", () => {
    const value = snapshot("PRE_ORDER", true);
    expect(businessFactMaxAgeSeconds(value, query("PRICE"), 7_200, 172_800)).toBe(172_800);
    expect(businessFactMaxAgeSeconds(value, query("ETA"), 7_200, 172_800)).toBe(172_800);
    expect(businessFactMaxAgeSeconds(value, query("STOCK"), 7_200, 172_800)).toBe(7_200);
    expect(businessFactMaxAgeSeconds(value, query("SIZE"), 7_200, 172_800)).toBe(7_200);
  });
});
