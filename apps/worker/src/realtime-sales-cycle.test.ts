import {
  buildCanonicalDecisionEvidenceV1,
} from "@lana/business-tools";
import {
  PolicyBundleV1Schema,
  type AgentBuyingIntentV1,
  type AgentSalesSignalsV1,
  type CartLineV1,
} from "@lana/contracts";
import {
  computeBusinessContentHash,
  type RuntimeBehaviorModeResolution,
  type RuntimePolicyResolution,
} from "@lana/chat-runtime";
import { describe, expect, it } from "vitest";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import {
  createRealtimeSalesState,
  evaluateRealtimeSalesCycle,
} from "./realtime-sales-cycle.js";

const now = new Date("2026-07-23T03:00:00.000Z");
const pageId = "1198992073286645";
const conversationId = "33333333-3333-4333-8333-333333333333";
const metadata = {
  authority: "ADMIN_POLICY",
  sourceVersion: "policy-live-1",
  observedAt: "2026-07-23T02:00:00.000Z",
  expiresAt: null,
  freshForSeconds: null,
  freshnessState: "FRESH",
} as const;
const policy = PolicyBundleV1Schema.parse({
  schemaVersion: 1,
  policyBundleId: `admin-policy:${pageId}`,
  policyVersion: "phase3-live-1",
  shopId: "LANA",
  status: "ACTIVE",
  effectiveAt: "2026-07-23T02:00:00.000Z",
  effectiveUntil: null,
  supersedesPolicyVersion: null,
  scope: "SHOP_WIDE",
  commerceAuthority: {
    bomAuthority: "PANCAKE_POS",
    priceAuthority: "PANCAKE_POS",
    inventoryAuthority: "PANCAKE_POS",
    allowGoogleSheetsPriceOverride: false,
    allowAdminPriceOverride: false,
    missingPriceBehavior: "DO_NOT_QUOTE",
    metadata,
  },
  shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata },
  multiItemOffer: {
    minimumProductCount: 2,
    discountBps: 500,
    countingUnit: "PARENT_PRODUCT_UNIT",
    setAndComboCountAsOne: true,
    scope: "SHOP_WIDE",
    metadata,
  },
  negotiation: {
    secondConcession: { freeShipping: true, fixedDiscountVnd: 0 },
    finalConcession: { freeShipping: true, fixedDiscountVnd: 20_000 },
    stacking: {
      multiItemDiscountWithSecondConcession: true,
      multiItemDiscountWithFinalConcession: true,
      deduplicateFreeShipping: true,
    },
    scope: "SHOP_WIDE",
    metadata,
  },
  closing: {
    customerStates: ["READY", "HESITANT", "CAUTIOUS"],
    decisionMode: "DETERMINISTIC_POLICY_ONLY",
    allowUnlistedOffers: false,
    metadata,
  },
});

const policyResolution = {
  status: "RESOLVED",
  source: "DATABASE",
  mayAffectOutbound: true,
  reasonCodes: [],
  auditWrite: "RECORDED",
  audit: {},
  bundle: {
    schemaVersion: 1,
    bundleId: "runtime-phase3-live",
    bundleHash: "sha256:test",
    pageId,
    channel: "PUBLISHED",
    sideEffects: "LIVE_OUTBOUND",
    resolvedAt: now.toISOString(),
    policy,
    versionReferences: [],
    artifacts: {
      shopPolicy: {},
      offerPolicy: {},
      closingStrategy: {},
      sizeCharts: {},
      handoffMatrix: null,
      paymentPolicy: null,
    },
  },
} as unknown as RuntimePolicyResolution;

function line(quantity: number): CartLineV1 {
  return {
    lineId: "13000000-0000-4000-8000-000000000001",
    parentProductId: "CB182",
    offerId: "SET",
    offerKind: "SET",
    quantity,
    components: [
      {
        componentProductId: "CB182_AO",
        componentSku: "CB182_AO_BE_M",
        componentRole: "TOP",
        color: "BE",
        size: "M",
        quantity: 1,
      },
      {
        componentProductId: "CB182_CV",
        componentSku: "CB182_CV_BE_M",
        componentRole: "SKIRT",
        color: "BE",
        size: "M",
        quantity: 1,
      },
    ],
    allowMixedSizes: true,
    allowComponentSale: false,
    posUnitPriceVnd: 699_000,
    priceAuthority: {
      priceFactRef: "pos:cb182:set",
      shopId: "LANA",
      parentProductId: "CB182",
      offerId: "SET",
      offerPriceKind: "SET",
      componentProductId: null,
      metadata: {
        authority: "PANCAKE_POS",
        sourceVersion: "snapshot-1",
        observedAt: "2026-07-23T02:00:00.000Z",
        expiresAt: "2026-07-25T02:00:00.000Z",
        freshForSeconds: 172_800,
        freshnessState: "FRESH",
      },
    },
    lineTotalVnd: 699_000 * quantity,
  };
}

