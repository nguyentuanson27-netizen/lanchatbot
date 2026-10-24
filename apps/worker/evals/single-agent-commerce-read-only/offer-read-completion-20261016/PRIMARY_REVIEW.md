# Review toàn kết quả mới

Review chủ quan, không độc lập; không dùng rejected draft cứu điểm. Điểm chiều chỉ hỗ trợ nhận xét cả lượt, không keyword/đáp án mẫu.

{'USABLE': 16, 'NEEDS_EDIT': 3, 'FALLBACK_OR_NO_SEND': 6}

| Ca | Kết luận | Lý do cả lượt |
| --- | --- | --- |
| b1-current-policy | USABLE | Trả đúng thời hạn và phí hiện hành, sửa thông tin 7 ngày trong lịch sử. Khách hỏi còn kịp theo thời gian, không coi việc thiếu checklist là lỗi cấp quyền. |
| b1-partial-source | USABLE | Control POS_UNAVAILABLE: trả đúng chất liệu áo/váy, giữ phần đã biết và nói phần giá/tồn chưa tra được. Giọng còn giống catalog và mô tả hệ thống; cùng mức chấp nhận partial answer đã dùng cho ca cũ11, chưa là mua hàng hoàn chỉnh. |
| b1-price | USABLE | Giá cả set đúng; bổ sung giá món lẻ có ích để phân biệt lựa chọn, không tự coi thông tin thêm là lỗi. |
| b1-component-stock | USABLE | Trả thẳng tồn và giá của riêng áo size M, không gán giá cả set hoặc tự nhận đã thêm giỏ. |
| b1-policy-used | USABLE | Từ chối đúng việc khách đã mặc đi làm, không đọc checklist để cho phép lại việc bị cấm. Khi không nhận đổi thì không cần báo một khoản phí như thể sẽ xử lý đổi. |
| b1-current-policy-v2 | USABLE | Dùng đúng thời hạn 15 ngày và phí hai chiều 30k thay phí cũ, trả đúng phạm vi câu hỏi thời gian/phí. |
| b1-price-v2 | USABLE | Hiểu nguyên bộ qua lịch sử và trả đúng799k, ngắn và tự nhiên. |
| b1-component-stock-v2 | USABLE | Giữ đúng referent chân váy, size M và giá449k; không lẫn áo/cả set. |
| b1-search-read-v2 | USABLE | Tìm đúng Khánh Trang, nêu giá999k cả set và499k từng món từ lựa chọn bán hiện hành. Không dùng kết quả gần giống. |
| b1-policy-used-v2 | USABLE | Hiểu mặc vào thử trong phòng khác ướm bên ngoài, từ chối đổi theo nguồn hiện tại; không suy sạch/còn tem thành đủ quyền. |
| b1-changed-occasion-v3 | NEEDS_EDIT | Có chọn cả bộ nhưng lý do chủ yếu là lời khen thanh thoát/chuyên nghiệp nhất, chưa giải thích vì sao cả bộ giải quyết mong muốn gọn hơn so với áo lẻ. Lỗi ở độ thuyết phục và giọng catalog; không bắt buộc phải chọn áo lẻ hay coi nhận định thẩm mỹ là lỗi an toàn. |
| b1-current-policy-v3 | USABLE | Hiểu khách đang hỏi hạn đổi so với policy cũ và trả thời hạn hiện tại; không tự diễn giải thành giấy miễn mọi điều kiện. |
| b1-partial-source-v3 | NEEDS_EDIT | Giữ đúng chất liệu và không bịa giá/tồn, nhưng xin thêm size kèm hẹn kiểm tra khi có dữ liệu không khắc phục được nguồn POS đang thiếu. Đây là bước tiếp không dùng được và giọng giải thích hệ thống. |
| b1-price-v3 | USABLE | Đúng giá cả set799k và dừng, không gắn CTA bắt buộc. |
| b1-component-stock-v3 | USABLE | Trả đủ bán riêng, còn áo M và499k; không phát sinh thao tác khách chưa yêu cầu. |
| b1-search-read-v3 | USABLE | Tìm đúng SQ223, trả tồn cùng giá các lựa chọn. Danh sách ngắn hữu ích cho câu hỏi giá/tồn, không coi bố cục bullet là lỗi tự nhiên mặc định. |
| b1-buying-concern-v3 | NEEDS_EDIT | Đề xuất cả set799k trong ngân sách và dùng chân váy đen có sẵn để giải thích khả năng phối là hợp lý về bán hàng. Cần sửa giọng vì câu ngoặc ngân sách và chuỗi tơ cao cấp/bay bổng/sang trọng/thay đổi linh hoạt nghe như mô tả quảng cáo; không chấm trượt vì upsell hoặc đã có váy. |
| b1-policy-used-v3 | USABLE | Từ chối đúng trường hợp cắt tem và giặt rồi, nêu ngắn hai nguyên nhân thực sự quyết định; không kể đủ mọi điều kiện mới được chấp nhận. |
| stateful-open | FALLBACK_OR_NO_SEND | Khách chọn áo be M và nhờ lấy, nhưng không có dòng giỏ nào được commit; chỉ nhận static fallback. Hồ sơ có nhận eo/mông là thành công một phần, không thay việc thêm hàng. |
| stateful-variant-quantity | FALLBACK_OR_NO_SEND | Khách đổi L và lấy hai chiếc nhưng giỏ vẫn null, chỉ nhận static fallback. Đây là lỗi hành trình chưa thực hiện được, chưa quy thành một lỗi verifier riêng. |
| stateful-quote | FALLBACK_OR_NO_SEND | Không có quote hoặc tổng tiền trả khách; giỏ vẫn chưa được tạo sau các bước trước và khách nhận static fallback. Không tự cộng tiền để cứu lượt. |
| stateful-correction | FALLBACK_OR_NO_SEND | Code sửa eo/mông đúng74/96 và profile revision3 nhưng khách vẫn nhận static fallback, chưa đạt kết quả mua. Không dùng nháp bị chặn để cứu điểm. |
| stateful-private-checkout | FALLBACK_OR_NO_SEND | Private code path không gọi model và không tạo preview; chuyển người vì dependency failure. Đây là terminal an toàn nhưng hành trình mua chưa hoàn thành; không tính thành lỗi hiểu ngôn ngữ. |
| stateful-confirm | FALLBACK_OR_NO_SEND | Sau handoff, code không tiếp tục xác nhận mua và không gửi thêm. Giữ authority đúng nhưng khách chưa có đơn/preview hoàn tất; là hệ quả của hành trình chưa hoàn thành. |
| stateful-human-request | USABLE | Yêu cầu gặp nhân viên dẫn tới HANDOFF CUSTOMER_REQUESTED_HUMAN. Đánh giá dùng được cho chuyển ownership theo policy trong harness; không có tin capture, không chứng minh nhân viên thật đã nhận hoặc phục vụ khách. |
