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
      "Cho em xin địa chỉ store với ạ",
      "shop có mấy địa chỉ vậy em?",
    ]) {
      const result = redactAnalyticsMessage(text);
      expect(result.dlpStatus).toBe("PASSED");
      expect(result.text).toBe(text);
    }
  });

  it("judges the address keyword by its own clause, not the rest of the line", () => {
    // A digit belonging to an unrelated question is not address evidence.
    for (const text of [
      "địa chỉ đâu em, shop mở 9h?",
      "địa chỉ shop mình ở đâu ạ, em muốn qua thử đồ",
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

  it("still redacts an address declaration that carries no digit", () => {
    // The declaration is what matters, not the shape of the value: these carry
    // neither a house number nor an address-component token.
    for (const text of [
      "Địa chỉ: Tây Ninh",
      "địa chỉ em ở Tây Ninh",
      "địa chỉ nhà em là Nguyễn Trãi",
      "địa chỉ giao hàng của chị là Chung cư Sunrise",
    ]) {
      expect(redactAnalyticsText(text)).toBe("[ADDRESS]");
    }
  });

  it("redacts a declaration whatever its capitalization", () => {
    // Messenger input is routinely lowercase. Casing must never be part of the
    // privacy decision: what a word is cannot depend on how it was typed.
    for (const text of [
      "địa chỉ: tây ninh",
      "địa chỉ em ở tây ninh",
      "địa chỉ nhà em là nguyễn trãi",
      "dia chi nha em la 12 nguyen trai",
    ]) {
      expect(redactAnalyticsText(text)).toBe("[ADDRESS]");
    }
  });

  it("keeps a question that names an address component or a shop", () => {
    // Asking which district is not naming one, and a shop's own name is not
    // the customer's address - the question has to survive the line pass too.
    for (const text of [
      "địa chỉ shop ở quận nào em?",
      "địa chỉ shop ở đường nào em?",
      "shop mình ở quận mấy vậy ạ?",
      "Cho em xin địa chỉ Lana Store với ạ",
      "địa chỉ shop ghi trên page đúng không em?",
    ]) {
      const result = redactAnalyticsMessage(text);
      expect(result.dlpStatus).toBe("PASSED");
      expect(result.text).toBe(text);
    }
  });

  it("does not let a question word rescue a line that names a real address", () => {
    for (const text of [
      "Ấp Tân Lợi, quận nào em?",
      "địa chỉ em không phải là 12 Nguyễn Trãi đâu",
    ]) {
      expect(redactAnalyticsText(text)).toBe("[ADDRESS]");
    }
  });

  it.each([
    "Giờ chị đang ngoài đường chưa đo được.",
    "Địa chỉ chi tiết chị gửi lúc đặt sau.",
    "Chị cần nói tỉnh/thành trước đúng không?",
    "Địa chỉ để chị hỏi chồng xem nhận ở nhà hay công ty.",
    "hiện còn địa chỉ nhận và cách thanh toán chị nhé.",
    "Em đang ngoài đường nên chưa thử được.",
    "Địa chỉ nhận hàng mình bổ sung khi chốt đơn.",
    "Anh chưa chọn địa chỉ giao hàng.",
    "Shop cần tỉnh/thành để tra thời gian giao.",
  ])("preserves an address field mention without a location value: %s", (text) => {
    const result = redactAnalyticsMessage(text);
    expect(result).toEqual({ text, dlpStatus: "PASSED" });
  });

  it.each([
    "địa chỉ: tân bình",
    "địa chỉ nhận hàng ở tân bình",
    "địa chỉ chi tiết chị gửi là tân bình",
    "Địa chỉ để chị hỏi chồng xem nhận ở đường tân bình.",
    "hiện còn địa chỉ nhận ở phường tân bình và cách thanh toán chị nhé.",
    "Chị cần nói tỉnh/thành trước: tỉnh đồng nai",
    "Giờ chị đang ngoài đường lê lợi chưa đo được.",
    "địa chỉ nhận hàng mình bổ sung khi chốt đơn: tân bình",
    "Địa chỉ nhà hay công ty: nguyễn trãi",
    "Địa chỉ để nhận hàng là tân bình",
    "giao tới xã tân phú giúp chị",
    "Chị ở đường lê lợi, hỏi quận nào được không?",
    "địa chỉ: chi tiết chị gửi lúc đặt sau",
    "Địa chỉ chi tiết chị gửi lúc đặt sau. Địa chỉ: tân bình",
    "Địa chỉ để chị hỏi chồng xem nhận ở nhà hay công ty; tân bình",
    "Địa chỉ chi tiết chị gửi lúc đặt sau: tân bình",
    "Địa chỉ chi tiết chị gửi lúc đặt sau, tân bình",
  ])("redacts an actual address even alongside a field discussion: %s", (text) => {
    const result = redactAnalyticsText(text);
    expect(result).toContain("[ADDRESS]");
    for (const privateValue of ["tân bình", "đồng nai", "lê lợi", "nguyễn trãi", "tân phú"]) {
      expect(result.toLocaleLowerCase("vi")).not.toContain(privateValue);
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
