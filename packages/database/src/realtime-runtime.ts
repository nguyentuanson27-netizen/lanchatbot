import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import type { CipherBundle } from "./repositories.js";
import {
  LocalEnvelopeCipher,
  type EncryptedValue,
} from "./envelope-cipher.js";
import { withTransaction } from "./repositories.js";

export interface RealtimeConversationRecord<TState> {
  readonly conversationId: string;
  readonly pageId: string;
  readonly customerHash: string;
  readonly stateVersion: number;
  readonly state: TState;
  readonly routingOwner: "N8N" | "APP";
  readonly appSendEnabled: boolean;
  readonly killSwitch: boolean;
}

export interface RealtimeCustomerProfileRecord<TProfile, TEvidence = unknown> {
  readonly pageId: string;
  readonly customerHash: string;
  readonly revision: number;
  readonly profile: TProfile;
  readonly fieldEvidence: TEvidence;
  readonly expiresAt: Date;
}

export type RealtimeMetaMessageUnit =
  | { readonly kind: "TEXT"; readonly text: string }
  | { readonly kind: "IMAGE"; readonly imageUrl: string };

export interface RealtimeMetaPlan {
  readonly replyPlanId: string;
  readonly responseGroupId: string;
  readonly recipientId: string;
  readonly messages: readonly RealtimeMetaMessageUnit[];
  /** Ảnh chỉ đủ điều kiện gửi sau text và sau khoảng nghỉ này tính từ lúc commit. */
  readonly imageDelayMs?: number;
}

export interface RealtimePancakeTagPlan {
  readonly desiredTag:
    | "NHAN_VIEN"
    | "VAN_DON"
    | "DA_CHOT_DON"
    | "KHONG_UP_SALE";
  readonly tagId: string;
  readonly handoffGeneration: number;
}

export interface RealtimeSalesCycleRecord<TState> {
  readonly conversationId: string;
  readonly pageId: string;
  readonly stateRevision: number;
  readonly state: TState;
  readonly cartExpiresAt: Date | null;
  readonly expiresAt: Date;
}

export interface RealtimeSalesCycleEventPlan {
  readonly commandId: string;
  readonly commandKind:
    | "FACTS_PRESENTED"
    | "MEASUREMENTS_REQUIRED"
    | "SIZE_RECOMMENDED"
    | "CART_OPENED"
    | "CART_MUTATED"
    | "NEGOTIATION_EVENT"
    | "CART_READY"
    | "CHECKOUT_DETAILS_CAPTURED"
    | "CLARIFICATION_REQUESTED"
    | "CLARIFICATION_RESOLVED"
    | "PREVIEW_CREATED"
    | "CONFIRM_PURCHASE"
    | "PAYMENT_RECEIPT_RECEIVED";
  readonly outcome: "APPLIED" | "HANDOFF";
  readonly stateRevisionBefore: number;
  readonly stateRevisionAfter: number;
  readonly stageBefore: string;
  readonly stageAfter: string;
  readonly cartId: string | null;
  readonly cartVersion: number | null;
  readonly reasonCode: string | null;
  readonly occurredAt: Date;
}

export interface RealtimeSalesCyclePlan<TState> {
  readonly expectedRevision: number;
  readonly state: TState;
  readonly cartExpiresAt: Date | null;
  readonly expiresAt: Date;
  readonly events: readonly RealtimeSalesCycleEventPlan[];
}

export interface RealtimeHandoffEventPlan {
  readonly source: "BOT_POLICY" | "CUSTOMER_REQUEST" | "POST_SALE";
  readonly reasonCode: string;
  readonly reasonDetailSafe?: Readonly<Record<string, unknown>>;
  readonly productId: string | null;
  readonly factsStatus:
    | "OK"
    | "STALE"
    | "AMBIGUOUS"
    | "NOT_FOUND"
    | "ERROR"
    | null;
  readonly factsReasonCode: string | null;
  readonly desiredTag: "NHAN_VIEN" | "VAN_DON";
  readonly handoffGeneration: number;
  readonly triggerEventKey: string;
  readonly triggerMessagePk: string | null;
  readonly occurredAt: Date;
}

export interface RealtimeHandoffAcknowledgementPlan {
  readonly actorRef: string;
  readonly occurredAt: Date;
}

export interface RealtimeInboxBatchGuard {
  readonly generation: number;
  readonly leaseToken: string;
  readonly inboxIds: readonly string[];
}

export interface RealtimeDecisionEventPlan {
  readonly eventId: string;
  readonly eventKeyHash: string;
  readonly eventType:
    | "PRODUCT_RESOLVED"
    | "PRODUCT_MATCHED"
    | "PRICE_CARD_SENT"
    | "SIZE_CONSULT_STARTED"
    | "BUYING_SIGNAL_DETECTED"
    | "BUYING_SIGNAL_COMMITTED"
    | "BUYING_SIGNAL_RETRACTED"
    | "READY_TO_BUY"
    | "ORDER_INFO_REQUESTED"
    | "CHECKOUT_DETAILS_MISSING"
    | "CLARIFICATION_REQUESTED"
    | "CHECKOUT_COMPLETED"
    | "ORDER_PREVIEW_CREATED"
    | "PURCHASE_CONFIRMATION_DETECTED"
    | "PURCHASE_CONFIRMATION_REJECTED"
    | "PURCHASE_CONFIRMED"
    | "ORDER_INTENT_CREATED"
    | "HANDOFF"
    | "HANDOFF_REQUESTED"
    | "GUARD_BLOCKED"
    | "NO_REPLY"
    | "NO_REPLY_SELECTED"
    | "WAVE2_STRATEGY_SELECTED"
    | "WAVE2_BARRIER_DETECTED";
  readonly origin: string | null;
  readonly reasonCodes: readonly string[];
  readonly releaseId: string;
  readonly promptVersion: string;
  readonly modelVersion: string | null;
  readonly policyVersion: string | null;
  readonly catalogVersion: string | null;
  readonly mode: "DRY_RUN" | "LIVE";
  readonly productId: string | null;
  readonly intent: string | null;
  readonly stage: string | null;
  readonly action: string | null;
  readonly occurredAt: Date;
  readonly details: Readonly<{
    auditSchemaVersion?: 1 | 2;
    stateRevisionBefore?: number;
    stateRevisionAfter?: number;
    conversationHash?: string | null;
    proposalHash?: string | null;
    guardedPlanHash?: string | null;
    renderedReplyHash?: string | null;
    factsSourceVersion?: string | null;
    guardOutcome?: "ALLOWED" | "BLOCKED" | "NOT_APPLICABLE";
    processingLatencyMs?: number | null;
    factQueryResults?: readonly {
      readonly queryId: string;
      readonly productId: string;
      readonly requestedFact: "PRICE" | "STOCK" | "SIZE" | "ETA";
      readonly status: "OK" | "STALE" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
      readonly reasonCode: string | null;
      readonly source: string;
      readonly observedAt: string;
    }[];
    productResolutionOrigin: string | null;
    buyingSignalReasons: readonly string[];
    guardReasonCodes: readonly string[];
    factsStatus: "OK" | "STALE" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR" | null;
    factsReasonCode: string | null;
    salesCycleStageBefore: string | null;
    salesCycleStageAfter: string | null;
    outboundMessageCount: number;
    modelCalled: boolean;
    modelLatencyMs: number | null;
    modelTokenUsage: Readonly<{
      prompt: number | null;
      output: number | null;
      total: number | null;
    }>;
    buyingSignalOverride: boolean;
    wave2Strategy?: Readonly<{
      rulesetVersion: "wave2-strategy-v1";
      need:
        | "NEED_OCCASION"
        | "NEED_STYLE"
        | "NEED_BUDGET"
        | "NOT_ENOUGH_CONTEXT";
      barrier:
        | "NONE"
        | "BARRIER_PRICE"
        | "BARRIER_FIT"
        | "BARRIER_MATERIAL"
        | "BARRIER_TRUST"
        | "BARRIER_DELIVERY"
        | "CHOICE_OVERLOAD";
      decisionFactor:
        | "OCCASION"
        | "STYLE"
        | "BUDGET"
        | "FIT"
        | "MATERIAL"
        | "TRUST"
        | "DELIVERY"
        | "PRODUCT"
        | "UNKNOWN";
      recommendedStrategy:
        | "STRATEGY_RECOMMEND_PRODUCT"
        | "STRATEGY_SHOW_PROOF"
        | "STRATEGY_ANSWER_OBJECTION"
        | "STRATEGY_ASK_CLARIFY"
        | "STRATEGY_CLOSE";
      ctaPolicy:
        | "ASK_OCCASION"
        | "ASK_STYLE"
        | "ASK_BUDGET"
        | "ASK_MEASUREMENTS"
        | "ASK_PROOF_PREFERENCE"
        | "REDUCE_TO_TWO"
        | "NO_ADDITIONAL_CTA";
      confidence: number;
      evidence: readonly string[];
      experimentId: "wave2-stage-playbook-v1";
      experimentVariant: "LIVE_100";
    }> | null;
    checkoutCapturedFields?: readonly string[];
    checkoutMissingFields?: readonly string[];
    checkoutCompleted?: boolean;
    clarificationReasonCode?: string | null;
    clarificationAttemptCount?: number;
    clarificationMaxAttempts?: number;
    clarificationBudgetExhausted?: boolean;
    clarificationCase?: boolean;
    orderPreviewCreated?: boolean;
    confirmationAttempted?: boolean;
    confirmationConfirmed?: boolean;
    confirmationSource?: string | null;
  }>;
}

