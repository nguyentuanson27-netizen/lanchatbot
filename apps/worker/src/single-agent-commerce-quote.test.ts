import {describe,it,expect,vi} from "vitest";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn,type OwnerGeneration} from "./single-agent-commerce-read-only.js";
import {commerceNow,commerceScope,fixturePolicy,fixtureProduct} from "./single-agent-commerce.test-support.js";
import {createConversationState} from "@lana/conversation-engine";
import type {HandoffAuthority} from "./single-agent-commerce-handoff.js";
import {makeBinding,finalGate} from "./single-agent-semantic-verifier-boundary.js";
import {quoteBatchWork} from "./single-agent-commerce-quote.js";

const config={version:"EXPLICIT_QUOTE_V2",toolWorkAccounting:"PRIMITIVE_WORK_V2",normalUnits:2,readOnlyBatch:true,maxPerTurn:2} as const;
async function setup(enabled=true,firstContact:boolean|null=true,secondProduct=false){
 const scope=commerceScope(),f=fixtureProduct(),f2=fixtureProduct("SM614");
 f.product.images=[{url:"https://content.pancake.vn/front.jpg",role:"PRIMARY",angle:"FRONT",imageType:"MODEL",intents:[],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
 const readProduct=vi.fn(async(id:string)=>id==="SM614"?f2:f);
 const original=(await fixturePolicy()).bundle!;
 const policy={...original,artifacts:{...original.artifacts,handoffMatrix:{schemaVersion:1 as const,kind:"HANDOFF_MATRIX" as const,sourceMetadata:original.artifacts.shopPolicy.sourceMetadata,
  rules:(["PRICE_UNAVAILABLE","DEPENDENCY_FAILURE"] as const).map(reason=>({reason,customerMessagePolicy:"SILENT_HANDOFF" as const,holdingReply:null,tag:"NHAN_VIEN" as const}))}}};
 let authority:HandoffAuthority={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:"APP",now:commerceNow}),revision:scope.revision}};
 const readPolicy=vi.fn(fixturePolicy);
 const tools=await createCommerceTools({read:{scope,clock:()=>commerceNow,entry:{firstContact,fromAd:false},initialProducts:secondProduct?[f.product,f2.product]:[f.product],policy:readPolicy,
  catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},
  media:{allowedHostSuffixes:["pancake.vn"]},handoff:{read:async()=>structuredClone(authority),commit:vi.fn(async change=>{authority=structuredClone(change.next);return true;}),policy:async()=>policy},
  ...(enabled?{quoteTask:config}:{})} as Parameters<typeof createCommerceTools>[0]);
 return {scope,f,f2,tools,readProduct,readPolicy,authority:()=>authority};
}
const quote={name:"quote_product",args:{subjectRef:"SM613",offerTypes:["DIRECT"]}};
describe("quote read batches",()=>{
 it("keeps two parent sources separate and invalidates old PASS when one source changes",async()=>{
  const s=await setup(true,false,true);s.f2.snapshot.offers.DIRECT!.sale_price=399000;s.f2.snapshot.offers.DIRECT!.rows.forEach(r=>{r.sale_price=399000;});await s.tools.prepare!();
  const calls=[{...quote,args:{...quote.args,quantity:1}},{name:"quote_product",args:{subjectRef:"SM614",offerTypes:["DIRECT"],quantity:2}}];
  expect((await s.tools.invokeBatch(calls)).map(r=>r.status)).toEqual(["OK","OK"]);
  const before=s.tools.snapshot(),proofs=before.policyLiterals.filter(p=>p.ref.startsWith("pre-cart-quote:")).map(p=>JSON.parse(p.text));
  expect(proofs.map(p=>[p.subjectRef,p.subtotalVnd])).toEqual([["SM613",499000],["SM614",798000]]);
  const text="Chị xem hai lựa chọn nhé.",binding=makeBinding("two-parent",text,before),response={kind:"VERDICT" as const,binding,result:{verdict:"PASS",violations:[]}};
  expect(finalGate({expected:binding,response,current:before,finalDraft:text,now:commerceNow}).disposition).toBe("SEND_ELIGIBLE");
  s.f2.snapshot.offers.DIRECT!.rows[0]!.stock_quantity=0;
  await expect(s.tools.readback()).rejects.toThrow("POS_OBSERVATION_CHANGED");expect(s.tools.snapshot().effectReceipts).toHaveLength(0);
 });
 it.each([2,3])("reserves all sibling and preparation work before I/O (%s policy reads)",async count=>{
  const s=await setup();let n=0;const verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const calls=[quote,{name:"select_product_media",args:{subjectRef:"SM613",intent:"GENERIC"}},...Array.from({length:count},()=>({name:"read_policy",args:{}}))];
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Áo bao nhiêu?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier,
   owner:async()=>++n===1?{kind:"TOOLS",calls,content:{role:"model",parts:calls.map(functionCall=>({functionCall}))}}:{kind:"FINAL",text:"Áo 499.000đ."}});
  if(count===2){expect(r.terminal.disposition).toBe("SEND_ELIGIBLE");expect(r.normalToolCalls).toBe(6);expect(r.executedNormalToolInvocations).toBe(6);}
  else {expect(r.recovery?.originalReason).toBe("BUDGET");expect(s.tools.quoteTaskWork!()).toEqual([]);expect(verifier).not.toHaveBeenCalled();}
 });
 it("rejects intersecting offers independent of order/quantity/region",()=>{
  const a={name:"quote_product",args:{subjectRef:"P",offerTypes:["AO","SET"]}},b={name:"quote_product",args:{subjectRef:"P",offerTypes:["SET"],quantity:3,deliveryRegion:"OTHER"}};
  expect(quoteBatchWork([a,b])).toBeNull();expect(quoteBatchWork([b,a])).toBeNull();
 });
 it("does not execute later siblings after a quote prepares handoff",async()=>{
  const s=await setup();await s.tools.prepare!();s.f.product.images=[];s.readPolicy.mockClear();
  const result=await s.tools.invokeBatch([quote,{name:"read_policy",args:{}}]);
  expect(result[0]!.status).not.toBe("OK");expect(result[1]!.reason).toBe("QUOTE_BATCH_STOPPED");expect(s.readPolicy).not.toHaveBeenCalled();
 });
 it("counts duplicate targets across rounds before another read",async()=>{
  const s=await setup(true,false);await s.tools.prepare!();const call={...quote,args:{...quote.args,quantity:1}};
  expect((await s.tools.invokeBatch([call]))[0]!.status).toBe("OK");s.readProduct.mockClear();
  expect((await s.tools.invokeBatch([{...call,args:{...call.args,quantity:2,deliveryRegion:"MIEN-NAM"}}]))[0]!.status).toBe("REJECTED");expect(s.readProduct).not.toHaveBeenCalled();
 });
 it("executes the original quote and media call, preserves responses and reaches final gate",async()=>{
  const s=await setup(),calls=[quote,{name:"select_product_media",args:{subjectRef:"SM613",intent:"GENERIC"}}];let n=0;
  const verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const signed={role:"model" as const,parts:calls.map(functionCall=>({functionCall,thoughtSignature:"unchanged-signature"}))};
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Áo này bao nhiêu?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier,
   owner:async request=>{if(++n===1)return {kind:"TOOLS",calls,content:signed};expect(request.contents.at(-2)).toEqual(signed);
    expect(request.contents.at(-1)!.parts.map(p=>(p.functionResponse as {name:string}).name)).toEqual(calls.map(c=>c.name));return {kind:"FINAL",text:"Áo 499.000đ chị nhé."};}});
  expect(r.terminal.disposition).toBe("SEND_ELIGIBLE");expect(r.normalToolCalls).toBe(4);expect(r.executedNormalToolInvocations).toBe(4);expect(verifier).toHaveBeenCalledOnce();
 });
 it("retains two independent offer totals and revalidates both after policy change",async()=>{
  const s=await setup(true,false);s.f.snapshot.offers.AO=structuredClone(s.f.snapshot.offers.DIRECT!);s.f.snapshot.offers.AO!.rows.forEach(r=>{r.offer_type="AO";r.sale_price=399000;});s.f.snapshot.offers.AO!.sale_price=399000;
  await s.tools.prepare!();const calls=[{...quote,args:{...quote.args,quantity:1}},{name:"quote_product",args:{subjectRef:"SM613",offerTypes:["AO"],quantity:2}}];
  const rs=await s.tools.invokeBatch(calls);expect(rs.map(r=>r.status)).toEqual(["OK","OK"]);
  let proofs=s.tools.snapshot().policyLiterals.filter(p=>p.ref.startsWith("pre-cart-quote:"));expect(proofs).toHaveLength(2);
  expect(proofs.map(p=>JSON.parse(p.text).offerType).sort()).toEqual(["AO","DIRECT"]);
  s.readPolicy.mockImplementation(()=>fixturePolicy(30000));proofs=(await s.tools.readback()).policyLiterals.filter(p=>p.ref.startsWith("pre-cart-quote:"));
  expect(proofs).toHaveLength(2);expect(proofs.every(p=>JSON.parse(p.text).shippingFeeVnd===30000)).toBe(true);
 });
 it("refuses selected-product metadata writes and repeat offers before batch source I/O",async()=>{
  for(const sibling of [{name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT",customerSelected:true}},quote]){
   const s=await setup();await s.tools.prepare!();s.readProduct.mockClear();
   expect((await s.tools.invokeBatch([quote,sibling])).every(r=>r.status==="REJECTED")).toBe(true);expect(s.readProduct).not.toHaveBeenCalled();
  }
 });
});
describe("explicit quote operation",()=>{
 it.each([true,false])("blocks an old verifier pass on changed policy or expired quote, firstContact=%s",async firstContact=>{
  const s=await setup(true,firstContact);await s.tools.prepare!();
  await s.tools.invoke({...quote,args:{...quote.args,quantity:2,deliveryRegion:"MIEN-NAM"}});
  const text="Hai áo cả ship chị nhé.",before=s.tools.snapshot(),expected=makeBinding("quote-test",text,before),response={kind:"VERDICT" as const,binding:expected,result:{verdict:"PASS",violations:[]}};
  expect(finalGate({expected,response,current:before,finalDraft:text,now:commerceNow}).disposition).toBe("SEND_ELIGIBLE");
  expect(finalGate({expected,response,current:before,finalDraft:text,now:new Date(commerceNow.getTime()+1200001)}).disposition).not.toBe("SEND_ELIGIBLE");
  s.readPolicy.mockImplementation(()=>fixturePolicy(30000));
  const after=await s.tools.readback();expect(after.policyLiterals.find(p=>p.ref.startsWith("pre-cart-quote:"))?.text).not.toBe(before.policyLiterals.find(p=>p.ref.startsWith("pre-cart-quote:"))?.text);
  expect(finalGate({expected,response,current:after,finalDraft:text,now:commerceNow}).disposition).not.toBe("SEND_ELIGIBLE");
 });
 it("quotes quantity plus shipping before a cart and invalidates the total on a price change",async()=>{
  const s=await setup();await s.tools.prepare!();
  const r=await s.tools.invoke({...quote,args:{...quote.args,quantity:1,deliveryRegion:"Cần Thơ"}});
  expect(r).toMatchObject({status:"OK",data:{preCartQuote:{grandTotalVnd:524000,quantity:1,deliveryRegion:"Cần Thơ"}}});
  expect(s.tools.snapshot().state.cartQuote).toBeUndefined();expect(s.tools.snapshot().effectReceipts).toHaveLength(0);
  const before=s.tools.snapshot();expect(before.policyLiterals.some(p=>p.ref.startsWith("pre-cart-quote:"))).toBe(true);
  s.f.snapshot.offers.DIRECT!.sale_price=599000;s.f.snapshot.offers.DIRECT!.rows[0]!.sale_price=599000;
  await expect(s.tools.readback()).rejects.toThrow("POS_OBSERVATION_CHANGED");
 });
 it("opt-in completes price and selected media before exact final verification",async()=>{
  const s=await setup();expect(s.tools.availableTools).toContain("quote_product");
  let n=0;const verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Áo này bao nhiêu em?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier,
   owner:async():Promise<OwnerGeneration>=>++n===1?{kind:"TOOLS",calls:[quote],content:{role:"model",parts:[{functionCall:quote}]}}:{kind:"FINAL",text:"Áo 499.000đ chị nhé."}});
  expect(r.terminal.disposition).toBe("SEND_ELIGIBLE");expect(s.tools.mediaSelection!()).toHaveLength(1);expect(verifier).toHaveBeenCalledOnce();
  expect(r).toMatchObject({normalToolCalls:3,executedNormalToolInvocations:3,executedToolInvocations:3,quoteTaskWork:[{reservedUnits:2,readInvocations:1,selectionInvocations:1}]});
 });
 it.each(["apply_customer_state","add_to_cart","request_handoff","quote_product"])("rejects mixed quote+%s before any sibling I/O",async name=>{
  const s=await setup();const calls=[quote,{name,args:{}}];
  const result=await s.tools.invokeBatch(calls);
  expect(result.every(x=>x.status==="REJECTED")).toBe(true);expect(s.readProduct).not.toHaveBeenCalled();
 });
 it("legacy does not expose the operation",async()=>{const s=await setup(false);expect(s.tools.availableTools).not.toContain("quote_product");});
 it.each([{subjectRef:"UNKNOWN",offerTypes:["DIRECT"]},{subjectRef:"SM613",offerTypes:["UNKNOWN"]},{subjectRef:"SM613",offerTypes:["DIRECT","DIRECT"]},{subjectRef:"SM613",offerTypes:["DIRECT"],skipMedia:true},{subjectRef:"SM613",offerTypes:["DIRECT"],color:null}])("rejects unbound/unknown/duplicate/extra inputs before source I/O",async args=>{
  const s=await setup();await s.tools.prepare!();s.readProduct.mockClear();
  expect((await s.tools.invoke({name:"quote_product",args})).status).toBe("REJECTED");expect(s.readProduct).not.toHaveBeenCalled();
 });
 it("does not expose quote when prior contact is unknown",async()=>{
  const s=await setup(true,null);expect(s.tools.availableTools).not.toContain("quote_product");
  expect((await s.tools.invoke(quote)).status).toBe("REJECTED");expect(s.readProduct).not.toHaveBeenCalled();
 });
 it("returning customer can obtain a quantity total without colour, cart or another image",async()=>{
  const s=await setup(true,false);s.f.product.images=[];await s.tools.prepare!();
  expect(s.tools.availableTools).toContain("quote_product");
  const before=s.tools.snapshot(),r=await s.tools.invoke({...quote,args:{...quote.args,quantity:2}});
  expect(r).toMatchObject({status:"OK",data:{preCartQuote:{quantity:2,subtotalVnd:998000,discountTotalVnd:49900,shippingFeeVnd:25000,grandTotalVnd:973100}}});
  expect((r.data as Record<string,unknown>).media).toBeUndefined();expect(s.tools.mediaSelection!()).toEqual([]);
  const {factSnapshotVersion:_beforeRead,...businessBefore}=before.state,{factSnapshotVersion:_afterRead,...businessAfter}=s.tools.snapshot().state;
  expect(businessAfter).toEqual(businessBefore);expect(s.tools.snapshot().effectReceipts).toEqual(before.effectReceipts);
  expect(s.tools.quoteTaskWork!()).toEqual([{reservedUnits:2,readInvocations:1,selectionInvocations:0}]);
  expect((await s.tools.readback()).policyLiterals.some(p=>p.ref.startsWith("pre-cart-quote:"))).toBe(true);
 });
 it("follow-up quantity quote reaches final verifier with current total and no mutation or image",async()=>{
  const s=await setup(true,false);s.f.product.images=[];let n=0;
  const call={...quote,args:{...quote.args,quantity:2}},verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Em báo tổng cả phí ship nhé.",history:[{role:"customer",text:"Chị lấy hai áo, một M một L."},{role:"shop",text:"Chị lấy màu nào ạ?"}],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier,
   owner:async request=>{expect(request.availableTools).toContain("quote_product");return ++n===1?{kind:"TOOLS",calls:[call],content:{role:"model",parts:[{functionCall:call}]}}:{kind:"FINAL",text:"Hai áo cả ship là 973.100đ chị nhé."};}});
  expect(r).toMatchObject({terminal:{disposition:"SEND_ELIGIBLE"},ownerGenerations:2,verifierGenerations:1,normalToolCalls:3,executedNormalToolInvocations:2});
  expect(verifier).toHaveBeenCalledOnce();expect(s.tools.snapshot().effectReceipts).toHaveLength(0);expect(s.tools.snapshot().state.cartQuote).toBeUndefined();
  const proof=s.tools.snapshot().policyLiterals.find(p=>p.ref.startsWith("pre-cart-quote:"));expect(proof).toBeDefined();expect(JSON.parse(proof!.text).grandTotalVnd).toBe(973100);
 });
 it.each([{...quote.args},{...quote.args,deliveryRegion:"MIEN-NAM"},{subjectRef:"SM613",offerTypes:["DIRECT","AO"],quantity:2}])("returning quotes require explicit quantity and exactly one offer before reading: %j",async args=>{
  const s=await setup(true,false);await s.tools.prepare!();s.readProduct.mockClear();
  expect((await s.tools.invoke({name:"quote_product",args})).reason).toBe("QUOTE_ARGUMENTS_OR_REF");expect(s.readProduct).not.toHaveBeenCalled();
 });
 it.each(["price","media"])("hands off silently on required %s failure and accounts partial execution",async mode=>{
  const s=await setup();await s.tools.prepare!();
  if(mode==="price")s.readProduct.mockResolvedValue({...s.f,snapshot:null} as never);else s.f.product.images=[];
  const result=await s.tools.invoke(quote);expect(result.status).not.toBe("OK");
  expect(await s.tools.terminalOutcome!()).toMatchObject({disposition:"HANDOFF",text:null});expect(s.authority().state.conversationOwner).toBe("HUMAN");
  expect(s.tools.quoteTaskWork!()).toEqual([{reservedUnits:2,readInvocations:1,selectionInvocations:mode==="price"?0:1}]);
 });
 it("preserves two exact requested offers without extra raw copies",async()=>{
  const s=await setup();s.f.snapshot.offers.AO=structuredClone(s.f.snapshot.offers.DIRECT!);s.f.snapshot.offers.AO!.rows.forEach(r=>{r.offer_type="AO";});
  await s.tools.prepare!();const result=await s.tools.invoke({...quote,args:{subjectRef:"SM613",offerTypes:["DIRECT","AO"]}});
  expect(result).toMatchObject({status:"OK",data:{sellingOptions:[{offerType:"DIRECT"},{offerType:"AO"}],media:{delivery:"PENDING_FINAL_GATE"}}});
  expect((result.data as Record<string,unknown>).read).toBeUndefined();
 });
 it("does not execute quote twice",async()=>{const s=await setup();await s.tools.prepare!();expect((await s.tools.invoke(quote)).status).toBe("OK");s.readProduct.mockClear();expect((await s.tools.invoke(quote)).reason).toBe("QUOTE_ALREADY_ATTEMPTED");expect(s.readProduct).not.toHaveBeenCalled();});
 it.each([3,4])("charges prepare and reserves two units with %s previous primitive calls",async calls=>{
  const s=await setup();let n=0;const verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const result=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Áo bao nhiêu?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier,owner:async():Promise<OwnerGeneration>=>{
   n++;const selected=n===1?Array.from({length:calls},()=>({name:"read_policy",args:{}})):[quote];
   return n===3?{kind:"FINAL",text:"Áo 499.000đ chị nhé."}:{kind:"TOOLS",calls:selected,content:{role:"model",parts:selected.map(functionCall=>({functionCall}))}};
  }});
  if(calls===3)expect(result).toMatchObject({normalToolCalls:6,executedNormalToolInvocations:6,executedToolInvocations:6,terminal:{disposition:"SEND_ELIGIBLE"}});
  else{expect(result.recovery?.originalReason).toBe("BUDGET");expect(s.tools.quoteTaskWork!()).toEqual([]);expect(verifier).not.toHaveBeenCalled();}
 });
 it("leaves an early FINAL untouched: first contact alone cannot select images",async()=>{
  const s=await setup();const result=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Sáng mai kịp không?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier:async()=>({result:{verdict:"PASS",violations:[]}}),owner:async()=>({kind:"FINAL",text:"Shop không nhận hẹn sáng mai chị nhé."})});
  expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");expect(s.tools.mediaSelection!()).toHaveLength(0);expect(s.tools.quoteTaskWork!()).toEqual([]);
 });
 it.each(["not_a_capability","read_product","quote_product"])("separates consumed units from admitted dispatch when %s is rejected",async name=>{
  const s=await setup();let n=0;
  const call={name,args:{subjectRef:"UNKNOWN",offerTypes:["DIRECT"]}};
  const result=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Áo bao nhiêu?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier:async()=>({result:{verdict:"PASS",violations:[]}}),owner:async():Promise<OwnerGeneration>=>++n===1?{kind:"TOOLS",calls:[call],content:{role:"model",parts:[{functionCall:call}]}}:{kind:"FINAL",text:"Dạ chị."}});
  expect(result.normalToolCalls).toBe(name==="quote_product"?3:2);
  expect(result.executedNormalToolInvocations).toBe(name==="read_product"?2:1);
  expect(s.tools.primitiveToolInvocations!()).toBe(name==="read_product"?1:0);
  if(name==="quote_product")expect(result.quoteTaskWork).toEqual([{reservedUnits:2,readInvocations:0,selectionInvocations:0}]);
 });
});


