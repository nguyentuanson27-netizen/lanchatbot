import {
  behaviorModeContentHash,
  type RuntimeBehaviorModePointer,
} from "@lana/chat-runtime";
import {
  deriveGateECandidateContentFingerprint,
  type GateECandidateSourceReader,
} from "./gate-e-registration.js";
import type { MissingCommerceSignal } from "./missing-commerce-signal.js";
import {
  validateDf13ReleaseCandidateEvidence,
  type Df13ReleaseCandidateEvidence,
} from "./df13-release-candidate-evidence.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  GATE_E_PREPROD_V15_BINDING,
  type CommerceAuthorityConsumer,
} from "./df13-commerce-authority-contract.js";

export {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  GATE_E_PREPROD_V15_BINDING,
  type CommerceAuthorityConsumer,
} from "./df13-commerce-authority-contract.js";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const PREPROD_TEST_PAGE_ID = "1198992073286645";

export interface Df13CandidateBindingInput {
  readonly gateEManifestHash: string;
  readonly gateECandidateSourceRevision: string;
  readonly activationReleaseRevision: string;
  readonly rederivedCandidateContentFingerprint: string;
}

/**
 * The activation caller can identify an immutable release, but it cannot
 * supply the content fingerprint that proves the release still matches Gate E.
 */
export interface Df13CandidateBindingRequest {
  readonly gateEManifestHash: string;
  readonly gateECandidateSourceRevision: string;
  readonly activationReleaseRevision: string;
}

export type Df13CandidateBindingValidation =
  | Readonly<{ status: "MATCHED"; reasonCodes: readonly [] }>
  | Readonly<{ status: "MISMATCH"; reasonCodes: readonly string[] }>;

/**
 * A manifest hash alone is intentionally insufficient. The activation release
 * must re-derive the same candidate-affecting content fingerprint from its
 * own immutable source revision.
 */
export function validateDf13CandidateBinding(
  input: Df13CandidateBindingInput,
): Df13CandidateBindingValidation {
  const reasonCodes: string[] = [];
  if (input.gateEManifestHash !== GATE_E_PREPROD_V15_BINDING.manifestHash) {
    reasonCodes.push("DF13_GATE_E_MANIFEST_MISMATCH");
  }
  if (input.gateECandidateSourceRevision !==
      GATE_E_PREPROD_V15_BINDING.candidateSourceRevision) {
    reasonCodes.push("DF13_GATE_E_CANDIDATE_SOURCE_MISMATCH");
  }
  if (!COMMIT_PATTERN.test(input.activationReleaseRevision)) {
    reasonCodes.push("DF13_ACTIVATION_RELEASE_REVISION_INVALID");
  }
  if (!SHA256_PATTERN.test(input.rederivedCandidateContentFingerprint) ||
      input.rederivedCandidateContentFingerprint !==
        GATE_E_PREPROD_V15_BINDING.candidateContentFingerprint) {
    reasonCodes.push("DF13_GATE_E_CANDIDATE_FINGERPRINT_MISMATCH");
  }
  return reasonCodes.length === 0
    ? { status: "MATCHED", reasonCodes: [] }
    : { status: "MISMATCH", reasonCodes };
}

export async function rederiveDf13CandidateBinding(input: Df13CandidateBindingRequest & Readonly<{
  readonly git: GateECandidateSourceReader;
}>): Promise<Df13CandidateBindingValidation & Readonly<{
  activationReleaseRevision: string;
  rederivedCandidateContentFingerprint: string | null;
}>> {
  if (!COMMIT_PATTERN.test(input.activationReleaseRevision)) {
    return {
      status: "MISMATCH",
      reasonCodes: ["DF13_ACTIVATION_RELEASE_REVISION_INVALID"],
      activationReleaseRevision: input.activationReleaseRevision,
      rederivedCandidateContentFingerprint: null,
    };
  }
  try {
    const proof = await deriveGateECandidateContentFingerprint({
      candidateSourceRevision: input.activationReleaseRevision,
      git: input.git,
    });
    return {
      ...validateDf13CandidateBinding({
        gateEManifestHash: input.gateEManifestHash,
        gateECandidateSourceRevision: input.gateECandidateSourceRevision,
        activationReleaseRevision: input.activationReleaseRevision,
        rederivedCandidateContentFingerprint: proof.contentFingerprint,
      }),
      activationReleaseRevision: input.activationReleaseRevision,
      rederivedCandidateContentFingerprint: proof.contentFingerprint,
    };
  } catch {
    return {
      status: "MISMATCH",
      reasonCodes: ["DF13_GATE_E_CANDIDATE_REDERIVATION_UNAVAILABLE"],
      activationReleaseRevision: input.activationReleaseRevision,
      rederivedCandidateContentFingerprint: null,
    };
  }
}

