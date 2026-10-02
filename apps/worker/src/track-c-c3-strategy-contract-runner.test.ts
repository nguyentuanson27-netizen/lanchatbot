import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import { describe, expect, it, vi } from "vitest";
import { redactAnalyticsMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  buildTrackCStrategistContractRequest,
  runTrackCStrategyContractCase,
  runTrackCStrategyLive,
  TrackCStrategyContractFailure,
} from "./track-c-c3-strategy-contract-runner.js";
import { buildTrackCSelectableEvidence } from
  "./track-c-c3-selectable-evidence.js";

describe("product selling unit survives factual egress", () => {
  it("retains the authoritative unit when a customer distinguishes a set from a component", () => {
    const value = capture();
    if (value.status !== "BUILT" || value.context === null) throw new Error("TEST_CAPTURE_REQUIRED");
    const evidence = buildTrackCSelectableEvidence({ context: value.context,
      simulationFacts: [{ kind: "PRODUCT_PROFILE", productId: "SQ9012", displayName: "Demo",
        offerType: "bộ áo và quần", material: "cotton", colors: [], design: [] }],
      executionLane: "BEHAVIOR_SIMULATION" });
    const presentation = evidence.find(({ capability }) => capability === "PRODUCT_PRESENTATION");
    expect(presentation?.subject?.productId).toBe("SQ9012");
    expect(presentation?.deterministicText).toContain("bộ áo và quần");
    expect(presentation?.deterministicText).not.toContain("riêng áo");
  });

  it("does not invent a selling unit when the profile omits it", () => {
    const value = capture();
    if (value.status !== "BUILT" || value.context === null) throw new Error("TEST_CAPTURE_REQUIRED");
    const evidence = buildTrackCSelectableEvidence({ context: value.context,
      simulationFacts: [{ kind: "PRODUCT_PROFILE", productId: "SQ9012", displayName: "Demo",
        material: "cotton", colors: [], design: [] }], executionLane: "BEHAVIOR_SIMULATION" });
    const presentation = evidence.find(({ capability }) => capability === "PRODUCT_PRESENTATION");
    expect(presentation?.deterministicText).not.toMatch(/bộ|set|riêng áo/u);
  });
});
import { trackCEvidenceHasSafeFactualEgress } from
  "./track-c-c3-strategy-contract.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5CompactCase,
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

/**
 * A fact group with authority but no code-owned wording. It keeps the
 * authority-versus-realization distinction under test now that every group the
 * benchmark fixtures use has a projection.
 */
const UNREALIZABLE_POLICY_FACT = Object.freeze({
  kind: "POLICY_SNAPSHOT",
  policy: "WARRANTY",
  data: Object.freeze({ months: 12 }),
});

function capture(amountVnd?: number, canonicalFlags: string[] = []) {
  return materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture: {
      id: "C3_CONTRACT_TEST",
      latest_customer_message: "Mẫu này bao nhiêu em?",
      context: {
        product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
        phase: "BROWSING",
        canonical_flags: canonicalFlags,
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
    runtimeClaimCatalog: amountVnd === undefined ? facts.runtime_claim_catalog : {
      ...facts.runtime_claim_catalog,
      RC_PRICE_A: { ...facts.runtime_claim_catalog.RC_PRICE_A!, value: { amountVnd, currency: "VND" } },
    },
    recipe,
  });
}

function etaCapture() {
  return materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture: {
      id: "C3_DEADLINE_FEASIBILITY",
      latest_customer_message: "Chị đang cân nhắc mốc nhận hàng.",
      context: {
        product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
        phase: "BROWSING",
        canonical_flags: [],
        buying_intent: {
          decision: "CONSIDERING",
          requested_action: "NONE",
          quantity: null,
          evidence: "customer is deciding delivery feasibility",
        },
        source_stage: null,
        runtime_claim_refs: ["RC_ETA_HN"],
      },
    },
    runtimeClaimCatalog: facts.runtime_claim_catalog,
    recipe,
  });
}

