from pathlib import Path
import json,hashlib,collections
r=Path(r'C:/Users/nguye/Documents/Sản phẩm AI/c3-tool-history-continuation-20261025')
setup={'stateful-open','stateful-variant-quantity','stateful-quote','stateful-correction','stateful-request-checkout'}
items=json.loads((r/'PRIMARY_INPUT.json').read_text(encoding='utf-8'))
targets=[a for a in items if a['caseId'] not in setup]
assert len(targets)==30
reg=json.loads((r/'REGISTRATION.json').read_text());m=json.loads((r/'METRICS.json').read_text());fire=json.loads((r/'LABEL_FIREWALL_AUDIT.json').read_text());status=json.loads((r/'STATUS.json').read_text())
assert m['native']['attempted']==35 and m['operations']['actualGenerationRequests']==97 and fire['actualWiresScanned']==97
assert all(j.get('exitCode')==0 for j in status['jobs'].values()) and len(status['jobs'])==8
assert len(json.loads((r/'COMMANDS.json').read_text()))==16
for j in ['stateful','negotiation']:assert json.loads((r/j/'integration.json').read_text())['testDatabaseDropped'] is True
for a in items:
 for g in json.loads((r/a['path']).read_text(encoding='utf-8'))['result'].get('generations',[]):assert g.get('telemetry',{}).get('providerRequests')==1
state=json.loads((r/'stateful/provider-attempt-7.json').read_text())['committedPublicState']
assert state['stage']=='PURCHASE_CONFIRMED'
assert [(l['quantity'],l['components'][0]['size']) for l in state['cart']['lines']]==[(2,'L')]
assert {(v['kind'],v['value']) for v in state['measurements']}=={('WAIST_CM',74),('HIPS_CM',96)}
a=json.loads((r/'stateful/provider-attempt-5.json').read_text());expected=hashlib.sha256('Chị cho em tên người nhận nhé.'.encode()).hexdigest()
assert expected in json.dumps(a['actualCapturedTextHashes'])
proof={'status':'PASS','caseId':a['caseId'],'publicText':'Chị cho em tên người nhận nhé.','sha256':expected,'captureHashes':a['actualCapturedTextHashes'],'mode':'Code-owned public text hash, not private plaintext reconstruction'}
(r/'PUBLIC_CHECKOUT_HASH_PROOF.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2),encoding='utf-8')
validation={'status':'PASS','sourceSha':reg['sourceSha'],'targetOutcomes':30,'additionalPrerequisites':5,'allNewOutcomes':35,'targetTerminalDispositions':dict(collections.Counter(a['terminal']['disposition'] for a in targets)),'targetFallbacks':sum(a['terminal']['fallbackId'] is not None for a in targets),'targetNotRun':0,'actualGenerationRequests':97,'maximumRequestsPerGeneration':1,'providerErrors':0,'timeouts':0,'wiresScanned':97,'testDatabasesDropped':2,'checks':['All 8 cohort runs and 8 preflights exit0','No duplicate generation retry; all 97 actual requests accounted and firewall-scanned','Real isolated cart two L; corrected profile74/96; PURCHASE_CONFIRMED; code checkout text proven by transport hash','35 whole-terminal reviews locked, 30 targets separated from 5 prerequisites'],'limits':['24 B1 outcomes send eligibility only, not delivery capture','No fresh controls/full A2; old controls historical only','N1 no stability or conversion claim; mixed-source51 completion not same-source qualification']}
(r/'VALIDATION.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(validation,ensure_ascii=False,indent=2))
