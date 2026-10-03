import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bindRealtimeCustomerInput } from "./realtime-customer-input.js";
import { inputDelta } from "./realtime-c3-deterministic.fixture.js";
import { assertTrackCResolutionCoverage, trackCOutcomeTexts } from "./track-c-c3-obligation-resolution.js";
import { compileTrackCStrategistDecision, type TrackCResponderTask } from "./track-c-c3-strategy-contract.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";
import { materializeTrackCV5CaseCapture } from "./track-c-c3-v5-benchmark-materialization.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";

const root = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", root), "utf8"));
const at = new Date(recipe.evaluation_at);
const context = contextFromFrozenTrackCCapture({ evaluationAt: at, capture: materializeTrackCV5CaseCapture({
  lane: "BEHAVIOR_SIMULATION", recipe, runtimeClaimCatalog: {}, fixture: { id: "TOTAL_COVERAGE", latest_customer_message: "Thông tin mẫu này?",
    context: { product_binding: { status: "RESOLVED", product_ids: ["ITEM42"] }, phase: "BROWSING",
      canonical_flags: [], source_stage: null, runtime_claim_refs: [],
      buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null } } } }),
});
const compile = (patch: Partial<Parameters<typeof compileTrackCStrategistDecision>[0]> = {}) => compileTrackCStrategistDecision({
  evidence: [], requestedObligations: [{ id: "wrinkle", kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "WRINKLE_RESISTANCE", productId: "ITEM42" }],
  boundProductIds: ["ITEM42"], permittedCanonicalActions: ["NONE"], productResolved: true, measurementsUnavailable: false, hardStop: false,
  requireStructuredGoal: true, decision: { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "PRODUCT_ATTRIBUTES",
    evidenceRefs: [], canonicalAction: "NONE", continuation: { type: "KEEP_OPEN" } }, ...patch,
}).task;

