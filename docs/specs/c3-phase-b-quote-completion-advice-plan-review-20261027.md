# Review độc lập — kế hoạch quote completion và audit tư vấn

Ngày27/10/2026. Planning base `61f3c0587515ce89310d735583d59521262cbd67`. Reviewer `/root/phase_b_root_cause_plan_review`, độc lập với primary soạn kế hoạch. Review chỉ đọc source/evidence/plan; không provider, credential, source writes hoặc runtime tests.

## Review phương án trước khi viết plan — REVISE

Reviewer phát hiện: P1 thiếu trigger hợp lệ cho code bắt buộc ảnh; P2 ba POS cases là controlled fault injection, không chứng minh shop thiếu POS thật; P2 context đã được reformat nhiều lần mà chưa có tín hiệu cải thiện tổng thể; P2 fit đã có nhiều representation, không thêm block nếu chưa có wire defect. Chẩn đoán phần omission đúng, nhưng không đủ để triển khai auto-media hoặc thêm context.

## Plan revision 1 — REVISE

File `c3-phase-b-quote-completion-advice-plan-20261027.md`. SHA256 `864190c0be501355028b864719e59c591425a8cf88303a0ec01444c45a01d369`.

P0 sửa phân loại/historical corrigendum; P1 quote_product tường minh, giữ giới hạn owner omission/misuse và weighted budget/final gate; P2 exact-wire audit, không mặc định sửa context/fit/prompt. Tách future provider qualification khỏi approval kế hoạch. Primary đã kiểm local links và12existing focused test paths; chưa chạy commands runtime dự kiến.

Cùng reviewer trả REVISE,3P2: (1) quote chưa standalone nên siblings có thể chạy/trộn selection hoặc ghi effect khi quote thất bại; (2) weighted budget chưa đóng counter/protocol/manifest và prepare trong cap, tránh đổi nghĩa toolCalls ngầm; (3) quote result chưa nêu đủ resultBudgetView/Gemini read_product-only normalization và final serialization. Bổ sung đối chứng khách explicit hỏi tồn size không được gọi phần tồn là optional.

## Plan revision 2 — APPROVE

SHA256 `9a795b03eb7c62a5671c7490514bbd71a53eb97b1b63886a844802578278088e`.

- Standalone quote: mixed/duplicate batch reject toàn bộ trước I/O/writes; max1operation/turn, không lặp để sửa kết quả.
- Explicit quoteTask/PRIMITIVE_WORK_V2, prepare trong cap6, reserve2/executed1hoặc2, parent không double-count. Consumed alias và actual primitive execution counters/trace riêng; protocol/manifest/registration/runtime/adapter/accounting validate đồng bộ. Cap6normal/1handoff/7executed không tăng; legacy bytes giữ nguyên.
- Producer→budget exact-current dedupe→Gemini product/media projection→native/final serialized trace→verifier canonical context; strict declaration/parser/actual HTTP mock, null/partial/bounds tests. Official Vertex docs check là bước bắt buộc trước implementation adapter.
- Required stock-size request đối chứng với optional introductory stock, owner misuse không được completion PASS. Không semantic classifier hoặc optional flag.

Relative links/git diff --check đã kiểm, chưa runtime tests/provider. Cùng reviewer kiểm revision2 và trả **APPROVE ở mức kế hoạch**, không còn P1/P2 trong scope. Reviewer xác nhận ba findings đã đóng; explicit-stock đối chứng không bị coi optional; owner chọn operation vẫn là giới hạn, không classifier/role mới; controlled POS/canonical source authority/context-no-patch/silent handoff giữ nguyên.

### Chuẩn hóa line ending để khóa identity Git

Worktree revision2 đã review dùng CRLF, SHA256 `9a795b03eb7c62a5671c7490514bbd71a53eb97b1b63886a844802578278088e`. Git normalize thành LF, nên primary chỉ chuyển CRLF→LF để khóa hash trên đúng bytes sẽ commit; không đổi chữ, cấu trúc hoặc quyết định. Canonical LF SHA256 `526ac86377593db4f652c72cb2159c514081a8d4e8b24df6189da14bca77b468`. Cùng reviewer **APPROVE exact canonical LF revision2**, independently kiểm LF→CRLF tái tạo đúng hash9a795b03: PASS, chỉ line endings, không content delta. Snapshot REVIEW_PENDING trong plan mô tả lúc gửi; authoritative final decision là trail này, không sửa bytes plan chỉ để đổi status.

Approval chỉ cho kế hoạch candidate; không phải implementation review, tests/provider qualification, source readiness hay BGO. Reviewer và primary chưa chạy runtime/provider trong task planning này.

Delivery checks: relative links,12existing focused-test paths, `git diff --cached --check`, bounded credential-pattern scan4staged documentation files và staged Git blob SHA256 khớp canonical plan đã APPROVE: PASS. Chỉ docs/tasks thay đổi; không chạy những lệnh runtime được ghi là dự kiến trong plan.
