import { canonicalJsonV1 } from "@lana/contracts";
import {
  behaviorModeContentHash,
  type RuntimeBehaviorModePointer,
} from "@lana/chat-runtime";
import type { Df13CommerceCutoverFenceLease, Df13CommerceCutoverFencePort } from "@lana/database";
import {
  assessCommerceCutoverPreflight,
  executeCommerceCutover,
  recoverCommerceCutoverAfterInterruption,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  type CommerceCutoverExecution,
  type CommerceCutoverPorts,
  type CommerceCutoverPreflightInput,
} from "./df13-commerce-cutover.js";
import { GATE_E_PREPROD_V15_BINDING } from "./df13-gate-e-binding.js";
import {
  prepareDf13ReleaseCandidateEvidence,
  validateDf13ReleaseCandidateEvidence,
  type Df13ReleaseCandidateEvidence,
} from "./df13-release-candidate-evidence.js";
import {
  type Df13ReleaseSourcePointer,
} from "./df13-commerce-preprod-startup-authority.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";
import type { MissingCommerceSignal } from "./missing-commerce-signal.js";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const CONTENT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const OPERATIONAL_OPERATIONS = ["PREPARE", "ACTIVATE", "RECONCILE", "ROLLBACK"] as const;
type Df13CommerceOperationalOperation = typeof OPERATIONAL_OPERATIONS[number];

export type Df13CommerceOperationalCommand = Readonly<{
  schemaVersion: 1;
  contractVersion: "DF13_COMMERCE_OPERATIONAL_ENTRYPOINT_V1";
  operation: Df13CommerceOperationalOperation;
  operationId: string;
  pageId: string;
  channel: string;
  releaseSource: Df13ReleaseSourcePointer;
  preflight: CommerceCutoverPreflightInput;
  migrationReadiness: Readonly<{
    status: "DISPOSABLE_REHEARSAL_RECORDED";
    evidenceSha256: string;
  }>;
}>;

type BaseFenceHoldInput = Parameters<CommerceCutoverPorts["holdAuthorityDependentWork"]>[0];
type BaseFenceHoldResult = Awaited<ReturnType<CommerceCutoverPorts["holdAuthorityDependentWork"]>>;

/**
 * Real operational composition. The durable fence is the persisted operation
 * record; the ordinary authority-work hold remains the worker quiescence
 * fence. They are acquired and released as one adapter, never as a copied ID
 * passed to a test-only wrapper.
 */
export type Df13CommerceOperationalPorts = Omit<
  CommerceCutoverPorts,
  "holdAuthorityDependentWork" | "releaseAuthorityDependentWork"
> & Readonly<{
  readonly durableCutoverFence: Df13CommerceCutoverFencePort;
  holdAuthorityDependentWork(input: BaseFenceHoldInput): Promise<BaseFenceHoldResult>;
  releaseAuthorityDependentWork(input: Parameters<CommerceCutoverPorts["releaseAuthorityDependentWork"]>[0]): Promise<void>;
  /** Reads the create-once source pointer from the release host. */
  readReleaseSource(): Promise<Df13ReleaseSourcePointer | null>;
  verifyMigrationReadiness(input: Readonly<{
    releaseRevision: string;
    evidenceSha256: string;
    sourceArtifacts: Df13ReleaseCandidateEvidence["migration"]["artifacts"];
  }>): Promise<"EXACT" | "MISSING" | "MISMATCH">;
}>;

