import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename,resolve} from 'node:path';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {buildJ1BodyPair,registerJ1,j1Preflight,runJ1Primary,scoreJ1Primary,runJ1NativePairs,createJ1Sender,validateJ1Registration,J1_PREDICATES} from './j1-operation-control.mjs';
import {byteHash,digest} from './bc-control.mjs';
import {OWNER_REQUEST_MAX_BYTES,OWNER_IMAGE_BOUNDS} from '../single-agent-commerce-read-only/gemini-inference.mjs';

const request=()=>({generationId:'synthetic-owner-1',instructions:'Tư vấn bán hàng.',ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2',
 contents:[{role:'user',parts:[{text:'Hai áo cả ship bao nhiêu em?'}]}],
 availableTools:['quote_product','quote_cart','add_to_cart'],toolBudget:{roundsRemaining:2,callsRemaining:6},toolWorkAccounting:'PRIMITIVE_WORK_V2',
 context:{boundSubjects:[{ref:'P1',kind:'PRODUCT',label:'Áo'}],runtimeProducts:[],protectedClaims:[],effectReceipts:[],
  policyLiterals:[{ref:'conversation-entry',text:JSON.stringify({firstContact:false})}],state:{revision:1,currentProductId:'P1'}}});
const model={model:'gemini-3.5-flash-lite',version:'gemini-3.5-flash-lite',effort:'high',generationConfig:{retry:0}};
const schedule={requestTimeoutMs:90000,primaryBudgetMs:900000,nativeBudgetMs:720000,safetyMarginMs:1000};
const cleanup=path=>{assert.equal(dirname(resolve(path)),resolve(tmpdir()));assert(basename(path).startsWith('j1-'));rmSync(path,{recursive:true,force:true});};
const saveReg=(tmp,reg)=>{mkdirSync(tmp,{recursive:true});const p=join(tmp,'REGISTRATION.json');writeFileSync(p,JSON.stringify(reg),{flag:'wx'});return p;};
function registration(){
 const cart=request();cart.context.state.cartQuote={result:{status:'AUTHORIZED',grandTotalVnd:1000}};
 return registerJ1({cases:[{id:'j1-total',request:request(),evaluator:{subjectRef:'P1',offerType:'DIRECT',quantity:2}},
  {id:'cart-control',request:cart,evaluator:{seededByExecutor:true,receiptHash:'synthetic-only',cartReadbackHash:'synthetic-only'}},
  {id:'ack-control',request:request(),evaluator:{}}],seed:'fixed-seed',model,projectId:'synthetic-project',runSourceSha:'a'.repeat(40),artifacts:[{path:'synthetic',sha256:'b'.repeat(64)}],
  schedule,minimumProofExpiresAt:'2099-01-01T00:00:00.000Z'});
}
const quote=()=>({kind:'TOOLS',calls:[{name:'quote_product',args:{subjectRef:'P1',offerTypes:['DIRECT'],quantity:2}}]});
const outputFor=id=>id==='j1-total'?quote():{kind:'FINAL',text:'Dạ chị.'};
const report=reg=>({sealHash:digest(reg),rows:reg.slots.map(s=>({...s,status:'OK',providerRequests:1,output:outputFor(s.id)}))});
const assessments=r=>r.rows.filter(r=>r.id!=='j1-total').map(r=>({slotId:r.slotId,outputHash:digest(r.output),predicateHash:digest(J1_PREDICATES),pass:true,reason:'Synthetic offline whole-output assessment.'}));

test('B differs by exactly one bounded part; actual returning schema requires quantity; signed content remains byte-identical',()=>{
 const r=request();r.ownerContextPresentation='VI_DATA_BLOCKS_COMPACT_V2';
 r.contents.push({role:'model',parts:[{functionCall:{name:'quote_product',args:{subjectRef:'P1',offerTypes:['DIRECT'],quantity:2}},thoughtSignature:'opaque-signature'}]});
 const {a,b,budget}=buildJ1BodyPair(r),copy=structuredClone(b);copy.contents[0].parts.splice(1,1);
 assert.equal(JSON.stringify(copy),JSON.stringify(a));assert.equal(b.contents.at(-1).parts[0].thoughtSignature,'opaque-signature');
 const view=JSON.parse(b.contents[0].parts[1].text).codeOperationRequirements;
 assert(view.operations.find(o=>o.name==='quote_product').requiredArgs.includes('quantity'));
 assert.equal(view.operations.find(o=>o.name==='quote_cart').inputBasis,'CONFIGURED_QUOTE_INPUT');
 assert(view.operations.every(o=>o.inputReadiness==='UNKNOWN'));assert(budget.viewBytes<=1024);
 assert.equal(budget.insertionBytes,Buffer.byteLength(JSON.stringify(b))-Buffer.byteLength(JSON.stringify(a)));
});

