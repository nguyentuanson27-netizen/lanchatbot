import { describe, expect, it, vi } from "vitest";
import type { RealtimeCommitInput } from "@lana/database";
import type { ConversationState } from "@lana/conversation-engine";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import type { RealtimeRuntimePort } from "./realtime-runner.js";
import { Df13CommerceRuntimeFinalizationAdapter } from "./df13-commerce-runtime-finalization.js";

const acquired = {
  status: "HELD" as const,
  request: {
    pageId: "1198992073286645",
    channel: "MESSENGER",
    workId: "10000000-0000-4000-8000-000000000001",
    inboxIds: ["10000000-0000-4000-8000-000000000002"],
    consumers: [
      "CLASSIFICATION",
      "COMMERCE_STATE",
      "CONTEXT_V2",
      "DERIVED_PHASE",
      "STRATEGY",
      "CTA",
      "FINAL_RECONCILIATION",
      "SIDE_EFFECT_PLAN",
    ] as const,
    authority: {
      salesAuthorityMode: "COMMERCE" as const,
      stateReadMode: "LEGACY" as const,
      modeVersionId: "10000000-0000-4000-8000-000000000003",
      contentHash: `sha256:${"a".repeat(64)}`,
      pointerRevision: 1,
      authorityBundleHash: "b".repeat(64),
      source: "DATABASE" as const,
    },
  },
  lease: {
    fenceToken: "10000000-0000-4000-8000-000000000004",
    epoch: 1,
  },
};

const runtimeCommit = {
  pageId: "1198992073286645",
} as unknown as RealtimeCommitInput<ConversationState, SalesCycleRuntimeState>;

function runtimeWith(commit: ReturnType<typeof vi.fn>): RealtimeRuntimePort {
  return {
    loadOrCreate: vi.fn(),
    linkProviderConversation: vi.fn(),
    commit,
  } as unknown as RealtimeRuntimePort;
}

