from pathlib import Path
import hashlib,json,os,subprocess,sys,datetime
repo=Path.cwd();base=repo/'apps/worker/evals/single-agent-commerce-read-only';out=Path(__file__).resolve().parent
r=json.loads((out/'REGISTRATION.json').read_text(encoding='utf-8'));commands=[]
launcher=base/'model-code-division-run-20261019/raw/credential-launcher.py'
jobs=[
 ('b1-head',[base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json','--out',out/'b1-head','--range','1:1','--run']),
 ('b1-tail',[base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json','--out',out/'b1-tail','--range','11:24','--run']),
 ('openings',[base/'isolated-integration.mjs',out/'openings','COD','--provider-run','--journey-openings','--opening-only']),
 ('stateful',[base/'isolated-integration.mjs',out/'stateful','COD','--provider-run','--through-case','stateful-correction']),
 ('negotiation',[base/'isolated-integration.mjs',out/'negotiation','COD','--provider-run','--negotiation-probe'])]
def clean():
 assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==r['runSourceSha'],'SOURCE_CHANGED'
 assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip(),'DIRTY_WORKTREE'
 for f,h in r['inputAndRunnerHashes'].items():assert hashlib.sha256((base/f).read_bytes()).hexdigest()==h,'FROZEN_INPUT_CHANGED'
def execute(name,args):
 clean();command=[sys.executable,str(launcher),'node',*map(str,args)]
 commands.append({'name':name,'command':command,'status':'RUNNING','startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
 (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
 with (out/(name+'.log')).open('xb') as log:
  code=subprocess.run(command,cwd=repo,env=dict(os.environ,C3_DIVISION_REPO=str(repo)),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
 commands[-1].update(status='FINISHED',exitCode=code,finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
 (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
 print(json.dumps({'name':name,'exitCode':code}),flush=True)
 return code
clean()
r['orchestratorHash']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
(out/'REGISTRATION.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Read-only preflight: no generation request and no disposable database yet.
for name,args in jobs:
 if name.startswith('b1'):
  if name!='b1-head':continue
  pre=args[:-1]+['--preflight']
 else:pre=args+['--provider-preflight']
 if execute('preflight-'+name,pre):raise SystemExit('PREFLIGHT_FAILED_NO_MODEL_DISPATCH')
for name,args in jobs:execute(name,args)
clean()
print(json.dumps({'status':'ALL_REGISTERED_JOBS_COMPLETED','targets':19,'prerequisites':4,'commands':len(commands)}),flush=True)
