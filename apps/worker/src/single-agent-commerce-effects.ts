import { computeBusinessContentHash, executePersistedSalesCycleCommand, type RuntimePolicyBundle,
  type SalesCycleCommand, type SalesCycleRuntimeState, type SalesCycleStateRepositoryV1,
  type SalesCycleTrustedPortsV1, type ResolvedCartDraftV1 } from "@lana/chat-runtime";
import type { CanonicalCartIdentityV2, CanonicalCartMutationV2 } from "@lana/business-tools";
import { buildProtectedClaimsFromCartSelectionsV1, normalizeCatalogToken } from "@lana/business-tools";
import { buildReadOnlyContext, commerceHash, commerceUuid, publicPolicyLiteral } from "./single-agent-commerce-read-only-context.js";
import { toolArgs, type CommerceScope, type CommerceToolCall, type CommerceToolResult } from "./single-agent-commerce-read-only-tools.js";
import type { CommerceTools } from "./single-agent-commerce-read-only.js";
import type { CartSelectionQuery, CartSelectionResult } from "./realtime-sales-catalog.js";
import type { TerminalOutcome, TrustedContext } from "./single-agent-semantic-verifier-boundary.js";
import { selectionsMatchCartLines } from "./realtime-sales-cycle.js";

const names = new Set(["add_to_cart", "change_cart_item", "confirm_purchase"]);
export type CommerceCommandResult =
  | { status: "APPLIED"; state: SalesCycleRuntimeState; transferToHuman: boolean }
  | { status: "DUPLICATE"; state: SalesCycleRuntimeState }
  | { status: "CHECKOUT_REQUESTED"; state: SalesCycleRuntimeState }
  | { status: "HANDOFF"; state: SalesCycleRuntimeState; reasonCode: string }
  | { status: "REJECTED" | "CONFLICT"; reasonCode: string };

