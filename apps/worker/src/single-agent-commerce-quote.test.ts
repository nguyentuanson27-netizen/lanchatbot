import {describe,it,expect,vi} from "vitest";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn,type OwnerGeneration} from "./single-agent-commerce-read-only.js";
import {commerceNow,commerceScope,fixturePolicy,fixtureProduct} from "./single-agent-commerce.test-support.js";
import {createConversationState} from "@lana/conversation-engine";
import type {HandoffAuthority} from "./single-agent-commerce-handoff.js";
import {commerceHash} from "./single-agent-commerce-read-only-context.js";
import {makeBinding,finalGate} from "./single-agent-semantic-verifier-boundary.js";
import {quoteBatchWork,withExplicitQuoteTask} from "./single-agent-commerce-quote.js";

const config={version:"EXPLICIT_QUOTE_V3",toolWorkAccounting:"PRIMITIVE_WORK_V2",normalUnits:1,readOnlyBatch:false,maxPerTurn:2} as const;
async function setup(enabled=true,firstContact:boolean|null=true,secondProduct=false){
 const scope=commerceScope(),f=fixtureProduct(),f2=fixtureProduct("SM614");
 f.product.images=[{url:"https://content.pancake.vn/front.jpg",role:"PRIMARY",angle:"FRONT",imageType:"MODEL",intents:[],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
 f2.product.images=structuredClone(f.product.images);
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
it("admits exactly one writer first and closed read siblings with one primitive per quote",()=>{
 expect(quoteBatchWork([{name:"apply_customer_state",args:{ops:[{op:"SET",field:"preferences.colors",value:["be"],sourceQuote:"be"}]}},quote])).toMatchObject({units:2,quotes:1});
 expect(quoteBatchWork([{name:"record_negotiation",args:{intent:"PRICE_OBJECTION",sourceQuote:"Bớt cho chị"}},quote])).toMatchObject({units:2});
 for(const sibling of [{name:"recommend_size",args:{subjectRef:"SM613"}},{name:"quote_cart",args:{}},{name:"search_products",args:{query:"áo"}}])expect(quoteBatchWork([quote,sibling])).toBeNull();
 expect(quoteBatchWork([quote,{name:"apply_customer_state",args:{ops:[]}}])).toBeNull();
});
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
  const s=await setup();await s.tools.prepare!();s.readProduct.mockResolvedValue({...s.f,snapshot:null} as never);s.readPolicy.mockClear();
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
  expect(r).toMatchObject({normalToolCalls:3,executedNormalToolInvocations:3,executedToolInvocations:3,quoteTaskWork:[{reservedUnits:1,readInvocations:1,selectionInvocations:0}]});
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
  expect(s.tools.quoteTaskWork!()).toEqual([{reservedUnits:1,readInvocations:1,selectionInvocations:0}]);
  expect((await s.tools.readback()).policyLiterals.some(p=>p.ref.startsWith("pre-cart-quote:"))).toBe(true);
 });
 it("follow-up quantity quote reaches final verifier with current total and no mutation or image",async()=>{
  const s=await setup(true,false);s.f.product.images=[];let n=0;
  const call={...quote,args:{...quote.args,quantity:2}},verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Em báo tổng cả phí ship nhé.",history:[{role:"customer",text:"Chị lấy hai áo, một M một L."},{role:"shop",text:"Chị lấy màu nào ạ?"}],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier,
   owner:async request=>{expect(request.availableTools).toContain("quote_product");return ++n===1?{kind:"TOOLS",calls:[call],content:{role:"model",parts:[{functionCall:call}]}}:{kind:"FINAL",text:"Hai áo cả ship là 973.100đ chị nhé."};}});
  expect(r).toMatchObject({terminal:{disposition:"SEND_ELIGIBLE"},ownerGenerations:2,verifierGenerations:1,normalToolCalls:2,executedNormalToolInvocations:2});
  expect(verifier).toHaveBeenCalledOnce();expect(s.tools.snapshot().effectReceipts).toHaveLength(0);expect(s.tools.snapshot().state.cartQuote).toBeUndefined();
  const proof=s.tools.snapshot().policyLiterals.find(p=>p.ref.startsWith("pre-cart-quote:"));expect(proof).toBeDefined();expect(JSON.parse(proof!.text).grandTotalVnd).toBe(973100);
 });
 it.each([{...quote.args},{...quote.args,deliveryRegion:"MIEN-NAM"},{subjectRef:"SM613",offerTypes:["DIRECT","AO"],quantity:2}])("returning quotes require explicit quantity and exactly one offer before reading: %j",async args=>{
  const s=await setup(true,false);await s.tools.prepare!();s.readProduct.mockClear();
  expect((await s.tools.invoke({name:"quote_product",args})).reason).toBe("QUOTE_ARGUMENTS_OR_REF");expect(s.readProduct).not.toHaveBeenCalled();
 });
 it("hands off silently on price failure and accounts partial execution",async()=>{
  const mode="price";
  const s=await setup();await s.tools.prepare!();
  if(mode==="price")s.readProduct.mockResolvedValue({...s.f,snapshot:null} as never);else s.f.product.images=[];
  const result=await s.tools.invoke(quote);expect(result.status).not.toBe("OK");
  expect(await s.tools.terminalOutcome!()).toMatchObject({disposition:"HANDOFF",text:null});expect(s.authority().state.conversationOwner).toBe("HUMAN");
  expect(s.tools.quoteTaskWork!()).toEqual([{reservedUnits:1,readInvocations:1,selectionInvocations:0}]);
 });
 it("preserves two exact requested offers without extra raw copies",async()=>{
  const s=await setup();s.f.snapshot.offers.AO=structuredClone(s.f.snapshot.offers.DIRECT!);s.f.snapshot.offers.AO!.rows.forEach(r=>{r.offer_type="AO";});
  await s.tools.prepare!();const result=await s.tools.invoke({...quote,args:{subjectRef:"SM613",offerTypes:["DIRECT","AO"]}});
  expect(result).toMatchObject({status:"OK",data:{sellingOptions:[{offerType:"DIRECT"},{offerType:"AO"}],calculationBasis:"PRE_CART_POLICY"}});
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
  else{expect(result.recovery?.originalReason).toBe("OWNER_TOOL_MODE");expect(s.tools.quoteTaskWork!()).toEqual([]);expect(verifier).not.toHaveBeenCalled();}
 });
 it("covers early FINAL with the same code-owned opening photo obligation",async()=>{
  const s=await setup();const result=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Sáng mai kịp không?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier:async()=>({result:{verdict:"PASS",violations:[]}}),owner:async()=>({kind:"FINAL",text:"Shop không nhận hẹn sáng mai chị nhé."})});
  expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");expect(s.tools.mediaSelection!()).toHaveLength(1);expect(s.tools.quoteTaskWork!()).toEqual([]);
 });
 it.each(["not_a_capability","read_product","quote_product"])("separates consumed units from admitted dispatch when %s is rejected",async name=>{
  const s=await setup();let n=0;
  const call={name,args:{subjectRef:"UNKNOWN",offerTypes:["DIRECT"]}};
  const result=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Áo bao nhiêu?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier:async()=>({result:{verdict:"PASS",violations:[]}}),owner:async():Promise<OwnerGeneration>=>++n===1?{kind:"TOOLS",calls:[call],content:{role:"model",parts:[{functionCall:call}]}}:{kind:"FINAL",text:"Dạ chị."}});
  expect(result.normalToolCalls).toBe(3);
  expect(result.executedNormalToolInvocations).toBe(name==="read_product"?3:2);
  expect(s.tools.primitiveToolInvocations!()).toBe(name==="read_product"?1:0);
  if(name==="quote_product")expect(result.quoteTaskWork).toEqual([]);
 });
});


