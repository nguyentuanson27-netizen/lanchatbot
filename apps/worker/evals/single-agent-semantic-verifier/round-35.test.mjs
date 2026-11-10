import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest,inputUrl} from './protocol.mjs';
import {evaluateA3Attempt,validateA3Evidence} from './run-a3.mjs';import {createGeminiInference} from './gemini-inference.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(35,'manifest.json'),a2=read(35,'corpus-a2.json'),a3=read(35,'corpus-a3.json'),control=read(34,'manifest.json');
const metadata=['round','specSha','previousRoundSourceSha','reviewedPromptSourceSha','comparisonSourceSha','roundAuthorization','roundChangePolicy','treatmentDocument','prompts','promptHashes','conversationContextFormat'];
// Test-only lossless readback, never a production language parser.
function factsReadback(text){
 const sections=new Map();let rows;
 for(const line of text.split('\n'))if(line.startsWith('## ')){rows=[];sections.set(line.slice(3),rows);}else if(line.includes(': ')&&!line.startsWith('#')){assert.ok(rows);rows.push(JSON.parse(line.slice(line.indexOf(': ')+2)));}
 const profiles=[];if(sections.has('TRUSTED — Hồ sơ sản phẩm')){let details={};for(const row of sections.get('TRUSTED — Hồ sơ sản phẩm'))if(Object.hasOwn(row,'ref')){profiles.push({...row,details});details={};}else Object.assign(details,row);assert.deepEqual(details,{});}
 const claimRows=sections.get('TRUSTED — Giá, tồn và kết quả size'),claims=[];for(let i=0;i<claimRows.length;i+=2)claims.push({...claimRows[i+1],...claimRows[i]});
 assert.ok(!sections.has('UNTRUSTED — Lịch sử hội thoại'));assert.ok(!sections.has('UNTRUSTED — Tin mới của khách'));
 return{requestIdentity:sections.get('REQUEST_IDENTITY — Ràng buộc hiện tại')[0],trusted:{boundSubjects:sections.get('TRUSTED — Sản phẩm và đối tượng đã bind'),protectedClaims:claims,policyLiterals:sections.get('TRUSTED — Chính sách và tổng tiền'),effectReceipts:sections.get('TRUSTED — Biên nhận hành động'),state:sections.get('TRUSTED — Trạng thái được phép đọc')[0],...(sections.has('TRUSTED — Hồ sơ sản phẩm')?{productProfiles:profiles}:{})},retrievedText:sections.get('UNTRUSTED — Nội dung truy xuất')};
}
const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'native-test@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
const response=()=>Response.json({modelVersion:m.models.conversation.version,candidates:[{content:{parts:[{text:'Dạ chị nhé.'}]},finishReason:'STOP'}]});
const nativeAdapterRequest=()=>{
 const p=projectRuntime(control,a3.cases[0],'conversation','opaque-adapter'),old=buildRequest(control,'conversation',p);
 return{...old,systemInstruction:{parts:[{text:m.prompts.conversation}]},contents:[old.contents[0],...p.untrusted.recentAcceptedDialogue.map(x=>({role:x.role==='customer'?'user':'model',parts:[{text:x.text}]})),{role:'user',parts:[{text:p.untrusted.latestCustomerMessage}]}]};
};
test('fixed35 registers only native owner context/prompt and preserves all34 populations/config',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'35'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:47,a3:42});
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','reference-replies.json','size-inputs.json','quote-inputs.json','context-preparation.json'])assert.equal(raw(35,f),raw(34,f));
 for(const [k,v]of Object.entries(control))if(!metadata.includes(k))assert.deepEqual(m[k],v,k);
 assert.equal(m.prompts.verifier,control.prompts.verifier);assert.equal(m.promptHashes.verifier,control.promptHashes.verifier);
 assert.equal(m.prompts.conversation,readFileSync(new URL('./prompts/fashion-sales-owner-round35.vi.txt',import.meta.url),'utf8'));
 assert.equal(hash(readFileSync(new URL('../../../../'+m.treatmentDocument.file,import.meta.url))),m.treatmentDocument.sha256);
 assert.equal(m.conversationContextFormat,'NATIVE_DIALOGUE_FACTS_V3');assert.equal(m.ownerAmendment,undefined);
});
test('all42 native requests preserve exact dialogue order/current message/every fact/binding and unchanged verifier',()=>{
 for(const c of a3.cases){
  const p=projectRuntime(control,c,'conversation','opaque-request'),before=structuredClone(p);
  const body=buildRequest(m,'conversation',p),facts=factsReadback(body.contents[0].parts[0].text);
  assert.deepEqual(projectRuntime(m,c,'conversation','opaque-request'),p);assert.equal(p.requestIdentity.trustedSnapshotId,hash(JSON.stringify(p.trusted)));
  assert.deepEqual(facts,{requestIdentity:p.requestIdentity,trusted:p.trusted,retrievedText:p.untrusted.retrievedText});
  assert.deepEqual(body.contents.slice(1),[...p.untrusted.recentAcceptedDialogue.map(x=>({role:x.role==='customer'?'user':'model',parts:[{text:x.text}]})),{role:'user',parts:[{text:p.untrusted.latestCustomerMessage}]}]);
  assert.deepEqual(p,before);const v={runtime:{...c.runtime,finalDraft:'Dạ chị.'}};
  assert.deepEqual(buildRequest(m,'verifier',projectRuntime(m,v,'verifier','opaque-verifier')),buildRequest(control,'verifier',projectRuntime(control,v,'verifier','opaque-verifier')));
  const oldBody=JSON.parse(raw(34,'a3-evidence.json')).attempts.find(v=>v.caseId===c.evaluator.caseId).conversation;
  const id=oldBody.requestBody.contents[0].parts[0].text.match(/Identity: (.+)\n/);assert.ok(id);
  assert.deepEqual(buildRequest(control,'conversation',projectRuntime(control,c,'conversation',JSON.parse(id[1]).requestId)),oldBody.requestBody);
 }
});
test('all42 captured role requests exclude evaluator labels and every surviving owner text is verified',async()=>{
 for(const original of a3.cases){const c=structuredClone(original),marker='ROUND35_EVALUATOR_ONLY',captured=[];
  for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;c.runtime.trusted.state.rubric=marker;c.reviewFinding=marker;
  const attempt=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,requestBody:body,answer:role==='conversation'?'Dạ chị.':'{"verdict":"UNCERTAIN","violations":[]}'};});
  assert.deepEqual(captured.map(x=>x.role),['conversation','verifier']);assert.equal(attempt.terminal.disposition,'FALLBACK');
  for(const{body}of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','reviewFinding'])assert.ok(!JSON.stringify(body).includes(label),label);
  const evidence={a3RunSourceSha:'a'.repeat(40),manifestHash:hash(readFileSync(inputUrl('manifest.json'),'utf8')),attempts:[{...attempt,caseId:original.evaluator.caseId,attemptId:original.evaluator.caseId+':1'}],quality:{status:'BLOCKED'},operational:{unitStubOnly:true}};
  assert.doesNotThrow(()=>validateA3Evidence(m,{cases:[original]},evidence));
  const tampered=structuredClone(evidence);tampered.attempts[0].conversationRequestId='changed';assert.throws(()=>validateA3Evidence(m,{cases:[original]},tampered),/A3_CONVERSATION_FIREWALL/);
 }
});
test('native adapter sends bounded text-only history unchanged with one generation and no credential disclosure',async()=>{
 const request=nativeAdapterRequest(),captured=[];
 const run=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'UNIT_ONLY_SECRET',expires_in:3600});captured.push(JSON.parse(options.body));return response();}});
 const result=await run(request);assert.equal(result.status,'OK');assert.equal(result.providerRequests,1);assert.equal(captured.length,1);assert.deepEqual(captured[0],request);
 for(const secret of ['UNIT_ONLY_SECRET',credential.client_email,credential.private_key])assert.ok(!JSON.stringify(result).includes(secret));
 for(const mutation of [r=>{r.contents[1].parts[0].functionCall={name:'tool'};},r=>{r.contents[1].role='system';},r=>{r.contents.push(...Array.from({length:m.bounds.historyCount+1},()=>r.contents.at(-1)));},r=>{r.contents.at(-1).role='model';}]){
  const invalid=structuredClone(request);mutation(invalid);const rejected=await run(invalid);assert.equal(rejected.status,'PROVIDER_ERROR');assert.equal(rejected.error,'VERTEX_TEXT_REQUEST');assert.equal(rejected.providerRequests,0);assert.equal(captured.length,1);
 }
 const old=buildRequest(control,'conversation',projectRuntime(control,a3.cases[0],'conversation','legacy'));const legacy=createGeminiInference(control,{credential,fetchImpl:async url=>url.includes('oauth2')?Response.json({access_token:'UNIT_ONLY_SECRET'}):response()});assert.equal((await legacy(old)).status,'OK');assert.equal((await legacy(request)).providerRequests,0);
});
test('native generation HTTP failures retain current attempt and refresh only before a later401 attempt',async()=>{
 const request=nativeAdapterRequest();
 for(const code of [401,429,500]){let auth=0,generations=0;const run=createGeminiInference(m,{credential,fetchImpl:async url=>{if(url.includes('oauth2')){auth++;return Response.json({access_token:'UNIT_ONLY_SECRET',expires_in:3600});}generations++;return generations===1?new Response(null,{status:code}):response();}});
  const first=await run(request);assert.equal(first.status,'PROVIDER_ERROR');assert.equal(first.httpStatus,code);assert.equal(first.providerRequests,1);assert.equal(generations,1);assert.equal(auth,1);
  const later=await run(request);assert.equal(later.status,'OK');assert.equal(generations,2);assert.equal(auth,code===401?2:1);
 }
});
test('existing bounds reject full encoded native bodies and oversized history rather than truncate',()=>{
 const p=projectRuntime(m,a3.cases[0],'conversation','opaque-bound'),body=buildRequest(m,'conversation',p),n=Buffer.byteLength(JSON.stringify(body));
 assert.throws(()=>buildRequest({...m,bounds:{...m.bounds,totalBytes:n-1,totalTokenUpperBound:n-1}},'conversation',p),/TOTAL_BOUND/);
 const c=structuredClone(a3.cases[0]);c.runtime.history=Array.from({length:m.bounds.historyCount+1},()=>({role:'customer',text:'x'}));assert.throws(()=>projectRuntime(m,c,'conversation','bound'),/HISTORY_BOUND/);
 assert.throws(()=>buildRequest({...m,variant:undefined},'conversation',p),/NATIVE_DIALOGUE_PROVIDER/);
});
test('rehashing changed corpus/config/prompt or adopting native presentation into34 cannot authorize35',()=>{
 for(const change of [v=>{v.bounds.totalBytes++;},v=>{v.usability.maximumTerminalFailureRate=.15;},v=>{v.ownerAmendment={};},v=>{v.prompts.verifier+=' Changed';v.promptHashes.verifier=hash(v.prompts.verifier);},v=>{v.prompts.conversation+=' Changed';v.promptHashes.conversation=hash(v.prompts.conversation);}]){const v=structuredClone(m);change(v);assert.throws(()=>validateProtocol(v,a2,a3),/ROUND35_CONTROL|ROUND35_OWNER_PROMPT/);}
 const c=structuredClone(a2),v=structuredClone(m);c.cases[120].evaluator.reason='Unregistered';v.corpusHashes.a2=hash(JSON.stringify(c));assert.throws(()=>validateProtocol(v,c,a3),/ROUND35_POPULATION|ROUND35_CONTROL/);
 assert.throws(()=>validateProtocol({...control,conversationContextFormat:m.conversationContextFormat},a2,a3),/UNREGISTERED_CONTEXT_PRESENTATION/);
});
