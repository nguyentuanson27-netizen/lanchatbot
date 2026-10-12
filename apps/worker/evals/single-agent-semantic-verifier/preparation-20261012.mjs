import {readFileSync} from 'node:fs';
import {buildRequest} from './protocol.mjs';
import {sourceDataConversationContext} from './source-data-context.mjs';

// Inactive preview/test preparation. No runner, provider or production imports this module.
const prompts=Object.fromEntries([
  ['conversation','fashion-sales-owner-source-data-preparation-20261012.vi.txt'],
  ['verifier','semantic-verifier-source-data-preparation-20261012.vi.txt'],
].map(([role,file])=>[role,readFileSync(new URL('./prompts/'+file,import.meta.url),'utf8')]));


export function buildPreparedRequest(manifest,role,projection) {
  if(manifest.variant!=='GEMINI_CONVERSATION'||manifest.conversationContextFormat!=='NATIVE_DIALOGUE_FACTS_V5')
    throw new Error('PREPARATION_REQUIRES_NATIVE_CONTEXT');
  const request=buildRequest({...manifest,prompts,ownerProfilePresentation:[],ownerPolicyPresentation:[]},role,projection);
  if(role==='conversation')request.contents[0].parts[0].text=sourceDataConversationContext(projection);
  const size=Buffer.byteLength(JSON.stringify(request),'utf8');
  if(size>manifest.bounds.totalBytes||size>manifest.bounds.totalTokenUpperBound)throw new Error('TOTAL_BOUND');
  return request;
}
