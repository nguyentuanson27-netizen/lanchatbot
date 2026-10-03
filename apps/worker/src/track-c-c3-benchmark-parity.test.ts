import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ShadowContextMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { customerInputObligations } from "./realtime-customer-input.js";
import {
  freezeTrackCProducerBenchmarkSnapshot,
  runTrackCFrozenProducerBenchmarkCase,
  runTrackCProducerBenchmarkCase,
} from "./track-c-c3-benchmark-parity.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";

const modelResource = "projects/test/locations/global/publishers/google/models/gemini-3.5-flash-lite";
const evalRoot = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", evalRoot), "utf8")) as TrackCV5MaterializationRecipe;
const facts = JSON.parse(readFileSync(new URL("facts.json", evalRoot), "utf8")) as {
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
};
const decisionAt = new Date(recipe.evaluation_at);
const latestCustomerText = "Bộ này bao nhiêu em? Với ngồi xe lâu vậy vải có dễ nhăn ko?";
const customerInput = {
  ...noCustomerSelection(),
  obligations: [
    { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: null,
      evidenceText: "Bộ này bao nhiêu em?" },
    { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "WRINKLE_RESISTANCE",
      productId: null, evidenceText: "vải có dễ nhăn ko?" },
  ],
};

function dialogue(text = latestCustomerText): ShadowContextMessage[] {
  return [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
    text, attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }];
}

function context(productIds = ["SQ9012"]) {
  const capture = materializeTrackCV5CaseCapture({
    lane: "PRODUCTION_CONTRACT",
    fixture: { id: "SEMANTIC_PARITY_CONTROL", latest_customer_message: latestCustomerText,
      context: { product_binding: { status: "RESOLVED", product_ids: productIds },
        phase: "BROWSING", canonical_flags: [],
        buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null },
        source_stage: null, runtime_claim_refs: ["RC_PRICE_A"] } },
    runtimeClaimCatalog: facts.runtime_claim_catalog, recipe,
  });
  if (capture.context === null) throw new Error("TEST_CONTEXT_REQUIRED");
  return capture.context;
}

function snapshotInput() {
  return { customerInput, latestCustomerText, dialogue: dialogue(),
    productBinding: context().productBinding,
    producerState: { selectedProductId: "SQ9012", measurements: { heightCm: 160 },
      preferences: { occasion: "WORK", shape: "loose" } },
    priorCustomerState: { budgetVnd: 900_000, occasion: "WORK" as const, rejectedProductIds: ["OLD"] } };
}

function modelResponse(value: unknown) {
  return { providerModelVersion: "gemini-3.5-flash-lite",
    payload: { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] } };
}

function strategyTransport() {
  return { send: vi.fn<CandidateVertexTransport["send"]>()
    .mockResolvedValueOnce(modelResponse({ replyAct: "ANSWER", goal: "TYPED_DECISION",
      proposition: "PRICE", evidenceRefs: ["CLAIM_001"],
      continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }))
    .mockResolvedValueOnce(modelResponse({ answerText: null, factualTexts: [], progressionText: null })) };
}

function businessInputs(lookupContext = context()) {
  return { context: lookupContext, decisionAt, checkoutRequestedFields: [],
    checkoutClarificationActive: false, currentCart: null, paymentOptions: ["COD" as const],
    measurementRequestedFields: [] };
}

