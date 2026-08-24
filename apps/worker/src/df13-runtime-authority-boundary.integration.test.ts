import { describe, expect, it, vi } from "vitest";
import { behaviorModeContentHash, type RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import {
  FailClosedTagObservationProvider,
  RealtimeRunner,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
} from "./realtime-runner.js";

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

describe("DF13 authority selection in the actual RealtimeRunner path", () => {
  it("blocks a rejected COMMERCE-origin pointer before model, state, or final commit work", async () => {
    const retry = vi.fn(async () => true);
    const inbox: RealtimeInboxPort = {
      claimNext: vi.fn(async () => claim),
      complete: vi.fn(async () => true),
      retry,
      failPermanent: vi.fn(async () => true),
    };
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
      inbox,
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
      {
        resolve: vi.fn(async () => commerceOriginFailSafe),
      },
    );

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
    const retry = vi.fn(async () => true);
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
    const runtime: RealtimeRuntimePort = {
      loadOrCreate: vi.fn(),
      commit: vi.fn(),
      linkProviderConversation: vi.fn(),
    };
    const model: RealtimeModelPort = { generate: vi.fn(), groundWithFacts: vi.fn() };
    const search: RealtimeProductSearchPort = { searchText: vi.fn(), searchImage: vi.fn() };
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
      { resolve: vi.fn(async () => exactCommerce) },
    );

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
});
