import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { canonicalJsonV1, type ContextV2 } from "@lana/contracts";
import {
  CandidateProviderError,
  CONTEXT_V2_CANDIDATE_MODEL_ID,
  CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
  deriveCandidateRequestIdentity,
  type BuiltCandidateRequest,
} from "./context-v2-candidate.js";
import {
  ContextV2CandidateRunner,
  DF10_GATE_E_PLAN_V1,
  DF10_GATE_E_PLAN_ARTIFACT_SHA256,
  createDraftEvaluationManifest,
  selectedForDiagnosticEvaluation,
  validateDraftCandidateIdentity,
} from "./context-v2-evaluation.js";
import { ContextV2CandidateWorker } from "./context-v2-candidate-worker.js";

function selectedDiagnosticItemId(): string {
  for (let index = 0; index < 10_000; index += 1) {
    const value = `corpus-item-${index}`;
    if (selectedForDiagnosticEvaluation(value)) return value;
  }
  throw new Error("TEST_SAMPLE_ID_NOT_FOUND");
}

function unselectedDiagnosticItemId(): string {
  for (let index = 0; index < 10_000; index += 1) {
    const value = `corpus-item-unselected-${index}`;
    if (!selectedForDiagnosticEvaluation(value)) return value;
  }
  throw new Error("TEST_UNSAMPLED_ID_NOT_FOUND");
}

