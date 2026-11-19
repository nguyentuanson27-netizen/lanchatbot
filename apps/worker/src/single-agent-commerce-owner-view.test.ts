import {describe,it,expect} from "vitest";
import {presentCartWriteResult,presentNegotiationResult,presentPreCartQuoteResult,presentPendingPurchase,presentPendingSupport,presentSupportResult,PENDING_PURCHASE_MEANING} from "./single-agent-commerce-owner-view.js";

const option=(color:string|null,status:string,hash:string)=>({size:"M",color,status,reasonCode:null,identityHash:hash.repeat(64),
 productId:"SV2447",offerType:"AO",quantity:1,sourceVersion:"pos-v1",observedAt:"2026-11-10T09:00:00.000Z",expiresAt:"2026-11-10T09:20:00.000Z"});
const needsColour=(completeness="ALL_EXACT_TUPLES_FOR_QUERY")=>({status:"UNAVAILABLE",reason:"SELECTION_UNAVAILABLE",failureStage:"SOURCE",data:{
 status:"COLOR_REQUIRED",reasonCode:"CART_COLOR_REQUIRED",availableSizes:[],availableColors:[],
 selectionOptions:[option("Trắng","IN_STOCK","a"),option("Be","PRE_ORDER","b")],
 selectionEvidence:{kind:"CANDIDATE_SELECTION_V3",contentHash:"e".repeat(64),completeness,
  allSourceValuesForQuery:completeness==="ALL_EXACT_TUPLES_FOR_QUERY"?null:{colors:{values:[{value:"Trắng",stock:["IN_STOCK"]}],complete:true},sizes:{values:[],complete:false}}},
 effectCommitted:false,selectionOptionScope:"ALL_EXACT_TUPLES_FOR_QUERY",selectionStatus:"COLOR_REQUIRED",
 choiceResolution:{kind:"NEEDS_CUSTOMER_CHOICE",field:"COLOR",evidenceHash:"e".repeat(64),completeness,optionRefs:["a".repeat(64),"b".repeat(64)]},
 preCartQuoteRequest:{tool:"quote_product",target:{subjectRef:"SV2447",offerTypes:["AO"]}}}});

it("keeps a computed pre-cart support offer distinct from an applied benefit",()=>{
 const supportEvaluation={status:"QUOTED",pendingRef:"pending",supportAvailability:"AVAILABLE",negotiationApplied:false,additionalDiscountVnd:30000};
 const r={status:"OK",data:{calculationBasis:"PRE_CART_POLICY",appliesNegotiationReceipt:false,
  preCartQuote:{grandTotalVnd:948100,supportEvaluation,benefitAuthorization:{status:"NOT_GRANTED",receiptRef:null}}}};
 const projected=presentPreCartQuoteResult(r) as typeof r&{data:{supportEvaluation:unknown}};
 expect(projected.data.supportEvaluation).toEqual(supportEvaluation);
 expect(projected.data.preCartQuote).toEqual({grandTotalVnd:948100,benefitAuthorization:{status:"NOT_GRANTED",receiptRef:null}});
 expect(r.data.preCartQuote.supportEvaluation).toEqual(supportEvaluation);
});