export interface CommerceCutoverPreflightInput {
  readonly pageId: string;
  readonly channel: string;
  readonly currentPointer: RuntimeBehaviorModePointer;
  readonly targetPointer: RuntimeBehaviorModePointer;
  readonly candidate: Df13CandidateBindingRequest;
  readonly missingCommerceSignal: MissingCommerceSignal;
  readonly verification: Readonly<{
    transitionMatrixPassed: boolean;
    bfDfReplayPassed: boolean;
    rollbackVerified: boolean;
  }>;
}

export type CommerceCutoverPreflight = Readonly<{
  status: "PREPARED_NO_ACTIVATION" | "BLOCKED_LEGACY";
  currentAuthority: "LEGACY";
  targetAuthority: "COMMERCE";
  sideEffects: "NOT_EXECUTED";
  authorityBundle: typeof DF13_COMMERCE_AUTHORITY_BUNDLE_V1;
  reasonCodes: readonly string[];
}>;

function normalizedAuthorityBundleHash(pointer: RuntimeBehaviorModePointer): string | null {
  return pointer.version.authorityBundleHash ?? null;
}

function pointerHasCanonicalContentHash(pointer: RuntimeBehaviorModePointer): boolean {
  return behaviorModeContentHash(pointer.version) === pointer.version.contentHash;
}

function pointerVersionMatches(
  observed: RuntimeBehaviorModePointer,
  expected: RuntimeBehaviorModePointer,
): boolean {
  return observed.version.schemaVersion === expected.version.schemaVersion &&
    observed.version.modeVersionId === expected.version.modeVersionId &&
    observed.version.pageId === expected.version.pageId &&
    observed.version.channel === expected.version.channel &&
    observed.version.confirmationMode === expected.version.confirmationMode &&
    observed.version.salesAuthorityMode === expected.version.salesAuthorityMode &&
    observed.version.stateReadMode === expected.version.stateReadMode &&
    normalizedAuthorityBundleHash(observed) === normalizedAuthorityBundleHash(expected) &&
    observed.version.contentHash === expected.version.contentHash;
}

function pointerIsLegacy(pointer: RuntimeBehaviorModePointer): boolean {
  return pointer.version.salesAuthorityMode === "LEGACY" &&
    pointer.version.stateReadMode === "LEGACY" &&
    normalizedAuthorityBundleHash(pointer) === null &&
    pointerHasCanonicalContentHash(pointer);
}

function pointerIsTargetCommerce(
  pointer: RuntimeBehaviorModePointer,
  preflight: CommerceCutoverPreflightInput,
): boolean {
  return pointerHasCanonicalContentHash(pointer) &&
    Number.isSafeInteger(pointer.pointerRevision) &&
    pointer.pointerRevision > 0 &&
    pointer.version.pageId === preflight.pageId &&
    pointer.version.channel === preflight.channel &&
    pointer.version.confirmationMode === preflight.currentPointer.version.confirmationMode &&
    pointer.version.salesAuthorityMode === "COMMERCE" &&
    pointer.version.stateReadMode === "LEGACY" &&
    pointer.version.authorityBundleHash ===
      DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash &&
    pointer.pointerRevision === preflight.currentPointer.pointerRevision + 1;
}

