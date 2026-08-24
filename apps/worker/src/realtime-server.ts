import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  ProductSearchService,
  QdrantStableCatalogSearchAdapter,
} from "@lana/business-tools";
import {
  LocalEnvelopeCipher,
  PostgresChatHistoryStore,
  createDf13CommerceFenceRuntimePort,
  PostgresRealtimeInboxStore,
  PostgresRealtimeRuntimeStore,
  PostgresRuntimeBehaviorModeStore,
  PostgresRuntimePolicyStore,
} from "@lana/database";
import {
  RuntimePolicyResolver,
  type RuntimePolicyAuditPort,
  type RuntimePolicyChannel,
  type RuntimePolicyPinPort,
} from "@lana/chat-runtime";
import {
  FetchPancakeHttpTransport,
  InMemoryPancakePageRegistry,
  PancakeAllowListedClient,
  PancakeHandoffAdapter,
} from "@lana/pancake-handoff";
import {
  DryRunClearTagObservationProvider,
  FailClosedTagObservationProvider,
  PancakeRealtimeTagObservationProvider,
  RealtimeRunner as Bf01Bf02RealtimeRunner,
} from "./bf02-realtime-runner.js";
import { runRealtimeLoop } from "./realtime-loop.js";
import { RedisRealtimeGenerationQuota } from "./realtime-quota.js";
import { RedisChatHistoryStore } from "./redis-chat-history.js";
import { RedisBusinessFactsReader } from "./redis-business-facts.js";
import { RedisCachedProductSearch } from "./redis-product-search-cache.js";
import {
  FfmpegVideoFrameExtractor,
  HttpVideoFrameExtractorClient,
} from "./video-frame-extractor.js";
import {
  VertexShadowModel,
  type VertexServiceAccount,
} from "./vertex.js";
import { baselineModelCapability } from "./vertex-baseline.js";
import {
  PostgresDf13CommerceFenceBoundCommitter,
  PostgresDf13CommerceFenceProvider,
} from "./df13-commerce-fence-postgres-provider.js";
import { Df13CommerceRuntimeExecutor } from "./df13-commerce-runtime-executor.js";
import { createDf13CommerceRuntimeComposition } from "./df13-commerce-runtime-composition.js";
import {
  createDf13CommercePreprodStartupAuthority,
  parseDf13CommercePreprodStartupInput,
} from "./df13-commerce-preprod-startup-authority.js";
import { selectDf13RuntimeAuthority } from "./df13-runtime-authority-boundary.js";

import {
  RedisRealtimeMediaRecognitionCache,
  RealtimeImageProcessor,
  RealtimeMediaRecognitionService,
} from "./realtime-media-recognition.js";
import { VertexMediaReranker } from "./vertex-media-reranker.js";

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

function optionalSecretOrEnvironment(
  directName: string,
  fileName: string,
): string {
  const direct = process.env[directName]?.trim();
  if (direct) return direct;
  const path = process.env[fileName]?.trim();
  return path ? readFileSync(path, "utf8").trim() : "";
}

function boundedInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name}_INVALID`);
  }
  return value;
}

function boundedNumber(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name}_INVALID`);
  }
  return value;
}

function readCredential(path: string): {
  serviceAccount: VertexServiceAccount;
  region: string;
} {
  const value = JSON.parse(
    readFileSync(path, "utf8"),
  ) as N8nVertexCredential;
  if (
    typeof value.email !== "string" ||
    typeof value.privateKey !== "string"
  ) {
    throw new Error("VERTEX_CREDENTIAL_INVALID");
  }
  return {
    serviceAccount: {
      email: value.email,
      privateKey: value.privateKey,
    },
    region:
      typeof value.region === "string" && value.region.trim()
        ? value.region.trim().replace(/^=+/u, "").toLowerCase()
        : "us-central1",
  };
}

const mode =
  process.env.REALTIME_MODE?.trim().toUpperCase() === "LIVE"
    ? "LIVE"
    : "DRY_RUN";
const sendEnabled =
  (process.env.APP_SEND_ENABLED ?? "false").trim().toLowerCase() === "true";
const adAcquisitionModeRaw =
  process.env.AD_ACQUISITION_ANALYTICS_MODE?.trim().toUpperCase() || "OFF";
