import { PolicyBundleV1Schema } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import type { PolicyCartLineInput } from "./policy-engine.js";
import {
  applyNegotiationEventV2,
  type ApplyNegotiationEventV2Input,
  type NegotiationEvidenceV2,
  type NegotiationStateV2,
} from "./negotiation-engine-v2.js";

const metadata = {
  authority: "ADMIN_POLICY", sourceVersion: "2026-07-22.2", observedAt: "2026-07-22T00:00:00.000Z",
  expiresAt: null, freshForSeconds: null, freshnessState: "FRESH",
} as const;

const policy = () => PolicyBundleV1Schema.parse({
  schemaVersion: 1, policyBundleId: "lana-shopwide-sales", policyVersion: "2026-07-22.2",
  shopId: "LANA_DESIGN", status: "ACTIVE", effectiveAt: "2026-07-22T00:00:00.000Z", effectiveUntil: null,
  supersedesPolicyVersion: null, scope: "SHOP_WIDE",
  commerceAuthority: {
    bomAuthority: "PANCAKE_POS", priceAuthority: "PANCAKE_POS", inventoryAuthority: "PANCAKE_POS",
    allowGoogleSheetsPriceOverride: false, allowAdminPriceOverride: false, missingPriceBehavior: "DO_NOT_QUOTE", metadata,
  },
  shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata },
  multiItemOffer: { minimumProductCount: 2, discountBps: 500, countingUnit: "PARENT_PRODUCT_UNIT", setAndComboCountAsOne: true, scope: "SHOP_WIDE", metadata },
  negotiation: {
    secondConcession: { freeShipping: true, fixedDiscountVnd: 0 },
    finalConcession: { freeShipping: true, fixedDiscountVnd: 20_000 },
    stacking: { multiItemDiscountWithSecondConcession: true, multiItemDiscountWithFinalConcession: true, deduplicateFreeShipping: true },
    scope: "SHOP_WIDE", metadata,
  },
  closing: { customerStates: ["READY", "HESITANT", "CAUTIOUS"], decisionMode: "DETERMINISTIC_POLICY_ONLY", allowUnlistedOffers: false, metadata },
});

const now = new Date("2026-07-22T01:00:00.000Z");
const priceEvidence = (parentProductId: string, unitPriceVnd: number) => ({
  authority: "PANCAKE_POS" as const, shopId: "LANA_DESIGN", parentProductId, offerKind: "SET" as const,
  sourceVersion: "pos-r1", observedAt: "2026-07-22T00:00:00.000Z", expiresAt: "2026-07-24T00:00:00.000Z",
  freshForSeconds: 172_800 as const, unitPriceVnd,
});
const lines = (quantity: number): readonly PolicyCartLineInput[] => [{
  lineId: "line-1", shopId: "LANA_DESIGN", parentProductId: "CB182", offerKind: "SET", quantity,
  priceEvidence: priceEvidence("CB182", 700_000),
}];

const customerEvidence = (
  intent: "PURCHASE_READY" | "OTHER" = "PURCHASE_READY",
  evidenceId = "evidence-ready",
): NegotiationEvidenceV2 => ({
  source: "MODEL_INTERPRETATION", intent, evidenceId, observedAt: now.toISOString(),
});
const objection = (evidenceId: string): NegotiationEvidenceV2 => ({
  source: "MODEL_INTERPRETATION", intent: "PRICE_OBJECTION", evidenceId: `model-${evidenceId}`,
  objectionEvidenceId: evidenceId, reasonCode: "PRICE_TOO_HIGH", observedAt: now.toISOString(),
});

function command(overrides: Partial<ApplyNegotiationEventV2Input> = {}): ApplyNegotiationEventV2Input {
  return {
    negotiationId: "neg-1", state: null, expectedStateVersion: 0, expectedCartVersion: 1,
    eventId: "event-ready", evidence: customerEvidence(), cart: { cartId: "cart-1", cartVersion: 1, lines: lines(2) },
    policy: policy(), now, ...overrides,
  };
}

