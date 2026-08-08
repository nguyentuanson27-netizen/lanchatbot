import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import type { AgentProposalV1 } from "@lana/contracts";
import type {
  RuntimePolicyResolution,
  RuntimePolicyResolverPort,
} from "@lana/chat-runtime";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { RealtimeGenerationQuota } from "./realtime-quota.js";
import {
  RealtimeRunner,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
  type RealtimeTagObservationProvider,
} from "./bf02-realtime-runner.js";

const occurredAt = "2026-08-08T16:30:00.000Z";
const pageId = "1198992073286645";
const conversationHash = "meta:v1:bf01-typed-intent";
const safeRepairText = "Chị muốn em làm rõ thông tin nào để em hỗ trợ chính xác?";
const fallbackText = "Chị muốn em làm rõ phần nào để em trả lời đúng ý chị?";

const product = {
  productId: "SD398",
  parentProductId: "SD398",
  canonicalCode: "SD398",
  aliases: [],
  title: "Áo dài SD398",
  colors: [],
  materials: ["lụa"],
  silhouettes: ["suông"],
  occasions: [],
  imageUrls: [],
  images: [],
  catalogVersion: "catalog-v2",
};

type TypedFactIntent = "PRICE" | "ETA";

function proposal(
  action: AgentProposalV1["action"],
  businessFactIntent: AgentProposalV1["businessFactQuery"]["intent"],
  reply = "",
): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "typed_direct_question",
    conversationStage: "PRODUCT_MATCHED",
    productId: "SD398",
    action,
    reply,
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent: businessFactIntent,
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
    strategyAnalysis: {
      need: "FOLLOW_UP_NEEDED",
      barrier: "NONE",
      decisionFactor: "UNKNOWN",
      recommendedStrategy: "STRATEGY_CLOSE",
      confidence: 0.9,
      evidence: ["DETERMINISTIC_FALLBACK"],
    },
  };
}

function modelResult(value: AgentProposalV1) {
  return {
    proposal: value,
    modelVersion: "bf01-typed-intent-test-model",
    latencyMs: 5,
    tokenUsage: {
      promptTokenCount: 12,
      candidatesTokenCount: 4,
      totalTokenCount: 16,
    },
  };
}

function policyResolution(): RuntimePolicyResolution {
  return {
    status: "RESOLVED",
    source: "DATABASE",
    mayAffectOutbound: true,
    reasonCodes: [],
    audit: {
      schemaVersion: 1,
      resolutionId: "00000000-0000-4000-8000-000000000099",
      pageId,
      channel: "PUBLISHED",
      status: "RESOLVED",
      source: "DATABASE",
      sideEffects: "LIVE_OUTBOUND",
      bundleId: "runtime:bf01-typed-intent-test",
      bundleHash: `sha256:${"c".repeat(64)}`,
      versionIds: [],
      reasonCodes: [],
      pinScopeType: null,
      pinScopeId: null,
      occurredAt,
    },
    auditWrite: "RECORDED",
    bundle: {
      schemaVersion: 1,
      bundleId: "runtime:bf01-typed-intent-test",
      bundleHash: `sha256:${"c".repeat(64)}`,
      pageId,
      channel: "PUBLISHED",
      sideEffects: "LIVE_OUTBOUND",
      resolvedAt: occurredAt,
      policy: { policyVersion: "bf01-typed-intent-test" } as never,
      versionReferences: [],
      artifacts: {
        shopPolicy: {} as never,
        offerPolicy: {} as never,
        closingStrategy: {
          replyReconciliationPolicy: "CLARIFY_RECONCILED_V1",
          replyReconciliationFallbackText: fallbackText,
        } as never,
        sizeCharts: {},
        handoffMatrix: null,
        paymentPolicy: null,
      },
    },
  };
}

