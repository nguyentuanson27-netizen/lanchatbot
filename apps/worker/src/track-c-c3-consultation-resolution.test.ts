import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { bindRealtimeCustomerInput, customerInputRequestedObligations } from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { assertTrackCResolutionCoverage, trackCObligationOutcomeText } from "./track-c-c3-obligation-resolution.js";
import { compileTrackCStrategistDecision, type TrackCCanonicalAction, type TrackCRequestedObligation,
  type TrackCSelectableEvidence, type TrackCStrategistDecision } from "./track-c-c3-strategy-contract.js";

type Concern = NonNullable<TrackCRequestedObligation["decisionConcern"]>;
const productId = "ITEM42";
const customerText = "Chị đang cân nhắc mẫu này.";

function consultation(concern: Concern, id = "concern", target: string | null = productId): TrackCRequestedObligation {
  return { id, kind: "CONSULTATION", capability: null, scope: null, productId: target,
    decisionConcern: concern, customerText };
}

function fact(ref: string, capability: TrackCSelectableEvidence["capability"], value: TrackCSelectableEvidence["value"],
  subject: TrackCSelectableEvidence["subject"] = { scope: "PRODUCT", productId }): TrackCSelectableEvidence {
  return { ref, capability, value, subject, deterministicText: `Thông tin đã xác nhận cho ${ref}.`,
    provenance: { authority: "RUNTIME", contentHash: createHash("sha256").update(ref).digest("hex") } };
}

const fit = fact("FIT", "SIZE_FIT", { recommendedSizes: ["M"], alternativeSizes: ["L"], evidenceBasis: "verified measurements" });
const inspection = fact("INSPECTION", "POLICY", { policy: "INSPECTION",
  data: { verifyModel: true, verifyColor: true, verifySize: true, tryOn: "ORDER_DEPENDENT" } }, { scope: "SHOP", shopId: "SHOP42" });
const occasion = fact("OCCASION", "PRODUCT_ATTRIBUTES", { occasions: ["đi làm"] });
const comparisonWithSubject = fact("COMPARISON", "PRODUCT_COMPARISON", { productIds: [productId, "ITEM99"],
  differenceVnd: 100_000, cheaperProductId: productId, sourceClaimHashes: ["a".repeat(64), "b".repeat(64)] });
// trackCPriceComparisons represents the pair in value, with no singular subject.
const { subject: _comparisonSubject, ...comparison } = comparisonWithSubject;
const offer = fact("OFFER", "OFFER_CONFIGURATION", { offerScope: "FULL_SET", fullSetVnd: 700_000 });
const price = fact("PRICE", "PRICE", { amountVnd: 700_000 });
const materials = fact("MATERIALS", "PRODUCT_ATTRIBUTES", { materials: ["cotton"] });

function compile(requested: readonly TrackCRequestedObligation[], evidence: readonly TrackCSelectableEvidence[],
  options: Readonly<{ refs?: readonly string[]; continuation?: TrackCStrategistDecision["continuation"];
    canonicalAction?: TrackCCanonicalAction; productResolved?: boolean }> = {}) {
  const canonicalAction = options.canonicalAction ?? "NONE";
  return compileTrackCStrategistDecision({ requestedObligations: requested, evidence, boundProductIds: [productId],
    permittedCanonicalActions: ["NONE", "ASK_PRODUCT", "ASK_MEASUREMENTS"], measurementsUnavailable: false,
    productResolved: options.productResolved ?? true, hardStop: false, requireStructuredGoal: true,
    decision: { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "NONE", evidenceRefs: options.refs ?? [],
      canonicalAction, continuation: options.continuation ?? (canonicalAction === "NONE" ? { type: "KEEP_OPEN" } : null) } }).task;
}

function assignedTexts(task: ReturnType<typeof compile>) {
  return task.obligationResolutions!.flatMap((resolution) => {
    const text = trackCObligationOutcomeText(resolution);
    return text === null ? [] : [{ kind: "GENERAL", obligationId: resolution.obligationId, text }];
  });
}

