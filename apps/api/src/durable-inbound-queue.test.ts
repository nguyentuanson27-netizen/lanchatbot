import { describe, expect, it, vi } from "vitest";
import { DurableInboundQueue, type DurableInboundStore } from "./durable-inbound-queue.js";

describe("DurableInboundQueue", () => {
  it("persists the normalized envelope while preserving send=false", async () => {
    const enqueue = vi.fn(async () => ({
      inboxId: "inbox-1",
      inserted: true,
      status: "VERIFIED",
    }));
    const store: DurableInboundStore = {
      ready: vi.fn(async () => true),
      enqueue,
    };
    const queue = new DurableInboundQueue(
      store,
      "app-1",
      "meta-app-secret-v1",
    );
    await queue.enqueue({
      schemaVersion: 1,
      customerSendEnabled: false as const,
      routing: {
        mode: "SHADOW",
        routingOwner: "N8N",
        evaluationOnly: true,
        reason: "SHADOW",
      },
      message: {
        schemaVersion: 1,
        traceId: "c58291c8-e564-48b8-9cc0-0b3b55558ea7",
        eventKey: "meta:page-1:message:m-1",
        pageId: "page-1",
        messageId: "m-1",
        senderId: "customer-1",
        conversationId: "meta:v1:hash",
        occurredAt: "2026-07-16T00:00:00.000Z",
        isEcho: false,
        appId: null,
        text: "hello",
        attachments: [],
      },
    });
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: "page-1",
        metaAppId: "app-1",
        eventKey: "meta:page-1:message:m-1",
        providerMessageId: "m-1",
        conversationHash: "meta:v1:hash",
        signatureKeyVersion: "meta-app-secret-v1",
        eventKind: "CUSTOMER",
        envelope: expect.objectContaining({ customerSendEnabled: false }),
      }),
    );
  });

  it("classifies only a matching Meta App ID as a non-invalidating app echo", async () => {
    const enqueue = vi.fn(async () => ({
      inboxId: "inbox-1",
      inserted: true,
      status: "VERIFIED",
    }));
    const queue = new DurableInboundQueue(
      { ready: vi.fn(async () => true), enqueue },
      "app-1",
      "meta-app-secret-v1",
    );
    const envelope = {
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
        traceId: "c58291c8-e564-48b8-9cc0-0b3b55558ea7",
        eventKey: "meta:page-1:message:m-echo",
        pageId: "page-1",
        messageId: "m-echo",
        senderId: "page-1",
        conversationId: "meta:v1:hash",
        occurredAt: "2026-07-16T00:00:00.000Z",
        isEcho: true as const,
        appId: "app-1",
        text: "reply",
        attachments: [],
      },
    };
    await queue.enqueue(envelope);
    expect(enqueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ eventKind: "APP_ECHO" }),
    );

    await queue.enqueue({
      ...envelope,
      message: {
        ...envelope.message,
        eventKey: "meta:page-1:message:m-human",
        messageId: "m-human",
        appId: null,
      },
    });
    expect(enqueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ eventKind: "PAGE_ECHO" }),
    );
  });

  it("reconciles an echo without app_id by accepted Meta MID and fails closed", async () => {
    const enqueue = vi.fn(async () => ({
      inboxId: "inbox-1", inserted: true, status: "VERIFIED",
    }));
    const isOwnMetaMessage = vi.fn(async () => true);
    const queue = new DurableInboundQueue(
      { ready: vi.fn(async () => true), enqueue, isOwnMetaMessage },
      "app-1",
      "meta-app-secret-v1",
    );
    const envelope = {
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
        traceId: "c58291c8-e564-48b8-9cc0-0b3b55558ea7",
        eventKey: "meta:page-1:message:m-accepted",
        pageId: "page-1",
        messageId: "m-accepted",
        senderId: "page-1",
        conversationId: "meta:v1:hash",
        occurredAt: "2026-07-16T00:00:00.000Z",
        isEcho: true as const,
        appId: null,
        text: "reply",
        attachments: [],
      },
    };

    await queue.enqueue(envelope);
    expect(isOwnMetaMessage).toHaveBeenCalledWith("page-1", "m-accepted");
    expect(enqueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ eventKind: "APP_ECHO" }),
    );

    isOwnMetaMessage.mockRejectedValueOnce(new Error("database unavailable"));
    await queue.enqueue({
      ...envelope,
      message: {
        ...envelope.message,
        eventKey: "meta:page-1:message:m-unknown",
        messageId: "m-unknown",
      },
    });
    expect(enqueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ eventKind: "PAGE_ECHO" }),
    );
  });
});
