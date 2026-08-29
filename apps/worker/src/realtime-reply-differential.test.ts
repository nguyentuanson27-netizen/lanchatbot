import { describe, expect, it, vi } from "vitest";
import {
  beginRealtimePostGenerationStage,
  compareRealtimeReplySnapshots,
  finalizeRealtimePostGenerationReply,
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
      plannedMessageCount: 2,
      deliveredMessageCount: 2,
    },
    ...overrides,
  };
}

describe("realtime reply differential", () => {
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

  it("requires every intentional wording difference to carry a non-empty reason code", () => {
    const candidate = snapshot({
      messages: [{ kind: "TEXT", text: "Mẫu SV695 giá 770.000đ chị nhé." }],
      protectedOutbound: {
        required: true,
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
      }],
    })).toMatchObject({
      status: "INTENTIONAL_DIFFERENCE",
      differences: [{
        code: "OUTBOUND_MESSAGES_CHANGED",
        disposition: "INTENTIONAL",
        reasonCode: "TRACK_B_MODEL_WORDING_AUTHORITY",
      }],
    });

    expect(() => compareRealtimeReplySnapshots({
      baseline: snapshot(),
      candidate,
      permittedDifferences: [{
        code: "OUTBOUND_MESSAGES_CHANGED",
        reasonCode: "   ",
      }],
    })).toThrowError("REALTIME_DIFFERENTIAL_REASON_CODE_REQUIRED");
  });

  it("keeps the extracted shadow similarity calculation deterministic", () => {
    expect(textSimilarity("Set này rất xinh", "Set nay xinh lam")).toBeGreaterThan(0.4);
    expect(textSimilarity("giá 699k", "xin chào")).toBe(0);
  });
});
