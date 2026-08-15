import { describe, expect, it } from "vitest";
import {
  canonicalCartStateHashPreimageV1,
  canonicalizeProductIdsV1,
  canonicalJsonV1,
  cartOpenEvidenceHashPreimageV1,
  cartMutationAuthorityBindingHashPreimageV1,
  CanonicalCartStateV1Schema,
  CanonicalProductIdV1Schema,
  CartMutationBatchEvidenceV1Schema,
  CartOpenEvidenceV1Schema,
  NegotiationTransitionEvidenceV1Schema,
  EffectBindingV1Schema,
  type CartV1,
} from "./index.js";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);
const POLICY_METADATA = {
  authority: "ADMIN_POLICY" as const,
  sourceVersion: "v1",
  observedAt: "2026-08-14T00:00:00.000Z",
  expiresAt: null,
  freshForSeconds: null,
  freshnessState: "FRESH" as const,
};
const POLICY = {
  schemaVersion: 1 as const,
  policyBundleId: "policy-1",
  policyVersion: "v1",
  shopId: "shop-1",
  status: "ACTIVE" as const,
  effectiveAt: "2026-08-14T00:00:00.000Z",
  effectiveUntil: null,
  supersedesPolicyVersion: null,
  scope: "SHOP_WIDE" as const,
  commerceAuthority: {
    bomAuthority: "PANCAKE_POS" as const,
    priceAuthority: "PANCAKE_POS" as const,
    inventoryAuthority: "PANCAKE_POS" as const,
    allowGoogleSheetsPriceOverride: false as const,
    allowAdminPriceOverride: false as const,
    missingPriceBehavior: "DO_NOT_QUOTE" as const,
    metadata: POLICY_METADATA,
  },
  shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE" as const, metadata: POLICY_METADATA },
  multiItemOffer: { minimumProductCount: 2, discountBps: 500, countingUnit: "PARENT_PRODUCT_UNIT" as const, setAndComboCountAsOne: true as const, scope: "SHOP_WIDE" as const, metadata: POLICY_METADATA },
  negotiation: {
    secondConcession: { freeShipping: true as const, fixedDiscountVnd: 0 as const },
    finalConcession: { freeShipping: true as const, fixedDiscountVnd: 20_000 },
    stacking: { multiItemDiscountWithSecondConcession: true as const, multiItemDiscountWithFinalConcession: true as const, deduplicateFreeShipping: true as const },
    scope: "SHOP_WIDE" as const,
    metadata: POLICY_METADATA,
  },
  closing: { customerStates: ["READY", "HESITANT", "CAUTIOUS"] as const, decisionMode: "DETERMINISTIC_POLICY_ONLY" as const, allowUnlistedOffers: false as const, metadata: POLICY_METADATA },
};

function cart(overrides: Partial<CartV1> = {}): CartV1 {
  return {
    schemaVersion: 1,
    cartId: "15f9b215-2085-44f2-8d21-af4244577f5e",
    salesEpisodeId: "7cb56372-6328-4a0b-9b6e-91a894f7d5e8",
    customerProfileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
    revision: 1,
    currency: "VND",
    status: "OPEN",
    checkoutEligibility: "BLOCKED_MISSING_PRICE",
    lines: [{
      lineId: "0b884806-7c77-4410-bc47-a3d2bb51c936",
      parentProductId: "ÁO-001",
      offerId: "ÁO-001-DIRECT",
      offerKind: "DIRECT",
      quantity: 1,
      components: [{
        componentProductId: "ÁO-001",
        componentSku: "AO-001-DO-M",
        componentRole: "OTHER",
        color: "ĐỎ",
        size: "M",
        quantity: 1,
      }],
      allowMixedSizes: false,
      allowComponentSale: true,
      posUnitPriceVnd: null,
      priceAuthority: null,
      lineTotalVnd: null,
    }],
    adjustments: [],
    shippingFeeVnd: null,
    subtotalVnd: null,
    discountTotalVnd: null,
    grandTotalVnd: null,
    createdAt: "2026-08-14T01:00:00.000Z",
    updatedAt: "2026-08-14T01:00:00.000Z",
    ...overrides,
  };
}

