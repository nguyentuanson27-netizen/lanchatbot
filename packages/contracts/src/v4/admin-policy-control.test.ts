import { describe, expect, it } from "vitest";
import {
  AdminArtifactContentV1Schema,
  AdminArtifactVersionV1Schema,
  AdminSimulationRequestV1Schema,
  HandoffMatrixAdminContentV1Schema,
  OfferPolicyAdminContentV1Schema,
} from "./admin-policy-control.js";

const metadata = {
  source: "ADMIN" as const,
  sourceReference: null,
  sourceVersion: "2026-07-22.1",
  observedAt: "2026-07-22T08:00:00.000Z",
};

describe("Admin Policy Control Plane contracts", () => {
  it("accepts the approved shop-wide stacking policy", () => {
    const parsed = OfferPolicyAdminContentV1Schema.parse({
      schemaVersion: 1,
      kind: "OFFER_POLICY",
      scope: "SHOP_WIDE",
      multiItem: {
        minimumParentProductUnits: 2,
        discountBps: 500,
        setAndComboCountAsOne: true,
      },
      concessions: {
        second: { freeShipping: true, fixedDiscountVnd: 0 },
        final: { freeShipping: true, fixedDiscountVnd: 20_000 },
        stackMultiItemWithSecond: true,
        stackMultiItemWithFinal: true,
        deduplicateFreeShipping: true,
      },
      sourceMetadata: metadata,
    });
    expect(parsed.concessions.final.fixedDiscountVnd).toBe(20_000);
  });

  it("rejects arbitrary JSON fields and duplicate handoff reasons", () => {
    expect(AdminArtifactContentV1Schema.safeParse({
      schemaVersion: 1,
      kind: "SHOP_POLICY",
      shopId: "lana",
      defaultShippingFeeVnd: 30_000,
      deliveryPromiseText: "3-7 hôm hàng tới",
      requireRecipientName: true,
      requirePhoneNumber: true,
      requireDeliveryAddress: true,
      allowedPaymentMethods: ["COD"],
      sourceMetadata: metadata,
      arbitraryCode: "drop table",
    }).success).toBe(false);

    const rule = {
      reason: "RETURN" as const,
      customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF" as const,
      holdingReply: "Em chuyển nhân viên hỗ trợ mình ngay ạ.",
      tag: "VAN_DON" as const,
    };
    expect(HandoffMatrixAdminContentV1Schema.safeParse({
      schemaVersion: 1,
      kind: "HANDOFF_MATRIX",
      rules: [rule, rule],
      sourceMetadata: metadata,
    }).success).toBe(false);
  });

  it("binds artifact kind to its strict content", () => {
    const result = AdminArtifactVersionV1Schema.safeParse({
      schemaVersion: 1,
      versionId: "7f1c223b-a220-49ea-8740-fc234116fb5e",
      artifactKey: "lana-offers",
      artifactKind: "SHOP_POLICY",
      versionNumber: 1,
      lifecycle: "DRAFT",
      revision: 0,
      contentHash: `sha256:${"a".repeat(64)}`,
      content: {
        schemaVersion: 1,
        kind: "OFFER_POLICY",
        scope: "SHOP_WIDE",
        multiItem: { minimumParentProductUnits: 2, discountBps: 500, setAndComboCountAsOne: true },
        concessions: {
          second: { freeShipping: true, fixedDiscountVnd: 0 },
          final: { freeShipping: true, fixedDiscountVnd: 20_000 },
          stackMultiItemWithSecond: true,
          stackMultiItemWithFinal: true,
          deduplicateFreeShipping: true,
        },
        sourceMetadata: metadata,
      },
      createdBy: "owner@example.com",
      createdAt: "2026-07-22T08:00:00.000Z",
      updatedAt: "2026-07-22T08:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("forces replay simulations to remain side-effect free", () => {
    expect(AdminSimulationRequestV1Schema.safeParse({
      schemaVersion: 1,
      versionIds: ["7f1c223b-a220-49ea-8740-fc234116fb5e"],
      pageId: "1198992073286645",
      lookbackDays: 180,
      maxConversations: 500,
      sideEffects: "DISABLED",
    }).success).toBe(true);
    expect(AdminSimulationRequestV1Schema.safeParse({
      schemaVersion: 1,
      versionIds: ["7f1c223b-a220-49ea-8740-fc234116fb5e"],
      pageId: "1198992073286645",
      lookbackDays: 180,
      maxConversations: 500,
      sideEffects: "ENABLED",
    }).success).toBe(false);
  });
});
