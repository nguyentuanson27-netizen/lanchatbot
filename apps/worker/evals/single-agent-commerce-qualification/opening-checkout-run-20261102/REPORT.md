# Opening checkout — model development run, 02/11/2026

Đây là development rerun trên bộ ca đã biết, không phải fresh qualification/C3 comparison. Chấm chất lượng độc lập: NOT_GRADED.

Source sạch: `2628987aae6c62958db4484ba5f152907f833d83`; runtime checkout đã duyệt tại603, test/PGdd88, deliverya528. Evaluation follow-up262 chỉ nối opening-media rule vào diagnostic provider. Owner/verifier prompt và worker runtime giữ nguyên.

Đăng ký21ca/28lượt; N=1, retry0, tối đa112generation records. Gemini3.5FlashLiteHIGH + GPT6.1SolHIGH/Codex0.159.2. Tối đa6primitive calls/2rounds/3owner+1verifier/lượt, wire65536,4images/6messageunits; không tăng ngân sách.

Frozen cohorts: {"SALES_READY": 8, "SOURCE_UNAVAILABLE": 13}. Đã thêm kiểm tra ảnh cho mọi sản phẩm opening/discovery theo quy tắc owner chốt; khác population readiness15/6 của run01/11. Không đổi cohort sau outcome, không sửa dữ liệu/TTL để tăng số ca ready.

Actual native turns: 28/28. Case statuses: {"EXECUTED": 21}. Actual terminal counts: {"SEND_ELIGIBLE": 5, "HANDOFF": 17, "NO_SEND": 6}.

Generation records: 36; actual generation requests: 36; roles: {"OWNER": 31, "VERIFIER": 5}; statuses: {"OK": 35, "MALFORMED": 1}. Mọi error/zero-request/pre-dispatch record vẫn nằm trong denominator.

Verifier latency nearest-rank(ms): {"p50": 6896.470299999994, "p95": 8056.019899999985}. Token evidence: {"inputObserved": 356155, "outputObserved": 35200, "usageRows": 36, "cost": "UNAVAILABLE_UNLESS_PROVIDER_EXPOSED"}. Không suy harness latency thành production SLO; không giả cost không được expose.

Actual disposable PostgreSQL dropped, source clean, send disabled. No shop-source write, retry, deploy or live customer send. C3 parity unproved; qualification BLOCKED/B_NOT_GO vẫn giữ nguyên.

## Verification and preparation

- Existing checkout implementation: independent APPROVE, PG118/118+7invariants; đây là evidence trước run, không tính là model attempts của run mới.
- Evaluation helper: observed RED missing export → GREEN34/34; same independent reviewer APPROVE; independent diagnostic7/7PASS.
- Fresh upstream107products/public source capture a528; resolved isolated matrix giữ nguyên exact previously owner-approved content. Upstream shop policy không bị sửa.
- Initial preparation01 rejected C_WORLD_SOURCE_HASH before generation, DBdropped/provider0. Resolved02 recomputes aggregate hashes after appending the approved isolated matrix; initial02PASS/dropped/provider0 at262. Giữ cả failed artifacts; không phải retry model.
- Same reviewer APPROVE DEVELOPMENT INPUTS bound pendinghash; final preflight PASS pinnedmodels/config/source before dispatch.
- Primary accounting validates exact raw native hashes, request hashes/firewall, maximum one request/generation and captured text vs accepted Outbox. Same independent reviewer APPROVE POST-RUN ACCOUNTING/CAPTURE và APPROVE REPORT ACCURACY:94 artifact byte hashes,28 native raw turns,36 generation identities/wires và accepted5text+4image được kiểm tra. [Accounting audit](POST_RUN_AUDIT.json) · [Report review](REPORT_ACCURACY_REVIEW.json).

Native measured verification+readback path nearest-rank: {"n": 5, "p50": 8462.979200000009, "p95": 10248.986600000004} ms. Five verifier verdicts PASS; timeout/error0/5. Actual accepted5text+4image; handoff/no-send23/28. Full operational evidence: [OPERATIONAL.json](OPERATIONAL.json).

## Actual commands

```text
node --test apps/worker/evals/single-agent-commerce-qualification/diagnostic.test.mjs
node --test apps/worker/evals/single-agent-commerce-qualification/diagnostic.test.mjs apps/worker/evals/single-agent-commerce-qualification/full-native-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-qualification/purchase-options-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-qualification/source-readiness.test.mjs
node ../c3-opening-checkout-prepare-20261102-02.mjs
node ../c3-opening-checkout-finalize-20261102-01.mjs
python ../c3-opening-checkout-launch-20261102-01.py
node ../c3-opening-checkout-accounting-20261102-01.mjs
```

Actual command and completion record: `../c3-opening-checkout-command-20261102-01.json`. Full capture/initial commands retained in parent logs and source-bound input artifacts.

## Findings

Primary review đã đọc toàn bộ28 actual terminal turns và các draft bị chặn; đây không phải locked independent quality grade.

