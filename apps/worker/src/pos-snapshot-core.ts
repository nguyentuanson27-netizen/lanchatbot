/**
 * Port nguyên trạng logic "P2.2 - POS Snapshot + Telegram Alerts" (n8n workflow
 * P2POSV3LANA0001, node "Build POS Snapshot and Redis") sang app.
 * Mọi quy tắc chuẩn hóa/BOM-first phải giữ đúng semantics của n8n để snapshot
 * app khớp snapshot n8n trong giai đoạn chạy song song.
 */

export interface PosShopSecret {
  readonly shop_id?: string;
  readonly shopId?: string;
  readonly api_key?: string;
  readonly apiKey?: string;
}

export type PosShopsSecretMap = Readonly<Record<string, PosShopSecret>>;

export interface PosShopConfig {
  readonly alias: string;
  readonly shopId: string;
  readonly apiKey: string;
  readonly warehouseIds: readonly string[];
}

export interface PosProduct {
  readonly ma_sp: string;
  readonly shop_alias: string;
  readonly brand: string;
  readonly rule_type: string;
}

export interface PosComponentMapping {
  readonly offer_type: string;
  readonly price_sku: string;
  readonly inventory_mode: string;
  readonly c1: string;
  readonly c2: string;
}

export interface PosFulfillmentPolicy {
  readonly tinh_trang: string;
  readonly can_order_when_zero: boolean;
  readonly prep_min_days: number | null;
  readonly prep_max_days: number | null;
  readonly zero_stock_policy: string;
  readonly zero_stock_prep_min_days: number | null;
  readonly zero_stock_prep_max_days: number | null;
  readonly eta_updated_at: string;
  readonly eta_valid_until: string;
}

export interface PosShippingRegion {
  readonly transit_min_days: number | null;
  readonly transit_max_days: number | null;
}

export interface PosSheetConfig {
  readonly shopConfigs: ReadonlyMap<string, PosShopConfig>;
  readonly products: readonly PosProduct[];
  readonly mapsByProduct: ReadonlyMap<string, readonly PosComponentMapping[]>;
  readonly policies: ReadonlyMap<string, PosFulfillmentPolicy>;
  readonly shipping: Readonly<Record<string, PosShippingRegion>>;
}

export interface PosVariationField {
  readonly name?: unknown;
  readonly value?: unknown;
  readonly keyValue?: unknown;
}

export interface PosBomComponent {
  readonly component_id: string;
  readonly quantity: number;
  readonly product_sku: string;
  readonly variation_sku: string;
  readonly color: string;
  readonly size: string;
}

export interface PosIndexEntry {
  color: string;
  size: string;
  qty: number | null;
  prices: Set<number>;
  updated_at: string;
  hidden: boolean;
}

export interface PosBomIndexEntry extends PosIndexEntry {
  components: PosBomComponent[];
  parent_variation_ids: Set<string>;
  parent_variation_skus: Set<string>;
}

export type PosIndex = Map<string, Map<string, PosIndexEntry>>;
export type PosBomIndex = Map<string, Map<string, PosBomIndexEntry>>;

export interface PosOfferRow {
  offer_type: string;
  price_sku: string;
  component_1_sku: string;
  component_2_sku: string;
  color: string;
  size: string;
  stock_quantity: number | null;
  list_price: number | null;
  sale_price: number | null;
  stock_status: string;
  pos_updated_at: string;
  inventory_source: string;
  bom_status: string;
  parent_variation_id: string;
  parent_variation_sku: string;
  bom_components: string;
  component_count: number;
  components: PosBomComponent[];
}

export interface PosCatalogSnapshot {
  schema_version: 3;
  release_id: string;
  catalog_version: string;
  policy_version: string;
  shop_alias: string;
  brand: string;
  product_id: string;
  synced_at: string;
  data_status: string;
  fulfillment_policy: PosFulfillmentPolicy | null;
  shipping_eta: Readonly<Record<string, PosShippingRegion>>;
  offers: Record<string, {
    list_price: number | null;
    sale_price: number | null;
    price_status: string;
    inventory_source: string;
    rows: PosOfferRow[];
  }>;
}

