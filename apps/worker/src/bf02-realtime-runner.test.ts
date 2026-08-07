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
  productPreferenceContinuationId,
  verifiedGroundedProduct,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
  type RealtimeTagObservationProvider,
  type RealtimeVideoFrameExtractorPort,
} from "./bf02-realtime-runner.js";

const occurredAt = "2026-08-06T02:00:00.000Z";
const pageId = "1198992073286645";
const conversationHash = "meta:v1:customer-hash";

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

type TestProduct = typeof product398;

interface HarnessMessage {
  readonly text: string;
  readonly adProductId?: string;
  readonly imageProductId?: string;
  readonly videoProductId?: string;
}

interface HarnessOptions {
  readonly messages: readonly HarnessMessage[];
  readonly priorAt?: string;
  readonly products?: readonly TestProduct[];
  readonly nativeBatch?: boolean;
  readonly productSelections?: readonly TestProduct[];
  readonly mediaClarification?: boolean;
  readonly initialProposal?: AgentProposalV1;
  readonly semanticMatchByMention?: boolean;
}

function catalogSearch(
  products: readonly TestProduct[] = [product398],
  options: { readonly semanticMatchByMention?: boolean } = {},
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
      const semantic = options.semanticMatchByMention
        ? products.find((candidate) => normalized.includes(candidate.productId))
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
    searchImage: vi.fn(async (url: string) => {
      const product = products.find((candidate) =>
        url.toLocaleUpperCase("vi-VN").includes(candidate.productId)
      );
      return product
        ? {
            status: "MATCHED" as const,
            matchKind: "SEMANTIC" as const,
            score: 0.95,
            gap: 0.2,
            product,
          }
        : {
            status: "NOT_FOUND" as const,
            reasonCode: "NO_CANDIDATES" as const,
          };
    }),
    searchImageBytes: vi.fn(async (frame: Uint8Array) => {
      const product = frame[0] === 3
        ? products.find((candidate) => candidate.productId === "SD375")
        : undefined;
      return product
        ? {
            status: "MATCHED" as const,
            matchKind: "SEMANTIC" as const,
            score: 0.94,
            gap: 0.2,
            product,
          }
        : {
            status: "NOT_FOUND" as const,
            reasonCode: "NO_CANDIDATES" as const,
          };
    }),
  };
}

