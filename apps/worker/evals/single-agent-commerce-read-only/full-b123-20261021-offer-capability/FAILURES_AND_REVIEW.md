# Các ca cần sửa và fallback

## stateful-1 — ca 5 — stateful-request-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang 2 chiếc áo size L cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, 2 chiếc áo của chị có giá 998.000đ, phí ship 30.000đ và được ưu đãi giảm 49.900đ, tổng thanh toán là 978.100đ chị nhé.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng, em cập nhật lại số đo của chị rồi ạ. Giỏ hàng của mình vẫn giữ 2 áo size L chị nhé!

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Kết quả actual: NO_SEND / EGRESS_WORLD_CHANGED

```text
[Không gửi tin cho khách]
```

**UNUSABLE** — Khách yêu cầu đặt mua nhưng không nhận tin nào: NO_SEND/EGRESS_WORLD_CHANGED, stage vẫn CART_OPEN. Đây là thất bại hành trình tại boundary/egress; cần diagnosis sau primary để xác định nguyên nhân, không quy ngay cho prompt hay verifier.

## stateful-1 — ca 6 — stateful-private-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang 2 chiếc áo size L cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, 2 chiếc áo của chị có giá 998.000đ, phí ship 30.000đ và được ưu đãi giảm 49.900đ, tổng thanh toán là 978.100đ chị nhé.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng, em cập nhật lại số đo của chị rồi ạ. Giỏ hàng của mình vẫn giữ 2 áo size L chị nhé!

customer: Chị đặt hai áo này nhé, lên đơn cho chị.

Khách: [Thông tin checkout riêng tư được xử lý trong code]

Kết quả actual: NO_SEND / CHECKOUT_INVITATION_NOT_COMPLETED

```text
[Không gửi tin cho khách]
```

**BLOCKED_DEPENDENCY** — Private checkout không thực hiện vì lời mời checkout ở lượt5 chưa hoàn tất; actual không gửi, CART_OPEN. Giữ trong denominator, không tính thành ca code thành công.

## stateful-1 — ca 7 — stateful-confirm

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang 2 chiếc áo size L cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, 2 chiếc áo của chị có giá 998.000đ, phí ship 30.000đ và được ưu đãi giảm 49.900đ, tổng thanh toán là 978.100đ chị nhé.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng, em cập nhật lại số đo của chị rồi ạ. Giỏ hàng của mình vẫn giữ 2 áo size L chị nhé!

customer: Chị đặt hai áo này nhé, lên đơn cho chị.

customer: [Thông tin checkout riêng tư được xử lý trong code]

Khách: Chốt đơn cho chị nhé.

Kết quả actual: NO_SEND / CHECKOUT_INVITATION_NOT_COMPLETED

```text
[Không gửi tin cho khách]
```

**BLOCKED_DEPENDENCY** — Chốt đơn bị chặn do chưa hoàn tất checkout invitation của lượt5; không có receipt mua hoặc tin chuyển nhân viên.

## b1-1 — ca 9 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Áo của set dùng chất tơ Hàn thêu mềm, thoáng kết hợp chân váy ren tơ mềm và form nhẹ nên mặc rất nhẹ người chị ạ. 

Ở ngoài trời lâu và dễ nóng, chất vải thoáng nhẹ này sẽ giúp chị thoải mái hơn, nhưng vì đứng ngoài trời nắng thì mình tranh thủ đứng ở khu vực có bóng râm hoặc chuẩn bị thêm quạt mini cầm tay cho mát mẻ nhé ạ.
```

**NEEDS_EDIT** — Khách lo nóng khi tiệc chuyển ra ngoài trời lâu. Reply tiếp tục lấy thoáng/nhẹ để trấn an, rồi khuyên đứng bóng râm hoặc mang quạt; chưa đưa lựa chọn mua/cách mặc cụ thể giúp giải quyết băn khoăn. Lỗi tư vấn cũ còn, không phải tự động cấm inference chất liệu.