export interface PosStatusRow {
  SNAPSHOT_KEY: string;
  SHOP_ALIAS: string;
  PRODUCT_ID: string;
  OFFER_TYPE: string;
  PRICE_SKU: string;
  COMPONENT_1_SKU: string;
  COMPONENT_2_SKU: string;
  COLOR: string;
  SIZE: string;
  STOCK_QUANTITY: number | null;
  LIST_PRICE: number | null;
  SALE_PRICE: number | null;
  STOCK_STATUS: string;
  INVENTORY_SOURCE: string;
  BOM_STATUS: string;
  PARENT_VARIATION_ID: string;
  PARENT_VARIATION_SKU: string;
  BOM_COMPONENTS: string;
  COMPONENT_COUNT: number;
  TINH_TRANG: string;
  CAN_ORDER_WHEN_ZERO: boolean;
  PREP_MIN_DAYS: number | null;
  PREP_MAX_DAYS: number | null;
  ZERO_STOCK_POLICY: string;
  ZERO_STOCK_PREP_MIN_DAYS: number | null;
  ZERO_STOCK_PREP_MAX_DAYS: number | null;
  POS_UPDATED_AT: string;
  SYNCED_AT: string;
  SYNC_STATUS: string;
  SYNC_ERROR: string;
}

type SheetRow = Readonly<Record<string, unknown>>;

export interface PosSheetTabs {
  readonly configShopId: readonly SheetRow[];
  readonly productRegistry: readonly SheetRow[];
  readonly componentMapping: readonly SheetRow[];
  readonly fulfillmentPolicy: readonly SheetRow[];
  readonly shippingEta: readonly SheetRow[];
}

// --- Chuẩn hóa: giữ đúng semantics các helper trong node n8n ---

export function normHead(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, "_")
    .replace(/^_|_$/gu, "");
}

export function txt(value: unknown): string {
  return String(value ?? "").trim();
}

export function posNorm(value: unknown): string {
  return txt(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "D")
    .toUpperCase()
    .replace(/[_.\s]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
}

export function posBool(value: unknown, defaultValue = true): boolean {
  const raw = txt(value);
  if (raw === "") return defaultValue;
  return !["FALSE", "0", "NO", "OFF", "KHONG"].includes(posNorm(raw));
}

export function posNum(value: unknown): number | null {
  const raw = txt(value);
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.-]/gu, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normRow(row: SheetRow): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) => [normHead(key), value]));
}

export function fieldValue(fields: unknown, names: readonly string[]): string {
  const wanted = new Set(names.map(posNorm));
  for (const field of Array.isArray(fields) ? (fields as PosVariationField[]) : []) {
    if (wanted.has(posNorm(field?.name))) return txt(field?.value ?? field?.keyValue);
  }
  return "";
}

// --- Parse các tab Google Sheets thành cấu hình có cấu trúc ---

export function parseSheetValues(values: unknown): SheetRow[] {
  const matrix = Array.isArray(values) ? (values as unknown[][]) : [];
  if (!matrix.length) return [];
  const headers = ((matrix[0] ?? []) as unknown[]).map((cell) => String(cell ?? "").trim());
  return matrix
    .slice(1)
    .filter((row) => (row ?? []).some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => Object.fromEntries(
      headers.map((header, index) => [header, (row ?? [])[index] ?? ""]).filter(([header]) => header),
    ));
}

