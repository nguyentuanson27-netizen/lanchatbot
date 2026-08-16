import { describe, expect, it, vi } from "vitest";
import {
  CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1,
  DF10_CORPUS_MEMBERSHIP_V1,
  buildContextV2CandidateManifest,
  contextV2EvaluationCaseSetHash,
  lockContextV2EvaluationPlan,
  runLockedContextV2Evaluation,
  shouldSampleContextV2Evaluation,
} from "./context-v2-evaluation.js";
import type { ContextV2EvaluationCase } from "./context-v2-evaluation.js";

const hash = (character: string): string => character.repeat(64);

function manifest(corpusContentHash = hash("d")) {
  return buildContextV2CandidateManifest({
    model: { provider: "VERTEX_AI", immutableModelId: "gemini-test-001" },
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 2_000,
      responseSchemaHash: hash("a"),
    },
    prompt: { version: "context-v2-prompt-v1", contentHash: hash("b") },
    contextContractVersion: "CONTEXT_V2",
    evidenceEnvelopeVersion: "CANONICAL_EVIDENCE_READINESS_V1",
    consumerContractVersions: {
      strategy: "CONTEXT_V2_STRATEGY_INPUT_V1",
      cta: "CONTEXT_V2_CTA_INPUT_V1",
      postMedia: "CONTEXT_V2_POST_MEDIA_INPUT_V1",
      outputInterpretation: "CONTEXT_V2_OUTPUT_INTERPRETATION_V1",
      audit: "CONTEXT_V2_AUDIT_V1",
    },
    policyVersions: [{ name: "POST_BF_BASELINE", version: "POST_BF_V1", contentHash: hash("c") }],
    sourceRevision: "d9de77f283553f7eae8991a06c756908a35199e5",
    corpus: {
      version: "DF10_CORPUS_V1",
      contentHash: corpusContentHash,
      rubricVersion: "DF10_RUBRIC_V1",
      rubricContentHash: hash("e"),
    },
    candidateArtifacts: [
      { path: "apps/worker/src/vertex.ts", sha256: hash("f") },
      { path: "apps/worker/src/context-v2.ts", sha256: hash("0") },
    ],
  });
}

function frozenCases(): readonly ContextV2EvaluationCase[] {
  const hex = "123456789abcdef0";
  return DF10_CORPUS_MEMBERSHIP_V1.map((member, index) => ({
    caseId: member.sourceRef.toLocaleLowerCase().replace(/[^a-z0-9]+/gu, "-"),
    ...member,
    contextHash: hash(hex[index % hex.length]!),
    expectedBehavior: `${member.capability}_MUST_PASS`,
    assertions: [
      { assertionId: "safe", kind: "SAFETY" as const, required: true },
      { assertionId: "facts", kind: "FACTUAL" as const, required: true },
      { assertionId: "effects", kind: "SIDE_EFFECT" as const, required: true },
      { assertionId: "behavior", kind: "BEHAVIOR" as const, required: true },
    ],
  }));
}

