import { describe, expect, it, vi } from "vitest";
import { behaviorModeContentHash, type RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
import { createConversationState } from "@lana/conversation-engine";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import { DF13_COMMERCE_AUTHORITY_CONSUMERS_V1 } from "./df13-commerce-authority-bundle.js";
import {
  Df13CommerceRuntimeFinalizationAdapter,
  type Df13CommerceFinalizingExecutorPort,
} from "./df13-commerce-runtime-finalization.js";
import type { Df13CommerceFreshProcessExecutorPort } from "./df13-commerce-fresh-process-executor.js";
import { createRealtimeSalesState } from "./realtime-sales-cycle.js";
import {
  DryRunClearTagObservationProvider,
  FailClosedTagObservationProvider,
  RealtimeRunner,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
} from "./bf02-realtime-runner.js";

const occurredAt = "2026-08-24T00:00:00.000Z";
const claim = {
  inboxId: "10000000-0000-4000-8000-000000000001",
  pageId: "1198992073286645",
  eventKey: "df13:authority-boundary:test",
  conversationHash: "customer-hash",
  occurredAt: new Date(occurredAt),
  receivedAt: new Date(occurredAt),
  receiveSequence: 1,
  attemptCount: 1,
  leaseToken: "10000000-0000-4000-8000-000000000002",
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
      traceId: "10000000-0000-4000-8000-000000000003",
      eventKey: "df13:authority-boundary:test",
      pageId: "1198992073286645",
      messageId: "df13-authority-boundary-test",
      senderId: "controlled-tester",
      conversationId: "customer-hash",
      occurredAt,
      isEcho: false,
      appId: null,
      text: "xin chào",
      attachments: [],
    },
  },
};

const commerceOriginFailSafe: RuntimeBehaviorModeResolution = {
  confirmationMode: "CLARIFY_ONLY",
  salesAuthorityMode: "LEGACY",
  stateReadMode: "LEGACY",
  authorityBundleHash: null,
  modeVersionId: "10000000-0000-4000-8000-000000000010",
  contentHash: `sha256:${"a".repeat(64)}`,
  pointerRevision: 9,
  source: "FAIL_SAFE",
  status: "REJECTED",
  reasonCodes: ["RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_REJECTED"],
  pointerUpdatedAt: occurredAt,
  resolvedAt: occurredAt,
  propagationMs: 0,
  auditWrite: "RECORDED",
  authorityProvenance: "COMMERCE_POINTER",
};

function runnerForAuthority(
  resolution: RuntimeBehaviorModeResolution,
  commerceExecutor?: Df13CommerceFinalizingExecutorPort,
): Readonly<{
  runner: RealtimeRunner;
  retry: ReturnType<typeof vi.fn>;
  runtime: RealtimeRuntimePort;
  model: RealtimeModelPort;
  search: RealtimeProductSearchPort;
}> {
  const retry = vi.fn(async () => true);
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn(),
    commit: vi.fn(),
    linkProviderConversation: vi.fn(),
  };
  const model: RealtimeModelPort = {
    generate: vi.fn(),
    groundWithFacts: vi.fn(),
  };
  const search: RealtimeProductSearchPort = {
    searchText: vi.fn(),
    searchImage: vi.fn(),
  };
  const runner = new RealtimeRunner(
      {
        claimNext: vi.fn(async () => claim),
        complete: vi.fn(async () => true),
        retry,
        failPermanent: vi.fn(async () => true),
      },
      runtime,
      model,
      { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() },
      search,
      new FailClosedTagObservationProvider(),
      { workerId: "df13-boundary-test", mode: "DRY_RUN", sendEnabled: false },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { resolve: vi.fn(async () => resolution) },
  );
  if (commerceExecutor) runner.bindDf13CommerceExecutor(commerceExecutor);
  return {
    retry,
    runtime,
    model,
    search,
    runner,
  };
}

