import { describe, expect, it, vi } from "vitest";
import type { StableProductDocument } from "@lana/business-tools";
import type { AgentProposalV1 } from "@lana/contracts";
import { createConversationState } from "@lana/conversation-engine";
import type { RuntimePolicyResolution, RuntimePolicyResolverPort } from "@lana/chat-runtime";
import {
  FailClosedTagObservationProvider,
  RealtimeRunner,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
} from "./bf02-realtime-runner.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";

const occurredAt = "2026-08-10T00:00:00.000Z";
const pageId = "1198992073286645";
const conversationHash = "meta:v1:bf08-customer";
type RealtimeCommitInput = Parameters<RealtimeRuntimePort["commit"]>[0];

function product(
  productId: string,
  verifiedMediaUrl?: string,
): StableProductDocument {
  return {
    productId,
    parentProductId: productId,
    canonicalCode: productId,
    aliases: [],
    title: `Product ${productId}`,
    colors: [], materials: [], silhouettes: [], occasions: [],
    imageUrls: verifiedMediaUrl ? [verifiedMediaUrl] : [],
    images: verifiedMediaUrl ? [{
      url: verifiedMediaUrl,
      role: "PRIMARY",
      angle: "FRONT",
      imageType: "MODEL",
      intents: [], partsVisible: [], sortOrder: 0, qualityScore: 1,
      feedback: false, observedAt: occurredAt,
      sourceContentSha256: "a".repeat(64), reviewStatus: "APPROVED",
      metadataVerified: true,
    }] : [],
    catalogVersion: "catalog-v2",
  };
}

function claim(text: string) {
  const eventKey = `meta:${pageId}:message:bf08`;
  return {
    inboxId: "2a9afc47-978a-4b74-9653-000000000008",
    pageId,
    eventKey,
    conversationHash,
    occurredAt: new Date(occurredAt),
    receivedAt: new Date(occurredAt),
    receiveSequence: 8,
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
        eventKey,
        pageId,
        messageId: "bf08",
        senderId: "customer-1",
        conversationId: conversationHash,
        occurredAt,
        isEcho: false,
        appId: null,
        text,
        attachments: [],
      },
    },
  };
}

function proposal(
  reply: string,
  productId: string | null = null,
  intent = "customer_url_unsupported",
): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent,
    conversationStage: productId ? "PRODUCT_MATCHED" : "DISCOVERY",
    productId,
    action: "REPLY",
    reply,
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent: "NONE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

function policy(
  customerUrlPolicy: "STRICT_BLOCK_ALL" | "CLASSIFIED_ALLOWLIST_V1" | "OMITTED",
  sideEffects: "DISABLED" | "LIVE_OUTBOUND" = "LIVE_OUTBOUND",
  multiProductPolicy: "CLARIFY_V1" | "OMITTED" = "CLARIFY_V1",
): RuntimePolicyResolution {
  return {
    status: "RESOLVED",
    source: "DATABASE",
    mayAffectOutbound: sideEffects === "LIVE_OUTBOUND",
    reasonCodes: [], audit: {}, auditWrite: "RECORDED",
    bundle: {
      schemaVersion: 1,
      bundleId: "runtime:bf08-test",
      bundleHash: `sha256:${"8".repeat(64)}`,
      pageId,
      channel: sideEffects === "DISABLED" ? "CANARY_SHADOW" : "PUBLISHED",
      sideEffects,
      resolvedAt: occurredAt,
      policy: {
        policyVersion: "bf08-test",
        multiItemOffer: { minimumProductCount: 99, discountBps: 0 },
      },
      versionReferences: [],
      artifacts: {
        shopPolicy: {}, offerPolicy: {},
        closingStrategy: customerUrlPolicy === "OMITTED"
          ? {}
          : {
              customerUrlPolicy,
              ...(multiProductPolicy === "CLARIFY_V1"
                ? { multiProductResolutionPolicy: "CLARIFY_V1" as const }
                : {}),
            },
        sizeCharts: {}, handoffMatrix: null, paymentPolicy: null,
      },
    },
  } as unknown as RuntimePolicyResolution;
}

