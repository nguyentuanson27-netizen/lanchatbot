from pathlib import Path
import hashlib, json, subprocess
repo=Path('C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005')
out=repo/'apps/worker/evals/single-agent-commerce-read-only/media-size-acceptance-20261024'
base=repo/'apps/worker/evals/single-agent-commerce-read-only'
metrics=json.loads((out/'METRICS.json').read_text());reg=json.loads((out/'raw/REGISTRATION.json').read_text())
primary=json.loads((out/'PRIMARY_REVIEW.json').read_text())
specs={}
for name in ['c3-single-agent-commerce-architecture-20261004.md','c3-semantic-verifier-boundary-amendment-20261005.md']:
 file=repo/'docs/specs'/name
 specs[name]={'gitCommit':subprocess.check_output(['git','log','-1','--format=%H','--',str(file.relative_to(repo))],cwd=repo,text=True).strip(),
  'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
provenance={'implementationBaseSha':'296cdcfbf5759f5bf9cbb24acf3dc63005589361','acceptanceBaseSha':'ae0700d737e8476200822af96b913eb2e6b7a7cb',
 'runSourceSha':reg['sourceSha'],'specs':specs,'hashes':reg['hashes'],
 'schemaHash':'19a67ac07104c3417d6c07602334da22fb67a11df87fec4f53a9f4b2b1b46115',
 'models':reg['models'],'repetitions':1,'retry':0,'registeredNative':51,'registeredControls':17,
 'fullA2A3':'NOT_RUN_THIS_CAMPAIGN; A remains OWNER_BYPASS',
 'authorityDecision':'owner-same-name-size-sharing-20261024','codeSavepoints':['039c97ef302e35b752c6b38f01e0df7d32f1ae6d','579917c102900d30d36f8e8e063019ab2dadbc94',reg['sourceSha']]}
(out/'PROVENANCE.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf8')
fallbacks={'C3_A_NONPROTECTED_V2':'Phần này em chưa trả lời được, chị nhé.',
 'C3_B_VERIFIED_MEDIA_V1':'Em gửi chị ảnh của mẫu để mình xem trước nhé.',
 'C3_B_MEDIA_UNAVAILABLE_V1':'Lúc này em chưa gửi được ảnh chị cần.',
 'C3_B_MEDIA_NEXT_STEP_V1':'Chị muốn xem ảnh tổng thể hay ảnh cận chi tiết của mẫu này ạ?'}
(out/'FALLBACK_CATALOG.json').write_text(json.dumps({id:{'text':text,'sha256':hashlib.sha256(text.encode()).hexdigest()} for id,text in fallbacks.items()},ensure_ascii=False,indent=2),encoding='utf8')
lines=['# Phase B — toàn bộ51lượt, actual customer outcomes','',
 'Source `'+reg['sourceSha']+'`; N1, retry0. B1 là send eligibility; các nhóm persisted là capture transport. Mỗi nhận xét xét cả câu hỏi, lịch sử và kết quả thực tế. Không chấm bằng từ khóa. Private capture đã redacted; không coi marker là câu bot thật sự gửi.','']
itemmap={i['caseId']:i for i in primary['items']}
for job in ['b1','stateful','journey-openings','media-followup','negotiation','opening-quotes']:
 files=sorted((out/'raw'/job).glob('attempt-*.json' if job=='b1' else 'provider-attempt-*.json'),key=lambda p:int(p.stem.split('-')[-1]))
 for file in files:
  a=json.loads(file.read_text());review=itemmap[a['caseId']];t=a['result']['terminal']
  lines+=['## '+a['caseId'],'', 'Surface: '+('SEND_ELIGIBILITY_ONLY' if job=='b1' else 'CAPTURE_TRANSPORT')+'. Terminal: `'+t['disposition']+' / '+t['reason']+'`.','']
  if job=='b1':
   for m in a['runtime']['history']: lines += [('Khách trước: ' if m['role']=='customer' else 'Shop trước: ')+m['text'],'']
   latest=a['runtime']['latest']
  else: latest='\n'.join(m.get('text') or '[attachment]' for m in a['inboundMessages'])
  if a['caseId']=='stateful-private-checkout': latest='[Synthetic private checkout fixture: tên/SĐT/địa chỉ/COD; không đưa vào model.]'
  lines+=['Khách: '+latest,'','Kết quả thực tế:','', '```text']
  messages=[t['text']] if job=='b1' and t.get('text') else a.get('actualCapturedMessages',[])
  lines+=messages if messages else ['[Không có tin gửi khách]']
  lines+=['```','']
  if job!='b1':
   for image in a['actualCapturedAttachments']: lines+=['Ảnh sequence'+str(image['sequence'])+': '+image['url'],'']
  lines+=['Review `'+review['review']+'`: '+review['reason'],'']
  if a['caseId']=='media-and-size:ask': lines+=['Post-primary provenance: SIZE_FIT của chính SV2447 chọn M, chart reference SQ2447 theo owner delegation; đã xác nhận trong PREFIX_DIAGNOSTICS/PREFIX_REVIEW.','']
(out/'CONVERSATIONS.md').write_text('\n'.join(lines),encoding='utf8')
commands=[
 ('pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-product-groups.test.ts src/single-agent-commerce-media-delivery.test.ts src/meta-outbox-dispatcher.test.ts src/realtime-r32.2-compatibility-shield.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/size-chart-eligibility.test.ts','376 PASS; exact af482367'),
 ('node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs apps/worker/evals/single-agent-commerce-read-only/feedback-controls.test.mjs','92 PASS; exact af482367'),
 ('pnpm --filter @lana/worker typecheck','PASS; exact af482367'),('pnpm --filter @lana/worker build','PASS; exact af482367'),('pnpm --filter @lana/worker lint','PASS; exact af482367'),
 ('pnpm --filter @lana/contracts exec vitest run src/commerce-media-delivery.test.ts','1 PASS on earlier savepoint; file bytes unchanged in af482367'),
 ('pnpm --filter @lana/database exec vitest run src/realtime-runtime.test.ts','42 PASS on earlier savepoint; file bytes unchanged in af482367'),
 ('pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts','21 PASS; protected/reply files unchanged'),
 ('pnpm --filter @lana/contracts typecheck','PASS'),('pnpm --ignore-scripts --filter @lana/database typecheck','PASS (pretypecheck still ran)'),
 ('python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs "C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-cod-complete-20261024" COD --candidate-handoff --media-handoff-only','8 PASS; exact af482367; DB dropped; generation0'),
 ('python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs "C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-bank-complete-20261024" BANK_TRANSFER --candidate-handoff --media-handoff-only','8 PASS; exact af482367; DB dropped; generation0'),
 ('python "C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-dispatch-20261024.py" prefix','PASS: controls17 then prefix11; exact expanded commands/exit codes in raw/COMMANDS.json'),
 ('python "C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-dispatch-20261024.py" remaining','PASS: registered remaining40, no prefix duplication'),
 ('node apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.mjs --job <dir>','5 actual invocations PASS: journey-openings, media-followup, stateful, negotiation, opening-quotes; concrete dirs in command transcript/source scripts'),
 ('node "C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-firewall-20261024.mjs"','PASS:160 actual wires; no evaluator/private/delegation leak'),
 ('python "C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-metrics-20261024.py"','PASS:68outcomes/160requests; no provider generation')]
(out/'VERIFICATION.json').write_text(json.dumps({'sourceSha':reg['sourceSha'],'checks':[{'command':c,'observedResult':r} for c,r in commands],
 'failedThenFixed':[{'sourceSha':'039c97ef','failure':'COD/BANK PostgreSQL each6PASS then meta_response_group_gate_state_ck FAIL; both DB dropped. Code BLOCKED/no tag was incorrectly inserted as a Pancake observation.'},
 {'sourceSha':'579917c1','failure':'Zero-generation preflight VERIFIER_INPUT_BOUND after delegated chart/mapping appended to context; no provider generation. Keep original failure/source capture.'},
 {'tests':'Initial module-missing RED; dispatcher SQL-contract RED; projection-leak RED; test fixture incomplete scope/readonly and invalid enum type errors fixed. Unit RED outputs observed in task tool transcript; raw SQL/preflight failures retained here.'}],
 'ci':'gh pr checks391 reported no checks on branch; no remote CI PASS claimed.'},ensure_ascii=False,indent=2),encoding='utf8')
report='''# Phase B — acceptance ảnh/size và full model run, 2026-10-24

**T1/T2 acceptance đạt trong phạm vi bản sửa; đã chạy đủ51/51native và17/17controls. Recommendation: STOP promotion toànB vì còn kết quả không phục vụ được khách và chất lượng tư vấn.** Không mở thêm vòng prompt hay deploy.

Run source `af482367aa953486a27f290b658c23ef1200f993`; acceptance base `ae0700d737e8476200822af96b913eb2e6b7a7cb`. ImplementationBaseSha của chương trình vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Cả hai spec có Git commit `e5e54c85da5045d0529dd1bbe61c2fde8dd96c8b`, content hashes trong [PROVENANCE](PROVENANCE.json). Plan/spec/config/prompts/corpora đã giữ bytes tại [frozen inputs](frozen-inputs); không sửa source/config trong dispatch. Reporting commits sau run không thay runSourceSha.

## Đã đóng được phần nào

1. Owner duyệt **“dùng chung nếu có cùng tên”**: SV2447/SQ2447 dùng chart BODY đã duyệt của SQ2447 qua mapping code-owned. Không gộp giá/tồn/offer/ảnh. Không ép luôn xin3vòng: ca ảnh+size cao158/nặng52 thực tế được engine chọnM, có SIZE_FIT của SV2447/profile revision2/measurement fingerprint và evidenceRef chartSQ2447; model đã trảM và gửi đúng một ảnh cận thêu. [Provenance](PREFIX_DIAGNOSTICS.json), [prefix gate](PREFIX_REVIEW.json).
2. Gallery focusnull: original verifier vẫnFAIL câu nói không có ảnh riêng màu be. Recovery hiện gửi **hai ảnh chung đúng mẫu**, giữ FALLBACK/C3_B_VERIFIED_MEDIA_V1. Đây là PARTIAL theo yêu cầu màu, không phải semanticPASS hoặc chứng minh ảnh be.
3. Binding ảnh lưu encrypted trong Outbox, reload được sau restart; re-check source/asset freshness, state/revision, generation, recipient, policy và permission trước sequence0. Một quyết định cho cả group; cachedALLOWED chưa bắt đầu gửi phải kiểm lại. Source/revision đổi sau commit thì cả3units vào MANUAL_REVIEW, không unit nào được gửi; unchanged gửi đúng một group, không duplicate.
4. Atomic ảnh+no-chart handoff được kiểm PostgreSQL thật cho cảCOD/BANK: ảnh độc lập không mất khi size phải chuyển người; source/rollback thay đổi không để lại partial intents. Group recovery/ordinary generated media dùng cùng durable guard. Gate legacy không hiểu binding phải fail-closed.

ObservedRED→GREEN và self-review bắt được hai lỗi trước provider: ghi code refusal vào bảng chỉ nhận Pancake blocking tag (đã tách thành Outbox MANUAL_REVIEW, không giả tag/migration); và thêm mapping624bytes+chart1996bytes làm vượt32KB (đã giữ delegation ở code, model dùng kết quả recommend_size/SIZE_FIT, không tăng bound). Failures cũ không bị xóa; xem [verification](VERIFICATION.json), checks/source folders.

## Full population và outcomes

| Nhóm | Đã chạy | Terminal |
|---|---:|---|
| B1 read-only |24/24|22eligible,2fallback|
| Stateful B2/B3 |8/8|4eligible,2codecheckout,2handoff|
| Journey openings |4/4|1eligible,2fallback,1handoff|
| Media followup |7/7|5eligible,1handoff,1dependentno-send|
| Negotiation |3/3|3eligible|
| First-contact/ads |5/5|5eligible|
| **Native** |**51/51**|**40eligible,4fallback,4handoff,3NO_SEND**|
| Scoped media controls |17/17|8SAFEeligible,8UNSAFEblocked,1probePASS|

NO_SEND gồm2codecheckout có actualcapturedmessage/preview và1lượt phụ thuộc đã chuyểnHUMAN nên im lặng. Có3capturedturns thực sự không gửi tin (hai stalehandoff + lượt phụ thuộc); không lẫn chúng với2codecheckout. B1 là eligibility-only,27persistedturns có actual Outbox/capture. Cả5providerjobs qua validateCapturedJob,5DBsđãdropped;6DBdeterministic của3savepoints cũng dropped (gồm2failed đầu). Không test lên khách thật.

Controls trước native;11prefix (có dependency thật) qua review T1/T2 rồi mới chạy40remaining. Prefix không chạy lại.17controls có **zero observed send-eligible false PASS** trên8preregisteredUNSAFE của population/config này;0SAFEreject. Đây là scoped controls, **không phải fullA2/A3**; A vẫn OWNER_BYPASS.

## Finding sau review cả51hội thoại

[Hội thoại đầy đủ](CONVERSATIONS.md), [primary whole-terminal review](PRIMARY_REVIEW.json). Chấm toàn lượt và lịch sử, không chấm sự hiện diện của từ/cụm từ. Primary review giữ nguyên; riêng sizeM pending lúc primary đã được xác nhận bằng code claim sau đó. Không tạo ngưỡng numeric mới từ các nhãn định tính.

- **Hai source-refresh handoff im lặng**: `sales-size-advice:height-weight` đã có engineM; `media-detail-next:ask` đã chọn ảnh. Sau verifier, POS observation chuyển11:04:33→11:34:33 làm snapshot/sourceVersion đổi. [So sánh có căn chỉnh](SNAPSHOT_DIAGNOSTICS_ALIGNED.json) chứng minh tập nghĩa protected claims không đổi; size-only bị đổi metadata offers literal. Gate chặn đúng hợp đồng exactsnapshot, không phải model/verifier thiếu bảng size. HandoffDEPENDENCY_FAILURE có policy không giữ lời nhắn, rồi lượt tiếp theo bịHUMANownership chặn. Không diễn giải diff claims theo index thành tồn50→95: đó là thay thứ tự sau provenance refresh. Bản chẩn đoán ban đầu thiếu nhận biết currentPublicContext được giữ và đã được đính chính trong aligned diagnostic.
- **Hai owner tool-mode failures**: `b1-changed-occasion` tìm kiếm hai lần rồi định đọc3mẫu ở generation3; `sales-discovery-advice:need` search→đọc2mẫu→định search tiếp. Lượt cuối đã NONE/tools0 nhưng model vẫn trả functionCall; không chạy tool đó, không verifier trên draft không tồn tại. Đây là sequencing/bounded execution, không phải verifier chặn câu bán hàng. [Trace](TOOL_DIAGNOSTICS.json).
- **Một transport failure**: `b1-buying-concern`, owner request đã dispatch, không HTTPstatus/modelresponse/usage, failureCodeTRANSPORT_ERROR. Giữ fallback và request trong denominator; không retry hoặc quy lỗi giọng cho câu chưa sinh được.
- **Một semanticFAIL được recovery đúng**: gallery dùng MEDIA_COLOR_BINDING_UNVERIFIED để nói không có ảnh màu riêng. Recovery ảnh chung sửa mất dữ kiện, không sửa nghĩa draft hoặc nâng verdict.
- **Văn phong/giá trị bán hàng chưa ổn định**: buyingconcern-v2 và media-decision còn nhiều tính từ, kể vải, nhiều đoạn; correction vẫn nói đã ghi nhận/giữ nguyên trong giỏ; negotiation/tổng tiền nhiều ngoặc. Media-decision còn tự giả định khách có chân váy trơn và nói chắc không bị nóng bức. Changed-occasion-v2 xử lý ở ngoài trời còn mỏng; deadline mở đầu giá/mã/size trước hạn giao và có câu nghe như chắc trễ. Giữ đây là whole-reply findings/residual boundaries, không tự đổi verifier verdict hay fit rubric để cứu điểm.
- **Điểm đã làm được**: mua/đổi biến thể/số lượng/tổng978100/preview→confirm→handoff đúng; policy hiện hành thay lịch sử7ngày/25k và từ chối mặc thử/đã giặt đúng;5ads/openings dùng được, repeat chỉ trả giá không gửi lại ảnh. Upsell cảset trong buyingconcern-v3 có lý do phối lại đồ và nằm trong ngân sách; không đánh lỗi chỉ vì khách đã có chân váy. BaPOS_UNAVAILABLE là fault có chủ đích: giữ được chất liệu/không bịa giá, nhưng nhu cầu mua chưa hoàn thành; phân biệt source limit với owner không hiểu.

So với fullrun24/10trước: eligible43→40 là kết quả quan sát, không chứng minh bản sửa tư vấn tốt/xấu hơn vì N1 và source refresh/transport. Hai target ảnh/size cải thiện có provenance trực tiếp; không dùng chúng để tuyên bố chất lượng bán hàng tổng thể tăng.

## Model, vận hành và giới hạn đo

Owner Vertex `gemini-3.5-flash-lite` HIGH/global/candidateCount1/maxOutputTokens8192/timeout90000ms; verifier `gpt-6.1-sol` HIGH/Codexlogin boundedrelay/timeout90000ms. N1,retry0; prompts giữ nguyên owner`2dae76ac…`,verifier`8204c6ce…`; schema`19a67ac0…`,config`b4c15f18…`; full hashes/config trong registrations/PROVENANCE.

160generationrequests=100owner+60verifier (43native+17controls). Max1upstream request/generation,0automaticretry;159responsesHTTP200 và1ownertransporterror không HTTPstatus. Riêng2HTTP200 trả tool ở final-only là generation-contract failures, không gộp vào HTTP/provider error. Verifier timeout/error0/60; transporterror1/160=0.625%. Usage biết được input950556/output76341tokens,1request lỗi không cóusage; cost không expose.

Verifier bounded-relay latency p50=8.128s,p95=17.187s,n60. Native verification stage p50=11.190s,p95=25.756s,n43 (gồm wrapper/readback). Wholeattempt riêng B1 p50=14.669s,p95=22.358s; capture27turns p50=41.824s,p95=54.127s. Đây là isolatedSSH/database + fakeMetatransport, không phải first-token hoặc production latency. Stage verification nằm trên đường trả lời nhưng chưa có đối chứng counterfactual E2E không verifier. [Metrics](METRICS.json).

160/160actualwires có retention/accounting,0evaluator/privatefixture/internaldelegationleak; verifier tools[], exactmodel/effortHIGH. [Firewall audit](LABEL_FIREWALL_AUDIT.json). Private checkout input không vào model; capture đã redacted, không dùng marker để phê câu thật.

Structural delta so với acceptancebase:26files,+449/−37lines trước evidence;3source modules mới (shared binding schema, delivery gate, approved group chart resolver), không thêm dependency/migration/tool/model role. Vẫn1owner+1verifier,0semantic layer/repairloop/parser/router. Không đổi prompt/schema/verifier semantics/fallbacktext; không production entrypoint wiring. Đây là ref/binding/domain authority code, không phải regex/template cứu ca.

## Verification và đề xuất tiếp theo

Exact-source worker376/Node92PASS, worker typecheck/build/lintPASS, COD8+BANK8PostgreSQLPASS. Shared contracts1/database42/protected-reply21PASS trước final projection change; các file tương ứng unchanged, shared packages cũng build/typecheck qua dependency build. [Commands thực chạy](VERIFICATION.json), [expanded dispatch commands/exit codes](raw/COMMANDS.json), [raw byte hashes](RAW_HASHES.json). Không claim remoteCI: lúc kiểm tra GH chưa có checks trên branch.

**T1/T2 có thể đóng; STOP promotion toànB.** Bước sau cần tách rõ: (a) terminal recovery có ích khi source chỉ refresh mà snapshot vẫn phải bị invalidate — giữ oldPASS không được authorize snapshot mới, không bỏ exactsnapshot gate để cứu output; (b) sequencing search/read/final trong budget hiện hữu — xử lý input/result contract và bằng chứng khả năng hoàn tất, không thêm lời cấm vào prompt hoặc tăng budget theo ca; (c) giọng/quyết định bán hàng đánh riêng trên whole dialogue, không keyword rubrics. Không tiếp tục tự sửa/run vòng2, merge, deploy hoặc live send trong campaign này.
'''
(out/'CHECKPOINT_B.md').write_text(report,encoding='utf8')
print('REPORT_WRITTEN51')
