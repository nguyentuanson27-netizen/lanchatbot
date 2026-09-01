import { describe, expect, it, vi } from "vitest";
import {
  behaviorModeContentHash,
  type RuntimeBehaviorModeResolution,
} from "@lana/chat-runtime";
import type { RealtimeCommitInput, RealtimeCommitResult } from "@lana/database";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE } from "./df13-commerce-authority-bundle.js";
import type {
  Df13CommerceActivationAuthority,
  Df13CommerceFenceBoundCommitter,
} from "./df13-commerce-default-off-consumer.js";
import type { Df13CommerceFenceProvider } from "./df13-commerce-fence-dispatcher.js";
import {
  Df13CommerceRuntimeExecutor,
} from "./df13-commerce-runtime-executor.js";
import type { RealtimeRuntimePort } from "./realtime-runner.js";

const resolution: RuntimeBehaviorModeResolution = {
  confirmationMode: "LEGACY",
  salesAuthorityMode: "COMMERCE",
  stateReadMode: "LEGACY",
  authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash,
  modeVersionId: "10000000-0000-4000-8000-000000000001",
  contentHash: behaviorModeContentHash({
    confirmationMode: "LEGACY",
    salesAuthorityMode: "COMMERCE",
    stateReadMode: "LEGACY",
    authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash,
  }),
  pointerRevision: 7,
  source: "DATABASE",
  status: "RESOLVED",
  reasonCodes: [],
  pointerUpdatedAt: "2026-08-24T00:00:00.000Z",
  resolvedAt: "2026-08-24T00:00:00.000Z",
  propagationMs: 0,
  auditWrite: "RECORDED",
  authorityProvenance: "COMMERCE_POINTER",
};

const input = {
  pageId: "1198992073286645",
  channel: "MESSENGER",
  workId: "commerce-work-1",
  inboxIds: ["10000000-0000-4000-8000-000000000010"],
  resolution,
};

function dependencies() {
  const activationAuthority: Df13CommerceActivationAuthority = {
    authorizeExactCommerceIdentity: vi.fn(async () => ({ status: "ADMITTED" as const })),
    authorizeExactCommerceRequest: vi.fn(async () => ({ status: "ADMITTED" as const })),
  };
  const fenceProvider: Df13CommerceFenceProvider = {
    acquire: vi.fn(async () => ({
      status: "HELD" as const,
      lease: { fenceToken: "10000000-0000-4000-8000-000000000011", epoch: 3 },
    })),
  };
  const fenceCommitter: Df13CommerceFenceBoundCommitter<{ revision: number }> = {
    commitAuthorityDependentWork: vi.fn(async () => ({
      status: "COMPLETED" as const,
      epoch: 3,
      runtime: { stateCommitted: true } as RealtimeCommitResult,
    })),
  };
  return { activationAuthority, fenceProvider, fenceCommitter };
}

