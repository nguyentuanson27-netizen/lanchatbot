import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import type { TrackCProtectedProposition } from
  "./track-c-c3-response-plan-control.js";

export type TrackCSimulationFactualEvidence = Readonly<{
  claimRef: string;
  capability: TrackCProtectedProposition;
  contentHash: string;
  source: "BENCHMARK_SIMULATION";
  fact: Readonly<Record<string, unknown>>;
}>;

/**
 * Supplemental factual authority is available only to the V5 behavior lane.
 * It deliberately contains no canonical-action or effect capability.
 */
export type TrackCFactualAuthorityEnvelope = Readonly<{
  simulationFacts: readonly TrackCSimulationFactualEvidence[];
}>;

const materializedAuthorities = new WeakSet<object>();

export const EMPTY_TRACK_C_FACTUAL_AUTHORITY: TrackCFactualAuthorityEnvelope =
  Object.freeze({ simulationFacts: Object.freeze([]) });
materializedAuthorities.add(EMPTY_TRACK_C_FACTUAL_AUTHORITY);

const CAPABILITY_BY_SIMULATION_KIND = Object.freeze({
  PRODUCT_PROFILE: "PRODUCT_ATTRIBUTES",
  PRODUCT_ATTRIBUTE: "PRODUCT_ATTRIBUTES",
  PRODUCT_COMPARISON: "PRODUCT_COMPARISON",
  POLICY_SNAPSHOT: "POLICY",
  CARE_GUIDANCE: "CARE_GUIDANCE",
  OFFER_CONFIGURATION: "OFFER_CONFIGURATION",
  BUSINESS_LOCATION: "BUSINESS_LOCATION",
  CHANNEL_PRICE_SNAPSHOT: "PRICE",
  PROMOTION_SEMANTICS: "PROMOTION_OFFER",
  FULFILLMENT_SNAPSHOT: "FULFILLMENT_STATUS",
  CART_TOTAL: "CART_TOTAL",
  PRODUCT_LIFECYCLE: "PRODUCT_LIFECYCLE",
} as const satisfies Readonly<Record<string, TrackCProtectedProposition>>);

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object" ||
      (Object.getPrototypeOf(value) !== Object.prototype &&
       Object.getPrototypeOf(value) !== null)) {
    return false;
  }
  return Object.values(value as Readonly<Record<string, unknown>>).every(isJsonValue);
}

function freezeJson(value: unknown): unknown {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeJson));
  if (value !== null && typeof value === "object") {
    return Object.freeze(Object.fromEntries(Object.entries(
      value as Readonly<Record<string, unknown>>,
    ).map(([key, entry]) => [key, freezeJson(entry)])));
  }
  return value;
}

function simulationFact(
  value: unknown,
  index: number,
): TrackCSimulationFactualEvidence {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      !isJsonValue(value)) {
    throw new Error("TRACK_C_V5_SIMULATION_FACT_INVALID");
  }
  const record = value as Readonly<Record<string, unknown>>;
  const kind = record.kind;
  if (typeof kind !== "string") {
    throw new Error("TRACK_C_V5_SIMULATION_FACT_INVALID");
  }
  const capability = CAPABILITY_BY_SIMULATION_KIND[kind];
  if (capability === undefined) {
    throw new Error("TRACK_C_V5_SIMULATION_FACT_INVALID");
  }
  const canonicalFact = canonicalJsonV1(value);
  return Object.freeze({
    claimRef: `SIM_FACT_${String(index + 1).padStart(3, "0")}`,
    capability,
    contentHash: createHash("sha256")
      .update(`TRACK_C_V5_BENCHMARK_SIMULATION_FACT_V1\n${canonicalFact}`, "utf8")
      .digest("hex"),
    source: "BENCHMARK_SIMULATION",
    fact: freezeJson(JSON.parse(canonicalFact)) as Readonly<Record<string, unknown>>,
  });
}

export function materializeTrackCBehaviorSimulationFactualAuthority(
  values: readonly unknown[],
): TrackCFactualAuthorityEnvelope {
  const facts = values.map(simulationFact);
  if (new Set(facts.map(({ claimRef }) => claimRef)).size !== facts.length) {
    throw new Error("TRACK_C_V5_SIMULATION_FACT_INVALID");
  }
  const authority = Object.freeze({ simulationFacts: Object.freeze(facts) });
  materializedAuthorities.add(authority);
  return authority;
}

/** Rejects caller-created authority objects before they can reach a prompt. */
export function assertTrackCFactualAuthorityEnvelope(
  authority: TrackCFactualAuthorityEnvelope,
): TrackCFactualAuthorityEnvelope {
  if (!materializedAuthorities.has(authority)) {
    throw new Error("TRACK_C_C3_FACTUAL_AUTHORITY_INVALID");
  }
  return authority;
}
