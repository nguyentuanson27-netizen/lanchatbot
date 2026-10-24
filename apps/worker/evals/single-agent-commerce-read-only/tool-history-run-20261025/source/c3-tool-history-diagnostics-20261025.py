from pathlib import Path
import hashlib,json
repo=Path(__file__).parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
root=repo.parent/'c3-tool-history-model-20261025'
primary=root/'PRIMARY_REVIEW.json'
assert hashlib.sha256(primary.read_bytes()).hexdigest()==(root/'PRIMARY_REVIEW.sha256').read_text().strip()
out=[]
for path in ['journey-openings/provider-attempt-1.json','journey-openings/provider-attempt-2.json','stateful/provider-attempt-2.json']:
 a=json.loads((root/path).read_text(encoding='utf-8'))
 tools=[{'name':x['name'],'status':x.get('response',{}).get('status'),'reason':x.get('response',{}).get('reason'),
    'subjectRef':x.get('response',{}).get('data',{}).get('subjectRef'),'offerType':x.get('response',{}).get('data',{}).get('offerType')}
    for x in a.get('toolResponses',[])]
 rows=[json.loads(s) for s in (root/path).parent.joinpath('provider-requests.jsonl').read_text(encoding='utf-8').splitlines()]
 requests=[r for r in rows if r.get('caseId')==a['caseId'] and r.get('phase')=='VERIFIER_REQUEST']
 owner_requests=[r for r in rows if r.get('caseId')==a['caseId'] and r.get('phase')=='OWNER_REQUEST']
 if owner_requests:
  tools=[{'name':s['name'],'status':s.get('response',{}).get('status'),'reason':s.get('response',{}).get('reason'),
    'subjectRef':s.get('response',{}).get('data',{}).get('subjectRef'),'offerType':s.get('response',{}).get('data',{}).get('offerType')}
    for m in owner_requests[-1]['value']['contents'] for part in m.get('parts',[]) if (s:=part.get('functionResponse'))]
 drafts=[]
 for r in requests:
  try: drafts.append(json.loads(r['value']['input'][0]['content'][0]['text'])['untrusted']['finalDraft'])
  except (KeyError,TypeError): pass
 out.append({'caseId':a['caseId'],'toolsFromLatestOwnerHistory':tools,'actualToolCalls':a['result']['toolCalls'],
    'verifierReviewedDrafts':[{'text':d,'capturedExact':d in (a.get('actualCapturedMessages') or [])} for d in drafts],
    'terminal':a['result']['terminal'],'recovery':a['result'].get('recovery')})
(root/'POST_PRIMARY_DIAGNOSTICS.json').write_text(json.dumps({'primaryReviewSha256':hashlib.sha256(primary.read_bytes()).hexdigest(),
    'cases':out},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=False,indent=2))
