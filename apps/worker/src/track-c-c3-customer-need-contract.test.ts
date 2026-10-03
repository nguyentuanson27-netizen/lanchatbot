import { describe, expect, it } from "vitest";
import { RealtimeCustomerObligationV1Schema } from "@lana/contracts";
import { bindRealtimeCustomerInput, customerInputObligations, customerInputRequestedObligations,
  CUSTOMER_INPUT_RESPONSE_SCHEMA } from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";
import { compileTrackCStrategistDecision, type TrackCRequestedObligation,
  type TrackCSelectableEvidence } from "./track-c-c3-strategy-contract.js";

const fact = (capability: TrackCSelectableEvidence["capability"], value: Record<string, unknown>,
  subject: TrackCSelectableEvidence["subject"]): TrackCSelectableEvidence => ({
  ref: "source", capability, value, ...(subject === undefined ? {} : { subject }), deterministicText: "Verified source.",
  provenance: { contentHash: "a".repeat(64), authority: "RUNTIME" },
});

describe("customer need uses the same factual vocabulary as evidence", () => {
  it.each(["SHIPPING_FEE", "FREESHIP", "CART_TOTAL", "BUSINESS_LOCATION", "PRODUCT_LIFECYCLE",
    "PRODUCT_MEDIA", "CARE_GUIDANCE", "FULFILLMENT_STATUS", "PRODUCT_PRESENTATION"])(
    "represents %s without substituting PRICE or POLICY", (capability) => {
      const raw = { kind: "FACT_REQUEST", capability, scope: null, productId: null,
        evidenceText: "Current request" };
      expect(RealtimeCustomerObligationV1Schema.safeParse(raw).success).toBe(true);
      const schema = (CUSTOMER_INPUT_RESPONSE_SCHEMA.properties.obligations as {
        items: { properties: { capability: { enum: string[] } } } }).items;
      expect(schema.properties.capability.enum).toContain(capability);
    });

  it("keeps a nonfactual concern source-bound with its own identity", () => {
    const source = "I am hesitant because I may rarely use it.";
    const raw = { ...noCustomerSelection(), obligations: [{ kind: "CONSULTATION",
      capability: null, scope: null, productId: null, evidenceText: source }] };
    const input = bindRealtimeCustomerInput(raw, source);
    const requested = customerInputRequestedObligations(input, ["ITEM42"]);
    expect(requested).toHaveLength(1);
    expect(requested[0]).toMatchObject({ kind: "CONSULTATION", id: customerInputObligations(input)[0]!.id });
    expect(() => bindRealtimeCustomerInput(raw, "An unrelated turn")).toThrow("CUSTOMER_INPUT_UNBOUND_EVIDENCE");
    expect(RealtimeCustomerObligationV1Schema.safeParse({ ...raw.obligations[0], capability: "PRICE" }).success).toBe(false);
  });

  it("retains an unsafe consultation as an explicit limitation without losing its price sibling", () => {
    const source = "Price please. I worry about delivery to địa chỉ: 91 Nguyễn Huy Tưởng.";
    const input = bindRealtimeCustomerInput({ ...noCustomerSelection(), obligations: [
      { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: null, evidenceText: "Price please" },
      { kind: "CONSULTATION", capability: null, scope: null, productId: null,
        evidenceText: "I worry about delivery to địa chỉ: 91 Nguyễn Huy Tưởng." },
    ] }, source);
    const requested = customerInputRequestedObligations(input, ["ITEM42"]);
    expect(requested.map(({ id }) => id)).toEqual(customerInputObligations(input).map(({ id }) => id));
    expect(requested[1]).toMatchObject({ kind: "CONSULTATION", lookupStatus: "FAILED" });
    expect(requested[1]?.customerText).toBeUndefined();
    const price = fact("PRICE", { amountVnd: 500_000 }, { productId: "ITEM42" });
    const { task } = compileTrackCStrategistDecision({ requestedObligations: requested, evidence: [price],
      boundProductIds: ["ITEM42"], permittedCanonicalActions: ["NONE"], measurementsUnavailable: false,
      productResolved: true, hardStop: false, decision: { replyAct: "ANSWER", goal: "TYPED_DECISION",
        proposition: "PRICE", evidenceRefs: [price.ref], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" } });
    expect(task.obligationResolutions?.map(({ outcome }) => outcome)).toEqual(["ANSWERED", "BOUNDED_UNAVAILABLE"]);
  });
});

describe("subject ownership is distinct from the current product referent", () => {
  it("maps general shop policy to shop evidence while preserving source identity", () => {
    const input = bindRealtimeCustomerInput({ ...noCustomerSelection(), obligations: [{
      kind: "FACT_REQUEST", capability: "POLICY", scope: "TRY_ON", productId: "ITEM42",
      evidenceText: "Can I try it on?" }] }, "Can I try it on?");
    const request = customerInputRequestedObligations(input, ["ITEM42"])[0]!;
    expect(request).toMatchObject({ id: customerInputObligations(input)[0]!.id, productId: null, subjectScope: "SHOP" });
    expect(trackCObligationMatchesEvidence(request, fact("POLICY", { policy: "TRY_ON" }, { scope: "SHOP" }))).toBe(true);
  });

  it("does not use shop policy for an explicitly product-specific request", () => {
    const source = "Does ITEM42 allow mixed sizes?";
    const input = bindRealtimeCustomerInput({ ...noCustomerSelection(), obligations: [{
      kind: "FACT_REQUEST", capability: "POLICY", scope: "SPLIT_SIZE", productId: "ITEM42",
      subjectScope: "PRODUCT", evidenceText: source }] }, source);
    const request = customerInputRequestedObligations(input, ["ITEM42"])[0]!;
    expect(request).toMatchObject({ productId: "ITEM42", subjectScope: "PRODUCT" });
    expect(trackCObligationMatchesEvidence(request, fact("POLICY", {}, { scope: "SHOP" }))).toBe(false);
  });

  it("keeps a cart fee on the cart boundary and never maps product price to it", () => {
    const source = "What is the shipping fee for this cart?";
    const input = bindRealtimeCustomerInput({ ...noCustomerSelection(), obligations: [{
      kind: "FACT_REQUEST", capability: "SHIPPING_FEE", scope: null, productId: null,
      subjectScope: "CART", evidenceText: source }] }, source);
    const request = customerInputRequestedObligations(input, ["ITEM42"])[0]!;
    expect(request.productId).toBeNull();
    expect(trackCObligationMatchesEvidence(request, fact("SHIPPING_FEE", { amountVnd: 20_000 },
      { scope: "CART", cartId: "cart", cartVersion: 1 }))).toBe(true);
    expect(trackCObligationMatchesEvidence(request, fact("PRICE", { amountVnd: 20_000 }, { productId: "ITEM42" }))).toBe(false);
  });
});

describe("fit request uses the size-engine recommendation rather than stock variant labels", () => {
  const fit = fact("SIZE_FIT", { recommendedSizes: ["M"], alternativeSizes: ["L"] }, { productId: "ITEM42" });
  const request: TrackCRequestedObligation = { kind: "FACT_REQUEST", capability: "SIZE_FIT",
    productId: "ITEM42", scope: null, size: "L" };
  it("covers a requested size present in verified fit recommendations or alternatives", () => {
    expect(trackCObligationMatchesEvidence(request, fit)).toBe(true);
    const { task } = compileTrackCStrategistDecision({ requestedObligations: [request], evidence: [fit],
      boundProductIds: ["ITEM42"], permittedCanonicalActions: ["NONE"], measurementsUnavailable: false,
      productResolved: true, hardStop: false, decision: { replyAct: "ANSWER", goal: "TYPED_DECISION",
        proposition: "SIZE_FIT", evidenceRefs: [fit.ref], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" } });
    expect(task.obligationResolutions?.[0]?.outcome).toBe("ANSWERED");
  });
  it("does not infer fit for an absent size or transfer stock into fit authority", () => {
    expect(trackCObligationMatchesEvidence({ ...request, size: "XL" }, fit)).toBe(false);
    expect(trackCObligationMatchesEvidence(request, fact("STOCK", { status: "IN_STOCK" },
      { productId: "ITEM42", variantLabel: { size: "L" } }))).toBe(false);
  });
});
