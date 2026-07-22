import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import type { CipherBundle } from "./repositories.js";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";
import { recordVerifiedWebhook, withTransaction } from "./repositories.js";

export type InboundEventKind = "CUSTOMER" | "APP_ECHO" | "PAGE_ECHO";

export interface DurableInboundInput {
  readonly pageId: string;
  readonly metaAppId: string;
  readonly eventKey: string;
  readonly providerMessageId: string | null;
  readonly conversationHash: string;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
  readonly signatureKeyVersion: string;
  readonly eventKind?: InboundEventKind;
  readonly envelope: unknown;
}

export interface ClaimedInbound<T = unknown> {
  readonly inboxId: string;
  readonly pageId: string;
  readonly eventKey: string;
  readonly conversationHash: string;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
  readonly receiveSequence: number;
  readonly attemptCount: number;
  readonly leaseToken: string;
  readonly eventKind?: InboundEventKind;
  readonly envelope: T;
}

export interface InboxBatchLease {
  readonly pageId: string;
  readonly conversationHash: string;
  readonly generation: number | null;
  readonly leaseToken: string;
  readonly inboxIds: readonly string[];
}

export interface ClaimedInboundBatch<T = unknown> extends InboxBatchLease {
  readonly evaluationGroupId: string;
  readonly eventKind: InboundEventKind;
  readonly firstReceiveSequence: number;
  readonly lastReceiveSequence: number;
  readonly attemptCount: number;
  readonly items: readonly ClaimedInbound<T>[];
}

interface ClaimedRow {
  inbox_id: string;
  page_id: string;
  event_key: string;
  conversation_hash: string;
  provider_occurred_at: Date | null;
  received_at: Date;
  receive_sequence: string;
  attempt_count: number;
  lease_token: string;
  event_kind: InboundEventKind;
  evaluation_group_id: string | null;
  payload_ciphertext: Buffer;
  payload_nonce: Buffer;
  payload_auth_tag: Buffer;
  payload_encrypted_dek: Buffer;
  payload_key_ref: string;
  payload_expires_at: Date;
}

interface IngressHeadCandidateRow {
  page_id: string;
  conversation_hash: string;
  generation: string;
  last_customer_receive_sequence: string | null;
  page_echo_receive_sequence: string | null;
  attempt_count: number;
}

export interface PostgresRealtimeInboxOptions {
  readonly payloadRetentionDays?: number;
  readonly maxPoolSize?: number;
  readonly customerDebounceMs?: number;
}

export class PostgresRealtimeInboxStore {
  private readonly pool: Pool;
  private readonly payloadRetentionDays: number;
  private readonly customerDebounceMs: number;

