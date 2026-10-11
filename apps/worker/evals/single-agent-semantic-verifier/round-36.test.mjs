import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';import {createGeminiInference} from './gemini-inference.mjs';import {evaluateA3Attempt} from './run-a3.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(36,'manifest.json'),prior=read(35,'manifest.json'),a2=read(36,'corpus-a2.json'),a3=read(36,'corpus-a3.json');
const metadata=['round','specSha','previousRoundSourceSha','reviewedPromptSourceSha','comparisonSourceSha','roundAuthorization','roundChangePolicy','treatmentDocument'];
test('fixed36 registers the exact35 semantic population/prompts/config and fresh provenance',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'36'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:47,a3:42});
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','reference-replies.json','size-inputs.json','quote-inputs.json','context-preparation.json'])assert.equal(raw(36,f),raw(35,f));
 for(const[k,v]of Object.entries(prior))if(!metadata.includes(k))assert.deepEqual(m[k],v,k);
 assert.equal(m.specSha,'d1c5be045499f2f63894c85c36d648ca2e7165fb');assert.equal(m.implementationBaseSha,'296cdcfbf5759f5bf9cbb24acf3dc63005589361');
 assert.equal(hash(readFileSync(new URL('../../../../'+m.treatmentDocument.file,import.meta.url))),m.treatmentDocument.sha256);
});
test('all42 round36 captured requests preserve exact native35 bodies and exclude evaluator-only labels',async()=>{
 for(const original of a3.cases){const c=structuredClone(original),marker='ROUND36_EVALUATOR_ONLY';for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;c.runtime.trusted.state.rubric=marker;
  const p=projectRuntime(m,c,'conversation','opaque'),old=projectRuntime(prior,c,'conversation','opaque');assert.deepEqual(p,old);assert.deepEqual(buildRequest(m,'conversation',p),buildRequest(prior,'conversation',old));
  const captured=[];const attempt=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,requestBody:body,answer:role==='conversation'?'Dạ chị.':'{"verdict":"UNCERTAIN","violations":[]}'};});
  assert.deepEqual(captured.map(x=>x.role),['conversation','verifier']);assert.equal(attempt.terminal.disposition,'FALLBACK');
  for(const{body}of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric'])assert.ok(!JSON.stringify(body).includes(label),label);
 }
});
test('fixed36 native adapter preserves one request and current HTTP failure without generation retry',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'round36@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const body=buildRequest(prior,'conversation',projectRuntime(prior,a3.cases[0],'conversation','opaque'));let calls=0,captured;
 const run=createGeminiInference(m,{credential,fetchImpl:async(url,o)=>{if(url.includes('oauth2'))return Response.json({access_token:'UNIT_SECRET',expires_in:3600});calls++;captured=JSON.parse(o.body);return new Response(null,{status:429});}});
 const result=await run(body);assert.equal(calls,1);assert.deepEqual(captured,body);assert.equal(result.providerRequests,1);assert.equal(result.httpStatus,429);assert.equal(result.status,'PROVIDER_ERROR');assert.ok(!JSON.stringify(result).includes('UNIT_SECRET'));
});
test('rehashing changed frozen semantics or adopting results cannot authorize36',()=>{
 for(const change of [v=>{v.bounds.totalBytes++;},v=>{v.usability.maximumTerminalFailureRate=.15;},v=>{v.models.conversation.effort='MEDIUM';},v=>{v.prompts.conversation+=' Changed';v.promptHashes.conversation=hash(v.prompts.conversation);},v=>{v.prompts.verifier+=' Changed';v.promptHashes.verifier=hash(v.prompts.verifier);},v=>{v.ownerAmendment={};}]){const v=structuredClone(m);change(v);assert.throws(()=>validateProtocol(v,a2,a3));}
 const c=structuredClone(a2),v=structuredClone(m);c.cases[120].evaluator.reason='Unregistered';v.corpusHashes.a2=hash(JSON.stringify(c));assert.throws(()=>validateProtocol(v,c,a3),/ROUND36_POPULATION|ROUND36_CONTROL/);
 const adopting=structuredClone(m);adopting.adoptedA2RunSourceSha='a'.repeat(40);assert.throws(()=>validateProtocol(adopting,a2,a3),/ROUND36_CONTROL/);
});
