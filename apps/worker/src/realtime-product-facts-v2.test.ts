import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  selectProductMediaV2,
  type CatalogSnapshotV3,
  type StableProductDocument,
} from "@lana/business-tools";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { buildRealtimeProductFactsV2, productMediaView } from "./realtime-product-facts-v2.js";

type ProductImage = StableProductDocument["images"][number];

type ComponentRole = "TOP" | "SKIRT" | "PANTS";
interface Bf09ImageFixture {
  readonly id: string;
  readonly partsVisible: readonly string[];
  readonly angle: ProductImage["angle"];
  readonly sortOrder: number;
}
interface Bf09Counterexample {
  readonly name: string;
  readonly compositionRoles: readonly ComponentRole[];
  readonly partsVisible: readonly string[];
  readonly angle: ProductImage["angle"];
  readonly expectedDisposition: "FULL_LOOK" | "EXCLUDED" | ComponentRole;
}
interface Bf09ReplayFixture {
  readonly incident: {
    readonly productId: string;
    readonly compositionRoles: readonly ComponentRole[];
    readonly images: readonly Bf09ImageFixture[];
    readonly expectedSelectedIds: readonly string[];
  };
  readonly counterexamples: readonly Bf09Counterexample[];
}

const bf09Replay = JSON.parse(readFileSync(
  new URL("../../../benchmarks/bf09/full-look-media-mapping-v1.json", import.meta.url),
  "utf8",
)) as Bf09ReplayFixture;

function image(
  angle: ProductImage["angle"],
  partsVisible: readonly string[],
  overrides: Partial<ProductImage> = {},
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
    ...overrides,
  };
}

const roleSuffix: Readonly<Record<ComponentRole, string>> = {
  TOP: "AO",
  SKIRT: "CV",
  PANTS: "QUAN",
};

function mediaSnapshot(
  productId: string,
  roles: readonly ComponentRole[],
  observedAt: string,
): CatalogSnapshotV3 {
  const components = roles.map((role, index) => ({
    component_id: `${index + 1}`,
    product_sku: `${productId}-${roleSuffix[role]}`,
    variation_sku: "",
    quantity: 1,
  }));
  return {
    schema_version: 3,
    release_id: "bf09-pos-r1",
    catalog_version: "bf09-catalog-v1",
    policy_version: "bf09-policy-v1",
    shop_alias: "LANA",
    brand: "LANA",
    product_id: productId,
    synced_at: observedAt,
    data_status: "OK",
    fulfillment_policy: {
      tinh_trang: "READY_STOCK",
      can_order_when_zero: false,
      prep_min_days: null,
      prep_max_days: null,
      zero_stock_policy: "",
      zero_stock_prep_min_days: null,
      zero_stock_prep_max_days: null,
      eta_valid_until: "",
    },
    selling_rules: {
      allow_mixed_sizes: false,
      allow_component_sale: false,
      source_version: "bf09-selling-rules-v1",
    },
    shipping_eta: {},
    offers: {
      SET: {
        list_price: null,
        sale_price: 1_199_000,
        price_status: "OK",
        rows: [{
          offer_type: "SET",
          price_sku: `${productId}-SET`,
          color: "BE",
          size: "M",
          stock_quantity: 2,
          list_price: null,
          sale_price: 1_199_000,
          stock_status: "OK",
          bom_status: "OK",
          parent_variation_id: `${productId}-SET-M`,
          parent_variation_sku: `${productId}-SET-M`,
          components,
        }],
      },
    },
  };
}

function mediaProduct(
  productId: string,
  observedAt: string,
  images: readonly ProductImage[],
): StableProductDocument {
  return {
    productId,
    parentProductId: productId,
    canonicalCode: productId,
    aliases: [],
    title: `Set ${productId}`,
    descriptionXml: "",
    colors: [],
    materials: [],
    silhouettes: [],
    occasions: [],
    imageUrls: images.map(({ url }) => url),
    images,
    catalogVersion: "bf09-catalog-v1",
    observedAt,
  };
}

function buildMediaFacts(
  roles: readonly ComponentRole[],
  images: readonly ProductImage[],
  productId = "SD375",
) {
  const observedAt = "2026-08-10T00:00:00.000Z";
  const now = new Date("2026-08-10T01:00:00.000Z");
  return {
    now,
    facts: buildRealtimeProductFactsV2({
      snapshot: mediaSnapshot(productId, roles, observedAt),
      product: mediaProduct(productId, observedAt, images),
      policy: null,
      now,
    }),
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

  it("replays SD375 and returns three bounded verified full-look assets in stable order", () => {
    const fixture = bf09Replay.incident;
    const images = fixture.images.map((item, index) => image(item.angle, item.partsVisible, {
      url: `https://cdn.example/${item.id}.jpg`,
      sortOrder: item.sortOrder,
      sourceContentSha256: (index + 1).toString(16).repeat(64),
    }));
    const { facts, now } = buildMediaFacts(fixture.compositionRoles, images, fixture.productId);
    expect(facts).not.toBeNull();

    const result = selectProductMediaV2({
      product: facts!,
      kind: "FULL_LOOK",
      maxAssets: 3,
      now,
      unavailableFallback: {
        verifiedFact: {
          answer: "SD375 vẫn có thể kiểm tra giá và size",
          source: "PRODUCT_FACTS_V2",
          freshnessState: "FRESH",
          sourceVersion: "bf09-catalog-v1",
          observedAt: "2026-08-10T00:00:00.000Z",
        },
        nextStep: "ASK_SIZE_PROFILE",
      },
    });

    const selectedIds = result.selection.selected.map(({ url }) =>
      /\/([^/]+)\.jpg$/u.exec(url)?.[1]);
    expect(selectedIds).toEqual(fixture.expectedSelectedIds);
    expect(result.selection.selected).toHaveLength(3);
    expect(result.selection.selected.every(({ componentProductId }) =>
      componentProductId === null)).toBe(true);
    expect(result.selectedVia).toEqual([
      "EXACT_METADATA",
      "EXACT_METADATA",
      "EXACT_METADATA",
    ]);
    expect(facts!.media.assets.filter(({ view }) => view === "FULL_LOOK")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentProductId: null,
          verified: true,
          reviewStatus: "APPROVED",
          sourceContentSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        }),
      ]),
    );
  });

  it.each(bf09Replay.counterexamples)(
    "applies complete-composition precedence: $name",
    (fixture) => {
      const candidate = image(fixture.angle, fixture.partsVisible, {
        url: `https://cdn.example/${fixture.name.replace(/[^a-z0-9]+/giu, "-")}.jpg`,
      });
      const { facts } = buildMediaFacts(fixture.compositionRoles, [candidate]);
      expect(facts).not.toBeNull();
      const projected = facts!.media.assets[0];

      if (fixture.expectedDisposition === "EXCLUDED") {
        expect(projected).toBeUndefined();
        return;
      }
      if (fixture.expectedDisposition === "FULL_LOOK") {
        expect(projected).toMatchObject({ view: "FULL_LOOK", componentProductId: null });
        return;
      }
      const expectedComponentId = `SD375-${roleSuffix[fixture.expectedDisposition]}`;
      expect(projected).toMatchObject({
        view: fixture.angle,
        componentProductId: expectedComponentId,
      });
    },
  );

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
