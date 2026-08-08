import { z } from "zod";
import {
  AdminArtifactKindV1Schema,
  AdminArtifactLifecycleV1Schema,
  ClosingStrategyAdminContentV1Schema as LegacyClosingStrategyAdminContentV1Schema,
  HandoffMatrixAdminContentV1Schema,
  OfferPolicyAdminContentV1Schema,
  PaymentPolicyAdminContentV1Schema,
  ShopPolicyAdminContentV1Schema,
  SizeChartAdminContentV1Schema,
} from "./admin-policy-control-base.js";

export * from "./admin-policy-control-base.js";

export const ReplyReconciliationPolicyV1Schema = z.enum([
  "LEGACY",
  "CLARIFY_RECONCILED_V1",
]);
export type ReplyReconciliationPolicyV1 = z.infer<
  typeof ReplyReconciliationPolicyV1Schema
>;

type LegacyClosingStrategyAdminContentV1 = z.infer<
  typeof LegacyClosingStrategyAdminContentV1Schema
>;

export type ClosingStrategyAdminContentV1 =
  LegacyClosingStrategyAdminContentV1 & Readonly<{
    replyReconciliationPolicy?: ReplyReconciliationPolicyV1;
    replyReconciliationFallbackText?: string;
  }>;

/**
 * BF-01 adds an optional, versioned reply-reconciliation selection to the
 * existing immutable CLOSING_STRATEGY artifact. Legacy artifacts remain valid.
 * The fallback text is required only for the reconciled mode and is used only
 * after one bounded model repair fails; runtime guards still validate it.
 */
export const ClosingStrategyAdminContentV1Schema: z.ZodType<
  ClosingStrategyAdminContentV1
> = z.custom<ClosingStrategyAdminContentV1>((value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = { ...(value as Record<string, unknown>) };
  const policy = record.replyReconciliationPolicy;
  const fallback = record.replyReconciliationFallbackText;
  delete record.replyReconciliationPolicy;
  delete record.replyReconciliationFallbackText;

  if (!LegacyClosingStrategyAdminContentV1Schema.safeParse(record).success) {
    return false;
  }
  if (policy === undefined) return fallback === undefined;
  if (!ReplyReconciliationPolicyV1Schema.safeParse(policy).success) return false;
  if (policy === "LEGACY") return fallback === undefined;
  return typeof fallback === "string" &&
    fallback.trim().length >= 1 &&
    fallback.trim().length <= 500;
});

export const AdminArtifactContentV1Schema = z.union([
  ShopPolicyAdminContentV1Schema,
  OfferPolicyAdminContentV1Schema,
  ClosingStrategyAdminContentV1Schema,
  SizeChartAdminContentV1Schema,
  HandoffMatrixAdminContentV1Schema,
  PaymentPolicyAdminContentV1Schema,
]);
export type AdminArtifactContentV1 = z.infer<typeof AdminArtifactContentV1Schema>;

export const AdminArtifactVersionV1Schema = z.object({
  schemaVersion: z.literal(1),
  versionId: z.string().uuid(),
  artifactKey: z.string().trim().min(1).max(128),
  artifactKind: AdminArtifactKindV1Schema,
  versionNumber: z.number().int().positive(),
  lifecycle: AdminArtifactLifecycleV1Schema,
  revision: z.number().int().nonnegative(),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  content: AdminArtifactContentV1Schema,
  createdBy: z.string().trim().min(1).max(256),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict().superRefine((value, context) => {
  if (value.artifactKind !== value.content.kind) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["content", "kind"],
      message: "artifact kind mismatch",
    });
  }
});
export type AdminArtifactVersionV1 = z.infer<typeof AdminArtifactVersionV1Schema>;
