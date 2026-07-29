import { createHmac, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { withTransaction } from "./repositories.js";
import { redactAnalyticsMessage } from "./shadow-mirror.js";
import { attributeInboundToRecentOutreach } from "./outreach.js";
import {
  adAcquisitionConfig,
  recordInitialReplyAccepted,
  tryOpenAdAcquisitionSession,
  tryUpdateAcquisitionProduct,
  type AdAcquisitionAnalyticsOptions,
  type AdAcquisitionConfig,
} from "./ad-acquisition.js";

export interface ChatHistoryMetadata {
  readonly productId?: string | null;
  readonly salesStage?: string | null;
  readonly intent?: string | null;
  readonly outcome?: string | null;
  readonly promptVersion?: string | null;
  readonly modelVersion?: string | null;
  readonly policyVersion?: string | null;
  readonly catalogVersion?: string | null;
}

export interface InboundCustomerMessageInput extends ChatHistoryMetadata {
  readonly pageId: string;
  readonly conversationId: string;
  readonly customerHash: string;
  readonly providerMessageId: string;
  readonly text: string | null;
  readonly attachmentCount?: number;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
  readonly enqueueShadowEvaluation?: boolean;
  readonly adsContext?: {
    readonly referralType?: string | null;
    readonly source: string | null;
    readonly adTitle: string | null;
    readonly postId: string | null;
    readonly adId: string | null;
    readonly ref: string | null;
  } | null | undefined;
}

export interface MessageMediaAnalysisInput {
  readonly ordinal: number;
  readonly mediaType: "IMAGE" | "VIDEO";
  readonly status: "MATCHED" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
  readonly productId: string | null;
  readonly score: number | null;
  readonly gap: number | null;
  readonly reasonCode: string | null;
  readonly frameCount: number;
  readonly cacheHit?: boolean;
}

export interface MessageAnalysisInput {
  readonly messagePk: string;
  readonly occurredAt: Date;
  readonly extractedAdProductId?: string | null;
  readonly media: readonly MessageMediaAnalysisInput[];
}

export interface AcceptedOutboundBotMessageInput extends ChatHistoryMetadata {
  readonly outboxId: string;
  readonly text: string | null;
  readonly attachmentCount?: number;
}

export interface OutboundHumanMessageInput extends ChatHistoryMetadata {
  readonly pageId: string;
  readonly conversationId: string;
  readonly customerHash: string;
  readonly providerMessageId: string;
  readonly text: string | null;
  readonly attachmentCount?: number;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
}

export interface ChatHistoryRecordResult {
  readonly inserted: boolean;
  readonly identityKey: string;
  readonly messagePk: string;
  readonly occurredAt: Date;
  readonly shadowEvaluationEnqueued?: boolean;
}

export interface ChatHistoryItem {
  readonly messagePk: string;
  readonly direction: "INBOUND" | "OUTBOUND";
  readonly senderType: "CUSTOMER" | "BOT" | "HUMAN" | "SYSTEM";
  readonly messageType: "TEXT" | "IMAGE" | "MIXED" | "EVENT" | "POSTBACK";
  readonly text: string;
  readonly attachmentCount: number;
  readonly productId: string | null;
  readonly salesStage: string | null;
  readonly intent: string | null;
  readonly occurredAt: Date;
}

export interface PostgresChatHistoryOptions {
  readonly analyticsHashSalt: string;
  readonly maxConnections?: number;
  readonly adAcquisition?: AdAcquisitionAnalyticsOptions;
}

interface AcceptedOutboxRow {
  outbox_id: string;
  page_id: string;
  conversation_id: string;
  customer_hash: string;
  meta_message_id: string;
  accepted_at: Date;
  reply_plan_id: string;
  sequence_no: number;
}

interface IdentityRow {
  identity_key: string;
  message_pk: string;
  occurred_at: Date;
}

interface HistoryRow {
  message_pk: string;
  direction: ChatHistoryItem["direction"];
  sender_type: ChatHistoryItem["senderType"];
  message_type: ChatHistoryItem["messageType"];
  text_redacted: string;
  attachment_count: number;
  product_id: string | null;
  sales_stage: string | null;
  intent: string | null;
  occurred_at: Date;
}

function hmac(salt: string, namespace: string, ...parts: readonly string[]): string {
  const digest = createHmac("sha256", salt).update(namespace).update("\0");
  for (const part of parts) digest.update(part).update("\0");
  return digest.digest("hex");
}

function boundedAttachmentCount(value: number | undefined): number {
  const count = value ?? 0;
  if (!Number.isSafeInteger(count) || count < 0 || count > 10) {
    throw new Error("CHAT_HISTORY_ATTACHMENT_COUNT_INVALID");
  }
  return count;
}

function nonEmpty(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(code);
  return normalized;
}

function optionalText(value: string | null | undefined, max = 128): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
}

