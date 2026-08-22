import { describe, expect, it } from "vitest";
import type { RuntimeBehaviorModePointer } from "@lana/chat-runtime";
import type { MissingCommerceSignal } from "./missing-commerce-signal.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  GATE_E_PREPROD_V15_BINDING,
  assessCommerceCutoverPreflight,
  executeCommerceCutover,
  recoverCommerceCutoverAfterInterruption,
  rederiveDf13CandidateBinding,
  validateDf13CandidateBinding,
  type CommerceCutoverPorts,
} from "./df13-commerce-cutover.js";

const pageId = "1198992073286645";

function pointer(
  salesAuthorityMode: "LEGACY" | "COMMERCE",
  pointerRevision: number,
): RuntimeBehaviorModePointer {
  const payload = {
    confirmationMode: "V2_ACTIVE" as const,
    salesAuthorityMode,
    stateReadMode: "LEGACY" as const,
    ...(salesAuthorityMode === "COMMERCE"
      ? { authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash }
      : { authorityBundleHash: null }),
  };
  return {
    version: {
      schemaVersion: 1,
      modeVersionId: `10000000-0000-4000-8000-${String(pointerRevision).padStart(12, "0")}`,
      pageId,
      channel: "MESSENGER",
      ...payload,
      contentHash: `sha256:${salesAuthorityMode.toLowerCase().padEnd(64, "0")}`,
      createdBy: "test-operator",
      reason: "test",
      createdAt: "2026-08-22T00:00:00.000Z",
    },
    pointerRevision,
    updatedBy: "test-operator",
    reason: "test",
    updatedAt: "2026-08-22T00:00:00.000Z",
  };
}

function readinessSignal(
  overrides: Partial<MissingCommerceSignal> = {},
): MissingCommerceSignal {
  return {
    contractVersion: "MISSING_COMMERCE_SIGNAL_V1",
    status: "COMMERCE_STATE_PRESENT",
    activeAuthority: "LEGACY",
    candidateAuthority: "COMMERCE",
    sideEffects: "DISABLED",
    futureCommerceDisposition: "SATISFIED",
    canonicalIntentFingerprint: "a".repeat(64),
    commerceContentFingerprint: "b".repeat(64),
    reasonCodes: ["COMMERCE_STATE_PRESENT"],
    ...overrides,
  };
}

function preflightInput() {
  const currentPointer = pointer("LEGACY", 5);
  const targetPointer = pointer("COMMERCE", 6);
  return {
    pageId,
    channel: "MESSENGER",
    currentPointer,
    targetPointer,
    candidate: {
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision:
        GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision: "a".repeat(40),
    },
    missingCommerceSignal: readinessSignal(),
    verification: {
      transitionMatrixPassed: true,
      bfDfReplayPassed: true,
      rollbackVerified: true,
    },
  } as const;
}

function exactReadbacks(target: RuntimeBehaviorModePointer) {
  const salesAuthorityMode = target.version.salesAuthorityMode === "COMMERCE"
    ? "COMMERCE" as const
    : "LEGACY" as const;
  const stateReadMode = target.version.stateReadMode === "V2"
    ? "V2" as const
    : "LEGACY" as const;
  return DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
    consumer,
    source: "DATABASE" as const,
    modeVersionId: target.version.modeVersionId,
    contentHash: target.version.contentHash,
    pointerRevision: target.pointerRevision,
    salesAuthorityMode,
    stateReadMode,
    authorityBundleHash: salesAuthorityMode === "COMMERCE"
      ? DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
      : null,
  }));
}

function ports(overrides: Partial<CommerceCutoverPorts> = {}): CommerceCutoverPorts {
  const target = pointer("COMMERCE", 6);
  const legacy = pointer("LEGACY", 7);
  return {
    async rederiveCandidateBinding() {
      return { status: "MATCHED", reasonCodes: [] };
    },
    async holdAuthorityDependentWork() {
      return { status: "HELD", fenceToken: "fence-1" };
    },
    async proveQuiescence() {
      return { status: "QUIESCENT", inFlightAuthorityDependentWork: 0, queuedWork: "HELD" };
    },
    async activateCommerce() {
      return { status: "ACKNOWLEDGED" };
    },
    async readActivePointer() {
      return target;
    },
    async readActivationAudit() {
      return "EXACT";
    },
    async readConsumerAuthorities() {
      return exactReadbacks(target);
    },
    async rollbackToLegacy() {
      return { status: "ACKNOWLEDGED" };
    },
    async releaseAuthorityDependentWork() {},
    ...overrides,
  };
}

