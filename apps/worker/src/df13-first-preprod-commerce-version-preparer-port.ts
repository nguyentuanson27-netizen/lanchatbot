import type {
  Df13FirstPreprodCommerceVersionPreparationInput,
  RuntimeBehaviorModePointerRecord,
  RuntimeBehaviorModeVersionRecord,
} from "@lana/database";
import type {
  Df13FirstPreprodBehaviorPointerRecord,
  Df13FirstPreprodBehaviorVersionIdentity,
} from "./df13-first-preprod-behavior-writer.js";
import type { Df13FirstPreprodCommerceVersionPreparerPort } from "./df13-first-preprod-commerce-version-preparer.js";

export interface Df13FirstPreprodCommerceVersionStorePort {
  loadActiveMode(input: Readonly<{
    pageId: string;
    channel: string;
  }>): Promise<RuntimeBehaviorModePointerRecord | null>;
  prepareDf13FirstPreprodCommerceVersion(
    input: Df13FirstPreprodCommerceVersionPreparationInput,
  ): Promise<RuntimeBehaviorModeVersionRecord>;
}

function versionIdentity(
  version: RuntimeBehaviorModeVersionRecord,
): Df13FirstPreprodBehaviorVersionIdentity {
  if (
    (version.salesAuthorityMode !== "LEGACY" && version.salesAuthorityMode !== "COMMERCE") ||
    version.stateReadMode !== "LEGACY"
  ) {
    throw new Error("DF13_FIRST_PREPROD_PREPARER_VERSION_DIMENSION_INVALID");
  }
  return Object.freeze({
    pageId: version.pageId,
    channel: version.channel,
    modeVersionId: version.modeVersionId,
    confirmationMode: version.confirmationMode,
    salesAuthorityMode: version.salesAuthorityMode,
    stateReadMode: version.stateReadMode,
    authorityBundleHash: version.authorityBundleHash ?? null,
    contentHash: version.contentHash,
  });
}

function pointerIdentity(
  pointer: RuntimeBehaviorModePointerRecord,
): Df13FirstPreprodBehaviorPointerRecord {
  return Object.freeze({
    ...versionIdentity(pointer.version),
    pointerRevision: pointer.pointerRevision,
    updatedBy: pointer.updatedBy,
    reason: pointer.reason,
    updatedAt: pointer.updatedAt,
  });
}

/**
 * Limits version preparation to the one first-PREPROD scope and the database
 * operation that cannot move a behavior pointer. Generic version creation is
 * intentionally not part of this port.
 */
export function createDf13FirstPreprodCommerceVersionPreparerPort(
  store: Df13FirstPreprodCommerceVersionStorePort,
): Df13FirstPreprodCommerceVersionPreparerPort {
  return Object.freeze({
    async readCurrent() {
      const pointer = await store.loadActiveMode({
        pageId: "1198992073286645",
        channel: "MESSENGER",
      });
      return pointer === null ? null : pointerIdentity(pointer);
    },
    async prepareExact(input: Parameters<Df13FirstPreprodCommerceVersionPreparerPort["prepareExact"]>[0]) {
      return versionIdentity(await store.prepareDf13FirstPreprodCommerceVersion({
        pageId: "1198992073286645",
        channel: "MESSENGER",
        expectedCurrent: {
          modeVersionId: input.expectedCurrent.modeVersionId,
          contentHash: input.expectedCurrent.contentHash,
          pointerRevision: input.expectedCurrent.pointerRevision,
        },
        proof: {
          verifiedAt: input.proof.verifiedAt,
          proofHash: input.proof.proofHash,
        },
        actor: input.actor,
        reason: input.reason,
      }));
    },
  });
}
