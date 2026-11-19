import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {outside,read,write} from './bc-control.mjs';
import {bindCorpus} from './bind-corpus.mjs';
import {CHAT_PRIORITY_NATIVE_SCOPE} from './chat-priority-native-scope.mjs';
import {assertPriorityReplayPassed} from './chat-priority-replay.mjs';
import {diagnosticPreflight,diagnosticSlots,validateDiagnostic} from './diagnostic.mjs';
import {digest,qualificationIdentity} from './qualification.mjs';
import {assertApprovedDecisions,currentCandidate} from './source-identity.mjs';
import {assertPopulationReadiness} from './source-readiness.mjs';

const [command,dirPath,replayPath,fullPath,adsPath]=process.argv.slice(2);
const root=process.cwd(),dir=resolve(dirPath),replay=resolve(replayPath);
outside(root,dir);
outside(root,replay);
const regPath=resolve(dir,'NATIVE_REGISTRATION.json'),worldPath=resolve(dir,'world/WORLD.json');
if(command==='preflight'){
 const pre=diagnosticPreflight(root,regPath,worldPath,undefined,replay);
 assert.equal(pre.registration.maximumGenerationRequests,36);
 write(resolve(dir,'NATIVE_PREFLIGHT.json'),{source:pre.sealed.runSourceSha,registrationHash:digest(pre.sealed),providerRequests:0});
}else{
 assert.equal(command,'prepare');
 const chatPriorityReplayScoreHash=assertPriorityReplayPassed(replay,root);
 const world=read(worldPath),initialStateArtifact=read(resolve(dir,'initial/INITIAL_STATE.json'));
 const full=read(resolve(fullPath,'r2-sealed/REGISTRATION.json')),ads=read(resolve(adsPath,'REGISTRATION.json'));
 const decisions=read(new URL('./owner-decisions.json',import.meta.url));
 assert.equal(full.runSourceSha,decisions.chatPriorityDiagnostic.baselineSourceSha);
 assert.equal(ads.runSourceSha,'9a65450fdf29b1c5c544465bf61c450d3c22f133');
 const scope=CHAT_PRIORITY_NATIVE_SCOPE,seed=randomBytes(32).toString('hex');
 const config=structuredClone(full.config);
 config.blinding.seedCommitment=digest(seed);
 config.ownerDecision.decisionHash=digest(decisions);
 config.candidate=currentCandidate(root);
 assertApprovedDecisions(root,config);
 assert.equal(initialStateArtifact.sourceSha,config.candidate.sourceSha);
 assert.equal(world.sourceSha,config.candidate.sourceSha,'CHAT_PRIORITY_NATIVE_WORLD_SOURCE');
 const scenarios=scope.cases.map(c=>{
  const source=c.sourceCase===scope.ads.caseId?ads:full;
  const scenario=source.corpus.scenarios.find(s=>s.id===c.sourceCase);
  assert(scenario,'CHAT_PRIORITY_NATIVE_CASE_MISSING');
  return scenario;
 });
 const draft={...full.corpus,scenarios,provenance:{developmentOnly:true,diagnosticScope:scope.name,chatPriorityReplayScoreHash}};
 assert.equal(digest(scenarios.map(({id,mode,turns,customerPolicy})=>({id,mode,turns,customerPolicy:customerPolicy??null}))),scope.customerScriptsHash);
 const worldHash=digest(world);
 const inputReview={status:'APPROVED',reviewer:'implementation self-review',evidenceRef:decisions.chatPriorityDiagnostic.plan,
  worldHash,newProviderResultsObserved:0};
 const bindings={review:inputReview,capabilities:{evaluationOnly:true,sourceWrites:false,liveSend:false},scenarios:scenarios.map(s=>({
  id:s.id,initialProductCodes:s.turns[0].initialProductCodes,
  judgeProductCodes:s.judgeContext.sourceRequirements.productCodes,judgeSourceKind:s.judgeContext.sourceRequirements.kind,
  readiness:s.judgeContext.sourceReadiness.spec,sourceReads:[{name:'read_policy',args:{}}]
 }))};
 const corpus=await bindCorpus({draft,world,bindings,initialStateArtifact,diagnosticOpeningMediaRule:config.candidate.openingMediaRule});
 await assertPopulationReadiness(world,corpus,new Date(),config.candidate.openingMediaRule);
 const corpusHash=digest(corpus),sourceChecks=corpus.scenarios.map(s=>s.diagnosticTrusted);
 const reg={kind:'PHASE_C_DEVELOPMENT_DIAGNOSTIC_V1',status:'REGISTERED_DEVELOPMENT_NOT_QUALIFICATION',
  runSourceSha:config.candidate.sourceSha,scopeHash:digest(scope),registeredAt:new Date().toISOString(),sendEnabled:false,
  config,identity:qualificationIdentity(config),corpus,corpusHash,worldHash,sourceChecks,
  initialStateArtifact,initialStateArtifactHash:digest(initialStateArtifact),slots:diagnosticSlots(corpus,1),
  review:{...inputReview,corpusHash,sourceChecksHash:digest(sourceChecks)}};
 validateDiagnostic(reg,world);
 write(regPath,reg);
 write(resolve(dir,'NATIVE_PRIVATE_SEED.json'),{seed});
 console.log(JSON.stringify({source:reg.runSourceSha,worldHash,registrationHash:digest(reg),cases:4,turns:9,providerRequests:0}));
}
