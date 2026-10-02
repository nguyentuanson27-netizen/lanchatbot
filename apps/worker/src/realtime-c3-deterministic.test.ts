import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import { AT, answerPlan, deterministicRuntime, inputDelta } from "./realtime-c3-deterministic.fixture.js";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(AT)); });
afterEach(() => { vi.useRealTimers(); });

const roles = (trace: Awaited<ReturnType<ReturnType<typeof deterministicRuntime>["turn"]>>) => trace.roleCalls.map(({ role }) => role);

async function quote(runtime: ReturnType<typeof deterministicRuntime>) {
  const trace = await runtime.turn({ text: "Mẫu CB182 giá bao nhiêu?", producer: inputDelta({
    product: { operation: "SELECT", productId: "CB182", evidenceText: "CB182" },
    factQuery: { intent: "PRICE", offerType: "SET", color: null, size: null, deliveryRegion: null },
  }) });
  expect(trace.reply).toContain("799.000");
  committedOnce(trace);
  expect(roles(trace)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
  return trace;
}

describe("C3 full-runtime deterministic journeys (scripted ports only)", () => {
  it("keeps a parent price answer available with an independently verified customer variant", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    const text = "Chị chọn size M màu be.";
    const selection = await runtime.turn({ text, producer: inputDelta({
      variant: { operation: "SELECT", productId: "CB182", size: "M", color: "be", evidenceText: text },
    }), strategist: () => ({ replyAct: "ACKNOWLEDGE", proposition: "NONE", evidenceRefs: [],
      goal: "NEED: acknowledge the customer selection\nKNOWN: customer selected M\nANSWER: NONE\nLIMIT: NONE\nNEXT: NONE",
      continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" }),
      responder: { answerText: "Chị chọn M.", factualTexts: [], progressionText: null } });
    expect(selection.after.conversation.verifiedVariant).toMatchObject({ parentProductId: "CB182", selectedSizeCode: "M", selectedVariantId: "CB182-BE-M" });
    const trace = await runtime.turn({ text: "Giá mẫu CB182 là bao nhiêu?", producer: inputDelta({
      factQuery: { intent: "PRICE", offerType: "SET", color: null, size: null, deliveryRegion: null },
    }), strategist: answerPlan() });
    runtime.save("parent-price-selected-variant");
    committedOnce(selection);
    committedOnce(trace);
    expect(trace.reply).toContain("799.000");
    expect(trace.after.conversation.conversationOwner).toBe("BOT");
    expect(trace.after.commerce.cart).toBeNull();
    expect(trace.after.conversation.verifiedVariant).toEqual(selection.after.conversation.verifiedVariant);
    expect(roles(trace)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    expect(runtime.model.generate).not.toHaveBeenCalled();
  });
});


type Runtime = ReturnType<typeof deterministicRuntime>;
type Trace = Awaited<ReturnType<Runtime["turn"]>>;
function committedOnce(trace: Trace) {
  expect(trace.processed).toBe(true);
  expect(trace.planned).toHaveLength(1);
  expect(trace.committed).toHaveLength(1);
  const { input, receipt } = trace.committed[0]!;
  expect(input).toEqual(trace.planned[0]);
  expect(receipt).toEqual({ stateCommitted: true,
    metaOutboxCreated: input.metaPlan?.messages.length ?? 0,
    pancakeTagOutboxCreated: input.pancakeTagPlan !== undefined,
    handoffEventCreated: input.handoffEventPlan !== undefined,
    sendAuthorized: input.metaPlan !== undefined, reasonCodes: [], inboxBatchStatus: "COMMITTED" });
  for (const claims of [input.metaPlan?.protectedClaims ?? [],
    ...(input.salesCyclePlan?.effectClaimSets?.map(({ claims }) => claims) ?? [])]) {
    for (const claim of claims) expect(claim.authorization).toBe("NONE");
  }
  expect(trace.after.conversation).toEqual(input.state);
  expect(trace.after.commerce).toEqual(input.salesCyclePlan?.state ?? trace.before.commerce);
  expect(trace.inboxEvents.some(({ kind }) => kind === "FAILED_PERMANENT" || kind === "RETRY")).toBe(false);
}
function buy(text: string, size: string, operation = "SELECT", color: string | null = "be") {
  const empty = noCustomerSelection();
  return { ...empty,
    variant: { operation, productId: "CB182", size, color, evidenceText: text },
    salesSignals: { ...empty.salesSignals, buyingIntent: { decision: "COMMITTED", requestedAction: "OPEN_CART",
      quantity: 1, evidenceText: text, confidence: 0.99 } },
  };
}
async function openCart(runtime: Runtime, size = "M") {
  const text = `Ch\u1ecb l\u1ea5y m\u1ed9t b\u1ed9 CB182 size ${size} m\u00e0u be.`;
  const trace = await runtime.turn({ text, producer: buy(text, size) });
  expect(trace.after.commerce.stage).toBe("CART_OPEN");
  expect(trace.after.commerce.cart?.value.lines).toHaveLength(1);
  expect(roles(trace)).toEqual(["PRODUCER"]);
  committedOnce(trace);
  return trace;
}
function cartSizes(trace: Trace) {
  return trace.after.commerce.cart?.value.lines.flatMap((line) => line.components.map(({ size }) => size));
}

describe("canonical buying and checkout journeys with real Producer validation", () => {
  it("preserves purchase plus policy and keeps the policy answer before checkout input", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    const purchase = "Ch\u1ecb l\u1ea5y m\u1ed9t b\u1ed9 CB182 size M m\u00e0u be.";
    const text = `${purchase} Shop cho m\u1eb7c th\u1eed kh\u00f4ng?`;
    const trace = await runtime.turn({ text, producer: { ...buy(purchase, "M"), policyQuestion: "TRY_ON" } });
    runtime.save("purchase-policy");
    committedOnce(trace);
    expect(trace.reply).toContain("ch\u01b0a h\u1ed7 tr\u1ee3 m\u1eb7c th\u1eed");
    expect(trace.reply).toContain("th\u00f4ng tin");
    expect(trace.after.commerce.stage).toBe("CART_OPEN");
    expect(cartSizes(trace)).toEqual(["M", "M"]);
    expect(trace.after.commerce.checkoutDraft).toBeNull();
    expect(trace.after.conversation.conversationOwner).toBe("BOT");
    expect(roles(trace)).toEqual(["PRODUCER"]);
    expect(runtime.model.generate).not.toHaveBeenCalled();
  });

  it("corrects an existing variant and purchases only the corrected size", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    const original = await openCart(runtime);
    const text = "\u0110\u1ed5i sang L, ch\u1ecb l\u1ea5y m\u1ed9t b\u1ed9 nh\u00e9.";
    const trace = await runtime.turn({ text, producer: buy(text, "L", "CHANGE", null) });
    runtime.save("variant-correction-purchase");
    committedOnce(trace);
    expect(trace.after.commerce.cart?.value.cartId).toBe(original.after.commerce.cart?.value.cartId);
    expect(trace.after.commerce.cart?.value.lines).toHaveLength(1);
    expect(cartSizes(trace)).toEqual(["L", "L"]);
    expect(trace.after.commerce.cart!.value.revision).toBeGreaterThan(original.after.commerce.cart!.value.revision);
    expect(trace.after.conversation.verifiedVariant).toMatchObject({ selectedSizeCode: "L", selectedColorLabel: "BE" });
    expect(trace.reply).toContain("L");
    expect(roles(trace)).toEqual(["PRODUCER"]);
  });

  it("buys M while answering stock for S without transferring the question into cart authority", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    const purchase = "Ch\u1ecb l\u1ea5y m\u1ed9t b\u1ed9 size M m\u00e0u be.";
    const text = `${purchase} Size S c\u00f2n kh\u00f4ng?`;
    const trace = await runtime.turn({ text, producer: { ...buy(purchase, "M"),
      factQuery: { intent: "STOCK", offerType: "SET", color: "be", size: "S", deliveryRegion: null },
    } });
    runtime.save("selection-m-stock-s");
    committedOnce(trace);
    expect(cartSizes(trace)).toEqual(["M", "M"]);
    expect(trace.reply).toContain("size S");
    expect(trace.reply).toContain("h\u1ebft h\u00e0ng");
    expect(trace.after.conversation.verifiedVariant?.selectedSizeCode).toBe("M");
    expect(roles(trace)).toEqual(["PRODUCER"]);
    expect(trace.after.commerce.stage).toBe("CART_OPEN");
  });

  it("does not open a cart or approve a conditional lower-price offer", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    const text = "N\u1ebfu 625k th\u00ec ch\u1ecb l\u1ea5y.";
    const empty = noCustomerSelection();
    const trace = await runtime.turn({ text, producer: { ...empty,
      factQuery: { ...empty.factQuery, intent: "PRICE", offerType: "SET" },
      salesSignals: { ...empty.salesSignals, buyingIntent: { decision: "CONSIDERING", requestedAction: "NONE",
        quantity: null, evidenceText: text, confidence: 0.99 } },
    }, strategist: (input) => ({ ...answerPlan()(input), goal: answerPlan()(input).goal.replace("KNOWN: NONE", "KNOWN: customer proposed 625k") }), responder: {
      answerText: "Em ch\u01b0a th\u1ec3 x\u00e1c nh\u1eadn gi\u00e1 625k ch\u1ecb \u0111\u1ec1 xu\u1ea5t.", factualTexts: [], progressionText: null,
    } });
    runtime.save("conditional-lower-price");
    committedOnce(trace);
    expect(trace.reply).toBe("Em ch\u01b0a th\u1ec3 x\u00e1c nh\u1eadn gi\u00e1 625k ch\u1ecb \u0111\u1ec1 xu\u1ea5t. Gi\u00e1 hi\u1ec7n t\u1ea1i c\u1ee7a m\u1eabu n\u00e0y l\u00e0 799.000\u0111 \u1ea1.");
    expect(trace.after.commerce.cart).toBeNull();
    expect(trace.after.commerce.checkoutDraft).toBeNull();
    expect(trace.after.conversation.conversationOwner).toBe("BOT");
    expect(roles(trace)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
  });

  it("collects private details, previews, then confirms only the current cart and does not duplicate an Inbox effect", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    const opened = await openCart(runtime);
    const empty = noCustomerSelection();
    const name = "An Demo", phone = "0900000000", address = "123 \u0110\u01b0\u1eddng M\u1eabu, H\u1ed9i An";
    const details = `T\u00ean: ${name}\nS\u0110T: ${phone}\n\u0110\u1ecba ch\u1ec9: ${address}\nCh\u1ecb ch\u1ecdn COD`;
    const field = (value: string) => ({ value, evidenceText: details, confidence: 0.99 });
    const preview = await runtime.turn({ text: details, producer: { ...empty, salesSignals: { ...empty.salesSignals,
      checkoutExtraction: { fullName: field(name), phone: field(phone), address: field(address), paymentMethod: field("COD") },
    } } });
    runtime.save("checkout-preview-confirmation");
    committedOnce(preview);
    expect(preview.after.commerce.stage).toBe("ORDER_PREVIEW");
    expect(preview.after.commerce.cart?.value.cartId).toBe(opened.after.commerce.cart?.value.cartId);
    expect(preview.reply).toContain("COD");
    expect(preview.reply).toContain("829.000");
    expect(roles(preview)).toEqual(["PRODUCER"]);
    // Only the private extraction boundary may read raw latest recipient input.
    // History, Strategist/Responder and durable analytics remain redacted.
    for (const sensitive of [phone, address]) {
      expect(JSON.stringify(preview.roleCalls.filter(({ role }) => role !== "PRODUCER"))).not.toContain(sensitive);
      expect(JSON.stringify(preview.roleCalls[0]?.input.history)).not.toContain(sensitive);
      expect(JSON.stringify(preview.planned[0]?.decisionEvents)).not.toContain(sensitive);
    }
    const text = "\u0110\u00fang th\u00f4ng tin, ch\u1ed1t \u0111\u01a1n gi\u00fap ch\u1ecb.";
    const confirmation = { text, producer: { ...empty, salesSignals: { ...empty.salesSignals,
      purchaseConfirmation: { decision: "CONFIRM", evidenceText: text, confidence: 0.99 },
    } } };
    const confirmed = await runtime.turn(confirmation);
    runtime.save("checkout-preview-confirmation");
    committedOnce(confirmed);
    expect(confirmed.after.commerce.stage).toBe("PURCHASE_CONFIRMED");
    expect(confirmed.after.commerce.cart?.value.cartId).toBe(opened.after.commerce.cart?.value.cartId);
    expect(roles(confirmed)).toEqual(["PRODUCER"]);
    const duplicate = await runtime.turn(confirmation, true);
    runtime.save("checkout-preview-confirmation");
    expect(duplicate.processed).toBe(false);
    expect(duplicate.reply).toBe("");
    expect(duplicate.planned).toEqual([]);
    expect(duplicate.committed).toEqual([]);
    expect(roles(duplicate)).toEqual([]);
    expect(duplicate.after).toEqual(confirmed.after);
  });

  it.each(["HUMAN", "POST_SALE"] as const)("hands off %s with a cart without touching that cart or issuing sales output afterward", async (route) => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    await openCart(runtime);
    const text = route === "HUMAN" ? "Cho ch\u1ecb g\u1eb7p nh\u00e2n vi\u00ean."
      : "Ch\u1ecb mu\u1ed1n ho\u00e0n ti\u1ec1n \u0111\u01a1n \u0111\u00e3 nh\u1eadn.";
    const handoff = await runtime.turn({ text, producer: inputDelta({ route, routeEvidence: text }) });
    runtime.save(`handoff-${route.toLowerCase().replace("_", "-")}`);
    committedOnce(handoff);
    expect(handoff.after.commerce).toEqual(handoff.before.commerce);
    expect(handoff.after.conversation.conversationOwner).toBe("HUMAN");
    expect(handoff.committed[0]?.receipt.handoffEventCreated).toBe(true);
    expect(roles(handoff)).toEqual(["PRODUCER"]);
    const later = await runtime.turn({ text: "Ch\u1ecb l\u1ea5y size L, COD nh\u00e9." });
    runtime.save(`handoff-${route.toLowerCase().replace("_", "-")}`);
    expect(later.after.commerce).toEqual(handoff.after.commerce);
    expect(later.reply).toBe("");
    expect(roles(later)).toEqual([]);
    expect(later.planned.every((plan) => plan.salesCyclePlan === undefined && plan.metaPlan === undefined)).toBe(true);
  });
});


