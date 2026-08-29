import { describe, expect, it } from "vitest";
import { ProtectedClaimV1Schema, type ProtectedClaimV1 } from "@lana/contracts";
import {
  authorizeRealtimeProtectedClaimProposal,
  bindRealtimeProtectedClaimProposal,
  detectRealtimeUndeclaredProtectedClaimTypes,
} from "./realtime-protected-claim-boundary.js";

const NOW = new Date("2026-08-30T03:00:00.000Z");
const PRICE_ID = "11111111-1111-5111-8111-111111111111";
const STOCK_ID = "22222222-2222-5222-8222-222222222222";

function productClaim(
  type: "PRICE" | "STOCK" | "ETA",
  overrides: Readonly<Record<string, unknown>> = {},
): ProtectedClaimV1 {
  const value = type === "PRICE"
    ? { amountVnd: 120_000, currency: "VND" }
    : type === "STOCK"
      ? { status: "IN_STOCK", availableQuantity: 4 }
      : { minDays: 2, maxDays: 4 };
  return ProtectedClaimV1Schema.parse({
    schemaVersion: 1,
    claimId: type === "PRICE" ? PRICE_ID : STOCK_ID,
    type,
    scope: { kind: "PRODUCT", productId: "SKU-1", variantId: null },
    provenance: {
      authority: "POS_LIVE",
      sourceVersion: "pos:42",
      evidenceRef: `fact:${type.toLowerCase()}:42`,
      contentHash: "a".repeat(64),
      observedAt: "2026-08-30T02:59:00.000Z",
      expiresAt: "2026-08-30T03:05:00.000Z",
    },
    value,
    authorization: "NONE",
    ...overrides,
  });
}

