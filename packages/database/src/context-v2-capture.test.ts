import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { canonicalJsonV1, type ContextV2CaptureV1 } from "@lana/contracts";
import {
  insertContextV2Capture,
  persistContextV2CaptureFailSoft,
  prepareContextV2CaptureForCommit,
  inspectContextV2Capture,
  readLatestContextV2ForCommerce,
  probeContextV2CaptureRead,
} from "./context-v2-capture.js";
import { PostgresShadowEvaluationStore } from "./shadow-evaluation.js";

const hash = (character: string): string => character.repeat(64);
const messagePk = "00000000-0000-4000-8000-000000000099";
const occurredAt = new Date("2026-08-16T10:00:00.000Z");

function builtCapture(): ContextV2CaptureV1 {
  const draft = {
    schemaVersion: 2 as const,
    contractVersion: "CONTEXT_V2" as const,
    authority: "SHADOW_ONLY" as const,
    finalTurnEvidence: {
      schemaVersion: 2 as const,
      contractVersion: "FINAL_TURN_EVIDENCE_V2" as const,
      sourceMessagePk: messagePk,
      sourceMessageIdHash: hash("a"),
      preTransitionConversationRevision: 4,
      finalConversationRevision: 5,
      preTransitionSalesCycleRevision: 2,
      finalSalesCycleRevision: 3,
    },
    productBinding: {
      schemaVersion: 2 as const,
      contractVersion: "PRODUCT_BINDING_V2" as const,
      status: "NOT_REQUIRED" as const,
      productIds: [],
      catalogVersion: null,
    },
    dialogueEvidence: {
      act: "STATEMENT" as const,
      confidenceBand: "LOW" as const,
      evidenceHash: hash("b"),
      reasonCodes: [],
    },
    verifiedClaimSetHash: null,
    verifiedClaimTypes: [],
    verifiedClaims: [],
    phase: {
      schemaVersion: 2 as const,
      contractVersion: "CONVERSATION_PHASE_V2" as const,
      phase: "DISCOVERY" as const,
      source: "CANONICAL_COMMERCE_STATE_V1" as const,
      sourceStage: "DISCOVERY" as const,
      salesCycleRevision: 3,
      authority: "SHADOW_ONLY" as const,
    },
    barriers: {
      schemaVersion: 2 as const,
      contractVersion: "CONVERSATION_BARRIERS_V2" as const,
      active: [],
      lifecycle: "UNTIL_AUTHORITATIVE_STATE_CHANGES" as const,
      conversationRevision: 5,
      salesCycleRevision: 3,
      source: "CANONICAL_EVIDENCE_AND_COMMERCE_STATE_V1" as const,
      authority: "SHADOW_ONLY" as const,
    },
    buyingIntent: {
      decision: "NONE" as const,
      requestedAction: "NONE" as const,
      productId: null,
      evidenceHash: null,
    },
    cartReadiness: null,
    ownership: { owner: "BOT" as const, handoffActive: false, reasonCode: null },
    consumerContractVersions: {
      strategy: "CONTEXT_V2_STRATEGY_INPUT_V1" as const,
      cta: "CONTEXT_V2_CTA_INPUT_V1" as const,
      postMedia: "CONTEXT_V2_POST_MEDIA_INPUT_V1" as const,
      outputInterpretation: "CONTEXT_V2_OUTPUT_INTERPRETATION_V1" as const,
      audit: "CONTEXT_V2_AUDIT_V1" as const,
    },
  };
  const contextHash = createHash("sha256")
    .update(`CONTEXT_V2\n${canonicalJsonV1(draft)}`, "utf8")
    .digest("hex");
  return {
    schemaVersion: 1,
    contractVersion: "CONTEXT_V2_CAPTURE_V1",
    sourceMessagePk: messagePk,
    sourceOccurredAt: occurredAt.toISOString(),
    status: "BUILT",
    context: { ...draft, contextHash },
    contextHash,
    reasonCode: null,
  };
}

function withContext(
  capture: ContextV2CaptureV1,
  updates: Partial<NonNullable<ContextV2CaptureV1["context"]>>,
): ContextV2CaptureV1 {
  if (capture.context === null) throw new Error("TEST_CONTEXT_REQUIRED");
  const { contextHash: _oldHash, ...oldDraft } = capture.context;
  const draft = { ...oldDraft, ...updates };
  const contextHash = createHash("sha256")
    .update(`CONTEXT_V2\n${canonicalJsonV1(draft)}`, "utf8")
    .digest("hex");
  return { ...capture, context: { ...draft, contextHash }, contextHash };
}

