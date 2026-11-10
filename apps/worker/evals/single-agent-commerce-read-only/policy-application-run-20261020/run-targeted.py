"""Run the eight frozen policy samples once through the existing replay entrypoint."""
from pathlib import Path
import hashlib,json,os,subprocess,sys
base=Path(__file__).parent
reg=json.loads((base/'REGISTRATION.json').read_text(encoding='utf-8'))
launcher,output=(Path(x).resolve() for x in sys.argv[1:3])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(launcher)==reg['launcherHash']
assert sha(base/'targeted-input.json')==reg['inputSha256']
manifest=json.loads((base.parent/'manifest.json').read_text(encoding='utf-8'))
assert manifest['models']==reg['models'] and manifest['promptHashes']==reg['promptHashes']
assert len(json.loads((base/'targeted-input.json').read_text(encoding='utf-8')))==8
assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
output.mkdir(exist_ok=False)
(output/'RUN_SOURCE.json').write_text(json.dumps({'runSourceSha':source,'registeredSlots':8,'maximumGenerationRequests':16,'sendEnabled':False},indent=2)+'\n',encoding='utf-8')
commands=[]
for name,args in [('provider-preflight',[base.parent/'isolated-integration.mjs','unused','COD','--provider-preflight']),
                  ('targeted',[base.parent/'advice-diagnostic.mjs',base/'targeted-input.json',output/'targeted'])]:
    command=[sys.executable,str(launcher),'node',*map(str,args)]
    with (output/(name+'.log')).open('xb') as log:
        code=subprocess.run(command,env=dict(os.environ,C3_DIVISION_REPO=str(Path.cwd())),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
    commands.append({'name':name,'command':command,'exitCode':code})
    (output/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
    assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==source,'SOURCE_CHANGED'
    assert code==0,name+'_EXECUTABLE_FAILURE'
print(json.dumps({'runSourceSha':source,'registeredSlots':8,'out':str(output)}))
