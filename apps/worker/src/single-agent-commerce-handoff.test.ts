import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import { createCommerceHandoffTools, selectCommerceHandoff, type HandoffAuthority } from "./single-agent-commerce-handoff.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { runCommerceTurn, type OwnerRequest } from "./single-agent-commerce-read-only.js";
import { commerceNow, commerceScope, fixturePolicy, fixtureProduct, policyResolver } from "./single-agent-commerce.test-support.js";

async function setup() {
  const scope = commerceScope(), policy = (await fixturePolicy()).bundle!;
  let current: HandoffAuthority = { ...scope, fence: 1, state: { ...createConversationState({ conversationId: scope.conversationId,
    routingOwner: "APP", now: commerceNow }), revision: scope.revision }, stateVersion: scope.revision };
  const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: () => fixturePolicy(),
    catalog: { readProduct: async () => { throw new Error("NOT_READ"); }, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  const read = vi.fn(async () => structuredClone(current));
  const commit = vi.fn(async (next: HandoffAuthority) => { current = structuredClone(next); return true; });
  const tools = createCommerceHandoffTools({ base, scope, clock: () => commerceNow, policy: async () => policy, read,
    commit: async ({ next }) => commit(next) });
  return { scope, policy, base, read, commit, tools, current: () => current,
    change: (patch: Partial<HandoffAuthority>) => { current = { ...current, ...patch }; } };
}
describe("Phase B handoff follows current code policy and committed ownership", () => {
  it("uses the configured terminal after a partial POS-unavailable read without pretending to send the known product details", async () => {
    const s = await setup(), { product } = fixtureProduct();
    const base = createReadOnlyTools({ scope: s.scope, clock: () => commerceNow, policy: () => fixturePolicy(), initialProducts: [product],
      catalog: { readProduct: async () => ({ product, snapshot: null }), searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
    const holding = "Shop đã nhận yêu cầu hỗ trợ của chị.";
    Object.assign(s.policy.artifacts, { handoffMatrix: { schemaVersion: 1, kind: "HANDOFF_MATRIX", sourceMetadata: s.policy.artifacts.shopPolicy.sourceMetadata,
      rules: [{ reason: "DEPENDENCY_FAILURE", customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF", holdingReply: holding, tag: "NHAN_VIEN" }] } });
    const tools = createCommerceHandoffTools({ base, scope: s.scope, clock: () => commerceNow, policy: async () => s.policy,
      read: s.read, commit: async ({ next }) => s.commit(next) });
    let calls = 0;
    const owner = vi.fn(async (request: OwnerRequest) => {
      if (++calls === 2) expect((request.contents.at(-1)!.parts[0]!.functionResponse as { response: unknown }).response)
        .toMatchObject({ status: "OK", data: { availability: { stock: { status: "UNAVAILABLE", reason: "POS_SNAPSHOT_UNAVAILABLE" } } } });
      return calls === 1 ? { kind: "TOOLS" as const,
      calls: [{ name: "read_product", args: { subjectRef: product.productId } }],
      content: { role: "model" as const, parts: [{ functionCall: { name: "read_product", args: { subjectRef: product.productId } } }] } }
      : { kind: "TOOLS" as const, calls: [{ name: "request_handoff", args: { reason: "DEPENDENCY_FAILURE" } }],
        content: { role: "model" as const, parts: [{ functionCall: { name: "request_handoff", args: { reason: "DEPENDENCY_FAILURE" } } }] } };
    });
    const verifier = vi.fn(), result = await runCommerceTurn({ scope: s.scope, clock: () => commerceNow, tools, owner, verifier,
      latest: "Áo chất gì, còn size M không em?", history: [], ownerPrompt: "Tư vấn", verifierPrompt: "Kiểm reply" });
    expect(base.snapshot().runtimeProducts).toEqual(expect.arrayContaining([expect.objectContaining({ attributes: expect.objectContaining({ materials: product.attributes!.materials }) })]));
    expect(result.terminal).toMatchObject({ disposition: "HANDOFF", reason: "DEPENDENCY_FAILURE", text: holding });
    expect(owner).toHaveBeenCalledTimes(2); expect(verifier).not.toHaveBeenCalled(); expect(s.commit).toHaveBeenCalledTimes(1);
    expect(s.current().state.conversationOwner).toBe("HUMAN");
  });
  it("refreshes its authority snapshot when checkout commits the handoff in the underlying effect port", async () => {
    const s = await setup(); let checkoutCommitted = false;
    const tools = createCommerceHandoffTools({ base: { ...s.base, terminalOutcome: async () => checkoutCommitted ? { disposition: "HANDOFF", reason: "PURCHASE_CONFIRMED", text: null, fallbackId: null } : null },
      scope: s.scope, clock: () => commerceNow, policy: async () => s.policy, read: s.read, commit: async () => false });
    await tools.terminalOutcome!();
    s.change({ stateVersion: 2, permission: false, state: { ...s.current().state, revision: 2, conversationOwner: "HUMAN" } }); checkoutCommitted = true;
    expect(await tools.terminalOutcome!()).toMatchObject({ disposition: "HANDOFF" });
    expect(tools.snapshot().state).toMatchObject({ revision: 2, conversationOwner: "HUMAN", permission: false });
  });
  it("uses the configured rule and forbids model-authored messages, tags or identity", async () => {
    const s = await setup();
    Object.assign(s.policy.artifacts, { handoffMatrix: { schemaVersion: 1, kind: "HANDOFF_MATRIX", sourceMetadata: s.policy.artifacts.shopPolicy.sourceMetadata,
      rules: [{ reason: "EXCHANGE", customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF", holdingReply: "Shop đã nhận yêu cầu đổi hàng của chị.", tag: "VAN_DON" }] } });
    expect(selectCommerceHandoff(s.policy, s.scope, "EXCHANGE", commerceNow).customerMessages).toEqual(["Shop đã nhận yêu cầu đổi hàng của chị."]);
    await expect(s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE", tag: "NHAN_VIEN" } })).resolves.toMatchObject({ status: "REJECTED" });
    expect(s.commit).not.toHaveBeenCalled();
    expect(await s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).toMatchObject({ status: "OK" });
    expect(s.current().state.conversationOwner).toBe("HUMAN");
    expect(await s.tools.terminalOutcome!()).toMatchObject({ disposition: "HANDOFF", text: "Shop đã nhận yêu cầu đổi hàng của chị." });
  });
  it("uses existing defaults only when the optional matrix is absent; invalid or missing rules fail closed", async () => {
    const s = await setup();
    expect(selectCommerceHandoff(s.policy, s.scope, "CUSTOMER_REQUESTED_HUMAN", commerceNow)).toMatchObject({ tag: "NHAN_VIEN", customerMessages: [] });
    Object.assign(s.policy.artifacts, { handoffMatrix: { schemaVersion: 1, kind: "HANDOFF_MATRIX", sourceMetadata: s.policy.artifacts.shopPolicy.sourceMetadata,
      rules: [{ reason: "EXCHANGE", customerMessagePolicy: "SILENT_HANDOFF", holdingReply: null, tag: "NHAN_VIEN" }] } });
    await expect(s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).resolves.toMatchObject({ status: "UNAVAILABLE" });
    await expect(s.tools.invoke({ name: "request_handoff", args: { reason: "CUSTOMER_REQUESTED_HUMAN" } })).resolves.toMatchObject({ status: "REJECTED",reason:"HANDOFF_ALREADY_ATTEMPTED" });
    expect(s.commit).not.toHaveBeenCalled();
  });
  it("denies changed scope, privacy, permission or revision before committing", async () => {
    for (const patch of [{ recipient: "other" }, { bindingVersion: "new" }, { permission: false }, { privacyAllowed: false }, { stateVersion: 2 }, { fence: 0 }]) {
      const s = await setup(); s.change(patch);
      expect((await s.tools.invoke({ name: "request_handoff", args: { reason: "CUSTOMER_REQUESTED_HUMAN" } })).status).toBe("REJECTED");
      expect(s.commit).not.toHaveBeenCalled();
    }
  });
  it("does not acknowledge a lost CAS or an unproved commit", async () => {
    const s = await setup(); s.commit.mockResolvedValue(false);
    expect((await s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).status).toBe("REJECTED");
    expect(await s.tools.terminalOutcome!()).toMatchObject({disposition:"NO_SEND",reason:"HANDOFF_BLOCKED"});
    expect((await s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).status).toBe("REJECTED");
    expect(s.commit).toHaveBeenCalledTimes(1);
    const unknown=await setup();unknown.commit.mockRejectedValue(new Error("ambiguous response"));
    expect((await unknown.tools.invoke({name:"request_handoff",args:{reason:"EXCHANGE"}})).status).toBe("UNAVAILABLE");
    expect(await unknown.tools.terminalOutcome!()).toMatchObject({disposition:"NO_SEND",text:null});
    await unknown.tools.invoke({name:"request_handoff",args:{reason:"EXCHANGE"}});expect(unknown.commit).toHaveBeenCalledOnce();
  });
  it("invalidates a handoff acknowledgement after changed authority or policy", async () => {
    const s = await setup(); await s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } });
    s.change({ recipient: "other" });
    expect(await s.tools.terminalOutcome!()).toMatchObject({ disposition: "NO_SEND", text: null });
    s.change({ recipient: s.scope.recipient }); Object.assign(s.policy, { versionReferences: s.policy.versionReferences.map((r,i) =>
      i === 0 ? { ...r, pointerRevision: r.pointerRevision+1 } : r) });
    expect(await s.tools.terminalOutcome!()).toMatchObject({ disposition: "NO_SEND", text: null });
    expect(s.commit).toHaveBeenCalledTimes(1);
  });
  it("does not mistake the next fetch time for a changed policy identity", async () => {
    const s = await setup(); let sequence = 0;
    const tools = createCommerceHandoffTools({ base:s.base,scope:s.scope,clock:()=>new Date(commerceNow.getTime()+1000),read:s.read,
      commit:async({next})=>s.commit(next), policy:async()=>{
        const r=await policyResolver().resolve({pageId:s.scope.pageId,channel:"CANARY_SHADOW",now:new Date(commerceNow.getTime()+(++sequence))});
        return r.bundle!;
      } });
    expect((await tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).status).toBe("OK");
    expect(await tools.terminalOutcome!()).toMatchObject({ disposition: "HANDOFF" });
  });
  it("rejects a mixed handoff batch without committing handoff or sibling effects", async () => {
    const s = await setup(), owner = vi.fn(async () => ({ kind: "TOOLS" as const,
      calls: [{ name: "request_handoff", args: { reason: "CUSTOMER_REQUESTED_HUMAN" } }, { name: "add_to_cart", args: { subjectRef: "invented" } }],
      content: { role: "model" as const, parts: [{ functionCall: { name: "request_handoff", args: { reason: "CUSTOMER_REQUESTED_HUMAN" } } }] } }));
    const invokeBatch = vi.spyOn(s.base, "invokeBatch"), verifier = vi.fn();
    const r = await runCommerceTurn({ scope: s.scope, clock: () => commerceNow, latest: "Cho chị gặp nhân viên.", history: [],
      ownerPrompt: "Tư vấn", verifierPrompt: "Kiểm reply", tools: s.tools, owner, verifier });
    expect(r.terminal).toMatchObject({ disposition: "FALLBACK", reason:"OWNER_TOOL_MODE" });
    expect(r.sendEnabled).toBe(false); expect(owner).toHaveBeenCalledTimes(1); expect(verifier).not.toHaveBeenCalled();
    expect(invokeBatch).not.toHaveBeenCalled(); expect(s.commit).not.toHaveBeenCalled();
  });
  it("does not call either model when a previous turn already belongs to a human", async () => {
    const s = await setup(); s.change({ state: { ...s.current().state, conversationOwner: "HUMAN" } });
    const owner = vi.fn(), verifier = vi.fn();
    const result = await runCommerceTurn({ scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Em ơi",history:[],
      ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",owner,verifier });
    expect(result.terminal.disposition).toBe("NO_SEND");expect(owner).not.toHaveBeenCalled();expect(verifier).not.toHaveBeenCalled();
  });
  it("feeds current conversation revision into the existing final gate after a verifier PASS", async () => {
    const s=await setup();
    const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Em ơi",history:[],
      ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",owner:async()=>({kind:"FINAL",text:"Dạ chị."}),
      verifier:async()=>{s.change({stateVersion:2,state:{...s.current().state,revision:2}});return {result:{verdict:"PASS",violations:[]}};}});
    expect(r.terminal.disposition).not.toBe("SEND_ELIGIBLE");expect(s.commit).not.toHaveBeenCalled();
  });
  it("rejects a current readback from another scope even if its visible revision and recipient match", async () => {
    const s=await setup();
    const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Em ơi",history:[],
      ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",owner:async()=>({kind:"FINAL",text:"Dạ chị."}),
      verifier:async()=>{s.change({pageId:"another-page"});return {result:{verdict:"PASS",violations:[]}};}});
    expect(r.terminal.disposition).toBe("NO_SEND");expect(s.commit).not.toHaveBeenCalled();
  });
  it("preserves privacy no-send after a committed handoff and rejects later tool batches", async () => {
    const s=await setup();await s.tools.invoke({name:"request_handoff",args:{reason:"EXCHANGE"}});
    const noSend={disposition:"NO_SEND" as const,reason:"PRIVACY",text:null,fallbackId:null};
    expect(await s.tools.recover!(noSend)).toEqual(noSend);
    const batch=vi.spyOn(s.base,"invokeBatch");
    expect(await s.tools.invokeBatch([{name:"read_policy",args:{}}])).toEqual([{status:"REJECTED",reason:"HANDOFF_TERMINAL"}]);
    expect(batch).not.toHaveBeenCalled();
  });
  it("persists terminal stale recovery but never converts ordinary fallback or privacy no-send to handoff", async () => {
    const s = await setup();
    const fallback = { disposition: "FALLBACK" as const, reason: "FAIL", text: "fallback", fallbackId: "f" };
    expect(await s.tools.recover!(fallback)).toEqual(fallback);
    expect(await s.tools.recover!({ disposition: "NO_SEND", reason: "PRIVACY", text: null, fallbackId: null })).toMatchObject({ disposition: "NO_SEND" });
    expect(s.commit).not.toHaveBeenCalled();
    expect(await s.tools.recover!({ disposition: "HANDOFF", reason: "STALE", text: null, fallbackId: null })).toMatchObject({ disposition: "HANDOFF", text: null });
    expect(s.commit).toHaveBeenCalledTimes(1); expect(s.current().state.conversationOwner).toBe("HUMAN");
  });
});

it.each(["conflict","policy-error","invalid-arguments"])("explicit handoff ends the turn on failure (%s)",async fault=>{
 const s=await setup();s.commit.mockResolvedValue(false);
 const tools=createCommerceHandoffTools({base:s.base,scope:s.scope,clock:()=>commerceNow,read:s.read,
  policy:async()=>{if(fault==="policy-error")throw Error("POLICY_UNAVAILABLE");return s.policy;},commit:async({next})=>s.commit(next)});
 const call={name:"request_handoff",args:{reason:fault==="invalid-arguments"?"ADMIN_REQUEST":"CUSTOMER_REQUESTED_HUMAN"}};
 const owner=vi.fn(async()=>({kind:"TOOLS" as const,calls:[call],content:{role:"model" as const,parts:[{functionCall:call}]}})),verifier=vi.fn();
 const r=await runCommerceTurn({scope:s.scope,tools,owner,verifier,clock:()=>commerceNow,latest:"Cho chị gặp người bán.",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm"});
 expect(r.terminal).toMatchObject({disposition:"NO_SEND",text:null});expect(owner).toHaveBeenCalledOnce();expect(verifier).not.toHaveBeenCalled();
 expect(s.commit.mock.calls.length).toBe(fault==="conflict"?1:0);expect(r.terminalHandoffCalls).toBe(1);
});

it.each(["success","denied","unknown","changed"])("no-chart recovery reuses atomic handoff at most once (%s)",async mode=>{
 const s=await setup();const sizeBase={...s.base,sizeOutcome:()=>({status:"NO_VERIFIED_CHART"})};
 let attempts=0;
 const tools=createCommerceHandoffTools({base:sizeBase,scope:s.scope,clock:()=>commerceNow,policy:async()=>s.policy,read:s.read,
 commit:async({next})=>{attempts++;if(mode==="unknown")throw Error("COMMIT_UNKNOWN");if(mode==="denied")return false;await s.commit(next);if(mode==="changed")s.change({bindingVersion:"changed"});return true;}});
 let owners=0;
 const r=await runCommerceTurn({scope:s.scope,tools,latest:"Chọn size chị nhé",history:[],clock:()=>commerceNow,ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",
 owner:async()=>{owners++;const c={name:"recommend_size",args:{subjectRef:"QU714"}};return {kind:"TOOLS",calls:[c],content:{role:"model",parts:[{functionCall:c}]}};},verifier:async()=>{throw Error("UNEXPECTED_VERIFY");}});
 expect(owners).toBe(1);expect(r.verifierGenerations).toBe(0);expect(attempts).toBe(1);
 expect(r.terminal.disposition).toBe(mode==="success"?"HANDOFF":"NO_SEND");
 await tools.recover!(r.terminal);expect(attempts).toBe(1);
});

it("prepares an approved holding without changing ownership until the exact reply is verified",async()=>{
 const s=await setup(),holding="Bên em sẽ kiểm tra lại hàng rồi báo chị nhé.";
 Object.assign(s.policy.artifacts,{handoffMatrix:{schemaVersion:1,kind:"HANDOFF_MATRIX",sourceMetadata:s.policy.artifacts.shopPolicy.sourceMetadata,
  rules:[{reason:"STOCK_UNAVAILABLE",customerMessagePolicy:"HOLDING_REPLY_THEN_HANDOFF",holdingReply:holding,tag:"NHAN_VIEN"}]}});
 const {commerceHash}=await import("./single-agent-commerce-read-only-context.js");
 const tools=createCommerceHandoffTools({base:s.base,scope:s.scope,clock:()=>commerceNow,policy:async()=>s.policy,read:s.read,
  deferredReply:{approvedHoldingHashes:[commerceHash(holding)]},commit:async change=>{expect(change.reply?.text).toBe(`Áo này 499.000đ chị nhé.\n\n${holding}`);return s.commit(change.next);}});
 const first=await tools.invoke({name:"request_handoff",args:{reason:"STOCK_UNAVAILABLE"}});
 expect(first).toMatchObject({status:"OK",data:{handoffPrepared:true}});expect(s.commit).not.toHaveBeenCalled();
 let ownerCalls=0;
 const r=await runCommerceTurn({scope:s.scope,tools,clock:()=>commerceNow,latest:"Áo này bao nhiêu, còn hàng không?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",
  owner:async req=>{ownerCalls++;expect(req.toolsAllowed).toBe(false);expect(req.pendingHandoff?.reason).toBe("STOCK_UNAVAILABLE");return {kind:"FINAL",text:"Áo này 499.000đ chị nhé."};},
  verifier:async req=>{expect(req.finalDraft).toBe(`Áo này 499.000đ chị nhé.\n\n${holding}`);expect(s.commit).not.toHaveBeenCalled();return {result:{verdict:"PASS",violations:[]}};}});
 expect(r.terminal).toMatchObject({disposition:"HANDOFF",text:`Áo này 499.000đ chị nhé.\n\n${holding}`});
 expect(r.ownerGenerations).toBe(1);expect(ownerCalls).toBe(1);expect(r.verifierGenerations).toBe(1);expect(s.commit).toHaveBeenCalledOnce();
});

it.each(["single","compare"])("last-generation handoff preserves only bounded single-offer prices (%s)",async mode=>{
 const s=await setup(),f=fixtureProduct(),holding="Bên em sẽ kiểm tra lại hàng rồi báo chị nhé.";
 f.snapshot.offers.DIRECT!.rows[0]!.stock_quantity=null;
 if(mode==="compare")f.snapshot.offers.AO=structuredClone(f.snapshot.offers.DIRECT!);
 Object.assign(s.policy.artifacts,{handoffMatrix:{schemaVersion:1,kind:"HANDOFF_MATRIX",sourceMetadata:s.policy.artifacts.shopPolicy.sourceMetadata,
  rules:[{reason:"STOCK_UNAVAILABLE",customerMessagePolicy:"HOLDING_REPLY_THEN_HANDOFF",holdingReply:holding,tag:"NHAN_VIEN"}]}});
 const {createCommerceTools}=await import("./single-agent-commerce.js"),{commerceHash}=await import("./single-agent-commerce-read-only-context.js");
 const tools=await createCommerceTools({read:{scope:s.scope,clock:()=>commerceNow,policy:fixturePolicy,catalog:{readProduct:async()=>f,
  searchText:async()=>({status:"MATCHED",matchKind:"EXACT_CODE",product:f.product,score:1,gap:null})}},
  handoff:{read:s.read,policy:async()=>s.policy,commit:async({next})=>s.commit(next),deferredReply:{approvedHoldingHashes:[commerceHash(holding)]}}});
 let step=0;
 const r=await runCommerceTurn({scope:s.scope,tools,clock:()=>commerceNow,latest:"Áo SM613 còn size M không?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",
  owner:async req=>{const call=++step===1?{name:"search_products",args:{productCode:"SM613"}}:step===2?
    {name:"read_product",args:{subjectRef:"SM613",...(mode==="single"?{offerType:"DIRECT"}:{offerTypes:["DIRECT","AO"]})}}:
    {name:"request_handoff",args:{reason:"STOCK_UNAVAILABLE"}};
   if(step===3)expect(req.terminalHandoffAllowed).toBe(true);
   return {kind:"TOOLS",calls:[call],content:{role:"model",parts:[{functionCall:call}]}};},
  verifier:async()=>{throw Error("NO_FOURTH_GENERATION");}});
 expect(r.ownerGenerations).toBe(3);expect(r.verifierGenerations).toBe(0);expect(r.terminal.disposition).toBe("HANDOFF");expect(s.commit).toHaveBeenCalledOnce();
 if(mode==="single")expect(r.terminal.text).toContain("499.000đ");else expect(r.terminal.text).toBe(holding);
 expect(r.terminal.text).toContain(holding);expect(r.terminalHandoffCalls).toBe(1);
});

it.each(["reject","policy-changed","conflict"])("pending handoff never salvages a rejected draft or retries a failed commit (%s)",async fault=>{
 const s=await setup(),holding="Bên em kiểm tra rồi báo chị nhé.";
 Object.assign(s.policy.artifacts,{handoffMatrix:{schemaVersion:1,kind:"HANDOFF_MATRIX",sourceMetadata:s.policy.artifacts.shopPolicy.sourceMetadata,
  rules:[{reason:"EXCHANGE",customerMessagePolicy:"HOLDING_REPLY_THEN_HANDOFF",holdingReply:holding,tag:"VAN_DON"}]}});
 const {commerceHash}=await import("./single-agent-commerce-read-only-context.js");if(fault==="conflict")s.commit.mockResolvedValue(false);
 const tools=createCommerceHandoffTools({base:s.base,scope:s.scope,clock:()=>commerceNow,read:s.read,policy:async()=>s.policy,
  deferredReply:{approvedHoldingHashes:[commerceHash(holding)]},commit:async({next})=>s.commit(next)});
 await tools.invoke({name:"request_handoff",args:{reason:"EXCHANGE"}});
 const r=await runCommerceTurn({scope:s.scope,tools,clock:()=>commerceNow,latest:"Đổi hàng giúp chị",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",
  owner:async()=>({kind:"FINAL",text:"UNVERIFIED_DRAFT_SHOULD_NEVER_BE_REUSED"}),verifier:async()=>{
   if(fault==="policy-changed")Object.assign(s.policy.versionReferences[0]!,{pointerRevision:s.policy.versionReferences[0]!.pointerRevision+1});
   return {result:{verdict:fault==="reject"?"UNCERTAIN":"PASS",violations:[]}};}});
 if(fault==="reject"){expect(r.terminal).toMatchObject({disposition:"HANDOFF",text:holding});expect(s.commit).toHaveBeenCalledOnce();}
 else expect(r.terminal.disposition).toBe("NO_SEND");
 expect(r.terminal.text??"").not.toContain("UNVERIFIED_DRAFT");expect(s.commit.mock.calls.length).toBeLessThanOrEqual(1);
 await tools.recover!(r.terminal);expect(s.commit.mock.calls.length).toBeLessThanOrEqual(1);
});
