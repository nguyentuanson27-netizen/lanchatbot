import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "redis";
import { createBatchStatusReporter } from "./batch-status-reporter.js";
import { GoogleSheetsClient } from "./google-sheets-client.js";
import { VertexImageClassifier } from "./p23b-metadata-staging.js";
import { P23bMetadataStaging } from "./p23b-runner.js";
import { FfmpegImagePipeline, RedisVertexRateLimiter } from "./p23c-publisher.js";

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
    service: "p23b-metadata-staging",
    ...context,
    msg: message,
  })}\n`);
}

function createTokenProvider(email: string, privateKey: string): () => Promise<string> {
  let cached: { value: string; expiresAt: number } | null = null;
  return async (): Promise<string> => {
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.value;
    const issuedAt = Math.floor(Date.now() / 1_000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3_600,
    })).toString("base64url");
    const unsigned = `${header}.${payload}`;
    const signature = createSign("RSA-SHA256").update(unsigned).end()
      .sign(privateKey.trim().replace(/^=+/u, "").replace(/\\n/gu, "\n"), "base64url");
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
  const intervalMs = boundedInt("P23B_INTERVAL_MS", 86_400_000, 60_000, 86_400_000);
  const errorRetryMs = boundedInt("P23B_ERROR_RETRY_MS", 300_000, 60_000, 3_600_000);
  const writeEnabled = process.env.P23B_WRITE_ENABLED === "true";
  // Mặc định chỉ phân tích ảnh chưa có nhãn: giữ nguyên phê duyệt và vector Qdrant hiện có.
  const onlyNewImages = process.env.P23B_ONLY_NEW_IMAGES !== "false";
  // Vét nhiều lô liên tiếp cho tới khi hết việc, thay vì mỗi ngày một lô nhỏ.
  const drainEnabled = process.env.P23B_DRAIN_ENABLED !== "false";
  // Mặc định giữ phê duyệt cũ khi bản nháp AI không đổi; đặt "false" để quay về hành vi n8n.
  const staleOnlyWhenDraftChanges = process.env.P23B_STALE_ONLY_ON_DRAFT_CHANGE !== "false";
  const feedUrl = process.env.LANA_PRODUCT_FEED_URL?.trim()
    || "https://www.lanadesign.vn/partner_feeds/danh-muc-lanadesign-vn.xml";

  const redis = createClient({ url: redisUrl });
  redis.on("error", (error) => log("error", { err: String(error) }, "redis client error"));
  await redis.connect();

  const schema = {
    version: process.env.IMAGE_METADATA_VERSION?.trim() || "image-meta-v1.0.0",
    model: process.env.IMAGE_METADATA_MODEL?.trim() || "gemini-3.1-flash-lite",
    location: process.env.IMAGE_METADATA_LOCATION?.trim() || "global",
  };

  const workerId = process.env.P23B_RUN_ID?.trim() || `p23b-app-shard${shardIndex}`;
  const reporter = createBatchStatusReporter(
    "P23B_METADATA_STAGING",
    workerId,
    writeEnabled ? (onlyNewImages ? "WRITE_NEW_ONLY" : "WRITE_ALL") : "DRY_RUN",
    {
      info: (context, message) => log("info", context, message),
      error: (context, message) => log("error", context, message),
    },
  );

  const runner = new P23bMetadataStaging({
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
    images: new FfmpegImagePipeline({
      maxBytes: boundedInt("INGEST_IMAGE_MAX_BYTES", 12_582_912, 1_048_576, 33_554_432),
      maxWidth: boundedInt("INGEST_IMAGE_MAX_WIDTH", 800, 64, 4_096),
      // P2.3B không tách nền; chỉ dùng nhánh tải + resize của pipeline.
      rembgUrl: "http://127.0.0.1:0/unused",
      rembgAuthHeader: optionalSecret("REMBG_AUTH_HEADER", "REMBG_AUTH_HEADER_FILE"),
    }),
    classifier: new VertexImageClassifier({
      projectId: required("VERTEX_PROJECT_ID"),
      location: schema.location,
      model: schema.model,
      token: createTokenProvider(credential.email, credential.privateKey),
    }),
    rateLimiter: new RedisVertexRateLimiter(
      redis,
      process.env.VERTEX_METADATA_RATE_LIMIT_KEY?.trim() || "rate:vertex:gemini-image-metadata:global",
      boundedInt("VERTEX_METADATA_MIN_INTERVAL_MS", 4_000, 1_000, 30_000),
    ),
    sheetId,
    schema,
    shardCount,
    shardIndex,
    batchSize: boundedInt("IMAGE_METADATA_BATCH_SIZE", 50, 1, 500),
    // 0 = tắt recheck định kỳ; SOURCE_HASH vẫn bắt được mọi thay đổi thật của ảnh/ngữ cảnh.
    recheckDays: boundedInt("IMAGE_METADATA_RECHECK_DAYS", 0, 0, 3_650),
    onlyNewImages,
    drainEnabled,
    maxRounds: boundedInt("P23B_MAX_ROUNDS", 40, 1, 200),
    maxRunMs: boundedInt("P23B_MAX_RUN_MS", 7_200_000, 60_000, 43_200_000),
    concurrency: boundedInt("P23B_CONCURRENCY", 3, 1, 10),
    flushEvery: boundedInt("P23B_FLUSH_EVERY", 5, 1, 50),
    writeEnabled,
    staleOnlyWhenDraftChanges,
    runId: workerId,
    logger: {
      info: (context, message) => log("info", context, message),
      error: (context, message) => log("error", context, message),
    },
  });

  let stopping = false;
  let running = false;
  let nextRun: ReturnType<typeof setTimeout> | null = null;
  await reporter.heartbeat("STARTING");

  const runOnce = async (): Promise<boolean> => {
    if (running || stopping) return false;
    running = true;
    let succeeded = false;
    const startedAt = Date.now();
    await reporter.heartbeat("RUNNING");
    try {
      const summary = await runner.run();
      log(summary.status === "FATAL" ? "error" : "info", { summary }, "p23b cycle finished");
      await reporter.heartbeat(summary.status === "FATAL" ? "ERROR" : "IDLE", {
        runMs: Date.now() - startedAt,
        ...(summary.fatal_error ? { errorCode: summary.fatal_error } : {}),
        stats: {
          run_status: summary.status,
          staged: summary.staged,
          failed: summary.failed,
          skipped: summary.skipped,
          remaining: summary.remaining,
          new_appended: summary.new_appended,
          existing_updated: summary.existing_updated,
          marked_stale: summary.marked_stale,
          rounds: summary.rounds,
          stopped_because: summary.stopped_because,
          sheet_write: summary.sheet_write,
        },
      });
      if (summary.status === "OK" || summary.status === "NO_PENDING_WORK") {
        succeeded = true;
        await reporter.snapshot({
          snapshotKey: "IMAGE_REGISTRY",
          source: "image_registry (Google Sheets)",
          status: summary.failed > 0 ? "WARNING" : "OK",
          recordCount: summary.image_registry_rows,
          detail: summary.remaining > 0
            ? `Còn ${summary.remaining} ảnh chờ gắn nhãn`
            : "Đã gắn nhãn xong toàn bộ ảnh",
          metrics: {
            staged: summary.staged,
            failed: summary.failed,
            remaining: summary.remaining,
            new_appended: summary.new_appended,
            marked_stale: summary.marked_stale,
            only_new_images: onlyNewImages,
          },
          observedAt: new Date(summary.finished_at),
        });
      } else if (summary.status === "FATAL") {
        await reporter.snapshot({
          snapshotKey: "IMAGE_REGISTRY",
          source: "image_registry (Google Sheets)",
          status: "ERROR",
          detail: summary.fatal_error?.slice(0, 200) ?? "Chu kỳ gắn nhãn thất bại",
        });
      }
    } catch (error) {
      log("error", { err: String(error) }, "p23b cycle crashed");
      await reporter.heartbeat("ERROR", {
        runMs: Date.now() - startedAt,
        errorCode: String(error).slice(0, 128),
      });
    } finally {
      running = false;
    }
    return succeeded;
  };

  if (process.env.P23B_RUN_ONCE === "true") {
    await runOnce();
    await reporter.close();
    if (redis.isOpen) await redis.quit();
    return;
  }

  const scheduleNext = (delayMs: number): void => {
    if (stopping) return;
    if (nextRun) clearTimeout(nextRun);
    nextRun = setTimeout(() => {
      void runOnce().then((succeeded) => {
        scheduleNext(succeeded ? intervalMs : errorRetryMs);
      });
    }, delayMs);
  };

  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    log("info", { signal }, "shutting down");
    if (nextRun) clearTimeout(nextRun);
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
    batchSize: boundedInt("IMAGE_METADATA_BATCH_SIZE", 50, 1, 500),
    concurrency: boundedInt("P23B_CONCURRENCY", 3, 1, 10),
    recheckDays: boundedInt("IMAGE_METADATA_RECHECK_DAYS", 0, 0, 3_650),
    onlyNewImages,
    drainEnabled,
    maxRounds: boundedInt("P23B_MAX_ROUNDS", 40, 1, 200),
    intervalMs,
    errorRetryMs,
    writeEnabled,
    staleOnlyWhenDraftChanges,
    statusReporting: reporter.enabled,
    schema,
  }, "p23b metadata staging started");

  const initialSucceeded = await runOnce();
  scheduleNext(initialSucceeded ? intervalMs : errorRetryMs);
}

main().catch((error) => {
  log("error", { err: String(error) }, "p23b metadata staging failed to start");
  process.exit(1);
});
