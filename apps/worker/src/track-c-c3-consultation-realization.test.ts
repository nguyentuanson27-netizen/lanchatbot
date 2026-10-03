import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJsonV1 } from "@lana/contracts";
import { describe, expect, it, vi } from "vitest";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import { bindRealtimeCustomerInput, customerInputRequestedObligations } from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { trackCObligationOutcomeText } from "./track-c-c3-obligation-resolution.js";
import { runTrackCStrategyContractCase } from "./track-c-c3-strategy-contract-runner.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";
import { materializeTrackCV5CaseCapture, type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture } from "./track-c-c3-v5-benchmark-materialization.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";

const corpusRoot = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", corpusRoot), "utf8")) as TrackCV5MaterializationRecipe;
const frozenCorpus = JSON.parse(readFileSync(new URL("facts.json", corpusRoot), "utf8")) as {
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
  simulation_fact_catalog: Record<string, unknown>;
};
const inspection = frozenCorpus.simulation_fact_catalog.SF_INSPECTION!;
const inspectionHash = createHash("sha256").update(canonicalJsonV1({ ref: "SIMULATION_001", fact: inspection })).digest("hex");
const evaluationAt = new Date(recipe.evaluation_at);
const modelResource = "projects/test/locations/global/publishers/google/models/gemini-3.5-flash-lite";
const usageQuestion = "Chị dự định mặc mẫu này vào những dịp nào ạ?";

function source(concern: "TRUST_RISK" | "USAGE_FREQUENCY", withPrice = false) {
  const need = concern === "TRUST_RISK" ? "Chị còn lăn tăn khi mua online." : "Chị ngại mua rồi ít mặc.";
  const text = withPrice ? `${need} Giá bao nhiêu?` : need;
  const dialogue = [{ direction: "INBOUND" as const, senderType: "CUSTOMER" as const, messageType: "TEXT" as const,
    text, attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }];
  const capture = materializeTrackCV5CaseCapture({ lane: "BEHAVIOR_SIMULATION", recipe,
    runtimeClaimCatalog: frozenCorpus.runtime_claim_catalog,
    fixture: { id: `CONSULTATION_REALIZATION_${concern}_${withPrice}`, latest_customer_message: text,
      context: { product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] }, phase: "BROWSING", canonical_flags: [],
        source_stage: null, runtime_claim_refs: withPrice ? ["RC_PRICE_A"] : [],
        buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null } } } });
  const context = contextFromFrozenTrackCCapture({ capture, evaluationAt });
  const customerInput = bindRealtimeCustomerInput({ ...noCustomerSelection(), obligations: [
    { kind: "CONSULTATION", capability: null, scope: null, productId: null, evidenceText: need, decisionConcern: concern },
    ...(withPrice ? [{ kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: null, evidenceText: "Giá bao nhiêu" }] : []),
  ] }, text);
  const requestedObligations = customerInputRequestedObligations(customerInput, context.productBinding.productIds);
  return { capture, context, dialogue, requestedObligations };
}

function response(value: unknown) {
  return { providerModelVersion: "gemini-3.5-flash-lite",
    payload: { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] } };
}

function transport(askUsage = false) {
  return { send: vi.fn<CandidateVertexTransport["send"]>(async (request) => {
    const prompt = JSON.parse(JSON.parse(request.body).contents[0].parts[0].text) as {
      contractVersion: string; responderTask?: { evidence: { text: string }[] };
    };
    if (prompt.contractVersion === "TRACK_C_C3_STRATEGIST_INPUT_V1") return response({
      replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "NONE", evidenceRefs: [], canonicalAction: "NONE",
      continuation: askUsage ? { type: "ASK", input: "DECISION_CRITERION" } : { type: "KEEP_OPEN" },
    });
    return response({ answerText: null, factualTexts: prompt.responderTask!.evidence.map(({ text }) => text),
      progressionText: askUsage ? usageQuestion : null });
  }) };
}