const wrinkleReply = "Em ch\u01b0a c\u00f3 th\u00f4ng tin x\u00e1c nh\u1eadn v\u1ec1 kh\u1ea3 n\u0103ng ch\u1ed1ng nh\u0103n. Gi\u00e1 hi\u1ec7n t\u1ea1i c\u1ee7a m\u1eabu n\u00e0y l\u00e0 799.000\u0111 \u1ea1.";
const wrinkleText = "Gi\u00e1 bao nhi\u00eau v\u00e0 c\u00f3 ch\u1ed1ng nh\u0103n kh\u00f4ng?";
const priceQuery = { intent: "PRICE" as const, offerType: "SET" as const, color: null, size: null, deliveryRegion: null };
function wrinkleTurn(failure: "NONE" | "TRANSPORT" | "JSON" | "GUARD" = "NONE") {
  return { text: wrinkleText, producer: inputDelta({ factQuery: priceQuery }),
    strategist: answerPlan("PRICE", "wrinkle resistance not verified", "price and wrinkle resistance"),
    responder: { answerText: failure === "GUARD" ? "Em ch\u01b0a c\u00f3 th\u00f4ng tin v\u1ec1 \u0111\u1ed9 m\u1ecbn."
      : "Em ch\u01b0a c\u00f3 th\u00f4ng tin x\u00e1c nh\u1eadn v\u1ec1 kh\u1ea3 n\u0103ng ch\u1ed1ng nh\u0103n.", factualTexts: [], progressionText: null },
    ...(failure === "TRANSPORT" || failure === "JSON" ? { responderFailure: failure } : {}),
    attemptCount: 5,
  };
}