function messageType(text: string | null, attachmentCount: number): ChatHistoryItem["messageType"] {
  if (text?.trim() && attachmentCount > 0) return "MIXED";
  if (attachmentCount > 0) return "IMAGE";
  return "TEXT";
}

export class PostgresChatHistoryStore {
  private readonly pool: Pool;
  private readonly analyticsHashSalt: string;

  private readonly adAcquisition: AdAcquisitionConfig;
  constructor(connectionString: string, options: PostgresChatHistoryOptions) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    if (options.analyticsHashSalt.length < 32) {
      throw new Error("ANALYTICS_HASH_SALT_TOO_SHORT");
    }
    this.analyticsHashSalt = options.analyticsHashSalt;
    this.pool = new Pool({
      connectionString,
      max: options.maxConnections ?? 5,
      idleTimeoutMillis: 30_000,
    });
    this.adAcquisition = adAcquisitionConfig(options.adAcquisition);
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

  /** Records a customer message once, keyed by the Meta message id. */
  async recordInboundCustomerMessage(
    input: InboundCustomerMessageInput,
  ): Promise<ChatHistoryRecordResult> {
    const pageId = nonEmpty(input.pageId, "CHAT_HISTORY_PAGE_ID_REQUIRED");
    const providerMessageId = nonEmpty(
      input.providerMessageId,
      "CHAT_HISTORY_PROVIDER_MESSAGE_ID_REQUIRED",
    );
    const providerMessageIdHash = hmac(
      this.analyticsHashSalt,
      "provider-message:v1",
      pageId,
      providerMessageId,
    );
    const identityKey = `history:inbound:v1:${pageId}:${providerMessageIdHash}`;
    const messagePk = randomUUID();
    const attachmentCount = boundedAttachmentCount(input.attachmentCount);
    const redaction = redactAnalyticsMessage(input.text ?? "");

    return withTransaction(this.pool, async (client) => {
      await this.assertConversation(
        client,
        pageId,
        input.conversationId,
        input.customerHash,
      );
      const reserved = await this.reserveIdentity(client, {
        identityKey,
        pageId,
        providerMessageIdHash,
        outboxId: null,
        messagePk,
        occurredAt: input.occurredAt,
      });
      if (!reserved.inserted) {
        const shadowEvaluationEnqueued =
          input.enqueueShadowEvaluation === true &&
          redaction.dlpStatus === "PASSED"
            ? await this.tryEnqueueShadowEvaluation(client, {
                identityKey: reserved.result.identityKey,
                messagePk: reserved.result.messagePk,
                occurredAt: reserved.result.occurredAt,
                conversationId: input.conversationId,
                pageId,
                customerHash: input.customerHash,
              })
            : undefined;
        return {
          ...reserved.result,
          ...(shadowEvaluationEnqueued === undefined
            ? {}
            : { shadowEvaluationEnqueued }),
        };
      }

      await client.query(
        `INSERT INTO messages (
           message_pk, identity_key, page_id, conversation_id, customer_hash,
           provider_message_id_hash, direction, sender_type, message_type,
           text_redacted, redaction_version, dlp_status, attachment_count,
           product_id, sales_stage, intent, outcome, prompt_version,
           model_version, policy_version, catalog_version,
           provider_occurred_at, received_at, occurred_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,'INBOUND','CUSTOMER',$7,$8,'basic-v2',$9,$10,
           $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$19
         )`,
        [
          messagePk,
          identityKey,
          pageId,
          input.conversationId,
          input.customerHash,
          providerMessageIdHash,
          messageType(input.text, attachmentCount),
          redaction.text,
          redaction.dlpStatus,
          attachmentCount,
          optionalText(input.productId),
          optionalText(input.salesStage),
          optionalText(input.intent),
          optionalText(input.outcome),
          optionalText(input.promptVersion),
          optionalText(input.modelVersion),
          optionalText(input.policyVersion),
          optionalText(input.catalogVersion),
          input.occurredAt,
          input.receivedAt,
        ],
      );
      if (input.adsContext) {
        await client.query(
          `INSERT INTO message_ad_contexts (
             message_pk, message_occurred_at, page_id, conversation_id,
             source, referral_type, ad_title, post_id, ad_id, ref
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (message_pk, message_occurred_at) DO NOTHING`,
          [
            messagePk,
            input.occurredAt,
            pageId,
            input.conversationId,
            optionalText(input.adsContext.source, 64),
            optionalText(input.adsContext.referralType, 64),
            optionalText(input.adsContext.adTitle, 500),
            optionalText(input.adsContext.postId, 128),
            optionalText(input.adsContext.adId, 128),
            optionalText(input.adsContext.ref, 500),
          ],
        );
        await tryOpenAdAcquisitionSession(client, this.adAcquisition, {
          identityKey,
          pageId,
          conversationId: input.conversationId,
          customerHash: input.customerHash,
          messagePk,
          occurredAt: input.occurredAt,
          source: input.adsContext.source,
          referralType: input.adsContext.referralType ?? null,
          adId: input.adsContext.adId,
          postId: input.adsContext.postId,
          adTitle: input.adsContext.adTitle,
        });
      }
      await attributeInboundToRecentOutreach(client, {
        pageId,
        customerHash: input.customerHash,
        conversationId: input.conversationId,
        responseMessageIdHash: providerMessageIdHash,
        respondedAt: input.occurredAt,
      });
      const shadowEvaluationEnqueued =
        input.enqueueShadowEvaluation === true &&
        redaction.dlpStatus === "PASSED"
          ? await this.tryEnqueueShadowEvaluation(client, {
              identityKey,
              messagePk,
              occurredAt: input.occurredAt,
              conversationId: input.conversationId,
              pageId,
              customerHash: input.customerHash,
            })
          : undefined;
      return {
        inserted: true,
        identityKey,
        messagePk,
        occurredAt: input.occurredAt,
        ...(shadowEvaluationEnqueued === undefined
          ? {}
          : { shadowEvaluationEnqueued }),
      };
    });
  }