describe("cart write result shown to the owner",()=>{
 it("states that nothing was added and names the colours to ask for",()=>{
  const raw=needsColour(),before=structuredClone(raw),view=presentCartWriteResult(raw);
  expect(view).toEqual({status:"NOT_DONE",reason:"CUSTOMER_CHOICE_NEEDED",data:{
   outcome:{done:false,cartChanged:false,needsFromCustomer:"COLOR",
    choices:[{color:"Trắng",size:"M",stock:"IN_STOCK"},{color:"Be",size:"M",stock:"PRE_ORDER"}],choicesAreAllForRequest:true,
    meaning:expect.stringContaining("Chưa thêm")},
   effectCommitted:false,preCartQuoteRequest:raw.data.preCartQuoteRequest}});
  expect(Object.keys(view.data)[0]).toBe("outcome");
  // A customer asking the price is pointed at the quote, not back at this command (PR 392 case J1).
  expect((view.data.outcome as {meaning:string}).meaning).toMatch(/hỏi giá hoặc tổng tiền thì gọi quote_product.*không gọi lại lệnh này.*đặt mua thì hỏi khách chọn màu/su);
  // The internal contract that proves the no-commit route is untouched.
  expect(raw).toEqual(before);
 });
 it("shows no hash, source stage or empty colour list that reads as a source failure",()=>{
  const text=JSON.stringify(presentCartWriteResult(needsColour()));
  expect(text).not.toMatch(/[a-f0-9]{64}|SELECTION_UNAVAILABLE|failureStage|availableColors|selectionEvidence|optionRefs/);
  expect(Buffer.byteLength(text)).toBeLessThan(Buffer.byteLength(JSON.stringify(needsColour()))/2);
 });
 it("says when the listed choices are not the whole source list and carries every value",()=>{
  const view=presentCartWriteResult(needsColour("FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY"));
  expect(view.data.outcome).toMatchObject({choicesAreAllForRequest:false});
  expect(view.data.allSourceValuesForQuery).toMatchObject({colors:{complete:true}});
 });
 it("offers the quote route only when quote_product can be called in that generation",()=>{
  const view=presentCartWriteResult(needsColour(),{quoteCallable:false});
  expect(view.data).not.toHaveProperty("preCartQuoteRequest");
  expect((view.data.outcome as {meaning:string}).meaning).toBe("Chưa thêm hoặc sửa giỏ. Hỏi khách chọn màu trong choices; có lựa chọn của khách rồi mới gọi lại.");
  const noRoute=needsColour();delete (noRoute.data as {preCartQuoteRequest?:unknown}).preCartQuoteRequest;
  expect((presentCartWriteResult(noRoute).data.outcome as {meaning:string}).meaning).not.toMatch(/quote_product/u);
 });
 it("asks for size with the same shape",()=>{
  const raw=needsColour();raw.data.choiceResolution.field="SIZE";
  expect(presentCartWriteResult(raw).data.outcome).toMatchObject({needsFromCustomer:"SIZE",meaning:expect.stringContaining("chọn size")});
 });
 it("does not offer choices it cannot name",()=>{
  const raw=needsColour();raw.data.choiceResolution.optionRefs=["a".repeat(64),"f".repeat(64)];
  const view=presentCartWriteResult(raw);
  expect(view).toMatchObject({status:"UNAVAILABLE",reason:"SELECTION_UNAVAILABLE",data:{outcome:{done:false,cartChanged:false}}});
  expect(view.data.outcome).not.toHaveProperty("choices");
 });
 it("reports a missing shop colour as a source gap, never as a choice",()=>{
  const raw=needsColour();Object.assign(raw.data,{choiceResolution:{kind:"SHOP_DATA_MISSING",reason:"SHOP_COLOR_UNRECORDED"},shopDataGap:"SHOP_COLOR_UNRECORDED"});
  expect(presentCartWriteResult(raw)).toEqual({status:"NOT_DONE",reason:"SHOP_DATA_MISSING",data:{
   outcome:{done:false,cartChanged:false,shopDataMissing:"SHOP_COLOR_UNRECORDED",meaning:expect.stringContaining("Không tự đặt tên màu")},
   effectCommitted:false,preCartQuoteRequest:raw.data.preCartQuoteRequest,shopDataGap:"SHOP_COLOR_UNRECORDED"}});
 });
 it("marks an applied command done and keeps its cart data",()=>{
  const view=presentCartWriteResult({status:"OK",data:{operationId:"op",cartItems:[{lineId:"l1"}],cartQuote:{grandTotalVnd:829000}}});
  expect(view).toMatchObject({status:"OK",data:{outcome:{done:true,cartChanged:true},operationId:"op",cartQuote:{grandTotalVnd:829000}}});
 });
 it.each(["VALIDATION","AUTHORITY","SOURCE","DOMAIN","CAS"])("treats a %s refusal as proven not done and keeps the reason",stage=>{
  expect(presentCartWriteResult({status:"REJECTED",reason:"EFFECT_PERMISSION",failureStage:stage}))
   .toEqual({status:"REJECTED",reason:"EFFECT_PERMISSION",failureStage:stage,data:{outcome:{done:false,cartChanged:false,meaning:expect.stringContaining("giỏ không đổi")}}});
 });
 it.each([["COMMIT_UNKNOWN","UNKNOWN_COMMIT"],["READBACK","COMMERCE_UNAVAILABLE"],[undefined,"COMMERCE_UNAVAILABLE"]])(
  "never claims either way when the commit is unproved (%s)",(stage,reason)=>{
  const view=presentCartWriteResult({status:"UNAVAILABLE",reason,...(stage?{failureStage:stage}:{})});
  expect(view.data.outcome).toEqual({done:"UNKNOWN",cartChanged:"UNKNOWN",meaning:expect.stringContaining("Không báo đã xong")});
 });
});

