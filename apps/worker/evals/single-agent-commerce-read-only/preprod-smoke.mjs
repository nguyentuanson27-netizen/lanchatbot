import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createCapturedOwnerSender} from '../single-agent-commerce-qualification/bc-owner-replay.mjs';
import {assertReplayWire} from '../single-agent-commerce-qualification/sales-voice-replay.mjs';
import {assertRuntimeFirewall} from '../single-agent-commerce-qualification/qualification.mjs';
import {inspectCodex} from '../single-agent-semantic-verifier/codex-inference.mjs';
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {createCommerceVerifier,geminiVerifier,validateProtocol} from './protocol.mjs';
import {OPENING_PRODUCT_MEDIA_RULE} from '../../dist/single-agent-commerce-opening-media.js';
import {EXPLICIT_QUOTE_TASK} from '../../dist/single-agent-commerce-quote.js';
import {commerceHash} from '../../dist/single-agent-commerce-read-only-context.js';
import {createHash} from 'node:crypto';

export const PREPROD_SMOKE_PREFIX='PREPROD smoke ';
const ids=['ADS','FIT_CHECKOUT','MISSING_SOURCE'];
const imageUrl='https://content.pancake.vn/c3-synthetic-product-back.jpg';
const money=(text,amount)=>text.includes(amount.toLocaleString('vi-VN')+'đ')||
 (amount%1000===0&&new RegExp('\\b'+amount/1000+'\\s*k\\b','i').test(text));
const oneText=payloads=>payloads.filter(p=>typeof p.text==='string').map(p=>p.text);

