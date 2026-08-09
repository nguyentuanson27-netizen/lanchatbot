import { AsyncLocalStorage } from "node:async_hooks";
import {
  assembleReply,
  buildVerifiedFactBlocks,
  extractCustomerMeasurements,
  normalizeProductCode,
  type StableProductDocument,
} from "@lana/business-tools";
import type { GroundedReplyDraftV1 } from "@lana/contracts";
import type { RuntimePolicyResolverPort } from "@lana/chat-runtime";
import type { ConversationState } from "@lana/conversation-engine";
import {
  RealtimeRunner as CoreRealtimeRunner,
  currentProductContinuationId,
  RealtimeContextPreservingSchemaError,
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
const BF02_MEASUREMENT_SIGNAL_TIME = "2000-01-01T00:00:00.000Z";
const BF02_MEASUREMENT_SIGNAL_HASH = "0".repeat(64);
const BF02_DETERMINISTIC_GROUNDED_DRAFT: GroundedReplyDraftV1 = {
  schemaVersion: 1,
  advisoryText: "",
  objectionResponse: "",
  suggestedQuestion: "",
  suggestedNextStep: "",
  attachmentImageIndices: [],
};

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
  mediaUrlsByMessage: string[][];
  discardedMediaFrames: WeakSet<object>;
  verifiedProducts: Bf02VerifiedProductEvidence[];
  groundedSchemaFallbackUsed: boolean;
}

function bindOrReturn<T extends object>(
  target: T,
  property: string | symbol,
): unknown {
  const value = Reflect.get(target, property, target);
  return typeof value === "function" ? value.bind(target) : value;
}

function attachmentUrl(attachment: unknown): string | null {
  if (
    attachment === null ||
    typeof attachment !== "object" ||
    !("url" in attachment) ||
    typeof attachment.url !== "string"
  ) return null;
  const url = attachment.url.trim();
  return url || null;
}

