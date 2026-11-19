import { RuntimePolicyResolver, type RuntimePolicyChannel } from "@lana/chat-runtime";
import type { StableCatalogSearchPort } from "@lana/business-tools";
import type { PostgresRealtimeInboxStore, PostgresRealtimeRuntimeStore, PostgresRuntimePolicyStore } from "@lana/database";
import type { MetaPreSendGate } from "./meta-outbox-dispatcher.js";
import { createCommerceHandoffPreSendGate } from "./single-agent-commerce-handoff-delivery.js";
import { createCommerceMediaPreSendGate } from "./single-agent-commerce-media-delivery.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";

export const COMMERCE_PREPROD_PAGE_ID = "1198992073286645";

/** Guard persisted candidate groups with sources available to a restarted delivery worker. */
export function createCommercePreprodDeliveryGate(input: {
  pageId: string;
  base: MetaPreSendGate;
  clock: () => Date;
  store: Pick<PostgresRealtimeRuntimeStore, "loadOrCreate" | "hasCommittedHandoffDelivery">;
  inbox: Pick<PostgresRealtimeInboxStore, "readGeneration">;
  policyStore: Pick<PostgresRuntimePolicyStore, "loadActivePointers">;
  policyChannel: RuntimePolicyChannel;
  catalog: Pick<StableCatalogSearchPort, "findByExactCode">;
  allowedHostSuffixes: readonly string[];
}): MetaPreSendGate {
  const { pageId, clock, policyChannel } = input;
  if (pageId !== COMMERCE_PREPROD_PAGE_ID) throw new Error("C3_COMMERCE_DELIVERY_PAGE_FORBIDDEN");
  if (policyChannel !== "PUBLISHED" && policyChannel !== "CANARY_LIVE") {
    throw new Error("C3_COMMERCE_DELIVERY_LIVE_POLICY_REQUIRED");
  }
  const resolver = new RuntimePolicyResolver(input.policyStore, {
    enabled: true,
    publishedEnabled: policyChannel === "PUBLISHED",
    canaryLiveEnabled: policyChannel === "CANARY_LIVE",
  });
  const policy = async () => {
    resolver.invalidate(pageId, policyChannel);
    const current = await resolver.resolve({ pageId, channel: policyChannel, now: clock() });
    if (current.status !== "RESOLVED" || !current.mayAffectOutbound || !current.bundle) {
      throw new Error("C3_COMMERCE_DELIVERY_POLICY_UNAVAILABLE");
    }
    return current.bundle;
  };
  const readAuthority = async (binding: { pageId: string; customerHash: string; conversationId: string }) => {
    if (binding.pageId !== pageId) throw new Error("C3_COMMERCE_DELIVERY_PAGE_FORBIDDEN");
    const [row, generation] = await Promise.all([
      input.store.loadOrCreate(pageId, binding.customerHash, "APP", () => {
        throw new Error("C3_COMMERCE_DELIVERY_CONVERSATION_REQUIRED");
      }),
      input.inbox.readGeneration(pageId, binding.customerHash),
    ]);
    if (row.conversationId !== binding.conversationId || generation === null) {
      throw new Error("C3_COMMERCE_DELIVERY_CONVERSATION_CHANGED");
    }
    const { state, stateVersion, routingOwner, appSendEnabled, killSwitch } = row;
    return { state, stateVersion, routingOwner, appSendEnabled, killSwitch, generation };
  };
  const media = createCommerceMediaPreSendGate({
    base: input.base, clock, policy, readAuthority, allowedHostSuffixes: input.allowedHostSuffixes,
    readProduct: async productId => {
      const product = await input.catalog.findByExactCode(productId);
      if (!product || product.productId !== productId) throw new Error("C3_COMMERCE_DELIVERY_PRODUCT_CHANGED");
      return product;
    },
  });
  return createCommerceHandoffPreSendGate({
    base: media, clock, policy, readAuthority,
    hasCommittedHandoff: binding => input.store.hasCommittedHandoffDelivery({
      pageId, conversationId: binding.conversationId, revision: binding.revision,
      reason: binding.reason, responseGroupId: binding.responseGroupId, bindingHash: commerceHash(binding),
    }),
  });
}
