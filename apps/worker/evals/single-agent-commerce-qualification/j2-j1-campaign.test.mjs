import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as campaign from './j2-j1-campaign.mjs';
import {registerJ1,runJ1Primary,J1_PREDICATES,J1_LIMITS} from './j1-operation-control.mjs';
import {digest,byteHash,write} from './bc-control.mjs';

const read=p=>JSON.parse(readFileSync(p,'utf8'));
const ref=path=>({path,sha256:byteHash(readFileSync(path))});
function setup(t){
 const dir=mkdtempSync(join(tmpdir(),'j1-stages-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const request={instructions:'Tư vấn bán hàng.',ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2',
  contents:[{role:'user',parts:[{text:'Hai áo cả ship bao nhiêu em?'}]}],availableTools:['quote_product','quote_cart','add_to_cart'],
  toolBudget:{roundsRemaining:2,callsRemaining:6},toolWorkAccounting:'PRIMITIVE_WORK_V2',context:{boundSubjects:[{ref:'P1',kind:'PRODUCT',label:'Áo'}],
   runtimeProducts:[],protectedClaims:[],effectReceipts:[],policyLiterals:[{ref:'conversation-entry',text:JSON.stringify({firstContact:false})}],state:{revision:1,currentProductId:'P1'}}};
 const cart=structuredClone(request);cart.context.state.cartQuote={result:{status:'AUTHORIZED',grandTotalVnd:1000}};
 const reg=registerJ1({cases:[{id:'j1-total',request,evaluator:{subjectRef:'P1',offerType:'DIRECT',quantity:2}},
  {id:'cart-control',request:cart,evaluator:{seededByExecutor:true,receiptHash:'synthetic',cartReadbackHash:'synthetic'}},
  {id:'ack-control',request,evaluator:{}}],seed:'fixed-seed',model:{model:'gemini-3.5-flash-lite',version:'gemini-3.5-flash-lite',effort:'high',generationConfig:{retry:0}},
  projectId:'synthetic-project',runSourceSha:'a'.repeat(40),artifacts:[{path:'synthetic',sha256:'b'.repeat(64)}],
  schedule:{requestTimeoutMs:90000,primaryBudgetMs:900000,nativeBudgetMs:720000,safetyMarginMs:1000},minimumProofExpiresAt:'2099-01-01T00:00:00.000Z'});
 const quote={kind:'TOOLS',calls:[{name:'quote_product',args:{subjectRef:'P1',offerTypes:['DIRECT'],quantity:2}}]};
 const rows=reg.slots.map(s=>({...s,status:'OK',providerRequests:1,output:s.id==='j1-total'?structuredClone(quote):{kind:'FINAL',text:'Dạ chị.'}}));
 const primary={sealHash:digest(reg),rows,planned:10,attempted:10,completed:10,errors:0,notRun:0,providerRequests:10,toolsExecuted:0,sourceValidAtCompletion:true};
 const world={test:'frozen synthetic world'};
 const input={mode:'RUN',runSourceSha:reg.runSourceSha,worldFile:join(dir,'WORLD.json'),worldHash:digest(world),
  minimumProofExpiresAt:reg.minimumProofExpiresAt,safetyMarginMs:1000,toolchainHash:'c'.repeat(64),scriptHash:campaign.campaignScriptHash,
  j1Registration:join(dir,'REGISTRATION.json'),j1RegistrationHash:digest(reg)};
 const inputFile=join(dir,'INPUT.json'),primaryFile=join(dir,'PRIMARY.json'),assessmentFile=join(dir,'ASSESSMENTS.json');
 write(input.worldFile,world);write(input.j1Registration,reg);write(inputFile,input);write(primaryFile,primary);
 const assessments=rows.filter(r=>r.id!=='j1-total').map(r=>({slotId:r.slotId,outputHash:digest(r.output),predicateHash:digest(J1_PREDICATES),pass:true,reason:'Synthetic whole-output review.'}));
 write(assessmentFile,assessments);
 return {dir,input,inputFile,reg,primary,primaryFile,assessmentFile};
}
const collect=s=>campaign.collectJ1ForScoring({out:s.dir,input:s.input,inputFile:s.inputFile,primaryFile:s.primaryFile});
test('collection closes immediately without assessment and retains complete denominator; score is offline and immutable',t=>{
 const s=setup(t),assessments=read(s.assessmentFile);rmSync(s.assessmentFile);const collected=collect(s);
 assert.equal(collected.status,'AWAITING_OFFLINE_SCORE');assert.equal(collected.providerRequests,10);
 assert.equal(existsSync(join(s.dir,'J1_GATE.json')),false);
 write(s.assessmentFile,assessments);
 const scored=campaign.scoreCollectedJ1({collectionFile:join(s.dir,'COLLECTED.json'),assessmentFile:s.assessmentFile,out:s.dir});
 assert.equal(scored.gate.status,'NO_INCREMENTAL_EVIDENCE');assert.equal(scored.providerRequestsAdded,0);
 assert.throws(()=>campaign.scoreCollectedJ1({collectionFile:join(s.dir,'COLLECTED.json'),assessmentFile:s.assessmentFile,out:s.dir}),/EEXIST/);
});
test('offline scoring detects changed primary',t=>{
 const s=setup(t);collect(s);
 writeFileSync(s.primaryFile,JSON.stringify({...s.primary,providerRequests:0}));
 assert.throws(()=>campaign.scoreCollectedJ1({collectionFile:join(s.dir,'COLLECTED.json'),assessmentFile:s.assessmentFile,out:s.dir}),/ARTIFACT_CHANGED/);
});
test('completed historical outputs can be scored after expiry without renewing source dates',t=>{
 const s=setup(t),expiry='2000-01-01T00:00:00.000Z';s.reg.minimumProofExpiresAt=expiry;
 s.input.minimumProofExpiresAt=expiry;s.input.j1RegistrationHash=digest(s.reg);s.primary.sealHash=digest(s.reg);
 writeFileSync(s.input.j1Registration,JSON.stringify(s.reg));writeFileSync(s.inputFile,JSON.stringify(s.input));writeFileSync(s.primaryFile,JSON.stringify(s.primary));
 collect(s);const scored=campaign.scoreCollectedJ1({collectionFile:join(s.dir,'COLLECTED.json'),assessmentFile:s.assessmentFile,out:s.dir});
 assert.equal(scored.gate.status,'NO_INCREMENTAL_EVIDENCE');assert.equal(read(s.inputFile).minimumProofExpiresAt,expiry);
});
test('collection rejects changed registration, missing rows and false request totals',t=>{
 for(const mutation of [p=>p.rows.pop(),p=>{p.providerRequests=0;},p=>{p.rows[0].providerRequests=null;}]){
  const s=setup(t);mutation(s.primary);writeFileSync(s.primaryFile,JSON.stringify(s.primary));
  assert.throws(()=>collect(s),/DENOMINATOR|ACCOUNTING/);
 }
});
test('native resume revalidates score, gate, world, source and expiry, and cannot rerun claimed arms',t=>{
 const s=setup(t);s.primary.rows.find(r=>r.id==='j1-total'&&r.arm==='A').output={kind:'TOOLS',calls:[{name:'read_product',args:{subjectRef:'P1'}}]};
 writeFileSync(s.primaryFile,JSON.stringify(s.primary));collect(s);
 const score=campaign.scoreCollectedJ1({collectionFile:join(s.dir,'COLLECTED.json'),assessmentFile:s.assessmentFile,out:s.dir});
 assert.equal(score.gate.status,'CONDITIONAL_NATIVE_ALLOWED');
 const input={...s.input,mode:'RESUME',scored:ref(join(s.dir,'SCORE.json'))};let checks=0;
 assert.throws(()=>campaign.openJ1Resume({input,out:s.dir,now:Date.parse(s.input.minimumProofExpiresAt),verifySource:()=>checks++}),/HEADROOM/);
 const changed={...input,runSourceSha:'d'.repeat(40)};
 assert.throws(()=>campaign.openJ1Resume({input:changed,out:s.dir,now:0,verifySource:()=>checks++}),/SOURCE_CHANGED/);
 const resumed=campaign.openJ1Resume({input,out:s.dir,now:0,verifySource:()=>checks++});
 assert.equal(resumed.gate.status,'CONDITIONAL_NATIVE_ALLOWED');assert(checks>0);
 assert.throws(()=>campaign.openJ1Resume({input,out:s.dir,now:0,verifySource:()=>{}}),/EEXIST/);
});
test('failed adoption gate stays NOT_RUN; altered assessment cannot authorize resume',t=>{
 const s=setup(t);collect(s);campaign.scoreCollectedJ1({collectionFile:join(s.dir,'COLLECTED.json'),assessmentFile:s.assessmentFile,out:s.dir});
 const input={...s.input,mode:'RESUME',scored:ref(join(s.dir,'SCORE.json'))};
 const blocked=campaign.openJ1Resume({input,out:s.dir,now:0,verifySource:()=>{}});
 assert.equal(blocked.gate.status,'NO_INCREMENTAL_EVIDENCE');assert(!existsSync(join(s.dir,'J1_NATIVE.claim.json')));
 writeFileSync(s.assessmentFile,'[]');
 assert.throws(()=>campaign.openJ1Resume({input,out:s.dir,now:0,verifySource:()=>{}}),/ARTIFACT_CHANGED/);
});
test('durable accounting retains known HTTP on thrown work and unknown completion never becomes zero',t=>{
 const s=setup(t),ledger=campaign.createCampaignAccounting(s.dir);
 const a=ledger.claim({phase:'J1_PRIMARY',role:'OWNER',slotId:'first'});
 assert.equal(read(join(s.dir,'ACCOUNTING.json')).providerRequests,null);
 ledger.complete(a,{status:'ERROR',providerRequests:1});
 const b=ledger.claim({phase:'J1_PRIMARY',role:'OWNER',slotId:'second'});
 ledger.complete(b,{status:'UNKNOWN',providerRequests:null});
 const summary=ledger.summary();assert.equal(summary.knownProviderRequests,1);assert.equal(summary.providerRequests,null);
 assert.equal(summary.attempted,2);assert.equal(summary.unknownAttempts,1);
 assert.throws(()=>ledger.claim({phase:'J1_PRIMARY',role:'OWNER',slotId:'third'}),/UNKNOWN_COMPLETION/);
});
test('zero-attempt accounting exists before dispatch and an existing ledger cannot be reset',t=>{
 const s=setup(t);campaign.createCampaignAccounting(s.dir);
 assert.equal(read(join(s.dir,'ACCOUNTING.json')).attempted,0);
 assert.equal(read(join(s.dir,'ACCOUNTING.json')).providerRequests,0);
 assert.throws(()=>campaign.createCampaignAccounting(s.dir),/EEXIST/);
});
test('separate baseline diagnostic executes both final outcomes once without metadata B or tool-choice grading',async t=>{
 const s=setup(t),stages=[],calls=[];
 const ports={generations:[],source(){},setStage(...args){stages.push(args);},checkOutcome(){}};
 const sessions=async id=>({capturePayloads:[],async turn(text){calls.push({id,text});return {qualification:{status:'VALID'},result:{terminal:{disposition:'SEND_ELIGIBLE'}}};},async drain(){this.capturePayloads.push({text:'Dạ chị.'});}});
 const result=await campaign.runJ1Baseline({input:{...s.input,mode:'BASELINE_NATIVE',baseline:campaign.J1_BASELINE_REGISTRATION},out:s.dir,ports,
  seedJ1:()=>sessions('total'),fixture:()=>sessions('ack'),snapshot:async()=>({cart:null}),now:()=>0});
 assert.equal(result.cases.length,2);assert.equal(result.providerRequests,0);assert.equal(calls.length,2);
 assert.deepEqual(stages.map(s=>s[0]),['J1_BASELINE','J1_BASELINE']);
 assert(result.cases.every(c=>c.observed.result.terminal.disposition==='SEND_ELIGIBLE'));
 assert.equal(result.qualification,'NOT_QUALIFICATION_NO_GO');
 assert.throws(()=>campaign.assertBaselineRegistration({...campaign.J1_BASELINE_REGISTRATION,repetitions:3}),/BASELINE_REGISTRATION/);
});
test('actual campaign collect branch returns without waiting, scoring or seeding conditional native',async t=>{
 const s=setup(t),prior=join(s.dir,'PRIOR_J2.json');rmSync(s.assessmentFile);write(prior,{j2Turns:3,providerRequests:9,retry:0});
 const input={...s.input,limits:J1_LIMITS,skipJ2:true,priorJ2:{file:prior,sha256:ref(prior).sha256}};writeFileSync(s.inputFile,JSON.stringify(input));
 let fixtures=0,primaryRuns=0;const generations=[];
 const ports={source(){},limitExpiry(){},preparation(){},toolchain:{binarySha256:input.toolchainHash},generations,setStage(){},
  accounting:()=>({attempted:10,providerRequests:10,knownProviderRequests:10,unknownAttempts:0,generations})};
 const result=await campaign.executeCampaign({root:process.cwd(),input,inputFile:s.inputFile,world:{},out:s.dir,ports,
  sessionFactory:async()=>{fixtures++;return {};},snapshot:()=>{throw Error('NO_NATIVE_MODEL_RUN');},
  runPrimary:async({out,remainingNative})=>{primaryRuns++;assert.equal(remainingNative,false);mkdirSync(out);
   for(const r of s.primary.rows)generations.push({phase:'J1_PRIMARY',status:r.status,providerRequests:1});
   write(join(s.dir,'ACCOUNTING.json'),ports.accounting());write(join(out,'PRIMARY.json'),s.primary);return s.primary;}});
 assert.equal(primaryRuns,1);assert.equal(fixtures,1);assert.equal(result.mode,'AWAITING_OFFLINE_SCORE');
 assert.equal(result.combinedProviderRequests,19);assert.equal(result.conditional.attempted,0);
 assert(!existsSync(join(s.dir,'J1_GATE.json')));
});
test('unexpected primary failure persists complete planned denominator and unknown HTTP without refill',async t=>{
 const s=setup(t),out=join(s.dir,'failed');let sends=0;
 await assert.rejects(()=>runJ1Primary({registration:s.reg,registrationPath:s.input.j1Registration,sealHash:digest(s.reg),out,
  root:process.cwd(),preflight:()=>{},now:()=>0,send:async()=>{sends++;throw Error('synthetic unknown completion');}}));
 assert.equal(sends,1);const failed=read(join(out,'PRIMARY_FAILURE.json'));
 assert.equal(failed.rows.length,10);assert.equal(failed.attempted,1);assert.equal(failed.notRun,9);
 assert.equal(failed.providerRequests,null);assert.equal(failed.rows[0].status,'UNKNOWN');assert(!existsSync(join(out,'PRIMARY.json')));
});