function readinessSatisfied(signal: MissingCommerceSignal): boolean {
  return signal.status === "COMMERCE_STATE_PRESENT" &&
    signal.futureCommerceDisposition === "SATISFIED" &&
    signal.activeAuthority === "LEGACY" &&
    signal.candidateAuthority === "COMMERCE" &&
    signal.sideEffects === "DISABLED" &&
    signal.canonicalIntentFingerprint !== null &&
    signal.commerceContentFingerprint !== null &&
    SHA256_PATTERN.test(signal.canonicalIntentFingerprint) &&
    SHA256_PATTERN.test(signal.commerceContentFingerprint);
}

/**
 * This is a source-only preflight. It selects no runtime authority and does
 * not contact a control plane; a future owner-authorized invocation must pass
 * every deterministic prerequisite before it can acquire the fence.
 */
export function assessCommerceCutoverPreflight(
  input: CommerceCutoverPreflightInput,
  candidateBinding: Df13CandidateBindingValidation,
): CommerceCutoverPreflight {
  const reasonCodes: string[] = [];
  if (input.pageId !== PREPROD_TEST_PAGE_ID || input.channel !== "MESSENGER") {
    reasonCodes.push("DF13_PAGE_SCOPE_INVALID");
  }
  if (input.currentPointer.version.pageId !== input.pageId ||
      input.currentPointer.version.channel !== input.channel ||
      !Number.isSafeInteger(input.currentPointer.pointerRevision) ||
      input.currentPointer.pointerRevision < 1 ||
      !Number.isSafeInteger(input.targetPointer.pointerRevision) ||
      !pointerIsLegacy(input.currentPointer)) {
    reasonCodes.push("DF13_CURRENT_AUTHORITY_NOT_LEGACY");
  }
  if (!pointerIsTargetCommerce(input.targetPointer, input)) {
    reasonCodes.push("DF13_TARGET_AUTHORITY_INVALID");
  }
  reasonCodes.push(...candidateBinding.reasonCodes);
  if (!readinessSatisfied(input.missingCommerceSignal)) {
    reasonCodes.push("DF13_MISSING_COMMERCE_SIGNAL_UNSATISFIED");
  }
  if (!input.verification.transitionMatrixPassed) {
    reasonCodes.push("DF13_TRANSITION_MATRIX_UNVERIFIED");
  }
  if (!input.verification.bfDfReplayPassed) {
    reasonCodes.push("DF13_BF_DF_REPLAY_UNVERIFIED");
  }
  if (!input.verification.rollbackVerified) {
    reasonCodes.push("DF13_ROLLBACK_UNVERIFIED");
  }
  return {
    status: reasonCodes.length === 0 ? "PREPARED_NO_ACTIVATION" : "BLOCKED_LEGACY",
    currentAuthority: "LEGACY",
    targetAuthority: "COMMERCE",
    sideEffects: "NOT_EXECUTED",
    authorityBundle: DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
    reasonCodes,
  };
}

export interface CommerceAuthorityConsumerReadback {
  readonly consumer: CommerceAuthorityConsumer;
  readonly source: "DATABASE" | "CACHE" | "LAST_KNOWN_GOOD" | "STARTUP_DEFAULT" | "FAIL_SAFE";
  readonly modeVersionId: string | null;
  readonly contentHash: string | null;
  readonly pointerRevision: number | null;
  readonly salesAuthorityMode: "LEGACY" | "COMMERCE";
  readonly stateReadMode: "LEGACY" | "V2";
  readonly authorityBundleHash: string | null;
}

