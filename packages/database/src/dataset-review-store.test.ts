import { describe, expect, it, vi } from "vitest";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";
import { PostgresDatasetReviewStore } from "./dataset-review-store.js";

interface QueryCall {
  readonly sql: string;
  readonly values: readonly unknown[];
}

function cipher(): LocalEnvelopeCipher {
  return new LocalEnvelopeCipher("00".repeat(32), "dataset-key-v1");
}

// Build a store whose pool is a scripted fake. `handler` returns rows per SQL.
function storeWith(
  handler: (sql: string, values: readonly unknown[]) => { rowCount: number; rows: unknown[] },
): { store: PostgresDatasetReviewStore; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const client = {
    async query(sql: string, values: readonly unknown[] = []) {
      calls.push({ sql, values });
      return handler(sql, values);
    },
    release: vi.fn(),
  };
  const store = new PostgresDatasetReviewStore(
    "postgresql://unused:unused@localhost:5432/unused",
    cipher(),
  );
  (store as unknown as { pool: unknown }).pool = {
    async connect() { return client; },
    async query(sql: string, values: readonly unknown[] = []) {
      calls.push({ sql, values });
      return handler(sql, values);
    },
    async end() {},
  };
  return { store, calls };
}

describe("createDataset", () => {
  it("returns created=true when the insert wins", async () => {
    const { store } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_review_datasets")
        ? { rowCount: 1, rows: [{ dataset_id: "ds-1" }] }
        : { rowCount: 0, rows: [] },
    );
    const result = await store.createDataset({
      name: "Curated 2000",
      sourceType: "REDIS_TRANSCRIPT_JSON",
      sourceChecksum: "a".repeat(64),
      createdBySubject: "user-1",
    });
    expect(result).toEqual({ datasetId: "ds-1", created: true });
  });

  it("returns the existing dataset (created=false) on checksum conflict", async () => {
    const { store } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_review_datasets")
        ? { rowCount: 0, rows: [] }
        : sql.includes("SELECT dataset_id FROM dataset_review_datasets")
          ? { rowCount: 1, rows: [{ dataset_id: "ds-existing" }] }
          : { rowCount: 0, rows: [] },
    );
    const result = await store.createDataset({
      name: "Curated 2000",
      sourceType: "REDIS_TRANSCRIPT_JSON",
      sourceChecksum: "b".repeat(64),
      createdBySubject: "user-1",
    });
    expect(result).toEqual({ datasetId: "ds-existing", created: false });
  });
});

describe("importRecords", () => {
  it("persists a conversation with encrypted raw and redacted projection", async () => {
    const { store, calls } = storeWith((sql) => {
      if (sql.includes("INSERT INTO dataset_raw_items")) {
        return { rowCount: 1, rows: [{ raw_item_id: "raw-1" }] };
      }
      return { rowCount: 1, rows: [] };
    });

    const result = await store.importRecords("ds-1", [
      {
        sourceKey: "history_1",
        sourceTtl: 759227,
        value: "[Khách hàng]: sđt 0912345678\n[Nhân viên Shop]: dạ 629k ạ",
        rawPayload: { key: "history_1", value: "..." },
      },
    ]);

    expect(result.outcomes[0]?.status).toBe("IMPORTED");
    expect(result.report.succeeded).toBe(1);
    expect(result.report.failed).toBe(0);

    const messageInsert = calls.find((call) => call.sql.includes("INSERT INTO dataset_messages"));
    expect(messageInsert).toBeDefined();
    // Redacted text is a string param with the placeholder; raw text is a Buffer
    // (ciphertext) and must not contain the plaintext phone anywhere.
    const flat = JSON.stringify(
      calls.flatMap((call) => call.values.map((value) => (Buffer.isBuffer(value) ? value.toString("hex") : value))),
    );
    expect(flat).toContain("[PHONE_1]");
    expect(flat).not.toContain("0912345678");
    // Redis/provider source keys can contain stable customer identifiers. Store
    // only their SHA-256 projection, never the plaintext key.
    expect(flat).not.toContain("history_1");
  });

  it("treats a re-imported source key as a DUPLICATE no-op", async () => {
    const { store, calls } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_raw_items")
        ? { rowCount: 0, rows: [] } // ON CONFLICT DO NOTHING -> no row
        : { rowCount: 1, rows: [] },
    );
    const result = await store.importRecords("ds-1", [
      { sourceKey: "history_1", value: "[Khách hàng]: a", rawPayload: {} },
    ]);
    expect(result.outcomes[0]?.status).toBe("DUPLICATE");
    expect(calls.some((call) => call.sql.includes("INSERT INTO dataset_conversations"))).toBe(false);
  });

  it("isolates a single record failure and continues the batch", async () => {
    let seenConversationInsert = 0;
    const { store } = storeWith((sql) => {
      if (sql.includes("INSERT INTO dataset_raw_items") && !sql.includes("FAILED")) {
        return { rowCount: 1, rows: [{ raw_item_id: "raw-x" }] };
      }
      if (sql.includes("INSERT INTO dataset_conversations")) {
        seenConversationInsert += 1;
        if (seenConversationInsert === 1) throw new Error("boom");
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 1, rows: [] };
    });

    const result = await store.importRecords("ds-1", [
      { sourceKey: "k1", value: "[Khách hàng]: a", rawPayload: {} },
      { sourceKey: "k2", value: "[Khách hàng]: b", rawPayload: {} },
    ]);

    expect(result.outcomes[0]?.status).toBe("FAILED");
    expect(result.outcomes[1]?.status).toBe("IMPORTED");
    expect(result.report.failed).toBe(1);
    expect(result.report.succeeded).toBe(1);
  });
});
