import { z } from "zod";

export const MAX_CANONICAL_PRODUCT_IDS_PER_EFFECT_V1 = 1_000;

function normalizeCanonicalProductIdIngressV1(value: string): string {
  return value.trim().normalize("NFC");
}

/**
 * Product identity is exact and already canonical at typed boundaries.
 * Callers must use canonicalizeProductIdsV1 once at untyped ingress; schemas
 * never trim or normalize implicitly because that would change authority scope.
 */
export const CanonicalProductIdV1Schema = z.string()
  .min(1)
  .max(128)
  .superRefine((value, context) => {
    if (value !== normalizeCanonicalProductIdIngressV1(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "canonical product ID must use exact NFC without boundary whitespace",
      });
    }
  });
export type CanonicalProductIdV1 = z.infer<typeof CanonicalProductIdV1Schema>;

export function canonicalizeProductIdsV1(input: unknown): Readonly<{
  productIds: readonly CanonicalProductIdV1[];
  unresolved: boolean;
  invalid: boolean;
}> {
  if (!Array.isArray(input)) {
    return { productIds: [], unresolved: true, invalid: true };
  }

  // Reject before reading entries so a hostile oversized scope cannot turn a
  // fail-closed decision into work proportional to attacker-controlled input.
  if (input.length > MAX_CANONICAL_PRODUCT_IDS_PER_EFFECT_V1) {
    return { productIds: [], unresolved: true, invalid: true };
  }

  let invalid = false;
  const canonical: string[] = [];
  for (const candidate of input) {
    if (typeof candidate !== "string") {
      invalid = true;
      continue;
    }
    const normalized = normalizeCanonicalProductIdIngressV1(candidate);
    if (normalized !== candidate) invalid = true;
    if (!CanonicalProductIdV1Schema.safeParse(normalized).success) {
      invalid = true;
      continue;
    }
    canonical.push(normalized);
  }

  const productIds = [...new Set(canonical)].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0
  );
  if (productIds.length !== canonical.length) invalid = true;
  return {
    productIds: productIds as CanonicalProductIdV1[],
    unresolved: productIds.length === 0,
    invalid,
  };
}
