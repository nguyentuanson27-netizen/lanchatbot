# Review trail — Phase B recovery/discovery fix plan

Ngày: 27/10/2026. Planning base `b7e197d8877c4643fba2f86121ac1f8ec87af21d`. [Plan](c3-phase-b-recovery-discovery-fix-plan-20261027.md).

Owner yêu cầu review độc lập → sửa → cùng reviewer kiểm lại đến APPROVE. Reviewer: agent `five_run_conclusions_independent_review`, cùng reviewer đã phản biện kết luận năm vòng. Đây là review kế hoạch, không phải implementation/provider/B GO. Không runtime/prompt/source-store mutation hoặc model qualification trong task này.

Hash policy: SHA256 của UTF-8 text với line endings chuẩn LF; không ghi hash ngược vào plan rồi thay identity. Decision cuối cùng phải trỏ exact revision/hash, không sửa bytes plan sau approval để đổi status.

## Revision 1 — REVISE

Canonical LF SHA256: `7e9bd74851d4f8b928e8c370282b96b550dd363c78d1a5c5ba9217cd04cdb57e`.

Reviewer có ba P2:

1. Mixed-read continuation không đúng với runtime: read-level UNAVAILABLE/STALE tự handoff; chỉ OK+field availability gap còn cho owner cân nhắc. Không đổi composition ngầm để cứu batch.
2. Retained envelope chưa có contract tại validation trước return và caller drain: lỗi plain throw có thể tiếp tục làm mất result; normal return invalid có thể khiến drain pending messages. Cần observed result/qualification error riêng, no-drain và count đúng một terminal.
3. Chưa chứng minh batch thực tế vừa MAX_RUNTIME_PRODUCTS=4, charged8KB và provider wire bounds, nhất là partial-result path. Cần public representative fixture và real composition/projection, không chỉ mock nhỏ/overflow test.

Hai lưu ý implementation: diagnostic tool/field names phải từ code allowlist; giữ AMBIGUOUS khi xác định tên mẫu khác ứng viên discovery theo nhu cầu.

## Revision 2 — REVISE

Canonical LF SHA256: `8378e220c4baba67e7a6dca77bfee42d331511c989e3ec9f17a584d5222d1f55`.

Resolution:

- Tách rõ OK+field gap với UNAVAILABLE/STALE; giữ terminal auto-handoff hiện hành và ghi rủi ro batch nhiều nguồn.
- Không thêm throwing worker validator. Helper eval hẹp `retainObservedAttempt` giữ result trước validation, qualifier INVALID/error stage/code và observed terminal; caller không drain khi invalid, giữ actual outbox/commit/capture. Tests ở fixture pre-return và consumer post-return, không rewrite terminal/counters hoặc đếm đôi.
- Thêm feasibility gate trước instruction patch: `single-agent-commerce-discovery-feasibility.test.ts` và public fixture tương đương kích thước/cấu trúc; real composition/core/projection/mock wire, bytes từng stage và initial products. Hai ứng viên phải vừa; ba chỉ khi chứng minh vừa. Không vừa thì giảm phạm vi hoặc DESIGN_NOT_READY, không tăng bound/trim evidence.
- Ghi planned helper/test paths và exact commands; consumer campaign mới không sửa historical driver bytes. Allowlist diagnostic dùng identifiers do code định nghĩa, unknown thành sentinel; không lưu raw model strings/PII hashes.

Cùng reviewer xác nhận ba P2 revision1 đã đóng, nhưng còn một P2 mới: không drain ngay sau INVALID chưa đủ, vì dispatcher xử lý outbox dùng chung DB. Một lượt/journey VALID sau đó vẫn có thể drain pending rows của attempt invalid.

## Revision 3 — APPROVE

Canonical LF SHA256: `762769e338908b8733900bda9af96760dea0b440a5509ad68a758a9633f0d698`.

Resolution P2 revision2:

- INVALID latch theo disposable database/shared dispatcher queue trước return, mọi drain/dispatch entrypoint kiểm chốt.
- Slot tiếp theo dùng cùng DB ghi BLOCKED/NOT_RUN_BY_QUALIFICATION và originating slot/error reference, không generation/write/dispatch; DB độc lập vẫn tiếp tục.
- Giữ actual pending rows/commit/capture, không cancel hoặc rollback, không thay production delivery. Một slot chưa chạy không có observed terminal; registration denominator giữ nguyên, executed/NOT_RUN báo riêng.
- Tests hai journey chung DB, mọi dispatch entrypoints, queue DB độc lập, pending rows không đổi và consumer counters. Điều kiện chạy full có ngoại lệ rõ cho invariant/queue-safety failure; không claim 51 executed nếu còn slot bị chốt.

Cùng reviewer đã kiểm lại exact canonical LF hash trên và quyết định **APPROVE — không còn P1/P2 mở trong phạm vi kế hoạch**. Reviewer xác nhận retained envelope/qualification riêng; latch toàn shared queue trước xử lý tiếp; NOT_RUN không giả terminal/executed/PASS; mixed reads giữ đúng auto-handoff; batch qua feasibility gate trước instruction; không mở lại verifier/giọng hoặc tăng budget.

Approval chỉ áp dụng plan revision3 đúng hash trên, chưa xác nhận implementation, test hoặc provider qualification và không phải B GO. Giữ nguyên bytes plan sau approval; trạng thái REVIEW_PENDING trong snapshot plan được thay thế bởi quyết định tại trail này. Lệnh runtime/provider không chạy trong task; links/planned paths/hash và diff docs đã được kiểm riêng.
