import { z } from "zod";
import { HandoffReasonV2Schema } from "./v2/handoff-sales-funnel.js";

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
/** Private proof for the exact acknowledgement group; no model/provider input. */
export const CommerceHandoffDeliveryBindingV1Schema = z.object({ kind: z.literal("C3_HANDOFF_GROUP_V1"),
  pageId: z.string().min(1).max(128), shopId: z.string().min(1).max(128), conversationId: z.string().min(1).max(128),
  customerHash: hash, recipientHash: hash, responseGroupId: z.string().min(1).max(128),
  generation: z.number().int().nonnegative(), revision: z.number().int().positive(), stateHash: hash, policyHash: hash,
  reason: HandoffReasonV2Schema, rulesetVersion: z.string().min(1).max(128),
  messageHashes: z.array(hash).min(1).max(6),
}).strict();
export type CommerceHandoffDeliveryBindingV1 = z.infer<typeof CommerceHandoffDeliveryBindingV1Schema>;
