import { createHash, createHmac, randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { CatalogSnapshotV3Schema, type CatalogFactQuery } from "@lana/business-tools";
import {
  constantTimeKeyMatches,
  type ShadowEvaluationStore,
  type ShadowMirrorStore,
} from "@lana/database";
import {
  MetaPageNotAllowedError,
  MetaPayloadError,
  classifyUpsaleMessage,
  normalizeMetaMessages,
  parseMetaPayload,
  verifyMetaSignature,
  type GatewayRoutingMode,
  type InboundQueue,
  type RoutingResolver,
  StaticRoutingResolver,
} from "@lana/meta-webhook";
import type { CatalogProjectionStore } from "./catalog-store.js";
import type { UpsaleSuppressionStore } from "./upsale-suppression.js";

export interface ApiConfig {
  metaAppSecret: string;
  metaVerifyToken: string;
  identityHashSalt: string;
  allowedPageIds: ReadonlySet<string>;
  metaAppId?: string;
  shadowMirrorKey?: string;
  shadowEvaluationReadKey?: string;
  catalogMirrorKey?: string;
  businessFactReadKey?: string;
  routingMode: GatewayRoutingMode;
  realtimeMirrorEnabled?: boolean;
  /** Fail-closed early classifier; disabled unless explicitly enabled. */
  upsaleSuppressionEnabled?: boolean;
  bodyLimitBytes?: number;
}

export interface CreateApiOptions {
  config: ApiConfig;
  inboundQueue: InboundQueue;
  routingResolver?: RoutingResolver;
  shadowMirrorStore?: ShadowMirrorStore;
  shadowEvaluationStore?: ShadowEvaluationStore;
  catalogProjectionStore?: CatalogProjectionStore;
  upsaleSuppressionStore?: UpsaleSuppressionStore;
}

interface VerificationQuery {
  "hub.mode"?: string;
  "hub.verify_token"?: string;
  "hub.challenge"?: string;
}

interface ShadowMirrorPayload {
  schema_version: 1;
  source: "N8N_MIRROR";
  page_id: string;
  sender_id: string;
  message_id: string | null;
  occurred_at: string;
  is_echo: boolean;
  app_id: string | null;
  text: string | null;
  attachment_count: number;
}

interface EvaluationQuery {
  limit?: string;
  page_id?: string;
}

interface CatalogSnapshotEnvelope {
  schema_version: 1;
  source: "N8N_POS_SNAPSHOT";
  ttl_seconds: number;
  snapshot: unknown;
}

interface BusinessFactQuerystring {
  intent?: string;
  offer_type?: string;
  color?: string;
  size?: string;
  delivery_region?: string;
}

interface BusinessFactParams {
  shop_alias: string;
  product_id: string;
}

function internalKeyAuthorized(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  expected: string,
): boolean {
  const suppliedHeader = headers["x-lana-internal-key"];
  const supplied = Array.isArray(suppliedHeader) ? suppliedHeader[0] : suppliedHeader;
  return expected.length >= 32 && typeof supplied === "string" && constantTimeKeyMatches(expected, supplied);
}

function parseShadowMirrorPayload(rawBody: Buffer): ShadowMirrorPayload {
  let value: unknown;
  try {
    value = JSON.parse(rawBody.toString("utf8")) as unknown;
  } catch {
    throw new Error("SHADOW_MIRROR_PAYLOAD_INVALID");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("SHADOW_MIRROR_PAYLOAD_INVALID");
  }
  const item = value as Record<string, unknown>;
  const messageId = item.message_id;
  const appId = item.app_id;
  const text = item.text;
  if (
    item.schema_version !== 1 ||
    item.source !== "N8N_MIRROR" ||
    typeof item.page_id !== "string" ||
    !/^\d{5,64}$/.test(item.page_id) ||
    typeof item.sender_id !== "string" ||
    item.sender_id.length < 1 ||
    item.sender_id.length > 256 ||
    (messageId !== null && typeof messageId !== "string") ||
    (typeof messageId === "string" && messageId.length > 256) ||
    typeof item.occurred_at !== "string" ||
    !Number.isFinite(Date.parse(item.occurred_at)) ||
    typeof item.is_echo !== "boolean" ||
    (appId !== null && typeof appId !== "string") ||
    (text !== null && typeof text !== "string") ||
    (typeof text === "string" && text.length > 8_000) ||
    typeof item.attachment_count !== "number" ||
    !Number.isInteger(item.attachment_count) ||
    Number(item.attachment_count) < 0 ||
    Number(item.attachment_count) > 10
  ) {
    throw new Error("SHADOW_MIRROR_PAYLOAD_INVALID");
  }
  const occurredAtMs = Date.parse(item.occurred_at as string);
  const now = Date.now();
  if (occurredAtMs > now + 10 * 60_000 || occurredAtMs < now - 183 * 86_400_000) {
    throw new Error("SHADOW_MIRROR_TIMESTAMP_OUT_OF_RANGE");
  }
  return item as unknown as ShadowMirrorPayload;
}

function mirroredConversationHash(
  pageId: string,
  senderId: string,
  salt: string,
): string {
  const digest = createHmac("sha256", salt)
    .update(pageId)
    .update("\0")
    .update(senderId)
    .digest("hex");
  return `meta:v1:${digest}`;
}

function mirroredEventKey(payload: ShadowMirrorPayload): string {
  if (payload.message_id) {
    return `meta:${payload.page_id}:message:${payload.message_id}`;
  }
  const digest = createHash("sha256")
    .update(payload.page_id)
    .update("\0")
    .update(payload.sender_id)
    .update("\0")
    .update(payload.occurred_at)
    .update("\0")
    .update(payload.text ?? "")
    .update("\0")
    .update(String(payload.attachment_count))
    .digest("hex");
  return `meta:${payload.page_id}:fallback:v1:${digest}`;
}

function parseCatalogSnapshotEnvelope(rawBody: Buffer): CatalogSnapshotEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(rawBody.toString("utf8")) as unknown;
  } catch {
    throw new Error("CATALOG_SNAPSHOT_PAYLOAD_INVALID");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CATALOG_SNAPSHOT_PAYLOAD_INVALID");
  }
  const item = value as Record<string, unknown>;
  if (
    item.schema_version !== 1 ||
    item.source !== "N8N_POS_SNAPSHOT" ||
    typeof item.ttl_seconds !== "number" ||
    !Number.isInteger(item.ttl_seconds) ||
    item.ttl_seconds < 300 ||
    item.ttl_seconds > 172_800 ||
    !CatalogSnapshotV3Schema.safeParse(item.snapshot).success
  ) {
    throw new Error("CATALOG_SNAPSHOT_PAYLOAD_INVALID");
  }
  return item as unknown as CatalogSnapshotEnvelope;
}