export function buildSheetConfig(tabs: PosSheetTabs, secretMap: PosShopsSecretMap): PosSheetConfig {
  const shopConfigs = new Map<string, PosShopConfig>();
  for (const raw of tabs.configShopId) {
    const row = normRow(raw);
    if (!posBool(row.ENABLED, true)) continue;
    const alias = posNorm(row.SHOP_ALIAS || row.SHOP);
    const secret = secretMap[alias] ?? secretMap[txt(row.API_KEY_REF)] ?? {};
    if (alias) {
      shopConfigs.set(alias, {
        alias,
        shopId: txt(secret.shop_id ?? secret.shopId ?? row.SHOP_ID),
        apiKey: txt(secret.api_key ?? secret.apiKey),
        warehouseIds: txt(row.WAREHOUSE_IDS).split("|").map((part) => part.trim()).filter(Boolean),
      });
    }
  }

  const products: PosProduct[] = [];
  for (const raw of tabs.productRegistry) {
    const row = normRow(raw);
    const maSp = posNorm(row.MA_SP);
    if (maSp && posBool(row.ACTIVE, true)) {
      products.push({
        ma_sp: maSp,
        shop_alias: posNorm(row.SHOP_ALIAS || row.SHOP || "LANA"),
        brand: txt(row.BRAND || "lanadesign"),
        rule_type: posNorm(row.RULE_TYPE || maSp.slice(0, 2)),
      });
    }
  }

  const mapsByProduct = new Map<string, PosComponentMapping[]>();
  for (const raw of tabs.componentMapping) {
    const row = normRow(raw);
    if (!posBool(row.ENABLED, true)) continue;
    const maSp = posNorm(row.MA_SP);
    if (!maSp) continue;
    if (!mapsByProduct.has(maSp)) mapsByProduct.set(maSp, []);
    mapsByProduct.get(maSp)?.push({
      offer_type: posNorm(row.OFFER_TYPE),
      price_sku: posNorm(row.PRICE_SKU),
      inventory_mode: posNorm(row.INVENTORY_MODE || "AUTO_BOM"),
      c1: posNorm(row.COMPONENT_1_SKU),
      c2: posNorm(row.COMPONENT_2_SKU),
    });
  }

  const policies = new Map<string, PosFulfillmentPolicy>();
  for (const raw of tabs.fulfillmentPolicy) {
    const row = normRow(raw);
    const maSp = posNorm(row.MA_SP);
    if (!maSp || !posBool(row.ENABLED, true)) continue;
    policies.set(maSp, {
      tinh_trang: posNorm(row.TINH_TRANG),
      can_order_when_zero: posBool(row.CAN_ORDER_WHEN_ZERO, false),
      prep_min_days: posNum(row.PREP_MIN_DAYS),
      prep_max_days: posNum(row.PREP_MAX_DAYS),
      zero_stock_policy: posNorm(row.ZERO_STOCK_POLICY),
      zero_stock_prep_min_days: posNum(row.ZERO_STOCK_PREP_MIN_DAYS),
      zero_stock_prep_max_days: posNum(row.ZERO_STOCK_PREP_MAX_DAYS),
      eta_updated_at: txt(row.ETA_UPDATED_AT),
      eta_valid_until: txt(row.ETA_VALID_UNTIL),
    });
  }

  const shipping: Record<string, PosShippingRegion> = {};
  for (const raw of tabs.shippingEta) {
    const row = normRow(raw);
    const region = posNorm(row.REGION);
    if (region && posBool(row.ENABLED, true)) {
      shipping[region] = {
        transit_min_days: posNum(row.TRANSIT_MIN_DAYS),
        transit_max_days: posNum(row.TRANSIT_MAX_DAYS),
      };
    }
  }

  return { shopConfigs, products, mapsByProduct, policies, shipping };
}

// --- Index biến thể Pancake POS (BOM-first) ---

