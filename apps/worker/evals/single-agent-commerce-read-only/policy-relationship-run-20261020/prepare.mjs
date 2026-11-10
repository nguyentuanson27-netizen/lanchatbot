// One evaluation input preparation, no model generation or source writes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {PostgresRuntimePolicyStore} from '@lana/database';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {publicPolicyLiteral,buildReadOnlyContext,commerceHash} from '../../../dist/single-agent-commerce-read-only-context.js';
import {fixturePolicyPointers} from '../../../dist/single-agent-commerce.test-support.js';
import {execFileSync} from 'node:child_process';
import {buildAdviceOwnerRequest} from '../advice-diagnostic.mjs';
import {buildGeminiCommerceRequest} from '../gemini-inference.mjs';
import {sha256,validateProtocol} from '../protocol.mjs';

const out=resolve(process.argv[2]);mkdirSync(out);
const config=JSON.parse(readFileSync(new URL('../source-config.b1.json',import.meta.url)));
const m=validateProtocol(JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url))));
const original=JSON.parse(readFileSync(new URL('../full-b123-20261020/raw/b1-1/attempt-16.json',import.meta.url)));
const sourceLog=readFileSync(new URL('../full-b123-20261020/raw/b1-1/requests.jsonl',import.meta.url),'utf8').trim().split('\n').map(JSON.parse);
const first=sourceLog.find(r=>r.phase==='OWNER_REQUEST'&&JSON.stringify(r.value).includes(original.runtime.latest));
assert(first,'ORIGINAL_REQUEST_MISSING');
const prefix=first.id.split(':owner:')[0];
const captured=sourceLog.filter(r=>r.phase==='PUBLIC_CONTEXT_CAPTURE'&&r.id.startsWith(prefix)).at(-1).value;
const now=new Date(),clock=now.toISOString();
const database=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL??process.env.DATABASE_URL);
let live;
try{
 const resolver=new RuntimePolicyResolver({loadActivePointers:q=>database.loadActivePointers(q)},
  {enabled:true,publishedEnabled:config.channel==='PUBLISHED'});
 const r=await resolver.resolve({pageId:config.scope.pageId,channel:config.channel,now});
 assert(r.status==='RESOLVED'&&r.bundle,'CURRENT_POLICY_UNAVAILABLE');
 live=publicPolicyLiteral(r.bundle,config.scope.pageId,config.scope.shopId,now);
}finally{await database.close();}
const liveData=JSON.parse(live.text);
assert.equal(liveData.customerCare.inspection.tryOnMode,'HOLD_UP_ONLY');
assert.equal(liveData.customerCare.exchange.requiredConditions.unused,true);
assert(liveData.customerCare.inspection.tryOnModeDescription.includes('không đáp ứng điều kiện này'));
// Synthetic, schema-valid fixture for the source-following control; never persisted.
const care=structuredClone(liveData.customerCare);delete care.inspection.tryOnModeDescription;
care.exchange.windowDaysFromReceipt=7;care.exchange.totalTwoWayShippingFeeVnd=25000;
const pointers=fixturePolicyPointers().map(p=>{
 const content=p.version.content.kind==='SHOP_POLICY'?{...p.version.content,customerCare:care}:p.version.content;
 return {...p,version:{...p.version,content,contentHash:'sha256:'+commerceHash(content)}};
});
const syntheticResolver=new RuntimePolicyResolver({loadActivePointers:async()=>pointers},{enabled:true});
const synthetic=await syntheticResolver.resolve({pageId:config.scope.pageId,channel:'CANARY_SHADOW',now});
assert.equal(synthetic.status,'RESOLVED');
const variant=publicPolicyLiteral(synthetic.bundle,config.scope.pageId,config.scope.shopId,now);
const currentPrompt=readFileSync(new URL('../prompts/owner.vi.txt',import.meta.url),'utf8');
const legacySource='3cff648b^';
const promptPath='apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt';
const legacyFull=execFileSync('git',['show',legacySource+':'+promptPath],{encoding:'utf8'});
const section=txt=>{const found=txt.match(/^# Chính sách[^\n]*\n([\s\S]*?)(?=^# )/m);assert(found,'POLICY_SECTION_MISSING');return found[1];};
const legacySection=section(legacyFull),candidateSection=section(currentPrompt);
assert(legacySection.includes('HOLD_UP_ONLY'));
const controlPrompt=currentPrompt.replace(candidateSection,legacySection);
const slots=[];
for(let rep=1;rep<=3;rep++)for(const arm of ['CONTROL','CANDIDATE'])slots.push({latest:original.runtime.latest,purpose:'worn-original',arm,rep});
for(const [latest,purpose] of [
 ['Chị mới ướm bộ này bên ngoài thôi, chưa mặc vào. Muốn đổi sang size L thì được không em?','held-up-only'],
 ['Chị thử bộ này rồi, giờ muốn đổi size thì được không?','ambiguous-try'],
 ['Shop cho đổi size trong mấy ngày, phí đổi bao nhiêu em?','window-fee'],
 ['Đường may ở nách áo bị lỗi, chị mặc vào mới thấy. Chị nhận hôm qua, giờ shop xử lý sao em?','manufacturing-defect'],
 ['Shop cho đổi size trong mấy ngày, phí đổi bao nhiêu em?','alternate-window-fee'],
])slots.push({latest,purpose,arm:'CANDIDATE',rep:1});
const rows=slots.map((slot,i)=>{
 const c=captured.context,policy=slot.purpose==='alternate-window-fee'?variant:live;
 const context=buildReadOnlyContext({state:c.state,subjects:c.boundSubjects,claims:c.protectedClaims,
  products:c.runtimeProducts,receipts:c.effectReceipts,cartBinding:c.cartBinding,
  policies:[...c.policyLiterals.filter(p=>!p.ref.startsWith('policy:')),policy]});
 return {caseId:'relationship-slot-'+(i+1),evaluator:{purpose:slot.purpose,arm:slot.arm,repetition:slot.rep,
  sourceMode:slot.purpose==='alternate-window-fee'?'ISOLATED_SYNTHETIC_POLICY':'LIVE_POLICY_CAPTURE'},
  ownerInstructions:slot.arm==='CONTROL'?controlPrompt:currentPrompt,
  runtime:{latest:slot.latest,history:structuredClone(original.runtime.history),initialProductCodes:[]},
  requests:[{generationId:'frozen-public-world',providerRequests:1,toolsAllowed:false,capturedAt:clock,context}]};
});
const prompt=currentPrompt;
for(let pair=0;pair<3;pair++){
 assert.deepEqual(rows[pair*2].runtime,rows[pair*2+1].runtime);
 assert.deepEqual(rows[pair*2].requests,rows[pair*2+1].requests);
}
writeFileSync(resolve(out,'control-owner.vi.txt'),controlPrompt);
for(const row of rows){
 const wire=buildGeminiCommerceRequest(buildAdviceOwnerRequest(row,row.requests[0],prompt,'offline',new AbortController().signal));
 assert(!/relationship-slot-|worn-original|held-up-only|ambiguous-try|alternate-window-fee|LIVE_POLICY_CAPTURE|ISOLATED_SYNTHETIC_POLICY|"evaluator"/.test(JSON.stringify(wire)),'EVALUATOR_LABEL_LEAK');
}
writeFileSync(resolve(out,'targeted-input.json'),JSON.stringify(rows,null,2)+'\n');
writeFileSync(resolve(out,'PREPARATION.json'),JSON.stringify({preparedAt:clock,mode:'CURRENT_PUBLIC_POLICY_CAPTURE_PLUS_SYNTHETIC_CONTROL',
 originalCaptureAt:captured.capturedAt,livePolicy:live,variantPolicy:variant,registeredSlots:11,maximumGenerationRequests:22,
 inputSha256:sha256(readFileSync(resolve(out,'targeted-input.json'))),models:m.models,promptHashes:m.promptHashes,schemaHash:m.schemaHash,
 controlSource:execFileSync('git',['rev-parse',legacySource],{encoding:'utf8'}).trim(),controlOwnerHash:sha256(controlPrompt),controlPolicySectionHash:sha256(legacySection),candidatePolicySectionHash:sha256(candidateSection),offlineOwnerRequests:11,evaluatorLabelLeaks:0,providerGenerations:0,sendEnabled:false},null,2)+'\n');
console.log(JSON.stringify({status:'PREPARED',slots:11,providerGenerations:0}));
