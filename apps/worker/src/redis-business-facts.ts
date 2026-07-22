import {
  BusinessFactEnvelopeV1Schema,
  type BusinessFactEnvelopeV1,
} from "@lana/contracts";
import {
  CatalogFactQuerySchema,
  CatalogSnapshotV3Schema,
  catalogSnapshotKey,
  normalizeCatalogToken,
  resolveCatalogFacts,
  type CatalogFactQuery,
  type CatalogSnapshotV3,
} from "@lana/business-tools";
import { createClient } from "redis";

export interface BusinessFactsReader {
  ready(): Promise<boolean>;
  resolve(query: CatalogFactQuery, now?: Date): Promise<BusinessFactEnvelopeV1>;
  close(): Promise<void>;
}

export class RedisBusinessFactsReader implements BusinessFactsReader {
  private readonly client: ReturnType<typeof createClient>;
  private readonly maxAgeSeconds: number;
  private readonly nonVolatileMaxAgeSeconds: number;

  constructor(
    redisUrl: string,
    maxAgeSeconds = 1_200,
    nonVolatileMaxAgeSeconds = 172_800,
  ) {
    if (!redisUrl.trim()) throw new Error("REDIS_URL_REQUIRED");
    this.client = createClient({ url: redisUrl });
    this.maxAgeSeconds = Math.max(60, Math.min(86_400, Math.trunc(maxAgeSeconds)));
    this.nonVolatileMaxAgeSeconds = Math.max(
      this.maxAgeSeconds,
      Math.min(172_800, Math.trunc(nonVolatileMaxAgeSeconds)),
    );
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
    try {
      const snapshot = CatalogSnapshotV3Schema.parse(JSON.parse(raw) as unknown);
      const policyContext = catalogPolicyContext(snapshot);
      const maxAgeSeconds = businessFactMaxAgeSeconds(
        snapshot,
        query,
        this.maxAgeSeconds,
        this.nonVolatileMaxAgeSeconds,
      );
      const result = resolveCatalogFacts(snapshot, query, now, maxAgeSeconds);
      return BusinessFactEnvelopeV1Schema.parse({ ...result, policyContext });
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
  }

  async close(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }
}

export function catalogPolicyContext(snapshot: CatalogSnapshotV3): {
  fulfillmentPolicy: string | null;
  canOrderWhenZero: boolean | null;
} {
  const policy = snapshot.fulfillment_policy;
  return {
    fulfillmentPolicy: policy ? normalizedFulfillmentPolicy(policy.tinh_trang) : null,
    canOrderWhenZero: policy?.can_order_when_zero ?? null,
  };
}

export function businessFactMaxAgeSeconds(
  snapshot: CatalogSnapshotV3,
  query: CatalogFactQuery,
  volatileMaxAgeSeconds: number,
  nonVolatileMaxAgeSeconds: number,
): number {
  const policy = catalogPolicyContext(snapshot);
  const strictReadyStock =
    policy.fulfillmentPolicy === "READY_STOCK" &&
    policy.canOrderWhenZero === false;
  const volatileIntent = query.intent === "STOCK" || query.intent === "SIZE";
  return strictReadyStock || volatileIntent
    ? volatileMaxAgeSeconds
    : nonVolatileMaxAgeSeconds;
}

function normalizedFulfillmentPolicy(value: string): string | null {
  const normalized = normalizeCatalogToken(value);
  if (["READY_STOCK", "BAN_HANG_SAN", "HANG_SAN", "AVAILABLE"].includes(normalized)) {
    return "READY_STOCK";
  }
  if (["PRE_ORDER", "PREORDER", "DAT_TRUOC", "MADE_TO_ORDER"].includes(normalized)) {
    return "PRE_ORDER";
  }
  if (["COMING_SOON", "HANG_SAP_VE", "INBOUND", "SAP_VE"].includes(normalized)) {
    return "COMING_SOON";
  }
  return null;
}
