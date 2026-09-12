import { createHash } from "node:crypto";
import {
  ProductAttributesDataV1Schema,
  ProductAttributesV1Schema,
  canonicalJsonV1,
  type ProductAttributesDataV1,
  type ProductAttributesV1,
} from "@lana/contracts";

function contentHash(productId: string, data: ProductAttributesDataV1): string {
  return createHash("sha256").update(
    `PRODUCT_ATTRIBUTES_V1\n${canonicalJsonV1({ productId, ...data })}`,
    "utf8",
  ).digest("hex");
}

export function buildProductAttributesV1(input: Readonly<{
  productId: string;
  data: ProductAttributesDataV1;
  observedAt: string;
}>): ProductAttributesV1 {
  const data = ProductAttributesDataV1Schema.parse(input.data);
  const hash = contentHash(input.productId, data);
  return ProductAttributesV1Schema.parse({
    schemaVersion: 1,
    productId: input.productId,
    ...data,
    metadata: {
      authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
      sourceVersion: `product-registry-attributes:${hash}`,
      observedAt: input.observedAt,
      expiresAt: null,
      freshForSeconds: null,
      freshnessState: "FRESH",
      contentHash: hash,
    },
  });
}

export function verifyProductAttributesV1(
  value: unknown,
  expectedProductId: string,
): ProductAttributesV1 | null {
  const parsed = ProductAttributesV1Schema.safeParse(value);
  if (!parsed.success || parsed.data.productId !== expectedProductId) return null;
  const { schemaVersion: _schemaVersion, productId, metadata, ...data } = parsed.data;
  return contentHash(productId, data) === metadata.contentHash ? parsed.data : null;
}
