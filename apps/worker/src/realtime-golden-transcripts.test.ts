import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import type { AgentProposalV1 } from "@lana/contracts";
import type { GroundedReplyDraftV1 } from "@lana/contracts";
import type { RealtimeCommitInput } from "@lana/database";
import {
  FailClosedTagObservationProvider,
  RealtimeRunner,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
} from "./realtime-runner.js";

const occurredAt = "2026-07-23T08:00:00.000Z";
const product = {
  productId: "CB182",
  parentProductId: "CB182",
  canonicalCode: "CB182",
  aliases: [],
  title: "Set váy CB182",
  descriptionXml: "Thiết kế thanh lịch trên nền vải mềm.",
  colors: ["BE"],
  materials: ["GẤM"],
  silhouettes: ["SUÔNG"],
  occasions: ["CÔNG SỞ"],
  imageUrls: ["https://cdn.example/cb182.jpg"],
  images: [],
  catalogVersion: "catalog-v2",
} as const;

const noReplyProposal: AgentProposalV1 = {
  schemaVersion: 1,
  intent: "conversation_end",
  conversationStage: "consulting",
  productId: null,
  action: "NO_REPLY",
  reply: "",
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

async function replayGolden(input: {
  fixtureId: string;
  text: string;
  productMatched: boolean;
  modelProposal?: AgentProposalV1;
  currentProductId?: string;
  groundedDraft?: GroundedReplyDraftV1;
  groundedDraftError?: boolean;
}) {
  const conversationId = "43820fd4-daa7-4917-9835-a38cb55120e5";
  const initialState = createConversationState({
    conversationId,
    routingOwner: "APP",
    now: new Date(occurredAt),
  });
  const state = input.currentProductId
    ? { ...initialState, currentProductId: input.currentProductId }
    : initialState;
  const eventKey = `golden:${input.fixtureId}`;
  const claim = {
    inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
    pageId: "1198992073286645",
    eventKey,
    conversationHash: "meta:v1:" + "a".repeat(32),
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: 1,
    attemptCount: 0,
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
        eventKey,
        pageId: "1198992073286645",
        messageId: `mid-${input.fixtureId}`,
        senderId: "customer-fixture",
        conversationId: "meta:v1:" + "a".repeat(32),
        occurredAt,
        isEcho: false,
        appId: null,
        text: input.text,
        attachments: [],
      },
    },
  };
  let committed: RealtimeCommitInput<unknown> | null = null;
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn(async () => ({
      conversationId,
      pageId: claim.pageId,
      customerHash: claim.conversationHash,
      stateVersion: 0,
      state,
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    })),
    commit: vi.fn(async (commitInput) => {
      committed = commitInput;
      return {
        stateCommitted: true,
        metaOutboxCreated: commitInput.metaPlan?.messages.length ?? 0,
        pancakeTagOutboxCreated: false,
        handoffEventCreated: false,
        sendAuthorized: true,
        reasonCodes: [],
      };
    }),
    linkProviderConversation: vi.fn(async () => undefined),
  };
  const model: RealtimeModelPort = {
    generate: vi.fn(async () => ({
      proposal: input.modelProposal ?? noReplyProposal,
      modelVersion: "gemini-golden",
      latencyMs: 1,
      tokenUsage: {},
    })),
    groundWithFacts: vi.fn(),
    groundDraftWithFacts: vi.fn(async () => {
      if (input.groundedDraftError) throw new Error("GROUNDED_SCHEMA_INVALID");
      return {
        draft: input.groundedDraft ?? {
          schemaVersion: 1,
          advisoryText: "",
          objectionResponse: "",
          suggestedQuestion: "",
          suggestedNextStep: "",
          attachmentImageIndices: [],
        },
        modelVersion: "gemini-grounded-golden",
        latencyMs: 1,
        tokenUsage: {},
      };
    }),
  };
  const search: RealtimeProductSearchPort = {
    searchText: vi.fn(async () => input.productMatched
      ? { status: "MATCHED" as const, matchKind: "EXACT_CODE" as const, score: 1, gap: null, product }
      : { status: "NOT_FOUND" as const, reasonCode: "NO_CANDIDATES" as const }),
    searchImage: vi.fn(),
  };
  const facts = {
    ready: vi.fn(async () => true),
    resolve: vi.fn(async () => ({
      schemaVersion: 1 as const,
      status: "OK" as const,
      source: "POS_SNAPSHOT" as const,
      observedAt: occurredAt,
      expiresAt: "2099-07-23T08:00:00.000Z",
      productId: "CB182",
      facts: {
        schemaVersion: 1 as const,
        productId: "CB182",
        parentProductId: "CB182",
        offerType: "SET_VAY",
        listPriceVnd: null,
        salePriceVnd: 699_000,
        sizes: ["S", "M", "L"],
        stockStatus: "IN_STOCK" as const,
        stockQuantity: 3,
        deliveryEta: null,
        fulfillmentPolicy: "READY_STOCK",
        imageUrls: [],
      },
      reasonCode: null,
    })),
    close: vi.fn(async () => undefined),
  };
  const runner = new RealtimeRunner(
    {
      claimNext: vi.fn(async () => claim),
      complete: vi.fn(async () => true),
      retry: vi.fn(async () => true),
      failPermanent: vi.fn(async () => true),
    },
    runtime,
    model,
    facts,
    search,
    new FailClosedTagObservationProvider(),
    {
      workerId: "golden-worker",
      mode: "LIVE",
      sendEnabled: true,
      releaseId: "wave0-golden",
      decisionTelemetryEnabled: true,
      buyingSignalGuardEnabled: true,
      messageGroupingV2Enabled: true,
      groundedDraftEnabled:
        input.groundedDraft !== undefined || input.groundedDraftError === true,
      verifiedFactAssemblerEnabled:
        input.groundedDraft !== undefined || input.groundedDraftError === true,
    },
  );

  await runner.processOne();
  return { committed: committed as RealtimeCommitInput<unknown> | null, model, facts };
}

