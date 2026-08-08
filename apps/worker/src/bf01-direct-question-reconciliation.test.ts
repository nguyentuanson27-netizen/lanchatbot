import { describe, expect, it } from "vitest";
import type { ConversationState } from "@lana/conversation-engine";
import type { RealtimeDecisionEventPlan } from "@lana/database";
import { bf01ReconciliationTarget } from "./bf02-realtime-runner.js";

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
  } as Parameters<typeof bf01ReconciliationTarget>[0] & {
    readonly customerText: string;
  };
  return bf01ReconciliationTarget(input);
}

describe("BF-01 direct-question reconciliation", () => {
  it("reuses explicit business intent only when the customer is actually asking a question", () => {
    expect(target(event())).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("does not turn a business-topic closing statement into a direct question", () => {
    expect(target(event(), "Em biet gia roi, cam on")).toBeNull();
  });

  it("does not treat known interrogative content inside a closing statement as a question", () => {
    expect(target(event(), "Em biet gia bao nhieu roi, cam on")).toBeNull();
  });

  it("does not treat a negated question act as a direct question", () => {
    expect(target(event(), "Em khong hoi gia bao nhieu, cam on")).toBeNull();
  });

  it("uses the terminal clause so a prior negated question act does not hide a real follow-up", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Em khong hoi gia bao nhieu, con size nao?",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("uses the terminal clause so prior known information does not hide a real follow-up", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Em biet gia bao nhieu roi, con size nao",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("uses a sentence boundary so prior known information does not hide a real follow-up", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Em biet gia bao nhieu roi. Con size nao",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("uses a sentence boundary so a prior negated question act does not hide a real follow-up", () => {
    expect(target(
      event({ intent: "SIZE" }),
      "Em khong hoi gia bao nhieu. Con size nao?",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("keeps formatted numeric dots inside a terminal question", () => {
    expect(target(
      event({ intent: "PRICE" }),
      "Em lay gia 1.199.000 khong",
    )).toMatchObject({
      reasonCode: "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
    });
  });

  it("does not treat unrelated decision intents as direct-question evidence", () => {
    expect(target(event({ intent: "BUYING_SIGNAL" }))).toBeNull();
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
