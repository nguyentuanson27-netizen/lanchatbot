import { describe, expect, it } from "vitest";
import type { MediaProductSearchResult, StableProductDocument } from "@lana/business-tools";
import {
  aggregateMedia,
  aggregateVideoFrames,
  containsCustomerUrl,
  extractAdProductCodes,
  mediaItemFromSearch,
  selectedProductId,
} from "./media-resolution.js";

function product(productId: string): StableProductDocument {
  return {
    productId,
    parentProductId: productId,
    canonicalCode: productId,
    aliases: [],
    title: productId,
    colors: [],
    materials: [],
    silhouettes: [],
    occasions: [],
    imageUrls: [],
    images: [],
    catalogVersion: "v2",
  };
}

function match(productId: string, score = 0.9): MediaProductSearchResult {
  return {
    status: "MATCHED",
    matchKind: "SEMANTIC",
    product: product(productId),
    score,
    gap: 0.1,
  };
}

describe("media resolution policy", () => {
  it("extracts the product code from an ads title", () => {
    expect(extractAdProductCodes("21.7_SV921_CHIỀN_HỒNG_LM")).toEqual(["SV921"]);
  });

  it("deduplicates products while preserving first image order", () => {
    const result = aggregateMedia([
      mediaItemFromSearch(0, "IMAGE", match("SV921")),
      mediaItemFromSearch(1, "IMAGE", match("CB182")),
      mediaItemFromSearch(2, "IMAGE", match("SV921")),
    ]);
    expect(result.products.map((item) => item.productId)).toEqual(["SV921", "CB182"]);
    expect(result.requiresHandoff).toBe(false);
  });

  it("handoffs only when uncertain media is greater than twenty percent", () => {
    const unclear: MediaProductSearchResult = { status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" };
    const five = [0, 1, 2, 3].map((ordinal) => mediaItemFromSearch(ordinal, "IMAGE", match(`SV${ordinal}`)));
    expect(aggregateMedia([...five, mediaItemFromSearch(4, "IMAGE", unclear)]).requiresHandoff).toBe(false);
    expect(aggregateMedia([
      mediaItemFromSearch(0, "IMAGE", match("SV1")),
      mediaItemFromSearch(1, "IMAGE", match("SV2")),
      mediaItemFromSearch(2, "IMAGE", unclear),
    ]).requiresHandoff).toBe(true);
  });

  it("requires two of three video frames to agree", () => {
    expect(aggregateVideoFrames(0, [match("SV921"), match("SV921"), match("CB182")]))
      .toMatchObject({ status: "MATCHED", product: { productId: "SV921" }, frameCount: 3 });
    expect(aggregateVideoFrames(0, [match("SV921"), match("CB182"), { status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }]))
      .toMatchObject({ status: "AMBIGUOUS", reasonCode: "VIDEO_FRAME_CONSENSUS_MISSING" });
  });

  it("detects customer text links and maps a later Set selection", () => {
    expect(containsCustomerUrl("xem giúp https://example.com/a.jpg")).toBe(true);
    expect(containsCustomerUrl("mã SV921")).toBe(false);
    expect(selectedProductId("em lấy set 2", [
      { label: "SET_1", productId: "SV921" },
      { label: "SET_2", productId: "CB182" },
    ])).toBe("CB182");
  });
});
