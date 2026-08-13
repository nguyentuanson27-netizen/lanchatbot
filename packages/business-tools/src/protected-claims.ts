import { createHash } from "node:crypto";
import {
  ProtectedClaimV1Schema,
  type BusinessFactEnvelopeV1,
  type CartV1,
  type ProtectedClaimV1,
  type SizeRecommendationProtectedClaimV1,
} from "@lana/contracts";

export type ProtectedClaimBuildReason =
  | "PROTECTED_CLAIM_EXPIRY_REQUIRED"
  | "PROTECTED_CLAIM_SOURCE_UNSUPPORTED"
  | "PROTECTED_CLAIM_PRODUCT_SCOPE_MISMATCH";

export interface BuildProtectedClaimsFromVerifiedFactsV1Input {
  readonly facts: BusinessFactEnvelopeV1 | null;
  readonly sizeClaim: SizeRecommendationProtectedClaimV1 | null;
  readonly expectedProductId?: string | null;
}

export interface BuildProtectedClaimsFromVerifiedFactSetV1Input {
  readonly facts: readonly BusinessFactEnvelopeV1[];
  readonly sizeClaim: SizeRecommendationProtectedClaimV1 | null;
  readonly expectedSizeProductId?: string | null;
}

export interface ProtectedClaimBuildResultV1 {
  readonly claims: readonly ProtectedClaimV1[];
  readonly reasonCodes: readonly ProtectedClaimBuildReason[];
}

export interface VerifiedCartSelectionClaimSourceV1 {
  readonly productId: string;
  readonly variantId: string | null;
  readonly priceVnd: number;
  readonly priceVersion: string;
  readonly inventoryVersion: string;
  readonly etaVersion: string | null;
  readonly eta: { readonly minDays: number; readonly maxDays: number } | null;
  readonly etaExpiresAt: string | null;
  readonly sourceAuthority: "POS_LIVE" | "POS_SNAPSHOT";
  readonly stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PRE_ORDER" | "COMING_SOON" | "UNKNOWN";
  readonly stockAvailableQuantity: number | null;
  readonly observedAt: string;
  readonly expiresAt: string;
}

export interface BuildProtectedCartPolicyClaimsV1Input {
  readonly cart: Pick<
    CartV1,
    "cartId" | "revision" | "adjustments" | "shippingFeeVnd" | "updatedAt"
  >;
  readonly policySourceVersion: string;
  readonly policyEvidenceRef: string;
  readonly expiresAt: string;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function deterministicUuid(seed: unknown): string {
  const hash = sha256(seed);
  const variant = ((Number.parseInt(hash[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function hashProtectedClaimSetV1(
  claims: readonly ProtectedClaimV1[],
): string {
  return sha256([...claims]
    .sort((left, right) => left.claimId.localeCompare(right.claimId))
    .map((claim) => claim));
}

export function buildProtectedCartPolicyClaimsV1(
  input: BuildProtectedCartPolicyClaimsV1Input,
): readonly ProtectedClaimV1[] {
  const { cart } = input;
  const scope = {
    kind: "CART" as const,
    cartId: cart.cartId,
    cartVersion: cart.revision,
  };
  const provenance = (field: string, value: unknown) => ({
    authority: "CART_POLICY_V1" as const,
    sourceVersion: input.policySourceVersion,
    evidenceRef: `${input.policyEvidenceRef}:${field}:${sha256(value)}`,
    contentHash: sha256(value),
    observedAt: cart.updatedAt,
    expiresAt: input.expiresAt,
  });
  const claims: ProtectedClaimV1[] = [];
  const freeShipping = cart.adjustments.some(({ kind }) => kind === "FREE_SHIPPING") ||
    cart.shippingFeeVnd === 0;
  if (freeShipping) {
    claims.push(ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: deterministicUuid([cart.cartId, cart.revision, "FREESHIP"]),
      type: "FREESHIP",
      scope,
      provenance: provenance("freeship", true),
      value: { eligible: true },
      authorization: "NONE",
    }));
  } else if (cart.shippingFeeVnd !== null) {
    claims.push(ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: deterministicUuid([cart.cartId, cart.revision, "SHIPPING_FEE", cart.shippingFeeVnd]),
      type: "SHIPPING_FEE",
      scope,
      provenance: provenance("shippingFeeVnd", cart.shippingFeeVnd),
      value: { amountVnd: cart.shippingFeeVnd, currency: "VND" },
      authorization: "NONE",
    }));
  }
  for (const adjustment of cart.adjustments) {
    if (adjustment.kind === "FREE_SHIPPING") continue;
    claims.push(ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: deterministicUuid([cart.cartId, cart.revision, "PROMOTION_OFFER", adjustment.adjustmentId]),
      type: "PROMOTION_OFFER",
      scope,
      provenance: provenance(`adjustment:${adjustment.adjustmentId}`, adjustment),
      value: {
        adjustmentId: adjustment.adjustmentId,
        amountVnd: adjustment.amountVnd,
      },
      authorization: "NONE",
    }));
  }
  return claims.sort((left, right) => left.type.localeCompare(right.type) ||
    left.claimId.localeCompare(right.claimId));
}

