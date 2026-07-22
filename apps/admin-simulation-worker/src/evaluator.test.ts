import { describe, expect, it } from "vitest";
import { aggregateResults, evaluateConversation, parseReplaySnapshot } from "./evaluator.js";
import type { HistoricalConversation, PolicyComparison, PolicyVersion } from "./types.js";

const digest = `sha256:${"a".repeat(64)}`;
const toolDigest = `sha256:${"b".repeat(64)}`;

function offer(versionId: string, discountBps: number): PolicyVersion {
  return {
    versionId,
    artifactKey: "lana.shopwide.offers",
    artifactKind: "OFFER_POLICY",
    contentHash: digest,
    content: {
      schemaVersion: 1,
      kind: "OFFER_POLICY",
      scope: "SHOP_WIDE",
      multiItem: {
        minimumParentProductUnits: 2,
        discountBps,
        setAndComboCountAsOne: true,
      },
      concessions: {
        second: { freeShipping: true, fixedDiscountVnd: 0 },
        final: { freeShipping: true, fixedDiscountVnd: 20_000 },
        stackMultiItemWithSecond: true,
        stackMultiItemWithFinal: true,
        deduplicateFreeShipping: true,
      },
      sourceMetadata: {
        source: "ADMIN",
        sourceReference: null,
        sourceVersion: "test-v1",
        observedAt: "2026-07-22T08:00:00.000Z",
      },
    },
  };
}

function conversation(overrides: Record<string, unknown> = {}): HistoricalConversation {
  return {
    conversationHash: `sha256:${"c".repeat(64)}`,
    messageCount: 4,
    snapshot: parseReplaySnapshot({
      schemaVersion: 1,
      closingState: "HESITANT",
      parentProductUnits: 2,
      concessionStage: "SECOND",
      paymentMethod: "COD",
      recipientNamePresent: true,
      phoneNumberPresent: true,
      deliveryAddressPresent: true,
      handoffReason: null,
      measurements: {},
      businessFactsSnapshotId: digest,
      toolSnapshotIds: [toolDigest],
      actualOutcome: "CHECKOUT_PREVIEW",
      funnelStage: "CLOSING",
      ...overrides,
    }),
  };
}

describe("deterministic admin policy replay", () => {
  it("compares frozen baseline and candidate policy behavior", () => {
    const policies: PolicyComparison = {
      baseline: [offer("11111111-1111-4111-8111-111111111111", 500)],
      candidate: [offer("22222222-2222-4222-8222-222222222222", 700)],
      baselineSource: "PUBLISHED_POLICY",
    };
    const result = evaluateConversation(conversation(), policies);
    expect(result.evaluationStatus).toBe("EVALUATED");
    expect(result.baselineOutcome).toContain('"discountBps":500');
    expect(result.candidateOutcome).toContain('"discountBps":700');
    expect(result.funnelMetrics).toMatchObject({ changed: true, comparisonPerformed: true });
  });

  it("does not substitute current facts when historical evidence is absent", () => {
    const policies: PolicyComparison = {
      baseline: [offer("11111111-1111-4111-8111-111111111111", 500)],
      candidate: [offer("22222222-2222-4222-8222-222222222222", 700)],
      baselineSource: "PUBLISHED_POLICY",
    };
    const result = evaluateConversation(conversation({
      businessFactsSnapshotId: null,
      toolSnapshotIds: [],
    }), policies);
    expect(result).toMatchObject({
      evaluationStatus: "INSUFFICIENT_EVIDENCE",
      baselineOutcome: null,
      candidateOutcome: null,
    });
    expect(result.failureCodes).toEqual([
      "HISTORICAL_FACT_SNAPSHOT_MISSING",
      "HISTORICAL_TOOL_SNAPSHOT_MISSING",
    ]);
  });

  it("aggregates only evidence-backed comparisons into the change rate", () => {
    const changed = {
      ...evaluateConversation(conversation(), {
        baseline: [offer("11111111-1111-4111-8111-111111111111", 500)],
        candidate: [offer("22222222-2222-4222-8222-222222222222", 700)],
        baselineSource: "PUBLISHED_POLICY",
      }),
      conversationHash: `sha256:${"d".repeat(64)}`,
    };
    const insufficient = evaluateConversation(conversation({ toolSnapshotIds: [] }), {
      baseline: [offer("11111111-1111-4111-8111-111111111111", 500)],
      candidate: [offer("22222222-2222-4222-8222-222222222222", 700)],
      baselineSource: "PUBLISHED_POLICY",
    });
    const aggregate = aggregateResults({
      baselineVersionIds: ["11111111-1111-4111-8111-111111111111"],
      candidateVersionIds: ["22222222-2222-4222-8222-222222222222"],
      baselineSource: "PUBLISHED_POLICY",
    }, [changed, insufficient]);
    expect(aggregate).toMatchObject({
      sideEffects: "DISABLED",
      totalConversations: 2,
      evaluatedConversations: 1,
      insufficientEvidenceConversations: 1,
      changedOutcomes: 1,
      outcomeChangeRate: 1,
    });
  });

  it("uses the recorded historical outcome before a published pointer exists", () => {
    const result = evaluateConversation(conversation(), {
      baseline: [],
      candidate: [offer("22222222-2222-4222-8222-222222222222", 700)],
      baselineSource: "HISTORICAL_ACTUAL",
    });
    expect(result.evaluationStatus).toBe("EVALUATED");
    expect(result.baselineOutcome).toContain('"source":"HISTORICAL_ACTUAL"');
    expect(result.baselineOutcome).toContain('"actualOutcome":"CHECKOUT_PREVIEW"');
  });

  it("marks pre-publish replay insufficient when the historical outcome is absent", () => {
    const result = evaluateConversation(conversation({ actualOutcome: null }), {
      baseline: [],
      candidate: [offer("22222222-2222-4222-8222-222222222222", 700)],
      baselineSource: "HISTORICAL_ACTUAL",
    });
    expect(result.evaluationStatus).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.failureCodes).toContain("HISTORICAL_ACTUAL_OUTCOME_MISSING");
  });
});
