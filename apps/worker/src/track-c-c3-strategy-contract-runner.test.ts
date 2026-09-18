import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  buildTrackCStrategistContractRequest,
  runTrackCStrategyContractCase,
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
    factualTexts: [
      "Dạ mẫu này hiện 849.000đ ạ.",
      "Mẫu Tường Vi có chất liệu tơ xước mềm, nhẹ và có màu kem, đen ạ.",
    ],
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
      provenance: { authority: "SIMULATION" },
    });
    expect(JSON.stringify(evidence)).not.toContain("effect");
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
  });

  it("accepts a runtime-owned acquisition signal in production without admitting simulation facts", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        answerText: null,
        factualTexts: ["Dạ giá này đã được xác minh ạ."],
        progressionText: "Chị cần em hỗ trợ thêm phần nào ạ?",
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

  it("rejects effect language in a provenance-bound factual text", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        ...responderDraft(),
        factualTexts: [
          "Em đã tạo đơn theo giá 849.000đ rồi ạ.",
          "Mẫu Tường Vi có chất liệu tơ xước mềm, nhẹ và có màu kem, đen ạ.",
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
