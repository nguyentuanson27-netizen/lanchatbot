import { describe, expect, it, vi } from "vitest";
import {
  type InboundCustomerMessageInput,
  PostgresChatHistoryStore,
} from "./chat-history.js";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";

const input: InboundCustomerMessageInput = {
  pageId: "page-1",
  conversationId: "6ab68279-bb34-40b6-a19a-243672545888",
  customerHash: "customer-hash",
  providerMessageId: "message-1",
  text: "Chị muốn xem mẫu này",
  attachmentCount: 0,
  occurredAt: new Date("2026-07-28T01:00:00.000Z"),
  receivedAt: new Date("2026-07-28T01:00:00.100Z"),
  enqueueShadowEvaluation: true,
};

function storeWithClient(
  options: {
    failShadowInsert?: boolean;
    duplicateIdentity?: boolean;
    shadowAlreadyExists?: boolean;
  } = {},
) {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
  const client = {
    async query(sql: string, values: readonly unknown[] = []) {
      calls.push({ sql, values });
      if (sql.includes("SELECT 1 FROM conversations")) {
        return { rowCount: 1, rows: [{ ok: 1 }] };
      }
      if (sql.includes("INSERT INTO message_identities")) {
        if (options.duplicateIdentity) return { rowCount: 0, rows: [] };
        return {
          rowCount: 1,
          rows: [{
            identity_key: "history:inbound:v1:page-1:hash",
            message_pk: "7984b6ce-7a91-470e-a51f-29915d6082e9",
            occurred_at: input.occurredAt,
          }],
        };
      }
      if (sql.includes("FROM message_identities")) {
        return {
          rowCount: 1,
          rows: [{
            identity_key: "history:inbound:v1:page-1:hash",
            message_pk: "7984b6ce-7a91-470e-a51f-29915d6082e9",
            occurred_at: input.occurredAt,
          }],
        };
      }
      if (sql.includes("INSERT INTO shadow_evaluations")) {
        if (options.failShadowInsert) {
          throw new Error("permission denied for table shadow_evaluations");
        }
        if (options.shadowAlreadyExists) return { rowCount: 0, rows: [] };
        return {
          rowCount: 1,
          rows: [{ evaluation_id: "66770bee-b524-48cc-90df-2c2eabfa8f45" }],
        };
      }
      return { rowCount: 0, rows: [] };
    },
    release: vi.fn(),
  };
  const store = new PostgresChatHistoryStore(
    "postgresql://unused:unused@localhost:5432/unused",
    { analyticsHashSalt: "a".repeat(32) },
  );
  (store as unknown as { pool: unknown }).pool = {
    async connect() {
      return client;
    },
    async end() {},
  };
  return { store, calls };
}

describe("PostgresChatHistoryStore shadow evaluation capture", () => {
  it("enqueues a PII-redacted inbound source in the canonical message transaction", async () => {
    const { store, calls } = storeWithClient();

    const result = await store.recordInboundCustomerMessage(input);

    expect(result.shadowEvaluationEnqueued).toBe(true);
    expect(calls.some(({ sql }) => sql.includes("INSERT INTO messages"))).toBe(true);
    const shadow = calls.find(({ sql }) =>
      sql.includes("INSERT INTO shadow_evaluations")
    );
    expect(shadow?.sql).toContain("ON CONFLICT (source_identity_key) DO NOTHING");
    expect(calls.map(({ sql }) => sql.trim())).toContain(
      "SAVEPOINT chat_history_shadow_evaluation",
    );
    expect(calls.at(-1)?.sql).toBe("COMMIT");
  });

  it("repairs capture on an idempotent message retry without duplicating history", async () => {
    const { store, calls } = storeWithClient({
      duplicateIdentity: true,
      shadowAlreadyExists: true,
    });

    const result = await store.recordInboundCustomerMessage(input);

    expect(result).toMatchObject({
      inserted: false,
      shadowEvaluationEnqueued: true,
    });
    expect(
      calls.some(({ sql }) => sql.includes("INSERT INTO messages")),
    ).toBe(false);
    expect(
      calls.some(({ sql }) => sql.includes("INSERT INTO shadow_evaluations")),
    ).toBe(true);
    expect(calls.at(-1)?.sql).toBe("COMMIT");
  });

  it("keeps the customer-path transaction committable when optional capture fails", async () => {
    const { store, calls } = storeWithClient({ failShadowInsert: true });

    const result = await store.recordInboundCustomerMessage(input);

    expect(result.shadowEvaluationEnqueued).toBe(false);
    expect(calls.map(({ sql }) => sql.trim())).toContain(
      "ROLLBACK TO SAVEPOINT chat_history_shadow_evaluation",
    );
    expect(calls.at(-1)?.sql).toBe("COMMIT");
  });

  it("does not touch the shadow queue unless the caller explicitly requests it", async () => {
    const { store, calls } = storeWithClient();

    const result = await store.recordInboundCustomerMessage({
      ...input,
      enqueueShadowEvaluation: false,
    });

    expect(result.shadowEvaluationEnqueued).toBeUndefined();
    expect(
      calls.some(({ sql }) => sql.includes("INSERT INTO shadow_evaluations")),
    ).toBe(false);
  });
});

describe("accepted Outbox history recovery", () => {
  it("decrypts only accepted payloads and reuses the canonical outbox identity", async () => {
    const cipher = new LocalEnvelopeCipher("00".repeat(32), "test-key-v1");
    const outboxId = "8ba8a4ee-bc9f-4210-96c9-0d3213def222";
    const pageId = "page-1";
    const payload = cipher.encryptJson({ kind: "TEXT", text: "Em đã báo giá 799.000đ." },
      `lana:meta-payload:v2:${pageId}:${outboxId}`,
      new Date("2026-08-20T00:00:00.000Z"));
    const queries: string[] = [];
    const store = new PostgresChatHistoryStore(
      "postgresql://unused:unused@localhost:5432/unused",
      { analyticsHashSalt: "a".repeat(32), outboxCipher: cipher },
    );
    (store as unknown as { pool: unknown }).pool = { async query(sql: string) {
      queries.push(sql);
      return { rows: [{ outbox_id: outboxId, page_id: pageId,
        payload_ciphertext: payload.ciphertext,
        payload_nonce: payload.nonce, payload_auth_tag: payload.authTag,
        payload_encrypted_dek: payload.encryptedDek,
        payload_key_ref: payload.keyRef, payload_expires_at: payload.expiresAt }] };
    } };
    const record = vi.spyOn(store, "recordAcceptedOutboundBotMessage")
      .mockResolvedValueOnce({ inserted: true, identityKey: `history:outbound:v1:${outboxId}`,
        messagePk: outboxId, occurredAt: new Date("2026-08-13T00:00:00.000Z") })
      .mockResolvedValueOnce({ inserted: false, identityKey: `history:outbound:v1:${outboxId}`,
        messagePk: outboxId, occurredAt: new Date("2026-08-13T00:00:00.000Z") });
    expect(await store.recoverAcceptedOutboundBotMessages(input.conversationId)).toBe(1);
    expect(await store.recoverAcceptedOutboundBotMessages(input.conversationId)).toBe(0);
    expect(record).toHaveBeenCalledWith({ outboxId,
      text: "Em đã báo giá 799.000đ.", attachmentCount: 0 });
    expect(queries[0]).toContain("status IN ('SENT_ACCEPTED', 'DELIVERED', 'READ')");
    expect(queries[0]).toContain("NOT EXISTS");
  });
});
