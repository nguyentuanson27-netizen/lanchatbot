import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { canonicalJsonV1, type ContextV2CaptureV1 } from "@lana/contracts";
import {
  insertContextV2Capture,
  persistContextV2CaptureFailSoft,
  prepareContextV2CaptureForCommit,
  inspectContextV2Capture,
  probeContextV2CaptureRead,
} from "./context-v2-capture.js";

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

  it("terminalizes stale claims and readiness using the transaction clock", () => {
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
});
