import { describe, expect, it } from "vitest";
import { applyCanonicalCartDecisionV2, evaluateShopPolicy } from "./index.js";

describe("commerce kernel architecture boundary", () => {
  it("exports the one deterministic cart reducer and policy evaluator", () => {
    expect(typeof applyCanonicalCartDecisionV2).toBe("function");
    expect(typeof evaluateShopPolicy).toBe("function");
  });
});
