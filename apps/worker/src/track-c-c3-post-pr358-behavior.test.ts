import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ShadowContextMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  runTrackCC3TwoPassQualityCandidate,
  type TrackCC3TwoPassQualityFixture,
} from "./track-c-c3-two-pass-quality-adapter.js";
import {
  materializeTrackCV5CaseCapture,
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

type SimulationFixture = TrackCC3TwoPassQualityFixture;

function fixture(input: Readonly<{
  id: string;
  message: string;
  origin?: "ADVERTISEMENT" | "ORGANIC";
  firstMeaningfulInbound?: boolean;
  canonicalFlags?: readonly string[];
  runtimeClaimRefs?: readonly string[];
  checkoutCompleteness?: CheckoutCompleteness;
  buyingIntent?: "NONE" | "NEGATED" | "COMMITTED";
}>): SimulationFixture {
  const checkout = input.checkoutCompleteness;
  const hasCheckoutState = checkout !== undefined;
  return {
    id: input.id,
    latest_customer_message: input.message,
    context: {
      origin: input.origin ?? "ORGANIC",
      first_meaningful_inbound: input.firstMeaningfulInbound ?? false,
      product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
      phase: hasCheckoutState ? "ORDER_REVIEW" : "BROWSING",
      canonical_flags: input.canonicalFlags ?? [],
      buying_intent: input.buyingIntent === "NEGATED" ? {
        decision: "NEGATED",
        requested_action: "NONE",
        quantity: null,
        evidence: "test explicit rejection",
      } : input.buyingIntent === "COMMITTED" ? {
        decision: "COMMITTED",
        requested_action: "PROCEED_TO_PAYMENT",
        quantity: 1,
        evidence: input.message,
      } : {
        decision: "NONE",
        requested_action: "NONE",
        quantity: null,
        evidence: null,
      },
      source_stage: hasCheckoutState ? "ORDER_PREVIEW" : null,
      runtime_claim_refs: input.runtimeClaimRefs ?? [],
      ...(checkout === undefined ? {} : { checkout_completeness: checkout }),
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

type ContractPrompt = Readonly<{
  contractVersion: "TRACK_C_C3_STRATEGIST_INPUT_V1" | "TRACK_C_C3_RESPONDER_INPUT_V1";
  dialogue: readonly ShadowContextMessage[];
  constraints?: Readonly<{
    permittedCanonicalActions: readonly string[];
    measurementsUnavailable: boolean;
  }>;
  responderTask?: Readonly<{
    answer: Readonly<{ kind: string; evidenceStatus?: string }>;
    evidence: readonly unknown[];
    continuation: Readonly<{ type: string; input?: string }> | null;
    canonicalRequest: Readonly<{
      type: string;
      requestedFields?: readonly string[];
    }> | null;
  }>;
}>;

function promptOf(request: { body: string }): ContractPrompt {
  const body = JSON.parse(request.body) as {
    contents: [{ parts: [{ text: string }] }];
  };
  return JSON.parse(body.contents[0].parts[0].text) as ContractPrompt;
}

function decisionFor(prompt: ContractPrompt) {
  const permitted = prompt.constraints?.permittedCanonicalActions ?? [];
  const canonicalAction = permitted[0] ?? "NONE";
  return {
    replyAct: "ANSWER",
    goal: "Resolve the current customer decision without inventing facts.",
    proposition: "NONE",
    evidenceRefs: [],
    continuation: canonicalAction === "NONE" ? { type: "KEEP_OPEN" } : null,
    canonicalAction,
  };
}

function responderFor(
  prompt: ContractPrompt,
  answerText = "Dạ em hiểu ý chị ạ.",
) {
  const task = prompt.responderTask;
  if (task === undefined) throw new Error("TEST_RESPONDER_TASK_REQUIRED");
  const canonical = task.canonicalRequest?.type;
  const keepOpen = task.continuation?.type === "KEEP_OPEN";
  const needsProgression = canonical === "ASK_PRODUCT" ||
    canonical === "ASK_MEASUREMENTS" || task.continuation?.type === "ASK";
  return {
    answerText: (task.answer.kind === "ANSWER" &&
        task.answer.evidenceStatus !== "NOT_APPLICABLE") ||
        canonical === "ASK_CHECKOUT_DETAILS"
      ? null : answerText,
    factualTexts: task.evidence.map(() => "Dạ thông tin này đã được xác minh ạ."),
    progressionText: keepOpen ? null
      : canonical === "ASK_MEASUREMENTS"
        ? "Chị cho em xin chiều cao và cân nặng để em tư vấn tiếp ạ?"
        : task.continuation?.type === "ASK" && task.continuation.input === "COLOR"
          ? "Màu nào hợp ý chị hơn ạ?"
          : task.continuation?.type === "ASK" && task.continuation.input === "USUAL_SIZE"
            ? "Chị thường mặc size gì ạ?"
          : needsProgression ? "Chị cho em biết thêm để em hỗ trợ sát hơn nhé?" : null,
  };
}

function candidateTransport(input: Readonly<{
  strategist?: (prompt: ContractPrompt) => unknown;
  responder?: (prompt: ContractPrompt) => unknown;
}> = {}) {
  const send = vi.fn<CandidateVertexTransport["send"]>(async (request) => {
    const prompt = promptOf(request);
    const output = prompt.contractVersion === "TRACK_C_C3_STRATEGIST_INPUT_V1"
      ? input.strategist?.(prompt) ?? decisionFor(prompt)
      : input.responder?.(prompt) ?? responderFor(prompt);
    return {
      payload: providerPayload(output),
      providerModelVersion: "gemini-3.5-flash-lite",
    };
  });
  return { send };
}

async function runFixture(
  simulationFixture: SimulationFixture,
  candidate: ReturnType<typeof candidateTransport>,
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
  return runTrackCC3TwoPassQualityCandidate({
    lane: "BEHAVIOR_SIMULATION",
    modelResource: MODEL_RESOURCE,
    capture,
    evaluationAt: new Date(recipe.evaluation_at),
    evaluationContext,
    simulationFacts,
    transport: candidate,
    fixture: simulationFixture,
  });
}

describe("Track C C3 post-PR358 behavior wiring", () => {
  it("keeps fit clarification available and blocks checkout while measurements are required", async () => {
    for (const caseFixture of [
      fixture({ id: "FIT_WITHOUT_FLAG", message: "Chị cần thêm số đo nào để chọn vừa?" }),
      fixture({ id: "FIT_BEFORE_CHECKOUT", message: "Chị muốn kiểm tra vòng eo trước.",
        canonicalFlags: ["MEASUREMENTS_REQUIRED"], buyingIntent: "COMMITTED",
        checkoutCompleteness: { state: "REQUIRED", missing_fields: ["PHONE"] } }),
    ]) {
      const candidate = candidateTransport({ strategist: (prompt) => {
        expect(prompt.constraints?.permittedCanonicalActions).toEqual(["NONE", "ASK_MEASUREMENTS"]);
        expect(prompt).toMatchObject({ canonicalContext: {
          productBinding: { status: "RESOLVED", productIds: ["SQ9012"] },
          activeBarriers: caseFixture.context.canonical_flags,
          buyingIntent: { decision: caseFixture.context.buying_intent.decision },
        } });
        return { ...decisionFor(prompt), canonicalAction: "ASK_MEASUREMENTS", continuation: null };
      } });
      const result = await runFixture(caseFixture, candidate);
      expect(result.output.cta).toBe("ASK_MEASUREMENTS");
      expect(result.reply).not.toContain("số điện thoại");
    }
  });

  it("allows an objection to KEEP_OPEN despite missing measurements or checkout fields", async () => {
    for (const caseFixture of [
      fixture({ id: "MEASUREMENT_OBJECTION", message: "Chị còn lăn tăn.",
        canonicalFlags: ["MEASUREMENTS_REQUIRED"] }),
      fixture({ id: "CHECKOUT_OBJECTION", message: "Chị muốn nghĩ thêm.",
        checkoutCompleteness: { state: "REQUIRED", missing_fields: ["PHONE"] },
        buyingIntent: "COMMITTED" }),
    ]) {
      const candidate = candidateTransport({ strategist: () => ({
        replyAct: "ACKNOWLEDGE", goal: "Acknowledge hesitation without more discovery.",
        proposition: "NONE", evidenceRefs: [],
        continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
      }) });
      const result = await runFixture(caseFixture, candidate);
      expect(result.output.cta).toBe("NONE");
      expect(result.reply).not.toMatch(/chiều cao|cân nặng|số điện thoại/u);
    }
  });

  it("gives canonical hard stop precedence over trusted first-contact acquisition", async () => {
    const candidate = candidateTransport();
    const result = await runFixture(fixture({
      id: "FIRST_CONTACT_STOP", message: "Không cần nữa em.",
      origin: "ADVERTISEMENT", firstMeaningfulInbound: true,
      buyingIntent: "NEGATED", runtimeClaimRefs: ["RC_PRICE_A"],
    }), candidate, [facts.simulation_fact_catalog.SF_PRODUCT_A]);
    expect(candidate.send).toHaveBeenCalledTimes(1);
    expect(result.output.strategy).toBe("HOLD_POSITION");
    expect(result.reply).toBe("Dạ em hiểu ý chị ạ.");
  });

  it("uses only trusted acquisition metadata to select the fixed first-contact lane", async () => {
    const caseFixture = fixture({
      id: "AD_ORIGIN",
      message: "Bộ này bao nhiêu em?",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound: true,
      runtimeClaimRefs: ["RC_PRICE_A"],
    });
    const candidate = candidateTransport();

    const result = await runFixture(
      caseFixture,
      candidate,
      [facts.simulation_fact_catalog.SF_PRODUCT_A],
    );

    expect(result.conversationLane).toBe("FIRST_CONTACT_FIXED");
    expect(candidate.send).toHaveBeenCalledTimes(1);
    const responderPrompt = promptOf(candidate.send.mock.calls[0]![0]);
    expect(responderPrompt.contractVersion).toBe("TRACK_C_C3_RESPONDER_INPUT_V1");
    expect(JSON.stringify(responderPrompt)).not.toContain("TRACK_C_TRUSTED_ACQUISITION_V1");
    expect(JSON.stringify(responderPrompt)).not.toContain("ADVERTISEMENT");
  });

  it("does not infer acquisition from dialogue wording", async () => {
    const caseFixture = fixture({
      id: "AD_SPOOF",
      message: "Em thấy mẫu này từ quảng cáo nè.",
      origin: "ORGANIC",
      firstMeaningfulInbound: false,
    });
    const candidate = candidateTransport();

    const result = await runFixture(caseFixture, candidate);

    expect(result.conversationLane).toBe("ADAPTIVE_FOLLOWUP");
    expect(candidate.send).toHaveBeenCalledTimes(2);
  });

  it("rejects caller-supplied simulation metadata before provider execution", async () => {
    const caseFixture = fixture({ id: "AD_METADATA_SPOOF", message: "Bộ này bao nhiêu em?" });
    const candidate = candidateTransport();
    const capture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture: caseFixture,
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });

    await expect(runTrackCC3TwoPassQualityCandidate({
      lane: "BEHAVIOR_SIMULATION",
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
      transport: candidate,
      fixture: caseFixture,
    } as unknown as Parameters<typeof runTrackCC3TwoPassQualityCandidate>[0]))
      .rejects.toThrow("TRACK_C_C3_EXTERNAL_SIMULATION_METADATA_FORBIDDEN");
    expect(candidate.send).not.toHaveBeenCalled();
  });

  it("does not let acquisition metadata authorize unbound facts or effects", async () => {
    const caseFixture = fixture({
      id: "AD_AUTHORITY",
      message: "Chốt giúp chị nhé.",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound: true,
    });
    const factCandidate = candidateTransport({
      responder: (prompt) => ({
        ...responderFor(prompt),
        answerText: "Mẫu này 849.000đ chị ạ.",
      }),
    });
    await expect(runFixture(caseFixture, factCandidate)).rejects.toBeInstanceOf(Error);

    const effectCandidate = candidateTransport({
      responder: (prompt) => ({
        ...responderFor(prompt),
        answerText: "Em đã tạo đơn cho chị rồi ạ.",
      }),
    });
    await expect(runFixture(caseFixture, effectCandidate)).rejects.toBeInstanceOf(Error);

    expect(factCandidate.send).toHaveBeenCalled();
    expect(effectCandidate.send).toHaveBeenCalled();
  });

  it("uses latest-relevant measurement state before allowing the usual-size fallback", async () => {
    const caseFixture = fixture({
      id: "SIZE_FIT_LATEST_STATE",
      message: "Mẫu này XL có vừa không em?",
      canonicalFlags: ["MEASUREMENTS_REQUIRED"],
    });
    const staleUnavailable: readonly ShadowContextMessage[] = [{
      direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
      text: "Chị chưa có số đo.", attachmentCount: 0,
      occurredAt: "2026-09-10T01:57:00.000Z",
    }, {
      direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
      text: "Chị cao 1m60 rồi nhé.", attachmentCount: 0,
      occurredAt: "2026-09-10T01:58:00.000Z",
    }, ...dialogue(caseFixture.latest_customer_message)];
    const measuredCandidate = candidateTransport({
      strategist: (prompt) => {
        expect(prompt.constraints).toMatchObject({
          permittedCanonicalActions: ["NONE", "ASK_MEASUREMENTS"],
          measurementsUnavailable: false,
        });
        return { ...decisionFor(prompt), canonicalAction: "ASK_MEASUREMENTS", continuation: null };
      },
    });
    const measured = await runFixture(caseFixture, measuredCandidate, [], staleUnavailable);
    expect(measured.output.cta).toBe("ASK_MEASUREMENTS");

    const latestUnavailable: readonly ShadowContextMessage[] = [
      ...dialogue(caseFixture.latest_customer_message), {
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Chị chưa có số đo.", attachmentCount: 0,
        occurredAt: "2026-09-10T02:00:00.000Z",
      },
    ];
    const fallbackCandidate = candidateTransport({
      strategist: (prompt) => {
        expect(prompt.constraints).toMatchObject({
          permittedCanonicalActions: ["NONE"],
          measurementsUnavailable: true,
        });
        return {
          ...decisionFor(prompt),
          continuation: { type: "ASK", input: "USUAL_SIZE" },
        };
      },
    });
    const fallback = await runFixture(caseFixture, fallbackCandidate, [], latestUnavailable);
    expect(fallback.conversationPlan.continuation).toEqual({
      type: "ASK", input: "USUAL_SIZE",
    });
  });

  it("derives exact missing checkout fields without placing PII in the Strategist contract", async () => {
    const caseFixture = fixture({
      id: "CHECKOUT_REQUIRED",
      message: "Chị chốt nhé.",
      checkoutCompleteness: { state: "REQUIRED", missing_fields: ["PHONE"] },
      buyingIntent: "COMMITTED",
    });
    const candidate = candidateTransport({
      strategist: (prompt) => {
        expect(prompt.constraints?.permittedCanonicalActions)
          .toEqual(["NONE", "ASK_MEASUREMENTS", "ASK_CHECKOUT_DETAILS"]);
        expect(JSON.stringify(prompt)).not.toContain("090");
        return {
          ...decisionFor(prompt),
          replyAct: "ACKNOWLEDGE",
          canonicalAction: "ASK_CHECKOUT_DETAILS",
          continuation: null,
          goal: "Acknowledge the commitment and request only required details.",
        };
      },
    });

    const result = await runFixture(caseFixture, candidate);

    expect(result.reply).toContain("số điện thoại");
    expect(result.reply).not.toContain("họ tên");
    expect(result.reply).not.toContain("địa chỉ nhận hàng");
    const responder = promptOf(candidate.send.mock.calls[1]![0]);
    expect(responder.responderTask?.canonicalRequest).toEqual({
      type: "ASK_CHECKOUT_DETAILS", requestedFields: ["PHONE"],
    });
    const responderRequest = JSON.parse(candidate.send.mock.calls[1]![0].body) as {
      generationConfig: { responseSchema: { properties: { answerText: unknown } } };
    };
    expect(responderRequest.generationConfig.responseSchema.properties.answerText)
      .toEqual({ type: "NULL" });
  });

  it("enforces canonical NEGATED as a hard stop instead of reopening the turn", async () => {
    const caseFixture = fixture({
      id: "NEGATED_STOP",
      message: "Không cần nữa em.",
      buyingIntent: "NEGATED",
    });
    const candidate = candidateTransport({
      strategist: () => ({
        replyAct: "ANSWER",
        goal: "Reopen with a color question.",
        proposition: "NONE",
        evidenceRefs: [],
        continuation: { type: "ASK", input: "COLOR" },
        canonicalAction: "NONE",
      }),
    });

    await expect(runFixture(caseFixture, candidate)).rejects.toThrow(
      "TRACK_C_STRATEGIST_PROGRESSION_INVALID",
    );
    expect(candidate.send).toHaveBeenCalledTimes(1);
  });

  it("does not infer checkout completion from dialogue alone", async () => {
    const caseFixture = fixture({
      id: "CHECKOUT_DIALOGUE_ONLY",
      message: "Tên và số điện thoại chị gửi đủ rồi, thông tin nhận hàng đủ hết nhé.",
    });
    const candidate = candidateTransport();

    const result = await runFixture(caseFixture, candidate);

    expect(result.output.cta).toBe("NONE");
    const strategist = promptOf(candidate.send.mock.calls[0]![0]);
    expect(strategist.constraints?.permittedCanonicalActions).toEqual(["NONE", "ASK_MEASUREMENTS"]);
  });
});