test('text-bound delta is checked at limit and limit+1 without truncating context',()=>{
 const r=request();let pair=buildJ1BodyPair(r);
 const gap=OWNER_REQUEST_MAX_BYTES-Math.max(pair.budget.textFrameBytes,pair.budget.presentedTextFrameBytes)-pair.budget.insertionBytes;
 r.instructions+='x'.repeat(gap);assert.doesNotThrow(()=>buildJ1BodyPair(r));
 r.instructions+='x';assert.throws(()=>buildJ1BodyPair(r),/J1_TEXT_BOUND/);
});

test('multimodal bytes are kept, text cap still applies and final image frame is bounded',()=>{
 const r=request(),raw=Buffer.alloc(12000,1),sha256=createHash('sha256').update(raw).digest('hex');
 r.catalogImages=[{subjectRef:'P1',assetRef:'img',sha256,mimeType:'image/jpeg',data:raw.toString('base64')}];
 r.context.policyLiterals.push({ref:'vision:P1',text:JSON.stringify({subjectRef:'P1',assets:[{assetRef:'img',sha256,mimeType:'image/jpeg'}]})});
 const p=buildJ1BodyPair(r);assert.equal(p.a.contents[1].parts[1].inlineData.data,p.b.contents[1].parts[1].inlineData.data);
 assert(Buffer.byteLength(JSON.stringify(p.b))<=OWNER_IMAGE_BOUNDS.maxRequestBytes);
});

test('evaluator labels cannot enter a captured body, including nested JSON',()=>{
 const r=request();r.contents[0].parts[0].text=JSON.stringify({scoringLabels:['canary']});
 assert.throws(()=>buildJ1BodyPair(r),/EVALUATOR/);
 const id=request();id.contents[0].parts[0].text='ack-control';assert.throws(()=>buildJ1BodyPair(id),/CASE_ID/);
});

test('population is 10 adjacent seeded A/B slots, independent of provider results',()=>{
 const r=registration();assert.equal(r.slots.length,10);assert.equal(new Set(r.slots.map(s=>s.slotId)).size,10);
 for(let i=0;i<10;i+=2){assert.equal(r.slots[i].id,r.slots[i+1].id);assert.notEqual(r.slots[i].arm,r.slots[i+1].arm);}
 assert.equal(r.slots.filter(s=>s.id==='j1-total').length,6);assert.deepEqual(r.slots,registration().slots);
});

test('seal validation rejects slot refill, reordered samples, changed tools or extra metadata',()=>{
 for(const mutate of [r=>r.slots.reverse(),r=>r.slots.push(r.slots[0]),r=>r.cases[0].pair.b.tools.pop(),
  r=>{const p=r.cases[0].pair.b.contents[0].parts[1];const x=JSON.parse(p.text);x.expectedTool='quote_product';p.text=JSON.stringify(x);r.cases[0].pair.hashes.b=byteHash(JSON.stringify(r.cases[0].pair.b));}]){
  const r=registration();mutate(r);assert.throws(()=>validateJ1Registration(r));
 }
});

