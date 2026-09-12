import { describe, expect, it } from "vitest";
import {
  constantTimeKeyMatches,
  redactAnalyticsMessage,
  redactAnalyticsText,
} from "./shadow-mirror.js";

describe("shadow mirror privacy helpers", () => {
  it("redacts direct identifiers before analytical persistence", () => {
    const redacted = redactAnalyticsText(
      "Họ tên: Nguyễn Văn A\nSĐT 0984997797 email lana@example.com\nĐịa chỉ: 12 Nguyễn Trãi, Tây Ninh\nCCCD: 012345678901",
    );
    expect(redacted).not.toContain("0984997797");
    expect(redacted).not.toContain("lana@example.com");
    expect(redacted).not.toContain("012345678901");
    expect(redacted).toContain("[PHONE]");
    expect(redacted).toContain("[EMAIL]");
    expect(redacted).toContain("[ID]");
  });

  it("keeps ordinary Vietnamese words that merely end in an address token", () => {
    for (const text of [
      "Trả lời đúng chính sách được cung cấp cho khách.",
      "Không khẳng định chất lượng cao cấp khi chưa có bằng chứng.",
      "Không trả lời lấp lửng về thời gian giao.",
    ]) {
      const result = redactAnalyticsMessage(text);
      expect(result.dlpStatus).toBe("PASSED");
      expect(result.text).toBe(text);
    }
  });

  it("still redacts a line naming a real address component", () => {
    for (const text of [
      "Ấp Tân Lợi, Tây Ninh",
      "Xã Tân Hưng",
      "Nhà em ở phường 5 nhé",
      "Giao tới thôn Đoài giúp chị",
    ]) {
      expect(redactAnalyticsText(text)).toBe("[ADDRESS]");
    }
  });

  it("keeps an address keyword that carries no address content", () => {
    // A customer asking where the shop is, or saying they already sent their
    // details, carries no identifier: erasing the line erased the question.
    for (const text of [
      "Shop ở Hà Nội địa chỉ đâu em?",
      "Tên, SĐT và địa chỉ chị gửi đủ ở trên rồi.",
      "Chị gửi em tên, số điện thoại và địa chỉ nhận hàng nhé.",
    ]) {
      const result = redactAnalyticsMessage(text);
      expect(result.dlpStatus).toBe("PASSED");
      expect(result.text).toBe(text);
    }
  });

  it("still redacts an address keyword followed by real address content", () => {
    for (const text of [
      "Địa chỉ: 12 Nguyễn Trãi, Tây Ninh",
      "địa chỉ nhà em ở ngõ Văn Chương nhé",
      "dia chi: chung cu Sunrise, quan 7",
    ]) {
      expect(redactAnalyticsText(text)).toBe("[ADDRESS]");
    }
  });

  it("compares internal keys without accepting different lengths", () => {
    expect(constantTimeKeyMatches("a".repeat(32), "a".repeat(32))).toBe(true);
    expect(constantTimeKeyMatches("a".repeat(32), "a".repeat(31))).toBe(false);
    expect(constantTimeKeyMatches("a".repeat(32), "b".repeat(32))).toBe(false);
  });

  it("redacts free-form identity, location, reference and long numeric values", () => {
    const result = redactAnalyticsMessage(
      "Nguyễn Văn An\nXã Tân Hưng, huyện Tân Châu\nGYHCK783\n012345678901",
    );
    expect(result.text).not.toContain("Nguyễn Văn An");
    expect(result.text).not.toContain("Tân Châu");
    expect(result.text).not.toContain("012345678901");
    expect(result.text).toContain("[NAME]");
    expect(result.text).toContain("[ADDRESS]");
    expect(result.text).toContain("[REFERENCE]");
  });
});
