import { describe, expect, it, vi } from "vitest";
import { behaviorModeContentHash, type RuntimeBehaviorModePointer } from "@lana/chat-runtime";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import {
  executeTrackBCommerceAuthorityMutation,
  recoverTrackBCommerceAuthorityMutationAfterInterruption,
  createTrackBReleaseLocalRollbackRecord,
  TRACK_B_AUTHORITY_DEPENDENT_CLAIMS_V1,
  validateTrackBCommerceAuthorityMutationEnvelope,
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
  bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
});
const target = pointer({
  versionId: "10000000-0000-4000-8000-000000000002",
  revision: 7,
  bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
});

const releaseEvidence = {
  schemaVersion: 1,
  contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1",
  status: "SOURCE_READY_NO_ACTIVATION",
  sideEffects: "NOT_EXECUTED",
  activationReleaseRevision: targetReleaseRevision,
  releaseSource: { trustedRef: "refs/remotes/origin/main", resolvedRevision: targetReleaseRevision, treeOid: "b".repeat(40) },
  gateE: {}, manifestArtifact: {}, candidateContentFingerprint: "c".repeat(64),
  authorityMutation: {}, reasonCodes: [], evidenceHash: "d".repeat(64),
} as unknown as TrackBReleaseCandidateEvidence;
const lkgReleaseEvidence = {
  ...releaseEvidence,
  activationReleaseRevision: previousReleaseRevision,
  releaseSource: { ...releaseEvidence.releaseSource, resolvedRevision: previousReleaseRevision,
    treeOid: "a".repeat(40) },
  evidenceHash: "e".repeat(64),
} as unknown as TrackBReleaseCandidateEvidence;
const previousService = {
    service: "realtime-worker",
    releaseRevision: previousReleaseRevision,
    buildId: "1".repeat(64), imageId: "2".repeat(64), runtimeConfigHash: "3".repeat(64),
  } as const;
const targetService = {
    service: "realtime-worker",
    releaseRevision: targetReleaseRevision,
    buildId: "4".repeat(64), imageId: "5".repeat(64), runtimeConfigHash: "6".repeat(64),
  } as const;
const rollbackRecord = createTrackBReleaseLocalRollbackRecord({
  candidate: { service: targetService, sourceTree: "b".repeat(40), imageTag: "lana:v2-candidate",
    startupPackageHash: "7".repeat(64), authority: { pointerRevision: target.pointerRevision,
      modeVersionId: target.version.modeVersionId, contentHash: target.version.contentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash }, gateEEvidence: releaseEvidence,
    migrationSchemaHash: "8".repeat(64) },
  lastKnownGood: { service: previousService, sourceTree: "a".repeat(40), imageTag: "lana:v2-lkg",
    startupPackageHash: "9".repeat(64), authority: { pointerRevision: previous.pointerRevision,
      modeVersionId: previous.version.modeVersionId, contentHash: previous.version.contentHash,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash }, gateEEvidence: lkgReleaseEvidence,
    migrationSchemaHash: "8".repeat(64) },
  lastKnownGoodSelection: { source: "CURRENT_ACCEPTED_V2", priorRecordHash: null },
});

