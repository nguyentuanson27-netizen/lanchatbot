import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindRealtimeCustomerInput,
  customerInputObligations,
} from "./realtime-customer-input.js";
import {
  AT,
  answerPlan,
  deterministicRuntime,
  inputDelta,
} from "./realtime-c3-deterministic.fixture.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";
import {
  compileTrackCStrategistDecision,
  type TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";

const customerText = "Bộ này bao nhiêu em?\nVới ngồi xe lâu vậy vải có dễ nhăn ko?";
const priceQuery = {
  intent: "PRICE" as const, offerType: "SET", size: null, color: null, deliveryRegion: null,
};
const requestedParts = [
  { kind: "FACT_REQUEST" as const, capability: "PRICE" as const, scope: null,
    productId: null, evidenceText: "Bộ này bao nhiêu em?" },
  { kind: "FACT_REQUEST" as const, capability: "PRODUCT_ATTRIBUTES" as const,
    scope: "WRINKLE_RESISTANCE" as const, productId: null,
    evidenceText: "Với ngồi xe lâu vậy vải có dễ nhăn ko?" },
];
const producerInput = () => bindRealtimeCustomerInput(inputDelta({
  factQuery: priceQuery, obligations: requestedParts,
}), customerText);
const priceEvidence: TrackCSelectableEvidence = {
  ref: "PRICE_CURRENT", capability: "PRICE", subject: { productId: "CB182" },
  value: { amountVnd: 799_000 }, deterministicText: "Giá hiện tại của mẫu CB182 là 799.000đ.",
  provenance: { contentHash: "a".repeat(64), authority: "RUNTIME" },
};

// Inspect identity at runtime boundaries without assuming an implementation-specific ID format.
function ids(entries: readonly unknown[]) {
  return entries.map((entry) => (entry as { id?: string }).id);
}

async function compoundRuntimeTurn() {
  const runtime = deterministicRuntime();
  await runtime.turn({ text: "Mẫu CB182 giá bao nhiêu?", producer: inputDelta({
    product: { operation: "SELECT", productId: "CB182", evidenceText: "CB182" }, factQuery: priceQuery,
  }) });
  const input = producerInput();
  const obligations = customerInputObligations(input);
  const trace = await runtime.turn({ text: customerText, producer: input, strategist: answerPlan("PRICE") });
  return { obligations, trace };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(AT)); });
afterEach(() => vi.useRealTimers());

