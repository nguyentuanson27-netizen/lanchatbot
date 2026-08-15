import { createHash } from "node:crypto";
import {
  CheckoutDetailsPatchV1Schema,
  CheckoutDraftV1Schema,
  OrderPreviewV1Schema,
  PurchaseConfirmationV1Schema,
  canonicalOrderPreviewHashPreimageV1,
  type CheckoutDetailsPatchV1,
  type CheckoutDraftV1,
  type OrderPreviewV1,
  type PurchaseConfirmationV1,
} from "@lana/contracts";

function sha256TextV1(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function deterministicUuidV1(seed: string): string {
  const hash = sha256TextV1(seed);
  const variant = ((Number.parseInt(hash[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function normalizedCheckoutTextV1(value: string | undefined): string | null {
  return value === undefined ? null : value.trim().replace(/\s+/gu, " ");
}

export type CheckoutDetailsTransitionResultV1 =
  | { readonly status: "APPLIED"; readonly draft: CheckoutDraftV1 }
  | { readonly status: "BLOCKED"; readonly reasonCode: "CHECKOUT_DETAILS_INVALID" };

/** Shared pure checkout normalizer/reducer used by the writer and locked DB replay. */
export function applyCheckoutDetailsTransitionV1(input: Readonly<{
  current: CheckoutDraftV1 | null;
  details: CheckoutDetailsPatchV1;
  appliedAt: Date;
}>): CheckoutDetailsTransitionResultV1 {
  const details = CheckoutDetailsPatchV1Schema.safeParse(input.details);
  const current = input.current === null
    ? { success: true as const, data: null }
    : CheckoutDraftV1Schema.safeParse(input.current);
  if (!details.success || !current.success || !Number.isFinite(input.appliedAt.getTime())) {
    return { status: "BLOCKED", reasonCode: "CHECKOUT_DETAILS_INVALID" };
  }
  const fullName = normalizedCheckoutTextV1(details.data.fullName);
  const phone = normalizedCheckoutTextV1(details.data.phone);
  const address = normalizedCheckoutTextV1(details.data.address);
  const next = CheckoutDraftV1Schema.safeParse({
    fullName: fullName ?? current.data?.fullName ?? null,
    phone: phone ?? current.data?.phone ?? null,
    address: address ?? current.data?.address ?? null,
    paymentMethod: details.data.paymentMethod ?? current.data?.paymentMethod ?? null,
    updatedAt: input.appliedAt.toISOString(),
  });
  return next.success
    ? { status: "APPLIED", draft: next.data }
    : { status: "BLOCKED", reasonCode: "CHECKOUT_DETAILS_INVALID" };
}

export function computeCanonicalOrderPreviewHashV1(
  input: Omit<OrderPreviewV1, "previewHash">,
): `sha256:${string}` {
  return `sha256:${sha256TextV1(canonicalOrderPreviewHashPreimageV1(input))}`;
}

export type OrderPreviewTransitionResultV1 =
  | { readonly status: "APPLIED"; readonly preview: OrderPreviewV1 }
  | {
      readonly status: "BLOCKED";
      readonly reasonCode:
        | "PREVIEW_INVALID"
        | "PREVIEW_CART_VERSION_CONFLICT"
        | "PREVIEW_INTEGRITY_INVALID";
    };

/** Shared exact preview guard used before local apply and again under the DB lock. */
export function validateOrderPreviewTransitionV1(input: Readonly<{
  stage: string;
  cart: Readonly<{
    cartId: string;
    revision: number;
    status: string;
  }> | null;
  cartExpiresAt: string | null;
  checkoutDraft: CheckoutDraftV1 | null;
  preview: OrderPreviewV1;
  now: Date;
}>): OrderPreviewTransitionResultV1 {
  const preview = OrderPreviewV1Schema.safeParse(input.preview);
  const checkoutDraft = input.checkoutDraft === null
    ? { success: true as const, data: null }
    : CheckoutDraftV1Schema.safeParse(input.checkoutDraft);
  if (input.stage !== "CART_OPEN" || !preview.success || !checkoutDraft.success ||
    input.cart === null || input.cartExpiresAt === null ||
    !Number.isFinite(input.now.getTime()) || Date.parse(input.cartExpiresAt) <= input.now.getTime()) {
    return { status: "BLOCKED", reasonCode: "PREVIEW_INVALID" };
  }
  if (input.cart.status !== "READY_FOR_CONFIRMATION" ||
    preview.data.cartId !== input.cart.cartId || preview.data.cartVersion !== input.cart.revision) {
    return { status: "BLOCKED", reasonCode: "PREVIEW_CART_VERSION_CONFLICT" };
  }
  const { previewHash: _providedHash, ...artifact } = preview.data;
  const draft = checkoutDraft.data;
  if (preview.data.previewHash !== computeCanonicalOrderPreviewHashV1(artifact) ||
    Date.parse(preview.data.expiresAt) > Date.parse(input.cartExpiresAt) || draft === null ||
    draft.fullName !== preview.data.recipient.fullName ||
    draft.phone !== preview.data.recipient.phone ||
    draft.address !== preview.data.recipient.address ||
    draft.paymentMethod !== preview.data.payment.method) {
    return { status: "BLOCKED", reasonCode: "PREVIEW_INTEGRITY_INVALID" };
  }
  return { status: "APPLIED", preview: preview.data };
}

/** Shared deterministic confirmation constructor used by worker and DB replay. */
export function deriveCanonicalPurchaseConfirmationV1(input: Readonly<{
  conversationKey: string;
  cart: Readonly<{ cartId: string; revision: number }>;
  preview: Readonly<{ previewId: string; previewHash: `sha256:${string}` }>;
  sourceMessageId: string;
  confirmedAt: Date;
}>): PurchaseConfirmationV1 {
  return PurchaseConfirmationV1Schema.parse({
    schemaVersion: 1,
    confirmationId: deterministicUuidV1(
      `purchase-confirmation\u0000${input.cart.cartId}\u0000${input.cart.revision}\u0000${input.sourceMessageId}`,
    ),
    idempotencyKey:
      `purchase-confirmed:${input.conversationKey}:${input.cart.cartId}:${input.cart.revision}:${input.sourceMessageId}`,
    cartId: input.cart.cartId,
    cartVersion: input.cart.revision,
    previewId: input.preview.previewId,
    previewHash: input.preview.previewHash,
    status: "PURCHASE_CONFIRMED",
    posOrderId: null,
    desiredPancakeTag: "DA_CHOT_DON",
    confirmedAt: input.confirmedAt.toISOString(),
    sourceMessageId: input.sourceMessageId,
  });
}
