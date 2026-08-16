import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { canonicalJsonV1, type ContextV2 } from "@lana/contracts";
import {
  deriveCandidateRequestIdentity,
  type BuiltCandidateRequest,
} from "./context-v2-candidate.js";
import {
  ContextV2CandidateRunner,
  DF10_GATE_E_PLAN_ARTIFACT_SHA256,
  createGateEEvaluationManifest,
  selectedForGateE,
  validateScoredCandidateIdentity,
} from "./context-v2-evaluation.js";
import { ContextV2CandidateWorker } from "./context-v2-candidate-worker.js";

function selectedItemId(): string {
  for (let index = 0; index < 10_000; index += 1) {
    const value = `corpus-item-${index}`;
    if (selectedForGateE(value)) return value;
  }
  throw new Error("TEST_SAMPLE_ID_NOT_FOUND");
}

function request(): BuiltCandidateRequest {
  const url = "https://aiplatform.googleapis.com/v1/projects/test/locations/us-central1/publishers/google/models/gemini-test:generateContent";
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
  it("pins the source-owned plan and samples deterministically", () => {
    expect(DF10_GATE_E_PLAN_ARTIFACT_SHA256).toBe(
      "2d20b436a7f5162a26bd04f91a54edc5fcc03188206fe646c67909a5004d5620",
    );
    const contract = readFileSync(new URL(
      "../../../docs/current/architecture-program/contracts/MODEL_EVALUATION_BOUNDARY.md",
      import.meta.url,
    ), "utf8");
    expect(contract).toContain(DF10_GATE_E_PLAN_ARTIFACT_SHA256);
    expect(contract).toContain("No corpus, scored run, Gate E");
    const itemId = selectedItemId();
    expect(selectedForGateE(itemId)).toBe(true);
    expect(selectedForGateE(itemId)).toBe(true);
  });

  it("derives manifest identity from the exact request instead of caller metadata", () => {
    const corpusItemId = selectedItemId();
    const built = request();
    const manifest = createGateEEvaluationManifest({
      registrationCommit: "a".repeat(40),
      runStartedAt: new Date("2026-08-17T01:00:00.000+07:00"),
      corpusHash: "b".repeat(64),
      requests: [{ corpusItemId, request: built }],
    });
    expect(manifest.requests[0]?.requestIdentity).toEqual(built.identity);
    expect(manifest.requests[0]?.contextHash).toBe("c".repeat(64));
    expect(validateScoredCandidateIdentity({
      manifest,
      corpusItemId,
      observedRequestIdentity: built.identity,
      providerModelVersion: "gemini-test@20260817",
    })).toMatchObject({
      disposition: "IDENTITY_ADMISSIBLE",
      providerModelVersion: "gemini-test@20260817",
    });

    expect(() => createGateEEvaluationManifest({
      registrationCommit: "a".repeat(40),
      runStartedAt: new Date("2026-08-17T01:00:00.000+07:00"),
      corpusHash: "b".repeat(64),
      requests: [{
        corpusItemId,
        request: { ...built, body: `${built.body} ` },
      }],
    })).toThrow("DF10_REQUEST_ENVELOPE_IDENTITY_INVALID");
  });

  it("rejects self-attested run timing, request drift, and unknown model identity", () => {
    const corpusItemId = selectedItemId();
    const built = request();
    expect(() => createGateEEvaluationManifest({
      registrationCommit: "a".repeat(40),
      runStartedAt: new Date("2026-08-17T00:00:00.000+07:00"),
      corpusHash: "b".repeat(64),
      requests: [{ corpusItemId, request: built }],
    })).toThrow("DF10_RUN_NOT_AFTER_PRE_REGISTRATION");
    const manifest = createGateEEvaluationManifest({
      registrationCommit: "a".repeat(40),
      runStartedAt: new Date("2026-08-17T01:00:00.000+07:00"),
      corpusHash: "b".repeat(64),
      requests: [{ corpusItemId, request: built }],
    });
    expect(() => validateScoredCandidateIdentity({
      manifest,
      corpusItemId,
      observedRequestIdentity: {
        ...built.identity,
        promptContentHash: "d".repeat(64),
      },
      providerModelVersion: "gemini-test@20260817",
    })).toThrow("DF10_REQUEST_IDENTITY_MISMATCH");
    expect(() => validateScoredCandidateIdentity({
      manifest,
      corpusItemId,
      observedRequestIdentity: built.identity,
      providerModelVersion: "unknown",
    })).toThrow("DF10_PROVIDER_MODEL_IDENTITY_UNKNOWN");
  });

  it("rejects a manifest mutated after registration", () => {
    const corpusItemId = selectedItemId();
    const built = request();
    const manifest = createGateEEvaluationManifest({
      registrationCommit: "a".repeat(40),
      runStartedAt: new Date("2026-08-17T01:00:00.000+07:00"),
      corpusHash: "b".repeat(64),
      requests: [{ corpusItemId, request: built }],
    });
    expect(() => validateScoredCandidateIdentity({
      manifest: { ...manifest, corpusHash: "d".repeat(64) },
      corpusItemId,
      observedRequestIdentity: built.identity,
      providerModelVersion: "gemini-test@20260817",
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
      claimContextV2CandidateNext,
      completeContextV2Candidate: vi.fn(),
      failContextV2Candidate: vi.fn(),
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
    expect(store.assertContextV2CaptureReadReady).toHaveBeenCalledBefore(
      claimContextV2CandidateNext,
    );
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
        providerModelVersion: "gemini-test@20260817",
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
    }, model);
    await expect(runner.processOne()).resolves.toBe("CLAIMED");
    expect(model.generateCandidate).toHaveBeenCalledOnce();
    expect(completeContextV2Candidate).toHaveBeenCalledWith(
      expect.objectContaining({ requestIdentity }),
    );
  });

  it.each([
    ["CONTEXT_V2_CANDIDATE_RESPONSE_INVALID", false],
    ["CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_UNKNOWN", false],
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
});
