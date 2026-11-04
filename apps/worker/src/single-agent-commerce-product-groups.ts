import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { normalizeCatalogToken, selectVerifiedSizeChart,CatalogSnapshotV3Schema, type StableProductDocument, type SizeRecommendationTarget } from "@lana/business-tools";
import type { ProductComponentRole } from "@lana/contracts";
import { sizeChartTarget } from "./size-chart-target.js";
import { evaluateSizeChartEligibility } from "./size-chart-eligibility.js";
import {catalogComponentRole} from "./realtime-sales-catalog.js";
import {commerceHash} from "./single-agent-commerce-read-only-context.js";

/** Explicit owner-approved data, not inferred from similar catalog titles. */
export interface CommerceProductGroup {
  name: string; customerNames: readonly string[]; productTitles: Readonly<Record<string, string>>;
  approvalRef: string;
  sharedSize: { artifactKey: string; sourceProductId: string; brand: string; category: string; componentRole: ProductComponentRole;
    componentRoles?:readonly ProductComponentRole[];componentApprovalRef?:string;componentSourceBrand?:string };
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

/** A unique current BOM component is required. Optional sharing is explicit owner configuration, never inferred from names. */
export function commerceComponentSizeSource(product:StableProductDocument,raw:unknown,policy:RuntimePolicyResolution,
 componentRole:ProductComponentRole,now:Date,maxAgeSeconds=1200,groups:readonly CommerceProductGroup[]=[]){
 const s=CatalogSnapshotV3Schema.parse(raw),at=now.getTime(),observed=Date.parse(s.synced_at);
 if(!Number.isInteger(maxAgeSeconds)||maxAgeSeconds<60||maxAgeSeconds>86400||s.product_id!==product.productId||!Number.isFinite(at)||observed>at||observed+maxAgeSeconds*1000<=at||
   !["OK","FULFILLMENT_POLICY_NOT_FOUND"].includes(normalizeCatalogToken(s.data_status)))throw Error("COMPONENT_SOURCE_UNAVAILABLE");
 const refs=new Set<string>();
 for(const offer of Object.values(s.offers)){
   if(offer.rows.length>64)throw Error("COMPONENT_SOURCE_BOUND");
   for(const row of offer.rows){
     const components=Array.isArray(row.components)&&row.components.length?row.components:
       [row.component_1_sku,row.component_2_sku].filter(v=>typeof v==="string"&&v.trim()).map(product_sku=>({product_sku}));
     if(components.length>3)throw Error("COMPONENT_SOURCE_BOUND");
     for(const c of components){const v=c as Record<string,unknown>,ref=[v.product_sku,v.variation_sku,v.component_id].find(x=>typeof x==="string"&&x.trim());
       if(typeof ref!=="string"||Buffer.byteLength(ref)>128)throw Error("COMPONENT_SOURCE_UNAVAILABLE");
       if(catalogComponentRole(ref)===componentRole)refs.add(ref);
     }
   }
 }
 if(refs.size!==1)throw Error("COMPONENT_SOURCE_UNAVAILABLE");
 const componentProductId=[...refs][0]!;
 const artifacts=Object.values(policy.bundle?.artifacts.sizeCharts??{}).filter(a=>a.scope?.level==="COMPONENT"&&
   a.scope.componentRole===componentRole&&a.chart.componentRole===componentRole&&normalizeCatalogToken(a.chart.brand)===normalizeCatalogToken(s.brand)&&a.scope.parentProductIds.includes(product.productId));
 const eligible=artifacts.flatMap(a=>{
   const target:SizeRecommendationTarget={brand:a.chart.brand,category:a.chart.category,componentRole,parentProductId:product.productId,
     componentProductId,form:product.silhouettes[0]??null,material:product.materials[0]??null};
   const charts=evaluateSizeChartEligibility({policy,productId:product.productId,target}).charts.filter(c=>
     c.chart.reference.chartId===a.chart.reference.chartId&&c.chart.reference.version===a.chart.reference.version);
   return selectVerifiedSizeChart(charts,target)?[{target,charts}]:[];
 });
 let delegation:unknown=null;
 if(!eligible.length){
   const group=commerceProductGroup(product.productId,product.title,groups),shared=group?.sharedSize;
   if(shared?.componentApprovalRef?.trim()&&shared.componentRoles?.includes(componentRole)&&
      normalizeCatalogToken(shared.componentSourceBrand??shared.brand)===normalizeCatalogToken(s.brand)){
     const source=commerceSizeSource(product,policy,groups);
     const artifact=policy.bundle?.artifacts.sizeCharts[shared.artifactKey];
     const originalTarget={...source.target,parentProductId:shared.sourceProductId,componentProductId:shared.sourceProductId};
     const original=artifact?evaluateSizeChartEligibility({policy,productId:shared.sourceProductId,target:originalTarget}).charts.filter(c=>
       c.chart.reference.chartId===artifact.chart.reference.chartId&&c.chart.reference.version===artifact.chart.reference.version):[];
     const target:SizeRecommendationTarget={...source.target,componentProductId,componentRole};
     const charts=source.charts.map(c=>({chart:{...c.chart,componentRole},scope:{...c.scope,level:"COMPONENT" as const,
       parentProductIds:[product.productId],componentRole}}));
     if(artifact&&Object.hasOwn(group!.productTitles,shared.sourceProductId)&&artifact.chart.brand===shared.brand&&
       artifact.chart.category===shared.category&&artifact.chart.componentRole===shared.componentRole&&
       selectVerifiedSizeChart(original,originalTarget)&&charts.length===1&&
       charts[0]!.chart.reference.chartId===artifact.chart.reference.chartId&&charts[0]!.chart.reference.version===artifact.chart.reference.version&&
       selectVerifiedSizeChart(charts,target)){
       eligible.push({target,charts});
       delegation={approvalRef:shared.componentApprovalRef,sourceProductId:shared.sourceProductId,artifactKey:shared.artifactKey,componentRole};
     }
   }
 }
 if(eligible.length!==1)throw Error("COMPONENT_CHART_UNAVAILABLE");
 const source=eligible[0]!,fitTarget={kind:"COMPONENT" as const,parentProductId:product.productId,componentProductId,componentRole};
 const {synced_at:_heartbeat,...content}=s;
 return {...source,fitTarget,sourceBindingHash:commerceHash({bom:content,fitTarget,charts:source.charts,...(delegation?{delegation}:{})}),
   sourceExpiresAt:new Date(Math.min(observed+maxAgeSeconds*1000,policy.bundle?.policy?.effectiveUntil?Date.parse(policy.bundle.policy.effectiveUntil):Infinity)).toISOString()};
}
