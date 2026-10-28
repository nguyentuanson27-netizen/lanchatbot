from pathlib import Path
import subprocess,os,sys,json,hashlib
repo=Path.cwd();out=Path(__file__).resolve().parent;b=repo/'apps/worker/evals/single-agent-commerce-read-only'
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=['chart-resolution-audit-20261023.mjs','feedback-controls-20261023.mjs','advice-visual-diagnostic.mjs','manifest.json','prompts/owner.vi.txt','prompts/verifier.vi.txt','isolated-integration.mjs','gemini-inference.mjs']
reg={'sourceSha':head,'models':json.loads((b/'manifest.json').read_text())['models'],'hashes':{f:sha(b/f) for f in files},'registeredControls':17,'labeledControls':16,'probe':1,'registeredVisualOutcomes':4,'maximumGenerationRequests':25,'retry':0,'sendEnabled':False}
(out/'REGISTRATION.json').write_text(json.dumps(reg,indent=2))
commands=[]
def job(name,args,credential=True,extra=None):
 assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==head
 assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
 assert all(sha(b/f)==v for f,v in reg['hashes'].items())
 cmd=([sys.executable,str(b/'model-code-division-run-20261019/raw/credential-launcher.py'),'node'] if credential else ['node'])+list(map(str,args))
 env=dict(os.environ,C3_DIVISION_REPO=str(repo));env.update(extra or {})
 with (out/(name+'.txt')).open('xb') as log:code=subprocess.run(cmd,cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
 commands.append({'command':cmd,'extraEnv':extra or {},'exitCode':code});(out/'commands.json').write_text(json.dumps(commands,indent=2));print(name,code,flush=True)
 return code
assert job('chart-audit',[b/'chart-resolution-audit-20261023.mjs',out/'CHART_RESOLUTION_AUDIT.json'])==0,'CHART_AUDIT_STOP'
assert job('integration',[b/'isolated-integration.mjs',out/'integration','COD','--candidate-handoff','--composed-only'])==0,'INTEGRATION_STOP'
assert job('controls-preflight',[b/'feedback-controls-20261023.mjs',out/'controls-preflight','--preflight'],False)==0,'CONTROLS_PREFLIGHT_STOP'
visualReady=job('visual-preflight',[b/'advice-visual-diagnostic.mjs',out/'visual-preflight','--preflight'],False)==0
code=job('controls',[b/'feedback-controls-20261023.mjs',out/'controls'])
summary=json.loads((out/'controls/summary.json').read_text()) if (out/'controls/summary.json').exists() else {'controlsPass':False}
if code or not summary['controlsPass']:
 (out/'VISUAL_NOT_RUN.json').write_text(json.dumps({'reason':'CONTROLS_DID_NOT_PASS','registeredOutcomes':4,'providerRequests':0}));print('STOP_CONTROLS',flush=True);sys.exit(0)
if not visualReady:
 (out/'VISUAL_NOT_RUN.json').write_text(json.dumps({'reason':'VISUAL_PREFLIGHT_BLOCKED','registeredOutcomes':4,'providerRequests':0}));print('STOP_VISUAL_PREFLIGHT',flush=True);sys.exit(0)
job('visual',[b/'advice-visual-diagnostic.mjs',out/'visual'],True,{'C3_VISUAL_PREFLIGHT':str(out/'visual-preflight/preflight.json')})
print('COMPLETE',flush=True)
