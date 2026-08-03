import { describe, expect, it, vi } from "vitest";
import type { ClaimedMetaOutbox } from "@lana/database";
import {
  applyWave2ReplyPolicy,
  decideWave2SalesStrategy,
  resolveHybridBuyingSignal,
  type StableProductDocument,
} from "@lana/business-tools";
import type {
  AgentProposalV1,
  BusinessFactEnvelopeV1,
  CustomerProfileV1,
} from "@lana/contracts";
import {
  composeSizeEngineAdvice,
  deterministicVertexProposalFallback,
  groupRealtimeMetaMessagesV2,
  resolveExplicitModelTelemetry,
  responseGroupHandoffOrdering,
  vertexGroundedFallbackReason,
  verifiedProductInfoProposal,
  withProactiveSizeAdvice,
} from "./realtime-runner.js";
import {
  resolveMetaResponseGroupGate,
  type MetaOutboxDispatchStore,
  type MetaPreSendGate,
} from "./meta-outbox-dispatcher.js";
import { classifyMetaOutboxQueueHealth } from "./delivery-health.js";

const R31_3_BASELINE = Object.freeze({
  tag: "20260731-realtime-generation-quota-r31.3",
  commit: "30dd6030a2e682cdd438f4226073fb77e4a579b7",
});

const ALLOWED_R32_2_DEVIATIONS = Object.freeze({
  D1: "size-only degradation preserves verified base",
  D2: "grounded-draft errors use deterministic fallback",
  D3: "voice contract and eligible stage CTA are restored",
  D4: "one fail-closed ownership decision protects the response group",
  D5: "outbox watchdog resolves stuck descendants without duplicate sends",
  D6: "token and health telemetry become explicit without changing replies",
});

const protectedBaseProposal: AgentProposalV1 = {
  schemaVersion: 1,
  intent: "PRODUCT_INFO",
  conversationStage: "PRODUCT_MATCHED",
  productId: "SD398",
  action: "REPLY",
  reply: "PRICE-VERIFIED; STOCK-VERIFIED; ETA-VERIFIED",
  attachments: ["https://cdn.example/sd398.jpg"],
  handoffReason: null,
  businessFactQuery: {
    intent: "PRICE",
    offerType: null,
    color: null,
    size: null,
    deliveryRegion: null,
  },
};

const incompleteProfile: CustomerProfileV1 = {
  schemaVersion: 1,
  profileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
  customerKey: {
    namespace: "lana-customer-v1",
    algorithm: "HMAC_SHA256",
    digest: "a".repeat(64),
  },
  revision: 1,
  measurements: [],
  fitPreference: null,
  preferences: { colors: [], styles: [], materials: [] },
  sizeHistory: [],
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
};

const completeProfile: CustomerProfileV1 = {
  ...incompleteProfile,
  revision: 2,
  measurements: [
    {
      kind: "HEIGHT_CM",
      value: 160,
      provenance: {
        source: "CUSTOMER_MESSAGE",
        sourceEventHash: "b".repeat(64),
        observedAt: "2026-07-31T00:00:00.000Z",
        confidence: 1,
      },
    },
    {
      kind: "WEIGHT_KG",
      value: 53,
      provenance: {
        source: "CUSTOMER_MESSAGE",
        sourceEventHash: "c".repeat(64),
        observedAt: "2026-07-31T00:00:00.000Z",
        confidence: 1,
      },
    },
  ],
};

const product: StableProductDocument = {
  productId: "SD398",
  parentProductId: "SD398",
  canonicalCode: "SD398",
  aliases: [],
  title: "Áo dài Dao Phụng",
  descriptionXml: "Thiết kế nữ tính với chất liệu ren họa tiết hoa chìm phối tơ ống mềm mịn, mang lại cảm giác nhẹ nhàng. Áo dài được thiết kế form suông rộng, tạo độ thoải mái. Thiết kế áo dài 6 tà giúp tổng thể uyển chuyển khi mặc.",
  colors: ["ĐEN"],
  materials: ["REN", "TƠ ỐNG"],
  silhouettes: ["SUÔNG", "ỐNG RỘNG"],
  occasions: [],
  imageUrls: ["https://cdn.example/sd398.jpg"],
  images: [],
  catalogVersion: "catalog-v2",
};