describe("returning total source and budget boundaries",()=>{
 it("keeps a missing current price fail-closed without fabricating a total",async()=>{
  const s=await setup(true,false);await s.tools.prepare!();s.f.snapshot=null as never;
  const r=await s.tools.invoke({...quote,args:{...quote.args,quantity:2}});
  expect(r.status).not.toBe("OK");expect(s.tools.snapshot().policyLiterals.some(p=>p.ref.startsWith("pre-cart-quote:"))).toBe(false);
  expect(s.tools.snapshot().effectReceipts).toHaveLength(0);expect(s.tools.quoteTaskWork!()).toEqual([{reservedUnits:1,readInvocations:1,selectionInvocations:0}]);
 });
 it.each([4,5])("reserves one unit for a returning quote after %s reads",async prior=>{
  const s=await setup(true,false);let n=0;const verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const call={...quote,args:{...quote.args,quantity:2}};
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Hai áo cả ship bao nhiêu?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier,
   owner:async()=>++n===1?{kind:"TOOLS",calls:Array.from({length:prior},()=>({name:"read_policy",args:{}})),content:{role:"model",parts:[]}}:n===2?{kind:"TOOLS",calls:[call],content:{role:"model",parts:[{functionCall:call}]}}:{kind:"FINAL",text:"Hai áo cả ship 973.100đ chị nhé."}});
  if(prior===4){expect(r).toMatchObject({terminal:{disposition:"SEND_ELIGIBLE"},normalToolCalls:6,executedNormalToolInvocations:6});expect(verifier).toHaveBeenCalledOnce();}
  else{expect(r.recovery?.originalReason).toBe("OWNER_TOOL_MODE");expect(s.tools.quoteTaskWork!()).toEqual([]);expect(verifier).not.toHaveBeenCalled();}
 });
});


