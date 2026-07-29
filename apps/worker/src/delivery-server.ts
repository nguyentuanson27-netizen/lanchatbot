import { readFileSync } from "node:fs";
import {
  LocalEnvelopeCipher,
  PostgresChatHistoryStore,
  PostgresRealtimeRuntimeStore,
} from "@lana/database";
import {
  FetchHttpTransport,
  MetaDeliveryAdapter,
} from "@lana/meta-delivery";
import {
  FetchPancakeHttpTransport,
  InMemoryPancakePageRegistry,
  PancakeAllowListedClient,
  PancakeHandoffAdapter,
} from "@lana/pancake-handoff";
import {
  MetaOutboxDispatcher,
  PancakeMetaPreSendGate,
  SinglePageMetaTokenRegistry,
} from "./meta-outbox-dispatcher.js";
import { PancakeTagDispatcher } from "./pancake-tag-dispatcher.js";
import { RedisChatHistoryStore } from "./redis-chat-history.js";

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

const liveGates = [
  process.env.REALTIME_MODE === "LIVE",
  process.env.APP_SEND_ENABLED === "true",
  process.env.CHATBOT_SEND_ENABLED === "true",
  process.env.META_DELIVERY_ENABLED === "true",
];
if (liveGates.some((value) => !value)) {
  throw new Error("DELIVERY_SERVER_LIVE_GATES_REQUIRED");
}

const pageId = required("META_PAGE_ID");
const adAcquisitionModeRaw =
  process.env.AD_ACQUISITION_ANALYTICS_MODE?.trim().toUpperCase() || "OFF";
if (!["OFF", "SHADOW", "LIVE"].includes(adAcquisitionModeRaw)) {
  throw new Error("AD_ACQUISITION_ANALYTICS_MODE_INVALID");
}
const adAcquisitionMode = adAcquisitionModeRaw as "OFF" | "SHADOW" | "LIVE";
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
const metaToken = secretOrEnvironment(
  "META_PAGE_ACCESS_TOKEN",
  "META_PAGE_ACCESS_TOKEN_FILE",
);
const pancakeToken = secretOrEnvironment(
  "PANCAKE_ACCESS_TOKEN",
  "PANCAKE_ACCESS_TOKEN_FILE",
);
const employeeTagId = required("PANCAKE_EMPLOYEE_TAG_ID");
const postSaleTagId = required("PANCAKE_POST_SALE_TAG_ID");
const closedOrderTagId = required("PANCAKE_CLOSED_ORDER_TAG_ID");
const noUpsaleTagId = required("PANCAKE_NO_UPSALE_TAG_ID");
const dataKey = secretOrEnvironment(
  "REALTIME_DATA_KEY",
  "REALTIME_DATA_KEY_FILE",
);
const store = new PostgresRealtimeRuntimeStore(
  required("DATABASE_URL"),
  new LocalEnvelopeCipher(
    dataKey,
    process.env.REALTIME_DATA_KEY_REF?.trim() || "local-kek-v1",
  ),
);
const canonicalHistory = process.env.HISTORY_WRITE_ENABLED === "true"
  ? new PostgresChatHistoryStore(required("DATABASE_URL"), {
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
const history = process.env.HISTORY_CONTEXT_ENABLED === "true"
  ? new RedisChatHistoryStore(
      required("REDIS_URL"),
      boundedInteger("CHAT_HISTORY_TTL_SECONDS", 1_728_000, 60, 2_592_000),
      boundedInteger("CHAT_HISTORY_MAX_MESSAGES", 150, 10, 500),
    )
  : undefined;
if (history && !(await history.ready())) throw new Error("CHAT_HISTORY_REDIS_NOT_READY");
if (canonicalHistory && !(await canonicalHistory.ready())) {
  throw new Error("CHAT_HISTORY_POSTGRES_NOT_READY");
}
const pancake = new PancakeHandoffAdapter(
  new PancakeAllowListedClient(new FetchPancakeHttpTransport(), {
    timeoutMs: boundedInteger(
      "PANCAKE_TIMEOUT_MS",
      10_000,
      1_000,
      60_000,
    ),
  }),
  new InMemoryPancakePageRegistry([
    {
      pageId,
      accessToken: pancakeToken,
      tagIds: {
        NHAN_VIEN: employeeTagId,
        VAN_DON: postSaleTagId,
        DA_CHOT_DON: closedOrderTagId,
        KHONG_UP_SALE: noUpsaleTagId,
      },
    },
  ]),
);
const metaDispatcher = new MetaOutboxDispatcher(
  store,
  new MetaDeliveryAdapter(new FetchHttpTransport(), {
    sendEnabled: true,
    graphApiVersion:
      process.env.META_GRAPH_API_VERSION?.trim() || "v23.0",
    timeoutMs: boundedInteger(
      "META_SEND_TIMEOUT_MS",
      10_000,
      1_000,
      60_000,
    ),
  }),
  new SinglePageMetaTokenRegistry(pageId, metaToken),
  new PancakeMetaPreSendGate(pancake),
  {
    workerId:
      process.env.META_OUTBOX_WORKER_ID?.trim() ||
      "meta-outbox-worker-1",
    leaseMs: boundedInteger(
      "META_OUTBOX_LEASE_MS",
      30_000,
      5_000,
      120_000,
    ),
  },
  history,
  canonicalHistory,
);
const tagDispatcher = new PancakeTagDispatcher(
  store,
  pancake,
  process.env.PANCAKE_TAG_WORKER_ID?.trim() ||
    "pancake-tag-worker-1",
  boundedInteger(
    "PANCAKE_TAG_LEASE_MS",
    30_000,
    5_000,
    120_000,
  ),
);
const pollMs = boundedInteger(
  "DELIVERY_POLL_MS",
  500,
  100,
  30_000,
);
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    stopping = true;
  });
}

while (!stopping) {
  const tagged = await tagDispatcher.processOne();
  const sent = tagged ? false : await metaDispatcher.processOne();
  if (!tagged && !sent) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
await store.close();
await history?.close();
await canonicalHistory?.close();
