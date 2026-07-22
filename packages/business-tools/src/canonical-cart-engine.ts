import { createHash } from "node:crypto";
import {
  CartLineV1Schema,
  CartV1Schema,
  PolicyBundleV1Schema,
  type CartLineV1,
  type CartV1,
  type PolicyBundleV1,
} from "@lana/contracts";
import { evaluateShopPolicy, type ClosingCustomerState, type PolicyCartLineInput } from "./policy-engine.js";

export type CanonicalCartMutationV2 =
  | { readonly kind: "ADD_LINE"; readonly line: CartLineV1 }
  | { readonly kind: "REMOVE_LINE"; readonly lineId: string }
  | { readonly kind: "SET_QUANTITY"; readonly lineId: string; readonly quantity: number }
  | { readonly kind: "SET_COMPONENT_VARIANT"; readonly lineId: string; readonly componentProductId: string; readonly componentSku: string; readonly size: string; readonly color: string | null };

export type CanonicalCartDecisionV2 =
  | { readonly status: "APPLIED"; readonly cart: CartV1; readonly previousVersion: number; readonly nextVersion: number }
  | { readonly status: "BLOCKED"; readonly cart: CartV1; readonly reasonCode: "CART_VERSION_CONFLICT" | "CART_TERMINAL" | "CART_MUTATION_INVALID" | "CART_EMPTY" | "POLICY_BLOCKED" | "PRICE_FACT_INVALID"; readonly policyReasonCode: string | null };

export interface CanonicalCartIdentityV2 {
  readonly cartId: string;
  readonly salesEpisodeId: string;
  readonly customerProfileId: string;
}

export type CanonicalCartCreationV2 =
  | { readonly status: "CREATED"; readonly cart: CartV1 }
  | { readonly status: "BLOCKED"; readonly reasonCode: "CART_SEED_INVALID" | "POLICY_BLOCKED" | "PRICE_FACT_INVALID"; readonly policyReasonCode: string | null };

