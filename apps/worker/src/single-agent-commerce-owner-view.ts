/**
 * What the conversational owner is shown for a cart-writing tool result.
 *
 * Presentation only. The internal result keeps its full contract for code that
 * proves commits, routes quotes or binds evidence; the verifier still receives
 * the evidence through trusted context. Nothing here is inferred from prose:
 * every field is copied from a code-owned result.
 */
import type {CommerceEffectFailureStage} from "./single-agent-commerce-effect-failure.js";

export const CART_WRITE_TOOLS:readonly string[]=["add_to_cart","change_cart_item"];
export interface OwnerToolResult {status:string;reason?:string;failureStage?:string;data?:unknown}
export interface CartWriteOutcome {
 /** true only for an applied command; "UNKNOWN" when the commit could not be proved either way. */
 done:boolean|"UNKNOWN";
 cartChanged:boolean|"UNKNOWN";
 needsFromCustomer?:"COLOR"|"SIZE";
 /** Options the customer can pick from, exactly as the source lists them for this request. */
 choices?:{color:string|null;size:string|null;stock:string}[];
 /** false when the source has more tuples than were retained. */
 choicesAreAllForRequest?:boolean;
 shopDataMissing?:string;
 meaning:string;
}
type Json=Record<string,unknown>;
const record=(v:unknown):v is Json=>!!v&&typeof v==="object"&&!Array.isArray(v);
/** Stages that end before, or with an explicit refusal of, the write. */
const NOT_COMMITTED:readonly CommerceEffectFailureStage[]=["VALIDATION","AUTHORITY","SOURCE","DOMAIN","CAS"];
/** Source bookkeeping the owner cannot use; the product section and verifier keep it. */
const CHOICE_INTERNALS=["status","reasonCode","availableSizes","availableColors","selectionOptions","selectionEvidence",
 "selectionOptionScope","selectionStatus","choiceResolution"];
const MEANING={
 DONE:"Đã thực hiện. Giỏ hiện tại là cartItems và cartQuote của kết quả này.",
 COLOR:"Chưa thêm hoặc sửa giỏ. Hỏi khách chọn màu trong choices; có lựa chọn của khách rồi mới gọi lại.",
 SIZE:"Chưa thêm hoặc sửa giỏ. Hỏi khách chọn size trong choices; có lựa chọn của khách rồi mới gọi lại.",
 SHOP_DATA:"Chưa thêm hoặc sửa giỏ: nguồn shop chưa ghi màu của món này. Không tự đặt tên màu.",
 NOT_DONE:"Thao tác chưa thực hiện, giỏ không đổi. Xử lý theo reason; không báo đã xong.",
 UNKNOWN:"Chưa xác nhận được giỏ đã đổi hay chưa. Không báo đã xong và không gọi lại lệnh này.",
} as const;

export function presentCartWriteResult(result:OwnerToolResult):OwnerToolResult&{data:Json} {
 const data:Json=record(result.data)?structuredClone(result.data):{};
 if(result.status==="OK")return {...result,data:{outcome:{done:true,cartChanged:true,meaning:MEANING.DONE} satisfies CartWriteOutcome,...data}};
 const choice=record(data.choiceResolution)?data.choiceResolution:null;
 const proved=data.effectCommitted===false||NOT_COMMITTED.includes(result.failureStage as CommerceEffectFailureStage);
 if(!proved)return {...result,data:{outcome:{done:"UNKNOWN",cartChanged:"UNKNOWN",meaning:MEANING.UNKNOWN} satisfies CartWriteOutcome,...data}};
 const rest=()=>Object.fromEntries(Object.entries(data).filter(([k])=>!CHOICE_INTERNALS.includes(k)));
 if(data.effectCommitted===false&&choice?.kind==="NEEDS_CUSTOMER_CHOICE"&&(choice.field==="COLOR"||choice.field==="SIZE")&&
  Array.isArray(choice.optionRefs)&&Array.isArray(data.selectionOptions)){
  const refs=new Set(choice.optionRefs),evidence=record(data.selectionEvidence)?data.selectionEvidence:null;
  const choices=data.selectionOptions.filter((o):o is Json=>record(o)&&refs.has(o.identityHash))
   .map(o=>({color:typeof o.color==="string"?o.color:null,size:typeof o.size==="string"?o.size:null,stock:String(o.status)}));
  // A choice the owner cannot name is not a usable result; fall through to the plain refusal.
  if(choices.length===refs.size&&choices.length>0){
   const outcome:CartWriteOutcome={done:false,cartChanged:false,needsFromCustomer:choice.field,choices,
    choicesAreAllForRequest:choice.completeness==="ALL_EXACT_TUPLES_FOR_QUERY",meaning:MEANING[choice.field]};
   return {status:"NOT_DONE",reason:"CUSTOMER_CHOICE_NEEDED",data:{outcome,
    ...(record(evidence?.allSourceValuesForQuery)?{allSourceValuesForQuery:evidence!.allSourceValuesForQuery}:{}),...rest()}};
  }
 }
 if(data.effectCommitted===false&&choice?.kind==="SHOP_DATA_MISSING")
  return {status:"NOT_DONE",reason:"SHOP_DATA_MISSING",data:{outcome:{done:false,cartChanged:false,shopDataMissing:String(choice.reason),
   meaning:MEANING.SHOP_DATA} satisfies CartWriteOutcome,...rest()}};
 return {...result,data:{outcome:{done:false,cartChanged:false,meaning:MEANING.NOT_DONE} satisfies CartWriteOutcome,...data}};
}
