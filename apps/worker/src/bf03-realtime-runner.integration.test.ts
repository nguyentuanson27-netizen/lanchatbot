import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import type { AgentProposalV1 } from "@lana/contracts";
import type {
  RuntimePolicyResolution,
  RuntimePolicyResolverPort,
} from "@lana/chat-runtime";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import {
  BF03_CORRECTION_REASON_CODE,
  RealtimeRunner,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
  type RealtimeTagObservationProvider,
} from "./bf03-realtime-runner.js";

const occurredAt = "2026-08-09T00:00:00.000Z";
const pageId = "1198992073286645";
const conversationHash = "meta:v1:bf03-customer";

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

function proposal(
  intent: AgentProposalV1["businessFactQuery"]["intent"],
): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "correction",
    conversationStage: "PRODUCT_MATCHED",
    productId: "SD398",
    action: "REPLY",
    reply: "Dạ đúng rồi chị, em ghi nhận ạ.",
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

function modelResult(value: AgentProposalV1) {
  return {
    proposal: value,
    modelVersion: "bf03-test-model",
    latencyMs: 1,
    tokenUsage: {},
  };
}

function policyResolution(
  policy: "LEGACY" | "CORRECTION_CONTAINMENT_V1",
): RuntimePolicyResolution {
  return {
    status: "RESOLVED",
    source: "DATABASE",
    mayAffectOutbound: true,
    reasonCodes: [],
    audit: {
      schemaVersion: 1,
      resolutionId: "00000000-0000-4000-8000-000000000003",
      pageId,
      channel: "PUBLISHED",
      status: "RESOLVED",
      source: "DATABASE",
      sideEffects: "LIVE_OUTBOUND",
      bundleId: "runtime:bf03-test",
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
      bundleId: "runtime:bf03-test",
      bundleHash: `sha256:${"c".repeat(64)}`,
      pageId,
      channel: "PUBLISHED",
      sideEffects: "LIVE_OUTBOUND",
      resolvedAt: occurredAt,
      policy: { policyVersion: "bf03-test" } as never,
      versionReferences: [],
      artifacts: {
        shopPolicy: {} as never,
        offerPolicy: {} as never,
        closingStrategy: {
          replyReconciliationPolicy: "LEGACY",
          correctionDialoguePolicy: policy,
        } as never,
        sizeCharts: {},
        handoffMatrix: null,
        paymentPolicy: null,
      },
    },
  };
}

function claimFor(text: string, index: number) {
  const sequence = 151 + index;
  const eventKey = `meta:${pageId}:message:bf03-${index}`;
  return {
    inboxId: `2a9afc47-978a-4b74-9653-3c89e75a89b${index}`,
    pageId,
    eventKey,
    conversationHash,
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: sequence,
    attemptCount: 1,
    leaseToken: "68c52ee9-9348-481d-a366-a6178618da4c",
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
        traceId: index === 0
          ? "3021af34-c98c-4086-a33c-3ecb2ad8f8f4"
          : "4021af34-c98c-4086-a33c-3ecb2ad8f8f5",
        eventKey,
        pageId,
        messageId: `bf03-message-${index}`,
        senderId: "customer-1",
        conversationId: conversationHash,
        occurredAt,
        isEcho: false,
        appId: null,
        text,
        attachments: [],
      },
    },
  };
}

function createHarness(input: {
  messages: readonly string[];
  nativeBatch?: boolean;
  policy?: "LEGACY" | "CORRECTION_CONTAINMENT_V1";
  currentProductId?: string | null;
  modelIntent?: AgentProposalV1["businessFactQuery"]["intent"];
}) {
  const policy = input.policy ?? "CORRECTION_CONTAINMENT_V1";
  const claims = input.messages.map(claimFor);
  const lastClaim = claims.at(-1)!;
  const base = createConversationState({
    conversationId: "43820fd4-daa7-4917-9835-a38cb55120e6",
    routingOwner: "APP",
    now: new Date(occurredAt),
  });
  const state = {
    ...base,
    revision: 15,
    lastFence: 150,
    currentProductId: input.currentProductId ?? null,
    tagGateStatus: "VERIFIED_ABSENT" as const,
    blockingTag: null,
    blockingTagVerifiedAt: occurredAt,
    updatedAt: occurredAt,
  };

  const complete = vi.fn(async () => true);
  const completeBatch = vi.fn(async () => true);
  const inbox: RealtimeInboxPort = input.nativeBatch
    ? {
        claimNext: vi.fn(async () => null),
        claimNextBatch: vi.fn()
          .mockResolvedValueOnce({
            pageId,
            conversationHash,
            generation: 3,
            leaseToken: lastClaim.leaseToken,
            inboxIds: claims.map(({ inboxId }) => inboxId),
            evaluationGroupId: "bf03-batch",
            eventKind: "CUSTOMER" as const,
            firstReceiveSequence: claims[0]!.receiveSequence,
            lastReceiveSequence: lastClaim.receiveSequence,
            attemptCount: 1,
            items: claims,
          })
          .mockResolvedValueOnce(null),
        complete,
        completeBatch,
        isBatchCurrent: vi.fn(async () => true),
        retry: vi.fn(async () => true),
        retryBatch: vi.fn(async () => true),
        failPermanent: vi.fn(async () => true),
        failBatchPermanent: vi.fn(async () => true),
      }
    : {
        claimNext: vi.fn()
          .mockResolvedValueOnce(lastClaim)
          .mockResolvedValueOnce(null),
        complete,
        retry: vi.fn(async () => true),
        failPermanent: vi.fn(async () => true),
      };

  let committed: Parameters<RealtimeRuntimePort["commit"]>[0] | null = null;
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
    commit: vi.fn(async (value) => {
      committed = value;
      return {
        stateCommitted: true,
        metaOutboxCreated: value.metaPlan?.messages.length ?? 0,
        pancakeTagOutboxCreated: false,
        handoffEventCreated: value.handoffEventPlan !== undefined,
        sendAuthorized: true,
        reasonCodes: [],
        inboxBatchStatus: input.nativeBatch ? "COMMITTED" as const : "NOT_REQUESTED" as const,
      };
    }),
    linkProviderConversation: vi.fn(async () => undefined),
  };

  const generate = vi.fn(async () =>
    modelResult(proposal(input.modelIntent ?? "SIZE"))
  );
  const model: RealtimeModelPort = {
    generate,
    groundWithFacts: vi.fn(async (_context, initial) => modelResult(initial)),
  };

  const searchText = vi.fn(async (value: string) => {
    const normalized = value.trim().toLocaleUpperCase("vi-VN");
    return normalized === "SD398"
      ? {
          status: "MATCHED" as const,
          matchKind: "EXACT_CODE" as const,
          score: 1,
          gap: null,
          product,
        }
      : {
          status: "NOT_FOUND" as const,
          reasonCode: "NO_CANDIDATES" as const,
        };
  });
  const productSearch: RealtimeProductSearchPort = {
    searchText,
    searchImage: vi.fn(async () => ({
      status: "NOT_FOUND" as const,
      reasonCode: "NO_CANDIDATES" as const,
    })),
  };

  const resolveFacts = vi.fn(async () => ({
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
  }));
  const facts = {
    ready: vi.fn(async () => true),
    resolve: resolveFacts,
    close: vi.fn(async () => undefined),
  } as unknown as BusinessFactsReader;

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
    resolve: vi.fn(async () => policyResolution(policy)),
  };

  const runner = new RealtimeRunner(
    inbox,
    runtime,
    model,
    facts,
    productSearch,
    tags,
    {
      workerId: "worker-bf03",
      mode: "LIVE",
      sendEnabled: true,
      policyChannel: "PUBLISHED",
      decisionTelemetryEnabled: true,
      decisionAuditV2Enabled: true,
      releaseId: "bf03-test",
    },
    undefined,
    undefined,
    undefined,
    undefined,
    policyResolver,
  );

  return {
    runner,
    generate,
    searchText,
    resolveFacts,
    committed: () => committed,
  };
}

