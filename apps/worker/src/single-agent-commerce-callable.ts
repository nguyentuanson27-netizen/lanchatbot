import type { OwnerRequest } from "./single-agent-commerce-read-only.js";

/** Conservative reachability, not intent selection or effect authorization.
 * Keep conditional calls reachable through the existing ordered batch executor.
 * Each tool still validates live refs/authority/source at invocation/commit.
 */
export function commerceCallableTools(request: Pick<OwnerRequest,"availableTools"|"context"|"toolsAllowed"|"terminalHandoffAllowed"|"toolBudget">): readonly string[] | undefined {
  if (!request.availableTools) return undefined; // Legacy adapters own their declared surface.
  const configured = request.availableTools, has=(name:string)=>configured.includes(name);
  if (!request.toolsAllowed) return configured.filter(name=>name==="request_handoff"&&request.terminalHandoffAllowed===true);
  const calls=request.toolBudget.callsRemaining, subjects=request.context.boundSubjects;
  const product=subjects.some(s=>s.kind==="PRODUCT") || has("search_products")&&calls>=2;
  const cart=subjects.some(s=>s.kind==="CART") || Array.isArray(request.context.state.cartItems)&&request.context.state.cartItems.length>0;
  const created=product&&has("add_to_cart")&&calls>=2;
  const line=subjects.some(s=>s.kind==="CART_LINE") || created;
  return configured.filter(name=>{
    if(name==="request_handoff")return true;
    if(calls<1)return false;
    if(name==="quote_product")return calls>=2&&subjects.some(s=>s.kind==="PRODUCT"); // Standalone two-primitive task.
    if(["read_product","recommend_size","add_to_cart","select_product_media","view_product_media"].includes(name))return product;
    if(name==="change_cart_item")return line;
    if(name==="confirm_purchase"||name==="record_negotiation")return cart||created;
    // quote_cart can use the configured quoteInput without a persisted cart.
    // Unknown/extension capabilities are retained, never guessed unreachable.
    return true;
  });
}
