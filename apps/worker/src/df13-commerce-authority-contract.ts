import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import type { RuntimeBehaviorModeResolution } from "@lana/chat-runtime";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export const GATE_E_PREPROD_V15_BINDING = Object.freeze({
  manifestHash: "48ed2d4a38fa2eea9eea7caadc0529862742c60a06b670e6872208e26893962b",
  evidenceBodyHash: "a01ed890b75b4c0dae5a90efe6f28a0e41f86c0c511162b7973b513d61403db1",
  finalizationHash: "21d02772417da44bf9a8709cf10e1f196feca5e3175626bdb39ecaa1147b92f8",
  evidenceAdmissibility: "FINALIZED_TRUSTED_EXACT_HEAD" as const,
  durableStoreStatus: "APPENDED" as const,
  candidateSourceRevision: "e80cd663a9769ad8c0313c3693f37f32138ca52a",
  candidateContentFingerprint: "86ff34479283895ac97274b9cace946e2926b17bc1ac381d540f2f03a17d977a",
});

export const DF13_COMMERCE_AUTHORITY_CONSUMERS_V1 = Object.freeze([
  "CLASSIFICATION",
  "COMMERCE_STATE",
  "CONTEXT_V2",
  "DERIVED_PHASE",
  "STRATEGY",
  "CTA",
  "FINAL_RECONCILIATION",
  "SIDE_EFFECT_PLAN",
] as const);

export type Df13CommerceAuthorityConsumer =
  typeof DF13_COMMERCE_AUTHORITY_CONSUMERS_V1[number];

const authorityBundle = Object.freeze({
  schemaVersion: 1 as const,
  contractVersion: "DF13_COMMERCE_AUTHORITY_BUNDLE_V1" as const,
  phase: "COMMERCE_DERIVED" as const,
  context: "CONTEXT_V2" as const,
  strategy: "CONTEXT_V2" as const,
  cta: "CONTEXT_V2" as const,
  reconciliation: "COMMERCE_FINAL" as const,
  legacySalesStage: "DEMOTED_TELEMETRY_ONLY" as const,
  authorityIndependentBypassClasses: [] as readonly [],
});

/**
 * All authority-dependent consumers are a single immutable bundle. A future
 * composition root must bind this exact hash before it can receive Commerce.
 */
export const DF13_COMMERCE_AUTHORITY_BUNDLE_V1 = Object.freeze({
  ...authorityBundle,
  contractHash: sha256(canonicalJsonV1(authorityBundle)),
});

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
    || resolution.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
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