async function runTurn(input: {
  readonly text: string;
  readonly policy?: RuntimePolicyResolution;
  readonly exactProduct?: StableProductDocument;
  readonly exactProducts?: readonly StableProductDocument[];
  readonly explanationReplies?: readonly string[];
}) {
  const commits: RealtimeCommitInput[] = [];
  const state = createConversationState({
    conversationId: "43820fd4-daa7-4917-9835-a38cb55120e5",
    routingOwner: "APP",
    now: new Date(occurredAt),
  });
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn(async () => ({
      conversationId: state.conversationId,
      pageId,
      customerHash: conversationHash,
      stateVersion: 0,
      state,
      routingOwner: "APP" as const,
      appSendEnabled: true,
      killSwitch: false,
    })),
    commit: vi.fn(async (commitInput: RealtimeCommitInput) => {
      commits.push(commitInput);
      return {
        stateCommitted: true,
        metaOutboxCreated: commitInput.metaPlan ? 1 : 0,
        pancakeTagOutboxCreated: Boolean(commitInput.pancakeTagPlan),
        handoffEventCreated: Boolean(commitInput.handoffEventPlan),
        sendAuthorized: Boolean(commitInput.metaPlan),
        reasonCodes: [],
      };
    }),
    linkProviderConversation: vi.fn(async () => undefined),
  };
  const exactProducts = input.exactProducts ?? (input.exactProduct ? [input.exactProduct] : []);
  const generated = {
    proposal: proposal("I can help with this verified product.", exactProducts[0]?.productId ?? null, "product_info"),
    modelVersion: "gemini-bf08-test",
    latencyMs: 1,
    tokenUsage: {},
  };
  let explanationIndex = 0;
  const draftCustomerUrlExplanation = vi.fn(async (...args: readonly unknown[]) => {
    expect(JSON.stringify(args)).not.toContain(input.text);
    return {
      proposal: proposal(input.explanationReplies?.[explanationIndex++] ??
        "I cannot safely open that link. Please send the product code or an image so I can check it."),
      modelVersion: "gemini-bf08-test",
      latencyMs: 1,
      tokenUsage: {},
    };
  });
  const generate = vi.fn(async (context: unknown) => {
    expect(JSON.stringify(context)).not.toContain(input.text);
    return generated;
  });
  const model = {
    generate,
    groundWithFacts: vi.fn(async () => generated),
    draftCustomerUrlExplanation,
    draftMultiProductClarification: vi.fn(async (productIds: readonly string[]) => ({
      proposal: {
        ...proposal(
          `Chị muốn xem ${productIds.join(" hay ")} trước ạ?`,
          null,
          "multi_product_selection",
        ),
        conversationStage: "PRODUCT_MATCHED" as const,
      },
      modelVersion: "gemini-bf08-test",
      latencyMs: 1,
      tokenUsage: {},
    })),
  } as unknown as RealtimeModelPort;
  const searchText = vi.fn(async (query: string) =>
    exactProducts.find(({ productId }) => query === productId)
      ? {
          status: "MATCHED" as const,
          matchKind: "EXACT_CODE" as const,
          product: exactProducts.find(({ productId }) => query === productId)!,
          score: 1,
          gap: null,
        }
      : { status: "NOT_FOUND" as const, reasonCode: "NO_CANDIDATES" as const }
  );
  const productSearch: RealtimeProductSearchPort = {
    searchText,
    searchImage: vi.fn(() => Promise.reject(new Error("CUSTOMER_URL_NETWORK_FORBIDDEN"))),
    searchImageBytes: vi.fn(() => Promise.reject(new Error("CUSTOMER_URL_NETWORK_FORBIDDEN"))),
  };
  const facts: BusinessFactsReader = {
    ready: vi.fn(async () => true),
    resolve: vi.fn(async (query: Parameters<BusinessFactsReader["resolve"]>[0]) => exactProducts.length > 0
      ? ({
          schemaVersion: 1 as const, status: "OK" as const, source: "POS_SNAPSHOT" as const,
          observedAt: occurredAt, expiresAt: "2099-01-01T00:00:00.000Z",
          productId: query.productId,
          facts: {
            schemaVersion: 1 as const,
            productId: query.productId,
            parentProductId: query.productId,
            offerType: "DIRECT",
            listPriceVnd: null,
            salePriceVnd: 799_000,
            sizes: ["M", "L"],
            stockStatus: "IN_STOCK" as const,
            stockQuantity: 2,
            deliveryEta: null,
            fulfillmentPolicy: "READY_STOCK",
            imageUrls: [],
          },
          reasonCode: null,
        })
      : ({
          schemaVersion: 1 as const, status: "ERROR" as const, source: "POS_SNAPSHOT" as const,
          observedAt: occurredAt, expiresAt: occurredAt, productId: query.productId,
          facts: null, reasonCode: "FACTS_UNAVAILABLE",
        })),
    close: vi.fn(async () => undefined),
  };
  const resolver: RuntimePolicyResolverPort | undefined = input.policy
    ? { resolve: vi.fn(async () => input.policy!) }
    : undefined;
  const runner = new RealtimeRunner(
    {
      claimNext: vi.fn(async () => claim(input.text)),
      complete: vi.fn(async () => true),
      retry: vi.fn(async () => true),
      failPermanent: vi.fn(async () => true),
    },
    runtime,
    model,
    facts,
    productSearch,
    new FailClosedTagObservationProvider(),
    {
      workerId: "worker-bf08",
      mode: "LIVE",
      sendEnabled: true,
      employeeTagId: "25",
      decisionTelemetryEnabled: true,
    },
    { reserve: vi.fn(async () => true), close: vi.fn(async () => undefined) },
    undefined, undefined, undefined,
    resolver,
  );
  expect(await runner.processOne()).toBe(true);
  expect(commits).toHaveLength(1);
  return {
    commit: commits[0]!,
    generate,
    draftCustomerUrlExplanation,
    draftMultiProductClarification: model.draftMultiProductClarification!,
    searchText,
    productSearch,
  };
}

