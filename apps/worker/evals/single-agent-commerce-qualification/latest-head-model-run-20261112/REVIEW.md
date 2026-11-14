# Phase C · Review 84 lượt trên commit d963fd36

**STOP.** Checkout đi đủ ba lần. Tư vấn size, thương lượng trước giỏ và chuyển từ chọn màu sang báo tổng vẫn có lỗi lặp. Đây là đợt kiểm tra phát triển, với 3 lần mỗi ca và lần thứ 4 riêng cho J2.

| Đợt | Lần thử | Lượt ghi nhận | Đủ điều kiện gửi | Handoff | Không gửi |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bộ 13 ca, lần 1 | 13 | 27 | 20 | 4 | 3 |
| Bộ 13 ca, lần 2 và 3 | 26 | 54 | 42 | 8 | 4 |
| J2, lần 4 | 1 | 3 | 3 | 0 | 0 |
| Tổng | 40 | 84 | 65 | 12 | 7 |

Trong 65 lượt đủ điều kiện gửi có 50 câu do model tạo và 15 câu do code dựng trong checkout. Trong 12 handoff có 3 handoff sau xác nhận mua, 3 handoff đúng kỳ vọng ở ca thiếu ảnh khách mặc và 6 handoff làm gián đoạn tư vấn. Bảy lượt không gửi đều xảy ra sau khi quyền hội thoại đã chuyển sang người xử lý. Có 176 request model gồm 122 request tư vấn và 54 request verifier. Không có tin gửi thật. [Lịch sử đủ 84 lượt](CONVERSATIONS.md)

## Kết quả theo ca

| Ca | Quan sát |
| --- | --- |
| P06 · Giá bộ ba món | 3/3 báo thẳng 989.000đ và kèm ảnh. |
| P07 · Size áo và quần | 2/3 chọn M cho cả hai. Lần 3 đề xuất quần L từ thói quen của khách dù Size Engine chỉ trả M. Sol chặn đúng. |
| P08 · Đổi từ set sang áo lẻ | 3/3 xác nhận tạo giỏ có biên nhận rồi hỏi màu áo còn thiếu. Kịch bản dừng ở bước hỏi màu. |
| P09 · Tồn size M | 3/3 trả đúng set quần size M có sẵn, giá 769.000đ theo snapshot. Lần 1 báo giá hai set ở lượt mở đầu và không có ảnh. Giá đến từ `read_product`, còn bước bắt buộc ảnh theo danh sách báo giá dùng mục tiêu của `quote_product`. Cả ba lần đều chưa gọi lại đường `quote_product` từng gây xung đột tồn. |
| J1 · Tổng hai áo | 2/3 báo đúng 978.100đ trước khi chọn màu. Lần 3 chỉ gọi `read_product` ở lượt hỏi tổng và tiếp tục hỏi màu, nên khách chưa có giá để quyết định. |
| J2 · Sửa số đo | 1/4 đi hết. Lần 1 gặp HTTP 429. Lần 2 gặp `MALFORMED_RESPONSE` từ Gemini và handoff dù còn một lượt sinh. Lần 3 tool từ chối dữ liệu số đo nhưng model tự chọn S, Sol chặn đúng. Lần 4 code từ chối tham số sai, model sửa được lệnh và tư vấn đúng M cả trước lẫn sau khi khách sửa số đo. |
| J4 · Xin hỗ trợ giá | Hai lần model ngụ ý mua một set cũng được giảm 5% dù ưu đãi yêu cầu hai đơn vị sản phẩm. Sol chặn cả hai. Lần còn lại báo đúng tổng 529.000đ ở lượt cuối nhưng lượt thương lượng vẫn chuyển sang ưu đãi mua thêm rồi hỏi màu. |
| Checkout | 3/3 đi đủ 7 lượt, từ tạo giỏ qua thu dữ liệu nhận hàng, bản xem trước, biên nhận `CONFIRM_PURCHASE` và handoff cuối. |
| S04 · Hỏi màu | 3/3 nêu đúng trắng và be. Lần 3 nói chung “sẵn các size từ S đến XL” ngay sau khi nêu hai màu, dễ khiến khách hiểu be cũng có sẵn. Nguồn ghi be đặt trước. |
| S08 · Chọn váy đi lễ | 3/3 chọn Diệp An, giải thích bằng thiết kế hai lớp và báo hàng đặt trước. Lần 1 đưa thêm Odette như phương án có sẵn size S và gửi đúng ảnh cả hai mẫu đã báo giá. Lần 2 chỉ nêu giá Diệp An nhưng vẫn gửi ảnh Odette, do cả hai mẫu được gọi báo giá trong nội bộ. Lần 3 hai ảnh đều là Diệp An. |
| S09 · Giặt tay hay giặt máy | 2/3 trả đủ hai cách. Lần 3 nói dài về chất vải và hỏi khách đang xem set nào, bỏ sót câu hỏi có được giặt máy. |
| S15 · Khách cảm ơn | 3/3 kéo dài hội thoại. Các câu hỏi thêm gồm xin chiều cao, cân nặng, mời xem phối đồ và hỏi phân biệt mẫu. |
| S16 · Ảnh khách mặc | 3/3 handoff im lặng, đúng kết quả mong đợi của ca nguồn test thiếu ảnh xác nhận khách mặc. |

