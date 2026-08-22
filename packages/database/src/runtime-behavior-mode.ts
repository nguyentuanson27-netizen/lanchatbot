import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";

export type RuntimeConfirmationMode = "LEGACY" | "V2_SHADOW" | "V2_ACTIVE" | "CLARIFY_ONLY";
export type RuntimeSalesAuthorityMode = "LEGACY" | "SHADOW" | "COMMERCE";
export type RuntimeStateReadMode = "LEGACY" | "SHADOW" | "V2";
export type RuntimeBehaviorModeSource = "DATABASE" | "CACHE" | "LAST_KNOWN_GOOD" | "STARTUP_DEFAULT" | "FAIL_SAFE";

export interface RuntimeBehaviorModePayloadRecord {
  readonly confirmationMode: RuntimeConfirmationMode;
  readonly salesAuthorityMode: RuntimeSalesAuthorityMode;
  readonly stateReadMode: RuntimeStateReadMode;
  readonly authorityBundleHash?: string | null;
}
export interface RuntimeBehaviorModeVersionRecord extends RuntimeBehaviorModePayloadRecord {
  readonly schemaVersion: 1;
  readonly modeVersionId: string;
  readonly pageId: string;
  readonly channel: string;
  readonly contentHash: string;
  readonly createdBy: string;
  readonly reason: string;
  readonly createdAt: string;
}
export interface RuntimeBehaviorModePointerRecord {
  readonly version: RuntimeBehaviorModeVersionRecord;
  readonly pointerRevision: number;
  readonly updatedBy: string;
  readonly reason: string;
  readonly updatedAt: string;
}
export interface RuntimeBehaviorModeResolutionAuditRecord {
  readonly resolutionId: string;
  readonly pageId: string;
  readonly channel: string;
  readonly confirmationMode: RuntimeConfirmationMode;
  readonly modeVersionId: string | null;
  readonly contentHash: string | null;
  readonly pointerRevision: number | null;
  readonly source: RuntimeBehaviorModeSource;
  readonly status: "RESOLVED" | "FALLBACK" | "REJECTED";
  readonly reasonCodes: readonly string[];
  readonly workerId: string;
  readonly pointerUpdatedAt: string | null;
  readonly resolvedAt: string;
  readonly propagationMs: number | null;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}
export function runtimeBehaviorModeContentHash(payload: RuntimeBehaviorModePayloadRecord): string {
  const canonicalPayload = {
    confirmationMode: payload.confirmationMode,
    salesAuthorityMode: payload.salesAuthorityMode,
    schemaVersion: 1,
    stateReadMode: payload.stateReadMode,
    ...(payload.salesAuthorityMode === "COMMERCE"
      ? { authorityBundleHash: payload.authorityBundleHash ?? null }
      : {}),
  };
  return `sha256:${createHash("sha256").update(canonicalJson(canonicalPayload), "utf8").digest("hex")}`;
}
function requiredText(value: string, code: string, maximum = 256): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new Error(code);
  return normalized;
}
function dateTime(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}
function versionFromRow(row: Record<string, unknown>): RuntimeBehaviorModeVersionRecord {
  return {
    schemaVersion: 1,
    modeVersionId: String(row.mode_version_id),
    pageId: String(row.page_id),
    channel: String(row.channel),
    confirmationMode: String(row.confirmation_mode) as RuntimeConfirmationMode,
    salesAuthorityMode: String(row.sales_authority_mode) as RuntimeSalesAuthorityMode,
    stateReadMode: String(row.state_read_mode) as RuntimeStateReadMode,
    authorityBundleHash: row.authority_bundle_hash == null ? null : String(row.authority_bundle_hash),
    contentHash: String(row.content_hash),
    createdBy: String(row.created_by),
    reason: String(row.version_reason),
    createdAt: dateTime(row.created_at),
  };
}
function pointerFromRow(row: Record<string, unknown>): RuntimeBehaviorModePointerRecord {
  return {
    version: versionFromRow(row),
    pointerRevision: Number(row.pointer_revision),
    updatedBy: String(row.updated_by),
    reason: String(row.pointer_reason),
    updatedAt: dateTime(row.updated_at),
  };
}
async function rollbackQuietly(client: PoolClient): Promise<void> {
  try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
}