describe("code-owned useful consultation response", () => {
  it.each([
    ["FIT_RISK", fit], ["TRUST_RISK", inspection], ["USAGE_FREQUENCY", occasion],
    ["PRICE_HESITATION", comparison], ["PRICE_HESITATION", offer],
  ] as const)("preserves eligible verified %s evidence as supported response without claiming concern answered", (concern, evidence) => {
    const task = compile([consultation(concern)], [evidence]);
    expect(task.evidence).toEqual([evidence]);
    expect(task.requiredEvidenceRefs).toEqual([evidence.ref]);
    expect(task.obligationResolutions).toEqual([expect.objectContaining({ obligationId: "concern", kind: "CONSULTATION",
      decisionConcern: concern, status: "SUPPORTED", outcome: "SUPPORTED_RESPONSE",
      evidenceRefs: [{ ref: evidence.ref, contentHash: evidence.provenance.contentHash }] })]);
    expect(task.obligationResolutions![0]!.outcome).not.toBe("ANSWERED");
  });

  it("keeps price alone out of a price-hesitation response while preserving an independent requested price", () => {
    const task = compile([consultation("PRICE_HESITATION"), { id: "price", kind: "FACT_REQUEST", capability: "PRICE",
      scope: null, productId }], [price]);
    expect(task.evidence).toEqual([price]);
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: "concern", outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] }),
      expect.objectContaining({ obligationId: "price", outcome: "ANSWERED", evidenceRefs: [{ ref: price.ref,
        contentHash: price.provenance.contentHash }] }),
    ]);
  });

  it.each(["FIT_RISK", "TRUST_RISK", "USAGE_FREQUENCY", "PRICE_HESITATION", "DECISION_CRITERION_UNKNOWN"] as const)(
    "does not infer a relevant %s relation from a generic material fact or raw customer wording", (concern) => {
      const task = compile([{ ...consultation(concern), customerText: "Chị lo vừa người, muốn đi làm thường xuyên và yên tâm mua online." }],
        [materials, price]);
      expect(task.evidence).toEqual([]);
      expect(task.obligationResolutions![0]).toEqual(expect.objectContaining({ outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] }));
      expect(() => compile([consultation(concern)], [materials], { refs: [materials.ref] }))
        .toThrow("TRACK_C_STRATEGIST_REQUEST_SCOPE_INVALID");
    });

  it("does not apply a different product's fit proof or unrelated payment policy to the consultation", () => {
    const otherFit = { ...fit, subject: { scope: "PRODUCT" as const, productId: "ITEM99" } };
    const payment = fact("PAYMENT", "POLICY", { policy: "PAYMENT", data: { methods: ["COD"] } }, { scope: "SHOP" });
    const task = compile([consultation("FIT_RISK", "fit"), consultation("TRUST_RISK", "trust")], [otherFit, payment]);
    expect(task.evidence).toEqual([]);
    expect(task.obligationResolutions?.map(({ obligationId, outcome }) => ({ obligationId, outcome }))).toEqual([
      { obligationId: "fit", outcome: "BOUNDED_UNAVAILABLE" }, { obligationId: "trust", outcome: "BOUNDED_UNAVAILABLE" },
    ]);
  });

  it("does not use a verified price comparison when the consulted product is absent from its pair", () => {
    const otherPair = { ...comparison, value: { ...comparison.value, productIds: ["ITEM98", "ITEM99"], cheaperProductId: "ITEM98" } };
    const task = compile([consultation("PRICE_HESITATION")], [otherPair]);
    expect(task.evidence).toEqual([]);
    expect(task.obligationResolutions![0]).toEqual(expect.objectContaining({ outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] }));
  });

  it.each(["PRICE_HESITATION", "TRUST_RISK", "USAGE_FREQUENCY", "DECISION_CRITERION_UNKNOWN"] as const)(
    "records one permitted decision-criterion clarification for %s without adding shop facts", (concern) => {
      const task = compile([consultation(concern)], [materials], { continuation: { type: "ASK", input: "DECISION_CRITERION" } });
      expect(task.evidence).toEqual([]);
      expect(task.continuation).toEqual({ type: "ASK", input: "DECISION_CRITERION" });
      expect(task.obligationResolutions![0]).toEqual(expect.objectContaining({ outcome: "ASK_REQUIRED_INPUT", evidenceRefs: [] }));
      expect(task.obligationResolutions![0]!.outcome).not.toBe("ANSWERED");
    });

  it("allows a canonical missing-measurement request for fit risk without substituting purchase size", () => {
    const task = compile([consultation("FIT_RISK")], [], { canonicalAction: "ASK_MEASUREMENTS" });
    expect(task.canonicalRequest).toEqual({ type: "ASK_MEASUREMENTS", measurementFields: ["HEIGHT_CM", "WEIGHT_KG"] });
    expect(task.obligationResolutions![0]).toEqual(expect.objectContaining({ outcome: "ASK_REQUIRED_INPUT", evidenceRefs: [] }));
    const sizeTask = compile([consultation("FIT_RISK")], [], { continuation: { type: "ASK", input: "SIZE" } });
    expect(sizeTask.obligationResolutions![0]!.outcome).toBe("BOUNDED_UNAVAILABLE");
  });

  it("does not mark either concern clarified by an unrelated color question", () => {
    const task = compile([consultation("PRICE_HESITATION", "price"), consultation("USAGE_FREQUENCY", "usage")], [],
      { continuation: { type: "ASK", input: "COLOR" } });
    expect(task.obligationResolutions?.map(({ outcome }) => outcome)).toEqual(["BOUNDED_UNAVAILABLE", "BOUNDED_UNAVAILABLE"]);
  });

  it("requires eligible factual hashes at final coverage and rejects promoting a supported response to ANSWERED", () => {
    const task = compile([consultation("FIT_RISK")], [fit]);
    expect(task.requiredEvidenceRefs).toEqual([fit.ref]);
    const text = assignedTexts(task);
    const factual = { kind: "VERIFIED_CLAIM", text: fit.deterministicText!, claimContentHash: fit.provenance.contentHash };
    expect(() => assertTrackCResolutionCoverage(task, [productId], [...text, factual])).not.toThrow();
    expect(() => assertTrackCResolutionCoverage(task, [productId], text)).toThrow("TRACK_C_RESPONDER_OBLIGATION_FACT_REQUIRED");
    const tampered = { ...task, obligationResolutions: [{ ...task.obligationResolutions![0]!, outcome: "ANSWERED" as const }] };
    expect(() => assertTrackCResolutionCoverage(tampered, [productId], [...text, factual])).toThrow("TRACK_C_OBLIGATION_RESOLUTION_INVALID");
  });

  it("uses the code comparison's paired productIds without requiring a fabricated single-product subject", () => {
    const paired: TrackCSelectableEvidence = comparison;
    const task = compile([consultation("PRICE_HESITATION")], [paired]);
    expect(task.requiredEvidenceRefs).toEqual([paired.ref]);
    expect(task.obligationResolutions![0]!.outcome).toBe("SUPPORTED_RESPONSE");
    const unrelated = { ...paired, value: { ...paired.value, productIds: ["ITEM98", "ITEM99"] } };
    expect(compile([consultation("PRICE_HESITATION")], [unrelated]).evidence).toEqual([]);
  });

  it("rejects a consultation subject outside the code-owned binding before factual evidence selection", () => {
    expect(() => compile([consultation("FIT_RISK", "fit", "ITEM99")], [fit]))
      .toThrow("TRACK_C_REQUESTED_OBLIGATION_BINDING_INVALID");
  });

  it("requires the one assigned clarification to reach final output rather than treating a labeled concern as complete", () => {
    const task = compile([consultation("USAGE_FREQUENCY")], [], { continuation: { type: "ASK", input: "DECISION_CRITERION" } });
    expect(task.obligationResolutions![0]!.outcome).toBe("ASK_REQUIRED_INPUT");
    const text = assignedTexts(task);
    expect(() => assertTrackCResolutionCoverage(task, [productId], [...text,
      { kind: "GENERAL", text: "Chị dự định mặc mẫu này vào những dịp nào ạ?" }])).not.toThrow();
    expect(() => assertTrackCResolutionCoverage(task, [productId], text)).toThrow("TRACK_C_RESPONDER_REQUIRED_INPUT_REQUIRED");
  });

  it("keeps consultation source validation and privacy at the existing Producer-to-request boundary", () => {
    const source = "Chị lo mua online, số chị 0901234567.";
    const bound = bindRealtimeCustomerInput({ ...noCustomerSelection(), obligations: [{ kind: "CONSULTATION",
      capability: null, scope: null, productId: null, evidenceText: source, decisionConcern: "TRUST_RISK" }] }, source);
    const requested = customerInputRequestedObligations(bound, [productId]);
    expect(requested[0]).toEqual(expect.objectContaining({ lookupStatus: "FAILED" }));
    expect(requested[0]).not.toHaveProperty("customerText");
    expect(JSON.stringify(requested)).not.toContain("0901234567");
    const task = compile(requested, [inspection], { continuation: { type: "ASK", input: "DECISION_CRITERION" } });
    expect(task.evidence).toEqual([]);
    expect(task.obligationResolutions![0]).toEqual(expect.objectContaining({ status: "FAILED", outcome: "BOUNDED_UNAVAILABLE" }));
  });
});
