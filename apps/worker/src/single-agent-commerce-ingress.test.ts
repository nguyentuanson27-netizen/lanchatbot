import { afterEach, describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import { applySalesCycleCommand, computeBusinessContentHash, createSalesCycleRuntimeState } from "@lana/chat-runtime";
import { LocalEnvelopeCipher, PostgresRealtimeRuntimeStore, type RealtimeCommitInput } from "@lana/database";
import * as composition from "./single-agent-commerce.js";
import { commerceHistory, runPersistedCommerceIngress } from "./single-agent-commerce-ingress.js";
import { commerceScope, commerceNow, fixtureProfile, fixturePolicy, fixtureProduct, fixtureCartLine, fixturePolicyPointers } from "./single-agent-commerce.test-support.js";
import { createCommerceReadSources } from "./single-agent-commerce-read-only-sources.js";
import type { OwnerGeneration, OwnerRequest } from "./single-agent-commerce-read-only.js";
import type { CartSelectionResult } from "./realtime-sales-catalog.js";

function fixture(productIds = ["SM613"]) {
  const scope = commerceScope(), products = productIds.map(id => fixtureProduct(id));
  let generation = 1, revision = 1, profile = fixtureProfile(), tagId: string | null = null;
  let conversation = createConversationState({ conversationId: scope.conversationId, routingOwner: "APP", now: commerceNow });
  let cycle = createSalesCycleRuntimeState(scope.conversationId, { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
  let checkCommit = async (_prepared: RealtimeCommitInput<unknown>) => {};
  let beforeTransaction = async () => {};
  const profileWrite = vi.fn(async (_page: string, _customer: string, expected: number, next: ReturnType<typeof fixtureProfile>) => {
    if (expected !== profile.profile.revision) return false;
    profile = { profile: next.profile, fieldEvidence: next.fieldEvidence }; return true;
  });
  const commit = vi.fn(async (_client: unknown, prepared: RealtimeCommitInput<unknown>) => {
    await checkCommit(prepared);
    conversation=prepared.state as typeof conversation;revision=conversation.revision;
    if(prepared.salesCyclePlan)cycle=prepared.salesCyclePlan.state as typeof cycle;
    return {stateCommitted:true,metaOutboxCreated:prepared.metaPlan?.messages.length??0,inboxBatchStatus:"COMMITTED",
      handoffEventCreated:!!prepared.handoffEventPlan,pancakeTagOutboxCreated:!!prepared.pancakeTagPlan};
  });
  const store = { loadOrCreate: async () => ({ conversationId: scope.conversationId, stateVersion: revision, state: { ...conversation, revision } }),
    loadOrCreateSalesCycle: async () => ({ state: cycle, stateRevision: cycle.revision }),
    loadOrCreateCustomerProfile: async () => ({ ...profile, pageId: scope.pageId, customerHash: scope.customerHash, revision: profile.profile.revision }),
    readCommittedSalesCycleEvent: async (_page:string,_conversation:string,commandId:string) =>
      commit.mock.calls.flatMap(c=>c[1].salesCyclePlan?.events??[]).find(e=>e.commandId===commandId)??null,
    compareAndSwapCustomerProfile: profileWrite, commitWithinTransaction: commit };
  const id = "current-message", message = { schemaVersion: 1, traceId: "00000000-0000-4000-8000-000000000001", eventKey: id, messageId: id,
    pageId: scope.pageId, senderId: "synthetic-customer", conversationId: "meta-conversation", occurredAt: commerceNow.toISOString(),
    isEcho: false, appId: null, text: "Em ơi", attachments: [] };
  const batch = { pageId: scope.pageId, conversationHash: scope.customerHash, eventKind: "CUSTOMER", generation: 1,
    evaluationGroupId: "turn", leaseToken: "lease", inboxIds: ["inbox"], items: [{ envelope: { message } }] };
  const verifier = vi.fn(async () => ({ result: { verdict: "PASS", violations: [] } }));
  const select = vi.fn(async (): Promise<CartSelectionResult> => ({ status: "INVALID", reasonCode: "FIXTURE_SOURCE_UNAVAILABLE", availableSizes: [], availableColors: [] }));
  const inbox = { isBatchCurrent: async () => generation === batch.generation, readGeneration: async () => generation, completeBatch: async () => {} };
  const policy = vi.fn(() => fixturePolicy());
  const catalogRead = vi.fn(async (id: string) => products.find(p => p.product.productId === id));
  const history = {recordInboundCustomerMessage: vi.fn(async (_input:unknown) => ({messagePk:"90000000-0000-4000-8000-000000000001"})), listConversationHistory: vi.fn(async () => [] as unknown[])};
  let readOverride: Parameters<typeof runPersistedCommerceIngress>[0]["read"] | undefined;
  const run = (owner: Parameters<typeof runPersistedCommerceIngress>[0]["owner"] = async () => ({ kind: "FINAL", text: "Dạ chị." })) => runPersistedCommerceIngress({
    batch, fence: 1, scope, store, inbox,
    history, transaction: async (work: (client: never) => Promise<unknown>) => { await beforeTransaction(); return work({} as never); },
    facts: { ready: async () => true, resolve: async () => {}, close: async () => {}, resolveCartSelection: select }, policy,
    read: readOverride ?? { policy: () => fixturePolicy(), initialProducts: products.map(p => p.product), catalog: {
      readProduct: catalogRead, searchText: async () => ({ status: "NOT_FOUND" }) } },
    resolveTagId: () => tagId, clock: () => commerceNow, ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm tra.", owner, verifier,
  } as unknown as Parameters<typeof runPersistedCommerceIngress>[0]);
  return { run, store, inbox, commit, verifier, select, profileWrite, policy, message, products, catalogRead, history, setRead: (read: typeof readOverride) => { readOverride = read; }, profile: () => profile, supersede: () => { generation++; }, changeRevision: () => { revision++; },
    setCycle: (state: typeof cycle) => { cycle = state; }, cycle: () => cycle, batch,
    newGeneration: () => { batch.generation = generation; },
    checkCommit: (check: typeof checkCommit) => { checkCommit = check; },
    beforeTransaction: (check: typeof beforeTransaction) => { beforeTransaction = check; },
    setFocus: (currentProductId: string | null) => { conversation = {...conversation,currentProductId}; },
    appendMessage:(next:typeof message)=>{batch.items.push({envelope:{message:next}});},
    enableHandoff:()=>{tagId="staff-tag";}, transferToHuman: () => { conversation = { ...conversation, conversationOwner: "HUMAN" }; revision++; } };
}

afterEach(() => vi.restoreAllMocks());

async function enableRecoveryHandoff(f: ReturnType<typeof fixture>, mode: "holding" | "silent" = "holding") {
  f.enableHandoff();
  const resolved=await fixturePolicy();
  const bundle=resolved.bundle!;
  Object.assign(bundle.artifacts,{handoffMatrix:{schemaVersion:1,kind:"HANDOFF_MATRIX",sourceMetadata:bundle.artifacts.shopPolicy.sourceMetadata,
    rules:["DEPENDENCY_FAILURE","RESPONSE_UNAVAILABLE"].map(reason=>({reason,customerMessagePolicy:mode==="holding"?"HOLDING_REPLY_THEN_HANDOFF":"SILENT_HANDOFF",
      holdingReply:mode==="holding"?"Shop đã nhận yêu cầu của chị. Bên em sẽ kiểm tra rồi báo lại chị nhé.":null,tag:"NHAN_VIEN"}))}});
  f.policy.mockResolvedValue({...resolved,bundle});
}

it("commits the owner's relevant price-unavailable handoff and its customer message",async()=>{
  const f=fixture(),source=f.products[0]!;f.enableHandoff();
  const resolution=await fixturePolicy(),bundle=resolution.bundle!;
  Object.assign(bundle.artifacts,{handoffMatrix:{schemaVersion:1,kind:"HANDOFF_MATRIX",sourceMetadata:bundle.artifacts.shopPolicy.sourceMetadata,
    rules:[{reason:"PRICE_UNAVAILABLE",customerMessagePolicy:"HOLDING_REPLY_THEN_HANDOFF",holdingReply:"Bên em sẽ kiểm tra lại giá rồi báo chị nhé.",tag:"NHAN_VIEN"}]}});
  f.policy.mockResolvedValue({...resolution,bundle});
  f.setRead({policy:()=>fixturePolicy(),initialProducts:[source.product],catalog:{readProduct:async()=>({...source,snapshot:null}),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
  f.message.text="Áo này mua riêng bao nhiêu em?";
  const call={name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT"}};
  let turns=0;
  const owner=vi.fn(async():Promise<OwnerGeneration>=>{
    const next=++turns===1?call:{name:"request_handoff",args:{reason:"PRICE_UNAVAILABLE"}};
    return {kind:"TOOLS",calls:[next],content:{role:"model",parts:[{functionCall:next}]}};
  });
  const result=await f.run(owner);
  expect(result).toMatchObject({enqueued:1,terminal:{disposition:"HANDOFF",reason:"PRICE_UNAVAILABLE",text:"Bên em sẽ kiểm tra lại giá rồi báo chị nhé."}});
  expect(owner).toHaveBeenCalledTimes(2);expect(f.verifier).not.toHaveBeenCalled();
  const handoff=f.commit.mock.calls.filter(c=>c[1].handoffEventPlan);
  expect(handoff).toHaveLength(1);expect(handoff[0]![1]).toMatchObject({state:{conversationOwner:"HUMAN"},pancakeTagPlan:{desiredTag:"NHAN_VIEN"},metaPlan:{messages:[{kind:"TEXT",text:result.terminal.text}]}});
});

it.each(["provider","malformed-finish","timeout","fail","uncertain","malformed-verdict"])("atomically hands off unrecovered %s without another generation",async fault=>{
  const f=fixture(); await enableRecoveryHandoff(f);
  if(fault==="fail"||fault==="uncertain") f.verifier.mockResolvedValue({result:{verdict:fault==="fail"?"FAIL":"UNCERTAIN",violations:[]}});
  if(fault==="malformed-verdict") f.verifier.mockResolvedValue({result:{verdict:"broken",violations:[]}});
  const providerFault=["provider","malformed-finish","timeout"].includes(fault);
  const owner=vi.fn(async()=>{if(providerFault)throw new Error(fault==="provider"?"HTTP_429":fault==="timeout"?"TIMEOUT":"OWNER_FINISH_REASON");
    return {kind:"FINAL" as const,text:"Dạ chị."};});
  const result=await f.run(owner);
  expect(result.terminal).toMatchObject({disposition:"HANDOFF",reason:providerFault?"DEPENDENCY_FAILURE":"RESPONSE_UNAVAILABLE"});
  const handoffs=f.commit.mock.calls.filter(c=>c[1].handoffEventPlan);
  expect(handoffs).toHaveLength(1);
  expect(handoffs[0]![1]).toMatchObject({pancakeTagPlan:{desiredTag:"NHAN_VIEN"},metaPlan:{messages:[{kind:"TEXT",text:result.terminal.text}]}});
  expect(result.enqueued).toBe(1); expect(owner).toHaveBeenCalledTimes(1);
  expect(f.verifier).toHaveBeenCalledTimes(providerFault?0:1);
});

it("fails closed if recovery commit readback becomes unavailable",async()=>{
  const f=fixture();await enableRecoveryHandoff(f);
  f.checkCommit(async()=>{f.store.loadOrCreate=async()=>{throw new Error("READBACK_UNAVAILABLE");};});
  const result=await f.run(async()=>{throw new Error("HTTP_429");});
  expect(result.terminal).toMatchObject({disposition:"NO_SEND",text:null});
  expect(f.commit.mock.calls.filter(c=>c[1].handoffEventPlan)).toHaveLength(1);
});

it("keeps an automatic recovery handoff silent when current policy is silent",async()=>{
  const f=fixture();await enableRecoveryHandoff(f,"silent");
  const result=await f.run(async()=>{throw new Error("HTTP_429");});
  expect(result.terminal).toMatchObject({disposition:"HANDOFF",text:null});
  expect(result.enqueued).toBe(0);
  const c=f.commit.mock.calls.find(c=>c[1].handoffEventPlan)![1];
  expect(c.metaPlan).toBeUndefined();expect(c.completeInboxBatch).not.toBe(false);
});

it.each(["conflict","ambiguous","superseded","missing-rule"])("does not acknowledge an automatic handoff after %s",async fault=>{
  const f=fixture();await enableRecoveryHandoff(f);
  if(fault==="missing-rule")f.policy.mockImplementation(()=>fixturePolicy());
  if(fault==="conflict")f.commit.mockResolvedValue({stateCommitted:false,metaOutboxCreated:0,inboxBatchStatus:"STALE",handoffEventCreated:false,pancakeTagOutboxCreated:false} as never);
  if(fault==="ambiguous")f.commit.mockRejectedValue(new Error("COMMIT_UNKNOWN"));
  const result=await f.run(async()=>{if(fault==="superseded")f.supersede();throw new Error("HTTP_429");});
  expect(result.terminal.disposition).not.toBe("HANDOFF");
  expect(result.terminal.text??"").not.toContain("Shop đã nhận");
  expect(f.commit.mock.calls.filter(c=>c[1].handoffEventPlan).length).toBeLessThanOrEqual(1);
});

it.each(["Không lấy Thạch Thảo nữa, gửi chị mẫu kia.","Chị đang so Thạch Thảo với Diệp An.","Cho chị xem bộ Thạch Thảo.","Mẫu kia cơ em."])("does not manufacture durable product focus from unbound prose: %s",async text=>{
  const f=fixture();f.message.text=text;
  await f.run(async()=>({kind:"FINAL",text:"Dạ chị."}));
  expect((f.commit.mock.calls.at(-1)![1].state as {currentProductId:unknown}).currentProductId).toBeNull();
});

it.each(["metadata-refresh","rejected-caption"])("delivers independent closeup without a new handoff after %s",async mode=>{
  const f=fixture(); await enableRecoveryHandoff(f);f.setFocus("SM613");f.message.text="Cho chị xem cận phần thêu nhé.";
  const product=f.products[0]!;
  product.snapshot.synced_at=new Date(commerceNow.getTime()-60_000).toISOString();
  product.product.images=[{url:"https://content.pancake.vn/closeup.jpg",role:"PRIMARY",angle:"CLOSEUP",imageType:"DETAIL",intents:[],sortOrder:0,qualityScore:null,
    feedback:false,reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
  f.verifier.mockImplementation(async()=>{product.snapshot.synced_at=commerceNow.toISOString();return {result:{verdict:mode==="metadata-refresh"?"PASS":"UNCERTAIN",violations:[]}};});
  let calls=0;
  const tools=[{name:"select_product_media",args:{subjectRef:"SM613",intent:"DETAIL"}}];
  const result=await f.run(async()=>++calls===1?{kind:"TOOLS",calls:tools,content:{role:"model",parts:tools.map(c=>({functionCall:c}))}}:
    {kind:"FINAL",text:"Em gửi chị ảnh cận áo nhé."});
  expect(result.enqueued).toBe(2);expect(f.commit.mock.calls.filter(c=>c[1].handoffEventPlan)).toHaveLength(0);
  expect(f.commit.mock.calls.at(-1)![1].metaPlan!.messages[1]).toEqual({kind:"IMAGE",imageUrl:product.product.images[0]!.url});
  expect(result.terminal.disposition).toBe(mode==="metadata-refresh"?"SEND_ELIGIBLE":"FALLBACK");
  if(mode==="rejected-caption")expect(result.terminal.fallbackId).toBe("C3_B_VERIFIED_MEDIA_V1");
});

it("preserves a benign caption through the shared history redactor", async () => {
  const { redactAnalyticsMessage } = await import("@lana/database");
  const caption = "Em gửi chị ảnh cận để xem đường nét thêu nhé.";
  expect(commerceHistory([{ senderType: "BOT", text: redactAnalyticsMessage(caption).text }]))
    .toEqual([{ role: "shop", text: caption }]);
  for (const street of ["đường nguyễn trãi", "đ. lê lợi"])
    expect(commerceHistory([{ senderType: "CUSTOMER", text: redactAnalyticsMessage(street).text }])).toEqual([]);
});

it("adds bounded actual image history without evicting customer corrections or exceeding eight entries", () => {
  const rows = Array.from({ length: 8 }, (_, i) => ({ senderType: i%2 ? "BOT" as const : "CUSTOMER" as const, text: `Lượt ${i}` }));
  const images = Array.from({ length: 6 }, (_, i) => ({ productId: "SM613", assetRef: `asset:${String(i).repeat(64)}`,
    status: "SENT_ACCEPTED", occurredAt: commerceNow.toISOString() }));
  const history = commerceHistory(rows, images);
  expect(history).toHaveLength(8);
  rows.forEach(r => expect(history.some(m => m.text.includes(r.text))).toBe(true));
  const joined = history.map(m => m.text).join("\n");
  expect(joined).toContain("RECENT_SHOP_IMAGES_ACCEPTED");
  expect(joined).toContain('"customerViewed":"UNKNOWN"');
  expect(Buffer.byteLength(joined)).toBeLessThanOrEqual(4096);
});

it("keeps an accepted-image conversation returning when the text history write was lost", async () => {
  const f = fixture();
  Object.assign(f.store, { readAcceptedCommerceMedia: vi.fn(async () => [{ productId: "SM613",
    assetRef: `asset:${"a".repeat(64)}`, status: "SENT_ACCEPTED", occurredAt: commerceNow.toISOString() }]) });
  let entry: unknown, contents: unknown;
  await f.run(async request => {
    entry = JSON.parse(request.context.policyLiterals.find(p => p.ref === "conversation-entry")!.text);
    contents = request.contents;
    return { kind: "FINAL", text: "Dạ chị." };
  });
  expect(entry).toEqual({ firstContact: false, fromAd: false });
  expect(JSON.stringify(contents)).toContain("RECENT_SHOP_IMAGES_ACCEPTED");
});

it("does not call an unavailable delivery history an empty first contact", async () => {
  const f = fixture();
  Object.assign(f.store, { readAcceptedCommerceMedia: vi.fn(async () => { throw Error("UNAVAILABLE"); }) });
  let entry: unknown;
  await f.run(async request => {
    entry = JSON.parse(request.context.policyLiterals.find(p => p.ref === "conversation-entry")!.text);
    return { kind: "FINAL", text: "Dạ chị." };
  });
  expect(entry).toEqual({ firstContact: null, fromAd: false });
});

it.each(["code", "source-title", "approved-group"])("recovers first-contact images with a verified turn product and no persisted focus (%s)", async mode => {
  const f = fixture(), product = fixtureProduct();
  product.product.title = "Áo Thanh Mai";
  product.product.images = ["FRONT", "BACK"].map((angle, index) => ({
    url: `https://content.pancake.vn/first-${index}.jpg`, role: "PRIMARY" as const,
    angle: angle as "FRONT" | "BACK", imageType: "MODEL" as const, intents: [], sortOrder: index,
    qualityScore: null, feedback: false, reviewStatus: "APPROVED" as const, metadataVerified: true,
    sourceContentSha256: "a".repeat(64), observedAt: commerceNow.toISOString(), partsVisible: [],
  }));
  const read = createCommerceReadSources({ scope: commerceScope(), channel: "PUBLISHED", clock: () => commerceNow,
    catalog: { findByExactCode: async code => code === product.product.canonicalCode ? product.product : null },
    search: { searchText: async () => ({ status: "MATCHED", matchKind: "ALIAS", product: product.product, score: 1, gap: null }) },
    facts: { readCatalogSnapshot: async () => product.snapshot },
    policyStore: { loadActivePointers: async () => fixturePolicyPointers() } });
  f.setRead({ ...read, initialProducts: [], ...(mode === "approved-group" ? { productGroups: [{ name: "Thanh Mai", customerNames: ["Thanh Mai"],
    productTitles: { SM613: product.product.title }, approvalRef: "owner-decision", sharedSize: { artifactKey: "unused", sourceProductId: "SM613",
      brand: "LANA", category: "TOP", componentRole: "TOP" as const } }] } : {}) });
  f.message.text = `Cho chị xem ảnh ${mode === "code" ? "SM613" : mode === "approved-group" ? "Thanh Mai" : "Áo Thanh Mai"} màu be nhé.`;
  f.verifier.mockResolvedValue({ result: { verdict: "UNCERTAIN", violations: [] } });
  let n = 0;
  const result = await f.run(async () => {
    n++;
    const calls = mode !== "code" && n === 1
      ? [{ name: "search_products", args: { query: product.product.title } }]
      : [{ name: "select_product_media", args: { subjectRef: product.product.productId, intent: "GENERIC" } }];
    if (n === (mode === "code" ? 2 : 3)) return { kind: "FINAL", text: "DRAFT_MUST_NOT_BE_SENT" };
    return { kind: "TOOLS", calls, content: { role: "model", parts: calls.map(c => ({ functionCall: c })) } };
  });
  expect(result.terminal).toMatchObject({ disposition: "FALLBACK", reason: "UNCERTAIN", fallbackId: "C3_B_VERIFIED_MEDIA_V1" });
  const meta = f.commit.mock.calls.at(-1)![1].metaPlan!;
  expect(meta.messages).toEqual([{ kind: "TEXT", text: result.terminal.text },
    ...product.product.images.map(image => ({ kind: "IMAGE", imageUrl: image.url }))]);
  expect(JSON.stringify(meta)).not.toContain("DRAFT_MUST_NOT_BE_SENT");
  expect(f.verifier).toHaveBeenCalledTimes(1);
});

it.each(["not-requested", "two-titles", "unresolved-ad", "unresolved-code", "shortened-title", "ambiguous-group"])("does not grant first-contact image recovery from %s", async mode => {
  const f = fixture(["SM613", "OTHER1"]), p = f.products[0]!.product;
  p.title = "Áo Thanh Mai"; f.products[1]!.product.title = "Áo Thu Hà";
  p.images = [{ url: "https://content.pancake.vn/requested.jpg", role: "PRIMARY", angle: "FRONT", imageType: "MODEL",
    intents: [], sortOrder: 0, qualityScore: null, feedback: false, reviewStatus: "APPROVED", metadataVerified: true,
    sourceContentSha256: "a".repeat(64), observedAt: commerceNow.toISOString(), partsVisible: [] }];
  if (mode === "ambiguous-group") f.setRead({ policy: () => fixturePolicy(), initialProducts: f.products.map(p => p.product),
    catalog: { readProduct: async id => f.products.find(p => p.product.productId === id)!, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) },
    productGroups: [{ name: "Thanh Mai", customerNames: ["set Thanh Mai"], productTitles: { SM613: p.title, OTHER1: f.products[1]!.product.title },
      approvalRef: "owner-decision", sharedSize: { artifactKey: "unused", sourceProductId: "SM613", brand: "LANA", category: "TOP", componentRole: "TOP" } }] });
  f.message.text = mode === "ambiguous-group" ? "Cho chị xem set Thanh Mai."
    : mode === "two-titles" ? "Cho chị xem Áo Thanh Mai và Áo Thu Hà."
    : mode === "shortened-title" ? "Cho chị xem Thanh Mai." : mode === "unresolved-ad" ? "Cho chị xem Áo Thanh Mai."
      : mode === "unresolved-code" ? "Cho chị xem ZZ999." : "Chọn giúp chị một áo.";
  if (mode === "unresolved-code") f.setFocus("SM613");
  if (mode === "unresolved-ad") Object.assign(f.message, { adsContext: { source: "ADS", adTitle: "UNKNOWN999", postId: null, adId: null, ref: null } });
  f.verifier.mockResolvedValue({ result: { verdict: "UNCERTAIN", violations: [] } });
  let n = 0;
  await f.run(async () => {
    const calls = [{ name: "read_product", args: { subjectRef: f.products[1]!.product.productId } },
      { name: "select_product_media", args: { subjectRef: p.productId, intent: "GENERIC" } }];
    return ++n === 1 ? { kind: "TOOLS", calls, content: { role: "model", parts: calls.map(c => ({ functionCall: c })) } }
      : { kind: "FINAL", text: "Dạ chị." };
  });
  expect(f.commit.mock.calls.flatMap(c => c[1].metaPlan?.messages ?? []).filter(m => m.kind === "IMAGE")).toEqual([]);
});

it.each([false,true])("preserves a selected image in a code-owned fallback group without sending the rejected draft (cart=%s)",async withCart=>{
  const f=fixture(),p=f.products[0]!.product;f.setFocus(p.productId);
  if(withCart)await seedCart(f);
  p.images=[{url:"https://content.pancake.vn/detail.jpg",role:"PRIMARY",angle:"CLOSEUP",imageType:"DETAIL",intents:[],sortOrder:0,qualityScore:null,feedback:false,
    reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
  f.message.text="Cho chị xem cận áo nhé.";
  f.verifier.mockResolvedValue({result:{verdict:"UNCERTAIN",violations:[]}});
  let n=0;const calls=[{name:"select_product_media",args:{subjectRef:p.productId,intent:"DETAIL"}}];
  const result=await f.run(async()=>++n===1?{kind:"TOOLS",calls,content:{role:"model",parts:calls.map(c=>({functionCall:c}))}}:
    {kind:"FINAL",text:"DRAFT_MUST_NOT_BE_SENT"});
  expect(result.terminal).toMatchObject({disposition:"FALLBACK",reason:"UNCERTAIN",fallbackId:"C3_B_VERIFIED_MEDIA_V1"});
  const meta=f.commit.mock.calls.at(-1)![1].metaPlan!;
  expect(meta.messages).toEqual([{kind:"TEXT",text:result.terminal.text},{kind:"IMAGE",imageUrl:p.images[0]!.url}]);
  expect(meta.protectedClaims?.some(c=>c.type==="PRODUCT_MEDIA")).toBe(true);
  expect(JSON.stringify(meta)).not.toContain("DRAFT_MUST_NOT_BE_SENT");
  expect(f.verifier).toHaveBeenCalledTimes(1);
});

it.each(["source","human","revision","pending-state","other-product"])("does not recover images across a %s failure",async fault=>{
  const f=fixture(["SM613","OTHER1"]),p=f.products[fault==="other-product"?1:0]!.product;f.setFocus("SM613");
  p.images=[{url:"https://content.pancake.vn/detail.jpg",role:"PRIMARY",angle:"CLOSEUP",imageType:"DETAIL",intents:[],sortOrder:0,qualityScore:null,feedback:false,
    reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
  f.message.text="Cho chị xem cận áo nhé.";
  f.verifier.mockImplementation(async()=>{
    if(fault==="source")p.images[0]!.metadataVerified=false;
    if(fault==="human")f.transferToHuman();
    if(fault==="revision")f.changeRevision();
    return {result:{verdict:"UNCERTAIN",violations:[]}};
  });
  const calls: {name:string;args:Record<string,unknown>}[]=[{name:"select_product_media",args:{subjectRef:p.productId,intent:"DETAIL"}}];
  if(fault==="pending-state")calls.push({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.WAIST_CM",value:80,sourceQuote:"NOT_IN_MESSAGE"}]}});
  let n=0;const result=await f.run(async()=>++n===1?{kind:"TOOLS",calls,content:{role:"model",parts:calls.map(c=>({functionCall:c}))}}:
    {kind:"FINAL",text:"DRAFT_MUST_NOT_BE_SENT"});
  expect(result.terminal.fallbackId).not.toBe("C3_B_VERIFIED_MEDIA_V1");
  expect(f.commit.mock.calls.flatMap(c=>c[1].metaPlan?.messages??[]).filter(m=>m.kind==="IMAGE")).toEqual([]);
});

it("finishes mixed media and size intake after a corrected inline call within the unchanged budget",async()=>{
  const f=fixture(),p=f.products[0]!.product;f.setFocus(p.productId);f.enableHandoff();
  const resolution = await fixturePolicy();
  Object.assign(resolution.bundle!.artifacts, { handoffMatrix: { schemaVersion: 1, kind: "HANDOFF_MATRIX",
    sourceMetadata: resolution.bundle!.artifacts.shopPolicy.sourceMetadata,
    rules: [{ reason: "SIZE_RULE_UNAVAILABLE", customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF",
      holdingReply: "Em chuyển nhân viên chọn size cho chị nhé.", tag: "NHAN_VIEN" }] } });
  f.policy.mockImplementation(async () => resolution);
  f.message.text="Cho chị xem cận áo. Chị cao 1m58, nặng 52kg.";
  p.images=[{url:"https://content.pancake.vn/detail.jpg",role:"PRIMARY",angle:"CLOSEUP",imageType:"DETAIL",intents:[],sortOrder:0,qualityScore:null,feedback:false,
    reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
  let n=0;
  const result=await f.run(async()=>{
    n++; const ops=[{op:"SET",field:"measurements.HEIGHT_CM",value:158,sourceQuote:n===1?f.message.text:"1m58"},
      {op:"SET",field:"measurements.WEIGHT_KG",value:52,sourceQuote:n===1?f.message.text:"52kg"}];
    const calls=[{name:"recommend_size",args:{subjectRef:p.productId,customerStateOps:ops}},
      ...(n===1?[{name:"select_product_media",args:{subjectRef:p.productId,intent:"DETAIL"}},
        {name:"select_product_media",args:{subjectRef:p.productId,intent:"GENERIC"}},
        {name:"read_product",args:{subjectRef:p.productId,offerType:"DIRECT"}}]:[])];
    return {kind:"TOOLS",calls,content:{role:"model",parts:calls.map(c=>({functionCall:c}))}};
  });
  expect(result.terminal).toMatchObject({disposition:"HANDOFF",reason:"SIZE_RULE_UNAVAILABLE"});
  if (!("toolCalls" in result)) throw new Error("MODEL_TURN_REQUIRED");
  expect(result.toolCalls).toBeLessThanOrEqual(6);expect(n).toBe(2);
  expect(f.profileWrite).toHaveBeenCalledTimes(1);expect(f.verifier).not.toHaveBeenCalled();
  const handoffCommit = f.commit.mock.calls.find(c => c[1].handoffEventPlan)![1];
  expect(handoffCommit.metaPlan?.messages).toEqual([{kind:"TEXT",text:"Em gửi chị ảnh của mẫu để mình xem trước nhé."},
    {kind:"IMAGE",imageUrl:p.images[0]!.url}, {kind:"TEXT",text:result.terminal.text}]);
  expect(handoffCommit.metaPlan?.sendAfterOwnerHandoff).toBe(true);
  expect(handoffCommit.metaPlan?.protectedClaims?.some(c => c.type === "PRODUCT_MEDIA")).toBe(true);
  expect(f.commit.mock.calls.filter(c => c[1].metaPlan)).toHaveLength(1);
  expect(handoffCommit.completeInboxBatch).not.toBe(false);
  expect(result.enqueued).toBe(3);
});

it.each(["source", "human", "revision", "inbox", "policy", "unknown-transaction"])("does not enqueue a partial mixed handoff group after %s changes", async fault => {
  const f = fixture(), p = f.products[0]!.product; f.setFocus(p.productId); f.enableHandoff();
  const resolution = await fixturePolicy();
  Object.assign(resolution.bundle!.artifacts, { handoffMatrix: { schemaVersion: 1, kind: "HANDOFF_MATRIX",
    sourceMetadata: resolution.bundle!.artifacts.shopPolicy.sourceMetadata,
    rules: [{ reason: "SIZE_RULE_UNAVAILABLE", customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF",
      holdingReply: "Em chuyển nhân viên chọn size cho chị nhé.", tag: "NHAN_VIEN" }] } });
  f.policy.mockImplementation(async () => resolution);
  p.images = [{ url: "https://content.pancake.vn/detail.jpg", role: "PRIMARY", angle: "CLOSEUP", imageType: "DETAIL",
    intents: [], sortOrder: 0, qualityScore: null, feedback: false, reviewStatus: "APPROVED", metadataVerified: true,
    sourceContentSha256: "a".repeat(64), observedAt: commerceNow.toISOString(), partsVisible: ["AO"] }];
  f.message.text = "Cho chị xem ảnh áo và chọn size nhé.";
  let transactions = 0;
  f.beforeTransaction(async () => {
    if (++transactions !== 1) return;
    if (fault === "source") p.images[0]!.metadataVerified = false;
    if (fault === "human") f.transferToHuman();
    if (fault === "revision") f.changeRevision();
    if (fault === "inbox") f.supersede();
    if (fault === "policy") resolution.bundle!.artifacts.handoffMatrix!.rules[0]!.holdingReply = "Nhân viên hỗ trợ chị nhé.";
    if (fault === "unknown-transaction") throw new Error("UNKNOWN_TRANSACTION");
  });
  const calls = [{ name: "select_product_media", args: { subjectRef: p.productId, intent: "DETAIL" } },
    { name: "recommend_size", args: { subjectRef: p.productId } }];
  const result = await f.run(async () => ({ kind: "TOOLS", calls, content: { role: "model", parts: calls.map(c => ({ functionCall: c })) } }));
  expect(f.commit.mock.calls.flatMap(c => c[1].metaPlan?.messages ?? []).filter(m => m.kind === "IMAGE")).toEqual([]);
  expect(f.commit.mock.calls.filter(c => c[1].handoffEventPlan)).toHaveLength(0);
  expect(f.verifier).not.toHaveBeenCalled();
  expect(result.terminal.disposition).not.toBe("SEND_ELIGIBLE");
});

it("keeps customer-requested handoff free of images even when media was selected in an earlier round", async () => {
  const f = fixture(), p = f.products[0]!.product; f.setFocus(p.productId); f.enableHandoff();
  p.images = [{ url: "https://content.pancake.vn/detail.jpg", role: "PRIMARY", angle: "FRONT", imageType: "MODEL",
    intents: [], sortOrder: 0, qualityScore: null, feedback: false, reviewStatus: "APPROVED", metadataVerified: true,
    sourceContentSha256: "a".repeat(64), observedAt: commerceNow.toISOString(), partsVisible: [] }];
  let n = 0;
  await f.run(async () => {
    const calls = ++n === 1 ? [{ name: "select_product_media", args: { subjectRef: p.productId, intent: "GENERIC" } }]
      : [{ name: "request_handoff", args: { reason: "CUSTOMER_REQUESTED_HUMAN" } }];
    return { kind: "TOOLS", calls, content: { role: "model", parts: calls.map(c => ({ functionCall: c })) } };
  });
  expect(f.commit.mock.calls.flatMap(c => c[1].metaPlan?.messages ?? []).filter(m => m.kind === "IMAGE")).toEqual([]);
  expect(f.verifier).not.toHaveBeenCalled();
});

it.each(["GENERIC","DETAIL"])("continues after a verified-media caption fallback with history and persisted product (%s)",async intent=>{
  const f=fixture(),p=f.products[0]!.product;f.setFocus(p.productId);
  p.images=[{url:"https://content.pancake.vn/detail.jpg",role:"PRIMARY",angle:"CLOSEUP",imageType:"DETAIL",intents:[],sortOrder:0,qualityScore:null,feedback:false,
    reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
  p.images=[...p.images,{...p.images[0]!,url:"https://content.pancake.vn/feedback.jpg",role:"ADDITIONAL",feedback:true}];
  const tool=(intent:string):OwnerGeneration=>({kind:"TOOLS",calls:[{name:"select_product_media",args:{subjectRef:p.productId,intent}}],
    content:{role:"model",parts:[{functionCall:{name:"select_product_media",args:{subjectRef:p.productId,intent}}}]}});
  f.message.text="Shop có ảnh khách mặc mẫu này không em?";
  f.verifier.mockResolvedValueOnce({result:{verdict:"UNCERTAIN",violations:[]}});
  let calls=0;
  const first=await f.run(async()=>++calls===1?tool("FEEDBACK"):{kind:"FINAL",text:"Ảnh khách mặc em chưa có để gửi chị."});
  expect(first.terminal.fallbackId).toBe("C3_B_VERIFIED_MEDIA_V1");
  const sent=f.commit.mock.calls.at(-1)![1].metaPlan!.messages;
  expect(sent).toEqual([{kind:"TEXT",text:first.terminal.text},{kind:"IMAGE",imageUrl:p.images[1]!.url}]);
  // Delivery history must contain the terminal text, never the rejected owner draft.
  f.history.listConversationHistory.mockResolvedValue([
    {senderType:"CUSTOMER",text:f.message.text},{senderType:"BOT",text:first.terminal.text}]);
  f.message.text=intent==="GENERIC"?"Ảnh tổng thể em.":"Cận phần thêu nhé.";
  f.message.messageId="next-media-message";f.message.eventKey="next-media-message";
  calls=0;let observed:OwnerRequest|undefined;
  const second=await f.run(async request=>{
    observed??=request;
    return ++calls===1?tool(intent):{kind:"FINAL",text:"Em gửi ảnh chị nhé."};
  });
  expect(observed!.context.state.currentProductId).toBe(p.productId);
  expect(observed!.contents[1]!.parts[0]!.text).toBe(first.terminal.text);
  expect(JSON.stringify(observed!.contents)).not.toContain("Ảnh khách mặc em chưa có để gửi chị.");
  expect(second.terminal.disposition,JSON.stringify(second.terminal)).toBe("SEND_ELIGIBLE");
  expect(f.commit.mock.calls.at(-1)![1].metaPlan!.messages).toEqual([
    {kind:"TEXT",text:"Em gửi ảnh chị nhé."},{kind:"IMAGE",imageUrl:p.images[0]!.url}]);
  expect(f.verifier).toHaveBeenCalledTimes(2);
});

it.each(["PASS","UNCERTAIN"])("keeps a mixed price/media reply only after whole-draft verification (%s)",async verdict=>{
  const f=fixture(),p=f.products[0]!.product;f.setFocus(p.productId);
  p.images=[{url:"https://content.pancake.vn/feedback.jpg",role:"PRIMARY",angle:"FRONT",imageType:"MODEL",intents:[],sortOrder:0,qualityScore:null,feedback:true,
    reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
  f.message.text="Cho chị xem ảnh khách mặc, áo này bao nhiêu em?";
  f.verifier.mockResolvedValue({result:{verdict,violations:[]}});
  const calls=[{name:"select_product_media",args:{subjectRef:p.productId,intent:"FEEDBACK"}},
    {name:"read_product",args:{subjectRef:p.productId,offerType:"DIRECT"}}];
  let generations=0;
  const draft="Áo 499k chị nhé. Em gửi chị ảnh khách mặc.";
  const result=await f.run(async request=>{
    if(++generations===1)return {kind:"TOOLS",calls,content:{role:"model",parts:calls.map(c=>({functionCall:c}))}};
    expect(request.context.protectedClaims).toEqual(expect.arrayContaining([expect.objectContaining({type:"PRICE"})]));
    expect(request.context.policyLiterals.some(p=>p.ref.startsWith("media:"))).toBe(true);
    return {kind:"FINAL",text:draft};
  });
  expect(f.verifier).toHaveBeenCalledTimes(1);
  const delivered=f.commit.mock.calls.at(-1)![1].metaPlan!.messages;
  expect(delivered).toEqual([{kind:"TEXT",text:result.terminal.text},{kind:"IMAGE",imageUrl:p.images[0]!.url}]);
  if(verdict==="PASS")expect(result.terminal.text).toBe(draft);
  else {expect(result.terminal.disposition).toBe("FALLBACK");expect(JSON.stringify(delivered)).not.toContain("499");}
});

it("hands off missing requested feedback even when the price in the same batch is available",async()=>{
  const f=fixture(),p=f.products[0]!.product;f.setFocus(p.productId);await enableRecoveryHandoff(f);
  f.message.text="Cho chị xem ảnh khách mặc, áo này bao nhiêu em?";
  const calls=[{name:"select_product_media",args:{subjectRef:p.productId,intent:"FEEDBACK"}},
    {name:"read_product",args:{subjectRef:p.productId,offerType:"DIRECT"}}];
  const owner=vi.fn(async():Promise<OwnerGeneration>=>({kind:"TOOLS",calls,content:{role:"model",parts:calls.map(c=>({functionCall:c}))}}));
  const result=await f.run(owner);
  expect(result).toMatchObject({enqueued:1,terminal:{disposition:"HANDOFF",reason:"DEPENDENCY_FAILURE"}});
  expect(owner).toHaveBeenCalledOnce();expect(f.verifier).not.toHaveBeenCalled();
  const handoff=f.commit.mock.calls.filter(c=>c[1].handoffEventPlan);expect(handoff).toHaveLength(1);
  expect(handoff[0]![1]).toMatchObject({state:{conversationOwner:"HUMAN"},metaPlan:{messages:[{kind:"TEXT",text:result.terminal.text}]}});
});

async function seedCart(f: ReturnType<typeof fixture>) {
  const scope=commerceScope(), resolution=await fixturePolicy(), policy=resolution.bundle!.policy;
  f.policy.mockResolvedValue({...resolution,mayAffectOutbound:true,bundle:{...resolution.bundle!,channel:"PUBLISHED",sideEffects:"LIVE_OUTBOUND"}});
  let state=createSalesCycleRuntimeState(scope.conversationId,{pageId:scope.pageId,conversationId:scope.conversationId},commerceNow);
  for(const kind of ["FACTS_PRESENTED","MEASUREMENTS_REQUIRED","SIZE_RECOMMENDED"] as const)
    state=applySalesCycleCommand({state,expectedRevision:state.revision,command:{kind,commandId:kind},now:commerceNow}).state;
  const line=fixtureCartLine(),draft={identity:{cartId:"50000000-0000-4000-8000-000000000001",salesEpisodeId:"60000000-0000-4000-8000-000000000001",customerProfileId:fixtureProfile().profile.profileId},
    lines:[line],shopId:scope.shopId,policyRef:{id:policy.policyBundleId,version:policy.policyVersion,contentHash:computeBusinessContentHash(policy)}};
  state=applySalesCycleCommand({state,expectedRevision:state.revision,command:{kind:"CART_OPENED",commandId:"open",cartDraftRef:{id:"draft",version:"1",contentHash:computeBusinessContentHash(draft)},
    expiresAt:new Date(commerceNow.getTime()+1800000).toISOString()},now:commerceNow,
    trustedPorts:{resolveCartDraft:()=>draft,resolveShopPolicy:()=>policy,resolveCartMutation:()=>null,resolveInboundMessage:()=>null,revalidateCheckout:()=>null}}).state;
  f.setCycle(state);
  f.select.mockResolvedValue({status:"READY",line,shopId:scope.shopId,versions:{price:line.priceAuthority!.priceFactRef,inventory:"i1",size:"s1",eta:null},eta:null,etaExpiresAt:null,
    sourceAuthority:"POS_SNAPSHOT",stockStatus:"IN_STOCK",stockAvailableQuantity:4,sourceObservedAt:commerceNow.toISOString(),sourceExpiresAt:new Date(commerceNow.getTime()+1200000).toISOString()});
}

it("persists a real recovery public outcome and feeds only its accepted numeric history to both models next turn",async()=>{
  const f=fixture();await seedCart(f);
  f.message.text="Bớt cho chị chút";
  let calls=0;
  const first=await f.run(async()=>{
    if(++calls===1)return {kind:"TOOLS",calls:[{name:"record_negotiation",args:{intent:"PRICE_OBJECTION",sourceQuote:f.message.text}}],
      content:{role:"model",parts:[{functionCall:{name:"record_negotiation",args:{intent:"PRICE_OBJECTION",sourceQuote:f.message.text}}}]}};
    throw new Error("OUTPUT_FAILURE");
  });
  expect(first.terminal.reason).toBe("RECEIPT_BACKED_CART_SUMMARY");
  const meta=f.commit.mock.calls.at(-1)![1].metaPlan!;
  expect(meta.publicCartSummary).toMatchObject({kind:"C3_PUBLIC_CART_SUMMARY_V1",cartId:f.cycle().cart!.value.cartId,
    grandTotalVnd:f.cycle().cart!.value.grandTotalVnd});
  const proof=meta.publicCartSummary as Record<string,unknown>;
  const cipher=new LocalEnvelopeCipher("00".repeat(32),"test"),outboxId="accepted-summary";
  const payload=cipher.encryptJson({...meta.messages[0],commercePublicCartSummary:proof},`lana:meta-payload:v2:${commerceScope().pageId}:${outboxId}`,new Date(Date.now()+60000));
  const reader=new PostgresRealtimeRuntimeStore("postgresql://unused:unused@localhost/unused",cipher);
  (reader as unknown as {pool:unknown}).pool={query:async()=>({rows:[{outbox_id:outboxId,page_id:commerceScope().pageId,conversation_id:commerceScope().conversationId,
    response_group_id:meta.responseGroupId,sequence_no:0,status:"SENT_ACCEPTED",meta_message_id:"accepted",accepted_at:new Date(commerceNow.getTime()-1),
    payload_ciphertext:payload.ciphertext,payload_nonce:payload.nonce,payload_auth_tag:payload.authTag,payload_encrypted_dek:payload.encryptedDek,payload_key_ref:payload.keyRef,payload_expires_at:payload.expiresAt}]})};
  Object.assign(f.store,{readAcceptedCommerceCartSummaries:reader.readAcceptedCommerceCartSummaries.bind(reader)});
  f.history.listConversationHistory.mockResolvedValue([{senderType:"BOT",text:"[ADDRESS]"},{senderType:"CUSTOMER",text:"Giữ size M nhé."}]);
  f.message.messageId="total-next";f.message.eventKey="total-next";f.message.text="Cả ship bao nhiêu em?";
  const owner=vi.fn(async()=>({kind:"FINAL" as const,text:"Dạ chị."}));
  const second=await f.run(owner);
  expect(second.terminal.disposition).toBe("SEND_ELIGIBLE");
  expect(owner.mock.calls).toHaveLength(1);
  const ownerRequest=(owner.mock.calls as unknown as [Parameters<typeof runPersistedCommerceIngress>[0]["owner"] extends (r:infer R)=>unknown?R:never][])[0]![0];
  expect(ownerRequest.historyMetadata?.publicCartEvents).toHaveLength(1);
  expect(ownerRequest.context.effectReceipts).toEqual([]);
  expect(ownerRequest.context.state.cartQuote).toMatchObject({grandTotalVnd:f.cycle().cart!.value.grandTotalVnd});
  const verify=(f.verifier.mock.calls as unknown as [{historyMetadata:unknown}][]).at(-1)![0];
  expect(verify.historyMetadata).toEqual(ownerRequest.historyMetadata);
  expect(JSON.stringify(ownerRequest.contents)).not.toContain("[ADDRESS]");
});

it("does not count the same objection again when a superseded batch gains a new tail",async()=>{
  const f=fixture(); await seedCart(f);
  f.message.messageId="objection-A";f.message.eventKey="objection-A";f.message.text="Giá hơi cao";
  f.appendMessage({...f.message,messageId:"tail-B",eventKey:"tail-B",text:"Chị đang cân nhắc"});
  const objection={kind:"TOOLS" as const,calls:[{name:"record_negotiation",args:{intent:"PRICE_OBJECTION",sourceQuote:"Giá hơi cao"}}],
    content:{role:"model" as const,parts:[{functionCall:{name:"record_negotiation",args:{intent:"PRICE_OBJECTION",sourceQuote:"Giá hơi cao"}}}]}};
  let calls=0;
  await f.run(async()=>{if(++calls===1)return objection;f.supersede();throw new Error("NEW_INBOUND");});
  expect(f.cycle().negotiation!.consumedObjectionEvidenceIds).toEqual(["inbound:objection-A"]);
  const total=f.cycle().cart!.value.grandTotalVnd;
  f.newGeneration();f.appendMessage({...f.message,messageId:"tail-C",eventKey:"tail-C",text:"Cho chị xem lại tổng"});
  calls=0;
  const replay=await f.run(async()=>++calls===1?objection:{kind:"FINAL",text:"Dạ chị."});
  expect(replay.terminal.disposition,JSON.stringify(replay.terminal)).toBe("SEND_ELIGIBLE");
  expect(f.cycle().negotiation!.customerState).toBe("HESITANT");
  expect(f.cycle().negotiation!.consumedObjectionEvidenceIds).toEqual(["inbound:objection-A"]);
  expect(f.cycle().cart!.value.grandTotalVnd).toBe(total);
  expect(f.commit.mock.calls.flatMap(c=>c[1].salesCyclePlan?.events??[]).filter(e=>e.commandKind==="NEGOTIATION_EVENT")).toHaveLength(1);
});

it.each([false,true])("keeps receipt evidence private and passes the actual batch source guard (textAfter=%s)",async textAfter=>{
  const f=fixture();await seedCart(f);f.enableHandoff();
  const state=f.cycle();
  f.setCycle({...state,stage:"PURCHASE_CONFIRMED",confirmation:{schemaVersion:1,confirmationId:"70000000-0000-4000-8000-000000000001",idempotencyKey:"fixture-confirmed",cartId:state.cart!.value.cartId,
    cartVersion:state.cart!.value.revision,previewId:"80000000-0000-4000-8000-000000000001",previewHash:"a".repeat(64),status:"PURCHASE_CONFIRMED",posOrderId:null,
    desiredPancakeTag:"DA_CHOT_DON",confirmedAt:commerceNow.toISOString(),sourceMessageId:"earlier-confirmation"}});
  f.message.messageId="receipt-image";f.message.eventKey="receipt-image";f.message.text=null as never;
  f.message.attachments=[{type:"image",url:"https://content.pancake.vn/private-receipt.jpg",providerId:"receipt"}] as never;
  if(textAfter){f.appendMessage({...f.message,messageId:"following-text",eventKey:"following-text",text:"Chị gửi rồi nhé",attachments:[]});f.batch.inboxIds.push("inbox2");}
  const actual=new PostgresRealtimeRuntimeStore("postgresql://unused:unused@localhost/unused",new LocalEnvelopeCipher("00".repeat(32),"test"));
  let passed=0;
  const client={query:async(sql:string)=>{
    if(sql.includes("SELECT routing_owner"))return {rowCount:1,rows:[{routing_owner:"APP",app_send_enabled:true,kill_switch:false,transaction_now:commerceNow}]};
    if(sql.includes("SELECT generation"))return {rowCount:1,rows:[{generation:"1"}]};
    if(sql.includes("AS source_message_id"))return {rowCount:f.batch.items.length,rows:f.batch.items.map(i=>({source_message_id:i.envelope.message.messageId})).reverse()};
    if(sql.includes("SELECT conversation_owner"))return {rowCount:1,rows:[{conversation_owner:"BOT"}]};
    if(sql.includes("SELECT state_revision")){passed++;throw new Error("SOURCE_GUARD_PASSED");}
    throw new Error("UNEXPECTED_QUERY");
  }};
  f.checkCommit(async prepared=>{try{await actual.commitWithinTransaction(client as never,prepared,commerceNow);}catch(e){if(!(e instanceof Error)||e.message!=="SOURCE_GUARD_PASSED")throw e;}});
  const owner=vi.fn(async():Promise<OwnerGeneration>=>{throw new Error("PRIVATE_INPUT");});
  try{
    expect((await f.run(owner)).terminal.reason).toBe("PRIVATE_CHECKOUT_COMMITTED");
    expect(passed).toBe(1);expect(f.cycle().stage).toBe("HANDED_OFF");
    expect(owner).not.toHaveBeenCalled();expect(f.verifier).not.toHaveBeenCalled();
    const event=f.commit.mock.calls[0]![1].handoffEventPlan!;
    expect(event.triggerEventKey).toBe("receipt-image");expect(event.reasonDetailSafe).toMatchObject({attachmentCount:1});
    expect(JSON.stringify(event)).not.toContain("private-receipt");
  }finally{await actual.close();}
});

it("hands unknown customer media to staff with the first media message linkage and no provider exposure",async()=>{
  const f=fixture();f.enableHandoff();
  f.message.attachments=[{type:"image",url:"https://content.pancake.vn/private-receipt.jpg",providerId:"private-id"}] as never;
  f.message.text=null as never;
  const second={...f.message,messageId:"second-message",eventKey:"second-event",attachments:[],text:"Chị gửi rồi nhé"};
  // The attachment is in item 1, not the final text item.
  const owner=vi.fn(async()=>({kind:"FINAL" as const,text:"Dạ chị."}));
  f.appendMessage(second);
  const result=await f.run(owner);
  expect(result.terminal.disposition).toBe("HANDOFF");
  expect(owner).not.toHaveBeenCalled();expect(f.verifier).not.toHaveBeenCalled();
  expect(f.history.recordInboundCustomerMessage.mock.calls[0]![0]).toMatchObject({text:null,attachmentCount:1});
  const handoff=f.commit.mock.calls.find(c=>c[1].handoffEventPlan)![1].handoffEventPlan!;
  expect(handoff.triggerEventKey).toBe("current-message");
  expect(handoff.triggerMessagePk).toBe("90000000-0000-4000-8000-000000000001");
  expect(handoff.reasonDetailSafe).toMatchObject({attachmentCount:1});
  expect(JSON.stringify(handoff)).not.toContain("private-receipt");
});

it("does not fetch or expose hostile attachment URLs and preserves human ownership",async()=>{
  const f=fixture();f.enableHandoff();f.transferToHuman();
  f.message.attachments=[{type:"image",url:"http://127.0.0.1/secret"}] as never;
  const owner=vi.fn(async()=>({kind:"FINAL" as const,text:"Dạ chị."})),fetch=vi.spyOn(globalThis,"fetch");
  const result=await f.run(owner);
  expect(result.terminal.reason).toBe("HUMAN_OWNS_CONVERSATION");
  expect(fetch).not.toHaveBeenCalled();expect(owner).not.toHaveBeenCalled();expect(f.verifier).not.toHaveBeenCalled();expect(f.commit).not.toHaveBeenCalled();
});

it.each([{withCart:false,mediaProduct:"SM613"},{withCart:true,mediaProduct:"SM613"},{withCart:true,mediaProduct:"OTHER1"}])("enqueues approved media and exact final text in one protected response group ($withCart/$mediaProduct)",async ({withCart,mediaProduct})=>{
  const f=fixture(["SM613","OTHER1"]),p=f.products.find(p=>p.product.productId===mediaProduct)!.product;
  p.images=[{url:"https://content.pancake.vn/back.jpg",role:"PRIMARY",angle:"BACK",imageType:"PRODUCT_ONLY",intents:[],sortOrder:0,qualityScore:null,feedback:false,
    reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString()}];
  if(withCart){
    const scope=commerceScope(),policy=(await fixturePolicy()).bundle!.policy;
    let state=createSalesCycleRuntimeState(scope.conversationId,{pageId:scope.pageId,conversationId:scope.conversationId},commerceNow);
    for(const kind of ["FACTS_PRESENTED","MEASUREMENTS_REQUIRED","SIZE_RECOMMENDED"] as const)
      state=applySalesCycleCommand({state,expectedRevision:state.revision,command:{kind,commandId:kind},now:commerceNow}).state;
    const line=fixtureCartLine(),draft={identity:{cartId:"50000000-0000-4000-8000-000000000001",salesEpisodeId:"60000000-0000-4000-8000-000000000001",customerProfileId:fixtureProfile().profile.profileId},
      lines:[line],shopId:scope.shopId,policyRef:{id:policy.policyBundleId,version:policy.policyVersion,contentHash:computeBusinessContentHash(policy)}};
    state=applySalesCycleCommand({state,expectedRevision:state.revision,command:{kind:"CART_OPENED",commandId:"open",cartDraftRef:{id:"draft",version:"1",contentHash:computeBusinessContentHash(draft)},
      expiresAt:new Date(commerceNow.getTime()+1800000).toISOString()},now:commerceNow,
      trustedPorts:{resolveCartDraft:()=>draft,resolveShopPolicy:()=>policy,resolveCartMutation:()=>null,resolveInboundMessage:()=>null,revalidateCheckout:()=>null}}).state;
    f.setCycle(state);
    f.select.mockResolvedValue({status:"READY",line,shopId:scope.shopId,versions:{price:line.priceAuthority!.priceFactRef,inventory:"i1",size:"s1",eta:null},eta:null,etaExpiresAt:null,
      sourceAuthority:"POS_SNAPSHOT",stockStatus:"IN_STOCK",stockAvailableQuantity:4,sourceObservedAt:commerceNow.toISOString(),sourceExpiresAt:new Date(commerceNow.getTime()+1200000).toISOString()});
  }
  let generated=0;
  const result=await f.run(async()=>++generated===1
    ? {kind:"TOOLS",calls:[{name:"select_product_media",args:{subjectRef:p.productId,intent:"BACK"}}],content:{role:"model",parts:[{functionCall:{name:"select_product_media",args:{subjectRef:p.productId,intent:"BACK"}}}]}}
    : {kind:"FINAL",text:"Ảnh mặt sau đây chị nhé."});
  expect(result.terminal.disposition,JSON.stringify(result.terminal)).toBe("SEND_ELIGIBLE");
  expect(result.enqueued).toBe(2);
  const meta=f.commit.mock.calls.at(-1)![1].metaPlan!;
  expect(meta.messages).toEqual([{kind:"TEXT",text:"Ảnh mặt sau đây chị nhé."},{kind:"IMAGE",imageUrl:p.images[0]!.url}]);
  expect(meta.protectedClaimTypes).toContain("PRODUCT_MEDIA");
  expect(meta.effectReadiness?.outcome).toBe("READY");
  if(withCart){
    const prepared=f.commit.mock.calls.at(-1)![1],parent=prepared.salesCyclePlan!.effectReadiness![0]!;
    expect(parent.productIds).toEqual(["SM613"]);
    expect(meta.effectReadiness!.productIds).toEqual([...new Set(["SM613",mediaProduct])].sort());
    expect(meta.effectReadiness!.binding.cart).toEqual(parent.binding.cart);
    expect(f.cycle().cart!.value.lines.map(l=>l.parentProductId)).toEqual(["SM613"]);
  }
  expect(f.verifier).toHaveBeenCalledTimes(1);
});

it.each([
  {previous:"SM613",text:"Mẫu này chất gì em?",ad:null,expected:"SM613"},
  {previous:"SM613",text:"Bộ này bao nhiêu em?",ad:"OTHER1",expected:"OTHER1"},
  {previous:"SM613",text:"Cho chị xem SM613 nhé",ad:"OTHER1",expected:"SM613"},
  {previous:"SM613",text:"Bộ này bao nhiêu em?",ad:"UNKNOWN999",expected:null},
])("binds current context from verified explicit/ad/state sources without guessing from reads ($expected)", async sample => {
  const f=fixture(["SM613","OTHER1"]); f.setFocus(sample.previous); f.message.text=sample.text;
  if(sample.ad) Object.assign(f.message,{adsContext:{source:"ADS",adTitle:sample.ad,postId:null,adId:null,ref:null}});
  let context: OwnerRequest["context"] | undefined;
  await f.run(async request=>{context=request.context;return {kind:"FINAL",text:"Dạ chị."};});
  expect(context!.state.currentProductId).toBe(sample.expected);
  if(sample.expected) expect(context!.boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===sample.expected)).toBe(true);
  else expect(context!.boundSubjects.filter(s=>s.kind==="PRODUCT")).toEqual([]);
});

it("fills the public history window after private rows without duplicating the latest batch", async () => {
  const f = fixture();
  const publicRows = Array.from({length:8},(_,i)=>({senderType:i%2 ? "BOT" : "CUSTOMER",text:`Tin công khai ${i}`}));
  const rows = [...publicRows,...Array.from({length:22},()=>({senderType:"CUSTOMER",text:"[PII_REDACTED_MESSAGE]"}))];
  f.history.listConversationHistory.mockImplementation(async (...args: unknown[]) => rows.slice(-(args[1] as {limit:number}).limit));
  let captured: OwnerRequest | undefined;
  await f.run(async request => {captured = request; return {kind:"FINAL",text:"Dạ chị."};});
  expect(f.history.listConversationHistory).toHaveBeenCalledWith(commerceScope().conversationId,{before:commerceNow,limit:30});
  expect(captured!.contents.slice(0,-1).map(m=>m.parts[0]!.text)).toEqual(publicRows.map(r=>r.text));
  expect(captured!.contents.at(-1)!.parts[0]!.text).toBe(f.message.text);
  expect(JSON.stringify(captured!)).not.toContain("[PII_REDACTED_MESSAGE]");
});

it.each(["Nguyễn Thị Lan", "Khoan, áo này giặt máy được không em?"])("keeps pending checkout input private before history or either model (%s)", async text => {
  const f = fixture(), scope = commerceScope(), resolution = await fixturePolicy(), policy = resolution.bundle!.policy;
  f.policy.mockResolvedValue({...resolution,mayAffectOutbound:true,bundle:{...resolution.bundle!,channel:"PUBLISHED",sideEffects:"LIVE_OUTBOUND"}});
  let state = createSalesCycleRuntimeState(scope.conversationId,{pageId:scope.pageId,conversationId:scope.conversationId},commerceNow);
  for (const kind of ["FACTS_PRESENTED","MEASUREMENTS_REQUIRED","SIZE_RECOMMENDED"] as const)
    state = applySalesCycleCommand({state,expectedRevision:state.revision,command:{kind,commandId:kind},now:commerceNow}).state;
  const draft = {identity:{cartId:"50000000-0000-4000-8000-000000000001",salesEpisodeId:"60000000-0000-4000-8000-000000000001",customerProfileId:fixtureProfile().profile.profileId},
    lines:[fixtureCartLine()],shopId:scope.shopId,policyRef:{id:policy.policyBundleId,version:policy.policyVersion,contentHash:computeBusinessContentHash(policy)}};
  state = applySalesCycleCommand({state,expectedRevision:state.revision,command:{kind:"CART_OPENED",commandId:"open",cartDraftRef:{id:"draft",version:"1",contentHash:computeBusinessContentHash(draft)},
    expiresAt:new Date(commerceNow.getTime()+1800000).toISOString()},now:commerceNow,
    trustedPorts:{resolveCartDraft:()=>draft,resolveShopPolicy:()=>policy,resolveCartMutation:()=>null,resolveInboundMessage:()=>null,revalidateCheckout:()=>null}}).state;
  state = applySalesCycleCommand({state,expectedRevision:state.revision,command:{kind:"CLARIFICATION_REQUESTED",commandId:"asked",reasonCode:"CHECKOUT_DETAILS_MISSING",missingFields:["FULL_NAME"],
    productId:"SM613",questionFingerprint:"f".repeat(64),maxAttempts:3},now:commerceNow}).state;
  f.setCycle(state); f.message.text = text;
  const owner = vi.fn(async (): Promise<OwnerGeneration> => ({kind:"FINAL",text:"This must not run"}));
  expect(await f.run(owner)).toMatchObject({mode:"PRIVATE_CODE_PATH",enqueued:1});
  expect(owner).not.toHaveBeenCalled(); expect(f.verifier).not.toHaveBeenCalled();
  expect(f.history.recordInboundCustomerMessage).toHaveBeenCalledWith(expect.objectContaining({text:null}));
  expect(f.history.listConversationHistory).not.toHaveBeenCalled();
  const prepared = f.commit.mock.calls.at(-1)![1];
  expect(prepared.salesCyclePlan?.state).toMatchObject({checkoutDraft:text.startsWith("Nguyễn") ? {fullName:text} : null});
  expect(JSON.stringify(prepared.metaPlan?.messages)).not.toContain(text);
});

it("starts the independent generation read while current authority is being loaded", async () => {
  const f = fixture(), load = f.store.loadOrCreate;
  let loads = 0, generationReads = 0;
  vi.spyOn(f.inbox, "readGeneration").mockImplementation(async () => { generationReads++; return 1; });
  vi.spyOn(f.store, "loadOrCreate").mockImplementation(async () => {
    if (++loads === 2) { await Promise.resolve(); expect(generationReads).toBeGreaterThan(0); }
    return load();
  });
  expect((await f.run()).terminal.disposition).toBe("SEND_ELIGIBLE");
  expect(f.commit.mock.calls[0]![1].expectedStateVersion).toBe(1);
});

describe("persisted ingress source and final revision", () => {
  it.each([{named:true,split:false},{named:false,split:false},{named:true,split:true}])("reaches the actual private preview without model or extra catalog reads (named=$named, separate fields=$split)", async ({named,split}) => {
    const f = fixture(named ? ["SM613"] : ["OTHER42"]), scope = commerceScope();
    if (named) f.products[0]!.product.title = "Set váy thử nghiệm";
    const resolution = await fixturePolicy(), policy = resolution.bundle!.policy;
    f.policy.mockResolvedValue({ ...resolution, mayAffectOutbound: true,
      bundle: { ...resolution.bundle!, channel: "PUBLISHED", sideEffects: "LIVE_OUTBOUND" } });
    let state = createSalesCycleRuntimeState(scope.conversationId, { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
    for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const)
      state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind, commandId: kind }, now: commerceNow }).state;
    const line = fixtureCartLine();
    const draft = { identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001", customerProfileId: fixtureProfile().profile.profileId },
      lines: [line], shopId: scope.shopId, policyRef: { id: policy.policyBundleId, version: policy.policyVersion, contentHash: computeBusinessContentHash(policy) } };
    state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "open",
      cartDraftRef: { id: "draft", version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(commerceNow.getTime()+1800000).toISOString() }, now: commerceNow,
      trustedPorts: { resolveCartDraft: () => draft, resolveShopPolicy: () => policy, resolveCartMutation: () => null, resolveInboundMessage: () => null, revalidateCheckout: () => null } }).state;
    if (split) state = applySalesCycleCommand({state,expectedRevision:state.revision,command:{kind:"CLARIFICATION_REQUESTED",commandId:"ask-name",
      reasonCode:"CHECKOUT_DETAILS_MISSING",missingFields:["FULL_NAME"],productId:"SM613",questionFingerprint:"f".repeat(64),maxAttempts:3},now:commerceNow}).state;
    f.setCycle(state);
    f.select.mockResolvedValue({ status: "READY", line, shopId: scope.shopId, versions: { price: line.priceAuthority!.priceFactRef, inventory: "i1", size: "s1", eta: "e1" },
      eta: { minDays: 8, maxDays: 14 }, etaExpiresAt: new Date(commerceNow.getTime()+1200000).toISOString(),
      sourceAuthority: "POS_SNAPSHOT", stockStatus: "PRE_ORDER", stockAvailableQuantity: 0,
      sourceObservedAt: commerceNow.toISOString(), sourceExpiresAt: new Date(commerceNow.getTime()+1200000).toISOString() });
    f.message.text = "Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\nCOD";
    const owner = vi.fn(async (): Promise<OwnerGeneration> => { throw new Error("PRIVATE_TURN_MUST_NOT_GENERATE"); });
    if (split) {
      const answers = [
        {text:"Khách Thử Nghiệm",next:"PHONE",draft:{fullName:"Khách Thử Nghiệm"}},
        {text:"0900000000",next:"ADDRESS",draft:{phone:"0900000000"}},
        {text:"12 Đường Số 3, Quận 7, TP.HCM",next:"PAYMENT_METHOD",draft:{address:"12 Đường Số 3, Quận 7, TP.HCM"}},
      ];
      for (const [i,answer] of answers.entries()) {
        f.message.text=answer.text;f.message.eventKey=f.message.messageId=`private-field-${i}`;
        f.batch.evaluationGroupId=`private-field-${i}`; f.supersede();f.newGeneration();
        expect(await f.run(owner)).toMatchObject({mode:"PRIVATE_CODE_PATH",enqueued:1});
        expect(f.cycle().checkoutDraft).toMatchObject(answer.draft);
        expect(f.cycle().clarification?.missingFields).toEqual([answer.next]);
        expect(f.commit.mock.calls.at(-1)![1].metaPlan?.messages).toHaveLength(1);
      }
      f.message.text="COD";f.message.eventKey=f.message.messageId="private-payment";
      f.batch.evaluationGroupId="private-payment";f.supersede();f.newGeneration();
    }
    const result = await f.run(owner);
    expect(result, JSON.stringify(result)).toMatchObject({ mode: "PRIVATE_CODE_PATH", enqueued: 1 });
    expect(owner).not.toHaveBeenCalled(); expect(f.verifier).not.toHaveBeenCalled(); expect(f.catalogRead).not.toHaveBeenCalled();
    expect(f.history.recordInboundCustomerMessage.mock.calls.every(([input])=>(input as {text:unknown}).text===null)).toBe(true);
    const meta = f.commit.mock.calls.at(-1)![1].metaPlan!;
    const text = meta.messages.map(m => m.kind === "TEXT" ? m.text : "").join("\n");
    expect(text).toContain(named ? "1 áo (mẫu “Set váy thử nghiệm”) màu navy, size M" : "1 áo SM613 màu navy, size M");
    expect(text).toContain(named ? "Set váy thử nghiệm: hàng đặt trước" : "SM613: hàng đặt trước");
    expect(text).toContain("Tổng: 524.000đ"); expect(text).toContain("8-14 ngày");
    expect(meta.effectReadiness!.outcome).toBe("READY");
    expect(f.commit.mock.calls.at(-1)![1].salesCyclePlan).toMatchObject({ state: { cart: { value: { lines: [line] } } } });
  });

  it.each(["READY", "PRICE_CHANGED", "UNAVAILABLE"] as const)("binds a code-owned cart summary to current cart/fact readiness before enqueue (%s)", async source => {
    const f = fixture(), scope = commerceScope(), policy = (await fixturePolicy()).bundle!.policy;
    let state = createSalesCycleRuntimeState(scope.conversationId, { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
    for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const) state = applySalesCycleCommand({ state,
      expectedRevision: state.revision, command: { kind, commandId: kind }, now: commerceNow }).state;
    const draft = { identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001", customerProfileId: fixtureProfile().profile.profileId },
      lines: [fixtureCartLine()], shopId: scope.shopId, policyRef: { id: policy.policyBundleId, version: policy.policyVersion, contentHash: computeBusinessContentHash(policy) } };
    state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "open",
      cartDraftRef: { id: "draft", version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(commerceNow.getTime()+1800000).toISOString() }, now: commerceNow,
      trustedPorts: { resolveCartDraft: () => draft, resolveShopPolicy: () => policy, resolveCartMutation: () => null, resolveInboundMessage: () => null, revalidateCheckout: () => null } }).state;
    f.setCycle(state);
    const selected: Extract<CartSelectionResult, { status: "READY" }> = { status: "READY", line: fixtureCartLine(), shopId: scope.shopId,
      versions: { price: fixtureCartLine().priceAuthority!.priceFactRef, inventory: "i1", size: "s1", eta: null }, eta: null, etaExpiresAt: null,
      sourceAuthority: "POS_SNAPSHOT", stockStatus: "IN_STOCK", stockAvailableQuantity: 4,
      sourceObservedAt: commerceNow.toISOString(), sourceExpiresAt: new Date(commerceNow.getTime()+1_200_000).toISOString() };
    f.select.mockResolvedValue(selected);
    const create = composition.createCommerceTools;
    vi.spyOn(composition, "createCommerceTools").mockImplementation(async input => {
      const tools = await create(input); await tools.readback();
      return { ...tools, recover: async () => ({ disposition: "SEND_ELIGIBLE", reason: "RECEIPT_BACKED_CART_SUMMARY",
        text: "Tổng 524.000đ, đã gồm phí giao hàng.", fallbackId: null }), async readback() {
        const world = await tools.readback();
        if (source === "UNAVAILABLE") f.select.mockResolvedValue({ status: "INVALID", reasonCode: "SOURCE_UNAVAILABLE", availableSizes: [], availableColors: [] });
        if (source === "PRICE_CHANGED") f.select.mockResolvedValue({ ...selected, line: { ...selected.line, posUnitPriceVnd: 600_000, lineTotalVnd: 600_000 } });
        return world;
      } };
    });
    const result = await f.run(async () => { throw new Error("owner unavailable"); });
    expect(f.verifier).not.toHaveBeenCalled();
    if (source === "READY") {
      expect(result.enqueued, JSON.stringify(result.terminal)).toBe(1);
      const meta = f.commit.mock.calls[0]![1].metaPlan!;
      expect(meta.effectReadiness!.binding.cart).toMatchObject({ cartId: draft.identity.cartId, cartRevision: state.cart!.value.revision });
      expect(meta.protectedClaimTypes).toEqual(expect.arrayContaining(["PRICE", "STOCK", "SHIPPING_FEE"]));
    } else {
      expect(result).toMatchObject({ enqueued: 0, terminal: { disposition: "NO_SEND", reason: "EGRESS_CART_SOURCE_CHANGED" } });
      expect(f.commit).not.toHaveBeenCalled();
    }
  });
  it.each([{ ids: [] }, { ids: ["SM613", "OTHER1", "OTHER2"] }])("enqueues a code-owned fallback without unrelated product coverage ($ids)", async ({ ids }) => {
    const f = fixture(ids), result = await f.run(async () => { throw new Error("provider unavailable"); });
    expect(result.terminal.disposition).toBe("FALLBACK"); expect(result.enqueued).toBe(1);
    expect(f.verifier).not.toHaveBeenCalled();
    const meta = f.commit.mock.calls[0]![1].metaPlan!;
    expect(meta.protectedClaims).toEqual([]); expect(meta.effectReadiness).toMatchObject({ outcome: "READY", productIds: [], cartId: null });
    expect(meta.sourceMessageIdHash).toBeTruthy();
  });
  it("enqueues a policy-only generated reply without a product and still verifies it", async () => {
    const f = fixture([]), outputs: OwnerGeneration[] = [{ kind: "TOOLS", calls: [{ name: "read_policy", args: {} }],
      content: { role: "model", parts: [{ functionCall: { name: "read_policy", args: {} } }] } },
    { kind: "FINAL", text: "Shop có hỗ trợ đổi hàng chị nhé." }];
    const result = await f.run(async () => outputs.shift()!);
    expect(result.terminal.reason).toBe("PASS"); expect(result.enqueued).toBe(1); expect(f.verifier).toHaveBeenCalledOnce();
    expect(f.commit.mock.calls[0]![1].metaPlan!.effectReadiness!.productIds).toEqual([]);
  });
  it("binds only products with actual verified claims after other candidates were loaded", async () => {
    const f = fixture(["SM613", "OTHER1", "OTHER2"]), outputs: OwnerGeneration[] = [{ kind: "TOOLS", calls: [{ name: "read_product", args: { subjectRef: "SM613" } }],
      content: { role: "model", parts: [{ functionCall: { name: "read_product", args: { subjectRef: "SM613" } } }] } },
    { kind: "FINAL", text: "Áo SM613 giá 499k chị nhé." }];
    const result = await f.run(async () => outputs.shift()!);
    expect(result.terminal.reason).toBe("PASS"); expect(result.enqueued).toBe(1);
    expect(f.commit.mock.calls[0]![1].metaPlan!.effectReadiness!.productIds).toEqual(["SM613"]);
  });
  it("enqueues a static fallback when an existing cart cannot be refreshed", async () => {
    const f = fixture(), scope = commerceScope(), policy = (await fixturePolicy()).bundle!.policy;
    let state = createSalesCycleRuntimeState(scope.conversationId, { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
    for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const) state = applySalesCycleCommand({ state,
      expectedRevision: state.revision, command: { kind, commandId: kind }, now: commerceNow }).state;
    const draft = { identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001", customerProfileId: fixtureProfile().profile.profileId },
      lines: [fixtureCartLine()], shopId: scope.shopId, policyRef: { id: policy.policyBundleId, version: policy.policyVersion, contentHash: computeBusinessContentHash(policy) } };
    state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "open",
      cartDraftRef: { id: "draft", version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(commerceNow.getTime()+1800000).toISOString() }, now: commerceNow,
      trustedPorts: { resolveCartDraft: () => draft, resolveShopPolicy: () => policy, resolveCartMutation: () => null, resolveInboundMessage: () => null, revalidateCheckout: () => null } }).state;
    f.setCycle(state);
    const result = await f.run(async () => { throw new Error("provider unavailable"); });
    expect(result.terminal.disposition).toBe("FALLBACK"); expect(result.enqueued).toBe(1);
    const prepared = f.commit.mock.calls[0]![1];
    expect(prepared.salesCyclePlan).toMatchObject({ expectedRevision: state.revision, state, events: [] });
    expect(prepared.salesCyclePlan!.effectReadiness).toBeUndefined(); expect(prepared.metaPlan!.effectReadiness!.binding.cart).toBeNull();
  });
  it("does not write customer state after a newer Inbox generation arrives during owner generation", async () => {
    const f = fixture();
    const result = await f.run(async () => {
      f.supersede();
      return { kind: "TOOLS", calls: [{ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 85, sourceQuote: "85" }] } }],
        content: { role: "model", parts: [] } };
    });
    expect(result.terminal.disposition).toBe("NO_SEND");
    expect(f.profile().profile.measurements.find(m => m.kind === "WAIST_CM")!.value).toBe(74);
    expect(f.profileWrite).not.toHaveBeenCalled();
  });
  it("does not rebase a verified reply onto a conversation revision changed after final tools readback", async () => {
    const f = fixture(), create = composition.createCommerceTools;
    vi.spyOn(composition, "createCommerceTools").mockImplementation(async input => {
      const tools = await create(input); let readbacks = 0;
      return { ...tools, async readback() {
        const world = await tools.readback();
        // First readback is the verifier final gate; the second is the ingress handoff to Outbox.
        if (++readbacks === 2) f.changeRevision();
        return world;
      } };
    });
    const result = await f.run();
    expect(f.verifier).toHaveBeenCalledOnce();
    expect(result.terminal).toMatchObject({ disposition: "NO_SEND", reason: "EGRESS_WORLD_CHANGED" });
    expect(f.commit).not.toHaveBeenCalled();
  });
  it("does not write customer state after authority transfers to a human during generation", async () => {
    const f = fixture();
    const result = await f.run(async () => {
      f.transferToHuman();
      return { kind: "TOOLS", calls: [{ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 85, sourceQuote: "85" }] } }],
        content: { role: "model", parts: [] } };
    });
    expect(result.terminal.disposition).toBe("NO_SEND");
    expect(f.profileWrite).not.toHaveBeenCalled();
    expect(f.profile().profile.revision).toBe(1);
  });
  it("enqueues an unchanged verified world with precisely its conversation revision", async () => {
    const f = fixture(), result = await f.run();
    expect(result.terminal).toMatchObject({ disposition: "SEND_ELIGIBLE", reason: "PASS" });
    expect(result.enqueued).toBe(1);
    expect(f.commit.mock.calls[0]![1].expectedStateVersion).toBe(1);
    expect(f.commit.mock.calls[0]![1].metaPlan!.effectReadiness!.binding.conversationRevision).toBe(1);
  });
});

it("reports exact binding mismatch without sending when egress readback changes",async()=>{
 const f=fixture();const create=composition.createCommerceTools;
 vi.spyOn(composition,"createCommerceTools").mockImplementation(async input=>{
  const tools=await create(input);let reads=0;return {...tools,async readback(){const world=await tools.readback();if(++reads===2)world.state.factSnapshotVersion="changed-at-egress";return world;}};
 });
 const result=await f.run();expect(result).toMatchObject({terminal:{disposition:"NO_SEND",reason:"EGRESS_WORLD_CHANGED"},egressDiagnostic:{kind:"TRUSTED_SNAPSHOT",changedBindingFields:expect.arrayContaining(["trustedSnapshotId","factSnapshotVersion"])}});
 expect(f.commit.mock.calls.flatMap(c=>c[1].metaPlan?.messages??[])).toEqual([]);
});

it.each(["ad","organic","returning","private-history"])("provides opening context from actual ingress history: %s",async mode=>{
 const f=fixture();f.message.text="SM613 bao nhiêu em?";
 if(mode==="ad")Object.assign(f.message,{adsContext:{source:"ADS",adTitle:"SM613",postId:null,adId:null,ref:null}});
 if(mode==="returning"||mode==="private-history")f.history.listConversationHistory.mockResolvedValue([{senderType:"CUSTOMER",text:mode==="private-history"?"[PII_REDACTED_MESSAGE]":"Hôm qua chị xem mẫu này."}]);
 let request:OwnerRequest|undefined;
 await f.run(async r=>{request=r;return {kind:"FINAL",text:"Dạ chị."};});
 const entry=JSON.parse(request!.context.policyLiterals.find(p=>p.ref==="conversation-entry")!.text);
 expect(entry).toEqual({firstContact:mode==="ad"||mode==="organic",fromAd:mode==="ad"});
});

it("passes the opening card and chosen images through the existing verifier and egress group",async()=>{
 const f=fixture(),p=f.products[0]!.product;f.message.text="Bộ này bao nhiêu em?";
 Object.assign(f.message,{adsContext:{source:"ADS",adTitle:p.productId,postId:null,adId:null,ref:null}});
 p.images=[{url:"https://content.pancake.vn/front.jpg",role:"PRIMARY",angle:"FRONT",imageType:"MODEL",intents:[],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
 let draft="",n=0;
 const calls=[{name:"read_product",args:{subjectRef:p.productId}},{name:"select_product_media",args:{subjectRef:p.productId,intent:"GENERIC"}}];
 const result=await f.run(async r=>{
 if(++n===1)return {kind:"TOOLS",calls,content:{role:"model",parts:calls.map(c=>({functionCall:c}))}};
 const reply=r.contents.at(-1)!.parts[0] as {functionResponse:{response:{data:{openingQuote:{text:string}}}}};
 draft=reply.functionResponse.response.data.openingQuote.text;
 return {kind:"FINAL",text:draft};
 });
 expect(draft).toContain("499.000đ");expect(result.terminal.text).toBe(draft);
 expect(f.verifier).toHaveBeenCalledTimes(1);
 expect(f.commit.mock.calls.at(-1)![1].metaPlan!.messages).toEqual([{kind:"TEXT",text:draft},{kind:"IMAGE",imageUrl:p.images[0]!.url}]);
});

it.each(["ad", "explicit", "missing-ad"])("composes ingress with the real scoped source adapter and no product seed: %s", async mode => {
  const f = fixture(), product = fixtureProduct();
  const exact = vi.fn(async (code: string) => code === product.product.canonicalCode ? product.product : null);
  const searchText = vi.fn(async () => ({ status: "NOT_FOUND" as const, reasonCode: "NO_CANDIDATES" as const }));
  const readCatalogSnapshot = vi.fn(async () => product.snapshot);
  const read = createCommerceReadSources({ scope: commerceScope(), channel: "PUBLISHED", clock: () => commerceNow,
    catalog: { findByExactCode: exact }, search: { searchText }, facts: { readCatalogSnapshot },
    policyStore: { loadActivePointers: async () => fixturePolicyPointers() } });
  f.setRead({ ...read, initialProducts: [] });
  f.message.text = mode === "explicit" ? "SM613 bao nhiêu em?" : "Mẫu này bao nhiêu em?";
  if (mode !== "explicit") Object.assign(f.message, { adsContext: { source: "ADS", adTitle: mode === "ad" ? "SM613" : "UNKNOWN999", postId: null, adId: null, ref: null } });
  let request: OwnerRequest | undefined, draft = "";
  const result = await f.run(async r => {
    request = r;
    if (mode === "missing-ad") return { kind: "FINAL", text: "Chị gửi em ảnh mẫu nhé." };
    const response = r.contents.flatMap(c => c.parts).find(p => p.functionResponse)?.functionResponse;
    if (!response) {
      const calls = [{ name: "read_product", args: { subjectRef: "SM613", offerType: "DIRECT" } }];
      return { kind: "TOOLS", calls, content: { role: "model", parts: calls.map(c => ({ functionCall: c })) } };
    }
    draft = (response as { response: { data: { openingQuote: { text: string } } } }).response.data.openingQuote.text;
    return { kind: "FINAL", text: draft };
  });
  expect(searchText).not.toHaveBeenCalled();
  if (mode === "missing-ad") {
    expect(request!.context.state.currentProductId).toBeNull();
    expect(request!.context.boundSubjects).toEqual([]);
    expect(readCatalogSnapshot).not.toHaveBeenCalled();
  } else {
    expect(request!.context.state.currentProductId).toBe("SM613");
    expect(draft).toContain("499.000đ");
    expect(result.terminal.text).toBe(draft);
    expect(f.verifier).toHaveBeenCalledTimes(1);
  }
});
