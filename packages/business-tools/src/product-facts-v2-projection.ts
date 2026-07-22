import { createHash } from "node:crypto";
import {
  ProductFactsV2Schema,
  type ProductFactsV2,
  type ProductOfferKindV2,
  type VndPriceV1,
} from "@lana/contracts";
import { z } from "zod";

const POS_PRICE_INVENTORY_FRESH_SECONDS = 48 * 60 * 60;
const POS_BOM_FRESH_SECONDS = 7 * 24 * 60 * 60;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000;

const PosComponentSchema = z.object({
  component_id: z.string().optional().default(""),
  quantity: z.number().int().positive().optional().default(1),
  product_sku: z.string().optional().default(""),
  variation_sku: z.string().optional().default(""),
}).passthrough();

const PosOfferRowSchema = z.object({
  price_sku: z.string().optional().default(""),
  color: z.string().optional().default(""),
  size: z.string().optional().default(""),
  stock_quantity: z.number().int().nonnegative().nullable(),
  list_price: z.number().int().nonnegative().nullable().optional().default(null),
  sale_price: z.number().int().nonnegative().nullable().optional().default(null),
  stock_status: z.string().optional().default("UNKNOWN"),
  bom_status: z.string().optional().default(""),
  parent_variation_id: z.string().optional().default(""),
  parent_variation_sku: z.string().optional().default(""),
  components: z.array(PosComponentSchema).optional().default([]),
}).passthrough();

const PosOfferSchema = z.object({
  list_price: z.number().int().nonnegative().nullable(),
  sale_price: z.number().int().nonnegative().nullable(),
  price_status: z.string(),
  rows: z.array(PosOfferRowSchema).min(1),
}).passthrough();

const PosSnapshotSchema = z.object({
  schema_version: z.literal(3),
  release_id: z.string().trim().min(1).max(128),
  shop_alias: z.string().min(1),
  brand: z.string().min(1),
  product_id: z.string().min(1),
  synced_at: z.string().datetime(),
  offers: z.record(z.string().trim().min(1), PosOfferSchema),
}).passthrough();

type PosSnapshot = z.infer<typeof PosSnapshotSchema>;
type PosOffer = z.infer<typeof PosOfferSchema>;
type PosOfferRow = z.infer<typeof PosOfferRowSchema>;
type ComponentRole = ProductFactsV2["bom"]["components"][number]["role"];
type BomComponent = ProductFactsV2["bom"]["components"][number];

export interface ProductFactsV2StaticSources {
  readonly identity: ProductFactsV2["identity"];
  readonly content: ProductFactsV2["content"];
  readonly sellingRules: ProductFactsV2["sellingRules"];
  readonly fulfillment: ProductFactsV2["fulfillment"];
  readonly sizeChart: ProductFactsV2["sizeChart"];
  readonly media: ProductFactsV2["media"];
}

export interface ProductFactsV2ProjectionInput {
  readonly posSnapshot: unknown;
  /** Exact POS offer selected as the product's primary set/direct offer. */
  readonly primaryOfferType: string;
  readonly primaryOfferKind: "SET" | "DIRECT";
  readonly staticSources: ProductFactsV2StaticSources;
  readonly now: Date;
}

function token(value: string): string {
  return value.trim().normalize("NFC").toUpperCase();
}

function canonicalCode(value: string): string {
  return token(value);
}

function componentRole(sku: string): ComponentRole {
  const value = token(sku).replace(/[^A-Z0-9]+/gu, "_");
  if (/(?:^|_)AO$/u.test(value)) return "TOP";
  if (/(?:^|_)(?:CV|CHAN_VAY)$/u.test(value)) return "SKIRT";
  if (/(?:^|_)QUAN$/u.test(value)) return "PANTS";
  if (/(?:^|_)(?:VAY|DAM)$/u.test(value)) return "DRESS";
  if (/(?:^|_)(?:AK|AO_KHOAC)$/u.test(value)) return "JACKET";
  return "OTHER";
}

function dateAfter(value: string, seconds: number): string {
  return new Date(Date.parse(value) + seconds * 1_000).toISOString();
}

function posMetadata(releaseId: string, observedAt: string, seconds: number, now: Date) {
  const expiresAt = dateAfter(observedAt, seconds);
  return {
    authority: "PANCAKE_POS" as const,
    sourceVersion: releaseId,
    observedAt,
    expiresAt,
    freshForSeconds: seconds,
    freshnessState: (Date.parse(expiresAt) > now.getTime() ? "FRESH" : "STALE") as "FRESH" | "STALE",
  };
}

function priceFromAmounts(listPriceVnd: number | null, salePriceVnd: number | null): VndPriceV1 | null {
  if (listPriceVnd === null && salePriceVnd === null) return null;
  return { currency: "VND", listPriceVnd, salePriceVnd };
}

