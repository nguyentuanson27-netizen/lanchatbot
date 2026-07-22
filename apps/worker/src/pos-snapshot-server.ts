import { readFileSync } from "node:fs";
import { createClient } from "redis";
import { createBatchStatusReporter } from "./batch-status-reporter.js";
import { GoogleSheetsClient } from "./google-sheets-client.js";
import { PancakePosClient } from "./pancake-pos-client.js";
import { PosSnapshotRunner, type PosAlertNotifier } from "./pos-snapshot-runner.js";
import type { PosShopsSecretMap } from "./pos-snapshot-core.js";

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

function optionalSecretOrEnvironment(directName: string, fileName: string): string {
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

interface GoogleCredentialFile {
  email?: unknown;
  privateKey?: unknown;
}

function log(level: "info" | "error", context: Record<string, unknown>, message: string): void {
  process.stdout.write(`${JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: "pos-snapshot-worker",
    ...context,
    msg: message,
  })}\n`);
}

async function main(): Promise<void> {
  const redisUrl = required("REDIS_URL");
  const sheetId = required("DATA_INGESTION_V2_SHEET_ID");
  const posBaseUrl = process.env.PANCAKE_POS_BASE_URL?.trim() || "https://pos.pages.fm/api/v1";
  const shopsRaw = secretOrEnvironment("PANCAKE_POS_SHOPS_JSON", "PANCAKE_POS_SHOPS_JSON_FILE");
  const shopsSecret = JSON.parse(shopsRaw) as PosShopsSecretMap;
  const credentialRaw = secretOrEnvironment("GOOGLE_SHEETS_CREDENTIAL", "GOOGLE_SHEETS_CREDENTIAL_FILE");
  const credential = JSON.parse(credentialRaw) as GoogleCredentialFile;
  if (typeof credential.email !== "string" || typeof credential.privateKey !== "string") {
    throw new Error("GOOGLE_SHEETS_CREDENTIAL_INVALID");
  }

  const snapshotTtlSeconds = boundedInt("CATALOG_REDIS_TTL_SECONDS", 172_800, 300, 172_800);
  const intervalMs = boundedInt("POS_SYNC_INTERVAL_MS", 1_800_000, 60_000, 86_400_000);
  const sheetsWritebackEnabled = process.env.POS_SHEETS_WRITEBACK_ENABLED === "true";

  const telegramToken = optionalSecretOrEnvironment("TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_TOKEN_FILE");
  const telegramChatId = process.env.TELEGRAM_ALERT_CHAT_ID?.trim() ?? "";
  const notifier: PosAlertNotifier | null = telegramToken && telegramChatId
    ? {
        notify: async (text: string): Promise<void> => {
          const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chat_id: telegramChatId, text, disable_web_page_preview: true }),
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) throw new Error(`TELEGRAM_HTTP_${response.status}`);
        },
      }
    : null;

  const redis = createClient({ url: redisUrl });
  redis.on("error", (error) => log("error", { err: String(error) }, "redis client error"));
  await redis.connect();

  const workerId = process.env.POS_WORKER_ID?.trim() || "pos-snapshot-worker-1";
  const reporter = createBatchStatusReporter(
    "POS_SNAPSHOT",
    workerId,
    sheetsWritebackEnabled ? "SHEETS_WRITEBACK" : "REDIS_ONLY",
    {
      info: (context, message) => log("info", context, message),
      error: (context, message) => log("error", context, message),
    },
  );
  await reporter.heartbeat("STARTING");

  const runner = new PosSnapshotRunner({
    redis,
    sheets: new GoogleSheetsClient({
      serviceAccount: { email: credential.email, privateKey: credential.privateKey },
    }),
    pos: new PancakePosClient({ baseUrl: posBaseUrl }),
    sheetId,
    shopsSecret,
    snapshotTtlSeconds,
    sheetsWritebackEnabled,
    notifier,
    runId: workerId,
    logger: {
      info: (context, message) => log("info", context, message),
      error: (context, message) => log("error", context, message),
    },
  });

  let stopping = false;
  let running = false;

  const runOnce = async (): Promise<void> => {
    if (running || stopping) return;
    running = true;
    const startedAt = Date.now();
    await reporter.heartbeat("RUNNING");
    try {
      const summary = await runner.run();
      log(summary.status === "OK" ? "info" : "error", { summary }, "pos snapshot cycle finished");
      await reporter.heartbeat(summary.status === "FATAL" ? "ERROR" : "IDLE", {
        runMs: Date.now() - startedAt,
        ...(summary.fatalError ? { errorCode: summary.fatalError } : {}),
        stats: {
          run_status: summary.status,
          config_source: summary.configSource,
          product_count: summary.productCount,
          snapshot_writes: summary.snapshotWrites,
          alert_row_count: summary.alertRowCount,
          sheets_writeback: summary.sheetsWriteback,
          status_counts: summary.statusCounts,
        },
      });
      // Chỉ ghi lại ảnh chụp catalog khi chu kỳ thực sự quét xong. Lần chạy bị
      // khoá (RUN_LOCKED) không đụng gì, để `observed_at` cũ dần và trang quản
      // trị tự cho thấy dữ liệu đang đứng.
      if (summary.status === "OK") {
        await reporter.snapshot({
          snapshotKey: "POS_CATALOG",
          source: "Pancake POS + Google Sheets",
          status: summary.issues.some((issue) => issue.severity === "critical")
            ? "WARNING"
            : "OK",
          recordCount: summary.snapshotWrites,
          detail: `${summary.productCount} mã cấu hình · nguồn ${summary.configSource}`,
          metrics: {
            product_count: summary.productCount,
            snapshot_writes: summary.snapshotWrites,
            status_counts: summary.statusCounts,
          },
          observedAt: new Date(summary.syncedAt),
          issues: summary.issues.map((issue) => ({ ...issue, source: "POS snapshot" })),
        });
      } else if (summary.status === "FATAL") {
        await reporter.snapshot({
          snapshotKey: "POS_CATALOG",
          source: "Pancake POS + Google Sheets",
          status: "ERROR",
          detail: summary.fatalError?.slice(0, 200) ?? "Chu kỳ đồng bộ thất bại",
        });
      }
    } catch (error) {
      log("error", { err: String(error) }, "pos snapshot cycle crashed");
      await reporter.heartbeat("ERROR", {
        runMs: Date.now() - startedAt,
        errorCode: String(error).slice(0, 128),
      });
    } finally {
      running = false;
    }
  };

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
    sheetId: `${sheetId.slice(0, 6)}...`,
    intervalMs,
    snapshotTtlSeconds,
    sheetsWritebackEnabled,
    telegramEnabled: Boolean(notifier),
    statusReporting: reporter.enabled,
  }, "pos snapshot worker started");

  await runOnce();
}

main().catch((error) => {
  log("error", { err: String(error) }, "pos snapshot worker failed to start");
  process.exit(1);
});
