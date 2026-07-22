import { describe, expect, it } from "vitest";
import {
  InMemoryConversationStateRepository,
  PHASE_2_SEND_ENABLED,
  applyInboundEvent,
  createConversationState,
  transitionSalesStage,
  type ConversationState,
  type BlockingTag,
  type HandoffReason,
  type InboundConversationEvent,
  type PancakeTagObservation,
  type SalesStage,
} from "./index.js";

const t0 = new Date("2026-07-13T00:00:00.000Z");
const at = (milliseconds: number): Date => new Date(t0.getTime() + milliseconds);

const absent = (milliseconds: number): PancakeTagObservation => ({
  schemaVersion: 1,
  verified: true,
  blockingTag: null,
  observedTagIds: [],
  observedAt: at(milliseconds).toISOString(),
  reasonCode: null,
});

const blocked = (
  milliseconds: number,
  blockingTag: BlockingTag = "NHAN_VIEN",
): PancakeTagObservation => ({
  schemaVersion: 1,
  verified: true,
  blockingTag,
  observedTagIds: [`tag-${blockingTag.toLowerCase()}`],
  observedAt: at(milliseconds).toISOString(),
  reasonCode: null,
});

const unverified = (milliseconds: number): PancakeTagObservation => ({
  schemaVersion: 1,
  verified: false,
  blockingTag: null,
  observedTagIds: [],
  observedAt: at(milliseconds).toISOString(),
  reasonCode: "PANCAKE_READ_FAILED",
});

function event(
  sequence: number,
  milliseconds: number,
  overrides: Partial<InboundConversationEvent> = {},
): InboundConversationEvent {
  return {
    eventKey: `event-${sequence}`,
    messageId: `mid-${sequence}`,
    occurredAt: at(milliseconds).toISOString(),
    receiveSequence: sequence,
    actor: "CUSTOMER",
    journey: "PRE_SALE",
    requestedHandoffReason: null,
    requestedSalesStage: null,
    salesStageTrigger: "NORMAL",
    productId: null,
    objectionType: "NONE",
    ...overrides,
  };
}

const initial = (routingOwner: "N8N" | "APP" = "APP"): ConversationState =>
  createConversationState({
    conversationId: "conversation-1",
    routingOwner,
    now: t0,
  });

function apply(
  state: ConversationState,
  inbound: InboundConversationEvent,
  observation: PancakeTagObservation,
  fence = state.lastFence + 1,
  now = new Date(inbound.occurredAt),
) {
  return applyInboundEvent({
    state,
    expectedRevision: state.revision,
    fence,
    event: inbound,
    tagObservation: observation,
    now,
  });
}

describe("revision, fencing and event ordering", () => {
  it("rejects concurrent saves based on the durable revision", async () => {
    const repository = new InMemoryConversationStateRepository();
    const base = initial();
    await repository.create(base);

    const first = apply(base, event(1, 1_000), absent(1_000), 1);
    const concurrent = apply(base, event(2, 2_000), absent(2_000), 2);
    await repository.save(first.state, 0, 1);
    await expect(repository.save(concurrent.state, 0, 2)).rejects.toThrow(
      "STATE_REVISION_CONFLICT",
    );
  });

  it("rejects a stale fencing token even with the expected revision", () => {
    const first = apply(initial(), event(1, 1_000), absent(1_000), 5);
    expect(() => apply(first.state, event(2, 2_000), absent(2_000), 4)).toThrow(
      "STALE_FENCE",
    );
  });

  it("does not mutate state for duplicate or out-of-order events", () => {
    const firstEvent = event(2, 2_000);
    const first = apply(initial(), firstEvent, absent(2_000));
    const duplicate = apply(first.state, firstEvent, absent(2_001));
    const stale = apply(first.state, event(3, 1_999), absent(2_002));

    expect(duplicate.status).toBe("DUPLICATE");
    expect(stale.status).toBe("STALE");
    expect(duplicate.state).toEqual(first.state);
    expect(stale.state).toEqual(first.state);
    expect(stale.authorization.allowEvaluate).toBe(false);
  });

  it("uses receive sequence to order equal provider timestamps", () => {
    const first = apply(initial(), event(10, 1_000), absent(1_000));
    expect(apply(first.state, event(9, 1_000), absent(1_001)).status).toBe("STALE");
    expect(apply(first.state, event(11, 1_000), absent(1_001)).status).toBe("APPLIED");
  });
});

