import { describe,it,expect } from "vitest";
import { commerceCallableTools } from "./single-agent-commerce-callable.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import {commerceScope,commerceNow,fixturePolicy,fixtureProduct} from "./single-agent-commerce.test-support.js";
const context=()=>createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,initialProducts:[fixtureProduct().product],policy:fixturePolicy,
  catalog:{readProduct:async()=>fixtureProduct(),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}}).snapshot();
describe("structured callable closure",()=>{
 it("keeps add→confirm/change/negotiation without a cart at generation start",()=>{
   const r={context:context(),availableTools:["add_to_cart","change_cart_item","confirm_purchase","record_negotiation","recommend_size","apply_customer_state"],toolsAllowed:true,toolBudget:{roundsRemaining:1,callsRemaining:3}};
   expect(commerceCallableTools(r)).toEqual(r.availableTools);
   r.toolBudget.callsRemaining=1;expect(commerceCallableTools(r)).toEqual(["add_to_cart","recommend_size","apply_customer_state"]);
 });
 it("removes only tools unreachable without refs or a legal predecessor",()=>{
   const c=context();c.boundSubjects=[];
   const r={context:c,availableTools:["read_product","recommend_size","change_cart_item","confirm_purchase","request_handoff","apply_customer_state"],toolsAllowed:true,toolBudget:{roundsRemaining:2,callsRemaining:6}};
   expect(commerceCallableTools(r)).toEqual(["request_handoff","apply_customer_state"]);
   r.availableTools.push("search_products","add_to_cart");expect(commerceCallableTools(r)).toEqual(r.availableTools);
 });
 it("keeps a separate terminal handoff and does not use customer text/labels",()=>{
   const r={context:context(),availableTools:["read_policy","request_handoff"],toolsAllowed:false,terminalHandoffAllowed:true,toolBudget:{roundsRemaining:0,callsRemaining:0}};
   expect(commerceCallableTools(r)).toEqual(["request_handoff"]);
   r.terminalHandoffAllowed=false;expect(commerceCallableTools(r)).toEqual([]);
 });
});
