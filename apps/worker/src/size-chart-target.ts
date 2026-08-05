import type {
  SizeRecommendationTarget,
  StableProductDocument,
} from "@lana/business-tools";
import type { ProductComponentRole } from "@lana/contracts";

function normalizedVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .toLowerCase();
}

function productComponentRole(product: StableProductDocument): ProductComponentRole {
  const value = normalizedVietnamese(`${product.title} ${product.canonicalCode}`);
  if (/\b(?:chan\s*vay|cv)\b/u.test(value)) return "SKIRT";
  if (/\bquan\b/u.test(value)) return "PANTS";
  if (/\b(?:vay|dam|ao\s*dai)\b/u.test(value)) return "DRESS";
  if (/\b(?:ao\s*khoac|jacket)\b/u.test(value)) return "JACKET";
  if (/\bao\b/u.test(value)) return "TOP";
  return "OTHER";
}

function productCategory(product: StableProductDocument): string {
  const value = normalizedVietnamese(product.title);
  if (/\bao\s*dai\b/u.test(value)) return "AO_DAI";
  if (/\bchan\s*vay\b/u.test(value)) return "CHAN_VAY";
  if (/\bquan\b/u.test(value)) return "QUAN";
  if (/\b(?:vay|dam)\b/u.test(value)) return "VAY";
  if (/\bset\b/u.test(value)) return "SET";
  if (/\bao\b/u.test(value)) return "AO";
  return "ALL";
}

/** Derives a Size Engine scope target from stable catalog facts only. */
export function sizeChartTarget(product: StableProductDocument): SizeRecommendationTarget {
  return {
    brand: "LANA",
    parentProductId: product.productId,
    componentProductId: product.productId,
    componentRole: productComponentRole(product),
    category: productCategory(product),
    form: product.silhouettes[0] ?? null,
    material: product.materials[0] ?? null,
  };
}