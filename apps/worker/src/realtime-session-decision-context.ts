import type { SessionDecisionContext } from "@lana/conversation-engine";

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
