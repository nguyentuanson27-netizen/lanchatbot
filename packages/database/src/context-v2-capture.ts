import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import {
  ContextV2CaptureV1Schema,
  canonicalJsonV1,
  type ContextV2,
  type ContextV2CaptureV1,
} from "@lana/contracts";

export interface ContextV2CapturePlan {
  readonly eventId: string;
  readonly capture: ContextV2CaptureV1;
}

export type ContextV2CaptureEligibility =
  | { readonly kind: "BUILT_VALID"; readonly context: ContextV2 }
  | { readonly kind: "BUILT_INVALID"; readonly reasonCode: string }
  | { readonly kind: "BLOCKED"; readonly reasonCode: string }
  | { readonly kind: "AMBIGUOUS"; readonly captureCount: number }
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

export async function insertContextV2Capture(
  client: PoolClient,
  identity: Readonly<{
    conversationId: string;
    pageId: string;
    customerHash: string;
    owner: "BOT" | "HUMAN";
  }>,
  plan: ContextV2CapturePlan,
): Promise<boolean> {
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
      plan.eventId,
      identity.conversationId,
      identity.pageId,
      identity.customerHash,
      identity.owner,
      JSON.stringify(ContextV2CaptureV1Schema.parse(plan.capture)),
      plan.capture.sourceOccurredAt,
    ],
  );
  if (result.rowCount === 1) return true;
  const existing = await client.query<{
    conversation_id: string;
    page_id: string;
    customer_hash: string;
    owner: string;
    capture: unknown;
  }>(
    `SELECT conversation_id::text, page_id, customer_hash, owner,
            event_metadata AS capture
     FROM conversation_events
     WHERE event_id = $1::uuid
       AND occurred_at = $2::timestamptz
       AND event_type = 'CONTEXT_V2_DERIVED'`,
    [plan.eventId, plan.capture.sourceOccurredAt],
  );
  const row = existing.rows[0];
  const parsed = ContextV2CaptureV1Schema.safeParse(row?.capture);
  if (!row || existing.rows.length !== 1 || !parsed.success ||
      row.conversation_id !== identity.conversationId ||
      row.page_id !== identity.pageId ||
      row.customer_hash !== identity.customerHash ||
      row.owner !== identity.owner ||
      canonicalJsonV1(parsed.data) !== canonicalJsonV1(plan.capture)) {
    throw new Error("CONTEXT_V2_CAPTURE_IDEMPOTENCY_CONFLICT");
  }
  return false;
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
      return { kind: "AMBIGUOUS", captureCount: result.rows.length };
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
