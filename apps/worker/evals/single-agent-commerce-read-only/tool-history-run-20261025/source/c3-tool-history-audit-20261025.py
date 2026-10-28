from pathlib import Path
import hashlib,json
repo=Path(__file__).parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
root=repo/'apps/worker/evals/single-agent-commerce-read-only/turn-completion-run-20261024/raw'
ids={'b1-buying-concern-v2','b1-changed-occasion-v2','media-decision:ask'}
out=[]
for p in root.rglob('*attempt-*.json'):
    try: a=json.loads(p.read_text(encoding='utf-8'))
    except (ValueError,UnicodeError): continue
    if a.get('caseId') not in ids: continue
    out.append({'caseId':a['caseId'],'path':str(p.relative_to(repo)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
        'terminal':a.get('result',{}).get('terminal'),'actualCapturedMessages':a.get('actualCapturedMessages')})
assert len(out)==3
report={'decision':'ADVICE_NO_INTERVENTION','cases':out,
    'reason':'Existing instructions explicitly require a buying direction, relevant differences and no return of the same choice. No specific conflicting instruction or lost decision field established; preserve baseline and report residual.',
    'historicalPosSnapshot':'Exact SQ748 historical POS snapshot unavailable; structural fixture separately labeled, no exact replay claim.'}
target=repo.parent/'c3-tool-history-checks-20261025/T4_ACTUAL_OUTCOMES.json'
target.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'reviewed':len(out),'decision':report['decision']}))
