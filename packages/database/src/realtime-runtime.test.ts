import { describe, expect, it, vi } from "vitest";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";
import { PostgresRealtimeRuntimeStore } from "./realtime-runtime.js";

describe("PostgresRealtimeRuntimeStore handoff commit", () => {
  it("drops a stale decision before state or outbox commit when a newer inbound advanced the generation", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return {
            rowCount: 1,
            rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false }],
          };
        }
        if (sql.includes("SELECT generation")) {
          return { rowCount: 1, rows: [{ generation: "101" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };

    const result = await store.commit({
      pageId: "page-1",
      customerHash: "customer-hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 2,
      state: { revision: 3, routingOwner: "APP", conversationOwner: "BOT" },
      inboxBatchGuard: {
        generation: 100,
        leaseToken: "44444444-4444-4444-8444-444444444444",
        inboxIds: ["55555555-5555-4555-8555-555555555555"],
      },
    });

    expect(result.stateCommitted).toBe(false);
    expect(result.inboxBatchStatus).toBe("SUPERSEDED");
    expect(result.reasonCodes).toContain("INBOX_BATCH_SUPERSEDED");
    expect(calls.findIndex((sql) => sql.includes("SELECT routing_owner")))
      .toBeLessThan(calls.findIndex((sql) => sql.includes("SELECT generation")));
    expect(calls.some((sql) => sql.includes("INSERT INTO meta_outbox"))).toBe(false);
    expect(calls.some((sql) => sql.includes("attempt_count = GREATEST"))).toBe(true);
  });

  it("commits the owner CAS, Pancake outbox, immutable event and queue case atomically", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("UPDATE conversations")) return { rowCount: 1, rows: [] };
        if (sql.includes("FROM provider_conversation_links")) {
          return {
            rowCount: 1,
            rows: [{
              external_id_ciphertext: Buffer.from("a"),
              external_id_nonce: Buffer.alloc(12),
              external_id_auth_tag: Buffer.alloc(16),
            }],
          };
        }
        if (sql.includes("INSERT INTO pancake_tag_outbox")) return { rowCount: 1, rows: [] };
        if (sql.includes("INSERT INTO handoff_events")) {
          return { rowCount: 1, rows: [{ handoff_id: "44444444-4444-4444-8444-444444444444" }] };
        }
        if (sql.includes("INSERT INTO handoff_cases")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release: vi.fn(),
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const now = new Date("2026-07-20T10:00:00.000Z");
    const result = await store.commit({
      pageId: "page-1",
      customerHash: "customer-hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: {
        revision: 2,
        routingOwner: "APP",
        conversationOwner: "HUMAN",
        ownerLeaseUntil: "2026-07-20T10:15:00.000Z",
        blockingTag: null,
        blockingTagVerifiedAt: null,
      },
      pancakeTagPlan: {
        desiredTag: "NHAN_VIEN",
        tagId: "tag-employee",
        handoffGeneration: 2,
      },
      handoffEventPlan: {
        source: "BOT_POLICY",
        reasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
        reasonDetailSafe: { directive_reason: "AGENT_REQUEST" },
        productId: "CB182",
        factsStatus: "NOT_FOUND",
        factsReasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
        desiredTag: "NHAN_VIEN",
        handoffGeneration: 2,
        triggerEventKey: "meta:page-1:message:m-1",
        triggerMessagePk: "55555555-5555-4555-8555-555555555555",
        occurredAt: now,
      },
    }, now);

    expect(result.handoffEventCreated).toBe(true);
    expect(result.pancakeTagOutboxCreated).toBe(true);
    const statements = calls.map((call) => call.sql.trim().split(/\s+/u).slice(0, 4).join(" "));
    expect(statements[0]).toBe("BEGIN");
    expect(calls.findIndex((call) => call.sql.includes("UPDATE conversations")))
      .toBeLessThan(calls.findIndex((call) => call.sql.includes("INSERT INTO pancake_tag_outbox")));
    expect(calls.findIndex((call) => call.sql.includes("INSERT INTO pancake_tag_outbox")))
      .toBeLessThan(calls.findIndex((call) => call.sql.includes("INSERT INTO handoff_events")));
    expect(calls.findIndex((call) => call.sql.includes("INSERT INTO handoff_events")))
      .toBeLessThan(calls.findIndex((call) => call.sql.includes("INSERT INTO handoff_cases")));
    expect(statements.at(-1)).toBe("COMMIT");
  });

  it("uses a deterministic conflict target and does not create a second queue case", async () => {
    const sql: string[] = [];
    const client = {
      async query(statement: string) {
        sql.push(statement);
        if (statement.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false }] };
        }
        if (statement.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (statement.includes("UPDATE conversations")) return { rowCount: 1, rows: [] };
        if (statement.includes("INSERT INTO handoff_events")) return { rowCount: 0, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-07-20T10:00:00.000Z");
    const result = await store.commit({
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: { revision: 1, routingOwner: "APP", conversationOwner: "HUMAN" },
      handoffEventPlan: {
        source: "CUSTOMER_REQUEST", reasonCode: "CUSTOMER_REQUESTED_HUMAN",
        productId: null, factsStatus: null, factsReasonCode: null,
        desiredTag: "NHAN_VIEN", handoffGeneration: 1,
        triggerEventKey: "meta:event:1", triggerMessagePk: null, occurredAt: now,
      },
    }, now);
    expect(result.handoffEventCreated).toBe(false);
    expect(sql.some((statement) => statement.includes("conversation_id, direction, trigger_event_key_hash"))).toBe(true);
    expect(sql.some((statement) => statement.includes("INSERT INTO handoff_cases"))).toBe(false);
  });

  it("acknowledges an active queue case for a real HUMAN echo without creating another transfer", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "HUMAN" }] };
        }
        if (sql.includes("UPDATE conversations")) return { rowCount: 1, rows: [] };
        if (sql.includes("UPDATE handoff_cases")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const occurredAt = new Date("2026-07-20T10:05:00.000Z");
    await store.commit({
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 3,
      state: { revision: 4, routingOwner: "APP", conversationOwner: "HUMAN" },
      handoffAcknowledgementPlan: { actorRef: "page-agent", occurredAt },
    }, occurredAt);
    const acknowledgement = calls.find((call) => call.sql.includes("UPDATE handoff_cases"));
    expect(acknowledgement?.sql).toContain("status = 'IN_PROGRESS'");
    expect(acknowledgement?.values[2]).toMatch(/^[0-9a-f]{64}$/u);
    expect(calls.some((call) => call.sql.includes("INSERT INTO handoff_events"))).toBe(false);
  });
});
