import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ShadowContextMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
  TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION,
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
  missing_fields: readonly ("FULL_NAME" | "PHONE" | "ADDRESS")[];
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
      product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
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

function planPayload(overrides: Partial<Record<
  "currentNeed" | "mustResolve" | "conversationRead" | "nextMove" | "avoid",
  string
>> = {}) {
  return providerPayload({
    currentNeed: "Resolve the current customer need.",
    mustResolve: "Stay within supplied authority.",
    conversationRead: "Use the trusted structured context and dialogue correctly.",
    nextMove: "NONE",
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

function successfulTransport(responder = generalReply()) {
  return vi.fn<CandidateVertexTransport["send"]>()
    .mockResolvedValueOnce({
      payload: planPayload(),
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
          mustResolve: "Ask only for the missing relevant measurement.",
          nextMove: "ASK_MEASUREMENTS",
          avoid: "Do not promise XL fits and do not repeat known height.",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: providerPayload({
          segments: [{
            kind: "CLARIFICATION",
            text: "XL có trong dải size nhưng chưa đủ để kết luận vừa chị nhé. Chị cho em xin cân nặng ạ?",
            target: "MEASUREMENTS",
          }, {
            kind: "ACTION_REQUEST",
            text: "Em dựa đúng số đo còn thiếu để kiểm tra fit cho mình ạ.",
            action: "PROVIDE_MEASUREMENTS",
          }],
          strategy: "ASK_CLARIFICATION",
          cta: "ASK_MEASUREMENTS",
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
      .toContain("SIZE_EXISTENCE_IS_NOT_VERIFIED_FIT");
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION)
      .toContain("SIZE_EXISTENCE_IS_NOT_VERIFIED_FIT");
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION)
      .toContain("overrides the generic unverified-protected-fact response shape only for fit qualification");
    expect(result.conversationPlan.nextMove).toBe("ASK_MEASUREMENTS");
    expect(result.reply).toContain("cân nặng");
    expect(result.reply).not.toContain("chiều cao");
    expect(send).toHaveBeenCalledTimes(2);
    // The rule is carried by both passes, but each pass states its own half of
    // it: the strategist picks the missing direction, the responder owns the
    // segment/strategy/CTA shape.
    const [strategistCall, responderCall] = send.mock.calls;
    const strategistPrompt = promptBody(strategistCall![0].body);
    const responderPrompt = promptBody(responderCall![0].body);
    expect(strategistPrompt.systemInstruction)
      .toContain("choose one missing measurement direction");
    expect(responderPrompt.systemInstruction)
      .toContain("ask only that one missing measurement");
    for (const [request] of send.mock.calls) {
      const { prompt, systemInstruction } = promptBody(request.body);
      expect(prompt).toContain("Chị cao 1m60 rồi nhé.");
      expect(systemInstruction).toContain("SIZE_EXISTENCE_IS_NOT_VERIFIED_FIT");
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
    const planTransport = (nextMove: string) =>
      vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({
          payload: planPayload({ nextMove }),
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
            }],
            strategy: "ASK_CLARIFICATION",
            cta: "ASK_CHECKOUT_DETAILS",
          }),
          providerModelVersion: "gemini-3.5-flash-lite",
        });

    // Spelling the contact fields into the plan is rejected before the
    // Responder runs, even though the reply itself must ask for them.
    const spelledOut = planTransport("Lấy tên, số điện thoại và địa chỉ nhận hàng.");
    await expect(runFixture(caseFixture, spelledOut)).rejects.toThrow(
      "TRACK_C_V5_STRATEGIST_OUTPUT_NOT_PII_SAFE",
    );
    expect(spelledOut).toHaveBeenCalledTimes(1);

    // The sanctioned abstract phrasing reaches the Responder, which still asks
    // the customer for the real fields.
    const abstract = planTransport("Lấy thông tin nhận hàng còn thiếu của khách.");
    const result = await runFixture(caseFixture, abstract);

    expect(abstract).toHaveBeenCalledTimes(2);
    expect(result.reply).toContain("địa chỉ nhận hàng");
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION)
      .toContain("CHECKOUT_OBJECTIVE_IS_NAMED_ABSTRACTLY");
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
    const requiredSend = successfulTransport(providerPayload({
      segments: [{
        kind: "CLARIFICATION",
        text: "Chị cho em xin số điện thoại nhận hàng ạ?",
        target: "CHECKOUT_DETAILS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Em cần đúng số điện thoại còn thiếu để tiếp tục ạ.",
        action: "PROVIDE_CHECKOUT_DETAILS",
      }],
      strategy: "ASK_CLARIFICATION",
      cta: "ASK_CHECKOUT_DETAILS",
    }));
    const requiredResult = await runFixture(requiredFixture, requiredSend);
    expect(requiredResult.reply).toContain("số điện thoại");
    expect(requiredResult.reply).not.toContain("tên người nhận");
    expect(requiredResult.reply).not.toContain("địa chỉ");
    for (const [request] of requiredSend.mock.calls) {
      const { systemInstruction, structured } = structuredPrompt(request.body);
      expect(structured.benchmarkSimulationMetadata).toEqual([
        expect.objectContaining({
          kind: "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1",
          state: "REQUIRED",
          missingFields: ["PHONE"],
          authorization: "NONE",
        }),
      ]);
      expect(structured.benchmarkSimulationFacts).toEqual([]);
      expect(JSON.stringify(structured.benchmarkSimulationMetadata))
        .not.toContain("FULL_NAME");
      expect(JSON.stringify(structured.benchmarkSimulationMetadata))
        .not.toContain("ADDRESS");
      // The addendum names the state it actually projects, not a symbol that
      // never appears in benchmarkSimulationMetadata.
      expect(systemInstruction).toContain("State REQUIRED keeps that generic rule");
      expect(systemInstruction).toContain("ask only for the listed missingFields");
      expect(systemInstruction).not.toContain("CHECKOUT_DETAILS_REQUIRED means");
    }

    // Customer wording stays inside what the frozen-dialogue PII guard accepts
    // verbatim, so this exercises the projection instead of the guard.
    const completeFixture = fixture({
      id: "CHECKOUT_COMPLETE",
      message: "Tên và số điện thoại chị gửi đủ rồi, thông tin nhận hàng đủ hết nhé.",
      checkoutCompleteness: {
        state: "COMPLETE",
        missing_fields: [],
      },
    });
    const completeSend = successfulTransport(generalReply(
      "Dạ em đã có đủ thông tin nhận hàng chị nhé.",
    ));
    const completeResult = await runFixture(completeFixture, completeSend);
    expect(completeResult.reply).not.toContain("gửi em tên");
    expect(completeResult.reply).not.toContain("số điện thoại?");
    expect(completeResult.reply).not.toContain("địa chỉ?");
    for (const [request] of completeSend.mock.calls) {
      const { prompt, systemInstruction, structured } = structuredPrompt(request.body);
      expect(structured.benchmarkSimulationMetadata).toEqual([
        expect.objectContaining({
          kind: "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1",
          state: "COMPLETE",
          missingFields: [],
          authorization: "NONE",
        }),
      ]);
      // The readiness projection is the only place recipient data could enter
      // this lane, so pin its exact shape rather than scanning for literals
      // that a BEHAVIOR_SIMULATION capture never materializes.
      const [projected] = structured.benchmarkSimulationMetadata as
        readonly Record<string, unknown>[];
      expect(Object.keys(projected!).sort())
        .toEqual(["authorization", "kind", "missingFields", "state"]);
      expect(prompt).not.toMatch(/fullName|recipient|"phone"|"address"/i);
      expect(systemInstruction).toContain("State COMPLETE replaces that generic rule");
      expect(systemInstruction).toContain("strategy HOLD_POSITION with CTA NONE");
      expect(systemInstruction).not.toContain("CHECKOUT_DETAILS_COMPLETE");
    }
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
});
