import { describe, expect, it, vi } from "vitest";
import {
  buildProductAttributesV1,
  hashProductPresentationEvidenceV1,
  type CanonicalDecisionEvidenceV1,
} from "@lana/business-tools";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import {
  type FinalTurnEvidenceV2,
  type ProductAttributesV1,
  type ProductPresentationEvidenceV1,
  type ProductBindingV2,
  type ProtectedClaimV1,
} from "@lana/contracts";
import { buildContextV2Capture } from "./context-v2.js";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import type { TrackCReplayJudgeEnvelope } from "./track-c-replay.js";
import { buildTrackCC3SalesQualityCandidateRequest } from "./track-c-c3-sales-quality-candidate.js";
import {
  TRACK_C_C3_TWO_PASS_CANDIDATE,
  TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
  buildTrackCC3ResponderRequest,
  buildTrackCC3StrategistRequest,
  runTrackCC3TwoPassCandidate,
} from "./track-c-c3-two-pass-candidate.js";
import { runTrackCV5TwoPassBenchmarkCase } from "./track-c-c3-v5-benchmark-runner.js";

const hash = (character: string): string => character.repeat(64);
const evaluationAt = new Date("2026-09-05T00:00:00.000Z");
const modelResource =
  "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite";
const evaluationContext = [{
  direction: "INBOUND",
  senderType: "CUSTOMER",
  messageType: "TEXT",
  text: "Mẫu SD398 giá bao nhiêu?",
  attachmentCount: 0,
  occurredAt: evaluationAt.toISOString(),
}] as const;

function validCapture(
  verifiedClaims: readonly ProtectedClaimV1[] = [],
  productAttributes: ProductAttributesV1 | null | undefined = undefined,
  productPresentation: ProductPresentationEvidenceV1 | null | undefined = undefined,
  captureAt: Date = evaluationAt,
) {
  const canonicalEvidence: CanonicalDecisionEvidenceV1 = {
    dialogueEvidence: {
      schemaVersion: 1,
      contractVersion: "CANONICAL_DIALOGUE_EVIDENCE_V1",
      act: "REQUEST",
      contributors: ["DETERMINISTIC_RUNTIME"],
      confidenceBand: "HIGH",
      sourceMessageIdHash: hash("a"),
      evidenceHash: hash("b"),
      reasonCodes: [],
      authorization: "NONE",
    },
    buyingIntent: {
      schemaVersion: 1,
      authorityVersion: "CANONICAL_BUYING_INTENT_V1",
      decision: "CONSIDERING",
      requestedAction: "NONE",
      quantity: null,
      productId: null,
      contributors: ["DETERMINISTIC_RUNTIME"],
      sourceMessageIdHash: hash("a"),
      evidenceHash: hash("c"),
      reasonCodes: [],
      evaluatedAt: evaluationAt.toISOString(),
      authorization: "NONE",
    },
  };
  const finalCommerceState: SalesCycleRuntimeState = {
    schemaVersion: 2,
    conversationKey: "track-c-two-pass-fixture",
    routing: {
      pageId: "track-c-fixture",
      conversationId: "track-c-two-pass-fixture",
    },
    revision: 1,
    stage: "DISCOVERY",
    cart: null,
    commerceContext: null,
    negotiation: null,
    checkoutDraft: null,
    clarification: null,
    preview: null,
    confirmation: null,
    processedCommandIds: [],
    updatedAt: evaluationAt.toISOString(),
  };
  const finalTurnEvidence: FinalTurnEvidenceV2 = {
    schemaVersion: 2,
    contractVersion: "FINAL_TURN_EVIDENCE_V2",
    sourceMessagePk: "00000000-0000-4000-8000-000000000099",
    sourceMessageIdHash: hash("a"),
    preTransitionConversationRevision: 0,
    finalConversationRevision: 1,
    preTransitionSalesCycleRevision: 0,
    finalSalesCycleRevision: 1,
  };
  const presentationProductId = productAttributes?.productId ??
    productPresentation?.productId ?? null;
  const productBinding: ProductBindingV2 = presentationProductId === null ? {
    schemaVersion: 2,
    contractVersion: "PRODUCT_BINDING_V2",
    status: "NOT_REQUIRED",
    productIds: [],
    catalogVersion: null,
  } : {
    schemaVersion: 2,
    contractVersion: "PRODUCT_BINDING_V2",
    status: "RESOLVED",
    productIds: [presentationProductId],
    catalogVersion: "fixture:catalog:1",
  };
  return buildContextV2Capture({
    canonicalEvidence,
    verifiedClaims,
    finalCommerceState,
    readiness: [],
    finalTurnEvidence,
    productBinding,
    ...(productAttributes === undefined ? {} : { productAttributes }),
    ...(productPresentation === undefined ? {} : { productPresentation }),
    owner: "BOT",
    handoffReasonCode: null,
    now: captureAt,
    sourceOccurredAt: captureAt,
  });
}

