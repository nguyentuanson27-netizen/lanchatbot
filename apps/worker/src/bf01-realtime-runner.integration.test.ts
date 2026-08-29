import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import { canonicalJsonV1, type AgentProposalV1 } from "@lana/contracts";
import type { RealtimeCommitInput, RealtimeCommitResult } from "@lana/database";
import type {
  SalesCycleRuntimeState,
  RuntimeBehaviorModeResolution,
  RuntimePolicyResolution,
  RuntimePolicyResolverPort,
} from "@lana/chat-runtime";
import { behaviorModeContentHash } from "@lana/chat-runtime";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { RealtimeGenerationQuota } from "./realtime-quota.js";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import { DF13_COMMERCE_AUTHORITY_CONSUMERS_V1 } from "./df13-commerce-authority-bundle.js";
import { Df13CommerceRuntimeFinalizationAdapter } from "./df13-commerce-runtime-finalization.js";
import { createRealtimeSalesState } from "./realtime-sales-cycle.js";
import * as realtimeReplyDifferential from "./realtime-reply-differential.js";
import type { RealtimeReplySnapshot } from "./realtime-reply-differential.js";
import {
  RealtimeRunner,
  type RealtimeInboxPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
  type RealtimeTagObservationProvider,
} from "./bf02-realtime-runner.js";

const occurredAt = "2026-08-08T07:00:00.000Z";
const pageId = "1198992073286645";
const conversationHash = "meta:v1:bf01-customer";
const fallbackText = "Chị muốn em làm rõ phần nào để em trả lời đúng ý chị?";
const safeRepairText = "Chị muốn em làm rõ biến thể nào của mẫu này để em trả lời đúng ý chị?";
const existingReplyText = "Chị muốn em nói rõ phần biến thể nào của mẫu này?";

const product = {
  productId: "SD398",
  parentProductId: "SD398",
  canonicalCode: "SD398",
  aliases: [],
  title: "Áo dài SD398",
  colors: [],
  materials: ["lụa"],
  silhouettes: ["suông"],
  occasions: [],
  imageUrls: [],
  images: [],
  catalogVersion: "catalog-v2",
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function renderedReplyHash(text: string): string {
  return sha256(JSON.stringify([{
    kind: "TEXT",
    valueHash: sha256(text),
  }]));
}

function guardedClarificationPlanHash(text: string): string {
  return sha256(JSON.stringify({
    action: "REPLY",
    productId: null,
    handoffReason: null,
    blockedReasonCodes: [],
    textUnitHashes: [sha256(text)],
    imageCount: 0,
  }));
}

function proposal(
  action: AgentProposalV1["action"],
  reply = "",
  factIntent: AgentProposalV1["businessFactQuery"]["intent"] = "NONE",
): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "variant_follow_up",
    conversationStage: "PRODUCT_MATCHED",
    productId: "SD398",
    action,
    reply,
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent: factIntent,
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
    strategyAnalysis: {
      need: "NOT_ENOUGH_CONTEXT",
      barrier: "NONE",
      decisionFactor: "UNKNOWN",
      recommendedStrategy: "STRATEGY_ASK_CLARIFY",
      confidence: 0.9,
      evidence: ["DETERMINISTIC_FALLBACK"],
    },
  };
}

function modelResult(value: AgentProposalV1) {
  return {
    proposal: value,
    modelVersion: "bf01-test-model",
    latencyMs: 5,
    tokenUsage: {
      promptTokenCount: 12,
      candidatesTokenCount: 4,
      totalTokenCount: 16,
    },
  };
}

function policyResolution(): RuntimePolicyResolution {
  return {
    status: "RESOLVED",
    source: "DATABASE",
    mayAffectOutbound: true,
    reasonCodes: [],
    audit: {
      schemaVersion: 1,
      resolutionId: "00000000-0000-4000-8000-000000000001",
      pageId,
      channel: "PUBLISHED",
      status: "RESOLVED",
      source: "DATABASE",
      sideEffects: "LIVE_OUTBOUND",
      bundleId: "runtime:bf01-test",
      bundleHash: `sha256:${"a".repeat(64)}`,
      versionIds: [],
      reasonCodes: [],
      pinScopeType: null,
      pinScopeId: null,
      occurredAt,
    },
    auditWrite: "RECORDED",
    bundle: {
      schemaVersion: 1,
      bundleId: "runtime:bf01-test",
      bundleHash: `sha256:${"a".repeat(64)}`,
      pageId,
      channel: "PUBLISHED",
      sideEffects: "LIVE_OUTBOUND",
      resolvedAt: occurredAt,
      policy: { policyVersion: "bf01-test" } as never,
      versionReferences: [],
      artifacts: {
        shopPolicy: {} as never,
        offerPolicy: {} as never,
        closingStrategy: {
          replyReconciliationPolicy: "CLARIFY_RECONCILED_V1",
          replyReconciliationFallbackText: fallbackText,
        } as never,
        sizeCharts: {},
        handoffMatrix: null,
        paymentPolicy: null,
      },
    },
  };
}

