import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import {
  acquisitionEnabled,
  acquisitionEntrySource,
  adAcquisitionConfig,
  commitAcquisitionPlan,
  deterministicAcquisitionUuid,
  recordInitialReplyAccepted,
  recordInitialReplySendFailed,
  tryOpenAdAcquisitionSession,
} from "./ad-acquisition.js";

function clientWith(handler: (sql: string, values: readonly unknown[]) => unknown): PoolClient {
  return {
    query: vi.fn(async (sql: string, values: readonly unknown[] = []) =>
      handler(sql, values) ?? { rowCount: 0, rows: [] }
    ),
  } as unknown as PoolClient;
}

describe("ad acquisition persistence", () => {
  it("hard-gates writes by mode and page allowlist", () => {
    const config = adAcquisitionConfig({ mode: "SHADOW", pageAllowlist: ["page-1"] });
    expect(acquisitionEnabled(config, "page-1")).toBe(true);
    expect(acquisitionEnabled(config, "page-2")).toBe(false);
    expect(acquisitionEntrySource("ads")).toBe("META_ADS_CONFIRMED");
    expect(acquisitionEntrySource(null)).toBe("UNKNOWN");
  });

  it("generates a stable UUID without exposing the provider identity", () => {
    const first = deterministicAcquisitionUuid("identity-key-1");
    expect(first).toBe(deterministicAcquisitionUuid("identity-key-1"));
    expect(first).toMatch(/^[a-f0-9-]{36}$/u);
    expect(first).not.toContain("identity-key-1");
  });

  it("opens one confirmed Ads session inside a fail-open savepoint", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = clientWith((sql, values) => {
      calls.push({ sql, values });
      if (sql.includes("INSERT INTO acquisition_sessions")) return { rowCount: 1, rows: [] };
      return { rowCount: 0, rows: [] };
    });
    await tryOpenAdAcquisitionSession(
      client,
      adAcquisitionConfig({ mode: "SHADOW", pageAllowlist: ["page-1"] }),
      {
        identityKey: "history:inbound:v1:hash",
        pageId: "page-1",
        conversationId: "10000000-0000-4000-8000-000000000001",
        customerHash: "a".repeat(64),
        messagePk: "10000000-0000-4000-8000-000000000002",
        occurredAt: new Date("2026-07-29T10:00:00.000Z"),
        source: "ADS",
        referralType: "OPEN_THREAD",
        adId: "ad-1",
        postId: "post-1",
        adTitle: "untrusted creative title",
      },
    );
    expect(calls.some((call) => call.sql.startsWith("SAVEPOINT"))).toBe(true);
    expect(calls.some((call) => call.sql.includes("pg_advisory_xact_lock"))).toBe(true);
    expect(calls.filter((call) => call.sql.includes("INSERT INTO acquisition_sessions"))).toHaveLength(1);
    const event = calls.find((call) => call.sql.includes("INSERT INTO conversation_events"));
    expect(JSON.stringify(event?.values)).not.toContain("untrusted creative title");
  });

  it("does not count non-zero outbox sequence as the initial reply", async () => {
    const client = clientWith(() => undefined);
    await recordInitialReplyAccepted(client, {
      replyPlanId: "10000000-0000-4000-8000-000000000001",
      outboxId: "10000000-0000-4000-8000-000000000002",
      sequenceNo: 1,
      acceptedAt: new Date(),
      pageId: "page-1",
      conversationId: "10000000-0000-4000-8000-000000000003",
      customerHash: "a".repeat(64),
    });
    expect(client.query).not.toHaveBeenCalled();
  });

  it("records a terminal failure only for the first outbox unit", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = clientWith((sql, values) => {
      calls.push({ sql, values });
      if (sql.includes("UPDATE acquisition_sessions") && sql.includes("initial_reply_terminal_status")) {
        return {
          rowCount: 1,
          rows: [{
            acquisition_session_id: "10000000-0000-4000-8000-000000000001",
            page_id: "page-1",
            conversation_id: "10000000-0000-4000-8000-000000000002",
            customer_hash: "a".repeat(64),
            entry_message_pk: "10000000-0000-4000-8000-000000000003",
            entry_message_occurred_at: new Date("2026-07-29T10:00:00.000Z"),
            initial_reply_plan_id: "10000000-0000-4000-8000-000000000004",
            initial_reply_accepted_at: null,
            max_stage_reached: "UNQUALIFIED_ENTRY",
            current_disposition: "ACTIVE",
            derivation_version: "ad-acquisition-v1",
          }],
        };
      }
      return { rowCount: 1, rows: [] };
    });
    await recordInitialReplySendFailed(client, {
      replyPlanId: "10000000-0000-4000-8000-000000000004",
      outboxId: "10000000-0000-4000-8000-000000000005",
      sequenceNo: 0,
      failedAt: new Date("2026-07-29T10:00:10.000Z"),
      terminalStatus: "FAILED_PERMANENT",
    });
    const event = calls.find((call) => call.sql.includes("INSERT INTO conversation_events"));
    expect(event?.values).toContain("BOT_INITIAL_AD_REPLY_SEND_FAILED");
  });
  it("fails open when the acquisition projection is unavailable", async () => {
    const calls: string[] = [];
    const client = clientWith((sql) => {
      calls.push(sql);
      if (sql.includes("FROM acquisition_sessions") && sql.includes("FOR UPDATE")) {
        throw new Error("relation unavailable");
      }
      return { rowCount: 0, rows: [] };
    });
    await expect(commitAcquisitionPlan(client, {
      pageId: "page-1",
      conversationId: "10000000-0000-4000-8000-000000000001",
      customerHash: "a".repeat(64),
      plan: {
        triggerMessagePk: "10000000-0000-4000-8000-000000000002",
        triggerOccurredAt: new Date("2026-07-29T10:01:00.000Z"),
        replyPlanId: null,
        meaningfulLabels: [],
        ambiguousAcknowledgement: false,
        buyingNegated: false,
        buyingCommitted: false,
        purchaseConfirmed: false,
        firstBarrier: null,
      },
    })).resolves.toBeUndefined();
    expect(calls.some((sql) => sql.startsWith("ROLLBACK TO SAVEPOINT"))).toBe(true);
    expect(calls.at(-1)).toContain("RELEASE SAVEPOINT");
  });
  it("records a negated follow-up as meaningful without elevating qualified", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = clientWith((sql, values) => {
      calls.push({ sql, values });
      if (sql.includes("FROM acquisition_sessions") && sql.includes("FOR UPDATE")) {
        return {
          rowCount: 1,
          rows: [{
            acquisition_session_id: "10000000-0000-4000-8000-000000000001",
            entry_message_pk: "10000000-0000-4000-8000-000000000002",
            entry_message_occurred_at: new Date("2026-07-29T10:00:00.000Z"),
            initial_reply_plan_id: "10000000-0000-4000-8000-000000000003",
            initial_reply_accepted_at: new Date("2026-07-29T10:00:10.000Z"),
            max_stage_reached: "UNQUALIFIED_ENTRY",
            current_disposition: "ACTIVE",
            derivation_version: "ad-acquisition-v1",
          }],
        };
      }
      return { rowCount: 1, rows: [] };
    });
    await commitAcquisitionPlan(client, {
      pageId: "page-1",
      conversationId: "10000000-0000-4000-8000-000000000004",
      customerHash: "a".repeat(64),
      plan: {
        triggerMessagePk: "10000000-0000-4000-8000-000000000005",
        triggerOccurredAt: new Date("2026-07-29T10:01:00.000Z"),
        replyPlanId: null,
        meaningfulLabels: ["BUYING_NEGATED"],
        ambiguousAcknowledgement: false,
        buyingNegated: true,
        buyingCommitted: false,
        purchaseConfirmed: false,
        firstBarrier: null,
      },
    });
    const update = calls.find((call) => call.sql.includes("reengaged_at = COALESCE"));
    expect(update?.values[6]).toBe("REENGAGED");
    expect(update?.values[7]).toBe("NEGATED");
    expect(update?.values[3]).toBe(false);
  });
});
