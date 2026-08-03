import { describe, expect, it, vi } from "vitest";
import { PostgresDatasetPrelabelStore } from "./dataset-prelabel-store.js";

interface QueryCall { readonly sql: string; readonly values: readonly unknown[] }
type Handler = (sql: string, values: readonly unknown[]) => { rowCount: number; rows: unknown[] };

function storeWith(handler: Handler): { store: PostgresDatasetPrelabelStore; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const respond = (sql: string, values: readonly unknown[] = []) => {
    calls.push({ sql, values });
    return handler(sql, values);
  };
  const client = { query: async (sql: string, values?: readonly unknown[]) => respond(sql, values), release: vi.fn() };
  const store = new PostgresDatasetPrelabelStore("postgresql://unused:unused@localhost:5432/unused");
  (store as unknown as { pool: unknown }).pool = {
    async connect() { return client; },
    async query(sql: string, values?: readonly unknown[]) { return respond(sql, values); },
    async end() {},
  };
  return { store, calls };
}

describe("createRun", () => {
  it("stores model, model version, prompt version and schema version", async () => {
    const { store, calls } = storeWith(() => ({ rowCount: 1, rows: [] }));
    const runId = await store.createRun({
      projectId: "p-1",
      source: "AI",
      model: "gemini-test",
      modelVersion: "gemini-test-001",
      promptVersion: "prelabel-v1",
      schemaVersion: "wave1-conversation-recovery-v1",
      totalItems: 10,
      createdBySubject: "u1",
    });
    expect(runId).toMatch(/[0-9a-f-]{36}/u);
    const insert = calls.find((c) => c.sql.includes("INSERT INTO dataset_prelabel_runs"));
    expect(insert?.values).toContain("gemini-test");
    expect(insert?.values).toContain("prelabel-v1");
    expect(insert?.values).toContain("wave1-conversation-recovery-v1");
  });
});

describe("reserveRunItem", () => {
  it("reserves when the insert wins", async () => {
    const { store } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_prelabel_run_items")
        ? { rowCount: 1, rows: [{ prelabel_run_item_id: "ri-1" }] }
        : { rowCount: 0, rows: [] },
    );
    expect(await store.reserveRunItem({ runId: "r", projectItemId: "pi", inputChecksum: "c".repeat(64) })).toBe("RESERVED");
  });

  it("reports ALREADY_DONE for a succeeded item under the same checksum", async () => {
    const { store } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_prelabel_run_items")
        ? { rowCount: 0, rows: [] }
        : sql.includes("SELECT status FROM dataset_prelabel_run_items")
          ? { rowCount: 1, rows: [{ status: "SUCCEEDED" }] }
          : { rowCount: 0, rows: [] },
    );
    expect(await store.reserveRunItem({ runId: "r", projectItemId: "pi", inputChecksum: "c".repeat(64) })).toBe("ALREADY_DONE");
  });

  it("re-reserves a previously FAILED item", async () => {
    const { store } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_prelabel_run_items")
        ? { rowCount: 0, rows: [] }
        : sql.includes("SELECT status FROM dataset_prelabel_run_items")
          ? { rowCount: 1, rows: [{ status: "FAILED" }] }
          : { rowCount: 0, rows: [] },
    );
    expect(await store.reserveRunItem({ runId: "r", projectItemId: "pi", inputChecksum: "c".repeat(64) })).toBe("RESERVED");
  });
});

describe("persistProposals", () => {
  it("writes PROPOSED AI annotations and no review-event audit", async () => {
    const { store, calls } = storeWith(() => ({ rowCount: 1, rows: [] }));
    await store.persistProposals({
      runId: "run-1",
      projectItemId: "pi-1",
      modelVersion: "gemini-test-001",
      proposals: [
        {
          labelCode: "BUYING_COMMITTED",
          scope: "CUSTOMER_MESSAGE",
          turnIndex: 0,
          secondTurnIndex: null,
          evidenceText: "mẫu này",
          evidenceStart: 8,
          evidenceEnd: 15,
          confidence: "HIGH",
        },
      ],
      validationErrors: [],
    });
    const insert = calls.find((c) => c.sql.includes("INSERT INTO dataset_annotations"));
    expect(insert?.sql).toContain("'AI'");
    expect(insert?.sql).toContain("'PROPOSED'");
    expect(calls.some((c) => c.sql.includes("dataset_review_events"))).toBe(false);
  });

  it("routes the item to review when there are validation errors", async () => {
    const { store, calls } = storeWith(() => ({ rowCount: 1, rows: [] }));
    await store.persistProposals({
      runId: "run-1",
      projectItemId: "pi-1",
      modelVersion: "gemini-test-001",
      proposals: [],
      validationErrors: [{ error: "EVIDENCE_NOT_FOUND" }],
    });
    const update = calls.find((c) => c.sql.includes("UPDATE dataset_project_items"));
    expect(update?.sql).toContain("PRELABEL_VALIDATION_ERROR");
  });
});

describe("loadItemMessages", () => {
  it("maps redacted rows and returns null when empty", async () => {
    const { store } = storeWith((sql) =>
      sql.includes("FROM dataset_messages")
        ? { rowCount: 1, rows: [{ turn_index: 0, role: "CUSTOMER", message_id: "m0", redacted_text: "[PHONE_1]" }] }
        : { rowCount: 0, rows: [] },
    );
    const messages = await store.loadItemMessages("pi-1");
    expect(messages?.[0]).toEqual({ turnIndex: 0, role: "CUSTOMER", messageId: "m0", redactedText: "[PHONE_1]" });

    const { store: empty } = storeWith(() => ({ rowCount: 0, rows: [] }));
    expect(await empty.loadItemMessages("pi-x")).toBeNull();
  });
});
