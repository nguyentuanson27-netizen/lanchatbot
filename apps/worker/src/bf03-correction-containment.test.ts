import { describe, expect, it } from "vitest";
import type { AgentProposalV1 } from "@lana/contracts";
import type { RealtimeDecisionEventPlan } from "@lana/database";
import {
  BF03_CORRECTION_REASON_CODE,
  bf03ContainDecisionEvents,
  bf03ContainProposal,
  bf03CorrectionAnalysis,
  bf03CorrectionContainmentDecision,
  bf03LegacyClassifierView,
  explicitCustomerBusinessIntent,
  explicitCustomerBusinessIntents,
} from "./bf03-realtime-runner.js";

function proposal(intent: AgentProposalV1["businessFactQuery"]["intent"]): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "semantic",
    conversationStage: "DISCOVERY",
    productId: "SD398",
    action: "REPLY",
    reply: "Em hiểu ý chị.",
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent,
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

function event(
  eventType: RealtimeDecisionEventPlan["eventType"],
  intent: RealtimeDecisionEventPlan["intent"],
): RealtimeDecisionEventPlan {
  return {
    eventId: `00000000-0000-4000-8000-${eventType.padEnd(12, "0").slice(0, 12)}`,
    eventKeyHash: "0".repeat(64),
    eventType,
    origin: "STATE",
    reasonCodes: [],
    releaseId: "bf03-test",
    promptVersion: "bf03-test",
    modelVersion: "bf03-test",
    policyVersion: "bf03-test",
    catalogVersion: "bf03-test",
    mode: "LIVE",
    productId: "SD398",
    intent,
    stage: "PRODUCT_MATCHED",
    action: "NO_REPLY",
    occurredAt: new Date("2026-08-09T00:00:00.000Z"),
    details: {} as RealtimeDecisionEventPlan["details"],
  };
}

