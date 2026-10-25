import { z } from "zod";

const id=z.string().min(1).max(128), hash=z.string().regex(/^[a-f0-9]{64}$/u);
const money=z.number().int().nonnegative().max(1_000_000_000);
export const CommercePublicCartAmountsV1Schema=z.object({cartId:z.string().uuid(),cartVersion:z.number().int().nonnegative(),
  discountTotalVnd:money.optional(),grandTotalVnd:money}).strict();
/** Producer-only numeric payload, encrypted beside the exact code-owned message. Not effect authority. */
export const CommercePublicCartSummaryV1Schema=CommercePublicCartAmountsV1Schema.extend({kind:z.literal("C3_PUBLIC_CART_SUMMARY_V1"),
  pageId:id,conversationId:id,customerHash:hash,recipientHash:hash,responseGroupId:id,sequence:z.literal(0),messageHash:hash}).strict();
export const CommercePublicCartEventV1Schema=CommercePublicCartAmountsV1Schema.extend({type:z.literal("ACCEPTED_PUBLIC_CART_SUMMARY"),
  eventId:hash,messageHash:hash,acceptedAt:z.string().datetime()}).strict();
export type CommercePublicCartEventV1=z.infer<typeof CommercePublicCartEventV1Schema>;

export const CommerceHistoryMetadataV1Schema=z.object({completeHistory:z.literal(false),publicCartEvents:z.array(CommercePublicCartEventV1Schema).max(2)}).strict();
