import { describe, expect, it } from "vitest";
import {
  buildIndex,
  buildInventoryMatrix,
  buildProductSnapshot,
  buildSheetConfig,
  collectAlertRows,
  defaultMappings,
  fieldValue,
  parseSheetValues,
  posBool,
  posNorm,
  posNum,
  priceAt,
  type PosProduct,
  type PosShopConfig,
} from "./pos-snapshot-core.js";

const shop: PosShopConfig = { alias: "LANA", shopId: "4741464", apiKey: "key", warehouseIds: [] };

const variation = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  id: "var-1",
  display_id: "SV695-S",
  retail_price: 1_395_000,
  remain_quantity: 5,
  updated_at: "2026-04-07T11:25:14",
  product: { display_id: "SV695" },
  fields: [
    { name: "Màu", value: "TRẮNG" },
    { name: "Size", value: "S" },
  ],
  ...overrides,
});

describe("posNorm semantics (giống n8n)", () => {
  it("bỏ dấu, uppercase, gộp separator thành dấu gạch", () => {
    expect(posNorm("sv 695")).toBe("SV-695");
    expect(posNorm("Đầm dạ hội")).toBe("DAM-DA-HOI");
    expect(posNorm("  sq_149.a ")).toBe("SQ-149-A");
    expect(posNorm("")).toBe("");
  });

  it("posBool nhận diện các giá trị tắt", () => {
    expect(posBool("", true)).toBe(true);
    expect(posBool("", false)).toBe(false);
    expect(posBool("FALSE")).toBe(false);
    expect(posBool("không")).toBe(false);
    expect(posBool("0")).toBe(false);
    expect(posBool("yes")).toBe(true);
  });

  it("posNum tách số từ chuỗi", () => {
    expect(posNum("1.395.000 đ")).toBeNull();
    expect(posNum("1,5")).toBe(15);
    expect(posNum("1395000")).toBe(1_395_000);
    expect(posNum("")).toBeNull();
    expect(posNum("abc")).toBe(0);
  });

  it("fieldValue khớp tên có dấu và không dấu", () => {
    const fields = [{ name: "Màu sắc", value: "" }, { name: "màu", value: "ĐỎ" }];
    expect(fieldValue(fields, ["màu", "mau", "color", "colour"])).toBe("ĐỎ");
    expect(fieldValue([], ["size"])).toBe("");
  });
});

describe("parseSheetValues", () => {
  it("chuyển ma trận giá trị thành object theo header", () => {
    const rows = parseSheetValues([
      ["MA_SP", "ACTIVE", ""],
      ["SV695", "TRUE", "ignored"],
      ["", "", ""],
    ]);
    expect(rows).toEqual([{ MA_SP: "SV695", ACTIVE: "TRUE" }]);
  });
});

describe("buildSheetConfig", () => {
  it("ánh xạ shop secret theo alias và đọc registry", () => {
    const config = buildSheetConfig(
      {
        configShopId: [{ SHOP_ALIAS: "LANA", ENABLED: "TRUE", WAREHOUSE_IDS: "w1|w2" }],
        productRegistry: [
          { MA_SP: "SV695", ACTIVE: "TRUE", BRAND: "lanadesign" },
          { MA_SP: "SD001", ACTIVE: "FALSE" },
        ],
        componentMapping: [],
        fulfillmentPolicy: [
          { MA_SP: "SV695", ENABLED: "TRUE", TINH_TRANG: "READY-STOCK", CAN_ORDER_WHEN_ZERO: "TRUE", PREP_MIN_DAYS: "1", PREP_MAX_DAYS: "2" },
        ],
        shippingEta: [
          { REGION: "MIEN-BAC", ENABLED: "TRUE", TRANSIT_MIN_DAYS: "2", TRANSIT_MAX_DAYS: "4" },
        ],
      },
      { LANA: { shop_id: "4741464", api_key: "secret-key" } },
    );
    expect(config.shopConfigs.get("LANA")).toEqual({
      alias: "LANA",
      shopId: "4741464",
      apiKey: "secret-key",
      warehouseIds: ["w1", "w2"],
    });
    expect(config.products).toHaveLength(1);
    expect(config.products[0]?.ma_sp).toBe("SV695");
    expect(config.products[0]?.rule_type).toBe("SV");
    expect(config.policies.get("SV695")?.tinh_trang).toBe("READY-STOCK");
    expect(config.shipping["MIEN-BAC"]).toEqual({ transit_min_days: 2, transit_max_days: 4 });
  });
});

