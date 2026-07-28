import type { AnnotationScopeV1 } from "@lana/contracts";
import {
  annotationScopeKey,
  type BenchmarkAnnotationConfidence,
  type Wave1BenchmarkConversation,
} from "./benchmark-bundle.js";

export interface SemanticPrediction {
  readonly conversationId: string;
  readonly labelCode: string;
  readonly scope: AnnotationScopeV1;
  readonly turnIndex: number | null;
  readonly evidenceText: string | null;
  readonly confidence: BenchmarkAnnotationConfidence;
}

export interface RateInterval {
  readonly value: number | null;
  readonly lower95: number | null;
  readonly upper95: number | null;
}

export interface SemanticLabelMetrics {
  readonly labelCode: string;
  readonly support: number;
  readonly predicted: number;
  readonly truePositive: number;
  readonly falsePositive: number;
  readonly falseNegative: number;
  readonly precision: RateInterval;
  readonly recall: RateInterval;
  readonly f1: number | null;
}

export interface SemanticBenchmarkReport {
  readonly schemaVersion: 1;
  readonly conversationCount: number;
  readonly goldAnnotationCount: number;
  readonly predictionCount: number;
  readonly duplicatePredictionCount: number;
  readonly invalidEvidenceCount: number;
  readonly evidenceEvaluatedCount: number;
  readonly evidenceValidityRate: number | null;
  readonly micro: {
    readonly precision: number | null;
    readonly recall: number | null;
    readonly f1: number | null;
  };
  readonly macroF1: number | null;
  readonly labels: Readonly<Record<string, SemanticLabelMetrics>>;
  readonly confusion: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

interface Count {
  support: number;
  predicted: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function f1(precision: number | null, recall: number | null): number | null {
  if (precision === null || recall === null) return null;
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

function wilson(successes: number, total: number): RateInterval {
  if (total === 0) return { value: null, lower95: null, upper95: null };
  const z = 1.959963984540054;
  const observed = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = (observed + z2 / (2 * total)) / denominator;
  const margin =
    (z *
      Math.sqrt(
        (observed * (1 - observed)) / total + z2 / (4 * total * total),
      )) /
    denominator;
  return {
    value: observed,
    lower95: Math.max(0, center - margin),
    upper95: Math.min(1, center + margin),
  };
}

function unitKey(
  conversationId: string,
  scope: AnnotationScopeV1,
  turnIndex: number | null,
): string {
  return `${conversationId}\0${scope}\0${turnIndex ?? "CONVERSATION"}`;
}

function validEvidence(
  conversation: Wave1BenchmarkConversation | undefined,
  prediction: SemanticPrediction,
): boolean {
  if (prediction.scope === "CONVERSATION") return prediction.evidenceText === null;
  if (prediction.scope === "SEQUENCE") return prediction.evidenceText !== null;
  if (!conversation || prediction.turnIndex === null || !prediction.evidenceText) {
    return false;
  }
  const message = conversation.messages.find(
    ({ turnIndex }) => turnIndex === prediction.turnIndex,
  );
  if (!message) return false;
  const expectedRole = prediction.scope === "CUSTOMER_MESSAGE" ? "CUSTOMER" : "SHOP";
  return message.role === expectedRole && message.redactedText.includes(prediction.evidenceText);
}

export function scoreSemanticBenchmark(
  conversations: readonly Wave1BenchmarkConversation[],
  predictions: readonly SemanticPrediction[],
): SemanticBenchmarkReport {
  const conversationById = new Map(
    conversations.map((conversation) => [conversation.conversationId, conversation]),
  );
  const goldByKey = new Map<string, string>();
  const goldLabelsByUnit = new Map<string, Set<string>>();
  for (const conversation of conversations) {
    for (const annotation of conversation.annotations) {
      const key = annotationScopeKey(
        conversation.conversationId,
        annotation.labelCode,
        annotation.scope,
        annotation.turnIndex,
      );
      goldByKey.set(key, annotation.labelCode);
      const unit = unitKey(
        conversation.conversationId,
        annotation.scope,
        annotation.turnIndex,
      );
      const labels = goldLabelsByUnit.get(unit) ?? new Set<string>();
      labels.add(annotation.labelCode);
      goldLabelsByUnit.set(unit, labels);
    }
  }

  const predictionByKey = new Map<string, SemanticPrediction>();
  const predictedLabelsByUnit = new Map<string, Set<string>>();
  let duplicatePredictionCount = 0;
  let invalidEvidenceCount = 0;
  let evidenceEvaluatedCount = 0;
  for (const prediction of predictions) {
    const key = annotationScopeKey(
      prediction.conversationId,
      prediction.labelCode,
      prediction.scope,
      prediction.turnIndex,
    );
    if (predictionByKey.has(key)) {
      duplicatePredictionCount += 1;
      continue;
    }
    predictionByKey.set(key, prediction);
    const unit = unitKey(
      prediction.conversationId,
      prediction.scope,
      prediction.turnIndex,
    );
    const labels = predictedLabelsByUnit.get(unit) ?? new Set<string>();
    labels.add(prediction.labelCode);
    predictedLabelsByUnit.set(unit, labels);
    evidenceEvaluatedCount += 1;
    if (!validEvidence(conversationById.get(prediction.conversationId), prediction)) {
      invalidEvidenceCount += 1;
    }
  }

  const labelCodes = new Set<string>([
    ...goldByKey.values(),
    ...[...predictionByKey.values()].map(({ labelCode }) => labelCode),
  ]);
  const counts = new Map<string, Count>(
    [...labelCodes].map((labelCode) => [
      labelCode,
      {
        support: 0,
        predicted: 0,
        truePositive: 0,
        falsePositive: 0,
        falseNegative: 0,
      },
    ]),
  );
  for (const [key, labelCode] of goldByKey) {
    const count = counts.get(labelCode);
    if (!count) continue;
    count.support += 1;
    if (predictionByKey.has(key)) count.truePositive += 1;
    else count.falseNegative += 1;
  }
  for (const [key, prediction] of predictionByKey) {
    const count = counts.get(prediction.labelCode);
    if (!count) continue;
    count.predicted += 1;
    if (!goldByKey.has(key)) count.falsePositive += 1;
  }

  const confusion: Record<string, Record<string, number>> = {};
  const allUnits = new Set([...goldLabelsByUnit.keys(), ...predictedLabelsByUnit.keys()]);
  for (const unit of allUnits) {
    const goldLabels = goldLabelsByUnit.get(unit) ?? new Set<string>();
    const predictedLabels = predictedLabelsByUnit.get(unit) ?? new Set<string>();
    const missing = [...goldLabels].filter((labelCode) => !predictedLabels.has(labelCode));
    const extras = [...predictedLabels].filter((labelCode) => !goldLabels.has(labelCode));
    for (const goldLabel of missing) {
      const row = confusion[goldLabel] ?? {};
      if (extras.length === 0) row.__MISSED__ = (row.__MISSED__ ?? 0) + 1;
      for (const predictedLabel of extras) {
        row[predictedLabel] = (row[predictedLabel] ?? 0) + 1;
      }
      confusion[goldLabel] = row;
    }
    if (missing.length === 0) {
      for (const predictedLabel of extras) {
        const row = confusion.__NONE__ ?? {};
        row[predictedLabel] = (row[predictedLabel] ?? 0) + 1;
        confusion.__NONE__ = row;
      }
    }
  }

  const labels: Record<string, SemanticLabelMetrics> = {};
  let totalTruePositive = 0;
  let totalFalsePositive = 0;
  let totalFalseNegative = 0;
  const macroValues: number[] = [];
  for (const labelCode of [...labelCodes].sort()) {
    const count = counts.get(labelCode);
    if (!count) continue;
    const precision = wilson(count.truePositive, count.predicted);
    const recall = wilson(count.truePositive, count.support);
    const labelF1 = count.support > 0 && count.predicted === 0
      ? 0
      : f1(precision.value, recall.value);
    labels[labelCode] = {
      labelCode,
      ...count,
      precision,
      recall,
      f1: labelF1,
    };
    totalTruePositive += count.truePositive;
    totalFalsePositive += count.falsePositive;
    totalFalseNegative += count.falseNegative;
    if (count.support > 0 && labelF1 !== null) macroValues.push(labelF1);
  }
  const microPrecision = ratio(
    totalTruePositive,
    totalTruePositive + totalFalsePositive,
  );
  const microRecall = ratio(
    totalTruePositive,
    totalTruePositive + totalFalseNegative,
  );

  return {
    schemaVersion: 1,
    conversationCount: conversations.length,
    goldAnnotationCount: goldByKey.size,
    predictionCount: predictionByKey.size,
    duplicatePredictionCount,
    invalidEvidenceCount,
    evidenceEvaluatedCount,
    evidenceValidityRate: ratio(
      evidenceEvaluatedCount - invalidEvidenceCount,
      evidenceEvaluatedCount,
    ),
    micro: {
      precision: microPrecision,
      recall: microRecall,
      f1: f1(microPrecision, microRecall),
    },
    macroF1:
      macroValues.length === 0
        ? null
        : macroValues.reduce((sum, value) => sum + value, 0) / macroValues.length,
    labels,
    confusion,
  };
}

export interface SemanticPromotionOptions {
  readonly safetyCriticalLabels: ReadonlySet<string>;
  readonly targetedLabels: ReadonlySet<string>;
  readonly minimumSupport: number;
  readonly defaultPrecision: number;
  readonly defaultRecall: number;
  readonly buyingNegatedPrecision: number;
  readonly maximumSafetyF1Regression: number;
  readonly minimumTargetF1Improvement: number;
}

export interface SemanticPromotionResult {
  readonly passed: boolean;
  readonly violations: readonly string[];
  readonly insufficientSupportLabels: readonly string[];
}

export function evaluateSemanticPromotion(
  baseline: SemanticBenchmarkReport,
  candidate: SemanticBenchmarkReport,
  options: SemanticPromotionOptions,
): SemanticPromotionResult {
  const violations: string[] = [];
  const insufficientSupportLabels: string[] = [];
  if (
    baseline.macroF1 !== null &&
    candidate.macroF1 !== null &&
    candidate.macroF1 < baseline.macroF1
  ) {
    violations.push("OVERALL_MACRO_F1_REGRESSION");
  }
  for (const labelCode of options.safetyCriticalLabels) {
    const current = baseline.labels[labelCode];
    const next = candidate.labels[labelCode];
    if (!next || next.support < options.minimumSupport) {
      insufficientSupportLabels.push(labelCode);
      continue;
    }
    const minimumPrecision =
      labelCode === "BUYING_NEGATED"
        ? options.buyingNegatedPrecision
        : options.defaultPrecision;
    if ((next.precision.value ?? 0) < minimumPrecision) {
      violations.push(`SAFETY_PRECISION_BELOW_GATE:${labelCode}`);
    }
    if ((next.recall.value ?? 0) < options.defaultRecall) {
      violations.push(`SAFETY_RECALL_BELOW_GATE:${labelCode}`);
    }
    if (
      current?.f1 !== null &&
      current?.f1 !== undefined &&
      next.f1 !== null &&
      next.f1 < current.f1 - options.maximumSafetyF1Regression
    ) {
      violations.push(`SAFETY_F1_REGRESSION:${labelCode}`);
    }
  }
  for (const labelCode of options.targetedLabels) {
    const current = baseline.labels[labelCode];
    const next = candidate.labels[labelCode];
    if (!current || !next || current.f1 === null || next.f1 === null) continue;
    if (next.f1 < current.f1 + options.minimumTargetF1Improvement) {
      violations.push(`TARGET_F1_IMPROVEMENT_MISSING:${labelCode}`);
    }
  }
  return {
    passed: violations.length === 0,
    violations,
    insufficientSupportLabels: [...new Set(insufficientSupportLabels)].sort(),
  };
}
