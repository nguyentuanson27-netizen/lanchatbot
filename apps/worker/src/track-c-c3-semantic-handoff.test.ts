import { describe, expect, it } from "vitest";
import { buildProductAttributesV1 } from "@lana/business-tools";
import { trackCProductAttributeEvidence } from "./track-c-c3-attribute-projection.js";
import { compileTrackCStrategistDecision, type TrackCSelectableEvidence } from "./track-c-c3-strategy-contract.js";

const price: TrackCSelectableEvidence = {
  ref: "PRICE_CURRENT", capability: "PRICE", subject: { productId: "ITEM42" },
  value: { amountVnd: 725000 }, deterministicText: "Gi\u00e1 725.000\u0111.",
  provenance: { contentHash: "b".repeat(64), authority: "RUNTIME" },
};
const goal = ["NEED: price and wrinkle resistance", "KNOWN: NONE", "ANSWER: current price",
  "LIMIT: wrinkle resistance has no verified evidence", "NEXT: NONE"].join("\n");
const input = {
  decision: { replyAct: "ANSWER", goal, proposition: "PRICE", evidenceRefs: [price.ref],
    continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" },
  evidence: [price], permittedCanonicalActions: ["NONE"] as const,
  measurementsUnavailable: false, productResolved: true, hardStop: false,
  requireStructuredGoal: true,
};

describe("C3 structured goal semantic handoff", () => {
  it("preserves supported and unsupported parts without enlarging the six-field decision", () => {
    const result = compileTrackCStrategistDecision(input);
    expect(Object.keys(result.decision).sort()).toEqual([
      "canonicalAction", "continuation", "evidenceRefs", "goal", "proposition", "replyAct",
    ]);
    expect(result.task.semanticHandoff).toEqual({
      need: "price and wrinkle resistance", known: null, answer: "current price",
      limit: "wrinkle resistance has no verified evidence", next: null,
    });
    expect(result.task.evidence).toEqual([price]);
    expect(result.task.requiredEvidenceRefs).toEqual([price.ref]);
    expect(result.task.answer).toMatchObject({ evidenceStatus: "SUPPORTED" });
    expect(result.task.canonicalRequest).toBeNull();
  });

  it.each([
    "Answer the price and limit the unsupported part.",
    goal.replace("KNOWN: NONE\n", ""),
    goal.replace("KNOWN: NONE", "NEED: another need"),
    goal.replace("NEED: price and wrinkle resistance", "NEED: NONE"),
    goal.replace("LIMIT: wrinkle resistance has no verified evidence", "LIMIT: "),
    goal + "\nNEXT: ask a new question",
  ])("rejects malformed semantic handoff rather than making the writer infer it: %s", (invalid) => {
    expect(() => compileTrackCStrategistDecision({ ...input, decision: { ...input.decision, goal: invalid } }))
      .toThrow("TRACK_C_STRATEGIST_GOAL_INVALID");
  });

  it("requires a limitation for an unsupported terminal factual request", () => {
    const unsupported = { ...input, decision: { ...input.decision, evidenceRefs: [],
      proposition: "PRODUCT_ATTRIBUTES", goal: goal.replace("ANSWER: current price", "ANSWER: NONE") } };
    expect(compileTrackCStrategistDecision(unsupported).task.answer).toMatchObject({ evidenceStatus: "UNRESOLVED" });
    expect(() => compileTrackCStrategistDecision({ ...unsupported, decision: {
      ...unsupported.decision, goal: unsupported.decision.goal.replace("LIMIT: wrinkle resistance has no verified evidence", "LIMIT: NONE"),
    } })).toThrow("TRACK_C_STRATEGIST_GOAL_INVALID");
  });

  it("requires NEXT to agree with the single compiled request, not authorize it", () => {
    const nextGoal = goal.replace("NEXT: NONE", "NEXT: locality changes the available ETA lookup");
    const ask = { ...input.decision, continuation: { type: "ASK", input: "LOCALITY" }, goal: nextGoal };
    expect(compileTrackCStrategistDecision({ ...input, decision: ask }).task.continuation)
      .toEqual({ type: "ASK", input: "LOCALITY" });
    expect(() => compileTrackCStrategistDecision({ ...input, decision: { ...ask, goal } }))
      .toThrow("TRACK_C_STRATEGIST_GOAL_INVALID");
    expect(() => compileTrackCStrategistDecision({ ...input, decision: { ...input.decision, goal: nextGoal } }))
      .toThrow("TRACK_C_STRATEGIST_GOAL_INVALID");
  });

  it("redacts planning PII before splitting and never promotes goal text to commercial authority", () => {
    const unsafe = goal.replace("KNOWN: NONE", "KNOWN: contact 0901234567")
      .replace("ANSWER: current price", "ANSWER: shop approved an invented discount");
    const result = compileTrackCStrategistDecision({ ...input, decision: { ...input.decision, goal: unsafe } });
    expect(JSON.stringify(result)).not.toContain("0901234567");
    expect(result.task.semanticHandoff?.known).not.toBeNull();
    expect(result.task.evidence).toEqual([price]);
    expect(result.task.canonicalRequest).toBeNull();
    expect(result.task.continuation).toEqual({ type: "KEEP_OPEN" });
  });

  it.each(["ASK_CHECKOUT_DETAILS", "HOLD_POSITION"] as const)(
    "rejects a limitation that the %s prose slots cannot realize", (action) => {
      const next = action === "ASK_CHECKOUT_DETAILS" ? "checkout fields enable the transaction" : "NONE";
      const closed = { ...input, decision: { ...input.decision, replyAct: "ACKNOWLEDGE",
        proposition: "NONE", evidenceRefs: [], continuation: null, canonicalAction: action,
        goal: ["NEED: canonical request", "KNOWN: NONE", "ANSWER: NONE", "LIMIT: NONE", `NEXT: ${next}`].join("\n") },
        permittedCanonicalActions: [action], checkoutRequestedFields: ["PHONE"] as const,
      };
      expect(compileTrackCStrategistDecision(closed).task.canonicalRequest?.type).toBe(action);
      expect(() => compileTrackCStrategistDecision({ ...closed, decision: {
        ...closed.decision, goal: closed.decision.goal.replace("LIMIT: NONE", "LIMIT: an unanswered shop property"),
      } })).toThrow("TRACK_C_STRATEGIST_GOAL_INVALID");
    },
  );

  it("keeps code-owned non-model task callers source-compatible", () => {
    expect(compileTrackCStrategistDecision({ ...input, requireStructuredGoal: false,
      decision: { ...input.decision, goal: "Code-owned fixed-lane task." } }).task.semanticHandoff).toBeUndefined();
  });
  it("uses typed obligations to reject the wrong product-attribute scope without reading goal prose", () => {
    const attributes = buildProductAttributesV1({ productId: "ITEM42", observedAt: "2026-09-10T02:00:00Z",
      data: { materials: ["lụa mềm mịn"], materialComponents: {}, colors: [], styles: [],
        silhouettes: [], occasions: [], designAttributes: null, careInstructions: null,
        wearProperties: { stretch: null, wrinkleResistance: "REDUCED_WRINKLING", opacity: null,
          lining: null, breathability: null }, backCoverage: null, designComplexity: null } });
    const fields = trackCProductAttributeEvidence({ attributes, refPrefix: "ATTR", authority: "RUNTIME" });
    const material = fields.find(({ value }) => "materials" in value)!;
    const wrinkle = fields.find(({ value }) => "wearWrinkleResistance" in value)!;
    const requestedObligations = [{
      kind: "FACT_REQUEST" as const, capability: "PRODUCT_ATTRIBUTES" as const,
      scope: "WRINKLE_RESISTANCE", productId: "ITEM42",
    }];
    const base = { ...input, evidence: [price, ...fields], requestedObligations,
      decision: { ...input.decision, proposition: "PRODUCT_ATTRIBUTES",
        goal: goal.replace("ANSWER: current price", "ANSWER: requested product attribute")
          .replace("LIMIT: wrinkle resistance has no verified evidence", "LIMIT: NONE") } };
    expect(compileTrackCStrategistDecision({ ...base, decision: {
      ...base.decision, evidenceRefs: [wrinkle.ref],
    } }).task.evidence).toEqual([wrinkle]);
    expect(() => compileTrackCStrategistDecision({ ...base, decision: {
      ...base.decision, evidenceRefs: [material.ref],
    } })).toThrow("TRACK_C_STRATEGIST_REQUEST_SCOPE_INVALID");
  });

  it("cannot mark wrinkle resistance answered by a smooth material field", () => {
    const attributes = buildProductAttributesV1({ productId: "ITEM42", observedAt: "2026-09-10T02:00:00Z",
      data: { materials: ["lụa mềm mịn"], materialComponents: {}, colors: [], styles: [],
        silhouettes: [], occasions: [], designAttributes: null, careInstructions: null,
        wearProperties: { stretch: null, wrinkleResistance: "REDUCED_WRINKLING", opacity: null,
          lining: null, breathability: null }, backCoverage: null, designComplexity: null } });
    const fields = trackCProductAttributeEvidence({ attributes, refPrefix: "ATTR", authority: "RUNTIME" });
    const material = fields.find(({ value }) => "materials" in value)!;
    const wrinkle = fields.find(({ value }) => "wearWrinkleResistance" in value)!;
    const selected = { ...input, evidence: [price, ...fields], decision: { ...input.decision,
      goal: goal.replace("LIMIT: wrinkle resistance has no verified evidence", "LIMIT: NONE"),
      evidenceRefs: [price.ref, wrinkle.ref] } };
    const good = compileTrackCStrategistDecision(selected);
    expect(good.task.evidence).toEqual([price, wrinkle]);
    expect(good.task.canonicalRequest).toBeNull();
    for (const refs of [[price.ref, material.ref], [price.ref]]) {
      expect(() => compileTrackCStrategistDecision({ ...selected, decision: { ...selected.decision,
        evidenceRefs: refs } })).toThrow("TRACK_C_STRATEGIST_REQUEST_COVERAGE_INVALID");
    }
    // The same independent price is retained when the limitation is explicit.
    expect(compileTrackCStrategistDecision({ ...selected, decision: { ...selected.decision,
      goal, evidenceRefs: [price.ref] } }).task.evidence).toEqual([price]);
  });

});
