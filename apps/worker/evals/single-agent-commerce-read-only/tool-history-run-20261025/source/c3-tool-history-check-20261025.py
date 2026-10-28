from pathlib import Path
import json, subprocess, sys, time
repo=Path(__file__).parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
out=repo.parent/'c3-tool-history-checks-20261025'
out.mkdir(exist_ok=True)
name=sys.argv[1]
log=out/(name+'.log')
assert not log.exists(), 'UNIQUE_CHECK_NAME_REQUIRED'
start=time.time()
with log.open('xb') as f:
    result=subprocess.run(sys.argv[2:],cwd=repo,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
entry={'command':sys.argv[2:],'exitCode':result.returncode,'elapsedSeconds':time.time()-start}
(out/(name+'.json')).write_text(json.dumps(entry,indent=2),encoding='utf-8')
print(json.dumps({'name':name,**entry}))
print(log.read_text(encoding='utf-8',errors='replace')[-2600:])
sys.exit(result.returncode)
