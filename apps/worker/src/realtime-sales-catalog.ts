import { createHash } from "node:crypto";
import { canonicalCartVariantScopeV2, cartComponentsMayShareStockV2 } from "@lana/contracts";
import { southernDestination } from "./southern-delivery-region.js";
import {selectionEvidenceFromOptions,selectionSourceHash,expandSelectionOptions,type CandidateSelectionEvidence} from "./single-agent-commerce-selection-evidence.js";
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
  readonly inventory_source?: unknown;
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
  /** Code-owned candidate adapter mode. Legacy callers retain their matching contract. */
  readonly selectionMode?: "CANDIDATE_TUPLES" | undefined;
  readonly selectionMaxAgeSeconds?:number;
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
      readonly etaExpiresAt: string | null;
      readonly sourceAuthority: "POS_SNAPSHOT";
      readonly stockStatus: "IN_STOCK" | "PRE_ORDER";
      readonly stockAvailableQuantity: number;
      /** Internal source counter identity, never an inferred child-stock capacity. */
      readonly stockCounter?: { readonly source: string; readonly unit: "ITEM" | "PARENT_OFFER" | "DERIVED_MIN"; readonly identity: string } | null;
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
      readonly selectionOptions?: readonly CandidateCartOption[];
      readonly selectionEvidence?:CandidateSelectionEvidence;
    };

export interface CandidateCartOption {
  productId:string;offerType:string;size:string|null;color:string|null;quantity:number;
  status:"IN_STOCK"|"PRE_ORDER"|"OUT_OF_STOCK"|"UNKNOWN";reasonCode:string|null;
  sourceVersion:string;observedAt:string;expiresAt:string;identityHash:string;
}

/** Bounded exact tuples, never a cross-product or an assertion of a missing physical color. */
export function candidateCartOptions(raw:unknown,query:CartSelectionQuery,now:Date):CandidateCartOption[]{
 const parsed=CatalogSnapshotV3Schema.safeParse(raw);if(!parsed.success)return [];
 const s=parsed.data;if(normalizeCatalogToken(s.shop_alias)!==normalizeCatalogToken(query.shopAlias)||normalizeCatalogToken(s.product_id)!==normalizeCatalogToken(query.productId))return [];
 const selected=resolveOffer(s,query.offerType);if(!selected||selected[1].rows.length>64)return [];
 const [offer,entry]=selected,seen=new Set<string>();
 return entry.rows.flatMap(row=>{
  const size=text(row.size)||null,color=text(row.color)||null;
  if(query.size&&normalizeCatalogToken(query.size)!==normalizeCatalogToken(size??""))return [];
  if(query.color&&normalizeCatalogToken(query.color)!==normalizeCatalogToken(color??""))return [];
  const identityHash=createHash("sha256").update(canonicalJson({offer,size,color,priceSku:row.price_sku,components:row.components,
   component1:row.component_1_sku,component2:row.component_2_sku,parent:row.parent_variation_id,parentSku:row.parent_variation_sku})).digest("hex");
  if(seen.has(identityHash))return [];seen.add(identityHash);
  const resolved=cartSelectionFromSnapshot(s,{...query,selectionMode:undefined,offerType:offer,size,color},now);
  const validStatus=normalizeCatalogToken(text(row.stock_status))==="OK";
  return [{productId:s.product_id,offerType:offer,size,color,quantity:query.quantity,
   status:!validStatus?"UNKNOWN":resolved.status==="READY"?resolved.stockStatus:resolved.status==="OUT_OF_STOCK"?"OUT_OF_STOCK":"UNKNOWN",
   reasonCode:!validStatus?"CART_STOCK_STATUS_UNVERIFIED":resolved.status==="READY"?null:resolved.reasonCode,
   sourceVersion:s.release_id,observedAt:s.synced_at,expiresAt:new Date(Date.parse(s.synced_at)+PRICE_FRESH_SECONDS*1000).toISOString(),identityHash} as CandidateCartOption];
 });
}

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