describe("BF-03 correction containment", () => {
  it.each([
    ["có giá vs size rồi mà", "", [], [], true, false],
    ["size có rồi mà bao nhiêu tiền em", "bao nhiêu tiền em", ["PRICE"], ["PRICE"], true, false],
    ["size có rồi mà M hay L hợp hơn", "M hay L hợp hơn", ["SIZE"], [], false, true],
  ] as const)("builds one structured correction result for %s", (
    text,
    residualView,
    canonicalIntents,
    allowedBusinessFactIntents,
    applies,
    genuineSizeContinuation,
  ) => {
    const analysis = bf03CorrectionAnalysis(text, "CORRECTION_CONTAINMENT_V1");
    expect(analysis.correctionSpans.length).toBeGreaterThan(0);
    expect(analysis.residualView).toBe(residualView);
    expect(analysis.canonicalIntents).toEqual(canonicalIntents);
    expect(analysis.allowedBusinessFactIntents).toEqual(allowedBusinessFactIntents);
    expect(analysis.decision.applies).toBe(applies);
    expect(analysis.genuineSizeContinuation).toBe(genuineSizeContinuation);
  });

  it("replays BUG-03 without promoting the topic mention to SIZE", () => {
    const decision = bf03CorrectionContainmentDecision(
      "có giá vs size rồi mà",
      "CORRECTION_CONTAINMENT_V1",
    );
    expect(decision).toEqual({
      applies: true,
      reasonCodes: [BF03_CORRECTION_REASON_CODE],
    });
    expect(bf03ContainProposal(proposal("SIZE"), decision).businessFactQuery)
      .toEqual({
        intent: "NONE",
        offerType: null,
        color: null,
        size: null,
        deliveryRegion: null,
      });
  });

  it("neutralizes the pre-model legacy fact classifier view", () => {
    const decision = bf03CorrectionContainmentDecision(
      "có giá vs size rồi mà",
      "CORRECTION_CONTAINMENT_V1",
    );
    const classifierView = bf03LegacyClassifierView(
      "có giá vs size rồi mà",
      decision,
    );
    expect(classifierView).toBe("thông tin đó");
    expect(explicitCustomerBusinessIntent(classifierView)).toBeNull();
    expect(explicitCustomerBusinessIntents(classifierView)).toEqual([]);
  });

  it.each([
    "giá với size đã có rồi",
    "size có rồi mà",
    "size có rồi mà?",
    "có giá vs size rồi mà?",
    "em nói giá và size rồi mà",
    "giá + size chị có rồi nhé",
    "em nói rồi, size không cần hỏi lại",
    "em đã nói rồi: size M",
    "chị đổi size rồi mà",
    "em noi roi size khong can hoi lai",
    "em da noi roi: size M",
    "chi doi size roi ma",
  ])("contains clear correction phrasing: %s", (text) => {
    expect(bf03CorrectionContainmentDecision(
      text,
      "CORRECTION_CONTAINMENT_V1",
    ).applies).toBe(true);
  });

  it.each([
    "size nào vừa em",
    "chị 1m60 56kg mặc cỡ nào",
    "size M hay L hợp hơn",
    "tư vấn size cho chị",
    "đã có size M chưa?",
    "size rồi mà size nào vừa chị?",
    "chị muốn đổi size M",
    "em chưa nói size nào",
    "em không nói size M",
    "em nói rồi nhưng chị chưa biết size nào vừa",
    "không chắc size M có vừa không",
    "size có rồi mà không chắc có vừa không",
    "size co roi ma khong chac co vua khong",
    "size S, M, L bên em có đủ không?",
    "chị chọn size M",
    "vòng ngực 88 eo 68 thì mặc size gì",
    "90-60-90",
    "size có rồi mà M hay L hợp hơn",
    "size co roi ma M hay L hop hon",
    "size có rồi mà, M hay L hợp hơn?",
    "size co roi ma\nM hay L hop hon",
    "M hay L hợp hơn, size có rồi mà",
    "size có rồi mà chị phân vân M hay L",
    "size co roi ma chi phan van M hay L",
    "chị phân vân M hay L; size có rồi mà",
    "size có rồi mà M có chật không em",
    "size co roi ma M co chat khong em",
    "M có chật không em, size có rồi mà",
    "size có rồi mà chị đổi sang M",
    "size co roi ma chi doi sang M",
    "chị đổi sang M, size có rồi mà",
    "size có rồi mà M hơi chật, tư vấn lại giúp chị",
    "size co roi ma M hoi chat\ntu van lai giup chi",
    "M hơi chật, tư vấn lại giúp chị; size có rồi mà",
    "size có rồi mà S M L có đủ không",
    "size co roi ma S M L co du khong",
    "S M L có đủ không, size có rồi mà",
  ])("preserves genuine size-request recall: %s", (text) => {
    expect(bf03CorrectionContainmentDecision(
      text,
      "CORRECTION_CONTAINMENT_V1",
    ).applies).toBe(false);
  });

  it.each([
    ["size có rồi mà, cho chị xin giá", ["PRICE"]],
    ["cho chị xin giá; size có rồi mà", ["PRICE"]],
    ["size co roi ma cho chi xin gia", ["PRICE"]],
    ["size có rồi mà bao nhiêu tiền em", ["PRICE"]],
    ["bao nhiêu tiền em size có rồi mà", ["PRICE"]],
    ["size co roi ma bao nhieu tien em", ["PRICE"]],
    ["bao nhieu tien em size co roi ma", ["PRICE"]],
    ["size có rồi mà, kiểm tra còn hàng giúp chị", ["STOCK"]],
    ["kiểm tra còn hàng giúp chị; size có rồi mà", ["STOCK"]],
    ["size có rồi mà hàng còn không em", ["STOCK"]],
    ["hàng còn không em size có rồi mà", ["STOCK"]],
    ["size co roi ma hang con khong em", ["STOCK"]],
    ["hang con khong em size co roi ma", ["STOCK"]],
    ["size có rồi mà, khi nào giao đến chị", ["ETA"]],
    ["khi nào giao đến chị, size có rồi mà", ["ETA"]],
    ["size có rồi mà ship mấy ngày", ["ETA"]],
    ["ship mấy ngày size có rồi mà", ["ETA"]],
    ["size co roi ma ship may ngay", ["ETA"]],
    ["ship may ngay size co roi ma", ["ETA"]],
  ])("suppresses false SIZE while preserving an independent fact: %s", (
    text,
    expectedIntents,
  ) => {
    const decision = bf03CorrectionContainmentDecision(
      text,
      "CORRECTION_CONTAINMENT_V1",
    );
    expect(decision.applies).toBe(true);
    const classifierView = bf03LegacyClassifierView(text, decision);
    expect(explicitCustomerBusinessIntents(classifierView)).toEqual(expectedIntents);
    expect(explicitCustomerBusinessIntents(classifierView)).not.toContain("SIZE");
  });

  it("keeps multiple correction spans local and preserves the residual classifier", () => {
    const correctionOnly = bf03CorrectionAnalysis(
      "size có rồi mà, size cũng đã có rồi mà",
      "CORRECTION_CONTAINMENT_V1",
    );
    expect(correctionOnly.correctionSpans).toHaveLength(2);
    expect(correctionOnly.decision.applies).toBe(true);
    expect(correctionOnly.canonicalIntents).toEqual([]);

    const mixedFact = bf03CorrectionAnalysis(
      "size có rồi mà và hàng còn không em",
      "CORRECTION_CONTAINMENT_V1",
    );
    expect(mixedFact.decision.applies).toBe(true);
    expect(mixedFact.allowedBusinessFactIntents).toEqual(["STOCK"]);

    const mixedGenuineSize = bf03CorrectionAnalysis(
      "size có rồi mà, giá bao nhiêu, M hay L hợp hơn",
      "CORRECTION_CONTAINMENT_V1",
    );
    expect(mixedGenuineSize.decision.applies).toBe(false);
    expect(mixedGenuineSize.canonicalIntents).toEqual(["PRICE", "SIZE"]);
  });

  it.each([
    "oversize có rồi mà",
    "sizes có rồi mà",
    "size có rồi mà mindset này ổn",
  ])("does not create a SIZE continuation from token-boundary noise: %s", (text) => {
    const analysis = bf03CorrectionAnalysis(text, "CORRECTION_CONTAINMENT_V1");
    expect(analysis.genuineSizeContinuation).toBe(false);
    expect(analysis.canonicalIntents).not.toContain("SIZE");
  });

  it("is inert under LEGACY policy", () => {
    const decision = bf03CorrectionContainmentDecision(
      "có giá vs size rồi mà",
      "LEGACY",
    );
    expect(decision.applies).toBe(false);
    expect(bf03LegacyClassifierView("có giá vs size rồi mà", decision))
      .toBe("có giá vs size rồi mà");
    expect(bf03ContainProposal(proposal("SIZE"), decision)).toEqual(proposal("SIZE"));
  });

  it.each(["PRICE", "STOCK", "ETA", "SIZE"] as const)(
    "denies correction-only model intent %s outside the empty canonical allow-set",
    (intent) => {
      const decision = bf03CorrectionContainmentDecision(
        "có giá vs size rồi mà",
        "CORRECTION_CONTAINMENT_V1",
      );
      expect(bf03ContainProposal(proposal(intent), decision, []))
        .toEqual(proposal("NONE"));
    },
  );

  it.each([
    ["PRICE" as const, ["PRICE"] as const, ["STOCK", "ETA", "SIZE"] as const],
    ["STOCK" as const, ["STOCK"] as const, ["PRICE", "ETA", "SIZE"] as const],
    ["ETA" as const, ["ETA"] as const, ["PRICE", "STOCK", "SIZE"] as const],
  ])("allows only canonical mixed %s and denies every other model fact", (
    allowedIntent,
    allowed,
    deniedIntents,
  ) => {
    const decision = bf03CorrectionContainmentDecision(
      `size có rồi mà ${allowedIntent === "PRICE"
        ? "bao nhiêu tiền em"
        : allowedIntent === "STOCK"
          ? "hàng còn không em"
          : "ship mấy ngày"}`,
      "CORRECTION_CONTAINMENT_V1",
    );
    expect(bf03ContainProposal(proposal(allowedIntent), decision, allowed))
      .toEqual(proposal(allowedIntent));
    for (const deniedIntent of deniedIntents) {
      expect(bf03ContainProposal(proposal(deniedIntent), decision, allowed))
        .toEqual(proposal("NONE"));
    }
  });

  it("records bounded evidence and removes the false SIZE_CONSULT_STARTED audit", () => {
    const decision = bf03CorrectionContainmentDecision(
      "có giá vs size rồi mà",
      "CORRECTION_CONTAINMENT_V1",
    );
    const events = bf03ContainDecisionEvents([
      event("SIZE_CONSULT_STARTED", "SIZE"),
      event("NO_REPLY_SELECTED", "SIZE"),
    ], decision);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("NO_REPLY_SELECTED");
    expect(events[0]?.intent).toBeNull();
    expect(events[0]?.reasonCodes).toContain(BF03_CORRECTION_REASON_CODE);
  });
});
