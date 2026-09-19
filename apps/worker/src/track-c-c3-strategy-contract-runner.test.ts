import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { redactAnalyticsMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  buildTrackCStrategistContractRequest,
  runTrackCStrategyContractCase,
  TrackCStrategyContractFailure,
} from "./track-c-c3-strategy-contract-runner.js";
import { buildTrackCSelectableEvidence } from
  "./track-c-c3-selectable-evidence.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";

const MODEL_RESOURCE =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
const EVAL_ROOT = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(
  new URL("runtime-materialization.json", EVAL_ROOT),
  "utf8",
)) as TrackCV5MaterializationRecipe;
const facts = JSON.parse(readFileSync(
  new URL("facts.json", EVAL_ROOT),
  "utf8",
)) as {
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
  simulation_fact_catalog: Record<string, unknown>;
};

function capture() {
  return materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture: {
      id: "C3_CONTRACT_TEST",
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
    runtimeClaimCatalog: facts.runtime_claim_catalog,
    recipe,
  });
}

function payload(value: unknown) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] };
}

function responderDraft() {
  return {
    answerText: null,
    factualTexts: ["Dạ mẫu này hiện 849.000đ ạ."],
    progressionText: "Chị thích màu nào hơn ạ?",
  };
}

describe("Track C C3 strategy-contract runner", () => {
  it("projects simulation facts once into selectable evidence without effect authority", () => {
    const captureValue = capture();
    if (captureValue.status !== "BUILT" || captureValue.context === null) {
      throw new Error("TEST_CAPTURE_REQUIRED");
    }

    const evidence = buildTrackCSelectableEvidence({
      context: captureValue.context,
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      executionLane: "BEHAVIOR_SIMULATION",
    });

    expect(evidence.map(({ capability }) => capability)).toEqual([
      "PRICE",
      "PRODUCT_PRESENTATION",
    ]);
    expect(evidence[1]).toMatchObject({
      subject: { productId: "SQ9012", displayName: "Tường Vi" },
      deterministicText:
        "Mẫu Tường Vi; chất liệu tơ xước mềm, nhẹ; màu kem, đen.",
      provenance: { authority: "SIMULATION" },
    });
    expect(JSON.stringify(evidence)).not.toContain("effect");
  });

  it("does not deterministic-render generic structured simulation data", () => {
    const captureValue = capture();
    if (captureValue.status !== "BUILT" || captureValue.context === null) {
      throw new Error("TEST_CAPTURE_REQUIRED");
    }

    const evidence = buildTrackCSelectableEvidence({
      context: captureValue.context,
      simulationFacts: [facts.simulation_fact_catalog.SF_PAYMENT],
      executionLane: "BEHAVIOR_SIMULATION",
    });
    const policy = evidence.find(({ capability }) => capability === "POLICY");

    expect(policy).toBeDefined();
    expect(policy).not.toHaveProperty("deterministicText");
  });

  it("deterministic-renders comparison only with customer-facing product names", () => {
    const captureValue = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: {
        id: "C3_COMPARISON_RENDER_TEST",
        latest_customer_message: "Hai mẫu này khác nhau thế nào?",
        context: {
          product_binding: {
            status: "RESOLVED",
            product_ids: ["SQ9012", "SV9031"],
          },
          phase: "BROWSING",
          canonical_flags: [],
          buying_intent: {
            decision: "CONSIDERING",
            requested_action: "NONE",
            quantity: null,
            evidence: "customer compares two products",
          },
          source_stage: null,
          runtime_claim_refs: [],
        },
      },
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    if (captureValue.status !== "BUILT" || captureValue.context === null) {
      throw new Error("TEST_CAPTURE_REQUIRED");
    }

    const evidence = buildTrackCSelectableEvidence({
      context: captureValue.context,
      simulationFacts: [
        facts.simulation_fact_catalog.SF_PRODUCT_A,
        facts.simulation_fact_catalog.SF_PRODUCT_B,
        facts.simulation_fact_catalog.SF_OCCASION,
      ],
      executionLane: "BEHAVIOR_SIMULATION",
    });
    const comparison = evidence.find(
      ({ capability }) => capability === "PRODUCT_COMPARISON",
    );

    expect(comparison?.deterministicText).toBe(
      "So sánh: Tường Vi: minimal, easy-going silhouette; " +
      "Nguyệt Hà: more structured and dressy.",
    );
    expect(comparison?.deterministicText).not.toContain("SQ9012");
    expect(comparison?.deterministicText).not.toContain("SV9031");
  });

  it("fails closed when selected factual capability has no safe realization path", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: "Answer the payment-policy question.",
          proposition: "POLICY",
          evidenceRefs: ["SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Shop nhận thanh toán thế nào em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [facts.simulation_fact_catalog.SF_PAYMENT],
      transport: { send },
    })).rejects.toThrow("TRACK_C_EVIDENCE_DETERMINISTIC_REALIZATION_REQUIRED");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("gives Vertex the same discriminated continuation states accepted by the compiler", () => {
    const request = buildTrackCStrategistContractRequest({
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Mẫu này còn hàng không em?",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      evidence: [],
      constraints: {
        permittedCanonicalActions: ["NONE"],
        measurementsUnavailable: false,
        productResolved: true,
        hardStop: false,
      },
    });
    const body = JSON.parse(request.body) as {
      generationConfig: { responseSchema: { anyOf: Array<{
        properties: { continuation: unknown; canonicalAction: { enum: string[] } };
      }> } };
    };
    const none = body.generationConfig.responseSchema.anyOf.find((variant) =>
      variant.properties.canonicalAction.enum[0] === "NONE"
    );

    expect(none?.properties.continuation).toEqual({
      anyOf: [
        {
          type: "OBJECT",
          required: ["type", "input"],
          minProperties: 2,
          maxProperties: 2,
          properties: {
            type: { type: "STRING", enum: ["ASK"] },
            input: {
              type: "STRING",
              enum: [
                "SIZE", "COLOR", "VARIANT", "LOCALITY",
                "PAYMENT_PREFERENCE", "QUANTITY", "STYLE", "BUDGET",
                "DECISION_CRITERION", "DEADLINE",
              ],
            },
          },
        },
        {
          type: "OBJECT",
          required: ["type"],
          minProperties: 1,
          maxProperties: 1,
          properties: { type: { type: "STRING", enum: ["KEEP_OPEN"] } },
        },
      ],
    });
  });

  it("offers USUAL_SIZE to Vertex only after the latest measurement state is unavailable", () => {
    const request = buildTrackCStrategistContractRequest({
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Em chưa có số đo.",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      evidence: [],
      constraints: {
        permittedCanonicalActions: ["NONE"],
        measurementsUnavailable: true,
        productResolved: true,
        hardStop: false,
      },
    });
    const body = JSON.parse(request.body) as {
      generationConfig: { responseSchema: { anyOf: Array<{
        properties: { continuation: { anyOf: Array<{
          properties: { input?: { enum: readonly string[] } };
        }> } };
      }> } };
    };
    const ask = body.generationConfig.responseSchema.anyOf[0]!
      .properties.continuation.anyOf[0]!;

    expect(ask.properties.input?.enum).toContain("USUAL_SIZE");
  });

  it("uses one Responder call for trusted first contact and does not expose code-owned transport metadata", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload(responderDraft()),
      providerModelVersion: "gemini-3.5-flash-lite",
    });
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      trustedAcquisition: {
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      },
      transport: { send },
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.conversationLane).toBe("FIRST_CONTACT_FIXED");
    expect(result.output.strategy).toBe("ASK_CLARIFICATION");
    const request = JSON.parse(send.mock.calls[0]![0].body) as {
      generationConfig: { responseSchema: { properties: Record<string, unknown> } };
    };
    expect(Object.keys(request.generationConfig.responseSchema.properties).sort())
      .toEqual(["answerText", "factualTexts", "progressionText"]);
    expect(request.generationConfig.responseSchema.properties.answerText)
      .toEqual({ type: "NULL" });
    expect(request.generationConfig.responseSchema.properties.factualTexts)
      .toMatchObject({ minItems: 1, maxItems: 1 });
    expect(request.generationConfig.responseSchema.properties.progressionText)
      .toEqual({ type: "STRING", minLength: 1, maxLength: 1_000 });
    expect(result.output.segments[1]).toEqual({
      kind: "VERIFIED_CLAIM",
      text: "Mẫu Tường Vi; chất liệu tơ xước mềm, nhẹ; màu kem, đen.",
      claimContentHash: result.output.segments[1]?.kind === "VERIFIED_CLAIM"
        ? result.output.segments[1].claimContentHash
        : "",
    });
  });

  it("keeps KEEP_OPEN as a natural progression mechanism without a question", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Acknowledge the customer concern without reopening discovery.",
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ em hiểu băn khoăn của chị ạ.",
          factualTexts: [],
          progressionText: "Em vẫn ở đây khi chị cần xem thêm ạ.",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "849k thì hơi cao em ạ.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });

    expect(send).toHaveBeenCalledTimes(2);
    const responderRequest = JSON.parse(send.mock.calls[1]![0].body) as {
      generationConfig: { responseSchema: { properties: { progressionText: unknown } } };
    };
    expect(responderRequest.generationConfig.responseSchema.properties.progressionText)
      .toEqual({ type: "STRING", minLength: 1, maxLength: 1_000 });
    expect(result.output.segments).toEqual([
      { kind: "GENERAL", text: "Dạ em hiểu băn khoăn của chị ạ." },
      { kind: "GENERAL", text: "Em vẫn ở đây khi chị cần xem thêm ạ." },
    ]);
  });

  it("keeps non-factual acknowledgement when selected evidence is deterministic", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Acknowledge the preference and add the selected product fact.",
          proposition: "PRODUCT_PRESENTATION",
          evidenceRefs: ["SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ em hiểu ý chị ạ.",
          factualTexts: [],
          progressionText: "Em vẫn ở đây khi chị cần xem thêm ạ.",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị thích đồ nhẹ em ạ.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      transport: { send },
    });

    const responderRequest = JSON.parse(send.mock.calls[1]![0].body) as {
      generationConfig: {
        responseSchema: { properties: { answerText: unknown; factualTexts: unknown } };
      };
      contents: [{ parts: [{ text: string }] }];
    };
    const responderPrompt = JSON.parse(
      responderRequest.contents[0].parts[0].text,
    ) as { responderTask: { evidence: unknown[] } };

    expect(responderRequest.generationConfig.responseSchema.properties.answerText)
      .toEqual({ type: "STRING", minLength: 1, maxLength: 1_000 });
    expect(responderRequest.generationConfig.responseSchema.properties.factualTexts)
      .toMatchObject({ minItems: 0, maxItems: 0 });
    expect(responderPrompt.responderTask.evidence).toEqual([]);
    expect(result.output.segments[0]).toEqual({
      kind: "GENERAL",
      text: "Dạ em hiểu ý chị ạ.",
    });
    expect(result.reply).toContain("Mẫu Tường Vi");
    expect(result.reply).toContain("Em vẫn ở đây khi chị cần xem thêm ạ.");
  });

  it("rejects KEEP_OPEN wording that turns into a new decision variable", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Acknowledge without reopening discovery.",
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ em hiểu băn khoăn của chị ạ.",
          factualTexts: [],
          progressionText: "Chị thích màu nào hơn ạ.",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "849k thì hơi cao em ạ.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_KEEP_OPEN_INVALID");
  });

  it("returns redacted diagnostic text for phone email and address", async () => {
    const rawDraft = {
      answerText: null,
      factualTexts: ["Dạ mẫu này hiện 849.000đ ạ."],
      progressionText:
        "Chị gửi 0901234567, lan@example.com, địa chỉ: 12 Nguyễn Trãi, Hà Nội nhé.",
    };
    const rawModelText = JSON.stringify(rawDraft);
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload(rawDraft),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    try {
      await runTrackCStrategyContractCase({
        lane: "BEHAVIOR_SIMULATION",
        modelResource: MODEL_RESOURCE,
        capture: capture(),
        evaluationAt: new Date(recipe.evaluation_at),
        evaluationContext: [{
          direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
          text: "Mẫu này bao nhiêu em?", attachmentCount: 0,
          occurredAt: "2026-09-10T01:59:00.000Z",
        }],
        simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
        trustedAcquisition: {
          kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
          origin: "ADVERTISEMENT",
          firstMeaningfulInbound: true,
          authorization: "NONE",
        },
        transport: { send },
      });
      throw new Error("EXPECTED_TRACK_C_FAILURE");
    } catch (error) {
      expect(error).toBeInstanceOf(TrackCStrategyContractFailure);
      const failure = error as TrackCStrategyContractFailure;
      expect(failure.diagnostic.sanitizedRawModelOutput).toBe(
        redactAnalyticsMessage(rawModelText).text.slice(0, 2_000),
      );
      expect(failure.diagnostic.sanitizedRawModelOutput).not.toContain("0901234567");
      expect(failure.diagnostic.sanitizedRawModelOutput).not.toContain("lan@example.com");
      expect(failure.diagnostic.sanitizedRawModelOutput).not.toContain("12 Nguyễn Trãi");
    }
  });

  it("does not let first-contact ASK_MEASUREMENTS fall back to usual size", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        answerText: null,
        factualTexts: ["Dạ mẫu này hiện 849.000đ ạ."],
        progressionText: "Chị thường mặc size gì ạ.",
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      trustedAcquisition: {
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      },
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_MEASUREMENTS_QUESTION_INVALID");
  });

  it("accepts a runtime-owned acquisition signal in production without admitting simulation facts", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        answerText: null,
        factualTexts: ["Dạ giá này đã được xác minh ạ."],
        progressionText: "Chị cho em xin chiều cao và cân nặng để em tư vấn tiếp ạ.",
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    const result = await runTrackCStrategyContractCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      trustedAcquisition: {
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      },
      transport: { send },
    });

    expect(result.conversationLane).toBe("FIRST_CONTACT_FIXED");
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.sideEffects).toBe("DISABLED");
  });

  it("rejects a Responder draft that echoes canonical transport fields", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({ ...responderDraft(), canonicalAction: "ASK_MEASUREMENTS" }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      trustedAcquisition: {
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      },
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_DRAFT_INVALID");
  });

  it("does not give the model a free-text slot for unsupported product presentation", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        ...responderDraft(),
        factualTexts: [
          "Dạ mẫu này hiện 849.000đ ạ.",
          "Mẫu Tường Vi cao cấp ạ.",
        ],
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      trustedAcquisition: {
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      },
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_DRAFT_INVALID");
  });

  it("reuses the production price guard for simulation price evidence", async () => {
    const captureValue = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: {
        id: "C3_SIM_PRICE_GUARD",
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
          runtime_claim_refs: [],
        },
      },
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        answerText: null,
        factualTexts: ["Dạ mẫu này hiện 899.000đ ạ."],
        progressionText: "Chị cho em xin chiều cao và cân nặng để em tư vấn tiếp ạ.",
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: captureValue,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [facts.simulation_fact_catalog.SF_CHANNEL_PRICE],
      trustedAcquisition: {
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      },
      transport: { send },
    })).rejects.toThrow("TRACK_C_V5_PRODUCTION_GUARD_FAILED");
  });

  it("rejects effect language in a provenance-bound factual text", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        ...responderDraft(),
        factualTexts: ["Em đã tạo đơn theo giá 849.000đ rồi ạ."],
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      trustedAcquisition: {
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
      },
      transport: { send },
    })).rejects.toThrow("TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN");
  });

  it("does not allow simulation facts to leak through GENERAL text or production execution", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        ...responderDraft(),
        answerText: "Giá hiện tại là 849.000đ chị nhé.",
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });
    const firstContactMetadata = {
      kind: "TRACK_C_TRUSTED_ACQUISITION_V1" as const,
      origin: "ADVERTISEMENT" as const,
      firstMeaningfulInbound: true,
      authorization: "NONE" as const,
    };
    const input = {
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND" as const,
        senderType: "CUSTOMER" as const,
        messageType: "TEXT" as const,
        text: "Mẫu này bao nhiêu em?",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      trustedAcquisition: firstContactMetadata,
      transport: { send },
    };

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      ...input,
    })).rejects.toThrow("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
    await expect(runTrackCStrategyContractCase({
      lane: "PRODUCTION_CONTRACT",
      ...input,
    })).rejects.toThrow("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
  });
});