export function createApi(options: CreateApiOptions): FastifyInstance {
  const { config, inboundQueue } = options;
  const routingResolver =
    options.routingResolver ?? new StaticRoutingResolver(config.routingMode);
  const app = Fastify({
    logger: false,
    bodyLimit: config.bodyLimitBytes ?? 1_048_576,
  });

  // Buffering is not JSON parsing: the handler verifies exact bytes before JSON.parse.
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );

  app.get("/health/live", async () => ({ status: "ok" }));

  app.get("/health/shadow-ready", async (_request, reply) => {
    const keyReady = (config.shadowMirrorKey?.length ?? 0) >= 32;
    const storeReady = options.shadowMirrorStore
      ? await options.shadowMirrorStore.ready().catch(() => false)
      : false;
    if (!keyReady || !storeReady || config.allowedPageIds.size === 0) {
      return reply.code(503).send({ status: "not_ready", send: false });
    }
    return { status: "ready", mode: "shadow", send: false };
  });

  app.get("/health/phase4-ready", async (_request, reply) => {
    const keyReady = (config.shadowEvaluationReadKey?.length ?? 0) >= 32;
    const evaluationReady = options.shadowEvaluationStore
      ? await options.shadowEvaluationStore.ready().catch(() => false)
      : false;
    const workerReady = options.shadowEvaluationStore
      ? await options.shadowEvaluationStore.workerHealthy().catch(() => false)
      : false;
    if (!keyReady || !evaluationReady || !workerReady) {
      return reply.code(503).send({ status: "not_ready", mode: "shadow", send: false });
    }
    return { status: "ready", mode: "shadow-evaluation", send: false };
  });

  app.get("/health/phase5-ready", async (_request, reply) => {
    const phase4KeyReady = (config.shadowEvaluationReadKey?.length ?? 0) >= 32;
    const catalogKeysReady =
      (config.catalogMirrorKey?.length ?? 0) >= 32 &&
      (config.businessFactReadKey?.length ?? 0) >= 32;
    const evaluationReady = options.shadowEvaluationStore
      ? await options.shadowEvaluationStore.ready().catch(() => false)
      : false;
    const workerReady = options.shadowEvaluationStore
      ? await options.shadowEvaluationStore.workerHealthy().catch(() => false)
      : false;
    const catalogReady = options.catalogProjectionStore
      ? await options.catalogProjectionStore.ready().catch(() => false)
      : false;
    if (!phase4KeyReady || !catalogKeysReady || !evaluationReady || !workerReady || !catalogReady) {
      return reply.code(503).send({ status: "not_ready", mode: "shadow-business-facts", send: false });
    }
    return { status: "ready", mode: "shadow-business-facts", send: false };
  });

  app.get("/health/ready", async (_request, reply) => {
    const configReady =
      config.metaAppSecret.length > 0 &&
      config.metaVerifyToken.length > 0 &&
      config.identityHashSalt.length >= 16 &&
      config.allowedPageIds.size > 0;
    const queueReady = await inboundQueue.ready().catch(() => false);
    if (!configReady || !queueReady) {
      return reply.code(503).send({ status: "not_ready" });
    }
    return {
      status: "ready",
      mode: config.routingMode,
      customer_send_enabled: false,
    };
  });

  app.get<{ Querystring: VerificationQuery }>(
    "/webhooks/meta",
    async (request, reply) => {
      const query = request.query;
      if (
        query["hub.mode"] !== "subscribe" ||
        query["hub.verify_token"] !== config.metaVerifyToken ||
        typeof query["hub.challenge"] !== "string"
      ) {
        return reply.code(403).send({ code: "META_VERIFY_TOKEN_INVALID" });
      }
      return reply.type("text/plain").send(query["hub.challenge"]);
    },
  );

  app.post<{ Body: Buffer }>("/webhooks/meta", async (request, reply) => {
    const rawBody = request.body;
    const signatureHeader = request.headers["x-hub-signature-256"];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;

    if (!Buffer.isBuffer(rawBody)) {
      return reply.code(400).send({ code: "META_PAYLOAD_INVALID" });
    }
    if (!verifyMetaSignature(rawBody, signature, config.metaAppSecret)) {
      return reply.code(401).send({ code: "META_SIGNATURE_INVALID" });
    }

    try {
      const payload = parseMetaPayload(rawBody);
      const messages = normalizeMetaMessages(
        payload,
        config.allowedPageIds,
        config.identityHashSalt,
      );
      let queued = 0;
      let suppressed = 0;
      for (const message of messages) {
        const upsale = config.upsaleSuppressionEnabled === true
          ? classifyUpsaleMessage(message.text)
          : null;
        if (upsale) {
          suppressed += 1;
          if (options.upsaleSuppressionStore) {
            try {
              await options.upsaleSuppressionStore.record({
                eventKey: message.eventKey,
                providerMessageId: message.messageId,
                pageId: message.pageId,
                conversationHash: message.conversationId,
                occurredAt: new Date(message.occurredAt),
                receivedAt: new Date(),
                templateId: upsale.templateId,
                templateVersion: upsale.templateVersion,
                contentHash: createHash("sha256")
                  .update(upsale.normalizedText)
                  .digest("hex"),
              });
            } catch (error) {
              // Suppression is fail-closed: a metrics outage must not invoke AI/Pancake.
              request.log.error({ err: error }, "upsale suppression persistence failed");
            }
          }
          continue;
        }
        const routing = await routingResolver.resolve(message);
        await inboundQueue.enqueue({
          schemaVersion: 1,
          message,
          routing,
          customerSendEnabled: false,
        });
        queued += 1;
      }
      return reply.code(200).send({
        accepted: messages.length,
        queued,
        suppressed,
        send: false,
      });
    } catch (error) {
      if (error instanceof MetaPageNotAllowedError) {
        return reply.code(403).send({ code: error.code });
      }
      if (error instanceof MetaPayloadError) {
        return reply.code(400).send({ code: error.code });
      }
      request.log.error({ err: error }, "inbound queue failed");
      return reply.code(503).send({ code: "INBOX_COMMIT_FAILED" });
    }
  });

  app.post<{ Body: Buffer }>("/internal/shadow/messages", async (request, reply) => {
    const key = config.shadowMirrorKey ?? "";
    if (!internalKeyAuthorized(request.headers, key)) {
      return reply.code(401).send({ code: "SHADOW_MIRROR_UNAUTHORIZED", send: false });
    }
    if (!options.shadowMirrorStore) {
      return reply.code(503).send({ code: "SHADOW_MIRROR_STORE_UNAVAILABLE", send: false });
    }
    if (!Buffer.isBuffer(request.body)) {
      return reply.code(400).send({ code: "SHADOW_MIRROR_PAYLOAD_INVALID", send: false });
    }

    let payload: ShadowMirrorPayload;
    try {
      payload = parseShadowMirrorPayload(request.body);
    } catch {
      return reply.code(400).send({ code: "SHADOW_MIRROR_PAYLOAD_INVALID", send: false });
    }
    if (!config.allowedPageIds.has(payload.page_id)) {
      return reply.code(403).send({ code: "SHADOW_MIRROR_PAGE_NOT_ALLOWED", send: false });
    }

    try {
      const result = await options.shadowMirrorStore.record({
        pageId: payload.page_id,
        senderId: payload.sender_id,
        messageId: payload.message_id,
        occurredAt: new Date(payload.occurred_at),
        receivedAt: new Date(),
        isEcho: payload.is_echo,
        appId: payload.app_id,
        text: payload.text,
        attachmentCount: payload.attachment_count,
      });
      if (config.realtimeMirrorEnabled) {
        const message = {
          schemaVersion: 1 as const,
          traceId: randomUUID(),
          eventKey: mirroredEventKey(payload),
          pageId: payload.page_id,
          messageId: payload.message_id,
          senderId: payload.sender_id,
          conversationId: mirroredConversationHash(
            payload.page_id,
            payload.sender_id,
            config.identityHashSalt,
          ),
          occurredAt: payload.occurred_at,
          isEcho: payload.is_echo,
          appId: payload.app_id,
          text: payload.text,
          attachments: [],
        };
        const routing = await routingResolver.resolve(message);
        await inboundQueue.enqueue({
          schemaVersion: 1,
          message,
          routing,
          customerSendEnabled: false,
        });
      }
      return reply.code(202).send({
        accepted: result.inserted,
        duplicate: !result.inserted,
        mode: config.realtimeMirrorEnabled
          ? "shadow+realtime-dry-run"
          : "shadow",
        send: false,
      });
    } catch (error) {
      request.log.error({ err: error }, "shadow mirror persistence failed");
      return reply.code(503).send({ code: "SHADOW_MIRROR_PERSIST_FAILED", send: false });
    }
  });

  app.post<{ Body: Buffer }>("/internal/catalog/snapshots", async (request, reply) => {
    if (!internalKeyAuthorized(request.headers, config.catalogMirrorKey ?? "")) {
      return reply.code(401).send({ code: "CATALOG_MIRROR_UNAUTHORIZED", send: false });
    }
    if (!options.catalogProjectionStore) {
      return reply.code(503).send({ code: "CATALOG_STORE_UNAVAILABLE", send: false });
    }
    if (!Buffer.isBuffer(request.body)) {
      return reply.code(400).send({ code: "CATALOG_SNAPSHOT_PAYLOAD_INVALID", send: false });
    }
    try {
      const envelope = parseCatalogSnapshotEnvelope(request.body);
      const result = await options.catalogProjectionStore.ingest(envelope.snapshot, envelope.ttl_seconds);
      return reply.code(202).send({
        accepted: true,
        product_id: result.productId,
        shop_alias: result.shopAlias,
        ttl_seconds: result.ttlSeconds,
        mode: "business-facts",
        send: false,
      });
    } catch (error) {
      const code = error instanceof Error && error.message === "CATALOG_SNAPSHOT_TIMESTAMP_INVALID"
        ? "CATALOG_SNAPSHOT_TIMESTAMP_INVALID"
        : "CATALOG_SNAPSHOT_PAYLOAD_INVALID";
      return reply.code(400).send({ code, send: false });
    }
  });

  app.get<{ Params: BusinessFactParams; Querystring: BusinessFactQuerystring }>(
    "/internal/business-facts/:shop_alias/:product_id",
    async (request, reply) => {
      if (!internalKeyAuthorized(request.headers, config.businessFactReadKey ?? "")) {
        return reply.code(401).send({ code: "BUSINESS_FACT_UNAUTHORIZED", send: false });
      }
      if (!options.catalogProjectionStore) {
        return reply.code(503).send({ code: "CATALOG_STORE_UNAVAILABLE", send: false });
      }
      const intent = (request.query.intent ?? "INFO").trim().toUpperCase();
      if (!["INFO", "PRICE", "STOCK", "SIZE", "ETA"].includes(intent)) {
        return reply.code(400).send({ code: "BUSINESS_FACT_QUERY_INVALID", send: false });
      }
      const query: CatalogFactQuery = {
        shopAlias: request.params.shop_alias,
        productId: request.params.product_id,
        intent: intent as CatalogFactQuery["intent"],
        offerType: request.query.offer_type?.trim() || null,
        color: request.query.color?.trim() || null,
        size: request.query.size?.trim() || null,
        deliveryRegion: request.query.delivery_region?.trim() || null,
      };
      try {
        const facts = await options.catalogProjectionStore.resolve(query);
        return { ...facts, mode: "business-facts", send: false };
      } catch {
        return reply.code(400).send({ code: "BUSINESS_FACT_QUERY_INVALID", send: false });
      }
    },
  );

  app.get<{ Querystring: EvaluationQuery }>(
    "/internal/shadow/evaluations/summary",
    async (request, reply) => {
      if (!internalKeyAuthorized(request.headers, config.shadowEvaluationReadKey ?? "")) {
        return reply.code(401).send({ code: "SHADOW_EVALUATION_UNAUTHORIZED", send: false });
      }
      if (!options.shadowEvaluationStore) {
        return reply.code(503).send({ code: "SHADOW_EVALUATION_STORE_UNAVAILABLE", send: false });
      }
      const pageId = request.query.page_id?.trim();
      if (pageId && !config.allowedPageIds.has(pageId)) {
        return reply.code(403).send({ code: "SHADOW_EVALUATION_PAGE_NOT_ALLOWED", send: false });
      }
      const summary = await options.shadowEvaluationStore.summary(pageId || undefined);
      return { ...summary, mode: "shadow-evaluation", send: false };
    },
  );

  app.get<{ Querystring: EvaluationQuery }>(
    "/internal/shadow/evaluations",
    async (request, reply) => {
      if (!internalKeyAuthorized(request.headers, config.shadowEvaluationReadKey ?? "")) {
        return reply.code(401).send({ code: "SHADOW_EVALUATION_UNAUTHORIZED", send: false });
      }
      if (!options.shadowEvaluationStore) {
        return reply.code(503).send({ code: "SHADOW_EVALUATION_STORE_UNAVAILABLE", send: false });
      }
      const pageId = request.query.page_id?.trim();
      if (pageId && !config.allowedPageIds.has(pageId)) {
        return reply.code(403).send({ code: "SHADOW_EVALUATION_PAGE_NOT_ALLOWED", send: false });
      }
      const parsedLimit = Number(request.query.limit ?? "20");
      const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(100, Math.trunc(parsedLimit))) : 20;
      const evaluations = await options.shadowEvaluationStore.recent(limit, pageId || undefined);
      return { evaluations, mode: "shadow-evaluation", send: false };
    },
  );

  // Legacy n8n compatibility path. It is intentionally impossible to send in Phase 1.
  app.post("/webhook/gateway-facebook-send", async (_request, reply) =>
    reply.code(410).send({
      enabled: false,
      send: false,
      code: "INTERNAL_SEND_GATEWAY_DISABLED",
    }),
  );

  return app;
}
