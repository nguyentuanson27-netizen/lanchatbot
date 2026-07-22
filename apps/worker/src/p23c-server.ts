import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "redis";
import { createBatchStatusReporter } from "./batch-status-reporter.js";
import { GoogleSheetsClient } from "./google-sheets-client.js";
import {
  FfmpegImagePipeline,
  HttpQdrantClient,
  P23cPublisher,
  RedisVertexRateLimiter,
  VertexEmbeddingClient,
} from "./p23c-publisher.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function secretOrEnvironment(directName: string, fileName: string): string {
  const direct = process.env[directName]?.trim();
  if (direct) return direct;
  return readFileSync(required(fileName), "utf8").trim();
}

function optionalSecret(directName: string, fileName: string): string {
  const direct = process.env[directName]?.trim();
  if (direct) return direct;
  const file = process.env[fileName]?.trim();
  if (!file) return "";
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    return "";
  }
}

function boundedInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(raw)));
}

function log(level: "info" | "error", context: Record<string, unknown>, message: string): void {
  process.stdout.write(`${JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: "p23c-publisher",
    ...context,
    msg: message,
  })}\n`);
}

/** Token Google dùng chung cho Vertex và Sheets, cache theo thời hạn trả về. */
function createTokenProvider(email: string, privateKey: string, scope: string): () => Promise<string> {
  let cached: { value: string; expiresAt: number } | null = null;
  return async (): Promise<string> => {
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.value;
    const issuedAt = Math.floor(Date.now() / 1_000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss: email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3_600,
    })).toString("base64url");
    const unsigned = `${header}.${payload}`;
    const normalizedKey = privateKey.trim().replace(/^=+/u, "").replace(/\\n/gu, "\n");
    const signature = createSign("RSA-SHA256").update(unsigned).end().sign(normalizedKey, "base64url");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${signature}`,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await response.json().catch(() => null)) as
      { access_token?: string; expires_in?: number } | null;
    if (!response.ok || typeof body?.access_token !== "string") throw new Error("VERTEX_TOKEN_FAILED");
    cached = {
      value: body.access_token,
      expiresAt: Date.now() + Math.max(60, Number(body.expires_in ?? 3_600)) * 1_000,
    };
    return body.access_token;
  };
}

async function main(): Promise<void> {
  const redisUrl = required("REDIS_URL");
  const sheetId = required("DATA_INGESTION_V2_SHEET_ID");
  const credential = JSON.parse(
    secretOrEnvironment("GOOGLE_SHEETS_CREDENTIAL", "GOOGLE_SHEETS_CREDENTIAL_FILE"),
  ) as { email?: unknown; privateKey?: unknown };
  if (typeof credential.email !== "string" || typeof credential.privateKey !== "string") {
    throw new Error("GOOGLE_SHEETS_CREDENTIAL_INVALID");
  }

  const shardCount = boundedInt("INGEST_SHARD_COUNT", 1, 1, 32);
  const shardIndex = Math.min(shardCount - 1, boundedInt("INGEST_SHARD_INDEX", 0, 0, 31));
  const batchSize = boundedInt("INGEST_POINT_BATCH_SIZE", 50, 1, 50);
  const intervalMs = boundedInt("P23C_INTERVAL_MS", 86_400_000, 60_000, 86_400_000);
  const dryRun = process.env.P23C_DRY_RUN !== "false";
  const sheetsAckEnabled = process.env.P23C_SHEETS_ACK_ENABLED === "true";

  const feedUrl = process.env.LANA_PRODUCT_FEED_URL?.trim()
    || "https://www.lanadesign.vn/partner_feeds/danh-muc-lanadesign-vn.xml";

  const redis = createClient({ url: redisUrl });
  redis.on("error", (error) => log("error", { err: String(error) }, "redis client error"));
  await redis.connect();

  const vertexToken = createTokenProvider(
    credential.email,
    credential.privateKey,
    "https://www.googleapis.com/auth/cloud-platform",
  );

  const workerId = process.env.P23C_RUN_ID?.trim() || `p23c-app-shard${shardIndex}`;
  const reporter = createBatchStatusReporter(
    "P23C_QDRANT_PUBLISHER",
    workerId,
    dryRun ? "DRY_RUN" : "PUBLISH",
    {
      info: (context, message) => log("info", context, message),
      error: (context, message) => log("error", context, message),
    },
  );

  const publisher = new P23cPublisher({
    redis,
    sheets: new GoogleSheetsClient({
      serviceAccount: { email: credential.email, privateKey: credential.privateKey },
    }),
    feed: {
      fetchFeed: async (): Promise<string> => {
        const response = await fetch(feedUrl, { signal: AbortSignal.timeout(45_000) });
        if (!response.ok) throw new Error(`FEED_HTTP_${response.status}`);
        return response.text();
      },
    },
    xmlParser: new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true,
      isArray: () => false,
      processEntities: true,
    }),
    qdrant: new HttpQdrantClient({
      baseUrl: required("QDRANT_BASE_URL"),
      collection: process.env.QDRANT_COLLECTION_INGEST_V2?.trim() || "lana_multimodal_data_v2",
      apiKey: secretOrEnvironment("QDRANT_API_KEY", "QDRANT_API_KEY_FILE"),
    }),
    images: new FfmpegImagePipeline({
      maxBytes: boundedInt("INGEST_IMAGE_MAX_BYTES", 12_582_912, 1_048_576, 33_554_432),
      maxWidth: boundedInt("INGEST_IMAGE_MAX_WIDTH", 800, 64, 4_096),
      rembgUrl: required("REMBG_URL"),
      rembgModel: process.env.REMBG_MODEL?.trim() || "u2netp",
      rembgAuthHeader: optionalSecret("REMBG_AUTH_HEADER", "REMBG_AUTH_HEADER_FILE"),
    }),
    embeddings: new VertexEmbeddingClient({
      projectId: required("VERTEX_PROJECT_ID"),
      location: process.env.VERTEX_EMBEDDING_LOCATION?.trim() || "us-central1",
      model: process.env.VERTEX_EMBEDDING_MODEL?.trim() || "multimodalembedding@001",
      token: vertexToken,
    }),
    vertexRateLimiter: new RedisVertexRateLimiter(
      redis,
      process.env.VERTEX_RATE_LIMIT_KEY?.trim() || "rate:vertex:multimodalembedding:global",
      boundedInt("VERTEX_MIN_INTERVAL_MS", 4_000, 1_000, 30_000),
    ),
    sheetId,
    shardCount,
    shardIndex,
    batchSize,
    catalogBuildVersion: process.env.CATALOG_BUILD_VERSION?.trim() || "catalog-v2",
    dryRun,
    sheetsAckEnabled,
    runId: workerId,
    logger: {
      info: (context, message) => log("info", context, message),
      error: (context, message) => log("error", context, message),
    },
  });

  let stopping = false;
  let running = false;
  await reporter.heartbeat("STARTING");

  const runOnce = async (): Promise<void> => {
    if (running || stopping) return;
    running = true;
    const startedAt = Date.now();
    await reporter.heartbeat("RUNNING");
    try {
      const summary = await publisher.run();
      log(summary.status === "FATAL" ? "error" : "info", { summary }, "p23c cycle finished");
      await reporter.heartbeat(summary.status === "FATAL" ? "ERROR" : "IDLE", {
        runMs: Date.now() - startedAt,
        ...(summary.fatal_error ? { errorCode: summary.fatal_error } : {}),
        stats: {
          run_status: summary.status,
          total: summary.total,
          success: summary.success,
          skipped: summary.skipped,
          deleted: summary.deleted,
          failed: summary.failed,
          remaining: summary.remaining,
          held_row_count: summary.held_row_count,
          qdrant_point_count: summary.qdrant_existing_point_count,
        },
      });
      if (summary.status === "OK" || summary.status === "NO_PENDING_WORK") {
        await reporter.snapshot({
          snapshotKey: "QDRANT_COLLECTION",
          source: "Qdrant (bộ nhớ tìm kiếm ảnh)",
          status: summary.failed > 0 ? "WARNING" : "OK",
          recordCount: summary.qdrant_existing_point_count,
          detail: summary.held_row_count > 0
            ? `${summary.held_row_count} dòng chờ duyệt trước khi lên Qdrant`
            : "Không còn dòng nào chờ duyệt",
          metrics: {
            success: summary.success,
            skipped: summary.skipped,
            deleted: summary.deleted,
            failed: summary.failed,
            remaining: summary.remaining,
            held_row_count: summary.held_row_count,
            dry_run: dryRun,
          },
          observedAt: new Date(summary.finished_at),
        });
      } else if (summary.status === "FATAL") {
        await reporter.snapshot({
          snapshotKey: "QDRANT_COLLECTION",
          source: "Qdrant (bộ nhớ tìm kiếm ảnh)",
          status: "ERROR",
          detail: summary.fatal_error?.slice(0, 200) ?? "Chu kỳ xuất bản thất bại",
        });
      }
    } catch (error) {
      log("error", { err: String(error) }, "p23c cycle crashed");
      await reporter.heartbeat("ERROR", {
        runMs: Date.now() - startedAt,
        errorCode: String(error).slice(0, 128),
      });
    } finally {
      running = false;
    }
  };

  if (process.env.P23C_RUN_ONCE === "true") {
    await runOnce();
    await reporter.close();
    if (redis.isOpen) await redis.quit();
    return;
  }

  const interval = setInterval(() => {
    void runOnce();
  }, intervalMs);

  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    log("info", { signal }, "shutting down");
    clearInterval(interval);
    const waitStart = Date.now();
    while (running && Date.now() - waitStart < 25_000) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await reporter.heartbeat("STOPPING");
    await reporter.close();
    if (redis.isOpen) await redis.quit().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  log("info", {
    shard: `${shardIndex + 1}/${shardCount}`,
    batchSize,
    intervalMs,
    dryRun,
    sheetsAckEnabled,
    statusReporting: reporter.enabled,
  }, "p23c publisher started");

  await runOnce();
}

main().catch((error) => {
  log("error", { err: String(error) }, "p23c publisher failed to start");
  process.exit(1);
});
