import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import { bindRealtimeCustomerInput, customerInputRequestedObligations } from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { assertTrackCResolutionCoverage, trackCObligationOutcomeText, trackCResolveObligations } from "./track-c-c3-obligation-resolution.js";
import { compileTrackCStrategistDecision, type TrackCRequestedObligation } from "./track-c-c3-strategy-contract.js";
import { runTrackCStrategyContractCase, runTrackCStrategyLive } from "./track-c-c3-strategy-contract-runner.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";
import { materializeTrackCV5CaseCapture, type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture } from "./track-c-c3-v5-benchmark-materialization.js";

const root = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", root), "utf8")) as TrackCV5MaterializationRecipe;
const facts = JSON.parse(readFileSync(new URL("facts.json", root), "utf8")) as {
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
};
const evaluationAt = new Date(recipe.evaluation_at);
const modelResource = "projects/test/locations/global/publishers/google/models/gemini-3.5-flash-lite";
const latestText = "Chị còn lăn tăn khi mua online, với ngại mua rồi ít mặc.";
const dialogue = [{ direction: "INBOUND" as const, senderType: "CUSTOMER" as const, messageType: "TEXT" as const,
  text: latestText, attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }];
const prose = ["Dạ em hiểu chị còn lăn tăn khi mua online.", "Dạ em hiểu chị ngại mua rồi ít mặc."];
const decision = { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "NONE", evidenceRefs: [],
  canonicalAction: "NONE", continuation: { type: "KEEP_OPEN" } };

function source(withPrice = false, concerns?: readonly [NonNullable<TrackCRequestedObligation["decisionConcern"]>,
  NonNullable<TrackCRequestedObligation["decisionConcern"]>]) {
  const currentText = withPrice ? `${latestText} Giá bao nhiêu?` : latestText;
  const currentDialogue = dialogue.map((entry) => ({ ...entry, text: currentText }));
  const capture = materializeTrackCV5CaseCapture({ lane: "BEHAVIOR_SIMULATION", recipe, runtimeClaimCatalog: facts.runtime_claim_catalog,
    fixture: { id: "CONSULTATION_CONSERVATION_CONTROL", latest_customer_message: currentText,
      context: { product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] }, phase: "BROWSING", canonical_flags: [],
        source_stage: null, runtime_claim_refs: withPrice ? ["RC_PRICE_A"] : [], buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null } } } });
  const context = contextFromFrozenTrackCCapture({ capture, evaluationAt });
  const customerInput = bindRealtimeCustomerInput({ ...noCustomerSelection(), obligations: [
    { kind: "CONSULTATION", capability: null, scope: null, productId: null, evidenceText: "còn lăn tăn khi mua online",
      ...(concerns === undefined ? {} : { decisionConcern: concerns[0] }) },
    { kind: "CONSULTATION", capability: null, scope: null, productId: null, evidenceText: "ngại mua rồi ít mặc",
      ...(concerns === undefined ? {} : { decisionConcern: concerns[1] }) },
    ...(withPrice ? [{ kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: null, evidenceText: "Giá bao nhiêu" }] : []),
  ] }, currentText);
  const requestedObligations = customerInputRequestedObligations(customerInput, context.productBinding.productIds);
  const task = compileTrackCStrategistDecision({ decision, evidence: [], requestedObligations,
    boundProductIds: context.productBinding.productIds, permittedCanonicalActions: ["NONE"], measurementsUnavailable: false,
    productResolved: true, hardStop: false, requireStructuredGoal: true }).task;
  return { capture, context, requestedObligations, task, dialogue: currentDialogue };
}

function response(value: unknown) {
  return { providerModelVersion: "gemini-3.5-flash-lite",
    payload: { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] } };
}

function transport(draft: unknown = { answerText: null, factualTexts: [], progressionText: null }, replyAct = "ANSWER") {
  return { send: vi.fn<CandidateVertexTransport["send"]>()
    .mockResolvedValueOnce(response({ ...decision, replyAct }))
    .mockResolvedValueOnce(response(draft)) };
}

function run(sourceValue: ReturnType<typeof source>, model: ReturnType<typeof transport>) {
  return runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION", modelResource,
    capture: sourceValue.capture, evaluationAt, evaluationContext: sourceValue.dialogue,
    requestedObligations: sourceValue.requestedObligations, transport: model });
}

