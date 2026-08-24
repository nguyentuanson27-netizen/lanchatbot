import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CONTENT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const BUNDLE_HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CHANNEL_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/u;

export type Df13CommerceCutoverFenceRequest = Readonly<{
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
  | Readonly<{ status: "PARKED"; reasonCode: string }>;

export type Df13CommerceCutoverFenceReleaseResult =
  | Readonly<{ status: "RELEASED" }>
  | Readonly<{ status: "STALE_OR_MISSING" }>;

/**
 * Narrow durable provider for an authority transition.  It owns no generic
 * behavior-mode write path: the next DF13 operational adapter will consume a
 * held lease to perform its typed transition and exact readback protocol.
 */
export interface Df13CommerceCutoverFencePort {
  acquire(input: Df13CommerceCutoverFenceRequest): Promise<Df13CommerceCutoverFenceAcquireResult>;
  release(input: Df13CommerceCutoverFenceLease): Promise<Df13CommerceCutoverFenceReleaseResult>;
  close(): Promise<void>;
}

type CutoverFenceRow = {
  fence_id: string;
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
  return row.pre_cutover_version_id.toLowerCase() === request.preCutover.modeVersionId &&
    row.pre_cutover_content_hash === request.preCutover.contentHash &&
    Number(row.pre_cutover_pointer_revision) === request.preCutover.pointerRevision &&
    row.target_version_id.toLowerCase() === request.target.modeVersionId &&
    row.target_content_hash === request.target.contentHash &&
    row.target_authority_bundle_hash === request.target.authorityBundleHash &&
    row.request_fingerprint === df13CommerceCutoverFenceRequestFingerprint(request);
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

  async acquire(input: Df13CommerceCutoverFenceRequest, now = new Date()): Promise<Df13CommerceCutoverFenceAcquireResult> {
    if (Number.isNaN(now.getTime())) throw new Error("DF13_CUTOVER_FENCE_TIMESTAMP_INVALID");
    const request = exactRequest(input);
    const fingerprint = df13CommerceCutoverFenceRequestFingerprint(request);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `df13-cutover:${request.pageId}:${request.channel}`,
      ]);
      const existingResult = await client.query<CutoverFenceRow>(
        `SELECT fence_id, epoch, released_at, lease_until,
                pre_cutover_version_id, pre_cutover_content_hash, pre_cutover_pointer_revision,
                target_version_id, target_content_hash, target_authority_bundle_hash,
                request_fingerprint
           FROM df13_commerce_cutover_fences
          WHERE page_id = $1 AND channel = $2 AND released_at IS NULL
          ORDER BY created_at DESC
          FOR UPDATE`,
        [request.pageId, request.channel],
      );
      const existing = existingResult.rows[0];
      if (existing) {
        if (!rowMatches(existing, request)) {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_IDENTITY_MISMATCH" });
        }
        const existingLeaseState = leaseState(existing.lease_until, now);
        if (existingLeaseState === "INVALID") {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_LEASE_INVALID" });
        }
        if (existingLeaseState === "HELD") {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_ALREADY_HELD" });
        }
        const epoch = finiteEpoch(existing.epoch);
        if (epoch === null) {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_EPOCH_INVALID" });
        }
        const fenceToken = randomUUID();
        const reacquired = await client.query<{ epoch: string | number }>(
          `UPDATE df13_commerce_cutover_fences
              SET epoch = $2, token_hash = $3,
                  lease_until = $4 + ($5::integer * interval '1 millisecond'),
                  updated_at = $4
            WHERE fence_id = $1 AND epoch = $6 AND released_at IS NULL
          RETURNING epoch`,
          [existing.fence_id, epoch + 1, hash(fenceToken), now, this.#leaseMs, epoch],
        );
        if (reacquired.rowCount !== 1) {
          await client.query("ROLLBACK");
          return Object.freeze({ status: "PARKED", reasonCode: "DF13_CUTOVER_FENCE_CONCURRENCY_CONFLICT" });
        }
        await client.query("COMMIT");
        return Object.freeze({
          status: "HELD",
          lease: Object.freeze({ fenceId: existing.fence_id, fenceToken, epoch: epoch + 1 }),
        });
      }

      const fenceId = randomUUID();
      const fenceToken = randomUUID();
      const inserted = await client.query<{ fence_id: string; epoch: string | number }>(
        `INSERT INTO df13_commerce_cutover_fences (
           fence_id, page_id, channel,
           pre_cutover_version_id, pre_cutover_content_hash, pre_cutover_pointer_revision,
           target_version_id, target_content_hash, target_authority_bundle_hash,
           request_fingerprint, epoch, token_hash, lease_until, released_at, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,$11,
           $12 + ($13::integer * interval '1 millisecond'),NULL,$12,$12
         ) RETURNING fence_id, epoch`,
        [
          fenceId, request.pageId, request.channel,
          request.preCutover.modeVersionId, request.preCutover.contentHash, request.preCutover.pointerRevision,
          request.target.modeVersionId, request.target.contentHash, request.target.authorityBundleHash,
          fingerprint, hash(fenceToken), now, this.#leaseMs,
        ],
      );
      const insertedRow = inserted.rows[0];
      if (!insertedRow || finiteEpoch(insertedRow.epoch) !== 1 || insertedRow.fence_id !== fenceId) {
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

  async release(input: Df13CommerceCutoverFenceLease): Promise<Df13CommerceCutoverFenceReleaseResult> {
    const fenceId = requiredUuid(input.fenceId, "DF13_CUTOVER_FENCE_ID_INVALID");
    const fenceToken = requiredUuid(input.fenceToken, "DF13_CUTOVER_FENCE_TOKEN_INVALID");
    const epoch = finiteEpoch(input.epoch);
    if (epoch === null) throw new Error("DF13_CUTOVER_FENCE_EPOCH_INVALID");
    const result = await this.#pool.query(
      `UPDATE df13_commerce_cutover_fences
          SET token_hash = NULL, lease_until = NULL, released_at = now(), updated_at = now()
        WHERE fence_id = $1 AND epoch = $2 AND token_hash = $3 AND released_at IS NULL
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
    release: store.release.bind(store),
    close: store.close.bind(store),
  });
}
