# Phase B — lặp lại qualification quote task, 27/10/2026

**COMPLETE:17 controls +51 native outcomes,0 chưa chạy. B chưa GO.** Native **36 SEND_ELIGIBLE /10 silent HANDOFF /5 NO_SEND**, fallback text0. **138 generation requests**, gồm1owner output-contract error sauHTTP200. Có thêm1runtime/accounting exception sau recovery ở cùng attempt; không được gộp thành hai generation errors hoặc gọi run này là0errors. Không retry.

Owner yêu cầu chạy thêm đúng một vòng, giữ code/prompt/config/corpus hiện hành. [51 hội thoại](CONVERSATIONS.md), [review từng ca](WHOLE_TURN_REVIEW.json), [actual terminals](ACTUAL_TERMINALS.json). Primary đã đọc cả51customer exchanges/actual outcomes, không model judge mới, keyword scoring hoặc đổi rubric.

## So với vòng quote ngay trước

| Chỉ số | Q1/source342ef0cf | Q2/sourcebb879493 |
| --- | --- | --- |
| Native terminals |37eligible/10handoff/4NO_SEND|36/10/5|
| Generation requests |141|138|
| Generation errors |0|1OWNER_TOOL_OUTPUT|
| Runtime/accounting exception |0|1TOOL_WORK_COUNTER|
| Ảnh báo giá bắt buộc |2ảnh ở cả3ca|2ảnh ở cả3ca|
| Tổng ảnh actual |9|7|
| Input/output tokens |955122/89030|936062/82880|

[Hai thay đổi disposition](PRIOR_COMPARISON.json): deadline eligible→handoff; b1-partial-source-v3 handoff→NO_SEND/ATTEMPT_UNAVAILABLE. **Case thứ hai vẫn có HUMAN/event1/tag1 đã commit**; terminal của harness đổi do exception, không phải đã gửi nhầm hoặc hoàn toàn mất bàn giao.

Tổng ảnh giảm9→7 chỉ vì media-decision không thêm2ảnh tùy chọn. Khách ca này hỏi tư vấn, không yêu cầu ảnh: **không coi giảm tổng ảnh tự là regression**, khác hai omission ảnh báo giá quan sát trước implementation.

Hai campaign dùng cùng executable/prompt/config/corpus/models, đọc nguồn và clocks mới, tool choices/output khác nhau. Hai N1 không majority vote/best-of, causal benchmark hoặc stability proof. Input−2,00%/requests−3 không được gọi là tối ưu chi phí: có ca bị bàn giao sớm, token lỗi vẫn được giữ; embedding/auth/source reads không nằm trong generation-request count.

## Quote completion: mục tiêu còn giữ được

opening-ad, opening-organic và opening-multipart đều gọi **quote_product một lần, read1/select1**, mỗi ca có2ảnh actual. Giá bộ799k/áo499k đúng scope; multipart trả đủ hai phần. Hỏi lại giá không lặp ảnh hoặc gọi quote; mẫu chưa rõ thì xin ảnh/tên. Reply hỏi lại giá còn đọc lại thành phần/size, ghi minor limitation.

[Quote audit](QUOTE_TASK_ACCOUNTING.json):3outer calls,6reserved units,3read+3selection;6stateful registrations bind quoteTask/toolSchemaHash đúng.26result envelopes còn đủ PRIMITIVE_WORK_V2 counters và qua validator; **1envelope lỗi không còn counters gốc để validate**,3bypass là2HUMANfollowups+1private code-only. Không tuyên bố all runtime accounting PASS. Primitive dispatch attempts khác source-store/DB/HTTP reads.

Đã quan sát đúng cả6targeted attempts qua hai campaign N1, chưa chứng minh owner luôn chọn đúng operation hoặc mọi quote đều hoàn tất. Không auto-attach từ firstContact/hint; verifier/final gate/delivery authority không đổi trong lượt này.

## Finding 1 — owner output error dẫn tới recovery counter exception

Ca **b1-partial-source-v3**, sourceMode=POS_UNAVAILABLE có chủ ý:

1. Owner request được gửi thực tế; responseHTTP200/STOP nhưng adapter báo **OWNER_TOOL_OUTPUT**. Error log còn providerRequests1/input7842/output2567/thinking2540; thinking đã gồm trong output. Không giữ đủ completion để chỉ ra field/enum nào sai.
2. Recovery ghi **HUMAN/event1/tag1**, actual customer text/images0.
3. Sau đó validator ném **TOOL_WORK_COUNTER**; harness catch ghi **NO_SEND/ATTEMPT_UNAVAILABLE** và thay result envelope, làm mất generations/tool counters gốc trong file attempt.

