import { createHash, randomUUID } from "node:crypto";
import { CustomerProfileV1Schema, InboundMessageV1Schema, canonicalCartStateV1, canonicalCartStateHashPreimageV1, type ProtectedClaimV1 } from "@lana/contracts";
import { buildProtectedClaimsFromCartSelectionsV1, buildProtectedCartPolicyClaimsV1, canonicalCartPolicyLinesV2, evaluateDeterministicEffectReadinessV1, normalizeCatalogToken } from "@lana/business-tools";
import { createConversationState, type ConversationState } from "@lana/conversation-engine";
import type { ClaimedInboundBatch, PostgresChatHistoryStore, PostgresRealtimeInboxStore, PostgresRealtimeRuntimeStore, RealtimeSalesCyclePlan } from "@lana/database";
import { redactAnalyticsMessage, type ChatHistoryItem } from "@lana/database";
import type { InboundEnvelopeV1 } from "@lana/meta-webhook";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import { hasResidualPii } from "@lana/dataset-review";
import { createCommerceTools } from "./single-agent-commerce.js";
import { createRealtimeCustomerStatePort } from "./single-agent-commerce-state.js";
import { createPersistedCommerceExecutor } from "./single-agent-commerce-session.js";
import { createPersistedCommerceHandoffPort } from "./single-agent-commerce-persistence.js";
import { createCommerceHandoffTools } from "./single-agent-commerce-handoff.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { runCommerceTurn } from "./single-agent-commerce-read-only.js";
import { commerceHash, commerceUuid } from "./single-agent-commerce-read-only-context.js";
import { makeBinding, type TerminalOutcome } from "./single-agent-semantic-verifier-boundary.js";
import { sizeChartTarget } from "./size-chart-target.js";
import { evaluateSizeChartEligibility } from "./size-chart-eligibility.js";
import { checkoutDetails, selectionsMatchCartLines } from "./realtime-sales-cycle.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";

const textHash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const noSend = (reason: string) => ({ terminal: { disposition: "NO_SEND", reason, text: null, fallbackId: null } as TerminalOutcome, sendEnabled: false as const, enqueued: 0 });
const privateMarkers = ["[PHONE]", "[ADDRESS]", "[NAME]", "[EMAIL]", "[ID]", "[PII_REDACTED_MESSAGE]"];
export function isPrivateCommerceText(text: string): boolean {
  const redacted = redactAnalyticsMessage(text).text, details = checkoutDetails(text, undefined);
  return hasResidualPii(text) || !!(details.fullName || details.phone || details.address) || privateMarkers.some(marker => text.includes(marker)) ||
    privateMarkers.filter(marker => marker !== "[NAME]").some(marker => redacted.includes(marker));
}
/** Drop the whole private message: a redacted phone must not leave its adjacent recipient name in model context. */
export function commerceHistory(rows: readonly Pick<ChatHistoryItem, "text" | "senderType">[]) {
  const history = rows.filter(r => r.text && ["CUSTOMER", "BOT", "HUMAN"].includes(r.senderType) && !isPrivateCommerceText(r.text))
    .map(r => ({ role: r.senderType === "CUSTOMER" ? "customer" as const : "shop" as const, text: r.text })).slice(-8);
  while (history.reduce((n, m) => n+Buffer.byteLength(m.text), 0) > 4096) history.shift();
  return history;
}

/** The caller's configured routing pair owns this mapping; the model cannot supply either identity. */
export function bindCommerceFacts(reader: BusinessFactsReader, scope: { shopAlias: string; shopId: string }): BusinessFactsReader {
  const alias = normalizeCatalogToken(scope.shopAlias), shopId = scope.shopId;
  const invalid = () => ({ status: "INVALID" as const, reasonCode: "COMMERCE_SHOP_SCOPE_MISMATCH", availableSizes: [], availableColors: [] });
  return { ready: reader.ready.bind(reader), resolve: reader.resolve.bind(reader), close: reader.close.bind(reader),
    ...(reader.resolveVerifiedVariant ? { resolveVerifiedVariant: reader.resolveVerifiedVariant.bind(reader) } : {}),
    ...(reader.readCatalogSnapshot ? { readCatalogSnapshot: reader.readCatalogSnapshot.bind(reader) } : {}),
    async resolveCartSelection(query, now) {
      if (normalizeCatalogToken(query.shopAlias) !== alias || !reader.resolveCartSelection) return invalid();
      const selected = await reader.resolveCartSelection(query, now); if (selected.status !== "READY") return selected;
      const authority = selected.line.priceAuthority;
      if (!authority || authority.shopId !== selected.shopId) return invalid();
      if (selected.shopId === shopId) return selected;
      if (normalizeCatalogToken(selected.shopId) !== alias) return invalid();
      return { ...selected, shopId, line: { ...selected.line, priceAuthority: { ...authority, shopId } } };
    },
  };
}

