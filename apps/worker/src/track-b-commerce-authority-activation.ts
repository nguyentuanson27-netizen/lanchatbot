import { canonicalJsonV1 } from "@lana/contracts";
import { createHash } from "node:crypto";
import { behaviorModeContentHash, type RuntimeBehaviorModePointer } from "@lana/chat-runtime";
import type {
  Df13CommerceCutoverFenceLease,
  Df13CommerceCutoverFenceRequest,
} from "@lana/database";
import { TRACK_B_COMMERCE_ADMISSION_CLAIMS_V1 } from "@lana/database";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  type CommerceAuthorityConsumer,
} from "./df13-commerce-authority-bundle.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";
import {
  validateTrackBReleaseCandidateEvidence,
  type TrackBReleaseCandidateEvidence,
} from "./track-b-release-candidate-evidence.js";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export type TrackBServiceReleaseIdentity = Readonly<{
  service: "realtime-worker";
  releaseRevision: string;
  buildId: string;
  imageId: string;
  runtimeConfigHash: string;
}>;

export type TrackBV2RollbackReleaseIdentity = Readonly<{
  service: TrackBServiceReleaseIdentity;
  sourceTree: string;
  imageTag: string;
  startupPackageHash: string;
  authority: Readonly<{
    pointerRevision: number;
    modeVersionId: string;
    contentHash: string;
    bundleHash: string;
  }>;
  gateEEvidence: TrackBReleaseCandidateEvidence;
  migrationSchemaHash: string;
}>;

export type TrackBReleaseLocalRollbackRecord = Readonly<{
  schemaVersion: 2;
  contractVersion: "TRACK_B_RELEASE_LOCAL_ROLLBACK_RECORD_V2_LKG";
  candidate: TrackBV2RollbackReleaseIdentity;
  lastKnownGood: TrackBV2RollbackReleaseIdentity;
  lastKnownGoodSelection: Readonly<{
    source: "CURRENT_ACCEPTED_V2" | "PRIOR_ACCEPTED_V2_RECORD";
    priorRecordHash: string | null;
  }>;
  recordHash: string;
}>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function exactKeys(value: object, keys: readonly string[]): boolean {
  return canonicalJsonV1(Object.keys(value).sort()) === canonicalJsonV1([...keys].sort());
}

export function createTrackBReleaseLocalRollbackRecord(input: Omit<TrackBReleaseLocalRollbackRecord, "schemaVersion" | "contractVersion" | "recordHash">): TrackBReleaseLocalRollbackRecord {
  const body = {
    schemaVersion: 2 as const,
    contractVersion: "TRACK_B_RELEASE_LOCAL_ROLLBACK_RECORD_V2_LKG" as const,
    ...input,
  };
  return Object.freeze({ ...body, recordHash: sha256(canonicalJsonV1(body)) });
}

export type TrackBCommerceConsumerReadback = Readonly<{
  consumer: CommerceAuthorityConsumer;
  source: "DATABASE" | "CACHE" | "LAST_KNOWN_GOOD" | "STARTUP_DEFAULT" | "FAIL_SAFE";
  modeVersionId: string | null;
  contentHash: string | null;
  pointerRevision: number | null;
  authorityBundleHash: string | null;
}>;

export const TRACK_B_AUTHORITY_DEPENDENT_CLAIMS_V1 = TRACK_B_COMMERCE_ADMISSION_CLAIMS_V1;

export type TrackBCommerceAdmissionReadback = Readonly<{
  status: "HELD" | "AMBIGUOUS";
  source: "DATABASE";
  pageId: string | null;
  channel: string | null;
  fenceId: string | null;
  epoch: number | null;
  released: boolean | null;
  guardedClaims: readonly string[];
}>;

