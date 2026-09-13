import { describe, expect, it } from "vitest";
import {
  assertTrackCV6PlanConformance,
  parseTrackCV6DirectivePlan,
  trackCV6PlanResponseSchema,
  type TrackCV6DirectivePlan,
} from "./track-c-c3-v6-directive-plan.js";

const CLAIM_REFS = ["CLAIM_001", "CLAIM_002", "PRODUCT_ATTRIBUTES_001"];

function plan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    rule: "ANSWER",
    claimRefs: ["CLAIM_001"],
    acknowledge: "NONE",
    askFor: "NONE",
    supportFacts: 0,
    ...overrides,
  };
}

function parsed(overrides: Partial<Record<string, unknown>> = {}) {
  return parseTrackCV6DirectivePlan(plan(overrides), CLAIM_REFS);
}

function reply(segments: readonly unknown[], overrides: Partial<Record<string, unknown>> = {}) {
  return {
    segments,
    strategy: "ANSWER_VERIFIED_FACTS",
    cta: "NONE",
    ...overrides,
  };
}

describe("Track C C3 V6 directive plan", () => {
  it("restricts the provider schema to the exact references of this request", () => {
    const schema = trackCV6PlanResponseSchema(CLAIM_REFS) as {
      properties: {
        claimRefs: { items: { enum: readonly string[] } };
        rule: { enum: readonly string[] };
      };
    };

    expect(schema.properties.claimRefs.items.enum).toEqual(CLAIM_REFS);
    expect(schema.properties.rule.enum).toContain("NO_ELIGIBLE_CLAIM");
  });

  it("accepts a well formed answer plan", () => {
    expect(parsed({ acknowledge: "PRICE_CONCERN", supportFacts: 2 })).toEqual({
      contractVersion: "TRACK_C_C3_DIRECTIVE_PLAN_V1",
      rule: "ANSWER",
      claimRefs: ["CLAIM_001"],
      acknowledge: "PRICE_CONCERN",
      askFor: "NONE",
      supportFacts: 2,
    });
  });

  it("has no free-text field a factual value could be written into", () => {
    expect(() => parseTrackCV6DirectivePlan(
      plan({ nextMove: "state the 849k price" }),
      CLAIM_REFS,
    )).toThrow("TRACK_C_V6_PLAN_SHAPE_INVALID");
  });

  it("rejects a claim reference this request does not carry", () => {
    expect(() => parsed({ claimRefs: ["CLAIM_009"] }))
      .toThrow("TRACK_C_V6_PLAN_CLAIM_REF_UNKNOWN");
    expect(() => parsed({ claimRefs: ["CLAIM_001", "CLAIM_001"] }))
      .toThrow("TRACK_C_V6_PLAN_CLAIM_REF_DUPLICATE");
  });

  it("keeps canonical rules free of selected evidence and fixes their ask", () => {
    expect(() => parsed({ rule: "MEASUREMENTS_REQUIRED", askFor: "MEASUREMENT" }))
      .toThrow("TRACK_C_V6_PLAN_CLAIM_REF_FORBIDDEN");
    expect(() => parsed({
      rule: "MEASUREMENTS_REQUIRED",
      claimRefs: [],
      askFor: "BUDGET",
    })).toThrow("TRACK_C_V6_PLAN_ASK_NOT_CANONICAL");
    expect(parsed({
      rule: "MEASUREMENTS_REQUIRED",
      claimRefs: [],
      askFor: "MEASUREMENT",
    }).rule).toBe("MEASUREMENTS_REQUIRED");
  });

  it("keeps a canonical ask out of an ordinary answer turn", () => {
    expect(() => parsed({ askFor: "CHECKOUT_DETAILS" }))
      .toThrow("TRACK_C_V6_PLAN_ASK_NOT_CANONICAL");
  });

  it("allows supporting facts only for an acknowledged concern on an answer turn", () => {
    expect(() => parsed({ supportFacts: 1 }))
      .toThrow("TRACK_C_V6_PLAN_SUPPORT_FACTS_UNMOTIVATED");
    expect(() => parsed({
      rule: "ORDER_CONFIRMED_HOLD",
      claimRefs: [],
      askFor: "NONE",
      acknowledge: "SUPPLIED_INFO",
      supportFacts: 1,
    })).toThrow("TRACK_C_V6_PLAN_SUPPORT_FACTS_FORBIDDEN");
  });
});

