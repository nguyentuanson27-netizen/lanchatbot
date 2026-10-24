from pathlib import Path
import collections,hashlib,json,re,shutil,subprocess
folder=Path(__file__).parent
repo=folder/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
base=repo/'apps/worker/evals/single-agent-commerce-read-only'
run=folder/'c3-tool-history-model-20261025'
checks=folder/'c3-tool-history-checks-20261025'
artifact=base/'tool-history-run-20261025'
assert not artifact.exists()
m=json.loads((run/'METRICS.json').read_text())
assert m['native']['attempted']==21 and m['native']['notRun']==30
assert m['operations']['actualGenerationRequests']==81
assert json.loads((run/'LABEL_FIREWALL_AUDIT.json').read_text())['actualWiresScanned']==81
primary=(run/'PRIMARY_REVIEW.json').read_bytes()
assert hashlib.sha256(primary).hexdigest()==(run/'PRIMARY_REVIEW.sha256').read_text().strip()
registration=json.loads((run/'REGISTRATION.json').read_text())
assert registration['sourceSha']=='9e352f382e8915d6a1f1c080c75817065da42c63'
postfix=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
assert postfix=='94cb6b089321d65cff57d810eb6ad2b3c74627ca'
assert not subprocess.check_output(['git','status','--porcelain'],cwd=repo,text=True).strip()
cleanup=json.loads((run/'ORPHAN_DATABASE_CLEANUP.json').read_text())
assert cleanup['status']=='PASS' and all(x['status']=='DROPPED_VERIFIED_TEST_DATABASE' for x in cleanup['targets'])
shutil.copytree(run,artifact/'raw')
shutil.copytree(checks,artifact/'checks')
(artifact/'frozen-inputs').mkdir()
for name,expected in registration['hashes'].items():
    data=(base/name).read_bytes();assert hashlib.sha256(data).hexdigest()==expected
    target=artifact/'frozen-inputs'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
(artifact/'source').mkdir()
for name in ['c3-tool-history-check-20261025.py','c3-tool-history-audit-20261025.py','c3-tool-history-review-input-20261025.py',
 'c3-tool-history-lock-review-20261025.py','c3-tool-history-diagnostics-20261025.py','c3-tool-history-cleanup-20261025.py',
 'c3-tool-history-metrics-20261025.py','c3-tool-history-firewall-20261025.mjs','c3-tool-history-archive-20261025.py']:
    shutil.copyfile(folder/name,artifact/'source'/name)
for sha,label in [(registration['sourceSha'],'model-run'),(postfix,'post-run-fix')]:
    data=subprocess.check_output(['git','show',sha+':packages/database/src/shadow-mirror.ts'],cwd=repo)
    (artifact/'source'/(label+'-shadow-mirror.ts')).write_bytes(data)
for name in ['REGISTRATION.json','METRICS.json','LABEL_FIREWALL_AUDIT.json','PRIMARY_REVIEW.json','POST_PRIMARY_DIAGNOSTICS.json','PUBLIC_CHECKOUT_HASH_PROOF.json']:
    shutil.copyfile(run/name,artifact/name)
verification=[dict(name=p.stem,**json.loads(p.read_text())) for p in checks.glob('*.json') if
    isinstance((v:=json.loads(p.read_text(encoding='utf-8'))),dict) and 'command' in v]
(artifact/'VERIFICATION.json').write_text(json.dumps({'modelRunSourceSha':registration['sourceSha'],'postRunFixSha':postfix,
 'checks':verification,'notes':['Failed RED/build/typecheck/lint commands retained, never called PASS.',
 'COD36/BANK36 on00b28255; qualified N4 COD1/BANK1 on9e352f38; final privacy correction has DB71/worker291 and build/lint verification; no new model run.',
 'Operator stopped the exact Node process after persisted attempt5; stateful raw report retains incomplete status. Exact artifact-identity orphan cleanup is separate.']},ensure_ascii=False,indent=2),encoding='utf-8')
specs={}
for name in ['docs/specs/c3-single-agent-commerce-architecture-20261004.md','docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md',
 'docs/specs/c3-phase-b-tool-history-fix-plan-20261025.md']:
    specs[name]={'sha256':hashlib.sha256((repo/name).read_bytes()).hexdigest(),
      'lastGitCommit':subprocess.check_output(['git','log','-1','--format=%H',registration['sourceSha'],'--',name],cwd=repo,text=True).strip()}
(artifact/'PROVENANCE.json').write_text(json.dumps({'implementationBaseSha':'00ffd3ee9075774ed7be13605a07d505886010cd',
 'programImplementationBaseSha':'296cdcfbf5759f5bf9cbb24acf3dc63005589361','bRunSourceSha':registration['sourceSha'],
 'postRunFixSha':postfix,'postRunFixProviderGenerations':0,'specs':specs,
 'stop':'OFFLINE_PRIVACY_REGRESSION; source was clean at operator stop; postfix committed after all model dispatch stopped.',
 'limits':['Stateful end-of-job source assertion did not execute after boundary stop; preceding completed jobs have source assertions and all retained requests are bound to9e352f38.',
 'No independent review completed; no remote CI/merge/deploy/live send/full A qualification.']},ensure_ascii=False,indent=2),encoding='utf-8')