function etaDecisionTransport() {
  return vi.fn<CandidateVertexTransport["send"]>()
    .mockResolvedValueOnce({
      payload: payload({
        replyAct: "ANSWER",
        goal: [
          "NEED: Resolve delivery feasibility using the verified ETA.",
          "KNOWN: NONE",
          "ANSWER: selected evidence for the current request",
          "LIMIT: NONE",
          "NEXT: NONE",
        ].join("\n"),
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
  it.each([true, false])("hands off both requested parts and rejects a dropped limitation (kept=%s)", async (kept) => {
    const goal = ["NEED: price and wrinkle resistance", "KNOWN: NONE", "ANSWER: current price",
      "LIMIT: wrinkle resistance has no verified evidence", "NEXT: NONE"].join("\n");
    const limit = "Em ch\u01b0a c\u00f3 th\u00f4ng tin x\u00e1c nh\u1eadn kh\u1ea3 n\u0103ng ch\u1ed1ng nh\u0103n.";
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({ replyAct: "ANSWER", goal,
        proposition: "PRICE", evidenceRefs: ["CLAIM_001"], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }),
        providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({ answerText: kept ? limit : null, factualTexts: [], progressionText: null }),
        providerModelVersion: "gemini-3.5-flash-lite" });
    const run = runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Price and wrinkle resistance?", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }], transport: { send } });
    if (kept) {
      const result = await run;
      expect(result.reply).toContain(limit);
      expect(result.reply).toContain("849.000");
      expect(result.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM")).toHaveLength(1);
      expect(result.output.cta).toBe("NONE");
    } else {
      await expect(run).rejects.toThrow("TRACK_C_RESPONDER_LIMIT_REQUIRED");
    }
    expect(send).toHaveBeenCalledTimes(2);
    const prompt = JSON.parse(JSON.parse(send.mock.calls[1]![0].body).contents[0].parts[0].text);
    expect(prompt.responderTask.semanticHandoff).toEqual({ need: "ANSWER", known: null,
      answer: "PRICE supported", limit: "WRINKLE_RESISTANCE unsupported", next: null });
    expect(prompt.responderTask.answer).not.toHaveProperty("goal");
    expect(prompt).not.toHaveProperty("customerDecisionSignals");
  });

  it("rejects an unstructured model goal before invoking the Responder", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({ replyAct: "ANSWER", goal: "Legacy unstructured goal.", proposition: "PRICE",
        evidenceRefs: ["CLAIM_001"], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }),
      providerModelVersion: "gemini-3.5-flash-lite" });
    await expect(runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Current price?", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }], transport: { send } }))
      .rejects.toThrow("TRACK_C_STRATEGIST_GOAL_INVALID");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])("derives budget permission from code inputs (known=%s)", async (known) => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockRejectedValue(new Error("CAPTURE_REQUEST"));
    await expect(runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE, capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
      knownBudgetVnd: known ? 600_000 : null,
      evaluationContext: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Find another model.", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }],
      transport: { send } })).rejects.toThrow();
    const request = JSON.parse(send.mock.calls[0]![0].body);
    const prompt = JSON.parse(request.contents[0].parts[0].text);
    expect(prompt.constraints.budgetKnown).toBe(known);
    const inputs = request.generationConfig.responseSchema.anyOf[0].properties.continuation.anyOf[0].properties.input.enum;
    expect(inputs.includes("BUDGET")).toBe(!known);
  });

  it.each([true, false])("excludes known measurements from adaptive task constraints (complete=%s)", async (complete) => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockRejectedValue(new Error("CAPTURE_REQUEST"));
    await expect(runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE, capture: capture(undefined, ["MEASUREMENTS_REQUIRED"]),
      evaluationAt: new Date(recipe.evaluation_at), measurementRequestedFields: ["HEIGHT_CM", "WEIGHT_KG"],
      firstContactInputs: { color: null, measurements: complete ? { HEIGHT_CM: 160, WEIGHT_KG: 54 } : { HEIGHT_CM: 160 } },
      evaluationContext: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Please advise fit.", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }],
      transport: { send } })).rejects.toThrow();
    const prompt = JSON.parse(JSON.parse(send.mock.calls[0]![0].body).contents[0].parts[0].text);
    expect(prompt.constraints.measurementRequestedFields).toEqual(complete ? [] : ["WEIGHT_KG"]);
    expect(prompt.constraints.permittedCanonicalActions.includes("ASK_MEASUREMENTS")).toBe(!complete);
  });

  it("keeps concern signals with the Strategist, not the Responder", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({ replyAct: "ANSWER", goal: [
        "NEED: Answer current price.",
        "KNOWN: NONE",
        "ANSWER: selected evidence for the current request",
        "LIMIT: NONE",
        "NEXT: NONE",
      ].join("\n"),
        proposition: "PRICE", evidenceRefs: ["CLAIM_001"],
        continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }),
        providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({ answerText: null, factualTexts: [], progressionText: null }),
        providerModelVersion: "gemini-3.5-flash-lite" });
    const result = await runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE, capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Current price?", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }], transport: { send } });
    const prompts = send.mock.calls.map(([request]) => JSON.parse(JSON.parse(request.body).contents[0].parts[0].text));
    expect(prompts[0].canonicalContext.dialogueEvidence).toBeDefined();
    expect(prompts[1]).not.toHaveProperty("customerDecisionSignals");
    expect(prompts[1]).not.toHaveProperty("canonicalContext");
    expect(prompts[1].responderTask.evidence).toEqual([{ text: result.responderTask.evidence[0]!.deterministicText }]);
    expect(result.output.segments.every((segment) => segment.kind === "VERIFIED_CLAIM")).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("asks for a stale product by name or image without requesting recipient PII", async () => {
    const staleCapture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: {
        id: "C3_STALE_PRODUCT_CLARIFICATION",
        latest_customer_message: "Mẫu này còn không em?",
        context: {
          product_binding: { status: "STALE", product_ids: ["SQ9012"] },
          phase: "BROWSING",
          canonical_flags: [],
          buying_intent: {
            decision: "NONE", requested_action: "NONE", quantity: null, evidence: null,
          },
          source_stage: null,
          runtime_claim_refs: [],
        },
      },
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ANSWER",
        goal: [
          "NEED: Ask which product the customer means before checking stock.",
          "KNOWN: NONE",
          "ANSWER: NONE",
          "LIMIT: requested fact has no verified evidence",
          "NEXT: product identity enables the pending fact lookup",
        ].join("\n"),
        proposition: "STOCK",
        evidenceRefs: [],
        continuation: null,
        canonicalAction: "ASK_PRODUCT",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: null, factualTexts: [],
        progressionText: "Chị gửi em tên hoặc ảnh mẫu chị đã xem hôm qua nhé.",
      }), providerModelVersion: "gemini-3.5-flash-lite" });
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: staleCapture,
      knownBudgetVnd: 600_000,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này còn không em?", attachmentCount: 0,
        occurredAt: "2026-09-10T02:00:00.000Z",
      }],
      transport: { send },
    });
    const strategistPrompt = JSON.parse(JSON.parse(send.mock.calls[0]![0].body).contents[0].parts[0].text);
    expect(strategistPrompt.constraints.budgetKnown).toBe(true);
    expect(result.reply).toBe("Chị gửi em tên hoặc ảnh mẫu chị đã xem hôm qua nhé.");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it.each([
    { answer: "Chị từng mặc chưa thoải mái nên lần này muốn cân nhắc kỹ hơn.",
      question: "Lần trước chị thấy khó chịu ở eo hay ở phần nào khác?", valid: true },
    { answer: "Mình xem đúng điểm chị còn lăn tăn trước nhé.",
      question: "Với mẫu đang xem, điều gì khiến chị chưa quyết định được?", valid: true },
    { answer: "Em chưa có thông tin xác nhận về độ nhăn để trả lời chắc cho chị.",
      question: "Chị dự định mặc trong dịp nào?", valid: true },
    { answer: "Em chưa có thông tin để xác nhận mẫu này có phù hợp với chị không.",
      question: "Chị đang lo ở phần nào nhất?", valid: true },
    { answer: "Em hiểu chị đang so mẫu đang xem với một mẫu rẻ hơn.",
      question: "Chị quan tâm điểm nào khi so hai mẫu?", valid: true },
    { answer: "SQ9012 rẻ hơn SV9031.",
      question: "Chị quan tâm điểm nào khi so hai mẫu?", valid: false },
    { answer: "Mẫu này có giá thấp hơn mẫu kia.",
      question: "Chị quan tâm điểm nào khi so hai mẫu?", valid: false },
    { answer: " Em hiểu chị muốn cân nhắc kỹ hơn. ",
      question: "Chị còn phân vân ở điểm nào?", valid: true },
    { answer: "Em hiểu chị muốn cân nhắc kỹ hơn.",
      question: "Chị nói thêm điểm mình còn băn khoăn để em tư vấn đúng nhu cầu nhé.", valid: true },
    { answer: "Mẫu này cao cấp và bền đẹp.", question: "Chị muốn xem thêm gì?", valid: false },
    { answer: "Em sẽ giữ mẫu này cho chị.", question: "Chị muốn xem thêm gì?", valid: false },
    { answer: "Dạ chị.", question: "Chị muốn màu nào? Chị lấy mấy bộ?", valid: false },
    { answer: "Dạ chị.", question: "Chị cho em số điện thoại nhận hàng?", valid: false },
    { answer: "Số của chị là 0901234567.", question: "Chị muốn xem thêm gì?", valid: false },
  ])("adaptive prose is authored and still checked: $answer", async ({ answer, question, valid }) => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "CLARIFY", goal: [
          "NEED: Ask about the remaining concern using the customer's reported experience.",
          "KNOWN: NONE",
          "ANSWER: NONE",
          "LIMIT: NONE",
          "NEXT: assigned customer input changes the next executable decision",
        ].join("\n"),
        proposition: "NONE", evidenceRefs: [], canonicalAction: "NONE",
        continuation: { type: "ASK", input: "DECISION_CRITERION" },
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: null, factualTexts: [], progressionText: `${answer.trim()} ${question}`,
      }), providerModelVersion: "gemini-3.5-flash-lite" });
    const result = runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Lần trước mặc khó chịu nên chị đang phân vân.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z" }], transport: { send },
    });
    if (valid) {
      const resolved = await result;
      expect(resolved.output.segments[0]?.text).toBe(`${answer.trim()} ${question}`);
      expect(resolved.reply).toContain(question);
      const schema = JSON.parse(send.mock.calls[1]![0].body).generationConfig.responseSchema;
      expect(schema.properties.answerText).toEqual({ type: "NULL" });
      expect(schema.properties.progressionText).not.toHaveProperty("enum");
    } else {
      await expect(result).rejects.toBeInstanceOf(TrackCStrategyContractFailure);
    }
  });

  it.each(["Ib", "Mẫu có màu đen không em?"])("only offers color confirmation when the customer mentioned that catalog color: %s", async (customerText) => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload(responderDraft()), providerModelVersion: "gemini-3.5-flash-lite",
    });
    await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE, capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at), evaluationContext: [{ direction: "INBOUND",
        senderType: "CUSTOMER", messageType: "TEXT", text: customerText, attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z" }],
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      trustedAcquisition: { kind: "TRACK_C_TRUSTED_ACQUISITION_V1", origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true, authorization: "NONE" }, transport: { send },
    });
    const choices = JSON.parse(send.mock.calls[0]![0].body).generationConfig.responseSchema.properties.progressionText.enum;
    expect(choices.includes("Chị đang ưu tiên màu đen đúng không ạ?")).toBe(customerText.includes("đen"));
    expect(choices).not.toContain("Chị đang ưu tiên màu kem đúng không ạ?");
  });
  it("labels two bound products by canonical code when catalog display names are absent", async () => {
    const twoProducts = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION", recipe, runtimeClaimCatalog: facts.runtime_claim_catalog,
      fixture: { id: "MULTI_PRODUCT_CANONICAL_LABELS", latest_customer_message: "Giá từng mẫu thế nào?",
        context: { product_binding: { status: "RESOLVED", product_ids: ["SQ9012", "SV9031"] },
          phase: "BROWSING", canonical_flags: [], source_stage: null,
          buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null },
          runtime_claim_refs: ["RC_PRICE_A", "RC_PRICE_B"] } },
    });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({ replyAct: "ANSWER", goal: [
        "NEED: Give each product's verified price.",
        "KNOWN: NONE",
        "ANSWER: selected evidence for the current request",
        "LIMIT: NONE",
        "NEXT: NONE",
      ].join("\n"),
        proposition: "PRICE", evidenceRefs: ["CLAIM_001", "CLAIM_002"],
        continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({ answerText: null, factualTexts: [], progressionText: null }),
        providerModelVersion: "gemini-3.5-flash-lite" });
    const result = await runTrackCStrategyContractCase({
      lane: "PRODUCTION_CONTRACT", modelResource: MODEL_RESOURCE, capture: twoProducts,
      evaluationAt: new Date(recipe.evaluation_at), evaluationContext: [{ direction: "INBOUND",
        senderType: "CUSTOMER", messageType: "TEXT", text: "Giá từng mẫu thế nào?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z" }], transport: { send },
    });
    expect(result.reply).toBe("Với mẫu SQ9012: Giá hiện tại của mẫu này là 849.000đ. Với mẫu SV9031: Giá hiện tại của mẫu này là 1.099.000đ ạ.");
    expect(result.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM")).toHaveLength(2);
  });
  it("accepts a bound realization and recovers only the original code fact after rejecting changed price or benefit", async () => {
    const decisionAt = new Date(recipe.evaluation_at);
    const context = contextFromFrozenTrackCCapture({ capture: capture(), evaluationAt: decisionAt });
    const dialogue = [{ direction: "INBOUND" as const, senderType: "CUSTOMER" as const,
      messageType: "TEXT" as const, text: "Giá mẫu này bao nhiêu?", attachmentCount: 0,
      occurredAt: "2026-09-10T01:59:00.000Z" }];
    for (const [candidate, accepted] of [
      ["Dạ, Giá hiện tại của mẫu này là 849.000đ.", true],
      ["Giá hiện tại của mẫu này là 699.000đ.", false],
      ["Giá hiện tại của mẫu này là 849.000đ, chất lượng cao cấp.", false],
    ] as const) {
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "ANSWER", goal: [
            "NEED: Answer the current price.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"), proposition: "PRICE",
          evidenceRefs: ["CLAIM_001"], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
        }), providerModelVersion: "gemini-3.5-flash-lite" })
        .mockResolvedValueOnce({ payload: payload({
          answerText: null, factualTexts: [candidate], progressionText: null,
        }), providerModelVersion: "gemini-3.5-flash-lite" });
      const run = runTrackCStrategyLive({
        context, modelResource: MODEL_RESOURCE, decisionAt,
        dialogue: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
          text: "Giá mẫu này bao nhiêu?", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }],
        checkoutRequestedFields: [], checkoutClarificationActive: false,
        currentCart: null, paymentOptions: ["COD"], transport: { send },
      });
      const result = await run;
      if (accepted) {
        expect(result.reply).toBe(candidate);
        expect(result.recoveryDiagnostic).toBeUndefined();
      } else {
        expect(result.output.segments.map(({ kind }) => kind)).toEqual(["GENERAL", "VERIFIED_CLAIM"]);
        expect(result.reply).toContain("Giá hiện tại của mẫu này là 849.000đ ạ.");
        expect(result.recoveryDiagnostic?.errorCode).toBe("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
        expect(result.reply).not.toBe(candidate);
      }
      expect(send).toHaveBeenCalledTimes(2);
    }
  });
  it.each([true, false])("live recovery preserves selected facts but cannot invent a fallback without them (selected=%s)", async (selected) => {
    const decisionAt = new Date(recipe.evaluation_at);
    const context = contextFromFrozenTrackCCapture({ capture: capture(), evaluationAt: decisionAt });
    const dialogue = [{ direction: "INBOUND" as const, senderType: "CUSTOMER" as const,
      messageType: "TEXT" as const, text: "Giá mẫu này bao nhiêu?", attachmentCount: 0,
      occurredAt: "2026-09-10T01:59:00.000Z" }];
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite", payload: payload({
        replyAct: "ANSWER", goal: [
          "NEED: Answer the price question without a size recommendation.",
          "KNOWN: NONE",
          "ANSWER: selected evidence for the current request",
          (selected ? "LIMIT: NONE" : "LIMIT: requested price is not verified"),
          "NEXT: NONE",
        ].join("\n"), proposition: "PRICE",
        evidenceRefs: selected ? ["CLAIM_001"] : [], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
      }) })
      .mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite", payload: payload({
        answerText: "Chị mặc size XL sẽ vừa đẹp.", factualTexts: [], progressionText: null,
      }) });
    const run = runTrackCStrategyLive({ context, modelResource: MODEL_RESOURCE, decisionAt,
      dialogue, checkoutRequestedFields: [], checkoutClarificationActive: false,
      currentCart: null, paymentOptions: ["COD"], transport: { send } });
    if (selected) {
      const result = await run;
      expect(result.reply).toBe("Em chưa xác nhận được đầy đủ thông tin chị hỏi. Giá hiện tại của mẫu này là 849.000đ ạ.");
      expect(result.recoveryDiagnostic?.stage).toBe("FINAL_GUARD");
      expect(result.recoveryDiagnostic?.reasonCodes).toContain("SIZE_RECOMMENDATION_UNDECLARED");
    } else await expect(run).rejects.toBeInstanceOf(TrackCStrategyContractFailure);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it.each(["timeout", "malformed-json", "missing-payload", "bad-shape", "unsafe-prose"])(
    "recovers selected facts and a coverage limit after Responder %s, without another model call",
    async (fault) => {
      const decisionAt = new Date(recipe.evaluation_at);
      const context = contextFromFrozenTrackCCapture({ capture: capture(), evaluationAt: decisionAt });
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite", payload: payload({
          replyAct: "ANSWER", goal: [
            "NEED: Answer price; wrinkle resistance has no verified source.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: wrinkle resistance has no verified evidence",
            "NEXT: NONE",
          ].join("\n"),
          proposition: "PRICE", evidenceRefs: ["CLAIM_001"],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
        }) });
      if (fault === "timeout") send.mockRejectedValueOnce(new Error("CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT"));
      else send.mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite",
        payload: fault === "missing-payload" ? null
          : fault === "malformed-json" ? { candidates: [{ content: { parts: [{ text: "not JSON" }] } }] }
          : payload(fault === "unsafe-prose"
            ? { answerText: "Phone 0901234567", factualTexts: [], progressionText: null }
            : { unexpected: "do not use as an answer" }),
      });
      const result = await runTrackCStrategyLive({ context, modelResource: MODEL_RESOURCE, decisionAt,
        dialogue: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
          text: "Price and wrinkle resistance?", attachmentCount: 0, occurredAt: decisionAt.toISOString() }],
        checkoutRequestedFields: [], checkoutClarificationActive: false, currentCart: null,
        paymentOptions: ["COD"], transport: { send },
      });
      expect(result.output.segments.map(({ kind }) => kind)).toEqual(["GENERAL", "VERIFIED_CLAIM"]);
      expect(result.reply).toContain("849.000");
      expect(result.reply).not.toMatch(/0901234567|not JSON|do not use/);
      expect(result.recoveryDiagnostic).toMatchObject({ stage: "RESPONDER",
        errorCode: fault === "timeout" ? "CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT" : "TRACK_C_RESPONDER_DRAFT_INVALID" });
      expect(send).toHaveBeenCalledTimes(2);
    },
  );

  it.each(["no-evidence", "identity", "aborted", "evaluation"])(
    "does not recover across the %s boundary", async (boundary) => {
      const decisionAt = new Date(recipe.evaluation_at);
      const context = contextFromFrozenTrackCCapture({ capture: capture(), evaluationAt: decisionAt });
      const controller = new AbortController();
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite", payload: payload({
          replyAct: "ANSWER", goal: [
            "NEED: Answer price.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            (boundary === "no-evidence" ? "LIMIT: requested price is not verified" : "LIMIT: NONE"),
            "NEXT: NONE",
          ].join("\n"), proposition: "PRICE",
          evidenceRefs: boundary === "no-evidence" ? [] : ["CLAIM_001"],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
        }) }).mockImplementationOnce(async () => {
          if (boundary === "aborted") controller.abort();
          return { providerModelVersion: boundary === "identity" ? "wrong-model" : "gemini-3.5-flash-lite", payload: null };
        });
      const evaluationContext = [{ direction: "INBOUND" as const, senderType: "CUSTOMER" as const,
        messageType: "TEXT" as const, text: "Price?", attachmentCount: 0, occurredAt: decisionAt.toISOString() }];
      const run = boundary === "evaluation"
        ? runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
            capture: capture(), evaluationAt: decisionAt, evaluationContext, transport: { send } })
        : runTrackCStrategyLive({ context, modelResource: MODEL_RESOURCE, decisionAt,
            dialogue: evaluationContext, checkoutRequestedFields: [], checkoutClarificationActive: false,
            currentCart: null, paymentOptions: ["COD"], transport: { send }, signal: controller.signal });
      await expect(run).rejects.toBeInstanceOf(TrackCStrategyContractFailure);
      expect(send).toHaveBeenCalledTimes(2);
    },
  );

  it("does not mistake null answerText plus SUPPORTED for full compound-question coverage during guard recovery", async () => {
    const decisionAt = new Date(recipe.evaluation_at);
    const context = contextFromFrozenTrackCCapture({ capture: capture(), evaluationAt: decisionAt });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite", payload: payload({
        replyAct: "ANSWER", goal: [
          "NEED: Answer price; wrinkle resistance is still unconfirmed.",
          "KNOWN: NONE",
          "ANSWER: selected evidence for the current request",
          "LIMIT: wrinkle resistance has no verified evidence",
          "NEXT: NONE",
        ].join("\n"),
        proposition: "PRICE", evidenceRefs: ["CLAIM_001"], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
      }) }).mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite", payload: payload({
        answerText: null, factualTexts: ["Unsupported replacement price 1 dong"], progressionText: null,
      }) });
    const result = await runTrackCStrategyLive({ context, modelResource: MODEL_RESOURCE, decisionAt,
      dialogue: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Price and wrinkle resistance?", attachmentCount: 0, occurredAt: decisionAt.toISOString() }],
      checkoutRequestedFields: [], checkoutClarificationActive: false,
      currentCart: null, paymentOptions: ["COD"], transport: { send } });
    expect(result.output.segments.map(({ kind }) => kind)).toEqual(["GENERAL", "VERIFIED_CLAIM"]);
    expect(result.reply).toContain("849.000");
    expect(result.recoveryDiagnostic?.stage).toBe("FINAL_GUARD");
  });

  it("runs the shared core from a live context and rejects replay fields", async () => {
    const decisionAt = new Date(recipe.evaluation_at);
    const context = contextFromFrozenTrackCCapture({
      capture: capture(), evaluationAt: decisionAt,
    });
    const dialogue = [{
      direction: "INBOUND" as const, senderType: "CUSTOMER" as const,
      messageType: "TEXT" as const, text: "Mẫu này giá bao nhiêu?",
      attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z",
    }];
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ANSWER", goal: [
          "NEED: Answer the verified price.",
          "KNOWN: NONE",
          "ANSWER: selected evidence for the current request",
          "LIMIT: NONE",
          "NEXT: NONE",
        ].join("\n"),
        proposition: "PRICE", evidenceRefs: ["CLAIM_001"],
        continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: null, factualTexts: [], progressionText: null,
      }), providerModelVersion: "gemini-3.5-flash-lite" });
    const input = {
      context, modelResource: MODEL_RESOURCE, decisionAt, dialogue,
      checkoutRequestedFields: [], checkoutClarificationActive: false,
      currentCart: null, paymentOptions: ["COD"] as const, transport: { send },
    };
    const result = await runTrackCStrategyLive(input);
    expect(result.output.segments).toContainEqual(expect.objectContaining({
      kind: "VERIFIED_CLAIM", text: "Giá hiện tại của mẫu này là 849.000đ ạ.",
    }));
    expect(send).toHaveBeenCalledTimes(2);
    expect(result).not.toHaveProperty("evaluationOnly");
    const strategistRequest = JSON.parse(send.mock.calls[0]![0].body);
    const strategistPrompt = JSON.parse(strategistRequest.contents[0].parts[0].text);
    expect(strategistPrompt.canonicalContext.dialogueEvidence).toEqual({
      act: context.dialogueEvidence.act,
      confidenceBand: context.dialogueEvidence.confidenceBand,
      reasonCodes: context.dialogueEvidence.reasonCodes,
    });
    expect(strategistPrompt.selectableEvidence[0]).not.toHaveProperty("realizationText");
    expect(strategistPrompt.selectableEvidence[0]).not.toHaveProperty("value");
    const responderRequest = JSON.parse(send.mock.calls[1]![0].body);
    const responderPrompt = JSON.parse(responderRequest.contents[0].parts[0].text);
    expect(responderPrompt).not.toHaveProperty("customerDecisionSignals");
    await expect(runTrackCStrategyLive({
      ...input, simulationMetadata: [],
    } as unknown as Parameters<typeof runTrackCStrategyLive>[0]))
      .rejects.toThrow("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
  });
  it("uses one redacted decision for the task, plan and identity without changing fact authority", async () => {
    const goal = ["NEED: Answer only the verified shop price.",
      "KNOWN: reported budget 700000; recipient phone 0901234567, email lan@example.com",
      "ANSWER: selected price", "LIMIT: NONE", "NEXT: NONE"].join("\n");
    const decision = {
      replyAct: "ANSWER", goal, proposition: "PRICE", evidenceRefs: ["CLAIM_001"],
      continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
    };
    const normalized = { ...decision, goal: "NEED: ANSWER\nKNOWN: NONE\nANSWER: PRICE supported\nLIMIT: NONE\nNEXT: NONE" };
    expect(normalized.goal).not.toBe(goal);
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload(decision),
        providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: null, factualTexts: [], progressionText: null,
      }), providerModelVersion: "gemini-3.5-flash-lite" });
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Giá này hơi cao so với ngân sách của chị.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }], transport: { send },
    });
    expect(result.conversationPlan).toEqual(normalized);
    expect(result.responderTask.answer).toEqual({ kind: "ANSWER",
      evidenceStatus: "SUPPORTED", proposition: "PRICE", goal: normalized.goal });
    expect(result.identity.decisionHash).toBe(createHash("sha256")
      .update(canonicalJsonV1(normalized)).digest("hex"));
    const responderBody = JSON.parse(send.mock.calls[1]![0].body);
    const prompt = JSON.parse(responderBody.contents[0].parts[0].text);
    expect(prompt.responderTask.answer).not.toHaveProperty("goal");
    expect(prompt.responderTask.semanticHandoff).toEqual(result.responderTask.semanticHandoff);
    expect(prompt.responderTask.evidence).toEqual([{
      text: result.responderTask.evidence[0]!.deterministicText,
    }]);
    expect(responderBody.generationConfig.responseSchema.properties.factualTexts)
      .toMatchObject({ minItems: 0, maxItems: result.responderTask.evidence.length });
    for (const internal of ["CLAIM_001", "contentHash", "provenance", "amountVnd"]) {
      expect(JSON.stringify(prompt.responderTask.evidence)).not.toContain(internal);
    }
    for (const raw of ["700000", "0901234567", "lan@example.com"]) {
      expect(JSON.stringify(result)).not.toContain(raw);
      expect(send.mock.calls[1]![0].body).not.toContain(raw);
    }
    expect(result.output.segments).toEqual([expect.objectContaining({
      kind: "VERIFIED_CLAIM",
      text: result.responderTask.evidence[0]!.deterministicText,
      claimContentHash: result.responderTask.evidence[0]!.provenance.contentHash,
    })]);
  });

  it("offers adaptive measurement requests only for a canonical fit blocker", async () => {
    const dialogue = [{ direction: "INBOUND" as const,
      senderType: "CUSTOMER" as const, messageType: "TEXT" as const,
      text: "Mẫu này còn hàng không?", attachmentCount: 0,
      occurredAt: "2026-09-10T01:59:00.000Z" }];
    for (const [flags, expected] of [
      [[], false], [["MEASUREMENTS_REQUIRED"], true],
    ] as const) {
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockRejectedValue(new Error("CAPTURE_REQUEST"));
      await expect(runTrackCStrategyContractCase({
        lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
        capture: capture(undefined, [...flags]),
        evaluationAt: new Date(recipe.evaluation_at),
        evaluationContext: dialogue, transport: { send },
      })).rejects.toThrow();
      const body = JSON.parse(send.mock.calls[0]![0].body);
      const prompt = JSON.parse(body.contents[0].parts[0].text);
      expect(prompt.constraints.permittedCanonicalActions.includes("ASK_MEASUREMENTS"))
        .toBe(expected);
    }
  });

  it("asks for the missing measurement without a generic uncertainty preamble", async () => {
    const question = "Chị cho em xin thêm số đo vòng eo nhé?";
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ANSWER", goal: [
          "NEED: Cần vòng eo để tư vấn đúng lo ngại chật bụng.",
          "KNOWN: NONE",
          "ANSWER: NONE",
          "LIMIT: requested fact has no verified evidence",
          "NEXT: missing measurements enable the current fit decision",
        ].join("\n"),
        proposition: "SIZE_FIT", evidenceRefs: [], continuation: null,
        canonicalAction: "ASK_MEASUREMENTS",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: null, factualTexts: [], progressionText: question,
      }), providerModelVersion: "gemini-3.5-flash-lite" });
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: capture(undefined, ["MEASUREMENTS_REQUIRED"]),
      measurementRequestedFields: ["WAIST_CM"],
      firstContactInputs: { color: null, measurements: { HEIGHT_CM: 160, WEIGHT_KG: 58 } },
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị cao 1m60, nặng 58kg nhưng hay chật bụng. Mẫu này vừa không em?",
        attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z",
      }], transport: { send },
    });
    expect(result.reply).toBe(question);
    expect(result.responderTask.canonicalRequest?.measurementFields).toEqual(["WAIST_CM"]);
  });

  it("preserves earlier known inputs in both model requests within the validated dialogue window", async () => {
    const evaluationContext = Array.from({ length: 15 }, (_, index) => ({
      direction: index % 2 === 0 ? "INBOUND" as const : "OUTBOUND" as const,
      senderType: index % 2 === 0 ? "CUSTOMER" as const : "BOT" as const,
      messageType: "TEXT" as const,
      text: index === 0 ? "Ngân sách chị khoảng 700k, chị cao 1m58 và nặng 57kg."
        : index === 14 ? "Chị vẫn đang cân nhắc nhé."
        : index % 2 === 0 ? "Chị xem thêm một chút." : "Dạ chị cứ xem nhé.",
      attachmentCount: 0,
      occurredAt: "2026-09-10T01:59:00.000Z",
    }));
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ACKNOWLEDGE", goal: [
          "NEED: Acknowledge hesitation without requesting known inputs.",
          "KNOWN: NONE",
          "ANSWER: NONE",
          "LIMIT: NONE",
          "NEXT: NONE",
        ].join("\n"),
        proposition: "NONE", evidenceRefs: [],
        continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: "Dạ em hiểu ý chị ạ.", factualTexts: [], progressionText: null,
      }), providerModelVersion: "gemini-3.5-flash-lite" });
    await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext, transport: { send },
    });
    expect(send).toHaveBeenCalledTimes(2);
    for (const [request] of send.mock.calls) {
      const body = JSON.parse(request.body);
      const prompt = JSON.parse(body.contents[0].parts[0].text);
      expect(prompt.dialogue).toEqual(evaluationContext);
    }
  });

  it.each([true, false])("continues a clarified material question past the old window (evidence=%s)", async (supported) => {
    const evaluationContext = [
      { direction: "INBOUND" as const, senderType: "CUSTOMER" as const, text: "Mẫu đó chất liệu gì?" },
      { direction: "OUTBOUND" as const, senderType: "BOT" as const, text: "Chị đang hỏi mã nào?" },
      ...Array.from({ length: 18 }, (_, i) => ({ direction: "INBOUND" as const,
        senderType: "CUSTOMER" as const, text: `Other context ${i}` })),
      { direction: "INBOUND" as const, senderType: "CUSTOMER" as const, text: "À, SQ9012 nhé." },
    ].map((message) => ({ ...message, messageType: "TEXT" as const, attachmentCount: 0,
      occurredAt: "2026-09-10T01:59:00.000Z" }));
    // Scripted model decisions test the actual request/compile/egress path;
    // they do not establish real-model intent accuracy or voice quality.
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ANSWER", goal: [
          "NEED: Continue the unresolved material question for the clarified SQ9012.",
          "KNOWN: NONE",
          "ANSWER: selected evidence for the current request",
          (supported ? "LIMIT: NONE" : "LIMIT: material is not verified"),
          "NEXT: NONE",
        ].join("\n"),
        proposition: "PRODUCT_ATTRIBUTES", evidenceRefs: supported ? ["SIMULATION_001_MATERIAL"] : [],
        continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: supported ? null : "Em chưa có thông tin xác nhận chất liệu của mẫu này.",
        factualTexts: [], progressionText: null,
      }), providerModelVersion: "gemini-3.5-flash-lite" });
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE, capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at), evaluationContext,
      simulationFacts: supported ? [facts.simulation_fact_catalog.SF_PRODUCT_A] : [], transport: { send },
    });
    for (const [request] of send.mock.calls) {
      const body = JSON.parse(request.body);
      expect(JSON.parse(body.contents[0].parts[0].text).dialogue).toEqual(evaluationContext);
    }
    expect(result.conversationPlan).toMatchObject({ replyAct: "ANSWER" });
    expect(result.reply).toContain(supported ? "tơ xước" : "chưa có thông tin");
    expect(result.reply).not.toContain("799.000");
    expect(result.output.cta).toBe("NONE");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("realizes bounded locality questions while rejecting appended customer PII", async () => {
    for (const progressionText of [
      "Chị muốn nhận hàng ở tỉnh hoặc thành phố nào ạ?",
      "Chị ở tỉnh hoặc thành phố nào để em kiểm tra giao hàng ạ?",
      "Chị muốn nhận hàng ở tỉnh hoặc thành phố nào ạ? 0901234567",
    ]) {
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "CLARIFY", goal: [
            "NEED: Ask locality to check delivery coverage.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: assigned customer input changes the next executable decision",
          ].join("\n"),
          proposition: "NONE", evidenceRefs: [],
          continuation: { type: "ASK", input: "LOCALITY" }, canonicalAction: "NONE",
        }), providerModelVersion: "gemini-3.5-flash-lite" })
        .mockResolvedValueOnce({ payload: payload({
          answerText: null, factualTexts: [], progressionText,
        }), providerModelVersion: "gemini-3.5-flash-lite" });
      const result = runTrackCStrategyContractCase({
        lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
        capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
        evaluationContext: [{
          direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
          text: "Shop có giao tới chỗ chị không?", attachmentCount: 0,
          occurredAt: "2026-09-10T01:59:00.000Z",
        }], transport: { send },
      });
      if (progressionText.endsWith("0901234567")) {
        await expect(result).rejects.toMatchObject({ diagnostic: {
          stage: "RESPONDER", errorCode: "TRACK_C_RESPONDER_DRAFT_INVALID",
        } });
      } else {
        expect((await result).output.segments.at(-1)?.text).toBe(progressionText);
      }
    }
  });

  it("compiles only the selected profile field and leaves absent properties unresolved", async () => {
    for (const [ref, expected] of [
      ["SIMULATION_001_MATERIAL", "Mẫu này có chất liệu tơ xước mềm, nhẹ ạ."],
      ["SIMULATION_001_DESIGN", "Thiết kế của mẫu gồm phom suông, quần cạp chun ạ."],
      [null, "Em chưa có thông tin xác nhận về khả năng chống nhăn."],
    ] as const) {
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "ANSWER", goal: ref === null ? [
            "NEED: Wrinkle resistance is unknown.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            (ref === null ? "LIMIT: wrinkle resistance is not verified" : "LIMIT: NONE"),
            "NEXT: NONE",
          ].join("\n") : [
            "NEED: Answer the requested attribute.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            (ref === null ? "LIMIT: wrinkle resistance is not verified" : "LIMIT: NONE"),
            "NEXT: NONE",
          ].join("\n"),
          proposition: "PRODUCT_ATTRIBUTES", evidenceRefs: ref === null ? [] : [ref],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
        }), providerModelVersion: "gemini-3.5-flash-lite" })
        .mockResolvedValueOnce({ payload: payload({
          answerText: ref === null ? expected : null, factualTexts: [], progressionText: null,
        }), providerModelVersion: "gemini-3.5-flash-lite" });
      const result = await runTrackCStrategyContractCase({
        lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
        capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
        evaluationContext: [{
          direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
          text: ref === null ? "Mẫu này có dễ nhăn không?" : "Cho chị biết thuộc tính này nhé.",
          attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z",
        }], simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
        transport: { send },
      });
      expect(result.reply).toBe(expected);
      expect(result.responderTask.answer).toMatchObject({
        kind: "ANSWER", evidenceStatus: ref === null ? "UNRESOLVED" : "SUPPORTED",
      });
      expect(result.responderTask.evidence.map(({ ref }) => ref)).toEqual(ref === null ? [] : [ref]);
    }
  });

  it("closes factual, effect and duplicate-request side channels in otherwise valid drafts", async () => {
    for (const draft of [
      { answerText: "Mẫu này thiết kế tỉ mỉ và bền đẹp chị nha.", progressionText: "Chị thích màu nào hơn ạ?" },
      { answerText: "Dạ em đã ghi nhận đơn của chị ạ.", progressionText: "Chị thích màu nào hơn ạ?" },
      { answerText: "Chị thích màu nào hơn ạ?", progressionText: "Chị thích màu nào hơn ạ?" },
      { answerText: "Dạ em hiểu ý chị ạ.", progressionText: "Chị thích màu nào ạ? Ngân sách chị khoảng bao nhiêu ạ?" },
      { answerText: "Dạ em hiểu ý chị ạ.", progressionText: "Dạ em đã ghi nhận đơn của chị ạ. Chị thích màu nào ạ?" },
    ]) {
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "CLARIFY", goal: [
            "NEED: Ask for the customer color preference.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: assigned customer input changes the next executable decision",
          ].join("\n"),
          proposition: "NONE", evidenceRefs: [],
          continuation: { type: "ASK", input: "COLOR" }, canonicalAction: "NONE",
        }), providerModelVersion: "gemini-3.5-flash-lite" })
        .mockResolvedValueOnce({ payload: payload({ ...draft, factualTexts: [] }),
          providerModelVersion: "gemini-3.5-flash-lite" });
      await expect(runTrackCStrategyContractCase({
        lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE, capture: capture(),
        evaluationAt: new Date(recipe.evaluation_at), evaluationContext: [{
          direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
          text: "Chị đang chọn màu.", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z",
        }], transport: { send },
      })).rejects.toMatchObject({ diagnostic: { stage: "FINAL_GUARD" } });
    }
  });

  it("preserves supported facts while realizing bounded uncertainty without a second question", async () => {
    const uncertainty = "Dạ, phần này em chưa thể xác nhận chắc cho chị ạ.";
    for (const answerText of [null, "Dạ em hiểu ý chị ạ.", uncertainty,
      "Dạ mẫu này bền đẹp và giá tương xứng ạ.",
      "Dạ em đã ghi nhận đơn của chị ạ.", "Chị muốn chốt luôn không ạ?",
      "Chị gọi 0901234567 nhé."]) {
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "ANSWER",
          goal: [
            "NEED: State the verified price; return eligibility is not supplied. Ask locality only to resolve the customer's shipping question.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: return eligibility is not confirmed",
            "NEXT: assigned customer input changes the next executable decision",
          ].join("\n"),
          proposition: "PRICE", evidenceRefs: ["CLAIM_001"],
          continuation: { type: "ASK", input: "LOCALITY" }, canonicalAction: "NONE",
        }), providerModelVersion: "gemini-3.5-flash-lite" })
        .mockResolvedValueOnce({ payload: payload({ answerText, factualTexts: [],
          progressionText: "Chị muốn nhận hàng ở tỉnh hoặc thành phố nào ạ?",
        }), providerModelVersion: "gemini-3.5-flash-lite" });
      const result = runTrackCStrategyContractCase({
        lane: "PRODUCTION_CONTRACT", modelResource: MODEL_RESOURCE,
        capture: capture(415_000), evaluationAt: new Date(recipe.evaluation_at),
        evaluationContext: [{
          direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
          text: "Giá mẫu này thế nào, không vừa có trả được không, giao tới chỗ chị được chứ?",
          attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z",
        }], transport: { send },
      });
      if (answerText === null) {
        await expect(result).rejects.toThrow("TRACK_C_RESPONDER_LIMIT_REQUIRED");
        continue;
      }
      if (answerText !== uncertainty) {
        await expect(result).rejects.toBeInstanceOf(TrackCStrategyContractFailure);
        continue;
      }
      const completed = await result;
      const body = JSON.parse(send.mock.calls[1]![0].body);
      expect(body.generationConfig.responseSchema.properties.answerText).toMatchObject({
        anyOf: [{ type: "STRING", maxLength: 600 }],
      });
      expect(completed.responderTask.answer).toMatchObject({ evidenceStatus: "SUPPORTED" });
      expect(completed.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM"))
        .toEqual([{ kind: "VERIFIED_CLAIM", text: "Giá hiện tại của mẫu này là 415.000đ ạ.",
          claimContentHash: completed.responderTask.evidence[0]!.provenance.contentHash }]);
      expect(completed.reply.match(/\?/gu)).toHaveLength(1);
      if (answerText === uncertainty) {
        expect(completed.output.segments.map(({ text }) => text)).toEqual([
          uncertainty, "Giá hiện tại của mẫu này là 415.000đ ạ.",
          "Chị muốn nhận hàng ở tỉnh hoặc thành phố nào ạ?",
        ]);
      } else {
        expect(completed.reply).not.toContain(uncertainty);
      }
    }
  });

  it("reports an unsupported selected realization as an evidence gap before Responder", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({ replyAct: "ANSWER", goal: [
          "NEED: Explain the payment policy.",
          "KNOWN: NONE",
          "ANSWER: selected evidence for the current request",
          "LIMIT: payment policy has no supported realization",
          "NEXT: NONE",
        ].join("\n"),
          proposition: "POLICY", evidenceRefs: ["SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({ answerText: "Em chưa có thông tin xác nhận về bảo hành để trả lời chị.", factualTexts: [], progressionText: null }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE, capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at), evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị thanh toán thế nào?", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z",
      }], simulationFacts: [UNREALIZABLE_POLICY_FACT], transport: { send },
    });
    // The selection is reported as unmet rather than discarded, and the answer
    // does not claim support it cannot state.
    expect(result.responderTask.answer).toMatchObject({
      evidenceStatus: "UNRESOLVED",
    });
    expect(result.responderTask.evidence).toEqual([]);
    expect(result.responderTask.unrealizedEvidence).toEqual([
      { ref: "SIMULATION_001", capability: "POLICY" },
    ]);
    expect(result.responderTask.requiredEvidenceRefs).toEqual([]);
  });

  it("states the uncovered part when only some selected evidence is realizable", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({ replyAct: "ANSWER", goal: [
          "NEED: Answer price and the payment policy.",
          "KNOWN: NONE",
          "ANSWER: selected evidence for the current request",
          "LIMIT: payment policy has no supported realization",
          "NEXT: NONE",
        ].join("\n"),
          proposition: "PRICE", evidenceRefs: ["CLAIM_001", "SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({ answerText: "Về bảo hành, em chưa có thông tin xác nhận để trả lời chị.", factualTexts: [], progressionText: null }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE, capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at), evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Mẫu này bao nhiêu và bảo hành thế nào em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }], simulationFacts: [UNREALIZABLE_POLICY_FACT], transport: { send },
    });

    // The Responder is told which capability it cannot cover...
    const responderPrompt = JSON.parse(
      JSON.parse(send.mock.calls[1]![0].body).contents[0].parts[0].text,
    ) as { responderTask: { unrealizedCapabilities?: readonly string[] } };
    expect(responderPrompt.responderTask.unrealizedCapabilities).toEqual(["POLICY"]);

    // ...and the reply states the price it can answer and names the rest,
    // instead of answering half the question silently.
    const texts = result.output.segments.map(({ text }) => text);
    expect(texts.some((text) => text.includes("Giá hiện tại"))).toBe(true);
    expect(texts.some((text) => text.includes("bảo hành"))).toBe(true);
  });

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
      "PRODUCT_ATTRIBUTES",
      "PRODUCT_ATTRIBUTES",
      "PRODUCT_ATTRIBUTES",
    ]);
    expect(evidence[1]).toMatchObject({
      subject: { productId: "SQ9012", displayName: "Tường Vi" },
      deterministicText:
        "Mẫu Tường Vi là set áo & quần, có chất liệu tơ xước mềm, nhẹ, hiện có màu kem, đen. Thiết kế của mẫu gồm phom suông, quần cạp chun ạ.",
      provenance: { authority: "SIMULATION" },
    });
    expect(JSON.stringify(evidence)).not.toContain("effect");
  });

  it("keeps valid evidence visible when its realization is unsupported", () => {
    const captureValue = capture();
    if (captureValue.status !== "BUILT" || captureValue.context === null) {
      throw new Error("TEST_CAPTURE_REQUIRED");
    }

    // A policy the projector has no wording for still reaches the selection
    // surface: authority does not depend on a renderer existing for it.
    const evidence = buildTrackCSelectableEvidence({
      context: captureValue.context,
      simulationFacts: [UNREALIZABLE_POLICY_FACT],
      executionLane: "BEHAVIOR_SIMULATION",
    });
    const policy = evidence.find(({ capability }) => capability === "POLICY");
    expect(policy).toBeDefined();
    expect(policy?.value).toMatchObject({ policy: "WARRANTY" });
    expect(policy?.deterministicText).toBeUndefined();
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

  it("distinguishes factual availability from safe realization support", () => {
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
        UNREALIZABLE_POLICY_FACT,
      ],
      executionLane: "BEHAVIOR_SIMULATION",
    });

    expect(evidence.map(({ capability }) => capability)).toEqual([
      "PRICE", "POLICY", "BUSINESS_LOCATION", "PROMOTION_OFFER",
      "CART_TOTAL", "PRODUCT_ATTRIBUTES",
      "PRICE", "POLICY",
    ]);
    // Every group that has a code-owned projection can now be stated; the
    // unknown policy keeps authority without one.
    expect(evidence.filter(trackCEvidenceHasSafeFactualEgress)
      .map(({ capability }) => capability)).toEqual([
        "PRICE", "POLICY", "BUSINESS_LOCATION", "PROMOTION_OFFER",
        "CART_TOTAL", "PRODUCT_ATTRIBUTES", "PRICE",
      ]);
    expect(evidence.filter((entry) => !trackCEvidenceHasSafeFactualEgress(entry))
      .map(({ capability }) => capability)).toEqual(["POLICY"]);
  });

  it.each([
    ["Chị đang cân nhắc mẫu SQ9012 và muốn biết địa chỉ shop trước khi mua.", "Em chưa xác nhận được đầy đủ thông tin chị hỏi."],
    ["Em chưa xác nhận khả năng chống nhăn.", "Em chưa xác nhận khả năng chống nhăn."],
  ])("keeps public shop facts and preserves or safely replaces the preface: %s", async (answerText, expected) => {
    const shopFact = "Cửa hàng của shop ở 212 Nguyễn Trãi, Hà Nội. Shop mở cửa 09:00–21:00. Chị qua thử trực tiếp được ạ.";
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ANSWER", goal: [
          "NEED: Answer the shop address from the selected store evidence.",
          "KNOWN: NONE",
          "ANSWER: selected evidence for the current request",
          "LIMIT: NONE",
          "NEXT: NONE",
        ].join("\n"),
        proposition: "BUSINESS_LOCATION", evidenceRefs: ["SIMULATION_001"],
        continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText,
        factualTexts: [shopFact], progressionText: null,
      }), providerModelVersion: "gemini-3.5-flash-lite" });

    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Shop ở Hà Nội địa chỉ đâu em?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }], simulationFacts: [facts.simulation_fact_catalog.SF_STORE],
      transport: { send },
    });
    expect(result.reply).toBe(`${expected} ${shopFact}`);
    expect(result.output.segments).toContainEqual(expect.objectContaining({ kind: "VERIFIED_CLAIM", text: shopFact }));
  });

  it("carries typed requested obligations to the Strategist without raw customer prose", () => {
    const request = buildTrackCStrategistContractRequest({
      modelResource: MODEL_RESOURCE,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Bộ này giá bao nhiêu, có dễ nhăn không?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      evidence: [],
      constraints: {
        permittedCanonicalActions: ["NONE"],
        measurementsUnavailable: false,
        productResolved: true,
        hardStop: false,
      },
      requestedObligations: [
        { kind: "FACT_REQUEST", capability: "PRICE", scope: null,
          productId: null, evidenceText: "giá bao nhiêu" },
        { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
          scope: "WRINKLE_RESISTANCE", productId: null,
          evidenceText: "có dễ nhăn không" },
      ],
    } as never);
    const body = JSON.parse(request.body) as {
      systemInstruction: { parts: [{ text: string }] };
      contents: [{ parts: [{ text: string }] }];
    };
    expect(body.systemInstruction.parts[0].text).toContain(
      "Preserve every independent requestedObligations item",
    );
    const input = JSON.parse(body.contents[0].parts[0].text) as {
      requestedObligations?: unknown;
    };
    expect(input.requestedObligations).toEqual([
      { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: null },
      { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
        scope: "WRINKLE_RESISTANCE", productId: null },
    ]);
    expect(JSON.stringify(input.requestedObligations)).not.toContain("dễ nhăn");
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

  it.each([true, false])("first contact keeps the quote and only requests missing input (complete=%s)", async (complete) => {
    const weightQuestion = "Chị cho em xin thêm cân nặng nhé?";
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({ answerText: null, factualTexts: [], progressionText: complete ? null : weightQuestion }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });
    const result = await runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: capture(), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị chọn màu kem.", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }],
      firstContactInputs: { color: "kem", measurements: complete ? { HEIGHT_CM: 160, WEIGHT_KG: 54 } : { HEIGHT_CM: 160 } },
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      trustedAcquisition: { kind: "TRACK_C_TRUSTED_ACQUISITION_V1", origin: "ADVERTISEMENT",
        firstMeaningfulInbound: true, authorization: "NONE" }, transport: { send },
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.conversationLane).toBe("FIRST_CONTACT_FIXED");
    expect(result.reply).toContain("849.000");
    const request = JSON.parse(send.mock.calls[0]![0].body);
    expect(request.generationConfig.responseSchema.properties.progressionText).toEqual(complete
      ? { type: "NULL" } : { type: "STRING", enum: [weightQuestion] });
    expect(result.reply).not.toContain("chiều cao");
    expect(result.responderTask.continuation).toEqual(complete ? { type: "KEEP_OPEN" } : null);
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
      .toMatchObject({ minItems: 0, maxItems: result.responderTask.evidence.length });
    expect(request.generationConfig.responseSchema.properties.progressionText)
      .toEqual({ type: "STRING", enum: [
        "Chị thích màu nào hơn ạ?", "Màu nào hợp ý chị hơn ạ?",
      ] });
    expect(result.output.segments[1]).toEqual({
      kind: "VERIFIED_CLAIM",
      text: "Mẫu Tường Vi là set áo & quần, có chất liệu tơ xước mềm, nhẹ, hiện có màu kem, đen. Thiết kế của mẫu gồm phom suông, quần cạp chun ạ.",
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
        progressionText: "Màu nào hợp ý chị hơn ạ?",
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
    // Diagnostic mapping supplied independently of the stock claim. Frozen
    // benchmark IDs remain unchanged and never establish a garment size.
    context.productPresentation = {
      schemaVersion: 1, productId: "SQ9012", displayName: "Tuong Vi",
      variants: [{ variantId: "SIZE_S", color: null, size: "S" }],
      provenance: { contentHash: "b".repeat(64) },
    } as unknown as typeof context.productPresentation;
    const claim = context.verifiedClaims[0]!;
    const value = {
      segments: [{
        kind: "VERIFIED_CLAIM",
        text: "Mẫu này hiện hết size S ạ.",
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

    for (const [invalidContext, error] of [
      [{ ...context, productBinding: { ...context.productBinding, productIds: ["ANOTHER_PRODUCT"] } },
        "TRACK_C_V5_PRODUCTION_CLAIM_BINDING_INVALID"],
      [{ ...context, verifiedClaims: [{ ...claim, provenance: {
        ...claim.provenance, expiresAt: recipe.evaluation_at,
      } }] }, "TRACK_C_V5_PRODUCTION_CLAIM_STALE"],
      [{ ...context, verifiedClaims: [{ ...claim, provenance: {
        ...claim.provenance, authority: "CART_POLICY_V1" as const,
      } }] }, "TRACK_C_V5_PRODUCTION_CLAIM_AUTHORITY_INVALID"],
    ] satisfies [typeof context, string][]) {
      expect(() => validateResponderOutput(invalidContext, value,
        "PRODUCTION_CONTRACT", new Date(recipe.evaluation_at))).toThrow(error);
    }
  });

  it("lets the writer explain uncertainty for unresolved factual propositions", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ANSWER",
          goal: [
            "NEED: Answer the stock question without inventing availability.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: requested fact has no verified evidence",
            "NEXT: NONE",
          ].join("\n"),
          proposition: "STOCK",
          evidenceRefs: [],
          continuation: { type: "KEEP_OPEN" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Em chưa có thông tin xác nhận tình trạng hàng của mẫu chị hỏi.",
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
      .toMatchObject({ anyOf: [{ type: "STRING", maxLength: 600 }] });
    expect(result.conversationPlan).toMatchObject({
      replyAct: "ANSWER",
      proposition: "STOCK",
    });
    expect(result.reply).toBe(
      "Em chưa có thông tin xác nhận tình trạng hàng của mẫu chị hỏi.",
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
      "An objection does not force ACKNOWLEDGE",
    );
    expect(body.systemInstruction.parts[0].text).toContain(
      "only when it changes an executable next decision",
    );
    expect(body.systemInstruction.parts[0].text).toContain(
      "Never run a fixed sales funnel or open a topic merely to keep chatting",
    );
    expect(body.systemInstruction.parts[0].text).toContain(
      "ACKNOWLEDGE only for acknowledgement-only turns",
    );
    expect(body.systemInstruction.parts[0].text).toContain(
      "A variant selection alone is not commitment",
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
          goal: [
            "NEED: Acknowledge the concern, then explain the verified stock state.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
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
        text: "Mẫu này hiện còn hàng nhưng số lượng không nhiều ạ.",
      }),
    ]);
  });

  it("can acknowledge a customer's decision context without repeating an unrelated shop fact", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: [
            "NEED: The customer is comparing the verified price with her own budget; no new shop fact resolves the gap.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
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
        text: "Chị thích mẫu này nhưng đang cân đối ngân sách.",
        attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });
    expect(result.reply).toBe("Dạ em hiểu băn khoăn của chị ạ.");
    expect(result.output.segments).toEqual([{
      kind: "GENERAL", text: "Dạ em hiểu băn khoăn của chị ạ.",
    }]);
  });

  it("offers a concern-specific acknowledgement without letting the model write facts", async () => {
    const captureValue = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: {
        id: "C3_PRICE_CONCERN_VOICE",
        latest_customer_message: "Giá này cao quá em.",
        context: {
          product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
          phase: "BROWSING", canonical_flags: [],
          buying_intent: {
            decision: "CONSIDERING", requested_action: "NONE",
            quantity: null, evidence: "customer is weighing the price",
          },
          source_stage: null, runtime_claim_refs: ["RC_PRICE_A"],
        },
      },
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const specific = "Dạ, em hiểu chị đang cân nhắc mức giá này ạ.";
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ACKNOWLEDGE", goal: [
          "NEED: Acknowledge the stated price concern.",
          "KNOWN: NONE",
          "ANSWER: NONE",
          "LIMIT: NONE",
          "NEXT: NONE",
        ].join("\n"),
        proposition: "NONE", evidenceRefs: [],
        continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: specific, factualTexts: [], progressionText: null,
      }), providerModelVersion: "gemini-3.5-flash-lite" });
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: captureValue, evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Giá này cao quá em.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });
    expect(result.reply).toBe(specific);
    const request = JSON.parse(send.mock.calls[1]![0].body);
    expect(request.generationConfig.responseSchema.properties.answerText)
      .toMatchObject({ anyOf: [{ type: "NULL" }, { type: "STRING", maxLength: 600 }] });
    expect(request.generationConfig.responseSchema.properties.factualTexts.maxItems)
      .toBe(0);
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
          goal: [
            "NEED: Acknowledge the customer's selection preference without reopening discovery.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
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
      "Dạ em hiểu ý chị ạ.",
    );
  });

  it("gives the Responder only the typed ASK input and no factual wording authority", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "CLARIFY",
          goal: [
            "NEED: Ask the color choice already relevant to the customer's current decision.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: assigned customer input changes the next executable decision",
          ].join("\n"),
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "ASK", input: "COLOR" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: null,
          factualTexts: [],
          progressionText: "Chị thích màu nào hơn ạ?",
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
      "word exactly one customer-directed request",
    );
    expect(responderBody.systemInstruction.parts[0].text).toContain(
      "No factual explanation, effect, second variable or second question",
    );
    expect(result.output.segments.at(-1)).toEqual({
      kind: "GENERAL",
      text: "Chị thích màu nào hơn ạ?",
    });
  });

  it("fails closed when an ASK progression authors factual wording", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "CLARIFY",
          goal: [
            "NEED: Ask the color choice already relevant to the customer's current decision.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: assigned customer input changes the next executable decision",
          ].join("\n"),
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "ASK", input: "COLOR" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: null,
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
    })).rejects.toMatchObject({ diagnostic: {
      stage: "FINAL_GUARD", errorCode: "TRACK_C_V5_PRODUCTION_GUARD_FAILED",
      reasonCodes: expect.arrayContaining(["UNAUTHORIZED_PRICE"]),
    } });
  });

  it("keeps KEEP_OPEN as a natural progression mechanism without a question", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: [
            "NEED: Acknowledge the customer concern without reopening discovery.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
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
      .toMatchObject({ anyOf: [{ type: "NULL" }, { type: "STRING", maxLength: 600 }] });
    expect(responderRequest.generationConfig.responseSchema.properties.progressionText)
      .toEqual({ type: "NULL" });
    expect(result.output.strategy).toBe("ANSWER_VERIFIED_FACTS");
    expect(result.output.segments).toEqual([
      { kind: "GENERAL", text: "Dạ em hiểu băn khoăn của chị ạ." },
    ]);
  });

  it("rejects model-authored KEEP_OPEN wording even when it looks neutral", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: [
            "NEED: Acknowledge without reopening discovery.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
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
          goal: [
            "NEED: Acknowledge the preference and add the selected product fact.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
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
      .toMatchObject({ anyOf: [{ type: "NULL" }, { type: "STRING", maxLength: 600 }] });
    expect(responderRequest.generationConfig.responseSchema.properties.factualTexts)
      .toMatchObject({ minItems: 0, maxItems: result.responderTask.evidence.length });
    // Editorial factual realizations stay bound to each selected projection;
    // the acknowledgement remains a separate non-factual slot.
    expect(responderPrompt.responderTask.evidence).toEqual(
      result.responderTask.evidence.map(({ deterministicText }) =>
        ({ text: deterministicText })),
    );
    expect(JSON.stringify(responderPrompt.responderTask.evidence))
      .not.toContain("contentHash");
    expect(result.output.segments[0]).toEqual({
      kind: "GENERAL",
      text: "Dạ em hiểu ý chị ạ.",
    });
    expect(result.reply).toContain("Mẫu Tường Vi");
    expect(result.reply).not.toContain("Em vẫn ở đây khi chị cần xem thêm ạ.");
  });

  it("rejects unsupported selling wording in deterministic ACK answerText", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "ACKNOWLEDGE",
          goal: [
            "NEED: Acknowledge the preference and add the selected product fact.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
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
          goal: [
            "NEED: Respect the explicit stop without reopening.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
          proposition: "NONE",
          evidenceRefs: [],
          continuation: null,
          canonicalAction: "HOLD_POSITION",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: "Dạ vâng chị ạ.",
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
    expect(result.reply).toBe("Dạ vâng chị ạ.");
    const responderSchema = JSON.parse(send.mock.calls[1]![0].body)
      .generationConfig.responseSchema;
    expect(responderSchema.properties.answerText.enum).toEqual([
      "Dạ vâng chị ạ.", "Dạ em cảm ơn chị ạ.",
    ]);
  });

  it("allows a bare policy introduction before the bound fact but rejects a changed policy", async () => {
    const fixture = (JSON.parse(readFileSync(
      new URL("quality-08.json", EVAL_ROOT), "utf8",
    )) as { cases: TrackCV5CompactCase[] })
      .cases.find(({ id }) => id === "V5V4Q072")!;
    const captureValue = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION", fixture,
      runtimeClaimCatalog: facts.runtime_claim_catalog, recipe,
    });
    const evaluationContext = [{
      direction: "INBOUND" as const, senderType: "CUSTOMER" as const,
      messageType: "TEXT" as const,
      text: "Không vừa thì chị đổi size được không em?", attachmentCount: 0,
      occurredAt: recipe.evaluation_at,
    }];
    const run = (answerText: string) => runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: captureValue,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext,
      simulationFacts: [facts.simulation_fact_catalog.SF_EXCHANGE_STD],
      transport: { send: vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "ANSWER", goal: [
            "NEED: Answer the size-exchange policy for this product.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
          proposition: "POLICY", evidenceRefs: ["SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
        }), providerModelVersion: "gemini-3.5-flash-lite" })
        .mockResolvedValueOnce({ payload: payload({
          answerText, factualTexts: [], progressionText: null,
        }), providerModelVersion: "gemini-3.5-flash-lite" }) },
    });
    expect((await run("Chị hỏi việc đổi size; chính sách là:")).reply)
      .toContain("Mẫu này đổi được trong 15 ngày");
    // The structured authority guard now rejects the unverified numeric
    // claim before the supplementary product-declaration check.
    await expect(run("Chính sách là đổi được 30 ngày.")).rejects.toThrow(
      "TRACK_C_V5_PRODUCTION_GUARD_FAILED",
    );
  });

  it("acknowledges a canonical stop when the responder leaves every prose slot empty", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ACKNOWLEDGE", goal: [
          "NEED: The customer thanked us; do not reopen checkout or assert an order effect.",
          "KNOWN: NONE",
          "ANSWER: NONE",
          "LIMIT: NONE",
          "NEXT: NONE",
        ].join("\n"),
        proposition: "NONE", evidenceRefs: [], continuation: null,
        canonicalAction: "HOLD_POSITION",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: null, factualTexts: [], progressionText: null,
      }), providerModelVersion: "gemini-3.5-flash-lite" });

    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: materializeTrackCV5CaseCapture({
        lane: "BEHAVIOR_SIMULATION",
        fixture: {
          id: "C3_EMPTY_HOLD_ACK", latest_customer_message: "Ok em cảm ơn nhé.",
          context: {
            product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
            phase: "ORDER_CONFIRMED", canonical_flags: [],
            buying_intent: { decision: "NONE", requested_action: "NONE",
              quantity: null, evidence: null },
            source_stage: "PURCHASE_CONFIRMED", runtime_claim_refs: [],
          },
        }, runtimeClaimCatalog: facts.runtime_claim_catalog, recipe,
      }), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Ok em cảm ơn nhé.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }], transport: { send },
    });

    expect(result.output.strategy).toBe("HOLD_POSITION");
    expect(result.output.cta).toBe("NONE");
    expect(result.reply).toBe("Dạ vâng chị ạ.");
  });

  it("rejects an order confirmation inferred from customer dialogue", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ACKNOWLEDGE", goal: [
          "NEED: Acknowledge the customer without asserting an order effect.",
          "KNOWN: NONE",
          "ANSWER: NONE",
          "LIMIT: NONE",
          "NEXT: NONE",
        ].join("\n"),
        proposition: "NONE", evidenceRefs: [], continuation: null,
        canonicalAction: "HOLD_POSITION",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: "Em vui vì chị đã xác nhận đơn với shop và có đủ thông tin rồi.",
        factualTexts: [], progressionText: null,
      }), providerModelVersion: "gemini-3.5-flash-lite" });

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: materializeTrackCV5CaseCapture({
        lane: "BEHAVIOR_SIMULATION",
        fixture: {
          id: "C3_UNVERIFIED_ORDER_ECHO",
          latest_customer_message: "Ok em cảm ơn nhé.",
          context: {
            product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
            phase: "ORDER_CONFIRMED", canonical_flags: [],
            buying_intent: { decision: "NONE", requested_action: "NONE",
              quantity: null, evidence: null },
            source_stage: "PURCHASE_CONFIRMED", runtime_claim_refs: [],
          },
        }, runtimeClaimCatalog: facts.runtime_claim_catalog, recipe,
      }), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Ok em cảm ơn nhé.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }], transport: { send },
    })).rejects.toMatchObject({ diagnostic: {
      stage: "FINAL_GUARD", errorCode: "TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN",
    } });
  });

  it("rejects a passive shop order confirmation inside a hard-stop acknowledgement", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload({
        replyAct: "ACKNOWLEDGE", goal: [
          "NEED: Thank the customer without confirming an order.",
          "KNOWN: NONE",
          "ANSWER: NONE",
          "LIMIT: NONE",
          "NEXT: NONE",
        ].join("\n"),
        proposition: "NONE", evidenceRefs: [], continuation: null,
        canonicalAction: "HOLD_POSITION",
      }), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload({
        answerText: "Em cảm ơn chị đã xác nhận, em ghi nhận đơn đã được shop xác nhận rồi nhé.",
        factualTexts: [], progressionText: null,
      }), providerModelVersion: "gemini-3.5-flash-lite" });

    await expect(runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: materializeTrackCV5CaseCapture({
        lane: "BEHAVIOR_SIMULATION",
        fixture: {
          id: "C3_PASSIVE_ORDER_ECHO", latest_customer_message: "Ok em cảm ơn nhé.",
          context: {
            product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
            phase: "ORDER_CONFIRMED", canonical_flags: [],
            buying_intent: { decision: "NONE", requested_action: "NONE",
              quantity: null, evidence: null },
            source_stage: "PURCHASE_CONFIRMED", runtime_claim_refs: [],
          },
        }, runtimeClaimCatalog: facts.runtime_claim_catalog, recipe,
      }), evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Ok em cảm ơn nhé.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }], transport: { send },
    })).rejects.toMatchObject({ diagnostic: {
      stage: "FINAL_GUARD", errorCode: "TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN",
    } });
  });

  it("distinguishes an unknown dispatch date from a promise to ship", async () => {
    const dispatchCapture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: {
        id: "C3_DISPATCH_UNCONFIRMED",
        latest_customer_message: "Bao giờ shop gửi hàng cho chị?",
        context: {
          product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
          phase: "BROWSING", canonical_flags: [],
          buying_intent: { decision: "NONE", requested_action: "NONE",
            quantity: null, evidence: null },
          source_stage: null, runtime_claim_refs: ["RC_ETA_HN"],
        },
      }, runtimeClaimCatalog: facts.runtime_claim_catalog, recipe,
    });
    const run = (answerText: string) => runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture: dispatchCapture, evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Bao giờ shop gửi hàng cho chị?", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send: vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "ANSWER", goal: [
            "NEED: Clarify that the dispatch date is unconfirmed.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: requested fact has no verified evidence",
            "NEXT: NONE",
          ].join("\n"),
          proposition: "ETA", evidenceRefs: [],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
        }), providerModelVersion: "gemini-3.5-flash-lite" })
        .mockResolvedValueOnce({ payload: payload({
          answerText, factualTexts: [], progressionText: null,
        }), providerModelVersion: "gemini-3.5-flash-lite" }) },
    });

    const safe = await run("Em chưa có thông tin xác nhận ngày shop sẽ gửi SQ9012; thời gian giao dự kiến chưa cho biết ngày gửi hàng.");
    expect(safe.reply).toContain("chưa có thông tin xác nhận ngày shop sẽ gửi");
    await expect(run("Shop sẽ gửi SQ9012 hôm nay.")).rejects.toMatchObject({
      diagnostic: { stage: "FINAL_GUARD", errorCode: "TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN" },
    });
    await expect(run("Em chưa có thông tin xác nhận ngày shop sẽ gửi SQ9012; shop sẽ gửi hôm nay.")).rejects.toMatchObject({
      diagnostic: { stage: "FINAL_GUARD", errorCode: "TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN" },
    });
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
    })).rejects.toThrow("TRACK_C_RESPONDER_REQUEST_WORDING_INVALID");
  });

  it("accepts a runtime-owned acquisition signal in production without admitting simulation facts", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: payload({
        answerText: null,
        factualTexts: [],
        progressionText: "Chị cho em xin chiều cao và cân nặng để em tư vấn tiếp ạ?",
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
    })).rejects.toThrow("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
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
          goal: [
            "NEED: Answer the verified channel price.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
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
          goal: [
            "NEED: Acknowledge and use the selected product evidence.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"),
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

    expect(valid.reply).toContain("Chị thích màu nào hơn ạ?");

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
    })).rejects.toThrow("TRACK_C_RESPONDER_REQUEST_WORDING_INVALID");
  });

  it("accepts an alternative bounded COLOR phrasing", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({
          replyAct: "CLARIFY",
          goal: [
            "NEED: Ask only for the customer's color decision.",
            "KNOWN: NONE",
            "ANSWER: NONE",
            "LIMIT: NONE",
            "NEXT: assigned customer input changes the next executable decision",
          ].join("\n"),
          proposition: "NONE",
          evidenceRefs: [],
          continuation: { type: "ASK", input: "COLOR" },
          canonicalAction: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({
          answerText: null,
          factualTexts: [],
          progressionText: "Màu nào hợp ý chị hơn ạ?",
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
        text: "Chị đang cân nhắc màu.", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });

    expect(result.reply).toContain("Màu nào hợp ý chị hơn ạ?");
  });

  it("derives a conservative non-guarantee when structured deadline conflicts with verified ETA", async () => {
    const send = etaDecisionTransport();
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: etaCapture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị đang cân nhắc mốc nhận hàng.",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      deliveryDeadlineConstraint: { maxDeliveryDays: 3 },
      transport: { send },
    });

    expect(result.reply).toMatch(/2.?4\s*ngày/iu);
    expect(result.reply).toMatch(/không\s+bảo\s+đảm.*(?:kịp|mốc)/iu);
    expect(result.reply).not.toMatch(/giao\s+hỏa\s*tốc|express|chắc\s+chắn\s+kịp/iu);
  });

  it("does not derive a false non-guarantee when structured deadline is wider than verified ETA", async () => {
    const send = etaDecisionTransport();
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: etaCapture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị cần nhận trong 10 ngày.",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      deliveryDeadlineConstraint: { maxDeliveryDays: 10 },
      transport: { send },
    });

    expect(result.reply).toMatch(/2.?4\s*ngày/iu);
    expect(result.reply).not.toMatch(/không\s+bảo\s+đảm.*(?:kịp|mốc)/iu);
  });

  it("does not infer deadline feasibility from dialogue when structured deadline is absent", async () => {
    const send = etaDecisionTransport();
    const result = await runTrackCStrategyContractCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture: etaCapture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị cần nhận trong 3 ngày.",
        attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      transport: { send },
    });

    expect(result.reply).toMatch(/2.?4\s*ngày/iu);
    expect(result.reply).not.toMatch(/không\s+bảo\s+đảm.*(?:kịp|mốc)/iu);
  });

});
