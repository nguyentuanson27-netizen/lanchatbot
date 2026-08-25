import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

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

const authorityIndependentBypassClasses = Object.freeze([] as const);

/**
 * Single canonical producer shared by the first-PREPROD database writer and
 * every worker-side Commerce consumer. It is intentionally outside the frozen
 * Gate E candidate-source set, while its value remains re-derived from this
 * exact payload rather than copied into an operation document.
 */
export const DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1 = Object.freeze({
  schemaVersion: 1 as const,
  contractVersion: "DF13_COMMERCE_AUTHORITY_BUNDLE_V1" as const,
  authorityDependentConsumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  phase: "COMMERCE_DERIVED" as const,
  context: "CONTEXT_V2" as const,
  strategy: "CONTEXT_V2" as const,
  cta: "CONTEXT_V2" as const,
  reconciliation: "COMMERCE_FINAL" as const,
  legacySalesStage: "DEMOTED_TELEMETRY_ONLY" as const,
  authorityIndependentBypassClasses,
});

export const DF13_COMMERCE_AUTHORITY_BUNDLE_V1 = Object.freeze({
  ...DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1,
  contractHash: sha256(canonicalJsonV1(DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1)),
});
