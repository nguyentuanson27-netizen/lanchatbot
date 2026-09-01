import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import {
  canonicalJsonV1,
  type AgentProposalV1,
  type CustomerProfileV1,
} from "@lana/contracts";
import type { RealtimeCommitInput, RealtimeCommitResult } from "@lana/database";
import type {
  SalesCycleRuntimeState,
  RuntimeBehaviorModeResolution,
  RuntimePolicyResolution,
  RuntimePolicyResolverPort,
} from "@lana/chat-runtime";
import { behaviorModeContentHash } from "@lana/chat-runtime";
import {
  CUSTOMER_URL_EXPLANATION_SYSTEM_INSTRUCTION,
  GROUNDED_DRAFT_SYSTEM_INSTRUCTION,
  GROUNDED_SYSTEM_INSTRUCTION,
  SHADOW_SYSTEM_INSTRUCTION,
  SIZE_CLAIM_REPAIR_SYSTEM_INSTRUCTION,
  structuredVertexGenerationIdentity,
} from "./vertex.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { RealtimeGenerationQuota } from "./realtime-quota.js";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE } from "./df13-commerce-authority-bundle.js";
import { DF13_COMMERCE_AUTHORITY_CONSUMERS_V1 } from "./df13-commerce-authority-bundle.js";
import { Df13CommerceRuntimeFinalizationAdapter } from "./df13-commerce-runtime-finalization.js";
import { createRealtimeSalesState } from "./realtime-sales-cycle.js";
import {
  compareCommerceAuthority,
  projectCommerceAuthorityCandidate,
} from "./commerce-authority-comparison.js";
import * as realtimeReplyDifferential from "./realtime-reply-differential.js";
import type { RealtimeReplySnapshot } from "./realtime-reply-differential.js";
import {
  runTrackBLivePathReplay,
  type TrackBLivePathReplayCase,
  type TrackBReplayIdentity,
  type TrackBReplayObservation,
} from "./track-b-live-path-replay.js";
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
const fixtureModelVersion = "bf01-test-model";

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

function buyingIntentSignals(
  requestedAction: NonNullable<
    NonNullable<AgentProposalV1["salesSignals"]>["buyingIntent"]
  >["requestedAction"],
  evidenceText: string,
): NonNullable<AgentProposalV1["salesSignals"]> {
  const textField = { value: null, evidenceText: null, confidence: 0 } as const;
  return {
    checkoutExtraction: {
      fullName: textField,
      phone: textField,
      address: textField,
      paymentMethod: textField,
    },
    purchaseConfirmation: {
      decision: "UNCLEAR",
      evidenceText: null,
      confidence: 0,
    },
    buyingIntent: {
      decision: "COMMITTED",
      requestedAction,
      quantity: null,
      evidenceText,
      confidence: 0.9,
    },
  };
}

function modelResult(value: AgentProposalV1) {
  return {
    proposal: value,
    modelVersion: fixtureModelVersion,
    latencyMs: 5,
    tokenUsage: {
      promptTokenCount: 12,
      candidatesTokenCount: 4,
      totalTokenCount: 16,
    },
  };
}

function policyResolution(input: { readonly customerUrlPolicyEnabled?: boolean } = {}): RuntimePolicyResolution {
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
          ...(input.customerUrlPolicyEnabled
            ? { customerUrlPolicy: "CLASSIFIED_ALLOWLIST_V1" as const }
            : {}),
        } as never,
        sizeCharts: {},
        handoffMatrix: null,
        paymentPolicy: null,
      },
    },
  };
}

function sizePolicyResolution(): RuntimePolicyResolution {
  const base = policyResolution();
  if (base.status !== "RESOLVED") throw new Error("BF04_POLICY_FIXTURE_INVALID");
  const resolved = {
    ...base,
    bundle: {
      ...base.bundle!,
      versionReferences: [{
        artifactKey: "ao-dai-dress",
        artifactKind: "SIZE_CHART",
        lifecycle: "PUBLISHED",
      }],
      artifacts: {
        ...base.bundle!.artifacts,
        sizeCharts: {
          "ao-dai-dress": {
            chart: {
              schemaVersion: 1,
              reference: {
                chartId: "ao-dai-dress",
                version: "1",
                source: "IMAGE_EXTRACTION",
                sourceArtifactRef: "https://cdn.example/ao-dai-size.jpg",
                sourceContentSha256: "d".repeat(64),
                verificationStatus: "VERIFIED",
                verifiedByRef: "admin:owner",
                verifiedAt: occurredAt,
              },
              brand: "LANA",
              category: "AO_DAI",
              componentRole: "DRESS",
              boundaryPolicy: "REQUIRE_HUMAN_REVIEW",
              bands: [{
                size: "M",
                ranges: [
                  { kind: "HEIGHT_CM", minInclusive: 155, maxInclusive: 168 },
                  { kind: "WEIGHT_KG", minInclusive: 50, maxInclusive: 57 },
                ],
                note: null,
              }],
            },
            scope: {
              level: "COMPONENT",
              parentProductIds: ["SD398"],
              categories: ["AO_DAI"],
              componentRole: "DRESS",
              forms: [],
              materials: [],
            },
            extraction: {
              measurementBasis: "BODY",
              confidence: 1,
              extractorVersion: "fixture",
            },
            sourceMetadata: {
              sourceReference: "https://cdn.example/ao-dai-size.jpg",
            },
          },
        },
      },
    },
  };
  return resolved as unknown as RuntimePolicyResolution;
}

