import {
  RuntimeBehaviorModeResolver,
  type CommerceAuthorityConsumerPort,
  type RuntimeBehaviorModeSourcePort,
} from "@lana/chat-runtime";
import type { Df13CommerceRuntimeExecutor } from "./df13-commerce-runtime-executor.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";

/**
 * The single real composition seam between the behavior pointer resolver and
 * RealtimeRunner. It owns the same executor instance for resolver admission
 * and runner execution, so a COMMERCE result cannot be selected by one object
 * and finalized by a different authority.
 */
export function createDf13CommerceRuntimeComposition<TState, TSalesState>(input: Readonly<{
  source: RuntimeBehaviorModeSourcePort;
  confirmationAllowedPageIds: readonly string[];
  /** COMMERCE must re-read its exact authority identity for every turn. */
  runtimeAuthorityMode: "LEGACY" | "COMMERCE";
  cacheTtlMs: number;
  lastKnownGoodTtlMs: number;
  /** Existing hot-cutover foundation; not used by the first fresh process. */
  commerceExecutor?: Df13CommerceRuntimeExecutor<TState, TSalesState>;
  /** Explicit fresh-process authority consumer, bound to the same resolver. */
  commerceAuthorityConsumer?: CommerceAuthorityConsumerPort;
  /** Omitted for the stopped-process path: no 0036 fence finalizer is needed. */
  commerceFinalizationExecutor?: ReturnType<
    Df13CommerceRuntimeExecutor<TState, TSalesState>["createFinalizingExecutor"]
  >;
}>) {
  const selectedCommerceConsumer = input.commerceAuthorityConsumer ?? input.commerceExecutor;
  if (!selectedCommerceConsumer) throw new Error("DF13_COMMERCE_AUTHORITY_CONSUMER_REQUIRED");
  const commerceAuthorityConsumer: CommerceAuthorityConsumerPort = Object.freeze({
    admitCommerceAuthority: selectedCommerceConsumer.admitCommerceAuthority.bind(selectedCommerceConsumer),
  });
  const behaviorModeResolver = new RuntimeBehaviorModeResolver(input.source, {
    // A cached COMMERCE pointer cannot satisfy the DATABASE-only authority
    // contract. Keep caching for the untouched LEGACY process only.
    cacheTtlMs: input.runtimeAuthorityMode === "COMMERCE" ? 0 : input.cacheTtlMs,
    // Commerce turns must each obtain their own exact DATABASE read. Sharing
    // an in-flight lookup would make concurrent turns share authority state.
    coalesceInFlight: input.runtimeAuthorityMode !== "COMMERCE",
    lastKnownGoodTtlMs: input.lastKnownGoodTtlMs,
    allowedPageIds: input.confirmationAllowedPageIds,
    allowedCommercePageIds: [DF13_COMMERCE_PREPROD_SCOPE_V1.pageId],
    commerceAuthorityConsumer,
  });
  const commerceFinalizationExecutor = input.commerceFinalizationExecutor ??
    input.commerceExecutor?.createFinalizingExecutor();
  return Object.freeze({
    behaviorModeResolver,
    commerceFinalizationExecutor,
  });
}
