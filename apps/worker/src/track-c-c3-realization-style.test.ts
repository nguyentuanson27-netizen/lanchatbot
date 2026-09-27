import { describe, expect, it } from "vitest";
import { trackCComposeReply, trackCRealizationMatches } from "./track-c-c3-realization-style.js";

describe("C3 editorial realization", () => {
  it("reduces repeated politeness without deleting material, names or policy conditions", () => {
    const source = "Mẫu Dạ Hương có chất liệu vải dạ ạ.";
    expect(trackCRealizationMatches("Dạ, Mẫu Dạ Hương có chất liệu vải dạ.", source)).toBe(true);
    expect(trackCComposeReply([
      "Giá hiện tại của mẫu này là 849.000đ ạ.", source,
      "Chị thích màu nào hơn ạ?",
    ])).toBe("Giá hiện tại của mẫu này là 849.000đ. Mẫu Dạ Hương có chất liệu vải dạ. Chị thích màu nào hơn ạ?");
    expect(trackCRealizationMatches("Hương có chất liệu vải dạ.", "Dạ Hương có chất liệu vải dạ.")).toBe(false);
  });

  it.each([
    ["Giá là 849.000đ ạ.", "Giá là 849,000đ."],
    ["Giá là 849.000đ ạ.", "Giá là 699.000đ."],
    ["Mẫu này chưa nhận chỉnh sửa ạ.", "Mẫu này nhận chỉnh sửa."],
    ["Shop hoàn tiền khi lỗi sản xuất hoặc giao sai ạ.", "Shop hoàn tiền khi lỗi sản xuất và giao sai."],
    ["Shop đổi trong 7 ngày, còn tem ạ.", "Shop đổi trong 7 ngày."],
    ["Mẫu A có chất liệu vải dạ ạ.", "Mẫu B có chất liệu vải dạ."],
    ["Mẫu này có chất liệu vải dạ ạ.", "Mẫu này có chất liệu vải dạ cao cấp."],
    ["Size phù hợp là M ạ.", "Size phù hợp là M. Em đã tạo đơn."],
  ])("rejects a meaning change: %s", (source, candidate) => {
    expect(trackCRealizationMatches(candidate, source)).toBe(false);
  });
});
