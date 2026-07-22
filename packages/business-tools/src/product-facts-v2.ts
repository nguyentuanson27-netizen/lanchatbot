import {
  ProductFactsV2Schema,
  type FactGroupMetadataV1,
  type ProductFactsV2,
  type VndPriceV1,
} from "@lana/contracts";
import { createHash } from "node:crypto";

export const PRODUCT_FACTS_V2_STORAGE_TTL_SECONDS = {
  STABLE: 30 * 24 * 60 * 60,
  BOM: 30 * 24 * 60 * 60,
  PRICE_INVENTORY: 7 * 24 * 60 * 60,
} as const;

export type ProductFactsV2OfferKind = "DIRECT" | "SET" | "COMPONENT" | "COMBO_3";
export type ProductFactsV2QueryIntent = "PRICE" | "STOCK" | "SIZE" | "ETA";

export interface ProductFactsV2Query {
  readonly intent: ProductFactsV2QueryIntent;
  readonly offerKind: ProductFactsV2OfferKind;
  readonly componentProductId?: string | null;
  readonly color?: string | null;
  readonly size?: string | null;
}

export interface ProductFactsV2FreshnessView {
  readonly bom: "FRESH" | "STALE";
  readonly pricing: "FRESH" | "STALE";
  readonly inventory: "FRESH" | "STALE";
  readonly fulfillment: "FRESH" | "STALE";
  /** Storage retention is deliberately longer than allowed business freshness. */
  readonly retainedForAudit: {
    readonly bom: boolean;
    readonly priceInventory: boolean;
  };
}

export type ProductFactsV2Resolution =
  | {
      readonly status: "OK";
      readonly productId: string;
      readonly offerKind: ProductFactsV2OfferKind;
      readonly componentProductId: string | null;
      readonly price: VndPriceV1 | null;
      readonly variants: readonly {
        readonly variantId: string;
        readonly sku: string;
        readonly color: string | null;
        readonly size: string | null;
        readonly sellableQuantity: number | null;
        readonly stockStatus: ProductFactsV2["inventory"]["variants"][number]["stockStatus"];
      }[];
      readonly etaToCustomer: { readonly minDays: number; readonly maxDays: number } | null;
      readonly freshness: ProductFactsV2FreshnessView;
    }
  | {
      readonly status: "BLOCKED";
      readonly productId: string;
      readonly reasonCode:
        | "OFFER_NOT_AVAILABLE"
        | "PRODUCT_INACTIVE"
        | "BOM_STALE"
        | "PRICE_STALE"
        | "PRICE_MISSING"
        | "COMPONENT_ID_REQUIRED"
        | "COMPONENT_NOT_IN_BOM"
        | "COMPONENT_SALE_NOT_ALLOWED"
        | "INVENTORY_STALE"
        | "VARIANT_NOT_FOUND"
        | "FULFILLMENT_STALE"
        | "ETA_NOT_AVAILABLE";
      readonly canQuotePrice: false;
      readonly canQuoteInventory: false;
      readonly freshness: ProductFactsV2FreshnessView;
    };

function normalized(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.normalize("NFC").toUpperCase() : null;
}

function fresh(expiresAt: string, now: Date): boolean {
  const parsed = Date.parse(expiresAt);
  return Number.isFinite(parsed) && parsed > now.getTime();
}

function retained(metadata: FactGroupMetadataV1, storageTtlSeconds: number, now: Date): boolean {
  const observed = Date.parse(metadata.observedAt);
  return Number.isFinite(observed) && observed + storageTtlSeconds * 1_000 > now.getTime();
}

export function productFactsV2ProjectionKeys(shopId: string, productId: string): {
  readonly manifest: string;
  readonly stable: string;
  readonly bom: string;
  readonly priceInventory: string;
};
export function productFactsV2ProjectionKeys(shopId: string, productId: string, generation: string): {
  readonly manifest: string;
  readonly stable: string;
  readonly bom: string;
  readonly priceInventory: string;
};
export function productFactsV2ProjectionKeys(shopId: string, productId: string, generation?: string) {
  const canonical = (value: string) => value.trim().normalize("NFC").toUpperCase();
  if (!canonical(shopId) || !canonical(productId)) throw new Error("PRODUCT_FACTS_V2_REDIS_ID_EMPTY");
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  const identityHash = digest(`${canonical(shopId)}\u0000${canonical(productId)}`).slice(0, 32);
  const prefix = `facts:v2:${identityHash}`;
  const generationPrefix = generation === undefined ? prefix : `${prefix}:g:${digest(generation).slice(0, 32)}`;
  return {
    manifest: `${prefix}:manifest`,
    stable: `${generationPrefix}:stable`,
    bom: `${generationPrefix}:bom`,
    priceInventory: `${generationPrefix}:price_inventory`,
  };
}

export interface ProductFactsV2RedisWrite {
  readonly key: string;
  readonly value: string;
  readonly ttlSeconds: number;
}

export interface ProductFactsV2RedisManifest {
  readonly schemaVersion: 1;
  readonly generation: string;
  readonly observedAt: string;
  readonly stableKey: string;
  readonly bomKey: string;
  readonly priceInventoryKey: string;
}

