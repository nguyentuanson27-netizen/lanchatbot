import { describe, expect, it } from "vitest";
import { PolicyBundleV1Schema } from "@lana/contracts";
import { applySalesCycleCommand, buildPurchaseConfirmedTagCommand, computeBankTransferPolicyHash, computeBusinessContentHash, computeOrderPreviewHash, createSalesCycleRuntimeState, executePersistedSalesCycleCommand, type SalesCycleRuntimeState, type SalesCycleStateRepositoryV1, type SalesCycleTransactionalEffectsV1, type SalesCycleTrustedPortsV1 } from "./sales-cycle-runtime.js";

const now = new Date("2026-07-22T06:00:00.000Z");
const cartId = "10000000-0000-4000-8000-000000000001";
const routing = { pageId: "1198992073286645", conversationId: "1198992073286645_sender" };

const fact = (status: "MATCHED" | "CHANGED" | "STALE" | "MISSING" = "MATCHED") => ({
  status,
  sourceVersionBefore: status === "MATCHED" ? "snapshot-1" : "snapshot-1",
  sourceVersionAfter: status === "MATCHED" ? "snapshot-1" : status === "CHANGED" ? "snapshot-2" : null,
  checkedAt: now.toISOString(),
});

const validation = (status: "MATCHED" | "CHANGED" = "MATCHED", cartVersion = 2) => ({
  cartId,
  cartVersion,
  price: fact(status),
  inventory: fact(),
  size: fact(),
  eta: fact(),
  eligible: status === "MATCHED",
  checkedAt: now.toISOString(),
});

const line = {
    lineId: "13000000-0000-4000-8000-000000000001",
    parentProductId: "CB182",
    offerId: "CB182-SET",
    offerKind: "SET" as const,
    quantity: 1,
    components: [
      { componentProductId: "CB182-AO", componentSku: "CB182-AO-M", componentRole: "TOP" as const, color: "BE", size: "M", quantity: 1 },
      { componentProductId: "CB182-CV", componentSku: "CB182-CV-M", componentRole: "SKIRT" as const, color: "BE", size: "M", quantity: 1 },
    ],
    allowMixedSizes: true,
    allowComponentSale: false,
    posUnitPriceVnd: 699_000,
    priceAuthority: {
      priceFactRef: "pos:cb182:set",
      shopId: "LANA_DESIGN",
      parentProductId: "CB182",
      offerId: "CB182-SET",
      offerPriceKind: "SET" as const,
      componentProductId: null,
      metadata: {
        authority: "PANCAKE_POS" as const,
        sourceVersion: "snapshot-1",
        observedAt: "2026-07-22T05:00:00.000Z",
        expiresAt: "2026-07-24T05:00:00.000Z",
        freshForSeconds: 172_800 as const,
        freshnessState: "FRESH" as const,
      },
    },
    lineTotalVnd: 699_000,
  };

const policyMetadata = { authority: "ADMIN_POLICY", sourceVersion: "policy-1", observedAt: "2026-07-22T00:00:00.000Z", expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" } as const;
const policy = PolicyBundleV1Schema.parse({
  schemaVersion: 1, policyBundleId: "lana-sales", policyVersion: "policy-1", shopId: "LANA_DESIGN", status: "ACTIVE", effectiveAt: "2026-07-22T00:00:00.000Z", effectiveUntil: null, supersedesPolicyVersion: null, scope: "SHOP_WIDE",
  commerceAuthority: { bomAuthority: "PANCAKE_POS", priceAuthority: "PANCAKE_POS", inventoryAuthority: "PANCAKE_POS", allowGoogleSheetsPriceOverride: false, allowAdminPriceOverride: false, missingPriceBehavior: "DO_NOT_QUOTE", metadata: policyMetadata },
  shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata: policyMetadata },
  multiItemOffer: { minimumProductCount: 2, discountBps: 500, countingUnit: "PARENT_PRODUCT_UNIT", setAndComboCountAsOne: true, scope: "SHOP_WIDE", metadata: policyMetadata },
  negotiation: { secondConcession: { freeShipping: true, fixedDiscountVnd: 0 }, finalConcession: { freeShipping: true, fixedDiscountVnd: 20_000 }, stacking: { multiItemDiscountWithSecondConcession: true, multiItemDiscountWithFinalConcession: true, deduplicateFreeShipping: true }, scope: "SHOP_WIDE", metadata: policyMetadata },
  closing: { customerStates: ["READY", "HESITANT", "CAUTIOUS"], decisionMode: "DETERMINISTIC_POLICY_ONLY", allowUnlistedOffers: false, metadata: policyMetadata },
});
const policyRef = { id: policy.policyBundleId, version: policy.policyVersion, contentHash: computeBusinessContentHash(policy) };
const cartDraft = { identity: { cartId, salesEpisodeId: "11000000-0000-4000-8000-000000000001", customerProfileId: "12000000-0000-4000-8000-000000000001" }, lines: [line], shopId: "LANA_DESIGN", policyRef };
const cartDraftRef = { id: "draft-cb182", version: "1", contentHash: computeBusinessContentHash(cartDraft) };