function claimFor(message: HarnessMessage, index: number) {
  const sequence = 121 + index;
  const eventKey = `meta:${pageId}:message:bf02-${index}`;
  return {
    inboxId: `2a9afc47-978a-4b74-9653-3c89e75a89a${index}`,
    pageId,
    eventKey,
    conversationHash,
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: sequence,
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
        traceId: index === 0
          ? "3021af34-c98c-4086-a33c-3ecb2ad8f8f2"
          : "4021af34-c98c-4086-a33c-3ecb2ad8f8f3",
        eventKey,
        pageId,
        messageId: `bf02-message-${index}`,
        senderId: "customer-1",
        conversationId: conversationHash,
        occurredAt,
        isEcho: false,
        appId: null,
        text: message.text,
        attachments: [
          ...(message.imageProductId
            ? [{
                type: "image",
                url: `https://cdn.example.test/${message.imageProductId}.jpg`,
              }]
            : []),
          ...(message.videoProductId
            ? [{
                type: "video",
                url: `https://cdn.example.test/${message.videoProductId}.mp4`,
              }]
            : []),
        ],
        adsContext: message.adProductId
          ? {
              source: "facebook",
              referralType: "OPEN_GRAPH",
              adTitle: `Mẫu ${message.adProductId}`,
              postId: "post-1",
              adId: "ad-1",
              ref: null,
            }
          : null,
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
  const priorAt = options.priorAt ?? "2026-08-06T01:59:00.000Z";
  const products = options.products ?? [product398];
  const baseState = createConversationState({
    conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
    routingOwner: "APP",
    now: new Date(priorAt),
  });
  const selectedProducts = options.productSelections ??
    (options.mediaClarification ? products : []);
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
      occurredAt: priorAt,
      receiveSequence: 120,
    },
    currentProductId: "SD398",
    tagGateStatus: "VERIFIED_ABSENT" as const,
    blockingTag: null,
    blockingTagVerifiedAt: priorAt,
    updatedAt: priorAt,
    ...(productSelections.length > 0 ? { productSelections } : {}),
    ...(options.mediaClarification
      ? {
          mediaClarification: {
            status: "ACTIVE" as const,
            candidates: productSelections,
            attemptCount: 2,
            maxAttempts: 3,
            reasonCode: "MEDIA_CLARIFICATION_OPEN",
            openedAt: priorAt,
          },
        }
      : {}),
  };
  const claims = options.messages.map(claimFor);
  const lastClaim = claims.at(-1)!;

  const complete = vi.fn(async () => true);
  const completeBatch = vi.fn(async () => true);
  const retry = vi.fn(async () => true);
  const retryBatch = vi.fn(async () => true);
  const inbox: RealtimeInboxPort = options.nativeBatch
    ? {
        claimNext: vi.fn(async () => null),
        claimNextBatch: vi.fn()
          .mockResolvedValueOnce({
            pageId,
            conversationHash,
            generation: 9,
            leaseToken: lastClaim.leaseToken,
            inboxIds: claims.map(({ inboxId }) => inboxId),
            evaluationGroupId: "bf02-batch",
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
        retry,
        retryBatch,
        failPermanent: vi.fn(async () => true),
        failBatchPermanent: vi.fn(async () => true),
      }
    : {
        claimNext: vi.fn()
          .mockResolvedValueOnce(lastClaim)
          .mockResolvedValueOnce(null),
        complete,
        retry,
        failPermanent: vi.fn(async () => true),
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
        modelVersion: "bf02-test-model",
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
  const productSearch = catalogSearch(
    products,
    options.semanticMatchByMention ? { semanticMatchByMention: true } : {},
  );

  const resolveFacts: BusinessFactsReader["resolve"] = async ({ productId }) => {
    const product = products.find((candidate) =>
      candidate.productId === productId
    );
    if (!product) throw new Error("TEST_PRODUCT_NOT_FOUND");
    return productFacts(product);
  };
  const facts = {
    ready: vi.fn(async () => true),
    resolve: vi.fn(resolveFacts),
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

  const videoFrames: RealtimeVideoFrameExtractorPort = {
    extract: vi.fn(async () => ({
      durationSeconds: 1,
      frames: [new Uint8Array([3, 7, 5])],
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
      workerId: "worker-bf02",
      mode: "LIVE",
      sendEnabled: true,
      decisionTelemetryEnabled: true,
      decisionAuditV2Enabled: true,
      releaseId: "bf02-test",
    },
    undefined,
    undefined,
    undefined,
    videoFrames,
  );

  return {
    runner,
    generate,
    groundWithFacts,
    complete,
    completeBatch,
    retry,
    retryBatch,
    commit,
    productSearch,
    videoFrames,
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

describe("BF-02 realtime context fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(occurredAt));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the initial schema fallback without a second grounding call", async () => {
    const harness = createHarness({ messages: [{ text: "nhẹ nhàng đi" }] });

    expect(await harness.runner.processOne()).toBe(true);
    expect(await harness.runner.processOne()).toBe(false);

    const commit = harness.committed();
    const reply = textFromCommit(commit);
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(harness.commit).toHaveBeenCalledOnce();
    expect(harness.complete).toHaveBeenCalledOnce();
    expect(reply).toContain("SD398");
    expect(reply).not.toMatch(/(?:mã|ma)(?: sản phẩm)? hoặc ảnh/iu);
    expect(commit?.state.currentProductId).toBe("SD398");
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
      origin: "STATE",
      productId: "SD398",
      details: expect.objectContaining({
        modelPath: "initial_fallback",
        modelErrorClass: "VERTEX_SCHEMA_INVALID",
      }),
    }));
  });

  it("reports a verified grounded schema fallback without treating it as model success", async () => {
    const harness = createHarness({
      messages: [{ text: "nhẹ nhàng đi" }],
      initialProposal: {
        schemaVersion: 1,
        intent: "product_inquiry",
        conversationStage: "consulting",
        productId: "SD398",
        action: "REPLY",
        reply: "Mẫu SD398 ạ.",
        attachments: [],
        handoffReason: null,
        businessFactQuery: {
          intent: "PRICE",
          offerType: null,
          color: null,
          size: null,
          deliveryRegion: null,
        },
      },
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).toHaveBeenCalledOnce();
    expect(harness.retry).not.toHaveBeenCalled();
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
  it("keeps a verified batch switch instead of returning to the old state product", async () => {
    const harness = createHarness({
      messages: [{ text: "SD375" }, { text: "nhẹ nhàng đi" }],
      products: [product398, product375],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(await harness.runner.processOne()).toBe(false);

    const commit = harness.committed();
    const reply = textFromCommit(commit);
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(reply).toContain("SD375");
    expect(reply).not.toContain("SD398");
    expect(commit?.state.currentProductId).toBe("SD375");
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
      productId: "SD375",
    }));
  });

  it("keeps an ad-resolved switch without resurrecting the old state product", async () => {
    const harness = createHarness({
      messages: [{ text: "nhẹ nhàng đi", adProductId: "SD375" }],
      products: [product398, product375],
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    const reply = textFromCommit(commit);
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(reply).toContain("SD375");
    expect(reply).not.toContain("SD398");
    expect(commit?.state.currentProductId).toBe("SD375");
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
      origin: "ADS",
      productId: "SD375",
    }));
  });

  it("does not resurrect SD398 after an explicit context reset", async () => {
    const harness = createHarness({
      messages: [{ text: "đổi sang mẫu khác" }],
    });

    expect(await harness.runner.processOne()).toBe(true);

    const reply = textFromCommit(harness.committed());
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(reply).not.toContain("SD398");
    expect(reply).toMatch(/mã|ảnh/iu);
  });

  it("honors an earlier reset in a native batch before a vague follow-up", async () => {
    const harness = createHarness({
      messages: [
        { text: "đổi sang mẫu khác" },
        { text: "nhẹ nhàng đi" },
      ],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    const reply = textFromCommit(commit);
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(reply).not.toContain("SD398");
    expect(commit?.state.currentProductId).toBeNull();
    expect(commit?.state.productSelections).toEqual([]);
  });

  it("lets a later reset override an earlier explicit product in the same batch", async () => {
    const harness = createHarness({
      messages: [
        { text: "xin giá SD375" },
        { text: "đổi sang mẫu khác" },
      ],
      products: [product398, product375],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(textFromCommit(commit)).not.toContain("SD375");
    expect(commit?.state.currentProductId).toBeNull();
  });

  it("cuts pre-reset text out of production-like semantic search", async () => {
    const harness = createHarness({
      messages: [
        { text: "xin giá SD375" },
        { text: "đổi sang mẫu khác" },
      ],
      products: [product398, product375],
      nativeBatch: true,
      semanticMatchByMention: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(textFromCommit(commit)).not.toContain("SD375");
    expect(commit?.state.currentProductId).toBeNull();
    expect(harness.productSearch.searchText).not.toHaveBeenCalledWith(
      expect.stringContaining("xin giá SD375\nđổi sang mẫu khác"),
    );
  });

  it("does not recover a product from an ad before a later reset", async () => {
    const harness = createHarness({
      messages: [
        { text: "nhẹ nhàng đi", adProductId: "SD375" },
        { text: "đổi sang mẫu khác" },
      ],
      products: [product398, product375],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(textFromCommit(commit)).not.toContain("SD375");
    expect(commit?.state.currentProductId).toBeNull();
  });

  it("does not resolve an ad attached to the reset message", async () => {
    const harness = createHarness({
      messages: [
        { text: "nhẹ nhàng đi" },
        { text: "đổi sang mẫu khác", adProductId: "SD375" },
      ],
      products: [product398, product375],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(harness.productSearch.searchText).not.toHaveBeenCalledWith("SD375");
    expect(textFromCommit(commit)).not.toContain("SD375");
    expect(commit?.state.currentProductId).toBeNull();
  });

  it("allows a fresh ad after reset to introduce a product", async () => {
    const harness = createHarness({
      messages: [
        { text: "đổi sang mẫu khác" },
        { text: "nhẹ nhàng đi", adProductId: "SD375" },
      ],
      products: [product398, product375],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(textFromCommit(commit)).toContain("SD375");
    expect(commit?.state.currentProductId).toBe("SD375");
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
      origin: "ADS",
      productId: "SD375",
    }));
  });

  it("does not resolve an image that arrived before a later reset", async () => {
    const harness = createHarness({
      messages: [
        { text: "", imageProductId: "SD375" },
        { text: "đổi sang mẫu khác" },
      ],
      products: [product398, product375],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(harness.productSearch.searchImage).not.toHaveBeenCalled();
    expect(textFromCommit(commit)).not.toContain("SD375");
    expect(commit?.state.currentProductId).toBeNull();
  });

  it("does not resolve video frame bytes from media before a later reset", async () => {
    const harness = createHarness({
      messages: [
        { text: "", videoProductId: "SD375" },
        { text: "đổi sang mẫu khác" },
      ],
      products: [product398, product375],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(harness.videoFrames.extract).toHaveBeenCalledOnce();
    expect(harness.productSearch.searchImageBytes).not.toHaveBeenCalled();
    expect(textFromCommit(commit)).not.toContain("SD375");
    expect(commit?.state.currentProductId).toBeNull();
  });

  it("lets an explicit new product after a reset take deterministic precedence", async () => {
    const harness = createHarness({
      messages: [
        { text: "đổi sang mẫu khác" },
        { text: "xin giá SD375" },
      ],
      products: [product398, product375],
      nativeBatch: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(textFromCommit(commit)).toContain("SD375");
    expect(commit?.state.currentProductId).toBe("SD375");
  });

  it("clears active media clarification when a fresh explicit code is supplied", async () => {
    const harness = createHarness({
      messages: [{ text: "xin giá SD398" }],
      products: [product398, product375],
      productSelections: [product398, product375],
      mediaClarification: true,
    });

    expect(await harness.runner.processOne()).toBe(true);

    const commit = harness.committed();
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(textFromCommit(commit)).toContain("SD398");
    expect(commit?.state.currentProductId).toBe("SD398");
    expect(commit?.state.mediaClarification).toBeNull();
    expect(JSON.stringify(commit?.decisionEvents)).not.toContain(
      "MEDIA_CLARIFICATION_EXHAUSTED",
    );
  });

  it("fails closed for multiple active state selections until an explicit code resolves them", async () => {
    const ambiguous = createHarness({
      messages: [{ text: "nhẹ nhàng đi" }],
      products: [product398, product375],
      productSelections: [product398, product375],
    });

    expect(await ambiguous.runner.processOne()).toBe(true);

    const ambiguousCommit = ambiguous.committed();
    expect(ambiguous.generate).toHaveBeenCalledOnce();
    expect(ambiguous.groundWithFacts).not.toHaveBeenCalled();
    expect(textFromCommit(ambiguousCommit)).not.toContain("SD398");
    expect(textFromCommit(ambiguousCommit)).not.toContain("SD375");
    expect(ambiguousCommit?.decisionEvents).not.toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
    }));

    const explicit = createHarness({
      messages: [{ text: "xin giá SD375" }],
      products: [product398, product375],
      productSelections: [product398, product375],
    });

    expect(await explicit.runner.processOne()).toBe(true);
    expect(explicit.generate).not.toHaveBeenCalled();
    expect(textFromCommit(explicit.committed())).toContain("SD375");
    expect(explicit.committed()?.state.currentProductId).toBe("SD375");
  });

  it("does not ground or commit when eligible context evidence conflicts", async () => {
    const harness = createHarness({
      messages: [{ text: "nhẹ nhàng đi" }],
      products: [product398, product375],
      productSelections: [product398, product375],
      initialProposal: {
        schemaVersion: 1,
        intent: "product_inquiry",
        conversationStage: "consulting",
        productId: "SD398",
        action: "REPLY",
        reply: "Mẫu SD398 ạ.",
        attachments: [],
        handoffReason: null,
        businessFactQuery: {
          intent: "PRICE",
          offerType: null,
          color: null,
          size: null,
          deliveryRegion: null,
        },
      },
    });

    expect(await harness.runner.processOne()).toBe(true);

    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).toHaveBeenCalledOnce();
    expect(harness.retry).toHaveBeenCalledOnce();
    expect(harness.commit).not.toHaveBeenCalled();
  });
  it("does not use an expired state product after a schema failure", async () => {
    const harness = createHarness({
      messages: [{ text: "nhẹ nhàng đi" }],
      priorAt: "2026-07-01T01:59:00.000Z",
    });

    expect(await harness.runner.processOne()).toBe(true);

    const reply = textFromCommit(harness.committed());
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(reply).not.toContain("SD398");
    expect(reply).toMatch(/mã|ảnh/iu);
  });

  it("does not project the state product onto a non-product turn", async () => {
    const harness = createHarness({ messages: [{ text: "shop ở đâu" }] });

    expect(await harness.runner.processOne()).toBe(true);

    const reply = textFromCommit(harness.committed());
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(reply).not.toContain("SD398");
    expect(reply).toMatch(/mã|ảnh/iu);
  });

  it("keeps the incident preference phrase narrow and product-scoped", () => {
    expect(productPreferenceContinuationId("nhẹ nhàng đi", "SD398"))
      .toBe("SD398");
    expect(productPreferenceContinuationId("shop ở đâu", "SD398"))
      .toBeNull();
    expect(productPreferenceContinuationId("phí ship bao nhiêu", "SD398"))
      .toBeNull();
  });

  it("binds grounded recovery to core facts and core resolution evidence", async () => {
    const productSearch = catalogSearch([product398, product375]);
    const proposal = {
      productId: "SD375",
    } as Parameters<RealtimeModelPort["groundWithFacts"]>[1];
    const facts = {
      productId: "SD375",
    } as Parameters<RealtimeModelPort["groundWithFacts"]>[2];

    await expect(verifiedGroundedProduct(
      productSearch,
      proposal,
      facts,
      new Set(["SD375"]),
    )).resolves.toEqual(product375);
    await expect(verifiedGroundedProduct(
      productSearch,
      proposal,
      facts,
      new Set(),
    )).resolves.toBeNull();
  });

  it("fails closed when grounded proposal and facts reference different products", async () => {
    const productSearch = catalogSearch([product398, product375]);
    const proposal = {
      productId: "SD398",
    } as Parameters<RealtimeModelPort["groundWithFacts"]>[1];
    const facts = {
      productId: "SD375",
    } as Parameters<RealtimeModelPort["groundWithFacts"]>[2];

    await expect(verifiedGroundedProduct(
      productSearch,
      proposal,
      facts,
      new Set(["SD398", "SD375"]),
    )).resolves.toBeNull();
  });
});