function offerPrice(offer: PosOffer | undefined): VndPriceV1 | null {
  if (!offer || token(offer.price_status) !== "OK") return null;
  return priceFromAmounts(offer.list_price, offer.sale_price);
}

function findOffer(snapshot: PosSnapshot, name: string): [string, PosOffer] | null {
  const wanted = token(name);
  return Object.entries(snapshot.offers).find(([key]) => token(key) === wanted) ?? null;
}

function exactComponentPrice(snapshot: PosSnapshot, componentSku: string): VndPriceV1 | null {
  const wanted = token(componentSku);
  const candidates: VndPriceV1[] = [];
  for (const offer of Object.values(snapshot.offers)) {
    if (token(offer.price_status) !== "OK") continue;
    const rows = offer.rows.filter((row) => token(row.price_sku) === wanted);
    if (rows.length === 0) continue;
    for (const row of rows) {
      const rowPrice = priceFromAmounts(row.list_price, row.sale_price);
      if (rowPrice !== null) candidates.push(rowPrice);
    }
    if (rows.length === offer.rows.length && candidates.length === 0) {
      const aggregate = offerPrice(offer);
      if (aggregate !== null) candidates.push(aggregate);
    }
  }
  if (candidates.length === 0) return null;
  const first = JSON.stringify(candidates[0]);
  return candidates.every((candidate) => JSON.stringify(candidate) === first) ? candidates[0]! : null;
}

function rawComponent(raw: z.infer<typeof PosComponentSchema>): BomComponent | null {
  const sku = canonicalCode(raw.product_sku || raw.variation_sku || raw.component_id);
  if (!sku) return null;
  return {
    componentProductId: sku,
    sku,
    role: componentRole(sku),
    quantity: raw.quantity,
    required: true,
  };
}

function rowComposition(row: PosOfferRow): BomComponent[] {
  const components = row.components.map(rawComponent).filter((value): value is BomComponent => value !== null);
  components.sort((left, right) => left.componentProductId.localeCompare(right.componentProductId));
  return components;
}

function extractComposition(
  offer: PosOffer,
  offerKind: "DIRECT" | "SET" | "COMBO_3",
  parentProductId: string,
): BomComponent[] {
  if (offerKind === "DIRECT" && offer.rows.every((row) => row.components.length === 0)) {
    return [{ componentProductId: parentProductId, sku: parentProductId, role: componentRole(parentProductId), quantity: 1, required: true }];
  }
  if (offer.rows.some((row) => token(row.bom_status) !== "OK")) {
    throw new Error(`PRODUCT_FACTS_V2_POS_BOM_INCOMPLETE:${offerKind}`);
  }
  const compositions = offer.rows.map(rowComposition);
  if (compositions.some((composition) => composition.length === 0)) {
    throw new Error(`PRODUCT_FACTS_V2_POS_BOM_MISSING:${offerKind}`);
  }
  const fingerprint = JSON.stringify(compositions[0]);
  if (!compositions.every((composition) => JSON.stringify(composition) === fingerprint)) {
    throw new Error(`PRODUCT_FACTS_V2_POS_BOM_INCONSISTENT:${offerKind}`);
  }
  if (offerKind === "COMBO_3" && compositions[0]!.length !== 3) {
    throw new Error("PRODUCT_FACTS_V2_POS_COMBO_3_BOM_INVALID");
  }
  return compositions[0]!;
}

function inventoryVariantId(releaseId: string, offerKind: ProductOfferKindV2, offerKey: string, row: PosOfferRow, index: number): string {
  const raw = row.parent_variation_id || `${offerKey}\u0000${row.price_sku}\u0000${row.color}\u0000${row.size}\u0000${index}`;
  return createHash("sha256").update(`${releaseId}\u0000${offerKind}\u0000${offerKey}\u0000${raw}`).digest("hex").slice(0, 32);
}

function offerInventory(
  releaseId: string,
  offerKey: string,
  offer: PosOffer,
  offerKind: ProductOfferKindV2,
  componentProductId: string | null,
) {
  return offer.rows.map((row, index) => ({
    variantId: inventoryVariantId(releaseId, offerKind, offerKey, row, index),
    sku: canonicalCode(row.parent_variation_sku || row.price_sku || `${offerKey}-${row.color}-${row.size}`).slice(0, 128),
    offerKind,
    posOfferKey: offerKey,
    componentProductId,
    color: row.color.trim() || null,
    size: row.size.trim() || null,
    remainQuantity: row.stock_quantity,
    sellableQuantity: row.stock_quantity,
    stockStatus: row.stock_quantity === null ? "UNKNOWN" as const : row.stock_quantity > 0 ? "IN_STOCK" as const : "OUT_OF_STOCK" as const,
  }));
}