describe("realtime golden transcripts", () => {
  it("GOLDEN-PRODUCT-PRICE-001 sends verified text before image and emits decision telemetry", async () => {
    const { committed, model } = await replayGolden({
      fixtureId: "GOLDEN-PRODUCT-PRICE-001",
      text: "CB182",
      productMatched: true,
    });

    expect(model.generate).not.toHaveBeenCalled();
    expect(committed?.metaPlan?.messages).toEqual([
      {
        kind: "TEXT",
        text: [
          "Set váy CB182 hiện có giá 699.000đ chị nhé.",
          "Chất liệu: gấm",
          "Form dáng: suông",
          "Size: S, M, L",
        ].join("\n"),
      },
      {
        kind: "TEXT",
        text: "Chị gửi em chiều cao và cân nặng, em tư vấn size phù hợp cho chị nhé.",
      },
      { kind: "IMAGE", imageUrl: "https://cdn.example/cb182.jpg" },
    ]);
    expect(committed?.decisionEvents?.map((event) => event.eventType)).toEqual([
      "PRODUCT_RESOLVED",
      "PRODUCT_MATCHED",
      "PRICE_CARD_SENT",
    ]);
    const replay = await replayGolden({
      fixtureId: "GOLDEN-PRODUCT-PRICE-001",
      text: "CB182",
      productMatched: true,
    });
    expect(replay.committed?.decisionEvents?.map((event) => event.eventId)).toEqual(
      committed?.decisionEvents?.map((event) => event.eventId),
    );
  });

  it("GOLDEN-BUYING-NOREPLY-001 silently hands off an unresolved buying signal", async () => {
    const { committed, model } = await replayGolden({
      fixtureId: "GOLDEN-BUYING-NOREPLY-001",
      text: "Chốt mẫu này",
      productMatched: false,
      modelProposal: noReplyProposal,
    });

    expect(model.generate).not.toHaveBeenCalled();
    expect(committed?.metaPlan).toBeUndefined();
    expect(committed?.state).toMatchObject({
      conversationOwner: "HUMAN",
      ownerReason: "AGENT_HANDOFF",
    });
    expect(committed?.handoffEventPlan).toMatchObject({
      source: "BOT_POLICY",
      reasonCode: "UNVERIFIED_PRODUCT_ID",
    });
    expect(committed?.decisionEvents?.map((event) => event.eventType)).toContain(
      "BUYING_SIGNAL_DETECTED",
    );
    expect(committed?.decisionEvents?.map((event) => event.eventType)).not.toContain("NO_REPLY");
  });

  it("GOLDEN-BUYING-LONGTAIL-001 hands off model buying evidence without product context", async () => {
    const text = "làm đơn mẫu này cho mình";
    const { committed, model } = await replayGolden({
      fixtureId: "GOLDEN-BUYING-LONGTAIL-001",
      text,
      productMatched: false,
      modelProposal: {
        ...noReplyProposal,
        intent: "buying_committed",
        action: "REPLY",
        reply: "Em hỗ trợ chị lên đơn nhé.",
        salesSignals: {
          checkoutExtraction: {
            fullName: { value: null, evidenceText: null, confidence: 0 },
            phone: { value: null, evidenceText: null, confidence: 0 },
            address: { value: null, evidenceText: null, confidence: 0 },
            paymentMethod: { value: null, evidenceText: null, confidence: 0 },
          },
          purchaseConfirmation: {
            decision: "UNCLEAR",
            evidenceText: null,
            confidence: 0,
          },
          buyingIntent: {
            decision: "COMMITTED",
            requestedAction: "OPEN_CART",
            quantity: null,
            evidenceText: text,
            confidence: 0.97,
          },
        },
      },
    });

    expect(model.generate).toHaveBeenCalledOnce();
    expect(committed?.metaPlan).toBeUndefined();
    expect(committed?.state).toMatchObject({
      conversationOwner: "HUMAN",
      ownerReason: "AGENT_HANDOFF",
    });
    expect(committed?.handoffEventPlan).toMatchObject({
      source: "BOT_POLICY",
      reasonCode: "UNVERIFIED_PRODUCT_ID",
    });
  });

  it("GOLDEN-END-001 preserves NO_REPLY for a plain conversation end", async () => {
    const { committed } = await replayGolden({
      fixtureId: "GOLDEN-END-001",
      text: "Cảm ơn shop",
      productMatched: false,
      modelProposal: noReplyProposal,
    });

    expect(committed?.metaPlan).toBeUndefined();
    expect(committed?.decisionEvents?.map((event) => event.eventType)).toEqual([
      "NO_REPLY",
      "NO_REPLY_SELECTED",
    ]);
  });

  it("GOLDEN-PREMATURE-PII-001 replaces an early order-info request with a safe next step", async () => {
    const { committed } = await replayGolden({
      fixtureId: "GOLDEN-PREMATURE-PII-001",
      text: "Mẫu này mặc đi làm được không?",
      productMatched: true,
      modelProposal: {
        schemaVersion: 1,
        intent: "tu_van",
        conversationStage: "consulting",
        productId: "CB182",
        action: "REPLY",
        reply: "Chị gửi em họ tên, số điện thoại và địa chỉ nhận hàng nha.",
        attachments: [],
        handoffReason: null,
        businessFactQuery: {
          intent: "NONE",
          offerType: null,
          color: null,
          size: null,
          deliveryRegion: null,
        },
      },
    });

    expect(committed?.metaPlan?.messages).toEqual([{
      kind: "TEXT",
      text: "Em đã tìm thấy mẫu CB182. Chị muốn xem giá, size, tình trạng hàng hay thời gian giao dự kiến?",
    }]);
    expect(committed?.pancakeTagPlan).toBeUndefined();
    expect(committed?.decisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventType: "GUARD_BLOCKED",
        reasonCodes: ["PREMATURE_ORDER_INFO_REQUEST"],
      }),
    ]));
  });

  it("GOLDEN-GROUNDED-FACTS-001 keeps decisions in the proposal and facts in the assembler", async () => {
    const proposal: AgentProposalV1 = {
      schemaVersion: 1,
      intent: "hoi_gia",
      conversationStage: "consulting",
      productId: "CB182",
      action: "REPLY",
      reply: "Model không được dùng câu này 500k",
      attachments: [],
      handoffReason: null,
      businessFactQuery: {
        intent: "PRICE",
        offerType: null,
        color: null,
        size: null,
        deliveryRegion: null,
      },
    };
    const { committed, model } = await replayGolden({
      fixtureId: "GOLDEN-GROUNDED-FACTS-001",
      text: "Mẫu này giá bao nhiêu, mặc có tôn dáng không?",
      productMatched: true,
      currentProductId: "CB182",
      modelProposal: proposal,
      groundedDraft: {
        schemaVersion: 1,
        advisoryText: "Form suông thanh lịch, dễ mặc đi làm.",
        objectionResponse: "",
        suggestedQuestion: "Chị thích màu be hay đen hơn ạ?",
        suggestedNextStep: "",
        attachmentImageIndices: [0],
      },
    });

    expect(model.groundDraftWithFacts).toHaveBeenCalledOnce();
    expect(model.groundWithFacts).not.toHaveBeenCalled();
    expect(committed?.metaPlan?.messages).toEqual([
      {
        kind: "TEXT",
        text: [
          "Set váy CB182 hiện có giá 699.000đ chị nhé.",
          "Chất liệu: gấm",
          "Form dáng: suông",
          "Size: S, M, L",
        ].join("\n"),
      },
      {
        kind: "TEXT",
        text: [
          "Form suông thanh lịch, dễ mặc đi làm.",
          "Chị thích màu be hay đen hơn ạ?",
        ].join("\n"),
      },
      { kind: "IMAGE", imageUrl: "https://cdn.example/cb182.jpg" },
    ]);
    expect(JSON.stringify(committed?.metaPlan)).not.toContain("500k");
  });

  it("GOLDEN-GROUNDED-SCHEMA-001 falls back to the verified product block without customer-visible failure", async () => {
    const { committed } = await replayGolden({
      fixtureId: "GOLDEN-GROUNDED-SCHEMA-001",
      text: "Mẫu này giá bao nhiêu, mặc có tôn dáng không?",
      productMatched: true,
      currentProductId: "CB182",
      groundedDraftError: true,
      modelProposal: {
        schemaVersion: 1,
        intent: "hoi_gia",
        conversationStage: "consulting",
        productId: "CB182",
        action: "REPLY",
        reply: "Model đoán 500k",
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

    expect(committed?.metaPlan?.messages).toEqual([{
      kind: "TEXT",
      text: [
        "Set váy CB182 hiện có giá 699.000đ chị nhé.",
        "Chất liệu: gấm",
        "Form dáng: suông",
        "Size: S, M, L",
      ].join("\n"),
    }]);
    expect(committed?.pancakeTagPlan).toBeUndefined();
    expect(committed?.decisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventType: "GUARD_BLOCKED",
        reasonCodes: ["GROUNDED_SCHEMA_INVALID"],
      }),
    ]));
  });
});
