// Evaluation-only real PostgreSQL: synthetic inputs by default; explicit provider mode uses live public sources.
// Delivery is always an in-memory capture transport, never a live customer effect.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {PostgresRealtimeRuntimeStore,PostgresRealtimeInboxStore,PostgresRuntimePolicyStore,PostgresChatHistoryStore,LocalEnvelopeCipher,withTransaction,redactAnalyticsMessage} from '@lana/database';
import {MetaDeliveryAdapter} from '@lana/meta-delivery';
import {MetaOutboxDispatcher,SinglePageMetaTokenRegistry} from '../../dist/meta-outbox-dispatcher.js';
import {runPersistedCommerceIngress} from '../../dist/single-agent-commerce-ingress.js';
import {createSalesCycleRuntimeState,applySalesCycleCommand,executePersistedSalesCycleCommand,RuntimePolicyResolver,buildPurchaseConfirmedTagCommand} from '@lana/chat-runtime';
import {createConversationState} from '@lana/conversation-engine';
import {buildCanonicalDecisionEvidenceV1} from '@lana/business-tools';
import {createRealtimeCustomerStatePort,createCustomerStateTools} from '../../dist/single-agent-commerce-state.js';
import {createCommerceEffectTools} from '../../dist/single-agent-commerce-effects.js';
import {createPersistedCommerceRepository,prepareNativeCommerceTransition,createPersistedCommerceReceiptReader,createPersistedCommerceHandoffPort} from '../../dist/single-agent-commerce-persistence.js';
import {createCommerceTools} from '../../dist/single-agent-commerce.js';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {evaluateRealtimeSalesCycle} from '../../dist/realtime-sales-cycle.js';
import {fixtureProfile,fixtureProduct,fixturePolicy,fixtureSizeInput,fixtureCartLine} from '../../dist/single-agent-commerce.test-support.js';
import {statefulPreflight,createStatefulProvider} from './stateful-provider.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const providerRun=process.argv.includes('--provider-run'),providerPreflight=process.argv.includes('--provider-preflight');
const providerFreeze=providerRun||providerPreflight?statefulPreflight(root):null;
if(providerPreflight){console.log(JSON.stringify({status:'PREFLIGHT_PASS',...providerFreeze.registration,providerGenerations:0}));process.exit(0);}
const {Pool}=createRequire(new URL('../../../../packages/database/package.json',import.meta.url))('pg');
const out=process.argv[2];assert(out,'NEW_EVIDENCE_DIRECTORY_REQUIRED');mkdirSync(resolve(out));
const paymentMethod=process.argv[3]??'COD';assert(['COD','BANK_TRANSFER'].includes(paymentMethod));
const report={sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
 sourceDirty:!!execFileSync('git',['status','--porcelain','--','apps/worker/src','apps/worker/evals/single-agent-commerce-read-only','packages'],{cwd:root,encoding:'utf8'}).trim(),
 mode:providerRun?providerFreeze.registration.mode:'REAL_POSTGRES_SYNTHETIC_DOMAIN_INPUTS_CURRENT_POLICY_CAPTURE',paymentMethod,sendEnabled:false,providerGenerations:0,cases:[],testDatabaseDropped:false};
const save=()=>writeFileSync(resolve(out,'integration.json'),JSON.stringify(report,null,2));
const check=async(name,fn)=>{if(providerRun||(process.argv.includes('--composed-only')&&!name.startsWith('B composed')))return;
 try{await fn();report.cases.push({name,status:'PASS'});save();console.log(name+': PASS');}
 catch(error){report.cases.push({name,status:'FAIL',error:error.message});save();throw error;}};