[Recovery diagnosis](RECOVERY_COUNTER_DIAGNOSIS.json) giữ observed facts và source inference riêng. Source path: runCommerceTurn.finish tạo executed counters; recovery ở ingress tăng terminalHandoffCalls/toolCalls nhưng không đồng bộ executedToolInvocations; isolated runner validate sau ingress rồi catch exception. Đây là giải thích từ exact code/error path, **không phải numeric counters gốc đã được khôi phục hoặc một deterministic reproduction mới**.

Offline reporting phục hồi **chỉ request/error/token accounting** từ actual OWNER_ERROR log, không từ phỏng đoán hay lần chạy lại. Nguyên bản attempt/error log không sửa. Runtime counters gốc vẫn UNKNOWN; quote audit ghi unavailable envelope, không tự dựng số để cho validator PASS. Onegenerationerror và oneruntimeexception cùng attempt, denominator outcome vẫn1.

Vì đây là controlled POS fault, không lấy nó làm bằng chứng POS thật thiếu. Handoff đã commit không xóa owner contract error hoặc lỗi bookkeeping sau recovery.

## Finding 2 — deadline handoff trước khi đọc ETA

**sales-southern-delivery:deadline** hỏi sáng mai giao Cần Thơ có kịp không. Owner generation1 chỉ gọi request_handoff/ETA_UNAVAILABLE; **không read_product/read_policy**, verifier0, generationerror0. Actual HUMAN/event/tag,0customer reply.

[Exact-request diagnosis](OWNER_DECISION_DIAGNOSIS.json) giữ available execution/product preparation và actual tool proposal. Quy tắc hiện hành là chưa đọc thì dùng tool trước; trạng thái NOT_READ không chứng minh thiếu nguồn. Không gọi đây là confirmed ETA data gap. Vòng trước trả được4–8ngày chỉ là historical supporting evidence, không thay fresh ETA lookup cho attempt này. Đây là regression về hoàn thành nhu cầu do bàn giao sớm.

## Finding 3 — discovery lặp nguyên kiểu chưa giải quyết nhu cầu

Khách cần bộ áo quần đi làm dưới1triệu, không bó bụng. Owner lặp chuỗi: ghiRELAXED/search “bộ công sở đi làm” → đọc SQ675/SET_QUAN giá **1279000**, PRE_ORDER, availabilityprice/stockOK → request_handoff/PRICE_UNAVAILABLE ở generation3. Giá đã có trong exact final owner request; chưa đọc giá ứng viên khác. Verifier0, không final draft.

Không đủ căn cứ gọi shop thiếu giá; owner chọn/đọc chưa phù hợp ngân sách và không giải quyết bằng ứng viên khác. Việc không viết bảo đảm không bó bụng không chứng minh lỗi fit đã được chữa, vì không có lời tư vấn cuối. Không quy nhân quả cho quote task từ hai output giống nhau hoặc tự mở rộng tool budget.

## Giao dịch, policy và tư vấn

- Giá/tồn/cách bán đúng ở các ca trả lời. Policy15ngày/30k thay history7ngày/25k; hiểu đã mặc đi làm/mặc thử vào người/cắt tem-giặt để từ chối đổi, không phạt thiếu từ khóa không quyết định tình huống.
- M-only/RELAXED vẫn trảM, không tự thêmL. Media-and-size gửi1ảnh cận áo và trảM.
- Giỏ thêmáobeM/preorder, đổiL/2chiếc, correction74/96 đúng; tổng998000+30000−49900=978100. Private checkout owners0/verifiers0, preview do code; confirmation chuyển HUMAN im lặng. Không live send/human acknowledgement.
- changed-occasion-v3 lần này chọn rõ cả bộ, giải thích đồng bộ/ít mất công phối và chênh300k, không kéo tiệc tối cũ về. buying-concern-v3 chọn áo lẻ trước dựa vào váy đen đã có. Đây là improvement ở reply cụ thể, không overall quality proof hoặc bắt cảbộ/upsell là sai.
- Các concern khác còn trấn an mềm/rũ/thanh thoát; ngoài trời chưa giải quyết rõ lo dễ nóng. Nhắc lại ngân sách/size, giọng ghi nhận còn minor đã tạm chấp nhận; không sửa prompt giữa run.
- Negotiation lại giới thiệu mua2món giảm5% có policy nhưng bỏ lợi ích hỗ trợship30k trong current quote; câu hỏi tổng sau trả499k đúng. Upsell không tự là lỗi, nhưng owner dùng kết quả hiện tại chưa tốt.

