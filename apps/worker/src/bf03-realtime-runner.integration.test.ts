import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import type { AgentProposalV1 } from "@lana/contracts";
import type {
  RuntimePolicyResolution,
  RuntimePolicyResolverPort,
} from "@lana/chat-runtime";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { ChatHistoryPort } from "./redis-chat-history.js";
import {
  BF03_CORRECTION_REASON_CODE,
  RealtimeRunner,
  type CanonicalChatHistoryPort,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
  type RealtimeTagObservationProvider,
} from "./bf03-realtime-runner.js";

const occurredAt = "2026-08-09T00:00:00.000Z";
const pageId = "1198992073286645";
const conversationHash = "meta:v1:bf03-customer";

interface BenchmarkCase {
  readonly id: string;
  readonly label: "CONTAIN" | "PASS_THROUGH";
  readonly category: string;
  readonly text: string;
  readonly expectedClassifierIntents?: readonly string[];
}

interface BenchmarkCorpus {
  readonly cases: readonly BenchmarkCase[];
}

const benchmarkCorpus = JSON.parse(readFileSync(new URL(
  "../../../benchmarks/bf03/correction-containment-v1.json",
  import.meta.url,
), "utf8")) as BenchmarkCorpus;

const mixedFactBenchmarkCases = benchmarkCorpus.cases.flatMap((benchmarkCase) => {
  const intents = benchmarkCase.expectedClassifierIntents ?? [];
  return benchmarkCase.label === "CONTAIN" &&
      intents.length === 1 &&
      intents[0] !== "SIZE"
    ? [[benchmarkCase.id, intents[0], benchmarkCase.text] as const]
    : [];
});

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

