import { beforeEach, describe, expect, it, vi } from "vitest";

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

function rowResult(rows: readonly unknown[] = [], rowCount = rows.length) {
  return { rows, rowCount };
}

describe("Postgres DF13 Commerce fence store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.release });
  });

  it("atomically claims every Inbox ID with a fresh opaque token and epoch", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM df13_commerce_authority_fences")) return rowResult();
      if (sql.includes("FROM webhook_inbox")) {
        return rowResult(request.inboxIds.map((inboxId) => ({ inbox_id: inboxId, page_id: request.pageId })));
      }
      if (sql.includes("FROM df13_commerce_authority_fence_claims")) return rowResult();
      if (sql.includes("INSERT INTO df13_commerce_authority_fences")) {
        return rowResult([{ fence_id: "20000000-0000-4000-8000-000000000001", epoch: "1" }]);
      }
      if (sql.includes("INSERT INTO df13_commerce_authority_fence_claims")) {
        return rowResult(request.inboxIds.map((inboxId) => ({ inbox_id: inboxId })));
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    const result = await store.acquire(request);

    expect(result).toMatchObject({ status: "HELD", lease: { epoch: 1 } });
    expect(result.status === "HELD" && result.lease.fenceToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
    );
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toEqual(expect.arrayContaining([
      "BEGIN",
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringContaining("FOR UPDATE"),
      expect.stringContaining("INSERT INTO df13_commerce_authority_fence_claims"),
      "COMMIT",
    ]));
    const inboxLock = statements.find((sql) => sql.includes("FROM webhook_inbox"));
    expect(inboxLock).toContain("ORDER BY inbox_id");
    expect(inboxLock).toContain("FOR UPDATE");
    expect(statements.some((sql) => sql.includes("UPDATE webhook_inbox"))).toBe(false);
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("parks without touching Inbox state when any requested Inbox ID is already live in another fence", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM df13_commerce_authority_fences")) return rowResult();
      if (sql.includes("FROM webhook_inbox")) {
        return rowResult(request.inboxIds.map((inboxId) => ({ inbox_id: inboxId, page_id: request.pageId })));
      }
      if (sql.includes("FROM df13_commerce_authority_fence_claims")) {
        return rowResult([{ inbox_id: request.inboxIds[0] }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.acquire(request)).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_FENCE_OVERLAPPING_LEASE",
    });
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("INSERT INTO df13_commerce_authority_fences"))).toBe(false);
    expect(statements.some((sql) => sql.includes("UPDATE webhook_inbox"))).toBe(false);
  });

  it("returns an already-completed replay result without issuing a new token", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM df13_commerce_authority_fences")) {
        return rowResult([{
          fence_id: "20000000-0000-4000-8000-000000000001",
          epoch: "7",
          completed_at: new Date("2026-08-23T00:00:00.000Z"),
          lease_until: null,
          sales_authority_mode: request.authority.salesAuthorityMode,
          state_read_mode: request.authority.stateReadMode,
          mode_version_id: request.authority.modeVersionId,
          content_hash: request.authority.contentHash,
          pointer_revision: request.authority.pointerRevision,
          authority_bundle_hash: request.authority.authorityBundleHash,
          authority_source: request.authority.source,
          inbox_ids: request.inboxIds,
          request_fingerprint: df13CommerceFenceRequestFingerprint(request),
        }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.acquire(request)).resolves.toEqual({ status: "ALREADY_COMPLETED", epoch: 7 });
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements.some((sql) => sql.includes("INSERT INTO df13_commerce_authority_fences"))).toBe(false);
  });

  it("parks a changed content identity instead of reusing the work ID with copied authority fields", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM df13_commerce_authority_fences")) {
        return rowResult([{
          fence_id: "20000000-0000-4000-8000-000000000001",
          epoch: "7",
          completed_at: null,
          lease_until: new Date("2026-08-23T00:10:00.000Z"),
          sales_authority_mode: request.authority.salesAuthorityMode,
          state_read_mode: request.authority.stateReadMode,
          mode_version_id: request.authority.modeVersionId,
          content_hash: `sha256:${"d".repeat(64)}`,
          pointer_revision: request.authority.pointerRevision,
          authority_bundle_hash: request.authority.authorityBundleHash,
          authority_source: request.authority.source,
          inbox_ids: request.inboxIds,
          request_fingerprint: df13CommerceFenceRequestFingerprint({
            ...request,
            authority: { ...request.authority, contentHash: `sha256:${"d".repeat(64)}` },
          }),
        }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.acquire(request, new Date("2026-08-23T00:00:00.000Z"))).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_FENCE_IDENTITY_MISMATCH",
    });
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("INSERT INTO df13_commerce_authority_fences"))).toBe(false);
  });

  it("rolls back the complete acquisition when it cannot claim every requested Inbox ID", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM df13_commerce_authority_fences")) return rowResult();
      if (sql.includes("FROM webhook_inbox")) {
        return rowResult(request.inboxIds.map((inboxId) => ({ inbox_id: inboxId, page_id: request.pageId })));
      }
      if (sql.includes("FROM df13_commerce_authority_fence_claims")) return rowResult();
      if (sql.includes("INSERT INTO df13_commerce_authority_fences")) {
        return rowResult([{ fence_id: "20000000-0000-4000-8000-000000000001", epoch: "1" }]);
      }
      if (sql.includes("INSERT INTO df13_commerce_authority_fence_claims")) {
        return rowResult([{ inbox_id: request.inboxIds[0] }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.acquire(request)).rejects.toThrow("DF13_FENCE_CLAIM_INTEGRITY_FAILURE");
    expect(mocks.clientQuery.mock.calls.map(([sql]) => String(sql))).toContain("ROLLBACK");
  });

  it("makes stale token/epoch completion ineffective without releasing another holder's claims", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("UPDATE df13_commerce_authority_fences")) return rowResult([], 0);
      return rowResult();
    });
    const store = new PostgresDf13CommerceFenceStore("postgresql://test");

    await expect(store.complete({
      request,
      lease: { fenceToken: "10000000-0000-4000-8000-000000000003", epoch: 3 },
    })).resolves.toEqual({ status: "STALE" });
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements.some((sql) => sql.includes("UPDATE df13_commerce_authority_fence_claims"))).toBe(false);
  });
});
