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

describe("Postgres Track B Commerce authority writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.release });
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
