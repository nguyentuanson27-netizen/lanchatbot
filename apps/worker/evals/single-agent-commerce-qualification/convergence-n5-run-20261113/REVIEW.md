# Phase C · Kết quả 13 ca × 5 lần trên 2877c0a9

**STOP.** Chạy đủ **65/65 lần thử và 135/135 lượt**. Có **7/12 ca bán hàng đạt ít nhất 4/5**. S16, ca đối chứng thiếu ảnh khách mặc, handoff đúng **4/5** so với yêu cầu **5/5**. Đây là review trực tiếp trên kết quả khách nhận trong môi trường test.

[Lịch sử 135 lượt](CONVERSATIONS.md) · [Điểm từng ca và từng lần](REPETITION_SUMMARY.json) · [Cấu hình, hash và số liệu thực thi](PROVENANCE.json)

## Kết quả từng ca

| Ca | Đạt | Quan sát |
| --- | ---: | --- |
| P06 · Giá bộ ba món | 5/5 | Báo đúng 989.000đ, kèm ảnh. |
| J2 · Sửa số đo | 5/5 | Đi đủ ba lượt, dùng số đo mới và tiếp tục chọn áo M. Bốn lần đọc lại nhiều số đo ở lượt sửa thông tin. |
| P08 · Đổi set sang áo lẻ | 5/5 | Xác nhận tạo giỏ có biên nhận rồi hỏi màu áo lẻ còn thiếu. Kịch bản kết thúc ở bước hỏi màu. |
| P09 · Tồn size M | 5/5 | Đúng set quần size M có sẵn, giá 769.000đ. Hai lần mở đầu báo giá cả hai mẫu bằng `read_product` đều kèm đúng một ảnh mỗi mẫu. Ba lần hỏi phân biệt mẫu trước. Đường `quote_product` từng gây xung đột tồn chưa được gọi lại trong ca này. |
| Checkout | 5/5 | Đi đủ bảy lượt, có biên nhận `CONFIRM_PURCHASE` và handoff cuối. |
| S08 · Chọn váy đi lễ | 4/5 | Bốn câu đủ điều kiện gửi chọn Diệp An. Một câu bị chặn vì diễn giải “thiết kế hai lớp” thành “lớp lót hai lớp”. Hai trong bốn câu được gửi bỏ thông tin hàng đặt trước. |
| S09 · Giặt áo | 4/5 | Bốn câu trả đủ cách giặt tay và giặt máy. Một lần handoff sau khi chỉ đọc sản phẩm. |
| J4 · Hỗ trợ giá | 3/5 | Ba lần đi tới tổng 529.000đ và giữ quy tắc hỗ trợ giá phương án A. Hai lần tự thêm áo trắng khi khách chưa chọn màu rồi handoff do chuẩn bị ảnh. |
| S04 · Hỏi màu | 3/5 | Ba lần trả đúng trắng và be. Hai lần handoff vì lý do mơ hồ sản phẩm dù đã đọc hai mẫu. |
| P07 · Chọn size từng món | 1/5 | Cả năm nêu M cho áo và quần. Chỉ một câu nhắc L đơn thuần theo thói quen của khách. Bốn câu gắn việc cân nhắc L với mặc thoải mái, vượt ranh giới đã chốt ở mục 19. Sol cho qua cả năm. |
| S15 · Khách cảm ơn | 1/5 | Một lần đáp gọn. Ba lần kéo dài bằng quảng bá hoặc hỏi thêm, một lần handoff do ngân sách ảnh. |
| J1 · Tổng hai áo | 0/5 | Ba lần báo đúng 978.100đ sau khi đã tự thêm hai áo trắng. Lần 4 tự thêm một áo trắng rồi handoff ở bước chuẩn bị ảnh. Lần 3 bị verifier chặn trước lượt báo tổng. |
| S16 · Thiếu ảnh khách mặc | 4/5 | Bốn lần handoff im lặng. Lần 5 hỏi phân biệt hai set và không giải quyết yêu cầu ảnh thiếu nguồn. |

## Kết luận

- **J1 và J4 có lỗi chọn màu khi ghi giỏ.** Kiểm tra trạng thái giỏ xác nhận màu trắng đã được ghi dù khách mới chọn số lượng hoặc size. Handoff ở bước ảnh xảy ra sau khi giỏ đã thay đổi.
- **P07 cần giữ ranh giới giữa size quen mặc và kết quả fit.** Có thể nhắc L là thói quen của khách. Bốn câu được cho qua đi xa hơn khi gắn L với việc mặc thoải mái.
- **P09 đã quan sát được quy tắc hai ảnh trên đường đọc sản phẩm.** Hai lần phát sinh báo giá hai mẫu đều có ảnh đúng. Các lượt hỏi phân biệt mẫu trước vẫn trả lời được.
- **Giọng tư vấn còn dài ở J2, S08 và S15.** J2 thường đọc lại số đo. S08 chốt được mẫu nhưng lặp các tính từ về dáng và vẻ ngoài. S15 còn tiếp tục bán hàng khi khách đã cảm ơn.

## Thực thi và kiểm chứng

- Source `2877c0a99cf18a8fd91c47a78d48b20faa8ad2d0`. Cả năm lần dùng chung snapshot, corpus và bản đăng ký đã init và seal lại. Gemini 3.5 Flash Lite High tư vấn, GPT-6.1 Sol High kiểm tra.
- **110 lượt đủ điều kiện gửi** gồm 85 câu model và 25 câu do code dựng trong checkout. **18 handoff**, **7 lượt không gửi**, **0 tin gửi thật**.
- **283 request model** gồm 196 request tư vấn và 87 request verifier. Không ghi nhận lỗi provider hay timeout. Verifier p50 **8,3 giây**, p95 **14,1 giây**.
- Worker build đạt. **142 test worker** và **23 test adapter/projection** đã chạy đạt. Nhánh retry có bằng chứng test adapter. Lượt model không phát sinh lỗi provider để thực thi nhánh đó.
- Review theo ngưỡng phát triển 4/5 và điều kiện S16 5/5. Lượt này chưa có chấm mù qualification hoặc bộ kiểm verifier tập trung mới trên cùng cấu hình.
