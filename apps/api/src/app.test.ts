import { createHmac } from "node:crypto";
import type { CatalogFactQuery } from "@lana/business-tools";
import { describe, expect, it } from "vitest";
import {
  MemoryInboundQueue,
  StaticRoutingResolver,
} from "@lana/meta-webhook";
import { createApi } from "./app.js";
import type { CatalogProjectionStore } from "./catalog-store.js";
import type {
  ShadowEvaluationStore,
  ShadowMirrorMessageInput,
  ShadowMirrorStore,
} from "@lana/database";
import type {
  UpsaleSuppressionInput,
  UpsaleSuppressionStore,
} from "./upsale-suppression.js";

const config = {
  metaAppSecret: "test-app-secret",
  metaVerifyToken: "verify-me",
  identityHashSalt: "test-identity-hash-salt-at-least-16-bytes",
  allowedPageIds: new Set(["page-1"]),
  metaAppId: "app-1",
  shadowMirrorKey: "s".repeat(32),
  shadowEvaluationReadKey: "e".repeat(32),
  catalogMirrorKey: "c".repeat(32),
  businessFactReadKey: "b".repeat(32),
  routingMode: "SHADOW" as const,
  upsaleSuppressionEnabled: true,
};

class FakeShadowMirrorStore implements ShadowMirrorStore {
  readonly inputs: ShadowMirrorMessageInput[] = [];

  async ready(): Promise<boolean> {
    return true;
  }

  async record(input: ShadowMirrorMessageInput) {
    this.inputs.push(input);
    return { inserted: true, inboxId: "inbox-1", customerHash: "customer-hash" };
  }
}

class FakeShadowEvaluationStore implements ShadowEvaluationStore {
  async ready() { return true; }
  async claimNext() { return null; }
  async claimComparisonNext() { return null; }
  async complete() { return undefined; }
  async completeComparison() { return undefined; }
  async fail() { return undefined; }
  async heartbeat() { return undefined; }
  async workerHealthy() { return true; }
  async summary() {
    return {
      total: 3, pending: 1, processing: 0, awaitingActual: 0, completed: 2,
      failedRetryable: 0, failedPermanent: 0, policyBlocked: 1,
      withActualReply: 2, averageLatencyMs: 120, averageTextSimilarity: 0.25,
      averageActualQualityScore: 3.8, withBusinessFacts: 1, businessFactsOk: 1,
      metaOutboxCount: 0, workerHealthy: true,
    };
  }
  async recent() { return []; }
}

class FakeCatalogProjectionStore implements CatalogProjectionStore {
  readonly ingested: unknown[] = [];
  readonly ingestedTtls: number[] = [];
  async ready() { return true; }
  async ingest(value: unknown, ttlSeconds = 7_200) {
    this.ingested.push(value);
    this.ingestedTtls.push(ttlSeconds);
    return { key: "catalog:offer:LANA:SQ149", productId: "SQ149", shopAlias: "LANA", ttlSeconds };
  }
  async resolve(query: CatalogFactQuery) {
    return {
      schemaVersion: 1 as const,
      status: "OK" as const,
      source: "POS_SNAPSHOT" as const,
      observedAt: "2026-07-15T00:00:00.000Z",
      expiresAt: "2026-07-15T01:00:00.000Z",
      productId: query.productId,
      facts: {
        schemaVersion: 1 as const,
        productId: query.productId,
        parentProductId: query.productId,
        offerType: "SET_QUAN",
        listPriceVnd: 799_000,
        salePriceVnd: 699_000,
        sizes: ["M"],
        stockStatus: "IN_STOCK" as const,
        stockQuantity: 3,
        deliveryEta: null,
        fulfillmentPolicy: "READY_STOCK",
        imageUrls: [],
      },
      reasonCode: null,
    };
  }
  async close() { return undefined; }
}

class FakeUpsaleSuppressionStore implements UpsaleSuppressionStore {
  readonly inputs: UpsaleSuppressionInput[] = [];

  async record(input: UpsaleSuppressionInput): Promise<{ inserted: boolean }> {
    this.inputs.push(input);
    return { inserted: true };
  }
}

function signature(body: string): string {
  return `sha256=${createHmac("sha256", config.metaAppSecret)
    .update(Buffer.from(body))
    .digest("hex")}`;
}

