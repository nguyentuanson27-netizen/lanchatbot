import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import type { AgentProposalV1 } from "@lana/contracts";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import { VertexShadowError } from "./vertex.js";
import {
  RealtimeRunner,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
  type RealtimeTagObservationProvider,
} from "./bf02-realtime-runner.js";

const occurredAt = "2026-08-08T02:30:00.000Z";
const pageId = "1198992073286645";
const conversationHash = "meta:v1:bf02-review-plan";

const product398 = {
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

const product375 = {
  ...product398,
  productId: "SD375",
  parentProductId: "SD375",
  canonicalCode: "SD375",
  title: "Áo dài SD375",
};

const productMau2 = {
  ...product398,
  productId: "MAU2",
  parentProductId: "MAU2",
  canonicalCode: "MAU2",
  title: "Áo dài MAU2",
};

type TestProduct = typeof product398;

interface HarnessOptions {
  readonly messages: readonly string[];
  readonly products?: readonly TestProduct[];
  readonly productSelections?: readonly TestProduct[];
  readonly mediaClarification?: boolean;
  readonly initialProposal?: AgentProposalV1;
}

function catalogSearch(
  products: readonly TestProduct[],
): RealtimeProductSearchPort {
  return {
    searchText: vi.fn(async (value: string) => {
      const normalized = value.trim().toLocaleUpperCase("vi-VN");
      const exact = products.find((candidate) =>
        candidate.productId === normalized ||
        candidate.canonicalCode === normalized
      );
      if (exact) {
        return {
          status: "MATCHED" as const,
          matchKind: "EXACT_CODE" as const,
          score: 1,
          gap: null,
          product: exact,
        };
      }
      const semantic = normalized.includes("MẪU MỚI NHẸ NHÀNG")
        ? products.find((candidate) => candidate.productId === "SD375")
        : undefined;
      return semantic
        ? {
            status: "MATCHED" as const,
            matchKind: "SEMANTIC" as const,
            score: 0.93,
            gap: 0.2,
            product: semantic,
          }
        : {
            status: "NOT_FOUND" as const,
            reasonCode: "NO_CANDIDATES" as const,
          };
    }),
    searchImage: vi.fn(async () => ({
      status: "NOT_FOUND" as const,
      reasonCode: "NO_CANDIDATES" as const,
    })),
  };
}

function claimFor(text: string, index: number) {
  const receiveSequence = 121 + index;
  const eventKey = `meta:${pageId}:message:bf02-review-${index}`;
  return {
    inboxId: `2a9afc47-978a-4b74-9653-3c89e75b89a${index}`,
    pageId,
    eventKey,
    conversationHash,
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence,
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
        traceId: `3021af34-c98c-4086-a33c-3ecb2ad8f8f${index}`,
        eventKey,
        pageId,
        messageId: `bf02-review-message-${index}`,
        senderId: "customer-review-plan",
        conversationId: conversationHash,
        occurredAt,
        isEcho: false,
        appId: null,
        text,
        attachments: [],
        adsContext: null,
      },
    },
  };
}

