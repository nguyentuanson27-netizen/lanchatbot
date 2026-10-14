import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { ProductContentV1Schema } from "@lana/contracts";
import { buildProtectedClaimsFromVerifiedFactsV1, buildProductPresentationEvidenceV1, CatalogSnapshotV3Schema,
  resolveCatalogFacts, verifyProductAttributesV1,
  type ProductSearchResult, type StableProductDocument, type CatalogSnapshotV3 } from "@lana/business-tools";
import { buildReadOnlyContext, commerceHash, commerceUuid, publicPolicyLiteral } from "./single-agent-commerce-read-only-context.js";
import type { RuntimeProductEvidence, TrustedContext } from "./single-agent-semantic-verifier-boundary.js";
import { buildRealtimeProductFactsV2 } from "./realtime-product-facts-v2.js";
import { verifiedVariantFromSnapshot } from "./realtime-sales-catalog.js";

export interface CommerceScope {
  pageId: string; shopId: string; shopAlias: string; conversationId: string; customerHash: string;
  sourceMessageId: string; sourceObservedAt: string; requestId: string; recipient: string; bindingVersion: string; revision: number;
  conversationOwner: string; permission: boolean; privacyAllowed: boolean;
}
export interface ReadOnlyCatalog {
  searchText(query: string): Promise<ProductSearchResult>;
  readProduct(productId: string): Promise<{ product: StableProductDocument; snapshot: CatalogSnapshotV3 | null }>;
}
export interface CommerceToolCall { name: string; args: unknown; id?: string }
export interface CommerceToolResult { status: "OK" | "REJECTED" | "UNAVAILABLE" | "STALE"; data?: unknown; reason?: string }
export function toolArgs(value: unknown, fields: readonly string[]): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every(k => fields.includes(k)) ? value as Record<string, unknown> : null;
}
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && Buffer.byteLength(v) <= max;

