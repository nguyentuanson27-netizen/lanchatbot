import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { withTransaction } from "./repositories.js";

export interface ShadowMirrorMessageInput {
  readonly pageId: string;
  readonly senderId: string;
  readonly messageId: string | null;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
  readonly isEcho: boolean;
  readonly appId: string | null;
  readonly text: string | null;
  readonly attachmentCount: number;
}

export interface ShadowMirrorRecordResult {
  readonly inserted: boolean;
  readonly inboxId: string;
  readonly customerHash: string;
}

export interface ShadowMirrorStore {
  ready(): Promise<boolean>;
  record(input: ShadowMirrorMessageInput): Promise<ShadowMirrorRecordResult>;
}

export interface PostgresShadowMirrorOptions {
  readonly analyticsHashSalt: string;
  readonly metaAppId: string;
}

function hmac(salt: string, ...parts: readonly string[]): string {
  const digest = createHmac("sha256", salt);
  for (const part of parts) digest.update(part).update("\0");
  return digest.digest("hex");
}

/**
 * Both boundaries are explicit everywhere below, because `\b` is ASCII-word
 * based and gets Vietnamese wrong in both directions: without a leading
 * boundary "ấp" matches inside "cung cấp" or "cao cấp" and destroys ordinary
 * sentences, and a trailing `\b` never fires for a token ending in a
 * non-ASCII letter, so "xã", "thành phố" and "số nhà" silently never matched.
 */
const bounded = (alternatives: string): string =>
  `(?<![\\p{L}\\p{M}])(?:${alternatives})(?![\\p{L}\\p{M}])`;

/** Naming one of these is itself enough to treat the whole line as an address. */
const ADDRESS_COMPONENT_TOKENS =
  "xã|phường|huyện|quận|tỉnh|thành phố|đường|số nhà|ấp|thôn";

/**
 * Corroborating address content, only consulted after an explicit "địa chỉ"
 * keyword. It is deliberately wider than the line tokens: short words such as
 * "tổ" or "phố" are far too common to condemn a line on their own, but after
 * the keyword they do indicate a real address.
 */
const ADDRESS_DETAIL_TOKENS =
  `${ADDRESS_COMPONENT_TOKENS}|phố|ngõ|ngách|hẻm|tổ|khu phố|chung cư|quốc lộ|tỉnh lộ|lô|căn hộ`;

/**
 * An administrative token names an address - unless the sentence is asking
 * which one ("shop ở quận nào em?"). Those uses are stripped before the line
 * is judged, so a question survives while "Ấp Tân Lợi, quận nào" still does
 * not: the exemption is bound to the token it follows, not to the line.
 */
const ADDRESS_TOKEN_QUESTION = new RegExp(
  `${bounded(ADDRESS_COMPONENT_TOKENS)}\\s*(?:nào|mấy|gì|đâu|bao nhiêu)(?![\\p{L}\\p{M}])`,
  "giu",
);

const ADDRESS_LINE_TOKEN = new RegExp(bounded(ADDRESS_COMPONENT_TOKENS), "iu");

/**
 * The word "địa chỉ" alone is not an address: a customer asking where the shop
 * is ("Shop ở Hà Nội địa chỉ đâu em?") or saying they already sent their
 * details carries no identifier at all. Redacting on the keyword alone erased
 * the customer's actual question before the model ever read it - and the live
 * path persists that erased text as chat history.
 *
 * So the keyword is judged by the clause attached to it, never by the rest of
 * the line: "địa chỉ đâu em, shop mở 9h?" must not be condemned by a `9` that
 * belongs to an unrelated question.
 */
const ADDRESS_KEYWORD = new RegExp(
  `${bounded("địa chỉ|dia chi")}\\s*[:#-]?\\s*([^\\n]{4,})`,
  "giu",
);

/** The keyword's clause ends at the first punctuation mark that closes it. */
const ADDRESS_CLAUSE_END = /[,;.!?…]/u;

