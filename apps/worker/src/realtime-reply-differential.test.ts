import { describe, expect, it, vi } from "vitest";
import {
  beginRealtimePostGenerationStage,
  compareRealtimeReplySnapshots,
  finalizeRealtimePostGenerationReply,
  resolveRealtimeDeliveryWordingAuthority,
  runRealtimeReplyDifferential,
  textSimilarity,
  type RealtimeReplySnapshot,
} from "./realtime-reply-differential.js";

function snapshot(
  overrides: Partial<RealtimeReplySnapshot> = {},
): RealtimeReplySnapshot {
  return {
    messages: [
      { kind: "TEXT", text: "Mẫu SV695 hiện có giá 770.000đ." },
      { kind: "IMAGE", imageUrl: "https://cdn.example/sv695.jpg" },
    ],
    strategyHash: "strategy-baseline",
    verifiedFactHashes: ["fact-price-sv695"],
    verifiedMediaUrls: ["https://cdn.example/sv695.jpg"],
    protectedClaimHashes: ["claim-price-sv695"],
    effectAuthorizationHashes: [],
    commitOutcome: "COMMITTED",
    generationOutcome: "VALID",
    inboxOutcome: "COMMITTED",
    protectedOutbound: {
      required: true,
      groupId: "response-group-turn-1",
      plannedMessageCount: 2,
      deliveredMessageCount: 2,
    },
    ...overrides,
  };
}