describe('quote-target opening obligations and dispatch reservation',()=>{
 it.each([1,2])('covers %s successful quote targets from a multiple-product opening without colour leakage',async count=>{
  const s=await setup(true,true,true);let n=0;
  for(const row of s.f.snapshot.offers.DIRECT!.rows)row.color="be";
  const calls=[{...quote,args:{...quote.args,color:'be'}},...(count===2?[{name:'quote_product',args:{subjectRef:'SM614',offerTypes:['DIRECT']}}]:[])];
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Báo giá hai mẫu cho chị.',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',verifier:async()=>({result:{verdict:'PASS',violations:[]}}),
   owner:async()=>++n===1?{kind:'TOOLS',calls,content:{role:'model',parts:calls.map(functionCall=>({functionCall}))}}:{kind:'FINAL',text:'Dạ chị.'}});
  expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');
  expect(s.tools.openingQuoteTargets?.()).toEqual(count===1?['SM613']:['SM613','SM614']);
  expect(new Set(s.tools.mediaSelection?.().map(a=>a.productId))).toEqual(new Set(count===1?['SM613']:['SM613','SM614']));
  expect(r.normalToolCalls).toBe(2+count*2);expect(r.executedNormalToolInvocations).toBe(r.normalToolCalls);
  expect(r.openingMediaWork?.chargedUnits).toBe(count);
  const proof=s.tools.snapshot().policyLiterals.find(p=>p.ref.startsWith('opening-quote:'))!;
  expect(JSON.parse(proof.text)).toMatchObject({requestId:s.scope.requestId,recipient:s.scope.recipient,bindingVersion:s.scope.bindingVersion});
 });
 it('rejects seven-unit quote work before any batch invocation even with a writer',async()=>{
  const s=await setup(true,true,true);let invoked=false;
  const original=s.tools.invokeBatch.bind(s.tools);s.tools.availableTools=[...s.tools.availableTools!,'apply_customer_state'];
  s.tools.invokeBatch=async(...args)=>{invoked=true;return original(...args);};
  const calls=[{name:'apply_customer_state',args:{ops:[{op:'SET',field:'preferences.colors',value:['be'],sourceQuote:'be'}]}},quote,
   {name:'quote_product',args:{subjectRef:'SM614',offerTypes:['DIRECT']}}];
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Chị thích be, báo giá nhé.',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',verifier:async()=>({result:{verdict:'PASS',violations:[]}}),
   owner:async()=>({kind:'TOOLS',calls,content:{role:'model',parts:calls.map(functionCall=>({functionCall}))}})});
  expect(r.recovery?.originalReason).toBe('OPENING_MEDIA_BUDGET');expect(invoked).toBe(false);expect(s.tools.quoteTaskWork?.()).toEqual([]);
 });
 it.each(['view_product_media','select_product_media'])('keeps failed %s separate from price colour and outbound generic image policy',async name=>{
  const s=await setup(true,true,true);let n=0;
  // VIEW happens first in a non-quote round. Its failed colour query does not
  // authorize a visual statement; SELECT failure remains an outbound restriction.
  const lookup={name,args:{subjectRef:'SM613',intent:'GENERIC',color:'be'}};
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Mẫu này bao nhiêu em?',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',verifier:async()=>({result:{verdict:'PASS',violations:[]}}),
   owner:async()=>++n===1?{kind:'TOOLS',calls:[lookup],content:{role:'model',parts:[{functionCall:lookup}]}}:n===2?{kind:'TOOLS',calls:[quote],content:{role:'model',parts:[{functionCall:quote}]}}:{kind:'FINAL',text:'Dạ chị.'}});
  expect(r.terminal.disposition).toBe(name==='view_product_media'?'SEND_ELIGIBLE':'HANDOFF');
  if(name==='view_product_media')expect(s.tools.mediaSelection?.().some(a=>a.productId==='SM613')).toBe(true);
 });
});