/** A clause that asks for an address does not carry one. */
const ADDRESS_QUESTION = new RegExp(
  bounded("đâu|nào|gì|ra sao|sao|mấy|bao nhiêu|hả|không|ko|chưa"),
  "iu",
);

/** "Cho em xin địa chỉ ...", "cho mình hỏi địa chỉ ..." - a request, not a value. */
const ADDRESS_REQUEST = /(?:cho\s+(?:\p{L}+\s+)?(?:xin|hỏi)|xin)\s*$/iu;

const ADDRESS_DETAIL_TOKEN = new RegExp(bounded(ADDRESS_DETAIL_TOKENS), "iu");

/**
 * The vocabulary of talking *about* the address field - pronouns, politeness
 * particles, question words and the generic nouns of delivery. A clause built
 * only from these names the field; any word outside it is a value.
 *
 * This is deliberately a vocabulary and not a casing test. An earlier revision
 * required a proper noun, which made capitalization part of the privacy
 * decision and let every lowercase declaration through - and Messenger input is
 * routinely lowercase.
 */
const ADDRESS_NEUTRAL_WORDS = new Set([
  "a", "ai", "anh", "ạ", "à", "ấy", "bao", "bạn", "các", "chị", "chưa", "cho",
  "có", "cô", "của", "cửa", "dc", "dưới", "e", "em", "gì", "giao", "giúp",
  "gửi", "hàng", "hỏi", "hả", "khách", "không", "ko", "là", "lại", "mà",
  "mình", "mấy", "nay", "nha", "nhá", "nhé", "nhận", "nhiêu", "này", "nào",
  "page", "rồi", "sao", "shop", "ship", "store", "t", "thì", "thế", "trên",
  "tại", "tôi", "và", "vậy", "với", "xin", "ạk", "ở", "đâu", "đây", "được",
  "đó", "đã", "đủ",
]);

function declaresAddress(payload: string, before: string): boolean {
  const end = payload.search(ADDRESS_CLAUSE_END);
  // "quận nào" asks which district; it is neither a value nor a word of its own.
  const clause = (end === -1 ? payload : payload.slice(0, end)).replace(
    ADDRESS_TOKEN_QUESTION,
    " ",
  );
  const hasHardValue =
    /\d/u.test(clause) || ADDRESS_DETAIL_TOKEN.test(clause);
  if (!hasHardValue && ADDRESS_QUESTION.test(clause)) return false;
  if (!hasHardValue && ADDRESS_REQUEST.test(before)) return false;
  return clause
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .some((word) => word.length > 0 && !ADDRESS_NEUTRAL_WORDS.has(word));
}