export interface RealtimeCommitInput<TState, TSalesState = unknown> {
  readonly pageId: string;
  readonly customerHash: string;
  readonly conversationId: string;
  readonly expectedStateVersion: number;
  readonly state: TState;
  readonly metaPlan?: RealtimeMetaPlan;
  readonly pancakeTagPlan?: RealtimePancakeTagPlan;
  readonly handoffEventPlan?: RealtimeHandoffEventPlan;
  readonly handoffAcknowledgementPlan?: RealtimeHandoffAcknowledgementPlan;
  readonly salesCyclePlan?: RealtimeSalesCyclePlan<TSalesState>;
  readonly decisionEvents?: readonly RealtimeDecisionEventPlan[];
  /**
   * When present, state/outbox and all source inbox rows share one transaction.
   * A newer committed inbound changes the generation and makes this decision a
   * no-op, so a stale model result can never be published.
   */
  readonly inboxBatchGuard?: RealtimeInboxBatchGuard;
}

export interface RealtimeCommitResult {
  readonly stateCommitted: boolean;
  readonly metaOutboxCreated: number;
  readonly pancakeTagOutboxCreated: boolean;
  readonly handoffEventCreated: boolean;
  readonly decisionEventsCreated?: number;
  readonly sendAuthorized: boolean;
  readonly reasonCodes: readonly string[];
  readonly inboxBatchStatus?: "NOT_REQUESTED" | "COMMITTED" | "SUPERSEDED";
}

export interface ClaimedMetaOutbox {
  readonly outboxId: string;
  readonly leaseToken: string;
  readonly pageId: string;
  readonly conversationId: string;
  readonly recipientId: string;
  readonly pancakeConversationId: string | null;
  readonly message: RealtimeMetaMessageUnit;
  readonly attemptCount: number;
}

export interface ClaimedPancakeTagOutbox {
  readonly operationId: string;
  readonly leaseToken: string;
  readonly pageId: string;
  readonly conversationId: string;
  readonly pancakeConversationId: string;
  readonly desiredTag:
    | "NHAN_VIEN"
    | "VAN_DON"
    | "DA_CHOT_DON"
    | "KHONG_UP_SALE";
  readonly operation: "ADD" | "REMOVE";
  readonly tagId: string;
  readonly attemptCount: number;
}

interface ConversationRow {
  conversation_id: string;
  page_id: string;
  customer_hash: string;
  state_version: string;
  state_snapshot: unknown;
  routing_owner: "N8N" | "APP";
  app_send_enabled: boolean;
  kill_switch: boolean;
}

interface MetaOutboxRow {
  outbox_id: string;
  page_id: string;
  conversation_id: string;
  attempt_count: number;
  lease_token: string;
  recipient_ciphertext: Buffer;
  recipient_nonce: Buffer;
  recipient_auth_tag: Buffer;
  payload_ciphertext: Buffer;
  payload_nonce: Buffer;
  payload_auth_tag: Buffer;
  payload_encrypted_dek: Buffer;
  payload_key_ref: string;
  payload_expires_at: Date;
  pancake_conversation_ciphertext: Buffer | null;
  pancake_conversation_nonce: Buffer | null;
  pancake_conversation_auth_tag: Buffer | null;
}

interface PancakeTagOutboxRow {
  operation_id: string;
  page_id: string;
  conversation_id: string;
  desired_tag:
    | "NHAN_VIEN"
    | "VAN_DON"
    | "DA_CHOT_DON"
    | "KHONG_UP_SALE";
  operation: "ADD" | "REMOVE";
  pancake_tag_id: string;
  attempt_count: number;
  lease_token: string;
  pancake_conversation_ciphertext: Buffer;
  pancake_conversation_nonce: Buffer;
  pancake_conversation_auth_tag: Buffer;
}

interface SalesCycleRow {
  conversation_id: string;
  page_id: string;
  state_revision: string;
  state_ciphertext: Buffer;
  state_nonce: Buffer;
  state_auth_tag: Buffer;
  state_encrypted_dek: Buffer;
  state_key_ref: string;
  cart_expires_at: Date | null;
  expires_at: Date;
}

export class PostgresRealtimeRuntimeStore {
  private readonly pool: Pool;

