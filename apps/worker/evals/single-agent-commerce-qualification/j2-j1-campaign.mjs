// Specific runner for the owner-approved J2(12) -> J1(10) -> conditional(8)
// experiment. Uses the existing disposable PostgreSQL fixture and provider APIs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {digest,byteHash,write} from './bc-control.mjs';
import {buildJ1BodyPair,registerJ1,runJ1Primary,scoreJ1Primary,createJ1Sender,J1_LIMITS} from './j1-operation-control.mjs';
import {createCommerceVerifier,validateProtocol,buildVerifierRequest} from '../single-agent-commerce-read-only/protocol.mjs';
import {buildGeminiCommerceRequest} from '../single-agent-commerce-read-only/gemini-inference.mjs';
import {inspectCodex} from '../single-agent-semantic-verifier/codex-inference.mjs';
import {assertRuntimeFirewall} from './qualification.mjs';
import {OPENING_PRODUCT_MEDIA_RULE} from '../../dist/single-agent-commerce-opening-media.js';

const read=p=>JSON.parse(readFileSync(p,'utf8'));
const j2Texts=['Chị muốn chọn size áo của bộ váy Thạch Thảo, cao 1m62 nặng 56kg.',
 'Chị nhắn nhầm cân nặng, 51kg thôi em nhé. Ngực 88, eo 70, mông 94.',
 'Chị thích mặc thoải mái một chút, em chọn size giúp chị nhé.'];
const j1Texts=['Chị lấy áo của bộ váy Thạch Thảo size L nhé.','Lấy hai chiếc cho chị, một M một L.','Em báo lại tổng cả phí ship cho chị nhé.'];
const j1History=['Dạ, áo lẻ Set Thạch Thảo size L nhà em có hai màu Trắng (sẵn) và Be (đặt trước). Chị lấy màu nào ạ?',
 'Dạ, áo lẻ Set Thạch Thảo size M và size L có hai màu Trắng và Be. Chị lấy màu nào cho từng size ạ?'];
const hard=new Set(['PRIVACY','PRIVACY_VIOLATION','RECIPIENT','PERMISSION','PERMISSION_OR_PRIVACY','FACT_EXPIRED','STALE',
 'SNAPSHOT_MISMATCH','EFFECT_RECEIPT_MISMATCH','STATE_COMMIT_UNCONFIRMED','UNKNOWN_COMMIT','PARTIAL_EFFECT','CURRENT_READBACK_UNAVAILABLE']);
export const campaignScriptHash=digest({j2Texts,j1Texts,j1History,ack:'Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.'});

