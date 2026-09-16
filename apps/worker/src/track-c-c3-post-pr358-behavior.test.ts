import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ShadowContextMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import { buildTrackCOfflineCandidateRequest } from "./track-c-offline-candidate.js";
import { validateTrackCOfflineCandidate } from
  "./track-c-offline-candidate-validation.js";
import {
  TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
  TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION,
  type TrackCResponsePlanV2,
} from "./track-c-c3-two-pass-candidate.js";
import {
  runTrackCC3TwoPassQualityCandidate,
} from "./track-c-c3-two-pass-quality-adapter.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5CompactCase,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";
import {
  runTrackCV5TwoPassBenchmarkCase,
  type TrackCV5SimulationMetadata,
} from "./track-c-c3-v5-benchmark-runner.js";

const MODEL_RESOURCE =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
const EVAL_ROOT = new URL("../evals/track-c-c2/v2/", import.meta.url);

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, EVAL_ROOT), "utf8")) as T;
}

const recipe = readJson<TrackCV5MaterializationRecipe>(
  "runtime-materialization.json",
);
const facts = readJson<{
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
  simulation_fact_catalog: Record<string, unknown>;
}>("facts.json");

type CheckoutCompleteness = Readonly<{
  state: "REQUIRED" | "COMPLETE";
  missing_fields: readonly (
    "FULL_NAME" | "PHONE" | "ADDRESS" | "PAYMENT_METHOD"
  )[];
}>;

type SimulationFixture = TrackCV5CompactCase & Readonly<{
  context: TrackCV5CompactCase["context"] & Readonly<{
    origin: "ADVERTISEMENT" | "ORGANIC";
    first_meaningful_inbound: boolean;
    checkout_completeness?: CheckoutCompleteness;
  }>;
}>;

function fixture(input: Readonly<{
  id: string;
  message: string;
  origin?: "ADVERTISEMENT" | "ORGANIC";
  firstMeaningfulInbound?: boolean;
  productBinding?: Readonly<{
    status: "RESOLVED" | "UNRESOLVED" | "AMBIGUOUS" | "STALE";
    product_ids: readonly string[];
  }>;
  canonicalFlags?: readonly string[];
  runtimeClaimRefs?: readonly string[];
  checkoutCompleteness?: CheckoutCompleteness;
}>): SimulationFixture {
  const hasCheckoutState = input.checkoutCompleteness !== undefined;
  return {
    id: input.id,
    latest_customer_message: input.message,
    context: {
      origin: input.origin ?? "ORGANIC",
      first_meaningful_inbound: input.firstMeaningfulInbound ?? false,
      product_binding: input.productBinding ?? {
        status: "RESOLVED",
        product_ids: ["SQ9012"],
      },
      phase: hasCheckoutState ? "ORDER_REVIEW" : "BROWSING",
      canonical_flags: input.canonicalFlags ?? [],
      buying_intent: hasCheckoutState
        ? {
            decision: "COMMITTED",
            requested_action: "PROCEED_TO_PAYMENT",
            quantity: 1,
            evidence: "test checkout commitment",
          }
        : {
            decision: "NONE",
            requested_action: "NONE",
            quantity: null,
            evidence: null,
          },
      source_stage: hasCheckoutState ? "ORDER_PREVIEW" : null,
      runtime_claim_refs: input.runtimeClaimRefs ?? [],
      ...(input.checkoutCompleteness === undefined
        ? {}
        : { checkout_completeness: input.checkoutCompleteness }),
    },
  };
}

function dialogue(text: string): readonly ShadowContextMessage[] {
  return [{
    direction: "INBOUND",
    senderType: "CUSTOMER",
    messageType: "TEXT",
    text,
    attachmentCount: 0,
    occurredAt: "2026-09-10T01:59:00.000Z",
  }];
}

function providerPayload(value: unknown) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  };
}

function planPayload(overrides: Partial<TrackCResponsePlanV2> = {}) {
  return providerPayload({
    currentNeed: "Resolve the current customer need.",
    answer: {
      mode: "DIRECT",
      objective: "Stay within supplied authority.",
      evidenceRefs: [],
      ...(overrides.answer ?? {}),
    },
    nextMove: {
      action: "NONE",
      target: "NONE",
      purpose: "NONE",
      ...(overrides.nextMove ?? {}),
    },
    canonicalAction: {
      type: "NONE",
      requestedFields: [],
      ...(overrides.canonicalAction ?? {}),
    },
    terminal: false,
    avoid: "Do not invent facts or effects.",
    ...overrides,
  });
}

function generalReply(text = "Dạ em nắm rồi chị ạ.") {
  return providerPayload({
    segments: [{ kind: "GENERAL", text }],
    strategy: "HOLD_POSITION",
    cta: "NONE",
  });
}

