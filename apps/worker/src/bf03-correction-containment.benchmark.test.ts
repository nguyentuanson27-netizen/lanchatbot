import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface EvaluationCase {
  readonly id: string;
  readonly label: "CONTAIN" | "PASS_THROUGH";
  readonly category: string;
  readonly text: string;
  readonly expectedClassifierIntents?: readonly string[];
  readonly expectedAction?: "REPLY";
  readonly expectedFactIntents?: readonly string[];
  readonly runtimeContract?:
    | "CONTAIN_NO_FACTS"
    | "CONTAIN_AUTHORIZED_FACT"
    | "PASS_THROUGH_SIZE";
  readonly unauthorizedModelIntents?: readonly string[];
}

interface EvaluationCorpus {
  readonly schemaVersion: 1;
  readonly benchmarkVersion: string;
  readonly status: "INACTIVE_RESEARCH_ONLY";
  readonly runtimeAuthority: "NO_RUNTIME_AUTHORITY";
  readonly activationPath: "NO_ACTIVATION_PATH";
  readonly provenance: "SYNTHETIC_REVIEWED_NO_PII";
  readonly policy: "CORRECTION_CONTAINMENT_V1";
  readonly gate: {
    readonly maxFalsePositives: 0;
    readonly maxFalseNegatives: 0;
    readonly maxFalsePositiveRate: 0;
    readonly maxFalseNegativeRate: 0;
  };
  readonly cases: readonly EvaluationCase[];
}

const corpus = JSON.parse(readFileSync(new URL(
  "../../../benchmarks/bf03/correction-containment-v1.json",
  import.meta.url,
), "utf8")) as EvaluationCorpus;

describe(`inactive BF-03 research corpus ${corpus.benchmarkVersion}`, () => {
  it("is explicitly non-runtime, synthetic, reviewable, and internally valid", () => {
    expect(corpus.schemaVersion).toBe(1);
    expect(corpus.status).toBe("INACTIVE_RESEARCH_ONLY");
    expect(corpus.runtimeAuthority).toBe("NO_RUNTIME_AUTHORITY");
    expect(corpus.activationPath).toBe("NO_ACTIVATION_PATH");
    expect(corpus.provenance).toBe("SYNTHETIC_REVIEWED_NO_PII");
    expect(corpus.gate).toEqual({
      maxFalsePositives: 0,
      maxFalseNegatives: 0,
      maxFalsePositiveRate: 0,
      maxFalseNegativeRate: 0,
    });
    expect(corpus.cases).toHaveLength(86);
    expect(new Set(corpus.cases.map(({ id }) => id)).size)
      .toBe(corpus.cases.length);
    expect(new Set(corpus.cases.map(({ text }) => text)).size)
      .toBe(corpus.cases.length);

    expect(corpus.cases.filter(({ label }) => label === "CONTAIN"))
      .toHaveLength(36);
    expect(corpus.cases.filter(({ label }) => label === "PASS_THROUGH"))
      .toHaveLength(50);
    for (const evaluationCase of corpus.cases) {
      expect(evaluationCase.id).toMatch(/^[pn]\d{2}$/u);
      expect(evaluationCase.category.trim()).not.toBe("");
      expect(evaluationCase.text.trim()).not.toBe("");
      expect(["CONTAIN", "PASS_THROUGH"]).toContain(evaluationCase.label);
    }
  });

  it("does not import an analyzer, runner, or production module", () => {
    const testSource = readFileSync(new URL(import.meta.url), "utf8");
    expect(testSource).not.toMatch(/from\s+["'][^"']*(?:runner|realtime|analy)/iu);
  });
});