export interface ProductFactsV2RedisCommitPlan {
  readonly generation: string;
  readonly observedAt: string;
  /** Immutable generation writes must complete before publishing the manifest. */
  readonly dataWrites: readonly ProductFactsV2RedisWrite[];
  /** Publish with compare-and-set only when observedAt is newer than the current manifest. */
  readonly manifestWrite: ProductFactsV2RedisWrite;
  readonly manifestCondition: "ONLY_IF_OBSERVED_AT_NEWER";
}

/**
 * Produces independent Redis writes so volatile POS data can expire from
 * storage without deleting the longer-lived BOM and stable search facts.
 */
export function buildProductFactsV2RedisWrites(rawFacts: unknown): ProductFactsV2RedisCommitPlan {
  const facts = ProductFactsV2Schema.parse(rawFacts);
  const versions = [facts.bom.metadata.sourceVersion, facts.pricing.metadata.sourceVersion, facts.inventory.metadata.sourceVersion];
  const observations = [facts.bom.metadata.observedAt, facts.pricing.metadata.observedAt, facts.inventory.metadata.observedAt];
  if (new Set(versions).size !== 1 || new Set(observations).size !== 1) {
    throw new Error("PRODUCT_FACTS_V2_POS_GENERATION_MISMATCH");
  }
  const generation = versions[0]!;
  const observedAt = observations[0]!;
  const keys = productFactsV2ProjectionKeys(facts.identity.shopId, facts.productId, generation);
  const stable = {
    schemaVersion: facts.schemaVersion,
    productId: facts.productId,
    identity: facts.identity,
    content: facts.content,
    sellingRules: facts.sellingRules,
    fulfillment: facts.fulfillment,
    sizeChart: facts.sizeChart,
    media: facts.media,
  };
  const envelope = (payload: unknown) => JSON.stringify({ generation, payload });
  const manifest: ProductFactsV2RedisManifest = {
    schemaVersion: 1,
    generation,
    observedAt,
    stableKey: keys.stable,
    bomKey: keys.bom,
    priceInventoryKey: keys.priceInventory,
  };
  return {
    generation,
    observedAt,
    dataWrites: [
    { key: keys.stable, value: envelope(stable), ttlSeconds: PRODUCT_FACTS_V2_STORAGE_TTL_SECONDS.STABLE },
    { key: keys.bom, value: envelope(facts.bom), ttlSeconds: PRODUCT_FACTS_V2_STORAGE_TTL_SECONDS.BOM },
    {
      key: keys.priceInventory,
      value: envelope({ pricing: facts.pricing, inventory: facts.inventory }),
      ttlSeconds: PRODUCT_FACTS_V2_STORAGE_TTL_SECONDS.PRICE_INVENTORY,
    },
    ],
    manifestWrite: {
      key: keys.manifest,
      value: JSON.stringify(manifest),
      ttlSeconds: PRODUCT_FACTS_V2_STORAGE_TTL_SECONDS.PRICE_INVENTORY,
    },
    manifestCondition: "ONLY_IF_OBSERVED_AT_NEWER",
  };
}

export function shouldPublishProductFactsV2Manifest(currentManifest: string | null, nextManifest: string): boolean {
  try {
    const next = JSON.parse(nextManifest) as ProductFactsV2RedisManifest;
    if (next.schemaVersion !== 1 || !Number.isFinite(Date.parse(next.observedAt))) return false;
    if (currentManifest === null) return true;
    const current = JSON.parse(currentManifest) as ProductFactsV2RedisManifest;
    return current.schemaVersion === 1 && Date.parse(next.observedAt) > Date.parse(current.observedAt);
  } catch {
    return false;
  }
}

export function reconstructProductFactsV2RedisProjection(parts: {
  readonly manifest: string | null;
  readonly stable: string | null;
  readonly bom: string | null;
  readonly priceInventory: string | null;
}): ProductFactsV2 | null {
  if (parts.manifest === null || parts.stable === null || parts.bom === null || parts.priceInventory === null) return null;
  try {
    const manifest = JSON.parse(parts.manifest) as ProductFactsV2RedisManifest;
    const stableEnvelope = JSON.parse(parts.stable) as { generation: string; payload: Record<string, unknown> };
    const bomEnvelope = JSON.parse(parts.bom) as { generation: string; payload: unknown };
    const volatileEnvelope = JSON.parse(parts.priceInventory) as { generation: string; payload: Record<string, unknown> };
    if (
      manifest.schemaVersion !== 1 ||
      [stableEnvelope.generation, bomEnvelope.generation, volatileEnvelope.generation].some(
        (generation) => generation !== manifest.generation,
      )
    ) return null;
    const stable = stableEnvelope.payload;
    const bom = bomEnvelope.payload;
    const volatile = volatileEnvelope.payload;
    return ProductFactsV2Schema.parse({
      ...stable,
      bom,
      pricing: volatile.pricing,
      inventory: volatile.inventory,
    });
  } catch {
    return null;
  }
}

