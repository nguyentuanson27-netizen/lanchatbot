# Independent implementation review — source contract

Reviewer `/root/review_fix_source_contract`, exact clean HEAD `bb4e284d9fe07409a096320337043ae7c22b9de4`. **REVISE: 1 P2, không P1 xác nhận.** No provider/credential/live writes. Reviewer chạy 11 focused zero-provider tests PASS.

## P2: native readiness thiếu actual customer outcome

`feedback-native-gates.mjs:35–42,71–73` tại reviewed HEAD chỉ kiểm result.terminal và review labels; `feedback-native-run.py:45–52` chỉ kiểm errors/process/cleanup. `isolated-integration.mjs:580–583` chỉ xuất attachments cho media. Prefix có 21 eligible + enqueued1 nhưng capture rỗng vẫn được duyệt (`GATE_ACCEPTED_21_ELIGIBLE_WITH_ZERO_CAPTURE`). Đây là gap evaluator, không chứng minh runtime làm mất tin nhắn.

Correction: mọi persisted job xuất public attachments và accepted Outbox evidence; collector phân biệt send-eligibility-only B1 với actual capture sau ingress; validate counts/types/duplicates/accepted rows trước human review; review bind thêm customerOutcomeHash. Dùng cùng check ngay sau mỗi persisted job, trước job tiếp theo.

Không áp capture==terminal.text cho code checkout, receipt ACK hoặc handoff một cách mù. Những nhánh đó dùng accepted committed capture hiện hữu; không thêm runtime exception hoặc gửi mới.

## Fix và observed RED → GREEN

Test persisted eligible/enqueued nhưng capture rỗng đã FAIL bằng `Missing expected exception` trước sửa. Sau correction, focused controls/native-gate/delivery-capture: **17 PASS**. Có coverage ordinary text/gallery, missing capture/attachment/count mismatch/duplicate image/pending row, changed customer outcome hash, code checkout/receipt ACK/handoff/silent handoff hợp lệ.

Thay đổi chỉ eval collector/gates/tests; không owner/verifier prompt hoặc runtime semantics. **Đang chờ cùng reviewer re-review correction trước seal/run.**