export interface CommerceCutoverPorts {
  /**
   * Trusted release-integrity boundary. Its production implementation must
   * call prepareDf13ReleaseCandidateEvidence against immutable release source.
   * The executor independently validates the complete returned evidence; a
   * caller cannot substitute an unstructured success assertion.
   */
  readonly prepareReleaseCandidateEvidence: (
    input: Df13CandidateBindingRequest,
  ) => Promise<Df13ReleaseCandidateEvidence>;
  readonly holdAuthorityDependentWork: (input: Readonly<{
    pageId: string;
    channel: string;
    consumers: readonly CommerceAuthorityConsumer[];
  }>) => Promise<Readonly<
    | { status: "HELD"; fenceToken: string }
    | { status: "REJECTED"; reasonCode: string }
  >>;
  readonly proveQuiescence: (input: Readonly<{ fenceToken: string }>) => Promise<Readonly<{
    status: "QUIESCENT" | "BUSY";
    inFlightAuthorityDependentWork: number;
    queuedWork: "DRAINED" | "HELD" | "UNCONTROLLED";
  }>>;
  readonly activateCommerce: (input: Readonly<{
    expectedPointerRevision: number;
    targetVersionId: string;
    targetContentHash: string;
    fenceToken: string;
  }>) => Promise<Readonly<{ status: "ACKNOWLEDGED" | "ACK_LOST" | "CAS_MISMATCH" }>>;
  readonly readActivePointer: () => Promise<RuntimeBehaviorModePointer | null>;
  readonly readActivationAudit: (input: Readonly<{
    pointerRevision: number;
    modeVersionId: string;
    contentHash: string;
  }>) => Promise<"EXACT" | "MISSING" | "AMBIGUOUS">;
  readonly readConsumerAuthorities: (input: Readonly<{
    fenceToken: string;
    consumers: readonly CommerceAuthorityConsumer[];
  }>) => Promise<readonly CommerceAuthorityConsumerReadback[]>;
  readonly rollbackToLegacy: (input: Readonly<{
    expectedPointerRevision: number;
    targetLegacyVersionId: string;
    targetLegacyContentHash: string;
    fenceToken: string;
  }>) => Promise<Readonly<{ status: "ACKNOWLEDGED" | "ACK_LOST" | "CAS_MISMATCH" }>>;
  readonly releaseAuthorityDependentWork: (input: Readonly<{ fenceToken: string }>) => Promise<void>;
}

export type CommerceCutoverExecution = Readonly<{
  status: "BLOCKED_LEGACY" | "COMMERCE_ACTIVE" | "LEGACY_RESTORED" | "HOLD_RETAINED";
  sideEffects: "NOT_EXECUTED" | "CONTROL_PLANE_ONLY";
  activationAcknowledgement:
    | "NOT_ATTEMPTED"
    | "CAS_REJECTED"
    | "ACKNOWLEDGED"
    | "LOST_RECONCILED";
  reasonCodes: readonly string[];
}>;

function targetPointerMatches(
  observed: RuntimeBehaviorModePointer | null,
  target: RuntimeBehaviorModePointer,
): boolean {
  return observed !== null &&
    pointerHasCanonicalContentHash(observed) &&
    observed.pointerRevision === target.pointerRevision &&
    pointerVersionMatches(observed, target) &&
    observed.version.salesAuthorityMode === "COMMERCE" &&
    observed.version.stateReadMode === "LEGACY" &&
    normalizedAuthorityBundleHash(observed) === normalizedAuthorityBundleHash(target) &&
    normalizedAuthorityBundleHash(observed) ===
      DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash;
}

function isSafeLegacyPointer(
  observed: RuntimeBehaviorModePointer | null,
): observed is RuntimeBehaviorModePointer {
  return observed !== null && pointerIsLegacy(observed);
}

function isPreCutoverLegacyPointer(
  observed: RuntimeBehaviorModePointer | null,
  preflight: CommerceCutoverPreflightInput,
): observed is RuntimeBehaviorModePointer {
  return isSafeLegacyPointer(observed) &&
    observed.pointerRevision === preflight.currentPointer.pointerRevision &&
    pointerVersionMatches(observed, preflight.currentPointer);
}

function isRestoredLegacyPointer(
  observed: RuntimeBehaviorModePointer | null,
  preflight: CommerceCutoverPreflightInput,
): observed is RuntimeBehaviorModePointer {
  return isSafeLegacyPointer(observed) &&
    observed.pointerRevision === preflight.targetPointer.pointerRevision + 1 &&
    pointerVersionMatches(observed, preflight.currentPointer);
}