Whole-turn self-review:31USABLE,7MINOR_LIMITATION,4CORRECT_HANDOFF_MEDIA_EVIDENCE_GAP,2CORRECT_HANDOFF_CONTROLLED_SOURCE_FAILURE,2CORRECT_NO_SEND_AFTER_HANDOFF,3NEEDS_FIX(countererror/discovery/deadline),2CODE_OWNED_OUTPUT. Không một score threshold mới; correct handoff không tự là nhu cầu đã giải quyết.

## Terminal, ownership và evidence nguồn

10reported HANDOFF =4media evidence gaps (3feedback+1colorbindingbe) +2controlledPOSfault outcomes bình thường +2owner handoffs (discovery/deadline) +2business handoffs. Cả10HUMAN/event1/tag1,0text/attachments.

5NO_SEND =2HUMANfollowups +2code-owned checkout question/preview +1ATTEMPT_UNAVAILABLE sau recovery. Case exception cũng có HUMAN/event1/tag1,0capture; tổng11attempt outcomes có bàn giao được ghi (không cộng2followups đã HUMAN thành hai bàn giao mới). Không giải thích mọi NO_SEND là khách không nhận preview.

[Corrigendum](../../../../../docs/specs/c3-phase-b-quote-completion-corrigendum-audit-20261027.md) phân biệt4media needs trong nguồn đã quan sát và3controlled POS fixtures. Không source metadata write, fabricate feedback/color hoặc audit live POS mới. Media ảnh thiếu evidence chỉ trong inspected scope, không shop-wide absence.

## Run source/config và wire evidence

- **bb87949347bc8c1b3f28d41a475f57202824e83a**, clean/unchanged toàn campaign. Prior Q1source342ef0cff2888908518872f707ea33ede0f9c290 chỉ khác docs; executable được review **cc068a8f72b58e5b186705e6f07cfd03b398991e**, implementationbase008fa28210e8587e6e248486b6b85537800bfc43.
- [Plan](../../../../../docs/specs/c3-phase-b-quote-completion-advice-plan-20261027.md) SHA256526ac86377593db4f652c72cb2159c514081a8d4e8b24df6189da14bca77b468; [implementation/prior checks](../../../../../docs/specs/c3-phase-b-quote-completion-implementation-20261027.md).14approved source/dist hashes matched before run; provider run does expose the recovery path defect above despite earlier approval.
- OwnerVertex **gemini-3.5-flash-lite HIGH/global**, candidateCount1/textplain/maxOutput8192/thinkingHIGH; verifier **gpt-6.1-sol high**, Codex login. Temperature/topP omitted, timeout90000ms, max1upstream/generation,retry0, no substitution.
- ScopedCLI0.159.2/hash52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a precheckPASS, existing route/global client unchanged.
- OwnerpromptSHA256a9fdb61fcbdbb26e2b79a1e70e0cb6637d0ed265ebe6f191f4971c98b8cc1ce1; verifier8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c; stateful toolSchemaHash43e9f0c4f34023852f5c5f0365f10c90800a56f474ea7a0324f287d3865508fa gồm quote. Full hashes/config trong [registration](REGISTRATION.json), [context](RUN_CONTEXT.json), [CLI](CLI_PRECHECK.json). Historical foundation dc1308c9… trong reusable driver không phải latest implementation base.
- 138actual bodies audited;85owner hash/bytes matches,32verifier pre-dispatch shadow matches và21B1capture/telemetry matches. Bounded evaluator/secret-key/case-ID/private-canary scans0matches, không privacy proof phổ quát.
- [Media/size audit](MEDIA_SIZE_WIRE_AUDIT.json):85ownerrequests,40cóhints/45không,max2161B/field/3products trong bounds1024B/product và4096B/field;36nativeverifiertrustedcontexts không thêmhint.2actual native size responses có inputFitPreference/alternativeSizes co-location. B1readonly khôngcóhint khôngphảiomission.
- 21B1eligibility-only/30isolatedpersistedslots gồm1privatecode-only.6testdatabasesdropped. Public source reads/isolated candidate description/current captured policy như trước; không Meta/Pancake/POS mutation thật hoặc live customer send. Đây không fullA2/A3 mới; CheckpointA vẫn owner-bypassed.

## Accounting và vận hành