export function buildIndex(
  variations: readonly Record<string, unknown>[],
  shop: PosShopConfig,
): { idx: PosIndex; bomIdx: PosBomIndex } {
  const idx: PosIndex = new Map();
  const bomIdx: PosBomIndex = new Map();
  for (const variation of variations) {
    const v = variation as Record<string, any>;
    const sku = posNorm(v?.product?.display_id || v?.product?.custom_id || v?.product_display_id || "");
    if (!sku) continue;
    const color = posNorm(fieldValue(v?.fields, ["màu", "mau", "color", "colour"])) || "__NO_COLOR__";
    const size = posNorm(fieldValue(v?.fields, ["size", "kích cỡ", "kich co"])) || "*";
    const warehouses: any[] = Array.isArray(v?.variations_warehouses) ? v.variations_warehouses : [];
    const selected = shop.warehouseIds.length
      ? warehouses.filter((entry) => shop.warehouseIds.includes(txt(entry.warehouse_id)))
      : warehouses;
    const hidden = selected.some((entry) => entry.not_permission_view_quantity === true);
    const qty = hidden
      ? null
      : selected.length
        ? selected.reduce(
            (sum, entry) => sum + Math.max(0, Number(entry.available_quantity ?? entry.remain_quantity ?? 0)),
            0,
          )
        : shop.warehouseIds.length
          ? null
          : Math.max(0, Number(v?.remain_quantity || 0));
    const price = posNum(v.retail_price);
    const key = `${color}|${size}`;

    if (!idx.has(sku)) idx.set(sku, new Map());
    const skuEntries = idx.get(sku) as Map<string, PosIndexEntry>;
    const existing = skuEntries.get(key)
      ?? { color, size, qty: 0, prices: new Set<number>(), updated_at: "", hidden: false };
    existing.hidden = existing.hidden || hidden;
    existing.qty = existing.hidden ? null : Number(existing.qty || 0) + Number(qty || 0);
    if (price !== null && price > 0) existing.prices.add(price);
    existing.updated_at = txt(v.updated_at) || existing.updated_at;
    skuEntries.set(key, existing);

    const rawComponents: any[] = Array.isArray(v?.composite_products) ? v.composite_products : [];
    if (v?.is_composite === true && rawComponents.length) {
      const components: PosBomComponent[] = rawComponents.map((entry) => {
        const component = entry?.component ?? {};
        return {
          component_id: txt(entry?.component_id || component?.id),
          quantity: Math.max(1, Number(entry?.quantity || 1)),
          product_sku: posNorm(component?.product?.display_id || component?.product?.custom_id || ""),
          variation_sku: posNorm(component?.display_id || ""),
          color: posNorm(fieldValue(component?.fields, ["màu", "mau", "color", "colour"])) || "",
          size: posNorm(fieldValue(component?.fields, ["size", "kích cỡ", "kich co"])) || "",
        };
      });
      if (!bomIdx.has(sku)) bomIdx.set(sku, new Map());
      const bomEntries = bomIdx.get(sku) as Map<string, PosBomIndexEntry>;
      const bomEntry = bomEntries.get(key) ?? {
        color, size, qty: 0, prices: new Set<number>(), updated_at: "", hidden: false,
        components: [], parent_variation_ids: new Set<string>(), parent_variation_skus: new Set<string>(),
      };
      bomEntry.hidden = bomEntry.hidden || hidden;
      bomEntry.qty = bomEntry.hidden ? null : Number(bomEntry.qty || 0) + Number(qty || 0);
      if (price !== null && price > 0) bomEntry.prices.add(price);
      bomEntry.updated_at = txt(v.updated_at) || bomEntry.updated_at;
      for (const component of components) {
        if (!bomEntry.components.some(
          (item) => item.component_id === component.component_id && item.quantity === component.quantity,
        )) {
          bomEntry.components.push(component);
        }
      }
      if (v?.id) bomEntry.parent_variation_ids.add(txt(v.id));
      if (v?.display_id) bomEntry.parent_variation_skus.add(posNorm(v.display_id));
      bomEntries.set(key, bomEntry);
    }
  }
  return { idx, bomIdx };
}

// --- Giá và mapping mặc định ---

