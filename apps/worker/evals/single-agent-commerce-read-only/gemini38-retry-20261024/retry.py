from pathlib import Path
import subprocess,json,sys
repo=Path.cwd();b=repo/'apps/worker/evals/single-agent-commerce-read-only';out=repo.parent/'c3-b-gemini38-retry-20261024';commands=[]
for preflight in [True,False]:
 name='preflight' if preflight else 'run'
 cmd=[sys.executable,str(b/'model-code-division-run-20261019/raw/credential-launcher.py'),'node',str(b/'run.mjs'),'--config',str(b/'source-config.b1.json'),'--cases',str(b/'cases.b1.json'),'--range','4:4','--out',str(out/name),'--preflight' if preflight else '--run']
 with (out/(name+'.log')).open('xb') as log:r=subprocess.run(cmd,cwd=repo,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 commands.append({'command':cmd,'exitCode':r.returncode});(out/'COMMANDS.json').write_text(json.dumps(commands,indent=2));print(name,r.returncode,flush=True)
 if r.returncode:sys.exit(r.returncode)
