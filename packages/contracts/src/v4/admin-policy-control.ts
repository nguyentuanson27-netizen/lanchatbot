import { z } from "zod";
import {
  HandoffReasonV2Schema,
  HandoffTagV2Schema,
} from "../v2/handoff-sales-funnel.js";
import { SizeChartV1Schema } from "../v2/customer-size-cart.js";

export const AdminRoleV2Schema = z.enum(["OWNER", "EDITOR", "APPROVER", "VIEWER"]);
export type AdminRoleV2 = z.infer<typeof AdminRoleV2Schema>;

export const AdminArtifactKindV1Schema = z.enum([
  "SHOP_POLICY",
  "OFFER_POLICY",
  "CLOSING_STRATEGY",
  "SIZE_CHART",
  "HANDOFF_MATRIX",
  "PAYMENT_POLICY",
]);
export type AdminArtifactKindV1 = z.infer<typeof AdminArtifactKindV1Schema>;

export const AdminArtifactLifecycleV1Schema = z.enum([
  "DRAFT",
  "VALIDATED",
  "APPROVED",
  "CANARY",
  "PUBLISHED",
  "RETIRED",
]);
export type AdminArtifactLifecycleV1 = z.infer<typeof AdminArtifactLifecycleV1Schema>;

export const AdminCanaryModeV1Schema = z.enum(["SHADOW", "LIVE_OUTBOUND"]);
export type AdminCanaryModeV1 = z.infer<typeof AdminCanaryModeV1Schema>;

const SourceMetadataSchema = z.object({
  source: z.enum(["ADMIN", "GOOGLE_SHEETS_IMPORT", "IMAGE_EXTRACTION"]),
  sourceReference: z.string().trim().min(1).max(1_024).nullable(),
  sourceVersion: z.string().trim().min(1).max(128),
  observedAt: z.string().datetime(),
}).strict();

export const ShopPolicyAdminContentV1Schema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("SHOP_POLICY"),
  shopId: z.string().trim().min(1).max(128),
  defaultShippingFeeVnd: z.number().int().nonnegative().max(1_000_000),
  deliveryPromiseText: z.string().trim().min(1).max(300),
  requireRecipientName: z.literal(true),
  requirePhoneNumber: z.literal(true),
  requireDeliveryAddress: z.literal(true),
  allowedPaymentMethods: z.array(z.enum(["COD", "BANK_TRANSFER"])).min(1).max(2),
  sourceMetadata: SourceMetadataSchema,
}).strict();

export const OfferPolicyAdminContentV1Schema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("OFFER_POLICY"),
  scope: z.literal("SHOP_WIDE"),
  multiItem: z.object({
    minimumParentProductUnits: z.number().int().min(2).max(20),
    discountBps: z.number().int().min(1).max(10_000),
    setAndComboCountAsOne: z.literal(true),
  }).strict(),
  concessions: z.object({
    second: z.object({ freeShipping: z.literal(true), fixedDiscountVnd: z.literal(0) }).strict(),
    final: z.object({
      freeShipping: z.literal(true),
      fixedDiscountVnd: z.number().int().positive().max(1_000_000),
    }).strict(),
    stackMultiItemWithSecond: z.literal(true),
    stackMultiItemWithFinal: z.literal(true),
    deduplicateFreeShipping: z.literal(true),
  }).strict(),
  sourceMetadata: SourceMetadataSchema,
}).strict();

const ClosingStepSchema = z.object({
  state: z.enum(["READY", "HESITANT", "CAUTIOUS"]),
  nextAction: z.enum([
    "COLLECT_SIZE",
    "COLLECT_DELIVERY_INFO",
    "APPLY_SECOND_CONCESSION",
    "APPLY_FINAL_CONCESSION",
    "SHOW_ORDER_PREVIEW",
    "HANDOFF",
  ]),
  promptTemplate: z.string().trim().min(1).max(500),
}).strict();

