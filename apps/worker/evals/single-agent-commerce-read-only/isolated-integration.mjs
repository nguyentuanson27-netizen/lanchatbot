// Evaluation-only real PostgreSQL: synthetic inputs by default; explicit provider mode uses live public sources.
// Delivery is always an in-memory capture transport, never a live customer effect.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {HandoffMatrixAdminContentV1Schema} from '@lana/contracts';
import {PostgresRealtimeRuntimeStore,PostgresRealtimeInboxStore,PostgresRuntimePolicyStore,PostgresChatHistoryStore,LocalEnvelopeCipher,withTransaction,redactAnalyticsMessage} from '@lana/database';
import {MetaDeliveryAdapter} from '@lana/meta-delivery';
import {MetaOutboxDispatcher,SinglePageMetaTokenRegistry} from '../../dist/meta-outbox-dispatcher.js';
import {runPersistedCommerceIngress,commerceHistory,bindCommerceFacts} from '../../dist/single-agent-commerce-ingress.js';
import {createCommerceMediaPreSendGate} from '../../dist/single-agent-commerce-media-delivery.js';
import {createCommerceHandoffPreSendGate} from '../../dist/single-agent-commerce-handoff-delivery.js';
import {createCommerceHandoffSourceReader} from '../../dist/single-agent-commerce-handoff-sources.js';
import {commerceSizeSource} from '../../dist/single-agent-commerce-product-groups.js';
import {commerceHash} from '../../dist/single-agent-commerce-read-only-context.js';
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
import {validateToolWorkAccounting} from './protocol.mjs';
import {createAttemptQueue,retainObservedAttempt,unobservedAttempt,summarizeAttemptQualification} from './attempt-evidence.mjs';
import {statefulPreflight,createStatefulProvider} from './stateful-provider.mjs';
import {isolatedHandoffRecords,handoffContentHash} from './candidate-handoff.mjs';
import {publicCapturedAttachments,publicCapturedTextHashes} from './delivery-capture.mjs';
import {assertDiagnosticFlags,diagnosticPreflight,claimDiagnostic} from '../single-agent-commerce-qualification/diagnostic.mjs';
import {admitPreparedCommerceContext} from './preparation-admission.mjs';
import {collectSafety} from '../single-agent-commerce-qualification/collect-safety.mjs';
import {cartSelectionFromSnapshot} from '../../dist/realtime-sales-catalog.js';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const phaseCArg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
assertDiagnosticFlags(process.argv);
const phaseCDiagnostic=phaseCArg('--phase-c-diagnostic-registration');
const phaseC=phaseCArg('--phase-c-registration')??phaseCDiagnostic;
const phaseCInitial=phaseCArg('--phase-c-initial-world');
const initialWorld=phaseCInitial?JSON.parse(readFileSync(phaseCInitial,'utf8')):null;
const phaseCTools=phaseC||phaseCInitial?Object.assign({},...await Promise.all([
 import('../single-agent-commerce-qualification/candidate-provider.mjs'),
 import('../single-agent-commerce-qualification/native-population.mjs'),
 import('../single-agent-commerce-qualification/native-history.mjs'),
  import('../single-agent-commerce-qualification/dispatch-gates.mjs'),
  import('../single-agent-commerce-qualification/native-snapshot.mjs')])):null;
const providerRun=!!phaseC||process.argv.includes('--provider-run'),providerPreflight=process.argv.includes('--provider-preflight');
const checkPrefixIndex=process.argv.indexOf('--check-prefix'),checkPrefix=phaseCInitial?'C initial state capture':checkPrefixIndex<0?null:process.argv[checkPrefixIndex+1];
assert(checkPrefixIndex<0||(!providerRun&&!providerPreflight&&typeof checkPrefix==='string'&&checkPrefix.length>0&&checkPrefix.length<=128),'DETERMINISTIC_CHECK_PREFIX_ONLY');
const providerFreeze=phaseCDiagnostic?diagnosticPreflight(root,phaseC,phaseCArg('--phase-c-world')):phaseC?phaseCTools.candidatePreflight(root,phaseC,phaseCArg('--phase-c-world')):providerRun||providerPreflight?statefulPreflight(root):null;
if(providerPreflight){console.log(JSON.stringify({status:'PREFLIGHT_PASS',...providerFreeze.registration,providerGenerations:0}));process.exit(0);}
if(phaseC){
 if(!phaseCDiagnostic)phaseCTools.requirePassingSafety(providerFreeze.sealed,phaseCArg('--phase-c-safety'));
 if(phaseCArg('--phase-c-arm')==='C3'){
  const absolute=JSON.parse(readFileSync(phaseCArg('--phase-c-absolute-evidence'),'utf8'));
  const {evaluateQualification}=await import('../single-agent-commerce-qualification/qualification.mjs');
  assert.equal(evaluateQualification(absolute).candidateMeetsTarget,'PASS','C_ABSOLUTE_TARGET_MUST_PASS_FIRST');
  assert.equal(JSON.stringify(absolute.config),JSON.stringify(providerFreeze.sealed.config),'C_ABSOLUTE_CONFIG_CHANGED');
  providerFreeze.registration.arm='C3';
 }else{assert(!phaseCArg('--phase-c-arm')||phaseCArg('--phase-c-arm')==='CANDIDATE');providerFreeze.registration.arm='CANDIDATE';}
 if(phaseCDiagnostic)claimDiagnostic(phaseC,providerFreeze.sealed);
 else phaseCTools.claimDispatch(phaseC,providerFreeze.registration.arm==='C3'?'C3':'NATIVE',providerFreeze.sealed);
}
const {Pool}=createRequire(new URL('../../../../packages/database/package.json',import.meta.url))('pg');
const out=process.argv[2];assert(out,'NEW_EVIDENCE_DIRECTORY_REQUIRED');mkdirSync(resolve(out));
const paymentMethod=process.argv[3]??'COD';assert(['COD','BANK_TRANSFER'].includes(paymentMethod));
const report={sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
 sourceDirty:!!execFileSync('git',['status','--porcelain',...(phaseC||phaseCInitial?[]:['--','apps/worker/src','apps/worker/evals/single-agent-commerce-read-only','packages'])],{cwd:root,encoding:'utf8'}).trim(),
 mode:providerRun?providerFreeze.registration.mode:'REAL_POSTGRES_SYNTHETIC_DOMAIN_INPUTS_CURRENT_POLICY_CAPTURE',paymentMethod,sendEnabled:false,providerGenerations:0,cases:[],testDatabaseDropped:false};
const save=()=>writeFileSync(resolve(out,'integration.json'),JSON.stringify(report,null,2));
const check=async(name,fn)=>{if((checkPrefix&&!name.startsWith(checkPrefix))||providerRun||(process.argv.includes('--composed-only')&&!name.startsWith('B composed')) ||
 (process.argv.includes('--handoff-delivery-only')&&!['B composed snapshot invalidation ','B composed dependency holding delivery ','B composed candidate first ',
  'B composed no-chart fallback','B composed mixed media','B composed N5 ','B composed missing private checkout','B composed configured private dependency'].some(prefix=>name.startsWith(prefix))) ||
 (process.argv.includes('--media-handoff-only')&&!name.startsWith('B composed candidate first')&&!name.startsWith('B composed no-chart fallback')&&!name.startsWith('B composed mixed media')))return;
 try{await fn();report.cases.push({name,status:'PASS'});save();console.log(name+': PASS');}
 catch(error){report.cases.push({name,status:'FAIL',error:error.message});save();throw error;}};