  async recordMessageAnalysis(input: MessageAnalysisInput): Promise<void> {
    if (!input.messagePk.trim()) throw new Error("MESSAGE_ANALYSIS_PK_REQUIRED");
    await withTransaction(this.pool, async (client) => {
      if (input.extractedAdProductId !== undefined) {
        await client.query(
          `UPDATE message_ad_contexts
           SET extracted_product_id = $3, updated_at = now()
           WHERE message_pk = $1 AND message_occurred_at = $2`,
          [
            input.messagePk,
            input.occurredAt,
            optionalText(input.extractedAdProductId, 128),
          ],
        );
        await tryUpdateAcquisitionProduct(
          client,
          input.messagePk,
          input.occurredAt,
          optionalText(input.extractedAdProductId, 128),
        );
      }
      for (const item of input.media.slice(0, 10)) {
        const ordinal = Math.trunc(item.ordinal);
        const frameCount = Math.trunc(item.frameCount);
        if (ordinal < 0 || ordinal > 9 || frameCount < 1 || frameCount > 3) {
          throw new Error("MESSAGE_MEDIA_ANALYSIS_INVALID");
        }
        await client.query(
          `INSERT INTO message_media_analysis (
             message_pk, message_occurred_at, media_ordinal, media_type,
             analysis_status, product_id, score, top_gap, reason_code,
             frame_count, cache_hit
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (message_pk, message_occurred_at, media_ordinal)
           DO UPDATE SET
             analysis_status = EXCLUDED.analysis_status,
             product_id = EXCLUDED.product_id,
             score = EXCLUDED.score,
             top_gap = EXCLUDED.top_gap,
             reason_code = EXCLUDED.reason_code,
             frame_count = EXCLUDED.frame_count,
             cache_hit = EXCLUDED.cache_hit`,
          [
            input.messagePk,
            input.occurredAt,
            ordinal,
            item.mediaType,
            item.status,
            optionalText(item.productId, 128),
            item.score,
            item.gap,
            optionalText(item.reasonCode, 128),
            frameCount,
            item.cacheHit ?? false,
          ],
        );
      }
    });
  }

