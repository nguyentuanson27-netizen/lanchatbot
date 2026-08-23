import { describe, expect, it, vi } from "vitest";
import {
  RuntimeBehaviorModeResolver,
  behaviorModeContentHash,
  type RuntimeBehaviorModeResolution,
} from "@lana/chat-runtime";
import { createConversationState } from "@lana/conversation-engine";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
} from "./df13-commerce-cutover.js";
import {
  Df13CommerceAuthorityFenceAdapter,
  type Df13CommerceAuthorityFencePort,
} from "./df13-commerce-authority-fence.js";
import { RealtimeRunner } from "./realtime-runner.js";

const pageId = "1198992073286645";

function resolution(
  salesAuthorityMode: "LEGACY" | "COMMERCE",
  overrides: Partial<RuntimeBehaviorModeResolution> = {},
): RuntimeBehaviorModeResolution {
  return {
    confirmationMode: "V2_ACTIVE",
    salesAuthorityMode,
    stateReadMode: "LEGACY",
    authorityBundleHash: salesAuthorityMode === "COMMERCE"
      ? DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
      : null,
    modeVersionId: salesAuthorityMode === "COMMERCE"
      ? "10000000-0000-4000-8000-000000000006"
      : "10000000-0000-4000-8000-000000000005",
    contentHash: `sha256:${(salesAuthorityMode === "COMMERCE" ? "c" : "a").repeat(64)}`,
    pointerRevision: salesAuthorityMode === "COMMERCE" ? 6 : 5,
    source: "DATABASE",
    status: "RESOLVED",
    reasonCodes: [],
    pointerUpdatedAt: "2026-08-22T00:00:00.000Z",
    resolvedAt: "2026-08-22T00:00:00.000Z",
    propagationMs: 0,
    auditWrite: "RECORDED",
    ...overrides,
  };
}

function fencePort(
  overrides: Partial<Df13CommerceAuthorityFencePort> = {},
): Df13CommerceAuthorityFencePort {
  return {
    admit: vi.fn(async (input) => ({
      status: "ADMITTED" as const,
      fenceToken: "fence-1",
      acquisition: "NEW" as const,
      authority: input.authority,
    })),
    complete: vi.fn(async () => "RELEASED" as const),
    ...overrides,
  };
}