/** Explicit candidate consumer. Not imported by a production entrypoint; it can enqueue, never dispatch or send. */
export async function runPersistedCommerceIngress(input: {
  batch: ClaimedInboundBatch<InboundEnvelopeV1>; fence: number;
  scope: Pick<Parameters<typeof createCommerceTools>[0]["read"]["scope"], "pageId" | "shopId" | "shopAlias" | "conversationId" | "customerHash">;
  store: PostgresRealtimeRuntimeStore; inbox: Pick<PostgresRealtimeInboxStore, "isBatchCurrent" | "readGeneration" | "completeBatch">;
  history: Pick<PostgresChatHistoryStore, "recordInboundCustomerMessage" | "listConversationHistory">;
  transaction: Parameters<typeof createPersistedCommerceExecutor>[0]["transaction"];
  read: Omit<Parameters<typeof createCommerceTools>[0]["read"], "scope" | "clock" | "state">;
  facts: Parameters<typeof createPersistedCommerceExecutor>[0]["facts"];
  policy: Parameters<typeof createPersistedCommerceExecutor>[0]["policy"];
  resolveTagId: Parameters<typeof createPersistedCommerceExecutor>[0]["resolveTagId"];
  clock: () => Date; ownerPrompt: string; verifierPrompt: string;
  owner: Parameters<typeof runCommerceTurn>[0]["owner"]; verifier: Parameters<typeof runCommerceTurn>[0]["verifier"];
}) {
  const { batch } = input;
  if (batch.eventKind !== "CUSTOMER" || !batch.items.length || batch.generation === null) return noSend("INGRESS_NOT_CUSTOMER");
  const messages = batch.items.map(i => InboundMessageV1Schema.parse(i.envelope.message)), last = messages.at(-1)!;
  if (batch.pageId !== input.scope.pageId || batch.conversationHash !== input.scope.customerHash ||
    messages.some(m => m.pageId !== batch.pageId || m.senderId !== last.senderId || m.isEcho || m.attachments.length)) return noSend("INGRESS_SCOPE_OR_MEDIA");
  if (!await input.inbox.isBatchCurrent(batch)) return noSend("INBOX_BATCH_SUPERSEDED");
  const record = await input.store.loadOrCreate<ConversationState>(batch.pageId, batch.conversationHash, "APP",
    id => createConversationState({ conversationId: id, routingOwner: "APP", now: input.clock() }), input.clock());
  if (record.conversationId !== input.scope.conversationId) return noSend("CONVERSATION_SCOPE");
  const latest = messages.map(m => m.text ?? "").join("\n"), sourceId = last.messageId ?? last.eventKey;
  const scope = { ...input.scope, sourceMessageId: sourceId, sourceObservedAt: last.occurredAt, requestId: batch.evaluationGroupId,
    recipient: textHash(last.senderId), bindingVersion: `commerce:${batch.generation}:${textHash(last.senderId)}`, revision: record.stateVersion,
    conversationOwner: record.state.conversationOwner, permission: record.state.conversationOwner === "BOT", privacyAllowed: true };
  const guard = { generation: batch.generation, leaseToken: batch.leaseToken, inboxIds: batch.inboxIds };
  const facts = bindCommerceFacts(input.facts, scope);
  const closeWithoutSend = async (reason: string) => { await input.inbox.completeBatch(batch); return noSend(reason); };
  const readAuthority = async () => {
    const row = await input.store.loadOrCreate<ConversationState>(scope.pageId, scope.customerHash, "APP", () => { throw new Error("CONVERSATION_REQUIRED"); }, input.clock());
    const generation = await input.inbox.readGeneration(scope.pageId, scope.customerHash);
    return { ...scope, state: row.state, stateVersion: row.stateVersion, fence: input.fence,
      bindingVersion: `commerce:${generation}:${scope.recipient}`, permission: row.state.conversationOwner === "BOT" };
  };
  for (const m of messages) await input.history.recordInboundCustomerMessage({ pageId: scope.pageId, conversationId: scope.conversationId,
    customerHash: scope.customerHash, providerMessageId: m.messageId ?? m.eventKey, text: isPrivateCommerceText(m.text ?? "") ? null : m.text,
    occurredAt: new Date(m.occurredAt), receivedAt: input.clock() });
  const executor = createPersistedCommerceExecutor({ scope, clock: input.clock, latest, facts, policy: input.policy, readAuthority,
    store: input.store, transaction: input.transaction, inboxBatchGuard: guard, resolveTagId: input.resolveTagId, deliveryRecipient: last.senderId });
  const policyBundle = async () => { const r = await input.policy(); if (!r.bundle) throw new Error("POLICY_UNAVAILABLE"); return r.bundle; };
  if (isPrivateCommerceText(latest)) {
    const privateResult = await executor.advancePrivateCheckout();
    if (privateResult.committed) return { ...noSend("PRIVATE_CHECKOUT_COMMITTED"), mode: "PRIVATE_CODE_PATH", enqueued: privateResult.messages };
    const handoff = createPersistedCommerceHandoffPort({ scope, clock: input.clock, store: input.store, transaction: input.transaction,
      read: readAuthority, inboxBatchGuard: guard, resolveTagId: input.resolveTagId });
    const recovery = createCommerceHandoffTools({ ...handoff, scope, clock: input.clock, policy: policyBundle,
      base: createReadOnlyTools({ ...input.read, scope, clock: input.clock }) });
    await recovery.invoke({ name: "request_handoff", args: { reason: "DEPENDENCY_FAILURE" } });
    return { ...noSend("PRIVATE_CHECKOUT_UNAVAILABLE"), terminal: await recovery.terminalOutcome?.() ?? noSend("PRIVATE_CHECKOUT_UNAVAILABLE").terminal,
      mode: "PRIVATE_CODE_PATH", enqueued: 0, privateCheckoutFailure: privateResult.failure ?? null };
  }
  const profilePort = createRealtimeCustomerStatePort(input.store, scope, () => {
    const at = input.clock().toISOString();
    return { profile: CustomerProfileV1Schema.parse({ schemaVersion: 1, profileId: randomUUID(), customerKey: { namespace: "meta", algorithm: "HMAC_SHA256", digest: scope.customerHash },
      revision: 1, measurements: [], fitPreference: null, preferences: { colors: [], styles: [], materials: [] }, sizeHistory: [], createdAt: at, updatedAt: at }), fieldEvidence: {} };
  }, input.clock, { read: readAuthority, inboxBatchGuard: guard });
  const profile = await profilePort.read();
  const handoff = createPersistedCommerceHandoffPort({ scope, clock: input.clock, store: input.store, transaction: input.transaction,
    read: readAuthority, inboxBatchGuard: guard, completeInboxBatch: false, resolveTagId: input.resolveTagId });
  const tools = await createCommerceTools({ read: { ...input.read, scope, clock: input.clock }, state: { store: profilePort,
    sizeInput: async ref => { const { product } = await input.read.catalog.readProduct(ref, false), target = sizeChartTarget(product);
      return { target, charts: evaluateSizeChartEligibility({ policy: await input.policy(), productId: ref, target }).charts }; },
    quoteInput: async () => { const state = (await executor.repository.read(scope.conversationId))!, policy = await policyBundle();
      const lines = state.cart && canonicalCartPolicyLinesV2(state.cart.value.lines, scope.shopId); if (!lines || !state.negotiation) throw new Error("CART_REQUIRED");
      const tier = state.negotiation.customerState;
      return { policy: policy.policy, lines, closingEvidence: { previousState: tier, purchaseReady: tier === "READY", priceObjectionCount: tier === "READY" ? 0 : tier === "HESITANT" ? 1 : 2, secondConcessionAlreadyApplied: tier === "CAUTIOUS" }, now: input.clock() }; } },
    effects: { ...executor, conversationKey: scope.conversationId, identity: { cartId: commerceUuid(commerceHash([scope.conversationId, "cart"])),
      salesEpisodeId: commerceUuid(commerceHash([scope.conversationId, "episode"])), customerProfileId: profile.profile.profileId },
      authorize: async () => (await readAuthority()).permission && await input.inbox.isBatchCurrent(batch), policy: policyBundle,
      select: q => facts.resolveCartSelection!(q, input.clock()), readAuthority: async () => { const a = await readAuthority(); return { ...scope, revision: a.stateVersion,
        conversationOwner: a.state.conversationOwner, permission: a.permission, bindingVersion: a.bindingVersion }; } },
    handoff: { ...handoff, policy: policyBundle } });
  const rows = await input.history.listConversationHistory(scope.conversationId, { before: new Date(messages[0]!.occurredAt), limit: 8 });
  const history = commerceHistory(rows);
  const result = await runCommerceTurn({ scope, tools, latest, history, clock: input.clock, ownerPrompt: input.ownerPrompt, verifierPrompt: input.verifierPrompt, owner: input.owner, verifier: input.verifier });
  // Reuse the bounded current readback before creating Outbox eligibility; no second model or reply rewrite.
  const accepted = makeBinding(scope.requestId, result.terminal.text ?? "", tools.snapshot());
  let world;
  try { world = await tools.readback(); } catch { return { ...result, ...await closeWithoutSend("EGRESS_READBACK_UNAVAILABLE") }; }
  const current = await readAuthority();
  const verifiedRevision = world.state.conversationRevision;
  if (typeof verifiedRevision !== "number" || current.stateVersion !== verifiedRevision ||
    commerceHash(accepted) !== commerceHash(makeBinding(scope.requestId, result.terminal.text ?? "", world)) || current.bindingVersion !== scope.bindingVersion) return { ...result, ...await closeWithoutSend("EGRESS_WORLD_CHANGED") };
  if (!await input.inbox.isBatchCurrent(batch)) return { ...result, enqueued: executor.outboxCount() }; // A confirmation already committed its atomic terminal intents.
  const state = (await executor.repository.read(scope.conversationId))!, cart = state.cart?.value;
  const allowedText = ["SEND_ELIGIBLE", "FALLBACK", "HANDOFF"].includes(result.terminal.disposition) ? result.terminal.text : null;
  const messagesOut = allowedText ? [{ kind: "TEXT" as const, text: allowedText }] : [];
  if (allowedText && allowedText.length > 2000) return { ...result, ...await closeWithoutSend("DELIVERY_TEXT_BOUND") };
  const sourceHash = textHash(scope.sourceMessageId), productIds = cart ? [...new Set(cart.lines.map(l => l.parentProductId))].sort() : world.boundSubjects.filter(s => s.kind === "PRODUCT").map(s => s.ref).sort();
  let claims = world.protectedClaims as ProtectedClaimV1[], salesPlan: RealtimeSalesCyclePlan<SalesCycleRuntimeState> | undefined;
  const now = input.clock();
  const common = { pageId: scope.pageId, conversationId: scope.conversationId, sourceMessageIdHash: sourceHash, conversationRevision: verifiedRevision,
    salesCycleRevision: cart ? state.revision : null, productIds, cartId: cart?.cartId ?? null, cartVersion: cart?.revision ?? null,
    cartStateHash: cart ? textHash(canonicalCartStateHashPreimageV1(canonicalCartStateV1(cart))) : null, ...(cart ? { cartLines: cart.lines } : {}),
    orderPreviewId: null, orderPreviewHash: null, buyingIntent: null, checkedAt: now };
  let parent: ReturnType<typeof evaluateDeterministicEffectReadinessV1> | undefined;
  if (cart && messagesOut.length) {
    const selections = await Promise.all(cart.lines.map(l => facts.resolveCartSelection!({ shopAlias: scope.shopAlias, productId: l.parentProductId, offerType: l.offerId,
      size: l.components[0]?.size ?? null, color: l.components[0]?.color ?? null, quantity: l.quantity, lineId: l.lineId }, now)));
    const ready = selections.flatMap(s => s.status === "READY" ? [s] : []);
    if (!selectionsMatchCartLines(cart.lines, ready)) return { ...result, ...await closeWithoutSend("EGRESS_CART_SOURCE_CHANGED") };
    const cartClaims = buildProtectedClaimsFromCartSelectionsV1(ready.map(s => ({ productId: s.line.parentProductId, variantId: s.line.offerId, priceVnd: s.line.posUnitPriceVnd!,
      priceVersion: s.versions.price, inventoryVersion: s.versions.inventory, etaVersion: s.versions.eta, eta: s.eta, etaExpiresAt: s.etaExpiresAt,
      sourceAuthority: s.sourceAuthority, stockStatus: s.stockStatus, stockAvailableQuantity: s.stockAvailableQuantity, observedAt: s.sourceObservedAt, expiresAt: s.sourceExpiresAt })));
    parent = evaluateDeterministicEffectReadinessV1({ ...common, effect: "CART_READY", claims: cartClaims });
    claims = [...cartClaims, ...buildProtectedCartPolicyClaimsV1({ cart, policySourceVersion: state.commerceContext!.policyRef.version, policyEvidenceRef: state.commerceContext!.policyRef.contentHash, expiresAt: state.cart!.expiresAt })];
    salesPlan = { expectedRevision: state.revision, state, events: [], cartExpiresAt: new Date(state.cart!.expiresAt), expiresAt: new Date(state.cart!.expiresAt),
      readinessContractVersion: "DF06_EFFECT_READINESS_V1", sourceMessageIdHash: sourceHash,
      canonicalBuyingIntent: { schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1", decision: "NONE", requestedAction: "NONE", quantity: null, productId: null,
        contributors: [], sourceMessageIdHash: sourceHash, evidenceHash: null, reasonCodes: [], evaluatedAt: now.toISOString(), authorization: "NONE" },
      effectReadiness: [parent], effectClaimSets: [{ effect: "CART_READY", claims: cartClaims }] };
  }
  const claimTypes = [...new Set(claims.map(c => c.type))], payloadHash = commerceHash(messagesOut);
  const readiness = evaluateDeterministicEffectReadinessV1({ ...common, effect: "PROTECTED_OUTBOUND", claims, protectedClaimTypes: claimTypes,
    deterministicEvidenceHash: payloadHash, payloadHash, ...(parent ? { parentReadinessHash: parent.readinessHash } : {}) });
  if (messagesOut.length && (readiness.outcome !== "READY" || parent?.outcome === "BLOCKED")) return { ...result, ...await closeWithoutSend("EGRESS_READINESS") };
  const committed = await input.transaction(client => input.store.commitWithinTransaction(client, { pageId: scope.pageId, conversationId: scope.conversationId, customerHash: scope.customerHash,
    expectedStateVersion: verifiedRevision, state: { ...current.state, revision: verifiedRevision+1, currentProductId: world.state.currentProductId, salesStage: state.stage }, inboxBatchGuard: guard,
    ...(messagesOut.length ? { metaPlan: { replyPlanId: randomUUID(), responseGroupId: randomUUID(), recipientId: last.senderId, messages: messagesOut, sourceMessageIdHash: sourceHash,
      protectedClaims: claims, protectedClaimTypes: claimTypes, effectReadiness: readiness, sendAfterOwnerHandoff: result.terminal.disposition === "HANDOFF" } } : {}),
    ...(salesPlan ? { salesCyclePlan: salesPlan } : {}) }, now));
  if (!committed.stateCommitted || (messagesOut.length && committed.metaOutboxCreated !== messagesOut.length)) return {
    ...result, ...noSend(committed.inboxBatchStatus === "SUPERSEDED" ? "INBOX_BATCH_SUPERSEDED" : "DELIVERY_NOT_AUTHORIZED"), commitStatus: committed.inboxBatchStatus };
  return { ...result, enqueued: committed.metaOutboxCreated, commitStatus: committed.inboxBatchStatus };
}
