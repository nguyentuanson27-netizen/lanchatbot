import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import { bindRealtimeCustomerInput, customerInputRequestedObligations } from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";
import { buildTrackCSelectableEvidence } from "./track-c-c3-selectable-evidence.js";
import { compileTrackCStrategistDecision } from "./track-c-c3-strategy-contract.js";
import { runTrackCStrategyContractCase } from "./track-c-c3-strategy-contract-runner.js";
import { materializeTrackCV5CaseCapture, type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture } from "./track-c-c3-v5-benchmark-materialization.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";

const root = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", root), "utf8")) as TrackCV5MaterializationRecipe;
const facts = JSON.parse(readFileSync(new URL("facts.json", root), "utf8")) as {
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
};
const evaluationAt = new Date(recipe.evaluation_at);
const modelResource = "projects/test/locations/global/publishers/google/models/gemini-3.5-flash-lite";
const text = "Mẫu này giá bao nhiêu và chính sách thế nào?";
const dialogue = [{ direction: "INBOUND" as const, senderType: "CUSTOMER" as const,
  messageType: "TEXT" as const, text, attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }];
const policies = [
  { kind: "POLICY_SNAPSHOT", policy: "EXCHANGE", data: {
    windowDays: 7, conditions: ["unused", "tags_intact"], customerChangeFeeVnd: 30_000,
  } },
  { kind: "POLICY_SNAPSHOT", policy: "REFUND", data: {
    eligibleReasons: ["manufacturing_defect", "wrong_item_by_shop"], reportWithinDays: 3,
  } },
];
const decision = { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "POLICY",
  evidenceRefs: ["SIMULATION_001"], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" };

function fixture(policy = policies[0]!) {
  const capture = materializeTrackCV5CaseCapture({ lane: "BEHAVIOR_SIMULATION", recipe,
    runtimeClaimCatalog: facts.runtime_claim_catalog,
    fixture: { id: "SIMULATION_COVERAGE_CONTROL", latest_customer_message: text,
      context: { product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] }, phase: "BROWSING",
        source_stage: null, canonical_flags: [], runtime_claim_refs: ["RC_PRICE_A"],
        buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null } } } });
  const context = contextFromFrozenTrackCCapture({ capture, evaluationAt });
  const customerInput = bindRealtimeCustomerInput({ ...noCustomerSelection(), obligations: [
    { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: null, evidenceText: "giá bao nhiêu" },
    { kind: "FACT_REQUEST", capability: "POLICY", scope: policy.policy as "EXCHANGE" | "REFUND", productId: null, evidenceText: "chính sách thế nào" },
  ] }, text);
  const requestedObligations = customerInputRequestedObligations(customerInput, context.productBinding.productIds);
  const evidence = buildTrackCSelectableEvidence({ context, simulationFacts: [policy],
    executionLane: "BEHAVIOR_SIMULATION" });
  const { task } = compileTrackCStrategistDecision({ decision, evidence, requestedObligations,
    boundProductIds: context.productBinding.productIds, permittedCanonicalActions: ["NONE"],
    measurementsUnavailable: false, productResolved: true, hardStop: false, requireStructuredGoal: true });
  const simulationHashes = task.evidence.filter(({ provenance }) => provenance.authority === "SIMULATION")
    .map(({ provenance }) => provenance.contentHash);
  const output = { segments: task.evidence.map((entry) => ({ kind: "VERIFIED_CLAIM" as const,
    claimContentHash: entry.provenance.contentHash, text: entry.deterministicText! })),
    strategy: "ANSWER_VERIFIED_FACTS" as const, cta: "NONE" as const };
  return { capture, context, requestedObligations, task, simulationHashes, output, policy };
}

function response(value: unknown) {
  return { providerModelVersion: "gemini-3.5-flash-lite",
    payload: { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] } };
}

