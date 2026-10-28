from pathlib import Path
import json,hashlib,sys
root=Path(__file__).parent/'c3-turn-completion-model-20261024'
stage=sys.argv[1]
assert stage in ['prefix','all']
items=[]
for job in sorted(root.iterdir()):
    if not job.is_dir() or job.name.startswith('controls') or job.name.endswith('preflight'):continue
    files=sorted([*job.glob('attempt-*.json'),*job.glob('provider-attempt-*.json')],key=lambda p:int(p.stem.split('-')[-1]))
    for p in files:
        a=json.loads(p.read_text(encoding='utf-8'))
        r=a.get('runtime')
        if r is None:
            # Corpus/history are evaluator-side inputs for reading, never a provider override.
            repo=Path(__file__).parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
            base=repo/'apps/worker/evals/single-agent-commerce-read-only'
            candidates=[]
            for name in ['stateful-cases.json','sales-journeys.candidate.json','sales-media-followup-cases.json','opening-quote-cases.json']:
                def walk(v):
                    if isinstance(v,dict):
                        if v.get('caseId')==a['caseId']:candidates.append(v)
                        for child in v.values():walk(child)
                    elif isinstance(v,list):
                        for child in v:walk(child)
                walk(json.loads((base/name).read_text(encoding='utf-8')))
            r=candidates[0].get('runtime',{}) if candidates else {}
        # First owner request contains the actual accepted public history, before
        # any current tool plan/draft/verifier diagnostic. Keep only chat text.
        wirefile=job/('requests.jsonl' if job.name.startswith('b1-') else 'provider-requests.jsonl')
        ids={g['id'] for g in a['result'].get('generations',[]) if g.get('role')=='owner'}
        public_chat=[]
        if wirefile.exists() and ids:
            row=next((x for x in (json.loads(line) for line in wirefile.read_text(encoding='utf-8').splitlines()) if x.get('phase')=='OWNER_REQUEST' and x.get('id') in ids),None)
            if row:
                for message in row['value'].get('contents',[]):
                    texts=[]
                    for part in message.get('parts',[]):
                        if not isinstance(part.get('text'),str):continue
                        try: data=json.loads(part['text'])
                        except (ValueError,TypeError):data=None
                        if isinstance(data,dict) and any(k in data for k in ['trusted','catalogImage']):continue
                        texts.append(part['text'])
                    if texts:public_chat.append({'role':'shop' if message['role']=='model' else 'customer','text':'\n'.join(texts)})
        if public_chat and public_chat[-1]['role']=='customer':
            r={**r,'latest':public_chat[-1]['text'],'history':public_chat[:-1]}
        elif not r and a.get('inboundMessages') and a['caseId']!='stateful-private-checkout':
            r={'latest':'\n'.join(m.get('text') or '' for m in a['inboundMessages'])}
        t=a['result']['terminal']
        item={'caseId':a['caseId'],'job':job.name,'attemptHash':hashlib.sha256(p.read_bytes()).hexdigest(),
          'runtime':r,'terminal':{k:t.get(k) for k in ['disposition','reason','text','fallbackId']},
          'actualMessages':a.get('actualCapturedMessages'),'actualAttachments':a.get('actualCapturedAttachments'),
          'committedPublicState':a.get('committedPublicState')}
        items.append(item)
assert len({x['caseId'] for x in items})==len(items)
target=root/('PRIMARY_INPUT_'+stage.upper()+'.json')
target.write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
lines=[]
for a in items:
    lines+=['## '+a['caseId'],'',json.dumps(a['runtime'],ensure_ascii=False),'',
      'Actual: '+str(a['terminal']),'',json.dumps(a['actualMessages'],ensure_ascii=False),'',
      'Attachments: '+json.dumps(a['actualAttachments'],ensure_ascii=False),'']
(root/('PRIMARY_INPUT_'+stage.upper()+'.md')).write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'stage':stage,'attempts':len(items),'inputHash':hashlib.sha256(target.read_bytes()).hexdigest()}))
