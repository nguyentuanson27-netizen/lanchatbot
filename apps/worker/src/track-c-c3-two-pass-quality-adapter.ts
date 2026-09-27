/*
 * C3 candidate adapter for the C2 quality benchmark.
 *
 * This adapter targets the current Track C two-pass candidate contract on the
 * checked-out revision. It does not own corpus, rubric, thresholds, or the C2
 * aggregate gate, so the same C2 benchmark can evaluate later C3 prompt
 * revisions without changing benchmark ownership.
 */
import {
  type TrackCV5SimulationMetadata,
  type TrackCV5TwoPassBenchmarkInput,
} from "./track-c-c3-v5-benchmark-runner.js";
import type { TrackCV5CompactCase } from "./track-c-c3-v5-benchmark-materialization.js";
import type { TrackCCheckoutField } from "./track-c-c3-strategy-contract.js";
import type { TrackCCurrentCartBinding } from "./track-c-c3-cart-binding.js";
import {
  runTrackCStrategyContractCase,
  type TrackCStrategyContractCaseResult,
} from "./track-c-c3-strategy-contract-runner.js";

export type TrackCC3CheckoutCompleteness = Readonly<{
  readonly state: "REQUIRED" | "COMPLETE";
  readonly missing_fields: readonly TrackCCheckoutField[];
}>;

export type TrackCC3TwoPassQualityFixture = TrackCV5CompactCase & Readonly<{
  readonly context: TrackCV5CompactCase["context"] & Readonly<{
    readonly origin: "ADVERTISEMENT" | "ORGANIC";
    readonly first_meaningful_inbound: boolean;
    readonly checkout_completeness?: TrackCC3CheckoutCompleteness;
  }>;
}>;

export type TrackCC3TwoPassQualityCandidateInput = Omit<
  TrackCV5TwoPassBenchmarkInput,
  "simulationMetadata"
> & Readonly<{
  readonly fixture: TrackCC3TwoPassQualityFixture;
  readonly currentCart?: TrackCCurrentCartBinding | null;
}>;

export type TrackCC3TwoPassQualityCandidateResult =
  TrackCStrategyContractCaseResult;

// Mirrors the runtime missingCheckout field set, payment included.
const CHECKOUT_FIELDS = new Set<string>(
  ["FULL_NAME", "PHONE", "ADDRESS", "PAYMENT_METHOD"] satisfies TrackCCheckoutField[],
);
const CHECKOUT_KEYS = Object.freeze(["missing_fields", "state"] as const);

function trustedSimulationMetadata(
  fixture: TrackCC3TwoPassQualityFixture,
): readonly TrackCV5SimulationMetadata[] {
  const { origin, first_meaningful_inbound: firstMeaningfulInbound } =
    fixture.context;
  if ((origin !== "ADVERTISEMENT" && origin !== "ORGANIC") ||
      typeof firstMeaningfulInbound !== "boolean") {
    throw new Error("TRACK_C_C3_ACQUISITION_METADATA_INVALID");
  }

  const metadata: TrackCV5SimulationMetadata[] = [];
  if (origin === "ADVERTISEMENT") {
    metadata.push(Object.freeze({
      kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound,
      authorization: "NONE",
    }));
  }

  const checkout = fixture.context.checkout_completeness;
  if (checkout !== undefined) {
    const fields = checkout.missing_fields;
    const keys = Object.keys(checkout).sort();
    // The runner permits a checkout request at either reachable state, so the
    // adapter must let both through: requiring ORDER_PREVIEW here rejected the
    // open-cart case before it could reach the runner at all.
    if ((fixture.context.source_stage !== "ORDER_PREVIEW" &&
         fixture.context.source_stage !== "CART_OPEN") ||
        JSON.stringify(keys) !== JSON.stringify([...CHECKOUT_KEYS].sort()) ||
        !Array.isArray(fields) ||
        fields.some((field) => !CHECKOUT_FIELDS.has(field)) ||
        new Set(fields).size !== fields.length ||
        (checkout.state === "COMPLETE" && fields.length !== 0) ||
        (checkout.state === "REQUIRED" && fields.length === 0) ||
        (checkout.state !== "COMPLETE" && checkout.state !== "REQUIRED")) {
      throw new Error("TRACK_C_C3_CHECKOUT_COMPLETENESS_INVALID");
    }
    metadata.push(Object.freeze({
      kind: "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1",
      state: checkout.state,
      missingFields: Object.freeze([...fields]),
      authorization: "NONE",
    }));
  }
  return Object.freeze(metadata);
}

/**
 * Thin current-candidate seam for C2 simulation metadata. Fixture-authored
 * acquisition/readiness signals are validated on every lane but projected only
 * in BEHAVIOR_SIMULATION; production execution receives no synthetic signal.
 *
 * Declared async so every rejection - caller-supplied metadata and malformed
 * fixtures included - reaches callers as a rejected promise instead of a
 * synchronous throw.
 */
export async function runTrackCC3TwoPassQualityCandidate(
  input: TrackCC3TwoPassQualityCandidateInput,
): Promise<TrackCC3TwoPassQualityCandidateResult> {
  if (Object.hasOwn(input, "simulationMetadata")) {
    throw new Error("TRACK_C_C3_EXTERNAL_SIMULATION_METADATA_FORBIDDEN");
  }
  if ((input.fixture.context.cart_snapshot !== undefined) !==
      (input.currentCart !== undefined && input.currentCart !== null)) {
    throw new Error("TRACK_C_C3_CURRENT_CART_BINDING_REQUIRED");
  }
  const metadata = trustedSimulationMetadata(input.fixture);
  const acquisitionMetadata = metadata.find((entry) =>
    entry.kind === "TRACK_C_TRUSTED_ACQUISITION_V1"
  );
  const trustedAcquisition = acquisitionMetadata !== undefined &&
    acquisitionMetadata.kind === "TRACK_C_TRUSTED_ACQUISITION_V1" &&
    acquisitionMetadata.firstMeaningfulInbound
    ? acquisitionMetadata
    : undefined;
  const checkoutMetadata = metadata.filter((entry) =>
    entry.kind === "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1"
  );
  const { fixture: _fixture, ...runnerInput } = input;
  return runTrackCStrategyContractCase({
    ...runnerInput,
    simulationMetadata: input.lane === "BEHAVIOR_SIMULATION" ? checkoutMetadata : [],
    ...(input.lane === "BEHAVIOR_SIMULATION" && trustedAcquisition !== undefined
      ? { trustedAcquisition }
      : {}),
  });
}
