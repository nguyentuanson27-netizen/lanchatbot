import { describe, expect, it } from "vitest";
import {
  CART_TTL_MS_V1,
  CART_RETENTION_SECONDS,
  CheckoutPaymentV1Schema,
  ClarificationTransitionEvidenceV1Schema,
  CheckoutDetailsTransitionEvidenceV1Schema,
  checkoutDetailsTransitionEvidenceHashPreimageV1,
  CheckoutRevalidationV1Schema,
  OrderPreviewV1Schema,
  PurchaseConfirmationV1Schema,
  PancakeTagCommandV2Schema,
  STATE_ADVANCING_SALES_OUTCOMES_V1,
  SALES_CYCLE_COMMAND_KINDS_V1,
  SalesCycleStageV1Schema,
  VersionedBusinessReferenceV1Schema,
  isSalesStageTransitionAllowedV1,
  isStateAdvancingSalesOutcomeV1,
  canonicalClarificationStateHashPreimageV1,
  clarificationTransitionEvidenceHashPreimageV1,
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
    expect(CART_TTL_MS_V1).toBe(172_800_000);
  });

  it("defines one shared state-advancing outcome authority", () => {
    expect(STATE_ADVANCING_SALES_OUTCOMES_V1).toEqual(["APPLIED", "HANDOFF"]);
    expect(isStateAdvancingSalesOutcomeV1("APPLIED")).toBe(true);
    expect(isStateAdvancingSalesOutcomeV1("HANDOFF")).toBe(true);
    expect(isStateAdvancingSalesOutcomeV1("REJECTED")).toBe(false);
  });

  it("defines every legal persisted sales-stage transition and rejects the Cartesian complement", () => {
    const valid = [
      ["FACTS_PRESENTED", "APPLIED", "DISCOVERY", "FACTS_PRESENTED"],
      ["FACTS_PRESENTED", "APPLIED", "FACTS_PRESENTED", "FACTS_PRESENTED"],
      ["MEASUREMENTS_REQUIRED", "APPLIED", "FACTS_PRESENTED", "MEASUREMENTS_REQUIRED"],
      ["MEASUREMENTS_REQUIRED", "APPLIED", "MEASUREMENTS_REQUIRED", "MEASUREMENTS_REQUIRED"],
      ["SIZE_RECOMMENDED", "APPLIED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"],
      ["SIZE_RECOMMENDED", "APPLIED", "SIZE_RECOMMENDED", "SIZE_RECOMMENDED"],
      ["CART_OPENED", "APPLIED", "SIZE_RECOMMENDED", "CART_OPEN"],
      ["CART_OPENED", "APPLIED", "CART_OPEN", "CART_OPEN"],
      ["CART_OPENED", "APPLIED", "ORDER_PREVIEW", "CART_OPEN"],
      ["CART_MUTATED", "APPLIED", "CART_OPEN", "CART_OPEN"],
      ["CART_MUTATED", "APPLIED", "ORDER_PREVIEW", "CART_OPEN"],
      ["CART_READY", "APPLIED", "CART_OPEN", "CART_OPEN"],
      ["CART_READY", "APPLIED", "ORDER_PREVIEW", "CART_OPEN"],
      ["CHECKOUT_DETAILS_CAPTURED", "APPLIED", "CART_OPEN", "CART_OPEN"],
      ["CHECKOUT_DETAILS_CAPTURED", "APPLIED", "ORDER_PREVIEW", "CART_OPEN"],
      ["CLARIFICATION_REQUESTED", "APPLIED", "CART_OPEN", "CART_OPEN"],
      ["CLARIFICATION_REQUESTED", "APPLIED", "ORDER_PREVIEW", "ORDER_PREVIEW"],
      ["CLARIFICATION_RESOLVED", "APPLIED", "DISCOVERY", "DISCOVERY"],
      ["CLARIFICATION_RESOLVED", "APPLIED", "FACTS_PRESENTED", "FACTS_PRESENTED"],
      ["CLARIFICATION_RESOLVED", "APPLIED", "MEASUREMENTS_REQUIRED", "MEASUREMENTS_REQUIRED"],
      ["CLARIFICATION_RESOLVED", "APPLIED", "SIZE_RECOMMENDED", "SIZE_RECOMMENDED"],
      ["CLARIFICATION_RESOLVED", "APPLIED", "CART_OPEN", "CART_OPEN"],
      ["CLARIFICATION_RESOLVED", "APPLIED", "ORDER_PREVIEW", "ORDER_PREVIEW"],
      ["NEGOTIATION_EVENT", "APPLIED", "CART_OPEN", "CART_OPEN"],
      ["NEGOTIATION_EVENT", "APPLIED", "ORDER_PREVIEW", "ORDER_PREVIEW"],
      ["NEGOTIATION_EVENT", "APPLIED", "ORDER_PREVIEW", "CART_OPEN"],
      ["PREVIEW_CREATED", "APPLIED", "CART_OPEN", "ORDER_PREVIEW"],
      ["CONFIRM_PURCHASE", "APPLIED", "ORDER_PREVIEW", "PURCHASE_CONFIRMED"],
      ["CONFIRM_PURCHASE", "HANDOFF", "ORDER_PREVIEW", "HANDED_OFF"],
      ["PAYMENT_RECEIPT_RECEIVED", "HANDOFF", "PURCHASE_CONFIRMED", "HANDED_OFF"],
    ] as const;
    const validKeys = new Set(valid.map((tuple) => tuple.join("|")));
    const stages = SalesCycleStageV1Schema.options;

    expect(new Set(SALES_CYCLE_COMMAND_KINDS_V1).size)
      .toBe(SALES_CYCLE_COMMAND_KINDS_V1.length);
    for (const commandKind of SALES_CYCLE_COMMAND_KINDS_V1) {
      for (const outcome of STATE_ADVANCING_SALES_OUTCOMES_V1) {
        for (const stageBefore of stages) {
          for (const stageAfter of stages) {
            expect(isSalesStageTransitionAllowedV1({
              commandKind,
              outcome,
              stageBefore,
              stageAfter,
            }), `${commandKind}|${outcome}|${stageBefore}|${stageAfter}`)
              .toBe(validKeys.has([commandKind, outcome, stageBefore, stageAfter].join("|")));
          }
        }
      }
    }
    expect(isSalesStageTransitionAllowedV1({
      commandKind: "FACTS_PRESENTED",
      outcome: "APPLIED",
      stageBefore: "NOT_A_STAGE",
      stageAfter: "FACTS_PRESENTED",
    })).toBe(false);
    expect(isSalesStageTransitionAllowedV1({
      commandKind: "NOT_A_COMMAND",
      outcome: "APPLIED",
      stageBefore: "DISCOVERY",
      stageAfter: "FACTS_PRESENTED",
    })).toBe(false);
  });

  it("normalizes legacy missing clarification to null and binds the exact transition", () => {
    expect(canonicalClarificationStateHashPreimageV1(undefined))
      .toBe(canonicalClarificationStateHashPreimageV1(null));
    const evidence = ClarificationTransitionEvidenceV1Schema.parse({
      schemaVersion: 1,
      contractVersion: "CLARIFICATION_TRANSITION_EVIDENCE_V1",
      sourceMessageIdHash: "a".repeat(64),
      commandIdHash: "b".repeat(64),
      transition: {
        kind: "REQUESTED",
        reasonCode: "CHECKOUT_DETAILS_MISSING",
        missingFields: ["address", "phone"],
        productId: "CB182",
        questionFingerprint: "c".repeat(64),
        maxAttempts: 3,
      },
      beforeClarificationHash: "d".repeat(64),
      afterClarificationHash: "e".repeat(64),
      appliedAt: "2026-07-22T05:00:00.000Z",
      evidenceHash: "f".repeat(64),
      contributor: "DETERMINISTIC_RUNTIME",
      authorization: "NONE",
    });
    if (evidence.transition.kind !== "REQUESTED") {
      throw new Error("TEST_CLARIFICATION_TRANSITION_INVALID");
    }
    expect(clarificationTransitionEvidenceHashPreimageV1({
      ...evidence,
      transition: { ...evidence.transition, maxAttempts: 4 },
    })).not.toBe(clarificationTransitionEvidenceHashPreimageV1(evidence));
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

  it("binds checkout PII capture to the current message, exact patch and draft transition", () => {
    const evidence = {
      schemaVersion: 1 as const,
      contractVersion: "CHECKOUT_DETAILS_TRANSITION_EVIDENCE_V1" as const,
      sourceMessageIdHash: "a".repeat(64),
      commandIdHash: "b".repeat(64),
      details: { fullName: "  Nguyen   Van A  ", paymentMethod: "COD" as const },
      beforeCheckoutDraftHash: "c".repeat(64),
      afterCheckoutDraftHash: "d".repeat(64),
      appliedAt: "2026-07-22T05:00:00.000Z",
      evidenceHash: "e".repeat(64),
      contributor: "DETERMINISTIC_RUNTIME" as const,
      authorization: "NONE" as const,
    };
    expect(CheckoutDetailsTransitionEvidenceV1Schema.parse(evidence).details.fullName)
      .toBe("  Nguyen   Van A  ");
    expect(checkoutDetailsTransitionEvidenceHashPreimageV1({
      ...evidence,
      details: { ...evidence.details, fullName: "Nguyen Van B" },
    })).not.toBe(checkoutDetailsTransitionEvidenceHashPreimageV1(evidence));
    expect(CheckoutDetailsTransitionEvidenceV1Schema.safeParse({
      ...evidence,
      details: {},
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
