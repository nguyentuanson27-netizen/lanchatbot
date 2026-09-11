/*
 * C3 candidate adapter for the C2 quality benchmark.
 *
 * This adapter targets the current Track C two-pass candidate contract on the
 * checked-out revision. It does not own corpus, rubric, thresholds, or the C2
 * aggregate gate, so the same C2 benchmark can evaluate later C3 prompt
 * revisions without changing benchmark ownership.
 */
export {
  runTrackCV5TwoPassBenchmarkCase as runTrackCC3TwoPassQualityCandidate,
} from "./track-c-c3-v5-benchmark-runner.js";
export type {
  TrackCV5TwoPassBenchmarkInput as TrackCC3TwoPassQualityCandidateInput,
  TrackCV5TwoPassBenchmarkResult as TrackCC3TwoPassQualityCandidateResult,
} from "./track-c-c3-v5-benchmark-runner.js";
