import { describe, expect, it, vi } from "vitest";
import type {
  ShadowEvaluationCompletion,
  ShadowEvaluationJob,
  ShadowEvaluationStore,
} from "@lana/database";
import {
  Phase4ShadowRunner,
  shouldJudgeV2,
  textSimilarity,
} from "./shadow-runner.js";

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
    contextV2: null,
    actualOutboundText: "Da set co gia 699k a",
    actualOutboundCount: 1,
  };
}

describe("Phase 4 shadow runner", () => {
  it("passes the audited Context V2 snapshot only to the asynchronous second model", async () => {
    const contextV2 = { contractVersion: "CONTEXT_V2", contextHash: "a".repeat(64) } as never;
    const store = {
      claimNext: vi.fn(async () => ({ ...job(), contextV2 })),
      complete: vi.fn(async () => undefined),
      fail: vi.fn(async () => undefined),
    } as unknown as ShadowEvaluationStore;
    const generate = vi.fn(async () => ({
      proposal: {
        schemaVersion: 1 as const,
        intent: "other",
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
      latencyMs: 1,
      tokenUsage: {},
    }));
    const runner = new Phase4ShadowRunner(
      store,
      { generate } as never,
      { modelName: "gemini-test" },
    );
    await expect(runner.processOne()).resolves.toBe(true);
    expect(generate).toHaveBeenCalledWith(expect.any(Array), job().promptVersion, contextV2);
  });

  it("redacts customer URLs from every shadow model context", async () => {
    const rawUrl = "user@example.com:?token=sentinel";
    const urlJob = {
      ...job(),
      context: [{
        ...job().context[0]!,
        text: `Xin xem ${rawUrl}; chị chọn mẫu 1/2`,
      }],
    };
    const store = {
      claimNext: vi.fn(async () => urlJob),
      complete: vi.fn(async () => undefined),
      fail: vi.fn(async () => undefined),
    } as unknown as ShadowEvaluationStore;
    const generate = vi.fn(async (_context: readonly unknown[]) => ({
      proposal: {
        schemaVersion: 1 as const,
        intent: "other",
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
      latencyMs: 1,
      tokenUsage: {},
    }));
    const runner = new Phase4ShadowRunner(
      store,
      { generate } as never,
      { modelName: "gemini-test" },
    );

    await expect(runner.processOne()).resolves.toBe(true);
    const serializedContext = JSON.stringify(generate.mock.calls[0]?.[0]);
    expect(serializedContext).toContain("[CUSTOMER_URL]");
    expect(serializedContext).not.toContain(rawUrl);
    expect(serializedContext).not.toContain("secret");
    expect(serializedContext).not.toContain("sentinel");
    expect(serializedContext).toContain("chị chọn mẫu 1/2");
  });

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
      action: "REPLY" as const,
      reply: "Gia model tu doan 500k",
      attachments: [],
      handoffReason: null,
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
      groundWithFacts: vi.fn(),
      groundDraftWithFacts: vi.fn(async () => ({
        draft: {
          schemaVersion: 1 as const,
          advisoryText: "Form thanh lịch, dễ mặc đi làm.",
          objectionResponse: "",
          suggestedQuestion: "Chị thích màu nào ạ?",
          suggestedNextStep: "",
          attachmentImageIndices: [0],
        },
        modelVersion: "gemini-test-v2", latencyMs: 10, tokenUsage: {},
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
      {
        modelName: "gemini-test",
        groundedDraftEnabled: true,
        verifiedFactAssemblerEnabled: true,
      },
      factsReader,
      productSearch as never,
    );
    await expect(runner.processOne()).resolves.toBe(true);
    expect(productSearch.searchText).toHaveBeenCalled();
    expect(factsReader.resolve).toHaveBeenCalledWith(expect.objectContaining({ productId: "SQ149" }));
    expect(model.groundDraftWithFacts).toHaveBeenCalledOnce();
    expect(model.groundWithFacts).not.toHaveBeenCalled();
    expect(complete.mock.calls[0]?.[2]).toMatchObject({
      proposal: {
        productId: "SQ149",
        action: "REPLY",
        reply: [
          "Set SQ149 hiện có giá 699.000đ.",
          "Size: M",
          "",
          "Form thanh lịch, dễ mặc đi làm.",
          "Chị thích màu nào ạ?",
        ].join("\n"),
        attachments: ["https://cdn.example/sq149.jpg"],
      },
      businessFactAudit: { status: "OK", productId: "SQ149" },
      businessFactEnvelope: { status: "OK", productId: "SQ149" },
    });
  });

  it("samples Judge v2 deterministically and always evaluates DRY_RUN", () => {
    expect(shouldJudgeV2("eval-1", "DRY_RUN", 0)).toBe(true);
    expect(shouldJudgeV2("eval-1", "LIVE", 0)).toBe(false);
    expect(shouldJudgeV2("eval-1", "LIVE", 1)).toBe(true);
    expect(shouldJudgeV2("eval-stable", "LIVE", 0.1))
      .toBe(shouldJudgeV2("eval-stable", "LIVE", 0.1));
  });

  it("passes the persisted verified envelope to Judge v2 in DRY_RUN", async () => {
    const rawUrl = "user@127:#judge-sentinel";
    const completeComparison = vi.fn(async (
      _comparisonJob: unknown,
      _similarity: number,
      _assessment: unknown,
    ) => undefined);
    const verifiedEnvelope = {
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
    };
    const comparison = {
      evaluationId: "eval-v2",
      claimToken: "claim-v2",
      proposalReply: "Dạ Set SQ149 có giá 699k ạ",
      actualOutboundText: `Dạ Set SQ149 có giá 699k ạ ${rawUrl}`,
      actualOutboundCount: 1,
      context: [{ ...job().context[0]!, text: `Xin xem ${rawUrl}; chị chọn mẫu 1/2` }],
      proposalSummary: { productId: "SQ149", action: "REPLY", reply: rawUrl },
      guardOutcome: { action: "REPLY", blockedReasonCodes: [], detail: rawUrl },
      businessFactEnvelope: verifiedEnvelope,
    };
    const store = {
      claimComparisonNext: vi.fn(async () => comparison),
      completeComparison,
    } as unknown as ShadowEvaluationStore;
    const model = {
      judgeSalesReply: vi.fn(),
      judgeSalesReplyV2: vi.fn(async () => ({
        schemaVersion: 2 as const,
        intent: "hoi_gia",
        conversationStage: "consulting",
        scores: {
          relevance: 5,
          questionResolution: 5,
          nextStepQuality: 4,
          naturalness: 4,
          concision: 5,
          factGrounding: 5,
          objectionResolution: 3,
          salesProgression: 4,
          ctaStageFit: 4,
          overall: 4.5,
        },
        strengths: ["fact đúng"],
        weaknesses: [],
        improvedReply: "Dạ Set SQ149 có giá 500k ạ",
        recommendationAction: "KEEP" as const,
      })),
    };
    const runner = new Phase4ShadowRunner(
      store,
      model as never,
      {
        modelName: "gemini-test",
        judgeV2Enabled: true,
        judgeMode: "DRY_RUN",
        judgeV2SampleRate: 0,
      },
    );

    await expect(runner.processComparisonOne()).resolves.toBe(true);
    expect(model.judgeSalesReplyV2).toHaveBeenCalledWith(
      [{ ...comparison.context[0]!, text: "Xin xem [CUSTOMER_URL]; chị chọn mẫu 1/2" }],
      "Dạ Set SQ149 có giá 699k ạ [CUSTOMER_URL]",
      verifiedEnvelope,
      { productId: "SQ149", action: "REPLY", reply: "[CUSTOMER_URL]" },
      { action: "REPLY", blockedReasonCodes: [], detail: "[CUSTOMER_URL]" },
    );
    expect(JSON.stringify(model.judgeSalesReplyV2.mock.calls[0])).not.toContain("secret");
    expect(JSON.stringify(model.judgeSalesReplyV2.mock.calls[0])).not.toContain("judge-sentinel");
    expect(model.judgeSalesReply).not.toHaveBeenCalled();
    expect(completeComparison.mock.calls[0]?.[2]).toMatchObject({
      schemaVersion: 2,
      scores: { factGrounding: 5 },
      improvedReply: "",
      weaknesses: ["IMPROVED_REPLY_UNVERIFIED_FACT"],
    });
  });

  it("computes deterministic token overlap", () => {
    expect(textSimilarity("Set nay rat xinh", "Set nay xinh lam")).toBeGreaterThan(0.4);
    expect(textSimilarity("gia 699k", "xin chao")).toBe(0);
  });
});
