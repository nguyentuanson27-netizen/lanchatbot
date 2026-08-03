import { describe, expect, it, vi } from "vitest";
import {
  AFTER_SALES_HOLDING_REPLY_V2,
  createConversationState,
} from "@lana/conversation-engine";
import {
  aiContinuationProductId,
  catalogAdvisoryIntent,
  catalogAdvisoryReply,
  continuationProductId,
  currentProductContinuationId,
  explicitCustomerBusinessIntent,
  explicitCustomerBusinessIntents,
  explicitCustomerImageIntent,
  isLegacyUnaccentedProductInfoReply,
  isPostSaleRequest,
  groupRealtimeMetaMessagesV2,
  IMAGE_INTENT_REPLIES,
  isPreSalePolicyQuestion,
  FailClosedTagObservationProvider,
  hasCustomerMeasurementSignal,
  holdingMessagesForHandoff,
  inboxRetryDelaySeconds,
  modelHandoffPermitted,
  multiProductReply,
  pancakeConversationId,
  productCodeOnly,
  productDescriptionLine,
  productDisplayName,
  postMediaProofCta,
  proactiveSizeEvidencePrefix,
  RealtimeRunner,
  verifiedSizeGuideAttachments,
  staleFactsRequireHandoff,
  splitRealtimeMetaMessages,
  unavailableFactsRequireHandoff,
  composeSizeEngineAdvice,
  withProactiveSizeAdvice,
  unresolvedProductRequiresHandoff,
  verifiedProductInfoProposal,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeMediaRecognitionPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
} from "./realtime-runner.js";
import type {
  BusinessFactEnvelopeV1,
  AgentProposalV1,
  CustomerProfileV1,
  ProductFactsV2,
} from "@lana/contracts";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";

