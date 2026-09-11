/*
 * C3 candidate adapter for the C2 quality benchmark.
 *
 * This adapter targets the current Track C two-pass candidate contract on the
 * checked-out revision. It does not own corpus, rubric, thresholds, or the C2
 * aggregate gate, so the same C2 benchmark can evaluate later C3 prompt
 * revisions without changing benchmark ownership.
 */
import {
  runTrackCV5TwoPassBenchmarkCase,
  type TrackCV5TwoPassBenchmarkInput,
  type TrackCV5TwoPassBenchmarkResult,
} from "./track-c-c3-v5-benchmark-runner.js";
import type { TrackCV5CompactCase } from "./track-c-c3-v5-benchmark-materialization.js";

export type TrackCC3CheckoutCompleteness = Readonly<{
  readonly state: "REQUIRED" | "COMPLETE";
  readonly missing_fields: readonly ("FULL_NAME" | "PHONE" | "ADDRESS")[];
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
}>;

export type TrackCC3TwoPassQualityCandidateResult =
  TrackCV5TwoPassBenchmarkResult;

const CHECKOUT_FIELDS = new Set(["FULL_NAME", "PHONE", "ADDRESS"]);
const CHECKOUT_KEYS = Object.freeze(["missing_fields", "state"] as const);

function trustedSimulationMetadata(
  fixture: TrackCC3TwoPassQualityFixture,
): readonly unknown[] {
  const { origin, first_meaningful_inbound: firstMeaningfulInbound } =
    fixture.context;
  if ((origin !== "ADVERTISEMENT" && origin !== "ORGANIC") ||
      typeof firstMeaningfulInbound !== "boolean") {
    throw new Error("TRACK_C_C3_ACQUISITION_METADATA_INVALID");
  }

  const metadata: unknown[] = [];
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
    if (fixture.context.source_stage !== "ORDER_PREVIEW" ||
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
 * acquisition/readiness signals are projected only in BEHAVIOR_SIMULATION and
 * remain evaluation-only; production execution receives no synthetic signal.
 */
export function runTrackCC3TwoPassQualityCandidate(
  input: TrackCC3TwoPassQualityCandidateInput,
): Promise<TrackCC3TwoPassQualityCandidateResult> {
  if (Object.hasOwn(input, "simulationMetadata")) {
    throw new Error("TRACK_C_C3_EXTERNAL_SIMULATION_METADATA_FORBIDDEN");
  }
  const metadata = input.lane === "BEHAVIOR_SIMULATION"
    ? trustedSimulationMetadata(input.fixture)
    : [];
  const { fixture: _fixture, ...runnerInput } = input;
  return runTrackCV5TwoPassBenchmarkCase({
    ...runnerInput,
    simulationMetadata: metadata,
  });
}
