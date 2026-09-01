import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
} from "./df13-commerce-authority-bundle.js";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CONTENT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const BUNDLE_HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CHANNEL_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/u;

export type Df13CommerceCutoverFenceRequest = Readonly<{
  operationId: string;
  pageId: string;
  channel: string;
  preCutover: Readonly<{
    modeVersionId: string;
    contentHash: string;
    pointerRevision: number;
  }>;
  target: Readonly<{
    modeVersionId: string;
    contentHash: string;
    authorityBundleHash: string;
  }>;
}>;

export type Df13CommerceCutoverFenceLease = Readonly<{
  fenceId: string;
  fenceToken: string;
  epoch: number;
}>;

export type Df13CommerceCutoverFenceAcquireResult =
  | Readonly<{ status: "HELD"; lease: Df13CommerceCutoverFenceLease }>
  | Readonly<{ status: "HELD_RECONCILE_REQUIRED"; fenceId: string; epoch: number }>
  | Readonly<{ status: "ALREADY_RELEASED"; fenceId: string; epoch: number }>
  | Readonly<{ status: "PARKED"; reasonCode: string }>;

export type Df13CommerceCutoverFenceReleaseResult =
  | Readonly<{ status: "RELEASED" }>
  | Readonly<{ status: "STALE_OR_MISSING" }>;

export type Df13CommerceCutoverFenceObservation =
  | Readonly<{ status: "HELD"; fenceId: string; epoch: number }>
  | Readonly<{ status: "EXPIRED_RECOVERY_REQUIRED"; fenceId: string; epoch: number }>
  | Readonly<{ status: "ALREADY_RELEASED"; fenceId: string; epoch: number }>
  | Readonly<{ status: "MISSING" }>
  | Readonly<{ status: "MISMATCH"; reasonCode: string }>;

/**
 * Narrow durable provider for an authority transition.  It owns no generic
 * behavior-mode write path: the next DF13 operational adapter will consume a
 * held lease to perform its typed transition and exact readback protocol.
 */
export interface Df13CommerceCutoverFencePort {
  acquire(input: Df13CommerceCutoverFenceRequest): Promise<Df13CommerceCutoverFenceAcquireResult>;
  observe(input: Df13CommerceCutoverFenceRequest): Promise<Df13CommerceCutoverFenceObservation>;
  release(input: Df13CommerceCutoverFenceLease): Promise<Df13CommerceCutoverFenceReleaseResult>;
  close(): Promise<void>;
}

type CutoverFenceRow = {
  fence_id: string;
  operation_id: string;
  epoch: string | number;
  released_at: Date | string | null;
  lease_until: Date | string | null;
  pre_cutover_version_id: string;
  pre_cutover_content_hash: string;
  pre_cutover_pointer_revision: string | number;
  target_version_id: string;
  target_content_hash: string;
  target_authority_bundle_hash: string;
  request_fingerprint: string;
  database_now?: Date | string;
};

type BehaviorPointerRow = {
  active_version_id: string;
  pointer_revision: string | number;
};

type BehaviorVersionRow = {
  mode_version_id: string;
  page_id: string;
  channel: string;
  confirmation_mode: string;
  sales_authority_mode: string;
  state_read_mode: string;
  content_hash: string;
  authority_bundle_hash: string | null;
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function requiredUuid(value: string, code: string): string {
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value)) throw new Error(code);
  return value.toLowerCase();
}

function requiredContentHash(value: string, code: string): string {
  if (typeof value !== "string" || !CONTENT_HASH_PATTERN.test(value)) throw new Error(code);
  return value;
}

function requiredBundleHash(value: string): string {
  if (typeof value !== "string" || !BUNDLE_HASH_PATTERN.test(value)) {
    throw new Error("DF13_CUTOVER_FENCE_TARGET_BUNDLE_INVALID");
  }
  return value;
}

function requiredPageId(value: string): string {
  const pageId = value.trim();
  if (!/^[0-9]{5,32}$/u.test(pageId)) throw new Error("DF13_CUTOVER_FENCE_PAGE_INVALID");
  return pageId;
}

