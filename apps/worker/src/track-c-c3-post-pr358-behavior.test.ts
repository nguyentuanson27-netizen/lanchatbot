import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import { materializeTrackCV5CaseCapture } from
  "./track-c-c3-v5-benchmark-materialization.js";
import { runTrackCV5TwoPassBenchmarkCase } from
  "./track-c-c3-v5-benchmark-runner.js";
import {
  runTrackCC3TwoPassQualityCandidate,
  type TrackCC3TwoPassQualityFixture,
} from "./track-c-c3-two-pass-quality-adapter.js";

const evalRoot = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(
  new URL("runtime-materialization.json", evalRoot), "utf8",
)) as { evaluation_at: string };
const facts = JSON.parse(readFileSync(new URL("facts.json", evalRoot), "utf8")) as {
  runtime_claim_catalog: Record<string, unknown>;
};
const modelResource =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";

function payload(value: unknown) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] };
}

function capture() {
  return materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture: {
      id: "STRATEGY_CONTRACT_UNTRUSTED_DIALOGUE",
      latest_customer_message: "Em thấy mẫu này từ quảng cáo nè.",
      context: {
        product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
        phase: "BROWSING",
        canonical_flags: [],
        buying_intent: {
          decision: "NONE",
          requested_action: "NONE",
          quantity: null,
          evidence: null,
        },
        source_stage: null,
        runtime_claim_refs: ["RC_PRICE_A"],
      },
    },
    runtimeClaimCatalog: facts.runtime_claim_catalog as never,
    recipe: recipe as never,
  });
}

const dialogue = [{
  direction: "INBOUND" as const,
  senderType: "CUSTOMER" as const,
  messageType: "TEXT" as const,
  text: "Em thấy mẫu này từ quảng cáo nè.",
  attachmentCount: 0,
  occurredAt: "2026-09-10T01:00:00.000Z",
}];

const decision = {
  replyAct: "ANSWER",
  goal: "Answer the verified price.",
  proposition: "PRICE",
  evidenceRefs: ["CLAIM_001"],
  continuation: { type: "KEEP_OPEN" },
  canonicalAction: "NONE",
};

const reply = {
  segments: [{
    kind: "VERIFIED_CLAIM",
    text: "Mẫu này hiện 849k chị ạ.",
    claimRef: "CLAIM_001",
    role: "ANSWER",
    decisionInput: "NONE",
  }, {
    kind: "GENERAL",
    text: "Chị cần em hỗ trợ thêm điều gì thì nhắn em nhé.",
    role: "PROGRESSION",
    decisionInput: "NONE",
  }],
  strategy: "ANSWER_VERIFIED_FACTS",
  cta: "NONE",
};

function checkoutFixture(input: Readonly<{
  id: string;
  checkout?: unknown;
}>): TrackCC3TwoPassQualityFixture {
  return {
    id: input.id,
    latest_customer_message: "Chị chốt nhé.",
    context: {
      origin: "ORGANIC",
      first_meaningful_inbound: false,
      product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
      phase: "ORDER_REVIEW",
      canonical_flags: [],
      buying_intent: {
        decision: "COMMITTED",
        requested_action: "PROCEED_TO_PAYMENT",
        quantity: 1,
        evidence: "customer commits",
      },
      source_stage: "ORDER_PREVIEW",
      runtime_claim_refs: [],
      ...(input.checkout === undefined ? {} : { checkout_completeness: input.checkout }),
    },
  } as unknown as TrackCC3TwoPassQualityFixture;
}

function canonicalCheckoutReply() {
  return payload({
    segments: [{
      kind: "CLARIFICATION",
      text: "Chị cho em xin số điện thoại nhận hàng ạ?",
      target: "CHECKOUT_DETAILS",
      role: "CANONICAL",
      decisionInput: "NONE",
    }, {
      kind: "ACTION_REQUEST",
      text: "Em cần thông tin còn thiếu để tiếp tục ạ.",
      action: "PROVIDE_CHECKOUT_DETAILS",
      role: "CANONICAL",
      decisionInput: "NONE",
    }],
    strategy: "ASK_CLARIFICATION",
    cta: "ASK_CHECKOUT_DETAILS",
  });
}

function checkoutDecision() {
  return payload({
    replyAct: "CLARIFY",
    goal: "Request the smallest missing checkout detail.",
    proposition: "NONE",
    evidenceRefs: [],
    continuation: null,
    canonicalAction: "ASK_CHECKOUT_DETAILS",
  });
}

async function runCheckoutFixture(
  fixture: TrackCC3TwoPassQualityFixture,
  send: CandidateVertexTransport["send"],
) {
  const capture = materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture,
    runtimeClaimCatalog: facts.runtime_claim_catalog as never,
    recipe: recipe as never,
  });
  return runTrackCC3TwoPassQualityCandidate({
    lane: "BEHAVIOR_SIMULATION",
    modelResource,
    fixture,
    capture,
    evaluationAt: new Date(recipe.evaluation_at),
    evaluationContext: dialogue,
    transport: { send },
  });
}