describe("canonical commerce identifiers", () => {
  it("accepts only exact NFC product IDs at the shared schema boundary", () => {
    const nfc = "ÁO-001";
    const decomposed = nfc.normalize("NFD");

    expect(CanonicalProductIdV1Schema.safeParse(nfc).success).toBe(true);
    expect(CanonicalProductIdV1Schema.safeParse(decomposed).success).toBe(false);
    expect(CanonicalProductIdV1Schema.safeParse(` ${nfc} `).success).toBe(false);
  });

  it("canonicalizes once, reports every lossy or duplicate input, and never applies cart capacity", () => {
    const nfc = "ÁO-001";
    const result = canonicalizeProductIdsV1([
      nfc.normalize("NFD"),
      nfc,
      " P-002 ",
      "P-003",
      "P-003",
      ...Array.from({ length: 51 }, (_, index) => `P-${index + 100}`),
    ]);

    expect(result.invalid).toBe(true);
    expect(result.productIds).toContain(nfc);
    expect(result.productIds).toContain("P-002");
    expect(result.productIds.length).toBeGreaterThan(50);
    expect("capacityExceeded" in result).toBe(false);
    expect(result).toEqual(canonicalizeProductIdsV1([
      nfc.normalize("NFD"), nfc, " P-002 ", "P-003", "P-003",
      ...Array.from({ length: 51 }, (_, index) => `P-${index + 100}`),
    ]));
  });
});

describe("cart-open and negotiation transition evidence", () => {
  const policyRef = { id: "policy-1", version: "v1", contentHash: `sha256:${HASH_D}` };
  const replayContext = {
    schemaVersion: 1 as const,
    contractVersion: "CANONICAL_CART_REPLAY_CONTEXT_V1" as const,
    shopId: "shop-1",
    policyRef,
    policyBundle: POLICY,
    customerState: null,
  };
  const openEvidence = {
    schemaVersion: 1 as const,
    contractVersion: "CART_OPEN_EVIDENCE_V1" as const,
    sourceMessageIdHash: HASH_A,
    commandIdHash: HASH_B,
    cartDraftRef: { id: "draft-1", version: "v1", contentHash: `sha256:${HASH_C}` },
    draft: {
      identity: {
        cartId: cart().cartId,
        salesEpisodeId: cart().salesEpisodeId,
        customerProfileId: cart().customerProfileId,
      },
      lines: cart().lines,
      shopId: "shop-1",
      policyRef,
    },
    replayContext,
    policyPin: {
      scopeType: "SALES_EPISODE" as const,
      scopeId: "conversation-1:PUBLISHED",
      channel: "PUBLISHED" as const,
      bundleHash: `sha256:${HASH_A}`,
    },
    createdAt: "2026-08-14T01:00:00.000Z",
    cartExpiresAt: "2026-08-16T01:00:00.000Z",
    evidenceHash: HASH_D,
  };

  it("binds a single canonical seed line to an exact pinned policy", () => {
    const parsedOpenEvidence = CartOpenEvidenceV1Schema.parse(openEvidence);
    expect(parsedOpenEvidence).toEqual(openEvidence);
    expect(CartOpenEvidenceV1Schema.safeParse({
      ...openEvidence,
      draft: { ...openEvidence.draft, lines: [...openEvidence.draft.lines, ...openEvidence.draft.lines] },
    }).success).toBe(false);
    expect(CartOpenEvidenceV1Schema.safeParse({
      ...openEvidence,
      cartExpiresAt: undefined,
    }).success).toBe(false);
    expect(cartOpenEvidenceHashPreimageV1({
      ...parsedOpenEvidence,
      cartExpiresAt: "2026-08-16T00:59:59.000Z",
    })).not.toBe(cartOpenEvidenceHashPreimageV1(parsedOpenEvidence));
  });

  it("requires a price-objection transition to carry current-message-bound objection evidence", () => {
    const transition = {
      schemaVersion: 1 as const,
      contractVersion: "NEGOTIATION_TRANSITION_EVIDENCE_V1" as const,
      sourceMessageIdHash: HASH_A,
      commandIdHash: HASH_B,
      eventIdHash: HASH_C,
      evidenceIdHash: HASH_C,
      objectionEvidenceIdHash: HASH_C,
      intent: "PRICE_OBJECTION" as const,
      reasonCode: "PRICE_TOO_HIGH",
      observedAt: "2026-08-14T01:00:00.000Z",
      evidenceHash: HASH_D,
    };
    expect(NegotiationTransitionEvidenceV1Schema.parse(transition)).toEqual(transition);
    expect(NegotiationTransitionEvidenceV1Schema.safeParse({
      ...transition,
      objectionEvidenceIdHash: null,
    }).success).toBe(false);
  });
});

