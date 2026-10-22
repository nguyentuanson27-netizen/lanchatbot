import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { createCustomerStateTools } from "./single-agent-commerce-state.js";
import { createCommerceEffectTools } from "./single-agent-commerce-effects.js";
import { createCommerceHandoffTools } from "./single-agent-commerce-handoff.js";
import { createCommerceMediaTools } from "./single-agent-commerce-media.js";
import type { CommerceTools } from "./single-agent-commerce-read-only.js";

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
  return { ...composed, prepare: () => readTools.prepare(), availableTools, invoke: call => availableTools.includes(call.name) ? composed.invoke(call)
    : Promise.resolve({ status: "REJECTED", reason: "CAPABILITY_UNAVAILABLE" }),
    async invokeBatch(calls) {
      const allowed = calls.filter(c => availableTools.includes(c.name)), results = await composed.invokeBatch(allowed);
      return calls.map(c => availableTools.includes(c.name) ? results[allowed.indexOf(c)]!
        : { status: "REJECTED", reason: "CAPABILITY_UNAVAILABLE" });
    } };
}
