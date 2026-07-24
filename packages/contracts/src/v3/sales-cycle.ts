import { z } from "zod";

const DateTimeSchema = z.string().datetime();
const Sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);

/** Opaque reference resolved only by a trusted business-data adapter. */
export const VersionedBusinessReferenceV1Schema = z.object({
  id: z.string().trim().min(1).max(256),
  version: z.string().trim().min(1).max(128),
  contentHash: Sha256Schema,
}).strict();
export type VersionedBusinessReferenceV1 = z.infer<typeof VersionedBusinessReferenceV1Schema>;

export const CART_RETENTION_SECONDS = 48 * 60 * 60;

export const SalesCycleStageV1Schema = z.enum([
  "DISCOVERY",
  "FACTS_PRESENTED",
  "MEASUREMENTS_REQUIRED",
  "SIZE_RECOMMENDED",
  "CART_OPEN",
  "ORDER_PREVIEW",
  "PURCHASE_CONFIRMED",
  "HANDED_OFF",
]);
export type SalesCycleStageV1 = z.infer<typeof SalesCycleStageV1Schema>;

/** Operational PII only. It expires with the 48-hour cart and is never an analytics payload. */
export const CheckoutRecipientV1Schema = z
  .object({
    fullName: z.string().trim().min(2).max(160),
    phone: z.string().trim().regex(/^[0-9+][0-9 .()-]{7,24}$/u),
    address: z.string().trim().min(8).max(1_000),
    retentionClass: z.literal("CART_48H_OPERATIONAL"),
  })
  .strict();
export type CheckoutRecipientV1 = z.infer<typeof CheckoutRecipientV1Schema>;

export const BankTransferPolicyV1Schema = z
  .object({
    policyId: z.string().trim().min(1).max(128),
    version: z.string().trim().min(1).max(64),
    bankName: z.string().trim().min(1).max(128),
    accountNumber: z.string().trim().regex(/^[A-Za-z0-9-]{6,32}$/u),
    accountHolder: z.string().trim().min(2).max(200),
    qrImageUrl: z.string().url(),
    customerInstruction: z.string().trim().min(1).max(500),
    effectiveAt: DateTimeSchema,
    effectiveUntil: DateTimeSchema.nullable(),
  })
  .strict()
  .superRefine((policy, context) => {
    if (policy.effectiveUntil !== null && Date.parse(policy.effectiveUntil) <= Date.parse(policy.effectiveAt)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["effectiveUntil"], message: "payment policy expiry must follow effectiveAt" });
    }
  });
export type BankTransferPolicyV1 = z.infer<typeof BankTransferPolicyV1Schema>;

export const BankTransferPolicyReferenceV1Schema = z
  .object({
    policyId: z.string().trim().min(1).max(128),
    version: z.string().trim().min(1).max(64),
    contentHash: Sha256Schema,
  })
  .strict();
export type BankTransferPolicyReferenceV1 = z.infer<typeof BankTransferPolicyReferenceV1Schema>;

export const CheckoutPaymentV1Schema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("COD"), bankTransferPolicyRef: z.null() }).strict(),
  z.object({ method: z.literal("BANK_TRANSFER"), bankTransferPolicyRef: BankTransferPolicyReferenceV1Schema }).strict(),
]);
export type CheckoutPaymentV1 = z.infer<typeof CheckoutPaymentV1Schema>;

export const RevalidationStatusV1Schema = z.enum(["MATCHED", "CHANGED", "STALE", "MISSING"]);
export const RevalidatedFactV1Schema = z
  .object({
    status: RevalidationStatusV1Schema,
    sourceVersionBefore: z.string().trim().min(1).max(128).nullable(),
    sourceVersionAfter: z.string().trim().min(1).max(128).nullable(),
    checkedAt: DateTimeSchema,
  })
  .strict()
  .superRefine((fact, context) => {
    if (
      fact.status === "MATCHED" &&
      (fact.sourceVersionBefore === null || fact.sourceVersionAfter === null || fact.sourceVersionBefore !== fact.sourceVersionAfter)
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceVersionAfter"], message: "matched fact requires identical before/after versions" });
    }
  });
