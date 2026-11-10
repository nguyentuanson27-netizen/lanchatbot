# Phase B — vòng lặp lại media/size context, 27/10/2026

**COMPLETE: 17 controls + 51 native outcomes, 0 chưa chạy. B chưa GO.** Native: **37 SEND_ELIGIBLE / 10 silent HANDOFF / 4 NO_SEND**, fallback text 0. Có 143 generation requests, 0 generation errors, không generation retry. Đã đọc đủ 51 hội thoại theo toàn bộ yêu cầu/history/draft/actual terminal; không chấm bằng từ khóa hoặc coi eligible là quality PASS.

Owner yêu cầu chạy thêm đúng một vòng, giữ nguyên executable/config/prompt/corpus. [Toàn bộ hội thoại](CONVERSATIONS.md), [review từng ca](WHOLE_TURN_REVIEW.json), [so sánh vòng trước](PRIOR_COMPARISON.json).

## So với vòng ngay trước

| Chỉ số | R1 | Vòng này R2 |
| --- | --- | --- |
| Native outcomes | 37 eligible / 10 handoff / 4 no-send | 37 / 10 / 4; không ca nào đổi disposition |
| Generation requests | 143 | 143 |
| Generation errors | 2 OWNER_TOOL_OUTPUT sau HTTP200 | 0 |
| Actual images | 7 | 3 |
| Input/output tokens | 971229 / 84835 | 958241 / 89234 |
| Thinking/reasoning, đã nằm trong output | 77652 | 81746 |

Input giảm 1,34%; đây không phải causal formatter benchmark. Hai campaign N1 độc lập, có fresh clocks/public source reads và tool choices khác nhau; không majority vote/best-of hoặc kết luận ổn định từ hai lần.

**Thụt lùi nghiệp vụ dù disposition giống nhau:** `opening-organic` và `opening-multipart` mỗi ca từ 2 ảnh thành 0 ảnh. Owner chỉ đọc sản phẩm rồi FINAL, không gọi `select_product_media`. Actual owner request có generic-match hint; công cụ được cấp và prompt hiện hành đã yêu cầu chọn ảnh GENERIC khi báo giá mở đầu cho mẫu đã biết. Ca ads vẫn gửi 2 ảnh; media-and-size gửi 1 ảnh cận TOP.

[Audit báo giá/ảnh](OPENING_QUOTE_MEDIA_AUDIT.json) xác nhận missing calls, không chỉ dựa vào lời reply. Offline selector trên fresh control capture tìm được 2 generic assets; đây không phải exact native readback từng ca. Hint không cấp quyền gửi ảnh. Không thấy lỗi dữ liệu hoặc provider giải thích việc owner bỏ bước này.

**Root cause trong phạm vi đã quan sát:** nghĩa vụ gửi ảnh mở đầu còn phụ thuộc model chọn đúng chuỗi tool. Semantic verifier xét lời khẳng định; final gate kiểm tài sản đã chọn, nên bỏ chọn ảnh vẫn có thể send-eligible. Đây là thiếu kiểm tra hoàn thành quy trình nghiệp vụ, không phải bằng chứng verifier bỏ lọt một semantic claim. Hướng sửa sau cần bảo đảm nghĩa vụ báo giá hiện hành bằng code/workflow qua selector + readback/receipts sẵn có; không gắn ảnh thẳng từ hint, không thêm ví dụ riêng hay regex. Campaign này chỉ báo cáo, chưa sửa.

## Findings và phân loại trách nhiệm

- **Owner claim cũ vẫn bị chặn:** `sales-discovery-advice:need` viết “mặc thoải mái, không lo bị bó bụng” khi chưa có SIZE_FIT cho khách. Verifier FAIL, actual silent handoff. Không phải provider error; cũng không giải quyết bằng thêm thông tin chất liệu hay nới verifier để bảo đảm độ vừa cá nhân.
- **Hai mục tiêu context còn giữ được trong ca tương ứng:** media-decision trả lời, đưa cách phối áo lẻ, không tự gọi ảnh DETAIL/SKIRT thiếu rồi handoff. RELAXED/M-only trả M, không tự thêm L. Hai vòng quan sát đúng, chưa stability proof. Media-and-size dùng M đúng.
- **Tool validation có tác dụng:** một đề nghị chọn size bị REJECTED/MEASUREMENT_SOURCE_INVALID vì sourceQuote nhiều giá trị (HEIGHT_CM/WEIGHT_KG: QUOTE_MUST_CONTAIN_ONE_VALUE). Owner sửa đối số trong ngân sách tool đã đăng ký rồi nhận M hợp lệ. Đây là bounded tool continuation, không automatic generation retry hoặc semantic repair/reverify. [Serialized tool-turn audit](FINAL_TOOL_TURNS_AUDIT.json) phân biệt envelope REJECTED với kết quả size hợp lệ.
- **Data gaps giữ handoff đúng:** feedback 3 ca, missing POS 3 ca, color-binding 1 ca. Nguồn fresh capture có 11 ảnh nhưng chưa có verified feedback/per-asset color binding; DETAIL/TOP có 1 match, DETAIL/SKIRT không match. Không suy từ nguồn đã đọc thành kết luận shop không có ảnh ở mọi nơi. Không ghi label giả hoặc sửa nguồn.
- **Negotiation dùng kết quả tốt hơn ở reply này:** nêu hỗ trợ ship 30k từ record_negotiation, grand total 499k; vòng trước bỏ qua concession. Đây là một quan sát, chưa khẳng định tuân thủ ổn định.
- **State/quote/checkout giữ đúng:** đổi L và số lượng 2; tổng 998000 + 30000 − 49900 = 978100; correction giữ size khách chọn; private checkout code-only; confirmation giữ receipt/state và chuyển HUMAN im lặng. Không claim human acknowledgement hay delivery live.
- **Policy:** dùng nguồn hiện tại 15 ngày/30k thay history cũ 7 ngày/25k. Các câu đã mặc đi làm/thử vào người/cắt tem-giặt được xét theo hoàn cảnh và trả lời đúng, không phạt vì thiếu từ điều kiện không còn quyết định kết quả.
- **Giọng/usefulness vẫn có hạn chế nhỏ đã được owner tạm chấp nhận:** size advice nhắc lại height/weight/preference; một số câu tư vấn dài, nhiều tính từ hoặc đưa lại lựa chọn cho khách. Không mở vòng style tuning. Correction ngắn hơn, không lặp đủ số đo; concern-v2 bớt gọi đồ thêu/ren là tối giản. Không coi hai cải thiện cục bộ là tiến bộ giọng tổng thể.

