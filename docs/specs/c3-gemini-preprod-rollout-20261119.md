# Candidate Gemini trên trang test

Phạm vi là trang `1198992073286645` cùng hai service realtime và delivery. Nguồn candidate trước khi chuẩn bị release là `241a74f3549d97bfeec66487352253f7b70e69c8` trên PR #392. Nhánh release chuyển source cần chạy và test trực tiếp từ checkpoint đó lên `main` tại `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Hai prompt và verdict schema dùng hash của manifest đã chốt. Owner và verifier đều dùng `gemini-3.5-flash-lite`, High, Vertex global.

- Worker nhận tin chọn candidate một lần trên native Inbox batch của trang test. Lượt khác và echo đi theo tuyến hiện có. Candidate kiểm quyền của trang, quyền hội thoại và tag Pancake. Budget chung kết thúc trước khi mất lease. Batch có kết quả ghi chưa rõ được giữ để đối soát qua Inbox.
- Worker gửi tin kiểm lại quyền, ảnh và bằng chứng bàn giao trước khi bắt đầu nhóm tin. Cấu hình chỉ áp dụng khi nạp overlay PREPROD.
- Migration `0041_c3_candidate_sales_events` bổ sung bốn command cho ràng buộc `sales_cycle_events`. Schema live đã áp dụng các migration 0035–0040 thuộc hạ tầng PREPROD và vẫn giới hạn 12 command cũ. Migration này tránh trùng số, giữ dữ liệu hiện có và cần được duyệt trước khi áp dụng. Rollback service giữ migration cộng thêm để bảo toàn lịch sử event đã ghi.
- Đã quan sát [smoke lần trước](https://github.com/nguyentuanson27-netizen/lanchatbot/blob/91698ec147ba350877df332615911fcceae1f91a/docs/specs/evidence/c3-preprod-send-disabled-smoke-20261119/ACTIVATION_READINESS.md) 2/3 trên PR #392. Ca checkout bị bàn giao ở lượt xác nhận chọn áo với verdict Gemini FAIL. Vòng wiring ghi riêng bằng chứng kỹ thuật. Trạng thái quality vẫn theo quyết định owner trên PR #392.

Kiểm PostgreSQL cô lập với chính lớp ingress và delivery mới đã qua ba ca tag rõ, tag chặn trước inference, và tag đổi sau verifier. Không có request Meta, Pancake hoặc model trong bộ kiểm này. DDL migration 0041 đã qua kiểm trên bảng tạm PostgreSQL, gồm phép chèn bốn command mới, giữ lệnh cũ và chặn lệnh lạ.

Khi kích hoạt, giữ hai image hiện hành theo từng container cùng Compose/override và đường dẫn release. Dừng realtime trước, chờ công việc và Outbox cũ kết thúc, bật delivery của release mới trước và chỉ chạy realtime candidate khi delivery healthy. Kiểm lại image, page, hai flag và health. Khi rollback, dừng realtime candidate trước rồi phục hồi cặp service theo từng identity đã lưu.
