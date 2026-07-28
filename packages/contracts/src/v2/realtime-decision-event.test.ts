import { describe, expect, it } from "vitest";
import { RealtimeDecisionEventV1Schema } from "./realtime-decision-event.js";

const validEvent = {
  schemaVersion: 1,
  eventId: "00000000-0000-4000-8000-000000000001",
  conversationHash: "a".repeat(64),
  eventKeyHash: "b".repeat(64),
  eventType: "BUYING_SIGNAL_DETECTED",
  origin: "EXACT_CODE",
  reasonCodes: [],
  releaseId: "wave0-local",
  promptVersion: "realtime-agent-v2",
  modelVersion: "gemini-test",
  policyVersion: null,
  catalogVersion: null,
  mode: "LIVE",
  productId: "CB182",
  intent: "buy",
  stage: "consulting",
  action: "REPLY",
  occurredAt: "2026-07-23T00:00:00.000Z",
  details: {
    productResolutionOrigin: "EXACT_CODE",
    buyingSignalReasons: ["DIRECT_PURCHASE_VERB"],
    guardReasonCodes: [],
    factsStatus: "OK",
    factsReasonCode: null,
    salesCycleStageBefore: "DISCOVERY",
    salesCycleStageAfter: "CART_OPEN",
    outboundMessageCount: 1,
    modelCalled: true,
    modelLatencyMs: 120,
    modelTokenUsage: { prompt: 80, output: 20, total: 100 },
    buyingSignalOverride: true,
  },
} as const;

describe("RealtimeDecisionEventV1Schema", () => {
  it("accepts the PII-free operational event contract", () => {
    expect(RealtimeDecisionEventV1Schema.parse(validEvent)).toEqual(validEvent);
  });

  it("accepts the additive Wave 1 event taxonomy", () => {
    const eventTypes = [
      "PRODUCT_MATCHED",
      "BUYING_SIGNAL_COMMITTED",
      "BUYING_SIGNAL_RETRACTED",
      "READY_TO_BUY",
      "CHECKOUT_DETAILS_MISSING",
      "CLARIFICATION_REQUESTED",
      "CHECKOUT_COMPLETED",
      "ORDER_PREVIEW_CREATED",
      "PURCHASE_CONFIRMATION_DETECTED",
      "PURCHASE_CONFIRMATION_REJECTED",
      "PURCHASE_CONFIRMED",
      "HANDOFF_REQUESTED",
      "NO_REPLY_SELECTED",
    ] as const;
    for (const eventType of eventTypes) {
      expect(
        RealtimeDecisionEventV1Schema.parse({ ...validEvent, eventType })
          .eventType,
      ).toBe(eventType);
    }
  });

  it("rejects raw transcript fields", () => {
    expect(() => RealtimeDecisionEventV1Schema.parse({
      ...validEvent,
      rawText: "so dien thoai 0900000000",
    })).toThrow();
  });

  it("rejects arbitrary detail fields", () => {
    expect(() => RealtimeDecisionEventV1Schema.parse({
      ...validEvent,
      details: { ...validEvent.details, customerPhone: "0900000000" },
    })).toThrow();
  });
});