export async function runPreprodSmoke({root,report,check,statefulFixture,pool,runtime,inbox,pageId,save}){
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const source=git('rev-parse','HEAD');
 assert.equal(git('status','--porcelain'),'','SMOKE_DIRTY_SOURCE');
 assert.equal(report.sendEnabled,false);
 const load=name=>readFileSync(new URL(name,import.meta.url),'utf8');
 const manifest=validateProtocol(JSON.parse(load('./manifest.json')));
 const client=geminiVerifier(manifest)?null:inspectCodex();
 if(client)assert.equal(client.version,'codex-cli '+manifest.models.verifier.generationConfig.cliVersion);
 const config=JSON.parse(load('./source-config.b1.json'));
 assert.equal(JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8')).project_id,config.vertex.projectId);
 const ownerPrompt=load('./prompts/owner.vi.txt'),verifierPrompt=load('./prompts/verifier.vi.txt');
 const sha=text=>createHash('sha256').update(text).digest('hex');
 assert.equal(sha(ownerPrompt),manifest.promptHashes.owner);
 assert.equal(sha(verifierPrompt),manifest.promptHashes.verifier);
 const sender=createCapturedOwnerSender({projectId:config.vertex.projectId,model:manifest.models.conversation},
  {assertBody:wire=>assertReplayWire(wire,ids)});
 const verify=createCommerceVerifier(manifest);
 const retryIndex=process.argv.indexOf('--preprod-smoke-fit-only');
 const prior=retryIndex<0?null:JSON.parse(readFileSync(process.argv[retryIndex+1],'utf8'));
 if(prior){
  assert.equal(prior.testDatabaseDropped,true);
  assert.equal(prior.sendEnabled,false);
  assert.deepEqual(prior.cases.map(c=>[c.status,c.error??null]),[['PASS',null],['FAIL','FIT_ENGINE_DID_NOT_PROVE_M'],['PASS',null]]);
 }
 const traceAdd=process.argv.includes('--preprod-smoke-trace-add');
 assert(!traceAdd||prior,'SMOKE_TRACE_REQUIRES_ORIGINAL_RUN');
 const selected=prior?['FIT_CHECKOUT']:ids;
 const trace=[];
 const replayIndex=process.argv.indexOf('--preprod-smoke-replay-add');
 const replay=replayIndex<0?null:JSON.parse(readFileSync(process.argv[replayIndex+1],'utf8'));
 if(replay){
  assert(traceAdd&&replay.testDatabaseDropped&&replay.sendEnabled===false);
  assert.deepEqual(replay.smoke.trace.map(x=>[x.index,x.output.kind]),[[1,'TOOLS'],[1,'FINAL']]);
 }
 const checkCase=(id,label,fn)=>selected.includes(id)?check(PREPROD_SMOKE_PREFIX+label,fn):undefined;
 const ledger=[],evidence={};
 report.smoke={source,client,expectedCases:selected,...(traceAdd?{trace}:{}),priorSmokeSource:prior?.sourceSha??null,maximumGenerations:20,generationRetry:0,
  configuredRoles:{owner:manifest.models.conversation,verifier:manifest.models.verifier},
  scope:'REAL_ISOLATED_POSTGRES_SYNTHETIC_CATALOG_STUB_DELIVERY_REAL_OWNER_VERIFIER',liveSend:false,evidence,ledger};
 save();
 const ensureTestOnly=async()=>{
  const row=(await pool.query('SELECT current_database() AS database, page_alias, meta_app_id FROM pages WHERE page_id=$1',[pageId])).rows[0];
  // The disposable page enables its Outbox for the intercepted transport. External send stays off.
  assert.match(row.database,/^c3_b_test_[a-f0-9]{16}$/u);
  assert.equal(row.page_alias,'c3-b-isolated');
  assert.equal(row.meta_app_id,'synthetic');
  assert.equal(report.sendEnabled,false);
 };
 await ensureTestOnly();
 function ports(id,index){
  const call=async(role,wire)=>{
   assert.equal(git('rev-parse','HEAD'),source);
   assert.equal(git('status','--porcelain'),'');
   assert(!ledger.some(row=>row.status==='PENDING'||row.providerRequests===null),'SMOKE_PROVIDER_UNKNOWN');
   assert(ledger.length<20,'SMOKE_GENERATION_CAP');
   assert(ledger.filter(r=>r.id===id&&r.index===index&&r.role===role).length<(role==='OWNER'?3:1),'SMOKE_TURN_CAP');
   const row={id,index,role,status:'PENDING',providerRequests:null};
   ledger.push(row);save();
   try{
    const result=await wire();
    const t=result.telemetry;
    assert([0,1].includes(t?.providerRequests),'SMOKE_PROVIDER_ACCOUNTING');
    Object.assign(row,{status:t.status??result.status??'OK',providerRequests:t.providerRequests,model:t.modelVersion??null,
     error:t.error??t.failureCode??t.errorCode??result.errorCode??null,latencyMs:t.latencyMs??null});save();
    if(result.status&&result.status!=='OK')throw Object.assign(Error('PROVIDER_ERROR'),{telemetry:t});
    return role==='OWNER'?{...result.output,telemetry:t}:result;
   }catch(error){
    if(row.providerRequests===null){const t=error.telemetry;
     Object.assign(row,{status:t?.status??'UNKNOWN',providerRequests:t?.providerRequests??null,model:t?.modelVersion??null,
      error:t?.error??t?.errorCode??error.message,latencyMs:t?.latencyMs??null});save();}
    throw error;
   }
  };
  return {ownerPrompt,verifierPrompt,owner:r=>{
   const body=buildGeminiCommerceRequest({...r,ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2'});
   assertRuntimeFirewall(body,ids);
   const hash=sha(JSON.stringify(body));
   if(!traceAdd)return call('OWNER',()=>sender(body,hash));
   const entry={index,hash,toolsAllowed:r.toolsAllowed,callableTools:r.callableTools,
    replies:r.contents.flatMap(m=>m.parts).flatMap(p=>{
     const x=p.functionResponse;
     if(!x)return [];
     const data=x.response?.data;
     return [{name:x.name,status:x.response?.status,reason:x.response?.reason??null,failureStage:x.response?.failureStage??null,
      effect:data?.effect??null,effectCommitted:data?.effectCommitted??null,operationId:data?.operationId??null,
      cartLines:data?.cartItems??null,cartQuote:data?.cartQuote??null}];
    }),contextCart:r.context.state.cartQuote??null,receipts:r.context.effectReceipts.map(x=>({effect:x.effect,status:x.status})),
    outboundTools:body.tools.flatMap(x=>x.functionDeclarations.map(t=>t.name)),
    scopes:r.context.protectedClaims.map(c=>({type:c.type,scope:c.scope})),
    subjects:r.context.boundSubjects.filter(s=>['PRODUCT','VARIANT'].includes(s.kind))
     .map(s=>({kind:s.kind,ref:s.ref,productId:s.productId??null,variantId:s.variantId??null,hasVariantId:Object.hasOwn(s,'variantId')}))};
   if(replay){
    const output=replay.smoke.trace[trace.length].output;
    entry.output=output;trace.push(entry);save();
    return output.kind==='TOOLS'?{...output,content:{role:'model',parts:output.calls.map(functionCall=>({functionCall}))}}:output;
   }
   trace.push(entry);save();
   return call('OWNER',async()=>{
    const result=await sender(body,hash);
    entry.output=result.output?.kind==='TOOLS'?{kind:'TOOLS',calls:result.output.calls}:
     result.output?.kind==='FINAL'?{kind:'FINAL',text:result.output.text}:null;
    save();return result;
   });
  },verifier:r=>{assert(!replay,'DIAGNOSTIC_REPLAY_MUST_STOP_BEFORE_VERIFIER');return call('VERIFIER',()=>verify(r));}};
 }
 const outbox=j=>pool.query('SELECT response_group_id,sequence_no,status FROM meta_outbox WHERE conversation_id=$1 ORDER BY created_at,sequence_no',[j.bound.conversationId]).then(r=>r.rows);
 const events=j=>pool.query('SELECT count(*)::int AS n FROM handoff_events WHERE conversation_id=$1',[j.bound.conversationId]).then(r=>r.rows[0].n);
 const fixtureState=j=>runtime.loadOrCreate(pageId,j.bound.customerHash,'APP',()=>{throw Error('EXISTING_CONVERSATION_REQUIRED');});
 const attempt=async(j,id,text,{messages}={})=>{
  const index=(evidence[id]??=[]).length;
  const before=j.capturePayloads.length;
  const r=await j.turn(text,[],{messages,testModels:ports(id,index),testQuoteTask:EXPLICIT_QUOTE_TASK,testOpeningMediaRule:OPENING_PRODUCT_MEDIA_RULE,
   slot:id+':'+index});
  assert.equal(r.qualification?.status,'VALID','SMOKE_INGRESS_ACCOUNTING');
  await j.drain();
  const payloads=j.capturePayloads.slice(before),terminal=r.result.terminal;
  const entry={index,terminal:terminal.disposition,reason:terminal.reason,stage:(await j.state()).stage,
   textCount:oneText(payloads).length,images:payloads.filter(p=>p.attachment?.type==='image').map(p=>p.attachment.payload.url),
   toolResults:r.toolResponses.filter(p=>p.name==='recommend_size').map(p=>({status:p.response?.data?.status,
    role:p.response?.data?.fitTarget?.componentRole??null,recommendedSizes:p.response?.data?.recommendedSizes??[]}))};
  if(traceAdd)entry.diagnostic={recovery:r.result.recovery??null,handoff:r.result.handoff??null,
   readCoverage:r.result.readCoverage??null,openingMediaWork:r.result.openingMediaWork??null,
   timings:r.result.generations.map(g=>({role:g.role,status:g.status})),actions:r.diagnostics};
  // Private checkout text is verified in memory and never written into smoke evidence.
  if(index===0||id==='FIT_CHECKOUT'&&index===1)entry.publicOutput=oneText(payloads);
  if(id==='FIT_CHECKOUT'&&r.result.recovery)entry.originalReason=r.result.recovery.originalReason;
  evidence[id].push(entry);save();
  return {r,payloads,terminal,entry};
 };
 await checkCase('ADS','1 ADS quote and scoped product photo',async()=>{
  const j=await statefulFixture({media:true});
  const text='Áo sơ mi SM613 giá bao nhiêu em?';
  const a=await attempt(j,'ADS',text,{messages:[{text,attachments:[],adsContext:{source:'ADS',adTitle:'SM613',postId:null,adId:null,ref:null}}]});
  assert.equal(a.terminal.disposition,'SEND_ELIGIBLE');
  assert.equal(a.r.verifiers,1);
  const texts=oneText(a.payloads);assert.equal(texts.length,1);
  assert(money(texts[0],499000),'ADS_WRONG_PRICE');
  assert(/SM613|sơ mi|áo/ui.test(texts[0]),'ADS_PRODUCT_TEXT_MISSING');
  assert.deepEqual(a.entry.images,[imageUrl]);
  const rows=await outbox(j);
  assert.deepEqual(rows.map(r=>r.sequence_no),[0,1]);
  assert.equal(new Set(rows.map(r=>r.response_group_id)).size,1);
  assert(rows.every(r=>r.status==='SENT_ACCEPTED'),'ADS_GROUP_NOT_CAPTURED');
  assert.equal((await j.state()).cart,null);
 });
 await checkCase('FIT_CHECKOUT','2 engine fit through cart and checkout with duplicate webhook',async()=>{
  const j=await statefulFixture({componentFit:true,media:true});
  const fitLatest='Chị cao 1m60, nặng 55kg. Bình thường chị hay mặc L, em xem giúp áo SM613 mặc size nào nhé.';
  let fit;
  if(traceAdd){
   // Rebuild the successful public prefix using the exact observed tool shape.
   // Only the target add-to-cart turn gets provider requests in this diagnostic.
   const fitCall={name:'recommend_size',args:{subjectRef:'SM613',fitScope:'COMPONENT',componentRole:'TOP',customerStateOps:[
    {op:'SET',field:'measurements.HEIGHT_CM',value:160,sourceQuote:'Chị cao 1m60'},
    {op:'SET',field:'measurements.WEIGHT_KG',value:55,sourceQuote:'nặng 55kg'}]}};
   const priorFit='Dạ với chiều cao 1m60 và nặng 55kg, áo sơ mi SM613 phom suông em đề xuất mình mặc size M nha chị. Thường chị hay mặc size L, chị tham khảo size M giúp em nhé ạ!';
   const seeded=await j.turn(fitLatest,[
    {kind:'TOOLS',calls:[fitCall],content:{role:'model',parts:[{functionCall:fitCall}]}},{kind:'FINAL',text:priorFit}
   ],{testQuoteTask:EXPLICIT_QUOTE_TASK,testOpeningMediaRule:OPENING_PRODUCT_MEDIA_RULE});
   await j.drain();
   const evidenceFit=seeded.toolResponses.find(x=>x.name==='recommend_size')?.response.data;
   const entry={index:0,scriptedPrefix:true,toolResults:[{status:evidenceFit?.status,recommendedSizes:evidenceFit?.recommendedSizes??[]}]};
   evidence.FIT_CHECKOUT=[entry];save();
   fit={terminal:seeded.result.terminal,entry,payloads:j.capturePayloads};
  }else fit=await attempt(j,'FIT_CHECKOUT',fitLatest);
  assert.equal(fit.terminal.disposition,'SEND_ELIGIBLE');
  const recommended=fit.entry.toolResults.filter(x=>x.status==='RECOMMENDED').flatMap(x=>x.recommendedSizes.map(choice=>choice.size));
  assert(recommended.length>0&&recommended.every(x=>x==='M'),'FIT_ENGINE_DID_NOT_PROVE_M');
  const fitText=oneText(fit.payloads).join(' ');
  assert(/\bM\b/u.test(fitText),'FIT_REPLY_OUTSIDE_ENGINE');
  const add=await attempt(j,'FIT_CHECKOUT','Chị lấy một áo SM613 màu navy size M nhé.');
  assert(['CART_OPEN','CHECKOUT_DETAILS_MISSING'].includes(add.entry.stage)||(await j.state()).cart,'CART_NOT_COMMITTED');
  const before=await j.state(),lines=before.cart?.value.lines;
  assert.equal(lines?.length,1);
  assert.equal(lines[0].quantity,1);
  assert.equal(lines[0].posUnitPriceVnd,499000);
  assert.deepEqual(lines[0].components.map(c=>c.size),['M']);
  const generation=await inbox.readGeneration(pageId,j.bound.customerHash),rows=await outbox(j);
  const message=add.r.inboundMessages[0],now=new Date(message.occurredAt);
  const replay=await inbox.enqueue({pageId,metaAppId:'synthetic',eventKey:message.eventKey,providerMessageId:message.messageId,
   conversationHash:j.bound.customerHash,occurredAt:now,receivedAt:now,signatureKeyVersion:'synthetic',
   envelope:{schemaVersion:1,customerSendEnabled:false,routing:{owner:'APP'},message}});
  assert.equal(replay.inserted,false,'DUPLICATE_WEBHOOK_INSERTED');
  assert.equal(await inbox.readGeneration(pageId,j.bound.customerHash),generation);
  assert.equal(await inbox.claimNextBatch('preprod-smoke-duplicate',300000),null,'DUPLICATE_WEBHOOK_CLAIMED');
  j.restartDelivery();await j.drain();
  assert.equal(commerceHash(await j.state()),commerceHash(before));
  assert.deepEqual(await outbox(j),rows);
  add.entry.duplicateWebhook={inserted:false,duplicateCart:false,duplicateMessages:0};save();
  if(traceAdd){assert.equal(add.terminal.disposition,'SEND_ELIGIBLE','SMOKE_ADD_TRACE_TERMINAL');return;}
  await attempt(j,'FIT_CHECKOUT','Chốt đơn cho chị nhé.');
  const privateInput=await attempt(j,'FIT_CHECKOUT','Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: 12 Đường thử nghiệm, Quận 1, TP Hồ Chí Minh\nCOD');
  assert.equal(privateInput.r.owners,0,'PRIVATE_INPUT_REACHED_OWNER');
  assert.equal(privateInput.r.verifiers,0,'PRIVATE_INPUT_REACHED_VERIFIER');
  assert.equal(privateInput.entry.stage,'ORDER_PREVIEW');
  const quote=(await j.state()).cart.value;
  assert.equal(quote.lines.length,1);
  assert.equal(quote.subtotalVnd,499000);
  assert.equal(quote.discountTotalVnd,0);
  assert.equal(quote.grandTotalVnd,quote.subtotalVnd+quote.shippingFeeVnd);
  assert(oneText(privateInput.payloads).some(t=>money(t,quote.grandTotalVnd)),'CHECKOUT_TOTAL_NOT_CAPTURED');
  privateInput.entry.totalVnd=quote.grandTotalVnd;privateInput.entry.shippingFeeVnd=quote.shippingFeeVnd;save();
  const confirmed=await attempt(j,'FIT_CHECKOUT','Chốt đơn đúng thông tin trên cho chị nhé.');
  assert.equal(confirmed.entry.stage,'PURCHASE_CONFIRMED');
  assert.equal((await fixtureState(j)).state.conversationOwner,'HUMAN');
  assert.equal(await events(j),1);
 });
 await checkCase('MISSING_SOURCE','3 missing chart causes silent handoff',async()=>{
  const j=await statefulFixture({media:true});
  const a=await attempt(j,'MISSING_SOURCE','Chị cao 1m60, nặng 55kg. Chọn size áo SM613 giúp chị nhé.');
  assert.equal(a.terminal.disposition,'HANDOFF');
  assert(['SIZE_RULE_UNAVAILABLE','DEPENDENCY_FAILURE'].includes(a.terminal.reason),'EXPECTED_SHOP_SOURCE_GAP');
  assert.equal(a.terminal.text,null);
  assert.equal(a.r.result.enqueued,0);
  assert.deepEqual(a.payloads,[]);
  assert.deepEqual(await outbox(j),[]);
  assert.equal(await events(j),1);
  assert.equal((await fixtureState(j)).state.conversationOwner,'HUMAN');
 });
 await ensureTestOnly();
 assert.equal(report.cases.length,selected.length);
 assert(ledger.every(r=>Number.isInteger(r.providerRequests)),'SMOKE_PROVIDER_ACCOUNTING_UNKNOWN');
 report.providerGenerations=ledger.reduce((n,r)=>n+r.providerRequests,0);
 report.smoke.liveMetaRequests=0;
 report.smoke.livePancakeRequests=0;
 save();
 assert(report.cases.every(row=>row.status==='PASS'),'PREPROD_SMOKE_NOT_ALL_PASS');
}