export type RevalidatedFactV1 = z.infer<typeof RevalidatedFactV1Schema>;

export const CheckoutRevalidationV1Schema = z
  .object({
    cartId: z.string().uuid(),
    cartVersion: z.number().int().positive(),
    price: RevalidatedFactV1Schema,
    inventory: RevalidatedFactV1Schema,
    size: RevalidatedFactV1Schema,
    eta: RevalidatedFactV1Schema,
    eligible: z.boolean(),
    checkedAt: DateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const groupTimes = [value.price, value.inventory, value.size, value.eta].map(({ checkedAt }) => checkedAt);
    if (groupTimes.some((checkedAt) => checkedAt !== value.checkedAt)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["checkedAt"], message: "all fact checks must belong to one revalidation snapshot" });
    }
    const expected = [value.price, value.inventory, value.size, value.eta].every(({ status }) => status === "MATCHED");
    if (value.eligible !== expected) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["eligible"], message: "eligibility must equal all-facts-matched" });
    }
  });
export type CheckoutRevalidationV1 = z.infer<typeof CheckoutRevalidationV1Schema>;

export const OrderPreviewV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    previewId: z.string().uuid(),
    previewHash: Sha256Schema,
    cartId: z.string().uuid(),
    cartVersion: z.number().int().positive(),
    stage: z.literal("ORDER_PREVIEW"),
    recipient: CheckoutRecipientV1Schema,
    payment: CheckoutPaymentV1Schema,
    revalidation: CheckoutRevalidationV1Schema,
    createdAt: DateTimeSchema,
    expiresAt: DateTimeSchema,
  })
  .strict()
  .superRefine((preview, context) => {
    if (preview.revalidation.cartId !== preview.cartId || preview.revalidation.cartVersion !== preview.cartVersion) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["revalidation"], message: "preview and revalidation must bind the same cart version" });
    }
    if (!preview.revalidation.eligible) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["revalidation", "eligible"], message: "order preview requires eligible revalidation" });
    }
    if (Date.parse(preview.expiresAt) <= Date.parse(preview.createdAt)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "preview expiry must follow creation" });
    }
  });
export type OrderPreviewV1 = z.infer<typeof OrderPreviewV1Schema>;

export const SalesIntentV1Schema = z
  .object({
    source: z.enum(["MODEL_STRUCTURED_OUTPUT", "DETERMINISTIC_CLASSIFIER"]),
    intent: z.enum(["ACKNOWLEDGEMENT", "PURCHASE_CONFIRMATION", "CART_CHANGE", "PRICE_OBJECTION", "OTHER"]),
    sourceMessageId: z.string().trim().min(1).max(256),
  })
  .strict();
export type SalesIntentV1 = z.infer<typeof SalesIntentV1Schema>;

export const PurchaseConfirmationV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    confirmationId: z.string().uuid(),
    idempotencyKey: z.string().trim().min(1).max(256),
    cartId: z.string().uuid(),
    cartVersion: z.number().int().positive(),
    previewId: z.string().uuid(),
    previewHash: Sha256Schema,
    status: z.literal("PURCHASE_CONFIRMED"),
    posOrderId: z.null(),
    desiredPancakeTag: z.literal("DA_CHOT_DON"),
    confirmedAt: DateTimeSchema,
    sourceMessageId: z.string().trim().min(1).max(256),
  })
  .strict();
export type PurchaseConfirmationV1 = z.infer<typeof PurchaseConfirmationV1Schema>;

export const ManagedPancakeTagV2Schema = z.enum(["NHAN_VIEN", "VAN_DON", "DA_CHOT_DON", "KHONG_UP_SALE"]);
export const PancakeTagCommandV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    pageId: z.string().trim().min(1).max(64),
    conversationId: z.string().trim().min(1).max(256),
    desiredTag: ManagedPancakeTagV2Schema,
    operation: z.enum(["ADD", "REMOVE"]),
    idempotencyKey: z.string().trim().min(1).max(256),
  })
  .strict();
export type PancakeTagCommandV2 = z.infer<typeof PancakeTagCommandV2Schema>;
