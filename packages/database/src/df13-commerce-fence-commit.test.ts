import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RealtimeCommitInput, RealtimeCommitResult } from "./realtime-runtime.js";

const mocks = vi.hoisted(() => ({
  clientQuery: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: class {
    connect() { return mocks.connect(); }
  },
}));

import {
  df13CommerceFenceRequestFingerprint,
  PostgresDf13CommerceFenceStore,
  type Df13CommerceRuntimeCommitPort,
} from "./df13-commerce-fence.js";

const request = Object.freeze({
  pageId: "1198992073286645",
  channel: "MESSENGER",
  workId: "commerce-batch-1",
  inboxIds: Object.freeze([
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
  ]),
  authority: Object.freeze({
    salesAuthorityMode: "COMMERCE" as const,
    stateReadMode: "LEGACY" as const,
    modeVersionId: "10000000-0000-4000-8000-000000000006",
    contentHash: `sha256:${"c".repeat(64)}`,
    pointerRevision: 6,
    authorityBundleHash: "a".repeat(64),
    source: "DATABASE" as const,
  }),
});

const lease = Object.freeze({ fenceToken: "10000000-0000-4000-8000-000000000099", epoch: 3 });
const databaseNow = new Date("2026-08-24T00:00:00.000Z");

const runtimeCommit: RealtimeCommitInput<{ revision: number }> = Object.freeze({
  pageId: request.pageId,
  customerHash: "customer-hash",
  conversationId: "10000000-0000-4000-8000-000000000077",
  expectedStateVersion: 4,
  state: { revision: 5 },
  inboxBatchGuard: {
    generation: 2,
    leaseToken: "runtime-inbox-lease",
    inboxIds: [...request.inboxIds].reverse(),
  },
  contextV2CapturePlan: { capture: { status: "BUILT" } as never },
});

function rowResult(rows: readonly unknown[] = [], rowCount = rows.length) {
  return { rows, rowCount };
}

function activeFence() {
  return {
    fence_id: "20000000-0000-4000-8000-000000000001",
    epoch: String(lease.epoch),
    completed_at: null,
    lease_until: new Date("2026-08-24T00:05:00.000Z"),
    token_hash: createHash("sha256").update(lease.fenceToken, "utf8").digest("hex"),
    request_fingerprint: df13CommerceFenceRequestFingerprint(request),
    sales_authority_mode: request.authority.salesAuthorityMode,
    state_read_mode: request.authority.stateReadMode,
    mode_version_id: request.authority.modeVersionId,
    content_hash: request.authority.contentHash,
    pointer_revision: request.authority.pointerRevision,
    authority_bundle_hash: request.authority.authorityBundleHash,
    authority_source: request.authority.source,
    inbox_ids: request.inboxIds,
  };
}

function runtime(overrides: Partial<Df13CommerceRuntimeCommitPort> = {}): Df13CommerceRuntimeCommitPort {
  return {
    async commitWithinTransaction(): Promise<RealtimeCommitResult> {
      return {
        stateCommitted: true,
        metaOutboxCreated: 1,
        pancakeTagOutboxCreated: false,
        handoffEventCreated: false,
        sendAuthorized: true,
        reasonCodes: [],
        inboxBatchStatus: "COMMITTED",
        contextV2CaptureCreated: true,
        contextV2CaptureReasonCode: null,
      };
    },
    ...overrides,
  };
}