function applied(input: ApplyNegotiationEventV2Input): NegotiationStateV2 {
  const result = applyNegotiationEventV2(input);
  if (result.status === "BLOCKED") throw new Error(`blocked: ${result.reasonCode}`);
  return result.state;
}

describe("negotiation engine v2", () => {
  it("derives READY/HESITANT/CAUTIOUS and lets policy select each offer", () => {
    const ready = applied(command());
    expect(ready.customerState).toBe("READY");
    expect(ready.quote.adjustments.map(({ kind }) => kind)).toEqual(["PERCENT_DISCOUNT"]);

    const hesitant = applied(command({
      state: ready, expectedStateVersion: 1, eventId: "event-objection-1", evidence: objection("objection-1"),
    }));
    expect(hesitant.customerState).toBe("HESITANT");
    expect(hesitant.quote.adjustments.map(({ kind }) => kind)).toEqual(["PERCENT_DISCOUNT", "FREE_SHIPPING"]);

    const cautious = applied(command({
      state: hesitant, expectedStateVersion: 2, eventId: "event-objection-2", evidence: objection("objection-2"),
    }));
    expect(cautious.customerState).toBe("CAUTIOUS");
    expect(cautious.quote.adjustments.map(({ kind }) => kind)).toEqual(["PERCENT_DISCOUNT", "FREE_SHIPPING", "FIXED_DISCOUNT"]);
    expect(cautious.quote.adjustments.filter(({ kind }) => kind === "FREE_SHIPPING")).toHaveLength(1);
    expect(cautious.quote.grandTotalVnd).toBe(1_310_000);
  });

  it("does not advance or apply another concession when the same event is retried", () => {
    const ready = applied(command());
    const firstCommand = command({
      state: ready, expectedStateVersion: 1, eventId: "event-objection-1", evidence: objection("objection-1"),
    });
    const hesitant = applied(firstCommand);
    const replay = applyNegotiationEventV2({ ...firstCommand, state: hesitant });

    expect(replay.status).toBe("REPLAYED");
    if (replay.status === "BLOCKED") throw new Error("expected replay");
    expect(replay.state.stateVersion).toBe(2);
    expect(replay.state.customerState).toBe("HESITANT");
    expect(replay.state.quote.adjustments.filter(({ kind }) => kind === "FREE_SHIPPING")).toHaveLength(1);
    expect(replay.cas).toEqual({ expectedStateVersion: 2, nextStateVersion: 2 });
  });

  it("deduplicates the same objection evidence even if it arrives under a different event id", () => {
    const ready = applied(command());
    const hesitant = applied(command({ state: ready, expectedStateVersion: 1, eventId: "event-1", evidence: objection("same-message") }));
    const duplicate = applyNegotiationEventV2(command({
      state: hesitant, expectedStateVersion: 2, eventId: "event-2", evidence: objection("same-message"),
    }));

    expect(duplicate.status).toBe("APPLIED");
    if (duplicate.status === "BLOCKED") throw new Error("expected duplicate to be consumed without escalation");
    expect(duplicate.state.customerState).toBe("HESITANT");
    expect(duplicate.audit.reasonCode).toBe("OBJECTION_ALREADY_CONSUMED");
    expect(duplicate.audit.newObjectionAccepted).toBe(false);
  });

  it("exposes CAS so only one of two simultaneous objections can win", () => {
    const ready = applied(command());
    const left = applyNegotiationEventV2(command({ state: ready, expectedStateVersion: 1, eventId: "left", evidence: objection("left") }));
    const right = applyNegotiationEventV2(command({ state: ready, expectedStateVersion: 1, eventId: "right", evidence: objection("right") }));
    expect(left.cas).toEqual({ expectedStateVersion: 1, nextStateVersion: 2 });
    expect(right.cas).toEqual({ expectedStateVersion: 1, nextStateVersion: 2 });

    if (left.status === "BLOCKED") throw new Error("expected left to be accepted");
    const staleRight = applyNegotiationEventV2(command({
      state: left.state, expectedStateVersion: 1, eventId: "right", evidence: objection("right"),
    }));
    expect(staleRight).toMatchObject({ status: "BLOCKED", reasonCode: "STATE_VERSION_CONFLICT" });
    expect(staleRight.state?.customerState).toBe("HESITANT");
  });

  it("recalculates multi-item eligibility from the mutated cart without changing tier", () => {
    const ready = applied(command());
    const hesitant = applied(command({ state: ready, expectedStateVersion: 1, eventId: "objection", evidence: objection("objection") }));
    expect(hesitant.quote.adjustments.map(({ kind }) => kind)).toEqual(["PERCENT_DISCOUNT", "FREE_SHIPPING"]);

    const mutation = applyNegotiationEventV2(command({
      state: hesitant,
      expectedStateVersion: 2,
      expectedCartVersion: 1,
      eventId: "cart-minus-one",
      evidence: { source: "RUNTIME", intent: "CART_MUTATED", evidenceId: "mutation-1", mutationReasonCode: "QUANTITY_CHANGED", observedAt: now.toISOString() },
      cart: { cartId: "cart-1", cartVersion: 2, lines: lines(1) },
    }));
    expect(mutation.status).toBe("APPLIED");
    if (mutation.status === "BLOCKED") throw new Error("expected repricing");
    expect(mutation.state.customerState).toBe("HESITANT");
    expect(mutation.state.quote.parentProductUnitCount).toBe(1);
    expect(mutation.state.quote.adjustments.map(({ kind }) => kind)).toEqual(["FREE_SHIPPING"]);
    expect(mutation.audit.action).toBe("REPRICED");
  });

  it("rejects a cart change disguised as a customer signal", () => {
    const ready = applied(command());
    const result = applyNegotiationEventV2(command({
      state: ready, expectedStateVersion: 1, expectedCartVersion: 1, eventId: "bad-change",
      cart: { cartId: "cart-1", cartVersion: 2, lines: lines(1) },
    }));
    expect(result).toMatchObject({ status: "BLOCKED", reasonCode: "CART_CHANGED_WITHOUT_MUTATION_EVENT" });
  });

  it("requires cart mutation to advance exactly one version", () => {
    const initial = applied(command());
    const jumped = applyNegotiationEventV2(command({
      state: initial,
      expectedStateVersion: initial.stateVersion,
      expectedCartVersion: initial.cartVersion,
      cart: { cartId: "cart-1", cartVersion: initial.cartVersion + 2, lines: lines(1) },
      eventId: "event-cart-jump",
      evidence: { source: "RUNTIME", intent: "CART_MUTATED", evidenceId: "mutation-jump", mutationReasonCode: "LINE_REMOVED", observedAt: now.toISOString() },
    }));
    expect(jumped).toMatchObject({ status: "BLOCKED", reasonCode: "CART_MUTATION_VERSION_NOT_ADVANCED" });
  });

  it("blocks an event-id collision instead of treating different evidence as a replay", () => {
    const ready = applied(command());
    const result = applyNegotiationEventV2(command({
      state: ready, expectedStateVersion: 1, eventId: "event-ready", evidence: objection("new-objection"),
    }));
    expect(result).toMatchObject({ status: "BLOCKED", reasonCode: "EVENT_ID_COLLISION" });
  });

  it("fails closed with the policy reason and retains complete decision audit", () => {
    const staleLines = lines(1).map((line) => ({
      ...line,
      priceEvidence: { ...line.priceEvidence, observedAt: "2026-07-19T00:00:00.000Z", expiresAt: "2026-07-21T00:00:00.000Z" },
    }));
    const result = applyNegotiationEventV2(command({ cart: { cartId: "cart-1", cartVersion: 1, lines: staleLines } }));
    expect(result).toMatchObject({ status: "BLOCKED", reasonCode: "POLICY_EVALUATION_BLOCKED", policyReasonCode: "POS_PRICE_STALE" });
    expect(result.audit).toMatchObject({
      action: "BLOCKED", decisionMode: "DETERMINISTIC_POLICY_ONLY", policyBundleId: "lana-shopwide-sales",
      eventId: "event-ready", cartVersionAfter: 1, adjustments: [],
    });
  });
});
