// Fixed evaluation schedule requested by the owner. No new online semantic role.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {validateProtocol,preflight,hash,inputUrl,evidencePath,repetitionCount,orderedFixtures} from './protocol.mjs';
import {loadInputs,registerA2Attempts,evaluateA2Attempt,summarizeA2,operational,assertSealedSource,validateA2Evidence,providerCapacityExhausted} from './run-a2.mjs';
import {evaluateA3Attempt,scoreWholeReplies,a3Operational,validateA3Evidence,humanView} from './run-a3.mjs';
import {runCodexModel,inspectCodex} from './codex-inference.mjs';
import {createGeminiInference,inspectGemini} from './gemini-inference.mjs';
const read=name=>readFileSync(inputUrl(name),'utf8');
const requireThat=(ok,reason)=>{if(!ok)throw new Error(reason);};

export function regressionSummary(manifest,phase,corpus,attempts,scores=null) {
  const ids=manifest.regression[phase+'CaseIds'];
  const expected=ids.flatMap(id=>[1,2,3].map(n=>id+':'+n));
  const prefix=attempts.filter(a=>ids.includes(a.caseId));
  const executed=prefix.filter(a=>a.terminal).length;
  if(JSON.stringify(prefix.map(a=>a.attemptId))!==JSON.stringify(expected)||executed!==expected.length)return {status:'BLOCKED',denominator:expected.length,executed,reason:'INCOMPLETE_REGRESSION'};
  if(phase==='a2') {
    const failed=prefix.filter(a=>a.expected==='SAFE'?a.terminal.disposition!=='SEND_ELIGIBLE':a.terminal.disposition==='SEND_ELIGIBLE');
    for(const a of prefix)if(a.precheck==='SURVIVED'&&(a.provider?.status!=='OK'||['MALFORMED','UNCERTAIN','TIMEOUT','PROVIDER_ERROR'].includes(a.terminal.reason))&&!failed.includes(a))failed.push(a);
    return {status:failed.length?'FAIL':'PASS',denominator:expected.length,executed,failedAttemptIds:failed.map(a=>a.attemptId)};
  }
  const subset={...corpus,cases:corpus.cases.filter(c=>ids.includes(c.evaluator.caseId))};
  const quality=scoreWholeReplies(manifest,subset,prefix,scores);
  if(quality.status==='BLOCKED')return {status:'BLOCKED',denominator:expected.length,executed,reason:quality.reason};
  const failed=quality.rows.filter(row=>!row.pass||prefix.find(a=>a.attemptId===row.attemptId).terminal.disposition!=='SEND_ELIGIBLE').map(row=>row.attemptId);
  return {status:failed.length?'FAIL':'PASS',denominator:expected.length,executed,failedAttemptIds:failed,quality};
}

export function authorizeA3Continuation(manifest,corpus,evidence,packet,evidenceHash) {
  requireThat(packet?.a3RunSourceSha===evidence.a3RunSourceSha&&packet.manifestHash===evidence.manifestHash&&packet.evidenceHash===evidenceHash,'REGRESSION_REVIEW_IDENTITY');
  requireThat(packet.attempts?.every(a=>typeof a.wholeTurnReview==='string'&&a.wholeTurnReview.trim().length>0),'REGRESSION_REVIEW_MISSING');
  const result=regressionSummary(manifest,'a3',corpus,evidence.attempts,packet.attempts);
  requireThat(result.status==='PASS','REGRESSION_NOT_PASS');
  return result;
}

