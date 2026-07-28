import {
  PolicyBundleV1Schema,
  type AgentSalesSignalsV1,
  type CartLineV1,
} from "@lana/contracts";
import {
  computeBusinessContentHash,
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
      sourceObservedAt: "2026-07-23T02:00:00.000Z",
      sourceExpiresAt: "2026-07-25T02:00:00.000Z",
    };
  },
};

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
      plan: { state: { stage: "CART_OPEN" } },
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
      plan: { state: { stage: "ORDER_PREVIEW" } },
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
      plan: { state: { stage: "PURCHASE_CONFIRMED" } },
    });
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

  it("uses a high-confidence model confirmation only with exact latest-message evidence", async () => {
    const state = await previewState("event-model-confirm");
    const text = "triển khai giúp chị";
    const confirmed = await evaluateRealtimeSalesCycle({
      ...input(state, text, "event-model-confirm-accepted"),
      salesSignals: signals({
        confirmation: { decision: "CONFIRM", evidenceText: text },
      }),
    });
    expect(confirmed.telemetry).toMatchObject({
      confirmationConfirmed: true,
      confirmationSource: "MODEL_STRUCTURED_OUTPUT",
    });
    expect(confirmed.plan?.state.stage).toBe("PURCHASE_CONFIRMED");

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
});
