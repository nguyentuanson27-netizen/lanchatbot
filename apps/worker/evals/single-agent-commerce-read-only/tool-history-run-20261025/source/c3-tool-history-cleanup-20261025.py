from pathlib import Path
import importlib.util,json,re
repo=Path(__file__).parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
checks=repo.parent/'c3-tool-history-model-20261025'
ops_path=repo/'plugins/lana-chatbot-ops/scripts/lana_mcp_server.py'
spec=importlib.util.spec_from_file_location('lana_ops',ops_path)
ops=importlib.util.module_from_spec(spec);spec.loader.exec_module(ops)
p=checks/'stateful/integration.json'
r=json.loads(p.read_text())
assert r['sourceSha']=='9e352f382e8915d6a1f1c080c75817065da42c63' and not r['testDatabaseDropped']
assert r['sendEnabled'] is False and len(list(p.parent.glob('provider-attempt-*.json')))==5
assert re.fullmatch(r'c3_b_test_[a-f0-9]{16}',r['testDatabase'])
targets=[{'database':r['testDatabase'],'versionId':r['candidateHandoff']['versionId']}]
# Reuse the audited identity check and exact database-only DROP procedure.
text=(repo.parent/'c3-turn-completion-cleanup-20261024.py').read_text(encoding='utf-8')
tail=text[text.index("script=r'''"):]
tail=tail.replace('after network reset','after operator stop at a completed provider-attempt boundary')
import base64,shlex,shutil,tempfile
exec(compile(tail,'audited-exact-database-cleanup','exec'))
