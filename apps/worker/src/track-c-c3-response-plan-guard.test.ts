import { describe, expect, it } from "vitest";
import { assertTrackCResponderFollowsPlan } from
  "./track-c-c3-response-plan-guard.js";

const plan = {
  answer: {
    mode: "DIRECT",
    protectedProposition: "PRICE",
    protectedResolution: "SUPPORTED",
  },
  nextMove: { action: "ASK", decisionInput: "SIZE" },
  canonicalAction: { type: "NONE" },
} as const;

describe("assertTrackCResponderFollowsPlan", () => {
  it("requires one structurally declared ordinary next move", () => {
    expect(() => assertTrackCResponderFollowsPlan(plan, {
      segments: [{ kind: "GENERAL", text: "Dạ em hiểu ạ." }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");

    expect(() => assertTrackCResponderFollowsPlan(plan, {
      segments: [{
        kind: "GENERAL",
        role: "NEXT_MOVE",
        decisionInput: "SIZE",
        protectedProposition: "NONE",
        protectedResolution: "NOT_APPLICABLE",
        text: "Chị thường mặc size nào?",
      }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).not.toThrow();

    expect(() => assertTrackCResponderFollowsPlan(plan, {
      segments: [{
        kind: "GENERAL",
        role: "NEXT_MOVE",
        decisionInput: "COLOR",
        protectedProposition: "NONE",
        protectedResolution: "NOT_APPLICABLE",
        text: "Chị thích màu nào ạ?",
      }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");
  });

  it("rejects an unplanned ordinary question", () => {
    expect(() => assertTrackCResponderFollowsPlan({
      ...plan,
      nextMove: { action: "NONE", decisionInput: "NONE" },
    }, {
      segments: [{ kind: "GENERAL", text: "Chị chốt mẫu này luôn không?" }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");
  });

  it("requires bounded uncertainty to be stated explicitly", () => {
    expect(() => assertTrackCResponderFollowsPlan({
      ...plan,
      answer: {
        mode: "BOUNDED_UNCERTAINTY",
        protectedProposition: "PROMOTION_OFFER",
        protectedResolution: "UNRESOLVED",
      },
      nextMove: { action: "NONE", decisionInput: "NONE" },
    }, {
      segments: [{ kind: "GENERAL", text: "Dạ hiện bên em chỉ áp dụng giá này ạ." }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");

    expect(() => assertTrackCResponderFollowsPlan({
      ...plan,
      answer: {
        mode: "BOUNDED_UNCERTAINTY",
        protectedProposition: "PROMOTION_OFFER",
        protectedResolution: "UNRESOLVED",
      },
      nextMove: { action: "NONE", decisionInput: "NONE" },
    }, {
      segments: [{
        kind: "GENERAL",
        role: "ANSWER",
        protectedProposition: "PROMOTION_OFFER",
        protectedResolution: "UNRESOLVED",
        text: "Dạ hiện em chưa thể xác nhận có ưu đãi thêm ạ.",
      }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).not.toThrow();
  });

  it("requires canonical product clarification structure", () => {
    expect(() => assertTrackCResponderFollowsPlan({
      answer: {
        mode: "CLARIFY",
        protectedProposition: "NONE",
        protectedResolution: "NOT_APPLICABLE",
      },
      nextMove: { action: "NONE", decisionInput: "NONE" },
      canonicalAction: { type: "ASK_PRODUCT" },
    }, {
      segments: [{ kind: "GENERAL", text: "Chị nói giúp em mẫu nào nhé?" }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");
  });

  it("rejects a Responder-only protected proposition widened beyond its selected claim", () => {
    expect(() => assertTrackCResponderFollowsPlan({
      ...plan,
      nextMove: { action: "NONE", decisionInput: "NONE" },
    }, {
      segments: [{
        kind: "VERIFIED_CLAIM",
        role: "ANSWER",
        protectedProposition: "PROMOTION_OFFER",
        protectedResolution: "SUPPORTED",
        supportedProposition: "PRICE",
        text: "Dạ giá hiện tại là thông tin đã xác nhận ạ.",
      }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    })).toThrow("TRACK_C_RESPONDER_PLAN_MISMATCH");
  });
});
