import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ShadowContextMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  runTrackCC3TwoPassQualityCandidate,
} from "./track-c-c3-two-pass-quality-adapter.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5CompactCase,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";

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
  return {
    id: input.id,
    latest_customer_message: input.message,
    context: {
      origin: input.origin ?? "ORGANIC",
      first_meaningful_inbound: input.firstMeaningfulInbound ?? false,
      product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
      phase: "BROWSING",
      canonical_flags: input.canonicalFlags ?? [],
      buying_intent: {
        decision: "NONE",
        requested_action: "NONE",
        quantity: null,
        evidence: null,
      },
      source_stage: null,
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
  it("passes trusted ad origin and first-meaningful-inbound metadata to both candidate passes", async () => {
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
      const { prompt } = promptBody(request.body);
      expect(prompt).toContain("TRACK_C_TRUSTED_ACQUISITION_V1");
      expect(prompt).toContain("ADVERTISEMENT");
      expect(prompt).toContain("firstMeaningfulInbound");
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
      const { prompt } = promptBody(request.body);
      expect(prompt).not.toContain("TRACK_C_TRUSTED_ACQUISITION_V1");
    }
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
    expect(result.conversationPlan.nextMove).toBe("ASK_MEASUREMENTS");
    expect(result.reply).toContain("cân nặng");
    expect(result.reply).not.toContain("chiều cao");
    expect(send).toHaveBeenCalledTimes(2);
    for (const [request] of send.mock.calls) {
      const { prompt, systemInstruction } = promptBody(request.body);
      expect(prompt).toContain("Chị cao 1m60 rồi nhé.");
      expect(systemInstruction).toContain("SIZE_EXISTENCE_IS_NOT_VERIFIED_FIT");
      expect(systemInstruction).toContain("ask only measurements not already present");
      expect(systemInstruction).not.toContain("Q035");
    }
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
    const requiredSend = successfulTransport();
    await runFixture(requiredFixture, requiredSend);
    for (const [request] of requiredSend.mock.calls) {
      const { prompt, systemInstruction } = promptBody(request.body);
      expect(prompt).toContain("TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1");
      expect(prompt).toContain("\"state\":\"REQUIRED\"");
      expect(prompt).toContain("PHONE");
      expect(prompt).not.toContain("FULL_NAME");
      expect(prompt).not.toContain("ADDRESS");
      expect(systemInstruction).toContain("CHECKOUT_DETAILS_REQUIRED");
    }

    const completeFixture = fixture({
      id: "CHECKOUT_COMPLETE",
      message: "Tên, số điện thoại và địa chỉ chị gửi đủ rồi, chốt giúp chị nhé.",
      checkoutCompleteness: {
        state: "COMPLETE",
        missing_fields: [],
      },
    });
    const completeSend = successfulTransport();
    await runFixture(completeFixture, completeSend);
    for (const [request] of completeSend.mock.calls) {
      const { prompt, systemInstruction } = promptBody(request.body);
      expect(prompt).toContain("TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1");
      expect(prompt).toContain("\"state\":\"COMPLETE\"");
      expect(prompt).not.toContain("Benchmark User");
      expect(prompt).not.toContain("0000000000");
      expect(prompt).not.toContain("Benchmark Address 000");
      expect(systemInstruction).toContain("CHECKOUT_DETAILS_COMPLETE");
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
      message: "Tên, số điện thoại và địa chỉ chị gửi đủ rồi.",
    });
    const send = successfulTransport();

    await runFixture(caseFixture, send);

    for (const [request] of send.mock.calls) {
      const { prompt } = promptBody(request.body);
      expect(prompt).not.toContain("TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1");
    }
  });
});
