import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type {
  AnnotationConfidenceV1,
  AnnotationScopeV1,
} from "@lana/contracts";
import type { ValidationMessage } from "@lana/dataset-review";
import { withTransaction } from "@lana/database";

// Persistence for AI/heuristic pre-label runs. Stores model, model version,
// prompt version, schema version, run id and per-item input checksum; enforces
// per-item idempotency; writes PROPOSED annotations only (source = AI/HEURISTIC).
// No audit events — an AI proposal is not a reviewer action.

export interface CreatePrelabelRunInput {
  readonly projectId: string;
  readonly source: "AI" | "HEURISTIC";
  readonly model?: string | null;
  readonly modelVersion?: string | null;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly totalItems: number;
  readonly createdBySubject: string;
}

export interface PrelabelProposalRow {
  readonly labelCode: string;
  readonly scope: AnnotationScopeV1;
  readonly turnIndex: number;
  readonly secondTurnIndex: number | null;
  readonly evidenceText: string | null;
  readonly evidenceStart: number | null;
  readonly evidenceEnd: number | null;
  readonly confidence: AnnotationConfidenceV1;
}

export interface PersistPrelabelProposalsInput {
  readonly runId: string;
  readonly projectItemId: string;
  readonly modelVersion: string;
  readonly proposals: readonly PrelabelProposalRow[];
  readonly validationErrors: readonly unknown[];
}

export interface RecordPrelabelItemInput {
  readonly runId: string;
  readonly projectItemId: string;
  readonly inputChecksum: string;
  readonly status: "SUCCEEDED" | "VALIDATION_FAILED" | "FAILED";
  readonly proposedCount: number;
  readonly validationError: string | null;
  readonly latencyMs: number | null;
  readonly attempts: number;
}

interface MessageRow {
  turn_index: number;
  role: "CUSTOMER" | "SHOP" | "UNKNOWN";
  message_id: string;
  redacted_text: string;
}

const DONE_STATUSES = new Set(["SUCCEEDED", "VALIDATION_FAILED"]);

export class PostgresDatasetPrelabelStore {
  private readonly pool: Pool;

  constructor(connectionString: string, options: { poolMax?: number } = {}) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({
      connectionString,
      max: options.poolMax ?? 5,
      idleTimeoutMillis: 30_000,
    });
  }

  async ready(): Promise<boolean> {
    try {
      const result = await this.pool.query<{ ok: number }>("SELECT 1 AS ok");
      return result.rows[0]?.ok === 1;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createRun(input: CreatePrelabelRunInput): Promise<string> {
    const runId = randomUUID();
    await this.pool.query(
      `INSERT INTO dataset_prelabel_runs (
         prelabel_run_id, project_id, source, model, model_version, prompt_version,
         schema_version, status, total_items, started_at, created_by_subject
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PROCESSING',$8, now(), $9)`,
      [
        runId,
        input.projectId,
        input.source,
        input.model ?? null,
        input.modelVersion ?? null,
        input.promptVersion,
        input.schemaVersion,
        input.totalItems,
        input.createdBySubject,
      ],
    );
    return runId;
  }

  // Reviewer projection only: never selects raw ciphertext columns.
  async loadItemMessages(projectItemId: string): Promise<readonly ValidationMessage[] | null> {
    const result = await this.pool.query<MessageRow>(
      `SELECT m.turn_index, m.role, m.message_id, m.redacted_text
       FROM dataset_messages m
       JOIN dataset_project_items pi ON pi.conversation_id = m.conversation_id
       WHERE pi.project_item_id = $1
       ORDER BY m.turn_index ASC`,
      [projectItemId],
    );
    if (result.rows.length === 0) return null;
    return result.rows.map((row) => ({
      turnIndex: row.turn_index,
      role: row.role,
      messageId: row.message_id,
      redactedText: row.redacted_text,
    }));
  }

  // Idempotency guard: a successful/validation-complete item under the identical
  // input checksum is not re-run; a PENDING/FAILED row is re-runnable.
  async reserveRunItem(input: {
    runId: string;
    projectItemId: string;
    inputChecksum: string;
  }): Promise<"RESERVED" | "ALREADY_DONE"> {
    const inserted = await this.pool.query<{ prelabel_run_item_id: string }>(
      `INSERT INTO dataset_prelabel_run_items (
         prelabel_run_item_id, prelabel_run_id, project_item_id, input_checksum, status
       ) VALUES ($1,$2,$3,$4,'PENDING')
       ON CONFLICT (prelabel_run_id, project_item_id, input_checksum) DO NOTHING
       RETURNING prelabel_run_item_id`,
      [randomUUID(), input.runId, input.projectItemId, input.inputChecksum],
    );
    if (inserted.rows[0]) return "RESERVED";

    const existing = await this.pool.query<{ status: string }>(
      `SELECT status FROM dataset_prelabel_run_items
       WHERE prelabel_run_id = $1 AND project_item_id = $2 AND input_checksum = $3`,
      [input.runId, input.projectItemId, input.inputChecksum],
    );
    const status = existing.rows[0]?.status;
    return status && DONE_STATUSES.has(status) ? "ALREADY_DONE" : "RESERVED";
  }

  async persistProposals(input: PersistPrelabelProposalsInput): Promise<void> {
    await withTransaction(this.pool, async (client) => {
      for (const proposal of input.proposals) {
        await client.query(
          `INSERT INTO dataset_annotations (
             annotation_id, project_item_id, label_code, scope, turn_index,
             second_turn_index, evidence_text, evidence_start, evidence_end,
             confidence, source, source_version, status, prelabel_run_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'AI',$11,'PROPOSED',$12)`,
          [
            randomUUID(),
            input.projectItemId,
            proposal.labelCode,
            proposal.scope,
            proposal.turnIndex,
            proposal.secondTurnIndex,
            proposal.evidenceText,
            proposal.evidenceStart,
            proposal.evidenceEnd,
            proposal.confidence,
            input.modelVersion,
            input.runId,
          ],
        );
      }
      if (input.validationErrors.length > 0) {
        // Route the item to human review; do not persist the invalid annotations.
        await client.query(
          `UPDATE dataset_project_items
           SET queue_reason = 'PRELABEL_VALIDATION_ERROR', updated_at = now()
           WHERE project_item_id = $1`,
          [input.projectItemId],
        );
      }
    });
  }

  async recordItemOutcome(input: RecordPrelabelItemInput): Promise<void> {
    await this.pool.query(
      `UPDATE dataset_prelabel_run_items SET
         status = $4, proposed_count = $5, validation_error = $6, latency_ms = $7,
         attempt_count = $8, updated_at = now()
       WHERE prelabel_run_id = $1 AND project_item_id = $2 AND input_checksum = $3`,
      [
        input.runId,
        input.projectItemId,
        input.inputChecksum,
        input.status,
        input.proposedCount,
        input.validationError,
        input.latencyMs,
        input.attempts,
      ],
    );
  }

  async finalizeRun(
    runId: string,
    summary: { status: "COMPLETED" | "FAILED"; processedItems: number; failedItems: number; costMetadata?: unknown },
  ): Promise<void> {
    await this.pool.query(
      `UPDATE dataset_prelabel_runs SET
         status = $2, processed_items = $3, failed_items = $4,
         cost_metadata = $5::jsonb, completed_at = now()
       WHERE prelabel_run_id = $1`,
      [
        runId,
        summary.status,
        summary.processedItems,
        summary.failedItems,
        JSON.stringify(summary.costMetadata ?? {}),
      ],
    );
  }
}
