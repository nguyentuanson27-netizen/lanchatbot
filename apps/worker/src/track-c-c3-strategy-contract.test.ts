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
  continuation?: "COLOR" | "USUAL_SIZE";
  keepOpen?: boolean;
  canonicalMeasurements?: boolean;
  strategy?: "ANSWER_VERIFIED_FACTS" | "ASK_CLARIFICATION" | "HOLD_POSITION";
}>) {
  return payload({
    segments: [{
      kind: "VERIFIED_CLAIM",
      text: "Mẫu này hiện 849k chị ạ.",
      claimRef: "CLAIM_001",
      role: "ANSWER",
      decisionInput: "NONE",
    }, ...(input.keepOpen === true ? [{
      kind: "GENERAL",
      text: "Chị cần em hỗ trợ thêm điều gì thì nhắn em nhé.",
      role: "PROGRESSION",
      decisionInput: "NONE",
    }] : []), ...(input.continuation === undefined ? [] : [{
      kind: "GENERAL",
      text: input.continuation === "COLOR"
        ? "Chị thích màu nào hơn ạ?"
        : "Chị thường mặc size nào ạ?",
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
    strategy: input.strategy ?? (input.canonicalMeasurements === true || input.continuation !== undefined
      ? "ASK_CLARIFICATION"
      : "ANSWER_VERIFIED_FACTS"),
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
      classificationOrVariantRequired: false,
      colorChoiceMeaningful: true,
      fitQualificationUseful: false,
      priceEvidenceRef: "CLAIM_001",
      productEvidenceRefs: ["PRODUCT_PRESENTATION_VARIANT_001"],
      usefulProductFactRef: "CLAIM_002",
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
      classificationOrVariantRequired: false,
      colorChoiceMeaningful: false,
      fitQualificationUseful: true,
      priceEvidenceRef: "CLAIM_001",
      productEvidenceRefs: [],
      usefulProductFactRef: null,
    });

    expect(task.continuation).toBeNull();
    expect(task.canonicalRequest).toEqual({ type: "ASK_MEASUREMENTS" });
    expect(task.evidenceRefs).toEqual(["CLAIM_001"]);
  });

  it("prioritizes canonical product classification before price and fit progression", () => {
    const task = compileTrackCFixedFirstContactTask({
      productResolved: true,
      classificationOrVariantRequired: true,
      colorChoiceMeaningful: true,
      fitQualificationUseful: true,
      priceEvidenceRef: "CLAIM_001",
      productEvidenceRefs: ["PRODUCT_PRESENTATION_VARIANT_001"],
      usefulProductFactRef: "PRODUCT_ATTRIBUTES_001",
    });

    expect(task).toMatchObject({
      evidenceRefs: [],
      requiredEvidenceRefs: [],
      continuation: null,
      canonicalRequest: { type: "ASK_PRODUCT" },
    });
  });

  it("keeps the known product when price is unresolved and does not force fit qualification", () => {
    const missingPrice = compileTrackCFixedFirstContactTask({
      productResolved: true,
      classificationOrVariantRequired: false,
      colorChoiceMeaningful: false,
      fitQualificationUseful: false,
      priceEvidenceRef: null,
      productEvidenceRefs: ["PRODUCT_PRESENTATION_DISPLAY_001"],
      usefulProductFactRef: null,
    });
    expect(missingPrice).toMatchObject({
      answer: { kind: "ACKNOWLEDGE", status: "NOT_APPLICABLE" },
      evidenceRefs: [],
      continuation: { type: "KEEP_OPEN" },
      canonicalRequest: null,
    });

    const lowPressure = compileTrackCFixedFirstContactTask({
      productResolved: true,
      classificationOrVariantRequired: false,
      colorChoiceMeaningful: false,
      fitQualificationUseful: false,
      priceEvidenceRef: "CLAIM_001",
      productEvidenceRefs: [],
      usefulProductFactRef: null,
    });
    expect(lowPressure.continuation).toEqual({ type: "KEEP_OPEN" });
    expect(lowPressure.canonicalRequest).toBeNull();
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

    expect(compileTrackCStrategistDecision({
      decision: { ...decision, continuation: { type: "ASK", input: "BUDGET" } },
      evidenceCapabilities: new Map(),
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
    }).continuation).toEqual({ type: "ASK", input: "BUDGET" });
  });

  it("uses one real Responder call for fixed first contact and two calls for adaptive follow-up", async () => {
    const firstContactCapture = capture("BEHAVIOR_SIMULATION");
    const firstContactSend = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValue({
        payload: responderPayload({ keepOpen: true }),
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
        payload: responderPayload({ keepOpen: true }),
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
    const responderBody = JSON.parse(adaptiveSend.mock.calls[1]?.[0].body ?? "{}") as {
      contents?: Array<{ parts?: Array<{ text?: string }> }>;
    };
    const responderPrompt = JSON.parse(
      responderBody.contents?.[0]?.parts?.[0]?.text ?? "{}",
    ) as Record<string, unknown>;
    expect(responderPrompt).not.toHaveProperty("verifiedClaims");
    expect(responderPrompt).not.toHaveProperty("productAttributes");
    expect(responderPrompt.selectedEvidence).toEqual([expect.objectContaining({
      ref: "CLAIM_001",
      capability: "PRICE",
    })]);
  });

  it("rejects an adaptive KEEP_OPEN reply that does not realize its continuation", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
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

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: capture("PRODUCTION_CONTRACT"),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }],
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_TASK_MISMATCH");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("rejects a Responder strategy that differs from the code-owned task", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: "Answer the verified price and ask about color.",
          proposition: "PRICE",
          evidenceRefs: ["CLAIM_001"],
          continuation: { type: "ASK", input: "COLOR" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: responderPayload({
          continuation: "COLOR",
          strategy: "ANSWER_VERIFIED_FACTS",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: capture("PRODUCTION_CONTRACT"),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }],
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_TASK_MISMATCH");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("binds simulation-only facts through selected evidence without exposing unselected Context V2 facts", async () => {
    const simulationFact = {
      kind: "PRODUCT_PROFILE",
      productId: "SQ9012",
      displayName: "Tường Vi",
      material: "tơ xước mềm",
    };
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: "Answer with the selected product detail.",
          proposition: "PRODUCT_ATTRIBUTES",
          evidenceRefs: ["SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          segments: [{
            kind: "VERIFIED_CLAIM",
            text: "Mẫu này rất thoải mái chị ạ.",
            claimRef: "SIMULATION_001",
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
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: capture("BEHAVIOR_SIMULATION"),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Mẫu này chất liệu gì em?",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }],
      simulationFacts: [simulationFact],
      transport: { send },
    });

    expect(result.reply).toContain("tơ xước mềm");
    expect(result.reply).not.toContain("{");
    const responderBody = JSON.parse(send.mock.calls[1]?.[0].body ?? "{}") as {
      contents?: Array<{ parts?: Array<{ text?: string }> }>;
    };
    const responderPrompt = JSON.parse(
      responderBody.contents?.[0]?.parts?.[0]?.text ?? "{}",
    ) as Record<string, unknown>;
    expect(responderPrompt).not.toHaveProperty("verifiedClaims");
    expect(responderPrompt.selectedEvidence).toEqual([expect.objectContaining({
      ref: "SIMULATION_001",
      capability: "PRODUCT_ATTRIBUTES",
    })]);
    expect(responderPrompt.benchmarkSimulationFacts).toEqual([simulationFact]);
  });

  it("uses one bounded simulation product fact in fixed first contact", async () => {
    const simulationFact = {
      kind: "PRODUCT_PROFILE",
      productId: "SQ9012",
      material: "tơ xước mềm",
    };
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: responderPayload({ keepOpen: true }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    const result = await runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: capture("BEHAVIOR_SIMULATION"),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }],
      simulationMetadata: [{
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      }],
      simulationFacts: [simulationFact],
      transport: { send },
    });

    expect(result.conversationPlan).toMatchObject({
      evidenceRefs: expect.arrayContaining(["SIMULATION_001"]),
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not expose evidence without a safe renderer to the Strategist", async () => {
    const stock = { kind: "FULFILLMENT_SNAPSHOT", data: { status: "MADE_TO_ORDER" } };
    const unrecognizedCare = { kind: "CARE_GUIDANCE", data: { wash: "internal_wash_code" } };
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: "Answer the selected fulfillment status.",
          proposition: "FULFILLMENT_STATUS",
          evidenceRefs: ["SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          segments: [{
            kind: "VERIFIED_CLAIM", text: "raw", claimRef: "SIMULATION_001",
            role: "ANSWER", decisionInput: "NONE",
          }, {
            kind: "GENERAL", text: "Chị cân nhắc thêm nhé.",
            role: "PROGRESSION", decisionInput: "NONE",
          }],
          strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });
    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: capture("BEHAVIOR_SIMULATION"),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao lâu có?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }],
      simulationFacts: [stock, unrecognizedCare], transport: { send },
    })).rejects.toThrow("TRACK_C_STRATEGIST_EVIDENCE_INVALID");
    expect(send).toHaveBeenCalledTimes(1);
    const strategistBody = JSON.parse(send.mock.calls[0]?.[0].body ?? "{}") as {
      contents?: Array<{ parts?: Array<{ text?: string }> }>;
    };
    const strategistPrompt = JSON.parse(
      strategistBody.contents?.[0]?.parts?.[0]?.text ?? "{}",
    ) as { strategistConstraints?: { evidenceCapabilities?: Record<string, unknown> } };
    expect(strategistPrompt.strategistConstraints?.evidenceCapabilities)
      .not.toHaveProperty("SIMULATION_001");
    expect(strategistPrompt.strategistConstraints?.evidenceCapabilities)
      .not.toHaveProperty("SIMULATION_002");
  });

  it("does not keep an old conversation stop after a newer customer request", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Honor the explicit request to stop.",
          proposition: "NONE",
          evidenceRefs: [], continuation: null, canonicalAction: "HOLD_POSITION",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          segments: [{
            kind: "GENERAL", text: "Dạ em dừng tại đây ạ.",
            role: "ANSWER", decisionInput: "NONE",
          }],
          strategy: "HOLD_POSITION", cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: capture("PRODUCTION_CONTRACT"),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Dừng ở đây nhé em.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }, {
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:01:00.000Z",
      }],
      transport: { send },
    })).rejects.toThrow("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("permits hold from the canonical negated buying state without a text match", async () => {
    const negatedCapture = materializeTrackCV5CaseCapture({
      lane: "PRODUCTION_CONTRACT",
      fixture: {
        id: "STRATEGY_CONTRACT_NEGATED",
        latest_customer_message: "Thôi chị không mua nữa.",
        context: {
          product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
          phase: "BROWSING",
          canonical_flags: [],
          buying_intent: {
            decision: "NEGATED",
            requested_action: "NONE",
            quantity: null,
            evidence: "Thôi chị không mua nữa.",
          },
          source_stage: null,
          runtime_claim_refs: ["RC_PRICE_A"],
        },
      },
      runtimeClaimCatalog: facts.runtime_claim_catalog as never,
      recipe: recipe as never,
    });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Honor the canonical decision not to continue.",
          proposition: "NONE",
          evidenceRefs: [], continuation: null, canonicalAction: "HOLD_POSITION",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          segments: [{
            kind: "GENERAL", text: "Dạ em ghi nhận ạ.",
            role: "ANSWER", decisionInput: "NONE",
          }],
          strategy: "HOLD_POSITION", cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: negatedCapture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Em gửi chị giá nhé.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }],
      transport: { send },
    })).resolves.toMatchObject({ reply: "Dạ em ghi nhận ạ." });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not treat an old lack of measurements as the current fallback state", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: "Use usual size only if measurements are still unavailable.",
          proposition: "PRICE",
          evidenceRefs: ["CLAIM_001"],
          continuation: { type: "ASK", input: "USUAL_SIZE" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: responderPayload({ continuation: "USUAL_SIZE" }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: capture("PRODUCTION_CONTRACT"),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị chưa có số đo.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }, {
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị cao 160 cm, nặng 50 kg.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:01:00.000Z",
      }],
      transport: { send },
    })).rejects.toThrow("TRACK_C_STRATEGIST_USUAL_SIZE_NOT_FALLBACK");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("permits a code-recognized explicit stop to hold the conversation without reopening", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Honor the explicit request to stop.",
          proposition: "NONE",
          evidenceRefs: [], continuation: null, canonicalAction: "HOLD_POSITION",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          segments: [{
            kind: "GENERAL", text: "Dạ em dừng tại đây ạ.",
            role: "ANSWER", decisionInput: "NONE",
          }],
          strategy: "HOLD_POSITION", cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });
    const result = await runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      capture: capture("PRODUCTION_CONTRACT"),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Dừng ở đây nhé em, đừng hỏi thêm chị nữa.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:00:00.000Z",
      }],
      transport: { send },
    });
    expect(result.reply).toBe("Dạ em dừng tại đây ạ.");
    expect(send).toHaveBeenCalledTimes(2);
  });
});