const mutationReference = (mutation: { kind: "SET_QUANTITY"; lineId: string; quantity: number }) => {
  const resolved = { mutation };
  return { reference: { id: `mutation-${mutation.quantity}`, version: "1", contentHash: computeBusinessContentHash(resolved) }, resolved };
};

const trustedPorts = (revalidation = validation(), attachments: readonly { attachmentId: string; kind: "IMAGE" | "FILE" | "OTHER" }[] = []): SalesCycleTrustedPortsV1 => ({
  resolveCartDraft: (reference) => reference.contentHash === cartDraftRef.contentHash ? cartDraft : null,
  resolveCartMutation: (reference) => {
    for (const quantity of [1, 2]) {
      const candidate = mutationReference({ kind: "SET_QUANTITY", lineId: line.lineId, quantity });
      if (reference.contentHash === candidate.reference.contentHash) return candidate.resolved;
    }
    return null;
  },
  resolveShopPolicy: (reference) => reference.contentHash === policyRef.contentHash ? policy : null,
  resolveInboundMessage: (sourceMessageId) => ({ messageId: sourceMessageId, pageId: routing.pageId, conversationId: routing.conversationId, senderType: "CUSTOMER", observedAt: now.toISOString(), attachments }),
  revalidateCheckout: () => revalidation,
});

const recipient = { fullName: "Nguyen Van A", phone: "0984997797", address: "Tan Chau, Tay Ninh", retentionClass: "CART_48H_OPERATIONAL" as const };

const bankPolicy = {
  policyId: "lana-mb",
  version: "1",
  bankName: "MB Bank",
  accountNumber: "118619000",
  accountHolder: "TEST LANA COMPANY",
  qrImageUrl: "https://assets.example.test/payments/lana-mb.png",
  customerInstruction: "Mình ck xong chụp bill giúp em check với kế toán ạ ❤️",
  effectiveAt: "2026-07-01T00:00:00.000Z",
  effectiveUntil: null,
};

function preview(payment: "COD" | "BANK_TRANSFER" = "COD") {
  const payload = {
    schemaVersion: 1 as const,
    previewId: "20000000-0000-4000-8000-000000000001",
    cartId,
    cartVersion: 2,
    stage: "ORDER_PREVIEW" as const,
    recipient,
    payment: payment === "COD" ? { method: "COD" as const, bankTransferPolicyRef: null } : {
      method: "BANK_TRANSFER" as const,
      bankTransferPolicyRef: { policyId: bankPolicy.policyId, version: bankPolicy.version, contentHash: computeBankTransferPolicyHash(bankPolicy) },
    },
    revalidation: validation(),
    createdAt: now.toISOString(),
    expiresAt: "2026-07-24T06:00:00.000Z",
  };
  return { ...payload, previewHash: computeOrderPreviewHash(payload) };
}