export interface TrackBCommerceAuthorityMutationPorts {
  readPersistedRollbackRecord(recordHash: string): Promise<TrackBReleaseLocalRollbackRecord | null>;
  acquireFence(request: Df13CommerceCutoverFenceRequest): Promise<Readonly<
    | { status: "HELD"; lease: Df13CommerceCutoverFenceLease }
    | { status: "ALREADY_RELEASED"; fenceId: string; epoch: number }
    | { status: "HELD_RECONCILE_REQUIRED" | "PARKED"; reasonCode?: string }
  >>;
  proveAdmissionHeld(input: Readonly<{
    lease: Df13CommerceCutoverFenceLease;
  }>): Promise<TrackBCommerceAdmissionReadback>;
  stopSourceAndProveQuiescence(input: Readonly<{
    lease: Df13CommerceCutoverFenceLease;
    sourceService: TrackBServiceReleaseIdentity;
  }>): Promise<Readonly<{
    status: "QUIESCENT" | "BUSY";
    observedStoppedService: TrackBServiceReleaseIdentity | null;
    activeInbox: number;
    activeMetaOutbox: number;
    activePancakeOutbox: number;
    inFlightAuthorityDependentWork: number;
    queuedAuthorityDependentWork: number;
    admission: "HELD" | "UNCONTROLLED";
  }>>;
  stageAffectedService(input: Readonly<{
    direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
    sourceService: TrackBServiceReleaseIdentity;
    targetService: TrackBServiceReleaseIdentity;
  }>): Promise<Readonly<{
    status: "STAGED_STOPPED" | "BLOCKED";
    admission: "NON_ADMITTING" | "UNCONTROLLED";
    observedSourceService: TrackBServiceReleaseIdentity | null;
    stagedService: TrackBServiceReleaseIdentity | null;
  }>>;
  discardStagedService(input: Readonly<{
    stagedService: TrackBServiceReleaseIdentity;
  }>): Promise<Readonly<{ status: "DISCARDED" | "AMBIGUOUS" }>>;
  mutateExactPointer(input: Readonly<{
    direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
    previous: RuntimeBehaviorModePointer;
    target: RuntimeBehaviorModePointer;
    lease: Df13CommerceCutoverFenceLease;
  }>): Promise<Readonly<{ status: "ACKNOWLEDGED" | "ACK_LOST" | "CAS_MISMATCH" }>>;
  readActivePointer(): Promise<RuntimeBehaviorModePointer | null>;
  startStagedService(input: Readonly<{
    direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
    lease: Df13CommerceCutoverFenceLease;
    stagedService: TrackBServiceReleaseIdentity;
    pointer: RuntimeBehaviorModePointer;
  }>): Promise<Readonly<{
    status: "HEALTHY" | "BLOCKED";
    admission: "HELD" | "UNCONTROLLED";
    observedService: TrackBServiceReleaseIdentity | null;
  }>>;
  restorePreviousService(input: Readonly<{
    lease: Df13CommerceCutoverFenceLease;
    failedService: TrackBServiceReleaseIdentity;
    previousService: TrackBServiceReleaseIdentity;
    pointer: RuntimeBehaviorModePointer;
  }>): Promise<Readonly<{
    status: "HEALTHY" | "BLOCKED";
    admission: "HELD" | "UNCONTROLLED";
    observedService: TrackBServiceReleaseIdentity | null;
  }>>;
  readRuntimeAuthority(input: Readonly<{
    lease: Df13CommerceCutoverFenceLease;
    service: TrackBServiceReleaseIdentity;
    pointer: RuntimeBehaviorModePointer;
  }>): Promise<Readonly<{
    status: "EXACT" | "AMBIGUOUS";
    service: TrackBServiceReleaseIdentity | null;
    modeVersionId: string | null;
    contentHash: string | null;
    pointerRevision: number | null;
    authorityBundleHash: string | null;
    fenceId: string | null;
    admission: "HELD" | "UNCONTROLLED";
  }>>;
  readReleasedRuntimeAuthority(input: Readonly<{
    fenceId: string;
    epoch: number;
    service: TrackBServiceReleaseIdentity;
    pointer: RuntimeBehaviorModePointer;
  }>): Promise<Readonly<{
    status: "EXACT" | "AMBIGUOUS";
    service: TrackBServiceReleaseIdentity | null;
    modeVersionId: string | null;
    contentHash: string | null;
    pointerRevision: number | null;
    authorityBundleHash: string | null;
    fenceId: string | null;
    epoch: number | null;
    admission: "OPEN" | "AMBIGUOUS";
  }>>;
  readActivationAudit(input: Readonly<{
    pointerRevision: number;
    previousVersionId: string;
    previousContentHash: string;
    targetVersionId: string;
    targetContentHash: string;
    actor: "TRACK_B_B3_2_WRITER";
    reason: string;
  }>): Promise<"EXACT" | "MISSING" | "AMBIGUOUS">;
  readConsumerAuthorities(input: Readonly<{
    lease: Df13CommerceCutoverFenceLease;
    consumers: readonly CommerceAuthorityConsumer[];
  }>): Promise<readonly TrackBCommerceConsumerReadback[]>;
  readReleasedConsumerAuthorities(input: Readonly<{
    fenceId: string;
    epoch: number;
    consumers: readonly CommerceAuthorityConsumer[];
  }>): Promise<readonly TrackBCommerceConsumerReadback[]>;
  releaseFence(lease: Df13CommerceCutoverFenceLease): Promise<Readonly<{
    status: "RELEASED" | "STALE_OR_MISSING";
  }>>;
}

export type TrackBCommerceAuthorityMutationResult = Readonly<{
  status: "BLOCKED_PREVIOUS" | "TARGET_ACTIVE" | "PREVIOUS_RESTORED" | "HOLD_RETAINED" | "RELEASED_AMBIGUOUS";
  sideEffects: "NOT_EXECUTED" | "CONTROL_PLANE_ONLY";
  reasonCodes: readonly string[];
}>;

function pointerMatches(left: RuntimeBehaviorModePointer | null, right: RuntimeBehaviorModePointer): boolean {
  return left !== null &&
    left.pointerRevision === right.pointerRevision &&
    left.version.modeVersionId === right.version.modeVersionId &&
    left.version.pageId === right.version.pageId &&
    left.version.channel === right.version.channel &&
    left.version.confirmationMode === right.version.confirmationMode &&
    left.version.salesAuthorityMode === right.version.salesAuthorityMode &&
    left.version.stateReadMode === right.version.stateReadMode &&
    (left.version.authorityBundleHash ?? null) === (right.version.authorityBundleHash ?? null) &&
    left.version.contentHash === right.version.contentHash &&
    left.version.contentHash === behaviorModeContentHash(left.version);
}

