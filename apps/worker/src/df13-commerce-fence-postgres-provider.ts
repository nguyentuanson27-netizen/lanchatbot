import type {
  Df13CommerceFenceAcquireResult,
  Df13CommerceFenceStoreRequest,
} from "@lana/database";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import type { Df13CommerceFenceRequest } from "./df13-commerce-authority-fence.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";
import type {
  Df13CommerceFenceLease,
  Df13CommerceFenceProvider,
} from "./df13-commerce-fence-dispatcher.js";

/** The minimal durable boundary; the live runner does not construct this yet. */
export interface Df13CommerceFenceStorePort {
  acquire(request: Df13CommerceFenceStoreRequest): Promise<Df13CommerceFenceAcquireResult>;
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
 * bundle hash as sufficient evidence. It remains unreferenced by the live
 * runner until a separately approved default-off integration exists.
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