function captureClaims(
  store: Bf02ExecutionContext,
  claims: readonly {
    readonly receiveSequence: number;
    readonly envelope: {
      readonly message: {
        readonly text: string | null;
        readonly occurredAt: string;
        readonly adsContext?: {
          readonly adTitle: string | null;
        } | null | undefined;
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
    .map(({ envelope }) => envelope.message.text?.trim() ?? "");
  store.customerOccurredAt = last?.envelope.message.occurredAt ?? null;
  store.adTitles = ordered
    .map(({ envelope }) => envelope.message.adsContext?.adTitle?.trim() ?? "");
  store.mediaUrlsByMessage = ordered.map(({ envelope }) =>
    envelope.message.attachments
      .map(attachmentUrl)
      .filter((url): url is string => url !== null)
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

function withGroundedFallbackTelemetry(
  input: Parameters<RealtimeRuntimePort["commit"]>[0],
): Parameters<RealtimeRuntimePort["commit"]>[0] {
  if (!input.decisionEvents) return input;
  return {
    ...input,
    decisionEvents: input.decisionEvents.map((event) => ({
      ...event,
      details: {
        ...event.details,
        modelPath: "grounded_fallback",
        modelErrorClass: "VERTEX_SCHEMA_INVALID",
      },
    })),
  };
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
          const state = store && batchProductContextResetRequested(store)
            ? {
                ...record.state,
                currentProductId: null,
                productSelections: [],
                mediaClarification: null,
              }
            : record.state;
          if (store) {
            store.state = state;
            store.stateVersion = record.stateVersion;
          }
          return state === record.state ? record : { ...record, state };
        };
      }
      if (property === "commit") {
        return async (...args: Parameters<RealtimeRuntimePort["commit"]>) => {
          const store = scope.getStore();
          const input = store?.groundedSchemaFallbackUsed
            ? withGroundedFallbackTelemetry(args[0])
            : args[0];
          return target.commit(input, args[1]);
        };
      }
      return bindOrReturn(target, property);
    },
  });
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

function bf02HasCustomerMeasurementSignal(value: string): boolean {
  return extractCustomerMeasurements({
    text: value,
    observedAt: BF02_MEASUREMENT_SIGNAL_TIME,
    sourceEventHash: BF02_MEASUREMENT_SIGNAL_HASH,
  }).length > 0;
}

function bf02TextWithoutMeasurementTokens(value: string): string {
  return value
    .replace(/\b[12]\s*m\s*\d{1,2}\b/giu, " ")
    .replace(/\b\d{2,3}(?:[.,]\d+)?\s*(?:kg|ky|ki)\b/giu, " ")
    .replace(/\b\d{2,3}(?:[.,]\d+)?\s*[-/x]\s*\d{2,3}(?:[.,]\d+)?\s*[-/x]\s*\d{2,3}(?:[.,]\d+)?\b/giu, " ");
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

function customerTextProductIds(texts: readonly string[]): readonly string[] {
  return [...new Set(texts.flatMap((text) => {
    const searchText = bf02HasCustomerMeasurementSignal(text)
      ? bf02TextWithoutMeasurementTokens(text)
      : text;
    return [
      ...(productCodeOnly(text) ? [productCodeOnly(text)!] : []),
      ...extractAdProductCodes(searchText),
    ];
  }))];
}

function latestProductContextResetIndex(store: Bf02ExecutionContext): number {
  return store.customerTexts.reduce<number>(
    (latest, text, index) =>
      productContextResetRequested(text) ? index : latest,
    -1,
  );
}

function explicitMessageProductIds(store: Bf02ExecutionContext): readonly string[] {
  const resetIndex = latestProductContextResetIndex(store);
  return customerTextProductIds(store.customerTexts.slice(resetIndex + 1));
}

function hasFreshPostResetProductEvidence(store: Bf02ExecutionContext): boolean {
  return store.verifiedProducts.some(({ source }) =>
    source === "CURRENT_TURN" ||
    source === "MESSAGE_CODE" ||
    source === "MEDIA_OR_AD"
  );
}

function batchProductContextResetRequested(store: Bf02ExecutionContext): boolean {
  return latestProductContextResetIndex(store) >= 0 &&
    !hasFreshPostResetProductEvidence(store);
}

function adProductIds(store: Bf02ExecutionContext): readonly string[] {
  const resetIndex = latestProductContextResetIndex(store);
  return [...new Set(store.adTitles.slice(resetIndex + 1).flatMap(extractAdProductCodes))];
}

function resetDiscardedProductIds(store: Bf02ExecutionContext): readonly string[] {
  const resetIndex = latestProductContextResetIndex(store);
  if (resetIndex < 0) return [];
  return [...new Set([
    ...customerTextProductIds(store.customerTexts.slice(0, resetIndex + 1)),
    ...store.adTitles.slice(0, resetIndex + 1).flatMap(extractAdProductCodes),
  ])];
}

function mergedCustomerText(texts: readonly string[]): string {
  return texts.map((text) => text.trim()).filter(Boolean).join("\n").trim();
}

function activeCustomerText(store: Bf02ExecutionContext): string {
  return mergedCustomerText(
    store.customerTexts.slice(latestProductContextResetIndex(store) + 1),
  );
}

function clarificationSelectionOverridesCode(
  store: Bf02ExecutionContext,
  searchValue: string,
): boolean {
  const clarification = store.state?.mediaClarification;
  if (clarification?.status !== "ACTIVE") return false;
  const selected = selectedProductId(activeCustomerText(store), clarification.candidates);
  const code = productCodeOnly(searchValue);
  return selected !== null &&
    code !== null &&
    normalizeProductCode(selected) !== code;
}

function scopedSearchTextAfterReset(
  store: Bf02ExecutionContext,
  searchValue: string,
): string | null {
  const resetIndex = latestProductContextResetIndex(store);
  if (resetIndex < 0) return searchValue;

  const normalizedSearch = searchValue.trim();
  const discardedTexts = store.customerTexts
    .slice(0, resetIndex + 1)
    .map((text) => text.trim())
    .filter(Boolean);
  if (discardedTexts.includes(normalizedSearch)) return null;

  const fullBatchText = mergedCustomerText(store.customerTexts);
  if (normalizedSearch === fullBatchText) {
    const activeBatchText = activeCustomerText(store);
    return activeBatchText || null;
  }

  const code = productCodeOnly(searchValue);
  if (
    code !== null &&
    resetDiscardedProductIds(store).includes(code) &&
    !explicitMessageProductIds(store).includes(code) &&
    !adProductIds(store).includes(code)
  ) return null;
  return searchValue;
}

function activeMediaUrls(store: Bf02ExecutionContext): readonly string[] {
  const resetIndex = latestProductContextResetIndex(store);
  return store.mediaUrlsByMessage.slice(resetIndex + 1).flat();
}

function mediaUrlDiscardedByReset(
  store: Bf02ExecutionContext,
  mediaUrl: string,
): boolean {
  const resetIndex = latestProductContextResetIndex(store);
  if (resetIndex < 0) return false;
  const normalized = mediaUrl.trim();
  if (!normalized) return false;
  if (activeMediaUrls(store).includes(normalized)) return false;
  return store.mediaUrlsByMessage
    .slice(0, resetIndex + 1)
    .flat()
    .includes(normalized);
}

function resetBoundaryNotFound() {
  return {
    status: "NOT_FOUND" as const,
    reasonCode: "NO_CANDIDATES" as const,
  };
}

function activeStateSelectionProductIds(
  store: Bf02ExecutionContext,
): readonly string[] {
  return [...new Set((store.state?.productSelections ?? []).map(({ productId }) =>
    normalizeProductCode(productId)
  ))];
}

async function recordActiveStateSelectionEvidence(
  store: Bf02ExecutionContext,
  productSearch: RealtimeProductSearchPort,
): Promise<void> {
  if (!store.state) return;
  const continuation = verifiedContinuationProductId(
    activeCustomerText(store),
    store.state.currentProductId,
  );
  if (!continuation) return;
  for (const productId of activeStateSelectionProductIds(store)) {
    const duplicate = store.verifiedProducts.some((candidate) =>
      candidate.source === "STATE" &&
      normalizeProductCode(candidate.product.productId) === productId
    );
    if (duplicate) continue;
    const product = await exactProduct(productSearch, productId);
    if (product) recordVerifiedProduct(store, product, "STATE");
  }
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
  if (activeMediaUrls(store).length > 0) return "MEDIA_OR_AD";

  const latestText = activeCustomerText(store);
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

  const normalizedSearch = searchValue.trim();
  if (
    store.customerTexts.some((text) => text.trim() === normalizedSearch) ||
    activeCustomerText(store) === normalizedSearch
  ) return "CURRENT_TURN";
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
          const store = scope.getStore();
          if (store) {
            if (clarificationSelectionOverridesCode(store, args[0])) {
              return resetBoundaryNotFound();
            }
            const scopedValue = scopedSearchTextAfterReset(store, args[0]);
            if (scopedValue === null) return resetBoundaryNotFound();
            args[0] = scopedValue;
          }
          const result = await target.searchText(...args);
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
          const store = scope.getStore();
          if (store && mediaUrlDiscardedByReset(store, args[0])) {
            return resetBoundaryNotFound();
          }
          const result = await target.searchImage(...args);
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
          if (!store) return results;
          return results.map((result, index) => {
            const mediaUrl = args[0][index] ?? "";
            if (mediaUrlDiscardedByReset(store, mediaUrl)) {
              return resetBoundaryNotFound();
            }
            const product = matchedProduct(result);
            if (product) recordVerifiedProduct(store, product, "MEDIA_OR_AD");
            return result;
          });
        };
      }
      if (property === "searchImageBytes") {
        if (!target.searchImageBytes) return undefined;
        return async (...args: Parameters<NonNullable<RealtimeProductSearchPort["searchImageBytes"]>>) => {
          const store = scope.getStore();
          if (store && store.discardedMediaFrames.has(args[0])) {
            return resetBoundaryNotFound();
          }
          const result = await target.searchImageBytes!(...args);
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

function wrapVideoFrames(
  videoFrames: RealtimeVideoFrameExtractorPort | undefined,
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
): RealtimeVideoFrameExtractorPort | undefined {
  if (!videoFrames) return undefined;
  return new Proxy(videoFrames, {
    get(target, property) {
      if (property === "extract") {
        return async (...args: Parameters<RealtimeVideoFrameExtractorPort["extract"]>) => {
          const extraction = await target.extract(...args);
          const store = scope.getStore();
          if (store && mediaUrlDiscardedByReset(store, args[0])) {
            for (const frame of extraction.frames) {
              store.discardedMediaFrames.add(frame);
            }
          }
          return extraction;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function wrapMediaRecognition(
  mediaRecognition: RealtimeMediaRecognitionPort | undefined,
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
): RealtimeMediaRecognitionPort | undefined {
  if (!mediaRecognition) return undefined;
  return new Proxy(mediaRecognition, {
    get(target, property) {
      if (property === "recognize") {
        return async (...args: Parameters<RealtimeMediaRecognitionPort["recognize"]>) => {
          const result = await target.recognize(...args);
          const store = scope.getStore();
          if (!store || !mediaUrlDiscardedByReset(store, args[0])) return result;
          return {
            status: "NOT_FOUND" as const,
            candidates: [],
            reasonCode: "BF02_RESET_BOUNDARY",
            telemetry: result.telemetry,
          };
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

function isAgentProposalSchemaFailure(error: unknown): boolean {
  return errorCode(error) === "VERTEX_SCHEMA_INVALID";
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

function evidenceCandidates(
  evidence: readonly Bf02VerifiedProductEvidence[],
): readonly VerifiedProductContextCandidate[] {
  return evidence.map((candidate) => ({
    productId: normalizeProductCode(candidate.product.productId),
    source: candidate.source,
    verified: true,
    observedAt: candidate.observedAt,
    expiresAt: candidate.expiresAt,
    stateRevision: candidate.stateRevision,
    fence: candidate.fence,
  }));
}

async function eligibleGroundedProductIds(
  execution: Bf02ExecutionContext,
  productSearch: RealtimeProductSearchPort,
): Promise<ReadonlySet<string>> {
  const state = execution.state;
  if (!state || execution.stateVersion === null) return new Set();
  await recordActiveStateSelectionEvidence(execution, productSearch);
  const resolution = resolveVerifiedProductContext({
    candidates: evidenceCandidates(execution.verifiedProducts),
    expectedStateRevision: execution.stateVersion,
    minimumFence: state.lastFence,
    conversationOwner: state.conversationOwner,
    hasActiveClarification: state.mediaClarification?.status === "ACTIVE",
    activeStateSelectionProductIds: activeStateSelectionProductIds(execution),
    resetRequested: batchProductContextResetRequested(execution),
    explicitProductIds: explicitMessageProductIds(execution),
    now: new Date(),
  });
  return resolution.productId === null
    ? new Set()
    : new Set([resolution.productId]);
}

interface VerifiedProductRecovery {
  readonly product: StableProductDocument;
  readonly source: VerifiedProductContextSource;
}

async function recoverVerifiedProduct(
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
  productSearch: RealtimeProductSearchPort,
  modelContext: Parameters<RealtimeModelPort["generate"]>[0],
): Promise<VerifiedProductRecovery | null> {
  const execution = scope.getStore();
  const state = execution?.state ?? null;
  if (!execution || !state || execution.stateVersion === null) return null;

  const customerText = activeCustomerText(execution);
  const explicitProductIds = explicitMessageProductIds(execution);
  const hasCurrentTurnProductEvidence = execution.verifiedProducts.some(
    ({ source }) => source !== "STATE" && source !== "PREVIOUS_BOT",
  );
  await recordActiveStateSelectionEvidence(execution, productSearch);

  const continuationProductId = verifiedContinuationProductId(
    customerText,
    state.currentProductId,
  );
  if (
    !hasCurrentTurnProductEvidence &&
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
  for (const evidence of execution.verifiedProducts) {
    productsById.set(normalizeProductCode(evidence.product.productId), evidence.product);
  }
  const resolution = resolveVerifiedProductContext({
    candidates: evidenceCandidates(execution.verifiedProducts),
    expectedStateRevision: execution.stateVersion,
    minimumFence: state.lastFence,
    conversationOwner: state.conversationOwner,
    hasActiveClarification: state.mediaClarification?.status === "ACTIVE",
    activeStateSelectionProductIds: activeStateSelectionProductIds(execution),
    resetRequested: batchProductContextResetRequested(execution),
    explicitProductIds,
    now: new Date(),
  });
  if (resolution.productId === null) return null;
  const product = productsById.get(resolution.productId);
  const source = resolution.source;
  return product && source ? { product, source } : null;
}

/**
 * Grounded recovery is bound to the product identity already verified by core.
 * Both the pre-grounding proposal and the facts envelope must agree, the ID must
 * be present in eligible core resolution evidence, and it is exact-matched again.
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

function wrapModel(
  model: RealtimeModelPort,
  productSearch: RealtimeProductSearchPort,
  scope: AsyncLocalStorage<Bf02ExecutionContext>,
): RealtimeModelPort {
  const generate: RealtimeModelPort["generate"] = async (...args) => {
    try {
      return await model.generate(...args);
    } catch (error) {
      if (!isAgentProposalSchemaFailure(error)) throw error;
      const recovered = await recoverVerifiedProduct(scope, productSearch, args[0]);
      if (!recovered) throw error;
      const origin = recovered.source === "MESSAGE_CODE"
        ? "TEXT_CODE"
        : recovered.source === "CURRENT_TURN"
          ? "TEXT_SEMANTIC"
          : recovered.source === "MEDIA_OR_AD"
            ? "MEDIA"
            : "STATE";
      throw new RealtimeContextPreservingSchemaError(
        error,
        recovered.product,
        origin,
      );
    }
  };

  const groundWithFacts: RealtimeModelPort["groundWithFacts"] = async (...args) => {
    try {
      return await model.groundWithFacts(...args);
    } catch (error) {
      if (!isAgentProposalSchemaFailure(error)) throw error;
      const execution = scope.getStore();
      const verifiedIds = execution
        ? await eligibleGroundedProductIds(execution, productSearch)
        : new Set<string>();
      const product = await verifiedGroundedProduct(
        productSearch,
        args[1],
        args[2],
        verifiedIds,
      );
      if (!product) throw error;
      const factBlocks = buildVerifiedFactBlocks(
        args[2],
        args[1].businessFactQuery.intent,
        product,
      );
      const assembled = assembleReply(
        factBlocks,
        BF02_DETERMINISTIC_GROUNDED_DRAFT,
        args[2],
        product,
      );
      if (!assembled.text.trim()) throw error;
      if (execution) execution.groundedSchemaFallbackUsed = true;
      return {
        proposal: {
          ...args[1],
          productId: product.productId,
          action: "REPLY",
          reply: assembled.text,
          attachments: [],
          handoffReason: null,
        },
        modelVersion: "bf02-context-fallback:VERTEX_SCHEMA_INVALID",
        latencyMs: 0,
        tokenUsage: {},
      };
    }
  };

  const wrapped: RealtimeModelPort = { generate, groundWithFacts };
  if (model.groundDraftWithFacts) {
    wrapped.groundDraftWithFacts = model.groundDraftWithFacts.bind(model);
  }
  if (model.repairSizeClaimDraft) {
    wrapped.repairSizeClaimDraft = model.repairSizeClaimDraft.bind(model);
  }
  if (model.draftMultiProductClarification) {
    wrapped.draftMultiProductClarification =
      model.draftMultiProductClarification.bind(model);
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
      wrapVideoFrames(videoFrames, scope),
      policyResolver,
      wrapMediaRecognition(mediaRecognition, scope),
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
        mediaUrlsByMessage: [],
        discardedMediaFrames: new WeakSet<object>(),
        verifiedProducts: [],
        groundedSchemaFallbackUsed: false,
      },
      () => super.processOne(),
    );
  }
}
