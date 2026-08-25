import { runtimeBehaviorModeContentHash } from "@lana/database";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import {
  assessDf13FirstPreprodBehaviorPointerOperation,
  type Df13FirstPreprodBehaviorPointerIdentity,
  type Df13FirstPreprodBehaviorPointerRecord,
  type Df13FirstPreprodBehaviorVersionIdentity,
  type Df13FirstPreprodOperationProof,
} from "./df13-first-preprod-behavior-writer.js";

const PREPARATION_SENTINEL_VERSION_ID = "00000000-0000-4000-8000-000000000001";

export interface Df13FirstPreprodCommerceVersionPreparerPort {
  readCurrent(): Promise<Df13FirstPreprodBehaviorPointerRecord | null>;
  prepareExact(input: Readonly<{
    expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity;
    proof: Df13FirstPreprodOperationProof;
    target: Readonly<{
      confirmationMode: Df13FirstPreprodBehaviorVersionIdentity["confirmationMode"];
      salesAuthorityMode: "COMMERCE";
      stateReadMode: "LEGACY";
      authorityBundleHash: string;
      contentHash: string;
    }>;
    actor: "DF13_FIRST_PREPROD_WRITER";
    reason: string;
  }>): Promise<Df13FirstPreprodBehaviorVersionIdentity>;
}

export type Df13FirstPreprodCommerceVersionPreparationResult =
  | Readonly<{ status: "PREPARED"; version: Df13FirstPreprodBehaviorVersionIdentity }>
  | Readonly<{ status: "BLOCKED"; reasonCode: string }>;

function samePointer(
  left: Df13FirstPreprodBehaviorPointerIdentity,
  right: Df13FirstPreprodBehaviorPointerIdentity,
): boolean {
  return left.pageId === right.pageId &&
    left.channel === right.channel &&
    left.modeVersionId === right.modeVersionId &&
    left.confirmationMode === right.confirmationMode &&
    left.salesAuthorityMode === right.salesAuthorityMode &&
    left.stateReadMode === right.stateReadMode &&
    left.authorityBundleHash === right.authorityBundleHash &&
    left.contentHash === right.contentHash &&
    left.pointerRevision === right.pointerRevision;
}

function targetFor(
  current: Df13FirstPreprodBehaviorPointerIdentity,
) {
  const target = {
    confirmationMode: current.confirmationMode,
    salesAuthorityMode: "COMMERCE" as const,
    stateReadMode: "LEGACY" as const,
    authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
  };
  return Object.freeze({
    ...target,
    contentHash: runtimeBehaviorModeContentHash(target),
  });
}

function assessmentReason(input: Readonly<{
  proof: Df13FirstPreprodOperationProof;
  expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity;
}>): string | null {
  const target = targetFor(input.expectedCurrent);
  const assessment = assessDf13FirstPreprodBehaviorPointerOperation({
    kind: "ACTIVATE_COMMERCE",
    proof: input.proof,
    expectedCurrent: input.expectedCurrent,
    target: { ...target, pageId: input.expectedCurrent.pageId, channel: input.expectedCurrent.channel,
      modeVersionId: PREPARATION_SENTINEL_VERSION_ID },
  });
  return assessment.status === "BLOCKED" ? assessment.reasonCode : null;
}

function versionMatchesTarget(
  version: Df13FirstPreprodBehaviorVersionIdentity,
  expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity,
): boolean {
  const target = targetFor(expectedCurrent);
  return version.pageId === expectedCurrent.pageId &&
    version.channel === expectedCurrent.channel &&
    version.confirmationMode === target.confirmationMode &&
    version.salesAuthorityMode === target.salesAuthorityMode &&
    version.stateReadMode === target.stateReadMode &&
    version.authorityBundleHash === target.authorityBundleHash &&
    version.contentHash === target.contentHash;
}

/**
 * Creates the immutable first-PREPROD COMMERCE version after a stopped,
 * zero-work proof, but never changes the active pointer. Activation remains
 * the separately narrow writer operation.
 */
export async function executeDf13FirstPreprodCommerceVersionPreparation(input: Readonly<{
  proof: Df13FirstPreprodOperationProof;
  expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity;
  port: Df13FirstPreprodCommerceVersionPreparerPort;
}>): Promise<Df13FirstPreprodCommerceVersionPreparationResult> {
  const reason = assessmentReason(input);
  if (reason !== null) return Object.freeze({ status: "BLOCKED" as const, reasonCode: reason });

  const current = await input.port.readCurrent();
  if (current === null || !samePointer(current, input.expectedCurrent)) {
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: "DF13_FIRST_PREPROD_CURRENT_POINTER_MISMATCH",
    });
  }
  const target = targetFor(input.expectedCurrent);
  let version: Df13FirstPreprodBehaviorVersionIdentity;
  try {
    version = await input.port.prepareExact({
      expectedCurrent: input.expectedCurrent,
      proof: input.proof,
      target,
      actor: "DF13_FIRST_PREPROD_WRITER",
      reason: `DF13_FIRST_PREPROD_PREPARE:${input.proof.operationId}`,
    });
  } catch {
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: "DF13_FIRST_PREPROD_PREPARATION_UNAVAILABLE",
    });
  }
  if (!versionMatchesTarget(version, input.expectedCurrent)) {
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: "DF13_FIRST_PREPROD_PREPARED_VERSION_MISMATCH",
    });
  }
  return Object.freeze({ status: "PREPARED" as const, version });
}
