import type {
  AnnotationConfidenceV1,
  AnnotationScopeV1,
  LabelSchemaV1,
  PrelabelResponseV1,
} from "@lana/contracts";
import {
  validatePrelabelAnnotation,
  type EvidenceValidationError,
  type ValidationMessage,
} from "@lana/dataset-review";
import {
  buildPrelabelSystemInstruction,
  buildPrelabelUserPrompt,
  computePrelabelInputChecksum,
  type PrelabelInputContext,
} from "./dataset-prelabel-prompt.js";

// Orchestrates AI pre-labelling for a project's items. Provider-adaptable: it
// talks to a PrelabelModelPort (production wires the Vertex gateway; tests inject
// a mock). Guarantees: redacted input only, strict output, evidence exact-match +
// role validation, invalid annotations never persisted, AI writes PROPOSED only,
// per-item idempotency, bounded retry, and partial-failure isolation.

export interface PrelabelModelResult {
  readonly response: PrelabelResponseV1;
  readonly modelVersion: string;
  readonly latencyMs: number;
  readonly tokenUsage: Readonly<Record<string, number>>;
}

export interface PrelabelModelPort {
  // May throw a provider error carrying a boolean `retryable` field.
  runPrelabel(systemInstruction: string, userPrompt: string): Promise<PrelabelModelResult>;
}

export interface PrelabelProposal {
  readonly labelCode: string;
  readonly scope: AnnotationScopeV1;
  readonly turnIndex: number;
  readonly secondTurnIndex: number | null;
  readonly evidenceText: string | null;
  readonly evidenceStart: number | null;
  readonly evidenceEnd: number | null;
  readonly confidence: AnnotationConfidenceV1;
}

export interface PrelabelValidationError {
  readonly labelCode: string;
  readonly turnIndex: number;
  readonly error: EvidenceValidationError;
}

export interface PersistProposalsInput {
  readonly runId: string;
  readonly projectItemId: string;
  readonly modelVersion: string;
  readonly proposals: readonly PrelabelProposal[];
  readonly validationErrors: readonly PrelabelValidationError[];
}

export interface RecordItemOutcomeInput {
  readonly runId: string;
  readonly projectItemId: string;
  readonly inputChecksum: string;
  readonly status: "SUCCEEDED" | "VALIDATION_FAILED" | "FAILED";
  readonly proposedCount: number;
  readonly validationError: string | null;
  readonly latencyMs: number | null;
  readonly attempts: number;
}

export interface PrelabelStorePort {
  loadItemMessages(projectItemId: string): Promise<readonly ValidationMessage[] | null>;
  // Idempotency guard keyed on (runId, projectItemId, inputChecksum).
  reserveRunItem(input: {
    runId: string;
    projectItemId: string;
    inputChecksum: string;
  }): Promise<"RESERVED" | "ALREADY_DONE">;
  persistProposals(input: PersistProposalsInput): Promise<void>;
  recordItemOutcome(input: RecordItemOutcomeInput): Promise<void>;
}

export interface DatasetPrelabelRunnerOptions {
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly model: string;
  readonly modelVersion?: string | null;
  readonly guidelineVersion: string;
  readonly labelSchema: LabelSchemaV1;
  readonly maxAttempts?: number;
}

export type ItemOutcome =
  | { readonly status: "SUCCEEDED"; readonly proposedCount: number; readonly invalidCount: number }
  | { readonly status: "VALIDATION_FAILED"; readonly proposedCount: number; readonly invalidCount: number }
  | { readonly status: "SKIPPED" }
  | { readonly status: "FAILED"; readonly error: string };

export interface BatchSummary {
  readonly succeeded: number;
  readonly validationFailed: number;
  readonly failed: number;
  readonly skipped: number;
}

function isRetryable(error: unknown): boolean {
  return Boolean(error) && (error as { retryable?: unknown }).retryable === true;
}

function errorCode(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 200);
  return "PRELABEL_MODEL_ERROR";
}

export class DatasetPrelabelRunner {
  private readonly maxAttempts: number;
  private readonly context: PrelabelInputContext;

