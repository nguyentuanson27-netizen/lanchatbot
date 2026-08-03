import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  buildImportReport,
  computeConversationImport,
  sha256Hex,
  type ConversationImport,
  type ImportReport,
} from "@lana/dataset-review";
import { LocalEnvelopeCipher, withTransaction } from "@lana/database";

// Persistence for the AI Evaluation & Dataset Review import pipeline. Raw payload
// and raw message text are envelope-encrypted at rest; only redacted projections
// are ever selected for reviewers. All heavy parse/redact/dedup logic lives in
// @lana/dataset-review; this layer is thin SQL + encryption.

export interface DatasetReviewStoreOptions {
  readonly rawRetentionDays?: number;
  readonly poolMax?: number;
}

export interface CreateDatasetInput {
  readonly name: string;
  readonly description?: string | null;
  readonly sourceType: "REDIS_TRANSCRIPT_JSON" | "JSONL" | "CSV" | "PRODUCTION_SAMPLE";
  readonly sourceChecksum: string;
  readonly originalFilename?: string | null;
  readonly createdBySubject: string;
}

export interface CreateDatasetResult {
  readonly datasetId: string;
  readonly created: boolean;
}

export interface ImportRecord {
  readonly sourceKey: string;
  readonly sourceTtl?: number | null;
  // The transcript string to parse.
  readonly value: string;
  // The full original record, stored encrypted and immutable.
  readonly rawPayload: unknown;
}

export type ImportRecordOutcome =
  | { readonly status: "IMPORTED"; readonly sourceKey: string; readonly conversationId: string }
  | { readonly status: "DUPLICATE"; readonly sourceKey: string }
  | { readonly status: "FAILED"; readonly sourceKey: string; readonly error: string };

export interface ImportRecordsResult {
  readonly outcomes: readonly ImportRecordOutcome[];
  readonly report: ImportReport;
}

function aadRawItem(datasetId: string, sourceKeyHash: string): string {
  return `dataset-review:raw-item:v1:${datasetId}:${sourceKeyHash}`;
}

function aadMessage(conversationId: string, turnIndex: number): string {
  return `dataset-review:message:v1:${conversationId}:${turnIndex}`;
}

export class PostgresDatasetReviewStore {
  private readonly pool: Pool;
  private readonly cipher: LocalEnvelopeCipher;
  private readonly rawRetentionDays: number;

  constructor(
    connectionString: string,
    cipher: LocalEnvelopeCipher,
    options: DatasetReviewStoreOptions = {},
  ) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.cipher = cipher;
    this.rawRetentionDays = options.rawRetentionDays ?? 120;
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

  private expiresAt(now: Date): Date {
    return new Date(now.getTime() + this.rawRetentionDays * 86_400_000);
  }

  // Idempotent by source_checksum: re-importing the same file returns the same
  // dataset row with created=false rather than duplicating.
  async createDataset(input: CreateDatasetInput): Promise<CreateDatasetResult> {
    const datasetId = randomUUID();
    const inserted = await this.pool.query<{ dataset_id: string }>(
      `INSERT INTO dataset_review_datasets (
         dataset_id, name, description, source_type, original_filename,
         source_checksum, status, created_by_subject
       ) VALUES ($1,$2,$3,$4,$5,$6,'IMPORTING',$7)
       ON CONFLICT (source_checksum) DO NOTHING
       RETURNING dataset_id`,
      [
        datasetId,
        input.name,
        input.description ?? null,
        input.sourceType,
        input.originalFilename ?? null,
        input.sourceChecksum,
        input.createdBySubject,
      ],
    );
    const row = inserted.rows[0];
    if (row) return { datasetId: row.dataset_id, created: true };

    const existing = await this.pool.query<{ dataset_id: string }>(
      "SELECT dataset_id FROM dataset_review_datasets WHERE source_checksum = $1",
      [input.sourceChecksum],
    );
    const found = existing.rows[0];
    if (!found) throw new Error("DATASET_CONFLICT_ROW_MISSING");
    return { datasetId: found.dataset_id, created: false };
  }

  // Import a batch of records. A single record failure never aborts the batch:
  // its raw row is marked FAILED and the loop continues. Re-importing an already
  // parsed record is a DUPLICATE no-op (idempotent).
  async importRecords(
    datasetId: string,
    records: readonly ImportRecord[],
    now: Date = new Date(),
  ): Promise<ImportRecordsResult> {
    const outcomes: ImportRecordOutcome[] = [];
    const imported: ConversationImport[] = [];
    let failed = 0;

    for (const record of records) {
      try {
        const result = await this.importOne(datasetId, record, now);
        outcomes.push(
          result.duplicate
            ? { status: "DUPLICATE", sourceKey: record.sourceKey }
            : { status: "IMPORTED", sourceKey: record.sourceKey, conversationId: result.conversationId },
        );
        if (!result.duplicate) imported.push(result.compute);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message.slice(0, 500) : "IMPORT_FAILED";
        outcomes.push({ status: "FAILED", sourceKey: record.sourceKey, error: message });
        await this.markRawFailed(datasetId, record.sourceKey, message).catch(() => undefined);
      }
    }

    return { outcomes, report: buildImportReport(imported, failed) };
  }

