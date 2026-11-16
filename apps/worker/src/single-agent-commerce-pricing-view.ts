// Quotes and granted concessions establish amounts, never an absolute best price.
// The current policy engine exposes no decision proving a negotiated price floor.
export const unestablishedPriceFloor = () => ({status:"NOT_ESTABLISHED" as const,amountVnd:null});

/**
 * How a stored support request gets evaluated. One code-owned statement, placed in trusted state so the
 * owner and the verifier read the same process: code evaluates the request when the matching cart opens.
 * It grants nothing by itself and names what the customer still has to choose, never a cart to create.
 */
export type SupportEvaluationWhen="MATCHING_CART_OPENS"|"NOT_COMPLETED_AT_CART_OPENING"|"REQUEST_DIFFERS_FROM_CART";
export type SupportWaitingFor="COLOR"|"SIZE"|"CUSTOMER_PURCHASE_CHOICE";
export const SUPPORT_EVALUATION_MEANING:Record<SupportEvaluationWhen,string>={
 MATCHING_CART_OPENS:"Lời xin hỗ trợ giá cho món này đã lưu, chưa xét. Code tự xét một lần ngay khi món này vào giỏ; khách không cần hỏi lại. "+
  "Được nói rằng lên giỏ xong shop sẽ xem hỗ trợ; chưa có kết quả nên không nói đã có, sẽ có hay không có ưu đãi thêm. "+
  "waitingFor là phần còn chờ khách; không thêm giỏ chỉ để xét.",
 NOT_COMPLETED_AT_CART_OPENING:"Giỏ đã có nhưng lần xét hỗ trợ lúc mở giỏ chưa hoàn tất. Gọi apply_pending_negotiation với pendingRef để xét; chưa có kết quả thì không nói đã có hay không có ưu đãi thêm.",
 REQUEST_DIFFERS_FROM_CART:"Lời xin hỗ trợ đã lưu không còn khớp giỏ hiện tại nên chưa được xét. Khách nhắc lại mong muốn hỗ trợ cho giỏ này thì ghi bằng record_negotiation; không nói đã xét.",
};
export const supportEvaluationStep=(when:SupportEvaluationWhen,waitingFor:readonly SupportWaitingFor[])=>
 ({by:"CODE" as const,when,waitingFor:[...waitingFor],meaning:SUPPORT_EVALUATION_MEANING[when]});
