import {createMediaCapabilityCache} from "./single-agent-commerce-media-capabilities.js";
import {withExplicitQuoteTask,validateQuoteTask,type ExplicitQuoteTask} from "./single-agent-commerce-quote.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { createCustomerStateTools } from "./single-agent-commerce-state.js";
import { createCommerceEffectTools } from "./single-agent-commerce-effects.js";
import { createCommerceHandoffTools } from "./single-agent-commerce-handoff.js";
import { createCommerceMediaTools } from "./single-agent-commerce-media.js";
import type { CommerceTools } from "./single-agent-commerce-read-only.js";
import type { HandoffReasonV2 } from "@lana/contracts";
import type { CommerceToolCall, CommerceToolResult } from "./single-agent-commerce-read-only-tools.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { canonicalJsonV1, type CommerceHandoffSourceCheckV1 } from "@lana/contracts";

/** Required shop reads only. Never parse prose or turn absent optional fields into blockers. */
function requiredReadHandoffReason(call: CommerceToolCall, result: CommerceToolResult): HandoffReasonV2 | null {
  if (call.name==="recommend_size"&&result.status==="UNAVAILABLE"&&result.reason==="SIZE_SOURCE_UNAVAILABLE") return "SIZE_RULE_UNAVAILABLE";
  if (["select_product_media","view_product_media"].includes(call.name))
    return result.status==="UNAVAILABLE"&&["MEDIA_SOURCE_UNAVAILABLE","MEDIA_COLOR_BINDING_UNVERIFIED","NO_VERIFIED_MATCHING_MEDIA"].includes(result.reason??"")
      ? "DEPENDENCY_FAILURE" : null;
  if (!["read_product", "read_policy", "search_products"].includes(call.name)) return null;
  if (result.status === "UNAVAILABLE" || result.status === "STALE")
    return call.name === "read_policy" ? "POLICY_UNAVAILABLE" : "DEPENDENCY_FAILURE";
  if (call.name !== "read_product" || result.status !== "OK" || !result.data || typeof result.data !== "object") return null;
  const data = result.data as { content?: unknown; attributes?: unknown };
  if (call.args && typeof call.args === "object" && "detailsOnly" in call.args && call.args.detailsOnly === true)
    return data.content == null && data.attributes == null ? "DEPENDENCY_FAILURE" : null;
  // A successful read includes companion price/stock/ETA and possibly multiple
  // offers. Their presence does not bind them to the customer's current need.
  // Preserve the partial result; the owner requests handoff for a relevant gap.
  return null;
}