function claimFor(
  text: string,
  index: number,
  overrides: {
    readonly isEcho?: boolean;
    readonly envelopeSchemaVersion?: number;
  } = {},
) {
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
      schemaVersion: (overrides.envelopeSchemaVersion ?? 1) as 1,
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
        isEcho: overrides.isEcho ?? false,
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
  isEcho?: boolean;
  ownMetaMessage?: boolean;
  envelopeSchemaVersion?: number;
  batchDeliveries?: number;
  batchCurrentSequence?: readonly boolean[];
  compliantBf03Model?: boolean;
  concurrentSingleClaims?: boolean;
}) {
  const policy = input.policy ?? "CORRECTION_CONTAINMENT_V1";
  const claims = input.messages.map((text, index) => claimFor(text, index, {
    ...(input.isEcho === undefined ? {} : { isEcho: input.isEcho }),
    ...(input.envelopeSchemaVersion === undefined
      ? {}
      : { envelopeSchemaVersion: input.envelopeSchemaVersion }),
  }));
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
  const retry = vi.fn(async () => true);
  const retryBatch = vi.fn(async () => true);
  const claimNextBatch = vi.fn();
  const batchValue = {
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
  };
  for (let index = 0; index < (input.batchDeliveries ?? 1); index += 1) {
    claimNextBatch.mockResolvedValueOnce(batchValue);
  }
  claimNextBatch.mockResolvedValueOnce(null);
  let currentCheck = 0;
  const isBatchCurrent = vi.fn(async () => {
    const sequence = input.batchCurrentSequence ?? [true];
    const value = sequence[Math.min(currentCheck, sequence.length - 1)] ?? true;
    currentCheck += 1;
    return value;
  });
  const inbox: RealtimeInboxPort = input.nativeBatch
    ? {
        claimNext: vi.fn(async () => null),
        claimNextBatch,
        complete,
        completeBatch,
        isBatchCurrent,
        retry,
        retryBatch,
        failPermanent: vi.fn(async () => true),
        failBatchPermanent: vi.fn(async () => true),
      }
    : {
        claimNext: input.concurrentSingleClaims
          ? vi.fn(async () => claims.shift() ?? null)
          : vi.fn()
            .mockResolvedValueOnce(lastClaim)
            .mockResolvedValueOnce(null),
        complete,
        retry,
        failPermanent: vi.fn(async () => true),
      };

  let committed: Parameters<RealtimeRuntimePort["commit"]>[0] | null = null;
  const loadOrCreate = vi.fn(async () => ({
      conversationId: state.conversationId,
      pageId,
      customerHash: conversationHash,
      stateVersion: state.revision,
      state,
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    }));
  const commit = vi.fn(async (value: Parameters<RealtimeRuntimePort["commit"]>[0]) => {
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
    });
  const linkProviderConversation = vi.fn(async () => undefined);
  const isOwnMetaMessage = vi.fn(async () => input.ownMetaMessage ?? false);
  const runtime: RealtimeRuntimePort = {
    loadOrCreate,
    commit,
    linkProviderConversation,
    isOwnMetaMessage,
  };

  const generatedContexts: Parameters<RealtimeModelPort["generate"]>[0][] = [];
  const generate: RealtimeModelPort["generate"] = async (context) => {
    generatedContexts.push(context);
    if (input.compliantBf03Model) {
      const instruction = [...context].reverse().find((entry) =>
        entry.senderType === "SYSTEM" &&
        entry.text.includes("BF03_CORRECTION_CONTAINMENT")
      );
      const payload = instruction
        ? JSON.parse(instruction.text) as {
            readonly allowedBusinessFactIntents?: readonly AgentProposalV1["businessFactQuery"]["intent"][];
          }
        : null;
      return modelResult(proposal(payload?.allowedBusinessFactIntents?.[0] ?? "NONE"));
    }
    return modelResult(proposal(input.modelIntent ?? "SIZE"));
  };
  const groundWithFacts = vi.fn(async (_context, initial) => modelResult(initial));
  const model: RealtimeModelPort = {
    generate,
    groundWithFacts,
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
  const resolvePolicy = vi.fn(async () => policyResolution(policy));
  const policyResolver: RuntimePolicyResolverPort = { resolve: resolvePolicy };

  const historyAppends: Parameters<ChatHistoryPort["append"]>[1][] = [];
  const history: ChatHistoryPort = {
    ready: vi.fn(async () => true),
    load: vi.fn(async () => []),
    append: vi.fn(async (_conversationId, value) => {
      historyAppends.push(value);
      return true;
    }),
    close: vi.fn(async () => undefined),
  };

  const canonicalInbound: Parameters<CanonicalChatHistoryPort["recordInboundCustomerMessage"]>[0][] = [];
  const canonicalHistory: CanonicalChatHistoryPort = {
    recordInboundCustomerMessage: vi.fn(async (value) => {
      canonicalInbound.push(value);
      return { messagePk: `message-pk-${canonicalInbound.length}` };
    }),
    recordOutboundHumanMessage: vi.fn(async () => undefined),
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
    history,
    canonicalHistory,
    undefined,
    policyResolver,
  );

  return {
    runner,
    generatedContexts,
    groundWithFacts,
    historyAppends,
    canonicalInbound,
    searchText,
    resolveFacts,
    loadOrCreate,
    commit,
    linkProviderConversation,
    isOwnMetaMessage,
    resolvePolicy,
    observeTags: tags.observe,
    complete,
    completeBatch,
    retry,
    retryBatch,
    committed: () => committed,
  };
}

function modelContext(harness: ReturnType<typeof createHarness>) {
  return harness.generatedContexts[0] ?? [];
}

function customerTexts(context: ReturnType<typeof modelContext>): string[] {
  return context
    .filter((entry) => entry.senderType === "CUSTOMER")
    .map((entry) => entry.text);
}

function hasBf03Instruction(context: ReturnType<typeof modelContext>): boolean {
  return context.some((entry) =>
    entry.senderType === "SYSTEM" &&
    entry.text.includes("BF03_CORRECTION_CONTAINMENT")
  );
}

function bf03AllowedFactIntents(
  context: ReturnType<typeof modelContext>,
): readonly AgentProposalV1["businessFactQuery"]["intent"][] | null {
  const instruction = [...context].reverse().find((entry) =>
    entry.senderType === "SYSTEM" &&
    entry.text.includes("BF03_CORRECTION_CONTAINMENT")
  );
  if (!instruction) return null;
  const payload = JSON.parse(instruction.text) as {
    readonly allowedBusinessFactIntents?: readonly AgentProposalV1["businessFactQuery"]["intent"][];
  };
  return payload.allowedBusinessFactIntents ?? null;
}

function hasBf03Evidence(
  value: Parameters<RealtimeRuntimePort["commit"]>[0] | null,
): boolean {
  return (value?.decisionEvents ?? []).some((event) =>
    event.reasonCodes.includes(BF03_CORRECTION_REASON_CODE)
  );
}

function expectNoDomainEffects(harness: ReturnType<typeof createHarness>): void {
  expect(harness.loadOrCreate).not.toHaveBeenCalled();
  expect(harness.linkProviderConversation).not.toHaveBeenCalled();
  expect(harness.resolvePolicy).not.toHaveBeenCalled();
  expect(harness.observeTags).not.toHaveBeenCalled();
  expect(harness.commit).not.toHaveBeenCalled();
  expect(harness.resolveFacts).not.toHaveBeenCalled();
  expect(harness.searchText).not.toHaveBeenCalled();
  expect(harness.generatedContexts).toHaveLength(0);
  expect(harness.historyAppends).toHaveLength(0);
  expect(harness.canonicalInbound).toHaveLength(0);
}

describe("BF-03 RealtimeRunner", () => {
  it("contains the reported correction without facts and restores raw model/history context", async () => {
    const text = "có giá vs size rồi mà";
    const harness = createHarness({
      messages: [text],
      currentProductId: "SD398",
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.resolveFacts).not.toHaveBeenCalled();
    expect(harness.generatedContexts).toHaveLength(1);
    const context = modelContext(harness);
    expect(context).toContainEqual(expect.objectContaining({
      senderType: "CUSTOMER",
      text,
    }));
    expect(hasBf03Instruction(context)).toBe(true);
    expect(harness.historyAppends).toContainEqual(expect.objectContaining({
      senderType: "CUSTOMER",
      text,
    }));
    expect(harness.canonicalInbound).toContainEqual(expect.objectContaining({ text }));

    const commit = harness.committed();
    expect(hasBf03Evidence(commit)).toBe(true);
    expect(commit?.decisionEvents ?? []).not.toContainEqual(expect.objectContaining({
      eventType: "SIZE_CONSULT_STARTED",
    }));
    expect(commit?.metaPlan?.messages).toEqual([
      { kind: "TEXT", text: "Dạ đúng rồi chị, em ghi nhận ạ." },
    ]);
  });

  it("contains correction-shaped rhetorical questions instead of treating punctuation as SIZE evidence", async () => {
    const text = "có giá vs size rồi mà?";
    const harness = createHarness({
      messages: [text],
      currentProductId: "SD398",
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.resolveFacts).not.toHaveBeenCalled();
    expect(customerTexts(modelContext(harness))).toContain(text);
    expect(hasBf03Instruction(modelContext(harness))).toBe(true);
    expect(hasBf03Evidence(harness.committed())).toBe(true);
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
    const messages = ["SD398", "size có rồi mà"] as const;
    const harness = createHarness({
      messages,
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.searchText).toHaveBeenCalledWith("SD398");
    expect(harness.committed()?.state.currentProductId).toBe("SD398");
    // A standalone product-code item may complete through the existing
    // deterministic fact path without calling the model. This regression is
    // specifically about preserving BF-02 verified product context.
    expect(hasBf03Evidence(harness.committed())).toBe(true);
  });

  it("restores same-timestamp native batch messages to the model in receive order", async () => {
    const messages = ["chị nhắc rồi đó", "size có rồi mà"] as const;
    const harness = createHarness({
      messages,
      nativeBatch: true,
      currentProductId: "SD398",
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.generatedContexts).toHaveLength(1);
    expect(customerTexts(modelContext(harness))).toEqual(messages);
    expect(hasBf03Instruction(modelContext(harness))).toBe(true);
    expect(hasBf03Evidence(harness.committed())).toBe(true);
  });

  it.each([
    ["PRICE" as const, "size có rồi mà, cho chị xin giá"],
    ["PRICE" as const, "cho chị xin giá; size có rồi mà"],
    ["PRICE" as const, "size có rồi mà bao nhiêu tiền em"],
    ["PRICE" as const, "bao nhiêu tiền em size có rồi mà"],
    ["PRICE" as const, "size co roi ma bao nhieu tien em"],
    ["PRICE" as const, "bao nhieu tien em size co roi ma"],
    ["STOCK" as const, "size có rồi mà, còn hàng không em"],
    ["STOCK" as const, "còn hàng không em; size có rồi mà"],
    ["STOCK" as const, "size có rồi mà hàng còn không em"],
    ["STOCK" as const, "hàng còn không em size có rồi mà"],
    ["STOCK" as const, "size co roi ma hang con khong em"],
    ["STOCK" as const, "hang con khong em size co roi ma"],
    ["ETA" as const, "size có rồi mà, khi nào giao tới chị"],
    ["ETA" as const, "khi nào giao tới chị; size có rồi mà"],
    ["ETA" as const, "size có rồi mà ship mấy ngày"],
    ["ETA" as const, "ship mấy ngày size có rồi mà"],
    ["ETA" as const, "size co roi ma ship may ngay"],
    ["ETA" as const, "ship may ngay size co roi ma"],
  ])("suppresses false SIZE while keeping mixed %s on the fact path", async (
    intent,
    text,
  ) => {
    const harness = createHarness({
      messages: [text],
      currentProductId: "SD398",
      compliantBf03Model: true,
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.resolveFacts).toHaveBeenCalledTimes(1);
    expect(harness.resolveFacts).toHaveBeenCalledWith(expect.objectContaining({ intent }));
    if (harness.generatedContexts.length > 0) {
      expect(harness.generatedContexts).toHaveLength(1);
      expect(hasBf03Instruction(modelContext(harness))).toBe(true);
      expect(bf03AllowedFactIntents(modelContext(harness))).toEqual([intent]);
    }
    expect(harness.groundWithFacts).toHaveBeenCalledTimes(
      harness.generatedContexts.length > 0 ? 1 : 0,
    );
    expect(hasBf03Evidence(harness.committed())).toBe(true);
    expect(harness.committed()?.metaPlan?.messages.length).toBeGreaterThan(0);
    expect(harness.committed()?.decisionEvents ?? []).not.toContainEqual(
      expect.objectContaining({ eventType: "SIZE_CONSULT_STARTED" }),
    );
  });

  it.each(mixedFactBenchmarkCases)(
    "couples benchmark %s to the final %s runtime contract",
    async (_id, intent, text) => {
      const harness = createHarness({
        messages: [text],
        currentProductId: "SD398",
        compliantBf03Model: true,
      });

      expect(await harness.runner.processOne()).toBe(true);
      if (harness.generatedContexts.length > 0) {
        expect(harness.generatedContexts).toHaveLength(1);
        expect(bf03AllowedFactIntents(modelContext(harness))).toEqual([intent]);
      }
      expect(harness.resolveFacts).toHaveBeenCalledTimes(1);
      expect(harness.resolveFacts).toHaveBeenCalledWith(
        expect.objectContaining({ intent }),
      );
      expect(harness.resolveFacts).not.toHaveBeenCalledWith(
        expect.objectContaining({ intent: "SIZE" }),
      );
      expect(harness.groundWithFacts).toHaveBeenCalledTimes(
        harness.generatedContexts.length > 0 ? 1 : 0,
      );
      expect(harness.committed()?.metaPlan?.messages.length).toBeGreaterThan(0);
      expect(harness.committed()?.decisionEvents ?? []).not.toContainEqual(
        expect.objectContaining({ eventType: "SIZE_CONSULT_STARTED" }),
      );
    },
  );

  it("isolates BF-03 raw context across concurrent processOne calls", async () => {
    const messages = [
      "size có rồi mà hàng còn không em",
      "ship mấy ngày size có rồi mà",
    ] as const;
    const harness = createHarness({
      messages,
      currentProductId: "SD398",
      compliantBf03Model: true,
      concurrentSingleClaims: true,
    });

    expect(await Promise.all([
      harness.runner.processOne(),
      harness.runner.processOne(),
    ])).toEqual([true, true]);
    expect(harness.generatedContexts).toHaveLength(2);
    expect(harness.generatedContexts.map(customerTexts)).toEqual(
      expect.arrayContaining([[messages[0]], [messages[1]]]),
    );
    expect(harness.generatedContexts.map(bf03AllowedFactIntents)).toEqual(
      expect.arrayContaining([["STOCK"], ["ETA"]]),
    );
    expect(harness.resolveFacts).toHaveBeenCalledTimes(2);
    expect(harness.resolveFacts).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "STOCK" }),
    );
    expect(harness.resolveFacts).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "ETA" }),
    );
    expect(harness.resolveFacts).not.toHaveBeenCalledWith(
      expect.objectContaining({ intent: "SIZE" }),
    );
    expect(harness.resolvePolicy).toHaveBeenCalledTimes(2);
    expect(harness.loadOrCreate).toHaveBeenCalledTimes(2);
    expect(harness.commit).toHaveBeenCalledTimes(2);
  });

  it("does not resolve policy or mutate conversation state for an own Meta echo", async () => {
    const harness = createHarness({
      messages: ["size có rồi mà"],
      isEcho: true,
      ownMetaMessage: true,
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.isOwnMetaMessage).toHaveBeenCalledTimes(1);
    expectNoDomainEffects(harness);
    expect(harness.complete).toHaveBeenCalledTimes(1);
  });

  it("does not resolve policy or mutate domain state for a malformed envelope", async () => {
    const harness = createHarness({
      messages: ["size có rồi mà"],
      envelopeSchemaVersion: 2,
    });

    expect(await harness.runner.processOne()).toBe(true);
    expectNoDomainEffects(harness);
    expect(harness.retry).toHaveBeenCalledTimes(1);
  });

  it("does not resolve policy or mutate domain state for a stale native generation", async () => {
    const harness = createHarness({
      messages: ["size có rồi mà"],
      nativeBatch: true,
      batchCurrentSequence: [false],
    });

    expect(await harness.runner.processOne()).toBe(true);
    expectNoDomainEffects(harness);
    expect(harness.completeBatch).toHaveBeenCalledWith(
      expect.objectContaining({ generation: 3 }),
      true,
    );
  });

  it("keeps replay after a committed lost ACK side-effect free", async () => {
    const harness = createHarness({
      messages: ["size có rồi mà"],
      nativeBatch: true,
      currentProductId: "SD398",
      batchDeliveries: 2,
      batchCurrentSequence: [true, false],
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.commit).toHaveBeenCalledTimes(1);
    expect(harness.resolvePolicy).toHaveBeenCalledTimes(1);
    expect(harness.generatedContexts).toHaveLength(1);

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.commit).toHaveBeenCalledTimes(1);
    expect(harness.resolvePolicy).toHaveBeenCalledTimes(1);
    expect(harness.loadOrCreate).toHaveBeenCalledTimes(1);
    expect(harness.generatedContexts).toHaveLength(1);
    expect(harness.resolveFacts).not.toHaveBeenCalled();
    expect(harness.completeBatch).toHaveBeenCalledWith(
      expect.objectContaining({ generation: 3 }),
      true,
    );
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
