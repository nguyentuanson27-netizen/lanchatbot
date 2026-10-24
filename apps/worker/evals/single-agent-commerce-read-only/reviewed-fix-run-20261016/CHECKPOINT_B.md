# B1 + B2/B3 model replay — 2026-10-16

Đã chạy đủ **31/31 kết quả đã đăng ký, mỗi ca một lần**, rồi đọc toàn bộ hội thoại, kết quả thực nhận và state. Model tư vấn: Vertex/global Gemini 3.5 Flash Lite High. Verifier: Codex-login GPT-6.1 Sol High, CLI 0.159.2. Giữ nguyên cấu hình, không retry.

**STOP sales/live acceptance.** Các bước giỏ hàng đã thực hiện được trong run này, nhưng checkout chưa hoàn tất và một số tư vấn vẫn chưa dùng được. Checkpoint A vẫn OWNER_BYPASS; không có A2/A3/A PASS mới hoặc Phase C qualification.

## Kết quả theo mục tiêu khách

| Population | Kết quả |
| --- | --- |
| B1 — 24 ca / 8 nhóm × 3 | 18 USABLE, 1 NEEDS_EDIT, 5 FALLBACK_OR_NO_SEND; 19 send-eligible / 5 fallback |
| B2/B3 — 7 bước | 4 reply giao dịch dùng được và đã capture; 1 requested handoff được nhận; 1 checkout handoff do thiếu ETA; 1 no-send sau handoff |
| Hành trình mua | Tạo giỏ áo be M → đổi L × 2 → báo tổng 978.100đ → sửa số đo 74/96, giữ L đều được thực hiện; chưa có preview/confirmed purchase/external order |
| Independent human request | HANDOFF terminal được ghi đủ; không có tin capture hay bằng chứng human notification/response thật |

B1 usability: 18/24 = 75%; 19/24 send-eligible không đồng nghĩa 19 ca tư vấn tốt. B2 primary có 5 USABLE gồm 4 reply và 1 handoff được yêu cầu; không có reply thứ năm được tạo hoặc capture. Handoff/no-send do checkout không được tính thành mua thành công. Primary là đánh giá chủ quan của coding agent, không độc lập, human acceptance=null. Không chấm theo từ khóa, trích từng mảnh câu hoặc cộng điểm thành gate. Đã commit primary trước khi đọc nháp/verdict details; lý do cả lượt và 10 supporting dimensions nằm trong hai PRIMARY_REVIEW.json.

| Nhóm B1 | USABLE | NEEDS_EDIT | Fallback |
| --- | ---: | ---: | ---: |
| Đổi hoàn cảnh |1/3|0|2|
| Policy hiện hành |3/3|0|0|
| Nguồn thiếu một phần |2/3|0|1|
| Giá |3/3|0|0|
| Giá/tồn món lẻ |3/3|0|0|
| Tìm mã/tên rồi đọc |2/3|0|1|
| Phân vân mua |1/3|1|1|
| Policy sau sử dụng |3/3|0|0|

[Toàn bộ 24 hội thoại B1](b1/CONVERSATIONS.md), [review từng ca](b1/PRIMARY_REVIEW.md), [toàn bộ 7 bước B2/B3 và committed state](stateful/CONVERSATIONS.md), [review từng bước](stateful/PRIMARY_REVIEW.md).

## Vì sao chưa đạt

Năm fallback B1: ca 1/9 owner đưa claim về độ kín hoặc bảo đảm không bí vượt nguồn, verifier chặn có căn cứ; ca 6/11 model trả tool call ở request NONE/tools[] sau khi hết rounds, code giữ BUDGET/fail-closed; ca 15 HTTP 200 nhưng adapter không nhận completion hợp lệ (COMPLETION/OWNER_COMPLETION, finishReason UNKNOWN). Hai ca budget chưa tới verifier, ca 15 cũng không có FINAL/verdict. Ca 7 được cho qua nhưng giọng quảng cáo, thuyết phục chưa cụ thể; verifier kiểm protected semantics, không chấm chất lượng bán hàng.

