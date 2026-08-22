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
