import { describe, expect, it, vi } from "vitest";
import { WAVE1_LABEL_SCHEMA } from "@lana/dataset-review";
import { PostgresDatasetAnnotationStore } from "./dataset-annotation-store.js";

interface QueryCall {
  readonly sql: string;
  readonly values: readonly unknown[];
}

type Handler = (sql: string, values: readonly unknown[]) => { rowCount: number; rows: unknown[] };

function storeWith(handler: Handler): { store: PostgresDatasetAnnotationStore; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const respond = (sql: string, values: readonly unknown[] = []) => {
    calls.push({ sql, values });
    return handler(sql, values);
  };
  const client = { query: async (sql: string, values?: readonly unknown[]) => respond(sql, values), release: vi.fn() };
  const store = new PostgresDatasetAnnotationStore("postgresql://unused:unused@localhost:5432/unused");
  (store as unknown as { pool: unknown }).pool = {
    async connect() { return client; },
    async query(sql: string, values?: readonly unknown[]) { return respond(sql, values); },
    async end() {},
  };
  return { store, calls };
}

describe("createLabelSchema", () => {
  it("validates and inserts a valid schema", async () => {
    const { store } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_label_schemas")
        ? { rowCount: 1, rows: [{ label_schema_id: "ls-1" }] }
        : { rowCount: 0, rows: [] },
    );
    const result = await store.createLabelSchema({ schema: WAVE1_LABEL_SCHEMA, createdBySubject: "u1" });
    expect(result).toMatchObject({ labelSchemaId: "ls-1", created: true, version: WAVE1_LABEL_SCHEMA.version });
  });

  it("rejects an invalid schema before touching the database", async () => {
    const { store, calls } = storeWith(() => ({ rowCount: 0, rows: [] }));
    await expect(
      store.createLabelSchema({ schema: { schemaVersion: 1, labels: [] }, createdBySubject: "u1" }),
    ).rejects.toBeInstanceOf(Error);
    expect(calls).toHaveLength(0);
  });

  it("returns the existing schema on name+version conflict", async () => {
    const { store } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_label_schemas")
        ? { rowCount: 0, rows: [] }
        : sql.includes("SELECT label_schema_id FROM dataset_label_schemas")
          ? { rowCount: 1, rows: [{ label_schema_id: "ls-existing" }] }
          : { rowCount: 0, rows: [] },
    );
    const result = await store.createLabelSchema({ schema: WAVE1_LABEL_SCHEMA, createdBySubject: "u1" });
    expect(result).toMatchObject({ labelSchemaId: "ls-existing", created: false });
  });
});

describe("createProject", () => {
  it("inserts a draft project", async () => {
    const { store } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_annotation_projects")
        ? { rowCount: 1, rows: [{ project_id: "p-1", status: "DRAFT" }] }
        : { rowCount: 0, rows: [] },
    );
    const row = await store.createProject({
      datasetId: "ds-1",
      labelSchemaId: "ls-1",
      name: "Wave 1 review",
      annotationMode: "MESSAGE",
      reviewMode: "AI_ASSISTED",
      createdBySubject: "u1",
    });
    expect(row).toMatchObject({ project_id: "p-1", status: "DRAFT" });
  });
});