function commerceResolution(): RuntimeBehaviorModeResolution {
  const authorityBundleHash = DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash;
  return {
    confirmationMode: "LEGACY",
    salesAuthorityMode: "COMMERCE",
    stateReadMode: "LEGACY",
    authorityBundleHash,
    modeVersionId: "10000000-0000-4000-8000-000000000011",
    contentHash: behaviorModeContentHash({
      confirmationMode: "LEGACY",
      salesAuthorityMode: "COMMERCE",
      stateReadMode: "LEGACY",
      authorityBundleHash,
    }),
    pointerRevision: 11,
    source: "DATABASE",
    status: "RESOLVED",
    reasonCodes: [],
    pointerUpdatedAt: occurredAt,
    resolvedAt: occurredAt,
    propagationMs: 0,
    auditWrite: "RECORDED",
    authorityProvenance: "COMMERCE_POINTER",
  };
}

type RepairMode = "SAFE" | "UNSAFE" | "THROW";
type InitialMode = "NO_REPLY" | "REPLY";

function createHarness(input: {
  repairMode?: RepairMode;
  initialMode?: InitialMode;
  customerText?: string;
  quotaResults?: readonly boolean[];
  conversationOwner?: "BOT" | "HUMAN";
  blockingTag?: "NHAN_VIEN" | null;
  commitAckLostOnce?: boolean;
  commerce?: boolean;
  initialReply?: string;
  initialFactIntent?: AgentProposalV1["businessFactQuery"]["intent"];
  initialProtectedClaimIds?: readonly string[];
} = {}) {
  const base = createConversationState({
    conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
    routingOwner: "APP",
    now: new Date(occurredAt),
  });
  const state = {
    ...base,
    currentProductId: "SD398",
    conversationOwner: input.conversationOwner ?? "BOT",
    tagGateStatus: input.blockingTag ? "BLOCKING" as const : "VERIFIED_ABSENT" as const,
    blockingTag: input.blockingTag ?? null,
    blockingTagVerifiedAt: occurredAt,
    updatedAt: occurredAt,
  };
  const claim = {
    inboxId: "2a9afc47-978a-4b74-9653-3c89e75a89a0",
    pageId,
    eventKey: "meta:1198992073286645:message:bf01-variant",
    conversationHash,
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: 141,
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
        eventKey: "meta:1198992073286645:message:bf01-variant",
        pageId,
        messageId: "bf01-variant",
        senderId: "customer-1",
        conversationId: conversationHash,
        occurredAt,
        isEcho: false,
        appId: null,
        text: input.customerText ?? "có biến thể gì nữa",
        attachments: [],
      },
    },
  };
  const retryClaim = {
    ...claim,
    attemptCount: 2,
    leaseToken: "68c52ee9-9348-481d-a366-a6178618da3d",
  };
  const claimNext = vi.fn();
  if (input.commitAckLostOnce) {
    claimNext
      .mockResolvedValueOnce(claim)
      .mockResolvedValueOnce(retryClaim)
      .mockResolvedValueOnce(null);
  } else {
    claimNext.mockResolvedValueOnce(claim).mockResolvedValueOnce(null);
  }
  const complete = vi.fn(async () => true);
  const retry = vi.fn(async () => true);
  const inbox: RealtimeInboxPort = {
    claimNext,
    complete,
    retry,
    failPermanent: vi.fn(async () => true),
  };

  let persistedState = state;
  let persistedStateVersion = state.revision;
  const commerceState = createRealtimeSalesState(
    state.conversationId,
    pageId,
    new Date(occurredAt),
  );
  const loadCommerceSalesCycle = async <TState,>() => ({
    conversationId: state.conversationId,
    pageId,
    stateRevision: commerceState.revision,
    state: commerceState as unknown as TState,
    cartExpiresAt: null,
    expiresAt: new Date("2026-08-09T07:00:00.000Z"),
  });
  let committed: Parameters<RealtimeRuntimePort["commit"]>[0] | null = null;
  const commit = vi.fn(async (value: Parameters<RealtimeRuntimePort["commit"]>[0]) => {
    committed = value;
    persistedState = value.state as typeof state;
    persistedStateVersion += 1;
    if (input.commitAckLostOnce && commit.mock.calls.length === 1) {
      throw new Error("COMMIT_ACK_LOST");
    }
    return {
      stateCommitted: true,
      metaOutboxCreated: value.metaPlan?.messages.length ?? 0,
      pancakeTagOutboxCreated: false,
      handoffEventCreated: value.handoffEventPlan !== undefined,
      sendAuthorized: true,
      reasonCodes: [],
      inboxBatchStatus: "NOT_REQUESTED" as const,
    };
  });
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn(async () => ({
      conversationId: state.conversationId,
      pageId,
      customerHash: conversationHash,
      stateVersion: persistedStateVersion,
      state: persistedState,
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    })),
    ...(input.commerce
      ? {
          loadOrCreateSalesCycle: loadCommerceSalesCycle,
          readLatestContextV2ForCommerce: vi.fn(async () => ({
            kind: "ABSENT" as const,
            reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_ABSENT" as const,
          })),
        }
      : {}),
    commit,
    linkProviderConversation: vi.fn(async () => undefined),
  };

  const generate = vi.fn(async (
    _context: Parameters<RealtimeModelPort["generate"]>[0],
  ) => {
    if (generate.mock.calls.length === 1) {
      switch (input.initialMode ?? "NO_REPLY") {
        case "REPLY":
          return modelResult({ ...proposal(
            "REPLY",
            input.initialReply ?? existingReplyText,
            input.initialFactIntent ?? "NONE",
          ), protectedClaimIds: input.initialProtectedClaimIds === undefined
            ? undefined
            : [...input.initialProtectedClaimIds] });
        case "NO_REPLY":
          return modelResult(proposal("NO_REPLY"));
      }
    }
    if (input.repairMode === "THROW") throw new Error("BF01_REPAIR_TEST_FAILURE");
    if (input.repairMode === "UNSAFE") {
      return modelResult(proposal(
        "REPLY",
        "Mẫu này giá 1.199.000đ. Chị muốn xem thêm biến thể nào?",
      ));
    }
    return modelResult(proposal("REPLY", safeRepairText));
  });
  const model: RealtimeModelPort = {
    generate,
    groundWithFacts: vi.fn(async (_context, initial) => modelResult(initial)),
  };

  const productSearch: RealtimeProductSearchPort = {
    searchText: vi.fn(async () => ({
      status: "MATCHED" as const,
      matchKind: "SEMANTIC" as const,
      score: 0.95,
      gap: 0.2,
      product,
    })),
    searchImage: vi.fn(async () => ({
      status: "NOT_FOUND" as const,
      reasonCode: "NO_CANDIDATES" as const,
    })),
  };
  const facts = {
    ready: vi.fn(async () => true),
    resolve: vi.fn(async () => ({
      schemaVersion: 1 as const,
      status: "OK" as const,
      source: "POS_SNAPSHOT" as const,
      observedAt: occurredAt,
      expiresAt: "2099-01-01T00:00:00.000Z",
      productId: "SD398",
      facts: {
        schemaVersion: 1 as const,
        productId: "SD398",
        parentProductId: "SD398",
        offerType: "AO_DAI",
        listPriceVnd: null,
        salePriceVnd: 1_199_000,
        sizes: ["M", "L"],
        stockStatus: "IN_STOCK" as const,
        stockQuantity: 2,
        deliveryEta: { minDays: 1, maxDays: 2 },
        fulfillmentPolicy: "READY_STOCK",
        imageUrls: [],
      },
      reasonCode: null,
    })),
    close: vi.fn(async () => undefined),
  } as unknown as BusinessFactsReader;
  const tags: RealtimeTagObservationProvider = {
    observe: vi.fn(async ({ now }) => ({
      schemaVersion: 1 as const,
      verified: true,
      blockingTag: input.blockingTag ?? null,
      observedTagIds: [],
      observedAt: now.toISOString(),
      reasonCode: null,
    })),
  };
  const policyResolver: RuntimePolicyResolverPort = {
    resolve: vi.fn(async () => policyResolution()),
  };

  const quotaResults = [...(input.quotaResults ?? [true, true])];
  const reserve = vi.fn(async () => quotaResults.shift() ?? true);
  const quota: RealtimeGenerationQuota = {
    reserve,
    close: vi.fn(async () => undefined),
  };
  const resolution = input.commerce ? commerceResolution() : undefined;
  const commerceCommit = vi.fn(async (
    _input: Readonly<{ runtimeCommit: RealtimeCommitInput<typeof state, SalesCycleRuntimeState> }>,
  ) => ({
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
  const commerceExecutor = resolution
    ? {
        acquire: vi.fn(async () => ({
          status: "HELD" as const,
          request: {
            pageId,
            channel: "MESSENGER",
            workId: "10000000-0000-4000-8000-000000000012",
            inboxIds: [claim.inboxId],
            consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
            authority: {
              salesAuthorityMode: "COMMERCE" as const,
              stateReadMode: "LEGACY" as const,
              modeVersionId: resolution.modeVersionId!,
              contentHash: resolution.contentHash!,
              pointerRevision: resolution.pointerRevision!,
              authorityBundleHash: resolution.authorityBundleHash!,
              source: "DATABASE" as const,
            },
          },
          lease: {
            fenceToken: "10000000-0000-4000-8000-000000000013",
            epoch: 1,
          },
        })),
        commit: commerceCommit,
      }
    : undefined;
  const canonicalHistory = input.commerce
    ? {
        recordInboundCustomerMessage: vi.fn(async () => ({
          messagePk: "10000000-0000-4000-8000-000000000014",
        })),
        recordOutboundHumanMessage: vi.fn(async () => undefined),
      }
    : undefined;
  const commerceFinalization = commerceExecutor
    ? new Df13CommerceRuntimeFinalizationAdapter(commerceExecutor)
    : undefined;

  const runner = new RealtimeRunner(
    inbox,
    commerceFinalization ? commerceFinalization.wrapRuntime(runtime) : runtime,
    model,
    facts,
    productSearch,
    tags,
    {
      workerId: "worker-bf01",
      mode: "LIVE",
      sendEnabled: true,
      policyChannel: "PUBLISHED",
      decisionTelemetryEnabled: true,
      decisionAuditV2Enabled: true,
      wave2StrategyEnabled: true,
      releaseId: "bf01-test",
      ...(input.commerce
        ? {
            salesCycleEnabled: true,
            contextV2CaptureEnabled: true,
          }
        : {}),
    },
    quota,
    undefined,
    canonicalHistory,
    undefined,
    policyResolver,
    undefined,
    resolution ? { resolve: vi.fn(async () => resolution) } : undefined,
  );
  if (commerceFinalization) runner.bindDf13CommerceExecutor(commerceFinalization);

  return {
    runner,
    generate,
    reserve,
    commit,
    retry,
    complete,
    committed: () => committed,
    commerceCommit,
  };
}

function committedText<TState, TSalesState>(
  value: RealtimeCommitInput<TState, TSalesState> | null | undefined,
): string {
  return (value?.metaPlan?.messages ?? [])
    .filter((message): message is { kind: "TEXT"; text: string } =>
      message.kind === "TEXT"
    )
    .map(({ text }) => text)
    .join("\n");
}

function committedSnapshot<TState, TSalesState>(input: {
  readonly commit: RealtimeCommitInput<TState, TSalesState>;
  readonly result: RealtimeCommitResult;
  readonly inboxCommitted: boolean;
}): RealtimeReplySnapshot {
  const messages = input.commit.metaPlan?.messages ?? [];
  const events = input.commit.decisionEvents ?? [];
  const strategy = events
    .map(({ details }) => details.decisionObservability?.strategyCta ?? null)
    .find((value) => value !== null) ?? null;
  const verifiedFactHashes = [...new Set(events.flatMap((event) => [
    ...(event.details.factQueryResults ?? [])
      .filter(({ status }) => status === "OK")
      .map((fact) => sha256(canonicalJsonV1(fact))),
    ...(event.details.factsSourceVersion
      ? [sha256(canonicalJsonV1({
          productId: event.productId,
          factsStatus: event.details.factsStatus,
          factsSourceVersion: event.details.factsSourceVersion,
        }))]
      : []),
  ]))].sort();
  const protectedClaims = input.commit.metaPlan?.protectedClaims ?? [];
  const effectReadiness = [
    ...(input.commit.metaPlan?.effectReadiness
      ? [input.commit.metaPlan.effectReadiness]
      : []),
    ...(input.commit.salesCyclePlan?.effectReadiness ?? []),
  ];
  const effectAuthorizationHashes = effectReadiness.map((readiness) => sha256(
    canonicalJsonV1({
      schemaVersion: readiness.schemaVersion,
      rulesetVersion: readiness.rulesetVersion,
      effect: readiness.effect,
      outcome: readiness.outcome,
      pageId: readiness.pageId,
      conversationId: readiness.conversationId,
      sourceMessageIdHash: readiness.sourceMessageIdHash,
      conversationRevision: readiness.conversationRevision,
      salesCycleRevision: readiness.salesCycleRevision,
      productIds: readiness.productIds,
      cartId: readiness.cartId,
      cartVersion: readiness.cartVersion,
      cartStateHash: readiness.cartStateHash,
      orderPreviewId: readiness.orderPreviewId,
      orderPreviewHash: readiness.orderPreviewHash,
      buyingIntentHash: readiness.buyingIntentHash,
      // PROTECTED_OUTBOUND binds this hash to the rendered plan, whose wording
      // is compared separately. Transactional effects retain the exact hash.
      deterministicEvidenceHash: readiness.effect === "PROTECTED_OUTBOUND"
        ? "BOUND_TO_PERMITTED_OUTBOUND_MESSAGES"
        : readiness.deterministicEvidenceHash,
      claimSetHash: readiness.claimSetHash,
      protectedClaimTypes: readiness.protectedClaimTypes,
      reasonCodes: readiness.reasonCodes,
      authorization: readiness.authorization,
    }),
  )).sort();
  const generationValid = events.some(({ details }) =>
    details.modelCalled && details.modelPath === "model" && details.modelErrorClass === null
  );
  return {
    messages,
    strategyHash: strategy === null ? null : sha256(canonicalJsonV1(strategy)),
    verifiedFactHashes,
    verifiedMediaUrls: messages.flatMap((message) =>
      message.kind === "IMAGE" ? [message.imageUrl] : []
    ),
    protectedClaimHashes: protectedClaims
      .map((claim) => sha256(canonicalJsonV1(claim)))
      .sort(),
    effectAuthorizationHashes,
    commitOutcome:
      input.result.stateCommitted && input.result.sendAuthorized
        ? "COMMITTED"
        : input.result.reasonCodes.join("|") || "NOT_COMMITTED",
    generationOutcome: generationValid ? "VALID" : "FAILED",
    inboxOutcome:
      input.inboxCommitted || input.result.inboxBatchStatus === "COMMITTED"
        ? "COMMITTED"
        : "RETRYABLE",
    protectedOutbound: {
      required: protectedClaims.length > 0 || effectAuthorizationHashes.length > 0,
      groupId: input.commit.metaPlan?.responseGroupId ?? null,
      plannedMessageCount: messages.length,
      deliveredMessageCount: input.result.metaOutboxCreated,
    },
  };
}

function hasBf01Reason<TState, TSalesState>(
  value: RealtimeCommitInput<TState, TSalesState> | null | undefined,
): boolean {
  return (value?.decisionEvents ?? []).some((event) =>
    event.reasonCodes.some((reason) => reason.startsWith("BF01_"))
  );
}

function unresolvedTerminalNoReplyEvents<TState, TSalesState>(
  value: RealtimeCommitInput<TState, TSalesState> | null | undefined,
) {
  return (value?.decisionEvents ?? []).filter((event) =>
    event.eventType === "NO_REPLY" &&
    event.action === "NO_REPLY" &&
    !event.reasonCodes.some((reason) => reason.includes("SUPERSEDED"))
  );
}

describe("BF-01 runner reconciliation", () => {
  it("runs B2.3a r31.3 differential against the captured pre-B2.3a exact-head snapshot", async () => {
    const capturedInput = {
      customerText: "Mẫu SD398 giá bao nhiêu, có size M hay L?",
      modelReply:
        "Mẫu SD398 giá 1.199.000đ chị nhé. Chị muốn chọn size M hay L? Chị thích form ôm hay suông?",
      factIntent: "PRICE" as const,
    };
    const runCandidate = async (
      capture: Readonly<typeof capturedInput>,
    ): Promise<RealtimeReplySnapshot> => {
        const harness = createHarness({
          commerce: true,
          initialMode: "REPLY",
          customerText: capture.customerText,
          initialReply: capture.modelReply,
          initialFactIntent: capture.factIntent,
        });
        expect(await harness.runner.processOne()).toBe(true);
        const commit = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
        if (!commit) throw new Error("TRACK_B_B22_CAPTURED_COMMIT_MISSING");
        const exactClaims = commit.metaPlan?.protectedClaims ?? [];
        expect(exactClaims.length).toBeGreaterThan(0);
        expect(exactClaims.every(({ authorization }) =>
          authorization === "NONE"
        )).toBe(true);
        expect(exactClaims.map(({ claimId }) => claimId)).toEqual([
          ...new Set(exactClaims.map(({ claimId }) => claimId)),
        ]);
        const rawResult = harness.commerceCommit.mock.results[0];
        if (!rawResult || rawResult.type !== "return") {
          throw new Error("TRACK_B_B22_CAPTURED_COMMIT_RESULT_MISSING");
        }
        const result = (await rawResult.value).runtime;
        return committedSnapshot({
          commit,
          result,
          inboxCommitted: harness.complete.mock.calls.length === 1,
        });
    };

    // Immutable capture produced by exact pre-B2.3a head
    // 89b1bee02109e17b6b3b2a0e714e24d3bdb70a60 for capturedInput above.
    const preB23aBaseline: RealtimeReplySnapshot = {
      messages: [{ kind: "TEXT", text: capturedInput.modelReply }],
      strategyHash: "28f64d412aa3b9b39aaa67463039f5a466eb539408b5a8df48cdaf187e1336ed",
      verifiedFactHashes: ["a0729ee1acaa2436299b46f6e046eaaa0561f3152ab27463d55cc850d8431da6"],
      verifiedMediaUrls: [],
      protectedClaimHashes: ["30fb4cce7bccfcc904b7f2d35673bd49985ebb2b54771f66002d88ad703994f3"],
      effectAuthorizationHashes: ["319ff1eb352e3c9df42b7de78445a4ca8dfac01019424f7f6f793019dddc0c4a"],
      commitOutcome: "COMMITTED",
      generationOutcome: "VALID",
      inboxOutcome: "COMMITTED",
      protectedOutbound: {
        required: true,
        groupId: "37a4d2be-f544-5ec8-86c5-8e2e04faff77",
        plannedMessageCount: 1,
        deliveredMessageCount: 1,
      },
    };
    const candidateSnapshots: RealtimeReplySnapshot[] = [];
    const result = await realtimeReplyDifferential.runRealtimeReplyDifferential({
      capturedInput,
      baseline: async () => preB23aBaseline,
      candidate: async (capture) => {
        const snapshot = await runCandidate(capture);
        candidateSnapshots.push(snapshot);
        return snapshot;
      },
      permittedDifferences: [],
    });

    expect(result.differences).toEqual([]);
    expect(result).toMatchObject({
      status: "MATCH",
      sideEffects: "DISABLED",
    });
    const candidateSnapshot = candidateSnapshots[0];
    if (candidateSnapshot === undefined) {
      throw new Error("TRACK_B_B23A_CANDIDATE_SNAPSHOT_MISSING");
    }
    expect(preB23aBaseline.verifiedFactHashes.length).toBeGreaterThan(0);
    expect(preB23aBaseline.protectedClaimHashes.length).toBeGreaterThan(0);
    expect(preB23aBaseline.effectAuthorizationHashes.length).toBeGreaterThan(0);
    expect(preB23aBaseline).toMatchObject({
      commitOutcome: "COMMITTED",
      inboxOutcome: "COMMITTED",
      protectedOutbound: { required: true },
    });
    expect(candidateSnapshot).toMatchObject({
      verifiedFactHashes: preB23aBaseline.verifiedFactHashes,
      protectedClaimHashes: preB23aBaseline.protectedClaimHashes,
      effectAuthorizationHashes: preB23aBaseline.effectAuthorizationHashes,
      commitOutcome: "COMMITTED",
      inboxOutcome: "COMMITTED",
      protectedOutbound: {
        required: true,
        groupId: preB23aBaseline.protectedOutbound.groupId,
        plannedMessageCount: preB23aBaseline.protectedOutbound.plannedMessageCount,
        deliveredMessageCount: preB23aBaseline.protectedOutbound.deliveredMessageCount,
      },
    });
    expect(candidateSnapshot.protectedOutbound.plannedMessageCount).toBeGreaterThan(0);
    expect(candidateSnapshot.protectedOutbound.deliveredMessageCount).toBe(
      candidateSnapshot.protectedOutbound.plannedMessageCount,
    );
  });

  it("blocks the whole live-path group for a model-declared claim without typed evidence", async () => {
    const missingClaimId = "55555555-5555-5555-8555-555555555555";
    const modelReply = "Mẫu này có thiết kế thanh lịch chị nhé.";
    const harness = createHarness({
      commerce: true,
      initialMode: "REPLY",
      initialReply: modelReply,
      initialProtectedClaimIds: [missingClaimId],
    });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
    expect(commit).toBeDefined();
    expect(committedText(commit)).not.toContain(modelReply);
    expect(commit?.decisionEvents?.flatMap(({ reasonCodes }) => reasonCodes)).toContain(
      `PROTECTED_CLAIM_EVIDENCE_MISSING:${missingClaimId}`,
    );
  });

  it.each([
    "Mẫu này hiện vẫn còn chị nhé.",
    "Mẫu này còn chị nhé.",
  ])("blocks an undeclared contextual stock assertion as a whole live group: %s", async (modelReply) => {
    const harness = createHarness({
      commerce: true,
      initialMode: "REPLY",
      initialReply: modelReply,
    });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
    expect(commit).toBeDefined();
    expect(committedText(commit)).not.toContain(modelReply);
    expect(commit?.decisionEvents?.flatMap(({ reasonCodes }) => reasonCodes)).toContain(
      "PROTECTED_CLAIM_UNDECLARED:STOCK",
    );
  });

  it("routes a held Commerce commit through BF01 reconciliation before the fenced transaction", async () => {
    const harness = createHarness({ commerce: true });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.commerceCommit).toHaveBeenCalledOnce();
    const committed = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
    expect(committed).toBeDefined();
    if (!committed) throw new Error("DF13_COMMERCE_TEST_COMMIT_MISSING");
    expect(committedText(committed)).toBe(safeRepairText);
    expect(hasBf01Reason(committed)).toBe(true);
    expect(harness.generate).toHaveBeenCalledTimes(2);
    expect(harness.commit).not.toHaveBeenCalled();
  });

  it("seals the bound Commerce executor from constructor or reflective replacement", async () => {
    // The production constructor has fourteen supported inputs. A fifteenth
    // executor-shaped argument must not be an alternate authority entrypoint.
    expect(RealtimeRunner.length).toBe(14);
    const harness = createHarness({ commerce: true });
    const injectedExecutor = {
      acquire: vi.fn(),
      bindFinalizationRuntime: vi.fn(),
      commitThroughFinalizers: vi.fn(),
    };
    const reflected = harness.runner as unknown as { commerceExecutor?: unknown };
    expect(Reflect.ownKeys(harness.runner)).not.toContain("commerceExecutor");
    // A caller may create an unrelated public property, but it cannot replace
    // the native-private authority selected by the composition root.
    reflected.commerceExecutor = injectedExecutor;
    expect(await harness.runner.processOne()).toBe(true);
    expect(injectedExecutor.acquire).not.toHaveBeenCalled();
    expect(injectedExecutor.commitThroughFinalizers).not.toHaveBeenCalled();
    expect(harness.commerceCommit).toHaveBeenCalledOnce();
    expect(harness.commit).not.toHaveBeenCalled();
  });

  it("commits exactly one guarded reply and matching audit hashes for the reported incident", async () => {
    const harness = createHarness();

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.committed();
    expect(harness.generate).toHaveBeenCalledTimes(2);
    expect(harness.reserve).toHaveBeenCalledTimes(2);
    expect(commit?.metaPlan?.messages).toEqual([
      { kind: "TEXT", text: safeRepairText },
    ]);

    const clarificationEvents = (commit?.decisionEvents ?? []).filter((event) =>
      event.eventType === "CLARIFICATION_REQUESTED"
    );
    expect(clarificationEvents).toHaveLength(1);
    expect(unresolvedTerminalNoReplyEvents(commit)).toEqual([]);

    const reconciled = commit?.decisionEvents?.find((event) =>
      event.reasonCodes.includes("BF01_ASK_CLARIFY_NO_REPLY_RECONCILED")
    );
    expect(reconciled).toMatchObject({
      action: "REPLY",
      reasonCodes: expect.arrayContaining([
        "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED",
        "BF01_MODEL_CLARIFICATION_REPAIR",
      ]),
      details: {
        guardedPlanHash: guardedClarificationPlanHash(safeRepairText),
        outboundMessageCount: 1,
        renderedReplyHash: renderedReplyHash(safeRepairText),
        decisionObservability: {
          reconciliation: {
            contractVersion: "BF01_RECONCILIATION_V1",
            outcome: "OVERRIDDEN",
            reasonCodes: expect.arrayContaining([
              "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED",
              "BF01_MODEL_CLARIFICATION_REPAIR",
            ]),
          },
          sideEffectPlan: {
            disposition: "PLANNED",
            effectTypes: expect.arrayContaining(["META_OUTBOX"]),
          },
        },
      },
    });
  });

  it("rejects an unsafe repair and commits only the approved guarded fallback", async () => {
    const harness = createHarness({ repairMode: "UNSAFE" });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.committed();
    expect(harness.generate).toHaveBeenCalledTimes(2);
    expect(committedText(commit)).toBe(fallbackText);
    expect(committedText(commit)).not.toContain("1.199.000");
    const reconciled = commit?.decisionEvents?.find((event) =>
      event.reasonCodes.includes("BF01_APPROVED_FALLBACK_USED")
    );
    expect(reconciled).toMatchObject({
      reasonCodes: expect.arrayContaining(["BF01_APPROVED_FALLBACK_USED"]),
      details: {
        guardedPlanHash: guardedClarificationPlanHash(fallbackText),
        modelCalled: true,
        modelLatencyMs: 10,
        modelTokenUsage: {
          prompt: 24,
          output: 8,
          total: 32,
        },
      },
    });
  });

  it("uses the approved fallback when repair generation fails without fabricating provider telemetry", async () => {
    const harness = createHarness({ repairMode: "THROW" });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.committed();
    expect(harness.generate).toHaveBeenCalledTimes(2);
    expect(committedText(commit)).toBe(fallbackText);
    const reconciled = commit?.decisionEvents?.find((event) =>
      event.reasonCodes.includes("BF01_APPROVED_FALLBACK_USED")
    );
    expect(reconciled).toMatchObject({
      details: {
        guardedPlanHash: guardedClarificationPlanHash(fallbackText),
        modelCalled: true,
        modelLatencyMs: 5,
        modelTokenUsage: {
          prompt: 12,
          output: 4,
          total: 16,
        },
      },
    });
  });

  it("does not make the repair model call when the second quota reservation fails", async () => {
    const harness = createHarness({ quotaResults: [true, false] });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.committed();
    expect(harness.reserve).toHaveBeenCalledTimes(2);
    expect(harness.generate).toHaveBeenCalledTimes(1);
    expect(committedText(commit)).toBe(fallbackText);
    expect(commit?.decisionEvents).toContainEqual(expect.objectContaining({
      reasonCodes: expect.arrayContaining([
        "BF01_REPAIR_QUOTA_UNAVAILABLE",
        "BF01_APPROVED_FALLBACK_USED",
      ]),
    }));
  });

  it("does not reconcile through human ownership or a blocking tag", async () => {
    const human = createHarness({ conversationOwner: "HUMAN" });
    expect(await human.runner.processOne()).toBe(true);
    expect(human.generate).toHaveBeenCalledTimes(0);
    expect(human.committed()?.metaPlan).toBeUndefined();

    const blocked = createHarness({ blockingTag: "NHAN_VIEN" });
    expect(await blocked.runner.processOne()).toBe(true);
    expect(blocked.generate).toHaveBeenCalledTimes(0);
    expect(blocked.committed()?.metaPlan).toBeUndefined();
  });

  it("does not add a second plan when the core already produced outbound", async () => {
    const harness = createHarness({ initialMode: "REPLY" });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.committed();
    expect(harness.generate).toHaveBeenCalledTimes(1);
    expect(harness.reserve).toHaveBeenCalledTimes(1);
    expect(commit?.metaPlan?.messages.length).toBeGreaterThan(0);
    expect(hasBf01Reason(commit)).toBe(false);
  });

  it("does not override an existing core handoff", async () => {
    const harness = createHarness({ customerText: "cho gặp nhân viên" });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.committed();
    expect(harness.generate).toHaveBeenCalledTimes(0);
    expect(harness.reserve).toHaveBeenCalledTimes(0);
    expect(commit?.state.conversationOwner).toBe("HUMAN");
    expect(commit?.handoffEventPlan?.source).toBe("CUSTOMER_REQUEST");
    expect(hasBf01Reason(commit)).toBe(false);
  });

  it("isolates accepted-runner context across concurrent executions", async () => {
    const firstText = "foundation concurrent context alpha";
    const secondText = "foundation concurrent context beta";
    const first = createHarness({ initialMode: "REPLY", customerText: firstText });
    const second = createHarness({ initialMode: "REPLY", customerText: secondText });

    await Promise.all([
      first.runner.processOne(),
      second.runner.processOne(),
    ]);

    const customerTexts = (
      generate: typeof first.generate,
    ): string[] => (generate.mock.calls[0]?.[0] ?? [])
      .filter(({ senderType }) => senderType === "CUSTOMER")
      .map(({ text }) => text);
    expect(customerTexts(first.generate)).toContain(firstText);
    expect(customerTexts(first.generate)).not.toContain(secondText);
    expect(customerTexts(second.generate)).toContain(secondText);
    expect(customerTexts(second.generate)).not.toContain(firstText);
    expect(first.commit).toHaveBeenCalledOnce();
    expect(second.commit).toHaveBeenCalledOnce();
  });

  it("keeps one deterministic clarification side effect across commit ACK loss and replay", async () => {
    const harness = createHarness({ commitAckLostOnce: true });

    expect(await harness.runner.processOne()).toBe(true);
    expect(await harness.runner.processOne()).toBe(true);
    expect(await harness.runner.processOne()).toBe(false);

    expect(harness.generate).toHaveBeenCalledTimes(2);
    expect(harness.reserve).toHaveBeenCalledTimes(2);
    expect(harness.commit).toHaveBeenCalledTimes(1);
    expect(harness.retry).toHaveBeenCalledTimes(1);
    expect(harness.complete).toHaveBeenCalledTimes(1);

    const commit = harness.committed();
    expect(commit?.metaPlan?.messages).toEqual([
      { kind: "TEXT", text: safeRepairText },
    ]);
    const clarificationEvents = (commit?.decisionEvents ?? []).filter((event) =>
      event.eventType === "CLARIFICATION_REQUESTED"
    );
    expect(clarificationEvents).toHaveLength(1);
    expect(new Set(clarificationEvents.map((event) => event.eventId)).size).toBe(1);
    expect(unresolvedTerminalNoReplyEvents(commit)).toEqual([]);
  });
});