function exactEnvelope(input: Readonly<{
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  rollbackRecord: TrackBReleaseLocalRollbackRecord;
  releaseEvidence?: TrackBReleaseCandidateEvidence;
}>): boolean {
  const previousBundle = DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash;
  const targetBundle = DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash;
  const sourceIdentity = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? input.rollbackRecord.lastKnownGood : input.rollbackRecord.candidate;
  const targetIdentity = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? input.rollbackRecord.candidate : input.rollbackRecord.lastKnownGood;
  const expectedService = targetIdentity.service;
  const { recordHash, ...recordBody } = input.rollbackRecord;
  const identityIsExact = (identity: TrackBV2RollbackReleaseIdentity) =>
    exactKeys(identity, ["service", "sourceTree", "imageTag", "startupPackageHash", "authority", "gateEEvidence", "migrationSchemaHash"]) &&
    exactKeys(identity.service, ["service", "releaseRevision", "buildId", "imageId", "runtimeConfigHash"]) &&
    exactKeys(identity.authority, ["pointerRevision", "modeVersionId", "contentHash", "bundleHash"]) &&
    identity.service.service === "realtime-worker" && COMMIT_PATTERN.test(identity.service.releaseRevision) &&
    COMMIT_PATTERN.test(identity.sourceTree) &&
    identity.sourceTree === identity.gateEEvidence.releaseSource.treeOid &&
    SHA256_PATTERN.test(identity.service.buildId) &&
    SHA256_PATTERN.test(identity.service.imageId) && SHA256_PATTERN.test(identity.service.runtimeConfigHash) &&
    SHA256_PATTERN.test(identity.startupPackageHash) && SHA256_PATTERN.test(identity.migrationSchemaHash) &&
    /^[a-z0-9][a-z0-9._/-]{0,127}:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(identity.imageTag) &&
    Number.isSafeInteger(identity.authority.pointerRevision) && identity.authority.pointerRevision >= 0 &&
    identity.authority.bundleHash === DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash &&
    validateTrackBReleaseCandidateEvidence(identity.gateEEvidence, {
      activationReleaseRevision: identity.service.releaseRevision,
    }).status === "MATCHED";
  const recordIsExact = input.rollbackRecord.schemaVersion === 2 &&
    input.rollbackRecord.contractVersion === "TRACK_B_RELEASE_LOCAL_ROLLBACK_RECORD_V2_LKG" &&
    exactKeys(input.rollbackRecord, ["schemaVersion", "contractVersion", "candidate", "lastKnownGood", "lastKnownGoodSelection", "recordHash"]) &&
    exactKeys(input.rollbackRecord.lastKnownGoodSelection, ["source", "priorRecordHash"]) &&
    ((input.direction === "ACTIVATE_V2_CANDIDATE" &&
      input.rollbackRecord.lastKnownGoodSelection.source === "CURRENT_ACCEPTED_V2" &&
      input.rollbackRecord.lastKnownGoodSelection.priorRecordHash === null) ||
     (input.direction === "ROLLBACK_TO_LKG_V2" &&
      input.rollbackRecord.lastKnownGoodSelection.source === "PRIOR_ACCEPTED_V2_RECORD" &&
      typeof input.rollbackRecord.lastKnownGoodSelection.priorRecordHash === "string" &&
      SHA256_PATTERN.test(input.rollbackRecord.lastKnownGoodSelection.priorRecordHash))) &&
    SHA256_PATTERN.test(recordHash) && recordHash === sha256(canonicalJsonV1(recordBody)) &&
    identityIsExact(input.rollbackRecord.candidate) && identityIsExact(input.rollbackRecord.lastKnownGood) &&
    input.rollbackRecord.candidate.migrationSchemaHash === input.rollbackRecord.lastKnownGood.migrationSchemaHash &&
    sourceIdentity.authority.pointerRevision === input.previous.pointerRevision &&
    sourceIdentity.authority.modeVersionId === input.previous.version.modeVersionId &&
    sourceIdentity.authority.contentHash === input.previous.version.contentHash &&
    sourceIdentity.authority.bundleHash === previousBundle &&
    targetIdentity.authority.pointerRevision === input.target.pointerRevision &&
    targetIdentity.authority.modeVersionId === input.target.version.modeVersionId &&
    targetIdentity.authority.contentHash === input.target.version.contentHash &&
    targetIdentity.authority.bundleHash === targetBundle;
  const releaseIsExact = recordIsExact && input.releaseEvidence !== undefined &&
    canonicalJsonV1(input.releaseEvidence) === canonicalJsonV1(targetIdentity.gateEEvidence) &&
    validateTrackBReleaseCandidateEvidence(input.releaseEvidence, {
      activationReleaseRevision: expectedService.releaseRevision,
    }).status === "MATCHED";
  return releaseIsExact &&
    UUID_V4_PATTERN.test(input.operationId) &&
    input.previous.version.pageId === DF13_COMMERCE_PREPROD_SCOPE_V1.pageId &&
    input.target.version.pageId === DF13_COMMERCE_PREPROD_SCOPE_V1.pageId &&
    input.previous.version.channel === DF13_COMMERCE_PREPROD_SCOPE_V1.channel &&
    input.target.version.channel === DF13_COMMERCE_PREPROD_SCOPE_V1.channel &&
    input.previous.version.salesAuthorityMode === "COMMERCE" &&
    input.target.version.salesAuthorityMode === "COMMERCE" &&
    input.previous.version.stateReadMode === "LEGACY" &&
    input.target.version.stateReadMode === "LEGACY" &&
    input.previous.version.confirmationMode === input.target.version.confirmationMode &&
    input.previous.version.authorityBundleHash === previousBundle &&
    input.target.version.authorityBundleHash === targetBundle &&
    input.previous.version.contentHash === behaviorModeContentHash(input.previous.version) &&
    input.target.version.contentHash === behaviorModeContentHash(input.target.version) &&
    input.target.pointerRevision === input.previous.pointerRevision + 1;
}

export function validateTrackBCommerceAuthorityMutationEnvelope(input: Readonly<{
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  rollbackRecord: TrackBReleaseLocalRollbackRecord;
  releaseEvidence?: TrackBReleaseCandidateEvidence;
}>): boolean {
  try { return exactEnvelope(input); } catch { return false; }
}

