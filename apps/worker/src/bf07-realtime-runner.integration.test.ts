import { describe, expect, it, vi } from "vitest";
import { createConversationState, type ConversationState } from "@lana/conversation-engine";
import type { StableProductDocument } from "@lana/business-tools";
import type { AgentProposalV1 } from "@lana/contracts";
import type { RuntimePolicyResolution, RuntimePolicyResolverPort } from "@lana/chat-runtime";
import {
  FailClosedTagObservationProvider,
  RealtimeRunner,
  type CanonicalChatHistoryPort,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
} from "./bf02-realtime-runner.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";

const occurredAt = "2026-08-10T00:00:00.000Z";
const pageId = "1198992073286645";
const conversationHash = "meta:v1:bf07-customer";
type RealtimeCommitInput = Parameters<RealtimeRuntimePort["commit"]>[0];
type DraftMultiProductClarification = NonNullable<
  RealtimeModelPort["draftMultiProductClarification"]
>;

function product(productId: string): StableProductDocument {
  return {
    productId,
    parentProductId: productId,
    canonicalCode: productId,
    aliases: [],
    title: `Áo dài ${productId}`,
    colors: [],
    materials: ["lụa"],
    silhouettes: ["suông"],
    occasions: [],
    imageUrls: [],
    images: [],
    catalogVersion: "catalog-v2",
  };
}

const sd375 = product("SD375");
const sd398 = product("SD398");

function claim(input: {
  readonly suffix: string;
  readonly sequence: number;
  readonly text: string | null;
  readonly imageUrls?: readonly string[];
}) {
  const eventKey = `meta:${pageId}:message:${input.suffix}`;
  return {
    inboxId: `2a9afc47-978a-4b74-9653-${input.sequence.toString().padStart(12, "0")}`,
    pageId,
    eventKey,
    conversationHash,
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: input.sequence,
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
        traceId: input.sequence === 1
          ? "3021af34-c98c-4086-a33c-3ecb2ad8f8f2"
          : "4021af34-c98c-4086-a33c-3ecb2ad8f8f3",
        eventKey,
        pageId,
        messageId: input.suffix,
        senderId: "customer-1",
        conversationId: conversationHash,
        occurredAt,
        isEcho: false,
        appId: null,
        text: input.text,
        attachments: (input.imageUrls ?? []).map((url) => ({ type: "image", url })),
      },
    },
  };
}

function proposal(reply: string): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "multi_product_selection",
    conversationStage: "PRODUCT_MATCHED",
    productId: null,
    action: "REPLY",
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
  };
}

function livePolicy(
  multiProductResolutionPolicy: "LEGACY" | "CLARIFY_V1" | "OMITTED" = "CLARIFY_V1",
): RuntimePolicyResolution {
  return {
    status: "RESOLVED",
    source: "DATABASE",
    mayAffectOutbound: true,
    reasonCodes: [],
    audit: {},
    auditWrite: "RECORDED",
    bundle: {
      schemaVersion: 1,
      bundleId: "runtime:bf07-test",
      bundleHash: `sha256:${"7".repeat(64)}`,
      pageId,
      channel: "PUBLISHED",
      sideEffects: "LIVE_OUTBOUND",
      resolvedAt: occurredAt,
      policy: {
        policyVersion: "bf07-test",
        multiItemOffer: { minimumProductCount: 99, discountBps: 0 },
      },
      versionReferences: [],
      artifacts: {
        shopPolicy: {},
        offerPolicy: {},
        closingStrategy: {
          mediaPartialResolutionPolicy: "PER_ASSET_V1",
          ...(multiProductResolutionPolicy === "OMITTED"
            ? {}
            : { multiProductResolutionPolicy }),
        },
        sizeCharts: {},
        handoffMatrix: null,
        paymentPolicy: null,
      },
    },
  } as unknown as RuntimePolicyResolution;
}

