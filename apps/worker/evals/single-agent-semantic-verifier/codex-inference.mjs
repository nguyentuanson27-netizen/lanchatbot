import {createServer} from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Candidate-only Codex transport. CLI supplies login; it never owns the wire
// body or a second upstream request. No credential is stored/logged here.
export function codexBinary() {
  return join(process.env.APPDATA ?? '', 'npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe');
}
export function inspectCodex() {
  const binary=codexBinary();
  const version=execFileSync(binary,['--version'],{encoding:'utf8'}).trim();
  if(version!=='codex-cli 0.159.2')throw new Error('CODEX_CLIENT_VERSION');
  const login=spawnSync(binary,['login','status'],{encoding:'utf8',windowsHide:true});
  if(login.status!==0 || !(login.stdout+login.stderr).includes('Logged in using ChatGPT'))throw new Error('CODEX_CHATGPT_LOGIN_REQUIRED');
  return {version,binarySha256:createHash('sha256').update(readFileSync(binary)).digest('hex')};
}
function launchCodex(base,manifest,role) {
  const dir=mkdtempSync(join(tmpdir(),'c3-inference-'));
  const model=manifest.models[role];
  const args=['exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','--json','-s','read-only','-C',dir,
    '-m',model.model,'-c','model_reasoning_effort="high"','-c','web_search="disabled"',
    '-c','model_provider="c3_checkpoint_a"',
    '-c',`model_providers.c3_checkpoint_a={name="OpenAI",base_url="${base}",wire_api="responses",requires_openai_auth=true,request_max_retries=0,stream_max_retries=0,supports_websockets=false}`,
    '--disable','shell_tool','--disable','multi_agent','--disable','memories','--disable','sleep_tool'];
  if(role==='verifier') {
    const schema=join(dir,'verdict-schema.json');
    writeFileSync(schema,JSON.stringify(manifest.verdictSchema));
    args.push('--output-schema',schema);
  }
  args.push('Return only the final answer. Do not invoke tools.');
  const child=spawn(codexBinary(),args,{stdio:['ignore','ignore','ignore'],windowsHide:true});
  return {done:new Promise(resolve=>{child.on('error',()=>resolve());child.on('exit',()=>resolve());}),stop:()=>child.kill()};
}
function parseStream(text,requestedModel,headerModel) {
  let completed;const doneItems=[];
  for(const line of text.split('\n')) {
    if(!line.startsWith('data: '))continue;
    const value=line.slice(6).trim();
    if(value==='[DONE]')continue;
    let event;try{event=JSON.parse(value);}catch{continue;}
    if(event.type==='response.completed')completed=event.response;
    if(event.type==='response.output_item.done'&&event.item)doneItems.push(event.item);
  }
  if(!completed)throw new Error('PROVIDER_RESPONSE');
  const model=completed.model??headerModel;
  if(model&&model!==requestedModel)throw Object.assign(new Error('PROVIDER_MODEL_MISMATCH'),{modelVersion:model});
  const items=Array.isArray(completed.output)&&completed.output.length?completed.output:doneItems;
  if(items.some(item=>!['reasoning','message'].includes(item.type)))throw new Error('PROVIDER_TOOL_OUTPUT');
  const messages=items.filter(item=>item.type==='message'&&item.phase!=='commentary');
  if(messages.length!==1)throw new Error('PROVIDER_FINAL_MESSAGE_COUNT');
  const answer=messages.flatMap(item=>item.content??[]).filter(item=>item.type==='output_text').map(item=>item.text).join('');
  if(!answer || Buffer.byteLength(answer)>4096)throw new Error('PROVIDER_OUTPUT_BOUND');
  const usage=completed.usage ? Object.fromEntries(['input_tokens','output_tokens','total_tokens','input_tokens_details','output_tokens_details']
    .filter(k=>Object.hasOwn(completed.usage,k)).map(k=>[k,completed.usage[k]])) : null;
  return {answer,modelVersion:model??null,responseId:completed.id??null,usage,cost:null};
}

