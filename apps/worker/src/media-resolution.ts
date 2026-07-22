import {
  normalizeProductCode,
  type MediaProductSearchResult,
  type StableProductDocument,
} from "@lana/business-tools";

export interface MediaAnalysisItem {
  readonly ordinal: number;
  readonly mediaType: "IMAGE" | "VIDEO";
  readonly status: "MATCHED" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
  readonly product: StableProductDocument | null;
  readonly score: number | null;
  readonly gap: number | null;
  readonly reasonCode: string | null;
  readonly frameCount: number;
}

export interface MediaAggregation {
  readonly items: readonly MediaAnalysisItem[];
  readonly products: readonly StableProductDocument[];
  readonly uncertainCount: number;
  readonly totalCount: number;
  readonly uncertainRatio: number;
  readonly requiresHandoff: boolean;
}

export function containsCustomerUrl(value: string): boolean {
  return /(?:https?:\/\/|www\.)[^\s<>]+/iu.test(value);
}

export function extractAdProductCodes(adTitle: string): readonly string[] {
  const candidates = adTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .match(/[A-Za-z]{1,6}\s*[-_.]?\s*\d{1,8}[A-Za-z0-9]*/gu) ?? [];
  return [...new Set(candidates
    .map(normalizeProductCode)
    .filter((value) => /^[A-Z]{1,6}\d{1,8}[A-Z0-9]*$/u.test(value)))];
}

export function mediaItemFromSearch(
  ordinal: number,
  mediaType: "IMAGE" | "VIDEO",
  result: MediaProductSearchResult,
  frameCount = 1,
): MediaAnalysisItem {
  if (result.status === "MATCHED") {
    return {
      ordinal,
      mediaType,
      status: "MATCHED",
      product: result.product,
      score: result.score,
      gap: result.gap,
      reasonCode: null,
      frameCount,
    };
  }
  return {
    ordinal,
    mediaType,
    status: result.status,
    product: null,
    score: null,
    gap: null,
    reasonCode: result.reasonCode,
    frameCount,
  };
}

export function aggregateVideoFrames(
  ordinal: number,
  frameResults: readonly MediaProductSearchResult[],
): MediaAnalysisItem {
  const matched = frameResults.filter(
    (result): result is Extract<MediaProductSearchResult, { status: "MATCHED" }> =>
      result.status === "MATCHED",
  );
  const groups = new Map<string, typeof matched>();
  for (const result of matched) {
    const key = normalizeProductCode(result.product.productId);
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  const winner = [...groups.values()]
    .sort((left, right) =>
      right.length - left.length ||
      Math.max(...right.map((item) => item.score)) - Math.max(...left.map((item) => item.score))
    )[0];
  if (!winner || winner.length < 2) {
    return {
      ordinal,
      mediaType: "VIDEO",
      status: "AMBIGUOUS",
      product: null,
      score: null,
      gap: null,
      reasonCode: "VIDEO_FRAME_CONSENSUS_MISSING",
      frameCount: Math.max(1, Math.min(3, frameResults.length)),
    };
  }
  const best = [...winner].sort((left, right) => right.score - left.score)[0];
  if (!best) throw new Error("VIDEO_FRAME_RESULT_INVALID");
  return {
    ordinal,
    mediaType: "VIDEO",
    status: "MATCHED",
    product: best.product,
    score: best.score,
    gap: best.gap,
    reasonCode: null,
    frameCount: Math.max(1, Math.min(3, frameResults.length)),
  };
}

export function aggregateMedia(items: readonly MediaAnalysisItem[]): MediaAggregation {
  const ordered = [...items].sort((left, right) => left.ordinal - right.ordinal);
  const products = new Map<string, StableProductDocument>();
  for (const item of ordered) {
    if (!item.product) continue;
    const key = normalizeProductCode(item.product.productId);
    if (!products.has(key)) products.set(key, item.product);
  }
  const uncertainCount = ordered.filter((item) => item.status !== "MATCHED").length;
  const totalCount = ordered.length;
  const uncertainRatio = totalCount === 0 ? 0 : uncertainCount / totalCount;
  return {
    items: ordered,
    products: [...products.values()],
    uncertainCount,
    totalCount,
    uncertainRatio,
    requiresHandoff: totalCount > 0 && uncertainRatio > 0.2,
  };
}

export function selectedProductId(
  customerText: string,
  selections: readonly { readonly label: string; readonly productId: string }[],
): string | null {
  const match = customerText.match(/\bset\s*([1-9]|10)\b/iu);
  if (!match) return null;
  const label = `SET_${match[1]}`;
  return selections.find((item) => item.label === label)?.productId ?? null;
}