function requiredChannel(value: string): string {
  const channel = value.trim().toUpperCase();
  if (!CHANNEL_PATTERN.test(channel)) throw new Error("DF13_CUTOVER_FENCE_CHANNEL_INVALID");
  return channel;
}

function requiredRevision(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("DF13_CUTOVER_FENCE_PRE_CUTOVER_REVISION_INVALID");
  }
  return value;
}

function exactRequest(input: Df13CommerceCutoverFenceRequest): Df13CommerceCutoverFenceRequest {
  return Object.freeze({
    operationId: requiredUuid(input.operationId, "DF13_CUTOVER_FENCE_OPERATION_INVALID"),
    pageId: requiredPageId(input.pageId),
    channel: requiredChannel(input.channel),
    preCutover: Object.freeze({
      modeVersionId: requiredUuid(input.preCutover.modeVersionId, "DF13_CUTOVER_FENCE_PRE_CUTOVER_VERSION_INVALID"),
      contentHash: requiredContentHash(input.preCutover.contentHash, "DF13_CUTOVER_FENCE_PRE_CUTOVER_CONTENT_INVALID"),
      pointerRevision: requiredRevision(input.preCutover.pointerRevision),
    }),
    target: Object.freeze({
      modeVersionId: requiredUuid(input.target.modeVersionId, "DF13_CUTOVER_FENCE_TARGET_VERSION_INVALID"),
      contentHash: requiredContentHash(input.target.contentHash, "DF13_CUTOVER_FENCE_TARGET_CONTENT_INVALID"),
      authorityBundleHash: requiredBundleHash(input.target.authorityBundleHash),
    }),
  });
}

/** Re-derived from every immutable field; never accepts a copied fence hash. */
export function df13CommerceCutoverFenceRequestFingerprint(
  input: Df13CommerceCutoverFenceRequest,
): string {
  const request = exactRequest(input);
  return hash(canonicalJson({ schemaVersion: 1, ...request }));
}

function finiteEpoch(value: string | number): number | null {
  const epoch = Number(value);
  return Number.isSafeInteger(epoch) && epoch >= 1 ? epoch : null;
}

function leaseState(value: Date | string | null, now: Date): "HELD" | "EXPIRED" | "INVALID" {
  if (value === null) return "INVALID";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "INVALID";
  return timestamp > now.getTime() ? "HELD" : "EXPIRED";
}

function rowMatches(row: CutoverFenceRow, request: Df13CommerceCutoverFenceRequest): boolean {
  return typeof row.operation_id === "string" &&
    typeof row.pre_cutover_version_id === "string" &&
    typeof row.target_version_id === "string" &&
    row.operation_id.toLowerCase() === request.operationId &&
    row.pre_cutover_version_id.toLowerCase() === request.preCutover.modeVersionId &&
    row.pre_cutover_content_hash === request.preCutover.contentHash &&
    Number(row.pre_cutover_pointer_revision) === request.preCutover.pointerRevision &&
    row.target_version_id.toLowerCase() === request.target.modeVersionId &&
    row.target_content_hash === request.target.contentHash &&
    row.target_authority_bundle_hash === request.target.authorityBundleHash &&
    row.request_fingerprint === df13CommerceCutoverFenceRequestFingerprint(request);
}

function databaseTime(value: Date | string | undefined): Date | null {
  const now = new Date(value ?? Number.NaN);
  return Number.isNaN(now.getTime()) ? null : now;
}

async function readDatabaseTime(client: PoolClient): Promise<Date> {
  const result = await client.query<{ now: Date | string }>("SELECT clock_timestamp() AS now");
  const now = databaseTime(result.rows[0]?.now);
  if (now === null) throw new Error("DF13_CUTOVER_FENCE_DATABASE_CLOCK_INVALID");
  return now;
}

