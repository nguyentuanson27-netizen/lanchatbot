import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { PostgresChatHistoryStore } from "./chat-history.js";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";
import { migrateUp } from "./migrate.js";

const baseUrl = process.env.CHAT_HISTORY_TEST_DATABASE_URL
  ?? process.env.GATE_E_STORE_TEST_DATABASE_URL;
const postgresDescribe = baseUrl ? describe.sequential : describe.skip;

postgresDescribe("accepted Outbox history recovery on isolated PostgreSQL", () => {
  const databaseName = `c3_history_${randomBytes(6).toString("hex")}`;
  const pageId = "c3-history-test-page";
  const customerHash = "c3-history-test-customer";
  const conversationId = randomUUID();
  const acceptedOutboxId = randomUUID();
  const pendingOutboxId = randomUUID();
  const ambiguousOutboxId = randomUUID();
  const replyText = "Em đã báo giá 799.000đ.";
  const cipher = new LocalEnvelopeCipher("00".repeat(32), "test-key-v1");
  let admin: Pool;
  let pool: Pool;
  let history: PostgresChatHistoryStore;

  beforeAll(async () => {
    const adminUrl = new URL(baseUrl!);
    adminUrl.pathname = "/postgres";
    admin = new Pool({ connectionString: adminUrl.toString(), max: 1 });
    await admin.query(`CREATE DATABASE ${databaseName}`);
    const testUrl = new URL(baseUrl!);
    testUrl.pathname = `/${databaseName}`;
    const databaseUrl = testUrl.toString();
    pool = new Pool({ connectionString: databaseUrl, max: 2 });
    await migrateUp(pool);
    history = new PostgresChatHistoryStore(databaseUrl, {
      analyticsHashSalt: "a".repeat(32),
      outboxCipher: cipher,
    });
    await pool.query(
      "INSERT INTO pages (page_id, page_alias, meta_app_id) VALUES ($1,$2,$3)",
      [pageId, pageId, "test-app"],
    );
    await pool.query(
      "INSERT INTO conversations (conversation_id, page_id, customer_hash, hash_key_version) VALUES ($1,$2,$3,$4)",
      [conversationId, pageId, customerHash, "test-v1"],
    );
    for (const [outboxId, status] of [
      [acceptedOutboxId, "SENT_ACCEPTED"],
      [pendingOutboxId, "PENDING"],
      [ambiguousOutboxId, "AMBIGUOUS"],
    ] as const) {
      const payload = cipher.encryptJson(
        { kind: "TEXT", text: replyText },
        `lana:meta-payload:v2:${pageId}:${outboxId}`,
        new Date(Date.now() + 60_000),
      );
      await pool.query(
        `INSERT INTO meta_outbox (
           outbox_id, idempotency_key, reply_plan_id, response_group_id,
           conversation_id, page_id, customer_hash, sequence_no, status,
           meta_message_id, accepted_at, payload_ciphertext, payload_nonce,
           payload_auth_tag, payload_encrypted_dek, payload_key_ref, payload_expires_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          outboxId, `history-test:${outboxId}`, randomUUID(), randomUUID(),
          conversationId, pageId, customerHash, status,
          status === "SENT_ACCEPTED" ? `meta:${outboxId}` : null,
          status === "SENT_ACCEPTED" ? new Date() : null,
          payload.ciphertext, payload.nonce, payload.authTag,
          payload.encryptedDek, payload.keyRef, payload.expiresAt,
        ],
      );
    }
  }, 120_000);

  afterAll(async () => {
    await history?.close();
    await pool?.end();
    if (admin) {
      try {
        await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
      } finally {
        await admin.end();
      }
    }
  });

  it("rolls back a failed history write, then converges once without touching delivery", async () => {
    await pool.query(`CREATE FUNCTION c3_reject_history() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected history write failure'; END $$`);
    await pool.query(`CREATE TRIGGER c3_reject_history BEFORE INSERT ON messages
      FOR EACH ROW EXECUTE FUNCTION c3_reject_history()`);

    await expect(history.recoverAcceptedOutboundBotMessages(conversationId))
      .rejects.toThrow("injected history write failure");
    const afterFailure = await pool.query<{ identities: number; messages: number }>(
      `SELECT
         (SELECT count(*)::integer FROM message_identities) AS identities,
         (SELECT count(*)::integer FROM messages) AS messages`,
    );
    expect(afterFailure.rows[0]).toEqual({ identities: 0, messages: 0 });

    await pool.query("DROP TRIGGER c3_reject_history ON messages");
    await pool.query("DROP FUNCTION c3_reject_history()");
    expect(await history.recoverAcceptedOutboundBotMessages(conversationId)).toBe(1);
    expect(await history.recoverAcceptedOutboundBotMessages(conversationId)).toBe(0);

    const modelHistory = await history.listConversationHistory(conversationId);
    expect(modelHistory).toHaveLength(1);
    expect(modelHistory[0]).toMatchObject({
      direction: "OUTBOUND",
      senderType: "BOT",
      text: replyText,
    });
    const readback = await pool.query<{
      outbox_id: string; status: string; attempt_count: number; identities: string;
    }>(
      `SELECT outbox.outbox_id, outbox.status, outbox.attempt_count,
              count(identity.identity_key)::text AS identities
       FROM meta_outbox AS outbox
       LEFT JOIN message_identities AS identity ON identity.outbox_id = outbox.outbox_id
       WHERE outbox.conversation_id = $1
       GROUP BY outbox.outbox_id
       ORDER BY outbox.status`,
      [conversationId],
    );
    expect(readback.rows).toHaveLength(3);
    expect(readback.rows.find((row) => row.outbox_id === acceptedOutboxId))
      .toMatchObject({ status: "SENT_ACCEPTED", attempt_count: 0, identities: "1" });
    expect(readback.rows.find((row) => row.outbox_id === pendingOutboxId))
      .toMatchObject({ status: "PENDING", attempt_count: 0, identities: "0" });
    expect(readback.rows.find((row) => row.outbox_id === ambiguousOutboxId))
      .toMatchObject({ status: "AMBIGUOUS", attempt_count: 0, identities: "0" });
  }, 120_000);
});
