import { describe, expect, it } from "vitest";
import {
  foldVietnameseForRecall,
  normalizeVietnameseNfc,
} from "./vietnamese-text.js";

describe("Vietnamese text primitives", () => {
  it("normalizes composed and decomposed Vietnamese to NFC without erasing meaning", () => {
    const composed = "\u0111\u00fang";
    const decomposed = "\u0111u\u0301ng";

    expect(normalizeVietnameseNfc(decomposed)).toBe(composed);
    expect(new Set([
      normalizeVietnameseNfc("\u0111\u00fang"),
      normalizeVietnameseNfc("\u0111\u1eebng"),
      normalizeVietnameseNfc("d\u1eebng"),
    ])).toHaveLength(3);
  });

  it("folds only for recall and documents the intentionally ambiguous result", () => {
    expect(foldVietnameseForRecall("\u0110\u00daNG")).toBe("dung");
    expect(foldVietnameseForRecall("\u0111\u1eebng")).toBe("dung");
    expect(foldVietnameseForRecall("d\u1eebng")).toBe("dung");
  });
});
