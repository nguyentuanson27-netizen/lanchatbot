import { z } from "zod";
import { HandoffReasonV2Schema } from "./v2/handoff-sales-funnel.js";

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
export const CommerceHandoffSourceCheckV1Schema = z.object({
  kind: z.enum(["PRODUCT", "PROFILE", "SIZE_SOURCE", "CART_SELECTION", "SALES_STATE", "RECEIPT"]),
  queryJson: z.string().min(2).max(4096), sourceHash: hash,
}).strict();
export type CommerceHandoffSourceCheckV1 = z.infer<typeof CommerceHandoffSourceCheckV1Schema>;
export const CommerceHandoffReplyBindingV1Schema = z.object({
  kind: z.enum(["OWNER_VERIFIED_V1", "CODE_PRICE_V1"]), requestId: z.string().min(1).max(128),
  beforeRevision: z.number().int().nonnegative(), beforeStateHash: hash,
  trustedJson: z.string().min(2).max(65536), trustedHash: hash, groupHash: hash,
  sources: z.array(CommerceHandoffSourceCheckV1Schema).max(16),
}).strict().refine(v=>v.kind!=="CODE_PRICE_V1"||v.sources.some(s=>s.kind==="PRODUCT"),"PRICE_SOURCE_REQUIRED");
export type CommerceHandoffReplyBindingV1 = z.infer<typeof CommerceHandoffReplyBindingV1Schema>;
/** Private proof for the exact acknowledgement group; no model/provider input. */
export const CommerceHandoffDeliveryBindingV1Schema = z.object({ kind: z.literal("C3_HANDOFF_GROUP_V1"),
  pageId: z.string().min(1).max(128), shopId: z.string().min(1).max(128), conversationId: z.string().min(1).max(128),
  customerHash: hash, recipientHash: hash, responseGroupId: z.string().min(1).max(128),
  generation: z.number().int().nonnegative(), revision: z.number().int().positive(), stateHash: hash, policyHash: hash,
  reason: HandoffReasonV2Schema, rulesetVersion: z.string().min(1).max(128),
  messageHashes: z.array(hash).min(1).max(6),
  reply: CommerceHandoffReplyBindingV1Schema.optional(),
}).strict().refine(v=>!v.reply||v.revision===v.reply.beforeRevision+1,"EXACT_HANDOFF_SUCCESSOR");
export type CommerceHandoffDeliveryBindingV1 = z.infer<typeof CommerceHandoffDeliveryBindingV1Schema>;
