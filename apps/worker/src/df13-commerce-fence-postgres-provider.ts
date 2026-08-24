import type {
  Df13CommerceFenceAcquireResult,
  Df13CommerceFenceCommitInput,
  Df13CommerceFenceCommitResult,
  Df13CommerceRuntimeCommitPort,
  Df13CommerceFenceStoreRequest,
  RealtimeCommitInput,
} from "@lana/database";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import type { Df13CommerceFenceRequest } from "./df13-commerce-authority-fence.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";
import type {
  Df13CommerceFenceBoundCommitter,
} from "./df13-commerce-default-off-consumer.js";
import type {
  Df13CommerceFenceLease,
  Df13CommerceFenceProvider,
} from "./df13-commerce-fence-dispatcher.js";

/** The minimal durable boundary used only by the explicit DF13 composition. */
export interface Df13CommerceFenceStorePort {
  acquire(request: Df13CommerceFenceStoreRequest): Promise<Df13CommerceFenceAcquireResult>;
}

/** The durable atomic completion API remains separate from admission. */
export interface Df13CommerceAtomicFenceStorePort {
  commitAuthorityDependentWork<TState, TSalesState = unknown>(
    input: Df13CommerceFenceCommitInput<TState, TSalesState>,
    runtime: Df13CommerceRuntimeCommitPort,
  ): Promise<Df13CommerceFenceCommitResult>;
}

function hasExactConsumerBundle(request: Df13CommerceFenceRequest): boolean {
  return request.consumers.length === DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.length
    && request.consumers.every((consumer, index) => consumer === DF13_COMMERCE_AUTHORITY_CONSUMERS_V1[index])
    && request.authority.authorityBundleHash === DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash;
}

function toStoreRequest(request: Df13CommerceFenceRequest):
  | Readonly<{ request: Df13CommerceFenceStoreRequest }>
  | Readonly<{ reasonCode: "DF13_FENCE_BUNDLE_INVALID" | "DF13_FENCE_SCOPE_INVALID" }> {
  if (!hasExactConsumerBundle(request)) return { reasonCode: "DF13_FENCE_BUNDLE_INVALID" };
  if (request.pageId !== DF13_COMMERCE_PREPROD_SCOPE_V1.pageId
    || request.channel !== DF13_COMMERCE_PREPROD_SCOPE_V1.channel) {
    return { reasonCode: "DF13_FENCE_SCOPE_INVALID" };
  }
  return { request: Object.freeze({
    pageId: request.pageId,
    channel: request.channel,
    workId: request.workId,
    inboxIds: request.inboxIds,
    authority: request.authority,
  }) };
}

/**
 * The only adapter from the complete worker request to durable fence state.
 * It re-checks the enumerated authority bundle instead of treating a copied
 * bundle hash as sufficient evidence. The default LEGACY startup composition
 * cannot acquire it; an isolated COMMERCE startup must first pass immutable
 * release-evidence admission.
 */
export class PostgresDf13CommerceFenceProvider implements Df13CommerceFenceProvider {
  constructor(private readonly store: Df13CommerceFenceStorePort) {}

  async acquire(request: Df13CommerceFenceRequest): Promise<
    | Readonly<{ status: "HELD"; lease: Df13CommerceFenceLease }>
    | Readonly<{ status: "ALREADY_COMPLETED"; epoch: number }>
    | Readonly<{ status: "PARKED"; reasonCode: string }>
  > {
    const mapped = toStoreRequest(request);
    if ("reasonCode" in mapped) return { status: "PARKED", reasonCode: mapped.reasonCode };
    return this.store.acquire(mapped.request);
  }

}

/**
 * Real durable completion adapter for the default-off consumer wrapper. It
 * repeats both bundle and scope validation at the transaction boundary, then
 * delegates only to the database API that owns runtime write + completion.
 * The default LEGACY composition cannot reach this adapter.
 */
export class PostgresDf13CommerceFenceBoundCommitter<TState, TSalesState = unknown>
implements Df13CommerceFenceBoundCommitter<TState, TSalesState> {
  constructor(
    private readonly store: Df13CommerceAtomicFenceStorePort,
    private readonly runtime: Df13CommerceRuntimeCommitPort,
  ) {}

  async commitAuthorityDependentWork(input: Readonly<{
    request: Df13CommerceFenceRequest;
    lease: Df13CommerceFenceLease;
    runtimeCommit: RealtimeCommitInput<TState, TSalesState>;
  }>): Promise<Df13CommerceFenceCommitResult> {
    const mapped = toStoreRequest(input.request);
    if ("reasonCode" in mapped) return { status: "PARKED", reasonCode: mapped.reasonCode };
    return this.store.commitAuthorityDependentWork({
      request: mapped.request,
      lease: input.lease,
      runtimeCommit: input.runtimeCommit,
    }, this.runtime);
  }
}
