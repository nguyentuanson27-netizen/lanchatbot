import { describe, expect, it } from "vitest";
import { ProductAttributesV1Schema } from "./product-attributes.js";

const hash = "a".repeat(64);

describe("ProductAttributesV1", () => {
  it("accepts bounded Google Sheets product attributes with exact provenance", () => {
    const attributes = ProductAttributesV1Schema.parse({
      schemaVersion: 1,
      productId: "SQ9012",
      materials: ["LỤA SATIN"],
      materialComponents: { AO: ["LỤA SATIN"], QUAN: ["TUYTSI"] },
      colors: ["ĐEN"],
      styles: ["THANH LỊCH"],
      silhouettes: ["ỐNG RỘNG", "CHIẾT EO"],
      occasions: ["ĐI LÀM"],
      designAttributes: { waist: ["CẠP CAO"], silhouette: ["ỐNG RỘNG"] },
      careInstructions: "Giặt nhẹ và phơi trong bóng râm.",
      wearProperties: {
        stretch: "LIGHT",
        wrinkleResistance: "REDUCED_WRINKLING",
        opacity: "OPAQUE",
        lining: "PRESENT",
        breathability: null,
      },
      backCoverage: "FULL",
      designComplexity: "MINIMAL",
      metadata: {
        authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
        sourceVersion: `product-registry-attributes:${hash}`,
        observedAt: "2026-09-12T00:00:00.000Z",
        expiresAt: null,
        freshForSeconds: null,
        freshnessState: "FRESH",
        contentHash: hash,
      },
    });
    expect(attributes.productId).toBe("SQ9012");
  });

  it("rejects UNKNOWN as verified attribute data", () => {
    expect(ProductAttributesV1Schema.safeParse({
      schemaVersion: 1,
      productId: "SQ9012",
      materials: ["UNKNOWN"],
      materialComponents: {},
      colors: [],
      styles: [],
      silhouettes: [],
      occasions: [],
      designAttributes: null,
      careInstructions: null,
      wearProperties: null,
      backCoverage: null,
      designComplexity: null,
      metadata: {
        authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
        sourceVersion: `product-registry-attributes:${hash}`,
        observedAt: "2026-09-12T00:00:00.000Z",
        expiresAt: null,
        freshForSeconds: null,
        freshnessState: "FRESH",
        contentHash: hash,
      },
    }).success).toBe(false);
  });

});