test('real Git preflight binds clean HEAD/artifacts and worst-case lifetime headroom',()=>{
 const tmp=mkdtempSync(join(tmpdir(),'j1-preflight-'));
 const git=(...args)=>execFileSync('git',args,{cwd:tmp,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git('init');writeFileSync(join(tmp,'source.txt'),'frozen');git('add','source.txt');
  git('-c','user.name=Synthetic Test','-c','user.email=synthetic@example.invalid','commit','-m','synthetic');
  const reg=registration();reg.runSourceSha=git('rev-parse','HEAD');reg.artifacts=[{path:join(tmp,'source.txt'),sha256:byteHash('frozen')}];
  const headroom=reg.schedule.primaryBudgetMs+reg.schedule.nativeBudgetMs+reg.schedule.safetyMarginMs;
  reg.minimumProofExpiresAt=new Date(headroom).toISOString();
  assert.doesNotThrow(()=>j1Preflight(reg,{root:tmp,now:0}));
  assert.throws(()=>j1Preflight(reg,{root:tmp,now:1}),/SOURCE_HEADROOM/);
  reg.artifacts[0].sha256='0'.repeat(64);assert.throws(()=>j1Preflight(reg,{root:tmp,now:0}),/ARTIFACT_CHANGED/);
  reg.artifacts[0].sha256=byteHash('frozen');writeFileSync(join(tmp,'source.txt'),'changed');
  assert.throws(()=>j1Preflight(reg,{root:tmp,now:0}),/SOURCE_DIRTY/);
 }finally{cleanup(tmp);}
});

test('technical-only baseline miss cannot open conditional native; behavioral miss can',()=>{
 const reg=registration(),r=report(reg),a=r.rows.find(r=>r.id==='j1-total'&&r.arm==='A');
 a.status='TIMEOUT';delete a.output;
 assert.equal(scoreJ1Primary(reg,r,assessments(r)).status,'INCONCLUSIVE');
 a.status='OK';a.output={kind:'TOOLS',calls:[{name:'read_product',args:{subjectRef:'P1'}}]};
 assert.equal(scoreJ1Primary(reg,r,assessments(r)).status,'CONDITIONAL_NATIVE_ALLOWED');
});

test('same pass rate has no incremental evidence; controls need frozen whole-output assessments',()=>{
 const reg=registration(),r=report(reg);
 assert.throws(()=>scoreJ1Primary(reg,r),/OFFLINE_ASSESSMENT/);
 assert.equal(scoreJ1Primary(reg,r,assessments(r)).status,'NO_INCREMENTAL_EVIDENCE');
 const a=assessments(r);a[0].outputHash='changed';assert.throws(()=>scoreJ1Primary(reg,r,a),/OFFLINE_ASSESSMENT/);
});

test('wrong quantity, wrong target, invented colour and mutation cannot pass DIRECT_QUOTE',()=>{
 for(const change of ['quantity','subject','color','mutation']){
  const reg=registration(),r=report(reg),b=r.rows.find(r=>r.id==='j1-total'&&r.arm==='B');
  if(change==='quantity')b.output.calls[0].args.quantity=1;
  if(change==='subject')b.output.calls[0].args.subjectRef='P2';
  if(change==='color')b.output.calls[0].args.color='invented';
  if(change==='mutation')b.output.calls.push({name:'add_to_cart',args:{}});
  assert.equal(scoreJ1Primary(reg,r,assessments(r)).status,'NO_ADOPTION_EVIDENCE',change);
 }
});

test('valid quote read siblings stay direct; unsolicited prose needs a whole-output assessment',()=>{
 const reg=registration(),r=report(reg),a=r.rows.find(r=>r.arm==='A'&&r.id==='j1-total');
 a.output.calls.push({name:'read_policy',args:{}});
 assert.equal(scoreJ1Primary(reg,r,assessments(r)).status,'NO_INCREMENTAL_EVIDENCE');
 a.output.content={role:'model',parts:[{text:'Tổng hai áo là 700k.'}]};
 assert.throws(()=>scoreJ1Primary(reg,r,assessments(r)),/OFFLINE_ASSESSMENT/);
 const scores=[...assessments(r),{slotId:a.slotId,outputHash:digest(a.output),predicateHash:digest(J1_PREDICATES),pass:false,reason:'Unproved total in accompanying prose.'}];
 assert.equal(scoreJ1Primary(reg,r,scores).status,'CONDITIONAL_NATIVE_ALLOWED');
});

test('primary capture never forwards evaluator data; errors retained, one send per registered slot',async()=>{
 const reg=registration(),tmp=mkdtempSync(join(tmpdir(),'j1-primary-')),out=join(tmp,'run'),captured=[];
 try{
  const registrationPath=saveReg(tmp,reg);
  const r=await runJ1Primary({registration:reg,registrationPath,sealHash:digest(reg),out,root:process.cwd(),preflight:()=>{},now:()=>0,
   send:async(body,hash)=>{assert.equal(byteHash(JSON.stringify(body)),hash);captured.push(body);
    assert(!/j1-total|cart-control|ack-control|evaluator|seededByExecutor/.test(JSON.stringify(body)));
    return {status:captured.length===1?'PROVIDER_ERROR':'OK',output:{kind:'FINAL',text:'Dạ chị.'},telemetry:{providerRequests:1}};}});
  assert.equal(captured.length,10);assert.equal(r.attempted,10);assert.equal(r.errors,1);assert.equal(r.providerRequests,10);assert.equal(r.toolsExecuted,0);
  assert.equal(readFileSync(join(out,'REQUESTS.jsonl'),'utf8').trim().split('\n').length,10);
  await assert.rejects(()=>runJ1Primary({registration:reg,registrationPath,sealHash:digest(reg),out:join(tmp,'duplicate'),root:process.cwd(),preflight:()=>{},now:()=>0,send:()=>{throw Error('MUST_NOT_RETRY');}}),/EEXIST/);
 }finally{cleanup(tmp);}
});

test('unknown accounting stops without retry; exhausted phase leaves NOT_RUN rather than attempts',async()=>{
 const reg=registration(),tmp=mkdtempSync(join(tmpdir(),'j1-accounting-'));
 try{
  let sends=0;await assert.rejects(()=>runJ1Primary({registration:reg,registrationPath:saveReg(join(tmp,'reg-unknown'),reg),sealHash:digest(reg),out:join(tmp,'unknown'),root:process.cwd(),preflight:()=>{},now:()=>0,
   send:async()=>{sends++;return {status:'PROVIDER_ERROR',telemetry:{}};}}),/UNKNOWN_ACCOUNTING/);assert.equal(sends,1);
  let t=0;const r=await runJ1Primary({registration:reg,registrationPath:saveReg(join(tmp,'reg-deadline'),reg),sealHash:digest(reg),out:join(tmp,'deadline'),root:process.cwd(),preflight:()=>{},now:()=>t,
   send:async()=>{t=900001;return {status:'TIMEOUT',telemetry:{providerRequests:1}};}});
  assert.equal(r.attempted,1);assert.equal(r.notRun,9);assert.equal(r.errors,1);
 }finally{cleanup(tmp);}
});

test('closed gate executes no native setup, requests or effects',async()=>{
 let called=0;const r=await runJ1NativePairs({gate:{status:'INCONCLUSIVE'},makeIngress:()=>{called++;}});
 assert.equal(called,0);assert.equal(r.notRun,2);assert.equal(r.attempted,0);
});

test('paired native wrapper preserves independent stores and counts 3 owner + 1 verifier each',async()=>{
 const reg=registration(),r=report(reg);r.rows.find(r=>r.arm==='A'&&r.id==='j1-total').output={kind:'FINAL',text:'Mình chọn màu nào chị?'};
 const gate=scoreJ1Primary(reg,r,assessments(r)),recorded=[];
 const fixture=arm=>({storeIdentity:arm,businessStateHash:'a'.repeat(64),historyHash:'b'.repeat(64),
  input:{scope:{conversationId:arm,customerHash:arm},verifier:async()=>({result:{verdict:'PASS',violations:[]},telemetry:{providerRequests:1}})}});
 const result=await runJ1NativePairs({reg,gate,makeIngress:async arm=>fixture(arm),verifySource:()=>{},record:(...a)=>recorded.push(a),now:()=>0,
  send:async()=>({status:'OK',output:{kind:'FINAL',text:'Dạ chị.'},telemetry:{providerRequests:1}}),
  runIngress:async input=>{for(let i=0;i<3;i++)await input.owner(request());await input.verifier({});return {result:{terminal:{disposition:'SEND_ELIGIBLE'}}};}});
 assert.equal(result.generations.length,8);assert.equal(result.providerRequests,8);assert.equal(result.notRun,0);
 const bodies=recorded.filter(r=>r[0]==='OWNER_REQUEST');assert.equal(bodies.length,6);
 assert(bodies.filter(r=>r[1].arm==='A').every(r=>r[1].body.contents[0].parts.length===1));
 assert(bodies.filter(r=>r[1].arm==='B').every(r=>r[1].body.contents[0].parts.length===2));
});

test('paired native rejects aliased stores and unknown completion without second-arm dispatch',async()=>{
 const reg=registration(),r=report(reg);r.rows.find(r=>r.arm==='A'&&r.id==='j1-total').output={kind:'FINAL',text:'Mình chọn màu nào chị?'};
 const gate=scoreJ1Primary(reg,r,assessments(r));let sends=0;
 const fixture=arm=>({storeIdentity:arm,businessStateHash:'a'.repeat(64),historyHash:'b'.repeat(64),input:{scope:{conversationId:arm,customerHash:arm}}});
 await assert.rejects(()=>runJ1NativePairs({reg,gate,verifySource:()=>{},makeIngress:async()=>fixture('same')}),/NATIVE_PARITY/);
 await assert.rejects(()=>runJ1NativePairs({reg,gate,verifySource:()=>{},makeIngress:async arm=>fixture(arm),record:()=>{},now:()=>0,
  send:async()=>{sends++;throw Error('UNKNOWN_PROVIDER_COMPLETION');},
  runIngress:async input=>{try{await input.owner(request());}catch{}return {};}}),/UNKNOWN_COMPLETION/);
 assert.equal(sends,1);
});

test('provider sender receives exact B body and retains one 401, no hidden retry',async()=>{
 const credential={type:'service_account',project_id:'synthetic-project',client_email:'fixture@synthetic-project.iam.gserviceaccount.com',
  private_key:generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'})};
 const captured=[];const send=createJ1Sender({projectId:'synthetic-project',model},{credential,fetchImpl:async(url,init)=>{
  if(url.includes('oauth2'))return Response.json({access_token:'synthetic-only',expires_in:3600});captured.push(init.body);return new Response('',{status:401});}});
 const pair=buildJ1BodyPair(request()),r=await send(pair.b,pair.hashes.b);
 assert.equal(r.status,'PROVIDER_ERROR');assert.equal(r.telemetry.providerRequests,1);assert.deepEqual(captured,[JSON.stringify(pair.b)]);
});
