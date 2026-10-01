import { describe, expect, it, vi } from "vitest";
import { bindRealtimeCustomerInput, applyCustomerDecisionInput, extractRealtimeCustomerInput, customerInputCanonicalEvidence, customerInputObligations } from "./realtime-customer-input.js";

import { noCustomerSelection } from "./realtime-customer-input.fixture.js";

describe("source-bound customer input", () => {
  it("keeps chosen M distinct from a question about S", () => {
    const text = "Lấy size M nhé, size S còn không?";
    const raw = { ...noCustomerSelection(), variant: { operation: "SELECT", productId: "CB182",
      size: "M", color: null, evidenceText: "Lấy size M nhé" } };
    expect(bindRealtimeCustomerInput(raw, text).variant.size).toBe("M");
    expect(() => bindRealtimeCustomerInput({ ...raw, variant: { ...raw.variant, size: "S" } }, text))
      .toThrow("CUSTOMER_INPUT_UNBOUND_VARIANT");
  });
  it("does not allow a value on a nonselection or invent handoff evidence", () => {
    const raw = noCustomerSelection();
    expect(() => bindRealtimeCustomerInput({ ...raw, variant: { ...raw.variant, size: "L" } }, "L rộng quá"))
      .toThrow("CUSTOMER_INPUT_UNSELECTED_VARIANT");
    expect(() => bindRealtimeCustomerInput({ ...raw, route: "HUMAN", routeEvidence: "gặp nhân viên" }, "không cần hỗ trợ"))
      .toThrow("CUSTOMER_INPUT_UNBOUND_EVIDENCE");
  });
  it("applies an explicit new budget while preserving unrelated session inputs", () => {
    const value = bindRealtimeCustomerInput({ ...noCustomerSelection(),
      budget: { operation: "SET", value: 700_000, evidenceText: "ngân sách 700k" } }, "ngân sách 700k");
    expect(applyCustomerDecisionInput({ budgetVnd: 900_000, occasion: "WORK", rejectedProductIds: ["SQ149"] }, value))
      .toEqual({ budgetVnd: 700_000, occasion: "WORK", rejectedProductIds: ["SQ149"] });
  });
  it("binds a referential rejection to the prior product, not the replacement", () => {
    const value = bindRealtimeCustomerInput({ ...noCustomerSelection(), product: {
      operation: "REJECT", productId: null, evidenceText: "another one" },
      budget: { operation: "SET", value: 600_000, evidenceText: "600k" },
    }, "another one 600k");
    expect(applyCustomerDecisionInput({ budgetVnd: 700_000, occasion: "WORK", rejectedProductIds: ["SQ149"] },
      value, "CB182")).toEqual({ budgetVnd: 600_000, occasion: "WORK", rejectedProductIds: ["SQ149", "CB182"] });
  });

  it("does not turn a product noun into a rejection", () => {
    const value = bindRealtimeCustomerInput(noCustomerSelection(), "Bộ CB182 chất liệu gì?");
    expect(applyCustomerDecisionInput(undefined, value).rejectedProductIds).toEqual([]);
  });

  it("preserves independent fact obligations instead of collapsing a compound request", () => {
    const text = "Bộ này giá bao nhiêu, có dễ nhăn không?";
    const value = bindRealtimeCustomerInput({
      ...noCustomerSelection(),
      obligations: [
        { kind: "FACT_REQUEST", capability: "PRICE", scope: null,
          productId: null, evidenceText: "giá bao nhiêu" },
        { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
          scope: "WRINKLE_RESISTANCE", productId: null,
          evidenceText: "có dễ nhăn không" },
      ],
    }, text);
    expect(customerInputObligations(value).map(({ kind, capability, scope }) =>
      ({ kind, capability, scope }))).toEqual([
      { kind: "FACT_REQUEST", capability: "PRICE", scope: null },
      { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES",
        scope: "WRINKLE_RESISTANCE" },
    ]);
  });

  it("requires a typed scope for scoped fact obligations", () => {
    expect(() => bindRealtimeCustomerInput({
      ...noCustomerSelection(),
      obligations: [{
        kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: null,
        productId: null, evidenceText: "dễ nhăn không",
      }],
    }, "dễ nhăn không")).toThrow();
    expect(() => bindRealtimeCustomerInput({
      ...noCustomerSelection(),
      obligations: [{
        kind: "FACT_REQUEST", capability: "OFFER_CONFIGURATION", scope: null,
        productId: null, evidenceText: "bán lẻ áo không",
      }],
    }, "bán lẻ áo không")).toThrow();
  });

  it("keeps rejection and alternative search as independent obligations", () => {
    const text = "SV9031 thôi không lấy, tìm mẫu khác dưới 800k";
    const value = bindRealtimeCustomerInput({
      ...noCustomerSelection(),
      product: { operation: "SEARCH", productId: null, evidenceText: "tìm mẫu khác" },
      budget: { operation: "SET", value: 800_000, evidenceText: "dưới 800k" },
      obligations: [
        { kind: "PRODUCT_REJECT", capability: null, scope: null,
          productId: "SV9031", evidenceText: "SV9031 thôi không lấy" },
        { kind: "PRODUCT_SEARCH", capability: null, scope: null,
          productId: null, evidenceText: "tìm mẫu khác" },
      ],
    }, text);
    expect(applyCustomerDecisionInput(
      { budgetVnd: null, occasion: null, rejectedProductIds: [] },
      value,
      "CB182",
    )).toEqual({
      budgetVnd: 800_000,
      occasion: null,
      rejectedProductIds: ["SV9031"],
    });
  });
});


describe("producer validation and bounded repair", () => {
  const response = (output: unknown) => ({ providerModelVersion: "gemini-3.5-flash-lite",
    payload: { candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] } });
  it("repairs once and never admits a stale history span", async () => {
    const send = vi.fn().mockResolvedValueOnce(response({ ...noCustomerSelection(),
      variant: { operation: "CHANGE", productId: "CB182", size: "L", color: null, evidenceText: "Đổi size L" } }))
      .mockResolvedValueOnce(response(noCustomerSelection()));
    const result = await extractRealtimeCustomerInput({ text: "Giỏ này giao thế nào?", history: [], state: {},
      modelResource: "projects/test/locations/global/publishers/google/models/gemini-3.5-flash-lite", transport: { send } });
    expect(result.variant.operation).toBe("NONE");
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]![0].body).toContain("CUSTOMER_INPUT_UNBOUND_EVIDENCE");
  });
  it("does not promote fabricated quantity or a different product into canonical intent", () => {
    const text = "Lấy size M nhé";
    const raw = { ...noCustomerSelection(),
      variant: { operation: "SELECT", productId: "CB182", size: "M", color: null, evidenceText: text },
      salesSignals: { ...noCustomerSelection().salesSignals, buyingIntent: {
        decision: "COMMITTED", requestedAction: "OPEN_CART", quantity: 10, evidenceText: text, confidence: 0.99 } } };
    expect(() => bindRealtimeCustomerInput(raw, text)).toThrow("CUSTOMER_INPUT_UNBOUND_QUANTITY");
    raw.salesSignals.buyingIntent.quantity = 1;
    const value = bindRealtimeCustomerInput(raw, text);
    expect(() => customerInputCanonicalEvidence({ text, sourceMessageId: "m1", productId: "OTHER", evaluatedAt: new Date() }, value))
      .toThrow("CUSTOMER_INPUT_PRODUCT_MISMATCH");
  });
});
