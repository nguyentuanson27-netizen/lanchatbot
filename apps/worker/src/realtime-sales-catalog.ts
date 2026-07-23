import { createHash } from "node:crypto";
import {
  CartLineV1Schema,
  type CartLineV1,
  type ProductComponentRole,
} from "@lana/contracts";
import {
  CatalogSnapshotV3Schema,
  normalizeCatalogToken,
  type CatalogSnapshotV3,
} from "@lana/business-tools";

const OFFER_PRIORITY = [
  "COMBO_3", "COMPOSITE", "SET_VAY", "SET_CV", "SET_QUAN",
  "SET", "DIRECT", "AO", "CV", "QUAN", "VAY",
] as const;
const PRICE_FRESH_SECONDS = 48 * 60 * 60;

interface RawBomComponent {
  readonly component_id?: unknown;
  readonly product_sku?: unknown;
  readonly variation_sku?: unknown;
  readonly quantity?: unknown;
  readonly color?: unknown;
  readonly size?: unknown;
}

interface RawOfferRow {
  readonly price_sku?: unknown;
  readonly component_1_sku?: unknown;
  readonly component_2_sku?: unknown;
  readonly color?: unknown;
  readonly size?: unknown;
  readonly stock_quantity?: unknown;
  readonly sale_price?: unknown;
  readonly list_price?: unknown;
  readonly stock_status?: unknown;
  readonly components?: unknown;
  readonly parent_variation_id?: unknown;
  readonly parent_variation_sku?: unknown;
}

export interface CartSelectionQuery {
  readonly shopAlias: string;
  readonly productId: string;
  readonly offerType: string | null;
  readonly size: string | null;
  readonly color: string | null;
  readonly quantity: number;
  readonly lineId: string;
  readonly deliveryAddress?: string | null;
}

export type CartSelectionResult =
  | {
      readonly status: "READY";
      readonly line: CartLineV1;
      readonly shopId: string;
      readonly versions: {
        readonly price: string;
        readonly inventory: string;
        readonly size: string;
        readonly eta: string | null;
      };
      readonly eta: { readonly minDays: number; readonly maxDays: number } | null;
      readonly sourceObservedAt: string;
      readonly sourceExpiresAt: string;
    }
  | {
      readonly status:
        | "NOT_FOUND"
        | "STALE"
        | "PRICE_UNAVAILABLE"
        | "SIZE_REQUIRED"
        | "COLOR_REQUIRED"
        | "VARIANT_UNAVAILABLE"
        | "OUT_OF_STOCK"
        | "ETA_UNAVAILABLE"
        | "INVALID";
      readonly reasonCode: string;
      readonly availableSizes: readonly string[];
      readonly availableColors: readonly string[];
    };

export interface VerifiedVariantQuery {
  readonly shopAlias: string;
  readonly productId: string;
  readonly offerType: string | null;
  readonly mentionedSize: string | null;
  readonly mentionedColor: string | null;
}

