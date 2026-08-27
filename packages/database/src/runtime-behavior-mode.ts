import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";

export type RuntimeConfirmationMode = "LEGACY" | "V2_SHADOW" | "V2_ACTIVE" | "CLARIFY_ONLY";
export type RuntimeSalesAuthorityMode = "LEGACY" | "SHADOW" | "COMMERCE";
export type RuntimeStateReadMode = "LEGACY" | "SHADOW" | "V2";
export type RuntimeBehaviorModeSource = "DATABASE" | "CACHE" | "LAST_KNOWN_GOOD" | "STARTUP_DEFAULT" | "FAIL_SAFE";
export const DF13_FIRST_PREPROD_MAX_ZERO_WORK_PROOF_AGE_MS = 15 * 60_000;
const DF13_FIRST_PREPROD_PREPARE_REASON_PATTERN = /^DF13_FIRST_PREPROD_PREPARE:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

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
export interface Df13FirstPreprodExactPointerActivationInput {
  readonly pageId: string;
  readonly channel: string;
  readonly operation: "ACTIVATE_COMMERCE" | "ROLLBACK_LEGACY";
  readonly expectedCurrent: Readonly<{
    modeVersionId: string;
    contentHash: string;
    pointerRevision: number;
  }>;
  readonly target: Readonly<{
    modeVersionId: string;
    contentHash: string;
  }>;
  readonly proof: Readonly<{
    verifiedAt: string;
    proofHash: string;
  }>;
  readonly actor: "DF13_FIRST_PREPROD_WRITER";
  readonly reason: string;
}
export interface Df13FirstPreprodCommerceVersionPreparationInput {
  readonly pageId: string;
  readonly channel: string;
  readonly expectedCurrent: Readonly<{
    modeVersionId: string;
    contentHash: string;
    pointerRevision: number;
  }>;
  readonly proof: Readonly<{
    verifiedAt: string;
    proofHash: string;
  }>;
  readonly actor: "DF13_FIRST_PREPROD_WRITER";
  readonly reason: string;
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
               v.confirmation_mode, v.sales_authority_mode, v.state_read_mode,
               to_jsonb(v) ->> 'authority_bundle_hash' AS authority_bundle_hash,
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
    const values = [
      requiredText(input.pageId, "RUNTIME_BEHAVIOR_PAGE_INVALID", 64),
      requiredText(input.channel, "RUNTIME_BEHAVIOR_CHANNEL_INVALID", 32).toUpperCase(),
      input.payload.confirmationMode,
      input.payload.salesAuthorityMode,
      input.payload.stateReadMode,
      runtimeBehaviorModeContentHash(input.payload),
      requiredText(input.actor, "RUNTIME_BEHAVIOR_ACTOR_INVALID"),
      requiredText(input.reason, "RUNTIME_BEHAVIOR_REASON_INVALID", 500),
      now,
    ];
    const result = input.payload.salesAuthorityMode === "LEGACY"
      ? await this.pool.query(
        `INSERT INTO runtime_behavior_mode_versions (
           page_id, channel, schema_version, confirmation_mode, sales_authority_mode,
           state_read_mode, content_hash, created_by, reason, created_at
         ) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9)
         RETURNING mode_version_id, page_id, channel, schema_version,
           confirmation_mode, sales_authority_mode, state_read_mode,
           NULL::text AS authority_bundle_hash, content_hash, created_by,
           reason AS version_reason, created_at`,
        values,
      )
      : await this.pool.query(
        `INSERT INTO runtime_behavior_mode_versions (
           page_id, channel, schema_version, confirmation_mode, sales_authority_mode,
           state_read_mode, authority_bundle_hash, content_hash, created_by, reason, created_at
         ) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING mode_version_id, page_id, channel, schema_version,
           confirmation_mode, sales_authority_mode, state_read_mode, authority_bundle_hash,
           content_hash, created_by, reason AS version_reason, created_at`,
        [...values.slice(0, 5), authorityBundleHash, ...values.slice(5)],
      );
    return versionFromRow(result.rows[0] as Record<string, unknown>);
  }

  /**
   * The first PREPROD COMMERCE version can be prepared only after the same
   * sealed, stopped and drained proof required by the narrow pointer writer.
   * This transaction deliberately does not update a pointer: the separate
   * exact activation operation remains the only authority transition.
   */
  async prepareDf13FirstPreprodCommerceVersion(
    input: Df13FirstPreprodCommerceVersionPreparationInput,
  ): Promise<RuntimeBehaviorModeVersionRecord> {
    const pageId = requiredText(input.pageId, "RUNTIME_BEHAVIOR_PAGE_INVALID", 64);
    const channel = requiredText(input.channel, "RUNTIME_BEHAVIOR_CHANNEL_INVALID", 32).toUpperCase();
    if (pageId !== "1198992073286645" || channel !== "MESSENGER") {
      throw new Error("DF13_FIRST_PREPROD_WRITER_SCOPE_INVALID");
    }
    if (input.actor !== "DF13_FIRST_PREPROD_WRITER") {
      throw new Error("DF13_FIRST_PREPROD_WRITER_ACTOR_INVALID");
    }
    if (!DF13_FIRST_PREPROD_PREPARE_REASON_PATTERN.test(input.reason)) {
      throw new Error("DF13_FIRST_PREPROD_WRITER_REASON_INVALID");
    }
    if (!Number.isSafeInteger(input.expectedCurrent.pointerRevision) ||
        input.expectedCurrent.pointerRevision < 1) {
      throw new Error("RUNTIME_BEHAVIOR_POINTER_REVISION_INVALID");
    }
    const expectedVersionId = requiredText(
      input.expectedCurrent.modeVersionId,
      "RUNTIME_BEHAVIOR_VERSION_INVALID",
      64,
    );
    const expectedContentHash = requiredText(
      input.expectedCurrent.contentHash,
      "RUNTIME_BEHAVIOR_CONTENT_HASH_INVALID",
      80,
    );
    const proofVerifiedAt = Date.parse(requiredText(
      input.proof.verifiedAt,
      "DF13_FIRST_PREPROD_ZERO_WORK_PROOF_INVALID",
      64,
    ));
    if (
      !Number.isFinite(proofVerifiedAt) ||
      !/^[a-f0-9]{64}$/u.test(requiredText(
        input.proof.proofHash,
        "DF13_FIRST_PREPROD_ZERO_WORK_PROOF_INVALID",
        64,
      ))
    ) {
      throw new Error("DF13_FIRST_PREPROD_ZERO_WORK_PROOF_INVALID");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${pageId}:${channel}`]);
      const currentResult = await client.query(
        `SELECT v.mode_version_id, v.page_id, v.channel, v.schema_version,
                v.confirmation_mode, v.sales_authority_mode, v.state_read_mode,
                to_jsonb(v) ->> 'authority_bundle_hash' AS authority_bundle_hash,
                v.content_hash, v.created_by, v.reason AS version_reason, v.created_at,
                p.pointer_revision, p.updated_by, p.reason AS pointer_reason, p.updated_at
         FROM runtime_behavior_mode_pointers p
         JOIN runtime_behavior_mode_versions v ON v.mode_version_id = p.active_version_id
         WHERE p.page_id = $1 AND p.channel = $2 FOR UPDATE OF p`,
        [pageId, channel],
      );
      const currentRow = currentResult.rows[0] as Record<string, unknown> | undefined;
      if (!currentRow) throw new Error("DF13_FIRST_PREPROD_CURRENT_POINTER_MISSING");
      const current = pointerFromRow(currentRow);
      if (
        current.version.modeVersionId !== expectedVersionId ||
        current.version.contentHash !== expectedContentHash ||
        current.pointerRevision !== input.expectedCurrent.pointerRevision
      ) {
        throw new Error("RUNTIME_BEHAVIOR_POINTER_CAS_MISMATCH");
      }
      if (
        current.version.salesAuthorityMode !== "LEGACY" ||
        current.version.stateReadMode !== "LEGACY" ||
        current.version.authorityBundleHash !== null ||
        current.version.contentHash !== runtimeBehaviorModeContentHash(current.version)
      ) {
        throw new Error("DF13_FIRST_PREPROD_AUTHORITY_TRANSITION_INVALID");
      }
      const clock = await client.query<{ operation_now: Date }>(
        "SELECT clock_timestamp() AS operation_now",
      );
      const operationNow = clock.rows[0]?.operation_now;
      if (!(operationNow instanceof Date) || !Number.isFinite(operationNow.getTime())) {
        throw new Error("DF13_FIRST_PREPROD_ZERO_WORK_PROOF_CLOCK_INVALID");
      }
      if (
        proofVerifiedAt > operationNow.getTime() ||
        operationNow.getTime() - proofVerifiedAt > DF13_FIRST_PREPROD_MAX_ZERO_WORK_PROOF_AGE_MS
      ) {
        throw new Error("DF13_FIRST_PREPROD_ZERO_WORK_PROOF_STALE");
      }
      const payload = {
        confirmationMode: current.version.confirmationMode,
        salesAuthorityMode: "COMMERCE" as const,
        stateReadMode: "LEGACY" as const,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      };
      const contentHash = runtimeBehaviorModeContentHash(payload);
      const existing = await client.query(
        `SELECT v.mode_version_id, v.page_id, v.channel, v.schema_version,
                v.confirmation_mode, v.sales_authority_mode, v.state_read_mode,
                to_jsonb(v) ->> 'authority_bundle_hash' AS authority_bundle_hash,
                v.content_hash, v.created_by, v.reason AS version_reason, v.created_at
         FROM runtime_behavior_mode_versions v
         WHERE v.page_id = $1 AND v.channel = $2 AND v.content_hash = $3`,
        [pageId, channel, contentHash],
      );
      const existingRow = existing.rows[0] as Record<string, unknown> | undefined;
      if (existingRow) {
        const version = versionFromRow(existingRow);
        if (
          version.confirmationMode !== payload.confirmationMode ||
          version.salesAuthorityMode !== payload.salesAuthorityMode ||
          version.stateReadMode !== payload.stateReadMode ||
          version.authorityBundleHash !== payload.authorityBundleHash ||
          version.contentHash !== contentHash ||
          version.createdBy !== input.actor ||
          !DF13_FIRST_PREPROD_PREPARE_REASON_PATTERN.test(version.reason)
        ) {
          throw new Error("DF13_FIRST_PREPROD_PREPARATION_IDEMPOTENCY_MISMATCH");
        }
        await client.query("COMMIT");
        return version;
      }
      const inserted = await client.query(
        `INSERT INTO runtime_behavior_mode_versions (
           page_id, channel, schema_version, confirmation_mode, sales_authority_mode,
           state_read_mode, authority_bundle_hash, content_hash, created_by, reason, created_at
         ) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING mode_version_id, page_id, channel, schema_version,
           confirmation_mode, sales_authority_mode, state_read_mode, authority_bundle_hash,
           content_hash, created_by, reason AS version_reason, created_at`,
        [
          pageId,
          channel,
          payload.confirmationMode,
          payload.salesAuthorityMode,
          payload.stateReadMode,
          payload.authorityBundleHash,
          contentHash,
          input.actor,
          input.reason,
          operationNow,
        ],
      );
      const row = inserted.rows[0] as Record<string, unknown> | undefined;
      if (!row) throw new Error("DF13_FIRST_PREPROD_PREPARATION_WRITE_MISSING");
      const version = versionFromRow(row);
      if (
        version.confirmationMode !== payload.confirmationMode ||
        version.salesAuthorityMode !== payload.salesAuthorityMode ||
        version.stateReadMode !== payload.stateReadMode ||
        version.authorityBundleHash !== payload.authorityBundleHash ||
        version.contentHash !== contentHash ||
        version.createdBy !== input.actor ||
        version.reason !== input.reason
      ) {
        throw new Error("DF13_FIRST_PREPROD_PREPARATION_WRITE_MISMATCH");
      }
      await client.query("COMMIT");
      return version;
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
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
        `SELECT v.mode_version_id, v.page_id, v.channel, v.schema_version, v.confirmation_mode,
                v.sales_authority_mode, v.state_read_mode,
                to_jsonb(v) ->> 'authority_bundle_hash' AS authority_bundle_hash,
                v.content_hash, v.created_by, v.reason AS version_reason, v.created_at
         FROM runtime_behavior_mode_versions v
         WHERE v.mode_version_id = $1 AND v.page_id = $2 AND v.channel = $3`,
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
        `SELECT p.active_version_id, p.pointer_revision, v.confirmation_mode AS previous_confirmation_mode,
                v.sales_authority_mode AS previous_sales_authority_mode
         FROM runtime_behavior_mode_pointers p
         JOIN runtime_behavior_mode_versions v ON v.mode_version_id = p.active_version_id
         WHERE p.page_id = $1 AND p.channel = $2 FOR UPDATE OF p`, [pageId, channel]);
      const current = currentResult.rows[0] as Record<string, unknown> | undefined;
      if (current?.previous_sales_authority_mode === "COMMERCE") {
        throw new Error("RUNTIME_BEHAVIOR_COMMERCE_ROLLBACK_DEDICATED_PATH_REQUIRED");
      }
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

  /**
   * The sole source-level writer for the first stopped-process DF13 PREPROD
   * exercise. It is intentionally narrower than activateVersion: it cannot
   * create a version, choose a page, combine a confirmation change with an
   * authority change, or activate a COMMERCE target through a generic path.
   * The caller has already established the sealed/drained/stopped proof; this
   * transaction re-reads both exact identities and keeps the pointer CAS and
   * activation audit in the database.
   */
  async activateDf13FirstPreprodExactPointer(
    input: Df13FirstPreprodExactPointerActivationInput,
  ): Promise<RuntimeBehaviorModePointerRecord> {
    const pageId = requiredText(input.pageId, "RUNTIME_BEHAVIOR_PAGE_INVALID", 64);
    const channel = requiredText(input.channel, "RUNTIME_BEHAVIOR_CHANNEL_INVALID", 32).toUpperCase();
    if (pageId !== "1198992073286645" || channel !== "MESSENGER") {
      throw new Error("DF13_FIRST_PREPROD_WRITER_SCOPE_INVALID");
    }
    if (input.actor !== "DF13_FIRST_PREPROD_WRITER") {
      throw new Error("DF13_FIRST_PREPROD_WRITER_ACTOR_INVALID");
    }
    const operationPrefix = input.operation === "ACTIVATE_COMMERCE"
      ? "DF13_FIRST_PREPROD_ACTIVATE"
      : "DF13_FIRST_PREPROD_ROLLBACK";
    if (
      !new RegExp(`^${operationPrefix}:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, "iu")
        .test(input.reason)
    ) {
      throw new Error("DF13_FIRST_PREPROD_WRITER_REASON_INVALID");
    }
    if (
      !Number.isSafeInteger(input.expectedCurrent.pointerRevision) ||
      input.expectedCurrent.pointerRevision < 1
    ) {
      throw new Error("RUNTIME_BEHAVIOR_POINTER_REVISION_INVALID");
    }
    const expectedVersionId = requiredText(
      input.expectedCurrent.modeVersionId,
      "RUNTIME_BEHAVIOR_VERSION_INVALID",
      64,
    );
    const targetVersionId = requiredText(
      input.target.modeVersionId,
      "RUNTIME_BEHAVIOR_VERSION_INVALID",
      64,
    );
    const expectedContentHash = requiredText(
      input.expectedCurrent.contentHash,
      "RUNTIME_BEHAVIOR_CONTENT_HASH_INVALID",
      80,
    );
    const targetContentHash = requiredText(
      input.target.contentHash,
      "RUNTIME_BEHAVIOR_CONTENT_HASH_INVALID",
      80,
    );
    const proofVerifiedAt = Date.parse(requiredText(
      input.proof.verifiedAt,
      "DF13_FIRST_PREPROD_ZERO_WORK_PROOF_INVALID",
      64,
    ));
    if (
      !Number.isFinite(proofVerifiedAt) ||
      !/^[a-f0-9]{64}$/u.test(requiredText(
        input.proof.proofHash,
        "DF13_FIRST_PREPROD_ZERO_WORK_PROOF_INVALID",
        64,
      ))
    ) {
      throw new Error("DF13_FIRST_PREPROD_ZERO_WORK_PROOF_INVALID");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${pageId}:${channel}`]);
      const targetResult = await client.query(
        `SELECT v.mode_version_id, v.page_id, v.channel, v.schema_version, v.confirmation_mode,
                v.sales_authority_mode, v.state_read_mode,
                to_jsonb(v) ->> 'authority_bundle_hash' AS authority_bundle_hash,
                v.content_hash, v.created_by, v.reason AS version_reason, v.created_at
         FROM runtime_behavior_mode_versions v
         WHERE v.mode_version_id = $1 AND v.page_id = $2 AND v.channel = $3`,
        [targetVersionId, pageId, channel],
      );
      const targetRow = targetResult.rows[0] as Record<string, unknown> | undefined;
      if (!targetRow) throw new Error("RUNTIME_BEHAVIOR_VERSION_NOT_FOUND");
      const target = versionFromRow(targetRow);
      const currentResult = await client.query(
        `SELECT v.mode_version_id, v.page_id, v.channel, v.schema_version,
                v.confirmation_mode, v.sales_authority_mode, v.state_read_mode,
                to_jsonb(v) ->> 'authority_bundle_hash' AS authority_bundle_hash,
                v.content_hash, v.created_by, v.reason AS version_reason, v.created_at,
                p.pointer_revision, p.updated_by, p.reason AS pointer_reason, p.updated_at
         FROM runtime_behavior_mode_pointers p
         JOIN runtime_behavior_mode_versions v ON v.mode_version_id = p.active_version_id
         WHERE p.page_id = $1 AND p.channel = $2 FOR UPDATE OF p`,
        [pageId, channel],
      );
      const currentRow = currentResult.rows[0] as Record<string, unknown> | undefined;
      if (!currentRow) throw new Error("DF13_FIRST_PREPROD_CURRENT_POINTER_MISSING");
      const current = pointerFromRow(currentRow);
      if (
        current.version.modeVersionId !== expectedVersionId ||
        current.version.contentHash !== expectedContentHash ||
        current.pointerRevision !== input.expectedCurrent.pointerRevision
      ) {
        throw new Error("RUNTIME_BEHAVIOR_POINTER_CAS_MISMATCH");
      }
      if (target.contentHash !== targetContentHash) {
        throw new Error("DF13_FIRST_PREPROD_TARGET_CONTENT_HASH_MISMATCH");
      }
      if (
        target.stateReadMode !== "LEGACY" ||
        current.version.stateReadMode !== "LEGACY" ||
        target.confirmationMode !== current.version.confirmationMode
      ) {
        throw new Error("DF13_FIRST_PREPROD_POINTER_DIMENSION_INVALID");
      }
      const isForward = input.operation === "ACTIVATE_COMMERCE";
      if (isForward) {
        if (
          current.version.salesAuthorityMode !== "LEGACY" ||
          current.version.authorityBundleHash !== null ||
          target.salesAuthorityMode !== "COMMERCE" ||
          target.contentHash !== runtimeBehaviorModeContentHash(target)
        ) {
          throw new Error("DF13_FIRST_PREPROD_AUTHORITY_TRANSITION_INVALID");
        }
        if (target.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash) {
          throw new Error("DF13_FIRST_PREPROD_AUTHORITY_BUNDLE_MISMATCH");
        }
      } else {
        if (
          current.version.salesAuthorityMode !== "COMMERCE" ||
          current.version.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash ||
          target.salesAuthorityMode !== "LEGACY" ||
          target.authorityBundleHash !== null ||
          target.contentHash !== runtimeBehaviorModeContentHash(target)
        ) {
          throw new Error("DF13_FIRST_PREPROD_AUTHORITY_TRANSITION_INVALID");
        }
        if (
          current.updatedBy !== "DF13_FIRST_PREPROD_WRITER" ||
          !/^DF13_FIRST_PREPROD_ACTIVATE:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
            .test(current.reason)
        ) {
          throw new Error("DF13_FIRST_PREPROD_ROLLBACK_IDENTITY_MISMATCH");
        }
        const forwardAudit = await client.query(
          `SELECT previous_version_id, new_version_id, new_pointer_revision, actor, reason
           FROM runtime_behavior_mode_activation_audit
           WHERE page_id=$1 AND channel=$2 AND new_version_id=$3::uuid
             AND new_pointer_revision=$4 AND actor=$5 AND reason=$6
           ORDER BY occurred_at DESC, activation_id DESC
           LIMIT 2`,
          [
            pageId,
            channel,
            current.version.modeVersionId,
            current.pointerRevision,
            current.updatedBy,
            current.reason,
          ],
        );
        const audit = forwardAudit.rows[0] as Record<string, unknown> | undefined;
        if (
          forwardAudit.rows.length !== 1 ||
          !audit ||
          String(audit.previous_version_id ?? "") !== target.modeVersionId ||
          String(audit.new_version_id ?? "") !== current.version.modeVersionId ||
          Number(audit.new_pointer_revision) !== current.pointerRevision ||
          String(audit.actor ?? "") !== current.updatedBy ||
          String(audit.reason ?? "") !== current.reason
        ) {
          throw new Error("DF13_FIRST_PREPROD_ROLLBACK_IDENTITY_MISMATCH");
        }
      }
      const clock = await client.query<{ operation_now: Date }>(
        "SELECT clock_timestamp() AS operation_now",
      );
      const operationNow = clock.rows[0]?.operation_now;
      if (!(operationNow instanceof Date) || !Number.isFinite(operationNow.getTime())) {
        throw new Error("DF13_FIRST_PREPROD_ZERO_WORK_PROOF_CLOCK_INVALID");
      }
      if (
        proofVerifiedAt > operationNow.getTime() ||
        operationNow.getTime() - proofVerifiedAt > DF13_FIRST_PREPROD_MAX_ZERO_WORK_PROOF_AGE_MS
      ) {
        throw new Error("DF13_FIRST_PREPROD_ZERO_WORK_PROOF_STALE");
      }
      const nextRevision = current.pointerRevision + 1;
      const updated = await client.query(
        `UPDATE runtime_behavior_mode_pointers SET active_version_id=$3, pointer_revision=$4,
           updated_by=$5, reason=$6, updated_at=$7 WHERE page_id=$1 AND channel=$2 AND pointer_revision=$8
         RETURNING updated_at`,
        [
          pageId,
          channel,
          target.modeVersionId,
          nextRevision,
          input.actor,
          input.reason,
          operationNow,
          current.pointerRevision,
        ],
      );
      if (updated.rowCount !== 1) throw new Error("RUNTIME_BEHAVIOR_POINTER_CAS_MISMATCH");
      await client.query("COMMIT");
      return {
        version: target,
        pointerRevision: nextRevision,
        updatedBy: input.actor,
        reason: input.reason,
        updatedAt: dateTime((updated.rows[0] as Record<string, unknown>).updated_at),
      };
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
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
    // A retried Inbox event uses the same deterministic resolution ID. Its
    // immutable authority evidence must still match, while these two fields
    // intentionally describe the later observation rather than the original
    // resolution and therefore cannot make an otherwise exact replay unsafe.
    const stableEvidenceValues = values.slice(0, 12);
    const matching = await this.pool.query(
      `SELECT 1 FROM runtime_behavior_mode_resolution_audit
       WHERE resolution_id=$1 AND page_id=$2 AND channel=$3 AND confirmation_mode=$4
         AND mode_version_id IS NOT DISTINCT FROM $5::uuid
         AND content_hash IS NOT DISTINCT FROM $6
         AND pointer_revision IS NOT DISTINCT FROM $7::bigint
         AND source=$8 AND status=$9 AND reason_codes=$10::text[] AND worker_id=$11
         AND pointer_updated_at IS NOT DISTINCT FROM $12::timestamptz`,
      stableEvidenceValues,
    );
    if (matching.rowCount !== 1) {
      throw new Error("RUNTIME_BEHAVIOR_RESOLUTION_AUDIT_CONFLICT");
    }
  }
  async close(): Promise<void> { await this.pool.end(); }
}
