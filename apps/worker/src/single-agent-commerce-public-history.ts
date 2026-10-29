import {CommercePublicCartEventV1Schema,type CommercePublicCartEventV1} from "@lana/contracts";
import {createHash} from "node:crypto";
export interface CommerceHistoryMetadata {completeHistory:false;publicCartEvents:CommercePublicCartEventV1[]}
const bytes=(v:unknown)=>Buffer.byteLength(JSON.stringify(v));
/** State provenance only. Never raw intake text/PII or proof of customer delivery. */
export function publicCheckoutState(state:{checkoutDraft?:{paymentMethod?:string|null}|null;
  clarification?:{reasonCode:string;missingFields:readonly string[];attemptCount:number;askedQuestionFingerprints:readonly string[]}|null}) {
  const paymentMethod=["COD","BANK_TRANSFER"].includes(state.checkoutDraft?.paymentMethod??"")?state.checkoutDraft!.paymentMethod:null;
  const q=state.clarification;
  const questionFingerprint=q?.askedQuestionFingerprints.at(-1)??"";
  const lastQuestion=q?.reasonCode==="CHECKOUT_DETAILS_MISSING"&&q.missingFields.length>0&&q.missingFields.length<=4&&
    q.missingFields.every(f=>["FULL_NAME","PHONE","ADDRESS","PAYMENT_METHOD"].includes(f))&&Number.isSafeInteger(q.attemptCount)&&
    q.attemptCount>0&&q.attemptCount<=16&&/^[a-f0-9]{64}$/.test(questionFingerprint)
    ?{missingFields:[...q.missingFields],attemptCount:q.attemptCount,questionFingerprint,delivery:"UNKNOWN" as const}:null;
  return paymentMethod||lastQuestion?{provenance:"CODE_PERSISTED_CHECKOUT_STATE" as const,paymentMethod,lastQuestion}:null;
}
/** Communication history, deliberately outside the trusted world and current receipt gate. */
export function projectCommerceHistoryMetadata(history:readonly {role:string;text:string}[],events:readonly unknown[]){
  // Media remains in the existing bounded history projection. Its serialized summary
  // consumes the same 1KB metadata allowance; text/correction is never evicted here.
  const mediaBytes=history.filter(m=>m.text.includes('"RECENT_SHOP_IMAGES_ACCEPTED"')).reduce((n,m)=>n+Buffer.byteLength(m.text),0);
  const textBytes=history.reduce((n,m)=>n+Buffer.byteLength(m.text),0);
  const metadata:CommerceHistoryMetadata={completeHistory:false,publicCartEvents:[]};
  const dropped={invalid:0,duplicate:0,bound:0};
  const seen=new Set<string>(),messages=new Set(history.filter(m=>m.role==="shop").map(m=>createHash("sha256").update(JSON.stringify({kind:"TEXT",text:m.text})).digest("hex")));
  const parsed=events.flatMap(e=>{const p=CommercePublicCartEventV1Schema.safeParse(e);if(!p.success){dropped.invalid++;return [];}return [p.data];})
    .sort((a,b)=>b.acceptedAt.localeCompare(a.acceptedAt)||b.eventId.localeCompare(a.eventId));
  for(const event of parsed){
    if(seen.has(event.eventId)||messages.has(event.messageHash)){dropped.duplicate++;continue;}seen.add(event.eventId);
    const proposed={...metadata,publicCartEvents:[event,...metadata.publicCartEvents]};
    if(proposed.publicCartEvents.length>2||bytes(proposed.publicCartEvents)>768||bytes(proposed)+mediaBytes>1024||bytes(proposed)+textBytes>4096){dropped.bound++;continue;}
    metadata.publicCartEvents=proposed.publicCartEvents;
  }
  return {metadata,dropped};
}
