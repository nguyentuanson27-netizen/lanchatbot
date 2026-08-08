import { describe, expect, it } from "vitest";
import type { ConversationState } from "@lana/conversation-engine";
import type { RealtimeDecisionEventPlan } from "@lana/database";
import { bf01ReconciliationTarget } from "./bf02-realtime-runner.js";

type ModelBusinessFactIntent = "NONE" | "PRICE" | "STOCK" | "SIZE" | "ETA";

function state(): ConversationState {
  return {
    routingOwner: "APP",
    conversationOwner: "BOT",
    blockingTag: null,
    tagGateStatus: "VERIFIED_ABSENT",
  } as ConversationState;
}

function event(
  overrides: Partial<RealtimeDecisionEventPlan> = {},
): RealtimeDecisionEventPlan {
  return {
    eventId: "20000000-0000-4000-8000-000000000001",
    eventKeyHash: "b".repeat(64),
    eventType: "NO_REPLY_SELECTED",
    origin: "STATE",
    reasonCodes: [],
    releaseId: "bf01-direct-question-test",
    promptVersion: "lana-realtime-v1",
    modelVersion: "test-model",
    policyVersion: "policy-v1",
    catalogVersion: "catalog-v2",
    mode: "LIVE",
    productId: "SD398",
    intent: "PRICE",
    stage: "PRODUCT_MATCHED",
    action: "NO_REPLY",
    occurredAt: new Date("2026-08-08T00:00:00.000Z"),
    details: {
      productResolutionOrigin: "STATE",
      buyingSignalReasons: [],
      guardReasonCodes: [],
      factsStatus: null,
      factsReasonCode: null,
      salesCycleStageBefore: "PRODUCT_MATCHED",
      salesCycleStageAfter: "PRODUCT_MATCHED",
      outboundMessageCount: 0,
      modelCalled: true,
      modelLatencyMs: 10,
      modelTokenUsage: { prompt: 10, output: 5, total: 15 },
      buyingSignalOverride: false,
      guardOutcome: "ALLOWED",
      wave2Strategy: {
        rulesetVersion: "wave2-strategy-v1",
        need: "NOT_ENOUGH_CONTEXT",
        barrier: "NONE",
        decisionFactor: "UNKNOWN",
        recommendedStrategy: "STRATEGY_CLOSE",
        ctaPolicy: "NO_ADDITIONAL_CTA",
        confidence: 0.8,
        evidence: ["DETERMINISTIC_FALLBACK"],
        experimentId: "wave2-stage-playbook-v1",
        experimentVariant: "LIVE_100",
      },
    },
    ...overrides,
  } as RealtimeDecisionEventPlan;
}

function target(
  value: RealtimeDecisionEventPlan,
  customerText = "Giá mẫu này bao nhiêu?",
  modelBusinessFactIntent: ModelBusinessFactIntent = "PRICE",
) {
  const input = {
    policy: "CLARIFY_RECONCILED_V1" as const,
    runtime: {
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    },
    state: state(),
    metaPlanPresent: false,
    handoffPlanPresent: false,
    events: [value],
    mode: "LIVE" as const,
    sendEnabled: true,
    recipientId: "customer-1",
    customerText,
    modelBusinessFactIntent,
  } as Parameters<typeof bf01ReconciliationTarget>[0] & {
    readonly customerText: string;
    readonly modelBusinessFactIntent: ModelBusinessFactIntent;
  };
  return bf01ReconciliationTarget(input);
}

describe("BF-01 direct-question reconciliation", () => {
  it("requires typed model fact-query intent for the direct-question path", () => {
    expect(target(event())).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("does not turn a business-topic closing statement into a direct question", () => {
    expect(target(event(), "Em biet gia roi, cam on", "NONE")).toBeNull();
  });

  it("does not treat known interrogative content inside a closing statement as a question", () => {
    expect(target(
      event(),
      "Em biet gia bao nhieu roi, cam on",
      "NONE",
    )).toBeNull();
  });

  it("does not treat a negated question act as a direct question", () => {
    expect(target(
      event(),
      "Em khong hoi gia bao nhieu, cam on",
      "NONE",
    )).toBeNull();
  });

  it("keeps a later typed question after a prior negated question act", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Em khong hoi gia bao nhieu, con size nao?",
      "SIZE",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("keeps a later typed question after prior known information", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Em biet gia bao nhieu roi, con size nao",
      "SIZE",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("keeps a sentence-separated typed question after prior known information", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Em biet gia bao nhieu roi. Con size nao",
      "SIZE",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("keeps a sentence-separated typed question after a prior negated question act", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Em khong hoi gia bao nhieu. Con size nao?",
      "SIZE",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("keeps a typed question before a trailing courtesy sentence", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Con size nao? Cam on",
      "SIZE",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("keeps a typed question before a trailing courtesy clause", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Con size nao, cam on",
      "SIZE",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("keeps a typed question with formatted numeric punctuation", () => {
    expect(target(
      event({ intent: "PRICE" }),
      "Em lay gia 1.199.000 khong",
      "PRICE",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("reconciles a typed price question without interrogative regex tokens", () => {
    expect(target(
      event({ intent: "PRICE" }),
      "Cho em hoi gia mau nay",
      "PRICE",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("does not force a reply when the typed model query rejects a negated ask", () => {
    expect(target(
      event({ intent: "PRICE" }),
      "Em khong hoi gia nua, bao nhieu cung duoc, cam on",
      "NONE",
    )).toBeNull();
  });

  it("reconciles a typed size question before an unrecognized courtesy variant", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Con size nao? Em cam on",
      "SIZE",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it.each([
    ["Mau nay mac khong?", "PRICE" as const],
    ["Bao gio em nhan duoc?", "ETA" as const],
  ])(
    "uses typed semantic query when legacy audited intent is missing: %s",
    (customerText, modelBusinessFactIntent) => {
      expect(target(
        event({ intent: null }),
        customerText,
        modelBusinessFactIntent,
      )).toMatchObject({
        reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
      });
    },
  );

  it("uses typed semantic query even when the legacy audited topic disagrees", () => {
    expect(target(event({ intent: "PRICE" }), "Con size nao?", "SIZE")).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("does not reconcile without typed semantic query evidence", () => {
    expect(target(
      event({ intent: "BUYING_SIGNAL" }),
      "Em cam on",
      "NONE",
    )).toBeNull();
  });

  it("does not override an explicitly reason-coded guard block", () => {
    expect(target(event({
      details: {
        ...event().details,
        guardOutcome: "BLOCKED",
        guardReasonCodes: ["PANCAKE_BLOCKING_TAG"],
      },
    }))).toBeNull();
  });
});