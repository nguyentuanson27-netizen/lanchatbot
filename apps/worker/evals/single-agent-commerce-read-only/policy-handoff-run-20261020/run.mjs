// Evaluation only: reuse the real handoff transaction and code-owned holding reply.
// No Meta/Pancake socket: the only delivery adapter below captures synthetic recipients.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {PostgresRuntimePolicyStore,PostgresRealtimeRuntimeStore,PostgresRealtimeInboxStore,LocalEnvelopeCipher,withTransaction} from '@lana/database';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {createConversationState} from '@lana/conversation-engine';
import {MetaDeliveryAdapter} from '@lana/meta-delivery';
import {MetaOutboxDispatcher,SinglePageMetaTokenRegistry} from '../../../dist/meta-outbox-dispatcher.js';
import {createCommerceTools} from '../../../dist/single-agent-commerce.js';
import {runCommerceTurn} from '../../../dist/single-agent-commerce-read-only.js';
import {createPersistedCommerceHandoffPort} from '../../../dist/single-agent-commerce-persistence.js';
import {publicPolicyLiteral,commerceHash} from '../../../dist/single-agent-commerce-read-only-context.js';
import {createGeminiCommerceInference,buildGeminiCommerceRequest} from '../gemini-inference.mjs';
import {createCommerceVerifier,buildVerifierRequest,sha256,runtimeCase} from '../protocol.mjs';
import {statefulPreflight} from '../stateful-provider.mjs';

const root=fileURLToPath(new URL('../../../../../',import.meta.url));
const frozen=JSON.parse(readFileSync(new URL('./REGISTRATION.json',import.meta.url)));
const bytes=readFileSync(new URL('./inputs.json',import.meta.url)),cases=JSON.parse(bytes);
assert.equal(sha256(bytes),frozen.inputHash);assert.equal(cases.length,5);
const pf=statefulPreflight(root),{m,config}=pf;
assert.deepEqual(m.models,frozen.models);assert.deepEqual(m.promptHashes,frozen.promptHashes);
const out=resolve(process.argv[2]);mkdirSync(out);
const sourceSha=pf.registration.sourceSha;
const report={sourceSha,registeredSlots:5,maximumGenerationRequests:20,mode:frozen.mode,sendEnabled:false,
 providerGenerations:0,completedSlots:0,testDatabaseCreated:false,testDatabaseDropped:false,outcomes:[]};