export async function runCodexModel(manifest,role,request,testDependencies={}) {
  const config=manifest.models[role].generationConfig;
  const timeoutMs=testDependencies.timeoutMs??config.timeoutMs;
  const requestBody=JSON.stringify(request); // snapshot before any asynchronous client work
  if(request.model!==manifest.models[role].model || request.tools.length!==0 || request.tool_choice!=='none')throw new Error('FROZEN_REQUEST');
  const started=performance.now();
  const controller=new AbortController();
  let settled=false,providerRequests=0,clientRequests=0,rejectedClientRequests=0,record,client;
  let complete;const completion=new Promise(resolve=>{complete=resolve;});
  const finish=value=>{if(!settled){settled=true;record=value;complete();}};
  const route='/'+randomUUID();
  const server=createServer(async(req,res)=>{
    if(req.method!=='POST'||req.url!==route+'/responses') {res.writeHead(404);res.end();return;}
    clientRequests++;
    if(providerRequests!==0||settled){rejectedClientRequests++;res.writeHead(410);res.end();return;}
    // Drain the CLI body without retaining it: frozen projection is sole input.
    req.resume();
    const authorization=req.headers.authorization;
    if(!authorization){finish({status:'PROVIDER_ERROR',error:'AUTH_UNAVAILABLE',httpStatus:null});res.writeHead(400);res.end();return;}
    providerRequests++; // synchronous seal BEFORE await, including failed transmissions
    let httpStatus=null;
    try {
      const headers={'content-type':'application/json',authorization,accept:'text/event-stream',originator:'codex_cli_rs',
        'user-agent':'codex_cli_rs/0.159.2'};
      if(typeof req.headers['chatgpt-account-id']==='string')headers['chatgpt-account-id']=req.headers['chatgpt-account-id'];
      const response=await(testDependencies.upstreamFetch??fetch)(config.endpoint,{method:'POST',headers,body:requestBody,signal:controller.signal});
      httpStatus=response.status;
      if(!response.ok){await response.body?.cancel();finish({status:'PROVIDER_ERROR',error:'UPSTREAM_HTTP',httpStatus:response.status});res.writeHead(400);res.end();return;}
      const reader=response.body?.getReader();if(!reader)throw new Error('EMPTY_BODY');
      const chunks=[];let size=0;
      while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
        if(size>config.maxResponseBytes){await reader.cancel();throw new Error('RESPONSE_BOUND');}chunks.push(Buffer.from(value));}
      const text=Buffer.concat(chunks).toString('utf8');
      const parsed=parseStream(text,request.model,response.headers.get('openai-model')??response.headers.get('x-openai-model'));
      res.writeHead(200,{'content-type':'text/event-stream'});res.end(text);
      finish({status:'OK',httpStatus:response.status,...parsed});
    }catch(error) {const code=['PROVIDER_RESPONSE','PROVIDER_MODEL_MISMATCH','PROVIDER_TOOL_OUTPUT','PROVIDER_FINAL_MESSAGE_COUNT','PROVIDER_OUTPUT_BOUND','EMPTY_BODY','RESPONSE_BOUND'].includes(error.message)?error.message:'UPSTREAM_TRANSPORT';
      finish({status:controller.signal.aborted?'TIMEOUT':'PROVIDER_ERROR',error:code,httpStatus,modelVersion:error.modelVersion??null});
      if(!res.headersSent)res.writeHead(400);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+route;
  const timer=setTimeout(()=>{controller.abort();finish({status:'TIMEOUT',error:'ATTEMPT_TIMEOUT',httpStatus:null});client?.stop();},timeoutMs);
  try {
    if(testDependencies.runClient) {
      // Test client completes all attempted continuations before accounting closes.
      await testDependencies.runClient(base);
      if(!settled)finish({status:'PROVIDER_ERROR',error:'CLIENT_NO_COMPLETED_GENERATION',httpStatus:null});
    } else {
      client=launchCodex(base,manifest,role);
      await Promise.race([completion,client.done.then(()=>{if(!settled)finish({status:'PROVIDER_ERROR',error:'CLIENT_NO_GENERATION',httpStatus:null});})]);
    }
    await completion;
  }catch {finish({status:'PROVIDER_ERROR',error:'CLIENT_FAILURE',httpStatus:null});}
  finally {clearTimeout(timer);controller.abort();client?.stop();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  return {...record,providerRequests,clientRequests,rejectedClientRequests,requestBody:JSON.parse(requestBody),
    latencyMs:Math.round(performance.now()-started),cost:record.cost??null,usage:record.usage??null};
}