describe("RealtimeRunner", () => {
  it("splits every outbound sentence into its own text message and preserves image order", () => {
    expect(splitRealtimeMetaMessages([
      {
        kind: "TEXT",
        text: [
          "Dạ mẫu này có giá 999k ạ",
          "Chất liệu ren hoa mềm. Form suông nhẹ khi di chuyển.",
          "Size S, M, L",
        ].join("\n"),
      },
      { kind: "IMAGE", imageUrl: "https://cdn.example/sd395.jpg" },
    ])).toEqual([
      { kind: "TEXT", text: "Dạ mẫu này có giá 999k ạ" },
      { kind: "TEXT", text: "Chất liệu ren hoa mềm." },
      { kind: "TEXT", text: "Form suông nhẹ khi di chuyển." },
      { kind: "TEXT", text: "Size S, M, L" },
      { kind: "IMAGE", imageUrl: "https://cdn.example/sd395.jpg" },
    ]);
  });

  it("keeps normal advice in one bubble and splits only the product follow-up", () => {
    const advice = {
      kind: "TEXT" as const,
      text: "Mẫu này có form ôm nhẹ ở eo. Chị chọn size M sẽ thoải mái hơn.",
    };
    expect(groupRealtimeMetaMessagesV2([advice])).toEqual([advice]);

    expect(groupRealtimeMetaMessagesV2([
      {
        kind: "TEXT",
        text: [
          "Set váy Quỳnh Dao (mã SV695) hiện có giá 770.000đ.",
          "Chất liệu: lụa mềm",
          "Form dáng: chiết eo",
          "Size: M, L, XL",
          "",
          "Chị cao và nặng khoảng bao nhiêu để em tư vấn size phù hợp cho mẫu này?",
        ].join("\n"),
      },
      { kind: "IMAGE", imageUrl: "https://cdn.example/sv695.jpg" },
    ], true)).toEqual([
      {
        kind: "TEXT",
        text: [
          "Set váy Quỳnh Dao (mã SV695) hiện có giá 770.000đ.",
          "Chất liệu: lụa mềm",
          "Form dáng: chiết eo",
          "Size: M, L, XL",
        ].join("\n"),
      },
      { kind: "TEXT", text: "Chị cao và nặng khoảng bao nhiêu để em tư vấn size phù hợp cho mẫu này?" },
      { kind: "IMAGE", imageUrl: "https://cdn.example/sv695.jpg" },
    ]);
  });

  it("uses six concise templates for requested images", () => {
    expect(IMAGE_INTENT_REPLIES).toEqual({
      FEEDBACK: "Em gửi chị ảnh khách đã mặc mẫu này.",
      DETAIL: "Em gửi chị ảnh cận chất liệu của mẫu này.",
      BACK: "Em gửi chị ảnh mặt sau của mẫu này.",
      SIZE_GUIDE: "Em gửi chị bảng size của mẫu này.",
      PRODUCT_ONLY: "Em gửi chị ảnh sản phẩm của mẫu này.",
      GENERIC: "Em gửi chị thêm ảnh của mẫu này.",
    });
  });

  it("limits nhé and ạ to one use per response group but keeps the chị pronoun", () => {
    const grouped = groupRealtimeMetaMessagesV2([
      { kind: "TEXT", text: "Chị xem mẫu này nhé ạ." },
      { kind: "TEXT", text: "Chị gửi thêm ảnh nhé ạ." },
    ]);
    expect(grouped).toEqual([
      { kind: "TEXT", text: "Chị xem mẫu này nhé ạ." },
      { kind: "TEXT", text: "Chị gửi thêm ảnh." },
    ]);
    const rendered = grouped
      .filter((message): message is Extract<typeof message, { kind: "TEXT" }> => message.kind === "TEXT")
      .map((message) => message.text)
      .join("\n");
    for (const token of ["nhé", "ạ"]) {
      expect(Array.from(rendered.matchAll(
        new RegExp(`(?<![\\p{L}\\p{N}_])${token}(?![\\p{L}\\p{N}_])`, "giu"),
      ))).toHaveLength(1);
    }
    // "chị" is a pronoun, not a politeness particle: it must survive on every message.
    expect(Array.from(rendered.matchAll(
      /(?<![\p{L}\p{N}_])chị(?![\p{L}\p{N}_])/giu,
    ))).toHaveLength(2);
  });

  it("uses deterministic bounded jitter for inbox retries", () => {
    expect(inboxRetryDelaySeconds(3, "event-a")).toBe(
      inboxRetryDelaySeconds(3, "event-a"),
    );
    expect(inboxRetryDelaySeconds(3, "event-a")).toBeGreaterThanOrEqual(6);
    expect(inboxRetryDelaySeconds(3, "event-a")).toBeLessThanOrEqual(10);
    expect(inboxRetryDelaySeconds(30, "event-a")).toBeLessThanOrEqual(300);
    expect(inboxRetryDelaySeconds(-4, "event-a")).toBeGreaterThanOrEqual(1);
  });

  it("reuses only verified current-product context for genuine follow-up messages", () => {
    expect(currentProductContinuationId("xin ảnh cận chất", "SV695")).toBe("SV695");
    expect(currentProductContinuationId("mẫu này còn size M không", "SV695")).toBe("SV695");
    expect(currentProductContinuationId("90-60-90", "SV695")).toBe("SV695");
    expect(currentProductContinuationId("1m60 52kg", "SV695")).toBe("SV695");
    expect(currentProductContinuationId("CB182 cao 1m60 52kg", "SV695")).toBeNull();
    expect(currentProductContinuationId("M nhé", "SV695")).toBe("SV695");
    expect(currentProductContinuationId("màu trắng", "SV695")).toBe("SV695");
    expect(currentProductContinuationId("CB182", "SV695")).toBeNull();
    expect(currentProductContinuationId("shop ở đâu", "SV695")).toBeNull();
    expect(hasCustomerMeasurementSignal("90-60-90")).toBe(true);
    expect(hasCustomerMeasurementSignal("1m60 52kg")).toBe(true);
    expect(explicitCustomerBusinessIntent("90-60-90")).toBe("SIZE");
    expect(explicitCustomerBusinessIntents("90-60-90")).toEqual(["SIZE"]);
    expect(aiContinuationProductId("90-60-90", "sd396", "SD396")).toBe("SD396");
    expect(aiContinuationProductId("1m60 52kg", "sd396", "SD396")).toBe("SD396");
    expect(aiContinuationProductId("CB182 cao 1m60 52kg", "SD396", "SD396")).toBeNull();
    expect(aiContinuationProductId("CB182", "SD396", "SD396")).toBeNull();
    expect(aiContinuationProductId("90-60-90", "CB182", "SD396")).toBeNull();
    expect(continuationProductId(null, "CB182", "SV695")).toBe("CB182");
    expect(continuationProductId(null, null, "SV695")).toBe("SV695");
  });

  it("attaches only the exact fresh approved size chart used by the recommendation", () => {
    const hash = "a".repeat(64);
    const exactUrl = "https://cdn.example/cb182-size.jpg";
    const facts = {
      media: {
        metadata: {
          freshnessState: "FRESH",
          expiresAt: "2026-07-25T00:00:00.000Z",
        },
        assets: [
          {
            url: "https://cdn.example/wrong-size.jpg",
            purposes: ["SIZE_CHART"],
            verified: true,
            reviewStatus: "APPROVED",
            sourceContentSha256: "b".repeat(64),
            sortOrder: 0,
          },
          {
            url: exactUrl,
            purposes: ["SIZE_CHART"],
            verified: true,
            reviewStatus: "APPROVED",
            sourceContentSha256: hash,
            sortOrder: 1,
          },
        ],
      },
    } as ProductFactsV2;
    expect(verifiedSizeGuideAttachments(
      facts,
      hash,
      exactUrl,
      new Date("2026-07-24T00:00:00.000Z"),
    )).toEqual([exactUrl]);
    expect(verifiedSizeGuideAttachments(
      facts,
      "c".repeat(64),
      exactUrl,
      new Date("2026-07-24T00:00:00.000Z"),
    )).toEqual([]);
  });

  it("does not attach stale, expired or unapproved size charts", () => {
    const hash = "a".repeat(64);
    const url = "https://cdn.example/cb182-size.jpg";
    const facts = {
      media: {
        metadata: {
          freshnessState: "FRESH",
          expiresAt: "2026-07-24T00:00:00.000Z",
        },
        assets: [{
          url,
          purposes: ["SIZE_CHART"],
          verified: false,
          reviewStatus: null,
          sourceContentSha256: hash,
          sortOrder: 0,
        }],
      },
    } as ProductFactsV2;
    expect(verifiedSizeGuideAttachments(
      facts,
      hash,
      url,
      new Date("2026-07-24T00:00:00.000Z"),
    )).toEqual([]);
  });

  it("uses customer history wording only when the size engine used a past size", () => {
    expect(proactiveSizeEvidencePrefix(["PAST_SIZE_MATCHES_VERIFIED_CHART"]))
      .toBe("Theo size chị đã mua và xác nhận trước đây");
    expect(proactiveSizeEvidencePrefix(["MEASUREMENTS_MATCHES_VERIFIED_CHART"]))
      .toBe("Theo số đo mới nhất");
  });

  it("sends one holding reply only for after-sales handoff", () => {
    const message = {
      eventKey: "meta:1198992073286645:message:m-after-sales",
      occurredAt: "2026-07-23T01:00:00.000Z",
    };
    expect(holdingMessagesForHandoff(message, {
      reason: "ORDER_STATUS",
      category: "POST_SALE",
      desiredTag: "VAN_DON",
      silent: true,
    })).toEqual([{ kind: "TEXT", text: AFTER_SALES_HOLDING_REPLY_V2 }]);
    expect(holdingMessagesForHandoff(message, {
      reason: "PRODUCT_TOOL_ERROR",
      category: "GENERAL",
      desiredTag: "NHAN_VIEN",
      silent: true,
    })).toEqual([]);
  });

  it("ignores an echo that matches the app outbox instead of assigning HUMAN ownership", async () => {
    const now = "2026-07-18T16:51:04.328Z";
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
      pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:mid.bot-1",
      conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(now),
      receivedAt: new Date(now),
      receiveSequence: 2,
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
          eventKey: "meta:1198992073286645:message:mid.bot-1",
          pageId: "1198992073286645",
          messageId: "mid.bot-1",
          senderId: "customer-1",
          conversationId: "meta:v1:customer-hash",
          occurredAt: now,
          isEcho: true,
          appId: null,
          text: "Dáº¡ em há»— trá»£ chá»‹ nhÃ©.",
          attachments: [],
        },
      },
    };
    const complete = vi.fn(async () => true);
    const inbox: RealtimeInboxPort = {
      claimNext: vi.fn(async () => claim),
      complete,
      retry: vi.fn(async () => true),
      failPermanent: vi.fn(async () => true),
    };
    const runtime: RealtimeRuntimePort = {
      isOwnMetaMessage: vi.fn(async () => true),
      loadOrCreate: vi.fn(),
      commit: vi.fn(),
      linkProviderConversation: vi.fn(),
    };
    const runner = new RealtimeRunner(
      inbox,
      runtime,
      { generate: vi.fn(), groundWithFacts: vi.fn() },
      { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() },
      { searchText: vi.fn(), searchImage: vi.fn() },
      new FailClosedTagObservationProvider(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true, metaAppId: "app-1" },
    );

    expect(await runner.processOne()).toBe(true);
    expect(runtime.isOwnMetaMessage).toHaveBeenCalledWith(claim.pageId, "mid.bot-1");
    expect(runtime.loadOrCreate).not.toHaveBeenCalled();
    expect(runtime.commit).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledOnce();
  });

  it("uses the current Meta App ID only as an echo fallback", async () => {
    const now = "2026-07-18T16:51:04.328Z";
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
      pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:mid.bot-2",
      conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(now), receivedAt: new Date(now), receiveSequence: 2,
      attemptCount: 1, leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      envelope: {
        schemaVersion: 1 as const, customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: {
          schemaVersion: 1 as const, traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
          eventKey: "meta:1198992073286645:message:mid.bot-2", pageId: "1198992073286645",
          messageId: "mid.bot-2", senderId: "customer-1", conversationId: "meta:v1:customer-hash",
          occurredAt: now, isEcho: true, appId: "app-1", text: "Bot reply", attachments: [],
        },
      },
    };
    const complete = vi.fn(async () => true);
    const runtime: RealtimeRuntimePort = {
      isOwnMetaMessage: vi.fn(async () => false), loadOrCreate: vi.fn(), commit: vi.fn(), linkProviderConversation: vi.fn(),
    };
    const runner = new RealtimeRunner(
      { claimNext: vi.fn(async () => claim), complete, retry: vi.fn(), failPermanent: vi.fn() },
      runtime,
      { generate: vi.fn(), groundWithFacts: vi.fn() },
      { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() },
      { searchText: vi.fn(), searchImage: vi.fn() },
      new FailClosedTagObservationProvider(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true, metaAppId: "app-1" },
    );
    expect(await runner.processOne()).toBe(true);
    expect(runtime.loadOrCreate).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledOnce();
  });

  it("applies the strict READY_STOCK stale-price handoff policy to a product code", () => {
    const facts: BusinessFactEnvelopeV1 = {
      schemaVersion: 1,
      status: "STALE",
      source: "POS_SNAPSHOT",
      observedAt: "2026-07-17T00:00:00.000Z",
      expiresAt: "2026-07-17T02:00:00.000Z",
      productId: "SV695",
      facts: null,
      reasonCode: "CATALOG_SNAPSHOT_STALE",
      policyContext: {
        fulfillmentPolicy: "READY_STOCK",
        canOrderWhenZero: false,
      },
    };
    expect(modelHandoffPermitted("sv695", facts)).toBe(true);
    expect(modelHandoffPermitted("sv695", null)).toBe(false);
    expect(modelHandoffPermitted("sv695 gia bao nhieu", facts)).toBe(true);
  });

  it("silently permits employee handoff when verified product business facts are unavailable", () => {
    const missing: BusinessFactEnvelopeV1 = {
      schemaVersion: 1,
      status: "NOT_FOUND",
      source: "POS_SNAPSHOT",
      observedAt: "2026-07-20T00:00:00.000Z",
      expiresAt: null,
      productId: "CB182",
      facts: null,
      reasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
    };
    const invalid: BusinessFactEnvelopeV1 = {
      ...missing,
      status: "ERROR",
      reasonCode: "CATALOG_SNAPSHOT_INVALID",
    };
    const needsRegion: BusinessFactEnvelopeV1 = {
      ...missing,
      reasonCode: "DELIVERY_REGION_REQUIRED",
    };

    expect(unavailableFactsRequireHandoff(missing)).toBe(true);
    expect(unavailableFactsRequireHandoff(invalid)).toBe(true);
    expect(unavailableFactsRequireHandoff(needsRegion)).toBe(false);
    expect(modelHandoffPermitted("CB182", missing)).toBe(true);
  });

  it("requires silent handoff only for unresolved product-specific requests", () => {
    const unresolved = {
      isEcho: false,
      hasAdsContext: false,
      hasResolvedProduct: false,
      hasClarification: false,
      hasBuyingSignal: false,
    };
    expect(unresolvedProductRequiresHandoff("sv999", unresolved)).toBe(true);
    expect(unresolvedProductRequiresHandoff("mẫu này giá bao nhiêu", unresolved)).toBe(true);
    expect(unresolvedProductRequiresHandoff("chị cần tư vấn mẫu đi làm", {
      ...unresolved,
      hasAdsContext: true,
    })).toBe(true);
    expect(unresolvedProductRequiresHandoff("chốt mẫu này", {
      ...unresolved,
      hasBuyingSignal: true,
    })).toBe(true);

    expect(unresolvedProductRequiresHandoff("chị cần tư vấn mẫu đi làm", unresolved)).toBe(false);
    expect(unresolvedProductRequiresHandoff("sv999", {
      ...unresolved,
      hasResolvedProduct: true,
    })).toBe(false);
    expect(unresolvedProductRequiresHandoff("sv999", {
      ...unresolved,
      hasClarification: true,
    })).toBe(false);
    expect(unresolvedProductRequiresHandoff("sv999", {
      ...unresolved,
      isEcho: true,
    })).toBe(false);
  });

  it("treats a bare product code as the standard price/info-card request", () => {
    expect(productCodeOnly("sv695")).toBe("SV695");
    expect(productCodeOnly("mã sp: sv695")).toBe("SV695");
    expect(productCodeOnly("sv695 giá bao nhiêu")).toBeNull();
    expect(explicitCustomerBusinessIntent("sv695")).toBe("PRICE");
    expect(explicitCustomerBusinessIntent("xin gái sv2447")).toBe("PRICE");
    expect(explicitCustomerBusinessIntent("sv695 giá bao nhiêu")).toBe("PRICE");
    expect(explicitCustomerBusinessIntent("sv695 còn size M không")).toBe("SIZE");
    expect(explicitCustomerBusinessIntent("mẫu này còn hàng không")).toBe("STOCK");
    expect(explicitCustomerBusinessIntent("bao lâu thì nhận hàng")).toBe("ETA");
  });

  it("detects only the legacy unaccented product-info reply", () => {
    expect(isLegacyUnaccentedProductInfoReply([
      "Da 729k a",
      "Size S, M, L, XL",
      "Chi cho em xin chieu cao can nang hoac so do 3 vong em tu van size cho minh nha.",
    ].join("\n"))).toBe(true);
    expect(isLegacyUnaccentedProductInfoReply([
      "Dạ mẫu SV2447 có giá 729k ạ",
      "Size S, M, L, XL",
      "Chị cho em xin chiều cao cân nặng hoặc số đo 3 vòng em tư vấn size cho mình nha.",
    ].join("\n"))).toBe(false);
    expect(isLegacyUnaccentedProductInfoReply([
      "Dạ mẫu SV2447 có giá 729k ạ",
      "Chi cho em xin chieu cao can nang hoac so do 3 vong em tu van size cho minh nha.",
    ].join("\n"))).toBe(true);
  });

  it("extracts all requested business facts in stable order", () => {
    expect(explicitCustomerBusinessIntents(
      "CB182 giá bao nhiêu, còn size M không và bao lâu nhận hàng?",
    )).toEqual(["PRICE", "STOCK", "SIZE", "ETA"]);
  });

  it("answers catalog advisory only from structured fields or an explicit XML clause", () => {
    const product = {
      productId: "CB182",
      parentProductId: "CB182",
      canonicalCode: "CB182",
      aliases: [],
      title: "Set Quỳnh Dao",
      descriptionXml: "Chất liệu: lụa mềm. Thiết kế thanh lịch.",
      colors: ["BE"],
      materials: [],
      silhouettes: ["SUÔNG"],
      occasions: [],
      imageUrls: [],
      images: [],
      catalogVersion: "catalog-v2",
    };
    expect(catalogAdvisoryIntent("mẫu này chất vải gì")).toBe("MATERIALS");
    expect(catalogAdvisoryReply(product, "MATERIALS")).toContain("lụa mềm");
    expect(catalogAdvisoryReply(product, "COLORS")).toContain("BE");
    expect(catalogAdvisoryReply(product, "OCCASIONS")).toContain("đang được cập nhật");
  });

  it("builds the mandatory verified product-info form without calling the model", () => {
    const proposal = verifiedProductInfoProposal(
      {
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
      },
      {
        schemaVersion: 1,
        status: "OK",
        source: "POS_SNAPSHOT",
        observedAt: "2026-07-18T00:00:00.000Z",
        expiresAt: "2026-07-20T00:00:00.000Z",
        productId: "SD398",
        facts: {
          schemaVersion: 1,
          productId: "SD398",
          parentProductId: "SD398",
          offerType: "AO_DAI",
          listPriceVnd: null,
          salePriceVnd: 1199000,
          sizes: ["M", "L", "XL"],
          stockStatus: "IN_STOCK",
          stockQuantity: 3,
          deliveryEta: null,
          fulfillmentPolicy: "PRE_ORDER",
          imageUrls: ["https://cdn.example/sd398.jpg"],
        },
        reasonCode: null,
      },
      [],
    );
    expect(proposal).toMatchObject({
      action: "REPLY",
      productId: "SD398",
      attachments: ["https://cdn.example/sd398.jpg"],
      businessFactQuery: { intent: "PRICE" },
    });
    expect(proposal?.reply).toBe([
      "Áo dài Dao Phụng (mã SD398) hiện có giá 1.199.000đ.",
      "Chất liệu: ren họa tiết hoa chìm phối tơ ống",
      "Form dáng: suông rộng",
      "Size: M, L, XL",
      "",
      "Chị cao và nặng khoảng bao nhiêu để em tư vấn size phù hợp cho mẫu này?",
    ].join("\n"));
  });

  it("advises a verified size immediately when the stored profile is complete", () => {
    const timestamp = "2026-07-31T00:00:00.000Z";
    const product = {
      productId: "SD398",
      parentProductId: "SD398",
      canonicalCode: "SD398",
      aliases: [],
      title: "Áo dài Dao Phụng",
      colors: ["ĐEN"],
      materials: ["REN"],
      silhouettes: ["SUÔNG"],
      occasions: [],
      imageUrls: [],
      images: [],
      catalogVersion: "catalog-v2",
    };
    const profile = {
      schemaVersion: 1,
      profileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      customerKey: {
        namespace: "lana-customer-v1",
        algorithm: "HMAC_SHA256",
        digest: "a".repeat(64),
      },
      revision: 2,
      measurements: [
        {
          kind: "HEIGHT_CM",
          value: 160,
          provenance: {
            source: "CUSTOMER_MESSAGE",
            sourceEventHash: "b".repeat(64),
            observedAt: timestamp,
            confidence: 1,
          },
        },
        {
          kind: "WEIGHT_KG",
          value: 53,
          provenance: {
            source: "CUSTOMER_MESSAGE",
            sourceEventHash: "c".repeat(64),
            observedAt: timestamp,
            confidence: 1,
          },
        },
      ],
      fitPreference: null,
      preferences: { colors: [], styles: [], materials: [] },
      sizeHistory: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    } as CustomerProfileV1;
    const policy = {
      bundle: {
        artifacts: {
          sizeCharts: {
            "ao-dai-dress": {
              chart: {
                schemaVersion: 1,
                reference: {
                  chartId: "ao-dai-dress",
                  version: "1",
                  source: "IMAGE_EXTRACTION",
                  sourceArtifactRef: "https://cdn.example/ao-dai-size.jpg",
                  sourceContentSha256: "d".repeat(64),
                  verificationStatus: "VERIFIED",
                  verifiedByRef: "admin:owner",
                  verifiedAt: timestamp,
                },
                brand: "LANA",
                category: "AO_DAI",
                componentRole: "DRESS",
                boundaryPolicy: "REQUIRE_HUMAN_REVIEW",
                bands: [{
                  size: "M",
                  ranges: [
                    { kind: "HEIGHT_CM", minInclusive: 155, maxInclusive: 168 },
                    { kind: "WEIGHT_KG", minInclusive: 50, maxInclusive: 57 },
                  ],
                  note: null,
                }],
              },
              scope: {
                level: "COMPONENT",
                parentProductIds: ["SD398"],
                categories: ["AO_DAI"],
                componentRole: "DRESS",
                forms: [],
                materials: [],
              },
              sourceMetadata: {
                sourceReference: "https://cdn.example/ao-dai-size.jpg",
              },
            },
          },
        },
      },
    } as unknown as RuntimePolicyResolution;
    const baseProposal = {
      schemaVersion: 1,
      intent: "product_info",
      conversationStage: "PRODUCT_MATCHED",
      productId: "SD398",
      action: "REPLY",
      reply: "Áo dài Dao Phụng hiện có giá 1.199.000đ.",
      attachments: [],
      handoffReason: null,
      businessFactQuery: {
        intent: "PRICE",
        offerType: null,
        color: null,
        size: null,
        deliveryRegion: null,
      },
    } satisfies AgentProposalV1;

    const advised = withProactiveSizeAdvice(
      baseProposal, product, profile, policy, null, new Date(timestamp),
    );
    expect(advised.action).toBe("REPLY");
    expect(advised.reply).toContain("chị hợp váy size M");
    expect(advised.reply).not.toContain("đối chiếu");
    expect(advised.reply).not.toContain("muốn em tư vấn");

    const preservedFacts = withProactiveSizeAdvice(
      { ...baseProposal, reply: "PRICE-VERIFIED; STOCK-VERIFIED; ETA-VERIFIED" },
      product,
      profile,
      policy,
      null,
      new Date(timestamp),
    );
    expect(preservedFacts.reply).toContain("PRICE-VERIFIED");
    expect(preservedFacts.reply).toContain("STOCK-VERIFIED");
    expect(preservedFacts.reply).toContain("ETA-VERIFIED");

    const proofCta = postMediaProofCta({
      ctaPolicy: "POST_MEDIA_CLOSE",
      imageIntent: "DETAIL",
      imageCount: 2,
      salesStage: "FIT_CONSULTING",
      buyingSignal: false,
      factsVerified: true,
      product,
      profile,
      policyResolution: policy,
      now: new Date(timestamp),
    });
    expect(proofCta).toContain(product.productId);
    expect(proofCta).toContain("size M");
    expect(proofCta?.match(/\?/g)).toHaveLength(1);
    expect(postMediaProofCta({ ctaPolicy: "POST_MEDIA_CLOSE", imageIntent: "DETAIL", imageCount: 0, salesStage: "FIT_CONSULTING", buyingSignal: false, factsVerified: true, product, profile, policyResolution: policy, now: new Date(timestamp) })).toBeNull();

    const verifiedBase = {
      ...baseProposal,
      reply: "PRICE-VERIFIED; STOCK-VERIFIED; ETA-VERIFIED",
      attachments: ["https://cdn.example/sd398.jpg"],
    };
    const missingChart = composeSizeEngineAdvice(
      verifiedBase, product, profile, null, null, new Date(timestamp),
    );
    expect(missingChart).toMatchObject({
      requiresHandoff: true,
      reasonCode: "VERIFIED_SIZE_CHART_UNAVAILABLE",
    });
    expect(missingChart.proposal).toEqual(verifiedBase);
    expect(withProactiveSizeAdvice(
      verifiedBase, product, profile, null, null, new Date(timestamp),
    )).toEqual(verifiedBase);
  });

  it("falls back to the verified price-card image when Media Selector V2 returns none", () => {
    const imageUrl = "https://cdn.example/sd395.jpg";
    const product = {
      productId: "SD395", parentProductId: "SD395", canonicalCode: "SD395",
      aliases: [], title: "Áo dài SD395", colors: [], materials: [],
      silhouettes: [], occasions: [], imageUrls: [imageUrl], images: [],
      catalogVersion: "catalog-v2",
    };
    const facts = {
      schemaVersion: 1, status: "OK", source: "POS_SNAPSHOT",
      observedAt: "2026-07-29T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z",
      productId: "SD395",
      facts: {
        schemaVersion: 1, productId: "SD395", parentProductId: "SD395",
        offerType: "DIRECT", listPriceVnd: null, salePriceVnd: 799000,
        sizes: ["M", "L"], stockStatus: "IN_STOCK", stockQuantity: 2,
        deliveryEta: null, fulfillmentPolicy: "READY_STOCK", imageUrls: [imageUrl],
      },
      reasonCode: null,
    } as BusinessFactEnvelopeV1;
    const productFactsV2 = {
      productId: "SD395",
      content: {
        productName: "Áo dài SD395",
        metadata: {
          sourceVersion: "catalog-v2",
          observedAt: "2026-07-29T00:00:00.000Z",
        },
      },
      bom: { components: [] },
      media: {
        assets: [],
        metadata: {
          authority: "QDRANT_STABLE",
          sourceVersion: "catalog-v2",
          observedAt: "2026-07-29T00:00:00.000Z",
          expiresAt: "2026-08-28T00:00:00.000Z",
          freshForSeconds: 2_592_000,
          freshnessState: "FRESH",
        },
      },
    } as unknown as ProductFactsV2;

    expect(
      verifiedProductInfoProposal(product, facts, [], null, productFactsV2)?.attachments,
    ).toEqual([imageUrl]);
    expect(
      verifiedProductInfoProposal(
        product,
        facts,
        [],
        null,
        productFactsV2,
        new Date("2026-07-29T00:00:00.000Z"),
        false,
        true,
      )?.attachments,
    ).toEqual([]);
  });

  it("rehydrates a recognized product before creating TEXT then IMAGE outbox units", async () => {
    const occurredAt = "2026-07-29T02:27:12.000Z";
    const state = createConversationState({
      conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    const pointImageUrl = "https://cdn.example/sd395-point.jpg";
    const catalogImageUrl = "https://cdn.example/sd395-full-look.jpg";
    const vectorProduct = {
      productId: "SD395", parentProductId: "SD395", canonicalCode: "SD395",
      aliases: [], title: "SD395", colors: [], materials: [], silhouettes: [],
      occasions: [], imageUrls: [pointImageUrl], images: [], catalogVersion: "catalog-v2",
    };
    const catalogProduct = {
      ...vectorProduct,
      title: "Áo dài SD395",
      observedAt: occurredAt,
      imageUrls: [
        "https://cdn.example/sd395-front.jpg",
        "https://cdn.example/sd395-side.jpg",
        catalogImageUrl,
      ],
      images: [
        {
          url: "https://cdn.example/sd395-front.jpg",
          role: "PRIMARY" as const,
          angle: "FRONT" as const,
          imageType: "MODEL" as const,
          intents: [],
          partsVisible: ["AO"],
          sortOrder: 0,
          qualityScore: 1,
          feedback: false,
          reviewStatus: "APPROVED" as const,
          metadataVerified: true,
        },
        {
          url: "https://cdn.example/sd395-side.jpg",
          role: "ADDITIONAL" as const,
          angle: "SIDE" as const,
          imageType: "MODEL" as const,
          intents: [],
          partsVisible: ["AO"],
          sortOrder: 1,
          qualityScore: 1,
          feedback: false,
          reviewStatus: "APPROVED" as const,
          metadataVerified: true,
        },
        {
          url: catalogImageUrl,
          role: "ADDITIONAL" as const,
          angle: "FRONT" as const,
          imageType: "MODEL" as const,
          intents: [],
          partsVisible: ["FULL_SET"],
          sortOrder: 2,
          qualityScore: 1,
          feedback: false,
          reviewStatus: "APPROVED" as const,
          metadataVerified: true,
        },
      ],
    };
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
      pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:m-sd395-image",
      conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(occurredAt), receivedAt: new Date(occurredAt),
      receiveSequence: 21, attemptCount: 1,
      leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      envelope: {
        schemaVersion: 1 as const, customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: {
          schemaVersion: 1 as const, traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
          eventKey: "meta:1198992073286645:message:m-sd395-image",
          pageId: "1198992073286645", messageId: "m-sd395-image",
          senderId: "customer-1", conversationId: "meta:v1:customer-hash",
          occurredAt, isEcho: false, appId: null, text: null,
          attachments: [{ type: "image", url: "https://scontent.xx.fbcdn.net/sd395.jpg" }],
        },
      },
    };
    const commit = vi.fn(async () => ({
      stateCommitted: true, metaOutboxCreated: 2, pancakeTagOutboxCreated: false,
      handoffEventCreated: false, sendAuthorized: true, reasonCodes: [],
    }));
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(async () => ({
        conversationId: state.conversationId, pageId: claim.pageId,
        customerHash: claim.conversationHash, stateVersion: 0, state,
        routingOwner: "APP" as const, appSendEnabled: true, killSwitch: false,
      })),
      commit,
      linkProviderConversation: vi.fn(async () => undefined),
    };
    const facts = {
      ready: vi.fn(async () => true),
      resolve: vi.fn(async () => ({
        schemaVersion: 1 as const, status: "OK" as const, source: "POS_SNAPSHOT" as const,
        observedAt: occurredAt, expiresAt: "2099-01-01T00:00:00.000Z", productId: "SD395",
        facts: {
          schemaVersion: 1 as const, productId: "SD395", parentProductId: "SD395",
          offerType: "DIRECT", listPriceVnd: null, salePriceVnd: 799000,
          sizes: ["M", "L"], stockStatus: "IN_STOCK" as const, stockQuantity: 2,
          deliveryEta: null, fulfillmentPolicy: "READY_STOCK", imageUrls: [],
        },
        reasonCode: null,
      })),
      readCatalogSnapshot: vi.fn(async () => ({
        schema_version: 3 as const,
        release_id: "test-release",
        catalog_version: "catalog-v2",
        policy_version: "policy-v1",
        shop_alias: "LANA",
        brand: "lanadesign",
        product_id: "SD395",
        synced_at: occurredAt,
        data_status: "OK",
        fulfillment_policy: {
          tinh_trang: "READY_STOCK",
          can_order_when_zero: false,
          prep_min_days: 0,
          prep_max_days: 1,
          zero_stock_policy: "",
          zero_stock_prep_min_days: null,
          zero_stock_prep_max_days: null,
          eta_valid_until: "",
        },
        selling_rules: {
          allow_mixed_sizes: false,
          allow_component_sale: false,
          source_version: "test-registry",
        },
        shipping_eta: {},
        offers: {
          DIRECT: {
            list_price: null,
            sale_price: 799000,
            price_status: "OK",
            rows: [{
              offer_type: "DIRECT", color: "", size: "M", stock_quantity: 2,
              list_price: null, sale_price: 799000, stock_status: "IN_STOCK",
            }],
          },
        },
      })),
      close: vi.fn(async () => undefined),
    };
    const search: RealtimeProductSearchPort = {
      searchText: vi.fn(async () => ({
        status: "MATCHED" as const, matchKind: "EXACT_CODE" as const,
        score: 1, gap: null, product: catalogProduct,
      })),
      searchImage: vi.fn(),
    };
    const mediaRecognition: RealtimeMediaRecognitionPort = {
      recognize: vi.fn(async () => ({
        status: "MATCHED" as const, product: vectorProduct, score: 0.8167, gap: 0.027,
        candidates: [], reasonCode: "GEMINI_CUTOUT_CONSENSUS",
        telemetry: {
          pipelineVersion: "cutout-first-ai-v1", normalizedImageHash: "a".repeat(64),
          raw: [], cutout: [], rawGap: null, cutoutGap: null, channelsAgree: true,
          cutoutStatus: "OK" as const, cutoutErrorCode: null, aiReason: null,
          aiDecision: "SD395", aiModel: "gemini-3.5-flash-lite",
          aiPromptVersion: "media-rerank-v1", aiLatencyMs: 1, cacheHit: false,
          latencyMs: { normalize: 1, rawSearch: 1, cutout: 1, cutoutSearch: 1, ai: 1, total: 5 },
        },
      })),
    };
    const runner = new RealtimeRunner(
      { claimNext: vi.fn(async () => claim), complete: vi.fn(async () => true), retry: vi.fn(), failPermanent: vi.fn() },
      runtime, { generate: vi.fn(), groundWithFacts: vi.fn() }, facts, search,
      new FailClosedTagObservationProvider(),
      {
        workerId: "worker-1", mode: "LIVE", sendEnabled: true,
        mediaRecognitionEnabled: true,
        mediaRecognitionPageIds: ["1198992073286645"],
        mediaSelectorV2GuardEnabled: true,
      },
      undefined, undefined, undefined, undefined, undefined, mediaRecognition,
    );

    expect(await runner.processOne()).toBe(true);
    expect(search.searchText).toHaveBeenCalledWith("SD395");
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      metaPlan: expect.objectContaining({
        messages: [
          { kind: "TEXT", text: expect.stringContaining("SD395") },
          { kind: "IMAGE", imageUrl: catalogImageUrl },
        ],
      }),
    }), expect.any(Date));
  });

  it("keeps the verified product type when the title only contains type and code", () => {
    const product = {
      productId: "SV695",
      parentProductId: "SV695",
      canonicalCode: "SV695",
      aliases: [],
      title: "SET VÁY SV695",
      descriptionXml: "Thiết kế được may từ lưới cotton thêu 3D tinh xảo. Set có form suông nhẹ.",
      colors: [],
      materials: ["COTTON"],
      silhouettes: ["SUÔNG"],
      occasions: [],
      imageUrls: [],
      images: [],
      catalogVersion: "catalog-v2",
    };
    expect(productDisplayName(product)).toBe("set váy SV695");
    expect(productDescriptionLine(product, true)).toBe(
      "Chất liệu lưới cotton tạo bề mặt thêu nổi tinh xảo. Form suông nhẹ giúp tổng thể mềm mại, thanh thoát.",
    );
  });

  it("routes a product-code request through verified facts and emits the two-bubble product form", async () => {
    const occurredAt = "2026-07-19T02:00:00.000Z";
    const state = createConversationState({
      conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
      pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:m-product-info",
      conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(occurredAt),
      receivedAt: new Date(occurredAt),
      receiveSequence: 12,
      attemptCount: 1,
      leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      envelope: {
        schemaVersion: 1 as const,
        customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: {
          schemaVersion: 1 as const,
          traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
          eventKey: "meta:1198992073286645:message:m-product-info",
          pageId: "1198992073286645",
          messageId: "m-product-info",
          senderId: "customer-1",
          conversationId: "meta:v1:customer-hash",
          occurredAt,
          isEcho: false,
          appId: null,
          text: "xin gái sv695",
          attachments: [],
        },
      },
    };
    const complete = vi.fn(async () => true);
    const commit = vi.fn(async (_input: unknown) => ({
      stateCommitted: true,
      metaOutboxCreated: 2,
      pancakeTagOutboxCreated: false,
      handoffEventCreated: false,
      sendAuthorized: true,
      reasonCodes: [],
    }));
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(async () => ({
        conversationId: state.conversationId,
        pageId: claim.pageId,
        customerHash: claim.conversationHash,
        stateVersion: 0,
        state,
        routingOwner: "APP" as const,
        appSendEnabled: true,
        killSwitch: false,
      })),
      commit,
      linkProviderConversation: vi.fn(async () => undefined),
    };
    const model: RealtimeModelPort = {
      generate: vi.fn(),
      groundWithFacts: vi.fn(),
    };
    const facts = {
      ready: vi.fn(async () => true),
      resolve: vi.fn(async () => ({
        schemaVersion: 1 as const,
        status: "OK" as const,
        source: "POS_SNAPSHOT" as const,
        observedAt: "2026-07-19T00:00:00.000Z",
        expiresAt: "2099-07-20T00:00:00.000Z",
        productId: "SV695",
        facts: {
          schemaVersion: 1 as const,
          productId: "SV695",
          parentProductId: "SV695",
          offerType: "SET_VAY",
          listPriceVnd: null,
          salePriceVnd: 770000,
          sizes: ["M", "L", "XL"],
          stockStatus: "IN_STOCK" as const,
          stockQuantity: 3,
          deliveryEta: null,
          fulfillmentPolicy: "PRE_ORDER",
          imageUrls: [],
        },
        reasonCode: null,
      })),
      close: vi.fn(async () => undefined),
    };
    const imageUrl = "https://cdn.example/sv695.jpg";
    const search: RealtimeProductSearchPort = {
      searchText: vi.fn(async () => ({
        status: "MATCHED" as const,
        matchKind: "EXACT_CODE" as const,
        score: 1,
        gap: null,
        product: {
          productId: "SV695",
          parentProductId: "SV695",
          canonicalCode: "SV695",
          aliases: [],
          title: "Set váy Quỳnh Dao",
          descriptionXml: "Thiết kế được may từ lụa mềm. Set có form chiết eo giúp tổng thể thanh thoát.",
          colors: [],
          materials: ["LỤA"],
          silhouettes: ["CHIẾT EO"],
          occasions: [],
          imageUrls: [imageUrl],
          images: [],
          catalogVersion: "catalog-v2",
        },
      })),
      searchImage: vi.fn(),
    };
    const runner = new RealtimeRunner(
      { claimNext: vi.fn(async () => claim), complete, retry: vi.fn(), failPermanent: vi.fn() },
      runtime,
      model,
      facts,
      search,
      new FailClosedTagObservationProvider(),
      {
        workerId: "worker-1",
        mode: "LIVE",
        sendEnabled: true,
        conversationalMessageFormatEnabled: true,
        messageGroupingV2Enabled: true,
      },
    );

    expect(await runner.processOne()).toBe(true);
    expect(model.generate).not.toHaveBeenCalled();
    expect(model.groundWithFacts).not.toHaveBeenCalled();
    expect(facts.resolve).toHaveBeenCalledWith(expect.objectContaining({ productId: "SV695", intent: "PRICE" }));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      metaPlan: expect.objectContaining({
        messages: [
          {
            kind: "TEXT",
            text: [
              "Set váy Quỳnh Dao (mã SV695) hiện có giá 770.000đ.",
              "Chất liệu: lụa mềm",
              "Form dáng: chiết eo",
              "Size: M, L, XL",
            ].join("\n"),
          },
          { kind: "TEXT", text: "Chị cao và nặng khoảng bao nhiêu để em tư vấn size phù hợp cho mẫu này?" },
          { kind: "IMAGE", imageUrl },
        ],
        imageDelayMs: 500,
      }),
    }), expect.any(Date));
    expect(complete).toHaveBeenCalledOnce();
    const profile: CustomerProfileV1 = {
      schemaVersion: 1,
      profileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      customerKey: {
        namespace: "lana-customer-v1",
        algorithm: "HMAC_SHA256",
        digest: "a".repeat(64),
      },
      revision: 2,
      measurements: [
        {
          kind: "HEIGHT_CM",
          value: 160,
          provenance: {
            source: "CUSTOMER_MESSAGE",
            sourceEventHash: "b".repeat(64),
            observedAt: occurredAt,
            confidence: 1,
          },
        },
        {
          kind: "WEIGHT_KG",
          value: 53,
          provenance: {
            source: "CUSTOMER_MESSAGE",
            sourceEventHash: "c".repeat(64),
            observedAt: occurredAt,
            confidence: 1,
          },
        },
      ],
      fitPreference: null,
      preferences: { colors: [], styles: [], materials: [] },
      sizeHistory: [],
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };
    const profileCommit = vi.fn(async (_input: unknown) => ({
      stateCommitted: true,
      metaOutboxCreated: 2,
      pancakeTagOutboxCreated: true,
      handoffEventCreated: true,
      sendAuthorized: true,
      reasonCodes: [],
    }));
    const profileRuntime = {
      ...runtime,
      commit: profileCommit,
      loadOrCreateCustomerProfile: vi.fn(async () => ({
        pageId: claim.pageId,
        customerHash: claim.conversationHash,
        revision: profile.revision,
        profile,
        fieldEvidence: {},
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      })),
      compareAndSwapCustomerProfile: vi.fn(async () => true),
    } as unknown as RealtimeRuntimePort;
    const profileRunner = new RealtimeRunner(
      {
        claimNext: vi.fn(async () => claim),
        complete,
        retry: vi.fn(),
        failPermanent: vi.fn(),
      },
      profileRuntime,
      model,
      facts,
      search,
      new FailClosedTagObservationProvider(),
      {
        workerId: "worker-1",
        mode: "LIVE",
        sendEnabled: true,
        customerProfileEnabled: true,
        conversationalMessageFormatEnabled: true,
        messageGroupingV2Enabled: true,
      },
    );

    expect(await profileRunner.processOne()).toBe(true);
    const profileCommitInput = profileCommit.mock.calls[0]![0] as {
      metaPlan?: { messages: readonly unknown[] };
      handoffEventPlan?: unknown;
    };
    expect(profileCommitInput.metaPlan?.messages).toEqual([
      {
        kind: "TEXT",
        text: expect.stringContaining(
          "Set váy Quỳnh Dao (mã SV695) hiện có giá 770.000đ.",
        ),
      },
      { kind: "IMAGE", imageUrl },
    ]);
    expect(profileCommitInput.metaPlan?.messages.length).toBeGreaterThan(0);
    expect(profileCommitInput.handoffEventPlan).toBeDefined();
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("silently hands a verified product to an employee when its catalog snapshot is missing", async () => {
    const occurredAt = "2026-07-20T05:00:00.000Z";
    const state = createConversationState({
      conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
      pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:m-cb182",
      conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(occurredAt),
      receivedAt: new Date(occurredAt),
      receiveSequence: 13,
      attemptCount: 1,
      leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      envelope: {
        schemaVersion: 1 as const,
        customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: {
          schemaVersion: 1 as const,
          traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
          eventKey: "meta:1198992073286645:message:m-cb182",
          pageId: "1198992073286645",
          messageId: "m-cb182",
          senderId: "customer-1",
          conversationId: "meta:v1:customer-hash",
          occurredAt,
          isEcho: false,
          appId: null,
          text: "CB182",
          attachments: [],
        },
      },
    };
    const complete = vi.fn(async () => true);
    const commit = vi.fn(async () => ({
      stateCommitted: true,
      metaOutboxCreated: 0,
      pancakeTagOutboxCreated: true,
      handoffEventCreated: true,
      sendAuthorized: false,
      reasonCodes: [],
    }));
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(async () => ({
        conversationId: state.conversationId,
        pageId: claim.pageId,
        customerHash: claim.conversationHash,
        stateVersion: 0,
        state,
        routingOwner: "APP" as const,
        appSendEnabled: true,
        killSwitch: false,
      })),
      commit,
      linkProviderConversation: vi.fn(async () => undefined),
    };
    const model: RealtimeModelPort = {
      generate: vi.fn(),
      groundWithFacts: vi.fn(),
    };
    const facts = {
      ready: vi.fn(async () => true),
      resolve: vi.fn(async () => ({
        schemaVersion: 1 as const,
        status: "NOT_FOUND" as const,
        source: "POS_SNAPSHOT" as const,
        observedAt: occurredAt,
        expiresAt: null,
        productId: "CB182",
        facts: null,
        reasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
      })),
      close: vi.fn(async () => undefined),
    };
    const search: RealtimeProductSearchPort = {
      searchText: vi.fn(async () => ({
        status: "MATCHED" as const,
        matchKind: "EXACT_CODE" as const,
        score: 1,
        gap: null,
        product: {
          productId: "CB182",
          parentProductId: "CB182",
          canonicalCode: "CB182",
          aliases: [],
          title: "Set áo quần Thiên Giao",
          colors: [],
          materials: ["THÔ", "COTTON"],
          silhouettes: ["ÔM"],
          occasions: [],
          imageUrls: ["https://cdn.example/cb182.jpg"],
          images: [],
          catalogVersion: "catalog-v2",
        },
      })),
      searchImage: vi.fn(),
    };
    const runner = new RealtimeRunner(
      { claimNext: vi.fn(async () => claim), complete, retry: vi.fn(), failPermanent: vi.fn() },
      runtime,
      model,
      facts,
      search,
      new FailClosedTagObservationProvider(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true, employeeTagId: "25" },
    );

    expect(await runner.processOne()).toBe(true);
    expect(model.generate).not.toHaveBeenCalled();
    expect(model.groundWithFacts).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      state: expect.objectContaining({ conversationOwner: "HUMAN", ownerReason: "AGENT_HANDOFF" }),
      pancakeTagPlan: expect.objectContaining({ desiredTag: "NHAN_VIEN", tagId: "25" }),
      handoffEventPlan: expect.objectContaining({
        source: "BOT_POLICY",
        reasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
        productId: "CB182",
        factsStatus: "NOT_FOUND",
        factsReasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
        desiredTag: "NHAN_VIEN",
        handoffGeneration: 2,
        triggerEventKey: claim.eventKey,
      }),
    }), expect.any(Date));
    expect(commit).toHaveBeenCalledWith(
      expect.not.objectContaining({ metaPlan: expect.anything() }),
      expect.any(Date),
    );
    expect(complete).toHaveBeenCalledOnce();
  });

  it("uses state.currentProductId for an image follow-up in a later generation", async () => {
    const occurredAt = "2026-07-23T01:02:00.000Z";
    const baseState = createConversationState({
      conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
      routingOwner: "APP",
      now: new Date("2026-07-23T01:00:00.000Z"),
    });
    const state = { ...baseState, currentProductId: "SV695" };
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
      pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:m-detail-follow-up",
      conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(occurredAt), receivedAt: new Date(occurredAt), receiveSequence: 30,
      attemptCount: 1, leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      envelope: {
        schemaVersion: 1 as const, customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: {
          schemaVersion: 1 as const, traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
          eventKey: "meta:1198992073286645:message:m-detail-follow-up", pageId: "1198992073286645",
          messageId: "m-detail-follow-up", senderId: "customer-1", conversationId: "meta:v1:customer-hash",
          occurredAt, isEcho: false, appId: null, text: "xin ảnh cận chất", attachments: [],
        },
      },
    };
    const commit = vi.fn(async () => ({
      stateCommitted: true, metaOutboxCreated: 1, pancakeTagOutboxCreated: false,
      handoffEventCreated: false, sendAuthorized: true, reasonCodes: [],
    }));
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(async () => ({
        conversationId: state.conversationId, pageId: claim.pageId,
        customerHash: claim.conversationHash, stateVersion: state.revision, state,
        routingOwner: "APP" as const, appSendEnabled: true, killSwitch: false,
      })),
      commit,
      linkProviderConversation: vi.fn(async () => undefined),
    };
    const detailUrl = "https://cdn.example/sv695-detail.jpg";
    const product = {
      productId: "SV695", parentProductId: "SV695", canonicalCode: "SV695", aliases: [],
      title: "SV695", colors: [], materials: ["REN"], silhouettes: [], occasions: [],
      imageUrls: [detailUrl],
      images: [{
        url: detailUrl, role: "ADDITIONAL" as const, angle: "CLOSEUP" as const,
        imageType: "DETAIL" as const, intents: [], sortOrder: 1,
        qualityScore: null, feedback: false,
      }],
      catalogVersion: "catalog-v2",
    };
    const searchText = vi.fn(async (value: string) => {
      if (value !== "SV695") return { status: "NOT_FOUND" as const, reasonCode: "NO_CANDIDATES" as const };
      return {
        status: "MATCHED" as const, matchKind: "EXACT_CODE" as const,
        score: 1, gap: null, product,
      };
    });
    const facts = {
      ready: vi.fn(async () => true),
      resolve: vi.fn(async () => ({
        schemaVersion: 1 as const, status: "OK" as const, source: "POS_SNAPSHOT" as const,
        observedAt: occurredAt, expiresAt: "2099-01-01T00:00:00.000Z", productId: "SV695",
        facts: {
          schemaVersion: 1 as const, productId: "SV695", parentProductId: "SV695",
          offerType: "SET", listPriceVnd: null, salePriceVnd: 770000,
          sizes: ["S", "M", "L"], stockStatus: "IN_STOCK" as const, stockQuantity: 3,
          deliveryEta: null, fulfillmentPolicy: "READY_STOCK", imageUrls: [],
        },
        reasonCode: null,
      })),
      close: vi.fn(async () => undefined),
    };
    const model: RealtimeModelPort = { generate: vi.fn(), groundWithFacts: vi.fn() };
    const runner = new RealtimeRunner(
      { claimNext: vi.fn(async () => claim), complete: vi.fn(async () => true), retry: vi.fn(), failPermanent: vi.fn() },
      runtime, model, facts,
      { searchText, searchImage: vi.fn() },
      new FailClosedTagObservationProvider(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true },
    );

    expect(await runner.processOne()).toBe(true);
    expect(searchText).toHaveBeenCalledTimes(1);
    expect(searchText).toHaveBeenCalledWith("SV695");
    expect(model.generate).not.toHaveBeenCalled();
    expect(facts.resolve).toHaveBeenCalledWith(expect.objectContaining({ productId: "SV695" }));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      state: expect.objectContaining({ currentProductId: "SV695" }),
      metaPlan: expect.objectContaining({ messages: [
        { kind: "TEXT", text: expect.any(String) },
        { kind: "IMAGE", imageUrl: detailUrl },
      ] }),
    }), expect.any(Date));
  });

  it("sends one holding reply and Vận Đơn tag for after-sales handoff", async () => {
    const occurredAt = "2026-07-23T02:00:00.000Z";
    const state = createConversationState({
      conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0", pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:m-order-status", conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(occurredAt), receivedAt: new Date(occurredAt), receiveSequence: 31,
      attemptCount: 1, leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      envelope: {
        schemaVersion: 1 as const, customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: {
          schemaVersion: 1 as const, traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
          eventKey: "meta:1198992073286645:message:m-order-status", pageId: "1198992073286645",
          messageId: "m-order-status", senderId: "customer-1", conversationId: "meta:v1:customer-hash",
          occurredAt, isEcho: false, appId: null, text: "vận đơn của chị đang ở đâu", attachments: [],
        },
      },
    };
    const commit = vi.fn(async () => ({
      stateCommitted: true, metaOutboxCreated: 1, pancakeTagOutboxCreated: true,
      handoffEventCreated: true, sendAuthorized: true, reasonCodes: [],
    }));
    const search: RealtimeProductSearchPort = { searchText: vi.fn(), searchImage: vi.fn() };
    const model: RealtimeModelPort = { generate: vi.fn(), groundWithFacts: vi.fn() };
    const runner = new RealtimeRunner(
      { claimNext: vi.fn(async () => claim), complete: vi.fn(async () => true), retry: vi.fn(), failPermanent: vi.fn() },
      {
        loadOrCreate: vi.fn(async () => ({
          conversationId: state.conversationId, pageId: claim.pageId,
          customerHash: claim.conversationHash, stateVersion: 0, state,
          routingOwner: "APP" as const, appSendEnabled: true, killSwitch: false,
        })),
        commit, linkProviderConversation: vi.fn(async () => undefined),
      },
      model, { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() }, search,
      new FailClosedTagObservationProvider(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true, postSaleTagId: "6" },
    );

    expect(await runner.processOne()).toBe(true);
    expect(search.searchText).not.toHaveBeenCalled();
    expect(model.generate).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      state: expect.objectContaining({ conversationOwner: "HUMAN", ownerReason: "POST_SALE" }),
      metaPlan: expect.objectContaining({ messages: [
        { kind: "TEXT", text: AFTER_SALES_HOLDING_REPLY_V2 },
      ] }),
      pancakeTagPlan: expect.objectContaining({ desiredTag: "VAN_DON", tagId: "6" }),
      handoffEventPlan: expect.objectContaining({ source: "POST_SALE", desiredTag: "VAN_DON" }),
    }), expect.any(Date));
  });

  it("answers a pre-sale return-policy question without model, product search or handoff", async () => {
    const occurredAt = "2026-07-23T02:05:00.000Z";
    const state = createConversationState({
      conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0", pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:m-policy", conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(occurredAt), receivedAt: new Date(occurredAt), receiveSequence: 32,
      attemptCount: 1, leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      envelope: {
        schemaVersion: 1 as const, customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: {
          schemaVersion: 1 as const, traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
          eventKey: "meta:1198992073286645:message:m-policy", pageId: "1198992073286645",
          messageId: "m-policy", senderId: "customer-1", conversationId: "meta:v1:customer-hash",
          occurredAt, isEcho: false, appId: null, text: "có được đổi trả không", attachments: [],
        },
      },
    };
    const commit = vi.fn(async () => ({
      stateCommitted: true, metaOutboxCreated: 1, pancakeTagOutboxCreated: false,
      handoffEventCreated: false, sendAuthorized: true, reasonCodes: [],
    }));
    const search: RealtimeProductSearchPort = { searchText: vi.fn(), searchImage: vi.fn() };
    const model: RealtimeModelPort = { generate: vi.fn(), groundWithFacts: vi.fn() };
    const policyResolver = { resolve: vi.fn(async () => ({
      status: "RESOLVED", source: "DATABASE", mayAffectOutbound: true,
      reasonCodes: [], audit: {}, auditWrite: "RECORDED",
      bundle: {
        sideEffects: "LIVE_OUTBOUND",
        bundleHash: `sha256:${"a".repeat(64)}`,
        policy: { policyVersion: "customer-care-v1" },
        artifacts: { shopPolicy: {
          defaultShippingFeeVnd: 30_000,
          deliveryPromiseText: "3-7 hôm hàng tới",
          customerCare: {
            exchange: {
              windowDaysFromReceipt: 15, maxExchangesPerOrder: 1,
              supportedActions: ["SIZE", "COLOR", "MODEL"],
              saleRestriction: { discountThresholdBps: 3_000, allowedActions: ["SIZE", "COLOR"] },
              requiredConditions: { originalTags: true, unused: true, unwashed: true, clean: true, undamaged: true },
              totalTwoWayShippingFeeVnd: 30_000,
              modelExchangePricing: "NEW_PRODUCT_LIST_PRICE_NO_SALE",
              customerPaysPositivePriceDifference: true,
              fulfillmentMethod: "COURIER_SWAP",
            },
            returns: {
              eligibleReasons: ["MANUFACTURING_FABRIC_DEFECT", "MANUFACTURING_SEAM_DEFECT", "WRONG_PRODUCT_SENT"],
              reportingWindowDaysFromReceipt: 5, shopShippingCoveragePercent: 100,
              refundBusinessDaysMin: 1, refundBusinessDaysMax: 3,
              refundStartsAfter: "SHOP_CONFIRMS_ELIGIBLE_ERROR",
            },
            inspection: { tryOnMode: "HOLD_UP_ONLY", refusedParcelShippingFeeVnd: 30_000 },
            marketplacePricing: { shopeePriceMatch: false, reason: "PLATFORM_SUBSIDY_AND_VOUCHERS" },
            customerFaq: {
              discloseLightingAndDisplayColorVariance: true, handWashPreferred: true,
              machineWashAllowedWithLaundryBagAndGentleCycle: true,
            },
          },
        } },
      },
    } as unknown as RuntimePolicyResolution)) };
    const facts = { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() };
    const runner = new RealtimeRunner(
      { claimNext: vi.fn(async () => claim), complete: vi.fn(async () => true), retry: vi.fn(), failPermanent: vi.fn() },
      {
        loadOrCreate: vi.fn(async () => ({
          conversationId: state.conversationId, pageId: claim.pageId,
          customerHash: claim.conversationHash, stateVersion: 0, state,
          routingOwner: "APP" as const, appSendEnabled: true, killSwitch: false,
        })),
        commit, linkProviderConversation: vi.fn(async () => undefined),
      },
      model, facts, search, new FailClosedTagObservationProvider(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true, policyChannel: "PUBLISHED" },
      undefined, undefined, undefined, undefined, policyResolver,
    );

    expect(await runner.processOne()).toBe(true);
    expect(search.searchText).not.toHaveBeenCalled();
    expect(model.generate).not.toHaveBeenCalled();
    expect(facts.resolve).not.toHaveBeenCalled();
    expect(policyResolver.resolve).toHaveBeenCalledWith(expect.not.objectContaining({ pin: expect.anything() }));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      state: expect.objectContaining({ conversationOwner: "BOT" }),
      metaPlan: expect.objectContaining({ messages: [{
        kind: "TEXT",
        text: expect.stringMatching(/15 ngày.*30\.000đ.*5 ngày/su),
      }] }),
    }), expect.any(Date));
    expect(commit).toHaveBeenCalledWith(expect.not.objectContaining({
      pancakeTagPlan: expect.anything(),
      handoffEventPlan: expect.anything(),
    }), expect.any(Date));
  });

  it("handoffs stale explicit facts only for strict ready-stock products", () => {
    const stale = (fulfillmentPolicy: string, canOrderWhenZero: boolean): BusinessFactEnvelopeV1 => ({
      schemaVersion: 1,
      status: "STALE",
      source: "POS_SNAPSHOT",
      observedAt: "2026-07-17T00:00:00.000Z",
      expiresAt: "2026-07-17T02:00:00.000Z",
      productId: "SV695",
      facts: null,
      reasonCode: "CATALOG_SNAPSHOT_STALE",
      policyContext: { fulfillmentPolicy, canOrderWhenZero },
    });
    expect(staleFactsRequireHandoff("sv695", stale("READY_STOCK", false))).toBe(true);
    expect(staleFactsRequireHandoff("sv695 giá bao nhiêu", stale("READY_STOCK", false))).toBe(true);
    expect(staleFactsRequireHandoff("sv695 còn size M không", stale("PRE_ORDER", true))).toBe(false);
  });

  it("derives the Pancake conversation id as page_id_sender_id", () => {
    expect(
      pancakeConversationId(
        "100105662864702",
        "28047528831551494",
      ),
    ).toBe("100105662864702_28047528831551494");
  });

  it("fails open and continues evaluating when Pancake tags are unverified", async () => {
    const now = "2026-07-16T00:00:00.000Z";
    const state = createConversationState({
      conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
      routingOwner: "APP",
      now: new Date(now),
    });
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
      pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:m-1",
      conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(now),
      receivedAt: new Date(now),
      receiveSequence: 1,
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
          eventKey: "meta:1198992073286645:message:m-1",
          pageId: "1198992073286645",
          messageId: "m-1",
          senderId: "customer-1",
          conversationId: "meta:v1:customer-hash",
          occurredAt: now,
          isEcho: false,
          appId: null,
          text: "chị cần tư vấn mẫu đi làm",
          attachments: [],
        },
      },
    };
    const complete = vi.fn(async () => true);
    const inbox: RealtimeInboxPort = {
      claimNext: vi.fn(async () => claim),
      complete,
      retry: vi.fn(async () => true),
      failPermanent: vi.fn(async () => true),
    };
    const commit = vi.fn(async () => ({
      stateCommitted: true,
      metaOutboxCreated: 0,
      pancakeTagOutboxCreated: false,
      handoffEventCreated: false,
      sendAuthorized: false,
      reasonCodes: [],
    }));
    const linkProviderConversation = vi.fn(async () => undefined);
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(async () => ({
        conversationId: state.conversationId,
        pageId: claim.pageId,
        customerHash: claim.conversationHash,
        stateVersion: 0,
        state,
        routingOwner: "APP" as const,
        appSendEnabled: false,
        killSwitch: true,
      })),
      commit,
      linkProviderConversation,
    };
    const model: RealtimeModelPort = {
      generate: vi.fn(async () => ({
        proposal: {
          schemaVersion: 1 as const,
          intent: "tu_van",
          conversationStage: "consulting",
          productId: null,
          action: "REPLY" as const,
          reply: "Dạ em hỗ trợ chị nhé.",
          attachments: [],
          handoffReason: null,
          businessFactQuery: {
            intent: "NONE" as const,
            offerType: null,
            color: null,
            size: null,
            deliveryRegion: null,
          },
        },
        modelVersion: "gemini-test",
        latencyMs: 10,
        tokenUsage: {},
      })),
      groundWithFacts: vi.fn(),
    };
    const facts = {
      ready: vi.fn(async () => true),
      resolve: vi.fn(),
      close: vi.fn(async () => undefined),
    };
    const search: RealtimeProductSearchPort = {
      searchText: vi.fn(async () => ({
        status: "NOT_FOUND" as const,
        reasonCode: "NO_CANDIDATES" as const,
      })),
      searchImage: vi.fn(),
    };
    const runner = new RealtimeRunner(
      inbox,
      runtime,
      model,
      facts,
      search,
      new FailClosedTagObservationProvider(),
      {
        workerId: "worker-1",
        mode: "DRY_RUN",
        sendEnabled: false,
      },
    );

    expect(await runner.processOne()).toBe(true);
    expect(model.generate).toHaveBeenCalledOnce();
    expect(linkProviderConversation).toHaveBeenCalledWith(
      claim.pageId,
      state.conversationId,
      "PANCAKE",
      `${claim.pageId}_${claim.envelope.message.senderId}`,
      expect.any(Date),
      expect.any(Date),
    );
    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          conversationOwner: "BOT",
          tagGateStatus: "UNVERIFIED",
        }),
      }),
      expect.any(Date),
    );
    expect(complete).toHaveBeenCalledOnce();
  });

  it("keeps image order, deduplicates products and sends the compact multi-product reply", async () => {
    const occurredAt = "2026-07-21T02:00:00.000Z";
    const state = createConversationState({
      conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    const makeProduct = (productId: string, material: string) => ({
      productId, parentProductId: productId, canonicalCode: productId, aliases: [],
      title: productId, colors: [], materials: [material], silhouettes: [], occasions: [],
      imageUrls: [], images: [], catalogVersion: "catalog-v2",
    });
    const sv921 = makeProduct("SV921", "REN GẤM");
    const cb182 = makeProduct("CB182", "LỤA MỀM");
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
      pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:m-images",
      conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(occurredAt), receivedAt: new Date(occurredAt), receiveSequence: 20,
      attemptCount: 1, leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      envelope: {
        schemaVersion: 1 as const, customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: {
          schemaVersion: 1 as const, traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
          eventKey: "meta:1198992073286645:message:m-images", pageId: "1198992073286645",
          messageId: "m-images", senderId: "customer-1", conversationId: "meta:v1:customer-hash",
          occurredAt, isEcho: false, appId: null, text: null,
          attachments: [
            { type: "image", url: "https://scontent.xx.fbcdn.net/1.jpg" },
            { type: "image", url: "https://scontent.xx.fbcdn.net/2.jpg" },
            { type: "image", url: "https://scontent.xx.fbcdn.net/3.jpg" },
          ],
        },
      },
    };
    const commit = vi.fn(async () => ({ stateCommitted: true, metaOutboxCreated: 1, pancakeTagOutboxCreated: false, handoffEventCreated: false, sendAuthorized: true, reasonCodes: [] }));
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(async () => ({ conversationId: state.conversationId, pageId: claim.pageId, customerHash: claim.conversationHash, stateVersion: 0, state, routingOwner: "APP" as const, appSendEnabled: true, killSwitch: false })),
      commit,
      linkProviderConversation: vi.fn(async () => undefined),
    };
    const facts = {
      ready: vi.fn(async () => true),
      resolve: vi.fn(async (query: { productId: string }) => ({
        schemaVersion: 1 as const, status: "OK" as const, source: "POS_SNAPSHOT" as const,
        observedAt: occurredAt, expiresAt: "2099-01-01T00:00:00.000Z", productId: query.productId,
        facts: {
          schemaVersion: 1 as const, productId: query.productId, parentProductId: query.productId,
          offerType: "SET", listPriceVnd: null, salePriceVnd: query.productId === "SV921" ? 699000 : 759000,
          sizes: ["S", "M", "L"], stockStatus: "IN_STOCK" as const, stockQuantity: 2,
          deliveryEta: null, fulfillmentPolicy: "READY_STOCK", imageUrls: [],
        },
        reasonCode: null,
      })),
      close: vi.fn(async () => undefined),
    };
    const search: RealtimeProductSearchPort = {
      searchText: vi.fn(),
      searchImage: vi.fn(),
      searchImages: vi.fn(async () => [sv921, cb182, sv921].map((product) => ({
        status: "MATCHED" as const, matchKind: "SEMANTIC" as const, product, score: 0.9, gap: 0.1,
      }))),
    };
    const model: RealtimeModelPort = { generate: vi.fn(), groundWithFacts: vi.fn() };
    const runner = new RealtimeRunner(
      { claimNext: vi.fn(async () => claim), complete: vi.fn(async () => true), retry: vi.fn(), failPermanent: vi.fn() },
      runtime, model, facts, search, new FailClosedTagObservationProvider(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true },
    );
    expect(await runner.processOne()).toBe(true);
    expect(model.generate).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      state: expect.objectContaining({
        productSelections: [
          { label: "SET_1", productId: "SV921" },
          { label: "SET_2", productId: "CB182" },
        ],
      }),
      metaPlan: expect.objectContaining({ messages: [{
        kind: "TEXT",
        text: "Set 1 - SV921 - giá 699k - chất ren gấm\nSet 2 - CB182 - giá 759k - chất lụa mềm\nChị chọn set mình thích và gửi em chiều cao, cân nặng để em tư vấn size phù hợp nhé.",
      }] }),
    }), expect.any(Date));

    const resolvedFacts = [
      await facts.resolve({ productId: "SV921" }),
      await facts.resolve({ productId: "CB182" }),
    ] as BusinessFactEnvelopeV1[];
    const livePolicy = {
      status: "RESOLVED",
      mayAffectOutbound: true,
      bundle: {
        sideEffects: "LIVE_OUTBOUND",
        policy: { multiItemOffer: { minimumProductCount: 2, discountBps: 500 } },
      },
    } as unknown as RuntimePolicyResolution;
    const shadowPolicy = {
      ...livePolicy,
      mayAffectOutbound: false,
      bundle: { ...livePolicy.bundle, sideEffects: "DISABLED" },
    } as unknown as RuntimePolicyResolution;
    expect(multiProductReply([sv921, cb182], resolvedFacts, shadowPolicy)).toBe(
      multiProductReply([sv921, cb182], resolvedFacts),
    );
    expect(multiProductReply([sv921, cb182], resolvedFacts, livePolicy)).toContain(
      "Ưu đãi từ 2 sản phẩm: giảm 5%",
    );
  });

  it("silently hands off a customer text URL before search or model generation", async () => {
    const occurredAt = "2026-07-21T03:00:00.000Z";
    const state = createConversationState({ conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5", routingOwner: "APP", now: new Date(occurredAt) });
    const claim = {
      inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0", pageId: "1198992073286645",
      eventKey: "meta:1198992073286645:message:m-url", conversationHash: "meta:v1:customer-hash",
      occurredAt: new Date(occurredAt), receivedAt: new Date(occurredAt), receiveSequence: 21,
      attemptCount: 1, leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      envelope: {
        schemaVersion: 1 as const, customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: {
          schemaVersion: 1 as const, traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2", eventKey: "meta:1198992073286645:message:m-url",
          pageId: "1198992073286645", messageId: "m-url", senderId: "customer-1", conversationId: "meta:v1:customer-hash",
          occurredAt, isEcho: false, appId: null, text: "xem giúp https://example.com/a.jpg", attachments: [],
        },
      },
    };
    const commit = vi.fn(async () => ({ stateCommitted: true, metaOutboxCreated: 0, pancakeTagOutboxCreated: true, handoffEventCreated: true, sendAuthorized: false, reasonCodes: [] }));
    const search: RealtimeProductSearchPort = { searchText: vi.fn(), searchImage: vi.fn() };
    const model: RealtimeModelPort = { generate: vi.fn(), groundWithFacts: vi.fn() };
    const runner = new RealtimeRunner(
      { claimNext: vi.fn(async () => claim), complete: vi.fn(async () => true), retry: vi.fn(), failPermanent: vi.fn() },
      {
        loadOrCreate: vi.fn(async () => ({ conversationId: state.conversationId, pageId: claim.pageId, customerHash: claim.conversationHash, stateVersion: 0, state, routingOwner: "APP" as const, appSendEnabled: true, killSwitch: false })),
        commit, linkProviderConversation: vi.fn(async () => undefined),
      },
      model, { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() }, search,
      new FailClosedTagObservationProvider(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true, employeeTagId: "25" },
    );
    expect(await runner.processOne()).toBe(true);
    expect(search.searchText).not.toHaveBeenCalled();
    expect(model.generate).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      pancakeTagPlan: expect.objectContaining({ desiredTag: "NHAN_VIEN", tagId: "25" }),
    }), expect.any(Date));
    expect(commit).toHaveBeenCalledWith(expect.not.objectContaining({ metaPlan: expect.anything() }), expect.any(Date));
  });
});

