import { describe, expect, it } from "vitest";
import { RealtimeCustomerObligationV1Schema, realtimeCustomerObligationSubjectScope } from "@lana/contracts";
import { bindRealtimeCustomerInput, customerInputRequestedObligations, CUSTOMER_INPUT_INSTRUCTION } from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";
import type { TrackCRequestedObligation, TrackCSelectableEvidence } from "./track-c-c3-strategy-contract.js";

const raw = (text: string, extra: Record<string, unknown> = {}) => ({ ...noCustomerSelection(), obligations: [
  { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: null, evidenceText: text, ...extra },
] });
const policy = (identity: string): TrackCSelectableEvidence => ({ ref: identity, capability: "POLICY",
  subject: { scope: "SHOP" }, value: { policy: identity }, deterministicText: "Verified shop policy.",
  provenance: { contentHash: identity.padEnd(64, "a"), authority: "RUNTIME" } });

describe("review5400907894 source owns semantic operands", () => {
  it("derives fact authority from capability rather than model-written scope", () => {
    expect(realtimeCustomerObligationSubjectScope({ capability: "PRICE", scope: null, subjectScope: "CART" })).toBe("PRODUCT");
    expect(() => bindRealtimeCustomerInput(raw("Giá bao nhiêu?", { subjectScope: "CART" }), "Giá bao nhiêu?"))
      .toThrow("CUSTOMER_INPUT_OBLIGATION_SUBJECT_MISMATCH");
  });
  it.each([
    { text: "Giá áo bao nhiêu?", component: "BOTTOM" },
    { text: "Giá bao nhiêu?", component: "TOP" },
    { text: "Giá bộ hai món?", offerScope: "THREE_PIECE" },
    { text: "Giá bộ ba món?", offerScope: "TWO_PIECE" },
    { text: "Giá bao nhiêu?", offerScope: "FULL_SET" },
  ])("rejects a rewritten component/configuration on $text", ({ text, ...qualifiers }) => {
    expect(() => bindRealtimeCustomerInput(raw(text, qualifiers), text))
      .toThrow("CUSTOMER_INPUT_UNBOUND_OBLIGATION_QUALIFIER");
  });
  it.each([
    { text: "Áo size S còn không?", component: "TOP" },
    { text: "Quần size M còn không?", component: "BOTTOM" },
    { text: "Nguyên bộ còn không?", component: "FULL_SET" },
    { text: "Giá bộ 3 món?", component: "FULL_SET", offerScope: "THREE_PIECE" },
    { text: "Price of the two-piece set?", component: "FULL_SET", offerScope: "TWO_PIECE" },
  ])("keeps a source-supported component/configuration on $text", ({ text, ...qualifiers }) => {
    expect(bindRealtimeCustomerInput(raw(text, qualifiers), text).obligations?.[0]).toMatchObject(qualifiers);
  });
  it("rejects a fabricated comparison referent even though a source span exists", () => {
    const text = "ITEM42 và ITEM99 mẫu nào rẻ hơn?";
    expect(() => bindRealtimeCustomerInput(raw(text, { capability: "PRODUCT_COMPARISON", scope: "CHEAPER",
      productId: "ITEM42", relatedProductId: "ITEM77" }), text)).toThrow("CUSTOMER_INPUT_UNBOUND_OBLIGATION_QUALIFIER");
    expect(bindRealtimeCustomerInput(raw(text, { capability: "PRODUCT_COMPARISON", scope: "CHEAPER",
      productId: "ITEM42", relatedProductId: "ITEM99" }), text).obligations?.[0]?.relatedProductId).toBe("ITEM99");
  });
  it("carries a typed decision concern without borrowing factual authority", () => {
    const text = "Chị ngại mua rồi ít mặc";
    const input = bindRealtimeCustomerInput(raw(text, { kind: "CONSULTATION", capability: null,
      decisionConcern: "USAGE_FREQUENCY" }), text);
    expect(customerInputRequestedObligations(input, ["ITEM42"])[0])
      .toMatchObject({ kind: "CONSULTATION", decisionConcern: "USAGE_FREQUENCY", customerText: text });
    expect(RealtimeCustomerObligationV1Schema.safeParse({ ...input.obligations?.[0],
      kind: "FACT_REQUEST", capability: "PRICE" }).success).toBe(false);
  });
});

describe("review5400907894 policy capability and identity agree", () => {
  it.each(["SPLIT_SIZE", "ALTERATION", "TRY_ON", "EXCHANGE_SIZE", "RETURN_AND_REFUND"])(
    "supports the exact POLICY/%s pair in the source contract", (scope) => {
      expect(RealtimeCustomerObligationV1Schema.safeParse(raw("Policy?", { capability: "POLICY", scope }).obligations[0]).success).toBe(true);
    });
  it("does not instruct Producer to erase policy scope", () => {
    expect(CUSTOMER_INPUT_INSTRUCTION).not.toContain("SIZE_FIT and POLICY use null scope");
  });
  it("matches the requested policy identity and rejects another verified policy", () => {
    const request = { kind: "FACT_REQUEST", capability: "POLICY", scope: "TRY_ON", productId: null,
      subjectScope: "SHOP" } as TrackCRequestedObligation;
    expect(trackCObligationMatchesEvidence(request, policy("TRY_ON"))).toBe(true);
    expect(trackCObligationMatchesEvidence(request, policy("EXCHANGE_SIZE"))).toBe(false);
  });
  it("keeps an unidentified policy bounded instead of consuming a different answer", () => {
    const request: TrackCRequestedObligation = { kind: "FACT_REQUEST", capability: "POLICY", scope: null,
      productId: null, subjectScope: "SHOP" };
    expect(trackCObligationMatchesEvidence(request, policy("TRY_ON"))).toBe(false);
    expect(trackCObligationMatchesEvidence(request, policy("EXCHANGE_SIZE"))).toBe(false);
  });
});