describe("price support asked for before a cart exists (option A)",()=>{
 const refused=()=>({status:"REJECTED",reason:"NEGOTIATION_CONTEXT_REQUIRED",failureStage:"VALIDATION",
  data:{effectCommitted:false,negotiationStatus:"NOT_EVALUATED",supportAvailability:"UNKNOWN",missing:["CART","NEGOTIATION"]}});
 const quote=()=>({status:"OK",data:{subjectRef:"SV2447",calculationBasis:"PRE_CART_POLICY",appliesNegotiationReceipt:false,quoteTaskStatus:"PREPARED_PENDING_FINAL_GATE",
  preCartQuote:{negotiationAssessment:"NOT_EVALUATED",grandTotalVnd:529000}}});
 it("tells the owner what is unknown and what the customer does next, on both routes",()=>{
  const a=presentNegotiationResult(refused()).data as Record<string,unknown>,b=presentPreCartQuoteResult(quote()).data as Record<string,unknown>;
  expect(a).toEqual({supportEvaluation:{status:"NOT_EVALUATED",supportAvailability:"UNKNOWN",missing:["CART","NEGOTIATION"]},effectCommitted:false});
  expect(Object.keys(a)[0]).toBe("supportEvaluation");
  expect(b.supportEvaluation).toEqual({status:"NOT_EVALUATED",supportAvailability:"UNKNOWN",missing:["CART"]});
  // The quote itself is untouched: the total and the field the prompt names are still there.
  expect(b).toMatchObject({calculationBasis:"PRE_CART_POLICY",preCartQuote:{negotiationAssessment:"NOT_EVALUATED",grandTotalVnd:529000}});
 });
 it("keeps an unassessed request distinct from a grant or a denial",()=>{
  const view=presentNegotiationResult(refused()).data as Record<string,unknown>;
  expect(view.supportEvaluation).toEqual({status:"NOT_EVALUATED",supportAvailability:"UNKNOWN",missing:["CART","NEGOTIATION"]});
  expect(view).not.toHaveProperty("cartQuote");
 });
 it("leaves every other result as it was",()=>{
  const evaluated={status:"OK",data:{effectCommitted:true,negotiationStatus:"EVALUATED",supportAvailability:"AVAILABLE",cartQuote:{grandTotalVnd:499000}}};
  expect(presentNegotiationResult(evaluated)).toBe(evaluated);
  for(const other of [{...refused(),reason:"NEGOTIATION_SOURCE_OR_CART"},{...refused(),data:{...refused().data,effectCommitted:true}},{...refused(),data:{...refused().data,missing:["OTHER"]}}])
   expect(presentNegotiationResult(other)).toBe(other);
  const cartQuote={status:"OK",data:{calculationBasis:"CART",appliesNegotiationReceipt:true}},failed={status:"UNAVAILABLE",reason:"PRICE_UNAVAILABLE"};
  expect(presentPreCartQuoteResult(cartQuote)).toBe(cartQuote);expect(presentPreCartQuoteResult(failed)).toBe(failed);
  const raw=refused(),before=structuredClone(raw);presentNegotiationResult(raw);expect(raw).toEqual(before);
 });
});

describe("pending purchase shown to the owner (PR 392 case J1)",()=>{
 const line=(size:string,quantity=1)=>({productId:"SV2447",offerType:"AO",size,color:null,quantity,missing:"COLOR"});
 const pending={lines:[line("M"),line("L"),{...line("M",2),productId:"SM613",offerType:"DIRECT"}],recordedAt:"2026-11-12T09:00:00.000Z"};
 it("spells out one quote request per product and offer with the quantity the customer asked for",()=>{
  const view=presentPendingPurchase(pending)!;
  expect(Object.keys(view)[0]).toBe("meaning");expect(view.meaning).toBe(PENDING_PURCHASE_MEANING.QUOTABLE);
  expect(view.lines).toEqual([{subjectRef:"SV2447",offerType:"AO",size:"M",color:null,quantity:1,missing:"COLOR"},{subjectRef:"SV2447",offerType:"AO",size:"L",color:null,quantity:1,missing:"COLOR"},
   {subjectRef:"SM613",offerType:"DIRECT",size:"M",color:null,quantity:2,missing:"COLOR"}]);
  expect(view.quoteRequests).toEqual([{tool:"quote_product",subjectRef:"SV2447",offerTypes:["AO"],quantity:2},{tool:"quote_product",subjectRef:"SM613",offerTypes:["DIRECT"],quantity:2}]);
  expect(JSON.stringify(view)).not.toMatch(/recordedAt|productId/);
 });
 it("says a price does not wait for the missing choice, and states no price itself",()=>{
  expect(PENDING_PURCHASE_MEANING.QUOTABLE).toMatch(/Khách hỏi giá hoặc tổng tiền: gọi quote_product theo quoteRequests rồi báo số tiền, không hỏi lại màu hay size trước/u);
  expect(PENDING_PURCHASE_MEANING.QUOTABLE).toMatch(/chưa phải giỏ hàng/u);
  for(const text of Object.values(PENDING_PURCHASE_MEANING))expect(text).not.toMatch(/\d/u);
 });
 it("offers no quote route the generation cannot take and shows nothing for a malformed note",()=>{
  const view=presentPendingPurchase(pending,{quoteCallable:false})!;
  expect(view.meaning).toBe(PENDING_PURCHASE_MEANING.PLAIN);expect(view).not.toHaveProperty("quoteRequests");expect(view.meaning).not.toMatch(/quote_product/u);
  for(const bad of [undefined,null,{},{lines:[]},{lines:[{...line("M"),missing:"OTHER"}]},{lines:[{...line("M"),quantity:1.5}]}])expect(presentPendingPurchase(bad)).toBeNull();
 });
});

