// Disposable git fixtures only; no provider or business adapters are executed.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {config,corpus,evidence} from './fixtures.test-support.mjs';
import {digest,textDigest,qualificationIdentity,outcomeDigest,blindComparisonPack,absoluteReviewPack} from './qualification.mjs';
import {currentCandidate} from './source-identity.mjs';
const cli=fileURLToPath(new URL('./cli.mjs',import.meta.url));
function setup(t){
 const root=mkdtempSync(resolve(tmpdir(),'lana-c-cli-')),repo=resolve(root,'repo');mkdirSync(repo);
 t.after(()=>{assert.equal(dirname(root),resolve(tmpdir()));assert(basename(root).startsWith('lana-c-cli-'));rmSync(root,{recursive:true,force:true});});
 const put=(p,x)=>{const path=resolve(repo,p);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,typeof x==='string'?x:JSON.stringify(x));};
 const git=(...a)=>execFileSync('git',a,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init');git('config','user.name','Unit Fixture');git('config','user.email','unit@example.invalid');git('config','core.autocrlf','false');
 const base='apps/worker/evals/single-agent-commerce-read-only/';
 const m={models:{conversation:config().candidate.model,verifier:config().candidate.verifier.model},
  promptHashes:{owner:textDigest('unit-owner'),verifier:textDigest('unit-verifier')},verdictSchema:{type:'object'},requestBounds:{bytes:100},toolCalls:6,toolRounds:2};
 m.schemaHash=textDigest(JSON.stringify(m.verdictSchema));put(base+'manifest.json',m);put(base+'prompts/owner.vi.txt','unit-owner');put(base+'prompts/verifier.vi.txt','unit-verifier');put(base+'protocol.mjs','// unit serialization');
 for(const f of ['single-agent-commerce-ingress','single-agent-commerce','single-agent-commerce-media-delivery','single-agent-semantic-verifier-boundary'])put('apps/worker/src/'+f+'.ts','// unit source');
 put(base+'runner.mjs','// unit runner');
 const decisions={status:'APPROVED',evidenceRef:'UNIT_FIXTURE_NOT_REAL_OWNER_DECISION',thresholds:config().thresholds,repetitions:1,comparisonBaselineSha:'a'.repeat(40)};
 put('apps/worker/evals/single-agent-commerce-qualification/owner-decisions.json',decisions);
 git('add','.');git('commit','-m','unit fixture');
 const c=config();c.candidate=currentCandidate(repo);c.ownerDecision={status:decisions.status,evidenceRef:decisions.evidenceRef,decisionHash:digest(decisions)};
 const world={kind:'FROZEN_PUBLIC_BUSINESS_WORLD',sourceEvidenceHashes:['1'.repeat(64)]},pop=corpus();
 pop.review={status:'APPROVED',worldHash:digest(world),newProviderResultsObserved:0};
 for(const s of pop.scenarios.filter(s=>s.mode!=='SAFETY'))s.initialContext.worldHash=digest(world);
 const files={config:resolve(root,'config.json'),corpus:resolve(root,'corpus.json'),world:resolve(root,'world.json'),development:resolve(root,'development.json')};
 const write=(key,x)=>writeFileSync(files[key],JSON.stringify(x));
 write('config',c);write('corpus',pop);write('world',world);write('development',[]);
 const run=(command,args={})=>spawnSync(process.execPath,[cli,command,'--repo',repo,...Object.entries(args).flatMap(([k,v])=>['--'+k,v])],{encoding:'utf8'});
 const seal=out=>run('seal',{...files,out});
 return {root,repo,put,git,c,pop,world,files,write,run,seal};
}
test('CLI seals a clean bound fixture once and refuses dirty or changed source and in-repo outputs',t=>{
 const f=setup(t),out=resolve(f.root,'sealed');
 const r=f.seal(out);assert.equal(r.status,0,r.stderr);
 const reg=JSON.parse(readFileSync(resolve(out,'REGISTRATION.json'),'utf8'));
 assert.equal(reg.status,'SEALED_NOT_EXECUTED');assert.equal(reg.providerRequests,0);assert.equal(reg.slots.length,6);
 assert.equal(f.seal(out).status,2);
 assert.equal(f.seal(f.repo).status,2);
 assert.equal(f.seal(resolve(f.repo,'raw')).status,2);
 if(process.platform==='win32')assert.equal(f.seal(resolve(f.repo.toUpperCase(),'raw')).status,2);
 f.put('apps/worker/evals/single-agent-commerce-read-only/runner.mjs','// changed runtime adapter');
 assert.match(f.seal(resolve(f.root,'dirty')).stderr,/C_DIRTY_SOURCE/);
 f.git('add','.');f.git('commit','-m','change executable');
 assert.equal(f.seal(resolve(f.root,'stale')).status,2);
 assert(!existsSync(resolve(f.root,'stale')));
});
test('CLI refuses unbound drafts, reused development inputs and unapproved threshold changes',t=>{
 const f=setup(t);
 f.pop.scenarios[0].turns[0].latest='{{unbound}}';f.write('corpus',f.pop);
 assert.match(f.seal(resolve(f.root,'unbound')).stderr,/C_UNRESOLVED_HOLDOUT_INPUT/);
 f.pop.scenarios[0].turns[0].latest='Áo này bao nhiêu em?';f.write('corpus',f.pop);
 f.write('development',[digest(f.pop.scenarios[0].turns[0])]);
 // Runtime fingerprints normalize the customer text but include no evaluator fields.
 assert.equal(f.seal(resolve(f.root,'reused')).status,2);
 f.write('development',[]);f.c.thresholds.singleQuality=.1;f.write('config',f.c);
 assert.match(f.seal(resolve(f.root,'threshold')).stderr,/C_OWNER_DECISION_CHANGED/);
});
test('CLI draft check reports unresolved corpus and baseline, rather than ready-to-run',t=>{
 const f=setup(t);f.c.baseline.capabilityStatus='UNVERIFIED_MATCHED_MODEL_AND_STATEFUL_PARITY';f.write('config',f.c);
 f.pop.review.status='PENDING';f.write('corpus',f.pop);
 const r=f.run('check',{config:f.files.config,corpus:f.files.corpus});assert.equal(r.status,2);
 const result=JSON.parse(r.stdout);assert(result.missing.includes('BASELINE_MATCHED_BRIDGE_EVIDENCE'));assert(result.missing.includes('CORPUS_BINDING_AND_REVIEW'));
});
test('CLI assesses only sealed post-registration evidence and exports a bound blind packet',t=>{
 const f=setup(t),sealed=resolve(f.root,'sealed');assert.equal(f.seal(sealed).status,0);
 const registration=resolve(sealed,'REGISTRATION.json'),seed=resolve(sealed,'PRIVATE_BLIND_SEED.json');
 const reg=JSON.parse(readFileSync(registration,'utf8')),e=evidence();
 e.config=reg.config;e.corpus=reg.corpus;e.identity=qualificationIdentity(e.config);
 e.source={clean:true,sourceSha:reg.runSourceSha,registeredBeforeFirstRequest:true,corpusHash:reg.corpusHash};
 for(const a of e.attempts){
  Object.assign(a,reg.slots.find(s=>s.caseId===a.caseId&&s.arm===a.arm));
  a.identity=e.identity;a.startedAt=new Date().toISOString();a.parity.worldHash=reg.worldHash;
  a.quality.outcomeHash=outcomeDigest(a);
 }
 e.structural.candidateIdentity=e.identity.candidate;e.realAdapter.candidateIdentity=e.identity.candidate;
 e.blindSeed=JSON.parse(readFileSync(seed,'utf8')).seed;
 const absolute=absoluteReviewPack(e.config,e.corpus,e.attempts,e.blindSeed);
 for(const a of e.attempts.filter(a=>a.arm==='CANDIDATE'&&a.mode!=='SAFETY')){
  a.quality.packetHash=absolute.packetHash;a.quality.reviewId=absolute.assignments.find(p=>p.slotId===a.slotId).reviewId;
 }
 const packet=blindComparisonPack(e.config,e.corpus,e.attempts,e.blindSeed);
 e.blindGrades=packet.assignments.map(a=>({reviewId:a.reviewId,packetHash:packet.packetHash,vote:a.A==='CANDIDATE'?'A':'B',
  adjudicated:true,judgeIdentity:e.config.judge.identity,reason:'Synthetic unit vote, never real qualification.'}));
 const file=resolve(f.root,'evidence.json');writeFileSync(file,JSON.stringify(e));
 const r=f.run('assess',{registration,evidence:file,out:resolve(f.root,'assessment')});assert.equal(r.status,0,r.stderr+r.stdout);
 assert.equal(JSON.parse(r.stdout).rolloutAuthorized,false);
 assert.equal(f.run('absolute',{registration,evidence:file,seed,out:resolve(f.root,'absolute')}).status,0);
 assert.equal(f.run('blind',{registration,evidence:file,seed,out:resolve(f.root,'packet')}).status,0);
 e.attempts[0].startedAt='2000-01-01T00:00:00.000Z';writeFileSync(file,JSON.stringify(e));
 assert.match(f.run('assess',{registration,evidence:file,out:resolve(f.root,'early')}).stderr,/C_PRE_REGISTRATION_RESULTS_FORBIDDEN/);
 assert(!existsSync(resolve(f.root,'early')));
});