describe("Meta webhook API", () => {
  it("rejects malformed JSON after valid raw-body signature without enqueueing", async () => {
    const queue = new MemoryInboundQueue();
    const app = createApi({ config, inboundQueue: queue });
    const body = "{not-json";
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/meta",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature(body),
      },
      payload: body,
    });
    expect(response.statusCode).toBe(400);
    expect(queue.items).toHaveLength(0);
    await app.close();
  });

  it("enqueues shadow work with N8N ownership and send disabled", async () => {
    const queue = new MemoryInboundQueue();
    const app = createApi({
      config,
      inboundQueue: queue,
      routingResolver: new StaticRoutingResolver("SHADOW"),
    });
    const body = JSON.stringify({
      object: "page",
      entry: [
        {
          id: "page-1",
          messaging: [
            {
              sender: { id: "customer-1" },
              recipient: { id: "page-1" },
              timestamp: 1_784_000_000_000,
              message: { mid: "m-1", text: "hello" },
            },
          ],
        },
      ],
    });
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/meta",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature(body),
      },
      payload: body,
    });
    expect(response.statusCode).toBe(200);
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]?.routing).toMatchObject({
      mode: "SHADOW",
      routingOwner: "N8N",
      evaluationOnly: true,
    });
    expect(queue.items[0]?.customerSendEnabled).toBe(false);
    await app.close();
  });

  it("suppresses matching upsale text per event while continuing a mixed batch", async () => {
    const queue = new MemoryInboundQueue();
    const suppressionStore = new FakeUpsaleSuppressionStore();
    const app = createApi({
      config,
      inboundQueue: queue,
      upsaleSuppressionStore: suppressionStore,
    });
    const body = JSON.stringify({
      object: "page",
      entry: [
        {
          id: "page-1",
          messaging: [
            {
              sender: { id: "page-1" },
              recipient: { id: "customer-1" },
              timestamp: 1_784_000_000_000,
              message: {
                mid: "m-upsale-1",
                is_echo: true,
                text: "Mở đầu — EM NHẮN LẠI XEM MÌNH CÒN CẦN TƯ VẤN VỀ SẢN PHẨM KHÔNG Ạ? Mẫu vẫn còn.",
              },
            },
            {
              sender: { id: "customer-1" },
              recipient: { id: "page-1" },
              timestamp: 1_784_000_001_000,
              message: { mid: "m-customer-1", text: "Mẫu này còn size M không?" },
            },
          ],
        },
      ],
    });
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/meta",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature(body),
      },
      payload: body,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ accepted: 2, queued: 1, suppressed: 1 });
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]?.message.messageId).toBe("m-customer-1");
    expect(suppressionStore.inputs).toHaveLength(1);
    expect(suppressionStore.inputs[0]).toMatchObject({
      providerMessageId: "m-upsale-1",
      templateId: "UPSALE_FOLLOWUP_02",
      templateVersion: "v1",
      pageId: "page-1",
    });
    expect(suppressionStore.inputs[0]?.conversationHash).not.toContain("customer-1");
    expect(suppressionStore.inputs[0]?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    await app.close();
  });

  it("does not require is_echo and returns 200 even if metrics persistence fails", async () => {
    const queue = new MemoryInboundQueue();
    const app = createApi({
      config,
      inboundQueue: queue,
      upsaleSuppressionStore: {
        async record() {
          throw new Error("metrics unavailable");
        },
      },
    });
    const body = JSON.stringify({
      object: "page",
      entry: [
        {
          id: "page-1",
          messaging: [
            {
              sender: { id: "customer-1" },
              recipient: { id: "page-1" },
              timestamp: 1_784_000_000_000,
              message: {
                mid: "m-upsale-no-echo",
                text: "chị ơi thật ngại em sợ làm phiền chị, bên em gửi thêm ảnh mẫu.",
              },
            },
          ],
        },
      ],
    });
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/meta",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature(body),
      },
      payload: body,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ accepted: 1, queued: 0, suppressed: 1 });
    expect(queue.items).toHaveLength(0);
    await app.close();
  });

  it("keeps the legacy send endpoint disabled", async () => {
    const app = createApi({ config, inboundQueue: new MemoryInboundQueue() });
    const response = await app.inject({
      method: "POST",
      url: "/webhook/gateway-facebook-send",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ text: "must not send" }),
    });
    expect(response.statusCode).toBe(410);
    expect(response.json()).toEqual({
      enabled: false,
      send: false,
      code: "INTERNAL_SEND_GATEWAY_DISABLED",
    });
    await app.close();
  });
});

