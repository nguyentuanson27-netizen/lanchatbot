# Independent review — selection/private checkout fix plan

Reviewer: same independent agent `/root/phase_c_independent_review`. Planning only, không implementation/model calls. Diagnostic source6c5023ab và primary results giữ nguyên; Phase C BLOCKED.

## Revision0, bd5031a0 — REQUEST_CHANGES

Reviewer chấp nhận hướng F1/producer audit, progress từ actual committed missing-fields giảm và bounded affirmative recognizer1field/2enum. Không cần mở voice prompt hoặc generic Vietnamese parser.

- P1: draftCOD cũ có thể được dùng lại sau lời “không COD/chưa chọn” và lượt gửi field khác. Cần persist unresolved payment và block readiness/preview/confirm xuyên lượt, không suy method đối lập hoặc tự resolve vì các field khác đủ.
- P2: checkoutDetails có callers legacy/salesSignals/privacy. Cần bảng consumer/mode, giữ default legacy; candidate unknown không bị modelPaymentMethod nâng thành RESOLVED.

Revision1 bổ sung4.4 với persistent PAYMENT_METHOD clarification, direct domain guards và actual payment capture evidence trước resolve; bổ sung consumer matrix/default behavior và regression xuyên lượt/caller/privacy.

## Revision1, a5e6270a — APPROVE PLAN

Exact clean reviewed HEAD `a5e6270ae7ac5b3195e6d0da03e6841a7fe41e81`. Same reviewer xác nhận cả2findings đã đóng; không còn finding cần sửa trong phạm vi kế hoạch. Payment chưa rõ được persist/block xuyên lượt, chỉ actual captured payment evidence mới giải quyết; candidate closed recognizer tách legacy fallback/privacy. Direct domain calls, old preview, duplicate/replay và progress budget đã có requirements/tests.

Approval chỉ cho kế hoạch; chưa implementation, test runtime, real-PG hoặc provider run theo kế hoạch này. Phase C vẫn BLOCKED. Delivery sau a5e6270a chỉ ghi status/review/tasks, không thay nội dung phương án đã approve.
