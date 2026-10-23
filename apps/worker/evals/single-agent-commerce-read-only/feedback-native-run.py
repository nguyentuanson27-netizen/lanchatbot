"""Existing46 once, with source/config-bound controls and whole-prefix gates. No retry."""
from pathlib import Path
import json, os, subprocess, sys
sys.dont_write_bytecode = True
repo = Path.cwd()
base = repo / 'apps/worker/evals/single-agent-commerce-read-only'
out, phase, controls = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3]).resolve()
assert phase in ['first', 'rest']
out.mkdir(exist_ok=True)
gate = base / 'feedback-native-gates.mjs'
# Fetch current identity and validate all controls, without constructing provider clients.
bootstrap = "import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './apps/worker/evals/single-agent-commerce-read-only/feedback-run-identity.mjs'; import {requirePassingControls} from './apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.mjs'; const identity=readFeedbackRunIdentity();assertCleanFeedbackSource(identity);console.log(JSON.stringify({identity,controlsHash:requirePassingControls(process.argv[1],identity)}));"
ready = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', bootstrap, str(controls)], text=True))
first = [3,4,5,7,8,9,11,15,17,23]
cases = json.loads((base / 'cases.b1.json').read_text(encoding='utf-8-sig'))
registration = {**ready, 'nativeOutcomes':46, 'first':21, 'rest':25, 'maximumGenerationRequests':180, 'repetitions':1, 'retry':0,
 'b1First':[cases[i-1]['caseId'] for i in first], 'b1Rest':[c['caseId'] for i,c in enumerate(cases,1) if i not in first]}
reg = out / 'REGISTRATION.json'
if reg.exists(): assert json.loads(reg.read_text()) == registration
else:
 assert phase == 'first', 'FIRST_REGISTRATION_REQUIRED'
 with reg.open('x') as f: json.dump(registration,f,indent=2)
subprocess.run(['node',str(gate),str(controls),str(out),phase],check=True)
jobs=[]
def b1(lo,hi): jobs.append(('b1-'+str(lo)+'-'+str(hi),[base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json','--range',f'{lo}:{hi}']))
def journey(name,*flags): jobs.append((name,[base/'isolated-integration.mjs',None,'COD','--provider-run','--candidate-handoff',*flags]))
if phase == 'first':
 for i in first: b1(i,i)
 journey('openings','--journey-openings'); journey('media','--media-followup')
else:
 for lo,hi in [(1,2),(6,6),(10,10),(12,14),(16,16),(18,22),(24,24)]: b1(lo,hi)
 journey('stateful'); journey('negotiation','--negotiation-probe')
commands=[]
for name,args in jobs:
 subprocess.run(['node',str(gate),str(controls),str(out),phase],check=True,stdout=subprocess.DEVNULL)
 for preflight in [True,False]:
  label=('preflight-' if preflight else '')+name; dest=out/label; assert not dest.exists(),'NO_REPEAT'
  argv=args+['--out',dest,'--preflight' if preflight else '--run'] if name.startswith('b1-') else [args[0],dest,*args[2:]]+(['--provider-preflight'] if preflight else [])
  cmd=[sys.executable,str(base/'model-code-division-run-20261019/raw/credential-launcher.py'),'node',*map(str,argv)]
  with (out/(label+'.log')).open('xb') as log:
   code=subprocess.run(cmd,cwd=repo,env=dict(os.environ,C3_DIVISION_REPO=str(repo)),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
  commands.append({'job':label,'command':cmd,'exitCode':code})
  (out/(phase+'-commands.json')).write_text(json.dumps(commands,indent=2))
  assert code == 0,'JOB_FAILED_RETAIN_EVIDENCE_NO_RETRY'
  if not preflight:
   artifacts=list(dest.glob('attempt-*.json'))+list(dest.glob('provider-attempt-*.json'))
   assert artifacts,'MISSING_ACTUAL_OUTCOMES'
   for file in artifacts:
    a=json.loads(file.read_text());result=a['result']
    assert not a.get('errorCode') and not result.get('errorCode') and not result.get('errorType') and a.get('status')!='BLOCKED','ATTEMPT_ERROR'
    assert all(g['status']=='OK' for g in result.get('generations',[])),'PROVIDER_ERROR_NO_RETRY'
   if not name.startswith('b1-'): assert json.loads((dest/'integration.json').read_text())['testDatabaseDropped'] is True