describe("createSplit", () => {
  it("keeps a duplicate group in one split and assigns deterministically", async () => {
    const conversations = [
      { conversation_id: "c1", duplicate_group_id: "g-shared" },
      { conversation_id: "c2", duplicate_group_id: "g-shared" },
      { conversation_id: "c3", duplicate_group_id: null },
      { conversation_id: "c4", duplicate_group_id: null },
    ];
    const { store, calls } = storeWith((sql) => {
      if (sql.includes("SELECT dataset_id FROM dataset_annotation_projects")) {
        return { rowCount: 1, rows: [{ dataset_id: "ds-1" }] };
      }
      if (sql.includes("FROM dataset_conversations")) {
        return { rowCount: conversations.length, rows: conversations };
      }
      if (sql.includes("INSERT INTO dataset_project_items")) {
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 1, rows: [] };
    });

    const result = await store.createSplit("p-1", {
      targets: { DEVELOPMENT: 2, VALIDATION: 1, HOLDOUT: 1 },
      seed: "seed-1",
    });
    expect(result.assigned).toBe(4);

    // Collect the split chosen for each conversation from the INSERT params.
    const inserts = calls.filter((call) => call.sql.includes("INSERT INTO dataset_project_items"));
    const splitByConversation = new Map<string, string>();
    for (const call of inserts) {
      splitByConversation.set(String(call.values[2]), String(call.values[3]));
    }
    // c1 and c2 share g-shared -> identical split (no leakage).
    expect(splitByConversation.get("c1")).toBe(splitByConversation.get("c2"));
  });

  it("counts re-run conflicts as alreadyAssigned (idempotent)", async () => {
    const { store } = storeWith((sql) => {
      if (sql.includes("SELECT dataset_id FROM dataset_annotation_projects")) {
        return { rowCount: 1, rows: [{ dataset_id: "ds-1" }] };
      }
      if (sql.includes("FROM dataset_conversations")) {
        return { rowCount: 1, rows: [{ conversation_id: "c1", duplicate_group_id: null }] };
      }
      // ON CONFLICT DO NOTHING -> no row inserted.
      return { rowCount: 0, rows: [] };
    });
    const result = await store.createSplit("p-1", {
      targets: { DEVELOPMENT: 1, VALIDATION: 0, HOLDOUT: 0 },
      seed: "s",
    });
    expect(result.assigned).toBe(0);
    expect(result.alreadyAssigned).toBe(1);
  });
});

describe("annotations and audit", () => {
  it("audits a human ADD with a review event", async () => {
    const { store, calls } = storeWith((sql) =>
      sql.includes("FROM dataset_project_items") && sql.includes("FOR UPDATE")
        ? { rowCount: 1, rows: [{ project_item_id: "pi-1" }] }
        : sql.includes("INSERT INTO dataset_annotations")
          ? { rowCount: 1, rows: [{ annotation_id: "a-1", project_item_id: "pi-1", label_code: "BUYING_COMMITTED", status: "ACCEPTED" }] }
          : { rowCount: 1, rows: [] },
    );
    await store.addAnnotation({
      projectItemId: "pi-1",
      labelCode: "BUYING_COMMITTED",
      scope: "CUSTOMER_MESSAGE",
      turnIndex: 0,
      evidenceText: "chị lấy mẫu này",
      confidence: "HIGH",
      source: "HUMAN",
      status: "ACCEPTED",
      reviewerId: "reviewer-1",
    });
    const event = calls.find((call) => call.sql.includes("INSERT INTO dataset_review_events"));
    expect(event).toBeDefined();
    expect(event?.values).toContain("ADD");
  });

  it("rejects a human annotation without an active lease", async () => {
    const { store } = storeWith(() => ({ rowCount: 0, rows: [] }));
    await expect(store.addAnnotation({
      projectItemId: "pi-1",
      labelCode: "BUYING_COMMITTED",
      scope: "CUSTOMER_MESSAGE",
      confidence: "HIGH",
      source: "HUMAN",
      status: "ACCEPTED",
      reviewerId: "reviewer-1",
    })).rejects.toThrow("DATASET_REVIEW_LEASE_CONFLICT");
  });

  it("does not audit an AI PROPOSED insert", async () => {
    const { store, calls } = storeWith((sql) =>
      sql.includes("INSERT INTO dataset_annotations")
        ? { rowCount: 1, rows: [{ annotation_id: "a-2", project_item_id: "pi-1", status: "PROPOSED" }] }
        : { rowCount: 1, rows: [] },
    );
    await store.addAnnotation({
      projectItemId: "pi-1",
      labelCode: "PRICE_QUESTION",
      scope: "CUSTOMER_MESSAGE",
      turnIndex: 0,
      evidenceText: "bao nhiêu",
      confidence: "MEDIUM",
      source: "AI",
      status: "PROPOSED",
      sourceVersion: "run-1",
    });
    expect(calls.some((call) => call.sql.includes("INSERT INTO dataset_review_events"))).toBe(false);
  });

  it("ACCEPT updates status and writes a before/after audit event", async () => {
    const before = { annotation_id: "a-1", project_item_id: "pi-1", label_code: "BUYING_COMMITTED", status: "PROPOSED", confidence: "HIGH", scope: "CUSTOMER_MESSAGE", turn_index: 0, second_turn_index: null, evidence_text: "x", evidence_start: null, evidence_end: null, source: "AI", source_version: "run-1", reviewer_id: null };
    const { store, calls } = storeWith((sql) => {
      if (sql.includes("FROM dataset_annotations") && sql.includes("FOR UPDATE")) {
        return { rowCount: 1, rows: [before] };
      }
      if (sql.includes("FROM dataset_project_items") && sql.includes("FOR UPDATE")) {
        return { rowCount: 1, rows: [{ project_item_id: "pi-1" }] };
      }
      if (sql.includes("UPDATE dataset_annotations")) {
        return { rowCount: 1, rows: [{ ...before, status: "ACCEPTED", reviewer_id: "rev-1" }] };
      }
      return { rowCount: 1, rows: [] };
    });
    const result = await store.reviewAnnotation("a-1", { action: "ACCEPT", actorSubject: "rev-1" });
    expect(result).toMatchObject({ status: "ACCEPTED", reviewer_id: "rev-1" });
    const event = calls.find((call) => call.sql.includes("INSERT INTO dataset_review_events"));
    expect(event?.values).toContain("ACCEPT");
  });

  it("returns null when reviewing a missing annotation", async () => {
    const { store } = storeWith(() => ({ rowCount: 0, rows: [] }));
    const result = await store.reviewAnnotation("missing", { action: "REJECT", actorSubject: "rev-1" });
    expect(result).toBeNull();
  });
});

