import { readFileSync } from "node:fs";
import { UnavailableInboundQueue } from "@lana/meta-webhook";
import {
  LocalEnvelopeCipher,
  PostgresOutreachStore,
  PostgresRealtimeInboxStore,
  PostgresShadowEvaluationStore,
  PostgresShadowMirrorStore,
} from "@lana/database";
import { createApi } from "./app.js";
import { RedisCatalogProjectionStore } from "./catalog-store.js";
import { configFromEnvironment } from "./config.js";
import { DurableInboundQueue } from "./durable-inbound-queue.js";

const config = configFromEnvironment();
const metaAppId = config.metaAppId ?? "";
const databaseUrl = process.env.DATABASE_URL ?? "";
const shadowMirrorStore =
  databaseUrl && config.identityHashSalt.length >= 32 && metaAppId
    ? new PostgresShadowMirrorStore(databaseUrl, {
        analyticsHashSalt: config.identityHashSalt,
        metaAppId,
      })
    : undefined;
const shadowEvaluationStore = databaseUrl
  ? new PostgresShadowEvaluationStore(databaseUrl)
  : undefined;
const realtimeDataKey = process.env.REALTIME_DATA_KEY_FILE
  ? readFileSync(process.env.REALTIME_DATA_KEY_FILE, "utf8").trim()
  : process.env.REALTIME_DATA_KEY?.trim() ?? "";
const realtimeInboxStore =
  databaseUrl && realtimeDataKey && metaAppId
    ? new PostgresRealtimeInboxStore(
        databaseUrl,
        new LocalEnvelopeCipher(
          realtimeDataKey,
          process.env.REALTIME_DATA_KEY_REF?.trim() || "local-kek-v1",
        ),
        {
          customerDebounceMs: Number(
            process.env.REALTIME_INBOUND_DEBOUNCE_MS ?? "5000",
          ),
        },
      )
    : undefined;
const upsaleSuppressionStore =
  databaseUrl &&
  config.upsaleSuppressionEnabled === true &&
  config.identityHashSalt.length >= 32
    ? new PostgresOutreachStore(databaseUrl, {
        analyticsHashSalt: config.identityHashSalt,
      })
    : undefined;
const redisUrl = process.env.REDIS_URL ?? "";
const catalogProjectionStore = redisUrl
  ? new RedisCatalogProjectionStore(
      redisUrl,
      Number(process.env.BUSINESS_FACT_MAX_AGE_SECONDS ?? "1200"),
    )
  : undefined;

const app = createApi({
  config,
  inboundQueue: realtimeInboxStore
    ? new DurableInboundQueue(
        realtimeInboxStore,
        metaAppId,
        process.env.META_SIGNATURE_KEY_VERSION?.trim() ||
          "meta-app-secret-v1",
      )
    : new UnavailableInboundQueue(),
  ...(shadowMirrorStore ? { shadowMirrorStore } : {}),
  ...(shadowEvaluationStore ? { shadowEvaluationStore } : {}),
  ...(catalogProjectionStore ? { catalogProjectionStore } : {}),
  ...(upsaleSuppressionStore ? { upsaleSuppressionStore } : {}),
});

const port = Number(process.env.PORT ?? "3000");
await app.listen({ host: "0.0.0.0", port });

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void (async () => {
      await app.close();
      await shadowMirrorStore?.close();
      await shadowEvaluationStore?.close();
      await realtimeInboxStore?.close();
      await upsaleSuppressionStore?.close();
      await catalogProjectionStore?.close();
      process.exit(0);
    })();
  });
}