if (!["OFF", "SHADOW", "LIVE"].includes(adAcquisitionModeRaw)) {
  throw new Error("AD_ACQUISITION_ANALYTICS_MODE_INVALID");
}
const adAcquisitionMode = adAcquisitionModeRaw as "OFF" | "SHADOW" | "LIVE";
if ((process.env.AD_ACQUISITION_WAVE2_INPUT_ENABLED ?? "false").trim().toLowerCase() === "true") {
  throw new Error("AD_ACQUISITION_WAVE2_INPUT_NOT_IMPLEMENTED");
}
const adAcquisitionPageIds = (process.env.AD_ACQUISITION_PAGE_ALLOWLIST ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const adAcquisitionDerivationVersion =
  process.env.AD_ACQUISITION_DERIVATION_VERSION?.trim() || "ad-acquisition-v1";
const adAcquisitionWindowHours = boundedInteger(
  "AD_ACQUISITION_WINDOW_HOURS",
  168,
  1,
  24 * 30,
);
if (mode === "DRY_RUN" && sendEnabled) {
  throw new Error("REALTIME_DRY_RUN_SEND_FORBIDDEN");
}
if (sendEnabled && process.env.CHATBOT_SEND_ENABLED !== "true") {
  throw new Error("REALTIME_DUAL_SEND_GATE_REQUIRED");
}

const databaseUrl = secretOrEnvironment(
  "DATABASE_URL",
  "REALTIME_DATABASE_URL_FILE",
);
const dataKey = secretOrEnvironment(
  "REALTIME_DATA_KEY",
  "REALTIME_DATA_KEY_FILE",
);
const cipher = new LocalEnvelopeCipher(
  dataKey,
  process.env.REALTIME_DATA_KEY_REF?.trim() || "local-kek-v1",
);
const inbox = new PostgresRealtimeInboxStore(databaseUrl, cipher);
const runtime = new PostgresRealtimeRuntimeStore(databaseUrl, cipher);
const runtimePolicyEnabled = process.env.RUNTIME_POLICY_ENABLED === "true";
const runtimePolicyChannelRaw =
  process.env.RUNTIME_POLICY_CHANNEL?.trim().toUpperCase() || "CANARY_SHADOW";
if (!["CANARY_SHADOW", "CANARY_LIVE", "PUBLISHED"].includes(runtimePolicyChannelRaw)) {
  throw new Error("RUNTIME_POLICY_CHANNEL_INVALID");
}
const runtimePolicyChannel = runtimePolicyChannelRaw as RuntimePolicyChannel;
const runtimePolicyStore = runtimePolicyEnabled
  ? new PostgresRuntimePolicyStore(databaseUrl)
  : undefined;
const runtimePolicyResolver = runtimePolicyStore
  ? new RuntimePolicyResolver(
      runtimePolicyStore,
      {
        enabled: true,
        canaryLiveEnabled: process.env.RUNTIME_POLICY_CANARY_LIVE_ENABLED === "true",
        publishedEnabled: process.env.RUNTIME_POLICY_PUBLISHED_ENABLED === "true",
        cacheTtlMs: boundedInteger("RUNTIME_POLICY_CACHE_TTL_MS", 5_000, 100, 300_000),
        lastKnownGoodTtlMs: boundedInteger(
          "RUNTIME_POLICY_LKG_TTL_MS",
          300_000,
          5_000,
          86_400_000,
        ),
      },
      runtimePolicyStore as unknown as RuntimePolicyPinPort,
      runtimePolicyStore as unknown as RuntimePolicyAuditPort,
    )
  : undefined;
const confirmationStartupModeRaw =
  process.env.REALTIME_CONFIRMATION_MODE?.trim().toUpperCase() || "LEGACY";
if (!["LEGACY", "CLARIFY_ONLY"].includes(confirmationStartupModeRaw)) {
  throw new Error("REALTIME_CONFIRMATION_MODE_INVALID");
}
const confirmationStartupMode = confirmationStartupModeRaw as "LEGACY" | "CLARIFY_ONLY";
const behaviorModeEnabled =
  process.env.REALTIME_BEHAVIOR_MODE_ENABLED === "true";
const behaviorModeDatabaseUrl = optionalSecretOrEnvironment(
  "REALTIME_BEHAVIOR_MODE_DATABASE_URL",
  "REALTIME_BEHAVIOR_MODE_DATABASE_URL_FILE",
);
const confirmationCanaryPageIds = (
  process.env.REALTIME_CONFIRMATION_CANARY_PAGE_IDS ?? required("META_PAGE_ID")
).split(",").map((value) => value.trim()).filter(Boolean);
if (behaviorModeEnabled && !behaviorModeDatabaseUrl) {
  throw new Error("REALTIME_BEHAVIOR_MODE_DATABASE_URL_REQUIRED");
}
const behaviorModeStore = behaviorModeEnabled
  ? new PostgresRuntimeBehaviorModeStore(behaviorModeDatabaseUrl!)
  : undefined;
const df13CommerceStartupMode = (
  process.env.DF13_COMMERCE_PREPROD_STARTUP_MODE ?? "LEGACY"
).trim().toUpperCase();
if (df13CommerceStartupMode !== "LEGACY" && df13CommerceStartupMode !== "COMMERCE") {
  throw new Error("DF13_COMMERCE_PREPROD_STARTUP_MODE_INVALID");
}
const df13CommerceStartupInput = df13CommerceStartupMode === "COMMERCE"
  ? (() => {
      if (!behaviorModeStore) throw new Error("DF13_COMMERCE_BEHAVIOR_MODE_REQUIRED");
      try {
        const parsed = parseDf13CommercePreprodStartupInput(JSON.parse(
          readFileSync(required("DF13_COMMERCE_PREPROD_STARTUP_FILE"), "utf8"),
        ) as unknown);
        if (parsed.mode !== "COMMERCE") {
          throw new Error("DF13_COMMERCE_STARTUP_INPUT_MODE_INVALID");
        }
        return parsed;
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("DF13_COMMERCE_")) {
          throw error;
        }
        throw new Error("DF13_COMMERCE_STARTUP_INPUT_INVALID");
      }
    })()
  : parseDf13CommercePreprodStartupInput({ mode: "LEGACY" });