describe("DF13 Commerce runtime executor", () => {
  it("is the resolver-facing Commerce admission boundary and remains source-disabled by default", async () => {
    const ports = dependencies();
    ports.activationAuthority.authorizeExactCommerceIdentity = vi.fn(async () => ({
      status: "SOURCE_DISABLED" as const,
    }));
    const executor = new Df13CommerceRuntimeExecutor(ports);

    await expect(executor.admitCommerceAuthority({
      pageId: input.pageId,
      channel: input.channel,
      modeVersionId: resolution.modeVersionId!,
      contentHash: resolution.contentHash!,
      pointerRevision: resolution.pointerRevision!,
      authorityBundleHash: resolution.authorityBundleHash!,
      source: "DATABASE",
    })).resolves.toEqual({ status: "REJECTED" });

    expect(ports.activationAuthority.authorizeExactCommerceIdentity).toHaveBeenCalledOnce();
    expect(ports.fenceProvider.acquire).not.toHaveBeenCalled();
  });

  it("does not expose fence dependencies to reflective callers", () => {
    const executor = new Df13CommerceRuntimeExecutor(dependencies());
    const reflected = executor as unknown as { dependencies?: unknown };

    expect(reflected.dependencies).toBeUndefined();
    expect(Reflect.ownKeys(executor)).not.toContain("dependencies");
  });

  it("admits only an exact Commerce identity, then holds the full bundle before work starts", async () => {
    const ports = dependencies();
    const executor = new Df13CommerceRuntimeExecutor(ports);

    const acquired = await executor.acquire(input);

    expect(acquired).toMatchObject({
      status: "HELD",
      request: {
        pageId: input.pageId,
        channel: input.channel,
        workId: input.workId,
        consumers: [
          "CLASSIFICATION", "COMMERCE_STATE", "CONTEXT_V2", "DERIVED_PHASE",
          "STRATEGY", "CTA", "FINAL_RECONCILIATION", "SIDE_EFFECT_PLAN",
        ],
      },
    });
    expect(ports.activationAuthority.authorizeExactCommerceIdentity).toHaveBeenCalledWith({
      pageId: input.pageId,
      channel: input.channel,
      modeVersionId: resolution.modeVersionId,
      contentHash: resolution.contentHash,
      authorityBundleHash: resolution.authorityBundleHash,
      pointerRevision: resolution.pointerRevision,
      source: "DATABASE",
    });
    expect(ports.activationAuthority.authorizeExactCommerceRequest).toHaveBeenCalledOnce();
    expect(ports.fenceProvider.acquire).toHaveBeenCalledOnce();
  });

  it("fails closed before the activation or fence provider when the identity is stale or incomplete", async () => {
    const ports = dependencies();
    const executor = new Df13CommerceRuntimeExecutor(ports);

    await expect(executor.acquire({
      ...input,
      resolution: { ...resolution, source: "CACHE" },
    })).resolves.toMatchObject({ status: "BLOCKED" });

    expect(ports.activationAuthority.authorizeExactCommerceIdentity).not.toHaveBeenCalled();
    expect(ports.activationAuthority.authorizeExactCommerceRequest).not.toHaveBeenCalled();
    expect(ports.fenceProvider.acquire).not.toHaveBeenCalled();
  });

  it("keeps the raw executor unable to commit and exposes completion only through its finalizer", async () => {
    const ports = dependencies();
    const executor = new Df13CommerceRuntimeExecutor(ports);
    const acquired = await executor.acquire(input);
    if (acquired.status !== "HELD") throw new Error("TEST_HELD_REQUIRED");
    const runtimeCommit = {
      pageId: input.pageId,
      customerHash: "customer-hash",
      conversationId: "10000000-0000-4000-8000-000000000012",
      expectedStateVersion: 4,
      state: { revision: 5 },
      inboxBatchGuard: {
        generation: 1,
        leaseToken: "10000000-0000-4000-8000-000000000013",
        inboxIds: input.inboxIds,
      },
    } satisfies RealtimeCommitInput<{ revision: number }>;

    expect((executor as { readonly commit?: unknown }).commit).toBeUndefined();
    const finalizer = executor.createFinalizingExecutor();
    const lowerRuntime = finalizer.wrapRuntime({
      loadOrCreate: vi.fn(),
      linkProviderConversation: vi.fn(),
      commit: vi.fn(),
    } as unknown as RealtimeRuntimePort);
    const runnerRuntime = new Proxy(lowerRuntime, {
      get(target, property) { return Reflect.get(target, property, target); },
    }) as RealtimeRuntimePort;
    finalizer.bindFinalizationRuntime(runnerRuntime);

    await expect(finalizer.commitThroughFinalizers({ acquired, runtimeCommit, now: new Date() })).resolves.toMatchObject({
      status: "COMPLETED",
      epoch: 3,
    });
    expect(ports.fenceCommitter.commitAuthorityDependentWork).toHaveBeenCalledWith({
      request: acquired.request,
      lease: acquired.lease,
      runtimeCommit,
    });
  });
});
