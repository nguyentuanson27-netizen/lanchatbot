import { BusinessFactEnvelopeV1Schema, type BusinessFactEnvelopeV1, type StockStatus } from "@lana/contracts";
import { z } from "zod";
import { SUPPORTED_SIZES, type SupportedSize } from "./types.js";

const NullableMoneySchema = z.number().int().nonnegative().nullable();

const CatalogOfferRowSchema = z.object({
  offer_type: z.string().max(64).optional(),
  color: z.string().max(64),
  size: z.string().max(16),
  stock_quantity: z.number().int().nonnegative().nullable(),
  list_price: NullableMoneySchema.optional().default(null),
  sale_price: NullableMoneySchema.optional().default(null),
  stock_status: z.string().max(64),
}).passthrough();

const CatalogOfferSchema = z.object({
  list_price: NullableMoneySchema,
  sale_price: NullableMoneySchema,
  price_status: z.string().max(64),
  rows: z.array(CatalogOfferRowSchema).max(5_000),
}).passthrough();

const FulfillmentPolicySchema = z.object({
  tinh_trang: z.string().max(64),
  can_order_when_zero: z.boolean(),
  prep_min_days: z.number().int().nonnegative().nullable(),
  prep_max_days: z.number().int().nonnegative().nullable(),
  zero_stock_policy: z.string().max(64).optional().default(""),
  zero_stock_prep_min_days: z.number().int().nonnegative().nullable().optional().default(null),
  zero_stock_prep_max_days: z.number().int().nonnegative().nullable().optional().default(null),
  eta_valid_until: z.string().max(64).optional().default(""),
}).passthrough();

const ShippingRegionSchema = z.object({
  transit_min_days: z.number().int().nonnegative().nullable(),
  transit_max_days: z.number().int().nonnegative().nullable(),
}).passthrough();

const SellingRulesSchema = z.object({
  allow_mixed_sizes: z.boolean(),
  allow_component_sale: z.boolean(),
  source_version: z.string().min(1).max(128),
}).strict();

export const CatalogSnapshotV3Schema = z.object({
  schema_version: z.literal(3),
  release_id: z.string().min(1).max(128),
  catalog_version: z.string().min(1).max(128),
  policy_version: z.string().min(1).max(128),
  shop_alias: z.string().min(1).max(64),
  brand: z.string().min(1).max(128),
  product_id: z.string().min(1).max(128),
  synced_at: z.string().datetime(),
  data_status: z.string().min(1).max(128),
  fulfillment_policy: FulfillmentPolicySchema.nullable(),
  selling_rules: SellingRulesSchema.optional().default({
    allow_mixed_sizes: false,
    allow_component_sale: false,
    source_version: "legacy-default-v1",
  }),
  shipping_eta: z.record(z.string().max(64), ShippingRegionSchema),
  offers: z.record(z.string().max(64), CatalogOfferSchema),
}).strict();

export type CatalogSnapshotV3 = z.infer<typeof CatalogSnapshotV3Schema>;

export const CatalogFactQuerySchema = z.object({
  shopAlias: z.string().min(1).max(64),
  productId: z.string().min(1).max(128),
  intent: z.enum(["INFO", "PRICE", "STOCK", "SIZE", "ETA"]),
  offerType: z.string().max(64).nullable().default(null),
  color: z.string().max(64).nullable().default(null),
  size: z.string().max(16).nullable().default(null),
  deliveryRegion: z.string().max(64).nullable().default(null),
});

export type CatalogFactQuery = z.infer<typeof CatalogFactQuerySchema>;

const OFFER_PRIORITY = ["COMBO_3", "COMPOSITE", "SET_VAY", "SET_CV", "SET_QUAN", "SET", "DIRECT", "AO", "CV", "QUAN"];

const INVALID_OFFER_STATUSES = new Set([
  "PRODUCT_NOT_FOUND", "PRICE_NOT_FOUND", "PRICE_AMBIGUOUS", "COMPONENT_MISSING",
  "BOM_REQUIRED_MISSING", "CONFIG_NOT_FOUND", "SHOP_ERROR", "ERROR",
]);

export function normalizeCatalogToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
}

export function catalogSnapshotKey(shopAlias: string, productId: string): string {
  return `catalog:offer:${normalizeCatalogToken(shopAlias)}:${normalizeCatalogToken(productId)}`;
}

function failure(
  status: "STALE" | "NOT_FOUND" | "ERROR",
  reasonCode: string,
  query: CatalogFactQuery,
  observedAt: string,
  expiresAt: string | null,
): BusinessFactEnvelopeV1 {
  return BusinessFactEnvelopeV1Schema.parse({
    schemaVersion: 1,
    status,
    source: "POS_SNAPSHOT",
    observedAt,
    expiresAt,
    productId: normalizeCatalogToken(query.productId),
    facts: null,
    reasonCode,
  });
}

