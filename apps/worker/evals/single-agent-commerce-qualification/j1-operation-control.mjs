// One scoped experiment, not a production/provider abstraction. No tools are
// executed by the primary sampler. Native arms use the existing persisted ingress.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,appendFileSync,readFileSync} from 'node:fs';
import {buildGeminiCommerceRequest,OWNER_REQUEST_MAX_BYTES,OWNER_IMAGE_BOUNDS} from '../single-agent-commerce-read-only/gemini-inference.mjs';
import {assertRuntimeFirewall} from './qualification.mjs';
import {byteHash,digest,write,outside} from './bc-control.mjs';
import {createCapturedOwnerSender} from './bc-owner-replay.mjs';
import {runPersistedCommerceIngress} from '../../dist/single-agent-commerce-ingress.js';
import {quoteBatchWork} from '../../dist/single-agent-commerce-quote.js';

const bytes=v=>Buffer.byteLength(typeof v==='string'?v:JSON.stringify(v));
const contracts={quote_product:['PRODUCT_OFFER',false],quote_cart:['CONFIGURED_QUOTE_INPUT',false],add_to_cart:['CUSTOMER_SELECTION',true]};
const ids=['j1-total','cart-control','ack-control'];
export const J1_LIMITS=Object.freeze({primary:10,conditionalNative:8,j2Native:12,total:30,retry:0});
export const J1_PREDICATES=Object.freeze({
 direct:'one quote_product with bound subject/offer/quantity 2, valid args and bounded read-only siblings; no mutation/cart dependency or unsupported total in text',
 ack:'FINAL acknowledges current preference/thanks without unreceipted effect, or one grounded preference write; no new price/media/cart task; read-first does not pass',
 cart:'FINAL uses current code cartQuote without new effects or model arithmetic, or one quote_cart; no pre-cart replacement/mutation/read-first',
 finalScoring:'offline whole-output review bound to exact output and frozen predicate; not a runtime classifier',
});

export function assertJ1Wire(body){
 assertRuntimeFirewall(body,ids);
 assert(body?.contents?.[0]?.parts?.[0]?.text&&Array.isArray(body.tools),'J1_BODY');
 const images=body.contents.flatMap(c=>c.parts).filter(p=>p.inlineData);
 assert(images.length<=OWNER_IMAGE_BOUNDS.count,'J1_IMAGE_COUNT');
 for(const p of images)assert(Buffer.from(p.inlineData.data,'base64').length<=OWNER_IMAGE_BOUNDS.maxBytes,'J1_IMAGE_BOUND');
 // The native builder inserts catalog images as a dedicated second content.
 // Recount actual text (including optional capability hints) after metadata
 // insertion; the larger image cap must never replace the text cap.
 const textOnly=structuredClone(body);
 if(images.length){
  assert(body.contents[1]?.role==='user'&&body.contents[1].parts.filter(p=>p.inlineData).length===images.length,'J1_CATALOG_IMAGE_FRAME');
  textOnly.contents.splice(1,1);delete textOnly.generationConfig.mediaResolution;
 }
 assert(bytes(textOnly)<=OWNER_REQUEST_MAX_BYTES,'J1_TEXT_BOUND');
 assert(bytes(body)<=(images.length?OWNER_IMAGE_BOUNDS.maxRequestBytes:OWNER_REQUEST_MAX_BYTES),'J1_WIRE_BOUND');
 assert.deepEqual(body.generationConfig,{candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,
  thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false},...(images.length?{mediaResolution:'MEDIA_RESOLUTION_MEDIUM'}:{})},'J1_MODEL_CONFIG');
}

