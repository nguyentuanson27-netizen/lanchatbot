import { describe, expect, it, vi } from "vitest";
import type { RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
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
      resolution: resolution("COMMERCE"),
    })).resolves.toEqual({
      status: "REJECTED",
      reasonCode: "DF13_FENCE_PROVIDER_REQUIRED",
    });
  });

  it("binds every authority consumer to one exact database-resolved COMMERCE identity", async () => {
    const port = fencePort();
    const adapter = new Df13CommerceAuthorityFenceAdapter(port);

    const admission = await adapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      resolution: resolution("COMMERCE"),
    });

    expect(admission).toMatchObject({
      status: "COMMERCE_ADMITTED",
      fenceToken: "fence-1",
      authority: {
        modeVersionId: "10000000-0000-4000-8000-000000000006",
        pointerRevision: 6,
        source: "DATABASE",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
    });
    expect(port.admit).toHaveBeenCalledWith(expect.objectContaining({
      consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
      workId: "inbox-1",
    }));

    await expect(adapter.complete(admission)).resolves.toEqual("RELEASED");
    expect(port.complete).toHaveBeenCalledWith(expect.objectContaining({
      fenceToken: "fence-1",
      workId: "inbox-1",
    }));
  });

  it("retains a held work item rather than converting it into an unfenced admission", async () => {
    const port = fencePort({
      admit: vi.fn(async () => ({
        status: "HELD" as const,
        fenceToken: "fence-hold",
        reasonCode: "DF13_CUTOVER_IN_PROGRESS",
      })),
    });
    const adapter = new Df13CommerceAuthorityFenceAdapter(port);

    const admission = await adapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      resolution: resolution("COMMERCE"),
    });

    expect(admission).toEqual({
      status: "HELD",
      fenceToken: "fence-hold",
      reasonCode: "DF13_CUTOVER_IN_PROGRESS",
    });
    await expect(adapter.complete(admission)).resolves.toEqual("NOT_APPLICABLE");
    expect(port.complete).not.toHaveBeenCalled();
  });

  it("rejects stale, cache-derived, or identity-mismatched COMMERCE acknowledgement", async () => {
    const cacheAdapter = new Df13CommerceAuthorityFenceAdapter(fencePort());
    await expect(cacheAdapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      resolution: resolution("COMMERCE", { source: "CACHE" }),
    })).resolves.toEqual({
      status: "REJECTED",
      reasonCode: "DF13_COMMERCE_IDENTITY_NOT_DATABASE_RESOLVED",
    });

    const mismatchedAdapter = new Df13CommerceAuthorityFenceAdapter(fencePort({
      admit: vi.fn(async (input) => ({
        status: "ADMITTED" as const,
        fenceToken: "fence-1",
        authority: { ...input.authority, pointerRevision: input.authority.pointerRevision + 1 },
      })),
    }));
    await expect(mismatchedAdapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      resolution: resolution("COMMERCE"),
    })).resolves.toEqual({
      status: "REJECTED",
      reasonCode: "DF13_FENCE_ADMISSION_IDENTITY_MISMATCH",
    });
  });

  it("fails closed when durable admission or completion cannot be proven", async () => {
    const unavailableAdapter = new Df13CommerceAuthorityFenceAdapter(fencePort({
      admit: vi.fn(async () => {
        throw new Error("store unavailable");
      }),
    }));
    await expect(unavailableAdapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      resolution: resolution("COMMERCE"),
    })).resolves.toEqual({
      status: "REJECTED",
      reasonCode: "DF13_FENCE_ADMISSION_UNAVAILABLE",
    });

    const completionAdapter = new Df13CommerceAuthorityFenceAdapter(fencePort({
      complete: vi.fn(async () => {
        throw new Error("lost acknowledgement");
      }),
    }));
    const admission = await completionAdapter.admit({
      pageId,
      channel: "MESSENGER",
      workId: "inbox-1",
      resolution: resolution("COMMERCE"),
    });
    await expect(completionAdapter.complete(admission))
      .rejects.toThrow("DF13_FENCE_COMPLETION_UNPROVEN");
  });

  it("holds a RealtimeRunner batch before state, classification, and side-effect planning", async () => {
    const deferForAuthorityFence = vi.fn(async () => true);
    const loadOrCreate = vi.fn();
    const heldAdapter = new Df13CommerceAuthorityFenceAdapter(fencePort({
      admit: vi.fn(async () => ({
        status: "HELD" as const,
        fenceToken: "fence-hold",
        reasonCode: "DF13_CUTOVER_IN_PROGRESS",
      })),
    }));
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
        retry: vi.fn(async () => true),
        failPermanent: vi.fn(async () => true),
        deferForAuthorityFence,
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
    expect(deferForAuthorityFence).toHaveBeenCalledWith(
      "inbox-1",
      "lease-1",
      "fence-hold",
      "DF13_CUTOVER_IN_PROGRESS",
    );
    expect(loadOrCreate).not.toHaveBeenCalled();
  });
});