describe("evidence and bounded recovery journeys", () => {
  it.each(["NONE", "TRANSPORT", "JSON", "GUARD"] as const)("retains price and unsupported wrinkle on %s without another call or mutation", async (failure) => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    const trace = await runtime.turn(wrinkleTurn(failure));
    runtime.save(`price-wrinkle-${failure.toLowerCase()}`);
    committedOnce(trace);
    expect(trace.reply).toBe(wrinkleReply);
    expect(trace.after.commerce.cart).toEqual(trace.before.commerce.cart);
    expect(trace.after.commerce.checkoutDraft).toEqual(trace.before.commerce.checkoutDraft);
    expect(trace.after.conversation.currentProductId).toBe("CB182");
    expect(trace.after.conversation.conversationOwner).toBe("BOT");
    expect(roles(trace)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    expect(trace.committed[0]?.receipt.handoffEventCreated).toBe(false);
    if (failure !== "NONE") expect(JSON.stringify(trace.planned[0]?.decisionEvents)).toContain("C3_SELECTED_FACTS_RECOVERY");
    expect(trace.inboxEvents).not.toContainEqual(expect.objectContaining({ kind: "FAILED_PERMANENT" }));
    expect(trace.historyAfter.filter(({ direction }) => direction === "OUTBOUND").at(-1)?.text).toBe(wrinkleReply);
  });

  it("searches within the updated budget and excludes prior/current rejected products", async () => {
    const runtime = deterministicRuntime();
    await runtime.turn({ text: "M\u1eabu SV9031 gi\u00e1 bao nhi\u00eau?", producer: inputDelta({
      product: { operation: "SELECT", productId: "SV9031", evidenceText: "SV9031" }, factQuery: priceQuery,
    }) });
    const reject = "Kh\u00f4ng ch\u1ecdn m\u1eabu n\u00e0y. T\u00ecm m\u1eabu kh\u00e1c, ng\u00e2n s\u00e1ch 800k.";
    const first = await runtime.turn({ text: reject, producer: inputDelta({
      product: { operation: "CURRENT", productId: null, evidenceText: null },
      obligations: [
        { kind: "PRODUCT_REJECT", capability: null, scope: null,
          productId: null, evidenceText: "Kh\u00f4ng ch\u1ecdn m\u1eabu n\u00e0y" },
        { kind: "PRODUCT_SEARCH", capability: null, scope: null,
          productId: null, evidenceText: "T\u00ecm m\u1eabu kh\u00e1c" },
      ],
      budget: { operation: "SET", value: 800_000, evidenceText: "ng\u00e2n s\u00e1ch 800k" }, factQuery: priceQuery,
    }) });
    runtime.save("alternatives-budget-rejections");
    expect(first.after.conversation.currentProductId).toBe("CB182");
    committedOnce(first);
    const text = "M\u1eabu kh\u00e1c n\u1eefa, ng\u00e2n s\u00e1ch 650k.";
    const trace = await runtime.turn({ text, producer: inputDelta({
      product: { operation: "CURRENT", productId: null, evidenceText: null },
      obligations: [
        { kind: "PRODUCT_REJECT", capability: null, scope: null,
          productId: null, evidenceText: "M\u1eabu kh\u00e1c n\u1eefa" },
        { kind: "PRODUCT_SEARCH", capability: null, scope: null,
          productId: null, evidenceText: "M\u1eabu kh\u00e1c n\u1eefa" },
      ],
      budget: { operation: "SET", value: 650_000, evidenceText: "ng\u00e2n s\u00e1ch 650k" }, factQuery: priceQuery,
    }) });
    runtime.save("alternatives-budget-rejections");
    committedOnce(trace);
    expect(runtime.search.searchAlternatives).toHaveBeenLastCalledWith(expect.stringContaining("650000"), ["SV9031", "CB182"]);
    expect(trace.after.conversation.sessionDecisionContext).toMatchObject({ budgetVnd: 650_000, rejectedProductIds: ["SV9031", "CB182"] });
    expect(trace.after.conversation.currentProductId).toBe("SD12");
    expect(trace.reply).toContain("599.000");
    expect(trace.reply).not.toMatch(/799\.000|699\.000/);
    expect(trace.after.commerce.cart).toBeNull();
    expect(roles(trace)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    expect(trace.lookups.some(({ query, result }) => query.productId === "SD12" && result?.status === "OK")).toBe(true);
  });

  it("compares compatible offer prices through code rather than writer arithmetic", async () => {
    const runtime = deterministicRuntime({ multiFact: true });
    await quote(runtime);
    const trace = await runtime.turn({ text: "So s\u00e1nh gi\u00e1 CB182 v\u00e0 SV9031 gi\u00fap ch\u1ecb.",
      producer: inputDelta({ factQuery: priceQuery }), strategist: answerPlan("PRODUCT_COMPARISON") });
    runtime.save("compatible-price-comparison");
    committedOnce(trace);
    expect(trace.reply).toContain("100.000");
    expect(trace.reply).toContain("CB182");
    expect(trace.reply).toContain("SV9031");
    expect(trace.reply).toContain("th\u1ea5p h\u01a1n");
    expect(trace.reply).not.toMatch(/nh\u1eb9 h\u01a1n|\u0111\u00e1ng ti\u1ec1n/i);
    expect(trace.after.commerce.cart).toBeNull();
    expect(trace.after.commerce.checkoutDraft).toBeNull();
    expect(trace.after.conversation.conversationOwner).toBe("BOT");
    expect(roles(trace)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    expect(trace.lookups.map(({ query }) => query.productId)).toEqual(["CB182", "SV9031"]);
  });

  it("resumes an unanswered property after a correction in a bounded long history", async () => {
    const runtime = deterministicRuntime();
    const first = "M\u1eabu SV9031 gi\u00e1 bao nhi\u00eau? Ng\u00e2n s\u00e1ch 650k.";
    await runtime.turn({ text: first, producer: inputDelta({
      product: { operation: "SELECT", productId: "SV9031", evidenceText: "SV9031" }, factQuery: priceQuery,
      budget: { operation: "SET", value: 650_000, evidenceText: "Ng\u00e2n s\u00e1ch 650k" },
    }) });
    // Safe persisted history input is seeded at the external history port only.
    // The Producer and C3 still receive the real runtime's bounded/redacted read.
    for (let n = 0; n < 34; n += 1) runtime.historyValues.push({
      direction: n % 2 === 0 ? "INBOUND" : "OUTBOUND", senderType: n % 2 === 0 ? "CUSTOMER" : "BOT",
      messageType: "TEXT", attachmentCount: 0, occurredAt: AT,
      identityKey: `historical:${n}`, text: n === 0 ? "OUTSIDE_WINDOW_SENTINEL" : `Historical supporting message ${n}`,
    });
    const question = "M\u1eabu \u0111\u00f3 ch\u1ea5t li\u1ec7u g\u00ec?";
    runtime.historyValues.push({ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT", attachmentCount: 0,
      occurredAt: AT, identityKey: "pending:question", text: question });
    runtime.historyValues.push({ direction: "OUTBOUND", senderType: "BOT", messageType: "TEXT", attachmentCount: 0,
      occurredAt: AT, identityKey: "pending:clarification", text: "Ch\u1ecb \u0111ang h\u1ecfi m\u00e3 n\u00e0o?" });
    const trace = await runtime.turn({ text: "\u00dd ch\u1ecb CB182.", producer: inputDelta({
      product: { operation: "SELECT", productId: "CB182", evidenceText: "CB182" },
    }), strategist: answerPlan("PRODUCT_ATTRIBUTES", "NONE", "Answer pending material question on corrected CB182") });
    runtime.save("long-history-correction");
    committedOnce(trace);
    expect(trace.after.conversation.currentProductId).toBe("CB182");
    expect(trace.after.conversation.sessionDecisionContext?.budgetVnd).toBe(650_000);
    expect(trace.reply.toLowerCase()).toContain("cotton");
    expect(trace.reply).not.toContain("SV9031");
    expect(trace.after.commerce.cart).toBeNull();
    expect(roles(trace)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    const strategist = trace.roleCalls.find(({ role }) => role === "STRATEGIST")!.input;
    expect(strategist.dialogue?.length).toBeLessThanOrEqual(32);
    expect(JSON.stringify(strategist)).toContain(question);
    expect(JSON.stringify(strategist)).not.toContain("OUTSIDE_WINDOW_SENTINEL");
    expect(strategist.dialogue?.at(-1)?.text).toBe(trace.input);
  });

  it("keeps an independent price when the stock lookup fails without authorizing missing stock", async () => {
    const runtime = deterministicRuntime({ multiFact: true });
    await quote(runtime);
    runtime.failures.add("CB182:STOCK");
    const trace = await runtime.turn({ text: "CB182 gi\u00e1 bao nhi\u00eau, c\u00f2n h\u00e0ng kh\u00f4ng?",
      producer: inputDelta({ factQuery: priceQuery }), strategist: answerPlan("PRICE", "stock not verified", "price and stock"),
      responder: { answerText: "Em ch\u01b0a x\u00e1c nh\u1eadn \u0111\u01b0\u1ee3c \u0111\u1ea7y \u0111\u1ee7 th\u00f4ng tin ch\u1ecb h\u1ecfi.", factualTexts: [], progressionText: null },
    });
    runtime.save("partial-lookup");
    committedOnce(trace);
    expect(trace.reply).toContain("799.000");
    expect(trace.after.conversation.conversationOwner).toBe("BOT");
    expect(trace.after.commerce.cart).toBeNull();
    expect(trace.committed[0]?.input.metaPlan?.protectedClaimTypes).toEqual(["PRICE"]);
    expect(trace.reply).not.toMatch(/h\u1ebft h\u00e0ng|\u0111ang c\u00f3 h\u00e0ng/);
    expect(trace.lookups.map(({ query }) => query.intent)).toEqual(["PRICE", "STOCK"]);
    expect(roles(trace)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
  });

  it.each(["THROW", "SUPERSEDED"] as const)("does not publish or persist attempted recovery on %s commit failure", async (commitFailure) => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    const request = { ...wrinkleTurn("GUARD"), attemptCount: 1 };
    const failed = await runtime.turn({ ...request, commitFailure });
    runtime.save(`commit-${commitFailure.toLowerCase()}`);
    expect(failed.reply).toBe("");
    expect(failed.after).toEqual(failed.before);
    expect(failed.planned).toHaveLength(1);
    expect(failed.committed).toEqual([]);
    expect(roles(failed)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    expect(failed.historyAfter.filter(({ direction }) => direction === "OUTBOUND"))
      .toEqual(failed.historyBefore.filter(({ direction }) => direction === "OUTBOUND"));
    if (commitFailure === "THROW") {
      expect(failed.receipts).toEqual([]);
      expect(failed.inboxEvents).toContainEqual({ kind: "RETRY", reason: "REALTIME_PROCESSING_FAILED" });
      const retried = await runtime.turn({ ...request, attemptCount: 2 }, true);
      runtime.save("commit-throw");
      committedOnce(retried);
      expect(retried.reply).toBe(wrinkleReply);
      const duplicate = await runtime.turn(request, true);
      runtime.save("commit-throw");
      expect(duplicate.after).toEqual(retried.after);
      expect(duplicate.committed).toEqual([]);
      expect(roles(duplicate)).toEqual([]);
    } else {
      expect(failed.receipts).toEqual([{ stateCommitted: false, metaOutboxCreated: 0, pancakeTagOutboxCreated: false,
        handoffEventCreated: false, sendAuthorized: false, reasonCodes: ["INBOX_BATCH_SUPERSEDED"], inboxBatchStatus: "SUPERSEDED" }]);
    }
  });
});


describe("adversarial freshness, isolation and atomicity controls", () => {
  it.each(["PRICE", "STOCK"] as const)("preserves the other independent fact when %s fails, including a failed commit retry", async (failedFact) => {
    const runtime = deterministicRuntime({ multiFact: true });
    await quote(runtime);
    runtime.failures.add(`CB182:${failedFact}`);
    const supported = failedFact === "PRICE" ? "STOCK" : "PRICE";
    const request = { text: "CB182 gi\u00e1 bao nhi\u00eau, c\u00f2n h\u00e0ng kh\u00f4ng?", producer: inputDelta({ factQuery: priceQuery }),
      strategist: answerPlan(supported, `${failedFact.toLowerCase()} unavailable`, "price and stock"),
      responder: { answerText: "Em ch\u01b0a x\u00e1c nh\u1eadn \u0111\u01b0\u1ee3c \u0111\u1ea7y \u0111\u1ee7 th\u00f4ng tin ch\u1ecb h\u1ecfi.", factualTexts: [], progressionText: null },
    };
    const failed = await runtime.turn({ ...request, commitFailure: "THROW" });
    runtime.save(`partial-${failedFact.toLowerCase()}-commit`);
    expect(failed.after).toEqual(failed.before);
    expect(failed.reply).toBe("");
    expect(failed.committed).toEqual([]);
    expect(failed.lookups.find(({ query }) => query.intent === failedFact)?.error).toBe("SYNTHETIC_LOOKUP_PORT_UNAVAILABLE");
    expect(roles(failed)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    const success = await runtime.turn({ ...request, attemptCount: 2 }, true);
    runtime.save(`partial-${failedFact.toLowerCase()}-commit`);
    committedOnce(success);
    expect(success.reply).toContain(failedFact === "PRICE" ? "c\u00f2n h\u00e0ng" : "799.000");
    expect(success.after.conversation.conversationOwner).toBe("BOT");
    expect(success.after.commerce.cart).toBeNull();
    expect(success.planned[0]?.metaPlan?.protectedClaimTypes).toEqual([supported]);
    expect(success.lookups).toHaveLength(2);
    expect(roles(success)).toEqual(["PRODUCER", "STRATEGIST", "RESPONDER"]);
    expect(success.historyAfter.filter(({ identityKey }) => identityKey === "accepted:2")).toHaveLength(1);
  });

  it.each(["ALL_FAILED", "STALE_SIBLING"] as const)("keeps %s fail-closed rather than waiving provenance to enable partial output", async (mode) => {
    const runtime = deterministicRuntime({ multiFact: true });
    await quote(runtime);
    runtime.failures.add("CB182:STOCK");
    if (mode === "ALL_FAILED") runtime.failures.add("CB182:PRICE");
    else runtime.snapshots.set("CB182", { ...runtime.snapshots.get("CB182")!, synced_at: "2026-09-01T00:00:00.000Z" });
    const trace = await runtime.turn({ text: "CB182 gi\u00e1 bao nhi\u00eau, c\u00f2n h\u00e0ng kh\u00f4ng?", producer: inputDelta({ factQuery: priceQuery }) });
    runtime.save(`lookup-${mode.toLowerCase().replace("_", "-")}`);
    committedOnce(trace);
    expect(trace.reply).toBe("");
    expect(trace.after.conversation.conversationOwner).toBe("HUMAN");
    expect(trace.after.commerce.cart).toBeNull();
    expect(trace.committed[0]?.receipt).toMatchObject({ metaOutboxCreated: 0, handoffEventCreated: true, sendAuthorized: false });
    expect(roles(trace)).toEqual(["PRODUCER"]);
  });

  it("does not confirm or resend an obsolete preview after a POS snapshot price revision", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    await openCart(runtime);
    const empty = noCustomerSelection();
    const text = "T\u00ean: An Demo\nS\u0110T: 0900000000\n\u0110\u1ecba ch\u1ec9: 123 \u0110\u01b0\u1eddng M\u1eabu, H\u1ed9i An\nCOD";
    const field = (value: string) => ({ value, evidenceText: text, confidence: 0.99 });
    const preview = await runtime.turn({ text, producer: { ...empty, salesSignals: { ...empty.salesSignals,
      checkoutExtraction: { fullName: field("An Demo"), phone: field("0900000000"),
        address: field("123 \u0110\u01b0\u1eddng M\u1eabu, H\u1ed9i An"), paymentMethod: field("COD") },
    } } });
    expect(preview.after.commerce.stage).toBe("ORDER_PREVIEW");
    const prior = runtime.snapshots.get("CB182")!;
    runtime.snapshots.set("CB182", { ...prior, release_id: "synthetic-pos-2", synced_at: new Date().toISOString(),
      offers: { SET: { ...prior.offers.SET!, sale_price: 749_000, rows: prior.offers.SET!.rows.map((row) => ({ ...row, sale_price: 749_000 })) } },
    });
    const confirm = "\u0110\u00fang th\u00f4ng tin, ch\u1ed1t \u0111\u01a1n gi\u00fap ch\u1ecb.";
    const trace = await runtime.turn({ text: confirm, producer: { ...empty, salesSignals: { ...empty.salesSignals,
      purchaseConfirmation: { decision: "CONFIRM", evidenceText: confirm, confidence: 0.99 },
    } } });
    runtime.save("stale-preview-price-change");
    committedOnce(trace);
    expect(trace.after.commerce.stage).not.toBe("PURCHASE_CONFIRMED");
    // The offer-binding preflight refuses before a canonical checkout command.
    // Preserve the old record for the human, but never deliver/use it as authority.
    expect(trace.after.commerce).toEqual(preview.after.commerce);
    expect(trace.after.conversation.conversationOwner).toBe("HUMAN");
    expect(trace.reply).toBe("");
    expect(trace.planned[0]?.salesCyclePlan).toBeUndefined();
    expect(trace.planned[0]?.pancakeTagPlan).toBeUndefined();
    expect(trace.receipts[0]).toMatchObject({ metaOutboxCreated: 0, handoffEventCreated: true, sendAuthorized: false });
    expect(JSON.stringify(trace.planned[0]?.decisionEvents)).toContain("OFFER_BINDING_MISMATCH");
    expect(trace.reply).not.toMatch(/\u0111\u00e3 ch\u1ed1t|\u0111\u00e3 x\u00e1c nh\u1eadn \u0111\u01a1n/i);
    expect(roles(trace)).toEqual(["PRODUCER"]);
    const later = await runtime.turn({ text: confirm });
    runtime.save("stale-preview-price-change");
    expect(later.reply).toBe("");
    expect(later.after.commerce).toEqual(preview.after.commerce);
    expect(later.planned.every((plan) => plan.metaPlan === undefined && plan.salesCyclePlan === undefined)).toBe(true);
    expect(roles(later)).toEqual([]);
  });
});


describe("independent commerce and response obligations", () => {
  it("commits selected M when the independent S stock lookup fails", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    runtime.failures.add("CB182:STOCK");
    const purchase = "Chị lấy một bộ size M màu be.";
    const trace = await runtime.turn({ text: `${purchase} Size S còn không?`, producer: { ...buy(purchase, "M"),
      factQuery: { intent: "STOCK", offerType: "SET", color: "be", size: "S", deliveryRegion: null },
      obligations: [{ kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: "CB182", evidenceText: "Size S còn không?" }],
    } });
    runtime.save("b-failed-s");
    expect(trace.after.commerce.stage).toBe("CART_OPEN");
    expect(cartSizes(trace)).toEqual(["M", "M"]);
    expect(trace.reply).toContain("size S");
    expect(trace.reply).toContain("chưa");
    expect(trace.reply).not.toContain("hết hàng");
    committedOnce(trace);
  });

  it("answers verified price when the independent cart selection lacks authority", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    vi.mocked(runtime.facts.resolveCartSelection!).mockResolvedValue({ status: "NOT_FOUND", reasonCode: "CATALOG_SNAPSHOT_NOT_FOUND", availableSizes: [], availableColors: [] });
    const purchase = "Chị lấy một bộ size M màu be.";
    const trace = await runtime.turn({ text: `${purchase} Giá bao nhiêu?`, producer: { ...buy(purchase, "M"), factQuery: priceQuery } });
    expect(trace.after.commerce.cart).toBeNull();
    expect(trace.reply).toContain("799.000");
    expect(trace.after.conversation.conversationOwner).toBe("BOT");
    committedOnce(trace);
  });

  it("keeps an unsupported attribute alongside an authorized purchase", async () => {
    const runtime = deterministicRuntime();
    await quote(runtime);
    const purchase = "Chị lấy một bộ size M màu be.";
    const question = "Có chống nhăn không?";
    const trace = await runtime.turn({ text: `${purchase} ${question}`, producer: { ...buy(purchase, "M"), obligations: [
      { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "WRINKLE_RESISTANCE", productId: "CB182", evidenceText: question },
    ] } });
    expect(cartSizes(trace)).toEqual(["M", "M"]);
    expect(trace.reply).toContain("chống nhăn");
    expect(trace.reply).toContain("chưa");
    committedOnce(trace);
  });
});


it("continues checkout details while answering an independent price question", async () => {
  const runtime = deterministicRuntime();
  await quote(runtime);
  await openCart(runtime);
  const checkout = "Chị thanh toán.";
  const trace = await runtime.turn({ text: `${checkout} Giá bao nhiêu?`, producer: inputDelta({
    salesSignals: { ...noCustomerSelection().salesSignals, buyingIntent: { decision: "COMMITTED", requestedAction: "PROCEED_TO_PAYMENT", quantity: null, evidenceText: checkout, confidence: 0.99 } },
    factQuery: priceQuery,
  }), strategist: (input) => ({ ...answerPlan()(input), continuation: null, canonicalAction: "ASK_CHECKOUT_DETAILS",
    goal: "NEED: checkout and price\nKNOWN: NONE\nANSWER: price supported\nLIMIT: NONE\nNEXT: checkout fields enable payment" }) });
  expect(cartSizes(trace)).toEqual(["M", "M"]);
  expect(trace.reply).toContain("799.000");
  expect(trace.reply).toContain("tiếp tục");
  expect(trace.reply.match(/Chị cho em xin/g)).toHaveLength(1);
  committedOnce(trace);
});