describe("support evaluated by code while the cart opened",()=>{
 const opened=(supportEvaluation:Record<string,unknown>)=>({status:"OK",data:{operationId:"op",effect:"CART_OPENED",cartItems:[],cartQuote:{grandTotalVnd:948100},supportEvaluation}});
 it("tells the owner the total already reflects the evaluated request, or that it was not evaluated",()=>{
  const evaluated=presentCartWriteResult(opened({status:"EVALUATED",evaluatedBy:"CODE_AT_CART_OPENING",negotiationApplied:true}));
  expect(evaluated.data.supportEvaluation).toEqual({status:"EVALUATED",evaluatedBy:"CODE_AT_CART_OPENING",negotiationApplied:true});
  expect(evaluated.data.outcome).toMatchObject({done:true,cartChanged:true});
  const pending=presentCartWriteResult(opened({status:"NOT_EVALUATED",evaluatedBy:"CODE_AT_CART_OPENING",negotiationApplied:false,reason:"EFFECT_PERMISSION"}));
  expect(pending.data.supportEvaluation).toEqual({status:"NOT_EVALUATED",evaluatedBy:"CODE_AT_CART_OPENING",negotiationApplied:false,reason:"EFFECT_PERMISSION"});
 });
 it("leaves an ordinary cart write without a support statement",()=>{
  const {supportEvaluation:_none,...data}=opened({}).data;
  expect(presentCartWriteResult({status:"OK",data}).data).not.toHaveProperty("supportEvaluation");
 });
});
describe("support facts shown to the owner",()=>{
 it.each([
  [undefined,["CUSTOMER_PURCHASE_CHOICE"],"MATCHING_CART_OPENS","UNKNOWN",[]],
  [undefined,[],"MATCHING_CART_OPENS","UNKNOWN",[]],
  [undefined,["COLOR"],"MATCHING_CART_OPENS","KNOWN",["COLOR"]],
  ["KNOWN",[],"NOT_COMPLETED_AT_CART_OPENING","KNOWN",[]],
  ["UNKNOWN",["SIZE"],"MATCHING_CART_OPENS","UNKNOWN",[]],
  ["KNOWN",["SIZE"],"REQUEST_DIFFERS_FROM_CART","UNKNOWN",[]],
 ])("normalizes waiting state %s / %j / %s", (status,fields,when,expectedStatus,expectedFields)=>{
  const pending={pendingRef:"ref",subjectRef:"P",offerType:"AO",canApply:false,
   evaluation:{by:"CODE",when,waitingFor:fields,...(status?{waitingForStatus:status}:{}),meaning:"PROCESS_CANARY"}};
  const before=structuredClone(pending),view=presentPendingSupport(pending) as {evaluation:Record<string,unknown>};
  expect(view.evaluation).toEqual({by:"CODE",when,waitingFor:expectedFields,waitingForStatus:expectedStatus});
  expect(pending).toEqual(before);
 });
 it("preserves amounts, proof fields and unrelated meanings while removing support prose",()=>{
  const raw={status:"OK",data:{operationId:"op",effect:"CART_OPENED",receiptRef:"receipt:op",
   cartQuote:{cartId:"cart",cartVersion:2,grandTotalVnd:948100,appliedAdjustments:[{kind:"FREE_SHIPPING",amountVnd:30000}]},
   outcome:{done:true,meaning:"CART_OUTCOME"},pendingPurchase:{meaning:"QUOTE_ROUTE"},
   supportEvaluation:{status:"EVALUATED",negotiationApplied:true,supportOperationId:"support-op",grandTotalAfterVnd:948100,meaning:"SUPPORT_PROCESS"}}};
  const before=structuredClone(raw),projected=presentSupportResult(raw);
  const {meaning:_meaning,...facts}=raw.data.supportEvaluation;
  expect(projected).toEqual({...raw,data:{...raw.data,supportEvaluation:facts}});
  expect(raw).toEqual(before);
 });
});