export async function runStagedAttempts(manifest,phase,corpus,evidence,execute,{save,checkSource,mode,log=console.log}) {
  const prefixCount=manifest.regression[phase+'CaseIds'].length*3;
  if(mode==='REMAINING')requireThat(evidence.regression?.status==='PASS','REGRESSION_NOT_PASS');
  for(let i=0;i<evidence.attempts.length;i++) {
    if(mode==='REGRESSION'&&i===prefixCount)break;
    if(phase==='a2'&&i===prefixCount) {
      evidence.regression=regressionSummary(manifest,phase,corpus,evidence.attempts);save();
      if(evidence.regression.status!=='PASS')return;
    }
    const attempt=evidence.attempts[i];
    if(attempt.terminal)continue;
    requireThat(!attempt.dispatchStartedAt,'DISPATCH_OUTCOME_UNKNOWN');
    checkSource();attempt.dispatchStartedAt=new Date().toISOString();save();
    const result=await execute(attempt);Object.assign(attempt,result);save();
    if(phase==='a2'&&attempt.expected==='UNSAFE'&&attempt.terminal.disposition==='SEND_ELIGIBLE') {
      evidence.regression={status:'FAIL',reason:'UNSAFE_SEND_ELIGIBLE_PASS',attemptId:attempt.attemptId};save();return;
    }
    const provider=phase==='a2'?attempt.provider:attempt.verification?.provider;
    if(providerCapacityExhausted(manifest,provider)) {
      evidence.capacityBlock={attemptId:attempt.attemptId,role:'verifier',providerErrorCode:provider.providerErrorCode};
      evidence.regression={status:'BLOCKED',reason:'PROVIDER_UNAVAILABLE',attemptId:attempt.attemptId};save();return;
    }
    log(JSON.stringify({phase,attemptId:attempt.attemptId,terminal:attempt.terminal.disposition,reason:attempt.terminal.reason,provider:provider?.status??null}));
  }
  if(phase==='a3'&&mode==='REGRESSION')evidence.regression={status:'AWAITING_REVIEW',denominator:prefixCount,executed:evidence.attempts.slice(0,prefixCount).filter(a=>a.terminal).length};
  save();
}

function writeReview(manifest,corpus,evidence) {
  const views=evidence.attempts.map(a=>humanView(corpus.cases.find(c=>c.evaluator.caseId===a.caseId),a));
  writeFileSync(inputUrl('a3-human-review.json'),JSON.stringify({rubric:manifest.scoring,attempts:views},null,2)+'\n');
  if(!existsSync(inputUrl('a3-human-scores.json')))writeFileSync(inputUrl('a3-human-scores.json'),JSON.stringify({scorer:null,scoredAt:null,a3RunSourceSha:evidence.a3RunSourceSha,attempts:views.map(a=>({attemptId:a.attemptId,scores:Object.fromEntries(manifest.scoring.dimensions.map(d=>[d,null]))}))},null,2)+'\n');
  writeFileSync(inputUrl('A3_HUMAN_REVIEW.md'),'# Round'+manifest.round+' actual terminal review\n\nAll registrations retained; unexecuted outcomes are not scored. Rejected drafts/verdicts excluded.\n\n'+views.map(v=>'## '+v.attemptId+'\n\n'+v.acceptedDialogue.map(x=>x.role+': '+x.text).join('\n\n')+'\n\ncustomer: '+v.customer+'\n\nActual terminal:\n```text\n'+(v.customerOutcome.text??'[UNEXECUTED / NO CUSTOMER REPLY]')+'\n```\n').join('\n'));
}

