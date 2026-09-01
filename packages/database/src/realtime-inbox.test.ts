import { describe, expect, it, vi } from "vitest";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";
import { PostgresRealtimeInboxStore } from "./realtime-inbox.js";

function input(eventKind: "CUSTOMER" | "APP_ECHO" | "PAGE_ECHO" = "CUSTOMER") {
  return {
    pageId: "page-1",
    metaAppId: "app-1",
    eventKey: `meta:page-1:${eventKind.toLowerCase()}:m-1`,
    providerMessageId: "m-1",
    conversationHash: "meta:v1:customer-hash",
    occurredAt: new Date("2026-07-22T10:00:00.000Z"),
    receivedAt: new Date("2026-07-22T10:00:00.100Z"),
    signatureKeyVersion: "meta-secret-v1",
    eventKind,
    envelope: { schemaVersion: 1, message: { eventKind } },
  } as const;
}

describe("PostgresRealtimeInboxStore debounce enqueue", () => {
  it("restores the speculative ingress-head attempt when admission holds every Inbox row", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("LEFT JOIN LATERAL")) return {
          rowCount: 1,
          rows: [{
            page_id: "page-1", conversation_hash: "meta:v1:customer-hash",
            generation: "42", last_customer_receive_sequence: "7",
            page_echo_receive_sequence: null, attempt_count: 3,
          }],
        };
        if (sql.includes("UPDATE webhook_inbox AS inbox")) return { rowCount: 0, rows: [] };
        return { rowCount: 1, rows: [] };
      },
      release: vi.fn(),
    };
    const store = new PostgresRealtimeInboxStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async query() { return { rowCount: 0, rows: [] }; },
      async connect() { return client; },
      async end() {},
    };

    await expect(store.claimNextBatch("worker-1", 30_000)).resolves.toBeNull();

    const cleanup = calls.find((call) =>
      call.sql.includes("attempt_count = $4") && call.sql.includes("lease_token = $3"),
    );
    expect(cleanup?.values[3]).toBe(3);
  });

  it("advances the customer generation and five-second quiet clock only after a new inbox row", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("INSERT INTO webhook_inbox")) {
          return {
            rowCount: 1,
            rows: [{ inbox_id: "inbox-1", status: "VERIFIED", receive_sequence: "42" }],
          };
        }
        return { rowCount: 1, rows: [] };
      },
      release: vi.fn(),
    };
    const store = new PostgresRealtimeInboxStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
      { customerDebounceMs: 5_000 },
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };

    const result = await store.enqueue(input());

    expect(result).toEqual({ inboxId: "inbox-1", inserted: true, status: "VERIFIED" });
    const head = calls.find((call) =>
      call.sql.includes("INSERT INTO conversation_ingress_heads"),
    );
    expect(head?.values).toEqual([
      "page-1",
      "meta:v1:customer-hash",
      42,
      "CUSTOMER",
      new Date("2026-07-22T10:00:00.100Z"),
      5_000,
    ]);
    expect(head?.sql).toContain("quiet_until");
    expect(head?.sql).toContain("attempt_count = 0");
    expect(head?.sql).toContain("THEN GREATEST(");
    expect(head?.sql).toContain("conversation_ingress_heads.generation + 1");
    expect(head?.sql).toContain("$3::bigint");
    expect(head?.sql).toContain("THEN $3::bigint ELSE NULL");
    expect(head?.sql).toContain(
      "last_customer_receive_sequence = CASE",
    );
    expect(head?.sql).not.toContain(
      "WHERE conversation_ingress_heads.generation < EXCLUDED.generation",
    );
    const notification = calls.find((call) => call.sql.includes("pg_notify"));
    expect(notification?.values).toEqual(["CUSTOMER"]);
    expect(notification?.sql).toContain("lana_realtime_inbox");
  });

  it("does not bump generation or reset quiet time for a duplicate webhook", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("INSERT INTO webhook_inbox")) {
          return { rowCount: 0, rows: [] };
        }
        if (sql.includes("SELECT inbox_id, status, receive_sequence")) {
          return {
            rowCount: 1,
            rows: [{ inbox_id: "inbox-existing", status: "VERIFIED", receive_sequence: "7" }],
          };
        }
        return { rowCount: 1, rows: [] };
      },
      release: vi.fn(),
    };
    const store = new PostgresRealtimeInboxStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };

    const result = await store.enqueue(input());

    expect(result.inserted).toBe(false);
    expect(calls.some((sql) => sql.includes("conversation_ingress_heads"))).toBe(false);
    expect(calls.some((sql) => sql.includes("pg_notify"))).toBe(false);
  });

  it("stores an app echo without touching the conversation debounce head", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("INSERT INTO webhook_inbox")) {
          return {
            rowCount: 1,
            rows: [{ inbox_id: "inbox-echo", status: "VERIFIED", receive_sequence: "8" }],
          };
        }
        return { rowCount: 1, rows: [] };
      },
      release: vi.fn(),
    };
    const store = new PostgresRealtimeInboxStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };

    await store.enqueue(input("APP_ECHO"));

    expect(calls.some((sql) => sql.includes("conversation_ingress_heads"))).toBe(false);
  });

  it("always advances activity for a unique page echo even if sequence commits out of order", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("INSERT INTO webhook_inbox")) {
          return {
            rowCount: 1,
            rows: [{ inbox_id: "inbox-page-echo", status: "VERIFIED", receive_sequence: "3" }],
          };
        }
        return { rowCount: 1, rows: [] };
      },
      release: vi.fn(),
    };
    const store = new PostgresRealtimeInboxStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };

    await store.enqueue(input("PAGE_ECHO"));

    const head = calls.find((call) =>
      call.sql.includes("INSERT INTO conversation_ingress_heads"),
    );
    expect(head?.values[3]).toBe("PAGE_ECHO");
    expect(head?.sql).toContain("conversation_ingress_heads.generation + 1");
    expect(head?.sql).not.toContain(
      "WHERE conversation_ingress_heads.generation < EXCLUDED.generation",
    );
    expect(head?.sql).toContain("attempt_count = 0");
  });

  it.each(["retry", "fail"] as const)(
    "releases a superseded batch instead of applying a stale %s outcome",
    async (operation) => {
      const calls: string[] = [];
      const client = {
        async query(sql: string) {
          calls.push(sql);
          if (sql.includes("SELECT generation")) {
            return { rowCount: 1, rows: [{ generation: "43" }] };
          }
          return { rowCount: 1, rows: [] };
        },
        release: vi.fn(),
      };
      const store = new PostgresRealtimeInboxStore(
        "postgresql://unused:unused@localhost:5432/unused",
        new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
      );
      (store as unknown as { pool: unknown }).pool = {
        async connect() { return client; },
        async end() {},
      };
      const batch = {
        pageId: "page-1",
        conversationHash: "meta:v1:customer-hash",
        generation: 42,
        leaseToken: "44444444-4444-4444-8444-444444444444",
        inboxIds: ["55555555-5555-4555-8555-555555555555"],
      } as const;

      const result = operation === "retry"
        ? await store.retryBatch(batch, "TEMPORARY_ERROR", 10)
        : await store.failBatchPermanent(batch, "PERMANENT_ERROR");

      expect(result).toBe(false);
      expect(calls.some((sql) => sql.includes("SET status = 'VERIFIED'"))).toBe(true);
      expect(calls.some((sql) => sql.includes("SET status = 'FAILED_RETRYABLE'"))).toBe(false);
      expect(calls.some((sql) => sql.includes("SET status = 'FAILED_PERMANENT'"))).toBe(false);
    },
  );

  it("retires the customer quiet clock and resets attempts after successful completion", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT generation")) {
          return { rowCount: 1, rows: [{ generation: "42" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release: vi.fn(),
    };
    const store = new PostgresRealtimeInboxStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };

    const completed = await store.completeBatch({
      pageId: "page-1",
      conversationHash: "meta:v1:customer-hash",
      generation: 42,
      leaseToken: "44444444-4444-4444-8444-444444444444",
      inboxIds: ["55555555-5555-4555-8555-555555555555"],
    });

    expect(completed).toBe(true);
    const headUpdate = calls.find((sql) =>
      sql.includes("UPDATE conversation_ingress_heads AS head"),
    );
    expect(headUpdate).toContain("attempt_count = CASE WHEN $4 THEN 0");
    expect(headUpdate).toContain("last_customer_receive_sequence = CASE");
    expect(headUpdate).toContain("quiet_until = CASE");
    expect(headUpdate).toContain("THEN NULL");
  });

  it("retires the clock after a current-generation permanent terminal failure", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT generation")) {
          return { rowCount: 1, rows: [{ generation: "42" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release: vi.fn(),
    };
    const store = new PostgresRealtimeInboxStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };

    const failed = await store.failBatchPermanent({
      pageId: "page-1",
      conversationHash: "meta:v1:customer-hash",
      generation: 42,
      leaseToken: "44444444-4444-4444-8444-444444444444",
      inboxIds: ["55555555-5555-4555-8555-555555555555"],
    }, "PERMANENT_ERROR");

    expect(failed).toBe(true);
    const retired = calls.find((call) =>
      call.sql.includes("UPDATE conversation_ingress_heads AS head"),
    );
    expect(retired?.values[3]).toBe(true);
    expect(retired?.sql).toContain("quiet_until = CASE");
  });
});