it('accepts preference ops without invented sourceQuote requirements but rejects invalid state shapes',()=>{
 const preference={name:'apply_customer_state',args:{ops:[{op:'SET',field:'preferences.colors',value:['be']}]}};
 expect(quoteBatchWork([preference,quote])).toMatchObject({units:2});
 expect(quoteBatchWork([{...preference,args:{ops:[{...preference.args.ops[0],value:['ế'.repeat(64)]}]}},quote])).toMatchObject({units:2});
 for(const ops of [[{op:'CLEAR',field:'preferences.colors',value:[]}],[{op:'SET',field:'fitPreference',value:'RELAXED'}],Array(9).fill(preference.args.ops[0])])
  expect(quoteBatchWork([{name:'apply_customer_state',args:{ops}},quote])).toBeNull();
});
it.each(['revision','customerProfileRevision','recipient','permission'])('stops quote after writer readback changes %s',async field=>{
 const s=await setup(true,false);await s.tools.prepare!();let state=s.tools.snapshot().state;
 const invoke=vi.fn(async()=>({status:'OK' as const}));
 const base={...s.tools,availableTools:[...s.tools.availableTools!,'apply_customer_state'],snapshot:()=>({...s.tools.snapshot(),state}),invoke,
  readback:async()=>{state={...state,[field]:field==='permission'?false:field==='recipient'?'other':Number(state[field]??0)+1};return {...s.tools.snapshot(),state};}};
 const t=withExplicitQuoteTask(base,s.scope,false,async()=>(await fixturePolicy()).bundle!.policy,()=>commerceNow);
 const results=await t.invokeBatch([{name:'apply_customer_state',args:{ops:[{op:'SET',field:'preferences.colors',value:['be']}]}},{...quote,args:{...quote.args,quantity:1}}]);
 expect(results[1]?.reason).toBe('QUOTE_BATCH_STOPPED');expect(invoke).toHaveBeenCalledOnce();
});
it('rejects invalid returning quote shape before a valid writer can commit',async()=>{
 const s=await setup(true,false);await s.tools.prepare!();const invoke=vi.fn(async()=>({status:'OK' as const}));
 const t=withExplicitQuoteTask({...s.tools,availableTools:[...s.tools.availableTools!,'apply_customer_state'],invoke},s.scope,false,async()=>(await fixturePolicy()).bundle!.policy,()=>commerceNow);
 const result=await t.invokeBatch([{name:'apply_customer_state',args:{ops:[{op:'SET',field:'preferences.colors',value:['be'],sourceQuote:'be'}]}},quote]);
 expect(result.every(r=>r.status==='REJECTED')).toBe(true);expect(invoke).not.toHaveBeenCalled();
});


it.each(['same','other-product','other-offer','other-quantity','old-binding'])('cart-quote reference is scoped to exact current requested cart: %s',async mode=>{
 const s=await setup(true,false);await s.tools.prepare!();
 const cart={cartId:'cart',cartVersion:2,grandTotalVnd:499000};
 const state={...s.tools.snapshot().state,cartQuote:cart,cartItems:[{productRef:mode==='other-product'?'SM614':'SM613',offerType:mode==='other-offer'?'AO':'DIRECT',quantity:mode==='other-quantity'?2:1,components:[{color:'navy',size:'M'}]}]};
 const original=s.tools.snapshot.bind(s.tools);
 const base={...s.tools,snapshot:()=>({...original(),state,cartBinding:{cartId:'cart',cartVersion:mode==='old-binding'?1:2}})} as typeof s.tools;
 const t=withExplicitQuoteTask(base,s.scope,false,async()=>(await fixturePolicy()).bundle!.policy,()=>commerceNow);
 const result=await t.invoke({...quote,args:{...quote.args,quantity:1}});
 expect(result.status).toBe('OK');
 expect((result.data as {currentCartQuoteRef:unknown}).currentCartQuoteRef).toBe(mode==='same'?commerceHash(cart):null);
 expect(JSON.parse(t.snapshot().policyLiterals.find(p=>p.ref.startsWith('pre-cart-quote:'))!.text).currentCartQuoteRef).toBe(mode==='same'?commerceHash(cart):null);
});