function exactConsumerReadbacks(
  values: readonly CommerceAuthorityConsumerReadback[],
  target: RuntimeBehaviorModePointer,
): boolean {
  if (values.length !== DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.length) return false;
  const byConsumer = new Map(values.map((value) => [value.consumer, value]));
  if (byConsumer.size !== values.length) return false;
  const salesAuthorityMode = target.version.salesAuthorityMode;
  const stateReadMode = target.version.stateReadMode;
  if (!pointerHasCanonicalContentHash(target) ||
      (salesAuthorityMode !== "LEGACY" && salesAuthorityMode !== "COMMERCE") ||
      (stateReadMode !== "LEGACY" && stateReadMode !== "V2")) {
    return false;
  }
  const authorityBundleHash = salesAuthorityMode === "COMMERCE"
    ? normalizedAuthorityBundleHash(target)
    : null;
  if ((salesAuthorityMode === "COMMERCE" &&
       authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash) ||
      (salesAuthorityMode === "LEGACY" && normalizedAuthorityBundleHash(target) !== null)) {
    return false;
  }
  return DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.every((consumer) => {
    const value = byConsumer.get(consumer);
    return value?.source === "DATABASE" &&
      value.modeVersionId === target.version.modeVersionId &&
      value.contentHash === target.version.contentHash &&
      value.pointerRevision === target.pointerRevision &&
      value.salesAuthorityMode === salesAuthorityMode &&
      value.stateReadMode === stateReadMode &&
      value.authorityBundleHash === authorityBundleHash;
  });
}

type LegacyConsumerConvergence = "EXACT" | "UNAVAILABLE" | "INCOMPLETE";

async function proveExactLegacyConsumerConvergence(input: Readonly<{
  ports: CommerceCutoverPorts;
  fenceToken: string;
  target: RuntimeBehaviorModePointer;
}>): Promise<LegacyConsumerConvergence> {
  if (!isSafeLegacyPointer(input.target)) return "INCOMPLETE";
  let readbacks: readonly CommerceAuthorityConsumerReadback[];
  try {
    readbacks = await input.ports.readConsumerAuthorities({
      fenceToken: input.fenceToken,
      consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
    });
  } catch {
    return "UNAVAILABLE";
  }
  return exactConsumerReadbacks(readbacks, input.target) ? "EXACT" : "INCOMPLETE";
}

function legacyConvergenceReasonCode(convergence: Exclude<LegacyConsumerConvergence, "EXACT">): string {
  return convergence === "UNAVAILABLE"
    ? "DF13_LEGACY_CONSUMER_READBACK_UNAVAILABLE"
    : "DF13_LEGACY_CONSUMER_READBACK_INCOMPLETE";
}

async function releaseAndReturn(
  ports: CommerceCutoverPorts,
  fenceToken: string,
  result: CommerceCutoverExecution,
): Promise<CommerceCutoverExecution> {
  try {
    await ports.releaseAuthorityDependentWork({ fenceToken });
    return result;
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: result.sideEffects,
      activationAcknowledgement: result.activationAcknowledgement,
      reasonCodes: [...result.reasonCodes, "DF13_FENCE_RELEASE_UNPROVEN"],
    };
  }
}