describe("fail-open ownership with confirmed blocking tags", () => {
  it("blocks evaluation for all Pancake blocking tags", () => {
    for (const tag of [
      "NHAN_VIEN",
      "VAN_DON",
      "DA_CHOT_DON",
      "KHONG_UP_SALE",
    ] as const) {
      const result = apply(initial(), event(1, 1_000), blocked(1_000, tag));
      expect(result.state.conversationOwner).toBe("HUMAN");
      expect(result.state.blockingTag).toBe(tag);
      expect(result.authorization.allowEvaluate).toBe(false);
      expect(result.authorization.allowCreateMetaOutbox).toBe(false);
      expect(result.authorization.reasonCodes).toContain("PANCAKE_BLOCKING_TAG");
    }
  });

  it("continues as BOT when the tag read is unavailable", () => {
    const result = apply(initial(), event(1, 1_000), unverified(1_000));
    expect(result.state.tagGateStatus).toBe("UNVERIFIED");
    expect(result.state.conversationOwner).toBe("BOT");
    expect(result.state.ownerReason).toBe("DEFAULT");
    expect(result.authorization.allowEvaluate).toBe(true);
    expect(result.authorization.reasonCodes).toContain("PANCAKE_TAG_UNVERIFIED");
  });

  it("immediately clears Pancake-owned HUMAN state when the next verified read has no tags", () => {
    const blockedResult = apply(initial(), event(1, 1_000), blocked(1_000));
    expect(blockedResult.state.conversationOwner).toBe("HUMAN");
    expect(blockedResult.state.ownerReason).toBe("PANCAKE_TAG");

    const cleared = apply(
      blockedResult.state,
      event(2, 2_000),
      absent(2_000),
      2,
      at(2_000),
    );
    expect(cleared.state.tagGateStatus).toBe("VERIFIED_ABSENT");
    expect(cleared.state.blockingTag).toBeNull();
    expect(cleared.state.conversationOwner).toBe("BOT");
    expect(cleared.state.ownerReason).toBe("DEFAULT");
    expect(cleared.state.ownerLeaseUntil).toBeNull();
    expect(cleared.authorization.allowEvaluate).toBe(true);
  });

  it("fails open on an unavailable read but still blocks confirmed tags", () => {
    const clear = apply(initial(), event(1, 2_000), absent(2_000));
    const readFailed = apply(clear.state, event(2, 3_000), unverified(1_000));
    expect(readFailed.state.tagGateStatus).toBe("UNVERIFIED");
    expect(readFailed.authorization.allowEvaluate).toBe(true);

    const blockingObserved = apply(clear.state, event(2, 3_000), blocked(1_000));
    expect(blockingObserved.state.blockingTag).toBe("NHAN_VIEN");
    expect(blockingObserved.authorization.allowEvaluate).toBe(false);

    const olderReadFailure = apply(
      blockingObserved.state,
      event(3, 4_000),
      unverified(500),
    );
    expect(olderReadFailure.state.tagGateStatus).toBe("UNVERIFIED");
    expect(olderReadFailure.state.blockingTag).toBeNull();
    expect(olderReadFailure.state.conversationOwner).toBe("BOT");
    expect(olderReadFailure.authorization.allowEvaluate).toBe(true);
  });

  it("resumes HUMAN to BOT only on a new customer message after fifteen minutes with no blocking tag", () => {
    const human = apply(
      initial(),
      event(1, 1_000, { actor: "HUMAN" }),
      absent(1_000),
      1,
      at(1_000),
    );
    const tooEarly = apply(
      human.state,
      event(2, 10 * 60_000),
      absent(10 * 60_000),
      2,
      at(10 * 60_000),
    );
    expect(tooEarly.state.conversationOwner).toBe("HUMAN");
    expect(tooEarly.authorization.allowEvaluate).toBe(false);

    const resumed = apply(
      tooEarly.state,
      event(3, 15 * 60_000 + 1_001),
      absent(15 * 60_000 + 1_001),
      3,
      at(15 * 60_000 + 1_001),
    );
    expect(resumed.state.conversationOwner).toBe("BOT");
    expect(resumed.state.ownerLeaseUntil).toBeNull();
    expect(resumed.authorization.allowEvaluate).toBe(true);
  });

  it("keeps confirmed blocking tags but permits unverified reads after a human lease expires", () => {
    const human = apply(
      initial(),
      event(1, 1_000, { actor: "HUMAN" }),
      absent(1_000),
      1,
      at(1_000),
    );
    const afterLease = 15 * 60_000 + 2_000;
    expect(
      apply(human.state, event(2, afterLease), blocked(afterLease), 2, at(afterLease)).state
        .conversationOwner,
    ).toBe("HUMAN");
    expect(
      apply(human.state, event(2, afterLease), unverified(afterLease), 2, at(afterLease)).state
        .conversationOwner,
    ).toBe("BOT");
  });
});

describe("routing and Phase-2 authorization", () => {
  it("allows shadow evaluation for N8N routing but never side effects", () => {
    const result = apply(initial("N8N"), event(1, 1_000), absent(1_000));
    expect(result.authorization.allowEvaluate).toBe(true);
    expect(result.authorization.allowCreateMetaOutbox).toBe(false);
    expect(result.authorization.allowTagCommand).toBe(false);
    expect(result.authorization.metaOutboxEligibleAfterPhase2).toBe(false);
    expect(result.authorization.reasonCodes).toContain("ROUTING_OWNER_N8N_SHADOW");
  });

  it("reports APP eligibility while retaining the literal Phase-2 send=false gate", () => {
    const result = apply(initial("APP"), event(1, 1_000), absent(1_000));
    expect(PHASE_2_SEND_ENABLED).toBe(false);
    expect(result.authorization.allowEvaluate).toBe(true);
    expect(result.authorization.metaOutboxEligibleAfterPhase2).toBe(true);
    expect(result.authorization.allowCreateMetaOutbox).toBe(false);
    expect(result.authorization.reasonCodes).toContain("PHASE2_SEND_DISABLED");
  });
});

