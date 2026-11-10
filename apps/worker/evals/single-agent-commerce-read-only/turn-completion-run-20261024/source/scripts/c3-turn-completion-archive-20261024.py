from pathlib import Path
import hashlib,json,re,shutil,subprocess
root=Path(__file__).parent
repo=root/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
run=root/'c3-turn-completion-model-20261024'
artifact=repo/'apps/worker/evals/single-agent-commerce-read-only/turn-completion-run-20261024'
source=json.loads((run/'REGISTRATION.json').read_text())['sourceSha']
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()==source
assert not subprocess.check_output(['git','status','--porcelain'],cwd=repo,text=True).strip()
def copytree(src,dst):
 dst.mkdir(parents=True,exist_ok=True)
 for p in src.rglob('*'):
  assert not p.is_symlink()
  if p.is_file():
   target=dst/p.relative_to(src);target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
copytree(run,artifact/'raw')
copytree(root/'c3-turn-completion-checks-20261024',artifact/'checks')
for name in ['c3-turn-completion-source-20261024','c3-turn-completion-source-final-20261024','c3-turn-completion-source-provider-20261024','c3-turn-completion-controls-dry-20261024']:
 copytree(root/name,artifact/'source'/name)
for p in [*root.glob('c3-turn-completion-*.py'),*root.glob('c3-turn-completion-*.mjs')]:
 target=artifact/'source/scripts'/p.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
base=repo/'apps/worker/evals/single-agent-commerce-read-only'
for name in json.loads((run/'REGISTRATION.json').read_text())['hashes']:
 target=artifact/'frozen-inputs'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(base/name,target)
for name in ['AGENTS.md','docs/specs/c3-phase-b-turn-completion-plan-20261024.md','docs/specs/c3-phase-b-turn-completion-plan-review-20261024.md',
 'docs/specs/c3-phase-b-turn-completion-t0-20261024.md','docs/specs/c3-phase-b-same-name-size-sharing-20261024.md',
 'docs/specs/c3-single-agent-commerce-architecture-20261004.md','docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md']:
 target=artifact/'frozen-inputs'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(repo/name,target)
for name in ['REGISTRATION.json','METRICS.json','LABEL_FIREWALL_AUDIT.json','PRIMARY_REVIEW.json','PREFIX_REVIEW.json']:
 shutil.copyfile(run/name,artifact/name)
catalog=json.loads((base/'manifest.json').read_text())
matrix=json.loads((base/'handoff-matrix.candidate.json').read_text())
handoff=next(x for x in matrix['rules'] if x['reason']=='DEPENDENCY_FAILURE')
(artifact/'FALLBACK_CATALOG.json').write_text(json.dumps({'fallback':catalog['fallback'],'recoveryFallbacks':catalog['recoveryFallbacks'],
 'dependencyHandoff':{**handoff,'textSha256':hashlib.sha256(handoff['holdingReply'].encode()).hexdigest(),'authority':'Committed handoff event and durable group binding, current policy and delivery gate; not a verifier PASS.'}},ensure_ascii=False,indent=2),encoding='utf-8')
files={str(p.relative_to(artifact)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for folder in ['raw','checks','source','frozen-inputs'] for p in (artifact/folder).rglob('*') if p.is_file()}
(artifact/'RAW_HASHES.json').write_text(json.dumps({'sourceSha':source,'files':files},indent=2),encoding='utf-8')
checks=[dict(name=p.stem,**json.loads(p.read_text())) for p in (root/'c3-turn-completion-checks-20261024').glob('*.json') if isinstance((v:=json.loads(p.read_text())),dict) and 'command' in v]
(artifact/'VERIFICATION.json').write_text(json.dumps({'sourceSha':source,'checks':checks,
 'notes':['Includes observed RED and failed/incomplete PostgreSQL attempts; never treat them as PASS.','Runtime source bytes after public holding fix passed143focused tests/build/typecheck/lint; earlier369focused tests preceded that fix. Shared2/database46/Node94/protected21 recorded separately.','Docker local engine unavailable; isolated PostgreSQL over existing approved source session. Two network-reset orphan databases cleaned using exact recorded database+artifact identities.','No provider API change, generation retries, full A2/A3, merge, deploy or live send.']},ensure_ascii=False,indent=2),encoding='utf-8')
specs={name:{'sha256':hashlib.sha256((repo/name).read_bytes()).hexdigest(),'lastGitCommit':subprocess.check_output(['git','log','-1','--format=%H',source,'--',name],cwd=repo,text=True).strip()} for name in ['docs/specs/c3-single-agent-commerce-architecture-20261004.md','docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md']}
(artifact/'PROVENANCE.json').write_text(json.dumps({'implementationBaseSha':'8115516e33b43c68260cb9c2662073cfbd46540d','programImplementationBaseSha':'296cdcfbf5759f5bf9cbb24acf3dc63005589361',
 'bRunSourceSha':source,'specs':specs,'registration':json.loads((run/'REGISTRATION.json').read_text()),
 'sourceCleanThroughDispatch':json.loads((run/'DISPATCH_STATUS.json').read_text()).get('sourceUnchanged',False),'sourceData':'Live public sources, isolated candidate policy/chart delegation, capture-only Meta transport. Preliminary captures preserved; active alias points to fresh provider capture before first generation.'},ensure_ascii=False,indent=2),encoding='utf-8')
(artifact/'.gitattributes').write_text('/raw/** -text -whitespace\n/checks/** -text -whitespace\n/source/** -text -whitespace\n/frozen-inputs/** -text -whitespace\nCONVERSATIONS.md -whitespace\n',encoding='utf-8')
patterns=[rb'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----',rb'ya29\.[A-Za-z0-9_-]{20,}',rb'Bearer [A-Za-z0-9._-]{24,}',rb'sk-[A-Za-z0-9]{24,}']
hits=[]
for rel in files:
 data=(artifact/rel).read_bytes()
 if any(re.search(pattern,data) for pattern in patterns):hits.append(rel)
assert not hits, 'SECRET_PATTERN_HITS:'+str(hits)
print(json.dumps({'artifact':str(artifact),'hashedFiles':len(files),'secretPatternHits':len(hits),'sourceSha':source}))
