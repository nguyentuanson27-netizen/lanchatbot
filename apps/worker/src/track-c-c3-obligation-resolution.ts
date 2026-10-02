import type { TrackCRequestedObligation } from "./track-c-c3-strategy-contract.js";

/** Code-owned topic labels carry no factual value or effect permission. */
export function trackCObligationTopic(obligation: TrackCRequestedObligation): string {
  const scopes: Readonly<Record<string, string>> = {
    WRINKLE_RESISTANCE: "khả năng chống nhăn", MATERIALS: "chất liệu",
    COLORS: "màu", STYLES: "kiểu dáng", SILHOUETTE: "phom dáng", OCCASION: "dịp sử dụng",
    STRETCH: "độ co giãn", OPACITY: "độ xuyên thấu", LINING: "lớp lót",
    BREATHABILITY: "độ thoáng", CARE_INSTRUCTIONS: "cách chăm sóc",
    FULL_SET: "cấu hình nguyên bộ", TOP: "cấu hình áo", BOTTOM: "cấu hình phần dưới",
    TWO_PIECE: "cấu hình hai món", THREE_PIECE: "cấu hình ba món",
  };
  const capabilities: Readonly<Record<string, string>> = {
    PRICE: "giá", STOCK: "tình trạng còn hàng", SIZE_FIT: "độ vừa vặn",
    ETA: "thời gian giao hàng", PRODUCT_ATTRIBUTES: "thuộc tính sản phẩm",
    OFFER_CONFIGURATION: "cấu hình sản phẩm",
  };
  return scopes[obligation.scope ?? ""] ?? capabilities[obligation.capability ?? ""] ?? "lựa chọn khác";
}
