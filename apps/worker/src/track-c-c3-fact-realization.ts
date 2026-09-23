/**
 * Code-owned customer-facing projections for the typed fact groups.
 *
 * These groups already carried authority but had no safe wording, so selecting
 * one produced no answer at all. Each projection reads only typed fields of the
 * group it belongs to: an unrecognised enum value yields no text rather than a
 * guess, and nothing is derived from a neighbouring field (a material does not
 * imply a washing instruction, and an inactive product is not a discontinued
 * one).
 */

export function trackCFormatVnd(amount: number): string {
  return `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/gu, ".")}đ`;
}

function stringField(data: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numberField(data: Readonly<Record<string, unknown>>, key: string): number | null {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanField(data: Readonly<Record<string, unknown>>, key: string): boolean | null {
  const value = data[key];
  return typeof value === "boolean" ? value : null;
}

function stringList(data: Readonly<Record<string, unknown>>, key: string): readonly string[] | null {
  const value = data[key];
  return Array.isArray(value) && value.length > 0 &&
      value.every((item) => typeof item === "string" && item.trim().length > 0)
    ? Object.freeze([...value] as string[])
    : null;
}

function joinVi(values: readonly string[]): string {
  return values.length <= 1 ? (values[0] ?? "") :
    `${values.slice(0, -1).join(", ")} và ${values.at(-1)!}`;
}

const EXCHANGE_CONDITION_TEXT: Readonly<Record<string, string>> = Object.freeze({
  unused: "chưa qua sử dụng",
  tags_intact: "còn nguyên tag",
  unwashed: "chưa giặt",
});

const REFUND_REASON_TEXT: Readonly<Record<string, string>> = Object.freeze({
  manufacturing_defect: "sản phẩm bị lỗi từ nhà sản xuất",
  wrong_item_by_shop: "shop giao sai mẫu",
});

const PAYMENT_METHOD_TEXT: Readonly<Record<string, string>> = Object.freeze({
  COD: "thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "chuyển khoản",
});

const EXCHANGE_CHANGE_TEXT: Readonly<Record<string, string>> = Object.freeze({
  size: "size",
  color: "màu",
});

const CARE_WASH_TEXT: Readonly<Record<string, string>> = Object.freeze({
  hand_or_gentle: "giặt tay hoặc giặt máy ở chế độ nhẹ",
  hand_only: "giặt tay",
  gentle: "giặt ở chế độ nhẹ",
});

const CARE_AVOID_TEXT: Readonly<Record<string, string>> = Object.freeze({
  strong_spin: "tránh vắt mạnh",
  bleach: "tránh dùng chất tẩy",
  hot_water: "tránh giặt nước nóng",
});

const CARE_DRY_TEXT: Readonly<Record<string, string>> = Object.freeze({
  shade: "phơi trong bóng râm",
  flat: "phơi nằm ngang",
  hang: "phơi treo",
});

const ATTRIBUTE_BACK_COVERAGE_TEXT: Readonly<Record<string, string>> = Object.freeze({
  closed_back: "Phần lưng của mẫu này là lưng kín ạ.",
  open_back: "Phần lưng của mẫu này để hở ạ.",
  partial_back: "Phần lưng của mẫu này hở một phần ạ.",
});

const LIFECYCLE_TEXT: Readonly<Record<string, string>> = Object.freeze({
  DISCONTINUED: "Mẫu này đã ngừng sản xuất nên hiện shop không còn nhận đặt ạ.",
  ACTIVE: "Mẫu này hiện vẫn đang được bán ạ.",
});

/** Map every listed token, or nothing: a partial vocabulary match is dropped. */
function mapAll(
  values: readonly string[],
  table: Readonly<Record<string, string>>,
): readonly string[] | null {
  const mapped = values.map((value) => table[value]);
  return mapped.every((entry): entry is string => entry !== undefined)
    ? Object.freeze(mapped) : null;
}

function policyText(
  policy: string,
  data: Readonly<Record<string, unknown>>,
): string | null {
  if (policy === "INSPECTION") {
    const checks = [
      ...(booleanField(data, "verifyModel") === true ? ["đúng mẫu"] : []),
      ...(booleanField(data, "verifyColor") === true ? ["đúng màu"] : []),
      ...(booleanField(data, "verifySize") === true ? ["đúng size"] : []),
    ];
    if (checks.length === 0) return null;
    const tryOn = data["tryOn"];
    // Only the verified scope is stated. ORDER_DEPENDENT is reported as
    // conditional rather than promised as unrestricted try-on.
    const tryOnText = tryOn === true ? " Chị cũng được thử tại chỗ ạ."
      : tryOn === false ? " Phần thử đồ khi nhận hàng thì shop chưa hỗ trợ ạ."
      : tryOn === "ORDER_DEPENDENT"
        ? " Riêng việc thử đồ còn tuỳ theo từng đơn, em cần kiểm tra lại giúp chị ạ."
        : "";
    return `Khi nhận hàng chị được kiểm tra ${joinVi(checks)} ạ.${tryOnText}`;
  }
  if (policy === "EXCHANGE") {
    const windowDays = numberField(data, "windowDays");
    const conditions = stringList(data, "conditions");
    if (windowDays === null || conditions === null) return null;
    const mapped = mapAll(conditions, EXCHANGE_CONDITION_TEXT);
    if (mapped === null) return null;
    const fee = numberField(data, "customerChangeFeeVnd");
    const maxPerInvoice = numberField(data, "maxExchangesPerInvoice");
    // The conditions are material to the answer, so they are never summarised
    // away into a bare "chị đổi được".
    return `Mẫu này đổi được trong ${windowDays} ngày, với điều kiện ${joinVi(mapped)} ạ.` +
      (fee === null ? ""
        : ` Nếu chị đổi theo nhu cầu cá nhân thì có phí ${trackCFormatVnd(fee)} ạ.`) +
      (maxPerInvoice === null ? ""
        : ` Mỗi đơn được đổi tối đa ${maxPerInvoice} lần ạ.`);
  }
  if (policy === "EXCHANGE_SALE") {
    const threshold = numberField(data, "discountAtLeastPercent");
    const allowed = stringList(data, "allowedChanges");
    const modelChange = booleanField(data, "modelChange");
    if (threshold === null || allowed === null || modelChange === null) return null;
    const mapped = mapAll(allowed, EXCHANGE_CHANGE_TEXT);
    if (mapped === null) return null;
    return `Với mẫu giảm từ ${threshold}% trở lên, chị đổi được ${joinVi(mapped)} ạ.` +
      (modelChange ? " Chị cũng đổi sang mẫu khác được ạ."
        : " Phần đổi sang mẫu khác thì chưa áp dụng cho nhóm này ạ.");
  }
  if (policy === "REFUND") {
    const reasons = stringList(data, "eligibleReasons");
    const days = numberField(data, "reportWithinDays");
    if (reasons === null || days === null) return null;
    const mapped = mapAll(reasons, REFUND_REASON_TEXT);
    if (mapped === null) return null;
    return `Shop hoàn tiền trong trường hợp ${mapped.join(" hoặc ")}, khi chị báo trong ${days} ngày kể từ lúc nhận hàng ạ.`;
  }
  if (policy === "PAYMENT") {
    const methods = stringList(data, "methods");
    if (methods === null) return null;
    const mapped = mapAll(methods, PAYMENT_METHOD_TEXT);
    if (mapped === null) return null;
    const deposit = booleanField(data, "depositRequired");
    return `Shop nhận ${joinVi(mapped)} ạ.` +
      (deposit === false ? " Chị không cần đặt cọc trước ạ." : "");
  }
  if (policy === "CUSTOMIZATION") {
    const supported = booleanField(data, "supported");
    if (supported === null) return null;
    return supported
      ? "Mẫu này có nhận chỉnh sửa theo yêu cầu ạ."
      : "Mẫu này hiện shop chưa nhận chỉnh sửa theo yêu cầu ạ.";
  }
  if (policy === "SPLIT_SIZE") {
    const allowed = booleanField(data, "allowed");
    if (allowed === null) return null;
    return allowed
      ? "Set này chị tách size giữa áo và quần được ạ."
      : "Set này hiện chưa tách size riêng từng món được ạ.";
  }
  return null;
}

/**
 * Realization for one typed fact group.
 *
 * `null` means the group has authority but no safe wording for this shape, and
 * the caller reports that as an unmet realization rather than dropping it.
 */
export function trackCSimulationFactText(
  kind: string,
  data: Readonly<Record<string, unknown>>,
  policy: string | null,
): string | null {
  if (kind === "POLICY_SNAPSHOT") {
    return policy === null ? null : policyText(policy, data);
  }
  if (kind === "PRODUCT_ATTRIBUTE") {
    const backCoverage = stringField(data, "backCoverage");
    const text = backCoverage === null
      ? undefined : ATTRIBUTE_BACK_COVERAGE_TEXT[backCoverage];
    return text ?? null;
  }
  if (kind === "BUSINESS_LOCATION") {
    const address = stringField(data, "address");
    if (address === null) return null;
    const hours = stringField(data, "hours");
    const tryOn = booleanField(data, "tryOn");
    return `Cửa hàng của shop ở ${address} ạ.` +
      (hours === null ? "" : ` Shop mở cửa ${hours} ạ.`) +
      (tryOn === true ? " Chị qua thử trực tiếp được ạ."
        : tryOn === false ? " Hiện shop chưa hỗ trợ thử tại cửa hàng ạ." : "");
  }
  if (kind === "CARE_GUIDANCE") {
    const wash = stringField(data, "wash");
    const avoid = stringField(data, "avoid");
    const dry = stringField(data, "dry");
    if (wash === null || avoid === null || dry === null) return null;
    const washText = CARE_WASH_TEXT[wash];
    const avoidText = CARE_AVOID_TEXT[avoid];
    const dryText = CARE_DRY_TEXT[dry];
    if (washText === undefined || avoidText === undefined || dryText === undefined) {
      return null;
    }
    return `Mẫu này chị ${washText}, ${avoidText} và ${dryText} ạ.`;
  }
  if (kind === "OFFER_CONFIGURATION") {
    // Separate set pricing from per-item retail: an unavailable item is stated
    // as unavailable instead of being left out of the answer.
    const parts: string[] = [];
    const fullSet = numberField(data, "fullSetVnd");
    if (fullSet !== null) parts.push(`nguyên set có giá ${trackCFormatVnd(fullSet)}`);
    const twoPiece = numberField(data, "twoPieceVnd");
    if (twoPiece !== null) parts.push(`bộ 2 món có giá ${trackCFormatVnd(twoPiece)}`);
    const threePiece = numberField(data, "threePieceVnd");
    const threeItems = stringList(data, "threePieceItems");
    if (threePiece !== null) {
      parts.push(threeItems === null
        ? `bộ 3 món có giá ${trackCFormatVnd(threePiece)}`
        : `bộ 3 món gồm ${joinVi(threeItems)} có giá ${trackCFormatVnd(threePiece)}`);
    }
    for (const [key, label] of [["top", "áo"], ["bottom", "quần/chân váy"]] as const) {
      const item = data[key];
      if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
      const record = item as Readonly<Record<string, unknown>>;
      const available = booleanField(record, "available");
      if (available === null) continue;
      const priceVnd = numberField(record, "priceVnd");
      parts.push(available && priceVnd !== null
        ? `mua lẻ ${label} có giá ${trackCFormatVnd(priceVnd)}`
        : available
          ? `${label} có bán lẻ`
          : `${label} hiện chưa bán lẻ riêng`);
    }
    return parts.length === 0 ? null : `${joinVi(parts).replace(/^./u, (first) => first.toUpperCase())} ạ.`;
  }
  if (kind === "PROMOTION_SEMANTICS") {
    const active = booleanField(data, "active");
    if (active === null) return null;
    if (!active) return "Hiện chưa có chương trình ưu đãi nào đang áp dụng ạ.";
    const condition = stringField(data, "condition");
    const gift = stringField(data, "gift");
    if (condition === null || gift === null) return null;
    return `Hiện có ưu đãi tặng ${gift} khi đơn đạt điều kiện: ${condition} ạ.`;
  }
  if (kind === "CART_TOTAL") {
    const total = numberField(data, "totalVnd");
    return total === null
      ? null
      : `Tổng đơn hiện tại của chị là ${trackCFormatVnd(total)} ạ.`;
  }
  if (kind === "PRODUCT_LIFECYCLE") {
    const status = stringField(data, "status");
    return status === null ? null : LIFECYCLE_TEXT[status] ?? null;
  }
  if (kind === "FULFILLMENT_SNAPSHOT") {
    // Production and delivery are distinct spans. They are reported separately
    // so a dispatch time is never presented as an arrival time.
    const productionMin = numberField(data, "productionMinDays");
    const productionMax = numberField(data, "productionMaxDays");
    const deliveryMin = numberField(data, "deliveryMinDays");
    const deliveryMax = numberField(data, "deliveryMaxDays");
    if (productionMin === null || productionMax === null ||
        deliveryMin === null || deliveryMax === null) {
      return null;
    }
    const span = (min: number, max: number): string =>
      min === max ? `${min} ngày` : `${min}–${max} ngày`;
    const madeToOrder = stringField(data, "status") === "MADE_TO_ORDER";
    return `Mẫu này ${madeToOrder ? "được may sau khi chị đặt, " : ""}` +
      `thời gian chuẩn bị hàng khoảng ${span(productionMin, productionMax)}, ` +
      `sau đó vận chuyển thêm khoảng ${span(deliveryMin, deliveryMax)} ạ. ` +
      `Tổng thời gian dự kiến là ${span(
        productionMin + deliveryMin, productionMax + deliveryMax,
      )}, em chưa thể cam kết chính xác một ngày cụ thể ạ.`;
  }
  return null;
}
