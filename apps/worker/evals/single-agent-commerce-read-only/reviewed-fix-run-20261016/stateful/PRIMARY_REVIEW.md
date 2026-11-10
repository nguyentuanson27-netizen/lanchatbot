# Primary review — 7 bước B2/B3

Đã đọc toàn lượt và nguồn public/actual state, chưa xem nháp bị chặn hay violation details. Review chủ quan của coding agent, không độc lập, human acceptance=null; không chấm theo từ khóa hoặc cộng điểm thành gate.

{"USABLE":5,"FALLBACK_OR_NO_SEND":2}.

Bốn reply giao dịch dùng được; handoff yêu cầu riêng được ghi USABLE theo hành động, không phải một reply hội thoại thứ5. Checkout/confirmed purchase vẫn chưa đạt; không coi handoff/no-send là mua thành công.

| Ca | Kết quả cả lượt | Nhận xét theo mục tiêu khách |
| --- | --- | --- |
| 1/stateful-open | USABLE | Đã lưu eo76/mông98, tạo đúng giỏ áo be M và gửi câu xác nhận ngắn, không tự kết luận fit. Hành động và lời nói khớp state đọc lại; không chỉ hứa lấy hàng. |
| 2/stateful-variant-quantity | USABLE | Đã đổi đúng L và số lượng2 trong cùng lượt; giỏ giữ áo be. Câu xác nhận đủ để khách biết thay đổi đã xong, hơi giống thông báo hệ thống nhưng dùng được. |
| 3/stateful-quote | USABLE | Trả đúng tổng978.100đ của giỏ hiện tại, gồm ship30.000đ và giảm49.900đ. Có lặp ý gồm phí ship nhưng minh bạch khoản tiền và không tự tính ưu đãi ngoài code. |
| 4/stateful-correction | USABLE | Số đo đã sửa thành74/96, giỏ vẫn L×2 theo ý khách. Reply xác nhận ngắn, không đọc lại bộ số đo, không gợi size mới hay bắt khách kiểm tra lại fit. |
| 5/stateful-private-checkout | FALLBACK_OR_NO_SEND | Code-only checkout kết thúc HANDOFF, không có preview, không có tin capture hay xác nhận mua. Đây là recovery an toàn nhưng chưa hoàn tất việc mua; chưa dùng chi tiết lỗi bên trong để quy nguyên nhân cho model. |
| 6/stateful-confirm | FALLBACK_OR_NO_SEND | Khách nhờ chốt nhưng không có reply/preview/confirmed purchase. NO_SEND sau handoff giữ authority, không tự chốt khi quyền đã đổi; đây là bước phụ thuộc checkout trước, không tính thành lỗi tư vấn độc lập mới. |
| 7/stateful-human-request | USABLE | Đúng yêu cầu gặp nhân viên, candidate trả HANDOFF/CUSTOMER_REQUESTED_HUMAN qua code. Không có tin capture để chấm giọng; ghi nhận hành động chuyển quyền được nhận, không suy thành nhân viên đã được thông báo/đã trả lời khách. Không tính là hoàn tất mua. |
