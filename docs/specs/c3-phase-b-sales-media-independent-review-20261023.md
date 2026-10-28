# Independent review — kế hoạch tư vấn và media

Ngày 23/10/2026. Reviewer `/root/review_sales_media_plan_20261023`, owner yêu cầu một review độc lập. Reviewed HEAD `88589b180379eea5c5d0efbf2c06feed903909b2` cùng bản kế hoạch chưa commit. Review chỉ đọc source/evidence; không tests/provider, không sửa code hoặc gọi thêm agent.

**REVISE — một P2 required.** Hướng tư vấn/media hợp lý, không cần role/gate/regex mới.

## P2 required — capability của bộ kiểm

Plan gốc dòng 62/76 chưa chỉ rõ bốn media additions đi qua runner nào. B1 `run.mjs:19/115` thường không có media; chỉ image-comparison cấp media tools. `advice-diagnostic.mjs:32–36` toolsOFF, không catalogImages. Ingress `single-agent-commerce-ingress.ts:176/193` có media và delivery sau gate.

Cần bảng capability: B1 là regression chữ, advice4 là paired prompt diagnostic chữ, bốn media additions dùng ingress hiện có select/view. Trước freeze kiểm wire/source/product binding/budget, giữ bounds. Không lấy kết quả B1/advice làm lợi ích tư vấn nhờ ảnh, không nối media vào toàn B1 chỉ để thỏa test. Bốn lượt mới chứng minh chức năng/chất lượng đúng phạm vi, chưa conversion/nhân quả.

## P3 optional đã tiếp thu

- Sau audit, advice và media độc lập. Không có candidate prompt rõ thì vẫn làm media có bằng chứng.
- Report giữ cột giọng riêng; một ca USABLE về tác vụ vẫn có thể dài/gượng. Không thêm thang điểm/gate mới.

Reviewer xác nhận cap advice8/16requests và native43/168requests đúng nếu prerequisites nằm trong43. Giữ không ép mua rẻ nhất/chốt mọi câu, không blacklist/ví dụ fit benchmark, phân biệt view/select và giữ authority/bounds/retry.

Parent đã chỉnh kế hoạch theo ba điểm; chưa có review độc lập lần hai hoặc APPROVE cho bản sửa/implementation.