export function buildProtectedClaimsFromVerifiedFactsV1(
  input: BuildProtectedClaimsFromVerifiedFactsV1Input,
): ProtectedClaimBuildResultV1 {
  const claims: ProtectedClaimV1[] = [];
  const reasonCodes = new Set<ProtectedClaimBuildReason>();
  const facts = input.facts;
  if (facts?.status === "OK" && facts.facts !== null) {
    if (
      input.expectedProductId &&
      facts.productId !== input.expectedProductId
    ) {
      reasonCodes.add("PROTECTED_CLAIM_PRODUCT_SCOPE_MISMATCH");
    } else if (facts.expiresAt === null) {
      reasonCodes.add("PROTECTED_CLAIM_EXPIRY_REQUIRED");
    } else if (facts.source !== "POS_LIVE" && facts.source !== "POS_SNAPSHOT") {
      reasonCodes.add("PROTECTED_CLAIM_SOURCE_UNSUPPORTED");
    } else {
      const provenance = (field: string, value: unknown) => ({
        authority: facts.source,
        sourceVersion: `${facts.source}:${facts.observedAt}`,
        evidenceRef: `business-fact:${field}:${sha256([
          facts.productId,
          facts.source,
          facts.observedAt,
          value,
        ])}`,
        contentHash: sha256(value),
        observedAt: facts.observedAt,
        expiresAt: facts.expiresAt!,
      });
      const scope = {
        kind: "PRODUCT" as const,
        productId: facts.productId,
        variantId: null,
      };
      const price = facts.facts.salePriceVnd ?? facts.facts.listPriceVnd;
      if (price !== null) {
        claims.push(ProtectedClaimV1Schema.parse({
          schemaVersion: 1,
          claimId: deterministicUuid([facts.productId, "PRICE", price, facts.observedAt]),
          type: "PRICE",
          scope,
          provenance: provenance("price", price),
          value: { amountVnd: price, currency: "VND" },
          authorization: "NONE",
        }));
      }
      claims.push(ProtectedClaimV1Schema.parse({
        schemaVersion: 1,
        claimId: deterministicUuid([
          facts.productId,
          "STOCK",
          facts.facts.stockStatus,
          facts.facts.stockQuantity,
          facts.observedAt,
        ]),
        type: "STOCK",
        scope,
        provenance: provenance("stock", [
          facts.facts.stockStatus,
          facts.facts.stockQuantity,
        ]),
        value: {
          status: facts.facts.stockStatus,
          availableQuantity: facts.facts.stockQuantity,
        },
        authorization: "NONE",
      }));
      if (facts.facts.deliveryEta !== null) {
        claims.push(ProtectedClaimV1Schema.parse({
          schemaVersion: 1,
          claimId: deterministicUuid([
            facts.productId,
            "ETA",
            facts.facts.deliveryEta,
            facts.observedAt,
          ]),
          type: "ETA",
          scope,
          provenance: provenance("deliveryEta", facts.facts.deliveryEta),
          value: facts.facts.deliveryEta,
          authorization: "NONE",
        }));
      }
    }
  }
  const sizeClaim = input.sizeClaim;
  if (sizeClaim !== null) {
    const expectedProductId = input.expectedProductId ?? facts?.productId ?? null;
    if (expectedProductId !== null && sizeClaim.productId !== expectedProductId) {
      reasonCodes.add("PROTECTED_CLAIM_PRODUCT_SCOPE_MISMATCH");
    } else {
      claims.push(ProtectedClaimV1Schema.parse({
        schemaVersion: 1,
        claimId: sizeClaim.id,
        type: "SIZE_FIT",
        scope: {
          kind: "PRODUCT",
          productId: sizeClaim.productId,
          variantId: sizeClaim.variantId,
        },
        provenance: {
          authority: "VERIFIED_SIZE_ENGINE_V1",
          sourceVersion: `VERIFIED_SIZE_ENGINE_V1:${sizeClaim.observedAt}`,
          evidenceRef: sizeClaim.evidenceRef,
          contentHash: sha256(sizeClaim),
          observedAt: sizeClaim.observedAt,
          expiresAt: sizeClaim.expiresAt,
        },
        value: {
          recommendedSizes: sizeClaim.value.recommendedSizes,
          alternativeSizes: sizeClaim.value.alternativeSizes,
          customerProfileId: sizeClaim.customerProfileId,
          customerProfileRevision: sizeClaim.customerProfileRevision,
          measurementFingerprint: sizeClaim.measurementFingerprint,
          evidenceBasis: sizeClaim.evidenceBasis.kind === "CURRENT_MEASUREMENTS"
            ? "MEASUREMENTS"
            : "PAST_SIZE",
        },
        authorization: "NONE",
      }));
    }
  }
  return {
    claims: claims.sort((left, right) => left.type.localeCompare(right.type)),
    reasonCodes: [...reasonCodes].sort(),
  };
}

