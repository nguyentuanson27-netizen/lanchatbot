import { describe, expect, it, vi } from "vitest";
import { buildCanonicalDecisionEvidenceV1, buildProductAttributesV1, type StableProductDocument } from "@lana/business-tools";
import type { BusinessFactEnvelopeV1 } from "@lana/contracts";
import { findVerifiedAlternative } from "./realtime-alternatives.js";
import { bindRealtimeCustomerInput } from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { buildRealtimeC3Input } from "./realtime-c3-input.js";
import { createRealtimeSalesState } from "./realtime-sales-cycle.js";
import { buildContextV2 } from "./context-v2.js";
import { buildTrackCSelectableEvidence } from "./track-c-c3-selectable-evidence.js";
import { compileTrackCStrategistDecision, type TrackCRequestedObligation, type TrackCSelectableEvidence } from "./track-c-c3-strategy-contract.js";
import { assertTrackCResolutionCoverage } from "./track-c-c3-obligation-resolution.js";

const now = new Date("2026-10-01T12:00:00Z");
const text = "Không lấy ITEM42, tìm dáng suông dưới 800k.";
const customerInput = bindRealtimeCustomerInput({ ...noCustomerSelection(),
  product: { operation: "SEARCH", productId: null, evidenceText: "tìm dáng suông" },
  budget: { operation: "SET", value: 800_000, evidenceText: "dưới 800k" },
  obligations: [
    { kind: "PRODUCT_REJECT", capability: null, scope: null, productId: "ITEM42", evidenceText: "Không lấy ITEM42" },
    { kind: "PRODUCT_SEARCH", capability: null, scope: null, productId: "ITEM42",
      criteria: { shape: "suông", avoid: [] }, evidenceText: "tìm dáng suông dưới 800k" },
  ],
}, text);

function product(id: string, shape: string | null = "suông"): StableProductDocument {
  return { productId: id, parentProductId: id, canonicalCode: id, title: id, aliases: [],
    colors: [], materials: [], silhouettes: shape === null ? [] : [shape], occasions: [],
    imageUrls: [], images: [], catalogVersion: "catalog-1", attributes: buildProductAttributesV1({
      productId: id, observedAt: now.toISOString(), data: { materials: [], materialComponents: {}, colors: [], styles: [],
        silhouettes: shape === null ? [] : [shape], occasions: [], designAttributes: null,
        careInstructions: null, wearProperties: null, backCoverage: null, designComplexity: null },
    }) };
}

function fact(id: string, price = 690_000): BusinessFactEnvelopeV1 {
  return { schemaVersion: 1, status: "OK", source: "POS_SNAPSHOT", observedAt: "2026-10-01T11:59:00Z",
    expiresAt: "2026-10-01T12:10:00Z", productId: id, reasonCode: null,
    facts: { schemaVersion: 1, productId: id, parentProductId: id, offerType: "SET", salePriceVnd: price,
      listPriceVnd: null, sizes: ["M"], stockStatus: "IN_STOCK", stockQuantity: 2,
      deliveryEta: null, fulfillmentPolicy: "READY_STOCK", imageUrls: [] } };
}

async function search(candidates: readonly StableProductDocument[], source = (id: string) => fact(id)) {
  return findVerifiedAlternative({ text, customerInput, currentProductId: "ITEM42",
    session: { budgetVnd: 900_000, occasion: null, rejectedProductIds: ["ITEM77"] },
    search: { searchAlternatives: async () => candidates }, facts: { resolve: async ({ productId }) => source(productId) },
    shopAlias: "LANA", now });
}

function evidenceFor(candidate = product("ITEM99"), source = fact(candidate.productId)) {
  const canonicalEvidence = buildCanonicalDecisionEvidenceV1({ text, sourceMessageId: "search-turn", productId: candidate.productId,
    modelBuyingIntent: null, evaluatedAt: now });
  const commerceState = createRealtimeSalesState("33333333-3333-4333-8333-333333333333", "test-page", now);
  const base = buildRealtimeC3Input({ sourceMessagePk: "00000000-0000-4000-8000-000000000098", canonicalEvidence,
    preConversationRevision: 0, finalConversationRevision: 1, preSalesRevision: 0, commerceState,
    productId: candidate.productId, catalogVersion: null, facts: [source], productFacts: null,
    policyResolution: null, cartReadiness: [], now }).context;
  const context = buildContextV2({ canonicalEvidence, finalCommerceState: commerceState, finalTurnEvidence: base.finalTurnEvidence,
    productBinding: base.productBinding, verifiedClaims: base.verifiedClaims, productAttributes: candidate.attributes ?? null,
    owner: "BOT", handoffReasonCode: null, readiness: [], now });
  return buildTrackCSelectableEvidence({ context, simulationFacts: [], executionLane: "PRODUCTION_CONTRACT", evaluationAt: now });
}