function exactConsumerReadbacks(
  values: readonly TrackBCommerceConsumerReadback[],
  target: RuntimeBehaviorModePointer,
): boolean {
  if (values.length !== DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.length) return false;
  const byConsumer = new Map(values.map((value) => [value.consumer, value]));
  if (byConsumer.size !== values.length) return false;
  return DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.every((consumer) => {
    const value = byConsumer.get(consumer);
    return value?.source === "DATABASE" &&
      value.modeVersionId === target.version.modeVersionId &&
      value.contentHash === target.version.contentHash &&
      value.pointerRevision === target.pointerRevision &&
      value.authorityBundleHash === target.version.authorityBundleHash;
  });
}

function exactAdmissionReadback(
  value: TrackBCommerceAdmissionReadback,
  lease: Df13CommerceCutoverFenceLease,
): boolean {
  return value.status === "HELD" && value.source === "DATABASE" &&
    value.pageId === DF13_COMMERCE_PREPROD_SCOPE_V1.pageId &&
    value.channel === DF13_COMMERCE_PREPROD_SCOPE_V1.channel &&
    value.fenceId === lease.fenceId && value.epoch === lease.epoch &&
    value.released === false &&
    canonicalJsonV1([...value.guardedClaims].sort()) ===
      canonicalJsonV1([...TRACK_B_AUTHORITY_DEPENDENT_CLAIMS_V1].sort());
}

function exactService(
  observed: TrackBServiceReleaseIdentity | null,
  expected: TrackBServiceReleaseIdentity,
): boolean {
  return observed !== null && canonicalJsonV1(observed) === canonicalJsonV1(expected);
}

function exactQuiescence(
  value: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["stopSourceAndProveQuiescence"]>>,
  expectedStoppedService: TrackBServiceReleaseIdentity,
): boolean {
  return value.status === "QUIESCENT" && value.admission === "HELD" &&
    exactService(value.observedStoppedService, expectedStoppedService) &&
    value.activeInbox === 0 && value.activeMetaOutbox === 0 &&
    value.activePancakeOutbox === 0 && value.inFlightAuthorityDependentWork === 0 &&
    Number.isSafeInteger(value.queuedAuthorityDependentWork) &&
    value.queuedAuthorityDependentWork >= 0;
}

function exactRuntimeReadback(
  value: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["readRuntimeAuthority"]>>,
  service: TrackBServiceReleaseIdentity,
  pointer: RuntimeBehaviorModePointer,
  lease: Df13CommerceCutoverFenceLease,
): boolean {
  return value.status === "EXACT" && value.admission === "HELD" &&
    exactService(value.service, service) && value.fenceId === lease.fenceId &&
    value.modeVersionId === pointer.version.modeVersionId &&
    value.contentHash === pointer.version.contentHash &&
    value.pointerRevision === pointer.pointerRevision &&
    value.authorityBundleHash === pointer.version.authorityBundleHash;
}

function exactReleasedRuntimeReadback(
  value: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["readReleasedRuntimeAuthority"]>>,
  service: TrackBServiceReleaseIdentity,
  pointer: RuntimeBehaviorModePointer,
  fence: Readonly<{ fenceId: string; epoch: number }>,
): boolean {
  return value.status === "EXACT" && value.admission === "OPEN" &&
    exactService(value.service, service) && value.fenceId === fence.fenceId &&
    value.epoch === fence.epoch && value.modeVersionId === pointer.version.modeVersionId &&
    value.contentHash === pointer.version.contentHash &&
    value.pointerRevision === pointer.pointerRevision &&
    value.authorityBundleHash === pointer.version.authorityBundleHash;
}

async function reconcileReleasedTerminal(input: Readonly<{
  ports: TrackBCommerceAuthorityMutationPorts;
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  previousService: TrackBServiceReleaseIdentity;
  targetService: TrackBServiceReleaseIdentity;
  fence: Readonly<{ fenceId: string; epoch: number }>;
}>): Promise<TrackBCommerceAuthorityMutationResult> {
  let observed: RuntimeBehaviorModePointer | null;
  try { observed = await input.ports.readActivePointer(); } catch { observed = null; }
  const restored = { ...input.previous, pointerRevision: input.target.pointerRevision + 1 };
  const terminal = pointerMatches(observed, input.target)
    ? { pointer: input.target, service: input.targetService, audit: input.direction,
        status: input.direction === "ACTIVATE_V2_CANDIDATE" ? "TARGET_ACTIVE" as const : "PREVIOUS_RESTORED" as const }
    : pointerMatches(observed, input.previous)
      ? { pointer: input.previous, service: input.previousService, audit: null,
          status: "BLOCKED_PREVIOUS" as const }
      : pointerMatches(observed, restored)
        ? { pointer: restored, service: input.previousService,
            audit: input.direction === "ACTIVATE_V2_CANDIDATE" ? "ROLLBACK_TO_LKG_V2" as const : "ACTIVATE_V2_CANDIDATE" as const,
            status: input.direction === "ACTIVATE_V2_CANDIDATE" ? "PREVIOUS_RESTORED" as const : "TARGET_ACTIVE" as const }
        : null;
  if (terminal === null) {
    return { status: "RELEASED_AMBIGUOUS", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      "TRACK_B_B3_2_RELEASED_POINTER_AMBIGUOUS",
    ] };
  }
  try {
    const runtime = await input.ports.readReleasedRuntimeAuthority({
      ...input.fence, service: terminal.service, pointer: terminal.pointer,
    });
    if (!exactReleasedRuntimeReadback(runtime, terminal.service, terminal.pointer, input.fence)) {
      throw new Error("released runtime mismatch");
    }
    if (terminal.audit !== null) {
      const auditPrevious = terminal.audit === input.direction ? input.previous : input.target;
      if (!await exactAudit({
        ports: input.ports, operationId: input.operationId, direction: terminal.audit,
        previous: auditPrevious, target: terminal.pointer,
      })) throw new Error("released audit mismatch");
    }
    const consumers = await input.ports.readReleasedConsumerAuthorities({
      ...input.fence, consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
    });
    if (!exactConsumerReadbacks(consumers, terminal.pointer)) throw new Error("released consumer mismatch");
  } catch {
    return { status: "RELEASED_AMBIGUOUS", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      "TRACK_B_B3_2_RELEASED_TERMINAL_READBACK_UNPROVEN",
    ] };
  }
  return { status: terminal.status, sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
    "TRACK_B_B3_2_RELEASE_ACK_RECONCILED",
  ] };
}

