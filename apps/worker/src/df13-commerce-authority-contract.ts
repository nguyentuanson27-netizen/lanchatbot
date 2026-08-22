import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";

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

export type CommerceAuthorityConsumer =
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
 * The bundle is intentionally all-or-nothing. A future activation cannot
 * retain the regex sales-stage writer as a second authority, nor selectively
 * retain a legacy Context/phase/reconciliation consumer.
 */
export const DF13_COMMERCE_AUTHORITY_BUNDLE_V1 = Object.freeze({
  ...authorityBundle,
  contractHash: sha256(canonicalJsonV1(authorityBundle)),
});
