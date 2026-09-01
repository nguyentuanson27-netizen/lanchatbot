import { describe, expect, it, vi } from "vitest";
import { behaviorModeContentHash, type RuntimeBehaviorModePointer } from "@lana/chat-runtime";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import {
  executeTrackBCommerceAuthorityMutation,
  createTrackBReleaseLocalRollbackRecord,
  type TrackBCommerceAuthorityMutationPorts,
} from "./track-b-commerce-authority-activation.js";
import type { TrackBReleaseCandidateEvidence } from "./track-b-release-candidate-evidence.js";

const validateReleaseEvidence = vi.hoisted(() => vi.fn(() => ({
  status: "MATCHED" as const,
  reasonCodes: [] as const,
})));

vi.mock("./track-b-release-candidate-evidence.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./track-b-release-candidate-evidence.js")>(),
  validateTrackBReleaseCandidateEvidence: validateReleaseEvidence,
}));

const pageId = "1198992073286645";
const channel = "MESSENGER";
const targetReleaseRevision = "a".repeat(40);
const previousReleaseRevision = "b".repeat(40);

function pointer(input: Readonly<{
  versionId: string;
  revision: number;
  bundleHash: string;
}>): RuntimeBehaviorModePointer {
  const payload = {
    confirmationMode: "V2_ACTIVE" as const,
    salesAuthorityMode: "COMMERCE" as const,
    stateReadMode: "LEGACY" as const,
    authorityBundleHash: input.bundleHash,
  };
  return {
    version: {
      schemaVersion: 1,
      modeVersionId: input.versionId,
      pageId,
      channel,
      ...payload,
      contentHash: behaviorModeContentHash(payload),
      createdBy: "operator",
      reason: "prepared",
      createdAt: "2026-08-31T00:00:00.000Z",
    },
    pointerRevision: input.revision,
    updatedBy: "operator",
    reason: "active",
    updatedAt: "2026-08-31T00:00:00.000Z",
  };
}

const previous = pointer({
  versionId: "10000000-0000-4000-8000-000000000001",
  revision: 6,
  bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
});
const target = pointer({
  versionId: "10000000-0000-4000-8000-000000000002",
  revision: 7,
  bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
});

const rollbackRecord = createTrackBReleaseLocalRollbackRecord({
  selectedSourceCommit: targetReleaseRevision,
  previousService: {
    service: "realtime-worker",
    releaseRevision: previousReleaseRevision,
    buildId: "1".repeat(64), imageId: "2".repeat(64), runtimeConfigHash: "3".repeat(64),
  },
  targetService: {
    service: "realtime-worker",
    releaseRevision: targetReleaseRevision,
    buildId: "4".repeat(64), imageId: "5".repeat(64), runtimeConfigHash: "6".repeat(64),
  },
  previousAuthority: {
    modeVersionId: previous.version.modeVersionId,
    contentHash: previous.version.contentHash,
    bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
  },
  targetAuthority: {
    modeVersionId: target.version.modeVersionId,
    contentHash: target.version.contentHash,
    bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
  },
});

const releaseEvidence = {
  schemaVersion: 1,
  contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1",
  status: "SOURCE_READY_NO_ACTIVATION",
  sideEffects: "NOT_EXECUTED",
  activationReleaseRevision: targetReleaseRevision,
  releaseSource: { trustedRef: "refs/remotes/origin/main", resolvedRevision: targetReleaseRevision, treeOid: "b".repeat(40) },
  gateE: {},
  manifestArtifact: {},
  candidateContentFingerprint: "c".repeat(64),
  authorityMutation: {},
  reasonCodes: [],
  evidenceHash: "d".repeat(64),
} as unknown as TrackBReleaseCandidateEvidence;

function ports(overrides: Partial<TrackBCommerceAuthorityMutationPorts> = {}): TrackBCommerceAuthorityMutationPorts {
  return {
    readPersistedRollbackRecord: vi.fn(async () => rollbackRecord),
    acquireFence: vi.fn(async () => ({
      status: "HELD" as const,
      lease: {
        fenceId: "20000000-0000-4000-8000-000000000001",
        fenceToken: "30000000-0000-4000-8000-000000000001",
        epoch: 1,
      },
    })),
    proveQuiescence: vi.fn(async () => ({
      status: "QUIESCENT" as const,
      activeInbox: 0,
      activeMetaOutbox: 0,
      activePancakeOutbox: 0,
      inFlightAuthorityDependentWork: 0,
      queuedAuthorityDependentWork: 0,
      admission: "HELD" as const,
    })),
    replaceAffectedServices: vi.fn(async ({ sourceService, targetService }) => ({
      status: "READY" as const,
      admission: "HELD" as const,
      observedSourceService: sourceService,
      observedService: targetService,
    })),
    mutateExactPointer: vi.fn(async () => ({ status: "ACKNOWLEDGED" as const })),
    readActivePointer: vi.fn(async () => target),
    readActivationAudit: vi.fn(async () => "EXACT" as const),
    readConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
      consumer,
      source: "DATABASE" as const,
      modeVersionId: target.version.modeVersionId,
      contentHash: target.version.contentHash,
      pointerRevision: target.pointerRevision,
      authorityBundleHash: target.version.authorityBundleHash ?? null,
    }))),
    releaseFence: vi.fn(async () => ({ status: "RELEASED" as const })),
    ...overrides,
  };
}

