import { describe, expect, it } from "vitest";
import { TRACK_C_QUALITY_SUITE_V1 } from "./track-c-quality-suite.js";

describe("Track C quality suite", () => {
  it("keeps exactly fifty readable sales-quality fixtures outside C1", () => {
    expect(TRACK_C_QUALITY_SUITE_V1).toHaveLength(50);
    expect(new Set(TRACK_C_QUALITY_SUITE_V1.map(({ id }) => id)).size).toBe(50);
    for (const fixture of TRACK_C_QUALITY_SUITE_V1) {
      expect(fixture.customerMessage).not.toBe("");
      expect(fixture.context).toBeDefined();
      expect(fixture.verifiedFacts).toBeDefined();
      expect(fixture.expectedQualityBehavior.length).toBeGreaterThan(0);
      expect(fixture.qualityTags.length).toBeGreaterThan(0);
    }
  });

  it("covers natural next steps, multi-turn context, and Vietnamese shorthand", () => {
    const tags = new Set(TRACK_C_QUALITY_SUITE_V1.flatMap(({ qualityTags }) => qualityTags));
    expect(tags).toEqual(expect.objectContaining(new Set([
      "NATURAL_NEXT_STEP",
      "MULTI_TURN_CONTEXT",
      "VIETNAMESE_SHORTHAND",
      "ANTI_ROBOT",
      "PRICE_OBJECTION",
    ])));
    expect(TRACK_C_QUALITY_SUITE_V1.find(({ id }) => id === "q36-known-measurements"))
      .toMatchObject({ customerMessage: "size gì em" });
    expect(TRACK_C_QUALITY_SUITE_V1.find(({ id }) => id === "q50-close-intent"))
      .toMatchObject({ customerMessage: "ok chốt e này nha" });
  });
});
