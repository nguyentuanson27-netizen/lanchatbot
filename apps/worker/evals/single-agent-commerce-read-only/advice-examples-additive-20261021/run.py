"""Twelve registered native B1 turns. Reuses source launcher and run.mjs."""
from pathlib import Path
import hashlib,json,os,subprocess,sys

base=Path(__file__).resolve().parent
ev=base.parent
reg=json.loads((base/'REGISTRATION.json').read_text(encoding='utf-8'))
launcher,output=(Path(x).resolve() for x in sys.argv[1:3])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(launcher)==reg['launcherHash']
for filename,digest in reg['frozenFiles'].items():
    assert sha(ev/filename)==digest,filename
assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip(),'DIRTY_SOURCE'
source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
output.mkdir(exist_ok=False)
(output/'RUN_SOURCE.json').write_text(json.dumps({'runSourceSha':source,'registered':reg['registered'],'maximumGenerationRequests':reg['maximumGenerationRequests'],'sendEnabled':False},indent=2)+'\n',encoding='utf-8')
commands=[]

def run(name,args):
    command=[sys.executable,str(launcher),'node',*map(str,args)]
    with (output/(name+'.log')).open('xb') as log:
        code=subprocess.run(command,env=dict(os.environ,C3_DIVISION_REPO=str(Path.cwd())),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
    commands.append({'name':name,'command':command,'exitCode':code})
    (output/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
    assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==source,'SOURCE_CHANGED'
    return code

assert run('provider-preflight',[ev/'isolated-integration.mjs','unused','COD','--provider-preflight'])==0,'PROVIDER_PREFLIGHT_UNAVAILABLE'
assert run('source-check',[ev/'run.mjs','--config',ev/'source-config.b1.json','--cases',ev/'cases.b1.json','--out',output/'source-check','--source-check'])==0,'SOURCE_UNAVAILABLE'
for slot in reg['slots']:
    run(slot['id'],[ev/'run.mjs','--config',ev/'source-config.b1.json','--cases',ev/'cases.b1.json',
        '--owner-registration',base/(slot['arm']+'.json'),'--range',f"{slot['caseSlot']}:{slot['caseSlot']}",
        '--out',output/slot['id'],'--run'])
print(json.dumps({'runSourceSha':source,'registered':reg['registered'],'commands':[{k:c[k] for k in ['name','exitCode']} for c in commands],'output':str(output)}))