/** Native tools bridge to existing atomic sales-cycle repository. No external order/send implementation. */
export async function createCommerceEffectTools(input: {
  base: CommerceTools; scope: CommerceScope; clock: () => Date; conversationKey: string;
  repository: SalesCycleStateRepositoryV1; identity: CanonicalCartIdentityV2;
  authorize: (effect: "CART_OPEN" | "CART_MUTATION" | "PURCHASE_CONFIRMATION", current: SalesCycleRuntimeState) => Promise<boolean>;
  policy: () => Promise<RuntimePolicyBundle>;
  select: (query: CartSelectionQuery) => Promise<CartSelectionResult>;
  trustedPorts?: SalesCycleTrustedPortsV1;
  resolveBankTransferPolicy?: Parameters<typeof executePersistedSalesCycleCommand>[0]["resolveBankTransferPolicy"];
  /** A real composition supplies the existing guarded runtime transaction; isolated tests may use the domain CAS. */
  readAuthority?: () => Promise<Pick<CommerceScope, "revision" | "conversationOwner" | "recipient" | "permission" | "privacyAllowed" | "bindingVersion">>;
  readReceipt?: (operationId: string) => Promise<TrustedContext["effectReceipts"][number] | null>;
  executeCommand?: (input: { command: SalesCycleCommand; expectedRevision: number; conversationRevision: number; bindingVersion: string; trustedPorts: SalesCycleTrustedPortsV1;
    policy: RuntimePolicyBundle }) => Promise<CommerceCommandResult>;
}): Promise<CommerceTools> {
  async function read() {
    const s = await input.repository.read(input.conversationKey);
    if (!s || s.conversationKey !== input.conversationKey || s.routing.pageId !== input.scope.pageId ||
      s.routing.conversationId !== input.scope.conversationId) throw new Error("COMMERCE_SCOPE");
    return s;
  }
  let current = await read(), policy: RuntimePolicyBundle | null = null, uncertain = false, failedEffect = false;
  const selections = new Map<string, Extract<CartSelectionResult, { status: "READY" }>>();
  let authority = await input.readAuthority?.();
  if (authority && (authority.bindingVersion !== input.scope.bindingVersion || authority.recipient !== input.scope.recipient)) throw new Error("COMMERCE_SCOPE");
  const turnBinding = authority?.bindingVersion ?? input.scope.bindingVersion;
  const turnRecipient = authority?.recipient ?? input.scope.recipient;
  const refreshAuthority = async () => { authority = await input.readAuthority?.(); };
  let receipt: TrustedContext["effectReceipts"][number] | undefined;
  let receiptConversationRevision: number | undefined;
  let receiptBindingVersion: string | undefined;
  let committedTerminal: { reason: string; revision: number; operationId: string; conversationRevision: number; disposition?: "NO_SEND" } | undefined;
  const selectionRef = (lineId: string) => `cart-variant:${lineId}`;
  const activeSelections = () => [...selections.values()].filter(s => current.cart?.value.lines.some(l => selectionsMatchCartLines([l], [s])));
  const cartItems = (active = activeSelections()) => current.cart?.value.lines.map(line => {
    const selected = active.find(s => s.line.lineId === line.lineId);
    return { subjectRef: line.lineId, productRef: line.parentProductId, offerType: line.offerId, quantity: line.quantity,
      components: line.components.map(c => ({ componentRole: c.componentRole, size: c.size, color: c.color })),
      ...(selected ? { stockStatus: selected.stockStatus, stockAvailableQuantity: selected.stockAvailableQuantity } : {}) };
  }) ?? [];
  async function terminalOutcome(): Promise<TerminalOutcome | null> {
    if (!committedTerminal) {
      await refreshAuthority();
      if (authority && (!authority.permission || !authority.privacyAllowed || authority.conversationOwner !== "BOT" ||
        authority.recipient !== turnRecipient || authority.bindingVersion !== turnBinding)) {
        return { disposition: "NO_SEND", reason: "CURRENT_AUTHORITY_CHANGED", text: null, fallbackId: null };
      }
      return await input.base.terminalOutcome?.() ?? null;
    }
    current = await read(); await refreshAuthority();
    const state = snapshot().state;
    if (!state.privacyAllowed || state.recipient !== turnRecipient || state.bindingVersion !== turnBinding ||
      current.revision !== committedTerminal.revision || !current.processedCommandIds.includes(committedTerminal.operationId) ||
      (authority?.revision ?? input.scope.revision) !== committedTerminal.conversationRevision) {
      return { disposition: "NO_SEND", reason: "HANDOFF_SCOPE_CHANGED", text: null, fallbackId: null };
    }
    return { disposition: committedTerminal.disposition ?? "HANDOFF", reason: committedTerminal.reason, text: null, fallbackId: null };
  }
  const snapshot = (): TrustedContext => {
    const base = input.base.snapshot(), subjects = [...base.boundSubjects];
    const active = activeSelections();
    if (current.cart) {
      subjects.push({ ref: current.cart.value.cartId, kind: "CART", label: "Giỏ hàng hiện tại", bindingVersion: base.state.bindingVersion });
      for (const line of current.cart.value.lines) subjects.push({ ref: line.lineId, kind: "CART_LINE", label: line.parentProductId, bindingVersion: base.state.bindingVersion });
    }
    for (const s of active) subjects.push({ ref: selectionRef(s.line.lineId), kind: "VARIANT",
      label: `${s.line.parentProductId} ${s.line.offerId}: ${s.line.components.map(c => [c.componentRole, c.size, c.color].filter(Boolean).join(" ")).join("; ")}`,
      productId: s.line.parentProductId, bindingVersion: base.state.bindingVersion });
    const selectionClaims = buildProtectedClaimsFromCartSelectionsV1(active.map(s => ({ productId: s.line.parentProductId, variantId: selectionRef(s.line.lineId), priceVnd: s.line.posUnitPriceVnd!,
      priceVersion: s.versions.price, inventoryVersion: s.versions.inventory, etaVersion: s.versions.eta, eta: s.eta, etaExpiresAt: s.etaExpiresAt, sourceAuthority: s.sourceAuthority,
      stockStatus: s.stockStatus, stockAvailableQuantity: s.stockAvailableQuantity, observedAt: s.sourceObservedAt, expiresAt: s.sourceExpiresAt })));
    const cart = current.cart?.value;
    const stateReceipts = base.effectReceipts.filter(r => r.effect === "CUSTOMER_STATE_UPDATED" && r.subjectRef === base.state.customerProfileId &&
      base.boundSubjects.some(s => s.kind === "CUSTOMER_PROFILE" && s.ref === r.subjectRef)).map(r => ({ ...r, stateRevision: current.revision }));
    return buildReadOnlyContext({ state: { ...base.state, ...authority, conversationRevision: authority?.revision ?? base.state.revision, revision: current.revision,
      salesStage: current.stage, cartItems: cartItems(active),
      checkoutStatus: { previewAvailable: current.stage === "ORDER_PREVIEW" && current.preview !== null, purchaseConfirmed: current.confirmation !== null,
        missingFields: [!current.checkoutDraft?.fullName && "FULL_NAME", !current.checkoutDraft?.phone && "PHONE", !current.checkoutDraft?.address && "ADDRESS", !current.checkoutDraft?.paymentMethod && "PAYMENT_METHOD"].filter(Boolean) },
      ...(current.stage === "HANDED_OFF" ? { permission: false, conversationOwner: "HUMAN" } : {}),
      ...(cart ? { cartQuote: { cartId: cart.cartId, cartVersion: cart.revision,
        subtotalVnd: cart.subtotalVnd, shippingFeeVnd: cart.shippingFeeVnd, discountTotalVnd: cart.discountTotalVnd, grandTotalVnd: cart.grandTotalVnd } } : {}) },
      subjects, products: base.runtimeProducts ?? [], claims: [...base.protectedClaims.filter(c => {
        const claim = c as { type: string; scope: { kind: string; productId?: string; variantId?: string } };
        return !["PRICE", "STOCK"].includes(claim.type) || !active.some(s => claim.scope.kind === "PRODUCT" && claim.scope.productId === s.line.parentProductId &&
          [s.line.offerId, `offer:${s.line.parentProductId}:${s.line.offerId}`].includes(claim.scope.variantId ?? ""));
      }), ...selectionClaims],
      policies: policy ? [publicPolicyLiteral(policy, input.scope.pageId, input.scope.shopId, input.clock())] : base.policyLiterals,
      // Reuse the selection readback: a known contradiction invalidates this
      // receipt's current scope; unavailable source data adds no new assertion.
      receipts: [...stateReceipts, ...(receipt && active.length === selections.size ? [receipt] : [])], ...(cart ? { cartBinding: { cartId: cart.cartId, cartVersion: cart.revision } } : {}) });
  };
  async function selection(productId: string, a: Record<string, unknown>, lineId: string, offerType: string | null = null) {
    const result = await input.select({ shopAlias: input.scope.shopAlias, productId, offerType,
      size: typeof a.size === "string" ? a.size : null, color: typeof a.color === "string" ? a.color : null,
      quantity: typeof a.quantity === "number" ? a.quantity : 1, lineId });
    if (result.status !== "READY") return { status: result.status, reasonCode: result.reasonCode,
      availableSizes: result.availableSizes, availableColors: result.availableColors };
    if (result.shopId !== input.scope.shopId || result.line.parentProductId !== productId ||
      Date.parse(result.sourceObservedAt) > input.clock().getTime() || Date.parse(result.sourceExpiresAt) <= input.clock().getTime()) throw new Error("SELECTION_UNAVAILABLE");
    const line = { ...result.line, lineId }; selections.set(lineId, { ...result, line }); return { ...result, line };
  }
  async function refreshSelections() {
    const lines = current.cart?.value.lines ?? [];
    for (const id of selections.keys()) if (!lines.some(line => line.lineId === id)) selections.delete(id);
    for (const line of lines) {
      const sizes = [...new Set(line.components.map(c => c.size))], colors = [...new Set(line.components.map(c => c.color))];
      try {
        const selected = await selection(line.parentProductId, { size: sizes.length === 1 ? sizes[0] : null, color: colors.length === 1 ? colors[0] : null, quantity: line.quantity }, line.lineId, line.offerId);
        if (selected.status !== "READY") selections.delete(line.lineId);
      }
      catch { selections.delete(line.lineId); }
    }
  }
  function recordReceipt(operationId: string, effect: string, expectedRevision: number) {
    if (current.revision !== expectedRevision || !current.processedCommandIds.includes(operationId) || !current.cart || current.stage === "HANDED_OFF") return false;
    receipt = { ref: `receipt:${operationId}`, operationId, subjectRef: current.cart.value.cartId, status: "SUCCESS", effect,
      stateRevision: current.revision, recipient: turnRecipient, observedAt: current.updatedAt,
      expiresAt: new Date(Math.min(Date.parse(current.cart.expiresAt), Date.parse(current.updatedAt) + 300_000)).toISOString() };
    receiptConversationRevision = authority?.revision ?? input.base.snapshot().state.revision;
    receiptBindingVersion = turnBinding;
    return true;
  }
  function acceptReceipt(recovered: TrustedContext["effectReceipts"][number] | null | undefined, operationId: string, allowed: string[]) {
    if (!recovered || recovered.operationId !== operationId || recovered.status !== "SUCCESS" || !allowed.includes(recovered.effect) ||
      !current.processedCommandIds.includes(operationId) || recovered.stateRevision !== current.revision || recovered.subjectRef !== current.cart?.value.cartId || recovered.recipient !== turnRecipient ||
      !Number.isFinite(Date.parse(recovered.observedAt)) || !Number.isFinite(Date.parse(recovered.expiresAt)) || Date.parse(recovered.observedAt) > input.clock().getTime() ||
      Date.parse(recovered.expiresAt) <= input.clock().getTime() || Date.parse(recovered.expiresAt) > Date.parse(current.cart.expiresAt)) return false;
    receipt = recovered; receiptConversationRevision = authority?.revision ?? input.base.snapshot().state.revision; receiptBindingVersion = turnBinding;
    return true;
  }
  async function invokeEffect(call: CommerceToolCall): Promise<CommerceToolResult> {
    if (!names.has(call.name)) return input.base.invoke(call);
    try { await refreshAuthority(); } catch { return { status: "UNAVAILABLE", reason: "CURRENT_AUTHORITY_UNAVAILABLE" }; }
    const state = snapshot().state;
    if (state.customerStateUpdatePending === true) return { status: "REJECTED", reason: "DEPENDENT_STATE_REJECTED" };
    if (!state.permission || !state.privacyAllowed || state.conversationOwner !== "BOT" || uncertain ||
      state.bindingVersion !== turnBinding || state.recipient !== turnRecipient) return { status: "REJECTED", reason: "PERMISSION_OR_UNKNOWN_COMMIT" };
    let commitAttempted = false;
    try {
      current = await read();
      const authorizedRevision = current.revision;
      const a = toolArgs(call.args, call.name === "add_to_cart" ? ["subjectRef", "offerType", "size", "color", "quantity"] :
        call.name === "change_cart_item" ? ["subjectRef", "action", "quantity", "size", "color", "componentRole"] : []);
      if (!a) return { status: "REJECTED", reason: "TOOL_ARGUMENTS" };
      if (call.name === "add_to_cart" && (typeof a.offerType !== "string" || !a.offerType.trim())) {
        return { status: "REJECTED", reason: "OFFER_REQUIRED" };
      }
      if (call.name === "change_cart_item") {
        const fields = a.action === "REMOVE_LINE" ? ["subjectRef", "action"] :
          a.action === "SET_QUANTITY" ? ["subjectRef", "action", "quantity"] :
          a.action === "SET_COMPONENT_VARIANT" ? ["subjectRef", "action", "componentRole", "size", "color"] : null;
        if (!fields || !toolArgs(a, fields)) return { status: "REJECTED", reason: "TOOL_ARGUMENTS" };
      }
      for (const [field, max] of [["size", 16], ["color", 64], ["offerType", 64]] as const) {
        const value = a[field];
        if (value !== undefined && !(field === "color" && value === null) &&
          (typeof value !== "string" || !value.trim() || Buffer.byteLength(value) > max)) return { status: "REJECTED", reason: "VARIANT_ARGUMENTS" };
      }
      const product = call.name === "add_to_cart" ? state && input.base.snapshot().boundSubjects.find(s => s.kind === "PRODUCT" && s.ref === a.subjectRef) : undefined;
      const line = current.cart?.value.lines.find(l => l.lineId === a.subjectRef);
      if ((call.name === "add_to_cart" && !product) || (call.name === "change_cart_item" && !line)) return { status: "REJECTED", reason: "SUBJECT_REF" };
      const effect = call.name === "confirm_purchase" ? "PURCHASE_CONFIRMATION" : current.cart ? "CART_MUTATION" : "CART_OPEN";
      if (!await input.authorize(effect, current)) return { status: "REJECTED", reason: "EFFECT_PERMISSION" };
      const operationId = commerceHash({ pageId: input.scope.pageId, conversationId: input.scope.conversationId,
        sourceMessageId: input.scope.sourceMessageId, tool: call.name, args: a });
      const effectName = call.name === "confirm_purchase" ? "PURCHASE_CONFIRMED" : effect === "CART_OPEN" ? "CART_OPENED" : "CART_MUTATED";
      if (current.processedCommandIds.includes(operationId)) {
        const recovered = receipt?.operationId === operationId ? receipt : await input.readReceipt?.(operationId);
        const allowed = call.name === "confirm_purchase" ? ["PURCHASE_CONFIRMED"] : call.name === "change_cart_item" ? ["CART_MUTATED"] : ["CART_OPENED", "CART_MUTATED"];
        if (!acceptReceipt(recovered, operationId, allowed)) return { status: "REJECTED", reason: "NOT_A_SUCCESS_RECEIPT" };
        await refreshSelections();
        return { status: "OK", data: { operationId, duplicate: true, cart: current.cart?.value, cartItems: cartItems() } };
      }
      policy = await input.policy();
      publicPolicyLiteral(policy, input.scope.pageId, input.scope.shopId, input.clock());
      const policyRef = { id: policy.policy.policyBundleId, version: policy.policy.policyVersion, contentHash: computeBusinessContentHash(policy.policy) };
      let draft: ResolvedCartDraftV1 | null = null, mutation: CanonicalCartMutationV2 | null = null;
      let command: SalesCycleCommand;
      if (call.name === "add_to_cart") {
        if (a.quantity !== undefined && (!Number.isInteger(a.quantity) || (a.quantity as number) < 1 || (a.quantity as number) > 20)) return { status: "REJECTED", reason: "QUANTITY" };
        const result = await selection(product!.ref, a, commerceUuid(operationId), a.offerType as string);
        if (result.status !== "READY") return { status: "UNAVAILABLE", reason: "SELECTION_UNAVAILABLE", data: result };
        const selected = result.line;
        if (!current.cart) {
          draft = { identity: input.identity, lines: [selected], shopId: input.scope.shopId, policyRef };
          command = { kind: "CART_OPENED", commandId: operationId, cartDraftRef: { id: operationId, version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(input.clock().getTime()+1_800_000).toISOString() };
        } else mutation = { kind: "ADD_LINE", line: selected };
      } else if (call.name === "change_cart_item") {
        if (a.action === "REMOVE_LINE") mutation = { kind: "REMOVE_LINE", lineId: line!.lineId };
        else if (a.action === "SET_QUANTITY" && Number.isInteger(a.quantity) && (a.quantity as number) > 0 && (a.quantity as number) <= 20) mutation = { kind: "SET_QUANTITY", lineId: line!.lineId, quantity: a.quantity as number };
        else if (a.action === "SET_COMPONENT_VARIANT" && (typeof a.size === "string" || typeof a.color === "string")) {
          const component = line!.components.find(c => c.componentRole === a.componentRole);
          if (!component) return { status: "REJECTED", reason: "COMPONENT_REF" };
          const result = await selection(line!.parentProductId, { ...a, size: a.size ?? component.size, color: a.color ?? component.color, quantity: line!.quantity }, line!.lineId, line!.offerId);
          if (result.status !== "READY") return { status: "UNAVAILABLE", reason: "SELECTION_UNAVAILABLE", data: result };
          const selected = result.line;
          const variant = selected.components.find(c => c.componentProductId === component.componentProductId);
          if (!variant || variant.size === null || normalizeCatalogToken(variant.size) !== normalizeCatalogToken(String(a.size ?? component.size ?? "")) ||
            normalizeCatalogToken(variant.color ?? "") !== normalizeCatalogToken(String(a.color ?? component.color ?? ""))) return { status: "REJECTED", reason: "VARIANT_UNAVAILABLE" };
          mutation = { kind: "SET_COMPONENT_VARIANT", lineId: line!.lineId, componentProductId: component.componentProductId,
            componentSku: variant.componentSku, size: variant.size!, color: variant.color };
        } else return { status: "REJECTED", reason: "MUTATION_ARGUMENTS" };
      }
      if (mutation) command = { kind: "CART_MUTATED", commandId: operationId, expectedCartVersion: current.cart!.value.revision,
        mutationRef: { id: operationId, version: "1", contentHash: computeBusinessContentHash({ mutation }) }, mutationReasonCode: mutation.kind === "ADD_LINE" ? "LINE_ADDED" : mutation.kind === "REMOVE_LINE" ? "LINE_REMOVED" : mutation.kind === "SET_COMPONENT_VARIANT" ? "VARIANT_CHANGED" : "QUANTITY_CHANGED" };
      else if (call.name === "confirm_purchase") command = { kind: "CONFIRM_PURCHASE", commandId: operationId,
        intent: { source: "MODEL_STRUCTURED_OUTPUT", intent: "PURCHASE_CONFIRMATION", sourceMessageId: input.scope.sourceMessageId } };
      const ports: SalesCycleTrustedPortsV1 = {
        resolveCartDraft: r => draft && r.contentHash === computeBusinessContentHash(draft) ? draft : null,
        resolveCartMutation: r => mutation && r.contentHash === computeBusinessContentHash({ mutation }) ? { mutation } : null,
        resolveShopPolicy: r => policy && r.contentHash === computeBusinessContentHash(policy.policy) ? policy.policy : null,
        resolveInboundMessage: id => input.trustedPorts?.resolveInboundMessage(id) ?? null,
        revalidateCheckout: q => input.trustedPorts?.revalidateCheckout(q) ?? null,
      };
      let result, reconciledRevision: number | undefined;
      const repository: SalesCycleStateRepositoryV1 = { read: key => input.repository.read(key),
        compareAndSwap: update => update.expectedRevision === authorizedRevision
          ? input.repository.compareAndSwap(update) : Promise.resolve(false) };
      try { commitAttempted = true; result = input.executeCommand
        ? await input.executeCommand({ command: command!, expectedRevision: authorizedRevision,
          conversationRevision: authority?.revision ?? input.scope.revision,
          bindingVersion: authority?.bindingVersion ?? input.scope.bindingVersion, trustedPorts: ports, policy })
        : await executePersistedSalesCycleCommand({ repository, conversationKey: input.conversationKey,
        command: command!, now: input.clock(), trustedPorts: ports,
        ...(input.resolveBankTransferPolicy ? { resolveBankTransferPolicy: input.resolveBankTransferPolicy } : {}) }); }
      catch { current = await read(); await refreshAuthority();
        const proved = input.executeCommand && input.readReceipt ? acceptReceipt(await input.readReceipt(operationId), operationId, [effectName]) : recordReceipt(operationId, effectName, authorizedRevision+1);
        if (!proved) { uncertain = true; return { status: "UNAVAILABLE", reason: "UNKNOWN_COMMIT" }; }
        reconciledRevision = current.revision;
      }
      if (result?.status === "CHECKOUT_REQUESTED") {
        current = await read(); await refreshAuthority();
        if (call.name !== "confirm_purchase" || current.confirmation !== null ||
            current.clarification?.reasonCode !== "CHECKOUT_DETAILS_MISSING" ||
            current.revision !== authorizedRevision+1 || !current.processedCommandIds.includes(operationId) ||
            commerceHash(current) !== commerceHash(result.state)) {
          uncertain = true; return { status: "UNAVAILABLE", reason: "CHECKOUT_COMMIT_UNPROVED" };
        }
        committedTerminal = { reason: "CHECKOUT_DETAILS_MISSING", disposition: "NO_SEND", revision: current.revision,
          operationId, conversationRevision: authority?.revision ?? input.scope.revision };
        receipt = undefined;
        return { status: "OK", data: { checkoutRequested: true, purchaseConfirmed: false, externalOrderCreated: false } };
      }
      if (result?.status === "HANDOFF") {
        current = await read(); await refreshAuthority();
        if (current.stage !== "HANDED_OFF" || current.revision !== authorizedRevision+1 ||
          !current.processedCommandIds.includes(operationId) || commerceHash(current) !== commerceHash(result.state)) {
          uncertain = true; return { status: "UNAVAILABLE", reason: "HANDOFF_COMMIT_UNPROVED" };
        }
        committedTerminal = { reason: result.reasonCode, revision: current.revision, operationId,
          conversationRevision: authority?.revision ?? input.scope.revision };
        receipt = undefined;
        return { status: "OK", data: { handoffAccepted: true } };
      }
      if (result && !["APPLIED", "DUPLICATE"].includes(result.status)) return { status: "REJECTED", reason: "reasonCode" in result ? result.reasonCode : result.status };
      current = await read();
      await refreshAuthority();
      if (reconciledRevision !== undefined ? current.revision !== reconciledRevision : !recordReceipt(operationId, effectName, result?.status === "APPLIED" && input.executeCommand ? result.state.revision : authorizedRevision+1)) { uncertain = true; return { status: "UNAVAILABLE", reason: "RECEIPT_UNAVAILABLE" }; }
      await refreshSelections();
      if (result?.status === "APPLIED" && result.transferToHuman) committedTerminal = {
        reason: "PURCHASE_CONFIRMED", revision: current.revision, operationId, conversationRevision: authority?.revision ?? input.scope.revision };
      return { status: "OK", data: { operationId, effect: effectName, cart: current.cart?.value, cartItems: cartItems(),
        purchaseConfirmed: current.confirmation !== null, externalOrderCreated: false } };
    } catch { if (commitAttempted) uncertain = true; return { status: "UNAVAILABLE", reason: "COMMERCE_UNAVAILABLE" }; }
  }
  async function invoke(call: CommerceToolCall): Promise<CommerceToolResult> {
    const result = await invokeEffect(call);
    if (names.has(call.name) && result.status !== "OK") failedEffect = true;
    return result;
  }
  // Establish current evidence before the owner/verifier sees this turn, including existing carts on later turns.
  await refreshSelections();
  return { invoke, snapshot, terminalOutcome, async invokeBatch(calls) {
    const independent = calls.filter(c => !names.has(c.name) && c.name !== "quote_cart");
    const results = new Map<CommerceToolCall, CommerceToolResult>();
    const readResults = await input.base.invokeBatch(independent); independent.forEach((c, i) => results.set(c, readResults[i]!));
    const stateRejected = independent.some(c => c.name === "apply_customer_state" && results.get(c)!.status !== "OK");
    for (const c of calls.filter(c => names.has(c.name))) results.set(c, stateRejected ? { status: "REJECTED", reason: "DEPENDENT_STATE_REJECTED" } : await invoke(c));
    const effectRejected = calls.some(c => names.has(c.name) && results.get(c)!.status !== "OK");
    for (const c of calls.filter(c => c.name === "quote_cart")) results.set(c, effectRejected ? { status: "REJECTED", reason: "DEPENDENT_EFFECT_REJECTED" } : await input.base.invoke(c));
    return calls.map(c => results.get(c)!);
  }, async readback() { await input.base.readback(); current = await read(); await refreshAuthority(); if (policy) policy = await input.policy();
    await refreshSelections();
    return snapshot(); },
  async recover(outcome: TerminalOutcome) {
    if (outcome.disposition === "NO_SEND") return outcome;
    const handoff = await terminalOutcome(); if (handoff) return handoff;
    if (input.base.snapshot().state.customerStateUpdatePending === true) return outcome;
    if (receipt && failedEffect) return { disposition: "HANDOFF", reason: uncertain ? "UNKNOWN_COMMIT" : "PARTIAL_EFFECT", text: null, fallbackId: null };
    if (!receipt) return uncertain ? { disposition: "HANDOFF", reason: "UNKNOWN_COMMIT", text: null, fallbackId: null } : outcome;
    await input.base.readback(); await refreshSelections();
    let recoveryPolicy: RuntimePolicyBundle | null = null;
    try { recoveryPolicy = await input.policy(); } catch { /* A proved receipt can still acknowledge the commit without a current quote. */ }
    current = await read(); await refreshAuthority(); const world = snapshot();
    if (!world.effectReceipts.some(r => r.ref === receipt!.ref) || !world.state.permission || !world.state.privacyAllowed || world.state.conversationOwner !== "BOT" ||
      world.state.recipient !== receipt.recipient || world.state.conversationRevision !== receiptConversationRevision || world.state.bindingVersion !== receiptBindingVersion ||
      current.revision !== receipt.stateRevision || !current.processedCommandIds.includes(receipt.operationId) || Date.parse(receipt.expiresAt) <= input.clock().getTime()) return { disposition: "NO_SEND", reason: "RECOVERY_SCOPE_CHANGED", text: null, fallbackId: null };
    const cart = current.cart!.value, components = cart.lines.flatMap(line => line.components);
    const size = components[0]?.size, color = components[0]?.color;
    const cartAck = `Giỏ hiện có ${cart.lines.reduce((total, line) => total + line.quantity, 0)} sản phẩm` +
      (size && components.every(c => c.size === size) ? `, size ${size}` : "") +
      (color && components.every(c => c.color === color) ? `, màu ${color}` : "") + ".";
    let summary = "";
    const active = activeSelections(), now = input.clock();
    const policyRef = current.commerceContext?.policyRef;
    if (recoveryPolicy && policyRef?.id === recoveryPolicy.policy.policyBundleId && policyRef.version === recoveryPolicy.policy.policyVersion &&
      policyRef.contentHash === computeBusinessContentHash(recoveryPolicy.policy) &&
      selectionsMatchCartLines(cart.lines, active) && active.every(s => Date.parse(s.sourceObservedAt) <= now.getTime() && Date.parse(s.sourceExpiresAt) > now.getTime()) &&
      Date.parse(current.cart!.expiresAt) > now.getTime() && cart.grandTotalVnd !== null && cart.shippingFeeVnd !== null) {
      try {
        publicPolicyLiteral(recoveryPolicy, input.scope.pageId, input.scope.shopId, now);
        summary = ` Tổng ${cart.grandTotalVnd.toLocaleString("vi-VN")}đ, đã gồm phí giao hàng.` +
          (active.some(s => s.stockStatus === "PRE_ORDER") ? " Có món đặt trước, chị nhé." : "");
      } catch { /* No fresh policy means no current money or stock assertion. */ }
    }
    return { disposition: "SEND_ELIGIBLE", reason: summary && receipt.effect !== "PURCHASE_CONFIRMED" ? "RECEIPT_BACKED_CART_SUMMARY" : "RECEIPT_BACKED_ACK", text: receipt.effect === "PURCHASE_CONFIRMED"
      ? "Shop đã nhận xác nhận mua hàng của chị." : receipt.effect === "CART_OPENED"
        ? "Em đã thêm món chị chọn vào giỏ." + summary : cartAck + summary, fallbackId: null };
  } };
}
