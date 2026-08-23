import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import type {
  RealtimeCommitInput,
  RealtimeCommitResult,
} from "./realtime-runtime.js";

export type Df13CommerceFenceAuthority = Readonly<{
  salesAuthorityMode: "COMMERCE";
  stateReadMode: "LEGACY";
  modeVersionId: string;
  contentHash: string;
  pointerRevision: number;
  authorityBundleHash: string;
  source: "DATABASE" | "CACHE";
}>;

export type Df13CommerceFenceStoreRequest = Readonly<{
  pageId: string;
  channel: string;
  workId: string;
  inboxIds: readonly string[];
  authority: Df13CommerceFenceAuthority;
}>;

export type Df13CommerceFenceLease = Readonly<{
  fenceToken: string;
  epoch: number;
}>;

export type Df13CommerceFenceAcquireResult =
  | Readonly<{ status: "HELD"; lease: Df13CommerceFenceLease }>
  | Readonly<{ status: "ALREADY_COMPLETED"; epoch: number }>
  | Readonly<{ status: "PARKED"; reasonCode: string }>;

/** Durable-only runtime writer usable inside a caller-owned transaction. */
export interface Df13CommerceRuntimeCommitPort {
  commitWithinTransaction<TState, TSalesState = unknown>(
    client: PoolClient,
    input: RealtimeCommitInput<TState, TSalesState>,
    now?: Date,
  ): Promise<RealtimeCommitResult>;
}

export type Df13CommerceFenceCommitInput<TState, TSalesState = unknown> = Readonly<{
  request: Df13CommerceFenceStoreRequest;
  lease: Df13CommerceFenceLease;
  runtimeCommit: RealtimeCommitInput<TState, TSalesState>;
}>;

export type Df13CommerceFenceCommitResult =
  | Readonly<{
    status: "COMPLETED";
    epoch: number;
    runtime: RealtimeCommitResult;
  }>
  | Readonly<{ status: "ALREADY_COMPLETED"; epoch: number }>
  | Readonly<{ status: "PARKED"; reasonCode: string }>;

type FenceRow = {
  fence_id: string;
  epoch: string | number;
  completed_at: Date | string | null;
  lease_until: Date | string | null;
  request_fingerprint: string;
  sales_authority_mode: string;
  state_read_mode: string;
  mode_version_id: string;
  content_hash: string;
  pointer_revision: string | number;
  authority_bundle_hash: string;
  authority_source: string;
  inbox_ids: readonly string[];
  token_hash?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SCOPE_ID_PATTERN = /^[A-Za-z0-9:_-]+$/u;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function requiredScopeId(value: string, code: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 128 || !SCOPE_ID_PATTERN.test(value)) {
    throw new Error(code);
  }
  return value;
}

function requiredUuid(value: string, code: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new Error(code);
  // PostgreSQL canonicalizes UUID storage/readback to lowercase. Normalize at
  // the request boundary so a semantically identical caller spelling cannot
  // change the re-derived identity fingerprint or strand an expired lease.
  return value.toLowerCase();
}

function exactInboxIds(values: readonly string[]): readonly string[] {
  if (values.length === 0 || values.length > 500) throw new Error("DF13_FENCE_INBOX_SET_INVALID");
  const normalized = values.map((value) => requiredUuid(value, "DF13_FENCE_INBOX_ID_INVALID"));
  const sorted = [...normalized].sort();
  if (new Set(sorted).size !== sorted.length || sorted.some((value, index) => value !== normalized[index])) {
    throw new Error("DF13_FENCE_INBOX_SET_NONCANONICAL");
  }
  return Object.freeze(normalized);
}

