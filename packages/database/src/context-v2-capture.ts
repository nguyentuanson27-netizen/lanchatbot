import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import {
  ContextV2CaptureV1Schema,
  canonicalJsonV1,
  type ContextV2,
  type ContextV2CaptureV1,
} from "@lana/contracts";

export interface ContextV2CapturePlan {
  readonly capture: ContextV2CaptureV1;
}

export interface ContextV2CapturePersistenceResult {
  readonly created: boolean;
  readonly reasonCode: "CONTEXT_V2_CAPTURE_WRITE_FAILED" | null;
}

export type ContextV2CaptureEligibility =
  | { readonly kind: "BUILT_VALID"; readonly context: ContextV2 }
  | { readonly kind: "BUILT_INVALID"; readonly reasonCode: string }
  | { readonly kind: "BLOCKED"; readonly reasonCode: string }
  | {
      readonly kind: "AMBIGUOUS";
      readonly captureCount: number;
      readonly reasonCode: "CONTEXT_V2_CAPTURE_AMBIGUOUS";
    }
  | { readonly kind: "NOT_TERMINAL" }
  | { readonly kind: "ABSENT_AFTER_DEADLINE"; readonly reasonCode: "CONTEXT_V2_SNAPSHOT_ABSENT" }
  | { readonly kind: "DB_ERROR"; readonly reasonCode: "CONTEXT_V2_CAPTURE_READ_FAILED" };

export interface InspectContextV2CaptureInput {
  readonly conversationId: string;
  readonly sourceMessagePk: string;
  readonly sourceOccurredAt: Date;
  readonly now: Date;
  readonly terminalDeadlineMs: number;
  readonly pruningWindowMs?: number;
}

/**
 * The live COMMERCE consumer reads precisely one newest terminal snapshot. It
 * never searches backwards for an older "good" snapshot because that would
 * make an invalid or blocked current state silently authoritative.
 */
