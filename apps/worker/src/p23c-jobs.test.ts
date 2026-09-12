import { describe, expect, it } from "vitest";
import { buildApprovedQdrantJobs, buildRegistryMap } from "./p23c-jobs.js";
import {
  buildXmlProfiles,
  groupXmlItems,
  normalizeStructuredExtraction,
} from "./p23c-profiles.js";

describe("P2.3C approved Qdrant jobs", () => {
  it("publishes only explicit registry attributes with their own integrity identity", () => {
    const registryRow = {
      MA_SP: "SQ149",
      ACTIVE: "TRUE",
      MATERIAL_OVERRIDE: "LỤA SATIN",
      DESCRIPTION_OVERRIDE: "Set SQ149 mô tả đã duyệt.",
      COLOR_OVERRIDE: "ĐEN",
      STYLE_OVERRIDE: "THANH LỊCH",
      MATERIAL_COMPONENTS_OVERRIDE: "ÁO: LỤA SATIN",
      SILHOUETTE_OVERRIDE: "ỐNG RỘNG",
      OCCASION_OVERRIDE: "ĐI LÀM",
      DESIGN_ATTRIBUTES_JSON: JSON.stringify({ waist: ["CẠP CAO"] }),
      CARE_INSTRUCTIONS: "Giặt nhẹ.",
      WEAR_PROPERTIES_JSON: JSON.stringify({
        stretch: "UNKNOWN",
        wrinkleResistance: "REDUCED_WRINKLING",
        opacity: "UNKNOWN",
        lining: "UNKNOWN",
        breathability: "UNKNOWN",
      }),
      BACK_COVERAGE: "FULL",
      DESIGN_COMPLEXITY: "MINIMAL",
    };
    const registry = buildRegistryMap([registryRow]);
    const groups = groupXmlItems([{
      "g:item_group_id": "SQ149",
      "g:title": "Set SQ149 - M",
      "g:description": "Mô tả XML không được nhận authority Sheet.",
      "g:image_link": "https://cdn.example/sq149.jpg",
    }]);
    const profiles = normalizeStructuredExtraction(
      buildXmlProfiles(registry.registry, groups, "2026-09-12T00:00:00.000Z"),
    );
    expect(profiles[0]).toMatchObject({
      description_authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
      product_attributes: {
        productId: "SQ149",
        materials: ["LỤA SATIN"],
        colors: ["ĐEN"],
        styles: ["THANH LỊCH"],
        silhouettes: ["ỐNG RỘNG"],
        occasions: ["ĐI LÀM"],
        designAttributes: { waist: ["CẠP CAO"] },
        wearProperties: {
          stretch: null,
          wrinkleResistance: "REDUCED_WRINKLING",
          opacity: null,
          lining: null,
          breathability: null,
        },
        metadata: {
          authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
          sourceVersion: expect.stringMatching(/^product-registry-attributes:[a-f0-9]{64}$/u),
        },
      },
    });
    expect(profiles[0]?.product_attributes?.materialComponents).toEqual(
      profiles[0]?.material_components,
    );
    const changedProfiles = buildXmlProfiles(
      buildRegistryMap([{ ...registryRow, BACK_COVERAGE: "OPEN" }]).registry,
      groups,
      "2026-09-12T00:00:00.000Z",
    );
    const normalizedChangedProfiles = normalizeStructuredExtraction(changedProfiles);
    expect(normalizedChangedProfiles[0]?.source_hash).toBe(profiles[0]?.source_hash);
    expect(normalizedChangedProfiles[0]?.product_attributes?.metadata.contentHash).not.toBe(
      profiles[0]?.product_attributes?.metadata.contentHash,
    );

    const jobs = buildApprovedQdrantJobs(profiles, [{
      IMAGE_ID: "point-attributes",
      MA_SP: "SQ149",
      IMAGE_URL: "https://cdn.example/sq149.jpg",
      REVIEW_STATUS: "APPROVED",
      ACTIVE: "TRUE",
    }], {
      run_id: "run-attributes",
      started_at: "2026-09-12T00:00:00.000Z",
      shard_count: 1,
      shard_index: 0,
      shard_label: "1/1",
    });
    expect(jobs[0]?.payload).toMatchObject({
      description_authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
      product_attributes: { productId: "SQ149", backCoverage: "FULL" },
    });
  });

  it("drops a malformed JSON group without dropping the base product profile", () => {
    const registry = buildRegistryMap([{
      MA_SP: "SQ149",
      ACTIVE: "TRUE",
      MATERIAL_OVERRIDE: "LỤA",
      DESIGN_ATTRIBUTES_JSON: "{not-json",
    }]);
    const groups = groupXmlItems([{
      "g:item_group_id": "SQ149",
      "g:title": "Set SQ149 - M",
      "g:description": "Mô tả XML.",
    }]);
    const profiles = buildXmlProfiles(registry.registry, groups, "2026-09-12T00:00:00.000Z");
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.product_attributes).toMatchObject({
      productId: "SQ149",
      materials: ["LỤA"],
      designAttributes: null,
    });
    expect(profiles[0]?.extraction_warnings).toContain("DESIGN_ATTRIBUTES_INVALID");
  });

  it("copies the reviewed image hash and approval provenance into the payload", () => {
    const hash = "a".repeat(64);
    const jobs = buildApprovedQdrantJobs([], [{
      IMAGE_ID: "point-1",
      MA_SP: "CB182",
      IMAGE_URL: "https://cdn.example/cb182-size.jpg",
      IMAGE_HASH: hash.toUpperCase(),
      IMAGE_TYPE: "SIZE_GUIDE",
      IMAGE_INTENTS: "SIZE_GUIDE",
      REVIEW_STATUS: "APPROVED",
      ACTIVE: "TRUE",
      VERIFIED: "TRUE",
    }], {
      run_id: "run-1",
      started_at: "2026-07-24T00:00:00.000Z",
      shard_count: 1,
      shard_index: 0,
      shard_label: "1/1",
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.payload).toMatchObject({
      image_content_sha256: hash,
      image_metadata_review_status: "APPROVED",
      metadata_verified: true,
      image_type: "SIZE_GUIDE",
    });
  });
});
