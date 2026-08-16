import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { canonicalJsonV1, type ContextV2 } from "@lana/contracts";
import {
  ContextV2CandidateModel,
  FetchCandidateVertexTransport,
  buildCandidateRequest,
  sanitizeContextV2CandidateInput,
} from "./context-v2-candidate.js";

const hash = (character: string): string => character.repeat(64);

function context(): ContextV2 {
  const draft = {
    schemaVersion: 2 as const,
    contractVersion: "CONTEXT_V2" as const,
    authority: "SHADOW_ONLY" as const,
    finalTurnEvidence: {
      schemaVersion: 2 as const,
      contractVersion: "FINAL_TURN_EVIDENCE_V2" as const,
      sourceMessagePk: "opaque-message-pk-1",
      sourceMessageIdHash: hash("a"),
      preTransitionConversationRevision: 4,
      finalConversationRevision: 5,
      preTransitionSalesCycleRevision: 2,
      finalSalesCycleRevision: 3,
    },
    productBinding: {
      schemaVersion: 2 as const,
      contractVersion: "PRODUCT_BINDING_V2" as const,
      status: "RESOLVED" as const,
      productIds: ["SD398"],
      catalogVersion: "catalog:1",
    },
    dialogueEvidence: {
      act: "REQUEST" as const,
      confidenceBand: "HIGH" as const,
      evidenceHash: hash("b"),
      reasonCodes: ["DIRECT_PURCHASE_VERB" as const],
    },
    verifiedClaimSetHash: hash("c"),
    verifiedClaimTypes: ["PRICE" as const, "SIZE_FIT" as const],
    verifiedClaims: [
      {
        schemaVersion: 1 as const,
        claimId: "00000000-0000-4000-8000-000000000001",
        type: "PRICE" as const,
        scope: { kind: "PRODUCT" as const, productId: "SD398", variantId: null },
        value: { amountVnd: 699_000, currency: "VND" as const },
        provenance: {
          authority: "POS_SNAPSHOT" as const,
          sourceVersion: "pos:1",
          evidenceRef: "internal:price:SD398",
          contentHash: hash("d"),
          observedAt: "2026-08-16T10:00:00.000Z",
          expiresAt: "2026-08-16T10:05:00.000Z",
        },
        authorization: "NONE" as const,
      },
      {
        schemaVersion: 1 as const,
        claimId: "00000000-0000-4000-8000-000000000002",
        type: "SIZE_FIT" as const,
        scope: { kind: "PRODUCT" as const, productId: "SD398", variantId: null },
        value: {
          recommendedSizes: ["M"],
          alternativeSizes: ["L"],
          customerProfileId: "00000000-0000-4000-8000-000000000099",
          customerProfileRevision: 7,
          measurementFingerprint: hash("9"),
          evidenceBasis: "MEASUREMENTS" as const,
        },
        provenance: {
          authority: "VERIFIED_SIZE_ENGINE_V1" as const,
          sourceVersion: "size-v1",
          evidenceRef: "customer-profile-secret",
          contentHash: hash("8"),
          observedAt: "2026-08-16T00:00:00.000Z",
          expiresAt: "2026-08-18T00:00:00.000Z",
        },
        authorization: "NONE" as const,
      },
    ],
    phase: {
      schemaVersion: 2 as const,
      contractVersion: "CONVERSATION_PHASE_V2" as const,
      phase: "CART_ACTIVE" as const,
      source: "CANONICAL_COMMERCE_STATE_V1" as const,
      sourceStage: "CART_OPEN" as const,
      salesCycleRevision: 3,
      authority: "SHADOW_ONLY" as const,
    },
    barriers: {
      schemaVersion: 2 as const,
      contractVersion: "CONVERSATION_BARRIERS_V2" as const,
      active: [],
      lifecycle: "UNTIL_AUTHORITATIVE_STATE_CHANGES" as const,
      conversationRevision: 5,
      salesCycleRevision: 3,
      source: "CANONICAL_EVIDENCE_AND_COMMERCE_STATE_V1" as const,
      authority: "SHADOW_ONLY" as const,
    },
    buyingIntent: {
      decision: "COMMITTED" as const,
      requestedAction: "OPEN_CART" as const,
      productId: "SD398",
      evidenceHash: hash("e"),
    },
    cartReadiness: null,
    ownership: { owner: "BOT" as const, handoffActive: false, reasonCode: null },
    consumerContractVersions: {
      strategy: "CONTEXT_V2_STRATEGY_INPUT_V1" as const,
      cta: "CONTEXT_V2_CTA_INPUT_V1" as const,
      postMedia: "CONTEXT_V2_POST_MEDIA_INPUT_V1" as const,
      outputInterpretation: "CONTEXT_V2_OUTPUT_INTERPRETATION_V1" as const,
      audit: "CONTEXT_V2_AUDIT_V1" as const,
    },
  };
  const contextHash = createHash("sha256")
    .update(`CONTEXT_V2\n${canonicalJsonV1(draft)}`, "utf8")
    .digest("hex");
  return { ...draft, contextHash };
}

