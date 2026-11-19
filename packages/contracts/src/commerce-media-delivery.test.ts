import { expect, it } from "vitest";
import { CommerceMediaDeliveryBindingV1Schema } from "./commerce-media-delivery.js";

it("rejects model-shaped labels, unbounded groups and missing source identity", () => {
  const h = "a".repeat(64), image = { productId: "P1", url: "https://example.invalid/a.jpg", sourceVersion: h,
    observedAt: "2026-10-24T00:00:00Z", expiresAt: "2026-10-25T00:00:00Z" };
  const binding = { kind: "C3_MEDIA_GROUP_V1", pageId: "page", shopId: "shop", conversationId: "conversation", customerHash: h,
    recipientHash: h, responseGroupId: "group", generation: 1, revision: 2, stateHash: h, policyHash: h, messageHashes: [h, h], images: [image] };
  expect(CommerceMediaDeliveryBindingV1Schema.safeParse(binding).success).toBe(true);
  for (const invalid of [{ ...binding, caseId: "evaluator" }, { ...binding, messageHashes: Array(7).fill(h) },
    { ...binding, images: [{ ...image, sourceVersion: "" }] }, { ...binding, customerHash: "customer-name" }])
    expect(CommerceMediaDeliveryBindingV1Schema.safeParse(invalid).success).toBe(false);
});
