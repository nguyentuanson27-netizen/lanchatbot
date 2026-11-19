# Phase C · Review sau đợt sửa runtime

**STOP.** Đọc lại toàn bộ 122 lượt hội thoại ghi nhận sau đợt sửa runtime kết thúc ở `0d77ea67`. Lượt chạy bổ sung với Sol High bắt đầu ngày 11/11 và kết thúc ngày 12/11/2026 theo giờ Việt Nam. Đây là các lượt kiểm tra phát triển trong môi trường test. Không có tin gửi thật.

| Lượt chạy | Số lượt ghi nhận | Đủ điều kiện gửi | Handoff | Không gửi |
| --- | ---: | ---: | ---: | ---: |
| Gemini tư vấn và kiểm tra | 103/135 | 73 | 19 | 11 |
| P08 với Sol High kiểm tra | 2/2 | 2 | 0 | 0 |
| 10 ca chạy lại với Sol High kiểm tra | 17/17 | 15 | 2 | 0 |
| Tổng | 122/154 | 90 | 21 | 11 |

Trong 32 lượt theo kịch bản chưa phát sinh, 30 lượt checkout đứng sau handoff đã xác nhận và 2 lượt J1 thiếu do mất kết nối PostgreSQL. Hai đợt Sol chạy mỗi ca một lần. Số lần thực thi khác nhau và snapshot khác nhau giữa các đợt.

[103 lượt Gemini](../convergence-continuation-run-20261111/CONVERSATIONS_COMPLETE.md) · [Đánh giá đợt Gemini](../convergence-continuation-run-20261111/COMPLETION.md) · [19 lượt với Sol High](CONVERSATIONS.md) · [10 đối chứng riêng verifier](VERIFIER_REPLAY.md)

## Đánh giá theo ca

| Ca | Kết quả quan sát |
| --- | --- |
| P06 · Giá bộ ba món | 5/6 lần báo đúng 989.000đ và có ảnh. Một lần handoff do provider của model tư vấn trả đầu ra sai định dạng. |
| P07 · Size từng món | 1/6 lần tư vấn M/M đúng kết quả Size Engine. Bốn lần model tư vấn đề xuất quần L vì khách quen mặc L dù kết quả chỉ có M. Verifier Gemini cho qua ba lần, Sol chặn lần mới. Sol cũng chỉ ra nguồn chưa xác nhận set hết M. Một lần còn lại handoff do đầu ra model tư vấn sai định dạng. |
| P08 · Đổi set sang áo lẻ | Năm lần Gemini chặn nhầm câu xác nhận đã tạo giỏ có biên nhận thành công. Lần Sol cho gửi xác nhận và hỏi khách chọn màu áo. Giỏ vẫn giữ set cũ khi chưa có màu để đổi. |
| P09 · Hỏi tồn size M | 4/6 lần báo đúng 769.000đ và size M đặt trước. Hai lần dùng chung khóa phạm vi cho tồn tổng của set và tồn size M, khiến cửa gửi thấy xung đột và chặn dù verifier đã PASS. Chạy lại bước kiểm tra trên dữ kiện cũ tái hiện `CLAIM_CONFLICT` ở cả hai lần. Lượt Sol dùng `read_product` cùng công cụ ảnh nên chưa kiểm lại đường `quote_product` bị lỗi. |
| J1 · Tổng hai áo | 3/6 lần báo đúng tổng 978.100đ. Hai lần model thử thêm giỏ và hỏi màu khi khách đã chuyển sang hỏi tổng. Một lần mất PostgreSQL trước lượt báo tổng. |
| J2 · Khách sửa số đo | 4/6 hành trình đi hết và chọn M theo thông tin đã sửa. Hai lần handoff do model gửi trường ngoài schema của `recommend_size`. Cả bốn hành trình đi hết đều nhắc lại nhiều số đo của khách. |
| J4 · Hỗ trợ giá một áo | 6/6 lần báo đúng 529.000đ ở lượt cuối. Lượt xin hỗ trợ giá thường chuyển sang ưu đãi hai món hoặc hỏi màu. Lượt mới chỉ gọi báo giá, với kết quả thương lượng `NOT_EVALUATED`. |
| Checkout · Sau khi tạo giỏ | Cả năm giỏ được tạo đúng với biên nhận nhưng Gemini chặn câu xác nhận. Sol cho qua cả năm câu khi chấm lại cùng đầu vào cũ. Chưa chạy lại hành trình checkout với Sol. |
| S04 · Hỏi màu | 5/5 lần trả đúng trắng và be. Ba lần nêu rõ trắng có sẵn và be đặt trước. |
| S08 · Chọn váy đi lễ | Cả sáu lần chọn Diệp An. Bốn lần cũ còn giới thiệu Odette. Lượt mới chỉ chọn Diệp An trong lời tư vấn nhưng bỏ trạng thái đặt trước và gửi 2 ảnh Diệp An kèm 1 ảnh Odette. Dấu vết chuẩn bị ảnh ghi cả hai sản phẩm đã được báo giá là bắt buộc. |
| S09 · Giặt áo | 5/6 lần trả đủ giặt tay và giặt máy. Lần mới đọc đúng hướng dẫn dùng túi giặt và chế độ nhẹ. Phần giải thích về độ bền dài hơn hướng dẫn nguồn đã xác nhận. |
| S15 · Khách cảm ơn | 6/6 lần hỏi thêm sau khi khách cảm ơn. Giỏ vẫn trống. Câu mới ngắn hơn nhưng tiếp tục mời xem ảnh. |
| S16 · Ảnh khách mặc | 6/6 lần handoff im lặng và không gửi ảnh, phù hợp với ca đối chứng thiếu nguồn xác nhận ảnh khách mặc. Một lần gán lý do khách yêu cầu gặp người xử lý dù câu khách chỉ hỏi ảnh. |

## Kết luận theo bằng chứng

- **Verifier Sol High** xử lý đúng cả 10 đối chứng từ các lỗi đã quan sát. Hành trình P08 mới đi tiếp được qua bước tạo giỏ. Kết quả checkout mới có bằng chứng chấm lại câu xác nhận.
- **Model tư vấn** vẫn đề xuất quần L ở P07 dù đã có kết quả M/M. Handoff bảo vệ khách khỏi một tư vấn sai nhưng khách vẫn chưa nhận được lời khuyên size dùng được.
- **Code** còn gộp hai phạm vi tồn ở P09 và gửi ảnh theo cả hai mẫu đã báo giá ở S08. Cả hai có dấu vết riêng dù verifier cho PASS.
- **Chất lượng hội thoại** còn vấn đề ở thời điểm dừng chat, trả lời câu xin hỗ trợ giá, và đọc lại số đo. Chưa có kết quả qualification chấm mù cho đợt này.

Hai lượt P08 dùng source thử nghiệm `80e80338580122175044f92228837a4350f5ccd4`, world `d84c06c79c32623d4a2609e5620fca475da88c3509adff7d9f2def8ebfbdcaf1`. Mười ca chạy lại dùng source thử nghiệm `49c7407f613a646a0a88cc90fc0ff070a636df66`, world `607948e2e41091572237477f711c97d3cd65dc505d2e255a21dff591b0715604`. Hai lượt chạy Sol tạo 54 request model gồm 36 request tư vấn và 18 request verifier. Đối chứng dùng thêm 10 request verifier. Không có generation retry.
