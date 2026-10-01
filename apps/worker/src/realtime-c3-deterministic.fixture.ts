/** Safe external ports for deterministic full-runtime controls, not model acceptance. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import {
  buildProductAttributesV1, CatalogSnapshotV3Schema, resolveCatalogFacts,
  type CatalogSnapshotV3, type StableProductDocument,
} from "@lana/business-tools";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import type { RealtimeCustomerInput } from "@lana/contracts";
import {
  RealtimeRunner, type RealtimeInboxPort, type RealtimeModelPort,
  type RealtimeProductSearchPort, type RealtimeRuntimePort,
} from "./realtime-runner.js";
import { createRealtimeSalesState } from "./realtime-sales-cycle.js";
import { cartSelectionFromSnapshot, verifiedVariantFromSnapshot } from "./realtime-sales-catalog.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { ChatHistoryAppendInput, ChatHistoryPort } from "./redis-chat-history.js";
import { buildRealtimeProductFactsV2 } from "./realtime-product-facts-v2.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { CONTEXT_V2_CANDIDATE_PROVIDER_VERSION } from "./context-v2-candidate.js";

type CommitInput = Parameters<RealtimeRuntimePort["commit"]>[0];
type Receipt = Awaited<ReturnType<RealtimeRuntimePort["commit"]>>;
type Batch = NonNullable<Awaited<ReturnType<NonNullable<RealtimeInboxPort["claimNextBatch"]>>>>;
export type ModelInput = {
  contractVersion: string;
  selectableEvidence?: { ref: string; capability: string; realizationText?: string }[];
  dialogue?: { direction: string; text: string }[];
  [key: string]: unknown;
};
export type TurnScript = {
  text: string;
  producer?: unknown;
  strategist?: (input: ModelInput) => unknown;
  responder?: unknown | ((input: ModelInput) => unknown);
  responderFailure?: "TRANSPORT" | "JSON";
  commitFailure?: "THROW" | "SUPERSEDED";
  attemptCount?: number;
};
export const AT = "2026-10-01T11:00:00.000Z";
const pageId = "100000000000001";
const conversationId = "43820fd4-daa7-4917-9835-a38cb5512001";
const customerHash = "synthetic:c3-deterministic";
const uuid = (value: string) => {
  const h = createHash("sha256").update(value).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

export function inputDelta(patch: Partial<RealtimeCustomerInput> = {}): unknown {
  return { ...noCustomerSelection(), ...patch };
}

/** Scripted plan selects refs from the actual runtime evidence, not fabricated facts. */
export function answerPlan(capability = "PRICE", limit = "NONE", need = "Answer the current fact question") {
  return (input: ModelInput) => ({
    replyAct: "ANSWER", proposition: capability,
    evidenceRefs: input.selectableEvidence?.filter((entry) => entry.capability === capability).map(({ ref }) => ref) ?? [],
    goal: [`NEED: ${need}`, "KNOWN: NONE", "ANSWER: selected evidence for the request", `LIMIT: ${limit}`, "NEXT: NONE"].join("\n"),
    continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
  });
}

function catalog(productId: string, price: number, emptySize = "S"): CatalogSnapshotV3 {
  return CatalogSnapshotV3Schema.parse({
    schema_version: 3, release_id: "synthetic-pos-1", catalog_version: "synthetic-catalog-1",
    policy_version: "synthetic-policy-1", shop_alias: "LANA", brand: "LANA", product_id: productId,
    synced_at: AT, data_status: "OK",
    fulfillment_policy: { tinh_trang: "READY_STOCK", can_order_when_zero: false,
      prep_min_days: 0, prep_max_days: 0, zero_stock_policy: "",
      zero_stock_prep_min_days: null, zero_stock_prep_max_days: null, eta_valid_until: "" },
    selling_rules: { allow_mixed_sizes: true, allow_component_sale: false, source_version: "synthetic-registry-1" },
    shipping_eta: { DEFAULT: { transit_min_days: 2, transit_max_days: 4 } },
    offers: { SET: { list_price: null, sale_price: price, price_status: "OK",
      rows: ["S", "M", "L"].map((size) => ({ offer_type: "SET", price_sku: `${productId}-SET`,
        color: "BE", size, stock_quantity: size === emptySize ? 0 : 5, list_price: null, sale_price: price,
        stock_status: "OK", bom_status: "OK", parent_variation_id: `${productId}-BE-${size}`,
        components: ["AO", "CV"].map((role) => ({ product_sku: `${productId}-${role}`,
          variation_sku: `${productId}-${role}-BE-${size}`, color: "BE", size, quantity: 1 })),
      })),
    } },
  });
}

