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

  it("rejects future-track activation before touching the database", async () => {
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);
    await expect(store.createVersion({
      pageId,
      channel,
      payload: { ...payload, salesAuthorityMode: "COMMERCE" },
      actor: "operator",
      reason: "out of scope",
    })).rejects.toThrow("RUNTIME_BEHAVIOR_NON_CONFIRMATION_TRACK_FORBIDDEN");
    expect(mocks.poolQuery).not.toHaveBeenCalled();
  });
});
