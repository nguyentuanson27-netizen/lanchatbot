import type {
  HandoffDirective,
  HandoffReason,
  PostSaleHandoffReason,
} from "./types.js";

const POST_SALE_REASONS = new Set<PostSaleHandoffReason>([
  "POST_SALE",
  "ORDER_STATUS",
  "DELIVERY_TRACKING",
  "DELIVERY_DELAY",
  "CHANGE_DELIVERY_INFO",
  "CANCEL_ORDER",
  "PAYMENT_AFTER_ORDER",
  "EXCHANGE",
  "RETURN",
  "REFUND",
  "DEFECT",
  "WARRANTY",
  "WRONG_OR_MISSING_ITEM",
]);

export function isPostSaleHandoffReason(
  reason: HandoffReason,
): reason is PostSaleHandoffReason {
  return POST_SALE_REASONS.has(reason as PostSaleHandoffReason);
}

/** HANDOFF never creates customer-facing text. It only expresses desired tag state. */
export function classifyHandoff(reason: HandoffReason): HandoffDirective {
  if (isPostSaleHandoffReason(reason)) {
    return {
      reason,
      category: "POST_SALE",
      desiredTag: "VAN_DON",
      silent: true,
    };
  }
  return {
    reason,
    category: "GENERAL",
    desiredTag: "NHAN_VIEN",
    silent: true,
  };
}