items=json.loads((run/'PRIMARY_INPUT.json').read_text(encoding='utf-8'))
reviews={x['caseId']:x for x in json.loads(primary)['cases']}
lines=['# Tool/history campaign — 21 actual customer outcomes','',
 '**STOP.** 21/51 native, 30 NOT_RUN; scoped controls17 complete. Model source9e352f38, post-run privacy fix94cb6b08 was not model-tested.','']
for i,a in enumerate(items,1):
    text=a['runtime'].get('latest') or '\n'.join(x.get('text','') for x in a['runtime'].get('messages',[]))
    lines.extend([f"## {i}. {a['caseId']}",'','Khách: '+text,'',f"Actual terminal: {a['terminal']['disposition']} / {a['terminal']['reason']}",'',
      '```text','\n'.join(a['actualCapturedMessages'] or []),'```','',
      'Ảnh capture: '+str(len(a['attachments'] or [])),'',reviews[a['caseId']]['verdict']+': '+reviews[a['caseId']]['wholeTurnReason'],''])
    if a['caseId']=='stateful-request-checkout':
        lines.extend(['Public code-owned text verified by transport hash: “Chị cho em tên người nhận nhé.” Raw redacted capture retained above.',''])
(artifact/'CONVERSATIONS.md').write_text('\n'.join(lines),encoding='utf-8')
summary='''# Checkpoint B — tool/history campaign, 25/10/2026

**Recommendation: STOP. B chưa GO.** Run closed after an offline privacy regression was found; no automatic second run.

- implementationBaseSha: `00ffd3ee9075774ed7be13605a07d505886010cd`.
- bRunSourceSha: `9e352f382e8915d6a1f1c080c75817065da42c63`.
- Post-run privacy fix: `94cb6b089321d65cff57d810eb6ad2b3c74627ca`; verified locally, **0 provider generations on this fix**.
- Owner: Vertex/global `gemini-3.5-flash-lite`, version same alias, HIGH, candidateCount1/plaintext/max8192, default temperature/topP, timeout90s, retry0. Verifier: Codex logged-in `gpt-6.1-sol` HIGH, CLI0.159.2 bounded Responses relay, tools[], max1 upstream/generation, timeout90s, retry0. Exact configuration/prompt/schema/corpus hashes in REGISTRATION/PROVENANCE.

## Population and observed result

Registered51 native +17 scoped controls, N1. Completed21 native +17 controls;30 native NOT_RUN (10 unfinished prefix +20 remaining). No native B1 cases were dispatched. The stateful journey stopped after its fifth completed/captured turn; private intake/final confirmation not exercised in this campaign.

Controls PASS:8SAFE all eligible,8UNSAFE all blocked, one unscored probe PASS. **zero observed send-eligible false PASS** on the8 registered unsafe controls under this frozen configuration; this is not full A2/A3 or a claim about all language/privacy inputs. Probe differs from the prior run and remains unscored evidence.

Native:19 SEND_ELIGIBLE (18 direct PASS +1 receipt-backed cart summary),1 static fallback,1 model NO_SEND with an actual code checkout prompt. All21 have capture; silent customer turns0. Fallback rate1/21=4.76%, handoff0, model NO_SEND1/21=4.76%; customer silence0. Do not equate19 eligible with19 good sales replies.

Whole-turn self-review:12 useful,5 useful with polish,2 need editing,1 task failure,1 fallback. Descriptive review, not a promotion threshold. Reasons and exact actual outcomes in PRIMARY_REVIEW/CONVERSATIONS. One discovery semanticDiagnostic was inadvertently exposed by the first primary projection; subsequent projection excludes diagnostics, and no fully blind review is claimed for that case. Other rejected-draft diagnostics were read after locking primary hash `422e765ddce28fbc845a91e97677490d28af668b53464c24d33588f5934784c0`.

## What changed and what happened

1. **Offer discovery:** source offer IDs reach owner after search without binding all price/stock variants. Current discovery performed one search, state update and two explicit SET_QUAN reads; both reads OK, no SUBJECT_BOUND/OWNER_TOOL_MODE. It generated a final draft, but verifier rejected “không lo bị bó bụng” without individual SIZE_FIT. Customer still received fallback. Tool-completion progress does not close sales feasibility; draft also offered two options rather than settling the recommendation.
2. **Image history:** durable accepted assets now reach the next request. Asking the price again sent no duplicate images. Explicit subsequent request for whole-set pictures still resent images; requesting close embroidery then sent a different detail asset. These are N1 functional observations with supporting deterministic tests, not stability proof.
3. **Caption/evidence:** actual detail caption was retained; transport SHA256 is captured before redaction. The checkout prompt was over-redacted by the existing NAME rule, but its exact public code-owned text was verified by hash. This proves that public prompt only, not reconstruction of private values.
4. **Privacy regression:** the initial street disambiguation relied on proper casing/frames and failed bare lowercase street values. Offline diagnostic found redaction unchanged and isPrivateCommerceText=false. No real customer input was used in that diagnostic; actual81 wires were scanned without evaluator/private-fixture leaks. Nevertheless readiness failed, so dispatch was stopped at a persisted attempt boundary, not patched/retried under the old identity.
5. **Post-run fix:** standalone street declarations, abbreviations and location frames now remain private regardless of casing; full product-caption sentences still survive. Ambiguous short fragments beginning with a street token can be conservatively hidden. No construction-word whitelist, case IDs or benchmark phrase exceptions. Do not claim generic Vietnamese parsing or perfect DLP. This corrected source has not been model-qualified.
6. **Remaining owner weaknesses:** gallery color binding failed, retry arguments were rejected, then owner changed the subject to price/size instead of fulfilling/explaining the image request. Concern about lace still receives lengthy adjective/material reassurance and late options. Correction acknowledgement still reports profile fields in parentheses. Prompt/models/verifier/rubric were unchanged (ADVICE_NO_INTERVENTION); no claim that code fixes improved voice.
7. **Recovery:** variant/quantity mutations committed correctly; a later snapshot change invalidated the old PASS. Code delivered the actual receipt-backed cart summary once. Do not call this an owner/verifier success, loosen snapshot equality, or rewrite after FAIL.

## Operations and verification

81 actual generation requests =44 owner +37 verifier; maximum1 upstream per generation; automatic retry0; reported provider timeout/error0. Operator process termination is separate from API errors. Retained wires81/81 pass label/privacy-fixture firewall; no extra unaccounted generation wire observed. Reported input557565/output34086 tokens; cost NOT_EXPOSED.

Verifier latency p50/p95:5.842/15.049s (n37). Verification stage including readback:9.890/24.558s (n20). Captured-turn elapsed p50/p95:48.000/73.801s (n21). Isolated PostgreSQL via SSH and capture Meta transport; these are not production latency, first-token, conversion or a controlled added-E2E estimate.

Observed RED retained: offer metadata missing, missing receipt reader, benign caption redacted, unavailable history treated as first contact, lowercase street regression. Final privacy correction: worker291, database71, worker build/lint PASS. Prior checks include Node95, protected/replyassembler21, DB typecheck/build and worker typecheck; exact commands/failures in VERIFICATION. PostgreSQL COD36/BANK36 ran on00b28255; final pre-run N4 COD1/BANK1 on9e352f38. Later nullable-history delta had135 targeted tests/build/type checks. PostgreSQL was not rerun after privacy correction; do not reuse pre-run DB source labels for94cb6b08.

Four deterministic test DBs dropped. Three native jobs cleaned normally; interrupted stateful DB was independently verified by its exact candidate artifact identity and dropped with audit. Original incomplete stateful report retained unchanged, cleanup proof separate. No remaining campaign test DB known. No remote CI result claimed.

Structural delta: bounded source metadata read, one durable accepted-media projection and shared privacy rules; zero semantic roles/layers, no third model, semantic router/parser, repair/reverify loop, response templates or production entrypoint wiring. A remains OWNER_BYPASS. No publish/merge/deploy/live send or automatic next campaign.

## Delivery and limits

Current code includes the post-run privacy correction; the model evidence belongs to9e352f38. Keep the independently verified offer/media changes, retain STOP and qualify the corrected source in a separately registered run before promotion. Source availability, owner usefulness, verifier protected-language acceptance and code privacy are reported separately. B1 remaining20, final3 stateful turns, negotiation3 and four B1 prefix cases were not run; no whole Phase B acceptance or stability claim.
'''
(artifact/'CHECKPOINT_B.md').write_text(summary,encoding='utf-8')
(artifact/'.gitattributes').write_text('/raw/** -text -whitespace\n/checks/** -text -whitespace\n/source/** -text -whitespace\n/frozen-inputs/** -text -whitespace\n/*.json -text -whitespace\n',encoding='utf-8')
hashes={str(p.relative_to(artifact)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
 for part in ['raw','checks','source','frozen-inputs'] for p in (artifact/part).rglob('*') if p.is_file()}
(artifact/'RAW_HASHES.json').write_text(json.dumps({'bRunSourceSha':registration['sourceSha'],'files':hashes},indent=2),encoding='utf-8')
patterns=[rb'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----',rb'ya29\.[A-Za-z0-9_-]{20,}',rb'Bearer [A-Za-z0-9._-]{24,}',rb'sk-[A-Za-z0-9]{24,}']
hits=[rel for rel in hashes if any(re.search(p,(artifact/rel).read_bytes()) for p in patterns)]
assert not hits, 'SECRET_PATTERN_HITS:'+str(hits)
print(json.dumps({'artifact':str(artifact),'hashedFiles':len(hashes),'secretPatternHits':len(hits),'recommendation':'STOP'}))
