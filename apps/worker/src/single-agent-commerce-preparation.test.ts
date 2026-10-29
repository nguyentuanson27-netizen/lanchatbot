import {it,expect,vi} from "vitest";
import {createReadOnlyTools} from "./single-agent-commerce-read-only-tools.js";
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from "./single-agent-commerce.test-support.js";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn} from "./single-agent-commerce-read-only.js";
const setup=(mode="normal")=>{
 const f=fixtureProduct(),readProduct=vi.fn(async()=>structuredClone(f));
 if(mode==="many"){const template=f.snapshot.offers.DIRECT!;f.snapshot.offers=Object.fromEntries(["AO","CV","SET","QUAN"].map(name=>[name,{...structuredClone(template),rows:template.rows.map(r=>({...r,offer_type:name}))}]));}
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],prepareCurrentOffers:true,
  catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 return {f,readProduct,tools};
};
it("prepares current numeric evidence from exactly the existing singleton source observation, without hydration renewing it",async()=>{
 const s=setup();expect(await s.tools.prepare(()=>true)).toBe(1);expect(s.readProduct).toHaveBeenCalledTimes(1);
 expect(s.tools.snapshot().protectedClaims).toEqual(expect.arrayContaining([expect.objectContaining({type:"PRICE"}),expect.objectContaining({type:"STOCK"})]));
 const before=s.tools.snapshot();await expect(s.tools.readback()).resolves.toEqual(before);
 s.f.snapshot.offers.DIRECT!.rows[0]!.stock_quantity=0;await expect(s.tools.readback()).rejects.toThrow("POS_OBSERVATION_CHANGED");
});
it.each(["many","reject"])("does not partially publish optional numeric preparation when %s admission fails",async mode=>{
 const s=setup(mode);expect(await s.tools.prepare(()=>mode!=="reject")).toBe(1);
 expect(s.tools.snapshot().protectedClaims).toEqual([]);expect(s.tools.snapshot().runtimeProducts?.[0]?.content).toBeDefined();
 expect(s.readProduct).toHaveBeenCalledTimes(1);
});
it("keeps catalog evidence on optional POS acquisition failure, without inserting stale facts",async()=>{
 const s=setup();s.f.snapshot.synced_at="2020-01-01T00:00:00.000Z";
 expect(await s.tools.prepare(()=>true)).toBe(1);expect(s.tools.snapshot().protectedClaims).toEqual([]);
 expect(s.tools.snapshot().runtimeProducts?.[0]?.content).toBeDefined();
});
it("does not admit optional data without a native-wire admission callback",async()=>{
 const s=setup();await s.tools.prepare();expect(s.tools.snapshot().protectedClaims).toEqual([]);expect(s.readProduct).toHaveBeenCalledTimes(1);
});
it("does not prepare two bound products without a current product",async()=>{
 const records=[fixtureProduct("A101"),fixtureProduct("B202")],readProduct=vi.fn();
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:records.map(f=>f.product),prepareCurrentOffers:true,
  catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 expect(await tools.prepare(()=>true)).toBe(0);expect(readProduct).not.toHaveBeenCalled();
});
it.each(["Cảm ơn em nhé.","Áo này phối quần nâu được không?","Giặt máy được không?"])("optional POS failure preserves the independent answer path for %s",async latest=>{
 const f=fixtureProduct(),scope=commerceScope(),readProduct=vi.fn(async(_id:string,readPos=true)=>{if(readPos)throw Error("POS_OFFLINE");return{product:f.product,snapshot:null};});
 const tools=await createCommerceTools({read:{scope,clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}}});
 let remaining=0;const result=await runCommerceTurn({scope,tools,clock:()=>commerceNow,latest,history:[],ownerPrompt:"owner",verifierPrompt:"verifier",admitPreparedContext:()=>true,
  owner:async r=>{remaining=r.toolBudget.callsRemaining;expect(r.context.protectedClaims).toEqual([]);expect(r.context.runtimeProducts?.[0]?.content).toBeDefined();return{kind:"FINAL",text:"Dạ chị."};},
  verifier:async()=>({result:{verdict:"PASS",violations:[]}})});
 expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");expect(remaining).toBe(5);
 // Existing catalog-only fallback and final readback each make a failed POS read plus one catalog-only read.
 expect(readProduct.mock.calls.filter(([,pos])=>pos===false)).toHaveLength(2);
});
