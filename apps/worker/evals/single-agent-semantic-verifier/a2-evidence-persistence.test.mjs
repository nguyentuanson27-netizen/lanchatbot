import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,renameSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {publishA2Evidence,prepareShard,runShard} from './run-a2-shards.mjs';
import {runCodexModel} from './codex-inference.mjs';
import {buildRequest,projectRuntime} from './protocol.mjs';
import {summarizeA2} from './run-a2.mjs';

const read=f=>JSON.parse(readFileSync(new URL('./round-64/'+f,import.meta.url),'utf8'));
const m=read('manifest.json'),a2=read('corpus-a2.json'),plan=read('a2-shard-plan.json');
function files(t) {
 const directory=mkdtempSync(join(tmpdir(),'c3-a2-persistence-'));
 t.after(()=>{assert.equal(dirname(resolve(directory)),resolve(tmpdir()));rmSync(directory,{recursive:true,force:true});});
 return {directory,output:join(directory,'evidence.json'),temporary:join(directory,'evidence.json.tmp')};
}
const verdict='{"verdict":"PASS","violations":[]}';
const post=base=>new Promise((resolve,reject)=>{
 const req=httpRequest(base+'/responses',{method:'POST',agent:false,headers:{authorization:'LOCAL_AUTH_NOT_RETAINED',connection:'close'}},res=>{
  res.resume();res.on('end',resolve);res.on('error',reject);
 });req.on('error',reject);req.end('{}');
});
const completed=()=>new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',model:m.models.verifier.model,
 output:[{type:'message',content:[{type:'output_text',text:verdict}]}],usage:{input_tokens:10,output_tokens:5,total_tokens:15}}})+'\n\n',{status:200});

test('a transient evidence-file lock publishes the same result without another generation',async t=>{
 const {output,temporary}=files(t);writeFileSync(output,'{"old":true}\n');let renames=0,generations=0;
 const e=prepareShard(m,a2,plan,'a'.repeat(40),0);e.shard.attemptIds=e.shard.attemptIds.slice(0,1);
 await runShard(m,a2,e,async request=>{generations++;return {status:'OK',answer:verdict,requestBody:request,providerRequests:1};},{
  checkSource:()=>{},log:()=>{},save:value=>publishA2Evidence(value,temporary,output,()=>{}, {
   rename:(from,to)=>{if(value.attempts.find(a=>a.terminal)&&renames++===0)throw Object.assign(Error('PRIVATE_OS_MESSAGE'),{code:'EPERM'});renameSync(from,to);},pause:()=>{}
  })
 });
 assert.equal(generations,1);assert.ok(renames>=2);assert.equal(JSON.parse(readFileSync(output)).attempts.filter(a=>a.terminal).length,1);
 assert.equal(existsSync(temporary),false);
});

test('permanent publication failure retains complete tmp and stops before the next attempt',async t=>{
 const {output,temporary}=files(t);let renames=0,generations=0;
 const e=prepareShard(m,a2,plan,'a'.repeat(40),0);e.shard.attemptIds=e.shard.attemptIds.slice(0,2);
 await assert.rejects(runShard(m,a2,e,async request=>{generations++;return {status:'OK',answer:verdict,requestBody:request,providerRequests:1};},{
  checkSource:()=>{},log:()=>{},save:value=>publishA2Evidence(value,temporary,output,()=>{}, {
   rename:(from,to)=>{if(value.attempts.some(a=>a.terminal)){renames++;throw Object.assign(Error('PRIVATE_OS_MESSAGE'),{code:'EPERM'});}renameSync(from,to);},pause:()=>{}
  })
 }),error=>error.message==='A2_EVIDENCE_PERSIST_FAILED:PUBLISH:EPERM');
 assert.equal(generations,1);assert.equal(renames,4);
 const old=JSON.parse(readFileSync(output)),pending=JSON.parse(readFileSync(temporary));
 assert.equal(old.attempts.filter(a=>a.terminal).length,0);assert.equal(pending.attempts.filter(a=>a.terminal).length,1);
 assert.equal(pending.attempts.find(a=>a.attemptId===e.shard.attemptIds[1]).invocationStartedAt,undefined);
});

