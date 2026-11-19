# Phase C — source-bound remainder model run

Known development population, không phải fresh holdout hoặc C3 comparison. N1/retry0, cùng prompt/model/effort; quality NOT_GRADED.

[Hội thoại thực tế](CONVERSATIONS.md) · [Draft chưa chắc được gửi](DRAFTS.md) · [Accounting](ACCOUNTING.json) · [Operational](OPERATIONAL.json) · [Diagnostics](PRIMARY_DIAGNOSTICS.json).

Source sạch `a8c7ebee18e883770379f6fea665b8ab1cd31839`; approved runtime b6676b68, delivery a8c7ebee. Fresh107-product source capture; exact previously approved isolated handoff matrix, no upstream shop write/TTL refresh. Readiness v3 và input được cùng reviewer độc lập approve trước provider.

Đăng ký 12 ca/20 lượt; đã thực thi 20 lượt. Frozen cohorts {"SOURCE_UNAVAILABLE": 10, "SALES_READY": 2}. Giữ tất cả errors/NOT_RUN trong denominator, không retry/best-of-N.

Actual terminal {"HANDOFF": 12, "SEND_ELIGIBLE": 1, "NO_SEND": 7}. Capture 1 text/1 ảnh. Handoff/no-send rate 0.95; không đồng nghĩa quality-failure rate.

Generation records 23, actual HTTP 21, statuses {"OK": 19, "PROVIDER_ERROR": 3, "MALFORMED": 1}. Tối đa1request/generation. Actual verifier verdicts {"PASS": 1}; provider error without verdict 1.

Verifier latency(ms) {"n": 2, "p50": 3040.720100000035, "p95": 9196.675799999997}; native verification+readback(ms) {"n": 2, "p50": 7415.316099999996, "p95": 11106.114099999977}. Tokens {"inputObserved": 216518, "outputObserved": 26701, "usageRows": 20, "cost": "UNAVAILABLE_UNLESS_PROVIDER_EXPOSED"}. Không giả cost/production SLO.

Disposable PostgreSQL đã drop; send disabled, không live send/deploy/merge. Hai registrations được giữ denominator riêng; không gộp thành quality/safety population.

## Giới hạn

- Readiness chỉ chứng minh các path đã khai báo ở clock/source đó, không bảo đảm mọi tool batch/quantity2 hoặc hoàn tất bán hàng.
- P10 pool ba refs là prerequisite evaluator từ exposure cũ; không ép runtime chọn chúng hoặc bảo đảm search chỉ có ba refs. Các source đọc thật và egress vẫn quyết định.
- Source/world và runtime đã đổi so với các đợt cũ; N1 không tách được riêng causal improvement hoặc độ ổn định model.
- Locked independent quality grades/contextual P2 judgment chưa được thực hiện. Qualification BLOCKED / C3 NOT_RUN / B_NOT_GO.

## Commands thực chạy

```text
node ../c3-source-bound-prepare-20261102-01.mjs
node ../c3-source-bound-finalize-inputs-20261102-01.mjs
python ../c3-source-bound-launch-20261102-01.py
node ../c3-source-bound-remainder-accounting-20261102-01.mjs
python ../c3-source-bound-report-20261102-01.py
```

Exact dispatched invocation/start/exit timestamps: `../c3-source-bound-remainder-command-20261102-01.json`. Fresh capture/initial/preflight and input-review hashes are retained in ARTIFACTS.json.

## Whole-turn findings

1. **Hai continuation vẫn vượt wire bound:** s02=68.081 và s13=68.073 byte so với65.536, bị chặn trước HTTP. Cả hai đã đọc hai sản phẩm. Đây là request/context envelope quá lớn, không phải quota provider. Bản sửa trước chỉ có proof cho frozen reconstruction s13 cũ với67 byte dư; kết quả mới cho thấy proof đó không bảo đảm các owner continuations khác.
2. **s04 là output tool sai closed shape:** HTTP200/STOP, diagnostic read_product selectionDETAILS_ONLY bị từ chối. Full malformed args không được giữ nên không tự điền giá trị field còn thiếu. Đây không phải lỗi token/auth và không đủ cơ sở nói null-filter fix đã hỏng.
3. **j3 bị quota verifier:** một HTTP429 usage_limit_reached, không có verdict. Code handoff im lặng, các lượt sau human-owned no-send. Không có semanticFAIL ở attempt này và không retry. Draft chưa được gửi không được chấm như kết quả khách đã nhận.
4. **j1 có thêm một lỗi native khác với malformed generation:** turn1 thêm áoL gửi được. Turn2 đã thêm áoM vào giỏ; hai OWNERrecords đềuOK và draft có tổng978.100đ khớp quote. Native recovery lại làMALFORMED trước verifier. Owner2 wire có9bound subjects, trong khi hardPrecheck cap là8; projection giữ nguyên cardinality. Đây là observed over-cap context, không phải bằng chứng model viết sai JSON. Full trusted snapshot đúng thời điểm gate không được giữ, nên chưa khẳng định sole cause hay exact replay. Cart đã ghi được giữ lại; không có reply cho khách, lượt3 human-owned. Xem NATIVE_CONTEXT_OBSERVATIONS.json.
5. **j4 không tái hiện cùng lỗi ảnh cũ:** journal có native add_to_cart(AO,M,color:null), diagnostic trảUNAVAILABLE/SELECTION_UNAVAILABLE rồi handoff; cart chưa commit và không cóMEDIA_SELECT. Empty toolResponses không có nghĩa tool không được gọi: immediate handoff chặn owner continuation nên response không được đưa vào transcript lượt sau. Không gán outcome này cho sentinel-to-media bug cũ hoặc cho owner tự yêu cầu handoff.
6. **Các handoff nghiệp vụ/nguồn khác vẫn tồn tại:** s07 size-rule gap, s16 product ambiguity và j5 order status; những DEPENDENCY_FAILURE còn lại phải đọc đúng source/tool evidence. Một lượt gửi được không đủ để kết luận phần tư vấn hiệu quả; actual19/20 lượt im lặng gồm expected handoff và infrastructure/context failures, không đồng nhất với19 semantic qualityFAIL.


Post-run independent accounting/capture audit: APPROVED. Quality grades remain NOT_GRADED. Stop after the authorized round; no automatic follow-up fix/run or qualification/C3 dispatch.


Independent [accounting/capture review](POST_RUN_ACCOUNTING_REVIEW.json) và [report accuracy review](REPORT_ACCURACY_REVIEW.json): APPROVED. Quality NOT_GRADED.