function addCart(state = createSalesCycleRuntimeState("conversation-hash", routing, now)) {
  for (const [kind, commandId] of [
    ["FACTS_PRESENTED", "stage-facts"],
    ["MEASUREMENTS_REQUIRED", "stage-measurements"],
    ["SIZE_RECOMMENDED", "stage-size"],
  ] as const) {
    if (state.stage === "SIZE_RECOMMENDED") break;
    const advanced = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind, commandId }, now });
    if (advanced.status !== "APPLIED") throw new Error(advanced.status);
    state = advanced.state;
  }
  const opened = applySalesCycleCommand({
    state,
    expectedRevision: state.revision,
    command: { kind: "CART_OPENED", commandId: "cart-1", cartDraftRef, expiresAt: "2026-07-24T06:00:00.000Z" },
    now,
    trustedPorts: trustedPorts(),
  });
  if (opened.status !== "APPLIED") throw new Error(opened.status);
  const captured = applySalesCycleCommand({
    state: opened.state,
    expectedRevision: opened.state.revision,
    command: {
      kind: "CHECKOUT_DETAILS_CAPTURED",
      commandId: "checkout-details",
      details: {
        fullName: recipient.fullName,
        phone: recipient.phone,
        address: recipient.address,
        paymentMethod: "COD",
      },
    },
    now,
  });
  if (captured.status !== "APPLIED") throw new Error(captured.status);
  const ready = applySalesCycleCommand({ state: captured.state, expectedRevision: captured.state.revision, command: { kind: "CART_READY", commandId: "cart-ready", expectedCartVersion: 1 }, now, trustedPorts: trustedPorts() });
  if (ready.status !== "APPLIED") throw new Error(ready.status);
  return ready.state;
}

function addPreview(state: SalesCycleRuntimeState, payment: "COD" | "BANK_TRANSFER" = "COD") {
  if (state.checkoutDraft?.paymentMethod !== payment) {
    const captured = applySalesCycleCommand({
      state,
      expectedRevision: state.revision,
      command: {
        kind: "CHECKOUT_DETAILS_CAPTURED",
        commandId: `checkout-payment-${payment}`,
        details: { paymentMethod: payment },
      },
      now,
    });
    if (captured.status !== "APPLIED") throw new Error(captured.status);
    state = captured.state;
  }
  const result = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "PREVIEW_CREATED", commandId: "preview-1", preview: preview(payment) }, now });
  if (result.status !== "APPLIED") throw new Error(result.status);
  return result.state;
}

const confirmationIntent = { source: "MODEL_STRUCTURED_OUTPUT" as const, intent: "PURCHASE_CONFIRMATION" as const, sourceMessageId: "mid-ok-1" };

