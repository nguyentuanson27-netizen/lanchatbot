import { describe, expect, it } from "vitest";
import { updateSessionDecisionContext } from "./realtime-session-decision-context.js";

describe("customer-reported session decision context", () => {
  it("keeps a budget and occasion beyond the dialogue window, then applies corrections", () => {
    const first = updateSessionDecisionContext(undefined,
      "Ngân sách của chị khoảng 700k, mặc đi tiệc.");
    expect(first).toEqual({
      budgetVnd: 700_000, occasion: "PARTY", rejectedProductIds: [],
    });
    const later = updateSessionDecisionContext(first,
      "Không đi tiệc nữa, chị mặc đi làm. Ngân sách đổi thành 800k.");
    expect(later).toEqual({
      budgetVnd: 800_000, occasion: "WORK", rejectedProductIds: [],
    });
    expect(updateSessionDecisionContext(later, "Mẫu CB182 giá 799k phải không?"))
      .toEqual(later);
  });

  it("keeps only explicit rejected codes and permits choosing one again", () => {
    const first = updateSessionDecisionContext(undefined,
      "Chị không lấy CB182, bỏ mẫu SV9031 nhé.");
    expect(first.rejectedProductIds).toEqual(["CB182", "SV9031"]);
    const revised = updateSessionDecisionContext(first, "Chị chọn lại CB182.");
    expect(revised.rejectedProductIds).toEqual(["SV9031"]);
    expect(updateSessionDecisionContext(revised, "không giới hạn ngân sách").budgetVnd)
      .toBeNull();
  });
});