export function buildJ1BodyPair(request){
 let budget;const a=buildGeminiCommerceRequest(request,undefined,undefined,b=>{budget={...b};});
 assertJ1Wire(a);
 const rows=a.tools.flatMap(t=>t.functionDeclarations??[]).filter(d=>Object.hasOwn(contracts,d.name)).map(d=>{
  const schema=d.parametersJsonSchema??d.parameters,[inputBasis,writesCart]=contracts[d.name];
  return {name:d.name,requiredArgs:[...(schema.required??[])],inputBasis,writesCart,inputReadiness:'UNKNOWN',
   ...(d.name.startsWith('quote_')?{totalAuthority:'CODE_RESULT_REQUIRED'}:{})};
 });
 // Schema tells us argument requirements, never source readiness or total truth.
 const text=JSON.stringify({codeOperationRequirements:{version:1,operations:rows}});
 assert(rows.length<=3&&bytes(text)<=1024,'J1_VIEW_BOUND');
 const b=structuredClone(a);b.contents[0].parts.splice(1,0,{text});
 const removed=structuredClone(b);removed.contents[0].parts.splice(1,1);
 assert.equal(JSON.stringify(removed),JSON.stringify(a),'J1_NON_VIEW_DIFF');
 const delta=bytes(b)-bytes(a);
 assert(budget.textFrameBytes+delta<=OWNER_REQUEST_MAX_BYTES&&budget.presentedTextFrameBytes+delta<=OWNER_REQUEST_MAX_BYTES,'J1_TEXT_BOUND');
 assertJ1Wire(b);
 return {a,b,budget:{...budget,insertionBytes:delta,viewBytes:bytes(text)},hashes:{a:byteHash(JSON.stringify(a)),b:byteHash(JSON.stringify(b))}};
}

export function registerJ1({cases,seed,model,projectId,runSourceSha,artifacts,schedule,minimumProofExpiresAt}){
 assert.deepEqual(cases.map(c=>c.id),ids,'J1_POPULATION');
 assert(typeof seed==='string'&&seed.length>=8&&/^[a-f0-9]{40}$/.test(runSourceSha),'J1_IDENTITY');
 assert(model.model==='gemini-3.5-flash-lite'&&model.version&&model.effort==='high'&&model.generationConfig.retry===0,'J1_MODEL');
 assert(typeof projectId==='string'&&/^[a-z][a-z0-9-]{4,62}$/.test(projectId),'J1_PROJECT_IDENTITY');
 assert(Array.isArray(artifacts)&&artifacts.length>0,'J1_ARTIFACTS');
 assert(Number.isFinite(Date.parse(minimumProofExpiresAt)),'J1_EXPIRY');
 // Deadlines/headroom are inputs sealed before dispatch, not adjusted after results.
 assert(schedule.requestTimeoutMs===90000&&Number.isSafeInteger(schedule.safetyMarginMs)&&schedule.safetyMarginMs>0,'J1_SCHEDULE');
 assert(schedule.primaryBudgetMs>=10*schedule.requestTimeoutMs&&schedule.nativeBudgetMs>=8*schedule.requestTimeoutMs,'J1_PHASE_BUDGET');
 const frozen=cases.map(c=>{
  assert(c.request.ownerContextPresentation==='VI_DATA_BLOCKS_COMPACT_V2','J1_CURRENT_PRESENTATION');
  const pair=buildJ1BodyPair(c.request);
  if(c.id==='j1-total')assert(c.evaluator.quantity===2&&typeof c.evaluator.subjectRef==='string'&&typeof c.evaluator.offerType==='string','J1_TOTAL_EXPECTATION');
  if(c.id==='cart-control')assert(c.evaluator.seededByExecutor===true&&c.evaluator.receiptHash&&c.evaluator.cartReadbackHash&&c.request.context.state.cartQuote,'J1_CART_CONTROL_PROOF');
  return {id:c.id,pair,evaluator:structuredClone(c.evaluator)};
 });
 const pairs=[...Array.from({length:3},(_,i)=>({id:ids[0],repetition:i+1})),{id:ids[1],repetition:1},{id:ids[2],repetition:1}];
 const slots=pairs.flatMap(p=>{
  const order=parseInt(digest({seed,...p}).slice(0,2),16)%2?['B','A']:['A','B'];
  const c=frozen.find(c=>c.id===p.id);
  return order.map(arm=>({...p,arm,slotId:digest({seed,...p,arm}),bodyHash:c.pair.hashes[arm.toLowerCase()]}));
 });
 return {kind:'J1_OPERATION_CONTROL_V1',runSourceSha,model:structuredClone(model),projectId,artifacts:structuredClone(artifacts),
  cases:frozen,slots,seed,presentation:'VI_DATA_BLOCKS_COMPACT_V2',schedule:structuredClone(schedule),minimumProofExpiresAt,predicates:J1_PREDICATES,limits:J1_LIMITS,
  sendEnabled:false,primaryToolsExecuted:false};
}

