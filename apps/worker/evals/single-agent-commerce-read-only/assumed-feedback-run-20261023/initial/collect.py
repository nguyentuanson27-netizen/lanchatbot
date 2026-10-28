from pathlib import Path
import json,math
p=Path(__file__).resolve().parent;j=lambda f:json.loads(f.read_text(encoding='utf-8'))
rows=[];gens=[];text=['# Hội thoại media: nguồn hiện tại và giả định có feedback','Ảnh feedback ở nhóm assumed-feedback là giả định kiểm thử do owner yêu cầu, sử dụng ảnh catalog sẵn có. Không phải ảnh khách đã được xác minh. Capture transport, không gửi khách thật.']
for name in ['current-source','assumed-feedback']:
 for f in sorted((p/name).glob('provider-attempt-*.json')):
  a=j(f);r=a['result'];gens+=r.get('generations',[])
  rows.append({'condition':name,'caseId':a['caseId'],'terminal':r['terminal'],'images':a.get('actualCapturedAttachments',[]),'calls':[t['name'] for t in a['toolResponses']]})
  text += ['## '+name+' / '+a['caseId'],'Khách: '+json.dumps(a.get('inboundMessages'),ensure_ascii=False),'Terminal: '+r['terminal']['disposition']+' / '+r['terminal']['reason'],'```text','\n'.join(a['actualCapturedMessages']),'```']
  for asset in a.get('actualCapturedAttachments',[]):text+=['[Ảnh thực capture]('+asset['url']+')']
  if r['terminal']['disposition']!='SEND_ELIGIBLE':
   for g in r['generations']:
    if g['role']=='verifier':
     t=g.get('telemetry') or {};body=t.get('requestBody')
     if body:text+=['Draft bị chặn, không phải tin đã giao:','```text',json.loads(body['input'][0]['content'][0]['text'])['untrusted']['finalDraft'],'```','Verdict: '+str(t.get('answer'))]
(p/'CONVERSATIONS.md').write_text('\n'.join(line.rstrip() for line in '\n\n'.join(text).splitlines()).rstrip()+'\n',encoding='utf-8')
metrics={'outcomes':len(rows),'requests':0,'owner':0,'verifier':0,'errors':0,'inputTokens':0,'outputTokens':0,'latency':[]}
for g in gens:
 t=g.get('telemetry') or {};u=t.get('usage') or {};metrics['requests']+=t.get('providerRequests',0);metrics[g['role']]+=1
 metrics['errors']+=g.get('status')!='OK';metrics['inputTokens']+=t.get('inputTokens',u.get('input_tokens',0)) or 0;metrics['outputTokens']+=t.get('outputTokens',u.get('output_tokens',0)) or 0
 if g['role']=='verifier':metrics['latency'].append(g.get('latencyMs',t.get('latencyMs')))
l=sorted(x for x in metrics['latency'] if x is not None)
if l:metrics.update(verifierP50Ms=l[math.ceil(.5*len(l))-1],verifierP95Ms=l[math.ceil(.95*len(l))-1])
assert metrics['requests']<=32
(p/'METRICS.json').write_text(json.dumps(metrics,indent=2)+'\n');(p/'OUTCOMES.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');print(json.dumps(metrics))