function product(productId: string): StableProductDocument {
  return { productId, parentProductId: productId, canonicalCode: productId, aliases: [],
    title: `Set ${productId}`, colors: ["BE"], materials: ["COTTON"], silhouettes: [], occasions: [],
    attributes: buildProductAttributesV1({ productId, observedAt: AT, data: {
      materials: ["cotton"], colors: ["be"], styles: [], silhouettes: [], occasions: [],
      materialComponents: {}, designAttributes: null, careInstructions: null, wearProperties: null,
      backCoverage: null, designComplexity: null,
    } }), imageUrls: [], images: [], catalogVersion: "synthetic-catalog-1" };
}

function policy(): RuntimePolicyResolution {
  const metadata = { authority: "ADMIN_POLICY", sourceVersion: "synthetic-policy-1", observedAt: AT,
    expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" };
  return {
    status: "RESOLVED", source: "DATABASE", mayAffectOutbound: true, reasonCodes: [], auditWrite: "RECORDED",
    audit: { channel: "PUBLISHED", bundleHash: `sha256:${"a".repeat(64)}`, pinScopeType: "SALES_EPISODE", pinScopeId: `${conversationId}:PUBLISHED` },
    bundle: { schemaVersion: 1, bundleId: "synthetic-policy-1", bundleHash: `sha256:${"a".repeat(64)}`, pageId,
      channel: "PUBLISHED", sideEffects: "LIVE_OUTBOUND", resolvedAt: AT, policy: {
        schemaVersion: 1, policyBundleId: "synthetic-policy-1", policyVersion: "synthetic-policy-1", shopId: "LANA",
        status: "ACTIVE", effectiveAt: AT, effectiveUntil: null, supersedesPolicyVersion: null, scope: "SHOP_WIDE",
        commerceAuthority: { bomAuthority: "PANCAKE_POS", priceAuthority: "PANCAKE_POS", inventoryAuthority: "PANCAKE_POS",
          allowGoogleSheetsPriceOverride: false, allowAdminPriceOverride: false, missingPriceBehavior: "DO_NOT_QUOTE", metadata },
        shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata },
        multiItemOffer: { minimumProductCount: 2, discountBps: 500, countingUnit: "PARENT_PRODUCT_UNIT",
          setAndComboCountAsOne: true, scope: "SHOP_WIDE", metadata },
        negotiation: { secondConcession: { freeShipping: true, fixedDiscountVnd: 0 }, finalConcession: { freeShipping: true, fixedDiscountVnd: 20_000 },
          stacking: { multiItemDiscountWithSecondConcession: true, multiItemDiscountWithFinalConcession: true, deduplicateFreeShipping: true }, scope: "SHOP_WIDE", metadata },
        closing: { customerStates: ["READY", "HESITANT", "CAUTIOUS"], decisionMode: "DETERMINISTIC_POLICY_ONLY", allowUnlistedOffers: false, metadata },
      }, versionReferences: [], artifacts: { shopPolicy: { customerCare: {
        exchange: { windowDaysFromReceipt: 15, maxExchangesPerOrder: 1, supportedActions: ["SIZE", "COLOR", "MODEL"],
          saleRestriction: { discountThresholdBps: 3_000, allowedActions: ["SIZE", "COLOR"] },
          requiredConditions: { originalTags: true, unused: true, unwashed: true, clean: true, undamaged: true },
          totalTwoWayShippingFeeVnd: 30_000, modelExchangePricing: "NEW_PRODUCT_LIST_PRICE_NO_SALE",
          customerPaysPositivePriceDifference: true, fulfillmentMethod: "COURIER_SWAP" },
        returns: { eligibleReasons: ["MANUFACTURING_FABRIC_DEFECT", "MANUFACTURING_SEAM_DEFECT", "WRONG_PRODUCT_SENT"],
          reportingWindowDaysFromReceipt: 5, shopShippingCoveragePercent: 100, refundBusinessDaysMin: 1, refundBusinessDaysMax: 3,
          refundStartsAfter: "SHOP_CONFIRMS_ELIGIBLE_ERROR" },
        inspection: { tryOnMode: "HOLD_UP_ONLY", refusedParcelShippingFeeVnd: 30_000 },
        marketplacePricing: { shopeePriceMatch: false, reason: "PLATFORM_SUBSIDY_AND_VOUCHERS" },
        customerFaq: { discloseLightingAndDisplayColorVariance: true, handWashPreferred: true, machineWashAllowedWithLaundryBagAndGentleCycle: true },
      } }, offerPolicy: {}, closingStrategy: {}, sizeCharts: {}, handoffMatrix: null, paymentPolicy: null } },
  } as unknown as RuntimePolicyResolution;
}

