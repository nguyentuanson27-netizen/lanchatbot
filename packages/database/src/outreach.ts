import { createHmac, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { withTransaction } from "./repositories.js";

export interface UpsaleSuppressionRecordInput {
  readonly eventKey: string;
  readonly providerMessageId: string | null;
  readonly pageId: string;
  readonly conversationHash: string;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly contentHash: string;
}

export interface UpsaleSuppressionRecordResult {
  readonly inserted: boolean;
  readonly outreachId?: string;
  readonly conversationId?: string;
}

export interface UpsaleSuppressionStore {
  record(input: UpsaleSuppressionRecordInput): Promise<UpsaleSuppressionRecordResult>;
}

export interface OutreachResponseInput {
  readonly pageId: string;
  readonly customerHash: string;
  readonly conversationId: string;
  readonly providerMessageId: string;
  readonly respondedAt: Date;
  readonly responseIntent?: string | null;
  readonly sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "UNKNOWN";
  readonly isPositive?: boolean;
  readonly isOptOut?: boolean;
}

export interface OutreachConversionInput {
  readonly pageId: string;
  readonly customerHash: string;
  readonly confirmedAt: Date;
  readonly orderValue: number;
  readonly currency?: string;
}

export interface OutreachReceiptInput {
  readonly pageId: string;
  readonly providerMessageId: string;
  readonly receipt: "DELIVERED" | "READ";
  readonly occurredAt: Date;
}

export interface PostgresOutreachOptions {
  readonly analyticsHashSalt: string;
  readonly maxConnections?: number;
}

export interface OutreachAttributionResult {
  readonly attributed: boolean;
  readonly outreachId: string | null;
}

interface OutreachRow {
  outreach_id: string;
  conversation_id: string;
}

function hmac(salt: string, namespace: string, ...parts: readonly string[]): string {
  const digest = createHmac("sha256", salt).update(namespace).update("\0");
  for (const part of parts) digest.update(part).update("\0");
  return digest.digest("hex");
}

function required(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(code);
  return normalized;
}

function ruleToken(value: string, code: string, max: number): string {
  const normalized = required(value, code);
  if (!/^[A-Za-z0-9._:-]+$/u.test(normalized) || normalized.length > max) {
    throw new Error(code);
  }
  return normalized;
}

function responseIntent(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase() || "UNKNOWN";
  if (!/^[A-Z0-9_:-]{1,64}$/u.test(normalized)) {
    throw new Error("OUTREACH_RESPONSE_INTENT_INVALID");
  }
  return normalized;
}

/** Shared transactional attribution used by canonical inbound history writes. */
export async function attributeInboundToRecentOutreach(
  client: PoolClient,
  input: {
    readonly pageId: string;
    readonly customerHash: string;
    readonly conversationId: string;
    readonly responseMessageIdHash: string;
    readonly respondedAt: Date;
    readonly responseIntent?: string | null;
    readonly sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "UNKNOWN";
    readonly isPositive?: boolean;
    readonly isOptOut?: boolean;
  },
): Promise<OutreachAttributionResult> {
  const result = await client.query<{ outreach_id: string }>(
    `WITH candidate AS (
       SELECT outreach_id, sent_at
       FROM outreach_messages
       WHERE page_id = $1
         AND customer_hash = $2
         AND sent_at <= $5
         AND sent_at >= $5 - interval '24 hours'
       ORDER BY sent_at DESC, outreach_id DESC
       FOR UPDATE
       LIMIT 1
     ), inserted AS (
       INSERT INTO outreach_responses (
         response_id, outreach_id, page_id, conversation_id, customer_hash,
         response_message_id_hash, response_intent, sentiment,
         is_positive, is_opt_out, responded_at, response_seconds
       )
       SELECT $3, candidate.outreach_id, $1, $4, $2, $6, $7, $8, $9, $10,
              $5, floor(extract(epoch FROM ($5 - candidate.sent_at)))::integer
       FROM candidate
       ON CONFLICT (page_id, response_message_id_hash) DO NOTHING
       RETURNING outreach_id
     ), updated AS (
       UPDATE outreach_messages outreach
       SET response_status = 'RESPONDED_24H',
           response_intent = CASE
             WHEN $7 = 'UNKNOWN' THEN outreach.response_intent
             ELSE $7
           END,
           responded_at = CASE
             WHEN outreach.responded_at IS NULL THEN $5
             ELSE LEAST(outreach.responded_at, $5)
           END,
           updated_at = now()
       FROM inserted
       WHERE outreach.outreach_id = inserted.outreach_id
       RETURNING outreach.outreach_id
     )
     SELECT outreach_id FROM updated`,
    [
      input.pageId,
      input.customerHash,
      randomUUID(),
      input.conversationId,
      input.respondedAt,
      input.responseMessageIdHash,
      responseIntent(input.responseIntent),
      input.sentiment ?? "UNKNOWN",
      input.isPositive ?? false,
      input.isOptOut ?? false,
    ],
  );
  return {
    attributed: result.rowCount === 1,
    outreachId: result.rows[0]?.outreach_id ?? null,
  };
}

export class PostgresOutreachStore implements UpsaleSuppressionStore {
  private readonly pool: Pool;
  private readonly analyticsHashSalt: string;

  constructor(connectionString: string, options: PostgresOutreachOptions) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    if (options.analyticsHashSalt.length < 32) {
      throw new Error("ANALYTICS_HASH_SALT_TOO_SHORT");
    }
    this.analyticsHashSalt = options.analyticsHashSalt;
    this.pool = new Pool({
      connectionString,
      max: options.maxConnections ?? 3,
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

  /** Persists hashes and classification metadata only; raw outreach text is never stored. */
  async record(input: UpsaleSuppressionRecordInput): Promise<UpsaleSuppressionRecordResult> {
    const pageId = required(input.pageId, "OUTREACH_PAGE_ID_REQUIRED");
    const customerHash = required(
      input.conversationHash,
      "OUTREACH_CONVERSATION_HASH_REQUIRED",
    );
    const templateId = ruleToken(input.templateId, "OUTREACH_TEMPLATE_ID_INVALID", 128);
    const templateVersion = ruleToken(
      input.templateVersion,
      "OUTREACH_TEMPLATE_VERSION_INVALID",
      64,
    );
    const sourceEventKeyHash = hmac(
      this.analyticsHashSalt,
      "outreach-event:v1",
      pageId,
      required(input.eventKey, "OUTREACH_EVENT_KEY_REQUIRED"),
    );
    const providerMessageIdHash = input.providerMessageId?.trim()
      ? hmac(
          this.analyticsHashSalt,
          "provider-message:v1",
          pageId,
          input.providerMessageId.trim(),
        )
      : null;
    const protectedContentHash = hmac(
      this.analyticsHashSalt,
      "outreach-content:v1",
      required(input.contentHash, "OUTREACH_CONTENT_HASH_REQUIRED"),
    );
    const outreachId = randomUUID();

    return withTransaction(this.pool, async (client) => {
      const conversation = await client.query<{ conversation_id: string }>(
        `INSERT INTO conversations (
           conversation_id, page_id, customer_hash, hash_key_version,
           routing_owner, conversation_owner, last_provider_occurred_at,
           last_received_at, expires_at
         )
         SELECT $1, $2, $3, 'analytics-hmac-v1', page.routing_owner, 'BOT',
                $4, $5, $6
         FROM pages page
         WHERE page.page_id = $2
         ON CONFLICT (page_id, customer_hash) DO UPDATE SET
           last_provider_occurred_at = GREATEST(
             conversations.last_provider_occurred_at,
             EXCLUDED.last_provider_occurred_at
           ),
           last_received_at = GREATEST(
             conversations.last_received_at,
             EXCLUDED.last_received_at
           ),
           expires_at = GREATEST(conversations.expires_at, EXCLUDED.expires_at),
           updated_at = now()
         RETURNING conversation_id`,
        [
          randomUUID(),
          pageId,
          customerHash,
          input.occurredAt,
          input.receivedAt,
          new Date(input.receivedAt.getTime() + 20 * 86_400_000),
        ],
      );
      const conversationId = conversation.rows[0]?.conversation_id;
      if (!conversationId) throw new Error("OUTREACH_PAGE_OR_CONVERSATION_MISSING");

      const inserted = await client.query<OutreachRow>(
        `INSERT INTO outreach_messages (
           outreach_id, page_id, conversation_id, customer_hash,
           source_event_key_hash, provider_message_id_hash, content_hash,
           template_id, template_version, matched_rule, status, sent_at,
           metadata_safe
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,'UPSALE_CONTAINS_FRAGMENT','SENT',$10,
           jsonb_build_object('source', 'META_ECHO', 'suppressed', true)
         )
         ON CONFLICT DO NOTHING
         RETURNING outreach_id, conversation_id`,
        [
          outreachId,
          pageId,
          conversationId,
          customerHash,
          sourceEventKeyHash,
          providerMessageIdHash,
          protectedContentHash,
          templateId,
          templateVersion,
          input.occurredAt,
        ],
      );
      const row = inserted.rows[0];
      if (row) {
        return {
          inserted: true,
          outreachId: row.outreach_id,
          conversationId: row.conversation_id,
        };
      }

      const existing = await client.query<OutreachRow>(
        `SELECT outreach_id, conversation_id
         FROM outreach_messages
         WHERE page_id = $1
           AND (
             source_event_key_hash = $2
             OR ($3::text IS NOT NULL AND provider_message_id_hash = $3)
           )
         LIMIT 1`,
        [pageId, sourceEventKeyHash, providerMessageIdHash],
      );
      const found = existing.rows[0];
      if (!found) throw new Error("OUTREACH_DEDUP_CONFLICT_MISSING");
      return {
        inserted: false,
        outreachId: found.outreach_id,
        conversationId: found.conversation_id,
      };
    });
  }

  async recordCustomerResponse(
    input: OutreachResponseInput,
  ): Promise<OutreachAttributionResult> {
    const providerMessageIdHash = hmac(
      this.analyticsHashSalt,
      "provider-message:v1",
      input.pageId,
      required(input.providerMessageId, "OUTREACH_RESPONSE_MESSAGE_ID_REQUIRED"),
    );
    return withTransaction(this.pool, (client) =>
      attributeInboundToRecentOutreach(client, {
        pageId: input.pageId,
        customerHash: input.customerHash,
        conversationId: input.conversationId,
        responseMessageIdHash: providerMessageIdHash,
        respondedAt: input.respondedAt,
        ...(input.responseIntent !== undefined
          ? { responseIntent: input.responseIntent }
          : {}),
        ...(input.sentiment !== undefined ? { sentiment: input.sentiment } : {}),
        ...(input.isPositive !== undefined ? { isPositive: input.isPositive } : {}),
        ...(input.isOptOut !== undefined ? { isOptOut: input.isOptOut } : {}),
      }),
    );
  }

  async markReceipt(input: OutreachReceiptInput): Promise<boolean> {
    const providerMessageIdHash = hmac(
      this.analyticsHashSalt,
      "provider-message:v1",
      input.pageId,
      required(input.providerMessageId, "OUTREACH_RECEIPT_MESSAGE_ID_REQUIRED"),
    );
    const result = await this.pool.query(
      `UPDATE outreach_messages
       SET status = CASE
             WHEN $3 = 'READ' THEN 'READ'
             WHEN status = 'SENT' THEN 'DELIVERED'
             ELSE status
           END,
           delivered_at = CASE
             WHEN delivered_at IS NULL THEN $4
             ELSE LEAST(delivered_at, $4)
           END,
           read_at = CASE
             WHEN $3 = 'READ' AND read_at IS NULL THEN $4
             WHEN $3 = 'READ' THEN LEAST(read_at, $4)
             ELSE read_at
           END,
           updated_at = now()
       WHERE page_id = $1 AND provider_message_id_hash = $2`,
      [input.pageId, providerMessageIdHash, input.receipt, input.occurredAt],
    );
    return result.rowCount === 1;
  }

  async recordConversion(input: OutreachConversionInput): Promise<boolean> {
    if (!Number.isFinite(input.orderValue) || input.orderValue < 0) {
      throw new Error("OUTREACH_ORDER_VALUE_INVALID");
    }
    const currency = (input.currency ?? "VND").trim().toUpperCase();
    if (!/^[A-Z]{3}$/u.test(currency)) throw new Error("OUTREACH_CURRENCY_INVALID");
    const result = await this.pool.query(
      `UPDATE outreach_messages outreach
       SET order_confirmed_at = $3,
           order_value = $4,
           currency = $5,
           updated_at = now()
       WHERE outreach.outreach_id = (
         SELECT candidate.outreach_id
         FROM outreach_messages candidate
         WHERE candidate.page_id = $1
           AND candidate.customer_hash = $2
           AND candidate.sent_at <= $3
           AND candidate.sent_at >= $3 - interval '7 days'
         ORDER BY candidate.sent_at DESC, candidate.outreach_id DESC
         LIMIT 1
       )
         AND outreach.order_confirmed_at IS NULL`,
      [
        input.pageId,
        input.customerHash,
        input.confirmedAt,
        input.orderValue,
        currency,
      ],
    );
    return result.rowCount === 1;
  }
}
