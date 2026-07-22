import { readFileSync } from "node:fs";
import { LocalEnvelopeCipher } from "@lana/database";
import { FetchPancakeHttpTransport } from "@lana/pancake-handoff";
import { PancakeExactTagReader } from "./pancake-control.js";
import { PostgresControlCommandStore } from "./postgres-store.js";
import { AdminControlCommandProcessor } from "./processor.js";

const enabled = boolean("ADMIN_CONTROL_ENABLED", false);
if (!enabled) {
  process.stdout.write(`${JSON.stringify({ service: "admin-control-worker", enabled: false })}\n`);
  await waitForShutdown();
} else {
  const allowedPageIds = csv("ADMIN_CONTROL_PAGE_IDS");
  if (allowedPageIds.length === 0) throw new Error("ADMIN_CONTROL_PAGE_ALLOWLIST_REQUIRED");
  const pageId = required("META_PAGE_ID");
  if (allowedPageIds.length !== 1 || allowedPageIds[0] !== pageId) {
    throw new Error("ADMIN_CONTROL_SINGLE_PAGE_CONFIG_REQUIRED");
  }
  const databaseUrl = secret("ADMIN_CONTROL_DATABASE_URL", "ADMIN_CONTROL_DATABASE_URL_FILE");
  const dataKey = secret("REALTIME_DATA_KEY", "REALTIME_DATA_KEY_FILE");
  const store = new PostgresControlCommandStore(
    databaseUrl,
    new LocalEnvelopeCipher(
      dataKey,
      process.env.REALTIME_DATA_KEY_REF?.trim() || "local-kek-v1",
    ),
  );
  const pancake = new PancakeExactTagReader(
    new FetchPancakeHttpTransport(),
    [{
      pageId,
      accessToken: secret("PANCAKE_ACCESS_TOKEN", "PANCAKE_ACCESS_TOKEN_FILE"),
      tagIds: {
        NHAN_VIEN: required("PANCAKE_EMPLOYEE_TAG_ID"),
        VAN_DON: required("PANCAKE_POST_SALE_TAG_ID"),
        DA_CHOT_DON: required("PANCAKE_CLOSED_ORDER_TAG_ID"),
        KHONG_UP_SALE: required("PANCAKE_NO_UPSALE_TAG_ID"),
      },
    }],
    integer("PANCAKE_TIMEOUT_MS", 10_000, 1_000, 60_000),
  );
  const workerId = process.env.ADMIN_CONTROL_WORKER_ID?.trim() || "admin-control-worker-1";
  const processor = new AdminControlCommandProcessor(
    store,
    pancake,
    workerId,
    integer("ADMIN_CONTROL_LEASE_MS", 60_000, 10_000, 300_000),
    () => new Date(),
    { enabled, allowedPageIds },
  );
  const pollMs = integer("ADMIN_CONTROL_POLL_MS", 1_000, 100, 30_000);
  let stopping = false;
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => { stopping = true; });
  }
  while (!stopping) {
    try {
      const processed = await processor.processOne();
      if (!processed) await delay(pollMs);
    } catch (error: unknown) {
      process.stderr.write(`${JSON.stringify({
        level: "error",
        service: "admin-control-worker",
        code: error instanceof Error ? error.message.slice(0, 128) : "ADMIN_CONTROL_LOOP_FAILED",
      })}\n`);
      await delay(pollMs);
    }
  }
  await store.close();
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}
function secret(direct: string, file: string) {
  const value = process.env[direct]?.trim();
  return value || readFileSync(required(file), "utf8").trim();
}
function boolean(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name}_INVALID`);
}
function csv(name: string) {
  return [...new Set((process.env[name] ?? "").split(",").map((value) => value.trim()).filter(Boolean))];
}
function integer(name: string, fallback: number, minimum: number, maximum: number) {
  const raw = process.env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name}_INVALID`);
  return value;
}
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function waitForShutdown() {
  return new Promise<void>((resolve) => {
    const stop = () => resolve();
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  });
}
