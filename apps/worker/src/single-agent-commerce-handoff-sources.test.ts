import {it,expect,vi} from "vitest";
import {createConversationState} from "@lana/conversation-engine";
import {createCommerceHandoffSourceReader} from "./single-agent-commerce-handoff-sources.js";
import {makeCommerceHandoffDeliveryBinding} from "./single-agent-commerce-handoff-delivery.js";
import {selectCommerceHandoff} from "./single-agent-commerce-handoff.js";
import {commerceHash} from "./single-agent-commerce-read-only-context.js";
import {commerceNow,commerceScope,fixturePolicy} from "./single-agent-commerce.test-support.js";

const query={shopAlias:"LANA",productId:"SM613",offerType:"DIRECT",size:"M",color:"navy",quantity:1,lineId:"line-1"};
async function setup(){
 const scope={...commerceScope(),recipient:commerceHash("synthetic-recipient")},policy=(await fixturePolicy()).bundle!,nextState=createConversationState({conversationId:scope.conversationId,routingOwner:"APP",now:commerceNow});
 const binding=makeCommerceHandoffDeliveryBinding({scope,generation:1,responseGroupId:"group",nextState:{...nextState,revision:1},policy,decision:selectCommerceHandoff(policy,scope,"DEPENDENCY_FAILURE",commerceNow),messages:[{kind:"TEXT",text:"Áo 499.000đ chị nhé."}],now:commerceNow});
 const selection=vi.fn(async()=>({status:"READY",sourceVersion:"source-1"})),unused=async()=>{throw Error("UNEXPECTED_PORT");};
 return {binding,selection,read:createCommerceHandoffSourceReader({selection,product:unused,profile:unused,size:unused,receipt:unused,salesState:unused})};
}
it.each([undefined,60,1200,86400])("replays the exact code-owned cart selection freshness bound (%s)",async age=>{
 const s=await setup(),q={...query,...(age===undefined?{}:{selectionMaxAgeSeconds:age})};
 const hash=await s.read({kind:"CART_SELECTION",queryJson:JSON.stringify(q),sourceHash:"0".repeat(64)},s.binding);
 expect(s.selection).toHaveBeenCalledExactlyOnceWith(q,s.binding);expect(hash).toBe(commerceHash({status:"READY",sourceVersion:"source-1"}));
});
it.each([null,59,86401,1.5,"1200",{},true])("rejects malformed or out-of-bound selection freshness before invoking the source (%s)",async age=>{
 const s=await setup();await expect(s.read({kind:"CART_SELECTION",queryJson:JSON.stringify({...query,selectionMaxAgeSeconds:age}),sourceHash:"0".repeat(64)},s.binding)).rejects.toThrow("HANDOFF_SOURCE_QUERY");
 expect(s.selection).not.toHaveBeenCalled();
});
it("still rejects extra cart-selection query keys before invoking the source",async()=>{
 const s=await setup();await expect(s.read({kind:"CART_SELECTION",queryJson:JSON.stringify({...query,selectionMaxAgeSeconds:1200,skipFreshness:true}),sourceHash:"0".repeat(64)},s.binding)).rejects.toThrow("HANDOFF_SOURCE_QUERY");
 expect(s.selection).not.toHaveBeenCalled();
});
