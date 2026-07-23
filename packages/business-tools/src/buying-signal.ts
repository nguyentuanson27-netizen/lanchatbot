export type BuyingSignalReason =
  | "DIRECT_PURCHASE_VERB"
  | "SHIP_REQUEST"
  | "CONFIRMED_SIZE"
  | "CONFIRMED_COLOR"
  | "COMPONENT_SELECTION";

export interface BuyingSignalContext {
  readonly hasProductContext?: boolean;
}

export interface BuyingSignalDetection {
  readonly isBuyingSignal: boolean;
  readonly reasons: readonly BuyingSignalReason[];
}

function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function negativeOrHesitantOnly(text: string): boolean {
  const negative = /(?:^|\s)(?:khong|ko|k|chua)\s+(?:lay|mua|chot|dat)(?:\s|$)/u.test(text);
  const hesitant = /(?:de\s+(?:chi|minh|em)\s+(?:xem|nghi)|suy\s+nghi|chua\s+quyet|tham\s+khao\s+them)/u.test(text);
  if (!negative && !hesitant) return false;
  return !/(?:nhung|con|ma)\s+(?:chi\s+)?(?:chot|lay|mua|dat|ship)(?:\s|$)/u.test(text);
}

export function detectBuyingSignal(
  value: string,
  context: BuyingSignalContext = {},
): BuyingSignalDetection {
  const text = asciiFold(value);
  if (!text || negativeOrHesitantOnly(text)) {
    return { isBuyingSignal: false, reasons: [] };
  }

  const reasons = new Set<BuyingSignalReason>();
  const directPurchase =
    /(?:^|\s)(?:chot|mua|dat)(?:\s|$)/u.test(text) ||
    (
      /(?:^|\s)lay(?:\s|$)/u.test(text) &&
      !/(?:^|\s)lay\s+(?:anh|hinh|link|ma|thong\s+tin)(?:\s|$)/u.test(text)
    );
  if (directPurchase) reasons.add("DIRECT_PURCHASE_VERB");

  if (
    /(?:^|\s)ship\s+(?:cho|minh|chi|c|em|mau|sp|san\s+pham|set|bo|ao|quan)(?:\s|$)/u.test(text)
  ) {
    reasons.add("SHIP_REQUEST");
  }

  if (
    /(?:^|\s)(?:lay|chot)\s+(?:ao|quan|chan\s+vay|cv|set|bo)(?:\s|$)/u.test(text)
  ) {
    reasons.add("COMPONENT_SELECTION");
  }

  if (context.hasProductContext) {
    const confirmation = /(?:^|\s)(?:ok|oke|duoc|dong\s+y|lay|chot)(?:\s|$)/u.test(text);
    const closingParticle = /(?:\s|^)(?:nhe|nha|a)$/u.test(text);
    if (
      /(?:^|\s)(?:size|sz)\s*(?:s|m|l|xl)(?:\s|$)/u.test(text) &&
      (confirmation || closingParticle)
    ) {
      reasons.add("CONFIRMED_SIZE");
    }
    if (
      /(?:^|\s)mau\s+[a-z0-9]{2,}(?:\s|$)/u.test(text) &&
      (confirmation || closingParticle)
    ) {
      reasons.add("CONFIRMED_COLOR");
    }
  }

  return {
    isBuyingSignal: reasons.size > 0,
    reasons: [...reasons].sort(),
  };
}

export function containsBuyingSignal(
  value: string,
  context: BuyingSignalContext = {},
): boolean {
  return detectBuyingSignal(value, context).isBuyingSignal;
}