describe("Track C C3 strategy-contract safety wiring", () => {
  it("does not infer trusted acquisition from customer dialogue", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload(decision), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload(reply), providerModelVersion: "gemini-3.5-flash-lite" });

    await runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue,
      transport: { send },
    });

    expect(send).toHaveBeenCalledTimes(2);
  });

  it("rejects PII in the Strategist goal before the Responder call", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({ ...decision, goal: "Ask for phone 0900000000." }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue,
      transport: { send },
    })).rejects.toThrow("TRACK_C_STRATEGIST_DECISION_INVALID");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("fails closed for malformed or caller-supplied simulation metadata before a provider call", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>();
    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue,
      simulationMetadata: [{
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "EFFECTS_ENABLED",
      } as never],
      transport: { send },
    })).rejects.toThrow("TRACK_C_V5_SIMULATION_METADATA_INVALID");
    expect(send).not.toHaveBeenCalled();

    await expect(runTrackCC3TwoPassQualityCandidate({
      simulationMetadata: [],
    } as never)).rejects.toThrow("TRACK_C_C3_EXTERNAL_SIMULATION_METADATA_FORBIDDEN");
  });

  it("does not let trusted acquisition metadata authorize an unselected fact or effect", async () => {
    const factSend = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValue({
        payload: payload({
          segments: [{
            kind: "VERIFIED_CLAIM",
            text: "Mẫu này đang giảm giá chị ạ.",
            claimRef: "CLAIM_999",
            role: "ANSWER",
            decisionInput: "NONE",
          }, {
            kind: "CLARIFICATION",
            text: "Chị cho em xin chiều cao và cân nặng nhé.",
            target: "MEASUREMENTS",
            role: "CANONICAL",
            decisionInput: "NONE",
          }, {
            kind: "ACTION_REQUEST",
            text: "Em sẽ dựa vào số đo để tư vấn size.",
            action: "PROVIDE_MEASUREMENTS",
            role: "CANONICAL",
            decisionInput: "NONE",
          }],
          strategy: "ASK_CLARIFICATION",
          cta: "ASK_MEASUREMENTS",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });
    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue,
      simulationMetadata: [{
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      }],
      transport: { send: factSend },
    })).rejects.toThrow("TRACK_C_RESPONDER_TASK_MISMATCH");

    const effectSend = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValue({
        payload: payload({
          segments: [{
            kind: "VERIFIED_CLAIM",
            text: "Mẫu này hiện 849k chị ạ.",
            claimRef: "CLAIM_001",
            role: "ANSWER",
            decisionInput: "NONE",
          }, {
            kind: "EFFECT_CLAIM",
            text: "Em đã chốt đơn cho chị.",
            effect: "ORDER_PLACED",
            role: "CANONICAL",
            decisionInput: "NONE",
          }],
          strategy: "HOLD_POSITION",
          cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });
    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue,
      simulationMetadata: [{
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      }],
      transport: { send: effectSend },
    })).rejects.toThrow("TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN");
  });

  it("projects checkout REQUIRED exact fields and rejects raw PII from completeness metadata", async () => {
    const required = checkoutFixture({
      id: "CHECKOUT_REQUIRED",
      checkout: { state: "REQUIRED", missing_fields: ["PHONE"] },
    });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: checkoutDecision(), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: canonicalCheckoutReply(), providerModelVersion: "gemini-3.5-flash-lite" });
    const result = await runCheckoutFixture(required, send);
    expect(result.reply).toContain("số điện thoại");
    expect(result.reply).not.toContain("họ tên");
    expect(result.reply).not.toContain("địa chỉ");

    const complete = checkoutFixture({
      id: "CHECKOUT_COMPLETE",
      checkout: { state: "COMPLETE", missing_fields: [] },
    });
    const completeSend = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Acknowledge the customer without claiming an effect.",
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          segments: [{
            kind: "GENERAL",
            text: "Dạ em đã ghi nhận ạ.",
            role: "ANSWER",
            decisionInput: "NONE",
          }, {
            kind: "GENERAL",
            text: "Chị cần em hỗ trợ thêm điều gì thì nhắn em nhé.",
            role: "PROGRESSION",
            decisionInput: "NONE",
          }],
          strategy: "HOLD_POSITION",
          cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });
    const completeResult = await runCheckoutFixture(complete, completeSend);
    expect(completeResult.reply).not.toMatch(/họ tên|số điện thoại|địa chỉ/iu);

    const rawPii = checkoutFixture({
      id: "CHECKOUT_RAW_PII",
      checkout: {
        state: "COMPLETE",
        missing_fields: [],
        phone: "0900000000",
      },
    });
    const piiSend = vi.fn<CandidateVertexTransport["send"]>();
    await expect(runCheckoutFixture(rawPii, piiSend)).rejects.toThrow(
      "TRACK_C_C3_CHECKOUT_COMPLETENESS_INVALID",
    );
    expect(piiSend).not.toHaveBeenCalled();
  });
});