function productFacts(product: TestProduct) {
  return {
    schemaVersion: 1 as const,
    status: "OK" as const,
    source: "POS_SNAPSHOT" as const,
    observedAt: occurredAt,
    expiresAt: "2099-01-01T00:00:00.000Z",
    productId: product.productId,
    facts: {
      schemaVersion: 1 as const,
      productId: product.productId,
      parentProductId: product.parentProductId,
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
  };
}

function createHarness(options: HarnessOptions) {
  const products = options.products ?? [product398];
  const baseState = createConversationState({
    conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
    routingOwner: "APP",
    now: new Date("2026-08-08T02:29:00.000Z"),
  });
  const selectedProducts = options.productSelections ??
    (options.mediaClarification ? [product398, product375] : []);
  const productSelections = selectedProducts.map((product, index) => ({
    label: `MAU_${index + 1}`,
    productId: product.productId,
  }));
  const state = {
    ...baseState,
    revision: 12,
    lastFence: 120,
    lastEvent: {
      eventKey: "meta:prior",
      occurredAt: "2026-08-08T02:29:00.000Z",
      receiveSequence: 120,
    },
    currentProductId: "SD398",
    tagGateStatus: "VERIFIED_ABSENT" as const,
    blockingTag: null,
    blockingTagVerifiedAt: "2026-08-08T02:29:00.000Z",
    updatedAt: "2026-08-08T02:29:00.000Z",
    ...(productSelections.length > 0 ? { productSelections } : {}),
    ...(options.mediaClarification
      ? {
          mediaClarification: {
            status: "ACTIVE" as const,
            candidates: productSelections,
            attemptCount: 1,
            maxAttempts: 3,
            reasonCode: "MEDIA_CLARIFICATION_OPEN",
            openedAt: "2026-08-08T02:29:00.000Z",
          },
        }
      : {}),
  };
  const claims = options.messages.map(claimFor);
  const lastClaim = claims.at(-1)!;
  const completeBatch = vi.fn(async () => true);
  const retryBatch = vi.fn(async () => true);
  const inbox: RealtimeInboxPort = {
    claimNext: vi.fn(async () => null),
    claimNextBatch: vi.fn()
      .mockResolvedValueOnce({
        pageId,
        conversationHash,
        generation: 9,
        leaseToken: lastClaim.leaseToken,
        inboxIds: claims.map(({ inboxId }) => inboxId),
        evaluationGroupId: "bf02-review-plan-batch",
        eventKind: "CUSTOMER" as const,
        firstReceiveSequence: claims[0]!.receiveSequence,
        lastReceiveSequence: lastClaim.receiveSequence,
        attemptCount: 1,
        items: claims,
      })
      .mockResolvedValueOnce(null),
    complete: vi.fn(async () => true),
    completeBatch,
    isBatchCurrent: vi.fn(async () => true),
    retry: vi.fn(async () => true),
    retryBatch,
    failPermanent: vi.fn(async () => true),
    failBatchPermanent: vi.fn(async () => true),
  };

  let committed: Parameters<RealtimeRuntimePort["commit"]>[0] | null = null;
  const commit = vi.fn(async (input: Parameters<RealtimeRuntimePort["commit"]>[0]) => {
    committed = input;
    return {} as Awaited<ReturnType<RealtimeRuntimePort["commit"]>>;
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
    if (options.initialProposal) {
      return {
        proposal: options.initialProposal,
        modelVersion: "bf02-review-model",
        latencyMs: 1,
        tokenUsage: {},
      };
    }
    throw new VertexShadowError("VERTEX_SCHEMA_INVALID", true);
  });
  const groundWithFacts = vi.fn(async () => {
    throw new VertexShadowError("VERTEX_SCHEMA_INVALID", true);
  });
  const model: RealtimeModelPort = { generate, groundWithFacts };
  const productSearch = catalogSearch(products);

  const facts = {
    ready: vi.fn(async () => true),
    resolve: vi.fn(async ({ productId }: { productId: string }) => {
      const product = products.find((candidate) => candidate.productId === productId);
      if (!product) throw new Error("TEST_PRODUCT_NOT_FOUND");
      return productFacts(product);
    }),
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

  const runner = new RealtimeRunner(
    inbox,
    runtime,
    model,
    facts,
    productSearch,
    tags,
    {
      workerId: "worker-bf02-review-plan",
      mode: "LIVE",
      sendEnabled: true,
      decisionTelemetryEnabled: true,
      decisionAuditV2Enabled: true,
      releaseId: "bf02-review-plan",
    },
  );

  return {
    runner,
    generate,
    groundWithFacts,
    retryBatch,
    commit,
    productSearch,
    committed: () => committed,
  };
}

function textFromCommit(
  commit: Parameters<RealtimeRuntimePort["commit"]>[0] | null,
): string {
  return (commit?.metaPlan?.messages ?? [])
    .filter((message): message is { kind: "TEXT"; text: string } =>
      message.kind === "TEXT"
    )
    .map(({ text }) => text)
    .join("\n");
}

describe("BF-02 review-plan regressions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(occurredAt));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not treat customer measurements as explicit product IDs", async () => {
    const harness = createHarness({
      messages: ["em cao 1m60 nặng 50kg"],
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(textFromCommit(commit)).toContain("SD398");
    expect(commit?.state.currentProductId).toBe("SD398");
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
      productId: "SD398",
    }));
  });

  it("keeps reset active when later text only contains measurements", async () => {
    const harness = createHarness({
      messages: ["đổi sang mẫu khác", "em cao 1m60 nặng 50kg"],
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(textFromCommit(commit)).not.toContain("SD398");
    expect(commit?.state.currentProductId).toBeNull();
    expect(commit?.state.productSelections).toEqual([]);
  });

  it("keeps reset active for an unverified code-like token", async () => {
    const harness = createHarness({
      messages: ["đổi sang mẫu khác", "ABC999"],
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(textFromCommit(commit)).not.toContain("SD398");
    expect(commit?.state.currentProductId).toBeNull();
  });

  it("preserves merged-batch continuation and never exposes grounded placeholder", async () => {
    const harness = createHarness({
      messages: ["mẫu này còn không", "ạ"],
      initialProposal: {
        schemaVersion: 1,
        intent: "product_inquiry",
        conversationStage: "consulting",
        productId: "SD398",
        action: "REPLY",
        reply: "Em kiểm tra tồn mẫu SD398 ạ.",
        attachments: [],
        handoffReason: null,
        businessFactQuery: {
          intent: "STOCK",
          offerType: null,
          color: null,
          size: null,
          deliveryRegion: null,
        },
      },
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    const reply = textFromCommit(commit);
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).toHaveBeenCalledOnce();
    expect(harness.retryBatch).not.toHaveBeenCalled();
    expect(reply).toContain("SD398");
    expect(reply).not.toContain("Em đang kiểm tra thông tin mẫu");
    expect(commit?.state.currentProductId).toBe("SD398");
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
      productId: "SD398",
      details: expect.objectContaining({
        modelPath: "grounded_fallback",
        modelErrorClass: "VERTEX_SCHEMA_INVALID",
      }),
    }));
  });

  it("does not project a stale state selection onto a non-product turn", async () => {
    const harness = createHarness({
      messages: ["shop ở đâu"],
      productSelections: [product398],
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    const reply = textFromCommit(commit);
    expect(reply).not.toContain("SD398");
    expect(commit?.decisionEvents).not.toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
    }));
  });

  it("prefers active clarification label over a colliding catalog code", async () => {
    const harness = createHarness({
      messages: ["mẫu 2"],
      products: [product398, product375, productMau2],
      productSelections: [product398, product375],
      mediaClarification: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    const reply = textFromCommit(commit);
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(reply).toContain("SD375");
    expect(reply).not.toContain("MAU2");
    expect(commit?.state.currentProductId).toBe("SD375");
    expect(commit?.state.mediaClarification).toBeNull();
  });
});
