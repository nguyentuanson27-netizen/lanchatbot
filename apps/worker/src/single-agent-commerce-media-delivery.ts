import { createHash } from "node:crypto";
import { MEDIA_FRESH_FOR_SECONDS, CommerceMediaDeliveryBindingV1Schema as bindingSchema,
  type CommerceMediaDeliveryImageV1 as MediaDeliveryImage, type CommerceMediaDeliveryBindingV1 as CommerceMediaDeliveryBinding } from "@lana/contracts";
import type { RuntimePolicyBundle } from "@lana/chat-runtime";
import type { StableProductDocument } from "@lana/business-tools";
import type { RealtimeMetaMessageUnit } from "@lana/database";
import type { MetaPreSendGate } from "./meta-outbox-dispatcher.js";
import type { CommerceScope } from "./single-agent-commerce-read-only-tools.js";
import { commerceHash, publicPolicyLiteral } from "./single-agent-commerce-read-only-context.js";
import { safeRecognitionImageUrl } from "./media-recognition-v2-image-pipeline.js";

export type { MediaDeliveryImage, CommerceMediaDeliveryBinding };
export const commerceDeliveryPolicyHash = (policy: RuntimePolicyBundle, pageId: string, shopId: string, now: Date) =>
  commerceHash({ policy: publicPolicyLiteral(policy, pageId, shopId, now), matrix: policy.artifacts.handoffMatrix });

/** Stored only inside the encrypted Outbox payload; never provider/model input. */
export function makeCommerceMediaDeliveryBinding(input: {
  scope: Pick<CommerceScope, "pageId" | "shopId" | "conversationId" | "customerHash" | "recipient">;
  generation: number; responseGroupId: string; nextState: object & { revision: number };
  policy: RuntimePolicyBundle; messages: readonly RealtimeMetaMessageUnit[]; images: readonly MediaDeliveryImage[];
  now?: Date;
}): CommerceMediaDeliveryBinding {
  return bindingSchema.parse({ kind: "C3_MEDIA_GROUP_V1", pageId: input.scope.pageId, shopId: input.scope.shopId,
    conversationId: input.scope.conversationId, customerHash: input.scope.customerHash, recipientHash: input.scope.recipient,
    responseGroupId: input.responseGroupId, generation: input.generation, revision: input.nextState.revision,
    stateHash: commerceHash(input.nextState), policyHash: commerceDeliveryPolicyHash(input.policy, input.scope.pageId, input.scope.shopId, input.now ?? new Date()),
    messageHashes: input.messages.map(commerceHash), images: input.images.map(({ productId, url, sourceVersion, observedAt, expiresAt }) =>
      ({ productId, url, sourceVersion, observedAt, expiresAt })) });
}

/** Extends the existing response-group gate, once before sequence zero. All
 * inputs can be reloaded after restart; no captured turn closure grants send. */
export function createCommerceMediaPreSendGate(input: {
  base: MetaPreSendGate; clock: () => Date; allowedHostSuffixes: readonly string[];
  readAuthority: (binding: CommerceMediaDeliveryBinding) => Promise<{ state: unknown; stateVersion: number;
    routingOwner: string; appSendEnabled: boolean; killSwitch: boolean; generation: number }>;
  policy: (binding: CommerceMediaDeliveryBinding) => Promise<RuntimePolicyBundle>;
  readProduct: (productId: string) => Promise<StableProductDocument>;
}): MetaPreSendGate {
  return { supportsCommerceMediaBinding: true, async authorize(claim) {
    if (claim.mediaBinding === undefined) return input.base.authorize(claim);
    const blocked = () => ({ status: "BLOCKED" as const, reasonCode: "C3_MEDIA_DELIVERY_BINDING_CHANGED", blockingTag: null, observedAt: input.clock() });
    try {
      const parsed = bindingSchema.safeParse(claim.mediaBinding); if (!parsed.success) return blocked();
      const b = parsed.data, now = input.clock();
      if (claim.sequenceNo !== 0 || b.pageId !== claim.pageId || b.conversationId !== claim.conversationId || b.responseGroupId !== claim.responseGroupId ||
        b.recipientHash !== createHash("sha256").update(claim.recipientId).digest("hex") || b.messageHashes[0] !== commerceHash(claim.message)) return blocked();
      const authority = await input.readAuthority(b);
      if (authority.stateVersion !== b.revision || authority.generation !== b.generation || !authority.appSendEnabled || authority.killSwitch ||
        authority.routingOwner !== "APP" || commerceHash(authority.state) !== b.stateHash ||
        commerceDeliveryPolicyHash(await input.policy(b), b.pageId, b.shopId, now) !== b.policyHash) return blocked();
      const products = new Map(await Promise.all([...new Set(b.images.map(a => a.productId))].map(async id => [id, await input.readProduct(id)] as const)));
      for (const expected of b.images) {
        const product = products.get(expected.productId), asset = product?.images.find(a => a.url === expected.url);
        safeRecognitionImageUrl(expected.url, input.allowedHostSuffixes);
        if (!product || product.productId !== expected.productId || !asset || asset.reviewStatus !== "APPROVED" || !asset.metadataVerified ||
          !asset.sourceContentSha256 || !/^[a-f0-9]{64}$/u.test(asset.sourceContentSha256) ||
          Date.parse(expected.observedAt) > now.getTime() || Date.parse(expected.expiresAt) <= now.getTime() ||
          Date.parse(expected.observedAt) + MEDIA_FRESH_FOR_SECONDS * 1000 <= now.getTime() ||
          (asset.observedAt ?? product.observedAt) !== expected.observedAt ||
          commerceHash({ productId: product.productId, catalogVersion: product.catalogVersion, image: asset }) !== expected.sourceVersion) return blocked();
      }
      // Detect authority changing while catalog/policy reads were in flight.
      const final = await input.readAuthority(b);
      if (commerceHash(final) !== commerceHash(authority)) return blocked();
      return input.base.authorize(claim);
    } catch { return blocked(); }
  } };
}
