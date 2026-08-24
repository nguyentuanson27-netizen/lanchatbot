import { describe, expect, it } from "vitest";
import type { RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import { selectDf13RuntimeAuthority } from "./df13-runtime-authority-boundary.js";

function resolution(overrides: Partial<RuntimeBehaviorModeResolution> = {}): RuntimeBehaviorModeResolution {
  return {
    confirmationMode: "LEGACY",
    salesAuthorityMode: "LEGACY",
    stateReadMode: "LEGACY",
    authorityBundleHash: null,
    modeVersionId: "10000000-0000-4000-8000-000000000001",
    contentHash: `sha256:${"a".repeat(64)}`,
    pointerRevision: 8,
    source: "DATABASE",
    status: "RESOLVED",
    reasonCodes: [],
    pointerUpdatedAt: "2026-08-24T00:00:00.000Z",
    resolvedAt: "2026-08-24T00:00:00.000Z",
    propagationMs: 0,
    auditWrite: "RECORDED",
    authorityProvenance: "LEGACY_POINTER",
    ...overrides,
  };
}

describe("DF13 single runtime authority boundary", () => {
  it("admits the unchanged LEGACY path only for an exact LEGACY resolution", () => {
    expect(selectDf13RuntimeAuthority({
      pageId: "1198992073286645",
      channel: "MESSENGER",
      resolution: resolution(),
    })).toEqual({
      status: "LEGACY_SELECTED",
    });
  });

  it("selects COMMERCE only with the exact fresh DATABASE identity and bundle", () => {
    expect(selectDf13RuntimeAuthority({
      pageId: "1198992073286645",
      channel: "MESSENGER",
      resolution: resolution({
      salesAuthorityMode: "COMMERCE",
      stateReadMode: "LEGACY",
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      authorityProvenance: "COMMERCE_POINTER",
      }),
    })).toEqual({
      status: "COMMERCE_SELECTED",
      authority: {
        modeVersionId: "10000000-0000-4000-8000-000000000001",
        contentHash: `sha256:${"a".repeat(64)}`,
        pointerRevision: 8,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
        source: "DATABASE",
      },
    });
  });

  it("never falls back to LEGACY after a COMMERCE-origin fail-safe or incomplete identity", () => {
    expect(selectDf13RuntimeAuthority({
      pageId: "1198992073286645",
      channel: "MESSENGER",
      resolution: resolution({
      confirmationMode: "CLARIFY_ONLY",
      authorityProvenance: "COMMERCE_POINTER",
      source: "FAIL_SAFE",
      status: "REJECTED",
      authorityBundleHash: null,
      }),
    })).toEqual({
      status: "BLOCKED",
      reasonCode: "DF13_RUNTIME_COMMERCE_IDENTITY_NOT_ADMISSIBLE",
    });

    expect(selectDf13RuntimeAuthority({
      pageId: "1198992073286645",
      channel: "MESSENGER",
      resolution: resolution({
        salesAuthorityMode: "COMMERCE",
        authorityBundleHash: "b".repeat(64),
        authorityProvenance: "COMMERCE_POINTER",
      }),
    })).toEqual({
      status: "BLOCKED",
      reasonCode: "DF13_RUNTIME_COMMERCE_IDENTITY_INVALID",
    });

    expect(selectDf13RuntimeAuthority({
      pageId: "1198992073286645",
      channel: "MESSENGER",
      resolution: resolution({
        salesAuthorityMode: "COMMERCE",
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
        authorityProvenance: "COMMERCE_POINTER",
        pointerRevision: null,
      }),
    })).toEqual({
      status: "BLOCKED",
      reasonCode: "DF13_RUNTIME_COMMERCE_IDENTITY_INVALID",
    });
  });
});