/**
 * The only aggregation boundary for protected claims backed by product facts.
 * A multi-product reply must retain every verified product scope; duplicate
 * fact envelopes are collapsed by their deterministic claim identity.
 */
export function buildProtectedClaimsFromVerifiedFactSetV1(
  input: BuildProtectedClaimsFromVerifiedFactSetV1Input,
): ProtectedClaimBuildResultV1 {
  const claimsById = new Map<string, ProtectedClaimV1>();
  const reasonCodes = new Set<ProtectedClaimBuildReason>();
  const append = (result: ProtectedClaimBuildResultV1) => {
    for (const claim of result.claims) claimsById.set(claim.claimId, claim);
    for (const reasonCode of result.reasonCodes) reasonCodes.add(reasonCode);
  };

  for (const facts of input.facts) {
    append(buildProtectedClaimsFromVerifiedFactsV1({
      facts,
      sizeClaim: null,
      expectedProductId: facts.productId,
    }));
  }
  append(buildProtectedClaimsFromVerifiedFactsV1({
    facts: null,
    sizeClaim: input.sizeClaim,
    expectedProductId: input.expectedSizeProductId ?? null,
  }));

  return {
    claims: [...claimsById.values()].sort((left, right) =>
      left.type.localeCompare(right.type) || left.claimId.localeCompare(right.claimId)
    ),
    reasonCodes: [...reasonCodes].sort(),
  };
}

export function buildProtectedClaimsFromCartSelectionsV1(
  selections: readonly VerifiedCartSelectionClaimSourceV1[],
): readonly ProtectedClaimV1[] {
  const claims: ProtectedClaimV1[] = [];
  for (const selection of selections) {
    const scope = {
      kind: "PRODUCT" as const,
      productId: selection.productId,
      variantId: selection.variantId,
    };
    const provenance = (
      kind: string,
      sourceVersion: string,
      value: unknown,
      expiresAt = selection.expiresAt,
    ) => ({
      authority: selection.sourceAuthority,
      sourceVersion,
      evidenceRef: `cart-selection:${kind}:${sha256([selection.productId, sourceVersion, value])}`,
      contentHash: sha256(value),
      observedAt: selection.observedAt,
      expiresAt,
    });
    claims.push(ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: deterministicUuid([selection.productId, selection.variantId, "PRICE", selection.priceVersion]),
      type: "PRICE",
      scope,
      provenance: provenance("price", selection.priceVersion, selection.priceVnd),
      value: { amountVnd: selection.priceVnd, currency: "VND" },
      authorization: "NONE",
    }));
    claims.push(ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: deterministicUuid([selection.productId, selection.variantId, "STOCK", selection.inventoryVersion]),
      type: "STOCK",
      scope,
      provenance: provenance("stock", selection.inventoryVersion, {
        status: selection.stockStatus,
        availableQuantity: selection.stockAvailableQuantity,
      }),
      value: {
        status: selection.stockStatus,
        availableQuantity: selection.stockAvailableQuantity,
      },
      authorization: "NONE",
    }));
    if (selection.eta !== null && selection.etaVersion !== null) {
      claims.push(ProtectedClaimV1Schema.parse({
        schemaVersion: 1,
        claimId: deterministicUuid([selection.productId, selection.variantId, "ETA", selection.etaVersion]),
        type: "ETA",
        scope,
        provenance: provenance(
          "eta",
          selection.etaVersion,
          selection.eta,
          selection.etaExpiresAt ?? selection.expiresAt,
        ),
        value: selection.eta,
        authorization: "NONE",
      }));
    }
  }
  return claims.sort((left, right) =>
    `${left.scope.kind}:${left.type}:${left.claimId}`.localeCompare(
      `${right.scope.kind}:${right.type}:${right.claimId}`,
    )
  );
}

export function buildProtectedMediaClaimsV1(input: Readonly<{
  productId: string;
  imageUrls: readonly string[];
  sourceVersion: string;
  observedAt: string;
  expiresAt: string;
}>): readonly ProtectedClaimV1[] {
  return [...new Set(input.imageUrls)].map((imageUrl) => {
    const assetSha256 = sha256(imageUrl);
    return ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: deterministicUuid([input.productId, "PRODUCT_MEDIA", assetSha256]),
      type: "PRODUCT_MEDIA",
      scope: { kind: "PRODUCT", productId: input.productId, variantId: null },
      provenance: {
        authority: "MEDIA_SELECTOR_V2",
        sourceVersion: input.sourceVersion,
        evidenceRef: `media-selector:${assetSha256}`,
        contentHash: assetSha256,
        observedAt: input.observedAt,
        expiresAt: input.expiresAt,
      },
      value: { assetId: `media-${assetSha256.slice(0, 32)}`, assetSha256 },
      authorization: "NONE",
    });
  }).sort((left, right) => left.claimId.localeCompare(right.claimId));
}