function clientWith(rows: readonly unknown[], error?: Error): PoolClient {
  return {
    query: vi.fn(async () => {
      if (error) throw error;
      return { rows };
    }),
  } as unknown as PoolClient;
}

function input(now = new Date("2026-08-16T10:01:00.000Z")) {
  return {
    conversationId: "00000000-0000-4000-8000-000000000010",
    sourceMessagePk: messagePk,
    sourceOccurredAt: occurredAt,
    now,
    terminalDeadlineMs: 5 * 60_000,
  };
}

describe("Context V2 exact-message claim gate", () => {
  it("persists a deterministic terminal capture with conflict-safe identity", async () => {
    const query = vi.fn(async (
      _sql: string,
      _parameters?: readonly unknown[],
    ) => ({ rowCount: 1, rows: [] }));
    const client = { query } as unknown as PoolClient;
    const capture = builtCapture();
    await expect(insertContextV2Capture(client, {
      conversationId: "00000000-0000-4000-8000-000000000010",
      pageId: "page-1",
      customerHash: hash("f"),
      owner: "BOT",
    }, {
      capture,
    }, new Date("2026-08-16T10:00:30.000Z"))).resolves.toBe(true);
    const [sql, parameters] = query.mock.calls[0]!;
    expect(sql).toContain("ON CONFLICT (event_id, occurred_at) DO NOTHING");
    expect(parameters?.[0]).toMatch(/^[0-9a-f-]{36}$/u);
    expect(JSON.parse(String(parameters?.[5]))).toEqual(capture);
  });

  it("uses content-addressed identities so divergent captures become visible", async () => {
    const capture = builtCapture();
    const identity = {
      conversationId: "00000000-0000-4000-8000-000000000010",
      pageId: "page-1",
      customerHash: hash("f"),
      owner: "BOT" as const,
    };
    const query = vi.fn(async (
      _sql: string,
      _parameters?: readonly unknown[],
    ) => ({ rowCount: 1, rows: [] }));
    const client = { query } as unknown as PoolClient;
    await insertContextV2Capture(
      client,
      identity,
      { capture },
      new Date("2026-08-16T10:00:30.000Z"),
    );
    await insertContextV2Capture(
      client,
      identity,
      {
        capture: {
          ...capture,
          status: "BLOCKED",
          context: null,
          contextHash: null,
          reasonCode: "CONTEXT_V2_DIVERGED",
        },
      },
      new Date("2026-08-16T10:00:30.000Z"),
    );
    expect(query.mock.calls[0]?.[1]?.[0]).not.toBe(query.mock.calls[1]?.[1]?.[0]);
  });

  it("terminalizes stale claims and readiness using the transaction clock", async () => {
    const capture = builtCapture();
    const claim = {
      schemaVersion: 1 as const,
      claimId: "00000000-0000-4000-8000-000000000001",
      type: "PRICE" as const,
      scope: { kind: "PRODUCT" as const, productId: "SD398", variantId: null },
      value: { amountVnd: 699_000, currency: "VND" as const },
      provenance: {
        authority: "POS_SNAPSHOT" as const,
        sourceVersion: "pos:1",
        evidenceRef: "price:SD398",
        contentHash: hash("1"),
        observedAt: "2026-08-16T10:00:00.000Z",
        expiresAt: "2026-08-16T10:00:30.000Z",
      },
      authorization: "NONE" as const,
    };
    const withExpiredClaim = withContext(capture, {
      verifiedClaims: [claim],
      verifiedClaimTypes: ["PRICE"],
      verifiedClaimSetHash: hash("9"),
    });
    expect(prepareContextV2CaptureForCommit(
      withExpiredClaim,
      new Date("2026-08-16T10:00:30.000Z"),
    )).toMatchObject({
      status: "BLOCKED",
      reasonCode: "CONTEXT_V2_CLAIM_EXPIRED_AT_COMMIT",
    });

    const withExpiredReadiness = withContext(capture, {
      cartReadiness: {
        effect: "CART_READY",
        outcome: "READY",
        readinessHash: hash("e"),
        expiresAt: "2026-08-16T10:00:30.000Z",
      },
    });
    expect(prepareContextV2CaptureForCommit(
      withExpiredReadiness,
      new Date("2026-08-16T10:00:30.000Z"),
    )).toMatchObject({
      status: "BLOCKED",
      reasonCode: "CONTEXT_V2_READINESS_EXPIRED_AT_COMMIT",
    });

    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("clock_timestamp()")) {
          return { rowCount: 1, rows: [{ capture_now: new Date("2026-08-16T10:00:30.000Z") }] };
        }
        return { rowCount: 1, rows: [] };
      }),
    } as unknown as PoolClient;
    await expect(persistContextV2CaptureFailSoft(client, {
      conversationId: "00000000-0000-4000-8000-000000000010",
      pageId: "page-1",
      customerHash: hash("f"),
      owner: "BOT",
    }, { capture: withExpiredClaim })).resolves.toMatchObject({
      created: true,
      captureStatus: "BLOCKED",
    });
  });

  it("rolls back only the shadow savepoint when capture persistence fails", async () => {
    const statements: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        statements.push(sql);
        if (sql.includes("clock_timestamp()")) {
          return {
            rowCount: 1,
            rows: [{ capture_now: new Date("2026-08-16T10:00:30.000Z") }],
          };
        }
        if (sql.includes("INSERT INTO conversation_events")) {
          throw new Error("permission denied");
        }
        return { rowCount: 0, rows: [] };
      }),
    } as unknown as PoolClient;

    await expect(persistContextV2CaptureFailSoft(
      client,
      {
        conversationId: "00000000-0000-4000-8000-000000000010",
        pageId: "page-1",
        customerHash: hash("f"),
        owner: "BOT",
      },
      { capture: builtCapture() },
    )).resolves.toEqual({
      created: false,
      reasonCode: "CONTEXT_V2_CAPTURE_WRITE_FAILED",
      captureStatus: null,
    });
    expect(statements).toEqual([
      "SAVEPOINT context_v2_capture",
      "SELECT clock_timestamp() AS capture_now",
      expect.stringContaining("INSERT INTO conversation_events"),
      "ROLLBACK TO SAVEPOINT context_v2_capture",
      "RELEASE SAVEPOINT context_v2_capture",
    ]);
  });

  it("uses exact sourceMessagePk for correctness and a time range only for pruning", async () => {
    const client = clientWith([{ capture: builtCapture() }]);
    await expect(inspectContextV2Capture(client, input())).resolves.toMatchObject({
      kind: "BUILT_VALID",
    });
    const [sql, parameters] = vi.mocked(client.query).mock.calls[0]!;
    expect(sql).toContain("event_metadata->>'sourceMessagePk' = $4");
    expect(sql).toContain("occurred_at >= $2::timestamptz");
    expect(sql).toContain("occurred_at <= $3::timestamptz");
    expect(parameters?.[3]).toBe(messagePk);
  });

  it("treats duplicate captures as ambiguous instead of tie-breaking", async () => {
    const capture = builtCapture();
    await expect(inspectContextV2Capture(
      clientWith([{ capture }, { capture }]),
      input(),
    )).resolves.toEqual({
      kind: "AMBIGUOUS",
      captureCount: 2,
      reasonCode: "CONTEXT_V2_CAPTURE_AMBIGUOUS",
    });
  });

  it("distinguishes a pending capture from an absent capture after deadline", async () => {
    await expect(inspectContextV2Capture(
      clientWith([]),
      input(new Date("2026-08-16T10:04:59.999Z")),
    )).resolves.toEqual({ kind: "NOT_TERMINAL" });
    await expect(inspectContextV2Capture(
      clientWith([]),
      input(new Date("2026-08-16T10:05:00.000Z")),
    )).resolves.toEqual({
      kind: "ABSENT_AFTER_DEADLINE",
      reasonCode: "CONTEXT_V2_SNAPSHOT_ABSENT",
    });
  });

  it("keeps DB failure retryable and distinct from a missing capture", async () => {
    await expect(inspectContextV2Capture(
      clientWith([], new Error("permission denied")),
      input(),
    )).resolves.toEqual({
      kind: "DB_ERROR",
      reasonCode: "CONTEXT_V2_CAPTURE_READ_FAILED",
    });
  });

  it("fails readiness clearly when capture SELECT is unavailable", async () => {
    await expect(probeContextV2CaptureRead(
      clientWith([], new Error("permission denied")),
    )).rejects.toThrow("CONTEXT_V2_CAPTURE_READ_UNAVAILABLE");
  });

  it("admits only the newest fresh, integrity-valid Context V2 snapshot for a Commerce consumer", async () => {
    const capture = builtCapture();
    const client = clientWith([{ capture }]);

    await expect(readLatestContextV2ForCommerce(client, {
      conversationId: "00000000-0000-4000-8000-000000000010",
      now: new Date("2026-08-16T10:01:00.000Z"),
      maximumAgeMs: 5 * 60_000,
    })).resolves.toEqual({
      kind: "READY",
      context: capture.context,
    });

    const [sql, parameters] = vi.mocked(client.query).mock.calls[0]!;
    expect(sql).toContain("ORDER BY occurred_at DESC, event_id DESC");
    expect(sql).toContain("LIMIT 1");
    expect(parameters).toEqual(["00000000-0000-4000-8000-000000000010"]);
  });

  it("fails closed instead of falling back to an older Context V2 snapshot", async () => {
    const blocked = {
      ...builtCapture(),
      status: "BLOCKED" as const,
      context: null,
      contextHash: null,
      reasonCode: "CONTEXT_V2_COMMERCE_STATE_UNAVAILABLE",
    };

    await expect(readLatestContextV2ForCommerce(clientWith([{ capture: blocked }]), {
      conversationId: "00000000-0000-4000-8000-000000000010",
      now: new Date("2026-08-16T10:01:00.000Z"),
      maximumAgeMs: 5 * 60_000,
    })).resolves.toEqual({
      kind: "BLOCKED",
      reasonCode: "CONTEXT_V2_COMMERCE_STATE_UNAVAILABLE",
    });

    await expect(readLatestContextV2ForCommerce(clientWith([{ capture: builtCapture() }]), {
      conversationId: "00000000-0000-4000-8000-000000000010",
      now: new Date("2026-08-16T10:05:00.001Z"),
      maximumAgeMs: 5 * 60_000,
    })).resolves.toEqual({
      kind: "STALE",
      reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_STALE",
    });
  });
});

