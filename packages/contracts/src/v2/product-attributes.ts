import { z } from "zod";
import { CanonicalProductIdV1Schema } from "./canonical-identifiers.js";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const AttributeTokenSchema = z.string().trim().min(1).max(160).refine(
  (value) => value.toUpperCase() !== "UNKNOWN",
  "UNKNOWN is not verified product attribute data",
);

function uniqueTokens(max: number) {
  return z.array(AttributeTokenSchema).max(max).superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "attribute values must be unique" });
    }
  });
}

export const ProductMaterialComponentsV1Schema = z.object({
  AO_DAI: uniqueTokens(12).optional(),
  AO: uniqueTokens(12).optional(),
  CHAN_VAY: uniqueTokens(12).optional(),
  QUAN: uniqueTokens(12).optional(),
  VAY: uniqueTokens(12).optional(),
  PHU_KIEN: uniqueTokens(12).optional(),
  LOT: uniqueTokens(12).optional(),
}).strict();

export const ProductDesignAttributesV1Schema = z.object({
  neckline: uniqueTokens(12).optional(),
  sleeve: uniqueTokens(12).optional(),
  waist: uniqueTokens(12).optional(),
  closure: uniqueTokens(12).optional(),
  length: uniqueTokens(12).optional(),
  lining: uniqueTokens(12).optional(),
  details: uniqueTokens(24).optional(),
  silhouette: uniqueTokens(12).optional(),
}).strict();

export const ProductWearPropertiesV1Schema = z.object({
  stretch: z.enum(["LIGHT", "FLEXIBLE", "PRESENT"]).nullable(),
  wrinkleResistance: z.literal("REDUCED_WRINKLING").nullable(),
  opacity: z.enum(["PARTIAL", "SHEER", "OPAQUE"]).nullable(),
  lining: z.literal("PRESENT").nullable(),
  breathability: z.literal("PRESENT").nullable(),
}).strict();

export const ProductAttributesDataV1Schema = z.object({
  materials: uniqueTokens(24),
  materialComponents: ProductMaterialComponentsV1Schema,
  colors: uniqueTokens(24),
  styles: uniqueTokens(24),
  silhouettes: uniqueTokens(24),
  occasions: uniqueTokens(24),
  designAttributes: ProductDesignAttributesV1Schema.nullable(),
  careInstructions: z.string().trim().min(1).max(4_000).nullable(),
  wearProperties: ProductWearPropertiesV1Schema.nullable(),
  backCoverage: z.enum(["OPEN", "PARTIAL", "FULL"]).nullable(),
  designComplexity: z.enum(["MINIMAL", "ORNATE"]).nullable(),
}).strict();

export const ProductAttributesMetadataV1Schema = z.object({
  authority: z.literal("GOOGLE_SHEETS_PRODUCT_REGISTRY"),
  sourceVersion: z.string().regex(/^product-registry-attributes:[a-f0-9]{64}$/u),
  observedAt: z.string().datetime(),
  expiresAt: z.null(),
  freshForSeconds: z.null(),
  freshnessState: z.enum(["FRESH", "STALE", "UNKNOWN"]),
  contentHash: Sha256Schema,
}).strict().superRefine((value, context) => {
  if (value.sourceVersion !== `product-registry-attributes:${value.contentHash}`) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceVersion"],
      message: "attribute source version must bind its content hash",
    });
  }
});

export const ProductAttributesV1Schema = ProductAttributesDataV1Schema.extend({
  schemaVersion: z.literal(1),
  productId: CanonicalProductIdV1Schema,
  metadata: ProductAttributesMetadataV1Schema,
}).strict();

export type ProductAttributesDataV1 = z.infer<typeof ProductAttributesDataV1Schema>;
export type ProductAttributesV1 = z.infer<typeof ProductAttributesV1Schema>;
export type ProductDesignAttributesV1 = z.infer<typeof ProductDesignAttributesV1Schema>;
export type ProductWearPropertiesV1 = z.infer<typeof ProductWearPropertiesV1Schema>;
