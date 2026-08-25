import { createHash } from "node:crypto";
import {
  DF13_FIRST_PREPROD_MAX_ZERO_WORK_PROOF_AGE_MS,
  runtimeBehaviorModeContentHash,
} from "@lana/database";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

type Df13ConfirmationMode = "LEGACY" | "V2_SHADOW" | "V2_ACTIVE" | "CLARIFY_ONLY";
type Df13SalesAuthorityMode = "LEGACY" | "COMMERCE";

export interface Df13FirstPreprodBehaviorVersionIdentity {
  readonly pageId: string;
  readonly channel: string;
  readonly modeVersionId: string;
  readonly confirmationMode: Df13ConfirmationMode;
  readonly salesAuthorityMode: Df13SalesAuthorityMode;
  readonly stateReadMode: "LEGACY";
  readonly authorityBundleHash: string | null;
  readonly contentHash: string;
}

export interface Df13FirstPreprodBehaviorPointerIdentity
extends Df13FirstPreprodBehaviorVersionIdentity {
  readonly pointerRevision: number;
}

export interface Df13FirstPreprodOperationProof {
  readonly schemaVersion: 1;
  readonly operationId: string;
  readonly pageId: string;
  readonly channel: string;
  readonly authorityConsumerServiceIds: readonly ["realtime-worker"];
  readonly admission: "SEALED";
  readonly queuedEligibleWork: number;
  readonly inFlightEligibleWork: number;
  readonly unreconciledEligibleWork: number;
  readonly processState: "STOPPED";
  readonly verifiedAt: string;
  readonly proofHash: string;
}

export type Df13FirstPreprodBehaviorPointerOperation =
  | Readonly<{
    kind: "ACTIVATE_COMMERCE";
    proof: Df13FirstPreprodOperationProof;
    expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity;
    target: Df13FirstPreprodBehaviorVersionIdentity;
  }>
  | Readonly<{
    kind: "ROLLBACK_LEGACY";
    proof: Df13FirstPreprodOperationProof;
    expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity;
    target: Df13FirstPreprodBehaviorVersionIdentity;
  }>;

export interface Df13FirstPreprodBehaviorPointerRecord
extends Df13FirstPreprodBehaviorPointerIdentity {
  readonly updatedBy: string;
  readonly reason: string;
  readonly updatedAt: string;
}

export interface Df13FirstPreprodBehaviorPointerWriterPort {
  readCurrent(): Promise<Df13FirstPreprodBehaviorPointerRecord | null>;
  activateExact(input: Readonly<{
    kind: Df13FirstPreprodBehaviorPointerOperation["kind"];
    proof: Df13FirstPreprodOperationProof;
    expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity;
    target: Df13FirstPreprodBehaviorVersionIdentity;
    actor: "DF13_FIRST_PREPROD_WRITER";
    reason: string;
  }>): Promise<Readonly<{
    status: "ACTIVATED";
    pointer: Df13FirstPreprodBehaviorPointerRecord;
  }>>;
}

export type Df13FirstPreprodBehaviorPointerAssessment =
  | Readonly<{ status: "READY"; kind: Df13FirstPreprodBehaviorPointerOperation["kind"] }>
  | Readonly<{ status: "BLOCKED"; reasonCode: string }>;