async function rollbackOrRetainHold(input: Readonly<{
  preflight: CommerceCutoverPreflightInput;
  ports: CommerceCutoverPorts;
  fenceToken: string;
  reasonCode: string;
  activationAcknowledgement: CommerceCutoverExecution["activationAcknowledgement"];
}>): Promise<CommerceCutoverExecution> {
  try {
    await input.ports.rollbackToLegacy({
      expectedPointerRevision: input.preflight.targetPointer.pointerRevision,
      targetLegacyVersionId: input.preflight.currentPointer.version.modeVersionId,
      targetLegacyContentHash: input.preflight.currentPointer.version.contentHash,
      fenceToken: input.fenceToken,
    });
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      activationAcknowledgement: input.activationAcknowledgement,
      reasonCodes: [input.reasonCode, "DF13_ROLLBACK_UNPROVEN"],
    };
  }
  let restoredPointer: RuntimeBehaviorModePointer | null;
  try {
    restoredPointer = await input.ports.readActivePointer();
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      activationAcknowledgement: input.activationAcknowledgement,
      reasonCodes: [input.reasonCode, "DF13_ROLLBACK_UNPROVEN"],
    };
  }
  if (!isRestoredLegacyPointer(restoredPointer, input.preflight)) {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      activationAcknowledgement: input.activationAcknowledgement,
      reasonCodes: [input.reasonCode, "DF13_ROLLBACK_UNPROVEN"],
    };
  }
  const convergence = await proveExactLegacyConsumerConvergence({
    ports: input.ports,
    fenceToken: input.fenceToken,
    target: restoredPointer,
  });
  if (convergence !== "EXACT") {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      activationAcknowledgement: input.activationAcknowledgement,
      reasonCodes: [input.reasonCode, legacyConvergenceReasonCode(convergence)],
    };
  }
  return releaseAndReturn(input.ports, input.fenceToken, {
    status: "LEGACY_RESTORED",
    sideEffects: "CONTROL_PLANE_ONLY",
    activationAcknowledgement: input.activationAcknowledgement,
    reasonCodes: [input.reasonCode],
  });
}

/**
 * This executor is deliberately unreferenced by the live worker. It is the
 * future owner-authorized cutover protocol, not an activation path. It has no
 * message, order, or customer side-effect capability: its only port is the
 * behavior control plane after the complete authority fence is held.
 */