describe("DF13 commerce cutover contract", () => {
  it("fails closed when the activation artifact cannot re-derive Gate E candidate content", async () => {
    await expect(rederiveDf13CandidateBinding({
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision:
        GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision: "a".repeat(40),
      git: {
        async readBlob() {
          throw new Error("artifact missing");
        },
        async resolveBlobOid() {
          throw new Error("artifact missing");
        },
      },
    })).resolves.toMatchObject({
      status: "MISMATCH",
      reasonCodes: ["DF13_GATE_E_CANDIDATE_REDERIVATION_UNAVAILABLE"],
      rederivedCandidateContentFingerprint: null,
    });
  });

  it("requires a re-derived exact Gate E fingerprint rather than a copied manifest hash", () => {
    expect(validateDf13CandidateBinding({
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision:
        GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision: "a".repeat(40),
      rederivedCandidateContentFingerprint: "f".repeat(64),
    })).toEqual({
      status: "MISMATCH",
      reasonCodes: ["DF13_GATE_E_CANDIDATE_FINGERPRINT_MISMATCH"],
    });
  });

  it("prepares only a coherent one-authority COMMERCE bundle", () => {
    expect(assessCommerceCutoverPreflight(preflightInput(), {
      status: "MATCHED",
      reasonCodes: [],
    })).toMatchObject({
      status: "PREPARED_NO_ACTIVATION",
      targetAuthority: "COMMERCE",
      currentAuthority: "LEGACY",
      sideEffects: "NOT_EXECUTED",
      authorityBundle: {
        phase: "COMMERCE_DERIVED",
        context: "CONTEXT_V2",
        reconciliation: "COMMERCE_FINAL",
        legacySalesStage: "DEMOTED_TELEMETRY_ONLY",
      },
    });
  });

  it("blocks a COMMERCE target whose persisted mode version omits the authority bundle identity", () => {
    const input = preflightInput();
    const targetPointer: RuntimeBehaviorModePointer = {
      ...input.targetPointer,
      version: {
        ...input.targetPointer.version,
        authorityBundleHash: null,
      },
    };

    expect(assessCommerceCutoverPreflight({ ...input, targetPointer }, {
      status: "MATCHED",
      reasonCodes: [],
    })).toMatchObject({
      status: "BLOCKED_LEGACY",
      reasonCodes: ["DF13_TARGET_AUTHORITY_INVALID"],
    });
  });

  it("blocks a copied Gate E fingerprint when the activation artifact cannot be re-derived", async () => {
    const input = preflightInput();
    let held = false;
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async rederiveCandidateBinding() {
          throw new Error("activation artifact unavailable");
        },
        async holdAuthorityDependentWork() {
          held = true;
          return { status: "HELD", fenceToken: "unexpected" };
        },
      }),
    });

    expect(result).toMatchObject({
      status: "BLOCKED_LEGACY",
      reasonCodes: ["DF13_GATE_E_CANDIDATE_REDERIVATION_UNAVAILABLE"],
    });
    expect(held).toBe(false);
  });

  it("fails closed before fencing when DF12 readiness is missing or unsafe", async () => {
    const calls: string[] = [];
    const input = {
      ...preflightInput(),
      missingCommerceSignal: readinessSignal({
        status: "MISSING_COMMERCE_STATE",
        futureCommerceDisposition: "BLOCK_COMMERCE_CUTOVER",
        commerceContentFingerprint: null,
        reasonCodes: ["MISSING_COMMERCE_STATE_FOR_COMMITTED_INTENT"],
      }),
    };
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async holdAuthorityDependentWork() {
          calls.push("hold");
          return { status: "HELD", fenceToken: "unexpected" };
        },
      }),
    });
    expect(result).toMatchObject({
      status: "BLOCKED_LEGACY",
      reasonCodes: ["DF13_MISSING_COMMERCE_SIGNAL_UNSATISFIED"],
    });
    expect(calls).toEqual([]);
  });

  it("fences every authority-dependent consumer, CAS-activates once, then releases only after exact readback", async () => {
    const events: string[] = [];
    const input = preflightInput();
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async holdAuthorityDependentWork(request) {
          events.push(`hold:${request.consumers.join(",")}`);
          return { status: "HELD", fenceToken: "fence-1" };
        },
        async proveQuiescence() {
          events.push("quiescent");
          return { status: "QUIESCENT", inFlightAuthorityDependentWork: 0, queuedWork: "HELD" };
        },
        async activateCommerce(request) {
          events.push(`activate:${request.expectedPointerRevision}`);
          return { status: "ACKNOWLEDGED" };
        },
        async readConsumerAuthorities() {
          events.push("readback");
          return exactReadbacks(input.targetPointer);
        },
        async releaseAuthorityDependentWork() {
          events.push("release");
        },
      }),
    });
    expect(result).toMatchObject({ status: "COMMERCE_ACTIVE", sideEffects: "CONTROL_PLANE_ONLY" });
    expect(events).toEqual([
      `hold:${DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.join(",")}`,
      "quiescent",
      "activate:5",
      "readback",
      "release",
    ]);
  });

  it("does not replay a lost activation acknowledgement when exact pointer readback proves COMMERCE", async () => {
    let activations = 0;
    const input = preflightInput();
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async activateCommerce() {
          activations += 1;
          return { status: "ACK_LOST" };
        },
        async readActivePointer() {
          return input.targetPointer;
        },
      }),
    });
    expect(result).toMatchObject({ status: "COMMERCE_ACTIVE", activationAcknowledgement: "LOST_RECONCILED" });
    expect(activations).toBe(1);
  });

  it("reconciles a thrown activation acknowledgement by readback before releasing the fence", async () => {
    const input = preflightInput();
    let activations = 0;
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async activateCommerce() {
          activations += 1;
          throw new Error("connection reset after CAS");
        },
        async readActivePointer() {
          return input.targetPointer;
        },
      }),
    });
    expect(result).toMatchObject({ status: "COMMERCE_ACTIVE", activationAcknowledgement: "LOST_RECONCILED" });
    expect(activations).toBe(1);
  });

  it("retains the fence on CAS mismatch until the observed authority is reconciled", async () => {
    const input = preflightInput();
    let released = false;
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async activateCommerce() {
          return { status: "CAS_MISMATCH" };
        },
        async readActivePointer() {
          return pointer("COMMERCE", 99);
        },
        async releaseAuthorityDependentWork() {
          released = true;
        },
      }),
    });
    expect(result).toMatchObject({
      status: "HOLD_RETAINED",
      reasonCodes: ["DF13_POINTER_CAS_MISMATCH", "DF13_ACTIVATION_READBACK_AMBIGUOUS"],
    });
    expect(released).toBe(false);
  });

  it("releases after CAS mismatch only when every consumer has converged on observed LEGACY", async () => {
    const input = preflightInput();
    const legacy = pointer("LEGACY", 6);
    let readbacks = 0;
    let released = false;
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async activateCommerce() {
          return { status: "CAS_MISMATCH" };
        },
        async readActivePointer() {
          return legacy;
        },
        async readConsumerAuthorities() {
          readbacks += 1;
          return exactReadbacks(legacy);
        },
        async releaseAuthorityDependentWork() {
          released = true;
        },
      }),
    });

    expect(result).toMatchObject({
      status: "BLOCKED_LEGACY",
      activationAcknowledgement: "CAS_REJECTED",
      reasonCodes: ["DF13_POINTER_CAS_MISMATCH", "DF13_ACTIVATION_READBACK_MISMATCH"],
    });
    expect(readbacks).toBe(1);
    expect(released).toBe(true);
  });

  it("rolls back and keeps LEGACY when any consumer readback is stale", async () => {
    const input = preflightInput();
    const legacy = pointer("LEGACY", 7);
    let reads = 0;
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async readActivePointer() {
          reads += 1;
          return reads === 1 ? input.targetPointer : legacy;
        },
        async readConsumerAuthorities() {
          return [{ ...exactReadbacks(input.targetPointer)[0]!, source: "CACHE" as const }];
        },
      }),
    });
    expect(result).toMatchObject({
      status: "LEGACY_RESTORED",
      reasonCodes: ["DF13_CONSUMER_READBACK_INCOMPLETE"],
    });
  });

  it("rolls back when the CAS activation lacks its append-only audit record", async () => {
    const input = preflightInput();
    const legacy = pointer("LEGACY", 7);
    let reads = 0;
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async readActivePointer() {
          reads += 1;
          return reads === 1 ? input.targetPointer : legacy;
        },
        async readActivationAudit() {
          return "MISSING";
        },
      }),
    });
    expect(result).toMatchObject({
      status: "LEGACY_RESTORED",
      reasonCodes: ["DF13_ACTIVATION_AUDIT_UNPROVEN"],
    });
  });

  it("retains the fence on rollback ambiguity instead of releasing mixed authority work", async () => {
    const input = preflightInput();
    let released = false;
    const result = await executeCommerceCutover({
      preflight: input,
      ports: ports({
        async readConsumerAuthorities() {
          return [];
        },
        async rollbackToLegacy() {
          return { status: "ACK_LOST" };
        },
        async releaseAuthorityDependentWork() {
          released = true;
        },
      }),
    });
    expect(result).toMatchObject({
      status: "HOLD_RETAINED",
      reasonCodes: ["DF13_CONSUMER_READBACK_INCOMPLETE", "DF13_ROLLBACK_UNPROVEN"],
    });
    expect(released).toBe(false);
  });

  it("recovers an interrupted COMMERCE cutover by reacquiring the fence and restoring LEGACY", async () => {
    const input = preflightInput();
    const legacy = pointer("LEGACY", 7);
    let reads = 0;
    const result = await recoverCommerceCutoverAfterInterruption({
      preflight: input,
      ports: ports({
        async readActivePointer() {
          reads += 1;
          return reads === 1 ? input.targetPointer : legacy;
        },
      }),
    });
    expect(result).toMatchObject({
      status: "LEGACY_RESTORED",
      reasonCodes: ["DF13_INTERRUPTED_CUTOVER_RECOVERED"],
    });
  });
});
