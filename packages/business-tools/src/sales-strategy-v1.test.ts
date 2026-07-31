import { describe, expect, it } from "vitest";
import type { AgentProposalV1 } from "@lana/contracts";
import {
  applyWave2ReplyPolicy,
  decideWave2SalesStrategy,
  type Wave2StrategyInput,
} from "./sales-strategy-v1.js";

const baseInput: Wave2StrategyInput = {
  text: "mẫu này đẹp",
  salesStage: "PRODUCT_MATCHED",
  objectionType: "NONE",
  buyingSignal: false,
  hasVerifiedProduct: true,
  resolvedProductCount: 1,
  hasMeasurements: false,
};

const proposal: AgentProposalV1 = {
  schemaVersion: 1,
  intent: "PRODUCT_INFO",
  conversationStage: "PRODUCT_MATCHED",
  productId: "SD395",
  action: "REPLY",
  reply: "Mẫu này giữ form mềm và dễ mặc.",
  attachments: [],
  handoffReason: null,
  businessFactQuery: {
    intent: "NONE",
    offerType: null,
    color: null,
    size: null,
    deliveryRegion: null,
  },
};

describe("Wave 2 sales strategy v1", () => {
  it("selects verified proof for a trust barrier", () => {
    const decision = decideWave2SalesStrategy({
      ...baseInput,
      text: "có giống hình không, cho chị xem ảnh thật",
      objectionType: "TRUST_POLICY",
    });
    expect(decision.barrier).toBe("BARRIER_TRUST");
    expect(decision.recommendedStrategy).toBe("STRATEGY_SHOW_PROOF");
    expect(decision.ctaPolicy).toBe("ASK_PROOF_PREFERENCE");
  });

  it("never opens a new checkout for post-sale", () => {
    const decision = decideWave2SalesStrategy({
      ...baseInput,
      text: "chị muốn đổi đơn đã nhận",
      salesStage: "POST_SALE",
      buyingSignal: true,
    });
    expect(decision.playbook.allowedStrategies).toEqual([]);
    expect(decision.playbook.forbiddenActions).toContain("OPEN_NEW_CHECKOUT");
    expect(decision.ctaPolicy).toBe("NO_ADDITIONAL_CTA");
  });

  it("reduces choice overload to one high-value question", () => {
    const decision = decideWave2SalesStrategy({
      ...baseInput,
      text: "nhiều quá chị không biết chọn mẫu nào",
      objectionType: "NEED_COMPARE",
      resolvedProductCount: 3,
    });
    const rewritten = applyWave2ReplyPolicy(
      { ...proposal, reply: "C thích mẫu nào? C muốn màu gì? C cần mặc dịp nào?" },
      decision,
    );
    expect((rewritten.reply.match(/\?/gu) ?? []).length).toBe(1);
  });

  it("adds proactive size CTA without requesting order PII", () => {
    const decision = decideWave2SalesStrategy(baseInput);
    const rewritten = applyWave2ReplyPolicy(proposal, decision);
    expect(rewritten.reply).toContain("cao và nặng khoảng bao nhiêu");
    expect((rewritten.reply.match(/\?/gu) ?? []).length).toBe(1);
    expect(rewritten.reply).not.toMatch(/số điện thoại|địa chỉ/iu);
  });

  it("does not ask for measurements again when the profile already has them", () => {
    const decision = decideWave2SalesStrategy({
      ...baseInput,
      hasMeasurements: true,
    });
    const rewritten = applyWave2ReplyPolicy(proposal, decision);
    expect(rewritten.reply).toContain("muốn em đối chiếu size phù hợp");
    expect(rewritten.reply).not.toContain("cao và nặng khoảng bao nhiêu");
    expect((rewritten.reply.match(/\?/gu) ?? []).length).toBe(1);
  });

  it("does not add a continuation question after a committed buying signal", () => {
    const decision = decideWave2SalesStrategy({
      ...baseInput,
      text: "làm đơn mẫu này cho chị",
      buyingSignal: true,
    });
    const rewritten = applyWave2ReplyPolicy(proposal, decision);
    expect(decision.ctaPolicy).toBe("NO_ADDITIONAL_CTA");
    expect(rewritten.reply).toBe(proposal.reply);
    expect(rewritten.reply).not.toContain("?");
  });

  it("accepts high-confidence model analysis only as a bounded fallback", () => {
    const decision = decideWave2SalesStrategy({
      ...baseInput,
      hasVerifiedProduct: false,
      text: "tư vấn giúp chị",
      salesStage: "DISCOVERY",
      modelAnalysis: {
        need: "NEED_OCCASION",
        barrier: "NONE",
        decisionFactor: "OCCASION",
        recommendedStrategy: "STRATEGY_RECOMMEND_PRODUCT",
        confidence: 0.91,
        evidence: ["TEXT_OCCASION"],
      },
    });
    expect(decision.need).toBe("NEED_OCCASION");
    expect(decision.evidence).toContain("MODEL_ANALYSIS_ACCEPTED");
    expect(decision.recommendedStrategy).toBe("STRATEGY_RECOMMEND_PRODUCT");
  });

  it("does not trust low-confidence model analysis", () => {
    const decision = decideWave2SalesStrategy({
      ...baseInput,
      text: "tư vấn giúp chị",
      modelAnalysis: {
        need: "NEED_BUDGET",
        barrier: "BARRIER_PRICE",
        decisionFactor: "BUDGET",
        recommendedStrategy: "STRATEGY_ANSWER_OBJECTION",
        confidence: 0.4,
        evidence: ["TEXT_BUDGET"],
      },
    });
    expect(decision.need).toBe("NOT_ENOUGH_CONTEXT");
    expect(decision.barrier).toBe("NONE");
  });
});
