import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  clientQuery: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
  end: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: class {
    query(...args: unknown[]) { return mocks.poolQuery(...args); }
    connect() { return mocks.connect(); }
    end() { return mocks.end(); }
  },
}));

import {
  PostgresRuntimeBehaviorModeStore,
  runtimeBehaviorModeContentHash,
} from "./runtime-behavior-mode.js";

const pageId = "1198992073286645";
const channel = "MESSENGER";
const targetVersionId = "10000000-0000-4000-8000-000000000002";
const updatedAt = new Date("2026-08-03T01:02:03.000Z");
const payload = {
  confirmationMode: "V2_SHADOW" as const,
  salesAuthorityMode: "LEGACY" as const,
  stateReadMode: "LEGACY" as const,
};
const targetRow = {
  mode_version_id: targetVersionId,
  page_id: pageId,
  channel,
  schema_version: 1,
  confirmation_mode: payload.confirmationMode,
  sales_authority_mode: payload.salesAuthorityMode,
  state_read_mode: payload.stateReadMode,
  content_hash: runtimeBehaviorModeContentHash(payload),
  created_by: "operator",
  version_reason: "canary-stage",
  created_at: updatedAt,
};

describe("PostgresRuntimeBehaviorModeStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.release });
    mocks.end.mockResolvedValue(undefined);
  });

  it("serializes a CAS activation and reads back the database pointer timestamp", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM runtime_behavior_mode_versions")) return { rows: [targetRow], rowCount: 1 };
      if (sql.includes("FROM runtime_behavior_mode_pointers")) {
        return {
          rows: [{
            active_version_id: "10000000-0000-4000-8000-000000000001",
            pointer_revision: 7,
            previous_confirmation_mode: "LEGACY",
          }],
          rowCount: 1,
        };
      }
      if (sql.includes("UPDATE runtime_behavior_mode_pointers")) {
        return { rows: [{ updated_at: updatedAt }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);
    const result = await store.activateVersion({
      pageId,
      channel,
      targetVersionId,
      expectedPointerRevision: 7,
      actor: "operator",
      reason: "shadow canary",
    });

    expect(result).toMatchObject({ pointerRevision: 8, updatedAt: updatedAt.toISOString() });
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toEqual(expect.arrayContaining([
      "BEGIN",
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringContaining("pointer_revision=$8"),
      "COMMIT",
    ]));
    const pointerLock = statements.find((sql) => sql.includes("FROM runtime_behavior_mode_pointers p"));
    expect(pointerLock).toContain("FOR UPDATE OF p");
    expect(pointerLock).not.toMatch(/FOR UPDATE\s*$/u);
    expect(statements.some((sql) => sql.includes("INSERT INTO runtime_behavior_mode_activation_audit"))).toBe(false);
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("rolls back stale CAS without writing the pointer", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM runtime_behavior_mode_versions")) return { rows: [targetRow], rowCount: 1 };
      if (sql.includes("FROM runtime_behavior_mode_pointers")) {
        return { rows: [{ active_version_id: targetVersionId, pointer_revision: 9, previous_confirmation_mode: "V2_SHADOW" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);
    await expect(store.activateVersion({
      pageId,
      channel,
      targetVersionId,
      expectedPointerRevision: 8,
      actor: "operator",
      reason: "stale writer",
    })).rejects.toThrow("RUNTIME_BEHAVIOR_POINTER_CAS_MISMATCH");
    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("UPDATE runtime_behavior_mode_pointers"))).toBe(false);
  });

  it("rejects future-track version creation before touching the database", async () => {
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);
    await expect(store.createVersion({
      pageId,
      channel,
      payload: { ...payload, salesAuthorityMode: "SHADOW" },
      actor: "operator",
      reason: "out of scope",
    })).rejects.toThrow("RUNTIME_BEHAVIOR_NON_CONFIRMATION_TRACK_FORBIDDEN");
    expect(mocks.poolQuery).not.toHaveBeenCalled();
  });

  it("creates an immutable COMMERCE version only with an exact authority bundle hash", async () => {
    const commercePayload = {
      confirmationMode: "V2_ACTIVE" as const,
      salesAuthorityMode: "COMMERCE" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: "a".repeat(64),
    };
    mocks.poolQuery.mockResolvedValue({
      rows: [{
        ...targetRow,
        sales_authority_mode: "COMMERCE",
        authority_bundle_hash: commercePayload.authorityBundleHash,
        content_hash: runtimeBehaviorModeContentHash(commercePayload),
      }],
      rowCount: 1,
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);

    const version = await store.createVersion({
      pageId,
      channel,
      payload: commercePayload,
      actor: "operator",
      reason: "df13 immutable target",
    });

    expect(version).toMatchObject({
      salesAuthorityMode: "COMMERCE",
      authorityBundleHash: commercePayload.authorityBundleHash,
      contentHash: runtimeBehaviorModeContentHash(commercePayload),
    });
    expect(String(mocks.poolQuery.mock.calls[0]?.[0])).toContain("authority_bundle_hash");
  });

  it("requires the dedicated fenced workflow to activate a stored COMMERCE version", async () => {
    const commercePayload = {
      confirmationMode: "V2_ACTIVE" as const,
      salesAuthorityMode: "COMMERCE" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: "a".repeat(64),
    };
    const commerceTarget = {
      ...targetRow,
      sales_authority_mode: "COMMERCE",
      authority_bundle_hash: commercePayload.authorityBundleHash,
      content_hash: runtimeBehaviorModeContentHash(commercePayload),
    };
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM runtime_behavior_mode_versions")) {
        return { rows: [commerceTarget], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);

    await expect(store.activateVersion({
      pageId,
      channel,
      targetVersionId,
      expectedPointerRevision: 7,
      actor: "operator",
      reason: "generic activation must not bypass DF13 fence",
    })).rejects.toThrow("RUNTIME_BEHAVIOR_COMMERCE_CUTOVER_DEDICATED_PATH_REQUIRED");

    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("FROM runtime_behavior_mode_pointers"))).toBe(false);
    expect(statements.some((sql) => sql.includes("UPDATE runtime_behavior_mode_pointers"))).toBe(false);
  });

  it("fails closed when an idempotency key already belongs to different resolution evidence", async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);
    await expect(store.recordResolution({
      resolutionId: "20000000-0000-4000-8000-000000000001",
      pageId,
      channel,
      confirmationMode: "V2_ACTIVE",
      modeVersionId: targetVersionId,
      contentHash: targetRow.content_hash,
      pointerRevision: 8,
      source: "DATABASE",
      status: "RESOLVED",
      reasonCodes: [],
      workerId: "worker-1",
      pointerUpdatedAt: updatedAt.toISOString(),
      resolvedAt: updatedAt.toISOString(),
      propagationMs: 0,
    })).rejects.toThrow("RUNTIME_BEHAVIOR_RESOLUTION_AUDIT_CONFLICT");
    expect(mocks.poolQuery).toHaveBeenCalledTimes(2);
    expect(String(mocks.poolQuery.mock.calls[0]?.[0])).toContain("ON CONFLICT");
    expect(String(mocks.poolQuery.mock.calls[1]?.[0])).toContain("IS NOT DISTINCT FROM");
  });
});