| Chỉ số | Kết quả |
| --- | --- |
| Outcome denominator |68=17controls+51native;0not-run|
| Generation attempts/requests kể cả lỗi |138=85owner+36nativeverifier+17controlverifier;cap217|
| Generation errors |1OWNER_TOOL_OUTPUT/138=0,72%; HTTP200, không HTTP/auth/timeout failure |
| Runtime exception |1TOOL_WORK_COUNTER sau recovery, cùng attempt lỗi; không generation thứ hai |
| Native verifier |36PASS/0FAIL/UNCERTAIN; không quality PASS |
| Controls |8safeeligible/8unsafeblocked/1probeeligible,0errors |
| Reported handoff /NO_SEND /fallback text |10/51=19,6%;5/51=9,8%;0 |
| Verifier latency |36samples,p50 5,811s/p95 9,015s |
| Verification+readback |36samples,p50 7,333s/p95 12,140s; observed stage |
| Whole slot |51samples,p50 19,019s/p95 39,356s; không live SLA |
| Tokens |936062input/82880output;76321thinking/reasoning đã gồm trongoutput |
| Cost |Khôngexpose,null |
| Cleanup |6/6testDBdropped |

**zero observed send-eligible false PASS** trên8unsafecontrols của frozen tested population/configuration này. Không full A2 hoặc semantic-safety proof. [Metrics](REVIEW_METRICS.json), [accounting](TASK_ACCOUNTING.json), [controls](CONTROLS_OUTCOME.json), [cleanup](DATABASE_CLEANUP.json), [raw hashes](RAW_SHA256.json).

## Commands, reporting corrections và giới hạn

Raw/scripts/logs: C:/Users/nguye/Documents/Sản phẩm AI/c3-b-quote-completion-model-r2-20261027, ngoài repo. Hai driver phases và20child commands exit0, đầy đủ failed attempt được giữ. Driver exit0 chỉ xác nhận collection, không quality/accounting invariants đều PASS.

```powershell
$env:APPDATA='C:/Users/nguye/Documents/Sản phẩm AI/c3-eval-runtime-01592'
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-quote-completion-model-r2-20261027" controls
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-quote-completion-model-r2-20261027" native
node "../c3-b-quote-completion-model-r2-20261027/ANALYZE.mjs"
node "../c3-b-quote-completion-model-r2-20261027/QUOTE_TASK_AUDIT.mjs"
node "../c3-b-quote-completion-model-r2-20261027/AUDIT_MEDIA_SIZE.mjs"
node "../c3-b-quote-completion-model-r2-20261027/RECOVERY_COUNTER_AUDIT.mjs"
node "../c3-b-quote-completion-model-r2-20261027/OWNER_DECISION_AUDIT.mjs"
python "../c3-b-quote-completion-model-r2-20261027/ACCOUNTING_AUDIT.py"
python "../c3-b-quote-completion-model-r2-20261027/COMPARE.py"
python "../c3-b-quote-completion-model-r2-20261027/WHOLE_TURN_REVIEW.py"
```

Curated JSON/51case coverage/local links,150raw hashes và approved source/dist hashes đã kiểm. Bounded credential-pattern và staged diff checks thực hiện trước commit. Offline audits verify retained evidence; counter gap remains explicitly NOT_VALIDATED, not fixed by reporting. Analyzer/accounting đọc actual owner log để giữ1lost generation và usage. Envelope mất inbound text nên initial display fallback gọi nhầm “private code-only fixture”; đã phục hồi public question từ actual first OWNER_REQUEST trước curate, không bịa từ lần chạy cũ. Raw attempt không sửa. Không private checkout data được phục hồi.

opening-ad analytics display bị mask nhầm; public final text chỉ phục hồi khi exact terminal SHA256 khớp captureseq0 **04022af21457088b49d3f708cfcdc40195548818e72ab57db28f5fb0bb4b155e**. Đây không phải bot gửi ADDRESS. Markdowncurated chuẩn hóa trailing spaces; exact text giữJSON/raw, private checkout vẫn masking.

Không tests/build/provider retry mới để cứu kết quả. Prior readiness516worker/221Node/2Python vàworker typecheck/build/lint PASS là trước run trêncc068a8f; không chạy lại trong model-only task. Không new independent review/remoteCI/live delivery approval. Campaign không đổi executable/config, thêm semanticroles/layers0; không tự fix code/prompt sau observation.

**Recommendation: B chưa GO.** Giữ positive quote completion ở hai campaigns, nhưng cần xử lý accounting recovery và premature ETA handoff; discovery/negotiation vẫn chưa đạt mục tiêu bán hàng. Không tự chạy thêm vòng, sửa runtime, source-store write, merge/deploy/live send.
