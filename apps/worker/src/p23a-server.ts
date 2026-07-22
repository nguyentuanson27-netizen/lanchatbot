import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "redis";
import { createBatchStatusReporter } from "./batch-status-reporter.js";
import { GoogleSheetsClient } from "./google-sheets-client.js";
import { P23aRegistrySync } from "./p23a-registry-sync.js";

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

function boundedInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(raw)));
}

function log(level: "info" | "error", context: Record<string, unknown>, message: string): void {
  process.stdout.write(`${JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: "p23a-registry-sync",
    ...context,
    msg: message,
  })}\n`);
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

  const intervalMs = boundedInt("P23A_INTERVAL_MS", 86_400_000, 60_000, 86_400_000);
  const writeEnabled = process.env.P23A_WRITE_ENABLED === "true";
  const feedUrl = process.env.LANA_PRODUCT_FEED_URL?.trim()
    || "https://www.lanadesign.vn/partner_feeds/danh-muc-lanadesign-vn.xml";

  const redis = createClient({ url: redisUrl });
  redis.on("error", (error) => log("error", { err: String(error) }, "redis client error"));
  await redis.connect();

  const workerId = process.env.P23A_RUN_ID?.trim() || "p23a-app";
  const reporter = createBatchStatusReporter(
    "P23A_REGISTRY_SYNC",
    workerId,
    writeEnabled ? "WRITE" : "DRY_RUN",
    {
      info: (context, message) => log("info", context, message),
      error: (context, message) => log("error", context, message),
    },
  );

  const sync = new P23aRegistrySync({
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
    sheetId,
    writeEnabled,
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
      const summary = await sync.run();
      log(summary.status === "FATAL" ? "error" : "info", { summary }, "p23a cycle finished");
      await reporter.heartbeat(summary.status === "FATAL" ? "ERROR" : "IDLE", {
        runMs: Date.now() - startedAt,
        ...(summary.fatal_error ? { errorCode: summary.fatal_error } : {}),
        stats: {
          run_status: summary.status,
          registry_count: summary.registry_count,
          matched_profile_count: summary.matched_profile_count,
          unmatched_product_count: summary.unmatched_product_count,
          review_count: summary.review_count,
          sheet_write: summary.sheet_write,
          registry_error_count: summary.registry_errors.length,
        },
      });
      if (summary.status === "OK") {
        await reporter.snapshot({
          snapshotKey: "PRODUCT_REGISTRY",
          source: "product_registry (Google Sheets)",
          // Chỉ WARNING khi có dòng registry hỏng, vì đó là thứ hiện được trong
          // bảng "Sản phẩm cần bổ sung". `unmatched_product_count` luôn lớn hơn 0
          // (feed webstore rộng hơn danh mục đã chọn) nên không phải lỗi.
          status: summary.registry_errors.length > 0 ? "WARNING" : "OK",
          recordCount: summary.registry_count,
          detail: `${summary.matched_profile_count} mã khớp feed XML · ${summary.review_count} dòng chờ xem lại`,
          metrics: {
            registry_count: summary.registry_count,
            matched_profile_count: summary.matched_profile_count,
            unmatched_product_count: summary.unmatched_product_count,
            review_count: summary.review_count,
            sheet_write: summary.sheet_write,
          },
          observedAt: new Date(summary.finished_at),
          // `registry_errors` có dạng `MA_LOI:MA_SP`, ví dụ `DUPLICATE_MA_SP:SV101`.
          issues: summary.registry_errors.slice(0, 100).map((entry) => {
            const separator = entry.indexOf(":");
            return {
              productId: separator > 0 ? entry.slice(separator + 1) : entry,
              issueCode: separator > 0 ? entry.slice(0, separator) : "REGISTRY_ROW_INVALID",
              severity: "warning" as const,
              source: "P2.3A registry sync",
            };
          }),
        });
      } else if (summary.status === "FATAL") {
        await reporter.snapshot({
          snapshotKey: "PRODUCT_REGISTRY",
          source: "product_registry (Google Sheets)",
          status: "ERROR",
          detail: summary.fatal_error?.slice(0, 200) ?? "Chu kỳ đồng bộ thất bại",
        });
      }
    } catch (error) {
      log("error", { err: String(error) }, "p23a cycle crashed");
      await reporter.heartbeat("ERROR", {
        runMs: Date.now() - startedAt,
        errorCode: String(error).slice(0, 128),
      });
    } finally {
      running = false;
    }
  };

  if (process.env.P23A_RUN_ONCE === "true") {
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

  log("info", { intervalMs, writeEnabled, statusReporting: reporter.enabled }, "p23a registry sync started");
  await runOnce();
}

main().catch((error) => {
  log("error", { err: String(error) }, "p23a registry sync failed to start");
  process.exit(1);
});
