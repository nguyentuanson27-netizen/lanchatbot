import { createHash } from "node:crypto";
import {
  CanonicalProductIdV1Schema,
  ProductContentV1Schema,
  ProductIdentityV2Schema,
  ProductInventoryV2Schema,
  ProductPresentationEvidenceV1Schema,
  canonicalJsonV1,
  type ProductFactsV2,
  type ProductPresentationEvidenceV1,
} from "@lana/contracts";

export function hashProductPresentationEvidenceV1(
  input: Readonly<{
    value: Omit<ProductPresentationEvidenceV1, "schemaVersion" | "provenance">;
    sources: Pick<
      ProductPresentationEvidenceV1["provenance"],
      "identity" | "content" | "inventory"
    >;
  }>,
): string {
  return createHash("sha256").update(
    `PRODUCT_PRESENTATION_EVIDENCE_V1\n${canonicalJsonV1({
      ...input.value,
      sources: input.sources,
    })}`,
    "utf8",
  ).digest("hex");
}

function isFreshAt(
  metadata: ProductFactsV2["identity"]["metadata"] |
    ProductFactsV2["content"]["metadata"] |
    ProductFactsV2["inventory"]["metadata"],
  now: Date,
): boolean {
  if (metadata.freshnessState !== "FRESH") return false;
  const observedAt = Date.parse(metadata.observedAt);
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(observedAt) ||
      observedAt > now.getTime() + 5 * 60_000) return false;
  return metadata.expiresAt === null || Date.parse(metadata.expiresAt) > now.getTime();
}

export function buildProductPresentationEvidenceV1(
  rawSource: unknown,
  now: Date,
): ProductPresentationEvidenceV1 | null {
  if (rawSource === null || typeof rawSource !== "object" ||
      Array.isArray(rawSource)) return null;
  const source = rawSource as Readonly<Record<string, unknown>>;
  const productId = CanonicalProductIdV1Schema.safeParse(source.productId);
  const identity = ProductIdentityV2Schema.safeParse(source.identity);
  const content = ProductContentV1Schema.safeParse(source.content);
  const inventory = ProductInventoryV2Schema.safeParse(source.inventory);
  if (!productId.success || !identity.success || !content.success ||
      !inventory.success || identity.data.parentProductId !== productId.data ||
      !identity.data.active || !isFreshAt(identity.data.metadata, now) ||
      !isFreshAt(content.data.metadata, now) ||
      !isFreshAt(inventory.data.metadata, now)) return null;
  const value = {
    productId: productId.data,
    displayName: content.data.productName,
    variants: inventory.data.variants.map(({ variantId, color, size }) =>
      ({ variantId, color, size })
    ),
  };
  const sources = {
    identity: identity.data.metadata,
    content: content.data.metadata,
    inventory: inventory.data.metadata,
  };
  return ProductPresentationEvidenceV1Schema.parse({
    schemaVersion: 1,
    ...value,
    provenance: {
      ...sources,
      freshnessState: "FRESH",
      contentHash: hashProductPresentationEvidenceV1({ value, sources }),
    },
  });
}

export function verifyProductPresentationEvidenceV1(
  raw: unknown,
  expectedProductId: string,
): ProductPresentationEvidenceV1 | null {
  const parsed = ProductPresentationEvidenceV1Schema.safeParse(raw);
  if (!parsed.success || parsed.data.productId !== expectedProductId ||
      parsed.data.provenance.freshnessState !== "FRESH" ||
      parsed.data.provenance.identity.freshnessState !== "FRESH" ||
      parsed.data.provenance.content.freshnessState !== "FRESH" ||
      parsed.data.provenance.inventory.freshnessState !== "FRESH") return null;
  const { schemaVersion: _schemaVersion, provenance, ...value } = parsed.data;
  const expectedHash = hashProductPresentationEvidenceV1({
    value,
    sources: {
      identity: provenance.identity,
      content: provenance.content,
      inventory: provenance.inventory,
    },
  });
  return expectedHash === provenance.contentHash ? parsed.data : null;
}
