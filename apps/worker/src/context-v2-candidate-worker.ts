import {
  ContextV2CandidateRunner,
  type ContextV2CandidateEvaluationStore,
} from "./context-v2-evaluation.js";
import type { ContextV2CandidateModelPort } from "./context-v2-candidate.js";

export interface ContextV2CandidateWorkerStore
  extends ContextV2CandidateEvaluationStore {
  assertContextV2CaptureReadReady(): Promise<void>;
}

/**
 * Source-only async worker boundary. Initialization must succeed before any
 * queue claim, so missing capture SELECT permission cannot consume attempts.
 */
export class ContextV2CandidateWorker {
  private initialized = false;
  private readonly runner: ContextV2CandidateRunner;

  constructor(
    private readonly store: ContextV2CandidateWorkerStore,
    model: ContextV2CandidateModelPort,
  ) {
    this.runner = new ContextV2CandidateRunner(store, model);
  }

  async initialize(): Promise<void> {
    await this.store.assertContextV2CaptureReadReady();
    this.initialized = true;
  }

  async processOne() {
    if (!this.initialized) {
      throw new Error("CONTEXT_V2_CANDIDATE_WORKER_NOT_READY");
    }
    return this.runner.processOne();
  }
}