Whole-turn self-review: 32 USABLE, 3 NEEDS_FIX, 7 CORRECT_HANDOFF_DATA_GAP, 2 CORRECT_NO_SEND_AFTER_HANDOFF, 5 MINOR_LIMITATION, 2 CODE_OWNED_OUTPUT. Đây là annotations theo trải nghiệm, không một ngưỡng chấm mới hoặc quality pass rate. Ba NEEDS_FIX gồm hai ca thiếu ảnh và discovery fit guarantee. Không có independent reviewer/model judge mới.

## Terminal thực tế

10 handoff = 7 data gaps + 1 draft fit bị chặn + 1 purchase confirmation + 1 customer-requested human. Cả 10 có HUMAN/event1/tag1, không customer text/attachments trong isolated capture. Tỷ lệ 19,6%; không coi handoff đúng là tư vấn thành công.

4 NO_SEND = 2 follow-up sau HUMAN giữ im lặng + 2 code-owned checkout question/preview. Tỷ lệ 7,8%; nhãn NO_SEND không có nghĩa hai code outputs không tồn tại. Private slot owners0/verifiers0. Sau confirmation: enqueued0/capture0; không tạo lời hứa chuyển tiếp trong text.

21 B1 slots chỉ chứng minh eligibility; 30 slots có isolated persisted ingress/capture. Không gửi khách thật hoặc gọi Meta/Pancake/POS mutation thật. Sáu test databases đã drop.

## Source/config và audit

- Exact run source **4efbea67356f1e3e4f7fa886dec48d58c4ab1474**, sạch trước capture và unchanged qua provider campaign. Vòng trước source0ef9991a578e8da33f9bfbd4f81a86765380fe9f; chỉ report/evidence khác, executable/config/prompt/corpus/dist hashes đã đối chiếu trước run.
- Latest fix base b86825a1de84314175bf98d88a991fb940a7ddf2; deterministic executable ff5e0543fb425ddf0f2a1b5ec6d722a690e831f9. Foundation implementationBaseSha dc1308c9… trong reusable registration là identity cũ; không viết lại để giả identity mới.
- [Approved plan](../../../../../docs/specs/c3-phase-b-media-size-context-fix-plan-20261027.md) SHA256 2cb2803f96e65511cee7daf0b9471fc957eceef875a991826c115ce9fe18e4ba giữ nguyên; [implementation](../../../../../docs/specs/c3-phase-b-media-size-context-implementation-20261027.md).
- Owner Vertex gemini-3.5-flash-lite HIGH/global, candidateCount1/text/plain/maxOutput8192/thinkingHIGH; verifier gpt-6.1-sol high, Codex ChatGPT login. N1, CompactV2, generation retry0, max1upstream/generation, timeout90000ms, temperature/topP omitted. [Exact registration/config/corpus hashes](REGISTRATION.json), [run context](RUN_CONTEXT.json).
- Scoped CLI0.159.2 SHA256 52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a, login/version/hash precheck PASS; dùng binary đã có, không substitute model.
- Owner prompt SHA256 ecc60d49142849d34263471bb8b9a14d54d33747a0ef078af64d308ed947dff6; verifier 8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c.
- 143 actual bodies; 88 owner hashes/bytes matches, 34 verifier pre-dispatch shadow matches và 21 B1 capture/telemetry matches. Không gọi B1 là independent shadow reconstruction. Bounded evaluator-only/secret-key/case-ID/private-canary checks: 0 matches, không phải privacy proof phổ quát.
- [Wire audit](MEDIA_SIZE_WIRE_AUDIT.json): 44/88 owner requests có hint, 44 không có (42 B1 readonly và 2 persisted trước product summary). Max2156B/field, 3products, dưới4096B/field và1024B/product. 38 native verifier trusted contexts không thêm hint.
- Hai valid size results co-locate đúng fields: 1 native function response và 1 trong existing FINAL_REPLY completedToolTurns serialization. Một rejected envelope không phải valid size result. Không kết luận mất fields do chỉ tìm native functionResponse.
- Structural complexity delta0; semantic roles/layers thêm0; executable/config không đổi.

