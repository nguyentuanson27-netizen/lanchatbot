import {readFileSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const root=process.argv[2],repo=process.cwd(),mod=p=>import(pathToFileURL(resolve(p)).href),read=p=>JSON.parse(readFileSync(p));
const {digest}=await mod('apps/worker/evals/single-agent-commerce-qualification/qualification.mjs');
const {currentCandidate}=await mod('apps/worker/evals/single-agent-commerce-qualification/source-identity.mjs');
const {validateProtocol}=await mod('apps/worker/evals/single-agent-commerce-read-only/protocol.mjs');
const {inspectCodex}=await mod('apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(source,'82c86a3c67d1f12f0f87f6956e0c44c68b265957');assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');
const world=read(resolve(root,'world/WORLD.json')),prefixFile=resolve(root,'PREFIX.json'),prefix=read(prefixFile),m=validateProtocol(read('apps/worker/evals/single-agent-commerce-read-only/manifest.json'));
assert.equal(world.sourceSha,'2d81c26493b79eab12dec9be4c95f8cf960b855d');assert.equal(execFileSync('git',['diff','2d81c264','HEAD','--','apps/worker/src','packages','apps/worker/evals/single-agent-commerce-read-only'],{encoding:'utf8'}).trim(),'','BUSINESS_SOURCE_CHANGED_SINCE_CAPTURE');assert.equal(m.requestBounds.verifierWireBytes,70000);
const toolchain=inspectCodex(),target=world.snapshots.SV2447;assert(target);const expiry=new Date(Date.parse(target.synced_at)+world.config.maxFactAgeSeconds*1000).toISOString();
assert(Date.parse(expiry)>Date.now()+15*60000,'FRESH_SOURCE_HEADROOM');
const slots=prefix.conversations.map(c=>({repetition:c.repetition,latest:c.turns[2].customer}));assert.deepEqual(slots.map(s=>s.repetition),[1,2,3,4,5]);
const input={mode:'J4_RECHECK',registeredAt:new Date().toISOString(),runSourceSha:source,worldFile:resolve(root,'world/WORLD.json'),worldHash:digest(world),
 slots,slotsHash:digest(slots),prefixFile,prefixHash:digest(prefix),maximumGenerationRequests:20,minimumProofExpiresAt:expiry,safetyMarginMs:1000,toolchainHash:toolchain.binarySha256,
 ownerRequest:'tăng verifier lên 70000 byte đồng bộ rồi chạy lại 5 lượt J4 bị chặn',candidate:currentCandidate(repo),
 setup:'10 scripted fixture turns using prior public accepted text and current-source real tools; not new model outcomes',measured:'5 final turns only',
 priorAbortedRun:"C:\\Users\\nguye\\Documents\\S\u1ea3n ph\u1ea9m AI\\c3-verifier70000-j4-five-2d81c264-20261119-092836",captureSourceSha:world.sourceSha,judgeRequests:0,automaticEvaluatorRetry:0,runtimeOwnerRecovery:'Existing bounded recovery within 3 owner calls; any used retries retained',sendEnabled:false,sourceWrites:0};
writeFileSync(resolve(root,'INPUT.json'),JSON.stringify(input,null,2));
const helpers=[resolve(root,'seal.mjs'),resolve('../c3-current-cart-choice-launch-20261119.py'),'apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py','apps/worker/evals/single-agent-commerce-read-only/source-session.py'];
writeFileSync(resolve(root,'SEAL.json'),JSON.stringify({source,worldHash:input.worldHash,inputHash:digest(input),prefixHash:input.prefixHash,models:m.models,promptHashes:m.promptHashes,bounds:m.requestBounds,
 helpers:helpers.map(p=>({path:resolve(p),sha256:createHash('sha256').update(readFileSync(p)).digest('hex')})),providerRequests:0},null,2));
console.log(JSON.stringify({source,measuredTurns:5,scriptedSetupTurns:10,maximumGenerationRequests:20,preflight:'PASS',providerRequests:0}));