function lkgRollbackRecord(targetPointer: RuntimeBehaviorModePointer) {
  return createTrackBReleaseLocalRollbackRecord({
    candidate: { ...rollbackRecord.candidate, authority: {
      pointerRevision: target.pointerRevision, modeVersionId: target.version.modeVersionId,
      contentHash: target.version.contentHash, bundleHash: target.version.authorityBundleHash ?? "",
    } },
    lastKnownGood: { ...rollbackRecord.lastKnownGood, authority: {
      pointerRevision: targetPointer.pointerRevision,
      modeVersionId: targetPointer.version.modeVersionId,
      contentHash: targetPointer.version.contentHash,
      bundleHash: targetPointer.version.authorityBundleHash ?? "",
    } },
    lastKnownGoodSelection: { source: "PRIOR_ACCEPTED_V2_RECORD",
      priorRecordHash: rollbackRecord.recordHash },
  });
}

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
    proveAdmissionHeld: vi.fn(async ({ lease }) => ({
      status: "HELD" as const,
      source: "DATABASE" as const,
      pageId,
      channel,
      fenceId: lease.fenceId,
      epoch: lease.epoch,
      released: false,
      guardedClaims: TRACK_B_AUTHORITY_DEPENDENT_CLAIMS_V1,
    })),
    stopSourceAndProveQuiescence: vi.fn(async ({ sourceService }) => ({
      status: "QUIESCENT" as const,
      observedStoppedService: sourceService,
      activeInbox: 0,
      activeMetaOutbox: 0,
      activePancakeOutbox: 0,
      inFlightAuthorityDependentWork: 0,
      queuedAuthorityDependentWork: 0,
      admission: "HELD" as const,
    })),
    stageAffectedService: vi.fn(async ({ sourceService, targetService }) => ({
      status: "STAGED_STOPPED" as const,
      admission: "NON_ADMITTING" as const,
      observedSourceService: sourceService,
      stagedService: targetService,
    })),
    discardStagedService: vi.fn(async () => ({ status: "DISCARDED" as const })),
    mutateExactPointer: vi.fn(async () => ({ status: "ACKNOWLEDGED" as const })),
    readActivePointer: vi.fn(async () => target),
    startStagedService: vi.fn(async ({ stagedService }) => ({
      status: "HEALTHY" as const,
      admission: "HELD" as const,
      observedService: stagedService,
    })),
    restorePreviousService: vi.fn(async ({ previousService }) => ({
      status: "HEALTHY" as const,
      admission: "HELD" as const,
      observedService: previousService,
    })),
    readRuntimeAuthority: vi.fn(async ({ service, pointer, lease }) => ({
      status: "EXACT" as const,
      service,
      modeVersionId: pointer.version.modeVersionId,
      contentHash: pointer.version.contentHash,
      pointerRevision: pointer.pointerRevision,
      authorityBundleHash: pointer.version.authorityBundleHash ?? null,
      fenceId: lease.fenceId,
      admission: "HELD" as const,
    })),
    readReleasedRuntimeAuthority: vi.fn(async ({ service, pointer, fenceId, epoch }) => ({
      status: "EXACT" as const,
      service,
      modeVersionId: pointer.version.modeVersionId,
      contentHash: pointer.version.contentHash,
      pointerRevision: pointer.pointerRevision,
      authorityBundleHash: pointer.version.authorityBundleHash ?? null,
      fenceId,
      epoch,
      admission: "OPEN" as const,
    })),
    readActivationAudit: vi.fn(async () => "EXACT" as const),
    readConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
      consumer,
      source: "DATABASE" as const,
      modeVersionId: target.version.modeVersionId,
      contentHash: target.version.contentHash,
      pointerRevision: target.pointerRevision,
      authorityBundleHash: target.version.authorityBundleHash ?? null,
    }))),
    readReleasedConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
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
      direction: "ACTIVATE_V2_CANDIDATE",
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
    expect(mutationPorts.proveAdmissionHeld).toHaveBeenCalledOnce();
    expect(mutationPorts.stopSourceAndProveQuiescence).toHaveBeenCalledOnce();
    expect(mutationPorts.stageAffectedService).toHaveBeenCalledOnce();
    expect(mutationPorts.mutateExactPointer).toHaveBeenCalledOnce();
    expect(mutationPorts.startStagedService).toHaveBeenCalledOnce();
    expect(vi.mocked(mutationPorts.stageAffectedService).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(mutationPorts.acquireFence).mock.invocationCallOrder[0] ?? 0);
    expect(vi.mocked(mutationPorts.acquireFence).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(mutationPorts.proveAdmissionHeld).mock.invocationCallOrder[0] ?? 0);
    expect(vi.mocked(mutationPorts.proveAdmissionHeld).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(mutationPorts.stopSourceAndProveQuiescence).mock.invocationCallOrder[0] ?? 0);
    expect(vi.mocked(mutationPorts.stopSourceAndProveQuiescence).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(mutationPorts.mutateExactPointer).mock.invocationCallOrder[0] ?? 0);
    expect(vi.mocked(mutationPorts.mutateExactPointer).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(mutationPorts.startStagedService).mock.invocationCallOrder[0] ?? 0);
    expect(vi.mocked(mutationPorts.startStagedService).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(mutationPorts.readRuntimeAuthority).mock.invocationCallOrder[0] ?? 0);
    expect(mutationPorts.readActivationAudit).toHaveBeenCalledWith({
      pointerRevision: 7,
      previousVersionId: previous.version.modeVersionId,
      previousContentHash: previous.version.contentHash,
      targetVersionId: target.version.modeVersionId,
      targetContentHash: target.version.contentHash,
      actor: "TRACK_B_B3_2_WRITER",
      reason: "TRACK_B_B3_2_ACTIVATE_V2_CANDIDATE:40000000-0000-4000-8000-000000000001",
    });
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
  });

  it("discards the stopped target and releases the fence before stopping source when admission is not proven", async () => {
    const mutationPorts = ports({
      proveAdmissionHeld: vi.fn(async () => ({
        status: "AMBIGUOUS" as const, source: "DATABASE" as const,
        pageId: null, channel: null, fenceId: null, epoch: null, released: null,
        guardedClaims: [],
      })),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000011",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "BLOCKED_PREVIOUS",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_ADMISSION_NOT_HELD"],
    });
    expect(mutationPorts.stopSourceAndProveQuiescence).not.toHaveBeenCalled();
    expect(mutationPorts.mutateExactPointer).not.toHaveBeenCalled();
    expect(mutationPorts.discardStagedService).toHaveBeenCalledOnce();
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
  });

  it("allows durably queued held work while requiring every in-flight class to drain", async () => {
    const mutationPorts = ports({
      stopSourceAndProveQuiescence: vi.fn(async ({ sourceService }) => ({
        status: "QUIESCENT" as const,
        observedStoppedService: sourceService,
        activeInbox: 0,
        activeMetaOutbox: 0,
        activePancakeOutbox: 0,
        inFlightAuthorityDependentWork: 0,
        queuedAuthorityDependentWork: 4,
        admission: "HELD" as const,
      })),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000012",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toMatchObject({ status: "TARGET_ACTIVE" });
  });

  it("supports a separately fenced exact rollback to the recorded LKG V2 identity", async () => {
    const restored = { ...previous, pointerRevision: 8 };
    const reverseRecord = lkgRollbackRecord(restored);
    const mutationPorts = ports({
      readPersistedRollbackRecord: vi.fn(async () => reverseRecord),
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
      direction: "ROLLBACK_TO_LKG_V2",
      previous: target,
      target: restored,
      rollbackRecord: reverseRecord,
      releaseEvidence: lkgReleaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "PREVIOUS_RESTORED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: [],
    });
  });

  it("restores exact prior authority and service when one target consumer is stale", async () => {
    const restored = { ...previous, pointerRevision: 8 };
    const mutationPorts = ports({
      readActivePointer: vi.fn()
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(restored),
      readConsumerAuthorities: vi.fn()
        .mockResolvedValueOnce(DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.slice(1).map((consumer) => ({
          consumer,
          source: "DATABASE" as const,
          modeVersionId: target.version.modeVersionId,
          contentHash: target.version.contentHash,
          pointerRevision: target.pointerRevision,
          authorityBundleHash: target.version.authorityBundleHash ?? null,
        })))
        .mockResolvedValueOnce(DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
          consumer,
          source: "DATABASE" as const,
          modeVersionId: restored.version.modeVersionId,
          contentHash: restored.version.contentHash,
          pointerRevision: restored.pointerRevision,
          authorityBundleHash: restored.version.authorityBundleHash ?? null,
        }))),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "PREVIOUS_RESTORED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_CONSUMER_READBACK_INCOMPLETE"],
    });
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
  });

  it("rejects activation before the fence when exact release evidence is absent", async () => {
    const mutationPorts = ports();

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
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

  it("rejects a release identity whose source tree is not its certified tree", () => {
    const changed = createTrackBReleaseLocalRollbackRecord({
      candidate: { ...rollbackRecord.candidate, sourceTree: "f".repeat(40) },
      lastKnownGood: rollbackRecord.lastKnownGood,
      lastKnownGoodSelection: rollbackRecord.lastKnownGoodSelection,
    });
    expect(validateTrackBCommerceAuthorityMutationEnvelope({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE", previous, target,
      rollbackRecord: changed, releaseEvidence,
    })).toBe(false);
  });

  it("refuses cleanup when the staged service identity is ambiguous", async () => {
    const mutationPorts = ports({
      stageAffectedService: vi.fn(async () => ({
        status: "STAGED_STOPPED" as const,
        admission: "NON_ADMITTING" as const,
        observedSourceService: rollbackRecord.lastKnownGood.service,
        stagedService: { ...rollbackRecord.candidate.service, releaseRevision: "f".repeat(40) },
      })),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: [
        "TRACK_B_B3_2_SERVICE_STAGING_UNPROVEN",
        "TRACK_B_B3_2_STAGED_SERVICE_IDENTITY_AMBIGUOUS",
      ],
    });
    expect(mutationPorts.acquireFence).not.toHaveBeenCalled();
    expect(mutationPorts.mutateExactPointer).not.toHaveBeenCalled();
    expect(mutationPorts.discardStagedService).not.toHaveBeenCalled();
  });

  it("reports a clean pre-fence block when no target service was staged", async () => {
    const mutationPorts = ports({
      stageAffectedService: vi.fn(async () => ({
        status: "BLOCKED" as const,
        admission: "UNCONTROLLED" as const,
        observedSourceService: rollbackRecord.lastKnownGood.service,
        stagedService: null,
      })),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "BLOCKED_PREVIOUS",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["TRACK_B_B3_2_SERVICE_STAGING_UNPROVEN"],
    });
    expect(mutationPorts.acquireFence).not.toHaveBeenCalled();
    expect(mutationPorts.discardStagedService).not.toHaveBeenCalled();
  });

  it("routes a partially staged target through exact cleanup instead of reporting NOT_EXECUTED", async () => {
    const mutationPorts = ports({
      stageAffectedService: vi.fn(async ({ sourceService, targetService }) => ({
        status: "BLOCKED" as const, admission: "UNCONTROLLED" as const,
        observedSourceService: sourceService, stagedService: targetService,
      })),
    });
    await expect(executeTrackBCommerceAuthorityMutation({ operationId:
      "40000000-0000-4000-8000-000000000001", direction: "ACTIVATE_V2_CANDIDATE", previous,
    target, rollbackRecord, releaseEvidence, ports: mutationPorts })).resolves.toEqual({
      status: "BLOCKED_PREVIOUS", sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_SERVICE_STAGING_UNPROVEN"],
    });
    expect(mutationPorts.discardStagedService).toHaveBeenCalledWith({
      stagedService: rollbackRecord.candidate.service,
    });
    expect(mutationPorts.acquireFence).not.toHaveBeenCalled();
  });

  it("rejects a staged operation when the deployed source identity is not exact", async () => {
    const mutationPorts = ports({
      stageAffectedService: vi.fn(async ({ targetService }) => ({
        status: "STAGED_STOPPED" as const,
        admission: "NON_ADMITTING" as const,
        observedSourceService: {
          ...rollbackRecord.lastKnownGood.service,
          runtimeConfigHash: "f".repeat(64),
        },
        stagedService: targetService,
      })),
    });

    const result = await executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    });

    expect(result.reasonCodes).toEqual(["TRACK_B_B3_2_SERVICE_STAGING_UNPROVEN"]);
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });

  it("rejects an unrecorded rollback build before acquiring the fence", async () => {
    const restored = { ...previous, pointerRevision: 8 };
    const recorded = lkgRollbackRecord(restored);
    const substituted = createTrackBReleaseLocalRollbackRecord({
      candidate: recorded.candidate,
      lastKnownGood: { ...recorded.lastKnownGood,
        service: { ...recorded.lastKnownGood.service, buildId: "f".repeat(64) } },
      lastKnownGoodSelection: recorded.lastKnownGoodSelection,
    });
    const mutationPorts = ports({
      readPersistedRollbackRecord: vi.fn(async () => recorded),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000002",
      direction: "ROLLBACK_TO_LKG_V2",
      previous: target,
      target: restored,
      rollbackRecord: substituted,
      releaseEvidence: lkgReleaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "BLOCKED_PREVIOUS",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["TRACK_B_B3_2_ROLLBACK_RECORD_NOT_PERSISTED"],
    });
    expect(mutationPorts.acquireFence).not.toHaveBeenCalled();
  });

  it("discards the staged target and releases the fence when pointer CAS did not happen", async () => {
    const mutationPorts = ports({
      readActivePointer: vi.fn(async () => previous),
      readConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: previous.version.modeVersionId,
        contentHash: previous.version.contentHash,
        pointerRevision: previous.pointerRevision,
        authorityBundleHash: previous.version.authorityBundleHash ?? null,
      }))),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "BLOCKED_PREVIOUS",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_POINTER_NOT_MUTATED"],
    });
    expect(mutationPorts.discardStagedService).toHaveBeenCalledOnce();
    expect(mutationPorts.restorePreviousService).toHaveBeenCalledOnce();
    expect(vi.mocked(mutationPorts.restorePreviousService).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(mutationPorts.releaseFence).mock.invocationCallOrder[0] ?? 0);
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
    expect(mutationPorts.startStagedService).not.toHaveBeenCalled();
  });

  it("rolls authority back before restoring the prior service when target start fails", async () => {
    const restored = { ...previous, pointerRevision: 8 };
    const readActivePointer = vi.fn()
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(restored);
    const mutationPorts = ports({
      readActivePointer,
      startStagedService: vi.fn(async () => ({
        status: "BLOCKED" as const,
        admission: "HELD" as const,
        observedService: null,
      })),
      readConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: restored.version.modeVersionId,
        contentHash: restored.version.contentHash,
        pointerRevision: restored.pointerRevision,
        authorityBundleHash: restored.version.authorityBundleHash ?? null,
      }))),
      readRuntimeAuthority: vi.fn(async ({ service, pointer, lease }) => ({
        status: "EXACT" as const,
        service,
        modeVersionId: pointer.version.modeVersionId,
        contentHash: pointer.version.contentHash,
        pointerRevision: pointer.pointerRevision,
        authorityBundleHash: pointer.version.authorityBundleHash ?? null,
        fenceId: lease.fenceId,
        admission: "HELD" as const,
      })),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "PREVIOUS_RESTORED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_TARGET_START_FAILED"],
    });
    expect(mutationPorts.mutateExactPointer).toHaveBeenCalledTimes(2);
    expect(vi.mocked(mutationPorts.mutateExactPointer).mock.invocationCallOrder[1])
      .toBeLessThan(vi.mocked(mutationPorts.restorePreviousService).mock.invocationCallOrder[0] ?? 0);
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
  });

  it("retains the fence when post-CAS rollback pointer identity is ambiguous", async () => {
    const readActivePointer = vi.fn()
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(null);
    const mutationPorts = ports({
      readActivePointer,
      startStagedService: vi.fn(async () => ({
        status: "BLOCKED" as const,
        admission: "HELD" as const,
        observedService: null,
      })),
    });

    const result = await executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    });

    expect(result.status).toBe("HOLD_RETAINED");
    expect(result.reasonCodes).toContain("TRACK_B_B3_2_ROLLBACK_POINTER_AMBIGUOUS");
    expect(mutationPorts.restorePreviousService).not.toHaveBeenCalled();
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });

  it("discards the stopped staged target when fence acquisition is unavailable", async () => {
    const mutationPorts = ports({ acquireFence: vi.fn(async () => { throw new Error("unavailable"); }) });

    const result = await executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    });

    expect(result.reasonCodes).toEqual(["TRACK_B_B3_2_FENCE_ACQUISITION_UNAVAILABLE"]);
    expect(mutationPorts.discardStagedService).toHaveBeenCalledOnce();
    expect(mutationPorts.stopSourceAndProveQuiescence).not.toHaveBeenCalled();
    expect(mutationPorts.mutateExactPointer).not.toHaveBeenCalled();
  });

  it("retains the fence on an ambiguous stopped-source or quiescence proof", async () => {
    const mutationPorts = ports({
      stopSourceAndProveQuiescence: vi.fn(async () => ({
        status: "BUSY" as const,
        observedStoppedService: null,
        activeInbox: 0,
        activeMetaOutbox: 0,
        activePancakeOutbox: 0,
        inFlightAuthorityDependentWork: 0,
        queuedAuthorityDependentWork: 1,
        admission: "UNCONTROLLED" as const,
      })),
    });

    const result = await executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    });

    expect(result).toEqual({
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_QUIESCENCE_UNPROVEN"],
    });
    expect(mutationPorts.mutateExactPointer).not.toHaveBeenCalled();
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });

  it("rolls back when target runtime authority readback is not exact", async () => {
    const restored = { ...previous, pointerRevision: 8 };
    const mutationPorts = ports({
      readActivePointer: vi.fn().mockResolvedValueOnce(target).mockResolvedValueOnce(restored),
      readRuntimeAuthority: vi.fn()
        .mockResolvedValueOnce({
          status: "AMBIGUOUS" as const,
          service: rollbackRecord.candidate.service,
          modeVersionId: null,
          contentHash: null,
          pointerRevision: null,
          authorityBundleHash: null,
          fenceId: null,
          admission: "HELD" as const,
        })
        .mockImplementationOnce(async ({ service, pointer, lease }) => ({
          status: "EXACT" as const,
          service,
          modeVersionId: pointer.version.modeVersionId,
          contentHash: pointer.version.contentHash,
          pointerRevision: pointer.pointerRevision,
          authorityBundleHash: pointer.version.authorityBundleHash ?? null,
          fenceId: lease.fenceId,
          admission: "HELD" as const,
        })),
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
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toMatchObject({
      status: "PREVIOUS_RESTORED",
      reasonCodes: ["TRACK_B_B3_2_RUNTIME_READBACK_UNPROVEN"],
    });
    expect(mutationPorts.restorePreviousService).toHaveBeenCalledOnce();
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
  });

  it("retains the exact target and fence when fence release is ambiguous", async () => {
    const mutationPorts = ports({
      releaseFence: vi.fn(async () => ({ status: "STALE_OR_MISSING" as const })),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_FENCE_RELEASE_UNPROVEN"],
    });
    expect(mutationPorts.mutateExactPointer).toHaveBeenCalledOnce();
  });

  it("refuses pre-CAS release when the prior service cannot be restored exactly", async () => {
    const mutationPorts = ports({
      readActivePointer: vi.fn(async () => previous),
      restorePreviousService: vi.fn(async () => ({
        status: "BLOCKED" as const,
        admission: "HELD" as const,
        observedService: null,
      })),
    });

    const result = await executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    });

    expect(result.status).toBe("HOLD_RETAINED");
    expect(result.reasonCodes).toContain("TRACK_B_B3_2_PRE_CAS_SERVICE_RESTORE_AMBIGUOUS");
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });

  it("recovers an interrupted pre-CAS stopped service before releasing the fence", async () => {
    const mutationPorts = ports({
      readActivePointer: vi.fn(async () => previous),
      readConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: previous.version.modeVersionId,
        contentHash: previous.version.contentHash,
        pointerRevision: previous.pointerRevision,
        authorityBundleHash: previous.version.authorityBundleHash ?? null,
      }))),
    });

    await expect(recoverTrackBCommerceAuthorityMutationAfterInterruption({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "BLOCKED_PREVIOUS",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_INTERRUPTED_BEFORE_CAS"],
    });
    expect(mutationPorts.stageAffectedService).not.toHaveBeenCalled();
    expect(mutationPorts.restorePreviousService).toHaveBeenCalledOnce();
    expect(mutationPorts.discardStagedService).toHaveBeenCalledOnce();
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
  });

  it("retains an interrupted operation without touching service or pointer when database admission is ambiguous", async () => {
    const mutationPorts = ports({
      proveAdmissionHeld: vi.fn(async () => ({
        status: "AMBIGUOUS" as const, source: "DATABASE" as const,
        pageId: null, channel: null, fenceId: null, epoch: null, released: null,
        guardedClaims: [],
      })),
    });

    await expect(recoverTrackBCommerceAuthorityMutationAfterInterruption({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_RECOVERY_ADMISSION_NOT_HELD"],
    });
    expect(mutationPorts.readActivePointer).not.toHaveBeenCalled();
    expect(mutationPorts.restorePreviousService).not.toHaveBeenCalled();
    expect(mutationPorts.mutateExactPointer).not.toHaveBeenCalled();
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });

  it("reconciles a committed forward fence release whose acknowledgement was lost", async () => {
    const mutationPorts = ports({
      acquireFence: vi.fn(async () => ({
        status: "ALREADY_RELEASED" as const,
        fenceId: "20000000-0000-4000-8000-000000000001",
        epoch: 1,
      })),
    });

    await expect(recoverTrackBCommerceAuthorityMutationAfterInterruption({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "TARGET_ACTIVE",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_RELEASE_ACK_RECONCILED"],
    });
    expect(mutationPorts.proveAdmissionHeld).not.toHaveBeenCalled();
    expect(mutationPorts.readReleasedRuntimeAuthority).toHaveBeenCalledOnce();
    expect(mutationPorts.readReleasedConsumerAuthorities).toHaveBeenCalledOnce();
    expect(mutationPorts.releaseFence).not.toHaveBeenCalled();
  });

  it("reconciles a committed pre-CAS release to the exact previous runtime", async () => {
    const mutationPorts = ports({
      acquireFence: vi.fn(async () => ({
        status: "ALREADY_RELEASED" as const,
        fenceId: "20000000-0000-4000-8000-000000000001",
        epoch: 1,
      })),
      readActivePointer: vi.fn(async () => previous),
      readReleasedConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: previous.version.modeVersionId,
        contentHash: previous.version.contentHash,
        pointerRevision: previous.pointerRevision,
        authorityBundleHash: previous.version.authorityBundleHash ?? null,
      }))),
    });

    await expect(recoverTrackBCommerceAuthorityMutationAfterInterruption({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toMatchObject({
      status: "BLOCKED_PREVIOUS",
      reasonCodes: ["TRACK_B_B3_2_RELEASE_ACK_RECONCILED"],
    });
    expect(mutationPorts.readActivationAudit).not.toHaveBeenCalled();
  });

  it("reconciles a committed explicit rollback release to exact LKG V2", async () => {
    const rollbackPointer = { ...previous, pointerRevision: 8 };
    const reverseRecord = lkgRollbackRecord(rollbackPointer);
    const mutationPorts = ports({
      acquireFence: vi.fn(async () => ({
        status: "ALREADY_RELEASED" as const,
        fenceId: "20000000-0000-4000-8000-000000000001",
        epoch: 2,
      })),
      readActivePointer: vi.fn(async () => rollbackPointer),
      readPersistedRollbackRecord: vi.fn(async () => reverseRecord),
      readReleasedConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: rollbackPointer.version.modeVersionId,
        contentHash: rollbackPointer.version.contentHash,
        pointerRevision: rollbackPointer.pointerRevision,
        authorityBundleHash: rollbackPointer.version.authorityBundleHash ?? null,
      }))),
    });

    await expect(recoverTrackBCommerceAuthorityMutationAfterInterruption({
      operationId: "40000000-0000-4000-8000-000000000002",
      direction: "ROLLBACK_TO_LKG_V2",
      previous: target,
      target: rollbackPointer,
      rollbackRecord: reverseRecord,
      releaseEvidence: lkgReleaseEvidence,
      ports: mutationPorts,
    })).resolves.toMatchObject({
      status: "PREVIOUS_RESTORED",
      reasonCodes: ["TRACK_B_B3_2_RELEASE_ACK_RECONCILED"],
    });
  });

  it("reports released ambiguity without falsely claiming that admission is held", async () => {
    const mutationPorts = ports({
      acquireFence: vi.fn(async () => ({
        status: "ALREADY_RELEASED" as const,
        fenceId: "20000000-0000-4000-8000-000000000001",
        epoch: 1,
      })),
      readActivePointer: vi.fn(async () => null),
    });

    await expect(recoverTrackBCommerceAuthorityMutationAfterInterruption({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "RELEASED_AMBIGUOUS",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_RELEASED_POINTER_AMBIGUOUS"],
    });
  });

  it("reverses an interrupted exact post-CAS pointer before restoring service", async () => {
    const restored = { ...previous, pointerRevision: 8 };
    const mutationPorts = ports({
      readActivePointer: vi.fn().mockResolvedValueOnce(target).mockResolvedValueOnce(restored),
      readConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: restored.version.modeVersionId,
        contentHash: restored.version.contentHash,
        pointerRevision: restored.pointerRevision,
        authorityBundleHash: restored.version.authorityBundleHash ?? null,
      }))),
    });

    await expect(recoverTrackBCommerceAuthorityMutationAfterInterruption({
      operationId: "40000000-0000-4000-8000-000000000001",
      direction: "ACTIVATE_V2_CANDIDATE",
      previous,
      target,
      rollbackRecord,
      releaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "PREVIOUS_RESTORED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_INTERRUPTED_AFTER_CAS"],
    });
    expect(mutationPorts.stageAffectedService).not.toHaveBeenCalled();
    expect(mutationPorts.mutateExactPointer).toHaveBeenCalledOnce();
    expect(mutationPorts.restorePreviousService).toHaveBeenCalledOnce();
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
  });

  it("symmetrically restores the V2 target if an explicit rollback service start fails", async () => {
    const rollbackPointer = { ...previous, pointerRevision: 8 };
    const reverseRecord = lkgRollbackRecord(rollbackPointer);
    const reactivated = { ...target, pointerRevision: 9 };
    const mutationPorts = ports({
      readActivePointer: vi.fn().mockResolvedValueOnce(rollbackPointer).mockResolvedValueOnce(reactivated),
      readPersistedRollbackRecord: vi.fn(async () => reverseRecord),
      startStagedService: vi.fn(async () => ({
        status: "BLOCKED" as const,
        admission: "HELD" as const,
        observedService: null,
      })),
      readConsumerAuthorities: vi.fn(async () => DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: reactivated.version.modeVersionId,
        contentHash: reactivated.version.contentHash,
        pointerRevision: reactivated.pointerRevision,
        authorityBundleHash: reactivated.version.authorityBundleHash ?? null,
      }))),
    });

    await expect(executeTrackBCommerceAuthorityMutation({
      operationId: "40000000-0000-4000-8000-000000000002",
      direction: "ROLLBACK_TO_LKG_V2",
      previous: target,
      target: rollbackPointer,
      rollbackRecord: reverseRecord,
      releaseEvidence: lkgReleaseEvidence,
      ports: mutationPorts,
    })).resolves.toEqual({
      status: "TARGET_ACTIVE",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_TARGET_START_FAILED"],
    });
    expect(mutationPorts.mutateExactPointer).toHaveBeenCalledTimes(2);
    expect(vi.mocked(mutationPorts.mutateExactPointer).mock.calls[1]?.[0]).toMatchObject({
      direction: "ACTIVATE_V2_CANDIDATE",
      previous: rollbackPointer,
      target: reactivated,
    });
    expect(mutationPorts.releaseFence).toHaveBeenCalledOnce();
  });
});
