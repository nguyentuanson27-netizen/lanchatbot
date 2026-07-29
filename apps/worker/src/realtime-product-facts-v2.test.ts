import { describe, expect, it } from "vitest";
import type { StableProductDocument } from "@lana/business-tools";
import { productMediaView } from "./realtime-product-facts-v2.js";

type ProductImage = StableProductDocument["images"][number];

function image(
  angle: ProductImage["angle"],
  partsVisible: readonly string[],
): ProductImage {
  return {
    url: "https://cdn.example/sd395.jpg",
    role: "PRIMARY",
    angle,
    imageType: "MODEL",
    intents: [],
    partsVisible,
    sortOrder: 0,
    qualityScore: 1,
    feedback: false,
    reviewStatus: "APPROVED",
    metadataVerified: true,
  };
}

describe("realtime ProductFactsV2 media projection", () => {
  it("classifies approved front views of a full set or dress as FULL_LOOK", () => {
    expect(productMediaView(image("FRONT", ["FULL_SET"]))).toBe("FULL_LOOK");
    expect(productMediaView(image("FRONT", ["VAY"]))).toBe("FULL_LOOK");
  });

  it("keeps CLOSEUP stronger than full-look parts", () => {
    expect(productMediaView(image("CLOSEUP", ["FULL_SET"]))).toBe("CLOSE_UP");
  });

  it("keeps directional views when the full garment is not visible", () => {
    expect(productMediaView(image("FRONT", ["AO"]))).toBe("FRONT");
    expect(productMediaView(image("BACK", ["CHAN_VAY"]))).toBe("BACK");
    expect(productMediaView(image("SIDE", []))).toBe("SIDE");
  });
});
