import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import {
  explicitCustomerBusinessIntent,
  explicitCustomerImageIntent,
  FailClosedTagObservationProvider,
  modelHandoffPermitted,
  multiProductReply,
  pancakeConversationId,
  productCodeOnly,
  RealtimeRunner,
  staleFactsRequireHandoff,
  unavailableFactsRequireHandoff,
  verifiedProductInfoProposal,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
} from "./realtime-runner.js";
import type { BusinessFactEnvelopeV1 } from "@lana/contracts";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";

describe("RealtimeRunner", () => {
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

  it("treats a bare product code as the standard price/info-card request", () => {
    expect(productCodeOnly("sv695")).toBe("SV695");
    expect(productCodeOnly("mã sp: sv695")).toBe("SV695");
    expect(productCodeOnly("sv695 giá bao nhiêu")).toBeNull();
    expect(explicitCustomerBusinessIntent("sv695")).toBe("PRICE");
    expect(explicitCustomerBusinessIntent("sv695 giá bao nhiêu")).toBe("PRICE");
    expect(explicitCustomerBusinessIntent("sv695 còn size M không")).toBe("SIZE");
    expect(explicitCustomerBusinessIntent("mẫu này còn hàng không")).toBe("STOCK");
    expect(explicitCustomerBusinessIntent("bao lâu thì nhận hàng")).toBe("ETA");
  });

  it("builds the mandatory verified product-info form without calling the model", () => {
    const proposal = verifiedProductInfoProposal(
      {
        productId: "SV695",
        parentProductId: "SV695",
        canonicalCode: "SV695",
        aliases: [],
        title: "Set váy Quỳnh Dao",
        colors: ["ĐEN"],
        materials: ["LỤA"],
        silhouettes: ["CHIẾT EO"],
        occasions: [],
        imageUrls: ["https://cdn.example/sv695.jpg"],
        images: [],
        catalogVersion: "catalog-v2",
      },
      {
        schemaVersion: 1,
        status: "OK",
        source: "POS_SNAPSHOT",
        observedAt: "2026-07-18T00:00:00.000Z",
        expiresAt: "2026-07-20T00:00:00.000Z",
        productId: "SV695",
        facts: {
          schemaVersion: 1,
          productId: "SV695",
          parentProductId: "SV695",
          offerType: "SET_VAY",
          listPriceVnd: null,
          salePriceVnd: 770000,
          sizes: ["M", "L", "XL"],
          stockStatus: "IN_STOCK",
          stockQuantity: 3,
          deliveryEta: null,
          fulfillmentPolicy: "PRE_ORDER",
          imageUrls: ["https://cdn.example/sv695.jpg"],
        },
        reasonCode: null,
      },
      [],
    );
    expect(proposal).toMatchObject({
      action: "REPLY",
      productId: "SV695",
      attachments: ["https://cdn.example/sv695.jpg"],
      businessFactQuery: { intent: "PRICE" },
    });
    expect(proposal?.reply).toBe([
      "Dạ mẫu SV695 giá 770k ạ",
      "Thiết kế dáng chiết eo chuẩn form trên nền chất liệu lụa, mặc lên thanh lịch và tôn dáng.",
      "Size M, L, XL",
      "Chị cho em xin chiều cao cân nặng hoặc số đo 3 vòng em tư vấn size cho mình nha.",
    ].join("\n"));
  });

  it("routes a bare product code through verified facts and emits image plus fixed form", async () => {
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
          text: "sv695",
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
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true },
    );

    expect(await runner.processOne()).toBe(true);
    expect(model.generate).not.toHaveBeenCalled();
    expect(model.groundWithFacts).not.toHaveBeenCalled();
    expect(facts.resolve).toHaveBeenCalledWith(expect.objectContaining({ productId: "SV695", intent: "PRICE" }));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      metaPlan: expect.objectContaining({
        messages: [
          { kind: "IMAGE", imageUrl },
          { kind: "TEXT", text: expect.stringContaining("Dạ mẫu SV695 giá 770k ạ") },
        ],
      }),
    }), expect.any(Date));
    expect(complete).toHaveBeenCalledOnce();
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
          text: "mẫu này còn không",
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
        text: "Set 1 - SV921 - giá 699k - chất ren gấm\nSet 2 - CB182 - giá 759k - chất lụa mềm\nC thích set nào và cho em xin chiều cao, cân nặng hoặc số đo để tư vấn size nha.",
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
    const recordInboundCustomerMessage = vi.fn(async (input: { providerMessageId: string }) => ({
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
      { workerId: "worker-1", mode: "LIVE", sendEnabled: true },
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
