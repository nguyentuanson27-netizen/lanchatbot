import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { ProductContentV1Schema, type ProtectedClaimV1 } from "@lana/contracts";
import { buildVerifiedFactBlocks, buildProtectedClaimsFromVerifiedFactsV1, buildProductPresentationEvidenceV1, CatalogSnapshotV3Schema,
  resolveCatalogFacts, verifyProductAttributesV1, normalizeCatalogToken, normalizeProductCode,
  type ProductSearchResult, type StableProductDocument, type CatalogSnapshotV3 } from "@lana/business-tools";
import { buildReadOnlyContext, commerceHash, commerceUuid, publicPolicyLiteral } from "./single-agent-commerce-read-only-context.js";
import { MAX_RUNTIME_PRODUCTS, type RuntimeProductEvidence, type TrustedContext } from "./single-agent-semantic-verifier-boundary.js";
import { buildRealtimeProductFactsV2 } from "./realtime-product-facts-v2.js";
import { resolveCatalogDeliveryRegion, verifiedVariantFromSnapshot,candidateCartOptions } from "./realtime-sales-catalog.js";
import type { CommerceProductGroup } from "./single-agent-commerce-product-groups.js";

export interface CommerceScope {
  pageId: string; shopId: string; shopAlias: string; conversationId: string; customerHash: string;
  sourceMessageId: string; sourceObservedAt: string; requestId: string; recipient: string; bindingVersion: string; revision: number;
  conversationOwner: string; permission: boolean; privacyAllowed: boolean;
}
export interface ReadOnlyCatalog {
  searchText(query: string): Promise<ProductSearchResult>;
  /** Ingress-only resolution of a code supplied by the customer/ad; never a callable model tool. */
  resolveProductCode?(code: string): Promise<StableProductDocument | null>;
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
  entry?: { firstContact: boolean | null; fromAd: boolean };
  productGroups?: readonly CommerceProductGroup[];
  onMediaColor?(id:string,color:string):void;
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
  const offerPins = new Map<string, { identity: string; literal: TrustedContext["policyLiterals"][number] }>();
  const reads = new Map<string, Record<string, unknown>>();
  const searchReads = new Set<string>();
  const priceReads = new Map<string,{readKey:string;label:string}>();
  let ambiguousPriceRead=false;
  const prepared = new Set<string>();
  const preparationContexts = new Map<string, TrustedContext["policyLiterals"][number]>();
  // One request, one immutable full POS read per product. Only a monotonic
  // sync heartbeat may change; every other parsed field (including passthrough
  // fields not exposed to the models) is part of the equality proof.
  const posPins = new Map<string, { identity: string; snapshot: CatalogSnapshotV3; latest: number }>();
  let posInvalidated = false;
  const invalidatePos = (): never => { posInvalidated = true; throw new Error("POS_OBSERVATION_CHANGED"); };
  const pinPos = (id: string, source: Awaited<ReturnType<ReadOnlyCatalog["readProduct"]>>) => {
    if (posInvalidated) return invalidatePos();
    const parsed = CatalogSnapshotV3Schema.safeParse(source.snapshot), pinned = posPins.get(id);
    const raw = parsed.success ? parsed.data : null, at = input.clock().getTime();
    const observed = raw ? Date.parse(raw.synced_at) : NaN;
    if (!raw || source.product.productId !== id || raw.product_id !== id || raw.shop_alias !== scope.shopAlias ||
      !["OK", "FULFILLMENT_POLICY_NOT_FOUND"].includes(normalizeCatalogToken(raw.data_status)) ||
      !Number.isFinite(at) || observed > at || observed + maxAge * 1000 <= at) {
      if (pinned) return invalidatePos();
      return source;
    }
    const { synced_at: _observation, ...content } = raw;
    const identity = commerceHash(content);
    if (pinned) {
      if (identity !== pinned.identity || observed < pinned.latest ||
        Date.parse(pinned.snapshot.synced_at) + maxAge * 1000 <= at) return invalidatePos();
      pinned.latest = observed;
      return { ...source, snapshot: structuredClone(pinned.snapshot) };
    }
    const snapshot = structuredClone(raw);
    posPins.set(id, { identity, snapshot, latest: observed });
    return { ...source, snapshot: structuredClone(snapshot) };
  };
  // Offer identities are source metadata, not price/stock facts or variant bindings.
  const offerLiteral = (id: string, source: Awaited<ReturnType<ReadOnlyCatalog["readProduct"]>>) => {
    const parsed = CatalogSnapshotV3Schema.safeParse(source.snapshot), now = input.clock().getTime();
    if (source.product.productId !== id || !parsed.success || parsed.data.product_id !== id ||
      parsed.data.shop_alias !== scope.shopAlias) return null;
    const raw = parsed.data, observed = Date.parse(raw.synced_at), expires = observed + maxAge * 1000;
    const availableOffers = Object.keys(raw.offers).sort();
    if (!["OK", "FULFILLMENT_POLICY_NOT_FOUND"].includes(normalizeCatalogToken(raw.data_status)) ||
      observed > now || expires <= now || availableOffers.length > 8) return null;
    const identity = commerceHash({ shopAlias:raw.shop_alias, productId:id, releaseId:raw.release_id,
      status:normalizeCatalogToken(raw.data_status), availableOffers });
    const pinned = offerPins.get(id);
    // Re-observing identical offer identity does not renew the verifier's evidence.
    // Keep its original expiry; hardPrecheck still rejects it if it expires in this turn.
    if (pinned?.identity === identity) return pinned.literal;
    const literal = { ref: `offers:${id}`, sourceVersion: commerceHash({ releaseId: raw.release_id, observed, availableOffers }),
      observedAt: raw.synced_at, expiresAt: new Date(expires).toISOString(), text: JSON.stringify({ productId: id, availableOffers }) };
    offerPins.set(id,{identity,literal});
    return literal;
  };
  const bind = (p: StableProductDocument) => {
    if (!subjects.has(p.productId)) subjects.set(p.productId, { ref: p.productId, kind: "PRODUCT", label: p.title, bindingVersion: scope.bindingVersion });
  };
  for (const p of input.initialProducts ?? []) bind(p);
  const snapshot = () => buildReadOnlyContext({ state: input.state?.() ?? { ...scope, currentProductId: null,
    factSnapshotVersion: "", conversationOwner: scope.conversationOwner }, subjects: [...subjects.values()],
    products: [...products.values()], claims: [...claims.values()].flat(), policies: [...(input.entry ? [{ref:"conversation-entry",text:JSON.stringify(input.entry),sourceVersion:scope.bindingVersion,observedAt:scope.sourceObservedAt,expiresAt:null}] : []),
      ...policyLiteral, ...deliveryContexts.values(), ...offerContexts.values(), ...preparationContexts.values()] });
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
  async function prepareProduct(id: string, loaded?: Awaited<ReturnType<ReadOnlyCatalog["readProduct"]>>) {
    const now = input.clock();
    let source: Awaited<ReturnType<ReadOnlyCatalog["readProduct"]>> | null;
    try { source = loaded ?? await input.catalog.readProduct(id); }
    catch {
      // A failed POS read must not erase independent catalog content.
      try { source = await input.catalog.readProduct(id, false); }
      catch { source = null; }
    }
    const p = source?.product;
    if (!products.has(id) && products.size >= MAX_RUNTIME_PRODUCTS) throw new Error("PRODUCT_BOUND");
    let content = false;
    const previous = { ...products.get(id) };
    delete previous.content; delete previous.attributes;
    products.delete(id);
    if (p?.productId === id) {
      const evidence = staticEvidence(p, now);
      if (evidence.content || evidence.attributes) {
        products.set(id, { ...previous, ...evidence }); content = true;
      }
    }
    const parsed = CatalogSnapshotV3Schema.safeParse(source?.snapshot);
    const raw = p?.productId === id && parsed.success && parsed.data.product_id === id && parsed.data.shop_alias === scope.shopAlias ? parsed.data : null;
    const observed = raw ? Date.parse(raw.synced_at) : NaN, expires = observed + maxAge * 1000;
    const status = raw ? normalizeCatalogToken(raw.data_status) : null;
    const offers = raw && ["OK", "FULFILLMENT_POLICY_NOT_FOUND"].includes(status ?? "") &&
      observed <= now.getTime() && expires > now.getTime() ? Object.keys(raw.offers).sort() : null;
    const metadata = source && offers !== null && offers.length <= 8 ? offerLiteral(id,source) : null;
    if (metadata) offerContexts.set(id, metadata);
    else offerContexts.delete(id);
    const availability = { content: { status: content ? "OK" : "UNAVAILABLE", reason: content ? null : "SOURCE_UNAVAILABLE" },
      offers: { status: offers !== null && offers.length <= 8 ? "OK" : "UNAVAILABLE", reason: offers !== null && offers.length <= 8 ? null : "SOURCE_UNAVAILABLE" } };
    const text = JSON.stringify({ subjectRef: id, availability, notRead: ["PRICE", "STOCK", "ETA", "SIZE_FIT"] });
    preparationContexts.set(id, { ref: `preparation:${id}`, text, sourceVersion: commerceHash(text),
      observedAt: scope.sourceObservedAt, expiresAt: null });
  }
  async function prepare(): Promise<number> {
    if (!scope.permission || !scope.privacyAllowed || scope.conversationOwner !== "BOT") return 0;
    const current = snapshot(), bound = current.boundSubjects.filter(s => s.kind === "PRODUCT");
    const id = current.state.currentProductId ?? (bound.length === 1 ? bound[0]!.ref : null);
    if (!id || !bound.some(s => s.ref === id) || prepared.has(id) || [...reads.values()].some(a => a.subjectRef === id)) return 0;
    prepared.add(id);
    await prepareProduct(id);
    return 1;
  }
  async function readProduct(args: Record<string, unknown>, loaded?: Awaited<ReturnType<ReadOnlyCatalog["readProduct"]>>): Promise<CommerceToolResult> {
    const id = args.subjectRef as string, now = input.clock();
    let fetched: Awaited<ReturnType<ReadOnlyCatalog["readProduct"]>>;
    try { fetched = loaded ?? await input.catalog.readProduct(id); }
    catch (error) { if (posPins.has(id)) posInvalidated = true; throw error; }
    if(typeof args.color==="string")input.onMediaColor?.(id,args.color);
    const source = pinPos(id, fetched), p = source.product;
    const parsed = CatalogSnapshotV3Schema.safeParse(source.snapshot);
    if (p.productId !== id || (p.observedAt && (!Number.isFinite(Date.parse(p.observedAt)) ||
      Date.parse(p.observedAt) > now.getTime())) || (source.snapshot !== null && (!parsed.success || parsed.data.product_id !== id ||
      parsed.data.shop_alias !== scope.shopAlias))) return { status: "STALE", reason: "PRODUCT_SOURCE_SCOPE" };
    const raw = parsed.success ? parsed.data : null;
    const observed = raw ? Date.parse(raw.synced_at) : NaN;
    const expires = observed + maxAge * 1000;
    // Match the resolver's usable product statuses; missing price/ETA does not erase an independent offer mapping.
    const productStatus = raw ? normalizeCatalogToken(raw.data_status) : null;
    const availableOffers = raw && (productStatus === "OK" || productStatus === "FULFILLMENT_POLICY_NOT_FOUND") &&
      observed <= now.getTime() && expires > now.getTime() ? Object.keys(raw.offers).sort() : null;
    const query = { shopAlias: scope.shopAlias, productId: id, offerType: (args.offerType as string | undefined) ?? null,
      color: (args.color as string | undefined) ?? null, size: (args.size as string | undefined) ?? null,
      deliveryRegion: raw && typeof args.deliveryRegion === "string" ? resolveCatalogDeliveryRegion(raw, args.deliveryRegion)?.[0] ?? args.deliveryRegion : (args.deliveryRegion as string | undefined) ?? null };
    // Do not expand an unbounded source record or silently truncate selling options.
    const selectedOffers=args.offerTypes as string[]|undefined;
    if (!query.offerType && !selectedOffers && availableOffers && availableOffers.length > 8) return { status: "REJECTED", reason: "SUBJECT_BOUND" };
    if(selectedOffers&&(!availableOffers||selectedOffers.some(o=>!availableOffers.includes(o))))return {status:"REJECTED",reason:"OFFER_NOT_AVAILABLE"};
    const summarizeAll = !!selectedOffers || (!query.offerType && availableOffers !== null && availableOffers.length > 1);
    const resolveOption = (offerType: string | null) => {
      const q = { ...query, offerType };
      const price = raw ? resolveCatalogFacts(raw, { ...q, intent: "PRICE" }, now, maxAge) : null;
      const stock = raw ? resolveCatalogFacts(raw, { ...q, intent: "STOCK" }, now, maxAge) : null;
      const eta = raw && q.deliveryRegion ? resolveCatalogFacts(raw, { ...q, intent: "ETA" }, now, maxAge) : null;
      if (eta?.status === "OK" && eta.expiresAt && raw?.fulfillment_policy?.eta_valid_until.trim()) {
        eta.expiresAt = new Date(Math.min(Date.parse(eta.expiresAt), Date.parse(raw.fulfillment_policy.eta_valid_until))).toISOString();
      }
      const variant = raw ? verifiedVariantFromSnapshot(raw, { shopAlias: scope.shopAlias, productId: id, offerType,
        mentionedSize: q.size, mentionedColor: q.color }, now) : null;
      const offer = (price?.status === "OK" ? price.facts?.offerType : null)
        ?? (stock?.status === "OK" ? stock.facts?.offerType : null) ?? null;
      // Options are not selected cart SKUs. A shared source SKU must not merge two offers' prices.
      const variantId = summarizeAll && offer ? `offer:${id}:${offer}`
        : (variant?.resolution === "VERIFIED" ? variant.selectedVariantId : null) ?? (offer ? `offer:${id}:${offer}` : null);
      const optionClaims = [[price, "PRICE"], [stock, "STOCK"], [eta, "ETA"]].flatMap(([facts, type]) => {
        const result = buildProtectedClaimsFromVerifiedFactsV1({ facts: facts as typeof price, sizeClaim: null, expectedProductId: id });
        return result.claims.filter(c => c.type === type).map(c => ({ ...c, claimId: commerceUuid(commerceHash({ originalClaimId: c.claimId, variantId })),
          scope: c.scope.kind === "PRODUCT" ? { ...c.scope, variantId } : c.scope }));
      });
      const etaClaim = optionClaims.find(c => c.type === "ETA"), stockClaim = optionClaims.find(c => c.type === "STOCK"),
        priceClaim = optionClaims.find(c => c.type === "PRICE");
      const filteredClaim = etaClaim ?? ((q.size || q.color) ? stockClaim ?? priceClaim : undefined);
      const sizeAvailability = stock?.status === "OK" && stock.facts ? {
        productId: id, offerType: offer, color: q.color, requestedSize: q.size,
        confirmedInStockSizes: stock.facts.sizes.filter(size => !q.size || normalizeCatalogToken(size) === normalizeCatalogToken(q.size)),
        unlistedSizeMeaning: "NOT_CONFIRMED" as const,
      } : null;
      return { priceEnvelope: price, offerType: offer ?? (offerType ? normalizeCatalogToken(offerType) : null), offer, variant, variantId, claims: optionClaims,
        sizeAvailability,
        filter: filteredClaim ? { productId: id, variantId, offerType: offer, size: q.size, color: q.color,
          priceClaimId: priceClaim?.claimId ?? null, stockClaimId: stockClaim?.claimId ?? null,
          ...(etaClaim ? { deliveryRegion: Object.keys(raw!.shipping_eta).find(r =>
            normalizeCatalogToken(r) === normalizeCatalogToken(q.deliveryRegion ?? "")), etaClaimId: etaClaim.claimId } : {}) } : null,
        filterExpiry: filteredClaim?.provenance.expiresAt,
        availability: {
          price: { status: price?.status ?? "UNAVAILABLE", reason: price?.reasonCode ?? (price ? null : "POS_SNAPSHOT_UNAVAILABLE") },
          stock: { status: stock?.status ?? "UNAVAILABLE", reason: stock?.reasonCode ?? (stock ? null : "POS_SNAPSHOT_UNAVAILABLE") },
          ...(q.deliveryRegion ? { eta: { status: eta?.status ?? "UNAVAILABLE", reason: eta?.reasonCode ?? (eta ? null : "POS_SNAPSHOT_UNAVAILABLE") } } : {}),
        } };
    };
    const selected = resolveOption(selectedOffers?.[0] ?? query.offerType);
    const options = availableOffers === null ? [] : query.offerType ? [selected]
      : (selectedOffers ?? availableOffers).map(offer => normalizeCatalogToken(offer) === selected.offer ? selected : resolveOption(offer));
    const retained = summarizeAll ? options : [selected];
    const nextClaims = retained.flatMap(o => o.claims);
    const nextSubjects = new Set([...subjects.keys(), ...retained.flatMap(o => o.variantId ? [o.variantId] : [])]);
    if (nextSubjects.size > 8) return { status: "REJECTED", reason: "SUBJECT_BOUND" };
    const readKey = commerceHash({ id, offerType: query.offerType, ...(selectedOffers?{offerTypes:selectedOffers}:{}), color: query.color, size: query.size, deliveryRegion: query.deliveryRegion });
    const allClaims = [...claims.entries()].filter(([key]) => key !== readKey).flatMap(([, values]) => values).concat(nextClaims);
    if (new Set(allClaims.map(commerceHash)).size > 32) return { status: "REJECTED", reason: "CLAIM_BOUND" };
    const evidence = staticEvidence(p, now);
    const full = raw ? buildRealtimeProductFactsV2({ snapshot: raw, product: p, policy, now }) : null;
    const presentation = p.observedAt && full ? buildProductPresentationEvidenceV1(full, now) : null;
    if (presentation) evidence.presentation = presentation;
    const charts = Object.values(policy?.bundle?.artifacts.sizeCharts ?? {}).filter(a =>
      a.chart.reference.verificationStatus === "VERIFIED" &&
      (a.scope?.parentProductIds.includes(id) || a.scope?.level === "GLOBAL")).map(a => a.chart);
    if (charts.length) evidence.sizeCharts = charts;
    if (!products.has(id) && products.size >= MAX_RUNTIME_PRODUCTS) return { status: "REJECTED", reason: "PRODUCT_BOUND" };
    offerContexts.delete(id);
    const offerEvidence = availableOffers !== null ? offerLiteral(id,source) : null;
    if (offerEvidence) offerContexts.set(id,offerEvidence);
    products.delete(id);
    if (evidence.attributes || evidence.presentation || evidence.content || evidence.sizeCharts?.length) products.set(id, evidence);
    subjects.set(id, { ...subjects.get(id)!, label: p.title, variantId: null });
    for (const o of retained) if (o.variantId) subjects.set(o.variantId, { ref: o.variantId, kind: "VARIANT", productId: id,
      label: `${p.title} ${o.offer ?? ""} ${o.variant?.selectedColorLabel ?? ""} ${o.variant?.selectedSizeCode ?? ""}`.trim(), bindingVersion: scope.bindingVersion });
    // Preserve filters whose meaning is lost in an offer-only fact scope, including regional ETA.
    deliveryContexts.delete(readKey);
    const filtered = retained.filter(o => o.filter !== null || o.sizeAvailability !== null);
    if (filtered.length && raw) deliveryContexts.set(readKey, { ref: `read:${readKey}`, sourceVersion: raw.release_id,
      observedAt: raw.synced_at, expiresAt: new Date(Math.min(expires, ...filtered.flatMap(o => o.filterExpiry ? [Date.parse(o.filterExpiry)] : []))).toISOString(),
      text: JSON.stringify(summarizeAll ? { productId: id, sellingOptions: filtered.map(o => ({ ...o.filter, sizeAvailability: o.sizeAvailability })) }
        : { productId: id, ...filtered[0]!.filter, sizeAvailability: filtered[0]!.sizeAvailability }) });
    claims.set(readKey, nextClaims);
    reads.set(readKey, structuredClone(args));
    preparationContexts.delete(id);
    const componentLabel = ({AO:"Áo lẻ",CV:"Chân váy lẻ",QUAN:"Quần lẻ"} as Record<string,string>)[selected.offer ?? ""];
    // Offer count cannot bind parent attributes to a component, even when it is the only offer left.
    const wholeProduct = ["DIRECT","SET","SET_VAY","SET_QUAN"].includes(selected.offer ?? "");
    const pair=`${id}:${selected.offer}`,previousPriceRead=priceReads.get(pair);
    if(typeof args.offerType!=="string"||summarizeAll||(!wholeProduct&&!componentLabel)||previousPriceRead&&previousPriceRead.readKey!==readKey)ambiguousPriceRead=true;
    else priceReads.set(pair,{readKey,label:[componentLabel?`${componentLabel} — ${p.title}`:p.title,
      selected.variant?.selectedColorLabel,selected.variant?.selectedSizeCode?`size ${selected.variant.selectedSizeCode}`:null].filter(Boolean).join(" ")});
    const publicFacts = (values: typeof nextClaims) => values.map(c => ({ type: c.type, scope: c.scope, value: c.value }));
    return { status: "OK", data: { subjectRef: id, label: p.title, variantId: selected.variantId, offerType: selected.offer, requestedOfferType: query.offerType,
      ...(input.entry?.firstContact && selected.priceEnvelope?.status === "OK" &&
        (query.offerType !== null || availableOffers?.length === 1) && nextClaims.some(c=>c.type==="PRICE") ? {
        openingQuote: {subjectRef:id,offerType:selected.offer,
          text:buildVerifiedFactBlocks({...selected.priceEnvelope,facts:{...selected.priceEnvelope.facts!,sizes:selected.sizeAvailability?.confirmedInStockSizes ?? []}},"PRICE",{...p,
            ...(componentLabel ? {title:componentLabel} : {}),
            materials:wholeProduct ? evidence.attributes?.materials ?? [] : [],
            silhouettes:wholeProduct ? evidence.attributes?.silhouettes ?? [] : []}).blocks.map(b=>b.text).join("\n")}
      } : {}),
      availableOffers,
      selectionOptions:raw?candidateCartOptions(raw,{shopAlias:scope.shopAlias,productId:id,offerType:selected.offer,
        size:query.size,color:query.color,quantity:1,lineId:"00000000-0000-4000-8000-000000000001"},now).slice(0,8):[],
      selectionOptionScope:"FIRST_8_EXACT_TUPLES_FOR_QUERY_NOT_COMPLETE_INVENTORY",
      sizeAvailability: selected.sizeAvailability,
      sellingOptions: availableOffers === null ? null : options.map(o => ({ offerType: o.offerType, variantId: o.variantId,
        sourceVersion: raw!.release_id, observedAt: raw!.synced_at,
        expiresAt: new Date(Math.min(expires, ...o.claims.map(c => Date.parse(c.provenance.expiresAt)))).toISOString(),
        facts: publicFacts(o.claims), availability: o.availability, sizeAvailability: o.sizeAvailability })),
      attributes: evidence.attributes ?? null, sizeCharts: charts,
      content: evidence.content ?? null,
      facts: publicFacts(selected.claims),
      availability: selected.availability,
      missing: [...(selected.availability.price.status === "OK" ? [] : ["PRICE"]), ...(selected.availability.stock.status === "OK" ? [] : ["STOCK"]),
        ...(evidence.attributes ? [] : ["ATTRIBUTES"])] } };
  }
  const permitted=()=>scope.permission && scope.privacyAllowed && scope.conversationOwner === "BOT";
  function readArgs(value:unknown):Record<string,unknown>|null {
    const a=toolArgs(value,["subjectRef","offerType","offerTypes","detailsOnly","color","size","deliveryRegion"]);
    if(!a||!text(a.subjectRef,128)||subjects.get(a.subjectRef)?.kind!=="PRODUCT"||
      (a.offerType!==undefined&&!text(a.offerType,64))||(a.color!==undefined&&!text(a.color,64))||
      (a.size!==undefined&&!text(a.size,16))||(a.deliveryRegion!==undefined&&!text(a.deliveryRegion,64))||
      (a.offerTypes!==undefined&&(!Array.isArray(a.offerTypes)||a.offerTypes.length<2||a.offerTypes.length>3||!a.offerTypes.every(o=>text(o,64))||
        new Set(a.offerTypes).size!==a.offerTypes.length||a.offerType!==undefined))||
      (a.detailsOnly!==undefined&&(a.detailsOnly!==true||a.offerType!==undefined||a.offerTypes!==undefined)))return null;
    return a;
  }
  async function invoke(call: CommerceToolCall, loaded?: Awaited<ReturnType<ReadOnlyCatalog["readProduct"]>>): Promise<CommerceToolResult> {
    if (!scope.permission || !scope.privacyAllowed || scope.conversationOwner !== "BOT") return { status: "REJECTED", reason: "PERMISSION" };
    try {
      if (call.name === "read_policy") {
        if (!toolArgs(call.args, [])) return { status: "REJECTED", reason: "TOOL_ARGUMENTS" };
        return await readPolicy();
      }
      if (call.name === "search_products") {
        const a = toolArgs(call.args, ["query", "productCode"]);
        if (!a || (a.query !== undefined && !text(a.query, 512)) ||
          (Object.hasOwn(a, "productCode") ? !text(a.productCode, 64) : !text(a.query, 512)))
          return { status: "REJECTED", reason: "TOOL_ARGUMENTS" };
        const code = typeof a.productCode === "string" ? normalizeProductCode(a.productCode) : null;
        const found = await input.catalog.searchText(code ?? a.query as string);
        // An explicit code must identify that product; nearby search suggestions are not a substitute.
        if (code && (found.status !== "MATCHED" ||
          ![found.product.productId, found.product.canonicalCode, ...found.product.aliases].some(id => normalizeProductCode(id) === code)))
          return { status: "OK", data: { status: "NOT_FOUND", subjects: [], products: [] } };
        const candidates = found.status === "MATCHED" ? [found.product] : found.status === "AMBIGUOUS" ? found.candidates.map(c => c.document) : [];
        if (new Set([...subjects.keys(), ...candidates.map(p => p.productId)]).size > 8) return { status: "REJECTED", reason: "SUBJECT_BOUND" };
        const evidence = candidates.map(p => staticEvidence(p, input.clock()));
        if (new Set([...products.keys(), ...evidence.filter(p => p.attributes || p.content).map(p => p.subjectRef)]).size > MAX_RUNTIME_PRODUCTS)
          return { status: "REJECTED", reason: "PRODUCT_BOUND" };
        // Bounded catalog reads (one per returned candidate), accounted by the catalog port.
        // No facts are resolved and no selling option is selected on the customer's behalf.
        const metadata = await Promise.all(candidates.map(async p => {
          try { return offerLiteral(p.productId, await input.catalog.readProduct(p.productId)); }
          catch { return null; }
        }));
        // Other independent searches may have completed while source reads were in flight.
        if (new Set([...subjects.keys(), ...candidates.map(p => p.productId)]).size > 8)
          return { status: "REJECTED", reason: "SUBJECT_BOUND" };
        if (new Set([...products.keys(), ...evidence.filter(p => p.attributes || p.content).map(p => p.subjectRef)]).size > MAX_RUNTIME_PRODUCTS)
          return { status: "REJECTED", reason: "PRODUCT_BOUND" };
        candidates.forEach(bind);
        candidates.forEach((p, i) => {
          if (metadata[i]) offerContexts.set(p.productId, metadata[i]!);
          else offerContexts.delete(p.productId);
        });
        for (const p of evidence) {
          searchReads.add(p.subjectRef);
          // Search must not replace a fuller, already verified product read.
          if (!products.has(p.subjectRef) && (p.attributes || p.content)) products.set(p.subjectRef, p);
        }
        return { status: "OK", data: { status: found.status, subjects: candidates.map(p => subjects.get(p.productId)),
          products: evidence.map(p => products.get(p.subjectRef) ?? p),
          // Search already read and bound this offer identity. Expose the codes beside
          // each candidate so a targeted read need not expand every selling option.
          availableOffersByProduct: candidates.map((p, i) => ({ productId: p.productId,
            availableOffers: metadata[i] ? (JSON.parse(metadata[i]!.text) as { availableOffers: string[] }).availableOffers : null })) } };
      }
      if (call.name === "read_product") {
        const a=readArgs(call.args);
        if(!a)return {status:"REJECTED",reason:"TOOL_ARGUMENTS_OR_REF"};
        const id=a.subjectRef as string;
        if(a.detailsOnly===true){await prepareProduct(id,loaded);prepared.add(id);
          return {status:"OK",data:{subjectRef:id,content:products.get(id)?.content??null,attributes:products.get(id)?.attributes??null,
            availableOffers:offerContexts.has(id)?JSON.parse(offerContexts.get(id)!.text).availableOffers:null,
            notRead:["PRICE","STOCK","ETA","SIZE_FIT"]}};}
        return await readProduct(a, loaded);
      }
      return { status: "REJECTED", reason: "UNKNOWN_TOOL" };
    } catch { return { status: "UNAVAILABLE", reason: "SOURCE_ERROR" }; }
  }
  return { invoke, snapshot, prepare,
    boundedPrice(){
      if(ambiguousPriceRead||priceReads.size!==1)return null;
      const entry=[...priceReads.values()][0]!,values=(claims.get(entry.readKey)??[]) as ProtectedClaimV1[];
      const prices=values.filter((c):c is Extract<ProtectedClaimV1,{type:"PRICE"}>=>c.type==="PRICE");
      if(prices.length!==1)return null;
      return {text:`${entry.label}: ${prices[0]!.value.amountVnd.toLocaleString("vi-VN")}đ.`,claims:prices};
    }, async invokeBatch(calls:CommerceToolCall[]){
    if(!permitted())return calls.map(()=>({status:"REJECTED" as const,reason:"PERMISSION"}));
    // Fetch one immutable source per product. Admission/commit follows request order,
    // never the network completion order. Effects are handled by outer ports.
    const sources=new Map<string,Promise<Awaited<ReturnType<ReadOnlyCatalog["readProduct"]>> | null>>();
    for(const c of calls)if(c.name==="read_product"){
      const args=readArgs(c.args),id=args?.subjectRef;
      if(typeof id==="string"&&!sources.has(id))
        sources.set(id,Promise.resolve().then(()=>permitted()?input.catalog.readProduct(id):null).then(s=>s?structuredClone(s):null).catch(()=>null));
    }
    const results:CommerceToolResult[]=[];
    for(const call of calls){
      const id=call.args&&typeof call.args==="object"?(call.args as Record<string,unknown>).subjectRef:undefined;
      const source=call.name==="read_product"&&typeof id==="string"&&sources.has(id)?await sources.get(id):undefined;
      if (source === null && typeof id === "string" && posPins.has(id)) posInvalidated = true;
      // Revalidate before consuming staged sources; malformed calls never inherit
      // a valid sibling's fetch, and revoked permission never authorizes a read.
      results.push(!permitted()?{status:"REJECTED",reason:"PERMISSION"}:call.name==="read_product"&&!readArgs(call.args)?{status:"REJECTED",reason:"TOOL_ARGUMENTS_OR_REF"}:
        source===null?{status:"UNAVAILABLE",reason:"SOURCE_ERROR"}:await invoke(call,source));
    }
    return results;
  }, async readback() {
    if (posInvalidated) invalidatePos();
    if (policyRead && (await readPolicy()).status !== "OK") throw new Error("POLICY_READBACK_UNAVAILABLE");
    const fullReads = new Set([...reads.values()].map(a => a.subjectRef));
    for (const id of prepared) if (!fullReads.has(id)) await prepareProduct(id);
    for (const id of searchReads) if (!fullReads.has(id)) {
      const source = await input.catalog.readProduct(id), {product} = source;
      if (product.productId !== id) throw new Error("PRODUCT_SOURCE_CHANGED");
      const evidence = staticEvidence(product, input.clock());
      if (!products.has(id) && (evidence.attributes || evidence.content) && products.size >= MAX_RUNTIME_PRODUCTS)
        throw new Error("PRODUCT_BOUND");
      products.delete(id);
      if (evidence.attributes || evidence.content) products.set(id, evidence);
      subjects.set(id, {...subjects.get(id)!, label:product.title});
      const metadata = offerLiteral(id, source);
      if (metadata) offerContexts.set(id, metadata); else offerContexts.delete(id);
    }
    for (const [ref, subject] of subjects) if (subject.kind === "VARIANT") subjects.delete(ref);
    for (const a of reads.values()) if ((await readProduct(a)).status !== "OK") throw new Error("PRODUCT_READBACK_UNAVAILABLE");
    return snapshot();
  } };
}