function createHarness(input: {
  customerText: string;
  factIntent: TypedFactIntent;
  commitAckLostOnce?: boolean;
}) {
  const base = createConversationState({
    conversationId: "43820fd4-daa7-4917-9835-a38cb55120f9",
    routingOwner: "APP",
    now: new Date(occurredAt),
  });
  const initialState = {
    ...base,
    currentProductId: "SD398",
    conversationOwner: "BOT" as const,
    tagGateStatus: "VERIFIED_ABSENT" as const,
    blockingTag: null,
    blockingTagVerifiedAt: occurredAt,
    updatedAt: occurredAt,
  };
  const claim = {
    inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89f9",
    pageId,
    eventKey: `meta:${pageId}:message:bf01-${input.factIntent.toLowerCase()}`,
    conversationHash,
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: 191,
    attemptCount: 1,
    leaseToken: "68c52ee9-9348-481d-a366-a6178618daf9",
    envelope: {
      schemaVersion: 1 as const,
      customerSendEnabled: false as const,
      routing: {
        mode: "APP" as const,
        routingOwner: "APP" as const,
        evaluationOnly: false,
        reason: "APP_OWNS" as const,
      },
      message: {
        schemaVersion: 1 as const,
        traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f9",
        eventKey: `meta:${pageId}:message:bf01-${input.factIntent.toLowerCase()}`,
        pageId,
        messageId: `bf01-${input.factIntent.toLowerCase()}`,
        senderId: "customer-typed-intent",
        conversationId: conversationHash,
        occurredAt,
        isEcho: false,
        appId: null,
        text: input.customerText,
        attachments: [],
      },
    },
  };
  const retryClaim = {
    ...claim,
    attemptCount: 2,
    leaseToken: "68c52ee9-9348-481d-a366-a6178618daf8",
  };
  const claimNext = vi.fn();
  if (input.commitAckLostOnce) {
    claimNext
      .mockResolvedValueOnce(claim)
      .mockResolvedValueOnce(retryClaim)
      .mockResolvedValueOnce(null);
  } else {
    claimNext.mockResolvedValueOnce(claim).mockResolvedValueOnce(null);
  }
  const inbox: RealtimeInboxPort = {
    claimNext,
    complete: vi.fn(async () => true),
    retry: vi.fn(async () => true),
    failPermanent: vi.fn(async () => true),
  };

  let persistedState = initialState;
  let persistedStateVersion = initialState.revision;
  let committed: Parameters<RealtimeRuntimePort["commit"]>[0] | null = null;
  const commit = vi.fn(async (value: Parameters<RealtimeRuntimePort["commit"]>[0]) => {
    committed = value;
    persistedState = value.state as typeof initialState;
    persistedStateVersion += 1;
    if (input.commitAckLostOnce && commit.mock.calls.length === 1) {
      throw new Error("COMMIT_ACK_LOST");
    }
    return {
      stateCommitted: true,
      metaOutboxCreated: value.metaPlan?.messages.length ?? 0,
      pancakeTagOutboxCreated: false,
      handoffEventCreated: value.handoffEventPlan !== undefined,
      sendAuthorized: true,
      reasonCodes: [],
      inboxBatchStatus: "NOT_REQUESTED" as const,
    };
  });
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn(async () => ({
      conversationId: initialState.conversationId,
      pageId,
      customerHash: conversationHash,
      stateVersion: persistedStateVersion,
      state: persistedState,
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    })),
    commit,
    linkProviderConversation: vi.fn(async () => undefined),
  };

  const generate = vi.fn(async () =>
    generate.mock.calls.length === 1
      ? modelResult(proposal("NO_REPLY", input.factIntent))
      : modelResult(proposal("REPLY", "NONE", safeRepairText))
  );
  const model: RealtimeModelPort = {
    generate,
    groundWithFacts: vi.fn(async (_context, initial) => modelResult(initial)),
  };

  const facts = {
    ready: vi.fn(async () => true),
    resolve: vi.fn(async () => ({
      schemaVersion: 1 as const,
      status: "OK" as const,
      source: "POS_SNAPSHOT" as const,
      observedAt: occurredAt,
      expiresAt: "2099-01-01T00:00:00.000Z",
      productId: "SD398",
      facts: {
        schemaVersion: 1 as const,
        productId: "SD398",
        parentProductId: "SD398",
        offerType: "AO_DAI",
        listPriceVnd: null,
        salePriceVnd: 1_199_000,
        sizes: ["M", "L"],
        stockStatus: "IN_STOCK" as const,
        stockQuantity: 2,
        deliveryEta: { minDays: 1, maxDays: 2 },
        fulfillmentPolicy: "READY_STOCK",
        imageUrls: [],
      },
      reasonCode: null,
    })),
    close: vi.fn(async () => undefined),
  } as unknown as BusinessFactsReader;
  const productSearch: RealtimeProductSearchPort = {
    searchText: vi.fn(async () => ({
      status: "MATCHED" as const,
      matchKind: "SEMANTIC" as const,
      score: 0.95,
      gap: 0.2,
      product,
    })),
    searchImage: vi.fn(async () => ({
      status: "NOT_FOUND" as const,
      reasonCode: "NO_CANDIDATES" as const,
    })),
  };
  const tags: RealtimeTagObservationProvider = {
    observe: vi.fn(async ({ now }) => ({
      schemaVersion: 1 as const,
      verified: true,
      blockingTag: null,
      observedTagIds: [],
      observedAt: now.toISOString(),
      reasonCode: null,
    })),
  };
  const policyResolver: RuntimePolicyResolverPort = {
    resolve: vi.fn(async () => policyResolution()),
  };
  const quota: RealtimeGenerationQuota = {
    reserve: vi.fn(async () => true),
    close: vi.fn(async () => undefined),
  };

  const runner = new RealtimeRunner(
    inbox,
    runtime,
    model,
    facts,
    productSearch,
    tags,
    {
      workerId: "worker-bf01-typed-intent",
      mode: "LIVE",
      sendEnabled: true,
      policyChannel: "PUBLISHED",
      decisionTelemetryEnabled: true,
      decisionAuditV2Enabled: true,
      wave2StrategyEnabled: true,
      releaseId: "bf01-typed-intent-test",
    },
    quota,
    undefined,
    undefined,
    undefined,
    policyResolver,
  );

  return {
    runner,
    generate,
    commit,
    retry: inbox.retry,
    complete: inbox.complete,
    committed: () => committed,
  };
}

