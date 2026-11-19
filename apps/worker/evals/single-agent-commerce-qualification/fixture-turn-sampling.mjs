// Development measurement only. Runs one whole customer turn through the real turn loop, tools,
// owner request builder and final gate, with the real owner and verifier models, N times on the
// synthetic in-repo product fixture. It answers one question per scenario: with identical inputs,
// how often does this code produce a sendable, correct turn? It is NOT a shop snapshot, a journey
// run or qualification evidence. No store, no send, no effect outside an in-memory repository.
//
//   C3_VERTEX_CREDENTIAL_FILE=<service-account.json> NODE_USE_ENV_PROXY=1 \
//   node apps/worker/evals/single-agent-commerce-qualification/fixture-turn-sampling.mjs --n 5 --out <dir outside the checkout>
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {applySalesCycleCommand,createSalesCycleRuntimeState} from '@lana/chat-runtime';
import {buildProductAttributesV1} from '@lana/business-tools';
import {createCommerceEffectTools} from '../../dist/single-agent-commerce-effects.js';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {runCommerceTurn} from '../../dist/single-agent-commerce-read-only.js';
import {withExplicitQuoteTask} from '../../dist/single-agent-commerce-quote.js';
import {cartSelectionFromSnapshot} from '../../dist/realtime-sales-catalog.js';
import {commerceNow,commerceScope,fixturePolicy,fixtureProduct,fixtureProfile} from '../../dist/single-agent-commerce.test-support.js';
import {createGeminiCommerceInference} from '../single-agent-commerce-read-only/gemini-inference.mjs';
import {withNativePresentation} from '../single-agent-commerce-read-only/native-presentation.mjs';
import {createCommerceVerifier} from '../single-agent-commerce-read-only/protocol.mjs';

const {values:args}=parseArgs({options:{n:{type:'string',default:'5'},out:{type:'string'},scenario:{type:'string',default:'all'},verifier:{type:'string',default:'gemini'}}});
const n=Number(args.n);assert(Number.isInteger(n)&&n>=1&&n<=20,'N_1_TO_20');assert(args.out,'OUT_REQUIRED');
const here=new URL('.',import.meta.url),read=p=>readFileSync(new URL(p,here),'utf8');
const manifest=JSON.parse(read('../single-agent-commerce-read-only/manifest.json'));
const ownerPrompt=read('../single-agent-commerce-read-only/prompts/owner.vi.txt'),verifierPrompt=read('../single-agent-commerce-read-only/prompts/verifier.vi.txt');
const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8')),projectId=credential.project_id;
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='';

const infer=createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId});
// The Gemini verifier transport exists only from the fix that introduced it; older sources are measured with it injected.
const verifierModule=await import('../single-agent-commerce-read-only/gemini-verifier.mjs').catch(()=>null);
assert(args.verifier==='gemini'&&verifierModule,'GEMINI_VERIFIER_REQUIRED');
const verify=createCommerceVerifier(manifest,verifierModule.createGeminiVerifierModel({projectId}));

