import { describe, expect, it } from "vitest";
import type { AgentProposalV1 } from "@lana/contracts";
import type { RealtimeDecisionEventPlan } from "@lana/database";
import {
  BF03_CORRECTION_REASON_CODE,
  bf03ContainDecisionEvents,
  bf03ContainProposal,
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
    expect(classifierView).toBe("đã có thông tin đó rồi mà");
    expect(explicitCustomerBusinessIntent(classifierView)).toBeNull();
    expect(explicitCustomerBusinessIntents(classifierView)).toEqual([]);
  });

  it.each([
    "giá với size đã có rồi",
    "size có rồi mà",
    "em nói giá và size rồi mà",
    "giá + size chị có rồi nhé",
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
  ])("preserves genuine size-request recall: %s", (text) => {
    expect(bf03CorrectionContainmentDecision(
      text,
      "CORRECTION_CONTAINMENT_V1",
    ).applies).toBe(false);
  });

  it.each([
    "size có rồi mà, cho chị xin giá",
    "size có rồi mà, kiểm tra còn hàng giúp chị",
    "size có rồi mà, khi nào giao đến chị",
  ])("does not contain an independent business-fact request: %s", (text) => {
    expect(bf03CorrectionContainmentDecision(
      text,
      "CORRECTION_CONTAINMENT_V1",
    ).applies).toBe(false);
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

  it("only suppresses the false SIZE capability and preserves unrelated facts", () => {
    const decision = bf03CorrectionContainmentDecision(
      "có giá vs size rồi mà",
      "CORRECTION_CONTAINMENT_V1",
    );
    expect(bf03ContainProposal(proposal("PRICE"), decision)).toEqual(proposal("PRICE"));
    expect(bf03ContainProposal(proposal("STOCK"), decision)).toEqual(proposal("STOCK"));
    expect(bf03ContainProposal(proposal("ETA"), decision)).toEqual(proposal("ETA"));
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
