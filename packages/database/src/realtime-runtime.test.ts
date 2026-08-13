import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";
import {
  PostgresRealtimeRuntimeStore,
  type RealtimeCommitInput,
} from "./realtime-runtime.js";

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function rawSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

describe("PostgresRealtimeRuntimeStore handoff commit", () => {
  it("persists idempotent PII-free decision events in the state transaction", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-23T05:00:00.000Z") }] };
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
          decisionObservability: {
            schemaVersion: 1,
            dialogueEvidence: {
              source: "DETERMINISTIC_RUNTIME",
              codes: ["DIRECT_PURCHASE_VERB"],
              evidenceHash: "c".repeat(64),
            },
            buyingIntent: {
              authorityVersion: "HYBRID_BUYING_INTENT_V1",
              decision: "COMMITTED",
              source: "DETERMINISTIC",
              requestedAction: "NONE",
              quantity: null,
              confidenceBand: "UNKNOWN",
              evidenceReasonCodes: ["DIRECT_PURCHASE_VERB"],
              evidenceHash: "d".repeat(64),
            },
            protectedClaimValidation: {
              verifierVersion: "LEGACY_GUARD_V1",
              outcome: "NO_PROTECTED_CLAIMS",
              claimTypes: [],
              validatedCount: 0,
              rejectedCount: 0,
              reasonCodes: [],
            },
            readiness: {
              rulesetVersion: "LEGACY_READINESS_OBSERVATION_V1",
              outcome: "LEGACY_READY",
              productScope: "RESOLVED",
              reasonCodes: [],
            },
            phaseBarrier: {
              contractVersion: "LEGACY_PHASE_BARRIER_OBSERVATION_V1",
              phase: "CART_OPEN",
              phaseSource: "SALES_CYCLE_STAGE_V1",
              barrier: "NOT_EVALUATED",
              barrierSource: "NONE",
            },
            context: { schemaVersion: 1, contextVersion: "LEGACY_CONTEXT_V1" },
            strategyCta: {
              rulesetVersion: "NONE",
              strategy: "NONE",
              cta: "NONE",
              source: "NONE",
            },
            reconciliation: {
              contractVersion: "BF01_RECONCILIATION_V1",
              outcome: "NOT_APPLIED",
              reasonCodes: [],
            },
            guard: {
              contractVersion: "AGENT_PROPOSAL_GUARD_V1",
              outcome: "ALLOWED",
              reasonCodes: [],
              planHash: "e".repeat(64),
            },
            sideEffectPlan: {
              contractVersion: "REALTIME_COMMIT_PLAN_V1",
              disposition: "PLANNED",
              effectTypes: ["META_OUTBOX"],
              reasonCodes: [],
            },
          },
        },
      }],
    }, occurredAt);

    expect(result.decisionEventsCreated).toBe(1);
    const insert = calls.find((call) => call.sql.includes("INSERT INTO conversation_events"));
    expect(insert?.sql).toContain("ON CONFLICT (event_id, occurred_at) DO NOTHING");
    const serialized = JSON.stringify(insert?.values ?? []);
    expect(serialized).not.toContain("0900000000");
    expect(serialized).not.toContain("rawText");
    expect(serialized).toContain("decisionObservability");
    expect(serialized).toContain("HYBRID_BUYING_INTENT_V1");
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
              transaction_now: new Date("2026-07-23T05:00:00.000Z"),
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
        sendAfterOwnerHandoff: true,
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
    expect(inserts.every((insert) => insert.values[19] === true)).toBe(true);

  });

  it("commits a price-only protected reply when its typed claim set matches exactly", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    let transactionNow = new Date("2026-08-13T05:00:00.000Z");
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{
            routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: transactionNow,
          }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("UPDATE conversations") || sql.includes("INSERT INTO meta_outbox")) {
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
    const now = new Date("2026-08-13T05:00:00.000Z");
    const claim = {
      schemaVersion: 1 as const,
      claimId: "10000000-0000-4000-8000-000000000003",
      type: "PRICE" as const,
      scope: { kind: "PRODUCT" as const, productId: "SP-001", variantId: null },
      provenance: {
        authority: "POS_SNAPSHOT" as const,
        sourceVersion: "POS_SNAPSHOT:2026-08-13T04:59:00.000Z",
        evidenceRef: `business-fact:price:${"b".repeat(64)}`,
        contentHash: "c".repeat(64),
        observedAt: "2026-08-13T04:59:00.000Z",
        expiresAt: "2026-08-13T05:05:00.000Z",
      },
      value: { amountVnd: 1_250_000, currency: "VND" as const },
      authorization: "NONE" as const,
    };
    const messages = [{ kind: "TEXT" as const, text: "Giá hiện tại là 1.250.000đ." }];
    const commitInput: RealtimeCommitInput<{
      revision: number;
      routingOwner: "APP";
      conversationOwner: "BOT";
    }> = {
      pageId: "page-1",
      customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: { revision: 1, routingOwner: "APP", conversationOwner: "BOT" },
      metaPlan: {
        replyPlanId: "10000000-0000-4000-8000-000000000001",
        responseGroupId: "10000000-0000-4000-8000-000000000002",
        recipientId: "customer-1",
        messages,
        protectedClaimTypes: ["PRICE"],
        sourceMessageIdHash: "a".repeat(64),
        protectedClaims: [claim],
        effectReadiness: {
          schemaVersion: 1,
          rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
          effect: "PROTECTED_OUTBOUND",
          outcome: "READY",
          pageId: "page-1",
          conversationId: "33333333-3333-4333-8333-333333333333",
          sourceMessageIdHash: "a".repeat(64),
          conversationRevision: 0,
          salesCycleRevision: null,
          productIds: ["SP-001"],
          cartId: null,
          cartVersion: null,
          cartStateHash: null,
          orderPreviewId: null,
          orderPreviewHash: null,
          buyingIntentHash: null,
          deterministicEvidenceHash: sha256(messages),
          claimSetHash: sha256([claim]),
          protectedClaimTypes: ["PRICE"],
          checkedAt: now.toISOString(),
          expiresAt: "2026-08-13T05:01:00.000Z",
          reasonCodes: [],
          authorization: "NONE",
        },
      },
    };
    const result = await store.commit(commitInput, now);

    expect(result.metaOutboxCreated).toBe(1);
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");

    await expect(store.commit({
      ...commitInput,
      metaPlan: {
        ...commitInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-000000000020",
        responseGroupId: "10000000-0000-4000-8000-000000000021",
        effectReadiness: {
          ...commitInput.metaPlan!.effectReadiness!,
          productIds: ["SP-001", "SP-002"],
        },
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_CLAIM_MISSING");

    const conflictingClaim = {
      ...claim,
      claimId: "10000000-0000-4000-8000-000000000022",
      provenance: { ...claim.provenance, contentHash: "d".repeat(64) },
      value: { amountVnd: 1_300_000, currency: "VND" as const },
    };
    await expect(store.commit({
      ...commitInput,
      metaPlan: {
        ...commitInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-000000000023",
        responseGroupId: "10000000-0000-4000-8000-000000000024",
        protectedClaims: [claim, conflictingClaim],
        effectReadiness: {
          ...commitInput.metaPlan!.effectReadiness!,
          claimSetHash: sha256([claim, conflictingClaim]),
        },
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_CLAIM_CONFLICT");

    await expect(store.commit({
      ...commitInput,
      metaPlan: {
        ...commitInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-000000000004",
        responseGroupId: "10000000-0000-4000-8000-000000000005",
        messages: [{ kind: "TEXT", text: "Giá bị thay đổi sau khi readiness đã được chốt." }],
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_PAYLOAD_MISMATCH");

    transactionNow = new Date("2026-08-13T05:02:00.000Z");
    await expect(store.commit({
      ...commitInput,
      metaPlan: {
        ...commitInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-000000000006",
        responseGroupId: "10000000-0000-4000-8000-000000000007",
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_READINESS_MISMATCH");

    transactionNow = now;
    const payloadOnlyMessages = [{ kind: "TEXT" as const, text: "Em đã ghi nhận xác nhận mua hàng." }];
    const payloadOnlyInput: RealtimeCommitInput<{
      revision: number;
      routingOwner: "APP";
      conversationOwner: "BOT";
    }> = {
      ...commitInput,
      metaPlan: {
        replyPlanId: "10000000-0000-4000-8000-000000000008",
        responseGroupId: "10000000-0000-4000-8000-000000000009",
        recipientId: "customer-1",
        messages: payloadOnlyMessages,
        protectedClaimTypes: [],
        sourceMessageIdHash: "a".repeat(64),
        protectedClaims: [],
        effectReadiness: {
          ...commitInput.metaPlan!.effectReadiness!,
          deterministicEvidenceHash: sha256(payloadOnlyMessages),
          claimSetHash: null,
          protectedClaimTypes: [],
        },
      },
    };
    await expect(store.commit(payloadOnlyInput, now)).resolves.toMatchObject({
      metaOutboxCreated: 1,
    });
    await expect(store.commit({
      ...payloadOnlyInput,
      metaPlan: {
        ...payloadOnlyInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-00000000000a",
        responseGroupId: "10000000-0000-4000-8000-00000000000b",
        messages: [{ kind: "TEXT", text: "Payload confirmation đã bị thay đổi." }],
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_PAYLOAD_MISMATCH");
  });

  it("drops a stale decision before state or outbox commit when a newer inbound advanced the generation", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return {
            rowCount: 1,
            rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
              transaction_now: new Date("2026-08-13T05:00:00.000Z") }],
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
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-20T10:00:00.000Z") }] };
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
        afterResponseGroupId: "10000000-0000-4000-8000-000000000099",
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
    const tagInsert = calls.find((call) =>
      call.sql.includes("INSERT INTO pancake_tag_outbox"));
    expect(tagInsert?.values[10]).toBe(
      "10000000-0000-4000-8000-000000000099",
    );
    const handoffCaseInsert = calls.find((call) => call.sql.includes("INSERT INTO handoff_cases"));
    expect(handoffCaseInsert?.sql).toContain("sla_due_at");
    expect(handoffCaseInsert?.sql).toContain("$4::timestamptz");
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
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-20T10:00:00.000Z") }] };
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
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-20T10:05:00.000Z") }] };
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
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-23T03:00:00.000Z") }] };
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

  it("rejects a stale readiness binding inside the sales commit transaction", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-08-13T03:00:00.000Z") }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-08-13T03:00:00.000Z");
    await expect(store.commit({
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 4,
      state: { revision: 5, routingOwner: "APP", conversationOwner: "BOT" },
      salesCyclePlan: {
        expectedRevision: 2,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1",
        sourceMessageIdHash: "a".repeat(64),
        canonicalBuyingIntent: {
          schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1",
          decision: "COMMITTED", requestedAction: "OPEN_CART", quantity: 1,
          productId: "SP-001", contributors: ["DETERMINISTIC_RUNTIME"],
          sourceMessageIdHash: "a".repeat(64), evidenceHash: "d".repeat(64),
          reasonCodes: ["DIRECT_PURCHASE_VERB"],
          evaluatedAt: "2026-08-13T02:58:00.000Z", authorization: "NONE",
        },
        state: { revision: 3 },
        cartExpiresAt: new Date("2026-08-14T03:00:00.000Z"),
        expiresAt: new Date("2026-08-14T03:00:00.000Z"),
        events: [{
          commandId: "sales:event-2:cart-open", commandKind: "CART_OPENED",
          outcome: "APPLIED", stateRevisionBefore: 2, stateRevisionAfter: 3,
          stageBefore: "SIZE_RECOMMENDED", stageAfter: "CART_OPEN",
          cartId: "10000000-0000-4000-8000-000000000001", cartVersion: 1,
          reasonCode: null, occurredAt: now,
        }],
        effectReadiness: [{
          schemaVersion: 1, rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
          effect: "CART_OPEN", outcome: "READY", pageId: "page-1",
          conversationId: "33333333-3333-4333-8333-333333333333",
          sourceMessageIdHash: "a".repeat(64), conversationRevision: 4,
          salesCycleRevision: 2, productIds: ["SP-001"], cartId: null,
          cartVersion: null, cartStateHash: "e".repeat(64), orderPreviewId: null,
          orderPreviewHash: null,
          buyingIntentHash: "b".repeat(64), claimSetHash: "c".repeat(64),
          deterministicEvidenceHash: null, protectedClaimTypes: [],
          checkedAt: "2026-08-13T02:58:00.000Z",
          expiresAt: "2026-08-13T02:59:00.000Z",
          reasonCodes: [], authorization: "NONE",
        }],
      },
    }, now)).rejects.toThrow("EFFECT_READINESS_STALE");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
  });

  it.each(["NEGOTIATION_EVENT", "CART_READY"] as const)(
    "requires effect readiness for a versioned %s event",
    async (commandKind) => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-08-13T03:00:00.000Z") }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("SELECT state_revision")) {
          return { rowCount: 1, rows: [{ state_revision: "2" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-08-13T03:00:00.000Z");

    await expect(store.commit({
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 4,
      state: { revision: 5, routingOwner: "APP", conversationOwner: "BOT" },
      salesCyclePlan: {
        expectedRevision: 2,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1",
        sourceMessageIdHash: "a".repeat(64),
        canonicalBuyingIntent: {
          schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1",
          decision: "NONE", requestedAction: "NONE", quantity: null,
          productId: null, contributors: [],
          sourceMessageIdHash: "a".repeat(64), evidenceHash: null,
          reasonCodes: [],
          evaluatedAt: "2026-08-13T02:58:00.000Z", authorization: "NONE",
        },
        state: { revision: 3 },
        cartExpiresAt: new Date("2026-08-14T03:00:00.000Z"),
        expiresAt: new Date("2026-08-14T03:00:00.000Z"),
        events: [{
          commandId: `sales:event-2:${commandKind.toLowerCase()}`, commandKind,
          outcome: "APPLIED", stateRevisionBefore: 2, stateRevisionAfter: 3,
          stageBefore: "CART_OPEN", stageAfter: "CART_OPEN",
          cartId: "10000000-0000-4000-8000-000000000001", cartVersion: 2,
          reasonCode: null, occurredAt: now,
        }],
        effectReadiness: [],
      },
    }, now)).rejects.toThrow("EFFECT_READINESS_REQUIRED");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
    },
  );

  it("rejects cart mutation readiness that omits a final-cart product", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{
            routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-08-13T03:00:00.000Z"),
          }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("SELECT state_revision")) {
          return { rowCount: 1, rows: [{ state_revision: "2" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-08-13T03:00:00.000Z");
    const productScope = { kind: "PRODUCT" as const, productId: "SP-001", variantId: null };
    const provenance = (sourceVersion: string, contentHash: string) => ({
      authority: "POS_SNAPSHOT" as const,
      sourceVersion,
      evidenceRef: `cart-selection:${sourceVersion}`,
      contentHash,
      observedAt: "2026-08-13T02:59:00.000Z",
      expiresAt: "2026-08-13T03:05:00.000Z",
    });
    const claims = [{
      schemaVersion: 1 as const,
      claimId: "10000000-0000-4000-8000-000000000011",
      type: "PRICE" as const,
      scope: productScope,
      provenance: provenance("price:1", "1".repeat(64)),
      value: { amountVnd: 699_000, currency: "VND" as const },
      authorization: "NONE" as const,
    }, {
      schemaVersion: 1 as const,
      claimId: "10000000-0000-4000-8000-000000000012",
      type: "STOCK" as const,
      scope: productScope,
      provenance: provenance("inventory:1", "2".repeat(64)),
      value: { status: "IN_STOCK" as const, availableQuantity: 3 },
      authorization: "NONE" as const,
    }];
    const cartId = "10000000-0000-4000-8000-000000000013";
    const mutationCommandId = "sales:event-2:cart-mutation";

    const commitInput = {
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 4,
      state: { revision: 5, routingOwner: "APP", conversationOwner: "BOT" },
      salesCyclePlan: {
        expectedRevision: 2,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1",
        sourceMessageIdHash: "a".repeat(64),
        canonicalBuyingIntent: {
          schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1",
          decision: "NONE", requestedAction: "NONE", quantity: null,
          productId: null, contributors: [], sourceMessageIdHash: "a".repeat(64),
          evidenceHash: null, reasonCodes: [], evaluatedAt: "2026-08-13T02:59:00.000Z",
          authorization: "NONE",
        },
        state: {
          revision: 3,
          cart: { value: { cartId, revision: 2, lines: [
            { parentProductId: "SP-001" },
            { parentProductId: "SP-UNVERIFIED" },
          ] } },
        },
        cartExpiresAt: new Date("2026-08-14T03:00:00.000Z"),
        expiresAt: new Date("2026-08-14T03:00:00.000Z"),
        events: [{
          commandId: "sales:event-2:cart-mutation", commandKind: "CART_MUTATED",
          outcome: "APPLIED", stateRevisionBefore: 2, stateRevisionAfter: 3,
          stageBefore: "CART_OPEN", stageAfter: "CART_OPEN", cartId, cartVersion: 2,
          reasonCode: null, occurredAt: now,
        }],
        effectClaimSets: [{ effect: "CART_MUTATION", claims }],
        effectReadiness: [{
          schemaVersion: 1, rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
          effect: "CART_MUTATION", outcome: "READY", pageId: "page-1",
          conversationId: "33333333-3333-4333-8333-333333333333",
          sourceMessageIdHash: "a".repeat(64), conversationRevision: 4,
          salesCycleRevision: 2, productIds: ["SP-001"], cartId, cartVersion: 1,
          cartStateHash: "e".repeat(64),
          orderPreviewId: null, orderPreviewHash: null, buyingIntentHash: null,
          deterministicEvidenceHash: "d".repeat(64), claimSetHash: sha256(claims),
          protectedClaimTypes: [], checkedAt: now.toISOString(),
          expiresAt: "2026-08-13T03:01:00.000Z", reasonCodes: [], authorization: "NONE",
        }],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;

    const priceOnlyClaims = claims.filter(({ type }) => type === "PRICE");
    const missingSemanticClaims = {
      ...commitInput,
      salesCyclePlan: {
        ...commitInput.salesCyclePlan,
        state: {
          revision: 3,
          cart: { value: { cartId, revision: 2, lines: [
            { parentProductId: "SP-001" },
          ] } },
        },
        events: commitInput.salesCyclePlan.events.map((event) => ({
          ...event,
          commandKind: "CART_READY" as const,
        })),
        effectClaimSets: [{ effect: "ORDER_PREVIEW" as const, claims: priceOnlyClaims }],
        effectReadiness: commitInput.salesCyclePlan.effectReadiness.map((readiness) => ({
          ...readiness,
          effect: "ORDER_PREVIEW" as const,
          productIds: ["SP-001"],
          cartVersion: 2,
          cartStateHash: sha256({ cartId, revision: 2, lines: [
            { parentProductId: "SP-001" },
          ] }),
          deterministicEvidenceHash: null,
          claimSetHash: sha256(priceOnlyClaims),
        })),
      },
    };
    await expect(store.commit(missingSemanticClaims, now))
      .rejects.toThrow("EFFECT_READINESS_CLAIM_MISSING");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    await expect(store.commit(commitInput, now))
      .rejects.toThrow("EFFECT_READINESS_PRODUCT_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const exactCart = {
      cartId,
      revision: 2,
      lines: [{ parentProductId: "SP-001", offerId: "SET", quantity: 2 }],
    };
    const beforeCartStateHash = "9".repeat(64);
    const afterCartStateHash = sha256(exactCart);
    const evaluatedAt = now.toISOString();
    const evidenceCore = [
      "DETERMINISTIC_CART_MUTATION_EVIDENCE_V1",
      "SET_QUANTITY",
      "a".repeat(64),
      rawSha256(mutationCommandId),
      beforeCartStateHash,
      afterCartStateHash,
      evaluatedAt,
    ];
    const mutationEvidence = {
      schemaVersion: 1 as const,
      authorityVersion: "DETERMINISTIC_CART_MUTATION_EVIDENCE_V1" as const,
      action: "SET_QUANTITY" as const,
      sourceMessageIdHash: "a".repeat(64),
      commandIdHash: rawSha256(mutationCommandId),
      beforeCartStateHash,
      afterCartStateHash,
      evidenceHash: sha256(evidenceCore),
      evaluatedAt,
      contributor: "DETERMINISTIC_RUNTIME" as const,
      authorization: "NONE" as const,
    };
    const exactMutation = {
      ...commitInput,
      salesCyclePlan: {
        ...commitInput.salesCyclePlan,
        state: { revision: 3, cart: { value: exactCart } },
        cartMutationEvidence: [mutationEvidence],
        effectReadiness: commitInput.salesCyclePlan.effectReadiness.map((readiness) => ({
          ...readiness,
          productIds: ["SP-001"],
          cartVersion: 2,
          cartStateHash: afterCartStateHash,
          deterministicEvidenceHash: mutationEvidence.evidenceHash,
        })),
      },
    };
    const changedOfferWithoutNewReadiness = {
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        state: {
          revision: 3,
          cart: { value: {
            ...exactCart,
            lines: [{ parentProductId: "SP-001", offerId: "SEPARATE", quantity: 2 }],
          } },
        },
      },
    };
    await expect(store.commit(changedOfferWithoutNewReadiness, now))
      .rejects.toThrow("EFFECT_READINESS_CART_STATE_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const { cartMutationEvidence: _omittedEvidence, ...planWithoutMutationEvidence } =
      exactMutation.salesCyclePlan;
    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: planWithoutMutationEvidence,
    }, now)).rejects.toThrow("CART_MUTATION_EVIDENCE_REQUIRED");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
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
    const held = calls.find((call) => call.values.includes("META_PREDECESSOR_FAILED_PERMANENT"));
    expect(held?.sql).toContain("sequence_no > $2");
    expect(calls.some((call) => call.sql.includes("BOT_INITIAL_AD_REPLY_SEND_FAILED"))).toBe(false);
    const event = calls.find((call) => call.sql.includes("INSERT INTO conversation_events"));
    expect(event?.values).toContain("BOT_INITIAL_AD_REPLY_SEND_FAILED");
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");
  });
});

describe("PostgresRealtimeRuntimeStore response-group gate", () => {
  it("persists a durable decision and prevents terminal snapshots from being overwritten", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const row = {
      response_group_id: "50000000-0000-4000-8000-000000000003",
      source: "PANCAKE" as const,
      status: "ALLOWED",
      reason_code: null,
      blocking_tag: null,
      observed_at: new Date("2026-07-31T16:40:59.000Z"),
      attempt_count: 2,
      expires_at: new Date("2026-07-31T16:45:59.000Z"),
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        return { rowCount: 1, rows: [row] };
      },
      async end() {},
    };

    const existing = await store.readMetaResponseGroupGate(row.response_group_id);
    const recorded = await store.recordMetaResponseGroupGate({
      responseGroupId: row.response_group_id,
      replyPlanId: "50000000-0000-4000-8000-000000000002",
      conversationId: "50000000-0000-4000-8000-000000000001",
      pageId: "1198992073286645",
      observation: {
        status: "BLOCKED",
        reasonCode: "PANCAKE_BLOCKING_TAG_NHAN_VIEN",
        blockingTag: "NHAN_VIEN",
        observedAt: new Date("2026-07-31T16:41:00.008Z"),
      },
    });

    expect(existing).toEqual(recorded);
    expect(existing).toMatchObject({
      source: "PANCAKE",
      status: "ALLOWED",
      attemptCount: 2,
      expiresAt: new Date("2026-07-31T16:45:59.000Z"),
    });
    expect(calls[0]?.sql).toContain("WHERE response_group_id = $1");
    expect(calls[1]?.sql).toContain("ON CONFLICT (response_group_id) DO UPDATE");
    expect(calls[1]?.sql).toContain("meta_response_group_gates.status = 'UNVERIFIED'");
    expect(calls[1]?.values[4]).toBe("BLOCKED");
    expect(calls[1]?.values[6]).toBe("NHAN_VIEN");
  });
});

describe("PostgresRealtimeRuntimeStore outbox compatibility ordering and health", () => {
  const createStore = () => new PostgresRealtimeRuntimeStore(
    "postgresql://unused:unused@localhost:5432/unused",
    new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
  );

  it("claims preserved handoff output after owner transition and delays its tag dependency", async () => {
    const calls: string[] = [];
    const store = createStore();
    (store as unknown as { pool: unknown }).pool = {
      async query(sql: string) {
        calls.push(sql);
        return { rowCount: 0, rows: [] };
      },
    };

    expect(await store.claimMetaOutbox("worker-1", 30_000)).toBeNull();
    expect(await store.claimPancakeTagOutbox("tag-worker-1", 30_000)).toBeNull();

    expect(calls[0]).toContain("OR outbox.send_after_owner_handoff = true");
    expect(calls[0]).toContain("prior.status NOT IN");
    expect(calls[1]).toContain("after_response_group_id IS NULL");
    expect(calls[1]).toContain("dependency.status IN ('PENDING', 'RETRYABLE', 'SENDING')");
  });

  it("holds every descendant when a predecessor enters manual review", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("WHERE outbox_id = $1") && sql.includes("RETURNING reply_plan_id")) {
          return {
            rowCount: 1,
            rows: [{
              reply_plan_id: "10000000-0000-4000-8000-000000000001",
              sequence_no: 0,
            }],
          };
        }
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = createStore();
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
    };

    expect(await store.markMetaManualReview(
      "10000000-0000-4000-8000-000000000005",
      "10000000-0000-4000-8000-000000000006",
      "META_AMBIGUOUS_PROVIDER_RESULT",
    )).toBe(true);

    const held = calls.find((call) =>
      call.sql.includes("META_PREDECESSOR_MANUAL_REVIEW"));
    expect(held?.sql).toContain("sequence_no > $2");
    expect(held?.sql).toContain("status IN ('PENDING', 'RETRYABLE')");
    expect(calls[0]?.sql.trim()).toBe("BEGIN");
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");
  });

  it("quarantines expired sending leases once and holds descendants", async () => {
    const calls: string[] = [];
    const store = createStore();
    (store as unknown as { pool: unknown }).pool = {
      async query(sql: string) {
        calls.push(sql);
        return { rowCount: 1, rows: [{ quarantined_count: "1" }] };
      },
    };

    expect(await store.quarantineExpiredMetaSending()).toBe(1);
    expect(calls[0]).toContain("META_SENDING_LEASE_EXPIRED");
    expect(calls[0]).toContain("META_PREDECESSOR_AMBIGUOUS");
    expect(calls[0]).toContain("FROM expired");
  });

  it("returns a PII-free aggregate queue snapshot", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const store = createStore();
    (store as unknown as { pool: unknown }).pool = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        return { rows: [{
          actionable_count: "2",
          sending_count: "1",
          expired_sending_count: "1",
          manual_review_count: "3",
          stuck_descendant_count: "0",
          oldest_actionable_age_seconds: "45.5",
          oldest_manual_review_age_seconds: "90",
        }] };
      },
    };

    expect(await store.readMetaOutboxHealth("page-1")).toEqual({
      pageId: "page-1",
      actionableCount: 2,
      sendingCount: 1,
      expiredSendingCount: 1,
      manualReviewCount: 3,
      stuckDescendantCount: 0,
      oldestActionableAgeSeconds: 45.5,
      oldestManualReviewAgeSeconds: 90,
    });
    expect(calls[0]?.values).toEqual(["page-1"]);
    expect(calls[0]?.sql).not.toMatch(/ciphertext|recipient|customer_hash/iu);
  });
});

describe("PostgresRealtimeRuntimeStore manual-review operator action", () => {
  it("supports audited cancel-only resolution and never requeues", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    let firstUpdate = true;
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT page_id") && sql.includes("response_group_id")) {
          return {
            rowCount: 1,
            rows: [{
              page_id: "page-1",
              reviewable: firstUpdate,
              already_cancelled: !firstUpdate,
            }],
          };
        }
        if (sql.includes("UPDATE meta_outbox")) {
          const rowCount = firstUpdate ? 2 : 0;
          firstUpdate = false;
          return { rowCount, rows: [] };
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
    const groupId = "10000000-0000-4000-8000-000000000099";

    expect(await store.cancelMetaResponseGroup(
      groupId,
      "operator-1",
      "PROVIDER_AMBIGUITY_REVIEWED",
    )).toMatchObject({ cancelledCount: 2, changed: true });
    expect(await store.cancelMetaResponseGroup(
      groupId,
      "operator-1",
      "PROVIDER_AMBIGUITY_REVIEWED",
    )).toMatchObject({ cancelledCount: 0, changed: false });

    expect(calls.some((call) => call.sql.includes("bool_or(status IN"))).toBe(true);
    const update = calls.find((call) => call.sql.includes("UPDATE meta_outbox"));
    expect(update?.sql).toContain("SET status = 'FAILED_PERMANENT'");
    expect(update?.sql).not.toContain("'PENDING' AS");
    const audits = calls.filter((call) =>
      call.sql.includes("META_RESPONSE_GROUP_CANCELLED"));
    expect(audits).toHaveLength(1);
    expect(audits[0]?.values).toContain("operator-1");
  });
});

describe("PostgresRealtimeRuntimeStore markMetaAccepted", () => {
  type OutboxStatus = "SENDING" | "RETRYABLE" | "SENT_ACCEPTED" | "AMBIGUOUS" | "FAILED_PERMANENT" | "MANUAL_REVIEW";
  type OutboxState = {
    outboxId: string;
    status: OutboxStatus;
    leaseToken: string;
    lastErrorCode: string | null;
    providerMessageId: string | null;
    nextAttemptAt: string | null;
    attemptCount: number;
  };

  const createStore = (overrides: Partial<OutboxState> = {}) => {
    const state: OutboxState = {
      outboxId: "10000000-0000-4000-8000-000000000005",
      status: "SENDING",
      leaseToken: "10000000-0000-4000-8000-000000000006",
      lastErrorCode: "PANCAKE_CONVERSATION_NOT_FOUND",
      providerMessageId: null,
      nextAttemptAt: "2026-08-05T10:00:00.000Z",
      attemptCount: 2,
      ...overrides,
    };
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const query = async (sql: string, values: readonly unknown[] = []) => {
        calls.push({ sql, values });
        if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql.trim())) {
          return { rowCount: 0, rows: [] };
        }
        if (sql.includes("INSERT INTO audit_log")) {
          return { rowCount: 1, rows: [] };
        }
        if (sql.includes("SET status = 'SENT_ACCEPTED'")) {
          const [outboxId, leaseToken, providerMessageId] = values as [
            string,
            string,
            string,
          ];
          if (
            state.outboxId !== outboxId
            || state.status !== "SENDING"
            || state.leaseToken !== leaseToken
          ) {
            return { rowCount: 0, rows: [] };
          }
          const priorErrorCode = state.lastErrorCode;
          state.status = "SENT_ACCEPTED";
          state.providerMessageId = providerMessageId;
          state.lastErrorCode = null;
          state.nextAttemptAt = null;
          return {
            rowCount: 1,
            rows: [{ prior_error_code: priorErrorCode, attempt_count: state.attemptCount }],
          };
        }
        if (sql.includes("SET status = 'RETRYABLE'")) {
          const [outboxId, leaseToken, , errorCode] = values as [
            string,
            string,
            number,
            string,
          ];
          if (
            state.outboxId !== outboxId
            || state.status !== "SENDING"
            || state.leaseToken !== leaseToken
          ) {
            return { rowCount: 0, rows: [] };
          }
          state.status = "RETRYABLE";
          state.lastErrorCode = errorCode;
          state.nextAttemptAt = "scheduled";
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
    };
    const client = { query, release() {} };
    const pool = {
      query,
      async connect() { return client; },
      async end() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = pool;
    return { store, state, calls };
  };

  it("clears a prior attempt error atomically with accepted status", async () => {
    const { store, state, calls } = createStore();

    expect(await store.markMetaAccepted(
      state.outboxId,
      state.leaseToken,
      "mid-accepted",
    )).toBe(true);
    expect(state).toMatchObject({
      status: "SENT_ACCEPTED",
      providerMessageId: "mid-accepted",
      lastErrorCode: null,
      nextAttemptAt: null,
      attemptCount: 2,
    });
    const update = calls.find((call) => call.sql.includes("SET status = 'SENT_ACCEPTED'"));
    expect(update?.sql).toContain("last_error_code = NULL");
    expect(update?.sql).toContain("next_attempt_at = NULL");
    const audit = calls.find((call) => call.sql.includes("INSERT INTO audit_log"));
    expect(audit?.values[1]).toContain("PANCAKE_CONVERSATION_NOT_FOUND");
    expect(audit?.values[1]).toContain("attempt_count");
    expect(calls[0]?.sql.trim()).toBe("BEGIN");
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");
  });

  it("keeps an already-null error null and rejects an acceptance replay", async () => {
    const { store, state, calls } = createStore({ lastErrorCode: null });

    expect(await store.markMetaAccepted(
      state.outboxId,
      state.leaseToken,
      "mid-first",
    )).toBe(true);
    expect(await store.markMetaAccepted(
      state.outboxId,
      state.leaseToken,
      "mid-replay",
    )).toBe(false);
    expect(state).toMatchObject({
      status: "SENT_ACCEPTED",
      providerMessageId: "mid-first",
      lastErrorCode: null,
      nextAttemptAt: null,
    });
    expect(calls.filter((call) => call.sql.includes("INSERT INTO audit_log"))).toHaveLength(0);
  });

  it("preserves errors for retryable and rejected acceptance paths", async () => {
    const retry = createStore();
    expect(await retry.store.markMetaRetryable(
      retry.state.outboxId,
      retry.state.leaseToken,
      "META_TRANSPORT_TIMEOUT",
      2,
    )).toBe(true);
    expect(await retry.store.markMetaAccepted(
      retry.state.outboxId,
      retry.state.leaseToken,
      "mid-too-late",
    )).toBe(false);
    expect(retry.state).toMatchObject({
      status: "RETRYABLE",
      lastErrorCode: "META_TRANSPORT_TIMEOUT",
      nextAttemptAt: "scheduled",
    });

    const stale = createStore();
    expect(await stale.store.markMetaAccepted(
      stale.state.outboxId,
      "stale-lease-token",
      "mid-stale",
    )).toBe(false);
    expect(stale.state).toMatchObject({
      status: "SENDING",
      lastErrorCode: "PANCAKE_CONVERSATION_NOT_FOUND",
      providerMessageId: null,
      nextAttemptAt: "2026-08-05T10:00:00.000Z",
    });
  });

  it("does not clear errors when acceptance is attempted for any non-success state", async () => {
    for (const status of [
      "RETRYABLE",
      "AMBIGUOUS",
      "FAILED_PERMANENT",
      "MANUAL_REVIEW",
    ] as const) {
      const { store, state } = createStore({ status });
      expect(await store.markMetaAccepted(
        state.outboxId,
        state.leaseToken,
        "mid-invalid",
      )).toBe(false);
      expect(state.lastErrorCode).toBe("PANCAKE_CONVERSATION_NOT_FOUND");
    }
  });
});
