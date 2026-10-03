import { describe, expect, it } from "vitest";
import {
  compileTrackCStrategistDecision,
  type TrackCRequestedObligation,
  type TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";

const silhouette = {
  id: "current:silhouette", kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
  scope: "SILHOUETTE", productId: "ITEM42",
} as const satisfies TrackCRequestedObligation;
const silhouetteFacts = [
  { ref: "SHAPE", capability: "PRODUCT_ATTRIBUTES", subject: { productId: "ITEM42" },
    value: { silhouettes: ["LOOSE"] }, deterministicText: "Mẫu ITEM42 có phom rộng.",
    provenance: { contentHash: "a".repeat(64), authority: "RUNTIME" } },
  { ref: "DESIGN_SHAPE", capability: "PRODUCT_ATTRIBUTES", subject: { productId: "ITEM42" },
    value: { "design.silhouette": ["STRAIGHT"] }, deterministicText: "Mẫu ITEM42 có dáng suông.",
    provenance: { contentHash: "b".repeat(64), authority: "RUNTIME" } },
] as const satisfies readonly TrackCSelectableEvidence[];
const price = {
  ref: "PRICE", capability: "PRICE", subject: { productId: "ITEM42" },
  value: { amountVnd: 725_000 }, deterministicText: "Mẫu ITEM42 giá 725.000đ.",
  provenance: { contentHash: "c".repeat(64), authority: "RUNTIME" },
} as const satisfies TrackCSelectableEvidence;
const nonFactObligationSets: readonly (readonly TrackCRequestedObligation[])[] = [
  [], [{ id: "current:reject", kind: "PRODUCT_REJECT", capability: null, scope: null, productId: "ITEM42" }],
];

function compile(evidenceRefs: readonly string[], requestedObligations: readonly TrackCRequestedObligation[] | null = [silhouette],
  evidence: readonly TrackCSelectableEvidence[] = silhouetteFacts) {
  return compileTrackCStrategistDecision({
    evidence, boundProductIds: ["ITEM42"], permittedCanonicalActions: ["NONE"],
    productResolved: true, measurementsUnavailable: false, hardStop: false, requireStructuredGoal: true,
    ...(requestedObligations === null ? {} : { requestedObligations }),
    decision: { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "PRODUCT_ATTRIBUTES",
      evidenceRefs, continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" },
  });
}

describe("compiler owns complete explicit factual coverage; Strategist refs own ordering", () => {
  it.each([[], ["SHAPE"], ["DESIGN_SHAPE"], ["SHAPE", "DESIGN_SHAPE"]].map((refs) => ({ refs })))(
    "includes every matching factual field independently of focus refs $refs", ({ refs }) => {
      const result = compile(refs);
      expect(new Set(result.task.evidence.map(({ ref }) => ref))).toEqual(new Set(["SHAPE", "DESIGN_SHAPE"]));
      expect(new Set(result.task.requiredEvidenceRefs)).toEqual(new Set(["SHAPE", "DESIGN_SHAPE"]));
      expect(result.task.obligationResolutions).toEqual([
        expect.objectContaining({ obligationId: silhouette.id, outcome: "ANSWERED", status: "SUPPORTED",
          evidenceRefs: expect.arrayContaining(silhouetteFacts.map(({ ref, provenance }) => ({ ref, contentHash: provenance.contentHash }))) }),
      ]);
      expect(Object.keys(result.decision).sort()).toEqual([
        "canonicalAction", "continuation", "evidenceRefs", "goal", "proposition", "replyAct",
      ]);
    },
  );

  it("orders the complete code-owned facts using the permitted focus prefix", () => {
    expect(compile(["DESIGN_SHAPE"]).task.evidence.map(({ ref }) => ref)).toEqual(["DESIGN_SHAPE", "SHAPE"]);
    expect(compile([]).task.evidence.map(({ ref }) => ref)).toEqual(["SHAPE", "DESIGN_SHAPE"]);
  });

  it("does not let a model omit a matching field whose projection is unavailable", () => {
    const hidden: TrackCSelectableEvidence = { ref: "DESIGN_SHAPE_UNREALIZABLE", capability: "PRODUCT_ATTRIBUTES",
      subject: { productId: "ITEM42" }, value: { "design.silhouette": ["UNKNOWN_PROJECTION"] },
      provenance: { contentHash: "d".repeat(64), authority: "RUNTIME" } };
    const result = compile(["SHAPE"], [silhouette], [silhouetteFacts[0], hidden]);
    expect(result.task.evidence).toEqual([silhouetteFacts[0]]);
    expect(result.task.unrealizedEvidence).toEqual([{ ref: hidden.ref, capability: hidden.capability }]);
    expect(result.task.requiredEvidenceRefs).toEqual(["SHAPE"]);
  });

  it.each(nonFactObligationSets.map((obligations) => ({ obligations })))(
    "does not grant unrelated factual authority for explicit non-factual obligations $obligations", ({ obligations }) => {
      expect(() => compile(["PRICE"], obligations, [price]))
        .toThrow("TRACK_C_STRATEGIST_REQUEST_SCOPE_INVALID");
      expect(compile([], obligations, [price]).task.evidence).toEqual([]);
    },
  );

  it("rejects a known fact that answers another capability or another product", () => {
    expect(() => compile(["PRICE"], [silhouette], [...silhouetteFacts, price]))
      .toThrow("TRACK_C_STRATEGIST_REQUEST_SCOPE_INVALID");
    const otherProduct: TrackCSelectableEvidence = { ...silhouetteFacts[0], ref: "OTHER_PRODUCT",
      subject: { productId: "ITEM99" } };
    expect(() => compile([otherProduct.ref], [silhouette], [...silhouetteFacts, otherProduct]))
      .toThrow("TRACK_C_EVIDENCE_BINDING_INVALID");
  });

  it.each([["UNKNOWN"], ["SHAPE", "SHAPE"]].map((refs) => ({ refs })))("rejects invalid model ordering refs $refs", ({ refs }) => {
    expect(() => compile(refs)).toThrow("TRACK_C_STRATEGIST_EVIDENCE_INVALID");
  });

  it("fails closed on duplicate provenance within the code-owned mandatory facts", () => {
    const duplicate: TrackCSelectableEvidence = { ...silhouetteFacts[0], ref: "SHAPE_DUPLICATE" };
    expect(() => compile([], [silhouette], [silhouetteFacts[0], duplicate]))
      .toThrow("TRACK_C_EVIDENCE_PROVENANCE_DUPLICATE");
  });

  it("retains evidence selection compatibility when explicit obligations are absent", () => {
    const result = compile(["SHAPE"], null);
    expect(result.task.evidence).toEqual([silhouetteFacts[0]]);
    expect(result.task.obligationResolutions).toBeUndefined();
    expect(result.task.requestedObligations).toBeUndefined();
  });

  it("carries a typed consultation need and its bounded outcome into semantic handoff", () => {
    const concern: TrackCRequestedObligation = { id: "current:concern", kind: "CONSULTATION", capability: null,
      scope: null, productId: "ITEM42", decisionConcern: "TRUST_RISK", customerText: "Chị đang ngại mua online." };
    const result = compile([], [concern], []);
    expect(result.task.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: concern.id, decisionConcern: "TRUST_RISK", outcome: "BOUNDED_UNAVAILABLE" }),
    ]);
    expect(result.task.semanticHandoff).toMatchObject({ need: "CONSULTATION/TRUST_RISK",
      answer: null, limit: "CONSULTATION/TRUST_RISK unsupported" });
    expect(JSON.stringify(result.task.semanticHandoff)).not.toContain(concern.customerText);
  });

  it("preserves factual, consultation, rejection and search needs in the same handoff", () => {
    const obligations: readonly TrackCRequestedObligation[] = [
      { id: "current:price", kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "ITEM42" },
      { id: "current:usage", kind: "CONSULTATION", capability: null, scope: null,
        productId: "ITEM42", decisionConcern: "USAGE_FREQUENCY" },
      { id: "current:rejection", kind: "PRODUCT_REJECT", capability: null, scope: null, productId: "ITEM42" },
      { id: "current:search", kind: "PRODUCT_SEARCH", capability: null, scope: null, productId: "ITEM42" },
    ];
    const result = compile([], obligations, [price]);
    expect(result.task.semanticHandoff).toMatchObject({
      need: "PRICE; CONSULTATION/USAGE_FREQUENCY; PRODUCT_REJECT; PRODUCT_SEARCH",
      answer: "PRICE supported", limit: "CONSULTATION/USAGE_FREQUENCY unsupported; PRODUCT_SEARCH unsupported",
    });
    expect(result.task.obligationResolutions?.map(({ obligationId }) => obligationId)).toEqual(obligations.map(({ id }) => id));
  });
});
