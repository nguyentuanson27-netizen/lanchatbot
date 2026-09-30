import { createHash } from "node:crypto";
import { BusinessFactEnvelopeV1Schema, canonicalJsonV1, type BusinessFactEnvelopeV1, type ContextV2 } from "@lana/contracts";
import { buildProtectedClaimsFromVerifiedFactSetV1 } from "@lana/business-tools";
import { trackCFormatVnd } from "./track-c-c3-fact-realization.js";
import type { TrackCSelectableEvidence } from "./track-c-c3-strategy-contract.js";

/** Code-owned readback supplies the offer/unit that PRICE claims omit.
 * Never derive an offer from dialogue, goal, a code prefix or model annotations.
 * Evidence admission and final egress independently call this projection.
 */
export function trackCPriceComparisons(context: ContextV2,
  sources: readonly BusinessFactEnvelopeV1[], at: Date): readonly TrackCSelectableEvidence[] {
  if (context.productBinding.status !== "RESOLVED" || !Number.isFinite(at.getTime())) return [];
  const rows: { productId: string; offer: string; price: number; hash: string; source: BusinessFactEnvelopeV1 }[] = [];
  const counts = new Map<string, number>();
  for (const source of sources.slice(0, 3)) counts.set(source.productId, (counts.get(source.productId) ?? 0) + 1);
  for (const source of sources.slice(0, 3)) {
    const parsed = BusinessFactEnvelopeV1Schema.safeParse(source);
    if (!parsed.success) continue;
    const value = parsed.data;
    const facts = value.facts;
    if (value.status !== "OK" || !facts || !["POS_LIVE", "POS_SNAPSHOT"].includes(value.source) ||
        !context.productBinding.productIds.includes(value.productId) || counts.get(value.productId) !== 1 ||
        facts.parentProductId !== value.productId || !/^[A-Z]{1,6}\d{1,8}[A-Z0-9]*$/u.test(value.productId) ||
        value.expiresAt === null || Date.parse(value.expiresAt) <= at.getTime() ||
        Date.parse(value.observedAt) > at.getTime()) continue;
    const price = facts.salePriceVnd ?? facts.listPriceVnd;
    if (price === null) continue;
    const expected = buildProtectedClaimsFromVerifiedFactSetV1({ facts: [value], sizeClaim: null }).claims.find(({ type }) => type === "PRICE");
    if (!expected) continue;
    const candidates = context.verifiedClaims.filter((claim) => claim.type === "PRICE" &&
      claim.scope.kind === "PRODUCT" && claim.scope.productId === value.productId && claim.scope.variantId === null &&
      claim.claimId === expected.claimId && claim.provenance.authority === expected.provenance.authority &&
      claim.provenance.sourceVersion === expected.provenance.sourceVersion &&
      claim.provenance.observedAt === expected.provenance.observedAt &&
      claim.provenance.expiresAt === expected.provenance.expiresAt &&
      claim.value.amountVnd === price && claim.value.currency === "VND");
    if (candidates.length !== 1) continue;
    rows.push({ productId: value.productId, offer: facts.offerType, price,
      hash: candidates[0]!.provenance.contentHash, source: value });
  }
  rows.sort((a, b) => a.productId.localeCompare(b.productId));
  const output: TrackCSelectableEvidence[] = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i]!, b = rows[j]!;
    if (a.offer !== b.offer) continue;
    const lower = a.price <= b.price ? a : b;
    const higher = lower === a ? b : a;
    const differenceVnd = higher.price - lower.price;
    const value = { productIds: [a.productId, b.productId], offerId: a.offer,
      unit: "ONE_PARENT_PRODUCT_OFFER", currency: "VND", pricesVnd: [a.price, b.price], differenceVnd,
      sourceClaimHashes: [a.hash, b.hash] };
    const contentHash = createHash("sha256").update(canonicalJsonV1([
      "C3_PRICE_COMPARISON_V1", value, a.source, b.source,
    ])).digest("hex");
    output.push({ ref: `PRICE_COMPARISON_${output.length + 1}`, capability: "PRODUCT_COMPARISON", value,
      deterministicText: differenceVnd === 0
        ? `Giá ${a.productId} và ${b.productId} bằng nhau: ${trackCFormatVnd(a.price)}.`
        : `Giá ${lower.productId} thấp hơn ${higher.productId} ${trackCFormatVnd(differenceVnd)}.`,
      provenance: { contentHash, authority: "RUNTIME" } });
  }
  return output;
}
