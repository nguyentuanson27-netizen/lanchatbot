import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bf03CorrectionContainmentDecision,
  bf03LegacyClassifierView,
  explicitCustomerBusinessIntents,
} from "./bf03-realtime-runner.js";

interface BenchmarkCase {
  readonly id: string;
  readonly label: "CONTAIN" | "PASS_THROUGH";
  readonly category: string;
  readonly text: string;
  readonly expectedClassifierIntents?: readonly string[];
}

interface BenchmarkCorpus {
  readonly schemaVersion: 1;
  readonly benchmarkVersion: string;
  readonly provenance: "SYNTHETIC_REVIEWED_NO_PII";
  readonly policy: "CORRECTION_CONTAINMENT_V1";
  readonly gate: {
    readonly maxFalsePositives: number;
    readonly maxFalseNegatives: number;
    readonly maxFalsePositiveRate: number;
    readonly maxFalseNegativeRate: number;
  };
  readonly cases: readonly BenchmarkCase[];
}

const corpus = JSON.parse(readFileSync(new URL(
  "../../../benchmarks/bf03/correction-containment-v1.json",
  import.meta.url,
), "utf8")) as BenchmarkCorpus;

describe(`BF-03 governed benchmark ${corpus.benchmarkVersion}`, () => {
  it("meets the committed false-positive and false-negative gate", () => {
    expect(corpus.schemaVersion).toBe(1);
    expect(corpus.provenance).toBe("SYNTHETIC_REVIEWED_NO_PII");
    expect(new Set(corpus.cases.map(({ id }) => id)).size).toBe(corpus.cases.length);
    expect(new Set(corpus.cases.map(({ text }) => text)).size).toBe(corpus.cases.length);

    let positives = 0;
    let negatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    const falsePositiveIds: string[] = [];
    const falseNegativeIds: string[] = [];
    for (const benchmarkCase of corpus.cases) {
      const expected = benchmarkCase.label === "CONTAIN";
      const decision = bf03CorrectionContainmentDecision(
        benchmarkCase.text,
        corpus.policy,
      );
      if (expected) positives += 1;
      else negatives += 1;
      if (decision.applies && !expected) {
        falsePositives += 1;
        falsePositiveIds.push(benchmarkCase.id);
      }
      if (!decision.applies && expected) {
        falseNegatives += 1;
        falseNegativeIds.push(benchmarkCase.id);
      }

      if (benchmarkCase.expectedClassifierIntents) {
        const classifierView = bf03LegacyClassifierView(
          benchmarkCase.text,
          decision,
        );
        expect(
          explicitCustomerBusinessIntents(classifierView),
          benchmarkCase.id,
        ).toEqual(benchmarkCase.expectedClassifierIntents);
      }
    }

    const falsePositiveRate = negatives === 0 ? 0 : falsePositives / negatives;
    const falseNegativeRate = positives === 0 ? 0 : falseNegatives / positives;
    expect(positives).toBeGreaterThan(0);
    expect(negatives).toBeGreaterThan(0);
    expect(falsePositiveIds).toEqual([]);
    expect(falseNegativeIds).toEqual([]);
    expect(falsePositives).toBeLessThanOrEqual(corpus.gate.maxFalsePositives);
    expect(falseNegatives).toBeLessThanOrEqual(corpus.gate.maxFalseNegatives);
    expect(falsePositiveRate).toBeLessThanOrEqual(corpus.gate.maxFalsePositiveRate);
    expect(falseNegativeRate).toBeLessThanOrEqual(corpus.gate.maxFalseNegativeRate);
  });
});