  constructor(
    connectionString: string,
    private readonly cipher: LocalEnvelopeCipher,
    options: PostgresRealtimeInboxOptions = {},
  ) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({
      connectionString,
      max: options.maxPoolSize ?? 5,
    });
    this.payloadRetentionDays = Math.max(
      1,
      Math.min(20, Math.trunc(options.payloadRetentionDays ?? 20)),
    );
    const customerDebounceMs = options.customerDebounceMs ?? 5_000;
    if (!Number.isFinite(customerDebounceMs)) {
      throw new Error("REALTIME_CUSTOMER_DEBOUNCE_INVALID");
    }
    this.customerDebounceMs = Math.max(
      1_000,
      Math.min(60_000, Math.trunc(customerDebounceMs)),
    );
  }

  async ready(): Promise<boolean> {
    try {
      const result = await this.pool.query<{ ok: number }>(
        "SELECT 1 AS ok FROM webhook_inbox LIMIT 1",
      );
      return result.rows[0]?.ok === 1 || result.rowCount === 0;
    } catch {
      return false;
    }
  }

  async isOwnMetaMessage(
    pageId: string,
    providerMessageId: string,
  ): Promise<boolean> {
    if (!pageId.trim() || !providerMessageId.trim()) return false;
    const result = await this.pool.query(
      `SELECT 1
       FROM meta_outbox
       WHERE page_id = $1 AND meta_message_id = $2
         AND status IN ('SENT_ACCEPTED', 'DELIVERED', 'READ')
       LIMIT 1`,
      [pageId, providerMessageId],
    );
    return result.rowCount === 1;
  }

  async enqueue(
    input: DurableInboundInput,
  ): Promise<{ inboxId: string; inserted: boolean; status: string }> {
    const inboxId = randomUUID();
    const aad = this.inboxAad(input.pageId, input.eventKey);
    const payload = this.cipher.encryptJson(
      input.envelope,
      aad,
      new Date(
        input.receivedAt.getTime() +
          this.payloadRetentionDays * 86_400_000,
      ),
    );
    return withTransaction(this.pool, async (client) => {
      await client.query(
        `INSERT INTO pages (
           page_id, page_alias, status, meta_app_id,
           routing_owner, app_send_enabled, kill_switch
         ) VALUES ($1,$2,'PAUSED',$3,'N8N',false,true)
         ON CONFLICT (page_id) DO UPDATE SET
           meta_app_id = EXCLUDED.meta_app_id,
           updated_at = now()`,
        [input.pageId, `page-${input.pageId}`, input.metaAppId],
      );
      const eventKind = input.eventKind ?? "CUSTOMER";
      const recorded = await recordVerifiedWebhook(client, {
        inboxId,
        pageId: input.pageId,
        eventKey: input.eventKey,
        providerMessageId: input.providerMessageId,
        conversationHash: input.conversationHash,
        providerOccurredAt: input.occurredAt,
        receivedAt: input.receivedAt,
        signatureKeyVersion: input.signatureKeyVersion,
        eventKind,
        payload,
      });
      if (recorded.inserted && eventKind !== "APP_ECHO") {
        await client.query(
          `INSERT INTO conversation_ingress_heads (
             page_id, conversation_hash, generation,
             last_customer_receive_sequence, quiet_until,
             created_at, updated_at
           ) VALUES (
             $1,$2,$3::bigint,
             CASE WHEN $4 = 'CUSTOMER' THEN $3::bigint ELSE NULL END,
             CASE WHEN $4 = 'CUSTOMER'
               THEN $5::timestamptz + ($6::integer * interval '1 millisecond')
               ELSE NULL
             END,
             $5,$5
           )
           ON CONFLICT (page_id, conversation_hash) DO UPDATE SET
             -- Every unique non-app echo advances activity even when its
             -- globally assigned receive_sequence commits out of order.
             generation = GREATEST(
               conversation_ingress_heads.generation + 1,
               EXCLUDED.generation
             ),
             last_customer_receive_sequence = CASE
               WHEN $4 = 'CUSTOMER' THEN GREATEST(
                 conversation_ingress_heads.last_customer_receive_sequence,
                 $3::bigint
               )
               ELSE conversation_ingress_heads.last_customer_receive_sequence
             END,
             quiet_until = CASE
               WHEN $4 = 'CUSTOMER' THEN GREATEST(
                 conversation_ingress_heads.quiet_until,
                 $5::timestamptz + ($6::integer * interval '1 millisecond')
               )
               ELSE conversation_ingress_heads.quiet_until
             END,
             -- Attempts belong to one activity generation. A genuinely new
             -- inbound starts a fresh batch budget; duplicate webhooks never
             -- execute this upsert branch.
             attempt_count = 0,
             next_attempt_at = NULL,
             last_error_code = NULL,
             updated_at = GREATEST(conversation_ingress_heads.updated_at, $5)`,
          [
            input.pageId,
            input.conversationHash,
            recorded.receiveSequence,
            eventKind,
            input.receivedAt,
            this.customerDebounceMs,
          ],
        );
      }
      return {
        inboxId: recorded.inboxId,
        inserted: recorded.inserted,
        status: recorded.status,
      };
    });
  }

  async claimNext<T>(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedInbound<T> | null> {
    if (!workerId.trim()) throw new Error("REALTIME_WORKER_ID_REQUIRED");
    if (!Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 300_000) {
      throw new Error("REALTIME_INBOX_LEASE_INVALID");
    }
    const result = await this.pool.query<ClaimedRow>(
      `WITH candidate AS (
         SELECT inbox_id
         FROM webhook_inbox
         WHERE (
           status IN ('VERIFIED', 'QUEUED')
           OR (
             status = 'FAILED_RETRYABLE'
             AND (next_attempt_at IS NULL OR next_attempt_at <= now())
           )
           OR (
             status = 'PROCESSING'
             AND lease_until IS NOT NULL
             AND lease_until <= now()
           )
         )
         ORDER BY provider_occurred_at NULLS LAST, receive_sequence, received_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE webhook_inbox AS inbox
       SET status = 'PROCESSING',
           attempt_count = attempt_count + 1,
           lease_owner = $1,
           lease_token = gen_random_uuid(),
           lease_until = now() + ($2::integer * interval '1 millisecond'),
           updated_at = now()
       FROM candidate
       WHERE inbox.inbox_id = candidate.inbox_id
       RETURNING
         inbox.inbox_id, inbox.page_id, inbox.event_key,
         inbox.conversation_hash, inbox.provider_occurred_at,
         inbox.received_at, inbox.receive_sequence, inbox.attempt_count,
         inbox.lease_token, inbox.event_kind, inbox.evaluation_group_id,
         inbox.payload_ciphertext, inbox.payload_nonce,
         inbox.payload_auth_tag, inbox.payload_encrypted_dek,
         inbox.payload_key_ref, inbox.payload_expires_at`,
      [workerId, leaseMs],
    );
    const row = result.rows[0];
    if (!row) return null;
    if (
      !row.payload_ciphertext ||
      !row.payload_nonce ||
      !row.payload_auth_tag ||
      !row.payload_encrypted_dek ||
      !row.payload_key_ref ||
      !row.payload_expires_at
    ) {
      await this.failPermanent(
        row.inbox_id,
        row.lease_token,
        "INBOX_PAYLOAD_MISSING",
      );
      return null;
    }
    const bundle: CipherBundle = {
      ciphertext: row.payload_ciphertext,
      nonce: row.payload_nonce,
      authTag: row.payload_auth_tag,
      encryptedDek: row.payload_encrypted_dek,
      keyRef: row.payload_key_ref,
      expiresAt: row.payload_expires_at,
    };
    const envelope = this.cipher.decryptJson<T>(
      bundle,
      this.inboxAad(row.page_id, row.event_key),
    );
    return {
      inboxId: row.inbox_id,
      pageId: row.page_id,
      eventKey: row.event_key,
      conversationHash: row.conversation_hash,
      occurredAt: row.provider_occurred_at ?? row.received_at,
      receivedAt: row.received_at,
      receiveSequence: Number(row.receive_sequence),
      attemptCount: row.attempt_count,
      leaseToken: row.lease_token,
      eventKind: row.event_kind,
      envelope,
    };
  }

  /**
   * Claims one durable unit of work without holding a database transaction
   * while tools/model run. Customer rows are claimed as one sliding-debounce
   * burst; page echoes are immediate singleton batches and invalidate an
   * in-flight customer generation; our own app echoes are immediate but do not
   * touch the conversation generation.
   */
  async claimNextBatch<T>(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedInboundBatch<T> | null> {
    this.validateLease(workerId, leaseMs);

    const appEcho = await this.claimNextAppEcho<T>(workerId, leaseMs);
    if (appEcho) return appEcho;

    const leaseToken = randomUUID();
    const evaluationGroupId = randomUUID();
    const claimed = await withTransaction(this.pool, async (client) => {
      const candidateResult = await client.query<IngressHeadCandidateRow>(
        `SELECT
           head.page_id,
           head.conversation_hash,
           head.generation,
           head.last_customer_receive_sequence,
           page_echo.receive_sequence AS page_echo_receive_sequence,
           head.attempt_count
         FROM conversation_ingress_heads AS head
         LEFT JOIN LATERAL (
           SELECT inbox.receive_sequence
           FROM webhook_inbox AS inbox
           WHERE inbox.page_id = head.page_id
             AND inbox.conversation_hash = head.conversation_hash
             AND inbox.event_kind = 'PAGE_ECHO'
             AND (
               inbox.status IN ('VERIFIED', 'QUEUED')
               OR (
                 inbox.status = 'FAILED_RETRYABLE'
                 AND (inbox.next_attempt_at IS NULL OR inbox.next_attempt_at <= now())
               )
               OR (
                 inbox.status = 'PROCESSING'
                 AND inbox.lease_until IS NOT NULL
                 AND inbox.lease_until <= now()
               )
             )
           ORDER BY inbox.receive_sequence
           LIMIT 1
         ) AS page_echo ON true
         WHERE (head.lease_until IS NULL OR head.lease_until <= now())
           AND (head.next_attempt_at IS NULL OR head.next_attempt_at <= now())
           AND (
             page_echo.receive_sequence IS NOT NULL
             OR (
               head.quiet_until IS NOT NULL
               AND head.quiet_until <= now()
               AND EXISTS (
                 SELECT 1
                 FROM webhook_inbox AS customer
                 WHERE customer.page_id = head.page_id
                   AND customer.conversation_hash = head.conversation_hash
                   AND customer.event_kind = 'CUSTOMER'
                   AND customer.receive_sequence <= head.last_customer_receive_sequence
                   AND (
                     customer.status IN ('VERIFIED', 'QUEUED', 'FAILED_RETRYABLE')
                     OR (
                       customer.status = 'PROCESSING'
                       AND customer.lease_until IS NOT NULL
                       AND customer.lease_until <= now()
                     )
                   )
               )
             )
           )
         ORDER BY
           CASE WHEN page_echo.receive_sequence IS NOT NULL THEN 0 ELSE 1 END,
           COALESCE(page_echo.receive_sequence, head.last_customer_receive_sequence)
         FOR UPDATE OF head SKIP LOCKED
         LIMIT 1`,
      );
      const candidate = candidateResult.rows[0];
      if (!candidate) return null;

      const eventKind: InboundEventKind = candidate.page_echo_receive_sequence
        ? "PAGE_ECHO"
        : "CUSTOMER";
      const updatedHead = await client.query(
        `UPDATE conversation_ingress_heads
         SET lease_owner = $3,
             lease_token = $4,
             lease_until = now() + ($5::integer * interval '1 millisecond'),
             attempt_count = attempt_count + 1,
             updated_at = now()
         WHERE page_id = $1 AND conversation_hash = $2
           AND generation = $6`,
        [
          candidate.page_id,
          candidate.conversation_hash,
          workerId,
          leaseToken,
          leaseMs,
          candidate.generation,
        ],
      );
      if (updatedHead.rowCount !== 1) return null;

      const claimedRows = await client.query<ClaimedRow>(
        `UPDATE webhook_inbox AS inbox
         SET status = 'PROCESSING',
             attempt_count = attempt_count + 1,
             lease_owner = $5,
             lease_token = $6,
             lease_until = now() + ($7::integer * interval '1 millisecond'),
             evaluation_group_id = $8,
             updated_at = now()
         WHERE inbox.page_id = $1
           AND inbox.conversation_hash = $2
           AND inbox.event_kind = $3
           AND (
             ($3 = 'PAGE_ECHO' AND inbox.receive_sequence = $4)
             OR
             ($3 = 'CUSTOMER' AND inbox.receive_sequence <= $4)
           )
           AND (
             inbox.status IN ('VERIFIED', 'QUEUED', 'FAILED_RETRYABLE')
             OR (
               inbox.status = 'PROCESSING'
               AND inbox.lease_until IS NOT NULL
               AND inbox.lease_until <= now()
             )
           )
         RETURNING
           inbox.inbox_id, inbox.page_id, inbox.event_key,
           inbox.conversation_hash, inbox.provider_occurred_at,
           inbox.received_at, inbox.receive_sequence, inbox.attempt_count,
           inbox.lease_token, inbox.event_kind, inbox.evaluation_group_id,
           inbox.payload_ciphertext, inbox.payload_nonce,
           inbox.payload_auth_tag, inbox.payload_encrypted_dek,
           inbox.payload_key_ref, inbox.payload_expires_at`,
        [
          candidate.page_id,
          candidate.conversation_hash,
          eventKind,
          eventKind === "PAGE_ECHO"
            ? candidate.page_echo_receive_sequence
            : candidate.last_customer_receive_sequence,
          workerId,
          leaseToken,
          leaseMs,
          evaluationGroupId,
        ],
      );
      if (claimedRows.rowCount === 0) {
        await client.query(
          `UPDATE conversation_ingress_heads
           SET lease_owner = NULL, lease_token = NULL, lease_until = NULL,
               updated_at = now()
           WHERE page_id = $1 AND conversation_hash = $2 AND lease_token = $3`,
          [candidate.page_id, candidate.conversation_hash, leaseToken],
        );
        return null;
      }
      return {
        pageId: candidate.page_id,
        conversationHash: candidate.conversation_hash,
        generation: Number(candidate.generation),
        eventKind,
        attemptCount: candidate.attempt_count + 1,
        rows: claimedRows.rows,
      };
    });
    if (!claimed) return null;
    return this.decodeBatch<T>({
      ...claimed,
      leaseToken,
      evaluationGroupId,
    });
  }

  async completeBatch(
    batch: InboxBatchLease,
    requireCurrentGeneration = true,
  ): Promise<boolean> {
    return withTransaction(this.pool, async (client) => {
      if (batch.generation !== null && requireCurrentGeneration) {
        const current = await client.query<{ generation: string }>(
          `SELECT generation
           FROM conversation_ingress_heads
           WHERE page_id = $1 AND conversation_hash = $2
             AND lease_token = $3
           FOR UPDATE`,
          [batch.pageId, batch.conversationHash, batch.leaseToken],
        );
        if (Number(current.rows[0]?.generation) !== batch.generation) {
          await this.releaseBatchRows(client, batch, false);
          return false;
        }
      }
      const completed = await client.query(
        `UPDATE webhook_inbox
         SET status = 'PROCESSED', processed_at = now(),
             lease_owner = NULL, lease_token = NULL, lease_until = NULL,
             next_attempt_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE inbox_id = ANY($1::uuid[])
           AND status = 'PROCESSING' AND lease_token = $2`,
        [batch.inboxIds, batch.leaseToken],
      );
      if (completed.rowCount !== batch.inboxIds.length) {
        throw new Error("INBOX_BATCH_LEASE_LOST");
      }
      if (batch.generation !== null) {
        await this.clearHeadLease(client, batch, true);
      }
      return true;
    });
  }

  async isBatchCurrent(batch: InboxBatchLease): Promise<boolean> {
    if (batch.generation === null) return true;
    const result = await this.pool.query<{ generation: string }>(
      `SELECT generation
       FROM conversation_ingress_heads
       WHERE page_id = $1 AND conversation_hash = $2
         AND lease_token = $3 AND lease_until > now()`,
      [batch.pageId, batch.conversationHash, batch.leaseToken],
    );
    return Number(result.rows[0]?.generation) === batch.generation;
  }

  async retryBatch(
    batch: InboxBatchLease,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean> {
    const safeDelay = Math.max(1, Math.min(3_600, Math.trunc(delaySeconds)));
    return withTransaction(this.pool, async (client) => {
      if (!(await this.batchGenerationMatches(client, batch))) {
        await this.releaseBatchRows(client, batch, false);
        return false;
      }
      const rows = await client.query(
        `UPDATE webhook_inbox
         SET status = 'FAILED_RETRYABLE',
             next_attempt_at = now() + ($3::integer * interval '1 second'),
             lease_owner = NULL, lease_token = NULL, lease_until = NULL,
             last_error_code = $4, updated_at = now()
         WHERE inbox_id = ANY($1::uuid[])
           AND status = 'PROCESSING' AND lease_token = $2`,
        [
          batch.inboxIds,
          batch.leaseToken,
          safeDelay,
          errorCode.slice(0, 128),
        ],
      );
      if (rows.rowCount !== batch.inboxIds.length) {
        throw new Error("INBOX_BATCH_LEASE_LOST");
      }
      if (batch.generation !== null) {
        const released = await client.query(
          `UPDATE conversation_ingress_heads
           SET lease_owner = NULL, lease_token = NULL, lease_until = NULL,
               next_attempt_at = now() + ($4::integer * interval '1 second'),
               last_error_code = $5, updated_at = now()
            WHERE page_id = $1 AND conversation_hash = $2
              AND lease_token = $3 AND generation = $6`,
          [
            batch.pageId,
            batch.conversationHash,
            batch.leaseToken,
            safeDelay,
            errorCode.slice(0, 128),
            batch.generation,
          ],
        );
        if (released.rowCount !== 1) {
          throw new Error("INBOX_BATCH_LEASE_LOST");
        }
      }
      return true;
    });
  }

  async failBatchPermanent(
    batch: InboxBatchLease,
    errorCode: string,
  ): Promise<boolean> {
    return withTransaction(this.pool, async (client) => {
      if (!(await this.batchGenerationMatches(client, batch))) {
        await this.releaseBatchRows(client, batch, false);
        return false;
      }
      const rows = await client.query(
        `UPDATE webhook_inbox
         SET status = 'FAILED_PERMANENT',
             lease_owner = NULL, lease_token = NULL, lease_until = NULL,
             last_error_code = $3, updated_at = now()
         WHERE inbox_id = ANY($1::uuid[])
           AND status = 'PROCESSING' AND lease_token = $2`,
        [batch.inboxIds, batch.leaseToken, errorCode.slice(0, 128)],
      );
      if (rows.rowCount !== batch.inboxIds.length) {
        throw new Error("INBOX_BATCH_LEASE_LOST");
      }
      if (batch.generation !== null) {
        await this.clearHeadLease(client, batch, true);
      }
      return true;
    });
  }

  private async claimNextAppEcho<T>(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedInboundBatch<T> | null> {
    const leaseToken = randomUUID();
    const evaluationGroupId = randomUUID();
    const result = await this.pool.query<ClaimedRow>(
      `WITH candidate AS (
         SELECT inbox_id
         FROM webhook_inbox
         WHERE event_kind = 'APP_ECHO'
           AND (
             status IN ('VERIFIED', 'QUEUED')
             OR (
               status = 'FAILED_RETRYABLE'
               AND (next_attempt_at IS NULL OR next_attempt_at <= now())
             )
             OR (
               status = 'PROCESSING'
               AND lease_until IS NOT NULL
               AND lease_until <= now()
             )
           )
         ORDER BY receive_sequence
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE webhook_inbox AS inbox
       SET status = 'PROCESSING',
           attempt_count = attempt_count + 1,
           lease_owner = $1,
           lease_token = $2,
           lease_until = now() + ($3::integer * interval '1 millisecond'),
           evaluation_group_id = $4,
           updated_at = now()
       FROM candidate
       WHERE inbox.inbox_id = candidate.inbox_id
       RETURNING
         inbox.inbox_id, inbox.page_id, inbox.event_key,
         inbox.conversation_hash, inbox.provider_occurred_at,
         inbox.received_at, inbox.receive_sequence, inbox.attempt_count,
         inbox.lease_token, inbox.event_kind, inbox.evaluation_group_id,
         inbox.payload_ciphertext, inbox.payload_nonce,
         inbox.payload_auth_tag, inbox.payload_encrypted_dek,
         inbox.payload_key_ref, inbox.payload_expires_at`,
      [workerId, leaseToken, leaseMs, evaluationGroupId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.decodeBatch<T>({
      pageId: row.page_id,
      conversationHash: row.conversation_hash,
      generation: null,
      eventKind: "APP_ECHO",
      attemptCount: row.attempt_count,
      rows: [row],
      leaseToken,
      evaluationGroupId,
    });
  }

  private async decodeBatch<T>(input: {
    readonly pageId: string;
    readonly conversationHash: string;
    readonly generation: number | null;
    readonly eventKind: InboundEventKind;
    readonly attemptCount: number;
    readonly rows: readonly ClaimedRow[];
    readonly leaseToken: string;
    readonly evaluationGroupId: string;
  }): Promise<ClaimedInboundBatch<T> | null> {
    const sorted = [...input.rows].sort(
      (left, right) => Number(left.receive_sequence) - Number(right.receive_sequence),
    );
    const invalid = sorted.some(
      (row) =>
        !row.payload_ciphertext ||
        !row.payload_nonce ||
        !row.payload_auth_tag ||
        !row.payload_encrypted_dek ||
        !row.payload_key_ref ||
        !row.payload_expires_at,
    );
    const lease: InboxBatchLease = {
      pageId: input.pageId,
      conversationHash: input.conversationHash,
      generation: input.generation,
      leaseToken: input.leaseToken,
      inboxIds: sorted.map((row) => row.inbox_id),
    };
    if (invalid) {
      await this.failBatchPermanent(lease, "INBOX_PAYLOAD_MISSING");
      return null;
    }
    const items = sorted.map((row): ClaimedInbound<T> => {
      const bundle: CipherBundle = {
        ciphertext: row.payload_ciphertext,
        nonce: row.payload_nonce,
        authTag: row.payload_auth_tag,
        encryptedDek: row.payload_encrypted_dek,
        keyRef: row.payload_key_ref,
        expiresAt: row.payload_expires_at,
      };
      return {
        inboxId: row.inbox_id,
        pageId: row.page_id,
        eventKey: row.event_key,
        conversationHash: row.conversation_hash,
        occurredAt: row.provider_occurred_at ?? row.received_at,
        receivedAt: row.received_at,
        receiveSequence: Number(row.receive_sequence),
        attemptCount: row.attempt_count,
        leaseToken: row.lease_token,
        eventKind: row.event_kind,
        envelope: this.cipher.decryptJson<T>(
          bundle,
          this.inboxAad(row.page_id, row.event_key),
        ),
      };
    });
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return null;
    return {
      ...lease,
      evaluationGroupId: input.evaluationGroupId,
      eventKind: input.eventKind,
      firstReceiveSequence: first.receiveSequence,
      lastReceiveSequence: last.receiveSequence,
      attemptCount: input.attemptCount,
      items,
    };
  }

  private async releaseBatchRows(
    client: PoolClient,
    batch: InboxBatchLease,
    countAttempt: boolean,
  ): Promise<void> {
    await client.query(
      `UPDATE webhook_inbox
       SET status = 'VERIFIED',
           attempt_count = CASE
             WHEN $3 THEN attempt_count
             ELSE GREATEST(attempt_count - 1, 0)
           END,
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           next_attempt_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE inbox_id = ANY($1::uuid[])
         AND status = 'PROCESSING' AND lease_token = $2`,
      [batch.inboxIds, batch.leaseToken, countAttempt],
    );
    if (batch.generation !== null) {
      await this.clearHeadLease(client, batch, false, false);
    }
  }

  private async batchGenerationMatches(
    client: PoolClient,
    batch: InboxBatchLease,
  ): Promise<boolean> {
    if (batch.generation === null) return true;
    const current = await client.query<{ generation: string }>(
      `SELECT generation
       FROM conversation_ingress_heads
       WHERE page_id = $1 AND conversation_hash = $2 AND lease_token = $3
       FOR UPDATE`,
      [batch.pageId, batch.conversationHash, batch.leaseToken],
    );
    return Number(current.rows[0]?.generation) === batch.generation;
  }

  private async clearHeadLease(
    client: PoolClient,
    batch: InboxBatchLease,
    resetAttemptCount: boolean,
    requireLease = true,
  ): Promise<void> {
    const released = await client.query(
      `UPDATE conversation_ingress_heads AS head
       SET lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           attempt_count = CASE WHEN $4 THEN 0 ELSE attempt_count END,
           last_customer_receive_sequence = CASE
             WHEN $4 AND NOT EXISTS (
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
             WHEN $4 AND NOT EXISTS (
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
           next_attempt_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE head.page_id = $1 AND head.conversation_hash = $2
         AND head.lease_token = $3`,
      [
        batch.pageId,
        batch.conversationHash,
        batch.leaseToken,
        resetAttemptCount,
      ],
    );
    if (requireLease && released.rowCount !== 1) {
      throw new Error("INBOX_BATCH_LEASE_LOST");
    }
  }

  private validateLease(workerId: string, leaseMs: number): void {
    if (!workerId.trim()) throw new Error("REALTIME_WORKER_ID_REQUIRED");
    if (!Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 300_000) {
      throw new Error("REALTIME_INBOX_LEASE_INVALID");
    }
  }

  async complete(inboxId: string, leaseToken: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE webhook_inbox
       SET status = 'PROCESSED', processed_at = now(),
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           last_error_code = NULL, updated_at = now()
       WHERE inbox_id = $1 AND status = 'PROCESSING' AND lease_token = $2`,
      [inboxId, leaseToken],
    );
    return result.rowCount === 1;
  }

  async retry(
    inboxId: string,
    leaseToken: string,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean> {
    const safeDelay = Math.max(1, Math.min(3_600, Math.trunc(delaySeconds)));
    const result = await this.pool.query(
      `UPDATE webhook_inbox
       SET status = 'FAILED_RETRYABLE',
           next_attempt_at = now() + ($3::integer * interval '1 second'),
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           last_error_code = $4, updated_at = now()
       WHERE inbox_id = $1 AND status = 'PROCESSING' AND lease_token = $2`,
      [inboxId, leaseToken, safeDelay, errorCode.slice(0, 128)],
    );
    return result.rowCount === 1;
  }

  async failPermanent(
    inboxId: string,
    leaseToken: string,
    errorCode: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE webhook_inbox
       SET status = 'FAILED_PERMANENT',
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           last_error_code = $3, updated_at = now()
       WHERE inbox_id = $1 AND status = 'PROCESSING' AND lease_token = $2`,
      [inboxId, leaseToken, errorCode.slice(0, 128)],
    );
    return result.rowCount === 1;
  }

  async heartbeat(
    workerId: string,
    status: "STARTING" | "IDLE" | "PROCESSING" | "ERROR" | "STOPPING",
    mode: "DRY_RUN" | "LIVE",
    sendEnabled: boolean,
    errorCode?: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO realtime_worker_status (
         worker_id, status, mode, send_enabled, last_seen_at,
         last_success_at, last_error_code, updated_at
       ) VALUES (
         $1,$2,$3,$4,now(),
         CASE WHEN $2 IN ('IDLE','PROCESSING') THEN now() ELSE NULL END,
         $5,now()
       )
       ON CONFLICT (worker_id) DO UPDATE SET
         status = EXCLUDED.status,
         mode = EXCLUDED.mode,
         send_enabled = EXCLUDED.send_enabled,
         last_seen_at = now(),
         last_success_at = CASE
           WHEN EXCLUDED.status IN ('IDLE','PROCESSING') THEN now()
           ELSE realtime_worker_status.last_success_at
         END,
         last_error_code = EXCLUDED.last_error_code,
         updated_at = now()`,
      [workerId, status, mode, sendEnabled, errorCode?.slice(0, 128) ?? null],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private inboxAad(pageId: string, eventKey: string): string {
    return `lana:realtime-inbox:v1:${pageId}:${eventKey}`;
  }
}