describe("reviewProgress", () => {
  it("counts reviewed and total, optionally scoped to a split", async () => {
    const { store, calls } = storeWith(() => ({
      rowCount: 1,
      rows: [{ reviewed: "4", total: "10" }],
    }));
    const result = await store.reviewProgress("p-1", "DEVELOPMENT");
    expect(result).toEqual({ reviewed: 4, total: 10 });
    expect(calls[0]?.values).toEqual(["p-1", "DEVELOPMENT"]);
  });
});

describe("nextReviewItem", () => {
  it("skips locked/reviewed items and items leased by others", async () => {
    const { store, calls } = storeWith(() => ({
      rowCount: 1,
      rows: [{ project_item_id: "pi-9", conversation_id: "c-9", split: "DEVELOPMENT", revision: 2 }],
    }));
    const row = await store.nextReviewItem("p-1", { reviewerSubject: "rev-1", split: "DEVELOPMENT" });
    expect(row).toMatchObject({ project_item_id: "pi-9" });
    const sql = calls[0]?.sql ?? "";
    expect(sql).toContain("assignment_status NOT IN ('REVIEWED', 'LOCKED')");
    expect(sql).toContain("lease_owner IS NULL OR pi.lease_owner = $2 OR pi.lease_until < now()");
    expect(calls[0]?.values).toEqual(["p-1", "rev-1", "DEVELOPMENT"]);
  });

  it("returns null when nothing is reviewable", async () => {
    const { store } = storeWith(() => ({ rowCount: 0, rows: [] }));
    expect(await store.nextReviewItem("p-1", { reviewerSubject: "rev-1" })).toBeNull();
  });
});