async function runSingleTurn(input: {
  readonly matchedProducts: readonly StableProductDocument[];
  readonly policy?: RuntimePolicyResolution;
  readonly text?: string | null;
  readonly quotaAllowed?: boolean;
  readonly quotaResults?: readonly boolean[];
  readonly draftReplies?: readonly string[];
  readonly modelAvailable?: boolean;
}) {
  const message = claim({
    suffix: "bf07-policy-scenario",
    sequence: 1,
    text: input.text ?? null,
    imageUrls: input.matchedProducts.map((matched, index) =>
      `https://cdn.example.test/${matched.productId}-${index}.jpg`
    ),
  });
  const commitInputs: RealtimeCommitInput[] = [];
  const commit = vi.fn(async (commitInput: RealtimeCommitInput) => {
    commitInputs.push(commitInput);
    return {
    stateCommitted: true,
    metaOutboxCreated: 1,
    pancakeTagOutboxCreated: false,
    handoffEventCreated: false,
    sendAuthorized: true,
    reasonCodes: [],
    };
  });
  const state = createConversationState({
    conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
    routingOwner: "APP",
    now: new Date(occurredAt),
  });
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn(async () => ({
      conversationId: state.conversationId,
      pageId,
      customerHash: conversationHash,
      stateVersion: 0,
      state,
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    })),
    commit,
    linkProviderConversation: vi.fn(async () => undefined),
  };
  const facts: BusinessFactsReader = {
    ready: vi.fn(async () => true),
    resolve: vi.fn(async (query: Parameters<BusinessFactsReader["resolve"]>[0]) => ({
      schemaVersion: 1 as const,
      status: "OK" as const,
      source: "POS_SNAPSHOT" as const,
      observedAt: occurredAt,
      expiresAt: "2099-01-01T00:00:00.000Z",
      productId: query.productId,
      facts: {
        schemaVersion: 1 as const,
        productId: query.productId,
        parentProductId: query.productId,
        offerType: "DIRECT" as const,
        listPriceVnd: null,
        salePriceVnd: query.productId === "SD375" ? 699000 : 799000,
        sizes: ["M", "L"],
        stockStatus: "IN_STOCK" as const,
        stockQuantity: 2,
        deliveryEta: null,
        fulfillmentPolicy: "READY_STOCK",
        imageUrls: [],
      },
      reasonCode: null,
    })),
    close: vi.fn(async () => undefined),
  };
  let draftIndex = 0;
  const draftMultiProductClarification = vi.fn<DraftMultiProductClarification>(async () => ({
    proposal: proposal(
      input.draftReplies?.[draftIndex++] ??
        "Chị muốn xem mẫu SD375 hay SD398 trước ạ?",
    ),
    modelVersion: "gemini-bf07-test",
    latencyMs: 5,
    tokenUsage: {},
  }));
  const generated = {
    proposal: {
      ...proposal("Chị muốn em hỗ trợ thêm gì ạ?"),
      intent: "product_advice",
    },
    modelVersion: "gemini-bf07-test",
    latencyMs: 5,
    tokenUsage: {},
  };
  const model: RealtimeModelPort = {
    generate: vi.fn(async () => generated),
    groundWithFacts: vi.fn(async () => generated),
    ...(input.modelAvailable === false ? {} : { draftMultiProductClarification }),
  };
  const policyResolver: RuntimePolicyResolverPort | undefined = input.policy
    ? { resolve: vi.fn(async () => input.policy!) }
    : undefined;
  let quotaIndex = 0;
  const quotaReserve = vi.fn(async () =>
    input.quotaResults?.[quotaIndex++] ?? input.quotaAllowed ?? true
  );
  const retry = vi.fn(async () => true);
  const runner = new RealtimeRunner(
    {
      claimNext: vi.fn(async () => message),
      complete: vi.fn(async () => true),
      retry,
      failPermanent: vi.fn(async () => true),
    },
    runtime,
    model,
    facts,
    {
      searchText: vi.fn(async () => ({
        status: "NOT_FOUND" as const,
        reasonCode: "NO_CANDIDATES" as const,
      })),
      searchImage: vi.fn(),
      searchImages: vi.fn(async () => input.matchedProducts.map((matched) => ({
        status: "MATCHED" as const,
        matchKind: "SEMANTIC" as const,
        product: matched,
        score: 0.9,
        gap: 0.1,
      }))),
    },
    new FailClosedTagObservationProvider(),
    { workerId: "worker-bf07", mode: "LIVE", sendEnabled: true, decisionTelemetryEnabled: true },
    input.quotaAllowed === undefined && input.quotaResults === undefined
      ? undefined
      : { reserve: quotaReserve, close: vi.fn(async () => undefined) },
    undefined,
    undefined,
    undefined,
    policyResolver,
  );
  expect(await runner.processOne()).toBe(true);
  expect(retry).not.toHaveBeenCalled();
  expect(commit).toHaveBeenCalledOnce();
  return {
    commitInput: commitInputs[0],
    draftMultiProductClarification,
    facts,
    quotaReserve,
  };
}

