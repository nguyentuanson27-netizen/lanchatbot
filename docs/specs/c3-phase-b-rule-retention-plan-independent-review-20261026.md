# Phase B — review độc lập phương án giữ quy tắc, 26/10/2026

**Verdict: REVISE.** Reviewer `/root/rule_retention_plan_review`, read-only trên source `461e6e571ce60a18b3e231a4d5ce889afb151f6f` và tài liệu audit chưa commit. Reviewer đọc AGENTS, spec liên quan, [audit](c3-phase-b-rule-retention-audit-20261026.md), 21 actual outcomes, runner/composition/adapters/persistence/delivery. Không sửa file, chạy test hay provider. Tài liệu này ghi kết quả review; chưa phải kế hoạch implementation đã sửa hoặc acceptance mới đã chạy.

Hướng tổng thể phù hợp: sửa phân công code/model và terminal workflow, giữ giọng hiện hành, không thêm classifier/regex/role/framework/repair loop. Cần chốt các thiết kế dưới đây trước implementation để tránh lặp cách sửa cục bộ.

## 1. P1 — Partial reply + handoff chưa có đường verify/transaction được xác định

`single-agent-commerce-handoff.ts:89–129` commit chuyển HUMAN ngay; runner kết thúc khi có terminal. `single-agent-commerce-persistence.ts:32–54` hiện chỉ mang tin tĩnh hoặc ngoại lệ hẹp ảnh no-chart. `single-agent-commerce-handoff-delivery.ts:43–50` bind exact HUMAN state/policy/group.

Chỉ nói “cùng group trước enqueue” chưa giải quyết thay đổi revision do handoff. Không dùng PASS cũ để cấp quyền cho snapshot đã đổi; không nới BOT/HUMAN hoặc coi draft có protected facts như static holding với claims rỗng.

Kế hoạch phải phân biệt:

- **Còn generation và muốn giữ final text từ owner:** chuẩn bị ý định chuyển nhưng chưa commit; có exact final reply; tối đa một verifier; code kiểm facts/policy/permission/recipient/revision rồi atomic commit ownership, event, tag intent và đúng message group. Thiết kế binding phải xử lý riêng transition đã được code duyệt và vẫn chặn mọi thay đổi ngoài transition đó. Đây là yêu cầu thiết kế cần chứng minh bằng test, chưa phải khả năng có sẵn.
- **Hết generation hoặc không có draft đạt:** handoff bằng tin code-owned. Chỉ giữ partial bằng renderer hẹp có authority cho fact đó; không lấy lại câu tư vấn từ draft bị reject. Không hứa giữ được mọi câu model đã viết.

Tin xác nhận chuyển chỉ được enqueue khi transaction thành công. Commit không rõ thì NO_SEND, không retry. Silent/customer-requested handoff vẫn theo đúng policy, không tự chen lời tư vấn.

## 2. P2 — Final handoff cần contract xuyên suốt và accounting rõ

`single-agent-commerce-read-only.ts:144–159` cấm tool sau hai rounds; `gemini-inference.mjs:204–224` còn đặt FINAL_REPLY, declarations rỗng, mode NONE. Chỉ sửa runner sẽ không làm wire gọi được handoff. Bật toàn bộ tools lại sẽ tái tạo lỗi late-tool.

Kế hoạch phải định nghĩa quyền terminal chỉ cho request_handoff, nhất quán metadata/declarations/Gemini/Sol/runtime validation; vẫn tối đa ba owner generations. Khi còn calls trong giới hạn sáu, terminal call dùng phần còn lại. Nếu cả sáu calls đã dùng mà vẫn cho handoff thì cần đăng ký ngoại lệ terminal effect và thống kê riêng; không tuyên bố giữ nguyên hoàn toàn budget. Lượt cuối gọi handoff không được phát sinh generation thứ tư; dùng recovery code-owned nếu chưa có final text.

## 3. P2 — Opening cần ngoại lệ đúng phạm vi; không handoff vì field trình bày tùy chọn

`single-agent-commerce-read-only-tools.ts:257–263` và `reply-assembler.ts:85–95` cố ý không điền verified field rỗng hoặc thuộc tính parent vào component. Lệnh tránh đọc đủ openingQuote có nguồn từ [turn-completion plan](c3-phase-b-turn-completion-plan-20261024.md) để không chen intro vào deadline/size/correction; không mô tả toàn bộ guard này là sai.

Sửa kế hoạch theo phạm vi:

