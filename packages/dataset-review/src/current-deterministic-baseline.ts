import { detectBuyingSignal } from "@lana/business-tools";
import type {
  Wave1BenchmarkBundle,
  Wave1BenchmarkConversation,
} from "./benchmark-bundle.js";
import type { BenchmarkSplitPlan } from "./benchmark-split.js";
import {
  scoreSemanticBenchmark,
  type SemanticBenchmarkReport,
  type SemanticPrediction,
} from "./semantic-benchmark.js";
import type { Wave1BenchmarkRunManifest } from "./wave1-benchmark-foundation.js";

export interface Wave1CurrentBaselineReport {
  readonly schemaVersion: 1;
  readonly baselineVersion: "wave1-current-deterministic-v1";
  readonly runManifest: Wave1BenchmarkRunManifest;
  readonly adapter: {
    readonly name: "production-buying-signal";
    readonly version: "r18.9.6";
    readonly verifiedProductContextMode: "UNAVAILABLE_IN_HISTORICAL_EXPORT";
    readonly limitations: readonly string[];
  };
  readonly layers: {
    readonly semantic: {
      readonly status: "COMPLETED";
      readonly development: SemanticBenchmarkReport;
      readonly validation: SemanticBenchmarkReport;
    };
    readonly runtimePolicy: {
      readonly status: "PENDING_RECORDED_FIXTURES";
      readonly reason: string;
    };
    readonly replyQuality: {
      readonly status: "PENDING_RECORDED_FIXTURES";
      readonly reason: string;
    };
  };
  readonly productionAgent: {
    readonly status: "PENDING_REPLAY_ADAPTER";
    readonly reason: string;
  };
  readonly candidateAgent: {
    readonly status: "NOT_STARTED";
    readonly reason: string;
  };
}

function predictCurrentDeterministic(
  conversations: readonly Wave1BenchmarkConversation[],
): readonly SemanticPrediction[] {
  const predictions: SemanticPrediction[] = [];
  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      if (message.role !== "CUSTOMER") continue;
      const detection = detectBuyingSignal(message.redactedText, {
        // Historical exports do not contain the verified catalog envelope that
        // production uses. False product context would overstate the baseline.
        hasProductContext: false,
      });
      if (!detection.isBuyingSignal) continue;
      predictions.push({
        conversationId: conversation.conversationId,
        labelCode: "BUYING_COMMITTED",
        scope: "CUSTOMER_MESSAGE",
        turnIndex: message.turnIndex,
        evidenceText: message.redactedText,
        confidence: "HIGH",
      });
    }
  }
  return predictions;
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

export function buildWave1CurrentBaseline(input: {
  readonly bundle: Wave1BenchmarkBundle;
  readonly split: BenchmarkSplitPlan;
  readonly runManifest: Wave1BenchmarkRunManifest;
}): Wave1CurrentBaselineReport {
  const development = partition(input.bundle, input.split, "DEVELOPMENT");
  const validation = partition(input.bundle, input.split, "VALIDATION");
  return {
    schemaVersion: 1,
    baselineVersion: "wave1-current-deterministic-v1",
    runManifest: input.runManifest,
    adapter: {
      name: "production-buying-signal",
      version: "r18.9.6",
      verifiedProductContextMode: "UNAVAILABLE_IN_HISTORICAL_EXPORT",
      limitations: [
        "Only the current deterministic buying-signal fallback is scored.",
        "Verified product context is not inferred from transcript text.",
        "No production model, runtime side effect, or reply is simulated.",
        "Locked holdout is not evaluated by this baseline command.",
      ],
    },
    layers: {
      semantic: {
        status: "COMPLETED",
        development: scoreSemanticBenchmark(
          development,
          predictCurrentDeterministic(development),
        ),
        validation: scoreSemanticBenchmark(
          validation,
          predictCurrentDeterministic(validation),
        ),
      },
      runtimePolicy: {
        status: "PENDING_RECORDED_FIXTURES",
        reason:
          "Historical transcripts do not contain authoritative side-effect, ownership, and fixed business-envelope observations.",
      },
      replyQuality: {
        status: "PENDING_RECORDED_FIXTURES",
        reason:
          "Reply scoring requires replay output plus fixed fact envelopes; transcript text is not treated as generated candidate output.",
      },
    },
    productionAgent: {
      status: "PENDING_REPLAY_ADAPTER",
      reason:
        "Production agent/schema baseline must run through the side-effect-free simulation worker with a pinned model and policy snapshot.",
    },
    candidateAgent: {
      status: "NOT_STARTED",
      reason:
        "Candidate tuning starts only from reviewed development failures; locked holdout remains sealed.",
    },
  };
}
