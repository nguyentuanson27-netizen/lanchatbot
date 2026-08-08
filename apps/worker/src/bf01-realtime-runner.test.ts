import { describe, expect, it } from "vitest";
import type { ConversationState } from "@lana/conversation-engine";
import type { RealtimeDecisionEventPlan } from "@lana/database";
import { bf01ReconciliationTarget } from "./bf02-realtime-runner.js";

function state(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    routingOwner: "APP",
    conversationOwner: "BOT",
    blockingTag: null,
    tagGateStatus: "VERIFIED_ABSENT",
    ...overrides,
  } as ConversationState;
}

function wave2Event(overrides: Partial<RealtimeDecisionEventPlan> = {}): RealtimeDecisionEventPlan {
  return {
    eventId: "10000000-0000-4000-8000-000000000001",
    eventKeyHash: "a".repeat(64),
    eventType: "WAVE2_STRATEGY_SELECTED",
    origin: "STATE",
    reasonCodes: [
      "NOT_ENOUGH_CONTEXT",
      "STRATEGY_ASK_CLARIFY",
      "NO_ADDITIONAL_CTA",
    ],
    releaseId: "bf01-test",
    promptVersion: "lana-realtime-v1",
    modelVersion: "test-model",
    policyVersion: "policy-v1",
    catalogVersion: "catalog-v2",
    mode: "LIVE",
    productId: "SD398",
    intent: null,
    stage: "PRODUCT_MATCHED",
    action: "NO_REPLY",
    occurredAt: new Date("2026-08-03T00:00:00.000Z"),
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
        recommendedStrategy: "STRATEGY_ASK_CLARIFY",
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

const runtime = {
  routingOwner: "APP" as const,
  appSendEnabled: true,
  killSwitch: false,
};

function target(input: {
  policy?: "LEGACY" | "CLARIFY_RECONCILED_V1";
  currentState?: ConversationState;
  event?: RealtimeDecisionEventPlan;
  metaPlanPresent?: boolean;
  handoffPlanPresent?: boolean;
} = {}) {
  return bf01ReconciliationTarget({
    policy: input.policy ?? "CLARIFY_RECONCILED_V1",
    runtime,
    state: input.currentState ?? state(),
    metaPlanPresent: input.metaPlanPresent ?? false,
    handoffPlanPresent: input.handoffPlanPresent ?? false,
    events: [input.event ?? wave2Event()],
    mode: "LIVE",
    sendEnabled: true,
    recipientId: "customer-1",
    customerText: "có biến thể gì nữa",
  });
}

describe("BF-01 reply reconciliation target", () => {
  it("reproduces the incident contract: ASK_CLARIFY + NO_REPLY is eligible", () => {
    expect(target()?.reasonCode).toBe("BF01_ASK_CLARIFY_NO_REPLY_RECONCILED");
  });

  it("does not bypass a blocked guard", () => {
    const event = wave2Event({
      details: {
        ...wave2Event().details,
        guardOutcome: "BLOCKED",
        guardReasonCodes: ["UNVERIFIED_BUSINESS_FACT"],
      },
    });
    expect(target({ event })).toBeNull();
  });

  it("does not bypass human ownership", () => {
    expect(target({
      currentState: state({ conversationOwner: "HUMAN" }),
    })).toBeNull();
  });

  it("does not override an explicit non-clarification strategy", () => {
    const event = wave2Event({
      details: {
        ...wave2Event().details,
        wave2Strategy: {
          ...wave2Event().details.wave2Strategy!,
          recommendedStrategy: "STRATEGY_CLOSE",
        },
      },
    });
    expect(target({ event })).toBeNull();
  });

  it("stays inactive under the legacy policy", () => {
    expect(target({ policy: "LEGACY" })).toBeNull();
  });

  it("does not create a second plan when core already has outbound or handoff", () => {
    expect(target({ metaPlanPresent: true })).toBeNull();
    expect(target({ handoffPlanPresent: true })).toBeNull();
  });
});
