import type { Pool, PoolClient } from "pg";

export interface CipherBundle {
  ciphertext: Buffer;
  nonce: Buffer;
  authTag: Buffer;
  encryptedDek: Buffer;
  keyRef: string;
  expiresAt: Date;
}

export interface VerifiedWebhookInput {
  inboxId: string;
  pageId: string;
  eventKey: string;
  providerMessageId: string | null;
  conversationHash: string;
  providerOccurredAt: Date | null;
  receivedAt: Date;
  signatureKeyVersion: string;
  eventKind?: "CUSTOMER" | "APP_ECHO" | "PAGE_ECHO";
  payload: CipherBundle | null;
}

export interface InboxRecordResult {
  inboxId: string;
  inserted: boolean;
  status: string;
  receiveSequence: number;
}

export async function withTransaction<T>(pool: Pool, operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Call only after the raw request signature has been verified. */
export async function recordVerifiedWebhook(
  client: PoolClient,
  input: VerifiedWebhookInput,
): Promise<InboxRecordResult> {
  const inserted = await client.query<{
    inbox_id: string;
    status: string;
    receive_sequence: string;
  }>(
    `INSERT INTO webhook_inbox (
       inbox_id, page_id, event_key, provider_message_id, conversation_hash,
       provider_occurred_at, received_at, signature_key_version, event_kind, status,
       payload_ciphertext, payload_nonce, payload_auth_tag, payload_encrypted_dek,
       payload_key_ref, payload_expires_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'VERIFIED',$10,$11,$12,$13,$14,$15)
     ON CONFLICT (page_id, event_key) DO NOTHING
     RETURNING inbox_id, status, receive_sequence`,
    [
      input.inboxId,
      input.pageId,
      input.eventKey,
      input.providerMessageId,
      input.conversationHash,
      input.providerOccurredAt,
      input.receivedAt,
      input.signatureKeyVersion,
      input.eventKind ?? "CUSTOMER",
      input.payload?.ciphertext ?? null,
      input.payload?.nonce ?? null,
      input.payload?.authTag ?? null,
      input.payload?.encryptedDek ?? null,
      input.payload?.keyRef ?? null,
      input.payload?.expiresAt ?? null,
    ],
  );
  const row = inserted.rows[0];
  if (row) {
    return {
      inboxId: row.inbox_id,
      inserted: true,
      status: row.status,
      receiveSequence: Number(row.receive_sequence),
    };
  }

  const existing = await client.query<{
    inbox_id: string;
    status: string;
    receive_sequence: string;
  }>(
    `SELECT inbox_id, status, receive_sequence
     FROM webhook_inbox WHERE page_id = $1 AND event_key = $2`,
    [input.pageId, input.eventKey],
  );
  const found = existing.rows[0];
  if (!found) throw new Error("Inbox conflict row disappeared");
  return {
    inboxId: found.inbox_id,
    inserted: false,
    status: found.status,
    receiveSequence: Number(found.receive_sequence),
  };
}

export interface MetaOutboxInput {
  outboxId: string;
  idempotencyKey: string;
  replyPlanId: string;
  responseGroupId: string;
  conversationId: string;
  pageId: string;
  customerHash: string;
  sequenceNo: number;
  recipientCiphertext: Buffer;
  recipientNonce: Buffer;
  recipientAuthTag: Buffer;
  payload: CipherBundle;
}

export async function enqueueMetaOutbox(
  client: PoolClient,
  input: MetaOutboxInput,
): Promise<{ outboxId: string; inserted: boolean; status: string }> {
  const inserted = await client.query<{ outbox_id: string; status: string }>(
    `INSERT INTO meta_outbox (
       outbox_id, idempotency_key, reply_plan_id, response_group_id, conversation_id,
       page_id, customer_hash, recipient_ciphertext, recipient_nonce, recipient_auth_tag,
       payload_ciphertext, payload_nonce, payload_auth_tag, payload_encrypted_dek,
       payload_key_ref, payload_expires_at, sequence_no
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING outbox_id, status`,
    [
      input.outboxId,
      input.idempotencyKey,
      input.replyPlanId,
      input.responseGroupId,
      input.conversationId,
      input.pageId,
      input.customerHash,
      input.recipientCiphertext,
      input.recipientNonce,
      input.recipientAuthTag,
      input.payload.ciphertext,
      input.payload.nonce,
      input.payload.authTag,
      input.payload.encryptedDek,
      input.payload.keyRef,
      input.payload.expiresAt,
      input.sequenceNo,
    ],
  );
  const row = inserted.rows[0];
  if (row) return { outboxId: row.outbox_id, inserted: true, status: row.status };

  const existing = await client.query<{ outbox_id: string; status: string }>(
    "SELECT outbox_id, status FROM meta_outbox WHERE idempotency_key = $1",
    [input.idempotencyKey],
  );
  const found = existing.rows[0];
  if (!found) throw new Error("Outbox conflict row disappeared");
  return { outboxId: found.outbox_id, inserted: false, status: found.status };
}

export async function reserveMessageIdentity(
  client: PoolClient,
  input: {
    identityKey: string;
    pageId: string;
    providerMessageIdHash: string | null;
    outboxId: string | null;
    messagePk: string;
    occurredAt: Date;
  },
): Promise<boolean> {
  const result = await client.query(
    `INSERT INTO message_identities (
       identity_key, page_id, provider_message_id_hash, outbox_id, message_pk, occurred_at
     ) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT DO NOTHING`,
    [
      input.identityKey,
      input.pageId,
      input.providerMessageIdHash,
      input.outboxId,
      input.messagePk,
      input.occurredAt,
    ],
  );
  return result.rowCount === 1;
}