describe("typed Producer benchmark parity", () => {
  it("runs Producer once, deterministic lookup and the live compiler/Responder with both requested parts", async () => {
    const source = snapshotInput();
    const producerTransport = { send: vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValue(modelResponse(source.customerInput)) };
    const transport = strategyTransport();
    const lookup = vi.fn(async (snapshot: ReturnType<typeof freezeTrackCProducerBenchmarkSnapshot>) => {
      expect(snapshot.customerInput).toEqual(source.customerInput);
      expect(snapshot.producerState).toEqual(source.producerState);
      expect(snapshot.customerState).toEqual(source.priorCustomerState);
      expect(Object.isFrozen(snapshot.customerInput.obligations)).toBe(true);
      return businessInputs();
    });
    const result = await runTrackCProducerBenchmarkCase({ ...source, modelResource,
      producerTransport, transport, lookup,
      expected: { answer: "DO_NOT_SEND_EXPECTED_ANSWER_TO_MODEL" } } as Parameters<typeof runTrackCProducerBenchmarkCase>[0]);
    expect(result.parity).toBe("SOURCE_BOUND_PRODUCER");
    expect(result.candidate).toMatchObject({ contractVersion: "TRACK_C_C3_STRATEGY_CONTRACT_RESULT_V1",
      executionLane: "PRODUCTION_CONTRACT", evaluationOnly: true, sideEffects: "DISABLED" });
    expect(result.candidate.responderTask.requestedObligations?.map(({ id }) => id))
      .toEqual(customerInputObligations(result.snapshot.customerInput).map(({ id }) => id));
    expect(result.candidate.responderTask.obligationResolutions).toEqual([
      expect.objectContaining({ capability: "PRICE", outcome: "ANSWERED", subject: expect.objectContaining({ productId: "SQ9012" }) }),
      expect.objectContaining({ scope: "WRINKLE_RESISTANCE", outcome: "BOUNDED_UNAVAILABLE", subject: expect.objectContaining({ productId: "SQ9012" }) }),
    ]);
    expect(result.candidate.reply).toContain("849.000");
    expect(result.candidate.reply).toContain("khả năng chống nhăn");
    expect(producerTransport.send).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(transport.send).toHaveBeenCalledTimes(2);
    for (const request of [...producerTransport.send.mock.calls, ...transport.send.mock.calls]) {
      expect(request[0].body).not.toContain("DO_NOT_SEND_EXPECTED_ANSWER_TO_MODEL");
    }
  });

  it("freezes the full typed delta, state, search criteria and relations without retaining mutable source references", () => {
    const text = "SQ9012 thôi không lấy; tìm mẫu suông tránh bó eo dưới 800k; áo S quần M; nhận trong 5 ngày; rẻ hơn CB182";
    const source = { ...snapshotInput(), latestCustomerText: text, dialogue: dialogue(text),
      customerInput: { ...noCustomerSelection(),
        product: { operation: "SEARCH", productId: null, evidenceText: "tìm mẫu suông" },
        budget: { operation: "SET", value: 800_000, evidenceText: "dưới 800k" },
        obligations: [
          { kind: "PRODUCT_REJECT", capability: null, scope: null, productId: "SQ9012", evidenceText: "SQ9012 thôi không lấy" },
          { kind: "PRODUCT_SEARCH", capability: null, scope: null, productId: null, evidenceText: "tìm mẫu suông tránh bó eo", criteria: { shape: "suông", avoid: ["bó eo"] } },
          { kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: null, evidenceText: "áo S", size: "S", component: "TOP" },
          { kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: null, evidenceText: "quần M", size: "M", component: "BOTTOM" },
          { kind: "FACT_REQUEST", capability: "ETA", scope: "DELIVERY_DEADLINE", productId: null, evidenceText: "nhận trong 5 ngày", deadlineDays: 5 },
          { kind: "FACT_REQUEST", capability: "PRODUCT_COMPARISON", scope: "CHEAPER", productId: "SQ9012", evidenceText: "rẻ hơn CB182", relatedProductId: "CB182" },
        ] } };
    const snapshot = freezeTrackCProducerBenchmarkSnapshot(source);
    expect(snapshot.customerInput).toEqual(source.customerInput);
    expect(snapshot.customerState).toEqual({ budgetVnd: 800_000, occasion: "WORK", rejectedProductIds: ["OLD", "SQ9012"] });
    expect(snapshot.productBinding).toEqual(source.productBinding);
    expect(snapshot.producerState).toEqual(source.producerState);
    source.customerInput.obligations[1]!.criteria!.avoid.push("MUTATED");
    source.producerState.preferences.shape = "MUTATED";
    expect(snapshot.customerInput.obligations?.[1]?.criteria?.avoid).toEqual(["bó eo"]);
    expect(snapshot.producerState).toEqual(expect.objectContaining({ preferences: { occasion: "WORK", shape: "loose" } }));
    expect(Object.isFrozen(snapshot.customerInput.obligations?.[1]?.criteria?.avoid)).toBe(true);
  });

  it("replays the required typed snapshot through the live path without another Producer call", async () => {
    const snapshot = freezeTrackCProducerBenchmarkSnapshot(snapshotInput());
    const transport = strategyTransport();
    const result = await runTrackCFrozenProducerBenchmarkCase({ snapshot, modelResource,
      transport, lookup: async () => businessInputs() });
    expect(result.parity).toBe("FROZEN_TYPED_PRODUCER");
    expect(result.candidate.responderTask.obligationResolutions).toHaveLength(2);
    expect(result.candidate.responderTask.requestedObligations).toHaveLength(2);
    expect(transport.send).toHaveBeenCalledTimes(2);
  });

  it("refuses legacy fact-only customer input and dialogue that is not the current source", () => {
    expect(() => freezeTrackCProducerBenchmarkSnapshot({ ...snapshotInput(), customerInput: noCustomerSelection() }))
      .toThrow("TRACK_C_BENCHMARK_TYPED_OBLIGATIONS_REQUIRED");
    expect(() => freezeTrackCProducerBenchmarkSnapshot({ ...snapshotInput(), dialogue: dialogue("previous turn") }))
      .toThrow("TRACK_C_BENCHMARK_CURRENT_SOURCE_MISMATCH");
  });

  it("rejects a changed business binding before any strategy generation", async () => {
    const snapshot = freezeTrackCProducerBenchmarkSnapshot(snapshotInput());
    const transport = strategyTransport();
    await expect(runTrackCFrozenProducerBenchmarkCase({ snapshot, modelResource, transport,
      lookup: async () => businessInputs(context(["CB182"])) }))
      .rejects.toThrow("TRACK_C_BENCHMARK_PRODUCT_BINDING_MISMATCH");
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("revalidates the frozen Producer delta instead of accepting changed unbound evidence", async () => {
    const snapshot = freezeTrackCProducerBenchmarkSnapshot(snapshotInput());
    const tampered = { ...snapshot, customerInput: { ...snapshot.customerInput,
      obligations: [{ ...snapshot.customerInput.obligations![0]!, evidenceText: "not in this message" }] } };
    const transport = strategyTransport();
    await expect(runTrackCFrozenProducerBenchmarkCase({ snapshot: tampered, modelResource, transport,
      lookup: async () => businessInputs() })).rejects.toThrow("CUSTOMER_INPUT_UNBOUND_EVIDENCE");
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("captures the exact Producer source before an asynchronous generation can mutate caller input", async () => {
    const source = snapshotInput();
    const producerTransport = { send: vi.fn<CandidateVertexTransport["send"]>(async () => {
      source.producerState.preferences.shape = "MUTATED_AFTER_GENERATION_STARTED";
      return modelResponse(source.customerInput);
    }) };
    const result = await runTrackCProducerBenchmarkCase({ ...source, modelResource, producerTransport,
      transport: strategyTransport(), lookup: async () => businessInputs() });
    expect(result.snapshot.producerState).toEqual(expect.objectContaining({
      preferences: { occasion: "WORK", shape: "loose" },
    }));
  });

  it("requires typed snapshot identity and consistent derived customer state before lookup", async () => {
    const snapshot = freezeTrackCProducerBenchmarkSnapshot(snapshotInput());
    const transport = strategyTransport();
    const lookup = vi.fn(async () => businessInputs());
    const missingVersion = { ...snapshot, contractVersion: undefined } as unknown as typeof snapshot;
    await expect(runTrackCFrozenProducerBenchmarkCase({ snapshot: missingVersion, modelResource, transport, lookup }))
      .rejects.toThrow("TRACK_C_BENCHMARK_TYPED_SNAPSHOT_REQUIRED");
    await expect(runTrackCFrozenProducerBenchmarkCase({ snapshot: { ...snapshot,
      customerState: { ...snapshot.customerState, budgetVnd: 1 } }, modelResource, transport, lookup }))
      .rejects.toThrow("TRACK_C_BENCHMARK_CUSTOMER_STATE_MISMATCH");
    expect(lookup).not.toHaveBeenCalled();
    expect(transport.send).not.toHaveBeenCalled();
  });
});
