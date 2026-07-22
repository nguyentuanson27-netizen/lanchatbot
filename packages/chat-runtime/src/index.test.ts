import type { AgentProposalV1, BusinessFactEnvelopeV1 } from "@lana/contracts";
import {
  createConversationState,
  type InboundConversationEvent,
  type PancakeTagObservation,
} from "@lana/conversation-engine";
import { describe, expect, it } from "vitest";
import { evaluatePhase2Runtime } from "./index.js";

const now = new Date("2026-07-13T00:00:10.000Z");

const absent: PancakeTagObservation = {
  schemaVersion: 1,
  verified: true,
  blockingTag: null,
  observedTagIds: [],
  observedAt: "2026-07-13T00:00:09.000Z",
  reasonCode: null,
};

const baseEvent = (overrides: Partial<InboundConversationEvent> = {}): InboundConversationEvent => ({
  eventKey: "event-1",
  messageId: "mid-1",
  occurredAt: "2026-07-13T00:00:09.000Z",
  receiveSequence: 1,
  actor: "CUSTOMER",
  journey: "PRE_SALE",
  requestedHandoffReason: null,
  requestedSalesStage: "PRODUCT_MATCHED",
  salesStageTrigger: "NORMAL",
  productId: "SD396",
  objectionType: "NONE",
  ...overrides,
});

const proposal = (reply: string): AgentProposalV1 => ({
  schemaVersion: 1,
  intent: "hoi_san_pham",
  conversationStage: "PRODUCT_MATCHED",
  productId: "SD396",
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
});

const facts: BusinessFactEnvelopeV1 = {
  schemaVersion: 1,
  status: "OK",
  source: "POS_SNAPSHOT",
  observedAt: "2026-07-13T00:00:00.000Z",
  expiresAt: "2026-07-13T00:10:00.000Z",
  productId: "SD396",
  reasonCode: null,
  facts: {
    schemaVersion: 1,
    productId: "SD396",
    parentProductId: "SD396",
    offerType: "DIRECT",
    listPriceVnd: 799_000,
    salePriceVnd: 699_000,
    sizes: ["S", "M", "L", "XL"],
    stockStatus: "IN_STOCK",
    stockQuantity: 3,
    deliveryEta: { minDays: 2, maxDays: 4 },
    fulfillmentPolicy: "READY_STOCK",
    imageUrls: [],
  },
};

function run(
  routingOwner: "N8N" | "APP",
  options: {
    event?: InboundConversationEvent;
    observation?: PancakeTagObservation;
    proposal?: unknown;
    businessFacts?: BusinessFactEnvelopeV1 | null;
  } = {},
) {
  return evaluatePhase2Runtime({
    pageId: "page-1",
    state: createConversationState({
      conversationId: "conversation-1",
      routingOwner,
      now: new Date("2026-07-13T00:00:00.000Z"),
    }),
    expectedRevision: 0,
    fence: 1,
    event: options.event ?? baseEvent(),
    tagObservation: options.observation ?? absent,
    ...(options.proposal === undefined ? {} : { proposal: options.proposal }),
    facts: options.businessFacts === undefined ? facts : options.businessFacts,
    verifiedProductIds: new Set(["SD396"]),
    now,
  });
}

describe("Phase-2 replay/shadow composition", () => {
  it("evaluates a valid proposal in shadow but never creates a Meta Outbox intent", () => {
    const result = run("N8N", { proposal: proposal("Dạ em đã ghi nhận mẫu SD396 ạ") });
    expect(result.guardedPlan).toMatchObject({ action: "REPLY", sendAuthorized: false });
    expect(result.metaOutboxIntent).toBeNull();
    expect(result.pancakeTagIntent).toBeNull();
    expect(result.sendEnabled).toBe(false);
  });

  it("continues evaluation when Pancake tag verification is unavailable", () => {
    const result = run("APP", {
      proposal: proposal("Dạ em trả lời ạ"),
      observation: { ...absent, verified: false, reasonCode: "PANCAKE_TIMEOUT" },
    });
    expect(result.guardedPlan).not.toBeNull();
    expect(result.state.conversationOwner).toBe("BOT");
    expect(result.metaOutboxIntent).toBeNull();
  });

  it("turns post-sale into silent VAN_DON intent only for APP ownership", () => {
    const event = baseEvent({
      journey: "POST_SALE",
      requestedHandoffReason: "ORDER_STATUS",
      requestedSalesStage: "POST_SALE",
      productId: null,
    });
    const result = run("APP", { event });
    expect(result.handoff).toMatchObject({ desiredTag: "VAN_DON", silent: true });
    expect(result.pancakeTagIntent).toMatchObject({ desiredTag: "VAN_DON" });
    expect(result.guardedPlan).toBeNull();
    expect(result.metaOutboxIntent).toBeNull();
  });

  it("converts an invented price into silent NHAN_VIEN handoff", () => {
    const result = run("APP", { proposal: proposal("Giá mẫu này 599k ạ") });
    expect(result.guardedPlan?.blockedReasonCodes).toContain("UNAUTHORIZED_PRICE");
    expect(result.guardedPlan).toMatchObject({ action: "HANDOFF", textUnits: [] });
    expect(result.state.conversationOwner).toBe("HUMAN");
    expect(result.pancakeTagIntent).toMatchObject({ desiredTag: "NHAN_VIEN" });
    expect(result.metaOutboxIntent).toBeNull();
  });

  it("keeps tag side effects owned by n8n during shadow", () => {
    const result = run("N8N", {
      event: baseEvent({ requestedHandoffReason: "AGENT_REQUEST" }),
    });
    expect(result.handoff?.silent).toBe(true);
    expect(result.pancakeTagIntent).toBeNull();
    expect(result.metaOutboxIntent).toBeNull();
  });
});
