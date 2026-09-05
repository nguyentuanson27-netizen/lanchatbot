import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  behaviorModeContentHash,
  type RuntimeBehaviorModePointer,
} from "@lana/chat-runtime";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  DF13_COMMERCE_PREPROD_SCOPE_V1,
  GATE_E_PREPROD_V15_BINDING,
} from "./df13-commerce-cutover.js";
import type { MissingCommerceSignal } from "./missing-commerce-signal.js";
import type { Df13ReleaseCandidateEvidence } from "./df13-release-candidate-evidence.js";

const prepareReleaseEvidence = vi.hoisted(() => vi.fn());
const validateReleaseEvidence = vi.hoisted(() => vi.fn());

vi.mock("./df13-release-candidate-evidence.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./df13-release-candidate-evidence.js")>();
  return {
    ...actual,
    prepareDf13ReleaseCandidateEvidence: prepareReleaseEvidence,
    validateDf13ReleaseCandidateEvidence: validateReleaseEvidence,
  };
});

import {
  parseDf13CommerceOperationalCommand,
  runDf13CommerceOperationalEntrypoint,
  type Df13CommerceOperationalPorts,
} from "./df13-commerce-operational-entrypoint.js";

const pageId = DF13_COMMERCE_PREPROD_SCOPE_V1.pageId;
const releaseRevision = "a".repeat(40);
const preparedEvidence = {
  status: "SOURCE_READY_NO_ACTIVATION",
  sideEffects: "NOT_EXECUTED",
  activationReleaseRevision: releaseRevision,
  releaseSource: { resolvedRevision: releaseRevision, treeOid: "e".repeat(40) },
  candidateProjection: { contentFingerprint: GATE_E_PREPROD_V15_BINDING.candidateContentFingerprint },
  migration: { artifacts: [] },
  evidenceHash: "f".repeat(64),
} as unknown as Df13ReleaseCandidateEvidence;

function pointer(
  salesAuthorityMode: "LEGACY" | "COMMERCE",
  pointerRevision: number,
): RuntimeBehaviorModePointer {
  const payload = {
    confirmationMode: "V2_ACTIVE" as const,
    salesAuthorityMode,
    stateReadMode: "LEGACY" as const,
    authorityBundleHash: salesAuthorityMode === "COMMERCE"
      ? DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
      : null,
  };
  return {
    version: {
      schemaVersion: 1,
      modeVersionId: `10000000-0000-4000-8000-${String(pointerRevision).padStart(12, "0")}`,
      pageId,
      channel: "MESSENGER",
      ...payload,
      contentHash: behaviorModeContentHash(payload),
      createdBy: "df13-test",
      reason: "test",
      createdAt: "2026-08-25T00:00:00.000Z",
    },
    pointerRevision,
    updatedBy: "df13-test",
    reason: "test",
    updatedAt: "2026-08-25T00:00:00.000Z",
  };
}

function missingCommerceSignal(): MissingCommerceSignal {
  return {
    contractVersion: "MISSING_COMMERCE_SIGNAL_V1",
    status: "COMMERCE_STATE_PRESENT",
    activeAuthority: "LEGACY",
    candidateAuthority: "COMMERCE",
    sideEffects: "DISABLED",
    futureCommerceDisposition: "SATISFIED",
    canonicalIntentFingerprint: "b".repeat(64),
    commerceContentFingerprint: "c".repeat(64),
    reasonCodes: ["COMMERCE_STATE_PRESENT"],
  };
}

function command(operation: "PREPARE" | "ACTIVATE" | "RECONCILE" | "ROLLBACK") {
  const currentPointer = pointer("LEGACY", 5);
  const targetPointer = pointer("COMMERCE", 6);
  return {
    schemaVersion: 1,
    contractVersion: "DF13_COMMERCE_OPERATIONAL_ENTRYPOINT_V1",
    operation,
    operationId: "10000000-0000-4000-8000-000000000001",
    pageId,
    channel: "MESSENGER",
    releaseSource: {
      schemaVersion: 1,
      release: "df13-test-release",
      repository: "https://github.com/nguyentuanson27-netizen/lanchatbot",
      tag: "df13-test-release",
      commit: releaseRevision,
      createdAt: "2026-08-25T00:00:00.000Z",
    },
    preflight: {
      pageId,
      channel: "MESSENGER",
      currentPointer,
      targetPointer,
      candidate: {
        gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
        gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
        activationReleaseRevision: releaseRevision,
      },
      missingCommerceSignal: missingCommerceSignal(),
      verification: {
        transitionMatrixPassed: true,
        bfDfReplayPassed: true,
        rollbackVerified: true,
      },
    },
    migrationReadiness: {
      status: "DISPOSABLE_REHEARSAL_RECORDED",
      evidenceSha256: "d".repeat(64),
    },
  } as const;
}