describe("CanonicalCartStateV1", () => {
  it("defines one full-cart canonical preimage, including non-line fields", () => {
    const base = CanonicalCartStateV1Schema.parse({
      schemaVersion: 1,
      contractVersion: "CANONICAL_CART_STATE_V1",
      cart: cart(),
    });
    const changedStatus = { ...base, cart: cart({ status: "ABANDONED" }) };
    const changedTime = {
      ...base,
      cart: cart({ updatedAt: "2026-08-14T01:01:00.000Z" }),
    };

    expect(canonicalCartStateHashPreimageV1(base)).not.toBe(
      canonicalCartStateHashPreimageV1(changedStatus),
    );
    expect(canonicalCartStateHashPreimageV1(base)).not.toBe(
      canonicalCartStateHashPreimageV1(changedTime),
    );
    expect(canonicalCartStateHashPreimageV1(base)).toBe(
      `CANONICAL_CART_STATE_V1\n${canonicalJsonV1(base)}`,
    );
  });
});

describe("EffectBindingV1", () => {
  const binding = {
    schemaVersion: 1 as const,
    contractVersion: "EFFECT_BINDING_V1" as const,
    pageId: "page-1",
    conversationId: "conversation-1",
    sourceMessageIdHash: HASH_A,
    conversationRevision: 7,
    salesCycleRevision: 9,
    productIds: ["ÁO-001"],
    cart: {
      cartId: "15f9b215-2085-44f2-8d21-af4244577f5e",
      cartRevision: 2,
      cartStateHash: HASH_B,
      offerBindings: [{
        lineId: "0b884806-7c77-4410-bc47-a3d2bb51c936",
        productId: "ÁO-001",
        offerId: "ÁO-001-DIRECT",
        quantity: 1,
        unitPriceVnd: 250_000,
        priceFactRef: "price-fact-v7",
      }],
    },
    preview: null,
    claimSetHash: HASH_C,
    parentReadinessHash: null,
    payloadHash: null,
  };

  it("binds current message, exact cart and exact offer set without the cart-capacity ceiling", () => {
    expect(EffectBindingV1Schema.parse(binding)).toEqual(binding);
    expect(EffectBindingV1Schema.safeParse({
      ...binding,
      productIds: Array.from(
        { length: 51 },
        (_, index) => `P-${String(index).padStart(3, "0")}`,
      ),
      cart: null,
    }).success).toBe(true);
  });

  it("rejects non-canonical IDs and non-canonical offer ordering", () => {
    expect(EffectBindingV1Schema.safeParse({
      ...binding,
      productIds: ["A\u0301O-001"],
    }).success).toBe(false);
    expect(EffectBindingV1Schema.safeParse({
      ...binding,
      cart: {
        ...binding.cart,
        offerBindings: [
          { ...binding.cart.offerBindings[0], lineId: "1b884806-7c77-4410-bc47-a3d2bb51c936" },
          binding.cart.offerBindings[0],
        ],
      },
    }).success).toBe(false);
  });
});

