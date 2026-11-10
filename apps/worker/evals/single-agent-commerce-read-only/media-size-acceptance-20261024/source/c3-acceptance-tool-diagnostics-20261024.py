from pathlib import Path
import json
root=Path('C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-complete-20261024')
items=[]
for job,file in [('b1','attempt-1.json'),('journey-openings','provider-attempt-1.json')]:
 a=json.loads((root/job/file).read_text());ids={g['id'] for g in a['result']['generations']}
 rows=[json.loads(line) for line in (root/job/('requests.jsonl' if job=='b1' else 'provider-requests.jsonl')).read_text().splitlines()]
 returned=[{'generationId':r['id'],'kind':r['value'].get('kind'),'calls':r['value'].get('calls')} for r in rows if r['id'] in ids and r['phase']=='OWNER_RESULT']
 telemetry=[{'id':g['id'],'role':g['role'],'status':g['status'],
   'declaredToolCount':g.get('telemetry',{}).get('declaredToolCount'),
   'functionCallingMode':g.get('telemetry',{}).get('functionCallingMode'),
   'unexpectedToolCall':g.get('telemetry',{}).get('unexpectedToolCall')} for g in a['result']['generations']]
 items.append({'caseId':a['caseId'],'returned':returned,'telemetry':telemetry})
(root/'TOOL_DIAGNOSTICS.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(items,ensure_ascii=False,indent=2))
