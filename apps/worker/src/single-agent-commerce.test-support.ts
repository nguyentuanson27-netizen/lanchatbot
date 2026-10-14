// Synthetic domain fixtures for isolated tests. Never a live-shop readback or provider result.
import { RuntimePolicyResolver } from "@lana/chat-runtime";
import { buildProductAttributesV1, CatalogSnapshotV3Schema, type StableProductDocument } from "@lana/business-tools";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { CartLineV1Schema, CustomerProfileV1Schema, SizeChartV1Schema } from "@lana/contracts";

export const commerceNow = new Date("2026-10-14T10:00:00.000Z");
export const commerceScope = () => ({ pageId: "1198992073286645", shopId: "LANA_DESIGN", shopAlias: "LANA",
  conversationId: "conversation-test", customerHash: "a".repeat(64), sourceMessageId: "message-test", requestId: "turn-test",
  recipient: "recipient-hash", bindingVersion: "binding-1", revision: 1, sourceObservedAt: commerceNow.toISOString(),
  conversationOwner: "BOT", permission: true, privacyAllowed: true });

export function fixtureProfile() {
  const at = "2026-10-14T09:00:00.000Z";
  return { profile: CustomerProfileV1Schema.parse({ schemaVersion: 1, profileId: "30000000-0000-4000-8000-000000000001",
    customerKey: { namespace: "test", algorithm: "HMAC_SHA256", digest: "a".repeat(64) }, revision: 1,
    measurements: [{ kind: "WAIST_CM", value: 74 }, { kind: "HIPS_CM", value: 95 }].map(m => ({ ...m,
      provenance: { source: "CUSTOMER_MESSAGE", sourceEventHash: "b".repeat(64), observedAt: at, confidence: 1 } })),
    fitPreference: "REGULAR", preferences: { colors: [], styles: [], materials: [] }, sizeHistory: [], createdAt: at, updatedAt: at,
  }), fieldEvidence: {} };
}
export function fixtureSizeInput(productId = "QU714") {
  const chart = SizeChartV1Schema.parse({ schemaVersion: 1, reference: { chartId: "pants-chart", version: "1",
    source: "IMAGE_EXTRACTION", sourceArtifactRef: "https://example.invalid/chart.jpg", sourceContentSha256: "c".repeat(64),
    verificationStatus: "VERIFIED", verifiedByRef: "owner", verifiedAt: "2026-10-14T09:00:00.000Z" },
    brand: "LANA_DESIGN", category: "PANTS", componentRole: "PANTS", boundaryPolicy: "REQUIRE_HUMAN_REVIEW",
    bands: [ { size: "M", ranges: [{ kind: "WAIST_CM", minInclusive: 70, maxInclusive: 79 }, { kind: "HIPS_CM", minInclusive: 90, maxInclusive: 99 }], note: null },
      { size: "L", ranges: [{ kind: "WAIST_CM", minInclusive: 80, maxInclusive: 90 }, { kind: "HIPS_CM", minInclusive: 100, maxInclusive: 110 }], note: null } ] });
  return { target: { brand: "LANA_DESIGN", parentProductId: productId, componentProductId: productId, componentRole: "PANTS" as const,
    category: "PANTS", form: null, material: null }, charts: [{ chart, scope: { level: "COMPONENT" as const, parentProductIds: [productId], componentRole: "PANTS" as const } }] };
}
export function fixtureCartLine() {
  return CartLineV1Schema.parse({ lineId: "40000000-0000-4000-8000-000000000001", parentProductId: "SM613", offerId: "SM613-DIRECT",
    offerKind: "DIRECT", quantity: 1, components: [{ componentProductId: "SM613", componentSku: "SM613-NAVY-M",
      componentRole: "TOP", color: "navy", size: "M", quantity: 1 }], allowMixedSizes: false, allowComponentSale: false,
    posUnitPriceVnd: 499_000, lineTotalVnd: 499_000, priceAuthority: { priceFactRef: "pos:SM613", shopId: "LANA_DESIGN", parentProductId: "SM613",
      offerId: "SM613-DIRECT", offerPriceKind: "DIRECT", componentProductId: null, metadata: { authority: "PANCAKE_POS",
        sourceVersion: "pos-v1", observedAt: commerceNow.toISOString(), expiresAt: new Date(commerceNow.getTime()+172_800_000).toISOString(),
        freshForSeconds: 172800, freshnessState: "FRESH" } } });
}