export function deterministicRuntime(options: { verifiedVariant?: boolean; multiFact?: boolean } = {}) {
  let state = createConversationState({ conversationId, routingOwner: "APP", now: new Date(AT) });
  let commerce = createRealtimeSalesState(conversationId, pageId, new Date(AT));
  let sequence = 0;
  let batch: Batch | null = null;
  let script: TurnScript = { text: "" };
  const terminal = new Set<number | null>();
  const attempts: CommitInput[] = [];
  const committed: { input: CommitInput; receipt: Receipt }[] = [];
  const receipts: Receipt[] = [];
  const roleCalls: { role: "PRODUCER" | "STRATEGIST" | "RESPONDER"; input: ModelInput; status: string }[] = [];
  const inboxEvents: { kind: string; reason?: string }[] = [];
  const historyValues: ChatHistoryAppendInput[] = [];
  const traces: unknown[] = [];
  const snapshots = new Map([catalog("CB182", 799_000), catalog("SV9031", 699_000), catalog("SD12", 599_000)]
    .map((entry) => [entry.product_id, entry]));
  const documents = new Map([...snapshots.keys()].map((id) => [id, product(id)]));
  for (const [id, snapshot] of snapshots) {
    expect(buildRealtimeProductFactsV2({ snapshot, product: documents.get(id)!, policy: policy(), now: new Date(AT) })).not.toBeNull();
  }
  const failures = new Set<string>();
  const inbox: RealtimeInboxPort = {
    claimNext: vi.fn(async () => null),
    claimNextBatch: vi.fn(async () => batch && !terminal.has(batch.generation) ? batch : null),
    isBatchCurrent: vi.fn(async (lease) => batch?.generation === lease.generation && !terminal.has(lease.generation)),
    complete: vi.fn(async () => true), completeBatch: vi.fn(async (lease) => { terminal.add(lease.generation); inboxEvents.push({ kind: "COMPLETE" }); return true; }),
    retry: vi.fn(async () => true), retryBatch: vi.fn(async (_lease, reason) => { inboxEvents.push({ kind: "RETRY", reason }); return true; }),
    failPermanent: vi.fn(async () => true), failBatchPermanent: vi.fn(async (_lease, reason) => { inboxEvents.push({ kind: "FAILED_PERMANENT", reason }); return true; }),
  };
  const history: ChatHistoryPort = {
    ready: async () => true, close: async () => undefined,
    load: vi.fn(async (_id, limit = 30) => structuredClone(historyValues.slice(-limit))),
    append: async (_id, value) => {
      if (!historyValues.some((entry) => entry.identityKey === value.identityKey)) historyValues.push(structuredClone(value));
      return true;
    },
  };
  const runtime: RealtimeRuntimePort = {
    loadOrCreate: vi.fn<RealtimeRuntimePort["loadOrCreate"]>(async () => ({ conversationId, pageId, customerHash, stateVersion: state.revision,
      state: structuredClone(state), routingOwner: "APP", appSendEnabled: true, killSwitch: false })),
    loadOrCreateSalesCycle: async <TState>() => ({ conversationId, pageId, stateRevision: commerce.revision,
      state: structuredClone(commerce) as TState, cartExpiresAt: null, expiresAt: new Date("2099-01-01T00:00:00Z") }),
    linkProviderConversation: vi.fn(async () => undefined),
    commit: vi.fn<RealtimeRuntimePort["commit"]>(async (input) => {
      attempts.push(structuredClone(input));
      if (script.commitFailure === "THROW") throw new Error("synthetic commit failure: recipient=0900000000 credential=NOT_A_REAL_SECRET");
      if (script.commitFailure === "SUPERSEDED") {
        const receipt: Receipt = { stateCommitted: false, metaOutboxCreated: 0,
          pancakeTagOutboxCreated: false, handoffEventCreated: false, sendAuthorized: false,
          reasonCodes: ["INBOX_BATCH_SUPERSEDED"], inboxBatchStatus: "SUPERSEDED" };
        receipts.push(receipt);
        return receipt;
      }
      expect(input.expectedStateVersion).toBe(state.revision);
      expect(input.inboxBatchGuard?.generation).toBe(batch!.generation);
      expect(terminal.has(batch!.generation), "No repeated durable effect for an Inbox generation").toBe(false);
      if (input.salesCyclePlan) expect(input.salesCyclePlan.expectedRevision).toBe(commerce.revision);
      if (input.salesCycleReadback) expect(input.salesCycleReadback.expectedRevision).toBe(commerce.revision);
      state = structuredClone(input.state);
      if (input.salesCyclePlan) commerce = structuredClone(input.salesCyclePlan.state);
      const receipt: Receipt = { stateCommitted: true, metaOutboxCreated: input.metaPlan?.messages.length ?? 0,
        pancakeTagOutboxCreated: input.pancakeTagPlan !== undefined, handoffEventCreated: input.handoffEventPlan !== undefined,
        sendAuthorized: input.metaPlan !== undefined, reasonCodes: [], inboxBatchStatus: "COMMITTED" };
      committed.push({ input: structuredClone(input), receipt });
      receipts.push(receipt);
      terminal.add(batch!.generation);
      // The fake delivery accepts only committed outbound, never an attempted plan.
      const text = input.metaPlan?.messages.flatMap((unit) => unit.kind === "TEXT" ? [unit.text] : []).join("\n");
      if (text) historyValues.push({ direction: "OUTBOUND", senderType: "BOT", messageType: "TEXT", text,
        attachmentCount: 0, occurredAt: new Date().toISOString(), identityKey: `accepted:${batch!.generation}` });
      return receipt;
    }),
  };
  const model: RealtimeModelPort = { generate: vi.fn(async () => { throw new Error("UNEXPECTED_LEGACY_MODEL"); }),
    groundWithFacts: vi.fn(async () => { throw new Error("UNEXPECTED_LEGACY_GROUNDING"); }) };
  const facts: BusinessFactsReader = {
    ready: async () => true, close: async () => undefined,
    readCatalogSnapshot: vi.fn(async (_shop, id) => snapshots.get(id) ?? null),
    resolve: vi.fn<BusinessFactsReader["resolve"]>(async (query, now = new Date()) => {
      if (failures.has(`${query.productId}:${query.intent}`)) throw new Error("SYNTHETIC_LOOKUP_PORT_UNAVAILABLE");
      const value = snapshots.get(query.productId);
      if (!value) return { schemaVersion: 1, productId: query.productId, status: "NOT_FOUND", source: "POS_SNAPSHOT",
        observedAt: now.toISOString(), expiresAt: null, facts: null, reasonCode: "CATALOG_SNAPSHOT_NOT_FOUND" };
      return resolveCatalogFacts(value, query, now, 172_800);
    }),
    resolveCartSelection: vi.fn(async (query, now = new Date()) => cartSelectionFromSnapshot(snapshots.get(query.productId), query, now)),
    resolveVerifiedVariant: vi.fn(async (query, now = new Date()) => verifiedVariantFromSnapshot(snapshots.get(query.productId), query, now)),
  };
  const search: RealtimeProductSearchPort = {
    searchText: vi.fn<RealtimeProductSearchPort["searchText"]>(async (query) => {
      const id = [...documents.keys()].find((id) => query.includes(id));
      const value = id ? documents.get(id) : undefined;
      return value ? { status: "MATCHED", matchKind: "EXACT_CODE", score: 1, gap: null, product: value }
        : { status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" };
    }),
    // Deliberately include excluded candidates: runtime must recheck the shortlist.
    searchAlternatives: vi.fn(async () => [...documents.values()]),
    searchImage: vi.fn(async () => { throw new Error("UNEXPECTED_IMAGE_SEARCH"); }),
  };
  const transport = { send: vi.fn(async (request: { body: string }) => {
    const payload = JSON.parse(request.body);
    const input = JSON.parse(payload.contents[0].parts[0].text) as ModelInput;
    const role = input.contractVersion === "REALTIME_CUSTOMER_INPUT_V1" ? "PRODUCER"
      : input.contractVersion === "TRACK_C_C3_STRATEGIST_INPUT_V1" ? "STRATEGIST"
      : input.contractVersion === "TRACK_C_C3_RESPONDER_INPUT_V1" ? "RESPONDER" : null;
    if (!role) throw new Error("UNEXPECTED_MODEL_CONTRACT");
    const call: (typeof roleCalls)[number] = { role, input, status: "RETURNED" };
    roleCalls.push(call);
    if (role === "RESPONDER" && script.responderFailure === "TRANSPORT") {
      call.status = "THREW";
      throw new Error("SYNTHETIC_RESPONDER_UNAVAILABLE");
    }
    const value = role === "PRODUCER" ? script.producer ?? noCustomerSelection()
      : role === "STRATEGIST" ? (script.strategist ?? answerPlan())(input)
      : typeof script.responder === "function" ? script.responder(input)
      : script.responder ?? { answerText: null, factualTexts: [], progressionText: null };
    return { payload: { candidates: [{ content: { parts: [{ text: role === "RESPONDER" && script.responderFailure === "JSON"
      ? "{broken" : JSON.stringify(value) }] } }] }, providerModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION };
  }) };
  const runner = new RealtimeRunner(inbox, runtime, model, facts, search,
    { observe: async ({ now }) => ({ schemaVersion: 1, verified: true, blockingTag: null, observedTagIds: [], observedAt: now.toISOString(), reasonCode: null }) },
    { workerId: "deterministic-only", mode: "LIVE", sendEnabled: true, salesCycleEnabled: true,
      recordedReplayCaptureEnabled: true, recordedReplayPageId: pageId, contextV2CaptureEnabled: true,
      decisionTelemetryEnabled: true, verifiedVariantEnabled: options.verifiedVariant ?? true,
      multiFactQueryEnabled: options.multiFact ?? false,
      c3: { customerInputEnabled: true, modelResource: `projects/synthetic/locations/global/publishers/google/models/${CONTEXT_V2_CANDIDATE_PROVIDER_VERSION}`, transport } },
    undefined, history, { recordInboundCustomerMessage: async () => ({ messagePk: uuid(`source:${sequence}`) }), recordOutboundHumanMessage: async () => undefined },
    undefined, { resolve: async () => policy() });
  const stateSnapshot = () => structuredClone({ conversation: state, commerce });
  async function turn(next: TurnScript, retry = false) {
    script = next;
    if (!retry) sequence += 1;
    const occurredAt = new Date(Date.parse(AT) + sequence * 1_000);
    vi.setSystemTime(occurredAt);
    const eventKey = `synthetic:${sequence}`;
    const entry = { inboxId: uuid(`inbox:${sequence}`), pageId, eventKey, conversationHash: customerHash,
      occurredAt, receivedAt: occurredAt, receiveSequence: sequence, attemptCount: next.attemptCount ?? 1,
      leaseToken: uuid(`lease:${sequence}`), eventKind: "CUSTOMER" as const,
      envelope: { schemaVersion: 1 as const, customerSendEnabled: false as const,
        routing: { mode: "APP" as const, routingOwner: "APP" as const, evaluationOnly: false, reason: "APP_OWNS" as const },
        message: { schemaVersion: 1 as const, traceId: eventKey, eventKey, pageId, messageId: eventKey, senderId: "synthetic-customer",
          conversationId: customerHash, occurredAt: occurredAt.toISOString(), isEcho: false, appId: null, text: next.text, attachments: [] } } };
    batch = { pageId, conversationHash: customerHash, generation: sequence, leaseToken: entry.leaseToken,
      inboxIds: [entry.inboxId], evaluationGroupId: uuid(`group:${sequence}`), eventKind: "CUSTOMER",
      firstReceiveSequence: sequence, lastReceiveSequence: sequence, attemptCount: entry.attemptCount, items: [entry] };
    const before = stateSnapshot();
    const historyBefore = structuredClone(historyValues);
    const offsets = { attempts: attempts.length, committed: committed.length, roles: roleCalls.length, events: inboxEvents.length, receipts: receipts.length, lookups: vi.mocked(facts.resolve).mock.calls.length };
    const processed = await runner.processOne();
    const commits = committed.slice(offsets.committed);
    const reply = commits.flatMap(({ input }) => input.metaPlan?.messages.flatMap((m) => m.kind === "TEXT" ? [m.text] : []) ?? []).join("\n");
    const lookups = await Promise.all(vi.mocked(facts.resolve).mock.calls.slice(offsets.lookups).map(async ([query], index) => {
      try { return { query, result: await vi.mocked(facts.resolve).mock.results[offsets.lookups + index]!.value }; }
      catch { return { query, error: "SYNTHETIC_LOOKUP_PORT_UNAVAILABLE" }; }
    }));
    const trace = { input: next.text, sequence, processed, before, after: stateSnapshot(), historyBefore,
      historyAfter: structuredClone(historyValues), planned: attempts.slice(offsets.attempts), committed: commits,
      receipts: receipts.slice(offsets.receipts), lookups, roleCalls: roleCalls.slice(offsets.roles), inboxEvents: inboxEvents.slice(offsets.events), reply };
    traces.push(trace);
    return trace;
  }
  return { turn, runner, stateSnapshot, historyValues, traces, roleCalls, attempts, committed,
    model, facts, search, failures, snapshots,
    save(name: string) {
      const output = process.env.C3_DETERMINISTIC_ARTIFACT_DIR;
      if (!output) return;
      const repo = fileURLToPath(new URL("../../../", import.meta.url));
      const rel = relative(repo, resolve(output));
      if (!isAbsolute(output) || !(rel === ".." || rel.startsWith("../")) || !/^[a-z0-9-]+$/u.test(name)) throw new Error("UNSAFE_TEST_ARTIFACT_PATH");
      const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
      if (process.env.C3_DETERMINISTIC_SOURCE_HEAD && process.env.C3_DETERMINISTIC_SOURCE_HEAD !== sourceHead) {
        throw new Error("TEST_ARTIFACT_SOURCE_MISMATCH");
      }
      const sourceDirty = execFileSync("git", ["status", "--porcelain"], { cwd: repo, encoding: "utf8" }).trim() !== "";
      mkdirSync(output, { recursive: true });
      writeFileSync(join(output, `${name}.json`), JSON.stringify({ kind: "DETERMINISTIC_SCRIPTED_CONTROL_ONLY",
        sourceHead, sourceDirty, trace: traces }, null, 2), "utf8");
    },
  };
}
