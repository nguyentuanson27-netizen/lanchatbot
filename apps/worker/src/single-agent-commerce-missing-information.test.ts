import {describe,it,expect,vi} from "vitest";
import {createConversationState} from "@lana/conversation-engine";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn,type OwnerGeneration} from "./single-agent-commerce-read-only.js";
import type {HandoffAuthority} from "./single-agent-commerce-handoff.js";
import {commerceNow,commerceScope,fixturePolicy,fixtureProduct,fixtureProfile,fixtureSizeInput} from "./single-agent-commerce.test-support.js";

async function setup(mode:"missing-pos"|"complete"|"policy-error"="missing-pos",commitMode:"ok"|"denied"|"unknown"="ok") {
 const scope=commerceScope(),product=fixtureProduct("QU714"),original=(await fixturePolicy()).bundle!;
 const policy={...original,artifacts:{...original.artifacts,handoffMatrix:{schemaVersion:1 as const,kind:"HANDOFF_MATRIX" as const,sourceMetadata:original.artifacts.shopPolicy.sourceMetadata,
  rules:(["PRICE_UNAVAILABLE","STOCK_UNAVAILABLE","ETA_UNAVAILABLE","POLICY_UNAVAILABLE","SIZE_RULE_UNAVAILABLE","DEPENDENCY_FAILURE"] as const).map(reason=>({
   reason,customerMessagePolicy:"HOLDING_REPLY_THEN_HANDOFF" as const,holdingReply:"Bên em sẽ kiểm tra lại rồi báo chị nhé.",tag:"NHAN_VIEN" as const}))}}};
 let current:HandoffAuthority={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:"APP",now:commerceNow}),revision:scope.revision}};
 const commit=vi.fn(async ({next}:{next:HandoffAuthority})=>{
  if(commitMode==="unknown")throw Error("COMMIT_UNKNOWN");if(commitMode==="denied")return false;current=structuredClone(next);return true;
 });
 const read={scope,clock:()=>commerceNow,initialProducts:[product.product],policy:async()=>{
  if(mode==="policy-error")throw Error("POLICY_SOURCE_UNAVAILABLE");return fixturePolicy();
 },catalog:{readProduct:async()=>({...product,snapshot:mode==="missing-pos"?null:product.snapshot}),searchText:async()=>({status:"NOT_FOUND" as const,reasonCode:"NO_CANDIDATES" as const})}};
 const handoff={read:async()=>structuredClone(current),commit,policy:async()=>policy};
 return {scope,product,read,handoff,commit,current:()=>current};
}
const native=(name:string,args:unknown):OwnerGeneration=>({kind:"TOOLS",calls:[{name,args}],content:{role:"model",parts:[{functionCall:{name,args}}]}});