export function redactAnalyticsText(value: string): string {
  const direct = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/\b(?:cccd|cmnd)\s*[:#-]?\s*\d{9,12}\b/giu, "[ID]")
    .replace(/(?:\+?84|0)(?:[ .-]?\d){8,10}/g, "[PHONE]")
    .replace(
      ADDRESS_KEYWORD,
      (match: string, payload: string, offset: number, whole: string) =>
        declaresAddress(payload, whole.slice(0, offset)) ? "[ADDRESS]" : match,
    )
    .replace(/(?:họ tên|ho ten|tên người nhận|ten nguoi nhan)\s*[:#-]?[^\n]{2,}/giu, "[NAME]");
  return direct
    .split(/\r?\n/u)
    .map((line) => {
      if (ADDRESS_LINE_TOKEN.test(line.replace(ADDRESS_TOKEN_QUESTION, " "))) {
        return "[ADDRESS]";
      }
      if (/^\s*\p{Lu}[\p{L}'-]+(?:\s+\p{Lu}[\p{L}'-]+){1,4}\s*$/u.test(line)) {
        return "[NAME]";
      }
      return line;
    })
    .join("\n")
    .replace(/\b\d{6,19}\b/gu, "[NUMBER]")
    .replace(/\b(?=[A-Z0-9-]{8,}\b)(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9-]+\b/gu, "[REFERENCE]")
    .slice(0, 2_000);
}

export function redactAnalyticsMessage(value: string): { text: string; dlpStatus: "PASSED" | "QUARANTINED" } {
  const text = redactAnalyticsText(value);
  const residualRisk = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{6,19}\b/iu.test(text);
  return {
    text: residualRisk ? "[PII_REDACTED_MESSAGE]" : text,
    dlpStatus: residualRisk ? "QUARANTINED" : "PASSED",
  };
}

export function constantTimeKeyMatches(expected: string, supplied: string): boolean {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(supplied, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export class PostgresShadowMirrorStore implements ShadowMirrorStore {
  private readonly pool: Pool;
  private readonly analyticsHashSalt: string;
  private readonly metaAppId: string;

  constructor(connectionString: string, options: PostgresShadowMirrorOptions) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    if (options.analyticsHashSalt.length < 32) throw new Error("ANALYTICS_HASH_SALT_TOO_SHORT");
    if (!options.metaAppId.trim()) throw new Error("META_APP_ID_REQUIRED");
    this.analyticsHashSalt = options.analyticsHashSalt;
    this.metaAppId = options.metaAppId;
    this.pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
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

  async record(input: ShadowMirrorMessageInput): Promise<ShadowMirrorRecordResult> {
    const customerHash = hmac(this.analyticsHashSalt, "customer:v1", input.pageId, input.senderId);
    const fallback = createHash("sha256")
      .update(input.pageId)
      .update("\0")
      .update(input.senderId)
      .update("\0")
      .update(input.occurredAt.toISOString())
      .update("\0")
      .update(input.text ?? "")
      .update("\0")
      .update(String(input.attachmentCount))
      .digest("hex");
    const providerIdentity = input.messageId?.trim() || `fallback:${fallback}`;
    const providerMessageIdHash = hmac(
      this.analyticsHashSalt,
      "provider-message:v1",
      input.pageId,
      providerIdentity,
    );
    const eventKey = `mirror:v1:${providerMessageIdHash}`;
    const inboxId = randomUUID();

    return withTransaction(this.pool, async (client) => {
      await client.query(
        `INSERT INTO pages (page_id, page_alias, status, meta_app_id)
         VALUES ($1, $2, 'PAUSED', $3)
         ON CONFLICT (page_id) DO UPDATE SET
           meta_app_id = CASE WHEN pages.status = 'PAUSED' THEN EXCLUDED.meta_app_id ELSE pages.meta_app_id END,
           updated_at = now()`,
        [input.pageId, `shadow-${input.pageId}`, this.metaAppId],
      );

      const insertedInbox = await client.query<{ inbox_id: string }>(
        `INSERT INTO webhook_inbox (
           inbox_id, page_id, event_key, provider_message_id, conversation_hash,
           provider_occurred_at, received_at, signature_key_version, status, processed_at
         ) VALUES ($1,$2,$3,NULL,$4,$5,$6,'n8n-mirror-internal-key-v1','PROCESSED',$6)
         ON CONFLICT (page_id, event_key) DO NOTHING
         RETURNING inbox_id`,
        [inboxId, input.pageId, eventKey, customerHash, input.occurredAt, input.receivedAt],
      );
      if (insertedInbox.rowCount !== 1) {
        const existing = await client.query<{ inbox_id: string }>(
          "SELECT inbox_id FROM webhook_inbox WHERE page_id = $1 AND event_key = $2",
          [input.pageId, eventKey],
        );
        const existingId = existing.rows[0]?.inbox_id;
        if (!existingId) throw new Error("SHADOW_MIRROR_DEDUP_ROW_MISSING");
        return { inserted: false, inboxId: existingId, customerHash };
      }

      const conversation = await client.query<{ conversation_id: string }>(
        `INSERT INTO conversations (
           conversation_id, page_id, customer_hash, hash_key_version,
           routing_owner, conversation_owner, last_provider_occurred_at,
           last_received_at, last_message_id_hash, expires_at
         ) VALUES ($1,$2,$3,'analytics-hmac-v1','N8N','BOT',$4,$5,$6,$7)
         ON CONFLICT (page_id, customer_hash) DO UPDATE SET
           last_provider_occurred_at = GREATEST(conversations.last_provider_occurred_at, EXCLUDED.last_provider_occurred_at),
           last_received_at = GREATEST(conversations.last_received_at, EXCLUDED.last_received_at),
           last_message_id_hash = CASE
             WHEN EXCLUDED.last_provider_occurred_at >= conversations.last_provider_occurred_at
               THEN EXCLUDED.last_message_id_hash
             ELSE conversations.last_message_id_hash
           END,
           expires_at = GREATEST(conversations.expires_at, EXCLUDED.expires_at),
           updated_at = now()
         RETURNING conversation_id`,
        [
          randomUUID(),
          input.pageId,
          customerHash,
          input.occurredAt,
          input.receivedAt,
          providerMessageIdHash,
          new Date(input.receivedAt.getTime() + 20 * 86_400_000),
        ],
      );
      const conversationId = conversation.rows[0]?.conversation_id;
      if (!conversationId) throw new Error("SHADOW_MIRROR_CONVERSATION_MISSING");

      const messagePk = randomUUID();
      const identityKey = `mirror:v1:${input.pageId}:${providerMessageIdHash}`;
      await client.query(
        `INSERT INTO message_identities (
           identity_key, page_id, provider_message_id_hash, outbox_id, message_pk, occurred_at
         ) VALUES ($1,$2,$3,NULL,$4,$5)`,
        [identityKey, input.pageId, providerMessageIdHash, messagePk, input.occurredAt],
      );

      const senderType = input.isEcho
        ? input.appId === this.metaAppId
          ? "BOT"
          : "HUMAN"
        : "CUSTOMER";
      const direction = input.isEcho ? "OUTBOUND" : "INBOUND";
      const messageType = input.text && input.attachmentCount > 0
        ? "MIXED"
        : input.attachmentCount > 0
          ? "IMAGE"
          : "TEXT";
      const redaction = redactAnalyticsMessage(input.text ?? "");
      const textRedacted = redaction.text;

      await client.query(
        `INSERT INTO messages (
           message_pk, identity_key, page_id, conversation_id, customer_hash,
           provider_message_id_hash, direction, sender_type, message_type,
           text_redacted, redaction_version, dlp_status, attachment_count,
           provider_occurred_at, received_at, occurred_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'basic-v2',$11,$12,$13,$14,$13)`,
        [
          messagePk,
          identityKey,
          input.pageId,
          conversationId,
          customerHash,
          providerMessageIdHash,
          direction,
          senderType,
          messageType,
          textRedacted,
          redaction.dlpStatus,
          input.attachmentCount,
          input.occurredAt,
          input.receivedAt,
        ],
      );

      await client.query(
        `INSERT INTO conversation_events (
           conversation_id, page_id, customer_hash, event_type, action, owner,
           event_metadata, occurred_at
         ) VALUES ($1,$2,$3,'shadow_mirror_received','OBSERVE',$4,$5::jsonb,$6)`,
        [
          conversationId,
          input.pageId,
          customerHash,
          senderType === "CUSTOMER" ? null : senderType,
          JSON.stringify({ source: "N8N_MIRROR", send_enabled: false, attachment_count: input.attachmentCount }),
          input.occurredAt,
        ],
      );

      if (
        direction === "INBOUND" &&
        redaction.dlpStatus === "PASSED" &&
        textRedacted !== "phase3 smoke test [PHONE]"
      ) {
        await client.query(
          `INSERT INTO shadow_evaluations (
             source_identity_key, source_message_pk, source_occurred_at,
             conversation_id, page_id, customer_hash
           ) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (source_identity_key) DO NOTHING`,
          [identityKey, messagePk, input.occurredAt, conversationId, input.pageId, customerHash],
        );
      }

      return { inserted: true, inboxId, customerHash };
    });
  }
}
