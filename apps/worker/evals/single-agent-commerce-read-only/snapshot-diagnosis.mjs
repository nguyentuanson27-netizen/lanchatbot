// Evaluation-only allowlist. Never serializes profile, history, receipt bodies or media URLs/bytes.
import {createHash} from 'node:crypto';
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o?.[k]!==undefined).map(k=>[k,o[k]]));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const values={PRICE:['amountVnd','currency'],STOCK:['availableQuantity','status'],ETA:['minDays','maxDays']};
function projection(c){
 return {state:pick(c.state,['revision','conversationRevision','customerProfileRevision','bindingVersion','factSnapshotVersion','currentProductId','permission','privacyAllowed','conversationOwner']),
  claims:(c.protectedClaims??[]).map(p=>({type:p.type,scope:pick(p.scope,['kind','productId','variantId']),
   value:pick(p.value,values[p.type]??[]),source:pick(p.provenance,['authority','sourceVersion','observedAt','expiresAt','contentHash','evidenceRef'])})),
  policies:Object.fromEntries((c.policyLiterals??[]).map(p=>[p.ref,{...pick(p,['sourceVersion','observedAt','expiresAt']),textHash:hash(p.text??null)}])),
  products:Object.fromEntries((c.runtimeProducts??[]).map(p=>[p.subjectRef,{content:pick(p.content?.metadata,['authority','sourceVersion','observedAt','expiresAt']),attributes:pick(p.attributes?.metadata,['authority','sourceVersion','observedAt','expiresAt'])}]))};
}
export function publicSnapshotDiff(before,after){
 if(!before||!after)return {status:'INSUFFICIENT_EVIDENCE',changes:[],truncated:false};
 const result={status:'COMPARED',changes:[],truncated:false};
 const visit=(a,b,path)=>{
  if(JSON.stringify(a)===JSON.stringify(b))return;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
   for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort())visit(a[key],b[key],path+'/'+key);
  }else{
   const change={path,before:a??null,after:b??null};
   if(result.changes.length>=20||Buffer.byteLength(JSON.stringify({...result,changes:[...result.changes,change]}))>4090)result.truncated=true;
   else result.changes.push(change);
  }
 };
 visit(projection(before),projection(after),'');return result;
}
