import { readFileSync } from "node:fs";
import { PostgresShadowEvaluationStore } from "@lana/database";
import { assertPhase1EnvironmentSendDisabled } from "./index.js";
import { Phase4ShadowRunner } from "./shadow-runner.js";
import { VertexShadowModel, type VertexServiceAccount } from "./vertex.js";
import { RedisBusinessFactsReader } from "./redis-business-facts.js";
import { ProductSearchService, QdrantStableCatalogSearchAdapter } from "@lana/business-tools";

interface N8nVertexCredential {
  email?: unknown;
  privateKey?: unknown;
  region?: unknown;
}

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

function boundedInteger(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name}_INVALID`);
  }
  return value;
}

function boundedNumber(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name}_INVALID`);
  }
  return value;
}

function judgeMode(): "DRY_RUN" | "LIVE" {
  const value = (process.env.REALTIME_JUDGE_MODE ?? "DRY_RUN").trim().toUpperCase();
  if (value !== "DRY_RUN" && value !== "LIVE") {
    throw new Error("REALTIME_JUDGE_MODE_INVALID");
  }
  return value;
}

function readCredential(path: string): { serviceAccount: VertexServiceAccount; region: string } {
  const value = JSON.parse(readFileSync(path, "utf8")) as N8nVertexCredential;
  if (typeof value.email !== "string" || typeof value.privateKey !== "string") {
    throw new Error("VERTEX_CREDENTIAL_INVALID");
  }
  return {
    serviceAccount: { email: value.email, privateKey: value.privateKey },
    region: typeof value.region === "string" && value.region.trim()
      ? value.region.trim().replace(/^=+/u, "").toLowerCase()
      : "us-central1",
  };
}

assertPhase1EnvironmentSendDisabled(process.env);
if ((process.env.APP_SEND_ENABLED ?? "false").toLowerCase() !== "false") {
  throw new Error("PHASE4_LIVE_SEND_FORBIDDEN");
}

const databaseUrl = secretOrEnvironment("SHADOW_DATABASE_URL", "SHADOW_DATABASE_URL_FILE");
const projectId = required("VERTEX_PROJECT_ID");
const modelName = required("VERTEX_MODEL_NAME");
const credential = readCredential(required("VERTEX_CREDENTIAL_FILE"));
const store = new PostgresShadowEvaluationStore(databaseUrl, {
  minimumSourceAgeSeconds: boundedInteger("SHADOW_MIN_SOURCE_AGE_SECONDS", 30, 10, 900),
  dailyGenerationLimit: boundedInteger("SHADOW_DAILY_GENERATION_LIMIT", 50, 1, 10_000),
  hourlyGenerationLimit: boundedInteger("SHADOW_HOURLY_GENERATION_LIMIT", 10, 1, 1_000),
});
const model = new VertexShadowModel({
  projectId,
  location: process.env.VERTEX_LOCATION?.trim() || credential.region,
  modelName,
  serviceAccount: credential.serviceAccount,
  timeoutMs: boundedInteger("VERTEX_TIMEOUT_MS", 30_000, 5_000, 120_000),
  embeddingLocation: process.env.VERTEX_EMBEDDING_LOCATION?.trim() || "us-central1",
  embeddingModel: process.env.VERTEX_EMBEDDING_MODEL?.trim() || "multimodalembedding@001",
  embeddingDimension: boundedInteger("VERTEX_EMBEDDING_DIMENSION", 1_408, 128, 1_408),
  maxImageBytes: boundedInteger("PRODUCT_SEARCH_MAX_IMAGE_BYTES", 10 * 1024 * 1024, 64 * 1024, 20 * 1024 * 1024),
  allowedImageHostSuffixes: (process.env.PRODUCT_SEARCH_ALLOWED_IMAGE_HOSTS ?? "lanadesign.vn,content.pancake.vn")
    .split(",").map((value) => value.trim()).filter(Boolean),
});
const productSearch = new ProductSearchService(
  new QdrantStableCatalogSearchAdapter({
    baseUrl: required("QDRANT_BASE_URL"),
    apiKey: secretOrEnvironment("QDRANT_API_KEY", "QDRANT_API_KEY_FILE"),
    collection: required("QDRANT_COLLECTION"),
    embedding: model,
    expectedDimension: boundedInteger("VERTEX_EMBEDDING_DIMENSION", 1_408, 128, 1_408),
    timeoutMs: boundedInteger("QDRANT_TIMEOUT_MS", 15_000, 1_000, 60_000),
  }),
  {
    textMinScore: boundedNumber("PRODUCT_SEARCH_TEXT_MIN_SCORE", 0.72, 0, 1),
    imageMinScore: boundedNumber("PRODUCT_SEARCH_IMAGE_MIN_SCORE", 0.78, 0, 1),
    minTopGap: boundedNumber("PRODUCT_SEARCH_MIN_TOP_GAP", 0.04, 0, 1),
    maxCandidates: boundedInteger("PRODUCT_SEARCH_MAX_CANDIDATES", 3, 1, 3),
  },
);
const businessFactsReader = new RedisBusinessFactsReader(
  required("REDIS_URL"),
  boundedInteger("BUSINESS_FACT_MAX_AGE_SECONDS", 1_200, 60, 86_400),
);
if (!await businessFactsReader.ready()) throw new Error("BUSINESS_FACT_REDIS_NOT_READY");
const runner = new Phase4ShadowRunner(
  store,
  model,
  {
    modelName,
    maxAttempts: 3,
    shopAlias: process.env.CATALOG_DEFAULT_SHOP_ALIAS?.trim() || "LANA",
    groundedDraftEnabled:
      (process.env.REALTIME_GROUNDED_DRAFT_V1 ?? "false").toLowerCase() === "true",
    verifiedFactAssemblerEnabled:
      (process.env.REALTIME_VERIFIED_FACT_ASSEMBLER_V1 ?? "false").toLowerCase() === "true",
    judgeV2Enabled:
      (process.env.REALTIME_JUDGE_V2_ENABLED ?? "false").toLowerCase() === "true",
    judgeV2SampleRate: boundedNumber(
      "REALTIME_JUDGE_LIVE_SAMPLE_RATE",
      0.1,
      0,
      1,
    ),
    judgeMode: judgeMode(),
  },
  businessFactsReader,
  productSearch,
);
const pollMs = boundedInteger("SHADOW_POLL_MS", 5_000, 1_000, 60_000);
const workerId = process.env.SHADOW_WORKER_ID?.trim() || "phase4-shadow-worker-1";
let stopping = false;

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => { stopping = true; });
}

await store.heartbeat(workerId, modelName, "STARTING");
while (!stopping) {
  try {
    await store.heartbeat(workerId, modelName, "PROCESSING");
    const compared = await runner.processComparisonOne();
    const generated = compared ? false : await runner.processOne();
    await store.heartbeat(workerId, modelName, "IDLE");
    if (!compared && !generated) await new Promise((resolve) => setTimeout(resolve, pollMs));
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 128) : "SHADOW_WORKER_LOOP_FAILED";
    await store.heartbeat(workerId, modelName, "ERROR", code).catch(() => undefined);
    process.stderr.write(`${JSON.stringify({ level: "error", code, workerId })}\n`);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
await store.heartbeat(workerId, modelName, "STOPPING").catch(() => undefined);
await store.close();
await businessFactsReader.close();
