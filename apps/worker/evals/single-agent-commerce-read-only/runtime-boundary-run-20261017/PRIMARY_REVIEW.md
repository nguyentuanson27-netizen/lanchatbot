# Review cả lượt — bảy stateful outcomes

Raw691fd912 được commit trước review. Source13e69d43, N1; review chủ quan/non-independent, human acceptance chưa đo. Đọc actual terminal, public state và hội thoại trước rejected draft/verdict/trace chi tiết. Không chấm keyword, CTA hoặc tổng số facts.

**1 USABLE ownership-only / 0 NEEDS_EDIT / 6 FALLBACK_OR_NO_SEND; hành trình mua chưa hoàn tất.**

| Lượt | Kết quả cả lượt | Lý do |
| --- | --- | --- |
| 1 — stateful-open | FALLBACK_OR_NO_SEND | Khách đã chọn áo/be/M nhưng chỉ nhận fallback; profile nhận 76/98, giỏ vẫn null. Chưa hoàn thành bước lấy hàng; việc lưu số đo không cứu kết quả cả lượt. |
| 2 — stateful-variant-quantity | FALLBACK_OR_NO_SEND | Khách nhờ đổi L và lấy hai chiếc nhưng tiếp tục nhận fallback; cuối lượt giỏ vẫn null. Không có thay đổi mua hàng được hoàn tất hoặc câu trả lời dùng được. |
| 3 — stateful-quote | FALLBACK_OR_NO_SEND | Khách hỏi tổng tiền hai áo nhưng chỉ nhận fallback, không có giỏ/quote hiện tại. Không chấm bằng draft hoặc thao tác dự định bên trong. |
| 4 — stateful-correction | FALLBACK_OR_NO_SEND | Code nhận correction 74/96 vào profile revision3, nhưng khách chỉ nhận fallback. Giỏ vẫn null; phần state đúng chưa thành một kết quả tư vấn/giao dịch dùng được cho cả lượt. |
| 5 — stateful-private-checkout | FALLBACK_OR_NO_SEND | Private checkout không tạo preview hoặc tin capture; terminal handoff dependency và chưa mua được hàng. Chấm actual outcome, không lấy controlled synthetic checkout làm bằng chứng hoàn tất nguồn thật. |
| 6 — stateful-confirm | FALLBACK_OR_NO_SEND | Xác nhận mua không có tin gửi/không tạo xác nhận mua vì authority đã đổi. Đúng boundary nhưng hành trình mua chưa hoàn tất; không coi đây là một model reply sai riêng biệt. |
| 7 — stateful-human-request | USABLE | Terminal code-owned chuyển ownership theo yêu cầu gặp nhân viên trong isolated harness. USABLE chỉ trong phạm vi chuyển ownership; không có tin capture hoặc chứng minh nhân viên thật đã nhận/phục vụ khách. |

Không có final model text dùng được để chấm giọng hoặc sức thuyết phục. Fallback đúng boundary không biến thành đáp ứng nhu cầu mua; phần profile được lưu đúng cũng không thay việc giỏ/quote chưa hoàn tất. Requested handoff không phải một giao dịch mua thành công hoặc xác nhận nhân viên thật đã tiếp nhận.
