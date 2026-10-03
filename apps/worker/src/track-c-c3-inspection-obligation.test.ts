import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJsonV1, RealtimeCustomerObligationV1Schema } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import { bindRealtimeCustomerInput, customerInputObligations, customerInputRequestedObligations,
  CUSTOMER_INPUT_RESPONSE_SCHEMA } from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";
import { trackCPolicyProjections } from "./track-c-c3-fact-realization.js";
import { buildTrackCSelectableEvidence } from "./track-c-c3-selectable-evidence.js";
import { compileTrackCStrategistDecision } from "./track-c-c3-strategy-contract.js";
import { materializeTrackCV5CaseCapture } from "./track-c-c3-v5-benchmark-materialization.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";

const corpusRoot = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", corpusRoot), "utf8"));
const catalog = JSON.parse(readFileSync(new URL("facts.json", corpusRoot), "utf8")) as {
  simulation_fact_catalog: Record<string, { kind: string; policy: string; data: Record<string, unknown> }>;
};
const rawInspection = catalog.simulation_fact_catalog.SF_INSPECTION!;
const evaluationAt = new Date(recipe.evaluation_at);
const inspectionSpan = "Nhận hàng chị được kiểm tra mẫu, màu và size không?";
const tryOnSpan = "Có được mặc thử không?";
const text = `${inspectionSpan} ${tryOnSpan}`;
const dialogue = [{ direction: "INBOUND" as const, senderType: "CUSTOMER" as const, messageType: "TEXT" as const,
  text, attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }];
const context = contextFromFrozenTrackCCapture({ evaluationAt, capture: materializeTrackCV5CaseCapture({
  lane: "BEHAVIOR_SIMULATION", recipe, runtimeClaimCatalog: {},
  fixture: { id: "INSPECTION_AND_TRY_ON", latest_customer_message: text, context: {
    product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] }, phase: "BROWSING", canonical_flags: [],
    buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null },
    source_stage: null, runtime_claim_refs: [],
  } },
}) });
const rawInput = { ...noCustomerSelection(), policyQuestion: null, obligations: [
  { kind: "FACT_REQUEST", capability: "POLICY", scope: "INSPECTION", productId: null,
    subjectScope: "SHOP", evidenceText: inspectionSpan },
  { kind: "FACT_REQUEST", capability: "POLICY", scope: "TRY_ON", productId: null,
    subjectScope: "SHOP", evidenceText: tryOnSpan },
] };

