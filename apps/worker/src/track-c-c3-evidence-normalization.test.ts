import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContextV2 } from "@lana/contracts";
import { buildTrackCSelectableEvidence } from "./track-c-c3-selectable-evidence.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";
import { assertTrackCResolutionCoverage } from "./track-c-c3-obligation-resolution.js";
import { compileTrackCStrategistDecision, type TrackCRequestedObligation } from "./track-c-c3-strategy-contract.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";

const recipe = JSON.parse(readFileSync(new URL("../evals/track-c-c2/v2/runtime-materialization.json", import.meta.url), "utf8")) as TrackCV5MaterializationRecipe;

function context(claims: Record<string, TrackCV5RuntimeClaimFixture> = {}): ContextV2 {
  const capture = materializeTrackCV5CaseCapture({ lane: "BEHAVIOR_SIMULATION", recipe,
    runtimeClaimCatalog: claims, fixture: { id: "EVIDENCE_NORMALIZATION",
      latest_customer_message: "Thông tin sản phẩm?", context: {
        product_binding: { status: "RESOLVED", product_ids: ["ITEM42"] }, phase: "BROWSING",
        canonical_flags: [], source_stage: null, runtime_claim_refs: Object.keys(claims),
        buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null },
      } } });
  if (capture.context === null) throw new Error("TEST_CONTEXT_REQUIRED");
  return capture.context;
}

function simulation(facts: readonly unknown[], ctx = context()) {
  return buildTrackCSelectableEvidence({ context: ctx, simulationFacts: facts,
    executionLane: "BEHAVIOR_SIMULATION", evaluationAt: new Date(recipe.evaluation_at) });
}

const profile = { kind: "PRODUCT_PROFILE", productId: "ITEM42", displayName: "Mẫu thử",
  material: "lụa", colors: ["kem"], design: ["cổ tròn"] };
const care = { kind: "CARE_GUIDANCE", productId: "ITEM42",
  data: { wash: "hand_only", avoid: "strong_spin", dry: "shade" } };