describe("CartMutationBatchEvidenceV1", () => {
  const authority = (action: "ADD_LINE" | "REMOVE_LINE" | "SET_QUANTITY", productId: string, offerId: string) => ({
    schemaVersion: 1 as const,
    contractVersion: "CART_MUTATION_AUTHORITY_BINDING_V1" as const,
    sourceMessageIdHash: HASH_A,
    action,
    productId,
    offerId,
    authorityKind: action === "REMOVE_LINE"
      ? "DETERMINISTIC_REMOVE_CLASSIFIER" as const
      : "CANONICAL_BUYING_INTENT" as const,
    authorityEvidenceHash: HASH_B,
    bindingHash: HASH_C,
  });
  const receipt = (sequence: number, before: string, after: string) => ({
    schemaVersion: 1 as const,
    contractVersion: "CART_MUTATION_RECEIPT_V1" as const,
    sequence,
    commandIdHash: sequence === 0 ? HASH_B : HASH_C,
    mutation: {
      kind: "SET_QUANTITY" as const,
      lineId: "0b884806-7c77-4410-bc47-a3d2bb51c936",
      quantity: sequence + 2,
    },
    mutationPayloadHash: HASH_D,
    mutationReasonCode: "QUANTITY_CHANGED" as const,
    authority: authority("SET_QUANTITY", "ÁO-001", "ÁO-001-DIRECT"),
    beforeCartStateHash: before,
    afterCartStateHash: after,
    customerState: "READY" as const,
    appliedAt: `2026-08-14T01:0${sequence}:00.000Z`,
    evaluatedAt: `2026-08-14T01:0${sequence}:00.000Z`,
    evidenceHash: sequence === 0 ? HASH_C : HASH_D,
    contributor: "DETERMINISTIC_RUNTIME" as const,
    authorization: "NONE" as const,
  });
  const batch = {
    schemaVersion: 1 as const,
    contractVersion: "CART_MUTATION_BATCH_EVIDENCE_V1" as const,
    sourceMessageIdHash: HASH_A,
    initialCartStateHash: HASH_A,
    finalCartStateHash: HASH_C,
    receipts: [receipt(0, HASH_A, HASH_B), receipt(1, HASH_B, HASH_C)],
    replayContext: {
      schemaVersion: 1 as const,
      contractVersion: "CANONICAL_CART_REPLAY_CONTEXT_V1" as const,
      shopId: "shop-1",
      policyRef: { id: "policy-1", version: "v1", contentHash: `sha256:${HASH_D}` },
      policyBundle: POLICY,
      customerState: null,
    },
    evidenceHash: HASH_D,
  };

  it("supports an atomic N-mutation chain whose last receipt alone binds final cart", () => {
    expect(CartMutationBatchEvidenceV1Schema.parse(batch).receipts).toHaveLength(2);
  });

  it.each([
    { receipts: [receipt(0, HASH_A, HASH_B), receipt(1, HASH_D, HASH_C)] },
    { finalCartStateHash: HASH_D },
    { sourceMessageIdHash: HASH_D },
    { receipts: [receipt(1, HASH_A, HASH_B), receipt(0, HASH_B, HASH_C)] },
    { receipts: [
      receipt(0, HASH_A, HASH_C),
      receipt(1, HASH_C, HASH_D),
      { ...receipt(2, HASH_D, HASH_C), commandIdHash: HASH_D },
    ] },
  ])("rejects a broken, misordered, stale-message or wrong-final chain", (override) => {
    expect(CartMutationBatchEvidenceV1Schema.safeParse({ ...batch, ...override }).success)
      .toBe(false);
  });

  it("makes the receipt authority preimage sensitive to exact action, product and offer", () => {
    const base = authority("SET_QUANTITY", "ÁO-001", "ÁO-001-DIRECT");
    const preimage = cartMutationAuthorityBindingHashPreimageV1(base);
    for (const changed of [
      { ...base, action: "ADD_LINE" as const },
      { ...base, productId: "ÁO-002" },
      { ...base, offerId: "ÁO-001-SET" },
    ]) {
      expect(cartMutationAuthorityBindingHashPreimageV1(changed)).not.toBe(preimage);
    }
  });

  it("binds the exact negotiation reprice reason into the mutation receipt", () => {
    const base = receipt(0, HASH_A, HASH_B);
    const parsed = CartMutationBatchEvidenceV1Schema.parse({
      ...batch,
      finalCartStateHash: HASH_B,
      receipts: [base],
    });
    expect(parsed.receipts[0]?.mutationReasonCode).toBe("QUANTITY_CHANGED");
    const { mutationReasonCode: _omitted, ...unbound } = base;
    expect(CartMutationBatchEvidenceV1Schema.safeParse({
      ...batch,
      finalCartStateHash: HASH_B,
      receipts: [unbound],
    }).success).toBe(false);
  });

  it("rejects an add receipt whose authority names a different product or offer", () => {
    const addReceipt = {
      ...receipt(0, HASH_A, HASH_B),
      mutation: {
        kind: "ADD_LINE" as const,
        line: cart().lines[0],
      },
      authority: authority("ADD_LINE", "OTHER-PRODUCT", "OTHER-OFFER"),
    };
    expect(CartMutationBatchEvidenceV1Schema.safeParse({
      ...batch,
      finalCartStateHash: HASH_B,
      receipts: [addReceipt],
    }).success).toBe(false);
  });

  it("rejects a receipt evaluated before the canonical mutation was applied", () => {
    const impossible = {
      ...receipt(0, HASH_A, HASH_C),
      appliedAt: "2026-08-14T01:01:00.000Z",
      evaluatedAt: "2026-08-14T01:00:59.999Z",
    };
    expect(CartMutationBatchEvidenceV1Schema.safeParse({
      ...batch,
      receipts: [impossible],
    }).success).toBe(false);
  });
});