export function priceAt(
  idx: PosIndex,
  sku: string,
  color: string,
  size: string,
): { value: number | null; status: string } {
  const entries = idx.get(sku);
  if (!entries) return { value: null, status: "PRICE_NOT_FOUND" };
  const order = [`${color}|${size}`, `${color}|*`, `__NO_COLOR__|${size}`, "__NO_COLOR__|*"];
  for (const key of order) {
    const entry = entries.get(key);
    if (entry && entry.prices.size === 1) return { value: [...entry.prices][0] ?? null, status: "OK" };
  }
  const all = new Set<number>();
  for (const entry of entries.values()) for (const price of entry.prices) all.add(price);
  return all.size === 1
    ? { value: [...all][0] ?? null, status: "OK" }
    : { value: null, status: all.size ? "PRICE_AMBIGUOUS" : "PRICE_NOT_FOUND" };
}

function hasPositivePrice(idx: PosIndex, sku: string): boolean {
  const entries = idx.get(sku);
  if (!entries) return false;
  for (const entry of entries.values()) for (const price of entry.prices) if (Number(price) > 0) return true;
  return false;
}

function bomComponentSkus(bomIdx: PosBomIndex, sku: string): string[] {
  const out: string[] = [];
  const entries = bomIdx.get(sku);
  if (!entries) return out;
  for (const entry of entries.values()) {
    for (const component of entry.components ?? []) {
      const componentSku = posNorm(component.product_sku || component.variation_sku || "");
      if (componentSku && !out.includes(componentSku)) out.push(componentSku);
    }
  }
  return out;
}

export function defaultMappings(product: PosProduct, bomIdx: PosBomIndex, idx: PosIndex): PosComponentMapping[] {
  const code = product.ma_sp;
  const components = bomComponentSkus(bomIdx, code);
  const isCB = product.rule_type === "CB" || code.startsWith("CB");
  const isSQ = product.rule_type === "SQ" || code.startsWith("SQ");
  const isSV = product.rule_type === "SV" || code.startsWith("SV");
  if (components.length) {
    const ao = components.find((sku) => /-AO$/u.test(sku)) ?? "";
    const cv = components.find((sku) => /-CV$/u.test(sku)) ?? "";
    const quan = components.find((sku) => /-QUAN$/u.test(sku)) ?? "";
    let setType = "COMPOSITE";
    if (isCB) setType = cv && quan ? "COMBO_3" : quan ? "SET_QUAN" : cv ? "SET_CV" : "COMPOSITE";
    else if (isSQ) setType = "SET_QUAN";
    else if (isSV) setType = "SET_VAY";
    const out: PosComponentMapping[] = [{
      offer_type: setType,
      price_sku: code,
      c1: ao || components[0] || "",
      c2: cv || quan || components[1] || "",
      inventory_mode: "AUTO_BOM",
    }];
    const add = (offerType: string, sku: string): void => {
      if (sku && hasPositivePrice(idx, sku)) {
        out.push({ offer_type: offerType, price_sku: sku, c1: sku, c2: "", inventory_mode: "DIRECT" });
      }
    };
    add("AO", ao);
    add("CV", cv);
    add("QUAN", quan);
    return out;
  }
  if (idx.has(code)) {
    return [{ offer_type: "DIRECT", price_sku: code, c1: code, c2: "", inventory_mode: "DIRECT" }];
  }
  return [];
}

// --- Dựng snapshot cho một sản phẩm ---

export interface ReleaseInfo {
  readonly release_id?: string;
  readonly catalog_version?: string;
  readonly policy_version?: string;
}

export interface ProductSnapshotResult {
  readonly catalog: PosCatalogSnapshot;
  readonly statusRows: readonly PosStatusRow[];
}

function matrixOf<T>(index: Map<string, Map<string, T>>, sku: string): Map<string, T> {
  return index.get(sku) ?? new Map();
}

function mergeKeys(a: Map<string, unknown>, b: Map<string, unknown> | null): Set<string> {
  return new Set([...(a?.keys?.() ?? []), ...(b?.keys?.() ?? [])]);
}