  constructor(
    private readonly model: PrelabelModelPort,
    private readonly store: PrelabelStorePort,
    private readonly options: DatasetPrelabelRunnerOptions,
  ) {
    this.maxAttempts = Math.min(Math.max(options.maxAttempts ?? 3, 1), 10);
    this.context = {
      promptVersion: options.promptVersion,
      schemaVersion: options.schemaVersion,
      model: options.model,
      modelVersion: options.modelVersion ?? null,
      guidelineVersion: options.guidelineVersion,
    };
  }

  async runItem(runId: string, projectItemId: string): Promise<ItemOutcome> {
    const messages = await this.store.loadItemMessages(projectItemId);
    if (!messages) return { status: "FAILED", error: "ITEM_NOT_FOUND" };

    const inputChecksum = computePrelabelInputChecksum(
      this.options.labelSchema,
      messages,
      this.context,
    );
    const reservation = await this.store.reserveRunItem({ runId, projectItemId, inputChecksum });
    if (reservation === "ALREADY_DONE") return { status: "SKIPPED" };

    const systemInstruction = buildPrelabelSystemInstruction(this.options.labelSchema);
    const userPrompt = buildPrelabelUserPrompt(messages, this.context);

    let attempts = 0;
    let modelResult: PrelabelModelResult | null = null;
    let lastError: unknown = null;
    while (attempts < this.maxAttempts) {
      attempts += 1;
      try {
        modelResult = await this.model.runPrelabel(systemInstruction, userPrompt);
        break;
      } catch (error) {
        lastError = error;
        if (!isRetryable(error) || attempts >= this.maxAttempts) break;
      }
    }

    if (!modelResult) {
      await this.store.recordItemOutcome({
        runId,
        projectItemId,
        inputChecksum,
        status: "FAILED",
        proposedCount: 0,
        validationError: errorCode(lastError),
        latencyMs: null,
        attempts,
      });
      return { status: "FAILED", error: errorCode(lastError) };
    }

    const proposals: PrelabelProposal[] = [];
    const validationErrors: PrelabelValidationError[] = [];
    for (const annotation of modelResult.response.annotations) {
      const result = validatePrelabelAnnotation(annotation, this.options.labelSchema, messages);
      if (!result.ok) {
        // Invalid annotations are never persisted (§10.4); they are recorded so
        // the item is routed to human review.
        validationErrors.push({
          labelCode: annotation.labelCode,
          turnIndex: annotation.turnIndex,
          error: result.error,
        });
        continue;
      }
      proposals.push({
        labelCode: annotation.labelCode,
        scope: annotation.scope,
        turnIndex: annotation.turnIndex,
        secondTurnIndex: annotation.secondTurnIndex,
        evidenceText: annotation.evidenceText,
        evidenceStart: result.evidence?.startOffset ?? null,
        evidenceEnd: result.evidence?.endOffset ?? null,
        confidence: annotation.confidence,
      });
    }

    await this.store.persistProposals({
      runId,
      projectItemId,
      modelVersion: modelResult.modelVersion,
      proposals,
      validationErrors,
    });

    const status = validationErrors.length > 0 ? "VALIDATION_FAILED" : "SUCCEEDED";
    await this.store.recordItemOutcome({
      runId,
      projectItemId,
      inputChecksum,
      status,
      proposedCount: proposals.length,
      validationError: validationErrors.length > 0 ? JSON.stringify(validationErrors).slice(0, 2000) : null,
      latencyMs: modelResult.latencyMs,
      attempts,
    });

    return { status, proposedCount: proposals.length, invalidCount: validationErrors.length };
  }

  // Partial-failure isolation: an unexpected error on one item never aborts the
  // batch. Each item is independently reserved, run and recorded.
  async runBatch(runId: string, projectItemIds: readonly string[]): Promise<BatchSummary> {
    const summary = { succeeded: 0, validationFailed: 0, failed: 0, skipped: 0 };
    for (const projectItemId of projectItemIds) {
      let outcome: ItemOutcome;
      try {
        outcome = await this.runItem(runId, projectItemId);
      } catch (error) {
        outcome = { status: "FAILED", error: errorCode(error) };
      }
      if (outcome.status === "SUCCEEDED") summary.succeeded += 1;
      else if (outcome.status === "VALIDATION_FAILED") summary.validationFailed += 1;
      else if (outcome.status === "SKIPPED") summary.skipped += 1;
      else summary.failed += 1;
    }
    return summary;
  }
}