async function canonicalIdentityMatches(
  client: PoolClient,
  request: Df13CommerceCutoverFenceRequest,
): Promise<boolean> {
  const pointerResult = await client.query<BehaviorPointerRow>(
    `SELECT active_version_id, pointer_revision
       FROM runtime_behavior_mode_pointers
      WHERE page_id = $1 AND channel = $2
      FOR UPDATE`,
    [request.pageId, request.channel],
  );
  const pointer = pointerResult.rows[0];
  if (
    pointer === undefined ||
    pointer.active_version_id.toLowerCase() !== request.preCutover.modeVersionId ||
    Number(pointer.pointer_revision) !== request.preCutover.pointerRevision
  ) return false;
  const versionsResult = await client.query<BehaviorVersionRow>(
    `SELECT mode_version_id, page_id, channel, confirmation_mode,
            sales_authority_mode, state_read_mode, content_hash, authority_bundle_hash
       FROM runtime_behavior_mode_versions
      WHERE mode_version_id = ANY($1::uuid[])
      FOR KEY SHARE`,
    [[request.preCutover.modeVersionId, request.target.modeVersionId]],
  );
  if (versionsResult.rows.length !== 2) return false;
  const byId = new Map(versionsResult.rows.map((row) => [row.mode_version_id.toLowerCase(), row]));
  const preCutover = byId.get(request.preCutover.modeVersionId);
  const target = byId.get(request.target.modeVersionId);
  if (preCutover === undefined || target === undefined) return false;
  if (
    preCutover.page_id !== request.pageId ||
    preCutover.channel !== request.channel ||
    preCutover.state_read_mode !== "LEGACY" ||
    preCutover.content_hash !== request.preCutover.contentHash ||
    target.page_id !== request.pageId ||
    target.channel !== request.channel ||
    target.confirmation_mode !== preCutover.confirmation_mode ||
    target.sales_authority_mode !== "COMMERCE" ||
    target.state_read_mode !== "LEGACY" ||
    target.content_hash !== request.target.contentHash ||
    target.authority_bundle_hash !== request.target.authorityBundleHash
  ) return false;
  const firstCommerceCutover =
    preCutover.sales_authority_mode === "LEGACY" &&
    preCutover.authority_bundle_hash === null &&
    target.authority_bundle_hash === DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash;
  const trackBScope = request.pageId === "1198992073286645" && request.channel === "MESSENGER";
  const trackBReplacement =
    trackBScope &&
    preCutover.sales_authority_mode === "COMMERCE" &&
    preCutover.authority_bundle_hash === DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash &&
    target.authority_bundle_hash === DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash;
  const trackBRollback =
    trackBScope &&
    preCutover.sales_authority_mode === "COMMERCE" &&
    preCutover.authority_bundle_hash === DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash &&
    target.authority_bundle_hash === DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash;
  return firstCommerceCutover || trackBReplacement || trackBRollback;
}

async function rollbackQuietly(client: PoolClient): Promise<void> {
  try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
}

export class PostgresDf13CommerceCutoverFenceStore implements Df13CommerceCutoverFencePort {
  readonly #pool: Pool;
  readonly #leaseMs: number;