function checkoutAskOutput(
  requestedFields: readonly (
    "FULL_NAME" | "PHONE" | "ADDRESS" | "PAYMENT_METHOD"
  )[] = ["PHONE"],
) {
  return {
    segments: [{
      kind: "CLARIFICATION" as const,
      text: "Em còn thiếu thông tin nhận hàng ạ.",
      target: "CHECKOUT_DETAILS" as const,
    }, {
      kind: "ACTION_REQUEST" as const,
      text: "Chị gửi em số điện thoại nhé.",
      action: "PROVIDE_CHECKOUT_DETAILS" as const,
      requestedFields,
    }],
    strategy: "ASK_CLARIFICATION" as const,
    cta: "ASK_CHECKOUT_DETAILS" as const,
  };
}

function successfulTransport(responder = generalReply(), plan = planPayload()) {
  return vi.fn<CandidateVertexTransport["send"]>()
    .mockResolvedValueOnce({
      payload: plan,
      providerModelVersion: "gemini-3.5-flash-lite",
    })
    .mockResolvedValueOnce({
      payload: responder,
      providerModelVersion: "gemini-3.5-flash-lite",
    });
}

function promptBody(body: string) {
  const parsed = JSON.parse(body) as {
    systemInstruction: { parts: [{ text: string }] };
    contents: [{ parts: [{ text: string }] }];
  };
  return {
    systemInstruction: parsed.systemInstruction.parts[0].text,
    prompt: parsed.contents[0].parts[0].text,
  };
}

function structuredPrompt(body: string) {
  const parsed = promptBody(body);
  return {
    ...parsed,
    structured: JSON.parse(parsed.prompt) as {
      benchmarkSimulationFacts?: readonly unknown[];
      benchmarkSimulationMetadata?: readonly unknown[];
      checkoutCompleteness?: Readonly<Record<string, unknown>>;
    },
  };
}

async function runFixture(
  simulationFixture: SimulationFixture,
  send: ReturnType<typeof successfulTransport>,
  simulationFacts: readonly unknown[] = [],
  evaluationContext: readonly ShadowContextMessage[] = dialogue(
    simulationFixture.latest_customer_message,
  ),
) {
  const capture = materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture: simulationFixture,
    runtimeClaimCatalog: facts.runtime_claim_catalog,
    recipe,
  });
  const input = {
    lane: "BEHAVIOR_SIMULATION" as const,
    modelResource: MODEL_RESOURCE,
    capture,
    evaluationAt: new Date(recipe.evaluation_at),
    evaluationContext,
    simulationFacts,
    transport: { send },
    fixture: simulationFixture,
  };
  return runTrackCC3TwoPassQualityCandidate(input);
}

