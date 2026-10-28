// Qualification artifacts only. Deliberately has no provider or customer-send client.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {digest,readiness,validateConfig,validateCorpus,qualificationIdentity,registerSlots,
 blindComparisonPack,absoluteReviewPack,evaluateQualification,MEASUREMENT_POLICY} from './qualification.mjs';
import {currentCandidate,assertCurrentCandidate,assertApprovedDecisions,IMPLEMENTATION_BASE_SHA} from './source-identity.mjs';
import {NATIVE_CODECS} from './native-wire.mjs';

const [command,...args]=process.argv.slice(2),allowed=new Set(['--repo','--config','--corpus','--world','--development','--out','--registration','--evidence','--seed']);
const flags={};
const check=(v,code)=>{if(!v)throw new Error(code);};
const json=path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
const write=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
let repo;
try{
 for(let i=0;i<args.length;i+=2){check(allowed.has(args[i])&&args[i+1]&&!flags[args[i]],'C_CLI_ARGUMENTS');flags[args[i]]=resolve(args[i+1]);}
 repo=flags['--repo']??process.cwd();
 const git=(...a)=>execFileSync('git',a,{cwd:repo,encoding:'utf8'}).trim();
 const need=name=>{check(flags[name],'C_CLI_MISSING_'+name.slice(2).toUpperCase());return flags[name];};
 const newOutput=()=>{const out=need('--out'),r=relative(repo,out);check(r!==''&&(r==='..'||r.startsWith('..'+sep)||isAbsolute(r)),'C_RAW_OUTPUT_OUTSIDE_SOURCE');
  check(!existsSync(out),'C_OUTPUT_ALREADY_EXISTS');mkdirSync(out);return out;};
 const clean=()=>check(git('status','--porcelain','--untracked-files=all')==='','C_DIRTY_SOURCE');
 const ownerDecisions=()=>json(resolve(repo,'apps/worker/evals/single-agent-commerce-qualification/owner-decisions.json'));
 const approved=c=>assertApprovedDecisions(repo,c);
 if(command==='init'){
  const decisions=ownerDecisions(),source=git('rev-parse','HEAD');
  const config={version:1,qualificationStage:'ABSOLUTE',nativeCodecs:NATIVE_CODECS,sendEnabled:false,retry:0,repetitions:decisions.repetitions,implementationBaseSha:IMPLEMENTATION_BASE_SHA,
   candidate:currentCandidate(repo),measurementPolicy:MEASUREMENT_POLICY,
   onlineRoles:['OWNER','VERIFIER'],maximumOwnerGenerations:3,maximumVerifierGenerations:1,
   ownerDecision:{status:decisions.status,evidenceRef:decisions.evidenceRef,decisionHash:digest(decisions)},thresholds:decisions.thresholds,
   judge:{kind:decisions.judge.kind,identity:decisions.judge.identity,model:decisions.judge.model,approvalRef:decisions.judge.evidenceRef,
    promptHash:digest(readFileSync(resolve(repo,'apps/worker/evals/single-agent-commerce-qualification/prompts/judge.vi.txt'),'utf8')),
    rubricHash:digest(readFileSync(resolve(repo,'apps/worker/evals/single-agent-commerce-qualification/rubric.vi.md'),'utf8')),
    blind:true,disagreement:'REQUIRE_ADJUDICATION'},
   baseline:{sourceSha:decisions.comparisonBaselineSha,capabilityPath:'apps/worker/src/track-c-c3-two-pass-candidate.ts',model:null,
    capabilityStatus:'UNVERIFIED_MATCHED_MODEL_AND_STATEFUL_PARITY'},blinding:{scheme:'HMAC_SHA256_ORDER_V1',seedCommitment:null}};
  const out=need('--out');check(!existsSync(out),'C_OUTPUT_ALREADY_EXISTS');
  write(out,config);console.log(JSON.stringify({status:'DRAFT_CONFIG_CREATED',sourceSha:source,providerRequests:0}));
 }else if(command==='check'){
  const config=json(need('--config')),result=readiness(config);
  if(flags['--corpus']){
   const corpus=json(flags['--corpus']);validateCorpus(corpus);
   if(corpus.review?.status!=='APPROVED'||!corpus.review.worldHash||JSON.stringify(corpus).includes('{{'))result.missing.push('CORPUS_BINDING_AND_REVIEW');
   if(config.nativeCodecs){
    if(corpus.requiredCapabilities?.includes('PRODUCT_SEARCH'))result.missing.push('NATIVE_FROZEN_SEARCH_ADAPTER');
    if(corpus.scenarios.filter(s=>s.mode!=='SAFETY').some(s=>s.turns.some(t=>t.history.length)))result.missing.push('INITIAL_HISTORY_SEED');
   }
  }else result.missing.push('CORPUS');
  result.status=result.missing.length?'BLOCKED':'READY';
  console.log(JSON.stringify({...result,providerRequests:0}));if(result.status==='BLOCKED')process.exitCode=2;
 }else if(command==='seal'){
  clean();const config=json(need('--config')),corpus=json(need('--corpus')),world=json(need('--world'));
  validateConfig(config);approved(config);assertCurrentCandidate(repo,config);
  const seed=randomBytes(32).toString('hex');config.blinding={scheme:'HMAC_SHA256_ORDER_V1',seedCommitment:digest(seed)};
  const ready=readiness(config);check(ready.status==='READY','C_OWNER_OR_PROTOCOL_NOT_READY');
  check(world.kind==='FROZEN_PUBLIC_BUSINESS_WORLD'&&Array.isArray(world.sourceEvidenceHashes)&&world.sourceEvidenceHashes.length&&
   world.sourceEvidenceHashes.every(h=>/^[a-f0-9]{64}$/.test(h)),'C_WORLD_PROVENANCE');
  const development=json(need('--development'));check(Array.isArray(development),'C_DEVELOPMENT_INVENTORY');
  validateCorpus(corpus,{developmentFingerprints:development});
  check(corpus.review?.status==='APPROVED'&&corpus.review.worldHash===digest(world)&&corpus.review.newProviderResultsObserved===0,
   'C_FRESH_CORPUS_REVIEW_REQUIRED');
  check(!JSON.stringify(corpus).includes('{{'),'C_UNRESOLVED_HOLDOUT_INPUT');
  if(config.nativeCodecs){
   check(corpus.scenarios.filter(s=>s.mode!=='SAFETY').every(s=>s.turns.every(t=>t.history.length===0)),'C_INITIAL_HISTORY_SEED_NOT_IMPLEMENTED');
   check(!corpus.requiredCapabilities?.includes('PRODUCT_SEARCH'),'C_NATIVE_FROZEN_SEARCH_ADAPTER_NOT_IMPLEMENTED');
  }
  check(corpus.scenarios.filter(s=>s.mode!=='SAFETY').every(s=>s.judgeContext&&s.initialContext?.worldHash===digest(world)&&
   ['initialStateHash','initialHistoryHash','freshnessPolicyHash'].every(k=>/^[a-f0-9]{64}$/.test(s.initialContext[k]))),'C_CONTEXT_BINDINGS_REQUIRED');
  const registration={version:1,runSourceSha:git('rev-parse','HEAD'),registeredAt:new Date().toISOString(),
   config,corpus,worldHash:digest(world),identity:qualificationIdentity(config),corpusHash:digest(corpus),slots:registerSlots(config,corpus),
   status:'SEALED_NOT_EXECUTED',sendEnabled:false,providerRequests:0};
  const out=newOutput();write(resolve(out,'REGISTRATION.json'),registration);write(resolve(out,'PRIVATE_BLIND_SEED.json'),{seed});
  console.log(JSON.stringify({status:registration.status,slots:registration.slots.length,providerRequests:0}));
 }else if(['assess','blind','absolute'].includes(command)){
  clean();const reg=json(need('--registration')),e=json(need('--evidence'));
  approved(reg.config);assertCurrentCandidate(repo,reg.config);
  check(reg.runSourceSha===git('rev-parse','HEAD'),'C_RUN_SOURCE_CHANGED');
  check(reg.status==='SEALED_NOT_EXECUTED'&&reg.sendEnabled===false&&reg.worldHash===reg.corpus.review.worldHash&&
   digest(reg.slots)===digest(registerSlots(reg.config,reg.corpus)),'C_REGISTRATION_CHANGED');
  check(digest(reg.config)===digest(e.config)&&reg.corpusHash===digest(e.corpus)&&digest(reg.identity)===digest(e.identity),
   'C_SEALED_INPUT_CHANGED');
  check(e.source?.sourceSha===reg.runSourceSha&&e.source.corpusHash===reg.corpusHash,'C_EVIDENCE_SOURCE');
  check(e.attempts.every(a=>a.status==='NOT_RUN'||Number.isFinite(Date.parse(a.startedAt))&&Date.parse(a.startedAt)>=Date.parse(reg.registeredAt)),
   'C_PRE_REGISTRATION_RESULTS_FORBIDDEN');
  if(command==='absolute'){
   const {seed}=json(need('--seed')),packet=absoluteReviewPack(reg.config,reg.corpus,e.attempts,seed),out=newOutput();
   write(resolve(out,'PUBLIC_ABSOLUTE_PACKET.json'),packet.publicPacket);
   write(resolve(out,'PRIVATE_ASSIGNMENTS.json'),{assignments:packet.assignments,packetHash:packet.packetHash});
   console.log(JSON.stringify({status:'ABSOLUTE_PACKET_WRITTEN',packetHash:packet.packetHash,providerRequests:0}));
  }else if(command==='blind'){
   const absolute=evaluateQualification(e);check(absolute.candidateMeetsTarget==='PASS','C_ABSOLUTE_TARGET_MUST_PASS_FIRST');
   const {seed}=json(need('--seed')),packet=blindComparisonPack(reg.config,reg.corpus,e.attempts,seed);
   const out=newOutput();
   write(resolve(out,'PUBLIC_BLIND_PACKET.json'),packet.publicPacket);
   write(resolve(out,'PRIVATE_ASSIGNMENTS.json'),{assignments:packet.assignments,packetHash:packet.packetHash,assignmentHash:packet.assignmentHash});
   console.log(JSON.stringify({status:'BLIND_PACKET_WRITTEN',packetHash:packet.packetHash,providerRequests:0}));
  }else{
   const verdict=evaluateQualification(e),out=newOutput();write(resolve(out,'CHECKPOINT_C.json'),{...verdict,runSourceSha:reg.runSourceSha,evidenceHash:digest(e),
    registrationHash:digest(reg),wholePopulation:reg.slots.length,providerRequestsFromThisCommand:0});
   console.log(JSON.stringify(verdict));if(!verdict.replacementReady)process.exitCode=2;
  }
 }else throw new Error('C_CLI_COMMAND');
}catch(error){
 const code=/^[A-Z0-9_]+$/.test(error.message??'')?error.message:error.code??'C_VALIDATION_ERROR';
 console.error(JSON.stringify({status:'BLOCKED',code,providerRequests:0,rolloutAuthorized:false}));process.exitCode=2;
}