const facts: BusinessFactsReader = {
  async ready() { return true; },
  async close() {},
  async resolve() { throw new Error("not used"); },
  async resolveCartSelection(query) {
    return {
      status: "READY",
      line: line(query.quantity),
      shopId: "LANA",
      versions: {
        price: "price-v1",
        inventory: "inventory-v1",
        size: "size-v1",
        eta: query.deliveryAddress ? "eta-v1" : null,
      },
      eta: query.deliveryAddress ? { minDays: 3, maxDays: 6 } : null,
      etaExpiresAt: query.deliveryAddress ? "2026-07-25T02:00:00.000Z" : null,
      sourceAuthority: "POS_SNAPSHOT",
      stockStatus: "IN_STOCK",
      stockAvailableQuantity: 3,
      sourceObservedAt: "2026-07-23T02:00:00.000Z",
      sourceExpiresAt: "2026-07-25T02:00:00.000Z",
    };
  },
};

function canonicalBuyingIntent(
  text: string,
  modelBuyingIntent: AgentBuyingIntentV1 | null = null,
) {
  return buildCanonicalDecisionEvidenceV1({
    text,
    sourceMessageId: `mid:${text}`,
    productId: "CB182",
    modelBuyingIntent,
    evaluatedAt: now,
  }).buyingIntent;
}

function input(
  state: ReturnType<typeof createRealtimeSalesState>,
  text: string,
  eventKey: string,
) {
  return {
    pageId,
    conversationId,
    customerHash: "customer-hash",
    state,
    stateRevision: state.revision,
    conversationRevision: 7,
    text,
    messageId: `mid-${eventKey}`,
    eventKey,
    senderId: "sender-1",
    occurredAt: now.toISOString(),
    attachmentIds: [],
    productId: "CB182",
    offerType: "SET",
    size: "M",
    color: "BE",
    canonicalBuyingIntent: canonicalBuyingIntent(text),
    shopAlias: "LANA",
    policyResolution,
    facts,
    now,
  } as const;
}

function signals(input: {
  fullName?: { value: string; evidenceText?: string; confidence?: number };
  phone?: { value: string; evidenceText?: string; confidence?: number };
  address?: { value: string; evidenceText?: string; confidence?: number };
  paymentMethod?: {
    value: "COD" | "BANK_TRANSFER";
    evidenceText?: string;
    confidence?: number;
  };
  confirmation?: {
    decision: "CONFIRM" | "REJECT" | "UNCLEAR";
    evidenceText: string | null;
    confidence?: number;
  };
  buyingIntent?: {
    decision: "NONE" | "CONSIDERING" | "COMMITTED" | "NEGATED";
    requestedAction: "NONE" | "OPEN_CART" | "ADD_TO_CART" | "SET_QUANTITY" | "PROCEED_TO_PAYMENT";
    quantity?: number | null;
    evidenceText?: string | null;
    confidence?: number;
  };
} = {}): AgentSalesSignalsV1 {
  const textField = (
    field: { value: string; evidenceText?: string; confidence?: number } | undefined,
  ) => field
    ? {
        value: field.value,
        evidenceText: field.evidenceText ?? field.value,
        confidence: field.confidence ?? 0.99,
      }
    : { value: null, evidenceText: null, confidence: 0 };
  return {
    checkoutExtraction: {
      fullName: textField(input.fullName),
      phone: textField(input.phone),
      address: textField(input.address),
      paymentMethod: input.paymentMethod
        ? {
            value: input.paymentMethod.value,
            evidenceText: input.paymentMethod.evidenceText ?? input.paymentMethod.value,
            confidence: input.paymentMethod.confidence ?? 0.99,
          }
        : { value: null, evidenceText: null, confidence: 0 },
    },
    purchaseConfirmation: input.confirmation
      ? {
          decision: input.confirmation.decision,
          evidenceText: input.confirmation.evidenceText,
          confidence: input.confirmation.confidence ?? 0.99,
        }
      : {
          decision: "UNCLEAR",
          evidenceText: null,
          confidence: 0,
        },
    ...(input.buyingIntent
      ? {
          buyingIntent: {
            decision: input.buyingIntent.decision,
            requestedAction: input.buyingIntent.requestedAction,
            quantity: input.buyingIntent.quantity ?? null,
            evidenceText: input.buyingIntent.evidenceText ?? null,
            confidence: input.buyingIntent.confidence ?? 0.99,
          },
        }
      : {}),
  };
}

function behaviorResolution(
  confirmationMode: RuntimeBehaviorModeResolution["confirmationMode"],
): RuntimeBehaviorModeResolution {
  return {
    confirmationMode,
    salesAuthorityMode: "LEGACY",
    stateReadMode: "LEGACY",
    modeVersionId: "30000000-0000-4000-8000-000000000001",
    contentHash: `sha256:${"a".repeat(64)}`,
    pointerRevision: 1,
    source: "DATABASE",
    status: "RESOLVED",
    reasonCodes: [],
    pointerUpdatedAt: now.toISOString(),
    resolvedAt: now.toISOString(),
    propagationMs: 0,
    auditWrite: "RECORDED",
  };
}

async function previewState(eventPrefix: string) {
  const state = createRealtimeSalesState(conversationId, pageId, now);
  const opened = await evaluateRealtimeSalesCycle(input(state, "chốt CB182 size M", `${eventPrefix}-open`));
  const previewed = await evaluateRealtimeSalesCycle(input(
    opened.plan!.state,
    "Tên: Lan\nSĐT: 0984997797\nĐịa chỉ: Tân Châu, Tây Ninh\nCOD",
    `${eventPrefix}-details`,
  ));
  return previewed.plan!.state;
}