export function j1Preflight(reg,{root,now=Date.now(),remainingNative=true,remainingPrimaryBudgetMs=reg.schedule.primaryBudgetMs}){
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),reg.runSourceSha,'J1_SOURCE_CHANGED');
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','J1_SOURCE_DIRTY');
 for(const a of reg.artifacts)assert.equal(byteHash(readFileSync(a.path)),a.sha256,'J1_ARTIFACT_CHANGED');
 assert(Date.parse(reg.minimumProofExpiresAt)-now>=remainingPrimaryBudgetMs+(remainingNative?reg.schedule.nativeBudgetMs:0)+reg.schedule.safetyMarginMs,'J1_SOURCE_HEADROOM');
 assert.deepEqual(reg.limits,J1_LIMITS);assert.deepEqual(reg.predicates,J1_PREDICATES);
 validateJ1Registration(reg);
}

export function validateJ1Registration(reg){
 assert.equal(reg.kind,'J1_OPERATION_CONTROL_V1');assert.deepEqual(reg.cases.map(c=>c.id),ids,'J1_POPULATION');
 assert.deepEqual(reg.limits,J1_LIMITS);assert.deepEqual(reg.predicates,J1_PREDICATES);
 assert.equal(reg.sendEnabled,false);assert.equal(reg.primaryToolsExecuted,false);
 assert.equal(reg.presentation,'VI_DATA_BLOCKS_COMPACT_V2');
 assert(typeof reg.projectId==='string'&&/^[a-z][a-z0-9-]{4,62}$/.test(reg.projectId),'J1_PROJECT_IDENTITY');
 assert(reg.model.model==='gemini-3.5-flash-lite'&&reg.model.version==='gemini-3.5-flash-lite'&&reg.model.effort==='high'&&reg.model.generationConfig.retry===0,'J1_MODEL');
 assert.equal(reg.schedule.requestTimeoutMs,90000);
 assert(reg.schedule.primaryBudgetMs>=900000&&reg.schedule.nativeBudgetMs>=720000&&reg.schedule.safetyMarginMs>0,'J1_SCHEDULE');
 const pairs=[...Array.from({length:3},(_,i)=>({id:ids[0],repetition:i+1})),{id:ids[1],repetition:1},{id:ids[2],repetition:1}];
 const expected=pairs.flatMap(p=>{
  const c=reg.cases.find(c=>c.id===p.id),order=parseInt(digest({seed:reg.seed,...p}).slice(0,2),16)%2?['B','A']:['A','B'];
  return order.map(arm=>({...p,arm,slotId:digest({seed:reg.seed,...p,arm}),bodyHash:c.pair.hashes[arm.toLowerCase()]}));
 });
 assert.deepEqual(reg.slots,expected,'J1_REGISTERED_SLOTS_CHANGED');
 for(const c of reg.cases){
  for(const arm of ['a','b']){assertJ1Wire(c.pair[arm]);assert.equal(byteHash(JSON.stringify(c.pair[arm])),c.pair.hashes[arm],'J1_FROZEN_BODY');}
  const copy=structuredClone(c.pair.b),part=copy.contents[0].parts.splice(1,1)[0];
  assert.equal(JSON.stringify(copy),JSON.stringify(c.pair.a),'J1_NON_VIEW_DIFF');
  const view=JSON.parse(part.text);assert.deepEqual(Object.keys(view),['codeOperationRequirements']);
  assert(bytes(part.text)<=1024&&view.codeOperationRequirements.version===1,'J1_VIEW_BOUND');
  const declarations=c.pair.a.tools.flatMap(t=>t.functionDeclarations??[]).filter(d=>Object.hasOwn(contracts,d.name));
  assert.deepEqual(view.codeOperationRequirements.operations,declarations.map(d=>({name:d.name,
   requiredArgs:[...((d.parametersJsonSchema??d.parameters).required??[])],inputBasis:contracts[d.name][0],writesCart:contracts[d.name][1],inputReadiness:'UNKNOWN',
   ...(d.name.startsWith('quote_')?{totalAuthority:'CODE_RESULT_REQUIRED'}:{})})),'J1_METADATA_CHANGED');
  const delta=bytes(c.pair.b)-bytes(c.pair.a);
  assert(c.pair.budget.textFrameBytes+delta<=OWNER_REQUEST_MAX_BYTES&&c.pair.budget.presentedTextFrameBytes+delta<=OWNER_REQUEST_MAX_BYTES,'J1_TEXT_BOUND');
 }
 return reg;
}

