import {
  RuntimeBehaviorModeResolver,
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
  cacheTtlMs: number;
  lastKnownGoodTtlMs: number;
  commerceExecutor: Df13CommerceRuntimeExecutor<TState, TSalesState>;
}>) {
  const behaviorModeResolver = new RuntimeBehaviorModeResolver(input.source, {
    cacheTtlMs: input.cacheTtlMs,
    lastKnownGoodTtlMs: input.lastKnownGoodTtlMs,
    allowedPageIds: input.confirmationAllowedPageIds,
    allowedCommercePageIds: [DF13_COMMERCE_PREPROD_SCOPE_V1.pageId],
    commerceAuthorityConsumer: input.commerceExecutor,
  });
  return Object.freeze({
    behaviorModeResolver,
    commerceExecutor: input.commerceExecutor,
  });
}
