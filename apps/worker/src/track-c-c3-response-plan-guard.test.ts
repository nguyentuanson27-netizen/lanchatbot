import { describe, expect, it } from "vitest";
import { assertTrackCResponderFollowsPlan } from
  "./track-c-c3-response-plan-guard.js";

const plan = {
  answer: { mode: "DIRECT" },
  nextMove: { action: "ASK" },
  canonicalAction: { type: "NONE" },
} as const;

describe("assertTrackCResponderFollowsPlan", () => {
  it("requires one realized ordinary next-move question", () => {
    expect(() => assertTrackCResponderFollowsPlan(plan, {
      segments: [{ kind: "GENERAL", text: "Dạ em hiểu ạ." }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");

    expect(() => assertTrackCResponderFollowsPlan(plan, {
      segments: [{ kind: "GENERAL", text: "Chị thường mặc size nào?" }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).not.toThrow();
  });

  it("rejects an unplanned ordinary question", () => {
    expect(() => assertTrackCResponderFollowsPlan({
      ...plan,
      nextMove: { action: "NONE" },
    }, {
      segments: [{ kind: "GENERAL", text: "Chị chốt mẫu này luôn không?" }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");
  });

  it("requires bounded uncertainty to be stated explicitly", () => {
    expect(() => assertTrackCResponderFollowsPlan({
      ...plan,
      answer: { mode: "BOUNDED_UNCERTAINTY" },
      nextMove: { action: "NONE" },
    }, {
      segments: [{ kind: "GENERAL", text: "Dạ hiện bên em chỉ áp dụng giá này ạ." }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");

    expect(() => assertTrackCResponderFollowsPlan({
      ...plan,
      answer: { mode: "BOUNDED_UNCERTAINTY" },
      nextMove: { action: "NONE" },
    }, {
      segments: [{
        kind: "GENERAL",
        text: "Dạ hiện em chưa thể xác nhận có ưu đãi thêm ạ.",
      }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).not.toThrow();
  });

  it("requires canonical product clarification structure", () => {
    expect(() => assertTrackCResponderFollowsPlan({
      answer: { mode: "CLARIFY" },
      nextMove: { action: "NONE" },
      canonicalAction: { type: "ASK_PRODUCT" },
    }, {
      segments: [{ kind: "GENERAL", text: "Chị nói giúp em mẫu nào nhé?" }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");
  });
});
