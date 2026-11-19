import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {read,write,digest,byteHash,validateInput,B_SHA,C_SHA} from './bc-control.mjs';
const [inputFile,out]=process.argv.slice(2);assert(out,'CONTROL_SEAL_ARGS');const input=read(inputFile);validateInput(input);
const root=input.cRoot,git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
assert.equal(git(root,'status','--porcelain'),'','CONTROL_DIRTY_SOURCE');assert.equal(git(input.bRoot,'status','--porcelain'),'','CONTROL_DIRTY_B');assert.equal(git(input.bRoot,'rev-parse','HEAD'),B_SHA);
execFileSync('git',['diff','--exit-code',C_SHA,'--','apps/worker/src','packages'],{cwd:root,stdio:'pipe'});
assert.equal(byteHash(readFileSync(input.cWorld)),input.cWorldHash,'CONTROL_WORLD_CHANGED_BEFORE_SEAL');
for(const a of input.artifacts)assert.equal(byteHash(readFileSync(a.path)),a.sha256,'CONTROL_HISTORY_CHANGED_BEFORE_SEAL');
const files=new Set([resolve(inputFile),input.cWorld,...input.artifacts.map(a=>a.path)]);
for(const cwd of[root,input.bRoot]){
 const walk=p=>{for(const d of readdirSync(p,{withFileTypes:true})){const f=join(p,d.name);if(d.isDirectory())walk(f);else if(d.name.endsWith('.js'))files.add(f);}};
 walk(resolve(cwd,'apps/worker/dist'));
 for(const d of readdirSync(resolve(cwd,'packages'),{withFileTypes:true}))if(d.isDirectory()){
  const dist=resolve(cwd,'packages',d.name,'dist');try{walk(dist);}catch(error){if(error.code!=='ENOENT')throw error;}
 }
}
for(const path of git(root,'ls-files','apps/worker/evals/single-agent-commerce-qualification','apps/worker/evals/single-agent-commerce-read-only','apps/worker/evals/single-agent-semantic-verifier').split('\n').filter(p=>p.endsWith('.mjs')&&!p.includes('.test.')))files.add(resolve(root,path));
const seal={kind:'BC_DIAGNOSTIC_SEAL_V1',runSourceSha:git(root,'rev-parse','HEAD'),bSourceSha:B_SHA,cRuntimeSourceSha:C_SHA,inputHash:digest(input),sealedAt:new Date().toISOString(),
 maximumGenerationRequests:18,retry:0,providerRequestsAtSeal:0,sendEnabled:false,toolsExecuted:false,
 artifacts:[...files].sort().map(path=>({path,sha256:byteHash(readFileSync(path))})),slots:input.slots};
write(out,seal);console.log(JSON.stringify({source:seal.runSourceSha,inputHash:seal.inputHash,artifacts:seal.artifacts.length,slots:18,providerRequests:0}));
