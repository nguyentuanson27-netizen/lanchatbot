// One evaluation input preparation, no model generation or source writes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {PostgresRuntimePolicyStore} from '@lana/database';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {publicPolicyLiteral,buildReadOnlyContext,commerceHash} from '../../../dist/single-agent-commerce-read-only-context.js';
import {fixturePolicyPointers} from '../../../dist/single-agent-commerce.test-support.js';
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
assert.equal(liveData.customerCare.inspection.tryOnModeDescription,'Chỉ ướm bên ngoài, không mặc vào người.');
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
const questions=[original.runtime.latest,original.runtime.latest,original.runtime.latest,
 'Chị mới ướm bộ này bên ngoài thôi, chưa mặc vào. Muốn đổi sang size L thì được không em?',
 'Chị thử bộ này rồi, giờ muốn đổi size thì được không?',
 'Shop cho đổi size trong mấy ngày, phí đổi bao nhiêu em?',
 'Đường may ở nách áo bị lỗi, chị mặc vào mới thấy. Chị nhận hôm qua, giờ shop xử lý sao em?',
 'Shop cho đổi size trong mấy ngày, phí đổi bao nhiêu em?'];
const purposes=['worn-original','worn-original','worn-original','held-up-only','ambiguous-try','window-fee','manufacturing-defect','alternate-window-fee'];
const rows=questions.map((latest,i)=>{
 const c=captured.context,policy=i===7?variant:live;
 const context=buildReadOnlyContext({state:c.state,subjects:c.boundSubjects,claims:c.protectedClaims,
  products:c.runtimeProducts,receipts:c.effectReceipts,cartBinding:c.cartBinding,
  policies:[...c.policyLiterals.filter(p=>!p.ref.startsWith('policy:')),policy]});
 return {caseId:'policy-slot-'+(i+1),evaluator:{purpose:purposes[i],sourceMode:i===7?'ISOLATED_SYNTHETIC_POLICY':'LIVE_POLICY_CAPTURE'},
  runtime:{latest,history:structuredClone(original.runtime.history),initialProductCodes:[]},
  requests:[{generationId:'frozen-public-world',providerRequests:1,toolsAllowed:false,capturedAt:clock,context}]};
});
const prompt=readFileSync(new URL('../prompts/owner.vi.txt',import.meta.url),'utf8');
for(const row of rows){
 const wire=buildGeminiCommerceRequest(buildAdviceOwnerRequest(row,row.requests[0],prompt,'offline',new AbortController().signal));
 assert(!/policy-slot-|worn-original|held-up-only|ambiguous-try|alternate-window-fee|LIVE_POLICY_CAPTURE|ISOLATED_SYNTHETIC_POLICY|"evaluator"/.test(JSON.stringify(wire)),'EVALUATOR_LABEL_LEAK');
}
writeFileSync(resolve(out,'targeted-input.json'),JSON.stringify(rows,null,2)+'\n');
writeFileSync(resolve(out,'PREPARATION.json'),JSON.stringify({preparedAt:clock,mode:'CURRENT_PUBLIC_POLICY_CAPTURE_PLUS_SYNTHETIC_CONTROL',
 originalCaptureAt:captured.capturedAt,livePolicy:live,variantPolicy:variant,registeredSlots:8,maximumGenerationRequests:16,
 inputSha256:sha256(readFileSync(resolve(out,'targeted-input.json'))),models:m.models,promptHashes:m.promptHashes,schemaHash:m.schemaHash,
 offlineOwnerRequests:8,evaluatorLabelLeaks:0,providerGenerations:0,sendEnabled:false},null,2)+'\n');
console.log(JSON.stringify({status:'PREPARED',slots:8,providerGenerations:0}));