describe("acquireReviewLease", () => {
  it("clamps the lease window and only takes a free/own/expired lease", async () => {
    const { store, calls } = storeWith(() => ({
      rowCount: 1,
      rows: [{ project_item_id: "pi-1", lease_owner: "rev-1", revision: 3, assignment_status: "IN_REVIEW" }],
    }));
    const leased = await store.acquireReviewLease("pi-1", "rev-1", 5);
    expect(leased).toMatchObject({ lease_owner: "rev-1", assignment_status: "IN_REVIEW" });
    // 5s is clamped up to the 60s floor.
    expect(calls[0]?.values).toEqual(["pi-1", "rev-1", "60"]);
    expect(calls[0]?.sql).toContain("assignment_status <> 'LOCKED'");
  });

  it("returns null when another reviewer already holds an active lease", async () => {
    const { store } = storeWith(() => ({ rowCount: 0, rows: [] }));
    expect(await store.acquireReviewLease("pi-1", "rev-2")).toBeNull();
  });
});

describe("completeReviewItem", () => {
  it("marks only the current leased revision reviewed and clears the lease", async () => {
    const { store, calls } = storeWith(() => ({
      rowCount: 1,
      rows: [{ project_item_id: "pi-1", assignment_status: "REVIEWED", revision: 4 }],
    }));
    const completed = await store.completeReviewItem("pi-1", "rev-1", 3);
    expect(completed).toMatchObject({ assignment_status: "REVIEWED", revision: 4 });
    expect(calls[0]?.values).toEqual(["pi-1", "rev-1", 3]);
    expect(calls[0]?.sql).toContain("pi.lease_owner = $2");
    expect(calls[0]?.sql).toContain("pi.revision = $3");
    expect(calls[0]?.sql).toContain("assignment_status = 'REVIEWED'");
    expect(calls[0]?.sql).toContain("a.status IN ('ACCEPTED', 'EDITED', 'ADJUDICATED')");
  });

  it("returns null on stale revision, expired lease, or missing accepted labels", async () => {
    const { store } = storeWith(() => ({ rowCount: 0, rows: [] }));
    expect(await store.completeReviewItem("pi-1", "rev-1", 2)).toBeNull();
  });
});

describe("lockHoldoutSplit", () => {
  it("locks holdout items and writes one LOCK audit event", async () => {
    const { store, calls } = storeWith((sql) =>
      sql.includes("UPDATE dataset_project_items")
        ? { rowCount: 3, rows: [{ project_item_id: "pi-1" }, { project_item_id: "pi-2" }, { project_item_id: "pi-3" }] }
        : { rowCount: 1, rows: [] },
    );
    const locked = await store.lockHoldoutSplit("p-1", "admin-1");
    expect(locked).toBe(3);
    const update = calls.find((call) => call.sql.includes("UPDATE dataset_project_items"));
    expect(update?.sql).toContain("split = 'HOLDOUT'");
    const event = calls.find((call) => call.sql.includes("INSERT INTO dataset_review_events"));
    expect(event?.values).toContain("LOCK");
  });

  it("is a no-op when there is nothing to lock", async () => {
    const { store, calls } = storeWith(() => ({ rowCount: 0, rows: [] }));
    expect(await store.lockHoldoutSplit("p-1", "admin-1")).toBe(0);
    expect(calls.some((call) => call.sql.includes("INSERT INTO dataset_review_events"))).toBe(false);
  });
});

describe("exportAnnotations", () => {
  it("returns only human-confirmed labels for the requested splits", async () => {
    const { store, calls } = storeWith(() => ({
      rowCount: 1,
      rows: [{ project_item_id: "pi-1", conversation_id: "c-1", split: "DEVELOPMENT", label_code: "BUYING_COMMITTED", status: "ACCEPTED" }],
    }));
    const rows = await store.exportAnnotations("p-1", ["DEVELOPMENT", "VALIDATION"]);
    expect(rows).toHaveLength(1);
    const sql = calls[0]?.sql ?? "";
    expect(sql).toContain("a.status IN ('ACCEPTED', 'EDITED', 'ADJUDICATED')");
    expect(calls[0]?.values).toEqual(["p-1", ["DEVELOPMENT", "VALIDATION"]]);
  });

  it("short-circuits with no query when splits is empty", async () => {
    const { store, calls } = storeWith(() => ({ rowCount: 0, rows: [] }));
    expect(await store.exportAnnotations("p-1", [])).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
