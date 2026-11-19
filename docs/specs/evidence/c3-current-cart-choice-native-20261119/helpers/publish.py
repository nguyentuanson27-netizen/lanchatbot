from pathlib import Path
import json,sys
root=Path(sys.argv[1]);read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
plan=read(root/'RUN_PLAN.json');a=read(root/'AUDIT.json');calls=[];receiptRows=[]
for job in plan['jobs']:
 home=Path(job['out']);e=read(home/'CANDIDATE_EVIDENCE.partial.json')
 slots={s['slotId']:s for s in e['attempts'] if s['slotId'] in job['selectedSlots']}
 for attempt in slots.values():
  receipts=[]
  for trace in attempt['audit']['nativeResults']:
   raw=read(home/trace['artifact'])
   previous={r['operation_id'] for r in raw['before']['receipts']}
   receipts.extend(r for r in raw['after']['receipts'] if r['operation_id'] not in previous)
  final=read(home/attempt['audit']['nativeResults'][-1]['artifact'])['after']['publicState']
  cart=final['cart']
  receiptRows.append({'caseId':attempt['caseId'],'repetition':job['externalRepetition'] or attempt['repetition'],
   'receipts':[{'kind':r['commandKind'],'operationId':r['operation_id'],'revision':r['stateRevisionAfter']} for r in receipts],
   'pendingRecordCount':sum(r['commandKind']=='PENDING_NEGOTIATION_RECORDED' for r in receipts),
   'negotiationEventCount':sum(r['commandKind']=='NEGOTIATION_EVENT' for r in receipts),
   'cart':{'subtotalVnd':cart['subtotalVnd'],'shippingFeeVnd':cart['shippingFeeVnd'],'discountTotalVnd':cart['discountTotalVnd'],
     'grandTotalVnd':cart['grandTotalVnd'],'adjustments':cart['adjustments']} if cart else None})
 journal=[json.loads(s) for s in (home/'NATIVE_REQUESTS.jsonl').read_text(encoding='utf-8').splitlines()]
 ids={r['value']['id']:(slots[r['value']['slotId']],r['value']['turnIndex']) for r in journal if r['phase']=='STARTED'}
 for row in journal:
  if row['phase']!='RESULT':continue
  g=row['value'];output=g.get('output') or {}
  if output.get('kind')!='TOOLS':continue
  case,t=ids[g['id']]
  calls.append({'caseId':case['caseId'],'repetition':job['externalRepetition'] or case['repetition'],'turn':t,
    'generationId':g['id'],'calls':output['calls']})
public={k:a[k] for k in ('status','source','worldHash','jobAudits','generations','continuity')}
public['conversationTrace']=[]
keys=('operationId','effect','duplicate','cartQuote','preCartQuote','pendingSupport','supportEvaluation','negotiatedPriceFloor','calculationBasis','choiceOptions','pendingReused','effectCommitted')
for c in a['conversations']:
 public['conversationTrace'].append({k:v for k,v in c.items() if k!='turns'}|{'turns':[
  {k:v for k,v in t.items() if k not in ('before','after','tools')}|
  {'tools':[{'name':x['name'],'status':x['status'],'reason':x['reason'],'data':{k:v for k,v in (x['data'] or {}).items() if k in keys}} for x in t['tools']]}
  for t in c['turns']]})
provenance={k:v for k,v in plan.items() if k not in ('jobs','world')}
provenance['worldCapture']=read(root/'world/SUMMARY.json')
provenance['jobs']=[{k:v for k,v in j.items() if k not in ('registrationPath','campaignPath','score','world','seedPath','out')} for j in plan['jobs']]
provenance['helperIdentity']=read(root/'RUN_HELPER_IDENTITY.json')
outputs={'PUBLIC_AUDIT.json':public,'PROVENANCE.json':provenance,'PENDING_RECEIPT_AUDIT.json':{'rows':receiptRows},
 'TOOL_CALLS.json':{'source':plan['source'],'records':calls}}
for name,value in outputs.items():(root/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Public evidence prepared',len(calls),'native tool outputs;',len(receiptRows),'receipt chains.')