function providerPayload() {
  return {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            schemaVersion: 1,
            contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V1",
            reply: "Giá đã xác minh là 699.000đ.",
            strategy: "ANSWER_VERIFIED_FACTS",
            cta: "CONFIRM_CART",
          }),
        }],
      },
    }],
  };
}

describe("Context V2 candidate capability", () => {
  it("sanitizes at the port boundary with an exact allowlisted key-set", () => {
    const sanitized = sanitizeContextV2CandidateInput(context());
    expect(Object.keys(sanitized).sort()).toEqual([
      "barriers",
      "buyingIntent",
      "cartReadiness",
      "contextHash",
      "contractVersion",
      "dialogueEvidence",
      "ownership",
      "phase",
      "productBinding",
      "schemaVersion",
      "verifiedClaims",
    ]);
    expect(JSON.stringify(sanitized)).not.toMatch(
      /claimId|evidenceRef|sourceMessagePk|sourceMessageIdHash|customerHash|customerProfile|measurementFingerprint|phone|address/iu,
    );
  });

  it("pins every candidate-affecting field in the exact request envelope", () => {
    const request = buildCandidateRequest({
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-test",
      context: context(),
    });
    expect(request.identity.requestEnvelopeHash).toBe(
      "65c3933b3908481fa920cf7c44aa3e54bb108944b8500aee8cf6a7540b203b1d",
    );
    expect(request.body).toContain("responseSchema");
    expect(request.body).toContain("safetySettings");
    expect(request.identity).toMatchObject({
      modelResource: expect.stringContaining("gemini-test"),
      systemInstructionHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      promptContentHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      responseSchemaHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      generationConfigHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      safetySettingsHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(() => buildCandidateRequest({
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-test?redirect=https://evil.invalid",
      context: context(),
    })).toThrow("CONTEXT_V2_MODEL_RESOURCE_INVALID");
  });

  it("hashes the request immediately before sending and rejects unknown provider identity", async () => {
    let sent: Readonly<{ url: string; body: string }> | undefined;
    const send = vi.fn(async (request: Readonly<{ url: string; body: string }>) => {
      sent = request;
      return {
      payload: providerPayload(),
      providerModelVersion: "gemini-test@20260816",
      };
    });
    const model = new ContextV2CandidateModel(
      "projects/test/locations/us-central1/publishers/google/models/gemini-test",
      { send },
    );
    const generated = await model.generateCandidate(context());
    expect(send).toHaveBeenCalledOnce();
    const rebuilt = buildCandidateRequest({
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-test",
      context: context(),
    });
    expect(sent).toEqual({ url: rebuilt.url, body: rebuilt.body });
    expect(generated.requestIdentity.requestEnvelopeHash).toBe(
      rebuilt.identity.requestEnvelopeHash,
    );
    expect(generated.providerModelVersion).toBe("gemini-test@20260816");

    await expect(new ContextV2CandidateModel(
      "projects/test/locations/us-central1/publishers/google/models/gemini-test",
      {
      send: vi.fn(async () => ({
        payload: providerPayload(),
        providerModelVersion: "unknown",
      })),
      },
    ).generateCandidate(context())).rejects.toThrow(
      "CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_UNKNOWN",
    );
  });

  it("bounds candidate provider requests with an abort timeout", async () => {
    vi.useFakeTimers();
    try {
      const transport = new FetchCandidateVertexTransport(
        async () => "token",
        vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>(
          (_resolve, reject) => init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
          ),
        )) as unknown as typeof fetch,
        1_000,
      );
      const pending = transport.send({ url: "https://example.invalid", body: "{}" });
      const rejection = expect(pending).rejects.toThrow(
        "CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT",
      );
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(1_000);
      await rejection;

      const tokenBlocked = new FetchCandidateVertexTransport(
        () => new Promise<string>(() => undefined),
        vi.fn() as unknown as typeof fetch,
        1_000,
      ).send({ url: "https://example.invalid", body: "{}" });
      const tokenRejection = expect(tokenBlocked).rejects.toThrow(
        "CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT",
      );
      await vi.advanceTimersByTimeAsync(1_000);
      await tokenRejection;
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps candidate code outside baseline and live runtime imports", () => {
    const candidateSource = readFileSync(
      new URL("./context-v2-candidate.ts", import.meta.url),
      "utf8",
    );
    const baselineSource = readFileSync(
      new URL("./vertex-baseline.ts", import.meta.url),
      "utf8",
    );
    const realtimeSource = readFileSync(
      new URL("./realtime-runner.ts", import.meta.url),
      "utf8",
    );
    expect(candidateSource).not.toMatch(/meta-outbox|pancake|realtime-runner|database/iu);
    expect(baselineSource).not.toMatch(/from\s+["'].+context-v2-candidate/iu);
    expect(baselineSource).not.toContain("generateCandidate");
    expect(realtimeSource).not.toMatch(/context-v2-candidate/iu);
  });
});
