import {it,expect,vi} from "vitest";
import {createReadOnlyTools} from "./single-agent-commerce-read-only-tools.js";
import {withExplicitQuoteTask} from "./single-agent-commerce-quote.js";
import {cartSelectionFromSnapshot} from "./realtime-sales-catalog.js";
import {mergeSelectionEvidence,selectionChoiceResolution,type CandidateSelectionEvidence} from "./single-agent-commerce-selection-evidence.js";
import {commerceNow,commerceScope,fixturePolicy,fixtureProduct} from "./single-agent-commerce.test-support.js";
import type {CommerceToolCall,CommerceToolResult} from "./single-agent-commerce-read-only-tools.js";

async function setup(){
 const scope=commerceScope(),f=fixtureProduct();
 f.snapshot.offers.DIRECT!.rows.push({...structuredClone(f.snapshot.offers.DIRECT!.rows[0]!),color:"be"});
 const reads=vi.fn(async()=>f),base=createReadOnlyTools({scope,clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],catalog:{readProduct:reads,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 await base.prepare!();
 const selection=cartSelectionFromSnapshot(f.snapshot,{shopAlias:scope.shopAlias,productId:f.product.productId,offerType:"DIRECT",size:"M",color:null,quantity:1,lineId:"40000000-0000-4000-8000-000000000001",selectionMode:"CANDIDATE_TUPLES"},commerceNow);
 if(selection.status==="READY"||!selection.selectionEvidence)throw Error("FIXTURE_MUST_NEED_COLOR");
 const evidence=selection.selectionEvidence;
 let context=base.snapshot();
 context.runtimeProducts=context.runtimeProducts!.map(p=>p.subjectRef===f.product.productId?mergeSelectionEvidence(p,evidence,commerceNow):p);
 let result:CommerceToolResult={status:"UNAVAILABLE",reason:"SELECTION_UNAVAILABLE",failureStage:"SOURCE",data:{...selection,effectCommitted:false,choiceResolution:selectionChoiceResolution(evidence,commerceNow,selection.status)}};
 const invoke=vi.fn(async(_call:CommerceToolCall)=>result),invokeBatch=vi.fn(async(calls:readonly CommerceToolCall[])=>Promise.all(calls.map(invoke)));
 const price=vi.fn(()=>[]),policy=vi.fn(async()=> (await fixturePolicy()).bundle!.policy);
 const controlled={...base,availableTools:["read_product","read_policy","request_handoff","add_to_cart","change_cart_item"],snapshot:()=>context,invoke,invokeBatch,quotePriceEvidence:price,uncommittedSelectionResult:(r:CommerceToolResult)=>r===result};
 const tools=withExplicitQuoteTask(controlled,scope,false,policy,()=>commerceNow);
 const call={name:"add_to_cart",args:{subjectRef:f.product.productId,offerType:"DIRECT",size:"M",color:null,quantity:1}};
 return {scope,tools,controlled,call,invoke,invokeBatch,reads,price,policy,evidence,context:()=>context,setContext:(c:typeof context)=>{context=c;},result:()=>result,setResult:(r:CommerceToolResult)=>{result=r;}};
}
it("shows a pre-cart quote target after a proven missing-colour failure without pretending price or total is ready",async()=>{
 const s=await setup(),before=structuredClone(s.context()),readCount=s.reads.mock.calls.length;
 const r=await s.tools.invoke(s.call);
 expect(r).toMatchObject({status:"UNAVAILABLE",reason:"SELECTION_UNAVAILABLE",failureStage:"SOURCE",data:{effectCommitted:false,
  preCartQuoteRequest:{tool:"quote_product",target:{subjectRef:"SM613",offerTypes:["DIRECT"]},quantity:"FROM_CUSTOMER_REQUEST",calculationStatus:"NOT_CALCULATED",sourcePriceStatus:"REQUIRES_QUOTE_READ",purchaseMissingField:"COLOR",evidenceHash:s.evidence.contentHash}}});
 expect((r.data as Record<string,unknown>).preCartQuote).toBeUndefined();
 expect(s.context()).toEqual(before);expect(s.policy).not.toHaveBeenCalled();expect(s.reads).toHaveBeenCalledTimes(readCount);expect(s.invoke).toHaveBeenCalledExactlyOnceWith(s.call);expect(s.tools.quoteTaskWork!()).toEqual([]);
 const batch=await s.tools.invokeBatch([s.call]);expect(batch[0]).toEqual(r);expect(s.invokeBatch).toHaveBeenCalledOnce();
});
it.each(["permission","privacy","recipient","binding","owner","pending","stale","changed-evidence","wrong-offer","wrong-size","wrong-quantity","unknown-commit","shop-gap","no-capability","unproved-result"])("does not publish a quote route on %s",async mode=>{
 const s=await setup(),c=structuredClone(s.context()),r=structuredClone(s.result());
 const data=r.data as {selectionEvidence:CandidateSelectionEvidence;choiceResolution:unknown;effectCommitted:boolean};
 if(mode==="permission")c.state.permission=false;
 if(mode==="privacy")c.state.privacyAllowed=false;
 if(mode==="recipient")c.state.recipient="changed";
 if(mode==="binding")c.state.bindingVersion="changed";
 if(mode==="owner")c.state.conversationOwner="HUMAN";
 if(mode==="pending")c.state.customerStateUpdatePending=true;
 if(mode==="stale")data.selectionEvidence.expiresAt=commerceNow.toISOString();
 if(mode==="changed-evidence")c.runtimeProducts=c.runtimeProducts!.map(p=>({...p,selectionEvidence:[]}));
 if(mode==="wrong-offer")s.call.args.offerType="OTHER";
 if(mode==="wrong-size")s.call.args.size="L";
 if(mode==="wrong-quantity")s.call.args.quantity=2;
 if(mode==="unknown-commit"){r.reason="RECEIPT_UNAVAILABLE";data.effectCommitted=true;}
 if(mode==="shop-gap")data.choiceResolution={kind:"SHOP_DATA_MISSING",reason:"SHOP_COLOR_UNRECORDED"};
 s.setContext(c);s.setResult(r);
 const tools=mode==="no-capability"?withExplicitQuoteTask({...s.controlled,availableTools:["add_to_cart"]},s.scope,false,s.policy,()=>commerceNow):
  mode==="unproved-result"?withExplicitQuoteTask({...s.controlled,uncommittedSelectionResult:()=>false},s.scope,false,s.policy,()=>commerceNow):s.tools;
 expect((await tools.invoke(s.call)).data).not.toHaveProperty("preCartQuoteRequest");expect(s.policy).not.toHaveBeenCalled();
});
it("binds a replacement route to the new product/offer and current line quantity, never the old offer",async()=>{
 const s=await setup(),c=structuredClone(s.context());
 const items=[{subjectRef:"line",productRef:"SM613",offerType:"SET",quantity:1,components:[]}];c.state.cartItems=items;
 c.cartBinding={cartId:"cart",cartVersion:1};c.state.cartQuote={cartId:"cart",cartVersion:1};
 c.boundSubjects.push({ref:"line",kind:"CART_LINE",label:"old set",bindingVersion:s.scope.bindingVersion});s.setContext(c);
 const call={name:"change_cart_item",args:{action:"REPLACE_LINE",subjectRef:"line",targetSubjectRef:"SM613",offerType:"DIRECT",size:"M",color:null}};
 expect(await s.tools.invoke(call)).toMatchObject({data:{preCartQuoteRequest:{target:{subjectRef:"SM613",offerTypes:["DIRECT"]}}}});
 items[0]!.quantity=2;s.setContext(c);
 expect((await s.tools.invoke(call)).data).not.toHaveProperty("preCartQuoteRequest");
});
// PR 392 case J1: what the customer asked to buy and could not yet be added is kept for the next turn.
it("keeps the refused purchase lines of the turn and settles the note when a cart write succeeds",async()=>{
 const s=await setup(),note=vi.fn(async()=>{});
 const tools=withExplicitQuoteTask({...s.controlled,setPendingPurchase:note},s.scope,false,s.policy,()=>commerceNow);
 const line={productId:"SM613",offerType:"DIRECT",size:"M",color:null,quantity:1,missing:"COLOR"};
 const first=await tools.invoke(s.call);
 expect(first.data).toHaveProperty("preCartQuoteRequest");expect(note).toHaveBeenLastCalledWith([line]);
 // The same line asked again is one line, not two.
 await tools.invokeBatch([s.call]);expect(note).toHaveBeenLastCalledWith([line]);
 // An applied cart command means the cart now holds the order.
 s.setResult({status:"OK",data:{operationId:"op",cartItems:[]}});
 expect((await tools.invoke(s.call)).status).toBe("OK");expect(note).toHaveBeenLastCalledWith(null);
 const calls=note.mock.calls.length;
 await tools.invoke({name:"read_policy",args:{}});expect(note).toHaveBeenCalledTimes(calls);
});
it("keeps no note for a refusal that publishes no quote route or for a replacement of a cart line",async()=>{
 const s=await setup(),note=vi.fn(async()=>{}),r=structuredClone(s.result());
 (r.data as {choiceResolution:unknown}).choiceResolution={kind:"SHOP_DATA_MISSING",reason:"SHOP_COLOR_UNRECORDED"};s.setResult(r);
 const tools=withExplicitQuoteTask({...s.controlled,setPendingPurchase:note},s.scope,false,s.policy,()=>commerceNow);
 expect((await tools.invoke(s.call)).data).not.toHaveProperty("preCartQuoteRequest");expect(note).not.toHaveBeenCalled();
 const t=await setup(),c=structuredClone(t.context());
 c.state.cartItems=[{subjectRef:"line",productRef:"SM613",offerType:"SET",quantity:1,components:[]}];c.cartBinding={cartId:"cart",cartVersion:1};c.state.cartQuote={cartId:"cart",cartVersion:1};
 c.boundSubjects.push({ref:"line",kind:"CART_LINE",label:"old set",bindingVersion:t.scope.bindingVersion});t.setContext(c);
 const replacing=withExplicitQuoteTask({...t.controlled,setPendingPurchase:note},t.scope,false,t.policy,()=>commerceNow);
 expect((await replacing.invoke({name:"change_cart_item",args:{action:"REPLACE_LINE",subjectRef:"line",targetSubjectRef:"SM613",offerType:"DIRECT",size:"M",color:null}})).data).toHaveProperty("preCartQuoteRequest");
 expect(note).not.toHaveBeenCalled();
});
