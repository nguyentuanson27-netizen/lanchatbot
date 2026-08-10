import { describe, expect, it } from "vitest";
import {
  BOM_FRESH_FOR_SECONDS,
  FULFILLMENT_FRESH_FOR_SECONDS,
  MEDIA_FRESH_FOR_SECONDS,
  PRICE_INVENTORY_FRESH_FOR_SECONDS,
  ProductFactsV2Schema,
  type ProductFactsV2,
  type ProductMediaAssetV2,
} from "@lana/contracts";
import {
  normalizeImageRegistryMediaTypeV2,
  selectProductMediaV2,
} from "./media-selector-v2.js";

const NOW = new Date("2026-07-22T03:00:00.000Z");
const OBSERVED = "2026-07-22T00:00:00.000Z";
const expires = (seconds: number) => new Date(Date.parse(OBSERVED) + seconds * 1_000).toISOString();

function asset(
  assetId: string,
  overrides: Partial<ProductMediaAssetV2> = {},
): ProductMediaAssetV2 {
  return {
    assetId,
    url: `https://cdn.example/${assetId}.jpg`,
    componentProductId: null,
    purposes: ["PRODUCT_OVERVIEW"],
    view: "FRONT",
    sortOrder: 0,
    verified: true,
    ...overrides,
  };
}

function facts(assets: readonly ProductMediaAssetV2[]): ProductFactsV2 {
  return ProductFactsV2Schema.parse({
    schemaVersion: 2,
    productId: "SV100",
    identity: {
      parentProductId: "SV100",
      shopId: "lana",
      brand: "La.na Design",
      active: true,
      availableOfferKinds: ["SET", "COMPONENT"],
      metadata: {
        authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
        sourceVersion: "registry-1",
        observedAt: OBSERVED,
        expiresAt: null,
        freshForSeconds: null,
        freshnessState: "FRESH",
      },
    },
    content: {
      productName: "SV100",
      description: "Set áo và chân váy",
      productUrl: null,
      metadata: {
        authority: "WEBSTORE_XML",
        sourceVersion: "xml-1",
        observedAt: OBSERVED,
        expiresAt: null,
        freshForSeconds: null,
        freshnessState: "FRESH",
      },
    },
    bom: {
      components: [
        { componentProductId: "SV100-AO", sku: "SV100-AO", role: "TOP", quantity: 1, required: true },
        { componentProductId: "SV100-CV", sku: "SV100-CV", role: "SKIRT", quantity: 1, required: true },
      ],
      offerCompositions: [
        { offerKind: "SET", posOfferKey: "SET", componentProductIds: ["SV100-AO", "SV100-CV"] },
      ],
      metadata: {
        authority: "PANCAKE_POS",
        sourceVersion: "pos-bom-1",
        observedAt: OBSERVED,
        expiresAt: expires(BOM_FRESH_FOR_SECONDS),
        freshForSeconds: BOM_FRESH_FOR_SECONDS,
        freshnessState: "FRESH",
      },
    },
    pricing: {
      setPrice: { currency: "VND", listPriceVnd: 699_000, salePriceVnd: 699_000 },
      comboThreePiecePrice: null,
      componentPrices: [
        { componentProductId: "SV100-AO", price: null },
        { componentProductId: "SV100-CV", price: null },
      ],
      metadata: {
        authority: "PANCAKE_POS",
        sourceVersion: "pos-price-1",
        observedAt: OBSERVED,
        expiresAt: expires(PRICE_INVENTORY_FRESH_FOR_SECONDS),
        freshForSeconds: PRICE_INVENTORY_FRESH_FOR_SECONDS,
        freshnessState: "FRESH",
      },
    },
    inventory: {
      variants: [],
      metadata: {
        authority: "PANCAKE_POS",
        sourceVersion: "pos-stock-1",
        observedAt: OBSERVED,
        expiresAt: expires(PRICE_INVENTORY_FRESH_FOR_SECONDS),
        freshForSeconds: PRICE_INVENTORY_FRESH_FOR_SECONDS,
        freshnessState: "FRESH",
      },
    },
    sellingRules: {
      allowMixedSizes: true,
      allowComponentSale: false,
      metadata: {
        authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
        sourceVersion: "registry-1",
        observedAt: OBSERVED,
        expiresAt: null,
        freshForSeconds: null,
        freshnessState: "FRESH",
      },
    },
    fulfillment: {
      appliesToParentProductId: "SV100",
      policyType: "READY_STOCK",
      canOrderWhenZero: false,
      etaToCustomer: { minDays: 3, maxDays: 7, validUntil: null },
      metadata: {
        authority: "GOOGLE_SHEETS_FULFILLMENT_POLICY",
        sourceVersion: "eta-1",
        observedAt: OBSERVED,
        expiresAt: expires(FULFILLMENT_FRESH_FOR_SECONDS),
        expiryBasis: "DEFAULT_7_DAY_TTL",
        freshForSeconds: FULFILLMENT_FRESH_FOR_SECONDS,
        freshnessState: "FRESH",
      },
    },
    sizeChart: null,
    media: {
      assets,
      metadata: {
        authority: "QDRANT_STABLE",
        sourceVersion: "media-1",
        observedAt: OBSERVED,
        expiresAt: expires(MEDIA_FRESH_FOR_SECONDS),
        freshForSeconds: MEDIA_FRESH_FOR_SECONDS,
        freshnessState: "FRESH",
      },
    },
  });
}

