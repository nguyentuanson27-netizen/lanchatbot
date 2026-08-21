import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { canonicalJsonV1, type ContextV2 } from "@lana/contracts";
import {
  CONTEXT_V2_CANDIDATE_MODEL_ID,
  CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
  ContextV2CandidateModel,
  FetchCandidateVertexTransport,
  buildCandidateRequest,
  sanitizeCandidateClaimValue,
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
      sourceMessagePk: "11111111-1111-4111-8111-111111111111",
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
            schemaVersion: 2,
            contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
            contextHash: hash("c"),
            productBinding: { status: "RESOLVED", productIds: ["SD398"] },
            segments: [{
              kind: "VERIFIED_CLAIM",
              text: "Giá đã xác minh là 699.000đ.",
              claimContentHash: hash("1"),
            }],
            strategy: "ANSWER_VERIFIED_FACTS",
            cta: "CONFIRM_CART",
          }),
        }],
      },
    }],
  };
}

describe("Context V2 candidate capability", () => {
  it("projects every protected claim value through an exhaustive allowlist", () => {
    const cases = {
      PRICE: [{ amountVnd: 699_000, currency: "VND", secret: "drop" }, ["amountVnd", "currency"]],
      STOCK: [{ status: "IN_STOCK", availableQuantity: 2, secret: "drop" }, ["availableQuantity", "status"]],
      SIZE_FIT: [{ recommendedSizes: ["M"], alternativeSizes: ["L"], evidenceBasis: "MEASUREMENTS", customerProfileId: "drop", customerProfileRevision: 7, measurementFingerprint: hash("9") }, ["alternativeSizes", "evidenceBasis", "recommendedSizes"]],
      ETA: [{ minDays: 1, maxDays: 3, secret: "drop" }, ["maxDays", "minDays"]],
      SHIPPING_FEE: [{ amountVnd: 30_000, currency: "VND", secret: "drop" }, ["amountVnd", "currency"]],
      FREESHIP: [{ eligible: true, secret: "drop" }, ["eligible"]],
      PROMOTION_OFFER: [{ adjustmentId: "promo-1", amountVnd: 50_000, secret: "drop" }, ["adjustmentId", "amountVnd"]],
      PRODUCT_MEDIA: [{ assetId: "asset-1", assetSha256: hash("7"), secret: "drop" }, ["assetId", "assetSha256"]],
    } as const;
    expect(Object.keys(cases).sort()).toEqual([
      "ETA", "FREESHIP", "PRICE", "PRODUCT_MEDIA", "PROMOTION_OFFER",
      "SHIPPING_FEE", "SIZE_FIT", "STOCK",
    ]);
    for (const [type, [value, keys]] of Object.entries(cases)) {
      expect(Object.keys(sanitizeCandidateClaimValue(
        type as keyof typeof cases,
        value,
      )).sort()).toEqual([...keys].sort());
    }
  });

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
      modelResource: `projects/test/locations/us-central1/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}`,
      context: context(),
    });
    expect(request.identity.requestEnvelopeHash).toBe(
      "bc634547837d9144ddc7f5b5d3ba44a580c44c5d342355c3aca7b41975a72039",
    );
    expect(request.body).toContain("responseSchema");
    expect(request.body).toContain("safetySettings");
    const body = JSON.parse(request.body) as {
      systemInstruction: { parts: Array<{ text: string }> };
      generationConfig: {
        responseSchema: {
          additionalProperties?: unknown;
          properties: {
            schemaVersion: Record<string, unknown>;
            productBinding: { additionalProperties?: unknown };
            segments: {
              items: { additionalProperties?: unknown };
            };
          };
        };
        temperature?: unknown;
        topP?: unknown;
      };
    };
    const instruction = body.systemInstruction.parts[0]!.text;
    expect(instruction).toContain("PRODUCT_CONTEXT_UNREADY");
    expect(instruction).toContain("MEASUREMENTS_REQUIRED");
    expect(instruction).toContain("ORDER_REVIEW");
    expect(instruction).toContain("ORDER_CONFIRMED");
    expect(instruction).toContain("Do not mention an internal cart");
    expect(instruction).toContain("Avoid formal bot phrases");
    expect(instruction).toContain(
      "state every eligible PRODUCT_MEDIA claim exactly once",
    );
    expect(instruction).toContain(
      "Do not claim stock, availability, price, delivery",
    );
    expect(instruction).not.toContain("giỏ hàng");
    expect(body.generationConfig.responseSchema.properties.schemaVersion).toEqual({
      type: "INTEGER",
      minimum: 2,
      maximum: 2,
    });
    expect(body.generationConfig.responseSchema).not.toHaveProperty(
      "additionalProperties",
    );
    expect(body.generationConfig.responseSchema.properties.productBinding)
      .not.toHaveProperty("additionalProperties");
    expect(body.generationConfig.responseSchema.properties.segments.items)
      .not.toHaveProperty("additionalProperties");
    expect(body.generationConfig).not.toHaveProperty("temperature");
    expect(body.generationConfig).not.toHaveProperty("topP");
    expect(request.identity).toMatchObject({
      modelResource: expect.stringContaining(CONTEXT_V2_CANDIDATE_MODEL_ID),
      systemInstructionHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      promptContentHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      responseSchemaHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      generationConfigHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      safetySettingsHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(() => buildCandidateRequest({
      modelResource: `projects/test/locations/us-central1/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}?redirect=https://evil.invalid`,
      context: context(),
    })).toThrow("CONTEXT_V2_MODEL_RESOURCE_INVALID");
    expect(() => buildCandidateRequest({
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-test",
      context: context(),
    })).toThrow("CONTEXT_V2_MODEL_RESOURCE_INVALID");
  });

  it("hashes the request immediately before sending and rejects unknown provider identity", async () => {
    let sent: Readonly<{ url: string; body: string }> | undefined;
    const send = vi.fn(async (request: Readonly<{ url: string; body: string }>) => {
      sent = request;
      return {
      payload: providerPayload(),
      providerModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
      };
    });
    const model = new ContextV2CandidateModel(
      `projects/test/locations/us-central1/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}`,
      { send },
    );
    const generated = await model.generateCandidate(context());
    expect(send).toHaveBeenCalledOnce();
    const rebuilt = buildCandidateRequest({
      modelResource: `projects/test/locations/us-central1/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}`,
      context: context(),
    });
    expect(sent).toEqual({ url: rebuilt.url, body: rebuilt.body });
    expect(generated.requestIdentity.requestEnvelopeHash).toBe(
      rebuilt.identity.requestEnvelopeHash,
    );
    expect(generated.providerModelVersion).toBe(
      CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
    );

    await expect(new ContextV2CandidateModel(
      `projects/test/locations/us-central1/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}`,
      {
      send: vi.fn(async () => ({
        payload: providerPayload(),
        providerModelVersion: "unknown",
      })),
      },
    ).generateCandidate(context())).rejects.toThrow(
      "CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_UNKNOWN",
    );
    await expect(new ContextV2CandidateModel(
      `projects/test/locations/us-central1/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}`,
      {
        send: vi.fn(async () => ({
          payload: providerPayload(),
          providerModelVersion: `${CONTEXT_V2_CANDIDATE_PROVIDER_VERSION}@unregistered`,
        })),
      },
    ).generateCandidate(context())).rejects.toThrow(
      "CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_MISMATCH",
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

      let tokenSignal: AbortSignal | undefined;
      const tokenBlocked = new FetchCandidateVertexTransport(
        (signal) => {
          tokenSignal = signal;
          return new Promise<string>(() => undefined);
        },
        vi.fn() as unknown as typeof fetch,
        1_000,
      ).send({ url: "https://example.invalid", body: "{}" });
      const tokenRejection = expect(tokenBlocked).rejects.toThrow(
        "CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT",
      );
      await vi.advanceTimersByTimeAsync(1_000);
      await tokenRejection;
      expect(tokenSignal?.aborted).toBe(true);

      const bodyBlocked = new FetchCandidateVertexTransport(
        async () => "token",
        vi.fn(async () => ({
          ok: true,
          headers: new Headers(),
          json: () => new Promise<unknown>(() => undefined),
        } as Response)) as unknown as typeof fetch,
        1_000,
      ).send({ url: "https://example.invalid", body: "{}" });
      const bodyRejection = expect(bodyBlocked).rejects.toThrow(
        "CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT",
      );
      await vi.advanceTimersByTimeAsync(1_000);
      await bodyRejection;
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    [403, "RUN_BLOCKING_CONFIGURATION", "CONTEXT_V2_CANDIDATE_PROVIDER_CONFIGURATION"],
    [429, "RETRYABLE_TRANSIENT", "CONTEXT_V2_CANDIDATE_PROVIDER_TRANSIENT"],
    [503, "RETRYABLE_TRANSIENT", "CONTEXT_V2_CANDIDATE_PROVIDER_TRANSIENT"],
  ] as const)("classifies provider HTTP %s without persisting response details", async (
    status,
    scope,
    message,
  ) => {
    const transport = new FetchCandidateVertexTransport(
      async () => "token",
      vi.fn(async () => ({ ok: false, status } as Response)) as unknown as typeof fetch,
    );
    await expect(transport.send({
      url: "https://example.invalid",
      body: "{}",
    })).rejects.toMatchObject({
      message,
      scope,
      statusClass: status >= 500 ? "5XX" : "4XX",
    });
  });

  it("classifies token acquisition failure as run configuration without leaking details", async () => {
    const transport = new FetchCandidateVertexTransport(
      async () => { throw new Error("secret credential detail"); },
      vi.fn() as unknown as typeof fetch,
    );
    await expect(transport.send({
      url: "https://example.invalid",
      body: "{}",
    })).rejects.toMatchObject({
      message: "CONTEXT_V2_CANDIDATE_ACCESS_TOKEN_MISSING",
      scope: "RUN_BLOCKING_CONFIGURATION",
      statusClass: "AUTH",
    });
  });

  it("classifies caller cancellation as run-level instead of retryable item failure", async () => {
    const controller = new AbortController();
    const transport = new FetchCandidateVertexTransport(
      async () => "token",
      vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>(
        (_resolve, reject) => init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        ),
      )) as unknown as typeof fetch,
    );
    const pending = transport.send({
      url: "https://example.invalid",
      body: "{}",
      signal: controller.signal,
    });
    controller.abort("owner-cancelled");
    await expect(pending).rejects.toMatchObject({
      message: "CONTEXT_V2_CANDIDATE_CALLER_ABORTED",
      scope: "RUN_BLOCKING_CONFIGURATION",
      statusClass: "OTHER",
    });
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