async function discardAndReleaseBeforeCas(input: Readonly<{
  ports: TrackBCommerceAuthorityMutationPorts;
  stagedService: TrackBServiceReleaseIdentity;
  lease?: Df13CommerceCutoverFenceLease;
  reasonCode: string;
}>): Promise<TrackBCommerceAuthorityMutationResult> {
  try {
    const discarded = await input.ports.discardStagedService({ stagedService: input.stagedService });
    if (discarded.status !== "DISCARDED") throw new Error("discard ambiguous");
  } catch {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_STAGED_SERVICE_DISCARD_UNPROVEN",
    ] };
  }
  if (input.lease) {
    try {
      const released = await input.ports.releaseFence(input.lease);
      if (released.status !== "RELEASED") throw new Error("release ambiguous");
    } catch {
      return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
        input.reasonCode, "TRACK_B_B3_2_FENCE_RELEASE_UNPROVEN",
      ] };
    }
  }
  return { status: "BLOCKED_PREVIOUS", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [input.reasonCode] };
}

async function exactAudit(input: Readonly<{
  ports: TrackBCommerceAuthorityMutationPorts;
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
}>): Promise<boolean> {
  try {
    return await input.ports.readActivationAudit({
      pointerRevision: input.target.pointerRevision,
      previousVersionId: input.previous.version.modeVersionId,
      previousContentHash: input.previous.version.contentHash,
      targetVersionId: input.target.version.modeVersionId,
      targetContentHash: input.target.version.contentHash,
      actor: "TRACK_B_B3_2_WRITER",
      reason: `TRACK_B_B3_2_${input.direction === "ACTIVATE_V2_CANDIDATE" ? "ACTIVATE_V2_CANDIDATE" : "ROLLBACK_TO_LKG_V2"}:${input.operationId.toLowerCase()}`,
    }) === "EXACT";
  } catch { return false; }
}

async function recoverBeforeCas(input: Readonly<{
  ports: TrackBCommerceAuthorityMutationPorts;
  lease: Df13CommerceCutoverFenceLease;
  pointer: RuntimeBehaviorModePointer;
  stagedService: TrackBServiceReleaseIdentity;
  priorService: TrackBServiceReleaseIdentity;
  reasonCode: string;
}>): Promise<TrackBCommerceAuthorityMutationResult> {
  let current: RuntimeBehaviorModePointer | null;
  try { current = await input.ports.readActivePointer(); } catch { current = null; }
  if (!pointerMatches(current, input.pointer)) {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_PRE_CAS_POINTER_AMBIGUOUS",
    ] };
  }
  let restored: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["restorePreviousService"]>>;
  try {
    restored = await input.ports.restorePreviousService({
      lease: input.lease,
      failedService: input.stagedService,
      previousService: input.priorService,
      pointer: input.pointer,
    });
  } catch {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_PRE_CAS_SERVICE_RESTORE_UNAVAILABLE",
    ] };
  }
  if (restored.status !== "HEALTHY" || restored.admission !== "HELD" ||
      !exactService(restored.observedService, input.priorService)) {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_PRE_CAS_SERVICE_RESTORE_AMBIGUOUS",
    ] };
  }
  try {
    const runtime = await input.ports.readRuntimeAuthority({
      lease: input.lease, service: input.priorService, pointer: input.pointer,
    });
    if (!exactRuntimeReadback(runtime, input.priorService, input.pointer, input.lease)) {
      throw new Error("runtime mismatch");
    }
    const consumers = await input.ports.readConsumerAuthorities({
      lease: input.lease, consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
    });
    if (!exactConsumerReadbacks(consumers, input.pointer)) throw new Error("consumer mismatch");
  } catch {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_PRE_CAS_READBACK_UNPROVEN",
    ] };
  }
  return discardAndReleaseBeforeCas({
    ports: input.ports, stagedService: input.stagedService, lease: input.lease,
    reasonCode: input.reasonCode,
  });
}

async function recoverAfterCas(input: Readonly<{
  ports: TrackBCommerceAuthorityMutationPorts;
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  lease: Df13CommerceCutoverFenceLease;
  active: RuntimeBehaviorModePointer;
  prior: RuntimeBehaviorModePointer;
  failedService: TrackBServiceReleaseIdentity;
  priorService: TrackBServiceReleaseIdentity;
  reasonCode: string;
}>): Promise<TrackBCommerceAuthorityMutationResult> {
  const reverseDirection = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? "ROLLBACK_TO_LKG_V2" : "ACTIVATE_V2_CANDIDATE";
  const restored = { ...input.prior, pointerRevision: input.active.pointerRevision + 1 };
  try {
    await input.ports.mutateExactPointer({
      direction: reverseDirection,
      previous: input.active,
      target: restored,
      lease: input.lease,
    });
  } catch { /* exact readback reconciles acknowledgement loss */ }
  let pointer: RuntimeBehaviorModePointer | null;
  try { pointer = await input.ports.readActivePointer(); } catch { pointer = null; }
  if (!pointerMatches(pointer, restored)) {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_ROLLBACK_POINTER_AMBIGUOUS",
    ] };
  }
  return completeRestoredServiceRecovery({ ...input, reverseDirection, restored });
}

