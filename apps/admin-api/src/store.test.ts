import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PostgresAdminStore,
  ADMIN_ACQUISITION_SESSIONS_SOURCE,
  ADMIN_CONVERSATION_EVENTS_SOURCE,
  decodeCursor,
  encodeCursor,
  isRollbackTargetLifecycleCompatible,
  isShadowToLivePromotion,
  transitionTarget,
} from "./store.js";

describe("Admin cursor", () => {
  it("round-trips an opaque keyset cursor", () => {
    const value = {
      time: "2026-07-16T12:00:00.000Z",
      id: "018f1b72-0000-7000-8000-000000000001",
    };
    assert.deepEqual(decodeCursor(encodeCursor(value)), value);
  });

  it("rejects a malformed cursor", () => {
    assert.throws(() => decodeCursor("not-json"), /ADMIN_QUERY_INVALID/);
  });
});

describe("Admin funnel data boundary", () => {
  it("reads ad acquisition metrics only through the PII-free admin view", () => {
    assert.equal(ADMIN_ACQUISITION_SESSIONS_SOURCE, "admin_acquisition_sessions_v");
    assert.notEqual(ADMIN_ACQUISITION_SESSIONS_SOURCE, "acquisition_sessions");
  });
  it("reads checkout drop-offs only through the anonymized admin view", () => {
    assert.equal(ADMIN_CONVERSATION_EVENTS_SOURCE, "admin_conversation_events_v");
    assert.notEqual(ADMIN_CONVERSATION_EVENTS_SOURCE, "conversation_events");
  });

});
describe("Admin policy rollback compatibility", () => {
  it("keeps pre-publish rollback inside the CANARY lifecycle", () => {
    assert.equal(isRollbackTargetLifecycleCompatible("CANARY_SHADOW", "CANARY"), true);
    assert.equal(isRollbackTargetLifecycleCompatible("CANARY_LIVE", "CANARY"), true);
    assert.equal(isRollbackTargetLifecycleCompatible("CANARY_SHADOW", "PUBLISHED"), false);
    assert.equal(isRollbackTargetLifecycleCompatible("CANARY_LIVE", "APPROVED"), false);
  });

  it("keeps published rollback inside the PUBLISHED lifecycle", () => {
    assert.equal(isRollbackTargetLifecycleCompatible("PUBLISHED", "PUBLISHED"), true);
    assert.equal(isRollbackTargetLifecycleCompatible("PUBLISHED", "CANARY"), false);
    assert.equal(isRollbackTargetLifecycleCompatible("PUBLISHED", "RETIRED"), false);
  });
});

describe("Admin shadow-to-live promotion", () => {
  it("allows only a live promotion of an existing CANARY version", () => {
    assert.equal(isShadowToLivePromotion("CANARY", "START_CANARY", "LIVE_OUTBOUND"), true);
    assert.equal(transitionTarget("CANARY", "START_CANARY", "LIVE_OUTBOUND"), "CANARY");
    assert.equal(transitionTarget("CANARY", "START_CANARY", "SHADOW"), null);
    assert.equal(transitionTarget("APPROVED", "START_CANARY", "SHADOW"), "CANARY");
  });
});

describe("Admin Meta Outbox projection", () => {
  it("does not expose an active error after accepted status reaches the view and queue metrics", async () => {
    const queries: string[] = [];
    const acceptedRow = {
      outbox_id: "10000000-0000-4000-8000-000000000005",
      page_id: "page-1",
      status: "SENT_ACCEPTED",
      last_error_code: null,
      created_at: "2026-08-05T04:00:00.000Z",
      updated_at: "2026-08-05T04:00:01.000Z",
    };
    const pool = {
      async query(sql: string) {
        queries.push(sql);
        if (sql.includes("FROM admin_pages_v")) {
          return { rows: [{ page_id: "page-1" }] };
        }
        if (sql.includes("FROM admin_meta_outbox_v") && sql.includes("GROUP BY status")) {
          return { rows: [{ status: "SENT_ACCEPTED", count: 1 }] };
        }
        if (sql.includes("FROM admin_meta_outbox_v")) {
          return { rows: [acceptedRow] };
        }
        if (sql.includes("FROM admin_evaluations_v")) {
          return { rows: [{}] };
        }
        return { rows: [] };
      },
      async end() {},
    };
    const store = new PostgresAdminStore("postgresql://unused:unused@localhost:5432/unused");
    (store as unknown as { pool: unknown }).pool = pool;
    const identity = {
      email: "owner@example.test",
      role: "OWNER" as const,
      pageScope: ["page-1"] as const,
      subject: "owner",
    };

    const projection = await store.listMetaOutbox(identity, { limit: 10 });
    assert.equal(projection.items[0]?.last_error_code, null);
    assert.match(
      queries.find((sql) => sql.includes("FROM admin_meta_outbox_v") && !sql.includes("GROUP BY status")) ?? "",
      /last_error_code/u,
    );

    const health = await store.pageHealth(identity, "page-1");
    const queues = health?.queues as Record<string, unknown>;
    assert.deepEqual(queues.meta_outbox, { SENT_ACCEPTED: 1 });
    assert.ok(queries.some((sql) =>
      sql.includes("FROM admin_meta_outbox_v") && sql.includes("GROUP BY status")));
    await store.close();
  });
});
