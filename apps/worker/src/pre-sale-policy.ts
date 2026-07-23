import type { RuntimePolicyBundle } from "@lana/chat-runtime";

export type PreSalePolicyIntent =
  | "EXCHANGE_AND_RETURN"
  | "EXCHANGE_SIZE"
  | "EXCHANGE_COLOR"
  | "EXCHANGE_MODEL"
  | "RETURN_AND_REFUND"
  | "TRY_ON"
  | "REFUSED_PARCEL_FEE"
  | "SHIPPING_FEE"
  | "DELIVERY_TIME"
  | "SHOPEE_PRICE"
  | "IMAGE_ACCURACY"
  | "WASHING_CARE"
  | "UNSUPPORTED_POLICY";

function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/giu, "d")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/gu, " ")
    .trim();
}

function isActualAfterSalesAction(text: string): boolean {
  return (
    /\b(van don|ma van don|tracking|don (?:hang )?(?:cua|nay|do)|da dat|da chot|da mua|da nhan|moi nhan|nhan hang roi|chua giao|dang giao|shipper)\b/u.test(text) ||
    /\b(giao nham|giao sai|hang bi loi|san pham bi loi|loi vai|loi duong may)\b/u.test(text) ||
    /\b(cho (?:chi|em|minh) doi|(?:chi|em|minh) (?:muon|can) doi|doi (?:size|mau|hang|mau khac) (?:cho|cua) (?:chi|em|minh)|hoan tien cho)\b/u.test(text)
  );
}

export function classifyPreSalePolicyIntent(value: string): PreSalePolicyIntent | null {
  const vietnamese = value.normalize("NFC").toLocaleLowerCase("vi");
  const text = asciiFold(value);
  if (!text || isActualAfterSalesAction(text)) return null;

  if (/\b(khong nhan hang|tu choi nhan|khong lay hang)\b/u.test(text) &&
      /\b(phi|ship|van chuyen|mat tien)\b/u.test(text)) return "REFUSED_PARCEL_FEE";
  if (/\b(thu hang|thu do|mac thu|uom thu|kiem hang|dong kiem)\b/u.test(text)) return "TRY_ON";
  if (/\b(shopee|gia tren san|voucher san)\b/u.test(text)) return "SHOPEE_PRICE";
  if (/\b(giat may|giat tay|giat kho|bao quan|phai mau)\b/u.test(text)) return "WASHING_CARE";
  if (/\b(giong (?:y )?hinh|giong anh|mau co giong|anh that|san pham that)\b/u.test(text)) return "IMAGE_ACCURACY";
  if (/\b(phi ship|phi van chuyen|ship bao nhieu|tien ship)\b/u.test(text)) return "SHIPPING_FEE";
  if (/\b(giao hang bao lau|bao lau nhan|may ngay nhan|khi nao nhan|thoi gian giao)\b/u.test(text)) return "DELIVERY_TIME";

  const asksTerms = /\b(chinh sach|quy dinh|dieu kien|co duoc|duoc khong|duoc ko|duoc k|co ho tro|the nao|ra sao|bao lau)\b/u.test(text);
  if (/\b(doi tra)\b/u.test(text) && asksTerms) return "EXCHANGE_AND_RETURN";
  if (/\b(tra hang|hoan tien)\b/u.test(text) && asksTerms) return "RETURN_AND_REFUND";
  if (/\b(doi size|doi kich co|mac khong vua)\b/u.test(text) && asksTerms) return "EXCHANGE_SIZE";
  if (/đổi\s+(?:sang\s+)?mẫu|đổi\s+sản phẩm\s+khác|đổi\s+ngang\s+giá/iu.test(vietnamese) && asksTerms) return "EXCHANGE_MODEL";
  if (/đổi\s+(?:sang\s+)?màu/iu.test(vietnamese) && asksTerms) return "EXCHANGE_COLOR";
  if (/\b(doi hang)\b/u.test(text) && asksTerms) return "EXCHANGE_MODEL";
  if (/\b(bao hanh|chinh sach|quy dinh)\b/u.test(text)) return "UNSUPPORTED_POLICY";
  return null;
}