describe("BF-08 production-wrapper customer URL policy", () => {
  it.each([
    ["omitted", undefined],
    ["explicit strict", policy("STRICT_BLOCK_ALL")],
    ["shadow classified", policy("CLASSIFIED_ALLOWLIST_V1", "DISABLED")],
    ["rejected live classified", { status: "REJECTED", bundle: null } as RuntimePolicyResolution],
  ])("keeps %s on strict fail-closed behavior", async (_name, selectedPolicy) => {
    const result = await runTurn({
      text: "https://www.lanadesign.vn/sv695",
      ...(selectedPolicy ? { policy: selectedPolicy } : {}),
    });
    expect(result.searchText).not.toHaveBeenCalled();
    expect(result.generate).not.toHaveBeenCalled();
    expect(result.draftCustomerUrlExplanation).not.toHaveBeenCalled();
    expect(result.commit.metaPlan).toBeUndefined();
    expect(result.commit.pancakeTagPlan).toBeDefined();
    expect(result.commit.decisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventType: "GUARD_BLOCKED",
        reasonCodes: expect.arrayContaining(["CUSTOMER_URL_STRICT_BLOCK_ALL"]),
      }),
    ]));
  });

  it.each([
    "user@example.com/a?token=secret",
    "user@127/admin",
    "127/admin",
    "0177.0.0.1/admin",
    "example.com:abc/path",
  ])("keeps the production wrapper strict for scheme-less authority %s", async (text) => {
    const result = await runTurn({
      text: `please check ${text}`,
      policy: policy("STRICT_BLOCK_ALL"),
    });
    expect(result.searchText).not.toHaveBeenCalled();
    expect(result.generate).not.toHaveBeenCalled();
    expect(result.draftCustomerUrlExplanation).not.toHaveBeenCalled();
    expect(result.commit.metaPlan).toBeUndefined();
    expect(result.commit.pancakeTagPlan).toBeDefined();
    expect(JSON.stringify(result.commit)).not.toContain(text);
  });

  it.each([
    "chị chọn mẫu 1/2",
    "ngày 10/08",
  ])("keeps ordinary numeric slash text on the normal production path: %s", async (text) => {
    const result = await runTurn({
      text,
      policy: policy("STRICT_BLOCK_ALL"),
    });
    expect(result.draftCustomerUrlExplanation).not.toHaveBeenCalled();
    expect(JSON.stringify(result.commit.decisionEvents)).not.toContain("CUSTOMER_URL");
  });

  it("resolves an approved product URL offline through the production BF-02 wrapper", async () => {
    const result = await runTurn({
      text: "please check https://www.lanadesign.vn/products/SD398?utm_source=chat#detail",
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
      exactProduct: product("SD398"),
    });
    expect(result.searchText).toHaveBeenCalledWith("SD398");
    expect(result.productSearch.searchImage).not.toHaveBeenCalled();
    expect(result.productSearch.searchImageBytes).not.toHaveBeenCalled();
    expect(result.commit.metaPlan).toBeDefined();
    expect(result.commit.pancakeTagPlan).toBeUndefined();
  });

  it("authorizes generated Admin media only after exact verified catalog equality", async () => {
    const url = "https://admin.lanadesign.vn/lana-public/products/sd398-0123456789abcdef01234567.jpg";
    const result = await runTurn({
      text: `please check ${url}`,
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
      exactProduct: product("SD398", url),
    });
    expect(result.searchText).toHaveBeenCalledWith("SD398");
    expect(result.productSearch.searchImage).not.toHaveBeenCalled();
    expect(result.productSearch.searchImageBytes).not.toHaveBeenCalled();
    expect(result.commit.metaPlan).toBeDefined();
    expect(result.commit.pancakeTagPlan).toBeUndefined();
  });

  it("routes two approved product URLs through BF-07 clarification without selecting the first", async () => {
    const result = await runTurn({
      text: "compare https://www.lanadesign.vn/SD398 and https://www.lanadesign.vn/SV695",
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
      exactProducts: [product("SD398"), product("SV695")],
    });
    expect(result.searchText).toHaveBeenCalledWith("SD398");
    expect(result.searchText).toHaveBeenCalledWith("SV695");
    expect(result.generate).not.toHaveBeenCalled();
    expect(result.draftMultiProductClarification).toHaveBeenCalledOnce();
    expect(result.commit.metaPlan).toBeDefined();
    expect(result.commit.state).toMatchObject({
      currentProductId: null,
      mediaClarification: { status: "ACTIVE" },
    });
  });

  it("combines an approved URL with a residual product code before BF-07 clarification", async () => {
    const result = await runTurn({
      text: "compare https://www.lanadesign.vn/SD398 and SV695",
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
      exactProducts: [product("SD398"), product("SV695")],
    });
    expect(result.searchText).toHaveBeenCalledWith("SD398");
    expect(result.searchText).toHaveBeenCalledWith("SV695");
    expect(result.generate).not.toHaveBeenCalled();
    expect(result.draftMultiProductClarification).toHaveBeenCalledWith(
      ["SD398", "SV695"],
      expect.any(String),
      [],
    );
    expect(result.commit.state).toMatchObject({
      currentProductId: null,
      mediaClarification: { status: "ACTIVE" },
    });
  });

  it("fails closed when a residual product code beside an approved URL cannot be verified", async () => {
    const result = await runTurn({
      text: "compare https://www.lanadesign.vn/SD398 and ZZ999",
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
      exactProduct: product("SD398"),
    });
    expect(result.searchText).toHaveBeenCalledWith("SD398");
    expect(result.searchText).toHaveBeenCalledWith("ZZ999");
    expect(result.generate).not.toHaveBeenCalled();
    expect(result.draftMultiProductClarification).not.toHaveBeenCalled();
    expect(result.commit.metaPlan).toBeUndefined();
    expect(result.commit.pancakeTagPlan).toBeDefined();
    expect(result.commit.decisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventType: "GUARD_BLOCKED",
        reasonCodes: expect.arrayContaining(["CUSTOMER_URL_RESIDUAL_PRODUCT_UNRESOLVED"]),
      }),
    ]));
  });

  it("fails closed on two approved products when BF-07 clarification is not active", async () => {
    const result = await runTurn({
      text: "compare https://www.lanadesign.vn/SD398 and https://www.lanadesign.vn/SV695",
      policy: policy("CLASSIFIED_ALLOWLIST_V1", "LIVE_OUTBOUND", "OMITTED"),
      exactProducts: [product("SD398"), product("SV695")],
    });
    expect(result.generate).not.toHaveBeenCalled();
    expect(result.draftMultiProductClarification).not.toHaveBeenCalled();
    expect(result.commit.metaPlan).toBeUndefined();
    expect(result.commit.pancakeTagPlan).toBeDefined();
    expect(result.commit.decisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventType: "GUARD_BLOCKED",
        reasonCodes: expect.arrayContaining(["CUSTOMER_URL_MULTI_PRODUCT_POLICY_REQUIRED"]),
      }),
    ]));
  });

  it("explains a benign unsupported URL without handoff or raw URL exposure", async () => {
    const result = await runTurn({
      text: "please check https://example.com/product?token=secret",
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
    });
    expect(result.searchText).not.toHaveBeenCalled();
    expect(result.generate).not.toHaveBeenCalled();
    expect(result.draftCustomerUrlExplanation).toHaveBeenCalledOnce();
    expect(result.commit.metaPlan).toBeDefined();
    expect(result.commit.pancakeTagPlan).toBeUndefined();
    expect(JSON.stringify(result.commit)).not.toContain("token=secret");
  });

  it("uses only bounded repair output for an initially invalid explanation", async () => {
    const result = await runTurn({
      text: "please check https://example.com/product",
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
      explanationReplies: [
        "I cannot check that link\ncheck it. Please send an image.",
        "I cannot safely open that link. Please send the product code or an image so I can check it.",
      ],
    });
    expect(result.draftCustomerUrlExplanation).toHaveBeenCalledTimes(2);
    expect(result.draftCustomerUrlExplanation.mock.calls[1]?.[1]).toEqual(
      expect.arrayContaining([
        "CUSTOMER_URL_EXPLANATION_SAFETY_INVALID",
      ]),
    );
    expect(result.commit.metaPlan).toBeDefined();
    expect(result.commit.metaPlan?.messages).toEqual([{
      kind: "TEXT",
      text: "I cannot safely open that link. Please send the product code or an image so I can check it.",
    }]);
  });

  it("uses the deterministic safe fallback after two contradictory explanations", async () => {
    const unsafe = "I cannot safely open that link. Please send the product code or an image. Access it.";
    const result = await runTurn({
      text: "please check https://example.com/product",
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
      explanationReplies: [unsafe, unsafe],
    });
    expect(result.draftCustomerUrlExplanation).toHaveBeenCalledTimes(2);
    expect(result.commit.metaPlan).toBeDefined();
    expect(JSON.stringify(result.commit.metaPlan)).not.toContain("Access it");
    expect(result.commit.decisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reasonCodes: expect.arrayContaining([
          "CUSTOMER_URL_EXPLANATION_SAFETY_INVALID",
          "CUSTOMER_URL_SAFE_EXPLANATION_FALLBACK",
        ]),
      }),
    ]));
  });

  it("silently hands off dangerous URLs with a durable safety reason", async () => {
    const result = await runTurn({
      text: "please check https://169.254.169.254/latest/meta-data",
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
    });
    expect(result.searchText).not.toHaveBeenCalled();
    expect(result.generate).not.toHaveBeenCalled();
    expect(result.draftCustomerUrlExplanation).not.toHaveBeenCalled();
    expect(result.commit.metaPlan).toBeUndefined();
    expect(result.commit.pancakeTagPlan).toBeDefined();
    expect(result.commit.decisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventType: "GUARD_BLOCKED",
        reasonCodes: expect.arrayContaining(["CUSTOMER_URL_PRIVATE_ADDRESS"]),
      }),
    ]));
  });

  it.each([
    "[::1]/admin",
    "127.1/admin",
    "2130706433/admin",
    "0x7f000001/admin",
    "user:secret@example.com/a",
    "user@example.com/a?token=secret",
    "user@127.0.0.1/admin",
    "user@127/admin",
    "user@[::1]/admin",
    "lanadesign.vn@evil.test/a",
    "127/admin",
    "0177.0.0.1/admin",
    "0300.0250.0001.0001/admin",
    "localhost:999999/admin",
    "example.com:abc/path",
    "example.com:999999/path",
  ])("fails closed before model or resolver for scheme-less authority %s", async (text) => {
    const result = await runTurn({
      text: `please check ${text}`,
      policy: policy("CLASSIFIED_ALLOWLIST_V1"),
    });
    expect(result.searchText).not.toHaveBeenCalled();
    expect(result.generate).not.toHaveBeenCalled();
    expect(result.draftCustomerUrlExplanation).not.toHaveBeenCalled();
    expect(result.commit.metaPlan).toBeUndefined();
    expect(result.commit.pancakeTagPlan).toBeDefined();
    expect(JSON.stringify(result.commit)).not.toContain(text);
  });
});
