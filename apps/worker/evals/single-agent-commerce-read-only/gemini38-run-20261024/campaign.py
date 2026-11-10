from pathlib import Path
import subprocess,json,sys
repo=Path.cwd();b=repo/'apps/worker/evals/single-agent-commerce-read-only';out=repo.parent/'c3-b-gemini38-run-20261024'
commands=[]
def run(name,cmd):
 with (out/(name+'.log')).open('xb') as log:r=subprocess.run(list(map(str,cmd)),cwd=repo,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 commands.append({'name':name,'command':list(map(str,cmd)),'exitCode':r.returncode});(out/'COMMANDS.json').write_text(json.dumps(commands,indent=2))
 print(name,r.returncode,flush=True)
 if r.returncode:sys.exit(r.returncode)
run('source-capture',[sys.executable,b/'source-session.py','node',b/'feedback-source-capture.mjs',out/'source'])
run('controls-preflight',['node',b/'feedback-controls-20261023.mjs',out/'preflight','--capture',out/'source/capture.json','--preflight'])
run('controls',['node',b/'feedback-controls-20261023.mjs',out/'controls','--capture',out/'source/capture.json','--prepared',out/'preflight/prepared.json'])
run('native-first',[sys.executable,b/'feedback-native-run.py',out/'native','first',out/'controls'])
