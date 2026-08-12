import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import {
  classifyCustomerUrlsForInbound,
  FailClosedTagObservationProvider,
  RealtimeRunner,
  type RealtimeInboxPort,
  type RealtimeMediaRecognitionPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
} from "./realtime-runner.js";

const occurredAt = "2026-08-12T08:00:00.000Z";
const pageId = "1198992073286645";
const conversationId = "43820fd4-daa7-4917-9835-a38cb55120e5";

function imageAttachments(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    type: "image",
    url: `https://scontent.xx.fbcdn.net/media-limit-${index + 1}.jpg`,
  }));
}

function createHarness(input: {
  imageCount: number;
  text?: string | null;
  loseFirstCommitAck?: boolean;
}) {
  const state = createConversationState({
    conversationId,
    routingOwner: "APP",
    now: new Date(occurredAt),
  });
  const claim = {
    inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
    pageId,
    eventKey: `meta:${pageId}:message:media-limit`,
    conversationHash: "meta:v1:customer-media-limit",
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: 44,
    attemptCount: 1,
    leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c",
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
        traceId: "3021af34-c98c-4086-a33c-3ecb2ad8f8f2",
        eventKey: `meta:${pageId}:message:media-limit`,
        pageId,
        messageId: "media-limit",
        senderId: "customer-1",
        conversationId: "meta:v1:customer-media-limit",
        occurredAt,
        isEcho: false,
        appId: null,
        text: input.text ?? null,
        attachments: imageAttachments(input.imageCount),
      },
    },
  };
  const retryClaim = {
    ...claim,
    attemptCount: 2,
    leaseToken: "68c52ee9-9348-481d-a366-a6178618da3d",
  };
  let persistedState = state;
  let persistedStateVersion = 0;
  const committedInputs: unknown[] = [];
  const commit = vi.fn(async (commitInput: { state: typeof state }) => {
    committedInputs.push(commitInput);
    persistedState = commitInput.state;
    persistedStateVersion += 1;
    if (input.loseFirstCommitAck) throw new Error("COMMIT_ACK_LOST");
    return {
      stateCommitted: true,
      metaOutboxCreated: 0,
      pancakeTagOutboxCreated: true,
      handoffEventCreated: true,
      sendAuthorized: false,
      reasonCodes: [],
    };
  });
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn(async () => ({
      conversationId,
      pageId,
      customerHash: claim.conversationHash,
      stateVersion: persistedStateVersion,
      state: persistedState,
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    })),
    commit,
    linkProviderConversation: vi.fn(async () => undefined),
  };
  const complete = vi.fn(async () => true);
  const retry = vi.fn(async () => true);
  const inbox: RealtimeInboxPort = {
    claimNext: vi.fn()
      .mockResolvedValueOnce(claim)
      .mockResolvedValueOnce(input.loseFirstCommitAck ? retryClaim : null)
      .mockResolvedValue(null),
    complete,
    retry,
    failPermanent: vi.fn(),
  };
  const model: RealtimeModelPort = {
    generate: vi.fn(),
    groundWithFacts: vi.fn(),
  };
  const facts = {
    ready: vi.fn(async () => true),
    resolve: vi.fn(),
    close: vi.fn(async () => undefined),
  };
  const productSearch: RealtimeProductSearchPort = {
    searchText: vi.fn(),
    searchImage: vi.fn(),
    searchImages: vi.fn(),
  };
  const recognize = vi.fn(async () => ({
    status: "NOT_FOUND" as const,
    candidates: [],
    reasonCode: "MEDIA_NOT_FOUND",
    telemetry: {
      pipelineVersion: "media-limit-red-test",
      normalizedImageHash: "a".repeat(64),
      raw: [],
      cutout: [],
      rawGap: null,
      cutoutGap: null,
      channelsAgree: true,
      cutoutStatus: "OK" as const,
      cutoutErrorCode: null,
      aiReason: null,
      aiDecision: null,
      aiModel: null,
      aiPromptVersion: null,
      aiLatencyMs: null,
      cacheHit: false,
      latencyMs: {
        normalize: 1,
        rawSearch: 1,
        cutout: 1,
        cutoutSearch: 1,
        ai: 0,
        total: 4,
      },
    },
  }));
  const mediaRecognition: RealtimeMediaRecognitionPort = { recognize };
  const runner = new RealtimeRunner(
    inbox,
    runtime,
    model,
    facts,
    productSearch,
    new FailClosedTagObservationProvider(),
    {
      workerId: "worker-1",
      mode: "LIVE",
      sendEnabled: true,
      employeeTagId: "25",
      decisionTelemetryEnabled: true,
      mediaRecognitionEnabled: true,
      mediaRecognitionPageIds: [pageId],
    },
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    mediaRecognition,
  );
  return {
    runner,
    claim,
    commit,
    committedInputs,
    complete,
    retry,
    model,
    facts,
    productSearch,
    recognize,
  };
}

