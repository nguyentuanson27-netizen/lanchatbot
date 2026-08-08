import { createHash } from "node:crypto";
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

const occurredAt = "2026-08-08T07:00:00.000Z";
const pageId = "1198992073286645";
const conversationHash = "meta:v1:bf01-customer";
const fallbackText = "Chị muốn em làm rõ phần nào để em trả lời đúng ý chị?";
const safeRepairText = "Chị muốn em làm rõ biến thể nào của mẫu này để em trả lời đúng ý chị?";

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

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function renderedReplyHash(text: string): string {
  return sha256(JSON.stringify([{
    kind: "TEXT",
    valueHash: sha256(text),
  }]));
}

function proposal(
  action: AgentProposalV1["action"],
  reply = "",
): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "variant_follow_up",
    conversationStage: "PRODUCT_MATCHED",
    productId: "SD398",
    action,
    reply,
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent: "NONE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
    strategyAnalysis: {
      need: "NOT_ENOUGH_CONTEXT",
      barrier: "NONE",
      decisionFactor: "UNKNOWN",
      recommendedStrategy: "STRATEGY_ASK_CLARIFY",
      confidence: 0.9,
      evidence: ["DETERMINISTIC_FALLBACK"],
    },
  };
}

function modelResult(value: AgentProposalV1) {
  return {
    proposal: value,
    modelVersion: "bf01-test-model",
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
      resolutionId: "00000000-0000-4000-8000-000000000001",
      pageId,
      channel: "PUBLISHED",
      status: "RESOLVED",
      source: "DATABASE",
      sideEffects: "LIVE_OUTBOUND",
      bundleId: "runtime:bf01-test",
      bundleHash: `sha256:${"a".repeat(64)}`,
      versionIds: [],
      reasonCodes: [],
      pinScopeType: null,
      pinScopeId: null,
      occurredAt,
    },
    auditWrite: "RECORDED",
    bundle: {
      schemaVersion: 1,
      bundleId: "runtime:bf01-test",
      bundleHash: `sha256:${"a".repeat(64)}`,
      pageId,
      channel: "PUBLISHED",
      sideEffects: "LIVE_OUTBOUND",
      resolvedAt: occurredAt,
      policy: { policyVersion: "bf01-test" } as never,
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

type RepairMode = "SAFE" | "UNSAFE" | "THROW";

function createHarness(input: {
  repairMode?: RepairMode;
  quotaResults?: readonly boolean[];
  conversationOwner?: "BOT" | "HUMAN";
  blockingTag?: "NHAN_VIEN" | null;
} = {}) {
  const base = createConversationState({
    conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
    routingOwner: "APP",
    now: new Date(occurredAt),
  });
  const state = {
    ...base,
    currentProductId: "SD398",
    conversationOwner: input.conversationOwner ?? "BOT",
    tagGateStatus: input.blockingTag ? "BLOCKING" as const : "VERIFIED_ABSENT" as const,
    blockingTag: input.blockingTag ?? null,
    blockingTagVerifiedAt: occurredAt,
    updatedAt: occurredAt,
  };
  const claim = {
    inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
    pageId,
    eventKey: "meta:1198992073286645:message:bf01-variant",
    conversationHash,
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: 141,
    attemptCount: 1,
    leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
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
        traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
        eventKey: "meta:1198992073286645:message:bf01-variant",
        pageId,
        messageId: "bf01-variant",
        senderId: "customer-1",
        conversationId: conversationHash,
        occurredAt,
        isEcho: false,
        appId: null,
        text: "có biến thể gì nữa",
        attachments: [],
      },
    },
  };
  const inbox: RealtimeInboxPort = {
    claimNext: vi.fn().mockResolvedValueOnce(claim).mockResolvedValueOnce(null),
    complete: vi.fn(async () => true),
    retry: vi.fn(async () => true),
    failPermanent: vi.fn(async () => true),
  };

  let committed: Parameters<RealtimeRuntimePort["commit"]>[0] | null = null;
  const commit = vi.fn(async (value: Parameters<RealtimeRuntimePort["commit"]>[0]) => {
    committed = value;
    return {
      stateCommitted: true,
      metaOutboxCreated: value.metaPlan?.messages.length ?? 0,
      pancakeTagOutboxCreated: false,
      handoffEventCreated: false,
      sendAuthorized: true,
      reasonCodes: [],
      inboxBatchStatus: "NOT_REQUESTED" as const,
    };
  });
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn(async () => ({
      conversationId: state.conversationId,
      pageId,
      customerHash: conversationHash,
      stateVersion: state.revision,
      state,
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    })),
    commit,
    linkProviderConversation: vi.fn(async () => undefined),
  };

  const generate = vi.fn(async () => {
    if (generate.mock.calls.length === 1) return modelResult(proposal("NO_REPLY"));
    if (input.repairMode === "THROW") throw new Error("BF01_REPAIR_TEST_FAILURE");
    if (input.repairMode === "UNSAFE") {
      return modelResult(proposal(
        "REPLY",
        "Mẫu này giá 1.199.000đ. Chị muốn xem thêm biến thể nào?",
      ));
    }
    return modelResult(proposal("REPLY", safeRepairText));
  });
  const model: RealtimeModelPort = {
    generate,
    groundWithFacts: vi.fn(async (_context, initial) => modelResult(initial)),
  };

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
  const tags: RealtimeTagObservationProvider = {
    observe: vi.fn(async ({ now }) => ({
      schemaVersion: 1 as const,
      verified: true,
      blockingTag: input.blockingTag ?? null,
      observedTagIds: [],
      observedAt: now.toISOString(),
      reasonCode: null,
    })),
  };
  const policyResolver: RuntimePolicyResolverPort = {
    resolve: vi.fn(async () => policyResolution()),
  };

  const quotaResults = [...(input.quotaResults ?? [true, true])];
  const reserve = vi.fn(async () => quotaResults.shift() ?? true);
  const quota: RealtimeGenerationQuota = {
    reserve,
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
      workerId: "worker-bf01",
      mode: "LIVE",
      sendEnabled: true,
      policyChannel: "PUBLISHED",
      decisionTelemetryEnabled: true,
      decisionAuditV2Enabled: true,
      wave2StrategyEnabled: true,
      releaseId: "bf01-test",
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
    reserve,
    commit,
    committed: () => committed,
  };
}

