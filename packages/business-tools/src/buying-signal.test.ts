import { describe, expect, it } from "vitest";
import { containsBuyingSignal, detectBuyingSignal } from "./buying-signal.js";

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
  ])("does not turn a non-purchase message into a buying signal: %s", (text) => {
    expect(containsBuyingSignal(text, { hasProductContext: true })).toBe(false);
  });

  it("returns bounded reason codes without retaining customer text", () => {
    expect(detectBuyingSignal("Ok lấy size M nhé", { hasProductContext: true })).toEqual({
      isBuyingSignal: true,
      reasons: ["CONFIRMED_SIZE", "DIRECT_PURCHASE_VERB"],
    });
  });
});