describe("RealtimeRunner media input safety limit", () => {
  it("bypasses URL classification entirely when the image limit is exceeded", () => {
    const classify = vi.fn(() => {
      throw new Error("CUSTOMER_URL_CLASSIFIER_MUST_NOT_RUN");
    });

    const decision = classifyCustomerUrlsForInbound(
      "https://example.com/private?token=must-not-leak",
      "CLASSIFIED_ALLOWLIST_V1",
      true,
      classify,
    );

    expect(classify).not.toHaveBeenCalled();
    expect(decision).toEqual(expect.objectContaining({
      disposition: "CONTINUE",
      items: [],
      reasonCodes: [],
    }));
  });

  it("continues through the normal media pipeline for exactly ten images", async () => {
    const scenario = createHarness({ imageCount: 10 });

    expect(await scenario.runner.processOne()).toBe(true);

    expect(scenario.recognize).toHaveBeenCalledTimes(10);
    expect(scenario.commit).toHaveBeenCalledOnce();
    expect(scenario.committedInputs[0]).not.toEqual(expect.objectContaining({
      handoffEventPlan: expect.objectContaining({ reasonCode: "MEDIA_INPUT_LIMIT_EXCEEDED" }),
    }));
  });

  it("silently hands off eleven images before every media, product, model, fact, grounding, or reply side effect", async () => {
    const scenario = createHarness({ imageCount: 11 });

    expect(await scenario.runner.processOne()).toBe(true);

    expect(scenario.recognize).not.toHaveBeenCalled();
    expect(scenario.productSearch.searchImages).not.toHaveBeenCalled();
    expect(scenario.productSearch.searchImage).not.toHaveBeenCalled();
    expect(scenario.productSearch.searchText).not.toHaveBeenCalled();
    expect(scenario.model.generate).not.toHaveBeenCalled();
    expect(scenario.model.groundWithFacts).not.toHaveBeenCalled();
    expect(scenario.facts.ready).not.toHaveBeenCalled();
    expect(scenario.facts.resolve).not.toHaveBeenCalled();
    expect(scenario.commit).toHaveBeenCalledWith(expect.objectContaining({
      pancakeTagPlan: expect.objectContaining({ desiredTag: "NHAN_VIEN", tagId: "25" }),
      handoffEventPlan: expect.objectContaining({
        source: "BOT_POLICY",
        reasonCode: "MEDIA_INPUT_LIMIT_EXCEEDED",
        reasonDetailSafe: expect.any(Object),
      }),
    }), expect.any(Date));
    expect(JSON.stringify(scenario.committedInputs[0])).not.toContain("scontent.xx.fbcdn.net");
    expect(scenario.commit).toHaveBeenCalledWith(
      expect.not.objectContaining({ metaPlan: expect.anything() }),
      expect.any(Date),
    );
  });

  it("lets the silent media handoff win over mixed text and remains exactly-once after a lost commit acknowledgement", async () => {
    const scenario = createHarness({
      imageCount: 12,
      text: "xin giá SD398 SD375",
      loseFirstCommitAck: true,
    });

    expect(await scenario.runner.processOne()).toBe(true);
    expect(await scenario.runner.processOne()).toBe(true);
    expect(await scenario.runner.processOne()).toBe(false);

    expect(scenario.recognize).not.toHaveBeenCalled();
    expect(scenario.productSearch.searchText).not.toHaveBeenCalled();
    expect(scenario.model.generate).not.toHaveBeenCalled();
    expect(scenario.model.groundWithFacts).not.toHaveBeenCalled();
    expect(scenario.facts.resolve).not.toHaveBeenCalled();
    expect(scenario.commit).toHaveBeenCalledOnce();
    // Inbox retry bookkeeping may repeat after an intentionally lost ACK;
    // the transactional behavior guarantee is that no business side effect
    // is committed a second time.
    expect(scenario.retry).toHaveBeenCalled();
    expect(scenario.committedInputs).toHaveLength(1);
    expect(scenario.committedInputs[0]).toEqual(expect.objectContaining({
      handoffEventPlan: expect.objectContaining({
        source: "BOT_POLICY",
        reasonCode: "MEDIA_INPUT_LIMIT_EXCEEDED",
      }),
    }));
    expect(scenario.committedInputs[0]).not.toEqual(expect.objectContaining({
      metaPlan: expect.anything(),
    }));
  });
});