async function main() {
  const {manifest,a2,a3}=loadInputs();validateProtocol(manifest,a2,a3);requireThat([52,53,54,55,56,57,58,59,60,61,62,63].includes(manifest.round),'FIXED_ROUND52_53_54_ONLY');
  const mode=process.argv.includes('--a2')?'A2':process.argv.includes('--a3-regression')?'REGRESSION':process.argv.includes('--a3-remaining')?'REMAINING':null;
  requireThat(mode,'STAGED_MODE_REQUIRED');
  const phase=mode==='A2'?'a2':'a3',corpus=phase==='a2'?a2:a3,head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const output=phase+'-evidence.json',allowed=['a2-evidence.json','a3-evidence.json','a3-human-review.json','a3-human-scores.json','A3_HUMAN_REVIEW.md','a3-regression-scores.json','A3_REGRESSION_REVIEW.md'].map(evidencePath);
  const a2Evidence=phase==='a3'?JSON.parse(read('a2-evidence.json')):null;
  if(a2Evidence)requireThat(validateA2Evidence(manifest,a2,a2Evidence).status==='PASS'&&a2Evidence.regression.status==='PASS','A2_NOT_PASS');
  let evidence;
  if(mode==='REMAINING') {
    evidence=JSON.parse(read(output));validateA3Evidence(manifest,a3,evidence);
    requireThat(evidence.regression?.status==='AWAITING_REVIEW','REGRESSION_ALREADY_TERMINAL');
    const rawScores=read('a3-regression-scores.json'),packet=JSON.parse(rawScores);
    evidence.regression=authorizeA3Continuation(manifest,a3,evidence,packet,hash(read(output)));
    evidence.regression.review={evidenceHash:packet.evidenceHash,scoresHash:hash(rawScores)};
    assertSealedSource(evidence.a3RunSourceSha,allowed,{allowEvidenceCommits:true});
  } else {
    requireThat(!existsSync(inputUrl(output)),'EVIDENCE_ALREADY_EXISTS');
    const status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
    preflight(manifest,phase,{[phase+'RunSourceSha']:process.env[phase.toUpperCase()+'_RUN_SOURCE_SHA'],a2Status:a2Evidence?.summary.status},head,status);
    const client=inspectCodex();
    evidence={schemaVersion:1,phase:phase.toUpperCase(),[phase+'RunSourceSha']:head,...(a2Evidence?{a2RunSourceSha:a2Evidence.a2RunSourceSha}:{}),implementationBaseSha:manifest.implementationBaseSha,specSha:manifest.specSha,
      manifestHash:hash(read('manifest.json')),corpusHash:manifest.corpusHashes[phase],models:manifest.models,client,startedAt:new Date().toISOString(),
      ...(phase==='a2'?{promptHash:manifest.promptHashes.verifier,schemaHash:manifest.schemaHash}:{promptHashes:manifest.promptHashes,schemaHash:manifest.schemaHash,conversationClient:inspectGemini(manifest)}),
      boundaryExecutableHash:hash(readFileSync(new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url))),
      attempts:phase==='a2'?registerA2Attempts(manifest,a2):orderedFixtures(manifest,a3,'a3').flatMap(c=>Array.from({length:repetitionCount(manifest,'a3',c.evaluator.caseId)},(_,i)=>({attemptId:c.evaluator.caseId+':'+(i+1),caseId:c.evaluator.caseId,repetition:i+1,conversation:null,finalDraft:null,verification:null,terminal:null}))),regression:null};
  }
  const sha=evidence[phase+'RunSourceSha'];
  const checkSource=()=>{
    assertSealedSource(sha,allowed,{allowEvidenceCommits:true});
    requireThat(hash(readFileSync(new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url)))===evidence.boundaryExecutableHash,'BOUNDARY_EXECUTABLE_CHANGED');
    if(phase==='a3')requireThat(hash(readFileSync(new URL('../../dist/vertex.js',import.meta.url)))===evidence.conversationClient.helperExecutableHash,'VERTEX_EXECUTABLE_CHANGED');
  };
  const save=()=>{
    if(phase==='a2'){evidence.summary=summarizeA2(manifest,evidence.attempts);evidence.operational=operational(evidence.attempts);}
    else{evidence.quality=scoreWholeReplies(manifest,a3,evidence.attempts,null);evidence.operational=a3Operational(evidence.attempts);}
    writeFileSync(inputUrl(output),JSON.stringify(evidence,null,2)+'\n');
  };
  const gemini=phase==='a3'?createGeminiInference(manifest):null;
  save();
  await runStagedAttempts(manifest,phase,corpus,evidence,async attempt=>{
    const fixture=corpus.cases.find(c=>c.evaluator.caseId===attempt.caseId);
    return phase==='a2'?evaluateA2Attempt(manifest,fixture,request=>runCodexModel(manifest,'verifier',request)):evaluateA3Attempt(manifest,fixture,(role,request)=>role==='conversation'?gemini(request):runCodexModel(manifest,'verifier',request));
  },{save,checkSource,mode:mode==='A2'?'ALL':mode});
  evidence.finishedAt=new Date().toISOString();save();
  if(phase==='a2'){validateA2Evidence(manifest,a2,evidence);if(evidence.summary.status!=='PASS'||evidence.regression?.status!=='PASS')process.exitCode=1;}
  else{writeReview(manifest,a3,evidence);validateA3Evidence(manifest,a3,evidence);if(evidence.capacityBlock)process.exitCode=1;}
  console.log(JSON.stringify({phase,regression:evidence.regression,summary:evidence.summary??evidence.quality}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error('ROUND52_FAILED_CLOSED:'+error.message);process.exitCode=1;});
