// Real PostgreSQL, synthetic customer/product input, current captured policy. Never a provider/live-effect run.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {PostgresRealtimeRuntimeStore,PostgresRealtimeInboxStore,PostgresRuntimePolicyStore,LocalEnvelopeCipher,withTransaction} from '@lana/database';
import {createSalesCycleRuntimeState,applySalesCycleCommand,executePersistedSalesCycleCommand,RuntimePolicyResolver,buildPurchaseConfirmedTagCommand} from '@lana/chat-runtime';
import {buildCanonicalDecisionEvidenceV1} from '@lana/business-tools';
import {createRealtimeCustomerStatePort,createCustomerStateTools} from '../../dist/single-agent-commerce-state.js';
import {createCommerceEffectTools} from '../../dist/single-agent-commerce-effects.js';
import {createPersistedCommerceRepository,prepareNativeCommerceTransition,createPersistedCommerceReceiptReader} from '../../dist/single-agent-commerce-persistence.js';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {evaluateRealtimeSalesCycle} from '../../dist/realtime-sales-cycle.js';
import {fixtureProfile,fixtureProduct,fixturePolicy,fixtureSizeInput,fixtureCartLine} from '../../dist/single-agent-commerce.test-support.js';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const {Pool}=createRequire(new URL('../../../../packages/database/package.json',import.meta.url))('pg');
const out=process.argv[2];assert(out,'NEW_EVIDENCE_DIRECTORY_REQUIRED');mkdirSync(resolve(out));
const paymentMethod=process.argv[3]??'COD';assert(['COD','BANK_TRANSFER'].includes(paymentMethod));
const report={sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
 sourceDirty:!!execFileSync('git',['status','--porcelain','--','apps/worker/src','apps/worker/evals/single-agent-commerce-read-only','packages'],{cwd:root,encoding:'utf8'}).trim(),
 mode:'REAL_POSTGRES_SYNTHETIC_DOMAIN_INPUTS_CURRENT_POLICY_CAPTURE',paymentMethod,sendEnabled:false,providerGenerations:0,cases:[],testDatabaseDropped:false};
const save=()=>writeFileSync(resolve(out,'integration.json'),JSON.stringify(report,null,2));
const check=async(name,fn)=>{try{await fn();report.cases.push({name,status:'PASS'});save();console.log(name+': PASS');}
 catch(error){report.cases.push({name,status:'FAIL',error:error.message});save();throw error;}};
