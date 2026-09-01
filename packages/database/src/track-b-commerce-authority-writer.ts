import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
} from "./df13-commerce-authority-bundle.js";
import {
  runtimeBehaviorModeContentHash,
  type RuntimeBehaviorModePointerRecord,
  type RuntimeBehaviorModeVersionRecord,
} from "./runtime-behavior-mode.js";

const PAGE_ID = "1198992073286645";
const CHANNEL = "MESSENGER";
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CONTENT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const BUNDLE_HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PREPARE_REASON_PATTERN = /^TRACK_B_B3_2_PREPARE:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ADMISSION_MIGRATION_NAME = "0038_track_b_commerce_admission_gate.up.sql";
const ADMISSION_MIGRATION_HASH = "7d1f3f8916e0a7ba63502d4fc7e2b794e20b65ac833a8c84776012cf80be56ca";
const ADMISSION_FUNCTION_SOURCE_HASH = "d083f18d4a62cf313af3baba8c3a145225e9ee7852e4192119b158d34c8ac5ba";

export type TrackBCommerceIdentity = Readonly<{
  modeVersionId: string;
  contentHash: string;
  pointerRevision: number;
  authorityBundleHash: string;
}>;

export type TrackBCommerceFenceLease = Readonly<{
  fenceId: string;
  fenceToken: string;
  epoch: number;
}>;

export type TrackBCommercePointerMutationInput = Readonly<{
  pageId: string;
  channel: string;
  operation: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
  expectedCurrent: TrackBCommerceIdentity;
  target: Omit<TrackBCommerceIdentity, "pointerRevision">;
  lease: TrackBCommerceFenceLease;
  actor: "TRACK_B_B3_2_WRITER";
  reason: string;
}>;

export const TRACK_B_COMMERCE_ADMISSION_CLAIMS_V1 = Object.freeze([
  "webhook_inbox:PROCESSING",
  "meta_outbox:SENDING",
  "pancake_tag_outbox:APPLYING",
] as const);

export type TrackBCommerceAdmissionReadbackRecord = Readonly<{
  status: "HELD" | "AMBIGUOUS";
  source: "DATABASE";
  pageId: string | null;
  channel: string | null;
  fenceId: string | null;
  epoch: number | null;
  released: boolean | null;
  guardedClaims: readonly string[];
}>;

type Row = Record<string, unknown>;

function requiredScope(pageId: string, channel: string): void {
  if (pageId !== PAGE_ID || channel.trim().toUpperCase() !== CHANNEL) {
    throw new Error("TRACK_B_B3_2_WRITER_SCOPE_INVALID");
  }
}

function requiredUuid(value: string, code: string): string {
  if (!UUID_V4_PATTERN.test(value)) throw new Error(code);
  return value.toLowerCase();
}

function requiredContentHash(value: string): string {
  if (!CONTENT_HASH_PATTERN.test(value)) throw new Error("TRACK_B_B3_2_CONTENT_HASH_INVALID");
  return value;
}

function requiredBundleHash(value: string): string {
  if (!BUNDLE_HASH_PATTERN.test(value)) throw new Error("TRACK_B_B3_2_BUNDLE_HASH_INVALID");
  return value;
}

function requiredRevision(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("TRACK_B_B3_2_POINTER_REVISION_INVALID");
  }
  return value;
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function version(row: Row): RuntimeBehaviorModeVersionRecord {
  return {
    schemaVersion: 1,
    modeVersionId: String(row.mode_version_id),
    pageId: String(row.page_id),
    channel: String(row.channel),
    confirmationMode: String(row.confirmation_mode) as RuntimeBehaviorModeVersionRecord["confirmationMode"],
    salesAuthorityMode: String(row.sales_authority_mode) as RuntimeBehaviorModeVersionRecord["salesAuthorityMode"],
    stateReadMode: String(row.state_read_mode) as RuntimeBehaviorModeVersionRecord["stateReadMode"],
    authorityBundleHash: row.authority_bundle_hash == null ? null : String(row.authority_bundle_hash),
    contentHash: String(row.content_hash),
    createdBy: String(row.created_by),
    reason: String(row.version_reason),
    createdAt: iso(row.created_at),
  };
}

