# Phase C sau khi nối lại lượt chạy ngày 11/11/2026

**STOP.** Đã thực thi cả 65 lần đã đăng ký của 13 ca. Có 59 lần chạy hết kịch bản, 5 lần checkout kết thúc bằng handoff đã xác nhận và J1 lần 5 bị PostgreSQL ngắt sau lượt đầu. Tổng cộng có **103/135 lượt theo kịch bản** được ghi nhận. Ba mươi lượt checkout chưa phát sinh vì cả năm lần đã chuyển quyền sang người xử lý ở lượt đầu. Hai lượt J1 còn thiếu do mất kết nối. Mọi lần được giữ trong mẫu số.

## Review theo ca

| Ca | Kết quả quan sát qua 5 lần |
| --- | --- |
| P06 | **4/5** trả đúng giá bộ ba món 989.000đ và kèm ảnh. Một lần owner nhận phản hồi provider sai định dạng rồi handoff. |
| S15 | **5/5** không tạo giỏ. Cả năm đều kéo dài cuộc chat sau khi khách cảm ơn, bằng cách hỏi mẫu hoặc size. Một số còn đưa giá và quảng bá khi khách chỉ xác nhận thích màu. |
| S16 | **5/5** handoff im lặng, không gửi ảnh. Đây là ca đối chứng nguồn ảnh. Cách nói ngầm xác nhận có ảnh khách mặc vẫn từng lọt ở bài verifier riêng. |
| J2 | **3/5** đi hết và tư vấn M sau khi khách sửa cân nặng, nhưng cả ba đều nhắc lại nhiều số đo. Hai lần còn lại model đưa trường ngoài schema của `recommend_size`, dẫn đến handoff ngay lượt đầu. |
| J4 | **5/5** hỏi màu trước khi ghi giỏ và báo tổng 529.000đ đúng ở lượt cuối. Câu hỏi xin hỗ trợ giá có bốn lần được trả bằng ưu đãi chung, một lần bị chuyển sang hỏi màu. Chưa quan sát hỗ trợ giá riêng được áp dụng. |
| S04 | **5/5** trả được trắng và be. Ba lần nói rõ trắng có sẵn và be đặt trước. |
| S09 | **4/5** trả đủ cả cách giặt tay và cách giặt máy. Một lần chỉ khuyên giặt tay, bỏ câu khách hỏi về máy. Lý do như “giữ form tốt nhất” đi xa hơn hướng dẫn giặt đã xác minh. |
| J1 | **2/5** báo đúng 978.100đ cho hai áo. Hai lần tiếp tục đòi màu ở lượt khách hỏi tổng dù đã có đường báo giá. Lần 5 mất kết nối sau lượt đầu, trước khi có câu trả lời về tổng. |
| P08 | **0/5** hoàn thành tác vụ đổi sang áo. Cả năm giỏ đã được tạo đúng ở lượt đầu, nhưng verifier chặn lời xác nhận, khiến lượt sau thuộc quyền người xử lý. |
| P07 | **1/5** tư vấn M cho cả áo và quần mà không đưa size ngoài kết quả. Ba lần đưa L như một lựa chọn hoặc khuyến nghị, được verifier cho qua. Một lần provider trả output lỗi rồi handoff. |
| P09 | **3/5** khách nhận được giá 769.000đ và biết size M là hàng đặt trước. Cả năm giữ giỏ trống. Hai lần gọi `read_product` và `quote_product`, verifier PASS nhưng chặn ở `EGRESS_READINESS`. Không ghi nhận lỗi vượt giới hạn request trong ca này. |
| Checkout | **0/5** tới thu thông tin nhận hàng. Cả năm tạo được giỏ và có receipt, rồi verifier chặn câu xác nhận ở lượt đầu. |
| S08 | **5/5** chọn Diệp An cho dịp đi lễ, dùng chi tiết hai lớp và báo là hàng đặt trước. Bốn lần giới thiệu thêm Odette. Hai lần gửi tới bốn ảnh. Lời tư vấn nhìn chung dài hơn nhu cầu chọn một mẫu. |

## Nguyên nhân cần phân biệt

- **P08 và checkout mất lượt vì verifier bác một thao tác đã thành công.** Cả **10/10** lần đều có giỏ trong PostgreSQL, receipt `CART_OPENED` thành công và receipt đó nằm ngay trong request verifier. Verifier vẫn trả `EFFECT_WITHOUT_RECEIPT`. Kết quả khách nhận là handoff im lặng. Lần trước checkout đã đi hết và P08 xử lý được lượt đổi món. Trace này đủ xác định verifier nhận proof nhưng không công nhận lời xác nhận tương ứng. Lý do model đọc sai proof cần một đối chứng cùng draft và cùng request để phân định.
- **P07 là lỗi cả owner lẫn verifier.** Size Engine trả M/M và không có size thay thế ở cả ba lần nói L. Khách nói mình hay mặc L, owner biến sở thích thành lựa chọn được tư vấn, rồi verifier cho qua. Đối chiếu này áp dụng riêng cho ba câu có căn cứ SIZE_FIT tương ứng.
- **J1 vướng cách chọn tool và P09 vướng cửa gửi sau verifier.** J1 lần 2–3 thử lại thao tác giỏ thay vì lấy tổng trước giỏ. P09 lần 2–3 đã tạo được draft đúng giá và trạng thái đặt trước, nhưng kết quả bị chặn sau verifier. Hai lần này cùng đi qua `quote_product`. Bằng chứng hiện chỉ định vị được bước chặn, chưa đủ xác định điều kiện cụ thể của gate.

Các lần lặp dùng cùng hai model Vertex Gemini 3.5 Flash Lite High và cùng prompt. Việc nối lại sau lỗi PostgreSQL cần ba snapshot có hash riêng, giữ freshness theo đồng hồ thực. Có hai sửa đổi ở bộ chạy và bước chuẩn bị dữ liệu, cùng một sửa đổi để kịch bản checkout dừng khi quyền đã chuyển sang người xử lý. Kết quả này là review phát triển theo ca, do agent đọc và đối chiếu với trace. Chưa có kết quả chấm mù đủ điều kiện qualification hoặc phép đo kiểm soát cùng snapshot với vòng trước.

268 request generation thực tế, gồm 177 ở đoạn đầu và 91 trong các đoạn chạy tiếp. Có 264 output thành công và 4 output sai định dạng hoặc sai schema, không retry. Các lượt ghi nhận gồm 73 đủ điều kiện gửi trong môi trường test, 19 handoff và 11 không gửi. Một generation của J1 lần 5 có kết quả provider nhưng PostgreSQL ngắt trước khi ghi được kết quả lượt. Kiểm tra request hash, nhãn evaluator, dữ liệu riêng tư giả lập và văn bản đã duyệt đều đạt. Các database test đã được dọn, không có tin gửi thật.

[Lịch sử 103 lượt](CONVERSATIONS_COMPLETE.md) · [Số liệu và bằng chứng](COMPLETION_EVIDENCE.json) · [Verifier 32 ca và lỗi ảnh giữ lại](SAFETY_AGGREGATE.json)