  /**
   * Records a bot reply only when the durable Meta outbox is already accepted.
   * The outbox id is the idempotency identity, so delivery/read callbacks cannot duplicate it.
   */
  async recordAcceptedOutboundBotMessage(
    input: AcceptedOutboundBotMessageInput,
  ): Promise<ChatHistoryRecordResult> {
    const outboxId = nonEmpty(input.outboxId, "CHAT_HISTORY_OUTBOX_ID_REQUIRED");
    const attachmentCount = boundedAttachmentCount(input.attachmentCount);
    const redaction = redactAnalyticsMessage(input.text ?? "");

    return withTransaction(this.pool, async (client) => {
      const accepted = await client.query<AcceptedOutboxRow>(
        `SELECT outbox_id, page_id, conversation_id, customer_hash,
                meta_message_id, accepted_at, reply_plan_id, sequence_no
         FROM meta_outbox
         WHERE outbox_id = $1
           AND status IN ('SENT_ACCEPTED', 'DELIVERED', 'READ')
           AND meta_message_id IS NOT NULL
           AND accepted_at IS NOT NULL
         FOR SHARE`,
        [outboxId],
      );
      const row = accepted.rows[0];
      if (!row) throw new Error("CHAT_HISTORY_OUTBOX_NOT_ACCEPTED");
      await recordInitialReplyAccepted(client, {
        replyPlanId: row.reply_plan_id,
        outboxId: row.outbox_id,
        sequenceNo: row.sequence_no,
        acceptedAt: row.accepted_at,
        pageId: row.page_id,
        conversationId: row.conversation_id,
        customerHash: row.customer_hash,
      });

      const identityKey = `history:outbound:v1:${outboxId}`;
      const messagePk = randomUUID();
      const providerMessageIdHash = hmac(
        this.analyticsHashSalt,
        "provider-message:v1",
        row.page_id,
        row.meta_message_id,
      );
      const reserved = await this.reserveIdentity(client, {
        identityKey,
        pageId: row.page_id,
        providerMessageIdHash: null,
        outboxId,
        messagePk,
        occurredAt: row.accepted_at,
      });
      if (!reserved.inserted) return reserved.result;

      await client.query(
        `INSERT INTO messages (
           message_pk, identity_key, page_id, conversation_id, customer_hash,
           provider_message_id_hash, outbox_id, direction, sender_type,
           message_type, text_redacted, redaction_version, dlp_status,
           attachment_count, product_id, sales_stage, intent, outcome,
           prompt_version, model_version, policy_version, catalog_version,
           provider_occurred_at, received_at, occurred_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,'OUTBOUND','BOT',$8,$9,'basic-v2',$10,$11,
           $12,$13,$14,$15,$16,$17,$18,$19,$20,$20,$20
         )`,
        [
          messagePk,
          identityKey,
          row.page_id,
          row.conversation_id,
          row.customer_hash,
          providerMessageIdHash,
          outboxId,
          messageType(input.text, attachmentCount),
          redaction.text,
          redaction.dlpStatus,
          attachmentCount,
          optionalText(input.productId),
          optionalText(input.salesStage),
          optionalText(input.intent),
          optionalText(input.outcome),
          optionalText(input.promptVersion),
          optionalText(input.modelVersion),
          optionalText(input.policyVersion),
          optionalText(input.catalogVersion),
          row.accepted_at,
        ],
      );
      return {
        inserted: true,
        identityKey,
        messagePk,
        occurredAt: row.accepted_at,
      };
    });
  }

