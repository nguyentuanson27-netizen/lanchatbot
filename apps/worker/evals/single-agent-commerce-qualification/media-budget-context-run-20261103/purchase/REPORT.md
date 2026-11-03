# Phase C — media-context purchase model run

Known development population, không phải fresh holdout hoặc C3 comparison. N1/retry0, cùng prompt/model/effort; quality NOT_GRADED.

[Hội thoại thực tế](CONVERSATIONS.md) · [Draft chưa chắc được gửi](DRAFTS.md) · [Accounting](ACCOUNTING.json) · [Operational](OPERATIONAL.json) · [Diagnostics](PRIMARY_DIAGNOSTICS.json).

Source sạch `5b679acc30e64c4d7a271b4f7aaa49534f10de54`; approved runtime0da6073; evaluator-only missing-scope extension at5b679acc, runtime/prompt parity with4e87350c. Fresh107-product source capture; exact previously approved isolated handoff matrix, no upstream shop write/TTL refresh. Readiness v3 và input được cùng reviewer độc lập approve trước provider.

Đăng ký 7 ca/11 lượt; đã thực thi 11 lượt. Frozen cohorts {"SOURCE_UNAVAILABLE": 3, "SALES_READY": 4}. Giữ tất cả errors/NOT_RUN trong denominator, không retry/best-of-N.

Actual terminal {"SEND_ELIGIBLE": 3, "HANDOFF": 4, "NO_SEND": 2, "CODE_OWNED_SEND": 2}. Capture 5 text/1 ảnh. Handoff/no-send rate 0.5454545454545454; không đồng nghĩa quality-failure rate.

Generation records 16, actual HTTP 15, statuses {"OK": 15, "PROVIDER_ERROR": 1}. Tối đa1request/generation. OAuth auth HTTP riêng:1; không nằm trong generation HTTP. Embedding/auxiliary HTTP:0. Verifier {"PASS": 3}.

Verifier latency(ms) {"n": 3, "p50": 7038.6033000000025, "p95": 8909.77469999998}; native verification+readback(ms) {"n": 3, "p50": 10241.486799999999, "p95": 11852.315699999977}. Tokens {"inputObserved": 139617, "outputObserved": 12012, "usageRows": 15, "cost": "UNAVAILABLE_UNLESS_PROVIDER_EXPOSED"}. Không giả cost/production SLO.

Disposable PostgreSQL đã drop; send disabled, không live send/deploy/merge. Hai registrations được giữ denominator riêng; không gộp thành quality/safety population.

## Giới hạn

- Readiness chỉ chứng minh các path đã khai báo ở clock/source đó, không bảo đảm mọi tool batch/quantity2 hoặc hoàn tất bán hàng.
- P10 pool ba refs là prerequisite evaluator từ exposure cũ; không ép runtime chọn chúng hoặc bảo đảm search chỉ có ba refs. Các source đọc thật và egress vẫn quyết định.
- Source/world mới và evaluator scope mới; runtime/prompt giống interrupted4e873. N1 không chứng minh causal improvement hoặc độ ổn định model. Giữ17captured turns và35generationrequests của interruptedrun riêng; s09 là attempt mới sau3requestscũ, không bị xóa khỏi denominator lịch sử.
- Locked independent quality grades/contextual P2 judgment chưa được thực hiện. Qualification BLOCKED / C3 NOT_RUN / B_NOT_GO.

## Commands thực chạy

```text
node ../c3-media-context-model-prepare-20261103-02.mjs
node ../c3-media-context-model-finalize-inputs-20261103-02.mjs
python ../c3-media-context-model-launch-20261103-02.py
node ../c3-media-context-model-purchase-accounting-20261103-02.mjs
python ../c3-media-context-model-report-20261103-02.py
```

Exact dispatched invocation/start/exit timestamps: `../c3-media-context-model-purchase-command-20261103-02.json`. Fresh capture/initial/preflight and input-review hashes are retained in ARTIFACTS.json.

## Whole-turn findings

Complete11/11native turns, zero NOT_RUN and no hard stop. s15 owner request exceeded its frozen bound before dispatch (0HTTP), then silent handoff; this is not a transport outage. s10 exchange, s12 defect and j2 size-capability handoffs remain. j2 later turns are HUMAN_OWNS_CONVERSATION no-send. j6 reached one verifier-approved reply plus two code-owned clarification sends with retained receipts. No claim that checkout/order completion or sales quality is proved.

Post-run independent accounting/capture/report-accuracy audit: APPROVED by /root/missing_run_review; see POST_RUN_AUDIT.json. Quality remains NOT_GRADED. Stop after the authorized round; no automatic follow-up fix/run or qualification/C3 dispatch.

