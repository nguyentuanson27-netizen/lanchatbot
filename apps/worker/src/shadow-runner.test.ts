import { describe, expect, it, vi } from "vitest";
import type {
  ShadowEvaluationCompletion,
  ShadowEvaluationJob,
  ShadowEvaluationStore,
} from "@lana/database";
import { Phase4ShadowRunner, textSimilarity } from "./shadow-runner.js";

function job(): ShadowEvaluationJob {
  return {
    evaluationId: "eval-1",
    claimToken: "claim-1",
    sourceIdentityKey: "mirror:v1:test",
    sourceMessagePk: "message-1",
    sourceOccurredAt: "2026-07-15T00:00:00.000Z",
    conversationId: "conversation-1",
    pageId: "page-1",
    attemptCount: 1,
    promptVersion: "lana-shadow-closing-v1",
    context: [{
      direction: "INBOUND",
      senderType: "CUSTOMER",
      messageType: "TEXT",
      text: "Mau nay gia bao nhieu?",
      attachmentCount: 0,
      occurredAt: "2026-07-15T00:00:00.000Z",
    }],
    contextHash: "hash",
    actualOutboundText: "Da set co gia 699k a",
    actualOutboundCount: 1,
  };
}

describe("Phase 4 shadow runner", () => {
  it("stores a guarded structured proposal without authorizing send", async () => {
    const complete = vi.fn(async (
      _evaluationId: string,
      _claimToken: string,
      _completion: ShadowEvaluationCompletion,
    ) => undefined);
    const store = {
      claimNext: vi.fn(async () => job()),
      complete,
      fail: vi.fn(async () => undefined),
    } as unknown as ShadowEvaluationStore;
    const model = {
      generate: vi.fn(async () => ({
        proposal: {
          schemaVersion: 1 as const,
          intent: "hoi_gia",
          conversationStage: "consulting",
          productId: null,
          action: "HANDOFF" as const,
          reply: "",
          attachments: [],
          handoffReason: "BUSINESS_FACT_REQUIRED",
          businessFactQuery: {
            intent: "NONE" as const,
            offerType: null,
            color: null,
            size: null,
            deliveryRegion: null,
          },
        },
        modelVersion: "gemini-test",
        latencyMs: 50,
        tokenUsage: { total: 100 },
      })),
    };
    const runner = new Phase4ShadowRunner(store, model as never, { modelName: "gemini-test" });
    await expect(runner.processOne()).resolves.toBe(true);
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0]?.[2]).toMatchObject({
      guardedPlan: { sendAuthorized: false },
      modelName: "gemini-test",
    });
  });

  it("loads canonical Redis facts, grounds a second draft and keeps send disabled", async () => {
    const complete = vi.fn(async (
      _evaluationId: string,
      _claimToken: string,
      _completion: ShadowEvaluationCompletion,
    ) => undefined);
    const store = {
      claimNext: vi.fn(async () => job()),
      complete,
      fail: vi.fn(async () => undefined),
    } as unknown as ShadowEvaluationStore;
    const initialProposal = {
      schemaVersion: 1 as const,
      intent: "hoi_gia",
      conversationStage: "consulting",
      productId: "SQ149",
      action: "HANDOFF" as const,
      reply: "",
      attachments: [],
      handoffReason: "BUSINESS_FACT_REQUIRED",
      businessFactQuery: {
        intent: "PRICE" as const,
        offerType: "SET_QUAN",
        color: "DEN",
        size: "M",
        deliveryRegion: null,
      },
    };
    const model = {
      generate: vi.fn(async () => ({
        proposal: initialProposal,
        modelVersion: "gemini-test",
        latencyMs: 20,
        tokenUsage: { total: 20 },
      })),
      groundWithFacts: vi.fn(async () => ({
        proposal: {
          ...initialProposal,
          action: "REPLY" as const,
          reply: "Dạ set SQ149 giá 699k ạ.",
          handoffReason: null,
        },
        modelVersion: "gemini-test",
        latencyMs: 30,
        tokenUsage: { total: 30 },
      })),
    };
    const factsReader = {
      ready: vi.fn(async () => true),
      close: vi.fn(async () => undefined),
      resolve: vi.fn(async () => ({
        schemaVersion: 1 as const,
        status: "OK" as const,
        source: "POS_SNAPSHOT" as const,
        observedAt: "2026-07-15T00:00:00.000Z",
        expiresAt: "2099-07-16T00:00:00.000Z",
        productId: "SQ149",
        facts: {
          schemaVersion: 1 as const,
          productId: "SQ149",
          parentProductId: "SQ149",
          offerType: "SET_QUAN",
          listPriceVnd: 799_000,
          salePriceVnd: 699_000,
          sizes: ["M"],
          stockStatus: "IN_STOCK" as const,
          stockQuantity: 3,
          deliveryEta: null,
          fulfillmentPolicy: "READY_STOCK",
          imageUrls: [],
        },
        reasonCode: null,
      })),
    };
    const runner = new Phase4ShadowRunner(
      store,
      model as never,
      { modelName: "gemini-test" },
      factsReader,
    );
    await expect(runner.processOne()).resolves.toBe(true);
    expect(factsReader.resolve).toHaveBeenCalledOnce();
    expect(model.groundWithFacts).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0]?.[2]).toMatchObject({
      proposal: { productId: "SQ149", action: "REPLY" },
      guardedPlan: { action: "REPLY", sendAuthorized: false },
      latencyMs: 50,
      tokenUsage: { total: 50 },
      businessFactAudit: { status: "OK", productId: "SQ149" },
    });
  });

  it("resolves a product code through Qdrant search before loading business facts", async () => {
    const complete = vi.fn(async (
      _evaluationId: string,
      _claimToken: string,
      _completion: ShadowEvaluationCompletion,
    ) => undefined);
    const store = {
      claimNext: vi.fn(async () => job()),
      complete,
      fail: vi.fn(async () => undefined),
    } as unknown as ShadowEvaluationStore;
    const proposal = {
      schemaVersion: 1 as const,
      intent: "hoi_gia",
      conversationStage: "consulting",
      productId: null,
      action: "HANDOFF" as const,
      reply: "",
      attachments: [],
      handoffReason: "BUSINESS_FACT_REQUIRED",
      businessFactQuery: {
        intent: "PRICE" as const,
        offerType: "SET_QUAN",
        color: null,
        size: null,
        deliveryRegion: null,
      },
    };
    const model = {
      generate: vi.fn(async () => ({ proposal, modelVersion: "gemini-test", latencyMs: 10, tokenUsage: {} })),
      groundWithFacts: vi.fn(async () => ({
        proposal: { ...proposal, productId: "SQ149", action: "REPLY" as const, reply: "Set SQ149 co gia 699k a", handoffReason: null },
        modelVersion: "gemini-test", latencyMs: 10, tokenUsage: {},
      })),
    };
    const factsReader = {
      ready: vi.fn(async () => true),
      close: vi.fn(async () => undefined),
      resolve: vi.fn(async () => ({
        schemaVersion: 1 as const,
        status: "OK" as const,
        source: "POS_SNAPSHOT" as const,
        observedAt: "2026-07-15T00:00:00.000Z",
        expiresAt: "2026-07-16T00:00:00.000Z",
        productId: "SQ149",
        facts: {
          schemaVersion: 1 as const, productId: "SQ149", parentProductId: "SQ149", offerType: "SET_QUAN",
          listPriceVnd: 799_000, salePriceVnd: 699_000, sizes: ["M"], stockStatus: "IN_STOCK" as const,
          stockQuantity: 3, deliveryEta: null, fulfillmentPolicy: "READY_STOCK", imageUrls: [],
        },
        reasonCode: null,
      })),
    };
    const productSearch = {
      searchText: vi.fn(async () => ({
        status: "MATCHED" as const,
        matchKind: "EXACT_CODE" as const,
        score: 1,
        gap: null,
        product: {
          productId: "SQ149", parentProductId: "SQ149", canonicalCode: "SQ149", aliases: [], title: "Set SQ149",
          colors: [], materials: [], silhouettes: [], occasions: [], imageUrls: ["https://cdn.example/sq149.jpg"], catalogVersion: "v2",
        },
      })),
    };
    const runner = new Phase4ShadowRunner(
      store,
      model as never,
      { modelName: "gemini-test" },
      factsReader,
      productSearch as never,
    );
    await expect(runner.processOne()).resolves.toBe(true);
    expect(productSearch.searchText).toHaveBeenCalled();
    expect(factsReader.resolve).toHaveBeenCalledWith(expect.objectContaining({ productId: "SQ149" }));
    expect(complete.mock.calls[0]?.[2]).toMatchObject({
      proposal: { productId: "SQ149" },
      businessFactAudit: { status: "OK", productId: "SQ149" },
    });
  });

  it("computes deterministic token overlap", () => {
    expect(textSimilarity("Set nay rat xinh", "Set nay xinh lam")).toBeGreaterThan(0.4);
    expect(textSimilarity("gia 699k", "xin chao")).toBe(0);
  });
});