export function createReadOnlyTools(input: {
  scope: CommerceScope; clock: () => Date; policy: () => Promise<RuntimePolicyResolution>; catalog: ReadOnlyCatalog;
  initialProducts?: StableProductDocument[]; state?: () => TrustedContext["state"];
  maxFactAgeSeconds?: number;
}) {
  const { scope } = input;
  const maxAge = input.maxFactAgeSeconds ?? 1200;
  if (!Number.isInteger(maxAge) || maxAge < 60 || maxAge > 86400) throw new Error("FACT_FRESHNESS_BOUND");
  const subjects = new Map<string, TrustedContext["boundSubjects"][number]>();
  const products = new Map<string, RuntimeProductEvidence>();
  const claims = new Map<string, unknown[]>();
  let policy: RuntimePolicyResolution | null = null;
  let policyLiteral: TrustedContext["policyLiterals"] = [];
  let policyRead = false;
  const reads = new Map<string, Record<string, unknown>>();
  const bind = (p: StableProductDocument) => {
    if (!subjects.has(p.productId)) subjects.set(p.productId, { ref: p.productId, kind: "PRODUCT", label: p.title, bindingVersion: scope.bindingVersion });
  };
  for (const p of input.initialProducts ?? []) bind(p);
  const snapshot = () => buildReadOnlyContext({ state: input.state?.() ?? { ...scope, currentProductId: null,
    factSnapshotVersion: "", conversationOwner: scope.conversationOwner }, subjects: [...subjects.values()],
    products: [...products.values()], claims: [...claims.values()].flat(), policies: policyLiteral });
  async function readPolicy(): Promise<CommerceToolResult> {
    policy = await input.policy();
    // This candidate reads active pointers; an old cached bundle cannot prove their current identity.
    if (!policy.bundle || policy.status !== "RESOLVED") return { status: "UNAVAILABLE", reason: "POLICY_UNAVAILABLE" };
    policyLiteral = [publicPolicyLiteral(policy.bundle, scope.pageId, scope.shopId, input.clock())];
    policyRead = true;
    return { status: "OK", data: { policy: JSON.parse(policyLiteral[0]!.text), sourceVersion: policyLiteral[0]!.sourceVersion } };
  }
  async function readProduct(args: Record<string, unknown>): Promise<CommerceToolResult> {
    const id = args.subjectRef as string, now = input.clock();
    const source = await input.catalog.readProduct(id), p = source.product;
    const parsed = CatalogSnapshotV3Schema.safeParse(source.snapshot);
    if (p.productId !== id || (p.observedAt && (!Number.isFinite(Date.parse(p.observedAt)) ||
      Date.parse(p.observedAt) > now.getTime())) || (source.snapshot !== null && (!parsed.success || parsed.data.product_id !== id ||
      parsed.data.shop_alias !== scope.shopAlias))) return { status: "STALE", reason: "PRODUCT_SOURCE_SCOPE" };
    const raw = parsed.success ? parsed.data : null;
    const query = { shopAlias: scope.shopAlias, productId: id, offerType: (args.offerType as string | undefined) ?? null,
      color: (args.color as string | undefined) ?? null, size: (args.size as string | undefined) ?? null, deliveryRegion: null };
    const price = raw ? resolveCatalogFacts(raw, { ...query, intent: "PRICE" }, now, maxAge) : null;
    const stock = raw ? resolveCatalogFacts(raw, { ...query, intent: "STOCK" }, now, maxAge) : null;
    const variant = raw ? verifiedVariantFromSnapshot(raw, { shopAlias: scope.shopAlias, productId: id, offerType: query.offerType,
      mentionedSize: query.size, mentionedColor: query.color }, now) : null;
    // An offer-only read is a code-bound selling option, never a selected SKU or a personal fit.
    const offer = query.offerType && raw?.offers[query.offerType] ? query.offerType : null;
    const variantId = (variant?.resolution === "VERIFIED" ? variant.selectedVariantId : null) ?? (offer ? `offer:${id}:${offer}` : null);
    if (variantId && !subjects.has(variantId) && subjects.size >= 8) return { status: "REJECTED", reason: "SUBJECT_BOUND" };
    const nextClaims = [[price, "PRICE"], [stock, "STOCK"]].flatMap(([facts, type]) => {
      const result = buildProtectedClaimsFromVerifiedFactsV1({ facts: facts as typeof price, sizeClaim: null, expectedProductId: id });
      return result.claims.filter(c => c.type === type).map(c => ({ ...c, claimId: commerceUuid(commerceHash({ originalClaimId: c.claimId, variantId })),
        scope: c.scope.kind === "PRODUCT" ? { ...c.scope, variantId } : c.scope }));
    });
    const evidence: RuntimeProductEvidence = { ref: `product:${id}`, subjectRef: id };
    if (p.attributes) {
      const attrs = verifyProductAttributesV1(p.attributes, id);
      if (attrs && attrs.metadata.freshnessState === "FRESH" && Date.parse(attrs.metadata.observedAt) <= now.getTime()) evidence.attributes = attrs;
    }
    const full = raw ? buildRealtimeProductFactsV2({ snapshot: raw, product: p, policy, now }) : null;
    if (p.observedAt) evidence.content = ProductContentV1Schema.parse({ productName: p.title,
      description: p.descriptionXml?.trim() || null, productUrl: null, metadata: {
        authority: p.descriptionAuthority ?? "WEBSTORE_XML", sourceVersion: p.descriptionSourceVersion ?? p.catalogVersion,
        observedAt: p.observedAt, expiresAt: null, freshForSeconds: null, freshnessState: "FRESH",
      } });
    const presentation = p.observedAt && full ? buildProductPresentationEvidenceV1(full, now) : null;
    if (presentation) evidence.presentation = presentation;
    const charts = Object.values(policy?.bundle?.artifacts.sizeCharts ?? {}).filter(a =>
      a.chart.reference.verificationStatus === "VERIFIED" &&
      (a.scope?.parentProductIds.includes(id) || a.scope?.level === "GLOBAL")).map(a => a.chart);
    if (charts.length) evidence.sizeCharts = charts;
    products.delete(id);
    if (evidence.attributes || evidence.presentation || evidence.content || evidence.sizeCharts?.length) products.set(id, evidence);
    subjects.set(id, { ...subjects.get(id)!, label: p.title, variantId: null });
    if (variantId) subjects.set(variantId, { ref: variantId, kind: "VARIANT", productId: id,
      label: `${p.title} ${offer ?? ""} ${variant?.selectedColorLabel ?? ""} ${variant?.selectedSizeCode ?? ""}`.trim(), bindingVersion: scope.bindingVersion });
    const readKey = commerceHash({ id, offerType: query.offerType, color: query.color, size: query.size });
    claims.set(readKey, nextClaims);
    reads.set(readKey, structuredClone(args));
    return { status: "OK", data: { subjectRef: id, label: p.title, variantId, offerType: query.offerType, availableOffers: Object.keys(raw?.offers ?? {}),
      attributes: evidence.attributes ?? null, sizeCharts: charts,
      content: evidence.content ?? null,
      facts: nextClaims.map(c => ({ type: c.type, scope: c.scope, value: c.value })),
      missing: [...(price?.status === "OK" ? [] : ["PRICE"]), ...(stock?.status === "OK" ? [] : ["STOCK"]),
        ...(evidence.attributes ? [] : ["ATTRIBUTES"])] } };
  }
  async function invoke(call: CommerceToolCall): Promise<CommerceToolResult> {
    if (!scope.permission || !scope.privacyAllowed || scope.conversationOwner !== "BOT") return { status: "REJECTED", reason: "PERMISSION" };
    try {
      if (call.name === "read_policy") {
        if (!toolArgs(call.args, [])) return { status: "REJECTED", reason: "TOOL_ARGUMENTS" };
        return await readPolicy();
      }
      if (call.name === "search_products") {
        const a = toolArgs(call.args, ["query"]);
        if (!a || !text(a.query, 512)) return { status: "REJECTED", reason: "TOOL_ARGUMENTS" };
        const found = await input.catalog.searchText(a.query);
        const candidates = found.status === "MATCHED" ? [found.product] : found.status === "AMBIGUOUS" ? found.candidates.map(c => c.document) : [];
        if (subjects.size + candidates.filter(p => !subjects.has(p.productId)).length > 8) return { status: "REJECTED", reason: "SUBJECT_BOUND" };
        candidates.forEach(bind);
        return { status: "OK", data: { status: found.status, subjects: candidates.map(p => subjects.get(p.productId)) } };
      }
      if (call.name === "read_product") {
        const a = toolArgs(call.args, ["subjectRef", "offerType", "color", "size"]);
        if (!a || !text(a.subjectRef, 128) || subjects.get(a.subjectRef)?.kind !== "PRODUCT" ||
          (a.offerType !== undefined && !text(a.offerType, 64)) || (a.color !== undefined && !text(a.color, 64)) || (a.size !== undefined && !text(a.size, 16))) return { status: "REJECTED", reason: "TOOL_ARGUMENTS_OR_REF" };
        return await readProduct(a);
      }
      return { status: "REJECTED", reason: "UNKNOWN_TOOL" };
    } catch { return { status: "UNAVAILABLE", reason: "SOURCE_ERROR" }; }
  }
  return { invoke, snapshot, invokeBatch: (calls: CommerceToolCall[]) => Promise.all(calls.map(invoke)), async readback() {
    if (policyRead && (await readPolicy()).status !== "OK") throw new Error("POLICY_READBACK_UNAVAILABLE");
    for (const [ref, subject] of subjects) if (subject.kind === "VARIANT") subjects.delete(ref);
    for (const a of reads.values()) if ((await readProduct(a)).status !== "OK") throw new Error("PRODUCT_READBACK_UNAVAILABLE");
    return snapshot();
  } };
}