export async function createCampaignPorts({root,input,world,out,readPorts}){
 assert(['PREPARE','RUN'].includes(input.mode),'CAMPAIGN_MODE');
 assert.equal(digest(world),input.worldHash,'CAMPAIGN_WORLD_CHANGED');
 const m=validateProtocol(read(resolve(root,'apps/worker/evals/single-agent-commerce-read-only/manifest.json')));
 const config=read(resolve(root,'apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json'));
 assert.equal(config.vertex.projectId,world.config.vertex.projectId,'CAMPAIGN_PROJECT_CHANGED');
 assert.equal(m.models.conversation.model,'gemini-3.5-flash-lite');assert.equal(m.models.conversation.effort,'high');
 assert.equal(m.models.verifier.model,'gpt-6.1-sol');assert.equal(m.models.verifier.effort,'high');
 const toolchain=inspectCodex();assert.equal(toolchain.version,'codex-cli 0.159.2');
 const ownerPrompt=readFileSync(resolve(root,'apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt'),'utf8');
 const verifierPrompt=readFileSync(resolve(root,'apps/worker/evals/single-agent-commerce-read-only/prompts/verifier.vi.txt'),'utf8');
 const source=()=>{
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),input.runSourceSha,'CAMPAIGN_SOURCE_CHANGED');
  assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','CAMPAIGN_SOURCE_DIRTY');
  assert.equal(digest(read(input.worldFile)),input.worldHash,'CAMPAIGN_WORLD_CHANGED');
 };
 source();let phase='PREPARATION',turn=0,arm='A',seedOwner=null,capture=null;
 const generations=[];let stopped=false;
 const audit=(event,value)=>appendFileSync(resolve(out,'CAMPAIGN.jsonl'),JSON.stringify({event,at:new Date().toISOString(),value})+'\n');
 const sender=createJ1Sender({projectId:world.config.vertex.projectId,model:m.models.conversation});
 const verify=createCommerceVerifier(m,undefined,(id,value)=>audit('VERIFIER_CHECKPOINT',{id,value}));
 const claim=role=>{
  source();assert(input.mode==='RUN'&&!stopped,'CAMPAIGN_GENERATION_DISABLED');
  assert(generations.length<30,'CAMPAIGN_TOTAL_CAP');
  const same=generations.filter(g=>g.phase===phase&&g.turn===turn&&g.arm===arm&&g.role===role);
  assert(same.length<(role==='OWNER'?3:1),'CAMPAIGN_TURN_CAP');
  assert(generations.filter(g=>g.phase===phase).length<(phase==='J2'?12:8),'CAMPAIGN_PHASE_CAP');
  assert(Date.now()+90000+input.safetyMarginMs<Date.parse(input.minimumProofExpiresAt),'CAMPAIGN_SOURCE_HEADROOM');
  const row={id:generations.length+1,phase,turn,arm,role,status:'PENDING',providerRequests:null};generations.push(row);audit('GENERATION_CLAIM',row);return row;
 };
 const owner=async r=>{
  if(phase==='PREPARATION'){
   if(capture){capture(structuredClone({...r,signal:undefined,ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2'}));capture=null;}
   return seedOwner?seedOwner(r):{kind:'FINAL',text:'Dạ chị.'};
  }
  const row=claim('OWNER');
  const request={...r,ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2'};
  const body=phase==='J1_NATIVE'?buildJ1BodyPair(request)[arm.toLowerCase()]:buildGeminiCommerceRequest(request);
  assertRuntimeFirewall(body);audit('OWNER_REQUEST',{id:row.id,body,hash:byteHash(JSON.stringify(body))});
  const result=await sender(body,byteHash(JSON.stringify(body)));
  Object.assign(row,{status:result.status,providerRequests:result.telemetry.providerRequests,telemetry:result.telemetry});audit('GENERATION_RESULT',{...row,output:result.output??null});
  assert(row.providerRequests<=1,'CAMPAIGN_PROVIDER_RETRY');
  if(result.status!=='OK')throw Object.assign(Error('PROVIDER_ERROR'),{telemetry:result.telemetry});
  return {...result.output,telemetry:result.telemetry};
 };
 const verifier=async r=>{
  if(phase==='PREPARATION')return {result:{verdict:'PASS',violations:[]}};
  const row=claim('VERIFIER');audit('VERIFIER_REQUEST',{id:row.id,body:buildVerifierRequest(m,r)});
  try{const result=await verify(r);Object.assign(row,{status:'OK',providerRequests:result.telemetry.providerRequests,telemetry:result.telemetry});audit('GENERATION_RESULT',row);return result;}
  catch(e){Object.assign(row,{status:e.telemetry?.status??'UNKNOWN',providerRequests:e.telemetry?.providerRequests??null,telemetry:e.telemetry??null});audit('GENERATION_RESULT',row);throw e;}
 };
 return {...readPorts,m,ownerPrompt,verifierPrompt,owner,verifier,openingMediaRule:OPENING_PRODUCT_MEDIA_RULE,source,toolchain,sender,generations,audit,
  setStage(p,t=0,a='A'){phase=p;turn=t;arm=a;seedOwner=null;capture=null;
   readPorts.setSlot({slotId:digest({p,t,a}),turnIndex:t,runtimeInput:{latest:'',history:[],initialProductCodes:['SV2447']}});},
  preparation({owner:onOwner,capture:onCapture}={}){phase='PREPARATION';seedOwner=onOwner??null;capture=onCapture??null;
   readPorts.setSlot({slotId:'preparation',turnIndex:0,runtimeInput:{latest:'',history:[],initialProductCodes:['SV2447']}});},
  checkOutcome(observed){
   assert(!generations.some(g=>g.status==='PENDING'||g.providerRequests===null),'CAMPAIGN_UNKNOWN_COMPLETION');
   const result=observed.result;const reasons=[result?.terminal?.reason,result?.recovery?.originalReason,result?.commitStatus];
   if(reasons.some(r=>hard.has(r))){stopped=true;throw Error('CAMPAIGN_AUTHORITY_HARD_STOP');}
  }};
}

export async function executeCampaign({root,input,inputFile,world,out,ports,sessionFactory,snapshot}){
 ports.source();assert.equal(input.scriptHash,campaignScriptHash,'CAMPAIGN_SCRIPT_CHANGED');
 const native=calls=>({kind:'TOOLS',calls,content:{role:'model',parts:calls.map(functionCall=>({functionCall}))}});
 const fixture=async codes=>{ports.preparation();const j=await sessionFactory({live:true,initialProductCodes:codes??['SV2447']});return j;};
 const seedJ1=async()=>{
  const j=await fixture();
  for(let i=0;i<2;i++){
   ports.preparation({owner:()=>({kind:'FINAL',text:j1History[i]})});
   const r=await j.turn(j1Texts[i],[]);assert.equal(r.result?.terminal?.disposition,'SEND_ELIGIBLE','CAMPAIGN_PREFIX_SEED');await j.drain();
  }
  return j;
 };
 const capture=async(j,latest)=>{
  let request;ports.preparation({capture:r=>{request=r;}});
   const observed=await j.turn(latest,[]);
   write(resolve(out,'CAPTURE_'+digest(latest).slice(0,12)+'.json'),{latest,ownerRequestCaptured:!!request,observed,after:await snapshot(j)});
   assert(request,'CAMPAIGN_CAPTURE_MISSING');return request;
 };
 if(input.mode==='PREPARE'){
  const j1=await seedJ1(),total=await capture(j1,j1Texts[2]);
  const cart=await fixture();
  const colors=[...new Set(world.snapshots.SV2447.offers.AO.rows.filter(r=>r.size==='M'&&r.stock_quantity>0&&r.color!=='__NO_COLOR__').map(r=>r.color))];
  assert(colors.length===1,'CAMPAIGN_UNIQUE_CONTROL_COLOR');
  const seeded=await cart.seedControlCart({subjectRef:'SV2447',offerType:'AO',size:'M',color:colors[0],quantity:1});
  const cartState=await snapshot(cart);write(resolve(out,'CART_SEED.json'),{observed:seeded,state:cartState});
  assert(cartState.publicState.cart&&cartState.receipts.length,'CAMPAIGN_REAL_CART_SEED');
  const cartRequest=await capture(cart,'Tổng cả phí ship cho chị bao nhiêu em?');
  assert(cartRequest.context.state.cartQuote,'CAMPAIGN_CURRENT_CART_QUOTE');
  const ack=await fixture(['SV2447','SQ2447']);const ackRequest=await capture(ack,'Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.');
  const expiry=[];
  const walk=v=>{if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(k==='expiresAt'&&Number.isFinite(Date.parse(x)))expiry.push(Date.parse(x));else walk(x);}};
  [total,cartRequest,ackRequest].forEach(r=>walk(r.context));
  const minimumProofExpiresAt=new Date(Math.min(...expiry)).toISOString();
  const model=ports.m.models.conversation;
  const artifacts=[inputFile,input.worldFile].map(path=>({path:resolve(path),sha256:byteHash(readFileSync(path))}));
  const reg=registerJ1({cases:[{id:'j1-total',request:total,evaluator:{subjectRef:'SV2447',offerType:'AO',quantity:2}},
   {id:'cart-control',request:cartRequest,evaluator:{seededByExecutor:true,receiptHash:digest(cartState.receipts),cartReadbackHash:digest(cartState.publicState.cart)}},
   {id:'ack-control',request:ackRequest,evaluator:{}}],seed:input.seed,model,projectId:world.config.vertex.projectId,
   runSourceSha:input.runSourceSha,artifacts,schedule:input.schedule,minimumProofExpiresAt});
  write(resolve(out,'J1_REGISTRATION.json'),reg);
  write(resolve(out,'PREPARATION.json'),{worldHash:input.worldHash,sourceSha:input.runSourceSha,scriptHash:campaignScriptHash,
   toolchain:ports.toolchain,minimumProofExpiresAt,requestHashes:reg.cases.map(c=>({id:c.id,hashes:c.pair.hashes})),
   realCartSeed:{profile:cartState.publicState.profile,cart:cartState.publicState.cart,receipts:cartState.receipts},
   prefixMeaning:'Scripted copies of prior accepted public conversation, prepared by zero-provider native fixture. Not model outcomes or new business authority.',
   scriptedVerifierUsedForPreparationOnly:true,providerRequests:0,mode:'PREPARATION_NOT_ACCEPTANCE'});
  return {mode:'PREPARATION_NOT_ACCEPTANCE',providerRequests:0,preparedSlots:10,minimumProofExpiresAt};
 }
 assert.equal(input.mode,'RUN');assert.deepEqual(input.limits,J1_LIMITS);
 assert.equal(input.toolchainHash,ports.toolchain.binarySha256,'CAMPAIGN_TOOLCHAIN_CHANGED');
 const reg=read(input.j1Registration);assert.equal(digest(reg),input.j1RegistrationHash,'CAMPAIGN_PRIMARY_CHANGED');
 const required=12*90000+reg.schedule.primaryBudgetMs+reg.schedule.nativeBudgetMs+input.safetyMarginMs;
 assert(Date.parse(input.minimumProofExpiresAt)-Date.now()>=required,'CAMPAIGN_FULL_HEADROOM');
 write(resolve(out,'CAMPAIGN_DISPATCH.json'),{inputHash:digest(input),sourceSha:input.runSourceSha,worldHash:input.worldHash,scriptHash:campaignScriptHash,toolchain:ports.toolchain,startedAt:new Date().toISOString()});
 const results=[];
 const j2=await fixture();
 for(let i=0;i<3;i++){
  const before=await snapshot(j2),start=j2.capturePayloads.length;ports.setStage('J2',i);
  const observed=await j2.turn(j2Texts[i],[]);ports.checkOutcome(observed);if(observed.qualification?.status==='VALID')await j2.drain();
  const after=await snapshot(j2),row={phase:'J2',turn:i,customer:j2Texts[i],observed,before,after,messages:j2.capturePayloads.slice(start)};
  write(resolve(out,'J2_TURN_'+i+'.json'),row);results.push(row);
 }
 ports.setStage('J1_PRIMARY');
 const primaryOut=resolve(out,'primary');
 const primary=await runJ1Primary({registration:reg,registrationPath:input.j1Registration,sealHash:digest(reg),out:primaryOut,root,send:ports.sender});
 // Primary request IDs/evaluator rows never enter provider bodies. Whole-output
 // assessments are supplied offline by the caller under the frozen predicates.
 write(resolve(out,'ASSESSMENT_NEEDED.json'),{primaryFile:resolve(primaryOut,'PRIMARY.json'),assessmentFile:resolve(out,'ASSESSMENTS.json'),predicateHash:digest(reg.predicates)});
 const deadline=Date.now()+input.assessmentWaitMs;
 while(!existsSync(resolve(out,'ASSESSMENTS.json'))&&Date.now()<deadline)await new Promise(r=>setTimeout(r,1000));
 assert(existsSync(resolve(out,'ASSESSMENTS.json')),'CAMPAIGN_OFFLINE_ASSESSMENT_MISSING');
 const gate=scoreJ1Primary(reg,primary,read(resolve(out,'ASSESSMENTS.json')));write(resolve(out,'J1_GATE.json'),gate);
 const conditional=[];
 if(gate.status==='CONDITIONAL_NATIVE_ALLOWED'){
  const a=await seedJ1(),b=await seedJ1();
  const canonical=s=>({stage:s.publicState.stage,cart:s.publicState.cart,profile:s.publicState.profile,
   history:s.publicHistory.history.filter(h=>!h.text.startsWith('{"event":"RECENT_SHOP_IMAGES_ACCEPTED"'))});
  const beforeA=await snapshot(a),beforeB=await snapshot(b);assert.equal(digest(canonical(beforeA)),digest(canonical(beforeB)),'CAMPAIGN_NATIVE_PARITY');
  write(resolve(out,'NATIVE_PARITY.json'),{a:beforeA,b:beforeB,canonicalHash:digest(canonical(beforeA)),storeIdentities:[a.bound,b.bound]});
  for(const [arm,j]of [['A',a],['B',b]]){
   assert(Date.parse(input.minimumProofExpiresAt)-Date.now()>4*90000+input.safetyMarginMs,'CAMPAIGN_NATIVE_HEADROOM');
   const start=j.capturePayloads.length;ports.setStage('J1_NATIVE',0,arm);
   const observed=await j.turn(j1Texts[2],[]);ports.checkOutcome(observed);if(observed.qualification?.status==='VALID')await j.drain();
   const row={arm,customer:j1Texts[2],observed,after:await snapshot(j),messages:j.capturePayloads.slice(start)};
   write(resolve(out,'J1_NATIVE_'+arm+'.json'),row);conditional.push(row);
  }
 }
 const primaryRequests=primary.providerRequests,nativeRequests=ports.generations.reduce((n,g)=>n+g.providerRequests,0);
 const result={mode:'COLLECTED_NOT_GRADED',sourceSha:input.runSourceSha,worldHash:input.worldHash,
  registered:{j2Turns:3,j2GenerationMaximum:12,primarySlots:10,nativeArms:2,nativeGenerationMaximum:8,totalMaximum:30},
  j2Turns:results.length,primary:{attempted:primary.attempted,completed:primary.completed,errors:primary.errors,notRun:primary.notRun},
  gate:gate.status,conditional:{attempted:conditional.length,notRun:2-conditional.length},
  generations:ports.generations,providerRequests:nativeRequests+primaryRequests,primaryProviderRequests:primaryRequests,nativeProviderRequests:nativeRequests,
  retry:0,liveSend:false,sourceWrites:0,qualification:'NOT_QUALIFICATION_NO_GO'};
 assert(result.providerRequests<=30,'CAMPAIGN_TOTAL_CAP');write(resolve(out,'RESULT.json'),result);return result;
}
