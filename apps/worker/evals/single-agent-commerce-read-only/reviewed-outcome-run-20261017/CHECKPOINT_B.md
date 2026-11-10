# Phase B — reviewed cart presentation and sales tradeoffs

**Đã thu đủ31/31 lượt mới:24B1 +7stateful, N1. Primary21USABLE /6NEEDS_EDIT /4FALLBACK_OR_NO_SEND. Một USABLE chỉ là control nhường ownership. Recommendation: STOP sales/live acceptance; source-backed checkout BLOCKED.** A vẫn OWNER_BYPASS, không có A2/A3 qualification mới.

[31 hội thoại](CONVERSATIONS.md) · [Whole-outcome review](PRIMARY_REVIEW.md) · [Frozen inputs](FROZEN_INPUTS.json) · [Implementation/verification](IMPLEMENTATION.md) · [Diagnosis](DIAGNOSIS.json) · [Metrics](METRICS.json) · [Request accounting](REQUEST_ACCOUNTING.json) · [Audit](AUDIT.json).

## Source và phạm vi

- Intake `33a64ab9bd1eb2f1bb6cc4535643c0e3207f4fe0`; refresh main trước sửa, implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Scope savepoint351f8986, code/test `53b6008c3779e379063e63b5e95a58818fe2c128`; clean runtime run source **`c5921632f0fab677e370a1cfcc2eb766e09343c9`**. Runners capture HEAD, không ghi SHA ngược vào frozen source.
- Raw **`19a2fd8b24c14e8edea1439ae54e4c654e9b92a3`** trước primary **`204a98a88aad7f0ce214a073ca099fc6519c9301`**, trước đọc trace/error details. Primary chấm toàn bộ actual outcome với public source và state cuối; chủ quan/non-independent, human acceptance null. Không chấm keyword, cộng điểm hoặc lấy một câu mẫu làm chuẩn.
- Chỉ một run;7stateful liên tục trước, rồi24B1 theo order đã freeze. Mọi lỗi vẫn trong denominator, không reset/reseed để cứu bước trước, không retry/best-of/subset replacement hoặc batch phụ. Stop sau report/tasks/PR391 update.
- Live public PG/Redis/Qdrant chỉ đọc. Ghi state/Outbox chỉ trong disposable PG, transport chỉ capture; DB đã drop. Không source/index/policy publication, production entrypoint, live Meta/Pancake/POS effect, merge/deploy hoặc Phase C.

Đã áp dụng independent REVISE_PLAN bằng scope nhỏ hơn: helper cartItems dùng chung cho trusted snapshot và kết quả effect/duplicate; native owner giữ summary thay full cart lặp; stock chỉ từ current matching selection. Giữ receipt của commit thật khi refresh nguồn lỗi, không lặp mutation. Owner chỉ sửa nguyên tắc so sánh chi phí/đánh đổi; verifier, size và policy giữ nguyên. Không thêm ví dụ theo ca, parser/router, normal-reply composer, disclosure store, repair/reverify hoặc role mới. Handoff vẫn terminal theo policy, không được mô tả như đã gửi cả partial answer.

## Model, cấu hình và hashes

Owner: Vertex AI global **gemini-3.5-flash-lite**, version echo cùng alias, HIGH; candidateCount1, text/plain, maxOutputTokens8192, thinkingLevelHIGH/includeThoughtsfalse, timeout90s/retry0. Verifier: **gpt-6.1-sol/high**, version cùng alias, existing Codex-login bounded relay/CLI0.159.2/Responses; strict verdict schema, tools[], tool_choice none, parallel_tool_calls false, store false, stream true, timeout90s/maxResponse1MiB/max1upstream/request/retry0. Temperature/topP đều omitted provider default; không thay account/model hoặc hidden health generation. Generation configs đầy đủ ở FROZEN_INPUTS.

Max3owner generations/2tool rounds/6calls/1verifier cho mỗi public attempt; tổng cap120. Giữ raw tool-result8192bytes và exact serialized owner wire32768bytes; không cắt signature hay tăng bound sau khi thấy lỗi. Owner prompt12414bytes, tăng354bytes/2.94%, cùng7section; không viết lại toàn bộ giọng tư vấn.

| Identity | SHA-256 |
| --- | --- |
| Owner prompt | ee4377287c3c07ba232574e4542a4a5f1988e8ee8277506fb4d26f17bd8cd3a6 |
| Verifier prompt, unchanged | b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24 |
| Verdict schema, unchanged | 76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97 |
| B1 priority corpus, unchanged | 8f858e80f27984008e5d29d87d421645ee1b3c53631e09b31c4c2ea7eb722267 |
| Stateful corpus, unchanged | 51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749 |
| B1 native declarations, unchanged | 23867cc18d8d7c1fb37d789960f4807b8129b20cd607551b09021292ed0b40f8 |
| Stateful native declarations | ebe550ad5191a4a69021c55da1ccd0b1e60afa219ada9775211182360c0f7cb7 |