export function buildProductSnapshot(
  product: PosProduct,
  mappings: readonly PosComponentMapping[],
  policy: PosFulfillmentPolicy | null,
  idx: PosIndex,
  bomIdx: PosBomIndex,
  shipping: Readonly<Record<string, PosShippingRegion>>,
  release: ReleaseInfo,
  now: string,
): ProductSnapshotResult {
  const shopAlias = product.shop_alias;
  const catalog: PosCatalogSnapshot = {
    schema_version: 3,
    release_id: release.release_id || "p2-default",
    catalog_version: release.catalog_version || "catalog-v2",
    policy_version: release.policy_version || "policy-v1",
    shop_alias: shopAlias,
    brand: product.brand,
    product_id: product.ma_sp,
    synced_at: now,
    data_status: "OK",
    fulfillment_policy: policy,
    shipping_eta: shipping,
    offers: {},
  };
  const statusRows: PosStatusRow[] = [];

  if (!mappings.length) {
    catalog.data_status = "PRODUCT_NOT_FOUND";
    statusRows.push({
      SNAPSHOT_KEY: [shopAlias, product.ma_sp, "PRODUCT_NOT_FOUND"].join("|"),
      SHOP_ALIAS: shopAlias,
      PRODUCT_ID: product.ma_sp,
      OFFER_TYPE: "",
      PRICE_SKU: "",
      COMPONENT_1_SKU: "",
      COMPONENT_2_SKU: "",
      COLOR: "__NO_COLOR__",
      SIZE: "*",
      STOCK_QUANTITY: 0,
      LIST_PRICE: null,
      SALE_PRICE: null,
      STOCK_STATUS: "PRODUCT_NOT_FOUND",
      INVENTORY_SOURCE: "PANCAKE_POS",
      BOM_STATUS: "PRODUCT_NOT_FOUND",
      PARENT_VARIATION_ID: "",
      PARENT_VARIATION_SKU: "",
      BOM_COMPONENTS: "",
      COMPONENT_COUNT: 0,
      TINH_TRANG: policy?.tinh_trang ?? "",
      CAN_ORDER_WHEN_ZERO: false,
      PREP_MIN_DAYS: policy?.prep_min_days ?? null,
      PREP_MAX_DAYS: policy?.prep_max_days ?? null,
      ZERO_STOCK_POLICY: "",
      ZERO_STOCK_PREP_MIN_DAYS: null,
      ZERO_STOCK_PREP_MAX_DAYS: null,
      POS_UPDATED_AT: "",
      SYNCED_AT: now,
      SYNC_STATUS: "PRODUCT_NOT_FOUND",
      SYNC_ERROR: "Product code is active in product_registry but absent from Pancake POS",
    });
    return { catalog, statusRows };
  }

  for (const mapping of mappings) {
    const mode = mapping.inventory_mode
      || ((mapping.c2 || /^SET|COMPOSITE/u.test(mapping.offer_type)) ? "AUTO_BOM" : "DIRECT");
    const bom = mapping.price_sku ? matrixOf(bomIdx, mapping.price_sku) : new Map<string, PosBomIndexEntry>();
    const useBom = !["DIRECT", "FALLBACK_SKU_RULE"].includes(mode) && bom.size > 0;
    const bomRequiredMissing = mode === "BOM_ONLY" && !useBom;
    const a: Map<string, PosIndexEntry | PosBomIndexEntry> = useBom ? bom : matrixOf(idx, mapping.c1);
    const b = useBom ? null : (mapping.c2 ? matrixOf(idx, mapping.c2) : null);
    const keys = useBom ? new Set(a.keys()) : mergeKeys(a, b);
    if (!keys.size) keys.add("__NO_COLOR__|*");
    const offerRows: PosOfferRow[] = [];

    for (const key of keys) {
      const [color = "", size = ""] = key.split("|");
      const entryA = a.get(key);
      const entryB = b?.get(key);
      let qty: number | null;
      let stockStatus = "OK";
      if (bomRequiredMissing) {
        qty = 0;
        stockStatus = "BOM_REQUIRED_MISSING";
      } else if (!entryA || (!useBom && mapping.c2 && !entryB)) {
        qty = 0;
        stockStatus = "COMPONENT_MISSING";
      } else if (entryA.hidden || entryB?.hidden) {
        qty = null;
        stockStatus = "QUANTITY_HIDDEN";
      } else {
        qty = useBom
          ? Number(entryA.qty || 0)
          : mapping.c2
            ? Math.min(Number(entryA.qty || 0), Number(entryB?.qty || 0))
            : Number(entryA.qty || 0);
      }
      const components = useBom ? ((entryA as PosBomIndexEntry | undefined)?.components ?? []) : [];
      const effectiveC1 = useBom
        ? posNorm(components[0]?.product_sku || components[0]?.variation_sku || "")
        : mapping.c1;
      const effectiveC2 = useBom
        ? posNorm(components[1]?.product_sku || components[1]?.variation_sku || "")
        : mapping.c2;
      const inventorySource = useBom
        ? "PANCAKE_BOM"
        : bomRequiredMissing
          ? "BOM_REQUIRED_MISSING"
          : mapping.c2
            ? "FALLBACK_SKU_RULE"
            : "PANCAKE_DIRECT";
      const bomStatus = useBom
        ? "OK"
        : bomRequiredMissing
          ? "BOM_REQUIRED_MISSING"
          : mapping.c2
            ? "BOM_MISSING_FALLBACK"
            : "NOT_APPLICABLE";
      const price = mapping.price_sku
        ? priceAt(idx, mapping.price_sku, color, size)
        : { value: null, status: "PRICE_NOT_FOUND" };
      const status = stockStatus !== "OK" ? stockStatus : price.status;
      const bomEntry = useBom ? (entryA as PosBomIndexEntry | undefined) : undefined;
      const parentVariationId = useBom ? [...(bomEntry?.parent_variation_ids ?? [])].join("|") : "";
      const parentVariationSku = useBom ? [...(bomEntry?.parent_variation_skus ?? [])].join("|") : "";
      const bomComponents = useBom
        ? components.map((c) => `${c.product_sku || c.variation_sku || c.component_id} x${c.quantity}`).join(" | ")
        : "";
      const row: PosOfferRow = {
        offer_type: mapping.offer_type,
        price_sku: mapping.price_sku,
        component_1_sku: effectiveC1,
        component_2_sku: effectiveC2,
        color,
        size,
        stock_quantity: qty,
        list_price: null,
        sale_price: price.value,
        stock_status: status,
        pos_updated_at: entryA?.updated_at || entryB?.updated_at || "",
        inventory_source: inventorySource,
        bom_status: bomStatus,
        parent_variation_id: parentVariationId,
        parent_variation_sku: parentVariationSku,
        bom_components: bomComponents,
        component_count: components.length,
        components,
      };
      offerRows.push(row);
      statusRows.push({
        SNAPSHOT_KEY: [shopAlias, product.ma_sp, mapping.offer_type, color, size].join("|"),
        SHOP_ALIAS: shopAlias,
        PRODUCT_ID: product.ma_sp,
        OFFER_TYPE: mapping.offer_type,
        PRICE_SKU: mapping.price_sku,
        COMPONENT_1_SKU: effectiveC1,
        COMPONENT_2_SKU: effectiveC2,
        COLOR: color,
        SIZE: size,
        STOCK_QUANTITY: qty,
        LIST_PRICE: null,
        SALE_PRICE: price.value,
        STOCK_STATUS: status,
        INVENTORY_SOURCE: inventorySource,
        BOM_STATUS: bomStatus,
        PARENT_VARIATION_ID: parentVariationId,
        PARENT_VARIATION_SKU: parentVariationSku,
        BOM_COMPONENTS: bomComponents,
        COMPONENT_COUNT: components.length,
        TINH_TRANG: policy?.tinh_trang ?? "",
        CAN_ORDER_WHEN_ZERO: policy?.can_order_when_zero ?? false,
        PREP_MIN_DAYS: policy?.prep_min_days ?? null,
        PREP_MAX_DAYS: policy?.prep_max_days ?? null,
        ZERO_STOCK_POLICY: policy?.zero_stock_policy ?? "",
        ZERO_STOCK_PREP_MIN_DAYS: policy?.zero_stock_prep_min_days ?? null,
        ZERO_STOCK_PREP_MAX_DAYS: policy?.zero_stock_prep_max_days ?? null,
        POS_UPDATED_AT: row.pos_updated_at,
        SYNCED_AT: now,
        SYNC_STATUS: status,
        SYNC_ERROR: "",
      });
    }

    const uniquePrices = [...new Set(offerRows.map((row) => row.sale_price).filter((value) => value !== null))];
    catalog.offers[mapping.offer_type] = {
      list_price: null,
      sale_price: uniquePrices.length === 1 ? uniquePrices[0] ?? null : null,
      price_status: uniquePrices.length === 1 ? "OK" : uniquePrices.length ? "PRICE_AMBIGUOUS" : "PRICE_NOT_FOUND",
      inventory_source: useBom
        ? "PANCAKE_BOM"
        : bomRequiredMissing
          ? "BOM_REQUIRED_MISSING"
          : mapping.c2
            ? "FALLBACK_SKU_RULE"
            : "PANCAKE_DIRECT",
      rows: offerRows,
    };
  }

  if (!policy) catalog.data_status = "FULFILLMENT_POLICY_NOT_FOUND";
  return { catalog, statusRows };
}

