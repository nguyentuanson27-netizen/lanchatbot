import { describe, expect, it, vi } from "vitest";
import type { ClaimedMetaOutbox } from "@lana/database";
import {
  MetaOutboxDispatcher,
  PancakeMetaPreSendGate,
  resolveMetaResponseGroupGate,
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
  replyPlanId: "10000000-0000-4000-8000-000000000001",
  responseGroupId: "10000000-0000-4000-8000-000000000002",
  sequenceNo: 0,
  recipientId: "customer-1",
  pancakeConversationId: "pancake-conversation-1",
  message: { kind: "TEXT", text: "Dạ mẫu này còn chị nhé." },
  attemptCount: 1,
});

function store(row: ClaimedMetaOutbox): MetaOutboxDispatchStore {
  let groupGate: Awaited<
    ReturnType<MetaOutboxDispatchStore["readMetaResponseGroupGate"]>
  > = null;
  return {
    claimMetaOutbox: vi.fn(async () => row),
    readMetaResponseGroupGate: vi.fn(async () => groupGate),
    recordMetaResponseGroupGate: vi.fn(async (input) => {
      if (groupGate?.status === "ALLOWED" || groupGate?.status === "BLOCKED") {
        return groupGate;
      }
      groupGate = {
        responseGroupId: input.responseGroupId,
        source: "PANCAKE",
        status: input.observation.status,
        reasonCode: input.observation.reasonCode,
        blockingTag: input.observation.blockingTag,
        observedAt: input.observation.observedAt,
        attemptCount: (groupGate?.attemptCount ?? 0) + 1,
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      };
      return groupGate;
    }),
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
        status: "ALLOWED" as const,
        reasonCode: null,
        blockingTag: null,
        observedAt: new Date("2026-07-17T00:00:00.000Z"),
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
          status: "UNVERIFIED" as const,
          reasonCode: "PANCAKE_TAG_UNVERIFIED",
          blockingTag: null,
          observedAt: new Date("2026-07-17T00:00:00.000Z"),
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
          status: "ALLOWED" as const,
          reasonCode: null,
          blockingTag: null,
          observedAt: new Date("2026-07-17T00:00:00.000Z"),
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
  it("fails closed when Pancake data is unavailable", async () => {
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
    const gate = new PancakeMetaPreSendGate(
      pancake,
      () => new Date("2026-07-17T00:00:01.000Z"),
    );

    await expect(gate.authorize(claim())).resolves.toEqual({
      status: "UNVERIFIED",
      reasonCode: "PANCAKE_CONVERSATION_NOT_FOUND",
      blockingTag: null,
      observedAt: new Date("2026-07-17T00:00:00.000Z"),
    });
  });

  it("fails closed when a verified Pancake observation is stale", async () => {
    const pancake = {
      observeBlockingTags: vi.fn(async () => ({
        schemaVersion: 1 as const,
        verified: true,
        blockingTag: null,
        observedTagIds: [],
        observedAt: "2026-07-17T00:00:00.000Z",
        reasonCode: null,
      })),
    } as unknown as PancakeHandoffAdapter;

    const gate = new PancakeMetaPreSendGate(
      pancake,
      () => new Date("2026-07-17T00:01:00.000Z"),
    );

    await expect(gate.authorize(claim())).resolves.toEqual({
      status: "UNVERIFIED",
      reasonCode: "PANCAKE_TAG_OBSERVATION_STALE",
      blockingTag: null,
      observedAt: new Date("2026-07-17T00:00:00.000Z"),
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
    const gate = new PancakeMetaPreSendGate(
      pancake,
      () => new Date("2026-07-17T00:00:01.000Z"),
    );

    await expect(gate.authorize(claim())).resolves.toEqual({
      status: "BLOCKED",
      reasonCode: "PANCAKE_BLOCKING_TAG_KHONG_UP_SALE",
      blockingTag: "KHONG_UP_SALE",
      observedAt: new Date("2026-07-17T00:00:00.000Z"),
    });
  });

  it("fails closed when the Pancake read throws", async () => {
    const pancake = {
      observeBlockingTags: vi.fn(async () => {
        throw new Error("timeout");
      }),
    } as unknown as PancakeHandoffAdapter;

    await expect(new PancakeMetaPreSendGate(pancake).authorize(claim())).resolves.toMatchObject({
      status: "UNVERIFIED",
      reasonCode: "PANCAKE_TAG_READ_ERROR",
      blockingTag: null,
    });
  });
});

describe("resolveMetaResponseGroupGate", () => {
  it("retries an unverified sequence 0 and reuses one durable allowed snapshot for descendants", async () => {
    const repository = store(claim());
    const gate: MetaPreSendGate = {
      authorize: vi.fn()
        .mockResolvedValueOnce({
          status: "UNVERIFIED",
          reasonCode: "PANCAKE_TAG_UNVERIFIED",
          blockingTag: null,
          observedAt: new Date("2026-07-17T00:00:00.000Z"),
        })
        .mockResolvedValueOnce({
          status: "ALLOWED",
          reasonCode: null,
          blockingTag: null,
          observedAt: new Date("2026-07-17T00:00:01.000Z"),
        }),
    };

    const first = await resolveMetaResponseGroupGate(claim(), repository, gate);
    const verified = await resolveMetaResponseGroupGate(claim(), repository, gate);
    const descendant = await resolveMetaResponseGroupGate(
      { ...claim(), sequenceNo: 1 },
      repository,
      gate,
    );

    expect(first.status).toBe("UNVERIFIED");
    expect(verified.status).toBe("ALLOWED");
    expect(descendant).toEqual(verified);
    expect(gate.authorize).toHaveBeenCalledTimes(2);
  });

  it("fails closed without re-reading Pancake when a terminal group snapshot expires", async () => {
    const repository = store(claim());
    vi.mocked(repository.readMetaResponseGroupGate).mockResolvedValue({
      responseGroupId: claim().responseGroupId,
      source: "PANCAKE",
      status: "ALLOWED",
      reasonCode: null,
      blockingTag: null,
      observedAt: new Date("2026-07-17T00:00:00.000Z"),
      attemptCount: 1,
      expiresAt: new Date("2026-07-17T00:05:00.000Z"),
    });
    const gate: MetaPreSendGate = { authorize: vi.fn() };

    const result = await resolveMetaResponseGroupGate(
      claim(),
      repository,
      gate,
      new Date("2026-07-17T00:05:01.000Z"),
    );

    expect(result).toMatchObject({
      status: "UNVERIFIED",
      reasonCode: "PANCAKE_RESPONSE_GROUP_GATE_EXPIRED",
      blockingTag: null,
    });
    expect(gate.authorize).not.toHaveBeenCalled();
    expect(repository.recordMetaResponseGroupGate).not.toHaveBeenCalled();
  });
});
