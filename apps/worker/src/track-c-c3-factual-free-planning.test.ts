import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildTrackCStrategistContractRequest } from "./track-c-c3-strategy-contract-runner.js";
import { compileTrackCStrategistDecision, type TrackCSelectableEvidence, type TrackCRequestedObligation } from "./track-c-c3-strategy-contract.js";
import { materializeTrackCV5CaseCapture } from "./track-c-c3-v5-benchmark-materialization.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";

const root = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", root), "utf8"));
const context = contextFromFrozenTrackCCapture({ evaluationAt: new Date(recipe.evaluation_at),
  capture: materializeTrackCV5CaseCapture({ lane: "BEHAVIOR_SIMULATION", recipe, runtimeClaimCatalog: {},
    fixture: { id: "PLANNING", latest_customer_message: "Thông tin mẫu này?", context: {
      product_binding: { status: "RESOLVED", product_ids: ["ITEM42"] }, phase: "BROWSING",
      canonical_flags: [], source_stage: null, runtime_claim_refs: [],
      buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null },
    } } }),
});
const constraints = { permittedCanonicalActions: ["NONE"] as const,
  measurementsUnavailable: false, productResolved: true, hardStop: false };
const entries: TrackCSelectableEvidence[] = [
  { ref: "P", capability: "PRICE", value: { amountVnd: 799000 }, deterministicText: "Giá 799.000đ." },
  { ref: "S", capability: "STOCK", value: { available: true, quantity: 37 }, deterministicText: "Còn 37 sản phẩm." },
  { ref: "A", capability: "PRODUCT_ATTRIBUTES", value: { materials: ["lụa tơ tằm"] }, deterministicText: "Chất liệu lụa tơ tằm." },
  { ref: "O", capability: "OFFER_CONFIGURATION", value: { offerScope: "FULL_SET", pieceCount: 3 }, deterministicText: "Bộ gồm 3 món." },
].map((entry, index) => ({ ...entry, subject: { productId: "ITEM42" },
  provenance: { authority: "RUNTIME", contentHash: String(index).repeat(64) } })) as TrackCSelectableEvidence[];

describe("factual-free Strategist planning", () => {
  it.each(entries)("exposes selection metadata without factual payload: $capability", (evidence) => {
    const request = buildTrackCStrategistContractRequest({ modelResource: "projects/test/locations/global/publishers/google/models/gemini-3.5-flash-lite",
      context, evaluationContext: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Thông tin mẫu này?", attachmentCount: 0, occurredAt: "2026-09-10T01:59:00.000Z" }], evidence: [evidence], constraints });
    const prompt = JSON.parse(JSON.parse(request.body).contents[0].parts[0].text);
    expect(prompt.selectableEvidence[0]).not.toHaveProperty("value");
    expect(prompt.selectableEvidence[0]).not.toHaveProperty("realizationText");
    expect(prompt.selectableEvidence[0]).toMatchObject({ ref: evidence.ref, capability: evidence.capability, realizationSupported: true });
    const compiled = compileTrackCStrategistDecision({ ...constraints, evidence: [evidence], requireStructuredGoal: true,
      requestedObligations: [{ kind: "FACT_REQUEST", capability: evidence.capability as TrackCRequestedObligation["capability"], productId: "ITEM42", scope: null }],
      decision: { replyAct: "ANSWER", goal: `NEED: request\nKNOWN: NONE\nANSWER: ${evidence.deterministicText}\nLIMIT: NONE\nNEXT: NONE`,
        proposition: evidence.capability, evidenceRefs: [evidence.ref], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" } });
    expect(compiled.decision.goal).not.toContain(evidence.deterministicText);
    expect(compiled.task.answer.goal).not.toContain(evidence.deterministicText);
    expect(JSON.stringify(compiled.task.semanticHandoff)).not.toContain(evidence.deterministicText);
    expect(compiled.task.evidence).toEqual([evidence]);
  });
  it("compiles price plus unsupported attribute without copying literal facts from the model goal", () => {
    const price = entries[0]!;
    const result = compileTrackCStrategistDecision({ ...constraints, evidence: [price], requireStructuredGoal: true,
      requestedObligations: [
        { kind: "FACT_REQUEST", capability: "PRICE", productId: "ITEM42", scope: null },
        { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", productId: "ITEM42", scope: "WRINKLE_RESISTANCE" },
      ], decision: { replyAct: "ANSWER", goal: "NEED: request\nKNOWN: NONE\nANSWER: 799.000đ\nLIMIT: wrinkle resistance unverified\nNEXT: NONE",
        proposition: "PRICE", evidenceRefs: [price.ref], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" } });
    expect(result.decision.goal).not.toContain("799.000");
    expect(result.task.semanticHandoff?.limit).toContain("WRINKLE_RESISTANCE");
    expect(result.task.requiredEvidenceRefs).toEqual([price.ref]);
  });
});
