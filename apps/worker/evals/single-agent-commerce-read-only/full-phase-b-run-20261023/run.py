from pathlib import Path
import hashlib,json,os,subprocess,sys,datetime,threading,concurrent.futures
repo=Path.cwd();base=repo/'apps/worker/evals/single-agent-commerce-read-only';out=Path(__file__).resolve().parent
launcher=base/'model-code-division-run-20261019/raw/credential-launcher.py'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
stamp=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
manifest=json.loads((base/'manifest.json').read_text(encoding='utf-8'))
frozen=['manifest.json','source-config.b1.json','cases.b1.json','stateful-cases.json','sales-journeys.candidate.json','sales-media-followup-cases.json','sales-journeys-registration.mjs','handoff-matrix.candidate.json','prompts/owner.vi.txt','prompts/verifier.vi.txt','run.mjs','protocol.mjs','gemini-inference.mjs','stateful-provider.mjs','isolated-integration.mjs','candidate-handoff.mjs']
reg={'registeredAt':stamp(),'runSourceSha':head,'models':manifest['models'],'promptHashes':manifest['promptHashes'],'schemaHash':manifest['schemaHash'],'inputAndRunnerHashes':{f:sha(base/f) for f in frozen},'orchestratorHash':sha(Path(__file__)),'coreNativeOutcomes':39,'mediaContinuationOutcomes':7,'corePublicTurns':38,'privateCodeTurns':1,'repetitions':1,'maximumGenerationRequests':180,'retry':0,'sendEnabled':False,'candidateHandoff':True,'concurrentIndependentJobs':2,'ownerInstruction':'Owner explicitly requests full Phase B after controls failed. Native core39 plus current media7, no diagnostic, no midrun patch or automatic repeat. Baseline verifier remains active.'}
(out/'REGISTRATION.json').write_text(json.dumps(reg,indent=2)+'\n')
commands=[];lock=threading.Lock()
def clean():
 assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==head,'SOURCE_CHANGED'
 assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip(),'DIRTY_WORKTREE'
 assert all(sha(base/f)==h for f,h in reg['inputAndRunnerHashes'].items()),'INPUT_CHANGED'
def execute(name,args):
 clean();cmd=[sys.executable,str(launcher),'node',*map(str,args)];row={'name':name,'command':cmd,'startedAt':stamp(),'status':'RUNNING'}
 with lock:
  commands.append(row);(out/'commands.json').write_text(json.dumps(commands,indent=2))
 with (out/(name+'.log')).open('xb') as log:code=subprocess.run(cmd,cwd=repo,env=dict(os.environ,C3_DIVISION_REPO=str(repo)),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
 with lock:
  row.update(status='FINISHED',exitCode=code,finishedAt=stamp());(out/'commands.json').write_text(json.dumps(commands,indent=2))
 print(json.dumps({'job':name,'exitCode':code}),flush=True);return code
def b1(mode):return [base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json','--out',out/('preflight-b1' if mode=='--preflight' else 'b1'),'--range','1:24',mode]
def journey(name,*flags):return [base/'isolated-integration.mjs',out/name,'COD','--provider-run','--candidate-handoff',*flags]
jobs=[('b1',b1('--run')),('stateful',journey('stateful')),('openings',journey('openings','--journey-openings')),('negotiation',journey('negotiation','--negotiation-probe')),('media',journey('media','--media-followup'))]
ready=[]
for name,args in jobs:
 pf=b1('--preflight') if name=='b1' else args+['--provider-preflight']
 if execute('preflight-'+name,pf)==0:ready.append((name,args))
 else:(out/(name+'-NOT_RUN.json')).write_text(json.dumps({'reason':'PREFLIGHT_FAILED','providerRequests':0}))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 futures=[pool.submit(execute,name,args) for name,args in ready]
 for future in futures:future.result()
clean();print('ALL_REGISTERED_JOBS_FINISHED',flush=True)
