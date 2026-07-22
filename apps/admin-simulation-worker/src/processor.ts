import { aggregateResults, evaluateConversation } from "./evaluator.js";
import type { SimulationStore } from "./types.js";

export interface SimulationProcessorOptions {
  readonly leaseMs: number;
  readonly maxAttempts: number;
}

export class AdminSimulationProcessor {
  constructor(
    private readonly store: SimulationStore,
    private readonly workerId: string,
    private readonly options: SimulationProcessorOptions,
  ) {}

  async processOne(): Promise<boolean> {
    const run = await this.store.claim(this.workerId, this.options.leaseMs, this.options.maxAttempts);
    if (run === null) return false;
    try {
      if (run.sideEffects !== "DISABLED") {
        throw Object.assign(new Error("SIMULATION_SIDE_EFFECTS_MUST_BE_DISABLED"), { retryable: false });
      }
      const policies = await this.store.loadPolicies(run);
      if (!(await this.store.renewLease(run, this.options.leaseMs))) return true;
      const history = await this.store.loadHistory(run);
      const results = history.map((conversation) => evaluateConversation(conversation, policies));
      const aggregate = aggregateResults({
        baselineVersionIds: policies.baseline.map(({ versionId }) => versionId),
        candidateVersionIds: policies.candidate.map(({ versionId }) => versionId),
        baselineSource: policies.baselineSource,
      }, results);
      await this.store.complete(run, results, aggregate);
    } catch (error: unknown) {
      const retryable = isRetryable(error);
      await this.store.fail(run, errorCode(error), retryable, this.options.maxAttempts);
      process.stderr.write(`${JSON.stringify({
        level: "error",
        service: "admin-simulation-worker",
        simulation_id: run.simulationId,
        attempt_count: run.attemptCount,
        retryable,
        error_code: errorCode(error),
      })}\n`);
    }
    return true;
  }
}

function isRetryable(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "retryable" in error) {
    return (error as { retryable?: unknown }).retryable === true;
  }
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  return code.startsWith("08") || ["40001", "40P01", "53P01", "55P03", "57P01", "57P02", "57P03"].includes(code);
}

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "SIMULATION_UNEXPECTED_ERROR";
  const safe = message.trim().toUpperCase().replace(/[^A-Z0-9_:-]/gu, "_");
  return (safe || "SIMULATION_UNEXPECTED_ERROR").slice(0, 128);
}