function modelContext(harness: ReturnType<typeof createHarness>) {
  return harness.generate.mock.calls[0]?.[0] ?? [];
}

function hasBf03Instruction(context: ReturnType<typeof modelContext>): boolean {
  return context.some((entry) =>
    entry.senderType === "SYSTEM" &&
    entry.text.includes("BF03_CORRECTION_CONTAINMENT")
  );
}

function hasBf03Evidence(
  value: Parameters<RealtimeRuntimePort["commit"]>[0] | null,
): boolean {
  return (value?.decisionEvents ?? []).some((event) =>
    event.reasonCodes.includes(BF03_CORRECTION_REASON_CODE)
  );
}

describe("BF-03 RealtimeRunner", () => {
  it("contains the reported correction through the runner without invoking facts and restores raw model context", async () => {
    const text = "có giá vs size rồi mà";
    const harness = createHarness({
      messages: [text],
      currentProductId: "SD398",
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.resolveFacts).not.toHaveBeenCalled();
    expect(harness.generate).toHaveBeenCalledOnce();
    const context = modelContext(harness);
    expect(context).toContainEqual(expect.objectContaining({
      senderType: "CUSTOMER",
      text,
    }));
    expect(hasBf03Instruction(context)).toBe(true);

    const commit = harness.committed();
    expect(hasBf03Evidence(commit)).toBe(true);
    expect(commit?.decisionEvents ?? []).not.toContainEqual(expect.objectContaining({
      eventType: "SIZE_CONSULT_STARTED",
    }));
    expect(commit?.metaPlan?.messages).toEqual([
      { kind: "TEXT", text: "Dạ đúng rồi chị, em ghi nhận ạ." },
    ]);
  });

  it("preserves an explicit product code in a single correction turn", async () => {
    const harness = createHarness({
      messages: ["SD398 có giá với size rồi mà"],
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.searchText).toHaveBeenCalledWith("SD398");
    expect(harness.committed()?.state.currentProductId).toBe("SD398");
    expect(harness.resolveFacts).not.toHaveBeenCalled();
    expect(hasBf03Evidence(harness.committed())).toBe(true);
  });

  it("preserves a preceding explicit product-code message in a native batch", async () => {
    const harness = createHarness({
      messages: ["SD398", "size có rồi mà"],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.searchText).toHaveBeenCalledWith("SD398");
    expect(harness.committed()?.state.currentProductId).toBe("SD398");
    expect(harness.resolveFacts).not.toHaveBeenCalled();
    expect(hasBf03Evidence(harness.committed())).toBe(true);
  });

  it("keeps a mixed PRICE request on the normal fact path instead of containing the turn", async () => {
    const harness = createHarness({
      messages: ["size có rồi mà, cho chị xin giá"],
      currentProductId: "SD398",
      modelIntent: "PRICE",
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.resolveFacts).toHaveBeenCalled();
    expect(hasBf03Instruction(modelContext(harness))).toBe(false);
    expect(hasBf03Evidence(harness.committed())).toBe(false);
  });

  it("keeps LEGACY behavior inert", async () => {
    const harness = createHarness({
      messages: ["có giá vs size rồi mà"],
      currentProductId: "SD398",
      policy: "LEGACY",
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.resolveFacts).toHaveBeenCalled();
    expect(hasBf03Instruction(modelContext(harness))).toBe(false);
    expect(hasBf03Evidence(harness.committed())).toBe(false);
  });
});
