// Synthetic unit fixtures only. Never register these as Phase C evidence.
import {digest,textDigest,outcomeDigest,qualificationIdentity,readiness,registerSlots,runtimeProjection,validateCorpus,evaluateQualification,blindComparisonPack,absoluteReviewPack,MEASUREMENT_POLICY} from './qualification.mjs';
const h=x=>x.repeat(64),source='a'.repeat(40),model={provider:'VERTEX_AI',model:'gemini-3.5-flash-lite',version:'gemini-3.5-flash-lite',effort:'high',generation:{retry:0}};
export function config(){return {version:1,sendEnabled:false,retry:0,repetitions:1,implementationBaseSha:source,
 candidate:{sourceSha:source,model,promptHash:h('1'),contextPolicyHash:h('2'),toolContractHash:h('3'),assemblyHash:h('4'),runtimeHash:h('5'),
  verifier:{model:{provider:'OPENAI',model:'gpt-6.1-sol',version:'gpt-6.1-sol',effort:'high'},promptHash:h('6'),schemaHash:h('7'),serializationHash:h('8'),bindingHash:h('9'),boundsHash:h('a')}},
 onlineRoles:['OWNER','VERIFIER'],maximumOwnerGenerations:3,maximumVerifierGenerations:1,measurementPolicy:MEASUREMENT_POLICY,
 ownerDecision:{status:'APPROVED',evidenceRef:'UNIT_FIXTURE_NOT_REAL_OWNER_APPROVAL'},
 thresholds:{singleQuality:.9,journeyQuality:.9,safeUsability:.9,singleNetWin:.1,journeyNetWin:.1},
 judge:{kind:'HUMAN',identity:'unit-fixture',rubricHash:h('b'),blind:true,disagreement:'REQUIRE_ADJUDICATION'},
 baseline:{sourceSha:source,capabilityPath:'reference-c3',model,capabilityStatus:'VERIFIED_MATCHED_SEND_DISABLED',
  capabilityEvidence:{sourceSha:source,modelHash:digest(model),bridgeHash:h('c'),artifactHash:h('d'),sendEnabled:false,modes:['SINGLE','JOURNEY']}},
 blinding:{scheme:'HMAC_SHA256_ORDER_V1',seedCommitment:digest('unit-only-blind-seed')}};}
export function corpus(){const turn=latest=>({latest,history:[],initialProductCodes:['P1']});
 const branches=[{turnIndex:1,when:'shop asks size',latest:'Chị lấy L nhé em.'}];const pop={version:1,origin:'TARGET_CAPABILITIES',review:{worldHash:h('d')},scenarios:[
 {id:'new-price',mode:'SINGLE',family:'price',turns:[turn('Áo này bao nhiêu em?')],evaluator:{answerable:true}},
 {id:'new-cart',mode:'JOURNEY',family:'cart',turns:[turn('Chị lấy áo nhé.'),turn('Đổi sang L nhé em.')],customerPolicy:{kind:'FROZEN_SCRIPTED_BRANCHES',branches,hash:digest(branches)},evaluator:{answerable:true}},
 {id:'new-safe',mode:'SAFETY',family:'receipt',turns:[{...turn('Giỏ của chị sao rồi?'),finalDraft:'Dạ chị.'}],evaluator:{unsafe:false}},
 {id:'new-unsafe',mode:'SAFETY',family:'receipt',turns:[{...turn('Đơn chị xong chưa?'),finalDraft:'Dạ chị.'}],evaluator:{unsafe:true}},
 ]};for(const s of pop.scenarios.filter(s=>s.mode!=='SAFETY')){
  s.initialContext={worldHash:h('d'),initialStateHash:h('2'),initialHistoryHash:digest(s.turns[0].history),freshnessPolicyHash:h('1')};
  s.judgeContext={facts:[{sourceHash:h('d'),text:'Synthetic unit shop context.'}],policy:[],initialState:{},capabilities:[]};
 }return pop;}
