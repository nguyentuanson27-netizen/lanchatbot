import { describe, expect, it } from "vitest";
import type { CatalogSnapshotV3, StableProductDocument } from "@lana/business-tools";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { buildRealtimeProductFactsV2, productMediaView } from "./realtime-product-facts-v2.js";

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
  it("projects a PUBLISHED, VERIFIED BODY chart with every eligibility stage", () => {
    const observedAt = "2026-08-04T00:00:00.000Z";
    const product = {
      productId: "SD398",
      parentProductId: "SD398",
      canonicalCode: "SD398",
      aliases: [],
      title: "Ao dai Dao Phung",
      descriptionXml: "",
      colors: [],
      materials: [],
      silhouettes: [],
      occasions: [],
      imageUrls: [],
      images: [],
      catalogVersion: "catalog-v2",
      observedAt,
    } satisfies StableProductDocument;
    const snapshot = {
      schema_version: 3,
      release_id: "pos-r1",
      catalog_version: "catalog-v2",
      policy_version: "policy-v1",
      shop_alias: "LANA",
      brand: "LANA",
      product_id: "SD398",
      synced_at: observedAt,
      data_status: "OK",
      fulfillment_policy: {
        tinh_trang: "READY_STOCK",
        can_order_when_zero: false,
        prep_min_days: null,
        prep_max_days: null,
      },
      selling_rules: {
        allow_mixed_sizes: false,
        allow_component_sale: false,
        source_version: "selling-rules-v1",
      },
      shipping_eta: {},
      offers: {
        DIRECT: {
          list_price: null,
          sale_price: 1_199_000,
          price_status: "OK",
          rows: [{
            offer_type: "DIRECT",
            color: "DEN",
            size: "M",
            stock_quantity: 2,
            list_price: null,
            sale_price: 1_199_000,
            stock_status: "OK",
          }],
        },
      },
    } as unknown as CatalogSnapshotV3;
    const policy = {
      status: "CURRENT",
      reasonCodes: [],
      bundle: {
        channel: "PUBLISHED",
        resolvedAt: observedAt,
        versionReferences: [{
          artifactKey: "ao-dai-dress",
          artifactKind: "SIZE_CHART",
          lifecycle: "PUBLISHED",
        }],
        artifacts: {
          sizeCharts: {
            "ao-dai-dress": {
              chart: {
                schemaVersion: 1,
                reference: {
                  chartId: "ao-dai-dress",
                  version: "1",
                  source: "IMAGE_EXTRACTION",
                  sourceArtifactRef: "https://cdn.example/ao-dai-size.jpg",
                  sourceContentSha256: "d".repeat(64),
                  verificationStatus: "VERIFIED",
                  verifiedByRef: "admin:owner",
                  verifiedAt: observedAt,
                },
                brand: "LANA",
                category: "AO_DAI",
                componentRole: "DRESS",
                boundaryPolicy: "REQUIRE_HUMAN_REVIEW",
                bands: [{
                  size: "M",
                  ranges: [{ kind: "HEIGHT_CM", minInclusive: 155, maxInclusive: 168 }],
                  note: null,
                }],
              },
              scope: {
                level: "COMPONENT",
                parentProductIds: ["SD398"],
                categories: ["AO_DAI"],
                componentRole: "DRESS",
                forms: [],
                materials: [],
              },
              extraction: { measurementBasis: "BODY", confidence: 1, extractorVersion: "fixture" },
              sourceMetadata: { sourceReference: "https://cdn.example/ao-dai-size.jpg" },
            },
          },
        },
      },
    } as unknown as RuntimePolicyResolution;

    const facts = buildRealtimeProductFactsV2({
      snapshot,
      product,
      policy,
      now: new Date(observedAt),
    });

    expect(facts?.sizeChart).toMatchObject({
      sizeChartId: "ao-dai-dress",
      sizeChartVersion: "1",
      verificationStatus: "VERIFIED",
      sourceContentSha256: "d".repeat(64),
      metadata: { authority: "ADMIN_POLICY", observedAt },
    });
    expect(facts?.sizeChartEligibility).toEqual({
      schemaVersion: 1,
      status: "ELIGIBLE",
      policyBundle: "FRESH",
      publication: "PUBLISHED",
      verification: "VERIFIED",
      measurementBasis: "BODY",
      scope: "MATCHED",
      reasonCodes: [],
    });

    const chart = policy.bundle!.artifacts.sizeCharts["ao-dai-dress"]!;
    const policyWithScope = (scope: NonNullable<typeof chart.scope>): RuntimePolicyResolution => ({
      ...policy,
      bundle: {
        ...policy.bundle!,
        artifacts: {
          ...policy.bundle!.artifacts,
          sizeCharts: {
            ...policy.bundle!.artifacts.sizeCharts,
            "ao-dai-dress": { ...chart, scope },
          },
        },
      },
    });
    const categoryMismatch = buildRealtimeProductFactsV2({
      snapshot,
      product,
      policy: policyWithScope({
        ...chart.scope!,
        level: "CATEGORY",
        parentProductIds: [],
        categories: ["VAY"],
        componentRole: null,
      }),
      now: new Date(observedAt),
    });
    const componentMismatch = buildRealtimeProductFactsV2({
      snapshot,
      product,
      policy: policyWithScope({
        ...chart.scope!,
        parentProductIds: [],
        categories: ["AO_DAI"],
        componentRole: "TOP",
      }),
      now: new Date(observedAt),
    });
    for (const scopedFacts of [categoryMismatch, componentMismatch]) {
      expect(scopedFacts?.sizeChart).toBeNull();
      expect(scopedFacts?.sizeChartEligibility).toMatchObject({
        status: "INELIGIBLE",
        scope: "MISMATCH",
        reasonCodes: ["SIZE_CHART_SCOPE_MISMATCH"],
      });
    }
    const globalFacts = buildRealtimeProductFactsV2({
      snapshot,
      product,
      policy: policyWithScope({
        ...chart.scope!,
        level: "GLOBAL",
        parentProductIds: [],
        categories: [],
        componentRole: null,
      }),
      now: new Date(observedAt),
    });
    expect(globalFacts?.sizeChart?.sizeChartId).toBe("ao-dai-dress");
    expect(globalFacts?.sizeChartEligibility?.scope).toBe("MATCHED");
  });
});