describe("Track C C3 V6 plan conformance", () => {
  const answerPlan: TrackCV6DirectivePlan = parsed({
    acknowledge: "PRICE_CONCERN",
    supportFacts: 1,
  });

  it("accepts a reply that realizes exactly the planned decision", () => {
    expect(() => assertTrackCV6PlanConformance(answerPlan, reply([
      { kind: "GENERAL", text: "Dạ em hiểu mức giá đang cân nhắc." },
      { kind: "VERIFIED_CLAIM", text: "Giá 849k ạ.", claimRef: "CLAIM_001" },
    ]))).not.toThrow();
  });

  it("rejects a reply that states a claim the plan did not select", () => {
    expect(() => assertTrackCV6PlanConformance(answerPlan, reply([
      { kind: "VERIFIED_CLAIM", text: "Giá 849k ạ.", claimRef: "CLAIM_001" },
      { kind: "VERIFIED_CLAIM", text: "Còn hàng ạ.", claimRef: "CLAIM_002" },
    ]))).toThrow("TRACK_C_V6_REPLY_CLAIM_SET_MISMATCH");
  });

  it("rejects a reply that drops a planned claim", () => {
    expect(() => assertTrackCV6PlanConformance(answerPlan, reply([
      { kind: "GENERAL", text: "Dạ em ghi nhận ạ." },
    ]))).toThrow("TRACK_C_V6_REPLY_CLAIM_SET_MISMATCH");
  });

  it("rejects a question the plan did not ask for", () => {
    expect(() => assertTrackCV6PlanConformance(answerPlan, reply([
      { kind: "VERIFIED_CLAIM", text: "Giá 849k ạ.", claimRef: "CLAIM_001" },
      { kind: "GENERAL", text: "Chị dự kiến ngân sách bao nhiêu?" },
    ]))).toThrow("TRACK_C_V6_REPLY_UNPLANNED_QUESTION");
  });

  it("requires exactly one question when the plan selected a target", () => {
    const askPlan = parsed({
      acknowledge: "PRICE_CONCERN",
      askFor: "BUDGET",
    });

    expect(() => assertTrackCV6PlanConformance(askPlan, reply([
      { kind: "VERIFIED_CLAIM", text: "Giá 849k ạ.", claimRef: "CLAIM_001" },
    ]))).toThrow("TRACK_C_V6_REPLY_QUESTION_COUNT_INVALID");
    expect(() => assertTrackCV6PlanConformance(askPlan, reply([
      { kind: "VERIFIED_CLAIM", text: "Giá 849k ạ.", claimRef: "CLAIM_001" },
      { kind: "GENERAL", text: "Chị đang cân mức nào ạ?" },
    ]))).not.toThrow();
  });

  it("rejects a strategy or CTA the rule does not imply", () => {
    expect(() => assertTrackCV6PlanConformance(
      answerPlan,
      reply(
        [{ kind: "VERIFIED_CLAIM", text: "Giá 849k ạ.", claimRef: "CLAIM_001" }],
        { strategy: "HOLD_POSITION" },
      ),
    )).toThrow("TRACK_C_V6_REPLY_STRATEGY_MISMATCH");
    expect(() => assertTrackCV6PlanConformance(
      answerPlan,
      reply(
        [{ kind: "VERIFIED_CLAIM", text: "Giá 849k ạ.", claimRef: "CLAIM_001" }],
        { cta: "ASK_CHECKOUT_DETAILS" },
      ),
    )).toThrow("TRACK_C_V6_REPLY_CTA_MISMATCH");
  });

  it("requires the canonical segment pair of the selected rule", () => {
    const checkoutPlan = parsed({
      rule: "CHECKOUT_DETAILS",
      claimRefs: [],
      askFor: "CHECKOUT_DETAILS",
      acknowledge: "COMMITMENT",
    });
    const shell = {
      strategy: "ASK_CLARIFICATION",
      cta: "ASK_CHECKOUT_DETAILS",
    };

    expect(() => assertTrackCV6PlanConformance(checkoutPlan, reply([
      { kind: "GENERAL", text: "Dạ em cần thông tin nhận hàng ạ?" },
    ], shell))).toThrow("TRACK_C_V6_REPLY_CANONICAL_SEGMENT_MISSING");
    expect(() => assertTrackCV6PlanConformance(checkoutPlan, reply([
      {
        kind: "CLARIFICATION",
        text: "Dạ đơn còn thiếu thông tin nhận hàng ạ.",
        target: "CHECKOUT_DETAILS",
      },
      {
        kind: "ACTION_REQUEST",
        text: "Chị gửi giúp em thông tin nhận hàng nhé?",
        action: "PROVIDE_CHECKOUT_DETAILS",
      },
    ], shell))).not.toThrow();
  });

  it("keeps a hold turn to one neutral segment and forbids effect claims", () => {
    const holdPlan = parsed({
      rule: "ORDER_CONFIRMED_HOLD",
      claimRefs: [],
      askFor: "NONE",
      acknowledge: "SUPPLIED_INFO",
    });
    const shell = { strategy: "HOLD_POSITION", cta: "NONE" };

    expect(() => assertTrackCV6PlanConformance(holdPlan, reply([
      { kind: "GENERAL", text: "Dạ em nắm rồi chị nha." },
      { kind: "GENERAL", text: "Em cảm ơn chị đã ủng hộ shop ạ." },
    ], shell))).toThrow("TRACK_C_V6_REPLY_SINGLE_SEGMENT_REQUIRED");
    expect(() => assertTrackCV6PlanConformance(holdPlan, reply([
      { kind: "EFFECT_CLAIM", text: "Em đã chốt đơn ạ.", effect: "ORDER_PLACED" },
    ], shell))).toThrow("TRACK_C_V6_REPLY_EFFECT_CLAIM_FORBIDDEN");
  });
});
