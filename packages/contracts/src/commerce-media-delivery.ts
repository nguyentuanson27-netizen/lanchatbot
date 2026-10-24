import { z } from "zod";

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
export const CommerceMediaDeliveryImageV1Schema = z.object({ productId: z.string().min(1).max(128), url: z.string().url().max(2048), sourceVersion: hash,
  observedAt: z.string().datetime(), expiresAt: z.string().datetime() }).strict();
/** Private deterministic gate input carried inside encrypted Outbox units. */
export const CommerceMediaDeliveryBindingV1Schema = z.object({ kind: z.literal("C3_MEDIA_GROUP_V1"), pageId: z.string().min(1).max(128),
  shopId: z.string().min(1).max(128), conversationId: z.string().min(1).max(128), customerHash: hash, recipientHash: hash,
  responseGroupId: z.string().min(1).max(128), generation: z.number().int().nonnegative(), revision: z.number().int().nonnegative(),
  stateHash: hash, policyHash: hash, messageHashes: z.array(hash).min(2).max(6), images: z.array(CommerceMediaDeliveryImageV1Schema).min(1).max(4) }).strict();
export type CommerceMediaDeliveryImageV1 = z.infer<typeof CommerceMediaDeliveryImageV1Schema>;
export type CommerceMediaDeliveryBindingV1 = z.infer<typeof CommerceMediaDeliveryBindingV1Schema>;