const unavailableFallback = {
  verifiedFact: {
    answer: "Thiết kế dùng chất gấm đứng form",
    source: "PRODUCT_FACTS_V2" as const,
    freshnessState: "FRESH" as const,
    sourceVersion: "xml-1",
    observedAt: OBSERVED,
  },
  nextStep: "ASK_SIZE_PROFILE" as const,
};

describe("Media selector V2", () => {
  it("normalizes image_registry media aliases into the canonical seven intents", () => {
    expect(normalizeImageRegistryMediaTypeV2(" full-look ")).toBe("FULL_LOOK");
    expect(normalizeImageRegistryMediaTypeV2("chân váy")).toBe("CHAN_VAY");
    expect(normalizeImageRegistryMediaTypeV2("fabric detail")).toBe("DETAIL_FABRIC");
    expect(normalizeImageRegistryMediaTypeV2("Bảng size")).toBe("SIZE_GUIDE");
    expect(normalizeImageRegistryMediaTypeV2("unknown")).toBeNull();
  });

  it("maps SIZE_CHART to SIZE_GUIDE and selects exact reviewed size chart", () => {
    const sizeChart = asset("size", { purposes: ["SIZE_CHART"], view: "OTHER" });
    const result = selectProductMediaV2({
      product: facts([sizeChart]), kind: "SIZE_CHART", now: NOW, unavailableFallback,
    });
    expect(result.requestKind).toBe("SIZE_GUIDE");
    expect(result.selection.selected[0]?.assetId).toBe("size");
    expect(result.selectedVia).toEqual(["EXACT_METADATA"]);
  });

  it("resolves AO from POS BOM and never substitutes a full-set image", () => {
    const fullSet = asset("set", { componentProductId: null, view: "FULL_LOOK" });
    const top = asset("top", { componentProductId: "SV100-AO" });
    const result = selectProductMediaV2({
      product: facts([fullSet, top]), kind: "AO", now: NOW, unavailableFallback,
    });
    expect(result.selection.requestedComponentProductIds).toEqual(["SV100-AO"]);
    expect(result.selection.selected.map(({ assetId }) => assetId)).toEqual(["top"]);
  });

  it("tries strict exact metadata before same-product/component similarity", () => {
    const exact = asset("exact", { componentProductId: "SV100-CV", purposes: ["PRODUCT_OVERVIEW"], sortOrder: 9 });
    const similar = asset("similar", { componentProductId: "SV100-CV", purposes: ["HERO"], view: "FRONT" });
    const result = selectProductMediaV2({
      product: facts([exact]),
      kind: "CHAN_VAY",
      maxAssets: 2,
      now: NOW,
      unavailableFallback,
      similarityMatches: [{ productId: "SV100", asset: similar, score: 0.98 }],
    });
    expect(result.selection.selected.map(({ assetId }) => assetId)).toEqual(["exact", "similar"]);
    expect(result.selectedVia).toEqual(["EXACT_METADATA", "QDRANT_SIMILARITY"]);
  });

  it("accepts a purpose-correct asset found only by Qdrant similarity", () => {
    const correct = asset("correct-similarity", {
      componentProductId: "SV100-AO",
      purposes: ["PRODUCT_OVERVIEW"],
      view: "FRONT",
    });
    const result = selectProductMediaV2({
      product: facts([]),
      kind: "AO",
      now: NOW,
      unavailableFallback,
      similarityMatches: [{ productId: "SV100", asset: correct, score: 0.96 }],
    });
    expect(result.selection.selected.map(({ assetId }) => assetId)).toEqual([
      "correct-similarity",
    ]);
    expect(result.selectedVia).toEqual(["QDRANT_SIMILARITY"]);
  });

  it("rejects similarity assets with a wrong semantic purpose despite a compatible view", () => {
    const feedbackAsTop = asset("feedback-as-top", {
      componentProductId: "SV100-AO",
      purposes: ["FEEDBACK"],
      view: "FRONT",
    });
    const sizeChartAsTop = asset("size-as-top", {
      componentProductId: "SV100-AO",
      purposes: ["SIZE_CHART"],
      view: "OTHER",
    });
    const feedbackAsLook = asset("feedback-as-look", {
      componentProductId: null,
      purposes: ["FEEDBACK"],
      view: "FULL_LOOK",
    });
    for (const [kind, candidate] of [
      ["AO", feedbackAsTop],
      ["AO", sizeChartAsTop],
      ["FULL_LOOK", feedbackAsLook],
    ] as const) {
      const result = selectProductMediaV2({
        product: facts([]),
        kind,
        now: NOW,
        unavailableFallback,
        similarityMatches: [{ productId: "SV100", asset: candidate, score: 0.99 }],
      });
      expect(result.selection.status).toBe("NONE");
    }
  });

  it("rejects low similarity scores by default", () => {
    const weak = asset("weak", { componentProductId: "SV100-AO", purposes: ["HERO"] });
    const result = selectProductMediaV2({
      product: facts([]),
      kind: "AO",
      now: NOW,
      unavailableFallback,
      similarityMatches: [{ productId: "SV100", asset: weak, score: 0.81 }],
    });
    expect(result.selection.status).toBe("NONE");
  });

  it("rejects cross-product similarity results", () => {
    const wrongProduct = asset("wrong", { componentProductId: "SV100-AO", purposes: ["HERO"] });
    const result = selectProductMediaV2({
      product: facts([]),
      kind: "AO",
      now: NOW,
      unavailableFallback,
      similarityMatches: [{ productId: "OTHER", asset: wrongProduct, score: 0.99 }],
    });
    expect(result.selection.status).toBe("NONE");
    expect(result.unavailableReason).toBe("NO_VERIFIED_MEDIA");
  });

  it("does not infer authentic feedback or size charts from similarity", () => {
    const lookalike = asset("lookalike", { purposes: ["HERO"], view: "OTHER" });
    for (const kind of ["FEEDBACK", "SIZE_GUIDE"] as const) {
      const result = selectProductMediaV2({
        product: facts([]),
        kind,
        now: NOW,
        unavailableFallback,
        similarityMatches: [{ productId: "SV100", asset: lookalike, score: 1 }],
      });
      expect(result.selection.status).toBe("NONE");
    }
  });

  it("returns no image, explicit unavailable text, verified fact and closing step", () => {
    const result = selectProductMediaV2({
      product: facts([]), kind: "DETAIL_FABRIC", now: NOW, unavailableFallback,
    });
    expect(result.selection.status).toBe("NONE");
    expect(result.selection.selected).toEqual([]);
    expect(result.customerTextUnits).toEqual([
      "Hiện shop chưa có ảnh cận chất vải của mẫu này.",
      "Thiết kế dùng chất gấm đứng form; chị gửi chiều cao, cân nặng để em tư vấn size phù hợp nha.",
    ]);
  });

  it("does not accept a front crop as an exact FULL_LOOK image", () => {
    const crop = asset("crop", { purposes: ["PRODUCT_OVERVIEW"], view: "FRONT" });
    const result = selectProductMediaV2({
      product: facts([crop]), kind: "FULL_LOOK", now: NOW, unavailableFallback,
    });
    expect(result.selection.status).toBe("NONE");
  });

  it("does not let full-set similarity replace a component image", () => {
    const fullSet = asset("set-similar", { purposes: ["HERO"], view: "FULL_LOOK" });
    const result = selectProductMediaV2({
      product: facts([]),
      kind: "AO",
      now: NOW,
      unavailableFallback,
      similarityMatches: [{ productId: "SV100", asset: fullSet, score: 0.99 }],
    });
    expect(result.selection.status).toBe("NONE");
  });

  it("does not trust contradictory exact metadata for a component image", () => {
    const mislabeledSet = asset("mislabeled-set", {
      componentProductId: "SV100-AO",
      purposes: ["PRODUCT_OVERVIEW"],
      view: "FULL_LOOK",
    });
    const result = selectProductMediaV2({
      product: facts([mislabeledSet]), kind: "AO", now: NOW, unavailableFallback,
    });
    expect(result.selection.status).toBe("NONE");
  });

  it("does not use stale Qdrant media even while the stored projection still exists", () => {
    const stale = facts([asset("old")]);
    stale.media.metadata.freshnessState = "STALE";
    const result = selectProductMediaV2({
      product: stale, kind: "FULL_LOOK", now: NOW, unavailableFallback,
    });
    expect(result.selection.selected).toEqual([]);
    expect(result.unavailableReason).toBe("MEDIA_FACTS_STALE");
  });

  it("caps every request at three images", () => {
    expect(() => selectProductMediaV2({
      product: facts([]), kind: "FULL_LOOK", maxAssets: 4, now: NOW, unavailableFallback,
    })).toThrow("MEDIA_SELECTION_MAX_ASSETS_MUST_BE_1_TO_3");
    const fullLooks = Array.from({ length: 5 }, (_, index) =>
      asset(`look-${index}`, { view: "FULL_LOOK", sortOrder: index }));
    const result = selectProductMediaV2({
      product: facts(fullLooks), kind: "FULL_LOOK", now: NOW, unavailableFallback,
    });
    expect(result.selection.selected).toHaveLength(3);
    expect(result.selection.selected.map(({ assetId }) => assetId)).toEqual([
      "look-0",
      "look-1",
      "look-2",
    ]);
  });

  it("deduplicates exact and similarity assets without changing stable exact ordering", () => {
    const first = asset("first", { view: "FULL_LOOK", sortOrder: 1 });
    const shared = asset("shared", { view: "FULL_LOOK", sortOrder: 2 });
    const result = selectProductMediaV2({
      product: facts([shared, first]),
      kind: "FULL_LOOK",
      maxAssets: 3,
      now: NOW,
      unavailableFallback,
      similarityMatches: [{ productId: "SV100", asset: shared, score: 0.99 }],
    });
    expect(result.selection.selected.map(({ assetId }) => assetId)).toEqual([
      "first",
      "shared",
    ]);
    expect(result.selectedVia).toEqual(["EXACT_METADATA", "EXACT_METADATA"]);
  });

  it("keeps unverified full-look media out of otherwise eligible selections", () => {
    const approved = asset("approved-look", { view: "FULL_LOOK", sortOrder: 2 });
    const draft = asset("draft-look", {
      view: "FULL_LOOK",
      sortOrder: 1,
      verified: false,
    });
    const result = selectProductMediaV2({
      product: facts([draft, approved]),
      kind: "FULL_LOOK",
      now: NOW,
      unavailableFallback,
    });
    expect(result.selection.selected.map(({ assetId }) => assetId)).toEqual([
      "approved-look",
    ]);
  });

  it("rejects unverified assets and invalid fallback evidence", () => {
    const unverified = asset("draft", { verified: false, purposes: ["FEEDBACK"] });
    expect(() => selectProductMediaV2({
      product: facts([unverified]),
      kind: "FEEDBACK",
      now: NOW,
      unavailableFallback: {
        ...unavailableFallback,
        verifiedFact: { ...unavailableFallback.verifiedFact, answer: "" },
      },
    })).toThrow("MEDIA_FALLBACK_FACT_INVALID");
  });
});