function compile(evidence: readonly TrackCSelectableEvidence[], request: TrackCRequestedObligation = {
  id: "search", kind: "PRODUCT_SEARCH", capability: null, scope: null, productId: "ITEM42",
  criteria: { shape: "suông", avoid: [] }, searchConstraints: { budgetVnd: 800_000, rejectedProductIds: ["ITEM42", "ITEM77"] },
}) {
  return compileTrackCStrategistDecision({ requestedObligations: [request], evidence,
    boundProductIds: [...new Set(evidence.flatMap(({ subject }) => subject?.productId ? [subject.productId] : []))],
    permittedCanonicalActions: ["NONE"], measurementsUnavailable: false, productResolved: true, hardStop: false,
    requireStructuredGoal: true, decision: { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "PRODUCT_PRESENTATION",
      evidenceRefs: [], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" } }).task;
}

describe("verified alternative business lookup satisfies current criteria", () => {
  it("checks same-turn shape, budget and all rejected products before returning a candidate", async () => {
    const result = await search([product("ITEM42"), product("ITEM77"), product("ITEM98", "ôm"), product("ITEM99")]);
    expect(result).toMatchObject({ status: "MATCHED", product: { productId: "ITEM99" }, facts: fact("ITEM99") });
  });

  it("finds the fourth discovery candidate after the first three fail verified shape criteria", async () => {
    const resolve = vi.fn().mockImplementation(async ({ productId }) => fact(productId));
    const result = await findVerifiedAlternative({ text, customerInput, currentProductId: "ITEM42",
      search: { searchAlternatives: async () => [
        product("ITEM91", "ôm"), product("ITEM92", "ôm"), product("ITEM93", "ôm"), product("ITEM99"),
      ] }, facts: { resolve }, shopAlias: "LANA", now });

    expect(result).toMatchObject({ status: "MATCHED", product: { productId: "ITEM99" }, facts: fact("ITEM99") });
    expect(resolve.mock.calls.map(([request]) => request.productId)).toEqual(["ITEM99"]);
  });

  it("does not inspect a matching thirteenth discovery candidate", async () => {
    const resolve = vi.fn().mockImplementation(async ({ productId }) => fact(productId));
    const result = await findVerifiedAlternative({ text, customerInput, currentProductId: "ITEM42",
      search: { searchAlternatives: async () => [
        ...Array.from({ length: 12 }, (_, index) => product(`ITEM${100 + index}`, "ôm")), product("ITEM99"),
      ] }, facts: { resolve }, shopAlias: "LANA", now });

    expect(result.status).toBe("NO_MATCH");
    expect(resolve).not.toHaveBeenCalled();
  });

  it("checks at most three POS candidates after filtering verified shape criteria", async () => {
    const resolve = vi.fn().mockImplementation(async ({ productId }) => fact(productId, productId === "ITEM99" ? 690_000 : 810_000));
    const result = await findVerifiedAlternative({ text, customerInput, currentProductId: "ITEM42",
      search: { searchAlternatives: async () => [
        product("ITEM91", "ôm"), product("ITEM92", "ôm"), product("ITEM93", "ôm"),
        product("ITEM94"), product("ITEM95"), product("ITEM96"), product("ITEM99"),
      ] }, facts: { resolve }, shopAlias: "LANA", now });

    expect(result.status).toBe("NO_MATCH");
    expect(resolve.mock.calls.map(([request]) => request.productId)).toEqual(["ITEM94", "ITEM95", "ITEM96"]);
  });

  it.each(["wrong shape", "missing shape", "discovery only", "unverified attributes"])("does not recommend %s", async (mode) => {
    const candidate = product("ITEM99", mode === "wrong shape" ? "ôm" : mode === "missing shape" ? null : "suông");
    if (mode === "discovery only") candidate.attributes = null;
    if (mode === "unverified attributes") candidate.attributes = { ...candidate.attributes!, silhouettes: ["suông", "ôm"] };
    expect((await search([candidate])).status).toBe("NO_MATCH");
  });

  it("accepts a shape stored in the verified design silhouette field", async () => {
    const candidate = product("ITEM99", null);
    const { schemaVersion: _schema, productId: _product, metadata: _metadata, ...data } = candidate.attributes!;
    candidate.attributes = buildProductAttributesV1({ productId: candidate.productId, observedAt: now.toISOString(),
      data: { ...data, designAttributes: { silhouette: ["suông"] } } });
    expect((await search([candidate])).status).toBe("MATCHED");
  });

  it("does not use a matching silhouette to bypass the budget", async () => {
    expect((await search([product("ITEM99")], (id) => fact(id, 810_000))).status).toBe("NO_MATCH");
  });

  it("keeps a requested avoidance bounded when its negative authority is missing", async () => {
    const constrainedText = "Không lấy ITEM42, tìm dáng suông tránh bó eo dưới 800k.";
    const constrained = bindRealtimeCustomerInput({ ...customerInput, obligations: customerInput.obligations!.map((entry) =>
      entry.kind === "PRODUCT_SEARCH" ? { ...entry, evidenceText: "tìm dáng suông tránh bó eo dưới 800k",
        criteria: { shape: "suông", avoid: ["bó eo"] } } : entry) }, constrainedText);
    const resolve = vi.fn().mockImplementation(async ({ productId }) => fact(productId));
    const result = await findVerifiedAlternative({ text: constrainedText, customerInput: constrained, currentProductId: "ITEM42",
      search: { searchAlternatives: async () => [product("ITEM99")] },
      facts: { resolve }, shopAlias: "LANA", now });
    expect(result.status).toBe("NO_MATCH");
    expect(resolve).not.toHaveBeenCalled();
  });
});

describe("compiler joins constrained search evidence for the same verified candidate", () => {
  it("answers the search with price and silhouette dependencies while preserving its identity", () => {
    const evidence = evidenceFor();
    const task = compile(evidence);
    const supporting = evidence.filter(({ capability }) => ["PRICE", "PRODUCT_ATTRIBUTES"].includes(capability));
    expect(task.obligationResolutions).toEqual([expect.objectContaining({ obligationId: "search", outcome: "ANSWERED",
      evidenceRefs: supporting.map(({ ref, provenance }) => ({ ref, contentHash: provenance.contentHash })) })]);
    expect(task.requiredEvidenceRefs).toEqual(supporting.map(({ ref }) => ref));
    const segments = supporting.map(({ deterministicText, provenance }) => ({ kind: "VERIFIED_CLAIM",
      text: deterministicText!, claimContentHash: provenance.contentHash }));
    expect(() => assertTrackCResolutionCoverage(task, ["ITEM99"], segments)).not.toThrow();
    expect(() => assertTrackCResolutionCoverage(task, ["ITEM99"], segments.filter((segment) =>
      segment.claimContentHash !== supporting.find(({ capability }) => capability === "PRODUCT_ATTRIBUTES")!.provenance.contentHash)))
      .toThrow("TRACK_C_RESPONDER_OBLIGATION_FACT_REQUIRED");
  });

  it.each(["missing price", "missing shape", "wrong shape", "over budget", "rejected candidate", "split subjects"])(
    "keeps %s bounded instead of combining unrelated facts", (mode) => {
      let evidence = evidenceFor(product("ITEM99", mode === "wrong shape" ? "ôm" : "suông"), fact("ITEM99", mode === "over budget" ? 810_000 : 690_000));
      if (mode === "missing price") evidence = evidence.filter(({ capability }) => capability !== "PRICE");
      if (mode === "missing shape") evidence = evidence.filter(({ capability }) => capability !== "PRODUCT_ATTRIBUTES");
      if (mode === "rejected candidate") evidence = evidenceFor(product("ITEM77"));
      if (mode === "split subjects") evidence = [
        ...evidence.filter(({ capability }) => capability !== "PRODUCT_ATTRIBUTES"),
        ...evidenceFor(product("ITEM98")).filter(({ capability }) => capability === "PRODUCT_ATTRIBUTES"),
      ];
      expect(compile(evidence).obligationResolutions).toEqual([expect.objectContaining({ obligationId: "search",
        outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] })]);
    },
  );

  it("preserves an unsupported avoidance criterion without treating absent attributes as false", () => {
    const task = compile(evidenceFor(), { id: "search", kind: "PRODUCT_SEARCH", capability: null, scope: null,
      productId: "ITEM42", criteria: { shape: "suông", avoid: ["bó eo"] },
      searchConstraints: { budgetVnd: 800_000, rejectedProductIds: ["ITEM42"] } });
    expect(task.obligationResolutions).toEqual([expect.objectContaining({ obligationId: "search",
      outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] })]);
  });
});
