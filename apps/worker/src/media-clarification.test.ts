import { describe, expect, it } from "vitest";
import { selectedProductId } from "./media-resolution.js";

describe("media clarification selection", () => {
  const candidates = [
    { label: "MAU_1", productId: "SD395" },
    { label: "MAU_2", productId: "SD443" },
    { label: "MAU_3", productId: "SD013" },
  ];

  it.each([
    ["mẫu 1", "SD395"],
    ["Mau 2", "SD443"],
    ["chị chọn mẫu 3 nhé", "SD013"],
  ])("resolves %s against bounded candidates", (text, expected) => {
    expect(selectedProductId(text, candidates)).toBe(expected);
  });

  it("does not resolve a number outside the active candidate labels", () => {
    expect(selectedProductId("mẫu 4", candidates)).toBeNull();
  });

  it("preserves the existing multi-set selection behavior", () => {
    expect(selectedProductId("set 2", [
      { label: "SET_1", productId: "SD395" },
      { label: "SET_2", productId: "SD443" },
    ])).toBe("SD443");
  });
});