function policyCode(value: string): "READY_STOCK" | "PRE_ORDER" | "COMING_SOON" | null {
  const normalized = normalizeCatalogToken(value);
  if (["READY_STOCK", "BAN_HANG_SAN", "HANG_SAN", "AVAILABLE"].includes(normalized)) return "READY_STOCK";
  if (["PRE_ORDER", "PREORDER", "DAT_TRUOC", "MADE_TO_ORDER"].includes(normalized)) return "PRE_ORDER";
  if (["COMING_SOON", "HANG_SAP_VE", "INBOUND", "SAP_VE"].includes(normalized)) return "COMING_SOON";
  return null;
}

function supportedSize(value: string): value is SupportedSize {
  return (SUPPORTED_SIZES as readonly string[]).includes(value);
}

export function resolveCatalogFacts(
  rawSnapshot: unknown,
  rawQuery: unknown,
  now: Date,
  maxAgeSeconds = 1_200,
): BusinessFactEnvelopeV1 {
  const queryResult = CatalogFactQuerySchema.safeParse(rawQuery);
  if (!queryResult.success) {
    const fallback: CatalogFactQuery = {
      shopAlias: "UNKNOWN",
      productId: "UNKNOWN",
      intent: "INFO",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    };
    return failure("ERROR", "BUSINESS_FACT_QUERY_INVALID", fallback, now.toISOString(), null);
  }
  const query = queryResult.data;
  const parsed = CatalogSnapshotV3Schema.safeParse(rawSnapshot);
  if (!parsed.success) return failure("ERROR", "CATALOG_SNAPSHOT_INVALID", query, now.toISOString(), null);
  const snapshot = parsed.data;
  const productId = normalizeCatalogToken(query.productId);
  const shopAlias = normalizeCatalogToken(query.shopAlias);
  if (
    normalizeCatalogToken(snapshot.product_id) !== productId ||
    normalizeCatalogToken(snapshot.shop_alias) !== shopAlias
  ) {
    return failure("ERROR", "CATALOG_IDENTITY_MISMATCH", query, snapshot.synced_at, null);
  }
  const observedMs = Date.parse(snapshot.synced_at);
  const expiresAt = new Date(observedMs + Math.max(60, maxAgeSeconds) * 1_000).toISOString();
  if (observedMs > now.getTime() + 10 * 60_000) {
    return failure("ERROR", "CATALOG_TIMESTAMP_IN_FUTURE", query, snapshot.synced_at, expiresAt);
  }
  if (now.getTime() - observedMs > Math.max(60, maxAgeSeconds) * 1_000) {
    return failure("STALE", "CATALOG_SNAPSHOT_STALE", query, snapshot.synced_at, expiresAt);
  }
  const snapshotStatus = normalizeCatalogToken(snapshot.data_status);
  const policyOnlyMissing = snapshotStatus === "FULFILLMENT_POLICY_NOT_FOUND";
  if (snapshotStatus !== "OK" && !policyOnlyMissing) {
    return failure("ERROR", `CATALOG_${snapshotStatus}`, query, snapshot.synced_at, expiresAt);
  }
  const policy = snapshot.fulfillment_policy;
  const normalizedPolicy = policy ? policyCode(policy.tinh_trang) : null;
  if (policy && normalizedPolicy === null) {
    return failure("ERROR", "FULFILLMENT_POLICY_INVALID", query, snapshot.synced_at, expiresAt);
  }
  if (query.intent === "ETA" && (!policy || normalizedPolicy === null)) {
    return failure("NOT_FOUND", "FULFILLMENT_POLICY_NOT_FOUND", query, snapshot.synced_at, expiresAt);
  }

  const offers = new Map(Object.entries(snapshot.offers).map(([name, offer]) => [normalizeCatalogToken(name), offer]));
  const requestedOffer = query.offerType ? normalizeCatalogToken(query.offerType) : null;
  const selectedOfferType = requestedOffer
    ? (offers.has(requestedOffer) ? requestedOffer : undefined)
    : OFFER_PRIORITY.find((value) => offers.has(value));
  if (!selectedOfferType) return failure("NOT_FOUND", "OFFER_NOT_FOUND", query, snapshot.synced_at, expiresAt);
  const offer = offers.get(selectedOfferType);
  if (!offer) return failure("NOT_FOUND", "OFFER_NOT_FOUND", query, snapshot.synced_at, expiresAt);
  const offerStatus = normalizeCatalogToken(offer.price_status);
  if (INVALID_OFFER_STATUSES.has(offerStatus)) {
    return failure("ERROR", `OFFER_${offerStatus}`, query, snapshot.synced_at, expiresAt);
  }

  const requestedColor = query.color ? normalizeCatalogToken(query.color) : null;
  const requestedSize = query.size ? normalizeCatalogToken(query.size) : null;
  if (requestedSize && !supportedSize(requestedSize)) {
    return failure("NOT_FOUND", "SIZE_UNSUPPORTED", query, snapshot.synced_at, expiresAt);
  }
  const colorRows = requestedColor
    ? offer.rows.filter((row) => normalizeCatalogToken(row.color) === requestedColor)
    : offer.rows;
  let rows = colorRows;
  if (requestedSize) rows = rows.filter((row) => normalizeCatalogToken(row.size) === requestedSize);
  if (rows.length === 0) return failure("NOT_FOUND", "VARIANT_NOT_FOUND", query, snapshot.synced_at, expiresAt);
  const invalidRowStatus = rows
    .map((row) => normalizeCatalogToken(row.stock_status))
    .find((status) => INVALID_OFFER_STATUSES.has(status));
  if (invalidRowStatus) {
    return failure("ERROR", `VARIANT_${invalidRowStatus}`, query, snapshot.synced_at, expiresAt);
  }

  const hasHiddenQuantity = rows.some((row) => row.stock_quantity === null);
  const stockQuantity = hasHiddenQuantity
    ? null
    : rows.reduce((total, row) => total + (row.stock_quantity ?? 0), 0);
  const salePrices = [...new Set(rows.map((row) => row.sale_price).filter((value): value is number => value !== null))];
  const listPrices = [...new Set(rows.map((row) => row.list_price).filter((value): value is number => value !== null))];
  const salePrice = salePrices.length === 1 ? salePrices[0] ?? null : offer.sale_price;
  const listPrice = listPrices.length === 1 ? listPrices[0] ?? null : offer.list_price;
  if (query.intent === "PRICE" && salePrice === null && listPrice === null) {
    return failure("NOT_FOUND", "PRICE_NOT_FOUND", query, snapshot.synced_at, expiresAt);
  }

  const canOrderAtZero = Boolean(policy?.can_order_when_zero && normalizedPolicy !== "READY_STOCK");
  const zeroStockPolicy = policy ? policyCode(policy.zero_stock_policy) : null;
  const usesZeroStockPreorder = Boolean(
    stockQuantity === 0 &&
    policy?.can_order_when_zero &&
    zeroStockPolicy === "PRE_ORDER",
  );
  let stockStatus: StockStatus;
  if (stockQuantity === null) stockStatus = "UNKNOWN";
  else if (stockQuantity > 0) stockStatus = "IN_STOCK";
  else if (usesZeroStockPreorder) stockStatus = "PRE_ORDER";
  else if (!policy || normalizedPolicy === null) stockStatus = "UNKNOWN";
  else if (normalizedPolicy === "PRE_ORDER" && canOrderAtZero) stockStatus = "PRE_ORDER";
  else if (normalizedPolicy === "COMING_SOON" && canOrderAtZero) stockStatus = "COMING_SOON";
  else stockStatus = "OUT_OF_STOCK";

  const sizes = [...new Set(colorRows
    .filter((row) => (row.stock_quantity ?? 0) > 0)
    .map((row) => normalizeCatalogToken(row.size))
    .filter(supportedSize))];

  let deliveryEta: { minDays: number; maxDays: number } | null = null;
  if (query.intent === "ETA") {
    if (!policy || normalizedPolicy === null) {
      return failure("NOT_FOUND", "FULFILLMENT_POLICY_NOT_FOUND", query, snapshot.synced_at, expiresAt);
    }
    if (!query.deliveryRegion) {
      return failure("NOT_FOUND", "DELIVERY_REGION_REQUIRED", query, snapshot.synced_at, expiresAt);
    }
    const region = normalizeCatalogToken(query.deliveryRegion);
    const transit = Object.entries(snapshot.shipping_eta)
      .find(([name]) => normalizeCatalogToken(name) === region)?.[1];
    const prepMin = usesZeroStockPreorder
      ? policy.zero_stock_prep_min_days
      : policy.prep_min_days;
    const prepMax = usesZeroStockPreorder
      ? policy.zero_stock_prep_max_days
      : policy.prep_max_days;
    const transitMin = transit?.transit_min_days ?? null;
    const transitMax = transit?.transit_max_days ?? null;
    const hasEtaExpiry = policy.eta_valid_until.trim().length > 0;
    const etaValidUntil = hasEtaExpiry ? Date.parse(policy.eta_valid_until) : null;
    if (
      prepMin === null || prepMax === null || transitMin === null || transitMax === null ||
      prepMax < prepMin || transitMax < transitMin ||
      (hasEtaExpiry && (etaValidUntil === null || !Number.isFinite(etaValidUntil))) ||
      (etaValidUntil !== null && etaValidUntil <= now.getTime())
    ) {
      return failure("NOT_FOUND", "ETA_DATA_MISSING_OR_EXPIRED", query, snapshot.synced_at, expiresAt);
    }
    deliveryEta = { minDays: prepMin + transitMin, maxDays: prepMax + transitMax };
  }

  return BusinessFactEnvelopeV1Schema.parse({
    schemaVersion: 1,
    status: "OK",
    source: "POS_SNAPSHOT",
    observedAt: snapshot.synced_at,
    expiresAt,
    productId,
    facts: {
      schemaVersion: 1,
      productId,
      parentProductId: productId,
      offerType: selectedOfferType,
      listPriceVnd: listPrice,
      salePriceVnd: salePrice,
      sizes,
      stockStatus,
      stockQuantity,
      deliveryEta,
      fulfillmentPolicy: usesZeroStockPreorder ? "PRE_ORDER" : normalizedPolicy,
      imageUrls: [],
    },
    reasonCode: null,
  });
}