describe("DF13 fence-bound commerce consumer adapter", () => {
  it("keeps the default LEGACY path side-effect-free without a fence provider", async () => {
    const adapter = new Df13CommerceAuthorityFenceAdapter();

    await expect(adapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      inboxIds: ["inbox-1"],
      resolution: resolution("LEGACY", {
        source: "STARTUP_DEFAULT",
        status: "FALLBACK",
        auditWrite: "NOT_CONFIGURED",
        modeVersionId: null,
        contentHash: null,
        pointerRevision: null,
        pointerUpdatedAt: null,
      }),
    })).resolves.toEqual({ status: "LEGACY_ADMITTED" });
  });

  it("blocks a rejected COMMERCE pointer instead of re-entering the LEGACY semantic path", async () => {
    const commerceBundleHash = "d".repeat(64);
    const payload = {
      confirmationMode: "LEGACY" as const,
      salesAuthorityMode: "COMMERCE" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: commerceBundleHash,
    };
    const resolver = new RuntimeBehaviorModeResolver({
      loadActiveMode: vi.fn(async () => ({
        version: {
          schemaVersion: 1 as const,
          modeVersionId: "10000000-0000-4000-8000-000000000007",
          pageId,
          channel: "MESSENGER",
          contentHash: behaviorModeContentHash(payload),
          createdBy: "test",
          reason: "test",
          createdAt: "2026-08-23T00:00:00.000Z",
          ...payload,
        },
        pointerRevision: 7,
        updatedBy: "test",
        reason: "test",
        updatedAt: "2026-08-23T00:00:00.000Z",
      })),
    });
    const rejected = await resolver.resolve({
      resolutionId: "10000000-0000-4000-8000-000000000008",
      pageId,
      channel: "MESSENGER",
      workerId: "worker-1",
      now: new Date("2026-08-23T00:00:00.000Z"),
    });

    expect(rejected).toMatchObject({
      status: "REJECTED",
      source: "FAIL_SAFE",
      salesAuthorityMode: "LEGACY",
      reasonCodes: ["RUNTIME_BEHAVIOR_COMMERCE_PAGE_NOT_ALLOWED"],
    });
    await expect(new Df13CommerceAuthorityFenceAdapter().admit({
      pageId,
      channel: "MESSENGER",
      workId: "rejected-commerce-pointer",
      inboxIds: ["inbox-1"],
      resolution: rejected,
    })).resolves.toMatchObject({
      status: "BLOCKED",
      reasonCode: "DF13_COMMERCE_IDENTITY_NOT_FRESH_RESOLVED",
    });
  });

  it("admits a LEGACY customer burst larger than the former adapter-only cap", async () => {
    const adapter = new Df13CommerceAuthorityFenceAdapter();
    const inboxIds = Array.from({ length: 101 }, (_value, index) => `inbox-${index + 1}`);

    await expect(adapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "legacy-burst-101",
      inboxIds,
      resolution: resolution("LEGACY", {
        source: "STARTUP_DEFAULT",
        status: "FALLBACK",
        auditWrite: "NOT_CONFIGURED",
        modeVersionId: null,
        contentHash: null,
        pointerRevision: null,
        pointerUpdatedAt: null,
      }),
    })).resolves.toEqual({ status: "LEGACY_ADMITTED" });
  });

  it("does not misclassify a large COMMERCE burst as an invalid fence scope", async () => {
    const adapter = new Df13CommerceAuthorityFenceAdapter(fencePort());
    const inboxIds = Array.from({ length: 101 }, (_value, index) => `inbox-${index + 1}`);

    await expect(adapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "commerce-burst-101",
      inboxIds,
      resolution: resolution("COMMERCE"),
    })).resolves.toMatchObject({
      status: "BLOCKED",
      reasonCode: "DF13_COMMERCE_CONSUMER_DISPATCHER_REQUIRED",
    });
  });

  it("fails closed before every authority consumer when COMMERCE has no durable fence provider", async () => {
    const adapter = new Df13CommerceAuthorityFenceAdapter();

    await expect(adapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      inboxIds: ["inbox-1"],
      resolution: resolution("COMMERCE"),
    })).resolves.toMatchObject({
      status: "BLOCKED",
      reasonCode: "DF13_FENCE_PROVIDER_REQUIRED",
    });
  });

  it("refuses to call a prospective fence provider until the COMMERCE dispatcher exists", async () => {
    const port = fencePort();
    const adapter = new Df13CommerceAuthorityFenceAdapter(port);

    await expect(adapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      inboxIds: ["inbox-1"],
      resolution: resolution("COMMERCE"),
    })).resolves.toMatchObject({
      status: "BLOCKED",
      reasonCode: "DF13_COMMERCE_CONSUMER_DISPATCHER_REQUIRED",
    });
    expect(port.admit).not.toHaveBeenCalled();
  });

  it("permits a bounded cache identity to reach the same default-closed dispatcher boundary", async () => {
    const cacheAdapter = new Df13CommerceAuthorityFenceAdapter(fencePort());
    await expect(cacheAdapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      inboxIds: ["inbox-1"],
      resolution: resolution("COMMERCE", { source: "CACHE" }),
    })).resolves.toMatchObject({
      status: "BLOCKED",
      reasonCode: "DF13_COMMERCE_CONSUMER_DISPATCHER_REQUIRED",
    });
  });

  it("fails closed when a future durable completion acknowledgement is lost", async () => {
    const completionAdapter = new Df13CommerceAuthorityFenceAdapter(fencePort({
      complete: vi.fn(async () => {
        throw new Error("lost acknowledgement");
      }),
    }));
    await expect(completionAdapter.complete({
      status: "COMMERCE_ADMITTED",
      fenceToken: "fence-1",
      acquisition: "NEW",
      workId: "df13-test-work",
      inboxIds: ["inbox-1"],
      authority: {
        modeVersionId: "10000000-0000-4000-8000-000000000006",
        contentHash: "sha256:" + "c".repeat(64),
        pointerRevision: 6,
        source: "DATABASE",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
    }))
      .rejects.toThrow("DF13_FENCE_COMPLETION_UNPROVEN");
  });

  it("durably blocks a configured prospective provider before state, classification, and side-effect planning", async () => {
    const retry = vi.fn(async () => true);
    const deferForAuthorityBlock = vi.fn(async () => true);
    const loadOrCreate = vi.fn();
    const heldAdapter = new Df13CommerceAuthorityFenceAdapter(fencePort());
    const runner = new RealtimeRunner(
      {
        claimNext: vi.fn(async () => ({
          inboxId: "inbox-1",
          pageId,
          eventKey: "meta:1198992073286645:message:fence-held",
          conversationHash: "customer-hash",
          occurredAt: new Date("2026-08-22T00:00:00.000Z"),
          receivedAt: new Date("2026-08-22T00:00:00.000Z"),
          receiveSequence: 1,
          attemptCount: 1,
          leaseToken: "lease-1",
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
              traceId: "10000000-0000-4000-8000-000000000001",
              eventKey: "meta:1198992073286645:message:fence-held",
              pageId,
              messageId: "fence-held",
              senderId: "customer-1",
              conversationId: "customer-hash",
              occurredAt: "2026-08-22T00:00:00.000Z",
              isEcho: false,
              appId: null,
              text: "cho chị xem mẫu này",
              attachments: [],
            },
          },
        })),
        complete: vi.fn(async () => true),
        retry,
        failPermanent: vi.fn(async () => true),
        deferForAuthorityBlock,
      },
      {
        loadOrCreate,
        linkProviderConversation: vi.fn(async () => undefined),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { workerId: "worker-1", mode: "LIVE", sendEnabled: false },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { resolve: vi.fn(async () => resolution("COMMERCE")) },
      heldAdapter,
    );

    await expect(runner.processOne()).resolves.toBe(true);
    expect(deferForAuthorityBlock).toHaveBeenCalledWith(
      "inbox-1",
      "lease-1",
      expect.stringMatching(/^df13-block-[a-f0-9]{64}$/u),
      "DF13_COMMERCE_CONSUMER_DISPATCHER_REQUIRED",
    );
    expect(retry).not.toHaveBeenCalled();
    expect(loadOrCreate).not.toHaveBeenCalled();
  });

  it("retains a native authority-blocked lease when durable deferral is unavailable", async () => {
    const retryBatch = vi.fn(async () => true);
    const failBatchPermanent = vi.fn(async () => true);
    const completeBatch = vi.fn(async () => true);
    const loadOrCreate = vi.fn();
    const inboxId = "inbox-authority-blocked";
    const batch = {
      pageId,
      conversationHash: "customer-hash",
      generation: 9,
      leaseToken: "lease-authority-blocked",
      inboxIds: [inboxId],
      evaluationGroupId: "authority-blocked-batch",
      eventKind: "CUSTOMER" as const,
      firstReceiveSequence: 1,
      lastReceiveSequence: 1,
      attemptCount: 5,
      items: [{
        inboxId,
        pageId,
        eventKey: "meta:1198992073286645:message:authority-blocked",
        conversationHash: "customer-hash",
        occurredAt: new Date("2026-08-22T00:00:00.000Z"),
        receivedAt: new Date("2026-08-22T00:00:00.000Z"),
        receiveSequence: 1,
        attemptCount: 5,
        leaseToken: "lease-authority-blocked",
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
            traceId: "10000000-0000-4000-8000-000000000001",
            eventKey: "meta:1198992073286645:message:authority-blocked",
            pageId,
            messageId: "authority-blocked",
            senderId: "customer-1",
            conversationId: "customer-hash",
            occurredAt: "2026-08-22T00:00:00.000Z",
            isEcho: false,
            appId: null,
            text: "cho chị xem mẫu này",
            attachments: [],
          },
        },
      }],
    };
    const runner = new RealtimeRunner(
      {
        claimNext: vi.fn(async () => null),
        claimNextBatch: vi.fn(async () => batch),
        complete: vi.fn(async () => true),
        completeBatch,
        retry: vi.fn(async () => true),
        retryBatch,
        failPermanent: vi.fn(async () => true),
        failBatchPermanent,
      },
      {
        loadOrCreate,
        linkProviderConversation: vi.fn(async () => undefined),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { workerId: "worker-1", mode: "LIVE", sendEnabled: false },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { resolve: vi.fn(async () => resolution("COMMERCE")) },
      new Df13CommerceAuthorityFenceAdapter(),
    );

    await expect(runner.processOne()).resolves.toBe(true);
    expect(completeBatch).not.toHaveBeenCalled();
    expect(retryBatch).not.toHaveBeenCalled();
    expect(failBatchPermanent).not.toHaveBeenCalled();
    expect(loadOrCreate).not.toHaveBeenCalled();
  });

  it("retains an attempt-5 lease when a COMMERCE fence completion acknowledgement is lost", async () => {
    const retry = vi.fn(async () => true);
    const failPermanent = vi.fn(async () => true);
    const complete = vi.fn(async () => true);
    const admission = {
      status: "COMMERCE_ADMITTED" as const,
      fenceToken: "fence-1",
      acquisition: "NEW" as const,
      workId: "df13-completion-unproven",
      inboxIds: ["inbox-completion-unproven"],
      authority: {
        modeVersionId: "10000000-0000-4000-8000-000000000006",
        contentHash: "sha256:" + "c".repeat(64),
        pointerRevision: 6,
        source: "DATABASE" as const,
        salesAuthorityMode: "COMMERCE" as const,
        stateReadMode: "LEGACY" as const,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
    };
    const completeFence = vi.fn(async () => {
      throw new Error("lost acknowledgement");
    });
    const completionAdapter = {
      admit: vi.fn(async () => admission),
      complete: completeFence,
    } as unknown as Df13CommerceAuthorityFenceAdapter;
    const occurredAt = "2026-08-23T00:00:00.000Z";
    const initial = createConversationState({
      conversationId: "conversation-completion-unproven",
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    const duplicateState = {
      ...initial,
      revision: 1,
      lastFence: 1,
      lastEvent: {
        eventKey: "meta:1198992073286645:message:completion-unproven",
        occurredAt,
        receiveSequence: 1,
      },
    };
    const runner = new RealtimeRunner(
      {
        claimNext: vi.fn(async () => ({
          inboxId: "inbox-completion-unproven",
          pageId,
          eventKey: "meta:1198992073286645:message:completion-unproven",
          conversationHash: "customer-hash",
          occurredAt: new Date(occurredAt),
          receivedAt: new Date(occurredAt),
          receiveSequence: 1,
          attemptCount: 5,
          leaseToken: "lease-completion-unproven",
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
              traceId: "10000000-0000-4000-8000-000000000001",
              eventKey: "meta:1198992073286645:message:completion-unproven",
              pageId,
              messageId: "completion-unproven",
              senderId: "customer-1",
              conversationId: "customer-hash",
              occurredAt,
              isEcho: false,
              appId: null,
              text: "có được đổi trả không",
              attachments: [],
            },
          },
        })),
        complete,
        retry,
        failPermanent,
      },
      {
        loadOrCreate: vi.fn(async () => ({
          conversationId: "conversation-completion-unproven",
          pageId,
          customerHash: "customer-hash",
          stateVersion: 1,
          state: duplicateState,
          routingOwner: "APP" as const,
          appSendEnabled: false,
          killSwitch: false,
        })),
        linkProviderConversation: vi.fn(async () => undefined),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {
        observe: vi.fn(async ({ now }: { now: Date }) => ({
          schemaVersion: 1 as const,
          verified: true,
          blockingTag: null,
          observedTagIds: [],
          observedAt: now.toISOString(),
          reasonCode: null,
        })),
      },
      { workerId: "worker-1", mode: "LIVE", sendEnabled: false },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { resolve: vi.fn(async () => resolution("COMMERCE")) },
      completionAdapter,
    );

    await expect(runner.processOne()).resolves.toBe(true);
    expect(completeFence).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
    expect(failPermanent).not.toHaveBeenCalled();
  });
});