export const ClosingStrategyAdminContentV1Schema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("CLOSING_STRATEGY"),
  decisionMode: z.literal("DETERMINISTIC_POLICY_ONLY"),
  retryMayEscalateConcession: z.literal(false),
  okConfirmsOnlyAtOrderPreview: z.literal(true),
  steps: z.array(ClosingStepSchema).length(3),
  sourceMetadata: SourceMetadataSchema,
}).strict().superRefine((value, context) => {
  const states = value.steps.map(({ state }) => state);
  if (new Set(states).size !== states.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["steps"],
      message: "closing strategy must define READY, HESITANT and CAUTIOUS exactly once",
    });
  }
});

export const SizeChartAdminContentV1Schema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("SIZE_CHART"),
  chart: SizeChartV1Schema,
  sourceMetadata: SourceMetadataSchema,
}).strict();

const HandoffRuleAdminV1Schema = z.object({
  reason: HandoffReasonV2Schema,
  customerMessagePolicy: z.enum(["HOLDING_REPLY_THEN_HANDOFF", "SILENT_HANDOFF"]),
  holdingReply: z.string().trim().min(1).max(500).nullable(),
  tag: HandoffTagV2Schema,
}).strict().superRefine((value, context) => {
  const holds = value.customerMessagePolicy === "HOLDING_REPLY_THEN_HANDOFF";
  if (holds !== (value.holdingReply !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["holdingReply"],
      message: "holding reply must be present only when the rule sends a holding message",
    });
  }
});

export const HandoffMatrixAdminContentV1Schema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("HANDOFF_MATRIX"),
  rules: z.array(HandoffRuleAdminV1Schema).min(1).max(100),
  sourceMetadata: SourceMetadataSchema,
}).strict().superRefine((value, context) => {
  const reasons = value.rules.map(({ reason }) => reason);
  if (new Set(reasons).size !== reasons.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rules"],
      message: "handoff matrix cannot define the same reason twice",
    });
  }
});

export const PaymentPolicyAdminContentV1Schema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("PAYMENT_POLICY"),
  methods: z.array(z.enum(["COD", "BANK_TRANSFER"])).min(1).max(2),
  bankTransfer: z.object({
    bankName: z.string().trim().min(1).max(128),
    accountNumber: z.string().trim().regex(/^\d{6,32}$/),
    accountHolder: z.string().trim().min(1).max(200),
    qrAssetUrl: z.string().url(),
    receiptInstruction: z.string().trim().min(1).max(500),
    receiptRequiresHumanReview: z.literal(true),
  }).strict().nullable(),
  sourceMetadata: SourceMetadataSchema,
}).strict().superRefine((value, context) => {
  const supportsTransfer = value.methods.includes("BANK_TRANSFER");
  if (supportsTransfer !== (value.bankTransfer !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["bankTransfer"],
      message: "bank transfer details must match the enabled payment methods",
    });
  }
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
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["content", "kind"], message: "artifact kind mismatch" });
  }
});
export type AdminArtifactVersionV1 = z.infer<typeof AdminArtifactVersionV1Schema>;

export const AdminArtifactTransitionActionV1Schema = z.enum([
  "VALIDATE",
  "APPROVE",
  "START_CANARY",
  "PUBLISH",
  "RETIRE",
]);

export const AdminActivePointerV1Schema = z.object({
  schemaVersion: z.literal(1),
  pointerId: z.string().uuid(),
  artifactKey: z.string().trim().min(1).max(128),
  artifactKind: AdminArtifactKindV1Schema,
  pageId: z.string().trim().min(1).max(64).nullable(),
  channel: z.enum(["CANARY_SHADOW", "CANARY_LIVE", "PUBLISHED"]),
  versionId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  updatedBy: z.string().trim().min(1).max(256),
  updatedAt: z.string().datetime(),
}).strict();

export const AdminSimulationRequestV1Schema = z.object({
  schemaVersion: z.literal(1),
  versionIds: z.array(z.string().uuid()).min(1).max(20),
  pageId: z.string().trim().min(1).max(64),
  lookbackDays: z.number().int().min(1).max(186),
  maxConversations: z.number().int().min(1).max(1_000),
  sideEffects: z.literal("DISABLED"),
}).strict();
export type AdminSimulationRequestV1 = z.infer<typeof AdminSimulationRequestV1Schema>;
