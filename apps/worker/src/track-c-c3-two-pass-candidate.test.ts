import { describe, expect, it, vi } from "vitest";
import type { CanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import type {
  FinalTurnEvidenceV2,
  ProductBindingV2,
} from "@lana/contracts";
import { buildContextV2Capture } from "./context-v2.js";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import type { TrackCReplayJudgeEnvelope } from "./track-c-replay.js";
import { buildTrackCC3SalesQualityCandidateRequest } from "./track-c-c3-sales-quality-candidate.js";
import {
  TRACK_C_C3_TWO_PASS_CANDIDATE,
  buildTrackCC3StrategistRequest,
  runTrackCC3TwoPassCandidate,
} from "./track-c-c3-two-pass-candidate.js";

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

function validCapture() {
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
  const productBinding: ProductBindingV2 = {
    schemaVersion: 2,
    contractVersion: "PRODUCT_BINDING_V2",
    status: "NOT_REQUIRED",
    productIds: [],
    catalogVersion: null,
  };
  return buildContextV2Capture({
    canonicalEvidence,
    verifiedClaims: [],
    finalCommerceState,
    readiness: [],
    finalTurnEvidence,
    productBinding,
    owner: "BOT",
    handoffReasonCode: null,
    now: evaluationAt,
    sourceOccurredAt: evaluationAt,
  });
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
      id: "TRACK_C_C3_STRATEGIST_RESPONDER_V1",
      primaryHypothesis:
        "A small advisory conversation plan improves need resolution and the next conversational move before the unchanged guarded response output.",
      materialAxes: ["PROMPT", "COMPOSITION", "INTERMEDIATE_SCHEMA"],
      generatorModel: "gemini-3.5-flash-lite",
      providerModelVersion: "gemini-3.5-flash-lite",
      runtimeEligible: false,
      sideEffects: "DISABLED",
    });
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
    expect(responderBody.generationConfig).toEqual(existingBody.generationConfig);
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
