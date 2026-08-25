import { describe, expect, it, vi } from "vitest";
import {
  createDf13FirstPreprodOperationProof,
  executeDf13FirstPreprodBehaviorPointerOperation,
  assessDf13FirstPreprodBehaviorPointerOperation,
  type Df13FirstPreprodBehaviorPointerWriterPort,
} from "./df13-first-preprod-behavior-writer.js";
import { createDf13FirstPreprodBehaviorPointerWriterPort } from "./df13-first-preprod-behavior-writer-port.js";
import { parseDf13FirstPreprodBehaviorPointerOperationJson } from "./df13-first-preprod-behavior-writer-cli.js";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import { runtimeBehaviorModeContentHash } from "@lana/database";

const pageId = "1198992073286645";
const channel = "MESSENGER";
const legacyPayload = {
  confirmationMode: "V2_ACTIVE" as const,
  salesAuthorityMode: "LEGACY" as const,
  stateReadMode: "LEGACY" as const,
  authorityBundleHash: null,
};
const commercePayload = {
  confirmationMode: "V2_ACTIVE" as const,
  salesAuthorityMode: "COMMERCE" as const,
  stateReadMode: "LEGACY" as const,
  authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
};
const legacy = {
  ...legacyPayload,
  pageId,
  channel,
  modeVersionId: "10000000-0000-4000-8000-000000000001",
  contentHash: runtimeBehaviorModeContentHash(legacyPayload),
  pointerRevision: 3,
};
const commerce = {
  ...commercePayload,
  pageId,
  channel,
  modeVersionId: "10000000-0000-4000-8000-000000000002",
  contentHash: runtimeBehaviorModeContentHash(commercePayload),
};

function proof(verifiedAt = new Date().toISOString()) {
  return createDf13FirstPreprodOperationProof({
    operationId: "10000000-0000-4000-8000-000000000010",
    pageId,
    channel,
    authorityConsumerServiceIds: ["realtime-worker"],
    admission: "SEALED",
    queuedEligibleWork: 0,
    inFlightEligibleWork: 0,
    unreconciledEligibleWork: 0,
    processState: "STOPPED",
    verifiedAt,
  });
}

function forwardOperation() {
  return {
    kind: "ACTIVATE_COMMERCE" as const,
    proof: proof(),
    expectedCurrent: legacy,
    target: commerce,
  };
}

