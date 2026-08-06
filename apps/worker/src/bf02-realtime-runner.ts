import { AsyncLocalStorage } from "node:async_hooks";
import {
  normalizeProductCode,
  type StableProductDocument,
} from "@lana/business-tools";
import type { RuntimePolicyResolverPort } from "@lana/chat-runtime";
import type { ConversationState } from "@lana/conversation-engine";
import {
  RealtimeRunner as CoreRealtimeRunner,
  currentProductContinuationId,
  deterministicVertexProposalFallback,
  productCodeOnly,
  type CanonicalChatHistoryPort,
  type RealtimeInboxPort,
  type RealtimeMediaRecognitionPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
  type RealtimeRunnerOptions,
  type RealtimeTagObservationProvider,
  type RealtimeVideoFrameExtractorPort,
  type RuntimeBehaviorModeResolverPort,
} from "./realtime-runner.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { RealtimeGenerationQuota } from "./realtime-quota.js";
import type { ChatHistoryPort } from "./redis-chat-history.js";
import {
  extractAdProductCodes,
  selectedProductId,
} from "./media-resolution.js";
import {
  productContextResetRequested,
  resolveVerifiedProductContext,
  type VerifiedProductContextCandidate,
  type VerifiedProductContextSource,
} from "./verified-product-context.js";

export * from "./realtime-runner.js";

const BF02_STATE_CONTEXT_TTL_MS = 20 * 24 * 60 * 60 * 1_000;

interface Bf02VerifiedProductEvidence {
  readonly product: StableProductDocument;
  readonly source: VerifiedProductContextSource;
  readonly observedAt: string;
  readonly expiresAt: string | null;
  readonly stateRevision: number | null;
  readonly fence: number;
}

interface Bf02ExecutionContext {
  state: ConversationState | null;
  stateVersion: number | null;
  receiveSequence: number | null;
  customerTexts: string[];
  customerOccurredAt: string | null;
  adTitles: string[];
  hasMedia: boolean;
  verifiedProducts: Bf02VerifiedProductEvidence[];
}

function bindOrReturn<T extends object>(
  target: T,
  property: string | symbol,
): unknown {
  const value = Reflect.get(target, property, target);
  return typeof value === "function" ? value.bind(target) : value;
}

function captureClaims(
  store: Bf02ExecutionContext,
  claims: readonly {
    readonly receiveSequence: number;
    readonly envelope: {
      readonly message: {
        readonly text: string | null;
        readonly occurredAt: string;
        readonly adsContext: {
          readonly adTitle: string | null;
        } | null;
        readonly attachments: readonly unknown[];
      };
    };
  }[],
): void {
  const ordered = [...claims].sort((left, right) =>
    left.receiveSequence - right.receiveSequence
  );
  const last = ordered.at(-1);
  store.receiveSequence = last?.receiveSequence ?? null;
  store.customerTexts = ordered
    .map(({ envelope }) => envelope.message.text?.trim() ?? "")
    .filter(Boolean);
  store.customerOccurredAt = last?.envelope.message.occurredAt ?? null;
  store.adTitles = ordered
    .map(({ envelope }) => envelope.message.adsContext?.adTitle?.trim() ?? "")
    .filter(Boolean);
  store.hasMedia = ordered.some(({ envelope }) =>
    envelope.message.attachments.length > 0
  );
}