export function resolveCatalogDeliveryRegion(snapshot: CatalogSnapshotV3, address: string) {
  const normalized = normalizeCatalogToken(address);
  const entries = Object.entries(snapshot.shipping_eta);
  const southern = southernDestination(address);
  if (southern === "CONFLICT") return null;
  const exact = entries
    .filter(([region]) => normalized.includes(normalizeCatalogToken(region)))
    .sort((left, right) => normalizeCatalogToken(right[0]).length - normalizeCatalogToken(left[0]).length)
    .at(0);
  if (exact) return exact;
  if (southern === "MATCH") {
    const shared = entries.find(([region]) => normalizeCatalogToken(region) === "MIEN_NAM");
    if (shared) return shared;
  }
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
  const candidate=query.selectionMode==="CANDIDATE_TUPLES";
  const options=candidate?candidateCartOptions(snapshot,query,now):[];
  const evidenceExpiry=Math.min(expiresAt.getTime(),observedAt+(query.selectionMaxAgeSeconds??PRICE_FRESH_SECONDS)*1000,
    snapshot.fulfillment_policy?.eta_valid_until.trim()?Date.parse(snapshot.fulfillment_policy.eta_valid_until):Infinity);
  const selectionEvidence=candidate?selectionEvidenceFromOptions({productId:snapshot.product_id,offerType:offerName,size:query.size,color:query.color,quantity:query.quantity,
    sourceVersion:snapshot.release_id,sourceHash:selectionSourceHash(snapshot),observedAt:snapshot.synced_at,expiresAt:new Date(evidenceExpiry).toISOString()},options,now):null;
  const rejected=(status:Exclude<CartSelectionResult["status"],"READY">,reason:string,scopeRows:readonly RawOfferRow[]=rows):CartSelectionResult=>
    candidate?{status,reasonCode:reason,availableSizes:[],availableColors:[],selectionOptions:selectionEvidence?expandSelectionOptions(selectionEvidence):[],...(selectionEvidence?{selectionEvidence}:{})}:failed(status,reason,scopeRows);
  if (normalizeCatalogToken(offer.price_status) !== "OK") {
    return rejected("PRICE_UNAVAILABLE", `CART_${normalizeCatalogToken(offer.price_status)}`, rows);
  }

  const size = query.size ? normalizeCatalogToken(query.size) : null;
  if (!size) return rejected("SIZE_REQUIRED", "CART_SIZE_REQUIRED", rows);
  let matching = rows.filter((row) => normalizeCatalogToken(text(row.size)) === size);
  if (matching.length === 0) return rejected("VARIANT_UNAVAILABLE", "CART_SIZE_NOT_FOUND", rows);

  const color = query.color ? normalizeCatalogToken(query.color) : null;
  const colors = availableValues(matching, "color");
  if(candidate&&!color){
   const usable=options.filter(o=>["IN_STOCK","PRE_ORDER"].includes(o.status));
   if(usable.length===1)matching=matching.filter(r=>text(r.color)===usable[0]!.color&&text(r.size)===usable[0]!.size);
   else if(usable.length>1)return rejected("COLOR_REQUIRED","CART_COLOR_REQUIRED",matching);
   else return rejected("INVALID","CART_SELECTION_DATA_UNRESOLVED",matching);
  }else if (!color && colors.length > 1) return rejected("COLOR_REQUIRED", "CART_COLOR_REQUIRED", matching);
  if (color) matching = matching.filter((row) => normalizeCatalogToken(text(row.color)) === color);
  if (matching.length === 0) return rejected("VARIANT_UNAVAILABLE", "CART_COLOR_NOT_FOUND", rows);
  if (matching.length > 1) {
    const fingerprints = new Set(matching.map((row) => canonicalJson({
      price_sku: row.price_sku,
      stock_quantity: row.stock_quantity,
      sale_price: row.sale_price,
      components: row.components,
    })));
    if (fingerprints.size > 1||candidate&&new Set(matching.map(r=>canonicalJson({color:r.color,size:r.size,parent:r.parent_variation_id,parentSku:r.parent_variation_sku,components:r.components}))).size>1) return rejected("INVALID", "CART_VARIANT_AMBIGUOUS", matching);
  }
  const row = matching[0]!;
  if(candidate&&normalizeCatalogToken(text(row.stock_status))!=="OK")return rejected("OUT_OF_STOCK","CART_STOCK_STATUS_UNVERIFIED",matching);
  const unitPrice = typeof row.sale_price === "number"
    ? row.sale_price
    : offer.sale_price;
  if (!Number.isInteger(unitPrice) || unitPrice === null || unitPrice < 0) {
    return rejected("PRICE_UNAVAILABLE", "CART_PRICE_NOT_FOUND", rows);
  }
  const stockQuantity = typeof row.stock_quantity === "number" ? row.stock_quantity : null;
  const policy = snapshot.fulfillment_policy;
  if (stockQuantity === null) {
    return rejected("OUT_OF_STOCK", "CART_STOCK_UNAVAILABLE", matching);
  }
  if (stockQuantity === 0 && !policy?.can_order_when_zero) {
    return rejected("OUT_OF_STOCK", "CART_VARIANT_OUT_OF_STOCK", matching);
  }
  if (stockQuantity !== null && stockQuantity < query.quantity && !policy?.can_order_when_zero) {
    return rejected("OUT_OF_STOCK", "CART_QUANTITY_EXCEEDS_STOCK", matching);
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
  ) return rejected("INVALID", "CART_BOM_INVALID", matching);

  let eta: { minDays: number; maxDays: number } | null = null;
  let etaVersion: string | null = null;
  let etaExpiresAt: string | null = null;
  if (query.deliveryAddress) {
    const region = resolveCatalogDeliveryRegion(snapshot, query.deliveryAddress);
    if (!region) return rejected("ETA_UNAVAILABLE", "CART_ETA_REGION_UNRESOLVED", matching);
    const zeroStock = stockQuantity === 0 && policy?.can_order_when_zero === true;
    const prepMin = zeroStock ? policy?.zero_stock_prep_min_days : policy?.prep_min_days;
    const prepMax = zeroStock ? policy?.zero_stock_prep_max_days : policy?.prep_max_days;
    const transitMin = region?.[1].transit_min_days ?? null;
    const transitMax = region?.[1].transit_max_days ?? null;
    if (
      prepMin === null || prepMin === undefined || prepMax === null || prepMax === undefined ||
      transitMin === null || transitMax === null
    ) return rejected("ETA_UNAVAILABLE", "CART_ETA_UNAVAILABLE", matching);
    const rawEtaValidUntil = text(policy?.eta_valid_until);
    const etaValidUntil = rawEtaValidUntil === "" ? null : Date.parse(rawEtaValidUntil);
    if (etaValidUntil !== null && !Number.isFinite(etaValidUntil)) {
      return rejected("ETA_UNAVAILABLE", "CART_ETA_TIMESTAMP_INVALID", matching);
    }
    if (etaValidUntil !== null && etaValidUntil <= now.getTime()) {
      return rejected("ETA_UNAVAILABLE", "CART_ETA_STALE", matching);
    }
    eta = { minDays: prepMin + transitMin, maxDays: prepMax + transitMax };
    etaExpiresAt = new Date(Math.min(
      expiresAt.getTime(),
      etaValidUntil ?? Number.POSITIVE_INFINITY,
    )).toISOString();
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
  const stockCounter = stockCounterFromRowV2(row, offer as unknown as Record<string, unknown>);
  if (candidate && (text(row.inventory_source) || text((offer as unknown as Record<string, unknown>).inventory_source)) && !stockCounter)
    return rejected("INVALID", "CART_INVENTORY_SOURCE_UNRESOLVED", matching);
  const inventoryVersion = version("inventory", {
    parentProductId,
    offerId,
    color: text(row.color),
    size: text(row.size),
    stockQuantity,
    components,
    ...(candidate ? {stockCounter} : {}),
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
    etaExpiresAt,
    sourceAuthority: "POS_SNAPSHOT",
    stockStatus: stockQuantity < query.quantity ? "PRE_ORDER" : "IN_STOCK",
    stockAvailableQuantity: stockQuantity,
    stockCounter,
    sourceObservedAt: snapshot.synced_at,
    sourceExpiresAt: expiresAt.toISOString(),
  };
}

function stockCounterFromRowV2(row: RawOfferRow, offer: Record<string, unknown>):
  NonNullable<Extract<CartSelectionResult, { status: "READY" }>["stockCounter"]> | null {
  const source = text(row.inventory_source) || text(offer.inventory_source);
  if (text(row.inventory_source) && text(offer.inventory_source) && row.inventory_source !== offer.inventory_source) return null;
  const size=text(row.size), color=text(row.color);
  if (!size || !color) return null;
  if (source === "PANCAKE_DIRECT") {
    const sku=text(row.component_1_sku);
    if (!sku || text(row.component_2_sku)) return null;
    return {source,unit:"ITEM",identity:JSON.stringify([normalizeCatalogToken(sku),normalizeCatalogToken(size),normalizeCatalogToken(color)])};
  }
  if (source === "PANCAKE_BOM") {
    const id=text(row.parent_variation_id);
    if (!id || id.includes("|")) return null;
    return {source,unit:"PARENT_OFFER",identity:id};
  }
  if (source === "FALLBACK_SKU_RULE") return {source,unit:"DERIVED_MIN",identity:JSON.stringify([
    text(row.component_1_sku),text(row.component_2_sku),size,color])};
  return null;
}

/** Source independence is checked here; DB replay derives logical keys/overlap from full cart lines. */
export function cartSelectionsHaveIndependentStockV2(selections: readonly Extract<CartSelectionResult, {status:"READY"}>[]): boolean {
  const key=(s:Extract<CartSelectionResult,{status:"READY"}>)=>canonicalCartVariantScopeV2(s.line,t=>createHash("sha256").update(t,"utf8").digest("hex"));
  for(let i=0;i<selections.length;i++)for(let j=i+1;j<selections.length;j++){
    const a=selections[i]!,b=selections[j]!;
    if(key(a)===key(b)){
      if(a.versions.inventory!==b.versions.inventory||JSON.stringify(a.stockCounter??null)!==JSON.stringify(b.stockCounter??null))return false;
      continue;
    }
    if(cartComponentsMayShareStockV2(a.line,b.line))return false;
    if(!a.stockCounter||!b.stockCounter||a.stockCounter.unit==="DERIVED_MIN"||b.stockCounter.unit==="DERIVED_MIN")return false;
    if(a.stockCounter.source===b.stockCounter.source&&a.stockCounter.unit===b.stockCounter.unit&&a.stockCounter.identity===b.stockCounter.identity)return false;
  }
  return true;
}