describe("RealtimeRunner inbound batching", () => {
  const occurredAt = "2026-07-22T02:00:00.000Z";
  const pageId = "1198992073286645";
  const conversationHash = "meta:v1:customer-burst";
  const conversationId = "43820fd4-daa7-4917-9835-a38cb55120e5";

  function item(sequence: number, text: string) {
    const messageId = `m-burst-${sequence}`;
    return {
      inboxId: `2a9afc47-978a-4b74-9653-3c89e75a8${String(sequence).padStart(3, "0")}`,
      pageId,
      eventKey: `meta:${pageId}:message:${messageId}`,
      conversationHash,
      occurredAt: new Date(new Date(occurredAt).getTime() + sequence * 1_000),
      receivedAt: new Date(new Date(occurredAt).getTime() + sequence * 1_000),
      receiveSequence: sequence,
      attemptCount: 1,
      leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
      eventKind: "CUSTOMER" as const,
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
          traceId: `3021af34-c98c-4086-a33c-3ecb2ad8f${String(sequence).padStart(3, "0")}`,
          eventKey: `meta:${pageId}:message:${messageId}`,
          pageId,
          messageId,
          senderId: "customer-1",
          conversationId: conversationHash,
          occurredAt: new Date(new Date(occurredAt).getTime() + sequence * 1_000).toISOString(),
          isEcho: false,
          appId: null,
          text,
          attachments: [],
        },
      },
    };
  }

  function clearTagObservation() {
    return {
      observe: vi.fn(async ({ now }: { now: Date }) => ({
        schemaVersion: 1 as const,
        verified: true,
        blockingTag: null,
        observedTagIds: [],
        observedAt: now.toISOString(),
        reasonCode: null,
      })),
    };
  }

  function replyModel(): RealtimeModelPort {
    return {
      generate: vi.fn(async () => ({
        proposal: {
          schemaVersion: 1 as const,
          intent: "tu_van",
          conversationStage: "consulting",
          productId: null,
          action: "REPLY" as const,
          reply: "Em đang hỗ trợ chị đây ạ.",
          attachments: [],
          handoffReason: null,
          businessFactQuery: {
            intent: "NONE" as const,
            offerType: null,
            color: null,
            size: null,
            deliveryRegion: null,
          },
        },
        modelVersion: "gemini-test",
        latencyMs: 10,
        tokenUsage: {},
      })),
      groundWithFacts: vi.fn(),
    };
  }

  it("uses one product/tool/model decision and one reply plan for a three-message burst", async () => {
    const middle = item(32, "em muốn hỏi");
    const items = [
      item(31, "chị ơi"),
      {
        ...middle,
        envelope: {
          ...middle.envelope,
          message: { ...middle.envelope.message, messageId: null },
        },
      },
      item(33, "mẫu nào đẹp"),
    ];
    const batch = {
      pageId,
      conversationHash,
      generation: 9,
      leaseToken: items[0]!.leaseToken,
      inboxIds: items.map((entry) => entry.inboxId),
      evaluationGroupId: "2ef98143-670c-4f46-8452-a51d396bea90",
      eventKind: "CUSTOMER" as const,
      firstReceiveSequence: 31,
      lastReceiveSequence: 33,
      attemptCount: 1,
      items,
    };
    const completeBatch = vi.fn(async () => true);
    const inbox: RealtimeInboxPort = {
      claimNext: vi.fn(async () => null),
      claimNextBatch: vi.fn(async () => batch),
      complete: vi.fn(async () => true),
      completeBatch,
      isBatchCurrent: vi.fn(async () => true),
      retry: vi.fn(async () => true),
      retryBatch: vi.fn(async () => true),
      failPermanent: vi.fn(async () => true),
      failBatchPermanent: vi.fn(async () => true),
    };
    const state = createConversationState({
      conversationId,
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    const commit = vi.fn(async (_input: unknown) => ({
      stateCommitted: true,
      metaOutboxCreated: 1,
      pancakeTagOutboxCreated: false,
      handoffEventCreated: false,
      sendAuthorized: true,
      reasonCodes: [],
      inboxBatchStatus: "COMMITTED" as const,
    }));
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(async () => ({
        conversationId,
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
    const model = replyModel();
    const search: RealtimeProductSearchPort = {
      searchText: vi.fn(async () => ({
        status: "NOT_FOUND" as const,
        reasonCode: "NO_CANDIDATES" as const,
      })),
      searchImage: vi.fn(),
    };
    const recordInboundCustomerMessage = vi.fn(async (input: { providerMessageId: string; enqueueShadowEvaluation?: boolean }) => ({
      messagePk: `pk-${input.providerMessageId}`,
    }));
    const retryProjection = items.map((entry) => ({
      direction: "INBOUND" as const,
      senderType: "CUSTOMER" as const,
      messageType: "TEXT" as const,
      text: entry.envelope.message.text ?? "",
      attachmentCount: 0,
      occurredAt: entry.envelope.message.occurredAt,
    }));
    const history = {
      ready: vi.fn(async () => true),
      load: vi.fn(async () => retryProjection),
      append: vi.fn(async () => false),
      close: vi.fn(async () => undefined),
    };
    const runner = new RealtimeRunner(
      inbox,
      runtime,
      model,
      { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() },
      search,
      clearTagObservation(),
      {
        workerId: "worker-1",
        mode: "LIVE",
        sendEnabled: true,
        recordedReplayCaptureEnabled: true,
        recordedReplayPageId: pageId,
      },
      undefined,
      history,
      {
        recordInboundCustomerMessage,
        recordOutboundHumanMessage: vi.fn(),
      },
    );

    expect(await runner.processOne()).toBe(true);
    expect(search.searchText).toHaveBeenCalledOnce();
    expect(search.searchText).toHaveBeenCalledWith("chị ơi\nem muốn hỏi\nmẫu nào đẹp");
    expect(model.generate).toHaveBeenCalledOnce();
    const modelContext = vi.mocked(model.generate).mock.calls[0]![0];
    expect(modelContext.filter((entry) => entry.senderType === "CUSTOMER").map((entry) => entry.text))
      .toEqual(["chị ơi", "em muốn hỏi", "mẫu nào đẹp"]);
    expect(recordInboundCustomerMessage).toHaveBeenCalledTimes(3);
    expect(recordInboundCustomerMessage).toHaveBeenCalledWith(expect.objectContaining({
      providerMessageId: `event:${middle.envelope.message.eventKey}`,
    }));
    expect(
      recordInboundCustomerMessage.mock.calls.map(
        ([input]) => input.enqueueShadowEvaluation,
      ),
    ).toEqual([false, false, true]);
    expect(history.append).toHaveBeenCalledTimes(3);
    expect(commit).toHaveBeenCalledOnce();
    const commitInput = commit.mock.calls[0]![0] as {
      inboxBatchGuard?: unknown;
      metaPlan?: {
        messages: readonly unknown[];
        replyPlanId: string;
        responseGroupId: string;
      };
    };
    expect(commitInput.inboxBatchGuard).toEqual({
      generation: 9,
      leaseToken: batch.leaseToken,
      inboxIds: batch.inboxIds,
    });
    expect(commitInput.metaPlan?.messages).toEqual([
      { kind: "TEXT", text: "Em đang hỗ trợ chị đây ạ." },
    ]);
    expect(commitInput.metaPlan?.replyPlanId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(commitInput.metaPlan?.responseGroupId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(completeBatch).not.toHaveBeenCalled();
    expect(inbox.complete).not.toHaveBeenCalled();
  });

  it("does not separately complete a batch whose atomic commit is superseded", async () => {
    const items = [item(41, "chị cần tư vấn"), item(42, "mẫu nào hợp đi làm")];
    const batch = {
      pageId,
      conversationHash,
      generation: 12,
      leaseToken: items[0]!.leaseToken,
      inboxIds: items.map((entry) => entry.inboxId),
      evaluationGroupId: "1cd35b4d-ea85-4580-9958-cf65af0ec781",
      eventKind: "CUSTOMER" as const,
      firstReceiveSequence: 41,
      lastReceiveSequence: 42,
      attemptCount: 1,
      items,
    };
    const completeBatch = vi.fn(async () => true);
    const retryBatch = vi.fn(async () => true);
    const inbox: RealtimeInboxPort = {
      claimNext: vi.fn(async () => null),
      claimNextBatch: vi.fn(async () => batch),
      complete: vi.fn(async () => true),
      completeBatch,
      isBatchCurrent: vi.fn(async () => true),
      retry: vi.fn(async () => true),
      retryBatch,
      failPermanent: vi.fn(async () => true),
      failBatchPermanent: vi.fn(async () => true),
    };
    const state = createConversationState({ conversationId, routingOwner: "APP", now: new Date(occurredAt) });
    const commit = vi.fn(async (_input: unknown) => ({
      stateCommitted: false,
      metaOutboxCreated: 0,
      pancakeTagOutboxCreated: false,
      handoffEventCreated: false,
      sendAuthorized: false,
      reasonCodes: ["INBOX_BATCH_SUPERSEDED"],
      inboxBatchStatus: "SUPERSEDED" as const,
    }));
    const model = replyModel();
    const runner = new RealtimeRunner(
      inbox,
      {
        loadOrCreate: vi.fn(async () => ({
          conversationId, pageId, customerHash: conversationHash,
          stateVersion: 0, state, routingOwner: "APP" as const,
          appSendEnabled: true, killSwitch: false,
        })),
        commit,
        linkProviderConversation: vi.fn(async () => undefined),
      },
      model,
      { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() },
      {
        searchText: vi.fn(async () => ({ status: "NOT_FOUND" as const, reasonCode: "NO_CANDIDATES" as const })),
        searchImage: vi.fn(),
      },
      clearTagObservation(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true },
    );

    expect(await runner.processOne()).toBe(true);
    expect(model.generate).toHaveBeenCalledOnce();
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      inboxBatchGuard: {
        generation: 12,
        leaseToken: batch.leaseToken,
        inboxIds: batch.inboxIds,
      },
      metaPlan: expect.anything(),
    }), expect.any(Date));
    expect(completeBatch).not.toHaveBeenCalled();
    expect(retryBatch).not.toHaveBeenCalled();
    expect(inbox.complete).not.toHaveBeenCalled();
  });

  it("drains an old customer batch with guarded inbox-only completion after a newer page echo", async () => {
    const oldItem = item(40, "tin khách cũ");
    const batch = {
      pageId,
      conversationHash,
      generation: 14,
      leaseToken: oldItem.leaseToken,
      inboxIds: [oldItem.inboxId],
      evaluationGroupId: "b74ce919-fe79-449c-aeb2-da14e81b0b7d",
      eventKind: "CUSTOMER" as const,
      firstReceiveSequence: 40,
      lastReceiveSequence: 40,
      attemptCount: 1,
      items: [oldItem],
    };
    const completeBatch = vi.fn(async () => true);
    const inbox: RealtimeInboxPort = {
      claimNext: vi.fn(async () => null),
      claimNextBatch: vi.fn(async () => batch),
      complete: vi.fn(async () => true),
      completeBatch,
      isBatchCurrent: vi.fn(async () => true),
      retry: vi.fn(async () => true),
      retryBatch: vi.fn(async () => true),
      failPermanent: vi.fn(async () => true),
      failBatchPermanent: vi.fn(async () => true),
    };
    const initial = createConversationState({ conversationId, routingOwner: "APP", now: new Date(occurredAt) });
    const state = {
      ...initial,
      revision: 1,
      lastFence: 50,
      lastEvent: {
        eventKey: `meta:${pageId}:message:m-page-echo-50`,
        occurredAt: "2026-07-22T03:00:00.000Z",
        receiveSequence: 50,
      },
    };
    const commit = vi.fn();
    const model = replyModel();
    const runner = new RealtimeRunner(
      inbox,
      {
        loadOrCreate: vi.fn(async () => ({
          conversationId, pageId, customerHash: conversationHash,
          stateVersion: 1, state, routingOwner: "APP" as const,
          appSendEnabled: true, killSwitch: false,
        })),
        commit,
        linkProviderConversation: vi.fn(async () => undefined),
      },
      model,
      { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() },
      {
        searchText: vi.fn(async () => ({ status: "NOT_FOUND" as const, reasonCode: "NO_CANDIDATES" as const })),
        searchImage: vi.fn(),
      },
      clearTagObservation(),
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true },
    );

    expect(await runner.processOne()).toBe(true);
    expect(model.generate).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(completeBatch).toHaveBeenCalledWith({
      pageId,
      conversationHash,
      generation: 14,
      leaseToken: batch.leaseToken,
      inboxIds: batch.inboxIds,
    }, true);
    expect(inbox.retryBatch).not.toHaveBeenCalled();
  });
});

describe("explicitCustomerImageIntent", () => {
  it("nhận ra khách xin ảnh feedback kể cả khi nhắn cộc lốc", () => {
    for (const text of ["cho xin ảnh feedback", "có feedback k", "ảnh khách mặc", "shop có fb ko"]) {
      expect(explicitCustomerImageIntent(text)).toBe("FEEDBACK");
    }
  });

  it("phân biệt được các loại ảnh cụ thể", () => {
    expect(explicitCustomerImageIntent("cho xem bảng size với")).toBe("SIZE_GUIDE");
    expect(explicitCustomerImageIntent("cho xin ảnh mặt sau")).toBe("BACK");
    expect(explicitCustomerImageIntent("cho xem ảnh chất liệu")).toBe("DETAIL");
    expect(explicitCustomerImageIntent("cho xin ảnh cận chất")).toBe("DETAIL");
    expect(explicitCustomerImageIntent("xin ảnh cận vải")).toBe("DETAIL");
    expect(explicitCustomerImageIntent("cho xin ảnh không người mẫu")).toBe("PRODUCT_ONLY");
  });

  it("trả GENERIC khi khách xin ảnh mà không nói loại", () => {
    expect(explicitCustomerImageIntent("cho xin thêm ảnh")).toBe("GENERIC");
  });

  it("nhận ra loại ảnh cả khi khách nhắn gọn không có động từ xin", () => {
    expect(explicitCustomerImageIntent("ảnh chất liệu")).toBe("DETAIL");
    expect(explicitCustomerImageIntent("ảnh mặt sau")).toBe("BACK");
  });

  it("không coi câu khen ảnh là yêu cầu gửi ảnh", () => {
    expect(explicitCustomerImageIntent("ảnh này đẹp quá")).toBeNull();
  });

  // Không được nhận nhầm: câu hỏi giá/size vẫn phải đi luồng báo giá.
  it("không nhận nhầm câu hỏi giá, size hay mã sản phẩm thành xin ảnh", () => {
    for (const text of ["sd396", "giá bao nhiêu", "áo này size nào", "còn hàng không"]) {
      expect(explicitCustomerImageIntent(text)).toBeNull();
    }
  });
});

describe("policy question versus after-sales routing", () => {
  it.each([
    "có được đổi trả không",
    "shop có hỗ trợ đổi size không",
    "chính sách đổi trả thế nào",
    "phí ship bao nhiêu",
    "giao hàng bao lâu",
  ])("keeps a pre-sale policy question out of Vận Đơn: %s", (text) => {
    expect(isPreSalePolicyQuestion(text)).toBe(true);
    expect(isPostSaleRequest(text)).toBe(false);
  });

  it.each([
    "cho chị đổi size",
    "chị đã nhận hàng và muốn đổi size",
    "vận đơn của chị đang ở đâu",
    "đơn hàng của chị chưa giao",
  ])("routes an actual after-sales request to Vận Đơn: %s", (text) => {
    expect(isPreSalePolicyQuestion(text)).toBe(false);
    expect(isPostSaleRequest(text)).toBe(true);
  });
});
