import { z } from "zod";

// Contracts for the AI Evaluation & Dataset Review module. These are the stable
// domain/import/AI-output contracts that the store, admin-api, worker and
// frontend all share. The frontend renders labels from LabelSchemaV1 fetched
// from the backend; it never hard-codes Wave 1 labels.

export const DatasetSourceTypeV1Schema = z.enum([
  "REDIS_TRANSCRIPT_JSON",
  "JSONL",
  "CSV",
  "PRODUCTION_SAMPLE",
]);
export type DatasetSourceTypeV1 = z.infer<typeof DatasetSourceTypeV1Schema>;

export const DatasetStatusV1Schema = z.enum([
  "IMPORTING",
  "READY",
  "FAILED",
  "ARCHIVED",
]);
export type DatasetStatusV1 = z.infer<typeof DatasetStatusV1Schema>;

export const MessageRoleV1Schema = z.enum(["CUSTOMER", "SHOP", "UNKNOWN"]);
export type MessageRoleV1 = z.infer<typeof MessageRoleV1Schema>;

export const LengthBinV1Schema = z.enum(["1_5", "6_10", "11_20", "OVER_20"]);
export type LengthBinV1 = z.infer<typeof LengthBinV1Schema>;

export const AnnotationScopeV1Schema = z.enum([
  "CUSTOMER_MESSAGE",
  "SHOP_MESSAGE",
  "CONVERSATION",
  "SEQUENCE",
]);
export type AnnotationScopeV1 = z.infer<typeof AnnotationScopeV1Schema>;

export const AnnotationConfidenceV1Schema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type AnnotationConfidenceV1 = z.infer<typeof AnnotationConfidenceV1Schema>;

export const AnnotationSourceV1Schema = z.enum([
  "HEURISTIC",
  "AI",
  "HUMAN",
  "ADJUDICATOR",
]);
export type AnnotationSourceV1 = z.infer<typeof AnnotationSourceV1Schema>;

export const AnnotationStatusV1Schema = z.enum([
  "PROPOSED",
  "ACCEPTED",
  "REJECTED",
  "EDITED",
  "ADJUDICATED",
]);
export type AnnotationStatusV1 = z.infer<typeof AnnotationStatusV1Schema>;

export const SplitV1Schema = z.enum([
  "DEVELOPMENT",
  "VALIDATION",
  "HOLDOUT",
  "RARE_SAFETY",
]);
export type SplitV1 = z.infer<typeof SplitV1Schema>;

export const ReviewModeV1Schema = z.enum(["AI_ASSISTED", "BLIND", "DOUBLE_BLIND"]);
export type ReviewModeV1 = z.infer<typeof ReviewModeV1Schema>;

export const AnnotationModeV1Schema = z.enum(["MESSAGE", "CONVERSATION", "SEQUENCE"]);
export type AnnotationModeV1 = z.infer<typeof AnnotationModeV1Schema>;

// A label code is UPPER_SNAKE (matches the DB CHECK on dataset_annotations).
export const LabelCodeV1Schema = z
  .string()
  .regex(/^[A-Z0-9_]{1,64}$/u, "label code must be UPPER_SNAKE");
export type LabelCodeV1 = z.infer<typeof LabelCodeV1Schema>;

// One dynamic label definition. Rendered by the frontend from the backend
// schema. displayOrder controls form order; mutuallyExclusiveGroup and parentCode
// drive validation/hierarchy.
export const LabelDefinitionV1Schema = z
  .object({
    code: LabelCodeV1Schema,
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2_000).default(""),
    scope: AnnotationScopeV1Schema,
    evidenceRequired: z.boolean(),
    confidenceRequired: z.boolean(),
    mutuallyExclusiveGroup: z.string().trim().min(1).max(64).nullable().default(null),
    parentCode: LabelCodeV1Schema.nullable().default(null),
    isSafetyCritical: z.boolean().default(false),
    isActive: z.boolean().default(true),
    displayOrder: z.number().int().min(0).max(10_000),
  })
  .strict();
export type LabelDefinitionV1 = z.infer<typeof LabelDefinitionV1Schema>;

// The full versioned schema document stored in dataset_label_schemas.schema_json.
export const LabelSchemaV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().trim().min(1).max(200),
    version: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/u),
    guidelineVersion: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/u),
    labels: z.array(LabelDefinitionV1Schema).min(1).max(500),
  })
  .strict()
  .superRefine((value, context) => {
    const codes = new Set<string>();
    for (const [index, label] of value.labels.entries()) {
      if (codes.has(label.code)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["labels", index, "code"],
          message: `duplicate label code ${label.code}`,
        });
      }
      codes.add(label.code);
    }
    for (const [index, label] of value.labels.entries()) {
      if (label.parentCode !== null && !codes.has(label.parentCode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["labels", index, "parentCode"],
          message: `parentCode ${label.parentCode} is not defined in this schema`,
        });
      }
    }
  });
