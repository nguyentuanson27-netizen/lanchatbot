import { describe, expect, it } from "vitest";
import { ConversationRedactor, hasResidualPii } from "./redact.js";

describe("ConversationRedactor", () => {
  it("redacts a phone number to a stable placeholder within a conversation", () => {
    const redactor = new ConversationRedactor();
    const a = redactor.redact("sđt em là 0912345678 nhé");
    const b = redactor.redact("gọi lại 0912345678 giúp em");
    expect(a).toContain("[PHONE_1]");
    expect(b).toContain("[PHONE_1]");
    expect(a).not.toContain("0912345678");
    expect(redactor.report().counts.PHONE).toBe(1);
  });

  it("assigns different placeholders to different phone numbers", () => {
    const redactor = new ConversationRedactor();
    const text = redactor.redact("số 1 là 0912345678, số 2 là 0987654321");
    expect(text).toContain("[PHONE_1]");
    expect(text).toContain("[PHONE_2]");
  });

  it("redacts email, url, address and order id", () => {
    const redactor = new ConversationRedactor();
    const out = redactor.redact(
      [
        "mail a@lana.vn",
        "xem https://shopee.vn/abc",
        "địa chỉ: 12 Nguyễn Trãi, Hà Nội",
        "mã đơn DH12345",
      ].join("\n"),
    );
    expect(out).toContain("[EMAIL_1]");
    expect(out).toContain("[URL_1]");
    expect(out).toContain("[ADDRESS_1]");
    expect(out).toContain("[ORDER_ID_1]");
    expect(out).not.toContain("Nguyễn Trãi");
  });

  it("materialises format-preserving synthetic PII for benchmarks", () => {
    const redactor = new ConversationRedactor();
    const redacted = redactor.redact("sđt 0912345678");
    const synthetic = redactor.synthesize(redacted);
    expect(synthetic).toContain("0900000001");
    expect(synthetic).not.toContain("[PHONE_1]");
  });

  it("hasResidualPii detects a leaked long number", () => {
    expect(hasResidualPii("mã 123456789")).toBe(true);
    expect(hasResidualPii("[PHONE_1] ok")).toBe(false);
  });
});