export type LatestContextV2ForCommerce =
  | Readonly<{ kind: "READY"; context: ContextV2 }>
  | Readonly<{ kind: "ABSENT"; reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_ABSENT" }>
  | Readonly<{ kind: "BLOCKED"; reasonCode: string }>
  | Readonly<{ kind: "INVALID"; reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_INVALID" }>
  | Readonly<{ kind: "STALE"; reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_STALE" }>
  | Readonly<{ kind: "DB_ERROR"; reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_READ_FAILED" }>;

export interface ReadLatestContextV2ForCommerceInput {
  readonly conversationId: string;
  readonly now: Date;
  /** Bounded freshness window supplied by the active COMMERCE execution contract. */
  readonly maximumAgeMs: number;
}

function validContext(capture: ContextV2CaptureV1): ContextV2 | null {
  if (capture.status !== "BUILT" || capture.context === null) return null;
  const { contextHash, ...draft } = capture.context;
  const expected = createHash("sha256")
    .update(`CONTEXT_V2\n${canonicalJsonV1(draft)}`, "utf8")
    .digest("hex");
  return contextHash === expected && capture.contextHash === expected
    ? capture.context
    : null;
}

function contextFreshForCommerce(
  capture: ContextV2CaptureV1,
  context: ContextV2,
  input: ReadLatestContextV2ForCommerceInput,
): boolean {
  const nowMs = input.now.getTime();
  const sourceOccurredAt = Date.parse(capture.sourceOccurredAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(sourceOccurredAt) ||
      !Number.isFinite(input.maximumAgeMs) ||
      input.maximumAgeMs < 1_000 || input.maximumAgeMs > 15 * 60_000) {
    return false;
  }
  if (sourceOccurredAt > nowMs + 5 * 60_000 || nowMs - sourceOccurredAt > input.maximumAgeMs) {
    return false;
  }
  if (context.verifiedClaims.some(({ provenance }) => {
    const observedAt = Date.parse(provenance.observedAt);
    const expiresAt = Date.parse(provenance.expiresAt);
    return !Number.isFinite(observedAt) || !Number.isFinite(expiresAt) ||
      observedAt > nowMs + 5 * 60_000 || expiresAt <= nowMs;
  })) return false;
  if (context.cartReadiness !== null) {
    const readinessExpiry = Date.parse(context.cartReadiness.expiresAt);
    if (!Number.isFinite(readinessExpiry) || readinessExpiry <= nowMs) return false;
  }
  return true;
}

function deterministicCaptureUuid(seed: string): string {
  const hex = createHash("sha256").update(seed, "utf8").digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function blockedAtCommit(
  capture: ContextV2CaptureV1,
  reasonCode:
    | "CONTEXT_V2_CLAIM_EXPIRED_AT_COMMIT"
    | "CONTEXT_V2_READINESS_EXPIRED_AT_COMMIT",
): ContextV2CaptureV1 {
  return ContextV2CaptureV1Schema.parse({
    ...capture,
    status: "BLOCKED",
    context: null,
    contextHash: null,
    reasonCode,
  });
}

/** Revalidates candidate-affecting freshness against the database clock. */
export function prepareContextV2CaptureForCommit(
  input: ContextV2CaptureV1,
  transactionNow: Date,
): ContextV2CaptureV1 {
  const capture = ContextV2CaptureV1Schema.parse(input);
  const nowMs = transactionNow.getTime();
  if (!Number.isFinite(nowMs)) throw new Error("CONTEXT_V2_COMMIT_CLOCK_INVALID");
  if (capture.status === "BLOCKED" || capture.context === null) return capture;
  const staleClaim = capture.context.verifiedClaims.some(({ provenance }) => {
    const observedAt = Date.parse(provenance.observedAt);
    const expiresAt = Date.parse(provenance.expiresAt);
    return !Number.isFinite(observedAt) || !Number.isFinite(expiresAt) ||
      observedAt > nowMs + 5 * 60_000 || expiresAt <= nowMs;
  });
  if (staleClaim) {
    return blockedAtCommit(capture, "CONTEXT_V2_CLAIM_EXPIRED_AT_COMMIT");
  }
  const readinessExpiresAt = capture.context.cartReadiness === null
    ? null
    : Date.parse(capture.context.cartReadiness.expiresAt);
  if (readinessExpiresAt !== null &&
      (!Number.isFinite(readinessExpiresAt) || readinessExpiresAt <= nowMs)) {
    return blockedAtCommit(capture, "CONTEXT_V2_READINESS_EXPIRED_AT_COMMIT");
  }
  return capture;
}

export async function insertContextV2Capture(
  client: PoolClient,
  identity: Readonly<{
    conversationId: string;
    pageId: string;
    customerHash: string;
    owner: "BOT" | "HUMAN";
  }>,
  plan: ContextV2CapturePlan,
  transactionNow: Date,
): Promise<boolean> {
  const capture = prepareContextV2CaptureForCommit(plan.capture, transactionNow);
  const eventId = deterministicCaptureUuid(
    `lana:context-v2-capture:v1:${capture.sourceMessagePk}:${canonicalJsonV1(capture)}`,
  );
  const result = await client.query(
    `INSERT INTO conversation_events (
       event_id, conversation_id, page_id, customer_hash, event_type,
       intent, stage, action, handoff_reason, owner, product_id,
       prompt_version, model_version, policy_version, catalog_version,
       event_metadata, occurred_at
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4, 'CONTEXT_V2_DERIVED',
       NULL, NULL, NULL, NULL, $5, NULL,
       NULL, NULL, NULL, NULL,
       $6::jsonb, $7::timestamptz
     )
     ON CONFLICT (event_id, occurred_at) DO NOTHING`,
    [
      eventId,
      identity.conversationId,
      identity.pageId,
      identity.customerHash,
      identity.owner,
      JSON.stringify(capture),
      capture.sourceOccurredAt,
    ],
  );
  return result.rowCount === 1;
}

/**
 * Isolates ordinary capture-statement failures when savepoint recovery
 * succeeds. A savepoint recovery failure still propagates because the
 * enclosing transaction can no longer be treated as healthy.
 */
export async function persistContextV2CaptureFailSoft(
  client: PoolClient,
  identity: Parameters<typeof insertContextV2Capture>[1],
  plan: ContextV2CapturePlan,
): Promise<ContextV2CapturePersistenceResult> {
  const savepoint = "context_v2_capture";
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const clock = await client.query<{ capture_now: Date }>(
      "SELECT clock_timestamp() AS capture_now",
    );
    const captureNow = clock.rows[0]?.capture_now;
    if (!(captureNow instanceof Date) || !Number.isFinite(captureNow.getTime())) {
      throw new Error("CONTEXT_V2_COMMIT_CLOCK_INVALID");
    }
    const created = await insertContextV2Capture(
      client,
      identity,
      plan,
      captureNow,
    );
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return { created, reasonCode: null };
  } catch {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return { created: false, reasonCode: "CONTEXT_V2_CAPTURE_WRITE_FAILED" };
  }
}

export async function inspectContextV2Capture(
  client: PoolClient,
  input: InspectContextV2CaptureInput,
): Promise<ContextV2CaptureEligibility> {
  const pruningWindowMs = Math.max(
    1_000,
    Math.min(15 * 60_000, input.pruningWindowMs ?? 5 * 60_000),
  );
  try {
    const result = await client.query<{ capture: unknown }>(
      `SELECT event_metadata AS capture
       FROM conversation_events
       WHERE conversation_id = $1::uuid
         AND occurred_at >= $2::timestamptz
         AND occurred_at <= $3::timestamptz
         AND event_type = 'CONTEXT_V2_DERIVED'
         AND event_metadata->>'sourceMessagePk' = $4
       ORDER BY occurred_at, event_id
       LIMIT 3`,
      [
        input.conversationId,
        new Date(input.sourceOccurredAt.getTime() - pruningWindowMs),
        new Date(input.sourceOccurredAt.getTime() + pruningWindowMs),
        input.sourceMessagePk,
      ],
    );
    if (result.rows.length === 0) {
      return input.now.getTime() - input.sourceOccurredAt.getTime() >=
        input.terminalDeadlineMs
        ? {
            kind: "ABSENT_AFTER_DEADLINE",
            reasonCode: "CONTEXT_V2_SNAPSHOT_ABSENT",
          }
        : { kind: "NOT_TERMINAL" };
    }
    if (result.rows.length !== 1) {
      return {
        kind: "AMBIGUOUS",
        captureCount: result.rows.length,
        reasonCode: "CONTEXT_V2_CAPTURE_AMBIGUOUS",
      };
    }
    const parsed = ContextV2CaptureV1Schema.safeParse(result.rows[0]?.capture);
    if (!parsed.success) {
      return {
        kind: "BUILT_INVALID",
        reasonCode: "CONTEXT_V2_CAPTURE_SCHEMA_INVALID",
      };
    }
    if (parsed.data.sourceMessagePk !== input.sourceMessagePk) {
      return {
        kind: "BUILT_INVALID",
        reasonCode: "CONTEXT_V2_CAPTURE_SOURCE_MISMATCH",
      };
    }
    if (parsed.data.status === "BLOCKED") {
      return {
        kind: "BLOCKED",
        reasonCode: parsed.data.reasonCode ?? "CONTEXT_V2_CAPTURE_BLOCKED",
      };
    }
    const context = validContext(parsed.data);
    return context === null
      ? {
          kind: "BUILT_INVALID",
          reasonCode: "CONTEXT_V2_CAPTURE_INTEGRITY_INVALID",
        }
      : { kind: "BUILT_VALID", context };
  } catch {
    return {
      kind: "DB_ERROR",
      reasonCode: "CONTEXT_V2_CAPTURE_READ_FAILED",
    };
  }
}

/**
 * Reads the sole latest Context V2 capture eligible for the COMMERCE runtime.
 * The returned context has its capture and internal hashes re-derived, then
 * every expiry is checked against the caller's supplied clock. A blocked,
 * malformed or stale latest capture is terminal for this decision; callers
 * must hold/retry rather than consult an older legacy or Context V2 state.
 */
export async function readLatestContextV2ForCommerce(
  client: Pick<PoolClient, "query">,
  input: ReadLatestContextV2ForCommerceInput,
): Promise<LatestContextV2ForCommerce> {
  try {
    const result = await client.query<{ capture: unknown }>(
      `SELECT event_metadata AS capture
       FROM conversation_events
       WHERE conversation_id = $1::uuid
         AND event_type = 'CONTEXT_V2_DERIVED'
       ORDER BY occurred_at DESC, event_id DESC
       LIMIT 1`,
      [input.conversationId],
    );
    if (result.rows.length === 0) {
      return { kind: "ABSENT", reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_ABSENT" };
    }
    const parsed = ContextV2CaptureV1Schema.safeParse(result.rows[0]?.capture);
    if (!parsed.success) {
      return { kind: "INVALID", reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_INVALID" };
    }
    if (parsed.data.status === "BLOCKED") {
      return {
        kind: "BLOCKED",
        reasonCode: parsed.data.reasonCode ?? "CONTEXT_V2_RUNTIME_SNAPSHOT_BLOCKED",
      };
    }
    const context = validContext(parsed.data);
    if (context === null) {
      return { kind: "INVALID", reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_INVALID" };
    }
    if (!contextFreshForCommerce(parsed.data, context, input)) {
      return { kind: "STALE", reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_STALE" };
    }
    return { kind: "READY", context };
  } catch {
    return { kind: "DB_ERROR", reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_READ_FAILED" };
  }
}

export async function probeContextV2CaptureRead(
  client: Pick<PoolClient, "query">,
): Promise<void> {
  try {
    await client.query(
      `SELECT event_metadata
       FROM conversation_events
       WHERE event_type = 'CONTEXT_V2_DERIVED'
       LIMIT 0`,
    );
  } catch {
    throw new Error("CONTEXT_V2_CAPTURE_READ_UNAVAILABLE");
  }
}
