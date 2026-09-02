import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clientQuery: vi.fn(),
  poolQuery: vi.fn(),
  connect: vi.fn(),
  poolOn: vi.fn(),
  release: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: class {
    on(event: string, listener: (...args: unknown[]) => void) {
      mocks.poolOn(event, listener);
      return this;
    }
    connect() { return mocks.connect(); }
    query(sql: string, values?: readonly unknown[]) { return mocks.poolQuery(sql, values); }
    end() { return Promise.resolve(); }
  },
}));

import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
} from "./df13-commerce-authority-bundle.js";
import { runtimeBehaviorModeContentHash } from "./runtime-behavior-mode.js";
import { PostgresTrackBCommerceAuthorityWriter } from "./track-b-commerce-authority-writer.js";

const pageId = "1198992073286645";
const channel = "MESSENGER";
const previousVersionId = "10000000-0000-4000-8000-000000000001";
const targetVersionId = "10000000-0000-4000-8000-000000000002";
const fenceId = "20000000-0000-4000-8000-000000000001";
const fenceToken = "30000000-0000-4000-8000-000000000001";
const updatedAt = new Date("2026-08-31T12:00:00.000Z");
const admissionMigration = readFileSync(new URL(
  "../pending-migrations/0038_track_b_commerce_admission_gate.up.sql",
  import.meta.url,
), "utf8");
const admissionFunctionMarker = "RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$";
const admissionFunctionStart = admissionMigration.indexOf(admissionFunctionMarker) + admissionFunctionMarker.length;
const admissionFunctionSource = admissionMigration.slice(
  admissionFunctionStart,
  admissionMigration.indexOf("$$;", admissionFunctionStart),
);
const v1ContentHash = runtimeBehaviorModeContentHash({
  confirmationMode: "V2_ACTIVE",
  salesAuthorityMode: "COMMERCE",
  stateReadMode: "LEGACY",
  authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
});
const v2ContentHash = runtimeBehaviorModeContentHash({
  confirmationMode: "V2_ACTIVE",
  salesAuthorityMode: "COMMERCE",
  stateReadMode: "LEGACY",
  authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
});

function pointerRow(input: Readonly<{
  versionId: string;
  contentHash: string;
  bundleHash: string;
  revision: number;
}>) {
  return {
    mode_version_id: input.versionId,
    page_id: pageId,
    channel,
    schema_version: 1,
    confirmation_mode: "V2_ACTIVE",
    sales_authority_mode: "COMMERCE",
    state_read_mode: "LEGACY",
    authority_bundle_hash: input.bundleHash,
    content_hash: input.contentHash,
    created_by: "prior-writer",
    version_reason: "prior-version",
    created_at: updatedAt,
    pointer_revision: input.revision,
    updated_by: "prior-writer",
    pointer_reason: "prior-pointer",
    updated_at: updatedAt,
  };
}

function versionRow(input: Readonly<{
  versionId: string;
  contentHash: string;
  bundleHash: string;
  createdBy?: string;
  reason?: string;
}>) {
  return {
    ...pointerRow({ ...input, revision: 0 }),
    created_by: input.createdBy ?? "TRACK_B_B3_2_WRITER",
    version_reason: input.reason ?? "TRACK_B_B3_2_PREPARE:40000000-0000-4000-8000-000000000001",
  };
}

function result(rows: readonly unknown[] = [], rowCount = rows.length) {
  return { rows, rowCount };
}

function admissionTrigger(tableName: string, overrides: Record<string, unknown> = {}) {
  return {
    table_name: tableName,
    tgenabled: "A",
    tgtype: 19,
    tgqual: null,
    trigger_columns: "",
    tgnargs: 0,
    function_name: "guard_track_b_cutover_admission",
    function_schema: "public",
    language_name: "plpgsql",
    returns_trigger: true,
    prosrc: admissionFunctionSource,
    proconfig: ["search_path=pg_catalog"],
    ...overrides,
  };
}

