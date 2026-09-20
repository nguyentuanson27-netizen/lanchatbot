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
import { trackCEvidenceHasSafeFactualEgress } from
  "./track-c-c3-strategy-contract.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";

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
    factualTexts: [],
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
        "Mẫu Tường Vi có chất liệu tơ xước mềm, nhẹ, hiện có màu kem, đen ạ.",
      provenance: { authority: "SIMULATION" },
    });
    expect(JSON.stringify(evidence)).not.toContain("effect");
  });

  it("does not expose structured simulation evidence without a safe factual egress", () => {
    const captureValue = capture();
    if (captureValue.status !== "BUILT" || captureValue.context === null) {
      throw new Error("TEST_CAPTURE_REQUIRED");
    }

    const evidence = buildTrackCSelectableEvidence({
      context: captureValue.context,
      simulationFacts: [facts.simulation_fact_catalog.SF_PAYMENT],
      executionLane: "BEHAVIOR_SIMULATION",
    });
    expect(evidence.some(({ capability }) => capability === "POLICY")).toBe(false);
  });

  it("does not expose comparison evidence without a customer-facing projection", () => {
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
    expect(comparison).toMatchObject({
      deterministicText:
        "Tường Vi thiên về dáng tối giản, dễ mặc; Nguyệt Hà có phom chỉn chu hơn ạ.",
      provenance: { authority: "SIMULATION" },
    });
  });

  it("exposes only evidence that already has a safe factual egress", () => {
    const captureValue = capture();
    if (captureValue.status !== "BUILT" || captureValue.context === null) {
      throw new Error("TEST_CAPTURE_REQUIRED");
    }

    const evidence = buildTrackCSelectableEvidence({
      context: captureValue.context,
      simulationFacts: [
        facts.simulation_fact_catalog.SF_PAYMENT,
        facts.simulation_fact_catalog.SF_STORE,
        facts.simulation_fact_catalog.SF_GIFT_PROMO,
        facts.simulation_fact_catalog.SF_ORDER_TOTAL,
        facts.simulation_fact_catalog.SF_BACK_COVERAGE,
        facts.simulation_fact_catalog.SF_CHANNEL_PRICE,
      ],
      executionLane: "BEHAVIOR_SIMULATION",
    });

    expect(evidence.map(({ capability }) => capability)).toEqual([
      "PRICE",
      "PRICE",
    ]);
    expect(evidence.every(trackCEvidenceHasSafeFactualEgress)).toBe(true);
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
      .toMatchObject({ minItems: 0, maxItems: 0 });
    expect(request.generationConfig.responseSchema.properties.progressionText)
      .toEqual({ type: "STRING", minLength: 1, maxLength: 1_000 });
    expect(result.output.segments[1]).toEqual({
      kind: "VERIFIED_CLAIM",
      text: "Mẫu Tường Vi có chất liệu tơ xước mềm, nhẹ, hiện có màu kem, đen ạ.",
      claimContentHash: result.output.segments[1]?.kind === "VERIFIED_CLAIM"
        ? result.output.segments[1].claimContentHash
        : "",
    });
  });

  it("does not give the model a free-form factual slot for an authorized price", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        answerText: null,
        factualTexts: ["Dạ mẫu này hiện 849.000đ và rất cao cấp ạ."],
        progressionText: "Chị thích màu nào hơn ạ?",
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
    })).rejects.toBeInstanceOf(TrackCStrategyContractFailure);
  });

  it("keeps typed STOCK variant identity out of SIZE_FIT recommendation semantics", () => {
    const captureValue = materializeTrackCV5CaseCapture({
      lane: "PRODUCTION_CONTRACT",
      fixture: {
        id: "C3_STOCK_VARIANT_GUARD",
        latest_customer_message: "Tường Vi size S hết rồi à em?",
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
          runtime_claim_refs: ["RC_STOCK_SIZE_S_OUT"],
        },
      },
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const context = contextFromFrozenTrackCCapture({
      capture: captureValue,
      evaluationAt: new Date(recipe.evaluation_at),
    });
    const claim = context.verifiedClaims[0]!;
    const value = {
      segments: [{
        kind: "VERIFIED_CLAIM",
        text: "Dạ mẫu này hiện hết size S ạ.",
        claimContentHash: claim.provenance.contentHash,
      }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    };

    expect(() => validateResponderOutput(
      context,
      value,
      "PRODUCTION_CONTRACT",
      new Date(recipe.evaluation_at),
    )).not.toThrow();

    expect(() => validateResponderOutput(
      context,
      {
        ...value,
        segments: [{
          ...value.segments[0],
          text: "Dạ mẫu này hiện hết size M ạ.",
        }],
      },
      "PRODUCTION_CONTRACT",
      new Date(recipe.evaluation_at),
    )).toThrow();

    expect(() => validateResponderOutput(
      context,
      {
        ...value,
        segments: [{
          ...value.segments[0],
          text: "Dạ mẫu này hiện hết size S ạ, theo số đo chị hợp size M.",
        }],
      },
      "PRODUCTION_CONTRACT",
      new Date(recipe.evaluation_at),
    )).toThrow();
  });

  it("code-realizes a bounded answer for unresolved factual propositions", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: "Answer the stock question without inventing availability.",
          proposition: "STOCK",
          evidenceRefs: [],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: null,
          factualTexts: [],
          progressionText: null,
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
        text: "Mẫu này còn hàng không em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });

    const responderRequest = JSON.parse(send.mock.calls[1]![0].body) as {
      generationConfig: {
        responseSchema: { properties: { answerText: unknown } };
      };
    };
    expect(responderRequest.generationConfig.responseSchema.properties.answerText)
      .toEqual({ type: "NULL" });
    expect(result.conversationPlan).toMatchObject({
      replyAct: "ANSWER",
      proposition: "STOCK",
    });
    expect(result.reply).toBe(
      "Dạ hiện em chưa có thông tin đã xác minh để trả lời chắc chắn phần này ạ.\n" +
      "Em vẫn ở đây khi chị cần xem thêm ạ.",
    );
  });

  it("encodes objection-first strategist semantics without changing the minimal contract", () => {
    const request = buildTrackCStrategistContractRequest({
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Chị vẫn còn lăn tăn nên chưa muốn quyết ngay.",
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
      systemInstruction: { parts: [{ text: string }] };
      generationConfig: { responseSchema: { anyOf: unknown[] } };
    };

    expect(body.systemInstruction.parts[0].text).toContain(
      "If the latest customer turn expresses an objection, concern, hesitation, or resistance, replyAct must be ACKNOWLEDGE",
    );
    expect(body.systemInstruction.parts[0].text).toContain(
      "directly relevant to the customer's current decision or to an immediate next decision already established",
    );
    expect(body.systemInstruction.parts[0].text).toContain(
      "Do not invent a new discovery dimension merely because it could be useful later",
    );
    expect(body.systemInstruction.parts[0].text).toContain(
      "primarily confirms or corrects a preference or product selection",
    );
    expect(body.systemInstruction.parts[0].text).toContain(
      "A selection alone is not buying commitment or checkout authorization",
    );
    expect(body.generationConfig.responseSchema.anyOf).toBeDefined();
  });

  it("handles objection before grounded factual explanation when supported evidence exists", async () => {
    const captureValue = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: {
        id: "C3_OBJECTION_SUPPORTED_EVIDENCE",
        latest_customer_message:
          "Chị vẫn lăn tăn vì mẫu này chỉ còn ít, chị chưa yên tâm lắm.",
        context: {
          product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
          phase: "BROWSING",
          canonical_flags: [],
          buying_intent: {
            decision: "CONSIDERING",
            requested_action: "NONE",
            quantity: null,
            evidence: "customer remains hesitant",
          },
          source_stage: null,
          runtime_claim_refs: ["RC_STOCK_A_LOW"],
        },
      },
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Acknowledge the concern, then explain the verified stock state.",
          proposition: "STOCK",
          evidenceRefs: ["CLAIM_001"],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ em hiểu băn khoăn của chị ạ.",
          factualTexts: [],
          progressionText: null,
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: captureValue,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Chị vẫn lăn tăn vì mẫu này chỉ còn ít, chị chưa yên tâm lắm.",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });

    expect(result.conversationPlan).toMatchObject({
      replyAct: "ACKNOWLEDGE",
      proposition: "STOCK",
      evidenceRefs: ["CLAIM_001"],
      continuation: { type: "KEEP_OPEN" },
      canonicalAction: "NONE",
    });
    expect(result.output.segments).toEqual([
      { kind: "GENERAL", text: "Dạ em hiểu băn khoăn của chị ạ." },
      expect.objectContaining({
        kind: "VERIFIED_CLAIM",
        text: "Dạ mẫu này hiện còn hàng nhưng số lượng không nhiều ạ.",
      }),
      { kind: "GENERAL", text: "Em vẫn ở đây khi chị cần xem thêm ạ." },
    ]);
  });

  it("keeps preference or selection confirmation on ACKNOWLEDGE + KEEP_OPEN without checkout", async () => {
    const captureValue = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: {
        id: "C3_SELECTION_ACK_KEEP_OPEN",
        latest_customer_message: "Chị nghiêng về mẫu này rồi nhé.",
        context: {
          product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
          phase: "BROWSING",
          canonical_flags: [],
          buying_intent: {
            decision: "CONSIDERING",
            requested_action: "NONE",
            quantity: null,
            evidence: "customer confirms a preference but has not committed",
          },
          source_stage: null,
          runtime_claim_refs: [],
        },
      },
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Acknowledge the customer's selection preference without reopening discovery.",
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ em hiểu ý chị ạ.",
          factualTexts: [],
          progressionText: null,
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: captureValue,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị nghiêng về mẫu này rồi nhé.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });

    expect(result.conversationPlan).toMatchObject({
      replyAct: "ACKNOWLEDGE",
      proposition: "NONE",
      continuation: { type: "KEEP_OPEN" },
      canonicalAction: "NONE",
    });
    expect(result.output.cta).toBe("NONE");
    expect(result.reply).toBe(
      "Dạ em hiểu ý chị ạ.\nEm vẫn ở đây khi chị cần xem thêm ạ.",
    );
  });

  it("gives the Responder only the typed ASK input and no factual wording authority", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "CLARIFY",
          goal: "Ask the color choice already relevant to the customer's current decision.",
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "ASK", input: "COLOR" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ được chị ạ.",
          factualTexts: [],
          progressionText: "Chị muốn chọn màu nào ạ?",
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
        text: "Chị đang chọn màu cho mẫu này.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });

    const responderBody = JSON.parse(send.mock.calls[1]![0].body) as {
      systemInstruction: { parts: [{ text: string }] };
      contents: [{ parts: [{ text: string }] }];
    };
    const responderPrompt = JSON.parse(
      responderBody.contents[0].parts[0].text,
    ) as {
      responderTask: {
        evidence: unknown[];
        continuation: { type: string; input: string } | null;
      };
    };

    expect(responderPrompt.responderTask.evidence).toEqual([]);
    expect(responderPrompt.responderTask.continuation).toEqual({
      type: "ASK",
      input: "COLOR",
    });
    expect(responderBody.systemInstruction.parts[0].text).toContain(
      "For a typed ASK, progressionText must be one minimal question about only the supplied continuation.input",
    );
    expect(result.output.segments.at(-1)).toEqual({
      kind: "GENERAL",
      text: "Chị muốn chọn màu nào ạ?",
    });
  });

  it("fails closed when an ASK progression authors factual wording", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "CLARIFY",
          goal: "Ask the color choice already relevant to the customer's current decision.",
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "ASK", input: "COLOR" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ được chị ạ.",
          factualTexts: [],
          progressionText: "Mẫu này giá 849.000đ, chị muốn chọn màu nào ạ?",
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
        text: "Chị đang chọn màu cho mẫu này.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
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
          progressionText: null,
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
      generationConfig: {
        responseSchema: {
          properties: { answerText: unknown; progressionText: unknown };
        };
      };
    };
    expect(responderRequest.generationConfig.responseSchema.properties.answerText)
      .toEqual({
        type: "STRING",
        enum: [
          "Dạ em hiểu ý chị ạ.",
          "Dạ em hiểu băn khoăn của chị ạ.",
        ],
      });
    expect(responderRequest.generationConfig.responseSchema.properties.progressionText)
      .toEqual({ type: "NULL" });
    expect(result.output.strategy).toBe("ANSWER_VERIFIED_FACTS");
    expect(result.output.segments).toEqual([
      { kind: "GENERAL", text: "Dạ em hiểu băn khoăn của chị ạ." },
      { kind: "GENERAL", text: "Em vẫn ở đây khi chị cần xem thêm ạ." },
    ]);
  });

  it("rejects model-authored KEEP_OPEN wording even when it looks neutral", async () => {
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
          answerText: "Dạ em hiểu ý chị ạ.",
          factualTexts: [],
          progressionText: "Em vẫn ở đây khi chị cần xem thêm ạ.",
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
        text: "Chị để xem thêm nhé.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_KEEP_OPEN_INVALID");
  });

  it("keeps non-factual acknowledgement when selected evidence is deterministic", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Acknowledge the preference and add the selected product fact.",
          proposition: "PRODUCT_PRESENTATION",
          evidenceRefs: ["CLAIM_001", "SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ em hiểu ý chị ạ.",
          factualTexts: [],
          progressionText: null,
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
      .toEqual({
        type: "STRING",
        enum: [
          "Dạ em hiểu ý chị ạ.",
          "Dạ em hiểu băn khoăn của chị ạ.",
        ],
      });
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

  it("rejects unsupported selling wording in deterministic ACK answerText", async () => {
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
          answerText: "Dạ mẫu này cao cấp lắm chị ạ.",
          factualTexts: [],
          progressionText: null,
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
        text: "Chị thích đồ nhẹ em ạ.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
  });

  it("reserves HOLD_POSITION strategy for an actual no-reopen canonical stop", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Respect the explicit stop without reopening.",
          proposition: "NONE",
          evidenceRefs: [],
          continuation: null,
          canonicalAction: "HOLD_POSITION",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ em hiểu ý chị ạ.",
          factualTexts: [],
          progressionText: null,
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: materializeTrackCV5CaseCapture({
        lane: "BEHAVIOR_SIMULATION",
        fixture: {
          id: "C3_HOLD_POSITION_METADATA",
          latest_customer_message: "Không cần nữa em.",
          context: {
            product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
            phase: "BROWSING",
            canonical_flags: [],
            buying_intent: {
              decision: "NEGATED",
              requested_action: "NONE",
              quantity: null,
              evidence: "customer explicitly stopped",
            },
            source_stage: null,
            runtime_claim_refs: [],
          },
        },
        runtimeClaimCatalog: facts.runtime_claim_catalog,
        recipe,
      }),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Không cần nữa em.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });

    expect(result.output.strategy).toBe("HOLD_POSITION");
    expect(result.output.cta).toBe("NONE");
    expect(result.reply).toBe("Dạ em hiểu ý chị ạ.");
  });

  it("returns redacted diagnostic text for phone email and address", async () => {
    const rawDraft = {
      answerText: null,
      factualTexts: [],
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
        factualTexts: [],
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
        factualTexts: [],
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

  it("code-realizes simulation price instead of exposing a factual text slot", async () => {
    const captureValue = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: {
        id: "C3_SIM_PRICE_DETERMINISTIC",
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
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: "Answer the verified channel price.",
          proposition: "PRICE",
          evidenceRefs: ["SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: null,
          factualTexts: [],
          progressionText: null,
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCStrategyContractCase({
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
      transport: { send },
    });

    expect(result.reply).toContain("849.000đ");
    expect(result.reply).not.toContain("899.000đ");
  });

  it("rejects effect language in deterministic factual text", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Acknowledge and use the selected product evidence.",
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
          progressionText: null,
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
        text: "Chị đang xem mẫu này.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      simulationFacts: [{
        kind: "PRODUCT_PROFILE",
        productId: "SQ9012",
        displayName: "Tường Vi",
        offerType: "set áo & quần",
        material: "shop đã tạo đơn",
        design: [],
        sizes: ["S"],
        colors: ["đen"],
      }],
      transport: { send },
    })).rejects.toThrow("TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN");
  });

  it("fails closed when the model injects factual or effect text into factualTexts", async () => {
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
    })).rejects.toBeInstanceOf(TrackCStrategyContractFailure);
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

  it("requires first-contact ASK COLOR to request customer preference rather than shop availability", async () => {
    const validSend = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        answerText: null,
        factualTexts: [],
        progressionText: "Chị thích màu nào hơn ạ?",
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    const valid = await runTrackCStrategyContractCase({
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
      transport: { send: validSend },
    });

    expect(valid.reply).toMatch(/thích\s+màu|màu\s+nào/iu);

    const invalidSend = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        answerText: null,
        factualTexts: [],
        progressionText: "Mẫu này bên em có những màu nào ạ?",
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
      transport: { send: invalidSend },
    })).rejects.toThrow("TRACK_C_RESPONDER_COLOR_DECISION_QUESTION_INVALID");
  });

  it("rejects a typed COLOR ASK realized as a different customer decision input", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: "Acknowledge the customer's stated preference and ask only the chosen color decision.",
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "ASK", input: "COLOR" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ em hiểu ý chị ạ.",
          factualTexts: [],
          progressionText: "Chị cần nhận hàng trước ngày nào ạ?",
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
        text: "Chị đang cân nhắc màu.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    })).rejects.toThrow("TRACK_C_RESPONDER_COLOR_DECISION_QUESTION_INVALID");
  });

  it("derives conservative deadline feasibility from selected verified ETA and the customer cutoff", async () => {
    const captureValue = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: {
        id: "C3_DEADLINE_FEASIBILITY",
        latest_customer_message: "Nếu tới ngày thứ 4 thì chị không dùng được nữa.",
        context: {
          product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
          phase: "BROWSING",
          canonical_flags: [],
          buying_intent: {
            decision: "CONSIDERING",
            requested_action: "NONE",
            quantity: null,
            evidence: "customer has a delivery cutoff",
          },
          source_stage: null,
          runtime_claim_refs: ["RC_ETA_HN"],
        },
      },
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: "Resolve whether the verified delivery window can guarantee the customer's cutoff.",
          proposition: "ETA",
          evidenceRefs: ["CLAIM_001"],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: null,
          factualTexts: [],
          progressionText: null,
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: captureValue,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Nếu tới ngày thứ 4 thì chị không dùng được nữa.",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });

    expect(result.reply).toMatch(/2.?4\s*ngày/iu);
    expect(result.reply).toMatch(/không\s+bảo\s+đảm.*(?:kịp|mốc)/iu);
    expect(result.reply).not.toMatch(/giao\s+hỏa\s*tốc|express|chắc\s+chắn\s+kịp/iu);
  });

});
