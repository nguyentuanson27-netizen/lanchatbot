import { describe, expect, it } from "vitest";
import { LocalEnvelopeCipher } from "@lana/database";
import { PostgresControlCommandStore } from "./postgres-store.js";
import type { ClaimedAdminCommand, ControlTagObservation } from "./types.js";

describe("PostgresControlCommandStore tag reconciliation", () => {
  it("casts every beginFailSafeHuman parameter used by JSON and typed columns", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT 1 FROM admin_commands")) return { rowCount: 1, rows: [{ "?column?": 1 }] };
        if (sql.includes("UPDATE conversations SET conversation_owner = 'HUMAN'")) return { rowCount: 1, rows: [] };
        if (sql.includes("UPDATE admin_commands SET enqueued_state_version")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresControlCommandStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const command: ClaimedAdminCommand = {
      commandId: "11111111-1111-4111-8111-111111111111",
      leaseToken: "22222222-2222-4222-8222-222222222222",
      pageId: "1198992073286645",
      conversationId: "33333333-3333-4333-8333-333333333333",
      pancakeConversationId: "1198992073286645_sender",
      commandType: "RESUME_BOT",
      tag: null,
      pauseMinutes: null,
      expectedStateVersion: 13,
      enqueuedStateVersion: null,
      requestedBySubject: "owner",
      attemptCount: 1,
    };

    await expect(store.beginFailSafeHuman(
      command,
      new Date("2026-07-18T07:30:01.000Z"),
    )).resolves.toEqual({ status: "APPLIED", stateVersion: 14 });

    const update = calls.find((call) => call.sql.includes("UPDATE conversations SET conversation_owner = 'HUMAN'"));
    expect(update?.sql).toContain("owner_lease_until = $4::timestamptz");
    expect(update?.sql).toContain("'ownerLeaseUntil',$5::text");
    expect(update?.sql).toContain("'updatedAt',$6::text");
    expect(update?.sql).toContain("state_version = $8::bigint");
  });

  it("writes blockingTag to blocking_tag and observedAt to verified timestamp", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT 1 FROM admin_commands")) return { rowCount: 1, rows: [{ "?column?": 1 }] };
        if (sql.includes("SELECT state_version, conversation_owner")) {
          return {
            rowCount: 1,
            rows: [{
              state_version: "13",
              conversation_owner: "HUMAN",
              owner_lease_until: null,
              state_snapshot: { ownerReason: "MANUAL" },
            }],
          };
        }
        if (sql.includes("UPDATE conversations SET conversation_owner")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresControlCommandStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const command: ClaimedAdminCommand = {
      commandId: "11111111-1111-4111-8111-111111111111",
      leaseToken: "22222222-2222-4222-8222-222222222222",
      pageId: "1198992073286645",
      conversationId: "33333333-3333-4333-8333-333333333333",
      pancakeConversationId: "1198992073286645_sender",
      commandType: "SYNC_PANCAKE_TAGS",
      tag: null,
      pauseMinutes: null,
      expectedStateVersion: 13,
      enqueuedStateVersion: null,
      requestedBySubject: "owner",
      attemptCount: 1,
    };
    const observation: ControlTagObservation = {
      verified: true,
      observedTagIds: [],
      blockingTag: null,
      observedAt: "2026-07-18T07:30:00.000Z",
      reasonCode: null,
    };

    const result = await store.reconcileVerifiedTags(
      command,
      13,
      observation,
      false,
      new Date("2026-07-18T07:30:01.000Z"),
    );

    expect(result).toEqual({ status: "APPLIED", stateVersion: 14 });
    const update = calls.find((call) => call.sql.includes("UPDATE conversations SET conversation_owner"));
    expect(update?.sql).toContain("conversation_owner = $3::text");
    expect(update?.sql).toContain("blocking_tag = $5::text");
    expect(update?.sql).toContain("'blockingTag',$5::text");
    expect(update?.sql).toContain("'updatedAt',$12::text");
    expect(update?.sql).toContain("state_version = $14::bigint");
    expect(update?.values[4]).toBeNull();
    expect(update?.values[5]).toEqual(new Date(observation.observedAt));
    expect(update?.values[10]).toBe(observation.observedAt);
  });

  it("records HUMAN to BOT and resolves the active case only after verified RESUME is clear", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const openingHandoffId = "44444444-4444-4444-8444-444444444444";
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT 1 FROM admin_commands")) return { rowCount: 1, rows: [{ "?column?": 1 }] };
        if (sql.includes("SELECT state_version, conversation_owner")) {
          return {
            rowCount: 1,
            rows: [{
              state_version: "14",
              conversation_owner: "HUMAN",
              owner_lease_until: new Date("2026-07-18T07:35:00.000Z"),
              state_snapshot: { ownerReason: "MANUAL" },
            }],
          };
        }
        if (sql.includes("UPDATE conversations SET conversation_owner")) return { rowCount: 1, rows: [] };
        if (sql.includes("SELECT opening_handoff_id")) {
          return { rowCount: 1, rows: [{ opening_handoff_id: openingHandoffId }] };
        }
        if (sql.includes("INSERT INTO handoff_events")) return { rowCount: 1, rows: [] };
        if (sql.includes("UPDATE handoff_cases")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresControlCommandStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const command: ClaimedAdminCommand = {
      commandId: "11111111-1111-4111-8111-111111111111",
      leaseToken: "22222222-2222-4222-8222-222222222222",
      pageId: "1198992073286645",
      conversationId: "33333333-3333-4333-8333-333333333333",
      pancakeConversationId: "1198992073286645_sender",
      commandType: "RESUME_BOT",
      tag: null,
      pauseMinutes: null,
      expectedStateVersion: 13,
      enqueuedStateVersion: 14,
      requestedBySubject: "owner@example.invalid",
      attemptCount: 2,
    };
    const observation: ControlTagObservation = {
      verified: true,
      observedTagIds: [],
      blockingTag: null,
      observedAt: "2026-07-18T07:30:00.000Z",
      reasonCode: null,
    };

    await expect(store.reconcileVerifiedTags(
      command,
      14,
      observation,
      true,
      new Date("2026-07-18T07:30:01.000Z"),
    )).resolves.toEqual({ status: "APPLIED", stateVersion: 15 });

    const eventInsert = calls.find((call) => call.sql.includes("INSERT INTO handoff_events"));
    expect(eventInsert?.sql).toContain("'HUMAN_TO_BOT','ADMIN','RESUME_AFTER_REVIEW'");
    expect(eventInsert?.sql).toContain("source_admin_command_id");
    expect(eventInsert?.values[5]).toBe(openingHandoffId);
    const resolved = calls.find((call) => call.sql.includes("UPDATE handoff_cases"));
    expect(resolved?.sql).toContain("status = 'RESOLVED'");
    expect(calls.at(-1)?.sql).toBe("COMMIT");
  });
});
