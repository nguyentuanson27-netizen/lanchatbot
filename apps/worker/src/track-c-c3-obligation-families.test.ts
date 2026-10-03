import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildProductAttributesV1 } from "@lana/business-tools";
import type { RealtimeCustomerObligationV1 } from "@lana/contracts";
import { applyCustomerDecisionInput, bindRealtimeCustomerInput, customerInputObligations } from "./realtime-customer-input.js";
import { inputDelta } from "./realtime-c3-deterministic.fixture.js";
import { trackCProductAttributeEvidence } from "./track-c-c3-attribute-projection.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";
import { assertTrackCResolutionCoverage } from "./track-c-c3-obligation-resolution.js";
import {
  compileTrackCFixedFirstContactTask,
  compileTrackCStrategistDecision,
  type TrackCRequestedObligation,
  type TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";

function fact(ref: string, capability: TrackCSelectableEvidence["capability"],
  value: TrackCSelectableEvidence["value"],
  subject: TrackCSelectableEvidence["subject"] | null = { productId: "ITEM42" }): TrackCSelectableEvidence {
  return { ref, capability, value, ...(subject === undefined || subject === null ? {} : { subject }),
    deterministicText: `Verified ${ref}.`,
    provenance: { contentHash: createHash("sha256").update(ref).digest("hex"), authority: "RUNTIME" } };
}

function compile(requested: readonly TrackCRequestedObligation[], evidence: readonly TrackCSelectableEvidence[],
  refs: readonly string[] = evidence.map(({ ref }) => ref), boundProductIds: readonly string[] = ["ITEM42"],
  proposition: TrackCSelectableEvidence["capability"] = requested[0]?.capability ?? "NONE") {
  return compileTrackCStrategistDecision({ requestedObligations: requested, evidence, boundProductIds,
    permittedCanonicalActions: ["NONE"], measurementsUnavailable: false, productResolved: true,
    hardStop: false, requireStructuredGoal: true,
    decision: { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition, evidenceRefs: refs,
      continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" } }).task;
}

const price = fact("PRICE_A", "PRICE", { amountVnd: 725_000 });
const colors = fact("COLORS_A", "PRODUCT_ATTRIBUTES", { colors: ["đen", "kem"] });
const firstContact: readonly TrackCRequestedObligation[] = [
  { id: "price", kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "ITEM42" },
  { id: "black", kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "COLORS",
    productId: "ITEM42", color: "đen" },
];

const extractionFamilies: readonly Readonly<{ name: string; text: string;
  obligations: readonly RealtimeCustomerObligationV1[] }>[] = [
  { name: "price and color", text: "Giá bao nhiêu? Có màu đen không?", obligations: [
    { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: null, evidenceText: "Giá bao nhiêu?" },
    { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "COLORS", productId: null,
      color: "đen", evidenceText: "Có màu đen không?" },
  ] },
  { name: "conditional customer offer", text: "690k thì chị lấy.", obligations: [
    { kind: "FACT_REQUEST", capability: "PROMOTION_OFFER", scope: "CUSTOMER_OFFER", productId: null,
      evidenceText: "690k thì chị lấy." },
  ] },
  { name: "independent split component stock", text: "Áo S và quần M còn không?", obligations: [
    { kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: null,
      size: "S", component: "TOP", evidenceText: "Áo S" },
    { kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: null,
      size: "M", component: "BOTTOM", evidenceText: "quần M" },
  ] },
  { name: "reject and alternative search", text: "Không lấy ITEM42, tìm dáng suông dưới 800k.", obligations: [
    { kind: "PRODUCT_REJECT", capability: null, scope: null, productId: "ITEM42", evidenceText: "Không lấy ITEM42" },
    { kind: "PRODUCT_SEARCH", capability: null, scope: null, productId: "ITEM42",
      evidenceText: "tìm dáng suông dưới 800k" },
  ] },
  { name: "design attributes", text: "Cạp chun hay cứng? Dáng suông không?", obligations: [
    { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "WAIST_CONSTRUCTION", productId: null,
      evidenceText: "Cạp chun hay cứng?" },
    { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "SILHOUETTE", productId: null,
      evidenceText: "Dáng suông không?" },
  ] },
  { name: "ETA and receiving deadline", text: "Mấy ngày tới? Chị cần trong 5 ngày.", obligations: [
    { kind: "FACT_REQUEST", capability: "ETA", scope: null, productId: null, evidenceText: "Mấy ngày tới?" },
    { kind: "FACT_REQUEST", capability: "ETA", scope: "DELIVERY_DEADLINE", productId: null,
      deadlineDays: 5, evidenceText: "Chị cần trong 5 ngày." },
  ] },
  { name: "two prices and cheaper relation", text: "Giá ITEM42 và ITEM99? Mẫu nào rẻ hơn?", obligations: [
    { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "ITEM42", evidenceText: "Giá ITEM42" },
    { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "ITEM99", evidenceText: "ITEM99" },
    { kind: "FACT_REQUEST", capability: "PRODUCT_COMPARISON", scope: "CHEAPER", productId: "ITEM42",
      relatedProductId: "ITEM99", evidenceText: "Mẫu nào rẻ hơn?" },
  ] },
];

describe("D1 customer-input obligation families", () => {
  it.each(extractionFamilies)("retains the requested subject and scope for $name", ({ text, obligations }) => {
    const extracted = customerInputObligations(bindRealtimeCustomerInput(inputDelta({ obligations: [...obligations] }), text));
    expect(extracted).toHaveLength(obligations.length);
    expect(extracted).toEqual(obligations.map((entry) => expect.objectContaining({ ...entry, id: expect.any(String) })));
    expect(new Set(extracted.map(({ id }) => id)).size).toBe(obligations.length);
  });

  it("preserves alternative shape and avoidance criteria independently of rejection and budget state", () => {
    const text = "Không lấy ITEM42, tìm dáng suông tránh bó eo dưới 800k.";
    const criteria = { shape: "suông", avoid: ["bó eo"] };
    const input = bindRealtimeCustomerInput(inputDelta({
      product: { operation: "REJECT", productId: "ITEM42", evidenceText: "Không lấy ITEM42" },
      budget: { operation: "SET", value: 800_000, evidenceText: "dưới 800k" },
      obligations: [
        { kind: "PRODUCT_REJECT", capability: null, scope: null, productId: "ITEM42", evidenceText: "Không lấy ITEM42" },
        { kind: "PRODUCT_SEARCH", capability: null, scope: null, productId: "ITEM42", criteria,
          evidenceText: "tìm dáng suông tránh bó eo dưới 800k" },
      ],
    }), text);
    const obligations = customerInputObligations(input);
    expect(obligations).toHaveLength(2);
    expect(obligations[1]).toMatchObject({ kind: "PRODUCT_SEARCH", criteria });
    expect(applyCustomerDecisionInput(undefined, input, "ITEM42"))
      .toMatchObject({ budgetVnd: 800_000, rejectedProductIds: ["ITEM42"] });
  });
});

describe("D2 deterministic conservation across obligation families", () => {
  it("adds available color evidence when Strategist focuses only on price", () => {
    const task = compile(firstContact, [price, colors], [price.ref]);
    expect(task.requestedObligations).toEqual(firstContact);
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: "price", outcome: "ANSWERED", evidenceRefs: [
        { ref: price.ref, contentHash: price.provenance.contentHash },
      ] }),
      expect.objectContaining({ obligationId: "black", outcome: "ANSWERED", evidenceRefs: [
        { ref: colors.ref, contentHash: colors.provenance.contentHash },
      ] }),
    ]);
    expect(task.requiredEvidenceRefs).toEqual([price.ref, colors.ref]);
  });

  it("keeps requested color coverage in the fixed first-contact path", () => {
    const task = compileTrackCFixedFirstContactTask({ requestedObligations: firstContact,
      productResolved: true, classificationOrVariantRequired: false, colorChoiceMeaningful: true,
      missingMeasurements: [], evidence: [price, colors], boundProductIds: ["ITEM42"] });
    expect(task.requestedObligations).toEqual(firstContact);
    expect(task.obligationResolutions).toHaveLength(2);
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: "price", outcome: "ANSWERED" }),
      expect.objectContaining({ obligationId: "black", outcome: "ANSWERED" }),
    ]);
    expect(task.continuation).not.toEqual({ type: "ASK", input: "COLOR" });
  });

  it("does not promote a conditional customer offer to authorized shop price", () => {
    const offer: TrackCRequestedObligation = { id: "customer-offer", kind: "FACT_REQUEST",
      capability: "PROMOTION_OFFER", scope: "CUSTOMER_OFFER", productId: "ITEM42" };
    expect(trackCObligationMatchesEvidence(offer, price)).toBe(false);
    const task = compile([offer], [price], []);
    expect(task.obligationResolutions).toEqual([expect.objectContaining({ obligationId: "customer-offer",
      outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [], limitation: { kind: "NO_VERIFIED_EVIDENCE" } })]);
    expect(task.canonicalRequest).toBeNull();
    expect(() => compile([offer], [price], [price.ref])).toThrow("TRACK_C_STRATEGIST_REQUEST_SCOPE_INVALID");
  });

  it("maps top S and bottom M stock independently, including unavailable components", () => {
    const top: TrackCRequestedObligation = { id: "top-S", kind: "FACT_REQUEST", capability: "STOCK",
      scope: null, productId: "ITEM42", component: "TOP", size: "S" };
    const bottom: TrackCRequestedObligation = { ...top, id: "bottom-M", component: "BOTTOM", size: "M" };
    const topStock = fact("TOP_S", "STOCK", { status: "IN_STOCK", component: "TOP" },
      { productId: "ITEM42", variantLabel: { size: "S" } });
    const bottomStock = fact("BOTTOM_M", "STOCK", { status: "OUT_OF_STOCK", component: "BOTTOM" },
      { productId: "ITEM42", variantLabel: { size: "M" } });
    const task = compile([top, bottom], [topStock, bottomStock], [topStock.ref]);
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: top.id, outcome: "ANSWERED", subject: expect.objectContaining({ size: "S", component: "TOP" }),
        evidenceRefs: [{ ref: topStock.ref, contentHash: topStock.provenance.contentHash }] }),
      expect.objectContaining({ obligationId: bottom.id, outcome: "ANSWERED", subject: expect.objectContaining({ size: "M", component: "BOTTOM" }),
        evidenceRefs: [{ ref: bottomStock.ref, contentHash: bottomStock.provenance.contentHash }] }),
    ]);
    expect(trackCObligationMatchesEvidence(top, bottomStock)).toBe(false);
    expect(trackCObligationMatchesEvidence(bottom, topStock)).toBe(false);
    const wrongComponent = { ...topStock, value: { ...topStock.value, component: "BOTTOM" } };
    expect(trackCObligationMatchesEvidence(top, wrongComponent)).toBe(false);
    expect(compile([top, bottom], [topStock], [topStock.ref]).obligationResolutions?.[1])
      .toMatchObject({ obligationId: bottom.id, outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] });
  });

  it("retains split policy, component stocks and retail facts without claiming full-set stock", () => {
    const requested: readonly TrackCRequestedObligation[] = [
      { id: "mix-policy", kind: "FACT_REQUEST", capability: "POLICY", scope: "SPLIT_SIZE", productId: null },
      { id: "top-stock", kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: "ITEM42", component: "TOP", size: "S" },
      { id: "bottom-stock", kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: "ITEM42", component: "BOTTOM", size: "M" },
      { id: "top-retail", kind: "FACT_REQUEST", capability: "OFFER_CONFIGURATION", scope: "TOP", productId: "ITEM42" },
      { id: "bottom-retail", kind: "FACT_REQUEST", capability: "OFFER_CONFIGURATION", scope: "BOTTOM", productId: "ITEM42" },
      { id: "whole-set-stock", kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: "ITEM42" },
    ];
    const evidence = [
      fact("MIX_POLICY", "POLICY", { allowMixedSizes: true }, { scope: "SHOP" }),
      fact("TOP_STOCK", "STOCK", { status: "IN_STOCK", component: "TOP" }, { productId: "ITEM42", variantLabel: { size: "S" } }),
      fact("BOTTOM_STOCK", "STOCK", { status: "IN_STOCK", component: "BOTTOM" }, { productId: "ITEM42", variantLabel: { size: "M" } }),
      fact("TOP_RETAIL", "OFFER_CONFIGURATION", { offerScope: "TOP", componentSaleAllowed: true }),
      fact("BOTTOM_RETAIL", "OFFER_CONFIGURATION", { offerScope: "BOTTOM", componentSaleAllowed: true }),
    ];
    const task = compile(requested, evidence);
    expect(task.obligationResolutions).toHaveLength(requested.length);
    expect(task.obligationResolutions?.map((entry) => [entry.obligationId, entry.outcome])).toEqual([
      ["mix-policy", "ANSWERED"], ["top-stock", "ANSWERED"], ["bottom-stock", "ANSWERED"],
      ["top-retail", "ANSWERED"], ["bottom-retail", "ANSWERED"], ["whole-set-stock", "BOUNDED_UNAVAILABLE"],
    ]);
    expect(task.obligationResolutions?.at(-1)?.evidenceRefs).toEqual([]);
    expect(task.canonicalRequest).toBeNull();
  });

  it("covers waist construction and silhouette from known design fields without a false limit", () => {
    const attributes = buildProductAttributesV1({ productId: "ITEM42", observedAt: "2026-09-10T02:00:00Z",
      data: { materials: [], materialComponents: {}, colors: [], styles: [], silhouettes: [], occasions: [],
        designAttributes: { waist: ["cạp chun"], silhouette: ["suông"] }, careInstructions: null,
        wearProperties: null, backCoverage: null, designComplexity: null } });
    const evidence = trackCProductAttributeEvidence({ attributes, refPrefix: "DESIGN", authority: "RUNTIME" });
    const requested: readonly TrackCRequestedObligation[] = [
      { id: "waist", kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "WAIST_CONSTRUCTION", productId: "ITEM42" },
      { id: "shape", kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "SILHOUETTE", productId: "ITEM42" },
    ];
    const task = compile(requested, evidence, [evidence[0]!.ref]);
    expect(task.obligationResolutions).toEqual(requested.map(({ id, scope }) => expect.objectContaining({
      obligationId: id, scope, outcome: "ANSWERED", limitation: null,
    })));
    expect(task.requiredEvidenceRefs).toHaveLength(2);
    expect(task.semanticHandoff?.limit).toBeNull();
    expect(trackCObligationMatchesEvidence(requested[0]!, evidence.find(({ value }) => "design.silhouette" in value)!)).toBe(false);
  });

  it.each([4, 6])("keeps ETA and derives the distinct five-day deadline relation for ETA max %s", (maxDays) => {
    const eta = fact("ETA", "ETA", { minDays: 2, maxDays });
    const requested: readonly TrackCRequestedObligation[] = [
      { id: "eta", kind: "FACT_REQUEST", capability: "ETA", scope: null, productId: "ITEM42" },
      { id: "deadline", kind: "FACT_REQUEST", capability: "ETA", scope: "DELIVERY_DEADLINE", productId: "ITEM42", deadlineDays: 5 },
    ];
    const task = compile(requested, [eta]);
    expect(task.obligationResolutions).toHaveLength(2);
    expect(task.obligationResolutions?.[0]).toMatchObject({ obligationId: "eta", outcome: "ANSWERED" });
    expect(task.obligationResolutions?.[0]?.relation ?? null).toBeNull();
    expect(task.obligationResolutions?.[1]).toMatchObject({ obligationId: "deadline", outcome: "ANSWERED",
      relation: { etaMinDays: 2, etaMaxDays: maxDays, deadlineDays: 5,
        relation: maxDays <= 5 ? "ETA_WITHIN_DEADLINE_IF_ESTIMATE_HOLDS" : "ETA_NOT_GUARANTEED_BY_DEADLINE" } });
    expect(task.canonicalRequest).toBeNull();
  });

  it("keeps a receiving deadline unavailable when no typed deadline input or relation exists", () => {
    const eta = fact("ETA", "ETA", { minDays: 2, maxDays: 4 });
    const deadline: TrackCRequestedObligation = { id: "deadline", kind: "FACT_REQUEST", capability: "ETA",
      scope: "DELIVERY_DEADLINE", productId: "ITEM42" };
    expect(trackCObligationMatchesEvidence(deadline, eta)).toBe(false);
    const task = compile([deadline], [eta], []);
    expect(task.obligationResolutions).toEqual([expect.objectContaining({ obligationId: "deadline",
      outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] })]);
    expect(task.obligationResolutions?.[0]?.relation ?? null).toBeNull();
  });

  it("keeps two price facts distinct from a cheaper relation for the exact product pair", () => {
    const secondPrice = fact("PRICE_B", "PRICE", { amountVnd: 810_000 }, { productId: "ITEM99" });
    const cheaper = fact("CHEAPER", "PRODUCT_COMPARISON", { productIds: ["ITEM42", "ITEM99"], offerId: "SET",
      differenceVnd: 85_000, pricesVnd: [725_000, 810_000], currency: "VND",
      sourceClaimHashes: [price.provenance.contentHash, secondPrice.provenance.contentHash] }, null);
    const requested: readonly TrackCRequestedObligation[] = [
      { id: "price-A", kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "ITEM42" },
      { id: "price-B", kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "ITEM99" },
      { id: "cheaper", kind: "FACT_REQUEST", capability: "PRODUCT_COMPARISON", scope: "CHEAPER", productId: "ITEM42", relatedProductId: "ITEM99" },
    ];
    const task = compile(requested, [price, secondPrice, cheaper], [price.ref], ["ITEM42", "ITEM99"]);
    expect(task.obligationResolutions).toHaveLength(3);
    expect(task.obligationResolutions?.map((entry) => [entry.obligationId, entry.outcome, entry.evidenceRefs.map(({ ref }) => ref)]))
      .toEqual([["price-A", "ANSWERED", [price.ref]], ["price-B", "ANSWERED", [secondPrice.ref]], ["cheaper", "ANSWERED", [cheaper.ref]]]);
    expect(trackCObligationMatchesEvidence(requested[2]!, price)).toBe(false);
    expect(trackCObligationMatchesEvidence({ ...requested[2]!, relatedProductId: "ITEM77" }, cheaper)).toBe(false);
    expect(trackCObligationMatchesEvidence({ ...requested[2]!, scope: "COMPARATIVE_PROPERTY" }, cheaper)).toBe(false);
    expect(compile(requested, [price, secondPrice], [price.ref], ["ITEM42", "ITEM99"]).obligationResolutions?.[2])
      .toMatchObject({ obligationId: "cheaper", outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] });
  });

  it("does not answer an ambiguous product request with one arbitrary bound product fact", () => {
    const requested: TrackCRequestedObligation = { id: "ambiguous-price", kind: "FACT_REQUEST",
      capability: "PRICE", scope: null, productId: null };
    const other = fact("PRICE_B", "PRICE", { amountVnd: 810_000 }, { productId: "ITEM99" });
    expect(trackCObligationMatchesEvidence(requested, price)).toBe(false);
    const task = compile([requested], [price, other], [], ["ITEM42", "ITEM99"]);
    expect(task.obligationResolutions).toEqual([expect.objectContaining({ obligationId: requested.id,
      subject: expect.objectContaining({ productId: null }), outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] })]);
    expect(task.requiredEvidenceRefs).toEqual([]);
    expect(() => compile([requested], [price, other], [price.ref], ["ITEM42", "ITEM99"])).toThrow();
  });

  it("requires the rejection outcome independently of an unavailable alternative search", () => {
    const requested: readonly TrackCRequestedObligation[] = [
      { id: "reject", kind: "PRODUCT_REJECT", capability: null, scope: null, productId: "ITEM42" },
      { id: "search", kind: "PRODUCT_SEARCH", capability: null, scope: null, productId: "ITEM42" },
    ];
    const task = compile(requested, [], []);
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: "reject", kind: "PRODUCT_REJECT", outcome: "ACTIONED",
        status: "ACKNOWLEDGED", evidenceRefs: [], limitation: null }),
      expect.objectContaining({ obligationId: "search", kind: "PRODUCT_SEARCH", outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] }),
    ]);
    const rejectionOnly = compile(requested.slice(0, 1), [], []);
    expect(() => assertTrackCResolutionCoverage(rejectionOnly, ["ITEM42"], [])).toThrow();
    expect(() => assertTrackCResolutionCoverage(rejectionOnly, ["ITEM42"], [
      { kind: "GENERAL", text: "Em ghi nhận ạ." },
    ])).toThrow();
  });

  it("keeps constrained alternative search unavailable when only old stock or a new price is known", () => {
    const search: TrackCRequestedObligation = { id: "constrained-search", kind: "PRODUCT_SEARCH",
      capability: null, scope: null, productId: "ITEM42", criteria: { shape: "suông", avoid: ["bó eo"] } };
    const oldStock = fact("OLD_STOCK", "STOCK", { status: "IN_STOCK" });
    const newPrice = fact("NEW_PRICE", "PRICE", { amountVnd: 690_000 }, { productId: "ITEM99" });
    expect(trackCObligationMatchesEvidence(search, oldStock)).toBe(false);
    expect(trackCObligationMatchesEvidence(search, price)).toBe(false);
    expect(trackCObligationMatchesEvidence(search, newPrice)).toBe(false);
    const task = compile([search], [oldStock, newPrice], []);
    expect(task.requestedObligations).toEqual([search]);
    expect(task.obligationResolutions).toEqual([expect.objectContaining({ obligationId: search.id,
      outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] })]);
    expect(task.canonicalRequest).toBeNull();
  });

  it("still rejects selected unrelated scopes while auto-completing requested facts", () => {
    const unrelated = fact("MATERIAL", "PRODUCT_ATTRIBUTES", { materials: ["lụa"] });
    expect(() => compile(firstContact, [price, colors, unrelated], [price.ref, unrelated.ref]))
      .toThrow("TRACK_C_STRATEGIST_REQUEST_SCOPE_INVALID");
  });
});
