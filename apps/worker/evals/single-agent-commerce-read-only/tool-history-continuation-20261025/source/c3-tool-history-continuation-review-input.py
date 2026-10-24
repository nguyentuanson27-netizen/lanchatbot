from pathlib import Path
import hashlib,json
repo=Path(__file__).parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
base=repo/'apps/worker/evals/single-agent-commerce-read-only'
root=repo.parent/'c3-tool-history-continuation-20261025'
corpus={}
def visit(value):
    if isinstance(value,dict):
        if 'caseId' in value and 'runtime' in value: corpus[value['caseId']]=value['runtime']
        if 'caseId' in value and isinstance(value.get('turns'),list):
            for turn in value['turns']:
                if 'turnId' in turn and 'runtime' in turn: corpus[value['caseId']+':'+turn['turnId']]=turn['runtime']
        for v in value.values(): visit(v)
    elif isinstance(value,list):
        for v in value: visit(v)
for name in ['cases.b1.json','stateful-cases.json','sales-journeys.candidate.json','sales-media-followup-cases.json','opening-quote-cases.json']:
    visit(json.loads((base/name).read_text(encoding='utf-8')))
items=[]
for job in sorted(root.iterdir()):
    if not job.is_dir() or job.name.startswith('controls') or job.name.endswith('preflight'):continue
    files=sorted([*job.glob('attempt-*.json'),*job.glob('provider-attempt-*.json')],key=lambda p:int(p.stem.split('-')[-1]))
    for p in files:
        a=json.loads(p.read_text(encoding='utf-8'))
        runtime=a.get('runtime') or corpus.get(a['caseId'],{})
        requests=job/('requests.jsonl' if job.name.startswith('b1-') else 'provider-requests.jsonl')
        history=None
        if requests.exists():
            owner=next((r for line in requests.read_text(encoding='utf-8').splitlines() if
                (r:=json.loads(line)).get('caseId',r.get('id','').split(':')[0])==a['caseId'] and r.get('phase')=='OWNER_REQUEST'),None)
            if owner:
                history=[{'role':m['role'],'text':'\n'.join(p['text'] for p in m.get('parts',[]) if 'text' in p)}
                    for m in owner['value']['contents'][1:]]
        terminal={k:a['result']['terminal'].get(k) for k in ['disposition','reason','text','fallbackId']}
        items.append({'caseId':a['caseId'],'job':job.name,'path':str(p.relative_to(root)),
            'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'runtime':runtime,'actualInitialDialogue':history,
            'terminal':terminal,'actualCapturedMessages':a.get('actualCapturedMessages'),
            'attachments':a.get('actualCapturedAttachments'),'captureMode':'CAPTURE_TRANSPORT' if 'actualCapturedMessages' in a else 'SEND_ELIGIBILITY_ONLY',
            'publicState':a.get('committedPublicState')})
(root/'PRIMARY_INPUT.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
text=[]
for item in items:
    text.extend(['## '+item['caseId'],'',json.dumps(item['runtime'],ensure_ascii=False),'',
        'Actual: '+json.dumps(item['terminal'],ensure_ascii=False),'',
        json.dumps(item['actualCapturedMessages'],ensure_ascii=False),'',
        'Attachments: '+json.dumps(item['attachments'],ensure_ascii=False),''])
(root/'PRIMARY_INPUT.md').write_text('\n'.join(text),encoding='utf-8')
print(json.dumps({'native':len(items),'jobs':sorted(set(x['job'] for x in items))}))