function exactAuthority(authority: Df13CommerceFenceAuthority): Df13CommerceFenceAuthority {
  if (authority.salesAuthorityMode !== "COMMERCE" || authority.stateReadMode !== "LEGACY") {
    throw new Error("DF13_FENCE_AUTHORITY_MODE_INVALID");
  }
  const modeVersionId = requiredUuid(authority.modeVersionId, "DF13_FENCE_MODE_VERSION_INVALID");
  if (!/^sha256:[a-f0-9]{64}$/u.test(authority.contentHash)) throw new Error("DF13_FENCE_CONTENT_HASH_INVALID");
  if (!Number.isSafeInteger(authority.pointerRevision) || authority.pointerRevision < 1) {
    throw new Error("DF13_FENCE_POINTER_REVISION_INVALID");
  }
  if (!/^[a-f0-9]{64}$/u.test(authority.authorityBundleHash)) {
    throw new Error("DF13_FENCE_AUTHORITY_BUNDLE_INVALID");
  }
  if (authority.source !== "DATABASE" && authority.source !== "CACHE") {
    throw new Error("DF13_FENCE_AUTHORITY_SOURCE_INVALID");
  }
  return Object.freeze({
    salesAuthorityMode: "COMMERCE",
    stateReadMode: "LEGACY",
    modeVersionId,
    contentHash: authority.contentHash,
    pointerRevision: authority.pointerRevision,
    authorityBundleHash: authority.authorityBundleHash,
    source: authority.source,
  });
}

function exactRequest(input: Df13CommerceFenceStoreRequest): Df13CommerceFenceStoreRequest {
  return Object.freeze({
    pageId: requiredScopeId(input.pageId, "DF13_FENCE_PAGE_INVALID"),
    channel: requiredScopeId(input.channel, "DF13_FENCE_CHANNEL_INVALID"),
    workId: requiredScopeId(input.workId, "DF13_FENCE_WORK_INVALID"),
    inboxIds: exactInboxIds(input.inboxIds),
    authority: exactAuthority(input.authority),
  });
}

/**
 * Re-derived from every canonical field. This is a consistency check only;
 * replay identity is also checked field-by-field before a lease is reused.
 */
export function df13CommerceFenceRequestFingerprint(input: Df13CommerceFenceStoreRequest): string {
  const request = exactRequest(input);
  return sha256(canonicalJson({
    schemaVersion: 1,
    pageId: request.pageId,
    channel: request.channel,
    workId: request.workId,
    inboxIds: request.inboxIds,
    authority: request.authority,
  }));
}

function fingerprintFromExactRequest(request: Df13CommerceFenceStoreRequest): string {
  return sha256(canonicalJson({
    schemaVersion: 1,
    pageId: request.pageId,
    channel: request.channel,
    workId: request.workId,
    inboxIds: request.inboxIds,
    authority: request.authority,
  }));
}

function tokenHash(token: string): string {
  return sha256(token);
}

function finiteEpoch(value: string | number): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

function matchingFenceRow(row: FenceRow, request: Df13CommerceFenceStoreRequest, fingerprint: string): boolean {
  return row.request_fingerprint === fingerprint
    && row.sales_authority_mode === request.authority.salesAuthorityMode
    && row.state_read_mode === request.authority.stateReadMode
    && row.mode_version_id === request.authority.modeVersionId
    && row.content_hash === request.authority.contentHash
    && Number(row.pointer_revision) === request.authority.pointerRevision
    && row.authority_bundle_hash === request.authority.authorityBundleHash
    && row.authority_source === request.authority.source
    && Array.isArray(row.inbox_ids)
    && row.inbox_ids.length === request.inboxIds.length
    && row.inbox_ids.every((inboxId, index) => inboxId === request.inboxIds[index]);
}

function futureLease(value: Date | string | null, now: Date): boolean {
  if (value == null) return false;
  const expiry = new Date(value).getTime();
  return Number.isFinite(expiry) && expiry > now.getTime();
}

function hasSameInboxIds(
  values: readonly string[],
  expected: readonly string[],
): boolean {
  if (values.length !== expected.length) return false;
  try {
    const normalized = values
      .map((value) => requiredUuid(value, "DF13_FENCE_RUNTIME_INBOX_BINDING_INVALID"))
      .sort();
    return new Set(normalized).size === normalized.length
      && normalized.every((value, index) => value === expected[index]);
  } catch {
    return false;
  }
}