const adminUrl=process.env.C3_B_TEST_ADMIN_DATABASE_URL;assert(adminUrl,'C3_B_TEST_ADMIN_DATABASE_URL');
const databaseName='c3_b_test_'+randomBytes(8).toString('hex');
assert(/^c3_b_test_[a-f0-9]{16}$/.test(databaseName));
const admin=new Pool({connectionString:adminUrl,max:1}),testUrl=new URL(adminUrl);testUrl.pathname='/'+databaseName;
let pool,runtime,inbox,policyStore,livePolicyStore,historyStore,providerPorts,created=false;
const attemptQueue=createAttemptQueue(); // Exactly this process's disposable DB, shared by all journey dispatchers.
function handoffGate(base,policy,receiptAvailable=()=>true,readReplySource,observe){const gate=createCommerceHandoffPreSendGate({base,clock:()=>new Date(),policy,...(readReplySource?{readReplySource}:{}),
 readAuthority:async b=>{const row=await runtime.loadOrCreate(b.pageId,b.customerHash,'APP',()=>{throw Error('DELIVERY_CONVERSATION_REQUIRED');});
  assert.equal(row.conversationId,b.conversationId);return {...row,generation:await inbox.readGeneration(b.pageId,b.customerHash)};},
 hasCommittedHandoff:b=>{if(!receiptAvailable())throw Error('CONTROLLED_RECEIPT_READ_UNAVAILABLE');return runtime.hasCommittedHandoffDelivery({...b,bindingHash:commerceHash(b)});}});
 return {...gate,async authorize(claim){const result=await gate.authorize(claim);observe?.({status:result.status,reasonCode:result.reasonCode});return result;}};}
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
 const stateTools=()=>createCustomerStateTools({base:base(),scope,store:statePort,clock:()=>now,sizeInput:async()=>fixtureSizeInput(),sourceMessages:[{text:"Eo 85, mông 105. Eo 75, mông 95.",sourceMessageId:scope.sourceMessageId,observedAt:scope.sourceObservedAt}]});
 await check('B2 real profile persists across turns and correction precedes dependent size',async()=>{
  for(const [index,waist,hips,size] of [[0,85,105,'L'],[1,75,95,'M']]){
   now=new Date(now.getTime()+1000);scope.sourceMessageId='b2-'+index;scope.sourceObservedAt=now.toISOString();
   const t=await stateTools(),before=await statePort.read();if(profileId)assert.equal(before.profile.profileId,profileId);else profileId=before.profile.profileId;
   const results=await t.invokeBatch([{name:'recommend_size',args:{subjectRef:'QU714'}},{name:'apply_customer_state',args:{ops:[
    {op:'SET',field:'measurements.WAIST_CM',value:waist,sourceQuote:String(waist)},{op:'SET',field:'measurements.HIPS_CM',value:hips,sourceQuote:String(hips)}]}}]);
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
 const records=phaseC?providerFreeze.world.policyRecords:initialWorld?initialWorld.policyRecords:await livePolicyStore.loadActivePointers({pageId,channel:'PUBLISHED'});
 const handoffCandidate=process.argv.includes('--candidate-handoff')?isolatedHandoffRecords(records,{pageId,
  candidate:JSON.parse(readFileSync(new URL('./handoff-matrix.candidate.json',import.meta.url)))}):null;
 for(const r of handoffCandidate?.records??records){const v=r.version,p=r.pointer;
  await pool.query('INSERT INTO admin_artifact_versions (version_id,artifact_key,artifact_kind,version_number,lifecycle,revision,content_hash,content,created_by_subject,updated_by_subject,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11)',
   [v.versionId,v.artifactKey,v.artifactKind,v.versionNumber,v.lifecycle,v.revision,v.contentHash,v.content,v.createdBy,v.createdAt,v.updatedAt]);
  await pool.query('INSERT INTO admin_active_pointers (pointer_id,artifact_key,artifact_kind,page_id,channel,version_id,revision,updated_by_subject,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
   [p.pointerId,p.artifactKey,p.artifactKind,p.pageId,p.channel,p.versionId,p.revision,p.updatedBy,p.updatedAt]);
 }
 policyStore=new PostgresRuntimePolicyStore(testUrl.toString());
 const resolver=new RuntimePolicyResolver(policyStore,{enabled:true,publishedEnabled:true},policyStore);
 const policyResolution=await resolver.resolve({pageId,channel:'PUBLISHED',pin:{scopeType:'SALES_EPISODE',scopeId:key},now});
 assert(policyResolution.bundle,'CAPTURED_POLICY_UNAVAILABLE');scope.shopId=policyResolution.bundle.policy.shopId;
 if(handoffCandidate){
  assert.equal(handoffContentHash(policyResolution.bundle.artifacts.handoffMatrix),handoffCandidate.candidateHash,'ISOLATED_CANDIDATE_NOT_RESOLVED');
  report.candidateHandoff={upstreamHash:handoffCandidate.upstreamHash,candidateHash:handoffCandidate.candidateHash,versionId:handoffCandidate.versionId,
   versionReferences:policyResolution.bundle.versionReferences.filter(r=>r.artifactKind==='HANDOFF_MATRIX')};
 }
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
  await message('Chị lấy mẫu SM613 size M màu navy');const t=await effects();const call={name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy',quantity:1}};
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
  const recovered=await t.recover({disposition:'FALLBACK',reason:'CONTROLLED_PROVIDER_FAILURE',text:null,fallbackId:null});
  assert.equal(recovered.reason,'RECEIPT_BACKED_CART_SUMMARY');
  assert(recovered.text.includes((await repository.read(key)).cart.value.grandTotalVnd.toLocaleString('vi-VN')+'đ'));
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
 async function handoffFixture({link=true,supersede=false,candidateMatrix=null}={}){
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
  assert.equal(batch.conversationHash,h.customerHash,'HANDOFF_FIXTURE_CLAIMED_ANOTHER_CONVERSATION');
  h.bindingVersion='c3-b-handoff:'+batch.generation;
  h.fence=batch.generation; // Synthetic candidate lease domain; not a live COMMERCE actor-fence qualification.
  if(supersede)await enqueue('newer-'+randomUUID());
  const read=async()=>{const r=await runtime.loadOrCreate(pageId,h.customerHash,'APP',()=>{throw new Error('EXISTING_REQUIRED');});
   return {...h,stateVersion:r.stateVersion,state:r.state,permission:r.state.conversationOwner==='BOT'};};
  const deliveryRecipient='synthetic-handoff-'+h.customerHash;
  h.recipient=hash(deliveryRecipient);
  const port=createPersistedCommerceHandoffPort({scope:h,clock:()=>new Date(),read,store:runtime,transaction:async fn=>{
   try{return await withTransaction(pool,fn);}catch(error){report.directHandoffCommitDiagnostic=/^[A-Z0-9_]{1,128}$/.test(error.message)?error.message:error.name;save();throw error;}
  },deliveryRecipient,
   inboxBatchGuard:{generation:batch.generation,leaseToken:batch.leaseToken,inboxIds:batch.inboxIds},resolveTagId:()=> 'synthetic-handoff-tag'});
  const hp=structuredClone(policyResolution.bundle);
  // Synthetic HANDOFF_MATRIX in memory; current public policy is unchanged and never republished.
  hp.artifacts.handoffMatrix=candidateMatrix??{schemaVersion:1,kind:'HANDOFF_MATRIX',sourceMetadata:hp.artifacts.shopPolicy.sourceMetadata,
   rules:[{reason:'EXCHANGE',customerMessagePolicy:'HOLDING_REPLY_THEN_HANDOFF',holdingReply:'Shop đã nhận yêu cầu đổi hàng của chị.',tag:'VAN_DON'},
    {reason:'CUSTOMER_REQUESTED_HUMAN',customerMessagePolicy:'SILENT_HANDOFF',holdingReply:null,tag:'NHAN_VIEN'}]};
  const tools=await createCommerceTools({read:{scope:h,clock:()=>new Date(),policy:async()=>({...policyResolution,bundle:hp}),
    catalog:{readProduct:async()=>{throw new Error('UNUSED');},searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}},
   handoff:{...port,policy:async()=>hp}});
  const counts=async()=>(await pool.query('SELECT (SELECT count(*)::int FROM handoff_events WHERE conversation_id=$1) AS events, (SELECT count(*)::int FROM pancake_tag_outbox WHERE conversation_id=$1) AS tags, (SELECT count(*)::int FROM meta_outbox WHERE conversation_id=$1) AS messages',[h.conversationId])).rows[0];
  return {h,tools,read,counts,deliveryRecipient,batch,policy:hp};
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
  // This negative case deliberately rolls back the handoff; finish only its synthetic input.
  assert.equal(await inbox.completeBatch(h.batch),true);
 });
 await check('B handoff superseded inbound cannot commit using the earlier source lease',async()=>{
  const h=await handoffFixture({supersede:true});
  assert.equal((await h.tools.invoke({name:'request_handoff',args:{reason:'CUSTOMER_REQUESTED_HUMAN'}})).status,'REJECTED');
  assert.equal((await h.read()).state.conversationOwner,'BOT');assert.deepEqual(await h.counts(),{events:0,tags:0,messages:0});
  // Stale completion releases its rows and returns false; it cannot finish a newer generation.
  assert.equal(await inbox.completeBatch(h.batch),false);
  const newer=await inbox.claimNextBatch('c3-b-handoff-cleanup',60000);assert(newer);
  assert.equal(newer.conversationHash,h.h.customerHash);assert.equal(await inbox.completeBatch(newer),true);
 });
 for(const reason of ['EXCHANGE','DEFECT'])await check('B handoff candidate '+reason+' commits silently without a customer Outbox',async()=>{
  const candidateMatrix=JSON.parse(readFileSync(new URL('./handoff-matrix.candidate.json',import.meta.url)));
  const expected=candidateMatrix.rules.find(r=>r.reason===reason).holdingReply;
  const h=await handoffFixture({candidateMatrix}),captured=[];
  const accepted=await h.tools.invoke({name:'request_handoff',args:{reason}});
  assert.equal(accepted.status,'OK',JSON.stringify(accepted));
  assert.equal((await h.read()).state.conversationOwner,'HUMAN');
  assert.deepEqual(await h.counts(),{events:1,tags:1,messages:0});
  assert.equal((await h.tools.terminalOutcome()).text,expected);
  const dispatcher=new MetaOutboxDispatcher(runtime,new MetaDeliveryAdapter({request:async r=>{
   const body=JSON.parse(r.body);if(body.recipient.id===h.deliveryRecipient)captured.push(body.message.text);
   return {status:200,headers:{},body:{recipient_id:body.recipient.id,message_id:'captured-'+randomUUID()}};
  }},{sendEnabled:true}),new SinglePageMetaTokenRegistry(pageId,'synthetic-token'),
  handoffGate({authorize:async()=>({status:'ALLOWED',reasonCode:null,blockingTag:null,observedAt:new Date()})},async()=>h.policy),{workerId:'handoff-candidate-capture'});
  for(let n=0;n<20&&await attemptQueue.dispatch(()=>dispatcher.processOne());n++);
  assert.deepEqual(captured,[]);
  assert.equal((await h.tools.invoke({name:'request_handoff',args:{reason}})).status,'REJECTED');
  for(let n=0;n<20&&await attemptQueue.dispatch(()=>dispatcher.processOne());n++);
  assert.deepEqual(captured,[]);
  assert.deepEqual(await h.counts(),{events:1,tags:1,messages:0});
 });
 // Full candidate composition uses the actual Inbox, history, profile, sales and Outbox stores.
 // Product/checkout/transport inputs here remain explicitly synthetic; no Meta/Pancake socket is opened.
 historyStore=new PostgresChatHistoryStore(testUrl.toString(),{analyticsHashSalt:randomBytes(32).toString('hex')});
 if(phaseCInitial)providerPorts=phaseCTools.createCandidateProvider({preflight:{m:JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url))),world:initialWorld,
  registration:{maximumGenerationRequests:0}},out:resolve(out)});
 if(providerRun)providerPorts=phaseC?phaseCTools.createCandidateProvider({preflight:providerFreeze,out:resolve(out)}):await createStatefulProvider({preflight:providerFreeze,out:resolve(out)});
 if(phaseC&&providerFreeze.registration.arm==='C3')await providerPorts.attachReference({baselineRoot:phaseCArg('--phase-c-baseline-root'),
  baselineBuild:JSON.parse(readFileSync(phaseCArg('--phase-c-baseline-build'),'utf8'))});
 async function statefulFixture({live=false,missingEta=false,dependencyHoldingReply=null,sizeHoldingReply=null,media=false,revalidatedMedia=false,initialProductCodes=['SV2447'],deferredHandoff=false,sourceMode='LIVE',missingDependencyRule=false,candidateTuples=false,preparedOffers=false,preorderChoices=false}={}){
  assert(!live||(!preparedOffers&&!preorderChoices),'SYNTHETIC_PREPARATION_FORBIDDEN_IN_PROVIDER_RUN');
  assert(!live||!revalidatedMedia,'SYNTHETIC_REVALIDATION_FORBIDDEN_IN_PROVIDER_RUN');
  assert(!live||(dependencyHoldingReply===null&&sizeHoldingReply===null&&!missingDependencyRule),'SYNTHETIC_RULE_FORBIDDEN_IN_PROVIDER_RUN');
  const customerHash=hash(randomUUID()),at=new Date(),row=await runtime.loadOrCreate(pageId,customerHash,'APP',conversationId=>createConversationState({conversationId,routingOwner:'APP',now:at}),at);
  const bound={pageId,shopId:scope.shopId,shopAlias:'LANA',conversationId:row.conversationId,customerHash};
  await runtime.linkProviderConversation(pageId,row.conversationId,'PANCAKE','synthetic-'+randomUUID(),at,new Date(at.getTime()+3600000));
  let sourceVariantChanged=false;
  const product=fixtureProduct('SM613',at);let mediaChanged=false;
  if(candidateTuples){assert(!live);const row=product.snapshot.offers.DIRECT.rows[0];
   product.snapshot.fulfillment_policy={tinh_trang:'READY_STOCK',can_order_when_zero:preorderChoices,prep_min_days:1,prep_max_days:2,
    zero_stock_policy:'',zero_stock_prep_min_days:null,zero_stock_prep_max_days:null,eta_valid_until:'',eta_updated_at:''};
   product.snapshot.offers.DIRECT.rows=['M','L'].flatMap(size=>[
    {...structuredClone(row),size,color:'__NO_COLOR__',parent_variation_id:`SM613-UNLABELLED-${size}`,stock_quantity:9,components:[{product_sku:'SM613',size,color:'__NO_COLOR__',quantity:1}]},
    {...structuredClone(row),size,color:'BE',parent_variation_id:`SM613-BE-${size}`,stock_quantity:0,components:[{product_sku:'SM613',size,color:'BE',quantity:1}]}]);}
  const selected=q=>{if(missingEta&&q.deliveryAddress)return {status:'ETA_UNAVAILABLE',reasonCode:'CONTROLLED_MISSING_REGION',availableSizes:[],availableColors:[]};
   if(candidateTuples){const raw=structuredClone(product.snapshot);if(sourceVariantChanged)raw.offers.DIRECT.rows[0].components[0].variation_sku='CHANGED-SKU';
    return cartSelectionFromSnapshot(raw,q,new Date());}
   const s=fixtureCartLine();s.lineId=q.lineId;s.quantity=q.quantity;s.lineTotalVnd=s.posUnitPriceVnd*s.quantity;
   s.priceAuthority={...s.priceAuthority,shopId:'LANA',priceFactRef:'synthetic-pos-v1',metadata:{...s.priceAuthority.metadata,sourceVersion:'synthetic-pos-v1',observedAt:at.toISOString(),expiresAt:new Date(at.getTime()+172800000).toISOString()}};
   s.components[0]={...s.components[0],size:q.size??'M',color:q.color??'navy',componentSku:'SM613-'+(q.color??'navy').toUpperCase()+'-'+(q.size??'M')};
   if(sourceVariantChanged)s.components[0].componentSku='CHANGED-SOURCE-SKU';
   return {status:'READY',line:s,shopId:'LANA',versions:{price:'synthetic-pos-v1',inventory:'synthetic-stock-v1',size:'synthetic-size-v1',eta:q.deliveryAddress?'synthetic-eta-v1':null},
    eta:q.deliveryAddress?{minDays:3,maxDays:6}:null,etaExpiresAt:q.deliveryAddress?new Date(Date.now()+1200000).toISOString():null,
    sourceAuthority:'POS_SNAPSHOT',stockStatus:'IN_STOCK',stockAvailableQuantity:10,sourceObservedAt:at.toISOString(),sourceExpiresAt:new Date(at.getTime()+172800000).toISOString()};};
  const facts=live?providerPorts.factsForMode(sourceMode):{ready:async()=>true,close:async()=>{},resolve:async()=>{throw new Error('UNUSED');},resolveCartSelection:async q=>selected(q)};
  let policyChanged=false,receiptAvailable=true;
  const policy=async(active=false)=>{resolver.invalidate(pageId,'PUBLISHED');const resolved=await resolver.resolve({pageId,channel:'PUBLISHED',
   ...(active?{}:{pin:{scopeType:'SALES_EPISODE',scopeId:bound.conversationId}}),now:new Date()});
   if(!dependencyHoldingReply&&!sizeHoldingReply&&!policyChanged&&!missingDependencyRule)return resolved;
   // Controlled domain input only: never publish/replace the real shop policy.
   const matrix=HandoffMatrixAdminContentV1Schema.parse({schemaVersion:1,kind:'HANDOFF_MATRIX',
    sourceMetadata:resolved.bundle.artifacts.shopPolicy.sourceMetadata,rules:[{reason:missingDependencyRule?'EXCHANGE':sizeHoldingReply?'SIZE_RULE_UNAVAILABLE':'DEPENDENCY_FAILURE',customerMessagePolicy:policyChanged||missingDependencyRule?'SILENT_HANDOFF':'HOLDING_REPLY_THEN_HANDOFF',holdingReply:policyChanged||missingDependencyRule?null:sizeHoldingReply??dependencyHoldingReply,tag:'NHAN_VIEN'}]});
   return {...resolved,bundle:{...resolved.bundle,artifacts:{...resolved.bundle.artifacts,handoffMatrix:matrix}}};};
  if(media)product.product.images=[{url:'https://content.pancake.vn/c3-synthetic-product-back.jpg',role:'PRIMARY',angle:'BACK',imageType:'PRODUCT_ONLY',intents:[],sortOrder:0,qualityScore:null,feedback:false,
   reviewStatus:'APPROVED',metadataVerified:true,sourceContentSha256:'a'.repeat(64),observedAt:at.toISOString()}];
  if(revalidatedMedia){assert(media);product.product.observedAt=new Date(at.getTime()-31*86400000).toISOString();
   product.product.images[0].observedAt=product.product.observedAt;
   product.product.images[0].revalidation={status:'VALID',checkedAt:at.toISOString()};}
  const read=live?await providerPorts.read(bound,policyStore,policy,initialProductCodes,facts):{policy:()=>policy(true),catalog:{readProduct:async()=>mediaChanged?{...product,product:{...product.product,images:[]}}:product,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})},initialProducts:[product.product]};
  const scopedSourceReader=createCommerceHandoffSourceReader({
   product:(id,readPos)=>read.catalog.readProduct(id,readPos),
   profile:async b=>{const r=await runtime.loadOrCreateCustomerProfile(b.pageId,b.customerHash,()=>{throw Error('EXISTING_PROFILE_REQUIRED');},new Date());return {profile:r.profile,fieldEvidence:r.fieldEvidence};},
   size:async id=>commerceSizeSource((await read.catalog.readProduct(id,false)).product,await policy(),read.productGroups),
   selection:q=>{assert.equal(q.shopAlias,bound.shopAlias,'SELECTION_SHOP_SCOPE');return bindCommerceFacts(facts,bound).resolveCartSelection(q,new Date());},
   salesState:async b=>{const r=await runtime.loadOrCreateSalesCycle(b.pageId,b.conversationId,()=>{throw Error('EXISTING_SALES_CYCLE_REQUIRED');},new Date());return r.state;},
   receipt:(id,b)=>createPersistedCommerceReceiptReader({store:runtime,scope:{...bound,recipient:b.recipientHash},conversationKey:bound.conversationId,
    repository:{read:async()=>{const r=await runtime.loadOrCreateSalesCycle(bound.pageId,bound.conversationId,()=>{throw Error('EXISTING_SALES_CYCLE_REQUIRED');},new Date());return r.state;}}})(id),
  });
  const readReplySource=async(source,b)=>{assert.equal(b.pageId,bound.pageId);assert.equal(b.conversationId,bound.conversationId);assert.equal(b.customerHash,bound.customerHash);return scopedSourceReader(source,b);};
  const capture=[],capturePayloads=[],gateCalls=[],deliveryObservations=[];
  const makeDispatcher=()=>new MetaOutboxDispatcher(runtime,new MetaDeliveryAdapter({request:async r=>{
   const b=JSON.parse(r.body);if(b.recipient.id==='synthetic-recipient-'+customerHash){capture.push(b.message.text??'[CODE_IMAGE]');capturePayloads.push(b.message);}return {status:200,headers:{},body:{recipient_id:b.recipient.id,message_id:'captured-'+randomUUID()}};}},{sendEnabled:true}),
   new SinglePageMetaTokenRegistry(pageId,'synthetic-token'),handoffGate(createCommerceMediaPreSendGate({
    base:{authorize:async claim=>{if(claim.conversationId===bound.conversationId)gateCalls.push(claim.responseGroupId);return {status:'ALLOWED',reasonCode:null,blockingTag:null,observedAt:new Date()};}},
    clock:()=>new Date(),allowedHostSuffixes:['content.pancake.vn','lanadesign.vn','fbcdn.net','fbsbx.com'],
    readAuthority:async b=>{const row=await runtime.loadOrCreate(b.pageId,b.customerHash,'APP',()=>{throw Error('DELIVERY_CONVERSATION_REQUIRED');});
     assert.equal(row.conversationId,b.conversationId);return {...row,generation:await inbox.readGeneration(b.pageId,b.customerHash)};},
    policy:async()=>{const r=await policy();assert(r.bundle);return r.bundle;},
    readProduct:async id=>{if(read.catalog.resolveProductCode)assert(await read.catalog.resolveProductCode(id));return (await read.catalog.readProduct(id,false)).product;},
   }),async()=>{const r=await policy();assert(r.bundle);return r.bundle;},()=>receiptAvailable,readReplySource,r=>deliveryObservations.push(r)),{workerId:'c3-b-capture'},undefined,historyStore);
  let dispatcher=makeDispatcher();
  const drain=async()=>{for(let i=0;i<20&&await attemptQueue.dispatch(()=>dispatcher.processOne());i++);};
  // Synthetic customer turns must follow earlier accepted delivery on the same clock.
  // accepted_at is DB-owned; mixing it with the client clock can invert the causal order.
  // This changes fixture inputs only, never production history cutoffs or freshness gates.
  const syntheticNow=async()=>{const r=await pool.query(`SELECT GREATEST(clock_timestamp(),
    COALESCE(MAX(accepted_at)+interval '1 millisecond',clock_timestamp())) AS observed_at
    FROM meta_outbox WHERE page_id=$1 AND conversation_id=$2`,[pageId,bound.conversationId]);return r.rows[0].observed_at;};
  async function turn(text,outputs,{verdict='PASS',inspect=()=>{},beforeCommit=async()=>{},afterVerify=async()=>{},messages=null,loseCommitReply=false,rollbackCommitReply=false,slot='DETERMINISTIC_TURN',testQuoteTask,testQualificationValidator}={}){
   if(attemptQueue.blocked())return attemptQueue.run(slot,()=>{throw Error('BLOCKED_WORK_MUST_NOT_RUN');});
   assert(!live||(!testQuoteTask&&!testQualificationValidator),'TEST_HOOK_FORBIDDEN_IN_PROVIDER_RUN');
   const now=await syntheticNow(),id='stateful-'+randomUUID(),envelope={schemaVersion:1,customerSendEnabled:false,routing:{owner:'APP'},message:{schemaVersion:1,traceId:randomUUID(),eventKey:id,pageId,messageId:id,
    senderId:'synthetic-recipient-'+customerHash,conversationId:'synthetic-meta-conversation',occurredAt:now.toISOString(),isEcho:false,appId:null,text,attachments:[]}};
   const inboundMessages=(messages??[{text,attachments:[]}]).map((m,index)=>({...envelope.message,...m,messageId:id+':'+index,eventKey:id+':'+index}));
   for(const message of inboundMessages)await inbox.enqueue({pageId,metaAppId:'synthetic',eventKey:message.eventKey,providerMessageId:message.messageId,conversationHash:customerHash,occurredAt:now,receivedAt:now,signatureKeyVersion:'synthetic',envelope:{...envelope,message}});
   await pool.query('UPDATE conversation_ingress_heads SET quiet_until=now() WHERE page_id=$1 AND conversation_hash=$2',[pageId,customerHash]);
   // Earlier supersession tests intentionally leave synthetic pending sources. Retire those test-only batches.
   let batch;
   for(let n=0;n<20;n++){batch=await inbox.claimNextBatch('c3-b-stateful',300000);if(!batch||batch.conversationHash===customerHash)break;await inbox.completeBatch(batch);}
   assert(batch&&batch.conversationHash===customerHash,'CURRENT_BATCH');
   let owners=0,verifiers=0,faultInjected=false;const toolResponses=[],diagnostics=[];
   const result=await runPersistedCommerceIngress({batch,fence:batch.generation,scope:bound,store:runtime,inbox,history:historyStore,transaction:async fn=>{await beforeCommit();try{const value=await withTransaction(pool,async client=>{const applied=await fn(client);if(rollbackCommitReply&&!faultInjected){faultInjected=true;throw Error('CONTROLLED_ROLLBACK_REPLY_LOST');}return applied;});if(loseCommitReply&&!faultInjected){faultInjected=true;throw Error('CONTROLLED_COMMIT_REPLY_LOST');}return value;}catch(error){report.composedCommitDiagnostic=/^[A-Z0-9_]{1,128}$/.test(error.message)?error.message:error.name;save();throw error;}},
    ...(phaseC?{captureBoundaryWitness:true}:{}),observeDiagnostics:event=>diagnostics.push(event),
    ...(preparedOffers?{admitPreparedContext:request=>admitPreparedCommerceContext(JSON.parse(readFileSync(resolve(root,'apps/worker/evals/single-agent-commerce-read-only/manifest.json'),'utf8')),'Synthetic verifier transport.',request)}:live&&providerPorts.admitPreparedContext?{admitPreparedContext:providerPorts.admitPreparedContext}:{}),
    ...(phaseC&&providerPorts.evaluationTurn?{evaluationTurn:providerPorts.evaluationTurn}:{}),
    ...(live&&providerFreeze.m.quoteTask?{quoteTask:providerFreeze.m.quoteTask}:testQuoteTask?{quoteTask:testQuoteTask}:{}),read,facts,policy,resolveTagId:()=> 'synthetic-tag',clock:()=>new Date(),
    ...(live?{handoffReply:{approvedHoldingHashes:providerFreeze.m.handoffReply.approvedHoldingHashes}}:deferredHandoff?{handoffReply:{approvedHoldingHashes:[commerceHash(dependencyHoldingReply)]}}:{}),
    ownerPrompt:live?providerPorts.ownerPrompt:'Synthetic owner transport, never a provider run.',verifierPrompt:live?providerPorts.verifierPrompt:'Synthetic verifier transport.',
    owner:async request=>{owners++;inspect(request);toolResponses.push(...request.contents.flatMap(c=>c.parts.flatMap(p=>p.functionResponse?[p.functionResponse]:[])));if(live)return providerPorts.owner(request);
      const next=outputs.shift();if(!next)throw new Error('CONTROLLED_GENERATION_FAILURE');return typeof next==='function'?next(request):next;},
    verifier:async request=>{verifiers++;const v=live?await providerPorts.verifier(request):{result:{verdict,violations:[]}};await afterVerify();return v;}});
   return retainObservedAttempt({result,owners,verifiers,batch,toolResponses,inboundMessages,diagnostics},
    {queue:attemptQueue,slot,validate:testQualificationValidator??validateToolWorkAccounting});
  }
  const state=async()=>(await runtime.loadOrCreateSalesCycle(pageId,bound.conversationId,()=>{throw new Error('STATE_REQUIRED');})).state;
  // Fault injection in the disposable database only: change cart without changing conversation authority.
  const changeStoredCart=async()=>{
   const record=await runtime.loadOrCreateSalesCycle(pageId,bound.conversationId,()=>{throw Error('STATE_REQUIRED');}),next=structuredClone(record.state);
   assert(next.cart?.value.lines.length);next.revision++;next.cart.value.revision++;next.cart.value.lines[0].quantity++;
   const encrypted=cipher.encryptJson(next,`lana:sales-cycle:v1:${pageId}:${bound.conversationId}`,record.expiresAt);
   const changed=await pool.query('UPDATE sales_cycle_states SET state_revision=$3,state_ciphertext=$4,state_nonce=$5,state_auth_tag=$6,state_encrypted_dek=$7,state_key_ref=$8 WHERE page_id=$1 AND conversation_id=$2',
    [pageId,bound.conversationId,next.revision,encrypted.ciphertext,encrypted.nonce,encrypted.authTag,encrypted.encryptedDek,encrypted.keyRef]);assert.equal(changed.rowCount,1);
  };
  return {bound,turn,state,changeStoredCart,capture,capturePayloads,gateCalls,deliveryObservations,drain,syntheticNow,
   readPolicyStatuses:async()=>({transaction:(await policy()).status,active:(await read.policy()).status}),
   restartDelivery:()=>{dispatcher=makeDispatcher();},changeVariantSource:()=>{sourceVariantChanged=true;},changeMediaSource:()=>{mediaChanged=true;},changeHandoffPolicy:()=>{policyChanged=true;},disableReceiptRead:()=>{receiptAvailable=false;},
   revokeMediaProof:()=>{assert(revalidatedMedia);product.product.images[0].revalidation={status:'INVALID'};},
   refreshPosSource:mode=>{product.snapshot.synced_at=new Date(mode==='expired'?Date.now()-3*3600000:Date.now()).toISOString();
    if(mode==='stock-change')product.snapshot.offers.DIRECT.rows[0].stock_quantity=1;}};
 }
 const native=(calls)=>({kind:'TOOLS',calls,content:{role:'model',parts:calls.map(c=>({functionCall:c}))}}),say=text=>({kind:'FINAL',text});
 await check('B composed evidence read prepares current facts with one charged work unit and actual accepted Outbox',async()=>{
  const j=await statefulFixture({preparedOffers:true});
  const r=await j.turn('Áo này bao nhiêu em?',[request=>{assert.equal(request.toolBudget.callsRemaining,5);assert(request.context.protectedClaims.some(c=>c.type==='PRICE'));return say('Áo giá 499.000đ chị nhé.');}]);
  assert.equal(r.result.terminal.disposition,'SEND_ELIGIBLE');assert.equal(r.result.normalToolCalls,1);await j.drain();assert.equal(j.capture.length,1);
  assert(r.diagnostics.some(e=>e.stage==='FINAL_GATE'&&e.status==='SEND_ELIGIBLE'));
 });
 await check('B composed evidence read source change after verifier cannot enqueue prepared evidence',async()=>{
  const j=await statefulFixture({preparedOffers:true});
  const r=await j.turn('Áo này bao nhiêu em?',[say('Áo giá 499.000đ chị nhé.')],{afterVerify:async()=>j.refreshPosSource('stock-change')});
  assert.notEqual(r.result.terminal.disposition,'SEND_ELIGIBLE');await j.drain();assert.equal(j.capture.length,0);
  assert(r.diagnostics.some(e=>e.stage==='CURRENT_READBACK'&&e.status==='ERROR'));
 });
 await check('B composed evidence read ambiguous tuple shares owner and verifier evidence without a cart mutation',async()=>{
  const j=await statefulFixture({candidateTuples:true,preorderChoices:true});
  const r=await j.turn('Chị lấy áo size L nhé.',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'L',color:null}}]),request=>{
   const proof=request.context.runtimeProducts.find(p=>p.subjectRef==='SM613').selectionEvidence[0];
   assert(proof.options.some(o=>o.color==='BE'&&o.status==='PRE_ORDER'));assert(proof.options.some(o=>o.color==='__NO_COLOR__'&&o.status==='IN_STOCK'));
   return say('Chị chọn màu nào ạ?');}]);
  assert.equal(r.result.terminal.disposition,'SEND_ELIGIBLE');assert.equal((await j.state()).cart,null);await j.drain();assert.equal(j.capture.length,1);
 });
 await check('B composed selection checkout tuple identity supports M plus L without zero-stock color substitution',async()=>{
  const j=await statefulFixture({candidateTuples:true});
  report.selectionCheckoutTrace=[];
  for(const size of ['L','M']){const r=await j.turn(`Chị lấy size ${size}`,[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size}}]),say('Em đã thêm áo vào giỏ.')]);
   report.selectionCheckoutTrace.push({size,owners:r.owners,terminal:r.result.terminal,toolResponses:r.toolResponses,cart:(await j.state()).cart?.value});save();
   assert.equal(r.result.terminal.disposition,'SEND_ELIGIBLE',JSON.stringify(r.result));await j.drain();}
  const state=await j.state();assert.equal(state.cart.value.lines.length,2);
  assert.deepEqual(state.cart.value.lines.map(l=>l.components[0].size).sort(),['L','M']);
  assert(state.cart.value.lines.every(l=>l.quantity===1&&l.components[0].color==='__NO_COLOR__'));
 });
 await check('B composed selection checkout natural COD persists privately without consuming the name retry',async()=>{
  const j=await statefulFixture();await j.turn('Chị lấy áo navy M',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy'}}]),say('Dạ chị.')]);await j.drain();
  await j.turn('Chốt đơn cho chị',[native([{name:'confirm_purchase',args:{}}])]);await j.drain();
  const r=await j.turn('Chị muốn trả khi nhận hàng.',[]);await j.drain();
  assert.equal(r.owners,0);assert.equal(r.verifiers,0);const state=await j.state();assert.equal(state.checkoutDraft.paymentMethod,'COD');
  assert.equal(state.checkoutDraft.fullName,null);assert.equal(state.clarification.attemptCount,1);assert.deepEqual(state.clarification.missingFields,['FULL_NAME']);
  const blocked=await j.turn('Không COD',[]);await j.drain();assert.equal(blocked.owners,0);
  assert.deepEqual((await j.state()).clarification.missingFields,['PAYMENT_METHOD']);
  await j.turn('Tên: Khách thử nghiệm',[]);await j.drain();
  assert.deepEqual((await j.state()).clarification.missingFields,['PAYMENT_METHOD']);assert.equal((await j.state()).preview,null);
  await j.turn('Chị chọn COD nhé',[]);await j.drain();assert.equal((await j.state()).checkoutDraft.paymentMethod,'COD');
  assert.deepEqual((await j.state()).clarification.missingFields,['PHONE']);
 });
 await check('B composed C remediation active reads do not consume the durable transaction pin',async()=>{
  const j=await statefulFixture();assert.deepEqual(await j.readPolicyStatuses(),{transaction:'PINNED',active:'RESOLVED'});
 });
 await check('B composed C remediation code clarification has a committed receipt and accepted capture after owner',async()=>{
  const {readSessionSnapshot}=await import('../single-agent-commerce-qualification/native-snapshot.mjs');
  const {clarificationCapture}=await import('../single-agent-commerce-qualification/native-terminal.mjs');
  const {publicCheckoutState}=await import('../../dist/single-agent-commerce-public-history.js');
  const j=await statefulFixture();
  await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy'}}]),say('Dạ chị.')]);await j.drain();
  const before=await readSessionSnapshot({runtime,pool,historyStore,session:j}),captureStart=j.capture.length;
  const invitation=await j.turn('Chốt đơn cho chị nhé',[native([{name:'confirm_purchase',args:{}}])]);await j.drain();
  const after=await readSessionSnapshot({runtime,pool,historyStore,session:j});
  assert.equal(invitation.owners,1);assert.equal(invitation.verifiers,0);
  assert(clarificationCapture({result:invitation.result,generations:[{role:'OWNER',status:'OK'}],messages:j.capture.slice(captureStart),images:[],
   receipts:after.receipts.filter(r=>!before.receipts.some(old=>old.operation_id===r.operation_id)),authority:after.authority,state:after.publicState}));
  const cod=await j.turn('Chị trả COD nhé.',[]);await j.drain();assert.equal(cod.owners,0);assert.equal(cod.verifiers,0);
  const intake=publicCheckoutState(await j.state());assert.equal(intake.paymentMethod,'COD');assert(intake.lastQuestion.missingFields.includes('FULL_NAME'));
  assert.equal(intake.lastQuestion.delivery,'UNKNOWN');
 });
 for(const mode of ['committed','conflict','commit-response-lost','rollback-response-lost'])await check('B composed recovery accounting '+mode,async()=>{
  const holding='Bên em kiểm tra rồi báo lại chị nhé.',j=await statefulFixture({dependencyHoldingReply:holding});
  const r=await j.turn('Áo này bao nhiêu em?',[],{loseCommitReply:mode==='commit-response-lost',rollbackCommitReply:mode==='rollback-response-lost',
   beforeCommit:async()=>{if(mode==='conflict')j.changeHandoffPolicy();}});
  const expectedStatus=mode==='committed'?'COMMITTED':mode==='conflict'?'BLOCKED':'UNKNOWN';
  assert.equal(r.result.terminalHandoffCalls,1);assert.equal(r.result.toolCalls,r.result.normalToolCalls+1);
  assert.equal(r.result.handoff.attempts,1);assert.equal(r.result.handoff.status,expectedStatus);assert.equal(r.owners,1);assert.equal(r.verifiers,0);
  assert.equal(r.result.terminal.disposition,mode==='committed'?'HANDOFF':'NO_SEND');
  j.restartDelivery();await j.drain();await j.drain();
  assert.deepEqual(j.capture,[]);
  const committed=['committed','commit-response-lost'].includes(mode);
  const counts=(await pool.query('SELECT (SELECT count(*)::int FROM handoff_events WHERE conversation_id=$1) AS events, (SELECT count(*)::int FROM pancake_tag_outbox WHERE conversation_id=$1) AS tags, (SELECT count(*)::int FROM meta_outbox WHERE conversation_id=$1) AS messages',[j.bound.conversationId])).rows[0];
  assert.deepEqual(counts,{events:committed?1:0,tags:committed?1:0,messages:0});
  const inboxRows=(await pool.query('SELECT status FROM webhook_inbox WHERE inbox_id=ANY($1::uuid[])',[r.batch.inboxIds])).rows;
  assert(inboxRows.every(row=>row.status===(mode==='rollback-response-lost'?'PROCESSING':'PROCESSED')));
  if(mode==='rollback-response-lost')assert.equal(r.result.inboxCompletion,'RECONCILE_REQUIRED');
 });
 for(const kind of ['public','private'])await check('B composed blocked fallback completes Inbox '+kind+' without regeneration',async()=>{
  const j=await statefulFixture({missingDependencyRule:true});
  const r=await j.turn(kind==='private'?'Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\nCOD':'Áo này bao nhiêu em?',[]);
  assert.equal(r.result.terminal.disposition,'NO_SEND');assert.equal(r.result.terminal.text,null);assert.equal(r.result.enqueued,0);
  assert.equal(r.result.inboxCompletion,'COMPLETED');assert.equal(r.owners,kind==='private'?0:1);assert.equal(r.verifiers,0);
  const rows=(await pool.query('SELECT status FROM webhook_inbox WHERE inbox_id=ANY($1::uuid[])',[r.batch.inboxIds])).rows;
  assert(rows.length&&rows.every(row=>row.status==='PROCESSED'));
  assert.equal(await inbox.isBatchCurrent(r.batch),false);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM handoff_events WHERE conversation_id=$1',[j.bound.conversationId])).rows[0].n,0);
  await j.drain();assert.deepEqual(j.capture,[]);
 });
 for(const mode of ['verified','owner-error','source-changed-before-delivery','commit-response-lost','rollback-response-lost','cart-receipt','cart-source-changed'])await check('B composed prepared handoff partial '+mode,async()=>{
  const holding='Bên em sẽ kiểm tra ảnh rồi báo chị nhé.',j=await statefulFixture({deferredHandoff:true,dependencyHoldingReply:holding});
  const cart=mode.startsWith('cart-'),outputs=[native([cart?{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',color:'navy',size:'M',quantity:1}}:
   {name:'read_product',args:{subjectRef:'SM613',offerType:'DIRECT'}},{name:'select_product_media',args:{subjectRef:'SM613',intent:'FEEDBACK'}}])];
  if(mode!=='owner-error')outputs.push(say(cart?'Em đã thêm áo navy size M vào giỏ chị nhé.':'Áo 499.000đ chị nhé.'));
  const r=await j.turn(cart?'Chị lấy áo SM613 navy size M, cho chị xem thêm ảnh khách mặc nhé.':'Áo này bao nhiêu, cho chị xem ảnh khách mặc nhé.',outputs,
   {loseCommitReply:mode==='commit-response-lost',rollbackCommitReply:mode==='rollback-response-lost'});
  assert.equal(r.result.terminal.disposition,mode.includes('response-lost')?'NO_SEND':'HANDOFF',JSON.stringify(r.result));assert.equal(r.result.terminalHandoffCalls,1);
  assert.equal(r.verifiers,mode==='owner-error'?0:1);assert.equal((await j.state()).stage,cart?'CART_OPEN':'DISCOVERY');
  if(mode==='source-changed-before-delivery')j.refreshPosSource('stock-change');
  if(mode==='cart-source-changed')j.changeVariantSource();
  j.restartDelivery();await j.drain();await j.drain();
  if(['owner-error','source-changed-before-delivery','rollback-response-lost','cart-source-changed'].includes(mode))assert.deepEqual(j.capture,[]);
  else {assert.equal(j.capture.length,1,JSON.stringify(j.deliveryObservations));assert.match(j.capture[0],cart?/navy size M/:/499\.000đ/);assert(j.capture[0].includes(holding));}
 });
 for(const mode of ['unchanged','cart-changed'])await check('B composed prepared handoff existing cart '+mode,async()=>{
  const holding='Bên em sẽ kiểm tra ảnh rồi báo chị nhé.',j=await statefulFixture({deferredHandoff:true,dependencyHoldingReply:holding});
  await j.turn('Chị lấy áo SM613 navy size M.',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',color:'navy',size:'M',quantity:1}}]),say('Em đã thêm áo navy size M vào giỏ chị nhé.')]);
  await j.drain();j.capture.length=0;
  const r=await j.turn('Áo trong giỏ bao nhiêu, có ảnh khách mặc không em?',[
   native([{name:'select_product_media',args:{subjectRef:'SM613',intent:'FEEDBACK'}}]),say('Áo navy size M trong giỏ 499.000đ chị nhé.')],
   {inspect:request=>{assert.equal(request.context.effectReceipts.length,0,'NO_MUTATION_IN_THIS_TURN');assert(request.context.cartBinding);}});
  assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));assert.equal(r.verifiers,1);
  if(mode==='cart-changed')await j.changeStoredCart();
  j.restartDelivery();await j.drain();await j.drain();
  if(mode==='cart-changed'){assert.deepEqual(j.capture,[]);assert(j.deliveryObservations.some(o=>o.reasonCode==='C3_HANDOFF_SOURCE_SALES_STATE_CHANGED'));}
  else {assert.equal(j.capture.length,1,JSON.stringify(j.deliveryObservations));assert.match(j.capture[0],/499\.000đ/);assert(j.capture[0].includes(holding));}
 });
 await check('B composed snapshot invalidation source-refresh preserves the exact verified reply without renewing evidence',async()=>{
  const j=await statefulFixture(),draft='Áo 499.000đ chị nhé.';
  const r=await j.turn('Áo SM613 bao nhiêu em?',[native([{name:'read_product',args:{subjectRef:'SM613',offerType:'DIRECT'}}]),say(draft)],
   {afterVerify:async()=>j.refreshPosSource('source-refresh')});
  assert.equal(r.verifiers,1);assert.equal(r.result.terminal.disposition,'SEND_ELIGIBLE',JSON.stringify(r.result));
  assert.equal(r.result.terminal.text,draft);assert.equal((await j.state()).stage,'DISCOVERY');
  j.restartDelivery();await j.drain();await j.drain();assert.deepEqual(j.capture,[draft]);
 });
 for(const mode of ['stock-change','expired'])await check('B composed snapshot invalidation '+mode+' discards draft and hands off without messages',async()=>{
  const text='Em chuyển nhân viên hỗ trợ tiếp cho chị nhé.',j=await statefulFixture({dependencyHoldingReply:text});
  const r=await j.turn('Áo SM613 bao nhiêu em?',[native([{name:'read_product',args:{subjectRef:'SM613',offerType:'DIRECT'}}]),say('Áo 499.000đ chị nhé.')],
   {afterVerify:async()=>j.refreshPosSource(mode)});
  assert.equal(r.verifiers,1);assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));
  j.restartDelivery();await j.drain();await j.drain();assert.deepEqual(j.capture,[]);
  const next=await j.turn('Em ơi',[]);assert.equal(next.owners,0);assert.equal(next.verifiers,0);await j.drain();assert.deepEqual(j.capture,[]);
 });
 for(const mode of ['unchanged','before-commit','after-commit','restart','cached-allowed','receipt-unavailable','lost-commit-reply'])await check('B composed dependency holding delivery '+mode+' uses committed policy and actual capture',async()=>{
  const text='Em chuyển nhân viên hỗ trợ tiếp cho chị nhé.',j=await statefulFixture({dependencyHoldingReply:text});
  const r=await j.turn('Em kiểm tra lại giúp chị nhé',[native([{name:'request_handoff',args:{reason:'DEPENDENCY_FAILURE'}}])],
   {beforeCommit:async()=>{if(mode==='before-commit')j.changeHandoffPolicy();},loseCommitReply:mode==='lost-commit-reply'});
  if(mode==='before-commit'){
   // The old HOLDING decision must not commit. A later recovery may hand off
   // under the newly current SILENT policy, without any acknowledgement group.
   const events=(await pool.query('SELECT reason_detail_safe FROM handoff_events WHERE conversation_id=$1',[j.bound.conversationId])).rows;
   assert(events.length<=1);assert(events.every(e=>!e.reason_detail_safe.deliveryBindingHash));
   report.policyBeforeCommitDiagnostic={terminal:r.result.terminal,enqueued:r.result.enqueued,events};save();
   assert.notEqual(r.result.terminal.text,text,'OLD_HOLDING_DECISION_MUST_NOT_SURVIVE');
  }else{
   assert.equal(r.result.terminal.disposition,mode==='lost-commit-reply'?'NO_SEND':'HANDOFF');
   if(mode!=='lost-commit-reply')assert.equal(r.result.enqueued,1);
   if(mode==='cached-allowed'){
    const row=(await pool.query('SELECT response_group_id,reply_plan_id FROM meta_outbox WHERE conversation_id=$1',[j.bound.conversationId])).rows[0];
    await runtime.recordMetaResponseGroupGate({responseGroupId:row.response_group_id,replyPlanId:row.reply_plan_id,conversationId:j.bound.conversationId,pageId,
     observation:{status:'ALLOWED',reasonCode:null,blockingTag:null,observedAt:new Date()}});
   }
   if(['after-commit','restart','cached-allowed'].includes(mode))j.changeHandoffPolicy();
   if(mode==='receipt-unavailable')j.disableReceiptRead();
   if(['restart','cached-allowed','lost-commit-reply'].includes(mode))j.restartDelivery();
  }
  await j.drain();await j.drain();
  const expected=['unchanged','lost-commit-reply'].includes(mode)?[text]:[];
  assert.deepEqual(j.capture,expected);if(mode==='before-commit')assert(!j.capture.includes(text));
  if(['after-commit','restart','cached-allowed','receipt-unavailable'].includes(mode))assert.equal((await pool.query("SELECT count(*)::int AS n FROM meta_outbox WHERE conversation_id=$1 AND status='MANUAL_REVIEW'",[j.bound.conversationId])).rows[0].n,1);
 });
 if(process.argv.includes('--candidate-handoff'))for(const reason of ['CUSTOMER_REQUESTED_HUMAN','SIZE_RULE_UNAVAILABLE'])
 await check('B composed candidate first '+reason+' commits silently and does not resume after handoff',async()=>{
  const matrix=JSON.parse(readFileSync(new URL('./handoff-matrix.candidate.json',import.meta.url))),holding=matrix.rules.find(r=>r.reason===reason).holdingReply;
  const j=await statefulFixture(),r=await j.turn('Cho chị gặp nhân viên nhé',[native([{name:'request_handoff',args:{reason}}])]);
  assert.equal(r.result.terminal.disposition,'HANDOFF');assert.equal(r.result.terminal.text,null);assert.equal(r.result.enqueued,0);assert.equal(r.verifiers,0);
  await j.drain();await j.drain();assert.deepEqual(j.capture,[]);
  assert.equal((await runtime.loadOrCreate(pageId,j.bound.customerHash,'APP',()=>null)).state.conversationOwner,'HUMAN');
  const replay=await j.turn('Em ơi',[]);assert.equal(replay.owners,0);assert.equal(replay.verifiers,0);assert.equal(replay.result.enqueued,0);
  await j.drain();assert.deepEqual(j.capture,[]);
 });
 await check('B composed no-chart fallback hands off without text or images even under a holding policy',async()=>{
  const holding='Shop đã nhận yêu cầu chọn size.',j=await statefulFixture({media:true,sizeHoldingReply:holding});
  const r=await j.turn('Chọn size SM613 và gửi ảnh chị nhé',[
   native([{name:'read_product',args:{subjectRef:'SM613'}},{name:'read_product',args:{subjectRef:'SM613'}}]),
   native([{name:'select_product_media',args:{subjectRef:'SM613',intent:'BACK'}},{name:'recommend_size',args:{subjectRef:'SM613'}},{name:'read_product',args:{subjectRef:'SM613'}}])]);
  assert.equal(r.owners,2);assert.equal(r.verifiers,0);assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));
  assert.equal(r.result.terminal.reason,'SIZE_RULE_UNAVAILABLE');await j.drain();
   assert.equal(r.result.enqueued,0,JSON.stringify(r.result));
   assert.deepEqual(j.capture,[]);assert.equal(r.result.terminal.text,null);
   assert.equal(j.gateCalls.length,0);await j.drain();assert.equal(j.capture.length,0);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM handoff_events WHERE conversation_id=$1',[j.bound.conversationId])).rows[0].n,1);
  assert.equal((await runtime.loadOrCreate(pageId,j.bound.customerHash,'APP',()=>null)).state.conversationOwner,'HUMAN');
 });
 for(const fault of ['source','rollback'])await check('B composed mixed media handoff '+fault+' never leaves partial intents',async()=>{
  if(!process.argv.includes('--candidate-handoff'))return;
  const j=await statefulFixture({media:true,sizeHoldingReply:'Shop đã nhận yêu cầu chọn size.'});let commits=0;
  const r=await j.turn('Cho chị xem ảnh SM613 và chọn size nhé',[
   native([{name:'select_product_media',args:{subjectRef:'SM613',intent:'BACK'}},{name:'recommend_size',args:{subjectRef:'SM613'}}])],
   {beforeCommit:async()=>{if(++commits===1){if(fault==='source')j.changeMediaSource();else await pool.query("DELETE FROM provider_conversation_links WHERE conversation_id=$1 AND provider='PANCAKE'",[j.bound.conversationId]);}}});
  assert.notEqual(r.result.terminal.disposition,'SEND_ELIGIBLE');await j.drain();assert(!j.capture.includes('[CODE_IMAGE]'));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM handoff_events WHERE conversation_id=$1',[j.bound.conversationId])).rows[0].n,fault==='source'?1:0);
  assert.equal((await runtime.loadOrCreate(pageId,j.bound.customerHash,'APP',()=>null)).state.conversationOwner,fault==='source'?'HUMAN':'BOT');
 });
 for(const fault of ['unchanged','source','revision'])await check('B composed mixed media fallback remains silent after '+fault+' and restart',async()=>{
  if(!process.argv.includes('--candidate-handoff'))return;
  const j=await statefulFixture({media:true,sizeHoldingReply:'Shop đã nhận yêu cầu chọn size.'});
  const r=await j.turn('Cho chị xem ảnh SM613 và chọn size nhé',[
   native([{name:'select_product_media',args:{subjectRef:'SM613',intent:'BACK'}},{name:'recommend_size',args:{subjectRef:'SM613'}}])]);
  assert.equal(r.result.enqueued,0,JSON.stringify(r.result));assert.equal(j.capture.length,0);
  if(fault==='source')j.changeMediaSource();
  if(fault==='revision')await pool.query("UPDATE conversations SET state_version=state_version+1,state_snapshot=jsonb_set(state_snapshot,'{revision}',to_jsonb(state_version+1)) WHERE conversation_id=$1",[j.bound.conversationId]);
  j.restartDelivery();await j.drain();await j.drain();
  const rows=(await pool.query('SELECT response_group_id,sequence_no,status FROM meta_outbox WHERE conversation_id=$1 ORDER BY sequence_no',[j.bound.conversationId])).rows;
  assert.deepEqual(rows,[]);assert.deepEqual(j.capture,[]);assert.equal(j.gateCalls.length,0);
  report.mediaDeliveryChecks??=[];report.mediaDeliveryChecks.push({fault,captured:j.capture,rows});save();
 });
 await check('B composed N1 single-field private checkout keeps bare answers out of both models and public history',async()=>{
  const j=await statefulFixture();
  await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy'}}]),say('Dạ chị.')]);await j.drain();
  const invitation=await j.turn('Chốt đơn cho chị nhé',[native([{name:'confirm_purchase',args:{}}])]);
  assert.equal(invitation.result.enqueued,1,JSON.stringify(invitation.result));assert.deepEqual((await j.state()).clarification.missingFields,['FULL_NAME']);await j.drain();
  for(const [text,next] of [['Nguyễn Thị Lan','PHONE'],['0900000001','ADDRESS'],['12 Đường thử nghiệm, Quận 1, TP Hồ Chí Minh','PAYMENT_METHOD'],['COD',null]]){
   const r=await j.turn(text,[]);assert.equal(r.owners,0);assert.equal(r.verifiers,0);assert(r.result.enqueued>0,JSON.stringify(r.result));
   const state=await j.state();if(next)assert.deepEqual(state.clarification.missingFields,[next]);else assert.equal(state.stage,'ORDER_PREVIEW');await j.drain();
  }
  const history=await historyStore.listConversationHistory(j.bound.conversationId,{limit:30});
  // Accepted private preview is retained by the existing authorized history store; public model projection must drop it whole.
  const publicHistory=commerceHistory(history),inbound=history.filter(m=>m.direction==='INBOUND');
  for(const rows of [publicHistory,inbound]){assert(!JSON.stringify(rows).includes('Nguyễn Thị Lan'));assert(!JSON.stringify(rows).includes('0900000001'));assert(!JSON.stringify(rows).includes('12 Đường thử nghiệm'));}
 });
 for(const fault of ['unchanged','revoked-before-delivery'])await check('B composed revalidated media '+fault+' uses actual Outbox capture',async()=>{
  const j=await statefulFixture({media:true,revalidatedMedia:true});
  const r=await j.turn('Cho chị xem mặt sau SM613 nhé',[native([{name:'select_product_media',args:{subjectRef:'SM613',intent:'BACK'}}]),say('Ảnh mặt sau đây chị nhé.')]);
  assert.equal(r.result.enqueued,2,JSON.stringify(r.result));
  if(fault==='revoked-before-delivery')j.revokeMediaProof();
  j.restartDelivery();await j.drain();await j.drain();
  assert.deepEqual(j.capture,fault==='unchanged'?['Ảnh mặt sau đây chị nhé.','[CODE_IMAGE]']:[]);
  const rows=(await pool.query('SELECT status FROM meta_outbox WHERE conversation_id=$1 ORDER BY sequence_no',[j.bound.conversationId])).rows;
  assert.equal(rows.length,2);assert(rows.every(row=>row.status===(fault==='unchanged'?'SENT_ACCEPTED':'MANUAL_REVIEW')),JSON.stringify(rows));
 });
 await check('B composed N4 sends exact text and selected image in one response group without replay duplicates',async()=>{
  const j=await statefulFixture({media:true});
  const r=await j.turn('Cho chị xem mặt sau SM613 nhé',[native([{name:'select_product_media',args:{subjectRef:'SM613',intent:'BACK'}}]),say('Ảnh mặt sau đây chị nhé.')]);
  assert.equal(r.result.enqueued,2,JSON.stringify(r.result));await j.drain();await j.drain();
  assert.deepEqual(j.capture,['Ảnh mặt sau đây chị nhé.','[CODE_IMAGE]']);
  assert.equal(new Set(j.gateCalls).size,1);assert(j.capturePayloads[1].attachment.payload.url.endsWith('c3-synthetic-product-back.jpg'));
  const mediaCutoff=await j.syntheticNow();
  const delivered=await runtime.readAcceptedCommerceMedia({pageId,conversationId:j.bound.conversationId,customerHash:j.bound.customerHash,
    recipientHash:hash('synthetic-recipient-'+j.bound.customerHash),before:mediaCutoff});
  assert.equal(delivered.length,1);assert.equal(delivered[0].productId,'SM613');
  assert.equal(delivered[0].assetRef,'asset:'+hash(JSON.stringify(j.capturePayloads[1].attachment.payload.url)));
  assert(!JSON.stringify(delivered).includes('https:'));
  const other=await runtime.readAcceptedCommerceMedia({pageId,conversationId:j.bound.conversationId,customerHash:hash('other'),
    recipientHash:hash('synthetic-recipient-'+j.bound.customerHash),before:mediaCutoff});
  assert.equal(other.length,0);
  let seenHistory,followup;const reads=[],readMedia=runtime.readAcceptedCommerceMedia;
  runtime.readAcceptedCommerceMedia=async query=>{
   const clientBefore=new Date().toISOString();
   try{const rows=await readMedia.call(runtime,query);if(query.conversationId===j.bound.conversationId)reads.push({before:query.before.toISOString(),
    rowCount:rows.length,scope:{pageId:query.pageId,conversationId:query.conversationId,customerHash:query.customerHash,recipientHash:query.recipientHash},
    clientBefore,clientAfter:new Date().toISOString()});return rows;}
   catch(error){reads.push({before:query.before.toISOString(),errorCode:'MEDIA_READ_ERROR',clientBefore,clientAfter:new Date().toISOString()});throw error;}
  };
  try{followup=await j.turn('Cả bộ bao nhiêu em?', [request=>{seenHistory=request.contents;return say('Dạ chị.');}]);}
  finally{runtime.readAcceptedCommerceMedia=readMedia;}
  const clientBeforeDbClock=new Date().toISOString(),dbClock=(await pool.query('SELECT clock_timestamp() AS observed_at')).rows[0].observed_at;
  report.n4HistoryDiagnostic={reads,acceptedAt:delivered.map(m=>m.occurredAt),inboundOccurredAt:followup.inboundMessages[0].occurredAt,
   syntheticClockPolicy:'DB_CLOCK_STRICTLY_AFTER_PRIOR_ACCEPTED_DELIVERY',
   // The synthetic enqueue above deliberately uses the same now for occurredAt/receivedAt.
   inputReceivedAt:followup.inboundMessages[0].occurredAt,clientBeforeDbClock,dbClock:dbClock.toISOString(),clientAfterDbClock:new Date().toISOString(),
   owners:followup.owners,terminal:followup.result.terminal,history:seenHistory??null};save();
  assert(JSON.stringify(seenHistory).includes('RECENT_SHOP_IMAGES_ACCEPTED'),'N4_HISTORY_MISSING; see n4HistoryDiagnostic');
  assert(delivered.every(m=>Date.parse(m.occurredAt)<Date.parse(followup.inboundMessages[0].occurredAt)),'N4_SYNTHETIC_CAUSAL_ORDER');
 });
 await check('B composed N5 image-first text-last handoff links the attachment history and retains encrypted source',async()=>{
  const j=await statefulFixture(),r=await j.turn(null,[],{messages:[{text:null,attachments:[{type:'image',url:'https://content.pancake.vn/c3-private-receipt.jpg',providerId:'synthetic-receipt'}]},
   {text:'Chị gửi rồi nhé',attachments:[]}]});
  assert.equal(r.owners,0);assert.equal(r.verifiers,0);assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));
  const h=(await pool.query(`SELECT h.trigger_message_pk,m.attachment_count,m.text_redacted FROM handoff_events h JOIN messages m ON m.message_pk=h.trigger_message_pk WHERE h.conversation_id=$1`,[j.bound.conversationId])).rows;
  assert.equal(h.length,1);assert.equal(h[0].attachment_count,1);assert(!h[0].text_redacted?.includes('private-receipt'));
  assert.equal(r.batch.items[0].envelope.message.attachments[0].providerId,'synthetic-receipt');
  assert.equal(await inbox.isBatchCurrent(r.batch),false);
  await j.drain();await j.drain();
  if(process.argv.includes('--candidate-handoff'))assert.deepEqual(j.capture,[]);
  assert(!JSON.stringify(j.capturePayloads).includes('c3-private-receipt'));
 });
 await check('B composed N7 one negotiation event updates the persisted quote and cart reprice retains its evidence',async()=>{
  const j=await statefulFixture();await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy'}}]),say('Dạ chị.')]);await j.drain();
  const r=await j.turn('Giá hơi cao, bớt cho chị được không?',[native([{name:'record_negotiation',args:{intent:'PRICE_OBJECTION',sourceQuote:'Giá hơi cao'}},
   {name:'record_negotiation',args:{intent:'PRICE_OBJECTION',sourceQuote:'bớt cho chị được không?'}}]),say('Dạ chị.')]);
  assert.equal(r.result.enqueued,1,JSON.stringify(r.result));const before=await j.state();assert.equal(before.negotiation.customerState,'HESITANT');
  assert.equal(before.negotiation.consumedObjectionEvidenceIds.length,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM sales_cycle_events WHERE conversation_id=$1 AND command_kind='NEGOTIATION_EVENT'",[j.bound.conversationId])).rows[0].n,1);
  await j.drain();const line=before.cart.value.lines[0];
  const changed=await j.turn('Cho chị hai chiếc nhé',[native([{name:'change_cart_item',args:{subjectRef:line.lineId,action:'SET_QUANTITY',quantity:2}}]),say('Dạ chị.')]);
  assert.equal(changed.result.enqueued,1,JSON.stringify(changed.result));const after=await j.state();assert.equal(after.negotiation.customerState,before.negotiation.customerState);
  assert.deepEqual(after.negotiation.consumedObjectionEvidenceIds,before.negotiation.consumedObjectionEvidenceIds);
 });
 await check('B composed generation failure preserves committed cart and silently hands off without replay',async()=>{
  const j=await statefulFixture(),r=await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy',quantity:1}}])]);
  assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));
  assert.equal(r.owners,2);assert.equal(r.verifiers,0);assert.equal(r.result.enqueued,0);
  const stored=await j.state();assert.equal(stored.cart.value.lines[0].quantity,1);
  assert.equal(r.result.terminal.text,null);
  await j.drain();await j.drain();assert.deepEqual(j.capture,[]);assert.equal(j.gateCalls.length,0);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM handoff_events WHERE conversation_id=$1',[j.bound.conversationId])).rows[0].n,1);
 });
 let journey;
 await check('B composed ingress commits an open cart, authorizes the exact reply and captures delivery once',async()=>{
  journey=await statefulFixture();const r=await journey.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy',quantity:1}}]),say('Em đã thêm áo vào giỏ cho chị.')]);
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
  const r=await journey.turn('Số đo chị là eo 74, mông 96. Chị vẫn lấy size L nhé.',[native([{name:'apply_customer_state',args:{ops:[{op:'SET',field:'measurements.WAIST_CM',value:74,sourceQuote:'74'},{op:'SET',field:'measurements.HIPS_CM',value:96,sourceQuote:'96'}]}}]),say(text)],{inspect:req=>{
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
  const capturedBefore=journey.capture.length;
  const r=await journey.turn('Chốt đơn cho chị nhé',[native([{name:'confirm_purchase',args:{}}])],{inspect:request=>{
   assert(!JSON.stringify(request).includes('Khách thử nghiệm'),'PRIVATE_NAME_HISTORY_LEAK');assert(!JSON.stringify(request).includes('0900000000'),'PRIVATE_PHONE_HISTORY_LEAK');}});
  assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));assert.equal((await journey.state()).stage,'PURCHASE_CONFIRMED');
  assert.equal((await runtime.loadOrCreate(pageId,journey.bound.customerHash,'APP',()=>null)).state.conversationOwner,'HUMAN');
  if(process.argv.includes('--candidate-handoff')){assert.equal(r.result.enqueued,0);await journey.drain();assert.equal(journey.capture.length,capturedBefore);}
 });
 await check('B composed later failed mutation hands off the partial committed result, without replay',async()=>{
  const j=await statefulFixture();await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy'}}]),say('Em đã thêm áo vào giỏ cho chị.')]);await j.drain();
  const line=(await j.state()).cart.value.lines[0],r=await j.turn('Lấy hai chiếc cho chị nhé',[native([{name:'change_cart_item',args:{subjectRef:line.lineId,action:'SET_QUANTITY',quantity:2}},
   {name:'change_cart_item',args:{subjectRef:line.lineId,action:'SET_QUANTITY',quantity:0}}]),say('Để em kiểm tra lại.')],{verdict:'UNCERTAIN'});
  assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));assert.equal((await j.state()).cart.value.lines[0].quantity,2);
  const counts=(await pool.query('SELECT count(*)::int AS n FROM handoff_events WHERE conversation_id=$1',[j.bound.conversationId])).rows[0];assert.equal(counts.n,1);
  const next=await j.turn('Em ơi',[]);assert.equal(next.owners,0);assert.equal(next.result.terminal.disposition,'NO_SEND');
 });
 await check('B composed missing private checkout evidence commits a real handoff with zero model requests and completes the source',async()=>{
  const j=await statefulFixture({missingEta:true});await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy'}}]),say('Em đã thêm áo vào giỏ cho chị.')]);await j.drain();
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
 await check('B composed configured private dependency fallback overrides holding and commits silently',async()=>{
  const text='Nhân viên sẽ kiểm tra thông tin nhận hàng của chị.',j=await statefulFixture({missingEta:true,dependencyHoldingReply:text});
  await j.turn('Chị lấy áo navy size M',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy',quantity:1}}]),say('Dạ chị.')]);
  await j.drain();
  const before=j.capture.length,r=await j.turn('Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\nCOD',[]);
  assert.equal(r.owners,0);assert.equal(r.verifiers,0);assert.equal(r.result.terminal.disposition,'HANDOFF');assert.equal(r.result.enqueued,0);
  await j.drain();
  assert.deepEqual(j.capture.slice(before),[]);assert.equal(r.result.terminal.text,null);assert.equal(await inbox.isBatchCurrent(r.batch),false);
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
  const j=await statefulFixture();const r=await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy'}}]),say('Em đã thêm áo vào giỏ cho chị.')],{afterVerify:async()=>j.changeVariantSource()});
  assert.equal(r.result.terminal.disposition,'HANDOFF',JSON.stringify(r.result));assert.equal(r.result.terminal.text,null);
  assert.equal(r.result.recovery.originalReason,'STALE');assert.equal(r.result.enqueued,0);assert.equal(await inbox.isBatchCurrent(r.batch),false);
  const counts=(await pool.query('SELECT (SELECT count(*)::int FROM handoff_events WHERE conversation_id=$1) AS events, (SELECT count(*)::int FROM pancake_tag_outbox WHERE conversation_id=$1) AS tags, (SELECT count(*)::int FROM meta_outbox WHERE conversation_id=$1) AS messages',[j.bound.conversationId])).rows[0];
  assert.deepEqual(counts,{events:1,tags:1,messages:0});
  assert.equal((await runtime.loadOrCreate(pageId,j.bound.customerHash,'APP',()=>null)).state.conversationOwner,'HUMAN');
 });
 await check('B composed clarification rollback refuses to destroy existing append-only events',async()=>{
  // This check must also work when selected alone after an earlier acceptance
  // failure. Create its real clarification prerequisite through the same ports.
  if(Number((await pool.query("SELECT count(*) AS n FROM sales_cycle_events WHERE command_kind IN ('CLARIFICATION_REQUESTED','CLARIFICATION_RESOLVED')")).rows[0].n)===0){
   const j=await statefulFixture();
   await j.turn('Chị lấy áo SM613 navy size M nhé',[native([{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',color:'navy'}}]),say('Dạ chị.')]);
   const r=await j.turn('Chốt đơn cho chị nhé',[native([{name:'confirm_purchase',args:{}}])]);
   assert.equal(r.result.terminal.reason,'CHECKOUT_DETAILS_MISSING');
  }
  const definition=await commandConstraint(),count=Number((await pool.query("SELECT count(*) AS n FROM sales_cycle_events WHERE command_kind IN ('CLARIFICATION_REQUESTED','CLARIFICATION_RESOLVED')")).rows[0].n);assert(count>0);
  await assert.rejects(withTransaction(pool,client=>client.query(clarificationDown)),/SALES_CLARIFICATION_EVENTS_REQUIRE_COMPATIBLE_SCHEMA/);
  assert.equal(await commandConstraint(),definition);assert.equal(Number((await pool.query("SELECT count(*) AS n FROM sales_cycle_events WHERE command_kind IN ('CLARIFICATION_REQUESTED','CLARIFICATION_RESOLVED')")).rows[0].n),count);
 });
 await check('B qualification shared queue preserves an invalid observed attempt without later dispatch',async()=>{
  const first=await statefulFixture(),second=await statefulFixture();
  const before=(await pool.query('SELECT count(*)::int AS n FROM meta_outbox')).rows[0].n;
  const invalid=await first.turn('Em ơi',[say('Dạ chị.')],{slot:'qualification-first',testQualificationValidator:()=>{throw Error('TOOL_WORK_COUNTER');}});
  assert.equal(invalid.qualification.status,'INVALID');assert(invalid.result.generations.length>0);
  const rows=await pool.query('SELECT outbox_id,status FROM meta_outbox ORDER BY outbox_id');
  assert(rows.rows.length>before,'OBSERVED_COMMIT_REQUIRED');
  await first.drain();await second.drain();first.restartDelivery();await first.drain();
  const blocked=await second.turn('Em ơi',[()=>{throw Error('BLOCKED_GENERATION_EXECUTED');}],{slot:'qualification-second'});
  assert.equal(blocked.executionStatus,'NOT_RUN_BY_QUALIFICATION');assert.equal(blocked.result,undefined);
  assert.deepEqual((await pool.query('SELECT outbox_id,status FROM meta_outbox ORDER BY outbox_id')).rows,rows.rows);
  assert.deepEqual(first.capture,[]);assert.deepEqual(second.capture,[]);
  assert.deepEqual(summarizeAttemptQualification([invalid,blocked]),{registered:2,executed:1,notRun:1,observedTerminals:{SEND_ELIGIBLE:1},unknownTerminals:0,qualificationErrors:1});
 });
 if(phaseCInitial)await check('C initial state capture uses real native stores without generation',async()=>{
  assert(initialWorld,'C_INITIAL_WORLD_REQUIRED');
  const fixture=await statefulFixture({live:true,initialProductCodes:[initialWorld.products[0].canonicalCode]}),
   captured=await phaseCTools.readSessionSnapshot({runtime,pool,historyStore,session:fixture});
  assert.equal(captured.publicHistory.history.length,0);assert.equal(providerPorts.observed().length,0);
  const {digest}=await import('../single-agent-commerce-qualification/qualification.mjs');
  report.initialStateArtifact={kind:'REAL_ADAPTER_NATIVE_INITIAL_STATE',worldHash:digest(initialWorld),sourceSha:report.sourceSha,sourceDirty:report.sourceDirty,
   publicState:captured.publicState,providerRequests:0,testDatabaseDropped:false};
 });
 if(phaseC){
  assert(phaseCArg('--phase-c-seed'),'C_SEED_REQUIRED');
  const snapshot=session=>phaseCTools.readSessionSnapshot({runtime,pool,historyStore,session});
  const collected=await phaseCTools.collectNativePopulation({preflight:providerFreeze,providerPorts,sessionFactory:statefulFixture,snapshot,historyStore,
   out:resolve(out),seedPath:phaseCArg('--phase-c-seed'),queue:attemptQueue});
  report.phaseC={status:'COLLECTED_NOT_GRADED',candidateNativeScenarios:collected.attempts.length,
   auxiliaryHttp:collected.auxiliaryHttp};report.providerGenerations=collected.providerRequests;
  if(phaseCDiagnostic){
   report.kind='DEVELOPMENT_ONLY_NOT_QUALIFICATION';
   if(!providerFreeze.sealed.slots.some(s=>s.mode==='SAFETY')){
    report.diagnosticProbe={kind:'DEVELOPMENT_ONLY_NOT_SAFETY_GATE',status:'NOT_REGISTERED',reason:'FULL_NATIVE_ONLY'};
   }else if(!attemptQueue.blocked()&&!providerFreeze.diagnosticControl.blocked()){
    const probeDir=resolve(out,'diagnostic-probe');mkdirSync(probeDir);
    report.diagnosticProbe=await collectSafety({preflight:providerFreeze,provider:providerPorts,out:probeDir});
    // A singleton diagnostic probe must never be mistaken for the qualification SAFETY gate.
    report.diagnosticProbe.kind='DEVELOPMENT_ONLY_NOT_SAFETY_GATE';
    writeFileSync(resolve(probeDir,'DIAGNOSTIC_PROBE_SUMMARY.json'),JSON.stringify(report.diagnosticProbe,null,2));
   }else report.diagnosticProbe={kind:'DEVELOPMENT_ONLY_NOT_SAFETY_GATE',status:'NOT_RUN',reason:'BATCH_STOPPED'};
   report.providerGenerations=providerPorts.observed().reduce((n,g)=>n+g.providerRequests,0);
   report.diagnosticStop=providerFreeze.diagnosticControl.reason();
  }
 }else if(providerRun){
  const journeys=new Map(),qualifiedAttempts=[];report.outcomes=[];
  let invitationSucceeded=false;
  const selectedCases=process.argv.includes('--opening-only')?providerFreeze.cases.slice(0,1):providerFreeze.cases;
  for(const [index,c] of selectedCases.entries()){
   if(attemptQueue.blocked()){
    const attempt=await attemptQueue.run(c.caseId,()=>{throw Error('BLOCKED_WORK_MUST_NOT_RUN');});
    const blocked={caseId:c.caseId,journeyId:c.journeyId,sourceMode:c.sourceMode??'LIVE',...attempt,counts:{...providerPorts.counters}};
    writeFileSync(resolve(out,'provider-attempt-'+(index+1)+'.json'),JSON.stringify(blocked,null,2),{flag:'wx'});
    qualifiedAttempts.push(attempt);report.outcomes.push({caseId:c.caseId,...attempt});save();continue;
   }
   providerPorts.setSlot(c.caseId);const beforeCounts={...providerPorts.counters};
   const started=performance.now();let j=journeys.get(c.journeyId);
   if(!j){try{j=await statefulFixture({live:true,initialProductCodes:c.runtime.initialProductCodes,sourceMode:c.sourceMode??'LIVE'});journeys.set(c.journeyId,j);}
    catch(error){const attempt=unobservedAttempt(error,{queue:attemptQueue,slot:c.caseId});qualifiedAttempts.push(attempt);
     writeFileSync(resolve(out,'provider-attempt-'+(index+1)+'.json'),JSON.stringify({caseId:c.caseId,journeyId:c.journeyId,...attempt,counts:{...providerPorts.counters}},null,2),{flag:'wx'});
     report.outcomes.push({caseId:c.caseId,...attempt});save();continue;}}
   const capturedBefore=j.capture.length;
   const attachmentsBefore=j.capturePayloads.length;
   const outboxBefore=new Set((await pool.query('SELECT outbox_id FROM meta_outbox WHERE conversation_id=$1',[j.bound.conversationId])).rows.map(r=>r.outbox_id));
   const latest=c.runtime.privateCheckoutFixture?'Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\nCOD':c.runtime.latest;
   let attempt;
   try{
    if(c.evaluator?.requiresCurrentCart&&!(await j.state()).cart)attempt={result:{terminal:{disposition:'NO_SEND',reason:'SETUP_CART_NOT_COMPLETED',text:null,fallbackId:null},sendEnabled:false},status:'BLOCKED'};
    else if((c.runtime.privateCheckoutFixture||c.caseId==='stateful-confirm')&&!invitationSucceeded)attempt={result:{terminal:{disposition:'NO_SEND',reason:'CHECKOUT_INVITATION_NOT_COMPLETED',text:null,fallbackId:null},sendEnabled:false},status:'BLOCKED'};
    else {attempt=await j.turn(latest,[],{...(c.runtime.messages?{messages:c.runtime.messages}:{}),slot:c.caseId});
     if(attempt.qualification?.status==='VALID')await j.drain();}
    if(c.caseId==='stateful-request-checkout')invitationSucceeded=j.capture.length>capturedBefore&&(await j.state()).clarification?.reasonCode==='CHECKOUT_DETAILS_MISSING';
   }
   catch(error){attempt=attempt?.result
    ?retainObservedAttempt(attempt,{queue:attemptQueue,slot:c.caseId,stage:'CONSUMER',validate:()=>{throw error;}})
    :unobservedAttempt(error,{queue:attemptQueue,slot:c.caseId});}
   const stored=await runtime.loadOrCreateSalesCycle(pageId,j.bound.conversationId,()=>createSalesCycleRuntimeState(j.bound.conversationId,{pageId,conversationId:j.bound.conversationId},new Date()));
   const profile=await runtime.loadOrCreateCustomerProfile(pageId,j.bound.customerHash,()=>{throw new Error('PROFILE_MISSING');});
   const authority=await runtime.loadOrCreate(pageId,j.bound.customerHash,'APP',()=>{throw Error('CONVERSATION_REQUIRED');});
   const handoffCounts=(await pool.query('SELECT (SELECT count(*)::int FROM handoff_events WHERE conversation_id=$1) AS events, (SELECT count(*)::int FROM pancake_tag_outbox WHERE conversation_id=$1) AS tags',[j.bound.conversationId])).rows[0];
   const result={caseId:c.caseId,journeyId:c.journeyId,sourceMode:c.sourceMode??'LIVE',elapsedMs:performance.now()-started,...attempt,
    handoffEvidence:{conversationOwner:authority.state.conversationOwner,...handoffCounts},
    actualCapturedMessages:j.capture.slice(capturedBefore).map(t=>redactAnalyticsMessage(t).text),
    actualCapturedTextHashes:publicCapturedTextHashes(j.capturePayloads,attachmentsBefore),
    actualCapturedAttachments:publicCapturedAttachments(j.capturePayloads,attachmentsBefore),
    deliveryEvidence:{outboxRows:(await pool.query('SELECT outbox_id,response_group_id,sequence_no,status FROM meta_outbox WHERE conversation_id=$1 ORDER BY created_at,sequence_no',[j.bound.conversationId])).rows
      .filter(r=>!outboxBefore.has(r.outbox_id)).map(r=>({id:r.outbox_id,group:r.response_group_id,sequence:r.sequence_no,status:r.status}))},
    committedPublicState:{stage:stored.state.stage,revision:stored.state.revision,cart:stored.state.cart?.value??null,measurements:profile.profile.measurements,customerProfileRevision:profile.profile.revision,
     negotiation:stored.state.negotiation?{tier:stored.state.negotiation.customerState,version:stored.state.negotiation.stateVersion,objectionEvidenceCount:stored.state.negotiation.consumedObjectionEvidenceIds.length}:null},
    counts:{...providerPorts.counters}};
   writeFileSync(resolve(out,'provider-attempt-'+(index+1)+'.json'),JSON.stringify(result,null,2),{flag:'wx'});
   qualifiedAttempts.push(attempt);
   report.outcomes.push({caseId:c.caseId,disposition:attempt.result?.terminal?.disposition??'UNKNOWN',qualification:attempt.qualification,captured:result.actualCapturedMessages.length,
    ownerRequests:providerPorts.counters.owner-beforeCounts.owner,verifierRequests:providerPorts.counters.verifier-beforeCounts.verifier});
   report.providerGenerations=providerPorts.counters.owner+providerPorts.counters.verifier;save();
  }
  report.providerCounts={...providerPorts.counters};report.registeredOutcomes=selectedCases.length;
  report.qualificationSummary=summarizeAttemptQualification(qualifiedAttempts);
  report.completedOutcomes=report.qualificationSummary.executed;report.queueLatch=attemptQueue.blocked();
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),providerFreeze.registration.sourceSha,'RUN_SOURCE_CHANGED');
  const finalFreeze=statefulPreflight(root);assert.equal(finalFreeze.registration.sourceConfigHash,providerFreeze.registration.sourceConfigHash,'RUN_CONFIG_CHANGED');
 }
 if(checkPrefix){assert(report.cases.length>0,'CHECK_PREFIX_MATCHED_NOTHING');report.checkPrefix=checkPrefix;}
 report.status=providerRun?(attemptQueue.blocked()?'QUALIFICATION_FAILED':'COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW'):'PASS';save();
}catch(error){report.status='FAIL';report.errorType=error.name;report.error=error.message;save();console.error(error.stack);process.exitCode=1;}
finally{
 await Promise.allSettled([runtime?.close(),inbox?.close(),policyStore?.close(),livePolicyStore?.close(),historyStore?.close(),providerPorts?.close(),pool?.end()]);
 if(created){assert(/^c3_b_test_[a-f0-9]{16}$/.test(databaseName));await admin.query('DROP DATABASE '+databaseName);report.testDatabaseDropped=true;save();}
 if(report.initialStateArtifact){report.initialStateArtifact.testDatabaseDropped=report.testDatabaseDropped;
  writeFileSync(resolve(out,'INITIAL_STATE.json'),JSON.stringify(report.initialStateArtifact,null,2),{flag:'wx'});}
 save();
 await admin.end();
}