## Giọng văn và hiệu quả tư vấn

- Các câu báo giá trực tiếp ở P06, báo tổng trước khi chốt màu ở J1 và hỏi đúng màu còn thiếu ở P08 giúp khách tiến tới bước mua tiếp theo.
- J2 lặp lại số đo và chốt “vừa vặn và đẹp nhất” khi khách chỉ hỏi size để mặc thoải mái. S08 đã chốt được mẫu nhưng nhiều tính từ nối nhau làm câu giống mô tả sản phẩm. S15 và S09 kéo sang câu hỏi mới khi khách đã cảm ơn hoặc đang chờ câu trả lời cụ thể.
- Các câu checkout do code dựng hỏi đúng từng thông tin. Câu “Chị cho em COD hoặc chuyển khoản nhé” vẫn nghe như câu điền biểu mẫu.

## Dấu vết cần giữ

- **J2 có hai nhánh khác nhau.** Xử lý lệnh sai tham số đã hoạt động ở lần 4. Nhánh thử lại đầu ra hỏng vẫn lỗi ở lần 2. Adapter ghi `OWNER_FINISH_REASON` trong telemetry rồi ném `PROVIDER_ERROR`, còn vòng điều phối kiểm tra `error.message` để quyết định thử lại. HTTP 429 ở lần 1 nằm ngoài chính sách thử lại hiện hành. [Adapter](../../single-agent-commerce-read-only/gemini-inference.mjs#L548) · [Điều kiện thử lại](../../../src/single-agent-commerce-read-only.ts#L272)
- **Sol chặn đúng bốn câu** gồm hai câu J4 mở rộng ưu đãi, một câu P07 đề xuất L và một câu J2 đề xuất S khi thiếu kết quả fit. Handoff giữ an toàn, còn chất lượng tư vấn vẫn phụ thuộc model chọn đúng việc và dùng đúng kết quả tool.
- **P09 và ảnh là hai đường riêng.** Bộ test kiểm tra khóa tồn theo size đã chạy đạt. Các lần model chọn đường đọc sản phẩm nên chưa xác nhận lại xung đột qua đường báo giá. Việc kèm ảnh ở lượt mở đầu còn phụ thuộc tool nào cung cấp giá.

Source chạy `d963fd364547595076e2e55d4dcfe35f319b1ae0`. Cả ba đợt dùng chung snapshot `176adc1e49a6912a55c4f8c5d0659b35243c9f4570441d113ee85409926ac0ab` và cùng bản đăng ký. Gemini 3.5 Flash Lite High tư vấn, GPT-6.1 Sol High kiểm tra. Worker build, 261 test worker và 91 test bộ đánh giá đã đạt trên source này. Phạm vi là kiểm tra phát triển trên 13 ca đã biết, chưa có kết quả chấm mù qualification.
