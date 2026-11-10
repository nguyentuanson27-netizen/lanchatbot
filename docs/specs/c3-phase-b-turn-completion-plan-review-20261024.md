# Independent review — Phase B turn completion plan

Ngày: 2026-10-24. Reviewer độc lập: `/root/review_turn_completion_plan`. Kết luận: **REVISE**. Review kế hoạch chưa commit trên base `8115516e33b43c68260cb9c2662073cfbd46540d`. Chỉ đọc; reviewer không sửa code, chạy test hoặc gọi provider. Root lưu kết quả này; chưa áp dụng các sửa đổi nội dung kế hoạch.

Đối chiếu [kế hoạch](c3-phase-b-turn-completion-plan-20261024.md), toàn bộ 51 hội thoại trong `media-size-acceptance-20261024`, TOOL_DIAGNOSTICS, SNAPSHOT_DIAGNOSTICS_ALIGNED, code handoff/persistence/ingress và thử nghiệm advice-only 19/10, capability 21/10. Line references dưới đây là vị trí tại lúc review, trước các chỉnh sửa tiếp theo.

## P1 — commit/readback chưa bảo đảm Outbox không gửi lời báo đã mất quyền

Plan dòng 46 và tests từ dòng 52 ghi chỉ gửi khi commit/readback thành công. Nhưng `apps/worker/src/single-agent-commerce-persistence.ts:52` chỉ validate trong transaction khi có media; dòng 64 enqueue cả text-only holding reply. `single-agent-commerce-handoff.ts:125` mới gọi terminalOutcome sau commit. Readback policy có thể trả NO_SEND trong khi Outbox đã tồn tại; terminal result không tự thu hồi tin.

Đây là khoảng trống hiện hữu cần kiểm khi mở thêm holding reply, **chưa phải lỗi gửi sai đã quan sát trong hai ca snapshot cũ** vì hai ca đó SILENT.

Yêu cầu sửa plan: định nghĩa thời điểm chốt policy decision và quyền gửi được revalidate tại delivery. Thêm policy/authority interleaving trước commit, sau commit–trước sequence 0 và restart. Assert actual accepted messages bằng 0 khi mất quyền, không chỉ assert terminal NO_SEND. Tái dùng cơ chế hiện hữu nếu đủ; không mặc định thêm migration/framework.

## P2 — phạm vi DEPENDENCY_FAILURE rộng hơn snapshot refresh

Plan dòng 44–47 chưa phản ánh hết caller. `single-agent-commerce-ingress.ts:142–149` dùng reason này cho private checkout không hoàn thành và ảnh khách chưa có privacy projection. `single-agent-commerce-handoff.ts:155` dùng cho dependency recovery; request_handoff cũng nhận reason theo schema.

Đổi matrix SILENT → HOLDING sẽ làm cả các nhánh trên có lời báo dù không sửa ingress. Không thể ghi private-input behavior giữ nguyên một cách tổng quát.

Yêu cầu sửa plan: lập bảng caller/nhánh và hành vi được thay đổi. Kiểm private checkout/ảnh khách không đưa private data vào model hay lời báo, không duplicate khi commit đã hoàn tất, không chen vào HUMAN. Thay đổi này có thể hợp lý nhưng phải được nhận diện và kiểm chứng.

## P2 — N1 thành công chưa chứng minh T2 đã được sửa

Plan dòng 69, 126, 140 cho phép nhánh không có defect/code change, nhưng hai ca N1 trả lời được vẫn có thể được diễn giải là T2 thành công. Lịch sử `execution-media-run-20261024` từng hết OWNER_TOOL_MODE nhưng chuyển verifier FAIL; run gần nhất lại OWNER_TOOL_MODE.

Hai controls tìm theo tên/mã (`b1-search-read-v2/v3`) không tương đương yêu cầu khám phá/chọn mẫu; chỉ giúp kiểm đường truyền dữ liệu.

Yêu cầu sửa plan:

- T0 đọc trace của chính hai ca qua các run trước; giữ controls tên/mã làm bổ trợ.
- Trước run ghi T2_IMPLEMENTED hoặc T2_NO_INTERVENTION.
- Không can thiệp mà N1 trả lời được chỉ ghi OBSERVED_COMPLETE, không đóng root cause hoặc gọi đã fix.
- Có can thiệp thì cần defect → change → deterministic evidence; N1 vẫn không chứng minh ổn định.
- Không cần tăng repetitions hoặc corpus để sửa cách kết luận này.

## P2 — controls trực tiếp của prompt opening đang nằm sau gate

Plan dòng 85, 121–126 sửa opening rule dùng chung cho ads/organic/repeat/multipart nhưng năm ca này nằm ở 25 lượt cuối. Nếu T2 fail, campaign dừng trước khi kiểm regression trực tiếp của T3.

Yêu cầu sửa plan: đưa cả năm opening cases vào stage đầu cùng deadline. Giữ 51 native + 17 controls và dependency order; có thể dùng 31 prefix + 20 remaining hoặc hoán đổi để giữ prefix26. Không chạy lại ca, không tăng denominator. Gate phải xem kết quả thay đổi lẫn controls trực tiếp.

## Những điểm được reviewer đồng ý giữ

- Exact snapshot, không dùng nghĩa claims tương đương để tái sử dụng PASS.
- Policy candidate qua nguồn/importer, không hard-code đè SILENT.
- Handoff hữu ích không đồng nghĩa thành công tư vấn/tự động hóa.
- T0 có giới hạn; không mặc định thiếu context.
- T3 thử đúng xung đột cụ thể, không rewrite toàn prompt/thêm ví dụ fit ca.
- Không lặp advice-only/capability trimming khi chưa có giả thuyết khác.
- Giữ population/accounting/no retry/whole-turn review.
- Có thể hoãn lỗi tư vấn chưa có can thiệp mới, nhưng phải báo rõ chưa sửa phần chất lượng đó; không thêm bản sửa giọng chung chỉ để đủ danh sách.

**Kết luận:** hướng chính hợp lý và tránh được nhiều vòng lặp cũ; chưa triển khai nguyên bản. Sửa hợp đồng handoff–Outbox, phạm vi policy, cách kết luận T2 và vị trí controls trước implementation. Các findings chưa được áp dụng trong lượt review này.
