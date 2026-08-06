import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import {
  RealtimeRunner,
  productPreferenceContinuationId,
  verifiedGroundedProduct,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
  type RealtimeTagObservationProvider,
} from "./bf02-realtime-runner.js";

const occurredAt = "2026-08-06T02:00:00.000Z";
const pageId = "1198992073286645";

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

function catalogSearch(
  products = [product398],
): RealtimeProductSearchPort {
  return {
    searchText: vi.fn(async (value: string) => {
      const normalized = value.trim().toLocaleUpperCase("vi-VN");
      const product = products.find((candidate) =>
        candidate.productId === normalized ||
        candidate.canonicalCode === normalized
      );
      return product
        ? {
            status: "MATCHED" as const,
            matchKind: "EXACT_CODE" as const,
            score: 1,
            gap: null,
            product,
          }
        : {
            status: "NOT_FOUND" as const,
            reasonCode: "NO_MATCH",
          };
    }),
    searchImage: vi.fn(async () => ({
      status: "NOT_FOUND" as const,
      reasonCode: "NO_MATCH",
    })),
  };
}

function createHarness(
  text: string,
  priorAt = "2026-08-06T01:59:00.000Z",
) {
  const baseState = createConversationState({
    conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
    routingOwner: "APP",
    now: new Date(priorAt),
  });
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
  };
  const claim = {
    inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
    pageId,
    eventKey: `meta:${pageId}:message:bf02`,
    conversationHash: "meta:v1:customer-hash",
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: 121,
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
        eventKey: `meta:${pageId}:message:bf02`,
        pageId,
        messageId: "bf02-message",
        senderId: "customer-1",
        conversationId: "meta:v1:customer-hash",
        occurredAt,
        isEcho: false,
        appId: null,
        text,
        attachments: [],
        adsContext: null,
      },
    },
  };

  const complete = vi.fn(async () => true);
  const retry = vi.fn(async () => true);
  const inbox: RealtimeInboxPort = {
    claimNext: vi.fn()
      .mockResolvedValueOnce(claim)
      .mockResolvedValueOnce(null),
    complete,
    retry,
    failPermanent: vi.fn(async () => true),
  };

  let committed: Parameters<RealtimeRuntimePort["commit"]>[0] | null = null;
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn(async () => ({
      conversationId: state.conversationId,
      pageId,
      customerHash: claim.conversationHash,
      stateVersion: state.revision,
      state,
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    })),
    commit: vi.fn(async (input) => {
      committed = input;
      return {} as Awaited<ReturnType<RealtimeRuntimePort["commit"]>>;
    }),
    linkProviderConversation: vi.fn(async () => undefined),
  };

  const generate = vi.fn(async () => {
    throw new Error("GROUNDED_SCHEMA_INVALID");
  });
  const groundWithFacts = vi.fn(async () => {
    throw new Error("GROUNDED_SCHEMA_INVALID");
  });
  const model: RealtimeModelPort = { generate, groundWithFacts };
  const productSearch = catalogSearch();

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
      workerId: "worker-bf02",
      mode: "LIVE",
      sendEnabled: true,
      decisionTelemetryEnabled: true,
      decisionAuditV2Enabled: true,
      releaseId: "bf02-test",
    },
  );

  return {
    runner,
    generate,
    groundWithFacts,
    complete,
    retry,
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

describe("BF-02 realtime context fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(occurredAt));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("preserves verified SD398 through initial and grounded schema failures", async () => {
    const harness = createHarness("nhẹ nhàng đi");

    expect(await harness.runner.processOne()).toBe(true);
    expect(await harness.runner.processOne()).toBe(false);

    const commit = harness.committed();
    const reply = textFromCommit(commit);
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).toHaveBeenCalledOnce();
    expect(reply).toContain("SD398");
    expect(reply).not.toMatch(/(?:mã|ma)(?: sản phẩm)? hoặc ảnh/iu);
    expect(commit?.state.currentProductId).toBe("SD398");
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      eventType: "PRODUCT_RESOLVED",
      origin: "STATE",
      productId: "SD398",
    }));
  });

  it("does not resurrect SD398 after an explicit context reset", async () => {
    const harness = createHarness("đổi sang mẫu khác");

    expect(await harness.runner.processOne()).toBe(true);

    const reply = textFromCommit(harness.committed());
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(reply).not.toContain("SD398");
    expect(reply).toMatch(/mã|ảnh/iu);
  });

  it("does not use an expired state product after a schema failure", async () => {
    const harness = createHarness(
      "nhẹ nhàng đi",
      "2026-07-01T01:59:00.000Z",
    );

    expect(await harness.runner.processOne()).toBe(true);

    const reply = textFromCommit(harness.committed());
    expect(harness.generate).toHaveBeenCalledOnce();
    expect(harness.groundWithFacts).not.toHaveBeenCalled();
    expect(reply).not.toContain("SD398");
    expect(reply).toMatch(/mã|ảnh/iu);
  });

  it("does not project the state product onto a non-product turn", async () => {
    const harness = createHarness("shop ở đâu");

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

  it("binds batch-switch and media/ad grounded recovery to core facts", async () => {
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

  it("rejects matching proposal and facts without core resolution evidence", async () => {
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
      new Set(),
    )).resolves.toBeNull();
  });
});
