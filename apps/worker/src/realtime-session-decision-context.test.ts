import { describe, expect, it } from "vitest";
import type { AgentSessionIntentV1 } from "@lana/contracts";
import { updateSessionDecisionContext,
  updateSessionDecisionContextFromModel } from "./realtime-session-decision-context.js";

const noChange: AgentSessionIntentV1 = {
  budget: { operation: "KEEP", amountVnd: null, evidenceText: null, confidence: 0 },
  occasion: { operation: "KEEP", value: null, evidenceText: null, confidence: 0 },
  productDecisions: [],
};

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

  it("binds same-turn budget, occasion and rejection to exact customer clauses", () => {
    const text = "Ngân sách tối đa 700k, chị mặc đi làm. Không lấy CB182 nữa.";
    const updated = updateSessionDecisionContextFromModel(undefined, text, {
      budget: { operation: "SET", amountVnd: 700_000,
        evidenceText: "Ngân sách tối đa 700k", confidence: 0.99 },
      occasion: { operation: "SET", value: "WORK",
        evidenceText: "mặc đi làm", confidence: 0.99 },
      productDecisions: [{ operation: "REJECT", productId: "CB182",
        evidenceText: "Không lấy CB182", confidence: 0.99 }],
    });
    expect(updated).toEqual({ budgetVnd: 700_000, occasion: "WORK",
      rejectedProductIds: ["CB182"] });
    expect(updateSessionDecisionContextFromModel(updated, "Chị chọn lại CB182.", {
      ...noChange,
      productDecisions: [{ operation: "RESTORE", productId: "CB182",
        evidenceText: "chọn lại CB182", confidence: 0.99 }],
    }).rejectedProductIds).toEqual([]);
  });

  it("rejects unsupported model updates and keeps bộ distinct from bỏ", () => {
    const prior = { budgetVnd: 600_000, occasion: "PARTY" as const,
      rejectedProductIds: [] };
    const result = updateSessionDecisionContextFromModel(prior,
      "Bộ LN123 giá 700k hơi cao. Chị không bỏ CB182.", {
        budget: { operation: "SET", amountVnd: 700_000,
          evidenceText: "giá 700k hơi cao", confidence: 0.99 },
        occasion: noChange.occasion,
        productDecisions: [
          { operation: "REJECT", productId: "LN123",
            evidenceText: "Bộ LN123", confidence: 0.99 },
          { operation: "REJECT", productId: "CB182",
            evidenceText: "không bỏ CB182", confidence: 0.99 },
        ],
      });
    expect(result).toEqual(prior);
    expect(updateSessionDecisionContextFromModel(prior, "Ngân sách 700k", {
      ...noChange, budget: { operation: "SET", amountVnd: 800_000,
        evidenceText: "Ngân sách 700k", confidence: 0.99 },
    })).toEqual(prior);
  });
});