describe("n8n shadow mirror API", () => {
  const payload = JSON.stringify({
    schema_version: 1,
    source: "N8N_MIRROR",
    page_id: "1198992073286645",
    sender_id: "customer-1",
    message_id: "mid-1",
    occurred_at: "2026-07-15T00:00:00.000Z",
    is_echo: false,
    app_id: null,
    text: "chị hỏi mẫu này",
    attachment_count: 0,
  });
  const mirrorConfig = {
    ...config,
    allowedPageIds: new Set(["1198992073286645"]),
  };

  it("rejects a missing internal key before persistence", async () => {
    const store = new FakeShadowMirrorStore();
    const app = createApi({
      config: mirrorConfig,
      inboundQueue: new MemoryInboundQueue(),
      shadowMirrorStore: store,
    });
    const response = await app.inject({
      method: "POST",
      url: "/internal/shadow/messages",
      headers: { "content-type": "application/json" },
      payload,
    });
    expect(response.statusCode).toBe(401);
    expect(store.inputs).toHaveLength(0);
    await app.close();
  });

  it("persists an authenticated allowed-page mirror without send authorization", async () => {
    const store = new FakeShadowMirrorStore();
    const app = createApi({
      config: mirrorConfig,
      inboundQueue: new MemoryInboundQueue(),
      shadowMirrorStore: store,
    });
    const response = await app.inject({
      method: "POST",
      url: "/internal/shadow/messages",
      headers: {
        "content-type": "application/json",
        "x-lana-internal-key": mirrorConfig.shadowMirrorKey,
      },
      payload,
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({ accepted: true, mode: "shadow", send: false });
    expect(store.inputs).toHaveLength(1);
    expect(store.inputs[0]).toMatchObject({ pageId: "1198992073286645", senderId: "customer-1" });
    await app.close();
  });
});

describe("Phase 4 shadow evaluation API", () => {
  it("keeps evaluation metrics private and explicitly send-disabled", async () => {
    const app = createApi({
      config: { ...config, allowedPageIds: new Set(["page-1"]) },
      inboundQueue: new MemoryInboundQueue(),
      shadowEvaluationStore: new FakeShadowEvaluationStore(),
    });
    const unauthorized = await app.inject({
      method: "GET",
      url: "/internal/shadow/evaluations/summary?page_id=page-1",
    });
    expect(unauthorized.statusCode).toBe(401);
    const response = await app.inject({
      method: "GET",
      url: "/internal/shadow/evaluations/summary?page_id=page-1",
      headers: { "x-lana-internal-key": config.shadowEvaluationReadKey },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ total: 3, metaOutboxCount: 0, send: false });
    await app.close();
  });
});

describe("Phase 5 business facts API", () => {
  const snapshot = {
    schema_version: 3,
    release_id: "release-1",
    catalog_version: "catalog-v2",
    policy_version: "policy-v1",
    shop_alias: "LANA",
    brand: "lanadesign",
    product_id: "SQ149",
    synced_at: new Date().toISOString(),
    data_status: "OK",
    fulfillment_policy: {
      tinh_trang: "READY_STOCK", can_order_when_zero: false,
      prep_min_days: 1, prep_max_days: 2, eta_valid_until: "",
    },
    shipping_eta: {},
    offers: {
      SET_QUAN: {
        list_price: 799_000, sale_price: 699_000, price_status: "OK",
        rows: [{ color: "DEN", size: "M", stock_quantity: 3, list_price: 799_000, sale_price: 699_000, stock_status: "OK" }],
      },
    },
  };

  it("accepts only authenticated canonical snapshots and exposes guarded facts separately", async () => {
    const store = new FakeCatalogProjectionStore();
    const app = createApi({
      config,
      inboundQueue: new MemoryInboundQueue(),
      shadowEvaluationStore: new FakeShadowEvaluationStore(),
      catalogProjectionStore: store,
    });
    const payload = JSON.stringify({
      schema_version: 1,
      source: "N8N_POS_SNAPSHOT",
      ttl_seconds: 172_800,
      snapshot,
    });
    const unauthorized = await app.inject({
      method: "POST", url: "/internal/catalog/snapshots",
      headers: { "content-type": "application/json" }, payload,
    });
    expect(unauthorized.statusCode).toBe(401);
    const accepted = await app.inject({
      method: "POST", url: "/internal/catalog/snapshots",
      headers: { "content-type": "application/json", "x-lana-internal-key": config.catalogMirrorKey },
      payload,
    });
    expect(accepted.statusCode).toBe(202);
    expect(store.ingested).toHaveLength(1);
    expect(store.ingestedTtls).toEqual([172_800]);

    const facts = await app.inject({
      method: "GET",
      url: "/internal/business-facts/LANA/SQ149?intent=PRICE&offer_type=SET_QUAN&size=M",
      headers: { "x-lana-internal-key": config.businessFactReadKey },
    });
    expect(facts.statusCode).toBe(200);
    expect(facts.json()).toMatchObject({ status: "OK", productId: "SQ149", send: false });
    await app.close();
  });
});