describe("D1 Q052 obligation identity and evidence mapping", () => {
  it("assigns stable distinct code-owned identities before Strategist selection", () => {
    const input = producerInput();
    const obligations = customerInputObligations(input);
    expect(obligations).toHaveLength(2);
    expect(obligations).toEqual([
      expect.objectContaining({ id: expect.any(String), kind: "FACT_REQUEST", capability: "PRICE", scope: null }),
      expect.objectContaining({ id: expect.any(String), kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
        scope: "WRINKLE_RESISTANCE" }),
    ]);
    expect(ids(obligations)).toEqual(ids(customerInputObligations(input)));
    expect(new Set(ids(obligations)).size).toBe(2);
    expect(ids(obligations).every((id) => typeof id === "string" && id.length > 0)).toBe(true);
  });

  it("does not use an unbound product referent as authority for any available product", () => {
    expect(trackCObligationMatchesEvidence(requestedParts[0]!, priceEvidence)).toBe(false);
    expect(trackCObligationMatchesEvidence({ ...requestedParts[0]!, productId: "SV9031" }, priceEvidence)).toBe(false);
    expect(trackCObligationMatchesEvidence({ ...requestedParts[0]!, productId: "CB182" }, priceEvidence)).toBe(true);
  });

  it("retains both identities and maps only the price sibling through RealtimeRunner", async () => {
    const { obligations, trace } = await compoundRuntimeTurn();
    expect(trace.roleCalls.map(({ role }) => role)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    const strategist = trace.roleCalls.find(({ role }) => role === "STRATEGIST")!.input;
    const requested = strategist.requestedObligations as readonly unknown[];
    expect(requested).toHaveLength(obligations.length);
    expect(ids(requested)).toEqual(ids(obligations));
    expect(requested).toEqual([
      expect.objectContaining({ id: expect.any(String), kind: "FACT_REQUEST", capability: "PRICE", scope: null,
        productId: "CB182" }),
      expect.objectContaining({ id: expect.any(String), kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
        scope: "WRINKLE_RESISTANCE", productId: "CB182" }),
    ]);
    expect(strategist.selectableEvidence?.find(({ capability }) => capability === "PRICE"))
      .toMatchObject({ requestedObligationIndexes: [0] });
    expect(strategist.selectableEvidence?.filter((entry) =>
      (entry as { requestedObligationIndexes?: number[] }).requestedObligationIndexes?.includes(1)))
      .toEqual([]);
    expect(trace.after.commerce).toEqual(trace.before.commerce);
  });
});

describe("D2 Q052 explicit compiler and final task outcomes", () => {
  it.each(["TYPED_DECISION", "NEED: price only\nKNOWN: NONE\nANSWER: PRICE\nLIMIT: NONE\nNEXT: NONE"])(
    "compiles one explicit outcome for each independent obligation despite PRICE focus (%s)", (goal) => {
      const obligations = [
        { id: "current:price", kind: "FACT_REQUEST" as const, capability: "PRICE" as const,
          scope: null, productId: "CB182" },
        { id: "current:wrinkle", kind: "FACT_REQUEST" as const, capability: "PRODUCT_ATTRIBUTES" as const,
          scope: "WRINKLE_RESISTANCE" as const, productId: "CB182" },
      ];
      const result = compileTrackCStrategistDecision({
        requestedObligations: obligations, evidence: [priceEvidence], boundProductIds: ["CB182"],
        permittedCanonicalActions: ["NONE"], measurementsUnavailable: false,
        productResolved: true, hardStop: false, requireStructuredGoal: true,
        decision: { replyAct: "ANSWER", goal, proposition: "PRICE", evidenceRefs: [priceEvidence.ref],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" },
      });
      const coverage = result.task.obligationResolutions;
      expect(result.task.requestedObligations).toEqual(obligations);
      expect(coverage).toHaveLength(obligations.length);
      expect(coverage).toEqual([
        expect.objectContaining({ obligationId: obligations[0]!.id, capability: "PRICE",
          status: "SUPPORTED", outcome: "ANSWERED", subject: expect.objectContaining({ productId: "CB182" }),
          evidenceRefs: [{ ref: priceEvidence.ref, contentHash: priceEvidence.provenance.contentHash }], limitation: null }),
        expect.objectContaining({ obligationId: obligations[1]!.id, capability: "PRODUCT_ATTRIBUTES",
          scope: "WRINKLE_RESISTANCE", status: "UNSUPPORTED", outcome: "BOUNDED_UNAVAILABLE",
          subject: expect.objectContaining({ productId: "CB182" }), evidenceRefs: [],
          limitation: { kind: "NO_VERIFIED_EVIDENCE" } }),
      ]);
      expect(new Set(coverage!.map(({ obligationId }) => obligationId)).size).toBe(obligations.length);
      expect(coverage!.map(({ obligationId }) => obligationId)).toEqual(ids(obligations));
      expect(result.task.semanticHandoff).toMatchObject({
        need: "PRICE; PRODUCT_ATTRIBUTES/WRINKLE_RESISTANCE",
        answer: "PRICE supported", limit: "PRODUCT_ATTRIBUTES/WRINKLE_RESISTANCE unsupported",
      });
      expect(Object.keys(result.decision).sort()).toEqual([
        "canonicalAction", "continuation", "evidenceRefs", "goal", "proposition", "replyAct",
      ]);
    },
  );

  it("keeps both final task outcomes and both reply parts through RealtimeRunner", async () => {
    const { obligations, trace } = await compoundRuntimeTurn();
    expect(trace.roleCalls.map(({ role }) => role)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    const responder = trace.roleCalls.find(({ role }) => role === "RESPONDER")!.input;
    const task = responder.responderTask as { obligationResolutions: readonly { obligationId: string }[];
      semanticHandoff: unknown };
    expect(task.obligationResolutions).toHaveLength(obligations.length);
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: ids(obligations)[0], capability: "PRICE", outcome: "ANSWERED" }),
      expect.objectContaining({ obligationId: ids(obligations)[1], capability: "PRODUCT_ATTRIBUTES",
        scope: "WRINKLE_RESISTANCE", outcome: "BOUNDED_UNAVAILABLE" }),
    ]);
    expect(task.obligationResolutions.map(({ obligationId }) => obligationId)).toEqual(ids(obligations));
    expect(task.semanticHandoff).toMatchObject({ need: "PRICE; PRODUCT_ATTRIBUTES/WRINKLE_RESISTANCE",
      answer: "PRICE supported", limit: "PRODUCT_ATTRIBUTES/WRINKLE_RESISTANCE unsupported" });
    expect(trace.reply).toContain("799.000");
    expect(trace.reply).toContain("chưa có thông tin xác nhận về khả năng chống nhăn");
    expect(trace.after.commerce).toEqual(trace.before.commerce);
  });
});
