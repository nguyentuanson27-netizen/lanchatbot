import { readFileSync } from "node:fs";
import {
  ProductSearchService,
  QdrantStableCatalogSearchAdapter,
} from "@lana/business-tools";
import {
  LocalEnvelopeCipher,
  PostgresChatHistoryStore,
  PostgresRealtimeInboxStore,
  PostgresRealtimeRuntimeStore,
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
  RealtimeRunner,
} from "./realtime-runner.js";
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
const canonicalHistory = process.env.HISTORY_WRITE_ENABLED === "true"
  ? new PostgresChatHistoryStore(databaseUrl, {
      analyticsHashSalt: secretOrEnvironment(
        "ANALYTICS_HASH_SALT",
        "ANALYTICS_HASH_SALT_FILE",
      ),
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
const model = new VertexShadowModel({
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
    embedding: model,
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
const runner = new RealtimeRunner(
  inbox,
  runtime,
  model,
  facts,
  productSearch,
  tags,
  {
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
  },
  quota,
  history,
  canonicalHistory,
  videoFrames,
  runtimePolicyResolver,
);
const pollMs = boundedInteger(
  "REALTIME_POLL_MS",
  1_000,
  100,
  30_000,
);
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    stopping = true;
  });
}

await inbox.heartbeat(
  workerId,
  "STARTING",
  mode,
  sendEnabled,
);
while (!stopping) {
  try {
    await inbox.heartbeat(
      workerId,
      "PROCESSING",
      mode,
      sendEnabled,
    );
    const processed = await runner.processOne();
    await inbox.heartbeat(workerId, "IDLE", mode, sendEnabled);
    if (!processed) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message.slice(0, 128)
        : "REALTIME_WORKER_LOOP_FAILED";
    await inbox
      .heartbeat(workerId, "ERROR", mode, sendEnabled, code)
      .catch(() => undefined);
    process.stderr.write(
      `${JSON.stringify({ level: "error", code, workerId, mode })}\n`,
    );
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
await inbox
  .heartbeat(workerId, "STOPPING", mode, sendEnabled)
  .catch(() => undefined);
await runtime.close();
await inbox.close();
await facts.close();
await productSearch.close();
await quota.close();
await history?.close();
await canonicalHistory?.close();
await runtimePolicyStore?.close();