describe("realtime reply differential", () => {
  it("preserves sales model wording only when runtime and sales authorities agree", () => {
    expect(resolveRealtimeDeliveryWordingAuthority({
      runtimeWordingAuthority: "MODEL",
      salesHandled: true,
      salesWordingAuthority: "MODEL",
    })).toBe("MODEL");
    expect(resolveRealtimeDeliveryWordingAuthority({
      runtimeWordingAuthority: "LEGACY_DETERMINISTIC",
      salesHandled: true,
      salesWordingAuthority: "MODEL",
    })).toBe("LEGACY_DETERMINISTIC");
  });

  it("marks the proposal transition without changing the frozen baseline proposal", () => {
    const proposal = {
      reply: "Mẫu SV695 hiện có giá 770.000đ.",
      strategyAnalysis: "Giải đáp giá rồi hỏi nhu cầu size.",
    };

    expect(beginRealtimePostGenerationStage(proposal)).toEqual({
      contractVersion: "REALTIME_POST_GENERATION_STAGE_V1",
      stage: "POST_GENERATION",
      proposal,
    });
  });

  it("creates an explicit behavior-equivalent post-generation delivery seam", () => {
    expect(finalizeRealtimePostGenerationReply({
      mode: "GROUP_V2",
      splitProductInfoFollowUp: true,
      messages: [
        {
          kind: "TEXT",
          text: "Giá 770.000đ.\n\nChị gửi em chiều cao nhé ạ.",
        },
        { kind: "IMAGE", imageUrl: "https://cdn.example/sv695.jpg" },
      ],
    })).toEqual({
      contractVersion: "REALTIME_POST_GENERATION_REPLY_V1",
      stage: "POST_GENERATION",
      messages: [
        { kind: "TEXT", text: "Giá 770.000đ." },
        { kind: "TEXT", text: "Chị gửi em chiều cao nhé ạ." },
        { kind: "IMAGE", imageUrl: "https://cdn.example/sv695.jpg" },
      ],
    });
  });

  it("runs baseline and candidate on isolated immutable captures without runtime ports", async () => {
    const captured = { customerText: "Cho chị xem mẫu SV695", nested: { revision: 4 } };
    const baseline = vi.fn((input: Readonly<typeof captured>) => {
      expect(Object.isFrozen(input)).toBe(true);
      expect(Object.isFrozen(input.nested)).toBe(true);
      return snapshot();
    });
    const candidate = vi.fn(async (_input: Readonly<typeof captured>) => snapshot());

    const result = await runRealtimeReplyDifferential({
      capturedInput: captured,
      baseline,
      candidate,
    });

    expect(result.status).toBe("MATCH");
    expect(result.sideEffects).toBe("DISABLED");
    expect(result.differences).toEqual([]);
    expect(baseline).toHaveBeenCalledOnce();
    expect(candidate).toHaveBeenCalledOnce();
    expect(baseline.mock.calls[0]![0]).not.toBe(candidate.mock.calls[0]![0]);
  });

  it("fails r31.3 when verified evidence is lost, protected outbound is partial, or malformed output permanently fails", () => {
    const result = compareRealtimeReplySnapshots({
      baseline: snapshot(),
      candidate: snapshot({
        messages: [{ kind: "TEXT", text: "Chị thử lại sau nhé." }],
        strategyHash: "strategy-fallback",
        verifiedFactHashes: [],
        verifiedMediaUrls: [],
        protectedClaimHashes: [],
        generationOutcome: "MALFORMED",
        inboxOutcome: "FAILED_PERMANENT",
        protectedOutbound: {
          required: true,
          groupId: "response-group-turn-1",
          plannedMessageCount: 2,
          deliveredMessageCount: 1,
        },
      }),
    });

    expect(result.status).toBe("VIOLATION");
    expect(result.differences.map(({ code }) => code)).toEqual(expect.arrayContaining([
      "OUTBOUND_MESSAGES_CHANGED",
      "STRATEGY_CHANGED",
      "VERIFIED_FACTS_CHANGED",
      "VERIFIED_MEDIA_CHANGED",
      "PROTECTED_CLAIMS_CHANGED",
      "PROTECTED_OUTBOUND_PARTIAL_DELIVERY",
      "GENERATION_FAILURE_PERMANENT_INBOX_FAILURE",
    ]));
    expect(result.differences.every(({ disposition }) => disposition === "VIOLATION"))
      .toBe(true);
  });

  it("requires every intentional wording or strategy difference to carry a reason code", () => {
    const candidate = snapshot({
      messages: [{ kind: "TEXT", text: "Mẫu SV695 giá 770.000đ chị nhé." }],
      strategyHash: "strategy-model-owned",
      protectedOutbound: {
        required: true,
        groupId: "response-group-turn-1",
        plannedMessageCount: 1,
        deliveredMessageCount: 1,
      },
    });

    expect(compareRealtimeReplySnapshots({
      baseline: snapshot(),
      candidate,
      permittedDifferences: [{
        code: "OUTBOUND_MESSAGES_CHANGED",
        reasonCode: "TRACK_B_MODEL_WORDING_AUTHORITY",
      }, {
        code: "STRATEGY_CHANGED",
        reasonCode: "TRACK_B_MODEL_STRATEGY_AUTHORITY",
      }],
    })).toMatchObject({
      status: "INTENTIONAL_DIFFERENCE",
      differences: [{
        code: "OUTBOUND_MESSAGES_CHANGED",
        disposition: "INTENTIONAL",
        reasonCode: "TRACK_B_MODEL_WORDING_AUTHORITY",
      }, {
        code: "STRATEGY_CHANGED",
        disposition: "INTENTIONAL",
        reasonCode: "TRACK_B_MODEL_STRATEGY_AUTHORITY",
      }],
    });

    expect(() => compareRealtimeReplySnapshots({
      baseline: snapshot(),
      candidate,
      permittedDifferences: [{
        code: "OUTBOUND_MESSAGES_CHANGED",
        reasonCode: "   ",
      }, {
        code: "STRATEGY_CHANGED",
        reasonCode: "TRACK_B_MODEL_STRATEGY_AUTHORITY",
      }],
    })).toThrowError("REALTIME_DIFFERENTIAL_REASON_CODE_REQUIRED");
  });

  it("cannot bypass whole-group delivery by downgrading candidate protection", () => {
    const result = compareRealtimeReplySnapshots({
      baseline: snapshot(),
      candidate: snapshot({
        protectedOutbound: {
          required: false,
          groupId: null,
          plannedMessageCount: 2,
          deliveredMessageCount: 1,
        },
      }),
    });

    expect(result.status).toBe("VIOLATION");
    expect(result.differences).toEqual(expect.arrayContaining([
      {
        code: "PROTECTED_OUTBOUND_CONTRACT_CHANGED",
        disposition: "VIOLATION",
        reasonCode: null,
      },
      {
        code: "PROTECTED_OUTBOUND_PARTIAL_DELIVERY",
        disposition: "VIOLATION",
        reasonCode: null,
      },
    ]));

    expect(compareRealtimeReplySnapshots({
      baseline: snapshot(),
      candidate: snapshot({
        protectedOutbound: {
          required: true,
          groupId: "different-response-group",
          plannedMessageCount: 2,
          deliveredMessageCount: 2,
        },
      }),
    }).differences).toContainEqual({
      code: "PROTECTED_OUTBOUND_CONTRACT_CHANGED",
      disposition: "VIOLATION",
      reasonCode: null,
    });

    expect(compareRealtimeReplySnapshots({
      baseline: snapshot(),
      candidate: snapshot({
        protectedOutbound: {
          required: true,
          groupId: "response-group-turn-1",
          plannedMessageCount: 1,
          deliveredMessageCount: 1,
        },
      }),
    }).differences).toContainEqual({
      code: "PROTECTED_OUTBOUND_CONTRACT_CHANGED",
      disposition: "VIOLATION",
      reasonCode: null,
    });
  });

  it("never permits protected facts, effects, or commit outcomes to diverge in B2.1", () => {
    const protectedDifference = [{
      code: "VERIFIED_FACTS_CHANGED",
      reasonCode: "ARBITRARY",
    }] as unknown as NonNullable<
      Parameters<typeof compareRealtimeReplySnapshots>[0]["permittedDifferences"]
    >;
    const result = compareRealtimeReplySnapshots({
      baseline: snapshot(),
      candidate: snapshot({
        verifiedFactHashes: [],
        effectAuthorizationHashes: ["effect-unauthorized"],
        commitOutcome: "CONFLICT",
      }),
      permittedDifferences: protectedDifference,
    });

    expect(result.status).toBe("VIOLATION");
    expect(result.differences).toEqual(expect.arrayContaining([
      { code: "VERIFIED_FACTS_CHANGED", disposition: "VIOLATION", reasonCode: null },
      { code: "EFFECT_AUTHORIZATION_CHANGED", disposition: "VIOLATION", reasonCode: null },
      { code: "COMMIT_OUTCOME_CHANGED", disposition: "VIOLATION", reasonCode: null },
    ]));
  });

  it("keeps the extracted shadow similarity calculation deterministic", () => {
    expect(textSimilarity("Set này rất xinh", "Set nay xinh lam")).toBeGreaterThan(0.4);
    expect(textSimilarity("giá 699k", "xin chào")).toBe(0);
  });
});
