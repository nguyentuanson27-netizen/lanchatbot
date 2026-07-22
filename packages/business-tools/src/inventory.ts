import { SUPPORTED_SIZES } from "./types.js";
import type {
  AggregatedInventoryOffer,
  InventoryAggregationResult,
  InventorySnapshot,
  InventorySnapshotPort,
  PosVariation,
  SupportedSize,
} from "./types.js";

const sizeSet = new Set<string>(SUPPORTED_SIZES);

export function normalizeProductCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeColor(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function normalizeSize(value: string): SupportedSize | null {
  const normalized = value.trim().toUpperCase();
  return sizeSet.has(normalized) ? (normalized as SupportedSize) : null;
}

function sumByVariant(
  variations: readonly PosVariation[],
  productCode: string,
): Map<string, { color: string; size: SupportedSize; quantity: number }> {
  const wanted = normalizeProductCode(productCode);
  const totals = new Map<string, { color: string; size: SupportedSize; quantity: number }>();
  for (const row of variations) {
    if (normalizeProductCode(row.productCode) !== wanted) continue;
    const size = normalizeSize(row.size);
    if (size === null || !Number.isFinite(row.remainQuantity)) continue;
    const color = normalizeColor(row.color);
    if (color.length === 0) continue;
    const key = `${color}\u0000${size}`;
    const current = totals.get(key);
    const sellable = Math.max(0, Math.trunc(row.remainQuantity));
    totals.set(key, { color, size, quantity: (current?.quantity ?? 0) + sellable });
  }
  return totals;
}

function combineSet(
  left: Map<string, { color: string; size: SupportedSize; quantity: number }>,
  right: Map<string, { color: string; size: SupportedSize; quantity: number }>,
  offerType: "SET" | "SET_CV" | "SET_QUAN",
  componentCodes: readonly string[],
): AggregatedInventoryOffer[] {
  const offers: AggregatedInventoryOffer[] = [];
  for (const [key, leftValue] of left) {
    const rightValue = right.get(key);
    if (rightValue === undefined) continue;
    offers.push({
      offerType,
      color: leftValue.color,
      size: leftValue.size,
      quantity: Math.min(leftValue.quantity, rightValue.quantity),
      componentCodes,
    });
  }
  return offers;
}

function stableOfferSort(a: AggregatedInventoryOffer, b: AggregatedInventoryOffer): number {
  const byType = a.offerType.localeCompare(b.offerType);
  if (byType !== 0) return byType;
  const byColor = a.color.localeCompare(b.color);
  if (byColor !== 0) return byColor;
  return SUPPORTED_SIZES.indexOf(a.size) - SUPPORTED_SIZES.indexOf(b.size);
}

export function aggregateInventory(
  parentProductId: string,
  snapshot: InventorySnapshot,
  source: "POS_LIVE" | "POS_SNAPSHOT",
  now: Date,
  maxAgeMs: number,
): InventoryAggregationResult {
  const parent = normalizeProductCode(parentProductId);
  if (!snapshot.shopConfigured) {
    return { status: "CONFIG_NOT_FOUND", parentProductId: parent, reasonCode: "SHOP_CONFIG_NOT_FOUND" };
  }
  if (snapshot.status === "SHOP_ERROR") {
    return {
      status: "SHOP_ERROR",
      parentProductId: parent,
      reasonCode: snapshot.reasonCode ?? "POS_SHOP_ERROR",
    };
  }
  const observedAtMs = Date.parse(snapshot.observedAt);
  if (!Number.isFinite(observedAtMs) || now.getTime() - observedAtMs > maxAgeMs || observedAtMs > now.getTime() + 60_000) {
    return { status: "STALE", parentProductId: parent, reasonCode: "INVENTORY_FACT_STALE" };
  }
  if (/-(AO|CV|QUAN)$/.test(parent) || /^\d+$/.test(parent) || parent.length === 0) {
    return { status: "NOT_FOUND", parentProductId: parent, reasonCode: "INVALID_PARENT_PRODUCT_CODE" };
  }

  let offers: AggregatedInventoryOffer[] = [];
  if (parent.startsWith("SV")) {
    const ao = `${parent}-AO`;
    const cv = `${parent}-CV`;
    offers = combineSet(sumByVariant(snapshot.variations, ao), sumByVariant(snapshot.variations, cv), "SET", [ao, cv]);
  } else if (parent.startsWith("SQ")) {
    const ao = `${parent}-AO`;
    const quan = `${parent}-QUAN`;
    offers = combineSet(sumByVariant(snapshot.variations, ao), sumByVariant(snapshot.variations, quan), "SET", [ao, quan]);
  } else if (parent.startsWith("CB")) {
    const ao = `${parent}-AO`;
    const cv = `${parent}-CV`;
    const quan = `${parent}-QUAN`;
    const tops = sumByVariant(snapshot.variations, ao);
    offers = [
      ...combineSet(tops, sumByVariant(snapshot.variations, cv), "SET_CV", [ao, cv]),
      ...combineSet(tops, sumByVariant(snapshot.variations, quan), "SET_QUAN", [ao, quan]),
    ];
  } else {
    offers = [...sumByVariant(snapshot.variations, parent).values()].map((row) => ({
      offerType: "DIRECT" as const,
      color: row.color,
      size: row.size,
      quantity: row.quantity,
      componentCodes: [parent],
    }));
  }

  if (offers.length === 0) {
    return { status: "NOT_FOUND", parentProductId: parent, reasonCode: "SKU_OR_SET_COMPONENT_NOT_FOUND" };
  }
  return {
    status: "OK",
    parentProductId: parent,
    source,
    observedAt: snapshot.observedAt,
    offers: offers.sort(stableOfferSort),
  };
}

export class InventoryAuthorityService {
  public constructor(
    private readonly live: InventorySnapshotPort,
    private readonly snapshot: InventorySnapshotPort,
    private readonly liveMaxAgeMs: number,
    private readonly snapshotMaxAgeMs: number,
  ) {}

  public async resolve(parentProductId: string, now: Date): Promise<InventoryAggregationResult> {
    const live = await this.live.read(parentProductId);
    const liveResult = aggregateInventory(parentProductId, live, "POS_LIVE", now, this.liveMaxAgeMs);
    if (liveResult.status === "OK" || liveResult.status === "CONFIG_NOT_FOUND" || liveResult.status === "NOT_FOUND") {
      return liveResult;
    }

    const fallback = await this.snapshot.read(parentProductId);
    const snapshotResult = aggregateInventory(
      parentProductId,
      fallback,
      "POS_SNAPSHOT",
      now,
      this.snapshotMaxAgeMs,
    );
    // A stale or failed snapshot must never be upgraded from the live failure.
    return snapshotResult;
  }
}
