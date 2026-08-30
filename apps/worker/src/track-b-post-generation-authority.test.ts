import { describe, expect, it, vi } from "vitest";
import {
  applyWave2ReplyPolicy,
  decideWave2SalesStrategy,
} from "@lana/business-tools";
import type { AgentProposalV1 } from "@lana/contracts";
import {
  finalizeLegacyRealtimePostGenerationReply,
  finalizeModelOwnedRealtimePostGenerationReply,
  postGenerationWordingAuthority,
  resolveCommercePostGenerationAuthority,
  resolveLegacyPostGenerationAuthority,
} from "./realtime-reply-differential.js";

const modelProposal: AgentProposalV1 = {
  schemaVersion: 1,
  intent: "product_advice",
  conversationStage: "consulting",
  productId: "SV695",
  action: "REPLY",
  reply: "Chị muốn mặc đi làm hay đi tiệc ạ? Chị thích form ôm hay suông nhé?",
  attachments: [],
  handoffReason: null,
  strategyAnalysis: {
    need: "NEED_OCCASION",
    barrier: "NONE",
    decisionFactor: "OCCASION",
    recommendedStrategy: "STRATEGY_ASK_CLARIFY",
    confidence: 0.95,
    evidence: ["TEXT_OCCASION"],
  },
  businessFactQuery: {
    intent: "NONE",
    offerType: null,
    color: null,
    size: null,
    deliveryRegion: null,
  },
};

const deterministicDecision = decideWave2SalesStrategy({
  text: "Tư vấn giúp chị",
  salesStage: "DISCOVERY",
  objectionType: "NONE",
  buyingSignal: false,
  hasVerifiedProduct: true,
  resolvedProductCount: 1,
  hasMeasurements: false,
  requestedProof: null,
  modelAnalysis: modelProposal.strategyAnalysis ?? null,
});

describe("Track B B2.4 post-generation authority reachability", () => {
  it("selects model wording only for admitted COMMERCE and preserves LEGACY rollback", () => {
    expect(postGenerationWordingAuthority("COMMERCE_SELECTED")).toBe("MODEL");
    expect(postGenerationWordingAuthority("LEGACY_SELECTED")).toBe(
      "LEGACY_DETERMINISTIC",
    );
  });

  it("does not invoke the second deterministic strategy decision on COMMERCE", () => {
    const applyLegacyDeterministic = vi.fn(() => ({
      proposal: { ...modelProposal, reply: "deterministically rewritten" },
      strategyDecision: deterministicDecision,
    }));

    const adversarialCommerceInput = {
      proposal: modelProposal,
      modelStrategyAnalysis: modelProposal.strategyAnalysis ?? null,
      applyLegacyDeterministic,
    };
    expect(resolveCommercePostGenerationAuthority(adversarialCommerceInput)).toEqual({
      wordingAuthority: "MODEL",
      strategyAuthority: "MODEL_STRUCTURED_OUTPUT",
      proposal: modelProposal,
      modelStrategyAnalysis: modelProposal.strategyAnalysis,
      deterministicStrategyDecision: null,
    });
    expect(applyLegacyDeterministic).not.toHaveBeenCalled();
  });

  it("runs the existing deterministic strategy/rewrite only for LEGACY rollback", () => {
    const rewritten = { ...modelProposal, reply: "legacy rewrite" };
    const applyLegacyDeterministic = vi.fn(() => ({
      proposal: rewritten,
      strategyDecision: deterministicDecision,
    }));

    expect(resolveLegacyPostGenerationAuthority({
      proposal: modelProposal,
      applyLegacyDeterministic,
    })).toEqual({
      wordingAuthority: "LEGACY_DETERMINISTIC",
      strategyAuthority: "LEGACY_DETERMINISTIC",
      proposal: rewritten,
      modelStrategyAnalysis: null,
      deterministicStrategyDecision: deterministicDecision,
    });
    expect(applyLegacyDeterministic).toHaveBeenCalledOnce();
  });

  it("ships valid model wording without deterministic question truncation or CTA append", () => {
    const applyLegacyDeterministic = vi.fn((proposal: AgentProposalV1) => ({
      proposal: applyWave2ReplyPolicy(proposal, deterministicDecision),
      strategyDecision: deterministicDecision,
    }));
    const shipped = resolveCommercePostGenerationAuthority({
      proposal: modelProposal,
      modelStrategyAnalysis: modelProposal.strategyAnalysis ?? null,
    });

    expect(shipped.proposal).toBe(modelProposal);
    expect(shipped.proposal.reply).toBe(modelProposal.reply);
    expect((shipped.proposal.reply.match(/\?/gu) ?? [])).toHaveLength(2);
    expect(applyLegacyDeterministic).not.toHaveBeenCalled();
  });

  it("retains the deterministic reply policy for LEGACY rollback", () => {
    const shipped = applyWave2ReplyPolicy(modelProposal, deterministicDecision);

    expect(shipped.reply).not.toBe(modelProposal.reply);
    expect((shipped.reply.match(/\?/gu) ?? [])).toHaveLength(1);
  });

  it("keeps grouping shape without deleting valid model politeness", () => {
    expect(finalizeModelOwnedRealtimePostGenerationReply({
      mode: "GROUP_V2",
      splitProductInfoFollowUp: true,
      messages: [{
        kind: "TEXT",
        text: "Giá 770.000đ ạ.\n\nChị xem thêm ảnh nhé ạ.",
      }],
    }).messages).toEqual([
      { kind: "TEXT", text: "Giá 770.000đ ạ." },
      { kind: "TEXT", text: "Chị xem thêm ảnh nhé ạ." },
    ]);
  });

  it("keeps normal model advice in one outbound unit when follow-up splitting is off", () => {
    expect(finalizeModelOwnedRealtimePostGenerationReply({
      mode: "GROUP_V2",
      splitProductInfoFollowUp: false,
      messages: [{
        kind: "TEXT",
        text: "Mẫu này hợp đi làm ạ.\n\nChị thích form ôm hay suông nhé?",
      }],
    }).messages).toEqual([{
      kind: "TEXT",
      text: "Mẫu này hợp đi làm ạ.\n\nChị thích form ôm hay suông nhé?",
    }]);
  });

  it("keeps deterministic wording cleanup reachable only through the LEGACY finalizer", () => {
    const messages = [{
      kind: "TEXT" as const,
      text: "Chị xem mẫu này nhé ạ. Chị chọn giúp em nhé ạ.",
    }];

    expect(finalizeModelOwnedRealtimePostGenerationReply({
      mode: "GROUP_V2",
      messages,
    }).messages).toEqual(messages);
    expect(finalizeLegacyRealtimePostGenerationReply({
      mode: "GROUP_V2",
      messages,
    }).messages).toEqual([{
      kind: "TEXT",
      text: "Chị xem mẫu này nhé ạ. Chị chọn giúp em.",
    }]);
  });

  it("does not expose a COMMERCE delivery fallback to legacy copy cleanup", () => {
    const commerceSalesMessages = [{
      kind: "TEXT" as const,
      text: "Giỏ hàng đã cập nhật nhé ạ. Tổng tiền đã xác minh nhé ạ.",
    }];

    expect(finalizeModelOwnedRealtimePostGenerationReply({
      mode: "GROUP_V2",
      messages: commerceSalesMessages,
    }).messages).toEqual(commerceSalesMessages);
  });
});
