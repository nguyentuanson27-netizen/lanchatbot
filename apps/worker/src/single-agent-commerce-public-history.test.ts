import {it,expect} from "vitest";
import {projectCommerceHistoryMetadata,publicCheckoutState} from "./single-agent-commerce-public-history.js";
import {commerceHistory} from "./single-agent-commerce-ingress.js";
const event={type:"ACCEPTED_PUBLIC_CART_SUMMARY" as const,eventId:"a".repeat(64),messageHash:"b".repeat(64),acceptedAt:"2026-10-25T01:00:00Z",
  cartId:"50000000-0000-4000-8000-000000000001",cartVersion:2,discountTotalVnd:30000,grandTotalVnd:499000};
it("preserves persisted COD and clarification meaning without private values or a delivery claim",()=>{
 const state={checkoutDraft:{paymentMethod:"COD",fullName:"PRIVATE_NAME",phone:"0900000000",address:"PRIVATE_ADDRESS"},
  clarification:{reasonCode:"CHECKOUT_DETAILS_MISSING",missingFields:["FULL_NAME"],attemptCount:1,askedQuestionFingerprints:["a".repeat(64)]}};
 const publicState=publicCheckoutState(state);
 expect(publicState).toMatchObject({paymentMethod:"COD",lastQuestion:{missingFields:["FULL_NAME"],delivery:"UNKNOWN"}});
 const serialized=JSON.stringify(publicState);expect(serialized).not.toContain("PRIVATE");expect(serialized).not.toContain("0900000000");
 expect(publicCheckoutState({})).toBeNull();
});
it("keeps numeric accepted history separate from chat, deduplicates and honors correction bytes",()=>{
  const projected=projectCommerceHistoryMetadata([{role:"customer",text:"Giữ size L nhé."}],[event,event]);
  expect(projected.metadata.publicCartEvents).toEqual([event]);expect(projected.dropped.duplicate).toBe(1);
  expect(projectCommerceHistoryMetadata([{role:"customer",text:"x".repeat(4096)}],[event]).metadata.publicCartEvents).toEqual([]);
  expect(projectCommerceHistoryMetadata([], [{...event,secret:"PHONE"}]).metadata.publicCartEvents).toEqual([]);
});
it("keeps current quote independent from historical events and never exceeds the shared metadata budget",()=>{
  const events=[0,1,2].map(i=>({...event,eventId:String(i).repeat(64)}));
  const media=[0,1,2,3,4,5].map(i=>({productId:"P101",assetRef:`asset:${String(i).repeat(64)}`,status:"SENT_ACCEPTED",occurredAt:event.acceptedAt}));
  const p=projectCommerceHistoryMetadata([],events);
  const text=[{senderType:"CUSTOMER" as const,text:"Giữ size L nhé."}];
  const h=commerceHistory(text,media,Buffer.byteLength(JSON.stringify(p.metadata)));
  expect(h.some(m=>m.text==="Giữ size L nhé.")).toBe(true);
  expect(h.reduce((n,m)=>n+Buffer.byteLength(m.text),0)+Buffer.byteLength(JSON.stringify(p.metadata))).toBeLessThanOrEqual(4096);
  expect(Buffer.byteLength(JSON.stringify(p.metadata))).toBeLessThanOrEqual(1024);
  expect(Buffer.byteLength(JSON.stringify(p.metadata.publicCartEvents))).toBeLessThanOrEqual(768);
  expect(p.metadata).not.toHaveProperty("effectReceipts");expect(p.metadata).not.toHaveProperty("cartQuote");
});