function ports() {
  const calls = {
    hold: 0,
    durableAcquire: [] as unknown[],
    durableRelease: 0,
    releaseSource: 0,
    migrationReadiness: 0,
    activate: 0,
    rollback: 0,
    release: 0,
  };
  const target = pointer("COMMERCE", 6);
  const legacy = pointer("LEGACY", 7);
  const cutover: Df13CommerceOperationalPorts = {
    durableCutoverFence: {
      async acquire(input) {
        calls.durableAcquire.push(input);
        return {
          status: "HELD" as const,
          lease: {
            fenceId: "10000000-0000-4000-8000-000000000021",
            fenceToken: "10000000-0000-4000-8000-000000000022",
            epoch: 1,
          },
        };
      },
      async observe() { return { status: "MISSING" as const }; },
      async release() { calls.durableRelease += 1; return { status: "RELEASED" as const }; },
      async close() {},
    },
    releaseCandidateSource: {
      async refreshTrustedRef() {},
      async resolveRef() { return releaseRevision; },
      async resolveTreeOid() { return "e".repeat(40); },
      async readBlob() { return "source"; },
      async resolveBlobOid() { return "f".repeat(40); },
    },
    async holdAuthorityDependentWork(input) {
      calls.hold += 1;
      return { status: "HELD" as const, fenceToken: "fence-1" };
    },
    async releaseAuthorityDependentWork() { calls.release += 1; },
    async readReleaseSource() {
      calls.releaseSource += 1;
      return command("PREPARE").releaseSource;
    },
    async verifyMigrationReadiness() {
      calls.migrationReadiness += 1;
      return "EXACT" as const;
    },
    async proveQuiescence() {
      return { status: "QUIESCENT" as const, inFlightAuthorityDependentWork: 0, queuedWork: "HELD" as const };
    },
    async activateCommerce() {
      calls.activate += 1;
      return { status: "ACKNOWLEDGED" as const };
    },
    async readActivePointer() { return target; },
    async readActivationAudit() { return "EXACT" as const; },
    async readConsumerAuthorities() {
      return DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: target.version.modeVersionId,
        contentHash: target.version.contentHash,
        pointerRevision: target.pointerRevision,
        salesAuthorityMode: "COMMERCE" as const,
        stateReadMode: "LEGACY" as const,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      }));
    },
    async rollbackToLegacy() {
      calls.rollback += 1;
      return { status: "ACKNOWLEDGED" as const };
    },
  };
  return { calls, cutover, legacy };
}