| Ca | Kết quả và finding |
| --- | --- |
| p01 áo lẻ | Gửi giá499k +2ảnh. Trả đúng câu hỏi nhưng thêm cả đoạn chất liệu/size dài; không coi đây là tiến bộ giọng văn. |
| p02 quần lẻ | Handoff trước verifier; MEDIA_SELECT trả tập rỗng. Không thiếu giá quần. |
| p03 chân váy M | Gửi tồnM/giá449k +1ảnh. Câu ngắn, vẫn có mở ngoặc thông tin thêm. |
| p04 size→giá set | Cả2lượt gửi được: M rồi799k; ảnh ở lượt đầu, lượt sau dùng context. Vẫn nhắc lại height/weight của khách. |
| p06 ba món | Handoff ngay trong lượt đọc_product, trước verifier. Frozen SOURCE_UNAVAILABLE; không có reply giá thực gửi. Không suy nguyên nhân duy nhất từ terminal DEPENDENCY_FAILURE. |
| p07 size từng phần | SIZE_RULE_UNAVAILABLE; đúng gap COMPONENT capability đã đăng ký. |
| p08 đổi set→áo | Lượt đầu add_to_cart đã OK, có receipt; draft tổng829k chưa được gửi. MEDIA_SELECT ERROR/UNKNOWN_INTERNAL sau cart; recovery PREPARATION_UNAVAILABLE và handoff. Lượt sau HUMAN-owned NO_SEND. |
| p09 hai thiết kế | Handoff trước verifier; MEDIA_SELECT trả tập rỗng. Lượt chọn bộ quần tiếp theo không gửi vì đã HUMAN-owned. |
| p10 chưa rõ mẫu | Owner tìm “bộ hoa”, draft hỏi khách phân biệt3mẫu; mandatory opening media sau search gặp tập rỗng, hỏi làm rõ cũng không gửi được. Đây là SALES_READY case theo preregistration; không đổi nhãn sau run. |
| h01 áo L | Owner gọi add_to_cart với colornull và handoff; source colour/selection gap đã đăng ký. Không bịa màu để hoàn tất. |
| h02 Khánh Trang | select_product_media: NO_VERIFIED_MATCHING_MEDIA; handoff im lặng. |
| s05 tư vấn tìm đồ | Search→read_product chạy, còn3call units nhưng hết2read rounds; mandatory media gặp tập rỗng và handoff. Không có tư vấn thực gửi. Không gom toàn bộ thành lỗi model hiểu nhu cầu. |
| s06 phối quần nâu | MEDIA_SELECT trả rỗng trước verifier khi phải cover initial products; không phải verifier chặn suy diễn phối đồ. |
| s08 Odette/Diệp An | Owner HTTP200, rawFinishReason=MALFORMED_RESPONSE, failureCode=OWNER_FINISH_REASON, finishReason=UNKNOWN, layerMODEL_OUTPUT;1request, không retry. Presented frame46169/65536 ở request này: không phải OWNER_REQUEST_BOUND. Chưa chứng minh toàn bộ continuation path bằng provider. |
| s09 giặt áo | Handoff do MEDIA_SELECT rỗng trước verifier; không tái hiện snapshot-mismatch cũ. Chính sách có thể có nhưng opening ảnh vẫn là prerequisite. |
| s10 đổi màu đơn đang giao | AFTER_SALES_REQUEST handoff theo policy đã duyệt. |
| s12 khóa váy lỗi | DEFECT handoff theo policy; không nhắn holding reply. |
| s14 xem thêm | ACK gửi được; không có identified product nên không cần ảnh. |
| s15 thích màu be | Explicit media select: MEDIA_COLOR_BINDING_UNVERIFIED; handoff. Vẫn có phụ thuộc ảnh ở câu ACK có sản phẩm. |
| j2 sửa số đo | Lượt1 COMPONENT size gap→handoff;2lượt sau HUMAN-owned NO_SEND. Không tính2lượt này thành2lỗi verifier hoặc bỏ khỏi denominator. |
| j6 checkout | Add_to_cart thật đã OK và receipt/state được giữ; draft829k bị chặn ở MEDIA_SELECT UNKNOWN_INTERNAL/PREPARATION_UNAVAILABLE trước verifier và trước confirm.2lượt sau HUMAN-owned NO_SEND. Model run chưa đi tới native clarification/preview vừa sửa. |

Năm verifier attempts đều PASS, khớp5SEND_ELIGIBLE. Không có FAIL/UNCERTAIN/timeout hoặc verifier-error nào trong batch. Vì vậy không thể quy17handoff cho verifier siết semantics. Có13DEPENDENCY_FAILURE,2SIZE_RULE_UNAVAILABLE và2business handoff; trong13dependency có1MALFORMED owner response.

P08/j6 có cart components colour `__NO_COLOR__` và MEDIA_SELECT diagnostic UNKNOWN_INTERNAL; nguồn chỉ chứng minh trạng thái/receipt được giữ và nơi thất bại. Chưa có exact classified exception đủ để gọi đây là “mâu thuẫn hai màu”, provider error hay hồi quy của atomic checkout. Giữ unknown này, không sửa code/ảnh/TTL hoặc chạy lại để cứu kết quả.

Readiness đang có khoảng trống: j6 SALES_READY theo selection+generic image ban đầu nhưng không bảo đảm media sau mutation trong exact cart colour scope. P10 SALES_READY không có initial product, rồi search admits sản phẩm thiếu ảnh. Không relabel cohort sau khi thấy kết quả. Quy tắc mọi opening identified product có ảnh làm thay đổi tính dùng được của care/ACK/clarification và các lượt có nhiều initial refs; cần xem riêng tradeoff này trong review sau.

Handoff/no-send23/28=82,1% là terminal rate, không phải quality-failure rate: có business handoff đúng policy và13cases source gaps đã đăng ký. Chỉ5texts+4images được transport kiểm thử chấp nhận; không có fallback text. Model chất lượng tư vấn vẫn NOT_GRADED, không có bằng chứng stable improvement hoặc Phase C PASS từ lần N1 này.


Recommendation: STOP after this authorized batch; no automatic follow-up fix/run, qualification GO or C3 dispatch.
