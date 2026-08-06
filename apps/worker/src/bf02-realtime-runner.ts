import { AsyncLocalStorage } from "node:async_hooks";
import {
  normalizeProductCode,
  type StableProductDocument,
} from "@lana/business-tools";
import type { RuntimePolicyResolverPort } from "@lana/chat-runtime";
import type { ConversationState } from "@lana/conversation-engine";
import {
  RealtimeRunner as CoreRealtimeRunner,
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
import { extractAdProductCodes } from "./media-resolution.js";
import {
  productContextResetRequested,
  resolveVerifiedProductContext,
  type VerifiedProductContextCandidate,
} from "./verified-product-context.js";

export * from "./realtime-runner.js";

interface Bf02ExecutionContext {
  state: ConversationState | null;
  stateVersion: number | null;
  receiveSequence: number | null;
}

function bindOrReturn<T extends object>(
  target: T,
  property: string | symbol,
): unknown {
  const value = Reflect.get(target, property, target);
  return typeof value === "function" ? value.bind(target) : value;
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
          if (claim) {
            const store = scope.getStore();
            if (store) store.receiveSequence = claim.receiveSequence;
          }
          return claim;
        };
      }
      if (property === "claimNextBatch") {
        if (!target.claimNextBatch) return undefined;
        return async (...args: Parameters<NonNullable<RealtimeInboxPort["claimNextBatch"]>>) => {
          const batch = await target.claimNextBatch!(...args);
          if (batch) {
            const store = scope.getStore();
            if (store) store.receiveSequence = batch.lastReceiveSequence;
          }
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

async function currentTurnProduct(
  productSearch: RealtimeProductSearchPort,
  text: string,
): Promise<StableProductDocument | null> {
  if (!text.trim()) return null;
  const result = await productSearch.searchText(text);
  return result.status === "MATCHED" ? result.product : null;
}

async function recoverVerifiedProduct(
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
  productSearch: RealtimeProductSearchPort,
  modelContext: Parameters<RealtimeModelPort["generate"]>[0],
): Promise<StableProductDocument | null> {
  const execution = scope.getStore();
  const state = execution?.state ?? null;
  if (!state || execution?.stateVersion === null) return null;

  const customerContext = latestCustomerContext(modelContext);
  const customerText = customerContext?.text ?? "";
  const observedAt = customerContext?.occurredAt ?? new Date().toISOString();
  const currentFence = Math.max(
    state.lastFence + 1,
    execution.receiveSequence ?? state.lastFence + 1,
  );
  const explicitProductIds = [...new Set([
    ...(productCodeOnly(customerText) ? [productCodeOnly(customerText)!] : []),
    ...extractAdProductCodes(customerText),
  ])];

  const productsById = new Map<string, StableProductDocument>();
  const candidates: VerifiedProductContextCandidate[] = [];
  const addCandidate = (
    product: StableProductDocument,
    source: VerifiedProductContextCandidate["source"],
    fence: number,
    candidateObservedAt: string,
    stateRevision: number | null,
  ): void => {
    const normalized = normalizeProductCode(product.productId);
    productsById.set(normalized, product);
    candidates.push({
      productId: normalized,
      source,
      verified: true,
      observedAt: candidateObservedAt,
      expiresAt: null,
      stateRevision,
      fence,
    });
  };

  const current = await currentTurnProduct(productSearch, customerText);
  if (current) {
    addCandidate(current, "CURRENT_TURN", currentFence, observedAt, null);
  }

  for (const explicitProductId of explicitProductIds) {
    const explicitProduct = await exactProduct(productSearch, explicitProductId);
    if (explicitProduct) {
      addCandidate(explicitProduct, "MESSAGE_CODE", currentFence, observedAt, null);
    }
  }

  if (state.currentProductId) {
    const stateProduct = await exactProduct(productSearch, state.currentProductId);
    if (stateProduct) {
      addCandidate(
        stateProduct,
        "STATE",
        state.lastFence,
        state.updatedAt,
        state.revision,
      );
    }
  }

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
      const product = await recoverVerifiedProduct(scope, productSearch, args[0]);
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
    super(
      wrapInbox(inbox, scope),
      wrapRuntime(runtime, scope),
      wrapModel(model, productSearch, scope),
      factsReader,
      productSearch,
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
      { state: null, stateVersion: null, receiveSequence: null },
      () => super.processOne(),
    );
  }
}