function compile(raw: unknown = rawInspection) {
  const input = bindRealtimeCustomerInput(rawInput, text);
  const requested = customerInputRequestedObligations(input, context.productBinding.productIds);
  const evidence = buildTrackCSelectableEvidence({ context, simulationFacts: [raw], executionLane: "BEHAVIOR_SIMULATION" });
  const task = compileTrackCStrategistDecision({ evidence, requestedObligations: requested,
    boundProductIds: context.productBinding.productIds, permittedCanonicalActions: ["NONE"],
    productResolved: true, measurementsUnavailable: false, hardStop: false, requireStructuredGoal: true,
    decision: { replyAct: "ANSWER", proposition: "POLICY", evidenceRefs: ["SIMULATION_001_TRY_ON"],
      goal: "TYPED_DECISION", continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" },
  }).task;
  return { input, requested, evidence, task };
}

describe("receipt inspection and wearing try-on remain separate typed policy needs", () => {
  it("represents INSPECTION in the shared typed source contract while the legacy policy hint stays null", () => {
    expect(RealtimeCustomerObligationV1Schema.safeParse(rawInput.obligations[0]).success).toBe(true);
    const schema = (CUSTOMER_INPUT_RESPONSE_SCHEMA.properties.obligations as {
      items: { properties: { scope: { enum: string[] } } } }).items;
    expect(schema.properties.scope.enum).toContain("INSPECTION");
    const input = bindRealtimeCustomerInput(rawInput, text);
    expect(input.policyQuestion).toBeNull();
    const requested = customerInputRequestedObligations(input, context.productBinding.productIds);
    expect(requested.map(({ id, scope, subjectScope, productId }) => ({ id, scope, subjectScope, productId })))
      .toEqual(customerInputObligations(input).map(({ id, scope }) => ({ id, scope, subjectScope: "SHOP", productId: null })));
    expect(requested.map(({ scope }) => scope)).toEqual(["INSPECTION", "TRY_ON"]);
  });

  it("projects the actual corpus verification fields independently from its conditional try-on field", () => {
    expect(rawInspection).toMatchObject({ policy: "INSPECTION", data: {
      verifyModel: true, verifyColor: true, verifySize: true, tryOn: "ORDER_DEPENDENT",
    } });
    const projections = trackCPolicyProjections(rawInspection.policy, rawInspection.data);
    expect(projections.map(({ scope }) => scope)).toEqual(["INSPECTION", "TRY_ON"]);
    const inspection = projections.find(({ scope }) => String(scope) === "INSPECTION")!;
    expect(inspection.value).toEqual({ policy: "INSPECTION", verifyModel: true, verifyColor: true, verifySize: true });
    expect(inspection.text).toContain("kiểm tra đúng mẫu, đúng màu và đúng size");
    expect(inspection.text).not.toContain("thử");
    const tryOn = projections.find(({ scope }) => scope === "TRY_ON")!;
    expect(tryOn.value).toEqual({ policy: "TRY_ON", tryOn: "ORDER_DEPENDENT" });
    expect(tryOn.text).toContain("tuỳ theo từng đơn");
    expect(tryOn.text).not.toContain("kiểm tra");
  });

  it("owns exactly two independent answers and excludes the raw monolith even when focus selects only try-on", () => {
    const { requested, evidence, task } = compile();
    const parent = evidence.find(({ ref }) => ref === "SIMULATION_001")!;
    expect(trackCObligationMatchesEvidence(requested[0]!, parent)).toBe(false);
    expect(task.evidence).toHaveLength(2);
    expect(task.evidence.map(({ value }) => value.policy)).toEqual(["TRY_ON", "INSPECTION"]);
    expect(task.obligationResolutions).toEqual(requested.map(({ id, scope }) => expect.objectContaining({
      obligationId: id, scope, outcome: "ANSWERED", status: "SUPPORTED", limitation: null,
      evidenceRefs: [expect.objectContaining({ ref: `SIMULATION_001_${scope}` })],
    })));
    const parentHash = createHash("sha256").update(canonicalJsonV1({ ref: "SIMULATION_001", fact: rawInspection })).digest("hex");
    for (const atom of task.evidence) {
      expect(atom.provenance.authority).toBe("SIMULATION");
      expect(atom.value.sourceContentHash).toBe(parentHash);
      expect(atom.provenance.contentHash).not.toBe(parentHash);
    }
    expect(new Set(task.evidence.map(({ provenance }) => provenance.contentHash)).size).toBe(2);
    expect(trackCObligationMatchesEvidence(requested[0]!, task.evidence[0]!)).toBe(false);
    expect(trackCObligationMatchesEvidence(requested[1]!, task.evidence[1]!)).toBe(false);
  });

  it("does not infer absent or nonboolean verification permissions from a neighbouring allowed check", () => {
    const projections = trackCPolicyProjections("INSPECTION", { verifyColor: true, verifyModel: false,
      verifySize: "true", tryOn: "ORDER_DEPENDENT" });
    const inspection = projections.find(({ scope }) => String(scope) === "INSPECTION")!;
    expect(inspection?.value).toEqual({ policy: "INSPECTION", verifyColor: true });
    expect(inspection?.text).toContain("đúng màu");
    expect(inspection?.text).not.toContain("đúng mẫu");
    expect(inspection?.text).not.toContain("đúng size");
  });

  it("keeps inspection bounded when verification fields are missing while independently answering try-on", () => {
    const { task } = compile({ kind: "POLICY_SNAPSHOT", policy: "INSPECTION", data: { tryOn: "ORDER_DEPENDENT" } });
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ scope: "INSPECTION", outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] }),
      expect.objectContaining({ scope: "TRY_ON", outcome: "ANSWERED" }),
    ]);
    expect(task.evidence.map(({ value }) => value.policy)).toEqual(["TRY_ON"]);
  });

  it("requires both projected outcomes at final egress instead of counting one policy segment twice", () => {
    const { task } = compile();
    const segments = task.evidence.map((entry) => ({ kind: "VERIFIED_CLAIM" as const,
      text: entry.deterministicText!, claimContentHash: entry.provenance.contentHash }));
    const output = { strategy: "ANSWER_VERIFIED_FACTS" as const, cta: "NONE" as const, segments };
    const hashes = task.evidence.map(({ provenance }) => provenance.contentHash);
    const validate = (candidate: typeof output) => validateResponderOutput(context, candidate,
      "BEHAVIOR_SIMULATION", evaluationAt, hashes, null, [], { task, dialogue });
    expect(() => validate(output)).not.toThrow();
    for (const missing of segments) {
      expect(() => validate({ ...output, segments: segments.filter(({ claimContentHash }) => claimContentHash !== missing.claimContentHash) }))
        .toThrow("TRACK_C_RESPONDER_OBLIGATION_FACT_REQUIRED");
    }
    expect(() => validate({ ...output, segments: [segments[0]!, segments[0]!] }))
      .toThrow("TRACK_C_V5_RESPONDER_PROVENANCE_INVALID");
  });
});