describe("Track B Commerce authority mutation", () => {
  it("activates the exact V2 identity only after quiescence and full DATABASE convergence", async () => {
    const mutationPorts = ports();

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_TRACK_B",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "TARGET_ACTIVE",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: [],
    });
    expect(mutationPorts.acquireFence).toHaveBeenCalledOnce();
    expect(mutationPorts.proveQuiescence).toHaveBeenCalledTimes(2);
    expect(mutationPorts.replaceAffectedServices).toHaveBeenCalledOnce();
    expect(mutationPorts.mutateExactPointer).toHaveBeenCalledOnce();
    expect(vi.mocked(mutationPorts.replaceAffectedServices).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(mutationPorts.mutateExactPointer).mock.invocationCallOrder[0] ?? 0);
    expect(mutationPorts.readActivationAudit).toHaveBeenCalledWith({
      pointerRevision: 7,
      previousVersionId: previous.version.modeVersionId,
      previousContentHash: previous.version.contentHash,
      targetVersionId: target.version.modeVersionId,
      targetContentHash: target.version.contentHash,
      actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ACTIVATE:40000000-0000-4000-8000-000000000001",
    });
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
  });

  it("supports a separately fenced exact rollback to the recorded V1 identity", async () => {
    const restored = { ...previous, pointerRevision: 8 };
    const mutationPorts = ports({
      readActivePointer: vi.fn(async () => restored),
      readConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: restored.version.modeVersionId,
        contentHash: restored.version.contentHash,
        pointerRevision: restored.pointerRevision,
        authorityBundleHash: restored.version.authorityBundleHash ?? null,
      }))),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000002",
      direction: "ROLLBACK_TRACK_B",
      previous: target,
      target: restored,
      rollbackRecord,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "PREVIOUS_RESTORED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: [],
    });
  });

  it("retains the fence and never reports success when one consumer is stale", async () => {
    const mutationPorts = ports({
      readConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.slice(1).map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: target.version.modeVersionId,
        contentHash: target.version.contentHash,
        pointerRevision: target.pointerRevision,
        authorityBundleHash: target.version.authorityBundleHash ?? null,
      }))),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_TRACK_B",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_CONSUMER_READBACK_INCOMPLETE"],
    });
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });

  it("rejects activation before the fence when exact release evidence is absent", async () => {
    const mutationPorts = ports();

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_TRACK_B",
      previous,
      target,
      rollbackRecord,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "BLOCKED_PREVIOUS",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["TRACK_B_B3_2_MUTATION_ENVELOPE_INVALID"],
    });
    expect(mutationPorts.acquireFence).not.toHaveBeenCalled();
  });

  it("retains the fence when the exact replacement release is not proven", async () => {
    const mutationPorts = ports({
      replaceAffectedServices: vi.fn(async () => ({
        status: "READY" as const,
        admission: "HELD" as const,
        observedSourceService: rollbackRecord.previousService,
        observedService: { ...rollbackRecord.targetService, releaseRevision: "f".repeat(40) },
      })),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_TRACK_B",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_SERVICE_REPLACEMENT_UNPROVEN"],
    });
    expect(mutationPorts.mutateExactPointer).not.toHaveBeenCalled();
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });

  it("retains the fence when the recorded source service is not the deployed source", async () => {
    const mutationPorts = ports({
      replaceAffectedServices: vi.fn(async ({ targetService }) => ({
        status: "READY" as const,
        admission: "HELD" as const,
        observedSourceService: {
          ...rollbackRecord.previousService,
          runtimeConfigHash: "f".repeat(64),
        },
        observedService: targetService,
      })),
    });

    const result = await executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_TRACK_B",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    });

    expect(result.reasonCodes).toEqual(["TRACK_B_B3_2_SERVICE_REPLACEMENT_UNPROVEN"]);
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });

  it("rejects an unrecorded rollback build before acquiring the fence", async () => {
    const restored = { ...previous, pointerRevision: 8 };
    const substituted = createTrackBReleaseLocalRollbackRecord({
      selectedSourceCommit: rollbackRecord.selectedSourceCommit,
      previousService: { ...rollbackRecord.previousService, buildId: "f".repeat(64) },
      targetService: rollbackRecord.targetService,
      previousAuthority: rollbackRecord.previousAuthority,
      targetAuthority: rollbackRecord.targetAuthority,
    });
    const mutationPorts = ports({
      readPersistedRollbackRecord: vi.fn(async () => rollbackRecord),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000002",
      direction: "ROLLBACK_TRACK_B",
      previous: target,
      target: restored,
      rollbackRecord: substituted,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "BLOCKED_PREVIOUS",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["TRACK_B_B3_2_ROLLBACK_RECORD_NOT_PERSISTED"],
    });
    expect(mutationPorts.acquireFence).not.toHaveBeenCalled();
  });

  it("retains the fence when replacement succeeded but pointer CAS did not", async () => {
    const mutationPorts = ports({ readActivePointer: vi.fn(async () => previous) });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_TRACK_B",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_POINTER_NOT_MUTATED_AFTER_REPLACEMENT"],
    });
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });
});
