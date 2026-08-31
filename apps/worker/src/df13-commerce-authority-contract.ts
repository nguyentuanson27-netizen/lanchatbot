import type { RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE } from "./df13-commerce-authority-bundle.js";

export { DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE } from "./df13-commerce-authority-bundle.js";

export interface Df13CommerceAuthorityIdentity {
  readonly salesAuthorityMode: "COMMERCE";
  readonly stateReadMode: "LEGACY";
  readonly modeVersionId: string;
  readonly contentHash: string;
  readonly pointerRevision: number;
  readonly authorityBundleHash: string;
  readonly source: "DATABASE" | "CACHE";
}

export type Df13CommerceAuthorityAssessment =
  | { readonly status: "COMMERCE_CANDIDATE"; readonly authority: Df13CommerceAuthorityIdentity }
  | {
    readonly status: "COMMERCE_BLOCKED";
    readonly reasonCode:
      | "DF13_COMMERCE_PROVENANCE_NOT_ADMISSIBLE"
      | "DF13_COMMERCE_IDENTITY_NOT_FRESH_RESOLVED"
      | "DF13_COMMERCE_IDENTITY_INVALID";
  };

/**
 * Pure admission check for the future dedicated Commerce boundary. It has no
 * LEGACY-admitted outcome: an effective LEGACY fallback must be selected by a
 * caller outside this contract, never inferred from a failed Commerce result.
 */
export function assessDf13CommerceAuthority(
  resolution: RuntimeBehaviorModeResolution,
): Df13CommerceAuthorityAssessment {
  if (resolution.authorityProvenance !== "COMMERCE_POINTER") {
    return { status: "COMMERCE_BLOCKED", reasonCode: "DF13_COMMERCE_PROVENANCE_NOT_ADMISSIBLE" };
  }
  if (
    resolution.status !== "RESOLVED"
    || resolution.auditWrite !== "RECORDED"
    || (resolution.source !== "DATABASE" && resolution.source !== "CACHE")
    || resolution.salesAuthorityMode !== "COMMERCE"
    || resolution.stateReadMode !== "LEGACY"
  ) {
    return { status: "COMMERCE_BLOCKED", reasonCode: "DF13_COMMERCE_IDENTITY_NOT_FRESH_RESOLVED" };
  }
  if (
    !resolution.modeVersionId
    || !resolution.contentHash
    || typeof resolution.pointerRevision !== "number"
    || !Number.isInteger(resolution.pointerRevision)
    || resolution.pointerRevision < 1
    || resolution.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(resolution.modeVersionId)
    || !/^sha256:[a-f0-9]{64}$/u.test(resolution.contentHash)
  ) {
    return { status: "COMMERCE_BLOCKED", reasonCode: "DF13_COMMERCE_IDENTITY_INVALID" };
  }
  return {
    status: "COMMERCE_CANDIDATE",
    authority: {
      salesAuthorityMode: "COMMERCE",
      stateReadMode: "LEGACY",
      modeVersionId: resolution.modeVersionId,
      contentHash: resolution.contentHash,
      pointerRevision: resolution.pointerRevision,
      authorityBundleHash: resolution.authorityBundleHash,
      source: resolution.source,
    },
  };
}
