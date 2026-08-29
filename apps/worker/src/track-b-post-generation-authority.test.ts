import { describe, expect, it, vi } from "vitest";
import {
  applyWave2ReplyPolicy,
  decideWave2SalesStrategy,
} from "@lana/business-tools";
import type { AgentProposalV1 } from "@lana/contracts";
import {
  compareRealtimeReplySnapshots,
  finalizeRealtimePostGenerationReply,
  postGenerationWordingAuthority,
  resolveRealtimePostGenerationAuthority,
  type RealtimeReplySnapshot,
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

function snapshot(overrides: Partial<RealtimeReplySnapshot> = {}): RealtimeReplySnapshot {
  return {
    messages: [{ kind: "TEXT", text: modelProposal.reply }],
    strategyHash: "strategy:model",
    verifiedFactHashes: ["fact:price:sv695"],
    verifiedMediaUrls: [],
    protectedClaimHashes: ["claim:price:sv695"],
    effectAuthorizationHashes: [],
    commitOutcome: "COMMITTED",
    generationOutcome: "VALID",
    inboxOutcome: "COMMITTED",
    protectedOutbound: {
      required: true,
      groupId: "response:turn-1",
      plannedMessageCount: 1,
      deliveredMessageCount: 1,
    },
    ...overrides,
  };
}

describe("Track B B2.2 post-generation model authority", () => {
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

    expect(resolveRealtimePostGenerationAuthority({
      runtimeAuthority: "COMMERCE_SELECTED",
      proposal: modelProposal,
      modelStrategyAnalysis: modelProposal.strategyAnalysis ?? null,
      applyLegacyDeterministic,
    })).toEqual({
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

    expect(resolveRealtimePostGenerationAuthority({
      runtimeAuthority: "LEGACY_SELECTED",
      proposal: modelProposal,
      modelStrategyAnalysis: modelProposal.strategyAnalysis ?? null,
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
    const shipped = applyWave2ReplyPolicy(modelProposal, deterministicDecision, {
      wordingAuthority: "MODEL",
    });

    expect(shipped).toBe(modelProposal);
    expect(shipped.reply).toBe(modelProposal.reply);
    expect((shipped.reply.match(/\?/gu) ?? [])).toHaveLength(2);
  });

  it("retains the deterministic reply policy for LEGACY rollback", () => {
    const shipped = applyWave2ReplyPolicy(modelProposal, deterministicDecision, {
      wordingAuthority: "LEGACY_DETERMINISTIC",
    });

    expect(shipped.reply).not.toBe(modelProposal.reply);
    expect((shipped.reply.match(/\?/gu) ?? [])).toHaveLength(1);
  });

  it("keeps grouping shape without deleting valid model politeness", () => {
    expect(finalizeRealtimePostGenerationReply({
      mode: "GROUP_V2",
      wordingAuthority: "MODEL",
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

  it("runs r31.3 differential on the live-path authority seam outputs", () => {
    const legacy = resolveRealtimePostGenerationAuthority({
      runtimeAuthority: "LEGACY_SELECTED",
      proposal: modelProposal,
      modelStrategyAnalysis: modelProposal.strategyAnalysis ?? null,
      applyLegacyDeterministic: (proposal) => ({
        proposal: applyWave2ReplyPolicy(proposal, deterministicDecision, {
          wordingAuthority: "LEGACY_DETERMINISTIC",
        }),
        strategyDecision: deterministicDecision,
      }),
    });
    const migrated = resolveRealtimePostGenerationAuthority({
      runtimeAuthority: "COMMERCE_SELECTED",
      proposal: modelProposal,
      modelStrategyAnalysis: modelProposal.strategyAnalysis ?? null,
      applyLegacyDeterministic: () => {
        throw new Error("COMMERCE_MUST_NOT_INVOKE_LEGACY_AUTHORITY");
      },
    });
    const legacyReply = finalizeRealtimePostGenerationReply({
      mode: "GROUP_V2",
      wordingAuthority: legacy.wordingAuthority,
      messages: [{ kind: "TEXT", text: legacy.proposal.reply }],
    });
    const migratedReply = finalizeRealtimePostGenerationReply({
      mode: "GROUP_V2",
      wordingAuthority: migrated.wordingAuthority,
      messages: [{ kind: "TEXT", text: migrated.proposal.reply }],
    });
    const result = compareRealtimeReplySnapshots({
      baseline: snapshot({
        messages: legacyReply.messages,
        strategyHash: `${legacy.strategyAuthority}:${legacy.deterministicStrategyDecision?.recommendedStrategy}`,
      }),
      candidate: snapshot({
        messages: migratedReply.messages,
        strategyHash: `${migrated.strategyAuthority}:${migrated.modelStrategyAnalysis?.recommendedStrategy}`,
      }),
      permittedDifferences: [{
        code: "OUTBOUND_MESSAGES_CHANGED",
        reasonCode: "TRACK_B_MODEL_WORDING_AUTHORITY",
      }, {
        code: "STRATEGY_CHANGED",
        reasonCode: "TRACK_B_MODEL_STRATEGY_AUTHORITY",
      }],
    });

    expect(result).toMatchObject({
      status: "INTENTIONAL_DIFFERENCE",
      sideEffects: "DISABLED",
    });
    expect(result.differences).toHaveLength(2);
  });
});
