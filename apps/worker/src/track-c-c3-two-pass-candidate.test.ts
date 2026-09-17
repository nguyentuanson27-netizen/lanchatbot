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
import {
  TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
  TRACK_C_C3_TWO_PASS_CANDIDATE,
  buildTrackCC3ResponderRequest,
  buildTrackCC3StrategistRequest,
  runTrackCC3TwoPassCandidate,
  type TrackCResponsePlanV2,
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
    identity: {
      authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY" as const,
      sourceVersion: "sheet:1",
      observedAt: observedAtBySource.identity ?? evaluationAt.toISOString(),
      expiresAt: null,
      freshForSeconds: null,
      freshnessState: "FRESH" as const,
    },
    content: {
      authority: "WEBSTORE_XML" as const,
      sourceVersion: "xml:1",
      observedAt: observedAtBySource.content ?? evaluationAt.toISOString(),
      expiresAt: null,
      freshForSeconds: null,
      freshnessState: "FRESH" as const,
    },
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

function verifiedEtaClaim(): ProtectedClaimV1 {
  return {
    schemaVersion: 1,
    claimId: "00000000-0000-4000-8000-000000000002",
    type: "ETA",
    scope: { kind: "PRODUCT", productId: "SD398", variantId: null },
    value: { minDays: 2, maxDays: 4 },
    provenance: {
      authority: "FULFILLMENT_POLICY_V1",
      sourceVersion: "fixture:fulfillment:1",
      evidenceRef: "fixture:eta:SD398",
      contentHash: hash("f"),
      observedAt: evaluationAt.toISOString(),
      expiresAt: "2099-01-01T00:00:00.000Z",
    },
    authorization: "NONE",
  };
}

function conversationPlan(
  evidenceRefs: readonly string[] = [],
  mode: TrackCResponsePlanV2["answer"]["mode"] = "DIRECT",
): TrackCResponsePlanV2 {
  return {
    currentNeed: "Xem mẫu sản phẩm",
    answer: {
      mode,
      objective: "Trả lời đúng nhu cầu hiện tại bằng evidence đã chọn",
      evidenceRefs,
      protectedProposition: "NONE",
      protectedResolution: "NOT_APPLICABLE",
    },
    nextMove: {
      action: "NONE",
      target: "NONE",
      purpose: "NONE",
      decisionInput: "NONE",
    },
    canonicalAction: {
      type: "NONE",
      requestedFields: [],
    },
    terminal: false,
    avoid: "Không bịa hoặc mở thêm mục tiêu bán hàng",
    effectIntent: "NONE",
  };
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

  it("gives Strategist every code-owned evidence ref but makes Responder see only selected refs", () => {
    const capture = validCapture(
      [verifiedMediaClaim()],
      verifiedProductAttributes(),
      verifiedProductPresentation(),
    );
    const strategistRequest = buildTrackCC3StrategistRequest({
      modelResource,
      capture,
      evaluationAt,
      evaluationContext,
    });
    const strategistBody = JSON.parse(strategistRequest.body) as {
      contents: [{ parts: [{ text: string }] }];
      generationConfig: {
        responseSchema: {
          properties: {
            answer: {
              properties: {
                evidenceRefs: { items: { enum: string[] } };
              };
            };
          };
        };
      };
    };
    const strategistPrompt = JSON.parse(
      strategistBody.contents[0].parts[0].text,
    ) as {
      verifiedClaims: Array<{ claimRef: string }>;
      productAttributes: { claimRef: string };
      productPresentation: { claims: Array<{ claimRef: string }> };
    };
    expect(strategistPrompt.verifiedClaims[0]?.claimRef).toBe("CLAIM_001");
    expect(strategistPrompt.productAttributes.claimRef).toBe(
      "PRODUCT_ATTRIBUTES_001",
    );
    expect(strategistPrompt.productPresentation.claims.map(({ claimRef }) => claimRef))
      .toEqual([
        "PRODUCT_PRESENTATION_DISPLAY_001",
        "PRODUCT_PRESENTATION_VARIANT_001",
      ]);
    expect(
      strategistBody.generationConfig.responseSchema.properties.answer.properties
        .evidenceRefs.items.enum,
    ).toEqual([
      "CLAIM_001",
      "PRODUCT_ATTRIBUTES_001",
      "PRODUCT_PRESENTATION_DISPLAY_001",
      "PRODUCT_PRESENTATION_VARIANT_001",
    ]);

    const responderRequest = buildTrackCC3ResponderRequest({
      modelResource,
      capture,
      evaluationAt,
      evaluationContext,
      conversationPlan: conversationPlan(["PRODUCT_ATTRIBUTES_001"]),
    });
    const responderBody = JSON.parse(responderRequest.body) as {
      contents: [{ parts: [{ text: string }] }];
      generationConfig: {
        responseSchema: {
          properties: {
            segments: { items: { properties: { claimRef: unknown } } };
          };
        };
      };
    };
    const responderPrompt = JSON.parse(
      responderBody.contents[0].parts[0].text,
    ) as {
      responsePlanContract: string;
      responsePlan: unknown;
      selectedEvidence: {
        verifiedClaims: unknown[];
        productAttributes: { claimRef: string } | null;
        productPresentation: unknown;
      };
      verifiedClaims?: unknown;
      barriers?: unknown;
      checkoutCompleteness?: unknown;
    };
    expect(responderPrompt.responsePlanContract).toBe("TRACK_C_RESPONSE_PLAN_V2");
    expect(responderPrompt.responsePlan).toEqual(
      conversationPlan(["PRODUCT_ATTRIBUTES_001"]),
    );
    expect(responderPrompt.selectedEvidence.verifiedClaims).toEqual([]);
    expect(responderPrompt.selectedEvidence.productAttributes).toEqual(
      expect.objectContaining({ claimRef: "PRODUCT_ATTRIBUTES_001" }),
    );
    expect(responderPrompt.selectedEvidence.productPresentation).toBeNull();
    expect(responderPrompt).not.toHaveProperty("verifiedClaims");
    expect(responderPrompt).not.toHaveProperty("barriers");
    expect(responderPrompt).not.toHaveProperty("checkoutCompleteness");
    expect(
      responderBody.generationConfig.responseSchema.properties.segments.items
        .properties.claimRef,
    ).toEqual({ type: "STRING", enum: ["PRODUCT_ATTRIBUTES_001"] });
  });

  it("keeps the Responder system prompt static and wording-focused", () => {
    const request = buildTrackCC3ResponderRequest({
      modelResource,
      capture: validCapture(
        [verifiedMediaClaim()],
        verifiedProductAttributes(),
        verifiedProductPresentation(),
      ),
      evaluationAt,
      evaluationContext,
      conversationPlan: conversationPlan(["CLAIM_001"]),
    });
    const body = JSON.parse(request.body) as {
      systemInstruction: { parts: [{ text: string }] };
    };
    expect(body.systemInstruction.parts[0].text).toBe(
      TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
    );
    expect(body.systemInstruction.parts[0].text).not.toContain(
      "checkoutCompleteness",
    );
    expect(body.systemInstruction.parts[0].text).not.toContain(
      "first matching canonical rule",
    );
  });

  it("passes only selected standard verified evidence to Responder", () => {
    const request = buildTrackCC3ResponderRequest({
      modelResource,
      capture: validCapture([verifiedMediaClaim(), verifiedEtaClaim()]),
      evaluationAt,
      evaluationContext,
      conversationPlan: conversationPlan(["CLAIM_002"]),
    });
    const body = JSON.parse(request.body) as {
      contents: [{ parts: [{ text: string }] }];
    };
    const prompt = JSON.parse(body.contents[0].parts[0].text) as {
      selectedEvidence: {
        verifiedClaims: Array<{
          claimRef: string;
          type: string;
          provenance?: unknown;
        }>;
      };
    };
    expect(prompt.selectedEvidence.verifiedClaims).toEqual([
      expect.objectContaining({ claimRef: "CLAIM_002", type: "ETA" }),
    ]);
    expect(prompt.selectedEvidence.verifiedClaims[0]).not.toHaveProperty(
      "provenance",
    );
  });

  it("rejects a plan that selects an evidence ref absent from code-owned registry", () => {
    expect(() => buildTrackCC3ResponderRequest({
      modelResource,
      capture: validCapture(),
      evaluationAt,
      evaluationContext,
      conversationPlan: conversationPlan(["CLAIM_999"]),
    })).toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID");
  });

  it("resolves a selected product-attribute ref to its code-owned integrity hash", async () => {
    const attributes = verifiedProductAttributes();
    const outputs = [
      conversationPlan(["PRODUCT_ATTRIBUTES_001"]),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Mẫu này dùng chất liệu lụa ạ.",
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
    expect(result.candidate.quality.reply).toBe("Mẫu này dùng chất liệu lụa ạ.");
    expect(result.candidate.guard.status).toBe("PASS");
  });

  it.each([
    [
      "Dạ {{DISPLAY_NAME}} có phiên bản màu {{VARIANT_COLOR}}, size {{VARIANT_SIZE}} ạ.",
      "Dạ Tường Vi có phiên bản màu ĐEN, size M ạ.",
      "PRODUCT_PRESENTATION_VARIANT_001",
    ],
    [
      "Dạ tên mẫu là {{DISPLAY_NAME}} ạ.",
      "Dạ tên mẫu là Tường Vi ạ.",
      "PRODUCT_PRESENTATION_DISPLAY_001",
    ],
    [
      "Dạ mẫu {{DISPLAY_NAME}} chị nhé.",
      "Dạ mẫu Tường Vi chị nhé.",
      "PRODUCT_PRESENTATION_DISPLAY_001",
    ],
  ] as const)("resolves selected presentation values while preserving wording: %s", async (
    modelText,
    expectedReply,
    claimRef,
  ) => {
    const outputs = [
      conversationPlan([claimRef]),
      {
        segments: [{ kind: "VERIFIED_CLAIM", text: modelText, claimRef }],
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
      capture: validCapture([], null, verifiedProductPresentation()),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    });
    expect(result.candidate.quality.reply).toBe(expectedReply);
    expect(result.candidate.guard.status).toBe("PASS");
  });

  it.each([
    ["literal display name", "Dạ mẫu này là Hồng Nhung ạ.", "PRODUCT_PRESENTATION_DISPLAY_001"],
    ["literal color", "Dạ {{DISPLAY_NAME}} có màu ĐỎ, size {{VARIANT_SIZE}} ạ.", "PRODUCT_PRESENTATION_VARIANT_001"],
    ["duplicate placeholder", "Dạ {{DISPLAY_NAME}} / {{DISPLAY_NAME}} có màu {{VARIANT_COLOR}}, size {{VARIANT_SIZE}} ạ.", "PRODUCT_PRESENTATION_VARIANT_001"],
    ["swapped roles", "Màu {{VARIANT_SIZE}}, size {{VARIANT_COLOR}} thuộc mẫu {{DISPLAY_NAME}} chị nhé.", "PRODUCT_PRESENTATION_VARIANT_001"],
    ["customer binding", "Chị là mẫu {{DISPLAY_NAME}} ạ.", "PRODUCT_PRESENTATION_DISPLAY_001"],
  ] as const)("rejects wrong selected presentation semantics: %s", async (
    _name,
    text,
    claimRef,
  ) => {
    const outputs = [
      conversationPlan([claimRef]),
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

  it("rejects a Responder claimRef that Model 1 did not select", async () => {
    const outputs = [
      conversationPlan(["CLAIM_001"]),
      {
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Thời gian giao dự kiến từ 2 đến 4 ngày ạ.",
          claimRef: "CLAIM_002",
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
      capture: validCapture([verifiedMediaClaim(), verifiedEtaClaim()]),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_CLAIM_REFERENCE_UNKNOWN");
  });

  it("rejects a model-authored hash instead of code-owned claimRef", async () => {
    const outputs = [
      conversationPlan(["CLAIM_001"]),
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

  it("pins the typed response-plan schema while retaining Context V2 for Strategist", () => {
    const request = buildTrackCC3StrategistRequest({
      modelResource,
      capture: validCapture([verifiedEtaClaim()]),
      evaluationAt,
      evaluationContext,
    });
    const body = JSON.parse(request.body) as {
      contents: [{ parts: [{ text: string }] }];
      generationConfig: { responseSchema: Record<string, unknown> };
      safetySettings: unknown;
    };
    const prompt = JSON.parse(body.contents[0].parts[0].text) as {
      contextHash: string;
      evaluationContext: unknown;
      verifiedClaims: Array<{ claimRef: string }>;
    };
    expect(prompt.contextHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(prompt.evaluationContext).toEqual(evaluationContext);
    expect(prompt.verifiedClaims[0]?.claimRef).toBe("CLAIM_001");
    expect(body.generationConfig.responseSchema).toMatchObject({
      type: "OBJECT",
      required: [
        "currentNeed",
        "answer",
        "nextMove",
        "canonicalAction",
        "terminal",
        "avoid",
        "effectIntent",
      ],
      properties: {
        answer: {
          type: "OBJECT",
          properties: {
            evidenceRefs: { items: { enum: ["CLAIM_001"] } },
            protectedProposition: { enum: [
              "NONE",
              "PRICE",
              "STOCK",
              "SIZE_FIT",
              "ETA",
              "SHIPPING_FEE",
              "FREESHIP",
              "PROMOTION_OFFER",
              "PRODUCT_MEDIA",
              "PRODUCT_ATTRIBUTES",
              "PRODUCT_PRESENTATION",
              "POLICY",
              "CARE_GUIDANCE",
              "OFFER_CONFIGURATION",
              "BUSINESS_LOCATION",
              "FULFILLMENT_STATUS",
              "CART_TOTAL",
              "PRODUCT_LIFECYCLE",
              "PRODUCT_COMPARISON",
            ] },
            protectedResolution: { enum: [
              "SUPPORTED",
              "UNRESOLVED",
              "NOT_APPLICABLE",
            ] },
          },
        },
        nextMove: {
          type: "OBJECT",
          properties: {
            decisionInput: {
              type: "STRING",
              enum: [
                "NONE", "PRODUCT", "MEASUREMENTS", "SIZE", "COLOR",
                "VARIANT", "LOCALITY", "PAYMENT_PREFERENCE", "QUANTITY", "STYLE",
              ],
            },
          },
        },
        canonicalAction: { type: "OBJECT" },
        terminal: { type: "BOOLEAN" },
        effectIntent: { type: "STRING" },
      },
    });
    expect(body.safetySettings).toBeDefined();
  });

  it("runs Strategist then Responder with the typed plan and only final output reaches guard", async () => {
    const requests: Array<{ url: string; body: string }> = [];
    const plan = conversationPlan([], "BOUNDED_UNCERTAINTY");
    const transport: CandidateVertexTransport = {
      send: vi.fn(async (request) => {
        requests.push({ url: request.url, body: request.body });
        return requests.length === 1
          ? {
            payload: vertexPayload(plan),
            providerModelVersion: "gemini-3.5-flash-lite",
          }
          : {
            payload: vertexPayload({
              segments: [{
                kind: "GENERAL",
                text: "Dạ hiện em chưa thể xác nhận thông tin này ạ.",
              }],
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
    const responderBody = JSON.parse(requests[1]!.body) as {
      contents: [{ parts: [{ text: string }] }];
      generationConfig: { responseSchema: { required: string[] } };
    };
    const responderPrompt = JSON.parse(
      responderBody.contents[0].parts[0].text,
    ) as {
      evaluationContext: unknown;
      responsePlan: unknown;
      responsePlanHash: string;
      responsePlanContract: string;
      selectedEvidence: unknown;
    };
    expect(responderBody.generationConfig.responseSchema.required).toEqual([
      "segments",
      "strategy",
      "cta",
    ]);
    expect(responderPrompt.evaluationContext).toEqual(evaluationContext);
    expect(responderPrompt.responsePlan).toEqual(plan);
    expect(responderPrompt.responsePlanHash).toBe(
      result.identity.conversationPlanHash,
    );
    expect(responderPrompt.responsePlanContract).toBe(
      "TRACK_C_RESPONSE_PLAN_V2",
    );
    expect(result.candidate.guard).toEqual({
      status: "PASS",
      sideEffects: "DISABLED",
      blockedReasonCodes: [],
    });
    expect(result.candidate.quality.reply).toBe(
      "Dạ hiện em chưa thể xác nhận thông tin này ạ.",
    );
  });

  it("fails closed before Responder when typed plan has an extra field", async () => {
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload({
          ...conversationPlan(),
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

  it.each([
    [
      "a provider payload without candidate text",
      { candidates: [{ content: { parts: [{}] } }] },
    ],
    [
      "a provider payload with non-string candidate text",
      { candidates: [{ content: { parts: [{ text: 7 }] } }] },
    ],
    [
      "a provider payload with malformed candidate JSON",
      { candidates: [{ content: { parts: [{ text: "{not-json" }] } }] },
    ],
  ] as const)("reports strategist extraction failure for %s", async (
    _name,
    payload,
  ) => {
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload,
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
    })).rejects.toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:EXTRACTION");
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("reports a structurally invalid Strategist plan as schema failure", async () => {
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload({
          ...conversationPlan(),
          answer: {
            ...conversationPlan().answer,
            evidenceRefs: "CLAIM_001",
            protectedProposition: "NONE",
            protectedResolution: "NOT_APPLICABLE",
          },
          nextMove: {
            ...conversationPlan().nextMove,
            decisionInput: "NONE",
          },
          effectIntent: "NONE",
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
    })).rejects.toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SCHEMA");
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("reports a structurally valid Strategist plan with a semantic mismatch", async () => {
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload({
          ...conversationPlan(),
          answer: {
            ...conversationPlan().answer,
            protectedProposition: "NONE",
            protectedResolution: "NOT_APPLICABLE",
          },
          nextMove: {
            action: "NONE",
            target: "SIZE_PREFERENCE",
            purpose: "NARROW_CHOICE",
            decisionInput: "NONE",
          },
          effectIntent: "NONE",
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
    })).rejects.toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("fails closed when canonical action and sales nextMove compete", async () => {
    const invalidPlan = {
      ...conversationPlan(),
      nextMove: {
        action: "ASK",
        target: "SIZE_PREFERENCE",
        purpose: "NARROW_CHOICE",
      },
      canonicalAction: {
        type: "ASK_PRODUCT",
        requestedFields: [],
      },
    };
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(invalidPlan),
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
        payload: vertexPayload(conversationPlan()),
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

  it("fails before the first provider call for stale/future product evidence", async () => {
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

  it("keeps the V5 production-contract path on code-owned presentation substitution", async () => {
    const outputs = [
      conversationPlan(["PRODUCT_PRESENTATION_DISPLAY_001"]),
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
    expect(result.reply).toBe("Dạ tên mẫu là Tường Vi ạ.");
    expect(result.sideEffects).toBe("DISABLED");
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