describe("DF13 Commerce runtime finalization adapter", () => {
  it("passes the final BF01/BF02-shaped input to the fenced transaction, never the base runtime", async () => {
    const baseCommit = vi.fn();
    const fenceCommit = vi.fn(async () => ({
      status: "COMPLETED" as const,
      epoch: 1,
      runtime: {
        stateCommitted: true,
        metaOutboxCreated: 1,
        pancakeTagOutboxCreated: false,
        handoffEventCreated: false,
        sendAuthorized: true,
        reasonCodes: [],
        inboxBatchStatus: "COMMITTED" as const,
      },
    }));
    const adapter = new Df13CommerceRuntimeFinalizationAdapter({
      acquire: vi.fn(),
      commit: fenceCommit,
    });
    const lowerRuntime = adapter.wrapRuntime(runtimeWith(baseCommit));
    const bf02Runtime = new Proxy(lowerRuntime, {
      get(target, property) {
        if (property !== "commit") return Reflect.get(target, property, target);
        return async (
          input: Parameters<RealtimeRuntimePort["commit"]>[0],
          now?: Date,
        ) => target.commit({
          ...input,
          decisionEvents: [{ reasonCodes: ["BF02_VERIFIED_CONTEXT_PRESERVED"] }],
        } as never, now);
      },
    }) as RealtimeRuntimePort;
    const bf01Runtime = new Proxy(bf02Runtime, {
      get(target, property) {
        if (property !== "commit") return Reflect.get(target, property, target);
        return async (
          input: Parameters<RealtimeRuntimePort["commit"]>[0],
          now?: Date,
        ) => target.commit({
          ...input,
          metaPlan: {
            replyPlanId: "10000000-0000-4000-8000-000000000005",
            responseGroupId: "10000000-0000-4000-8000-000000000006",
            recipientId: "controlled-tester",
            messages: [{ kind: "TEXT", text: "Đã được BF01 đối soát." }],
            sendAfterOwnerHandoff: false,
          },
        } as never, now);
      },
    }) as RealtimeRuntimePort;

    adapter.bindFinalizationRuntime(bf01Runtime);

    await expect(adapter.commitThroughFinalizers({
      acquired,
      runtimeCommit,
      now: new Date("2026-08-24T00:00:00.000Z"),
    })).resolves.toMatchObject({ status: "COMPLETED" });

    expect(baseCommit).not.toHaveBeenCalled();
    expect(fenceCommit).toHaveBeenCalledWith(expect.objectContaining({
      acquired,
      runtimeCommit: expect.objectContaining({
        metaPlan: expect.objectContaining({
          messages: [{ kind: "TEXT", text: "Đã được BF01 đối soát." }],
        }),
        decisionEvents: [{ reasonCodes: ["BF02_VERIFIED_CONTEXT_PRESERVED"] }],
      }),
    }));
  });

  it("rejects the adapter's lower runtime instead of certifying it as finalizer-complete", () => {
    const adapter = new Df13CommerceRuntimeFinalizationAdapter({
      acquire: vi.fn(),
      commit: vi.fn(),
    });

    expect(() => adapter.bindFinalizationRuntime(adapter.wrapRuntime(runtimeWith(vi.fn()))))
      .toThrow("DF13_COMMERCE_FINALIZATION_LOWER_RUNTIME_FORBIDDEN");
  });

  it("fails closed before any base commit when the runner did not bind a finalization runtime", async () => {
    const baseCommit = vi.fn();
    const fenceCommit = vi.fn();
    const adapter = new Df13CommerceRuntimeFinalizationAdapter({
      acquire: vi.fn(),
      commit: fenceCommit,
    });

    await expect(adapter.commitThroughFinalizers({
      acquired,
      runtimeCommit,
      now: new Date("2026-08-24T00:00:00.000Z"),
    })).rejects.toThrow("DF13_COMMERCE_FINALIZATION_ROUTER_UNAVAILABLE");

    expect(baseCommit).not.toHaveBeenCalled();
    expect(fenceCommit).not.toHaveBeenCalled();
  });

  it("fails closed before either commit when an intervening wrapper strips the one-shot capability", async () => {
    const baseCommit = vi.fn();
    const fenceCommit = vi.fn();
    const adapter = new Df13CommerceRuntimeFinalizationAdapter({
      acquire: vi.fn(),
      commit: fenceCommit,
    });
    const lowerRuntime = adapter.wrapRuntime(runtimeWith(baseCommit));
    const strippingRuntime = new Proxy(lowerRuntime, {
      get(target, property) {
        if (property !== "commit") return Reflect.get(target, property, target);
        return async (
          input: Parameters<RealtimeRuntimePort["commit"]>[0],
          now?: Date,
        ) => target.commit(Object.fromEntries(Object.entries(input)) as never, now);
      },
    }) as RealtimeRuntimePort;
    adapter.bindFinalizationRuntime(strippingRuntime);

    await expect(adapter.commitThroughFinalizers({
      acquired,
      runtimeCommit,
      now: new Date("2026-08-24T00:00:00.000Z"),
    })).rejects.toThrow("DF13_COMMERCE_FINALIZATION_CAPABILITY_MISSING");

    expect(baseCommit).not.toHaveBeenCalled();
    expect(fenceCommit).not.toHaveBeenCalled();
  });

  it("does not expose a mutable executor or sealed runtime through reflection", async () => {
    const baseCommit = vi.fn();
    const fenceCommit = vi.fn();
    const adapter = new Df13CommerceRuntimeFinalizationAdapter({
      acquire: vi.fn(),
      commit: fenceCommit,
    });
    const reflected = adapter as unknown as {
      executor?: { commit: (...input: unknown[]) => unknown };
      finalizationRuntime?: RealtimeRuntimePort;
    };

    expect(reflected.executor).toBeUndefined();
    reflected.finalizationRuntime = runtimeWith(baseCommit);

    await expect(adapter.commitThroughFinalizers({
      acquired,
      runtimeCommit,
      now: new Date("2026-08-24T00:00:00.000Z"),
    })).rejects.toThrow("DF13_COMMERCE_FINALIZATION_ROUTER_UNAVAILABLE");

    expect(baseCommit).not.toHaveBeenCalled();
    expect(fenceCommit).not.toHaveBeenCalled();
  });
});
