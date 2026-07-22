import { describe, expect, it, vi } from "vitest";
import type { ClaimedMetaOutbox } from "@lana/database";
import {
  MetaOutboxDispatcher,
  PancakeMetaPreSendGate,
  type MetaDeliveryPort,
  type MetaOutboxDispatchStore,
  type MetaPreSendGate,
} from "./meta-outbox-dispatcher.js";
import type { PancakeHandoffAdapter } from "@lana/pancake-handoff";

const claim = (): ClaimedMetaOutbox => ({
  outboxId: "3d6f11f5-cfb8-4d9d-bd47-4ef45ce89fea",
  leaseToken: "01730148-1fe0-4112-99bc-33055e8db58e",
  pageId: "1198992073286645",
  conversationId: "ec8f92e5-f5e2-4934-a0f7-e510c27a56ab",
  recipientId: "customer-1",
  pancakeConversationId: "pancake-conversation-1",
  message: { kind: "TEXT", text: "Dạ mẫu này còn chị nhé." },
  attemptCount: 1,
});

function store(row: ClaimedMetaOutbox): MetaOutboxDispatchStore {
  return {
    claimMetaOutbox: vi.fn(async () => row),
    markMetaAccepted: vi.fn(async () => true),
    markMetaRetryable: vi.fn(async () => true),
    markMetaTerminal: vi.fn(async () => true),
    markMetaManualReview: vi.fn(async () => true),
    quarantineExpiredMetaSending: vi.fn(async () => 0),
  };
}

describe("MetaOutboxDispatcher", () => {
  it("marks accepted only after Meta returns provider evidence", async () => {
    const repository = store(claim());
    const delivery: MetaDeliveryPort = {
      send: vi.fn(async () => ({
        schemaVersion: 1 as const,
        result: "ACCEPTED" as const,
        providerMessageId: "mid-accepted",
        recipientId: "customer-1",
      })),
    };
    const gate: MetaPreSendGate = {
      authorize: vi.fn(async () => ({
        allowed: true,
        reasonCode: null,
      })),
    };
    const dispatcher = new MetaOutboxDispatcher(
      repository,
      delivery,
      { get: () => "page-token" },
      gate,
      { workerId: "sender-1" },
    );
    expect(await dispatcher.processOne()).toBe(true);
    expect(repository.markMetaAccepted).toHaveBeenCalledWith(
      claim().outboxId,
      claim().leaseToken,
      "mid-accepted",
    );
  });

  it("does not send when a pre-send gate explicitly blocks", async () => {
    const repository = store(claim());
    const delivery: MetaDeliveryPort = { send: vi.fn() };
    const dispatcher = new MetaOutboxDispatcher(
      repository,
      delivery,
      { get: () => "page-token" },
      {
        authorize: vi.fn(async () => ({
          allowed: false,
          reasonCode: "PANCAKE_TAG_UNVERIFIED",
        })),
      },
      { workerId: "sender-1" },
    );
    expect(await dispatcher.processOne()).toBe(true);
    expect(delivery.send).not.toHaveBeenCalled();
    expect(repository.markMetaRetryable).toHaveBeenCalled();
  });

  it("does not blindly retry an ambiguous Meta outcome", async () => {
    const repository = store(claim());
    const dispatcher = new MetaOutboxDispatcher(
      repository,
      {
        send: vi.fn(async () => ({
          schemaVersion: 1 as const,
          result: "AMBIGUOUS" as const,
          reasonCode: "META_TRANSPORT_OUTCOME_UNKNOWN",
        })),
      },
      { get: () => "page-token" },
      {
        authorize: vi.fn(async () => ({
          allowed: true,
          reasonCode: null,
        })),
      },
      { workerId: "sender-1" },
    );
    expect(await dispatcher.processOne()).toBe(true);
    expect(repository.markMetaTerminal).toHaveBeenCalledWith(
      claim().outboxId,
      claim().leaseToken,
      "AMBIGUOUS",
      "META_TRANSPORT_OUTCOME_UNKNOWN",
    );
    expect(repository.markMetaRetryable).not.toHaveBeenCalled();
  });
});

describe("PancakeMetaPreSendGate", () => {
  it("fails open when Pancake data is unavailable", async () => {
    const pancake = {
      observeBlockingTags: vi.fn(async () => ({
        schemaVersion: 1 as const,
        verified: false,
        blockingTag: null,
        observedTagIds: [],
        observedAt: "2026-07-17T00:00:00.000Z",
        reasonCode: "PANCAKE_CONVERSATION_NOT_FOUND",
      })),
    } as unknown as PancakeHandoffAdapter;
    const gate = new PancakeMetaPreSendGate(pancake);

    await expect(gate.authorize(claim())).resolves.toEqual({
      allowed: true,
      reasonCode: null,
    });
  });

  it("blocks a confirmed no-upsale tag", async () => {
    const pancake = {
      observeBlockingTags: vi.fn(async () => ({
        schemaVersion: 1 as const,
        verified: true,
        blockingTag: "KHONG_UP_SALE" as const,
        observedTagIds: ["13"],
        observedAt: "2026-07-17T00:00:00.000Z",
        reasonCode: null,
      })),
    } as unknown as PancakeHandoffAdapter;
    const gate = new PancakeMetaPreSendGate(pancake);

    await expect(gate.authorize(claim())).resolves.toEqual({
      allowed: false,
      reasonCode: "PANCAKE_BLOCKING_TAG_KHONG_UP_SALE",
    });
  });
});