export async function executeCommerceCutover(input: Readonly<{
  preflight: CommerceCutoverPreflightInput;
  ports: CommerceCutoverPorts;
}>): Promise<CommerceCutoverExecution> {
  let candidateBinding: Df13CandidateBindingValidation;
  try {
    const evidence = await input.ports.prepareReleaseCandidateEvidence(
      input.preflight.candidate,
    );
    candidateBinding = validateDf13ReleaseCandidateEvidence(
      evidence,
      input.preflight.candidate,
    );
  } catch {
    candidateBinding = {
      status: "MISMATCH",
      reasonCodes: ["DF13_GATE_E_CANDIDATE_REDERIVATION_UNAVAILABLE"],
    };
  }
  const preflight = assessCommerceCutoverPreflight(input.preflight, candidateBinding);
  if (preflight.status !== "PREPARED_NO_ACTIVATION") {
    return {
      status: "BLOCKED_LEGACY",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      reasonCodes: preflight.reasonCodes,
    };
  }
  const held = await input.ports.holdAuthorityDependentWork({
    pageId: input.preflight.pageId,
    channel: input.preflight.channel,
    consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  });
  if (held.status !== "HELD") {
    return {
      status: "BLOCKED_LEGACY",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      reasonCodes: ["DF13_AUTHORITY_FENCE_NOT_HELD"],
    };
  }
  let quiescence: Awaited<ReturnType<CommerceCutoverPorts["proveQuiescence"]>>;
  try {
    quiescence = await input.ports.proveQuiescence({ fenceToken: held.fenceToken });
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      reasonCodes: ["DF13_QUIESCENCE_UNPROVEN"],
    };
  }
  if (quiescence.status !== "QUIESCENT" ||
      quiescence.inFlightAuthorityDependentWork !== 0 ||
      quiescence.queuedWork === "UNCONTROLLED") {
    return releaseAndReturn(input.ports, held.fenceToken, {
      status: "BLOCKED_LEGACY",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      reasonCodes: ["DF13_QUIESCENCE_UNPROVEN"],
    });
  }
  let activationAcknowledgement: CommerceCutoverExecution["activationAcknowledgement"] = "ACKNOWLEDGED";
  let activation: Awaited<ReturnType<CommerceCutoverPorts["activateCommerce"]>>;
  try {
    activation = await input.ports.activateCommerce({
      expectedPointerRevision: input.preflight.currentPointer.pointerRevision,
      targetVersionId: input.preflight.targetPointer.version.modeVersionId,
      targetContentHash: input.preflight.targetPointer.version.contentHash,
      fenceToken: held.fenceToken,
    });
  } catch {
    activation = { status: "ACK_LOST" };
  }
  const casMismatch = activation.status === "CAS_MISMATCH";
  if (casMismatch) activationAcknowledgement = "CAS_REJECTED";
  if (activation.status === "ACK_LOST") activationAcknowledgement = "LOST_RECONCILED";
  let activatedPointer: RuntimeBehaviorModePointer | null;
  try {
    activatedPointer = await input.ports.readActivePointer();
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      activationAcknowledgement,
      reasonCodes: [
        ...(casMismatch ? ["DF13_POINTER_CAS_MISMATCH"] : []),
        "DF13_ACTIVATION_READBACK_AMBIGUOUS",
      ],
    };
  }
  if (!targetPointerMatches(activatedPointer, input.preflight.targetPointer)) {
    if (isPreCutoverLegacyPointer(activatedPointer, input.preflight)) {
      const convergence = await proveExactLegacyConsumerConvergence({
        ports: input.ports,
        fenceToken: held.fenceToken,
        target: activatedPointer,
      });
      if (convergence !== "EXACT") {
        return {
          status: "HOLD_RETAINED",
          sideEffects: "CONTROL_PLANE_ONLY",
          activationAcknowledgement,
          reasonCodes: [
            ...(casMismatch ? ["DF13_POINTER_CAS_MISMATCH"] : []),
            legacyConvergenceReasonCode(convergence),
          ],
        };
      }
      return releaseAndReturn(input.ports, held.fenceToken, {
        status: "BLOCKED_LEGACY",
        sideEffects: "CONTROL_PLANE_ONLY",
        activationAcknowledgement,
        reasonCodes: [
          ...(casMismatch ? ["DF13_POINTER_CAS_MISMATCH"] : []),
          "DF13_ACTIVATION_READBACK_MISMATCH",
        ],
      });
    }
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      activationAcknowledgement,
      reasonCodes: [
        ...(casMismatch ? ["DF13_POINTER_CAS_MISMATCH"] : []),
        "DF13_ACTIVATION_READBACK_AMBIGUOUS",
      ],
    };
  }
  let audit: "EXACT" | "MISSING" | "AMBIGUOUS";
  try {
    audit = await input.ports.readActivationAudit({
      pointerRevision: input.preflight.targetPointer.pointerRevision,
      modeVersionId: input.preflight.targetPointer.version.modeVersionId,
      contentHash: input.preflight.targetPointer.version.contentHash,
    });
  } catch {
    audit = "AMBIGUOUS";
  }
  if (audit !== "EXACT") {
    return rollbackOrRetainHold({
      preflight: input.preflight,
      ports: input.ports,
      fenceToken: held.fenceToken,
      reasonCode: "DF13_ACTIVATION_AUDIT_UNPROVEN",
      activationAcknowledgement,
    });
  }
  let readbacks: readonly CommerceAuthorityConsumerReadback[];
  try {
    readbacks = await input.ports.readConsumerAuthorities({
      fenceToken: held.fenceToken,
      consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
    });
  } catch {
    return rollbackOrRetainHold({
      preflight: input.preflight,
      ports: input.ports,
      fenceToken: held.fenceToken,
      reasonCode: "DF13_CONSUMER_READBACK_UNAVAILABLE",
      activationAcknowledgement,
    });
  }
  if (!exactConsumerReadbacks(readbacks, input.preflight.targetPointer)) {
    return rollbackOrRetainHold({
      preflight: input.preflight,
      ports: input.ports,
      fenceToken: held.fenceToken,
      reasonCode: "DF13_CONSUMER_READBACK_INCOMPLETE",
      activationAcknowledgement,
    });
  }
  return releaseAndReturn(input.ports, held.fenceToken, {
    status: "COMMERCE_ACTIVE",
    sideEffects: "CONTROL_PLANE_ONLY",
    activationAcknowledgement,
    reasonCodes: casMismatch ? ["DF13_POINTER_CAS_MISMATCH_RECONCILED"] : [],
  });
}

