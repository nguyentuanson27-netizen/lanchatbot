import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");

describe("DF06 canonical commerce binding architecture", () => {
  it("routes product identity through one NFC ingress choke point", () => {
    const identifiers = source("../../../packages/contracts/src/v2/canonical-identifiers.ts");
    const cart = source("../../../packages/contracts/src/v2/customer-size-cart.ts");
    const productFacts = source("../../../packages/contracts/src/v2/product-policy-media.ts");
    const readiness = source("../../../packages/contracts/src/v2/canonical-evidence-readiness.ts");
    const evaluator = source("../../../packages/business-tools/src/effect-readiness.ts");
    const evidence = source("../../../packages/business-tools/src/canonical-evidence.ts");
    const claims = source("../../../packages/business-tools/src/protected-claims.ts");
    const commercePolicy = source("../../../packages/commerce-kernel/src/policy-engine.ts");

    expect(identifiers).toContain("canonicalizeProductIdsV1");
    expect(identifiers).toContain('.normalize("NFC")');
    expect(cart).toContain("CanonicalProductIdV1Schema");
    expect(cart).not.toMatch(/(?:parentProductId|componentProductId|offerId): z\.string\(\)\.trim\(\)/u);
    expect(productFacts).not.toMatch(/(?:productId|parentProductId|componentProductId): z\.string\(\)\.trim\(\)/u);
    expect(readiness).toContain("return canonicalizeProductIdsV1(input)");
    expect(evaluator).toContain("canonicalizeReadinessProductIdsV1");
    expect(evidence).toContain("const canonicalJson = canonicalJsonV1");
    expect(claims).toContain("const canonicalJson = canonicalJsonV1");
    expect(commercePolicy).toContain("CanonicalProductIdV1Schema");
    expect(commercePolicy).not.toMatch(/parentProductId:\s*z\.string\(\)\.trim\(\)/u);
    expect(commercePolicy).not.toMatch(/function sameId[\s\S]{0,180}(?:trim|normalize|toUpperCase)/u);
  });

  it("keeps cart capacity separate from protected-text aggregation", () => {
    const evaluator = source("../../../packages/business-tools/src/effect-readiness.ts");

    expect(evaluator).toContain('input.effect === "CART_MUTATION" || input.effect === "CART_READY"');
    expect(evaluator).not.toMatch(/effect\s*===\s*["']PROTECTED_OUTBOUND["'][\s\S]{0,160}MAX_CART_LINES_V1/u);
  });

  it("requires receipt-batch evidence and locked canonical replay", () => {
    const worker = source("./realtime-sales-cycle.ts");
    const database = source("../../../packages/database/src/realtime-runtime.ts");

    expect(worker).toContain("CartMutationBatchEvidenceV1Schema");
    expect(worker).toContain("CartMutationAuthorityBindingV1Schema");
    expect(worker).toContain("const canonicalJson = canonicalJsonV1");
    expect(database).toContain("CART_MUTATION_BATCH_REQUIRED");
    expect(database).toContain("cartMutationAuthorityBindingHashPreimageV1");
    expect(database).toContain("applyCanonicalCartDecisionV2");
    expect(database).toContain("canonicalCartStateHashPreimageV1");
  });

  it("binds commerce Meta output to its exact sales parent", () => {
    const database = source("../../../packages/database/src/realtime-runtime.ts");

    expect(database).toContain("PROTECTED_OUTBOUND_SALES_READINESS_MISMATCH");
    expect(database).toContain("readiness.binding.parentReadinessHash");
    expect(database).toContain("parent.binding.cart");
    expect(database).toContain("parent.binding.preview");
  });
});
