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

function target(value: RealtimeDecisionEventPlan) {
  return bf01ReconciliationTarget({
    policy: "CLARIFY_RECONCILED_V1",
    runtime: {
      routingOwner: "APP",
      appSendEnabled: true,
      killSwitch: false,
    },
    state: state(),
    metaPlanPresent: false,
    handoffPlanPresent: false,
    events: [value],
    mode: "LIVE",
    sendEnabled: true,
    recipientId: "customer-1",
  });
}

describe("BF-01 direct-question reconciliation", () => {
  it("reuses existing explicit business-question evidence even when Wave2 is not ASK_CLARIFY", () => {
    expect(target(event())).toMatchObject({
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
