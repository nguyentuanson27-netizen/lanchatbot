/**
 * Runtime entry point for the V2 catalog recognition publisher (Task 6.1).
 *
 * This is a dedicated process next to `p23c-server.ts`. It shares the upstream
 * catalog/Human-Gate source with P2.3C but publishes only the V2 `image_cutout`
 * vector into the dedicated recognition collection, under its own lock/progress
 * namespace. It never writes the legacy Sheets publication columns.
 *
 * Starting this process performs no collection provisioning and no cutover; the
 * collection must already exist with the locked schema or the run fails closed.
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "redis";
import { QdrantImageRecognitionAdapter } from "@lana/business-tools";
import { GoogleSheetsClient } from "./google-sheets-client.js";
import {
  buildApprovedQdrantJobs,
  buildRegistryMap,
  collectImageRegistryRows,
  type QdrantJob,
} from "./p23c-jobs.js";
import {
  buildXmlProfiles,
  groupXmlItems,
  normalizeStructuredExtraction,
} from "./p23c-profiles.js";
import { GeminiEmbedding2Client } from "./gemini-embedding-2-client.js";
import {
  MediaRecognitionV2ImagePipeline,
  MediaRecognitionV2Preparer,
  SecureRecognitionImageDownloader,
} from "./media-recognition-v2-image-pipeline.js";
import { resolveMediaRecognitionV2Config } from "./media-recognition-v2-config.js";
import {
  P23cRecognitionPublisher,
  type RecognitionRunStatePort,
} from "./p23c-recognition-publisher.js";

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

function log(
  level: "info" | "error",
  context: Record<string, unknown>,
  message: string,
): void {
  process.stdout.write(`${JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: "p23c-recognition-publisher",
    ...context,
    msg: message,
  })}\n`);
}

function sheetRowsFromValues(values: unknown): Record<string, unknown>[] {
  const matrix = Array.isArray(values) ? (values as unknown[][]) : [];
  if (!matrix.length) return [];
  const headers = ((matrix[0] ?? []) as unknown[]).map((cell) => String(cell ?? "").trim());
  return matrix
    .slice(1)
    .map((row, index) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, position) => {
        if (header) record[header] = (row ?? [])[position] ?? "";
      });
      record.row_number = index + 2;
      return record;
    })
    .filter((record) =>
      Object.entries(record).some(
        ([key, value]) => key !== "row_number" && String(value ?? "").trim() !== "",
      ));
}

async function main(): Promise<void> {
  const config = resolveMediaRecognitionV2Config(process.env);
  const redisUrl = required("REDIS_URL");
  const sheetId = required("DATA_INGESTION_V2_SHEET_ID");
  const credential = JSON.parse(
    secretOrEnvironment("GOOGLE_SHEETS_CREDENTIAL", "GOOGLE_SHEETS_CREDENTIAL_FILE"),
  ) as { email?: unknown; privateKey?: unknown };
  if (typeof credential.email !== "string" || typeof credential.privateKey !== "string") {
    throw new Error("GOOGLE_SHEETS_CREDENTIAL_INVALID");
  }
  void createSign;

  const shardCount = boundedInt("INGEST_SHARD_COUNT", 1, 1, 32);
  const shardIndex = Math.min(shardCount - 1, boundedInt("INGEST_SHARD_INDEX", 0, 0, 31));
  const batchSize = boundedInt("INGEST_POINT_BATCH_SIZE", 50, 1, 500);
  const dryRun = process.env.MEDIA_RECOGNITION_V2_DRY_RUN !== "false";
  const runId = process.env.MEDIA_RECOGNITION_V2_RUN_ID?.trim()
    || `p23c-recognition-shard${shardIndex}`;
  const feedUrl = process.env.LANA_PRODUCT_FEED_URL?.trim()
    || "https://www.lanadesign.vn/partner_feeds/danh-muc-lanadesign-vn.xml";
  const allowedHostSuffixes = (process.env.MEDIA_ALLOWED_HOST_SUFFIXES ?? "lanadesign.vn")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const redis = createClient({ url: redisUrl });
  redis.on("error", (error) => log("error", { err: String(error) }, "redis client error"));
  await redis.connect();

  const runState: RecognitionRunStatePort = {
    acquireLock: async (key, token, ttlMs) =>
      (await redis.set(key, token, { NX: true, PX: ttlMs })) === "OK",
    releaseLock: async (key, token) => {
      try {
        const result = await redis.eval(
          "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1])"
          + " else return 0 end",
          { keys: [key], arguments: [token] },
        );
        return Number(result) === 1;
      } catch {
        return false;
      }
    },
    writeProgress: async (key, value, ttlSeconds) => {
      await redis.set(key, value, { EX: ttlSeconds });
    },
  };

  const sheets = new GoogleSheetsClient({
    serviceAccount: { email: credential.email, privateKey: credential.privateKey },
  });
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: () => false,
    processEntities: true,
  });

  const publisher = new P23cRecognitionPublisher({
    config,
    source: {
      loadJobs: async (signal): Promise<readonly QdrantJob[]> => {
        const [xml, ranges] = await Promise.all([
          (async (): Promise<string> => {
            const response = await fetch(feedUrl, { signal });
            if (!response.ok) throw new Error(`FEED_HTTP_${response.status}`);
            return response.text();
          })(),
          sheets.batchGetValues(
            sheetId,
            ["product_registry!A:AZ", "image_registry!A:AP"],
            "UNFORMATTED_VALUE",
          ),
        ]);
        const registry = buildRegistryMap(sheetRowsFromValues(ranges[0]?.values));
        const parsed = xmlParser.parse(xml) as Record<string, unknown>;
        const channel = ((parsed.rss as Record<string, unknown>)?.channel
          ?? parsed.channel ?? {}) as Record<string, unknown>;
        const rawItems = channel.item;
        const channelItems = rawItems === null || rawItems === undefined
          ? []
          : (Array.isArray(rawItems) ? rawItems : [rawItems]) as Record<string, unknown>[];
        const profiles = normalizeStructuredExtraction(
          buildXmlProfiles(
            registry.registry,
            groupXmlItems(channelItems),
            new Date().toISOString(),
          ),
        );
        return buildApprovedQdrantJobs(
          profiles,
          collectImageRegistryRows(sheetRowsFromValues(ranges[1]?.values)),
          {
            run_id: runId,
            started_at: new Date().toISOString(),
            shard_count: shardCount,
            shard_index: shardIndex,
            shard_label: `${shardIndex + 1}/${shardCount}`,
          },
        );
      },
    },
    target: new QdrantImageRecognitionAdapter({
      baseUrl: required("QDRANT_BASE_URL"),
      apiKey: secretOrEnvironment("QDRANT_API_KEY", "QDRANT_API_KEY_FILE"),
      collection: config.recognitionCollection,
      timeoutMs: boundedInt("MEDIA_RECOGNITION_V2_QDRANT_TIMEOUT_MS", 30_000, 1_000, 60_000),
    }),
    images: new MediaRecognitionV2Preparer(
      new SecureRecognitionImageDownloader({
        allowedHostSuffixes,
        maxBytes: boundedInt("INGEST_IMAGE_MAX_BYTES", 12_582_912, 1_048_576, 33_554_432),
        timeoutMs: boundedInt("INGEST_IMAGE_TIMEOUT_MS", 30_000, 1_000, 60_000),
      }),
      new MediaRecognitionV2ImagePipeline({
        rembgUrl: required("REMBG_URL"),
        rembgModel: config.rembgModel,
        rembgAuthHeader: optionalSecret("REMBG_AUTH_HEADER", "REMBG_AUTH_HEADER_FILE"),
        maxBytes: boundedInt("INGEST_IMAGE_MAX_BYTES", 12_582_912, 1_048_576, 33_554_432),
        prepareTimeoutMs: boundedInt("INGEST_IMAGE_PREPARE_TIMEOUT_MS", 45_000, 1_000, 120_000),
        rembgTimeoutMs: boundedInt("INGEST_REMBG_TIMEOUT_MS", 60_000, 1_000, 180_000),
      }),
    ),
    embeddings: new GeminiEmbedding2Client({
      projectId: required("VERTEX_PROJECT_ID"),
      serviceAccount: {
        email: credential.email,
        privateKey: credential.privateKey,
      },
      timeoutMs: boundedInt("MEDIA_RECOGNITION_V2_EMBED_TIMEOUT_MS", 30_000, 1_000, 60_000),
    }),
    runState,
    shardCount,
    shardIndex,
    batchSize,
    runId,
    dryRun,
    pointTimeoutMs: boundedInt("MEDIA_RECOGNITION_V2_POINT_TIMEOUT_MS", 180_000, 5_000, 600_000),
    logger: {
      info: (context, message) => log("info", context, message),
      error: (context, message) => log("error", context, message),
    },
  });

  const summary = await publisher.run();
  log(summary.status === "FATAL" ? "error" : "info", { summary }, "recognition cycle finished");
  if (redis.isOpen) await redis.quit().catch(() => undefined);
  if (summary.status === "FATAL") process.exit(1);
}

main().catch((error) => {
  log("error", { err: String(error) }, "recognition publisher failed to start");
  process.exit(1);
});
