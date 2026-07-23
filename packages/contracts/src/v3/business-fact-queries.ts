import { z } from "zod";

export const RequestedBusinessFactV2Schema = z.enum([
  "PRICE",
  "STOCK",
  "SIZE",
  "ETA",
]);
export type RequestedBusinessFactV2 = z.infer<
  typeof RequestedBusinessFactV2Schema
>;

export const BusinessFactQueryV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    queryId: z.string().uuid(),
    productRef: z.object({
      raw: z.string().trim().min(1).max(256),
      productId: z.string().trim().min(1).max(128).nullable(),
      resolution: z.enum(["RESOLVED", "AMBIGUOUS", "NOT_FOUND"]),
    }).strict(),
    requestedFacts: z.array(RequestedBusinessFactV2Schema).min(1).max(4),
    qualifiers: z.object({
      offerType: z.string().trim().min(1).max(64).nullable(),
      color: z.string().trim().min(1).max(64).nullable(),
      size: z.string().trim().min(1).max(32).nullable(),
      deliveryRegion: z.string().trim().min(1).max(128).nullable(),
    }).strict(),
  })
  .strict()
  .superRefine((query, context) => {
    if (new Set(query.requestedFacts).size !== query.requestedFacts.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedFacts"],
        message: "requestedFacts must be unique and preserve request order",
      });
    }
    const resolved = query.productRef.resolution === "RESOLVED";
    if (resolved !== (query.productRef.productId !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productRef", "productId"],
        message: "only RESOLVED product references may carry productId",
      });
    }
  });
export type BusinessFactQueryV2 = z.infer<typeof BusinessFactQueryV2Schema>;

export const BusinessFactQueriesV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    queries: z.array(BusinessFactQueryV2Schema).min(1).max(3),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.queries.map(({ queryId }) => queryId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["queries"],
        message: "queryId must be unique",
      });
    }
  });
export type BusinessFactQueriesV2 = z.infer<typeof BusinessFactQueriesV2Schema>;