describe("Phase 3 sales-cycle runtime", () => {
  it("rejects caller-supplied commerce data when trusted resolvers are absent or content is tampered", () => {
    let state = createSalesCycleRuntimeState("conversation-hash", routing, now);
    for (const [kind, commandId] of [["FACTS_PRESENTED", "facts"], ["MEASUREMENTS_REQUIRED", "measure"], ["SIZE_RECOMMENDED", "size"]] as const) {
      const result = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind, commandId }, now });
      if (result.status !== "APPLIED") throw new Error(result.status);
      state = result.state;
    }
    expect(applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "untrusted", cartDraftRef, expiresAt: "2026-07-24T06:00:00.000Z" }, now })).toMatchObject({ status: "REJECTED", reasonCode: "CART_DRAFT_UNTRUSTED" });
    const tampered = { ...cartDraftRef, contentHash: `sha256:${"f".repeat(64)}` as `sha256:${string}` };
    expect(applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "tampered", cartDraftRef: tampered, expiresAt: "2026-07-24T06:00:00.000Z" }, now, trustedPorts: trustedPorts() })).toMatchObject({ status: "REJECTED", reasonCode: "CART_DRAFT_UNTRUSTED" });
  });
  it("uses optimistic concurrency for state and cart versions", () => {
    const state = createSalesCycleRuntimeState("conversation-hash", routing, now);
    expect(applySalesCycleCommand({ state, expectedRevision: 9, command: { kind: "FACTS_PRESENTED", commandId: "facts-1" }, now })).toMatchObject({ status: "CONFLICT", reasonCode: "STATE_VERSION_CONFLICT" });
    const withCart = addCart(state);
    const mutation = mutationReference({ kind: "SET_QUANTITY", lineId: line.lineId, quantity: 2 });
    expect(applySalesCycleCommand({ state: withCart, expectedRevision: withCart.revision, command: { kind: "CART_MUTATED", commandId: "cart-2", expectedCartVersion: 0, mutationRef: mutation.reference, mutationReasonCode: "QUANTITY_CHANGED" }, now, trustedPorts: trustedPorts() })).toMatchObject({ status: "CONFLICT", reasonCode: "CART_VERSION_CONFLICT" });
  });

  it("rejects reopening a cart and a tampered preview", () => {
    const state = addCart();
    expect(applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "cart-switch", cartDraftRef, expiresAt: "2026-07-24T06:00:00.000Z" }, now, trustedPorts: trustedPorts() })).toMatchObject({ status: "REJECTED", reasonCode: "CART_ALREADY_OPEN" });
    const validPreview = preview("BANK_TRANSFER");
    if (validPreview.payment.method !== "BANK_TRANSFER") throw new Error("expected bank transfer fixture");
    const tampered = { ...validPreview, payment: { method: "BANK_TRANSFER" as const, bankTransferPolicyRef: { ...validPreview.payment.bankTransferPolicyRef, contentHash: `sha256:${"f".repeat(64)}` } } };
    expect(applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "PREVIEW_CREATED", commandId: "preview-tampered", preview: tampered }, now })).toMatchObject({ status: "REJECTED", reasonCode: "PREVIEW_INTEGRITY_INVALID" });
  });

  it("keeps a cart for exactly 48 hours and invalidates preview after mutation", () => {
    const withPreview = addPreview(addCart());
    const mutation = mutationReference({ kind: "SET_QUANTITY", lineId: line.lineId, quantity: 2 });
    const result = applySalesCycleCommand({ state: withPreview, expectedRevision: withPreview.revision, command: { kind: "CART_MUTATED", commandId: "cart-2", expectedCartVersion: 2, mutationRef: mutation.reference, mutationReasonCode: "QUANTITY_CHANGED" }, now, trustedPorts: trustedPorts() });
    expect(result).toMatchObject({ status: "APPLIED", state: { stage: "CART_OPEN", preview: null } });
  });

  it("allows an expired cart to be replaced by a fresh trusted draft", () => {
    const state = addCart();
    if (state.cart === null) throw new Error("cart missing");
    const expired = { ...state, cart: { ...state.cart, expiresAt: "2026-07-22T05:59:59.000Z" } };
    const reopened = applySalesCycleCommand({ state: expired, expectedRevision: expired.revision, command: { kind: "CART_OPENED", commandId: "reopen-expired", cartDraftRef, expiresAt: "2026-07-24T06:00:00.000Z" }, now, trustedPorts: trustedPorts() });
    expect(reopened).toMatchObject({ status: "APPLIED", state: { stage: "CART_OPEN", cart: { value: { revision: 1 } }, preview: null } });
  });

  it("recalculates the 5% offer when quantity changes", () => {
    const state = addCart();
    const increase = mutationReference({ kind: "SET_QUANTITY", lineId: line.lineId, quantity: 2 });
    const two = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_MUTATED", commandId: "qty-2", expectedCartVersion: 2, mutationRef: increase.reference, mutationReasonCode: "QUANTITY_CHANGED" }, now, trustedPorts: trustedPorts() });
    if (two.status !== "APPLIED" || two.state.cart === null) throw new Error(two.status);
    expect(two.state.cart.value).toMatchObject({ revision: 3, status: "OPEN", discountTotalVnd: 69_900 });
    const decrease = mutationReference({ kind: "SET_QUANTITY", lineId: line.lineId, quantity: 1 });
    const one = applySalesCycleCommand({ state: two.state, expectedRevision: two.state.revision, command: { kind: "CART_MUTATED", commandId: "qty-1", expectedCartVersion: 3, mutationRef: decrease.reference, mutationReasonCode: "QUANTITY_CHANGED" }, now, trustedPorts: trustedPorts() });
    expect(one).toMatchObject({ status: "APPLIED", state: { cart: { value: { revision: 4, discountTotalVnd: 0 } } } });
  });

  it("lets the negotiation engine, not the model, advance READY to HESITANT to CAUTIOUS", () => {
    const state = addCart();
    const first = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "NEGOTIATION_EVENT", commandId: "objection-command-1", expectedNegotiationVersion: 2, sourceMessageId: "message-1", intent: "PRICE_OBJECTION", reasonCode: "PRICE_TOO_HIGH" }, now, trustedPorts: trustedPorts() });
    if (first.status !== "APPLIED") throw new Error(first.status);
    expect(first.state).toMatchObject({ negotiation: { customerState: "HESITANT" }, cart: { value: { revision: 3, discountTotalVnd: 30_000, grandTotalVnd: 699_000 } }, preview: null });
    const second = applySalesCycleCommand({ state: first.state, expectedRevision: first.state.revision, command: { kind: "NEGOTIATION_EVENT", commandId: "objection-command-2", expectedNegotiationVersion: 3, sourceMessageId: "message-2", intent: "PRICE_OBJECTION", reasonCode: "PRICE_TOO_HIGH" }, now, trustedPorts: trustedPorts() });
    expect(second).toMatchObject({ status: "APPLIED", state: { negotiation: { customerState: "CAUTIOUS" }, cart: { value: { revision: 4, discountTotalVnd: 50_000, grandTotalVnd: 679_000 } } } });
  });

  it("binds negotiation retry to the verified inbound message id", () => {
    const state = addCart();
    const first = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "NEGOTIATION_EVENT", commandId: "first-command", expectedNegotiationVersion: 2, sourceMessageId: "same-meta-mid", intent: "PRICE_OBJECTION", reasonCode: "PRICE_TOO_HIGH" }, now, trustedPorts: trustedPorts() });
    if (first.status !== "APPLIED") throw new Error(first.status);
    const retry = applySalesCycleCommand({ state: first.state, expectedRevision: first.state.revision, command: { kind: "NEGOTIATION_EVENT", commandId: "different-command", expectedNegotiationVersion: 3, sourceMessageId: "same-meta-mid", intent: "PRICE_OBJECTION", reasonCode: "PRICE_TOO_HIGH" }, now, trustedPorts: trustedPorts() });
    expect(retry).toMatchObject({ status: "REJECTED", reasonCode: "NEGOTIATION_EVENT_ID_COLLISION", state: { negotiation: { customerState: "HESITANT" } } });
  });

  it("does not treat ok as confirmation outside the order-preview stage", () => {
    const state = addCart();
    expect(applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CONFIRM_PURCHASE", commandId: "confirm-1", intent: confirmationIntent }, now, trustedPorts: trustedPorts() })).toMatchObject({ status: "REJECTED", reasonCode: "CONFIRMATION_OUTSIDE_ORDER_PREVIEW" });
  });

  it("hands confirmation to a human when no trusted revalidation adapter is available", () => {
    const state = addPreview(addCart());
    const ports = { ...trustedPorts(), revalidateCheckout: () => null };
    const result = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CONFIRM_PURCHASE", commandId: "confirm-no-adapter", intent: confirmationIntent }, now, trustedPorts: ports });
    expect(result).toMatchObject({ status: "HANDOFF", reasonCode: "POLICY_UNAVAILABLE", desiredPancakeTag: "NHAN_VIEN" });
  });

  it("rejects a purchase confirmation that is not a verified customer message in this conversation", () => {
    const state = addPreview(addCart());
    const ports: SalesCycleTrustedPortsV1 = {
      ...trustedPorts(),
      resolveInboundMessage: (sourceMessageId) => ({ messageId: sourceMessageId, pageId: routing.pageId, conversationId: routing.conversationId, senderType: "PAGE", observedAt: now.toISOString(), attachments: [] }),
    };
    const result = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CONFIRM_PURCHASE", commandId: "fake-confirm", intent: confirmationIntent }, now, trustedPorts: ports });
    expect(result).toMatchObject({ status: "REJECTED", reasonCode: "PURCHASE_CONFIRMATION_EVIDENCE_UNTRUSTED" });
  });

  it("does not allow terminal state or out-of-order stage rewind", () => {
    const initial = createSalesCycleRuntimeState("conversation-hash", routing, now);
    expect(applySalesCycleCommand({ state: initial, expectedRevision: initial.revision, command: { kind: "SIZE_RECOMMENDED", commandId: "skip-size" }, now })).toMatchObject({ status: "REJECTED", reasonCode: "SALES_STAGE_TRANSITION_INVALID" });
    const previewState = addPreview(addCart());
    const confirmed = applySalesCycleCommand({ state: previewState, expectedRevision: previewState.revision, command: { kind: "CONFIRM_PURCHASE", commandId: "confirm-terminal", intent: confirmationIntent }, now, trustedPorts: trustedPorts() });
    if (confirmed.status !== "APPLIED") throw new Error(confirmed.status);
    expect(applySalesCycleCommand({ state: confirmed.state, expectedRevision: confirmed.state.revision, command: { kind: "FACTS_PRESENTED", commandId: "rewind" }, now })).toMatchObject({ status: "REJECTED", reasonCode: "SALES_CYCLE_TERMINAL" });
  });

  it("rechecks price, stock, size and ETA and hands changed facts to a human", () => {
    const cases = [
      ["price", "PRICE_CHANGED_BEFORE_CONFIRMATION"],
      ["inventory", "STOCK_CHANGED_BEFORE_CONFIRMATION"],
      ["size", "SIZE_CHANGED_BEFORE_CONFIRMATION"],
      ["eta", "ETA_CHANGED_BEFORE_CONFIRMATION"],
    ] as const;
    for (const [group, reasonCode] of cases) {
      const state = addPreview(addCart());
      const revalidation = { ...validation(), [group]: fact("CHANGED"), eligible: false };
      const result = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CONFIRM_PURCHASE", commandId: `confirm-${group}`, intent: confirmationIntent }, now, trustedPorts: trustedPorts(revalidation) });
      expect(result).toMatchObject({ status: "HANDOFF", reasonCode, silent: true, desiredPancakeTag: "NHAN_VIEN", handoffDecision: { tag: "NHAN_VIEN" }, state: { stage: "HANDED_OFF" } });
    }
  });

  it("creates PURCHASE_CONFIRMED once and never an ORDER_CREATED state", () => {
    const state = addPreview(addCart());
    const command = { kind: "CONFIRM_PURCHASE" as const, commandId: "confirm-1", intent: confirmationIntent };
    const result = applySalesCycleCommand({ state, expectedRevision: state.revision, command, now, trustedPorts: trustedPorts() });
    expect(result).toMatchObject({ status: "APPLIED", confirmation: { status: "PURCHASE_CONFIRMED", posOrderId: null }, desiredPancakeTag: "DA_CHOT_DON", transferToHuman: true });
    if (result.status !== "APPLIED") throw new Error(result.status);
    if (result.confirmation === null) throw new Error("confirmation missing");
    expect(buildPurchaseConfirmedTagCommand({ pageId: "1198992073286645", conversationId: "1198992073286645_sender", confirmation: result.confirmation })).toMatchObject({ schemaVersion: 2, desiredTag: "DA_CHOT_DON", operation: "ADD" });
    expect(applySalesCycleCommand({ state: result.state, expectedRevision: state.revision, command, now, trustedPorts: trustedPorts() })).toMatchObject({ status: "DUPLICATE", confirmation: { sourceMessageId: "mid-ok-1" } });
  });

  it("hands off when the final revalidation predates the preview", () => {
    const state = addPreview(addCart());
    const checkedAt = "2026-07-22T05:59:00.000Z";
    const oldFact = { ...fact(), checkedAt };
    const oldValidation = { cartId, cartVersion: 2, price: oldFact, inventory: oldFact, size: oldFact, eta: oldFact, eligible: true, checkedAt };
    expect(applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CONFIRM_PURCHASE", commandId: "confirm-old", intent: confirmationIntent }, now, trustedPorts: trustedPorts(oldValidation) })).toMatchObject({ status: "HANDOFF", reasonCode: "POLICY_UNAVAILABLE", desiredPancakeTag: "NHAN_VIEN" });
  });

  it("binds final fact versions to the preview baseline", () => {
    const state = addPreview(addCart());
    const newVersionFact = { ...fact(), sourceVersionBefore: "snapshot-2", sourceVersionAfter: "snapshot-2" };
    const changedBaseline = { ...validation(), price: newVersionFact };
    expect(applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CONFIRM_PURCHASE", commandId: "confirm-baseline", intent: confirmationIntent }, now, trustedPorts: trustedPorts(changedBaseline) })).toMatchObject({ status: "HANDOFF", reasonCode: "PRICE_CHANGED_BEFORE_CONFIRMATION" });
  });

  it("returns structured MB transfer instructions and QR after confirmation", () => {
    const state = addPreview(addCart(), "BANK_TRANSFER");
    const result = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CONFIRM_PURCHASE", commandId: "confirm-bank", intent: confirmationIntent }, now, trustedPorts: trustedPorts(), resolveBankTransferPolicy: (reference) => reference.policyId === bankPolicy.policyId ? bankPolicy : null });
    expect(result).toMatchObject({ status: "APPLIED", paymentInstruction: { method: "BANK_TRANSFER", policyId: "lana-mb", qrImageUrl: "https://assets.example.test/payments/lana-mb.png" } });
    if (result.status === "APPLIED") expect(result.paymentInstruction?.text).toContain("118619000");
  });

  it("never verifies a payment receipt and sends it to a human silently", () => {
    const state = addPreview(addCart());
    const confirmed = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CONFIRM_PURCHASE", commandId: "confirm-1", intent: confirmationIntent }, now, trustedPorts: trustedPorts() });
    if (confirmed.status !== "APPLIED") throw new Error(confirmed.status);
    expect(applySalesCycleCommand({ state: confirmed.state, expectedRevision: confirmed.state.revision, command: { kind: "PAYMENT_RECEIPT_RECEIVED", commandId: "receipt-1", sourceMessageId: "receipt-mid", attachmentId: "bill-image-1" }, now, trustedPorts: trustedPorts(validation(), [{ attachmentId: "bill-image-1", kind: "IMAGE" }]) })).toMatchObject({ status: "HANDOFF", reasonCode: "PAYMENT_RECEIPT_REVIEW_REQUIRED", silent: true });
  });

  it("commits only one of two concurrent commands and emits effects only for the winner", async () => {
    class MemoryRepository implements SalesCycleStateRepositoryV1 {
      state = createSalesCycleRuntimeState("conversation-hash", routing, now);
      effects: SalesCycleTransactionalEffectsV1[] = [];
      async read() { return structuredClone(this.state); }
      async compareAndSwap(input: { expectedRevision: number; nextState: SalesCycleRuntimeState; effects: SalesCycleTransactionalEffectsV1 }) {
        if (this.state.revision !== input.expectedRevision) return false;
        this.state = structuredClone(input.nextState);
        this.effects.push(input.effects);
        return true;
      }
    }
    const repository = new MemoryRepository();
    const [left, right] = await Promise.all([
      executePersistedSalesCycleCommand({ repository, conversationKey: "conversation-hash", command: { kind: "FACTS_PRESENTED", commandId: "concurrent-left" }, now }),
      executePersistedSalesCycleCommand({ repository, conversationKey: "conversation-hash", command: { kind: "FACTS_PRESENTED", commandId: "concurrent-right" }, now }),
    ]);
    expect([left.status, right.status].sort()).toEqual(["APPLIED", "CONFLICT"]);
    expect(repository.state.revision).toBe(1);
    expect(repository.effects).toHaveLength(1);
  });
  it("persists bounded clarification state and rejects repeated questions", () => {
    let state = addCart();
    const first = applySalesCycleCommand({
      state,
      expectedRevision: state.revision,
      command: {
        kind: "CLARIFICATION_REQUESTED",
        commandId: "clarification-1",
        reasonCode: "CHECKOUT_DETAILS_MISSING",
        missingFields: ["PHONE", "ADDRESS"],
        productId: "CB182",
        questionFingerprint: "a".repeat(64),
        maxAttempts: 3,
      },
      now,
    });
    expect(first).toMatchObject({
      status: "APPLIED",
      state: {
        clarification: {
          reasonCode: "CHECKOUT_DETAILS_MISSING",
          missingFields: ["ADDRESS", "PHONE"],
          productId: "CB182",
          attemptCount: 1,
          maxAttempts: 3,
        },
      },
    });
    if (first.status !== "APPLIED") throw new Error(first.status);
    state = first.state;

    expect(applySalesCycleCommand({
      state,
      expectedRevision: state.revision,
      command: {
        kind: "CLARIFICATION_REQUESTED",
        commandId: "clarification-repeat",
        reasonCode: "CHECKOUT_DETAILS_MISSING",
        missingFields: ["ADDRESS", "PHONE"],
        productId: "CB182",
        questionFingerprint: "a".repeat(64),
        maxAttempts: 3,
      },
      now,
    })).toMatchObject({ status: "REJECTED", reasonCode: "CLARIFICATION_RETRY_INVALID" });

    const progressed = applySalesCycleCommand({
      state,
      expectedRevision: state.revision,
      command: {
        kind: "CLARIFICATION_REQUESTED",
        commandId: "clarification-progress",
        reasonCode: "CHECKOUT_DETAILS_MISSING",
        missingFields: ["ADDRESS"],
        productId: "CB182",
        questionFingerprint: "b".repeat(64),
        maxAttempts: 3,
      },
      now,
    });
    expect(progressed).toMatchObject({
      status: "APPLIED",
      state: { clarification: { missingFields: ["ADDRESS"], attemptCount: 1 } },
    });
    if (progressed.status !== "APPLIED") throw new Error(progressed.status);
    const resolved = applySalesCycleCommand({
      state: progressed.state,
      expectedRevision: progressed.state.revision,
      command: { kind: "CLARIFICATION_RESOLVED", commandId: "clarification-resolved" },
      now,
    });
    expect(resolved).toMatchObject({ status: "APPLIED", state: { clarification: null } });
  });
});