B2/B3 private step đo đúng PLANNER/CART_ETA_UNAVAILABLE, 0 model generation. Handoff là recovery, chưa hoàn tất checkout. NO_SEND bước 6 là hệ quả authority sau handoff, không phải lỗi tư vấn độc lập mới. Cả 7 terminal đã được ghi lần này; evidence cũ vẫn giữ interrupted/UNKNOWN tại nguồn của nó. [Từng draft lỗi, giới hạn bằng chứng và hướng xử lý cụ thể](DIAGNOSTICS.md).

Không dùng kết quả để tự nới verifier, tăng rounds, thêm regex/template, repair/reverify hay thay model. Chưa có source/code/prompt patch sau run. Các bước sửa tiếp theo chỉ được đề xuất trong DIAGNOSTICS, không thực hiện ngoài batch đã chốt.

## Identity và audit

- implementationBaseSha/main refreshed: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- b1RunSourceSha/statefulRunSourceSha: `183ad77ef8116a28c0f6cbec22056a9ae5b29f2b`. Freeze commit trước generation; source/config worktree sạch; outputs ngoài repo trong lúc chạy; không ghi runtime SHA ngược vào frozen source.
- Raw savepoint `725c47654b9ceb44bfd55337d2a39cad99447ef7` → primary `389fa3550f721f4cd530cc3381c8967e95eca9a4` → audit/diagnosis/report. [SCOPE](SCOPE.md), [toàn bộ model/config/hash đã freeze](FROZEN_INPUTS.json), [B1 registration](b1/raw/registration.json), [stateful registration](stateful/raw/registration.json).
- Owner prompt SHA256: `22c97bd28703d2b3079cc06f8dbb6a4e7f1d38cc66e795175d94fedc4cc239be`; verifier: `e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d`. Corpus B1: `790a28e0415bf4b0bdf23c44993cbe78fe76415827a080e9bb09e777775dca67`; stateful: `51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749`. Schema/tool/config/spec Git blobs và generation settings đầy đủ trong freeze/registrations.
- [39 raw/source/preflight hashes](RAW_HASHES.json) đã so disk và Git blobs; 90 unique generation IDs / 90 actual generation HTTP requests, 0 unknown accounting, 1 request mỗi generation, 0 retry; 65 native dispatch hashes/bytes khớp wire; 25 exact verifier draft/trusted bindings. Tất cả 25 generated FINAL được verify; 23 send-eligible generated replies khớp exact verified draft. B1 là terminal/send-eligibility evaluation, không phải tin đã gửi live; B2/B3 là actual in-memory delivery capture sau transaction.
- 0 evaluator/private-checkout leaks trong các model request đã kiểm, kể cả JSON lồng string; runtime latest/history khớp registration/case. PRICE là protected fact type hợp lệ, không thể coi mọi lần xuất hiện chữ PRICE là evaluator tag bị leak. Audit helper ban đầu mắc false positive này; đã sửa phép kiểm value collision, giữ kiểm forbidden keys/distinct case IDs/full evaluator prose và raw/provider/source không đổi. Không gọi provider lại.
- 9 request final-only, 2 trả TOOLS dù NONE/tools[]; cả hai bị code chặn. Đây là observed conformance risk, không phải generation retry hoặc 9 case mới. Chưa có provider-side HTTP echo để quy nguyên nhân chắc chắn. [B1 audit](b1/AUDIT.json), [stateful audit](stateful/AUDIT.json), [summary](AUDIT_SUMMARY.json).
- Có một disposable provider database mới, đã drop đúng database owned. COD/bank 12/12 controls ở executable `777616dd` được reuse do runtime/config không đổi; không claim rerun controls. [Current provider cleanup](stateful/raw/integration.json), [controls và verification trước đó](../reviewed-fix-20261016/IMPLEMENTATION.md).

Nguồn dùng existing [Lana Chatbot Ops](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) credential route: live PostgreSQL chỉ đọc, Redis/Qdrant public product sources; test-state writes chỉ ở owned disposable DB. Credential trong environment/memory; raw scan 0 secret-pattern matches. Không serving-state mutation, migration, policy/index publication, send Meta/Pancake/POS, merge hoặc deploy.