/** Candidate composition only. The caller supplies existing scoped ports; no live entrypoint or writer is created here. */
export async function createCommerceTools(input: {
  quoteTask?: ExplicitQuoteTask;
  read: Parameters<typeof createReadOnlyTools>[0];
  state?: Omit<Parameters<typeof createCustomerStateTools>[0], "base" | "scope" | "clock">;
  effects?: Omit<Parameters<typeof createCommerceEffectTools>[0], "base" | "scope" | "clock"> &
    Required<Pick<Parameters<typeof createCommerceEffectTools>[0], "executeCommand" | "readAuthority" | "readReceipt">>;
  handoff?: Omit<Parameters<typeof createCommerceHandoffTools>[0], "base" | "scope" | "clock">;
  media?: {allowedHostSuffixes:readonly string[]};
}): Promise<CommerceTools> {
  if (input.effects && !input.state) throw new Error("EFFECTS_REQUIRE_CUSTOMER_STATE");
  const { scope, clock } = input.read;
  const evidence=new Map<string,CommerceHandoffSourceCheckV1>();
  let evidenceComplete=true;
  const observed=async<T>(kind:CommerceHandoffSourceCheckV1["kind"],query:unknown,work:()=>Promise<T>)=>{
    const queryJson=canonicalJsonV1(query),key=`${kind}:${queryJson}`;
    const result=await work();
    if(Buffer.byteLength(queryJson)>4096||(!evidence.has(key)&&evidence.size>=16)){evidenceComplete=false;return result;}
    evidence.set(key,{kind,queryJson,sourceHash:commerceHash(result)});return result;
  };
  const handoffSources=()=>evidenceComplete?structuredClone([...evidence.values()]):null;
  const originalCatalog=input.read.catalog;
  const hints=input.media?createMediaCapabilityCache(clock,input.media.allowedHostSuffixes,scope.bindingVersion):null;
  const catalog={searchText:(query:string)=>originalCatalog.searchText(query),
    ...(originalCatalog.resolveProductCode?{resolveProductCode:(code:string)=>originalCatalog.resolveProductCode!(code)}:{}),
    readProduct:(id:string,readPos=true)=>observed("PRODUCT",{productId:id,readPos},async()=>{
      try{const source=await originalCatalog.readProduct(id,readPos);try{hints?.observe(id,source.product);}catch{}return source;}
      catch(error){hints?.clear(id,"SOURCE_ERROR");throw error;}
    })};
  const readTools = createReadOnlyTools({...input.read,catalog,...(hints?{onMediaColor:(id:string,color:string)=>hints.addColor(id,color)}:{})});
  let tools: CommerceTools = readTools;
  tools={...tools,handoffSources};
  const availableTools = ["search_products", "read_product", "read_policy"];
  if (input.state) {
    const state=input.state;
    tools = await createCustomerStateTools({ ...state,store:{
      read:()=>observed("PROFILE",{},()=>state.store.read()),compareAndSwap:(revision,next)=>state.store.compareAndSwap(revision,next)},
      sizeInput:ref=>observed("SIZE_SOURCE",{subjectRef:ref},()=>state.sizeInput(ref)),base: tools, scope, clock });
    availableTools.push("apply_customer_state", "recommend_size");
    if (input.state.quoteInput) availableTools.push("quote_cart");
  }
  if (input.effects) {
    const effects=input.effects;
    tools = await createCommerceEffectTools({ ...effects,
      repository:{read:key=>observed("SALES_STATE",{},()=>effects.repository.read(key)),
        compareAndSwap:update=>effects.repository.compareAndSwap(update)},
      select:q=>observed("CART_SELECTION",q,()=>effects.select(q)),
      readReceipt:id=>observed("RECEIPT",{operationId:id},()=>effects.readReceipt(id)),base: tools, scope, clock });
    availableTools.push("add_to_cart", "change_cart_item", "confirm_purchase");
    if(input.effects.negotiationSources?.length)availableTools.push("record_negotiation");
  }
  // State/effect adapters expose their own explicit surface. Attach these
  // code-only proofs after composition so they cannot be lost between layers.
  tools={...tools,handoffSources,boundedPrice:readTools.boundedPrice};
  if (input.handoff) {
    tools = createCommerceHandoffTools({ ...input.handoff, base: tools, scope, clock });
    availableTools.push("request_handoff");
  }
  if(input.media){
    tools=createCommerceMediaTools({...input.media,base:tools,catalog,clock});
    availableTools.push("select_product_media","view_product_media");
  }
  const composed = tools;
  let primitiveDispatches=0;
  const countDispatch=(calls:CommerceToolCall[])=>{primitiveDispatches+=calls.filter(c=>c.name!=="request_handoff").length;};
  let missingInformationAttempted=false, missingInformationUnproved=false;
  async function handoffRequiredRead(calls: CommerceToolCall[], results: CommerceToolResult[]) {
    if (!input.handoff || missingInformationAttempted) return;
    const reason=calls.map((call,i)=>results[i]?requiredReadHandoffReason(call,results[i]!):null).find(Boolean);
    if (!reason || await composed.terminalOutcome?.()) return;
    missingInformationAttempted=true;
    try {
      const outcome=await composed.invoke({name:"request_handoff",args:{reason}});
      missingInformationUnproved=outcome.status!=="OK";
    } catch { missingInformationUnproved=true; }
  }
  const guarded:CommerceTools = { ...composed, ...(input.quoteTask?{primitiveToolInvocations:()=>primitiveDispatches}:{}), ...(hints?{mediaCapabilities:()=>hints.get(composed.snapshot()),mediaCapabilityDiagnostics:()=>hints.takeDiagnostics()}:{}), prepare: () => readTools.prepare(), availableTools, invoke: call => missingInformationUnproved
    ? Promise.resolve({status:"REJECTED",reason:"SHOP_INFORMATION_HANDOFF_UNPROVED"}) : availableTools.includes(call.name) ? (countDispatch([call]),composed.invoke(call))
    .then(async result=>{await handoffRequiredRead([call],[result]);return result;})
    : Promise.resolve({ status: "REJECTED", reason: "CAPABILITY_UNAVAILABLE" }),
    ...(input.handoff?{async terminalOutcome(){
      return await composed.terminalOutcome?.() ?? (missingInformationUnproved
        ? {disposition:"NO_SEND" as const,reason:"SHOP_INFORMATION_HANDOFF_UNPROVED",text:null,fallbackId:null} : null);
    }}:{}),
    async invokeBatch(calls) {
      if(missingInformationUnproved)return calls.map(()=>({status:"REJECTED",reason:"SHOP_INFORMATION_HANDOFF_UNPROVED"}));
      const allowed = calls.filter(c => availableTools.includes(c.name));countDispatch(allowed);
      const results = await composed.invokeBatch(allowed);
      await handoffRequiredRead(allowed,results);
      return calls.map(c => availableTools.includes(c.name) ? results[allowed.indexOf(c)]!
        : { status: "REJECTED", reason: "CAPABILITY_UNAVAILABLE" });
    } };
  if(input.quoteTask!==undefined){validateQuoteTask(input.quoteTask);return withExplicitQuoteTask(guarded,scope,input.read.entry?.firstContact??null);}
  return guarded;
}