function deterministicUuid(seed: string): string {
  const hash = createHash("sha256").update(seed, "utf8").digest("hex");
  const variant = ((Number.parseInt(hash[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function closingEvidence(state: ClosingCustomerState) {
  if (state === "READY") return { previousState: null, purchaseReady: true, priceObjectionCount: 0, secondConcessionAlreadyApplied: false } as const;
  if (state === "HESITANT") return { previousState: "HESITANT", purchaseReady: false, priceObjectionCount: 1, secondConcessionAlreadyApplied: false } as const;
  return { previousState: "HESITANT", purchaseReady: false, priceObjectionCount: 2, secondConcessionAlreadyApplied: true } as const;
}

function mutate(lines: readonly CartLineV1[], mutation: CanonicalCartMutationV2 | null): readonly CartLineV1[] | null {
  if (mutation === null) return lines.map((line) => structuredClone(line));
  if (mutation.kind === "ADD_LINE") {
    const parsed = CartLineV1Schema.safeParse(mutation.line);
    if (!parsed.success || lines.some(({ lineId }) => lineId === parsed.data.lineId)) return null;
    return [...lines, parsed.data];
  }
  const index = lines.findIndex(({ lineId }) => lineId === mutation.lineId);
  if (index < 0) return null;
  if (mutation.kind === "REMOVE_LINE") return lines.filter((_, lineIndex) => lineIndex !== index);
  if (mutation.kind === "SET_QUANTITY") {
    if (!Number.isInteger(mutation.quantity) || mutation.quantity < 1 || mutation.quantity > 20) return null;
    return lines.map((line, lineIndex) => lineIndex === index
      ? { ...line, quantity: mutation.quantity, lineTotalVnd: line.posUnitPriceVnd === null ? null : line.posUnitPriceVnd * mutation.quantity }
      : line);
  }
  const size = mutation.size.trim().normalize("NFC").toUpperCase();
  const componentSku = mutation.componentSku.trim().normalize("NFC").toUpperCase();
  const color = mutation.color === null ? null : mutation.color.trim().normalize("NFC").toUpperCase();
  if (size === "" || componentSku === "" || color === "") return null;
  let found = false;
  const next = lines.map((line, lineIndex) => lineIndex !== index ? line : {
    ...line,
    components: line.components.map((component) => {
      if (component.componentProductId !== mutation.componentProductId) return component;
      found = true;
      return { ...component, componentSku, size, color };
    }),
  });
  return found ? next : null;
}

export function canonicalCartPolicyLinesV2(lines: readonly CartLineV1[], shopId: string): readonly PolicyCartLineInput[] | null {
  const result: PolicyCartLineInput[] = [];
  for (const line of lines) {
    const authority = line.priceAuthority;
    if (authority === null || line.posUnitPriceVnd === null || authority.shopId !== shopId || authority.parentProductId !== line.parentProductId || authority.offerId !== line.offerId) return null;
    result.push({
      lineId: line.lineId,
      shopId,
      parentProductId: line.parentProductId,
      offerKind: line.offerKind,
      quantity: line.quantity,
      priceEvidence: {
        authority: "PANCAKE_POS",
        shopId: authority.shopId,
        parentProductId: authority.parentProductId,
        offerKind: line.offerKind,
        sourceVersion: authority.metadata.sourceVersion,
        observedAt: authority.metadata.observedAt,
        expiresAt: authority.metadata.expiresAt,
        freshForSeconds: 172_800,
        unitPriceVnd: line.posUnitPriceVnd,
      },
    });
  }
  return result;
}

function evaluatedCart(input: {
  readonly base: CartV1;
  readonly lines: readonly CartLineV1[];
  readonly nextVersion: number;
  readonly shopId: string;
  readonly policy: PolicyBundleV1;
  readonly customerState: ClosingCustomerState;
  readonly readyForConfirmation: boolean;
  readonly now: Date;
}): Extract<CanonicalCartDecisionV2, { status: "BLOCKED" }> | CartV1 {
  const priceLines = canonicalCartPolicyLinesV2(input.lines, input.shopId);
  if (priceLines === null) return { status: "BLOCKED", cart: input.base, reasonCode: "PRICE_FACT_INVALID", policyReasonCode: null };
  let evaluation;
  try {
    evaluation = evaluateShopPolicy({
      policy: PolicyBundleV1Schema.parse(input.policy),
      lines: priceLines,
      closingEvidence: closingEvidence(input.customerState),
      now: input.now,
    });
  } catch {
    return { status: "BLOCKED", cart: input.base, reasonCode: "POLICY_BLOCKED", policyReasonCode: "POLICY_INPUT_INVALID" };
  }
  if (evaluation.status === "BLOCKED") {
    return { status: "BLOCKED", cart: input.base, reasonCode: "POLICY_BLOCKED", policyReasonCode: evaluation.reasonCode };
  }
  const adjustments = evaluation.adjustments.map((adjustment) => ({
    adjustmentId: deterministicUuid(`adjustment\u0000${input.base.cartId}\u0000${input.nextVersion}\u0000${adjustment.ruleId}`),
    kind: adjustment.kind,
    amountVnd: adjustment.amountVnd,
    percentageBps: adjustment.percentageBps,
    policyAuthorization: {
      policyBundleId: evaluation.policyBundleId,
      policyBundleVersion: evaluation.policyVersion,
      ruleId: adjustment.ruleId,
      decisionId: deterministicUuid(`decision\u0000${input.base.cartId}\u0000${input.nextVersion}\u0000${adjustment.ruleId}`),
      authorizedAt: input.now.toISOString(),
    },
  }));
  return CartV1Schema.parse({
    ...input.base,
    revision: input.nextVersion,
    status: input.readyForConfirmation ? "READY_FOR_CONFIRMATION" : "OPEN",
    checkoutEligibility: "ELIGIBLE",
    lines: input.lines,
    adjustments,
    shippingFeeVnd: evaluation.shippingFeeVnd,
    subtotalVnd: evaluation.subtotalVnd,
    discountTotalVnd: evaluation.discountTotalVnd,
    grandTotalVnd: evaluation.grandTotalVnd,
    updatedAt: input.now.toISOString(),
  });
}

/** Creates revision 1 from authoritative POS-backed lines; caller-supplied totals are never accepted. */
export function createCanonicalCartV2(input: {
  readonly identity: CanonicalCartIdentityV2;
  readonly lines: readonly CartLineV1[];
  readonly shopId: string;
  readonly policy: PolicyBundleV1;
  readonly now: Date;
}): CanonicalCartCreationV2 {
  if (!Number.isFinite(input.now.getTime()) || input.shopId.trim() === "" || input.lines.length < 1 || input.lines.length > 50) {
    return { status: "BLOCKED", reasonCode: "CART_SEED_INVALID", policyReasonCode: null };
  }
  const parsedLines = input.lines.map((line) => CartLineV1Schema.safeParse(line));
  if (parsedLines.some(({ success }) => !success)) return { status: "BLOCKED", reasonCode: "CART_SEED_INVALID", policyReasonCode: null };
  const lines = parsedLines.map((result) => {
    if (!result.success) throw new Error("unreachable");
    return result.data;
  });
  let base: CartV1;
  try {
    const subtotal = lines.reduce((sum, line) => sum + (line.lineTotalVnd ?? 0), 0);
    base = CartV1Schema.parse({
      schemaVersion: 1,
      ...input.identity,
      revision: 1,
      currency: "VND",
      status: "OPEN",
      checkoutEligibility: "ELIGIBLE",
      lines,
      adjustments: [],
      shippingFeeVnd: input.policy.shipping.defaultFeeVnd,
      subtotalVnd: subtotal,
      discountTotalVnd: 0,
      grandTotalVnd: subtotal + input.policy.shipping.defaultFeeVnd,
      createdAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
    });
  } catch {
    return { status: "BLOCKED", reasonCode: "CART_SEED_INVALID", policyReasonCode: null };
  }
  const evaluated = evaluatedCart({ base, lines, nextVersion: 1, shopId: input.shopId, policy: input.policy, customerState: "READY", readyForConfirmation: false, now: input.now });
  if (!("schemaVersion" in evaluated)) {
    return { status: "BLOCKED", reasonCode: evaluated.reasonCode === "PRICE_FACT_INVALID" ? "PRICE_FACT_INVALID" : "POLICY_BLOCKED", policyReasonCode: evaluated.policyReasonCode };
  }
  return { status: "CREATED", cart: evaluated };
}

/** Canonical cart reducer: all totals and offers are recalculated by policy, never accepted from model output. */
export function applyCanonicalCartDecisionV2(input: {
  readonly cart: CartV1;
  readonly expectedCartVersion: number;
  readonly mutation: CanonicalCartMutationV2 | null;
  readonly shopId: string;
  readonly policy: PolicyBundleV1;
  readonly customerState: ClosingCustomerState;
  readonly readyForConfirmation?: boolean;
  readonly now: Date;
}): CanonicalCartDecisionV2 {
  const parsed = CartV1Schema.safeParse(input.cart);
  if (!parsed.success) throw new Error("CANONICAL_CART_INVALID");
  const cart = parsed.data;
  const blocked = (reasonCode: Extract<CanonicalCartDecisionV2, { status: "BLOCKED" }>["reasonCode"], policyReasonCode: string | null = null): CanonicalCartDecisionV2 => ({ status: "BLOCKED", cart, reasonCode, policyReasonCode });
  if (cart.revision !== input.expectedCartVersion) return blocked("CART_VERSION_CONFLICT");
  if (cart.status === "CONFIRMED" || cart.status === "ABANDONED") return blocked("CART_TERMINAL");
  if (!Number.isFinite(input.now.getTime()) || input.shopId.trim() === "") return blocked("CART_MUTATION_INVALID");
  const lines = mutate(cart.lines, input.mutation);
  if (lines === null || lines.length > 50) return blocked("CART_MUTATION_INVALID");
  if (lines.length === 0) return blocked("CART_EMPTY");
  const parsedLines = lines.map((line) => CartLineV1Schema.safeParse(line));
  if (parsedLines.some(({ success }) => !success)) return blocked("CART_MUTATION_INVALID");
  const validLines = parsedLines.map((result) => {
    if (!result.success) throw new Error("unreachable");
    return result.data;
  });
  if (input.readyForConfirmation === true && validLines.some((line) => line.components.some((component) => component.size === null))) {
    return blocked("CART_MUTATION_INVALID");
  }
  const nextVersion = cart.revision + 1;
  const next = evaluatedCart({ base: cart, lines: validLines, nextVersion, shopId: input.shopId, policy: input.policy, customerState: input.customerState, readyForConfirmation: input.readyForConfirmation === true, now: input.now });
  if (!("schemaVersion" in next)) return next;
  return { status: "APPLIED", cart: next, previousVersion: cart.revision, nextVersion };
}