async function completeRestoredServiceRecovery(input: Readonly<{
  ports: TrackBCommerceAuthorityMutationPorts;
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  reverseDirection: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  lease: Df13CommerceCutoverFenceLease;
  active: RuntimeBehaviorModePointer;
  restored: RuntimeBehaviorModePointer;
  failedService: TrackBServiceReleaseIdentity;
  priorService: TrackBServiceReleaseIdentity;
  reasonCode: string;
}>): Promise<TrackBCommerceAuthorityMutationResult> {
  let service: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["restorePreviousService"]>>;
  try {
    service = await input.ports.restorePreviousService({
      lease: input.lease,
      failedService: input.failedService,
      previousService: input.priorService,
      pointer: input.restored,
    });
  } catch {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_ROLLBACK_SERVICE_UNAVAILABLE",
    ] };
  }
  if (service.status !== "HEALTHY" || service.admission !== "HELD" ||
      !exactService(service.observedService, input.priorService)) {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_ROLLBACK_SERVICE_AMBIGUOUS",
    ] };
  }
  try {
    const runtime = await input.ports.readRuntimeAuthority({
      lease: input.lease, service: input.priorService, pointer: input.restored,
    });
    if (!exactRuntimeReadback(runtime, input.priorService, input.restored, input.lease)) throw new Error("runtime mismatch");
    if (!await exactAudit({
      ports: input.ports, operationId: input.operationId, direction: input.reverseDirection,
      previous: input.active, target: input.restored,
    })) throw new Error("audit mismatch");
    const consumers = await input.ports.readConsumerAuthorities({
      lease: input.lease, consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
    });
    if (!exactConsumerReadbacks(consumers, input.restored)) throw new Error("consumer mismatch");
  } catch {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_ROLLBACK_READBACK_UNPROVEN",
    ] };
  }
  try {
    const released = await input.ports.releaseFence(input.lease);
    if (released.status !== "RELEASED") throw new Error("release mismatch");
  } catch {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      input.reasonCode, "TRACK_B_B3_2_FENCE_RELEASE_UNPROVEN",
    ] };
  }
  return {
    status: input.direction === "ACTIVATE_V2_CANDIDATE" ? "PREVIOUS_RESTORED" : "TARGET_ACTIVE",
    sideEffects: "CONTROL_PLANE_ONLY",
    reasonCodes: [input.reasonCode],
  };
}