describe("silent handoff taxonomy", () => {
  const runHandoff = (reason: HandoffReason) =>
    apply(
      initial("APP"),
      event(1, 1_000, { requestedHandoffReason: reason }),
      absent(1_000),
    );

  it("maps post-sale to Vận Đơn without authorizing a customer message", () => {
    const result = runHandoff("DELIVERY_TRACKING");
    expect(result.handoff).toEqual({
      reason: "DELIVERY_TRACKING",
      category: "POST_SALE",
      desiredTag: "VAN_DON",
      silent: true,
    });
    expect(result.state.salesStage).toBe("POST_SALE");
    expect(result.state.conversationOwner).toBe("HUMAN");
    expect(result.authorization.allowEvaluate).toBe(false);
    expect(result.authorization.allowCreateMetaOutbox).toBe(false);
    expect(result.authorization.allowTagCommand).toBe(true);
  });

  it("maps all other handoffs to Nhân viên and remains silent", () => {
    const result = runHandoff("INVALID_AGENT_SCHEMA");
    expect(result.handoff).toEqual({
      reason: "INVALID_AGENT_SCHEMA",
      category: "GENERAL",
      desiredTag: "NHAN_VIEN",
      silent: true,
    });
    expect(result.authorization.allowEvaluate).toBe(false);
    expect(result.authorization.allowCreateMetaOutbox).toBe(false);
    expect(result.authorization.allowTagCommand).toBe(true);
  });

  it("does not mutate Pancake tags while routing remains N8N", () => {
    const result = apply(
      initial("N8N"),
      event(1, 1_000, { requestedHandoffReason: "AGENT_REQUEST" }),
      absent(1_000),
    );
    expect(result.handoff?.silent).toBe(true);
    expect(result.authorization.allowTagCommand).toBe(false);
  });
});

describe("sales-stage transitions", () => {
  it("accepts only the documented normal forward edges", () => {
    const cases: readonly [SalesStage, SalesStage][] = [
      ["DISCOVERY", "PRODUCT_MATCHED"],
      ["PRODUCT_MATCHED", "FIT_CONSULTING"],
      ["PRODUCT_MATCHED", "OBJECTION_HANDLING"],
      ["FIT_CONSULTING", "READY_TO_BUY"],
      ["OBJECTION_HANDLING", "READY_TO_BUY"],
      ["READY_TO_BUY", "ORDER_REVIEW"],
    ];
    for (const [from, to] of cases) {
      expect(transitionSalesStage(from, to, "NORMAL")).toMatchObject({
        stage: to,
        accepted: true,
      });
    }
    expect(transitionSalesStage("DISCOVERY", "ORDER_REVIEW", "NORMAL")).toEqual({
      stage: "DISCOVERY",
      accepted: false,
      code: "SALES_STAGE_TRANSITION_REJECTED",
    });
  });

  it("allows explicit backward movement only for product switch or a new objection", () => {
    expect(transitionSalesStage("ORDER_REVIEW", "PRODUCT_MATCHED", "PRODUCT_SWITCHED")).toMatchObject({
      stage: "PRODUCT_MATCHED",
      accepted: true,
    });
    expect(transitionSalesStage("READY_TO_BUY", "OBJECTION_HANDLING", "NEW_OBJECTION")).toMatchObject({
      stage: "OBJECTION_HANDLING",
      accepted: true,
    });
    expect(transitionSalesStage("READY_TO_BUY", "FIT_CONSULTING", "NORMAL").accepted).toBe(false);
  });

  it("resets incompatible variant and order draft on parent-product switch", () => {
    const seeded: ConversationState = {
      ...initial(),
      currentProductId: "SD396",
      consideredVariant: { offerType: "SET", color: "DEN", size: "M" },
      orderDraft: {
        productId: "SD396",
        offerType: "SET",
        color: "DEN",
        size: "M",
        quantity: 1,
      },
      salesStage: "ORDER_REVIEW",
    };
    const result = apply(
      seeded,
      event(1, 1_000, {
        productId: "SQ149",
        requestedSalesStage: "PRODUCT_MATCHED",
        salesStageTrigger: "PRODUCT_SWITCHED",
      }),
      absent(1_000),
    );
    expect(result.state.currentProductId).toBe("SQ149");
    expect(result.state.consideredVariant).toEqual({ offerType: null, color: null, size: null });
    expect(result.state.orderDraft).toBeNull();
    expect(result.state.salesStage).toBe("PRODUCT_MATCHED");
  });
});
