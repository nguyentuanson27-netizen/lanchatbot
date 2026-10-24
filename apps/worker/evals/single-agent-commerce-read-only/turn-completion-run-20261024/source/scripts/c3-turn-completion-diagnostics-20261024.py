from pathlib import Path
import hashlib,json,datetime
root=Path(__file__).parent
run=root/'c3-turn-completion-model-20261024'
primary=hashlib.sha256((run/'PRIMARY_REVIEW.json').read_bytes()).hexdigest()
def rows(job):
 return [json.loads(x) for x in (run/job/('requests.jsonl' if job.startswith('b1-') else 'provider-requests.jsonl')).read_text(encoding='utf-8').splitlines()]
def attempt(job,cid):
 return next(json.loads(p.read_text(encoding='utf-8')) for p in (run/job).glob('*attempt-*.json') if json.loads(p.read_text(encoding='utf-8'))['caseId']==cid)
def walk(v):
 if isinstance(v,dict):
  yield v
  for x in v.values():yield from walk(x)
 elif isinstance(v,list):
  for x in v:yield from walk(x)
 elif isinstance(v,str):
  try:x=json.loads(v)
  except (ValueError,TypeError):return
  if isinstance(x,(dict,list)):yield from walk(x)
def owner_trace(job,a):
 ids={x['id'] for x in a['result']['generations'] if x['role']=='owner'}
 return [{'generationId':x['id'],**{k:x['value'].get(k) for k in ['kind','text','calls']}} for x in rows(job) if x.get('id') in ids and x['phase']=='OWNER_RESULT']
items=[]
a=attempt('b1-1-1','b1-changed-occasion')
before=[x['value']['context'] for x in rows('b1-1-1') if x['phase']=='PUBLIC_CONTEXT_CAPTURE'][-1]
after=a['result']['currentPublicContext']
key=lambda x:json.dumps([x['type'],x['scope']],sort_keys=True)
b={key(x):x for x in before['protectedClaims']};n={key(x):x for x in after['protectedClaims']}
assert b.keys()==n.keys() and all(b[k]['value']==n[k]['value'] for k in b)
source_changes=[{'claim':k,'before':b[k].get('source',b[k].get('provenance')),'after':n[k].get('source',n[k].get('provenance'))} for k in sorted(b) if b[k]!=n[k]]
items.append({'caseId':a['caseId'],'ownerTrace':owner_trace('b1-1-1',a),'terminal':a['result']['terminal'],
 'verifierVerdicts':[x['telemetry']['answer'] for x in a['result']['generations'] if x['role']=='verifier'],
 'claimsComparedByTypeAndScope':len(b),'claimValueChanges':0,'claimIdentityOrProvenanceChanges':source_changes,
 'otherContextEquality':{k:before[k]==after[k] for k in before if k!='protectedClaims'},
 'finding':'Owner completed search -> read two products -> FINAL; verifier PASS. CURRENT_SNAPSHOT rejected after POS provenance refreshed from16:34:33.889Z to17:04:33.997Z, current revision stayed1. Indexed diff also reflects reordered claims: pairing type+scope shows same four values. This is NOT owner tool-mode failure, NOT evidence the world was unchanged for authority, and NOT an actual sent/handoff receipt in B1 eligibility-only mode. Preserve strict gate; do not promote unprotected draft.'})
a=attempt('journey-openings','sales-discovery-advice:need')
items.append({'caseId':a['caseId'],'ownerTrace':owner_trace('journey-openings',a),'terminal':a['result']['terminal'],
 'finding':'Search returned three subjects with descriptions. Owner read SQ675/SQ748, then emitted read V406 in final-only phase (NONE, zero declared tools). Third tool request was rejected, not executed. No verifier was called. Cumulative toolResponses can repeat earlier search/read entries; do not count them as separate executions. T2_NO_INTERVENTION remains unresolved; this run does not reproduce old SQ2447 SUBJECT_BOUND rejection.'})
a=attempt('negotiation','negotiation-price-objection')
items.append({'caseId':a['caseId'],'ownerTrace':owner_trace('negotiation',a),'terminal':a['result']['terminal'],'recovery':a['result']['recovery'],
 'verdicts':[json.loads(x['telemetry']['answer']) for x in a['result']['generations'] if x['role']=='verifier'],
 'finding':'Draft extended5% two-parent-unit discount to buying the set áo+chân váy. Source counts a set/combo as one parent unit. Verifier blocked that extension. Actual customer received existing code-owned receipt-backed cart summary after30k free-shipping adjustment, total499k. Its menu/parentheses/system tone belongs to code recovery, not owner prompt. No provider error or hidden generation retry.'})
for job,cid in [('journey-openings','sales-size-advice:height-weight'),('media-followup','media-and-size:ask')]:
 a=attempt(job,cid);ids={x['id'] for x in a['result']['generations'] if x['role']=='verifier'}
 request=next(x for x in rows(job) if x['phase']=='VERIFIER_REQUEST' and x['id'] in ids)
 fits=[x for x in walk(request['value']['input']) if x.get('type')=='SIZE_FIT']
 assert len(fits)==1 and fits[0]['scope']['productId']=='SV2447' and fits[0]['value']['recommendedSizes']==['M']
 items.append({'caseId':cid,'fitClaims':fits,'committedProfileRevision':a['committedPublicState']['customerProfileRevision'],
  'sizeToolResponses':[x['response'] for x in a['toolResponses'] if x['name']=='recommend_size'],
  'finding':'SIZE_FIT for requested product SV2447 recommends M, bound to current profile revision2 and measurement fingerprint. Provenance retains original SQ2447 chart via owner-approved same-name delegation; prices/stock/media/cart still use SV2447. In media+size an invalid quote was rejected before corrected input succeeded inside registered tool budget; no automatic generation retry. This closes provenance inspection only, without rewriting locked primary review.'})
a=attempt('media-followup','media-detail-next:continue')
items.append({'caseId':a['caseId'],'terminal':a['result']['terminal'],'actualCapturedMessages':a['actualCapturedMessages'],
 'finding':'Analytics redactor at isolated-integration.mjs:675 replaces benign caption containing đường nét with ADDRESS marker. Existing capture gate returns CUSTOMER_TERMINAL_NOT_CAPTURED. Four other persisted jobs pass. Raw plaintext pre-redaction hash was not retained, so exact caption bytes sent cannot be proved; terminal draft is not substitute proof. Keep raw/gate failure and primary limitation, do not patch harness or rerun to rescue campaign.'})
out={'sourceSha':json.loads((run/'REGISTRATION.json').read_text())['sourceSha'],'primaryReviewSha256':primary,
 'timing':'Diagnostic inspection after primary review locked; no provider calls or primary edits.','findings':items,
 'persistedDatabases':[{ 'job':j,'dropped':json.loads((run/j/'integration.json').read_text())['testDatabaseDropped']} for j in ['journey-openings','opening-quotes','media-followup','stateful','negotiation']]}
assert all(x['dropped'] for x in out['persistedDatabases'])
(run/'POST_PRIMARY_DIAGNOSTICS.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
(run/'POST_PRIMARY_DIAGNOSTICS.md').write_text('# Chẩn đoán sau khi khóa review\n\n'+ '\n\n'.join('## '+x['caseId']+'\n\n'+x['finding'] for x in items),encoding='utf-8')
assert hashlib.sha256((run/'PRIMARY_REVIEW.json').read_bytes()).hexdigest()==primary
print(json.dumps({'diagnostics':len(items),'primaryUnchanged':True,'nativeDatabasesDropped':5}))