describe("typed consultation conservation", () => {
  it("does not mark acknowledgement-only consultation as answered without code-supported decision evidence", async () => {
    const value = source();
    const texts = value.requestedObligations.map(({ id }, index) => ({ obligationId: id!, text: prose[index]! }));
    const result = await run(value, transport({ answerText: "Dạ em hiểu băn khoăn của chị ạ.", factualTexts: [], progressionText: null }));
    expect(result.responderTask.obligationResolutions?.map(({ obligationId, outcome }) => ({ obligationId, outcome })))
      .toEqual(value.requestedObligations.map(({ id }) => ({ obligationId: id, outcome: "BOUNDED_UNAVAILABLE" })));
    for (const { id } of value.requestedObligations) {
      expect(result.output.segments.some((segment) => segment.kind === "GENERAL" && segment.obligationId === id &&
        segment.text.includes("Em chưa thể trả lời đầy đủ"))).toBe(true);
    }
    expect(() => assertTrackCResolutionCoverage(result.responderTask, ["SQ9012"], texts.map((entry) => ({ kind: "GENERAL", ...entry }))))
      .toThrow("TRACK_C_RESPONDER_LIMIT_REQUIRED");
  });

  it("does not borrow independent price authority to close either nonfactual concern", async () => {
    const value = source(true, ["TRUST_RISK", "USAGE_FREQUENCY"]);
    const result = await run(value, transport());
    expect(result.responderTask.obligationResolutions?.map(({ kind, outcome }) => ({ kind, outcome }))).toEqual([
      { kind: "CONSULTATION", outcome: "BOUNDED_UNAVAILABLE" }, { kind: "CONSULTATION", outcome: "BOUNDED_UNAVAILABLE" },
      { kind: "FACT_REQUEST", outcome: "ANSWERED" },
    ]);
    expect(result.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM")).toHaveLength(1);
  });

  it.each([
    ["PRICE_HESITATION", "khoản tiền cho mẫu này phù hợp"],
    ["FIT_RISK", "mẫu này sẽ vừa và phù hợp"],
    ["TRUST_RISK", "băn khoăn của chị khi mua online"],
    ["USAGE_FREQUENCY", "chị sẽ mặc mẫu này thường xuyên"],
    ["DECISION_CRITERION_UNKNOWN", "chưa thể trả lời đầy đủ phần băn khoăn"],
  ] as const)("consumes typed %s as a bounded decision concern without borrowing shop authority", async (concern, expectedLimit) => {
    const value = source(false, [concern, "DECISION_CRITERION_UNKNOWN"]);
    const model = transport();
    const result = await run(value, model);
    const [resolution] = result.responderTask.obligationResolutions!;
    expect(resolution).toEqual(expect.objectContaining({
      obligationId: value.requestedObligations[0]!.id, decisionConcern: concern,
      status: "UNSUPPORTED", outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [],
    }));
    expect(result.output.segments).toContainEqual({
      kind: "GENERAL", obligationId: resolution!.obligationId, text: trackCObligationOutcomeText(resolution!),
    });
    expect(trackCObligationOutcomeText(resolution!)).toContain(expectedLimit);
    const body = JSON.parse(model.send.mock.calls[1]![0].body);
    const prompt = JSON.parse(body.contents[0].parts[0].text);
    expect(prompt.responderTask.consultationObligations[0]).toEqual({
      obligationId: resolution!.obligationId, decisionConcern: concern, outcome: "BOUNDED_UNAVAILABLE",
      customerText: value.requestedObligations[0]!.customerText,
    });
    const strategistBody = JSON.parse(model.send.mock.calls[0]![0].body);
    const strategistPrompt = JSON.parse(strategistBody.contents[0].parts[0].text);
    expect(strategistPrompt.requestedObligations[0]).toEqual(expect.objectContaining({
      id: resolution!.obligationId, kind: "CONSULTATION", decisionConcern: concern,
    }));
    expect(strategistPrompt.requestedObligations[0]).not.toHaveProperty("customerText");
  });

  it("keeps independent source-bound consultations through typed coverage and labeled final prose", async () => {
    const value = source();
    const model = transport();
    const result = await run(value, model);
    expect(result.responderTask.obligationResolutions).toEqual(value.requestedObligations.map(({ id }) =>
      expect.objectContaining({ obligationId: id, kind: "CONSULTATION", status: "UNSUPPORTED", outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] })));
    expect(result.output.segments).toEqual(result.responderTask.obligationResolutions!.map((entry) =>
      ({ kind: "GENERAL", obligationId: entry.obligationId, text: trackCObligationOutcomeText(entry) })));
    const body = JSON.parse(model.send.mock.calls[1]![0].body);
    expect(body.generationConfig.responseSchema.required).toEqual(["answerText", "factualTexts", "progressionText"]);
    expect(body.generationConfig.responseSchema.properties).not.toHaveProperty("obligationTexts");
  });

  it.each(["missing", "duplicate", "unknown", "empty"])("rejects unsolicited model-owned %s consultation labels", async (failure) => {
    const value = source();
    const texts = value.requestedObligations.map(({ id }, index) => ({ obligationId: id!, text: prose[index]! }));
    const malformed = failure === "missing" ? texts.slice(0, 1)
      : failure === "duplicate" ? [texts[0], texts[0]]
      : failure === "unknown" ? [texts[0], { obligationId: "invented", text: prose[1] }]
      : [texts[0], { ...texts[1], text: " " }];
    await expect(run(value, transport({ answerText: null, factualTexts: [], progressionText: null, obligationTexts: malformed })))
      .rejects.toThrow("TRACK_C_RESPONDER_DRAFT_INVALID");
  });

  it.each(["Mẫu này chống nhăn và đáng tiền.", "Shop đã gửi hàng hôm nay."])("rejects shop facts or effects in consultation text: %s", async (unsafe) => {
    const value = source();
    await expect(run(value, transport({ answerText: unsafe, factualTexts: [], progressionText: null })))
      .rejects.toThrow(/TRACK_C_(?:RESPONDER_UNBOUND_FACTUAL_TEXT|V5_EFFECT_CLAIM_FORBIDDEN)/u);
  });

  it("does not accept missing, duplicate or unknown final labels as complete consultation coverage", () => {
    const value = source();
    const segments = value.task.obligationResolutions!.map((entry) =>
      ({ kind: "GENERAL", obligationId: entry.obligationId, text: trackCObligationOutcomeText(entry)! }));
    expect(() => assertTrackCResolutionCoverage(value.task, ["SQ9012"], segments)).not.toThrow();
    for (const changed of [segments.slice(0, 1), [segments[0]!, segments[0]!],
      [segments[0]!, { ...segments[1]!, obligationId: "invented" }]]) {
      expect(() => assertTrackCResolutionCoverage(value.task, ["SQ9012"], changed))
        .toThrow("TRACK_C_RESPONDER_CONSULTATION_INVALID");
    }
  });

  it("leaves the legacy three-field Responder envelope unchanged without consultation obligations", async () => {
    const value = source();
    const model = transport(undefined, "ACKNOWLEDGE");
    const result = await run({ ...value, requestedObligations: [] }, model);
    const body = JSON.parse(model.send.mock.calls[1]![0].body);
    expect(body.generationConfig.responseSchema.required).toEqual(["answerText", "factualTexts", "progressionText"]);
    expect(body.generationConfig.responseSchema.properties).not.toHaveProperty("obligationTexts");
    expect(result.responderTask.requestedObligations).toEqual([]);
  });

  it("recovers unavailable consultation realization with explicit outcomes instead of marking it answered", async () => {
    const value = source();
    const result = await runTrackCStrategyLive({ context: value.context, modelResource, decisionAt: evaluationAt,
      dialogue, checkoutRequestedFields: [], checkoutClarificationActive: false, currentCart: null, paymentOptions: ["COD"],
      requestedObligations: value.requestedObligations, transport: transport({}) });
    expect(result.responderTask.obligationResolutions).toEqual(value.requestedObligations.map(({ id }) =>
      expect.objectContaining({ obligationId: id, kind: "CONSULTATION", outcome: "BOUNDED_UNAVAILABLE" })));
    expect(result.output.segments).toEqual(value.requestedObligations.map(({ id }) =>
      expect.objectContaining({ kind: "GENERAL", obligationId: id, text: expect.any(String) })));
    expect(result.recoveryDiagnostic).toBeDefined();
  });

  it("rejects a consultation product subject outside the bound products", () => {
    const value = source();
    const requested = value.requestedObligations.map((entry) => ({ ...entry, productId: "CB182" }));
    const wrongTask = { ...value.task, requestedObligations: requested,
      obligationResolutions: trackCResolveObligations(requested, [], ["SQ9012"]) };
    const segments = requested.map(({ id }, index) => ({ kind: "GENERAL", obligationId: id!, text: prose[index]! }));
    expect(() => assertTrackCResolutionCoverage(wrongTask, ["SQ9012"], segments))
      .toThrow("TRACK_C_REQUESTED_OBLIGATION_BINDING_INVALID");
  });

  it.each(["missing", "unsafe"])("preserves an independent verified price when consultation recovery is %s", async (failure) => {
    const value = source(true);
    const result = await runTrackCStrategyLive({ context: value.context, modelResource, decisionAt: evaluationAt,
      dialogue: value.dialogue, checkoutRequestedFields: [], checkoutClarificationActive: false, currentCart: null, paymentOptions: ["COD"],
      requestedObligations: value.requestedObligations, transport: transport(failure === "missing" ? {}
        : { answerText: "Shop đã gửi hàng hôm nay.", factualTexts: [], progressionText: null }) });
    expect(result.responderTask.obligationResolutions?.map(({ kind, outcome }) => ({ kind, outcome }))).toEqual([
      { kind: "CONSULTATION", outcome: "BOUNDED_UNAVAILABLE" }, { kind: "CONSULTATION", outcome: "BOUNDED_UNAVAILABLE" },
      { kind: "FACT_REQUEST", outcome: "ANSWERED" },
    ]);
    expect(result.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM")).toHaveLength(1);
    expect(result.reply).toContain("849.000");
    expect(result.reply).not.toContain("đã gửi hàng");
    expect(result.recoveryDiagnostic).toBeDefined();
  });

  it("rejects a consultation annotation when no code-owned conversation task exists", () => {
    const value = source();
    expect(() => validateResponderOutput(value.context, { segments: [{ kind: "GENERAL", obligationId: "invented", text: prose[0] }],
      strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE" }, "PRODUCTION_CONTRACT", evaluationAt))
      .toThrow("TRACK_C_RESPONDER_CONSULTATION_INVALID");
  });

  it("keeps a privacy-bounded consultation and its verified price through the live Responder handoff", async () => {
    const value = source(true);
    const privateAddress = "91 Nguyễn Huy Tưởng";
    const current = `Price please. I worry about delivery to địa chỉ: ${privateAddress}.`;
    const customerInput = bindRealtimeCustomerInput({ ...noCustomerSelection(), obligations: [
      { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: null, evidenceText: "Price please" },
      { kind: "CONSULTATION", capability: null, scope: null, productId: null,
        evidenceText: `I worry about delivery to địa chỉ: ${privateAddress}.` },
    ] }, current);
    const requested = customerInputRequestedObligations(customerInput, ["SQ9012"]);
    expect(requested[1]).toMatchObject({ lookupStatus: "FAILED" });
    expect(requested[1]?.customerText).toBeUndefined();
    const model = transport();
    const result = await runTrackCStrategyLive({ context: value.context, modelResource, decisionAt: evaluationAt,
      dialogue: [{ ...dialogue[0]!, text: "Price please. I worry about delivery." }],
      checkoutRequestedFields: [], checkoutClarificationActive: false, currentCart: null, paymentOptions: ["COD"],
      requestedObligations: requested, transport: model });
    expect(result.responderTask.obligationResolutions?.map(({ outcome }) => outcome)).toEqual(["ANSWERED", "BOUNDED_UNAVAILABLE"]);
    expect(result.reply).toContain("849.000");
    expect(result.output.segments).toContainEqual(expect.objectContaining({ kind: "GENERAL", obligationId: requested[1]!.id }));
    expect(JSON.stringify(model.send.mock.calls)).not.toContain(privateAddress);
    expect(model.send).toHaveBeenCalledTimes(2);
  });

  it("retains the prior rejection subject instead of rebinding it to a new alternative", () => {
    const [resolution] = trackCResolveObligations([{ id: "reject", kind: "PRODUCT_REJECT", capability: null, scope: null, productId: null }],
      [], ["NEWITEM42"]);
    expect(resolution?.subject.productId).toBeNull();
  });

  it("preserves an explicitly requested three-piece price configuration in coverage", () => {
    const [resolution] = trackCResolveObligations([{ id: "price", kind: "FACT_REQUEST", capability: "PRICE", scope: null,
      productId: "SQ9012", component: "FULL_SET", offerScope: "THREE_PIECE" }], [], ["SQ9012"]);
    expect(resolution?.subject).toEqual(expect.objectContaining({ component: "FULL_SET", offerScope: "THREE_PIECE" }));
  });
});
