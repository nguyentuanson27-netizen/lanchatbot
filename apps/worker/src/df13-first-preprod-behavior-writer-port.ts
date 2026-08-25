import type {
  Df13FirstPreprodExactPointerActivationInput,
  RuntimeBehaviorModePointerRecord,
} from "@lana/database";
import type {
  Df13FirstPreprodBehaviorPointerRecord,
  Df13FirstPreprodBehaviorPointerWriterPort,
} from "./df13-first-preprod-behavior-writer.js";

export interface Df13FirstPreprodBehaviorModeStorePort {
  loadActiveMode(input: Readonly<{
    pageId: string;
    channel: string;
  }>): Promise<RuntimeBehaviorModePointerRecord | null>;
  activateDf13FirstPreprodExactPointer(
    input: Df13FirstPreprodExactPointerActivationInput,
  ): Promise<RuntimeBehaviorModePointerRecord>;
}

function pointerIdentity(
  pointer: RuntimeBehaviorModePointerRecord,
): Df13FirstPreprodBehaviorPointerRecord {
  return Object.freeze({
    pageId: pointer.version.pageId,
    channel: pointer.version.channel,
    modeVersionId: pointer.version.modeVersionId,
    confirmationMode: pointer.version.confirmationMode,
    salesAuthorityMode: pointer.version.salesAuthorityMode,
    stateReadMode: pointer.version.stateReadMode,
    authorityBundleHash: pointer.version.authorityBundleHash ?? null,
    contentHash: pointer.version.contentHash,
    pointerRevision: pointer.pointerRevision,
    updatedBy: pointer.updatedBy,
    reason: pointer.reason,
    updatedAt: pointer.updatedAt,
  } as Df13FirstPreprodBehaviorPointerRecord);
}

/**
 * Adapts only the non-generic database writer. The generic behavior-mode CAS
 * is deliberately absent from this port so a first-PREPROD operation cannot
 * downgrade into a broad COMMERCE operator.
 */
export function createDf13FirstPreprodBehaviorPointerWriterPort(
  store: Df13FirstPreprodBehaviorModeStorePort,
): Df13FirstPreprodBehaviorPointerWriterPort {
  return Object.freeze({
    async readCurrent() {
      const pointer = await store.loadActiveMode({
        pageId: "1198992073286645",
        channel: "MESSENGER",
      });
      return pointer === null ? null : pointerIdentity(pointer);
    },
    async activateExact(
      input: Parameters<Df13FirstPreprodBehaviorPointerWriterPort["activateExact"]>[0],
    ) {
      const pointer = await store.activateDf13FirstPreprodExactPointer({
        pageId: input.expectedCurrent.pageId,
        channel: input.expectedCurrent.channel,
        operation: input.kind,
        expectedCurrent: {
          modeVersionId: input.expectedCurrent.modeVersionId,
          contentHash: input.expectedCurrent.contentHash,
          pointerRevision: input.expectedCurrent.pointerRevision,
        },
        target: {
          modeVersionId: input.target.modeVersionId,
          contentHash: input.target.contentHash,
        },
        actor: input.actor,
        reason: input.reason,
      });
      return Object.freeze({
        status: "ACTIVATED" as const,
        pointer: pointerIdentity(pointer),
      });
    },
  });
}
