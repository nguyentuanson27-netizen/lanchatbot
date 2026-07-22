import { describe, expect, it } from "vitest";
import { classifyUpsaleMessage, normalizeUpsaleText } from "./upsale.js";

describe("upsale message classification", () => {
  it.each([
    [
      "🔥 CHỊ ƠI THẬT NGẠI EM SỢ LÀM PHIỀN CHỊ, mẫu chị xem đang có ưu đãi.",
      "UPSALE_FOLLOWUP_01",
    ],
    [
      "Mở đầu\n\t em nhắn lại xem mình còn cần tư vấn về sản phẩm không ạ? Ib em nhé.",
      "UPSALE_FOLLOWUP_02",
    ],
    [
      "Hôm trước mình có hỏi về sản phẩm, shop chưa thấy mình phản hồi lại — mẫu vẫn còn ạ.",
      "UPSALE_FOLLOWUP_03",
    ],
  ])("matches a fragment with arbitrary prefix/suffix: %s", (text, templateId) => {
    expect(classifyUpsaleMessage(text)).toMatchObject({ templateId });
  });

  it("normalizes decomposed Unicode, case, zero-width characters and whitespace", () => {
    const decomposed = "  CHỊ ƠI\u200B   THẬT NGẠI EM SỢ LÀM PHIỀN CHỊ  ";
    expect(normalizeUpsaleText(decomposed)).toBe(
      "chị ơi thật ngại em sợ làm phiền chị",
    );
    expect(classifyUpsaleMessage(decomposed)?.templateId).toBe("UPSALE_FOLLOWUP_01");
  });

  it.each([
    null,
    "",
    "chị ơi mẫu này còn size M không ạ?",
    "em nhắn lại địa chỉ nhận hàng giúp shop ạ",
    "hôm trước mình có hỏi về đơn hàng đang giao",
  ])("does not classify ordinary conversation text: %s", (text) => {
    expect(classifyUpsaleMessage(text)).toBeNull();
  });
});