function verifiedProductPresentation(
  observedAtBySource: Partial<Record<"identity" | "content" | "inventory", string>> = {},
  variants = [{ variantId: "SD398-DEN-M", color: "ĐEN", size: "M" }],
): ProductPresentationEvidenceV1 {
  const value = {
    productId: "SD398",
    displayName: "Tường Vi",
    variants,
  };
  const sources = {
    identity: { authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY" as const, sourceVersion: "sheet:1", observedAt: observedAtBySource.identity ?? evaluationAt.toISOString(), expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" as const },
    content: { authority: "WEBSTORE_XML" as const, sourceVersion: "xml:1", observedAt: observedAtBySource.content ?? evaluationAt.toISOString(), expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" as const },
    inventory: {
      authority: "PANCAKE_POS" as const,
      sourceVersion: "pos:1",
      observedAt: observedAtBySource.inventory ?? evaluationAt.toISOString(),
      expiresAt: new Date(Date.parse(
        observedAtBySource.inventory ?? evaluationAt.toISOString(),
      ) + 172_800_000).toISOString(),
      freshForSeconds: 172_800 as const,
      freshnessState: "FRESH" as const,
    },
  };
  const contentHash = hashProductPresentationEvidenceV1({ value, sources });
  return {
    schemaVersion: 1,
    ...value,
    provenance: {
      ...sources,
      freshnessState: "FRESH",
      contentHash,
    },
  };
}

function verifiedProductAttributes(
  observedAt = evaluationAt.toISOString(),
): ProductAttributesV1 {
  return buildProductAttributesV1({
    productId: "SD398",
    data: {
      materials: ["LỤA"],
      materialComponents: { AO: ["LỤA"] },
      colors: ["ĐEN"],
      styles: ["THANH LỊCH"],
      silhouettes: ["CHIẾT EO"],
      occasions: ["ĐI LÀM"],
      designAttributes: { waist: ["CHIẾT EO"] },
      careInstructions: "GIẶT NHẸ",
      wearProperties: {
        stretch: null,
        wrinkleResistance: null,
        opacity: null,
        lining: null,
        breathability: null,
      },
      backCoverage: "FULL",
      designComplexity: "MINIMAL",
    },
    observedAt,
  });
}

function verifiedMediaClaim(): ProtectedClaimV1 {
  return {
    schemaVersion: 1,
    claimId: "00000000-0000-4000-8000-000000000001",
    type: "PRODUCT_MEDIA",
    scope: { kind: "PRODUCT", productId: "SD398", variantId: null },
    value: { assetId: "asset-1", assetSha256: hash("e") },
    provenance: {
      authority: "MEDIA_SELECTOR_V2",
      sourceVersion: "fixture:1",
      evidenceRef: "fixture:media:SD398",
      contentHash: hash("d"),
      observedAt: evaluationAt.toISOString(),
      expiresAt: "2099-01-01T00:00:00.000Z",
    },
    authorization: "NONE",
  };
}

function conversationPlan() {
  return {
    currentNeed: "Xem mẫu sản phẩm",
    mustResolve: "Cho khách xem nội dung đã xác minh",
    conversationRead: "Khách đang tìm hiểu mẫu",
    nextMove: "Trả lời ngắn gọn",
    avoid: "Không bịa thông tin",
  } as const;
}

function accepted(): TrackCReplayJudgeEnvelope {
  return {
    context: evaluationContext,
    verifiedFacts: null,
    reply: "Dạ mẫu này có giá niêm yết trong thông tin sản phẩm ạ.",
    proposalSummary: { action: "REPLY" },
    guardOutcome: {
      expectedOwner: "BOT",
      action: "REPLY",
      blockedReasonCodes: [],
    },
  };
}

function vertexPayload(value: unknown): unknown {
  return {
    candidates: [{
      content: { parts: [{ text: JSON.stringify(value) }] },
    }],
  };
}

describe("Track C C3 two-pass offline candidate", () => {
  it("declares one offline-only Strategist -> Responder candidate on the unchanged generator", () => {
    expect(TRACK_C_C3_TWO_PASS_CANDIDATE).toEqual({
      id: "TRACK_C_C3_STRATEGIST_RESPONDER_V2",
      primaryHypothesis:
        "A small advisory conversation plan improves need resolution and the next conversational move before the unchanged guarded response output.",
      materialAxes: ["PROMPT", "COMPOSITION", "INTERMEDIATE_SCHEMA"],
      generatorModel: "gemini-3.5-flash-lite",
      providerModelVersion: "gemini-3.5-flash-lite",
      runtimeEligible: false,
      sideEffects: "DISABLED",
    });
  });

  it("gives Responder code-owned claim references instead of asking it to reproduce hashes", () => {
    const request = buildTrackCC3ResponderRequest({
      modelResource,
      capture: validCapture([verifiedMediaClaim()]),
      evaluationAt,
      evaluationContext,
      conversationPlan: conversationPlan(),
    });
    const body = JSON.parse(request.body) as {
      contents: [{ parts: [{ text: string }] }];
      generationConfig: {
        responseSchema: {
          properties: {
            segments: { items: { properties: Record<string, unknown> } };
          };
        };
      };
    };
    const prompt = JSON.parse(body.contents[0].parts[0].text) as {
      verifiedClaims: Array<{ claimRef: string; provenance: { contentHash: string } }>;
    };

    expect(prompt.verifiedClaims).toEqual([
      expect.objectContaining({
        claimRef: "CLAIM_001",
        provenance: expect.objectContaining({ contentHash: hash("d") }),
      }),
    ]);
    expect(body.generationConfig.responseSchema.properties.segments.items.properties)
      .toHaveProperty("claimRef", { type: "STRING" });
    expect(body.generationConfig.responseSchema.properties.segments.items.properties)
      .not.toHaveProperty("claimContentHash");
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).not.toContain(
      "claimContentHash",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "never copy, invent, or return a provenance hash",
    );
  });

  it("keeps the pre-egress Responder instruction byte-identical when optional evidence is absent", () => {
    const request = buildTrackCC3ResponderRequest({
      modelResource,
      capture: validCapture(),
      evaluationAt,
      evaluationContext,
      conversationPlan: conversationPlan(),
    });
    const body = JSON.parse(request.body) as {
      systemInstruction: { parts: [{ text: string }] };
    };

    expect(body.systemInstruction.parts[0].text).toBe(
      TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
    );
    expect(body.systemInstruction.parts[0].text).not.toContain(
      "productAttributes",
    );
    expect(body.systemInstruction.parts[0].text).not.toContain(
      "productPresentation",
    );
    expect(request.identity.requestEnvelopeHash).toBe(
      "ec03172bfbc43fd40c012b35d2348fb02c6b27f3f0339a73c64aa5b8f13c5fee",
    );
    const nullableRequest = buildTrackCC3ResponderRequest({
      modelResource,
      capture: validCapture([], null, null),
      evaluationAt,
      evaluationContext,
      conversationPlan: conversationPlan(),
    });
    expect(nullableRequest.body).toBe(request.body);
    expect(nullableRequest.identity).toEqual(request.identity);
  });

  it.each([
    ["attributes", verifiedProductAttributes(), null, true, false],
    ["presentation", null, verifiedProductPresentation(), false, true],
    ["both", verifiedProductAttributes(), verifiedProductPresentation(), true, true],
  ] as const)("adds only the %s evidence instruction", (
    _name,
    attributes,
    presentation,
    expectsAttributes,
    expectsPresentation,
  ) => {
    const request = buildTrackCC3ResponderRequest({
      modelResource,
      capture: validCapture([], attributes, presentation),
      evaluationAt,
      evaluationContext,
      conversationPlan: conversationPlan(),
    });
    const text = (JSON.parse(request.body) as {
      systemInstruction: { parts: [{ text: string }] };
    }).systemInstruction.parts[0].text;

    expect(text.includes("When productAttributes is present"))
      .toBe(expectsAttributes);
    expect(text.includes("When productPresentation is present"))
      .toBe(expectsPresentation);
  });

  it("gives Responder one code-owned product-attribute reference", () => {
    const attributes = verifiedProductAttributes();
    const request = buildTrackCC3ResponderRequest({
      modelResource,
      capture: validCapture([], attributes),
      evaluationAt,
      evaluationContext,
      conversationPlan: conversationPlan(),
    });
    const body = JSON.parse(request.body) as {
      contents: [{ parts: [{ text: string }] }];
    };
    const prompt = JSON.parse(body.contents[0].parts[0].text) as {
      productAttributes: {
        claimRef: string;
        provenance: { contentHash: string };
      };
    };

    expect(prompt.productAttributes).toEqual(expect.objectContaining({
      claimRef: "PRODUCT_ATTRIBUTES_001",
      provenance: expect.objectContaining({
        contentHash: attributes.metadata.contentHash,
      }),
    }));
  });

  it("resolves product-attribute claimRef to its code-owned integrity hash", async () => {
    const attributes = verifiedProductAttributes();
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Mẫu này dùng chất liệu lụa mềm ạ.",
          claimRef: "PRODUCT_ATTRIBUTES_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    const result = await runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture([], attributes),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    });

    expect(result.candidate.quality.reply).toBe(
      "Mẫu này dùng chất liệu lụa mềm ạ.",
    );
    expect(result.candidate.identity.responseOutputHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.candidate.guard.status).toBe("PASS");
  });

  it.each([
    [
      "Dạ {{DISPLAY_NAME}} có phiên bản màu {{VARIANT_COLOR}}, size {{VARIANT_SIZE}} ạ.",
      "Dạ Tường Vi có phiên bản màu ĐEN, size M ạ.",
    ],
    [
      "Phiên bản màu {{VARIANT_COLOR}}, size {{VARIANT_SIZE}} thuộc mẫu {{DISPLAY_NAME}} chị nhé.",
      "Phiên bản màu ĐEN, size M thuộc mẫu Tường Vi chị nhé.",
    ],
  ] as const)("resolves presentation values while preserving model wording: %s", async (
    modelText,
    expectedReply,
  ) => {
    const presentation = verifiedProductPresentation();
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: modelText,
          claimRef: "PRODUCT_PRESENTATION_VARIANT_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    const result = await runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture([], null, presentation),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    });

    expect(result.candidate.quality.reply).toBe(expectedReply);
    expect(result.candidate.guard.status).toBe("PASS");
  });

  it.each([
    ["display name", "Dạ mẫu này là Hồng Nhung ạ.", "PRODUCT_PRESENTATION_DISPLAY_001"],
    ["color", "Dạ {{DISPLAY_NAME}} có màu ĐỎ, size {{VARIANT_SIZE}} ạ.", "PRODUCT_PRESENTATION_VARIANT_001"],
    ["size", "Dạ {{DISPLAY_NAME}} có màu {{VARIANT_COLOR}}, size L ạ.", "PRODUCT_PRESENTATION_VARIANT_001"],
    ["duplicate placeholder", "Dạ {{DISPLAY_NAME}} / {{DISPLAY_NAME}} có màu {{VARIANT_COLOR}}, size {{VARIANT_SIZE}} ạ.", "PRODUCT_PRESENTATION_VARIANT_001"],
    ["swapped color and size roles", "Màu {{VARIANT_SIZE}}, size {{VARIANT_COLOR}} thuộc mẫu {{DISPLAY_NAME}} chị nhé.", "PRODUCT_PRESENTATION_VARIANT_001"],
    ["swapped display, color, and size roles", "Tên {{VARIANT_COLOR}} là mẫu {{DISPLAY_NAME}} có màu {{VARIANT_SIZE}} ạ.", "PRODUCT_PRESENTATION_VARIANT_001"],
    ["display name bound to speaker", "Em tên {{DISPLAY_NAME}}, mẫu có màu {{VARIANT_COLOR}}, size {{VARIANT_SIZE}} ạ.", "PRODUCT_PRESENTATION_VARIANT_001"],
    ["display name used as customer model", "Chị là mẫu {{DISPLAY_NAME}} ạ.", "PRODUCT_PRESENTATION_DISPLAY_001"],
    ["display name used as customer subject", "Chị {{DISPLAY_NAME}} có thông tin ạ.", "PRODUCT_PRESENTATION_DISPLAY_001"],
  ] as const)("rejects a wrong product-presentation %s", async (
    _name,
    text,
    claimRef,
  ) => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{ kind: "VERIFIED_CLAIM", text, claimRef }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture([], null, verifiedProductPresentation()),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_CLAIM_REFERENCE_TEXT_MISMATCH");
  });

  it.each([
    "Chị là mẫu {{DISPLAY_NAME}} ạ.",
    "Chị {{DISPLAY_NAME}} có thông tin ạ.",
  ])("rejects a display name bound to the customer on the V5 path: %s", async (text) => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text,
          claimRef: "PRODUCT_PRESENTATION_DISPLAY_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource,
      capture: validCapture([], null, verifiedProductPresentation()),
      evaluationAt,
      evaluationContext,
      transport,
    })).rejects.toThrow("TRACK_C_V5_CLAIM_REFERENCE_TEXT_MISMATCH");
  });

  it.each([
    "Màu {{VARIANT_SIZE}}, size {{VARIANT_COLOR}} thuộc mẫu {{DISPLAY_NAME}} chị nhé.",
    "Tên {{VARIANT_COLOR}} là mẫu {{DISPLAY_NAME}} có màu {{VARIANT_SIZE}} ạ.",
    "Em tên {{DISPLAY_NAME}}, mẫu có màu {{VARIANT_COLOR}}, size {{VARIANT_SIZE}} ạ.",
  ])("rejects swapped presentation roles on the V5 path: %s", async (text) => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text,
          claimRef: "PRODUCT_PRESENTATION_VARIANT_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource,
      capture: validCapture([], null, verifiedProductPresentation()),
      evaluationAt,
      evaluationContext,
      transport,
    })).rejects.toThrow("TRACK_C_V5_CLAIM_REFERENCE_TEXT_MISMATCH");
  });

  it("accepts a catalog size label from verified presentation evidence on the V5 path", async () => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Dạ {{DISPLAY_NAME}} có phiên bản màu {{VARIANT_COLOR}}, size {{VARIANT_SIZE}} ạ.",
          claimRef: "PRODUCT_PRESENTATION_VARIANT_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    const result = await runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource,
      capture: validCapture([], null, verifiedProductPresentation()),
      evaluationAt,
      evaluationContext,
      transport,
    });

    expect(result.reply).toBe(
      "Dạ Tường Vi có phiên bản màu ĐEN, size M ạ.",
    );
    expect(result.sideEffects).toBe("DISABLED");
  });

  it("rejects fit semantics even when presentation evidence provides the size label", async () => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Dạ {{DISPLAY_NAME}} có màu {{VARIANT_COLOR}}, chị là size {{VARIANT_SIZE}} ạ.",
          claimRef: "PRODUCT_PRESENTATION_VARIANT_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource,
      capture: validCapture([], null, verifiedProductPresentation()),
      evaluationAt,
      evaluationContext,
      transport,
    })).rejects.toThrow("TRACK_C_V5_PRODUCTION_GUARD_FAILED:SIZE_RECOMMENDATION_UNDECLARED");
  });

  it("rejects extra presentation literals and unregistered placeholder syntax on the normal path", async () => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "mẫu hồng nhung / {{DISPLAY_NAME}} có màu xanh / {{VARIANT_COLOR}}, size xl / {{VARIANT_SIZE}} {{other}}",
          claimRef: "PRODUCT_PRESENTATION_VARIANT_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture([], null, verifiedProductPresentation({}, [
        { variantId: "SD398-DEN-M", color: "ĐEN", size: "M" },
        { variantId: "SD398-DO-L", color: "ĐỎ", size: "L" },
      ])),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_CLAIM_REFERENCE_TEXT_MISMATCH");
  });

  it("rejects a cross-variant presentation statement on the V5 production-contract path", async () => {
    const presentation = verifiedProductPresentation({}, [
      { variantId: "SD398-DEN-M", color: "ĐEN", size: "M" },
      { variantId: "SD398-DO-L", color: "ĐỎ", size: "L" },
    ]);
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Dạ {{DISPLAY_NAME}} có màu {{VARIANT_COLOR}}, size L ạ.",
          claimRef: "PRODUCT_PRESENTATION_VARIANT_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource,
      capture: validCapture([], null, presentation),
      evaluationAt,
      evaluationContext,
      transport,
    })).rejects.toThrow("TRACK_C_V5_CLAIM_REFERENCE_TEXT_MISMATCH");
  });

  it("rejects extra presentation literals and malformed placeholders on the V5 path", async () => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "mẫu hồng nhung / {{DISPLAY_NAME}} có màu xanh / {{VARIANT_COLOR}}, size xl / {{VARIANT_SIZE}} {{BROKEN",
          claimRef: "PRODUCT_PRESENTATION_VARIANT_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource,
      capture: validCapture([], null, verifiedProductPresentation({}, [
        { variantId: "SD398-DEN-M", color: "ĐEN", size: "M" },
        { variantId: "SD398-DO-L", color: "ĐỎ", size: "L" },
      ])),
      evaluationAt,
      evaluationContext,
      transport,
    })).rejects.toThrow("TRACK_C_V5_CLAIM_REFERENCE_TEXT_MISMATCH");
  });

  it("preserves model wording after resolving presentation values on the V5 path", async () => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Dạ tên mẫu là {{DISPLAY_NAME}} ạ.",
          claimRef: "PRODUCT_PRESENTATION_DISPLAY_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    const result = await runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource,
      capture: validCapture([], null, verifiedProductPresentation()),
      evaluationAt,
      evaluationContext,
      transport,
    });

    expect(result.reply).toBe(
      "Dạ tên mẫu là Tường Vi ạ.",
    );
  });

  it("fails before the first provider call for future-dated product attributes", async () => {
    const transport: CandidateVertexTransport = { send: vi.fn() };
    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture(
        [],
        verifiedProductAttributes("2026-09-05T00:05:01.000Z"),
        null,
        new Date("2026-09-05T00:06:00.000Z"),
      ),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_STALE");
    expect(transport.send).not.toHaveBeenCalled();
  });

  it.each(["identity", "content", "inventory"] as const)(
    "fails before the first provider call for future-dated %s presentation metadata",
    async (source) => {
      const transport: CandidateVertexTransport = { send: vi.fn() };
      await expect(runTrackCC3TwoPassCandidate({
        caseId: "pii-security",
        modelResource,
        capture: validCapture(
          [],
          null,
          verifiedProductPresentation({
            [source]: "2026-09-05T00:05:01.000Z",
          }),
          new Date("2026-09-05T00:06:00.000Z"),
        ),
        evaluationAt,
        evaluationContext,
        accepted: accepted(),
        transport,
      })).rejects.toThrow("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_STALE");
      expect(transport.send).not.toHaveBeenCalled();
    },
  );

  it("resolves a verified claim reference to the exact Context V2 hash before the existing validator", async () => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Mẫu chị đang xem nằm ngay bên dưới để chị xem kỹ hơn ạ.",
          claimRef: "CLAIM_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    const result = await runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture([verifiedMediaClaim()]),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    });

    expect(result.candidate.guard).toEqual({
      status: "PASS",
      sideEffects: "DISABLED",
      blockedReasonCodes: [],
    });
    expect(result.candidate.quality.reply).toBe(
      "Mẫu chị đang xem nằm ngay bên dưới để chị xem kỹ hơn ạ.",
    );
  });

  it("fails closed when Responder supplies an unknown claim reference", async () => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Mẫu chị đang xem nằm ngay bên dưới ạ.",
          claimRef: "CLAIM_999",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture([verifiedMediaClaim()]),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_CLAIM_REFERENCE_UNKNOWN");
  });

  it("rejects a model-authored hash instead of treating it as code-owned provenance", async () => {
    const outputs = [
      conversationPlan(),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Mẫu chị đang xem nằm ngay bên dưới ạ.",
          claimContentHash: hash("d"),
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      },
    ];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(outputs.shift()),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture([verifiedMediaClaim()]),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_CLAIM_REFERENCE_INVALID");
  });

  it("pins the five-field plan schema while retaining the frozen dialogue and Context V2", () => {
    const request = buildTrackCC3StrategistRequest({
      modelResource,
      capture: validCapture(),
      evaluationAt,
      evaluationContext,
    });
    const body = JSON.parse(request.body) as {
      contents: [{ parts: [{ text: string }] }];
      generationConfig: { responseSchema: unknown };
      safetySettings: unknown;
    };
    const prompt = JSON.parse(body.contents[0].parts[0].text) as {
      contextHash: string;
      evaluationContext: unknown;
    };

    expect(prompt.contextHash).toMatch(/^[a-f0-9]{64}$/);
    expect(prompt.evaluationContext).toEqual(evaluationContext);
    expect(body.generationConfig.responseSchema).toEqual({
      type: "OBJECT",
      required: ["currentNeed", "mustResolve", "conversationRead", "nextMove", "avoid"],
      properties: {
        currentNeed: { type: "STRING" },
        mustResolve: { type: "STRING" },
        conversationRead: { type: "STRING" },
        nextMove: { type: "STRING" },
        avoid: { type: "STRING" },
      },
    });
    expect(body.safetySettings).toBeDefined();
  });

  it("runs Strategist then Responder and sends only the final output through the existing guard", async () => {
    const requests: Array<{ url: string; body: string }> = [];
    const transport: CandidateVertexTransport = {
      send: vi.fn(async (request) => {
        requests.push({ url: request.url, body: request.body });
        return requests.length === 1
          ? {
            payload: vertexPayload({
              currentNeed: "Biết giá của mẫu đang hỏi",
              mustResolve: "Trả lời đúng câu hỏi hiện tại",
              conversationRead: "Khách đang hỏi trực tiếp, chưa cần chốt đơn",
              nextMove: "Trả lời ngắn gọn rồi dừng tự nhiên",
              avoid: "Không bịa giá hoặc thúc ép chốt",
            }),
            providerModelVersion: "gemini-3.5-flash-lite",
          }
          : {
            payload: vertexPayload({
              segments: [{ kind: "GENERAL", text: "Dạ hiện em chưa thể xác nhận thông tin này ạ." }],
              strategy: "ANSWER_VERIFIED_FACTS",
              cta: "NONE",
            }),
            providerModelVersion: "gemini-3.5-flash-lite",
          };
      }),
    };

    const result = await runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture(),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    });

    expect(requests).toHaveLength(2);
    const strategistBody = JSON.parse(requests[0]!.body) as {
      generationConfig: { responseSchema: unknown };
    };
    const responderBody = JSON.parse(requests[1]!.body) as {
      contents: [{ parts: [{ text: string }] }];
      generationConfig: { responseSchema: { required: string[] } };
      safetySettings: unknown;
    };
    const existingBody = JSON.parse(buildTrackCC3SalesQualityCandidateRequest({
      modelResource,
      capture: validCapture(),
      evaluationAt,
      evaluationContext,
    }).body) as {
      generationConfig: unknown;
      safetySettings: unknown;
    };
    const responderPrompt = JSON.parse(responderBody.contents[0].parts[0].text) as {
      evaluationContext: unknown;
      conversationPlan: unknown;
      conversationPlanHash: string;
      conversationPlanContract: string;
    };
    expect(strategistBody.generationConfig.responseSchema).not.toEqual(
      responderBody.generationConfig.responseSchema,
    );
    expect(responderBody.generationConfig.responseSchema.required).toEqual([
      "segments", "strategy", "cta",
    ]);
    expect(responderBody.generationConfig).toMatchObject({
      maxOutputTokens: 1_024,
      responseMimeType: "application/json",
    });
    expect(responderBody.generationConfig).not.toEqual(existingBody.generationConfig);
    expect(responderBody.safetySettings).toEqual(existingBody.safetySettings);
    expect(responderPrompt.evaluationContext).toEqual(evaluationContext);
    expect(responderPrompt.conversationPlan).toEqual(result.conversationPlan);
    expect(responderPrompt.conversationPlanHash).toBe(result.identity.conversationPlanHash);
    expect(responderPrompt.conversationPlanContract).toBe("TRACK_C_CONVERSATION_PLAN_V1");
    expect(result.candidate.guard).toEqual({
      status: "PASS",
      sideEffects: "DISABLED",
      blockedReasonCodes: [],
    });
    expect(result.candidate.quality.reply).toBe(
      "Dạ hiện em chưa thể xác nhận thông tin này ạ.",
    );
    expect(result.identity.strategistRequestEnvelopeHash).toBe(
      buildTrackCC3StrategistRequest({
        modelResource,
        capture: validCapture(),
        evaluationAt,
        evaluationContext,
      }).identity.requestEnvelopeHash,
    );
    expect(result.identity.responderRequestEnvelopeHash).toBe(
      result.candidate.identity.requestEnvelopeHash,
    );
  });

  it("fails closed before Responder when the plan has extra fields", async () => {
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload({
          currentNeed: "Biết giá",
          mustResolve: "Trả lời câu hỏi",
          conversationRead: "Khách đang hỏi giá",
          nextMove: "Trả lời ngắn gọn",
          avoid: "Không bịa",
          claimedPrice: "1.000.000đ",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture(),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID");
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("fails closed before Responder when Strategist has the wrong provider identity", async () => {
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload({
          currentNeed: "Biết giá",
          mustResolve: "Trả lời câu hỏi",
          conversationRead: "Khách đang hỏi giá",
          nextMove: "Trả lời ngắn gọn",
          avoid: "Không bịa",
        }),
        providerModelVersion: "gemini-3.6-flash",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture(),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_TWO_PASS_PROVIDER_MISMATCH");
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("never calls either model pass for a deterministic HUMAN-owned case", async () => {
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload({}),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };
    await expect(runTrackCC3TwoPassCandidate({
      caseId: "unsupported-protected-claim",
      modelResource,
      capture: validCapture(),
      evaluationAt,
      evaluationContext,
      // Deliberately caller-authored as BOT: canonical C1 ownership must win.
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_TWO_PASS_HUMAN_GENERATION_FORBIDDEN");
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("rejects an accepted/candidate frozen-dialogue mismatch before Strategist", async () => {
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload({}),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };
    const mismatchedAccepted: TrackCReplayJudgeEnvelope = {
      ...accepted(),
      context: [{
        ...evaluationContext[0],
        text: "Một frozen dialogue khác",
      }],
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: validCapture(),
      evaluationAt,
      evaluationContext,
      accepted: mismatchedAccepted,
      transport,
    })).rejects.toThrow("TRACK_C_C3_OFFLINE_CANDIDATE_DIALOGUE_MISMATCH");
    expect(transport.send).not.toHaveBeenCalled();
  });
});
