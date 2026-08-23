import { describe, expect, it } from "vitest";
import type { RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  assessDf13CommerceAuthority,
} from "./df13-commerce-authority-contract.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1 as CUTOVER_AUTHORITY_BUNDLE_V1,
} from "./df13-commerce-cutover.js";

function resolution(
  overrides: Partial<RuntimeBehaviorModeResolution> = {},
): RuntimeBehaviorModeResolution {
  return {
    confirmationMode: "V2_ACTIVE",
    salesAuthorityMode: "COMMERCE",
    stateReadMode: "LEGACY",
    authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
    modeVersionId: "10000000-0000-4000-8000-000000000001",
    contentHash: `sha256:${"a".repeat(64)}`,
    pointerRevision: 1,
    source: "DATABASE",
    status: "RESOLVED",
    reasonCodes: [],
    pointerUpdatedAt: "2026-08-23T00:00:00.000Z",
    resolvedAt: "2026-08-23T00:00:00.000Z",
    propagationMs: 0,
    auditWrite: "RECORDED",
    authorityProvenance: "COMMERCE_POINTER",
    ...overrides,
  };
}

describe("DF13 Commerce authority contract", () => {
  it("uses the exact same immutable authority bundle instance as cutover", () => {
    expect(DF13_COMMERCE_AUTHORITY_BUNDLE_V1).toBe(CUTOVER_AUTHORITY_BUNDLE_V1);
  });

  it("admits only a fresh, audited, exact COMMERCE identity to the future Commerce track", () => {
    expect(assessDf13CommerceAuthority(resolution())).toMatchObject({
      status: "COMMERCE_CANDIDATE",
      authority: {
        source: "DATABASE",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
      },
    });

    expect(assessDf13CommerceAuthority(resolution({ source: "CACHE" }))).toMatchObject({
      status: "COMMERCE_CANDIDATE",
      authority: { source: "CACHE" },
    });

    expect(assessDf13CommerceAuthority(resolution({ authorityBundleHash: "b".repeat(64) }))).toEqual({
      status: "COMMERCE_BLOCKED",
      reasonCode: "DF13_COMMERCE_IDENTITY_INVALID",
    });
  });

  it("blocks COMMERCE-origin fail-safe results instead of returning a LEGACY authority decision", () => {
    expect(assessDf13CommerceAuthority(resolution({
      confirmationMode: "CLARIFY_ONLY",
      salesAuthorityMode: "LEGACY",
      authorityBundleHash: null,
      modeVersionId: null,
      contentHash: null,
      pointerRevision: null,
      source: "FAIL_SAFE",
      status: "FALLBACK",
      auditWrite: "FAILED",
      reasonCodes: ["RUNTIME_BEHAVIOR_COMMERCE_AUDIT_FAILED", "RUNTIME_BEHAVIOR_AUDIT_FAILED"],
    }))).toEqual({
      status: "COMMERCE_BLOCKED",
      reasonCode: "DF13_COMMERCE_IDENTITY_NOT_FRESH_RESOLVED",
    });
  });

  it("does not expose a LEGACY admission outcome from the Commerce contract", () => {
    const result = assessDf13CommerceAuthority(resolution({
      salesAuthorityMode: "LEGACY",
      authorityBundleHash: null,
      modeVersionId: null,
      contentHash: null,
      pointerRevision: null,
      source: "STARTUP_DEFAULT",
      status: "FALLBACK",
      auditWrite: "NOT_CONFIGURED",
      authorityProvenance: "STARTUP_DEFAULT",
    }));

    expect(result).toEqual({
      status: "COMMERCE_BLOCKED",
      reasonCode: "DF13_COMMERCE_PROVENANCE_NOT_ADMISSIBLE",
    });
  });
});
