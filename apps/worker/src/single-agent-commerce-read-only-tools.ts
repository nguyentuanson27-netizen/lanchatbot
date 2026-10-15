import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { ProductContentV1Schema } from "@lana/contracts";
import { buildProtectedClaimsFromVerifiedFactsV1, buildProductPresentationEvidenceV1, CatalogSnapshotV3Schema,
  resolveCatalogFacts, verifyProductAttributesV1, normalizeCatalogToken,
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
  readProduct(productId: string, readPos?: boolean): Promise<{ product: StableProductDocument; snapshot: CatalogSnapshotV3 | null }>;
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
  const deliveryContexts = new Map<string, TrustedContext["policyLiterals"][number]>();
  const offerContexts = new Map<string, TrustedContext["policyLiterals"][number]>();
  const reads = new Map<string, Record<string, unknown>>();
  const searchReads = new Set<string>();
  const bind = (p: StableProductDocument) => {
    if (!subjects.has(p.productId)) subjects.set(p.productId, { ref: p.productId, kind: "PRODUCT", label: p.title, bindingVersion: scope.bindingVersion });
  };
  for (const p of input.initialProducts ?? []) bind(p);
  const snapshot = () => buildReadOnlyContext({ state: input.state?.() ?? { ...scope, currentProductId: null,
    factSnapshotVersion: "", conversationOwner: scope.conversationOwner }, subjects: [...subjects.values()],
    products: [...products.values()], claims: [...claims.values()].flat(), policies: [...policyLiteral, ...deliveryContexts.values(), ...offerContexts.values()] });
  const staticEvidence = (p: StableProductDocument, now: Date): RuntimeProductEvidence => {
    if (p.observedAt && (!Number.isFinite(Date.parse(p.observedAt)) || Date.parse(p.observedAt) > now.getTime())) {
      throw new Error("PRODUCT_SOURCE_FRESHNESS");
    }
    const evidence: RuntimeProductEvidence = { ref: `product:${p.productId}`, subjectRef: p.productId };
    if (p.attributes) {
      const attrs = verifyProductAttributesV1(p.attributes, p.productId);
      if (attrs && attrs.metadata.freshnessState === "FRESH" && Date.parse(attrs.metadata.observedAt) <= now.getTime()) evidence.attributes = attrs;
    }
    if (p.observedAt) evidence.content = ProductContentV1Schema.parse({ productName: p.title,
      description: p.descriptionXml?.trim() || null, productUrl: null, metadata: {
        authority: p.descriptionAuthority ?? "WEBSTORE_XML", sourceVersion: p.descriptionSourceVersion ?? p.catalogVersion,
        observedAt: p.observedAt, expiresAt: null, freshForSeconds: null, freshnessState: "FRESH",
      } });
    return evidence;
  };
  async function readPolicy(): Promise<CommerceToolResult> {
    policy = await input.policy();
    // This candidate reads active pointers; an old cached bundle cannot prove their current identity.
    if (!policy.bundle || policy.status !== "RESOLVED") return { status: "UNAVAILABLE", reason: "POLICY_UNAVAILABLE" };
    policyLiteral = [publicPolicyLiteral(policy.bundle, scope.pageId, scope.shopId, input.clock())];
    policyRead = true;
    return { status: "OK", data: { scope: "SHOP_RULES", orderEligibility: null,
      policy: JSON.parse(policyLiteral[0]!.text), sourceVersion: policyLiteral[0]!.sourceVersion } };
  }
  async function readProduct(args: Record<string, unknown>): Promise<CommerceToolResult> {
    const id = args.subjectRef as string, now = input.clock();
    const source = await input.catalog.readProduct(id), p = source.product;
    const parsed = CatalogSnapshotV3Schema.safeParse(source.snapshot);
    if (p.productId !== id || (p.observedAt && (!Number.isFinite(Date.parse(p.observedAt)) ||
      Date.parse(p.observedAt) > now.getTime())) || (source.snapshot !== null && (!parsed.success || parsed.data.product_id !== id ||
      parsed.data.shop_alias !== scope.shopAlias))) return { status: "STALE", reason: "PRODUCT_SOURCE_SCOPE" };
    const raw = parsed.success ? parsed.data : null;
    const observed = raw ? Date.parse(raw.synced_at) : NaN;
    const expires = observed + maxAge * 1000;
    const availableOffers = raw && observed <= now.getTime() && expires > now.getTime() ? Object.keys(raw.offers).sort() : null;
    offerContexts.delete(id);
    if (availableOffers !== null) offerContexts.set(id, { ref: `offers:${id}`,
      sourceVersion: commerceHash({ releaseId: raw!.release_id, observed, availableOffers }),
      observedAt: raw!.synced_at, expiresAt: new Date(expires).toISOString(),
      text: JSON.stringify({ productId: id, availableOffers }) });
    const query = { shopAlias: scope.shopAlias, productId: id, offerType: (args.offerType as string | undefined) ?? null,
      color: (args.color as string | undefined) ?? null, size: (args.size as string | undefined) ?? null,
      deliveryRegion: (args.deliveryRegion as string | undefined) ?? null };
    const price = raw ? resolveCatalogFacts(raw, { ...query, intent: "PRICE" }, now, maxAge) : null;
    const stock = raw ? resolveCatalogFacts(raw, { ...query, intent: "STOCK" }, now, maxAge) : null;
    const eta = raw && query.deliveryRegion ? resolveCatalogFacts(raw, { ...query, intent: "ETA" }, now, maxAge) : null;
    if (eta?.status === "OK" && eta.expiresAt && raw?.fulfillment_policy?.eta_valid_until.trim()) {
      eta.expiresAt = new Date(Math.min(Date.parse(eta.expiresAt), Date.parse(raw.fulfillment_policy.eta_valid_until))).toISOString();
    }
    const variant = raw ? verifiedVariantFromSnapshot(raw, { shopAlias: scope.shopAlias, productId: id, offerType: query.offerType,
      mentionedSize: query.size, mentionedColor: query.color }, now) : null;
    // An offer-only read is a code-bound selling option, never a selected SKU or a personal fit.
    const offer = (price?.status === "OK" ? price.facts?.offerType : null)
      ?? (stock?.status === "OK" ? stock.facts?.offerType : null) ?? null;
    const variantId = (variant?.resolution === "VERIFIED" ? variant.selectedVariantId : null) ?? (offer ? `offer:${id}:${offer}` : null);
    if (variantId && !subjects.has(variantId) && subjects.size >= 8) return { status: "REJECTED", reason: "SUBJECT_BOUND" };
    const nextClaims = [[price, "PRICE"], [stock, "STOCK"], [eta, "ETA"]].flatMap(([facts, type]) => {
      const result = buildProtectedClaimsFromVerifiedFactsV1({ facts: facts as typeof price, sizeClaim: null, expectedProductId: id });
      return result.claims.filter(c => c.type === type).map(c => ({ ...c, claimId: commerceUuid(commerceHash({ originalClaimId: c.claimId, variantId })),
        scope: c.scope.kind === "PRODUCT" ? { ...c.scope, variantId } : c.scope }));
    });
    const evidence = staticEvidence(p, now);
    const full = raw ? buildRealtimeProductFactsV2({ snapshot: raw, product: p, policy, now }) : null;
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
    const readKey = commerceHash({ id, offerType: query.offerType, color: query.color, size: query.size, deliveryRegion: query.deliveryRegion });
    // Preserve filters whose meaning is lost in an offer-only fact scope, including regional ETA.
    deliveryContexts.delete(readKey);
    const etaClaim = nextClaims.find(c => c.type === "ETA");
    const stockClaim = nextClaims.find(c => c.type === "STOCK"), priceClaim = nextClaims.find(c => c.type === "PRICE");
    const filteredClaim = etaClaim ?? ((query.size || query.color) ? stockClaim ?? priceClaim : undefined);
    if (filteredClaim && raw) deliveryContexts.set(readKey, { ref: `read:${readKey}`, sourceVersion: raw.release_id,
      observedAt: filteredClaim.provenance.observedAt, expiresAt: filteredClaim.provenance.expiresAt,
      text: JSON.stringify({ productId: id, variantId, offerType: offer, size: query.size, color: query.color,
        priceClaimId: priceClaim?.claimId ?? null, stockClaimId: stockClaim?.claimId ?? null,
        ...(etaClaim ? { deliveryRegion: Object.keys(raw.shipping_eta).find(r =>
          normalizeCatalogToken(r) === normalizeCatalogToken(query.deliveryRegion ?? "")), etaClaimId: etaClaim.claimId } : {}) }) });
    claims.set(readKey, nextClaims);
    reads.set(readKey, structuredClone(args));
    return { status: "OK", data: { subjectRef: id, label: p.title, variantId, offerType: offer, requestedOfferType: query.offerType,
      availableOffers,
      attributes: evidence.attributes ?? null, sizeCharts: charts,
      content: evidence.content ?? null,
      facts: nextClaims.map(c => ({ type: c.type, scope: c.scope, value: c.value })),
      availability: {
        price: { status: price?.status ?? "UNAVAILABLE", reason: price?.reasonCode ?? (price ? null : "POS_SNAPSHOT_UNAVAILABLE") },
        stock: { status: stock?.status ?? "UNAVAILABLE", reason: stock?.reasonCode ?? (stock ? null : "POS_SNAPSHOT_UNAVAILABLE") },
        ...(query.deliveryRegion ? { eta: { status: eta?.status ?? "UNAVAILABLE", reason: eta?.reasonCode ?? (eta ? null : "POS_SNAPSHOT_UNAVAILABLE") } } : {}),
      },
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
        const evidence = candidates.map(p => staticEvidence(p, input.clock()));
        for (const p of evidence) {
          searchReads.add(p.subjectRef);
          // Search must not replace a fuller, already verified product read.
          if (!products.has(p.subjectRef) && (p.attributes || p.content)) products.set(p.subjectRef, p);
        }
        return { status: "OK", data: { status: found.status, subjects: candidates.map(p => subjects.get(p.productId)),
          products: evidence.map(p => products.get(p.subjectRef) ?? p) } };
      }
      if (call.name === "read_product") {
        const a = toolArgs(call.args, ["subjectRef", "offerType", "color", "size", "deliveryRegion"]);
        if (!a || !text(a.subjectRef, 128) || subjects.get(a.subjectRef)?.kind !== "PRODUCT" ||
          (a.offerType !== undefined && !text(a.offerType, 64)) || (a.color !== undefined && !text(a.color, 64)) ||
          (a.size !== undefined && !text(a.size, 16)) || (a.deliveryRegion !== undefined && !text(a.deliveryRegion, 64))) return { status: "REJECTED", reason: "TOOL_ARGUMENTS_OR_REF" };
        return await readProduct(a);
      }
      return { status: "REJECTED", reason: "UNKNOWN_TOOL" };
    } catch { return { status: "UNAVAILABLE", reason: "SOURCE_ERROR" }; }
  }
  return { invoke, snapshot, invokeBatch: (calls: CommerceToolCall[]) => Promise.all(calls.map(invoke)), async readback() {
    if (policyRead && (await readPolicy()).status !== "OK") throw new Error("POLICY_READBACK_UNAVAILABLE");
    const fullReads = new Set([...reads.values()].map(a => a.subjectRef));
    for (const id of searchReads) if (!fullReads.has(id)) {
      const {product} = await input.catalog.readProduct(id, false);
      if (product.productId !== id) throw new Error("PRODUCT_SOURCE_CHANGED");
      const evidence = staticEvidence(product, input.clock());
      products.delete(id);
      if (evidence.attributes || evidence.content) products.set(id, evidence);
      subjects.set(id, {...subjects.get(id)!, label:product.title});
    }
    for (const [ref, subject] of subjects) if (subject.kind === "VARIANT") subjects.delete(ref);
    for (const a of reads.values()) if ((await readProduct(a)).status !== "OK") throw new Error("PRODUCT_READBACK_UNAVAILABLE");
    return snapshot();
  } };
}
