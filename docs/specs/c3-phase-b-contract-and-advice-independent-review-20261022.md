# Independent review — kế hoạch sửa hợp đồng và tư vấn

Ngày 22/10/2026. Verdict: **REVISE**. Reviewer riêng `/root/review_contract_advice_plan`, không nhận toàn lịch sử chat nhưng được cấp mục tiêu, ràng buộc, plan và các nguồn lịch sử để tự đối chiếu. Review working tree của [kế hoạch](c3-phase-b-contract-and-advice-fix-plan-20261022.md), base HEAD `47b0cd995952eb7ac7e0c51174a853220698d17e`.

Review chỉ đọc; không sửa runtime, chạy test/provider hoặc live action. Parent đã đọc lại các đoạn code trọng yếu bên dưới và đồng ý cần revision. Phần đầu lưu review lần đầu trước khi sửa kế hoạch; kết quả re-review ở cuối. Chưa triển khai runtime.

## Required revisions

### P2 — T5 chưa xác định đường thực thi và phần khác biệt giữa hai arm

Plan lines88–91 nói reuse runner, cùng tools và thêm ảnh. B1 `run.mjs` thực tế tạo tools chỉ có read và khai báo readOnlyDeclarations. `owner-comparison.mjs` lại phục vụ so model khác, không thể dùng nguyên trạng cho phép thử ảnh cùng model. Ảnh native còn phải khớp `vision:` policy literal/asset/hash trong `gemini-inference.mjs`; không thể chỉ thêm inlineData và gọi toàn bộ context nguyên vẹn.

Sửa nhỏ nhất: chỉ rõ mở rộng runner B1 hiện có, nối media wrapper/declarations giống nhau cho hai arm; candidate preload qua view_product_media hiện hữu, giữ literal/binding cần thiết. Chốt cách đăng ký ba ca mới ngoài corpus cố định. Kiểm request-level rằng khác biệt chỉ là prepared image input và metadata cần thiết, cùng prompt/tool bounds, cả hai vẫn readback/final gate. Không thêm framework/runner mới. Nếu control có thể tự xem ảnh, tên phép thử đúng là preloaded-image versus on-demand access, không mặc định text-only versus image.

### P2 — T1 phải phân biệt chưa ghi với đã ghi nhưng chưa xác nhận được

Plan lines33–36 giữ applied:false cho input reject và nhấn mạnh atomicity, nhưng cần loại trừ lỗi sau commit. `single-agent-commerce-state.ts:187` có thể CAS thành công; `:190–191` readback có thể lỗi/khác; `:214–216` hiện gom exception về STATE_OR_DOMAIN_INPUT và thêm applied:false cho mọi non-OK. Validation atomicity không chứng minh store chưa thay đổi sau CAS.

Sửa nhỏ nhất: applied:false chỉ dùng khi biết chưa ghi. Commit/readback chưa xác định không được mô tả là input chưa áp dụng hoặc yêu cầu model sửa lại giá trị như một lỗi enum. Giữ pending/dependency block, không phát receipt thành công. Thêm fault test vào state suite hiện có: CAS thực ghi rồi readback fail. Không thêm state/recovery engine. Đây là rủi ro code được đọc thấy; review chưa chạy test tái hiện.

## Refinements, không phải blocker độc lập

1. **ETA:** `realtime-sales-catalog.ts:173–189` xét conflict, ưu tiên configured exact region, sau đó mới MIEN-NAM và fallback nationwide. T3 phải ghi rõ thứ tự muốn giữ; map mọi MATCH sang MIEN-NAM chưa tự đồng nghĩa dùng cùng quy tắc checkout. Test có cả tỉnh cụ thể và MIEN-NAM để chứng minh lựa chọn, tránh hai đường khác nhau. Chưa có bằng chứng source thật campaign chứa trường hợp này.
2. **Negotiation recovery:** `single-agent-commerce-effects.ts:199` đã có NEGOTIATION_UPDATED; cart có discountTotalVnd. T4a nên dùng thẳng discriminator/amount hiện có và điều kiện quote/policy ở :343–350. Tổng ưu đãi không đồng nghĩa giảm thêm ở lượt hiện tại; giữ ranh giới đã nêu trong plan.
3. **STALE evidence:** `single-agent-commerce-read-only.ts:148` đã trả currentPublicContext khi có diagnostic. Ưu tiên diff dữ liệu này với trusted context verifier đã nhận trước khi thêm capture runtime. Public field/byte allowlist là đủ; không gọi nguồn lần nữa để suy lại trạng thái cũ.

## Những phần nên giữ