- Ngoại lệ form/ảnh chỉ cho first-contact quote khi chính khách đang hỏi giá và đã xác định mẫu. Deadline/size/correction vẫn đi thẳng trọng tâm.
- Tên/offer/giá đúng cần cho báo giá. Material/form chỉ đưa khi có verified evidence đúng scope; không parser mô tả, dùng search attributes hay handoff chỉ vì thiếu field trang trí.
- Khi đã có product ref sau search, cân nhắc batch read_product + selector ở round hai; không cần thêm round tìm ảnh.
- Ảnh cần thiết thiếu thì handoff theo owner hiện hành, giữ giá qua thiết kế mục 1.
- Multipart set + áo trả đủ hai ý; không ép SINGLE chỉ để có card rồi bỏ giá áo, không thêm giá chân váy không liên quan.

## 4. P2 — Acceptance phải kiểm group sau HUMAN transition tại delivery

Terminal text đúng và DB có event chưa đủ. Group mới mang protected facts sau chuyển ownership phải được kiểm từ commit tới sequence 0; không chỉ assert chuỗi từ khóa.

Acceptance tối thiểu trước provider:

1. Search → stock UNKNOWN → terminal handoff trong ba owner generations; đối chứng chỉ hỏi giá với cùng stock UNKNOWN không handoff.
2. Giá đủ + ảnh được yêu cầu thiếu → một handoff group giữ giá đúng/holding, đúng một event/tag intent, không thêm BOT group riêng.
3. Đổi/trả đủ căn cứ → kết luận ngắn + bước từ policy + handoff thật, không tự báo đã duyệt/hoàn tất đổi.
4. Giá/policy hết hạn hoặc recipient/quyền/revision đổi giữa verify và commit hoặc trước sequence 0 → chặn cả group, không gửi riêng giá/ảnh.
5. Commit không rõ/CAS conflict → không xác nhận đã chuyển, không commit lại.
6. Silent/customer-requested handoff giữ policy; thiếu capability không giả chuyển thành công.
7. Opening ảnh đủ/thiếu, repeat/unresolved/deadline/multipart và scope thuộc tính component.
8. Mọi fallback reachable theo capability có trong manifest/catalog/provider registration; artifacts lịch sử giữ nguyên.

Sau deterministic checks mới đăng ký provider targeted N1 có cả đối chứng. Giữ 17 scoped verifier controls trước native cases, giữ mọi lỗi/fallback trong denominator. Targeted đạt mới full B1/B2/B3. Báo riêng eligibility, handoff thật và usefulness cho quyết định mua hàng.

## Trạng thái sau review

Chưa sửa runtime/prompt/model/corpus hoặc chạy provider. B chưa GO. Bước tiếp theo là sửa kế hoạch bằng contract terminal, thứ tự prepare/verify/commit và binding/acceptance cụ thể trên đây, rồi mới implementation.

## Review kế hoạch cụ thể và đóng findings

Owner yêu cầu sửa kế hoạch → review → fix. Bản [kế hoạch sửa](c3-phase-b-rule-retention-fix-plan-20261026.md) revision 1 được cùng reviewer đọc lại, verdict **REVISE 2P2**:

1. Renderer B còn nhập nhằng “offer được hỏi/đọc”; COMPARE có thể mở thêm giá mà khách không hỏi. Yêu cầu scope typed hẹp, không dùng đọc được làm chứng cứ khách cần.
2. Prepare pin group trước khi owner sinh FINAL là không khả thi. Yêu cầu prepare authority/evidence riêng, seal group sau FINAL và trước verifier.

Reviewer cũng yêu cầu giữ receipt predecessor nguyên gốc và phân biệt caller timeout với group thật sự đã commit. Revision 2 đã sửa renderer chỉ một explicit SINGLE pair/PRICE claim, loại COMPARE/sellingOptions/multi-pair; tách prepare/seal; giữ receipt gốc; bổ sung tests commit-before-timeout/rollback-before-timeout; làm rõ holding chứa effect confirmation không thuộc precommit verifier path.

**Cùng reviewer kiểm lại revision 2: APPROVE ở mức kế hoạch, không còn finding bắt buộc trước implementation.** Không cần thêm model generation/role/framework hoặc sửa giọng. Đây là approval thiết kế; phải kiểm RED→GREEN và review executable diff trước run. Reviewer không sửa code, chạy test/provider ở bất kỳ lượt nào.