describe("DF13 operational entrypoint", () => {
  beforeEach(() => {
    prepareReleaseEvidence.mockReset();
    validateReleaseEvidence.mockReset();
    prepareReleaseEvidence.mockResolvedValue(preparedEvidence);
    validateReleaseEvidence.mockReturnValue({ status: "MATCHED", reasonCodes: [] });
  });

  it("keeps PREPARE source-only while binding an immutable release and migration rehearsal", async () => {
    const { calls, cutover } = ports();

    await expect(runDf13CommerceOperationalEntrypoint({
      command: command("PREPARE"),
      ports: cutover,
    })).resolves.toMatchObject({
      status: "PREPARED_NO_ACTIVATION",
      sideEffects: "NOT_EXECUTED",
      operation: "PREPARE",
      pageId,
      channel: "MESSENGER",
    });
    expect(calls).toEqual({ hold: 0, durableAcquire: [], durableRelease: 0, releaseSource: 1, migrationReadiness: 1, activate: 0, rollback: 0, release: 0 });
  });

  it("rejects a generic or wrong-scope request before it touches the control plane", async () => {
    const { calls, cutover } = ports();
    const invalid = {
      ...command("ACTIVATE"),
      pageId: "1198992073286646",
      preflight: { ...command("ACTIVATE").preflight, pageId: "1198992073286646" },
    };

    await expect(runDf13CommerceOperationalEntrypoint({ command: invalid, ports: cutover }))
      .resolves.toMatchObject({ status: "BLOCKED", sideEffects: "NOT_EXECUTED" });
    expect(calls).toEqual({ hold: 0, durableAcquire: [], durableRelease: 0, releaseSource: 0, migrationReadiness: 0, activate: 0, rollback: 0, release: 0 });
    expect(() => parseDf13CommerceOperationalCommand({ ...command("PREPARE"), operation: "LEGACY" }))
      .toThrow("DF13_OPERATIONAL_COMMAND_INVALID");
  });

  it("fails closed before acquiring a fence when the re-derived release evidence mismatches", async () => {
    const { calls, cutover } = ports();
    validateReleaseEvidence.mockReturnValue({
      status: "MISMATCH",
      reasonCodes: ["DF13_GATE_E_CANDIDATE_FINGERPRINT_MISMATCH"],
    });

    await expect(runDf13CommerceOperationalEntrypoint({
      command: command("ACTIVATE"),
      ports: cutover,
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_GATE_E_CANDIDATE_FINGERPRINT_MISMATCH"],
    });
    expect(calls).toEqual({ hold: 0, durableAcquire: [], durableRelease: 0, releaseSource: 1, migrationReadiness: 0, activate: 0, rollback: 0, release: 0 });
  });

  it("rejects a malformed nested preflight before it can reach a port", async () => {
    const { calls, cutover } = ports();
    const malformed = {
      ...command("ACTIVATE"),
      preflight: { pageId, channel: "MESSENGER" },
    };

    await expect(runDf13CommerceOperationalEntrypoint({
      command: malformed,
      ports: cutover,
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_OPERATIONAL_COMMAND_INVALID"],
    });
    expect(calls).toEqual({ hold: 0, durableAcquire: [], durableRelease: 0, releaseSource: 0, migrationReadiness: 0, activate: 0, rollback: 0, release: 0 });
  });

  it("requires an exact migration-rehearsal evidence readback before activation", async () => {
    const { calls, cutover } = ports();
    const mismatchedCutover: Df13CommerceOperationalPorts = {
      ...cutover,
      async verifyMigrationReadiness() {
        calls.migrationReadiness += 1;
        return "MISMATCH";
      },
    };

    await expect(runDf13CommerceOperationalEntrypoint({
      command: command("ACTIVATE"),
      ports: mismatchedCutover,
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_OPERATIONAL_MIGRATION_READINESS_MISMATCH"],
    });
    expect(calls).toEqual({ hold: 0, durableAcquire: [], durableRelease: 0, releaseSource: 1, migrationReadiness: 1, activate: 0, rollback: 0, release: 0 });
  });

  it("requires field-for-field release-host source readback before forward work", async () => {
    const { calls, cutover } = ports();
    const mismatchedSource: Df13CommerceOperationalPorts = {
      ...cutover,
      async readReleaseSource() {
        calls.releaseSource += 1;
        return { ...command("PREPARE").releaseSource, createdAt: "2026-08-25T00:00:01.000Z" };
      },
    };

    await expect(runDf13CommerceOperationalEntrypoint({
      command: command("ACTIVATE"),
      ports: mismatchedSource,
    })).resolves.toMatchObject({
      status: "BLOCKED",
      reasonCodes: ["DF13_OPERATIONAL_RELEASE_SOURCE_MISMATCH"],
    });
    expect(calls).toEqual({ hold: 0, durableAcquire: [], durableRelease: 0, releaseSource: 1, migrationReadiness: 0, activate: 0, rollback: 0, release: 0 });
  });

  it("sends ACTIVATION through the typed cutover contract exactly once", async () => {
    const { calls, cutover } = ports();

    await expect(runDf13CommerceOperationalEntrypoint({
      command: command("ACTIVATE"),
      ports: cutover,
    })).resolves.toMatchObject({
      status: "COMMERCE_ACTIVE",
      operation: "ACTIVATE",
      sideEffects: "CONTROL_PLANE_ONLY",
    });
    expect(calls.hold).toBe(1);
    expect(calls.durableAcquire).toEqual([expect.objectContaining({
      operationId: "10000000-0000-4000-8000-000000000001",
      preCutover: expect.objectContaining({ pointerRevision: 5 }),
      target: expect.objectContaining({ authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash }),
    })]);
    expect(calls.activate).toBe(1);
    expect(calls.release).toBe(1);
    expect(calls.durableRelease).toBe(1);
  });

  it("does not touch the worker hold or CAS when the durable operation fence requires reconciliation", async () => {
    const { calls, cutover } = ports();
    const heldElsewhere: Df13CommerceOperationalPorts = {
      ...cutover,
      durableCutoverFence: {
        ...cutover.durableCutoverFence,
        async acquire() {
          return {
            status: "HELD_RECONCILE_REQUIRED" as const,
            fenceId: "10000000-0000-4000-8000-000000000021",
            epoch: 1,
          };
        },
      },
    };

    await expect(runDf13CommerceOperationalEntrypoint({
      command: command("ACTIVATE"),
      ports: heldElsewhere,
    })).resolves.toMatchObject({
      status: "BLOCKED_LEGACY",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_AUTHORITY_FENCE_NOT_HELD"],
    });
    expect(calls.hold).toBe(0);
    expect(calls.activate).toBe(0);
    expect(calls.durableRelease).toBe(0);
  });

  it("routes ROLLBACK only through interruption recovery, never a generic LEGACY writer", async () => {
    const { calls, cutover } = ports();

    await expect(runDf13CommerceOperationalEntrypoint({
      command: command("ROLLBACK"),
      ports: cutover,
    })).resolves.toMatchObject({
      status: "HOLD_RETAINED",
      operation: "ROLLBACK",
      sideEffects: "CONTROL_PLANE_ONLY",
    });
    expect(calls.hold).toBe(1);
    expect(calls.rollback).toBe(1);
    expect(calls.release).toBe(0);
    expect(calls.releaseSource).toBe(0);
    expect(calls.migrationReadiness).toBe(0);
  });

  it("keeps ROLLBACK available when forward release and migration evidence are unavailable", async () => {
    const { calls, cutover } = ports();
    prepareReleaseEvidence.mockRejectedValue(new Error("source-unavailable"));
    const unavailableForwardEvidence: Df13CommerceOperationalPorts = {
      ...cutover,
      async readReleaseSource() { throw new Error("host-source-unavailable"); },
      async verifyMigrationReadiness() { throw new Error("rehearsal-unavailable"); },
    };

    await expect(runDf13CommerceOperationalEntrypoint({
      command: command("ROLLBACK"),
      ports: unavailableForwardEvidence,
    })).resolves.toMatchObject({
      operation: "ROLLBACK",
      status: "HOLD_RETAINED",
      migrationReadiness: "UNVERIFIED",
    });
    expect(calls.hold).toBe(1);
    expect(calls.durableAcquire).toHaveLength(1);
    expect(calls.releaseSource).toBe(0);
    expect(calls.migrationReadiness).toBe(0);
  });

  it("emits canonical redacted evidence without retaining unknown input fields", () => {
    expect(() => parseDf13CommerceOperationalCommand({
      ...command("PREPARE"),
      untrustedOperatorNote: "must-not-be-retained",
    })).toThrow("DF13_OPERATIONAL_COMMAND_INVALID");
    expect(() => parseDf13CommerceOperationalCommand({
      ...command("PREPARE"),
      preflight: { ...command("PREPARE").preflight, untrustedNestedValue: true },
    })).toThrow("DF13_OPERATIONAL_COMMAND_INVALID");
    expect(() => parseDf13CommerceOperationalCommand({
      ...command("PREPARE"),
      preflight: {
        ...command("PREPARE").preflight,
        currentPointer: {
          ...command("PREPARE").preflight.currentPointer,
          version: { ...command("PREPARE").preflight.currentPointer.version, untrustedNestedValue: true },
        },
      },
    })).toThrow("DF13_OPERATIONAL_COMMAND_INVALID");
  });
});