- T0 tách lỗi chức năng, lỗi quyết định mua và polish; không chấm từ khóa.
- T2 không suy không bán màu từ thiếu ảnh; giữ group gate.
- T3 kiểm nguồn trước khi kết luận nguyên nhân; không sửa timestamps/fixture để PASS.
- T4 dùng receipt/freshness sẵn có; không nới authority.
- T5 giữ prompt/verifier, không nhồi ví dụ cứu ca; giới hạn51 outcomes và không retry.

## Giới hạn

39 lượt chỉ quan sát regression của population đăng ký;12 outcomes chỉ sàng lọc giả thuyết ảnh, không chứng minh ổn định/B GO. Nhánh ảnh không giải quyết giọng correction/source wording hoặc tư vấn nóng/nhăn; kết quả tốt của ảnh không đóng các finding đó. N3b, staff image readback,28 slot chưa đăng ký vẫn là giới hạn đã ghi, không cần biến thành gate mới cho gói sửa này.

Đề nghị: sửa hai required items và ba clarification trong plan trước implementation; không cần đổi kiến trúc hoặc tăng số lượt model.


## Re-review cùng reviewer — 22/10/2026

Verdict: **APPROVE ở mức kế hoạch**, từ chính `/root/review_contract_advice_plan`. Reviewer đọc bản đã sửa và phần đầu tasks/plan.md, tasks/todo.md; không thấy blocker mới. Giữ nguyên REVISE phía trên làm lịch sử.

- T1 đóng required finding: phân biệt input chưa ghi với commit/readback chưa xác nhận; giữ pending, loại receipt/cache không còn chứng minh được, kiểm consumer và fault test sau CAS thật.
- T5 đóng required finding: dùng runner B1 hiện có, media tools ở cả hai arm, preload qua vision binding, corpus6/slots12 riêng và effective hashes. Ghi đúng treatment ảnh cấp sẵn so với quyền tự gọi xem ảnh, cùng giới hạn ảnh nhưng có đánh đổi capacity/latency.
- ETA priority và source inconsistency; NEGOTIATION_UPDATED/discountTotalVnd không suy delta; STALE dùng currentPublicContext đã có đều đã xử lý.
- SHA riêng, denominator12 không loại cặp lỗi, giới hạn51 outcomes và không nhận stability/B GO nhất quán với tasks.

Hai lưu ý triển khai, không phải blocker hoặc gate mới:

1. Nối preload sau preparation bằng cơ chế hiện hữu; test preparation không chạy hai lần hoặc làm lệch accounting/tool budget.
2. T1 fault test phải thực sự ghi store trước readback throw/khác, rồi thử tác vụ phụ thuộc và patch tiếp cùng turn. CAS giả trả true nhưng không ghi chưa chứng minh invariant này.

Parent đã bổ sung rõ hai lưu ý vào mục test T1/T5 và cập nhật trạng thái plan/todo. Đây là làm rõ yêu cầu kiểm thử đã duyệt, không thay thiết kế. Reviewer không review runtime mới, chạy tests/provider hoặc tác động live. Giọng correction/source wording, nóng/nhăn, N3b, staff-image readback và các slot chưa đăng ký vẫn là finding/giới hạn mở.


## Implementation review lượt1 → fix → lượt2 — 22/10/2026

Cùng reviewer `/root/review_contract_advice_plan`, read-only, không chạy tests/provider hoặc edit source.

Lượt1 **REVISE** phạm vi T1–T4: owner operation clause cũ phủ định unknown-commit semantics; numeric/preferences domain error chưa field-specific và store read outage bị gán invalid input; snapshot diagnosis overwrite claim cùng type/scope. Parent sửa đúng clause/hash, field feedback/source error và giữ array toàn bộ projected claims. Bổ sung current-message fit quote presence và ETA priority checks theo lưu ý. Không voice rewrite/semantic parser/gate mới.

Lượt2 **APPROVE T1–T5 tại `dc3114229d2e126937a15d611dd0883e1490a777`**, worktree sạch. Ba finding đã đóng; không còn required fix. Reviewer xác nhận unknown-commit latch/receipt/cache scope, shared ETA resolver, receipt-bound negotiation recovery và T5 corpus6/slots12/cap48, both-arms media, once-only preparation/pinned metadata/readback/final gate. Baseline24 giữ nguyên; lỗi ở comparison vẫn trong denominator, không retry hoặc thay mẫu.

Verdict chỉ review source/tests đã viết; không xác nhận provider quality, stability hoặc B GO. Các commit tài liệu/evidence sau source trên không được mô tả là reviewer đã kiểm provider outputs.
