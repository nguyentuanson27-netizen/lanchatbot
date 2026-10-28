import os,subprocess,sys,json,hashlib
from pathlib import Path
root=Path(__file__).parent
repo=root/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
out=root/'c3-b-silent-fallback-model-20261028-auth-refresh'
env=os.environ.copy();env['APPDATA']=str(root/'c3-eval-runtime-01592')
phase=sys.argv[1];assert phase in ['controls','native']
assert not subprocess.check_output(['git','status','--porcelain'],cwd=repo,text=True).strip(),'DIRTY_SOURCE'
source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
assert source=='dc69f712fa85ef318ff3f58bf7e26c8d28368aee','RUN_SOURCE_CHANGED'
identity=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{inspectCodex}from'./apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs';console.log(JSON.stringify(inspectCodex()));"],cwd=repo,env=env,text=True))
assert identity['version']=='codex-cli 0.159.2' and identity['binarySha256']=='52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a'
result=subprocess.run([sys.executable,str(root/'c3-b-silent-fallback-dispatch-20261028.py'),str(out),phase],cwd=repo,env=env,creationflags=subprocess.CREATE_NO_WINDOW)
if out.exists():
 (out/'CLI_IDENTITY.json').write_text(json.dumps(identity,indent=2),encoding='utf-8')
 if not (out/'RUN_CONTEXT.json').exists():
  files=['apps/worker/dist/single-agent-commerce-ingress.js','apps/worker/dist/single-agent-commerce-read-only.js','apps/worker/dist/single-agent-commerce-handoff.js','apps/worker/dist/single-agent-commerce-session.js']
  (out/'RUN_CONTEXT.json').write_text(json.dumps({'sourceSha':source,'sourceClean':True,'reviewedExecutableSourceSha':'24a2ed1bf775592f20da8ea260d43c64e4e589fd','native51Scope':{'persistedCapture':30,'eligibilityOnly':21},'distHashes':{f:hashlib.sha256((repo/f).read_bytes()).hexdigest() for f in files},'cli':identity,'repeatPolicy':'N1_NO_RETRY_ALL_51_PLUS_17_CONTROLS','sendEnabled':False,'liveSends':0,'sourceStoreWrites':0,'POSFailureClassification':'THREE_CONTROLLED_FAULTS_NOT_LIVE_DATA_GAP','fallbackDelivery':{'persisted':'SILENT_HANDOFF_OR_NO_SEND','standaloneB1':'NO_SEND_IF_REJECTED_NO_HANDOFF_ADAPTER'}},indent=2),encoding='utf-8')
sys.exit(result.returncode)