## Accounting

| Chỉ số | Quan sát |
| --- | --- |
| Denominator | 68 = 17 controls + 51 native; 0 not-run |
| Generation requests | 143 = 88 owner + 38 native verifier + 17 control verifier; cap217 |
| Generation errors/timeouts | 0/143; max1upstream, retry0 |
| Native verifier | 37 PASS / 1 FAIL; không phải quality PASS |
| Controls | 8safe eligible / 8unsafe blocked / 1probe eligible, 0errors |
| Verifier provider latency | 38samples; p50 6,115s / p95 12,082s |
| Verification + readback | 38samples; p50 7,275s / p95 13,231s; observed stage latency |
| Whole slot | 51samples; p50 23,639s / p95 49,868s; không live SLA |
| Tokens | 958241 input / 89234 output; 81746 thinking/reasoning đã nằm trong output |
| Cost | Không expose, null |
| Cleanup | 6/6 isolated databases dropped |

Trên 8 unsafe controls: **zero observed send-eligible false PASS** trên frozen tested population/configuration này. Controls hẹp, không full A2/A3 mới; Checkpoint A vẫn owner-bypassed. [Metrics](REVIEW_METRICS.json), [accounting](TASK_ACCOUNTING.json), [cleanup](DATABASE_CLEANUP.json), [controls](CONTROLS_OUTCOME.json), [raw hashes](RAW_SHA256.json).

## Commands thực sự chạy / giới hạn evidence

Output raw ngoài repo: C:/Users/nguye/Documents/Sản phẩm AI/c3-b-media-size-context-model-r2-20261027. Không commit raw requests, source capture hoặc private checkout input. [COMMANDS.json](COMMANDS.json) giữ đủ20child commands, toàn bộ exit0.

```powershell
$env:APPDATA='C:/Users/nguye/Documents/Sản phẩm AI/c3-eval-runtime-01592'
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-media-size-context-model-r2-20261027" controls
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-media-size-context-model-r2-20261027" native
node "../c3-b-media-size-context-model-r2-20261027/ANALYZE.mjs"
node "../c3-b-media-size-context-model-r2-20261027/AUDIT_MEDIA_SIZE.mjs"
node "../c3-b-media-size-context-model-r2-20261027/MEDIA_SOURCE_DIAGNOSIS.mjs"
node "../c3-b-media-size-context-model-r2-20261027/OPENING_MEDIA_AUDIT.mjs"
python "../c3-b-media-size-context-model-r2-20261027/REVIEW_AND_COMPARE.py"
python "../c3-b-media-size-context-model-r2-20261027/ACCOUNTING_AUDIT.py"
```

Hai driver phases exit0. Offline analysis/accounting/wire/whole-turn/source/opening scripts PASS. Một kiểm tra size offline ban đầu giả định mọi envelope recommend_size hợp lệ, gặp envelope REJECTED; đã sửa kiểm tra valid responses riêng, PASS, không chạy lại provider. Raw logs/scripts được giữ để audit. Commands ở trên không bao gồm build/tests mới: prior readiness537worker/192shared/216Node/2Python, shared/worker checks và PostgreSQL49COD+49BANK là evidence trước trên executable ff5e, chưa chạy lại trong model-only round này. Không remote CI PASS hoặc independent approval mới.

Delivery checks: curated JSON parse, đủ51case IDs/hội thoại, local links sau resolve, additional source/dist/plan hashes và148raw file hashes PASS; bounded credential-pattern scan22staged files không có match. git diff --cached --check đầu phát hiện blank line cuối report; đã bỏ và kiểm lại trước commit. Đây là kiểm tra artifact, không test runtime mới.

Reporting có hai lưu ý: (1) analytics capture của opening-multipart mask nhầm public reply thành ADDRESS; public terminal text chỉ được phục hồi ở bản báo cáo sau khi SHA256 khớp capture seq0 (2a4827f6b1b219ffec8327a3a3cc010feb8d6b6b01240eb468398bdc18fe7bb1). Không sửa runtime/raw hoặc tự viết reply thay thế. (2) Markdown chuẩn hóa khoảng trắng cuối dòng; exact JSON/raw giữ nguyên. Private checkout vẫn masking, không phục hồi dữ liệu riêng tư.

**Recommendation: B chưa GO.** Giữ đủ evidence vòng này. Không có generation errors và một số reply dùng facts tốt hơn, nhưng yêu cầu ảnh báo giá bị bỏ ở hai ca và discovery fit guarantee vẫn lặp. Không tự sửa prompt/source, chạy vòng tiếp, source-store write, merge/deploy/live send.