const df13CommerceStartupAuthority = createDf13CommercePreprodStartupAuthority(
  df13CommerceStartupInput,
);
if (
  df13CommerceStartupInput.mode === "COMMERCE" &&
  process.env.SALES_CYCLE_ENABLED !== "true"
) {
  throw new Error("DF13_COMMERCE_SALES_CYCLE_REQUIRED");
}
if (
  df13CommerceStartupInput.mode === "COMMERCE" &&
  process.env.HISTORY_WRITE_ENABLED !== "true"
) {
  throw new Error("DF13_COMMERCE_CONTEXT_CAPTURE_REQUIRED");
}
const canonicalHistory = process.env.HISTORY_WRITE_ENABLED === "true"
  ? new PostgresChatHistoryStore(databaseUrl, {
      analyticsHashSalt: secretOrEnvironment(
        "ANALYTICS_HASH_SALT",
        "ANALYTICS_HASH_SALT_FILE",
      ),
      adAcquisition: {
        mode: adAcquisitionMode,
        pageAllowlist: adAcquisitionPageIds,
        derivationVersion: adAcquisitionDerivationVersion,
        windowHours: adAcquisitionWindowHours,
      },
    })
  : undefined;
const credential = readCredential(required("VERTEX_CREDENTIAL_FILE"));
const allowedMediaHostSuffixes = (
  process.env.PRODUCT_SEARCH_ALLOWED_IMAGE_HOSTS ??
  "lanadesign.vn,content.pancake.vn,fbcdn.net,fbsbx.com"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const vertexModel = new VertexShadowModel({
  projectId: required("VERTEX_PROJECT_ID"),
  location: process.env.VERTEX_LOCATION?.trim() || credential.region,
  modelName: required("VERTEX_MODEL_NAME"),
  serviceAccount: credential.serviceAccount,
  timeoutMs: boundedInteger(
    "VERTEX_TIMEOUT_MS",
    30_000,
    5_000,
    120_000,
  ),
  embeddingLocation:
    process.env.VERTEX_EMBEDDING_LOCATION?.trim() || "us-central1",
  embeddingModel:
    process.env.VERTEX_EMBEDDING_MODEL?.trim() || "multimodalembedding@001",
  embeddingDimension: boundedInteger(
    "VERTEX_EMBEDDING_DIMENSION",
    1_408,
    128,
    1_408,
  ),
  maxImageBytes: boundedInteger(
    "PRODUCT_SEARCH_MAX_IMAGE_BYTES",
    10 * 1024 * 1024,
    64 * 1024,
    20 * 1024 * 1024,
  ),
  allowedImageHostSuffixes: allowedMediaHostSuffixes,
  logFailure: (event) => {
    process.stderr.write(`${JSON.stringify({
      level: "error",
      component: "vertex",
      event: "VERTEX_REQUEST_FAILURE",
      ...event,
    })}\n`);
  },
});
const baseProductSearch = new ProductSearchService(
  new QdrantStableCatalogSearchAdapter({
    baseUrl: required("QDRANT_BASE_URL"),
    apiKey: secretOrEnvironment("QDRANT_API_KEY", "QDRANT_API_KEY_FILE"),
    collection: required("QDRANT_COLLECTION"),
    embedding: vertexModel,
    expectedDimension: boundedInteger(
      "VERTEX_EMBEDDING_DIMENSION",
      1_408,
      128,
      1_408,
    ),
    timeoutMs: boundedInteger("QDRANT_TIMEOUT_MS", 15_000, 1_000, 60_000),
  }),
  {
    textMinScore: boundedNumber(
      "PRODUCT_SEARCH_TEXT_MIN_SCORE",
      0.72,
      0,
      1,
    ),
    imageMinScore: boundedNumber(
      "PRODUCT_SEARCH_IMAGE_MIN_SCORE",
      0.78,
      0,
      1,
    ),
    minTopGap: boundedNumber(
      "PRODUCT_SEARCH_MIN_TOP_GAP",
      0.04,
      0,
      1,
    ),
    maxCandidates: boundedInteger(
      "PRODUCT_SEARCH_MAX_CANDIDATES",
      3,
      1,
      3,
    ),
  },
);
const productSearch = new RedisCachedProductSearch(
  required("REDIS_URL"),
  baseProductSearch,
  boundedInteger("MEDIA_SEARCH_CACHE_TTL_SECONDS", 604_800, 60, 2_592_000),
  process.env.QDRANT_COLLECTION?.trim() || "catalog-v2",
);
const mediaCutoutModeRaw =
  process.env.REALTIME_MEDIA_CUTOUT_MODE?.trim().toUpperCase() || "OFF";
if (!["OFF", "LIVE"].includes(mediaCutoutModeRaw)) {
  throw new Error("REALTIME_MEDIA_CUTOUT_MODE_INVALID");
}
const mediaAiModeRaw =
  process.env.REALTIME_MEDIA_AI_RERANK_MODE?.trim().toUpperCase() || "OFF";
if (!["OFF", "LIVE"].includes(mediaAiModeRaw)) {
  throw new Error("REALTIME_MEDIA_AI_RERANK_MODE_INVALID");
}
const mediaRecognitionPageIds = (
  process.env.REALTIME_MEDIA_ENABLED_PAGE_IDS ?? ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (mediaRecognitionPageIds.some((value) => !/^\d{5,32}$/u.test(value))) {
  throw new Error("REALTIME_MEDIA_ENABLED_PAGE_IDS_INVALID");
}
if (mediaCutoutModeRaw === "LIVE" && mediaRecognitionPageIds.length === 0) {
  throw new Error("REALTIME_MEDIA_ENABLED_PAGE_IDS_REQUIRED");
}
const mediaPipelineVersion =
  process.env.REALTIME_MEDIA_PIPELINE_VERSION?.trim() ||
  "cutout-first-ai-v1";
const mediaAiModel =
  process.env.REALTIME_MEDIA_AI_RERANK_MODEL?.trim() ||
  "gemini-3.5-flash-lite";
const mediaAiPromptVersion =
  process.env.REALTIME_MEDIA_AI_PROMPT_VERSION?.trim() ||
  "media-rerank-v1";
const mediaCacheVersion = [
  mediaPipelineVersion, mediaAiModeRaw, mediaAiModel, mediaAiPromptVersion,
].join(":");
let mediaRecognitionCache:
  | RedisRealtimeMediaRecognitionCache
  | undefined;
let mediaRecognition: RealtimeMediaRecognitionService | undefined;
if (mediaCutoutModeRaw === "LIVE") {
  const mediaEmbeddingModel = new VertexShadowModel({
    projectId: required("VERTEX_PROJECT_ID"),
    location: process.env.VERTEX_LOCATION?.trim() || credential.region,
    modelName: required("VERTEX_MODEL_NAME"),
    serviceAccount: credential.serviceAccount,
    timeoutMs: boundedInteger(
      "REALTIME_MEDIA_EMBED_TIMEOUT_MS",
      4_000,
      1_000,
      8_000,
    ),
    embeddingLocation:
      process.env.VERTEX_EMBEDDING_LOCATION?.trim() || "us-central1",
    embeddingModel:
      process.env.VERTEX_EMBEDDING_MODEL?.trim() ||
      "multimodalembedding@001",
    embeddingDimension: boundedInteger(
      "VERTEX_EMBEDDING_DIMENSION",
      1_408,
      128,
      1_408,
    ),
    maxImageBytes: boundedInteger(
      "PRODUCT_SEARCH_MAX_IMAGE_BYTES",
      10 * 1024 * 1024,
      64 * 1024,
      20 * 1024 * 1024,
    ),
    allowedImageHostSuffixes: allowedMediaHostSuffixes,
  });
  const mediaSearch = new ProductSearchService(
    new QdrantStableCatalogSearchAdapter({
      baseUrl: required("QDRANT_BASE_URL"),
      apiKey: secretOrEnvironment("QDRANT_API_KEY", "QDRANT_API_KEY_FILE"),
      collection: required("QDRANT_COLLECTION"),
      embedding: mediaEmbeddingModel,
      expectedDimension: boundedInteger(
        "VERTEX_EMBEDDING_DIMENSION",
        1_408,
        128,
        1_408,
      ),
      timeoutMs: boundedInteger(
        "REALTIME_MEDIA_QDRANT_TIMEOUT_MS",
        2_500,
        500,
        5_000,
      ),
    }),
    {
      textMinScore: 0.72,
      imageMinScore: 0.78,
      minTopGap: 0.04,
      maxCandidates: boundedInteger(
        "REALTIME_MEDIA_AI_MAX_CANDIDATES",
        3,
        1,
        3,
      ),
    },
  );
  mediaRecognitionCache = new RedisRealtimeMediaRecognitionCache(
    required("REDIS_URL"),
    mediaCacheVersion,
    process.env.QDRANT_COLLECTION?.trim() || "catalog-v2",
    boundedInteger(
      "REALTIME_MEDIA_CACHE_TTL_SECONDS",
      604_800,
      60,
      2_592_000,
    ),
  );
  const imageProcessor = new RealtimeImageProcessor({
    allowedHostSuffixes: allowedMediaHostSuffixes,
    rembgUrl: required("REMBG_URL"),
    rembgModel: process.env.REMBG_MODEL?.trim() || "u2netp",
    rembgAuthHeader: optionalSecretOrEnvironment(
      "REMBG_AUTH_HEADER",
      "REMBG_AUTH_HEADER_FILE",
    ),
    maxBytes: boundedInteger(
      "PRODUCT_SEARCH_MAX_IMAGE_BYTES",
      10 * 1024 * 1024,
      64 * 1024,
      20 * 1024 * 1024,
    ),
    maxDimension: 768,
  });
  const reranker = mediaAiModeRaw === "LIVE"
    ? new VertexMediaReranker({
        projectId: required("VERTEX_PROJECT_ID"),
        location:
          process.env.REALTIME_MEDIA_AI_LOCATION?.trim() || "global",
        serviceAccount: credential.serviceAccount,
      })
    : undefined;
  mediaRecognition = new RealtimeMediaRecognitionService(
    mediaSearch,
    imageProcessor,
    {
      pipelineVersion: mediaPipelineVersion,
      totalDeadlineMs: boundedInteger(
        "REALTIME_MEDIA_TOTAL_DEADLINE_MS",
        12_000,
        2_000,
        20_000,
      ),
      prepareTimeoutMs: boundedInteger(
        "REALTIME_MEDIA_PREPARE_TIMEOUT_MS",
        4_000,
        500,
        8_000,
      ),
      rembgTimeoutMs: boundedInteger(
        "REALTIME_MEDIA_REMBG_TIMEOUT_MS",
        3_500,
        500,
        8_000,
      ),
      cutoutStrongScore: boundedNumber(
        "REALTIME_MEDIA_CUTOUT_STRONG_SCORE",
        0.82,
        0,
        1,
      ),
      cutoutMinimumScore: boundedNumber(
        "REALTIME_MEDIA_CUTOUT_MIN_SCORE",
        0.74,
        0,
        1,
      ),
      cutoutMinimumGap: boundedNumber(
        "REALTIME_MEDIA_CUTOUT_MIN_GAP",
        0.025,
        0,
        1,
      ),
      rawFallbackScore: boundedNumber(
        "REALTIME_MEDIA_RAW_FALLBACK_SCORE",
        0.78,
        0,
        1,
      ),
      rawFallbackGap: boundedNumber(
        "REALTIME_MEDIA_RAW_FALLBACK_GAP",
        0.04,
        0,
        1,
      ),
      aiMode: mediaAiModeRaw as "OFF" | "LIVE",
      aiModel: mediaAiModel,
      aiPromptVersion: mediaAiPromptVersion,
      aiTimeoutMs: boundedInteger(
        "REALTIME_MEDIA_AI_TIMEOUT_MS",
        8_000,
        500,
        12_000,
      ),
      aiMaxOutputTokens: boundedInteger(
        "REALTIME_MEDIA_AI_MAX_OUTPUT_TOKENS",
        250,
        32,
        250,
      ),
      maxCandidates: boundedInteger(
        "REALTIME_MEDIA_AI_MAX_CANDIDATES",
        3,
        1,
        3,
      ),
      logTelemetry: (telemetry) => {
        process.stdout.write(`${JSON.stringify({
          level: "info",
          component: "realtime-media-recognition",
          event: "MEDIA_RECOGNITION_DECISION",
          ...telemetry,
        })}\n`);
      },
    },
    reranker,
    mediaRecognitionCache,
  );
}
const videoProcessingTimeoutMs = boundedInteger(
  "VIDEO_PROCESSING_TIMEOUT_MS",
  45_000,
  5_000,
  120_000,
);
const mediaWorkerUrl = process.env.MEDIA_WORKER_URL?.trim() || "";
const mediaWorkerKey = optionalSecretOrEnvironment(
  "MEDIA_WORKER_KEY",
  "MEDIA_WORKER_KEY_FILE",
);
const videoFrames = mediaWorkerUrl
  ? new HttpVideoFrameExtractorClient(
      mediaWorkerUrl,
      mediaWorkerKey,
      Math.min(120_000, videoProcessingTimeoutMs + 15_000),
    )
  : new FfmpegVideoFrameExtractor({
      allowedHostSuffixes: allowedMediaHostSuffixes,
      maxBytes: boundedInteger(
        "VIDEO_MAX_BYTES",
        24 * 1024 * 1024,
        1024 * 1024,
        30 * 1024 * 1024,
      ),
      maxDurationSeconds: boundedInteger("VIDEO_MAX_DURATION_SECONDS", 60, 5, 60),
      timeoutMs: videoProcessingTimeoutMs,
    });
const facts = new RedisBusinessFactsReader(
  required("REDIS_URL"),
  boundedInteger(
    "BUSINESS_FACT_MAX_AGE_SECONDS",
    1_200,
    60,
    86_400,
  ),
  boundedInteger(
    "BUSINESS_NON_VOLATILE_MAX_AGE_SECONDS",
    172_800,
    60,
    172_800,
  ),
);
const quota = new RedisRealtimeGenerationQuota(
  required("REDIS_URL"),
  boundedInteger("REALTIME_HOURLY_GENERATION_LIMIT", 10, 1, 1_000),
  boundedInteger("REALTIME_DAILY_GENERATION_LIMIT", 50, 1, 10_000),
);
const history = process.env.HISTORY_CONTEXT_ENABLED === "true"
  ? new RedisChatHistoryStore(
      required("REDIS_URL"),
      boundedInteger("CHAT_HISTORY_TTL_SECONDS", 1_728_000, 60, 2_592_000),
      boundedInteger("CHAT_HISTORY_MAX_MESSAGES", 150, 10, 500),
    )
  : undefined;
if (!(await inbox.ready())) throw new Error("REALTIME_INBOX_NOT_READY");
if (!(await facts.ready())) throw new Error("BUSINESS_FACT_REDIS_NOT_READY");
if (!(await productSearch.ready())) throw new Error("MEDIA_SEARCH_CACHE_NOT_READY");
if (mediaRecognitionCache && !(await mediaRecognitionCache.ready())) {
  throw new Error("MEDIA_RECOGNITION_CACHE_NOT_READY");
}
if (history && !(await history.ready())) throw new Error("CHAT_HISTORY_REDIS_NOT_READY");
if (canonicalHistory && !(await canonicalHistory.ready())) {
  throw new Error("CHAT_HISTORY_POSTGRES_NOT_READY");
}

const dryRunAssumeClear =
  (process.env.REALTIME_DRY_RUN_ASSUME_TAGS_CLEAR ?? "false")
    .trim()
    .toLowerCase() === "true";
const pancakeToken = optionalSecretOrEnvironment(
  "PANCAKE_ACCESS_TOKEN",
  "PANCAKE_ACCESS_TOKEN_FILE",
);
const pancakeEmployeeTagId =
  process.env.PANCAKE_EMPLOYEE_TAG_ID?.trim() || "";
const pancakePostSaleTagId =
  process.env.PANCAKE_POST_SALE_TAG_ID?.trim() || "";
const pancakeClosedOrderTagId =
  process.env.PANCAKE_CLOSED_ORDER_TAG_ID?.trim() || "";
const pancakeNoUpsaleTagId =
  process.env.PANCAKE_NO_UPSALE_TAG_ID?.trim() || "";
const pancakeConfigured =
  pancakeToken !== "" &&
  pancakeEmployeeTagId !== "" &&
  pancakePostSaleTagId !== "" &&
  pancakeClosedOrderTagId !== "" &&
  pancakeNoUpsaleTagId !== "";
const tags = pancakeConfigured
  ? new PancakeRealtimeTagObservationProvider(
      new PancakeHandoffAdapter(
        new PancakeAllowListedClient(
          new FetchPancakeHttpTransport(),
          {
            timeoutMs: boundedInteger(
              "PANCAKE_TIMEOUT_MS",
              10_000,
              1_000,
              60_000,
            ),
          },
        ),
        new InMemoryPancakePageRegistry([
          {
            pageId: required("META_PAGE_ID"),
            accessToken: pancakeToken,
            tagIds: {
              NHAN_VIEN: pancakeEmployeeTagId,
              VAN_DON: pancakePostSaleTagId,
              DA_CHOT_DON: pancakeClosedOrderTagId,
              KHONG_UP_SALE: pancakeNoUpsaleTagId,
            },
          },
        ]),
      ),
    )
  : dryRunAssumeClear
    ? new DryRunClearTagObservationProvider(mode)
    : new FailClosedTagObservationProvider();
const workerId =
  process.env.REALTIME_WORKER_ID?.trim() || "realtime-worker-1";
/**
 * Both process modes use the same narrow authority boundary.  The default
 * LEGACY startup input intentionally keeps Commerce source-disabled; a fresh
 * COMMERCE process can proceed only with its reviewed immutable input.
 */
const df13FenceRuntime = behaviorModeStore
  ? createDf13CommerceFenceRuntimePort(databaseUrl)
  : undefined;
const commerceExecutor = df13FenceRuntime
  ? new Df13CommerceRuntimeExecutor({
      activationAuthority: df13CommerceStartupAuthority,
      fenceProvider: new PostgresDf13CommerceFenceProvider(df13FenceRuntime),
      fenceCommitter: new PostgresDf13CommerceFenceBoundCommitter(
        df13FenceRuntime,
        runtime,
      ),
    })
  : undefined;
const df13CommerceComposition = behaviorModeStore && commerceExecutor
  ? createDf13CommerceRuntimeComposition({
      source: behaviorModeStore,
      confirmationAllowedPageIds: confirmationCanaryPageIds,
      runtimeAuthorityMode: df13CommerceStartupInput.mode,
      cacheTtlMs: boundedInteger(
        "REALTIME_BEHAVIOR_MODE_CACHE_TTL_MS", 5_000, 100, 5_000,
      ),
      lastKnownGoodTtlMs: boundedInteger(
        "REALTIME_BEHAVIOR_MODE_LKG_TTL_MS", 300_000, 5_000, 300_000,
      ),
      commerceExecutor,
    })
  : undefined;
const behaviorModeResolver = df13CommerceComposition?.behaviorModeResolver;
const commerceOnlyBehaviorModeResolver = df13CommerceStartupInput.mode === "COMMERCE"
  ? {
      async resolve(input: Parameters<NonNullable<typeof behaviorModeResolver>["resolve"]>[0]) {
        if (!behaviorModeResolver) throw new Error("DF13_COMMERCE_BEHAVIOR_MODE_REQUIRED");
        const resolution = await behaviorModeResolver.resolve(input);
        if (selectDf13RuntimeAuthority({
          pageId: input.pageId,
          channel: input.channel,
          resolution,
        }).status !== "COMMERCE_SELECTED") {
          throw new Error("DF13_COMMERCE_STARTUP_AUTHORITY_LOST");
        }
        return resolution;
      },
    }
  : undefined;
if (df13CommerceStartupInput.mode === "COMMERCE") {
  const startupResolution = await commerceOnlyBehaviorModeResolver!.resolve({
    resolutionId: randomUUID(),
    pageId: required("META_PAGE_ID"),
    channel: process.env.REALTIME_BEHAVIOR_MODE_CHANNEL?.trim().toUpperCase() || "MESSENGER",
    workerId,
    now: new Date(),
  });
  if (startupResolution.salesAuthorityMode !== "COMMERCE") {
    throw new Error("DF13_COMMERCE_STARTUP_AUTHORITY_LOST");
  }
}
const runnerOptions = {
  workerId,
  mode,
  sendEnabled,
  inboxLeaseMs: boundedInteger(
    "REALTIME_INBOX_LEASE_MS",
    90_000,
    10_000,
    300_000,
  ),
  shopAlias:
    process.env.CATALOG_DEFAULT_SHOP_ALIAS?.trim() || "LANA",
  employeeTagId: process.env.PANCAKE_EMPLOYEE_TAG_ID?.trim() || "",
  postSaleTagId:
    process.env.PANCAKE_POST_SALE_TAG_ID?.trim() || "",
  closedOrderTagId:
    process.env.PANCAKE_CLOSED_ORDER_TAG_ID?.trim() || "",
  salesCycleEnabled:
    process.env.SALES_CYCLE_ENABLED === "true",
  imageDelayMs: boundedInteger(
    "REALTIME_IMAGE_DELAY_MS",
    500,
    0,
    5_000,
  ),
  promptVersion:
    process.env.REALTIME_PROMPT_VERSION?.trim() || "lana-realtime-v1",
  metaAppId: required("META_APP_ID"),
  confirmationStartupMode,
  behaviorModeChannel:
    process.env.REALTIME_BEHAVIOR_MODE_CHANNEL?.trim().toUpperCase() || "MESSENGER",
  policyChannel: runtimePolicyChannel,
  releaseId:
    process.env.REALTIME_RELEASE_ID?.trim() || "unversioned",
  decisionTelemetryEnabled:
    process.env.REALTIME_DECISION_TELEMETRY_ENABLED === "true",
  buyingSignalGuardEnabled:
    process.env.REALTIME_BUYING_SIGNAL_GUARD_V1 === "true",
  groundedDraftEnabled:
    process.env.REALTIME_GROUNDED_DRAFT_V1 === "true",
  verifiedFactAssemblerEnabled:
    process.env.REALTIME_VERIFIED_FACT_ASSEMBLER_V1 === "true",
  customerProfileEnabled:
    process.env.REALTIME_CUSTOMER_PROFILE_V1 === "true",
  verifiedVariantEnabled:
    process.env.REALTIME_VERIFIED_VARIANT_V2 === "true",
  contextHistoryLimit: boundedInteger(
    "REALTIME_CONTEXT_HISTORY_LIMIT",
    30,
    1,
    30,
  ),
  multiFactQueryEnabled:
    process.env.REALTIME_MULTI_FACT_QUERY_V2 === "true",
  catalogAdvisoryEnabled:
    process.env.REALTIME_CATALOG_ADVISORY_V1 === "true",
  decisionAuditV2Enabled:
    process.env.REALTIME_DECISION_AUDIT_V2 === "true",
  recordedReplayCaptureEnabled:
    process.env.REALTIME_RECORDED_REPLAY_CAPTURE_ENABLED === "true",
  recordedReplayPageId: required("META_PAGE_ID"),
  contextV2CaptureEnabled: df13CommerceStartupInput.mode === "COMMERCE",
  mediaRecognitionEnabled: mediaCutoutModeRaw === "LIVE",
  mediaClarificationEnabled:
    process.env.REALTIME_MEDIA_CLARIFICATION_ENABLED === "true",
  mediaRecognitionPageIds,
  conversationalMessageFormatEnabled:
    process.env.REALTIME_CONVERSATIONAL_MESSAGE_FORMAT_V1 === "true",
  messageGroupingV2Enabled:
    process.env.REALTIME_MESSAGE_GROUPING_V2 === "true",
  mediaSelectorV2GuardEnabled:
    process.env.REALTIME_MEDIA_SELECTOR_V2_GUARD_ENABLED === "true",
  wave2StrategyEnabled:
    process.env.REALTIME_WAVE2_STRATEGY_V1 === "true",
  adAcquisitionAnalyticsMode: adAcquisitionMode,
  adAcquisitionPageIds,
} as const;
const runner = df13CommerceStartupInput.mode === "COMMERCE"
  ? new Bf01Bf02RealtimeRunner(
    inbox,
    runtime,
    baselineModelCapability(vertexModel),
    facts,
    productSearch,
    tags,
    runnerOptions,
    quota,
    history,
    canonicalHistory,
    videoFrames,
    runtimePolicyResolver,
    mediaRecognition,
    commerceOnlyBehaviorModeResolver,
  )
  : new Bf01Bf02RealtimeRunner(
  inbox,
  runtime,
  baselineModelCapability(vertexModel),
  facts,
  productSearch,
  tags,
  runnerOptions,
  quota,
  history,
  canonicalHistory,
  videoFrames,
  runtimePolicyResolver,
  mediaRecognition,
  behaviorModeResolver,
);
if (df13CommerceStartupInput.mode === "COMMERCE") {
  const commerceExecutor = df13CommerceComposition?.commerceExecutor;
  if (!commerceExecutor) throw new Error("DF13_COMMERCE_EXECUTOR_UNAVAILABLE");
  runner.bindDf13CommerceExecutor(commerceExecutor);
}
const pollMs = boundedInteger(
  "REALTIME_POLL_MS",
  10_000,
  1_000,
  30_000,
);
const concurrency = boundedInteger(
  "REALTIME_CONCURRENCY",
  4,
  1,
  8,
);
const heartbeatMs = boundedInteger(
  "REALTIME_HEARTBEAT_MS",
  15_000,
  5_000,
  60_000,
);
const shutdownController = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => shutdownController.abort());
}

await runRealtimeLoop({
  runner,
  inbox,
  workerId,
  mode,
  sendEnabled,
  concurrency,
  fallbackPollMs: pollMs,
  heartbeatMs,
  signal: shutdownController.signal,
  logError: (code) => {
    process.stderr.write(
      `${JSON.stringify({ level: "error", code, workerId, mode })}\n`,
    );
  },
});
await runtime.close();
await inbox.close();
await facts.close();
await productSearch.close();
await quota.close();
await history?.close();
await canonicalHistory?.close();
await runtimePolicyStore?.close();
await behaviorModeStore?.close();
await df13FenceRuntime?.close();