describe("Track C post-PR358 C3 behavior wiring", () => {
  it("passes trusted ad origin and first-meaningful-inbound metadata to both candidate passes without mixing it into facts", async () => {
    const caseFixture = fixture({
      id: "AD_ORIGIN",
      message: "Bộ này bao nhiêu em?",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound: true,
      runtimeClaimRefs: ["RC_PRICE_A"],
    });
    const send = successfulTransport();

    await runFixture(caseFixture, send);

    expect(send).toHaveBeenCalledTimes(2);
    for (const [request] of send.mock.calls) {
      const { structured } = structuredPrompt(request.body);
      expect(structured.benchmarkSimulationMetadata).toEqual([
        expect.objectContaining({
          kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
          origin: "ADVERTISEMENT",
          firstMeaningfulInbound: true,
          authorization: "NONE",
        }),
      ]);
      expect(structured.benchmarkSimulationFacts).toEqual([]);
    }
  });

  it("does not create trusted ad origin from organic dialogue that says quảng cáo", async () => {
    const caseFixture = fixture({
      id: "AD_SPOOF",
      message: "Em thấy mẫu này từ quảng cáo nè.",
      origin: "ORGANIC",
    });
    const send = successfulTransport();

    await runFixture(caseFixture, send);

    for (const [request] of send.mock.calls) {
      const { structured } = structuredPrompt(request.body);
      expect(structured.benchmarkSimulationMetadata).toEqual([]);
    }
  });

  it("rejects simulation metadata outside the closed kind union at the runner sink", async () => {
    const caseFixture = fixture({
      id: "METADATA_SINK",
      message: "Bộ này bao nhiêu em?",
    });
    const capture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: caseFixture,
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const rejected: readonly unknown[] = [
      { kind: "TRACK_C_UNKNOWN_METADATA_V1", authorization: "NONE" },
      {
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "GRANTED",
      },
      {
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
        authorization: "NONE",
        extraField: "smuggled",
      },
      {
        kind: "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1",
        state: "COMPLETE",
        missingFields: ["PHONE"],
        authorization: "NONE",
      },
      "TRACK_C_TRUSTED_ACQUISITION_V1",
    ];

    for (const entry of rejected) {
      const send = successfulTransport();
      await expect(runTrackCV5TwoPassBenchmarkCase({
        lane: "BEHAVIOR_SIMULATION",
        modelResource: MODEL_RESOURCE,
        capture,
        evaluationAt: new Date(recipe.evaluation_at),
        evaluationContext: dialogue(caseFixture.latest_customer_message),
        simulationMetadata: [entry as TrackCV5SimulationMetadata],
        transport: { send },
      })).rejects.toThrow("TRACK_C_V5_SIMULATION_METADATA_INVALID");
      expect(send).not.toHaveBeenCalled();
    }
  });

  it("rejects caller-supplied trusted simulation metadata before provider execution", async () => {
    const caseFixture = fixture({
      id: "AD_METADATA_SPOOF",
      message: "Bộ này bao nhiêu em?",
      origin: "ORGANIC",
    });
    const capture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: caseFixture,
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const send = successfulTransport();
    const spoofedInput = {
      lane: "BEHAVIOR_SIMULATION" as const,
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue(caseFixture.latest_customer_message),
      simulationFacts: [],
      simulationMetadata: [{
        kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
        origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true,
      }],
      transport: { send },
      fixture: caseFixture,
    };

    await expect(runTrackCC3TwoPassQualityCandidate(
      spoofedInput as unknown as Parameters<
        typeof runTrackCC3TwoPassQualityCandidate
      >[0],
    )).rejects.toThrow("TRACK_C_C3_EXTERNAL_SIMULATION_METADATA_FORBIDDEN");
    expect(send).not.toHaveBeenCalled();
  });

  it("does not let acquisition metadata authorize protected facts or effects", async () => {
    const caseFixture = fixture({
      id: "AD_AUTHORITY",
      message: "Chốt giúp chị nhé.",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound: true,
    });
    const protectedSend = successfulTransport(providerPayload({
      segments: [{
        kind: "VERIFIED_CLAIM",
        text: "Mẫu này 849k chị ạ.",
        claimRef: "CLAIM_001",
      }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    }));

    await expect(runFixture(caseFixture, protectedSend)).rejects.toThrow(
      "TRACK_C_V5_CLAIM_REFERENCE_UNKNOWN",
    );

    const effectSend = successfulTransport(providerPayload({
      segments: [{
        kind: "EFFECT_CLAIM",
        text: "Em đã chốt đơn cho chị.",
        effect: "ORDER_PLACED",
      }],
      strategy: "HOLD_POSITION",
      cta: "NONE",
    }));
    await expect(runFixture(caseFixture, effectSend)).rejects.toThrow(
      "TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN",
    );
  });

  it("handles the no-SIZE_FIT behavior class without re-asking a known measurement", async () => {
    const caseFixture = fixture({
      id: "SIZE_FIT_WITH_KNOWN_HEIGHT",
      message: "Bình thường chị mặc XXL, mẫu này XL có vừa không?",
    });
    const evaluationContext: readonly ShadowContextMessage[] = [{
      direction: "INBOUND",
      senderType: "CUSTOMER",
      messageType: "TEXT",
      text: "Chị cao 1m60 rồi nhé.",
      attachmentCount: 0,
      occurredAt: "2026-09-10T01:58:00.000Z",
    }, {
      direction: "OUTBOUND",
      senderType: "BOT",
      messageType: "TEXT",
      text: "Em có chiều cao rồi chị.",
      attachmentCount: 0,
      occurredAt: "2026-09-10T01:58:30.000Z",
    }, {
      direction: "INBOUND",
      senderType: "CUSTOMER",
      messageType: "TEXT",
      text: caseFixture.latest_customer_message,
      attachmentCount: 0,
      occurredAt: "2026-09-10T01:59:00.000Z",
    }];
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: planPayload({
          currentNeed: "Determine fit without guessing from catalog size existence.",
          answer: {
            mode: "CLARIFY",
            objective: "Ask only for the missing relevant measurement.",
            evidenceRefs: [],
          },
          nextMove: {
            action: "ASK",
            target: "cân nặng",
            purpose: "Get the missing measurement needed to assess fit.",
          },
          canonicalAction: {
            type: "NONE",
            requestedFields: [],
          },
          terminal: false,
          avoid: "Do not promise XL fits and do not repeat known height.",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: providerPayload({
          segments: [{
            kind: "GENERAL",
            text: "Chị cho em xin cân nặng ạ?",
          }],
          strategy: "ANSWER_VERIFIED_FACTS",
          cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runFixture(
      caseFixture,
      send as ReturnType<typeof successfulTransport>,
      [facts.simulation_fact_catalog.SF_PRODUCT_A],
      evaluationContext,
    );

    expect(caseFixture.context.canonical_flags).toEqual([]);
    expect(caseFixture.context.runtime_claim_refs).toEqual([]);
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION)
      .toContain("Product size existence is not verified fit without an eligible SIZE_FIT claim.");
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION)
      .toContain("When canonicalAction.type is NONE, realize responsePlan.nextMove.target exactly once only when nextMove.action is ASK.");
    expect(result.conversationPlan.nextMove.action).toBe("ASK");
    expect(result.conversationPlan.canonicalAction.type).toBe("NONE");
    expect(result.reply).toContain("cân nặng");
    expect(result.reply).not.toContain("chiều cao");
    expect(send).toHaveBeenCalledTimes(2);
    const [strategistCall, responderCall] = send.mock.calls;
    const strategistPrompt = promptBody(strategistCall![0].body);
    const responderPrompt = promptBody(responderCall![0].body);
    expect(strategistPrompt.systemInstruction)
      .toContain("Product size existence is not verified fit without an eligible SIZE_FIT claim.");
    expect(responderPrompt.systemInstruction)
      .toContain("Render exactly the supplied nextMove.target as one short, concrete, natural customer question ending with ?.");
    for (const [request] of send.mock.calls) {
      const { prompt, systemInstruction } = promptBody(request.body);
      expect(prompt).toContain("Chị cao 1m60 rồi nhé.");
      expect(systemInstruction).not.toContain("Q035");
    }
  });

  it("lets the strategist name the checkout objective without tripping the plan PII guard", async () => {
    const caseFixture = fixture({
      id: "CHECKOUT_PLAN_GUARD",
      message: "Ok em",
      checkoutCompleteness: {
        state: "REQUIRED",
        missing_fields: ["FULL_NAME", "PHONE", "ADDRESS"],
      },
    });
    const planTransport = (objective: string) =>
      vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({
          payload: planPayload({
            answer: {
              mode: "CLARIFY",
              objective,
              evidenceRefs: [],
            },
            canonicalAction: {
              type: "ASK_CHECKOUT_DETAILS",
              requestedFields: ["FULL_NAME", "PHONE", "ADDRESS"],
            },
          }),
          providerModelVersion: "gemini-3.5-flash-lite",
        })
        .mockResolvedValueOnce({
          payload: providerPayload({
            segments: [{
              kind: "CLARIFICATION",
              text: "Dạ chị cho em xin tên, số điện thoại và địa chỉ nhận hàng nhé.",
              target: "CHECKOUT_DETAILS",
            }, {
              kind: "ACTION_REQUEST",
              text: "Em cần đủ ba thông tin này để chuẩn bị đơn cho chị ạ.",
              action: "PROVIDE_CHECKOUT_DETAILS",
              requestedFields: ["FULL_NAME", "PHONE", "ADDRESS"],
            }],
            strategy: "ASK_CLARIFICATION",
            cta: "ASK_CHECKOUT_DETAILS",
          }),
          providerModelVersion: "gemini-3.5-flash-lite",
        });

    // A plan carrying the customer's actual address is still rejected before
    // the Responder runs.
    const realAddress = planTransport("Giao tới địa chỉ 12 Nguyễn Trãi cho khách.");
    await expect(runFixture(caseFixture, realAddress)).rejects.toThrow(
      "TRACK_C_V5_STRATEGIST_OUTPUT_NOT_PII_SAFE",
    );
    expect(realAddress).toHaveBeenCalledTimes(1);

    // Naming the checkout fields carries no identifier, so the plan now reaches
    // the Responder instead of failing the turn.
    const spelledOut = planTransport("Lấy tên, số điện thoại và địa chỉ nhận hàng.");
    await expect(runFixture(caseFixture, spelledOut)).resolves.toBeDefined();
    expect(spelledOut).toHaveBeenCalledTimes(2);

    const abstract = planTransport("Lấy thông tin nhận hàng còn thiếu của khách.");
    const result = await runFixture(caseFixture, abstract);

    expect(abstract).toHaveBeenCalledTimes(2);
    expect(result.reply).toContain("địa chỉ nhận hàng");
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION)
      .toContain("contact details, addresses");
  });

  it("projects checkout REQUIRED missing fields and COMPLETE without raw PII", async () => {
    const requiredFixture = fixture({
      id: "CHECKOUT_REQUIRED",
      message: "Chị chốt nhé.",
      checkoutCompleteness: {
        state: "REQUIRED",
        missing_fields: ["PHONE"],
      },
    });
    const requiredSend = successfulTransport(
      providerPayload({
        segments: [{
          kind: "CLARIFICATION",
          text: "Chị cho em xin số điện thoại nhận hàng ạ?",
          target: "CHECKOUT_DETAILS",
        }, {
          kind: "ACTION_REQUEST",
          text: "Em cần đúng số điện thoại còn thiếu để tiếp tục ạ.",
          action: "PROVIDE_CHECKOUT_DETAILS",
          requestedFields: ["PHONE"],
        }],
        strategy: "ASK_CLARIFICATION",
        cta: "ASK_CHECKOUT_DETAILS",
      }),
      planPayload({
        canonicalAction: {
          type: "ASK_CHECKOUT_DETAILS",
          requestedFields: ["PHONE"],
        },
      }),
    );
    const requiredResult = await runFixture(requiredFixture, requiredSend);
    expect(requiredResult.reply).toContain("số điện thoại");
    expect(requiredResult.reply).not.toContain("tên người nhận");
    expect(requiredResult.reply).not.toContain("địa chỉ");
    const [requiredStrategistCall, requiredResponderCall] = requiredSend.mock.calls;
    const requiredStrategistPrompt = structuredPrompt(requiredStrategistCall![0].body);
    const requiredResponderPrompt = structuredPrompt(requiredResponderCall![0].body);

    expect(requiredStrategistPrompt.structured.checkoutCompleteness).toEqual(expect.objectContaining({
      contractVersion: "CANONICAL_CHECKOUT_COMPLETENESS_V1",
      state: "REQUIRED",
      missingFields: ["PHONE"],
      authority: "SHADOW_ONLY",
      authorization: "NONE",
    }));
    expect(requiredStrategistPrompt.structured.benchmarkSimulationMetadata).toEqual([]);
    expect(requiredStrategistPrompt.structured.benchmarkSimulationFacts).toEqual([]);
    expect(JSON.stringify(requiredStrategistPrompt.structured.checkoutCompleteness))
      .not.toContain("FULL_NAME");
    expect(JSON.stringify(requiredStrategistPrompt.structured.checkoutCompleteness))
      .not.toContain("ADDRESS");

    const requiredResponderStructured = requiredResponderPrompt.structured as {
      responsePlan?: TrackCResponsePlanV2;
    };
    expect(requiredResponderStructured.responsePlan?.canonicalAction).toEqual({
      type: "ASK_CHECKOUT_DETAILS",
      requestedFields: ["PHONE"],
    });

    expect(requiredStrategistPrompt.systemInstruction).toContain(
      "checkoutCompleteness REQUIRED permits ASK_CHECKOUT_DETAILS only when checkout is the selected conversational step; requestedFields must exactly equal missingFields in canonical order.",
    );
    expect(requiredResponderPrompt.systemInstruction).toContain(
      "requestedFields exactly equal to responsePlan.canonicalAction.requestedFields",
    );

    const completeFixture = fixture({
      id: "CHECKOUT_COMPLETE",
      message: "Tên và số điện thoại chị gửi đủ rồi, thông tin nhận hàng đủ hết nhé.",
      checkoutCompleteness: {
        state: "COMPLETE",
        missing_fields: [],
      },
    });
    const completeSend = successfulTransport(
      generalReply("Dạ em đã ghi nhận đủ thông tin cần thiết chị nhé."),
      planPayload(),
    );
    const completeResult = await runFixture(completeFixture, completeSend);
    expect(completeResult.reply).toBe("Dạ em đã ghi nhận đủ thông tin cần thiết chị nhé.");
    expect(completeResult.reply).not.toContain("gửi em tên");
    expect(completeResult.reply).not.toContain("số điện thoại");
    expect(completeResult.reply).not.toContain("địa chỉ");

    const [completeStrategistCall, completeResponderCall] = completeSend.mock.calls;
    const completeStrategistPrompt = structuredPrompt(completeStrategistCall![0].body);
    const completeResponderPrompt = structuredPrompt(completeResponderCall![0].body);

    expect(completeStrategistPrompt.structured.checkoutCompleteness).toEqual(expect.objectContaining({
      contractVersion: "CANONICAL_CHECKOUT_COMPLETENESS_V1",
      state: "COMPLETE",
      missingFields: [],
      authority: "SHADOW_ONLY",
      authorization: "NONE",
    }));
    expect(completeStrategistPrompt.structured.benchmarkSimulationMetadata).toEqual([]);
    expect(completeStrategistPrompt.prompt).not.toMatch(/fullName|recipient|"phone"|"address"/i);

    const completeResponderStructured = completeResponderPrompt.structured as {
      responsePlan?: TrackCResponsePlanV2;
    };
    expect(completeResponderStructured.responsePlan?.canonicalAction).toEqual({
      type: "NONE",
      requestedFields: [],
    });

    expect(completeStrategistPrompt.systemInstruction).toContain(
      "checkoutCompleteness COMPLETE forbids requesting checkout fields but does not by itself suppress an otherwise supported answer.",
    );
    expect(completeResponderPrompt.systemInstruction).toContain(
      "When canonicalAction.type is NONE, realize responsePlan.nextMove.target exactly once only when nextMove.action is ASK.",
    );
  });

  it("renders safe deterministic reply asking only missing fields when model prose asks for extra PII", async () => {
    const requiredFixture = fixture({
      id: "CHECKOUT_PROSE_EXTRA_PII",
      message: "Chị chốt nhé.",
      checkoutCompleteness: {
        state: "REQUIRED",
        missing_fields: ["PHONE"],
      },
    });
    const modelProseExtraPii = successfulTransport(
      providerPayload({
        segments: [{
          kind: "CLARIFICATION",
          text: "Chị gửi em họ tên, số điện thoại, địa chỉ và phương thức thanh toán nhé.",
          target: "CHECKOUT_DETAILS",
        }, {
          kind: "ACTION_REQUEST",
          text: "Chị gửi em số điện thoại nhận hàng nhé.",
          action: "PROVIDE_CHECKOUT_DETAILS",
          requestedFields: ["PHONE"],
        }],
        strategy: "ASK_CLARIFICATION",
        cta: "ASK_CHECKOUT_DETAILS",
      }),
      planPayload({
        canonicalAction: {
          type: "ASK_CHECKOUT_DETAILS",
          requestedFields: ["PHONE"],
        },
      }),
    );
    const result = await runFixture(requiredFixture, modelProseExtraPii);
    expect(result.reply).toContain("số điện thoại");
    expect(result.reply).not.toContain("họ tên");
    expect(result.reply).not.toContain("địa chỉ");
    expect(result.reply).not.toContain("phương thức thanh toán");
  });

  it("rejects undeclared checkout PII asks when checkout is COMPLETE", async () => {
    const completeFixture = fixture({
      id: "CHECKOUT_COMPLETE_EXTRA_PII",
      message: "Chị gửi đủ thông tin rồi nhé.",
      checkoutCompleteness: {
        state: "COMPLETE",
        missing_fields: [],
      },
    });
    const modelProseExtraPii = successfulTransport(generalReply(
      "Dạ chị gửi em số điện thoại và địa chỉ nhận hàng để em chốt đơn nhé.",
    ));

    await expect(runFixture(completeFixture, modelProseExtraPii)).rejects.toThrow(
      "TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST",
    );
  });

  it("rejects checkout asks outside canonical missingFields in behavior simulation", async () => {
    const requiredFixture = fixture({
      id: "CHECKOUT_REQUIRED_GUARD",
      message: "Chị chốt nhé.",
      checkoutCompleteness: {
        state: "REQUIRED",
        missing_fields: ["PHONE"],
      },
    });
    const overAsk = providerPayload({
      segments: [{
        kind: "CLARIFICATION",
        text: "Dạ em còn thiếu thông tin nhận hàng ạ.",
        target: "CHECKOUT_DETAILS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi em số điện thoại và địa chỉ nhận hàng nhé.",
        action: "PROVIDE_CHECKOUT_DETAILS",
        requestedFields: ["PHONE", "ADDRESS"],
      }],
      strategy: "ASK_CLARIFICATION",
      cta: "ASK_CHECKOUT_DETAILS",
    });
    const simulationSend = successfulTransport(overAsk);
    await expect(runFixture(requiredFixture, simulationSend)).rejects.toThrow(
      "TRACK_C_V5_CHECKOUT_COMPLETENESS_GUARD_FAILED",
    );
  });

  it("allows exactly the canonical payment method when it is the only missing checkout field", async () => {
    const requiredFixture = fixture({
      id: "CHECKOUT_PAYMENT_METHOD_REQUIRED",
      message: "Chị chốt nhé.",
      checkoutCompleteness: {
        state: "REQUIRED",
        missing_fields: ["PAYMENT_METHOD"],
      },
    });
    const paymentAsk = successfulTransport(providerPayload({
      segments: [{
        kind: "CLARIFICATION",
        text: "Chị muốn thanh toán COD hay chuyển khoản ạ?",
        target: "CHECKOUT_DETAILS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị chọn giúp em một phương thức thanh toán nhé.",
        action: "PROVIDE_CHECKOUT_DETAILS",
        requestedFields: ["PAYMENT_METHOD"],
      }],
      strategy: "ASK_CLARIFICATION",
      cta: "ASK_CHECKOUT_DETAILS",
    }), planPayload({
      canonicalAction: {
        type: "ASK_CHECKOUT_DETAILS",
        requestedFields: ["PAYMENT_METHOD"],
      },
    }));

    await expect(runFixture(requiredFixture, paymentAsk)).resolves.toBeDefined();
  });

  it("uses declared checkout fields rather than Vietnamese wording", async () => {
    const commonRequests = [
      ["FULL_NAME", "Chị cho em xin họ và tên chị nhé."],
      ["PHONE", "Chị cho em xin số liên hệ nhé."],
      ["ADDRESS", "Chị cho em nơi nhận hàng nhé."],
      ["PAYMENT_METHOD", "Chị muốn thanh toán thế nào ạ?"],
    ] as const;

    for (const [field, text] of commonRequests) {
      const requiredFixture = fixture({
        id: `CHECKOUT_TYPED_${field}`,
        message: "Chị chốt nhé.",
        checkoutCompleteness: { state: "REQUIRED", missing_fields: [field] },
      });
      const response = successfulTransport(providerPayload({
        segments: [{
          kind: "CLARIFICATION",
          text: "Em cần thêm một thông tin để tiếp tục ạ.",
          target: "CHECKOUT_DETAILS",
        }, {
          kind: "ACTION_REQUEST",
          text,
          action: "PROVIDE_CHECKOUT_DETAILS",
          requestedFields: [field],
        }],
        strategy: "ASK_CLARIFICATION",
        cta: "ASK_CHECKOUT_DETAILS",
      }), planPayload({
        canonicalAction: {
          type: "ASK_CHECKOUT_DETAILS",
          requestedFields: [field],
        },
      }));

      await expect(runFixture(requiredFixture, response)).resolves.toBeDefined();
    }
  });

  it("rejects an undeclared checkout action even when its wording names the missing field", async () => {
    const requiredFixture = fixture({
      id: "CHECKOUT_TYPED_FIELD_REQUIRED",
      message: "Chị chốt nhé.",
      checkoutCompleteness: { state: "REQUIRED", missing_fields: ["PHONE"] },
    });
    const undeclared = successfulTransport(providerPayload({
      segments: [{
        kind: "CLARIFICATION",
        text: "Em cần thêm một thông tin để tiếp tục ạ.",
        target: "CHECKOUT_DETAILS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi em số điện thoại nhé.",
        action: "PROVIDE_CHECKOUT_DETAILS",
      }],
      strategy: "ASK_CLARIFICATION",
      cta: "ASK_CHECKOUT_DETAILS",
    }));

    await expect(runFixture(requiredFixture, undeclared)).rejects.toThrow(
      "TRACK_C_V5_CHECKOUT_COMPLETENESS_GUARD_FAILED",
    );
  });

  it("allows either model-selected measurement or checkout action when both are permitted", async () => {
    const requiredFixture = fixture({
      id: "CHECKOUT_MEASUREMENT_PERMISSIONS",
      message: "Chị chốt nhưng cần kiểm tra lại size nhé.",
      canonicalFlags: ["MEASUREMENTS_REQUIRED"],
      checkoutCompleteness: {
        state: "REQUIRED",
        missing_fields: ["PHONE"],
      },
    });
    const measurementAsk = successfulTransport(providerPayload({
      segments: [{
        kind: "CLARIFICATION",
        text: "Em cần thêm số đo còn thiếu để kiểm tra size ạ.",
        target: "MEASUREMENTS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị cho em xin cân nặng nhé.",
        action: "PROVIDE_MEASUREMENTS",
      }],
      strategy: "ASK_CLARIFICATION",
      cta: "ASK_MEASUREMENTS",
    }), planPayload({
      canonicalAction: {
        type: "ASK_MEASUREMENTS",
        requestedFields: [],
      },
    }));

    await expect(runFixture(requiredFixture, measurementAsk)).resolves.toBeDefined();
    const checkoutAsk = successfulTransport(
      providerPayload(checkoutAskOutput()),
      planPayload({
        canonicalAction: {
          type: "ASK_CHECKOUT_DETAILS",
          requestedFields: ["PHONE"],
        },
      }),
    );
    await expect(runFixture(requiredFixture, checkoutAsk)).resolves.toBeDefined();
  });

  it("allows product clarification while COMPLETE blocks checkout collection", async () => {
    const requiredFixture = fixture({
      id: "CHECKOUT_PRODUCT_PERMISSION",
      message: "Chị chốt mẫu đó nhé.",
      productBinding: { status: "UNRESOLVED", product_ids: [] },
      checkoutCompleteness: {
        state: "COMPLETE",
        missing_fields: [],
      },
    });
    const productAsk = successfulTransport(providerPayload({
      segments: [{
        kind: "CLARIFICATION",
        text: "Em chưa xác định được mẫu chị muốn chốt ạ.",
        target: "PRODUCT",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi em tên hoặc ảnh mẫu nhé.",
        action: "PROVIDE_PRODUCT",
      }],
      strategy: "ASK_CLARIFICATION",
      cta: "ASK_PRODUCT",
    }), planPayload({
      canonicalAction: {
        type: "ASK_PRODUCT",
        requestedFields: [],
      },
    }));

    await expect(runFixture(requiredFixture, productAsk)).resolves.toBeDefined();
    const checkoutAsk = successfulTransport(
      providerPayload(checkoutAskOutput()),
      planPayload({
        canonicalAction: {
          type: "ASK_CHECKOUT_DETAILS",
          requestedFields: ["PHONE"],
        },
      }),
    );
    await expect(runFixture(requiredFixture, checkoutAsk)).rejects.toThrow(
      "TRACK_C_CANONICAL_ACTION_NOT_PERMITTED",
    );
  });

  it("rejects widened checkout fields through the offline candidate validator path", () => {
    const requiredFixture = fixture({
      id: "OFFLINE_CHECKOUT_FIELD_WIDENING",
      message: "Chị chốt nhưng cần kiểm tra lại size nhé.",
      canonicalFlags: ["MEASUREMENTS_REQUIRED"],
      checkoutCompleteness: {
        state: "REQUIRED",
        missing_fields: ["PHONE"],
      },
    });
    const evaluationContext = dialogue(requiredFixture.latest_customer_message);
    const capture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: requiredFixture,
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const request = buildTrackCOfflineCandidateRequest({
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext,
      systemInstruction: "Offline checkout field widening regression.",
    });

    expect(() => validateTrackCOfflineCandidate({
      caseId: "pii-security",
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      request,
      providerModelVersion: "gemini-3.5-flash-lite",
      accepted: {
        context: evaluationContext,
        verifiedFacts: null,
        reply: "Dạ em cần thêm số đo để kiểm tra size ạ.",
        proposalSummary: { action: "REPLY" },
        guardOutcome: {
          expectedOwner: "BOT",
          action: "REPLY",
          blockedReasonCodes: [],
        },
      },
      output: checkoutAskOutput(["PHONE", "ADDRESS"]),
    })).toThrow(
      "TRACK_C_C3_OFFLINE_CANDIDATE_CHECKOUT_COMPLETENESS_FAILED",
    );
  });

  it("rejects every checkout request when canonical completeness is COMPLETE", async () => {
    const completeFixture = fixture({
      id: "CHECKOUT_COMPLETE_GUARD",
      message: "Chốt giúp chị nhé.",
      checkoutCompleteness: { state: "COMPLETE", missing_fields: [] },
    });
    const checkoutAsk = successfulTransport(providerPayload({
      segments: [{
        kind: "ACTION_REQUEST",
        text: "Chị gửi em số điện thoại nhé.",
        action: "PROVIDE_CHECKOUT_DETAILS",
        requestedFields: ["PHONE"],
      }],
      strategy: "ASK_CLARIFICATION",
      cta: "ASK_CHECKOUT_DETAILS",
    }));
    await expect(runFixture(completeFixture, checkoutAsk)).rejects.toThrow(
      "TRACK_C_V5_CHECKOUT_COMPLETENESS_GUARD_FAILED",
    );
  });

  it("rejects raw checkout PII fields instead of copying them into readiness projection", async () => {
    const checkoutWithRawPii = {
      state: "COMPLETE",
      missing_fields: [],
      fullName: "Nguyen Test",
      phone: "0900000000",
      address: "123 Test Street",
    } as unknown as CheckoutCompleteness;
    const caseFixture = fixture({
      id: "CHECKOUT_RAW_PII_REJECT",
      message: "Chốt giúp chị nhé.",
      checkoutCompleteness: checkoutWithRawPii,
    });
    const send = successfulTransport();

    await expect(runFixture(caseFixture, send)).rejects.toThrow(
      "TRACK_C_C3_CHECKOUT_COMPLETENESS_INVALID",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("does not infer checkout COMPLETE from dialogue alone", async () => {
    const caseFixture = fixture({
      id: "CHECKOUT_DIALOGUE_ONLY",
      message: "Tên và số điện thoại chị gửi đủ rồi, thông tin nhận hàng đủ hết nhé.",
    });
    const send = successfulTransport();

    await runFixture(caseFixture, send);

    for (const [request] of send.mock.calls) {
      const { structured } = structuredPrompt(request.body);
      expect(structured.benchmarkSimulationMetadata).toEqual([]);
    }
  });

  it("materializes Q100 checkout completeness as typed canonical simulation input", () => {
    const quality = readJson<{ cases: TrackCV5CompactCase[] }>("quality-10.json");
    const q100 = quality.cases.find(({ id }) => id === "V5V4Q100");
    if (q100 === undefined) throw new Error("Q100 fixture missing");

    const capture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: q100,
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    expect(capture.status).toBe("BUILT");
    expect(capture.context?.checkoutCompleteness).toMatchObject({
      contractVersion: "CANONICAL_CHECKOUT_COMPLETENESS_V1",
      state: "COMPLETE",
      missingFields: [],
      authority: "SHADOW_ONLY",
      authorization: "NONE",
    });
  });
});