Spec Git blobs at run source: architecture7e0265e3b6b3d556d8fb0f3c7267abccef5de86a, amendment4a09b55d2f3a972a65697738876cc5eab21e7a2b, B executiona452326d77e4493b88b02c0072cef808fecad2d8, approved advisory boundary5a531cfeb03fcc20e178517a47f5be5a234e1593. Tasks/plan/todo run-time blobs cùng13input/5runtime hashes và serialization identities được ghi trong FROZEN_INPUTS/AUDIT, không thay bằng file tasks sau report.

Static fallback: `C3_A_NONPROTECTED_V2`, exact text “Phần này em chưa trả lời được, chị nhé.”, hash `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. Owner final qua verifier/current gate; malformed/error/budget có terminal fail-closed hiện có. Một post-commit recovery là code-owned RECEIPT_BACKED_ACK theo current receipt/readback, không phải một final model được bỏ verifier. Handoff/no-send theo current authority/policy; không hứa nhân viên đang phục vụ.

## Kết quả toàn bộ actual outcomes

| Phần | Đã chạy | USABLE | NEEDS_EDIT | FALLBACK_OR_NO_SEND |
| --- | --- | --- | --- | --- |
| B1 | 24 | 17 | 5 | 2 |
| B2/B3 | 7 | 4 | 1 | 2 |
| Tổng | 31 | 21 | 6 | 4 |

USABLE gồm một ownership-only control, không phải21đơn mua hoặc21câu hoàn hảo. Actual terminals riêng: **26SEND_ELIGIBLE /2staticFALLBACK /2HANDOFF /1NO_SEND**. Có4tin stateful được capture; không gửi khách thật. Một silent handoff đúng yêu cầu gặp người là control USABLE, nên bảng primary không bằng bảng terminal dispositions.

| B1 family | USABLE | NEEDS_EDIT | Fallback |
| --- | --- | --- | --- |
| Đổi hoàn cảnh mặc | 3 | 0 | 0 |
| Tìm rồi đọc sản phẩm | 3 | 0 | 0 |
| Phân vân mua/lựa chọn | 1 | 2 | 0 |
| Nguồn từng phần | 0 | 2 | 1 |
| Policy hiện hành | 1 | 1 | 1 |
| Giá trực tiếp | 3 | 0 | 0 |
| Tồn/mua riêng thành phần | 3 | 0 | 0 |
| Đã dùng/mặc thử/cắt tem-giặt | 3 | 0 | 0 |

Điểm tốt quan sát được: đổi L/BE x2 hoàn tất trong lượt và đã báo **hàng đặt trước**; quote978.100đ đúng (998.000−49.900+30.000); correction74/96 được nhận, không đổi size khách đã chọn. Nhắc hai số vừa correction có mục đích xác nhận, không tự thành lỗi liệt kê. Khánh Trang lần này tìm đúng SV1561 và trả999k/499k, không lấy giá gợi ý khác. Ca upsell23 chọn bộ799k vì thêm váy/tách phối nhiều cách; không còn claim trả ít hơn áo499k. Giọng vẫn có chỗ quảng cáo, chưa chứng minh ổn định hoặc tác động nhân quả của hai thay đổi prompt.

Ca sân khấu1 và nóng4 được đánh giá theo đúng boundary owner20261016 đã freeze: nguy cơ/lớp mặc trong và cảm giác mặc từ vải mềm/thoáng được phép; không đòi phép thử riêng hoặc chặn theo chữ trấn an. Không mở rộng thành mọi guarantee độ kín/nhiệt đều được phép. Chưa có independent semantic adjudication/human sales acceptance;25verifier PASS không phải25quality PASS hoặc một kết luận an toàn toàn cục.

## Các lượt còn thiếu và root cause sau primary

| Lượt | Actual / phần chưa đạt | Nguyên nhân có chứng cứ |
| --- | --- | --- |
| Stateful1 mở giỏ | ACK “Em đã thêm món chị chọn vào giỏ.”; thiếu thông tin đặt trước | Giỏ/profile đã commit đúng. Owner generation3 chuẩn bị33430bytes, vượt32768 nên bị chặn **trước dispatch**,0request. Recovery dùng receipt thật. Không phải verifier chặn và không thể kết luận model đã nhận post-add context rồi cố tình bỏ preorder ở generation này. |
| B1-5 chân váy/nguồn thiếu | Static fallback BUDGET, mất cả mô tả đã biết | Owner read đúng SV2447 nhưng không chọn offerTypeCV; POS null. Sau đó search chân váy thành sản phẩm mới, nhận gợi ý khác; ở request3 tool modeNONE/tools[] vẫn trả read_policy. Code không thực hiện call đó, không có final draft/verifier. |
| B1-18 policy9ngày | Static fallback PROVIDER_ERROR | Owner HTTP200 nhưng completion finishReason được chuẩn hóa UNKNOWN, failureCodeOWNER_FINISH_REASON. Không có final/verifier. Exact original reason không được lưu; không quy thành quota, sai policy hoặc verifier reject. |
| B1-3/B1-6 concern | NEEDS_EDIT | Lựa chọn có nhưng lý do còn là chuỗi tính từ quảng cáo, ít giải quyết đánh đổi ren/đồ trơn. Ca3 còn mời lấy size chuẩn khi capabilityB1 chưa có recommend_size. |
| B1-7 thời hạn/phí | NEEDS_EDIT | Thời hạn15/phí30k đúng, nhưng “tem mác còn nguyên là mình đổi được” dễ mở từ còn hạn sang đủ điều kiện. Đây là vấn đề phạm vi lời khẳng định; không bắt đọc đủ checklist hay khẳng định đã chứng minh vi phạm một đơn thật. |
| B1-8/B1-19 nguồn từng phần | NEEDS_EDIT | Chất liệu giữ đúng; vẫn kể “hệ thống…” và ca8 hẹn đợi/nhắn lại không có theo dõi. Lỗi giọng/bước xử lý, cộng giới hạn nguồn; không chữa bằng hỏi số đo hoặc giả handoff. |
| Stateful5 checkout | HANDOFF im lặng, chưa preview | Current code ghi PLANNER/CART_ETA_REGION_UNRESOLVED,0model requests. Transit durations có, thiếu approved address→shop-region mapping; không phải hai model không hiểu địa chỉ. |
| Stateful6 chốt | NO_SEND/CURRENT_AUTHORITY_CHANGED | Đã handoff từ bước5 nên code nhường ownership, không tự chốt đơn. Boundary đúng; hành trình bán chưa hoàn tất. |

Native projection thực sự có2effect summary occurrences trong dispatched continuation của lượt đổi giỏ,0full-cart duplicate ở các summary đó. Tool-response sau add cũng có current PRE_ORDER, nhưng request tiếp theo không được dispatch do bound. Request đã dispatch lớn nhất32022bytes: systemInstruction JSON12476bytes, trusted text4194bytes, tools JSON6338bytes, một opaque signature5164characters. Các phép đo thành phần không cộng trực tiếp. Chưa có body generation3 được dispatch/capture để quy toàn bộ662bytes vượt bound cho riêng prompt hoặc signature. Đây là lỗi capacity của request/continuation cần xử lý riêng, không cứu bằng thêm lời nhắc disclose.

Nguồn hiện tại còn không có structured attributes ở bốn SV2447 offer reads. Producer/consumer trong repo có sẵn; chưa chứng minh field bị drop ở code. Old unpublished proposal còn gán REN cho AO nên không publish lại. Fresh shipping source vẫn chỉ có REGION/durations/enabled, bốn key vùng, không city aliases/default. Hai nhánh source cần nguồn được duyệt, không tự điền facts/mapping. Handoff hiện kết thúc lượt với câu policy; kiểm commit/holding không chứng minh đã gửi partial owner answer hoặc nhân viên thật đã nhận.

## Operational measurements và firewall

**86generation invocations /85HTTP200** =61owner invocations (60HTTP) +25verifier (25HTTP). Một owner request bị guard local trước dispatch; một owner HTTP200 completion không hợp lệ.0HTTP4xx/5xx,0quota,0timeout,0retry. Owner error2/61=3.28%; toàn bộ invocation error2/86=2.33%; verifier timeout/error0/25. Không bỏ hai error khỏi denominator hoặc gọi chúng là verifier FAIL.

Mọi25model final được gửi verifier một lần và nhận PASS;25eligible text khớp exact draft/binding. Eligible thứ26 là receipt-backed code recovery có current checks. B1-5 gọi tool ởNONE được chặn;4final-only requests quan sát có1violation. Maximum observed per outcome:3owner/1verifier/2tool rounds/3calls, trong cap đã đăng ký.

| Phép đo | p50 | p95 | N |
| --- | --- | --- | --- |
| Verifier adapter | 5.576s | 9.382s | 25 |
| Owner adapter, gồm local error | 1.878s | 5.492s | 61 |
| Added verification interval B1 | 6.316s | 10.137s | 22 |
| Added verification interval stateful | 7.790s | 8.265s | 3 |
| Whole B1 turn | 10.701s | 18.127s | 24 |
| Whole stateful turn, gồm private/control | 26.885s | 39.404s | 7 |

Added interval gồm verifier + current readback/final gate; whole-turn có source/DB/local relay, không phải live SLA. Usage có85/86invocations: **342077input /29167output tokens**; thinking tokens owner24903/verifier1292 là breakdown, không cộng lần nữa vào output. Local blocked request không có usage; cost không expose/không ước tính. Embedding/auth được tách khỏi generation accounting; source-check có1embedding probe, không gọi owner/verifier health sample.

Static fallback2/24B1=8.33% hoặc2/31=6.45%; handoff2/31=6.45%; no-send1/31=3.23%. Tổng terminal fallback/handoff/no-send5/31=16.13%, bao gồm ownership-only control. Primary4unfinished không đồng nghĩa4static fallbacks.

Audit xác nhận43raw/source/freeze hashes,13input/5runtime/6reference blobs tại run source;60owner dispatch body hashes,25exact verifier bindings,25exact eligible model drafts,4exact captures.0observed evaluator-label/private-fixture leaks trong các captured dispatched requests,0private-checkout model requests; không đưa caseId/purpose/scoring/sourceMode vào hai role. Byte/hash evidence là prepared/dispatched bodies và adapter capture tests, không có independent provider echo. Credential-pattern scan trên new artifacts không có hit; không lưu auth header/token/real customer data. DB đã drop, sendEnabledfalse.

## Verification và commands thực sự chạy

[IMPLEMENTATION.md](IMPLEMENTATION.md) giữ exact focused/full commands, RED3FAIL/47PASS và native1FAIL/29PASS, các lỗi test-only typing/canonical color và PROMPT_HASH trước khi sync manifest. Final worker1843PASS/131files; Node493PASS+2existing optionalSKIP; focused127/provider-protocol-comparison51/protected-reply21PASS. Worker typecheck/build/lint exit0. Real-PG COD25/25PASS/0generations/DBdropped; BANK_TRANSFER không rerun. Runtime TS net+3lines/native adapter net+1line;0semantic roles/layers/gates/stores added. Chưa có full-repo pnpm check/remote exact-head CI hay human acceptance.

Collection/preflight/report commands, đều đã chạy (reporting/audit không generation):

~~~text
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-reviewed-outcome-stateful-20261017 COD --provider-run
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-reviewed-outcome-b1-20261017 --run
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-outcome-preserve-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-outcome-primary-packet-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-outcome-write-judgments-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-outcome-primary-review-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-outcome-audit-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-outcome-diagnosis-20261017.mjs
git diff --check
~~~

Preflight/source checks0owner-verifier generations; collection exit0 có nghĩa đủ31, không phải quality PASS. Audit chạy lại chỉ để tách max prepared33430 với max dispatched32022, không đổi raw/primary/score hoặc tạo run mới. `git diff --cached --check` tại primary phát hiện6space cuối dòng từ nguyên văn provider; bản Markdown đã bỏ space khi render, exact texts vẫn ở PRIMARY_REVIEW.json/raw và scoring savepoint không sửa. Không có reply production nào bị rewrite.

## Đánh giá và hướng tiếp theo, chưa thực hiện

Thay đổi có kết quả quan sát: source/native cart summary đúng, lượt đổi giỏ đã báo preorder; so sánh lợi ích upsell không còn khẳng định chi ít tiền hơn áo lẻ. Chưa thể quy tất cả khác biệt cho code/prompt: N1, source per-read và native signatures biến thiên; search correct lần này dùng tên đầy đủ dù chỉ dẫn đó đã tồn tại.

So với latest mixed-source view của lần trước:18USABLE/8NEEDS_EDIT/5unfinished → lần mới21/6/4. Mixed view trước không phải một run nguồn duy nhất. Full31 trước là13/7/11, có7verifier429 nên không dùng mức tăng số lượng này làm bằng chứng chất lượng tăng tương ứng. Không thay nhãn/evidence cũ.

Việc tiếp nên tách đúng nguyên nhân: đo và xử lý request capacity/native continuation trước khi kỳ vọng sửa early disclosure bằng prompt; xem tool planning khi thiếu POS và NONE violation bằng evidence riêng; lỗi completion cần giữ UNKNOWN cho tới khi có đủ provider evidence. Chưa tăng bound, giảm reasoning, rút prompt đại trà, cắt signature, thêm gate/regex hay retry. Giọng concern/partial-source còn cần cải thiện nhưng không thêm lại các chỉ dẫn chung đã có. Source mapping/attributes là công việc nguồn riêng; không làm bằng fixtures hoặc hardcoded policy/facts.

Dừng sau đúng một run/report/PR391 update. **STOP sales/live; checkout source BLOCKED; A OWNER_BYPASS.** Không có owner GO, full-A qualification, completed source-backed purchase, Phase C, publication hoặc quyền live mới.