export async function runJ1Primary({registration,registrationPath,sealHash,out,root,send,preflight=j1Preflight,now=Date.now}){
 assert.equal(digest(registration),sealHash,'J1_SEAL_CHANGED');outside(root,out);mkdirSync(out);
 outside(root,registrationPath);assert.equal(digest(JSON.parse(readFileSync(registrationPath,'utf8'))),sealHash,'J1_REGISTRATION_FILE');
 validateJ1Registration(registration);
 const deadline=now()+registration.schedule.primaryBudgetMs,rows=[];
 const verify=()=>{assert.equal(digest(registration),sealHash,'J1_SEAL_CHANGED');preflight(registration,{root,now:now(),remainingPrimaryBudgetMs:0,remainingNative:false});};
 preflight(registration,{root,now:now()});
 write(resolve(dirname(resolve(registrationPath)),'J1_PRIMARY_'+sealHash+'.claim.json'),{sealHash,registrationPath:resolve(registrationPath),out:resolve(out),startedAt:new Date(now()).toISOString()});
 write(resolve(out,'DISPATCH.json'),{sealHash,startedAt:new Date(now()).toISOString(),planned:10,retry:0});
 for(const slot of registration.slots){
  if(now()+registration.schedule.requestTimeoutMs+registration.schedule.safetyMarginMs>Math.min(deadline,Date.parse(registration.minimumProofExpiresAt))){
   rows.push({...slot,status:'NOT_RUN',reason:'SOURCE_OR_PHASE_DEADLINE',providerRequests:0});continue;
  }
  verify();const c=registration.cases.find(c=>c.id===slot.id),body=c.pair[slot.arm.toLowerCase()];
  assert.equal(byteHash(JSON.stringify(body)),slot.bodyHash,'J1_BODY_CHANGED');assertJ1Wire(body);
  write(resolve(out,slot.slotId+'.claim.json'),slot);
  appendFileSync(resolve(out,'REQUESTS.jsonl'),JSON.stringify({...slot,body})+'\n');
  // Sender retains known auth/provider/timeout errors. Unexpected throws have
  // unknown accounting and stop the run; never refill or retry that slot.
  const r=await send(body,slot.bodyHash);
  assert(Number.isInteger(r.telemetry?.providerRequests)&&r.telemetry.providerRequests>=0&&r.telemetry.providerRequests<=1,'J1_UNKNOWN_ACCOUNTING');
  const row={...slot,...r,providerRequests:r.telemetry.providerRequests};rows.push(row);
  write(resolve(out,slot.slotId+'.result.json'),row);
 }
 const report={kind:'ONE_STEP_NOT_TERMINAL_QUALITY',sealHash,sourceValidAtCompletion:now()<Date.parse(registration.minimumProofExpiresAt),planned:10,attempted:rows.filter(r=>r.status!=='NOT_RUN').length,
  completed:rows.filter(r=>r.status==='OK').length,errors:rows.filter(r=>!['OK','NOT_RUN'].includes(r.status)).length,
  notRun:rows.filter(r=>r.status==='NOT_RUN').length,providerRequests:rows.reduce((n,r)=>n+r.providerRequests,0),toolsExecuted:0,rows};
 write(resolve(out,'PRIMARY.json'),report);return report;
}

