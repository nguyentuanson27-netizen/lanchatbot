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

const ReplyReconciliationExtensionV1Schema = z.object({
  replyReconciliationPolicy: ReplyReconciliationPolicyV1Schema.optional(),
  replyReconciliationFallbackText: z.string().trim().min(1).max(500).optional(),
}).strict().superRefine((value, context) => {
  if (value.replyReconciliationPolicy === undefined) {
    if (value.replyReconciliationFallbackText !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["replyReconciliationFallbackText"],
        message: "fallback text requires a reply reconciliation policy",
      });
    }
    return;
  }
  if (value.replyReconciliationPolicy === "LEGACY") {
    if (value.replyReconciliationFallbackText !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["replyReconciliationFallbackText"],
        message: "LEGACY reply reconciliation cannot define fallback text",
      });
    }
    return;
  }
  if (value.replyReconciliationFallbackText === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["replyReconciliationFallbackText"],
      message: "CLARIFY_RECONCILED_V1 requires approved fallback text",
    });
  }
});

/**
 * BF-01 adds an optional, versioned reply-reconciliation selection to the
 * existing immutable CLOSING_STRATEGY artifact. Legacy parsing remains the
 * normalization authority; BF-01 fields are parsed separately and merged only
 * after the legacy schema succeeds.
 */
export const ClosingStrategyAdminContentV1Schema = z.unknown().transform(
  (value, context): ClosingStrategyAdminContentV1 => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "closing strategy must be an object",
      });
      return z.NEVER;
    }

    const record = { ...(value as Record<string, unknown>) };
    const extensionInput: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(record, "replyReconciliationPolicy")) {
      extensionInput.replyReconciliationPolicy = record.replyReconciliationPolicy;
      delete record.replyReconciliationPolicy;
    }
    if (Object.prototype.hasOwnProperty.call(record, "replyReconciliationFallbackText")) {
      extensionInput.replyReconciliationFallbackText =
        record.replyReconciliationFallbackText;
      delete record.replyReconciliationFallbackText;
    }

    const legacy = LegacyClosingStrategyAdminContentV1Schema.safeParse(record);
    if (!legacy.success) {
      for (const issue of legacy.error.issues) context.addIssue({ ...issue });
      return z.NEVER;
    }
    const extension = ReplyReconciliationExtensionV1Schema.safeParse(extensionInput);
    if (!extension.success) {
      for (const issue of extension.error.issues) context.addIssue({ ...issue });
      return z.NEVER;
    }
    return {
      ...legacy.data,
      ...(extension.data.replyReconciliationPolicy === undefined
        ? {}
        : { replyReconciliationPolicy: extension.data.replyReconciliationPolicy }),
      ...(extension.data.replyReconciliationFallbackText === undefined
        ? {}
        : {
            replyReconciliationFallbackText:
              extension.data.replyReconciliationFallbackText,
          }),
    };
  },
) as z.ZodType<ClosingStrategyAdminContentV1>;

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
