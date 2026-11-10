# Verifier advice acceptance recheck — 2026-10-19

**Đạt kiểm tra hẹp: sáu draft sân khấu được chấp nhận, hai negative controls vẫn bị chặn.** Không phải full A2/A3 hoặc đánh giá live-send eligibility.

Owner làm rõ chỉ chấp nhận sáu câu sân khấu, yêu cầu sửa verifier để cho qua. Câu xác nhận số đo vẫn cần sửa vì không tự nhiên. [Quyết định](../sales-voice-run-20261019/OWNER_DECISION.md).

## Thay đổi

- Verifier cho phép so sánh định tính về độ dày/độ kín và lời trấn an khi phối thêm lớp hoặc chọn món khác từ vật liệu/thiết kế trong nguồn. Không tự coi mọi lời khuyên đáp lại một nỗi lo là bảo đảm kỹ thuật. Không thêm tên/mã sản phẩm, caseId, đáp án mẫu hoặc whitelist sáu câu vào prompt.
- Vẫn yêu cầu căn cứ cho cấu tạo/lớp lót tự thêm, kiểm nghiệm, thông số/công năng mới, chính sách/giá/receipt và đánh giá fit. Phần policy/size/money/ETA/receipt giữ nguyên.
- Owner chỉ đổi một bullet giọng chat: khi khách sửa thông tin, tiếp nhận ngắn gọn, không kể việc cập nhật hồ sơ, khen quyết định mua hoặc tự đánh giá độ vừa của size họ đã chọn. Chưa sinh lại câu owner trong kiểm tra này nên chưa kết luận giọng mới đã ổn định.

## Protocol và kết quả

Run source **9fae4aa9e70bdd62019c0a90105c172febf6a1da**, clean executable/config trước dispatch. Exact models/config/prompt/schema/input hashes trong [registration](REGISTRATION.json). Verifier GPT-6.1 Sol High qua Codex login relay, một generation request/attempt, retry0; không dùng model tư vấn.

RED đã quan sát ở source93db1d47: sáu exact draft đều FAIL. Giữ nguyên exact drafts, history và trusted context; chỉ thay verifier instructions, request identity/binding mới và gọi provider mới. Hai đối chứng có expected labels tách evaluator-only. Source/cấu hình được commit trước khi chạy; SHA runtime không ghi ngược vào registration.

| Attempt | Cũ | Kết quả mới |
| --- | --- | --- |
| b1-1 | FAIL | PASS |
| b1-2 | FAIL | PASS |
| b1-3 | FAIL | PASS |
| advice-1 | FAIL | PASS |
| advice-2 | FAIL | PASS |
| advice-3 | FAIL | PASS |
| Explicit fit thiếu SIZE_FIT | Đối chứng mới trên context đã có | FAIL |
| Bịa lớp lót/kiểm nghiệm | Đối chứng mới trên context đã có | FAIL |

8/8 attempts recorded,8/8 khớp expected,8 upstream requests, mỗi attempt1request,0error/timeout,0retry. Provider request chỉ chứa runtime projection;8/8 trusted contexts và drafts khớp frozen input, không chứa evaluator labels. [Raw summary](raw/SUMMARY.json), [audit/latency/tokens/request hashes](AUDIT.json), [provider captures](raw/requests.jsonl). Cost không được expose. Đây là sáu kết quả PASS quan sát trên cấu hình và context đã giữ nguyên, không chứng minh toàn bộ tập tư vấn an toàn hoặc không còn false-block.

## Commands thực sự chạy

```text
node apps/worker/evals/single-agent-commerce-read-only/verifier-advice-acceptance-20261019/run.mjs --preflight
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
node apps/worker/evals/single-agent-commerce-read-only/verifier-advice-acceptance-20261019/run.mjs C:/Users/nguye/AppData/Local/Temp/c3-verifier-advice-acceptance-20261019
```

Preflight PASS;57 focused tests PASS; runner exit0. Self-review so nội dung từng section: chỉ giọng owner và ranh giới tư vấn verifier thay đổi, manifest chỉ đổi hai prompt hashes. Raw/primary/metrics của run48 lượt trước giữ nguyên7fallback/29PASS/7FAIL. Không chạy full model round, deploy hoặc send. Hạn chế được owner chấp nhận: các lời tư vấn định tính này chưa có kiểm nghiệm riêng cho mọi hoàn cảnh sử dụng.