describe("missing shop information uses real handoff; missing customer input stays conversational",()=>{
 it("hands off an explicitly requested quote with unavailable POS before another owner or verifier",async()=>{
  const s=await setup(),tools=await createCommerceTools({read:s.read,handoff:s.handoff});
  const owner=vi.fn(async()=>native("read_product",{subjectRef:"QU714",offerType:"DIRECT"})),verifier=vi.fn();
  const result=await runCommerceTurn({scope:s.scope,tools,owner,verifier,clock:s.read.clock,latest:"Quần size M còn không, bao nhiêu em?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm"});
  expect(result.terminal).toMatchObject({disposition:"HANDOFF",reason:"PRICE_UNAVAILABLE",text:"Bên em sẽ kiểm tra lại rồi báo chị nhé."});
  expect(s.current().state.conversationOwner).toBe("HUMAN");expect(s.commit).toHaveBeenCalledOnce();
  expect(owner).toHaveBeenCalledOnce();expect(verifier).not.toHaveBeenCalled();
  await tools.invokeBatch([{name:"read_product",args:{subjectRef:"QU714",offerType:"DIRECT"}}]);expect(s.commit).toHaveBeenCalledOnce();
 });
 it.each(["denied","unknown"] as const)("does not claim a transfer or resume model advice after an unproved %s handoff",async mode=>{
  const s=await setup("missing-pos",mode),tools=await createCommerceTools({read:s.read,handoff:s.handoff});
  const owner=vi.fn(async()=>native("read_product",{subjectRef:"QU714",offerType:"DIRECT"})),verifier=vi.fn();
  const result=await runCommerceTurn({scope:s.scope,tools,owner,verifier,clock:s.read.clock,latest:"Quần bao nhiêu em?",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm"});
  expect(result.terminal).toMatchObject({disposition:"NO_SEND",text:null});expect(s.commit).toHaveBeenCalledOnce();
  expect(owner).toHaveBeenCalledOnce();expect(verifier).not.toHaveBeenCalled();
  expect(await tools.invokeBatch([{name:"read_product",args:{subjectRef:"QU714",offerType:"DIRECT"}}])).toMatchObject([{status:"REJECTED"}]);
  expect(s.commit).toHaveBeenCalledOnce();
 });
 it("hands off policy read failure when independent handoff authority remains available",async()=>{
  const s=await setup("policy-error"),tools=await createCommerceTools({read:s.read,handoff:s.handoff});
  await tools.invokeBatch([{name:"read_policy",args:{}}]);
  expect(await tools.terminalOutcome!()).toMatchObject({disposition:"HANDOFF",reason:"POLICY_UNAVAILABLE"});expect(s.commit).toHaveBeenCalledOnce();
 });
 it("keeps a material-only read usable when offers are unknown but description is available",async()=>{
  const s=await setup(),tools=await createCommerceTools({read:s.read,handoff:s.handoff});
  expect(await tools.invoke({name:"read_product",args:{subjectRef:"QU714",detailsOnly:true}})).toMatchObject({status:"OK",data:{availableOffers:null,content:expect.anything()}});
  expect(await tools.terminalOutcome!()).toBeNull();expect(s.commit).not.toHaveBeenCalled();
 });
 it("does not hand off valid quote reads or rejected model arguments",async()=>{
  const s=await setup("complete"),tools=await createCommerceTools({read:s.read,handoff:s.handoff});
  expect(await tools.invoke({name:"read_product",args:{subjectRef:"QU714",offerType:"DIRECT"}})).toMatchObject({status:"OK",data:{availability:{price:{status:"OK"}}}});
  expect(await tools.invoke({name:"read_product",args:{subjectRef:"invented"}})).toMatchObject({status:"REJECTED"});
  expect(await tools.terminalOutcome!()).toBeNull();expect(s.commit).not.toHaveBeenCalled();
 });
 it("hands off unknown stock even when the price is available",async()=>{
  const s=await setup("complete");s.product.snapshot.offers.DIRECT!.rows[0]!.stock_quantity=null;
  const tools=await createCommerceTools({read:s.read,handoff:s.handoff});
  await tools.invoke({name:"read_product",args:{subjectRef:"QU714",offerType:"DIRECT"}});
  expect(await tools.terminalOutcome!()).toMatchObject({disposition:"HANDOFF",reason:"STOCK_UNAVAILABLE"});expect(s.commit).toHaveBeenCalledOnce();
 });
 it("hands off a requested ETA whose shop fulfillment data is missing",async()=>{
  const s=await setup("complete"),tools=await createCommerceTools({read:s.read,handoff:s.handoff});
  await tools.invoke({name:"read_product",args:{subjectRef:"QU714",offerType:"DIRECT",deliveryRegion:"MIEN-NAM"}});
  expect(await tools.terminalOutcome!()).toMatchObject({disposition:"HANDOFF",reason:"ETA_UNAVAILABLE"});expect(s.commit).toHaveBeenCalledOnce();
 });
 it.each(["GENERIC","FEEDBACK"])("hands off a missing requested %s image instead of calling a different image a substitute",async intent=>{
  const s=await setup("complete"),tools=await createCommerceTools({read:s.read,handoff:s.handoff,media:{allowedHostSuffixes:["content.pancake.vn"]}});
  const result=await tools.invoke({name:"select_product_media",args:{subjectRef:"QU714",intent}});
  expect(result).toMatchObject({status:"UNAVAILABLE",reason:"NO_VERIFIED_MATCHING_MEDIA"});
  expect(await tools.terminalOutcome!()).toMatchObject({disposition:"HANDOFF",reason:"DEPENDENCY_FAILURE"});expect(s.commit).toHaveBeenCalledOnce();
 });
 it("does not invent a handoff capability in the isolated read-only harness",async()=>{
  const s=await setup(),tools=await createCommerceTools({read:s.read});
  const result=await tools.invoke({name:"read_product",args:{subjectRef:"QU714",offerType:"DIRECT"}});
  expect(result).toMatchObject({status:"OK",data:{availability:{price:{status:"UNAVAILABLE"}}}});
  expect(tools.availableTools).not.toContain("request_handoff");expect(s.commit).not.toHaveBeenCalled();
 });
 it("asks for missing customer measurements without handing off a product with a verified chart",async()=>{
  const s=await setup("complete"),profile=fixtureProfile();profile.profile.measurements=[];profile.fieldEvidence={};
  const tools=await createCommerceTools({read:s.read,handoff:s.handoff,state:{store:{read:async()=>structuredClone(profile),compareAndSwap:async()=>true},sourceMessages:[],sizeInput:async()=>fixtureSizeInput()}});
  const result=await tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}});
  expect(result).toMatchObject({status:"OK",data:{missingInputs:expect.any(Array)}});
  expect((result.data as {missingInputs:string[]}).missingInputs.length).toBeGreaterThan(0);
  expect(await tools.terminalOutcome!()).toBeNull();expect(s.commit).not.toHaveBeenCalled();
 });
 it("hands off unavailable size sources instead of misclassifying them as bad customer measurements",async()=>{
  const s=await setup("complete"),profile=fixtureProfile();
  const tools=await createCommerceTools({read:s.read,handoff:s.handoff,state:{store:{read:async()=>structuredClone(profile),compareAndSwap:async()=>true},sourceMessages:[],sizeInput:async()=>{throw Error("SIZE_SOURCE_OFFLINE");}}});
  expect(await tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}})).toMatchObject({status:"UNAVAILABLE",reason:"SIZE_SOURCE_UNAVAILABLE"});
  expect(await tools.terminalOutcome!()).toMatchObject({disposition:"HANDOFF",reason:"SIZE_RULE_UNAVAILABLE"});expect(s.commit).toHaveBeenCalledOnce();
 });
});
