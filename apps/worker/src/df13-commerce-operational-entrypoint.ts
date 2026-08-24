import { canonicalJsonV1 } from "@lana/contracts";
import {
  assessCommerceCutoverPreflight,
  executeCommerceCutover,
  recoverCommerceCutoverAfterInterruption,
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

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
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
 * The operational host must consume the operation identity in its durable
 * fence provider. A plain cutover port cannot be passed here accidentally:
 * this is what binds lost-ACK/replay reconciliation to the immutable command.
 */
export type Df13CommerceOperationalPorts = Omit<
  CommerceCutoverPorts,
  "holdAuthorityDependentWork"
> & Readonly<{
  holdAuthorityDependentWork(input: BaseFenceHoldInput & Readonly<{
    operationId: string;
    preCutover: Df13CommerceOperationalCommand["preflight"]["currentPointer"];
    target: Df13CommerceOperationalCommand["preflight"]["targetPointer"];
  }>): Promise<BaseFenceHoldResult>;
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
  return source as unknown as Df13ReleaseSourcePointer;
}

function parseMigrationReadiness(value: unknown): Df13CommerceOperationalCommand["migrationReadiness"] {
  const readiness = record(value);
  if (!readiness || !hasExactKeys(readiness, ["status", "evidenceSha256"]) ||
      readiness.status !== "DISPOSABLE_REHEARSAL_RECORDED" ||
      typeof readiness.evidenceSha256 !== "string" || !SHA256_PATTERN.test(readiness.evidenceSha256)) {
    throw new Error("DF13_OPERATIONAL_COMMAND_INVALID");
  }
  return readiness as Df13CommerceOperationalCommand["migrationReadiness"];
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
      typeof command.pageId !== "string" || typeof command.channel !== "string" ||
      record(command.preflight) === null) {
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
    preflight: command.preflight as CommerceCutoverPreflightInput,
    migrationReadiness: parseMigrationReadiness(command.migrationReadiness),
  });
}

function envelopeReason(command: Df13CommerceOperationalCommand): string | null {
  if (command.pageId !== DF13_COMMERCE_PREPROD_SCOPE_V1.pageId ||
      command.channel !== DF13_COMMERCE_PREPROD_SCOPE_V1.channel ||
      command.preflight.pageId !== command.pageId ||
      command.preflight.channel !== command.channel) {
    return "DF13_OPERATIONAL_SCOPE_INVALID";
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

function bindOperationToCutoverPorts(
  command: Df13CommerceOperationalCommand,
  ports: Df13CommerceOperationalPorts,
): CommerceCutoverPorts {
  return Object.freeze({
    ...ports,
    holdAuthorityDependentWork: (input: BaseFenceHoldInput) => ports.holdAuthorityDependentWork({
      ...input,
      operationId: command.operationId,
      preCutover: command.preflight.currentPointer,
      target: command.preflight.targetPointer,
    }),
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
    execution = command.operation === "ACTIVATE"
      ? await executeCommerceCutover({
        preflight: command.preflight,
        ports: bindOperationToCutoverPorts(command, input.ports),
      })
      : await recoverCommerceCutoverAfterInterruption({
        preflight: command.preflight,
        ports: bindOperationToCutoverPorts(command, input.ports),
      });
  } catch {
    return result({
      operation: command.operation,
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
