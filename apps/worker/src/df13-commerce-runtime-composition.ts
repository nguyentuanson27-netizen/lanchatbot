import {
  RuntimeBehaviorModeResolver,
  type RuntimeBehaviorModeSourcePort,
} from "@lana/chat-runtime";
import type { Df13CommerceRuntimeExecutor } from "./df13-commerce-runtime-executor.js";
import { Df13CommerceRuntimeFinalizationAdapter } from "./df13-commerce-runtime-finalization.js";
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
  commerceExecutor: Df13CommerceRuntimeExecutor<TState, TSalesState>;
}>) {
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
    commerceAuthorityConsumer: input.commerceExecutor,
  });
  const commerceFinalizationExecutor = new Df13CommerceRuntimeFinalizationAdapter(
    input.commerceExecutor,
  );
  return Object.freeze({
    behaviorModeResolver,
    commerceExecutor: input.commerceExecutor,
    commerceFinalizationExecutor,
  });
}