test('write failure preserves prior evidence and reports only bounded stage and OS code',t=>{
 const {output,temporary}=files(t);writeFileSync(output,'{"old":true}\n');
 assert.throws(()=>publishA2Evidence({new:true},temporary,output,()=>{}, {
  write:()=>{throw Object.assign(Error('PRIVATE_PATH_OR_SECRET'),{code:'ENOSPC'});}
 }),error=>error.message==='A2_EVIDENCE_PERSIST_FAILED:WRITE:ENOSPC');
 assert.equal(readFileSync(output,'utf8'),'{"old":true}\n');assert.equal(existsSync(temporary),false);
});

test('Windows reader withholding delete sharing reproduces and releases the publication failure',async t=>{
 if(process.platform!=='win32')return; // The portable failure-injection cases above still run on every platform.
 const {output,temporary}=files(t);writeFileSync(output,'{"old":true}\n');
 const literal="'"+output.replaceAll("'","''")+"'";
 const child=spawn('pwsh',['-NoProfile','-NonInteractive','-Command',
  `$stream=[System.IO.File]::Open(${literal},[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::Read); [Console]::Out.WriteLine('LOCKED'); [System.Threading.Thread]::Sleep(100); $stream.Dispose()`],
  {windowsHide:true,stdio:['ignore','pipe','pipe']});
 t.after(()=>child.kill());const closed=once(child,'close');
 assert.match(String((await once(child.stdout,'data'))[0]),/LOCKED/);
 assert.doesNotThrow(()=>publishA2Evidence({completed:true},temporary,output,()=>{}));
 assert.equal((await closed)[0],0);assert.deepEqual(JSON.parse(readFileSync(output)),{completed:true});
});

test('request accounting and completed reply persist before client cleanup; no terminal is inferred',async t=>{
 const {output,temporary}=files(t);const e=prepareShard(m,a2,plan,'a'.repeat(40),0);e.shard.attemptIds=e.shard.attemptIds.slice(0,1);
 let generations=0,duringCleanup;
 await runShard(m,a2,e,(request,options)=>runCodexModel(m,'verifier',request,{
  ...options,runClient:async base=>{await post(base);duringCleanup=JSON.parse(readFileSync(output));},
  upstreamFetch:async()=>{generations++;return completed();}
 }),{save:value=>publishA2Evidence(value,temporary,output,()=>{}),checkSource:()=>{},log:()=>{}});
 const pending=duringCleanup.attempts.find(a=>a.attemptId===e.shard.attemptIds[0]);
 assert.equal(generations,1);assert.equal(pending.terminal,null);
 assert.equal(pending.transportCheckpoint.phase,'RESULT');assert.equal(pending.transportCheckpoint.provider.answer,verdict);
 assert.equal(pending.transportCheckpoint.provider.providerRequests,1);
 assert.ok(!JSON.stringify(duringCleanup).includes('LOCAL_AUTH_NOT_RETAINED'));
 const final=JSON.parse(readFileSync(output)).attempts.find(a=>a.attemptId===e.shard.attemptIds[0]);
 assert.ok(final.terminal);assert.equal(final.transportCheckpoint,undefined);
});

test('a dispatched but unfinished request has retained accounting without a verdict or retry',async()=>{
 const request=buildRequest(m,'verifier',projectRuntime(m,a2.cases[0],'verifier','LOCAL_REQUEST_ID'));
 let observed,generations=0;
 const result=await runCodexModel(m,'verifier',request,{
  runClient:post,onCheckpoint:checkpoint=>{if(checkpoint.phase==='DISPATCHED')observed=structuredClone(checkpoint);},
  upstreamFetch:async()=>{generations++;return new Response('partial without terminal SSE',{status:200});}
 });
 assert.equal(generations,1);assert.equal(observed.provider.providerRequests,1);
 assert.deepEqual(observed.provider.requestBody,request);assert.equal(observed.provider.answer,undefined);
 assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.providerRequests,1);
});