/** Explicit STAGE_STOPPED -> fence -> quiescence -> CAS -> START_TARGET protocol. */
export async function executeTrackBCommerceAuthorityMutation(input: Readonly<{
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  rollbackRecord: TrackBReleaseLocalRollbackRecord;
  releaseEvidence?: TrackBReleaseCandidateEvidence;
  ports: TrackBCommerceAuthorityMutationPorts;
}>): Promise<TrackBCommerceAuthorityMutationResult> {
  if (!exactEnvelope(input)) {
    return {
      status: "BLOCKED_PREVIOUS",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["TRACK_B_B3_2_MUTATION_ENVELOPE_INVALID"],
    };
  }
  try {
    const persistedRecord = await input.ports.readPersistedRollbackRecord(
      input.rollbackRecord.recordHash,
    );
    if (persistedRecord === null ||
        canonicalJsonV1(persistedRecord) !== canonicalJsonV1(input.rollbackRecord)) {
      return {
        status: "BLOCKED_PREVIOUS",
        sideEffects: "NOT_EXECUTED",
        reasonCodes: ["TRACK_B_B3_2_ROLLBACK_RECORD_NOT_PERSISTED"],
      };
    }
  } catch {
    return {
      status: "BLOCKED_PREVIOUS",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["TRACK_B_B3_2_ROLLBACK_RECORD_UNAVAILABLE"],
    };
  }
  const expectedService = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? input.rollbackRecord.candidate.service : input.rollbackRecord.lastKnownGood.service;
  const expectedSourceService = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? input.rollbackRecord.lastKnownGood.service : input.rollbackRecord.candidate.service;
  let staged: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["stageAffectedService"]>>;
  try {
    staged = await input.ports.stageAffectedService({
      direction: input.direction, sourceService: expectedSourceService, targetService: expectedService,
    });
  } catch {
    return { status: "BLOCKED_PREVIOUS", sideEffects: "NOT_EXECUTED", reasonCodes: ["TRACK_B_B3_2_SERVICE_STAGING_UNAVAILABLE"] };
  }
  if (staged.status !== "STAGED_STOPPED" || staged.admission !== "NON_ADMITTING" ||
      !exactService(staged.observedSourceService, expectedSourceService) ||
      !exactService(staged.stagedService, expectedService)) {
    if (staged.status === "BLOCKED" && staged.stagedService === null) {
      return { status: "BLOCKED_PREVIOUS", sideEffects: "NOT_EXECUTED", reasonCodes: [
        "TRACK_B_B3_2_SERVICE_STAGING_UNPROVEN",
      ] };
    }
    if (!exactService(staged.stagedService, expectedService)) {
      return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
        "TRACK_B_B3_2_SERVICE_STAGING_UNPROVEN",
        "TRACK_B_B3_2_STAGED_SERVICE_IDENTITY_AMBIGUOUS",
      ] };
    }
    return discardAndReleaseBeforeCas({
      ports: input.ports, stagedService: expectedService, reasonCode: "TRACK_B_B3_2_SERVICE_STAGING_UNPROVEN",
    });
  }
  const fenceRequest: Df13CommerceCutoverFenceRequest = {
    operationId: input.operationId,
    pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
    channel: DF13_COMMERCE_PREPROD_SCOPE_V1.channel,
    preCutover: {
      modeVersionId: input.previous.version.modeVersionId,
      contentHash: input.previous.version.contentHash,
      pointerRevision: input.previous.pointerRevision,
    },
    target: {
      modeVersionId: input.target.version.modeVersionId,
      contentHash: input.target.version.contentHash,
      authorityBundleHash: input.target.version.authorityBundleHash ?? "",
    },
  };
  let acquired: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["acquireFence"]>>;
  try {
    acquired = await input.ports.acquireFence(fenceRequest);
  } catch {
    return discardAndReleaseBeforeCas({ ports: input.ports, stagedService: expectedService,
      reasonCode: "TRACK_B_B3_2_FENCE_ACQUISITION_UNAVAILABLE" });
  }
  if (acquired.status !== "HELD") {
    return discardAndReleaseBeforeCas({ ports: input.ports, stagedService: expectedService,
      reasonCode: "TRACK_B_B3_2_FENCE_NOT_HELD" });
  }
  let admission: TrackBCommerceAdmissionReadback;
  try {
    admission = await input.ports.proveAdmissionHeld({ lease: acquired.lease });
  } catch {
    return discardAndReleaseBeforeCas({ ports: input.ports, lease: acquired.lease,
      stagedService: expectedService, reasonCode: "TRACK_B_B3_2_ADMISSION_READBACK_UNAVAILABLE" });
  }
  if (!exactAdmissionReadback(admission, acquired.lease)) {
    return discardAndReleaseBeforeCas({ ports: input.ports, lease: acquired.lease,
      stagedService: expectedService, reasonCode: "TRACK_B_B3_2_ADMISSION_NOT_HELD" });
  }
  let quiescence: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["stopSourceAndProveQuiescence"]>>;
  try {
    quiescence = await input.ports.stopSourceAndProveQuiescence({
      lease: acquired.lease,
      sourceService: expectedSourceService,
    });
  } catch {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      "TRACK_B_B3_2_QUIESCENCE_UNAVAILABLE",
    ] };
  }
  if (!exactQuiescence(quiescence, expectedSourceService)) {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      "TRACK_B_B3_2_QUIESCENCE_UNPROVEN",
    ] };
  }
  try {
    await input.ports.mutateExactPointer({
      direction: input.direction,
      previous: input.previous,
      target: input.target,
      lease: acquired.lease,
    });
  } catch { /* exact readback reconciles lost acknowledgement */ }
  let observed: RuntimeBehaviorModePointer | null;
  try {
    observed = await input.ports.readActivePointer();
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_POINTER_READBACK_AMBIGUOUS"],
    };
  }
  if (!pointerMatches(observed, input.target)) {
    if (pointerMatches(observed, input.previous)) {
      return recoverBeforeCas({ ports: input.ports, lease: acquired.lease, pointer: input.previous,
        stagedService: expectedService, priorService: expectedSourceService,
        reasonCode: "TRACK_B_B3_2_POINTER_NOT_MUTATED" });
    }
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_POINTER_READBACK_AMBIGUOUS"],
    };
  }
  let started: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["startStagedService"]>>;
  try {
    started = await input.ports.startStagedService({
      direction: input.direction, lease: acquired.lease, stagedService: expectedService,
      pointer: input.target,
    });
  } catch {
    started = { status: "BLOCKED", admission: "HELD", observedService: null };
  }
  if (started.status !== "HEALTHY" || started.admission !== "HELD" ||
      !exactService(started.observedService, expectedService)) {
    return recoverAfterCas({ ports: input.ports, operationId: input.operationId, direction: input.direction,
      lease: acquired.lease, active: input.target, prior: input.previous, failedService: expectedService,
      priorService: expectedSourceService, reasonCode: "TRACK_B_B3_2_TARGET_START_FAILED" });
  }
  try {
    const runtime = await input.ports.readRuntimeAuthority({
      lease: acquired.lease, service: expectedService, pointer: input.target,
    });
    if (!exactRuntimeReadback(runtime, expectedService, input.target, acquired.lease)) throw new Error("runtime mismatch");
  } catch {
    return recoverAfterCas({ ports: input.ports, operationId: input.operationId, direction: input.direction,
      lease: acquired.lease, active: input.target, prior: input.previous, failedService: expectedService,
      priorService: expectedSourceService, reasonCode: "TRACK_B_B3_2_RUNTIME_READBACK_UNPROVEN" });
  }
  if (!await exactAudit({ ports: input.ports, operationId: input.operationId, direction: input.direction,
    previous: input.previous, target: input.target })) {
    return recoverAfterCas({ ports: input.ports, operationId: input.operationId, direction: input.direction,
      lease: acquired.lease, active: input.target, prior: input.previous, failedService: expectedService,
      priorService: expectedSourceService, reasonCode: "TRACK_B_B3_2_ACTIVATION_AUDIT_UNPROVEN" });
  }
  let readbacks: readonly TrackBCommerceConsumerReadback[];
  try {
    readbacks = await input.ports.readConsumerAuthorities({
      lease: acquired.lease,
      consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
    });
  } catch {
    return recoverAfterCas({ ports: input.ports, operationId: input.operationId, direction: input.direction,
      lease: acquired.lease, active: input.target, prior: input.previous, failedService: expectedService,
      priorService: expectedSourceService, reasonCode: "TRACK_B_B3_2_CONSUMER_READBACK_UNAVAILABLE" });
  }
  if (!exactConsumerReadbacks(readbacks, input.target)) {
    return recoverAfterCas({ ports: input.ports, operationId: input.operationId, direction: input.direction,
      lease: acquired.lease, active: input.target, prior: input.previous, failedService: expectedService,
      priorService: expectedSourceService, reasonCode: "TRACK_B_B3_2_CONSUMER_READBACK_INCOMPLETE" });
  }
  try {
    const released = await input.ports.releaseFence(acquired.lease);
    if (released.status !== "RELEASED") throw new Error("release mismatch");
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_FENCE_RELEASE_UNPROVEN"],
    };
  }
  return {
    status: input.direction === "ACTIVATE_V2_CANDIDATE" ? "TARGET_ACTIVE" : "PREVIOUS_RESTORED",
    sideEffects: "CONTROL_PLANE_ONLY",
    reasonCodes: [],
  };
}