describe("DF13 first-PREPROD behavior pointer writer", () => {
  it("admits only the exact stopped, drained-to-zero COMMERCE replacement", () => {
    expect(assessDf13FirstPreprodBehaviorPointerOperation(forwardOperation()))
      .toEqual({ status: "READY", kind: "ACTIVATE_COMMERCE" });
  });

  it("fails closed before any pointer read when work is not completely quiescent", async () => {
    const operation = forwardOperation();
    const port: Df13FirstPreprodBehaviorPointerWriterPort = {
      readCurrent: vi.fn(),
      activateExact: vi.fn(),
    };
    const result = await executeDf13FirstPreprodBehaviorPointerOperation({
      operation: {
        ...operation,
        proof: {
          ...operation.proof,
          inFlightEligibleWork: 1,
        },
      },
      port,
    });

    expect(result).toEqual({
      status: "BLOCKED",
      reasonCode: "DF13_FIRST_PREPROD_PROOF_HASH_MISMATCH",
    });
    expect(port.readCurrent).not.toHaveBeenCalled();
    expect(port.activateExact).not.toHaveBeenCalled();
  });

  it("rejects a stale sealed-and-stopped proof before any pointer read", () => {
    const operation = {
      ...forwardOperation(),
      proof: proof("2026-08-25T00:00:00.000Z"),
    };

    expect(assessDf13FirstPreprodBehaviorPointerOperation(
      operation,
      Date.parse("2026-08-25T00:15:00.001Z"),
    )).toEqual({
      status: "BLOCKED",
      reasonCode: "DF13_FIRST_PREPROD_ZERO_WORK_PROOF_STALE",
    });
  });

  it("writes only after exact durable LEGACY readback and records a non-generic forward audit", async () => {
    const operation = forwardOperation();
    const activated = {
      ...commerce,
      pointerRevision: 4,
      updatedBy: "DF13_FIRST_PREPROD_WRITER",
      reason: `DF13_FIRST_PREPROD_ACTIVATE:${operation.proof.operationId}`,
      updatedAt: "2026-08-25T00:01:00.000Z",
    };
    const port: Df13FirstPreprodBehaviorPointerWriterPort = {
      readCurrent: vi.fn(async () => ({
        ...legacy,
        updatedBy: "legacy-release",
        reason: "known-good",
        updatedAt: "2026-08-24T00:00:00.000Z",
      })),
      activateExact: vi.fn(async () => ({ status: "ACTIVATED" as const, pointer: activated })),
    };

    await expect(executeDf13FirstPreprodBehaviorPointerOperation({ operation, port }))
      .resolves.toEqual({ status: "ACTIVATED", pointer: activated });
    expect(port.activateExact).toHaveBeenCalledWith({
      kind: "ACTIVATE_COMMERCE",
      proof: operation.proof,
      expectedCurrent: legacy,
      target: commerce,
      actor: "DF13_FIRST_PREPROD_WRITER",
      reason: `DF13_FIRST_PREPROD_ACTIVATE:${operation.proof.operationId}`,
    });
  });

  it("does not replay a lost acknowledgement: exact target readback is reconciled without a second write", async () => {
    const operation = forwardOperation();
    const applied = {
      ...commerce,
      pointerRevision: 4,
      updatedBy: "DF13_FIRST_PREPROD_WRITER",
      reason: `DF13_FIRST_PREPROD_ACTIVATE:${operation.proof.operationId}`,
      updatedAt: "2026-08-25T00:01:00.000Z",
    };
    const port: Df13FirstPreprodBehaviorPointerWriterPort = {
      readCurrent: vi.fn(async () => applied),
      activateExact: vi.fn(),
    };

    await expect(executeDf13FirstPreprodBehaviorPointerOperation({ operation, port }))
      .resolves.toEqual({
        status: "ALREADY_APPLIED",
        pointer: applied,
      });
    expect(port.activateExact).not.toHaveBeenCalled();
  });

  it("does not mistake another operation's matching pointer for a lost acknowledgement", async () => {
    const operation = forwardOperation();
    const port: Df13FirstPreprodBehaviorPointerWriterPort = {
      readCurrent: vi.fn(async () => ({
        ...commerce,
        pointerRevision: 4,
        updatedBy: "another-writer",
        reason: "unrelated",
        updatedAt: "2026-08-25T00:01:00.000Z",
      })),
      activateExact: vi.fn(),
    };

    await expect(executeDf13FirstPreprodBehaviorPointerOperation({ operation, port }))
      .resolves.toEqual({
        status: "BLOCKED",
        reasonCode: "DF13_FIRST_PREPROD_ALREADY_APPLIED_AUDIT_MISMATCH",
      });
    expect(port.activateExact).not.toHaveBeenCalled();
  });

  it("allows rollback only to the captured exact LEGACY version at the next revision", async () => {
    const operation = {
      kind: "ROLLBACK_LEGACY" as const,
      proof: proof(),
      expectedCurrent: { ...commerce, pointerRevision: 4 },
      target: legacy,
    };
    expect(assessDf13FirstPreprodBehaviorPointerOperation(operation))
      .toEqual({ status: "READY", kind: "ROLLBACK_LEGACY" });

    const port: Df13FirstPreprodBehaviorPointerWriterPort = {
      readCurrent: vi.fn(async () => ({
        ...operation.expectedCurrent,
        updatedBy: "DF13_FIRST_PREPROD_WRITER",
        reason: `DF13_FIRST_PREPROD_ACTIVATE:${operation.proof.operationId}`,
        updatedAt: "2026-08-25T00:01:00.000Z",
      })),
      activateExact: vi.fn(async () => ({
        status: "ACTIVATED" as const,
        pointer: {
          ...legacy,
          pointerRevision: 5,
          updatedBy: "DF13_FIRST_PREPROD_WRITER",
          reason: `DF13_FIRST_PREPROD_ROLLBACK:${operation.proof.operationId}`,
          updatedAt: "2026-08-25T00:02:00.000Z",
        },
      })),
    };

    await expect(executeDf13FirstPreprodBehaviorPointerOperation({ operation, port }))
      .resolves.toMatchObject({
        status: "ACTIVATED",
        pointer: { modeVersionId: legacy.modeVersionId, pointerRevision: 5 },
      });
  });

  it("uses the dedicated database method rather than the generic behavior-mode CAS", async () => {
    const operation = forwardOperation();
    const activated = {
      ...commerce,
      pointerRevision: 4,
      updatedBy: "DF13_FIRST_PREPROD_WRITER",
      reason: `DF13_FIRST_PREPROD_ACTIVATE:${operation.proof.operationId}`,
      updatedAt: "2026-08-25T00:01:00.000Z",
    };
    const store = {
      loadActiveMode: vi.fn(async () => ({
        version: {
          ...legacy,
          schemaVersion: 1 as const,
          createdBy: "legacy-release",
          reason: "known-good",
          createdAt: "2026-08-24T00:00:00.000Z",
        },
        pointerRevision: legacy.pointerRevision,
        updatedBy: "legacy-release",
        reason: "known-good",
        updatedAt: "2026-08-24T00:00:00.000Z",
      })),
      activateDf13FirstPreprodExactPointer: vi.fn(async () => ({
        version: {
          ...commerce,
          schemaVersion: 1 as const,
          createdBy: "release-train",
          reason: "immutable-commerce-target",
          createdAt: "2026-08-25T00:00:00.000Z",
        },
        pointerRevision: activated.pointerRevision,
        updatedBy: activated.updatedBy,
        reason: activated.reason,
        updatedAt: activated.updatedAt,
      })),
    };
    const port = createDf13FirstPreprodBehaviorPointerWriterPort(store);

    await expect(executeDf13FirstPreprodBehaviorPointerOperation({ operation, port }))
      .resolves.toEqual({ status: "ACTIVATED", pointer: activated });
    expect(store.activateDf13FirstPreprodExactPointer).toHaveBeenCalledWith({
      pageId,
      channel,
      operation: "ACTIVATE_COMMERCE",
      expectedCurrent: {
        modeVersionId: legacy.modeVersionId,
        contentHash: legacy.contentHash,
        pointerRevision: legacy.pointerRevision,
      },
      target: {
        modeVersionId: commerce.modeVersionId,
        contentHash: commerce.contentHash,
      },
      proof: {
        verifiedAt: operation.proof.verifiedAt,
        proofHash: operation.proof.proofHash,
      },
      actor: "DF13_FIRST_PREPROD_WRITER",
      reason: activated.reason,
    });
  });

  it("rejects a generic or mismatched CLI operation before a database port exists", () => {
    expect(() => parseDf13FirstPreprodBehaviorPointerOperationJson(
      { ...forwardOperation(), kind: "ROLLBACK_LEGACY" },
      "ACTIVATE_COMMERCE",
    )).toThrow("DF13_FIRST_PREPROD_WRITER_OPERATION_KIND_INVALID");
  });
});
