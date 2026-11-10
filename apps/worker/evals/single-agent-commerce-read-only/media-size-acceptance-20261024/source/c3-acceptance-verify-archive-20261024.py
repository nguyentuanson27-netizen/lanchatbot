from pathlib import Path
import hashlib,json,re,subprocess
repo=Path('C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005')
out=repo/'apps/worker/evals/single-agent-commerce-read-only/media-size-acceptance-20261024'
hashes=json.loads((out/'RAW_HASHES.json').read_text())
patterns=[rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'Bearer [A-Za-z0-9._~+/-]{32,}',rb'postgres(?:ql)?://[^\s/:]+:[^\s@]+@',
 rb'"(?:QDRANT_API_KEY|access_token|refresh_token|client_secret|private_key)"\s*:\s*"[^"\s]+"']
for name,expected in hashes.items():
 file=out/name;data=file.read_bytes()
 assert hashlib.sha256(data).hexdigest()==expected['sha256'] and len(data)==expected['bytes'],name
 scan=data.decode('utf-16').encode('utf8') if data[:2] in [b'\xff\xfe',b'\xfe\xff'] else data
 for pattern in patterns:assert not re.search(pattern,scan),'SECRET_PATTERN:'+name
print('PHYSICAL_BYTES_AND_SECRET_SCAN_PASS',flush=True)
if '--physical-only' in __import__('sys').argv:raise SystemExit(0)
for name in hashes:
 file=out/name;data=file.read_bytes()
 blob=subprocess.check_output(['git','show',':'+str(file.relative_to(repo)).replace('\\','/')],cwd=repo)
 assert blob==data,'GIT_BYTE_DRIFT:'+name
primary=json.loads((out/'PRIMARY_REVIEW.json').read_text())
prefix=out/'PREFIX_PRIMARY_REVIEW.json'
assert hashlib.sha256(prefix.read_bytes()).hexdigest()==primary['prefixPrimaryReviewHash']
for file in [prefix,out/'PRIMARY_REVIEW.json',out/'PREFIX_REVIEW.json']:
 blob=subprocess.check_output(['git','show',':'+str(file.relative_to(repo)).replace('\\','/')],cwd=repo)
 assert blob==file.read_bytes(),'REVIEW_BYTE_DRIFT'
print(json.dumps({'rawFiles':len(hashes),'rawSha256':'PASS','gitIndexByteParity':'PASS','strongSecretPatterns':'NONE','reviewBinding':'PASS'}))