## Operational measurements

| Đo | B1 | B2/B3 |
| --- | ---: | ---: |
| Registered/recorded outcomes |24/24|7/7|
| Owner/verifier invocations |56/21|9/4|
| Actual generation HTTP requests / max invocations |77/96|13/24|
| HTTP200 / HTTP errors |77/0|13/0|
| Runtime generation errors |1/77(1.30%)|0/13|
| Verifier error/timeout |0/21|0/4|
| All generation timeout |0/77|0/13|
| Fallback/handoff/no-send |5/24(20.83%)|3/7(42.86%)|
| Verifier latency p50/p95 |5.193/14.043s,N21|5.134/7.806s,N4|
| Added verification path p50/p95 |5.716/14.469s,N21|6.627/11.254s,N4|
| Whole-turn p50/p95 |11.142/17.824s,N24|20.467/39.401s,N7|
| Input/output tokens |245436/24613|61031/6722|
| Token usage coverage |77/77|13/13|
| Cost |not exposed|not exposed|

Tổng 90 generation requests / max 120, 65 owner + 25 verifier, 306.467 input / 31.335 output tokens. HTTP 200 không có nghĩa completion hợp lệ: ca 15 được giữ như generation error; 2 TOOLS under NONE ghi riêng trong conformance count. Source embedding invocations: 1 trong B1, 0 stateful, thêm 1 ở source-check; không tính thành case hoặc chat generation. Known owner OAuth requests: 2; Codex login/auth request count không được expose. 25 verifier clientRequests đều 1, rejectedClientRequests 0. Cost không estimate bằng giá nhớ sẵn.

Percentile nearest-rank, chỉ mô tả N1. Added verification path bao gồm verifier và current-readback/recovery đang được runtime đo, không phải chỉ thời gian provider. Whole-turn không gồm B1canonical startup build; stateful có SQL/fixture setup ở đầu journey và private code-only step. Không so tốc độ/khả năng hai model bằng các role/task khác nhau.

## Verification, giới hạn và kết luận

Đã chạy preflight 0 generation, source readback và canonical builds trong B1 runner trước nguồn/run; stateful preflight PASS / 0 generation. Reuse focused 123 / provider-protocol 31 / protected-reply 21 / full 1779 worker / 485 eval và compiler checks của executable không đổi. Không claim chạy lại suite/typecheck/lint trong task chỉ chạy model này; 2 optional eval và 30 optional PostgreSQL SKIP cũ không biến thành PASS. [Exact commands và observed results](COMMANDS.md). Full repo pnpm check/remote CI không được claim PASS.

Structural change của task này: chỉ SCOPE/frozen inputs/raw/review/audit/report/tasks/PR; runtime/prompt/config/corpus changes 0, semantic roles/layers/gates/stores 0, new schemas 0. Bản sửa executable trước đó +96 owner prompt bytes và +74 net runtime lines được giữ nguyên; không có post-result patch.

So với preceding 24 B1: 14 USABLE / 2 NEEDS_EDIT / 8 fallback → 18/1/5 trong cùng corpus nhưng source/prompt/adapter và N1 khác; đây là quan sát mô tả, không chứng minh cải thiện ổn định hoặc gán công riêng cho một thay đổi. Stateful trước chỉ 6 terminal được ghi / 1 UNKNOWN; lần này đủ 7 và 4 bước mua đầu được thực hiện, song private checkout vẫn thiếu ETA. Điểm mạnh hiện tại là giao dịch cụ thể, policy trực tiếp và state/cart/quote. Điểm còn yếu là đổi hoàn cảnh, xử lý phân vân, native final-only và dữ liệu fulfillment.

Recommendation: **STOP sales/live acceptance**. Bổ sung source ETA đúng thẩm quyền, xử lý native final-only/offer-policy presentation và cải thiện đoạn tư vấn từ dữ kiện hiện có trước một run mới được yêu cầu. Không tự chạy vòng sửa/lặp, không qualification A/C hay live promotion.
