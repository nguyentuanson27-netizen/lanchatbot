from pathlib import Path
import hashlib, json
root=Path('C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-complete-20261024')
rows=[json.loads(line) for line in (root/'media-followup/provider-requests.jsonl').read_text().splitlines()]
request=next(r for r in rows if r['caseId']=='media-and-size:ask' and r['phase']=='VERIFIER_REQUEST')
trusted=json.loads(request['value']['input'][0]['content'][0]['text'])['trusted']
fits=[c for c in trusted['protectedClaims'] if c['type']=='SIZE_FIT']
assert len(fits)==1 and fits[0]['scope']['productId']=='SV2447'
print(json.dumps({'fitClaim':fits[0]},ensure_ascii=False))
media=json.loads((root/'media-followup/provider-attempt-6.json').read_text())
gallery=json.loads((root/'journey-openings/provider-attempt-2.json').read_text())
assert media['result']['terminal']['disposition']=='SEND_ELIGIBLE'
assert len(media['actualCapturedAttachments'])==1
assert gallery['result']['terminal']['fallbackId']=='C3_B_VERIFIED_MEDIA_V1' and len(gallery['actualCapturedAttachments'])==2
diag=[]
for job,index in [('journey-openings',1),('journey-openings',3),('media-followup',3)]:
 a=json.loads((root/job/f'provider-attempt-{index}.json').read_text())
 diag.append({'caseId':a['caseId'],'reason':a['result']['terminal']['reason'],'recovery':a['result'].get('recovery'),
   'tools':[{'name':t['name'],'status':t['response']['status'],'reason':t['response'].get('reason'),
     'recommendation':t['response'].get('data') if t['name']=='recommend_size' else None} for t in a.get('toolResponses',[])],
   'generationStatus':[{'role':g['role'],'status':g['status']} for g in a['result'].get('generations',[])]})
(root/'PREFIX_DIAGNOSTICS.json').write_text(json.dumps({'fitClaim':fits[0],'items':diag,
 'snapshotInterpretation':'CURRENT_SNAPSHOT mismatch is confirmed. POS observedAt changed from 11:04:33 to 11:34:33 across retained tool results during the prefix; consistent with source refresh, but full final trusted snapshot is not retained so the exact changed field is not proven.'},ensure_ascii=False,indent=2),encoding='utf8')
(root/'PREFIX_REVIEW.json').write_text(json.dumps({'sourceSha':json.loads((root/'REGISTRATION.json').read_text())['sourceSha'],
 'verdict':'PASS','scope':'T1 gallery recovery + T2 actual detail image and code-backed fit; permission for registered 40 remaining only, not overall B GO.',
 'gallery':'PARTIAL_GENERIC_ONLY, original verifier FAIL retained; two approved requested-product images captured.',
 'mediaAndSize':'PASS: exact detail attachment and requested-product SIZE_FIT claim support actual sent M recommendation.',
 'primaryReviewHash':hashlib.sha256((root/'PREFIX_PRIMARY_REVIEW.json').read_bytes()).hexdigest(),
 'residuals':['Discovery OWNER_TOOL_MODE fallback','Two stale-snapshot silent handoffs and one dependent human-owned no-send','Advice wording/decision quality remains open'],
 'noRetry':True},ensure_ascii=False,indent=2),encoding='utf8')
print('PREFIX_GATE_PASS_WITH_RESIDUALS')
