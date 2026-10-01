import { afterEach, describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import { createRealtimeSalesState } from "./realtime-sales-cycle.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";

// Import the actual process entrypoint and both BF compatibility wrappers.
// Replace external IO only; the loop executes one real processOne invocation.
const ports = vi.hoisted(() => ({
  inbox: {} as Record<string, unknown>, runtime: {} as Record<string, unknown>,
  facts: {} as Record<string, unknown>, search: {} as Record<string, unknown>,
  history: {} as Record<string, unknown>, model: {} as Record<string, unknown>,
  send: vi.fn(), loop: vi.fn(), reserve: vi.fn(),
}));
vi.mock("node:fs", async (load) => ({ ...await load<typeof import("node:fs")>(),
  readFileSync: (path: unknown, ...args: unknown[]) => {
    if (path === "synthetic-vertex-credential") return JSON.stringify({ email: "test@example.invalid", privateKey: "synthetic-not-a-key" });
    throw new Error(`UNEXPECTED_SERVER_FILE_READ:${String(path)}:${args.length}`);
  },
}));
vi.mock("@lana/database", async (load) => ({ ...await load<typeof import("@lana/database")>(),
  LocalEnvelopeCipher: class {},
  PostgresRealtimeInboxStore: class { constructor() { return ports.inbox; } },
  PostgresRealtimeRuntimeStore: class { constructor() { return ports.runtime; } },
  PostgresChatHistoryStore: class { constructor() { return ports.history; } },
}));
vi.mock("./redis-business-facts.js", () => ({ RedisBusinessFactsReader: class { constructor() { return ports.facts; } } }));
vi.mock("./redis-product-search-cache.js", () => ({ RedisCachedProductSearch: class { constructor() { return ports.search; } } }));
vi.mock("./realtime-quota.js", () => ({ RedisRealtimeGenerationQuota: class {
  reserve = ports.reserve; close = async () => undefined;
} }));
vi.mock("./vertex.js", async (load) => ({ ...await load<typeof import("./vertex.js")>(),
  VertexShadowModel: class { constructor() { return ports.model; } },
}));
vi.mock("./context-v2-candidate.js", async (load) => ({ ...await load<typeof import("./context-v2-candidate.js")>(),
  FetchCandidateVertexTransport: class { send = ports.send; },
}));
vi.mock("./realtime-loop.js", () => ({ runRealtimeLoop: ports.loop }));

const signalListeners = new Map((["SIGINT", "SIGTERM"] as const).map((s) => [s, process.listeners(s)]));
afterEach(() => {
  vi.unstubAllEnvs(); vi.restoreAllMocks();
  for (const [signal, original] of signalListeners) {
    for (const listener of process.listeners(signal)) if (!original.includes(listener)) process.removeListener(signal, listener);
  }
});

describe("realtime server C3 DRY_RUN composition", () => {
  it.each(["ON", "OFF", "HUMAN", "REJECT_MATCH", "REJECT_MISSING", "REJECT_IGNORED", "C3_RECOVERY", "QUOTA_DENIED", "QUOTA_ERROR"] as const)("runs actual server with fake IO: %s", async (mode) => {
    const rejection = mode.startsWith("REJECT_");
    vi.resetModules(); vi.clearAllMocks();
    ports.reserve.mockReset();
    if (mode === "QUOTA_ERROR") ports.reserve.mockRejectedValue(new Error("quota token=private"));
    else ports.reserve.mockResolvedValue(mode !== "QUOTA_DENIED");
    // Override optional process flags as well as required synthetic endpoints.
    for (const key of Object.keys(process.env)) if (/^(REALTIME_|DF13_|RUNTIME_POLICY_|HISTORY_|AD_ACQUISITION_|PANCAKE_|APP_SEND_|CHATBOT_SEND_)/u.test(key)) vi.stubEnv(key, "");
    const env = { REALTIME_MODE: "DRY_RUN", APP_SEND_ENABLED: "false", CHATBOT_SEND_ENABLED: "false",
      DATABASE_URL: "postgres://synthetic.invalid/offline", REALTIME_DATA_KEY: "synthetic",
      REDIS_URL: "redis://synthetic.invalid", VERTEX_CREDENTIAL_FILE: "synthetic-vertex-credential",
      VERTEX_PROJECT_ID: "offline-test", VERTEX_MODEL_NAME: "gemini-3.5-flash-lite",
      QDRANT_BASE_URL: "https://synthetic.invalid", QDRANT_API_KEY: "synthetic", QDRANT_COLLECTION: "offline",
      META_PAGE_ID: "1198992073286645", META_APP_ID: "123456789", ANALYTICS_HASH_SALT: "synthetic",
      REALTIME_DRY_RUN_ASSUME_TAGS_CLEAR: "true", REALTIME_DECISION_TELEMETRY_ENABLED: "true",
      HISTORY_WRITE_ENABLED: "true", SALES_CYCLE_ENABLED: "true", DF13_COMMERCE_PREPROD_STARTUP_MODE: "LEGACY",
      REALTIME_C3_LOCAL_TEST_ENABLED: mode === "OFF" ? "false" : "true" };
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const now = new Date(); const at = now.toISOString(); const pageId = env.META_PAGE_ID;
    const conversationId = "43820fd4-daa7-4917-9835-a38cb5512001";
    const state = { ...createConversationState({ conversationId, routingOwner: "APP", now }),
      currentProductId: rejection ? "CB182" : null,
      consideredVariant: { offerType: rejection ? "SET" : null, color: rejection ? "BE" : null, size: rejection ? "M" : null },
      conversationOwner: mode === "HUMAN" ? "HUMAN" as const : "BOT" as const };
    const entry = { inboxId: "2a9afc47-978a-4b74-9653-3c89e75a8001", pageId,
      eventKey: "synthetic-server-event", conversationHash: "synthetic-server", occurredAt: now, receivedAt: now,
      receiveSequence: 1, attemptCount: 1, leaseToken: "68c52ee9-9348-481d-a366-a6178618da3c", eventKind: "CUSTOMER",
      envelope: { schemaVersion: 1, customerSendEnabled: false,
        routing: { mode: "APP", routingOwner: "APP", evaluationOnly: false, reason: "APP_OWNS" },
        message: { schemaVersion: 1, traceId: "synthetic-server", eventKey: "synthetic-server-event", pageId,
          messageId: "synthetic-server-message", senderId: "synthetic-customer", conversationId,
          occurredAt: at, isEcho: false, appId: null,
          text: rejection ? "Chị không chọn CB182, tìm mẫu khác nhé." : "Mẫu CB182 bao nhiêu?", attachments: [] } } };
    const ready = async () => true; const close = async () => undefined;
    const commit = vi.fn(async () => ({ stateCommitted: true, metaOutboxCreated: 0,
      pancakeTagOutboxCreated: false, handoffEventCreated: false, sendAuthorized: false,
      reasonCodes: [], inboxBatchStatus: "COMMITTED" }));
    const retry = vi.fn(async () => true);
    ports.inbox = { ready, close, claimNext: async () => null, claimNextBatch: async () => ({ pageId,
      conversationHash: entry.conversationHash, generation: 1, leaseToken: entry.leaseToken,
      inboxIds: [entry.inboxId], evaluationGroupId: "92596683-42b4-475c-845c-0f2a55ea2001",
      eventKind: "CUSTOMER", firstReceiveSequence: 1, lastReceiveSequence: 1, attemptCount: 1, items: [entry] }),
      isBatchCurrent: ready, complete: ready, completeBatch: ready, retry, retryBatch: retry, failPermanent: retry, failBatchPermanent: retry };
    ports.runtime = { close, loadOrCreate: async () => ({ conversationId, pageId, customerHash: entry.conversationHash,
      stateVersion: state.revision, state, routingOwner: "APP", appSendEnabled: false, killSwitch: false }),
      loadOrCreateSalesCycle: async () => ({ conversationId, pageId, stateRevision: 0,
        state: createRealtimeSalesState(conversationId, pageId, now), cartExpiresAt: null,
        expiresAt: new Date(now.getTime() + 86400000) }), commit, linkProviderConversation: close };
    ports.history = { ready, close, recordInboundCustomerMessage: async () => ({ messagePk: "00000000-0000-4000-8000-000000000001" }),
      recordOutboundHumanMessage: close };
    const product = { productId: "CB182", parentProductId: "CB182", canonicalCode: "CB182", aliases: [],
      title: "Set Thiên Giao", colors: ["BE"], materials: [], silhouettes: [], occasions: [], imageUrls: [], images: [], catalogVersion: "offline" };
    const searchText = vi.fn(async (query: string, exclude?: string) => {
      if (mode === "REJECT_MISSING" && exclude) return { status: "NOT_FOUND" };
      const selected = mode === "REJECT_MATCH" && exclude ? { ...product,
        productId: "SV9031", parentProductId: "SV9031", canonicalCode: "SV9031" } : product;
      return { status: "MATCHED", matchKind: "EXACT_CODE", score: 1, gap: null, product: selected };
    });
    ports.search = { ready, close, searchText, searchImage: vi.fn() };
    ports.facts = { ready, close, resolve: async (query: { productId: string }) => ({ schemaVersion: 1, status: "OK", source: "POS_SNAPSHOT",
      observedAt: at, expiresAt: new Date(now.getTime() + 86400000).toISOString(), productId: query.productId,
      facts: { schemaVersion: 1, productId: query.productId, parentProductId: query.productId, offerType: "SET", listPriceVnd: null,
        salePriceVnd: 799000, sizes: ["M"], stockStatus: "IN_STOCK", stockQuantity: 2,
        deliveryEta: null, fulfillmentPolicy: "READY_STOCK", imageUrls: [] }, reasonCode: null }) };
    const generate = vi.fn(async () => ({ modelVersion: "synthetic", latencyMs: 1, tokenUsage: {}, proposal: {
      schemaVersion: 1, intent: "price", conversationStage: "DISCOVERY", productId: "CB182", action: "REPLY",
      reply: "Em đang hỗ trợ chị.", attachments: [], handoffReason: null,
      businessFactQuery: { intent: "PRICE", offerType: "SET", color: null, size: null, deliveryRegion: null } } }));
    ports.model = { generate, groundWithFacts: generate };
    const stages: string[] = [];
    ports.send.mockImplementation(async ({ body }: { body: string }) => {
      const prompt = JSON.parse(JSON.parse(body).contents[0].parts[0].text);
      stages.push(prompt.contractVersion);
      const response = prompt.contractVersion === "REALTIME_CUSTOMER_INPUT_V1" ? {
        ...noCustomerSelection(), ...(rejection ? { product: {
          operation: "REJECT", productId: "CB182", evidenceText: entry.envelope.message.text,
        } } : {}),
      }
        : prompt.contractVersion === "TRACK_C_C3_STRATEGIST_INPUT_V1" ? {
          replyAct: "ANSWER", goal: [
            "NEED: Answer the current price.",
            "KNOWN: NONE",
            "ANSWER: selected evidence for the current request",
            "LIMIT: NONE",
            "NEXT: NONE",
          ].join("\n"), proposition: "PRICE",
          evidenceRefs: prompt.selectableEvidence.filter((v: { capability: string }) => v.capability === "PRICE").map((v: { ref: string }) => v.ref),
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }
        : mode === "C3_RECOVERY"
          ? { answerText: "Size XL sẽ vừa với chị.", factualTexts: [], progressionText: null }
          : { answerText: null, factualTexts: [], progressionText: null };
      return { providerModelVersion: "gemini-3.5-flash-lite", payload: {
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2, totalTokenCount: 17 },
        candidates: [{ content: { parts: [{ text: JSON.stringify(response) }] } }] } };
    });
    ports.loop.mockImplementation(async ({ runner, mode: runMode, sendEnabled }) => {
      expect(runMode).toBe("DRY_RUN"); expect(sendEnabled).toBe(false);
      expect(await runner.processOne()).toBe(true);
    });
    await import("./realtime-server.js");
    expect(ports.loop).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledOnce();
    const written = commit.mock.calls[0] as unknown as [{ metaPlan?: unknown; decisionEvents?: { details: { c3Candidate?: unknown } }[] }];
    expect(written[0].metaPlan).toBeUndefined();
    const observed = (commit.mock.calls[0] as unknown as [{ decisionEvents?: {
      details: { c3ModelCalls?: { role: string; status: string; latencyMs: number;
        tokenUsage: { prompt: number | null; output: number | null; thinking: number | null; total: number | null } }[] }
    }[] }])[0].decisionEvents?.find(({ details }) => details.c3ModelCalls)?.details.c3ModelCalls;
    if (mode === "ON" || mode === "C3_RECOVERY") {
      expect(ports.reserve).toHaveBeenCalledTimes(1);
      expect(observed?.map(({ role }) => role)).toEqual(["CUSTOMER_INPUT", "STRATEGIST", "RESPONDER"]);
      for (const call of observed ?? []) {
        expect(call).toMatchObject({ status: "RETURNED", tokenUsage: { prompt: 10, output: 5, thinking: 2, total: 17 } });
        expect(call.latencyMs).toBeGreaterThanOrEqual(0);
      }
      expect(JSON.stringify(observed)).not.toContain("synthetic-customer");
    } else if (mode === "HUMAN" || mode === "OFF") expect(observed).toBeUndefined();
    if (mode === "QUOTA_DENIED" || mode === "QUOTA_ERROR") {
      expect(stages).toEqual([]);
      expect(observed).toBeUndefined();
      expect(generate).not.toHaveBeenCalled();
      expect(ports.reserve).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(written)).toContain(mode === "QUOTA_DENIED"
        ? "REALTIME_GENERATION_QUOTA_EXCEEDED" : "REALTIME_GENERATION_QUOTA_UNAVAILABLE");
      expect(JSON.stringify(written)).not.toContain("token=private");
      return;
    }
    if (mode === "HUMAN") expect(ports.reserve).not.toHaveBeenCalled();
    if (rejection) {
      expect(searchText).toHaveBeenCalledWith(entry.envelope.message.text, "CB182");
      const persisted = (commit.mock.calls[0] as unknown as [{ state: { currentProductId: string | null;
        consideredVariant: { size: string | null };
        sessionDecisionContext?: { rejectedProductIds: string[] } } }])[0].state;
      expect(persisted.currentProductId).toBe(mode === "REJECT_MATCH" ? "SV9031" : null);
      expect(persisted.consideredVariant.size).toBeNull();
      expect(persisted.sessionDecisionContext?.rejectedProductIds).toContain("CB182");
      expect(generate).not.toHaveBeenCalled();
      return;
    }
    if (mode === "C3_RECOVERY") {
      expect(stages).toEqual(["REALTIME_CUSTOMER_INPUT_V1", "TRACK_C_C3_STRATEGIST_INPUT_V1", "TRACK_C_C3_RESPONDER_INPUT_V1"]);
      expect(generate).not.toHaveBeenCalled();
      const candidates = written[0].decisionEvents?.flatMap(({ details }) =>
        details.c3Candidate ? [details.c3Candidate as { status: string; reason: string | null;
          reasonCodes?: readonly string[]; redactedReply: string | null; selectedForOutbound: boolean }] : []) ?? [];
      expect(candidates).toContainEqual(expect.objectContaining({
        status: "VALIDATED", reason: "C3_SELECTED_FACTS_RECOVERY",
        reasonCodes: expect.arrayContaining(["SIZE_RECOMMENDATION_UNDECLARED"]),
        redactedReply: "Em chưa xác nhận được đầy đủ thông tin chị hỏi. Giá hiện tại của mẫu này là 799.000đ ạ.", selectedForOutbound: false,
      }));
    } else if (mode === "ON") {
      expect(stages).toEqual(["REALTIME_CUSTOMER_INPUT_V1", "TRACK_C_C3_STRATEGIST_INPUT_V1", "TRACK_C_C3_RESPONDER_INPUT_V1"]);
      expect(written[0].decisionEvents?.some(({ details }) =>
        (details.c3Candidate as { status?: string; selectedForOutbound?: boolean } | undefined)?.status === "VALIDATED" &&
        (details.c3Candidate as { selectedForOutbound: boolean }).selectedForOutbound === false)).toBe(true);
      expect(generate).not.toHaveBeenCalled();
    } else {
      expect(stages).toEqual([]);
      if (mode === "HUMAN") expect(generate).not.toHaveBeenCalled();
    }
  }, 30_000);
});
