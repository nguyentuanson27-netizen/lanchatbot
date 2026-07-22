import { describe, expect, it } from "vitest";
import {
  CART_RETENTION_SECONDS,
  CheckoutPaymentV1Schema,
  CheckoutRevalidationV1Schema,
  OrderPreviewV1Schema,
  PurchaseConfirmationV1Schema,
  PancakeTagCommandV2Schema,
  VersionedBusinessReferenceV1Schema,
} from "./sales-cycle.js";

const fact = (status: "MATCHED" | "CHANGED" | "STALE" | "MISSING" = "MATCHED") => ({
  status,
  sourceVersionBefore: status === "MATCHED" ? "v1" : null,
  sourceVersionAfter: status === "MATCHED" ? "v1" : null,
  checkedAt: "2026-07-22T05:00:00.000Z",
});

const revalidation = {
  cartId: "10000000-0000-4000-8000-000000000001",
  cartVersion: 3,
  price: fact(), inventory: fact(), size: fact(), eta: fact(),
  eligible: true,
  checkedAt: "2026-07-22T05:00:00.000Z",
};

describe("Phase 3 sales-cycle contracts", () => {
  it("locks cart retention to 48 hours", () => {
    expect(CART_RETENTION_SECONDS).toBe(172_800);
  });

  it("requires immutable content-addressed business references", () => {
    expect(VersionedBusinessReferenceV1Schema.safeParse({ id: "cart-draft-1", version: "v1", contentHash: `sha256:${"a".repeat(64)}` }).success).toBe(true);
    expect(VersionedBusinessReferenceV1Schema.safeParse({ id: "cart-draft-1", version: "v1", contentHash: "sha256:bad" }).success).toBe(false);
  });

  it("requires structured bank-transfer policy and QR", () => {
    expect(CheckoutPaymentV1Schema.safeParse({ method: "BANK_TRANSFER", bankTransferPolicyRef: null }).success).toBe(false);
    expect(CheckoutPaymentV1Schema.safeParse({ method: "COD", bankTransferPolicyRef: null }).success).toBe(true);
  });

  it("blocks preview whenever one fact changed", () => {
    expect(CheckoutRevalidationV1Schema.safeParse({ ...revalidation, eta: fact("CHANGED"), eligible: true }).success).toBe(false);
  });

  it("does not allow MATCHED to hide a changed source version", () => {
    expect(CheckoutRevalidationV1Schema.safeParse({
      ...revalidation,
      price: { ...fact(), sourceVersionAfter: "v2" },
    }).success).toBe(false);
  });

  it("binds preview to the exact cart version", () => {
    const preview = {
      schemaVersion: 1,
      previewId: "20000000-0000-4000-8000-000000000001",
      previewHash: `sha256:${"a".repeat(64)}`,
      cartId: revalidation.cartId,
      cartVersion: 3,
      stage: "ORDER_PREVIEW",
      recipient: { fullName: "Nguyen Van A", phone: "0984997797", address: "Tan Chau, Tay Ninh", retentionClass: "CART_48H_OPERATIONAL" },
      payment: { method: "COD", bankTransferPolicyRef: null },
      revalidation,
      createdAt: "2026-07-22T05:00:00.000Z",
      expiresAt: "2026-07-24T05:00:00.000Z",
    };
    expect(OrderPreviewV1Schema.safeParse(preview).success).toBe(true);
    expect(OrderPreviewV1Schema.safeParse({ ...preview, cartVersion: 4 }).success).toBe(false);
  });

  it("never represents POS order creation as purchase confirmation", () => {
    const confirmation = {
      schemaVersion: 1,
      confirmationId: "30000000-0000-4000-8000-000000000001",
      idempotencyKey: "mid-1:cart-v3",
      cartId: revalidation.cartId,
      cartVersion: 3,
      previewId: "20000000-0000-4000-8000-000000000001",
      previewHash: `sha256:${"a".repeat(64)}`,
      status: "PURCHASE_CONFIRMED",
      posOrderId: null,
      desiredPancakeTag: "DA_CHOT_DON",
      confirmedAt: "2026-07-22T05:01:00.000Z",
      sourceMessageId: "mid-1",
    };
    expect(PurchaseConfirmationV1Schema.safeParse(confirmation).success).toBe(true);
    expect(PurchaseConfirmationV1Schema.safeParse({ ...confirmation, posOrderId: "pos-1" }).success).toBe(false);
  });

  it("supports the managed closed-order tag in a versioned outbox command", () => {
    expect(PancakeTagCommandV2Schema.safeParse({
      schemaVersion: 2,
      pageId: "1198992073286645",
      conversationId: "1198992073286645_sender",
      desiredTag: "DA_CHOT_DON",
      operation: "ADD",
      idempotencyKey: "purchase-confirmed:confirmation-1",
    }).success).toBe(true);
  });
});