function wrapInbox(
  inbox: RealtimeInboxPort,
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
): RealtimeInboxPort {
  return new Proxy(inbox, {
    get(target, property) {
      if (property === "claimNext") {
        return async (...args: Parameters<RealtimeInboxPort["claimNext"]>) => {
          const claim = await target.claimNext(...args);
          const store = scope.getStore();
          if (claim && store) captureClaims(store, [claim]);
          return claim;
        };
      }
      if (property === "claimNextBatch") {
        if (!target.claimNextBatch) return undefined;
        return async (...args: Parameters<NonNullable<RealtimeInboxPort["claimNextBatch"]>>) => {
          const batch = await target.claimNextBatch!(...args);
          const store = scope.getStore();
          if (batch && store) captureClaims(store, batch.items);
          return batch;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function wrapRuntime(
  runtime: RealtimeRuntimePort,
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
): RealtimeRuntimePort {
  return new Proxy(runtime, {
    get(target, property) {
      if (property === "loadOrCreate") {
        return async (...args: Parameters<RealtimeRuntimePort["loadOrCreate"]>) => {
          const record = await target.loadOrCreate(...args);
          const store = scope.getStore();
          if (store) {
            store.state = record.state;
            store.stateVersion = record.stateVersion;
          }
          return record;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function latestCustomerContext(
  context: Parameters<RealtimeModelPort["generate"]>[0],
) {
  return [...context]
    .reverse()
    .find((message) =>
      message.direction === "INBOUND" && message.senderType === "CUSTOMER"
    ) ?? null;
}

async function exactProduct(
  productSearch: RealtimeProductSearchPort,
  productId: string,
): Promise<StableProductDocument | null> {
  const result = await productSearch.searchText(productId);
  return result.status === "MATCHED" &&
      (result.matchKind === "EXACT_CODE" || result.matchKind === "ALIAS")
    ? result.product
    : null;
}

function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLocaleLowerCase("vi-VN");
}

/**
 * Narrow containment for terse product-style adjustments that the existing
 * continuation helper does not yet cover. This must not classify general shop,
 * policy, delivery, or support questions as product continuation.
 */
export function productPreferenceContinuationId(
  value: string,
  currentProductId: string | null,
): string | null {
  if (!currentProductId) return null;
  const text = asciiFold(value)
    .trim()
    .replace(/[.!?]+$/gu, "")
    .replace(/\s+/gu, " ");
  const preferenceOnly = /^(?:(?:cho|lam|muon) )?(?:nhe nhang|don gian|thanh lich|tre trung|sang|dam|nhat|dai|ngan|rong|om)(?: hon| di| nhe| nha| a)?$/u
    .test(text);
  return preferenceOnly ? normalizeProductCode(currentProductId) : null;
}

function verifiedContinuationProductId(
  value: string,
  currentProductId: string | null,
): string | null {
  return currentProductContinuationId(value, currentProductId) ??
    productPreferenceContinuationId(value, currentProductId);
}

function stateContextExpiry(updatedAt: string): string {
  const timestamp = Date.parse(updatedAt);
  return Number.isFinite(timestamp)
    ? new Date(timestamp + BF02_STATE_CONTEXT_TTL_MS).toISOString()
    : updatedAt;
}

function currentFence(store: Bf02ExecutionContext): number | null {
  if (!store.state) return null;
  return Math.max(
    store.state.lastFence + 1,
    store.receiveSequence ?? store.state.lastFence + 1,
  );
}

function recordVerifiedProduct(
  store: Bf02ExecutionContext,
  product: StableProductDocument,
  source: VerifiedProductContextSource,
  observedAt?: string,
): void {
  const state = store.state;
  const fence = source === "STATE"
    ? state?.lastFence ?? null
    : currentFence(store);
  if (fence === null) return;
  const normalized = normalizeProductCode(product.productId);
  const evidence: Bf02VerifiedProductEvidence = {
    product,
    source,
    observedAt: source === "STATE"
      ? state?.updatedAt ?? observedAt ?? new Date().toISOString()
      : observedAt ?? store.customerOccurredAt ?? new Date().toISOString(),
    expiresAt: source === "STATE" && state
      ? stateContextExpiry(state.updatedAt)
      : null,
    stateRevision: source === "STATE" ? state?.revision ?? null : null,
    fence,
  };
  const duplicate = store.verifiedProducts.some((candidate) =>
    candidate.source === source &&
    normalizeProductCode(candidate.product.productId) === normalized
  );
  if (!duplicate) store.verifiedProducts.push(evidence);
}

function explicitMessageProductIds(store: Bf02ExecutionContext): readonly string[] {
  return [...new Set(store.customerTexts.flatMap((text) => [
    ...(productCodeOnly(text) ? [productCodeOnly(text)!] : []),
    ...extractAdProductCodes(text),
  ]))];
}

function adProductIds(store: Bf02ExecutionContext): readonly string[] {
  return [...new Set(store.adTitles.flatMap(extractAdProductCodes))];
}

function classifyTextResolution(
  store: Bf02ExecutionContext,
  searchValue: string,
  product: StableProductDocument,
): VerifiedProductContextSource | null {
  const state = store.state;
  const productId = normalizeProductCode(product.productId);
  if (explicitMessageProductIds(store).includes(productId)) return "MESSAGE_CODE";
  if (adProductIds(store).includes(productId)) return "MEDIA_OR_AD";
  if (store.hasMedia) return "MEDIA_OR_AD";

  const latestText = store.customerTexts.at(-1) ?? "";
  const selectedFromClarification = state?.mediaClarification?.status === "ACTIVE"
    ? selectedProductId(latestText, state.mediaClarification.candidates)
    : null;
  if (
    selectedFromClarification &&
    normalizeProductCode(selectedFromClarification) === productId
  ) return "MEDIA_OR_AD";

  const selectedFromState = selectedProductId(
    latestText,
    state?.productSelections ?? [],
  );
  if (
    selectedFromState &&
    normalizeProductCode(selectedFromState) === productId
  ) return "CURRENT_TURN";

  const continuationProductId = verifiedContinuationProductId(
    latestText,
    state?.currentProductId ?? null,
  );
  if (continuationProductId === productId) return "STATE";

  if (store.customerTexts.some((text) => text.trim() === searchValue.trim())) {
    return "CURRENT_TURN";
  }
  return null;
}

function matchedProduct(result: unknown): StableProductDocument | null {
  if (
    result !== null &&
    typeof result === "object" &&
    "status" in result &&
    result.status === "MATCHED" &&
    "product" in result &&
    result.product !== null &&
    typeof result.product === "object" &&
    "productId" in result.product &&
    typeof result.product.productId === "string"
  ) return result.product as StableProductDocument;
  return null;
}

function wrapProductSearch(
  productSearch: RealtimeProductSearchPort,
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
): RealtimeProductSearchPort {
  return new Proxy(productSearch, {
    get(target, property) {
      if (property === "searchText") {
        return async (...args: Parameters<RealtimeProductSearchPort["searchText"]>) => {
          const result = await target.searchText(...args);
          const store = scope.getStore();
          const product = matchedProduct(result);
          if (store && product) {
            const source = classifyTextResolution(store, args[0], product);
            if (source) recordVerifiedProduct(store, product, source);
          }
          return result;
        };
      }
      if (property === "searchImage") {
        return async (...args: Parameters<RealtimeProductSearchPort["searchImage"]>) => {
          const result = await target.searchImage(...args);
          const store = scope.getStore();
          const product = matchedProduct(result);
          if (store && product) {
            recordVerifiedProduct(store, product, "MEDIA_OR_AD");
          }
          return result;
        };
      }
      if (property === "searchImages") {
        if (!target.searchImages) return undefined;
        return async (...args: Parameters<NonNullable<RealtimeProductSearchPort["searchImages"]>>) => {
          const results = await target.searchImages!(...args);
          const store = scope.getStore();
          if (store) {
            for (const result of results) {
              const product = matchedProduct(result);
              if (product) recordVerifiedProduct(store, product, "MEDIA_OR_AD");
            }
          }
          return results;
        };
      }
      if (property === "searchImageBytes") {
        if (!target.searchImageBytes) return undefined;
        return async (...args: Parameters<NonNullable<RealtimeProductSearchPort["searchImageBytes"]>>) => {
          const result = await target.searchImageBytes!(...args);
          const store = scope.getStore();
          const product = matchedProduct(result);
          if (store && product) {
            recordVerifiedProduct(store, product, "MEDIA_OR_AD");
          }
          return result;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function errorCode(error: unknown): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.trim()
  ) return error.code.trim();
  return error instanceof Error ? error.message.trim() : "";
}

function isGroundedSchemaFailure(error: unknown): boolean {
  return errorCode(error) === "GROUNDED_SCHEMA_INVALID";
}

function previousVerifiedBotProduct(
  modelContext: Parameters<RealtimeModelPort["generate"]>[0],
  currentProductId: string | null,
  customerText: string,
): { productId: string; observedAt: string } | null {
  const continuation = verifiedContinuationProductId(customerText, currentProductId);
  if (!continuation) return null;
  const previousBot = [...modelContext]
    .reverse()
    .find((message) =>
      message.direction === "OUTBOUND" && message.senderType === "BOT"
    );
  if (!previousBot) return null;
  const productIds = [...new Set([
    ...(productCodeOnly(previousBot.text) ? [productCodeOnly(previousBot.text)!] : []),
    ...extractAdProductCodes(previousBot.text),
  ])];
  return productIds.includes(continuation)
    ? { productId: continuation, observedAt: previousBot.occurredAt }
    : null;
}

async function recoverVerifiedProduct(
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
  productSearch: RealtimeProductSearchPort,
  modelContext: Parameters<RealtimeModelPort["generate"]>[0],
): Promise<StableProductDocument | null> {
  const execution = scope.getStore();
  const state = execution?.state ?? null;
  if (!execution || !state || execution.stateVersion === null) return null;

  const customerContext = latestCustomerContext(modelContext);
  const customerText = customerContext?.text ?? execution.customerTexts.at(-1) ?? "";
  const explicitProductIds = explicitMessageProductIds(execution);

  const continuationProductId = verifiedContinuationProductId(
    customerText,
    state.currentProductId,
  );
  if (
    continuationProductId &&
    !execution.verifiedProducts.some((candidate) =>
      candidate.source === "STATE" &&
      normalizeProductCode(candidate.product.productId) === continuationProductId
    )
  ) {
    const stateProduct = await exactProduct(productSearch, continuationProductId);
    if (stateProduct) recordVerifiedProduct(execution, stateProduct, "STATE");
  }

  const previousBot = previousVerifiedBotProduct(
    modelContext,
    state.currentProductId,
    customerText,
  );
  if (previousBot) {
    const product = await exactProduct(productSearch, previousBot.productId);
    if (product) {
      const fence = state.lastFence;
      const duplicate = execution.verifiedProducts.some((candidate) =>
        candidate.source === "PREVIOUS_BOT" &&
        normalizeProductCode(candidate.product.productId) === previousBot.productId
      );
      if (!duplicate) {
        execution.verifiedProducts.push({
          product,
          source: "PREVIOUS_BOT",
          observedAt: previousBot.observedAt,
          expiresAt: stateContextExpiry(previousBot.observedAt),
          stateRevision: state.revision,
          fence,
        });
      }
    }
  }

  const productsById = new Map<string, StableProductDocument>();
  const candidates: VerifiedProductContextCandidate[] = execution.verifiedProducts
    .map((evidence) => {
      const productId = normalizeProductCode(evidence.product.productId);
      productsById.set(productId, evidence.product);
      return {
        productId,
        source: evidence.source,
        verified: true,
        observedAt: evidence.observedAt,
        expiresAt: evidence.expiresAt,
        stateRevision: evidence.stateRevision,
        fence: evidence.fence,
      };
    });

  const resolution = resolveVerifiedProductContext({
    candidates,
    expectedStateRevision: execution.stateVersion,
    minimumFence: state.lastFence,
    conversationOwner: state.conversationOwner,
    hasActiveClarification: state.mediaClarification?.status === "ACTIVE",
    resetRequested: productContextResetRequested(customerText),
    explicitProductIds,
    now: new Date(),
  });
  return resolution.productId === null
    ? null
    : productsById.get(resolution.productId) ?? null;
}

/**
 * Grounded recovery is bound to the product identity already verified by core.
 * Both the pre-grounding proposal and the facts envelope must agree, the ID must
 * be present in the core resolution evidence, and it is exact-matched again.
 */
export async function verifiedGroundedProduct(
  productSearch: RealtimeProductSearchPort,
  proposal: Parameters<RealtimeModelPort["groundWithFacts"]>[1],
  facts: Parameters<RealtimeModelPort["groundWithFacts"]>[2],
  verifiedProductIds: ReadonlySet<string>,
): Promise<StableProductDocument | null> {
  const proposalId = proposal.productId
    ? normalizeProductCode(proposal.productId)
    : "";
  const factsId = facts.productId
    ? normalizeProductCode(facts.productId)
    : "";
  if (
    !proposalId ||
    !factsId ||
    proposalId !== factsId ||
    !verifiedProductIds.has(proposalId)
  ) return null;

  const product = await exactProduct(productSearch, proposalId);
  return product && normalizeProductCode(product.productId) === proposalId
    ? product
    : null;
}

function fallbackResult(
  customerText: string,
  product: StableProductDocument,
  error: unknown,
  latencyMs: number,
  priorProposal?: Parameters<RealtimeModelPort["groundWithFacts"]>[1],
): Awaited<ReturnType<RealtimeModelPort["generate"]>> {
  const fallback = deterministicVertexProposalFallback(
    customerText,
    product,
    false,
    error,
  );
  return {
    proposal: {
      ...fallback.proposal,
      ...(priorProposal?.salesSignals === undefined
        ? {}
        : { salesSignals: priorProposal.salesSignals }),
      ...(priorProposal?.strategyAnalysis === undefined
        ? {}
        : { strategyAnalysis: priorProposal.strategyAnalysis }),
    },
    modelVersion: `bf02-context-fallback:${fallback.reasonCode}`,
    latencyMs,
    tokenUsage: {},
  };
}

function wrapModel(
  model: RealtimeModelPort,
  productSearch: RealtimeProductSearchPort,
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
): RealtimeModelPort {
  const generate: RealtimeModelPort["generate"] = async (...args) => {
    const startedAt = Date.now();
    try {
      return await model.generate(...args);
    } catch (error) {
      if (!isGroundedSchemaFailure(error)) throw error;
      const product = await recoverVerifiedProduct(scope, productSearch, args[0]);
      if (!product) throw error;
      return fallbackResult(
        latestCustomerContext(args[0])?.text ?? "",
        product,
        error,
        Math.max(0, Date.now() - startedAt),
      );
    }
  };

  const groundWithFacts: RealtimeModelPort["groundWithFacts"] = async (...args) => {
    const startedAt = Date.now();
    try {
      return await model.groundWithFacts(...args);
    } catch (error) {
      if (!isGroundedSchemaFailure(error)) throw error;
      const verifiedIds = new Set(
        scope.getStore()?.verifiedProducts.map(({ product }) =>
          normalizeProductCode(product.productId)
        ) ?? [],
      );
      const product = await verifiedGroundedProduct(
        productSearch,
        args[1],
        args[2],
        verifiedIds,
      );
      if (!product) throw error;
      return fallbackResult(
        latestCustomerContext(args[0])?.text ?? "",
        product,
        error,
        Math.max(0, Date.now() - startedAt),
        args[1],
      );
    }
  };

  const wrapped: RealtimeModelPort = { generate, groundWithFacts };
  if (model.groundDraftWithFacts) {
    wrapped.groundDraftWithFacts = model.groundDraftWithFacts.bind(model);
  }
  if (model.repairSizeClaimDraft) {
    wrapped.repairSizeClaimDraft = model.repairSizeClaimDraft.bind(model);
  }
  return wrapped;
}

/**
 * BF-02 adapter around the existing runner. The core still owns all
 * authorization and side effects; this layer only preserves independently
 * verified product context when model schema parsing fails.
 */
export class RealtimeRunner extends CoreRealtimeRunner {
  private readonly bf02Scope: AsyncLocalStorage<Bf02ExecutionContext>;

  constructor(
    inbox: RealtimeInboxPort,
    runtime: RealtimeRuntimePort,
    model: RealtimeModelPort,
    factsReader: BusinessFactsReader,
    productSearch: RealtimeProductSearchPort,
    tags: RealtimeTagObservationProvider,
    options: RealtimeRunnerOptions,
    quota?: RealtimeGenerationQuota,
    history?: ChatHistoryPort,
    canonicalHistory?: CanonicalChatHistoryPort,
    videoFrames?: RealtimeVideoFrameExtractorPort,
    policyResolver?: RuntimePolicyResolverPort,
    mediaRecognition?: RealtimeMediaRecognitionPort,
    behaviorModeResolver?: RuntimeBehaviorModeResolverPort,
  ) {
    const scope = new AsyncLocalStorage<Bf02ExecutionContext>();
    const scopedProductSearch = wrapProductSearch(productSearch, scope);
    super(
      wrapInbox(inbox, scope),
      wrapRuntime(runtime, scope),
      wrapModel(model, productSearch, scope),
      factsReader,
      scopedProductSearch,
      tags,
      options,
      quota,
      history,
      canonicalHistory,
      videoFrames,
      policyResolver,
      mediaRecognition,
      behaviorModeResolver,
    );
    this.bf02Scope = scope;
  }

  override processOne(): Promise<boolean> {
    return this.bf02Scope.run(
      {
        state: null,
        stateVersion: null,
        receiveSequence: null,
        customerTexts: [],
        customerOccurredAt: null,
        adTitles: [],
        hasMedia: false,
        verifiedProducts: [],
      },
      () => super.processOne(),
    );
  }
}
