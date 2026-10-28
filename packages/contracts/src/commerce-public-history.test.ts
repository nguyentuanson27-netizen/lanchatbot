import {it,expect} from "vitest";
import {CommercePublicCartEventV1Schema,CommercePublicCartSummaryV1Schema} from "./commerce-public-history.js";
const event={type:"ACCEPTED_PUBLIC_CART_SUMMARY",eventId:"a".repeat(64),messageHash:"b".repeat(64),acceptedAt:"2026-10-25T01:00:00Z",
  cartId:"50000000-0000-4000-8000-000000000001",cartVersion:2,discountTotalVnd:30000,grandTotalVnd:499000};
it.each(["text","title","recipient","phone","address","effect","stateRevision"])("rejects an extra %s field in public history",field=>{
  expect(CommercePublicCartEventV1Schema.safeParse({...event,[field]:"PRIVATE"}).success).toBe(false);
});
it("validates numeric/history identities without accepting arbitrary cart text or unlimited money",()=>{
  expect(CommercePublicCartEventV1Schema.safeParse(event).success).toBe(true);
  for(const patch of [{cartId:"customer address"},{grandTotalVnd:Infinity},{discountTotalVnd:-1},{cartVersion:2.5}])
    expect(CommercePublicCartEventV1Schema.safeParse({...event,...patch}).success).toBe(false);
  expect(CommercePublicCartSummaryV1Schema.safeParse(event).success).toBe(false);
});
