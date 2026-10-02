import { describe, expect, it, vi } from "vitest";
import { buildCanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import type { BusinessFactEnvelopeV1 } from "@lana/contracts";
import { buildRealtimeC3Input } from "./realtime-c3-input.js";
import { createRealtimeSalesState } from "./realtime-sales-cycle.js";
import { trackCPriceComparisons } from "./track-c-c3-price-comparison.js";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import { runTrackCStrategyLive } from "./track-c-c3-strategy-contract-runner.js";
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
  it("realizes a code price comparison without converting cheaper into lighter, benefit or value", async () => {
    const sources = [fact("SD10", 600_000), fact("SD11", 700_000)];
    const ctx = context(sources);
    const [comparison] = trackCPriceComparisons(ctx, sources, now);
    for (const answerText of [null, "Nhẹ hơn chị nhé.", "SD10 nhẹ hơn SD11.",
      "Như vậy đáng tiền hơn.", "Vậy sẽ thoải mái hơn."]) {
      const respond = (value: unknown) => ({ providerModelVersion: "gemini-3.5-flash-lite",
        payload: { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] } });
      const send = vi.fn<CandidateVertexTransport["send"]>()
        .mockResolvedValueOnce(respond({ replyAct: "ANSWER", proposition: "PRODUCT_COMPARISON",
          goal: "NEED: compare prices of these compatible offers\nKNOWN: NONE\nANSWER: code price comparison\nLIMIT: NONE\nNEXT: NONE",
          evidenceRefs: [comparison!.ref], continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }))
        .mockResolvedValueOnce(respond({ answerText, factualTexts: [], progressionText: null }));
      const result = await runTrackCStrategyLive({ context: ctx,
        modelResource: "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
        decisionAt: now, dialogue: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
          text: "So giá hai bộ này giúp chị.", attachmentCount: 0, occurredAt: now.toISOString() }],
        checkoutRequestedFields: [], checkoutClarificationActive: false, currentCart: null,
        paymentOptions: ["COD"], comparisonFacts: sources, transport: { send } });
      expect(result.reply).toContain(comparison!.deterministicText);
      expect(result.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM")).toHaveLength(1);
      expect(result.output.cta).toBe("NONE");
      if (answerText === null) expect(result.recoveryDiagnostic).toBeUndefined();
      else {
        expect(result.recoveryDiagnostic).toBeDefined();
        expect(result.reply).not.toContain(answerText);
      }
      expect(send).toHaveBeenCalledTimes(2);
    }
  });

});