describe("realtime Phase 3 sales cycle", () => {
  it.each([
    "Được, size M nhé",
    "ship cho chị mẫu trên",
    "ok lấy màu be",
  ])("moves a contextual buying signal forward instead of staying silent: %s", async (text) => {
    const state = createRealtimeSalesState(conversationId, pageId, now);
    const output = await evaluateRealtimeSalesCycle(input(
      state,
      text,
      `event-buying-${text.length}`,
    ));
    expect(output).toMatchObject({
      handled: true,
      transferToHuman: false,
      plan: { state: { stage: "CART_OPEN" } },
    });
    expect(output.messages).not.toHaveLength(0);
  });

  it.each([
    ["làm đơn mẫu này cho mình", "OPEN_CART"],
    ["gửi mẫu này về Hà Nội giúp chị", "OPEN_CART"],
    ["xin số tài khoản để chuyển luôn", "PROCEED_TO_PAYMENT"],
  ] as const)("blocks model-only long-tail buying evidence: %s", async (text, requestedAction) => {
    const state = createRealtimeSalesState(conversationId, pageId, now);
    const output = await evaluateRealtimeSalesCycle({
      ...input(state, text, `event-hybrid-${requestedAction}`),
      canonicalBuyingIntent: canonicalBuyingIntent(text, {
        decision: "COMMITTED",
        requestedAction,
        quantity: null,
        evidenceText: text,
        confidence: 0.97,
      }),
      salesSignals: signals({
        buyingIntent: {
          decision: "COMMITTED",
          requestedAction,
          evidenceText: text,
          confidence: 0.97,
        },
      }),
    });
    expect(output).toMatchObject({ handled: true, transferToHuman: true });
    expect(output.plan?.state.cart ?? null).toBeNull();
  });

  it("blocks model-only quantity evidence from opening a cart", async () => {
    const text = "cho mình hai cái giống nhau";
    const state = createRealtimeSalesState(conversationId, pageId, now);
    const output = await evaluateRealtimeSalesCycle({
      ...input(state, text, "event-hybrid-quantity"),
      canonicalBuyingIntent: canonicalBuyingIntent(text, {
        decision: "COMMITTED",
        requestedAction: "SET_QUANTITY",
        quantity: 2,
        evidenceText: text,
        confidence: 0.98,
      }),
      salesSignals: signals({
        buyingIntent: {
          decision: "COMMITTED",
          requestedAction: "SET_QUANTITY",
          quantity: 2,
          evidenceText: text,
          confidence: 0.98,
        },
      }),
    });
    expect(output.transferToHuman).toBe(true);
    expect(output.plan?.state.cart ?? null).toBeNull();
  });

  it.each([
    {
      text: "mẫu này giá bao nhiêu?",
      buyingIntent: {
        decision: "COMMITTED" as const,
        requestedAction: "OPEN_CART" as const,
        evidenceText: "mẫu này giá bao nhiêu?",
        confidence: 0.99,
      },
    },
    {
      text: "không mua mẫu này",
      buyingIntent: {
        decision: "NEGATED" as const,
        requestedAction: "NONE" as const,
        evidenceText: "không mua mẫu này",
        confidence: 0.99,
      },
    },
  ])("does not open a cart or request PII for informational/negated evidence: $text", async ({ text, buyingIntent }) => {
    const state = createRealtimeSalesState(conversationId, pageId, now);
    const output = await evaluateRealtimeSalesCycle({
      ...input(state, text, `event-hybrid-rejected-${text.length}`),
      canonicalBuyingIntent: canonicalBuyingIntent(text, {
        ...buyingIntent,
        quantity: null,
      }),
      salesSignals: signals({ buyingIntent }),
    });
    expect(output.plan?.state.stage).not.toBe("CART_OPEN");
    expect(output.plan?.state.cart).toBeNull();
    expect(output.messages.join(" ")).not.toContain("SĐT");
    expect(output.messages.join(" ")).not.toContain("Địa chỉ");
  });

  it("goes from purchase intent to preview and PURCHASE_CONFIRMED exactly once", async () => {
    let state = createRealtimeSalesState(conversationId, pageId, now);
    const opened = await evaluateRealtimeSalesCycle(input(
      state,
      "chốt CB182 size M",
      "event-open",
    ));
    expect(opened).toMatchObject({
      handled: true,
      transferToHuman: false,
      plan: {
        state: { stage: "CART_OPEN" },
      },
      protectedOutbound: {
        readiness: { effect: "PROTECTED_OUTBOUND", outcome: "READY" },
        claimTypes: expect.arrayContaining(["PRICE", "SHIPPING_FEE"]),
      },
    });
    expect(opened.plan?.effectReadiness).toEqual(expect.arrayContaining([
      expect.objectContaining({ effect: "CART_OPEN", outcome: "READY", authorization: "NONE" }),
      expect.objectContaining({ effect: "PROTECTED_OUTBOUND", outcome: "READY", authorization: "NONE" }),
    ]));
    state = opened.plan!.state;

    const previewed = await evaluateRealtimeSalesCycle(input(
      state,
      "Tên: Lan\nSĐT: 0984997797\nĐịa chỉ: Tân Châu, Tây Ninh\nCOD",
      "event-details",
    ));
    expect(previewed).toMatchObject({
      handled: true,
      transferToHuman: false,
      plan: {
        state: { stage: "ORDER_PREVIEW" },
      },
      protectedOutbound: {
        readiness: { effect: "PROTECTED_OUTBOUND", outcome: "READY" },
        claimTypes: expect.arrayContaining(["ETA", "PRICE", "SHIPPING_FEE"]),
      },
    });
    expect(previewed.plan?.effectReadiness).toEqual(expect.arrayContaining([
      expect.objectContaining({ effect: "ORDER_PREVIEW", outcome: "READY", authorization: "NONE" }),
      expect.objectContaining({ effect: "PROTECTED_OUTBOUND", outcome: "READY", authorization: "NONE" }),
    ]));
    expect(previewed.messages[0]).toMatchObject({
      kind: "TEXT",
      text: expect.stringContaining("3-6"),
    });
    state = previewed.plan!.state;

    const confirmed = await evaluateRealtimeSalesCycle(input(
      state,
      "ok",
      "event-confirm",
    ));
    expect(confirmed).toMatchObject({
      handled: true,
      transferToHuman: true,
      desiredTag: "DA_CHOT_DON",
      reasonCode: "PURCHASE_CONFIRMED",
      plan: {
        state: { stage: "PURCHASE_CONFIRMED" },
        effectReadiness: expect.arrayContaining([
          expect.objectContaining({ effect: "PURCHASE_CONFIRMATION", outcome: "READY", authorization: "NONE" }),
          expect.objectContaining({ effect: "PROTECTED_OUTBOUND", outcome: "READY", authorization: "NONE" }),
        ]),
        deterministicConfirmationEvidence: {
          authorityVersion: "DETERMINISTIC_CONFIRMATION_EVIDENCE_V1",
          classifierVersion: "LEGACY_CONFIRMATION_V1",
          decision: "CONFIRM",
          reasonCode: "CONFIRMATION_DETERMINISTIC_MATCH",
          authorization: "NONE",
        },
      },
      protectedOutbound: {
        claims: [],
        claimTypes: [],
        readiness: {
          effect: "PROTECTED_OUTBOUND",
          outcome: "READY",
          deterministicEvidenceHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
        },
      },
    });
    expect(confirmed.messages[0]).toEqual({
      kind: "TEXT",
      text: "Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.",
    });
  });

  it("uses one authoritative selection snapshot for protected cart text and claims", async () => {
    let reads = 0;
    const changingFacts: BusinessFactsReader = {
      ...facts,
      async resolveCartSelection(query) {
        reads += 1;
        const amount = reads === 1 ? 699_000 : 799_000;
        const selectedLine = line(query.quantity);
        return {
          status: "READY",
          line: {
            ...selectedLine,
            posUnitPriceVnd: amount,
            lineTotalVnd: amount * query.quantity,
          },
          shopId: "LANA",
          versions: {
            price: `price-v${reads}`,
            inventory: "inventory-v1",
            size: "size-v1",
            eta: null,
          },
          eta: null,
          etaExpiresAt: null,
          sourceAuthority: "POS_SNAPSHOT",
          stockStatus: "IN_STOCK",
          stockAvailableQuantity: 3,
          sourceObservedAt: "2026-07-23T02:00:00.000Z",
          sourceExpiresAt: "2026-07-25T02:00:00.000Z",
        };
      },
    };
    const output = await evaluateRealtimeSalesCycle({
      ...input(createRealtimeSalesState(conversationId, pageId, now), "chốt CB182 size M", "event-snapshot"),
      facts: changingFacts,
    });

    expect(reads).toBe(1);
    expect(output.messages[0]).toMatchObject({ text: expect.stringContaining("699.000") });
    expect(output.protectedOutbound?.claims.find(({ type }) => type === "PRICE")).toMatchObject({
      value: { amountVnd: 699_000, currency: "VND" },
    });
  });

  it("blocks protected cart output when facts expire during the turn", async () => {
    const expiringFacts: BusinessFactsReader = {
      ...facts,
      async resolveCartSelection(query) {
        return {
          status: "READY",
          line: line(query.quantity),
          shopId: "LANA",
          versions: {
            price: "price-expiring",
            inventory: "inventory-expiring",
            size: "size-expiring",
            eta: null,
          },
          eta: null,
          etaExpiresAt: null,
          sourceAuthority: "POS_SNAPSHOT",
          stockStatus: "IN_STOCK",
          stockAvailableQuantity: 3,
          sourceObservedAt: "2026-07-23T02:59:00.000Z",
          sourceExpiresAt: "2026-07-23T03:00:30.000Z",
        };
      },
    };
    const output = await evaluateRealtimeSalesCycle({
      ...input(createRealtimeSalesState(conversationId, pageId, now), "chốt CB182 size M", "event-expiring"),
      facts: expiringFacts,
      effectNow: () => new Date("2026-07-23T03:00:45.000Z"),
    });

    expect(output).toMatchObject({
      transferToHuman: true,
      messages: [],
      reasonCode: "CLAIM_STALE",
    });
  });

  it("uses the concise prompt when the customer changes a single-item cart", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "event-single-cart-open",
    ));
    const changed = await evaluateRealtimeSalesCycle(input(
      opened.plan!.state,
      "bỏ mẫu này",
      "event-single-cart-change",
    ));
    expect(changed.messages).toEqual([{
      kind: "TEXT",
      text: "Giỏ hiện chỉ còn một sản phẩm. Chị gửi mã mẫu muốn đổi để em kiểm tra.",
    }]);
  });

  it("blocks a fourth distinct cart product without throwing or mutating the cart", async () => {
    const multiProductFacts: BusinessFactsReader = {
      ...facts,
      async resolveCartSelection(query) {
        const selectedLine = line(query.quantity);
        if (!selectedLine.priceAuthority) throw new Error("test selection requires price authority");
        return {
          status: "READY",
          line: {
            ...selectedLine,
            lineId: query.lineId,
            parentProductId: query.productId,
            components: selectedLine.components.map((component) => ({
              ...component,
              componentProductId: `${query.productId}_${component.componentRole}`,
              componentSku: `${query.productId}_${component.componentRole}_BE_M`,
            })),
            priceAuthority: {
              ...selectedLine.priceAuthority,
              priceFactRef: `pos:${query.productId}:set`,
              parentProductId: query.productId,
            },
          },
          shopId: "LANA",
          versions: {
            price: `price-${query.productId}`,
            inventory: `inventory-${query.productId}`,
            size: `size-${query.productId}`,
            eta: null,
          },
          eta: null,
          etaExpiresAt: null,
          sourceAuthority: "POS_SNAPSHOT",
          stockStatus: "IN_STOCK",
          stockAvailableQuantity: 3,
          sourceObservedAt: "2026-07-23T02:00:00.000Z",
          sourceExpiresAt: "2026-07-25T02:00:00.000Z",
        };
      },
    };
    const productInput = (
      state: ReturnType<typeof createRealtimeSalesState>,
      productId: string,
      turn: number,
    ) => {
      const text = `chốt ${productId} size M`;
      return {
        ...input(state, text, `event-product-${turn}`),
        productId,
        canonicalBuyingIntent: buildCanonicalDecisionEvidenceV1({
          text,
          sourceMessageId: `mid:${text}`,
          productId,
          modelBuyingIntent: null,
          evaluatedAt: now,
        }).buyingIntent,
        facts: multiProductFacts,
      };
    };

    let state = createRealtimeSalesState(conversationId, pageId, now);
    for (const [index, productId] of ["PRODUCT-1", "PRODUCT-2", "PRODUCT-3"].entries()) {
      const output = await evaluateRealtimeSalesCycle(productInput(state, productId, index + 1));
      expect(output.reasonCode).toBeNull();
      state = output.plan!.state;
    }

    const fourth = await evaluateRealtimeSalesCycle(productInput(state, "PRODUCT-4", 4));

    expect(fourth).toMatchObject({
      handled: true,
      messages: [],
      transferToHuman: true,
      desiredTag: "NHAN_VIEN",
      reasonCode: "PRODUCT_AMBIGUOUS",
      plan: null,
    });
    expect(state.cart?.value.lines).toHaveLength(3);
    expect(state.cart?.value.lines.map(({ parentProductId }) => parentProductId))
      .toEqual(["PRODUCT-1", "PRODUCT-2", "PRODUCT-3"]);
  });

  it("stacks 5%, freeship and final 20k while the same evidence cannot escalate twice", async () => {
    let state = createRealtimeSalesState(conversationId, pageId, now);
    const opened = await evaluateRealtimeSalesCycle(input(
      state,
      "lấy 2 set CB182 size M",
      "event-open-2",
    ));
    state = opened.plan!.state;
    expect(state.cart?.value.discountTotalVnd).toBe(69_900);

    const hesitant = await evaluateRealtimeSalesCycle(input(
      state,
      "đắt quá bớt đi",
      "event-objection-1",
    ));
    state = hesitant.plan!.state;
    expect(state.negotiation?.customerState).toBe("HESITANT");
    expect(state.cart?.value.adjustments.some(({ kind }) => kind === "FREE_SHIPPING")).toBe(true);
    expect(state.cart?.value.discountTotalVnd).toBe(99_900);
    expect(hesitant.protectedOutbound).toMatchObject({
      readiness: { effect: "PROTECTED_OUTBOUND", outcome: "READY" },
      claimTypes: expect.arrayContaining(["FREESHIP", "PRICE", "PROMOTION_OFFER"]),
    });
    expect(hesitant.plan?.effectReadiness).toEqual(expect.arrayContaining([
      expect.objectContaining({ effect: "PROTECTED_OUTBOUND", outcome: "READY" }),
    ]));
    expect(hesitant.messages[0]).toMatchObject({ text: expect.stringContaining("giảm 5% và freeship") });

    const retry = await evaluateRealtimeSalesCycle({
      ...input(state, "đắt quá bớt đi", "event-objection-retry"),
      messageId: "mid-event-objection-1",
    });
    expect(retry).toMatchObject({
      handled: true,
      transferToHuman: false,
      reasonCode: "NEGOTIATION_REPLAY_IGNORED",
    });
    expect(state.negotiation?.customerState).toBe("HESITANT");

    const cautious = await evaluateRealtimeSalesCycle(input(
      state,
      "giảm thêm được không",
      "event-objection-2",
    ));
    state = cautious.plan!.state;
    expect(state.negotiation?.customerState).toBe("CAUTIOUS");
    expect(state.cart?.value.discountTotalVnd).toBe(119_900);
    expect(cautious.protectedOutbound).toMatchObject({
      readiness: { effect: "PROTECTED_OUTBOUND", outcome: "READY" },
      claimTypes: expect.arrayContaining(["FREESHIP", "PRICE", "PROMOTION_OFFER"]),
    });
    expect(cautious.messages[0]).toMatchObject({ text: expect.stringContaining("giảm thêm 20.000đ") });
    expect(cautious.messages[0]).not.toMatchObject({ text: expect.stringContaining("20k") });
  });

  it("extracts label-less checkout details from model evidence and keeps deterministic guards", async () => {
    const state = createRealtimeSalesState(conversationId, pageId, now);
    const opened = await evaluateRealtimeSalesCycle(input(
      state,
      "chốt CB182 size M",
      "event-natural-open",
    ));
    const text = "Lan 0987654321 123 Lê Lợi P.Bến Nghé Q1 HCM ship cod";
    const previewed = await evaluateRealtimeSalesCycle({
      ...input(opened.plan!.state, text, "event-natural-details"),
      salesSignals: signals({
        fullName: { value: "Lan" },
        address: { value: "123 Lê Lợi P.Bến Nghé Q1 HCM" },
      }),
    });
    expect(previewed).toMatchObject({
      handled: true,
      transferToHuman: false,
      telemetry: {
        checkoutCompleted: true,
        orderPreviewCreated: true,
        checkoutMissingFields: [],
      },
      plan: {
        state: {
          stage: "ORDER_PREVIEW",
          checkoutDraft: {
            fullName: "Lan",
            phone: "0987654321",
            address: "123 Lê Lợi P.Bến Nghé Q1 HCM",
            paymentMethod: "COD",
          },
        },
      },
    });
  });

  it("rejects model checkout values whose evidence is absent from the latest message", async () => {
    const state = createRealtimeSalesState(conversationId, pageId, now);
    const opened = await evaluateRealtimeSalesCycle(input(
      state,
      "chốt CB182 size M",
      "event-evidence-open",
    ));
    const output = await evaluateRealtimeSalesCycle({
      ...input(opened.plan!.state, "0987654321 COD", "event-evidence-details"),
      salesSignals: signals({
        fullName: {
          value: "Lan",
          evidenceText: "Lan không có trong tin nhắn",
        },
        address: {
          value: "123 Lê Lợi, Quận 1",
          evidenceText: "Địa chỉ không có trong tin nhắn",
        },
      }),
    });
    expect(output.plan?.state.stage).toBe("CART_OPEN");
    expect(output.telemetry).toMatchObject({
      checkoutCompleted: false,
      checkoutCapturedFields: ["PHONE", "PAYMENT_METHOD"],
      checkoutMissingFields: ["FULL_NAME", "ADDRESS"],
    });
  });

  it.each([
    "cho chị lấy nha",
    "vâng em chốt đơn",
    "uh oke lấy đi",
    "lên đơn giúp chị",
  ])("confirms natural Vietnamese only while the cart is in ORDER_PREVIEW: %s", async (text) => {
    const state = await previewState(`event-natural-confirm-${text.length}`);
    const output = await evaluateRealtimeSalesCycle(input(
      state,
      text,
      `event-natural-confirm-${Buffer.byteLength(text)}`,
    ));
    expect(output).toMatchObject({
      desiredTag: "DA_CHOT_DON",
      reasonCode: "PURCHASE_CONFIRMED",
      telemetry: {
        confirmationAttempted: true,
        confirmationConfirmed: true,
        confirmationSource: "DETERMINISTIC_CLASSIFIER",
      },
      plan: { state: { stage: "PURCHASE_CONFIRMED" } },
    });
  });

  it.each([
    "ok để chị suy nghĩ",
    "lấy ảnh cận chất",
    "không chốt",
  ])("does not confirm negated, hesitant, question or media language: %s", async (text) => {
    const state = await previewState(`event-reject-confirm-${text.length}`);
    const output = await evaluateRealtimeSalesCycle(input(
      state,
      text,
      `event-reject-confirm-${Buffer.byteLength(text)}`,
    ));
    expect(output.plan?.state.confirmation ?? null).toBeNull();
    expect(output.telemetry).toMatchObject({
      confirmationAttempted: true,
      confirmationConfirmed: false,
      confirmationSource: "DETERMINISTIC_CLASSIFIER",
    });
  });

  it("never treats a question about confirmation as purchase confirmation", async () => {
    const state = await previewState("event-confirmation-question");
    const output = await evaluateRealtimeSalesCycle(input(
      state,
      "chốt chưa em?",
      "event-confirmation-question-message",
    ));
    expect(output.plan?.state.confirmation ?? null).toBeNull();
  });

  it("never lets model-only confirmation authorize purchase", async () => {
    const state = await previewState("event-model-confirm");
    const text = "triển khai giúp chị";
    const confirmed = await evaluateRealtimeSalesCycle({
      ...input(state, text, "event-model-confirm-accepted"),
      salesSignals: signals({
        confirmation: { decision: "CONFIRM", evidenceText: text },
      }),
    });
    expect(confirmed.telemetry).toMatchObject({
      confirmationConfirmed: false,
      confirmationSource: "MODEL_STRUCTURED_OUTPUT",
    });
    expect(confirmed.plan?.state.confirmation ?? null).toBeNull();
    expect(confirmed.reasonCode).toBe("ASK_CONFIRMATION_CLARIFICATION");

    const rejected = await evaluateRealtimeSalesCycle({
      ...input(state, text, "event-model-confirm-hallucinated"),
      salesSignals: signals({
        confirmation: { decision: "CONFIRM", evidenceText: "không có trong tin mới" },
      }),
    });
    expect(rejected.plan?.state.confirmation ?? null).toBeNull();
  });

  it("does not interpret ok as purchase confirmation outside preview", async () => {
    const state = createRealtimeSalesState(conversationId, pageId, now);
    const output = await evaluateRealtimeSalesCycle(input(state, "ok", "event-ok"));
    expect(output).toMatchObject({
      handled: false,
      transferToHuman: false,
    });
    expect(output.plan?.state.confirmation ?? null).toBeNull();
  });
  it("asks distinct clarification questions and hands off only after the retry budget", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "clarification-open",
    ));
    const first = await evaluateRealtimeSalesCycle(input(
      opened.plan!.state,
      "0987654321 COD",
      "clarification-first",
    ));
    expect(first).toMatchObject({
      transferToHuman: false,
      telemetry: {
        clarificationCase: true,
        clarificationAttemptCount: 1,
        clarificationMaxAttempts: 3,
        clarificationBudgetExhausted: false,
        checkoutMissingFields: ["FULL_NAME", "ADDRESS"],
      },
      plan: { state: { clarification: { attemptCount: 1 } } },
    });

    const second = await evaluateRealtimeSalesCycle(input(
      first.plan!.state,
      "dạ",
      "clarification-second",
    ));
    const third = await evaluateRealtimeSalesCycle(input(
      second.plan!.state,
      "vâng",
      "clarification-third",
    ));
    expect(second.telemetry?.clarificationAttemptCount).toBe(2);
    expect(third.telemetry?.clarificationAttemptCount).toBe(3);
    expect(first.messages[0]).not.toEqual(second.messages[0]);
    expect(second.messages[0]).not.toEqual(third.messages[0]);

    const exhausted = await evaluateRealtimeSalesCycle(input(
      third.plan!.state,
      "ok",
      "clarification-exhausted",
    ));
    expect(exhausted).toMatchObject({
      handled: true,
      transferToHuman: true,
      desiredTag: "NHAN_VIEN",
      reasonCode: "CLARIFICATION_RETRY_EXHAUSTED",
      telemetry: {
        clarificationAttemptCount: 3,
        clarificationMaxAttempts: 3,
        clarificationBudgetExhausted: true,
        clarificationCase: true,
      },
    });
  });

  it("resets clarification attempts on progress and resumes checkout", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "clarification-progress-open",
    ));
    const first = await evaluateRealtimeSalesCycle(input(
      opened.plan!.state,
      "0987654321 COD",
      "clarification-progress-first",
    ));
    const named = await evaluateRealtimeSalesCycle(input(
      first.plan!.state,
      "Tên: Lan",
      "clarification-progress-name",
    ));
    expect(named).toMatchObject({
      transferToHuman: false,
      telemetry: {
        clarificationAttemptCount: 1,
        checkoutMissingFields: ["ADDRESS"],
      },
      plan: {
        state: {
          clarification: { missingFields: ["ADDRESS"], attemptCount: 1 },
        },
      },
    });
    const completed = await evaluateRealtimeSalesCycle(input(
      named.plan!.state,
      "Địa chỉ: 123 Lê Lợi, Quận 1, TP HCM",
      "clarification-progress-address",
    ));
    expect(completed).toMatchObject({
      transferToHuman: false,
      telemetry: { checkoutCompleted: true, checkoutMissingFields: [] },
      plan: { state: { stage: "ORDER_PREVIEW", clarification: null } },
    });
  });

  it("runs V2_SHADOW without changing any customer-visible or durable LEGACY outcome", async () => {
    const state = await previewState("shadow-no-effects");
    const text = "Dung chot don";
    const legacy = await evaluateRealtimeSalesCycle(input(state, text, "shadow-same-event"));
    const shadow = await evaluateRealtimeSalesCycle({
      ...input(state, text, "shadow-same-event"),
      behaviorModeResolution: behaviorResolution("V2_SHADOW"),
    });

    expect({
      handled: shadow.handled,
      messages: shadow.messages,
      plan: shadow.plan,
      transferToHuman: shadow.transferToHuman,
      desiredTag: shadow.desiredTag,
      reasonCode: shadow.reasonCode,
    }).toEqual({
      handled: legacy.handled,
      messages: legacy.messages,
      plan: legacy.plan,
      transferToHuman: legacy.transferToHuman,
      desiredTag: legacy.desiredTag,
      reasonCode: legacy.reasonCode,
    });
    expect(shadow.telemetry).toMatchObject({
      confirmationBehaviorMode: "V2_SHADOW",
      confirmationShadow: {
        decision: "UNCLEAR",
        reasonCode: "CONFIRMATION_AMBIGUOUS_UNACCENTED",
        differsFromLegacy: true,
        sideEffects: "DISABLED",
      },
    });
  });

  it.each([
    ["Đúng, chốt đơn giúp chị", "PURCHASE_CONFIRMED"],
    ["Đừng chốt đơn", "PURCHASE_CONFIRMATION_REJECTED"],
    ["Dừng chốt đơn", "PURCHASE_CONFIRMATION_REJECTED"],
  ] as const)("keeps NFC positive and clear rejection distinct in V2_ACTIVE: %s", async (text, expectedReason) => {
    const state = await previewState(`v2-nfc-${Buffer.byteLength(text)}`);
    const output = await evaluateRealtimeSalesCycle({
      ...input(state, text, `v2-nfc-message-${Buffer.byteLength(text)}`),
      behaviorModeResolution: behaviorResolution("V2_ACTIVE"),
    });
    expect(output.reasonCode).toBe(expectedReason);
    expect(output.plan?.state.stage ?? "ORDER_PREVIEW").toBe(
      expectedReason === "PURCHASE_CONFIRMED" ? "PURCHASE_CONFIRMED" : "ORDER_PREVIEW",
    );
    expect(output.telemetry).toMatchObject({
      confirmationBehaviorMode: "V2_ACTIVE",
      confirmationConfirmed: expectedReason === "PURCHASE_CONFIRMED",
    });
  });

  it.each([
    ["Chốt đơn được không?", "CONFIRMATION_QUESTION"],
    ["Dung chot don", "CONFIRMATION_AMBIGUOUS_UNACCENTED"],
  ] as const)("asks clarification for V2_ACTIVE nonterminal evidence without mutation: %s", async (text, reasonCode) => {
    const state = await previewState(`v2-clarify-${Buffer.byteLength(text)}`);
    const output = await evaluateRealtimeSalesCycle({
      ...input(state, text, `v2-clarify-message-${Buffer.byteLength(text)}`),
      behaviorModeResolution: behaviorResolution("V2_ACTIVE"),
    });
    expect(output).toMatchObject({
      handled: true,
      transferToHuman: false,
      desiredTag: null,
      reasonCode: "ASK_CONFIRMATION_CLARIFICATION",
      telemetry: {
        confirmationConfirmed: false,
        confirmationReasonCode: reasonCode,
        confirmationAction: "ASK_CONFIRMATION_CLARIFICATION",
      },
    });
    expect(output.plan).toBeNull();
    expect(output.messages.map((message) => message.kind === "TEXT" ? message.text : "").join(" ")).not.toMatch(/SĐT|địa chỉ/iu);
  });

  it("contains positive confirmation, ignores model fallback, and preserves clear rejection in CLARIFY_ONLY", async () => {
    const state = await previewState("clarify-only");
    const text = "ok triển khai giúp chị";
    const contained = await evaluateRealtimeSalesCycle({
      ...input(state, text, "clarify-only-model-confirm"),
      salesSignals: signals({ confirmation: { decision: "CONFIRM", evidenceText: text } }),
      behaviorModeResolution: behaviorResolution("CLARIFY_ONLY"),
    });
    expect(contained).toMatchObject({
      handled: true,
      transferToHuman: false,
      desiredTag: null,
      reasonCode: "ASK_CONFIRMATION_CLARIFICATION",
      telemetry: {
        confirmationBehaviorMode: "CLARIFY_ONLY",
        confirmationContainmentActive: true,
        confirmationConfirmed: false,
        confirmationSource: "DETERMINISTIC_CLASSIFIER",
        confirmationReasonCode: "CONFIRMATION_DETERMINISTIC_MATCH",
      },
    });
    expect(contained.plan).toBeNull();

    const modelOnlyText = "em xử lý theo phương án đó nhé";
    const modelOnly = await evaluateRealtimeSalesCycle({
      ...input(state, modelOnlyText, "clarify-only-model-only-confirm"),
      salesSignals: signals({
        confirmation: {
          decision: "CONFIRM",
          evidenceText: modelOnlyText,
        },
      }),
      behaviorModeResolution: behaviorResolution("CLARIFY_ONLY"),
    });
    expect(modelOnly.plan?.state.confirmation ?? null).toBeNull();
    expect(modelOnly.desiredTag).not.toBe("DA_CHOT_DON");
    expect(modelOnly.transferToHuman).toBe(false);
    expect(modelOnly.reasonCode).not.toBe("PURCHASE_CONFIRMED");

    const rejected = await evaluateRealtimeSalesCycle({
      ...input(state, "Không muốn chốt đơn", "clarify-only-reject"),
      behaviorModeResolution: behaviorResolution("CLARIFY_ONLY"),
    });
    expect(rejected.plan).toBeNull();
    expect(rejected).toMatchObject({
      transferToHuman: false,
      desiredTag: null,
      telemetry: {
        confirmationBehaviorMode: "CLARIFY_ONLY",
        confirmationConfirmed: false,
        confirmationReasonCode: "CONFIRMATION_EXPLICIT_REJECTION",
      },
    });

    const unrelated = await evaluateRealtimeSalesCycle({
      ...input(state, "mẫu này giá bao nhiêu?", "clarify-only-price-question"),
      behaviorModeResolution: behaviorResolution("CLARIFY_ONLY"),
    });
    expect(unrelated.reasonCode).not.toBe("ASK_CONFIRMATION_CLARIFICATION");
    expect(unrelated.plan?.state.confirmation ?? null).toBeNull();
    expect(unrelated.messages.map((message) => message.kind === "TEXT" ? message.text : "").join(" "))
      .not.toContain("xác nhận mua");
  });

  it("never completes purchase confirmation outside ORDER_PREVIEW in V2_ACTIVE", async () => {
    const state = createRealtimeSalesState(conversationId, pageId, now);
    const output = await evaluateRealtimeSalesCycle({
      ...input(state, "Đúng, chốt đơn giúp chị", "v2-active-outside-preview"),
      behaviorModeResolution: behaviorResolution("V2_ACTIVE"),
    });
    expect(output.plan?.state.stage).not.toBe("PURCHASE_CONFIRMED");
    expect(output.plan?.state.confirmation ?? null).toBeNull();
    expect(output.desiredTag).not.toBe("DA_CHOT_DON");
  });
});
