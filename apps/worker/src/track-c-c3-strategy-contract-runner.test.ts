import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
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

function capture(amountVnd?: number) {
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
        goal: "Resolve delivery feasibility using the verified ETA.",
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
  it("uses one redacted decision for the task, plan and identity without changing fact authority", async () => {
    const goal = "Address the customer's reported budget 700000; recipient phone 0901234567, email lan@example.com. Answer only the verified shop price.";
    const decision = {
      replyAct: "ANSWER", goal, proposition: "PRICE", evidenceRefs: ["CLAIM_001"],
      continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
    };
    const normalized = { ...decision, goal: redactAnalyticsMessage(goal).text };
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
    expect(prompt.responderTask.answer.goal).toBe(normalized.goal);
    expect(prompt.responderTask.evidence).toEqual([{
      text: result.responderTask.evidence[0]!.deterministicText,
    }]);
    expect(responderBody.generationConfig.responseSchema.properties.factualTexts)
      .toMatchObject({ minItems: 0, maxItems: 0 });
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
        replyAct: "ACKNOWLEDGE", goal: "Acknowledge hesitation without requesting known inputs.",
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

  it("realizes bounded locality questions while rejecting appended customer PII", async () => {
    for (const progressionText of [
      "Chị muốn nhận hàng ở tỉnh hoặc thành phố nào ạ?",
      "Chị ở tỉnh hoặc thành phố nào để em kiểm tra giao hàng ạ?",
      "Chị muốn nhận hàng ở tỉnh hoặc thành phố nào ạ? 0901234567",
    ]) {
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "CLARIFY", goal: "Ask locality to check delivery coverage.",
          proposition: "NONE", evidenceRefs: [],
          continuation: { type: "ASK", input: "LOCALITY" }, canonicalAction: "NONE",
        }), providerModelVersion: "gemini-3.5-flash-lite" })
        .mockResolvedValueOnce({ payload: payload({
          answerText: "Dạ em hiểu ý chị ạ.", factualTexts: [], progressionText,
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
      [null, "Dạ hiện em chưa có thông tin đã xác minh để trả lời chắc chắn phần này ạ."],
    ] as const) {
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "ANSWER", goal: ref === null ? "Wrinkle resistance is unknown." : "Answer the requested attribute.",
          proposition: "PRODUCT_ATTRIBUTES", evidenceRefs: ref === null ? [] : [ref],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
        }), providerModelVersion: "gemini-3.5-flash-lite" })
        .mockResolvedValueOnce({ payload: payload({
          answerText: null, factualTexts: [], progressionText: null,
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
          replyAct: "CLARIFY", goal: "Ask for the customer color preference.",
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
    const uncertainty = "Dạ hiện em chưa có thông tin đã xác minh để trả lời chắc chắn phần này ạ.";
    for (const answerText of [null, "Dạ em hiểu ý chị ạ.", uncertainty,
      "Dạ mẫu này bền đẹp và giá tương xứng ạ.",
      "Dạ em đã ghi nhận đơn của chị ạ.", "Chị muốn chốt luôn không ạ?",
      "Chị gọi 0901234567 nhé."]) {
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce({ payload: payload({
          replyAct: "ANSWER",
          goal: "State the verified price; return eligibility is not supplied. Ask locality only to resolve the customer's shipping question.",
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
      if (answerText !== null && answerText !== uncertainty && answerText !== "Dạ em hiểu ý chị ạ.") {
        await expect(result).rejects.toBeInstanceOf(TrackCStrategyContractFailure);
        continue;
      }
      const completed = await result;
      const body = JSON.parse(send.mock.calls[1]![0].body);
      expect(body.generationConfig.responseSchema.properties.answerText).toMatchObject({
        anyOf: [{ type: "NULL" }, { type: "STRING", enum: expect.arrayContaining([uncertainty]) }],
      });
      expect(completed.responderTask.answer).toMatchObject({ evidenceStatus: "SUPPORTED" });
      expect(completed.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM"))
        .toEqual([{ kind: "VERIFIED_CLAIM", text: "Dạ giá hiện tại của mẫu này là 415.000đ ạ.",
          claimContentHash: completed.responderTask.evidence[0]!.provenance.contentHash }]);
      expect(completed.reply.match(/\?/gu)).toHaveLength(1);
      if (answerText === uncertainty) {
        expect(completed.output.segments.map(({ text }) => text)).toEqual([
          "Dạ giá hiện tại của mẫu này là 415.000đ ạ.", uncertainty,
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
        payload: payload({ replyAct: "ANSWER", goal: "Explain the payment policy.",
          proposition: "POLICY", evidenceRefs: ["SIMULATION_001"],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: payload({ answerText: null, factualTexts: [], progressionText: null }),
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
        "Mẫu Tường Vi có chất liệu tơ xước mềm, nhẹ, hiện có màu kem, đen ạ. Thiết kế của mẫu gồm phom suông, quần cạp chun ạ.",
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
      .toEqual({ type: "STRING", enum: [
        "Chị thích màu nào hơn ạ?", "Màu nào hợp ý chị hơn ạ?",
      ] });
    expect(result.output.segments[1]).toEqual({
      kind: "VERIFIED_CLAIM",
      text: "Mẫu Tường Vi có chất liệu tơ xước mềm, nhẹ, hiện có màu kem, đen ạ. Thiết kế của mẫu gồm phom suông, quần cạp chun ạ.",
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
      "Dạ hiện em chưa có thông tin đã xác minh để trả lời chắc chắn phần này ạ.",
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
      "Dạ em hiểu ý chị ạ.",
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
          answerText: "Dạ em hiểu ý chị ạ.",
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
      "choose one of the response schema's customer-directed questions",
    );
    expect(responderBody.systemInstruction.parts[0].text).toContain(
      "Never append factual explanation, an effect, another decision variable, or a second question",
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
          answerText: "Dạ em hiểu ý chị ạ.",
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
    })).rejects.toThrow("TRACK_C_RESPONDER_REQUEST_WORDING_INVALID");
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
    // The Responder reads the code-rendered projections but cannot author
    // factual wording: factualTexts stays pinned to zero items above, so the
    // acknowledgement itself remains non-factual.
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
          goal: "Ask only for the customer's color decision.",
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
