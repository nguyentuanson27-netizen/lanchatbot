import { describe, expect, it } from "vitest";
import {
  bindRealtimeCustomerInput,
  customerInputCanonicalEvidence,
} from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";

const text = "Đổi sang L, lấy luôn 1 chiếc nhé.";
const context = {
  text,
  sourceMessageId: "purchase-with-correction",
  productId: "CB182",
  evaluatedAt: new Date("2026-09-30T00:00:00.000Z"),
};

function correctionWithPurchase() {
  const empty = noCustomerSelection();
  return {
    ...empty,
    variant: {
      operation: "CHANGE", productId: "CB182", size: "L", color: null,
      evidenceText: "Đổi sang L",
    },
    salesSignals: {
      ...empty.salesSignals,
      buyingIntent: {
        decision: "COMMITTED", requestedAction: "OPEN_CART", quantity: 1,
        evidenceText: "lấy luôn 1 chiếc nhé", confidence: 0.99,
      },
    },
  };
}

function canonical(raw: unknown, source = context) {
  return customerInputCanonicalEvidence(source,
    bindRealtimeCustomerInput(raw, source.text)).buyingIntent;
}

describe("purchase intent alongside a variant correction", () => {
  it("preserves the independent purchase without granting business authority", () => {
    const value = bindRealtimeCustomerInput(correctionWithPurchase(), text);
    const before = structuredClone(value);
    const buying = customerInputCanonicalEvidence(context, value).buyingIntent;
    expect(buying).toMatchObject({
      decision: "COMMITTED", requestedAction: "OPEN_CART", quantity: 1,
      productId: "CB182", authorization: "NONE",
    });
    expect(buying.contributors).toEqual([
      "MODEL_STRUCTURED_OUTPUT", "SOURCE_BOUND_CUSTOMER_INPUT",
    ]);
    expect(buying.evidenceHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(value).toEqual(before);
  });

  it("does not invent a purchase for a correction alone", () => {
    const raw = { ...correctionWithPurchase(),
      salesSignals: noCustomerSelection().salesSignals };
    expect(canonical(raw, { ...context, text: "Đổi sang L" })).toMatchObject({
      decision: "NONE", requestedAction: "NONE", quantity: null,
      productId: null, contributors: [], evidenceHash: null, authorization: "NONE",
    });
  });

  it("retains a conditional offer as considering, never a cart command", () => {
    const raw = { ...correctionWithPurchase(), salesSignals: {
      ...noCustomerSelection().salesSignals,
      buyingIntent: {
        decision: "CONSIDERING", requestedAction: "NONE", quantity: null,
        evidenceText: "500k thì chị lấy", confidence: 0.99,
      },
    } };
    expect(canonical(raw, { ...context, text: "Đổi sang L, 500k thì chị lấy." }))
      .toMatchObject({ decision: "CONSIDERING", requestedAction: "NONE",
        quantity: null, productId: null, authorization: "NONE" });
  });

  it("keeps the confidence gate even when a purchase clause is present", () => {
    const raw = correctionWithPurchase();
    raw.salesSignals.buyingIntent.confidence = 0.89;
    expect(canonical(raw)).toMatchObject({ decision: "NONE",
      requestedAction: "NONE", quantity: null, contributors: [], evidenceHash: null });
  });

  it("does not forward a purchase on a human-owned routing request", () => {
    const raw = { ...correctionWithPurchase(), route: "HUMAN",
      routeEvidence: "nhờ nhân viên hỗ trợ" };
    expect(canonical(raw, { ...context, text: `${text} nhờ nhân viên hỗ trợ` }))
      .toMatchObject({ decision: "NONE", requestedAction: "NONE", quantity: null });
  });

  it("rejects purchase evidence copied from another turn", () => {
    const raw = correctionWithPurchase();
    raw.salesSignals.buyingIntent.evidenceText = "chốt giúp chị mẫu cũ";
    expect(() => canonical(raw)).toThrow("CUSTOMER_INPUT_UNBOUND_EVIDENCE");
  });

  it("does not allow a corrected variant to authorize another product", () => {
    expect(() => canonical(correctionWithPurchase(), { ...context, productId: "OTHER" }))
      .toThrow("CUSTOMER_INPUT_PRODUCT_MISMATCH");
  });
});