  /** Records an unmatched page echo as a real human-agent message. */
  async recordOutboundHumanMessage(
    input: OutboundHumanMessageInput,
  ): Promise<ChatHistoryRecordResult> {
    const pageId = nonEmpty(input.pageId, "CHAT_HISTORY_PAGE_ID_REQUIRED");
    const providerMessageId = nonEmpty(
      input.providerMessageId,
      "CHAT_HISTORY_PROVIDER_MESSAGE_ID_REQUIRED",
    );
    const providerMessageIdHash = hmac(
      this.analyticsHashSalt,
      "provider-message:v1",
      pageId,
      providerMessageId,
    );
    const identityKey = `history:human:v1:${pageId}:${providerMessageIdHash}`;
    const messagePk = randomUUID();
    const attachmentCount = boundedAttachmentCount(input.attachmentCount);
    const redaction = redactAnalyticsMessage(input.text ?? "");

    return withTransaction(this.pool, async (client) => {
      await this.assertConversation(
        client,
        pageId,
        input.conversationId,
        input.customerHash,
      );
      const reserved = await this.reserveIdentity(client, {
        identityKey,
        pageId,
        providerMessageIdHash,
        outboxId: null,
        messagePk,
        occurredAt: input.occurredAt,
      });
      if (!reserved.inserted) return reserved.result;

      await client.query(
        `INSERT INTO messages (
           message_pk, identity_key, page_id, conversation_id, customer_hash,
           provider_message_id_hash, direction, sender_type, message_type,
           text_redacted, redaction_version, dlp_status, attachment_count,
           product_id, sales_stage, intent, outcome, prompt_version,
           model_version, policy_version, catalog_version,
           provider_occurred_at, received_at, occurred_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,'OUTBOUND','HUMAN',$7,$8,'basic-v2',$9,$10,
           $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$19
         )`,
        [
          messagePk,
          identityKey,
          pageId,
          input.conversationId,
          input.customerHash,
          providerMessageIdHash,
          messageType(input.text, attachmentCount),
          redaction.text,
          redaction.dlpStatus,
          attachmentCount,
          optionalText(input.productId),
          optionalText(input.salesStage),
          optionalText(input.intent),
          optionalText(input.outcome),
          optionalText(input.promptVersion),
          optionalText(input.modelVersion),
          optionalText(input.policyVersion),
          optionalText(input.catalogVersion),
          input.occurredAt,
          input.receivedAt,
        ],
      );
      return { inserted: true, identityKey, messagePk, occurredAt: input.occurredAt };
    });
  }

  async listConversationHistory(
    conversationId: string,
    options: { readonly limit?: number; readonly before?: Date } = {},
  ): Promise<readonly ChatHistoryItem[]> {
    const limit = Math.max(1, Math.min(150, Math.trunc(options.limit ?? 30)));
    const result = await this.pool.query<HistoryRow>(
      `SELECT message_pk, direction, sender_type, message_type, text_redacted,
              attachment_count, product_id, sales_stage, intent, occurred_at
       FROM messages
       WHERE conversation_id = $1
         AND dlp_status = 'PASSED'
         AND ($2::timestamptz IS NULL OR occurred_at < $2)
       ORDER BY occurred_at DESC, message_pk DESC
       LIMIT $3`,
      [conversationId, options.before ?? null, limit],
    );
    return result.rows.reverse().map((row) => ({
      messagePk: row.message_pk,
      direction: row.direction,
      senderType: row.sender_type,
      messageType: row.message_type,
      text: row.text_redacted,
      attachmentCount: row.attachment_count,
      productId: row.product_id,
      salesStage: row.sales_stage,
      intent: row.intent,
      occurredAt: row.occurred_at,
    }));
  }

