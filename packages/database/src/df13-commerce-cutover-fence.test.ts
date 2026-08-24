import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clientQuery: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: class {
    connect() { return mocks.connect(); }
    query(...args: unknown[]) { return mocks.clientQuery(...args); }
    end() { return Promise.resolve(); }
  },
}));

import {
  df13CommerceCutoverFenceRequestFingerprint,
  PostgresDf13CommerceCutoverFenceStore,
} from "./df13-commerce-cutover-fence.js";
import * as databasePublicApi from "./index.js";

const request = Object.freeze({
  operationId: "10000000-0000-4000-8000-000000000010",
  pageId: "1198992073286645",
  channel: "MESSENGER",
  preCutover: Object.freeze({
    modeVersionId: "10000000-0000-4000-8000-000000000001",
    contentHash: `sha256:${"a".repeat(64)}`,
    pointerRevision: 3,
  }),
  target: Object.freeze({
    modeVersionId: "10000000-0000-4000-8000-000000000002",
    contentHash: `sha256:${"b".repeat(64)}`,
    authorityBundleHash: "c".repeat(64),
  }),
});

function rowResult(rows: readonly unknown[] = [], rowCount = rows.length) {
  return { rows, rowCount };
}

describe("Postgres DF13 Commerce cutover fence store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.release });
  });

  it("exports only a narrow durable-fence port", () => {
    const factory = databasePublicApi.createDf13CommerceCutoverFencePort;
    expect(factory).toBeTypeOf("function");
    const port = factory("postgresql://test");
    expect(port).toEqual(expect.objectContaining({
      acquire: expect.any(Function),
      observe: expect.any(Function),
      release: expect.any(Function),
      close: expect.any(Function),
    }));
    expect(port).not.toHaveProperty("activateVersion");
    expect(port).not.toHaveProperty("createVersion");
    expect(port).not.toHaveProperty("activateCommerce");
  });

  it("acquires one page-scoped durable lease bound to both immutable identities", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      if (sql === "SELECT clock_timestamp() AS now") {
        return rowResult([{ now: new Date("2026-08-24T00:00:00.000Z") }]);
      }
      if (sql.includes("FROM runtime_behavior_mode_pointers")) {
        return rowResult([{
          active_version_id: request.preCutover.modeVersionId,
          pointer_revision: request.preCutover.pointerRevision,
        }]);
      }
      if (sql.includes("FROM runtime_behavior_mode_versions")) {
        return rowResult([
          {
            mode_version_id: request.preCutover.modeVersionId,
            page_id: request.pageId,
            channel: request.channel,
            confirmation_mode: "V2_ACTIVE",
            sales_authority_mode: "LEGACY",
            state_read_mode: "LEGACY",
            content_hash: request.preCutover.contentHash,
            authority_bundle_hash: null,
          },
          {
            mode_version_id: request.target.modeVersionId,
            page_id: request.pageId,
            channel: request.channel,
            confirmation_mode: "V2_ACTIVE",
            sales_authority_mode: "COMMERCE",
            state_read_mode: "LEGACY",
            content_hash: request.target.contentHash,
            authority_bundle_hash: request.target.authorityBundleHash,
          },
        ]);
      }
      if (sql.includes("WHERE operation_id")) return rowResult();
      if (sql.includes("FROM df13_commerce_cutover_fences")) return rowResult();
      if (sql.includes("INSERT INTO df13_commerce_cutover_fences")) {
        return rowResult([{ fence_id: values?.[0], epoch: "1", lease_live: true }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    const result = await store.acquire(request);

    expect(result).toMatchObject({ status: "HELD", lease: { epoch: 1 } });
    expect(result.status === "HELD" && result.lease.fenceToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
    );
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toEqual(expect.arrayContaining([
      "BEGIN",
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringContaining("FROM runtime_behavior_mode_pointers"),
      expect.stringContaining("FROM runtime_behavior_mode_versions"),
      expect.stringContaining("FROM df13_commerce_cutover_fences"),
      expect.stringContaining("FOR UPDATE"),
      expect.stringContaining("INSERT INTO df13_commerce_cutover_fences"),
      "COMMIT",
    ]));
    const insert = mocks.clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO df13_commerce_cutover_fences"),
    );
    expect(insert?.[1]).toEqual(expect.arrayContaining([
      request.operationId,
      request.preCutover.modeVersionId,
      request.preCutover.contentHash,
      request.target.modeVersionId,
      request.target.contentHash,
      request.target.authorityBundleHash,
      df13CommerceCutoverFenceRequestFingerprint(request),
    ]));
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("fails closed when an active scope carries a copied target identity", async () => {
    const copiedIdentity = {
      fence_id: "20000000-0000-4000-8000-000000000001",
      operation_id: request.operationId,
      epoch: "1",
      released_at: null,
      lease_until: new Date("2026-08-25T00:00:00.000Z"),
      pre_cutover_version_id: request.preCutover.modeVersionId,
      pre_cutover_content_hash: request.preCutover.contentHash,
      pre_cutover_pointer_revision: request.preCutover.pointerRevision,
      target_version_id: request.target.modeVersionId,
      target_content_hash: `sha256:${"d".repeat(64)}`,
      target_authority_bundle_hash: request.target.authorityBundleHash,
      request_fingerprint: df13CommerceCutoverFenceRequestFingerprint(request),
      token_hash: "e".repeat(64),
    };
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql === "SELECT clock_timestamp() AS now") {
        return rowResult([{ now: new Date("2026-08-24T00:00:00.000Z") }]);
      }
      if (sql.includes("WHERE operation_id")) return rowResult([copiedIdentity]);
      if (sql.includes("FROM df13_commerce_cutover_fences")) {
        return rowResult([copiedIdentity]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    await expect(store.acquire(request)).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_CUTOVER_FENCE_OPERATION_IDENTITY_MISMATCH",
    });
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("INSERT INTO df13_commerce_cutover_fences"))).toBe(false);
  });

  it("retains an active fence whose lease timestamp cannot be verified", async () => {
    const invalidLease = {
      fence_id: "20000000-0000-4000-8000-000000000001",
      operation_id: request.operationId,
      epoch: "1",
      released_at: null,
      lease_until: "not-a-timestamp",
      pre_cutover_version_id: request.preCutover.modeVersionId,
      pre_cutover_content_hash: request.preCutover.contentHash,
      pre_cutover_pointer_revision: request.preCutover.pointerRevision,
      target_version_id: request.target.modeVersionId,
      target_content_hash: request.target.contentHash,
      target_authority_bundle_hash: request.target.authorityBundleHash,
      request_fingerprint: df13CommerceCutoverFenceRequestFingerprint(request),
    };
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql === "SELECT clock_timestamp() AS now") {
        return rowResult([{ now: new Date("2026-08-24T00:00:00.000Z") }]);
      }
      if (sql.includes("WHERE operation_id")) return rowResult([invalidLease]);
      if (sql.includes("FROM df13_commerce_cutover_fences")) {
        return rowResult([invalidLease]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    await expect(store.acquire(request)).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_CUTOVER_FENCE_LEASE_INVALID",
    });
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("UPDATE df13_commerce_cutover_fences"))).toBe(false);
  });

  it("converts a duplicate live-scope insert race into a bounded parked result", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql === "SELECT clock_timestamp() AS now") {
        return rowResult([{ now: new Date("2026-08-24T00:00:00.000Z") }]);
      }
      if (sql.includes("WHERE operation_id")) return rowResult();
      if (sql.includes("FROM df13_commerce_cutover_fences")) return rowResult();
      if (sql.includes("FROM runtime_behavior_mode_pointers")) {
        return rowResult([{ active_version_id: request.preCutover.modeVersionId, pointer_revision: "3" }]);
      }
      if (sql.includes("FROM runtime_behavior_mode_versions")) {
        return rowResult([
          {
            mode_version_id: request.preCutover.modeVersionId,
            page_id: request.pageId,
            channel: request.channel,
            confirmation_mode: "V2_ACTIVE",
            sales_authority_mode: "LEGACY",
            state_read_mode: "LEGACY",
            content_hash: request.preCutover.contentHash,
            authority_bundle_hash: null,
          },
          {
            mode_version_id: request.target.modeVersionId,
            page_id: request.pageId,
            channel: request.channel,
            confirmation_mode: "V2_ACTIVE",
            sales_authority_mode: "COMMERCE",
            state_read_mode: "LEGACY",
            content_hash: request.target.contentHash,
            authority_bundle_hash: request.target.authorityBundleHash,
          },
        ]);
      }
      if (sql.includes("INSERT INTO df13_commerce_cutover_fences")) {
        const error = new Error("duplicate key");
        Object.assign(error, { code: "23505" });
        throw error;
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    await expect(store.acquire(request)).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_CUTOVER_FENCE_CONCURRENCY_CONFLICT",
    });
    expect(mocks.clientQuery.mock.calls.map(([sql]) => String(sql))).toContain("ROLLBACK");
  });

  it("releases only the exact held epoch and opaque token", async () => {
    const token = "30000000-0000-4000-8000-000000000003";
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes("UPDATE df13_commerce_cutover_fences")) {
        expect(values).toEqual(expect.arrayContaining([
          "20000000-0000-4000-8000-000000000001",
          7,
          createHash("sha256").update(token, "utf8").digest("hex"),
        ]));
        return rowResult([{ fence_id: "20000000-0000-4000-8000-000000000001" }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    await expect(store.release({
      fenceId: "20000000-0000-4000-8000-000000000001",
      fenceToken: token,
      epoch: 7,
    })).resolves.toEqual({ status: "RELEASED" });
  });

  it("uses only the database clock and a canonical pointer/version read before recording a lease", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      if (sql === "SELECT clock_timestamp() AS now") {
        return rowResult([{ now: new Date("2026-08-24T00:00:00.000Z") }]);
      }
      if (sql.includes("FROM runtime_behavior_mode_pointers")) {
        return rowResult([{ active_version_id: request.preCutover.modeVersionId, pointer_revision: "3" }]);
      }
      if (sql.includes("FROM runtime_behavior_mode_versions")) {
        return rowResult([
          {
            mode_version_id: request.preCutover.modeVersionId,
            page_id: request.pageId,
            channel: request.channel,
            confirmation_mode: "V2_ACTIVE",
            sales_authority_mode: "LEGACY",
            state_read_mode: "LEGACY",
            content_hash: request.preCutover.contentHash,
            authority_bundle_hash: null,
          },
          {
            mode_version_id: request.target.modeVersionId,
            page_id: request.pageId,
            channel: request.channel,
            confirmation_mode: "V2_ACTIVE",
            sales_authority_mode: "COMMERCE",
            state_read_mode: "LEGACY",
            content_hash: request.target.contentHash,
            authority_bundle_hash: request.target.authorityBundleHash,
          },
        ]);
      }
      if (sql.includes("WHERE operation_id")) return rowResult();
      if (sql.includes("FROM df13_commerce_cutover_fences")) return rowResult();
      if (sql.includes("INSERT INTO df13_commerce_cutover_fences")) {
        return rowResult([{ fence_id: values?.[0], epoch: "1", lease_live: true }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    await expect(store.acquire(request)).resolves.toMatchObject({ status: "HELD" });

    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements.some((sql) => sql.includes("FROM runtime_behavior_mode_pointers"))).toBe(true);
    expect(statements.some((sql) => sql.includes("FROM runtime_behavior_mode_versions"))).toBe(true);
    expect(statements.some((sql) =>
      sql.includes("lease_until > clock_timestamp() AS lease_live") &&
      sql.includes("clock_timestamp() +"),
    )).toBe(true);
  });

  it("never releases an expired lease and records the database-time predicate", async () => {
    mocks.clientQuery.mockResolvedValue(rowResult([], 0));
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    await expect(store.release({
      fenceId: "20000000-0000-4000-8000-000000000001",
      fenceToken: "30000000-0000-4000-8000-000000000003",
      epoch: 7,
    })).resolves.toEqual({ status: "STALE_OR_MISSING" });

    expect(String(mocks.clientQuery.mock.calls[0]?.[0])).toContain("lease_until > clock_timestamp()");
  });

  it("fails closed instead of returning HELD when the database reports an already-expired inserted lease", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes("WHERE operation_id")) return rowResult();
      if (sql.includes("FROM df13_commerce_cutover_fences")) return rowResult();
      if (sql.includes("FROM runtime_behavior_mode_pointers")) {
        return rowResult([{ active_version_id: request.preCutover.modeVersionId, pointer_revision: "3" }]);
      }
      if (sql.includes("FROM runtime_behavior_mode_versions")) {
        return rowResult([
          {
            mode_version_id: request.preCutover.modeVersionId,
            page_id: request.pageId,
            channel: request.channel,
            confirmation_mode: "V2_ACTIVE",
            sales_authority_mode: "LEGACY",
            state_read_mode: "LEGACY",
            content_hash: request.preCutover.contentHash,
            authority_bundle_hash: null,
          },
          {
            mode_version_id: request.target.modeVersionId,
            page_id: request.pageId,
            channel: request.channel,
            confirmation_mode: "V2_ACTIVE",
            sales_authority_mode: "COMMERCE",
            state_read_mode: "LEGACY",
            content_hash: request.target.contentHash,
            authority_bundle_hash: request.target.authorityBundleHash,
          },
        ]);
      }
      if (sql.includes("INSERT INTO df13_commerce_cutover_fences")) {
        return rowResult([{ fence_id: values?.[0], epoch: "1", lease_live: false }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    await expect(store.acquire(request)).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_CUTOVER_FENCE_INSERT_UNVERIFIABLE",
    });
    expect(mocks.clientQuery.mock.calls.map(([sql]) => String(sql))).toContain("ROLLBACK");
  });

  it("does not create a second fence when the same operation replays after a lost acquire acknowledgement", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql === "SELECT clock_timestamp() AS now") {
        return rowResult([{ now: new Date("2026-08-24T00:00:00.000Z") }]);
      }
      if (sql.includes("WHERE operation_id")) {
        return rowResult([{
          fence_id: "20000000-0000-4000-8000-000000000001",
          operation_id: request.operationId,
          epoch: "1",
          released_at: null,
          lease_until: new Date("2026-08-24T00:01:00.000Z"),
          pre_cutover_version_id: request.preCutover.modeVersionId,
          pre_cutover_content_hash: request.preCutover.contentHash,
          pre_cutover_pointer_revision: request.preCutover.pointerRevision,
          target_version_id: request.target.modeVersionId,
          target_content_hash: request.target.contentHash,
          target_authority_bundle_hash: request.target.authorityBundleHash,
          request_fingerprint: df13CommerceCutoverFenceRequestFingerprint(request),
        }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    await expect(store.acquire(request)).resolves.toEqual({
      status: "HELD_RECONCILE_REQUIRED",
      fenceId: "20000000-0000-4000-8000-000000000001",
      epoch: 1,
    });
    expect(mocks.clientQuery.mock.calls.map(([sql]) => String(sql)).some((sql) =>
      sql.includes("INSERT INTO df13_commerce_cutover_fences"),
    )).toBe(false);
  });

  it("observes the exact terminal operation identity after a lost release acknowledgement", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("WHERE operation_id")) {
        return rowResult([{
          fence_id: "20000000-0000-4000-8000-000000000001",
          operation_id: request.operationId,
          epoch: "2",
          released_at: new Date("2026-08-24T00:01:00.000Z"),
          lease_until: null,
          pre_cutover_version_id: request.preCutover.modeVersionId,
          pre_cutover_content_hash: request.preCutover.contentHash,
          pre_cutover_pointer_revision: request.preCutover.pointerRevision,
          target_version_id: request.target.modeVersionId,
          target_content_hash: request.target.contentHash,
          target_authority_bundle_hash: request.target.authorityBundleHash,
          request_fingerprint: df13CommerceCutoverFenceRequestFingerprint(request),
        }]);
      }
      return rowResult();
    });
    const store = new PostgresDf13CommerceCutoverFenceStore("postgresql://test");

    await expect(store.observe(request)).resolves.toEqual({
      status: "ALREADY_RELEASED",
      fenceId: "20000000-0000-4000-8000-000000000001",
      epoch: 2,
    });
  });
});
