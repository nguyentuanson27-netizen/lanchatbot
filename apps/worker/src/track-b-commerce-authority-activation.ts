import { behaviorModeContentHash, type RuntimeBehaviorModePointer } from "@lana/chat-runtime";
import type {
  Df13CommerceCutoverFenceLease,
  Df13CommerceCutoverFenceRequest,
} from "@lana/database";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
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

export type TrackBCommerceConsumerReadback = Readonly<{
  consumer: CommerceAuthorityConsumer;
  source: "DATABASE" | "CACHE" | "LAST_KNOWN_GOOD" | "STARTUP_DEFAULT" | "FAIL_SAFE";
  modeVersionId: string | null;
  contentHash: string | null;
  pointerRevision: number | null;
  authorityBundleHash: string | null;
}>;

export interface TrackBCommerceAuthorityMutationPorts {
  acquireFence(request: Df13CommerceCutoverFenceRequest): Promise<Readonly<
    | { status: "HELD"; lease: Df13CommerceCutoverFenceLease }
    | { status: "HELD_RECONCILE_REQUIRED" | "ALREADY_RELEASED" | "PARKED"; reasonCode?: string }
  >>;
  proveQuiescence(input: Readonly<{ lease: Df13CommerceCutoverFenceLease }>): Promise<Readonly<{
    status: "QUIESCENT" | "BUSY";
    activeInbox: number;
    activeMetaOutbox: number;
    activePancakeOutbox: number;
    inFlightAuthorityDependentWork: number;
    queuedAuthorityDependentWork: number;
    admission: "HELD" | "UNCONTROLLED";
  }>>;
  replaceAffectedServices(input: Readonly<{
    direction: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
    lease: Df13CommerceCutoverFenceLease;
    targetReleaseRevision: string;
  }>): Promise<Readonly<{
    status: "READY" | "BLOCKED";
    admission: "HELD" | "UNCONTROLLED";
    observedReleaseRevision: string | null;
  }>>;
  mutateExactPointer(input: Readonly<{
    direction: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
    previous: RuntimeBehaviorModePointer;
    target: RuntimeBehaviorModePointer;
    lease: Df13CommerceCutoverFenceLease;
  }>): Promise<Readonly<{ status: "ACKNOWLEDGED" | "ACK_LOST" | "CAS_MISMATCH" }>>;
  readActivePointer(): Promise<RuntimeBehaviorModePointer | null>;
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
  releaseFence(lease: Df13CommerceCutoverFenceLease): Promise<Readonly<{
    status: "RELEASED" | "STALE_OR_MISSING";
  }>>;
}

