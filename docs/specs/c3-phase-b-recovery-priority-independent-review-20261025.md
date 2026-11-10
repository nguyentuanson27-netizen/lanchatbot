# Independent review — Phase B recovery priority

Ngày 2026-10-25. Reviewer: `/root/review_recovery_priority_plan`.

**Verdict: REQUEST_CHANGES.** Hướng sửa đúng; P0 đủ rõ để viết test, P1 cần contract focus rõ hơn, P2 cần thu nhỏ trước implementation.

- Reviewed HEAD: `6398dda29f443ca9277658aba69a638777c61fc5`.
- Reviewed plan: [recovery priority](c3-phase-b-recovery-priority-plan-20261025.md), chưa commit.
- Plan SHA256: `09c42398a74bcd930999e08381ed87932c583f3cf83881d231a02321af10c789`.
- Chỉ đọc source/tài liệu/evidence. Không sửa runtime, không chạy provider hoặc test trong review.
- Phiên review bị ngắt một lần do application network permission revoked; cùng reviewer được nối lại và đã trả kết luận đầy đủ. Không coi nhận xét sơ bộ trước lỗi là approval.

## 1. [P1] Chưa có bằng chứng để quyết định ảnh đã đáp ứng toàn bộ yêu cầu

Plan dòng 21, 23, 67, 69 đồng thời yêu cầu hồi ảnh thành công không handoff và mixed còn thiếu thì ảnh + handoff. `single-agent-commerce-ingress.ts:270` chỉ chứng minh ảnh đúng sản phẩm, còn hợp lệ và draft thất bại; không chứng minh toàn bộ yêu cầu khách đã được đáp ứng. Tool từng đọc giá/size cũng không chứng minh phần đó đã được trả cho khách.

Nếu để mở, implementation dễ thêm classifier/regex/obligation hoặc chuyển mọi ca có ảnh sang handoff, vượt mục tiêu vòng sửa.

**Sửa tối thiểu:** coi recovery media là kết quả từng phần; không tuyên bố hoàn tất mixed intent. Giữ nhánh media + handoff hiện có cho `SIZE_RULE_UNAVAILABLE`. P2 mới chỉ xử lý failure đăng ký không có media recovery hợp lệ. Hoãn generic mixed-intent classification; trong báo cáo, nhận ảnh nhưng còn thiếu trả lời vẫn là partial/unresolved.

## 2. [P1] Tên sản phẩm xuất hiện chưa đủ xác lập focus

Plan dòng 49–55; source `single-agent-commerce-ingress.ts:27`, `:189`, `:324`.

Resolver xác minh tên tồn tại trong catalog, không xác minh khách chọn hay đang từ chối tên đó. Ví dụ “Không lấy Thạch Thảo nữa, gửi chị mẫu kia” vẫn chứa một tên hợp lệ duy nhất. `currentProductId` còn cấp context cho lượt sau, không chỉ dùng phục hồi ảnh; ghi nhầm có thể ảnh hưởng tool sau.

**Sửa tối thiểu:** quy định nguồn chứng cứ, lượt xác lập, phạm vi tái sử dụng và invalidation của focus. Không dùng “chỉ thấy một tên” làm đủ chứng cứ ý định. Đăng ký regression cho tên bị phủ định, hai sản phẩm, nhóm tên trả nhiều SKU và đổi sang tham chiếu chưa rõ. Khi resolver không chứng minh được referent, giữ unresolved và fallback/handoff đúng capability; không thêm parser phủ định để làm test xanh. Chỉ hứa nối provenance của chuỗi đã xác lập rõ món, không hứa giải toàn bộ tham chiếu tự nhiên.

Đây là khoảng trống thiết kế dự kiến, không phải kết luận full run đã gửi ảnh của món khách phủ định.

## 3. [P2] Câu mô tả enqueue sau receipt dễ làm tách transaction

Plan dòng 64 viết “Chỉ sau receipt/readback … mới enqueue lời xác nhận”. Source `single-agent-commerce-persistence.ts:55–76` và `request()`/`terminalOutcome()` trong `single-agent-commerce-handoff.ts` hiện commit state, handoff event, tag intent và Meta Outbox trong cùng transaction, sau đó readback.

**Sửa thành:** chuẩn bị holding reply cùng handoff decision; atomically commit state + handoff event/case + tag intent + Outbox. Chỉ công bố terminal HANDOFF sau khi chứng minh commit/readback. Delivery tiếp tục qua gate hiện có.

Receipt chứng minh công việc được lưu và tag intent được xếp hàng; chưa chứng minh Pancake đã nhận tag hoặc người xử lý đã đọc. “Shop đã nhận yêu cầu” phù hợp mức chứng cứ này. Không biến thành lời báo đã liên hệ/được người xử lý tiếp nhận nếu chưa có bằng chứng.

## Điểm giữ nguyên

- P0 giữ evidence trong lượt khi canonical offer và authority/release không đổi; không kéo dài expiry, không nới so sánh snapshot toàn cục.
- Recovery không vượt permission/privacy/recipient, stale evidence hoặc effect commit chưa rõ.
- B1 không giả quyền handoff. Ba provider errors dùng làm fault-injection persisted integration; không đổi denominator hoặc tuyên bố chữa raw B1.
- Giữ owner/verifier prompts, rubric và ranh giới suy luận đã chốt; không mở lại vòng sửa giọng văn.

## Checklist sửa plan trước code

1. Thu P2 về failure không có recovery hợp lệ; hoãn generic mixed media + handoff, giữ nhánh size hiện có.
2. Chốt provenance/invalidation focus và giới hạn tham chiếu chưa giải được.
3. Sửa thứ tự transaction/receipt/enqueue.
4. Liệt kê failure reason mới được auto-handoff cùng mapping policy; không để implementation tự chọn nghĩa.
5. Acceptance riêng: ảnh cận được gửi; ảnh hợp lệ được phục hồi; failure còn lại có đúng một handoff hoặc được ghi unresolved. Không duplicate effect hoặc tăng NO_SEND do commit thiếu chứng cứ.

Kế hoạch được review chưa được chỉnh theo các finding trong lượt review này. Chưa có approval implementation hoặc bằng chứng model cải thiện.

Sau lượt review, owner đã yêu cầu chỉnh kế hoạch; [revision 2](c3-phase-b-recovery-priority-plan-20261025.md) ghi các chỉnh sửa và self-review riêng. Verdict trên áp dụng cho đúng hash bản cũ ở đầu tài liệu, không tự trở thành approval cho revision 2.