export function policyResolver(defaultFeeVnd = 25_000) {
  const meta = { source: "ADMIN", sourceReference: null, sourceVersion: "fixture-policy-v1", observedAt: commerceNow.toISOString() };
  const contents = [
    { schemaVersion: 1, kind: "SHOP_POLICY", shopId: "LANA_DESIGN", defaultShippingFeeVnd: defaultFeeVnd,
      deliveryPromiseText: "Lịch giao theo nguồn vận chuyển.", requireRecipientName: true, requirePhoneNumber: true,
      requireDeliveryAddress: true, allowedPaymentMethods: ["COD", "BANK_TRANSFER"], sourceMetadata: meta },
    { schemaVersion: 1, kind: "OFFER_POLICY", scope: "SHOP_WIDE", multiItem: {
      minimumParentProductUnits: 2, discountBps: 500, setAndComboCountAsOne: true }, concessions: {
      second: { freeShipping: true, fixedDiscountVnd: 0 }, final: { freeShipping: true, fixedDiscountVnd: 20_000 },
      stackMultiItemWithSecond: true, stackMultiItemWithFinal: true, deduplicateFreeShipping: true }, sourceMetadata: meta },
    { schemaVersion: 1, kind: "CLOSING_STRATEGY", decisionMode: "DETERMINISTIC_POLICY_ONLY", retryMayEscalateConcession: false,
      okConfirmsOnlyAtOrderPreview: true, steps: [
        { state: "READY", nextAction: "SHOW_ORDER_PREVIEW", promptTemplate: "Xem đơn" },
        { state: "HESITANT", nextAction: "APPLY_SECOND_CONCESSION", promptTemplate: "Hỗ trợ ship" },
        { state: "CAUTIOUS", nextAction: "HANDOFF", promptTemplate: "Nhân viên" },
      ], sourceMetadata: meta },
  ];
  return new RuntimePolicyResolver({ loadActivePointers: async () => contents.map((content, i) => {
    const id = `10000000-0000-4000-8000-00000000000${i + 1}`;
    return { pointer: { schemaVersion: 1, pointerId: `20000000-0000-4000-8000-00000000000${i + 1}`,
      artifactKey: `fixture.${content.kind}`, artifactKind: content.kind, pageId: commerceScope().pageId,
      channel: "CANARY_SHADOW", versionId: id, revision: 1, updatedBy: "owner", updatedAt: meta.observedAt },
      version: { schemaVersion: 1, versionId: id, artifactKey: `fixture.${content.kind}`, artifactKind: content.kind,
        versionNumber: 1, lifecycle: "CANARY", revision: 1, contentHash: `sha256:${commerceHash(content)}`,
        content, createdBy: "owner", createdAt: meta.observedAt, updatedAt: meta.observedAt } };
  }) }, { enabled: true });
}
export const fixturePolicy = async (fee = 25_000) => policyResolver(fee).resolve({ pageId: commerceScope().pageId,
  channel: "CANARY_SHADOW", now: commerceNow });

export function fixtureProduct(productId = "SM613") {
  const product: StableProductDocument = { productId, parentProductId: productId, canonicalCode: productId,
    aliases: [], title: `Sơ mi ${productId}`, colors: ["navy"], materials: ["cotton"], silhouettes: ["suông"],
    occasions: ["đi làm"], imageUrls: [], images: [], catalogVersion: "catalog-v1", observedAt: commerceNow.toISOString(),
    attributes: buildProductAttributesV1({ productId, observedAt: commerceNow.toISOString(), data: {
      materials: ["cotton"], materialComponents: {}, colors: ["navy"], styles: [], silhouettes: ["suông"], occasions: ["đi làm"],
      designAttributes: null, careInstructions: null, wearProperties: null, backCoverage: null, designComplexity: null,
    } }) };
  const snapshot = CatalogSnapshotV3Schema.parse({ schema_version: 3, release_id: "pos-v1", catalog_version: "catalog-v1",
    policy_version: "fulfillment-v1", shop_alias: "LANA", brand: "LANA_DESIGN", product_id: productId,
    synced_at: commerceNow.toISOString(), data_status: "OK", fulfillment_policy: null, selling_rules: {
      allow_mixed_sizes: false, allow_component_sale: false, source_version: "selling-v1" }, shipping_eta: {},
    offers: { DIRECT: { list_price: 499_000, sale_price: 499_000, price_status: "OK", rows: [{
      offer_type: "DIRECT", color: "navy", size: "M", stock_quantity: 4, stock_status: "OK", sale_price: 499_000,
      parent_variation_id: `${productId}-NAVY-M`, price_sku: productId,
    }] } } });
  return { product, snapshot };
}