export type LabelSchemaV1 = z.infer<typeof LabelSchemaV1Schema>;

// Evidence attached to a semantic annotation. Offsets are optional at model
// output time (§5.3): the model returns turnIndex + evidenceText, and the
// backend computes offsets by exact-matching evidenceText inside the message.
export const AnnotationEvidenceV1Schema = z
  .object({
    turnIndex: z.number().int().min(0),
    messageId: z.string().min(1).max(128),
    evidenceText: z.string().trim().min(1).max(2_000),
    startOffset: z.number().int().min(0).optional(),
    endOffset: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.startOffset !== undefined &&
      value.endOffset !== undefined &&
      value.endOffset < value.startOffset
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endOffset"],
        message: "endOffset must be >= startOffset",
      });
    }
  });
export type AnnotationEvidenceV1 = z.infer<typeof AnnotationEvidenceV1Schema>;

// Strict AI pre-label output contract (§10.3). The model returns ONLY this shape:
// no markdown, no prose, no labels outside the project schema. turnIndex is a
// message turn the backend re-validates against role/scope; evidenceText must
// exact-match inside that message. confidence uses the HIGH/MEDIUM/LOW scale.
export const PrelabelAnnotationV1Schema = z
  .object({
    labelCode: LabelCodeV1Schema,
    scope: AnnotationScopeV1Schema,
    turnIndex: z.number().int().min(0),
    secondTurnIndex: z.number().int().min(0).nullable().default(null),
    evidenceText: z.string().trim().min(1).max(2_000).nullable(),
    confidence: AnnotationConfidenceV1Schema,
    reason: z.string().trim().max(500).default(""),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.secondTurnIndex !== null &&
      value.secondTurnIndex < value.turnIndex
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondTurnIndex"],
        message: "secondTurnIndex must be >= turnIndex",
      });
    }
  });
export type PrelabelAnnotationV1 = z.infer<typeof PrelabelAnnotationV1Schema>;

export const PrelabelResponseV1Schema = z
  .object({
    annotations: z.array(PrelabelAnnotationV1Schema).max(100),
  })
  .strict();
export type PrelabelResponseV1 = z.infer<typeof PrelabelResponseV1Schema>;

// Vertex responseSchema (Gemini structured-output dialect) mirroring
// PrelabelResponseV1. Kept beside the zod contract so the worker asks the model
// for exactly what the backend will accept.
export const PRELABEL_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: ["annotations"],
  properties: {
    annotations: {
      type: "ARRAY",
      maxItems: 100,
      items: {
        type: "OBJECT",
        required: ["labelCode", "scope", "turnIndex", "secondTurnIndex", "evidenceText", "confidence", "reason"],
        properties: {
          labelCode: { type: "STRING" },
          scope: {
            type: "STRING",
            enum: ["CUSTOMER_MESSAGE", "SHOP_MESSAGE", "CONVERSATION", "SEQUENCE"],
          },
          turnIndex: { type: "INTEGER", minimum: 0 },
          secondTurnIndex: { type: "INTEGER", minimum: 0, nullable: true },
          evidenceText: { type: "STRING", nullable: true },
          confidence: { type: "STRING", enum: ["HIGH", "MEDIUM", "LOW"] },
          reason: { type: "STRING" },
        },
      },
    },
  },
} as const;

// Reuse existing admin RBAC. Dataset-review capability roles map onto the four
// existing AdminRole values so we do not create a parallel auth system (§17).
export const DatasetRoleV1Schema = z.enum([
  "DATASET_ADMIN",
  "ANNOTATOR",
  "ADJUDICATOR",
  "BENCHMARK_VIEWER",
]);
export type DatasetRoleV1 = z.infer<typeof DatasetRoleV1Schema>;

export const ADMIN_ROLE_TO_DATASET_ROLE: Readonly<
  Record<"OWNER" | "EDITOR" | "APPROVER" | "VIEWER", DatasetRoleV1>
> = {
  OWNER: "DATASET_ADMIN",
  APPROVER: "ADJUDICATOR",
  EDITOR: "ANNOTATOR",
  VIEWER: "BENCHMARK_VIEWER",
};