  private async assertConversation(
    client: PoolClient,
    pageId: string,
    conversationId: string,
    customerHash: string,
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM conversations
       WHERE conversation_id = $1 AND page_id = $2 AND customer_hash = $3`,
      [conversationId, pageId, customerHash],
    );
    if (result.rowCount !== 1) throw new Error("CHAT_HISTORY_CONVERSATION_SCOPE_MISMATCH");
  }

  /**
   * Evaluation capture is observational and must never block the customer path.
   * A savepoint keeps the canonical message transaction usable if the optional
   * shadow table or its permission is temporarily unavailable.
   */
  private async tryEnqueueShadowEvaluation(
    client: PoolClient,
    input: {
      readonly identityKey: string;
      readonly messagePk: string;
      readonly occurredAt: Date;
      readonly conversationId: string;
      readonly pageId: string;
      readonly customerHash: string;
    },
  ): Promise<boolean> {
    const savepoint = "chat_history_shadow_evaluation";
    await client.query(`SAVEPOINT ${savepoint}`);
    try {
      const result = await client.query(
        `INSERT INTO shadow_evaluations (
           source_identity_key, source_message_pk, source_occurred_at,
           conversation_id, page_id, customer_hash
         ) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (source_identity_key) DO NOTHING
         RETURNING evaluation_id`,
        [
          input.identityKey,
          input.messagePk,
          input.occurredAt,
          input.conversationId,
          input.pageId,
          input.customerHash,
        ],
      );
      await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      // INSERT or an existing source_identity_key both mean durable capture exists.
      return result.rowCount === 1 || result.rowCount === 0;
    } catch {
      await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      return false;
    }
  }

  private async reserveIdentity(
    client: PoolClient,
    input: {
      readonly identityKey: string;
      readonly pageId: string;
      readonly providerMessageIdHash: string | null;
      readonly outboxId: string | null;
      readonly messagePk: string;
      readonly occurredAt: Date;
    },
  ): Promise<{ inserted: true } | { inserted: false; result: ChatHistoryRecordResult }> {
    const inserted = await client.query<IdentityRow>(
      `INSERT INTO message_identities (
         identity_key, page_id, provider_message_id_hash, outbox_id,
         message_pk, occurred_at
       ) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING
       RETURNING identity_key, message_pk, occurred_at`,
      [
        input.identityKey,
        input.pageId,
        input.providerMessageIdHash,
        input.outboxId,
        input.messagePk,
        input.occurredAt,
      ],
    );
    if (inserted.rowCount === 1) return { inserted: true };

    const existing = await client.query<IdentityRow>(
      `SELECT identity_key, message_pk, occurred_at
       FROM message_identities
       WHERE identity_key = $1
          OR ($2::text IS NOT NULL AND page_id = $3 AND provider_message_id_hash = $2)
          OR ($4::uuid IS NOT NULL AND outbox_id = $4)
       LIMIT 1`,
      [
        input.identityKey,
        input.providerMessageIdHash,
        input.pageId,
        input.outboxId,
      ],
    );
    const row = existing.rows[0];
    if (!row) throw new Error("CHAT_HISTORY_IDENTITY_CONFLICT_MISSING");
    return {
      inserted: false,
      result: {
        inserted: false,
        identityKey: row.identity_key,
        messagePk: row.message_pk,
        occurredAt: row.occurred_at,
      },
    };
  }
}
