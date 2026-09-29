import { describe, expect, it, vi } from "vitest";
import { bindRealtimeCustomerInput, applyCustomerDecisionInput, extractRealtimeCustomerInput, customerInputCanonicalEvidence } from "./realtime-customer-input.js";

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
  it("does not turn a product noun into a rejection", () => {
    const value = bindRealtimeCustomerInput(noCustomerSelection(), "Bộ CB182 chất liệu gì?");
    expect(applyCustomerDecisionInput(undefined, value).rejectedProductIds).toEqual([]);
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
