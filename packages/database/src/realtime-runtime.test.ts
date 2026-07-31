import { describe, expect, it, vi } from "vitest";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";
import { PostgresRealtimeRuntimeStore } from "./realtime-runtime.js";

describe("PostgresRealtimeRuntimeStore handoff commit", () => {
  it("persists idempotent PII-free decision events in the state transaction", async () => {
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
        if (sql.includes("INSERT INTO conversation_events")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
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
    const occurredAt = new Date("2026-07-23T05:00:00.000Z");

    const result = await store.commit({
      pageId: "page-1",
      customerHash: "a".repeat(64),
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: { revision: 1, routingOwner: "APP", conversationOwner: "BOT" },
      decisionEvents: [{
        eventId: "10000000-0000-4000-8000-000000000003",
        eventKeyHash: "b".repeat(64),
        eventType: "BUYING_SIGNAL_DETECTED",
        origin: "EXACT_CODE",
        reasonCodes: ["DIRECT_PURCHASE_VERB"],
        releaseId: "wave0-local",
        promptVersion: "prompt-v1",
        modelVersion: "gemini-test",
        policyVersion: null,
        catalogVersion: "catalog-v2",
        mode: "LIVE",
        productId: "CB182",
        intent: "buy",
        stage: "consulting",
        action: "REPLY",
        occurredAt,
        details: {
          productResolutionOrigin: "EXACT_CODE",
          buyingSignalReasons: ["DIRECT_PURCHASE_VERB"],
          guardReasonCodes: [],
          factsStatus: "OK",
          factsReasonCode: null,
          salesCycleStageBefore: "DISCOVERY",
          salesCycleStageAfter: "CART_OPEN",
          outboundMessageCount: 1,
          modelCalled: false,
          modelLatencyMs: null,
          modelTokenUsage: { prompt: null, output: null, total: null },
          buyingSignalOverride: false,
        },
      }],
    }, occurredAt);

    expect(result.decisionEventsCreated).toBe(1);
    const insert = calls.find((call) => call.sql.includes("INSERT INTO conversation_events"));
    expect(insert?.sql).toContain("ON CONFLICT (event_id, occurred_at) DO NOTHING");
    const serialized = JSON.stringify(insert?.values ?? []);
    expect(serialized).not.toContain("0900000000");
    expect(serialized).not.toContain("rawText");
    expect(calls.at(-1)?.sql).toContain("COMMIT");
  });

  it("schedules text immediately and delays image rows in the same ordered plan", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return {
            rowCount: 1,
            rows: [{
              routing_owner: "APP",
              app_send_enabled: true,
              kill_switch: false,
            }],
          };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("UPDATE conversations")) {
          return { rowCount: 1, rows: [] };
        }
        if (sql.includes("INSERT INTO meta_outbox")) {
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
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
    const now = new Date("2026-07-23T05:00:00.000Z");
    const result = await store.commit({
      pageId: "page-1",
      customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: { revision: 1, routingOwner: "APP", conversationOwner: "BOT" },
      metaPlan: {
        replyPlanId: "10000000-0000-4000-8000-000000000001",
        responseGroupId: "10000000-0000-4000-8000-000000000002",
        recipientId: "customer-1",
        imageDelayMs: 500,
        messages: [
          { kind: "TEXT", text: "Nội dung báo giá" },
          { kind: "IMAGE", imageUrl: "https://cdn.example/product.jpg" },
        ],
      },
    }, now);

    expect(result.metaOutboxCreated).toBe(2);
    const inserts = calls.filter((call) => call.sql.includes("INSERT INTO meta_outbox"));
    expect(inserts).toHaveLength(2);
    expect(inserts[0]?.values[17]).toBe(0);
    expect(inserts[0]?.values[18]).toEqual(now);
    expect(inserts[1]?.values[17]).toBe(1);
    expect(inserts[1]?.values[18]).toEqual(
      new Date("2026-07-23T05:00:00.500Z"),
    );
  });

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
    const handoffCaseInsert = calls.find((call) => call.sql.includes("INSERT INTO handoff_cases"));
    expect(handoffCaseInsert?.sql).toContain("sla_due_at");
    expect(handoffCaseInsert?.sql).toContain("interval '30 minutes'");
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

  it("commits encrypted sales-cycle state and its PII-free ledger in the conversation transaction", async () => {
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
        if (sql.includes("SELECT state_revision")) {
          return { rowCount: 1, rows: [{ state_revision: "0" }] };
        }
        if (sql.includes("UPDATE sales_cycle_states")) return { rowCount: 1, rows: [] };
        if (sql.includes("INSERT INTO sales_cycle_events")) return { rowCount: 1, rows: [] };
        if (sql.includes("UPDATE conversations")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-07-23T03:00:00.000Z");
    const expiresAt = new Date("2026-07-25T03:00:00.000Z");

    await store.commit({
      pageId: "page-1",
      customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 4,
      state: { revision: 5, routingOwner: "APP", conversationOwner: "BOT" },
      salesCyclePlan: {
        expectedRevision: 0,
        state: {
          revision: 2,
          stage: "CART_OPEN",
          checkoutDraft: {
            fullName: "Nguyen Van A",
            phone: "0984997797",
            address: "Tan Chau, Tay Ninh",
          },
        },
        cartExpiresAt: expiresAt,
        expiresAt,
        events: [{
          commandId: "sales:event-1:cart-open",
          commandKind: "CART_OPENED",
          outcome: "APPLIED",
          stateRevisionBefore: 0,
          stateRevisionAfter: 2,
          stageBefore: "DISCOVERY",
          stageAfter: "CART_OPEN",
          cartId: "10000000-0000-4000-8000-000000000001",
          cartVersion: 1,
          reasonCode: null,
          occurredAt: now,
        }],
      },
    }, now);

    const salesUpdate = calls.find((call) => call.sql.includes("UPDATE sales_cycle_states"));
    expect(Buffer.isBuffer(salesUpdate?.values[3])).toBe(true);
    expect(String(salesUpdate?.values[3])).not.toContain("0984997797");
    const ledgerInsert = calls.find((call) => call.sql.includes("INSERT INTO sales_cycle_events"));
    expect(ledgerInsert?.values.join("|")).not.toContain("0984997797");
    expect(calls.findIndex((call) => call.sql.includes("UPDATE sales_cycle_states")))
      .toBeLessThan(calls.findIndex((call) => call.sql.includes("UPDATE conversations")));
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");
  });
  it("records a terminal initial-reply failure in the same transaction", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("UPDATE meta_outbox")) {
          return {
            rowCount: 1,
            rows: [{
              reply_plan_id: "10000000-0000-4000-8000-000000000001",
              sequence_no: 0,
              updated_at: new Date("2026-07-29T10:00:10.000Z"),
            }],
          };
        }
        if (sql.includes("UPDATE acquisition_sessions") && sql.includes("initial_reply_terminal_status")) {
          return {
            rowCount: 1,
            rows: [{
              acquisition_session_id: "10000000-0000-4000-8000-000000000002",
              page_id: "page-1",
              conversation_id: "10000000-0000-4000-8000-000000000003",
              customer_hash: "a".repeat(64),
              entry_message_pk: "10000000-0000-4000-8000-000000000004",
              entry_message_occurred_at: new Date("2026-07-29T10:00:00.000Z"),
              initial_reply_plan_id: "10000000-0000-4000-8000-000000000001",
              initial_reply_accepted_at: null,
              max_stage_reached: "UNQUALIFIED_ENTRY",
              current_disposition: "ACTIVE",
              derivation_version: "ad-acquisition-v1",
            }],
          };
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
    };

    const changed = await store.markMetaTerminal(
      "10000000-0000-4000-8000-000000000005",
      "10000000-0000-4000-8000-000000000006",
      "FAILED_PERMANENT",
      "META_REJECTED",
    );

    expect(changed).toBe(true);
    expect(calls[0]?.sql.trim()).toBe("BEGIN");
    expect(calls.some((call) => call.sql.includes("BOT_INITIAL_AD_REPLY_SEND_FAILED"))).toBe(false);
    const event = calls.find((call) => call.sql.includes("INSERT INTO conversation_events"));
    expect(event?.values).toContain("BOT_INITIAL_AD_REPLY_SEND_FAILED");
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");
  });
});