function pointer(row: Row): RuntimeBehaviorModePointerRecord {
  return {
    version: version(row),
    pointerRevision: Number(row.pointer_revision),
    updatedBy: String(row.updated_by),
    reason: String(row.pointer_reason),
    updatedAt: iso(row.updated_at),
  };
}

function canonicalCommerceVersion(
  value: RuntimeBehaviorModeVersionRecord,
  bundleHash: string,
): boolean {
  return value.pageId === PAGE_ID &&
    value.channel === CHANNEL &&
    value.salesAuthorityMode === "COMMERCE" &&
    value.stateReadMode === "LEGACY" &&
    value.authorityBundleHash === bundleHash &&
    value.contentHash === runtimeBehaviorModeContentHash(value);
}

function exactIdentity(
  value: RuntimeBehaviorModeVersionRecord,
  expected: Omit<TrackBCommerceIdentity, "pointerRevision">,
): boolean {
  return value.modeVersionId.toLowerCase() === expected.modeVersionId &&
    value.contentHash === expected.contentHash &&
    value.authorityBundleHash === expected.authorityBundleHash;
}

function hashToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function rollbackQuietly(client: PoolClient): Promise<void> {
  try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
}

function versionSelect(where: string): string {
  return `SELECT v.mode_version_id, v.page_id, v.channel, v.schema_version,
                 v.confirmation_mode, v.sales_authority_mode, v.state_read_mode,
                 to_jsonb(v) ->> 'authority_bundle_hash' AS authority_bundle_hash,
                 v.content_hash, v.created_by, v.reason AS version_reason, v.created_at
            FROM runtime_behavior_mode_versions v
           ${where}`;
}

function pointerSelect(): string {
  return `SELECT v.mode_version_id, v.page_id, v.channel, v.schema_version,
                 v.confirmation_mode, v.sales_authority_mode, v.state_read_mode,
                 to_jsonb(v) ->> 'authority_bundle_hash' AS authority_bundle_hash,
                 v.content_hash, v.created_by, v.reason AS version_reason, v.created_at,
                 p.pointer_revision, p.updated_by, p.reason AS pointer_reason, p.updated_at
            FROM runtime_behavior_mode_pointers p
            JOIN runtime_behavior_mode_versions v ON v.mode_version_id = p.active_version_id
           WHERE p.page_id = $1 AND p.channel = $2
           FOR UPDATE OF p`;
}

/** Page-scoped source writer for the one Track B COMMERCE identity replacement. */
export class PostgresTrackBCommerceAuthorityWriter {
  readonly #pool: Pool;

