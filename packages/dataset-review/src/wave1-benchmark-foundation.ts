import { createHash } from "node:crypto";
import { NORMALIZATION_VERSION } from "./normalize.js";
import { REDACTION_VERSION } from "./redact.js";
import {
  assignBenchmarkSplits,
  type BenchmarkSplitPlan,
} from "./benchmark-split.js";
import type { Wave1BenchmarkBundle } from "./benchmark-bundle.js";
import { WAVE1_SCHEMA_VERSION } from "./wave1-schema.js";

export const WAVE1_BENCHMARK_SPLIT_SEED = "lana-wave1-gold-v2-split-v1";

export const WAVE1_SEMANTIC_PROMOTION_LABELS = new Set([
  "BUYING_COMMITTED",
  "BUYING_NEGATED",
  "BUYING_RETRACTED",
  "PRE_SALE_RETURN_POLICY_QUESTION",
  "RETURN_REQUEST",
  "SIZE_RECOMMENDATION_CONFLICT",
  "PREMATURE_PII_REQUEST",
  "POSSIBLE_HANDOFF_LANGUAGE",
]);

export const WAVE1_RARE_SAFETY_LABELS = new Set([
  ...WAVE1_SEMANTIC_PROMOTION_LABELS,
  "CHOICE_OVERLOAD",
  "POST_EXCHANGE_CONFIRMATION",
  "MATERIAL_OBJECTION",
]);

export interface Wave1BenchmarkRunManifest {
  readonly schemaVersion: 1;
  readonly benchmarkVersion: "wave1-benchmark-v1";
  readonly dataset: {
    readonly manifestSha256: string;
    readonly goldSha256: string;
    readonly historySha256: string;
    readonly includedCount: number;
    readonly excludedCount: number;
    readonly splitChecksum: string;
  };
  readonly versions: {
    readonly parser: "redis-transcript-v1";
    readonly normalization: string;
    readonly redaction: string;
    readonly labelSchema: string;
    readonly semanticScorer: "wave1-semantic-scorer-v1";
    readonly runtimePolicyScorer: "wave1-runtime-policy-scorer-v1";
    readonly replyQualityScorer: "wave1-reply-quality-scorer-v1";
  };
  readonly splitSeed: string;
  readonly runFingerprint: string;
}

export interface Wave1BenchmarkFoundationReport {
  readonly schemaVersion: 1;
  readonly bundle: Wave1BenchmarkBundle["summary"];
  readonly split: {
    readonly seed: string;
    readonly checksum: string;
    readonly counts: BenchmarkSplitPlan["counts"];
    readonly leakageGroupCount: 0;
    readonly rareSafetyCount: number;
    readonly labelSupport: BenchmarkSplitPlan["labelSupport"];
  };
  readonly runManifest: Wave1BenchmarkRunManifest;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function buildWave1BenchmarkFoundation(
  bundle: Wave1BenchmarkBundle,
  seed = WAVE1_BENCHMARK_SPLIT_SEED,
): {
  readonly plan: BenchmarkSplitPlan;
  readonly report: Wave1BenchmarkFoundationReport;
} {
  const minimumHoldoutSupport = Object.fromEntries(
    [...WAVE1_SEMANTIC_PROMOTION_LABELS].map((labelCode) => [labelCode, 50]),
  );
  const plan = assignBenchmarkSplits({
    items: bundle.conversations.map((conversation) => ({
      conversationId: conversation.conversationId,
      duplicateGroupId: conversation.duplicateGroupId,
      labelCodes: conversation.labelCodes,
    })),
    targets: {
      DEVELOPMENT: 1_173,
      VALIDATION: 391,
      HOLDOUT: 391,
    },
    seed,
    minimumHoldoutSupport,
    rareSafetyLabels: WAVE1_RARE_SAFETY_LABELS,
  });

  const unsignedManifest = {
    schemaVersion: 1 as const,
    benchmarkVersion: "wave1-benchmark-v1" as const,
    dataset: {
      manifestSha256: bundle.summary.manifestSha256,
      goldSha256: bundle.summary.goldSha256,
      historySha256: bundle.summary.historySha256,
      includedCount: bundle.summary.includedCount,
      excludedCount: bundle.summary.excludedCount,
      splitChecksum: plan.splitChecksum,
    },
    versions: {
      parser: "redis-transcript-v1" as const,
      normalization: NORMALIZATION_VERSION,
      redaction: REDACTION_VERSION,
      labelSchema: WAVE1_SCHEMA_VERSION,
      semanticScorer: "wave1-semantic-scorer-v1" as const,
      runtimePolicyScorer: "wave1-runtime-policy-scorer-v1" as const,
      replyQualityScorer: "wave1-reply-quality-scorer-v1" as const,
    },
    splitSeed: seed,
  };
  const runManifest: Wave1BenchmarkRunManifest = {
    ...unsignedManifest,
    runFingerprint: fingerprint(unsignedManifest),
  };
  return {
    plan,
    report: {
      schemaVersion: 1,
      bundle: bundle.summary,
      split: {
        seed,
        checksum: plan.splitChecksum,
        counts: plan.counts,
        leakageGroupCount: 0,
        rareSafetyCount: plan.rareSafetyConversationIds.size,
        labelSupport: plan.labelSupport,
      },
      runManifest,
    },
  };
}