export const POS_ALERT_STATUSES = new Set(["SHOP_ERROR", "CONFIG_NOT_FOUND", "RUN_LOCKED", "PRODUCT_NOT_FOUND"]);

export function collectAlertRows(rows: readonly PosStatusRow[]): PosStatusRow[] {
  return rows.filter(
    (row) => POS_ALERT_STATUSES.has(String(row.SYNC_STATUS ?? ""))
      || String(row.BOM_STATUS ?? "").startsWith("BOM_"),
  );
}

export const INVENTORY_SHEET_HEADERS = [
  "SNAPSHOT_KEY", "SHOP_ALIAS", "PRODUCT_ID", "OFFER_TYPE", "PRICE_SKU", "COMPONENT_1_SKU",
  "COMPONENT_2_SKU", "COLOR", "SIZE", "STOCK_QUANTITY", "LIST_PRICE", "SALE_PRICE", "STOCK_STATUS",
  "INVENTORY_SOURCE", "BOM_STATUS", "PARENT_VARIATION_ID", "PARENT_VARIATION_SKU", "BOM_COMPONENTS",
  "COMPONENT_COUNT", "TINH_TRANG", "CAN_ORDER_WHEN_ZERO", "PREP_MIN_DAYS", "PREP_MAX_DAYS",
  "ZERO_STOCK_POLICY", "ZERO_STOCK_PREP_MIN_DAYS", "ZERO_STOCK_PREP_MAX_DAYS", "POS_UPDATED_AT",
  "SYNCED_AT", "SYNC_STATUS", "SYNC_ERROR",
] as const;

export function buildInventoryMatrix(
  rows: readonly PosStatusRow[],
  previousInventoryRows: number,
): (string | number | boolean)[][] {
  const clean = (value: unknown): string | number | boolean =>
    value === null || value === undefined
      ? ""
      : typeof value === "object" ? JSON.stringify(value) : (value as string | number | boolean);
  const matrix: (string | number | boolean)[][] = [
    [...INVENTORY_SHEET_HEADERS],
    ...rows.map((row) => INVENTORY_SHEET_HEADERS.map((header) => clean((row as unknown as Record<string, unknown>)[header]))),
  ];
  const target = Math.max(Math.max(1, previousInventoryRows), matrix.length);
  while (matrix.length < target) matrix.push(INVENTORY_SHEET_HEADERS.map(() => ""));
  return matrix;
}
