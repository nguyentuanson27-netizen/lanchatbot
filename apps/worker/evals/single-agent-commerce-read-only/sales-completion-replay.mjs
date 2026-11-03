// Offline reconstruction from captured public state/source and exact native model/tool parts.
// No provider/auth/database/send ports. The historical failed second wire was not captured.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {CustomerProfileV1Schema} from '@lana/contracts';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {createCustomerStateTools} from '../../dist/single-agent-commerce-state.js';
import {commerceCallableTools} from '../../dist/single-agent-commerce-callable.js';
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {readCompactSections} from './owner-data-presentation.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const [worldPath,nativePath,journalPath,out]=process.argv.slice(2);assert(out,'REPLAY_INPUTS_REQUIRED');
const world=read(worldPath),native=read(nativePath),first=native.generations.find(g=>g.role==='OWNER'&&g.requestBody);
const journal=readFileSync(journalPath,'utf8').trim().split('\n').map(JSON.parse),output=journal.find(r=>r.phase==='RESULT'&&r.value.id===first.id)?.value.output;
assert(output?.content&&output.kind==='TOOLS','CAPTURED_NATIVE_TOOLS_REQUIRED');
const sections=Object.fromEntries(readCompactSections(first.requestBody.contents[0]).map(s=>[s.label,s.value]));
const oldState=sections['Hồ sơ và trạng thái hiện tại'],message=native.observed.inboundMessages.at(-1),batch=native.observed.batch;
const clock=new Date(first.startedAt),scope={...world.config.scope,conversationId:'00000000-0000-4000-8000-000000000015',
 customerHash:batch.conversationHash,sourceMessageId:message.messageId,sourceObservedAt:message.occurredAt,requestId:batch.evaluationGroupId,
 recipient:native.before.authority.recipientHash,bindingVersion:`commerce:${batch.generation}:${native.before.authority.recipientHash}`,
 revision:native.before.publicState.revision,conversationOwner:'BOT',permission:true,privacyAllowed:true};
const resolver=new RuntimePolicyResolver({loadActivePointers:async()=>structuredClone(world.policyRecords)},{enabled:true,publishedEnabled:true});
const policy=()=>resolver.resolve({pageId:scope.pageId,channel:world.config.channel,now:clock});
const initialProducts=first.runtimeInput.initialProductCodes.map(id=>world.products.find(p=>p.productId===id||p.canonicalCode===id));assert(initialProducts.every(Boolean));
const entry=JSON.parse(sections['Quy định và dữ liệu nguồn'].find(p=>p.ref==='conversation-entry').text);
const base=createReadOnlyTools({scope,clock:()=>clock,initialProducts,policy,entry,prepareCurrentOffers:true,candidateEvidence:true,
 maxFactAgeSeconds:world.config.maxFactAgeSeconds,state:()=>({...scope,...oldState,currentProductId:oldState.currentProductId??null,factSnapshotVersion:''}),
 catalog:{readProduct:async id=>({product:structuredClone(world.products.find(p=>p.productId===id)),snapshot:structuredClone(world.snapshots[id])}),searchText:async()=>{throw Error('UNEXPECTED_SEARCH');}}});
let profile={profile:CustomerProfileV1Schema.parse({schemaVersion:1,profileId:oldState.customerProfileId,
 customerKey:{namespace:'meta',algorithm:'HMAC_SHA256',digest:scope.customerHash},...native.before.publicState.profile,
 sizeHistory:[],createdAt:message.occurredAt,updatedAt:message.occurredAt}),fieldEvidence:{}};
const tools=await createCustomerStateTools({base,scope,clock:()=>clock,sourceMessages:[{text:message.text,sourceMessageId:message.messageId,observedAt:message.occurredAt}],
 store:{read:async()=>structuredClone(profile),compareAndSwap:async(revision,next)=>{assert.equal(revision,profile.profile.revision);profile=structuredClone(next);return true;}},
 sizeInput:async()=>{throw Error('UNEXPECTED_SIZE_READ');}});
const prepared=await base.prepare();const results=await tools.invokeBatch(output.calls);
assert.deepEqual(results,native.observed.toolResponses.map(r=>r.response),'CAPTURED_TOOL_RESULT_CHANGED');
const execution=sections['Khả năng thực hiện lượt này'],availableTools=first.requestBody.tools.flatMap(t=>t.functionDeclarations.map(d=>d.name));
const request={instructions:readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),context:tools.snapshot(),
 contents:[...first.requestBody.contents.slice(1),output.content,{role:'user',parts:results.map((response,i)=>({functionResponse:{name:output.calls[i].name,response,...(output.calls[i].id?{id:output.calls[i].id}:{})}}))}],
 turnTime:sections['Thời điểm xử lý'],availableTools,toolsAllowed:true,terminalHandoffAllowed:true,toolWorkAccounting:'PRIMITIVE_WORK_V2',
 toolBudget:{roundsRemaining:execution.toolBudget.roundsRemaining-1,callsRemaining:execution.toolBudget.callsRemaining-output.calls.length},
 ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2'};
request.callableTools=commerceCallableTools(request);
let budget,wire,status='WITHIN_BOUND',errorCode=null;
try{wire=buildGeminiCommerceRequest(request,undefined,undefined,b=>{budget=b;});assert.deepEqual(wire.contents[wire.contents.length-2],output.content,'SIGNED_NATIVE_CONTENT_CHANGED');}
catch(error){status='BLOCKED';errorCode=error.message;}
const report={status,errorCode,prepared,toolResultsEqualCaptured:true,retainedNativePartsAndSignatures:!!wire,
 historicalFailureBytes:native.generations.find(g=>g.telemetry?.failureCode==='OWNER_REQUEST_BOUND')?.telemetry.requestBytes??null,
 budget,wireBytes:wire?Buffer.byteLength(JSON.stringify(wire)):null,providerRequests:0,sourceWrites:0,
 limitations:['Constructed continuation, not the historical uncaptured failed wire. Captured public profile/source/tools/native parts retained.',
 'Conversation identity was scrubbed by original capture; a synthetic UUID rehydrates private-free scope hashes. This is a mechanics probe, not provider quality or original-wire hash equality.']};
writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(status!=='WITHIN_BOUND')process.exitCode=1;