test('a persistence failure aborts the current request and escapes without a hidden generation retry',async()=>{
 const request=buildRequest(m,'verifier',projectRuntime(m,a2.cases[0],'verifier','LOCAL_WRITE_FAILURE'));
 const failure=Object.assign(Error('A2_EVIDENCE_PERSIST_FAILED:PUBLISH:EPERM'),{name:'A2EvidencePersistError'});let generations=0;
 await assert.rejects(runCodexModel(m,'verifier',request,{
  runClient:post,onCheckpoint:()=>{throw failure;},
  upstreamFetch:async()=>{generations++;return completed();}
 }),error=>error===failure);
 assert.equal(generations,1);
});

for(const phase of ['DISPATCHED','RESULT'])test('killing the runner after '+phase+' keeps accounting, blocks eligibility and refuses restart',async t=>{
 const {output,temporary}=files(t);
 const source=`import {readFileSync} from 'node:fs';import {request as httpRequest} from 'node:http';
 import {prepareShard,runShard,publishA2Evidence} from ${JSON.stringify(new URL('./run-a2-shards.mjs',import.meta.url).href)};
 import {runCodexModel} from ${JSON.stringify(new URL('./codex-inference.mjs',import.meta.url).href)};
 const read=f=>JSON.parse(readFileSync(new URL(f,${JSON.stringify(new URL('./round-64/',import.meta.url).href)}),'utf8'));
 const m=read('manifest.json'),a2=read('corpus-a2.json'),e=prepareShard(m,a2,read('a2-shard-plan.json'),'a'.repeat(40),0);
 e.shard.attemptIds=e.shard.attemptIds.slice(0,2);
 await runShard(m,a2,e,(request,options)=>runCodexModel(m,'verifier',request,{
  ...options,onCheckpoint:c=>{options.onCheckpoint(c);if(c.phase===${JSON.stringify(phase)})process.send(c.phase);},
  runClient:base=>new Promise((resolve,reject)=>{
   const req=httpRequest(base+'/responses',{method:'POST',agent:false,headers:{authorization:'LOCAL_AUTH_NOT_RETAINED',connection:'close'}},res=>{res.resume();res.on('error',reject);});
   req.on('error',reject);req.end('{}');
  }),
  upstreamFetch:()=>${phase==='DISPATCHED'?'new Promise(()=>{})':`Promise.resolve(new Response(${JSON.stringify('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',model:m.models.verifier.model,output:[{type:'message',content:[{type:'output_text',text:verdict}]}]}})+'\n\n')},{status:200}))`}
 }),{save:value=>publishA2Evidence(value,${JSON.stringify(temporary)},${JSON.stringify(output)},()=>{}),checkSource:()=>{},log:()=>{}});`;
 const child=spawn(process.execPath,['--input-type=module','-e',source],{windowsHide:true,stdio:['ignore','ignore','pipe','ipc']});
 const closed=once(child,'close');let diagnostic='';child.stderr.on('data',data=>{diagnostic+=String(data);});
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('LOCAL_RUNNER_CHECKPOINT_TIMEOUT:'+diagnostic)),5000);
   child.once('message',message=>{clearTimeout(timer);assert.equal(message,phase);resolve();});
   child.once('error',error=>{clearTimeout(timer);reject(error);});
   child.once('exit',()=>{clearTimeout(timer);reject(Error('LOCAL_RUNNER_EARLY_EXIT:'+diagnostic));});
  });
 }finally{child.kill();await closed;}
 const retained=JSON.parse(readFileSync(output)),pending=retained.attempts.find(a=>a.attemptId===retained.shard.attemptIds[0]);
 assert.equal(pending.transportCheckpoint.phase,phase);assert.equal(pending.transportCheckpoint.provider.providerRequests,1);
 assert.equal(pending.terminal,null);assert.equal(pending.provider,null);assert.ok(pending.invocationStartedAt);
 assert.equal(summarizeA2(m,retained.attempts).status,'BLOCKED');
 assert.ok(!JSON.stringify(retained).includes('LOCAL_AUTH_NOT_RETAINED'));
 let generations=0;await assert.rejects(runShard(m,a2,retained,async()=>{generations++;throw Error('MUST_NOT_RETRY');},
  {save:()=>{},checkSource:()=>{},log:()=>{}}),/A2_SHARD_ALREADY_ATTEMPTED/);
 assert.equal(generations,0);
});