// Two colours in four sizes: eight source tuples. "be" has no stock and is sold as pre-order.
function world(){
 const f=fixtureProduct(),row=f.snapshot.offers.DIRECT.rows[0];
 f.snapshot.offers.DIRECT.rows=['trắng','be'].flatMap(color=>['S','M','L','XL'].map(size=>({...structuredClone(row),color,size,
  stock_quantity:color==='be'?0:4,parent_variation_id:`SM613-${color==='be'?'BE':'TRANG'}-${size}`})));
 f.snapshot.fulfillment_policy={tinh_trang:'READY_STOCK',can_order_when_zero:true,prep_min_days:1,prep_max_days:2,zero_stock_policy:'ALLOW',
  zero_stock_prep_min_days:3,zero_stock_prep_max_days:5,eta_valid_until:''};
 f.product.colors=['trắng','be'];
 f.product.attributes=buildProductAttributesV1({productId:f.product.productId,observedAt:f.product.observedAt,data:{materials:['cotton'],materialComponents:{},
  colors:['trắng','be'],styles:[],silhouettes:['suông'],occasions:['đi làm'],designAttributes:null,careInstructions:null,wearProperties:null,backCoverage:null,designComplexity:null}});
 return f;
}
async function setup(){
 const scope=commerceScope(),f=world(),clock=()=>commerceNow,policy=(await fixturePolicy()).bundle;
 let current=createSalesCycleRuntimeState('fixture-cycle',{pageId:scope.pageId,conversationId:scope.conversationId},commerceNow);
 for(const kind of ['FACTS_PRESENTED','MEASUREMENTS_REQUIRED','SIZE_RECOMMENDED'])
  current=applySalesCycleCommand({state:current,expectedRevision:current.revision,command:{kind,commandId:`seed:${kind}`},now:commerceNow}).state;
 const repository={read:async()=>structuredClone(current),compareAndSwap:async c=>{if(c.expectedRevision!==current.revision)return false;current=structuredClone(c.nextState);return true;}};
 const base=createReadOnlyTools({scope,clock,policy:()=>fixturePolicy(),initialProducts:[f.product],candidateEvidence:true,prepareCurrentOffers:true,
  entry:{firstContact:false,fromAd:false},catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:'MATCHED',matchKind:'EXACT_CODE',product:f.product,score:1,gap:null})}});
 const select=async query=>{
  const result=cartSelectionFromSnapshot(f.snapshot,{...query,selectionMode:'CANDIDATE_TUPLES'},commerceNow);
  return result.status!=='READY'?result:{...result,shopId:scope.shopId,line:{...result.line,priceAuthority:{...result.line.priceAuthority,shopId:scope.shopId}}};
 };
 const effects=await createCommerceEffectTools({base,scope,clock,conversationKey:'fixture-cycle',repository,authorize:async()=>true,policy:async()=>policy,
  negotiationSources:[],resolveBankTransferPolicy:()=>null,
  trustedPorts:{resolveCartDraft:()=>null,resolveCartMutation:()=>null,resolveShopPolicy:()=>null,
   resolveInboundMessage:id=>({messageId:id,pageId:scope.pageId,conversationId:scope.conversationId,senderType:'CUSTOMER',observedAt:commerceNow.toISOString(),attachments:[]}),
   revalidateCheckout:()=>current.preview?.revalidation??null},
  identity:{cartId:'50000000-0000-4000-8000-000000000001',salesEpisodeId:'60000000-0000-4000-8000-000000000001',customerProfileId:fixtureProfile().profile.profileId},select});
 const tools=withExplicitQuoteTask({...base,...effects,availableTools:['search_products','read_product','read_policy','quote_product','add_to_cart','change_cart_item','quote_cart']},
  scope,false,async()=>policy,clock);
 // The full composition counts dispatches made outside a batch; this fixture makes none.
 return {scope,tools:{...tools,primitiveToolInvocations:()=>0},clock,cart:()=>current.cart?.value.lines??[]};
}
const history=[{role:'customer',text:'Shop ơi cho chị hỏi mẫu sơ mi SM613 với.'},{role:'shop',text:'Dạ, chị cần em tư vấn gì về mẫu sơ mi này ạ?'}];
const both=text=>/trắng/i.test(text)&&/\bbe\b/i.test(text);
// A completed cart write stated as fact. An offer to add later ("để em thêm vào giỏ") is not one.
const claimsCartDone=text=>/(đã|vừa) thêm|vào giỏ[^.?!]*rồi/i.test(text);
// Each scenario states its own machine-checked outcome; prose quality is read separately from the drafts.
const scenarios={
 // PR 392 case J4, turn 1: a purchase request without a colour. Nothing may be reported as added.
 'cart-needs-colour':{latest:'Chị lấy áo này size M nhé.',
  correct:r=>r.disposition==='SEND_ELIGIBLE'&&r.cartLines===0&&both(r.text)&&!claimsCartDone(r.text)},
 // The same request with the first owner step fixed to the call observed in PR 392 (add_to_cart without a colour),
 // so every repetition measures one decision: what the owner writes after the refused cart write.
 // The scripted call carries the provider's documented placeholder for a signature it did not produce.
 'cart-write-refused':{latest:'Chị lấy áo này size M nhé.',firstCall:{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M',quantity:1}},
  correct:r=>r.disposition==='SEND_ELIGIBLE'&&r.cartLines===0&&both(r.text)&&!claimsCartDone(r.text)},
 // PR 392 case S04: which colours exist. The eight tuples are the whole source list.
 'which-colours':{latest:'Áo này có những màu nào vậy em?',correct:r=>r.disposition==='SEND_ELIGIBLE'&&r.cartLines===0&&both(r.text)},
};
const selected=args.scenario==='all'?Object.keys(scenarios):[args.scenario];assert(selected.every(k=>scenarios[k]),'SCENARIO');
mkdirSync(resolve(args.out),{recursive:true});
const rows=[];
for(const name of selected)for(let i=0;i<n;i++){
 const s=await setup(),toolTrace=[];let draft=null,verdict=null;
 const tools={...s.tools,invokeBatch:async(calls,options)=>{const results=await s.tools.invokeBatch(calls,options);
  toolTrace.push(...calls.map((c,k)=>({name:c.name,status:results[k]?.status,reason:results[k]?.reason??null})));return results;}};
 const started=performance.now();let result,error=null;
 try{result=await runCommerceTurn({scope:{...s.scope,requestId:`${name}:${i}`},tools,clock:s.clock,latest:scenarios[name].latest,history,ownerPrompt,verifierPrompt,
  owner:request=>{
   const call=scenarios[name].firstCall;
   if(call&&request.generationId.endsWith(':owner:1'))return {kind:'TOOLS',calls:[structuredClone(call)],
    content:{role:'model',parts:[{functionCall:structuredClone(call),thoughtSignature:'skip_thought_signature_validator'}]}};
   return infer(withNativePresentation(request,'VI_DATA_BLOCKS_COMPACT_V2'));},
  verifier:async request=>{draft=request.finalDraft;const out=await verify(request);
   try{verdict=typeof out.result==='string'?JSON.parse(out.result):out.result;}catch{verdict={verdict:'MALFORMED'};}return out;}});}
 catch(e){error=/^[A-Z0-9_]+$/.test(e?.message??'')?e.message:'TURN_ERROR';}
 const usage=(result?.generations??[]).reduce((u,g)=>({input:u.input+(g.telemetry?.inputTokens??0),output:u.output+(g.telemetry?.outputTokens??0)}),{input:0,output:0});
 const row={scenario:name,repetition:i+1,disposition:result?.terminal.disposition??'ERROR',reason:result?.terminal.reason??error,
  originalReason:result?.recovery?.originalReason??null,text:result?.terminal.text??'',draft,verdict:verdict?.verdict??null,
  violations:(verdict?.violations??[]).map(v=>({kind:v.kind,excerpt:v.excerpt,basis:v.basis})),toolTrace,cartLines:s.cart().length,
  generations:(result?.generations??[]).map(g=>({role:g.role,status:g.status,requestBudget:g.telemetry?.requestBudget??null,errorCode:g.telemetry?.errorCode??g.telemetry?.failureCode??null})),
  tokens:usage,latencyMs:Math.round(performance.now()-started)};
 row.correct=scenarios[name].correct(row);rows.push(row);
 console.log(`${name} ${i+1}/${n} ${row.disposition}/${row.reason} correct=${row.correct} tools=${toolTrace.map(t=>t.name+':'+t.status).join(',')||'-'}`);
}
const summary=Object.fromEntries(selected.map(name=>{const r=rows.filter(x=>x.scenario===name);
 return [name,{n:r.length,correct:r.filter(x=>x.correct).length,sendEligible:r.filter(x=>x.disposition==='SEND_ELIGIBLE').length,
  verifierFail:r.filter(x=>x.verdict==='FAIL').length,handoffOrNoSend:r.filter(x=>x.disposition!=='SEND_ELIGIBLE').length}];}));
const report={kind:'FIXTURE_TURN_SAMPLING_NOT_QUALIFICATION',sourceSha,dirty,world:'SYNTHETIC_IN_REPO_FIXTURE_SM613_TWO_COLOURS_FOUR_SIZES',
 owner:{provider:'VERTEX_AI',model:'gemini-3.5-flash-lite',effort:'high'},verifier:verifierModule.GEMINI_VERIFIER_MODEL,
 tools:'READ_ONLY+CART_EFFECTS+QUOTE (no handoff, media or customer-state tools on this fixture)',repetitions:n,summary,rows};
writeFileSync(resolve(args.out,'RESULT.json'),JSON.stringify(report,null,1));
console.log(JSON.stringify(summary));