it('keeps pre-cart offer-price source separate when cart overlay supersedes generic claims',async()=>{
 const s=await setup(true,false);await s.tools.prepare!();
 const original=s.tools.snapshot.bind(s.tools);
 const t=withExplicitQuoteTask({...s.tools,snapshot:()=>{const c=original();return {...c,protectedClaims:c.protectedClaims.filter(p=>(p as {type:string}).type!=='PRICE')};}},s.scope,false,async()=>(await fixturePolicy()).bundle!.policy,()=>commerceNow);
 const r=await t.invoke({...quote,args:{...quote.args,quantity:1}});
 expect(r).toMatchObject({status:'OK',data:{preCartQuote:{subtotalVnd:499000,calculationBasis:'PRE_CART_POLICY'}}});
 const literal=t.snapshot().policyLiterals.find(p=>p.ref.startsWith('quote-price:'))!;
 expect(JSON.parse(literal.text)).toMatchObject({kind:'QUOTE_OFFER_PRICE_V1',claim:{type:'PRICE',scope:{productId:'SM613',variantId:'offer:SM613:DIRECT'},value:{amountVnd:499000}}});
 expect(t.snapshot().protectedClaims.some(p=>(p as {type:string}).type==='PRICE')).toBe(false);
 s.f.snapshot.offers.DIRECT!.sale_price=599000;s.f.snapshot.offers.DIRECT!.rows[0]!.sale_price=599000;
 await expect(t.readback()).rejects.toThrow('POS_OBSERVATION_CHANGED');
});


it.each(['missing','provenance','expired','source-version'])('rejects absent or mismatched offer-price proof before final eligibility: %s',async mode=>{
 const s=await setup(true,false);await s.tools.prepare!();
 const getter=s.tools.quotePriceEvidence!.bind(s.tools);
 const t=withExplicitQuoteTask({...s.tools,quotePriceEvidence:q=>{
  const proof=structuredClone(getter(q));if(mode==='missing')return [];
  for(const p of proof){if(mode==='expired')p.claim.provenance.expiresAt=new Date(commerceNow.getTime()-1).toISOString();
   if(mode==='source-version')p.sourceVersion='OTHER_SOURCE';
   if(mode==='provenance')p.claim.scope={kind:'PRODUCT',productId:'OTHER_PRODUCT',variantId:'offer:OTHER_PRODUCT:DIRECT'};}
  return proof;
 }},s.scope,false,async()=>(await fixturePolicy()).bundle!.policy,()=>commerceNow);
 expect((await t.invoke({...quote,args:{...quote.args,quantity:1}})).status).not.toBe('OK');
 expect(t.snapshot().policyLiterals.some(p=>p.ref.startsWith('quote-price:'))).toBe(false);
});
it('readback refuses a missing exact offer proof without renewing the old literal',async()=>{
 const s=await setup(true,false);await s.tools.prepare!();let missing=false;
 const getter=s.tools.quotePriceEvidence!.bind(s.tools),t=withExplicitQuoteTask({...s.tools,quotePriceEvidence:q=>missing?[]:getter(q)},s.scope,false,async()=>(await fixturePolicy()).bundle!.policy,()=>commerceNow);
 expect((await t.invoke({...quote,args:{...quote.args,quantity:1}})).status).toBe('OK');missing=true;
 await expect(t.readback()).rejects.toThrow('QUOTE_PRICE_SOURCE_CHANGED');
});
it('the no-I/O proof getter never substitutes a different read colour and preserves pre-cart versus cart totals',async()=>{
 const s=await setup(true,false);
 for(const row of s.f.snapshot.offers.DIRECT!.rows)row.color='be';await s.tools.prepare!();
 const call={...quote,args:{...quote.args,color:'be',quantity:1}};
 const cart={cartId:'cart',cartVersion:2,grandTotalVnd:450000,discountTotalVnd:49000};
 const original=s.tools.snapshot.bind(s.tools),t=withExplicitQuoteTask({...s.tools,snapshot:()=>({...original(),state:{...original().state,cartQuote:cart}})},s.scope,false,async()=>(await fixturePolicy()).bundle!.policy,()=>commerceNow);
 const before=s.readProduct.mock.calls.length;
 const r=await t.invoke(call);expect(r).toMatchObject({status:'OK',data:{preCartQuote:{subtotalVnd:499000,grandTotalVnd:524000},appliesNegotiationReceipt:false}});
 expect(t.snapshot().state.cartQuote).toEqual(cart);expect(s.readProduct.mock.calls.length-before).toBe(1);
 const reads=s.readProduct.mock.calls.length;
 expect(s.tools.quotePriceEvidence!({subjectRef:'SM613',offerTypes:['DIRECT'],color:'navy'})).toEqual([]);
 expect(s.tools.quotePriceEvidence!({subjectRef:'SM613',offerTypes:['DIRECT'],color:'be'})).toHaveLength(1);
 expect(s.readProduct.mock.calls.length).toBe(reads);expect(t.quoteTaskWork?.()).toEqual([{reservedUnits:1,readInvocations:1,selectionInvocations:0}]);
});
