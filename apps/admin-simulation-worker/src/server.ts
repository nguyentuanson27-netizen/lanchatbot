import { readFileSync } from "node:fs";
import { AdminSimulationProcessor } from "./processor.js";
import { PostgresSimulationStore } from "./postgres-store.js";

const enabled = boolean("ADMIN_SIMULATION_ENABLED", false);
if (!enabled) {
  process.stdout.write(`${JSON.stringify({ service: "admin-simulation-worker", enabled: false })}\n`);
  await waitForShutdown();
} else {
  const store = new PostgresSimulationStore(
    secret("ADMIN_SIMULATION_DATABASE_URL", "ADMIN_SIMULATION_DATABASE_URL_FILE"),
    integer("ADMIN_SIMULATION_POOL_SIZE", 3, 1, 10),
  );
  if (!(await store.ready())) throw new Error("ADMIN_SIMULATION_DATABASE_NOT_READY");
  const processor = new AdminSimulationProcessor(
    store,
    process.env.ADMIN_SIMULATION_WORKER_ID?.trim() || "admin-simulation-worker-1",
    {
      leaseMs: integer("ADMIN_SIMULATION_LEASE_MS", 120_000, 30_000, 900_000),
      maxAttempts: integer("ADMIN_SIMULATION_MAX_ATTEMPTS", 3, 1, 10),
    },
  );
  const pollMs = integer("ADMIN_SIMULATION_POLL_MS", 1_000, 100, 30_000);
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
        service: "admin-simulation-worker",
        error_code: error instanceof Error ? error.message.slice(0, 128) : "SIMULATION_LOOP_FAILED",
      })}\n`);
      await delay(pollMs);
    }
  }
  await store.close();
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}
function secret(direct: string, file: string): string {
  const value = process.env[direct]?.trim();
  return value || readFileSync(required(file), "utf8").trim();
}
function boolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name}_INVALID`);
}
function integer(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name}_INVALID`);
  return value;
}
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function waitForShutdown(): Promise<void> {
  return new Promise((resolve) => {
    const stop = () => resolve();
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  });
}

