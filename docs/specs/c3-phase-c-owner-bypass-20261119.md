# Quyết định owner — GO theo bypass tạm thời của Phase C

Ngày 19/11/2026. Owner chốt “tạm thời by pass, ghi lỗi vào. quyết định GO”. **Quyết định chuyển bước là GO (`OWNER_BYPASS`)**. Phạm vi là chuyển sang lập kế hoạch rollout và chuyển đổi. Ref tại lúc ghi quyết định `34978a696a22b64ea70c091b33e105b0ceafc742`, PR #392.

Quyết định này cho phép mở bước lập kế hoạch khi qualification còn thiếu. Verdict kỹ thuật của A/B vẫn **STOP**. Candidate target, matched replacement và real-adapter acceptance trên đúng cấu hình vẫn chưa đạt hoặc chưa đủ bằng chứng. Các kết quả, ngưỡng, denominator và source SHA của lượt đã chạy được giữ theo từng báo cáo. Quyền thay C3, merge, deploy, migration, đổi routing và gửi tin thật cần scope và quyết định riêng. Các gate runtime về dữ kiện, verifier, quyền gửi, state, receipt và privacy tiếp tục áp dụng.

## Các lỗi và bằng chứng còn mở

| Mục | Bằng chứng tại lúc GO | Việc cần theo dõi |
| --- | --- | --- |
| **P07 — tư vấn sai size, mức nghiêm trọng** | Engine trả M cho quần, không có size thay thế. Owner khuyên chọn L theo thói quen, verifier PASS và tin vào Outbox test. | Kiểm cả cách owner dùng kết quả theo từng món và cách verifier phân biệt khách chọn L với shop khuyên L phù hợp. Đưa vào hồi quy ưu tiên khi chuẩn bị rollout. |
| **S11 — tồn theo biến thể và số lượng** | Khách hỏi hai bộ be size L, nguồn trong lượt chỉ chứng minh tồn theo size L. Câu trả lời có thể bị hiểu là đã xác nhận màu và số lượng. | Xác minh theo đúng mẫu, màu, size, số lượng. Hỏi phân biệt mẫu nếu cần. Handoff khi thiếu dữ liệu shop ảnh hưởng đến câu trả lời. |
| **J3 — trải nghiệm sau khi bị chặn** | Verifier chặn đúng hàm ý be có sẵn. Tin báo giá từ proof được gửi vào Outbox test nhưng mất phần tư vấn phối với quần nâu. | Kiểm actual terminal để giữ trợ giúp mua có căn cứ và xử lý thiếu dữ liệu shop theo quy tắc handoff. |
| **P06/S15 — trọng tâm câu bán hàng** | Mỗi ca hòa 2/2. P06 vẫn mở bằng giá bộ khi khách hỏi tổng. S15 vẫn thiên về báo giá và mời tư vấn size. S04 thắng 2/2 nhờ phân biệt trắng sẵn và be đặt trước. | Giữ S04 làm đối chứng chất lượng. Theo dõi thứ tự ý chính và bước mua trong kết quả end-to-end. |
| **Qualification và replacement** | A/B phát triển đủ 9 cặp, bản sửa thắng 2/6 cặp trọng tâm, dữ kiện 6/6, đối chứng 3/3. Native 6 ca/10 lượt chưa chạy. Holdout trên candidate hiện hành, matched C3 comparison và real-adapter acceptance cho exact candidate còn thiếu. | Giữ riêng trạng thái từng gate trong kế hoạch rollout. Bằng chứng đối chiếu C3, ngưỡng hiện hành và các điều kiện đủ để đổi quyền phục vụ phải được ghi rõ trước khi đề nghị kích hoạt. |

[Lượt full và ba ca lỗi](evidence/c3-phase-c-full-20261119/REPORT.md#ba-ca-chưa-đạt) · [A/B và cả 18 bản nháp](evidence/c3-phase-c-owner-reply-evidence-20261119/MODEL_RUN.md) · [Tiêu chí qualification](c3-phase-c-qualification-plan-20261028.md).

## Công việc tiếp theo

1. **Chốt kế hoạch rollout nhỏ trên PREPROD.** Khóa exact candidate và bản C3 đang phục vụ khi bắt đầu thực thi. Xác định phạm vi test, đường tích hợp, các lỗi chấp nhận theo dõi và các lỗi cần xử lý trước từng bước. Giữ C3 làm đường quay lại. Quy định kill switch và cách xử lý lượt đang chạy.
2. **Kiểm trên adapter thật với gửi tin tắt.** Chạy luồng inbox, history, báo giá và ảnh, size theo từng món, giỏ và checkout, handoff, receipt và Outbox. Kiểm revision đổi, webhook trùng, crash sau commit, đối soát khi chưa rõ kết quả và rollback. Đọc kết quả khách sẽ nhận trong Outbox test, kiểm riêng P07/S11/J3.
3. **Sau quyết định kích hoạt riêng, chạy opt-in giới hạn trên trang test.** Theo dõi sai dữ kiện, tin hay thao tác trùng, handoff, chất lượng tư vấn và độ trễ. Dừng hoặc quay về C3 khi chạm tiêu chí đã chốt. Thao tác đã commit được đối soát theo receipt.
4. **Sau khi bằng chứng đủ và owner duyệt, lập bước chuyển hẳn.** Chuyển quyền phục vụ theo phạm vi được duyệt, rồi mới lên lịch gỡ các vai trò C3 đã được thay thế.

[Spec §16 về real-adapter, rollout và rollback](c3-single-agent-commerce-architecture-20261004.md#16-experiment-recovery-migration-and-rollback) · [Quy trình PREPROD](../current/architecture-program/OPERATING_MODE.md).

Lượt ghi quyết định chỉ cập nhật tài liệu. 0 lượt gọi model mới và 0 thao tác trên runtime.