/** Re-entry path after an interrupted operation; it always converges to the recorded prior identity. */
export async function recoverTrackBCommerceAuthorityMutationAfterInterruption(input: Readonly<{
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  rollbackRecord: TrackBReleaseLocalRollbackRecord;
  releaseEvidence?: TrackBReleaseCandidateEvidence;
  ports: TrackBCommerceAuthorityMutationPorts;
}>): Promise<TrackBCommerceAuthorityMutationResult> {
  if (!exactEnvelope(input)) {
    return { status: "HOLD_RETAINED", sideEffects: "NOT_EXECUTED", reasonCodes: [
      "TRACK_B_B3_2_RECOVERY_ENVELOPE_INVALID",
    ] };
  }
  try {
    const persisted = await input.ports.readPersistedRollbackRecord(input.rollbackRecord.recordHash);
    if (persisted === null || canonicalJsonV1(persisted) !== canonicalJsonV1(input.rollbackRecord)) {
      throw new Error("rollback record mismatch");
    }
  } catch {
    return { status: "HOLD_RETAINED", sideEffects: "NOT_EXECUTED", reasonCodes: [
      "TRACK_B_B3_2_RECOVERY_ROLLBACK_RECORD_UNPROVEN",
    ] };
  }
  const failedService = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? input.rollbackRecord.candidate.service : input.rollbackRecord.lastKnownGood.service;
  const priorService = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? input.rollbackRecord.lastKnownGood.service : input.rollbackRecord.candidate.service;
  const request: Df13CommerceCutoverFenceRequest = {
    operationId: input.operationId,
    pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
    channel: DF13_COMMERCE_PREPROD_SCOPE_V1.channel,
    preCutover: {
      modeVersionId: input.previous.version.modeVersionId,
      contentHash: input.previous.version.contentHash,
      pointerRevision: input.previous.pointerRevision,
    },
    target: {
      modeVersionId: input.target.version.modeVersionId,
      contentHash: input.target.version.contentHash,
      authorityBundleHash: input.target.version.authorityBundleHash ?? "",
    },
  };
  let acquired: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["acquireFence"]>>;
  try { acquired = await input.ports.acquireFence(request); } catch {
    return { status: "HOLD_RETAINED", sideEffects: "NOT_EXECUTED", reasonCodes: [
      "TRACK_B_B3_2_RECOVERY_FENCE_UNAVAILABLE",
    ] };
  }
  if (acquired.status === "ALREADY_RELEASED") {
    return reconcileReleasedTerminal({
      ports: input.ports,
      operationId: input.operationId,
      direction: input.direction,
      previous: input.previous,
      target: input.target,
      previousService: priorService,
      targetService: failedService,
      fence: { fenceId: acquired.fenceId, epoch: acquired.epoch },
    });
  }
  if (acquired.status !== "HELD") {
    return { status: "HOLD_RETAINED", sideEffects: "NOT_EXECUTED", reasonCodes: [
      "TRACK_B_B3_2_RECOVERY_FENCE_NOT_HELD",
    ] };
  }
  try {
    const admission = await input.ports.proveAdmissionHeld({ lease: acquired.lease });
    if (!exactAdmissionReadback(admission, acquired.lease)) {
      return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
        "TRACK_B_B3_2_RECOVERY_ADMISSION_NOT_HELD",
      ] };
    }
  } catch {
    return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
      "TRACK_B_B3_2_RECOVERY_ADMISSION_READBACK_UNAVAILABLE",
    ] };
  }
  let observed: RuntimeBehaviorModePointer | null;
  try { observed = await input.ports.readActivePointer(); } catch { observed = null; }
  if (pointerMatches(observed, input.previous)) {
    return recoverBeforeCas({
      ports: input.ports,
      lease: acquired.lease,
      pointer: input.previous,
      stagedService: failedService,
      priorService,
      reasonCode: "TRACK_B_B3_2_INTERRUPTED_BEFORE_CAS",
    });
  }
  if (pointerMatches(observed, input.target)) {
    return recoverAfterCas({
      ports: input.ports,
      operationId: input.operationId,
      direction: input.direction,
      lease: acquired.lease,
      active: input.target,
      prior: input.previous,
      failedService,
      priorService,
      reasonCode: "TRACK_B_B3_2_INTERRUPTED_AFTER_CAS",
    });
  }
  const restored = { ...input.previous, pointerRevision: input.target.pointerRevision + 1 };
  if (pointerMatches(observed, restored)) {
    const reverseDirection = input.direction === "ACTIVATE_V2_CANDIDATE"
      ? "ROLLBACK_TO_LKG_V2" : "ACTIVATE_V2_CANDIDATE";
    return completeRestoredServiceRecovery({
      ports: input.ports,
      operationId: input.operationId,
      direction: input.direction,
      reverseDirection,
      lease: acquired.lease,
      active: input.target,
      restored,
      failedService,
      priorService,
      reasonCode: "TRACK_B_B3_2_INTERRUPTED_AFTER_ROLLBACK_CAS",
    });
  }
  return { status: "HOLD_RETAINED", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [
    "TRACK_B_B3_2_INTERRUPTED_POINTER_AMBIGUOUS",
  ] };
}