describe("BF-07 realtime multi-product clarification", () => {
  it("keeps omitted, explicit legacy, and shadow CLARIFY_V1 on the prior path", async () => {
    const shadowPolicy = {
      ...livePolicy(),
      mayAffectOutbound: false,
      bundle: { ...livePolicy().bundle!, sideEffects: "DISABLED" as const },
    } as RuntimePolicyResolution;
    const rejectedLivePolicy = {
      ...livePolicy(),
      mayAffectOutbound: false,
    } as RuntimePolicyResolution;
    const scenarios = [
      await runSingleTurn({ matchedProducts: [sd375, sd398] }),
      await runSingleTurn({ matchedProducts: [sd375, sd398], policy: livePolicy("OMITTED") }),
      await runSingleTurn({ matchedProducts: [sd375, sd398], policy: livePolicy("LEGACY") }),
      await runSingleTurn({ matchedProducts: [sd375, sd398], policy: shadowPolicy }),
      await runSingleTurn({ matchedProducts: [sd375, sd398], policy: rejectedLivePolicy }),
    ];
    for (const scenario of scenarios) {
      expect(scenario.draftMultiProductClarification).not.toHaveBeenCalled();
      expect(scenario.commitInput).toMatchObject({
        state: {
          mediaClarification: null,
          productSelections: [
            { label: "SET_1", productId: "SD375" },
            { label: "SET_2", productId: "SD398" },
          ],
        },
        metaPlan: { messages: [expect.objectContaining({ kind: "TEXT" })] },
      });
      expect(scenario.commitInput?.decisionEvents).not.toContainEqual(
        expect.objectContaining({ eventType: "CLARIFICATION_REQUESTED" }),
      );
    }
    const behavior = (scenario: typeof scenarios[number]) => ({
      currentProductId: scenario.commitInput?.state.currentProductId,
      productSelections: scenario.commitInput?.state.productSelections,
      mediaClarification: scenario.commitInput?.state.mediaClarification,
      messages: scenario.commitInput?.metaPlan?.messages,
      events: scenario.commitInput?.decisionEvents?.map((event) => ({
        eventType: event.eventType,
        reasonCodes: event.reasonCodes,
        productId: event.productId,
      })),
    });
    expect(behavior(scenarios[1]!)).toEqual(behavior(scenarios[0]!));
    expect(behavior(scenarios[2]!)).toEqual(behavior(scenarios[0]!));
    expect(behavior(scenarios[3]!)).toEqual(behavior(scenarios[0]!));
    expect(behavior(scenarios[4]!)).toEqual(behavior(scenarios[0]!));
  });

  it("deduplicates repeated media matches without opening clarification", async () => {
    const scenario = await runSingleTurn({
      matchedProducts: [sd398, sd398],
      policy: livePolicy(),
    });
    expect(scenario.draftMultiProductClarification).not.toHaveBeenCalled();
    expect(scenario.commitInput).toMatchObject({
      state: {
        currentProductId: "SD398",
        mediaClarification: null,
        productSelections: [],
      },
    });
    expect(scenario.commitInput?.decisionEvents).not.toContainEqual(
      expect.objectContaining({ eventType: "CLARIFICATION_REQUESTED" }),
    );
  });

  it.each([
    "xin giá giúp chị",
    "gửi ảnh mẫu cho chị",
  ])("prioritizes selection clarification for distinct media with text: %s", async (text) => {
    const scenario = await runSingleTurn({
      matchedProducts: [sd375, sd398],
      policy: livePolicy(),
      text,
    });
    expect(scenario.draftMultiProductClarification).toHaveBeenCalledOnce();
    expect(scenario.facts.resolve).not.toHaveBeenCalled();
    expect(scenario.commitInput?.handoffEventPlan).toBeUndefined();
    expect(scenario.commitInput).toMatchObject({
      state: {
        currentProductId: null,
        mediaClarification: { status: "ACTIVE" },
      },
    });
  });

  it("reserves quota once and fails closed without calling the model when denied", async () => {
    const scenario = await runSingleTurn({
      matchedProducts: [sd375, sd398],
      policy: livePolicy(),
      quotaAllowed: false,
    });
    expect(scenario.quotaReserve).toHaveBeenCalledOnce();
    expect(scenario.draftMultiProductClarification).not.toHaveBeenCalled();
    expect(scenario.commitInput?.metaPlan).toBeUndefined();
    expect(scenario.commitInput?.handoffEventPlan).toBeDefined();
    expect(scenario.commitInput?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "GUARD_BLOCKED",
      reasonCodes: expect.arrayContaining(["MULTI_PRODUCT_CLARIFICATION_QUOTA_DENIED"]),
    }));
  });

  it("emits only a valid repaired clarification after one rejected draft", async () => {
    const scenario = await runSingleTurn({
      matchedProducts: [sd375, sd398],
      policy: livePolicy(),
      quotaAllowed: true,
      draftReplies: [
        "SD375 giá 699k, chị chốt mẫu này nhé.",
        "Chị muốn xem mẫu SD375 hay SD398 trước ạ?",
      ],
    });
    expect(scenario.quotaReserve).toHaveBeenCalledTimes(2);
    expect(scenario.draftMultiProductClarification).toHaveBeenCalledTimes(2);
    expect(scenario.draftMultiProductClarification.mock.calls[1]?.[2]).toEqual(
      expect.arrayContaining([
        "MULTI_PRODUCT_CANDIDATE_OMITTED",
        "MULTI_PRODUCT_UNVERIFIED_COMMERCIAL_CLAIM",
      ]),
    );
    expect(scenario.commitInput?.metaPlan?.messages).toEqual([{
      kind: "TEXT",
      text: "Chị muốn xem mẫu SD375 hay SD398 trước ạ?",
    }]);
    expect(JSON.stringify(scenario.commitInput)).not.toContain("699k");
    expect(scenario.commitInput?.state.mediaClarification).toMatchObject({ status: "ACTIVE" });
    expect(scenario.commitInput?.handoffEventPlan).toBeUndefined();
  });

  it("fails closed when quota permits the draft but denies the repair call", async () => {
    const scenario = await runSingleTurn({
      matchedProducts: [sd375, sd398],
      policy: livePolicy(),
      quotaResults: [true, false],
      draftReplies: [
        "SD375 giá 699k, chị chốt mẫu này nhé.",
        "Chị muốn xem mẫu SD375 hay SD398 trước ạ?",
      ],
    });
    expect(scenario.quotaReserve).toHaveBeenCalledTimes(2);
    expect(scenario.draftMultiProductClarification).toHaveBeenCalledOnce();
    expect(scenario.commitInput?.metaPlan).toBeUndefined();
    expect(scenario.commitInput?.handoffEventPlan).toBeDefined();
    expect(JSON.stringify(scenario.commitInput)).not.toContain("699k");
    expect(scenario.commitInput?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "GUARD_BLOCKED",
      reasonCodes: expect.arrayContaining(["MULTI_PRODUCT_CLARIFICATION_QUOTA_DENIED"]),
    }));
  });

  it("does not consume quota when the clarification model port is unavailable", async () => {
    const scenario = await runSingleTurn({
      matchedProducts: [sd375, sd398],
      policy: livePolicy(),
      quotaAllowed: true,
      modelAvailable: false,
    });
    expect(scenario.quotaReserve).not.toHaveBeenCalled();
    expect(scenario.draftMultiProductClarification).not.toHaveBeenCalled();
    expect(scenario.commitInput?.handoffEventPlan).toBeDefined();
  });

  it("silently hands off before quota or model use when more than ten images arrive", async () => {
    const scenario = await runSingleTurn({
      matchedProducts: Array.from({ length: 11 }, (_, index) => product(`SD${100 + index}`)),
      policy: livePolicy(),
      quotaAllowed: true,
    });
    expect(scenario.quotaReserve).not.toHaveBeenCalled();
    expect(scenario.draftMultiProductClarification).not.toHaveBeenCalled();
    expect(scenario.commitInput?.handoffEventPlan).toBeDefined();
    expect(scenario.commitInput?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "GUARD_BLOCKED",
      reasonCodes: ["MEDIA_INPUT_LIMIT_EXCEEDED"],
    }));
    expect(scenario.commitInput?.metaPlan).toBeUndefined();
  });

  it("preserves BF-06 partial matches through BF-07 clarification and resolves explicit SD398 via BF-02", async () => {
    const claims = [
      claim({
        suffix: "bf07-images",
        sequence: 1,
        text: null,
        imageUrls: [
          "https://cdn.example.test/SD375.jpg",
          "https://cdn.example.test/download-fails.jpg",
          "https://cdn.example.test/SD398.jpg",
        ],
      }),
      claim({ suffix: "bf07-price", sequence: 2, text: "xin giá SD398" }),
    ];
    const claimNext = vi.fn(async () => claims.shift() ?? null);
    const complete = vi.fn(async () => true);
    const retry = vi.fn(async () => true);
    const inbox: RealtimeInboxPort = {
      claimNext,
      complete,
      retry,
      failPermanent: vi.fn(async () => true),
    };

    let persistedState: ConversationState = createConversationState({
      conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    let stateVersion = 0;
    const commits: Parameters<RealtimeRuntimePort["commit"]>[0][] = [];
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(async () => ({
        conversationId: persistedState.conversationId,
        pageId,
        customerHash: conversationHash,
        stateVersion,
        state: persistedState,
        routingOwner: "APP" as const,
        appSendEnabled: true,
        killSwitch: false,
      })),
      commit: vi.fn(async (input) => {
        commits.push(input);
        persistedState = input.state;
        stateVersion += 1;
        return {
          stateCommitted: true,
          metaOutboxCreated: input.metaPlan?.messages.length ?? 0,
          pancakeTagOutboxCreated: false,
          handoffEventCreated: input.handoffEventPlan !== undefined,
          sendAuthorized: true,
          reasonCodes: [],
        };
      }),
      linkProviderConversation: vi.fn(async () => undefined),
    };

    const searchText = vi.fn(async (value: string) => value.toLocaleUpperCase("vi").includes("SD398")
        ? { status: "MATCHED" as const, matchKind: "EXACT_CODE" as const, product: sd398, score: 1, gap: null }
        : { status: "NOT_FOUND" as const, reasonCode: "NO_CANDIDATES" as const });
    const searchImages = vi.fn(async (urls: readonly string[]) => urls.length === 3
      ? [
          {
            status: "MATCHED" as const,
            matchKind: "SEMANTIC" as const,
            product: sd375,
            score: 0.9,
            gap: 0.1,
          },
          {
            status: "ERROR" as const,
            reasonCode: "MEDIA_IMAGE_DOWNLOAD_FAILED" as const,
          },
          {
            status: "MATCHED" as const,
            matchKind: "SEMANTIC" as const,
            product: sd398,
            score: 0.9,
            gap: 0.1,
          },
        ]
      : [sd375, sd398].map((matched) => ({
          status: "MATCHED" as const,
          matchKind: "SEMANTIC" as const,
          product: matched,
          score: 0.9,
          gap: 0.1,
        })));
    const search: RealtimeProductSearchPort = {
      searchText,
      searchImage: vi.fn(),
      searchImages,
    };
    const facts: BusinessFactsReader = {
      ready: vi.fn(async () => true),
      resolve: vi.fn(async (query: Parameters<BusinessFactsReader["resolve"]>[0]) => ({
        schemaVersion: 1 as const,
        status: "OK" as const,
        source: "POS_SNAPSHOT" as const,
        observedAt: occurredAt,
        expiresAt: "2099-01-01T00:00:00.000Z",
        productId: query.productId,
        facts: {
          schemaVersion: 1 as const,
          productId: query.productId,
          parentProductId: query.productId,
          offerType: "DIRECT" as const,
          listPriceVnd: null,
          salePriceVnd: 799000,
          sizes: ["M", "L"],
          stockStatus: "IN_STOCK" as const,
          stockQuantity: 2,
          deliveryEta: null,
          fulfillmentPolicy: "READY_STOCK",
          imageUrls: [],
        },
        reasonCode: null,
      })),
      close: vi.fn(async () => undefined),
    };
    const draftMultiProductClarification = vi.fn<DraftMultiProductClarification>(async () => ({
      proposal: proposal("Chị muốn xem mẫu SD375 hay SD398 trước ạ?"),
      modelVersion: "gemini-bf07-test",
      latencyMs: 5,
      tokenUsage: {},
    }));
    const model: RealtimeModelPort = {
      generate: vi.fn(),
      groundWithFacts: vi.fn(),
      draftMultiProductClarification,
    };
    const policyResolver: RuntimePolicyResolverPort = {
      resolve: vi.fn(async () => livePolicy("CLARIFY_V1")),
    };
    const analyses: Parameters<NonNullable<CanonicalChatHistoryPort["recordMessageAnalysis"]>>[0][] = [];
    const history: CanonicalChatHistoryPort = {
      recordInboundCustomerMessage: vi.fn(async (input) => ({
        messagePk: `message:${input.providerMessageId}`,
      })),
      recordOutboundHumanMessage: vi.fn(async () => undefined),
      recordMessageAnalysis: vi.fn(async (input) => { analyses.push(input); }),
    };
    const quotaReserve = vi.fn(async () => true);
    const runner = new RealtimeRunner(
      inbox,
      runtime,
      model,
      facts,
      search,
      new FailClosedTagObservationProvider(),
      {
        workerId: "worker-bf07",
        mode: "LIVE",
        sendEnabled: true,
        decisionTelemetryEnabled: true,
      },
      { reserve: quotaReserve, close: vi.fn(async () => undefined) },
      undefined,
      history,
      undefined,
      policyResolver,
    );

    expect(await runner.processOne()).toBe(true);
    expect(retry).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledOnce();
    expect(searchImages).toHaveBeenCalledOnce();
    expect(facts.resolve).not.toHaveBeenCalled();
    expect(draftMultiProductClarification).toHaveBeenCalledOnce();
    expect(quotaReserve).toHaveBeenCalledOnce();
    expect(draftMultiProductClarification).toHaveBeenCalledWith(
      ["SD375", "SD398"],
      "lana-realtime-v1",
      [],
    );
    expect(commits[0]?.state).toMatchObject({
      currentProductId: null,
      productSelections: [
        { label: "SET_1", productId: "SD375" },
        { label: "SET_2", productId: "SD398" },
      ],
      mediaClarification: {
        status: "ACTIVE",
        candidates: [
          { label: "SET_1", productId: "SD375" },
          { label: "SET_2", productId: "SD398" },
        ],
        attemptCount: 0,
        maxAttempts: 3,
        reasonCode: "MULTI_PRODUCT_SELECTION_REQUIRED",
      },
    });
    expect(commits[0]?.metaPlan?.messages).toEqual([{
      kind: "TEXT",
      text: "Chị muốn xem mẫu SD375 hay SD398 trước ạ?",
    }]);
    expect(commits[0]?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "CLARIFICATION_REQUESTED",
      origin: "MEDIA",
      productId: null,
      reasonCodes: [
        "MULTI_PRODUCT_SELECTION_REQUIRED",
        "MEDIA_PARTIAL_MATCHES_PRESERVED",
        "MEDIA_USABLE_2_OF_3",
      ],
    }));
    expect(
      (commits[0]?.decisionEvents ?? []).filter(
        ({ eventType }) => eventType === "CLARIFICATION_REQUESTED",
      ),
    ).toHaveLength(1);
    expect(commits[0]?.decisionEvents).not.toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
    }));
    expect(commits[0]?.decisionEvents).not.toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_MATCHED",
    }));
    expect(commits[0]?.decisionEvents).not.toContainEqual(expect.objectContaining({
      eventType: "GUARD_BLOCKED",
    }));
    expect(commits[0]?.handoffEventPlan).toBeUndefined();
    expect(JSON.stringify(commits[0])).not.toContain("MEDIA_CLARIFICATION_EXHAUSTED");
    expect(
      analyses[0]?.media.map(({ ordinal, status, productId, reasonCode }) => ({
        ordinal,
        status,
        productId,
        reasonCode,
      })),
    ).toEqual([
      { ordinal: 0, status: "MATCHED", productId: "SD375", reasonCode: null },
      {
        ordinal: 1,
        status: "ERROR",
        productId: null,
        reasonCode: "MEDIA_IMAGE_DOWNLOAD_FAILED",
      },
      { ordinal: 2, status: "MATCHED", productId: "SD398", reasonCode: null },
    ]);

    expect(await runner.processOne()).toBe(true);
    expect(retry).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(2);
    expect(commits).toHaveLength(2);
    expect(searchImages).toHaveBeenCalledOnce();
    expect(searchText).toHaveBeenCalledOnce();
    expect(draftMultiProductClarification).toHaveBeenCalledOnce();
    expect(quotaReserve).toHaveBeenCalledOnce();
    expect(model.generate).not.toHaveBeenCalled();
    expect(model.groundWithFacts).not.toHaveBeenCalled();
    expect(commits[1]?.state).toMatchObject({
      currentProductId: "SD398",
      productSelections: [],
      mediaClarification: null,
    });
    expect(JSON.stringify(commits[1]?.metaPlan)).toContain("SD398");
    expect(facts.resolve).toHaveBeenCalledOnce();
    expect(facts.resolve).toHaveBeenCalledWith(expect.objectContaining({ productId: "SD398" }));
    expect(JSON.stringify(commits.slice(0, 2))).not.toContain("MEDIA_CLARIFICATION_EXHAUSTED");
    expect(JSON.stringify(commits[1]?.decisionEvents)).not.toContain(
      "MEDIA_CLARIFICATION_EXHAUSTED",
    );
    expect(commits[1]?.handoffEventPlan).toBeUndefined();

    claims.push(claim({
      suffix: "bf07-ordinal-images",
      sequence: 3,
      text: null,
      imageUrls: [
        "https://cdn.example.test/SD375-ordinal.jpg",
        "https://cdn.example.test/SD398-ordinal.jpg",
      ],
    }));
    draftMultiProductClarification.mockReset();
    draftMultiProductClarification.mockResolvedValue({
      proposal: proposal("Chị muốn xem mẫu SD375 hay SD398 trước ạ?"),
      modelVersion: "gemini-bf07-test",
      latencyMs: 5,
      tokenUsage: {},
    });
    expect(await runner.processOne()).toBe(true);
    expect(quotaReserve).toHaveBeenCalledTimes(2);
    expect(commits[2]?.state.mediaClarification).toMatchObject({ status: "ACTIVE" });
    expect(JSON.stringify(commits[2]?.decisionEvents)).not.toContain(
      "MEDIA_PARTIAL_MATCHES_PRESERVED",
    );

    claims.push(claim({ suffix: "bf07-ordinal-selection", sequence: 4, text: "chị chọn mẫu 2" }));
    expect(await runner.processOne()).toBe(true);
    expect(draftMultiProductClarification).toHaveBeenCalledOnce();
    expect(quotaReserve).toHaveBeenCalledTimes(2);
    expect(commits[3]?.state).toMatchObject({
      currentProductId: "SD398",
      productSelections: [],
      mediaClarification: null,
    });
    expect(JSON.stringify(commits[3]?.decisionEvents)).not.toContain(
      "MEDIA_CLARIFICATION_EXHAUSTED",
    );
    expect(commits[3]?.handoffEventPlan).toBeUndefined();

    claims.push(claim({
      suffix: "bf07-invalid-repair",
      sequence: 5,
      text: null,
      imageUrls: [
        "https://cdn.example.test/SD375-again.jpg",
        "https://cdn.example.test/SD398-again.jpg",
      ],
    }));
    draftMultiProductClarification.mockReset();
    draftMultiProductClarification.mockResolvedValue({
      proposal: proposal("SD375 giá 699k, chị chốt mẫu này nhé."),
      modelVersion: "gemini-bf07-test",
      latencyMs: 5,
      tokenUsage: {},
    });

    expect(await runner.processOne()).toBe(true);
    expect(draftMultiProductClarification).toHaveBeenCalledTimes(2);
    expect(quotaReserve).toHaveBeenCalledTimes(4);
    expect(draftMultiProductClarification.mock.calls[1]?.[2]).toEqual(
      expect.arrayContaining([
        "MULTI_PRODUCT_CANDIDATE_OMITTED",
        "MULTI_PRODUCT_UNVERIFIED_COMMERCIAL_CLAIM",
      ]),
    );
    expect(commits[4]?.metaPlan).toBeUndefined();
    expect(commits[4]?.handoffEventPlan).toBeDefined();
    expect(commits[4]?.state).toMatchObject({
      currentProductId: null,
      productSelections: [
        { label: "SET_1", productId: "SD375" },
        { label: "SET_2", productId: "SD398" },
      ],
      mediaClarification: null,
    });
    expect(JSON.stringify(commits[4])).not.toContain("699k");
    expect(commits[4]?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "GUARD_BLOCKED",
      reasonCodes: expect.arrayContaining([
        "MULTI_PRODUCT_CANDIDATE_OMITTED",
        "MULTI_PRODUCT_UNVERIFIED_COMMERCIAL_CLAIM",
        "MULTI_PRODUCT_CLARIFICATION_REJECTED",
      ]),
    }));
  });
});