describe("DF10 exact candidate identity", () => {
  it("canonically fingerprints sorted candidate-affecting artifacts", () => {
    const candidate = manifest();
    expect(candidate.candidateArtifacts.map(({ path }) => path)).toEqual([
      "apps/worker/src/context-v2.ts",
      "apps/worker/src/vertex.ts",
    ]);
    expect(candidate.candidateContentFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(candidate.manifestHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("covers every accepted BF incident plus correction, product switching and order controls", () => {
    for (let issue = 1; issue <= 10; issue += 1) {
      expect(DF10_CORPUS_MEMBERSHIP_V1.some(({ sourceRef }) =>
        sourceRef === `BF-${String(issue).padStart(2, "0")}`
      )).toBe(true);
    }
    expect(DF10_CORPUS_MEMBERSHIP_V1.map(({ capability }) => capability)).toEqual(
      expect.arrayContaining([
        "CORRECTION",
        "PRODUCT_SWITCH",
        "MEDIA",
        "URL",
        "SIZE",
        "ORDER_REVIEW",
        "ORDER_CONFIRMATION",
        "PROTECTED_SIDE_EFFECT",
      ]),
    );
  });
});

describe("DF10 locked asynchronous evaluation", () => {
  it("pre-registers 100% required safety/factual/side-effect thresholds", () => {
    expect(CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1).toMatchObject({
      safetyRequiredPassRate: 1,
      factualRequiredPassRate: 1,
      sideEffectRequiredPassRate: 1,
      mustPassRate: 1,
    });
  });

  it("runs asynchronously without an outbound/state/tool port and binds the exact manifest", async () => {
    const cases = frozenCases();
    const candidate = manifest(contextV2EvaluationCaseSetHash(cases));
    const plan = lockContextV2EvaluationPlan({
      manifest: candidate,
      cases,
      thresholds: CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1,
      preRegisteredAt: "2026-08-16T09:00:00.000Z",
    });
    const evaluateCase = vi.fn(async (_input: Readonly<{
      caseId: string;
      contextHash: string;
    }>) => ({
      candidateOutputHash: hash("2"),
      objectiveQualityScore: 0.95,
      assertions: cases[0]!.assertions.map(({ assertionId, kind }) => ({
        assertionId,
        kind,
        passed: true,
        reasonCode: "ASSERTION_PASSED",
      })),
    }));
    const result = await runLockedContextV2Evaluation({
      plan,
      manifest: candidate,
      cases,
      runStartedAt: "2026-08-16T10:00:00.000Z",
      evaluateCase,
    });
    expect(result.status).toBe("PASS");
    expect(result.manifestHash).toBe(candidate.manifestHash);
    expect(result.planHash).toBe(plan.planHash);
    expect(evaluateCase).toHaveBeenCalledTimes(cases.length);
    expect(Object.keys(evaluateCase.mock.calls[0]?.[0] ?? {})).toEqual([
      "caseId",
      "contextHash",
    ]);
  });

  it("fails required assertions and refuses thresholds registered after the run begins", async () => {
    const cases = frozenCases();
    const candidate = manifest(contextV2EvaluationCaseSetHash(cases));
    const plan = lockContextV2EvaluationPlan({
      manifest: candidate,
      cases,
      thresholds: CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1,
      preRegisteredAt: "2026-08-16T11:00:00.000Z",
    });
    await expect(runLockedContextV2Evaluation({
      plan,
      manifest: candidate,
      cases,
      runStartedAt: "2026-08-16T10:00:00.000Z",
      evaluateCase: async () => ({
        candidateOutputHash: hash("4"),
        objectiveQualityScore: 1,
        assertions: cases[0]!.assertions.map(({ assertionId, kind }) => ({
          assertionId,
          kind,
          passed: false,
          reasonCode: "UNAUTHORIZED_EFFECT",
        })),
      }),
    })).rejects.toThrow("DF10_THRESHOLDS_NOT_PRE_REGISTERED");

    const validPlan = lockContextV2EvaluationPlan({
      manifest: candidate,
      cases,
      thresholds: CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1,
      preRegisteredAt: "2026-08-16T09:00:00.000Z",
    });
    const failed = await runLockedContextV2Evaluation({
      plan: validPlan,
      manifest: candidate,
      cases,
      runStartedAt: "2026-08-16T10:00:00.000Z",
      evaluateCase: async () => ({
        candidateOutputHash: hash("4"),
        objectiveQualityScore: 1,
        assertions: cases[0]!.assertions.map(({ assertionId, kind }) => ({
          assertionId,
          kind,
          passed: kind !== "SIDE_EFFECT",
          reasonCode: kind === "SIDE_EFFECT"
            ? "UNAUTHORIZED_EFFECT"
            : "ASSERTION_PASSED",
        })),
      }),
    });
    expect(failed.status).toBe("FAIL");
    expect(failed.rates.sideEffect).toBe(0);
  });

  it("refuses corpus drift and a manifest mutated after plan lock", async () => {
    const cases = frozenCases();
    expect(() => lockContextV2EvaluationPlan({
      manifest: manifest(),
      cases,
      thresholds: CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1,
      preRegisteredAt: "2026-08-16T09:00:00.000Z",
    })).toThrow("DF10_CORPUS_IDENTITY_MISMATCH");

    const candidate = manifest(contextV2EvaluationCaseSetHash(cases));
    const plan = lockContextV2EvaluationPlan({
      manifest: candidate,
      cases,
      thresholds: CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1,
      preRegisteredAt: "2026-08-16T09:00:00.000Z",
    });
    const mutated = {
      ...candidate,
      prompt: { ...candidate.prompt, version: "context-v2-prompt-mutated" },
    };
    await expect(runLockedContextV2Evaluation({
      plan,
      manifest: mutated,
      cases,
      runStartedAt: "2026-08-16T10:00:00.000Z",
      evaluateCase: async () => {
        throw new Error("must not run");
      },
    })).rejects.toThrow("DF10_MANIFEST_INVALID");
  });

  it("closes the locked-identity mutation matrix before any model call", async () => {
    const cases = frozenCases();
    const candidate = manifest(contextV2EvaluationCaseSetHash(cases));
    const plan = lockContextV2EvaluationPlan({
      manifest: candidate,
      cases,
      thresholds: CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1,
      preRegisteredAt: "2026-08-16T09:00:00.000Z",
    });
    const evaluateCase = vi.fn(async () => {
      throw new Error("must not run");
    });
    const mutations = [
      { ...plan, manifestHash: hash("8") },
      { ...plan, caseSetHash: hash("9") },
      { ...plan, preRegisteredAt: "2026-08-16T08:00:00.000Z" },
      {
        ...plan,
        thresholds: {
          ...plan.thresholds,
          minimumObjectiveQualityScore: 0.1,
        },
      },
    ] as unknown as Array<typeof plan>;
    for (const mutatedPlan of mutations) {
      await expect(runLockedContextV2Evaluation({
        plan: mutatedPlan,
        manifest: candidate,
        cases,
        runStartedAt: "2026-08-16T10:00:00.000Z",
        evaluateCase,
      })).rejects.toThrow();
    }
    expect(evaluateCase).not.toHaveBeenCalled();

    const incompleteCases = cases.slice(1);
    expect(() => lockContextV2EvaluationPlan({
      manifest: manifest(contextV2EvaluationCaseSetHash(incompleteCases)),
      cases: incompleteCases,
      thresholds: CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1,
      preRegisteredAt: "2026-08-16T09:00:00.000Z",
    })).toThrow("DF10_CORPUS_MEMBERSHIP_INCOMPLETE");
  });
});

describe("DF10 deterministic sampling", () => {
  it("is stable, bounded and threshold-version scoped", () => {
    expect(shouldSampleContextV2Evaluation("message-1", 0, "DF10_THRESHOLDS_V1")).toBe(false);
    expect(shouldSampleContextV2Evaluation("message-1", 1, "DF10_THRESHOLDS_V1")).toBe(true);
    const first = shouldSampleContextV2Evaluation("message-1", 0.25, "DF10_THRESHOLDS_V1");
    expect(shouldSampleContextV2Evaluation("message-1", 0.25, "DF10_THRESHOLDS_V1")).toBe(first);
    expect(() => shouldSampleContextV2Evaluation("message-1", 1.1, "DF10_THRESHOLDS_V1"))
      .toThrow("DF10_SAMPLE_RATE_INVALID");
  });
});
