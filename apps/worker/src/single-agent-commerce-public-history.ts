import {CommercePublicCartEventV1Schema,type CommercePublicCartEventV1} from "@lana/contracts";
import {createHash} from "node:crypto";
export interface CommerceHistoryMetadata {completeHistory:false;publicCartEvents:CommercePublicCartEventV1[]}
const bytes=(v:unknown)=>Buffer.byteLength(JSON.stringify(v));
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
