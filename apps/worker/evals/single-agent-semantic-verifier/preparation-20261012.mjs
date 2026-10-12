import {readFileSync} from 'node:fs';
import {buildRequest} from './protocol.mjs';

// Inactive preview/test preparation. No runner, provider or production imports this module.
const prompts=Object.fromEntries([
  ['conversation','fashion-sales-owner-source-data-preparation-20261012.vi.txt'],
  ['verifier','semantic-verifier-source-data-preparation-20261012.vi.txt'],
].map(([role,file])=>[role,readFileSync(new URL('./prompts/'+file,import.meta.url),'utf8')]));

function sourceContext({trusted,untrusted,requestIdentity}) {
  const prefix='CodeSizeInput: ';
  const profiles=(trusted.productProfiles??[]).map(({ref,subjectRef,details})=>{
    const input=details.sizeChart?.find(line=>line.startsWith(prefix));
    // Existing explicit JSON field; keep all business details, including the complete chart.
    return {ref,subjectRef,details,codeSizeInput:input?JSON.parse(input.slice(prefix.length)):null};
  });
  const claims=trusted.protectedClaims.map(({type,scope,value})=>({type,scope,value}));
  const refs=new Set(trusted.boundSubjects.map(subject=>subject.ref));
  const display={
    products:trusted.boundSubjects.map(subject=>({subject,
      profiles:profiles.filter(profile=>profile.subjectRef===subject.ref),
      claims:claims.filter(claim=>claim.scope.productId===subject.ref)})),
    otherProfiles:profiles.filter(profile=>!refs.has(profile.subjectRef)),
    otherClaims:claims.filter(claim=>!refs.has(claim.scope.productId)),
    policyLiterals:trusted.policyLiterals.map(({ref,text})=>({ref,text})),effectReceipts:trusted.effectReceipts,
    // Reuse V5's owner state allowlist; canonical provenance/permissions stay with code/verifier.
    state:Object.fromEntries(['conversationOwner','currentProductId','consideredSize','salesStage']
      .filter(key=>Object.hasOwn(trusted.state,key)).map(key=>[key,trusted.state[key]])),
  };
  return '# Context tư vấn — SOURCE_DATA_PREPARATION_20261012\n'+JSON.stringify({
    requestIdentity,trusted:display,untrusted:{retrievedText:untrusted.retrievedText},
  })+'\n';
}

export function buildPreparedRequest(manifest,role,projection) {
  if(manifest.variant!=='GEMINI_CONVERSATION'||manifest.conversationContextFormat!=='NATIVE_DIALOGUE_FACTS_V5')
    throw new Error('PREPARATION_REQUIRES_NATIVE_CONTEXT');
  const request=buildRequest({...manifest,prompts,ownerProfilePresentation:[],ownerPolicyPresentation:[]},role,projection);
  if(role==='conversation')request.contents[0].parts[0].text=sourceContext(projection);
  const size=Buffer.byteLength(JSON.stringify(request),'utf8');
  if(size>manifest.bounds.totalBytes||size>manifest.bounds.totalTokenUpperBound)throw new Error('TOTAL_BOUND');
  return request;
}