export interface VerifiedVariantResult {
  readonly resolution: "VERIFIED" | "PARTIAL" | "AMBIGUOUS" | "NOT_FOUND";
  readonly parentProductId: string;
  readonly selectedVariantId: string | null;
  readonly selectedColorId: string | null;
  readonly selectedColorLabel: string | null;
  readonly selectedSizeCode: string | null;
  readonly selectedOfferType: string | null;
  readonly selectedComponentProductId: string | null;
  readonly mentionedColorText: string | null;
  readonly mentionedSizeText: string | null;
  readonly availableColors: readonly string[];
  readonly availableSizes: readonly string[];
  readonly sourceVersion: string | null;
  readonly verifiedAt: string;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(",")}}`;
}

function version(group: string, value: unknown): string {
  return `${group}:sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function positiveQuantity(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function componentRole(value: string): ProductComponentRole {
  const sku = normalizeCatalogToken(value);
  if (/(?:^|_)AO$/u.test(sku)) return "TOP";
  if (/(?:^|_)(?:CV|CHAN_VAY)$/u.test(sku)) return "SKIRT";
  if (/(?:^|_)QUAN$/u.test(sku)) return "PANTS";
  if (/(?:^|_)(?:VAY|DAM)$/u.test(sku)) return "DRESS";
  if (/(?:^|_)(?:AK|AO_KHOAC)$/u.test(sku)) return "JACKET";
  return "OTHER";
}

function offerKind(value: string, componentCount: number): CartLineV1["offerKind"] {
  const normalized = normalizeCatalogToken(value);
  if (normalized === "COMBO_3" || componentCount === 3) return "COMBO_3";
  if (/^(?:SET|COMPOSITE)/u.test(normalized) || componentCount > 1) return "SET";
  return "DIRECT";
}

function availableValues(rows: readonly RawOfferRow[], key: "size" | "color"): string[] {
  return [...new Set(rows.map((row) => normalizeCatalogToken(text(row[key]))).filter((value) =>
    value !== "" && value !== "NO_COLOR"
  ))].sort();
}

function resolveOffer(snapshot: CatalogSnapshotV3, requested: string | null) {
  const entries = Object.entries(snapshot.offers);
  if (requested) {
    const wanted = normalizeCatalogToken(requested);
    return entries.find(([name]) => normalizeCatalogToken(name) === wanted) ?? null;
  }
  for (const candidate of OFFER_PRIORITY) {
    const found = entries.find(([name]) => normalizeCatalogToken(name) === candidate);
    if (found) return found;
  }
  return null;
}

function resolveRegion(snapshot: CatalogSnapshotV3, address: string) {
  const normalized = normalizeCatalogToken(address);
  const entries = Object.entries(snapshot.shipping_eta);
  const exact = entries
    .filter(([region]) => normalized.includes(normalizeCatalogToken(region)))
    .sort((left, right) => normalizeCatalogToken(right[0]).length - normalizeCatalogToken(left[0]).length)
    .at(0);
  if (exact) return exact;
  return entries.find(([region]) =>
    ["TOAN_QUOC", "DEFAULT", "OTHER", "VIET_NAM"].includes(normalizeCatalogToken(region))
  ) ?? null;
}

function failed(
  status: Exclude<CartSelectionResult["status"], "READY">,
  reasonCode: string,
  rows: readonly RawOfferRow[] = [],
): CartSelectionResult {
  return {
    status,
    reasonCode,
    availableSizes: availableValues(rows, "size"),
    availableColors: availableValues(rows, "color"),
  };
}

/**
 * Maps customer mentions to exact values present in the POS snapshot. Missing
 * qualifiers remain PARTIAL; multiple matching POS rows are never silently
 * collapsed into one variant.
 */
export function verifiedVariantFromSnapshot(
  rawSnapshot: unknown,
  query: VerifiedVariantQuery,
  now = new Date(),
): VerifiedVariantResult {
  const base = {
    parentProductId: normalizeCatalogToken(query.productId),
    selectedVariantId: null,
    selectedColorId: null,
    selectedColorLabel: null,
    selectedSizeCode: null,
    selectedOfferType: null,
    selectedComponentProductId: null,
    mentionedColorText: query.mentionedColor?.trim() || null,
    mentionedSizeText: query.mentionedSize?.trim() || null,
    availableColors: [] as readonly string[],
    availableSizes: [] as readonly string[],
    sourceVersion: null,
    verifiedAt: now.toISOString(),
  };
  const parsed = CatalogSnapshotV3Schema.safeParse(rawSnapshot);
  if (!parsed.success) return { ...base, resolution: "NOT_FOUND" };
  const snapshot = parsed.data;
  if (
    normalizeCatalogToken(snapshot.shop_alias) !== normalizeCatalogToken(query.shopAlias) ||
    normalizeCatalogToken(snapshot.product_id) !== normalizeCatalogToken(query.productId)
  ) return { ...base, resolution: "NOT_FOUND" };

  const selectedOffer = resolveOffer(snapshot, query.offerType);
  if (!selectedOffer) {
    return {
      ...base,
      resolution: "NOT_FOUND",
      sourceVersion: snapshot.release_id,
    };
  }
  const [offerName, offer] = selectedOffer;
  const rows = offer.rows as readonly RawOfferRow[];
  const wantedSize = query.mentionedSize
    ? normalizeCatalogToken(query.mentionedSize)
    : null;
  const wantedColor = query.mentionedColor
    ? normalizeCatalogToken(query.mentionedColor)
    : null;
  let matching = [...rows];
  if (wantedSize) {
    matching = matching.filter((row) =>
      normalizeCatalogToken(text(row.size)) === wantedSize
    );
  }
  if (wantedColor) {
    matching = matching.filter((row) =>
      normalizeCatalogToken(text(row.color)) === wantedColor
    );
  }
  const availableColors = availableValues(rows, "color");
  const availableSizes = availableValues(rows, "size");
  if (matching.length === 0) {
    return {
      ...base,
      resolution: "NOT_FOUND",
      selectedOfferType: normalizeCatalogToken(offerName),
      availableColors,
      availableSizes,
      sourceVersion: snapshot.release_id,
    };
  }
  const selectedColors = availableValues(matching, "color");
  const selectedSizes = availableValues(matching, "size");
  const exact = wantedSize !== null && wantedColor !== null &&
    selectedColors.length <= 1 && selectedSizes.length <= 1;
  if (!exact) {
    return {
      ...base,
      resolution:
        (wantedSize !== null || wantedColor !== null) &&
          (selectedColors.length > 1 || selectedSizes.length > 1)
          ? "PARTIAL"
          : "PARTIAL",
      // The current POS projection exposes the canonical color label, not a
      // durable POS color identifier. Keep the identifier empty rather than
      // presenting a label as an authoritative ID.
      selectedColorId: null,
      selectedColorLabel: selectedColors.length === 1 ? text(matching[0]?.color) : null,
      selectedSizeCode: selectedSizes.length === 1 ? selectedSizes[0]! : null,
      selectedOfferType: normalizeCatalogToken(offerName),
      availableColors,
      availableSizes,
      sourceVersion: snapshot.release_id,
    };
  }

  const identities = new Set(matching.map((row) =>
    text(row.parent_variation_id) ||
    text(row.parent_variation_sku) ||
    canonicalJson({
      priceSku: row.price_sku,
      color: row.color,
      size: row.size,
      components: row.components,
    })
  ));
  if (identities.size !== 1) {
    return {
      ...base,
      resolution: "AMBIGUOUS",
      selectedOfferType: normalizeCatalogToken(offerName),
      availableColors,
      availableSizes,
      sourceVersion: snapshot.release_id,
    };
  }
  const row = matching[0]!;
  const componentIds = Array.isArray(row.components)
    ? [...new Set((row.components as RawBomComponent[])
      .map((component) =>
        normalizeCatalogToken(
          text(component.product_sku) ||
          text(component.variation_sku) ||
          text(component.component_id),
        )
      )
      .filter(Boolean))]
    : [];
  return {
    ...base,
    resolution: "VERIFIED",
    selectedVariantId:
      text(row.parent_variation_id) || text(row.parent_variation_sku) || null,
    selectedColorId: null,
    selectedColorLabel: text(row.color) || null,
    selectedSizeCode: wantedSize,
    selectedOfferType: normalizeCatalogToken(offerName),
    selectedComponentProductId: componentIds.length === 1
      ? componentIds[0]!
      : null,
    availableColors,
    availableSizes,
    sourceVersion: snapshot.release_id,
  };
}

export function cartSelectionFromSnapshot(
  rawSnapshot: unknown,
  query: CartSelectionQuery,
  now = new Date(),
): CartSelectionResult {
  const parsed = CatalogSnapshotV3Schema.safeParse(rawSnapshot);
  if (!parsed.success) return failed("INVALID", "CATALOG_SNAPSHOT_INVALID");
  const snapshot = parsed.data;
  if (
    normalizeCatalogToken(snapshot.shop_alias) !== normalizeCatalogToken(query.shopAlias) ||
    normalizeCatalogToken(snapshot.product_id) !== normalizeCatalogToken(query.productId) ||
    !Number.isInteger(query.quantity) || query.quantity < 1 || query.quantity > 20
  ) return failed("INVALID", "CATALOG_SELECTION_IDENTITY_INVALID");

  const observedAt = Date.parse(snapshot.synced_at);
  const expiresAt = new Date(observedAt + PRICE_FRESH_SECONDS * 1_000);
  if (observedAt > now.getTime() + 5 * 60_000) return failed("INVALID", "CATALOG_TIMESTAMP_FROM_FUTURE");
  if (expiresAt.getTime() <= now.getTime()) return failed("STALE", "CATALOG_PRICE_STALE");

  const selectedOffer = resolveOffer(snapshot, query.offerType);
  if (!selectedOffer) return failed("NOT_FOUND", "CART_OFFER_NOT_FOUND");
  const [offerName, offer] = selectedOffer;
  const rows = offer.rows as readonly RawOfferRow[];
  if (normalizeCatalogToken(offer.price_status) !== "OK") {
    return failed("PRICE_UNAVAILABLE", `CART_${normalizeCatalogToken(offer.price_status)}`, rows);
  }

  const size = query.size ? normalizeCatalogToken(query.size) : null;
  if (!size) return failed("SIZE_REQUIRED", "CART_SIZE_REQUIRED", rows);
  let matching = rows.filter((row) => normalizeCatalogToken(text(row.size)) === size);
  if (matching.length === 0) return failed("VARIANT_UNAVAILABLE", "CART_SIZE_NOT_FOUND", rows);

  const color = query.color ? normalizeCatalogToken(query.color) : null;
  const colors = availableValues(matching, "color");
  if (!color && colors.length > 1) return failed("COLOR_REQUIRED", "CART_COLOR_REQUIRED", matching);
  if (color) matching = matching.filter((row) => normalizeCatalogToken(text(row.color)) === color);
  if (matching.length === 0) return failed("VARIANT_UNAVAILABLE", "CART_COLOR_NOT_FOUND", rows);
  if (matching.length > 1) {
    const fingerprints = new Set(matching.map((row) => canonicalJson({
      price_sku: row.price_sku,
      stock_quantity: row.stock_quantity,
      sale_price: row.sale_price,
      components: row.components,
    })));
    if (fingerprints.size > 1) return failed("INVALID", "CART_VARIANT_AMBIGUOUS", matching);
  }
  const row = matching[0]!;
  const unitPrice = typeof row.sale_price === "number"
    ? row.sale_price
    : offer.sale_price;
  if (!Number.isInteger(unitPrice) || unitPrice === null || unitPrice < 0) {
    return failed("PRICE_UNAVAILABLE", "CART_PRICE_NOT_FOUND", rows);
  }
  const stockQuantity = typeof row.stock_quantity === "number" ? row.stock_quantity : null;
  const policy = snapshot.fulfillment_policy;
  if (stockQuantity === 0 && !policy?.can_order_when_zero) {
    return failed("OUT_OF_STOCK", "CART_VARIANT_OUT_OF_STOCK", matching);
  }
  if (stockQuantity !== null && stockQuantity < query.quantity && !policy?.can_order_when_zero) {
    return failed("OUT_OF_STOCK", "CART_QUANTITY_EXCEEDS_STOCK", matching);
  }

  const rawComponents = Array.isArray(row.components)
    ? row.components as RawBomComponent[]
    : [];
  const fallbackSkus = [
    text(row.component_1_sku),
    text(row.component_2_sku),
  ].filter(Boolean);
  const sourceComponents: RawBomComponent[] = rawComponents.length > 0
    ? rawComponents
    : fallbackSkus.length > 0
      ? fallbackSkus.map((sku) => ({ product_sku: sku, quantity: 1, color: row.color, size: row.size }))
      : [{ product_sku: snapshot.product_id, quantity: 1, color: row.color, size: row.size }];
  const components = sourceComponents.map((component) => {
    const productId = normalizeCatalogToken(
      text(component.product_sku) || text(component.variation_sku) || text(component.component_id),
    );
    const componentSku = normalizeCatalogToken(text(component.variation_sku) || text(component.product_sku) || productId);
    return {
      componentProductId: productId,
      componentSku,
      componentRole: componentRole(productId),
      color: text(component.color) || text(row.color) || null,
      size: text(component.size) || text(row.size) || null,
      quantity: positiveQuantity(component.quantity),
    };
  }).filter(({ componentProductId, componentSku }) => componentProductId !== "" && componentSku !== "");
  const kind = offerKind(offerName, components.length);
  if (
    components.length === 0 ||
    (kind === "SET" && components.length < 2) ||
    (kind === "COMBO_3" && components.length !== 3)
  ) return failed("INVALID", "CART_BOM_INVALID", matching);

  let eta: { minDays: number; maxDays: number } | null = null;
  let etaVersion: string | null = null;
  if (query.deliveryAddress) {
    const region = resolveRegion(snapshot, query.deliveryAddress);
    const zeroStock = stockQuantity === 0 && policy?.can_order_when_zero === true;
    const prepMin = zeroStock ? policy?.zero_stock_prep_min_days : policy?.prep_min_days;
    const prepMax = zeroStock ? policy?.zero_stock_prep_max_days : policy?.prep_max_days;
    const transitMin = region?.[1].transit_min_days ?? null;
    const transitMax = region?.[1].transit_max_days ?? null;
    if (
      prepMin === null || prepMin === undefined || prepMax === null || prepMax === undefined ||
      transitMin === null || transitMax === null
    ) return failed("ETA_UNAVAILABLE", "CART_ETA_UNAVAILABLE", matching);
    eta = { minDays: prepMin + transitMin, maxDays: prepMax + transitMax };
    etaVersion = version("eta", {
      policy: snapshot.policy_version,
      region: region?.[0] ?? null,
      eta,
      validUntil: policy?.eta_valid_until ?? null,
    });
  }

  const parentProductId = normalizeCatalogToken(snapshot.product_id);
  const offerId = normalizeCatalogToken(offerName);
  const priceVersion = version("price", { parentProductId, offerId, unitPrice });
  const inventoryVersion = version("inventory", {
    parentProductId,
    offerId,
    color: text(row.color),
    size: text(row.size),
    stockQuantity,
    components,
  });
  const sizeVersion = version("size", {
    parentProductId,
    offerId,
    selected: components.map((component) => [component.componentProductId, component.size]),
    rules: snapshot.selling_rules,
  });
  const line = CartLineV1Schema.parse({
    lineId: query.lineId,
    parentProductId,
    offerId,
    offerKind: kind,
    quantity: query.quantity,
    components,
    allowMixedSizes: snapshot.selling_rules.allow_mixed_sizes,
    allowComponentSale: snapshot.selling_rules.allow_component_sale,
    posUnitPriceVnd: unitPrice,
    priceAuthority: {
      priceFactRef: priceVersion,
      shopId: normalizeCatalogToken(snapshot.shop_alias),
      parentProductId,
      offerId,
      offerPriceKind: kind,
      componentProductId: null,
      metadata: {
        authority: "PANCAKE_POS",
        sourceVersion: snapshot.release_id,
        observedAt: snapshot.synced_at,
        expiresAt: expiresAt.toISOString(),
        freshForSeconds: PRICE_FRESH_SECONDS,
        freshnessState: "FRESH",
      },
    },
    lineTotalVnd: unitPrice * query.quantity,
  });
  return {
    status: "READY",
    line,
    shopId: normalizeCatalogToken(snapshot.shop_alias),
    versions: {
      price: priceVersion,
      inventory: inventoryVersion,
      size: sizeVersion,
      eta: etaVersion,
    },
    eta,
    sourceObservedAt: snapshot.synced_at,
    sourceExpiresAt: expiresAt.toISOString(),
  };
}
