import {
  behaviorModeContentHash,
  type RuntimeBehaviorModeResolution,
} from "@lana/chat-runtime";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE } from "./df13-commerce-authority-bundle.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CONTENT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;

export type Df13RuntimeAuthoritySelection =
  | Readonly<{ status: "LEGACY_SELECTED" }>
  | Readonly<{
    status: "COMMERCE_SELECTED";
    authority: Readonly<{
      modeVersionId: string;
      contentHash: string;
      pointerRevision: number;
      authorityBundleHash: string;
      source: "DATABASE";
    }>;
  }>
  | Readonly<{
    status: "BLOCKED";
    reasonCode:
      | "DF13_RUNTIME_COMMERCE_SCOPE_INVALID"
      | "DF13_RUNTIME_COMMERCE_IDENTITY_NOT_ADMISSIBLE"
      | "DF13_RUNTIME_COMMERCE_IDENTITY_INVALID"
      | "DF13_RUNTIME_LEGACY_IDENTITY_INVALID";
  }>;

/**
 * The one runtime selection point for final sales authority. A COMMERCE-origin
 * resolver fallback is deliberately not a LEGACY selection: using it would
 * let the old pipeline produce a final result after a COMMERCE control-plane
 * decision. The caller must stop fail-closed instead.
 */
export function selectDf13RuntimeAuthority(input: Readonly<{
  pageId: string;
  channel: string;
  resolution: RuntimeBehaviorModeResolution;
}>): Df13RuntimeAuthoritySelection {
  const { resolution } = input;
  const pointerRevision = resolution.pointerRevision;
  if (resolution.authorityProvenance === "COMMERCE_POINTER") {
    if (
      input.pageId !== DF13_COMMERCE_PREPROD_SCOPE_V1.pageId ||
      input.channel.trim().toUpperCase() !== DF13_COMMERCE_PREPROD_SCOPE_V1.channel
    ) {
      return Object.freeze({ status: "BLOCKED" as const, reasonCode: "DF13_RUNTIME_COMMERCE_SCOPE_INVALID" as const });
    }
    if (
      resolution.status !== "RESOLVED" ||
      resolution.auditWrite !== "RECORDED" ||
      resolution.source !== "DATABASE"
    ) {
      return Object.freeze({
        status: "BLOCKED" as const,
        reasonCode: "DF13_RUNTIME_COMMERCE_IDENTITY_NOT_ADMISSIBLE" as const,
      });
    }
    if (
      resolution.salesAuthorityMode !== "COMMERCE" ||
      resolution.stateReadMode !== "LEGACY" ||
      resolution.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash ||
      !resolution.modeVersionId ||
      !UUID_V4_PATTERN.test(resolution.modeVersionId) ||
      !resolution.contentHash ||
      !CONTENT_HASH_PATTERN.test(resolution.contentHash) ||
      resolution.contentHash !== behaviorModeContentHash(resolution) ||
      typeof pointerRevision !== "number" ||
      !Number.isSafeInteger(pointerRevision) ||
      pointerRevision < 1
    ) {
      return Object.freeze({
        status: "BLOCKED" as const,
        reasonCode: "DF13_RUNTIME_COMMERCE_IDENTITY_INVALID" as const,
      });
    }
    return Object.freeze({
      status: "COMMERCE_SELECTED" as const,
      authority: Object.freeze({
        modeVersionId: resolution.modeVersionId,
        contentHash: resolution.contentHash,
        pointerRevision,
        authorityBundleHash: resolution.authorityBundleHash,
        source: "DATABASE" as const,
      }),
    });
  }

  if (
    resolution.salesAuthorityMode === "LEGACY" &&
    resolution.stateReadMode === "LEGACY" &&
    resolution.authorityBundleHash === null
  ) {
    return Object.freeze({ status: "LEGACY_SELECTED" as const });
  }
  return Object.freeze({
    status: "BLOCKED" as const,
    reasonCode: "DF13_RUNTIME_LEGACY_IDENTITY_INVALID" as const,
  });
}