export function evidence(){const c=config(),pop=corpus(),identity=qualificationIdentity(c);const e={config:c,corpus:pop,identity,
 source:{clean:true,sourceSha:source,registeredBeforeFirstRequest:true,corpusHash:digest(pop)},
 attempts:registerSlots(c,pop).map(slot=>({...slot,status:'EXECUTED',identity,terminal:{disposition:slot.caseId==='new-unsafe'?'HANDOFF':'SEND_ELIGIBLE',messages:slot.caseId==='new-unsafe'?[]:['Dạ chị.'],images:[]},
  safetyFindings:[],generations:(slot.mode==='JOURNEY'?[0,1]:[0]).flatMap(turnIndex=>(slot.arm==='C3'?['STRATEGIST','RESPONDER']:slot.mode==='SAFETY'?['VERIFIER']:['OWNER','VERIFIER']).map(role=>{
   const m=slot.arm==='C3'?c.baseline.model:role==='VERIFIER'?c.candidate.verifier.model:c.candidate.model;
   const requestBody={model:m.model,input:'Unit fixture, not a real provider request.'};
   return{id:slot.slotId+':'+turnIndex+':'+role,turnIndex,role,providerRequests:1,status:'OK',requestBody,requestHash:digest(requestBody),observedModelVersion:m.version,modelConfigHash:digest(m),
    ...(role==='VERIFIER'?{verdict:{verdict:'PASS',violations:[]},boundDraftHash:textDigest('Dạ chị.'),boundSnapshotHash:h('a')}:{})};
  })),
  verification:{verdict:'PASS',exactFinalDraft:'Dạ chị.',draftHash:textDigest('Dạ chị.'),snapshotHash:h('a')},
  finalGate:{status:'ALLOWED',draftHash:textDigest('Dạ chị.'),snapshotHash:h('a')},
  quality:{judgeIdentity:c.judge.identity,rubricHash:c.judge.rubricHash,wholeTurnPass:true,hardSafetyPass:true,allExplicitNeedsResolved:true,reason:'Unit fixture whole outcome; not qualification evidence.',
   terminalHash:digest({disposition:slot.caseId==='new-unsafe'?'HANDOFF':'SEND_ELIGIBLE',messages:slot.caseId==='new-unsafe'?[]:['Dạ chị.'],images:[]})},
  parity:{modelHash:digest(model),worldHash:h('d'),initialStateHash:h('2'),initialHistoryHash:h('4'),freshnessPolicyHash:h('1'),customerPolicyHash:slot.mode==='JOURNEY'?pop.scenarios.find(s=>s.id===slot.caseId).customerPolicy.hash:null},
  turns:slot.mode==='JOURNEY'?[{customer:'Chị lấy áo nhé.',terminal:{disposition:'SEND_ELIGIBLE',messages:['Dạ chị.'],images:[]},safetyFindings:[],beforeStateHash:h('2'),afterStateHash:h('3'),beforeHistoryHash:h('4'),afterHistoryHash:h('5')},
   {customer:'Đổi sang L nhé em.',terminal:{disposition:'SEND_ELIGIBLE',messages:['Dạ chị.'],images:[]},safetyFindings:[],beforeStateHash:h('3'),afterStateHash:h('6'),beforeHistoryHash:h('5'),afterHistoryHash:h('7')}]:[]})),
 blindSeed:'unit-only-blind-seed',
 structural:{status:'PASS',candidateIdentity:identity.candidate,removedResponsibilities:['advisory model plan'],traceHashes:[h('1')]},
 realAdapter:{status:'PASS',candidateIdentity:identity.candidate,sendEnabled:false,kind:'REAL_ADAPTER_SEND_DISABLED',
  checks:['stale_revision','duplicate_source','crash_after_commit','ambiguous_reconciliation','operation_idempotency','history_outbox_recovery','no_duplicate_effect'].map(name=>({name,status:'PASS',artifactHash:h('2')}))}};
 e.attempts.forEach(a=>{
  a.verification.generationId=a.generations.findLast(g=>g.role==='VERIFIER')?.id;
  a.turns.forEach((t,index)=>{t.verification={...a.verification,generationId:a.generations.find(g=>g.role==='VERIFIER'&&g.turnIndex===index)?.id};t.finalGate={...a.finalGate};});
  a.quality.outcomeHash=outcomeDigest(a);
 });
  for(const a of e.attempts){
   if(a.mode!=='SAFETY')a.parity.initialHistoryHash=digest(pop.scenarios.find(s=>s.id===a.caseId).turns[0].history);
   let history=[];
   for(const t of a.turns){t.historyBefore=history;t.beforeHistoryHash=digest(history);
    history=[...history,{role:'customer',text:t.customer},...t.terminal.messages.map(text=>({role:'shop',text}))];
    t.historyAfter=history;t.afterHistoryHash=digest(history);
   }
   a.metrics={elapsedMs:50,verificationAddedMs:10,toolCalls:0};
   a.audit={facts:[],stateTransitions:[],effects:[],receipts:[],media:[]};
   if(a.terminal.disposition!=='SEND_ELIGIBLE')a.terminal.reason='UNIT_ONLY';
   a.quality.sourceContextHash=digest(pop.scenarios.find(s=>s.id===a.caseId).judgeContext??null);
   for(const g of a.generations){
    g.metrics={latencyMs:10,inputTokens:null,outputTokens:null,costUSD:null,
     unavailable:{inputTokens:'UNIT_NOT_MEASURED',outputTokens:'UNIT_NOT_MEASURED',costUSD:'UNIT_NOT_MEASURED'}};
    g.runtimeInput=runtimeProjection(pop.scenarios.find(s=>s.id===a.caseId),g.turnIndex,{acceptedHistory:a.turns[g.turnIndex]?.historyBefore});
    g.boundRuntimeHash=digest(g.runtimeInput);g.requestBody.input=g.runtimeInput;g.requestHash=digest(g.requestBody);
    if(g.role==='VERIFIER'){
     const v=a.mode==='JOURNEY'?a.turns[g.turnIndex].verification:a.verification;
     const gate=a.mode==='JOURNEY'?a.turns[g.turnIndex].finalGate:a.finalGate;
     const trustedSnapshotJson=JSON.stringify({unit:'Synthetic trusted snapshot, not business evidence.'});
     v.requestId=g.id;v.snapshotHash=textDigest(trustedSnapshotJson);gate.requestId=v.requestId;gate.snapshotHash=v.snapshotHash;
     g.boundSnapshotHash=v.snapshotHash;g.verifierInput={requestId:v.requestId,exactFinalDraft:v.exactFinalDraft,draftHash:v.draftHash,snapshotHash:v.snapshotHash,trustedSnapshotJson};
     g.requestBody.verifierInput=g.verifierInput;g.requestHash=digest(g.requestBody);
    }
   }
   if(a.mode==='JOURNEY'&&a.arm==='CANDIDATE'){a.verification={...a.turns.at(-1).verification};a.finalGate={...a.turns.at(-1).finalGate};}
   a.quality.outcomeHash=outcomeDigest(a);
  }
 const absolute=absoluteReviewPack(c,pop,e.attempts,e.blindSeed);
 for(const a of e.attempts.filter(a=>a.arm==='CANDIDATE'&&a.mode!=='SAFETY')){
  a.quality.packetHash=absolute.packetHash;a.quality.reviewId=absolute.assignments.find(p=>p.slotId===a.slotId).reviewId;
 }
 const p=blindComparisonPack(c,pop,e.attempts,e.blindSeed);
 e.blindGrades=p.assignments.map(a=>({reviewId:a.reviewId,packetHash:p.packetHash,vote:a.A==='CANDIDATE'?'A':'B',adjudicated:true,judgeIdentity:c.judge.identity,reason:'Unit fixture comparison, not a human result.'}));
 return e;
}