function committedText(
  value: Parameters<RealtimeRuntimePort["commit"]>[0] | null,
): string {
  return (value?.metaPlan?.messages ?? [])
    .filter((message): message is { kind: "TEXT"; text: string } =>
      message.kind === "TEXT"
    )
    .map(({ text }) => text)
    .join("\n");
}

describe("BF-01 runner reconciliation", () => {
  it("commits exactly one guarded reply and matching audit hash for the reported incident", async () => {
    const harness = createHarness();

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.committed();
    expect(harness.generate).toHaveBeenCalledTimes(2);
    expect(harness.reserve).toHaveBeenCalledTimes(2);
    expect(commit?.metaPlan?.messages).toEqual([
      { kind: "TEXT", text: safeRepairText },
    ]);

    const reconciled = commit?.decisionEvents?.find((event) =>
      event.reasonCodes.includes("BF01_ASK_CLARIFY_NO_REPLY_RECONCILED")
    );
    expect(reconciled).toMatchObject({
      action: "REPLY",
      reasonCodes: expect.arrayContaining([
        "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED",
        "BF01_MODEL_CLARIFICATION_REPAIR",
      ]),
      details: {
        outboundMessageCount: 1,
        renderedReplyHash: renderedReplyHash(safeRepairText),
      },
    });
  });

  it("rejects an unsafe repair and commits only the approved guarded fallback", async () => {
    const harness = createHarness({ repairMode: "UNSAFE" });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.committed();
    expect(harness.generate).toHaveBeenCalledTimes(2);
    expect(committedText(commit)).toBe(fallbackText);
    expect(committedText(commit)).not.toContain("1.199.000");
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      reasonCodes: expect.arrayContaining(["BF01_APPROVED_FALLBACK_USED"]),
    }));
  });

  it("uses the approved fallback when repair generation fails", async () => {
    const harness = createHarness({ repairMode: "THROW" });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.generate).toHaveBeenCalledTimes(2);
    expect(committedText(harness.committed())).toBe(fallbackText);
  });

  it("does not make the repair model call when the second quota reservation fails", async () => {
    const harness = createHarness({ quotaResults: [true, false] });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.committed();
    expect(harness.reserve).toHaveBeenCalledTimes(2);
    expect(harness.generate).toHaveBeenCalledTimes(1);
    expect(committedText(commit)).toBe(fallbackText);
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      reasonCodes: expect.arrayContaining([
        "BF01_REPAIR_QUOTA_UNAVAILABLE",
        "BF01_APPROVED_FALLBACK_USED",
      ]),
    }));
  });

  it("does not reconcile through human ownership or a blocking tag", async () => {
    const human = createHarness({ conversationOwner: "HUMAN" });
    expect(await human.runner.processOne()).toBe(true);
    expect(human.generate).toHaveBeenCalledTimes(0);
    expect(human.committed()?.metaPlan).toBeUndefined();

    const blocked = createHarness({ blockingTag: "NHAN_VIEN" });
    expect(await blocked.runner.processOne()).toBe(true);
    expect(blocked.generate).toHaveBeenCalledTimes(0);
    expect(blocked.committed()?.metaPlan).toBeUndefined();
  });
});
