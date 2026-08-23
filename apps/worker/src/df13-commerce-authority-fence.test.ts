import { describe, expect, it, vi } from "vitest";
import type { RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
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
});