describe("buildIndex", () => {
  it("gom qty theo màu/size và ghi nhận BOM composite", () => {
    const { idx, bomIdx } = buildIndex([
      variation({
        is_composite: true,
        composite_products: [
          { component_id: "c1", quantity: 1, component: { display_id: "SV695-AO-S", product: { display_id: "SV695-AO" }, fields: [{ name: "Size", value: "S" }] } },
          { component_id: "c2", quantity: 1, component: { display_id: "SV695-CV-S", product: { display_id: "SV695-CV" }, fields: [{ name: "Size", value: "S" }] } },
        ],
      }),
    ], shop);
    const entry = idx.get("SV695")?.get("TRANG|S");
    expect(entry?.qty).toBe(5);
    expect([...(entry?.prices ?? [])]).toEqual([1_395_000]);
    const bomEntry = bomIdx.get("SV695")?.get("TRANG|S");
    expect(bomEntry?.components).toHaveLength(2);
    expect(bomEntry?.components[0]?.product_sku).toBe("SV695-AO");
    expect([...(bomEntry?.parent_variation_skus ?? [])]).toEqual(["SV695-S"]);
  });

  it("lọc theo warehouse và ẩn số lượng khi không có quyền xem", () => {
    const warehouseShop: PosShopConfig = { ...shop, warehouseIds: ["w1"] };
    const { idx } = buildIndex([
      variation({
        variations_warehouses: [
          { warehouse_id: "w1", available_quantity: 3 },
          { warehouse_id: "w2", available_quantity: 100 },
        ],
      }),
      variation({
        fields: [{ name: "Màu", value: "TRẮNG" }, { name: "Size", value: "M" }],
        variations_warehouses: [{ warehouse_id: "w1", not_permission_view_quantity: true }],
      }),
    ], warehouseShop);
    expect(idx.get("SV695")?.get("TRANG|S")?.qty).toBe(3);
    const hidden = idx.get("SV695")?.get("TRANG|M");
    expect(hidden?.hidden).toBe(true);
    expect(hidden?.qty).toBeNull();
  });

  it("cộng dồn nhiều biến thể cùng màu/size", () => {
    const { idx } = buildIndex([
      variation({}),
      variation({ id: "var-2", display_id: "SV695-S-2", remain_quantity: 2 }),
    ], shop);
    expect(idx.get("SV695")?.get("TRANG|S")?.qty).toBe(7);
  });
});

describe("priceAt", () => {
  it("ưu tiên đúng thứ tự khóa fallback và báo ambiguous", () => {
    const { idx } = buildIndex([
      variation({}),
      variation({
        id: "var-3",
        retail_price: 999_000,
        fields: [{ name: "Màu", value: "ĐEN" }, { name: "Size", value: "M" }],
      }),
    ], shop);
    expect(priceAt(idx, "SV695", "TRANG", "S")).toEqual({ value: 1_395_000, status: "OK" });
    expect(priceAt(idx, "SV695", "DEN", "M")).toEqual({ value: 999_000, status: "OK" });
    expect(priceAt(idx, "SV695", "XANH", "L")).toEqual({ value: null, status: "PRICE_AMBIGUOUS" });
    expect(priceAt(idx, "KHONG-CO", "TRANG", "S")).toEqual({ value: null, status: "PRICE_NOT_FOUND" });
  });
});

describe("defaultMappings", () => {
  const product: PosProduct = { ma_sp: "SV695", shop_alias: "LANA", brand: "lanadesign", rule_type: "SV" };

  it("SV có BOM tạo SET_VAY và thành phần có giá", () => {
    const { idx, bomIdx } = buildIndex([
      variation({
        is_composite: true,
        composite_products: [
          { component_id: "c1", quantity: 1, component: { display_id: "SV695-AO-S", product: { display_id: "SV695-AO" } } },
          { component_id: "c2", quantity: 1, component: { display_id: "SV695-CV-S", product: { display_id: "SV695-CV" } } },
        ],
      }),
      variation({ id: "ao", product: { display_id: "SV695-AO" }, retail_price: 500_000 }),
    ], shop);
    const mappings = defaultMappings(product, bomIdx, idx);
    expect(mappings[0]).toEqual({
      offer_type: "SET_VAY", price_sku: "SV695", c1: "SV695-AO", c2: "SV695-CV", inventory_mode: "AUTO_BOM",
    });
    expect(mappings.some((m) => m.offer_type === "AO" && m.price_sku === "SV695-AO")).toBe(true);
    expect(mappings.some((m) => m.offer_type === "CV")).toBe(false);
  });

  it("mã thường không BOM trả DIRECT khi có trong POS", () => {
    const direct: PosProduct = { ma_sp: "SD438", shop_alias: "LANA", brand: "lanadesign", rule_type: "SD" };
    const { idx, bomIdx } = buildIndex([
      variation({ product: { display_id: "SD438" } }),
    ], shop);
    expect(defaultMappings(direct, bomIdx, idx)).toEqual([
      { offer_type: "DIRECT", price_sku: "SD438", c1: "SD438", c2: "", inventory_mode: "DIRECT" },
    ]);
  });

  it("mã vắng mặt hoàn toàn trả mảng rỗng", () => {
    const missing: PosProduct = { ma_sp: "XX999", shop_alias: "LANA", brand: "lanadesign", rule_type: "XX" };
    expect(defaultMappings(missing, new Map(), new Map())).toEqual([]);
  });
});