export function inspectProductFactsV2Freshness(
  rawFacts: unknown,
  now: Date,
): ProductFactsV2FreshnessView {
  const facts = ProductFactsV2Schema.parse(rawFacts);
  return {
    bom: fresh(facts.bom.metadata.expiresAt, now) ? "FRESH" : "STALE",
    pricing: fresh(facts.pricing.metadata.expiresAt, now) ? "FRESH" : "STALE",
    inventory: fresh(facts.inventory.metadata.expiresAt, now) ? "FRESH" : "STALE",
    fulfillment: fresh(facts.fulfillment.metadata.expiresAt, now) ? "FRESH" : "STALE",
    retainedForAudit: {
      bom: retained(facts.bom.metadata, PRODUCT_FACTS_V2_STORAGE_TTL_SECONDS.BOM, now),
      priceInventory: retained(
        facts.pricing.metadata,
        PRODUCT_FACTS_V2_STORAGE_TTL_SECONDS.PRICE_INVENTORY,
        now,
      ),
    },
  };
}

function blocked(
  facts: ProductFactsV2,
  freshness: ProductFactsV2FreshnessView,
  reasonCode: Extract<ProductFactsV2Resolution, { status: "BLOCKED" }>["reasonCode"],
): ProductFactsV2Resolution {
  return {
    status: "BLOCKED",
    productId: facts.productId,
    reasonCode,
    canQuotePrice: false,
    canQuoteInventory: false,
    freshness,
  };
}

/** Resolve only facts authorized for the requested intent; stale retained data is never quoted. */
export function resolveProductFactsV2(
  rawFacts: unknown,
  query: ProductFactsV2Query,
  now: Date,
): ProductFactsV2Resolution {
  const facts = ProductFactsV2Schema.parse(rawFacts);
  const freshness = inspectProductFactsV2Freshness(facts, now);
  if (!facts.identity.active) return blocked(facts, freshness, "PRODUCT_INACTIVE");
  if (!facts.identity.availableOfferKinds.includes(query.offerKind)) {
    return blocked(facts, freshness, "OFFER_NOT_AVAILABLE");
  }
  if (query.intent !== "ETA" && freshness.bom === "STALE") {
    return blocked(facts, freshness, "BOM_STALE");
  }

  const componentId = query.componentProductId?.trim() || null;
  let price: VndPriceV1 | null;
  if (query.offerKind === "COMPONENT" && query.intent !== "ETA") {
    if (!componentId) return blocked(facts, freshness, "COMPONENT_ID_REQUIRED");
    if (!facts.bom.components.some(({ componentProductId }) => componentProductId === componentId)) {
      return blocked(facts, freshness, "COMPONENT_NOT_IN_BOM");
    }
    if (!facts.sellingRules.allowComponentSale) {
      return blocked(facts, freshness, "COMPONENT_SALE_NOT_ALLOWED");
    }
    price = facts.pricing.componentPrices.find(
      ({ componentProductId }) => componentProductId === componentId,
    )?.price ?? null;
  } else if (query.offerKind === "COMBO_3") {
    price = facts.pricing.comboThreePiecePrice;
  } else {
    price = facts.pricing.setPrice;
  }

  if (query.intent === "PRICE") {
    if (freshness.pricing === "STALE") return blocked(facts, freshness, "PRICE_STALE");
    if (price === null) return blocked(facts, freshness, "PRICE_MISSING");
  } else if (freshness.pricing === "STALE") {
    price = null;
  }

  let variants = facts.inventory.variants.filter((variant) => {
    if (variant.offerKind !== query.offerKind) return false;
    if (query.offerKind === "COMPONENT" && variant.componentProductId !== componentId) return false;
    const wantedColor = normalized(query.color);
    const wantedSize = normalized(query.size);
    if (wantedColor !== null && normalized(variant.color) !== wantedColor) return false;
    if (wantedSize !== null && normalized(variant.size) !== wantedSize) return false;
    return true;
  });

  if (query.intent === "STOCK" || query.intent === "SIZE") {
    if (freshness.inventory === "STALE") return blocked(facts, freshness, "INVENTORY_STALE");
    if (variants.length === 0) return blocked(facts, freshness, "VARIANT_NOT_FOUND");
  } else if (freshness.inventory === "STALE") {
    // Price and ETA may still be answered; stale inventory is intentionally omitted.
    variants = [];
  }

  let etaToCustomer: { minDays: number; maxDays: number } | null = null;
  if (query.intent === "ETA") {
    if (freshness.fulfillment === "STALE") return blocked(facts, freshness, "FULFILLMENT_STALE");
    if (facts.fulfillment.etaToCustomer === null) {
      return blocked(facts, freshness, "ETA_NOT_AVAILABLE");
    }
    etaToCustomer = {
      minDays: facts.fulfillment.etaToCustomer.minDays,
      maxDays: facts.fulfillment.etaToCustomer.maxDays,
    };
  }

  return {
    status: "OK",
    productId: facts.productId,
    offerKind: query.offerKind,
    componentProductId: componentId,
    price,
    variants: variants.map((variant) => ({
      variantId: variant.variantId,
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      sellableQuantity: variant.sellableQuantity,
      stockStatus: variant.stockStatus,
    })),
    etaToCustomer,
    freshness,
  };
}