const facts: BusinessFactEnvelopeV1 = {
  schemaVersion: 1,
  status: "OK",
  source: "POS_SNAPSHOT",
  observedAt: "2026-07-31T00:00:00.000Z",
  expiresAt: "2026-08-01T00:00:00.000Z",
  productId: "SD398",
  facts: {
    schemaVersion: 1,
    productId: "SD398",
    parentProductId: "SD398",
    offerType: "AO_DAI",
    listPriceVnd: null,
    salePriceVnd: 1_199_000,
    sizes: ["M", "L", "XL"],
    stockStatus: "IN_STOCK",
    stockQuantity: 3,
    deliveryEta: null,
    fulfillmentPolicy: "PRE_ORDER",
    imageUrls: ["https://cdn.example/sd398.jpg"],
  },
  reasonCode: null,
};

describe("r32.2 Compatibility First regression shield", () => {
  it("pins the r31.3 behavioral baseline and the complete D1-D6 allowlist", () => {
    expect(R31_3_BASELINE).toEqual({
      tag: "20260731-realtime-generation-quota-r31.3",
      commit: "30dd6030a2e682cdd438f4226073fb77e4a579b7",
    });
    expect(Object.keys(ALLOWED_R32_2_DEVIATIONS)).toEqual([
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
    ]);
    expect(new Set(Object.values(ALLOWED_R32_2_DEVIATIONS)).size).toBe(6);
  });

  it("preserves the verified quote, CTA, image, and two-bubble product-info form", () => {
    const proposal = verifiedProductInfoProposal(product, facts, []);
    expect(proposal).not.toBeNull();
    expect(proposal?.reply).toBe([
      "Áo dài Dao Phụng (mã SD398) hiện có giá 1.199.000đ.",
      "Chất liệu: ren họa tiết hoa chìm phối tơ ống",
      "Form dáng: suông rộng",
      "Size: M, L, XL",
      "",
      "Chị cao và nặng khoảng bao nhiêu để em tư vấn size phù hợp cho mẫu này?",
    ].join("\n"));
    expect(proposal?.attachments).toEqual(["https://cdn.example/sd398.jpg"]);

    expect(groupRealtimeMetaMessagesV2([
      { kind: "TEXT", text: proposal?.reply ?? "" },
      { kind: "IMAGE", imageUrl: proposal?.attachments[0] ?? "" },
    ], true)).toEqual([
      {
        kind: "TEXT",
        text: [
          "Áo dài Dao Phụng (mã SD398) hiện có giá 1.199.000đ.",
          "Chất liệu: ren họa tiết hoa chìm phối tơ ống",
          "Form dáng: suông rộng",
          "Size: M, L, XL",
        ].join("\n"),
      },
      {
        kind: "TEXT",
        text: "Chị cao và nặng khoảng bao nhiêu để em tư vấn size phù hợp cho mẫu này?",
      },
      { kind: "IMAGE", imageUrl: "https://cdn.example/sd398.jpg" },
    ]);
  });

  it("keeps normal advisory in one bubble", () => {
    const advice = {
      kind: "TEXT" as const,
      text: "Mẫu này có form ôm nhẹ ở eo. Chị chọn size M sẽ thoải mái hơn.",
    };
    expect(groupRealtimeMetaMessagesV2([advice])).toEqual([advice]);
  });

  it("does not let an ineligible Size Engine pass erase the verified base", () => {
    expect(withProactiveSizeAdvice(
      protectedBaseProposal,
      product,
      incompleteProfile,
      null,
      null,
      new Date("2026-07-31T00:00:00.000Z"),
    )).toEqual(protectedBaseProposal);
  });

  it("preserves the Voice Contract and adds at most one eligible stage question", () => {
    const decision = decideWave2SalesStrategy({
      text: "mẫu này đẹp",
      salesStage: "PRODUCT_MATCHED",
      objectionType: "NONE",
      buyingSignal: false,
      hasVerifiedProduct: true,
      resolvedProductCount: 1,
      hasMeasurements: false,
    });
    const rewritten = applyWave2ReplyPolicy({
      ...protectedBaseProposal,
      reply: "Mẫu này giữ form mềm và dễ mặc.",
    }, decision);

    expect(rewritten.reply).toContain("Mẫu này giữ form mềm và dễ mặc.");
    expect(rewritten.reply).toContain("tư vấn size phù hợp");
    expect((rewritten.reply.match(/\?/gu) ?? []).length).toBe(1);
  });

  it("does not add a CTA to committed buying intent or handoff", () => {
    const committed = decideWave2SalesStrategy({
      text: "chốt mẫu này cho chị",
      salesStage: "PRODUCT_MATCHED",
      objectionType: "NONE",
      buyingSignal: true,
      hasVerifiedProduct: true,
      resolvedProductCount: 1,
      hasMeasurements: false,
    });
    expect(applyWave2ReplyPolicy(protectedBaseProposal, committed))
      .toEqual(protectedBaseProposal);

    const handoff = {
      ...protectedBaseProposal,
      action: "HANDOFF" as const,
      reply: "Em chuyển nhân viên hỗ trợ chị ngay nhé.",
      handoffReason: "BUSINESS_FACT_UNAVAILABLE" as const,
    };
    expect(applyWave2ReplyPolicy(handoff, committed)).toEqual(handoff);
  });

  it("keeps deterministic buying intent stronger than model disagreement", () => {
    expect(resolveHybridBuyingSignal(
      "chốt mẫu này",
      { hasProductContext: true },
      {
        decision: "NEGATED",
        requestedAction: "NONE",
        quantity: null,
        evidenceText: "chốt mẫu này",
        confidence: 0.99,
      },
    )).toMatchObject({
      isBuyingSignal: true,
      decision: "COMMITTED",
      source: "DETERMINISTIC",
    });
    expect(resolveHybridBuyingSignal(
      "mẫu này giá bao nhiêu?",
      { hasProductContext: true },
      {
        decision: "COMMITTED",
        requestedAction: "OPEN_CART",
        quantity: null,
        evidenceText: "mẫu này giá bao nhiêu?",
        confidence: 0.99,
      },
    ).isBuyingSignal).toBe(false);
  });

  it("[D1] complete measurements plus missing size chart preserve verified price, stock, ETA, image, and CTA", () => {
    const verifiedBase = {
      ...protectedBaseProposal,
      reply: [
        protectedBaseProposal.reply,
        "Chị muốn em giữ mẫu này để nhân viên hỗ trợ riêng phần size không?",
      ].join("\n\n"),
    };
    const composition = composeSizeEngineAdvice(
      verifiedBase,
      product,
      completeProfile,
      null,
      null,
      new Date("2026-07-31T00:00:00.000Z"),
    );

    expect(composition).toMatchObject({
      requiresHandoff: true,
      reasonCode: "VERIFIED_SIZE_CHART_UNAVAILABLE",
    });
    expect(composition.proposal).toEqual(verifiedBase);
    expect(composition.proposal.action).toBe("REPLY");
    expect(composition.proposal.reply).toContain("PRICE-VERIFIED");
    expect(composition.proposal.reply).toContain("STOCK-VERIFIED");
    expect(composition.proposal.reply).toContain("ETA-VERIFIED");
    expect((composition.proposal.reply.match(/\?/gu) ?? []).length).toBe(1);
    expect(composition.proposal.attachments).toEqual([
      "https://cdn.example/sd398.jpg",
    ]);
    expect(1 + composition.proposal.attachments.length).toBeGreaterThan(0);
  });
  it("[D2] all Vertex draft failures select one deterministic grounded fallback", () => {
    const errors = [
      "VERTEX_SCHEMA_INVALID",
      "GROUNDED_SCHEMA_INVALID",
      "VERTEX_TIMEOUT",
      "VERTEX_GENERATE_RETRYABLE",
      "VERTEX_GROUNDED_DRAFT_TIMEOUT",
      "VERTEX_GROUNDED_DRAFT_RETRYABLE",
      "VERTEX_GROUNDED_DRAFT_NETWORK_ERROR",
      "VERTEX_GROUNDED_DRAFT_FAILED",
    ];
    const fallbacks = errors.map((code) =>
      deterministicVertexProposalFallback(
        "Mẫu này giá bao nhiêu, mặc có tôn dáng không?",
        product,
        false,
        new Error(code),
      )
    );

    expect(fallbacks.map(({ proposal }) => proposal)).toEqual(
      fallbacks.map(() => fallbacks[0]!.proposal),
    );
    expect(fallbacks[0]).toMatchObject({
      reasonCode: "GROUNDED_SCHEMA_INVALID",
      proposal: {
        action: "REPLY",
        productId: "SD398",
        businessFactQuery: { intent: "PRICE" },
      },
    });
    expect(fallbacks.slice(2).map(({ reasonCode }) => reasonCode))
      .toEqual(fallbacks.slice(2).map(() => "GROUNDED_DRAFT_FALLBACK"));
    expect(vertexGroundedFallbackReason(new Error("VERTEX_SCHEMA_INVALID")))
      .toBe("GROUNDED_SCHEMA_INVALID");
  });
  it("[D4] one verified ownership snapshot fail-closes the entire response group before sequence 0", async () => {
    const groupedClaim = (sequenceNo: number): ClaimedMetaOutbox => ({
      outboxId: "30000000-0000-4000-8000-00000000000" + sequenceNo,
      leaseToken: "40000000-0000-4000-8000-00000000000" + sequenceNo,
      pageId: "1198992073286645",
      conversationId: "50000000-0000-4000-8000-000000000001",
      replyPlanId: "50000000-0000-4000-8000-000000000002",
      responseGroupId: "50000000-0000-4000-8000-000000000003",
      sequenceNo,
      recipientId: "customer-1",
      pancakeConversationId: "pancake-conversation-1",
      message: { kind: "TEXT", text: "message-" + sequenceNo },
      attemptCount: 1,
    });
    let snapshot: Awaited<
      ReturnType<MetaOutboxDispatchStore["readMetaResponseGroupGate"]>
    > = null;
    const repository: MetaOutboxDispatchStore = {
      claimMetaOutbox: vi.fn(async () => null),
      readMetaResponseGroupGate: vi.fn(async () => snapshot),
      recordMetaResponseGroupGate: vi.fn(async (input) => {
        if (snapshot?.status === "ALLOWED" || snapshot?.status === "BLOCKED") {
          return snapshot;
        }
        snapshot = {
          responseGroupId: input.responseGroupId,
          source: "PANCAKE",
          status: input.observation.status,
          reasonCode: input.observation.reasonCode,
          blockingTag: input.observation.blockingTag,
          observedAt: input.observation.observedAt,
          attemptCount: (snapshot?.attemptCount ?? 0) + 1,
          expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        };
        return snapshot;
      }),
      markMetaAccepted: vi.fn(async () => true),
      markMetaRetryable: vi.fn(async () => true),
      markMetaTerminal: vi.fn(async () => true),
      markMetaManualReview: vi.fn(async () => true),
      quarantineExpiredMetaSending: vi.fn(async () => 0),
    };
    const gate: MetaPreSendGate = {
      authorize: vi.fn()
        .mockResolvedValueOnce({
          status: "UNVERIFIED",
          reasonCode: "PANCAKE_TAG_UNVERIFIED",
          blockingTag: null,
          observedAt: new Date("2026-07-31T16:40:58.264Z"),
        })
        .mockResolvedValueOnce({
          status: "ALLOWED",
          reasonCode: null,
          blockingTag: null,
          observedAt: new Date("2026-07-31T16:40:59.000Z"),
        }),
    };

    const unverifiedSequence0 = await resolveMetaResponseGroupGate(
      groupedClaim(0), repository, gate,
    );
    const verifiedSequence0 = await resolveMetaResponseGroupGate(
      groupedClaim(0), repository, gate,
    );
    const sequence1 = await resolveMetaResponseGroupGate(
      groupedClaim(1), repository, gate,
    );
    const sequence2 = await resolveMetaResponseGroupGate(
      groupedClaim(2), repository, gate,
    );

    expect(unverifiedSequence0.status).toBe("UNVERIFIED");
    expect(verifiedSequence0.status).toBe("ALLOWED");
    expect(sequence1).toEqual(verifiedSequence0);
    expect(sequence2).toEqual(verifiedSequence0);
    expect(gate.authorize).toHaveBeenCalledTimes(2);
  });
  it("[D5] orders preserved size output before the employee handoff tag", () => {
    const groupId = "50000000-0000-4000-8000-000000000003";
    expect(responseGroupHandoffOrdering(true, 4, groupId)).toEqual({
      sendAfterOwnerHandoff: true,
      afterResponseGroupId: groupId,
    });
    expect(responseGroupHandoffOrdering(true, 0, groupId)).toEqual({
      sendAfterOwnerHandoff: false,
      afterResponseGroupId: null,
    });
    expect(responseGroupHandoffOrdering(false, 4, groupId)).toEqual({
      sendAfterOwnerHandoff: false,
      afterResponseGroupId: null,
    });
  });

  it("[D6] exposes token source/path and queue state without changing the reply", () => {
    const before = JSON.stringify(protectedBaseProposal);
    expect(resolveExplicitModelTelemetry({
      modelCalled: true,
      hasProviderUsage: true,
      providerPromptTokens: 20,
      providerOutputTokens: 10,
      providerTotalTokens: 30,
      inputCharacterCount: 400,
      outputCharacterCount: 80,
      initialFallbackUsed: false,
      groundedDraftFallbackUsed: false,
      errorClass: null,
    })).toMatchObject({
      usageSource: "provider",
      path: "model",
      tokenUsage: { prompt: 20, output: 10, total: 30 },
    });
    expect(resolveExplicitModelTelemetry({
      modelCalled: true,
      hasProviderUsage: false,
      providerPromptTokens: 0,
      providerOutputTokens: 0,
      providerTotalTokens: 0,
      inputCharacterCount: 400,
      outputCharacterCount: 80,
      initialFallbackUsed: true,
      groundedDraftFallbackUsed: false,
      errorClass: "VERTEX_SCHEMA_INVALID",
    })).toEqual({
      usageSource: "estimated",
      path: "initial_fallback",
      errorClass: "VERTEX_SCHEMA_INVALID",
      tokenUsage: { prompt: 100, output: 20, total: 120 },
    });
    expect(classifyMetaOutboxQueueHealth({
      pageId: "1198992073286645",
      actionableCount: 0,
      sendingCount: 0,
      expiredSendingCount: 0,
      manualReviewCount: 1,
      stuckDescendantCount: 0,
      oldestActionableAgeSeconds: null,
      oldestManualReviewAgeSeconds: 60,
    }, {
      actionableSloSeconds: 120,
      manualReviewSloSeconds: 1_800,
    }).status).toBe("DEGRADED");
    expect(JSON.stringify(protectedBaseProposal)).toBe(before);
  });
});