function sizeProfile(): CustomerProfileV1 {
  return {
    schemaVersion: 1,
    profileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
    customerKey: {
      namespace: "lana-customer-v1",
      algorithm: "HMAC_SHA256",
      digest: "a".repeat(64),
    },
    revision: 2,
    measurements: [
      {
        kind: "HEIGHT_CM",
        value: 160,
        provenance: {
          source: "CUSTOMER_MESSAGE",
          sourceEventHash: "b".repeat(64),
          observedAt: occurredAt,
          confidence: 1,
        },
      },
      {
        kind: "WEIGHT_KG",
        value: 53,
        provenance: {
          source: "CUSTOMER_MESSAGE",
          sourceEventHash: "c".repeat(64),
          observedAt: occurredAt,
          confidence: 1,
        },
      },
    ],
    fitPreference: null,
    preferences: { colors: [], styles: [], materials: [] },
    sizeHistory: [],
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

function commerceResolution(): RuntimeBehaviorModeResolution {
  const authorityBundleHash = DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash;
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
  initialRequestedAction?: NonNullable<
    NonNullable<AgentProposalV1["salesSignals"]>["buyingIntent"]
  >["requestedAction"];
  initialFactIntent?: AgentProposalV1["businessFactQuery"]["intent"];
  initialProtectedClaimIds?: readonly string[];
  sizeFixture?: boolean;
  sizeRepairMode?: "VALID" | "INVALID" | "THROW";
  sizeRepairReply?: string;
  initialGenerateMode?: "VALID" | "THROW";
  factsMode?: "OK" | "STALE" | "NOT_FOUND";
  liveGroundedConfig?: boolean;
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
  const runtime = {
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
    ...(input.sizeFixture
      ? {
          loadOrCreateCustomerProfile: vi.fn(async () => ({
            pageId,
            customerHash: conversationHash,
            revision: sizeProfile().revision,
            profile: sizeProfile(),
            fieldEvidence: {},
            expiresAt: new Date("2099-01-01T00:00:00.000Z"),
          })),
          compareAndSwapCustomerProfile: vi.fn(async () => true),
        }
      : {}),
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
  } as unknown as RealtimeRuntimePort;

  const generate = vi.fn(async (
    _context: Parameters<RealtimeModelPort["generate"]>[0],
  ) => {
    if (generate.mock.calls.length === 1) {
      if (input.initialGenerateMode === "THROW") {
        throw new Error("TRACK_B_B3_MALFORMED_GENERATION_FIXTURE");
      }
      switch (input.initialMode ?? "NO_REPLY") {
        case "REPLY":
          return modelResult({ ...proposal(
            "REPLY",
            input.initialReply ?? existingReplyText,
            input.initialFactIntent ?? "NONE",
          ),
          ...(input.initialRequestedAction === undefined
            ? {}
            : {
                salesSignals: buyingIntentSignals(
                  input.initialRequestedAction,
                  input.customerText ?? "có biến thể gì nữa",
                ),
              }),
          protectedClaimIds: input.initialProtectedClaimIds === undefined
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
  const repairSizeClaimDraft = vi.fn(async (
    _context: Parameters<NonNullable<RealtimeModelPort["repairSizeClaimDraft"]>>[0],
    initial: AgentProposalV1,
    _reasonCodes: readonly string[],
    trustedClaims: Parameters<NonNullable<RealtimeModelPort["repairSizeClaimDraft"]>>[3],
  ) => {
    if (input.sizeRepairMode === "THROW") {
      throw new Error("BF04_SIZE_REPAIR_TEST_FAILURE");
    }
    if (input.sizeRepairMode === "INVALID") {
      return modelResult({
        ...initial,
        reply: "Chị chắc chắn hợp size XL.",
        protectedClaimIds: [
          ...trustedClaims.map(({ id }) => id),
          "55555555-5555-4555-8555-555555555555",
        ],
      });
    }
    return modelResult({
      ...initial,
      reply: input.sizeRepairReply ??
        "Theo số đo đã xác minh, chị hợp size M; chị thích mặc ôm hay thoải mái hơn?",
      protectedClaimIds: trustedClaims.map(({ id }) => id),
    });
  });
  const groundWithFacts = vi.fn(async (
    _context: Parameters<RealtimeModelPort["groundWithFacts"]>[0],
    initial: AgentProposalV1,
  ) => modelResult(initial));
  const groundDraftWithFacts = vi.fn(async () => ({
    draft: {
      schemaVersion: 1 as const,
      advisoryText: "",
      objectionResponse: "",
      suggestedQuestion: "",
      suggestedNextStep: "",
      attachmentImageIndices: [],
    },
    modelVersion: fixtureModelVersion,
    latencyMs: 5,
    tokenUsage: {},
  }));
  const draftCustomerUrlExplanation = vi.fn(async () => modelResult({
    schemaVersion: 1,
    intent: "customer_url_unsupported",
    conversationStage: "DISCOVERY",
    productId: null,
    action: "REPLY",
    reply: "I cannot safely open that link. Please send the product code or an image so I can check it.",
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent: "NONE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  }));
  const model: RealtimeModelPort = {
    generate,
    groundWithFacts,
    ...(input.liveGroundedConfig
      ? { groundDraftWithFacts, draftCustomerUrlExplanation }
      : {}),
    ...(input.sizeFixture ? { repairSizeClaimDraft } : {}),
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
  const resolvedFactStatuses: Array<"OK" | "STALE" | "NOT_FOUND"> = [];
  const facts = {
    ready: vi.fn(async () => true),
    resolve: vi.fn(async () => {
      const status = input.factsMode ?? "OK";
      resolvedFactStatuses.push(status);
      return status === "STALE" || status === "NOT_FOUND"
        ? {
          schemaVersion: 1 as const,
          status,
          source: "POS_SNAPSHOT" as const,
          observedAt: occurredAt,
          expiresAt: occurredAt,
          productId: "SD398",
          facts: null,
          reasonCode: status === "STALE"
            ? "BUSINESS_FACT_STALE"
            : "BUSINESS_FACT_NOT_FOUND",
        }
      : {
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
        };
    }),
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
    resolve: vi.fn(async () => input.sizeFixture
      ? sizePolicyResolution()
      : policyResolution({
        customerUrlPolicyEnabled: input.liveGroundedConfig === true,
      })),
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
      ...(input.liveGroundedConfig
        ? {
            groundedDraftEnabled: true,
            verifiedFactAssemblerEnabled: true,
          }
        : {}),
      customerProfileEnabled: input.sizeFixture ?? false,
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
    groundWithFacts,
    groundDraftWithFacts,
    draftCustomerUrlExplanation,
    repairSizeClaimDraft,
    reserve,
    commit,
    retry,
    complete,
    committed: () => committed,
    commerceCommit,
    commerceState,
    resolvedFactStatuses,
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

type TrackBRunnerEvidence = Readonly<{
  finalText: string;
  factStatuses: readonly ("OK" | "STALE" | "NOT_FOUND")[];
  sizeRepairAttempts: number;
  cartMutationReady: boolean;
  groundWithFactsCalls: number;
  groundDraftWithFactsCalls: number;
  customerUrlExplanationCalls: number;
}>;

function capturedStateComparison<TState, TSalesState>(
  commit: RealtimeCommitInput<TState, TSalesState>,
  unchangedCommerceState: SalesCycleRuntimeState,
) {
  const legacy = commit.state as Readonly<{
    conversationOwner: "BOT" | "HUMAN";
    salesStage: ReturnType<typeof createConversationState>["salesStage"];
    currentProductId: string | null;
  }>;
  const commerce = (commit.salesCyclePlan?.state ?? unchangedCommerceState) as
    SalesCycleRuntimeState;
  const capture = commit.contextV2CapturePlan?.capture;
  const canonicalProductBinding = capture?.status === "BUILT" &&
      capture.context !== null
    ? capture.context.productBinding
    : null;
  return {
    enabled: true as const,
    legacy: {
      pageId: commit.pageId,
      conversationId: commit.conversationId,
      owner: legacy.conversationOwner,
      stage: legacy.salesStage,
      productId: legacy.currentProductId,
    },
    commerce: canonicalProductBinding === null
      ? null
      : projectCommerceAuthorityCandidate({
          routing: commerce.routing,
          revision: commerce.revision,
          stage: commerce.stage,
          cart: commerce.cart,
          hasOrderPreview: commerce.preview !== null,
          hasPurchaseConfirmation: commerce.confirmation !== null,
          productBinding: canonicalProductBinding,
        }),
  };
}

function replayEvidence<TState, TSalesState>(input: {
  readonly commit: RealtimeCommitInput<TState, TSalesState>;
  readonly factStatuses: readonly ("OK" | "STALE" | "NOT_FOUND")[];
  readonly sizeRepairAttempts: number;
  readonly groundWithFactsCalls: number;
  readonly groundDraftWithFactsCalls: number;
  readonly customerUrlExplanationCalls: number;
}): TrackBRunnerEvidence {
  return {
    finalText: committedText(input.commit),
    factStatuses: [...input.factStatuses],
    sizeRepairAttempts: input.sizeRepairAttempts,
    groundWithFactsCalls: input.groundWithFactsCalls,
    groundDraftWithFactsCalls: input.groundDraftWithFactsCalls,
    customerUrlExplanationCalls: input.customerUrlExplanationCalls,
    cartMutationReady: (input.commit.salesCyclePlan?.effectReadiness ?? []).some(
      ({ effect, outcome }) => effect === "CART_MUTATION" && outcome === "READY",
    ),
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
  it("runs the complete B3 corpus through one capture-only live-path adapter", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(occurredAt));
    try {
      type Capture = {
        readonly customerText: string;
        readonly initialReply: string;
        readonly initialRequestedAction?: NonNullable<
          NonNullable<AgentProposalV1["salesSignals"]>["buyingIntent"]
        >["requestedAction"];
        readonly initialFactIntent?: AgentProposalV1["businessFactQuery"]["intent"];
        readonly sizeFixture?: boolean;
        readonly sizeRepairMode?: "VALID" | "INVALID";
        readonly sizeRepairReply?: string;
        readonly initialGenerateMode?: "VALID" | "THROW";
        readonly factsMode?: "OK" | "STALE" | "NOT_FOUND";
        readonly expectedOwner?: "BOT" | "HUMAN";
        readonly expectedProductId?: string | null;
        readonly expectedCommerceProductScope?: "UNAVAILABLE";
      };
      const failureSnapshot = (): RealtimeReplySnapshot => ({
        messages: [],
        strategyHash: null,
        verifiedFactHashes: [],
        verifiedMediaUrls: [],
        protectedClaimHashes: [],
        effectAuthorizationHashes: [],
        commitOutcome: "NOT_COMMITTED",
        generationOutcome: "FAILED",
        inboxOutcome: "RETRYABLE",
        protectedOutbound: {
          required: false,
          groupId: null,
          plannedMessageCount: 0,
          deliveredMessageCount: 0,
        },
      });
      const runCapturedPath = async (
        capture: Readonly<Capture>,
      ): Promise<TrackBReplayObservation<TrackBRunnerEvidence>> => {
        const harness = createHarness({
          commerce: true,
          liveGroundedConfig: true,
          initialMode: "REPLY",
          customerText: capture.customerText,
          initialReply: capture.initialReply,
          ...(capture.initialRequestedAction === undefined
            ? {}
            : { initialRequestedAction: capture.initialRequestedAction }),
          initialFactIntent: capture.initialFactIntent ?? "NONE",
          sizeFixture: capture.sizeFixture ?? false,
          ...(capture.sizeRepairMode === undefined
            ? {}
            : { sizeRepairMode: capture.sizeRepairMode }),
          ...(capture.sizeRepairReply === undefined
            ? {}
            : { sizeRepairReply: capture.sizeRepairReply }),
          ...(capture.initialGenerateMode === undefined
            ? {}
            : { initialGenerateMode: capture.initialGenerateMode }),
          ...(capture.factsMode === undefined
            ? {}
            : { factsMode: capture.factsMode }),
        });
        expect(await harness.runner.processOne()).toBe(true);
        const commit = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
        const rawResult = harness.commerceCommit.mock.results[0];
        if (!commit || !rawResult || rawResult.type !== "return") {
          expect(harness.retry).toHaveBeenCalledOnce();
          return {
            reply: failureSnapshot(),
            sideEffects: {
              queueClaims: 0,
              customerMessages: 0,
              stateMutations: 0,
              protectedEffects: 0,
              capturedCommitPlans: 0,
            },
            stateComparison: {
              enabled: true,
              legacy: {
                pageId,
                conversationId: conversationHash,
                owner: "BOT",
                stage: "PRODUCT_MATCHED",
                productId: "SD398",
              },
              commerce: null,
            },
            evidence: {
              finalText: "",
              factStatuses: harness.resolvedFactStatuses,
              sizeRepairAttempts: harness.repairSizeClaimDraft.mock.calls.length,
              cartMutationReady: false,
              groundWithFactsCalls: harness.groundWithFacts.mock.calls.length,
              groundDraftWithFactsCalls: harness.groundDraftWithFacts.mock.calls.length,
              customerUrlExplanationCalls:
                harness.draftCustomerUrlExplanation.mock.calls.length,
            },
          };
        }
        return {
          reply: committedSnapshot({
            commit,
            result: (await rawResult.value).runtime,
            inboxCommitted: harness.complete.mock.calls.length === 1,
          }),
          sideEffects: {
            queueClaims: 0,
            customerMessages: 0,
            stateMutations: 0,
            protectedEffects: 0,
            capturedCommitPlans: 1,
          },
          stateComparison: capturedStateComparison(commit, harness.commerceState),
          evidence: replayEvidence({
            commit,
            factStatuses: harness.resolvedFactStatuses,
            sizeRepairAttempts: harness.repairSizeClaimDraft.mock.calls.length,
            groundWithFactsCalls: harness.groundWithFacts.mock.calls.length,
            groundDraftWithFactsCalls: harness.groundDraftWithFacts.mock.calls.length,
            customerUrlExplanationCalls:
              harness.draftCustomerUrlExplanation.mock.calls.length,
          }),
        };
      };
      const candidateSnapshots = new Map<string, RealtimeReplySnapshot>();
      const expectedStateComparisonFor = (capture: Readonly<Capture>) => {
        const productId = capture.expectedProductId === undefined
          ? "SD398"
          : capture.expectedProductId;
        return {
          enabled: true as const,
          legacy: {
            pageId,
            conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
            owner: capture.expectedOwner ?? "BOT",
            stage: "DISCOVERY" as const,
            productId,
          },
          commerce: {
            pageId,
            conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
            revision: 0,
            stage: "DISCOVERY" as const,
            productScope: capture.expectedCommerceProductScope === "UNAVAILABLE"
              ? { kind: "UNAVAILABLE" as const }
              : productId === null
                ? { kind: "NONE" as const }
                : { kind: "SINGLE" as const, productId },
            cartProductScope: { kind: "ABSENT" as const },
            artifacts: {
              hasCart: false,
              hasOrderPreview: false,
              hasPurchaseConfirmation: false,
            },
          },
        };
      };
      const riskAssertionsFor = (
        riskClasses: TrackBLivePathReplayCase<
          Capture,
          TrackBRunnerEvidence
        >["riskClasses"],
      ): TrackBLivePathReplayCase<Capture, TrackBRunnerEvidence>["riskAssertions"] =>
        riskClasses.map((riskClass) => ({
          riskClass,
          assertionCode: `TRACK_B_B3_${riskClass}_POSTCONDITION`,
          evaluate: ({ candidate }) => {
            const { reply, evidence } = candidate;
            switch (riskClass) {
              case "UNSUPPORTED_OUTPUT":
              case "PROTECTED_CLAIM":
                return !/còn(?: hàng)?(?: không)?|còn chị/iu.test(evidence.finalText);
              case "PII_SECURITY":
                return evidence.customerUrlExplanationCalls === 1 &&
                  !/https?:\/\/|example\.com|external-product|token|secret/iu.test(
                    evidence.finalText,
                  );
              case "UNAUTHORIZED_EFFECT":
                return evidence.groundDraftWithFactsCalls === 1 &&
                  evidence.groundWithFactsCalls === 0 &&
                  evidence.cartMutationReady === false;
              case "STALE_OR_MISSING_FACTS":
                return evidence.factStatuses.some((status) =>
                  status === "STALE" || status === "NOT_FOUND"
                ) && evidence.groundWithFactsCalls === 0 &&
                  evidence.groundDraftWithFactsCalls === 0 &&
                  !/1\.199\.000|còn hàng/iu.test(evidence.finalText);
              case "MALFORMED_OUTPUT":
                return reply.generationOutcome === "FAILED" &&
                  reply.inboxOutcome === "COMMITTED";
              case "SINGLE_REPAIR_BUDGET":
                return evidence.sizeRepairAttempts === 1;
              case "VERIFIED_FACTS_FALLBACK":
                return reply.verifiedFactHashes.length > 0 &&
                  !/hợp size (?:M|XL)/iu.test(evidence.finalText);
              case "BF04_SIZE":
                return evidence.sizeRepairAttempts === 1 &&
                  !/hợp size (?:M|XL)/iu.test(evidence.finalText);
            }
          },
        }));
      const sameCommerceCase = (
        caseId: string,
        riskClasses: TrackBLivePathReplayCase<
          Capture,
          TrackBRunnerEvidence
        >["riskClasses"],
        capturedInput: Capture,
      ): TrackBLivePathReplayCase<Capture, TrackBRunnerEvidence> => ({
        caseId,
        riskClasses,
        capturedInput,
        baseline: (capture) => runCapturedPath(capture),
        candidate: async (capture) => {
          const observed = await runCapturedPath(capture);
          candidateSnapshots.set(caseId, observed.reply);
          return observed;
        },
        expectedStateComparison: expectedStateComparisonFor(capturedInput),
        ...(capturedInput.expectedCommerceProductScope === "UNAVAILABLE"
          ? {
              permittedStateDifferences: [{
                code: "PRODUCT_SCOPE_UNAVAILABLE" as const,
                reasonCode:
                  "TRACK_B_B3_CANONICAL_PRODUCT_BINDING_STALE_FAIL_CLOSED",
              }],
            }
          : {}),
        riskAssertions: riskAssertionsFor(riskClasses),
      });
      const structuredGenerationIdentity = structuredVertexGenerationIdentity();
      const identity: TrackBReplayIdentity = {
        modelProvider: "VERTEX_AI",
        configuredProviderModel: "gemini-3.5-flash-lite",
        fixtureModelVersion,
        capability: "BASELINE_MODEL_CAPABILITY",
        livePathSourceRevision: "c22d0a5181e1e4e67401bf00b79ce9f49cbb663d",
        promptVersion: "lana-realtime-v1",
        promptTemplateHash: sha256(canonicalJsonV1({
          baseline: SHADOW_SYSTEM_INSTRUCTION,
          groundedProposal: GROUNDED_SYSTEM_INSTRUCTION,
          groundedDraft: GROUNDED_DRAFT_SYSTEM_INSTRUCTION,
          sizeRepair: SIZE_CLAIM_REPAIR_SYSTEM_INSTRUCTION,
          customerUrlExplanation: CUSTOMER_URL_EXPLANATION_SYSTEM_INSTRUCTION,
        })),
        generationConfigHash: sha256(canonicalJsonV1({
          modelGeneration: structuredGenerationIdentity,
          runnerFeatures: {
            groundedDraftEnabled: true,
            verifiedFactAssemblerEnabled: true,
            customerUrlExplanationPort: true,
          },
        })),
        policyIdentityHash: sha256(canonicalJsonV1({
          bundleId: "runtime:bf01-test",
          bundleHash: `sha256:${"a".repeat(64)}`,
          policyVersion: "bf01-test",
          closingStrategy: {
            customerUrlPolicy: "CLASSIFIED_ALLOWLIST_V1",
            replyReconciliationPolicy: "CLARIFY_RECONCILED_V1",
            replyReconciliationFallbackText: fallbackText,
          },
        })),
        schemaIdentityHash: sha256(canonicalJsonV1({
          structuredAgent: {
            runtimeContract: "AgentProposalV1Schema",
            schemaVersion: 1,
            vertexResponseSchema: structuredGenerationIdentity.structuredAgent.responseSchema,
          },
          structuredGroundedDraft: {
            runtimeContract: "GroundedReplyDraftV1Schema",
            schemaVersion: 1,
            vertexResponseSchema:
              structuredGenerationIdentity.structuredGroundedDraft.responseSchema,
          },
        })),
        behaviorContentHash: behaviorModeContentHash({
          confirmationMode: "LEGACY",
          salesAuthorityMode: "COMMERCE",
          stateReadMode: "LEGACY",
          authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash,
        }),
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash,
        factFixtureHash: sha256(canonicalJsonV1({
          product,
          observedAt: occurredAt,
          okFacts: {
            productId: "SD398",
            price: 1_199_000,
            sizes: ["M", "L"],
            stockStatus: "IN_STOCK",
            stockQuantity: 2,
            deliveryEta: { minDays: 1, maxDays: 2 },
          },
          negativeFactModes: ["STALE", "NOT_FOUND"],
          sizeProfile: sizeProfile(),
          sizePolicy: sizePolicyResolution(),
        })),
      };
      const preB24StateComparison = expectedStateComparisonFor({
        customerText: "Tư vấn size cho chị mẫu SD398",
        initialReply: "Theo số đo, chị hợp size M.",
      });
      const cases: TrackBLivePathReplayCase<Capture, TrackBRunnerEvidence>[] = [
        {
          caseId: "pre-b24-versus-current-live-path",
          riskClasses: [],
          capturedInput: {
            customerText: "Tư vấn size cho chị mẫu SD398",
            initialReply: "Theo số đo, chị hợp size M.",
            initialFactIntent: "SIZE",
            sizeFixture: true,
            sizeRepairMode: "VALID",
            sizeRepairReply:
              "Theo số đo đã xác minh, chị hợp size M nhé ạ. Chị thích mặc ôm nhé ạ?",
          },
          // Immutable capture from exact pre-B2.4 main
          // a89a50cb52183a3ffc4f3d7bd313ea675564c07b for this input.
          baseline: async () => ({
            reply: {
              messages: [{
                kind: "TEXT",
                text:
                  "Theo số đo đã xác minh, chị hợp size M nhé ạ. Chị thích mặc ôm nhé ạ?",
              }],
              strategyHash:
                "28f64d412aa3b9b39aaa67463039f5a466eb539408b5a8df48cdaf187e1336ed",
              verifiedFactHashes: [
                "a0729ee1acaa2436299b46f6e046eaaa0561f3152ab27463d55cc850d8431da6",
              ],
              verifiedMediaUrls: [],
              protectedClaimHashes: [
                "95011f74a0e3fb0cbdd01bc90c7eee3891c231c0c7bdb73bbf4fe3467c3e757e",
              ],
              effectAuthorizationHashes: [
                "e63dd65848b724c639bb06bbfb11ad86692d9e9871749e62aa7afb8df40dc873",
              ],
              commitOutcome: "COMMITTED",
              generationOutcome: "VALID",
              inboxOutcome: "COMMITTED",
              protectedOutbound: {
                required: true,
                groupId: "37a4d2be-f544-5ec8-86c5-8e2e04faff77",
                plannedMessageCount: 1,
                deliveredMessageCount: 1,
              },
            },
            sideEffects: {
              queueClaims: 0,
              customerMessages: 0,
              stateMutations: 0,
              protectedEffects: 0,
              capturedCommitPlans: 0,
            },
            stateComparison: preB24StateComparison,
            evidence: {
              finalText:
                "Theo số đo đã xác minh, chị hợp size M nhé ạ. Chị thích mặc ôm nhé ạ?",
              factStatuses: ["OK"],
              sizeRepairAttempts: 1,
              cartMutationReady: false,
              groundWithFactsCalls: 0,
              groundDraftWithFactsCalls: 0,
              customerUrlExplanationCalls: 0,
            },
          }),
          candidate: async (capture) => {
            const observed = await runCapturedPath(capture);
            expect(observed.stateComparison).toEqual(preB24StateComparison);
            candidateSnapshots.set("pre-b24-versus-current-live-path", observed.reply);
            return observed;
          },
          expectedStateComparison: preB24StateComparison,
          riskAssertions: [],
        },
        sameCommerceCase(
          "unsupported-protected-claim",
          ["UNSUPPORTED_OUTPUT", "PROTECTED_CLAIM"],
          {
            customerText: "Mẫu SD398 còn hàng không?",
            initialReply: "Mẫu này còn chị nhé.",
            expectedOwner: "HUMAN",
          },
        ),
        sameCommerceCase("pii-security", ["PII_SECURITY"], {
          customerText: "Xem giúp chị https://example.com/external-product",
          initialReply: "Chị gửi mã sản phẩm để em kiểm tra nhé.",
          expectedProductId: null,
        }),
        sameCommerceCase("unauthorized-effect", ["UNAUTHORIZED_EFFECT"], {
          customerText: "Mẫu SD398 còn hàng không?",
          initialReply: "Mẫu SD398 hiện còn hàng.",
          initialRequestedAction: "ADD_TO_CART",
          initialFactIntent: "STOCK",
        }),
        sameCommerceCase("stale-facts", ["STALE_OR_MISSING_FACTS"], {
          customerText: "Mẫu SD398 còn hàng không?",
          initialReply: "Mẫu SD398 hiện còn hàng.",
          initialFactIntent: "STOCK",
          factsMode: "STALE",
          expectedOwner: "HUMAN",
          expectedCommerceProductScope: "UNAVAILABLE",
        }),
        sameCommerceCase("missing-facts", ["STALE_OR_MISSING_FACTS"], {
          customerText: "Mẫu SD398 còn hàng không?",
          initialReply: "Mẫu SD398 hiện còn hàng.",
          initialFactIntent: "STOCK",
          factsMode: "NOT_FOUND",
          expectedOwner: "HUMAN",
        }),
        sameCommerceCase("malformed-output", ["MALFORMED_OUTPUT"], {
          customerText: "Mẫu SD398 giá bao nhiêu?",
          initialReply: "",
          initialGenerateMode: "THROW",
        }),
        sameCommerceCase(
          "single-repair-and-verified-fallback",
          ["SINGLE_REPAIR_BUDGET", "VERIFIED_FACTS_FALLBACK", "BF04_SIZE"],
          {
            customerText: "Tư vấn size cho chị mẫu SD398",
            initialReply: "Theo số đo, chị hợp size XL.",
            initialFactIntent: "SIZE",
            sizeFixture: true,
            sizeRepairMode: "INVALID",
          },
        ),
      ];

      const result = await runTrackBLivePathReplay({ identity, cases });

      expect(result).toMatchObject({
        contractVersion: "TRACK_B_LIVE_PATH_REPLAY_V1",
        status: "PASS",
        sideEffects: "DISABLED",
        coverage: { complete: true, missingRiskClasses: [] },
      });
      expect(result.cases).toHaveLength(cases.length);
      expect(result.cases.every(({ status }) => status === "PASS")).toBe(true);
      expect(result.cases.every(({ sideEffects }) => sideEffects.status === "NONE"))
        .toBe(true);
      expect(result.cases.find(({ caseId }) => caseId === "malformed-output"))
        .toMatchObject({
          reply: { status: "MATCH" },
          sideEffects: { capturedCommitPlans: 2 },
        });
      expect(candidateSnapshots.get("malformed-output")).toMatchObject({
        generationOutcome: "FAILED",
        inboxOutcome: "COMMITTED",
      });
      expect(JSON.stringify(candidateSnapshots.get("pii-security")?.messages))
        .not.toMatch(/https?:\/\/|example\.com|external-product|token|secret/iu);
      expect(JSON.stringify(
        candidateSnapshots.get("single-repair-and-verified-fallback")?.messages,
      )).not.toMatch(/hợp size (?:M|XL)/iu);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails B3 state evidence when canonical product binding drifts behind unchanged LEGACY state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(occurredAt));
    try {
      const harness = createHarness({
        commerce: true,
        liveGroundedConfig: true,
        initialMode: "REPLY",
        customerText: "Mẫu SD398 còn hàng không?",
        initialReply: "Mẫu SD398 hiện còn hàng.",
        initialFactIntent: "STOCK",
      });
      expect(await harness.runner.processOne()).toBe(true);
      const commit = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
      expect(commit).toBeDefined();
      if (!commit) throw new Error("TRACK_B_B3_COMMIT_REQUIRED");
      const capture = commit.contextV2CapturePlan?.capture;
      expect(capture).toMatchObject({
        status: "BUILT",
        context: {
          productBinding: { status: "RESOLVED", productIds: ["SD398"] },
        },
      });
      if (capture?.status !== "BUILT" || capture.context === null) {
        throw new Error("TRACK_B_B3_BUILT_CONTEXT_REQUIRED");
      }
      const { contextHash: _originalContextHash, ...contextDraft } = capture.context;
      const driftedContextDraft = {
        ...contextDraft,
        productBinding: {
          ...capture.context.productBinding,
          status: "RESOLVED" as const,
          productIds: ["SD399"],
        },
      };
      const driftedContextHash = sha256(
        `CONTEXT_V2\n${canonicalJsonV1(driftedContextDraft)}`,
      );
      const driftedCommit = {
        ...commit,
        contextV2CapturePlan: {
          capture: {
            ...capture,
            contextHash: driftedContextHash,
            context: {
              ...driftedContextDraft,
              contextHash: driftedContextHash,
            },
          },
        },
      };
      const comparisonInput = capturedStateComparison(
        driftedCommit,
        harness.commerceState,
      );

      expect(comparisonInput.legacy.productId).toBe("SD398");
      expect(comparisonInput.commerce?.productScope).toEqual({
        kind: "SINGLE",
        productId: "SD399",
      });
      expect(compareCommerceAuthority(comparisonInput)).toMatchObject({
        status: "MISMATCH",
        differences: expect.arrayContaining(["PRODUCT_SCOPE_MISMATCH"]),
      });

      const blockedComparisonInput = capturedStateComparison({
        ...commit,
        contextV2CapturePlan: {
          capture: {
            schemaVersion: 1,
            contractVersion: "CONTEXT_V2_CAPTURE_V1",
            sourceMessagePk: capture.sourceMessagePk,
            sourceOccurredAt: capture.sourceOccurredAt,
            status: "BLOCKED",
            context: null,
            contextHash: null,
            reasonCode: "CONTEXT_V2_PRODUCT_BINDING_INVALID",
          },
        },
      }, harness.commerceState);
      const { contextV2CapturePlan: _capturePlan, ...commitWithoutCapture } = commit;
      const absentComparisonInput = capturedStateComparison(
        commitWithoutCapture,
        harness.commerceState,
      );
      for (const unavailable of [blockedComparisonInput, absentComparisonInput]) {
        expect(unavailable.commerce).toBeNull();
        expect(compareCommerceAuthority(unavailable)).toMatchObject({
          status: "COMMERCE_STATE_UNAVAILABLE",
          differences: ["COMMERCE_STATE_UNAVAILABLE"],
        });
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("replays B2.4 COMMERCE model wording through the actual runner finalizer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(occurredAt));
    try {
      const capturedInput = {
        customerText: "Tư vấn size cho chị mẫu SD398",
        modelReply: "Theo số đo, chị hợp size M.",
        repairedReply:
          "Theo số đo đã xác minh, chị hợp size M nhé ạ. Chị thích mặc ôm nhé ạ?",
      };
      const snapshots: RealtimeReplySnapshot[] = [];
      const runLivePath = async (
        capture: Readonly<typeof capturedInput>,
      ): Promise<RealtimeReplySnapshot> => {
        const harness = createHarness({
          commerce: true,
          initialMode: "REPLY",
          customerText: capture.customerText,
          initialReply: capture.modelReply,
          initialFactIntent: "SIZE",
          sizeFixture: true,
          sizeRepairMode: "VALID",
          sizeRepairReply: capture.repairedReply,
        });
        expect(await harness.runner.processOne()).toBe(true);
        const commit = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
        if (!commit) throw new Error("TRACK_B_B24_CAPTURED_COMMIT_MISSING");
        const rawResult = harness.commerceCommit.mock.results[0];
        if (!rawResult || rawResult.type !== "return") {
          throw new Error("TRACK_B_B24_CAPTURED_COMMIT_RESULT_MISSING");
        }
        expect(harness.repairSizeClaimDraft).toHaveBeenCalledOnce();
        expect(committedText(commit)).toBe(capture.repairedReply);
        expect(commit.metaPlan?.protectedClaims?.filter(({ type }) =>
          type === "SIZE_FIT"
        )).toHaveLength(1);
        return committedSnapshot({
          commit,
          result: (await rawResult.value).runtime,
          inboxCommitted: harness.complete.mock.calls.length === 1,
        });
      };

      // Immutable capture from exact pre-B2.4 main
      // a89a50cb52183a3ffc4f3d7bd313ea675564c07b for capturedInput above.
      const preB24Baseline: RealtimeReplySnapshot = {
        messages: [{ kind: "TEXT", text: capturedInput.repairedReply }],
        strategyHash: "28f64d412aa3b9b39aaa67463039f5a466eb539408b5a8df48cdaf187e1336ed",
        verifiedFactHashes: [
          "a0729ee1acaa2436299b46f6e046eaaa0561f3152ab27463d55cc850d8431da6",
        ],
        verifiedMediaUrls: [],
        protectedClaimHashes: [
          "95011f74a0e3fb0cbdd01bc90c7eee3891c231c0c7bdb73bbf4fe3467c3e757e",
        ],
        effectAuthorizationHashes: [
          "e63dd65848b724c639bb06bbfb11ad86692d9e9871749e62aa7afb8df40dc873",
        ],
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
      const differential = await realtimeReplyDifferential.runRealtimeReplyDifferential({
        capturedInput,
        baseline: async () => preB24Baseline,
        candidate: async (capture) => {
          const snapshot = await runLivePath(capture);
          snapshots.push(snapshot);
          return snapshot;
        },
      });

      expect(differential).toEqual({
        contractVersion: "REALTIME_REPLY_DIFFERENTIAL_V1",
        status: "MATCH",
        sideEffects: "DISABLED",
        differences: [],
      });
      expect(snapshots).toEqual([preB24Baseline]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retains B2.3a claim containment while exposing the later B2.3d safe-fallback delta", async () => {
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
      permittedDifferences: [{
        code: "OUTBOUND_MESSAGES_CHANGED",
        reasonCode: "B2_3D_UNDECLARED_SIZE_SAFE_FALLBACK",
      }],
    });

    expect(result.differences.map(({ code }) => code)).toEqual([
      "OUTBOUND_MESSAGES_CHANGED",
      "PROTECTED_CLAIMS_CHANGED",
      "EFFECT_AUTHORIZATION_CHANGED",
    ]);
    expect(result).toMatchObject({
      status: "VIOLATION",
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
      commitOutcome: "COMMITTED",
      inboxOutcome: "COMMITTED",
      protectedOutbound: {
        required: true,
        groupId: preB23aBaseline.protectedOutbound.groupId,
        plannedMessageCount: preB23aBaseline.protectedOutbound.plannedMessageCount,
        deliveredMessageCount: preB23aBaseline.protectedOutbound.deliveredMessageCount,
      },
    });
    expect(candidateSnapshot.messages).toEqual([{
      kind: "TEXT",
      text: "Em đã tìm thấy mẫu SD398. Chị muốn xem giá, size, tình trạng hàng hay thời gian giao dự kiến?",
    }]);
    expect(candidateSnapshot.protectedClaimHashes).toEqual(expect.arrayContaining(
      [...preB23aBaseline.protectedClaimHashes],
    ));
    expect(candidateSnapshot.protectedOutbound.plannedMessageCount).toBeGreaterThan(0);
    expect(candidateSnapshot.protectedOutbound.deliveredMessageCount).toBe(
      candidateSnapshot.protectedOutbound.plannedMessageCount,
    );
  });

  it("replays the B2.3d COMMERCE size boundary through r31.3 without safety drift", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(occurredAt));
    try {
    const capturedInput = {
      customerText: "Tư vấn size cho chị mẫu SD398",
      initialReply: "Theo số đo, chị hợp size M.",
    };
    const runLivePath = async (
      capture: Readonly<typeof capturedInput>,
    ): Promise<RealtimeReplySnapshot> => {
      const harness = createHarness({
        commerce: true,
        sizeFixture: true,
        initialMode: "REPLY",
        customerText: capture.customerText,
        initialReply: capture.initialReply,
        initialFactIntent: "SIZE",
      });
      expect(await harness.runner.processOne()).toBe(true);
      const commit = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
      if (!commit) throw new Error("TRACK_B_B23D_COMMIT_MISSING");
      const rawResult = harness.commerceCommit.mock.results[0];
      if (!rawResult || rawResult.type !== "return") {
        throw new Error("TRACK_B_B23D_COMMERCE_COMMIT_RESULT_MISSING");
      }
      const result = (await rawResult.value).runtime;
      expect(harness.repairSizeClaimDraft).toHaveBeenCalledOnce();
      expect(committedText(commit)).toContain("chị hợp size M");
      expect(commit.decisionEvents?.flatMap(({ reasonCodes }) => reasonCodes))
        .toEqual(expect.arrayContaining([
          "SIZE_RECOMMENDATION_UNDECLARED",
          "SIZE_RECOMMENDATION_REPAIRED",
        ]));
      expect(commit.metaPlan?.protectedClaims?.filter(({ type }) => type === "SIZE_FIT"))
        .toHaveLength(1);
      return committedSnapshot({
        commit,
        result,
        inboxCommitted: harness.complete.mock.calls.length === 1,
      });
    };

    // Immutable capture from exact pre-B2.3d source at
    // 78a03fe599202c6e275300af33622cb16ab80769 for capturedInput above.
    const preB23dBaseline: RealtimeReplySnapshot = {
      messages: [{
        kind: "TEXT",
        text: "Theo số đo, chị hợp size M.\n\nTheo số đo mới nhất, chị hợp váy size M. Độ tin cậy 82% theo bảng size đã xác minh. Em giữ size này cho mình nha.",
      }],
      strategyHash: "27058acb03108a4695570e1a20ddb67c6e8e2b762ef1a1c5f6f2ef36d76d9385",
      verifiedFactHashes: [
        "a0729ee1acaa2436299b46f6e046eaaa0561f3152ab27463d55cc850d8431da6",
      ],
      verifiedMediaUrls: [],
      protectedClaimHashes: [
        "95011f74a0e3fb0cbdd01bc90c7eee3891c231c0c7bdb73bbf4fe3467c3e757e",
      ],
      effectAuthorizationHashes: [
        "ccfb11272e7d5b377ee779ad3ef9298a974c8ad7c54531749e9932af1da838a5",
      ],
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
    const snapshots: RealtimeReplySnapshot[] = [];
    const result = await realtimeReplyDifferential.runRealtimeReplyDifferential({
      capturedInput,
      baseline: async () => preB23dBaseline,
      candidate: async (capture) => {
        const snapshot = await runLivePath(capture);
        snapshots.push(snapshot);
        return snapshot;
      },
      permittedDifferences: [
        {
          code: "OUTBOUND_MESSAGES_CHANGED",
          reasonCode: "B2_3D_MODEL_SIZE_WORDING",
        },
        {
          code: "STRATEGY_CHANGED",
          reasonCode: "B2_3D_MODEL_SIZE_SEMANTICS",
        },
      ],
    });

    expect(result.sideEffects).toBe("DISABLED");
    expect(result.status).toBe("VIOLATION");
    expect(result.differences.map(({ code }) => code)).toEqual([
      "OUTBOUND_MESSAGES_CHANGED",
      "STRATEGY_CHANGED",
      "EFFECT_AUTHORIZATION_CHANGED",
    ]);
    expect(snapshots[0]).toMatchObject({
      verifiedFactHashes: preB23dBaseline.verifiedFactHashes,
      protectedClaimHashes: preB23dBaseline.protectedClaimHashes,
      commitOutcome: "COMMITTED",
      inboxOutcome: "COMMITTED",
      protectedOutbound: preB23dBaseline.protectedOutbound,
    });
    } finally {
      vi.useRealTimers();
    }
  });

  it("caps an invalid COMMERCE size repair at one and commits only safe fallback", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(occurredAt));
    try {
    const harness = createHarness({
      commerce: true,
      sizeFixture: true,
      sizeRepairMode: "INVALID",
      initialMode: "REPLY",
      customerText: "Tư vấn size cho chị mẫu SD398",
      initialReply: "Theo số đo, chị hợp size XL.",
      initialFactIntent: "SIZE",
    });

    expect(await harness.runner.processOne()).toBe(true);
    expect(harness.repairSizeClaimDraft).toHaveBeenCalledOnce();
    const commit = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
    expect(commit).toBeDefined();
    expect(committedText(commit)).not.toMatch(/hợp size (?:M|XL)/iu);
    expect((commit?.metaPlan?.protectedClaims ?? []).some(({ type }) => type === "SIZE_FIT"))
      .toBe(false);
    expect(commit?.decisionEvents?.flatMap(({ reasonCodes }) => reasonCodes))
      .toEqual(expect.arrayContaining([
        "SIZE_RECOMMENDATION_REPAIR_FAILED",
        "SIZE_RECOMMENDATION_VALUE_MISMATCH",
        "PROTECTED_CLAIM_EVIDENCE_MISSING:55555555-5555-4555-8555-555555555555",
      ]));
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    "Căn cứ số đo, chị size L nhé?",
    "Căn cứ số đo, em tư vấn chị size L nhé?",
    "Với số đo này thì em tư vấn size L nhé?",
    "Xét số đo của chị, size L nhé?",
  ])("fails closed on COMMERCE size semantics independent of inbound/model intent: %s", async (modelReply) => {
    const harness = createHarness({
      commerce: true,
      sizeFixture: false,
      initialMode: "REPLY",
      customerText: "Mẫu SD398 giá bao nhiêu?",
      initialReply: modelReply,
      initialFactIntent: "PRICE",
    });

    expect(await harness.runner.processOne()).toBe(true);
    const commit = harness.commerceCommit.mock.calls[0]?.[0]?.runtimeCommit;
    expect(commit).toBeDefined();
    expect(committedText(commit)).not.toContain("size L");
    expect(commit?.decisionEvents?.flatMap(({ reasonCodes }) => reasonCodes))
      .toContain("SIZE_RECOMMENDATION_UNDECLARED");
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
