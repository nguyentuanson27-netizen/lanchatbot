import {MEDIA_FRESH_FOR_SECONDS} from '@lana/contracts';
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const bytes=x=>Buffer.byteLength(JSON.stringify(x));
/** Only operational hints; missing/corrupt data never changes the base business request. */
export function projectMediaCapabilities(raw,context,at=Date.now(),audit=()=>{}){
 if(raw===undefined)return [];
 if(!Number.isFinite(at)){audit({omitted:"EXPIRED_OR_CLOCK"});return [];}
 if(!context.state.permission||!context.state.privacyAllowed||context.state.conversationOwner!=="BOT"){audit({omitted:"AUTHORITY"});return [];}
 if(!Array.isArray(raw)||raw.length>8){audit({omitted:'MALFORMED'});return [];}
 const output=[],seen=new Set();
 for(const x of raw){
  const shape=exact(x,['schemaVersion','subjectRef','observedAt','expiresAt','mediaSourceHash','queries']);
  if(!shape||x.schemaVersion!==1||!context.boundSubjects.some(s=>s.kind==='PRODUCT'&&s.ref===x.subjectRef)||
   seen.has(x.subjectRef)||typeof x.mediaSourceHash!=='string'||typeof x.observedAt!=='string'||typeof x.expiresAt!=='string'||!/^[a-f0-9]{64}$/.test(x.mediaSourceHash)||!Array.isArray(x.queries)||!x.queries.length||x.queries.length>7||
   !x.queries.every(q=>exact(q,['intent','componentRole','color','status'])&&['GENERIC','FEEDBACK','DETAIL','BACK'].includes(q.intent)&&
     [null,'TOP','SKIRT','PANTS'].includes(q.componentRole)&&(q.color===null||typeof q.color==='string'&&q.color.trim()&&Buffer.byteLength(q.color)<=64)&&
     ['MATCH_AVAILABLE','NO_VERIFIED_MATCH'].includes(q.status))){audit({omitted:'MALFORMED'});continue;}
  const observed=Date.parse(x.observedAt),expires=Date.parse(x.expiresAt);
  if(!Number.isFinite(observed)||!Number.isFinite(expires)||observed>at||expires<=at||expires<=observed||expires-observed>MEDIA_FRESH_FOR_SECONDS*1000){audit({omitted:'EXPIRED_OR_CLOCK'});continue;}
  if(bytes(x)>1024){audit({omitted:'PRODUCT_BYTES'});continue;}
  seen.add(x.subjectRef);output.push(structuredClone(x));
 }
 if(bytes(output)>4096){audit({omitted:'FIELD_BYTES'});return [];}
 audit({includedProducts:output.length,bytes:bytes(output)});return output;
}