function clarificationEvents(
  commit: Parameters<RealtimeRuntimePort["commit"]>[0] | null,
) {
  return (commit?.decisionEvents ?? []).filter((event) =>
    event.eventType === "CLARIFICATION_REQUESTED"
  );
}

const directCases = [
  { customerText: "Mau nay mac khong?", factIntent: "PRICE" as const },
  { customerText: "Bao gio em nhan duoc?", factIntent: "ETA" as const },
];

describe("BF-01 typed semantic intent runner reconciliation", () => {
  it.each(directCases)(
    "reconciles $customerText from typed $factIntent evidence even when legacy event intent is null",
    async ({ customerText, factIntent }) => {
      const harness = createHarness({ customerText, factIntent });

      expect(await harness.runner.processOne()).toBe(true);
      const commit = harness.committed();
      expect(harness.generate).toHaveBeenCalledTimes(2);
      expect(commit?.metaPlan?.messages).toHaveLength(1);
      const reconciled = clarificationEvents(commit);
      expect(reconciled).toHaveLength(1);
      expect(reconciled[0]).toMatchObject({
        intent: factIntent,
        action: "REPLY",
        reasonCodes: expect.arrayContaining([
          "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
        ]),
        details: {
          outboundMessageCount: 1,
        },
      });
    },
  );

  it.each(directCases)(
    "keeps one $factIntent outbound and reconciliation event across lost ACK replay",
    async ({ customerText, factIntent }) => {
      const harness = createHarness({
        customerText,
        factIntent,
        commitAckLostOnce: true,
      });

      expect(await harness.runner.processOne()).toBe(true);
      expect(await harness.runner.processOne()).toBe(true);
      expect(await harness.runner.processOne()).toBe(false);

      expect(harness.generate).toHaveBeenCalledTimes(2);
      expect(harness.commit).toHaveBeenCalledTimes(1);
      expect(harness.retry).toHaveBeenCalledTimes(1);
      expect(harness.complete).toHaveBeenCalledTimes(1);

      const commit = harness.committed();
      expect(commit?.metaPlan?.messages).toHaveLength(1);
      const reconciled = clarificationEvents(commit);
      expect(reconciled).toHaveLength(1);
      expect(new Set(reconciled.map((event) => event.eventId)).size).toBe(1);
      expect(reconciled[0]).toMatchObject({
        intent: factIntent,
        action: "REPLY",
        reasonCodes: expect.arrayContaining([
          "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
        ]),
        details: {
          outboundMessageCount: 1,
        },
      });
    },
  );
});