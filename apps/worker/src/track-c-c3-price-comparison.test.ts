import { describe, expect, it } from "vitest";
import { buildCanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import type { BusinessFactEnvelopeV1 } from "@lana/contracts";
import { buildRealtimeC3Input } from "./realtime-c3-input.js";
import { createRealtimeSalesState } from "./realtime-sales-cycle.js";
import { trackCPriceComparisons } from "./track-c-c3-price-comparison.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";

const now = new Date("2026-09-30T12:00:00Z");
function fact(id: string, amount: number, offerType = "SET"): BusinessFactEnvelopeV1 {
  return { schemaVersion: 1, productId: id, status: "OK", source: "POS_SNAPSHOT",
    observedAt: "2026-09-30T11:59:00Z", expiresAt: "2026-09-30T12:10:00Z", reasonCode: null,
    facts: { schemaVersion: 1, productId: id, parentProductId: id, offerType,
      salePriceVnd: amount, listPriceVnd: null, sizes: ["M"], stockStatus: "IN_STOCK",
      stockQuantity: 2, deliveryEta: null, fulfillmentPolicy: "READY_STOCK", imageUrls: [] } };
}
function context(sources: BusinessFactEnvelopeV1[]) {
  return buildRealtimeC3Input({
    sourceMessagePk: "00000000-0000-4000-8000-000000000098",
    canonicalEvidence: buildCanonicalDecisionEvidenceV1({ text: "compare", sourceMessageId: "compare-1",
      productId: "SD10", modelBuyingIntent: null, evaluatedAt: now }),
    preConversationRevision: 0, finalConversationRevision: 1, preSalesRevision: 0,
    commerceState: createRealtimeSalesState("33333333-3333-4333-8333-333333333333", "page-test", now),
    productId: "SD10", productIds: ["SD10", "SD11"], catalogVersion: null, facts: sources,
    productFacts: null, policyResolution: null, cartReadiness: [], now,
  }).context;
}

describe("code-owned price comparison", () => {
  it.each([600_000, 700_000, 800_000])("derives price ordering including equality (%s)", (price) => {
    const sources = [fact("SD10", price), fact("SD11", 700_000)];
    const ctx = context(sources);
    const [entry] = trackCPriceComparisons(ctx, sources, now);
    expect(entry!.value).toMatchObject({ differenceVnd: Math.abs(price - 700_000), offerId: "SET", currency: "VND" });
    const output = { segments: [{ kind: "VERIFIED_CLAIM", text: entry!.deterministicText,
      claimContentHash: entry!.provenance.contentHash }], strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE" };
    expect(() => validateResponderOutput(ctx, output, "PRODUCTION_CONTRACT", now, [], null, sources)).not.toThrow();
    expect(() => validateResponderOutput(ctx, output, "PRODUCTION_CONTRACT", now)).toThrow("PROVENANCE_INVALID");
    expect(() => validateResponderOutput(ctx, { ...output, segments: [{ ...output.segments[0],
      text: entry!.deterministicText + " Better quality guaranteed." }] }, "PRODUCTION_CONTRACT", now, [], null, sources))
      .toThrow("DETERMINISTIC_TEXT_MISMATCH");
  });

  it.each(["different offer", "changed price", "stale", "missing source", "duplicate subject"])("withholds %s comparison without discarding independent prices", (mode) => {
    const original = [fact("SD10", 600_000), fact("SD11", 700_000)];
    const ctx = context(original);
    const sources = structuredClone(original);
    if (mode === "different offer") sources[1]!.facts!.offerType = "AO";
    if (mode === "changed price") sources[1]!.facts!.salePriceVnd = 800_000;
    if (mode === "stale") sources[1]!.expiresAt = now.toISOString();
    if (mode === "missing source") sources.pop();
    if (mode === "duplicate subject") sources.push(structuredClone(sources[1]!));
    expect(trackCPriceComparisons(ctx, sources, now)).toEqual([]);
    expect(ctx.verifiedClaims.filter(({ type }) => type === "PRICE")).toHaveLength(2);
  });
});
