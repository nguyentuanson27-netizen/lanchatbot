from pathlib import Path
import hashlib,json,re,subprocess,sys
repo=Path(__file__).parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
artifact=repo/'apps/worker/evals/single-agent-commerce-read-only/turn-completion-run-20261024'
rel=artifact.relative_to(repo).as_posix()
if '--prepare' in sys.argv:
 import shutil
 shutil.copyfile(Path(__file__),artifact/'source/scripts'/Path(__file__).name)
 hashes={str(p.relative_to(artifact)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for d in ['raw','checks','source','frozen-inputs'] for p in (artifact/d).rglob('*') if p.is_file()}
 (artifact/'RAW_HASHES.json').write_text(json.dumps({'sourceSha':'235d570a90f792a096e37d4094e6feaf3c7eee95','files':hashes},indent=2),encoding='utf-8')
 print('prepared');sys.exit(0)
def git(*args):return subprocess.check_output(['git',*args],cwd=repo)
assert git('rev-parse','HEAD').decode().strip()=='235d570a90f792a096e37d4094e6feaf3c7eee95'
stage=git('diff','--cached','--name-only','-z').decode().split('\0');stage=[p for p in stage if p]
assert all(p.startswith(rel+'/') or p in ['tasks/plan.md','tasks/todo.md','docs/specs/c3-phase-b-turn-completion-plan-20261024.md'] for p in stage)
hashes=json.loads((artifact/'RAW_HASHES.json').read_text())['files']
for p,v in hashes.items():
 data=(artifact/p).read_bytes(); assert hashlib.sha256(data).hexdigest()==v['sha256'] and len(data)==v['bytes'],p
 data=git('show',':'+rel+'/'+p.replace('\\','/')); assert hashlib.sha256(data).hexdigest()==v['sha256'],'STAGED_HASH_MISMATCH:'+p
primary=git('show',':'+rel+'/PRIMARY_REVIEW.json')
assert hashlib.sha256(primary).hexdigest()=='a0e6fab22a337a61aaf563e51f41a6692bf10c5ea07aa92144675cd0b3165672'
reg=json.loads((artifact/'REGISTRATION.json').read_text());base='apps/worker/evals/single-agent-commerce-read-only/'
checkout_transforms=[]
for p,sha in reg['hashes'].items():
 source=git('show',reg['sourceSha']+':'+base+p)
 frozen=(artifact/'frozen-inputs'/p).read_bytes()
 assert hashlib.sha256(frozen).hexdigest()==sha,p
 assert (repo/base/p).read_bytes()==frozen,p
 assert git('show',':'+base+p)==source,p
 assert source.replace(b'\r\n',b'\n')==frozen.replace(b'\r\n',b'\n'),p
 if source!=frozen:checkout_transforms.append({'file':p,'gitBlobSha256':hashlib.sha256(source).hexdigest(),'runtimeFrozenSha256':sha,'difference':'LF_CRLF_ONLY'})
patterns=[rb'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----',rb'ya29\.[A-Za-z0-9_-]{20,}',rb'Bearer [A-Za-z0-9._-]{24,}',rb'sk-[A-Za-z0-9]{24,}',rb'"private_key"\s*:\s*"-----BEGIN',rb'"(?:access_token|refresh_token|client_secret)"\s*:\s*"[A-Za-z0-9._/-]{24,}"']
for path in stage:
 data=git('show',':'+path)
 assert not any(re.search(p,data) for p in patterns),'SECRET_PATTERN:'+path
subprocess.run(['git','diff','--cached','--check'],cwd=repo,check=True)
# Check report-local markdown links, without interpreting examples or remote links.
for name in ['CHECKPOINT_B.md','COMPARISON.md','CONVERSATIONS.md']:
 for target in re.findall(r'\]\(([^)]+)\)',(artifact/name).read_text(encoding='utf-8')):
  if not target.startswith(('http:','https:','#')):assert (artifact/target).exists(),target
out={'status':'PASS','bRunSourceSha':reg['sourceSha'],'rawAndFrozenFilesChecked':len(hashes),'stagedFilesScanned':len(stage),'secretPatternHits':0,'primaryReviewHashPreserved':True,'frozenRuntimeBytesMatchRegistration':True,'unchangedGitSourceComparedWithFrozenAfterLineEndingNormalization':True,'gitCheckoutLineEndingTransforms':checkout_transforms,'stagedRawByteParity':True,'cachedDiffCheck':'PASS','reportLocalLinks':'PASS','priorValidationFailures':['First archive staging normalized top-level PRIMARY_REVIEW CRLF to LF. Added scoped JSON -text attributes and restaged with --renormalize; original raw and primary runtime bytes never changed.','Initial validator incorrectly required pre-existing Windows runtime checkout bytes to equal Git blob bytes. Now records both hashes and requires LF/CRLF-only difference plus unchanged source Git blobs and exact runtime/frozen/registration parity; no corpus rewrite.'],'command':['python','c3-turn-completion-validate-20261024.py']}
(artifact/'REPORT_VALIDATION.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps(out))