  constructor(
    connectionString: string,
    private readonly cipher: LocalEnvelopeCipher,
    maxPoolSize = 5,
  ) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: maxPoolSize });
  }

  async isOwnMetaMessage(
    pageId: string,
    providerMessageId: string,
  ): Promise<boolean> {
    if (!pageId.trim() || !providerMessageId.trim()) return false;
    const result = await this.pool.query(
      `SELECT 1
       FROM meta_outbox
       WHERE page_id = $1
         AND meta_message_id = $2
         AND status IN ('SENT_ACCEPTED', 'DELIVERED', 'READ')
       LIMIT 1`,
      [pageId, providerMessageId],
    );
    return result.rowCount === 1;
  }

  async loadOrCreate<TState>(
    pageId: string,
    customerHash: string,
    routingOwner: "N8N" | "APP",
    createState: (conversationId: string) => TState,
    now = new Date(),
  ): Promise<RealtimeConversationRecord<TState>> {
    return withTransaction(this.pool, async (client) => {
      const existing = await this.selectConversation<TState>(
        client,
        pageId,
        customerHash,
        true,
      );
      if (existing) {
        if (
          existing.stateVersion === 0 &&
          this.emptyObject(existing.state)
        ) {
          const initialized = createState(existing.conversationId);
          await client.query(
            `UPDATE conversations
             SET state_snapshot = $2::jsonb, updated_at = $3
             WHERE conversation_id = $1 AND state_version = 0`,
            [existing.conversationId, JSON.stringify(initialized), now],
          );
          return { ...existing, state: initialized };
        }
        return existing;
      }

      const conversationId = randomUUID();
      const state = createState(conversationId);
      await client.query(
        `INSERT INTO conversations (
           conversation_id, page_id, customer_hash, hash_key_version,
           routing_owner, conversation_owner, state_version, state_snapshot,
           first_seen_at, updated_at, expires_at
         ) VALUES (
           $1,$2,$3,'analytics-hmac-v1',$4,'BOT',0,$5::jsonb,
           $6::timestamptz,$6::timestamptz,
           $6::timestamptz + interval '20 days'
         )
         ON CONFLICT (page_id, customer_hash) DO NOTHING`,
        [
          conversationId,
          pageId,
          customerHash,
          routingOwner,
          JSON.stringify(state),
          now,
        ],
      );
      const inserted = await this.selectConversation<TState>(
        client,
        pageId,
        customerHash,
        true,
      );
      if (!inserted) throw new Error("REALTIME_CONVERSATION_CREATE_FAILED");
      if (
        inserted.stateVersion === 0 &&
        this.emptyObject(inserted.state)
      ) {
        const initialized = createState(inserted.conversationId);
        await client.query(
          `UPDATE conversations
           SET state_snapshot = $2::jsonb, updated_at = $3
           WHERE conversation_id = $1 AND state_version = 0`,
          [inserted.conversationId, JSON.stringify(initialized), now],
        );
        return { ...inserted, state: initialized };
      }
      return inserted;
    });
  }

  async loadOrCreateCustomerProfile<TProfile, TEvidence = Record<string, unknown>>(
    pageId: string,
    customerHash: string,
    create: () => {
      readonly profile: TProfile;
      readonly fieldEvidence: TEvidence;
      readonly revision: number;
    },
    now = new Date(),
  ): Promise<RealtimeCustomerProfileRecord<TProfile, TEvidence>> {
    if (!pageId.trim() || !customerHash.trim() || Number.isNaN(now.getTime())) {
      throw new Error("CUSTOMER_PROFILE_IDENTITY_INVALID");
    }
    return withTransaction(this.pool, async (client) => {
      const selected = await client.query<{
        revision: string;
        profile_snapshot: TProfile;
        field_evidence: TEvidence;
        expires_at: Date;
      }>(
        `SELECT revision, profile_snapshot, field_evidence, expires_at
         FROM realtime_customer_profiles
         WHERE page_id = $1 AND customer_hash = $2
         FOR UPDATE`,
        [pageId, customerHash],
      );
      const existing = selected.rows[0];
      if (existing && existing.expires_at.getTime() > now.getTime()) {
        return {
          pageId,
          customerHash,
          revision: Number(existing.revision),
          profile: existing.profile_snapshot,
          fieldEvidence: existing.field_evidence,
          expiresAt: existing.expires_at,
        };
      }

      const initial = create();
      if (!Number.isInteger(initial.revision) || initial.revision < 1) {
        throw new Error("CUSTOMER_PROFILE_INITIAL_REVISION_INVALID");
      }
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1_000);
      await client.query(
        `INSERT INTO realtime_customer_profiles (
           page_id, customer_hash, revision, profile_snapshot, field_evidence,
           expires_at, created_at, updated_at
         ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$7)
         ON CONFLICT (page_id, customer_hash) DO UPDATE SET
           revision = EXCLUDED.revision,
           profile_snapshot = EXCLUDED.profile_snapshot,
           field_evidence = EXCLUDED.field_evidence,
           expires_at = EXCLUDED.expires_at,
           updated_at = EXCLUDED.updated_at
         WHERE realtime_customer_profiles.expires_at <= $7`,
        [
          pageId,
          customerHash,
          initial.revision,
          JSON.stringify(initial.profile),
          JSON.stringify(initial.fieldEvidence),
          expiresAt,
          now,
        ],
      );
      return {
        pageId,
        customerHash,
        revision: initial.revision,
        profile: initial.profile,
        fieldEvidence: initial.fieldEvidence,
        expiresAt,
      };
    });
  }

  async compareAndSwapCustomerProfile<TProfile, TEvidence>(
    pageId: string,
    customerHash: string,
    expectedRevision: number,
    next: {
      readonly revision: number;
      readonly profile: TProfile;
      readonly fieldEvidence: TEvidence;
    },
    now = new Date(),
  ): Promise<boolean> {
    if (
      !pageId.trim() ||
      !customerHash.trim() ||
      !Number.isInteger(expectedRevision) ||
      expectedRevision < 1 ||
      !Number.isInteger(next.revision) ||
      next.revision !== expectedRevision + 1 ||
      Number.isNaN(now.getTime())
    ) {
      throw new Error("CUSTOMER_PROFILE_CAS_INPUT_INVALID");
    }
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1_000);
    const result = await this.pool.query(
      `UPDATE realtime_customer_profiles
       SET revision = $4,
           profile_snapshot = $5::jsonb,
           field_evidence = $6::jsonb,
           expires_at = $7,
           updated_at = $8
       WHERE page_id = $1
         AND customer_hash = $2
         AND revision = $3
         AND expires_at > $8`,
      [
        pageId,
        customerHash,
        expectedRevision,
        next.revision,
        JSON.stringify(next.profile),
        JSON.stringify(next.fieldEvidence),
        expiresAt,
        now,
      ],
    );
    return result.rowCount === 1;
  }

  async loadOrCreateSalesCycle<TState>(
    pageId: string,
    conversationId: string,
    createState: () => TState,
    now = new Date(),
  ): Promise<RealtimeSalesCycleRecord<TState>> {
    if (!pageId.trim() || !conversationId.trim() || Number.isNaN(now.getTime())) {
      throw new Error("SALES_CYCLE_IDENTITY_INVALID");
    }
    return withTransaction(this.pool, async (client) => {
      const selected = await client.query<SalesCycleRow>(
        `SELECT conversation_id, page_id, state_revision, state_ciphertext,
                state_nonce, state_auth_tag, state_encrypted_dek,
                state_key_ref, cart_expires_at, expires_at
         FROM sales_cycle_states
         WHERE conversation_id = $1 AND page_id = $2
         FOR UPDATE`,
        [conversationId, pageId],
      );
      const existing = selected.rows[0];
      if (existing && existing.expires_at.getTime() > now.getTime()) {
        return this.salesCycleRecord<TState>(existing);
      }

      const state = createState();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1_000);
      const encrypted = this.cipher.encryptJson(
        state,
        this.salesCycleAad(pageId, conversationId),
        expiresAt,
      );
      await client.query(
        `INSERT INTO sales_cycle_states (
           conversation_id, page_id, state_revision, state_ciphertext,
           state_nonce, state_auth_tag, state_encrypted_dek, state_key_ref,
           cart_expires_at, expires_at, created_at, updated_at
         ) VALUES ($1,$2,0,$3,$4,$5,$6,$7,NULL,$8,$9,$9)
         ON CONFLICT (conversation_id) DO UPDATE SET
           page_id = EXCLUDED.page_id,
           state_revision = 0,
           state_ciphertext = EXCLUDED.state_ciphertext,
           state_nonce = EXCLUDED.state_nonce,
           state_auth_tag = EXCLUDED.state_auth_tag,
           state_encrypted_dek = EXCLUDED.state_encrypted_dek,
           state_key_ref = EXCLUDED.state_key_ref,
           cart_expires_at = NULL,
           expires_at = EXCLUDED.expires_at,
           updated_at = EXCLUDED.updated_at`,
        [
          conversationId,
          pageId,
          encrypted.ciphertext,
          encrypted.nonce,
          encrypted.authTag,
          encrypted.encryptedDek,
          encrypted.keyRef,
          expiresAt,
          now,
        ],
      );
      return {
        conversationId,
        pageId,
        stateRevision: 0,
        state,
        cartExpiresAt: null,
        expiresAt,
      };
    });
  }

  async persistObservedCustomerIdentity(
    pageId: string,
    conversationId: string,
    customerName: string,
    observedAt: Date,
  ): Promise<boolean> {
    const normalized = customerName.trim().replace(/\s+/gu, " ").slice(0, 160);
    if (!normalized || Number.isNaN(observedAt.getTime())) return false;
    const encrypted = this.cipher.encryptValue(
      normalized,
      `lana:admin-identity:v1:${pageId}:${conversationId}:PANCAKE`,
    );
    const expiresAt = new Date(observedAt.getTime() + 20 * 24 * 60 * 60_000);
    const result = await this.pool.query(
      `INSERT INTO admin_conversation_identities (
         page_id, conversation_id, provider, customer_name_ciphertext,
         customer_name_nonce, customer_name_auth_tag, encryption_key_ref,
         observed_at, expires_at, updated_at
       ) VALUES ($1::text,$2::uuid,'PANCAKE',$3,$4,$5,$6::text,$7::timestamptz,$8::timestamptz,now())
       ON CONFLICT (page_id, conversation_id, provider) DO UPDATE SET
         customer_name_ciphertext = EXCLUDED.customer_name_ciphertext,
         customer_name_nonce = EXCLUDED.customer_name_nonce,
         customer_name_auth_tag = EXCLUDED.customer_name_auth_tag,
         encryption_key_ref = EXCLUDED.encryption_key_ref,
         observed_at = EXCLUDED.observed_at,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()
       WHERE admin_conversation_identities.observed_at <= EXCLUDED.observed_at`,
      [
        pageId,
        conversationId,
        encrypted.ciphertext,
        encrypted.nonce,
        encrypted.authTag,
        this.cipher.keyRef,
        observedAt,
        expiresAt,
      ],
    );
    return result.rowCount === 1;
  }

  async commit<TState, TSalesState = unknown>(
    input: RealtimeCommitInput<TState, TSalesState>,
    now = new Date(),
  ): Promise<RealtimeCommitResult> {
    return withTransaction(this.pool, async (client) => {
      // Keep the same lock order as webhook enqueue: pages -> ingress head.
      // Reversing these two locks allows an enqueue and a model commit for the
      // same page/conversation to deadlock under load.
      const route = await client.query<{
        routing_owner: "N8N" | "APP";
        app_send_enabled: boolean;
        kill_switch: boolean;
      }>(
        `SELECT routing_owner, app_send_enabled, kill_switch
         FROM pages WHERE page_id = $1 FOR UPDATE`,
        [input.pageId],
      );
      const page = route.rows[0];
      if (!page) throw new Error("REALTIME_PAGE_NOT_FOUND");
      if (input.inboxBatchGuard) {
        const current = await this.lockCurrentInboxBatch(
          client,
          input,
          input.inboxBatchGuard,
        );
        if (!current) {
          await this.releaseSupersededInboxBatch(
            client,
            input,
            input.inboxBatchGuard,
          );
          return {
            stateCommitted: false,
            metaOutboxCreated: 0,
            pancakeTagOutboxCreated: false,
            handoffEventCreated: false,
            sendAuthorized: false,
            reasonCodes: ["INBOX_BATCH_SUPERSEDED"],
            inboxBatchStatus: "SUPERSEDED",
          };
        }
      }
      const before = await client.query<{
        conversation_owner: "BOT" | "HUMAN";
      }>(
        `SELECT conversation_owner
         FROM conversations
         WHERE conversation_id = $1
           AND page_id = $2
           AND customer_hash = $3
           AND state_version = $4
         FOR UPDATE`,
        [
          input.conversationId,
          input.pageId,
          input.customerHash,
          input.expectedStateVersion,
        ],
      );
      const ownerBefore = before.rows[0]?.conversation_owner;
      if (!ownerBefore) throw new Error("STATE_REVISION_CONFLICT");
      if (input.salesCyclePlan) {
        await this.commitSalesCyclePlan(
          client,
          input.pageId,
          input.conversationId,
          input.salesCyclePlan,
          now,
        );
      }
      const stateRevision = this.stateNumber(
        input.state,
        "revision",
        input.expectedStateVersion + 1,
      );
      if (stateRevision <= input.expectedStateVersion) {
        throw new Error("STATE_REVISION_INCREMENT_REQUIRED");
      }
      const updated = await client.query(
        `UPDATE conversations
         SET state_version = $4,
             state_snapshot = $5::jsonb,
             routing_owner = $6,
             conversation_owner = $7,
             owner_lease_until = $8,
             blocking_tag = $9,
             blocking_tag_verified_at = $10,
             updated_at = $11::timestamptz,
             expires_at = $11::timestamptz + interval '20 days'
         WHERE conversation_id = $1
           AND page_id = $2
           AND customer_hash = $3
           AND state_version = $12`,
        [
          input.conversationId,
          input.pageId,
          input.customerHash,
          stateRevision,
          JSON.stringify(input.state),
          this.stateString(input.state, "routingOwner", "N8N"),
          this.stateString(input.state, "conversationOwner", "BOT"),
          this.stateNullableString(input.state, "ownerLeaseUntil"),
          this.stateNullableString(input.state, "blockingTag"),
          this.stateNullableString(input.state, "blockingTagVerifiedAt"),
          now,
          input.expectedStateVersion,
        ],
      );
      if (updated.rowCount !== 1) {
        throw new Error("STATE_REVISION_CONFLICT");
      }

      const reasonCodes: string[] = [];
      const sendAuthorized =
        page.routing_owner === "APP" &&
        page.app_send_enabled &&
        !page.kill_switch;
      if (page.routing_owner !== "APP") reasonCodes.push("PAGE_ROUTE_NOT_APP");
      if (!page.app_send_enabled) reasonCodes.push("PAGE_SEND_DISABLED");
      if (page.kill_switch) reasonCodes.push("PAGE_KILL_SWITCH_ACTIVE");

      let metaOutboxCreated = 0;
      if (input.metaPlan && sendAuthorized) {
        metaOutboxCreated = await this.insertMetaPlan(
          client,
          input,
          input.metaPlan,
          now,
        );
      } else if (input.metaPlan) {
        reasonCodes.push("META_PLAN_SUPPRESSED");
      }

      let pancakeTagOutboxCreated = false;
      if (input.pancakeTagPlan) {
        pancakeTagOutboxCreated = await this.insertPancakeTagPlan(
          client,
          input,
          input.pancakeTagPlan,
        );
        if (!pancakeTagOutboxCreated) {
          reasonCodes.push("PANCAKE_CONVERSATION_LINK_MISSING");
        }
      }

      const ownerAfter = this.stateString(
        input.state,
        "conversationOwner",
        ownerBefore,
      );
      let handoffEventCreated = false;
      if (
        input.handoffEventPlan &&
        ownerBefore === "BOT" &&
        ownerAfter === "HUMAN"
      ) {
        handoffEventCreated = await this.insertHandoffEvent(
          client,
          input,
          input.handoffEventPlan,
          ownerBefore,
          ownerAfter,
        );
      }
      if (input.handoffAcknowledgementPlan && ownerBefore === "HUMAN") {
        await this.acknowledgeActiveHandoff(
          client,
          input.conversationId,
          input.handoffAcknowledgementPlan,
        );
      }

      const decisionEventsCreated = input.decisionEvents
        ? await this.insertDecisionEvents(client, input, input.decisionEvents)
        : 0;

      if (input.inboxBatchGuard) {
        await this.completeInboxBatch(
          client,
          input,
          input.inboxBatchGuard,
          now,
        );
      }

      return {
        stateCommitted: true,
        metaOutboxCreated,
        pancakeTagOutboxCreated,
        handoffEventCreated,
        decisionEventsCreated,
        sendAuthorized,
        reasonCodes,
        inboxBatchStatus: input.inboxBatchGuard
          ? "COMMITTED"
          : "NOT_REQUESTED",
      };
    });
  }

  async linkProviderConversation(
    pageId: string,
    conversationId: string,
    provider: "META" | "PANCAKE",
    externalId: string,
    verifiedAt: Date,
    expiresAt: Date,
  ): Promise<void> {
    const aad = this.providerLinkAad(pageId, conversationId, provider);
    const encrypted = this.cipher.encryptValue(externalId, aad);
    await this.pool.query(
      `INSERT INTO provider_conversation_links (
         page_id, conversation_id, provider, external_id_hash,
         external_id_ciphertext, external_id_nonce, external_id_auth_tag,
         verified_at, expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (page_id, conversation_id, provider) DO UPDATE SET
         external_id_hash = EXCLUDED.external_id_hash,
         external_id_ciphertext = EXCLUDED.external_id_ciphertext,
         external_id_nonce = EXCLUDED.external_id_nonce,
         external_id_auth_tag = EXCLUDED.external_id_auth_tag,
         verified_at = EXCLUDED.verified_at,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()`,
      [
        pageId,
        conversationId,
        provider,
        this.cipher.fingerprint(externalId, `provider-link:${provider}`),
        encrypted.ciphertext,
        encrypted.nonce,
        encrypted.authTag,
        verifiedAt,
        expiresAt,
      ],
    );
  }

  async claimMetaOutbox(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedMetaOutbox | null> {
    const result = await this.pool.query<MetaOutboxRow>(
       `WITH candidate AS (
         SELECT outbox.outbox_id
         FROM meta_outbox AS outbox
         JOIN pages AS page ON page.page_id = outbox.page_id
         JOIN conversations AS conversation
           ON conversation.conversation_id = outbox.conversation_id
         WHERE outbox.status IN ('PENDING', 'RETRYABLE')
           AND (outbox.next_attempt_at IS NULL OR outbox.next_attempt_at <= now())
           AND page.routing_owner = 'APP'
           AND page.app_send_enabled = true
           AND page.kill_switch = false
           AND conversation.conversation_owner = 'BOT'
           AND conversation.blocking_tag IS NULL
           AND NOT EXISTS (
             SELECT 1
             FROM meta_outbox AS prior
             WHERE prior.reply_plan_id = outbox.reply_plan_id
               AND prior.sequence_no < outbox.sequence_no
               AND prior.status NOT IN ('SENT_ACCEPTED', 'DELIVERED', 'READ')
           )
         ORDER BY outbox.created_at, outbox.sequence_no
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE meta_outbox AS outbox
       SET status = 'SENDING',
           attempt_count = attempt_count + 1,
           lease_owner = $1,
           lease_token = gen_random_uuid(),
           lease_until = now() + ($2::integer * interval '1 millisecond'),
           request_started_at = now(),
           updated_at = now()
       FROM candidate
       WHERE outbox.outbox_id = candidate.outbox_id
       RETURNING
         outbox.outbox_id, outbox.page_id, outbox.conversation_id,
         outbox.attempt_count, outbox.lease_token,
         outbox.recipient_ciphertext, outbox.recipient_nonce,
         outbox.recipient_auth_tag, outbox.payload_ciphertext,
         outbox.payload_nonce, outbox.payload_auth_tag,
         outbox.payload_encrypted_dek, outbox.payload_key_ref,
         outbox.payload_expires_at,
         (
           SELECT external_id_ciphertext
           FROM provider_conversation_links
           WHERE page_id = outbox.page_id
             AND conversation_id = outbox.conversation_id
             AND provider = 'PANCAKE'
             AND expires_at > now()
         ) AS pancake_conversation_ciphertext,
         (
           SELECT external_id_nonce
           FROM provider_conversation_links
           WHERE page_id = outbox.page_id
             AND conversation_id = outbox.conversation_id
             AND provider = 'PANCAKE'
             AND expires_at > now()
         ) AS pancake_conversation_nonce,
         (
           SELECT external_id_auth_tag
           FROM provider_conversation_links
           WHERE page_id = outbox.page_id
             AND conversation_id = outbox.conversation_id
             AND provider = 'PANCAKE'
             AND expires_at > now()
         ) AS pancake_conversation_auth_tag`,
      [workerId, leaseMs],
    );
    const row = result.rows[0];
    if (!row) return null;
    const recipient = this.cipher.decryptValue(
      {
        ciphertext: row.recipient_ciphertext,
        nonce: row.recipient_nonce,
        authTag: row.recipient_auth_tag,
      },
      this.metaRecipientAad(row.page_id, row.outbox_id),
    );
    const payload = this.cipher.decryptJson<RealtimeMetaMessageUnit>(
      this.bundleFromMetaRow(row),
      this.metaPayloadAad(row.page_id, row.outbox_id),
    );
    const pancakeConversationId =
      row.pancake_conversation_ciphertext &&
      row.pancake_conversation_nonce &&
      row.pancake_conversation_auth_tag
        ? this.cipher.decryptValue(
            {
              ciphertext: row.pancake_conversation_ciphertext,
              nonce: row.pancake_conversation_nonce,
              authTag: row.pancake_conversation_auth_tag,
            },
            this.providerLinkAad(
              row.page_id,
              row.conversation_id,
              "PANCAKE",
            ),
          )
        : null;
    return {
      outboxId: row.outbox_id,
      leaseToken: row.lease_token,
      pageId: row.page_id,
      conversationId: row.conversation_id,
      recipientId: recipient,
      pancakeConversationId,
      message: payload,
      attemptCount: row.attempt_count,
    };
  }

  async markMetaAccepted(
    outboxId: string,
    leaseToken: string,
    providerMessageId: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE meta_outbox
       SET status = 'SENT_ACCEPTED', meta_message_id = $3,
           accepted_at = now(), lease_owner = NULL, lease_token = NULL,
           lease_until = NULL, updated_at = now()
       WHERE outbox_id = $1 AND status = 'SENDING' AND lease_token = $2`,
      [outboxId, leaseToken, providerMessageId],
    );
    return result.rowCount === 1;
  }

  async markMetaRetryable(
    outboxId: string,
    leaseToken: string,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE meta_outbox
       SET status = 'RETRYABLE',
           next_attempt_at = now() + ($3::integer * interval '1 second'),
           last_error_code = $4, lease_owner = NULL, lease_token = NULL,
           lease_until = NULL, updated_at = now()
       WHERE outbox_id = $1 AND status = 'SENDING' AND lease_token = $2`,
      [
        outboxId,
        leaseToken,
        Math.max(1, Math.min(3_600, Math.trunc(delaySeconds))),
        errorCode.slice(0, 128),
      ],
    );
    return result.rowCount === 1;
  }

  async markMetaTerminal(
    outboxId: string,
    leaseToken: string,
    status: "AMBIGUOUS" | "FAILED_PERMANENT",
    errorCode: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE meta_outbox
       SET status = $3,
           ambiguity_reason = CASE WHEN $3 = 'AMBIGUOUS' THEN $4 ELSE NULL END,
           last_error_code = $4, lease_owner = NULL, lease_token = NULL,
           lease_until = NULL, updated_at = now()
       WHERE outbox_id = $1 AND status = 'SENDING' AND lease_token = $2`,
      [outboxId, leaseToken, status, errorCode.slice(0, 128)],
    );
    return result.rowCount === 1;
  }

  async markMetaManualReview(
    outboxId: string,
    leaseToken: string,
    errorCode: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE meta_outbox
       SET status = 'MANUAL_REVIEW',
           last_error_code = $3, lease_owner = NULL, lease_token = NULL,
           lease_until = NULL, updated_at = now()
       WHERE outbox_id = $1 AND status = 'SENDING' AND lease_token = $2`,
      [outboxId, leaseToken, errorCode.slice(0, 128)],
    );
    return result.rowCount === 1;
  }

  async quarantineExpiredMetaSending(): Promise<number> {
    const result = await this.pool.query(
      `UPDATE meta_outbox
       SET status = 'AMBIGUOUS',
           ambiguity_reason = 'META_SENDING_LEASE_EXPIRED',
           last_error_code = 'META_SENDING_LEASE_EXPIRED',
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           updated_at = now()
       WHERE status = 'SENDING'
         AND lease_until IS NOT NULL
         AND lease_until <= now()`,
    );
    return result.rowCount ?? 0;
  }

  async claimPancakeTagOutbox(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedPancakeTagOutbox | null> {
    const result = await this.pool.query<PancakeTagOutboxRow>(
      `WITH candidate AS (
         SELECT operation_id
         FROM pancake_tag_outbox
         WHERE (
           status IN ('PENDING', 'RETRYABLE')
           AND (next_attempt_at IS NULL OR next_attempt_at <= now())
         ) OR (
           status = 'APPLYING'
           AND lease_until IS NOT NULL
           AND lease_until <= now()
         )
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE pancake_tag_outbox AS outbox
       SET status = 'APPLYING',
           attempt_count = attempt_count + 1,
           lease_owner = $1,
           lease_token = gen_random_uuid(),
           lease_until = now() + ($2::integer * interval '1 millisecond'),
           updated_at = now()
       FROM candidate
       WHERE outbox.operation_id = candidate.operation_id
       RETURNING
         outbox.operation_id, outbox.page_id, outbox.conversation_id,
         outbox.desired_tag, outbox.operation, outbox.pancake_tag_id,
         outbox.attempt_count,
         outbox.lease_token, outbox.pancake_conversation_ciphertext,
         outbox.pancake_conversation_nonce,
         outbox.pancake_conversation_auth_tag`,
      [workerId, leaseMs],
    );
    const row = result.rows[0];
    if (!row) return null;
    const pancakeConversationId = this.cipher.decryptValue(
      {
        ciphertext: row.pancake_conversation_ciphertext,
        nonce: row.pancake_conversation_nonce,
        authTag: row.pancake_conversation_auth_tag,
      },
      this.providerLinkAad(
        row.page_id,
        row.conversation_id,
        "PANCAKE",
      ),
    );
    return {
      operationId: row.operation_id,
      leaseToken: row.lease_token,
      pageId: row.page_id,
      conversationId: row.conversation_id,
      pancakeConversationId,
      desiredTag: row.desired_tag,
      operation: row.operation,
      tagId: row.pancake_tag_id,
      attemptCount: row.attempt_count,
    };
  }

  async markPancakeTagApplied(
    operationId: string,
    leaseToken: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE pancake_tag_outbox
       SET status = 'APPLIED', applied_at = now(),
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           last_error_code = NULL, updated_at = now()
       WHERE operation_id = $1
         AND status = 'APPLYING'
         AND lease_token = $2`,
      [operationId, leaseToken],
    );
    return result.rowCount === 1;
  }

  async markPancakeTagRetryable(
    operationId: string,
    leaseToken: string,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE pancake_tag_outbox
       SET status = 'RETRYABLE',
           next_attempt_at = now() + ($3::integer * interval '1 second'),
           last_error_code = $4,
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           updated_at = now()
       WHERE operation_id = $1
         AND status = 'APPLYING'
         AND lease_token = $2`,
      [
        operationId,
        leaseToken,
        Math.max(1, Math.min(3_600, Math.trunc(delaySeconds))),
        errorCode.slice(0, 128),
      ],
    );
    return result.rowCount === 1;
  }

  async markPancakeTagPermanent(
    operationId: string,
    leaseToken: string,
    errorCode: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE pancake_tag_outbox
       SET status = 'FAILED_PERMANENT', last_error_code = $3,
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           updated_at = now()
       WHERE operation_id = $1
         AND status = 'APPLYING'
         AND lease_token = $2`,
      [operationId, leaseToken, errorCode.slice(0, 128)],
    );
    return result.rowCount === 1;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async lockCurrentInboxBatch<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    guard: RealtimeInboxBatchGuard,
  ): Promise<boolean> {
    if (
      !Number.isSafeInteger(guard.generation) ||
      guard.generation <= 0 ||
      !guard.leaseToken.trim() ||
      guard.inboxIds.length === 0
    ) {
      throw new Error("INBOX_BATCH_GUARD_INVALID");
    }
    const current = await client.query<{ generation: string }>(
      `SELECT generation
       FROM conversation_ingress_heads
       WHERE page_id = $1 AND conversation_hash = $2
         AND lease_token = $3
       FOR UPDATE`,
      [input.pageId, input.customerHash, guard.leaseToken],
    );
    return Number(current.rows[0]?.generation) === guard.generation;
  }

  private async releaseSupersededInboxBatch<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    guard: RealtimeInboxBatchGuard,
  ): Promise<void> {
    await client.query(
      `UPDATE webhook_inbox
       SET status = 'VERIFIED',
           attempt_count = GREATEST(attempt_count - 1, 0),
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           next_attempt_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE inbox_id = ANY($1::uuid[])
         AND status = 'PROCESSING' AND lease_token = $2`,
      [guard.inboxIds, guard.leaseToken],
    );
    await client.query(
      `UPDATE conversation_ingress_heads
       SET lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           attempt_count = GREATEST(attempt_count - 1, 0),
           next_attempt_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE page_id = $1 AND conversation_hash = $2 AND lease_token = $3`,
      [input.pageId, input.customerHash, guard.leaseToken],
    );
  }

  private async completeInboxBatch<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    guard: RealtimeInboxBatchGuard,
    now: Date,
  ): Promise<void> {
    const completed = await client.query(
      `UPDATE webhook_inbox
       SET status = 'PROCESSED', processed_at = $3,
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           next_attempt_at = NULL, last_error_code = NULL, updated_at = $3
       WHERE inbox_id = ANY($1::uuid[])
         AND status = 'PROCESSING' AND lease_token = $2`,
      [guard.inboxIds, guard.leaseToken, now],
    );
    if (completed.rowCount !== guard.inboxIds.length) {
      throw new Error("INBOX_BATCH_LEASE_LOST");
    }
    const released = await client.query(
      `UPDATE conversation_ingress_heads AS head
       SET lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           attempt_count = 0,
           last_customer_receive_sequence = CASE
             WHEN NOT EXISTS (
               SELECT 1 FROM webhook_inbox AS pending
               WHERE pending.page_id = head.page_id
                 AND pending.conversation_hash = head.conversation_hash
                 AND pending.event_kind = 'CUSTOMER'
                 AND pending.status IN (
                   'VERIFIED', 'QUEUED', 'PROCESSING', 'FAILED_RETRYABLE'
                 )
             ) THEN NULL
             ELSE head.last_customer_receive_sequence
           END,
           quiet_until = CASE
             WHEN NOT EXISTS (
               SELECT 1 FROM webhook_inbox AS pending
               WHERE pending.page_id = head.page_id
                 AND pending.conversation_hash = head.conversation_hash
                 AND pending.event_kind = 'CUSTOMER'
                 AND pending.status IN (
                   'VERIFIED', 'QUEUED', 'PROCESSING', 'FAILED_RETRYABLE'
                 )
             ) THEN NULL
             ELSE head.quiet_until
           END,
           next_attempt_at = NULL, last_error_code = NULL, updated_at = $4
       WHERE head.page_id = $1 AND head.conversation_hash = $2
         AND head.lease_token = $3 AND head.generation = $5`,
      [
        input.pageId,
        input.customerHash,
        guard.leaseToken,
        now,
        guard.generation,
      ],
    );
    if (released.rowCount !== 1) {
      throw new Error("INBOX_BATCH_LEASE_LOST");
    }
  }

  private async insertDecisionEvents<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    events: readonly RealtimeDecisionEventPlan[],
  ): Promise<number> {
    let created = 0;
    for (const event of events) {
      const result = await client.query(
        `INSERT INTO conversation_events (
           event_id, conversation_id, page_id, customer_hash, event_type,
           intent, stage, action, handoff_reason, owner, product_id,
           prompt_version, model_version, policy_version, catalog_version,
           event_metadata, occurred_at
         ) VALUES (
           $1::uuid, $2::uuid, $3, $4, $5,
           $6, $7, $8, $9, $10, $11,
           $12, $13, $14, $15, $16::jsonb, $17
         )
         ON CONFLICT (event_id, occurred_at) DO NOTHING`,
        [
          event.eventId,
          input.conversationId,
          input.pageId,
          input.customerHash,
          event.eventType,
          event.intent,
          event.stage,
          event.action,
          event.eventType === "HANDOFF" ? event.reasonCodes[0] ?? null : null,
          this.stateString(input.state, "conversationOwner", "BOT"),
          event.productId,
          event.promptVersion,
          event.modelVersion,
          event.policyVersion,
          event.catalogVersion,
          JSON.stringify({
            schemaVersion: 1,
            eventKeyHash: event.eventKeyHash,
            origin: event.origin,
            reasonCodes: event.reasonCodes,
            releaseId: event.releaseId,
            mode: event.mode,
            ...event.details,
          }),
          event.occurredAt,
        ],
      );
      created += result.rowCount ?? 0;
    }
    return created;
  }

  private async selectConversation<TState>(
    client: PoolClient,
    pageId: string,
    customerHash: string,
    forUpdate: boolean,
  ): Promise<RealtimeConversationRecord<TState> | null> {
    const result = await client.query<ConversationRow>(
      `SELECT
         c.conversation_id, c.page_id, c.customer_hash, c.state_version,
         c.state_snapshot, p.routing_owner, p.app_send_enabled, p.kill_switch
       FROM conversations c
       JOIN pages p ON p.page_id = c.page_id
       WHERE c.page_id = $1 AND c.customer_hash = $2
       ${forUpdate ? "FOR UPDATE OF c" : ""}`,
      [pageId, customerHash],
    );
    const row = result.rows[0];
    return row
      ? {
          conversationId: row.conversation_id,
          pageId: row.page_id,
          customerHash: row.customer_hash,
          stateVersion: Number(row.state_version),
          state: row.state_snapshot as TState,
          routingOwner: row.routing_owner,
          appSendEnabled: row.app_send_enabled,
          killSwitch: row.kill_switch,
        }
      : null;
  }

  private async insertMetaPlan<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    plan: RealtimeMetaPlan,
    now: Date,
  ): Promise<number> {
    let created = 0;
    for (let sequence = 0; sequence < plan.messages.length; sequence += 1) {
      const message = plan.messages[sequence];
      if (!message) continue;
      const outboxId = randomUUID();
      const recipient = this.cipher.encryptValue(
        plan.recipientId,
        this.metaRecipientAad(input.pageId, outboxId),
      );
      const payload = this.cipher.encryptJson(
        message,
        this.metaPayloadAad(input.pageId, outboxId),
        new Date(now.getTime() + 20 * 86_400_000),
      );
      const imageDelayMs = message.kind === "IMAGE"
        ? Math.max(0, Math.min(5_000, Math.trunc(plan.imageDelayMs ?? 0)))
        : 0;
      const result = await client.query(
        `INSERT INTO meta_outbox (
           outbox_id, idempotency_key, reply_plan_id, response_group_id,
           conversation_id, page_id, customer_hash,
           recipient_ciphertext, recipient_nonce, recipient_auth_tag,
           payload_ciphertext, payload_nonce, payload_auth_tag,
           payload_encrypted_dek, payload_key_ref, payload_expires_at,
           payload_fingerprint, sequence_no, next_attempt_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
         )
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          outboxId,
          `meta:v2:${plan.replyPlanId}:${sequence}`,
          plan.replyPlanId,
          plan.responseGroupId,
          input.conversationId,
          input.pageId,
          input.customerHash,
          recipient.ciphertext,
          recipient.nonce,
          recipient.authTag,
          payload.ciphertext,
          payload.nonce,
          payload.authTag,
          payload.encryptedDek,
          payload.keyRef,
          payload.expiresAt,
          this.cipher.fingerprint(JSON.stringify(message), "meta-payload:v2"),
          sequence,
          new Date(now.getTime() + imageDelayMs),
        ],
      );
      created += result.rowCount ?? 0;
    }
    return created;
  }

  private async insertPancakeTagPlan<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    plan: RealtimePancakeTagPlan,
  ): Promise<boolean> {
    const link = await client.query<{
      external_id_ciphertext: Buffer;
      external_id_nonce: Buffer;
      external_id_auth_tag: Buffer;
    }>(
      `SELECT external_id_ciphertext, external_id_nonce, external_id_auth_tag
       FROM provider_conversation_links
       WHERE page_id = $1 AND conversation_id = $2
         AND provider = 'PANCAKE' AND expires_at > now()`,
      [input.pageId, input.conversationId],
    );
    const external = link.rows[0];
    if (!external) return false;
    const result = await client.query(
      `INSERT INTO pancake_tag_outbox (
         operation_id, idempotency_key, page_id, conversation_id,
         desired_tag, pancake_tag_id, handoff_generation,
         pancake_conversation_ciphertext, pancake_conversation_nonce,
         pancake_conversation_auth_tag
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        randomUUID(),
        `pancake-tag:v2:${input.conversationId}:${plan.desiredTag}:${plan.handoffGeneration}`,
        input.pageId,
        input.conversationId,
        plan.desiredTag,
        plan.tagId,
        plan.handoffGeneration,
        external.external_id_ciphertext,
        external.external_id_nonce,
        external.external_id_auth_tag,
      ],
    );
    return result.rowCount === 1;
  }

  private async commitSalesCyclePlan<TState>(
    client: PoolClient,
    pageId: string,
    conversationId: string,
    plan: RealtimeSalesCyclePlan<TState>,
    now: Date,
  ): Promise<void> {
    if (
      Number.isNaN(plan.expiresAt.getTime()) ||
      plan.expiresAt.getTime() <= now.getTime() ||
      plan.expiresAt.getTime() > now.getTime() + 48 * 60 * 60 * 1_000 ||
      (plan.cartExpiresAt !== null &&
        (Number.isNaN(plan.cartExpiresAt.getTime()) ||
          plan.cartExpiresAt.getTime() > plan.expiresAt.getTime()))
    ) {
      throw new Error("SALES_CYCLE_EXPIRY_INVALID");
    }
    const locked = await client.query<{ state_revision: string }>(
      `SELECT state_revision
       FROM sales_cycle_states
       WHERE conversation_id = $1 AND page_id = $2
       FOR UPDATE`,
      [conversationId, pageId],
    );
    const storedRevision = Number(locked.rows[0]?.state_revision ?? -1);
    if (storedRevision !== plan.expectedRevision) {
      throw new Error("SALES_CYCLE_STATE_REVISION_CONFLICT");
    }
    const nextRevision = this.stateNumber(
      plan.state,
      "revision",
      plan.expectedRevision + 1,
    );
    if (nextRevision <= plan.expectedRevision) {
      throw new Error("SALES_CYCLE_REVISION_INCREMENT_REQUIRED");
    }
    const encrypted = this.cipher.encryptJson(
      plan.state,
      this.salesCycleAad(pageId, conversationId),
      plan.expiresAt,
    );
    const updated = await client.query(
      `UPDATE sales_cycle_states
       SET state_revision = $3,
           state_ciphertext = $4,
           state_nonce = $5,
           state_auth_tag = $6,
           state_encrypted_dek = $7,
           state_key_ref = $8,
           cart_expires_at = $9,
           expires_at = $10,
           updated_at = $11
       WHERE conversation_id = $1 AND page_id = $2 AND state_revision = $12`,
      [
        conversationId,
        pageId,
        nextRevision,
        encrypted.ciphertext,
        encrypted.nonce,
        encrypted.authTag,
        encrypted.encryptedDek,
        encrypted.keyRef,
        plan.cartExpiresAt,
        plan.expiresAt,
        now,
        plan.expectedRevision,
      ],
    );
    if (updated.rowCount !== 1) {
      throw new Error("SALES_CYCLE_STATE_REVISION_CONFLICT");
    }
    for (const event of plan.events) {
      if (
        event.stateRevisionAfter <= event.stateRevisionBefore ||
        event.stateRevisionBefore < plan.expectedRevision ||
        event.stateRevisionAfter > nextRevision
      ) {
        throw new Error("SALES_CYCLE_EVENT_REVISION_INVALID");
      }
      await client.query(
        `INSERT INTO sales_cycle_events (
           event_id, conversation_id, page_id, command_id_hash, command_kind,
           outcome, state_revision_before, state_revision_after, stage_before,
           stage_after, cart_id, cart_version, reason_code, occurred_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          randomUUID(),
          conversationId,
          pageId,
          this.cipher.fingerprint(event.commandId, "sales-cycle-command:v1"),
          event.commandKind,
          event.outcome,
          event.stateRevisionBefore,
          event.stateRevisionAfter,
          event.stageBefore,
          event.stageAfter,
          event.cartId,
          event.cartVersion,
          event.reasonCode,
          event.occurredAt,
        ],
      );
    }
  }

  private async insertHandoffEvent<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    plan: RealtimeHandoffEventPlan,
    ownerBefore: "BOT" | "HUMAN",
    ownerAfter: "BOT" | "HUMAN",
  ): Promise<boolean> {
    const handoffId = randomUUID();
    const inserted = await client.query<{ handoff_id: string }>(
      `INSERT INTO handoff_events (
         handoff_id, page_id, conversation_id, direction, source,
         reason_code, reason_detail_safe, product_id, facts_status,
         facts_reason_code, desired_tag, owner_before, owner_after,
         handoff_generation, trigger_event_key_hash, trigger_message_pk,
         occurred_at
       ) VALUES (
         $1,$2,$3,'BOT_TO_HUMAN',$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,
         $13,$14,$15,$16
       )
       ON CONFLICT (
         conversation_id, direction, trigger_event_key_hash,
         handoff_generation
       ) DO NOTHING
       RETURNING handoff_id`,
      [
        handoffId,
        input.pageId,
        input.conversationId,
        plan.source,
        plan.reasonCode.trim().slice(0, 128) || "HANDOFF_REASON_UNKNOWN",
        JSON.stringify(plan.reasonDetailSafe ?? {}),
        plan.productId?.trim().slice(0, 128) || null,
        plan.factsStatus,
        plan.factsReasonCode?.trim().slice(0, 128) || null,
        plan.desiredTag,
        ownerBefore,
        ownerAfter,
        plan.handoffGeneration,
        this.cipher.fingerprint(plan.triggerEventKey, "handoff-trigger:v1"),
        plan.triggerMessagePk,
        plan.occurredAt,
      ],
    );
    const created = inserted.rows[0];
    if (!created) return false;
    await client.query(
      `INSERT INTO handoff_cases (
         opening_handoff_id, page_id, conversation_id, status, created_at,
         updated_at
       ) VALUES ($1,$2,$3,'NEW',$4,$4)`,
      [created.handoff_id, input.pageId, input.conversationId, plan.occurredAt],
    );
    return true;
  }

  private async acknowledgeActiveHandoff(
    client: PoolClient,
    conversationId: string,
    plan: RealtimeHandoffAcknowledgementPlan,
  ): Promise<void> {
    await client.query(
      `UPDATE handoff_cases
       SET status = 'IN_PROGRESS',
           acknowledged_at = $2,
           acknowledged_by_ref = $3,
           updated_at = $2
       WHERE conversation_id = $1
         AND status = 'NEW'`,
      [
        conversationId,
        plan.occurredAt,
        this.cipher.fingerprint(plan.actorRef, "handoff-actor:v1"),
      ],
    );
  }

  private bundleFromMetaRow(row: MetaOutboxRow): CipherBundle {
    return {
      ciphertext: row.payload_ciphertext,
      nonce: row.payload_nonce,
      authTag: row.payload_auth_tag,
      encryptedDek: row.payload_encrypted_dek,
      keyRef: row.payload_key_ref,
      expiresAt: row.payload_expires_at,
    };
  }

  private salesCycleAad(pageId: string, conversationId: string): string {
    return `lana:sales-cycle:v1:${pageId}:${conversationId}`;
  }

  private salesCycleRecord<TState>(
    row: SalesCycleRow,
  ): RealtimeSalesCycleRecord<TState> {
    const state = this.cipher.decryptJson<TState>(
      {
        ciphertext: row.state_ciphertext,
        nonce: row.state_nonce,
        authTag: row.state_auth_tag,
        encryptedDek: row.state_encrypted_dek,
        keyRef: row.state_key_ref,
        expiresAt: row.expires_at,
      },
      this.salesCycleAad(row.page_id, row.conversation_id),
    );
    return {
      conversationId: row.conversation_id,
      pageId: row.page_id,
      stateRevision: Number(row.state_revision),
      state,
      cartExpiresAt: row.cart_expires_at,
      expiresAt: row.expires_at,
    };
  }

  private metaRecipientAad(pageId: string, outboxId: string): string {
    return `lana:meta-recipient:v2:${pageId}:${outboxId}`;
  }

  private metaPayloadAad(pageId: string, outboxId: string): string {
    return `lana:meta-payload:v2:${pageId}:${outboxId}`;
  }

  private providerLinkAad(
    pageId: string,
    conversationId: string,
    provider: string,
  ): string {
    return `lana:provider-link:v1:${pageId}:${conversationId}:${provider}`;
  }

  private emptyObject(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    );
  }

  private stateString(
    state: unknown,
    key: string,
    fallback: string,
  ): string {
    if (state !== null && typeof state === "object") {
      const value = (state as Record<string, unknown>)[key];
      if (typeof value === "string") return value;
    }
    return fallback;
  }

  private stateNullableString(state: unknown, key: string): string | null {
    if (state !== null && typeof state === "object") {
      const value = (state as Record<string, unknown>)[key];
      if (typeof value === "string") return value;
    }
    return null;
  }

  private stateNumber(
    state: unknown,
    key: string,
    fallback: number,
  ): number {
    if (state !== null && typeof state === "object") {
      const value = (state as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isSafeInteger(value)) return value;
    }
    return fallback;
  }
}