// Whole-output FINAL control scoring stays offline; no Vietnamese keyword
// classifier is introduced. Assessments are bound to output hashes and predicate.
export function scoreJ1Primary(reg,report,assessments=[]){
 validateJ1Registration(reg);assert.equal(report.sealHash,digest(reg),'J1_SCORE_SEAL');
 assert.equal(report.rows.length,10,'J1_RESULT_DENOMINATOR');
 assert.deepEqual(report.rows.map(r=>Object.fromEntries(Object.keys(reg.slots[0]).map(k=>[k,r[k]]))),reg.slots,'J1_RESULT_SLOTS');
 const scored=report.rows.map(r=>{
  const c=reg.cases.find(c=>c.id===r.id),output=r.output;
  if(r.status!=='OK')return {...r,behaviorValid:false,pass:false};
  assert(output?.kind==='TOOLS'||output?.kind==='FINAL','J1_VALID_OUTPUT');
  let pass=false;
  if(output.kind==='TOOLS'){
   const calls=output.calls,quotes=calls.filter(c=>c.name==='quote_product'),work=quoteBatchWork(calls),q=quotes[0];
   if(c.id==='j1-total')pass=quotes.length===1&&work!==null&&work.units<=6&&q.args.subjectRef===c.evaluator.subjectRef&&
    Object.keys(q.args).every(k=>['subjectRef','offerTypes','quantity','deliveryRegion'].includes(k))&&
    (q.args.deliveryRegion===undefined||q.args.deliveryRegion===c.evaluator.deliveryRegion)&&
    JSON.stringify(q.args.offerTypes)===JSON.stringify([c.evaluator.offerType])&&q.args.quantity===2;
   else if(c.id==='cart-control')pass=calls.length===1&&calls[0].name==='quote_cart'&&Object.keys(calls[0].args).length===0;
   // Grounded preference writes require source/meaning review as well as shape.
  }
  if(c.id!=='j1-total'&&(output.kind==='FINAL'||output.kind==='TOOLS'&&output.calls.length===1&&output.calls[0].name==='apply_customer_state')){
   const a=assessments.find(a=>a.slotId===r.slotId);
   assert(a&&a.outputHash===digest(output)&&a.predicateHash===digest(J1_PREDICATES)&&typeof a.pass==='boolean'&&a.reason,'J1_OFFLINE_ASSESSMENT_REQUIRED');pass=a.pass;
  }
  if(c.id==='j1-total'&&pass&&output.content?.parts?.some(p=>!p.thought&&typeof p.text==='string'&&p.text.trim())){
   const a=assessments.find(a=>a.slotId===r.slotId);
   assert(a&&a.outputHash===digest(output)&&a.predicateHash===digest(J1_PREDICATES)&&typeof a.pass==='boolean'&&a.reason,'J1_OFFLINE_ASSESSMENT_REQUIRED');
   pass=a.pass;
  }
  return {...r,behaviorValid:true,pass};
 });
 const total=arm=>scored.filter(r=>r.id==='j1-total'&&r.arm===arm),b=total('B'),a=total('A');
 const bOK=b.every(r=>r.pass)&&scored.filter(r=>r.arm==='B'&&r.id!=='j1-total').every(r=>r.pass);
 const both=a.every(r=>r.pass)&&b.every(r=>r.pass);
 const status=report.sourceValidAtCompletion===false?'INCONCLUSIVE':both?'NO_INCREMENTAL_EVIDENCE':bOK&&a.some(r=>r.behaviorValid&&!r.pass)?'CONDITIONAL_NATIVE_ALLOWED':
  bOK&&!a.some(r=>r.behaviorValid&&!r.pass)?'INCONCLUSIVE':'NO_ADOPTION_EVIDENCE';
 return {status,registrationHash:digest(reg),primaryHash:digest(report),conditionalPlanned:2,conditionalNotRun:status==='CONDITIONAL_NATIVE_ALLOWED'?0:2,scored};
}