export class PostgresRuntimeBehaviorModeStore {
  private readonly pool: Pool;
  constructor(connectionString: string, maxPoolSize = 3) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: maxPoolSize });
  }

  async loadActiveMode(input: { readonly pageId: string; readonly channel: string }): Promise<RuntimeBehaviorModePointerRecord | null> {
    const result = await this.pool.query(
      `SELECT v.mode_version_id, v.page_id, v.channel, v.schema_version,
               v.confirmation_mode, v.sales_authority_mode, v.state_read_mode, v.authority_bundle_hash,
              v.content_hash, v.created_by, v.reason AS version_reason, v.created_at,
              p.pointer_revision, p.updated_by, p.reason AS pointer_reason, p.updated_at
       FROM runtime_behavior_mode_pointers p
       JOIN runtime_behavior_mode_versions v ON v.mode_version_id = p.active_version_id
       WHERE p.page_id = $1 AND p.channel = $2`,
      [requiredText(input.pageId, "RUNTIME_BEHAVIOR_PAGE_INVALID", 64), requiredText(input.channel, "RUNTIME_BEHAVIOR_CHANNEL_INVALID", 32).toUpperCase()],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? pointerFromRow(row) : null;
  }

  async createVersion(input: {
    readonly pageId: string; readonly channel: string;
    readonly payload: RuntimeBehaviorModePayloadRecord;
    readonly actor: string; readonly reason: string; readonly now?: Date;
  }): Promise<RuntimeBehaviorModeVersionRecord> {
    if (input.payload.stateReadMode !== "LEGACY" ||
        (input.payload.salesAuthorityMode !== "LEGACY" && input.payload.salesAuthorityMode !== "COMMERCE")) {
      throw new Error("RUNTIME_BEHAVIOR_NON_CONFIRMATION_TRACK_FORBIDDEN");
    }
    const authorityBundleHash = input.payload.authorityBundleHash ?? null;
    if (input.payload.salesAuthorityMode === "LEGACY" && authorityBundleHash !== null) {
      throw new Error("RUNTIME_BEHAVIOR_LEGACY_BUNDLE_INVALID");
    }
    if (input.payload.salesAuthorityMode === "COMMERCE" &&
        !/^[a-f0-9]{64}$/u.test(authorityBundleHash ?? "")) {
      throw new Error("RUNTIME_BEHAVIOR_COMMERCE_BUNDLE_INVALID");
    }
    const now = input.now ?? new Date();
    if (Number.isNaN(now.getTime())) throw new Error("RUNTIME_BEHAVIOR_TIMESTAMP_INVALID");
    const result = await this.pool.query(
      `INSERT INTO runtime_behavior_mode_versions (
         page_id, channel, schema_version, confirmation_mode, sales_authority_mode,
         state_read_mode, authority_bundle_hash, content_hash, created_by, reason, created_at
       ) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING mode_version_id, page_id, channel, schema_version,
         confirmation_mode, sales_authority_mode, state_read_mode, authority_bundle_hash,
         content_hash, created_by, reason AS version_reason, created_at`,
      [requiredText(input.pageId, "RUNTIME_BEHAVIOR_PAGE_INVALID", 64), requiredText(input.channel, "RUNTIME_BEHAVIOR_CHANNEL_INVALID", 32).toUpperCase(),
        input.payload.confirmationMode, input.payload.salesAuthorityMode, input.payload.stateReadMode,
        authorityBundleHash, runtimeBehaviorModeContentHash(input.payload), requiredText(input.actor, "RUNTIME_BEHAVIOR_ACTOR_INVALID"),
        requiredText(input.reason, "RUNTIME_BEHAVIOR_REASON_INVALID", 500), now],
    );
    return versionFromRow(result.rows[0] as Record<string, unknown>);
  }

  async activateVersion(input: {
    readonly pageId: string; readonly channel: string; readonly targetVersionId: string;
    readonly expectedPointerRevision: number; readonly actor: string; readonly reason: string; readonly now?: Date;
  }): Promise<RuntimeBehaviorModePointerRecord> {
    if (!Number.isInteger(input.expectedPointerRevision) || input.expectedPointerRevision < 0) throw new Error("RUNTIME_BEHAVIOR_POINTER_REVISION_INVALID");
    const pageId = requiredText(input.pageId, "RUNTIME_BEHAVIOR_PAGE_INVALID", 64);
    const channel = requiredText(input.channel, "RUNTIME_BEHAVIOR_CHANNEL_INVALID", 32).toUpperCase();
    const actor = requiredText(input.actor, "RUNTIME_BEHAVIOR_ACTOR_INVALID");
    const reason = requiredText(input.reason, "RUNTIME_BEHAVIOR_REASON_INVALID", 500);
    const targetVersionId = requiredText(input.targetVersionId, "RUNTIME_BEHAVIOR_VERSION_INVALID", 64);
    const now = input.now ?? new Date();
    if (Number.isNaN(now.getTime())) throw new Error("RUNTIME_BEHAVIOR_TIMESTAMP_INVALID");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${pageId}:${channel}`]);
      const targetResult = await client.query(
        `SELECT mode_version_id, page_id, channel, schema_version, confirmation_mode,
                sales_authority_mode, state_read_mode, authority_bundle_hash, content_hash, created_by,
                reason AS version_reason, created_at
         FROM runtime_behavior_mode_versions
         WHERE mode_version_id = $1 AND page_id = $2 AND channel = $3`,
        [targetVersionId, pageId, channel],
      );
      const targetRow = targetResult.rows[0] as Record<string, unknown> | undefined;
      if (!targetRow) throw new Error("RUNTIME_BEHAVIOR_VERSION_NOT_FOUND");
      const target = versionFromRow(targetRow);
      // COMMERCE can only move through the DF13 cutover path, which acquires
      // the full authority fence and proves every consumer readback.  Keeping
      // this generic CAS method legacy-only prevents an operator shortcut
      // from creating split authority.
      if (target.salesAuthorityMode === "COMMERCE") {
        throw new Error("RUNTIME_BEHAVIOR_COMMERCE_CUTOVER_DEDICATED_PATH_REQUIRED");
      }
      const currentResult = await client.query(
        `SELECT p.active_version_id, p.pointer_revision, v.confirmation_mode AS previous_confirmation_mode
         FROM runtime_behavior_mode_pointers p
         JOIN runtime_behavior_mode_versions v ON v.mode_version_id = p.active_version_id
         WHERE p.page_id = $1 AND p.channel = $2 FOR UPDATE OF p`, [pageId, channel]);
      const current = currentResult.rows[0] as Record<string, unknown> | undefined;
      const currentRevision = current ? Number(current.pointer_revision) : 0;
      if (currentRevision !== input.expectedPointerRevision) throw new Error("RUNTIME_BEHAVIOR_POINTER_CAS_MISMATCH");
      const nextRevision = currentRevision + 1;
      let pointerUpdatedAt: string;
      if (current) {
        const updated = await client.query(
          `UPDATE runtime_behavior_mode_pointers SET active_version_id=$3, pointer_revision=$4,
             updated_by=$5, reason=$6, updated_at=$7 WHERE page_id=$1 AND channel=$2 AND pointer_revision=$8
             RETURNING updated_at`,
          [pageId, channel, target.modeVersionId, nextRevision, actor, reason, now, currentRevision]);
        if (updated.rowCount !== 1) throw new Error("RUNTIME_BEHAVIOR_POINTER_CAS_MISMATCH");
        pointerUpdatedAt = dateTime((updated.rows[0] as Record<string, unknown>).updated_at);
      } else {
        const inserted = await client.query(
          `INSERT INTO runtime_behavior_mode_pointers (page_id, channel, active_version_id, pointer_revision, updated_by, reason, updated_at)
           VALUES ($1,$2,$3,1,$4,$5,$6) RETURNING updated_at`, [pageId, channel, target.modeVersionId, actor, reason, now]);
        pointerUpdatedAt = dateTime((inserted.rows[0] as Record<string, unknown>).updated_at);
      }
      // The database pointer trigger writes the activation audit in this transaction.
      await client.query("COMMIT");
      return { version: target, pointerRevision: nextRevision, updatedBy: actor, reason, updatedAt: pointerUpdatedAt };
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally { client.release(); }
  }

  async recordResolution(event: RuntimeBehaviorModeResolutionAuditRecord): Promise<void> {
    const values = [event.resolutionId, event.pageId, event.channel, event.confirmationMode, event.modeVersionId,
      event.contentHash, event.pointerRevision, event.source, event.status, [...event.reasonCodes],
      event.workerId, event.pointerUpdatedAt, event.resolvedAt, event.propagationMs];
    const inserted = await this.pool.query(
      `INSERT INTO runtime_behavior_mode_resolution_audit (
         resolution_id, page_id, channel, confirmation_mode, mode_version_id,
         content_hash, pointer_revision, source, status, reason_codes, worker_id,
         pointer_updated_at, resolved_at, propagation_ms
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text[],$11,$12,$13,$14)
       ON CONFLICT (resolution_id) DO NOTHING RETURNING resolution_id`, values);
    if (inserted.rowCount === 1) return;
    const matching = await this.pool.query(
      `SELECT 1 FROM runtime_behavior_mode_resolution_audit
       WHERE resolution_id=$1 AND page_id=$2 AND channel=$3 AND confirmation_mode=$4
         AND mode_version_id IS NOT DISTINCT FROM $5::uuid
         AND content_hash IS NOT DISTINCT FROM $6
         AND pointer_revision IS NOT DISTINCT FROM $7::bigint
         AND source=$8 AND status=$9 AND reason_codes=$10::text[] AND worker_id=$11
         AND pointer_updated_at IS NOT DISTINCT FROM $12::timestamptz
         AND resolved_at=$13::timestamptz
         AND propagation_ms IS NOT DISTINCT FROM $14::bigint`,
      values,
    );
    if (matching.rowCount !== 1) {
      throw new Error("RUNTIME_BEHAVIOR_RESOLUTION_AUDIT_CONFLICT");
    }
  }
  async close(): Promise<void> { await this.pool.end(); }
}