export type TrackBCommerceAuthorityMutationResult = Readonly<{
  status: "BLOCKED_PREVIOUS" | "TARGET_ACTIVE" | "PREVIOUS_RESTORED" | "HOLD_RETAINED";
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
  direction: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  targetReleaseRevision: string;
  releaseEvidence?: TrackBReleaseCandidateEvidence;
}>): boolean {
  const previousBundle = input.direction === "ACTIVATE_TRACK_B"
    ? DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
    : DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash;
  const targetBundle = input.direction === "ACTIVATE_TRACK_B"
    ? DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash
    : DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash;
  const releaseIsExact = COMMIT_PATTERN.test(input.targetReleaseRevision) && (
    input.direction === "ROLLBACK_TRACK_B"
      ? input.releaseEvidence === undefined
      : input.releaseEvidence !== undefined &&
        validateTrackBReleaseCandidateEvidence(input.releaseEvidence, {
          activationReleaseRevision: input.targetReleaseRevision,
        }).status === "MATCHED"
  );
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

async function releaseBeforeMutation(
  ports: TrackBCommerceAuthorityMutationPorts,
  lease: Df13CommerceCutoverFenceLease,
  reasonCode: string,
): Promise<TrackBCommerceAuthorityMutationResult> {
  try {
    const released = await ports.releaseFence(lease);
    if (released.status === "RELEASED") {
      return { status: "BLOCKED_PREVIOUS", sideEffects: "CONTROL_PLANE_ONLY", reasonCodes: [reasonCode] };
    }
  } catch { /* retain the hold */ }
  return {
    status: "HOLD_RETAINED",
    sideEffects: "CONTROL_PLANE_ONLY",
    reasonCodes: [reasonCode, "TRACK_B_B3_2_FENCE_RELEASE_UNPROVEN"],
  };
}

/**
 * Side-effect-free outside the behavior control plane. Activation and rollback
 * use separate immutable 0036 fence records. The exact affected-service release
 * is replaced only after admission is held and quiescence is proven, then
 * quiescence is re-proved before CAS. A failed replacement or post-CAS readback
 * never resumes authority-dependent work.
 */
export async function executeTrackBCommerceAuthorityMutation(input: Readonly<{
  operationId: string;
  direction: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  targetReleaseRevision: string;
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
    return {
      status: "BLOCKED_PREVIOUS",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["TRACK_B_B3_2_FENCE_ACQUISITION_UNAVAILABLE"],
    };
  }
  if (acquired.status !== "HELD") {
    return {
      status: "BLOCKED_PREVIOUS",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["TRACK_B_B3_2_FENCE_NOT_HELD"],
    };
  }
  let quiescence: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["proveQuiescence"]>>;
  try {
    quiescence = await input.ports.proveQuiescence({ lease: acquired.lease });
  } catch {
    return releaseBeforeMutation(input.ports, acquired.lease, "TRACK_B_B3_2_QUIESCENCE_UNAVAILABLE");
  }
  if (
    quiescence.status !== "QUIESCENT" ||
    quiescence.admission !== "HELD" ||
    quiescence.activeInbox !== 0 ||
    quiescence.activeMetaOutbox !== 0 ||
    quiescence.activePancakeOutbox !== 0 ||
    quiescence.inFlightAuthorityDependentWork !== 0 ||
    quiescence.queuedAuthorityDependentWork !== 0
  ) {
    return releaseBeforeMutation(input.ports, acquired.lease, "TRACK_B_B3_2_QUIESCENCE_UNPROVEN");
  }
  let replacement: Awaited<ReturnType<TrackBCommerceAuthorityMutationPorts["replaceAffectedServices"]>>;
  try {
    replacement = await input.ports.replaceAffectedServices({
      direction: input.direction,
      lease: acquired.lease,
      targetReleaseRevision: input.targetReleaseRevision,
    });
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_SERVICE_REPLACEMENT_UNAVAILABLE"],
    };
  }
  if (
    replacement.status !== "READY" ||
    replacement.admission !== "HELD" ||
    replacement.observedReleaseRevision !== input.targetReleaseRevision
  ) {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_SERVICE_REPLACEMENT_UNPROVEN"],
    };
  }
  try {
    quiescence = await input.ports.proveQuiescence({ lease: acquired.lease });
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_POST_REPLACEMENT_QUIESCENCE_UNAVAILABLE"],
    };
  }
  if (
    quiescence.status !== "QUIESCENT" ||
    quiescence.admission !== "HELD" ||
    quiescence.activeInbox !== 0 ||
    quiescence.activeMetaOutbox !== 0 ||
    quiescence.activePancakeOutbox !== 0 ||
    quiescence.inFlightAuthorityDependentWork !== 0 ||
    quiescence.queuedAuthorityDependentWork !== 0
  ) {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_POST_REPLACEMENT_QUIESCENCE_UNPROVEN"],
    };
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
      return releaseBeforeMutation(input.ports, acquired.lease, "TRACK_B_B3_2_POINTER_NOT_MUTATED");
    }
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_POINTER_READBACK_AMBIGUOUS"],
    };
  }
  let audit: "EXACT" | "MISSING" | "AMBIGUOUS";
  try {
    audit = await input.ports.readActivationAudit({
      pointerRevision: input.target.pointerRevision,
      previousVersionId: input.previous.version.modeVersionId,
      previousContentHash: input.previous.version.contentHash,
      targetVersionId: input.target.version.modeVersionId,
      targetContentHash: input.target.version.contentHash,
      actor: "TRACK_B_B3_2_WRITER",
      reason: `TRACK_B_B3_2_${input.direction === "ACTIVATE_TRACK_B" ? "ACTIVATE" : "ROLLBACK"}:${input.operationId.toLowerCase()}`,
    });
  } catch {
    audit = "AMBIGUOUS";
  }
  if (audit !== "EXACT") {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_ACTIVATION_AUDIT_UNPROVEN"],
    };
  }
  let readbacks: readonly TrackBCommerceConsumerReadback[];
  try {
    readbacks = await input.ports.readConsumerAuthorities({
      lease: acquired.lease,
      consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
    });
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_CONSUMER_READBACK_UNAVAILABLE"],
    };
  }
  if (!exactConsumerReadbacks(readbacks, input.target)) {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_CONSUMER_READBACK_INCOMPLETE"],
    };
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
    status: input.direction === "ACTIVATE_TRACK_B" ? "TARGET_ACTIVE" : "PREVIOUS_RESTORED",
    sideEffects: "CONTROL_PLANE_ONLY",
    reasonCodes: [],
  };
}