describe("Track B B2.3a protected-claim boundary", () => {
  it("binds the existing structured fact request to exact current typed evidence", () => {
    const price = productClaim("PRICE");
    const stock = productClaim("STOCK");

    expect(bindRealtimeProtectedClaimProposal({
      requestedClaims: [{ type: "PRICE", productId: "SKU-1" }],
      modelDeclaredClaimIds: [],
      deterministicClaims: [],
      availableClaims: [price, stock],
      expectedProductIds: ["SKU-1"],
      now: NOW,
    })).toEqual({
      claimIds: [PRICE_ID],
      reasonCodes: [],
    });
  });

  it("authorizes only exact declared IDs and preserves NONE side-effect authority", () => {
    const price = productClaim("PRICE");
    const result = authorizeRealtimeProtectedClaimProposal({
      declaredClaimIds: [PRICE_ID],
      observedClaimTypes: ["PRICE"],
      availableClaims: [price],
      expectedProductIds: ["SKU-1"],
      now: NOW,
    });

    expect(result).toEqual({
      outcome: "AUTHORIZED",
      claims: [price],
      reasonCodes: [],
    });
    expect(result.claims.every(({ authorization }) => authorization === "NONE"))
      .toBe(true);
  });

  it.each([
    {
      name: "missing evidence",
      declaredClaimIds: [PRICE_ID],
      claims: [] as unknown[],
      expectedProductIds: ["SKU-1"],
      now: NOW,
      reason: "PROTECTED_CLAIM_EVIDENCE_MISSING:11111111-1111-5111-8111-111111111111",
    },
    {
      name: "undeclared protected type",
      declaredClaimIds: [] as string[],
      claims: [productClaim("PRICE")],
      expectedProductIds: ["SKU-1"],
      now: NOW,
      reason: "PROTECTED_CLAIM_UNDECLARED:PRICE",
    },
    {
      name: "stale provenance",
      declaredClaimIds: [PRICE_ID],
      claims: [productClaim("PRICE")],
      expectedProductIds: ["SKU-1"],
      now: new Date("2026-08-30T03:06:00.000Z"),
      reason: "PROTECTED_CLAIM_STALE:11111111-1111-5111-8111-111111111111",
    },
    {
      name: "future provenance",
      declaredClaimIds: [PRICE_ID],
      claims: [productClaim("PRICE")],
      expectedProductIds: ["SKU-1"],
      now: new Date("2026-08-30T02:58:00.000Z"),
      reason: "PROTECTED_CLAIM_FUTURE:11111111-1111-5111-8111-111111111111",
    },
    {
      name: "product scope mismatch",
      declaredClaimIds: [PRICE_ID],
      claims: [productClaim("PRICE")],
      expectedProductIds: ["SKU-2"],
      now: NOW,
      reason: "PROTECTED_CLAIM_PRODUCT_SCOPE_MISMATCH:11111111-1111-5111-8111-111111111111",
    },
    {
      name: "malformed typed provenance",
      declaredClaimIds: [PRICE_ID],
      claims: [{ ...productClaim("PRICE"), authorization: "EXECUTE" }],
      expectedProductIds: ["SKU-1"],
      now: NOW,
      reason: "PROTECTED_CLAIM_SCHEMA_INVALID:11111111-1111-5111-8111-111111111111",
    },
  ])("fails closed for $name", ({ declaredClaimIds, claims, expectedProductIds, now, reason }) => {
    const result = authorizeRealtimeProtectedClaimProposal({
      declaredClaimIds,
      observedClaimTypes: ["PRICE"],
      availableClaims: claims,
      expectedProductIds,
      now,
    });

    expect(result.outcome).toBe("BLOCKED");
    expect(result.claims).toEqual([]);
    expect(result.reasonCodes).toContain(reason);
  });

  it("rejects product evidence that is not scoped to the selected variant", () => {
    const result = authorizeRealtimeProtectedClaimProposal({
      declaredClaimIds: [PRICE_ID],
      observedClaimTypes: ["PRICE"],
      availableClaims: [productClaim("PRICE")],
      expectedProductIds: ["SKU-1"],
      expectedProductScopes: [{ productId: "SKU-1", variantId: "SKU-1-M-BLACK" }],
      now: NOW,
    });

    expect(result).toEqual({
      outcome: "BLOCKED",
      claims: [],
      reasonCodes: [
        "PROTECTED_CLAIM_VARIANT_SCOPE_MISMATCH:11111111-1111-5111-8111-111111111111",
      ],
    });
  });

  it("rejects the whole proposal rather than partially authorizing mixed evidence", () => {
    const result = authorizeRealtimeProtectedClaimProposal({
      declaredClaimIds: [PRICE_ID, STOCK_ID],
      observedClaimTypes: ["PRICE", "STOCK"],
      availableClaims: [productClaim("PRICE")],
      expectedProductIds: ["SKU-1"],
      now: NOW,
    });

    expect(result.outcome).toBe("BLOCKED");
    expect(result.claims).toEqual([]);
    expect(result.reasonCodes).toEqual([
      "PROTECTED_CLAIM_EVIDENCE_MISSING:22222222-2222-5222-8222-222222222222",
      "PROTECTED_CLAIM_UNDECLARED:STOCK",
    ]);
  });

  it("does not infer or bind a claim from reply text", () => {
    expect(bindRealtimeProtectedClaimProposal({
      requestedClaims: [],
      modelDeclaredClaimIds: [],
      deterministicClaims: [],
      availableClaims: [productClaim("PRICE")],
      expectedProductIds: ["SKU-1"],
      now: NOW,
    })).toEqual({ claimIds: [], reasonCodes: [] });
  });

  it.each([
    "Mẫu này hiện vẫn còn chị nhé.",
    "Mẫu này còn chị nhé.",
    "Sản phẩm này còn ạ.",
    "Hàng hiện còn chị nhé.",
  ])("detects product-subject stock wording only as a rejection signal: %s", (reply) => {
    expect(detectRealtimeUndeclaredProtectedClaimTypes(reply)).toEqual(["STOCK"]);
    expect(bindRealtimeProtectedClaimProposal({
      requestedClaims: [],
      modelDeclaredClaimIds: [],
      deterministicClaims: [],
      defenseObservedClaimTypes: ["STOCK"],
      availableClaims: [productClaim("STOCK")],
      expectedProductIds: ["SKU-1"],
      now: NOW,
    })).toEqual({
      claimIds: [],
      reasonCodes: ["PROTECTED_CLAIM_UNDECLARED:STOCK"],
    });
  });

  it("fails closed when a deterministic shipping producer lacks cart-scoped provenance", () => {
    expect(bindRealtimeProtectedClaimProposal({
      requestedClaims: [],
      modelDeclaredClaimIds: [],
      deterministicClaims: [{ type: "SHIPPING_FEE" }],
      availableClaims: [],
      expectedProductIds: [],
      now: NOW,
    })).toEqual({
      claimIds: [],
      reasonCodes: ["PROTECTED_CLAIM_EVIDENCE_UNAVAILABLE:SHIPPING_FEE"],
    });
  });

  it("binds only the exact requested fact for each product", () => {
    const priceA = productClaim("PRICE");
    const stockA = productClaim("STOCK");
    const priceB = productClaim("PRICE", {
      claimId: "33333333-3333-5333-8333-333333333333",
      scope: { kind: "PRODUCT", productId: "SKU-2", variantId: null },
    });
    const stockB = productClaim("STOCK", {
      claimId: "44444444-4444-5444-8444-444444444444",
      scope: { kind: "PRODUCT", productId: "SKU-2", variantId: null },
    });

    expect(bindRealtimeProtectedClaimProposal({
      requestedClaims: [],
      modelDeclaredClaimIds: [],
      deterministicClaims: [
        { type: "PRICE", productId: "SKU-1" },
        { type: "STOCK", productId: "SKU-2" },
      ],
      availableClaims: [priceA, stockA, priceB, stockB],
      expectedProductIds: ["SKU-1", "SKU-2"],
      now: NOW,
    })).toEqual({
      claimIds: [PRICE_ID, "44444444-4444-5444-8444-444444444444"],
      reasonCodes: [],
    });
  });
});