const adminUrl=process.env.C3_B_TEST_ADMIN_DATABASE_URL;assert(adminUrl,'C3_B_TEST_ADMIN_DATABASE_URL');
const databaseName='c3_b_test_'+randomBytes(8).toString('hex');
assert(/^c3_b_test_[a-f0-9]{16}$/.test(databaseName));
const admin=new Pool({connectionString:adminUrl,max:1}),testUrl=new URL(adminUrl);testUrl.pathname='/'+databaseName;
let pool,runtime,inbox,policyStore,livePolicyStore,historyStore,providerPorts,created=false;
try{
 await admin.query('CREATE DATABASE '+databaseName);created=true;
 pool=new Pool({connectionString:testUrl.toString(),max:4});
 assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,databaseName);
 const migrationRoot=resolve(root,'packages/database/migrations');
 const files=readdirSync(migrationRoot).filter(n=>n.endsWith('.up.sql')&&n<'0034').sort();
 for(const name of files){const sql=readFileSync(resolve(migrationRoot,name),'utf8');
  assert(!/\b(?:CREATE|ALTER)\s+ROLE|\bALTER\s+SYSTEM/i.test(sql),'CLUSTER_DDL_FORBIDDEN');await pool.query(sql);}
 const clarificationMigration='0035_sales_cycle_clarification_commands',commandConstraint=async()=>(await pool.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='sales_cycle_events'::regclass AND conname='sales_cycle_events_command_kind_check'")).rows[0].definition;
 const originalCommandConstraint=await commandConstraint(),clarificationUp=readFileSync(resolve(migrationRoot,clarificationMigration+'.up.sql'),'utf8'),clarificationDown=readFileSync(resolve(migrationRoot,clarificationMigration+'.down.sql'),'utf8');
 await pool.query(clarificationUp);files.push(clarificationMigration+'.up.sql');
 await check('B composed existing clarification migration rolls back exactly before new events',async()=>{
  assert((await commandConstraint()).includes('CLARIFICATION_REQUESTED'));
  await pool.query(clarificationDown);assert.equal(await commandConstraint(),originalCommandConstraint);await pool.query(clarificationUp);
 });
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
 report.policyVersionReferences=policyResolution.bundle.versionReferences;
 let activePrepared;
 const repository=createPersistedCommerceRepository({store:runtime,transaction:fn=>withTransaction(pool,fn),conversationKey:key,pageId,conversationId:key,
  customerHash:scope.customerHash,clock:()=>new Date(),prepare:async update=>{
   if(activePrepared)return activePrepared;
   const current=await runtime.loadOrCreate(pageId,scope.customerHash,'APP',()=>{throw new Error('EXISTING_CONVERSATION_REQUIRED');});
   const prior=await repository.read(key),command=update.nextState.processedCommandIds.at(-1);
   return {pageId,customerHash:scope.customerHash,conversationId:key,expectedStateVersion:current.stateVersion,
    state:{...current.state,revision:current.stateVersion+1},inboxBatchGuard:lease,
    // A short synthetic retention stays within the server-owned48h maximum despite client/server clock skew.
    salesCyclePlan:{expectedRevision:update.expectedRevision,state:update.nextState,cartExpiresAt:null,expiresAt:new Date(Date.now()+3600000),
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
  lastResult={status:'APPLIED',state:output.plan.state,confirmation:output.plan.state.confirmation,paymentInstruction:null,
   desiredPancakeTag:output.desiredTag,transferToHuman:output.transferToHuman};
  if(failAfterCommit)throw new Error('CONTROLLED_LOST_COMMIT_RESPONSE');return lastResult;
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
  assert.equal((await t.terminalOutcome()).disposition,'HANDOFF');
 });
 // Positive holding-message controls need an enabled capture-only test page in both payment branches.
 await pool.query('UPDATE pages SET app_send_enabled=true,kill_switch=false WHERE page_id=$1',[pageId]);
 async function handoffFixture({link=true,supersede=false}={}){
  const at=new Date(),h={...scope,customerHash:hash(randomUUID()),sourceMessageId:'handoff-'+randomUUID(),sourceObservedAt:at.toISOString()};
  const row=await runtime.loadOrCreate(pageId,h.customerHash,'APP',conversationId=>createConversationState({conversationId,routingOwner:'APP',now:at}),at);
  h.conversationId=row.conversationId;h.revision=row.stateVersion;
  if(link)await runtime.linkProviderConversation(pageId,h.conversationId,'PANCAKE','synthetic-handoff-'+randomUUID(),at,new Date(at.getTime()+3600000));
  const enqueue=async eventKey=>{
   await inbox.enqueue({pageId,metaAppId:'synthetic',eventKey,providerMessageId:eventKey,conversationHash:h.customerHash,
    occurredAt:new Date(),receivedAt:new Date(),signatureKeyVersion:'isolated-test',envelope:{synthetic:true}});
   await pool.query('UPDATE conversation_ingress_heads SET quiet_until=now() WHERE page_id=$1 AND conversation_hash=$2',[pageId,h.customerHash]);
  };
  await enqueue(h.sourceMessageId);const batch=await inbox.claimNextBatch('c3-b-handoff',60000);assert(batch);
  h.bindingVersion='c3-b-handoff:'+batch.generation;
  h.fence=batch.generation; // Synthetic candidate lease domain; not a live COMMERCE actor-fence qualification.
  if(supersede)await enqueue('newer-'+randomUUID());
  const read=async()=>{const r=await runtime.loadOrCreate(pageId,h.customerHash,'APP',()=>{throw new Error('EXISTING_REQUIRED');});
   return {...h,stateVersion:r.stateVersion,state:r.state,permission:r.state.conversationOwner==='BOT'};};
  const port=createPersistedCommerceHandoffPort({scope:h,clock:()=>new Date(),read,store:runtime,transaction:async fn=>{
   try{return await withTransaction(pool,fn);}catch(error){report.directHandoffCommitDiagnostic=/^[A-Z0-9_]{1,128}$/.test(error.message)?error.message:error.name;save();throw error;}
  },deliveryRecipient:'synthetic-handoff-recipient',
   inboxBatchGuard:{generation:batch.generation,leaseToken:batch.leaseToken,inboxIds:batch.inboxIds},resolveTagId:()=> 'synthetic-handoff-tag'});
  const hp=structuredClone(policyResolution.bundle);
  // Synthetic HANDOFF_MATRIX in memory; current public policy is unchanged and never republished.
  hp.artifacts.handoffMatrix={schemaVersion:1,kind:'HANDOFF_MATRIX',sourceMetadata:hp.artifacts.shopPolicy.sourceMetadata,
   rules:[{reason:'EXCHANGE',customerMessagePolicy:'HOLDING_REPLY_THEN_HANDOFF',holdingReply:'Shop đã nhận yêu cầu đổi hàng của chị.',tag:'VAN_DON'},
    {reason:'CUSTOMER_REQUESTED_HUMAN',customerMessagePolicy:'SILENT_HANDOFF',holdingReply:null,tag:'NHAN_VIEN'}]};
  const tools=await createCommerceTools({read:{scope:h,clock:()=>new Date(),policy:async()=>({...policyResolution,bundle:hp}),
    catalog:{readProduct:async()=>{throw new Error('UNUSED');},searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}},
   handoff:{...port,policy:async()=>hp}});
  const counts=async()=>(await pool.query('SELECT (SELECT count(*)::int FROM handoff_events WHERE conversation_id=$1) AS events, (SELECT count(*)::int FROM pancake_tag_outbox WHERE conversation_id=$1) AS tags, (SELECT count(*)::int FROM meta_outbox WHERE conversation_id=$1) AS messages',[h.conversationId])).rows[0];
  return {h,tools,read,counts};
 }
 await check('B handoff matrix drives atomic ownership/event/tag and same-instance replay does not duplicate',async()=>{
  const h=await handoffFixture(),r=await h.tools.invoke({name:'request_handoff',args:{reason:'EXCHANGE'}});assert.equal(r.status,'OK',JSON.stringify(r));
  assert.equal((await h.read()).state.conversationOwner,'HUMAN');assert.deepEqual(await h.counts(),{events:1,tags:1,messages:1});
  assert.equal((await h.tools.terminalOutcome()).text,'Shop đã nhận yêu cầu đổi hàng của chị.');
  assert.equal((await h.tools.invoke({name:'request_handoff',args:{reason:'EXCHANGE'}})).status,'REJECTED');
  assert.deepEqual(await h.counts(),{events:1,tags:1,messages:1});
 });
 await check('B handoff missing provider link rolls back ownership/event and never acknowledges acceptance',async()=>{
  const h=await handoffFixture({link:false}),r=await h.tools.invoke({name:'request_handoff',args:{reason:'CUSTOMER_REQUESTED_HUMAN'}});
  assert.equal(r.status,'UNAVAILABLE');assert.equal((await h.read()).state.conversationOwner,'BOT');assert.deepEqual(await h.counts(),{events:0,tags:0,messages:0});
  assert.equal((await h.tools.terminalOutcome()).disposition,'NO_SEND');
 });
 await check('B handoff superseded inbound cannot commit using the earlier source lease',async()=>{
  const h=await handoffFixture({supersede:true});
  assert.equal((await h.tools.invoke({name:'request_handoff',args:{reason:'CUSTOMER_REQUESTED_HUMAN'}})).status,'REJECTED');
  assert.equal((await h.read()).state.conversationOwner,'BOT');assert.deepEqual(await h.counts(),{events:0,tags:0,messages:0});
 });
 // Full candidate composition uses the actual Inbox, history, profile, sales and Outbox stores.
 // Product/checkout/transport inputs here remain explicitly synthetic; no Meta/Pancake socket is opened.
 historyStore=new PostgresChatHistoryStore(testUrl.toString(),{analyticsHashSalt:randomBytes(32).toString('hex')});
 if(providerRun)providerPorts=await createStatefulProvider({preflight:providerFreeze,out:resolve(out)});
 async function statefulFixture({live=false,missingEta=false,dependencyHoldingReply=null}={}){
  assert(!live||dependencyHoldingReply===null,'SYNTHETIC_RULE_FORBIDDEN_IN_PROVIDER_RUN');
  const customerHash=hash(randomUUID()),at=new Date(),row=await runtime.loadOrCreate(pageId,customerHash,'APP',conversationId=>createConversationState({conversationId,routingOwner:'APP',now:at}),at);
  const bound={pageId,shopId:scope.shopId,shopAlias:'LANA',conversationId:row.conversationId,customerHash};
  await runtime.linkProviderConversation(pageId,row.conversationId,'PANCAKE','synthetic-'+randomUUID(),at,new Date(at.getTime()+3600000));
  let sourceVariantChanged=false;
  const product=fixtureProduct('SM613',at),selected=q=>{if(missingEta&&q.deliveryAddress)return {status:'ETA_UNAVAILABLE',reasonCode:'CONTROLLED_MISSING_REGION',availableSizes:[],availableColors:[]};
   const s=fixtureCartLine();s.lineId=q.lineId;s.quantity=q.quantity;s.lineTotalVnd=s.posUnitPriceVnd*s.quantity;
   s.priceAuthority={...s.priceAuthority,shopId:'LANA',priceFactRef:'synthetic-pos-v1',metadata:{...s.priceAuthority.metadata,sourceVersion:'synthetic-pos-v1',observedAt:at.toISOString(),expiresAt:new Date(at.getTime()+172800000).toISOString()}};
   s.components[0]={...s.components[0],size:q.size??'M',color:q.color??'navy',componentSku:'SM613-'+(q.color??'navy').toUpperCase()+'-'+(q.size??'M')};
   if(sourceVariantChanged)s.components[0].componentSku='CHANGED-SOURCE-SKU';
   return {status:'READY',line:s,shopId:'LANA',versions:{price:'synthetic-pos-v1',inventory:'synthetic-stock-v1',size:'synthetic-size-v1',eta:q.deliveryAddress?'synthetic-eta-v1':null},
    eta:q.deliveryAddress?{minDays:3,maxDays:6}:null,etaExpiresAt:q.deliveryAddress?new Date(Date.now()+1200000).toISOString():null,
    sourceAuthority:'POS_SNAPSHOT',stockStatus:'IN_STOCK',stockAvailableQuantity:10,sourceObservedAt:at.toISOString(),sourceExpiresAt:new Date(at.getTime()+172800000).toISOString()};};
  const facts=live?providerPorts.facts:{ready:async()=>true,close:async()=>{},resolve:async()=>{throw new Error('UNUSED');},resolveCartSelection:async q=>selected(q)};
  const policy=async()=>{resolver.invalidate(pageId,'PUBLISHED');const resolved=await resolver.resolve({pageId,channel:'PUBLISHED',pin:{scopeType:'SALES_EPISODE',scopeId:bound.conversationId},now:new Date()});
   if(!dependencyHoldingReply)return resolved;
   // Controlled domain input only: never publish/replace the real shop policy.
   return {...resolved,bundle:{...resolved.bundle,artifacts:{...resolved.bundle.artifacts,handoffMatrix:{schemaVersion:1,kind:'HANDOFF_MATRIX',
    sourceMetadata:resolved.bundle.artifacts.shopPolicy.sourceMetadata,rules:[{reason:'DEPENDENCY_FAILURE',customerMessagePolicy:'HOLDING_REPLY_THEN_HANDOFF',holdingReply:dependencyHoldingReply,tag:'NHAN_VIEN'}]}}}};};
  const read=live?await providerPorts.read(bound,policyStore,policy):{policy,catalog:{readProduct:async()=>product,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})},initialProducts:[product.product]};
  const capture=[],gateCalls=[],dispatcher=new MetaOutboxDispatcher(runtime,new MetaDeliveryAdapter({request:async r=>{
   const b=JSON.parse(r.body);if(b.recipient.id==='synthetic-recipient-'+customerHash)capture.push(b.message.text??'[CODE_IMAGE]');return {status:200,headers:{},body:{recipient_id:b.recipient.id,message_id:'captured-'+randomUUID()}};}},{sendEnabled:true}),
   new SinglePageMetaTokenRegistry(pageId,'synthetic-token'),{authorize:async claim=>{if(claim.conversationId===bound.conversationId)gateCalls.push(claim.responseGroupId);return {status:'ALLOWED',reasonCode:null,blockingTag:null,observedAt:new Date()};}},{workerId:'c3-b-capture'},undefined,historyStore);
  const drain=async()=>{for(let i=0;i<20&&await dispatcher.processOne();i++);};
  async function turn(text,outputs,{verdict='PASS',inspect=()=>{},beforeCommit=async()=>{},afterVerify=async()=>{}}={}){
   const now=new Date(),id='stateful-'+randomUUID(),envelope={schemaVersion:1,customerSendEnabled:false,routing:{owner:'APP'},message:{schemaVersion:1,traceId:randomUUID(),eventKey:id,pageId,messageId:id,
    senderId:'synthetic-recipient-'+customerHash,conversationId:'synthetic-meta-conversation',occurredAt:now.toISOString(),isEcho:false,appId:null,text,attachments:[]}};
   await inbox.enqueue({pageId,metaAppId:'synthetic',eventKey:id,providerMessageId:id,conversationHash:customerHash,occurredAt:now,receivedAt:now,signatureKeyVersion:'synthetic',envelope});
   await pool.query('UPDATE conversation_ingress_heads SET quiet_until=now() WHERE page_id=$1 AND conversation_hash=$2',[pageId,customerHash]);
   // Earlier supersession tests intentionally leave synthetic pending sources. Retire those test-only batches.
   let batch;
   for(let n=0;n<20;n++){batch=await inbox.claimNextBatch('c3-b-stateful',300000);if(!batch||batch.conversationHash===customerHash)break;await inbox.completeBatch(batch);}
   assert(batch&&batch.conversationHash===customerHash,'CURRENT_BATCH');
   let owners=0,verifiers=0;const toolResponses=[];
   const result=await runPersistedCommerceIngress({batch,fence:batch.generation,scope:bound,store:runtime,inbox,history:historyStore,transaction:async fn=>{await beforeCommit();try{return await withTransaction(pool,fn);}catch(error){report.composedCommitDiagnostic=/^[A-Z0-9_]{1,128}$/.test(error.message)?error.message:error.name;save();throw error;}},
    read,facts,policy,resolveTagId:()=> 'synthetic-tag',clock:()=>new Date(),
    ownerPrompt:live?providerPorts.ownerPrompt:'Synthetic owner transport, never a provider run.',verifierPrompt:live?providerPorts.verifierPrompt:'Synthetic verifier transport.',
    owner:async request=>{owners++;inspect(request);toolResponses.push(...request.contents.flatMap(c=>c.parts.flatMap(p=>p.functionResponse?[p.functionResponse]:[])));if(live)return providerPorts.owner(request);
      const next=outputs.shift();if(!next)throw new Error('CONTROLLED_GENERATION_FAILURE');return typeof next==='function'?next(request):next;},
    verifier:async request=>{verifiers++;const v=live?await providerPorts.verifier(request):{result:{verdict,violations:[]}};await afterVerify();return v;}});
   return {result,owners,verifiers,batch,toolResponses};
  }
  const state=async()=>(await runtime.loadOrCreateSalesCycle(pageId,bound.conversationId,()=>{throw new Error('STATE_REQUIRED');})).state;
  return {bound,turn,state,capture,gateCalls,drain,changeVariantSource:()=>{sourceVariantChanged=true;}};
 }
 const native=(calls)=>({kind:'TOOLS',calls,content:{role:'model',parts:calls.map(c=>({functionCall:c}))}}),say=text=>({kind:'FINAL',text});
 let journey;
 await check('B composed ingress commits an open cart, authorizes the exact reply and captures delivery once',async()=>{
  journey=await statefulFixture();const r=await journey.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',size:'M',color:'navy',quantity:1}}]),say('Em đã thêm áo vào giỏ cho chị.')]);
  assert.equal(r.result.terminal.disposition,'SEND_ELIGIBLE',JSON.stringify(r.result));assert.equal(r.result.enqueued,1);assert.equal(await inbox.isBatchCurrent(r.batch),false);
  const cart=(await journey.state()).cart;if(!cart){report.composedDiagnostic=r.toolResponses;save();}assert(cart,JSON.stringify(r.toolResponses));
  assert.equal(cart.value.lines[0].quantity,1);await journey.drain();await journey.drain();
  assert.equal(journey.capture.filter(s=>s==='Em đã thêm áo vào giỏ cho chị.').length,1);assert.equal(journey.gateCalls.length,1);
 });
 await check('B composed two native mutations retain one source and next owner receives accepted history and current cart',async()=>{
  const line=(await journey.state()).cart.value.lines[0];let sawHistory=false;
  const r=await journey.turn('Đổi áo sang L, cho chị hai chiếc nhé',[native([{name:'change_cart_item',args:{subjectRef:line.lineId,action:'SET_COMPONENT_VARIANT',componentRole:'TOP',size:'L'}},
   {name:'change_cart_item',args:{subjectRef:line.lineId,action:'SET_QUANTITY',quantity:2}}]),say('Em đổi áo sang L, số lượng hai chiếc rồi chị nhé.')],{inspect:req=>{sawHistory||=JSON.stringify(req.contents).includes('Em đã thêm áo vào giỏ cho chị.');}});
  assert.equal(r.result.enqueued,1,JSON.stringify(r.result));assert(sawHistory);const s=await journey.state();assert.equal(s.cart.value.lines[0].quantity,2);assert.equal(s.cart.value.lines[0].components[0].size,'L');
  await journey.drain();assert(journey.capture.includes('Em đổi áo sang L, số lượng hai chiếc rồi chị nhé.'));
 });
 await check('B composed committed profile correction carries its receipt through the effect bridge and final readback',async()=>{
  let receiptSeen=false;
  const text='Em đã cập nhật lại số đo eo 74, mông 96 cho chị rồi ạ. Chị vẫn giữ size L nhé.';
  const r=await journey.turn('Số đo chị là eo 74, mông 96. Chị vẫn lấy size L nhé.',[native([{name:'apply_customer_state',args:{ops:[{op:'SET',field:'measurements.WAIST_CM',value:74},{op:'SET',field:'measurements.HIPS_CM',value:96}]}}]),say(text)],{inspect:req=>{
   if(req.context.state.customerProfileRevision<2)return;
   receiptSeen=req.context.effectReceipts.some(p=>p.effect==='CUSTOMER_STATE_UPDATED'&&p.subjectRef===req.context.state.customerProfileId&&p.stateRevision===req.context.state.revision);
  }});
  assert(receiptSeen);assert.equal(r.result.terminal.text,text,JSON.stringify(r.result));assert.equal(r.result.terminal.reason,'PASS');
  await journey.drain();assert(journey.capture.includes(text));
 });
 await check('B composed private checkout bypasses both models and persists the existing guarded preview',async()=>{
  const partial=await journey.turn('Tên: Khách thử nghiệm',[]);assert.equal(partial.owners,0);assert.equal(partial.result.enqueued,1);await journey.drain();
  const r=await journey.turn('Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\nCOD',[]);
  assert.equal(r.owners,0);assert.equal(r.verifiers,0);assert.equal((await journey.state()).stage,'ORDER_PREVIEW');assert(r.result.enqueued>0,JSON.stringify(r));await journey.drain();
 });
 await check('B composed confirmation uses existing revalidation and commits checkout handoff once',async()=>{
  const r=await journey.turn('Chốt đơn cho chị nhé',[native([{name:'confirm_purchase',args:{}}])],{inspect:request=>{
   assert(!JSON.stringify(request).includes('Khách thử nghiệm'),'PRIVATE_NAME_HISTORY_LEAK');assert(!JSON.stringify(request).includes('0900000000'),'PRIVATE_PHONE_HISTORY_LEAK');}});
  assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));assert.equal((await journey.state()).stage,'PURCHASE_CONFIRMED');
  assert.equal((await runtime.loadOrCreate(pageId,journey.bound.customerHash,'APP',()=>null)).state.conversationOwner,'HUMAN');
 });
 await check('B composed later failed mutation hands off the partial committed result, without replay',async()=>{
  const j=await statefulFixture();await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',size:'M',color:'navy'}}]),say('Em đã thêm áo vào giỏ cho chị.')]);await j.drain();
  const line=(await j.state()).cart.value.lines[0],r=await j.turn('Lấy hai chiếc cho chị nhé',[native([{name:'change_cart_item',args:{subjectRef:line.lineId,action:'SET_QUANTITY',quantity:2}},
   {name:'change_cart_item',args:{subjectRef:line.lineId,action:'SET_QUANTITY',quantity:0}}]),say('Để em kiểm tra lại.')],{verdict:'UNCERTAIN'});
  assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));assert.equal((await j.state()).cart.value.lines[0].quantity,2);
  const counts=(await pool.query('SELECT count(*)::int AS n FROM handoff_events WHERE conversation_id=$1',[j.bound.conversationId])).rows[0];assert.equal(counts.n,1);
  const next=await j.turn('Em ơi',[]);assert.equal(next.owners,0);assert.equal(next.result.terminal.disposition,'NO_SEND');
 });
 await check('B composed missing private checkout evidence commits a real handoff with zero model requests and completes the source',async()=>{
  const j=await statefulFixture({missingEta:true});await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',size:'M',color:'navy'}}]),say('Em đã thêm áo vào giỏ cho chị.')]);await j.drain();
  const r=await j.turn('Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\nCOD',[]);
  assert.equal(r.owners,0);assert.equal(r.verifiers,0);assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));assert.equal(await inbox.isBatchCurrent(r.batch),false);
  assert.equal(r.result.privateCheckoutFailure.stage,'PLANNER');assert.equal(r.result.privateCheckoutFailure.reasonCode,'CONTROLLED_MISSING_REGION');
  assert.equal((await runtime.loadOrCreate(pageId,j.bound.customerHash,'APP',()=>null)).state.conversationOwner,'HUMAN');
 });
 await check('B composed newer inbound between final readback and commit cancels eligibility without an Outbox',async()=>{
  const j=await statefulFixture();let injected=false;
  const r=await j.turn('Em ơi',[say('Dạ chị.')],{beforeCommit:async()=>{if(injected)return;injected=true;const id='newer-'+randomUUID(),at=new Date();
   await inbox.enqueue({pageId,metaAppId:'synthetic',eventKey:id,providerMessageId:id,conversationHash:j.bound.customerHash,occurredAt:at,receivedAt:at,signatureKeyVersion:'synthetic',envelope:{synthetic:true}});}});
  assert.equal(r.result.terminal.disposition,'NO_SEND',JSON.stringify(r.result));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM meta_outbox WHERE conversation_id=$1',[j.bound.conversationId])).rows[0].n,0);
 });
 await check('B configured private dependency holding reply commits and is captured exactly once with the handoff',async()=>{
  const text='Nhân viên sẽ kiểm tra thông tin nhận hàng của chị.',j=await statefulFixture({missingEta:true,dependencyHoldingReply:text});
  await j.turn('Chị lấy áo navy size M',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy',quantity:1}}]),say('Dạ chị.')]);
  const before=j.capture.length,r=await j.turn('Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\nCOD',[]);
  assert.equal(r.owners,0);assert.equal(r.verifiers,0);assert.equal(r.result.terminal.disposition,'HANDOFF');assert.equal(r.result.enqueued,1);
  assert.deepEqual(j.capture.slice(before),[text]);assert.equal(await inbox.isBatchCurrent(r.batch),false);
  assert.equal((await runtime.loadOrCreate(pageId,j.bound.customerHash,'APP',()=>null)).state.conversationOwner,'HUMAN');
  const rows=await pool.query('SELECT status FROM meta_outbox WHERE conversation_id=$1 ORDER BY created_at',[j.bound.conversationId]);
  assert(rows.rows.every(row=>row.status==='SENT_ACCEPTED'));
 });
 await check('B composed superseded source cannot persist customer measurements during generation',async()=>{
  const j=await statefulFixture();
  const r=await j.turn('Eo chị 85 nhé',[async()=>{
   const id='newer-profile-'+randomUUID(),at=new Date();
   await inbox.enqueue({pageId,metaAppId:'synthetic',eventKey:id,providerMessageId:id,conversationHash:j.bound.customerHash,occurredAt:at,receivedAt:at,signatureKeyVersion:'synthetic',envelope:{synthetic:true}});
   return native([{name:'apply_customer_state',args:{ops:[{op:'SET',field:'measurements.WAIST_CM',value:85}]}}]);
  }]);
  const profile=await runtime.loadOrCreateCustomerProfile(pageId,j.bound.customerHash,()=>{throw new Error('PROFILE_REQUIRED');});
  assert.equal(r.result.terminal.disposition,'NO_SEND');assert.equal(r.verifiers,0);
  assert.equal(profile.revision,1);assert.deepEqual(profile.profile.measurements,[]);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM meta_outbox WHERE conversation_id=$1',[j.bound.conversationId])).rows[0].n,0);
 });
 await check('B composed exact cart variant is checked again before Outbox even when price and quantity stay unchanged',async()=>{
  const j=await statefulFixture();const r=await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',size:'M',color:'navy'}}]),say('Em đã thêm áo vào giỏ cho chị.')],{afterVerify:async()=>j.changeVariantSource()});
  assert.equal(r.result.terminal.disposition,'NO_SEND',JSON.stringify(r.result));assert.equal(r.result.enqueued,0);assert.equal(await inbox.isBatchCurrent(r.batch),false);
 });
 await check('B composed clarification rollback refuses to destroy existing append-only events',async()=>{
  const definition=await commandConstraint(),count=Number((await pool.query("SELECT count(*) AS n FROM sales_cycle_events WHERE command_kind IN ('CLARIFICATION_REQUESTED','CLARIFICATION_RESOLVED')")).rows[0].n);assert(count>0);
  await assert.rejects(withTransaction(pool,client=>client.query(clarificationDown)),/SALES_CLARIFICATION_EVENTS_REQUIRE_COMPATIBLE_SCHEMA/);
  assert.equal(await commandConstraint(),definition);assert.equal(Number((await pool.query("SELECT count(*) AS n FROM sales_cycle_events WHERE command_kind IN ('CLARIFICATION_REQUESTED','CLARIFICATION_RESOLVED')")).rows[0].n),count);
 });
 if(providerRun){
  const journeys=new Map();report.outcomes=[];
  for(const [index,c] of providerFreeze.cases.entries()){
   providerPorts.setSlot(c.caseId);const beforeCounts={...providerPorts.counters};
   const started=performance.now();let j=journeys.get(c.journeyId);if(!j){j=await statefulFixture({live:true});journeys.set(c.journeyId,j);}
   const capturedBefore=j.capture.length;
   const latest=c.runtime.privateCheckoutFixture?'Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\nCOD':c.runtime.latest;
   let attempt;
   try{attempt=await j.turn(latest,[]);await j.drain();}
   catch(error){attempt={result:{terminal:{disposition:'NO_SEND',reason:'ATTEMPT_UNAVAILABLE',text:null,fallbackId:null},sendEnabled:false},errorCode:/^[A-Z0-9_]{1,128}$/.test(error.message)?error.message:error.name};}
   const stored=await runtime.loadOrCreateSalesCycle(pageId,j.bound.conversationId,()=>createSalesCycleRuntimeState(j.bound.conversationId,{pageId,conversationId:j.bound.conversationId},new Date()));
   const profile=await runtime.loadOrCreateCustomerProfile(pageId,j.bound.customerHash,()=>{throw new Error('PROFILE_MISSING');});
   const result={caseId:c.caseId,journeyId:c.journeyId,elapsedMs:performance.now()-started,...attempt,
    actualCapturedMessages:j.capture.slice(capturedBefore).map(t=>redactAnalyticsMessage(t).text),
    committedPublicState:{stage:stored.state.stage,revision:stored.state.revision,cart:stored.state.cart?.value??null,measurements:profile.profile.measurements,customerProfileRevision:profile.profile.revision},
    counts:{...providerPorts.counters}};
   writeFileSync(resolve(out,'provider-attempt-'+(index+1)+'.json'),JSON.stringify(result,null,2),{flag:'wx'});
   report.outcomes.push({caseId:c.caseId,disposition:attempt.result.terminal.disposition,captured:result.actualCapturedMessages.length,
    ownerRequests:providerPorts.counters.owner-beforeCounts.owner,verifierRequests:providerPorts.counters.verifier-beforeCounts.verifier});
   report.providerGenerations=providerPorts.counters.owner+providerPorts.counters.verifier;save();
  }
  report.providerCounts={...providerPorts.counters};report.registeredOutcomes=7;report.completedOutcomes=report.outcomes.length;
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),providerFreeze.registration.sourceSha,'RUN_SOURCE_CHANGED');
  const finalFreeze=statefulPreflight(root);assert.equal(finalFreeze.registration.sourceConfigHash,providerFreeze.registration.sourceConfigHash,'RUN_CONFIG_CHANGED');
 }
 report.status=providerRun?'COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW':'PASS';save();
}catch(error){report.status='FAIL';report.errorType=error.name;report.error=error.message;save();console.error(error.stack);process.exitCode=1;}
finally{
 await Promise.allSettled([runtime?.close(),inbox?.close(),policyStore?.close(),livePolicyStore?.close(),historyStore?.close(),providerPorts?.close(),pool?.end()]);
 if(created){assert(/^c3_b_test_[a-f0-9]{16}$/.test(databaseName));await admin.query('DROP DATABASE '+databaseName);report.testDatabaseDropped=true;save();}
 await admin.end();
}
