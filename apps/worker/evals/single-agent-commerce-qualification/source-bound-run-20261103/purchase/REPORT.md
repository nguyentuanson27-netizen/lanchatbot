# Phase C — source-bound purchase model run

Known development population, không phải fresh holdout hoặc C3 comparison. N1/retry0, cùng prompt/model/effort; quality NOT_GRADED.

[Hội thoại thực tế](CONVERSATIONS.md) · [Draft chưa chắc được gửi](DRAFTS.md) · [Accounting](ACCOUNTING.json) · [Operational](OPERATIONAL.json) · [Diagnostics](PRIMARY_DIAGNOSTICS.json).

Source sạch `a8c7ebee18e883770379f6fea665b8ab1cd31839`; approved runtime b6676b68, delivery a8c7ebee. Fresh107-product source capture; exact previously approved isolated handoff matrix, no upstream shop write/TTL refresh. Readiness v3 và input được cùng reviewer độc lập approve trước provider.

Đăng ký 21 ca/28 lượt; đã thực thi 28 lượt. Frozen cohorts {"SALES_READY": 7, "SOURCE_UNAVAILABLE": 14}. Giữ tất cả errors/NOT_RUN trong denominator, không retry/best-of-N.

Actual terminal {"SEND_ELIGIBLE": 8, "HANDOFF": 15, "NO_SEND": 3, "CODE_OWNED_SEND": 2}. Capture 10 text/7 ảnh. Handoff/no-send rate 0.6428571428571429; không đồng nghĩa quality-failure rate.

Generation records 47, actual HTTP 47, statuses {"OK": 47}. Tối đa1request/generation. Actual verifier verdicts {"PASS": 8}; provider error without verdict 0.

Verifier latency(ms) {"n": 8, "p50": 7520.496799999964, "p95": 10118.345700000005}; native verification+readback(ms) {"n": 8, "p50": 9096.710699999996, "p95": 12584.6587}. Tokens {"inputObserved": 488277, "outputObserved": 42871, "usageRows": 47, "cost": "UNAVAILABLE_UNLESS_PROVIDER_EXPOSED"}. Không giả cost/production SLO.

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
node ../c3-source-bound-purchase-accounting-20261102-01.mjs
python ../c3-source-bound-report-20261102-01.py
```

Exact dispatched invocation/start/exit timestamps: `../c3-source-bound-purchase-command-20261102-01.json`. Fresh capture/initial/preflight and input-review hashes are retained in ARTIFACTS.json.

## Whole-turn findings

1. **Có tiến triển ở đường giỏ/ảnh đã sửa.** p08 thêm cả bộ rồi đổi sang áo lẻ đều được gửi; cart receipt và tổng829k→529k khớp capture. j6 thêm giỏ kèm ảnh rồi đi tiếp đến hai câu hỏi tên người nhận do code dựng. Đây là clarification, chưa phải preview hoặc hoàn tất đơn. Reviewer đã kiểm bằng chứng native/code-owned; không suy rộng thành mọi checkout đều hoạt động.
2. **So với batch21 trước:** trước5 lượt eligible,17 handoff,6 human no-send; lượt này8 eligible,2 code-owned send,15 handoff,3 human no-send. Chỉ là so sánh outcome trên known development cases. Fresh world/readiness và owner outputs khác; N1 không chứng minh nguyên nhân cải thiện chỉ do code hay tính ổn định.
3. **Handoff vẫn nhiều.**15 handoff và3 no-send, tương ứng18/28 lượt không có reply. p07/j2 báo SIZE_RULE_UNAVAILABLE; hậu mãi/defect s10/s12 đi handoff; nhiều trường hợp khác bị DEPENDENCY_FAILURE khi thiếu nguồn/ảnh hoặc lựa chọn. Tên reason rộng không đủ để kết luận mọi ca cùng một root cause. Xem từng tool/non-success diagnostic trong PRIMARY_DIAGNOSTICS.json.
4. **Không có lỗi generation trong batch này.**47records/47HTTP đềuOK;8 verifier verdict đềuPASS. Không biến điều này thành tuyên bố an toàn trên population chưa chấm độc lập.
5. **Trải nghiệm bán hàng chưa được chứng minh tốt hơn.** p08 đã nhận yêu cầu mua nhưng vẫn kết bằng “Chị sẵn sàng chốt đơn thì báo em”; bước tiếp theo còn chung chung. p01 là câu hỏi giá nên form báo giá vẫn được áp dụng, nhưng reply vẫn dài về chất liệu/size. p04 đọc lại chiều cao/cân nặng. Đây là primary whole-turn observations, không phải keyword scores hay locked qualityFAIL.
6. **j6 hỏi tên hai lần có nguyên nhân hội thoại:** sau lần hỏi tên đầu tiên khách chỉ đổi thông tin phương thức thanh toán, chưa đưa tên. Lặp câu hỏi còn thiếu không chứng minh code quên lịch sử hoặc đã lên đơn sai; đồng thời chưa kiểm chứng full preview trong model run này.


Post-run independent accounting/capture audit: APPROVED. Quality grades remain NOT_GRADED. Stop after the authorized round; no automatic follow-up fix/run or qualification/C3 dispatch.


Independent [accounting/capture review](POST_RUN_ACCOUNTING_REVIEW.json) và [report accuracy review](REPORT_ACCURACY_REVIEW.json): APPROVED. Quality NOT_GRADED.
