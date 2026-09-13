import { describe, expect, it } from "vitest";
import {
  buildProductPresentationEvidenceV1,
  hashProductPresentationEvidenceV1,
  verifyProductPresentationEvidenceV1,
} from "./product-presentation.js";

const observedAt = "2026-09-12T00:00:00.000Z";
const expiresAt = "2026-09-14T00:00:00.000Z";

function productFacts() {
  const posMetadata = {
    authority: "PANCAKE_POS",
    sourceVersion: "pos:1",
    observedAt,
    expiresAt,
    freshForSeconds: 172_800,
    freshnessState: "FRESH",
  } as const;
  return {
    productId: "SQ9012",
    identity: {
      parentProductId: "SQ9012",
      shopId: "LANA",
      brand: "LANA",
      active: true,
      availableOfferKinds: ["DIRECT"],
      metadata: {
        authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
        sourceVersion: "sheet:1",
        observedAt,
        expiresAt: null,
        freshForSeconds: null,
        freshnessState: "FRESH",
      },
    },
    content: {
      productName: "Tường Vi",
      description: null,
      productUrl: null,
      metadata: {
        authority: "WEBSTORE_XML",
        sourceVersion: "xml:1",
        observedAt,
        expiresAt: null,
        freshForSeconds: null,
        freshnessState: "FRESH",
      },
    },
    inventory: {
      variants: [{
        variantId: "SQ9012-DEN-M",
        sku: "SQ9012-DEN-M",
        offerKind: "DIRECT",
        posOfferKey: "DIRECT",
        componentProductId: null,
        color: "ĐEN",
        size: "M",
        remainQuantity: 2,
        sellableQuantity: 2,
        stockStatus: "IN_STOCK",
      }],
      metadata: posMetadata,
    },
  };
}

describe("Product presentation evidence", () => {
  it("projects only display identity and human-readable variant labels", () => {
    const evidence = buildProductPresentationEvidenceV1(
      productFacts(),
      new Date("2026-09-12T01:00:00.000Z"),
    );
    expect(evidence).toMatchObject({
      productId: "SQ9012",
      displayName: "Tường Vi",
      variants: [{ variantId: "SQ9012-DEN-M", color: "ĐEN", size: "M" }],
      provenance: { freshnessState: "FRESH" },
    });
    expect(JSON.stringify(evidence)).not.toContain("sellableQuantity");
    expect(verifyProductPresentationEvidenceV1(evidence, "SQ9012")).toEqual(evidence);
  });

  it("fails closed for stale input and tampered presentation data", () => {
    expect(buildProductPresentationEvidenceV1(
      productFacts(),
      new Date("2026-09-14T00:00:00.000Z"),
    )).toBeNull();
    const evidence = buildProductPresentationEvidenceV1(
      productFacts(),
      new Date("2026-09-12T01:00:00.000Z"),
    );
    expect(evidence).not.toBeNull();
    expect(verifyProductPresentationEvidenceV1(
      { ...evidence!, displayName: "Tên giả" },
      "SQ9012",
    )).toBeNull();
    const { schemaVersion: _schemaVersion, provenance, ...value } = evidence!;
    const staleSources = {
      identity: provenance.identity,
      content: provenance.content,
      inventory: { ...provenance.inventory, freshnessState: "STALE" as const },
    };
    const forgedFresh = {
      ...evidence!,
      provenance: {
        ...provenance,
        inventory: staleSources.inventory,
        contentHash: hashProductPresentationEvidenceV1({
          value,
          sources: staleSources,
        }),
      },
    };
    expect(verifyProductPresentationEvidenceV1(forgedFresh, "SQ9012"))
      .toBeNull();
  });
});