  private async importOne(
    datasetId: string,
    record: ImportRecord,
    now: Date,
  ): Promise<{ duplicate: true } | { duplicate: false; conversationId: string; compute: ConversationImport }> {
    const sourceKeyHash = sha256Hex(record.sourceKey);
    const rawChecksum = sha256Hex(JSON.stringify(record.rawPayload));
    const rawItemId = randomUUID();
    const conversationId = randomUUID();
    const compute = computeConversationImport(record.value, record.sourceKey);
    const payloadBundle = this.cipher.encryptJson(
      record.rawPayload,
      aadRawItem(datasetId, sourceKeyHash),
      this.expiresAt(now),
    );

    return withTransaction(this.pool, async (client) => {
      const rawInsert = await client.query<{ raw_item_id: string }>(
        `INSERT INTO dataset_raw_items (
           raw_item_id, dataset_id, source_key, source_key_hash, source_ttl,
           raw_checksum, raw_payload_ciphertext, raw_payload_nonce,
           raw_payload_auth_tag, raw_payload_encrypted_dek, raw_payload_key_ref,
           import_status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PARSED')
         ON CONFLICT (dataset_id, source_key_hash) DO NOTHING
         RETURNING raw_item_id`,
        [
          rawItemId,
          datasetId,
          sourceKeyHash,
          sourceKeyHash,
          record.sourceTtl ?? null,
          rawChecksum,
          payloadBundle.ciphertext,
          payloadBundle.nonce,
          payloadBundle.authTag,
          payloadBundle.encryptedDek,
          payloadBundle.keyRef,
        ],
      );
      if (!rawInsert.rows[0]) {
        // Already imported under this source key: idempotent no-op.
        return { duplicate: true };
      }

      await client.query(
        `INSERT INTO dataset_conversations (
           conversation_id, dataset_id, raw_item_id, conversation_key_hash,
           message_count, customer_message_count, shop_message_count, length_bin,
           duplicate_group_id, quality_flags, normalization_version, redaction_version
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          conversationId,
          datasetId,
          rawItemId,
          compute.conversationKeyHash,
          compute.messageCount,
          compute.customerMessageCount,
          compute.shopMessageCount,
          compute.lengthBin,
          compute.duplicateGroupId,
          compute.qualityFlags,
          compute.normalizationVersion,
          compute.redactionVersion,
        ],
      );

      for (const message of compute.messages) {
        const rawText = this.cipher.encryptValue(
          message.rawText,
          aadMessage(conversationId, message.turnIndex),
        );
        await client.query(
          `INSERT INTO dataset_messages (
             message_id, conversation_id, turn_index, role,
             raw_text_ciphertext, raw_text_nonce, raw_text_auth_tag, raw_text_key_ref,
             redacted_text, message_checksum, starts_with_role_prefix
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            randomUUID(),
            conversationId,
            message.turnIndex,
            message.role,
            rawText.ciphertext,
            rawText.nonce,
            rawText.authTag,
            this.cipher.keyRef,
            message.redactedText,
            message.messageChecksum,
            message.startsWithRolePrefix,
          ],
        );
      }

      return { duplicate: false, conversationId, compute };
    });
  }

  private async markRawFailed(datasetId: string, sourceKey: string, error: string): Promise<void> {
    const sourceKeyHash = sha256Hex(sourceKey);
    await this.pool.query(
      `INSERT INTO dataset_raw_items (
         raw_item_id, dataset_id, source_key, source_key_hash, raw_checksum,
         import_status, import_error
       ) VALUES ($1,$2,$3,$4,$5,'FAILED',$6)
       ON CONFLICT (dataset_id, source_key_hash)
       DO UPDATE SET import_status = 'FAILED', import_error = EXCLUDED.import_error`,
      [randomUUID(), datasetId, sourceKeyHash, sourceKeyHash, sha256Hex(sourceKey), error],
    );
  }

  async finalizeDataset(
    datasetId: string,
    summary: { total: number; imported: number; failed: number; report: unknown },
  ): Promise<void> {
    await this.pool.query(
      `UPDATE dataset_review_datasets
       SET status = 'READY', total_items = $2, imported_items = $3, failed_items = $4,
           import_report = $5::jsonb, updated_at = now()
       WHERE dataset_id = $1`,
      [datasetId, summary.total, summary.imported, summary.failed, JSON.stringify(summary.report)],
    );
  }

  async listDatasets(limit = 50): Promise<readonly Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT dataset_id, name, source_type, status, total_items, imported_items,
              failed_items, created_at
       FROM dataset_review_datasets
       ORDER BY created_at DESC, dataset_id DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    return result.rows;
  }

  async getDataset(datasetId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT dataset_id, name, description, source_type, status, total_items,
              imported_items, failed_items, import_report, created_at, updated_at
       FROM dataset_review_datasets WHERE dataset_id = $1`,
      [datasetId],
    );
    return result.rows[0] ?? null;
  }

  async listConversations(
    datasetId: string,
    limit = 50,
  ): Promise<readonly Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT conversation_id, message_count, customer_message_count,
              shop_message_count, length_bin, duplicate_group_id, quality_flags
       FROM dataset_conversations
       WHERE dataset_id = $1
       ORDER BY created_at DESC, conversation_id DESC
       LIMIT $2`,
      [datasetId, Math.min(Math.max(limit, 1), 200)],
    );
    return result.rows;
  }

  // Reviewer-facing: redacted text only. Raw ciphertext columns are never
  // selected here.
  async getConversationMessages(
    conversationId: string,
  ): Promise<readonly Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT turn_index, role, redacted_text, starts_with_role_prefix
       FROM dataset_messages
       WHERE conversation_id = $1
       ORDER BY turn_index ASC`,
      [conversationId],
    );
    return result.rows;
  }
}

export { type ImportReport } from "@lana/dataset-review";
