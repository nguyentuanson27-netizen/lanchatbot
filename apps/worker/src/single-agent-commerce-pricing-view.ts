// Quotes and granted concessions establish amounts, never an absolute best price.
// The current policy engine exposes no decision proving a negotiated price floor.
export const unestablishedPriceFloor = () => ({status:"NOT_ESTABLISHED" as const,amountVnd:null});

/**
 * How a stored support request gets evaluated. One code-owned statement, placed in trusted state so the
 * owner and the verifier read the same process: code can quote support before a cart and rechecks at commit.
 * It grants nothing by itself and names what the customer still has to choose, never a cart to create.
 */
export type SupportEvaluationWhen="MATCHING_CART_OPENS"|"NOT_COMPLETED_AT_CART_OPENING"|"REQUEST_DIFFERS_FROM_CART";
export type SupportWaitingFor="COLOR"|"SIZE";
export type SupportWaitingForStatus="KNOWN"|"UNKNOWN";
export const SUPPORT_EVALUATION_MEANING:Record<SupportEvaluationWhen,string>={
 MATCHING_CART_OPENS:"Lời xin hỗ trợ giá cho món này đã lưu. Báo giá hỗ trợ bằng quote_product từ dữ kiện hiện hành, không cần có giỏ. "+
  "Chỉ nêu mức đã được code tính trong quote; khi khách mua, code kiểm lại và ghi ưu đãi một lần khi món vào giỏ. "+
  "Quote không phải biên nhận đã áp dụng. waitingFor là lựa chọn còn thiếu cho việc mua, không phải điều kiện để biết giá nếu giá đã xác định.",
 NOT_COMPLETED_AT_CART_OPENING:"Giỏ đã có nhưng lần xét hỗ trợ lúc mở giỏ chưa hoàn tất. Gọi apply_pending_negotiation với pendingRef để xét; chưa có kết quả thì không nói đã có hay không có ưu đãi thêm.",
 REQUEST_DIFFERS_FROM_CART:"Lời xin hỗ trợ đã lưu không còn khớp giỏ hiện tại nên chưa được xét. Khách nhắc lại mong muốn hỗ trợ cho giỏ này thì ghi bằng record_negotiation; không nói đã xét.",
};
export const supportEvaluationStep=(when:SupportEvaluationWhen,waitingFor:readonly SupportWaitingFor[],waitingForStatus:SupportWaitingForStatus)=>
 ({by:"CODE" as const,when,waitingFor:[...waitingFor],waitingForStatus,meaning:SUPPORT_EVALUATION_MEANING[when]});
