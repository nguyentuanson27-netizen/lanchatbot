import type {
  Wave1BenchmarkBundle,
  Wave1BenchmarkConversation,
} from "./benchmark-bundle.js";
import type { BenchmarkSplitPlan } from "./benchmark-split.js";
import { buildWave1CurrentBaseline } from "./current-deterministic-baseline.js";
import {
  evaluateSemanticPromotion,
  scoreSemanticBenchmark,
  type SemanticBenchmarkReport,
  type SemanticPromotionResult,
} from "./semantic-benchmark.js";
import {
  WAVE1_SEMANTIC_PROMOTION_LABELS,
  type Wave1BenchmarkRunManifest,
} from "./wave1-benchmark-foundation.js";
import {
  predictWave1SemanticCandidate,
  WAVE1_SEMANTIC_CANDIDATE_VERSION,
} from "./wave1-semantic-candidate.js";

const SAFETY_CRITICAL = new Set([
  "BUYING_COMMITTED",
  "BUYING_NEGATED",
  "BUYING_RETRACTED",
  "PRE_SALE_RETURN_POLICY_QUESTION",
  "RETURN_REQUEST",
  "SIZE_RECOMMENDATION_CONFLICT",
  "PREMATURE_PII_REQUEST",
  "POSSIBLE_HANDOFF_LANGUAGE",
]);

export interface Wave1CandidateBaselineReport {
  readonly schemaVersion: 1;
  readonly candidateVersion: typeof WAVE1_SEMANTIC_CANDIDATE_VERSION;
  readonly runManifest: Wave1BenchmarkRunManifest;
  readonly tuningPolicy: {
    readonly developmentUsedForRules: true;
    readonly validationUsedForReportingOnly: true;
    readonly lockedHoldoutOpened: false;
  };
  readonly semantic: {
    readonly development: SemanticBenchmarkReport;
    readonly validation: SemanticBenchmarkReport;
    readonly developmentGate: SemanticPromotionResult;
    readonly validationGate: SemanticPromotionResult;
  };
  readonly promotionStatus: "PASSED_OFFLINE_GATE" | "NOT_PROMOTED";
}

function partition(
  bundle: Wave1BenchmarkBundle,
  split: BenchmarkSplitPlan,
  name: "DEVELOPMENT" | "VALIDATION",
): readonly Wave1BenchmarkConversation[] {
  return bundle.conversations.filter(
    ({ conversationId }) => split.assignments.get(conversationId) === name,
  );
}

function gate(
  baseline: SemanticBenchmarkReport,
  candidate: SemanticBenchmarkReport,
): SemanticPromotionResult {
  return evaluateSemanticPromotion(baseline, candidate, {
    safetyCriticalLabels: SAFETY_CRITICAL,
    targetedLabels: new Set(WAVE1_SEMANTIC_PROMOTION_LABELS),
    minimumSupport: 50,
    defaultPrecision: 0.95,
    defaultRecall: 0.95,
    buyingNegatedPrecision: 0.98,
    maximumSafetyF1Regression: 0.01,
    minimumTargetF1Improvement: 0.03,
  });
}

export function buildWave1CandidateBaseline(input: {
  readonly bundle: Wave1BenchmarkBundle;
  readonly split: BenchmarkSplitPlan;
  readonly runManifest: Wave1BenchmarkRunManifest;
}): Wave1CandidateBaselineReport {
  const development = partition(input.bundle, input.split, "DEVELOPMENT");
  const validation = partition(input.bundle, input.split, "VALIDATION");
  const baseline = buildWave1CurrentBaseline(input);
  const candidateDevelopment = scoreSemanticBenchmark(
    development,
    predictWave1SemanticCandidate(development),
  );
  const candidateValidation = scoreSemanticBenchmark(
    validation,
    predictWave1SemanticCandidate(validation),
  );
  const developmentGate = gate(
    baseline.layers.semantic.development,
    candidateDevelopment,
  );
  const validationGate = gate(
    baseline.layers.semantic.validation,
    candidateValidation,
  );
  return {
    schemaVersion: 1,
    candidateVersion: WAVE1_SEMANTIC_CANDIDATE_VERSION,
    runManifest: input.runManifest,
    tuningPolicy: {
      developmentUsedForRules: true,
      validationUsedForReportingOnly: true,
      lockedHoldoutOpened: false,
    },
    semantic: {
      development: candidateDevelopment,
      validation: candidateValidation,
      developmentGate,
      validationGate,
    },
    promotionStatus:
      developmentGate.passed && validationGate.passed
        ? "PASSED_OFFLINE_GATE"
        : "NOT_PROMOTED",
  };
}
