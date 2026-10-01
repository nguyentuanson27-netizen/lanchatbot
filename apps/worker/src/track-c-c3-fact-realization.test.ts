import { describe, expect, it } from "vitest";
import { trackCSimulationFactText } from "./track-c-c3-fact-realization.js";
import {
  trackCPartitionEvidenceRealization,
  type TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";

/**
 * Contract-dimension cases for the fact projections: each varies one typed
 * field and asserts what the projection may and may not say. None of them
 * depends on a benchmark case ID.
 */

describe("Track C C3 typed fact realization", () => {
  it("keeps the material conditions of an exchange policy in the answer", () => {
    const text = trackCSimulationFactText("POLICY_SNAPSHOT", {
      windowDays: 15,
      conditions: ["unused", "tags_intact", "unwashed"],
      customerChangeFeeVnd: 30_000,
      maxExchangesPerInvoice: 1,
    }, "EXCHANGE");
    expect(text).toContain("15 ngày");
    for (const condition of ["chưa qua sử dụng", "còn nguyên tag", "chưa giặt"]) {
      expect(text).toContain(condition);
    }
  });

  it("reports a conditional try-on as conditional rather than as a promise", () => {
    const text = trackCSimulationFactText("POLICY_SNAPSHOT", {
      verifyModel: true, verifyColor: true, verifySize: true,
      tryOn: "ORDER_DEPENDENT",
    }, "INSPECTION");
    expect(text).toContain("tuỳ theo từng đơn");
    expect(text).not.toContain("được thử tại chỗ");
  });

  it("states a negative selling rule instead of omitting it", () => {
    const text = trackCSimulationFactText("POLICY_SNAPSHOT", {
      discountAtLeastPercent: 30,
      allowedChanges: ["size", "color"],
      modelChange: false,
    }, "EXCHANGE_SALE");
    expect(text).toContain("chưa áp dụng");
  });

  it("separates preparation from delivery and does not guarantee a date", () => {
    const text = trackCSimulationFactText("FULFILLMENT_SNAPSHOT", {
      status: "MADE_TO_ORDER",
      productionMinDays: 7, productionMaxDays: 10,
      deliveryMinDays: 1, deliveryMaxDays: 4,
    }, null);
    expect(text).toContain("chuẩn bị hàng khoảng 7–10 ngày");
    expect(text).toContain("vận chuyển thêm khoảng 1–4 ngày");
    // The total is the sum of both spans, not the preparation span alone.
    expect(text).toContain("8–14 ngày");
    expect(text).toContain("chưa thể cam kết chính xác một ngày");
  });

  it("yields no wording for an unknown policy rather than guessing", () => {
    expect(trackCSimulationFactText("POLICY_SNAPSHOT", { months: 12 }, "WARRANTY"))
      .toBeNull();
  });

  it("yields no wording when a known policy uses an unmapped vocabulary", () => {
    expect(trackCSimulationFactText("CARE_GUIDANCE", {
      wash: "dry_clean_only", avoid: "strong_spin", dry: "shade",
    }, null)).toBeNull();
  });

  it("does not turn an inactive promotion into an offer", () => {
    const text = trackCSimulationFactText("PROMOTION_SEMANTICS", {
      active: false,
    }, null);
    expect(text).toContain("chưa có chương trình ưu đãi");
  });

  it("says an item is not sold separately instead of leaving it out", () => {
    const text = trackCSimulationFactText("OFFER_CONFIGURATION", {
      fullSetVnd: 899_000,
      top: { available: true, priceVnd: 549_000 },
      bottom: { available: false, priceVnd: null },
    }, null);
    expect(text).toContain("chưa bán lẻ riêng");
  });
});

describe("Track C C3 realization partitioning", () => {
  const entry = (
    ref: string,
    deterministicText?: string,
  ): TrackCSelectableEvidence => Object.freeze({
    ref,
    capability: "POLICY",
    value: Object.freeze({}),
    ...(deterministicText === undefined ? {} : { deterministicText }),
    provenance: Object.freeze({ contentHash: ref.repeat(64).slice(0, 64), authority: "RUNTIME" }),
  });

  it("keeps the answerable part and reports the rest", () => {
    const { realizable, unrealizable } = trackCPartitionEvidenceRealization([
      entry("A", "Dạ shop nhận COD ạ."),
      entry("B"),
    ]);
    expect(realizable.map(({ ref }) => ref)).toEqual(["A"]);
    expect(unrealizable.map(({ ref }) => ref)).toEqual(["B"]);
  });

  it("does not drop an entry that has authority but no wording", () => {
    const { realizable, unrealizable } = trackCPartitionEvidenceRealization([entry("B")]);
    expect(realizable).toEqual([]);
    expect(unrealizable).toHaveLength(1);
  });
});
