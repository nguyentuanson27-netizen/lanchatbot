from pathlib import Path
import hashlib,json,os,subprocess,sys
repo=Path.cwd();base=repo/'apps/worker/evals/single-agent-commerce-read-only';out=repo.parent/'c3-b-contract-advice-20261022'
r=json.loads((out/'REGISTRATION.json').read_text());commands=[]
launcher=base/'model-code-division-run-20261019/raw/credential-launcher.py'
jobs=[
 ('openings',[base/'isolated-integration.mjs',out/'openings','COD','--provider-run','--journey-openings']),
 ('b1',[base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json','--out',out/'b1','--run']),
 ('stateful',[base/'isolated-integration.mjs',out/'stateful','COD','--provider-run']),
 ('negotiation',[base/'isolated-integration.mjs',out/'negotiation','COD','--provider-run','--negotiation-probe']),
 ('bank-control',[base/'isolated-integration.mjs',out/'bank-control','BANK_TRANSFER'])]
for name,args in jobs:
 assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==r['candidateRunSourceSha'],'SOURCE_CHANGED'
 assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip(),'DIRTY_WORKTREE'
 for f,h in r['inputAndRunnerHashes'].items():assert hashlib.sha256((base/f).read_bytes()).hexdigest()==h,'FROZEN_INPUT_CHANGED'
 command=[sys.executable,str(launcher),'node',*map(str,args)]
 commands.append({'name':name,'command':command,'status':'RUNNING'})
 (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
 with (out/(name+'.log')).open('xb') as log:
  code=subprocess.run(command,cwd=repo,env=dict(os.environ,C3_DIVISION_REPO=str(repo)),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
 commands[-1].update(status='FINISHED',exitCode=code)
 (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
print(json.dumps({'source':r['candidateRunSourceSha'],'jobs':[{'name':c['name'],'exitCode':c['exitCode']} for c in commands]}))