const adminUrl=process.env.C3_B_TEST_ADMIN_DATABASE_URL;assert(adminUrl,'C3_B_TEST_ADMIN_DATABASE_URL');
const databaseName='c3_b_test_'+randomBytes(8).toString('hex');
assert(/^c3_b_test_[a-f0-9]{16}$/.test(databaseName));
const admin=new Pool({connectionString:adminUrl,max:1}),testUrl=new URL(adminUrl);testUrl.pathname='/'+databaseName;
let pool,runtime,inbox,policyStore,livePolicyStore,created=false;
try{
 await admin.query('CREATE DATABASE '+databaseName);created=true;
 pool=new Pool({connectionString:testUrl.toString(),max:4});
 assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,databaseName);
 const migrationRoot=resolve(root,'packages/database/migrations');
 const files=readdirSync(migrationRoot).filter(n=>n.endsWith('.up.sql')&&n<'0034').sort();
 for(const name of files){const sql=readFileSync(resolve(migrationRoot,name),'utf8');
  assert(!/\b(?:CREATE|ALTER)\s+ROLE|\bALTER\s+SYSTEM/i.test(sql),'CLUSTER_DDL_FORBIDDEN');await pool.query(sql);}
 report.schemaFiles=files;report.testDatabase=databaseName;save();
 const cipher=new LocalEnvelopeCipher(randomBytes(32).toString('hex'),'c3-b-test-only');
 runtime=new PostgresRealtimeRuntimeStore(testUrl.toString(),cipher,3);
 inbox=new PostgresRealtimeInboxStore(testUrl.toString(),cipher,{customerDebounceMs:1000,maxPoolSize:2});
 const pageId='1198992073286645';
 await pool.query("INSERT INTO pages (page_id,page_alias,meta_app_id,routing_owner,app_send_enabled,kill_switch) VALUES ($1,'c3-b-isolated','synthetic','APP',false,true)",[pageId]);
 let now=new Date(),scope={pageId,shopId:'LANA_DESIGN',shopAlias:'LANA',conversationId:randomUUID(),customerHash:createHash('sha256').update(randomUUID()).digest('hex'),
  sourceMessageId:'b2-initial',sourceObservedAt:now.toISOString(),requestId:'b2-initial',recipient:'a'.repeat(64),bindingVersion:'b2-binding',revision:1,
  conversationOwner:'BOT',permission:true,privacyAllowed:true};
 const createProfile=()=>{const f=fixtureProfile();f.profile.profileId=randomUUID();f.profile.customerKey.digest=scope.customerHash;
  f.profile.measurements=[];f.profile.createdAt=now.toISOString();f.profile.updatedAt=now.toISOString();return f;};
 let profileId;
 const statePort=createRealtimeCustomerStatePort(runtime,scope,createProfile,()=>now);
 const base=()=>{const f=fixtureProduct('QU714');return createReadOnlyTools({scope,clock:()=>now,policy:()=>fixturePolicy(),initialProducts:[f.product],
  catalog:{readProduct:async()=>f,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});};
 const stateTools=()=>createCustomerStateTools({base:base(),scope,store:statePort,clock:()=>now,sizeInput:async()=>fixtureSizeInput()});
 await check('B2 real profile persists across turns and correction precedes dependent size',async()=>{
  for(const [index,waist,hips,size] of [[0,85,105,'L'],[1,75,95,'M']]){
   now=new Date(now.getTime()+1000);scope.sourceMessageId='b2-'+index;scope.sourceObservedAt=now.toISOString();
   const t=await stateTools(),before=await statePort.read();if(profileId)assert.equal(before.profile.profileId,profileId);else profileId=before.profile.profileId;
   const results=await t.invokeBatch([{name:'recommend_size',args:{subjectRef:'QU714'}},{name:'apply_customer_state',args:{ops:[
    {op:'SET',field:'measurements.WAIST_CM',value:waist},{op:'SET',field:'measurements.HIPS_CM',value:hips}]}}]);
   assert.equal(results[0].status,'OK');assert.equal(results[0].data.recommendedSizes[0].size,size);
   assert.equal((await statePort.read()).profile.revision,index+2);
  }
 });
 await check('B2 stale writer loses CAS and CLEAR removes old fit',async()=>{
  const previous=await statePort.read();assert.equal(await statePort.compareAndSwap(1,{...previous,profile:{...previous.profile,revision:2}}),false);
  now=new Date(now.getTime()+1000);scope.sourceObservedAt=now.toISOString();scope.sourceMessageId='b2-clear';
  const t=await stateTools();assert.equal((await t.invoke({name:'apply_customer_state',args:{ops:[{op:'CLEAR',field:'measurements.HIPS_CM'}]}})).status,'OK');
  const result=await t.invoke({name:'recommend_size',args:{subjectRef:'QU714'}});assert.notEqual(result.data.status,'RECOMMENDED');
  assert(!t.snapshot().protectedClaims.some(c=>c.type==='SIZE_FIT'));
 });
 await check('B2 preference replace and expired profile cannot be updated',async()=>{
  now=new Date(now.getTime()+1000);scope.sourceObservedAt=now.toISOString();scope.sourceMessageId='b2-preference';
  const t=await stateTools();assert.equal((await t.invoke({name:'apply_customer_state',args:{ops:[{op:'REPLACE',field:'preferences.colors',value:['navy']}]}})).status,'OK');
  const p=await statePort.read();assert.deepEqual(p.profile.preferences.colors,['navy']);
  const afterExpiry=new Date(now.getTime()+49*3600000);
  assert.equal(await runtime.compareAndSwapCustomerProfile(pageId,scope.customerHash,p.profile.revision,
   {revision:p.profile.revision+1,profile:{...p.profile,revision:p.profile.revision+1},fieldEvidence:p.fieldEvidence},afterExpiry),false);
 });
 now=new Date();scope={...scope,customerHash:createHash('sha256').update(randomUUID()).digest('hex'),sourceObservedAt:now.toISOString()};
 const record=await runtime.loadOrCreate(pageId,scope.customerHash,'APP',conversationId=>({revision:0,conversationId,routingOwner:'APP',conversationOwner:'BOT'}),now);
 scope.conversationId=record.conversationId;scope.revision=record.stateVersion;
 const key=scope.conversationId;
 await runtime.loadOrCreateSalesCycle(pageId,key,()=>createSalesCycleRuntimeState(key,{pageId,conversationId:key},now),now);
 livePolicyStore=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL);
 const records=await livePolicyStore.loadActivePointers({pageId,channel:'PUBLISHED'});
 for(const r of records){const v=r.version,p=r.pointer;
  await pool.query('INSERT INTO admin_artifact_versions (version_id,artifact_key,artifact_kind,version_number,lifecycle,revision,content_hash,content,created_by_subject,updated_by_subject,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11)',
   [v.versionId,v.artifactKey,v.artifactKind,v.versionNumber,v.lifecycle,v.revision,v.contentHash,v.content,v.createdBy,v.createdAt,v.updatedAt]);
  await pool.query('INSERT INTO admin_active_pointers (pointer_id,artifact_key,artifact_kind,page_id,channel,version_id,revision,updated_by_subject,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
   [p.pointerId,p.artifactKey,p.artifactKind,p.pageId,p.channel,p.versionId,p.revision,p.updatedBy,p.updatedAt]);
 }
 policyStore=new PostgresRuntimePolicyStore(testUrl.toString());
 const resolver=new RuntimePolicyResolver(policyStore,{enabled:true,publishedEnabled:true},policyStore);
 const policyResolution=await resolver.resolve({pageId,channel:'PUBLISHED',pin:{scopeType:'SALES_EPISODE',scopeId:key},now});
 assert(policyResolution.bundle,'CAPTURED_POLICY_UNAVAILABLE');scope.shopId=policyResolution.bundle.policy.shopId;
 report.policyBundleHash=policyResolution.bundle.bundleHash;
 let activePrepared;
 const repository=createPersistedCommerceRepository({store:runtime,transaction:fn=>withTransaction(pool,fn),conversationKey:key,pageId,conversationId:key,
  customerHash:scope.customerHash,clock:()=>new Date(),prepare:async update=>{
   if(activePrepared)return activePrepared;
   const current=await runtime.loadOrCreate(pageId,scope.customerHash,'APP',()=>{throw new Error('EXISTING_CONVERSATION_REQUIRED');});
   const prior=await repository.read(key),command=update.nextState.processedCommandIds.at(-1);
   return {pageId,customerHash:scope.customerHash,conversationId:key,expectedStateVersion:current.stateVersion,
    state:{...current.state,revision:current.stateVersion+1},inboxBatchGuard:lease,
    salesCyclePlan:{expectedRevision:update.expectedRevision,state:update.nextState,cartExpiresAt:null,expiresAt:new Date(Date.now()+48*3600000),
     readinessContractVersion:'DF06_EFFECT_READINESS_V1',sourceMessageIdHash:hash(scope.sourceMessageId),canonicalBuyingIntent:intent(),
     events:[{commandId:command,commandKind:command,outcome:'APPLIED',stateRevisionBefore:prior.revision,stateRevisionAfter:update.nextState.revision,
      stageBefore:prior.stage,stageAfter:update.nextState.stage,cartId:null,cartVersion:null,reasonCode:null,occurredAt:new Date(update.nextState.updatedAt)}]}};
  }});
 const hash=s=>createHash('sha256').update(s).digest('hex');let lease,latest='';
 const intent=(requestedAction=null,quantity=null)=>buildCanonicalDecisionEvidenceV1({text:latest,sourceMessageId:scope.sourceMessageId,productId:'SM613',evaluatedAt:new Date(),
  ...(requestedAction?{modelBuyingIntent:{decision:'COMMITTED',requestedAction,quantity,evidenceText:latest,confidence:1}}:{})}).buyingIntent;
 async function message(text){latest=text;now=new Date();scope.sourceMessageId='c3-b-'+randomUUID();scope.sourceObservedAt=now.toISOString();scope.requestId=scope.sourceMessageId;
  await inbox.enqueue({pageId,metaAppId:'synthetic',eventKey:scope.sourceMessageId,providerMessageId:scope.sourceMessageId,conversationHash:scope.customerHash,
   occurredAt:now,receivedAt:now,signatureKeyVersion:'isolated-test',envelope:{synthetic:true}});
  await pool.query('UPDATE conversation_ingress_heads SET quiet_until=now() WHERE page_id=$1 AND conversation_hash=$2',[pageId,scope.customerHash]);
  const batch=await inbox.claimNextBatch('c3-b-integration',60000);assert(batch,'SOURCE_LEASE_REQUIRED');
  lease={generation:batch.generation,leaseToken:batch.leaseToken,inboxIds:batch.inboxIds};
  scope.bindingVersion='c3-b-runtime:'+batch.generation;
  scope.revision=(await runtime.loadOrCreate(pageId,scope.customerHash,'APP',()=>null)).stateVersion;
 }
 await check('B3 accepted prior stages persist through current inbox transaction',async()=>{
  for(const kind of ['FACTS_PRESENTED','MEASUREMENTS_REQUIRED','SIZE_RECOMMENDED']){
   await message('Thông tin của lượt thử nghiệm đã được chấp nhận.');
   const r=await executePersistedSalesCycleCommand({repository,conversationKey:key,command:{kind,commandId:kind},now:new Date()});assert.equal(r.status,'APPLIED');
  }
 });
 const sourceAt=new Date(Date.now()-60000).toISOString(),sourceExpiresAt=new Date(Date.parse(sourceAt)+172800000).toISOString();
 const selected=query=>{const line=fixtureCartLine();line.priceAuthority.shopId=scope.shopId;line.priceAuthority.priceFactRef='synthetic-pos-v1';line.priceAuthority.metadata.sourceVersion='synthetic-pos-v1';line.priceAuthority.metadata.observedAt=sourceAt;line.priceAuthority.metadata.expiresAt=sourceExpiresAt;
  line.lineId=query.lineId??line.lineId;line.quantity=query.quantity;line.lineTotalVnd=line.posUnitPriceVnd*line.quantity;
  return {status:'READY',line,shopId:scope.shopId,versions:{price:'synthetic-pos-v1',inventory:'synthetic-stock-v1',size:'synthetic-size-v1',eta:query.deliveryAddress?'synthetic-eta-v1':null},
   eta:query.deliveryAddress?{minDays:3,maxDays:6}:null,etaExpiresAt:query.deliveryAddress?new Date(Date.now()+1200000).toISOString():null,
   sourceAuthority:'POS_SNAPSHOT',stockStatus:'IN_STOCK',stockAvailableQuantity:10,sourceObservedAt:sourceAt,sourceExpiresAt};};
 const identities={cartId:randomUUID(),salesEpisodeId:randomUUID(),customerProfileId:randomUUID()};
 let lastResult,failAfterCommit=false,activePaymentMessageCount=0;
 async function persistOutput(output,before,current,effects){
  if(effects.paymentMessageIntent)activePaymentMessageCount=output.messages.length;
  const transfer=output.transferToHuman;
  activePrepared={pageId,conversationId:key,customerHash:scope.customerHash,expectedStateVersion:current.stateVersion,
   state:{...current.state,revision:current.stateVersion+1,...(transfer?{conversationOwner:'HUMAN',blockingTag:'NHAN_VIEN',ownerLeaseUntil:new Date(Date.now()+3600000).toISOString()}:{} )},
   inboxBatchGuard:lease,salesCyclePlan:output.plan,
   ...(transfer?{pancakeTagPlan:{desiredTag:output.desiredTag,tagId:'synthetic-tag',handoffGeneration:1},handoffEventPlan:{source:'BOT_POLICY',reasonCode:'PURCHASE_CONFIRMED',
    productId:'SM613',factsStatus:'OK',factsReasonCode:null,desiredTag:'NHAN_VIEN',handoffGeneration:1,triggerEventKey:scope.sourceMessageId,triggerMessagePk:null,occurredAt:new Date()}}:{}),
   ...(effects.paymentMessageIntent?{metaPlan:{replyPlanId:randomUUID(),responseGroupId:randomUUID(),recipientId:'synthetic-no-send-recipient',messages:output.messages,
    sourceMessageIdHash:hash(scope.sourceMessageId),protectedClaimTypes:output.protectedOutbound.claimTypes,effectReadiness:output.protectedOutbound.readiness,
    protectedClaims:output.protectedOutbound.claims,sendAfterOwnerHandoff:true}}:{})};
  try{assert(await repository.compareAndSwap({conversationKey:key,expectedRevision:before.revision,nextState:output.plan.state,effects}));}
  catch(error){report.transactionDiagnostic={error:error.message};save();throw error;}
  finally{activePrepared=undefined;}
 }
 const noEffects={pancakeTagCommand:null,transferToHuman:false,paymentMessageIntent:null,handoffDecision:null,confirmation:null};
 async function execute(commandInput){
  const before=await repository.read(key),current=await runtime.loadOrCreate(pageId,scope.customerHash,'APP',()=>null);
  assert.equal(before.revision,commandInput.expectedRevision);
  assert.equal(current.stateVersion,commandInput.conversationRevision);
  const command=commandInput.command;
  const output=await prepareNativeCommerceTransition({command,trustedPorts:commandInput.trustedPorts,source:{pageId,conversationId:key,customerHash:scope.customerHash,state:before,stateRevision:before.revision,
   conversationRevision:current.stateVersion,text:latest,messageId:scope.sourceMessageId,eventKey:scope.sourceMessageId,senderId:'synthetic',occurredAt:scope.sourceObservedAt,
   attachmentIds:[],productId:'SM613',offerType:'DIRECT',size:'M',color:'navy',shopAlias:'LANA',policyResolution,
   facts:{ready:async()=>true,close:async()=>{},resolve:async()=>{throw new Error('NOT_EXPOSED');},resolveCartSelection:async q=>selected(q)},now:new Date(),effectNow:()=>new Date(),
  }});
  if(!output.plan){const diagnostic=applySalesCycleCommand({state:before,expectedRevision:before.revision,command,now:new Date(),trustedPorts:commandInput.trustedPorts});
   report.domainDiagnostic={planner:output.reasonCode,directStatus:diagnostic.status,directReason:diagnostic.reasonCode};save();
   return {status:'REJECTED',state:before,reasonCode:output.reasonCode??'PLAN_UNAVAILABLE'};}
  await persistOutput(output,before,current,output.transferToHuman?{
   pancakeTagCommand:buildPurchaseConfirmedTagCommand({pageId,conversationId:key,confirmation:output.plan.state.confirmation}),transferToHuman:true,
   confirmation:output.plan.state.confirmation,handoffDecision:null,paymentMessageIntent:paymentMethod==='BANK_TRANSFER'?{idempotencyKey:'synthetic-payment-intent'}:null}:noEffects);
  lastResult={status:'APPLIED',state:output.plan.state};if(failAfterCommit)throw new Error('CONTROLLED_LOST_COMMIT_RESPONSE');return lastResult;
 }
 const effects=async()=>{const f=fixtureProduct();return createCommerceEffectTools({scope,clock:()=>new Date(),conversationKey:key,repository,
  base:createReadOnlyTools({scope,clock:()=>new Date(),initialProducts:[f.product],policy:async()=>policyResolution,catalog:{readProduct:async()=>f,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}}),
  identity:identities,authorize:async()=>true,policy:async()=>policyResolution.bundle,select:async q=>selected(q),executeCommand:execute,
  readReceipt:createPersistedCommerceReceiptReader({store:runtime,repository,scope,conversationKey:key}),
  readAuthority:async()=>{const current=await runtime.loadOrCreate(pageId,scope.customerHash,'APP',()=>null);
   const head=await pool.query('SELECT generation FROM conversation_ingress_heads WHERE page_id=$1 AND conversation_hash=$2',[pageId,scope.customerHash]);
   return {revision:current.stateVersion,recipient:scope.recipient,bindingVersion:'c3-b-runtime:'+head.rows[0].generation,
    privacyAllowed:true,permission:current.state.conversationOwner==='BOT',conversationOwner:current.state.conversationOwner};}});};
 await check('B3 native cart commits once; duplicate does not repeat database transaction',async()=>{
  await message('Chị lấy mẫu SM613 size M màu navy');const t=await effects();const call={name:'add_to_cart',args:{subjectRef:'SM613',size:'M',color:'navy',quantity:1}};
  const result=await t.invoke(call);assert.equal(result.status,'OK',JSON.stringify(result));const revision=(await repository.read(key)).revision;
  assert.equal((await t.invoke(call)).status,'OK');assert.equal((await repository.read(key)).revision,revision);assert.equal(t.snapshot().effectReceipts.length,1);
  const fresh=await effects();assert.equal((await fresh.invoke(call)).status,'OK');assert.equal(fresh.snapshot().effectReceipts[0].effect,'CART_OPENED');
  assert.equal((await repository.read(key)).revision,revision);
  report.cartReceipt={operationId:t.snapshot().effectReceipts[0].operationId,stateRevision:revision};
 });
 await check('B3 native quantity change persists, unknown commit reconciles without replay',async()=>{
  await message('Chị lấy 2 bộ SM613 nhé');const t=await effects(),line=(await repository.read(key)).cart.value.lines[0];failAfterCommit=true;
  const r=await t.invoke({name:'change_cart_item',args:{subjectRef:line.lineId,action:'SET_QUANTITY',quantity:2}});failAfterCommit=false;
  assert.equal(r.status,'OK',JSON.stringify(r));assert.equal((await repository.read(key)).cart.value.lines[0].quantity,2);
  assert.equal((await t.recover({disposition:'FALLBACK',reason:'CONTROLLED_PROVIDER_FAILURE',text:null,fallbackId:null})).reason,'RECEIPT_BACKED_ACK');
 });
 await check('B3 newer inbox generation prevents an old tool from mutating the cart',async()=>{
  await message('Chị lấy 3 bộ SM613');const t=await effects(),prior=await repository.read(key);
  await inbox.enqueue({pageId,metaAppId:'synthetic',eventKey:'newer-'+randomUUID(),providerMessageId:'newer-'+randomUUID(),conversationHash:scope.customerHash,
   occurredAt:new Date(),receivedAt:new Date(),signatureKeyVersion:'isolated-test',envelope:{synthetic:true}});
  assert.equal((await t.invoke({name:'change_cart_item',args:{subjectRef:prior.cart.value.lines[0].lineId,action:'SET_QUANTITY',quantity:3}})).status,'REJECTED');
  assert.equal((await repository.read(key)).revision,prior.revision);
  const current=await runtime.loadOrCreate(pageId,scope.customerHash,'APP',()=>null);
  const result=await runtime.commit({pageId,conversationId:key,customerHash:scope.customerHash,expectedStateVersion:current.stateVersion,
   state:{...current.state,revision:current.stateVersion+1},inboxBatchGuard:lease});
  assert.equal(result.inboxBatchStatus,'SUPERSEDED');assert.equal(result.stateCommitted,false);
 });
 await check('B3 private checkout creates a persisted preview without exposing PII to the model',async()=>{
  await message('Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\n'+(paymentMethod==='COD'?'COD':'chuyển khoản'));
  const before=await repository.read(key),current=await runtime.loadOrCreate(pageId,scope.customerHash,'APP',()=>null);
  const output=await evaluateRealtimeSalesCycle({pageId,conversationId:key,customerHash:scope.customerHash,state:before,stateRevision:before.revision,
   conversationRevision:current.stateVersion,text:latest,messageId:scope.sourceMessageId,eventKey:scope.sourceMessageId,senderId:'synthetic',occurredAt:scope.sourceObservedAt,
   attachmentIds:[],productId:'SM613',offerType:'DIRECT',size:'M',color:'navy',canonicalBuyingIntent:intent(),shopAlias:'LANA',policyResolution,
   facts:{ready:async()=>true,close:async()=>{},resolve:async()=>{throw new Error('NOT_EXPOSED');},resolveCartSelection:async q=>selected(q)},now:new Date(),effectNow:()=>new Date()});
  assert.equal(output.plan?.state.stage,'ORDER_PREVIEW',output.reasonCode);await persistOutput(output,before,current,noEffects);
  const t=await effects();assert(!JSON.stringify(t.snapshot()).includes('0900000000'));assert(!JSON.stringify(t.snapshot()).includes('Khách thử nghiệm'));
 });
 await check('B3 '+paymentMethod+' native confirmation commits state and effect intents atomically',async()=>{
  await runtime.linkProviderConversation(pageId,key,'PANCAKE','synthetic-conversation-no-delivery',new Date(),new Date(Date.now()+3600000));
  // These flags exist only in this disposable database; no worker is connected to deliver its outboxes.
  if(paymentMethod==='BANK_TRANSFER')await pool.query('UPDATE pages SET app_send_enabled=true,kill_switch=false WHERE page_id=$1',[pageId]);
  await message('Chốt đơn cho chị nhé');const t=await effects();const result=await t.invoke({name:'confirm_purchase',args:{}});
  assert.equal(result.status,'OK',JSON.stringify(result));assert.equal((await repository.read(key)).stage,'PURCHASE_CONFIRMED');
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM pancake_tag_outbox')).rows[0].n,1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM handoff_events')).rows[0].n,1);
  const paymentIntents=(await pool.query('SELECT count(*)::int AS n FROM meta_outbox')).rows[0].n;
  assert.equal(paymentIntents,paymentMethod==='BANK_TRANSFER'?activePaymentMessageCount:0);
  report.persistedPaymentIntents=paymentMethod==='BANK_TRANSFER'?1:0;report.persistedPaymentOutboxMessages=paymentIntents;
  assert.equal((await t.readback()).state.conversationOwner,'HUMAN');
 });
 report.status='PASS';save();
}catch(error){report.status='FAIL';report.errorType=error.name;report.error=error.message;save();console.error(error.stack);process.exitCode=1;}
finally{
 await Promise.allSettled([runtime?.close(),inbox?.close(),policyStore?.close(),livePolicyStore?.close(),pool?.end()]);
 if(created){assert(/^c3_b_test_[a-f0-9]{16}$/.test(databaseName));await admin.query('DROP DATABASE '+databaseName);report.testDatabaseDropped=true;save();}
 await admin.end();
}
