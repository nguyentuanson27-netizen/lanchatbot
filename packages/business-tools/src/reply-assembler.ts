import type {
  BusinessFactEnvelopeV1,
  GroundedReplyDraftV1,
} from "@lana/contracts";
import type { StableProductDocument } from "./types.js";

export type VerifiedFactBlockKind = "PRICE" | "STOCK" | "SIZE" | "ETA";
export type VerifiedFactIntent = "NONE" | VerifiedFactBlockKind;

export interface VerifiedFactBlock {
  readonly kind: VerifiedFactBlockKind;
  readonly productId: string;
  readonly text: string;
  readonly sourceField: string;
  readonly sourceVersion: string;
}

export interface VerifiedFactBlockResult {
  readonly blocks: readonly VerifiedFactBlock[];
  readonly reasonCodes: readonly string[];
}

export interface GroundedReplyAssembly {
  readonly text: string;
  readonly imageUrls: readonly string[];
  readonly reasonCodes: readonly string[];
}

function shortPrice(value: number): string {
  return value % 1_000 === 0
    ? `${value / 1_000}k`
    : `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function productName(product: StableProductDocument): string {
  const title = product.title.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
  return title || `mẫu ${product.productId}`;
}

function sourceVersion(facts: BusinessFactEnvelopeV1): string {
  return `${facts.source}:${facts.observedAt}`;
}

export function buildVerifiedFactBlocks(
  facts: BusinessFactEnvelopeV1,
  intent: VerifiedFactIntent,
  product: StableProductDocument,
): VerifiedFactBlockResult {
  if (facts.status !== "OK" || facts.facts === null) {
    return { blocks: [], reasonCodes: ["VERIFIED_FACTS_UNAVAILABLE"] };
  }
  if (
    facts.productId !== product.productId ||
    facts.facts.productId !== product.productId
  ) {
    return { blocks: [], reasonCodes: ["CROSS_PRODUCT_FACT_BLOCKED"] };
  }
  const blocks: VerifiedFactBlock[] = [];
  const version = sourceVersion(facts);
  const add = (
    kind: VerifiedFactBlockKind,
    text: string,
    sourceField: string,
  ): void => {
    blocks.push({ kind, productId: product.productId, text, sourceField, sourceVersion: version });
  };

  if (intent === "PRICE") {
    const price = facts.facts.salePriceVnd ?? facts.facts.listPriceVnd;
    if (price !== null) {
      add("PRICE", `Dạ ${productName(product)} có giá ${shortPrice(price)} ạ`,
        facts.facts.salePriceVnd !== null ? "facts.salePriceVnd" : "facts.listPriceVnd");
    }
  }
  if (intent === "STOCK") {
    const statusText = {
      IN_STOCK: "Sản phẩm đang có hàng",
      LOW_STOCK: "Sản phẩm còn ít hàng",
      OUT_OF_STOCK: "Sản phẩm hiện hết hàng",
      PRE_ORDER: "Sản phẩm nhận đặt trước",
      COMING_SOON: "Sản phẩm đang sắp về",
      UNKNOWN: "Tình trạng hàng đang cập nhật",
    }[facts.facts.stockStatus];
    add("STOCK", statusText, "facts.stockStatus");
  }
  if (intent === "SIZE" && facts.facts.sizes.length > 0) {
    add("SIZE", `Size đang có: ${facts.facts.sizes.join(", ")}`, "facts.sizes");
  }
  if (intent === "ETA" && facts.facts.deliveryEta !== null) {
    const { minDays, maxDays } = facts.facts.deliveryEta;
    add(
      "ETA",
      minDays === maxDays
        ? `Thời gian giao dự kiến ${minDays} ngày`
        : `Thời gian giao dự kiến ${minDays}-${maxDays} ngày`,
      "facts.deliveryEta",
    );
  }
  return {
    blocks,
    reasonCodes: blocks.length > 0 ? [] : ["REQUESTED_FACT_BLOCK_UNAVAILABLE"],
  };
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

const MONEY = /(?:\d[\d.,]*)\s*(?:k\b|nghin\b|vnd\b|trieu\b|₫)/iu;
const DONG_MONEY = /(?:\d[\d.,]*)\s*đ/iu;
const STOCK = /(?:con\s+\d+|con\s+hang|het\s+hang|san\s+hang|pre[- ]?order|sap\s+ve)/iu;
const SIZE = /(?:size|sz)\s*(?:s|m|l|xl)(?:\s|,|\/|$)/iu;
const ETA = /\d+\s*(?:-|den)?\s*\d*\s*(?:ngay|day)\b/iu;
const URL = /https?:\/\/\S+/iu;

function catalogText(product: StableProductDocument): string {
  return normalized([
    product.title,
    product.descriptionXml ?? "",
    ...product.materials,
    ...product.silhouettes,
    ...product.occasions,
  ].join(" "));
}

export function validateAdvisoryAgainstFacts(
  advisory: string,
  product: StableProductDocument,
): { readonly accepted: boolean; readonly reasonCodes: readonly string[] } {
  const text = normalized(advisory);
  if (!text) return { accepted: true, reasonCodes: [] };
  const reasons = new Set<string>();
  if (URL.test(text)) reasons.add("MODEL_URL_IN_ADVISORY");
  if (
    MONEY.test(text) ||
    DONG_MONEY.test(advisory) ||
    STOCK.test(text) ||
    SIZE.test(text) ||
    ETA.test(text)
  ) {
    reasons.add("MODEL_FACT_IN_ADVISORY");
  }
  const catalog = catalogText(product);
  for (const match of text.matchAll(/\b\d+[a-z]*\b/giu)) {
    const token = match[0];
    if (!catalog.includes(token)) reasons.add("MODEL_FACT_IN_ADVISORY");
  }
  return { accepted: reasons.size === 0, reasonCodes: [...reasons].sort() };
}

export function assembleReply(
  factResult: VerifiedFactBlockResult,
  draft: GroundedReplyDraftV1,
  facts: BusinessFactEnvelopeV1,
  product: StableProductDocument,
): GroundedReplyAssembly {
  const reasonCodes = new Set(factResult.reasonCodes);
  const advisoryParts = [
    draft.advisoryText,
    draft.objectionResponse,
    draft.suggestedQuestion,
    draft.suggestedNextStep,
  ];
  const safeAdvisory: string[] = [];
  for (const part of advisoryParts) {
    const value = part.trim();
    if (!value) continue;
    const validation = validateAdvisoryAgainstFacts(value, product);
    validation.reasonCodes.forEach((reason) => reasonCodes.add(reason));
    if (validation.accepted && !safeAdvisory.includes(value)) safeAdvisory.push(value);
  }

  const verifiedImages = facts.status === "OK" && facts.facts !== null &&
      facts.productId === product.productId
    ? facts.facts.imageUrls
    : [];
  const images: string[] = [];
  for (const index of draft.attachmentImageIndices) {
    const image = verifiedImages[index];
    if (!image) {
      reasonCodes.add("GROUNDED_IMAGE_INDEX_OUT_OF_RANGE");
      continue;
    }
    if (!images.includes(image)) images.push(image);
  }
  const lines = [
    ...factResult.blocks.map((block) => block.text),
    ...safeAdvisory,
  ];
  return {
    text: lines.join("\n"),
    imageUrls: images,
    reasonCodes: [...reasonCodes].sort(),
  };
}