describe("canonical C3 evidence normalization preserves source authority", () => {
  it("normalizes a verified profile material to the canonical attribute field", () => {
    const evidence = simulation([profile]);
    const material = evidence.find(({ capability, value }) => capability === "PRODUCT_ATTRIBUTES" && "materials" in value);
    expect(material).toMatchObject({ capability: "PRODUCT_ATTRIBUTES", value: { materials: ["lụa"] },
      subject: { scope: "PRODUCT", productId: "ITEM42" }, provenance: { authority: "SIMULATION" } });
    expect(material?.deterministicText).toEqual(expect.any(String));
    expect(trackCObligationMatchesEvidence({ kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
      scope: "MATERIALS", productId: "ITEM42" }, material!)).toBe(true);
    expect(trackCObligationMatchesEvidence({ kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
      scope: "WRINKLE_RESISTANCE", productId: "ITEM42" }, material!)).toBe(false);
    expect(evidence.some(({ value }) => "material" in value && !Array.isArray(value.materials) &&
      !Object.hasOwn(value, "displayName"))).toBe(false);
  });

  it("normalizes care guidance to an attribute without deriving care from material", () => {
    const evidence = simulation([profile, care]);
    const canonical = evidence.find(({ capability, value }) => capability === "PRODUCT_ATTRIBUTES" && "careInstructions" in value);
    const legacy = evidence.find(({ capability }) => capability === "CARE_GUIDANCE");
    expect(canonical).toMatchObject({ capability: "PRODUCT_ATTRIBUTES", value: { careInstructions: care.data },
      subject: { productId: "ITEM42" }, provenance: { authority: "SIMULATION" } });
    expect(canonical?.deterministicText).toBe(legacy?.deterministicText);
    expect(canonical?.deterministicText).toEqual(expect.any(String));
    expect(canonical?.provenance.contentHash).not.toBe(legacy?.provenance.contentHash);
    expect(trackCObligationMatchesEvidence({ kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
      scope: "CARE_INSTRUCTIONS", productId: "ITEM42" }, canonical!)).toBe(true);
    expect(simulation([profile]).some(({ value }) => "careInstructions" in value)).toBe(false);
  });

  it("keeps an unmapped care vocabulary unrealizable without creating a confirmed care answer", () => {
    const unknown = { ...care, data: { ...care.data, wash: "unmapped-wash" } };
    const evidence = simulation([unknown]);
    expect(evidence.some(({ value, deterministicText }) => "careInstructions" in value && deterministicText !== undefined)).toBe(false);
    expect(evidence.every(({ provenance }) => provenance.authority === "SIMULATION")).toBe(true);
  });

  it("projects explicit prices and composition as independent scoped facts", () => {
    const evidence = simulation([{ kind: "OFFER_CONFIGURATION", productId: "ITEM42", data: {
      fullSetVnd: 899_000, twoPieceVnd: 829_000, threePieceVnd: 1_049_000,
      top: { available: true, priceVnd: 549_000 }, bottom: { available: false, priceVnd: null },
    } }]);
    const prices = evidence.filter(({ capability }) => capability === "PRICE");
    expect(prices.map(({ value }) => [value.offerScope, value.component, value.amountVnd])).toEqual([
      ["FULL_SET", "FULL_SET", 899_000], ["TWO_PIECE", "FULL_SET", 829_000],
      ["THREE_PIECE", "FULL_SET", 1_049_000], ["TOP", "TOP", 549_000],
    ]);
    expect(evidence.filter(({ capability }) => capability === "OFFER_CONFIGURATION").map(({ value }) =>
      [value.offerScope, value.component])).toEqual([
      ["FULL_SET", "FULL_SET"], ["TWO_PIECE", "FULL_SET"], ["THREE_PIECE", "FULL_SET"],
      ["TOP", "TOP"], ["BOTTOM", "BOTTOM"],
    ]);
    expect(evidence.every(({ subject, provenance }) => subject?.productId === "ITEM42" && provenance.authority === "SIMULATION"))
      .toBe(true);
    expect(new Set(evidence.map(({ provenance }) => provenance.contentHash)).size).toBe(evidence.length);
    expect(evidence.every(({ deterministicText }) => typeof deterministicText === "string")).toBe(true);
    expect(evidence.some(({ capability }) => capability === "STOCK")).toBe(false);
  });

  it("preserves three-piece composition and its exact price as two independently covered obligations", () => {
    const evidence = simulation([{ kind: "OFFER_CONFIGURATION", productId: "ITEM42", data: {
      twoPieceVnd: 829_000, threePieceVnd: 1_049_000, threePieceItems: ["áo", "chân váy", "quần"],
    } }]);
    const composition = evidence.find(({ capability, value }) => capability === "OFFER_CONFIGURATION" && value.offerScope === "THREE_PIECE")!;
    const exactPrice = evidence.find(({ capability, value }) => capability === "PRICE" && value.offerScope === "THREE_PIECE")!;
    const wrongPrice = evidence.find(({ capability, value }) => capability === "PRICE" && value.offerScope === "TWO_PIECE")!;
    const requested: readonly TrackCRequestedObligation[] = [
      { id: "composition", kind: "FACT_REQUEST", capability: "OFFER_CONFIGURATION", scope: "THREE_PIECE",
        component: "FULL_SET", productId: "ITEM42" },
      { id: "price", kind: "FACT_REQUEST", capability: "PRICE", scope: null,
        component: "FULL_SET", offerScope: "THREE_PIECE", productId: "ITEM42" },
    ];
    expect(trackCObligationMatchesEvidence(requested[0]!, composition)).toBe(true);
    expect(trackCObligationMatchesEvidence(requested[1]!, exactPrice)).toBe(true);
    expect(trackCObligationMatchesEvidence(requested[1]!, wrongPrice)).toBe(false);
    const { task } = compileTrackCStrategistDecision({ requestedObligations: requested, evidence,
      boundProductIds: ["ITEM42"], permittedCanonicalActions: ["NONE"], measurementsUnavailable: false,
      productResolved: true, hardStop: false, requireStructuredGoal: true,
      decision: { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "OFFER_CONFIGURATION",
        evidenceRefs: [composition.ref], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" },
    });
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: "composition", outcome: "ANSWERED", evidenceRefs: [
        { ref: composition.ref, contentHash: composition.provenance.contentHash },
      ] }),
      expect.objectContaining({ obligationId: "price", outcome: "ANSWERED", evidenceRefs: [
        { ref: exactPrice.ref, contentHash: exactPrice.provenance.contentHash },
      ] }),
    ]);
    expect(task.requiredEvidenceRefs).toEqual([composition.ref, exactPrice.ref]);
    expect(composition.provenance.contentHash).not.toBe(exactPrice.provenance.contentHash);
    expect(composition.deterministicText).not.toBe(exactPrice.deterministicText);
    expect(exactPrice.deterministicText).not.toContain("chân váy");
    const segment = { kind: "VERIFIED_CLAIM", text: composition.deterministicText!, claimContentHash: composition.provenance.contentHash };
    expect(() => assertTrackCResolutionCoverage(task, ["ITEM42"], [segment, { ...segment }]))
      .toThrow("TRACK_C_RESPONDER_OBLIGATION_FACT_REQUIRED");
    expect(() => assertTrackCResolutionCoverage(task, ["ITEM42"], [segment,
      { ...segment, text: exactPrice.deterministicText!, claimContentHash: exactPrice.provenance.contentHash }])).not.toThrow();

    const unavailable = compileTrackCStrategistDecision({ requestedObligations: requested,
      evidence: evidence.filter(({ ref }) => ref !== exactPrice.ref), boundProductIds: ["ITEM42"],
      permittedCanonicalActions: ["NONE"], measurementsUnavailable: false,
      productResolved: true, hardStop: false, requireStructuredGoal: true,
      decision: { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "OFFER_CONFIGURATION",
        evidenceRefs: [composition.ref], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" },
    }).task;
    expect(unavailable.obligationResolutions?.[1]).toMatchObject({ obligationId: "price", outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] });
  });

  it("does not auto-answer an unqualified whole-set price when two offer configurations have different prices", () => {
    const evidence = simulation([{ kind: "OFFER_CONFIGURATION", productId: "ITEM42", data: {
      twoPieceVnd: 829_000, threePieceVnd: 1_049_000,
    } }]);
    const { task } = compileTrackCStrategistDecision({ requestedObligations: [
      { id: "ambiguous-price", kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "ITEM42", component: "FULL_SET" },
    ], evidence, boundProductIds: ["ITEM42"], permittedCanonicalActions: ["NONE"], measurementsUnavailable: false,
      productResolved: true, hardStop: false, requireStructuredGoal: true,
      decision: { replyAct: "ANSWER", goal: "TYPED_DECISION", proposition: "PRICE", evidenceRefs: [],
        continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" },
    });
    expect(task.obligationResolutions).toEqual([expect.objectContaining({ obligationId: "ambiguous-price",
      outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] })]);
    expect(task.requiredEvidenceRefs).toEqual([]);
  });

  it("keeps the canonical price sentence separate from the source composition details", () => {
    const evidence = simulation([{ kind: "OFFER_CONFIGURATION", productId: "ITEM42", data: {
      threePieceVnd: 1_049_000, threePieceItems: ["áo", "chân váy", "quần"],
    } }]);
    const composition = evidence.find(({ capability }) => capability === "OFFER_CONFIGURATION")!;
    const price = evidence.find(({ capability }) => capability === "PRICE")!;
    expect(price.deterministicText).not.toBe(composition.deterministicText);
    expect(price.deterministicText).not.toContain("chân váy");
    expect(price.value).toMatchObject({ amountVnd: 1_049_000, offerScope: "THREE_PIECE" });
  });

  it("never uses per-component retail prices as full-set price or stock authority", () => {
    const evidence = simulation([{ kind: "OFFER_CONFIGURATION", productId: "ITEM42", data: {
      top: { available: true, priceVnd: 499_000 }, bottom: { available: true, priceVnd: 399_000 },
    } }]);
    expect(evidence.filter(({ capability }) => capability === "PRICE").map(({ value }) => value.component))
      .toEqual(["TOP", "BOTTOM"]);
    expect(evidence.some(({ value }) => value.component === "FULL_SET" || value.offerScope === "FULL_SET")).toBe(false);
    expect(evidence.some(({ capability }) => capability === "STOCK")).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 12.5])("withholds invalid scoped price %s", (amount) => {
    const evidence = simulation([{ kind: "OFFER_CONFIGURATION", productId: "ITEM42", data: {
      fullSetVnd: amount, top: { available: true, priceVnd: amount }, bottom: { available: false, priceVnd: 1 },
    } }]);
    expect(evidence.some(({ capability }) => capability === "PRICE")).toBe(false);
  });

  it("preserves the production lane prohibition and product binding for normalized projections", () => {
    expect(() => buildTrackCSelectableEvidence({ context: context(), simulationFacts: [profile, care],
      executionLane: "PRODUCTION_CONTRACT" })).toThrow("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
    expect(() => simulation([{ ...profile, productId: "ITEM99" }])).toThrow("TRACK_C_EVIDENCE_BINDING_INVALID");
    expect(() => simulation([{ ...care, productId: "ITEM99" }])).toThrow("TRACK_C_EVIDENCE_BINDING_INVALID");
  });

  it("does not invent FULL_SET scope for a product-level runtime price lacking offer composition", () => {
    const ctx = context({ PRICE: { type: "PRICE", scope: { kind: "PRODUCT", productId: "ITEM42" },
      value: { amountVnd: 799_000, currency: "VND" }, source: "POS_SNAPSHOT", freshness: "FRESH" } });
    const evidence = buildTrackCSelectableEvidence({ context: ctx, simulationFacts: [], executionLane: "PRODUCTION_CONTRACT" });
    const [price] = evidence.filter(({ capability }) => capability === "PRICE");
    expect(price?.provenance).toMatchObject({ authority: "RUNTIME", contentHash: ctx.verifiedClaims[0]!.provenance.contentHash });
    expect(price?.value.offerScope).toBeUndefined();
    expect(price?.value.component).toBeUndefined();
  });

  it("keeps opaque stock variants unlabeled when no presentation provides their labels", () => {
    const ctx = context({ STOCK: { type: "STOCK", scope: { kind: "PRODUCT", productId: "ITEM42", variantId: "BLACK_M" },
      value: { status: "IN_STOCK", availableQuantity: 3 }, source: "POS_SNAPSHOT", freshness: "FRESH" } });
    const evidence = buildTrackCSelectableEvidence({ context: ctx, simulationFacts: [], executionLane: "PRODUCTION_CONTRACT" });
    const stock = evidence.find(({ capability }) => capability === "STOCK");
    expect(stock?.subject).toMatchObject({ productId: "ITEM42", variantId: "BLACK_M" });
    expect(stock?.subject?.variantLabel).toBeUndefined();
    expect(stock?.deterministicText).toBeUndefined();
    expect(stock?.provenance.authority).toBe("RUNTIME");
  });
});
