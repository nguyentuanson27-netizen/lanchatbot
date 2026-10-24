from pathlib import Path
import hashlib,json,os,subprocess,sys,datetime

repo=Path.cwd();base=repo/'apps/worker/evals/single-agent-commerce-read-only';out=Path(__file__).resolve().parent
launcher=base/'model-code-division-run-20261019/raw/credential-launcher.py'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
stamp=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert head=='540b8129e2e52062ad5bc96ffa44dd84d0591bd5'
assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
manifest=json.loads((base/'manifest.json').read_text(encoding='utf-8'))
frozen=['manifest.json','source-config.b1.json','cases.b1.json','stateful-cases.json','sales-journeys.candidate.json','handoff-matrix.candidate.json','prompts/owner.vi.txt','prompts/verifier.vi.txt','run.mjs','protocol.mjs','gemini-inference.mjs','stateful-provider.mjs','isolated-integration.mjs','candidate-handoff.mjs','advice-diagnostic.mjs','opening-advice-preparation-20261022/diagnostic-inputs.json']
registration={'registeredAt':stamp(),'runSourceSha':head,'models':manifest['models'],'promptHashes':manifest['promptHashes'],'schemaHash':manifest['schemaHash'],'inputAndRunnerHashes':{f:sha(base/f) for f in frozen},'orchestratorHash':sha(Path(__file__)),'diagnosticOutcomes':4,'nativeOutcomes':39,'nativePublicTurns':38,'privateCodeTurns':1,'repetitions':1,'maximumGenerationRequests':160,'retry':0,'sendEnabled':False,'candidateHandoff':True,'ownerInstruction':'After fixes run full cases; complete native39 even if diagnostic voice needs edits. Stop only on infrastructure/source identity/privacy blockers, never quality early stop. No repeat campaign.'}
(out/'REGISTRATION.json').write_bytes((json.dumps(registration,ensure_ascii=False,indent=2)+'\n').encode())
commands=[]
def clean():
 assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==head,'SOURCE_CHANGED'
 assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip(),'DIRTY_WORKTREE'
 for f,h in registration['inputAndRunnerHashes'].items():assert sha(base/f)==h,'FROZEN_INPUT_CHANGED'
def execute(name,args):
 clean();cmd=[sys.executable,str(launcher),'node',*map(str,args)]
 commands.append({'name':name,'command':cmd,'startedAt':stamp(),'status':'RUNNING'})
 (out/'commands.json').write_bytes((json.dumps(commands,indent=2)+'\n').encode())
 with (out/(name+'.log')).open('xb') as log:
  code=subprocess.run(cmd,cwd=repo,env=dict(os.environ,C3_DIVISION_REPO=str(repo)),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
 commands[-1].update(status='FINISHED',exitCode=code,finishedAt=stamp())
 (out/'commands.json').write_bytes((json.dumps(commands,indent=2)+'\n').encode())
 print(json.dumps({'job':name,'exitCode':code}),flush=True)
 return code
def b1(name,span,mode='--run'):
 return [base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json','--out',out/name,'--range',span,mode]
def journey(name,*flags):
 return [base/'isolated-integration.mjs',out/name,'COD','--provider-run','--candidate-handoff',*flags]
jobs=[('diagnostic',[base/'advice-diagnostic.mjs',base/'opening-advice-preparation-20261022/diagnostic-inputs.json',out/'diagnostic']),
 ('b1-1',b1('b1-1','1:1')),('b1-9',b1('b1-9','9:9')),('b1-15',b1('b1-15','15:15')),
 ('stateful',journey('stateful')),('openings',journey('openings','--journey-openings')),('negotiation',journey('negotiation','--negotiation-probe')),
 ('b1-2-8',b1('b1-2-8','2:8')),('b1-10-14',b1('b1-10-14','10:14')),('b1-16-24',b1('b1-16-24','16:24'))]
for name,args in [('preflight-b1',b1('preflight-b1','1:24','--preflight'))]+[('preflight-'+n,a+['--provider-preflight']) for n,a in jobs if n in ['stateful','openings','negotiation']]:
 if execute(name,args):raise SystemExit('PREFLIGHT_FAILED_NO_GENERATION')
for name,args in jobs:
 if execute(name,args):raise SystemExit('JOB_FAILED_REVIEW_RECORDED_EVIDENCE_NO_RETRY')
 # A known exhausted quota is not cured by spending more registered attempts.
 if any('usage_limit_reached' in p.read_text(encoding='utf-8') for p in (out/name).glob('*requests.jsonl')):
  raise SystemExit('BLOCKED_QUOTA_REMAINING_NOT_RUN')
clean()
print(json.dumps({'status':'ALL_JOBS_COMPLETE','nativeOutcomes':39,'diagnosticOutcomes':4}),flush=True)