describe("buildProductSnapshot", () => {
  const product: PosProduct = { ma_sp: "SV695", shop_alias: "LANA", brand: "lanadesign", rule_type: "SV" };
  const policy = {
    tinh_trang: "READY-STOCK",
    can_order_when_zero: true,
    prep_min_days: 1,
    prep_max_days: 2,
    zero_stock_policy: "PRE-ORDER",
    zero_stock_prep_min_days: 5,
    zero_stock_prep_max_days: 8,
    eta_updated_at: "",
    eta_valid_until: "",
  };
  const now = "2026-07-21T06:00:00.000Z";

  it("dựng snapshot BOM-first với inventory_source PANCAKE_BOM", () => {
    const { idx, bomIdx } = buildIndex([
      variation({
        is_composite: true,
        composite_products: [
          { component_id: "c1", quantity: 1, component: { display_id: "SV695-AO-S", product: { display_id: "SV695-AO" } } },
          { component_id: "c2", quantity: 1, component: { display_id: "SV695-CV-S", product: { display_id: "SV695-CV" } } },
        ],
      }),
    ], shop);
    const mappings = defaultMappings(product, bomIdx, idx);
    const { catalog, statusRows } = buildProductSnapshot(
      product, mappings, policy, idx, bomIdx, { "MIEN-BAC": { transit_min_days: 2, transit_max_days: 4 } }, {}, now,
    );
    expect(catalog.schema_version).toBe(3);
    expect(catalog.data_status).toBe("OK");
    expect(catalog.release_id).toBe("p2-default");
    const offer = catalog.offers.SET_VAY;
    expect(offer?.inventory_source).toBe("PANCAKE_BOM");
    expect(offer?.sale_price).toBe(1_395_000);
    expect(offer?.price_status).toBe("OK");
    expect(offer?.rows[0]?.stock_quantity).toBe(5);
    expect(offer?.rows[0]?.bom_status).toBe("OK");
    expect(offer?.rows[0]?.bom_components).toBe("SV695-AO x1 | SV695-CV x1");
    expect(statusRows.every((row) => row.SYNC_STATUS === "OK")).toBe(true);
  });

  it("fallback SKU rule khi không có BOM và tồn set = MIN thành phần", () => {
    const { idx, bomIdx } = buildIndex([
      variation({ product: { display_id: "SV695-AO" }, remain_quantity: 5, retail_price: null }),
      variation({ id: "cv", product: { display_id: "SV695-CV" }, remain_quantity: 3, retail_price: null }),
      variation({ id: "gia", product: { display_id: "SV695" }, remain_quantity: 0 }),
    ], shop);
    const mappings = [{ offer_type: "SET_VAY", price_sku: "SV695", c1: "SV695-AO", c2: "SV695-CV", inventory_mode: "" }];
    const { catalog } = buildProductSnapshot(
      product, mappings, policy, idx, bomIdx, {}, {}, now,
    );
    const offer = catalog.offers.SET_VAY;
    expect(offer?.inventory_source).toBe("FALLBACK_SKU_RULE");
    expect(offer?.rows[0]?.stock_quantity).toBe(3);
    expect(offer?.rows[0]?.bom_status).toBe("BOM_MISSING_FALLBACK");
  });

  it("không mapping nào tạo PRODUCT_NOT_FOUND và vẫn có snapshot", () => {
    const { catalog, statusRows } = buildProductSnapshot(
      product, [], policy, new Map(), new Map(), {}, {}, now,
    );
    expect(catalog.data_status).toBe("PRODUCT_NOT_FOUND");
    expect(statusRows[0]?.SYNC_STATUS).toBe("PRODUCT_NOT_FOUND");
    expect(collectAlertRows(statusRows)).toHaveLength(1);
  });

  it("thiếu fulfillment policy đặt data_status tương ứng", () => {
    const { idx, bomIdx } = buildIndex([variation({ product: { display_id: "SV695" } })], shop);
    const mappings = [{ offer_type: "DIRECT", price_sku: "SV695", c1: "SV695", c2: "", inventory_mode: "DIRECT" }];
    const { catalog } = buildProductSnapshot(product, mappings, null, idx, bomIdx, {}, {}, now);
    expect(catalog.data_status).toBe("FULFILLMENT_POLICY_NOT_FOUND");
  });

  it("release info từ Redis được áp vào snapshot", () => {
    const { idx, bomIdx } = buildIndex([variation({ product: { display_id: "SV695" } })], shop);
    const mappings = [{ offer_type: "DIRECT", price_sku: "SV695", c1: "SV695", c2: "", inventory_mode: "DIRECT" }];
    const { catalog } = buildProductSnapshot(
      product, mappings, policy, idx, bomIdx, {},
      { release_id: "r-9", catalog_version: "cat-9", policy_version: "pol-9" }, now,
    );
    expect(catalog.release_id).toBe("r-9");
    expect(catalog.catalog_version).toBe("cat-9");
    expect(catalog.policy_version).toBe("pol-9");
  });
});

describe("buildInventoryMatrix", () => {
  it("pad tới số dòng trước đó để ghi đè dữ liệu cũ", () => {
    const matrix = buildInventoryMatrix([], 5);
    expect(matrix).toHaveLength(5);
    expect(matrix[0]?.[0]).toBe("SNAPSHOT_KEY");
    expect(matrix[4]?.every((cell) => cell === "")).toBe(true);
  });
});