  constructor(connectionString: string, leaseMs = 60_000) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    if (!Number.isSafeInteger(leaseMs) || leaseMs < 10_000 || leaseMs > 300_000) {
      throw new Error("DF13_CUTOVER_FENCE_LEASE_INVALID");
    }
    this.#pool = new Pool({ connectionString, max: 2 });
    this.#leaseMs = leaseMs;
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }

  async acquire(input: Df13CommerceCutoverFenceRequest): Promise<Df13CommerceCutoverFenceAcquireResult> {
    const request = exactRequest(input);
    const fingerprint = df13CommerceCutoverFenceRequestFingerprint(request);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `df13-cutover:${request.pageId}:${request.channel}`,
      ]);
      const operationResult = await client.query<CutoverFenceRow>(
        `SELECT fence_id, operation_id, epoch, released_at, lease_until,
                pre_cutover_version_id, pre_cutover_content_hash, pre_cutover_pointer_revision,
                target_version_id, target_content_hash, target_authority_bundle_hash,
                request_fingerprint
           FROM df13_commerce_cutover_fences
          WHERE operation_id = $1
          FOR UPDATE`,
        [request.operationId],
      );
      const operation = operationResult.rows[0];
      if (operation !== undefined) {
        if (!rowMatches(operation, request)) {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_OPERATION_IDENTITY_MISMATCH" });
        }
        const epoch = finiteEpoch(operation.epoch);
        if (epoch === null) {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_EPOCH_INVALID" });
        }
        if (operation.released_at !== null) {
          await client.query("COMMIT");
          return Object.freeze({ status: "ALREADY_RELEASED", fenceId: operation.fence_id, epoch });
        }
        const operationNow = await readDatabaseTime(client);
        const operationLease = leaseState(operation.lease_until, operationNow);
        if (operationLease === "INVALID") {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_LEASE_INVALID" });
        }
        if (operationLease === "HELD") {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "HELD_RECONCILE_REQUIRED", fenceId: operation.fence_id, epoch });
        }
        const fenceToken = randomUUID();
        const reacquired = await client.query<{ epoch: string | number }>(
          `WITH current_clock AS (SELECT clock_timestamp() AS now)
           UPDATE df13_commerce_cutover_fences AS fence
              SET epoch = $2, token_hash = $3,
                  lease_until = current_clock.now + ($4::integer * interval '1 millisecond'),
                  updated_at = current_clock.now
             FROM current_clock
            WHERE fence.fence_id = $1 AND fence.epoch = $5 AND fence.released_at IS NULL
              AND fence.lease_until <= current_clock.now
          RETURNING fence.epoch`,
          [operation.fence_id, epoch + 1, hash(fenceToken), this.#leaseMs, epoch],
        );
        if (reacquired.rowCount !== 1) {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_CONCURRENCY_CONFLICT" });
        }
        await client.query("COMMIT");
        return Object.freeze({
          status: "HELD",
          lease: Object.freeze({ fenceId: operation.fence_id, fenceToken, epoch: epoch + 1 }),
        });
      }

      const activeScopeResult = await client.query<CutoverFenceRow>(
        `SELECT fence_id, operation_id, epoch, released_at, lease_until,
                pre_cutover_version_id, pre_cutover_content_hash, pre_cutover_pointer_revision,
                target_version_id, target_content_hash, target_authority_bundle_hash,
                request_fingerprint
           FROM df13_commerce_cutover_fences
          WHERE page_id = $1 AND channel = $2 AND released_at IS NULL
          ORDER BY created_at DESC
          FOR UPDATE`,
        [request.pageId, request.channel],
      );
      if (activeScopeResult.rows[0] !== undefined) {
        await client.query("ROLLBACK");
        return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_SCOPE_RECOVERY_REQUIRED" });
      }
      if (!await canonicalIdentityMatches(client, request)) {
        await client.query("ROLLBACK");
        return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_CANONICAL_IDENTITY_INVALID" });
      }

      const fenceId = randomUUID();
      const fenceToken = randomUUID();
      const inserted = await client.query<{
        fence_id: string;
        epoch: string | number;
        lease_live: boolean;
      }>(
        `INSERT INTO df13_commerce_cutover_fences (
           fence_id, operation_id, page_id, channel,
           pre_cutover_version_id, pre_cutover_content_hash, pre_cutover_pointer_revision,
           target_version_id, target_content_hash, target_authority_bundle_hash,
           request_fingerprint, epoch, token_hash, lease_until, released_at, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12,
           clock_timestamp() + ($13::integer * interval '1 millisecond'),NULL,
           clock_timestamp(),clock_timestamp()
         ) RETURNING fence_id, epoch, lease_until > clock_timestamp() AS lease_live`,
        [
          fenceId, request.operationId, request.pageId, request.channel,
          request.preCutover.modeVersionId, request.preCutover.contentHash, request.preCutover.pointerRevision,
          request.target.modeVersionId, request.target.contentHash, request.target.authorityBundleHash,
          fingerprint, hash(fenceToken), this.#leaseMs,
        ],
      );
      const insertedRow = inserted.rows[0];
      if (
        !insertedRow ||
        finiteEpoch(insertedRow.epoch) !== 1 ||
        insertedRow.fence_id !== fenceId ||
        insertedRow.lease_live !== true
      ) {
        await client.query("ROLLBACK");
        return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_INSERT_UNVERIFIABLE" });
      }
      await client.query("COMMIT");
      return Object.freeze({
        status: "HELD",
        lease: Object.freeze({ fenceId, fenceToken, epoch: 1 }),
      });
    } catch (error) {
      await rollbackQuietly(client);
      if (
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: unknown }).code === "23505"
      ) {
        return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_CONCURRENCY_CONFLICT" });
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async observe(input: Df13CommerceCutoverFenceRequest): Promise<Df13CommerceCutoverFenceObservation> {
    const request = exactRequest(input);
    const result = await this.#pool.query<CutoverFenceRow>(
      `SELECT fence_id, operation_id, epoch, released_at, lease_until,
              pre_cutover_version_id, pre_cutover_content_hash, pre_cutover_pointer_revision,
              target_version_id, target_content_hash, target_authority_bundle_hash,
              request_fingerprint, clock_timestamp() AS database_now
         FROM df13_commerce_cutover_fences
        WHERE operation_id = $1`,
      [request.operationId],
    );
    const row = result.rows[0];
    if (row === undefined) return Object.freeze({ status: "MISSING" });
    if (!rowMatches(row, request)) {
      return Object.freeze({ status: "MISMATCH", reasonCode: "DF13_CUTOVER_FENCE_OPERATION_IDENTITY_MISMATCH" });
    }
    const epoch = finiteEpoch(row.epoch);
    if (epoch === null) return Object.freeze({ status: "MISMATCH", reasonCode: "DF13_CUTOVER_FENCE_EPOCH_INVALID" });
    if (row.released_at !== null) {
      return Object.freeze({ status: "ALREADY_RELEASED", fenceId: row.fence_id, epoch });
    }
    const now = databaseTime(row.database_now);
    const state = now === null ? "INVALID" : leaseState(row.lease_until, now);
    if (state === "HELD") return Object.freeze({ status: "HELD", fenceId: row.fence_id, epoch });
    if (state === "EXPIRED") {
      return Object.freeze({ status: "EXPIRED_RECOVERY_REQUIRED", fenceId: row.fence_id, epoch });
    }
    return Object.freeze({ status: "MISMATCH", reasonCode: "DF13_CUTOVER_FENCE_LEASE_INVALID" });
  }

  async release(input: Df13CommerceCutoverFenceLease): Promise<Df13CommerceCutoverFenceReleaseResult> {
    const fenceId = requiredUuid(input.fenceId, "DF13_CUTOVER_FENCE_ID_INVALID");
    const fenceToken = requiredUuid(input.fenceToken, "DF13_CUTOVER_FENCE_TOKEN_INVALID");
    const epoch = finiteEpoch(input.epoch);
    if (epoch === null) throw new Error("DF13_CUTOVER_FENCE_EPOCH_INVALID");
    const result = await this.#pool.query(
      `UPDATE df13_commerce_cutover_fences
          SET token_hash = NULL, lease_until = NULL,
              released_at = clock_timestamp(), updated_at = clock_timestamp()
        WHERE fence_id = $1 AND epoch = $2 AND token_hash = $3 AND released_at IS NULL
          AND lease_until > clock_timestamp()
      RETURNING fence_id`,
      [fenceId, epoch, hash(fenceToken)],
    );
    return result.rowCount === 1
      ? Object.freeze({ status: "RELEASED" })
      : Object.freeze({ status: "STALE_OR_MISSING" });
  }
}

export function createDf13CommerceCutoverFencePort(
  connectionString: string,
): Df13CommerceCutoverFencePort {
  const store = new PostgresDf13CommerceCutoverFenceStore(connectionString);
  return Object.freeze({
    acquire: store.acquire.bind(store),
    observe: store.observe.bind(store),
    release: store.release.bind(store),
    close: store.close.bind(store),
  });
}