function runtimeCommitMatchesFence<TState, TSalesState>(
  request: Df13CommerceFenceStoreRequest,
  runtimeCommit: RealtimeCommitInput<TState, TSalesState>,
): boolean {
  return runtimeCommit.pageId === request.pageId
    && runtimeCommit.inboxBatchGuard !== undefined
    && hasSameInboxIds(runtimeCommit.inboxBatchGuard.inboxIds, request.inboxIds);
}

async function rollbackQuietly(client: PoolClient): Promise<void> {
  try { await client.query("ROLLBACK"); } catch { /* preserve the original failure */ }
}

/**
 * Dormant, source-level provider for the future DF13 COMMERCE boundary.
 * Its pending schema is deliberately outside `migrateUp` discovery.  It is
 * not constructed by the live runner. Admission never mutates Inbox status,
 * retry counters, dead-letter state, Outbox, or provider-delivery state;
 * fenced completion can write only the existing durable state/Outbox plan in
 * its one transaction and never sends or publishes a provider effect.
 */
export class PostgresDf13CommerceFenceStore {
  private readonly pool: Pool;

  constructor(connectionString: string, maxPoolSize = 3) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: maxPoolSize });
  }

  async acquire(input: Df13CommerceFenceStoreRequest, now = new Date()): Promise<Df13CommerceFenceAcquireResult> {
    const request = exactRequest(input);
    if (Number.isNaN(now.getTime())) throw new Error("DF13_FENCE_TIMESTAMP_INVALID");
    const fingerprint = fingerprintFromExactRequest(request);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `${request.pageId}:${request.channel}:${request.workId}`,
      ]);
      const existingResult = await client.query<FenceRow>(
        `SELECT fence_id, epoch, completed_at, lease_until, request_fingerprint,
                sales_authority_mode, state_read_mode, mode_version_id, content_hash, pointer_revision,
                authority_bundle_hash, authority_source, inbox_ids, token_hash
           FROM df13_commerce_authority_fences
          WHERE page_id = $1 AND channel = $2 AND work_id = $3
          FOR UPDATE`,
        [request.pageId, request.channel, request.workId],
      );
      const existing = existingResult.rows[0];
      if (existing) {
        if (!matchingFenceRow(existing, request, fingerprint)) {
          await client.query("ROLLBACK");
          return { status: "PARKED", reasonCode: "DF13_FENCE_IDENTITY_MISMATCH" };
        }
        const epoch = finiteEpoch(existing.epoch);
        if (epoch === null) throw new Error("DF13_FENCE_EPOCH_CORRUPT");
        if (existing.completed_at != null) {
          await client.query("COMMIT");
          return { status: "ALREADY_COMPLETED", epoch };
        }
        if (futureLease(existing.lease_until, now)) {
          await client.query("ROLLBACK");
          return { status: "PARKED", reasonCode: "DF13_FENCE_OVERLAPPING_LEASE" };
        }
      }

      const inboxRows = await client.query<{ inbox_id: string; page_id: string }>(
        `SELECT inbox_id, page_id
           FROM webhook_inbox
          WHERE inbox_id = ANY($1::uuid[])
          ORDER BY inbox_id
          FOR UPDATE`,
        [request.inboxIds],
      );
      if (inboxRows.rows.length !== request.inboxIds.length
        || inboxRows.rows.some((row) => row.page_id !== request.pageId)
        || new Set(inboxRows.rows.map((row) => row.inbox_id)).size !== request.inboxIds.length) {
        await client.query("ROLLBACK");
        return { status: "PARKED", reasonCode: "DF13_FENCE_INBOX_SET_INVALID" };
      }

      const fenceId = existing?.fence_id ?? randomUUID();
      const overlaps = await client.query<{ inbox_id: string }>(
        `SELECT inbox_id
           FROM df13_commerce_authority_fence_claims
          WHERE inbox_id = ANY($1::uuid[])
            AND released_at IS NULL
            AND fence_id <> $2
          FOR UPDATE`,
        [request.inboxIds, fenceId],
      );
      if (overlaps.rowCount !== 0) {
        await client.query("ROLLBACK");
        return { status: "PARKED", reasonCode: "DF13_FENCE_OVERLAPPING_LEASE" };
      }

      const nextEpoch = existing ? Number(existing.epoch) + 1 : 1;
      const fenceToken = randomUUID();
      const leaseUntil = new Date(now.getTime() + 5 * 60_000);
      if (existing) {
        await client.query(
          `UPDATE df13_commerce_authority_fence_claims
              SET released_at = $2
            WHERE fence_id = $1 AND released_at IS NULL`,
          [fenceId, now],
        );
      }
      const written = existing
        ? await client.query<{ fence_id: string; epoch: string | number }>(
          `UPDATE df13_commerce_authority_fences
              SET epoch = $2, token_hash = $3, lease_until = $4,
                  completed_at = NULL, updated_at = $5
            WHERE fence_id = $1
            RETURNING fence_id, epoch`,
          [fenceId, nextEpoch, tokenHash(fenceToken), leaseUntil, now],
        )
        : await client.query<{ fence_id: string; epoch: string | number }>(
          `INSERT INTO df13_commerce_authority_fences (
             fence_id, page_id, channel, work_id, inbox_ids, request_fingerprint,
             sales_authority_mode, state_read_mode, mode_version_id, content_hash,
             pointer_revision, authority_bundle_hash, authority_source, epoch,
             token_hash, lease_until, created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5::uuid[],$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
           RETURNING fence_id, epoch`,
          [
            fenceId, request.pageId, request.channel, request.workId, request.inboxIds, fingerprint,
            request.authority.salesAuthorityMode, request.authority.stateReadMode,
            request.authority.modeVersionId, request.authority.contentHash, request.authority.pointerRevision,
            request.authority.authorityBundleHash, request.authority.source, nextEpoch,
            tokenHash(fenceToken), leaseUntil, now,
          ],
        );
      if (written.rowCount !== 1 || finiteEpoch(written.rows[0]?.epoch ?? 0) !== nextEpoch) {
        throw new Error("DF13_FENCE_WRITE_FAILED");
      }
      const claims = await client.query<{ inbox_id: string }>(
        `INSERT INTO df13_commerce_authority_fence_claims (
           fence_id, inbox_id, epoch, claimed_at
         ) SELECT $1, inbox_id, $3, $4
           FROM unnest($2::uuid[]) AS inbox_id
         RETURNING inbox_id`,
        [fenceId, request.inboxIds, nextEpoch, now],
      );
      if (claims.rowCount !== request.inboxIds.length
        || new Set(claims.rows.map((row) => row.inbox_id)).size !== request.inboxIds.length) {
        throw new Error("DF13_FENCE_CLAIM_INTEGRITY_FAILURE");
      }
      await client.query("COMMIT");
      return { status: "HELD", lease: Object.freeze({ fenceToken, epoch: nextEpoch }) };
    } catch (error) {
      await rollbackQuietly(client);
      if (typeof error === "object" && error !== null
        && (error as { code?: string }).code === "23505"
        && (error as { constraint?: string }).constraint === "df13_commerce_authority_fence_claims_live_inbox_uq") {
        return { status: "PARKED", reasonCode: "DF13_FENCE_OVERLAPPING_LEASE" };
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * The only completion path for a held DF13 request. It runs the existing
   * durable runtime commit, releases every exact Inbox claim, and records
   * fence completion in one database transaction. It never sends or publishes
   * a provider effect; any customer-facing action remains a durable Outbox row.
   */
  async commitAuthorityDependentWork<TState, TSalesState = unknown>(
    input: Df13CommerceFenceCommitInput<TState, TSalesState>,
    runtime: Df13CommerceRuntimeCommitPort,
    runtimeNow = new Date(),
  ): Promise<Df13CommerceFenceCommitResult> {
    const request = exactRequest(input.request);
    const epoch = finiteEpoch(input.lease.epoch);
    const fenceToken = requiredUuid(input.lease.fenceToken, "DF13_FENCE_TOKEN_INVALID");
    if (epoch === null || Number.isNaN(runtimeNow.getTime())) {
      throw new Error("DF13_FENCE_COMPLETION_INPUT_INVALID");
    }
    const fingerprint = fingerprintFromExactRequest(request);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `${request.pageId}:${request.channel}:${request.workId}`,
      ]);
      const databaseClock = await client.query<{ now: Date | string }>(
        "SELECT clock_timestamp() AS now",
      );
      const fenceNow = new Date(databaseClock.rows[0]?.now ?? Number.NaN);
      if (Number.isNaN(fenceNow.getTime())) throw new Error("DF13_FENCE_DATABASE_CLOCK_INVALID");
      const existingResult = await client.query<FenceRow>(
        `SELECT fence_id, epoch, completed_at, lease_until, request_fingerprint,
                sales_authority_mode, state_read_mode, mode_version_id, content_hash, pointer_revision,
                authority_bundle_hash, authority_source, inbox_ids, token_hash
           FROM df13_commerce_authority_fences
          WHERE page_id = $1 AND channel = $2 AND work_id = $3
          FOR UPDATE`,
        [request.pageId, request.channel, request.workId],
      );
      const existing = existingResult.rows[0];
      if (!existing) {
        await client.query("ROLLBACK");
        return { status: "PARKED", reasonCode: "DF13_FENCE_LEASE_MISSING" };
      }
      if (!matchingFenceRow(existing, request, fingerprint)) {
        await client.query("ROLLBACK");
        return { status: "PARKED", reasonCode: "DF13_FENCE_IDENTITY_MISMATCH" };
      }
      const storedEpoch = finiteEpoch(existing.epoch);
      if (storedEpoch === null) throw new Error("DF13_FENCE_EPOCH_CORRUPT");
      if (existing.completed_at != null) {
        await client.query("COMMIT");
        return { status: "ALREADY_COMPLETED", epoch: storedEpoch };
      }
      if (
        storedEpoch !== epoch ||
        !futureLease(existing.lease_until, fenceNow) ||
        existing.token_hash !== tokenHash(fenceToken)
      ) {
        await client.query("ROLLBACK");
        return { status: "PARKED", reasonCode: "DF13_FENCE_LEASE_STALE" };
      }
      if (!runtimeCommitMatchesFence(request, input.runtimeCommit)) {
        await client.query("ROLLBACK");
        return { status: "PARKED", reasonCode: "DF13_FENCE_RUNTIME_INBOX_BINDING_INVALID" };
      }

      const runtimeResult = await runtime.commitWithinTransaction(
        client,
        input.runtimeCommit,
        runtimeNow,
      );
      if (!runtimeResult.stateCommitted || runtimeResult.inboxBatchStatus !== "COMMITTED") {
        throw new Error("DF13_FENCE_RUNTIME_COMMIT_NOT_APPLIED");
      }
      const released = await client.query<{ inbox_id: string }>(
        `UPDATE df13_commerce_authority_fence_claims
            SET released_at = $4
          WHERE fence_id = $1 AND epoch = $2
            AND inbox_id = ANY($3::uuid[]) AND released_at IS NULL
          RETURNING inbox_id`,
        [existing.fence_id, epoch, request.inboxIds, fenceNow],
      );
      if (
        released.rowCount !== request.inboxIds.length ||
        new Set(released.rows.map((row) => row.inbox_id)).size !== request.inboxIds.length
      ) {
        throw new Error("DF13_FENCE_CLAIM_RELEASE_INTEGRITY_FAILURE");
      }
      const completed = await client.query<{ fence_id: string }>(
        `UPDATE df13_commerce_authority_fences
            SET completed_at = $2, token_hash = NULL, lease_until = NULL, updated_at = $2
          WHERE fence_id = $1 AND epoch = $3 AND token_hash = $4
            AND completed_at IS NULL AND lease_until > clock_timestamp()
          RETURNING fence_id`,
        [existing.fence_id, fenceNow, epoch, tokenHash(fenceToken)],
      );
      if (completed.rowCount !== 1) throw new Error("DF13_FENCE_COMPLETION_WRITE_FAILED");
      await client.query("COMMIT");
      return Object.freeze({ status: "COMPLETED", epoch, runtime: runtimeResult });
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

}