describe("Postgres DF13 Commerce fence atomic consumer commit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.release });
  });

  it("commits the durable runtime plan and exact fence completion/release in one transaction", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT clock_timestamp() AS now")) return rowResult([{ now: databaseNow }]);
      if (sql.includes("FROM df13_commerce_authority_fences")) return rowResult([activeFence()]);
      if (sql.includes("UPDATE df13_commerce_authority_fence_claims")) {
        return rowResult(request.inboxIds.map((inboxId) => ({ inbox_id: inboxId })));
      }
      if (sql.includes("UPDATE df13_commerce_authority_fences")) return rowResult([{ fence_id: activeFence().fence_id }]);
      return rowResult();
    });
    const commitWithinTransaction = vi.fn(runtime().commitWithinTransaction);
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.commitAuthorityDependentWork({ request, lease, runtimeCommit }, {
      commitWithinTransaction,
    }, new Date("2026-08-24T00:00:00.000Z"))).resolves.toMatchObject({
      status: "COMPLETED",
      epoch: lease.epoch,
    });

    expect(commitWithinTransaction).toHaveBeenCalledOnce();
    expect(commitWithinTransaction.mock.calls[0]?.[0]).toMatchObject({
      query: mocks.clientQuery,
      release: mocks.release,
    });
    expect(commitWithinTransaction.mock.calls[0]?.[1]).toEqual(runtimeCommit);
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toEqual(expect.arrayContaining([
      "BEGIN",
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringContaining("UPDATE df13_commerce_authority_fence_claims"),
      expect.stringContaining("SET completed_at = $2, token_hash = NULL, lease_until = NULL"),
      "COMMIT",
    ]));
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("rolls back without completing or releasing the fence when the durable consumer commit fails", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT clock_timestamp() AS now")) return rowResult([{ now: databaseNow }]);
      if (sql.includes("FROM df13_commerce_authority_fences")) return rowResult([activeFence()]);
      return rowResult();
    });
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.commitAuthorityDependentWork({ request, lease, runtimeCommit }, runtime({
      async commitWithinTransaction() { throw new Error("RUNTIME_WRITE_FAILED"); },
    }), new Date("2026-08-24T00:00:00.000Z"))).rejects.toThrow("RUNTIME_WRITE_FAILED");

    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("UPDATE df13_commerce_authority_fence_claims"))).toBe(false);
    expect(statements.some((sql) => sql.includes("SET completed_at = $2"))).toBe(false);
  });

  it("treats an acknowledged-after-commit replay as completed without running the durable plan again", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT clock_timestamp() AS now")) return rowResult([{ now: databaseNow }]);
      if (sql.includes("FROM df13_commerce_authority_fences")) {
        return rowResult([{ ...activeFence(), completed_at: new Date("2026-08-24T00:01:00.000Z") }]);
      }
      return rowResult();
    });
    const commitWithinTransaction = vi.fn(runtime().commitWithinTransaction);
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.commitAuthorityDependentWork({ request, lease, runtimeCommit }, {
      commitWithinTransaction,
    }, new Date("2026-08-24T00:00:00.000Z"))).resolves.toEqual({
      status: "ALREADY_COMPLETED",
      epoch: lease.epoch,
    });

    expect(commitWithinTransaction).not.toHaveBeenCalled();
    expect(mocks.clientQuery.mock.calls.map(([sql]) => String(sql))).toContain("COMMIT");
  });

  it("fails closed before durable work when a holder is stale or the runtime batch is not the held Inbox set", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT clock_timestamp() AS now")) return rowResult([{ now: databaseNow }]);
      if (sql.includes("FROM df13_commerce_authority_fences")) return rowResult([activeFence()]);
      return rowResult();
    });
    const commitWithinTransaction = vi.fn(runtime().commitWithinTransaction);
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.commitAuthorityDependentWork({
      request,
      lease: { ...lease, fenceToken: "10000000-0000-4000-8000-000000000098" },
      runtimeCommit,
    }, { commitWithinTransaction }, new Date("2026-08-24T00:00:00.000Z"))).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_FENCE_LEASE_STALE",
    });
    await expect(store.commitAuthorityDependentWork({
      request,
      lease,
      runtimeCommit: {
        ...runtimeCommit,
        inboxBatchGuard: { ...runtimeCommit.inboxBatchGuard!, inboxIds: [] },
      },
    }, { commitWithinTransaction }, new Date("2026-08-24T00:00:00.000Z"))).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_FENCE_RUNTIME_INBOX_BINDING_INVALID",
    });

    expect(commitWithinTransaction).not.toHaveBeenCalled();
    expect(mocks.clientQuery.mock.calls.map(([sql]) => String(sql)).filter((sql) => sql === "ROLLBACK")).toHaveLength(2);
  });

  it("rolls back and retains the fence when the durable runtime does not commit the held Inbox batch", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT clock_timestamp() AS now")) return rowResult([{ now: databaseNow }]);
      if (sql.includes("FROM df13_commerce_authority_fences")) return rowResult([activeFence()]);
      return rowResult();
    });
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.commitAuthorityDependentWork({ request, lease, runtimeCommit }, runtime({
      async commitWithinTransaction() {
        return {
          stateCommitted: false,
          metaOutboxCreated: 0,
          pancakeTagOutboxCreated: false,
          handoffEventCreated: false,
          sendAuthorized: false,
          reasonCodes: ["STALE"],
          inboxBatchStatus: "SUPERSEDED",
        };
      },
    }), new Date("2026-08-24T00:00:00.000Z"))).rejects.toThrow("DF13_FENCE_RUNTIME_COMMIT_NOT_APPLIED");

    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("UPDATE df13_commerce_authority_fence_claims"))).toBe(false);
    expect(statements.some((sql) => sql.includes("SET completed_at = $2"))).toBe(false);
  });

  it("requires the existing runtime store to report a committed Inbox batch, not merely a committed state", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT clock_timestamp() AS now")) return rowResult([{ now: databaseNow }]);
      if (sql.includes("FROM df13_commerce_authority_fences")) return rowResult([activeFence()]);
      return rowResult();
    });
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.commitAuthorityDependentWork({ request, lease, runtimeCommit }, runtime({
      async commitWithinTransaction() {
        return {
          stateCommitted: true,
          metaOutboxCreated: 1,
          pancakeTagOutboxCreated: false,
          handoffEventCreated: false,
          sendAuthorized: true,
          reasonCodes: [],
          inboxBatchStatus: "NOT_REQUESTED",
        };
      },
    }), new Date("2026-08-24T00:00:00.000Z"))).rejects.toThrow("DF13_FENCE_RUNTIME_COMMIT_NOT_APPLIED");

    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("UPDATE df13_commerce_authority_fence_claims"))).toBe(false);
  });

  it("rolls back the full transaction when the holder expires while durable runtime work is in flight", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT clock_timestamp() AS now")) return rowResult([{ now: databaseNow }]);
      if (sql.includes("FROM df13_commerce_authority_fences")) return rowResult([activeFence()]);
      if (sql.includes("UPDATE df13_commerce_authority_fence_claims")) {
        return rowResult(request.inboxIds.map((inboxId) => ({ inbox_id: inboxId })));
      }
      if (sql.includes("UPDATE df13_commerce_authority_fences")) {
        return sql.includes("lease_until > clock_timestamp()")
          ? rowResult([], 0)
          : rowResult([{ fence_id: activeFence().fence_id }]);
      }
      return rowResult();
    });
    const commitWithinTransaction = vi.fn(runtime().commitWithinTransaction);
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.commitAuthorityDependentWork({ request, lease, runtimeCommit }, {
      commitWithinTransaction,
    }, new Date("2000-01-01T00:00:00.000Z"))).rejects.toThrow("DF13_FENCE_COMPLETION_WRITE_FAILED");

    expect(commitWithinTransaction).toHaveBeenCalledOnce();
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("SELECT clock_timestamp() AS now");
    expect(statements).toContain("ROLLBACK");
  });
});
