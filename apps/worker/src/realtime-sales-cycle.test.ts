import {
  buildCanonicalDecisionEvidenceV1,
} from "@lana/business-tools";
import {
  PolicyBundleV1Schema,
  CartV1Schema,
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
  buildGuardedModelNegotiationProposalV1,
  prepareHandoffStatePlanV1,
  type ModelNegotiationProposalV1,
} from "./realtime-sales-cycle.js";
import {
  finalizeRealtimePostGenerationReply,
  resolveRealtimeDeliveryWordingAuthority,
  runRealtimeReplyDifferential,
  type RealtimeReplySnapshot,
} from "./realtime-reply-differential.js";

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
  audit: {
    channel: "PUBLISHED",
    bundleHash: `sha256:${"a".repeat(64)}`,
    pinScopeType: "SALES_EPISODE",
    pinScopeId: `${conversationId}:PUBLISHED`,
  },
  bundle: {
    schemaVersion: 1,
    bundleId: "runtime-phase3-live",
    bundleHash: `sha256:${"a".repeat(64)}`,
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
      priceFactRef: "price-v1",
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

function salesCycleSnapshot(
  output: Awaited<ReturnType<typeof evaluateRealtimeSalesCycle>>,
  eventKey: string,
): RealtimeReplySnapshot {
  const claims = output.protectedOutbound?.claims ?? [];
  const readiness = output.plan?.effectReadiness ?? [];
  return {
    messages: output.messages,
    strategyHash: null,
    verifiedFactHashes: claims.map(({ provenance }) => provenance.contentHash).sort(),
    verifiedMediaUrls: output.messages.flatMap((message) =>
      message.kind === "IMAGE" ? [message.imageUrl] : []
    ),
    protectedClaimHashes: readiness
      .flatMap(({ claimSetHash }) => claimSetHash === null ? [] : [claimSetHash])
      .sort(),
    effectAuthorizationHashes: readiness.map(({ readinessHash }) => readinessHash).sort(),
    commitOutcome: output.plan === null ? "BLOCKED" : "COMMITTABLE",
    generationOutcome: "VALID",
    inboxOutcome: output.plan === null ? "RETRYABLE" : "COMMITTED",
    protectedOutbound: {
      required: output.protectedOutbound !== undefined,
      groupId: output.protectedOutbound === undefined ? null : `sales-cycle:${eventKey}`,
      plannedMessageCount: output.messages.length,
      deliveredMessageCount: output.messages.length,
    },
  };
}

function behaviorResolution(
  confirmationMode: RuntimeBehaviorModeResolution["confirmationMode"],
  salesAuthorityMode: RuntimeBehaviorModeResolution["salesAuthorityMode"] = "LEGACY",
): RuntimeBehaviorModeResolution {
  return {
    confirmationMode,
    salesAuthorityMode,
    stateReadMode: "LEGACY",
    authorityBundleHash: null,
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
    authorityProvenance: "LEGACY_POINTER",
  };
}

function priceNegotiationProposal(
  sourceMessageId: string,
  wording = "Em hiểu mình đang cân nhắc ngân sách; em kiểm tra mức hỗ trợ phù hợp nhé.",
) {
  return buildGuardedModelNegotiationProposalV1({
    sourceMessageId,
    wordingUnits: [wording],
    action: "REPLY",
    guardReasonCodes: [],
    protectedClaimTypes: [],
    strategyAnalysis: {
      need: "NEED_BUDGET" as const,
      barrier: "BARRIER_PRICE" as const,
      decisionFactor: "BUDGET" as const,
      recommendedStrategy: "STRATEGY_ANSWER_OBJECTION" as const,
      confidence: 0.99,
      evidence: ["TEXT_PRICE_OBJECTION" as const],
    },
  })!;
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

  it.each(["SET_QUANTITY", "PROCEED_TO_PAYMENT"] as const)(
    "does not open a cart when the corroborated model request is %s",
    async (requestedAction) => {
      const text = requestedAction === "SET_QUANTITY"
        ? "chốt 2 set mẫu này"
        : "chốt mẫu này và thanh toán luôn";
      const state = createRealtimeSalesState(conversationId, pageId, now);
      const modelBuyingIntent: AgentBuyingIntentV1 = {
        decision: "COMMITTED",
        requestedAction,
        quantity: requestedAction === "SET_QUANTITY" ? 2 : null,
        evidenceText: text,
        confidence: 0.99,
      };
      const output = await evaluateRealtimeSalesCycle({
        ...input(state, text, `event-action-mismatch-${requestedAction}`),
        canonicalBuyingIntent: canonicalBuyingIntent(text, modelBuyingIntent),
        salesSignals: signals({ buyingIntent: modelBuyingIntent }),
      });

      expect(output).toMatchObject({
        handled: true,
        transferToHuman: true,
        reasonCode: "BUYING_INTENT_SCOPE_MISMATCH",
      });
      expect(output.plan?.state.cart ?? null).toBeNull();
      expect(output.readinessAttempt).toMatchObject({
        effect: "CART_OPEN",
        outcome: "BLOCKED",
        reasonCodes: expect.arrayContaining(["BUYING_INTENT_SCOPE_MISMATCH"]),
        authorization: "NONE",
      });
    },
  );

  it("does not let a model-only quantity inflate a corroborated ADD_TO_CART request", async () => {
    const text = "chốt mẫu này";
    const modelBuyingIntent: AgentBuyingIntentV1 = {
      decision: "COMMITTED",
      requestedAction: "ADD_TO_CART",
      quantity: 3,
      evidenceText: text,
      confidence: 0.99,
    };
    const output = await evaluateRealtimeSalesCycle({
      ...input(
        createRealtimeSalesState(conversationId, pageId, now),
        text,
        "event-add-quantity-unproven",
      ),
      canonicalBuyingIntent: canonicalBuyingIntent(text, modelBuyingIntent),
      salesSignals: signals({ buyingIntent: modelBuyingIntent }),
    });

    expect(output.plan?.canonicalBuyingIntent).toMatchObject({
      requestedAction: "ADD_TO_CART",
      quantity: null,
      reasonCodes: expect.arrayContaining(["MODEL_REQUEST_EVIDENCE_MISMATCH"]),
      authorization: "NONE",
    });
    expect(output.plan?.state.cart?.value.lines[0]?.quantity).toBe(1);
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
    expect(opened.plan?.cartOpenEvidence).toMatchObject({
      contractVersion: "CART_OPEN_EVIDENCE_V1",
      sourceMessageIdHash: opened.plan?.sourceMessageIdHash,
      policyPin: {
        scopeType: "SALES_EPISODE",
        channel: "PUBLISHED",
        bundleHash: `sha256:${"a".repeat(64)}`,
      },
    });
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
      expect.objectContaining({ effect: "CART_READY", outcome: "READY", authorization: "NONE" }),
      expect.objectContaining({ effect: "PREVIEW_READY", outcome: "READY", authorization: "NONE" }),
      expect.objectContaining({ effect: "PROTECTED_OUTBOUND", outcome: "READY", authorization: "NONE" }),
    ]));
    expect(previewed.plan?.events.find(({ commandKind }) =>
      commandKind === "CHECKOUT_DETAILS_CAPTURED"
    )?.checkoutDetailsTransitionEvidence).toMatchObject({
      contractVersion: "CHECKOUT_DETAILS_TRANSITION_EVIDENCE_V1",
      sourceMessageIdHash: previewed.plan?.sourceMessageIdHash,
      contributor: "DETERMINISTIC_RUNTIME",
      authorization: "NONE",
    });
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
          expect.objectContaining({ effect: "PURCHASE_CONFIRMATION_READY", outcome: "READY", authorization: "NONE" }),
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
        claims: expect.arrayContaining([
          expect.objectContaining({ type: "PRICE" }),
          expect.objectContaining({ type: "STOCK" }),
          expect.objectContaining({ type: "ETA" }),
        ]),
        claimTypes: expect.arrayContaining(["PRICE", "STOCK", "ETA"]),
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
    const protectedReadiness = confirmed.protectedOutbound!.readiness;
    const salesParent = confirmed.plan!.effectReadiness!.find(
      ({ readinessHash }) => readinessHash === protectedReadiness.binding.parentReadinessHash,
    );
    expect(salesParent).toMatchObject({
      effect: "PURCHASE_CONFIRMATION_READY",
      outcome: "READY",
    });
    expect(protectedReadiness.binding.cart).toEqual(salesParent!.binding.cart);
    expect(protectedReadiness.binding.preview).toEqual(salesParent!.binding.preview);
    expect(protectedReadiness.binding.claimSetHash).toBe(salesParent!.binding.claimSetHash);
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
      readinessAttempt: {
        outcome: "BLOCKED",
        reasonCodes: expect.arrayContaining(["CLAIM_STALE"]),
      },
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

  it("adds a fourth distinct cart product when deterministic facts are ready", async () => {
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
              priceFactRef: `price-${query.productId}`,
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
      const modelBuyingIntent: AgentBuyingIntentV1 = {
        decision: "COMMITTED",
        requestedAction: "ADD_TO_CART",
        quantity: null,
        evidenceText: text,
        confidence: 0.99,
      };
      return {
        ...input(state, text, `event-product-${turn}`),
        productId,
        canonicalBuyingIntent: buildCanonicalDecisionEvidenceV1({
          text,
          sourceMessageId: `mid:${text}`,
          productId,
          modelBuyingIntent,
          evaluatedAt: now,
        }).buyingIntent,
        salesSignals: signals({ buyingIntent: modelBuyingIntent }),
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

    expect(fourth.reasonCode).toBeNull();
    expect(fourth.transferToHuman).toBe(false);
    expect(fourth.plan).not.toBeNull();
    expect(fourth.plan?.state.cart?.value.lines).toHaveLength(4);
    expect(fourth.plan?.state.cart?.value.lines.map(({ parentProductId }) => parentProductId))
      .toEqual(["PRODUCT-1", "PRODUCT-2", "PRODUCT-3", "PRODUCT-4"]);
    const finalCart = fourth.plan!.state.cart!.value;
    const mutationEvidence = fourth.plan!.cartMutationBatchEvidence?.receipts[0];
    expect(mutationEvidence).toMatchObject({
      contractVersion: "CART_MUTATION_RECEIPT_V1",
      mutationReasonCode: "LINE_ADDED",
      authority: {
        contractVersion: "CART_MUTATION_AUTHORITY_BINDING_V1",
        action: "ADD_LINE",
        productId: "PRODUCT-4",
        offerId: "SET",
        authorityKind: "CANONICAL_BUYING_INTENT",
      },
      mutation: {
        kind: "ADD_LINE",
        line: expect.objectContaining({ parentProductId: "PRODUCT-4" }),
      },
      contributor: "DETERMINISTIC_RUNTIME",
      authorization: "NONE",
    });
    expect(fourth.plan!.cartMutationBatchEvidence?.finalCartStateHash)
      .toBe(mutationEvidence?.afterCartStateHash);
    expect(fourth.plan!.effectReadiness?.find(({ effect }) => effect === "CART_MUTATION"))
      .toMatchObject({
        cartVersion: finalCart.revision,
        cartStateHash: mutationEvidence?.afterCartStateHash,
        deterministicEvidenceHash: mutationEvidence?.evidenceHash,
      });
  });

  it("does not mutate an existing cart from model-only add or quantity evidence", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "event-model-mutation-open",
    ));
    const state = opened.plan!.state;
    const initialCart = state.cart!.value;
    const modelText = "cho mình hai cái giống nhau";
    const modelOnly = canonicalBuyingIntent(modelText, {
      decision: "COMMITTED",
      requestedAction: "SET_QUANTITY",
      quantity: 2,
      evidenceText: modelText,
      confidence: 0.99,
    });

    const quantity = await evaluateRealtimeSalesCycle({
      ...input(state, modelText, "event-model-set-quantity"),
      canonicalBuyingIntent: modelOnly,
    });
    expect(quantity.plan).toBeNull();
    expect(quantity.transferToHuman).toBe(true);
    expect(state.cart!.value).toEqual(initialCart);

    const addText = "gửi thêm mẫu PRODUCT-2 cho mình";
    const add = await evaluateRealtimeSalesCycle({
      ...input(state, addText, "event-model-add-line"),
      productId: "PRODUCT-2",
      canonicalBuyingIntent: canonicalBuyingIntent(addText, {
        decision: "COMMITTED",
        requestedAction: "ADD_TO_CART",
        quantity: 1,
        evidenceText: addText,
        confidence: 0.99,
      }),
    });
    expect(add.plan).toBeNull();
    expect(add.transferToHuman).toBe(true);
    expect(state.cart!.value).toEqual(initialCart);
  });

  it("uses a corroborated model request as semantics while deterministic readiness authorizes the exact mutation", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "event-hybrid-exact-open",
    ));
    const state = opened.plan!.state;
    const text = "chốt 2 set mẫu này";
    const modelBuyingIntent: AgentBuyingIntentV1 = {
      decision: "COMMITTED",
      requestedAction: "SET_QUANTITY",
      quantity: 2,
      evidenceText: text,
      confidence: 0.99,
    };

    const output = await evaluateRealtimeSalesCycle({
      ...input(state, text, "event-hybrid-exact-set"),
      canonicalBuyingIntent: canonicalBuyingIntent(text, modelBuyingIntent),
      salesSignals: signals({ buyingIntent: modelBuyingIntent }),
    });

    expect(output).toMatchObject({
      handled: true,
      transferToHuman: false,
      plan: {
        canonicalBuyingIntent: {
          requestedAction: "SET_QUANTITY",
          contributors: ["DETERMINISTIC_RUNTIME", "MODEL_STRUCTURED_OUTPUT"],
          authorization: "NONE",
        },
        state: { cart: { value: { lines: [{ quantity: 2 }] } } },
        cartMutationBatchEvidence: {
          receipts: [{
            mutation: { kind: "SET_QUANTITY", quantity: 2 },
            authority: {
              action: "SET_QUANTITY",
              authorityKind: "CANONICAL_BUYING_INTENT",
            },
            contributor: "DETERMINISTIC_RUNTIME",
            authorization: "NONE",
          }],
        },
      },
    });
    expect(output.plan?.effectReadiness).toEqual(expect.arrayContaining([
      expect.objectContaining({
        effect: "CART_MUTATION",
        outcome: "READY",
        authorization: "NONE",
      }),
      expect.objectContaining({
        effect: "PROTECTED_OUTBOUND",
        outcome: "READY",
        authorization: "NONE",
      }),
    ]));
  });

  it("does not mutate quantity when the structured value lacks exact customer evidence", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "event-hybrid-quantity-open",
    ));
    const state = opened.plan!.state;
    const text = "chốt mẫu này";
    const modelBuyingIntent: AgentBuyingIntentV1 = {
      decision: "COMMITTED",
      requestedAction: "SET_QUANTITY",
      quantity: 2,
      evidenceText: text,
      confidence: 0.99,
    };

    const output = await evaluateRealtimeSalesCycle({
      ...input(state, text, "event-hybrid-quantity-missing"),
      canonicalBuyingIntent: canonicalBuyingIntent(text, modelBuyingIntent),
      salesSignals: signals({ buyingIntent: modelBuyingIntent }),
    });

    expect(output.plan?.state.cart?.value.lines[0]?.quantity ?? state.cart!.value.lines[0]!.quantity)
      .toBe(1);
    expect(output.plan?.effectReadiness ?? []).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ effect: "CART_MUTATION", outcome: "READY" }),
    ]));
  });

  it("does not let a corroborated OPEN_CART request cross-authorize SET_QUANTITY", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "event-open-action-open",
    ));
    const state = opened.plan!.state;
    const text = "chốt 2 set mẫu này";
    const modelBuyingIntent: AgentBuyingIntentV1 = {
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: 2,
      evidenceText: text,
      confidence: 0.99,
    };
    const output = await evaluateRealtimeSalesCycle({
      ...input(state, text, "event-open-action-set"),
      canonicalBuyingIntent: canonicalBuyingIntent(text, modelBuyingIntent),
      salesSignals: signals({ buyingIntent: modelBuyingIntent }),
    });

    expect(output).toMatchObject({
      handled: true,
      transferToHuman: true,
      reasonCode: "BUYING_INTENT_MISSING",
    });
    expect(output.plan?.state.cart?.value.lines[0]?.quantity ?? state.cart!.value.lines[0]!.quantity)
      .toBe(1);
    expect(output.plan?.effectReadiness ?? []).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ effect: "CART_MUTATION", outcome: "READY" }),
    ]));
  });

  it("r31.3 replays the live sales-cycle effect seam without changing the established cart-open transaction", async () => {
    const capturedInput = {
      text: "chốt CB182 size M",
      eventKey: "event-open",
    } as const;
    // Immutable capture from exact pre-B2.3b source at
    // 933a227a0ff08702e87ea697d7284d7024f74dbf for capturedInput above.
    const preB23bBaseline: RealtimeReplySnapshot = {
      messages: [{
        kind: "TEXT",
        text: "CB182 size M ×1: 699.000đ\nTạm tính: 699.000đ\nPhí ship: 30.000đ\nTổng: 729.000đ\nChị gửi giúp em các thông tin nhận hàng:\nTên:\nSĐT:\nĐịa chỉ:\nThanh toán: COD hoặc chuyển khoản nhé.",
      }],
      strategyHash: null,
      verifiedFactHashes: [
        "107bb35375d5b6d050ff7c5008303aa1c53102647d28edc5432df57fa030f747",
        "891937cb335016e9c7074c3781dcb1364e0c660733a8889bbeae83e6aa759be6",
      ],
      verifiedMediaUrls: [],
      protectedClaimHashes: [
        "e91f4c6407e0c3571df99c21976020751adf98391be0bc04f40e8457bd320ce9",
        "f3a046a0b90ef7a6509d1aaddaf1bc9876110d3ee073c904da341825cf16dff4",
      ],
      effectAuthorizationHashes: [
        "71568f7152f2c4da4a7de1e1e90498da5bdfc1c25d08ad40d313ed6ea0c318a2",
        "c179e963dfa5694d37b3175de750416ca312e52b6c7769c7664d83b76c91f894",
      ],
      commitOutcome: "COMMITTABLE",
      generationOutcome: "VALID",
      inboxOutcome: "COMMITTED",
      protectedOutbound: {
        required: true,
        groupId: "sales-cycle:event-open",
        plannedMessageCount: 1,
        deliveredMessageCount: 1,
      },
    };
    const result = await runRealtimeReplyDifferential({
      capturedInput,
      baseline: async () => preB23bBaseline,
      candidate: async (capture): Promise<RealtimeReplySnapshot> => {
        const output = await evaluateRealtimeSalesCycle(input(
          createRealtimeSalesState(conversationId, pageId, now),
          capture.text,
          capture.eventKey,
        ));
        return salesCycleSnapshot(output, capture.eventKey);
      },
      permittedDifferences: [],
    });

    expect(result).toEqual({
      contractVersion: "REALTIME_REPLY_DIFFERENTIAL_V1",
      status: "MATCH",
      sideEffects: "DISABLED",
      differences: [],
    });
    expect(preB23bBaseline.effectAuthorizationHashes.length).toBeGreaterThan(0);
  });

  it("r31.3 characterizes every changed B2.3b request-reconciliation branch against pre-head snapshots", async () => {
    const baselines: Record<string, RealtimeReplySnapshot> = {
      set: {
        messages: [{ kind: "TEXT", text: "CB182 size M ×2: 1.398.000đ\nTạm tính: 1.398.000đ\nƯu đãi: -69.900đ\nPhí ship: 30.000đ\nTổng: 1.358.100đ\nChị gửi giúp em các thông tin nhận hàng:\nTên:\nSĐT:\nĐịa chỉ:\nThanh toán: COD hoặc chuyển khoản nhé." }],
        strategyHash: null,
        verifiedFactHashes: [
          "107bb35375d5b6d050ff7c5008303aa1c53102647d28edc5432df57fa030f747",
          "891937cb335016e9c7074c3781dcb1364e0c660733a8889bbeae83e6aa759be6",
          "a12f9d42540b8d1dfdb1abfb2344e62c2417595acb67b9f6b15fe5ff53140e7e",
        ],
        verifiedMediaUrls: [],
        protectedClaimHashes: [
          "9c52d8aee18542e61dc3db584227c0c32a15d8bdccf056b6782f14a551b4af51",
          "e91f4c6407e0c3571df99c21976020751adf98391be0bc04f40e8457bd320ce9",
        ],
        effectAuthorizationHashes: [
          "67be78c56c3c9a38a5c22a859bb215c7181498d245df19ff63e308e00056a9ec",
          "bee3c8ac848f9a6fc2182a7be5edfb64dd69a9abc8f52f08ca84af6e23e9c66f",
        ],
        commitOutcome: "COMMITTABLE", generationOutcome: "VALID", inboxOutcome: "COMMITTED",
        protectedOutbound: {
          required: true, groupId: "sales-cycle:capture-set",
          plannedMessageCount: 1, deliveredMessageCount: 1,
        },
      },
      actionMismatch: {
        messages: [{ kind: "TEXT", text: "CB182 size M ×2: 1.398.000đ\nTạm tính: 1.398.000đ\nƯu đãi: -69.900đ\nPhí ship: 30.000đ\nTổng: 1.358.100đ\nChị gửi giúp em các thông tin nhận hàng:\nTên:\nSĐT:\nĐịa chỉ:\nThanh toán: COD hoặc chuyển khoản nhé." }],
        strategyHash: null,
        verifiedFactHashes: [
          "107bb35375d5b6d050ff7c5008303aa1c53102647d28edc5432df57fa030f747",
          "891937cb335016e9c7074c3781dcb1364e0c660733a8889bbeae83e6aa759be6",
          "9419a42329092926f38685009fa8d26a20b5e5fa4a4b910229b46d0afc6d178f",
        ],
        verifiedMediaUrls: [],
        protectedClaimHashes: [
          "25c204386d11069c032fe589a855f2c864c1c52db61afa04b5616be343fd9c16",
          "e91f4c6407e0c3571df99c21976020751adf98391be0bc04f40e8457bd320ce9",
        ],
        effectAuthorizationHashes: [
          "1e9c02af363e3cfbe6621c3483aa888ec6b6a2b5e65d79646b41de59eebc1ba4",
          "a64763526cd45248f6f0ce98362b46a4fe6a286f2fabe33690fb17edda6365e6",
        ],
        commitOutcome: "COMMITTABLE", generationOutcome: "VALID", inboxOutcome: "COMMITTED",
        protectedOutbound: {
          required: true, groupId: "sales-cycle:capture-action-mismatch",
          plannedMessageCount: 1, deliveredMessageCount: 1,
        },
      },
      quantityMismatch: {
        messages: [], strategyHash: null, verifiedFactHashes: [], verifiedMediaUrls: [],
        protectedClaimHashes: [], effectAuthorizationHashes: [], commitOutcome: "BLOCKED",
        generationOutcome: "VALID", inboxOutcome: "RETRYABLE",
        protectedOutbound: {
          required: false, groupId: null, plannedMessageCount: 0, deliveredMessageCount: 0,
        },
      },
      conflict: {
        messages: [{ kind: "TEXT", text: "CB182 size M ×1: 699.000đ\nTạm tính: 699.000đ\nPhí ship: 30.000đ\nTổng: 729.000đ\nChị gửi giúp em các thông tin nhận hàng:\nTên:\nSĐT:\nĐịa chỉ:\nThanh toán: COD hoặc chuyển khoản nhé." }],
        strategyHash: null,
        verifiedFactHashes: [
          "107bb35375d5b6d050ff7c5008303aa1c53102647d28edc5432df57fa030f747",
          "891937cb335016e9c7074c3781dcb1364e0c660733a8889bbeae83e6aa759be6",
        ],
        verifiedMediaUrls: [],
        protectedClaimHashes: [
          "d10b3d0c93511b818a7a9a33a6dcd92d49d90410c1c7620619e063133df1dc12",
          "e91f4c6407e0c3571df99c21976020751adf98391be0bc04f40e8457bd320ce9",
        ],
        effectAuthorizationHashes: [
          "6b85d78c84d8c29654dff36b3462903aae8cbe7bbb299b48f99e02b9e5be8c4e",
          "daf4dee816f55692d5553d5de90329874be058b255d5821f2ad467244ff3b992",
        ],
        commitOutcome: "COMMITTABLE", generationOutcome: "VALID", inboxOutcome: "COMMITTED",
        protectedOutbound: {
          required: true, groupId: "sales-cycle:capture-conflict",
          plannedMessageCount: 1, deliveredMessageCount: 1,
        },
      },
    };
    const open = async (eventKey: string) => (await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      eventKey,
    ))).plan!.state;
    const runCandidate = async (
      state: ReturnType<typeof createRealtimeSalesState>,
      text: string,
      eventKey: string,
      buyingIntent: AgentBuyingIntentV1,
    ) => salesCycleSnapshot(await evaluateRealtimeSalesCycle({
      ...input(state, text, eventKey),
      canonicalBuyingIntent: canonicalBuyingIntent(text, buyingIntent),
      salesSignals: signals({ buyingIntent }),
    }), eventKey);
    const setText = "chốt 2 set mẫu này";
    const setIntent: AgentBuyingIntentV1 = {
      decision: "COMMITTED", requestedAction: "SET_QUANTITY", quantity: 2,
      evidenceText: setText, confidence: 0.99,
    };
    const captures = [{
      name: "set", baseline: baselines.set!,
      candidate: async () => runCandidate(
        await open("capture-set-open"), setText, "capture-set", setIntent,
      ),
      permittedDifferences: [],
    }, {
      name: "actionMismatch", baseline: baselines.actionMismatch!,
      candidate: () => runCandidate(
        createRealtimeSalesState(conversationId, pageId, now),
        setText, "capture-action-mismatch", setIntent,
      ),
      permittedDifferences: [{
        code: "OUTBOUND_MESSAGES_CHANGED" as const,
        reasonCode: "B2_3B_UNAUTHORIZED_ACTION_FAIL_CLOSED",
      }],
    }, {
      name: "quantityMismatch", baseline: baselines.quantityMismatch!,
      candidate: async () => runCandidate(
        await open("capture-quantity-open"), "chốt mẫu này", "capture-quantity-mismatch",
        { ...setIntent, evidenceText: "chốt mẫu này" },
      ),
      permittedDifferences: [],
    }, {
      name: "conflict", baseline: baselines.conflict!,
      candidate: () => runCandidate(
        createRealtimeSalesState(conversationId, pageId, now),
        "chốt mẫu này", "capture-conflict",
        {
          decision: "NEGATED", requestedAction: "NONE", quantity: null,
          evidenceText: "chốt mẫu này", confidence: 0.99,
        },
      ),
      permittedDifferences: [{
        code: "OUTBOUND_MESSAGES_CHANGED" as const,
        reasonCode: "B2_3B_LESS_AGGRESSIVE_CONFLICT",
      }],
    }];

    for (const capture of captures) {
      const candidates: RealtimeReplySnapshot[] = [];
      const result = await runRealtimeReplyDifferential({
        capturedInput: { name: capture.name },
        baseline: async () => capture.baseline,
        candidate: async () => {
          const candidate = await capture.candidate();
          candidates.push(candidate);
          return candidate;
        },
        permittedDifferences: capture.permittedDifferences,
      });
      const candidate = candidates[0]!;
      expect(result.sideEffects).toBe("DISABLED");
      if (capture.name === "quantityMismatch") {
        expect(result.status).toBe("MATCH");
      } else if (capture.name === "set") {
        expect(result.status).toBe("VIOLATION");
        expect(result.differences.map(({ code }) => code)).toEqual([
          "EFFECT_AUTHORIZATION_CHANGED",
        ]);
        expect(candidate).toMatchObject({
          messages: capture.baseline.messages,
          verifiedFactHashes: capture.baseline.verifiedFactHashes,
          protectedClaimHashes: capture.baseline.protectedClaimHashes,
          commitOutcome: "COMMITTABLE",
          protectedOutbound: capture.baseline.protectedOutbound,
        });
      } else {
        expect(result.status).toBe("VIOLATION");
        expect(result.differences.map(({ code }) => code)).toEqual(
          capture.name === "actionMismatch"
            ? [
                "OUTBOUND_MESSAGES_CHANGED",
                "VERIFIED_FACTS_CHANGED",
                "PROTECTED_CLAIMS_CHANGED",
                "EFFECT_AUTHORIZATION_CHANGED",
                "COMMIT_OUTCOME_CHANGED",
                "PROTECTED_OUTBOUND_CONTRACT_CHANGED",
              ]
            : [
                "OUTBOUND_MESSAGES_CHANGED",
                "VERIFIED_FACTS_CHANGED",
                "PROTECTED_CLAIMS_CHANGED",
                "EFFECT_AUTHORIZATION_CHANGED",
                "PROTECTED_OUTBOUND_CONTRACT_CHANGED",
              ],
        );
        expect(result.differences[0]).toMatchObject({
          code: "OUTBOUND_MESSAGES_CHANGED",
          disposition: "INTENTIONAL",
        });
        expect(result.differences.slice(1).every(({ disposition }) =>
          disposition === "VIOLATION"
        )).toBe(true);
        expect(candidate).toMatchObject({
          messages: [], verifiedFactHashes: [], protectedClaimHashes: [],
          effectAuthorizationHashes: [],
          commitOutcome: capture.name === "actionMismatch" ? "BLOCKED" : "COMMITTABLE",
          protectedOutbound: { required: false, plannedMessageCount: 0, deliveredMessageCount: 0 },
        });
      }
    }
  });

  it("fails closed before readiness when a valid fifty-line cart adds product fifty-one", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "event-capacity-open",
    ));
    const openedState = opened.plan!.state;
    const openedCart = openedState.cart!.value;
    const baseLine = openedCart.lines[0]!;
    if (!baseLine.priceAuthority) throw new Error("test cart requires price authority");
    const lines = Array.from({ length: 50 }, (_, index) => {
      const parentProductId = `PRODUCT-${index + 1}`;
      return {
        ...baseLine,
        lineId: `13000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        parentProductId,
        priceAuthority: {
          ...baseLine.priceAuthority,
          priceFactRef: `pos:${parentProductId}:set`,
          parentProductId,
        },
      };
    });
    const subtotalVnd = lines.reduce((total, cartLine) => total + cartLine.lineTotalVnd!, 0);
    const discountTotalVnd = openedCart.adjustments.reduce(
      (total, adjustment) => total + adjustment.amountVnd,
      0,
    );
    const cart = CartV1Schema.parse({
      ...openedCart,
      lines,
      subtotalVnd,
      discountTotalVnd,
      grandTotalVnd: subtotalVnd + openedCart.shippingFeeVnd! - discountTotalVnd,
    });
    const atCapacity = {
      ...openedState,
      cart: { ...openedState.cart!, value: cart },
    };
    const text = "chốt PRODUCT-51 size M";
    const modelBuyingIntent: AgentBuyingIntentV1 = {
      decision: "COMMITTED",
      requestedAction: "ADD_TO_CART",
      quantity: null,
      evidenceText: text,
      confidence: 0.99,
    };

    const output = await evaluateRealtimeSalesCycle({
      ...input(atCapacity, text, "event-capacity-51"),
      productId: "PRODUCT-51",
      canonicalBuyingIntent: buildCanonicalDecisionEvidenceV1({
        text,
        sourceMessageId: `mid:${text}`,
        productId: "PRODUCT-51",
        modelBuyingIntent,
        evaluatedAt: now,
      }).buyingIntent,
      salesSignals: signals({ buyingIntent: modelBuyingIntent }),
    });

    expect(output).toMatchObject({
      handled: true,
      messages: [],
      plan: null,
      transferToHuman: true,
      desiredTag: "NHAN_VIEN",
      reasonCode: "CART_CAPACITY_EXCEEDED",
    });
    expect(atCapacity.cart.value.lines).toHaveLength(50);
  });

  it("discards checkout PII and cart-ready events when preview readiness is blocked", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "event-blocked-preview-open",
    ));
    const openedState = opened.plan!.state;
    const openedCart = openedState.cart!.value;
    const baseLine = openedCart.lines[0]!;
    if (!baseLine.priceAuthority) throw new Error("test cart requires price authority");
    const lines = Array.from({ length: 4 }, (_, index) => {
      const parentProductId = `PRODUCT-${index + 1}`;
      return {
        ...baseLine,
        lineId: `14000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        parentProductId,
        priceAuthority: {
          ...baseLine.priceAuthority,
          priceFactRef: `pos:${parentProductId}:set`,
          parentProductId,
        },
      };
    });
    const subtotalVnd = lines.reduce((total, cartLine) => total + cartLine.lineTotalVnd!, 0);
    const discountTotalVnd = openedCart.adjustments.reduce(
      (total, adjustment) => total + adjustment.amountVnd,
      0,
    );
    const cart = CartV1Schema.parse({
      ...openedCart,
      lines,
      subtotalVnd,
      discountTotalVnd,
      grandTotalVnd: subtotalVnd + openedCart.shippingFeeVnd! - discountTotalVnd,
    });
    const persisted = {
      ...openedState,
      cart: { ...openedState.cart!, value: cart },
    };
    const persistedFacts: BusinessFactsReader = {
      ...facts,
      async resolveCartSelection(query) {
        const persistedLine = cart.lines.find(({ parentProductId }) =>
          parentProductId === query.productId
        )!;
        return {
          status: "READY",
          line: persistedLine,
          shopId: "LANA",
          versions: {
            price: `price-${query.productId}`,
            inventory: `inventory-${query.productId}`,
            size: `size-${query.productId}`,
            eta: query.productId === "PRODUCT-4" ? null : "eta-v1",
          },
          eta: query.productId === "PRODUCT-4" ? null : { minDays: 3, maxDays: 6 },
          etaExpiresAt: query.productId === "PRODUCT-4"
            ? null
            : "2026-07-25T02:00:00.000Z",
          sourceAuthority: "POS_SNAPSHOT",
          stockStatus: "IN_STOCK",
          stockAvailableQuantity: 3,
          sourceObservedAt: "2026-07-23T02:00:00.000Z",
          sourceExpiresAt: "2026-07-25T02:00:00.000Z",
        };
      },
    };

    const output = await evaluateRealtimeSalesCycle({
      ...input(
        persisted,
        "Tên: Lan\nSĐT: 0984997797\nĐịa chỉ: Tân Châu, Tây Ninh\nCOD",
        "event-blocked-preview-details",
      ),
      facts: persistedFacts,
    });

    expect(output).toMatchObject({
      transferToHuman: true,
      reasonCode: "CHECKOUT_REVALIDATION_UNAVAILABLE",
      plan: null,
    });
    expect(persisted.checkoutDraft).toBeNull();
    expect(persisted.cart.value.status).toBe("OPEN");
  });

  it("discards checkout and preview events when final protected facts become stale", async () => {
    const expiringCheckoutFacts: BusinessFactsReader = {
      ...facts,
      async resolveCartSelection(query) {
        return {
          status: "READY",
          line: {
            ...line(query.quantity),
            priceAuthority: {
              ...line(query.quantity).priceAuthority!,
              priceFactRef: "price-expiring-checkout",
            },
          },
          shopId: "LANA",
          versions: {
            price: "price-expiring-checkout",
            inventory: "inventory-expiring-checkout",
            size: "size-expiring-checkout",
            eta: "eta-expiring-checkout",
          },
          eta: { minDays: 3, maxDays: 6 },
          etaExpiresAt: "2026-07-23T03:00:30.000Z",
          sourceAuthority: "POS_SNAPSHOT",
          stockStatus: "IN_STOCK",
          stockAvailableQuantity: 3,
          sourceObservedAt: "2026-07-23T02:59:00.000Z",
          sourceExpiresAt: "2026-07-23T03:00:30.000Z",
        };
      },
    };
    const opened = await evaluateRealtimeSalesCycle({
      ...input(
        createRealtimeSalesState(conversationId, pageId, now),
        "chốt CB182 size M",
        "event-final-stale-open",
      ),
      facts: expiringCheckoutFacts,
    });
    const persisted = opened.plan!.state;
    let clockRead = 0;
    const clock = [
      new Date("2026-07-23T03:00:00.000Z"),
      new Date("2026-07-23T03:00:00.000Z"),
      new Date("2026-07-23T03:00:45.000Z"),
    ];

    const output = await evaluateRealtimeSalesCycle({
      ...input(
        persisted,
        "Tên: Lan\nSĐT: 0984997797\nĐịa chỉ: Tân Châu, Tây Ninh\nCOD",
        "event-final-stale-details",
      ),
      facts: expiringCheckoutFacts,
      effectNow: () => clock[Math.min(clockRead++, clock.length - 1)]!,
    });

    expect(output).toMatchObject({
      transferToHuman: true,
      messages: [],
      reasonCode: "CLAIM_STALE",
      plan: null,
    });
    expect(persisted.checkoutDraft).toBeNull();
    expect(persisted.cart?.value.status).toBe("OPEN");
    expect(persisted.preview).toBeNull();
  });

  it("returns the canonical state-changing plan when confirmation revalidation hands off", async () => {
    const state = await previewState("confirm-handoff-plan");
    const changedFacts: BusinessFactsReader = {
      ...facts,
      async resolveCartSelection(query, checkedAt) {
        const selected = await facts.resolveCartSelection!(query, checkedAt);
        if (selected.status !== "READY") return selected;
        return {
          ...selected,
          versions: { ...selected.versions, inventory: "inventory-v2" },
        };
      },
    };

    const output = await evaluateRealtimeSalesCycle({
      ...input(state, "ok", "confirm-handoff-plan-final"),
      facts: changedFacts,
    });

    expect(output).toMatchObject({
      transferToHuman: true,
      desiredTag: "NHAN_VIEN",
      reasonCode: "STOCK_CHANGED_BEFORE_CONFIRMATION",
      plan: {
        state: { stage: "HANDED_OFF", preview: null },
        events: [{
          commandKind: "CONFIRM_PURCHASE",
          outcome: "HANDOFF",
          stageAfter: "HANDED_OFF",
        }],
      },
    });
    expect(output.plan?.effectClaimSets).toEqual([]);
    expect(output.plan?.effectReadiness).toEqual([]);

    const allHandoffPlan = output.plan!;
    const mixedPlan = {
      ...allHandoffPlan,
      expectedRevision: allHandoffPlan.expectedRevision - 2,
      events: [
        {
          ...allHandoffPlan.events[0]!,
          commandId: "confirm-handoff-plan-cart-ready",
          commandKind: "CART_READY" as const,
          outcome: "APPLIED" as const,
          stateRevisionBefore: allHandoffPlan.events[0]!.stateRevisionBefore - 2,
          stateRevisionAfter: allHandoffPlan.events[0]!.stateRevisionBefore - 1,
          stageBefore: "CART_OPEN",
          stageAfter: "CART_OPEN",
        },
        {
          ...allHandoffPlan.events[0]!,
          commandId: "confirm-handoff-plan-preview",
          commandKind: "PREVIEW_CREATED" as const,
          outcome: "APPLIED" as const,
          stateRevisionBefore: allHandoffPlan.events[0]!.stateRevisionBefore - 1,
          stateRevisionAfter: allHandoffPlan.events[0]!.stateRevisionBefore,
          stageBefore: "CART_OPEN",
          stageAfter: "ORDER_PREVIEW",
        },
        ...allHandoffPlan.events,
      ],
      deterministicConfirmationEvidence: {
        schemaVersion: 1 as const,
        authorityVersion: "DETERMINISTIC_CONFIRMATION_EVIDENCE_V1" as const,
        classifierVersion: "LEGACY_CONFIRMATION_V1" as const,
        decision: "CONFIRM" as const,
        reasonCode: "CONFIRMATION_DETERMINISTIC_MATCH" as const,
        sourceMessageIdHash: "a".repeat(64),
        evidenceHash: "b".repeat(64),
        evaluatedAt: now.toISOString(),
        authorization: "NONE" as const,
      },
      effectClaimSets: [
        { effect: "CART_READY" as const, claims: [] },
        { effect: "PREVIEW_READY" as const, claims: [] },
        { effect: "PURCHASE_CONFIRMATION_READY" as const, claims: [] },
      ],
      effectReadiness: [
        { effect: "CART_READY", marker: "must-survive-mixed-plan" },
        { effect: "PREVIEW_READY", marker: "must-not-survive-handoff" },
        { effect: "PURCHASE_CONFIRMATION_READY", marker: "must-not-survive-handoff" },
      ] as unknown as NonNullable<
        typeof allHandoffPlan.effectReadiness
      >,
    };

    expect(prepareHandoffStatePlanV1(mixedPlan)).toMatchObject({
      effectClaimSets: [{ effect: "CART_READY" }],
      effectReadiness: [{ effect: "CART_READY", marker: "must-survive-mixed-plan" }],
    });
    expect(prepareHandoffStatePlanV1(mixedPlan))
      .not.toHaveProperty("deterministicConfirmationEvidence");
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
    expect(hesitant.plan?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        commandKind: "NEGOTIATION_EVENT",
        negotiationTransitionEvidence: expect.objectContaining({
          contractVersion: "NEGOTIATION_TRANSITION_EVIDENCE_V1",
          sourceMessageIdHash: hesitant.plan?.sourceMessageIdHash,
          intent: "PRICE_OBJECTION",
        }),
      }),
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
      plan: null,
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

  it("lets a guarded model proposal own price-objection direction and wording on COMMERCE", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "model-negotiation-open",
    ));
    const eventKey = "model-negotiation-objection";
    const currentInput = input(
      opened.plan!.state,
      "Ngân sách của chị đang hơi căng",
      eventKey,
    );
    const wording = "Em hiểu mình đang cân nhắc ngân sách; em kiểm tra mức hỗ trợ phù hợp nhé.";
    const output = await evaluateRealtimeSalesCycle({
      ...currentInput,
      behaviorModeResolution: behaviorResolution("LEGACY", "COMMERCE"),
      negotiationProposal: priceNegotiationProposal(currentInput.messageId, wording),
    });

    expect(output).toMatchObject({
      handled: true,
      wordingAuthority: "MODEL",
      transferToHuman: false,
      plan: { state: { negotiation: { customerState: "HESITANT" } } },
    });
    expect(output.messages[0]).toMatchObject({
      kind: "TEXT",
      text: expect.stringMatching(new RegExp(`^${wording}`)),
    });
    expect(output.plan?.state.cart?.value.adjustments).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "FREE_SHIPPING", amountVnd: 30_000 }),
    ]));
    expect(priceNegotiationProposal(currentInput.messageId)).not.toHaveProperty("discount");
  });

  it("does not create a negotiation proposal when deterministic claim guarding rejects wording", () => {
    const strategyAnalysis = priceNegotiationProposal("unused").strategyAnalysis;
    expect(buildGuardedModelNegotiationProposalV1({
      sourceMessageId: "mid-rejected-price-claim",
      wordingUnits: ["Em giảm 90% cho chị."],
      action: "REPLY",
      guardReasonCodes: ["PRICE_CLAIM_VALUE_MISMATCH"],
      protectedClaimTypes: ["PRICE"],
      strategyAnalysis,
    })).toBeNull();
    expect(buildGuardedModelNegotiationProposalV1({
      sourceMessageId: "mid-verified-price-claim",
      wordingUnits: ["Giá hiện tại là 699.000đ."],
      action: "REPLY",
      guardReasonCodes: [],
      protectedClaimTypes: ["PRICE"],
      strategyAnalysis,
    })).toBeNull();
  });

  it("keeps model-directed negotiation replay idempotent without a second concession", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "model-negotiation-replay-open",
    ));
    const firstInput = input(
      opened.plan!.state,
      "Ngân sách của chị đang hơi căng",
      "model-negotiation-replay-first",
    );
    const first = await evaluateRealtimeSalesCycle({
      ...firstInput,
      behaviorModeResolution: behaviorResolution("LEGACY", "COMMERCE"),
      negotiationProposal: priceNegotiationProposal(firstInput.messageId),
    });
    const retryInput = {
      ...input(
        first.plan!.state,
        firstInput.text,
        "model-negotiation-replay-retry",
      ),
      messageId: firstInput.messageId,
    };
    const retry = await evaluateRealtimeSalesCycle({
      ...retryInput,
      behaviorModeResolution: behaviorResolution("LEGACY", "COMMERCE"),
      negotiationProposal: priceNegotiationProposal(retryInput.messageId),
    });

    expect(retry).toMatchObject({
      handled: true,
      messages: [],
      plan: null,
      reasonCode: "NEGOTIATION_REPLAY_IGNORED",
    });
    expect(first.plan!.state.negotiation?.customerState).toBe("HESITANT");
    expect(first.plan!.state.cart?.value.discountTotalVnd).toBe(30_000);
  });

  it("rejects model-directed negotiation when trusted inbound provenance is stale", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "model-negotiation-stale-open",
    ));
    const currentInput = {
      ...input(
        opened.plan!.state,
        "Ngân sách của chị đang hơi căng",
        "model-negotiation-stale",
      ),
      occurredAt: "2026-07-23T02:59:59.000Z",
    };
    const output = await evaluateRealtimeSalesCycle({
      ...currentInput,
      behaviorModeResolution: behaviorResolution("LEGACY", "COMMERCE"),
      negotiationProposal: priceNegotiationProposal(currentInput.messageId),
    });

    expect(output).toMatchObject({
      handled: true,
      messages: [],
      plan: null,
      reasonCode: "NEGOTIATION_FAILED",
    });
    expect(opened.plan!.state.negotiation?.customerState).toBe("READY");
    expect(opened.plan!.state.cart?.value.discountTotalVnd).toBe(0);
  });

  it("does not let model wording execute a concession denied by current policy", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "model-negotiation-policy-open",
    ));
    const currentInput = input(
      opened.plan!.state,
      "Ngân sách của chị đang hơi căng",
      "model-negotiation-policy-denied",
    );
    const deniedPolicyResolution = {
      ...policyResolution,
      bundle: {
        ...policyResolution.bundle!,
        policy: { ...policyResolution.bundle!.policy, status: "INACTIVE" as const },
      },
    } as unknown as RuntimePolicyResolution;
    const output = await evaluateRealtimeSalesCycle({
      ...currentInput,
      policyResolution: deniedPolicyResolution,
      behaviorModeResolution: behaviorResolution("LEGACY", "COMMERCE"),
      negotiationProposal: priceNegotiationProposal(currentInput.messageId),
    });

    expect(output).toMatchObject({
      handled: true,
      messages: [],
      plan: null,
      reasonCode: "NEGOTIATION_FAILED",
    });
    expect(opened.plan!.state.negotiation?.customerState).toBe("READY");
    expect(opened.plan!.state.cart?.value.discountTotalVnd).toBe(0);
  });

  it.each([
    {
      name: "undeclared",
      proposal: null,
    },
    {
      name: "out-of-scope strategy",
      proposal: {
        ...priceNegotiationProposal("mid-model-negotiation-rejected"),
        strategyAnalysis: {
          ...priceNegotiationProposal("unused").strategyAnalysis,
          barrier: "BARRIER_FIT" as const,
        },
      },
    },
    {
      name: "unbound provenance",
      proposal: priceNegotiationProposal("different-message-id"),
    },
    {
      name: "malformed wording",
      proposal: {
        ...priceNegotiationProposal("mid-model-negotiation-rejected"),
        wording: null,
      },
    },
  ])("fails closed with no negotiation side effect for $name COMMERCE proposals", async ({ name, proposal }) => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      `model-negotiation-${name}-open`,
    ));
    const currentInput = input(
      opened.plan!.state,
      "đắt quá",
      "model-negotiation-rejected",
    );
    const output = await evaluateRealtimeSalesCycle({
      ...currentInput,
      behaviorModeResolution: behaviorResolution("LEGACY", "COMMERCE"),
      negotiationProposal: proposal as ModelNegotiationProposalV1 | null,
    });

    expect(output.handled).toBe(true);
    expect(output.plan).toBeNull();
    expect(output.messages).toEqual([]);
    expect(output.reasonCode).toBe("MODEL_NEGOTIATION_PROPOSAL_REJECTED");
    expect(opened.plan!.state.negotiation?.customerState).toBe("READY");
    expect(opened.plan!.state.cart?.value.discountTotalVnd).toBe(0);
  });

  it("keeps the legacy regex rollback path isolated from COMMERCE", async () => {
    const opened = await evaluateRealtimeSalesCycle(input(
      createRealtimeSalesState(conversationId, pageId, now),
      "chốt CB182 size M",
      "legacy-negotiation-open",
    ));
    const output = await evaluateRealtimeSalesCycle({
      ...input(opened.plan!.state, "đắt quá, bớt giá giúp chị", "legacy-negotiation"),
      behaviorModeResolution: behaviorResolution("LEGACY", "LEGACY"),
    });

    expect(output).toMatchObject({
      handled: true,
      plan: { state: { negotiation: { customerState: "HESITANT" } } },
    });
    expect(output.messages[0]).toMatchObject({
      text: expect.stringContaining("Em hỗ trợ freeship cho giỏ này."),
    });
  });

  it("r31.3 characterizes B2.3c against the immutable pre-head negotiation capture", async () => {
    // Immutable capture from exact pre-B2.3c source at
    // 8591ed9fa5522f9ea50259fa3bf086efddb93cc8.
    const baseline: RealtimeReplySnapshot = {
      messages: [{
        kind: "TEXT",
        text: "Em hỗ trợ freeship cho giỏ này.\nCB182 size M ×1: 699.000đ\nTạm tính: 699.000đ\nƯu đãi: -30.000đ\nPhí ship: Freeship\nTổng: 699.000đ",
      }],
      strategyHash: null,
      verifiedFactHashes: [
        "107bb35375d5b6d050ff7c5008303aa1c53102647d28edc5432df57fa030f747",
        "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
      ],
      verifiedMediaUrls: [],
      protectedClaimHashes: [
        "e91f4c6407e0c3571df99c21976020751adf98391be0bc04f40e8457bd320ce9",
        "ebe9db09b0eaa16dbf24314f6be557f0762984564de5937db0d0d15f8048efcc",
      ],
      effectAuthorizationHashes: [
        "0189ec7c3a126f18244379ef1762384b624c8767738549b7ef3dcf8d7cbe5aee",
        "d763d78bf7095f66c3bfc12fa794886e457f17ea4ed7c95a745c966550fee2d4",
      ],
      commitOutcome: "COMMITTABLE",
      generationOutcome: "VALID",
      inboxOutcome: "COMMITTED",
      protectedOutbound: {
        required: true,
        groupId: "sales-cycle:b23c-capture-objection",
        plannedMessageCount: 1,
        deliveredMessageCount: 1,
      },
    };
    const candidates: RealtimeReplySnapshot[] = [];
    const result = await runRealtimeReplyDifferential({
      capturedInput: {
        openEventKey: "b23c-capture-open",
        objectionEventKey: "b23c-capture-objection",
        text: "đắt quá",
      },
      baseline: async () => baseline,
      candidate: async (capture) => {
        const opened = await evaluateRealtimeSalesCycle(input(
          createRealtimeSalesState(conversationId, pageId, now),
          "chốt CB182 size M",
          capture.openEventKey,
        ));
        const currentInput = input(
          opened.plan!.state,
          capture.text,
          capture.objectionEventKey,
        );
        const output = await evaluateRealtimeSalesCycle({
          ...currentInput,
          behaviorModeResolution: behaviorResolution("LEGACY", "COMMERCE"),
          negotiationProposal: priceNegotiationProposal(
            currentInput.messageId,
            "Em hiểu ạ. Em kiểm tra mức hỗ trợ phù hợp nhé ạ.",
          ),
        });
        const delivered = finalizeRealtimePostGenerationReply({
          mode: "GROUP_V2",
          messages: output.messages,
          wordingAuthority: resolveRealtimeDeliveryWordingAuthority({
            runtimeWordingAuthority: "MODEL",
            salesHandled: output.handled,
            salesWordingAuthority:
              output.wordingAuthority ?? "LEGACY_DETERMINISTIC",
          }),
        });
        const snapshot = {
          ...salesCycleSnapshot(
            { ...output, messages: delivered.messages },
            capture.objectionEventKey,
          ),
          strategyHash: "MODEL_STRATEGY_ANSWER_OBJECTION",
        };
        candidates.push(snapshot);
        return snapshot;
      },
      permittedDifferences: [
        { code: "OUTBOUND_MESSAGES_CHANGED", reasonCode: "B2_3C_MODEL_NEGOTIATION_WORDING" },
        { code: "STRATEGY_CHANGED", reasonCode: "B2_3C_MODEL_NEGOTIATION_DIRECTION" },
      ],
    });

    expect(result.sideEffects).toBe("DISABLED");
    expect(result.status).toBe("VIOLATION");
    expect(result.differences.map(({ code }) => code)).toEqual([
      "OUTBOUND_MESSAGES_CHANGED",
      "STRATEGY_CHANGED",
      "EFFECT_AUTHORIZATION_CHANGED",
    ]);
    expect(candidates[0]).toMatchObject({
      messages: [{ text: expect.stringContaining("Em hiểu ạ. Em kiểm tra mức hỗ trợ phù hợp nhé ạ.") }],
      verifiedFactHashes: baseline.verifiedFactHashes,
      protectedClaimHashes: baseline.protectedClaimHashes,
      commitOutcome: baseline.commitOutcome,
      protectedOutbound: baseline.protectedOutbound,
    });
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
    expect(first.plan?.events.find(({ commandKind }) =>
      commandKind === "CLARIFICATION_REQUESTED"
    )?.clarificationTransitionEvidence).toMatchObject({
      contractVersion: "CLARIFICATION_TRANSITION_EVIDENCE_V1",
      transition: {
        kind: "REQUESTED",
        missingFields: ["FULL_NAME", "ADDRESS"],
      },
      contributor: "DETERMINISTIC_RUNTIME",
      authorization: "NONE",
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
    expect(completed.plan?.events.find(({ commandKind }) =>
      commandKind === "CLARIFICATION_RESOLVED"
    )?.clarificationTransitionEvidence).toMatchObject({
      contractVersion: "CLARIFICATION_TRANSITION_EVIDENCE_V1",
      transition: { kind: "RESOLVED" },
      contributor: "DETERMINISTIC_RUNTIME",
      authorization: "NONE",
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
