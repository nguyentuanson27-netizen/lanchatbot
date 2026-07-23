import { describe, expect, it } from "vitest";
import {
  isSizeChartRegistryRow,
  isRetryableSizeChartError,
  parseExtractedSizeChart,
} from "./size-chart-extractor.js";

describe("app-native size chart extraction", () => {
  it("accepts canonical and legacy image_registry labels", () => {
    const base = {
      IMAGE_ID: "image-1",
      MA_SP: "CB182",
      IMAGE_URL: "https://cdn.example.com/size.jpg",
      IMAGE_HASH: "a".repeat(64),
      AI_UPDATED_AT: "2026-07-23T00:00:00.000Z",
    };
    expect(isSizeChartRegistryRow({ ...base, AI_IMAGE_TYPE: "SIZE_GUIDE" })).toBe(true);
    expect(isSizeChartRegistryRow({ ...base, AI_IMAGE_TYPE: "SIZE_CHART" })).toBe(true);
    expect(isSizeChartRegistryRow({ ...base, AI_IMAGE_TYPE: "MODEL" })).toBe(false);
  });

  it("parses body measurements without allowing AI to verify the chart", () => {
    const parsed = parseExtractedSizeChart(JSON.stringify({
      measurement_basis: "BODY",
      brand: "LANA",
      category: "SET",
      component_role: "NONE",
      boundary_policy: "REQUIRE_HUMAN_REVIEW",
      confidence: 0.96,
      bands: [
        {
          size: "S",
          ranges: [
            { kind: "WEIGHT_KG", min_inclusive: 44, max_inclusive: 50 },
            { kind: "HEIGHT_CM", min_inclusive: 150, max_inclusive: 170 },
          ],
        },
      ],
    }), "size-chart-v1.0.0");
    expect(parsed).toMatchObject({
      measurementBasis: "BODY",
      confidence: 0.96,
      extractionVersion: "size-chart-v1.0.0",
      bands: [{ size: "S", note: null }],
    });
  });

  it("retries only temporary provider and network failures", () => {
    expect(isRetryableSizeChartError("VERTEX_SIZE_CHART_HTTP_429:RESOURCE_EXHAUSTED")).toBe(true);
    expect(isRetryableSizeChartError("VERTEX_SIZE_CHART_HTTP_503:UNAVAILABLE")).toBe(true);
    expect(isRetryableSizeChartError("UND_ERR_CONNECT_TIMEOUT")).toBe(true);
    expect(isRetryableSizeChartError("SIZE_CHART_REVIEW_REQUIRED")).toBe(false);
    expect(isRetryableSizeChartError("ADMIN_SIZE_CHART_BODY_BASIS_REQUIRED")).toBe(false);
  });
});
