"""Run all existing B1 and B2/B3 populations once, using the existing entrypoints."""
from pathlib import Path
import hashlib,json,os,subprocess,sys

base=Path(__file__).parent
eval_base=base.parent
reg=json.loads((base/'REGISTRATION.json').read_text(encoding='utf-8'))
launcher,output=(Path(x).resolve() for x in sys.argv[1:3])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(launcher)==reg['launcherHash']
for filename,key in [('cases.b1.json','inputHash'),('stateful-cases.json','statefulCorpusHash'),('source-config.b1.json','sourceConfigHash')]:
    assert sha(eval_base/filename)==reg[key]
manifest=json.loads((eval_base/'manifest.json').read_text(encoding='utf-8'))
assert manifest['models']==reg['models'] and manifest['promptHashes']==reg['promptHashes']
assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
output.mkdir(exist_ok=False)
(output/'RUN_SOURCE.json').write_text(json.dumps({'candidateRunSourceSha':source,'registeredSlots':32,'maximumGenerationRequests':124,'sendEnabled':False},indent=2)+'\n',encoding='utf-8')
commands=[]

def run(name,args):
    command=[sys.executable,str(launcher),'node',*map(str,args)]
    with (output/(name+'.log')).open('xb') as log:
        code=subprocess.run(command,env=dict(os.environ,C3_DIVISION_REPO=str(Path.cwd())),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
    commands.append({'name':name,'command':command,'exitCode':code})
    (output/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
    assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==source,'SOURCE_CHANGED'
    return code

assert run('provider-preflight',[eval_base/'isolated-integration.mjs','unused','COD','--provider-preflight'])==0,'PROVIDER_PREFLIGHT_UNAVAILABLE'
assert run('source-check',[eval_base/'run.mjs','--config',eval_base/'source-config.b1.json','--cases',eval_base/'cases.b1.json','--out',output/'source-check','--source-check'])==0,'SOURCE_UNAVAILABLE'
run('deterministic-cod',[eval_base/'isolated-integration.mjs',output/'deterministic-cod','COD'])
run('deterministic-bank',[eval_base/'isolated-integration.mjs',output/'deterministic-bank','BANK_TRANSFER'])
run('stateful-1',[eval_base/'isolated-integration.mjs',output/'stateful-1','COD','--provider-run'])
run('b1-1',[eval_base/'run.mjs','--config',eval_base/'source-config.b1.json','--cases',eval_base/'cases.b1.json','--out',output/'b1-1','--run'])
print(json.dumps({'runSourceSha':source,'commands':[{k:x[k] for k in ['name','exitCode']} for x in commands],'out':str(output)}))