describe("DF13 authority selection in the deployed BF01/BF02 RealtimeRunner path", () => {
  it("rejects replacing the Commerce executor after the wrapper stack is bound", () => {
    const first = {
      acquire: vi.fn(),
      bindFinalizationRuntime: vi.fn(),
      commitThroughFinalizers: vi.fn(),
    } as unknown as Df13CommerceFinalizingExecutorPort;
    const second = {
      acquire: vi.fn(),
      bindFinalizationRuntime: vi.fn(),
      commitThroughFinalizers: vi.fn(),
    } as unknown as Df13CommerceFinalizingExecutorPort;
    const { runner } = runnerForAuthority(commerceOriginFailSafe, first);

    expect(() => runner.bindDf13CommerceExecutor(second))
      .toThrow("DF13_COMMERCE_EXECUTOR_REBIND_FORBIDDEN");
  });

  it("blocks a rejected COMMERCE-origin pointer before model, state, or final commit work", async () => {
    const { runner, retry, runtime, model, search } = runnerForAuthority(commerceOriginFailSafe);

    expect(await runner.processOne()).toBe(true);
    expect(retry).toHaveBeenCalledWith(
      claim.inboxId,
      claim.leaseToken,
      "DF13_RUNTIME_COMMERCE_IDENTITY_NOT_ADMISSIBLE",
      expect.any(Number),
    );
    expect(runtime.loadOrCreate).not.toHaveBeenCalled();
    expect(runtime.commit).not.toHaveBeenCalled();
    expect(model.generate).not.toHaveBeenCalled();
    expect(model.groundWithFacts).not.toHaveBeenCalled();
    expect(search.searchText).not.toHaveBeenCalled();
  });

  it("never routes an admitted COMMERCE identity into the LEGACY pipeline while source remains default-off", async () => {
    const exactCommerce: RuntimeBehaviorModeResolution = {
      ...commerceOriginFailSafe,
      confirmationMode: "LEGACY",
      salesAuthorityMode: "COMMERCE",
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      contentHash: behaviorModeContentHash({
        confirmationMode: "LEGACY",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      }),
      source: "DATABASE",
      status: "RESOLVED",
    };
    const { runner, retry, runtime, model, search } = runnerForAuthority(exactCommerce);

    expect(await runner.processOne()).toBe(true);
    expect(retry).toHaveBeenCalledWith(
      claim.inboxId,
      claim.leaseToken,
      "DF13_COMMERCE_EXECUTOR_UNAVAILABLE",
      expect.any(Number),
    );
    expect(runtime.loadOrCreate).not.toHaveBeenCalled();
    expect(runtime.commit).not.toHaveBeenCalled();
    expect(model.generate).not.toHaveBeenCalled();
    expect(model.groundWithFacts).not.toHaveBeenCalled();
    expect(search.searchText).not.toHaveBeenCalled();
  });

  it("acquires the dedicated Commerce executor boundary before any legacy state or model work", async () => {
    const exactCommerce: RuntimeBehaviorModeResolution = {
      ...commerceOriginFailSafe,
      confirmationMode: "LEGACY",
      salesAuthorityMode: "COMMERCE",
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      contentHash: behaviorModeContentHash({
        confirmationMode: "LEGACY",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      }),
      source: "DATABASE",
      status: "RESOLVED",
    };
    const acquire = vi.fn(async () => ({
      status: "PARKED" as const,
      reasonCode: "DF13_COMMERCE_FENCE_UNAVAILABLE",
    }));
    const commerceExecutor = {
      acquire,
      bindFinalizationRuntime: vi.fn(),
      commitThroughFinalizers: vi.fn(),
    } as unknown as Df13CommerceFinalizingExecutorPort;
    const { runner, retry, runtime, model, search } = runnerForAuthority(
      exactCommerce,
      commerceExecutor,
    );

    expect(await runner.processOne()).toBe(true);
    expect(acquire).toHaveBeenCalledWith(expect.objectContaining({
      pageId: claim.pageId,
      channel: "MESSENGER",
      inboxIds: [claim.inboxId],
      resolution: exactCommerce,
    }));
    expect(retry).toHaveBeenCalledWith(
      claim.inboxId,
      claim.leaseToken,
      "DF13_COMMERCE_FENCE_UNAVAILABLE",
      expect.any(Number),
    );
    expect(runtime.loadOrCreate).not.toHaveBeenCalled();
    expect(model.generate).not.toHaveBeenCalled();
    expect(search.searchText).not.toHaveBeenCalled();
  });

  it("fresh-process Commerce rechecks immutable authority before state or model work without a 0036 fence", async () => {
    const exactCommerce: RuntimeBehaviorModeResolution = {
      ...commerceOriginFailSafe,
      confirmationMode: "LEGACY",
      salesAuthorityMode: "COMMERCE",
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      contentHash: behaviorModeContentHash({
        confirmationMode: "LEGACY",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      }),
      source: "DATABASE",
      status: "RESOLVED",
    };
    const assertExactCommerceAuthority = vi.fn(async () => ({
      status: "BLOCKED" as const,
      reasonCode: "DF13_COMMERCE_RELEASE_EVIDENCE_INVALID",
    }));
    const freshAuthority = {
      admitCommerceAuthority: vi.fn(),
      assertExactCommerceAuthority,
    } as Df13CommerceFreshProcessExecutorPort;
    const { runner, retry, runtime, model, search } = runnerForAuthority(exactCommerce);
    runner.bindDf13CommerceFreshProcessAuthority(freshAuthority);

    expect(await runner.processOne()).toBe(true);
    expect(assertExactCommerceAuthority).toHaveBeenCalledWith({
      pageId: claim.pageId,
      channel: "MESSENGER",
      modeVersionId: exactCommerce.modeVersionId,
      contentHash: exactCommerce.contentHash,
      authorityBundleHash: exactCommerce.authorityBundleHash,
      pointerRevision: exactCommerce.pointerRevision,
      source: "DATABASE",
    });
    expect(retry).toHaveBeenCalledWith(
      claim.inboxId,
      claim.leaseToken,
      "DF13_COMMERCE_RELEASE_EVIDENCE_INVALID",
      expect.any(Number),
    );
    expect(runtime.loadOrCreate).not.toHaveBeenCalled();
    expect(model.generate).not.toHaveBeenCalled();
    expect(search.searchText).not.toHaveBeenCalled();
  });

  it("bootstraps a pristine Commerce conversation through the held fence and captures its first Context V2 snapshot", async () => {
    const exactCommerce: RuntimeBehaviorModeResolution = {
      ...commerceOriginFailSafe,
      confirmationMode: "LEGACY",
      salesAuthorityMode: "COMMERCE",
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      contentHash: behaviorModeContentHash({
        confirmationMode: "LEGACY",
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      }),
      source: "DATABASE",
      status: "RESOLVED",
    };
    const state = createConversationState({
      conversationId: "10000000-0000-4000-8000-000000000020",
      routingOwner: "APP",
      now: new Date(occurredAt),
    });
    const commerceState = createRealtimeSalesState(
      state.conversationId,
      claim.pageId,
      new Date(occurredAt),
    );
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(async () => ({
        conversationId: state.conversationId,
        pageId: claim.pageId,
        customerHash: claim.conversationHash,
        stateVersion: state.revision,
        state,
        routingOwner: "APP" as const,
        appSendEnabled: true,
        killSwitch: false,
      })),
      loadOrCreateSalesCycle: async <TState>() => ({
        conversationId: state.conversationId,
        pageId: claim.pageId,
        stateRevision: commerceState.revision,
        state: commerceState as unknown as TState,
        cartExpiresAt: null,
        expiresAt: new Date("2026-08-25T00:00:00.000Z"),
      }),
      readLatestContextV2ForCommerce: vi.fn(async () => ({
        kind: "ABSENT" as const,
        reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_ABSENT" as const,
      })),
      commit: vi.fn(),
      linkProviderConversation: vi.fn(),
    };
    const acquire = vi.fn(async () => ({
      status: "HELD" as const,
      request: {
        pageId: claim.pageId,
        channel: "MESSENGER",
        workId: "10000000-0000-4000-8000-000000000021",
        inboxIds: [claim.inboxId],
        consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
        authority: {
          salesAuthorityMode: "COMMERCE" as const,
          stateReadMode: "LEGACY" as const,
          modeVersionId: exactCommerce.modeVersionId!,
          contentHash: exactCommerce.contentHash!,
          pointerRevision: exactCommerce.pointerRevision!,
          authorityBundleHash: exactCommerce.authorityBundleHash!,
          source: "DATABASE" as const,
        },
      },
      lease: { fenceToken: "10000000-0000-4000-8000-000000000022", epoch: 1 },
    }));
    const commit = vi.fn(async () => ({
      status: "COMPLETED" as const,
      epoch: 1,
      runtime: {
        stateCommitted: true,
        metaOutboxCreated: 0,
        pancakeTagOutboxCreated: false,
        handoffEventCreated: false,
        sendAuthorized: false,
        reasonCodes: [],
        inboxBatchStatus: "COMMITTED" as const,
      },
    }));
    const model: RealtimeModelPort = {
      generate: vi.fn(),
      groundWithFacts: vi.fn(),
    };
    const retry = vi.fn(async () => true);
    const commerceExecutor = { acquire, commit };
    const commerceFinalization = new Df13CommerceRuntimeFinalizationAdapter(commerceExecutor);
    const runner = new RealtimeRunner(
      {
        claimNext: vi.fn(async () => ({
          ...claim,
          envelope: {
            ...claim.envelope,
            message: { ...claim.envelope.message, text: "chính sách đổi trả thế nào" },
          },
        })),
        complete: vi.fn(async () => true),
        retry,
        failPermanent: vi.fn(async () => true),
      },
      commerceFinalization.wrapRuntime(runtime),
      model,
      { ready: vi.fn(), resolve: vi.fn(), close: vi.fn() },
      { searchText: vi.fn(), searchImage: vi.fn() },
      new DryRunClearTagObservationProvider("DRY_RUN"),
      {
        workerId: "df13-commerce-test",
        mode: "DRY_RUN",
        sendEnabled: false,
        salesCycleEnabled: true,
        contextV2CaptureEnabled: true,
      },
      undefined,
      undefined,
      {
        recordInboundCustomerMessage: vi.fn(async () => ({
          messagePk: "10000000-0000-4000-8000-000000000023",
        })),
        recordOutboundHumanMessage: vi.fn(async () => undefined),
      },
      undefined,
      undefined,
      undefined,
      { resolve: vi.fn(async () => exactCommerce) },
    );
    runner.bindDf13CommerceExecutor(commerceFinalization);

    expect(await runner.processOne()).toBe(true);
    expect(acquire).toHaveBeenCalledOnce();
    expect(runtime.readLatestContextV2ForCommerce).toHaveBeenCalledOnce();
    expect(model.generate).not.toHaveBeenCalled();
    expect(runtime.commit).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      acquired: expect.objectContaining({ status: "HELD" }),
      runtimeCommit: expect.objectContaining({
        pageId: claim.pageId,
        contextV2CapturePlan: expect.objectContaining({
          capture: expect.objectContaining({
            sourceMessagePk: "10000000-0000-4000-8000-000000000023",
            status: "BUILT",
          }),
        }),
      }),
    }));
  });
});
