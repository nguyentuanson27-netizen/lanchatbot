// Evaluation only. Canonical capture and whole-corpus frozen preflight required.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {validateProtocol,createCommerceVerifier} from './protocol.mjs';
import {prepareControls,dispatchControls} from './feedback-control-inputs.mjs';
import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './feedback-run-identity.mjs';
const {values:args,positionals}=parseArgs({allowPositionals:true,options:{capture:{type:'string'},prepared:{type:'string'},preflight:{type:'boolean'}}});
const [out]=positionals;assert(out&&args.capture,'CAPTURE_AND_NEW_OUTPUT_REQUIRED');
const identity=readFeedbackRunIdentity();assertCleanFeedbackSource(identity);
const manifest=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url))));
const instructions=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
const capture=JSON.parse(readFileSync(resolve(args.capture)));
assert.equal(capture.sourceConfigHash,identity.sourceConfigHash,'CAPTURE_CONFIG_CHANGED');
mkdirSync(out);
let bundle;
try{
 bundle=await prepareControls({capture,identity,manifest,instructions});
 if(!args.preflight){assert(args.prepared,'FROZEN_PREFLIGHT_REQUIRED');assert.deepEqual(JSON.parse(readFileSync(resolve(args.prepared))),bundle,'FROZEN_BUNDLE_CHANGED');}
 writeFileSync(resolve(out,'prepared.json'),JSON.stringify(bundle,null,2),{flag:'wx'});
 writeFileSync(resolve(out,'registration.json'),JSON.stringify({identity,bundleHash:bundle.hash,captureHash:capture.hash,mode:'NEW_CAPTURED_WORLD_CONTROLS',registeredOutcomes:17,safe:8,unsafe:8,probe:1,maximumGenerationRequests:17,retry:0,sendEnabled:false},null,2),{flag:'wx'});
}catch(e){writeFileSync(resolve(out,'summary.json'),JSON.stringify({status:'BLOCKED',stage:'ZERO_GENERATION_PREFLIGHT',reason:e.code??e.message,providerRequests:0}),{flag:'wx'});throw e;}
if(args.preflight){writeFileSync(resolve(out,'summary.json'),JSON.stringify({status:'PREFLIGHT_PASS',bundleHash:bundle.hash,providerRequests:0}));}
else{
 const verifier=createCommerceVerifier(manifest,undefined,(id,v)=>appendFileSync(resolve(out,'accounting.jsonl'),JSON.stringify({id,phase:v.phase,value:v.provider})+'\n'));
 const result=await dispatchControls(bundle,{identity,manifest,instructions,assertCurrent:()=>assertCleanFeedbackSource(identity),
  verify:async request=>{appendFileSync(resolve(out,'requests.jsonl'),JSON.stringify({id:request.generationId,wire:bundle.outcomes.find(p=>p.request.generationId===request.generationId).wire})+'\n');return verifier(request);},
  onAttempt:(i,attempt)=>writeFileSync(resolve(out,`attempt-${i}.json`),JSON.stringify(attempt,null,2),{flag:'wx'})});
 const {attemptsData,...summary}=result;
 writeFileSync(resolve(out,'summary.json'),JSON.stringify({...summary,identity,bundleHash:bundle.hash,status:result.controlsPass?'PASS':'FAIL'},null,2),{flag:'wx'});
 if(!result.controlsPass)process.exitCode=1;
}
