import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn,resultBudgetView,type OwnerRequest} from "./single-agent-commerce-read-only.js";
import {commerceNow,commerceScope,fixturePolicy,fixtureProduct} from "./single-agent-commerce.test-support.js";
import {createConversationState} from "@lana/conversation-engine";
import type {HandoffAuthority} from "./single-agent-commerce-handoff.js";
import type {CommerceToolCall,CommerceToolResult} from "./single-agent-commerce-read-only-tools.js";

const fixture=JSON.parse(readFileSync(new URL("../evals/single-agent-commerce-read-only/fixtures/discovery-feasibility.public.json",import.meta.url),"utf8"));
const bytes=(v:unknown)=>Buffer.byteLength(JSON.stringify(v));
const ownerPrompt=readFileSync(new URL("../evals/single-agent-commerce-read-only/prompts/owner.vi.txt",import.meta.url),"utf8");
const config={version:"EXPLICIT_QUOTE_V1",toolWorkAccounting:"PRIMITIVE_WORK_V2",normalUnits:2,standalone:true,maxPerTurn:1} as const;

describe("discovery feasibility through composed reads and actual mocked owner wire",()=>{
 it.each(["complete","partial","source-failure"])("keeps representative two-candidate batch within existing bounds: %s",async mode=>{
  const {createGeminiCommerceInference,readOnlyDeclarations,handoffDeclarations}=await import(new URL("../evals/single-agent-commerce-read-only/gemini-inference.mjs",import.meta.url).href);
  const scope=commerceScope();
  const make=(data:Record<string,any>)=>{
   const source=fixtureProduct(data.productId);source.product.title=data.title;source.product.descriptionXml=data.description??data.descriptionXml;source.product.attributes=null;
   const template=structuredClone(source.snapshot.offers.DIRECT!);
   source.snapshot.offers=Object.fromEntries((data.availableOffers??["DIRECT"]).map((offer:string)=>[offer,{...structuredClone(template),sale_price:data.selectedPriceVnd??499000,
    rows:(data.variants?.length?data.variants:template.rows).map((r:Record<string,any>,index:number)=>({...template.rows[0],offer_type:offer,size:r.size??"M",parent_variation_id:`${data.productId}-${index}`,sale_price:data.selectedPriceVnd??499000}))}]));
   return source;
  };
  const initial=make(fixture.initial),sources=fixture.candidates.map(make) as ReturnType<typeof fixtureProduct>[];
  const candidates=sources.filter(s=>s.snapshot.offers.SET_QUAN);expect(candidates).toHaveLength(2);
  const byId=new Map([initial,...sources].map(s=>[s.product.productId,s]));let readRound=false;
  const readProduct=vi.fn(async(id:string)=>{
   const s=structuredClone(byId.get(id)!);
   if(readRound&&id===candidates[0]!.product.productId){
    if(mode==="source-failure")throw Error("SOURCE_UNAVAILABLE");
    if(mode==="partial")s.snapshot=null as never;
   }
   return s;
  });
  let authority:HandoffAuthority={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:"APP",now:commerceNow}),revision:scope.revision}};
  const original=(await fixturePolicy()).bundle!;
  const policy={...original,artifacts:{...original.artifacts,handoffMatrix:{schemaVersion:1 as const,kind:"HANDOFF_MATRIX" as const,sourceMetadata:original.artifacts.shopPolicy.sourceMetadata,
   rules:(["DEPENDENCY_FAILURE","RESPONSE_UNAVAILABLE"] as const).map(reason=>({reason,customerMessagePolicy:"SILENT_HANDOFF" as const,holdingReply:null,tag:"NHAN_VIEN" as const}))}}};
  const tools=await createCommerceTools({quoteTask:config,read:{scope,clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[initial.product],
   catalog:{readProduct,searchText:async()=>({status:"AMBIGUOUS",reasonCode:"TOP_GAP_TOO_SMALL",candidates:sources.map(s=>({document:s.product,score:0.8}))})}},
   handoff:{read:async()=>structuredClone(authority),commit:async change=>{authority=structuredClone(change.next);return true;},policy:async()=>policy}});
  const metrics:Record<string,unknown>={fixtureBytes:bytes(fixture),requestedCandidates:2,rawResults:[],chargedResults:[],wire:[],runtimeProducts:[]};
  const batch=tools.invokeBatch.bind(tools);
  tools.invokeBatch=async(calls:CommerceToolCall[])=>{
   if(calls.some(c=>c.name==="read_product"))readRound=true;
   const results=await batch(calls);
   (metrics.rawResults as number[]).push(bytes(results));(metrics.chargedResults as number[]).push(bytes(resultBudgetView(calls,results,tools.snapshot())));
   (metrics.runtimeProducts as number[]).push(tools.snapshot().runtimeProducts?.length??0);
   return results;
  };
  const wires:Record<string,any>[]=[],requests:OwnerRequest[]=[];let n=0;
  const owner=createGeminiCommerceInference({model:"gemini-3.5-flash-lite",effort:"high",projectId:"test-project",location:"global",declarations:[...readOnlyDeclarations,...handoffDeclarations]},
   {getToken:async()=>"mock-token",fetchImpl:async(_url:string,init:RequestInit)=>{
    const wire=JSON.parse(init.body as string);wires.push(wire);(metrics.wire as number[]).push(bytes(wire));n++;
    const calls=n===1?[{name:"search_products",args:{query:"bộ quần áo đi làm"}}]:candidates.map(s=>({name:"read_product",args:{subjectRef:s.product.productId,selection:"SINGLE",offerType:"SET_QUAN"}}));
    const parts=n===3?[{text:"Em chọn mẫu quần 799.000đ cho chị nhé. Chị cho em chiều cao, cân nặng để chọn size."}]:calls.map(functionCall=>({functionCall}));
    return new Response(JSON.stringify({modelVersion:"gemini-3.5-flash-lite",candidates:[{finishReason:"STOP",content:{role:"model",parts}}]}));
   }});
  const verifier=vi.fn(async()=>({result:{verdict:"PASS",violations:[]}}));
  const result=await runCommerceTurn({scope,tools,clock:()=>commerceNow,latest:"Chị tìm bộ quần áo đi làm dưới một triệu.",history:[],ownerPrompt,verifierPrompt:"Kiểm tra.",verifier,
   owner:request=>{requests.push(request);return owner({...request,ownerContextPresentation:"VI_DATA_BLOCKS_COMPACT_V2"});}});
  expect(result.normalToolCalls).toBeLessThanOrEqual(6);expect(result.toolRounds).toBe(2);
  expect(Math.max(...metrics.runtimeProducts as number[])).toBeLessThanOrEqual(4);
  expect(Math.max(...metrics.chargedResults as number[])).toBeLessThanOrEqual(8192);
  expect(Math.max(...metrics.wire as number[])).toBeLessThanOrEqual(65536);
  if(mode==="source-failure"){
   expect(result.terminal).toMatchObject({disposition:"HANDOFF",text:null});expect(n).toBe(2);expect(verifier).not.toHaveBeenCalled();
  }else{
   expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");expect(n).toBe(3);expect(verifier).toHaveBeenCalledOnce();
   expect(requests[2]!.toolBudget.roundsRemaining).toBe(0);expect(requests[2]!.toolsAllowed).toBe(false);
   const callable=wires[2]!.tools.flatMap((t:Record<string,any>)=>t.functionDeclarations.map((d:Record<string,any>)=>d.name));expect(callable).toEqual(["request_handoff"]);
   const raw=JSON.stringify(wires[2]);expect(raw).toContain("799000");if(mode==="complete")expect(raw).toContain("1279000");
   expect(raw).not.toContain("captureSha256");
   const results=requests[2]!.contents.at(-1)!.parts.map(p=>(p as {functionResponse?:{response:CommerceToolResult}}).functionResponse?.response).filter(Boolean) as CommerceToolResult[];
   expect(results).toHaveLength(2);expect(results.every(r=>r.status==="OK")).toBe(true);
   if(mode==="partial")expect(results[0]).toMatchObject({data:{availability:{price:{status:"UNAVAILABLE"}}}});
   metrics.terminalHistoryBytes=bytes(wires[2]!.contents);metrics.nativeFunctionResponsesBytes=bytes(wires[2]!.contents[0]);
  }
  console.log("DISCOVERY_FEASIBILITY "+mode+" "+JSON.stringify(metrics));
 });
});
