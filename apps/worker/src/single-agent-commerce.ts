import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { createCustomerStateTools } from "./single-agent-commerce-state.js";
import { createCommerceEffectTools } from "./single-agent-commerce-effects.js";
import { createCommerceHandoffTools } from "./single-agent-commerce-handoff.js";
import { createCommerceMediaTools } from "./single-agent-commerce-media.js";
import type { CommerceTools } from "./single-agent-commerce-read-only.js";
import type { HandoffReasonV2 } from "@lana/contracts";
import type { CommerceToolCall, CommerceToolResult } from "./single-agent-commerce-read-only-tools.js";

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
  const data = result.data as { content?: unknown; attributes?: unknown; availability?: Record<string,{status:string;reason?:string}>;
    facts?: {type:string;value:{status?:string}}[]; sellingOptions?: {availability?: Record<string,{status:string;reason?:string}>;facts?:{type:string;value:{status?:string}}[]}[] };
  if (call.args && typeof call.args === "object" && "detailsOnly" in call.args && call.args.detailsOnly === true)
    return data.content == null && data.attributes == null ? "DEPENDENCY_FAILURE" : null;
  for (const option of data.sellingOptions?.length ? data.sellingOptions : [data]) {
    for (const [field,reason] of [["price","PRICE_UNAVAILABLE"],["stock","STOCK_UNAVAILABLE"],["eta","ETA_UNAVAILABLE"]] as const) {
      const value=option.availability?.[field];
      if (value?.reason === "VARIANT_NOT_FOUND") return "STOCK_UNAVAILABLE";
      // A known unsupported size/offer or a missing customer region is not a missing shop fact.
      if (value && value.status !== "OK" && !["SIZE_UNSUPPORTED","OFFER_NOT_FOUND","DELIVERY_REGION_REQUIRED"].includes(value.reason??"")) return reason;
    }
    if (option.facts?.some(f=>f.type==="STOCK"&&f.value.status==="UNKNOWN")) return "STOCK_UNAVAILABLE";
  }
  return null;
}

/** Candidate composition only. The caller supplies existing scoped ports; no live entrypoint or writer is created here. */
export async function createCommerceTools(input: {
  read: Parameters<typeof createReadOnlyTools>[0];
  state?: Omit<Parameters<typeof createCustomerStateTools>[0], "base" | "scope" | "clock">;
  effects?: Omit<Parameters<typeof createCommerceEffectTools>[0], "base" | "scope" | "clock"> &
    Required<Pick<Parameters<typeof createCommerceEffectTools>[0], "executeCommand" | "readAuthority" | "readReceipt">>;
  handoff?: Omit<Parameters<typeof createCommerceHandoffTools>[0], "base" | "scope" | "clock">;
  media?: {allowedHostSuffixes:readonly string[]};
}): Promise<CommerceTools> {
  if (input.effects && !input.state) throw new Error("EFFECTS_REQUIRE_CUSTOMER_STATE");
  const { scope, clock } = input.read;
  const readTools = createReadOnlyTools(input.read);
  let tools: CommerceTools = readTools;
  const availableTools = ["search_products", "read_product", "read_policy"];
  if (input.state) {
    tools = await createCustomerStateTools({ ...input.state, base: tools, scope, clock });
    availableTools.push("apply_customer_state", "recommend_size");
    if (input.state.quoteInput) availableTools.push("quote_cart");
  }
  if (input.effects) {
    tools = await createCommerceEffectTools({ ...input.effects, base: tools, scope, clock });
    availableTools.push("add_to_cart", "change_cart_item", "confirm_purchase");
    if(input.effects.negotiationSources?.length)availableTools.push("record_negotiation");
  }
  if (input.handoff) {
    tools = createCommerceHandoffTools({ ...input.handoff, base: tools, scope, clock });
    availableTools.push("request_handoff");
  }
  if(input.media){
    tools=createCommerceMediaTools({...input.media,base:tools,catalog:input.read.catalog,clock});
    availableTools.push("select_product_media","view_product_media");
  }
  const composed = tools;
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
  return { ...composed, prepare: () => readTools.prepare(), availableTools, invoke: call => missingInformationUnproved
    ? Promise.resolve({status:"REJECTED",reason:"SHOP_INFORMATION_HANDOFF_UNPROVED"}) : availableTools.includes(call.name) ? composed.invoke(call)
    .then(async result=>{await handoffRequiredRead([call],[result]);return result;})
    : Promise.resolve({ status: "REJECTED", reason: "CAPABILITY_UNAVAILABLE" }),
    ...(input.handoff?{async terminalOutcome(){
      return await composed.terminalOutcome?.() ?? (missingInformationUnproved
        ? {disposition:"NO_SEND" as const,reason:"SHOP_INFORMATION_HANDOFF_UNPROVED",text:null,fallbackId:null} : null);
    }}:{}),
    async invokeBatch(calls) {
      if(missingInformationUnproved)return calls.map(()=>({status:"REJECTED",reason:"SHOP_INFORMATION_HANDOFF_UNPROVED"}));
      const allowed = calls.filter(c => availableTools.includes(c.name)), results = await composed.invokeBatch(allowed);
      await handoffRequiredRead(allowed,results);
      return calls.map(c => availableTools.includes(c.name) ? results[allowed.indexOf(c)]!
        : { status: "REJECTED", reason: "CAPABILITY_UNAVAILABLE" });
    } };
}
