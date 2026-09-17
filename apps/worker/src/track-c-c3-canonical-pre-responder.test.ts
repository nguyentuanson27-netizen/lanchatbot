import { describe, expect, it, vi } from "vitest";
import type { CanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import type { FinalTurnEvidenceV2 } from "@lana/contracts";
import { buildContextV2Capture } from "./context-v2.js";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import type { TrackCReplayJudgeEnvelope } from "./track-c-replay.js";
import {
  runTrackCC3TwoPassCandidate,
  type TrackCResponsePlanV2,
} from "./track-c-c3-two-pass-candidate.js";

const hash = (character: string): string => character.repeat(64);
const evaluationAt = new Date("2026-09-05T00:00:00.000Z");
const modelResource =
  "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite";
const evaluationContext = [{
  direction: "INBOUND",
  senderType: "CUSTOMER",
  messageType: "TEXT",
  text: "Mẫu này còn không em?",
  attachmentCount: 0,
  occurredAt: evaluationAt.toISOString(),
}] as const;

function captureWithoutCheckoutAuthorization() {
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
    conversationKey: "track-c-canonical-boundary-fixture",
    routing: {
      pageId: "track-c-fixture",
      conversationId: "track-c-canonical-boundary-fixture",
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
  return buildContextV2Capture({
    canonicalEvidence,
    verifiedClaims: [],
    finalCommerceState,
    readiness: [],
    finalTurnEvidence,
    productBinding: {
      schemaVersion: 2,
      contractVersion: "PRODUCT_BINDING_V2",
      status: "NOT_REQUIRED",
      productIds: [],
      catalogVersion: null,
    },
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
    reply: "Dạ em kiểm tra theo thông tin hiện có ạ.",
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

describe("Track C canonical action pre-Responder boundary", () => {
  it("does not call Responder for a schema-valid checkout action forbidden by Context V2", async () => {
    const plan: TrackCResponsePlanV2 = {
      currentNeed: "Kiểm tra tình trạng sản phẩm",
      answer: {
        mode: "DIRECT",
        objective: "Trả lời nhu cầu hiện tại",
        evidenceRefs: [],
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
        type: "ASK_CHECKOUT_DETAILS",
        requestedFields: ["PHONE"],
      },
      terminal: false,
      avoid: "Không xin dữ liệu checkout khi chưa được canonical state cho phép",
      effectIntent: "NONE",
    };
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(plan),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: captureWithoutCheckoutAuthorization(),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_CANONICAL_ACTION_NOT_PERMITTED");
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("rejects a supported protected proposition without matching selected evidence before Responder", async () => {
    const plan = {
      currentNeed: "Kiểm tra ưu đãi hiện có",
      answer: {
        mode: "DIRECT",
        objective: "Trả lời tình trạng ưu đãi bằng evidence đã chọn",
        evidenceRefs: [],
        protectedProposition: "PROMOTION_OFFER",
        protectedResolution: "SUPPORTED",
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
      avoid: "Không suy diễn ưu đãi từ evidence không có capability tương ứng",
      effectIntent: "NONE",
    };
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(plan),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: captureWithoutCheckoutAuthorization(),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-NONE effect intent before Responder", async () => {
    const plan = {
      currentNeed: "Xác nhận trạng thái đơn hàng",
      answer: {
        mode: "ACKNOWLEDGE",
        objective: "Phản hồi mà không xác nhận effect",
        evidenceRefs: [],
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
      avoid: "Không để conversation plan tự cấp quyền effect",
      effectIntent: "CONFIRM_ORDER",
    };
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(plan),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: captureWithoutCheckoutAuthorization(),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("rejects checkout fields attached to a non-checkout canonical action", async () => {
    const plan = {
      currentNeed: "Trả lời câu hỏi hiện tại",
      answer: {
        mode: "DIRECT",
        objective: "Trả lời không thu checkout fields",
        evidenceRefs: [],
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
        requestedFields: ["PHONE"],
      },
      terminal: false,
      avoid: "Không widening checkout fields",
      effectIntent: "NONE",
    };
    const transport: CandidateVertexTransport = {
      send: vi.fn(async () => ({
        payload: vertexPayload(plan),
        providerModelVersion: "gemini-3.5-flash-lite",
      })),
    };

    await expect(runTrackCC3TwoPassCandidate({
      caseId: "pii-security",
      modelResource,
      capture: captureWithoutCheckoutAuthorization(),
      evaluationAt,
      evaluationContext,
      accepted: accepted(),
      transport,
    })).rejects.toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");
    expect(transport.send).toHaveBeenCalledTimes(1);
  });
});
