import { z } from "zod";
import {
  FactFreshnessSchema,
  ProductContentMetadataV1Schema,
  ProductIdentityMetadataV1Schema,
  PosPriceInventoryMetadataV1Schema,
} from "./product-policy-media.js";
import { CanonicalProductIdV1Schema } from "./canonical-identifiers.js";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const ProductPresentationVariantV1Schema = z.object({
  variantId: CanonicalProductIdV1Schema,
  color: z.string().trim().min(1).max(64).nullable(),
  size: z.string().trim().min(1).max(32).nullable(),
}).strict();

export const ProductPresentationEvidenceV1Schema = z.object({
  schemaVersion: z.literal(1),
  productId: CanonicalProductIdV1Schema,
  displayName: z.string().trim().min(1).max(500),
  variants: z.array(ProductPresentationVariantV1Schema).max(1_000),
  provenance: z.object({
    identity: ProductIdentityMetadataV1Schema,
    content: ProductContentMetadataV1Schema,
    inventory: PosPriceInventoryMetadataV1Schema,
    freshnessState: FactFreshnessSchema,
    contentHash: Sha256Schema,
  }).strict(),
}).strict().superRefine((value, context) => {
  const ids = value.variants.map(({ variantId }) => variantId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["variants"],
      message: "presentation variant IDs must be unique",
    });
  }
});

export type ProductPresentationEvidenceV1 = z.infer<
  typeof ProductPresentationEvidenceV1Schema
>;
