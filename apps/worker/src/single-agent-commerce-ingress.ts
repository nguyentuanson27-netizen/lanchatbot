import { createHash, randomUUID } from "node:crypto";
import { CustomerProfileV1Schema, InboundMessageV1Schema, canonicalCartStateV1, canonicalCartStateHashPreimageV1, CommercePublicCartSummaryV1Schema, type ProtectedClaimV1 } from "@lana/contracts";
import {projectCommerceHistoryMetadata} from "./single-agent-commerce-public-history.js";
import { buildProtectedClaimsFromCartSelectionsV1, buildProtectedCartPolicyClaimsV1, canonicalCartPolicyLinesV2, evaluateDeterministicEffectReadinessV1, normalizeCatalogToken, normalizeProductCode } from "@lana/business-tools";
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
import { runCommerceTurn, type CommerceTools } from "./single-agent-commerce-read-only.js";
import { commerceHash, commerceUuid } from "./single-agent-commerce-read-only-context.js";
import { makeBinding, MAX_RUNTIME_PRODUCTS, type TerminalOutcome } from "./single-agent-semantic-verifier-boundary.js";
import { extractAdProductCodes } from "./media-resolution.js";
import { checkoutDetails, selectionsMatchCartLines } from "./realtime-sales-cycle.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import { makeCommerceMediaDeliveryBinding } from "./single-agent-commerce-media-delivery.js";
import { commerceSizeSource } from "./single-agent-commerce-product-groups.js";