/** Re-entry after process crash/restart always reacquires the full fence first. */
export async function recoverCommerceCutoverAfterInterruption(input: Readonly<{
  preflight: CommerceCutoverPreflightInput;
  ports: CommerceCutoverPorts;
}>): Promise<CommerceCutoverExecution> {
  let candidateBinding: Df13CandidateBindingValidation;
  try {
    const evidence = await input.ports.prepareReleaseCandidateEvidence(
      input.preflight.candidate,
    );
    candidateBinding = validateDf13ReleaseCandidateEvidence(
      evidence,
      input.preflight.candidate,
    );
  } catch {
    candidateBinding = {
      status: "MISMATCH",
      reasonCodes: ["DF13_GATE_E_CANDIDATE_REDERIVATION_UNAVAILABLE"],
    };
  }
  const preflight = assessCommerceCutoverPreflight(input.preflight, candidateBinding);
  if (preflight.status !== "PREPARED_NO_ACTIVATION") {
    return {
      status: "BLOCKED_LEGACY",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      reasonCodes: preflight.reasonCodes,
    };
  }
  const held = await input.ports.holdAuthorityDependentWork({
    pageId: input.preflight.pageId,
    channel: input.preflight.channel,
    consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  });
  if (held.status !== "HELD") {
    return {
      status: "BLOCKED_LEGACY",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      reasonCodes: ["DF13_RECOVERY_FENCE_NOT_HELD"],
    };
  }
  let quiescence: Awaited<ReturnType<CommerceCutoverPorts["proveQuiescence"]>>;
  try {
    quiescence = await input.ports.proveQuiescence({ fenceToken: held.fenceToken });
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      reasonCodes: ["DF13_QUIESCENCE_UNPROVEN"],
    };
  }
  if (quiescence.status !== "QUIESCENT" ||
      quiescence.inFlightAuthorityDependentWork !== 0 ||
      quiescence.queuedWork === "UNCONTROLLED") {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      reasonCodes: ["DF13_QUIESCENCE_UNPROVEN"],
    };
  }
  let observed: RuntimeBehaviorModePointer | null;
  try {
    observed = await input.ports.readActivePointer();
  } catch {
    return {
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      activationAcknowledgement: "LOST_RECONCILED",
      reasonCodes: ["DF13_INTERRUPTED_CUTOVER_STATE_AMBIGUOUS"],
    };
  }
  if (isPreCutoverLegacyPointer(observed, input.preflight) ||
      isRestoredLegacyPointer(observed, input.preflight)) {
    const convergence = await proveExactLegacyConsumerConvergence({
      ports: input.ports,
      fenceToken: held.fenceToken,
      target: observed,
    });
    if (convergence !== "EXACT") {
      return {
        status: "HOLD_RETAINED",
        sideEffects: "NOT_EXECUTED",
        activationAcknowledgement: "NOT_ATTEMPTED",
        reasonCodes: [legacyConvergenceReasonCode(convergence)],
      };
    }
    return releaseAndReturn(input.ports, held.fenceToken, {
      status: "LEGACY_RESTORED",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      reasonCodes: ["DF13_INTERRUPTED_CUTOVER_ALREADY_LEGACY"],
    });
  }
  if (targetPointerMatches(observed, input.preflight.targetPointer)) {
    return rollbackOrRetainHold({
      preflight: input.preflight,
      ports: input.ports,
      fenceToken: held.fenceToken,
      reasonCode: "DF13_INTERRUPTED_CUTOVER_RECOVERED",
      activationAcknowledgement: "LOST_RECONCILED",
    });
  }
  return {
    status: "HOLD_RETAINED",
    sideEffects: "CONTROL_PLANE_ONLY",
    activationAcknowledgement: "LOST_RECONCILED",
    reasonCodes: ["DF13_INTERRUPTED_CUTOVER_STATE_AMBIGUOUS"],
  };
}
