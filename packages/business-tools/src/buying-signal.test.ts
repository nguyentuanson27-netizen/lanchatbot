import { describe, expect, it } from "vitest";
import {
  containsBuyingSignal,
  detectBuyingSignal,
  resolveHybridBuyingSignal,
} from "./buying-signal.js";

describe("buying-signal detection", () => {
  it.each([
    "Ok lấy màu đen",
    "Chốt mẫu này",
    "Ship cho chị mẫu trên",
    "chị lấy áo thôi",
    "cảm ơn, lấy size L",
    "chot mau nay",
  ])("detects an explicit buying signal: %s", (text) => {
    expect(containsBuyingSignal(text, { hasProductContext: true })).toBe(true);
  });

  it.each([
    "Được, size M nhé",
    "ok màu đen",
    "màu kem nha",
  ])("uses verified product context for a confirmed selection: %s", (text) => {
    expect(containsBuyingSignal(text, { hasProductContext: true })).toBe(true);
    expect(containsBuyingSignal(text, { hasProductContext: false })).toBe(false);
  });

  it.each([
    "dạ em cảm ơn shop",
    "ok em",
    "không lấy đâu",
    "chưa chốt nha",
    "để chị xem thêm",
    "lấy ảnh cận chất",
    "phí ship bao nhiêu",
    "còn size M không",
    "Mẫu này mặc đi làm được không?",
  ])("does not turn a non-purchase message into a buying signal: %s", (text) => {
    expect(containsBuyingSignal(text, { hasProductContext: true })).toBe(false);
  });

  it("returns bounded reason codes without retaining customer text", () => {
    expect(detectBuyingSignal("Ok lấy size M nhé", { hasProductContext: true })).toEqual({
      isBuyingSignal: true,
      reasons: ["CONFIRMED_SIZE", "DIRECT_PURCHASE_VERB"],
    });
  });

  it.each([
    ["làm đơn mẫu này cho mình", "OPEN_CART", null],
    ["gửi mẫu này về Hà Nội giúp chị", "OPEN_CART", null],
    ["cho mình hai cái giống nhau", "SET_QUANTITY", 2],
    ["xin số tài khoản để chuyển luôn", "PROCEED_TO_PAYMENT", null],
  ] as const)("accepts guarded model evidence for long-tail purchase language: %s", (
    text,
    requestedAction,
    quantity,
  ) => {
    expect(resolveHybridBuyingSignal(
      text,
      { hasProductContext: true },
      {
        decision: "COMMITTED",
        requestedAction,
        quantity,
        evidenceText: text,
        confidence: 0.96,
      },
    )).toMatchObject({
      isBuyingSignal: true,
      reasons: ["MODEL_BUYING_COMMITTED"],
      decision: "COMMITTED",
      source: "MODEL_STRUCTURED_OUTPUT",
      quantity,
    });
  });

  it("does not accept model buying evidence without verified product context", () => {
    const text = "làm đơn mẫu này cho mình";
    expect(resolveHybridBuyingSignal(text, { hasProductContext: false }, {
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: null,
      evidenceText: text,
      confidence: 0.99,
    }).isBuyingSignal).toBe(false);
  });

  it.each([
    ["mẫu này giá bao nhiêu?", "mẫu này giá bao nhiêu?", 0.99],
    ["làm đơn mẫu này cho mình", "mẫu khác", 0.99],
    ["làm đơn mẫu này cho mình", "làm đơn mẫu này cho mình", 0.72],
  ] as const)("rejects unsafe or weak model commitment evidence: %s", (
    text,
    evidenceText,
    confidence,
  ) => {
    expect(resolveHybridBuyingSignal(text, { hasProductContext: true }, {
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: null,
      evidenceText,
      confidence,
    }).isBuyingSignal).toBe(false);
  });

  it("resolves deterministic/model conflict to the less aggressive model rejection", () => {
    expect(resolveHybridBuyingSignal("chốt mẫu này", { hasProductContext: true }, {
      decision: "NEGATED",
      requestedAction: "NONE",
      quantity: null,
      evidenceText: "chốt mẫu này",
      confidence: 0.99,
    })).toMatchObject({
      isBuyingSignal: false,
      reasons: ["MODEL_BUYING_NEGATED", "MODEL_DETERMINISTIC_CONFLICT_LESS_AGGRESSIVE"],
      decision: "NEGATED",
      source: "MODEL_STRUCTURED_OUTPUT",
    });
  });

  it("treats a lower-confidence exact conflict as ambiguity and still avoids escalation", () => {
    expect(resolveHybridBuyingSignal("chốt mẫu này", { hasProductContext: true }, {
      decision: "CONSIDERING",
      requestedAction: "NONE",
      quantity: null,
      evidenceText: "chốt mẫu này",
      confidence: 0.55,
    })).toMatchObject({
      isBuyingSignal: false,
      reasons: ["MODEL_BUYING_CONSIDERING", "MODEL_DETERMINISTIC_CONFLICT_LESS_AGGRESSIVE"],
      decision: "CONSIDERING",
      source: "MODEL_STRUCTURED_OUTPUT",
    });
  });

  it("retains a structured requested action when deterministic evidence corroborates commitment", () => {
    expect(resolveHybridBuyingSignal("chốt 2 set mẫu này", { hasProductContext: true }, {
      decision: "COMMITTED",
      requestedAction: "SET_QUANTITY",
      quantity: 2,
      evidenceText: "chốt 2 set mẫu này",
      confidence: 0.99,
    })).toEqual({
      isBuyingSignal: true,
      reasons: ["DIRECT_PURCHASE_VERB", "MODEL_BUYING_COMMITTED"],
      decision: "COMMITTED",
      source: "MODEL_STRUCTURED_OUTPUT",
      quantity: 2,
    });
  });

  it("keeps the existing deterministic identity when the model only echoes OPEN_CART", () => {
    expect(resolveHybridBuyingSignal("chốt mẫu này", { hasProductContext: true }, {
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: null,
      evidenceText: "chốt mẫu này",
      confidence: 0.99,
    })).toEqual({
      isBuyingSignal: true,
      reasons: ["DIRECT_PURCHASE_VERB"],
      decision: "COMMITTED",
      source: "DETERMINISTIC",
      quantity: null,
    });
  });
});