const save=()=>writeFileSync(resolve(out,'integration.json'),JSON.stringify(report,null,2)+'\n');
const audit=(id,phase,value)=>appendFileSync(resolve(out,'requests.jsonl'),JSON.stringify({id,phase,value})+'\n');
const policyStore=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL??process.env.DATABASE_URL);
const resolver=new RuntimePolicyResolver(policyStore,{enabled:true,publishedEnabled:config.channel==='PUBLISHED'});
const policy=async()=>{
 resolver.invalidate(config.scope.pageId,config.channel);
 const now=new Date(),r=await resolver.resolve({pageId:config.scope.pageId,channel:config.channel,now});
 assert.equal(r.status,'RESOLVED');assert(r.bundle);
 const source={policy:publicPolicyLiteral(r.bundle,config.scope.pageId,config.scope.shopId,now),matrix:r.bundle.artifacts.handoffMatrix??null};
 assert.equal(commerceHash(source),frozen.sourceProjectionHash,'POLICY_CHANGED_SINCE_FREEZE');return r;
};
let admin,pool,runtime,inbox,databaseName,created=false;
try{
 const first=await policy();
 writeFileSync(resolve(out,'RUN_SOURCE.json'),JSON.stringify({runSourceSha:sourceSha,...frozen,codex:pf.registration.codex},null,2)+'\n');
 if(process.argv.includes('--preflight')){report.status='PREFLIGHT_PASS';save();}
 else{
  const {Pool}=createRequire(new URL('../../../../../packages/database/package.json',import.meta.url))('pg');
  const adminUrl=process.env.C3_B_TEST_ADMIN_DATABASE_URL;assert(adminUrl,'C3_B_TEST_ADMIN_DATABASE_URL');
  admin=new Pool({connectionString:adminUrl,max:1});databaseName='c3_b_test_'+randomBytes(8).toString('hex');
  assert(/^c3_b_test_[a-f0-9]{16}$/.test(databaseName));
  await admin.query('CREATE DATABASE '+databaseName);created=true;report.testDatabaseCreated=true;report.testDatabase=databaseName;
  const testUrl=new URL(adminUrl);testUrl.pathname='/'+databaseName;pool=new Pool({connectionString:testUrl.toString(),max:4});
  assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,databaseName);
  const migrationRoot=resolve(root,'packages/database/migrations');
  for(const name of readdirSync(migrationRoot).filter(n=>n.endsWith('.up.sql')&&n<'0034').sort()){
   const sql=readFileSync(resolve(migrationRoot,name),'utf8');assert(!/\b(?:CREATE|ALTER)\s+ROLE|\bALTER\s+SYSTEM/i.test(sql));await pool.query(sql);
  }
  runtime=new PostgresRealtimeRuntimeStore(testUrl.toString(),new LocalEnvelopeCipher(randomBytes(32).toString('hex'),'handoff-test'),3);
  inbox=new PostgresRealtimeInboxStore(testUrl.toString(),new LocalEnvelopeCipher(randomBytes(32).toString('hex'),'handoff-inbox-test'),{customerDebounceMs:1000,maxPoolSize:2});
  const pageId=config.scope.pageId;
  await pool.query("INSERT INTO pages(page_id,page_alias,meta_app_id,routing_owner,app_send_enabled,kill_switch) VALUES($1,'handoff-isolated','synthetic','APP',true,false)",[pageId]);
  const infer=createGeminiCommerceInference({model:m.models.conversation.model,effort:m.models.conversation.effort,location:'global',projectId:config.vertex.projectId});
  const verify=createCommerceVerifier(m,undefined,(id,v)=>audit(id,v.phase,v.provider));
  const ownerPrompt=readFileSync(new URL('../prompts/owner.vi.txt',import.meta.url),'utf8'),verifierPrompt=readFileSync(new URL('../prompts/verifier.vi.txt',import.meta.url),'utf8');
  for(const [index,c] of cases.entries()){
   const started=performance.now(),question=runtimeCase(c),at=new Date(),customerHash=commerceHash(randomUUID());
   const row=await runtime.loadOrCreate(pageId,customerHash,'APP',conversationId=>createConversationState({conversationId,routingOwner:'APP',now:at}),at);
   const recipient='synthetic-handoff-'+customerHash,id='handoff-'+randomUUID();
   await runtime.linkProviderConversation(pageId,row.conversationId,'PANCAKE','synthetic-'+randomUUID(),at,new Date(at.getTime()+3600000));
   await inbox.enqueue({pageId,metaAppId:'synthetic',eventKey:id,providerMessageId:id,conversationHash:customerHash,occurredAt:at,receivedAt:at,signatureKeyVersion:'synthetic',envelope:{synthetic:true}});
   await pool.query('UPDATE conversation_ingress_heads SET quiet_until=now() WHERE page_id=$1 AND conversation_hash=$2',[pageId,customerHash]);
   const batch=await inbox.claimNextBatch('handoff-model',300000);assert(batch&&batch.conversationHash===customerHash,'CURRENT_BATCH');
   const scope={pageId,shopId:first.bundle.policy.shopId,shopAlias:'LANA',conversationId:row.conversationId,customerHash,sourceMessageId:id,sourceObservedAt:at.toISOString(),requestId:id,
    recipient:commerceHash(recipient),bindingVersion:'handoff-model:'+batch.generation,revision:row.stateVersion,conversationOwner:'BOT',permission:true,privacyAllowed:true};
   const read=async()=>{const r=await runtime.loadOrCreate(pageId,customerHash,'APP',()=>{throw new Error('EXISTING_REQUIRED');});
    return {...scope,fence:batch.generation,stateVersion:r.stateVersion,state:r.state,permission:r.state.conversationOwner==='BOT'};};
   const port=createPersistedCommerceHandoffPort({scope,clock:()=>new Date(),read,store:runtime,transaction:fn=>withTransaction(pool,fn),deliveryRecipient:recipient,
    inboxBatchGuard:{generation:batch.generation,leaseToken:batch.leaseToken,inboxIds:batch.inboxIds},resolveTagId:()=> 'synthetic-tag'});
   const tools=await createCommerceTools({read:{scope,clock:()=>new Date(),policy,catalog:{readProduct:async()=>{throw new Error('PRODUCT_NOT_IN_POLICY_SCOPE');},searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}},
    handoff:{...port,policy:async()=>(await policy()).bundle}});
   const calls=[];
   const tracedTools={...tools,async invokeBatch(batchCalls){const result=await tools.invokeBatch(batchCalls);calls.push({calls:batchCalls,results:result});audit(id,'TOOL_RESULT',{calls:batchCalls,results:result});return result;}};
   const actualCapturedMessages=[];
   const dispatcher=new MetaOutboxDispatcher(runtime,new MetaDeliveryAdapter({request:async r=>{
    const body=JSON.parse(r.body);assert.equal(body.recipient.id,recipient);actualCapturedMessages.push(body.message.text);
    return {status:200,headers:{},body:{recipient_id:recipient,message_id:'captured-'+randomUUID()}};}},{sendEnabled:true}),
    new SinglePageMetaTokenRegistry(pageId,'synthetic-token'),{authorize:async()=>({status:'ALLOWED',reasonCode:null,blockingTag:null,observedAt:new Date()})},{workerId:'handoff-capture'});
   let result;
   try{result=await runCommerceTurn({scope,latest:question.latest,history:question.history,ownerPrompt,verifierPrompt,tools:tracedTools,clock:()=>new Date(),
    owner:async r=>{
     assert(report.providerGenerations<20);const wire=buildGeminiCommerceRequest(r);
     assert(!/"(?:caseId|evaluator|purpose|requiredBehaviors|expectedSafe|qualityScore)"/.test(JSON.stringify(wire)),'LABEL_LEAK');
     audit(r.generationId,'OWNER_REQUEST',wire);report.providerGenerations++;save();
     try{const answer=await infer(r);audit(r.generationId,'OWNER_RESULT',answer);return answer;}
     catch(error){audit(r.generationId,'OWNER_ERROR',{code:error.message,telemetry:error.telemetry??null});throw error;}
    },verifier:async r=>{
     assert(report.providerGenerations<20);audit(r.generationId,'VERIFIER_REQUEST',buildVerifierRequest(m,r));report.providerGenerations++;save();return verify(r);
    }});
    if(result.terminal.disposition==='HANDOFF')for(let n=0;n<5&&await dispatcher.processOne();n++);
    else await inbox.completeBatch(batch);
   }catch(error){result={terminal:{disposition:'NO_SEND',reason:'ATTEMPT_UNAVAILABLE',text:null},errorCode:/^[A-Z0-9_]{1,128}$/.test(error.message)?error.message:error.name};}
   const after=await read();
   const counts=(await pool.query('SELECT (SELECT count(*)::int FROM handoff_events WHERE conversation_id=$1) AS events,(SELECT count(*)::int FROM pancake_tag_outbox WHERE conversation_id=$1) AS tags,(SELECT count(*)::int FROM meta_outbox WHERE conversation_id=$1) AS messages',[scope.conversationId])).rows[0];
   const record={caseId:c.caseId,runtime:question,result,calls,actualCapturedMessages,eligibleText:result.terminal.disposition==='SEND_ELIGIBLE'?result.terminal.text:null,
    committedPublicState:{conversationOwner:after.state.conversationOwner,revision:after.stateVersion},counts,elapsedMs:performance.now()-started,sendEnabled:false};
   writeFileSync(resolve(out,'attempt-'+(index+1)+'.json'),JSON.stringify(record,null,2)+'\n');
   report.outcomes.push({caseId:c.caseId,disposition:result.terminal.disposition,owner:after.state.conversationOwner,captured:actualCapturedMessages.length});report.completedSlots++;save();
  }
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceSha,'SOURCE_CHANGED');
  report.status='COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW';save();
 }
}catch(error){report.status='BLOCKED';report.errorCode=/^[A-Z0-9_]{1,128}$/.test(error.message)?error.message:error.name;save();console.error(report.errorCode);process.exitCode=1;}
finally{
 await Promise.allSettled([runtime?.close(),inbox?.close(),pool?.end(),policyStore.close()]);
 if(created){assert(/^c3_b_test_[a-f0-9]{16}$/.test(databaseName));await admin.query('DROP DATABASE '+databaseName);report.testDatabaseDropped=true;save();}
 await admin?.end();
}