function request(): BuiltCandidateRequest {
  const url = `https://aiplatform.googleapis.com/v1/projects/test/locations/us-central1/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: "system" }] },
    contents: [{
      role: "user",
      parts: [{ text: canonicalJsonV1({ contextHash: "c".repeat(64) }) }],
    }],
    generationConfig: {
      temperature: 0,
      responseSchema: { type: "OBJECT" },
    },
    safetySettings: [{ category: "SAFE", threshold: "BLOCK" }],
  });
  return { url, body, identity: deriveCandidateRequestIdentity({ url, body }) };
}

describe("DF10 pre-registered evaluation governance", () => {
  it("marks the plan draft-unregistered and limits sampling to diagnostics", () => {
    expect(DF10_GATE_E_PLAN_ARTIFACT_SHA256).toBe(
      "eb399698f5e82dbe6d401c360e035b58f14153add9b5f434629751045565373a",
    );
    expect(DF10_GATE_E_PLAN_V1.registrationStatus).toBe("DRAFT_UNREGISTERED");
    expect(DF10_GATE_E_PLAN_V1.scoredCorpus.inclusion).toBe(
      "ALL_FROZEN_CORPUS_ITEMS",
    );
    expect(DF10_GATE_E_PLAN_V1.scoredCorpus.mandatoryStrata).toEqual([
      "CLAIM_SAFETY", "CONTEXT_INTEGRITY", "SIDE_EFFECT_SAFETY", "MUST_PASS",
    ]);
    expect(DF10_GATE_E_PLAN_V1.thresholds).not.toHaveProperty(
      "qualityDeltaMinimum",
    );
    expect(DF10_GATE_E_PLAN_V1.diagnostics.qualityDeltaMinimum).toBe(0);
    const contract = readFileSync(new URL(
      "../../../docs/current/architecture-program/contracts/MODEL_EVALUATION_BOUNDARY.md",
      import.meta.url,
    ), "utf8");
    expect(contract).toContain(DF10_GATE_E_PLAN_ARTIFACT_SHA256);
    expect(contract).toContain("No corpus, scored run, Gate E");
    expect(contract).toContain("DRAFT_UNREGISTERED");
    const itemId = selectedDiagnosticItemId();
    expect(selectedForDiagnosticEvaluation(itemId)).toBe(true);
    expect(selectedForDiagnosticEvaluation(itemId)).toBe(true);
  });

  it("includes every frozen corpus item independent of diagnostic sampling", () => {
    const corpusItemId = selectedDiagnosticItemId();
    const unsampledItemId = unselectedDiagnosticItemId();
    const built = request();
    const manifest = createDraftEvaluationManifest({
      corpusHash: "b".repeat(64),
      requests: [
        { corpusItemId, request: built },
        { corpusItemId: unsampledItemId, request: built },
      ],
    });
    expect(manifest.admissibility).toBe("DRAFT_UNREGISTERED");
    expect(manifest.requests.map(({ corpusItemId: id }) => id)).toEqual(
      [corpusItemId, unsampledItemId].sort(),
    );
    expect(validateDraftCandidateIdentity({
      manifest,
      corpusItemId,
      observedRequestIdentity: built.identity,
      providerModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
    })).toMatchObject({
      disposition: "DRAFT_IDENTITY_MATCHED",
      providerModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
    });

    expect(() => createDraftEvaluationManifest({
      corpusHash: "b".repeat(64),
      requests: [{
        corpusItemId,
        request: { ...built, body: `${built.body} ` },
      }],
    })).toThrow("DF10_REQUEST_ENVELOPE_IDENTITY_INVALID");
    const wrongModelUrl =
      "https://aiplatform.googleapis.com/v1/projects/test/locations/us-central1/publishers/google/models/gemini-other:generateContent";
    expect(() => createDraftEvaluationManifest({
      corpusHash: "b".repeat(64),
      requests: [{
        corpusItemId,
        request: {
          url: wrongModelUrl,
          body: built.body,
          identity: deriveCandidateRequestIdentity({
            url: wrongModelUrl,
            body: built.body,
          }),
        },
      }],
    })).toThrow("DF10_REQUEST_MODEL_IDENTITY_MISMATCH");
  });

  it("has no caller-supplied pre-registration escape hatch", () => {
    const source = readFileSync(new URL(
      "./context-v2-evaluation.ts",
      import.meta.url,
    ), "utf8");
    expect(source).not.toContain("preRegisteredAt");
    expect(source).not.toContain("registrationCommit: string");
    expect(source).not.toContain("IDENTITY_ADMISSIBLE");
  });

  it("rejects request drift and non-registered provider identity", () => {
    const corpusItemId = selectedDiagnosticItemId();
    const built = request();
    const manifest = createDraftEvaluationManifest({
      corpusHash: "b".repeat(64),
      requests: [{ corpusItemId, request: built }],
    });
    expect(() => validateDraftCandidateIdentity({
      manifest,
      corpusItemId,
      observedRequestIdentity: {
        ...built.identity,
        promptContentHash: "d".repeat(64),
      },
      providerModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
    })).toThrow("DF10_REQUEST_IDENTITY_MISMATCH");
    expect(() => validateDraftCandidateIdentity({
      manifest,
      corpusItemId,
      observedRequestIdentity: built.identity,
      providerModelVersion: "unknown",
    })).toThrow("DF10_PROVIDER_MODEL_IDENTITY_UNKNOWN");
    expect(() => validateDraftCandidateIdentity({
      manifest,
      corpusItemId,
      observedRequestIdentity: built.identity,
      providerModelVersion: `${CONTEXT_V2_CANDIDATE_PROVIDER_VERSION}@other`,
    })).toThrow("DF10_PROVIDER_MODEL_IDENTITY_MISMATCH");
  });

  it("rejects a manifest mutated after registration", () => {
    const corpusItemId = selectedDiagnosticItemId();
    const built = request();
    const manifest = createDraftEvaluationManifest({
      corpusHash: "b".repeat(64),
      requests: [{ corpusItemId, request: built }],
    });
    expect(() => validateDraftCandidateIdentity({
      manifest: { ...manifest, corpusHash: "d".repeat(64) },
      corpusItemId,
      observedRequestIdentity: built.identity,
      providerModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
    })).toThrow("DF10_MANIFEST_INTEGRITY_INVALID");
  });
});

describe("async Context V2 candidate runner", () => {
  it("probes capture SELECT permission before the first queue claim", async () => {
    const claimContextV2CandidateNext = vi.fn(async () => ({
      kind: "NONE" as const,
    }));
    const store = {
      assertContextV2CaptureReadReady: vi.fn(async () => undefined),
      enqueueContextV2CandidateCaptures: vi.fn(async () => 0),
      claimContextV2CandidateNext,
      completeContextV2Candidate: vi.fn(),
      failContextV2Candidate: vi.fn(),
      releaseContextV2CandidateRunBlocked: vi.fn(),
    };
    const worker = new ContextV2CandidateWorker(store, {
      generateCandidate: vi.fn(),
    });
    await expect(worker.processOne()).rejects.toThrow(
      "CONTEXT_V2_CANDIDATE_WORKER_NOT_READY",
    );
    expect(claimContextV2CandidateNext).not.toHaveBeenCalled();
    await worker.initialize();
    await expect(worker.processOne()).resolves.toBe("NONE");
    expect(store.enqueueContextV2CandidateCaptures).toHaveBeenCalledTimes(2);
    expect(store.enqueueContextV2CandidateCaptures.mock.calls).toEqual([
      [], [1],
    ]);
    expect(store.assertContextV2CaptureReadReady).toHaveBeenCalledBefore(
      store.enqueueContextV2CandidateCaptures,
    );
    expect(store.enqueueContextV2CandidateCaptures).toHaveBeenCalledBefore(
      claimContextV2CandidateNext,
    );
  });

  it("does not become ready or claim work when population fails", async () => {
    const claimContextV2CandidateNext = vi.fn();
    const worker = new ContextV2CandidateWorker({
      assertContextV2CaptureReadReady: vi.fn(async () => undefined),
      enqueueContextV2CandidateCaptures: vi.fn(async (_limit?: number) => {
        throw new Error("CONTEXT_V2_CANDIDATE_QUEUE_WRITE_UNAVAILABLE");
      }),
      claimContextV2CandidateNext,
      completeContextV2Candidate: vi.fn(),
      failContextV2Candidate: vi.fn(),
      releaseContextV2CandidateRunBlocked: vi.fn(),
    }, { generateCandidate: vi.fn() });
    await expect(worker.initialize()).rejects.toThrow(
      "CONTEXT_V2_CANDIDATE_QUEUE_WRITE_UNAVAILABLE",
    );
    await expect(worker.processOne()).rejects.toThrow(
      "CONTEXT_V2_CANDIDATE_WORKER_NOT_READY",
    );
    expect(claimContextV2CandidateNext).not.toHaveBeenCalled();
  });

  it("syncs newly terminal captures before every claim", async () => {
    const order: string[] = [];
    const worker = new ContextV2CandidateWorker({
      assertContextV2CaptureReadReady: vi.fn(async () => {
        order.push("ready");
      }),
      enqueueContextV2CandidateCaptures: vi.fn(async () => {
        order.push("populate");
        return 1;
      }),
      claimContextV2CandidateNext: vi.fn(async () => {
        order.push("claim");
        return { kind: "NONE" as const };
      }),
      completeContextV2Candidate: vi.fn(),
      failContextV2Candidate: vi.fn(),
      releaseContextV2CandidateRunBlocked: vi.fn(),
    }, { generateCandidate: vi.fn() });
    await worker.initialize();
    await worker.processOne();
    await worker.processOne();
    expect(order).toEqual([
      "ready", "populate", "populate", "claim", "populate", "claim",
    ]);
  });

  it.each(["NONE", "DEFERRED", "TERMINAL"] as const)(
    "does not call a model for %s claim outcomes",
    async (kind) => {
      const model = { generateCandidate: vi.fn() };
      const runner = new ContextV2CandidateRunner({
        claimContextV2CandidateNext: vi.fn(async () => kind === "NONE"
          ? { kind }
          : { kind, reasonCode: `TEST_${kind}` }),
        completeContextV2Candidate: vi.fn(),
        failContextV2Candidate: vi.fn(),
        releaseContextV2CandidateRunBlocked: vi.fn(),
      }, model);
      await expect(runner.processOne()).resolves.toBe(kind);
      expect(model.generateCandidate).not.toHaveBeenCalled();
    },
  );

  it("calls the candidate only for a claimed integrity-valid snapshot", async () => {
    const completeContextV2Candidate = vi.fn(async () => undefined);
    const requestIdentity = request().identity;
    const model = {
      generateCandidate: vi.fn(async () => ({
        output: {
          schemaVersion: 1 as const,
          contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V1" as const,
          reply: "candidate",
          strategy: "HOLD_POSITION" as const,
          cta: "NONE" as const,
        },
        providerModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
        requestIdentity,
      })),
    };
    const runner = new ContextV2CandidateRunner({
      claimContextV2CandidateNext: vi.fn(async () => ({
        kind: "CLAIMED" as const,
        evaluationId: "evaluation-1",
        claimToken: "claim-1",
        context: {} as ContextV2,
      })),
      completeContextV2Candidate,
      failContextV2Candidate: vi.fn(),
      releaseContextV2CandidateRunBlocked: vi.fn(),
    }, model);
    await expect(runner.processOne()).resolves.toBe("CLAIMED");
    expect(model.generateCandidate).toHaveBeenCalledOnce();
    expect(completeContextV2Candidate).toHaveBeenCalledWith(
      expect.objectContaining({ requestIdentity }),
    );
  });

  it.each([
    ["CONTEXT_V2_CANDIDATE_RESPONSE_INVALID", false],
    ["CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT", true],
    ["untrusted provider detail", true],
  ] as const)("classifies %s without leaking details or looping", async (
    message,
    retryable,
  ) => {
    const failContextV2Candidate = vi.fn(async () => undefined);
    const runner = new ContextV2CandidateRunner({
      claimContextV2CandidateNext: vi.fn(async () => ({
        kind: "CLAIMED" as const,
        evaluationId: "evaluation-1",
        claimToken: "claim-1",
        context: {} as ContextV2,
      })),
      completeContextV2Candidate: vi.fn(),
      failContextV2Candidate,
      releaseContextV2CandidateRunBlocked: vi.fn(),
    }, {
      generateCandidate: vi.fn(async () => {
        throw new Error(message);
      }),
    });
    await expect(runner.processOne()).resolves.toBe("CLAIMED");
    expect(failContextV2Candidate).toHaveBeenCalledWith({
      evaluationId: "evaluation-1",
      claimToken: "claim-1",
      errorCode: message === "untrusted provider detail"
        ? "CONTEXT_V2_CANDIDATE_FAILED"
        : message,
      retryable,
    });
  });

  it.each([
    "CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_UNKNOWN",
    "CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_MISMATCH",
  ])("releases %s without consuming an item attempt and blocks the run", async (
    message,
  ) => {
    const releaseContextV2CandidateRunBlocked = vi.fn(async () => undefined);
    const failContextV2Candidate = vi.fn();
    const runner = new ContextV2CandidateRunner({
      claimContextV2CandidateNext: vi.fn(async () => ({
        kind: "CLAIMED" as const,
        evaluationId: "evaluation-1",
        claimToken: "claim-1",
        context: {} as ContextV2,
      })),
      completeContextV2Candidate: vi.fn(),
      failContextV2Candidate,
      releaseContextV2CandidateRunBlocked,
    }, {
      generateCandidate: vi.fn(async () => {
        throw new Error(message);
      }),
    });

    await expect(runner.processOne()).rejects.toThrow(
      "CONTEXT_V2_CANDIDATE_RUN_BLOCKED_MODEL_IDENTITY",
    );
    expect(releaseContextV2CandidateRunBlocked).toHaveBeenCalledWith({
      evaluationId: "evaluation-1",
      claimToken: "claim-1",
      reasonCode: message,
    });
    expect(failContextV2Candidate).not.toHaveBeenCalled();
  });

  it("releases a provider configuration failure without consuming the item", async () => {
    const releaseContextV2CandidateRunBlocked = vi.fn(async () => undefined);
    const failContextV2Candidate = vi.fn();
    const runner = new ContextV2CandidateRunner({
      claimContextV2CandidateNext: vi.fn(async () => ({
        kind: "CLAIMED" as const,
        evaluationId: "evaluation-1",
        claimToken: "claim-1",
        context: {} as ContextV2,
      })),
      completeContextV2Candidate: vi.fn(),
      failContextV2Candidate,
      releaseContextV2CandidateRunBlocked,
    }, {
      generateCandidate: vi.fn(async () => {
        throw new CandidateProviderError(
          "CONTEXT_V2_CANDIDATE_PROVIDER_CONFIGURATION",
          "RUN_BLOCKING_CONFIGURATION",
          "4XX",
        );
      }),
    });

    await expect(runner.processOne()).rejects.toThrow(
      "CONTEXT_V2_CANDIDATE_RUN_BLOCKED_CONFIGURATION",
    );
    expect(releaseContextV2CandidateRunBlocked).toHaveBeenCalledWith({
      evaluationId: "evaluation-1",
      claimToken: "claim-1",
      reasonCode: "CONTEXT_V2_CANDIDATE_PROVIDER_CONFIGURATION",
    });
    expect(failContextV2Candidate).not.toHaveBeenCalled();
  });

  it("retries a typed transient provider failure with only its safe code", async () => {
    const failContextV2Candidate = vi.fn(async () => undefined);
    const runner = new ContextV2CandidateRunner({
      claimContextV2CandidateNext: vi.fn(async () => ({
        kind: "CLAIMED" as const,
        evaluationId: "evaluation-1",
        claimToken: "claim-1",
        context: {} as ContextV2,
      })),
      completeContextV2Candidate: vi.fn(),
      failContextV2Candidate,
      releaseContextV2CandidateRunBlocked: vi.fn(),
    }, {
      generateCandidate: vi.fn(async () => {
        throw new CandidateProviderError(
          "CONTEXT_V2_CANDIDATE_PROVIDER_TRANSIENT",
          "RETRYABLE_TRANSIENT",
          "5XX",
        );
      }),
    });

    await expect(runner.processOne()).resolves.toBe("CLAIMED");
    expect(failContextV2Candidate).toHaveBeenCalledWith({
      evaluationId: "evaluation-1",
      claimToken: "claim-1",
      errorCode: "CONTEXT_V2_CANDIDATE_PROVIDER_TRANSIENT",
      retryable: true,
    });
  });
});