function money(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function joinVietnamese(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} và ${items.at(-1)}`;
}

function exchangeConditions(
  conditions: NonNullable<RuntimePolicyBundle["artifacts"]["shopPolicy"]["customerCare"]>["exchange"]["requiredConditions"],
): string {
  const labels = [
    conditions.originalTags ? "còn tag" : null,
    conditions.unused ? "chưa dùng" : null,
    conditions.unwashed ? "chưa giặt" : null,
    conditions.clean ? "sạch" : null,
    conditions.undamaged ? "không hư hỏng" : null,
  ].filter((value): value is string => value !== null);
  return labels.length > 0 ? `sản phẩm ${joinVietnamese(labels)}` : "sản phẩm đáp ứng điều kiện đổi hàng";
}

function exchangeActionLabels(actions: Array<"SIZE" | "COLOR" | "MODEL">): string {
  const labels = actions.map((action) => ({ SIZE: "size", COLOR: "màu", MODEL: "mẫu" })[action]);
  return joinVietnamese(labels);
}

function returnReasonLabels(
  reasons: Array<"MANUFACTURING_FABRIC_DEFECT" | "MANUFACTURING_SEAM_DEFECT" | "WRONG_PRODUCT_SENT">,
): string {
  return joinVietnamese(reasons.map((reason) => ({
    MANUFACTURING_FABRIC_DEFECT: "lỗi vải",
    MANUFACTURING_SEAM_DEFECT: "lỗi đường may",
    WRONG_PRODUCT_SENT: "giao sai sản phẩm",
  })[reason]));
}

export function renderPreSalePolicyReply(
  intent: PreSalePolicyIntent,
  bundle: RuntimePolicyBundle | null,
): string | null {
  if (!bundle || bundle.sideEffects !== "LIVE_OUTBOUND") return null;
  const shop = bundle.artifacts.shopPolicy;

  if (intent === "SHIPPING_FEE") {
    return `Phí ship mặc định là ${money(shop.defaultShippingFeeVnd)} ạ.`;
  }
  if (intent === "DELIVERY_TIME") {
    return `${shop.deliveryPromiseText.trim().replace(/[.!?]+$/u, "")} ạ.`;
  }

  const care = shop.customerCare;
  if (!care) return null;
  const exchange = care.exchange;
  const returns = care.returns;
  const supportedActions = exchangeActionLabels(exchange.supportedActions);
  const exchangeBase = `Shop hỗ trợ đổi ${supportedActions} ${exchange.maxExchangesPerOrder} lần trong ${exchange.windowDaysFromReceipt} ngày từ khi nhận hàng; ${exchangeConditions(exchange.requiredConditions)} ạ.`;
  const exchangeFee = `Phí đổi hai chiều tổng ${money(exchange.totalTwoWayShippingFeeVnd)} nha.`;

  switch (intent) {
    case "EXCHANGE_AND_RETURN":
      return `Shop hỗ trợ đổi ${supportedActions} ${exchange.maxExchangesPerOrder} lần trong ${exchange.windowDaysFromReceipt} ngày; phí hai chiều tổng ${money(exchange.totalTwoWayShippingFeeVnd)} ạ. Hàng giảm từ ${exchange.saleRestriction.discountThresholdBps / 100}% chỉ đổi ${exchangeActionLabels(exchange.saleRestriction.allowedActions)}; trả hàng áp dụng ${returnReasonLabels(returns.eligibleReasons)} trong ${returns.reportingWindowDaysFromReceipt} ngày nha.`;
    case "EXCHANGE_SIZE":
      return `${exchangeBase} ${exchangeFee}`;
    case "EXCHANGE_COLOR":
      return `${exchangeBase} ${exchangeFee}`;
    case "EXCHANGE_MODEL":
      return `Shop hỗ trợ đổi mẫu ${exchange.maxExchangesPerOrder} lần trong ${exchange.windowDaysFromReceipt} ngày; mẫu mới tính giá niêm yết và bù chênh lệch nếu có ạ. ${exchangeFee}`;
    case "RETURN_AND_REFUND":
      return `Shop nhận trả khi ${returnReasonLabels(returns.eligibleReasons)}; mình báo trong ${returns.reportingWindowDaysFromReceipt} ngày từ lúc nhận hàng ạ. Shop chịu ${returns.shopShippingCoveragePercent}% phí ship và hoàn tiền ${returns.refundBusinessDaysMin}–${returns.refundBusinessDaysMax} ngày làm việc sau khi xác nhận lỗi nha.`;
    case "TRY_ON":
      return "Khi nhận hàng, chị được ướm sản phẩm nhưng shop chưa hỗ trợ mặc thử ạ.";
    case "REFUSED_PARCEL_FEE":
      return `Nếu không nhận hàng, chị hỗ trợ shop ${money(care.inspection.refusedParcelShippingFeeVnd)} phí vận chuyển ạ.`;
    case "SHOPEE_PRICE":
      return "Shopee có voucher và trợ giá riêng từ sàn nên shop không áp dụng mức giá giống hoàn toàn qua inbox được ạ.";
    case "IMAGE_ACCURACY":
      return care.customerFaq.discloseLightingAndDisplayColorVariance
        ? "Shop chụp từ sản phẩm thật; form và chất liệu theo mẫu, màu có thể chênh nhẹ do ánh sáng hoặc màn hình ạ."
        : null;
    case "WASHING_CARE":
      if (!care.customerFaq.handWashPreferred) return null;
      return care.customerFaq.machineWashAllowedWithLaundryBagAndGentleCycle
        ? "Giặt tay giúp giữ đồ bền đẹp nhất; nếu giặt máy, chị cho vào túi giặt và chọn chế độ nhẹ nha."
        : "Chị ưu tiên giặt tay theo hướng dẫn trên nhãn để giữ form và chất liệu bền đẹp nha.";
    case "UNSUPPORTED_POLICY":
      return null;
  }
}
