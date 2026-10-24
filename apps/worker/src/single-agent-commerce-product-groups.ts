import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { normalizeCatalogToken, selectVerifiedSizeChart, type StableProductDocument, type SizeRecommendationTarget } from "@lana/business-tools";
import type { ProductComponentRole } from "@lana/contracts";
import { sizeChartTarget } from "./size-chart-target.js";
import { evaluateSizeChartEligibility } from "./size-chart-eligibility.js";

/** Explicit owner-approved data, not inferred from similar catalog titles. */
export interface CommerceProductGroup {
  name: string; customerNames: readonly string[]; productTitles: Readonly<Record<string, string>>;
  approvalRef: string;
  sharedSize: { artifactKey: string; sourceProductId: string; brand: string; category: string; componentRole: ProductComponentRole };
}
export function commerceProductGroup(productId: string, title: string, groups: readonly CommerceProductGroup[]) {
  const matches = groups.filter(g => Object.hasOwn(g.productTitles, productId) &&
    normalizeCatalogToken(g.productTitles[productId]!) === normalizeCatalogToken(title));
  return matches.length === 1 ? matches[0] : undefined;
}

/** Keep the published chart immutable. An explicit owner delegation extends
 * applicability to members; price, stock and media identities never merge. */
export function commerceSizeSource(product: StableProductDocument, policy: RuntimePolicyResolution,
  groups: readonly CommerceProductGroup[] = []) {
  const group = commerceProductGroup(product.productId, product.title, groups), shared = group?.sharedSize;
  const fallback = () => { const target = sizeChartTarget(product); return { target,
    charts: evaluateSizeChartEligibility({ policy, productId: product.productId, target }).charts }; };
  if (!group || !shared || !Object.hasOwn(group.productTitles, shared.sourceProductId)) return fallback();
  const artifact = policy.bundle?.artifacts.sizeCharts[shared.artifactKey];
  if (!artifact || artifact.chart.brand !== shared.brand || artifact.chart.category !== shared.category ||
    artifact.chart.componentRole !== shared.componentRole) return fallback();
  const target: SizeRecommendationTarget = { brand: shared.brand, category: shared.category, componentRole: shared.componentRole,
    parentProductId: shared.sourceProductId, componentProductId: shared.sourceProductId, form: product.silhouettes[0] ?? null, material: product.materials[0] ?? null };
  const eligible = evaluateSizeChartEligibility({ policy, productId: shared.sourceProductId, target });
  const sourceCharts = eligible.charts.filter(c => c.chart.reference.chartId === artifact.chart.reference.chartId &&
    c.chart.reference.version === artifact.chart.reference.version);
  // Eligibility returns all BODY charts, not just the matching chart. The
  // configured source itself must match; another eligible chart cannot vouch for it.
  if (!selectVerifiedSizeChart(sourceCharts, target)) return fallback();
  return { target: { ...target, parentProductId: product.productId, componentProductId: product.productId },
    charts: sourceCharts.map(c => ({ chart: c.chart, scope: { ...c.scope, parentProductIds: Object.keys(group.productTitles) } })) };
}