describe("D3 two-way final coverage", () => {
  it.each(["missing", "duplicate", "unknown", "promoted"])("rejects %s coverage instead of accepting a fact-free reply", (mode) => {
    const task = compile();
    const rows = task.obligationResolutions!;
    const corrupt: TrackCResponderTask = mode === "missing" ? { ...task, obligationResolutions: [] }
      : mode === "duplicate" ? { ...task, obligationResolutions: [rows[0]!, rows[0]!] }
      : mode === "unknown" ? { ...task, obligationResolutions: [{ ...rows[0]!, obligationId: "invented" }] }
      : { ...task, obligationResolutions: [{ ...rows[0]!, outcome: "ANSWERED", status: "SUPPORTED", limitation: null }] };
    expect(() => assertTrackCResolutionCoverage(corrupt, ["ITEM42"], [])).toThrow("TRACK_C_OBLIGATION_RESOLUTION_INVALID");
  });
  it("rejects removal of the entire coverage field", () => {
    const { obligationResolutions: _removed, ...task } = compile();
    expect(() => assertTrackCResolutionCoverage(task, ["ITEM42"], [])).toThrow("TRACK_C_OBLIGATION_RESOLUTION_INVALID");
  });
  it("maps the exact bounded outcome to coverage and rejects omission, negative fact and effect", () => {
    const task = compile();
    const validate = (texts: readonly string[]) => validateResponderOutput(context,
      { segments: texts.map((text) => ({ kind: "GENERAL", text })), strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE" },
      "PRODUCTION_CONTRACT", at, [], null, [], { task, dialogue: [] });
    expect(() => validate(trackCOutcomeTexts(task))).not.toThrow();
    for (const texts of [[], ["Mẫu ITEM42 không chống nhăn."], [...trackCOutcomeTexts(task), "Shop đã gửi hàng hôm nay."]]) {
      expect(() => validate(texts)).toThrow();
    }
  });
  it("retains component subjects in independent unsupported stock outcomes", () => {
    const task = compile({ requestedObligations: ["TOP", "BOTTOM"].map((component) => ({ id: component,
      kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: "ITEM42", size: "M", component: component as "TOP" | "BOTTOM" })) });
    expect(new Set(trackCOutcomeTexts(task)).size).toBe(2);
  });
  it("derives required measurement input from the canonical request and checks its realization", () => {
    const task = compile({ requestedObligations: [{ id: "fit", kind: "FACT_REQUEST", capability: "SIZE_FIT", scope: null, productId: "ITEM42" }],
      permittedCanonicalActions: ["ASK_MEASUREMENTS"], measurementRequestedFields: ["WAIST_CM"], measurementsUnavailable: true,
      decision: { replyAct: "CLARIFY", goal: "TYPED_DECISION", proposition: "SIZE_FIT", evidenceRefs: [], canonicalAction: "ASK_MEASUREMENTS", continuation: null } });
    expect(task.obligationResolutions).toEqual([expect.objectContaining({ obligationId: "fit", outcome: "ASK_REQUIRED_INPUT", limitation: null })]);
    expect(task.semanticHandoff?.limit).toBeNull();
    expect(() => assertTrackCResolutionCoverage(task, ["ITEM42"], [])).toThrow();
    expect(() => assertTrackCResolutionCoverage(task, ["ITEM42"], [{ kind: "CLARIFICATION", text: "Chị cho em số đo eo nhé.", target: "MEASUREMENTS" }])).not.toThrow();
  });
  it("does not infer a false limitation from a different proposition label", () => {
    const evidence = { ref: "waist", capability: "PRODUCT_ATTRIBUTES" as const, subject: { productId: "ITEM42" },
      value: { "design.waist": ["cạp chun"] }, deterministicText: "Cạp chun.", provenance: { contentHash: "a".repeat(64), authority: "RUNTIME" as const } };
    const task = compile({ evidence: [evidence], requestedObligations: [{ id: "waist", kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "WAIST_CONSTRUCTION", productId: "ITEM42" }],
      decision: { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "PRICE", evidenceRefs: [], canonicalAction: "NONE", continuation: { type: "KEEP_OPEN" } } });
    expect(task.obligationResolutions?.[0]?.outcome).toBe("ANSWERED");
    expect(task.semanticHandoff?.limit).toBeNull();
  });
  it("does not map an exchange policy to split-size or alteration permission", () => {
    const exchange = { ref: "exchange", capability: "POLICY" as const, subject: { scope: "SHOP" as const },
      value: { policy: "EXCHANGE" }, deterministicText: "Đổi size được theo chính sách.",
      provenance: { contentHash: "e".repeat(64), authority: "RUNTIME" as const } };
    for (const scope of ["SPLIT_SIZE", "ALTERATION"] as const) {
      const obligation = { id: scope, kind: "FACT_REQUEST" as const, capability: "POLICY" as const, scope, productId: null };
      expect(trackCObligationMatchesEvidence(obligation, exchange)).toBe(false);
      const { id: _codeId, ...source } = obligation;
      expect(() => bindRealtimeCustomerInput({ ...bindRealtimeCustomerInput(inputDelta(), ""),
        obligations: [{ ...source, evidenceText: "câu hỏi" }] }, "câu hỏi")).not.toThrow();
    }
  });
  it("allows code-owned split policy evidence only for its own policy scope", () => {
    const evidence = { ref: "split", capability: "POLICY" as const, subject: { scope: "SHOP" as const },
      value: { allowMixedSizes: true }, deterministicText: "Cho phép phối size.",
      provenance: { contentHash: "f".repeat(64), authority: "RUNTIME" as const } };
    const obligation = { id: "split", kind: "FACT_REQUEST" as const, capability: "POLICY" as const, scope: "SPLIT_SIZE" as const, productId: null };
    expect(trackCObligationMatchesEvidence(obligation, evidence)).toBe(true);
  });
  it.each<{ text: string; extra: Record<string, unknown> }>([
    { text: "Size S còn không?", extra: { size: "L" } },
    { text: "Chị cần trong 5 ngày.", extra: { deadlineDays: 2 } },
    { text: "Tìm dáng suông.", extra: { criteria: { shape: "ôm", avoid: [] } } },
  ])("rejects fabricated customer qualifiers bound to $text", ({ text, extra }) => {
    const request = "criteria" in extra ? { kind: "PRODUCT_SEARCH", capability: null, scope: null }
      : "deadlineDays" in extra ? { kind: "FACT_REQUEST", capability: "ETA", scope: "DELIVERY_DEADLINE" }
      : { kind: "FACT_REQUEST", capability: "STOCK", scope: null };
    expect(() => bindRealtimeCustomerInput({ ...bindRealtimeCustomerInput(inputDelta(), ""),
      obligations: [{ ...request, productId: null, evidenceText: text, ...extra }] }, text)).toThrow();
  });
});