describe("returning total source and budget boundaries",()=>{
 it("keeps a missing current price fail-closed without fabricating a total",async()=>{
  const s=await setup(true,false);await s.tools.prepare!();s.f.snapshot=null as never;
  const r=await s.tools.invoke({...quote,args:{...quote.args,quantity:2}});
  expect(r.status).not.toBe("OK");expect(s.tools.snapshot().policyLiterals.some(p=>p.ref.startsWith("pre-cart-quote:"))).toBe(false);
  expect(s.tools.snapshot().effectReceipts).toHaveLength(0);expect(s.tools.quoteTaskWork!()).toEqual([{reservedUnits:2,readInvocations:1,selectionInvocations:0}]);
 });
 it.each([3,4])("reserves the same two units for a returning quote after %s reads",async prior=>{
  const s=await setup(true,false);let n=0;const verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const call={...quote,args:{...quote.args,quantity:2}};
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Hai áo cả ship bao nhiêu?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier,
   owner:async()=>++n===1?{kind:"TOOLS",calls:Array.from({length:prior},()=>({name:"read_policy",args:{}})),content:{role:"model",parts:[]}}:n===2?{kind:"TOOLS",calls:[call],content:{role:"model",parts:[{functionCall:call}]}}:{kind:"FINAL",text:"Hai áo cả ship 973.100đ chị nhé."}});
  if(prior===3){expect(r).toMatchObject({terminal:{disposition:"SEND_ELIGIBLE"},normalToolCalls:6,executedNormalToolInvocations:5});expect(verifier).toHaveBeenCalledOnce();}
  else{expect(r.recovery?.originalReason).toBe("BUDGET");expect(s.tools.quoteTaskWork!()).toEqual([]);expect(verifier).not.toHaveBeenCalled();}
 });
});
