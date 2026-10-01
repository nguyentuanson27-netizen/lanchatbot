import { describe, expect, it } from "vitest";
import { buildProductAttributesV1 } from "@lana/business-tools";
import type { ProductAttributesDataV1 } from "@lana/contracts";
import {
  trackCProductAttributeEvidence,
  trackCProductAttributeProjections,
} from "./track-c-c3-attribute-projection.js";
import { trackCEvidenceHasSafeFactualEgress } from
  "./track-c-c3-strategy-contract.js";

/**
 * These cases vary one contract dimension at a time. They protect the failure
 * modes the projection had, not any particular benchmark case: no assertion
 * below depends on a case ID, a product code or a price.
 */

const EMPTY: ProductAttributesDataV1 = {
  materials: [],
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
};

function attributes(data: Partial<ProductAttributesDataV1>) {
  return buildProductAttributesV1({
    productId: "TEST0001",
    data: { ...EMPTY, ...data },
    observedAt: "2026-09-10T02:00:00.000Z",
  });
}

function fields(data: Partial<ProductAttributesDataV1>): readonly string[] {
  return trackCProductAttributeProjections(attributes(data)).map(({ field }) => field);
}

describe("Track C C3 typed attribute projection", () => {
  it("keeps every populated group, not only materials, colors and styles", () => {
    expect(fields({
      materials: ["tơ"],
      colors: ["kem"],
      styles: ["thanh lịch"],
      silhouettes: ["suông"],
      occasions: ["đi làm"],
      materialComponents: { AO: ["tơ"], LOT: ["lụa"] },
      designAttributes: { neckline: ["cổ tròn"], silhouette: ["phom rộng"] },
      wearProperties: {
        stretch: "FLEXIBLE", wrinkleResistance: "REDUCED_WRINKLING",
        opacity: "OPAQUE", lining: "PRESENT", breathability: "PRESENT",
      },
      careInstructions: "Giặt tay với nước lạnh.",
      backCoverage: "FULL",
      designComplexity: "MINIMAL",
    })).toEqual([
      "materials", "colors", "styles", "silhouettes", "occasions",
      "materialComponents.AO", "materialComponents.LOT",
      "design.neckline", "design.silhouette",
      "wearStretch", "wearWrinkleResistance", "wearOpacity",
      "wearLining", "wearBreathability",
      "careInstructions", "backCoverage", "designComplexity",
    ]);
  });

  it("projects one field per group so a selection need not carry the bundle", () => {
    const evidence = trackCProductAttributeEvidence({
      attributes: attributes({
        materials: ["lụa"],
        designAttributes: { silhouette: ["phom rộng"] },
      }),
      refPrefix: "PRODUCT_ATTRIBUTES_001",
      authority: "RUNTIME",
    });
    expect(evidence.map(({ ref }) => ref)).toEqual([
      "PRODUCT_ATTRIBUTES_001_MATERIALS",
      "PRODUCT_ATTRIBUTES_001_DESIGN_SILHOUETTE",
    ]);
    for (const entry of evidence) {
      expect(Object.keys(entry.value)).toHaveLength(1);
      expect(entry.provenance.authority).toBe("RUNTIME");
      expect(trackCEvidenceHasSafeFactualEgress(entry)).toBe(true);
    }
  });

  it("gives each field a distinct provenance hash bound to its source", () => {
    const evidence = trackCProductAttributeEvidence({
      attributes: attributes({ materials: ["lụa"], colors: ["kem"] }),
      refPrefix: "PRODUCT_ATTRIBUTES_001",
      authority: "RUNTIME",
    });
    const hashes = evidence.map(({ provenance }) => provenance.contentHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("states a verified wrinkle property and stays silent when it is unknown", () => {
    const verified = trackCProductAttributeProjections(attributes({
      materials: ["tơ"],
      wearProperties: {
        stretch: null, wrinkleResistance: "REDUCED_WRINKLING",
        opacity: null, lining: null, breathability: null,
      },
    }));
    expect(verified.find(({ field }) => field === "wearWrinkleResistance")?.text)
      .toContain("ít nhăn");

    // The same material with no verified wear property must not imply one:
    // "tơ" does not establish wrinkle resistance.
    const unknown = trackCProductAttributeProjections(attributes({
      materials: ["tơ"],
    }));
    expect(unknown.map(({ field }) => field)).toEqual(["materials"]);
    expect(JSON.stringify(unknown)).not.toContain("nhăn");
  });

  it("does not derive a care instruction from the material", () => {
    const projections = trackCProductAttributeProjections(attributes({
      materials: ["ren"],
    }));
    expect(projections.some(({ field }) => field === "careInstructions")).toBe(false);
  });

  it("changes the projection when the input attribute changes", () => {
    const wide = fields({ designAttributes: { silhouette: ["phom rộng"] } });
    const fitted = fields({ designAttributes: { waist: ["chiết eo"] } });
    expect(wide).toEqual(["design.silhouette"]);
    expect(fitted).toEqual(["design.waist"]);
  });

  it("projects nothing at all when no attribute group is populated", () => {
    expect(fields({})).toEqual([]);
  });
});
