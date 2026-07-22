import {
  BusinessFactEnvelopeV1Schema,
  type BusinessFactEnvelopeV1,
} from "@lana/contracts";
import {
  CatalogFactQuerySchema,
  CatalogSnapshotV3Schema,
  catalogSnapshotKey,
  resolveCatalogFacts,
  type CatalogFactQuery,
  type CatalogSnapshotV3,
} from "@lana/business-tools";
import { createClient } from "redis";

export interface CatalogIngestResult {
  readonly key: string;
  readonly productId: string;
  readonly shopAlias: string;
  readonly ttlSeconds: number;
}

export interface CatalogProjectionStore {
  ready(): Promise<boolean>;
  ingest(value: unknown, ttlSeconds?: number): Promise<CatalogIngestResult>;
  resolve(query: CatalogFactQuery, now?: Date): Promise<BusinessFactEnvelopeV1>;
  close(): Promise<void>;
}

export class RedisCatalogProjectionStore implements CatalogProjectionStore {
  private readonly client: ReturnType<typeof createClient>;
  private readonly maxAgeSeconds: number;

  constructor(redisUrl: string, maxAgeSeconds = 1_200) {
    if (!redisUrl.trim()) throw new Error("REDIS_URL_REQUIRED");
    this.client = createClient({ url: redisUrl });
    this.maxAgeSeconds = Math.max(60, Math.min(86_400, Math.trunc(maxAgeSeconds)));
    this.client.on("error", () => undefined);
  }

  private async connected(): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
  }

  async ready(): Promise<boolean> {
    try {
      await this.connected();
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async ingest(value: unknown, ttlSeconds = 7_200): Promise<CatalogIngestResult> {
    const snapshot = CatalogSnapshotV3Schema.parse(value);
    const observedMs = Date.parse(snapshot.synced_at);
    if (observedMs > Date.now() + 10 * 60_000 || observedMs < Date.now() - 24 * 60 * 60_000) {
      throw new Error("CATALOG_SNAPSHOT_TIMESTAMP_INVALID");
    }
    const boundedTtl = Math.max(300, Math.min(172_800, Math.trunc(ttlSeconds)));
    const key = catalogSnapshotKey(snapshot.shop_alias, snapshot.product_id);
    await this.connected();
    await this.client.set(key, JSON.stringify(snapshot), { EX: boundedTtl });
    return {
      key,
      productId: snapshot.product_id,
      shopAlias: snapshot.shop_alias,
      ttlSeconds: boundedTtl,
    };
  }

  async resolve(rawQuery: CatalogFactQuery, now = new Date()): Promise<BusinessFactEnvelopeV1> {
    const query = CatalogFactQuerySchema.parse(rawQuery);
    await this.connected();
    const raw = await this.client.get(catalogSnapshotKey(query.shopAlias, query.productId));
    if (!raw) {
      return BusinessFactEnvelopeV1Schema.parse({
        schemaVersion: 1,
        status: "NOT_FOUND",
        source: "POS_SNAPSHOT",
        observedAt: now.toISOString(),
        expiresAt: null,
        productId: query.productId,
        facts: null,
        reasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
      });
    }
    let snapshot: CatalogSnapshotV3;
    try {
      snapshot = CatalogSnapshotV3Schema.parse(JSON.parse(raw) as unknown);
    } catch {
      return BusinessFactEnvelopeV1Schema.parse({
        schemaVersion: 1,
        status: "ERROR",
        source: "POS_SNAPSHOT",
        observedAt: now.toISOString(),
        expiresAt: null,
        productId: query.productId,
        facts: null,
        reasonCode: "CATALOG_SNAPSHOT_INVALID",
      });
    }
    return resolveCatalogFacts(snapshot, query, now, this.maxAgeSeconds);
  }

  async close(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }
}