const textHash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const noSend = (reason: string) => ({ terminal: { disposition: "NO_SEND", reason, text: null, fallbackId: null } as TerminalOutcome, sendEnabled: false as const, enqueued: 0 });
const privateMarkers = ["[PHONE]", "[ADDRESS]", "[NAME]", "[EMAIL]", "[ID]", "[PII_REDACTED_MESSAGE]"];
export function isPrivateCommerceText(text: string): boolean {
  const redacted = redactAnalyticsMessage(text).text, details = checkoutDetails(text, undefined);
  return hasResidualPii(text) || !!(details.fullName || details.phone || details.address) || privateMarkers.some(marker => text.includes(marker)) ||
    privateMarkers.filter(marker => marker !== "[NAME]").some(marker => redacted.includes(marker));
}
/** Drop the whole private message: a redacted phone must not leave its adjacent recipient name in model context. */
export function commerceHistory(rows: readonly Pick<ChatHistoryItem, "text" | "senderType">[],
  media: readonly { productId: string; assetRef: string; status: string; occurredAt: string }[] = [],reservedBytes=0) {
  const history = rows.filter(r => r.text && ["CUSTOMER", "BOT", "HUMAN"].includes(r.senderType) && !isPrivateCommerceText(r.text))
    .map(r => ({ role: r.senderType === "CUSTOMER" ? "customer" as const : "shop" as const, text: r.text })).slice(-8);
  while (history.reduce((n, m) => n+Buffer.byteLength(m.text), 0) > 4096) history.shift();
  // Preserve recent customer text/corrections first. Delivery memory has its own
  // 1KB/6-image bound inside the same 4KB context and never evicts text.
  const retained = media.slice(-6).map(({ productId, assetRef, status, occurredAt }) => ({ productId, assetRef, status, occurredAt }));
  while (retained.length) {
    const summary = { role: "shop" as const, text: JSON.stringify({ event: "RECENT_SHOP_IMAGES_ACCEPTED", completeHistory: false,
      customerViewed: "UNKNOWN", images: retained }) };
    const bytes = Buffer.byteLength(summary.text);
    if (bytes+reservedBytes <= 1024 && bytes+reservedBytes + (history.length === 8 ? 1 : 0) + history.reduce((n, m) => n+Buffer.byteLength(m.text), 0) <= 4096) {
      if (history.length < 8) history.unshift(summary);
      else {
        const shop = history.find(m => m.role === "shop");
        if (shop) shop.text += "\n" + summary.text;
      }
      break;
    }
    retained.shift();
  }
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
  captureBoundaryWitness?: boolean;
  /** Evaluation-only reference runner; production entrypoints never provide this port. */
  evaluationTurn?: { kind: "PINNED_MAIN_C3"; run: (turn: Parameters<typeof runCommerceTurn>[0],
    state: { sales: SalesCycleRuntimeState; conversationRevision: number; sourceMessagePk: string }) => ReturnType<typeof runCommerceTurn> };
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
  media?: Parameters<typeof createCommerceTools>[0]["media"];
  quoteTask?: Parameters<typeof createCommerceTools>[0]["quoteTask"];
  handoffReply?: { approvedHoldingHashes: readonly string[] };
  owner: Parameters<typeof runCommerceTurn>[0]["owner"]; verifier: Parameters<typeof runCommerceTurn>[0]["verifier"];
}) {
  const { batch } = input;
  if (batch.eventKind !== "CUSTOMER" || !batch.items.length || batch.generation === null) return noSend("INGRESS_NOT_CUSTOMER");
  const messages = batch.items.map(i => InboundMessageV1Schema.parse(i.envelope.message)), last = messages.at(-1)!;
  if (batch.pageId !== input.scope.pageId || batch.conversationHash !== input.scope.customerHash ||
    messages.some(m => m.pageId !== batch.pageId || m.senderId !== last.senderId || m.isEcho)) return noSend("INGRESS_SCOPE_OR_MEDIA");
  if (!await input.inbox.isBatchCurrent(batch)) return noSend("INBOX_BATCH_SUPERSEDED");
  const record = await input.store.loadOrCreate<ConversationState>(batch.pageId, batch.conversationHash, "APP",
    id => createConversationState({ conversationId: id, routingOwner: "APP", now: input.clock() }), input.clock());
  if (record.conversationId !== input.scope.conversationId) return noSend("CONVERSATION_SCOPE");
  const mediaMessage=messages.find(m=>m.attachments.length>0);
  const attachmentCount=messages.reduce((n,m)=>n+m.attachments.length,0);
  let mediaLink:{eventKey:string;messagePk:string;attachmentCount:number}|undefined;
  const sourceMessages=messages.map(m=>({text:m.text??"",sourceMessageId:m.messageId??m.eventKey,observedAt:m.occurredAt}));
  const latest = messages.map(m => m.text ?? "").join("\n"), sourceId = last.messageId ?? last.eventKey;
  const scope = { ...input.scope, sourceMessageId: sourceId, sourceObservedAt: last.occurredAt, requestId: batch.evaluationGroupId,
    recipient: textHash(last.senderId), bindingVersion: `commerce:${batch.generation}:${textHash(last.senderId)}`, revision: record.stateVersion,
    conversationOwner: record.state.conversationOwner, permission: record.state.conversationOwner === "BOT", privacyAllowed: true };
  const guard = { generation: batch.generation, leaseToken: batch.leaseToken, inboxIds: batch.inboxIds };
  let unconfirmedCommit = false;
  const observeWrite = async <T>(write: () => Promise<T>): Promise<T> => {
    try { return await write(); } catch (error) { unconfirmedCommit = true; throw error; }
  };
  const transaction: typeof input.transaction = work => observeWrite(() => input.transaction(work));
  const facts = bindCommerceFacts(input.facts, scope);
  const closeWithoutSend = async (reason: string) => ({ ...noSend(reason), inboxCompletion: await completeUnsent() });
  const readAuthority = async () => {
    const [row, generation] = await Promise.all([
      input.store.loadOrCreate<ConversationState>(scope.pageId, scope.customerHash, "APP", () => { throw new Error("CONVERSATION_REQUIRED"); }, input.clock()),
      input.inbox.readGeneration(scope.pageId, scope.customerHash),
    ]);
    return { ...scope, state: row.state, stateVersion: row.stateVersion, fence: input.fence,
      bindingVersion: `commerce:${generation}:${scope.recipient}`, permission: row.state.conversationOwner === "BOT" };
  };
  const executor = createPersistedCommerceExecutor({ scope, clock: input.clock, latest, facts, policy: input.policy, readAuthority,
    store: input.store, transaction, inboxBatchGuard: guard, resolveTagId: input.resolveTagId, deliveryRecipient: last.senderId,
    ...(mediaMessage ? {paymentReceiptInbound:{messageId:mediaMessage.messageId??mediaMessage.eventKey,pageId:scope.pageId,conversationId:scope.conversationId,
      senderType:"CUSTOMER" as const,observedAt:mediaMessage.occurredAt,
      attachments:mediaMessage.attachments.map((a,i)=>({attachmentId:`${mediaMessage.messageId??mediaMessage.eventKey}:attachment:${i}`,kind:a.type==="image"?"IMAGE" as const:a.type==="file"?"FILE" as const:"OTHER" as const}))}} : {}),
    handoffSource:()=>mediaLink,
    productNames: input.read.initialProducts?.map(p => ({ productId: p.productId, title: p.title })) });
  const completeUnsent = async (handoffStatus?: string) => {
    if (handoffStatus === "COMMITTED" || executor.terminalCommitted()) return "ALREADY_COMMITTED" as const;
    if (unconfirmedCommit || handoffStatus === "UNKNOWN") return "RECONCILE_REQUIRED" as const;
    try { return await input.inbox.completeBatch(batch, true) ? "COMPLETED" as const : "SUPERSEDED" as const; }
    catch { return "UNCONFIRMED" as const; }
  };
  const pendingCheckout = await executor.privateCheckoutPending();
  const privateInput = !!mediaMessage || pendingCheckout || isPrivateCommerceText(latest);
  let sourceMessagePk = "";
  for (const m of messages) {
    const recorded=await input.history.recordInboundCustomerMessage({ pageId: scope.pageId, conversationId: scope.conversationId,
    customerHash: scope.customerHash, providerMessageId: m.messageId ?? m.eventKey,
    text: privateInput || isPrivateCommerceText(m.text ?? "") ? null : m.text,
    attachmentCount:m.attachments.length,
    occurredAt: new Date(m.occurredAt), receivedAt: input.clock() });
    if (m === last) sourceMessagePk = recorded.messagePk;
    if(m===mediaMessage)mediaLink={eventKey:m.eventKey,messagePk:recorded.messagePk,attachmentCount};
  }
  if(record.state.conversationOwner!=="BOT")return closeWithoutSend("HUMAN_OWNS_CONVERSATION");
  const policyBundle = async () => { const r = await input.policy(); if (!r.bundle) throw new Error("POLICY_UNAVAILABLE"); return r.bundle; };
  if (privateInput) {
    // Customer image contents have no approved privacy projection yet. Keep bytes/URLs in the encrypted Inbox.
    // Only the existing payment-receipt state can consume attachment identity; other media goes to staff.
    const receiptPending=mediaMessage&&(await executor.repository.read(scope.conversationId))?.stage==="PURCHASE_CONFIRMED";
    const privateResult = !mediaMessage||receiptPending ? await executor.advancePrivateCheckout() : {committed:false,messages:0};
    if (privateResult.committed) return { ...noSend("PRIVATE_CHECKOUT_COMMITTED"), mode: "PRIVATE_CODE_PATH", enqueued: privateResult.messages };
    const handoff = createPersistedCommerceHandoffPort({ scope, clock: input.clock, store: input.store, transaction,
      read: readAuthority, inboxBatchGuard: guard, resolveTagId: input.resolveTagId, deliveryRecipient: last.senderId,
      ...(mediaLink?{triggerSource:mediaLink}:{}) });
    const recovery = createCommerceHandoffTools({ ...handoff, scope, clock: input.clock, policy: policyBundle,
      base: createReadOnlyTools({ ...input.read, scope, clock: input.clock }) });
    const terminal = await recovery.recoverFallback!({disposition:"FALLBACK",reason:"PRIVATE_CHECKOUT_UNAVAILABLE",text:null,fallbackId:null});
    return { ...noSend("PRIVATE_CHECKOUT_UNAVAILABLE"), terminal,
      inboxCompletion: await completeUnsent(recovery.handoffStatus?.()?.status),
      mode: "PRIVATE_CODE_PATH", enqueued: handoff.outboxCount(), privateCheckoutFailure: privateResult.failure ?? null };
  }
  // Hints select only source-verified identities, never prices or effects. A new unresolved ad must not fall back to an old product.
  const lookup = async (ids: readonly string[]) => {
    const products = await Promise.all([...new Set(ids)].slice(0,MAX_RUNTIME_PRODUCTS).map(async id => {
      try { const product = input.read.catalog.resolveProductCode ? await input.read.catalog.resolveProductCode(id)
          : (await input.read.catalog.readProduct(id,false))?.product;
        return product && normalizeProductCode(product.productId) === id ? product : null;
      } catch { return null; }
    }));
    return products.filter(p => p !== null);
  };
  const explicitCodes = extractAdProductCodes(latest);
  const explicit = await lookup(explicitCodes);
  const ads = messages.flatMap(m => m.adsContext ? [m.adsContext] : []);
  const hinted = explicit.length ? explicit : ads.length ? await lookup(ads.flatMap(ad => extractAdProductCodes(ad.adTitle ?? ""))) : [];
  // The existing ad extractor also finds fragments inside height/weight text.
  // Only a literal whole code token or a successfully resolved code is a hint;
  // do not add a measurement parser or let an unknown code inherit old focus.
  const focused = hinted.length || ads.length ? hinted : record.state.currentProductId ? await lookup([normalizeProductCode(record.state.currentProductId)]) : [];
  const currentProductId = focused.length === 1 ? focused[0]!.productId : null;
  const initialProducts = [...new Map([...(ads.length && !hinted.length ? [] : [...focused,...(input.read.initialProducts ?? [])])]
    .map(p => [p.productId,p])).values()].slice(0,MAX_RUNTIME_PRODUCTS);
  const scopedRead = {...input.read,initialProducts,state:()=>({...scope,currentProductId,factSnapshotVersion:""})};
  const rawProfilePort = createRealtimeCustomerStatePort(input.store, scope, () => {
    const at = input.clock().toISOString();
    return { profile: CustomerProfileV1Schema.parse({ schemaVersion: 1, profileId: randomUUID(), customerKey: { namespace: "meta", algorithm: "HMAC_SHA256", digest: scope.customerHash },
      revision: 1, measurements: [], fitPreference: null, preferences: { colors: [], styles: [], materials: [] }, sizeHistory: [], createdAt: at, updatedAt: at }), fieldEvidence: {} };
  }, input.clock, { read: readAuthority, inboxBatchGuard: guard });
  const profilePort = { read: rawProfilePort.read, compareAndSwap: (...args: Parameters<typeof rawProfilePort.compareAndSwap>) =>
    observeWrite(() => rawProfilePort.compareAndSwap(...args)) };
  const profile = await profilePort.read();
  const handoff = createPersistedCommerceHandoffPort({ scope, clock: input.clock, store: input.store, transaction,
    read: readAuthority, inboxBatchGuard: guard, resolveTagId: input.resolveTagId, deliveryRecipient: last.senderId });
  const rows = await input.history.listConversationHistory(scope.conversationId, { before: new Date(messages[0]!.occurredAt), limit: 30 });
  let mediaHistoryUnavailable = false;
  const recentMedia = input.store.readAcceptedCommerceMedia ? await input.store.readAcceptedCommerceMedia({
    pageId: scope.pageId, conversationId: scope.conversationId, customerHash: scope.customerHash,
    recipientHash: scope.recipient, before: new Date(messages[0]!.occurredAt),
  }).catch(() => { mediaHistoryUnavailable = true; return []; }) : [];
  let publicHistoryUnavailable=false;
  const recentCartEvents=input.store.readAcceptedCommerceCartSummaries ? await input.store.readAcceptedCommerceCartSummaries({pageId:scope.pageId,
    conversationId:scope.conversationId,customerHash:scope.customerHash,recipientHash:scope.recipient,before:new Date(messages[0]!.occurredAt)})
    .catch(()=>{publicHistoryUnavailable=true;return [];}) : [];
  const projectedHistory=projectCommerceHistoryMetadata(commerceHistory(rows),recentCartEvents);
  const historyMetadata=projectedHistory.metadata;
  const history=commerceHistory(rows,recentMedia,historyMetadata.publicCartEvents.length?Buffer.byteLength(JSON.stringify(historyMetadata)):0);
  const tools: CommerceTools = await createCommerceTools({ ...(input.quoteTask?{quoteTask:input.quoteTask}:{}), read: { ...scopedRead, scope, clock: input.clock,
    entry: {firstContact: rows.length > 0 || recentMedia.length > 0 || recentCartEvents.length > 0 ? false : mediaHistoryUnavailable || publicHistoryUnavailable ? null : true, fromAd: ads.length > 0} }, state: { store: profilePort,
    sourceMessages,
    sizeInput: async ref => { const { product } = await input.read.catalog.readProduct(ref, false);
      return commerceSizeSource(product, await input.policy(), input.read.productGroups); },
    quoteInput: async () => { const state = (await executor.repository.read(scope.conversationId))!, policy = await policyBundle();
      const lines = state.cart && canonicalCartPolicyLinesV2(state.cart.value.lines, scope.shopId); if (!lines || !state.negotiation) throw new Error("CART_REQUIRED");
      const tier = state.negotiation.customerState;
      return { policy: policy.policy, lines, closingEvidence: { previousState: tier, purchaseReady: tier === "READY", priceObjectionCount: tier === "READY" ? 0 : tier === "HESITANT" ? 1 : 2, secondConcessionAlreadyApplied: tier === "CAUTIOUS" }, now: input.clock() }; } },
    effects: { ...executor, negotiationSources:sourceMessages, conversationKey: scope.conversationId, identity: { cartId: commerceUuid(commerceHash([scope.conversationId, "cart"])),
      salesEpisodeId: commerceUuid(commerceHash([scope.conversationId, "episode"])), customerProfileId: profile.profile.profileId },
      authorize: async () => (await readAuthority()).permission && await input.inbox.isBatchCurrent(batch), policy: policyBundle,
      select: q => facts.resolveCartSelection!(q, input.clock()), readAuthority: async () => { const a = await readAuthority(); return { ...scope, revision: a.stateVersion,
        conversationOwner: a.state.conversationOwner, permission: a.permission, bindingVersion: a.bindingVersion }; } },
    handoff: { ...handoff, policy: policyBundle,...(input.handoffReply?{deferredReply:input.handoffReply}:{}) },
    media: input.media ?? {allowedHostSuffixes:(process.env.PRODUCT_SEARCH_ALLOWED_IMAGE_HOSTS ?? "lanadesign.vn,content.pancake.vn,fbcdn.net,fbsbx.com").split(",").map(s=>s.trim()).filter(Boolean)} });
  const turnInput={ scope, tools, latest, history, historyMetadata, clock: input.clock, ownerPrompt: input.ownerPrompt, verifierPrompt: input.verifierPrompt, owner: input.owner, verifier: input.verifier,
    ...(input.captureBoundaryWitness ? {captureBoundaryWitness:true} : {}) };
  if(input.evaluationTurn&&input.evaluationTurn.kind!=="PINNED_MAIN_C3")throw Error("EVALUATION_REFERENCE_KIND");
  const execution = input.evaluationTurn ? await input.evaluationTurn.run(turnInput,{sales:(await executor.repository.read(scope.conversationId))!,
    conversationRevision:(await readAuthority()).stateVersion,sourceMessagePk}) : await runCommerceTurn(turnInput);
  const result={...execution,publicHistoryProjection:{...projectedHistory.dropped,unavailable:publicHistoryUnavailable}};
  // Handoff commits own Inbox completion. Never enqueue a second response or
  // mutate state again after a rejected/unknown handoff transaction.
  if (result.terminal.disposition !== "SEND_ELIGIBLE") return {
    ...result, ...(result.terminal.disposition === "FALLBACK" ? noSend("FALLBACK_OUTPUT_FORBIDDEN") : {}),
    inboxCompletion: await completeUnsent(tools.handoffStatus?.()?.status),
    enqueued: handoff.outboxCount()+executor.outboxCount() };
  // Holding replies (with or without independent media) belong to the atomic
  // handoff group with Inbox completion. Do not enqueue another BOT reply.
  if (handoff.outboxCount()) return { ...result, enqueued: handoff.outboxCount() };
  // Reuse the bounded current readback before creating Outbox eligibility; no second model or reply rewrite.
  const accepted = makeBinding(scope.requestId, result.terminal.text ?? "", tools.snapshot());
  let world;
  try { world = await tools.readback(); } catch { return { ...result, ...await closeWithoutSend("EGRESS_READBACK_UNAVAILABLE") }; }
  const current = await readAuthority();
  const verifiedRevision = world.state.conversationRevision;
  if (typeof verifiedRevision !== "number" || current.stateVersion !== verifiedRevision ||
    commerceHash(accepted) !== commerceHash(makeBinding(scope.requestId, result.terminal.text ?? "", world)) || current.bindingVersion !== scope.bindingVersion) return { ...result, ...await closeWithoutSend("EGRESS_WORLD_CHANGED"),
      egressDiagnostic: { kind: typeof verifiedRevision !== "number" || current.stateVersion !== verifiedRevision ? "CONVERSATION_REVISION" : current.bindingVersion !== scope.bindingVersion ? "AUTHORITY_BINDING" : "TRUSTED_SNAPSHOT",
        acceptedHash: commerceHash(accepted), currentHash: commerceHash(makeBinding(scope.requestId,result.terminal.text??"",world)),
        expectedRevision: typeof verifiedRevision === "number" ? verifiedRevision : null, currentRevision: current.stateVersion,
        changedBindingFields: (Object.keys(accepted) as (keyof typeof accepted)[]).filter(k=>accepted[k]!==makeBinding(scope.requestId,result.terminal.text??"",world)[k]) } };
  if (!await input.inbox.isBatchCurrent(batch)) return { ...result, enqueued: executor.outboxCount() }; // A confirmation already committed its atomic terminal intents.
  const state = (await executor.repository.read(scope.conversationId))!, cart = state.cart?.value;
  // Rejected drafts have already taken the atomic silent handoff path in finish().
  // A defensive delivery guard also forbids static/image/receipt fallback output.
  if (result.recovery)
    return { ...result, ...await closeWithoutSend("FALLBACK_OUTPUT_FORBIDDEN") };
  const selectedMedia = [...new Map((tools.mediaSelection?.() ?? []).map(image => [commerceHash([image.productId, image.url]), image])).values()];
  const generatedPass = result.terminal.disposition === "SEND_ELIGIBLE" && result.terminal.reason === "PASS";
  const allowedText = result.terminal.disposition === "SEND_ELIGIBLE" ? result.terminal.text : null;
  const messagesOut = [...(allowedText ? [{ kind: "TEXT" as const, text: allowedText }] : []),
    ...(generatedPass ? selectedMedia.map(a=>({kind:"IMAGE" as const,imageUrl:a.url})) : [])];
  if (allowedText && allowedText.length > 2000) return { ...result, ...await closeWithoutSend("DELIVERY_TEXT_BOUND") };
  const sourceHash = textHash(scope.sourceMessageId);
  const cartSummary = result.terminal.disposition === "SEND_ELIGIBLE" && result.terminal.reason === "RECEIPT_BACKED_CART_SUMMARY";
  // Recovery totals use the same cart/fact readiness as generated cart replies.
  // A receipt-only ACK still makes no current catalog or price assertion.
  let claims = generatedPass ? world.protectedClaims as ProtectedClaimV1[] : [];
  const bindCart = (generatedPass || cartSummary) && cart !== undefined;
  const productIds = bindCart ? [...new Set(cart!.lines.map(l => l.parentProductId))].sort() :
    [...new Set(claims.flatMap(c => c.scope.kind === "PRODUCT" ? [c.scope.productId] : []))].sort();
  let salesPlan: RealtimeSalesCyclePlan<SalesCycleRuntimeState> | undefined;
  const now = input.clock();
  const common = { pageId: scope.pageId, conversationId: scope.conversationId, sourceMessageIdHash: sourceHash, conversationRevision: verifiedRevision,
    salesCycleRevision: cart ? state.revision : null, productIds, cartId: bindCart ? cart!.cartId : null, cartVersion: bindCart ? cart!.revision : null,
    cartStateHash: bindCart ? textHash(canonicalCartStateHashPreimageV1(canonicalCartStateV1(cart!))) : null, ...(bindCart ? { cartLines: cart!.lines } : {}),
    orderPreviewId: null, orderPreviewHash: null, buyingIntent: null, checkedAt: now };
  let parent: ReturnType<typeof evaluateDeterministicEffectReadinessV1> | undefined;
  if (cart && messagesOut.length) {
    salesPlan = { expectedRevision: state.revision, state, events: [], cartExpiresAt: new Date(state.cart!.expiresAt), expiresAt: new Date(state.cart!.expiresAt),
      readinessContractVersion: "DF06_EFFECT_READINESS_V1", sourceMessageIdHash: sourceHash,
      canonicalBuyingIntent: { schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1", decision: "NONE", requestedAction: "NONE", quantity: null, productId: null,
        contributors: [], sourceMessageIdHash: sourceHash, evidenceHash: null, reasonCodes: [], evaluatedAt: now.toISOString(), authorization: "NONE" } };
  }
  if (cart && bindCart && messagesOut.length) {
    const selections = await Promise.all(cart.lines.map(l => facts.resolveCartSelection!({ shopAlias: scope.shopAlias, productId: l.parentProductId, offerType: l.offerId,
      size: l.components[0]?.size ?? null, color: l.components[0]?.color ?? null, quantity: l.quantity, lineId: l.lineId }, now)));
    const ready = selections.flatMap(s => s.status === "READY" ? [s] : []);
    if (!selectionsMatchCartLines(cart.lines, ready)) return { ...result, ...await closeWithoutSend("EGRESS_CART_SOURCE_CHANGED") };
    const cartClaims = buildProtectedClaimsFromCartSelectionsV1(ready.map(s => ({ productId: s.line.parentProductId, variantId: s.line.offerId, priceVnd: s.line.posUnitPriceVnd!,
      priceVersion: s.versions.price, inventoryVersion: s.versions.inventory, etaVersion: s.versions.eta, eta: s.eta, etaExpiresAt: s.etaExpiresAt,
      sourceAuthority: s.sourceAuthority, stockStatus: s.stockStatus, stockAvailableQuantity: s.stockAvailableQuantity, observedAt: s.sourceObservedAt, expiresAt: s.sourceExpiresAt })));
    parent = evaluateDeterministicEffectReadinessV1({ ...common, effect: "CART_READY", claims: cartClaims });
    claims = [...claims.filter(c=>c.type==="PRODUCT_MEDIA"),...cartClaims, ...buildProtectedCartPolicyClaimsV1({ cart, policySourceVersion: state.commerceContext!.policyRef.version, policyEvidenceRef: state.commerceContext!.policyRef.contentHash, expiresAt: state.cart!.expiresAt })];
    salesPlan = { ...salesPlan!,
      effectReadiness: [parent], effectClaimSets: [{ effect: "CART_READY", claims: cartClaims }] };
  }
  const claimTypes = [...new Set(claims.map(c => c.type))], payloadHash = commerceHash(messagesOut);
  // Catalog media may depict another product without changing or joining the cart.
  const outboundProductIds=[...new Set([...productIds,...claims.flatMap(c=>c.type==="PRODUCT_MEDIA"&&c.scope.kind==="PRODUCT"?[c.scope.productId]:[])])].sort();
  const readiness = evaluateDeterministicEffectReadinessV1({ ...common, productIds:outboundProductIds, effect: "PROTECTED_OUTBOUND", claims, protectedClaimTypes: claimTypes,
    deterministicEvidenceHash: payloadHash, payloadHash, ...(parent ? { parentReadinessHash: parent.readinessHash } : {}) });
  if (messagesOut.length && (readiness.outcome !== "READY" || parent?.outcome === "BLOCKED")) return { ...result, ...await closeWithoutSend("EGRESS_READINESS") };
  const nextState = { ...current.state, revision: verifiedRevision+1, currentProductId: world.state.currentProductId, salesStage: state.stage };
  const responseGroupId = randomUUID();
  const publicAmounts=cartSummary?tools.publicCartSummary?.():undefined;
  const publicCartSummary=publicAmounts ? CommercePublicCartSummaryV1Schema.parse({...publicAmounts as object,kind:"C3_PUBLIC_CART_SUMMARY_V1",
    pageId:scope.pageId,conversationId:scope.conversationId,customerHash:scope.customerHash,recipientHash:scope.recipient,
    responseGroupId,sequence:0,messageHash:commerceHash(messagesOut[0])}) : undefined;
  const mediaBinding = (generatedPass) && selectedMedia.length ? makeCommerceMediaDeliveryBinding({ scope, generation: batch.generation, responseGroupId,
    nextState, messages: messagesOut, policy: await policyBundle(), images: selectedMedia, now }) : undefined;
  const committed = await input.transaction(client => input.store.commitWithinTransaction(client, { pageId: scope.pageId, conversationId: scope.conversationId, customerHash: scope.customerHash,
    expectedStateVersion: verifiedRevision, state: nextState, inboxBatchGuard: guard,
    ...(messagesOut.length ? { metaPlan: { replyPlanId: randomUUID(), responseGroupId, recipientId: last.senderId, messages: messagesOut, sourceMessageIdHash: sourceHash,
      ...(mediaBinding ? { mediaBinding } : {}),
      ...(publicCartSummary ? {publicCartSummary} : {}),
      protectedClaims: claims, protectedClaimTypes: claimTypes, effectReadiness: readiness, sendAfterOwnerHandoff: result.terminal.disposition === "HANDOFF" } } : {}),
    ...(salesPlan ? { salesCyclePlan: salesPlan } : {}) }, now));
  if (!committed.stateCommitted || (messagesOut.length && committed.metaOutboxCreated !== messagesOut.length)) return {
    ...result, ...noSend(committed.inboxBatchStatus === "SUPERSEDED" ? "INBOX_BATCH_SUPERSEDED" : "DELIVERY_NOT_AUTHORIZED"), commitStatus: committed.inboxBatchStatus };
  return { ...result, enqueued: committed.metaOutboxCreated, commitStatus: committed.inboxBatchStatus };
}