export type Df13CommerceOperationalEntrypointResult = Readonly<{
  schemaVersion: 1;
  contractVersion: "DF13_COMMERCE_OPERATIONAL_ENTRYPOINT_V1";
  operation: Df13CommerceOperationalOperation | "INVALID";
  operationId: string | null;
  status: "PREPARED_NO_ACTIVATION" | "BLOCKED" | CommerceCutoverExecution["status"];
  sideEffects: "NOT_EXECUTED" | CommerceCutoverExecution["sideEffects"];
  activationAcknowledgement: "NOT_ATTEMPTED" | CommerceCutoverExecution["activationAcknowledgement"];
  pageId: string | null;
  channel: string | null;
  release: Readonly<{
    revision: string | null;
    treeOid: string | null;
    sourceEvidenceHash: string | null;
  }>;
  migrationReadiness: "UNVERIFIED" | "VERIFIED_DISPOSABLE_REHEARSAL";
  reasonCodes: readonly string[];
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cloneJson(value: unknown): unknown {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
    return JSON.parse(serialized) as unknown;
  } catch {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.length === Object.keys(value).length && keys.every((key) => Object.hasOwn(value, key));
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return Object.freeze(value);
}

function parseReleaseSource(value: unknown): Df13ReleaseSourcePointer {
  const source = record(value);
  if (!source || !hasExactKeys(source, ["schemaVersion", "release", "repository", "tag", "commit", "createdAt"]) ||
      source.schemaVersion !== 1 ||
      source.repository !== "https://github.com/nguyentuanson27-netizen/lanchatbot" ||
      typeof source.release !== "string" || !source.release.trim() ||
      typeof source.tag !== "string" || source.tag !== source.release ||
      typeof source.commit !== "string" || !COMMIT_PATTERN.test(source.commit) ||
      typeof source.createdAt !== "string" || !Number.isFinite(Date.parse(source.createdAt))) {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
  return {
    schemaVersion: 1,
    release: source.release,
    repository: "https://github.com/nguyentuanson27-netizen/lanchatbot",
    tag: source.tag,
    commit: source.commit,
    createdAt: source.createdAt,
  };
}

function parseMigrationReadiness(value: unknown): Df13CommerceOperationalCommand["migrationReadiness"] {
  const readiness = record(value);
  if (!readiness || !hasExactKeys(readiness, ["status", "evidenceSha256"]) ||
      readiness.status !== "DISPOSABLE_REHEARSAL_RECORDED" ||
      typeof readiness.evidenceSha256 !== "string" || !SHA256_PATTERN.test(readiness.evidenceSha256)) {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
  return {
    status: "DISPOSABLE_REHEARSAL_RECORDED",
    evidenceSha256: readiness.evidenceSha256,
  };
}

function nonEmptyBoundedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512;
}

function parsePointer(value: unknown): RuntimeBehaviorModePointer {
  const pointer = record(value);
  const version = pointer === null ? null : record(pointer.version);
  const pointerRevision = pointer?.pointerRevision;
  if (!pointer || !version ||
      !hasExactKeys(pointer, ["version", "pointerRevision", "updatedBy", "reason", "updatedAt"]) ||
      !hasExactKeys(version, [
        "schemaVersion", "modeVersionId", "pageId", "channel", "confirmationMode",
        "salesAuthorityMode", "stateReadMode", "authorityBundleHash", "contentHash",
        "createdBy", "reason", "createdAt",
      ]) ||
      version.schemaVersion !== 1 ||
      typeof version.modeVersionId !== "string" || !UUID_V4_PATTERN.test(version.modeVersionId) ||
      !nonEmptyBoundedString(version.pageId) || !nonEmptyBoundedString(version.channel) ||
      !["LEGACY", "V2_SHADOW", "V2_ACTIVE", "CLARIFY_ONLY"].includes(String(version.confirmationMode)) ||
      !["LEGACY", "SHADOW", "COMMERCE"].includes(String(version.salesAuthorityMode)) ||
      !["LEGACY", "SHADOW", "V2"].includes(String(version.stateReadMode)) ||
      (version.authorityBundleHash !== null &&
       (typeof version.authorityBundleHash !== "string" || !SHA256_PATTERN.test(version.authorityBundleHash))) ||
      typeof version.contentHash !== "string" || !CONTENT_HASH_PATTERN.test(version.contentHash) ||
      !nonEmptyBoundedString(version.createdBy) || !nonEmptyBoundedString(version.reason) ||
      typeof version.createdAt !== "string" || !Number.isFinite(Date.parse(version.createdAt)) ||
      typeof pointerRevision !== "number" || !Number.isSafeInteger(pointerRevision) || pointerRevision < 1 ||
      !nonEmptyBoundedString(pointer.updatedBy) || !nonEmptyBoundedString(pointer.reason) ||
      typeof pointer.updatedAt !== "string" || !Number.isFinite(Date.parse(pointer.updatedAt))) {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
  const parsed: RuntimeBehaviorModePointer = {
    version: {
      schemaVersion: 1,
      modeVersionId: version.modeVersionId.toLowerCase(),
      pageId: version.pageId,
      channel: version.channel,
      confirmationMode: version.confirmationMode as RuntimeBehaviorModePointer["version"]["confirmationMode"],
      salesAuthorityMode: version.salesAuthorityMode as RuntimeBehaviorModePointer["version"]["salesAuthorityMode"],
      stateReadMode: version.stateReadMode as RuntimeBehaviorModePointer["version"]["stateReadMode"],
      authorityBundleHash: version.authorityBundleHash,
      contentHash: version.contentHash,
      createdBy: version.createdBy,
      reason: version.reason,
      createdAt: version.createdAt,
    },
    pointerRevision,
    updatedBy: pointer.updatedBy,
    reason: pointer.reason,
    updatedAt: pointer.updatedAt,
  };
  if (behaviorModeContentHash(parsed.version) !== parsed.version.contentHash) {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
  return parsed;
}

function parseCandidate(value: unknown): CommerceCutoverPreflightInput["candidate"] {
  const candidate = record(value);
  if (!candidate || !hasExactKeys(candidate, [
    "gateEManifestHash", "gateECandidateSourceRevision", "activationReleaseRevision",
  ]) ||
      typeof candidate.gateEManifestHash !== "string" || !SHA256_PATTERN.test(candidate.gateEManifestHash) ||
      typeof candidate.gateECandidateSourceRevision !== "string" || !COMMIT_PATTERN.test(candidate.gateECandidateSourceRevision) ||
      typeof candidate.activationReleaseRevision !== "string" || !COMMIT_PATTERN.test(candidate.activationReleaseRevision)) {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
  return {
    gateEManifestHash: candidate.gateEManifestHash,
    gateECandidateSourceRevision: candidate.gateECandidateSourceRevision,
    activationReleaseRevision: candidate.activationReleaseRevision,
  };
}

function parseMissingCommerceSignal(value: unknown): MissingCommerceSignal {
  const signal = record(value);
  const reasonCodes = signal === null || !Array.isArray(signal.reasonCodes) ? null : signal.reasonCodes;
  if (!signal || !hasExactKeys(signal, [
    "contractVersion", "status", "activeAuthority", "candidateAuthority", "sideEffects",
    "futureCommerceDisposition", "canonicalIntentFingerprint", "commerceContentFingerprint", "reasonCodes",
  ]) || signal.contractVersion !== "MISSING_COMMERCE_SIGNAL_V1" ||
      ![
        "DISABLED", "INVALID_CANONICAL_INTENT", "NOT_COMMITTED", "INVALID_COMMERCE_STATE",
        "STALE_COMMERCE_STATE", "UNVERIFIABLE_COMMERCE_PRODUCT_BINDING", "COMMERCE_STATE_PRESENT",
        "MISSING_COMMERCE_STATE",
      ].includes(String(signal.status)) ||
      signal.activeAuthority !== "LEGACY" || signal.candidateAuthority !== "COMMERCE" ||
      signal.sideEffects !== "DISABLED" ||
      !["NOT_EVALUATED", "NOT_REQUIRED", "SATISFIED", "BLOCK_COMMERCE_CUTOVER"].includes(String(signal.futureCommerceDisposition)) ||
      (signal.canonicalIntentFingerprint !== null &&
       (typeof signal.canonicalIntentFingerprint !== "string" || !SHA256_PATTERN.test(signal.canonicalIntentFingerprint))) ||
      (signal.commerceContentFingerprint !== null &&
       (typeof signal.commerceContentFingerprint !== "string" || !SHA256_PATTERN.test(signal.commerceContentFingerprint))) ||
      reasonCodes === null || reasonCodes.some((reasonCode) => !nonEmptyBoundedString(reasonCode))) {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
  return {
    contractVersion: "MISSING_COMMERCE_SIGNAL_V1",
    status: signal.status as MissingCommerceSignal["status"],
    activeAuthority: "LEGACY",
    candidateAuthority: "COMMERCE",
    sideEffects: "DISABLED",
    futureCommerceDisposition: signal.futureCommerceDisposition as MissingCommerceSignal["futureCommerceDisposition"],
    canonicalIntentFingerprint: signal.canonicalIntentFingerprint,
    commerceContentFingerprint: signal.commerceContentFingerprint,
    reasonCodes: reasonCodes as MissingCommerceSignal["reasonCodes"],
  };
}

function parsePreflight(value: unknown): CommerceCutoverPreflightInput {
  const preflight = record(value);
  const verification = preflight === null ? null : record(preflight.verification);
  if (!preflight || !verification || !hasExactKeys(preflight, [
    "pageId", "channel", "currentPointer", "targetPointer", "candidate", "missingCommerceSignal", "verification",
  ]) || !hasExactKeys(verification, ["transitionMatrixPassed", "bfDfReplayPassed", "rollbackVerified"]) ||
      !nonEmptyBoundedString(preflight.pageId) || !nonEmptyBoundedString(preflight.channel) ||
      typeof verification.transitionMatrixPassed !== "boolean" ||
      typeof verification.bfDfReplayPassed !== "boolean" ||
      typeof verification.rollbackVerified !== "boolean") {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
  return {
    pageId: preflight.pageId,
    channel: preflight.channel,
    currentPointer: parsePointer(preflight.currentPointer),
    targetPointer: parsePointer(preflight.targetPointer),
    candidate: parseCandidate(preflight.candidate),
    missingCommerceSignal: parseMissingCommerceSignal(preflight.missingCommerceSignal),
    verification: {
      transitionMatrixPassed: verification.transitionMatrixPassed,
      bfDfReplayPassed: verification.bfDfReplayPassed,
      rollbackVerified: verification.rollbackVerified,
    },
  };
}

/**
 * Parses a bounded, file-safe command envelope. There is intentionally no
 * generic LEGACY operation: activate/reconcile/rollback can only flow through
 * the typed DF13 cutover contracts and the exact pre-cutover pointer.
 */
export function parseDf13CommerceOperationalCommand(value: unknown): Df13CommerceOperationalCommand {
  const command = record(cloneJson(value));
  if (!command || !hasExactKeys(command, [
    "schemaVersion", "contractVersion", "operation", "operationId", "pageId", "channel",
    "releaseSource", "preflight", "migrationReadiness",
  ]) || command.schemaVersion !== 1 ||
      command.contractVersion !== "DF13_COMMERCE_OPERATIONAL_ENTRYPOINT_V1" ||
      typeof command.operation !== "string" ||
      !OPERATIONAL_OPERATIONS.includes(command.operation as Df13CommerceOperationalOperation) ||
      typeof command.operationId !== "string" || !UUID_V4_PATTERN.test(command.operationId) ||
      !nonEmptyBoundedString(command.pageId) || !nonEmptyBoundedString(command.channel)) {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
  return deepFreeze({
    schemaVersion: 1 as const,
    contractVersion: "DF13_COMMERCE_OPERATIONAL_ENTRYPOINT_V1" as const,
    operation: command.operation as Df13CommerceOperationalOperation,
    operationId: command.operationId.toLowerCase(),
    pageId: command.pageId,
    channel: command.channel,
    releaseSource: parseReleaseSource(command.releaseSource),
    preflight: parsePreflight(command.preflight),
    migrationReadiness: parseMigrationReadiness(command.migrationReadiness),
  });
}

function envelopeReason(command: Df13CommerceOperationalCommand): string | null {
  if (command.pageId !== DF13_COMMERCE_PREPROD_SCOPE_V1.pageId ||
      command.channel !== DF13_COMMERCE_PREPROD_SCOPE_V1.channel ||
      command.preflight.pageId !== command.pageId ||
      command.preflight.channel !== command.channel ||
      command.preflight.currentPointer.version.pageId !== command.pageId ||
      command.preflight.currentPointer.version.channel !== command.channel ||
      command.preflight.targetPointer.version.pageId !== command.pageId ||
      command.preflight.targetPointer.version.channel !== command.channel) {
    return "DF13_OPERATIONAL_SCOPE_INVALID";
  }
  if (command.preflight.currentPointer.version.salesAuthorityMode !== "LEGACY" ||
      command.preflight.currentPointer.version.stateReadMode !== "LEGACY" ||
      command.preflight.currentPointer.version.authorityBundleHash !== null ||
      command.preflight.targetPointer.version.salesAuthorityMode !== "COMMERCE" ||
      command.preflight.targetPointer.version.stateReadMode !== "LEGACY" ||
      command.preflight.targetPointer.version.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash ||
      command.preflight.targetPointer.version.confirmationMode !==
        command.preflight.currentPointer.version.confirmationMode) {
    return "DF13_OPERATIONAL_POINTER_AUTHORITY_INVALID";
  }
  if (command.releaseSource.commit !== command.preflight.candidate.activationReleaseRevision) {
    return "DF13_OPERATIONAL_RELEASE_SOURCE_MISMATCH";
  }
  if (command.preflight.currentPointer.pointerRevision < 1 ||
      command.preflight.targetPointer.pointerRevision !== command.preflight.currentPointer.pointerRevision + 1) {
    return "DF13_OPERATIONAL_POINTER_ENVELOPE_INVALID";
  }
  return null;
}

function result(input: Omit<Df13CommerceOperationalEntrypointResult, "schemaVersion" | "contractVersion">): Df13CommerceOperationalEntrypointResult {
  return Object.freeze({
    schemaVersion: 1,
    contractVersion: "DF13_COMMERCE_OPERATIONAL_ENTRYPOINT_V1",
    ...input,
    reasonCodes: Object.freeze([...input.reasonCodes]),
    release: Object.freeze({ ...input.release }),
  });
}

function blocked(command: Df13CommerceOperationalCommand | null, reasonCodes: readonly string[]): Df13CommerceOperationalEntrypointResult {
  return result({
    operation: command?.operation ?? "INVALID",
    operationId: command?.operationId ?? null,
    status: "BLOCKED",
    sideEffects: "NOT_EXECUTED",
    activationAcknowledgement: "NOT_ATTEMPTED",
    pageId: command?.pageId ?? null,
    channel: command?.channel ?? null,
    release: {
      revision: command?.releaseSource.commit ?? null,
      treeOid: null,
      sourceEvidenceHash: null,
    },
    migrationReadiness: "UNVERIFIED",
    reasonCodes,
  });
}

function releaseSourceMatches(
  command: Df13CommerceOperationalCommand,
  evidence: Df13ReleaseCandidateEvidence,
): boolean {
  return evidence.activationReleaseRevision === command.releaseSource.commit &&
    evidence.activationReleaseRevision === command.preflight.candidate.activationReleaseRevision &&
    evidence.releaseSource.resolvedRevision === command.releaseSource.commit &&
    COMMIT_PATTERN.test(command.releaseSource.commit);
}

function sameReleaseSource(
  left: Df13ReleaseSourcePointer,
  right: Df13ReleaseSourcePointer,
): boolean {
  return left.schemaVersion === right.schemaVersion &&
    left.release === right.release &&
    left.repository === right.repository &&
    left.tag === right.tag &&
    left.commit === right.commit &&
    left.createdAt === right.createdAt;
}

async function releaseSourceReadbackReason(
  command: Df13CommerceOperationalCommand,
  ports: Df13CommerceOperationalPorts,
): Promise<string | null> {
  try {
    const observed = await ports.readReleaseSource();
    if (observed === null || !sameReleaseSource(command.releaseSource, parseReleaseSource(observed))) {
      return "DF13_OPERATIONAL_RELEASE_SOURCE_MISMATCH";
    }
    return null;
  } catch {
    return "DF13_OPERATIONAL_RELEASE_SOURCE_UNAVAILABLE";
  }
}

function durableFenceRequest(command: Df13CommerceOperationalCommand) {
  const authorityBundleHash = command.preflight.targetPointer.version.authorityBundleHash;
  if (typeof authorityBundleHash !== "string") {
    throw new Error("DF13_OPERATIONAL_POINTER_AUTHORITY_INVALID");
  }
  return {
    operationId: command.operationId,
    pageId: command.pageId,
    channel: command.channel,
    preCutover: {
      modeVersionId: command.preflight.currentPointer.version.modeVersionId,
      contentHash: command.preflight.currentPointer.version.contentHash,
      pointerRevision: command.preflight.currentPointer.pointerRevision,
    },
    target: {
      modeVersionId: command.preflight.targetPointer.version.modeVersionId,
      contentHash: command.preflight.targetPointer.version.contentHash,
      authorityBundleHash,
    },
  } as const;
}

/**
 * Production adapter for the durable cutover row and the worker quiescence
 * hold. The durable store receives the operation ID and all pointer identities
 * directly; it is not a caller-provided correlation field.
 */
function bindOperationToCutoverPorts(
  command: Df13CommerceOperationalCommand,
  ports: Df13CommerceOperationalPorts,
): CommerceCutoverPorts {
  const durableLeases = new Map<string, Df13CommerceCutoverFenceLease>();
  return Object.freeze({
    ...ports,
    async holdAuthorityDependentWork(input: BaseFenceHoldInput): Promise<BaseFenceHoldResult> {
      const durable = await ports.durableCutoverFence.acquire(durableFenceRequest(command));
      if (durable.status !== "HELD") {
        return {
          status: "REJECTED",
          reasonCode: durable.status === "HELD_RECONCILE_REQUIRED"
            ? "DF13_OPERATIONAL_DURABLE_FENCE_RECONCILIATION_REQUIRED"
            : durable.status === "ALREADY_RELEASED"
              ? "DF13_OPERATIONAL_DURABLE_FENCE_REPLAY_REJECTED"
              : durable.reasonCode,
        };
      }
      let held: BaseFenceHoldResult;
      try {
        held = await ports.holdAuthorityDependentWork(input);
      } catch (error) {
        const release = await ports.durableCutoverFence.release(durable.lease);
        if (release.status !== "RELEASED") throw new Error("DF13_OPERATIONAL_DURABLE_FENCE_RELEASE_UNPROVEN", { cause: error });
        throw error;
      }
      if (held.status !== "HELD") {
        const release = await ports.durableCutoverFence.release(durable.lease);
        if (release.status !== "RELEASED") throw new Error("DF13_OPERATIONAL_DURABLE_FENCE_RELEASE_UNPROVEN");
        return held;
      }
      durableLeases.set(held.fenceToken, durable.lease);
      return held;
    },
    async releaseAuthorityDependentWork(input: Parameters<CommerceCutoverPorts["releaseAuthorityDependentWork"]>[0]): Promise<void> {
      const durableLease = durableLeases.get(input.fenceToken);
      if (durableLease === undefined) throw new Error("DF13_OPERATIONAL_DURABLE_FENCE_LEASE_MISSING");
      await ports.releaseAuthorityDependentWork(input);
      const released = await ports.durableCutoverFence.release(durableLease);
      if (released.status !== "RELEASED") throw new Error("DF13_OPERATIONAL_DURABLE_FENCE_RELEASE_UNPROVEN");
      durableLeases.delete(input.fenceToken);
    },
  });
}

async function migrationReadinessReason(
  command: Df13CommerceOperationalCommand,
  evidence: Df13ReleaseCandidateEvidence,
  ports: Df13CommerceOperationalPorts,
): Promise<string | null> {
  try {
    const status = await ports.verifyMigrationReadiness({
      releaseRevision: command.releaseSource.commit,
      evidenceSha256: command.migrationReadiness.evidenceSha256,
      sourceArtifacts: evidence.migration.artifacts,
    });
    return status === "EXACT"
      ? null
      : status === "MISSING"
        ? "DF13_OPERATIONAL_MIGRATION_READINESS_MISSING"
        : "DF13_OPERATIONAL_MIGRATION_READINESS_MISMATCH";
  } catch {
    return "DF13_OPERATIONAL_MIGRATION_READINESS_UNAVAILABLE";
  }
}

/** A canonical line suitable for a redacted operator evidence artifact. */
export function serializeDf13CommerceOperationalEntrypointResult(
  value: Df13CommerceOperationalEntrypointResult,
): string {
  return canonicalJsonV1(value);
}

/**
 * One typed source boundary for all future DF13 operator actions. It first
 * re-derives release evidence, then only delegates an action to the existing
 * cutover/recovery contracts. The function has no message, model, or generic
 * behavior-mode operator capability.
 */
export async function runDf13CommerceOperationalEntrypoint(input: Readonly<{
  command: unknown;
  ports: Df13CommerceOperationalPorts;
}>): Promise<Df13CommerceOperationalEntrypointResult> {
  let command: Df13CommerceOperationalCommand;
  try {
    command = parseDf13CommerceOperationalCommand(input.command);
  } catch {
    return blocked(null, ["DF13_OPERATIONAL_COMMAND_INVALID"]);
  }
  let envelope: string | null;
  try {
    envelope = envelopeReason(command);
  } catch {
    return blocked(command, ["DF13_OPERATIONAL_PREFLIGHT_INVALID"]);
  }
  if (envelope !== null) return blocked(command, [envelope]);

  // Recovery is deliberately independent of forward-release evidence and the
  // disposable migration rehearsal. A crash or lost ACK must never make the
  // exact LEGACY restoration path unavailable. The immutable command envelope
  // and durable operation fence still remain mandatory.
  if (command.operation === "RECONCILE" || command.operation === "ROLLBACK") {
    let execution: CommerceCutoverExecution;
    try {
      execution = await recoverCommerceCutoverAfterInterruption({
        preflight: command.preflight,
        ports: bindOperationToCutoverPorts(command, input.ports),
      });
    } catch {
      return result({
        operation: command.operation,
        operationId: command.operationId,
        status: "HOLD_RETAINED",
        sideEffects: "CONTROL_PLANE_ONLY",
        activationAcknowledgement: "LOST_RECONCILED",
        pageId: command.pageId,
        channel: command.channel,
        release: { revision: command.releaseSource.commit, treeOid: null, sourceEvidenceHash: null },
        migrationReadiness: "UNVERIFIED",
        reasonCodes: ["DF13_OPERATIONAL_EXECUTION_UNAVAILABLE"],
      });
    }
    return result({
      operation: command.operation,
      operationId: command.operationId,
      status: execution.status,
      sideEffects: execution.sideEffects,
      activationAcknowledgement: execution.activationAcknowledgement,
      pageId: command.pageId,
      channel: command.channel,
      release: { revision: command.releaseSource.commit, treeOid: null, sourceEvidenceHash: null },
      migrationReadiness: "UNVERIFIED",
      reasonCodes: execution.reasonCodes,
    });
  }

  const releaseSourceReason = await releaseSourceReadbackReason(command, input.ports);
  if (releaseSourceReason !== null) return blocked(command, [releaseSourceReason]);

  let evidence: Df13ReleaseCandidateEvidence;
  try {
    evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: command.releaseSource.commit,
      git: input.ports.releaseCandidateSource,
    });
  } catch {
    return blocked(command, ["DF13_OPERATIONAL_RELEASE_EVIDENCE_UNAVAILABLE"]);
  }
  const evidenceValidation = validateDf13ReleaseCandidateEvidence(evidence, {
    activationReleaseRevision: command.releaseSource.commit,
    gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
    gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
  });
  if (evidence.status !== "SOURCE_READY_NO_ACTIVATION" ||
      evidenceValidation.status !== "MATCHED" ||
      !releaseSourceMatches(command, evidence)) {
    return blocked(command, [
      ...(evidenceValidation.status === "MISMATCH" ? evidenceValidation.reasonCodes : []),
      ...(!releaseSourceMatches(command, evidence) ? ["DF13_OPERATIONAL_RELEASE_SOURCE_MISMATCH"] : []),
      ...(evidence.status !== "SOURCE_READY_NO_ACTIVATION" ? ["DF13_OPERATIONAL_RELEASE_EVIDENCE_INVALID"] : []),
    ]);
  }
  const migrationReason = await migrationReadinessReason(command, evidence, input.ports);
  if (migrationReason !== null) return blocked(command, [migrationReason]);
  let preflight: ReturnType<typeof assessCommerceCutoverPreflight>;
  try {
    preflight = assessCommerceCutoverPreflight(command.preflight, evidenceValidation);
  } catch {
    return blocked(command, ["DF13_OPERATIONAL_PREFLIGHT_INVALID"]);
  }
  const release = {
    revision: command.releaseSource.commit,
    treeOid: evidence.releaseSource.treeOid,
    sourceEvidenceHash: evidence.evidenceHash,
  };
  if (preflight.status !== "PREPARED_NO_ACTIVATION") {
    return result({
      operation: command.operation,
      operationId: command.operationId,
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      pageId: command.pageId,
      channel: command.channel,
      release,
      migrationReadiness: "VERIFIED_DISPOSABLE_REHEARSAL",
      reasonCodes: preflight.reasonCodes,
    });
  }
  if (command.operation === "PREPARE") {
    return result({
      operation: command.operation,
      operationId: command.operationId,
      status: "PREPARED_NO_ACTIVATION",
      sideEffects: "NOT_EXECUTED",
      activationAcknowledgement: "NOT_ATTEMPTED",
      pageId: command.pageId,
      channel: command.channel,
      release,
      migrationReadiness: "VERIFIED_DISPOSABLE_REHEARSAL",
      reasonCodes: [],
    });
  }
  let execution: CommerceCutoverExecution;
  try {
    execution = await executeCommerceCutover({
      preflight: command.preflight,
      ports: bindOperationToCutoverPorts(command, input.ports),
    });
  } catch {
    return result({
      operation: command.operation,
      operationId: command.operationId,
      status: "HOLD_RETAINED",
      sideEffects: "CONTROL_PLANE_ONLY",
      activationAcknowledgement: "LOST_RECONCILED",
      pageId: command.pageId,
      channel: command.channel,
      release,
      migrationReadiness: "VERIFIED_DISPOSABLE_REHEARSAL",
      reasonCodes: ["DF13_OPERATIONAL_EXECUTION_UNAVAILABLE"],
    });
  }
  return result({
    operation: command.operation,
    operationId: command.operationId,
    status: execution.status,
    sideEffects: execution.sideEffects,
    activationAcknowledgement: execution.activationAcknowledgement,
    pageId: command.pageId,
    channel: command.channel,
    release,
    migrationReadiness: "VERIFIED_DISPOSABLE_REHEARSAL",
    reasonCodes: execution.reasonCodes,
  });
}