function candidateStore(query: ReturnType<typeof vi.fn>) {
  const client = { query, release: vi.fn() };
  const store = new PostgresShadowEvaluationStore(
    "postgresql://unused:unused@localhost:5432/unused",
    { contextV2CaptureDeadlineSeconds: 300 },
  );
  (store as unknown as { pool: unknown }).pool = {
    connect: vi.fn(async () => client),
    query,
    end: vi.fn(),
  };
  return store;
}

describe("async candidate claim state machine", () => {
  it("populates one candidate queue item per exact terminal source message", async () => {
    const query = vi.fn(async (sql: string, parameters?: readonly unknown[]) => {
      expect(sql).toContain("SELECT DISTINCT ON (message.message_pk)");
      expect(sql).toContain("message.message_pk::text = event.event_metadata->>'sourceMessagePk'");
      expect(sql).toContain("'context-v2-candidate-v1:' || source.message_pk::text");
      expect(sql).toContain("message.dlp_status = 'PASSED'");
      expect(sql).toContain("NOT EXISTS");
      expect(sql).toContain("event.occurred_at >= now() - interval '6 months'");
      expect(parameters).toEqual([100]);
      return { rows: [], rowCount: 2 };
    });
    await expect(candidateStore(query).enqueueContextV2CandidateCaptures())
      .resolves.toBe(2);
  });

  it("keeps every terminal exclusion in a page/time-bounded coverage denominator", async () => {
    const from = new Date("2026-08-01T00:00:00.000Z");
    const to = new Date("2026-08-08T00:00:00.000Z");
    const query = vi.fn(async (sql: string, parameters?: readonly unknown[]) => {
      expect(sql).toContain("FROM conversation_events event");
      expect(sql).toContain("event.page_id = $1");
      expect(sql).toContain("event.occurred_at >= $2");
      expect(sql).toContain("event.occurred_at < $3");
      expect(sql).toContain("LEFT JOIN messages message");
      expect(sql).toContain("CONTEXT_V2_SOURCE_DLP_INELIGIBLE");
      expect(sql).toContain("CONTEXT_V2_CAPTURE_SOURCE_PK_INVALID");
      expect(parameters).toEqual(["1198992073286645", from, to]);
      return {
        rows: [
          { category: "SCORED", reason_code: null, enqueued: true, item_count: "7" },
          { category: "EXCLUDED", reason_code: "CONTEXT_V2_CAPTURE_AMBIGUOUS", enqueued: true, item_count: "2" },
          { category: "EXCLUDED", reason_code: "CONTEXT_V2_CAPTURE_SCHEMA_INVALID", enqueued: true, item_count: "1" },
          { category: "EXCLUDED", reason_code: "CONTEXT_V2_SOURCE_DLP_INELIGIBLE", enqueued: false, item_count: "2" },
          { category: "PENDING", reason_code: null, enqueued: true, item_count: "3" },
          { category: "PENDING", reason_code: null, enqueued: false, item_count: "1" },
        ],
        rowCount: 6,
      };
    });
    await expect(candidateStore(query).contextV2CandidateCoverage({
      pageId: "1198992073286645",
      from,
      to,
    })).resolves
      .toEqual({
        denominator: 16,
        terminalCaptures: 16,
        enqueued: 13,
        scored: 7,
        excludedTerminal: 5,
        pending: 4,
        exclusionReasonCounts: {
          CONTEXT_V2_CAPTURE_AMBIGUOUS: 2,
          CONTEXT_V2_CAPTURE_SCHEMA_INVALID: 1,
          CONTEXT_V2_SOURCE_DLP_INELIGIBLE: 2,
        },
      });
  });

  it("rejects an unbounded coverage census before querying", async () => {
    const query = vi.fn();
    await expect(candidateStore(query).contextV2CandidateCoverage({
      pageId: "1198992073286645",
      from: new Date("2026-01-01T00:00:00.000Z"),
      to: new Date("2026-08-01T00:00:00.000Z"),
    })).rejects.toThrow("CONTEXT_V2_COVERAGE_WINDOW_INVALID");
    expect(query).not.toHaveBeenCalled();
  });

  it("recovers expired processing leases before selecting another job", async () => {
    const statements: string[] = [];
    const query = vi.fn(async (sql: string) => {
      statements.push(sql);
      return { rows: [], rowCount: 0 };
    });
    await expect(candidateStore(query).claimContextV2CandidateNext())
      .resolves.toEqual({ kind: "NONE" });
    expect(statements[1]).toContain("CONTEXT_V2_CANDIDATE_LEASE_EXPIRED");
    expect(statements[2]).toContain("SELECT evaluation_id");
  });

  it("claims and consumes an attempt only after BUILT_VALID", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT evaluation_id")) {
        return { rows: [{
          evaluation_id: "evaluation-1",
          source_message_pk: messagePk,
          source_occurred_at: occurredAt,
          conversation_id: "00000000-0000-4000-8000-000000000010",
          transaction_now: new Date(occurredAt.getTime() + 60_000),
        }] };
      }
      if (sql.includes("SELECT event_metadata AS capture")) {
        return { rows: [{ capture: builtCapture() }] };
      }
      if (sql.includes("attempt_count = attempt_count + 1")) {
        return { rows: [{ claim_token: "claim-1" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    await expect(candidateStore(query).claimContextV2CandidateNext())
      .resolves.toMatchObject({ kind: "CLAIMED", claimToken: "claim-1" });
    expect(query.mock.calls.some(([sql]) =>
      String(sql).includes("attempt_count = attempt_count + 1")
    )).toBe(true);
  });

  it("rolls back DB failure without consuming an attempt", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT evaluation_id")) {
        return { rows: [{
          evaluation_id: "evaluation-1",
          source_message_pk: messagePk,
          source_occurred_at: occurredAt,
          conversation_id: "00000000-0000-4000-8000-000000000010",
          transaction_now: new Date(occurredAt.getTime() + 60_000),
        }] };
      }
      if (sql.includes("SELECT event_metadata AS capture")) {
        throw new Error("permission denied");
      }
      return { rows: [], rowCount: 0 };
    });
    await expect(candidateStore(query).claimContextV2CandidateNext())
      .rejects.toThrow("CONTEXT_V2_CAPTURE_READ_FAILED");
    expect(query.mock.calls.some(([sql]) =>
      String(sql).includes("attempt_count = attempt_count + 1")
    )).toBe(false);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("ROLLBACK")))
      .toBe(true);
  });

  it("accounts for BLOCKED terminally without calling or attempting a model", async () => {
    const blocked = {
      ...builtCapture(),
      status: "BLOCKED",
      context: null,
      contextHash: null,
      reasonCode: "CONTEXT_V2_READINESS_BINDING_MISMATCH",
    };
    const query = vi.fn(async (sql: string, parameters?: readonly unknown[]) => {
      if (sql.includes("SELECT evaluation_id")) {
        return { rows: [{
          evaluation_id: "evaluation-1",
          source_message_pk: messagePk,
          source_occurred_at: occurredAt,
          conversation_id: "00000000-0000-4000-8000-000000000010",
          transaction_now: new Date(occurredAt.getTime() + 60_000),
        }] };
      }
      if (sql.includes("SELECT event_metadata AS capture")) {
        return { rows: [{ capture: blocked }] };
      }
      if (sql.includes("status = 'FAILED_PERMANENT'")) {
        expect(parameters?.[1]).toBe("CONTEXT_V2_READINESS_BINDING_MISMATCH");
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    await expect(candidateStore(query).claimContextV2CandidateNext())
      .resolves.toEqual({
        kind: "TERMINAL",
        reasonCode: "CONTEXT_V2_READINESS_BINDING_MISMATCH",
      });
    expect(query.mock.calls.some(([sql]) =>
      String(sql).includes("attempt_count = attempt_count + 1")
    )).toBe(false);
  });

  it("releases a run-blocked candidate without consuming its attempt", async () => {
    const query = vi.fn(async (sql: string, parameters?: readonly unknown[]) => {
      expect(sql).toContain("attempt_count = GREATEST(0, attempt_count - 1)");
      expect(sql).toContain("prompt_version = 'context-v2-candidate-v1'");
      expect(parameters).toEqual([
        "evaluation-1",
        "claim-1",
        "CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_MISMATCH",
      ]);
      return { rows: [], rowCount: 1 };
    });
    await expect(candidateStore(query).releaseContextV2CandidateRunBlocked({
      evaluationId: "evaluation-1",
      claimToken: "claim-1",
      reasonCode: "CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_MISMATCH",
    })).resolves.toBeUndefined();
  });

  it("puts an explicit prompt-owner predicate on every exercised queue mutation", async () => {
    const mutations: string[] = [];
    const query = vi.fn(async (sql: string) => {
      if (/UPDATE shadow_evaluations/u.test(sql)) mutations.push(sql);
      return { rows: [], rowCount: 1 };
    });
    const store = candidateStore(query);

    await store.claimNext();
    await store.claimComparisonNext();
    await store.fail("legacy-1", "legacy-token", "TEST", true, 3);
    await store.complete("legacy-1", "legacy-token", {
      proposal: null,
      guardedPlan: null,
      blockedReasonCodes: [],
      modelProvider: "test",
      modelName: "test",
      modelVersion: "test",
      latencyMs: 0,
      tokenUsage: {},
      textSimilarity: null,
      inputContextHash: "test",
      actualOutboundText: null,
      actualOutboundCount: 0,
      businessFactAudit: null,
      businessFactEnvelope: null,
    });
    await store.completeComparison({
      evaluationId: "legacy-1",
      claimToken: "legacy-token",
      proposalReply: "",
      actualOutboundText: "",
      actualOutboundCount: 0,
      context: [],
      proposalSummary: null,
      guardOutcome: null,
      businessFactEnvelope: null,
    }, 0, null);
    await store.failContextV2Candidate({
      evaluationId: "candidate-1",
      claimToken: "candidate-token",
      errorCode: "TEST",
      retryable: true,
    });
    await store.completeContextV2Candidate({
      evaluationId: "candidate-1",
      claimToken: "candidate-token",
      output: null,
      providerModelVersion: "test",
      requestIdentity: null,
    });

    expect(mutations.length).toBeGreaterThanOrEqual(8);
    for (const sql of mutations) {
      expect(sql).toMatch(
        /prompt_version\s*(?:=\s*'context-v2-candidate-v1'|NOT LIKE\s*'context-v2-candidate-%')/u,
      );
    }
  });
});