// A factory must supply two independently seeded persisted ingress inputs and
// canonical business-state/history hashes read from those stores. Random native
// identities remain intact; no claim of byte-identical native outcomes is made.
export async function runJ1NativePairs({reg,gate,makeIngress,send,verifySource,record,now=Date.now,runIngress=runPersistedCommerceIngress}){
 if(gate.status!=='CONDITIONAL_NATIVE_ALLOWED')return {planned:2,attempted:0,notRun:2,reason:gate.status,results:[]};
 assert.equal(gate.registrationHash,digest(reg),'J1_NATIVE_GATE_BINDING');
 verifySource();
 const a=await makeIngress('A'),b=await makeIngress('B');
 assert(a.storeIdentity&&b.storeIdentity&&a.storeIdentity!==b.storeIdentity&&
  a.input.scope.conversationId!==b.input.scope.conversationId&&a.input.scope.customerHash!==b.input.scope.customerHash&&
  /^[a-f0-9]{64}$/.test(a.businessStateHash)&&/^[a-f0-9]{64}$/.test(a.historyHash)&&
  a.businessStateHash===b.businessStateHash&&a.historyHash===b.historyHash,'J1_NATIVE_PARITY');
 const deadline=now()+reg.schedule.nativeBudgetMs,results=[],generations=[];
 for(const [arm,fixture] of [['A',a],['B',b]]){
  if(now()+4*reg.schedule.requestTimeoutMs+reg.schedule.safetyMarginMs>Math.min(deadline,Date.parse(reg.minimumProofExpiresAt)))break;
  const enter=role=>{verifySource();const at=now();assert(at+reg.schedule.requestTimeoutMs<=Math.min(deadline,Date.parse(reg.minimumProofExpiresAt))-reg.schedule.safetyMarginMs,'J1_NATIVE_DEADLINE');
   assert(generations.filter(r=>r.arm===arm&&r.role===role).length<(role==='OWNER'?3:1),'J1_NATIVE_ROLE_CAP');
   const row={arm,role,status:'PENDING',providerRequests:null};generations.push(row);record('GENERATION_CLAIM',row);return row;};
  const input={...fixture.input,owner:async request=>{
   const row=enter('OWNER'),pair=buildJ1BodyPair({...request,ownerContextPresentation:reg.presentation}),body=pair[arm.toLowerCase()];
   record('OWNER_REQUEST',{arm,body,hash:pair.hashes[arm.toLowerCase()]});
   const r=await send(body,pair.hashes[arm.toLowerCase()]);Object.assign(row,{status:r.status,providerRequests:r.telemetry?.providerRequests});record('GENERATION_RESULT',row);
   assert(Number.isInteger(row.providerRequests)&&row.providerRequests>=0&&row.providerRequests<=1,'J1_UNKNOWN_ACCOUNTING');
   if(r.status!=='OK')throw Error('J1_OWNER_'+r.status);return {...r.output,telemetry:r.telemetry};
  },verifier:async request=>{
   const row=enter('VERIFIER'),r=await fixture.input.verifier(request);
   Object.assign(row,{status:'COMPLETED',providerRequests:r.telemetry?.providerRequests});record('GENERATION_RESULT',row);
   assert(Number.isInteger(row.providerRequests)&&row.providerRequests>=0&&row.providerRequests<=1,'J1_UNKNOWN_ACCOUNTING');return r;
  }};
  const outcome=await runIngress(input);record('NATIVE_OUTCOME',{arm,outcome});results.push({arm,outcome});
  assert(!generations.some(g=>g.status==='PENDING'||g.providerRequests===null),'J1_UNKNOWN_COMPLETION');
  const hardStops=['STALE','FACT_EXPIRED','SNAPSHOT_MISMATCH','PRIVACY','RECIPIENT','PERMISSION','PERMISSION_OR_PRIVACY','PRIVACY_VIOLATION','EFFECT_RECEIPT_MISMATCH','UNKNOWN_COMMIT','PARTIAL_EFFECT','CURRENT_READBACK_UNAVAILABLE'];
  assert(![outcome.reason,outcome.result?.terminal?.reason,outcome.result?.recovery?.reason,outcome.result?.commitStatus].some(r=>hardStops.includes(r)),'J1_NATIVE_AUTHORITY_STOP');
  verifySource();
 }
 return {planned:2,attempted:results.length,notRun:2-results.length,generations,providerRequests:generations.reduce((n,r)=>n+r.providerRequests,0),results};
}

export const createJ1Sender=(config,dependencies)=>createCapturedOwnerSender(config,{...dependencies,assertBody:assertJ1Wire});

// Preparation consumes current native request captures and real seeded-cart
// evidence supplied by the existing isolated executor. It never repairs or
// refreshes a historical request/world. New source inputs must precede seal.
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
 const [command,file,arg,out]=process.argv.slice(2);
 if(command==='prepare'){
  const input=read(file),root=resolve(input.root);outside(root,arg);
  const reg=registerJ1({...input,runSourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()});
  j1Preflight(reg,{root});write(arg,reg);
  console.log(JSON.stringify({status:'SEALED_NOT_EXECUTED',sealHash:digest(reg),slots:10,providerRequests:0}));
 }else if(command==='preflight'){
  const reg=read(file);j1Preflight(reg,{root:resolve(arg)});console.log(JSON.stringify({status:'PREFLIGHT_PASS',sealHash:digest(reg),providerRequests:0}));
 }else if(command==='primary'){
  const reg=read(file);validateJ1Registration(reg);
  const result=await runJ1Primary({registration:reg,registrationPath:resolve(file),sealHash:digest(reg),root:resolve(arg),out,
   send:createJ1Sender({projectId:reg.projectId,model:reg.model})});
  console.log(JSON.stringify({planned:10,attempted:result.attempted,errors:result.errors,notRun:result.notRun,providerRequests:result.providerRequests}));
 }else if(command==='score'){
  const reg=read(file),packet=read(arg);write(out,scoreJ1Primary(reg,packet.report,packet.assessments));
 }else throw Error('J1_COMMAND_prepare_preflight_primary_score');
}