describe("Postgres Track B Commerce authority writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.poolQuery.mockImplementation((sql: string, values?: readonly unknown[]) =>
      mocks.clientQuery(sql, values));
    mocks.connect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.release });
  });

  it("registers an idle-client error listener without weakening operation failures", () => {
    const writer = new PostgresTrackBCommerceAuthorityWriter("postgres://test");
    expect(writer).toBeDefined();
    expect(mocks.poolOn).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("reads one exact historical V1 version for governed rollback preparation", async () => {
    mocks.clientQuery.mockResolvedValue(result([pointerRow({ versionId: previousVersionId,
      contentHash: v1ContentHash, bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      revision: 6 })]));
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");
    await expect(store.readExactVersion({ pageId, channel, modeVersionId: previousVersionId }))
      .resolves.toMatchObject({ modeVersionId: previousVersionId,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
        contentHash: v1ContentHash });
    expect(mocks.clientQuery.mock.calls[0]?.[1]).toEqual([previousVersionId, pageId, channel]);
  });

  it("reads exact page-scoped in-flight and queued authority work for quiescence", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      expect(sql).toContain("webhook_inbox");
      expect(sql).toContain("meta_outbox");
      expect(sql).toContain("pancake_tag_outbox");
      expect(sql).toContain("status='PROCESSING'");
      expect(sql).toContain("status='SENDING'");
      expect(sql).toContain("status='APPLYING'");
      expect(values).toEqual([pageId]);
      return result([{
        active_inbox: "0", active_meta_outbox: "0", active_pancake_outbox: "0",
        queued_inbox: "4", queued_meta_outbox: "2", queued_pancake_outbox: "1",
      }]);
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");
    await expect(store.readOperationalQuiescence({ pageId, channel })).resolves.toEqual({
      activeInbox: 0, activeMetaOutbox: 0, activePancakeOutbox: 0,
      inFlightAuthorityDependentWork: 0, queuedAuthorityDependentWork: 7,
    });
  });

  it("fails quiescence readback closed on missing, negative, or unsafe counts", async () => {
    mocks.clientQuery.mockResolvedValue(result([{ active_inbox: "NaN", active_meta_outbox: "0",
      active_pancake_outbox: "0", queued_inbox: "0", queued_meta_outbox: "0",
      queued_pancake_outbox: "0" }]));
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");
    await expect(store.readOperationalQuiescence({ pageId, channel }))
      .rejects.toThrow("TRACK_B_B3_2_QUIESCENCE_READBACK_INVALID");
  });

  it("proves exactly one activation audit and one fresh startup DATABASE resolution", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes("runtime_behavior_mode_activation_audit")) {
        expect(values).toEqual([pageId, channel, 7, previousVersionId, targetVersionId,
          v1ContentHash, v2ContentHash, "TRACK_B_B3_2_WRITER",
          "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000001"]);
        return result([{ exact_count: "1", conflicting_count: "0" }]);
      }
      if (sql.includes("runtime_behavior_mode_resolution_audit")) {
        expect(values?.slice(0, 7)).toEqual([
          pageId, channel, targetVersionId, v2ContentHash, 7,
          "realtime-worker-1", DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
        ]);
        return result([{ exact_count: "1", conflicting_count: "0" }]);
      }
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");
    await expect(store.readExactActivationAudit({ pageId, channel, pointerRevision: 7,
      previousVersionId, previousContentHash: v1ContentHash, targetVersionId,
      targetContentHash: v2ContentHash, actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000001",
    })).resolves.toBe("EXACT");
    await expect(store.readExactRuntimeResolution({ pageId, channel,
      modeVersionId: targetVersionId, contentHash: v2ContentHash, pointerRevision: 7,
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      workerId: "realtime-worker-1", notBefore: "2026-09-02T00:00:00.000Z",
    })).resolves.toBe("EXACT");
  });

  it("rejects an extra conflicting activation audit or runtime resolution", async () => {
    mocks.clientQuery.mockResolvedValue(result([{ exact_count: "1", conflicting_count: "1" }]));
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");
    await expect(store.readExactActivationAudit({ pageId, channel, pointerRevision: 7,
      previousVersionId, previousContentHash: v1ContentHash, targetVersionId,
      targetContentHash: v2ContentHash, actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000001",
    })).resolves.toBe("AMBIGUOUS");
    await expect(store.readExactRuntimeResolution({ pageId, channel,
      modeVersionId: targetVersionId, contentHash: v2ContentHash, pointerRevision: 7,
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      workerId: "realtime-worker-1", notBefore: "2026-09-02T00:00:00.000Z",
    })).resolves.toBe("AMBIGUOUS");
  });

  it("rejects an ambiguous or injectable admission schema", () => {
    expect(() => new PostgresTrackBCommerceAuthorityWriter("postgresql://test", {
      admissionSchema: 'public".df13_commerce_cutover_fences; SELECT 1; --',
    })).toThrow("TRACK_B_B3_2_ADMISSION_SCHEMA_INVALID");
  });

  it("proves the exact unreleased fence and all database admission guards", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes('FROM "public".df13_commerce_cutover_fences')) {
        expect(sql).toContain('FROM "public".df13_commerce_cutover_fences');
        expect(values).toEqual([
          fenceId, pageId, channel, 1,
          createHash("sha256").update(fenceToken, "utf8").digest("hex"),
        ]);
        expect(sql).toContain("released_at IS NULL");
        expect(sql).not.toContain("lease_until");
        return result([{ fence_id: fenceId, page_id: pageId, channel, epoch: 1, released_at: null }]);
      }
      if (sql.includes("FROM pg_trigger")) return result([
        admissionTrigger("webhook_inbox"),
        admissionTrigger("meta_outbox"),
        admissionTrigger("pancake_tag_outbox"),
      ]);
      if (sql.includes('FROM "public".schema_migrations')) {
        expect(sql).toContain('FROM "public".schema_migrations');
        expect(values).toEqual(["0038_track_b_commerce_admission_gate"]);
        return result([{
          checksum_sha256: "9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140",
        }]);
      }
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.readAdmissionHold({
      pageId, channel, lease: { fenceId, fenceToken, epoch: 1 },
    })).resolves.toEqual({
      status: "HELD", source: "DATABASE", pageId, channel, fenceId, epoch: 1,
      released: false,
      guardedClaims: [
        "webhook_inbox:PROCESSING",
        "meta_outbox:SENDING",
        "pancake_tag_outbox:APPLYING",
      ],
    });
  });

  it("fails the admission proof closed when any guarded transition is absent", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "public".df13_commerce_cutover_fences')) {
        return result([{ fence_id: fenceId, page_id: pageId, channel, epoch: 1, released_at: null }]);
      }
      if (sql.includes("FROM pg_trigger")) return result([
        admissionTrigger("webhook_inbox"),
        admissionTrigger("meta_outbox"),
      ]);
      if (sql.includes('FROM "public".schema_migrations')) return result([{
        checksum_sha256: "9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140",
      }]);
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.readAdmissionHold({
      pageId, channel, lease: { fenceId, fenceToken, epoch: 1 },
    })).resolves.toMatchObject({ status: "AMBIGUOUS", guardedClaims: [] });
  });

  it.each([
    ["a WHEN predicate", { tgqual: "{CONST :constvalue false}" }],
    ["an UPDATE OF column list", { trigger_columns: "2" }],
    ["trigger arguments", { tgnargs: 1 }],
  ])("fails admission proof closed for %s", async (_label, triggerOverride) => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "public".df13_commerce_cutover_fences')) {
        return result([{ fence_id: fenceId, page_id: pageId, channel, epoch: 1, released_at: null }]);
      }
      if (sql.includes("FROM pg_trigger")) return result([
        admissionTrigger("webhook_inbox", triggerOverride),
        admissionTrigger("meta_outbox"),
        admissionTrigger("pancake_tag_outbox"),
      ]);
      if (sql.includes('FROM "public".schema_migrations')) return result([{
        checksum_sha256: "9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140",
      }]);
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.readAdmissionHold({
      pageId, channel, lease: { fenceId, fenceToken, epoch: 1 },
    })).resolves.toMatchObject({ status: "AMBIGUOUS", guardedClaims: [] });
  });

  it("prepares one immutable V2 behavior identity from the exact active V1 pointer", async () => {
    const current = pointerRow({
      versionId: previousVersionId,
      contentHash: v1ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      revision: 6,
    });
    const target = versionRow({
      versionId: targetVersionId,
      contentHash: v2ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
    });
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("clock_timestamp() AS operation_now")) return result([{ operation_now: updatedAt }]);
      if (sql.includes("FROM runtime_behavior_mode_pointers p")) return result([current]);
      if (sql.includes("WHERE v.page_id = $1 AND v.channel = $2 AND v.content_hash = $3")) return result();
      if (sql.includes("INSERT INTO runtime_behavior_mode_versions")) return result([target]);
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.prepareTarget({
      pageId,
      channel,
      expectedCurrent: {
        modeVersionId: previousVersionId,
        contentHash: v1ContentHash,
        pointerRevision: 6,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
      actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_PREPARE:40000000-0000-4000-8000-000000000001",
    })).resolves.toMatchObject({
      modeVersionId: targetVersionId,
      contentHash: v2ContentHash,
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
    });
    expect(mocks.clientQuery.mock.calls.some(([sql]) =>
      String(sql).includes("UPDATE runtime_behavior_mode_pointers")
    )).toBe(false);
  });

  it("activates V2 only while the exact durable lease and pointer CAS are held", async () => {
    const current = pointerRow({
      versionId: previousVersionId,
      contentHash: v1ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      revision: 6,
    });
    const target = versionRow({
      versionId: targetVersionId,
      contentHash: v2ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
    });
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes("clock_timestamp() AS operation_now")) return result([{ operation_now: updatedAt }]);
      if (sql.includes("FROM runtime_behavior_mode_versions v") && sql.includes("WHERE v.mode_version_id")) {
        return result([target]);
      }
      if (sql.includes("FROM runtime_behavior_mode_pointers p")) return result([current]);
      if (sql.includes("FROM df13_commerce_cutover_fences")) {
        expect(values).toEqual(expect.arrayContaining([
          fenceId,
          1,
          createHash("sha256").update(fenceToken, "utf8").digest("hex"),
        ]));
        return result([{ operation_id: "40000000-0000-4000-8000-000000000001" }]);
      }
      if (sql.includes("UPDATE runtime_behavior_mode_pointers")) return result([{ updated_at: updatedAt }]);
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.mutateExactPointer({
      pageId,
      channel,
      operation: "ACTIVATE_TRACK_B",
      expectedCurrent: {
        modeVersionId: previousVersionId,
        contentHash: v1ContentHash,
        pointerRevision: 6,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
      target: {
        modeVersionId: targetVersionId,
        contentHash: v2ContentHash,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      },
      lease: { fenceId, fenceToken, epoch: 1 },
      actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000001",
    })).resolves.toMatchObject({ pointerRevision: 7, version: { modeVersionId: targetVersionId } });
  });

  it("fails closed before CAS when the durable lease cannot be proven", async () => {
    const current = pointerRow({
      versionId: previousVersionId,
      contentHash: v1ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      revision: 6,
    });
    const target = versionRow({
      versionId: targetVersionId,
      contentHash: v2ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
    });
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM runtime_behavior_mode_versions v") && sql.includes("WHERE v.mode_version_id")) return result([target]);
      if (sql.includes("FROM runtime_behavior_mode_pointers p")) return result([current]);
      if (sql.includes("FROM df13_commerce_cutover_fences")) return result();
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.mutateExactPointer({
      pageId,
      channel,
      operation: "ACTIVATE_TRACK_B",
      expectedCurrent: {
        modeVersionId: previousVersionId,
        contentHash: v1ContentHash,
        pointerRevision: 6,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
      target: {
        modeVersionId: targetVersionId,
        contentHash: v2ContentHash,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      },
      lease: { fenceId, fenceToken, epoch: 1 },
      actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000001",
    })).rejects.toThrow("TRACK_B_B3_2_FENCE_LEASE_INVALID");
    expect(mocks.clientQuery.mock.calls.some(([sql]) =>
      String(sql).includes("UPDATE runtime_behavior_mode_pointers")
    )).toBe(false);
  });

  it("rolls back only to the exact V1 identity recorded by the forward activation audit", async () => {
    const current = {
      ...pointerRow({
        versionId: targetVersionId,
        contentHash: v2ContentHash,
        bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
        revision: 7,
      }),
      updated_by: "TRACK_B_B3_2_WRITER",
      pointer_reason: "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000001",
    };
    const target = versionRow({
      versionId: previousVersionId,
      contentHash: v1ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      createdBy: "DF13_FIRST_PREPROD_WRITER",
      reason: "DF13_FIRST_PREPROD_PREPARE:40000000-0000-4000-8000-000000000099",
    });
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("clock_timestamp() AS operation_now")) return result([{ operation_now: updatedAt }]);
      if (sql.includes("FROM runtime_behavior_mode_versions v") && sql.includes("WHERE v.mode_version_id")) return result([target]);
      if (sql.includes("FROM runtime_behavior_mode_pointers p")) return result([current]);
      if (sql.includes("FROM runtime_behavior_mode_activation_audit")) {
        return result([{
          previous_version_id: previousVersionId,
          new_version_id: targetVersionId,
          new_pointer_revision: 7,
          actor: current.updated_by,
          reason: current.pointer_reason,
        }]);
      }
      if (sql.includes("FROM df13_commerce_cutover_fences")) return result([{ operation_id: "40000000-0000-4000-8000-000000000002" }]);
      if (sql.includes("UPDATE runtime_behavior_mode_pointers")) return result([{ updated_at: updatedAt }]);
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.mutateExactPointer({
      pageId,
      channel,
      operation: "ROLLBACK_TRACK_B",
      expectedCurrent: {
        modeVersionId: targetVersionId,
        contentHash: v2ContentHash,
        pointerRevision: 7,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      },
      target: {
        modeVersionId: previousVersionId,
        contentHash: v1ContentHash,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
      lease: { fenceId, fenceToken, epoch: 1 },
      actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ROLLBACK:40000000-0000-4000-8000-000000000002",
    })).resolves.toMatchObject({ pointerRevision: 8, version: { modeVersionId: previousVersionId } });
  });

  it("uses the still-held exact forward lease for immediate post-CAS recovery", async () => {
    const current = {
      ...pointerRow({
        versionId: targetVersionId,
        contentHash: v2ContentHash,
        bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
        revision: 7,
      }),
      updated_by: "TRACK_B_B3_2_WRITER",
      pointer_reason: "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000001",
    };
    const target = versionRow({
      versionId: previousVersionId,
      contentHash: v1ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      createdBy: "DF13_FIRST_PREPROD_WRITER",
      reason: "DF13_FIRST_PREPROD_PREPARE:40000000-0000-4000-8000-000000000099",
    });
    let exactInverseLeaseObserved = false;
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes("clock_timestamp() AS operation_now")) return result([{ operation_now: updatedAt }]);
      if (sql.includes("FROM runtime_behavior_mode_versions v") && sql.includes("WHERE v.mode_version_id")) return result([target]);
      if (sql.includes("FROM runtime_behavior_mode_pointers p")) return result([current]);
      if (sql.includes("FROM runtime_behavior_mode_activation_audit")) {
        return result([{
          previous_version_id: previousVersionId,
          new_version_id: targetVersionId,
          new_pointer_revision: 7,
          actor: current.updated_by,
          reason: current.pointer_reason,
        }]);
      }
      if (sql.includes("FROM df13_commerce_cutover_fences")) {
        exactInverseLeaseObserved = sql.includes("pre_cutover_version_id=$9") &&
          values?.[5] === targetVersionId && values?.[6] === v2ContentHash && values?.[7] === 7 &&
          values?.[8] === previousVersionId && values?.[9] === v1ContentHash &&
          values?.[12] === 6 &&
          values?.[13] === DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash;
        return exactInverseLeaseObserved
          ? result([{ operation_id: "40000000-0000-4000-8000-000000000001", inverse_lease: true }])
          : result();
      }
      if (sql.includes("UPDATE runtime_behavior_mode_pointers")) return result([{ updated_at: updatedAt }]);
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.mutateExactPointer({
      pageId,
      channel,
      operation: "ROLLBACK_TRACK_B",
      expectedCurrent: {
        modeVersionId: targetVersionId,
        contentHash: v2ContentHash,
        pointerRevision: 7,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      },
      target: {
        modeVersionId: previousVersionId,
        contentHash: v1ContentHash,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
      lease: { fenceId, fenceToken, epoch: 1 },
      actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ROLLBACK:40000000-0000-4000-8000-000000000001",
    })).resolves.toMatchObject({ pointerRevision: 8, version: { modeVersionId: previousVersionId } });
    expect(exactInverseLeaseObserved).toBe(true);
  });

  it("uses the still-held exact reverse lease to recover a failed rollback symmetrically", async () => {
    const current = {
      ...pointerRow({
        versionId: previousVersionId,
        contentHash: v1ContentHash,
        bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
        revision: 8,
      }),
      updated_by: "TRACK_B_B3_2_WRITER",
      pointer_reason: "TRACK_B_B3_2_ROLLBACK:40000000-0000-4000-8000-000000000002",
    };
    const target = versionRow({
      versionId: targetVersionId,
      contentHash: v2ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
    });
    let oppositeAuditObserved = false;
    mocks.clientQuery.mockImplementation(async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes("clock_timestamp() AS operation_now")) return result([{ operation_now: updatedAt }]);
      if (sql.includes("FROM runtime_behavior_mode_versions v") && sql.includes("WHERE v.mode_version_id")) return result([target]);
      if (sql.includes("FROM runtime_behavior_mode_pointers p")) return result([current]);
      if (sql.includes("FROM runtime_behavior_mode_activation_audit")) {
        oppositeAuditObserved = true;
        return result([{
          previous_version_id: targetVersionId,
          new_version_id: previousVersionId,
          new_pointer_revision: 8,
          actor: current.updated_by,
          reason: current.pointer_reason,
        }]);
      }
      if (sql.includes("FROM df13_commerce_cutover_fences")) {
        return values?.[12] === 7 && values?.[13] === DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
          ? result([{ operation_id: "40000000-0000-4000-8000-000000000002", inverse_lease: true }])
          : result();
      }
      if (sql.includes("UPDATE runtime_behavior_mode_pointers")) return result([{ updated_at: updatedAt }]);
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.mutateExactPointer({
      pageId,
      channel,
      operation: "ACTIVATE_TRACK_B",
      expectedCurrent: {
        modeVersionId: previousVersionId,
        contentHash: v1ContentHash,
        pointerRevision: 8,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
      target: {
        modeVersionId: targetVersionId,
        contentHash: v2ContentHash,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      },
      lease: { fenceId, fenceToken, epoch: 1 },
      actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000002",
    })).resolves.toMatchObject({ pointerRevision: 9, version: { modeVersionId: targetVersionId } });
    expect(oppositeAuditObserved).toBe(true);
  });

  it("rejects rollback when the forward audit names a different previous identity", async () => {
    const current = {
      ...pointerRow({
        versionId: targetVersionId,
        contentHash: v2ContentHash,
        bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
        revision: 7,
      }),
      updated_by: "TRACK_B_B3_2_WRITER",
      pointer_reason: "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000001",
    };
    const target = versionRow({
      versionId: previousVersionId,
      contentHash: v1ContentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
    });
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM runtime_behavior_mode_versions v") && sql.includes("WHERE v.mode_version_id")) return result([target]);
      if (sql.includes("FROM runtime_behavior_mode_pointers p")) return result([current]);
      if (sql.includes("FROM runtime_behavior_mode_activation_audit")) {
        return result([{
          previous_version_id: "10000000-0000-4000-8000-000000000099",
          new_version_id: targetVersionId,
          new_pointer_revision: 7,
          actor: current.updated_by,
          reason: current.pointer_reason,
        }]);
      }
      return result();
    });
    const store = new PostgresTrackBCommerceAuthorityWriter("postgresql://test");

    await expect(store.mutateExactPointer({
      pageId,
      channel,
      operation: "ROLLBACK_TRACK_B",
      expectedCurrent: {
        modeVersionId: targetVersionId,
        contentHash: v2ContentHash,
        pointerRevision: 7,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      },
      target: {
        modeVersionId: previousVersionId,
        contentHash: v1ContentHash,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
      lease: { fenceId, fenceToken, epoch: 1 },
      actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ROLLBACK:40000000-0000-4000-8000-000000000002",
    })).rejects.toThrow("TRACK_B_B3_2_ROLLBACK_IDENTITY_MISMATCH");
    expect(mocks.clientQuery.mock.calls.some(([sql]) =>
      String(sql).includes("UPDATE runtime_behavior_mode_pointers")
    )).toBe(false);
  });
});
