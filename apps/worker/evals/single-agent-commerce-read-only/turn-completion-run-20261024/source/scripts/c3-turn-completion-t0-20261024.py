from pathlib import Path
import json,hashlib
repo=Path(__file__).parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
base=repo/'apps/worker/evals/single-agent-commerce-read-only'
out=repo.parent/'c3-turn-completion-checks-20261024'
out.mkdir(exist_ok=True)
targets=['b1-changed-occasion','sales-discovery-advice:need','b1-search-read-v2','b1-search-read-v3']
runs=['media-size-acceptance-20261024','execution-media-run-20261024','full-phase-b-20261024']
report={'status':'T2_NO_INTERVENTION','cases':[],'scope':'Offline actual requests, no provider requests'}
for run in runs:
    for target in targets:
        found=[]
        for p in (base/run).rglob('*attempt-*.json'):
            a=json.loads(p.read_text(encoding='utf-8'))
            if a.get('caseId')!=target: continue
            result=a.get('result',{})
            if not isinstance(result,dict):result={}
            generations=result.get('generations',[])
            ids={g.get('id',g.get('generationId')) for g in generations}
            paths=[p.parent/'requests.jsonl',p.parent/'provider-requests.jsonl']
            rows=[]
            for q in paths:
                if q.exists():
                    rows=[json.loads(x) for x in q.read_text(encoding='utf-8').splitlines()]
                    if ids:rows=[r for r in rows if r.get('id') in ids]
                    break
            toolrows=[];wires=[]
            for r in rows:
                v=r.get('value',{})
                if r.get('phase')=='TOOL_RESULTS':
                    toolrows.append({'calls':v.get('calls'),'results':[{'status':x.get('status'),'reason':x.get('reason'),
                      'dataStatus':x.get('data',{}).get('status'),'keys':list(x.get('data',{})),
                      'products':[{'subjectRef':y.get('subjectRef'),'descriptionSha256':hashlib.sha256((y.get('content',{}).get('description') or '').encode()).hexdigest()} for y in x.get('data',{}).get('products',[])]} for x in v.get('results',[])]})
                if r.get('phase')=='OWNER_REQUEST':
                    responses=[part['functionResponse'] for msg in v.get('contents',[]) for part in msg.get('parts',[]) if 'functionResponse' in part]
                    wires.append({'mode':v.get('toolConfig'),'tools':len(v.get('tools',[])),'responses':[{'name':s.get('name'),'status':s.get('response',{}).get('status'),
                      'dataKeys':list(s.get('response',{}).get('data',{})), 'productDescriptions':[y.get('content',{}).get('description') for y in s.get('response',{}).get('data',{}).get('products',[])]} for s in responses]})
            response_summary=[{'name':s.get('name'),'status':s.get('response',{}).get('status'),'reason':s.get('response',{}).get('reason'),
              'subjectRef':s.get('response',{}).get('data',{}).get('subjectRef')} for s in a.get('toolResponses',[])]
            found.append({'attempt':str(p.relative_to(repo)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
              'terminal':result.get('terminal'), 'generations':generations,'toolResults':toolrows,'capturedToolResponses':response_summary,'ownerWires':wires})
        report['cases'].append({'run':run,'caseId':target,'status':'FOUND' if found else 'NOT_PRESENT','attempts':found})
report['conclusion']='Observed search descriptions reach provider; no demonstrated producer/projection/consumer defect for these two task failures. Same-case outcomes vary across source/config/run. Retain T2_NO_INTERVENTION; no budget/prompt/tool change targeting these cases.'
report['discoveryBoundFinding']='Current discovery opened all offers for SQ748 (OK) and SQ2447 (REJECTED SUBJECT_BOUND) in one batch, then requested search at final-only. Do not call both reads successful or infer that the source itself has no product. Subject bounds are preserved; this is no demonstrated serialization defect.'
(out/'T0_TRACE_AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'run':x['run'],'caseId':x['caseId'],'attempts':len(x['attempts']), 'terminals':[y['terminal'] for y in x['attempts']]} for x in report['cases']],ensure_ascii=False,indent=2))
