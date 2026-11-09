import {withOpeningProductMedia,type OpeningProductMediaRule} from "./single-agent-commerce-opening-media.js";
import {createMediaCapabilityCache} from "./single-agent-commerce-media-capabilities.js";
import {withExplicitQuoteTask,validateQuoteTask,type ExplicitQuoteTask} from "./single-agent-commerce-quote.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { createCustomerStateTools } from "./single-agent-commerce-state.js";
import { createCommerceEffectTools } from "./single-agent-commerce-effects.js";
import { createCommerceHandoffTools } from "./single-agent-commerce-handoff.js";
import { createCommerceMediaTools } from "./single-agent-commerce-media.js";
import type { CommerceTools } from "./single-agent-commerce-read-only.js";
import type { HandoffReasonV2 } from "@lana/contracts";
import {toolArgs,type CommerceToolCall,type CommerceToolResult} from "./single-agent-commerce-read-only-tools.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { canonicalJsonV1, type CommerceHandoffSourceCheckV1 } from "@lana/contracts";
import {commerceDiagnostics,commerceReadCoverage,type CommerceDiagnosticObserver} from "./single-agent-commerce-diagnostics.js";

/** Required shop reads only. Never parse prose or turn absent optional fields into blockers. */
function requiredReadHandoffReason(call: CommerceToolCall, result: CommerceToolResult): HandoffReasonV2 | null {
  if (["add_to_cart","change_cart_item"].includes(call.name)&&result.status==="UNAVAILABLE"&&
    (result.data as {shopDataGap?:string}|undefined)?.shopDataGap==="SHOP_COLOR_UNRECORDED") return "DEPENDENCY_FAILURE";
  if (call.name==="recommend_size"&&result.status==="UNAVAILABLE"&&result.reason==="SIZE_SOURCE_UNAVAILABLE") return "SIZE_RULE_UNAVAILABLE";
  // A media lookup is not proof that the customer needs this image. Return its
  // scoped failure to the owner; required opening images still have a code gate.
  // The owner must hand off when the missing image is needed for the request.
  if (["select_product_media","view_product_media"].includes(call.name))return null;
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
  observeDiagnostics?:CommerceDiagnosticObserver;
  quoteTask?: ExplicitQuoteTask;
  openingMediaRule?:OpeningProductMediaRule;
  openingCheckoutMedia?:true;
  /** Private checkout only: caller validates planned cart tuples against current source. */
  unlabelledCartProducts?:NonNullable<CommerceTools['unlabelledCartProducts']>;
  read: Parameters<typeof createReadOnlyTools>[0];
  state?: Omit<Parameters<typeof createCustomerStateTools>[0], "base" | "scope" | "clock">;
  effects?: Omit<Parameters<typeof createCommerceEffectTools>[0], "base" | "scope" | "clock"> &
    Required<Pick<Parameters<typeof createCommerceEffectTools>[0], "executeCommand" | "readAuthority" | "readReceipt">>;
  handoff?: Omit<Parameters<typeof createCommerceHandoffTools>[0], "base" | "scope" | "clock">;
  media?: {allowedHostSuffixes:readonly string[]};
}): Promise<CommerceTools> {
  if (input.effects && !input.state) throw new Error("EFFECTS_REQUIRE_CUSTOMER_STATE");
  const { scope, clock } = input.read;
  const diagnostics=commerceDiagnostics(input.observeDiagnostics),coverage=commerceReadCoverage();
  const evidence=new Map<string,CommerceHandoffSourceCheckV1>();
  let evidenceComplete=true;
  const observed=async<T>(kind:CommerceHandoffSourceCheckV1["kind"],query:unknown,work:()=>Promise<T>)=>{
    const queryJson=canonicalJsonV1(query),key=`${kind}:${queryJson}`;
    const stage=kind==="PRODUCT"?"CATALOG_READ":"RESULT_PROJECTION";
    const result=await diagnostics.run(stage,{kind,query},work);
    if(Buffer.byteLength(queryJson)>4096||(!evidence.has(key)&&evidence.size>=16)){evidenceComplete=false;return result;}
    evidence.set(key,{kind,queryJson,sourceHash:commerceHash(result)});return result;
  };
  const handoffSources=()=>evidenceComplete?structuredClone([...evidence.values()]):null;
  const originalCatalog=input.read.catalog;
  const hints=input.media?createMediaCapabilityCache(clock,input.media.allowedHostSuffixes,scope.bindingVersion):null;
  const catalog={searchText:(query:string)=>originalCatalog.searchText(query),
    ...(originalCatalog.resolveProductCode?{resolveProductCode:(code:string)=>originalCatalog.resolveProductCode!(code)}:{}),
    readProduct:(id:string,readPos=true)=>observed("PRODUCT",{productId:id,readPos},async()=>{
      try{const source=await originalCatalog.readProduct(id,readPos,diagnostics);try{hints?.observe(id,source.product);}catch{}return source;}
      catch(error){hints?.clear(id,"SOURCE_ERROR");throw error;}
    })};
  const readTools = createReadOnlyTools({...input.read,catalog,diagnostics,prepareCurrentOffers:true,candidateEvidence:true,...(hints?{onMediaColor:(id:string,color:string)=>hints.addColor(id,color)}:{})});
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
    tools = await createCommerceEffectTools({ ...effects,selectionMaxAgeSeconds:input.read.maxFactAgeSeconds??1200,
      repository:{read:key=>observed("SALES_STATE",{},()=>effects.repository.read(key)),
        compareAndSwap:update=>effects.repository.compareAndSwap(update)},
      select:q=>observed("CART_SELECTION",q,()=>effects.select(q)),
      readReceipt:id=>observed("RECEIPT",{operationId:id},()=>effects.readReceipt(id)),base: tools, scope, clock });
    availableTools.push("add_to_cart", "change_cart_item", "confirm_purchase");
    if(input.effects.negotiationSources?.length)availableTools.push("record_negotiation");
  }
  // State/effect adapters expose their own explicit surface. Attach these
  // code-only proofs after composition so they cannot be lost between layers.
  tools={...tools,handoffSources,boundedPrice:readTools.boundedPrice,quotePriceEvidence:readTools.quotePriceEvidence};
  if (input.handoff) {
    tools = createCommerceHandoffTools({ ...input.handoff, base: tools, scope, clock });
    availableTools.push("request_handoff");
  }
  if(input.media){
    tools=createCommerceMediaTools({...input.media,base:tools,catalog,clock,diagnostics});
    availableTools.push("select_product_media","view_product_media");
  }
  if(input.unlabelledCartProducts)tools={...tools,unlabelledCartProducts:input.unlabelledCartProducts};
  const composed = tools;
  let primitiveDispatches=0;
  const countDispatch=(calls:CommerceToolCall[])=>{primitiveDispatches+=calls.filter(c=>c.name!=="request_handoff").length;};
  let missingInformationAttempted=false, missingInformationUnproved=false;
  let mediaLookupFailed=false;
  // The owner decides relevance by requesting handoff. Only then apply the
  // existing silent missing-source recovery, including legacy holding policies.
  const silentMediaHandoff=(call:CommerceToolCall)=>mediaLookupFailed&&call.name==="request_handoff"&&
    toolArgs(call.args,["reason"])?.reason==="DEPENDENCY_FAILURE"&&!!composed.requestSilentHandoff;
  async function handoffRequiredRead(calls: CommerceToolCall[], results: CommerceToolResult[]) {
    if (!input.handoff || missingInformationAttempted) return;
    const reason=calls.map((call,i)=>results[i]?requiredReadHandoffReason(call,results[i]!):null).find(Boolean);
    if (!reason || await composed.terminalOutcome?.()) return;
    missingInformationAttempted=true;
    try {
      const outcome=await composed.requestSilentHandoff?.(reason)??{status:"UNAVAILABLE",reason:"CAPABILITY_UNAVAILABLE"};
      missingInformationUnproved=outcome.status!=="OK";
      diagnostics.emit("FINAL_GATE",outcome.status==="OK"?"HANDOFF":"NO_SEND",{tool:"request_handoff"},reason);
    } catch { missingInformationUnproved=true; }
  }
  const starts=new WeakMap<CommerceToolCall,number|null>();
  const start=(call:CommerceToolCall)=>starts.set(call,diagnostics.emit("ARGUMENT_VALIDATION","STARTED",{tool:call.name,args:call.args}));
  const observedResult=(call:CommerceToolCall,result:CommerceToolResult)=>{
    if(["select_product_media","view_product_media"].includes(call.name)&&result.status==="UNAVAILABLE")mediaLookupFailed=true;
    coverage.observe(call,result);
    const selector={tool:call.name,args:call.args},parent=starts.get(call)??null;
    diagnostics.emit("ARGUMENT_VALIDATION",["TOOL_ARGUMENTS_OR_REF","CAPABILITY_UNAVAILABLE","MEDIA_ARGUMENTS_OR_REF","TOOL_ARGUMENTS","STATE_ARGUMENTS","STATE_OR_REF"].includes(result.reason??"")?"REJECTED":result.status==="REJECTED"?"UNKNOWN":"OK",selector,result.reason??null,null,parent);
    diagnostics.emit("RESULT_PROJECTION",result.status,selector,result.reason??null,Buffer.byteLength(JSON.stringify(result)),parent);
    return result;
  };
  const guarded:CommerceTools = { ...composed,readCoverage:coverage.snapshot,
    ...(composed.recoverFallback?{async recoverFallback(outcome:import("./single-agent-semantic-verifier-boundary.js").TerminalOutcome){
      try{const result=await composed.recoverFallback!(outcome);if(result.disposition!=="HANDOFF")missingInformationUnproved=true;return result;}
      catch(error){missingInformationUnproved=true;throw error;}
    }}:{}),diagnostic:(stage,status,reason=null,resultBytes=null)=>diagnostics.emit(stage,status,{requestId:scope.requestId},reason,resultBytes),
    ...(input.quoteTask?{primitiveToolInvocations:()=>primitiveDispatches}:{}),
    ...(hints?{mediaCapabilities:()=>hints.get(composed.snapshot()),mediaCapabilityDiagnostics:()=>hints.takeDiagnostics()}:{}),
    async prepare(admit,control){
      const previous=composed.snapshot(),before=new Set(previous.protectedClaims.map(c=>commerceHash(c))),beforeMetadata=new Set(previous.policyLiterals.map(p=>commerceHash(p)));
      const charged=await readTools.prepare((_context,work)=>{const context=composed.snapshot();return context.boundSubjects.length<=8&&context.protectedClaims.length<=32&&(context.runtimeProducts?.length??0)<=4&&(!admit||admit(context,work));},control);
      const after=composed.snapshot();
      coverage.observePrepared({protectedClaims:after.protectedClaims.filter(c=>!before.has(commerceHash(c))),metadata:after.policyLiterals.filter(p=>p.ref.startsWith("offers:")&&!beforeMetadata.has(commerceHash(p)))});
      return charged;
    },availableTools,
    async invoke(call){
      start(call);
      if(missingInformationUnproved)return observedResult(call,{status:"REJECTED",reason:"SHOP_INFORMATION_HANDOFF_UNPROVED"});
      if(!availableTools.includes(call.name))return observedResult(call,{status:"REJECTED",reason:"CAPABILITY_UNAVAILABLE"});
      countDispatch([call]);
      try{const result=observedResult(call,silentMediaHandoff(call)?await composed.requestSilentHandoff!("DEPENDENCY_FAILURE"):await composed.invoke(call));await handoffRequiredRead([call],[result]);return result;}
      catch(error){coverage.observe(call,{status:"UNAVAILABLE",reason:"UNKNOWN_INTERNAL"});diagnostics.emit("ARGUMENT_VALIDATION","UNKNOWN",{tool:call.name,args:call.args},"UNKNOWN_INTERNAL",null,starts.get(call)??null);diagnostics.emit("RESULT_PROJECTION","ERROR",{tool:call.name,args:call.args},"UNKNOWN_INTERNAL");throw error;}
    },
    ...(input.handoff?{async terminalOutcome(){return await composed.terminalOutcome?.()??(missingInformationUnproved?{disposition:"NO_SEND" as const,reason:"SHOP_INFORMATION_HANDOFF_UNPROVED",text:null,fallbackId:null}:null);}}:{}),
    async invokeBatch(calls){
      calls.forEach(start);
      if(missingInformationUnproved)return calls.map(c=>observedResult(c,{status:"REJECTED",reason:"SHOP_INFORMATION_HANDOFF_UNPROVED"}));
      const allowed=calls.filter(c=>availableTools.includes(c.name));countDispatch(allowed);
      let results:CommerceToolResult[];
      try{results=allowed.length===1&&silentMediaHandoff(allowed[0]!)?[await composed.requestSilentHandoff!("DEPENDENCY_FAILURE")]:await composed.invokeBatch(allowed);}catch(error){for(const call of allowed){coverage.observe(call,{status:"UNAVAILABLE",reason:"UNKNOWN_INTERNAL"});diagnostics.emit("ARGUMENT_VALIDATION","UNKNOWN",{tool:call.name},"UNKNOWN_INTERNAL",null,starts.get(call)??null);diagnostics.emit("RESULT_PROJECTION","ERROR",{tool:call.name},"UNKNOWN_INTERNAL");}throw error;}
      const projected=calls.map(c=>observedResult(c,availableTools.includes(c.name)?results[allowed.indexOf(c)]!:{status:"REJECTED",reason:"CAPABILITY_UNAVAILABLE"}));
      await handoffRequiredRead(allowed,results);return projected;
    }
  };
  let final:CommerceTools=guarded;
  if(input.quoteTask!==undefined){validateQuoteTask(input.quoteTask);final=withExplicitQuoteTask(final,scope,input.read.entry?.firstContact??null,
    async()=>{const p=await input.read.policy();if(!p.bundle)throw Error("POLICY_UNAVAILABLE");return p.bundle.policy;},clock);}
  const openingRule=input.openingMediaRule??(input.quoteTask?{version:"FIRST_CONTACT_UNIQUE_OR_CART_IMAGE_V2" as const}:null);
  return openingRule?withOpeningProductMedia(final,{rule:openingRule,scope,clock,firstContact:input.read.entry?.firstContact??null,codeOutputSupported:input.openingCheckoutMedia===true}):final;
}
