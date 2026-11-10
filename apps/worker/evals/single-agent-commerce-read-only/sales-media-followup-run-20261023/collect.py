from pathlib import Path
import json,math,hashlib
p=Path(__file__).resolve().parent
j=lambda f:json.loads(f.read_text(encoding='utf-8'))
texts=['# Hội thoại sales/media follow-up — 23/10/2026','Source '+j(p/'REGISTRATION.json')['runSourceSha']+'. N1. Không gửi khách thật. Controls và advice là diagnostic, không phải native customer conversations.']
gens=[];outcomes=[]
for f in sorted((p/'controls').glob('attempt-*.json')):
 a=j(f);g=a.get('provider',{});t=(g or {}).get('telemetry') or (a.get('error') or {}).get('telemetry');
 if t:gens.append({'role':'verifier','telemetry':t})
 outcomes.append({'population':'controls','id':f.stem,'terminal':a['terminal'],'expectedSafe':a['definition']['safe']})
 texts += ['## Control/probe '+f.stem, 'Expected safe (evaluator only): '+str(a['definition']['safe']), 'Draft:', '```text',a['definition']['draft'],'```','Terminal: '+a['terminal']['disposition']+' / '+a['terminal']['reason']]
for folder,pattern in [('media','provider-attempt-*.json'),('advice','attempt-*.json')]:
 for f in sorted((p/folder).glob(pattern)):
  a=j(f);r=a['result'];gens.extend(r.get('generations',[]));outcomes.append({'population':folder,'id':a['caseId'],'terminal':r['terminal']})
  texts += ['## '+folder+' / '+a['caseId']]
  if folder=='advice':
   texts += ['History: '+json.dumps(a['runtime']['history'],ensure_ascii=False),'Khách: '+a['runtime']['latest']]
  else:texts += ['Khách: '+json.dumps(a.get('inboundMessages'),ensure_ascii=False)]
  texts += ['Terminal: '+r['terminal']['disposition']+' / '+r['terminal']['reason'],'```text', ('\n'.join(a.get('actualCapturedMessages',[])) if folder=='media' else r['terminal'].get('text')) or '[NO TEXT]', '```']
  if folder=='media':
   for asset in a.get('actualCapturedAttachments',[]):texts += ['Ảnh thực giao: '+asset['url']]
   for g in r.get('generations',[]):
    if g['role']=='verifier':
     t=g.get('telemetry') or {};body=t.get('requestBody')
     if body and r['terminal']['disposition']!='SEND_ELIGIBLE':
      draft=json.loads(body['input'][0]['content'][0]['text'])['untrusted']['finalDraft'];texts += ['Draft bị chặn — không phải lời đã giao:','```text',draft,'```','Verdict: '+str(t.get('answer'))]
(p/'CONVERSATIONS.md').write_text('\n'.join(line.rstrip() for line in '\n\n'.join(str(s).rstrip() for s in texts).splitlines()).rstrip()+'\n',encoding='utf-8')
requests=sum((g.get('telemetry') or {}).get('providerRequests',0) for g in gens)
metrics={'outcomes':len(outcomes),'generationEntries':len(gens),'providerRequests':requests,'roles':{},'inputTokens':0,'outputTokens':0,'errors':0,'verifierLatencyMs':[],'cost':'NOT_EXPOSED'}
for g in gens:
 t=g.get('telemetry') or {};metrics['roles'][g['role']]=metrics['roles'].get(g['role'],0)+1
 u=t.get('usage') or {};metrics['inputTokens']+=t.get('inputTokens',u.get('input_tokens',0)) or 0;metrics['outputTokens']+=t.get('outputTokens',u.get('output_tokens',0)) or 0
 if g.get('status',t.get('status')) not in [None,'OK']:metrics['errors']+=1
 if g['role']=='verifier':
  latency=g.get('latencyMs',t.get('latencyMs'))
  if latency is not None:metrics['verifierLatencyMs'].append(latency)
lat=sorted(metrics['verifierLatencyMs']);metrics['latencySampleN']=len(lat)
if lat:metrics['verifierP50Ms']=lat[math.ceil(.5*len(lat))-1];metrics['verifierP95Ms']=lat[math.ceil(.95*len(lat))-1]
assert requests<=39
(p/'METRICS.json').write_text(json.dumps(metrics,indent=2)+'\n');(p/'OUTCOMES.json').write_text(json.dumps(outcomes,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(metrics))
