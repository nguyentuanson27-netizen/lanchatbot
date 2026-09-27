import type { SessionDecisionContext } from "@lana/conversation-engine";
import type { AgentSessionIntentV1 } from "@lana/contracts";

const emptyContext: SessionDecisionContext = Object.freeze({
  budgetVnd: null, occasion: null, rejectedProductIds: [],
});

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d").replace(/Đ/gu, "D").toLowerCase();
}

function budgetValue(amount: string, unit: string): number | null {
  const numeric = Number(amount.replace(/,/gu, "."));
  const multiplier = unit === "trieu" || unit === "m" ? 1_000_000
    : unit === "k" || unit === "nghin" ? 1_000 : 1;
  const value = numeric * multiplier;
  return Number.isSafeInteger(value) && value >= 100_000 && value <= 100_000_000
    ? value : null;
}

/** Keep only explicit customer decision inputs in the existing conversation state. */
export function updateSessionDecisionContext(
  prior: SessionDecisionContext | undefined,
  customerText: string,
): SessionDecisionContext {
  const current = prior ?? emptyContext;
  const text = fold(customerText);
  let budgetVnd = current.budgetVnd;
  if (/\bkhong gioi han ngan sach\b/u.test(text)) budgetVnd = null;
  const budgets = [...text.matchAll(
    /\b(?:ngan sach|tam gia|du tru)\s*(?:cua chi\s*)?(?:doi thanh|la|tam|khoang|duoi|toi da|muc)?\s*(\d+(?:[.,]\d+)?)\s*(trieu|nghin|k|m)?\b/gu,
  )];
  for (const match of budgets) {
    const value = budgetValue(match[1]!, match[2] ?? "");
    if (value !== null) budgetVnd = value;
  }

  let occasion = current.occasion;
  if (/\bkhong (?:mac )?di (?:tiec|lam) nua\b/u.test(text)) occasion = null;
  const occasions = [...text.matchAll(
    /\b(?:mac )?(di lam|di tiec|hang ngay)\b/gu,
  )];
  for (const match of occasions) {
    const before = text.slice(Math.max(0, match.index! - 12), match.index);
    if (/khong\s*$/u.test(before)) continue;
    occasion = match[1] === "di lam" ? "WORK"
      : match[1] === "di tiec" ? "PARTY" : "EVERYDAY";
  }

  const rejected = new Set(current.rejectedProductIds);
  for (const match of text.matchAll(
    /\b(khong lay|bo|loai|lay lai|chon lai)\s*(?:mau\s*)?([a-z]{1,4}\d{2,6})\b/gu,
  )) {
    const id = match[2]!.toUpperCase();
    if (match[1] === "lay lai" || match[1] === "chon lai") rejected.delete(id);
    else rejected.add(id);
  }
  return Object.freeze({
    budgetVnd, occasion,
    rejectedProductIds: Object.freeze([...rejected].sort().slice(0, 8)),
  });
}

export function hasSessionDecisionContext(value: SessionDecisionContext): boolean {
  return value.budgetVnd !== null || value.occasion !== null ||
    value.rejectedProductIds.length > 0;
}

function exactCustomerEvidence(text: string, evidence: string | null): evidence is string {
  return evidence !== null &&
    text.normalize("NFC").includes(evidence.normalize("NFC"));
}

function explicitBudgetAmount(evidence: string): number | null {
  const folded = fold(evidence);
  if (!/\b(?:ngan sach|tam gia|toi da|duoi|muc chi|chi khoang|chi duoc|muon khoang)\b/u
    .test(folded)) return null;
  const amounts = [...folded.matchAll(
    /\b(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(trieu|tr|m|nghin|ngan|k|d|vnd)?\b/gu,
  )];
  if (amounts.length !== 1) return null;
  const [, raw, unit = ""] = amounts[0]!;
  const multiplier = ["trieu", "tr", "m"].includes(unit) ? 1_000_000
    : ["nghin", "ngan", "k"].includes(unit) ? 1_000 : 1;
  const numeric = multiplier === 1
    ? Number(raw!.replace(/[.,]/gu, "")) : Number(raw!.replace(",", "."));
  const amount = numeric * multiplier;
  return Number.isSafeInteger(amount) && amount >= 100_000 && amount <= 100_000_000
    ? amount : null;
}

/** Apply producer evidence to the existing session projection, without adding state. */
export function updateSessionDecisionContextFromModel(
  prior: SessionDecisionContext | undefined,
  customerText: string,
  intent: AgentSessionIntentV1,
): SessionDecisionContext {
  const current = prior ?? emptyContext;
  let budgetVnd = current.budgetVnd;
  const budget = intent.budget;
  if (budget.confidence >= 0.85 &&
      exactCustomerEvidence(customerText, budget.evidenceText)) {
    if (budget.operation === "SET" && budget.amountVnd !== null && budget.amountVnd ===
        explicitBudgetAmount(budget.evidenceText)) budgetVnd = budget.amountVnd;
    if (budget.operation === "CLEAR" && budget.amountVnd === null &&
        /\bkhong gioi han ngan sach\b/u.test(fold(budget.evidenceText))) budgetVnd = null;
  }

  let occasion = current.occasion;
  const requestedOccasion = intent.occasion;
  if (requestedOccasion.confidence >= 0.85 &&
      exactCustomerEvidence(customerText, requestedOccasion.evidenceText)) {
    const evidence = fold(requestedOccasion.evidenceText);
    const phrase = requestedOccasion.value === "WORK" ? "di lam"
      : requestedOccasion.value === "PARTY" ? "di tiec"
        : requestedOccasion.value === "EVERYDAY" ? "hang ngay" : null;
    if (requestedOccasion.operation === "SET" && phrase !== null &&
        evidence.includes(phrase) &&
        !new RegExp(`\\bkhong\\s+(?:mac\\s+)?${phrase}\\b`, "u").test(evidence)) {
      occasion = requestedOccasion.value;
    }
    if (requestedOccasion.operation === "CLEAR" && requestedOccasion.value === null &&
        /\bkhong (?:mac )?di (?:tiec|lam) nua\b/u.test(evidence)) occasion = null;
  }

  const rejected = new Set(current.rejectedProductIds);
  for (const item of intent.productDecisions) {
    if (item.confidence < 0.85 ||
        !exactCustomerEvidence(customerText, item.evidenceText)) continue;
    const productId = item.productId.toUpperCase();
    if (!/^[A-Z]{1,4}\d{2,6}$/u.test(productId) ||
        !new RegExp(`(?:^|[^A-Z0-9])${productId}(?=$|[^A-Z0-9])`, "iu")
          .test(item.evidenceText)) continue;
    const evidence = item.evidenceText.normalize("NFC").toLowerCase();
    if (item.operation === "REJECT" &&
        /(?:^|[\s,.;])(?:bỏ|không lấy|loại)(?=\s|$)/u.test(evidence) &&
        !/(?:không|chưa)\s+(?:bỏ|loại)/u.test(evidence)) rejected.add(productId);
    if (item.operation === "RESTORE" &&
        /(?:^|[\s,.;])(?:lấy lại|chọn lại)(?=\s|$)/u.test(evidence)) {
      rejected.delete(productId);
    }
  }
  return Object.freeze({ budgetVnd, occasion,
    rejectedProductIds: Object.freeze([...rejected].sort().slice(0, 8)) });
}
