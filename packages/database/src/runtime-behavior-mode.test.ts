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
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";

const pageId = "1198992073286645";
const channel = "MESSENGER";
const targetVersionId = "10000000-0000-4000-8000-000000000002";
const updatedAt = new Date("2026-08-03T01:02:03.000Z");
const canonicalDf13BundleHash = DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash;
const firstPreprodProof = Object.freeze({
  verifiedAt: "2026-08-25T00:00:00.000Z",
  proofHash: "f".repeat(64),
});
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
    const targetLookup = statements.find((sql) => sql.includes("FROM runtime_behavior_mode_versions"));
    expect(targetLookup).toContain("to_jsonb(v) ->> 'authority_bundle_hash'");
    expect(targetLookup).not.toContain("v.authority_bundle_hash");
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("loads a LEGACY pointer without requiring the pending 0035 column", async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ ...targetRow, pointer_revision: 7, updated_by: "operator", pointer_reason: "legacy", updated_at: updatedAt }],
      rowCount: 1,
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);

    await expect(store.loadActiveMode({ pageId, channel })).resolves.toMatchObject({
      version: { salesAuthorityMode: "LEGACY", authorityBundleHash: null },
      pointerRevision: 7,
    });

    const statement = String(mocks.poolQuery.mock.calls[0]?.[0]);
    expect(statement).toContain("to_jsonb(v) ->> 'authority_bundle_hash'");
    expect(statement).not.toContain("v.authority_bundle_hash");
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
      confirmationMode: "V2_SHADOW" as const,
      salesAuthorityMode: "COMMERCE" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: canonicalDf13BundleHash,
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

  it("creates a LEGACY version without requiring the pending 0035 column", async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [targetRow], rowCount: 1 });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);

    await expect(store.createVersion({
      pageId,
      channel,
      payload,
      actor: "operator",
      reason: "legacy compatible source",
      now: updatedAt,
    })).resolves.toMatchObject({ salesAuthorityMode: "LEGACY", authorityBundleHash: null });

    const [statement, values] = mocks.poolQuery.mock.calls[0] ?? [];
    const insertedColumns = String(statement).slice(
      String(statement).indexOf("("),
      String(statement).indexOf(") VALUES"),
    );
    expect(insertedColumns).not.toContain("authority_bundle_hash");
    expect(values).toHaveLength(9);
  });

  it("prepares a first-PREPROD COMMERCE version under the exact LEGACY pointer lock without moving that pointer", async () => {
    const legacyPayload = {
      confirmationMode: "V2_ACTIVE" as const,
      salesAuthorityMode: "LEGACY" as const,
      stateReadMode: "LEGACY" as const,
    };
    const commercePayload = {
      confirmationMode: "V2_ACTIVE" as const,
      salesAuthorityMode: "COMMERCE" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: canonicalDf13BundleHash,
    };
    const legacyPointer = {
      ...targetRow,
      mode_version_id: "10000000-0000-4000-8000-000000000001",
      confirmation_mode: legacyPayload.confirmationMode,
      sales_authority_mode: legacyPayload.salesAuthorityMode,
      state_read_mode: legacyPayload.stateReadMode,
      content_hash: runtimeBehaviorModeContentHash(legacyPayload),
      pointer_revision: 3,
      updated_by: "known-good-release",
      pointer_reason: "known-good",
      updated_at: updatedAt,
    };
    const prepared = {
      ...targetRow,
      mode_version_id: "10000000-0000-4000-8000-000000000004",
      confirmation_mode: commercePayload.confirmationMode,
      sales_authority_mode: commercePayload.salesAuthorityMode,
      state_read_mode: commercePayload.stateReadMode,
      authority_bundle_hash: commercePayload.authorityBundleHash,
      content_hash: runtimeBehaviorModeContentHash(commercePayload),
      created_by: "DF13_FIRST_PREPROD_WRITER",
      version_reason: "DF13_FIRST_PREPROD_PREPARE:10000000-0000-4000-8000-000000000010",
    };
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("clock_timestamp() AS operation_now")) {
        return { rows: [{ operation_now: new Date("2026-08-25T00:01:00.000Z") }], rowCount: 1 };
      }
      if (sql.includes("FROM runtime_behavior_mode_pointers p")) {
        return { rows: [legacyPointer], rowCount: 1 };
      }
      if (sql.includes("SELECT v.mode_version_id") && sql.includes("v.content_hash = $3")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("INSERT INTO runtime_behavior_mode_versions")) {
        return { rows: [prepared], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);

    await expect(store.prepareDf13FirstPreprodCommerceVersion({
      pageId,
      channel,
      expectedCurrent: {
        modeVersionId: legacyPointer.mode_version_id,
        contentHash: legacyPointer.content_hash,
        pointerRevision: 3,
      },
      proof: firstPreprodProof,
      actor: "DF13_FIRST_PREPROD_WRITER",
      reason: prepared.version_reason,
    })).resolves.toMatchObject({
      modeVersionId: prepared.mode_version_id,
      salesAuthorityMode: "COMMERCE",
      authorityBundleHash: canonicalDf13BundleHash,
    });

    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toEqual(expect.arrayContaining([
      "BEGIN",
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringContaining("FOR UPDATE OF p"),
      "COMMIT",
    ]));
    expect(statements.some((sql) => sql.includes("UPDATE runtime_behavior_mode_pointers"))).toBe(false);
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
      mode_version_id: "10000000-0000-4000-8000-000000000003",
      sales_authority_mode: "COMMERCE",
      authority_bundle_hash: commercePayload.authorityBundleHash,
      content_hash: runtimeBehaviorModeContentHash(commercePayload),
    };
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("clock_timestamp() AS operation_now")) {
        return { rows: [{ operation_now: new Date("2026-08-25T00:01:00.000Z") }], rowCount: 1 };
      }
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

  it("rejects a generic COMMERCE-to-LEGACY pointer change without writing the pointer", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM runtime_behavior_mode_versions")) {
        return { rows: [targetRow], rowCount: 1 };
      }
      if (sql.includes("FROM runtime_behavior_mode_pointers")) {
        return {
          rows: [{
            active_version_id: "10000000-0000-4000-8000-000000000003",
            pointer_revision: 7,
            previous_confirmation_mode: "V2_SHADOW",
            previous_sales_authority_mode: "COMMERCE",
          }],
          rowCount: 1,
        };
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
      reason: "generic rollback must not bypass DF13 proof and audit",
    })).rejects.toThrow("RUNTIME_BEHAVIOR_COMMERCE_ROLLBACK_DEDICATED_PATH_REQUIRED");

    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => sql.includes("UPDATE runtime_behavior_mode_pointers"))).toBe(false);
  });

  it("admits the exact first-PREPROD COMMERCE pointer only through its non-generic writer", async () => {
    const commercePayload = {
      confirmationMode: "V2_SHADOW" as const,
      salesAuthorityMode: "COMMERCE" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: canonicalDf13BundleHash,
    };
    const commerceTarget = {
      ...targetRow,
      confirmation_mode: commercePayload.confirmationMode,
      sales_authority_mode: commercePayload.salesAuthorityMode,
      state_read_mode: commercePayload.stateReadMode,
      authority_bundle_hash: commercePayload.authorityBundleHash,
      content_hash: runtimeBehaviorModeContentHash(commercePayload),
    };
    const legacyCurrent = {
      ...targetRow,
      pointer_revision: 3,
      updated_by: "legacy-release",
      pointer_reason: "known good legacy",
      updated_at: updatedAt,
    };
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("clock_timestamp() AS operation_now")) {
        return { rows: [{ operation_now: new Date("2026-08-25T00:01:00.000Z") }], rowCount: 1 };
      }
      if (sql.includes("FROM runtime_behavior_mode_versions")) {
        return { rows: [commerceTarget], rowCount: 1 };
      }
      if (sql.includes("FROM runtime_behavior_mode_pointers")) {
        return { rows: [legacyCurrent], rowCount: 1 };
      }
      if (sql.includes("UPDATE runtime_behavior_mode_pointers")) {
        return { rows: [{ updated_at: updatedAt }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);

    await expect(store.activateDf13FirstPreprodExactPointer({
      pageId,
      channel,
      operation: "ACTIVATE_COMMERCE",
      expectedCurrent: {
        modeVersionId: targetVersionId,
        contentHash: targetRow.content_hash,
        pointerRevision: 3,
      },
      target: {
        modeVersionId: commerceTarget.mode_version_id,
        contentHash: commerceTarget.content_hash,
      },
      proof: firstPreprodProof,
      actor: "DF13_FIRST_PREPROD_WRITER",
      reason: "DF13_FIRST_PREPROD_ACTIVATE:10000000-0000-4000-8000-000000000010",
    })).resolves.toMatchObject({
      pointerRevision: 4,
      version: {
        salesAuthorityMode: "COMMERCE",
        authorityBundleHash: commercePayload.authorityBundleHash,
      },
    });
    const update = mocks.clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes("UPDATE runtime_behavior_mode_pointers")
    );
    expect(update).toBeDefined();
    expect(update?.[1]).toEqual(expect.arrayContaining([
      "DF13_FIRST_PREPROD_WRITER",
      "DF13_FIRST_PREPROD_ACTIVATE:10000000-0000-4000-8000-000000000010",
    ]));
  });

  it("rejects a first-PREPROD forward target whose bundle is not the canonical DF13 identity", async () => {
    const nonCanonicalCommerce = {
      ...targetRow,
      mode_version_id: "10000000-0000-4000-8000-000000000004",
      sales_authority_mode: "COMMERCE",
      authority_bundle_hash: "b".repeat(64),
      content_hash: runtimeBehaviorModeContentHash({
        confirmationMode: "V2_SHADOW",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: "b".repeat(64),
      }),
    };
    const legacyCurrent = {
      ...targetRow,
      pointer_revision: 3,
      updated_by: "legacy-release",
      pointer_reason: "known good legacy",
      updated_at: updatedAt,
    };
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("clock_timestamp() AS operation_now")) {
        return { rows: [{ operation_now: new Date("2026-08-25T00:01:00.000Z") }], rowCount: 1 };
      }
      if (sql.includes("FROM runtime_behavior_mode_versions")) return { rows: [nonCanonicalCommerce], rowCount: 1 };
      if (sql.includes("FROM runtime_behavior_mode_pointers")) return { rows: [legacyCurrent], rowCount: 1 };
      if (sql.includes("UPDATE runtime_behavior_mode_pointers")) return { rows: [{ updated_at: updatedAt }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);

    await expect(store.activateDf13FirstPreprodExactPointer({
      pageId,
      channel,
      operation: "ACTIVATE_COMMERCE",
      expectedCurrent: {
        modeVersionId: targetVersionId,
        contentHash: targetRow.content_hash,
        pointerRevision: 3,
      },
      target: {
        modeVersionId: nonCanonicalCommerce.mode_version_id,
        contentHash: nonCanonicalCommerce.content_hash,
      },
      proof: firstPreprodProof,
      actor: "DF13_FIRST_PREPROD_WRITER",
      reason: "DF13_FIRST_PREPROD_ACTIVATE:10000000-0000-4000-8000-000000000010",
    })).rejects.toThrow("DF13_FIRST_PREPROD_AUTHORITY_BUNDLE_MISMATCH");
    expect(mocks.clientQuery.mock.calls.some(([sql]) =>
      String(sql).includes("UPDATE runtime_behavior_mode_pointers")
    )).toBe(false);
  });

  it("rechecks the zero-work proof against the database clock after acquiring the pointer lock", async () => {
    const commerceTarget = {
      ...targetRow,
      mode_version_id: "10000000-0000-4000-8000-000000000004",
      sales_authority_mode: "COMMERCE",
      authority_bundle_hash: canonicalDf13BundleHash,
      content_hash: runtimeBehaviorModeContentHash({
        confirmationMode: "V2_SHADOW",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: canonicalDf13BundleHash,
      }),
    };
    const legacyCurrent = {
      ...targetRow,
      pointer_revision: 3,
      updated_by: "legacy-release",
      pointer_reason: "known good legacy",
      updated_at: updatedAt,
    };
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("clock_timestamp() AS operation_now")) {
        return { rows: [{ operation_now: new Date("2026-08-25T00:15:00.001Z") }], rowCount: 1 };
      }
      if (sql.includes("FROM runtime_behavior_mode_versions")) return { rows: [commerceTarget], rowCount: 1 };
      if (sql.includes("FROM runtime_behavior_mode_pointers")) return { rows: [legacyCurrent], rowCount: 1 };
      if (sql.includes("UPDATE runtime_behavior_mode_pointers")) return { rows: [{ updated_at: updatedAt }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);

    await expect(store.activateDf13FirstPreprodExactPointer({
      pageId,
      channel,
      operation: "ACTIVATE_COMMERCE",
      expectedCurrent: {
        modeVersionId: targetVersionId,
        contentHash: targetRow.content_hash,
        pointerRevision: 3,
      },
      target: {
        modeVersionId: commerceTarget.mode_version_id,
        contentHash: commerceTarget.content_hash,
      },
      proof: firstPreprodProof,
      actor: "DF13_FIRST_PREPROD_WRITER",
      reason: "DF13_FIRST_PREPROD_ACTIVATE:10000000-0000-4000-8000-000000000010",
    })).rejects.toThrow("DF13_FIRST_PREPROD_ZERO_WORK_PROOF_STALE");
    expect(mocks.clientQuery.mock.calls.some(([sql]) =>
      String(sql).includes("UPDATE runtime_behavior_mode_pointers")
    )).toBe(false);
  });

  it("rejects a rollback target that is not the exact pre-cutover identity in the current forward audit", async () => {
    const commerceCurrent = {
      ...targetRow,
      mode_version_id: "10000000-0000-4000-8000-000000000004",
      sales_authority_mode: "COMMERCE",
      authority_bundle_hash: canonicalDf13BundleHash,
      content_hash: runtimeBehaviorModeContentHash({
        confirmationMode: "V2_SHADOW",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: canonicalDf13BundleHash,
      }),
      pointer_revision: 4,
      updated_by: "DF13_FIRST_PREPROD_WRITER",
      pointer_reason: "DF13_FIRST_PREPROD_ACTIVATE:10000000-0000-4000-8000-000000000010",
      updated_at: updatedAt,
    };
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("clock_timestamp() AS operation_now")) {
        return { rows: [{ operation_now: new Date("2026-08-25T00:01:00.000Z") }], rowCount: 1 };
      }
      if (sql.includes("FROM runtime_behavior_mode_activation_audit")) {
        return {
          rows: [{
            previous_version_id: "10000000-0000-4000-8000-000000000099",
            new_version_id: commerceCurrent.mode_version_id,
            new_pointer_revision: 4,
            actor: commerceCurrent.updated_by,
            reason: commerceCurrent.pointer_reason,
          }],
          rowCount: 1,
        };
      }
      if (sql.includes("FROM runtime_behavior_mode_versions")) return { rows: [targetRow], rowCount: 1 };
      if (sql.includes("FROM runtime_behavior_mode_pointers")) return { rows: [commerceCurrent], rowCount: 1 };
      if (sql.includes("UPDATE runtime_behavior_mode_pointers")) return { rows: [{ updated_at: updatedAt }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);

    await expect(store.activateDf13FirstPreprodExactPointer({
      pageId,
      channel,
      operation: "ROLLBACK_LEGACY",
      expectedCurrent: {
        modeVersionId: commerceCurrent.mode_version_id,
        contentHash: commerceCurrent.content_hash,
        pointerRevision: 4,
      },
      target: {
        modeVersionId: targetVersionId,
        contentHash: targetRow.content_hash,
      },
      proof: firstPreprodProof,
      actor: "DF13_FIRST_PREPROD_WRITER",
      reason: "DF13_FIRST_PREPROD_ROLLBACK:10000000-0000-4000-8000-000000000011",
    })).rejects.toThrow("DF13_FIRST_PREPROD_ROLLBACK_IDENTITY_MISMATCH");
    expect(mocks.clientQuery.mock.calls.some(([sql]) =>
      String(sql).includes("UPDATE runtime_behavior_mode_pointers")
    )).toBe(false);
  });

  it("rejects any page/channel outside the single first-PREPROD writer scope", async () => {
    const store = new PostgresRuntimeBehaviorModeStore("postgresql://test", 1);
    await expect(store.activateDf13FirstPreprodExactPointer({
      pageId: "another-page",
      channel,
      operation: "ACTIVATE_COMMERCE",
      expectedCurrent: {
        modeVersionId: targetVersionId,
        contentHash: targetRow.content_hash,
        pointerRevision: 3,
      },
      target: {
        modeVersionId: "10000000-0000-4000-8000-000000000003",
        contentHash: `sha256:${"a".repeat(64)}`,
      },
      proof: firstPreprodProof,
      actor: "DF13_FIRST_PREPROD_WRITER",
      reason: "DF13_FIRST_PREPROD_ACTIVATE:10000000-0000-4000-8000-000000000010",
    })).rejects.toThrow("DF13_FIRST_PREPROD_WRITER_SCOPE_INVALID");
    expect(mocks.connect).not.toHaveBeenCalled();
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