function transport(fabricatePolicy = false) {
  return { send: vi.fn<CandidateVertexTransport["send"]>(async (request) => {
    const prompt = JSON.parse(JSON.parse(request.body).contents[0].parts[0].text) as {
      contractVersion: string; responderTask?: { evidence: { text: string }[] };
    };
    if (prompt.contractVersion === "TRACK_C_C3_STRATEGIST_INPUT_V1") return response(decision);
    return response({ answerText: null, progressionText: null,
      factualTexts: prompt.responderTask!.evidence.map((entry) => fabricatePolicy && !entry.text.includes("849.000")
        ? "Shop cho đổi hoặc hoàn tiền vô điều kiện trong 90 ngày ạ." : entry.text) });
  }) };
}

describe("simulation coverage uses complete final output without production authority", () => {
  it.each(policies)("keeps runtime price and copied $policy policy outcomes through the real runner", async (policy) => {
    const source = fixture(policy);
    const model = transport();
    const result = await runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION", modelResource,
      capture: source.capture, evaluationAt, evaluationContext: dialogue,
      requestedObligations: source.requestedObligations, simulationFacts: [policy], transport: model });
    expect(result.responderTask.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: source.requestedObligations[0]!.id, capability: "PRICE", outcome: "ANSWERED" }),
      expect.objectContaining({ obligationId: source.requestedObligations[1]!.id, capability: "POLICY", outcome: "ANSWERED" }),
    ]);
    const finalHashes = result.output.segments.flatMap((segment) => segment.kind === "VERIFIED_CLAIM" ? [segment.claimContentHash] : []);
    expect(finalHashes).toEqual(expect.arrayContaining(source.task.evidence.map(({ provenance }) => provenance.contentHash)));
    expect(finalHashes).toHaveLength(2);
    expect(model.send).toHaveBeenCalledTimes(2);
  });

  it("does not accept an absent simulation outcome while its runtime sibling is present", () => {
    const source = fixture();
    const incomplete = { ...source.output, segments: source.output.segments.filter(({ claimContentHash }) =>
      !source.simulationHashes.includes(claimContentHash)) };
    expect(() => validateResponderOutput(source.context, incomplete, "BEHAVIOR_SIMULATION", evaluationAt,
      source.simulationHashes, null, [], { task: source.task, dialogue }))
      .toThrow("TRACK_C_RESPONDER_OBLIGATION_FACT_REQUIRED");
  });

  it("rejects a fabricated simulation hash rather than counting it as coverage", () => {
    const source = fixture();
    const fabricated = { ...source.output, segments: source.output.segments.map((segment) =>
      source.simulationHashes.includes(segment.claimContentHash) ? { ...segment, claimContentHash: "f".repeat(64) } : segment) };
    expect(() => validateResponderOutput(source.context, fabricated, "BEHAVIOR_SIMULATION", evaluationAt,
      source.simulationHashes, null, [], { task: source.task, dialogue }))
      .toThrow("TRACK_C_V5_RESPONDER_PROVENANCE_INVALID");
  });

  it("keeps the runtime authority guard active beside supported simulation outcomes", () => {
    const source = fixture();
    const wrongRuntimePrice = { ...source.output, segments: source.output.segments.map((segment) =>
      source.simulationHashes.includes(segment.claimContentHash) ? segment : { ...segment, text: "Giá hiện tại là 1.000đ ạ." }) };
    expect(() => validateResponderOutput(source.context, wrongRuntimePrice, "BEHAVIOR_SIMULATION", evaluationAt,
      source.simulationHashes, null, [], { task: source.task, dialogue }))
      .toThrow("TRACK_C_V5_PRODUCTION_DETERMINISTIC_TEXT_MISMATCH");
  });

  it("rejects fabricated policy wording at the existing realization boundary", async () => {
    const source = fixture();
    await expect(runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION", modelResource,
      capture: source.capture, evaluationAt, evaluationContext: dialogue,
      requestedObligations: source.requestedObligations, simulationFacts: [source.policy], transport: transport(true) }))
      .rejects.toThrow("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
  });

  it.each([true, false])("cannot promote simulation hashes into production authority (declared=%s)", (declared) => {
    const source = fixture();
    expect(() => validateResponderOutput(source.context, source.output, "PRODUCTION_CONTRACT", evaluationAt,
      declared ? source.simulationHashes : [], null, [], { task: source.task, dialogue }))
      .toThrow(declared ? "TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK" : "TRACK_C_V5_RESPONDER_PROVENANCE_INVALID");
  });
});
