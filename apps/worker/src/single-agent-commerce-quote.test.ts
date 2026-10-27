import {describe,it,expect,vi} from "vitest";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn,type OwnerGeneration} from "./single-agent-commerce-read-only.js";
import {commerceNow,commerceScope,fixturePolicy,fixtureProduct} from "./single-agent-commerce.test-support.js";
import {createConversationState} from "@lana/conversation-engine";
import type {HandoffAuthority} from "./single-agent-commerce-handoff.js";

const config={version:"EXPLICIT_QUOTE_V1",toolWorkAccounting:"PRIMITIVE_WORK_V2",normalUnits:2,standalone:true,maxPerTurn:1} as const;
async function setup(enabled=true){
 const scope=commerceScope(),f=fixtureProduct();
 f.product.images=[{url:"https://content.pancake.vn/front.jpg",role:"PRIMARY",angle:"FRONT",imageType:"MODEL",intents:[],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]}];
 const readProduct=vi.fn(async()=>f);
 const original=(await fixturePolicy()).bundle!;
 const policy={...original,artifacts:{...original.artifacts,handoffMatrix:{schemaVersion:1 as const,kind:"HANDOFF_MATRIX" as const,sourceMetadata:original.artifacts.shopPolicy.sourceMetadata,
  rules:(["PRICE_UNAVAILABLE","DEPENDENCY_FAILURE"] as const).map(reason=>({reason,customerMessagePolicy:"SILENT_HANDOFF" as const,holdingReply:null,tag:"NHAN_VIEN" as const}))}}};
 let authority:HandoffAuthority={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:"APP",now:commerceNow}),revision:scope.revision}};
 const tools=await createCommerceTools({read:{scope,clock:()=>commerceNow,entry:{firstContact:true,fromAd:false},initialProducts:[f.product],policy:fixturePolicy,
  catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},
  media:{allowedHostSuffixes:["pancake.vn"]},handoff:{read:async()=>structuredClone(authority),commit:vi.fn(async change=>{authority=structuredClone(change.next);return true;}),policy:async()=>policy},
  ...(enabled?{quoteTask:config}:{})} as Parameters<typeof createCommerceTools>[0]);
 return {scope,f,tools,readProduct,authority:()=>authority};
}
const quote={name:"quote_product",args:{subjectRef:"SM613",offerTypes:["DIRECT"]}};
describe("explicit quote operation",()=>{
 it("opt-in completes price and selected media before exact final verification",async()=>{
  const s=await setup();expect(s.tools.availableTools).toContain("quote_product");
  let n=0;const verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Áo này bao nhiêu em?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",verifier,
   owner:async():Promise<OwnerGeneration>=>++n===1?{kind:"TOOLS",calls:[quote],content:{role:"model",parts:[{functionCall:quote}]}}:{kind:"FINAL",text:"Áo 499.000đ chị nhé."}});
  expect(r.terminal.disposition).toBe("SEND_ELIGIBLE");expect(s.tools.mediaSelection!()).toHaveLength(1);expect(verifier).toHaveBeenCalledOnce();
  expect(r).toMatchObject({normalToolCalls:3,executedNormalToolInvocations:3,executedToolInvocations:3,quoteTaskWork:[{reservedUnits:2,readInvocations:1,selectionInvocations:1}]});
 });
 it.each(["read_product","select_product_media","apply_customer_state","add_to_cart","request_handoff","quote_product"])("rejects mixed quote+%s before any sibling I/O",async name=>{
  const s=await setup();const calls=[quote,{name,args:{}}];
  const result=await s.tools.invokeBatch(calls);
  expect(result.every(x=>x.status==="REJECTED")).toBe(true);expect(s.readProduct).not.toHaveBeenCalled();
 });
 it("legacy does not expose the operation",async()=>{const s=await setup(false);expect(s.tools.availableTools).not.toContain("quote_product");});
 it.each([{subjectRef:"UNKNOWN",offerTypes:["DIRECT"]},{subjectRef:"SM613",offerTypes:["UNKNOWN"]},{subjectRef:"SM613",offerTypes:["DIRECT","DIRECT"]},{subjectRef:"SM613",offerTypes:["DIRECT"],skipMedia:true},{subjectRef:"SM613",offerTypes:["DIRECT"],color:null}])("rejects unbound/unknown/duplicate/extra inputs before source I/O",async args=>{
  const s=await setup();await s.tools.prepare!();s.readProduct.mockClear();
  expect((await s.tools.invoke({name:"quote_product",args})).status).toBe("REJECTED");expect(s.readProduct).not.toHaveBeenCalled();
 });
 it.each([false,null])("does not expose quote to non-first contact %s",async firstContact=>{
  const s=await setup();const {withExplicitQuoteTask}=await import("./single-agent-commerce-quote.js");
  const t=withExplicitQuoteTask({...s.tools,availableTools:s.tools.availableTools!.filter(n=>n!=="quote_product")},s.scope,firstContact);
  expect(t.availableTools).not.toContain("quote_product");expect((await t.invoke(quote)).status).toBe("REJECTED");expect(s.readProduct).not.toHaveBeenCalled();
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
  else{expect(result.terminal.reason).toBe("BUDGET");expect(s.tools.quoteTaskWork!()).toEqual([]);expect(verifier).not.toHaveBeenCalled();}
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
