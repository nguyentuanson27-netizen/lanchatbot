from pathlib import Path
import concurrent.futures,hashlib,json,subprocess,sys,time,threading
repo=Path(r'C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005')
base=repo/'apps/worker/evals/single-agent-commerce-read-only'
out=repo.parent/'c3-tool-history-continuation-20261025'
out.mkdir(exist_ok=False)
git=lambda *a:subprocess.check_output(['git',*a],cwd=repo,text=True).strip()
assert not git('status','--porcelain'),'DIRTY_SOURCE'
source=git('rev-parse','HEAD')
manifest=json.loads((base/'manifest.json').read_text())
files=['manifest.json','source-config.b1.json','cases.b1.json','stateful-cases.json','sales-journeys.candidate.json','prompts/owner.vi.txt','prompts/verifier.vi.txt','isolated-integration.mjs','stateful-provider.mjs','run.mjs']
reg={'mode':'AUTHORIZED_REMAINING_30_PLUS_FIVE_REQUIRED_NEW_DB_SETUP_TURNS','sourceSha':source,'priorSourceSha':'9e352f382e8915d6a1f1c080c75817065da42c63','priorRun':'c3-tool-history-model-20261025','targetOutcomes':30,'b1Targets':24,'negotiationTargets':3,'statefulTargets':['stateful-private-checkout','stateful-confirm','stateful-human-request'],'additionalPrerequisiteOutcomes':5,'totalDispatchedSlots':35,'repetitions':1,'retry':0,'maximumGenerationRequests':136,'models':manifest['models'],'sendEnabled':False,'setupPolicy':'Five fresh provider turns in a NEW isolated DB. Not old results, not deterministic/simulated completion. Setup failures remain denominator; dependent targets can BLOCK. No source changes or hidden generation retry.','controlsPolicy':'Prior 17 scoped controls retained as historical evidence only, not rerun or represented as same-source controls. Current source includes the privacy correction; no prompt/model change.','hashes':{n:hashlib.sha256((base/n).read_bytes()).hexdigest() for n in files},'driverHash':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(out/'REGISTRATION.json').write_text(json.dumps(reg,ensure_ascii=False,indent=2),encoding='utf-8')
launcher=base/'model-code-division-run-20261019/raw/credential-launcher.py'
commands=[];lock=threading.Lock()
def run(name,cmd):
 assert git('rev-parse','HEAD')==source and not git('status','--porcelain'),'SOURCE_CHANGED'
 cmd=list(map(str,cmd));start=time.time()
 with (out/(name+'.log')).open('xb') as log:
  code=subprocess.run(cmd,cwd=repo,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
 with lock:
  commands.append({'name':name,'command':cmd,'exitCode':code,'elapsedSeconds':round(time.time()-start,3)})
  (out/'COMMANDS.json').write_text(json.dumps(commands,indent=2),encoding='utf-8')
 print(json.dumps({'name':name,'exitCode':code}),flush=True)
 return code
def persisted(name,flags):
 common=[sys.executable,launcher,'node',base/'isolated-integration.mjs'];tail=['COD','--provider-run','--candidate-handoff',*flags]
 if run(name+'-preflight',common+[out/(name+'-preflight'),*tail,'--provider-preflight'])==0:return run(name,common+[out/name,*tail])
 return 2
def b1(first,last):
 name=f'b1-{first}-{last}';common=[sys.executable,launcher,'node',base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json','--range',f'{first}:{last}']
 if run(name+'-preflight',common+['--out',out/(name+'-preflight'),'--preflight'])==0:return run(name,common+['--out',out/name,'--run'])
 return 2
jobs=[('stateful',lambda:persisted('stateful',[])),('negotiation',lambda:persisted('negotiation',['--negotiation-probe']))]+[(f'b1-{a}-{a+3}',lambda a=a:b1(a,a+3)) for a in range(1,25,4)]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 futures={pool.submit(fn):name for name,fn in jobs};statuses={}
 for f in concurrent.futures.as_completed(futures):
  name=futures[f]
  try:statuses[name]={'exitCode':f.result()}
  except Exception as e:statuses[name]={'errorType':type(e).__name__,'error':str(e)}
  (out/'STATUS.json').write_text(json.dumps({'sourceSha':source,'status':'RUNNING' if len(statuses)<len(jobs) else 'COLLECTED_REQUIRES_REVIEW','jobs':statuses},indent=2),encoding='utf-8')
assert git('rev-parse','HEAD')==source and not git('status','--porcelain'),'SOURCE_CHANGED'
