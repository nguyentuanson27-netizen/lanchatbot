"""Run the twelve frozen control/candidate captured-world samples once; no retries or automatic continuation."""
from pathlib import Path
import hashlib,json,os,subprocess,sys
base=Path(__file__).parent
reg=json.loads((base/'TARGETED_REGISTRATION.json').read_text(encoding='utf-8'))
launcher,output=(Path(a).resolve() for a in sys.argv[1:3])
assert hashlib.sha256(launcher.read_bytes()).hexdigest()==reg['launcherHash']
assert hashlib.sha256((base/'targeted-input.json').read_bytes()).hexdigest()==reg['inputSha256']
for name,key in [('owner-descriptions.json','descriptionMapSha256'),('DESCRIPTION_SOURCE_REVIEW.json','sourceReviewSha256'),('REVIEW_ANCHORS.json','reviewAnchorsSha256')]:
 assert hashlib.sha256((base/name).read_bytes()).hexdigest()==reg[key]
assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
output.mkdir(exist_ok=False)
(output/'RUN_SOURCE.json').write_text(json.dumps({'candidateRunSourceSha':source,'registeredSlots':12,'maximumGenerationRequests':24,'sendEnabled':False},indent=2)+'\n',encoding='utf-8')
commands=[]
for name,args in [('stateful-preflight',['apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs','unused','COD','--provider-preflight']),('targeted',['apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.mjs',str(base/'targeted-input.json'),str(output/'targeted')])]:
 command=[sys.executable,str(launcher),'node',*args]
 with (output/(name+'.log')).open('xb') as log:
  result=subprocess.run(command,env=dict(os.environ,C3_DIVISION_REPO=str(Path.cwd())),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 commands.append({'name':name,'command':command,'exitCode':result.returncode})
 (output/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
 assert result.returncode==0,name+'_EXECUTABLE_FAILURE'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==source
print(json.dumps({'runSourceSha':source,'registeredSlots':12,'out':str(output)}))
