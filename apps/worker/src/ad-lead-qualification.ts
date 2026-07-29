export interface AdLeadQualificationInput {
  readonly text: string;
  readonly productMatched: boolean;
  readonly resolvedAttachment: boolean;
  readonly businessIntent: string | null;
  readonly preSalePolicyIntent: string | null;
  readonly objectionType: string | null;
  readonly buyingCommitted: boolean;
  readonly orderPreviewCreated: boolean;
  readonly purchaseConfirmed: boolean;
}

export interface AdLeadQualificationDecision {
  readonly meaningfulLabels: readonly string[];
  readonly ambiguousAcknowledgement: boolean;
  readonly buyingNegated: boolean;
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

export function detectExplicitBuyingNegation(value: string): boolean {
  const text = fold(value);
  return /(?:^|\s)(?:khong|ko|k|chua)\s+(?:lay|mua|chot|dat|ship)(?:\s|$)/u.test(text) ||
    /(?:^|\s)(?:thoi|bo|huy)\s+(?:don|mau|sp|san pham|khong lay)?(?:\s|$)/u.test(text);
}

function ambiguousAck(value: string): boolean {
  const text = fold(value);
  if (!text) return true;
  return /^(?:ok|oke|okay|da|vang|uh|u)$/u.test(text);
}

export function deriveAdLeadQualification(
  input: AdLeadQualificationInput,
): AdLeadQualificationDecision {
  const labels = new Set<string>();
  const text = fold(input.text);
  const buyingNegated = detectExplicitBuyingNegation(input.text);
  if (buyingNegated) labels.add("BUYING_NEGATED");
  if (input.productMatched) labels.add("PRODUCT_MATCHED");
  if (input.resolvedAttachment) labels.add("RESOLVED_MEDIA");
  if (input.businessIntent && input.businessIntent !== "NONE") {
    labels.add(`${input.businessIntent}_QUESTION`);
  }
  if (input.preSalePolicyIntent) labels.add(`PRE_SALE_${input.preSalePolicyIntent}`);
  if (input.objectionType && input.objectionType !== "NONE") {
    labels.add(`OBJECTION_${input.objectionType}`);
  }
  if (/(?:^|\s)(?:size|sz|eo|nguc|mong|cao|nang)(?:\s|$)/u.test(text)) {
    labels.add("SIZE_OR_MEASUREMENT");
  }
  if (!buyingNegated && /(?:^|\s)(?:mau|color|ao|quan|chan vay|set|bo)(?:\s|$)/u.test(text)) {
    labels.add("VARIANT_SELECTION");
  }
  if (!buyingNegated && input.orderPreviewCreated) labels.add("ORDER_PREVIEW_CREATED");
  if (!buyingNegated && input.buyingCommitted) labels.add("BUYING_COMMITTED");
  if (!buyingNegated && input.purchaseConfirmed) labels.add("PURCHASE_CONFIRMED");

  return {
    meaningfulLabels: [...labels].sort(),
    ambiguousAcknowledgement: labels.size === 0 && ambiguousAck(input.text),
    buyingNegated,
  };
}
