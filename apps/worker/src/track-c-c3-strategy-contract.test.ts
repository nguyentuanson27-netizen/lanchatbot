import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  compileTrackCFixedFirstContactTask,
  compileTrackCStrategistDecision,
  selectTrackCConversationLane,
} from "./track-c-c3-strategy-contract.js";
import { materializeTrackCV5CaseCapture } from
  "./track-c-c3-v5-benchmark-materialization.js";
import { runTrackCV5TwoPassBenchmarkCase } from
  "./track-c-c3-v5-benchmark-runner.js";

const evalRoot = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(
  new URL("runtime-materialization.json", evalRoot), "utf8",
)) as { evaluation_at: string };
const facts = JSON.parse(readFileSync(
  new URL("facts.json", evalRoot), "utf8",
)) as { runtime_claim_catalog: Record<string, unknown> };

function capture(lane: "BEHAVIOR_SIMULATION" | "PRODUCTION_CONTRACT") {
  return materializeTrackCV5CaseCapture({
    lane,
    fixture: {
      id: `STRATEGY_CONTRACT_${lane}`,
      latest_customer_message: "Mẫu này bao nhiêu em?",
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

function payload(value: unknown) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] };
}

function responderPayload(input: Readonly<{
  continuation?: "COLOR";
  canonicalMeasurements?: boolean;
}>) {
  return payload({
    segments: [{
      kind: "VERIFIED_CLAIM",
      text: "Mẫu này hiện 849k chị ạ.",
      claimRef: "CLAIM_001",
      role: "ANSWER",
      decisionInput: "NONE",
    }, ...(input.continuation === undefined ? [] : [{
      kind: "GENERAL",
      text: "Chị thích màu nào hơn ạ?",
      role: "PROGRESSION",
      decisionInput: input.continuation,
    }]), ...(input.canonicalMeasurements === true ? [{
      kind: "CLARIFICATION",
      text: "Chị cho em xin chiều cao và cân nặng để tư vấn size sát hơn ạ?",
      target: "MEASUREMENTS",
      role: "CANONICAL",
      decisionInput: "NONE",
    }, {
      kind: "ACTION_REQUEST",
      text: "Em dựa vào số đo để tư vấn size cho mình ạ.",
      action: "PROVIDE_MEASUREMENTS",
      role: "CANONICAL",
      decisionInput: "NONE",
    }] : [])],
    strategy: input.canonicalMeasurements === true || input.continuation !== undefined
      ? "ASK_CLARIFICATION"
      : "ANSWER_VERIFIED_FACTS",
    cta: input.canonicalMeasurements === true
      ? "ASK_MEASUREMENTS"
      : "NONE",
  });
}

describe("Track C C3 simplified strategy contract", () => {
  it("uses the fixed lane only for a trusted first meaningful acquisition", () => {
    expect(selectTrackCConversationLane([])).toBe("ADAPTIVE_FOLLOWUP");
    expect(selectTrackCConversationLane([{
      kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound: false,
      authorization: "NONE",
    }])).toBe("ADAPTIVE_FOLLOWUP");
    expect(selectTrackCConversationLane([{
      kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound: true,
      authorization: "NONE",
    }])).toBe("FIRST_CONTACT_FIXED");
  });

  it("uses one fixed progression and never asks usual size first", () => {
    const task = compileTrackCFixedFirstContactTask({
      productResolved: true,
      colorChoiceMeaningful: true,
      priceEvidenceRef: "CLAIM_001",
      productEvidenceRefs: ["PRODUCT_PRESENTATION_VARIANT_001"],
      authorizedSellingPointRef: "CLAIM_002",
    });

    expect(task.answer.status).toBe("SUPPORTED");
    expect(task.evidenceRefs).toEqual([
      "CLAIM_001",
      "PRODUCT_PRESENTATION_VARIANT_001",
      "CLAIM_002",
    ]);
    expect(task.continuation).toEqual({ type: "ASK", input: "COLOR" });
    expect(task.canonicalRequest).toBeNull();
  });

  it("asks measurements when color is not a meaningful choice", () => {
    const task = compileTrackCFixedFirstContactTask({
      productResolved: true,
      colorChoiceMeaningful: false,
      priceEvidenceRef: "CLAIM_001",
      productEvidenceRefs: [],
      authorizedSellingPointRef: null,
    });

    expect(task.continuation).toBeNull();
    expect(task.canonicalRequest).toEqual({ type: "ASK_MEASUREMENTS" });
    expect(task.evidenceRefs).toEqual(["CLAIM_001"]);
  });

  it("keeps product and measurements canonical-only and permits usual size only as a fallback", () => {
    const decision = {
      replyAct: "ANSWER",
      goal: "Resolve the fit concern without guessing.",
      proposition: "SIZE_FIT",
      evidenceRefs: [],
      continuation: { type: "ASK", input: "USUAL_SIZE" },
      canonicalAction: "NONE",
    };

    expect(() => compileTrackCStrategistDecision({
      decision,
      evidenceCapabilities: new Map(),
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
    })).toThrow("TRACK_C_STRATEGIST_USUAL_SIZE_NOT_FALLBACK");

    expect(compileTrackCStrategistDecision({
      decision,
      evidenceCapabilities: new Map(),
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: true,
    })).toMatchObject({
      answer: { kind: "ANSWER", status: "UNRESOLVED" },
      continuation: { type: "ASK", input: "USUAL_SIZE" },
    });

    expect(() => compileTrackCStrategistDecision({
      decision: { ...decision, continuation: { type: "ASK", input: "PRODUCT" } },
      evidenceCapabilities: new Map(),
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: true,
    })).toThrow("TRACK_C_STRATEGIST_DECISION_INVALID");
  });

  it("uses one real Responder call for fixed first contact and two calls for adaptive follow-up", async () => {
    const firstContactCapture = capture("BEHAVIOR_SIMULATION");
    const firstContactSend = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValue({
        payload: responderPayload({ canonicalMeasurements: true }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });
    await runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: firstContactCapture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }],
      simulationMetadata: [{
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      }],
      transport: { send: firstContactSend },
    });
    expect(firstContactSend).toHaveBeenCalledTimes(1);

    const adaptiveCapture = capture("PRODUCTION_CONTRACT");
    const adaptiveSend = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: "Answer the verified price.",
          proposition: "PRICE",
          evidenceRefs: ["CLAIM_001"],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: responderPayload({}),
        providerModelVersion: "gemini-3.5-flash-lite",
      });
    await runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: adaptiveCapture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }],
      transport: { send: adaptiveSend },
    });
    expect(adaptiveSend).toHaveBeenCalledTimes(2);
  });
});
