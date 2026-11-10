from pathlib import Path
import hashlib, json, shutil, subprocess
repo=Path('C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005')
parent=repo.parent
run=parent/'c3-acceptance-complete-20261024'
dest=repo/'apps/worker/evals/single-agent-commerce-read-only/media-size-acceptance-20261024'
assert dest.resolve().is_relative_to(repo.resolve()) and not dest.exists()
status=json.loads((run/'DISPATCH_STATUS.json').read_text())
assert status['status']=='COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW' and status['sourceUnchanged']
source=status['sourceSha'];assert source==subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
assert not subprocess.check_output(['git','status','--porcelain'],cwd=repo,text=True).strip()
dest.mkdir()
analysis={'METRICS.json','LABEL_FIREWALL_AUDIT.json','PRIMARY_REVIEW.json','PREFIX_PRIMARY_REVIEW.json','PREFIX_REVIEW.json',
 'PREFIX_DIAGNOSTICS.json','SNAPSHOT_DIAGNOSTICS.json','SNAPSHOT_DIAGNOSTICS_ALIGNED.json','TOOL_DIAGNOSTICS.json'}
(dest/'raw').mkdir()
for p in run.iterdir():
 if p.name in analysis: shutil.copy2(p,dest/p.name)
 elif p.is_dir(): shutil.copytree(p,dest/'raw'/p.name)
 else: shutil.copy2(p,dest/'raw'/p.name)
(dest/'checks').mkdir()
for name in ['c3-acceptance-cod-20261024','c3-acceptance-bank-20261024','c3-acceptance-cod-final-20261024','c3-acceptance-bank-final-20261024',
 'c3-acceptance-cod-complete-20261024','c3-acceptance-bank-complete-20261024']:
 shutil.copytree(parent/name,dest/'checks'/name)
 shutil.copy2(parent/(name+'.log'),dest/'checks'/(name+'.log'))
for name in ['c3-acceptance-final-worker-build-20261024.log','c3-acceptance-complete-worker-tests-20261024.log',
 'c3-acceptance-complete-node-tests-20261024.log','c3-acceptance-complete-worker-build-20261024.log',
 'c3-acceptance-complete-worker-lint-20261024.log','c3-acceptance-complete-worker-typecheck-20261024.log']:
 shutil.copy2(parent/name,dest/'checks'/name)
(dest/'source').mkdir()
for name in ['c3-acceptance-source-20261024','c3-acceptance-model-source-20261024','c3-acceptance-model-source-final-20261024',
 'c3-acceptance-model-source-complete-20261024','c3-acceptance-model-20261024','c3-acceptance-complete-controls-dry-20261024']:
 shutil.copytree(parent/name,dest/'source'/name)
for name in ['c3-acceptance-chart-audit-20261024.json','c3-acceptance-chart-audit-20261024.mjs','c3-acceptance-dispatch-20261024.py',
 'c3-acceptance-prefix-review-20261024.py','c3-acceptance-prefix-diagnostics-20261024.py','c3-acceptance-snapshot-diagnostics-20261024.mjs',
 'c3-acceptance-tool-diagnostics-20261024.py','c3-acceptance-whole-review-20261024.py','c3-acceptance-metrics-20261024.py',
 'c3-acceptance-firewall-20261024.mjs']:
 shutil.copy2(parent/name,dest/'source'/name)
original=(parent/'c3-acceptance-dispatch-20261024.py').read_bytes()
reg=json.loads((run/'REGISTRATION.json').read_text());assert hashlib.sha256(original).hexdigest()==reg['driverHash']
failed=json.loads((parent/'c3-acceptance-model-20261024/REGISTRATION.json').read_text())
restored=original.replace(b"'c3-acceptance-complete-20261024'",b"'c3-acceptance-model-20261024'")
restored=restored.replace(b'c3-acceptance-model-source-complete-20261024/capture.json',b'c3-acceptance-model-source-final-20261024/capture.json')
restored=restored.replace(b"'-complete-20261024/integration.json'",b"'-final-20261024/integration.json'")
if hashlib.sha256(restored).hexdigest()==failed['driverHash']:
 (dest/'source'/'failed-preflight-dispatch-driver.py').write_bytes(restored)
else:
 (dest/'source'/'FAILED_DRIVER_UNKNOWN.json').write_text(json.dumps({'actualSourceDriverHash':failed['driverHash'],'note':'Failed zero-generation driver exact bytes not reconstructed; retained commands/registration/source capture remain authoritative.'},indent=2))
base=repo/'apps/worker/evals/single-agent-commerce-read-only'
frozen=dest/'frozen-inputs';frozen.mkdir()
for name,expected in reg['hashes'].items():
 target=frozen/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(base/name,target)
 assert hashlib.sha256(target.read_bytes()).hexdigest()==expected
for name in ['docs/specs/c3-single-agent-commerce-architecture-20261004.md','docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md',
 'docs/specs/c3-phase-b-media-binding-handoff-plan-20261024.md','docs/specs/c3-phase-b-same-name-size-sharing-20261024.md']:
 shutil.copy2(repo/name,frozen/Path(name).name)
(dest/'.gitattributes').write_text('raw/** -text\nchecks/** -text\nsource/** -text\nfrozen-inputs/** -text\n*.log whitespace=cr-at-eol\nraw/**/*.log whitespace=cr-at-eol\nchecks/**/*.log whitespace=cr-at-eol\nsource/**/*.log whitespace=cr-at-eol\n')
hashes={str(p.relative_to(dest)).replace('\\','/'):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
 for folder in ['raw','checks','source','frozen-inputs'] for p in sorted((dest/folder).rglob('*')) if p.is_file()}
(dest/'RAW_HASHES.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'path':str(dest),'sourceSha':source,'hashedFiles':len(hashes),'bytes':sum(v['bytes'] for v in hashes.values())}))
