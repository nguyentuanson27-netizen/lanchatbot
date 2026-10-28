"""Registered existing46 once: focused21 then remaining25 after manual gate."""
from pathlib import Path
import json,os,subprocess,sys,hashlib
repo=Path.cwd();b=repo/'apps/worker/evals/single-agent-commerce-read-only'
out=Path(sys.argv[1]).resolve();phase=sys.argv[2];assert phase in ['first','rest'];out.mkdir(exist_ok=True)
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
first=[3,4,5,7,8,9,11,15,17,23]
cases=json.loads((b/'cases.b1.json').read_text(encoding='utf-8-sig'))
registration={'sourceSha':head,'nativeOutcomes':46,'first':21,'rest':25,'maximumGenerationRequests':180,'repetitions':1,'retry':0,
 'caseHash':hashlib.sha256((b/'cases.b1.json').read_bytes()).hexdigest(),'b1First':[cases[i-1]['caseId'] for i in first],
 'b1Rest':[r['caseId'] for i,r in enumerate(cases,1) if i not in first]}
reg=out/'REGISTRATION.json'
if reg.exists():assert json.loads(reg.read_text())==registration
else:reg.write_text(json.dumps(registration,indent=2))
if phase=='rest':
 gate=json.loads((out/'PREFIX_REVIEW.json').read_text());assert gate['allowRest'] and gate['sourceSha']==head
jobs=[]
def b1(lo,hi):jobs.append(('b1-'+str(lo)+'-'+str(hi),[b/'run.mjs','--config',b/'source-config.b1.json','--cases',b/'cases.b1.json','--range',f'{lo}:{hi}']))
def journey(name,*flags):jobs.append((name,[b/'isolated-integration.mjs',None,'COD','--provider-run','--candidate-handoff',*flags]))
if phase=='first':
 for i in first:b1(i,i)
 journey('openings','--journey-openings');journey('media','--media-followup')
else:
 for lo,hi in [(1,2),(6,6),(10,10),(12,14),(16,16),(18,22),(24,24)]:b1(lo,hi)
 journey('stateful');journey('negotiation','--negotiation-probe')
commands=[]
for name,args in jobs:
 assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==head
 assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
 isb1=name.startswith('b1-')
 for preflight in [True,False]:
  label=('preflight-' if preflight else '')+name;dest=out/label;assert not dest.exists(),'NO_REPEAT'
  argv=args+['--out',dest,'--preflight' if preflight else '--run'] if isb1 else [args[0],dest,*args[2:]]+(['--provider-preflight'] if preflight else [])
  cmd=[sys.executable,str(b/'model-code-division-run-20261019/raw/credential-launcher.py'),'node',*map(str,argv)]
  with (out/(label+'.log')).open('xb') as log:
   code=subprocess.run(cmd,cwd=repo,env=dict(os.environ,C3_DIVISION_REPO=str(repo)),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
  commands.append({'job':label,'command':cmd,'exitCode':code});(out/(phase+'-commands.json')).write_text(json.dumps(commands,indent=2))
  print(label,code,flush=True)
  assert code==0,'JOB_FAILED_RETAIN_EVIDENCE_NO_RETRY'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==head