function run(value: ReturnType<typeof source>, model: ReturnType<typeof transport>, simulationFacts: readonly unknown[] = []) {
  return runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION", modelResource, capture: value.capture,
    evaluationAt, evaluationContext: value.dialogue, requestedObligations: value.requestedObligations,
    simulationFacts, transport: model });
}

describe("typed consultation reaches final realization through the real runner", () => {
  it("preserves actual frozen inspection authority and the code-owned supported response", async () => {
    expect(inspection).toMatchObject({ kind: "POLICY_SNAPSHOT", policy: "INSPECTION" });
    expect(inspection).not.toHaveProperty("productId");
    const value = source("TRUST_RISK");
    const model = transport();
    const result = await run(value, model, [inspection]);
    const [resolution] = result.responderTask.obligationResolutions!;

    expect(resolution).toMatchObject({ obligationId: value.requestedObligations[0]!.id,
      kind: "CONSULTATION", decisionConcern: "TRUST_RISK", status: "SUPPORTED", outcome: "SUPPORTED_RESPONSE" });
    expect(resolution!.evidenceRefs).toEqual([{ ref: "SIMULATION_001", contentHash: inspectionHash }]);
    expect(result.responderTask.evidence).toHaveLength(1);
    const policy = result.responderTask.evidence.find(({ provenance }) => provenance.contentHash === inspectionHash)!;
    expect(policy.provenance.authority).toBe("SIMULATION");
    expect(result.output.segments).toContainEqual({ kind: "VERIFIED_CLAIM", text: policy.deterministicText,
      claimContentHash: inspectionHash });
    expect(result.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM")).toHaveLength(1);
    expect(result.output.segments.filter((segment) => segment.kind === "GENERAL" && segment.obligationId === resolution!.obligationId)).toEqual([
      { kind: "GENERAL", obligationId: resolution!.obligationId, text: trackCObligationOutcomeText(resolution!) },
    ]);
    expect(model.send).toHaveBeenCalledTimes(2);
    const simulationHashes = result.responderTask.evidence.filter(({ provenance }) => provenance.authority === "SIMULATION")
      .map(({ provenance }) => provenance.contentHash);
    const missingPolicy = { strategy: result.output.strategy, cta: result.output.cta,
      segments: result.output.segments.filter((segment) => segment.kind !== "VERIFIED_CLAIM" || segment.claimContentHash !== inspectionHash) };
    expect(() => validateResponderOutput(value.context, missingPolicy, "BEHAVIOR_SIMULATION", evaluationAt,
      simulationHashes, null, [], { task: result.responderTask, dialogue: value.dialogue }))
      .toThrow("TRACK_C_RESPONDER_OBLIGATION_FACT_REQUIRED");
  });

  it("uses the typed try-on projection when its raw inspection policy has no realizable inspection wording", async () => {
    const partialInspection = { kind: "POLICY_SNAPSHOT", policy: "INSPECTION", data: { tryOn: "ORDER_DEPENDENT" } };
    const parentHash = createHash("sha256").update(canonicalJsonV1({ ref: "SIMULATION_001", fact: partialInspection })).digest("hex");
    const value = source("TRUST_RISK");
    const result = await run(value, transport(), [partialInspection]);
    const [resolution] = result.responderTask.obligationResolutions!;

    expect(resolution).toMatchObject({ kind: "CONSULTATION", decisionConcern: "TRUST_RISK", outcome: "SUPPORTED_RESPONSE" });
    expect(result.responderTask.evidence).toHaveLength(1);
    const policy = result.responderTask.evidence[0]!;
    expect(policy.value).toMatchObject({ policy: "TRY_ON", tryOn: "ORDER_DEPENDENT", sourceContentHash: parentHash });
    expect(policy.provenance.authority).toBe("SIMULATION");
    expect(policy.provenance.contentHash).not.toBe(parentHash);
    expect(resolution!.evidenceRefs).toEqual([{ ref: policy.ref, contentHash: policy.provenance.contentHash }]);
    expect(result.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM")).toEqual([
      { kind: "VERIFIED_CLAIM", text: policy.deterministicText, claimContentHash: policy.provenance.contentHash },
    ]);
  });

  it("asks exactly one useful usage question and rejects final output that drops it", async () => {
    const value = source("USAGE_FREQUENCY");
    const model = transport(true);
    const result = await run(value, model);
    const [resolution] = result.responderTask.obligationResolutions!;

    expect(resolution).toMatchObject({ obligationId: value.requestedObligations[0]!.id,
      kind: "CONSULTATION", decisionConcern: "USAGE_FREQUENCY", outcome: "ASK_REQUIRED_INPUT",
      clarificationTarget: "DECISION_CRITERION", evidenceRefs: [] });
    expect(result.responderTask.evidence).toEqual([]);
    expect(result.output.segments.filter(({ text }) => text.includes("?"))).toEqual([{ kind: "GENERAL", text: usageQuestion }]);
    expect(result.reply.match(/\?/gu)).toHaveLength(1);
    expect(result.output.segments).toContainEqual({ kind: "GENERAL", obligationId: resolution!.obligationId,
      text: trackCObligationOutcomeText(resolution!) });
    const responderPrompt = JSON.parse(JSON.parse(model.send.mock.calls[1]![0].body).contents[0].parts[0].text);
    expect(responderPrompt.responderTask.consultationObligations).toEqual([
      expect.objectContaining({ obligationId: resolution!.obligationId, outcome: "ASK_REQUIRED_INPUT",
        clarificationPurpose: expect.stringContaining("wearing occasions or frequency") }),
    ]);
    const withoutQuestion = { strategy: result.output.strategy, cta: result.output.cta,
      segments: result.output.segments.filter(({ text }) => text !== usageQuestion) };
    expect(() => validateResponderOutput(value.context, withoutQuestion, "BEHAVIOR_SIMULATION", evaluationAt,
      [], null, [], { task: result.responderTask, dialogue: value.dialogue }))
      .toThrow("TRACK_C_RESPONDER_REQUIRED_INPUT_REQUIRED");
  });

  it("keeps consultation and price identities independent and states the verified price once", async () => {
    const value = source("TRUST_RISK", true);
    const result = await run(value, transport(), [inspection]);
    const [concern, price] = result.responderTask.obligationResolutions!;

    expect(new Set(value.requestedObligations.map(({ id }) => id)).size).toBe(2);
    expect(concern).toMatchObject({ obligationId: value.requestedObligations[0]!.id,
      kind: "CONSULTATION", decisionConcern: "TRUST_RISK", outcome: "SUPPORTED_RESPONSE" });
    expect(price).toMatchObject({ obligationId: value.requestedObligations[1]!.id,
      kind: "FACT_REQUEST", capability: "PRICE", outcome: "ANSWERED" });
    expect(concern!.evidenceRefs).not.toEqual(expect.arrayContaining([...price!.evidenceRefs]));
    const priceEvidence = result.responderTask.evidence.filter(({ capability }) => capability === "PRICE");
    expect(priceEvidence).toHaveLength(1);
    expect(result.output.segments.filter((segment) => segment.kind === "VERIFIED_CLAIM" && segment.claimContentHash === priceEvidence[0]!.provenance.contentHash))
      .toEqual([{ kind: "VERIFIED_CLAIM", text: priceEvidence[0]!.deterministicText,
        claimContentHash: priceEvidence[0]!.provenance.contentHash }]);
    expect(result.reply.match(/849\.000/gu)).toHaveLength(1);
    expect(result.output.segments).toContainEqual({ kind: "GENERAL", obligationId: concern!.obligationId,
      text: trackCObligationOutcomeText(concern!) });
  });
});