/** Joins stable facts with POS-owned, offer-scoped BOM, price and inventory. */
export function projectProductFactsV2(input: ProductFactsV2ProjectionInput): ProductFactsV2 {
  const snapshot = PosSnapshotSchema.parse(input.posSnapshot);
  const observedAt = Date.parse(snapshot.synced_at);
  if (observedAt > input.now.getTime() + MAX_FUTURE_CLOCK_SKEW_MS) {
    throw new Error("PRODUCT_FACTS_V2_POS_SNAPSHOT_FROM_FUTURE");
  }
  const parentProductId = canonicalCode(input.staticSources.identity.parentProductId);
  if (token(snapshot.product_id) !== parentProductId) throw new Error("PRODUCT_FACTS_V2_POS_IDENTITY_MISMATCH");
  if (token(snapshot.shop_alias) !== token(input.staticSources.identity.shopId)) throw new Error("PRODUCT_FACTS_V2_POS_SHOP_MISMATCH");
  if (!input.staticSources.identity.availableOfferKinds.includes(input.primaryOfferKind)) {
    throw new Error("PRODUCT_FACTS_V2_PRIMARY_OFFER_KIND_NOT_AVAILABLE");
  }

  const primaryEntry = findOffer(snapshot, input.primaryOfferType);
  if (primaryEntry === null) throw new Error("PRODUCT_FACTS_V2_PRIMARY_POS_OFFER_NOT_FOUND");
  const [primaryKey, primaryOffer] = primaryEntry;
  const offerCompositions: ProductFactsV2["bom"]["offerCompositions"] = [];
  const componentsById = new Map<string, BomComponent>();
  const addComposition = (offerKind: "DIRECT" | "SET" | "COMBO_3", posOfferKey: string, offer: PosOffer) => {
    const components = extractComposition(offer, offerKind, parentProductId);
    for (const component of components) {
      const previous = componentsById.get(component.componentProductId);
      if (previous && JSON.stringify(previous) !== JSON.stringify(component)) {
        throw new Error(`PRODUCT_FACTS_V2_BOM_COMPONENT_INCONSISTENT:${component.componentProductId}`);
      }
      componentsById.set(component.componentProductId, component);
    }
    offerCompositions.push({ offerKind, posOfferKey, componentProductIds: components.map(({ componentProductId }) => componentProductId) });
  };
  addComposition(input.primaryOfferKind, primaryKey, primaryOffer);

  let comboEntry: [string, PosOffer] | null = null;
  if (input.staticSources.identity.availableOfferKinds.includes("COMBO_3")) {
    comboEntry = findOffer(snapshot, "COMBO_3");
    if (comboEntry === null) throw new Error("PRODUCT_FACTS_V2_COMBO_3_POS_OFFER_NOT_FOUND");
    addComposition("COMBO_3", comboEntry[0], comboEntry[1]);
  }

  const bom = [...componentsById.values()];
  const pricing = {
    setPrice: offerPrice(primaryOffer),
    comboThreePiecePrice: comboEntry === null ? null : offerPrice(comboEntry[1]),
    componentPrices: bom.map((component) => ({
      componentProductId: component.componentProductId,
      price: exactComponentPrice(snapshot, component.sku),
    })),
    metadata: posMetadata(snapshot.release_id, snapshot.synced_at, POS_PRICE_INVENTORY_FRESH_SECONDS, input.now),
  };

  const variants = [
    ...offerInventory(snapshot.release_id, primaryKey, primaryOffer, input.primaryOfferKind, null),
    ...(comboEntry === null ? [] : offerInventory(snapshot.release_id, comboEntry[0], comboEntry[1], "COMBO_3", null)),
  ];
  if (input.staticSources.identity.availableOfferKinds.includes("COMPONENT")) {
    for (const component of bom) {
      const matches = Object.entries(snapshot.offers).filter(([, offer]) =>
        offer.rows.some((row) => token(row.price_sku) === token(component.sku)),
      );
      for (const [offerKey, offer] of matches) {
        const exactRows = { ...offer, rows: offer.rows.filter((row) => token(row.price_sku) === token(component.sku)) };
        variants.push(...offerInventory(snapshot.release_id, offerKey, exactRows, "COMPONENT", component.componentProductId));
      }
    }
  }

  return ProductFactsV2Schema.parse({
    schemaVersion: 2,
    productId: input.staticSources.identity.parentProductId,
    ...input.staticSources,
    bom: {
      components: bom,
      offerCompositions,
      metadata: posMetadata(snapshot.release_id, snapshot.synced_at, POS_BOM_FRESH_SECONDS, input.now),
    },
    pricing,
    inventory: {
      variants,
      metadata: posMetadata(snapshot.release_id, snapshot.synced_at, POS_PRICE_INVENTORY_FRESH_SECONDS, input.now),
    },
  });
}