  constructor(connectionString: string) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.#pool = new Pool({ connectionString, max: 1 });
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }

  async readAdmissionHold(input: Readonly<{
    pageId: string;
    channel: string;
    lease: TrackBCommerceFenceLease;
  }>): Promise<TrackBCommerceAdmissionReadbackRecord> {
    requiredScope(input.pageId, input.channel);
    const lease = {
      fenceId: requiredUuid(input.lease.fenceId, "TRACK_B_B3_2_FENCE_ID_INVALID"),
      fenceToken: requiredUuid(input.lease.fenceToken, "TRACK_B_B3_2_FENCE_TOKEN_INVALID"),
      epoch: requiredRevision(input.lease.epoch),
    };
    const ambiguous: TrackBCommerceAdmissionReadbackRecord = {
      status: "AMBIGUOUS", source: "DATABASE", pageId: null, channel: null,
      fenceId: null, epoch: null, released: null, guardedClaims: [],
    };
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `df13-cutover:${PAGE_ID}:${CHANNEL}`,
      ]);
      const fenceResult = await client.query(
        `SELECT fence_id, page_id, channel, epoch, released_at
           FROM df13_commerce_cutover_fences
          WHERE fence_id=$1 AND page_id=$2 AND channel=$3 AND epoch=$4
            AND token_hash=$5 AND released_at IS NULL`,
        [lease.fenceId, PAGE_ID, CHANNEL, lease.epoch, hashToken(lease.fenceToken)],
      );
      const triggerResult = await client.query(
        `SELECT c.relname AS table_name, t.tgenabled, t.tgtype,
                p.proname AS function_name, p.prosrc, p.proconfig,
                pn.nspname AS function_schema, l.lanname AS language_name,
                p.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype AS returns_trigger
           FROM pg_trigger t
           JOIN pg_class c ON c.oid=t.tgrelid
           JOIN pg_namespace n ON n.oid=c.relnamespace
           JOIN pg_proc p ON p.oid=t.tgfoid
           JOIN pg_namespace pn ON pn.oid=p.pronamespace
           JOIN pg_language l ON l.oid=p.prolang
          WHERE n.nspname='public' AND NOT t.tgisinternal
            AND (c.relname,t.tgname) IN (
              ('webhook_inbox','track_b_cutover_admission_webhook_inbox'),
              ('meta_outbox','track_b_cutover_admission_meta_outbox'),
              ('pancake_tag_outbox','track_b_cutover_admission_pancake_tag_outbox')
            )`,
      );
      const ledgerResult = await client.query(
        `SELECT checksum_sha256 FROM schema_migrations WHERE migration_name=$1`,
        [ADMISSION_MIGRATION_NAME],
      );
      const fence = fenceResult.rows[0] as Row | undefined;
      const tables = new Set(triggerResult.rows.filter((row: Row) =>
        row.tgenabled === "A" && Number(row.tgtype) === 19 &&
        row.function_name === "guard_track_b_cutover_admission" && row.function_schema === "public" &&
        row.language_name === "plpgsql" && row.returns_trigger === true &&
        createHash("sha256").update(String(row.prosrc), "utf8").digest("hex") ===
          ADMISSION_FUNCTION_SOURCE_HASH &&
        Array.isArray(row.proconfig) && row.proconfig.length === 1 &&
        row.proconfig[0] === "search_path=pg_catalog"
      ).map((row: Row) => String(row.table_name)));
      const exactTables = ["webhook_inbox", "meta_outbox", "pancake_tag_outbox"];
      if (fenceResult.rows.length !== 1 || !fence || triggerResult.rows.length !== 3 ||
          tables.size !== 3 || !exactTables.every((table) => tables.has(table)) ||
          ledgerResult.rows.length !== 1 ||
          (ledgerResult.rows[0] as Row | undefined)?.checksum_sha256 !== ADMISSION_MIGRATION_HASH) {
        await client.query("COMMIT");
        return ambiguous;
      }
      await client.query("COMMIT");
      return {
        status: "HELD", source: "DATABASE", pageId: String(fence.page_id),
        channel: String(fence.channel), fenceId: String(fence.fence_id).toLowerCase(),
        epoch: Number(fence.epoch), released: false,
        guardedClaims: TRACK_B_COMMERCE_ADMISSION_CLAIMS_V1,
      };
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async prepareTarget(input: Readonly<{
    pageId: string;
    channel: string;
    expectedCurrent: TrackBCommerceIdentity;
    actor: "TRACK_B_B3_2_WRITER";
    reason: string;
  }>): Promise<RuntimeBehaviorModeVersionRecord> {
    requiredScope(input.pageId, input.channel);
    if (input.actor !== "TRACK_B_B3_2_WRITER") throw new Error("TRACK_B_B3_2_WRITER_ACTOR_INVALID");
    if (!PREPARE_REASON_PATTERN.test(input.reason)) throw new Error("TRACK_B_B3_2_WRITER_REASON_INVALID");
    const expectedCurrent = {
      modeVersionId: requiredUuid(input.expectedCurrent.modeVersionId, "TRACK_B_B3_2_VERSION_INVALID"),
      contentHash: requiredContentHash(input.expectedCurrent.contentHash),
      pointerRevision: requiredRevision(input.expectedCurrent.pointerRevision),
      authorityBundleHash: requiredBundleHash(input.expectedCurrent.authorityBundleHash),
    };
    if (expectedCurrent.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash) {
      throw new Error("TRACK_B_B3_2_PREVIOUS_BUNDLE_INVALID");
    }
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${PAGE_ID}:${CHANNEL}`]);
      const currentResult = await client.query(pointerSelect(), [PAGE_ID, CHANNEL]);
      const currentRow = currentResult.rows[0] as Row | undefined;
      if (!currentRow) throw new Error("TRACK_B_B3_2_CURRENT_POINTER_MISSING");
      const current = pointer(currentRow);
      if (
        current.pointerRevision !== expectedCurrent.pointerRevision ||
        !exactIdentity(current.version, expectedCurrent) ||
        !canonicalCommerceVersion(current.version, DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash)
      ) throw new Error("TRACK_B_B3_2_POINTER_CAS_MISMATCH");
      const payload = {
        confirmationMode: current.version.confirmationMode,
        salesAuthorityMode: "COMMERCE" as const,
        stateReadMode: "LEGACY" as const,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      };
      const contentHash = runtimeBehaviorModeContentHash(payload);
      const existingResult = await client.query(
        versionSelect("WHERE v.page_id = $1 AND v.channel = $2 AND v.content_hash = $3"),
        [PAGE_ID, CHANNEL, contentHash],
      );
      const existingRow = existingResult.rows[0] as Row | undefined;
      if (existingRow) {
        const existing = version(existingRow);
        if (
          !canonicalCommerceVersion(existing, DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash) ||
          existing.confirmationMode !== current.version.confirmationMode ||
          existing.createdBy !== input.actor ||
          !PREPARE_REASON_PATTERN.test(existing.reason)
        ) throw new Error("TRACK_B_B3_2_PREPARATION_IDEMPOTENCY_MISMATCH");
        await client.query("COMMIT");
        return existing;
      }
      const clockResult = await client.query<{ operation_now: Date }>(
        "SELECT clock_timestamp() AS operation_now",
      );
      const operationNow = clockResult.rows[0]?.operation_now;
      if (!(operationNow instanceof Date) || !Number.isFinite(operationNow.getTime())) {
        throw new Error("TRACK_B_B3_2_DATABASE_CLOCK_INVALID");
      }
      const inserted = await client.query(
        `INSERT INTO runtime_behavior_mode_versions (
           page_id, channel, schema_version, confirmation_mode, sales_authority_mode,
           state_read_mode, authority_bundle_hash, content_hash, created_by, reason, created_at
         ) VALUES ($1,$2,1,$3,'COMMERCE','LEGACY',$4,$5,$6,$7,$8)
         RETURNING mode_version_id, page_id, channel, schema_version,
           confirmation_mode, sales_authority_mode, state_read_mode, authority_bundle_hash,
           content_hash, created_by, reason AS version_reason, created_at`,
        [PAGE_ID, CHANNEL, payload.confirmationMode, payload.authorityBundleHash,
          contentHash, input.actor, input.reason, operationNow],
      );
      const insertedRow = inserted.rows[0] as Row | undefined;
      if (!insertedRow) throw new Error("TRACK_B_B3_2_PREPARATION_WRITE_MISSING");
      const prepared = version(insertedRow);
      if (!canonicalCommerceVersion(prepared, DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash)) {
        throw new Error("TRACK_B_B3_2_PREPARATION_WRITE_MISMATCH");
      }
      await client.query("COMMIT");
      return prepared;
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async mutateExactPointer(
    input: TrackBCommercePointerMutationInput,
  ): Promise<RuntimeBehaviorModePointerRecord> {
    requiredScope(input.pageId, input.channel);
    if (input.actor !== "TRACK_B_B3_2_WRITER") throw new Error("TRACK_B_B3_2_WRITER_ACTOR_INVALID");
    const reasonOperation = input.operation === "ACTIVATE_TRACK_B" ? "ACTIVATE" : "ROLLBACK";
    if (!new RegExp(`^TRACK_B_B3_2_${reasonOperation}:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, "iu").test(input.reason)) {
      throw new Error("TRACK_B_B3_2_WRITER_REASON_INVALID");
    }
    const operationId = input.reason.slice(input.reason.indexOf(":") + 1).toLowerCase();
    const expectedCurrent = {
      modeVersionId: requiredUuid(input.expectedCurrent.modeVersionId, "TRACK_B_B3_2_VERSION_INVALID"),
      contentHash: requiredContentHash(input.expectedCurrent.contentHash),
      pointerRevision: requiredRevision(input.expectedCurrent.pointerRevision),
      authorityBundleHash: requiredBundleHash(input.expectedCurrent.authorityBundleHash),
    };
    const target = {
      modeVersionId: requiredUuid(input.target.modeVersionId, "TRACK_B_B3_2_VERSION_INVALID"),
      contentHash: requiredContentHash(input.target.contentHash),
      authorityBundleHash: requiredBundleHash(input.target.authorityBundleHash),
    };
    const lease = {
      fenceId: requiredUuid(input.lease.fenceId, "TRACK_B_B3_2_FENCE_ID_INVALID"),
      fenceToken: requiredUuid(input.lease.fenceToken, "TRACK_B_B3_2_FENCE_TOKEN_INVALID"),
      epoch: requiredRevision(input.lease.epoch),
    };
    const forward = input.operation === "ACTIVATE_TRACK_B";
    const expectedPreviousBundle = forward
      ? DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
      : DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash;
    const expectedTargetBundle = forward
      ? DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash
      : DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash;
    if (
      expectedCurrent.authorityBundleHash !== expectedPreviousBundle ||
      target.authorityBundleHash !== expectedTargetBundle
    ) throw new Error("TRACK_B_B3_2_AUTHORITY_TRANSITION_INVALID");

    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${PAGE_ID}:${CHANNEL}`]);
      const targetResult = await client.query(
        versionSelect("WHERE v.mode_version_id = $1 AND v.page_id = $2 AND v.channel = $3"),
        [target.modeVersionId, PAGE_ID, CHANNEL],
      );
      const targetRow = targetResult.rows[0] as Row | undefined;
      if (!targetRow) throw new Error("TRACK_B_B3_2_TARGET_VERSION_MISSING");
      const targetVersion = version(targetRow);
      const currentResult = await client.query(pointerSelect(), [PAGE_ID, CHANNEL]);
      const currentRow = currentResult.rows[0] as Row | undefined;
      if (!currentRow) throw new Error("TRACK_B_B3_2_CURRENT_POINTER_MISSING");
      const current = pointer(currentRow);
      if (
        current.pointerRevision !== expectedCurrent.pointerRevision ||
        !exactIdentity(current.version, expectedCurrent) ||
        !canonicalCommerceVersion(current.version, expectedPreviousBundle)
      ) throw new Error("TRACK_B_B3_2_POINTER_CAS_MISMATCH");
      if (
        !exactIdentity(targetVersion, target) ||
        !canonicalCommerceVersion(targetVersion, expectedTargetBundle) ||
        targetVersion.confirmationMode !== current.version.confirmationMode
      ) throw new Error("TRACK_B_B3_2_TARGET_IDENTITY_INVALID");
      const verifyPriorTransitionAudit = async (): Promise<void> => {
        const priorOperation = forward ? "ROLLBACK" : "ACTIVATE";
        if (
          current.updatedBy !== "TRACK_B_B3_2_WRITER" ||
          !new RegExp(`^TRACK_B_B3_2_${priorOperation}:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, "iu").test(current.reason)
        ) throw new Error("TRACK_B_B3_2_ROLLBACK_IDENTITY_MISMATCH");
        const auditResult = await client.query(
          `SELECT previous_version_id, new_version_id, new_pointer_revision, actor, reason
             FROM runtime_behavior_mode_activation_audit
            WHERE page_id=$1 AND channel=$2 AND new_version_id=$3::uuid
              AND new_pointer_revision=$4 AND actor=$5 AND reason=$6
            ORDER BY occurred_at DESC, activation_id DESC
            LIMIT 2`,
          [PAGE_ID, CHANNEL, current.version.modeVersionId, current.pointerRevision,
            current.updatedBy, current.reason],
        );
        const audit = auditResult.rows[0] as Row | undefined;
        if (
          auditResult.rows.length !== 1 ||
          !audit ||
          String(audit.previous_version_id ?? "").toLowerCase() !== target.modeVersionId ||
          String(audit.new_version_id ?? "").toLowerCase() !== current.version.modeVersionId.toLowerCase() ||
          Number(audit.new_pointer_revision) !== current.pointerRevision ||
          String(audit.actor ?? "") !== current.updatedBy ||
          String(audit.reason ?? "") !== current.reason
        ) throw new Error("TRACK_B_B3_2_ROLLBACK_IDENTITY_MISMATCH");
      };
      if (!forward) await verifyPriorTransitionAudit();
      const fenceResult = await client.query(
        `SELECT operation_id,
                (pre_cutover_version_id=$9 AND pre_cutover_content_hash=$10
                 AND pre_cutover_pointer_revision=$13
                 AND target_version_id=$6 AND target_content_hash=$7
                 AND target_authority_bundle_hash=$14) AS inverse_lease
           FROM df13_commerce_cutover_fences
          WHERE fence_id=$1 AND epoch=$2 AND token_hash=$3
            AND released_at IS NULL AND lease_until > clock_timestamp()
            AND page_id=$4 AND channel=$5 AND operation_id=$12
            AND (
              (pre_cutover_version_id=$6 AND pre_cutover_content_hash=$7
               AND pre_cutover_pointer_revision=$8
               AND target_version_id=$9 AND target_content_hash=$10
               AND target_authority_bundle_hash=$11)
              OR
              (pre_cutover_version_id=$9 AND pre_cutover_content_hash=$10
               AND pre_cutover_pointer_revision=$13
               AND target_version_id=$6 AND target_content_hash=$7
               AND target_authority_bundle_hash=$14)
            )
          FOR UPDATE`,
        [lease.fenceId, lease.epoch, hashToken(lease.fenceToken), PAGE_ID, CHANNEL,
          expectedCurrent.modeVersionId, expectedCurrent.contentHash, expectedCurrent.pointerRevision,
          target.modeVersionId, target.contentHash, target.authorityBundleHash, operationId,
          expectedCurrent.pointerRevision - 1, expectedCurrent.authorityBundleHash],
      );
      if (fenceResult.rows.length !== 1) throw new Error("TRACK_B_B3_2_FENCE_LEASE_INVALID");
      const inverseLease = (fenceResult.rows[0] as Row | undefined)?.inverse_lease === true;
      if (forward && inverseLease) await verifyPriorTransitionAudit();
      const nextRevision = current.pointerRevision + 1;
      const clockResult = await client.query<{ operation_now: Date }>(
        "SELECT clock_timestamp() AS operation_now",
      );
      const operationNow = clockResult.rows[0]?.operation_now;
      if (!(operationNow instanceof Date) || !Number.isFinite(operationNow.getTime())) {
        throw new Error("TRACK_B_B3_2_DATABASE_CLOCK_INVALID");
      }
      const updated = await client.query(
        `UPDATE runtime_behavior_mode_pointers
            SET active_version_id=$3, pointer_revision=$4, updated_by=$5, reason=$6, updated_at=$7
          WHERE page_id=$1 AND channel=$2 AND pointer_revision=$8
          RETURNING updated_at`,
        [PAGE_ID, CHANNEL, target.modeVersionId, nextRevision, input.actor, input.reason,
          operationNow, current.pointerRevision],
      );
      if (updated.rowCount !== 1) throw new Error("TRACK_B_B3_2_POINTER_CAS_MISMATCH");
      await client.query("COMMIT");
      return {
        version: targetVersion,
        pointerRevision: nextRevision,
        updatedBy: input.actor,
        reason: input.reason,
        updatedAt: iso((updated.rows[0] as Row).updated_at),
      };
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }
}