export type Df13FirstPreprodBehaviorPointerOperationResult =
  | Readonly<{ status: "ACTIVATED"; pointer: Df13FirstPreprodBehaviorPointerRecord }>
  | Readonly<{ status: "ALREADY_APPLIED"; pointer: Df13FirstPreprodBehaviorPointerRecord }>
  | Readonly<{ status: "BLOCKED"; reasonCode: string }>;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(",")}}`;
}

function proofProjection(input: Omit<Df13FirstPreprodOperationProof, "proofHash">): Omit<Df13FirstPreprodOperationProof, "proofHash"> {
  return {
    schemaVersion: 1,
    operationId: input.operationId,
    pageId: input.pageId,
    channel: input.channel,
    authorityConsumerServiceIds: [...input.authorityConsumerServiceIds] as ["realtime-worker"],
    admission: input.admission,
    queuedEligibleWork: input.queuedEligibleWork,
    inFlightEligibleWork: input.inFlightEligibleWork,
    unreconciledEligibleWork: input.unreconciledEligibleWork,
    processState: input.processState,
    verifiedAt: input.verifiedAt,
  };
}

function proofHash(input: Omit<Df13FirstPreprodOperationProof, "proofHash">): string {
  return createHash("sha256")
    .update(canonicalJson(proofProjection(input)), "utf8")
    .digest("hex");
}

export function createDf13FirstPreprodOperationProof(
  input: Omit<Df13FirstPreprodOperationProof, "schemaVersion" | "proofHash">,
): Df13FirstPreprodOperationProof {
  const projected = {
    schemaVersion: 1 as const,
    ...input,
  };
  return Object.freeze({
    ...proofProjection(projected),
    proofHash: proofHash(projected),
  });
}

function hasExactScope(identity: Pick<Df13FirstPreprodBehaviorVersionIdentity, "pageId" | "channel">): boolean {
  return identity.pageId === DF13_COMMERCE_PREPROD_SCOPE_V1.pageId &&
    identity.channel === DF13_COMMERCE_PREPROD_SCOPE_V1.channel;
}

function hasCanonicalIdentity(identity: Df13FirstPreprodBehaviorVersionIdentity): boolean {
  if (!hasExactScope(identity) || !UUID_V4_PATTERN.test(identity.modeVersionId)) return false;
  if (identity.stateReadMode !== "LEGACY") return false;
  if (identity.salesAuthorityMode === "LEGACY" && identity.authorityBundleHash !== null) return false;
  if (
    identity.salesAuthorityMode === "COMMERCE" &&
    identity.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
  ) return false;
  return identity.contentHash === runtimeBehaviorModeContentHash({
    confirmationMode: identity.confirmationMode,
    salesAuthorityMode: identity.salesAuthorityMode,
    stateReadMode: identity.stateReadMode,
    authorityBundleHash: identity.authorityBundleHash,
  });
}

function hasCanonicalPointer(identity: Df13FirstPreprodBehaviorPointerIdentity): boolean {
  return hasCanonicalIdentity(identity) &&
    Number.isSafeInteger(identity.pointerRevision) && identity.pointerRevision >= 1;
}

function sameVersion(
  left: Df13FirstPreprodBehaviorVersionIdentity,
  right: Df13FirstPreprodBehaviorVersionIdentity,
): boolean {
  return left.pageId === right.pageId &&
    left.channel === right.channel &&
    left.modeVersionId === right.modeVersionId &&
    left.confirmationMode === right.confirmationMode &&
    left.salesAuthorityMode === right.salesAuthorityMode &&
    left.stateReadMode === right.stateReadMode &&
    left.authorityBundleHash === right.authorityBundleHash &&
    left.contentHash === right.contentHash;
}

function samePointer(
  left: Df13FirstPreprodBehaviorPointerIdentity,
  right: Df13FirstPreprodBehaviorPointerIdentity,
): boolean {
  return sameVersion(left, right) && left.pointerRevision === right.pointerRevision;
}

function proofReason(proof: Df13FirstPreprodOperationProof, nowMs: number): string | null {
  const expectedHash = proofHash(proof);
  if (!SHA256_PATTERN.test(proof.proofHash) || proof.proofHash !== expectedHash) {
    return "DF13_FIRST_PREPROD_PROOF_HASH_MISMATCH";
  }
  if (
    proof.schemaVersion !== 1 ||
    !UUID_V4_PATTERN.test(proof.operationId) ||
    !hasExactScope(proof) ||
    proof.authorityConsumerServiceIds.length !== 1 ||
    proof.authorityConsumerServiceIds[0] !== "realtime-worker" ||
    proof.admission !== "SEALED" ||
    proof.processState !== "STOPPED" ||
    proof.queuedEligibleWork !== 0 ||
    proof.inFlightEligibleWork !== 0 ||
    proof.unreconciledEligibleWork !== 0 ||
    !Number.isFinite(Date.parse(proof.verifiedAt))
  ) {
    return "DF13_FIRST_PREPROD_ZERO_WORK_PROOF_INVALID";
  }
  const verifiedAtMs = Date.parse(proof.verifiedAt);
  if (
    !Number.isFinite(nowMs) ||
    verifiedAtMs > nowMs ||
    nowMs - verifiedAtMs > DF13_FIRST_PREPROD_MAX_ZERO_WORK_PROOF_AGE_MS
  ) {
    return "DF13_FIRST_PREPROD_ZERO_WORK_PROOF_STALE";
  }
  return null;
}

export function assessDf13FirstPreprodBehaviorPointerOperation(
  operation: Df13FirstPreprodBehaviorPointerOperation,
  nowMs = Date.now(),
): Df13FirstPreprodBehaviorPointerAssessment {
  const proofFailure = proofReason(operation.proof, nowMs);
  if (proofFailure !== null) return Object.freeze({ status: "BLOCKED" as const, reasonCode: proofFailure });
  if (!hasCanonicalPointer(operation.expectedCurrent) || !hasCanonicalIdentity(operation.target)) {
    return Object.freeze({ status: "BLOCKED" as const, reasonCode: "DF13_FIRST_PREPROD_POINTER_IDENTITY_INVALID" });
  }
  if (operation.kind === "ACTIVATE_COMMERCE") {
    if (
      operation.expectedCurrent.salesAuthorityMode !== "LEGACY" ||
      operation.target.salesAuthorityMode !== "COMMERCE"
    ) {
      return Object.freeze({ status: "BLOCKED" as const, reasonCode: "DF13_FIRST_PREPROD_FORWARD_IDENTITY_INVALID" });
    }
  } else if (
    operation.expectedCurrent.salesAuthorityMode !== "COMMERCE" ||
    operation.target.salesAuthorityMode !== "LEGACY"
  ) {
    return Object.freeze({ status: "BLOCKED" as const, reasonCode: "DF13_FIRST_PREPROD_ROLLBACK_IDENTITY_INVALID" });
  }
  return Object.freeze({ status: "READY" as const, kind: operation.kind });
}

function operationReason(operation: Df13FirstPreprodBehaviorPointerOperation): string {
  return operation.kind === "ACTIVATE_COMMERCE"
    ? `DF13_FIRST_PREPROD_ACTIVATE:${operation.proof.operationId}`
    : `DF13_FIRST_PREPROD_ROLLBACK:${operation.proof.operationId}`;
}

function isExpectedTargetPointer(
  pointer: Df13FirstPreprodBehaviorPointerIdentity,
  operation: Df13FirstPreprodBehaviorPointerOperation,
): boolean {
  return sameVersion(pointer, operation.target) &&
    pointer.pointerRevision === operation.expectedCurrent.pointerRevision + 1;
}

export async function executeDf13FirstPreprodBehaviorPointerOperation(input: Readonly<{
  operation: Df13FirstPreprodBehaviorPointerOperation;
  port: Df13FirstPreprodBehaviorPointerWriterPort;
}>): Promise<Df13FirstPreprodBehaviorPointerOperationResult> {
  const assessment = assessDf13FirstPreprodBehaviorPointerOperation(input.operation);
  if (assessment.status === "BLOCKED") return assessment;

  const current = await input.port.readCurrent();
  if (current !== null && isExpectedTargetPointer(current, input.operation)) {
    if (
      current.updatedBy !== "DF13_FIRST_PREPROD_WRITER" ||
      current.reason !== operationReason(input.operation)
    ) {
      return Object.freeze({
        status: "BLOCKED" as const,
        reasonCode: "DF13_FIRST_PREPROD_ALREADY_APPLIED_AUDIT_MISMATCH",
      });
    }
    return Object.freeze({ status: "ALREADY_APPLIED" as const, pointer: current });
  }
  if (current === null || !samePointer(current, input.operation.expectedCurrent)) {
    return Object.freeze({ status: "BLOCKED" as const, reasonCode: "DF13_FIRST_PREPROD_CURRENT_POINTER_MISMATCH" });
  }
  const activation = await input.port.activateExact({
    kind: input.operation.kind,
    proof: input.operation.proof,
    expectedCurrent: input.operation.expectedCurrent,
    target: input.operation.target,
    actor: "DF13_FIRST_PREPROD_WRITER",
    reason: operationReason(input.operation),
  });
  if (!isExpectedTargetPointer(activation.pointer, input.operation)) {
    return Object.freeze({ status: "BLOCKED" as const, reasonCode: "DF13_FIRST_PREPROD_WRITE_READBACK_MISMATCH" });
  }
  return activation;
}
