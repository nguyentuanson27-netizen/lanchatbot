# Toàn bộ 48 lượt và primary review — sales voice run

Run source: `93db1d47c49618a119a446ba4b0c86015672ae39`. Chưa có owner acceptance. Primary labels khóa trước rejected-draft/verifier diagnosis. Lượt replay không chứng minh live eligibility.

## stateful-1 / stateful-open

Lịch sử:
- Không có.

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual customer outcome:

> Dạ, em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ.

Primary: **USABLE** — Nhận đúng áo/be/M do khách chọn, ghi số đo và mở giỏ đúng; báo hàng đặt trước, không tự gán kết quả fit.

Terminal: SEND_ELIGIBLE / PASS


## stateful-1 / stateful-variant-quantity

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ.

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Actual customer outcome:

> Dạ, em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L (hàng đặt trước) cho mình rồi ạ.

Primary: **USABLE** — Giỏ đổi đúng L và hai áo, giữ be; actual message xác nhận lựa chọn phù hợp state. Mã màu trong recovery là voice finding riêng.

Terminal: SEND_ELIGIBLE / PASS

Voice finding: Nhắc lại hàng đặt trước dù đã báo ở lượt mở giỏ; dư nhưng không tự làm sai lựa chọn.

## stateful-1 / stateful-quote

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L (hàng đặt trước) cho mình rồi ạ.

Khách: Hai áo cả phí ship là bao nhiêu em?

Actual customer outcome:

> Dạ, tổng tiền hàng 2 áo là 998.000đ, phí ship 30.000đ, sau ưu đãi tổng thanh toán của mình là 978.100đ ạ.

Primary: **USABLE** — Trả đúng tổng978.100đ cho hai áo, gồm ship và ưu đãi theo quote; không đảo quan hệ số tiền.

Terminal: SEND_ELIGIBLE / PASS


## stateful-1 / stateful-correction

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L (hàng đặt trước) cho mình rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, tổng tiền hàng 2 áo là 998.000đ, phí ship 30.000đ, sau ưu đãi tổng thanh toán của mình là 978.100đ ạ.

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Actual customer outcome:

> Dạ vâng, em đã cập nhật lại số đo và giữ nguyên 2 áo size L cho mình rồi ạ!

Primary: **USABLE** — Sửa eo74/mông96, giữ lựa chọn L/hai áo; xác nhận ngắn gọn, không đọc lại toàn bộ hồ sơ hoặc tự chọn fit.

Terminal: SEND_ELIGIBLE / PASS


## stateful-1 / stateful-request-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L (hàng đặt trước) cho mình rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, tổng tiền hàng 2 áo là 998.000đ, phí ship 30.000đ, sau ưu đãi tổng thanh toán của mình là 978.100đ ạ.
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ vâng, em đã cập nhật lại số đo và giữ nguyên 2 áo size L cho mình rồi ạ!

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Actual customer outcome:

> Chị gửi thêm [NAME]

Primary: **USABLE** — Code thực sự phát lời mời và transition thu thông tin trước private turn; không có model xin PII. Artifact đã redact lời mời nên không chấm chi tiết giọng của literal gốc.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING


## stateful-1 / stateful-private-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L (hàng đặt trước) cho mình rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, tổng tiền hàng 2 áo là 998.000đ, phí ship 30.000đ, sau ưu đãi tổng thanh toán của mình là 978.100đ ạ.
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ vâng, em đã cập nhật lại số đo và giữ nguyên 2 áo size L cho mình rồi ạ!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]

Khách: [Thông tin checkout riêng tư được xử lý trong code]

Actual customer outcome:

> Áo SV2447 màu BE, size L ×2: 998.000đ
> Tạm tính: 998.000đ
> Ưu đãi: -49.900đ
> Phí ship: 30.000đ
> Tổng: 978.100đ
> SV2447: hàng đặt trước
> Người nhận: Khách thử nghiệm - [PHONE]
> [ADDRESS]
> Thanh toán: COD
> Dự kiến nhận hàng: 8-14 ngày.
> Chị xác nhận chốt đơn nhé.

Primary: **USABLE** — Private code path dùng zero model requests, tạo preview đúng lựa chọn/tổng/ETA; không gửi fixture riêng tư tới model.

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED

Voice finding: Preview code vẫn dùng mã sản phẩm/màu; prompt owner không điều khiển formatter này.

## stateful-1 / stateful-confirm

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L (hàng đặt trước) cho mình rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, tổng tiền hàng 2 áo là 998.000đ, phí ship 30.000đ, sau ưu đãi tổng thanh toán của mình là 978.100đ ạ.
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ vâng, em đã cập nhật lại số đo và giữ nguyên 2 áo size L cho mình rồi ạ!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]
- customer: [Thông tin checkout riêng tư được xử lý trong code]
- shop: Áo SV2447 màu BE, size L ×2: 998.000đ
Tạm tính: 998.000đ
Ưu đãi: -49.900đ
Phí ship: 30.000đ
Tổng: 978.100đ
SV2447: hàng đặt trước
Người nhận: Khách thử nghiệm - [PHONE]
[ADDRESS]
Thanh toán: COD
Dự kiến nhận hàng: 8-14 ngày.
Chị xác nhận chốt đơn nhé.

Khách: Chốt đơn cho chị nhé.

Actual customer outcome:

> Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.

Primary: **USABLE** — Xác nhận preview hợp lệ đi tới PURCHASE_CONFIRMED và handoff; không báo đã tạo đơn POS.

Terminal: HANDOFF / PURCHASE_CONFIRMED

Voice finding: Câu code “ghi nhận xác nhận mua hàng” vẫn hành chính; không phải lời owner sinh trong lượt này.

## stateful-1 / stateful-human-request

Lịch sử:
- Không có.

Khách: Cho chị gặp nhân viên shop nhé.

Actual customer outcome:

Không phát thêm tin; xem disposition/control.

Primary: **OWNERSHIP_CONTROL** — Yêu cầu gặp nhân viên đã chuyển ownership theo policy; không phát sinh tư vấn bổ sung.

Terminal: HANDOFF / CUSTOMER_REQUESTED_HUMAN


## stateful-2 / stateful-open

Lịch sử:
- Không có.

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual customer outcome:

> Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.

Primary: **USABLE** — Nhận đúng áo/be/M do khách chọn, ghi số đo và mở giỏ đúng; báo hàng đặt trước, không tự gán kết quả fit.

Terminal: SEND_ELIGIBLE / PASS


## stateful-2 / stateful-variant-quantity

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Actual customer outcome:

> Dạ, em đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.

Primary: **USABLE** — Giỏ đổi đúng L và hai áo, giữ be; actual message xác nhận lựa chọn phù hợp state. Mã màu trong recovery là voice finding riêng.

Terminal: SEND_ELIGIBLE / PASS

Voice finding: Nhắc lại hàng đặt trước dù đã báo ở lượt mở giỏ; dư nhưng không tự làm sai lựa chọn.

## stateful-2 / stateful-quote

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.

Khách: Hai áo cả phí ship là bao nhiêu em?

Actual customer outcome:

> Tổng thanh toán 2 áo gồm cả phí ship là 978.100đ chị nhé (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi ạ).

Primary: **USABLE** — Trả đúng tổng978.100đ cho hai áo, gồm ship và ưu đãi theo quote; không đảo quan hệ số tiền.

Terminal: SEND_ELIGIBLE / PASS


## stateful-2 / stateful-correction

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Tổng thanh toán 2 áo gồm cả phí ship là 978.100đ chị nhé (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi ạ).

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Actual customer outcome:

> Phần này em chưa trả lời được, chị nhé.

Primary: **UNUSABLE** — Khách chỉ nhận câu fallback, không giải quyết được yêu cầu ở lượt này. State đã sửa đúng số đo nhưng không thay thế được lời xác nhận khách nhận.

Terminal: FALLBACK / FAIL


## stateful-2 / stateful-request-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Tổng thanh toán 2 áo gồm cả phí ship là 978.100đ chị nhé (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi ạ).
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Phần này em chưa trả lời được, chị nhé.

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Actual customer outcome:

> Chị gửi thêm [NAME]

Primary: **USABLE** — Code thực sự phát lời mời và transition thu thông tin trước private turn; không có model xin PII. Artifact đã redact lời mời nên không chấm chi tiết giọng của literal gốc.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING


## stateful-2 / stateful-private-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Tổng thanh toán 2 áo gồm cả phí ship là 978.100đ chị nhé (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi ạ).
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Phần này em chưa trả lời được, chị nhé.
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]

Khách: [Thông tin checkout riêng tư được xử lý trong code]

Actual customer outcome:

> Áo SV2447 màu BE, size L ×2: 998.000đ
> Tạm tính: 998.000đ
> Ưu đãi: -49.900đ
> Phí ship: 30.000đ
> Tổng: 978.100đ
> SV2447: hàng đặt trước
> Người nhận: Khách thử nghiệm - [PHONE]
> [ADDRESS]
> Thanh toán: COD
> Dự kiến nhận hàng: 8-14 ngày.
> Chị xác nhận chốt đơn nhé.

Primary: **USABLE** — Private code path dùng zero model requests, tạo preview đúng lựa chọn/tổng/ETA; không gửi fixture riêng tư tới model.

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED

Voice finding: Preview code vẫn dùng mã sản phẩm/màu; prompt owner không điều khiển formatter này.

## stateful-2 / stateful-confirm

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Tổng thanh toán 2 áo gồm cả phí ship là 978.100đ chị nhé (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi ạ).
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Phần này em chưa trả lời được, chị nhé.
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]
- customer: [Thông tin checkout riêng tư được xử lý trong code]
- shop: Áo SV2447 màu BE, size L ×2: 998.000đ
Tạm tính: 998.000đ
Ưu đãi: -49.900đ
Phí ship: 30.000đ
Tổng: 978.100đ
SV2447: hàng đặt trước
Người nhận: Khách thử nghiệm - [PHONE]
[ADDRESS]
Thanh toán: COD
Dự kiến nhận hàng: 8-14 ngày.
Chị xác nhận chốt đơn nhé.

Khách: Chốt đơn cho chị nhé.

Actual customer outcome:

> Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.

Primary: **USABLE** — Xác nhận preview hợp lệ đi tới PURCHASE_CONFIRMED và handoff; không báo đã tạo đơn POS.

Terminal: HANDOFF / PURCHASE_CONFIRMED

Voice finding: Câu code “ghi nhận xác nhận mua hàng” vẫn hành chính; không phải lời owner sinh trong lượt này.

## stateful-2 / stateful-human-request

Lịch sử:
- Không có.

Khách: Cho chị gặp nhân viên shop nhé.

Actual customer outcome:

Không phát thêm tin; xem disposition/control.

Primary: **OWNERSHIP_CONTROL** — Yêu cầu gặp nhân viên đã chuyển ownership theo policy; không phát sinh tư vấn bổ sung.

Terminal: HANDOFF / CUSTOMER_REQUESTED_HUMAN


## stateful-3 / stateful-open

Lịch sử:
- Không có.

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual customer outcome:

> Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.

Primary: **USABLE** — Nhận đúng áo/be/M do khách chọn, ghi số đo và mở giỏ đúng; báo hàng đặt trước, không tự gán kết quả fit.

Terminal: SEND_ELIGIBLE / PASS


## stateful-3 / stateful-variant-quantity

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Actual customer outcome:

> Giỏ hiện có 2 sản phẩm, size L, màu BE. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

Primary: **USABLE** — Giỏ đổi đúng L và hai áo, giữ be; actual message xác nhận lựa chọn phù hợp state. Mã màu trong recovery là voice finding riêng.

Terminal: SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY

Voice finding: Nhắc lại hàng đặt trước dù đã báo ở lượt mở giỏ; dư nhưng không tự làm sai lựa chọn.
Voice finding: Actual code recovery dùng “Giỏ hiện có 2 sản phẩm”, màu BE; mang giọng hệ thống. Không quy lời code này cho prompt owner.

## stateful-3 / stateful-quote

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Giỏ hiện có 2 sản phẩm, size L, màu BE. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

Khách: Hai áo cả phí ship là bao nhiêu em?

Actual customer outcome:

> Dạ, tổng thanh toán cho 2 áo là 978.100đ (đã gồm 30.000đ phí ship) chị ạ.

Primary: **USABLE** — Trả đúng tổng978.100đ cho hai áo, gồm ship và ưu đãi theo quote; không đảo quan hệ số tiền.

Terminal: SEND_ELIGIBLE / PASS


## stateful-3 / stateful-correction

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Giỏ hiện có 2 sản phẩm, size L, màu BE. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, tổng thanh toán cho 2 áo là 978.100đ (đã gồm 30.000đ phí ship) chị ạ.

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Actual customer outcome:

> Dạ, em đã cập nhật lại số đo cho chị rồi ạ. Chị vẫn lấy 2 áo Thạch Thảo màu be size L nha.

Primary: **USABLE** — Sửa eo74/mông96, giữ lựa chọn L/hai áo; xác nhận ngắn gọn, không đọc lại toàn bộ hồ sơ hoặc tự chọn fit.

Terminal: SEND_ELIGIBLE / PASS


## stateful-3 / stateful-request-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Giỏ hiện có 2 sản phẩm, size L, màu BE. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, tổng thanh toán cho 2 áo là 978.100đ (đã gồm 30.000đ phí ship) chị ạ.
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ, em đã cập nhật lại số đo cho chị rồi ạ. Chị vẫn lấy 2 áo Thạch Thảo màu be size L nha.

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Actual customer outcome:

> Chị gửi thêm [NAME]

Primary: **USABLE** — Code thực sự phát lời mời và transition thu thông tin trước private turn; không có model xin PII. Artifact đã redact lời mời nên không chấm chi tiết giọng của literal gốc.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING


## stateful-3 / stateful-private-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Giỏ hiện có 2 sản phẩm, size L, màu BE. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, tổng thanh toán cho 2 áo là 978.100đ (đã gồm 30.000đ phí ship) chị ạ.
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ, em đã cập nhật lại số đo cho chị rồi ạ. Chị vẫn lấy 2 áo Thạch Thảo màu be size L nha.
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]

Khách: [Thông tin checkout riêng tư được xử lý trong code]

Actual customer outcome:

> Áo SV2447 màu BE, size L ×2: 998.000đ
> Tạm tính: 998.000đ
> Ưu đãi: -49.900đ
> Phí ship: 30.000đ
> Tổng: 978.100đ
> SV2447: hàng đặt trước
> Người nhận: Khách thử nghiệm - [PHONE]
> [ADDRESS]
> Thanh toán: COD
> Dự kiến nhận hàng: 8-14 ngày.
> Chị xác nhận chốt đơn nhé.

Primary: **USABLE** — Private code path dùng zero model requests, tạo preview đúng lựa chọn/tổng/ETA; không gửi fixture riêng tư tới model.

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED

Voice finding: Preview code vẫn dùng mã sản phẩm/màu; prompt owner không điều khiển formatter này.

## stateful-3 / stateful-confirm

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Giỏ hiện có 2 sản phẩm, size L, màu BE. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, tổng thanh toán cho 2 áo là 978.100đ (đã gồm 30.000đ phí ship) chị ạ.
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ, em đã cập nhật lại số đo cho chị rồi ạ. Chị vẫn lấy 2 áo Thạch Thảo màu be size L nha.
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]
- customer: [Thông tin checkout riêng tư được xử lý trong code]
- shop: Áo SV2447 màu BE, size L ×2: 998.000đ
Tạm tính: 998.000đ
Ưu đãi: -49.900đ
Phí ship: 30.000đ
Tổng: 978.100đ
SV2447: hàng đặt trước
Người nhận: Khách thử nghiệm - [PHONE]
[ADDRESS]
Thanh toán: COD
Dự kiến nhận hàng: 8-14 ngày.
Chị xác nhận chốt đơn nhé.

Khách: Chốt đơn cho chị nhé.

Actual customer outcome:

> Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.

Primary: **USABLE** — Xác nhận preview hợp lệ đi tới PURCHASE_CONFIRMED và handoff; không báo đã tạo đơn POS.

Terminal: HANDOFF / PURCHASE_CONFIRMED

Voice finding: Câu code “ghi nhận xác nhận mua hàng” vẫn hành chính; không phải lời owner sinh trong lượt này.

## stateful-3 / stateful-human-request

Lịch sử:
- Không có.

Khách: Cho chị gặp nhân viên shop nhé.

Actual customer outcome:

Không phát thêm tin; xem disposition/control.

Primary: **OWNERSHIP_CONTROL** — Yêu cầu gặp nhân viên đã chuyển ownership theo policy; không phát sinh tư vấn bổ sung.

Terminal: HANDOFF / CUSTOMER_REQUESTED_HUMAN


## b1-1 / b1-changed-occasion

Lịch sử:
- customer: Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.
- shop: Dịp đó mặc set này hợp chị ạ.

Khách: Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

Actual customer outcome:

> Phần này em chưa trả lời được, chị nhé.

Primary: **UNUSABLE** — Khách chỉ nhận câu fallback, không giải quyết được yêu cầu ở lượt này.

Terminal: FALLBACK / FAIL


## b1-1 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual customer outcome:

> Chân váy làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất thướt tha ạ. Hiện em chưa kiểm tra được giá và tình trạng tồn kho cụ thể của size M nên chưa báo chính xác cho chị được nhé ạ.

Primary: **USABLE** — Trả đúng chất liệu/dáng đang có và nói đúng phần giá/tồn chưa tra được; không bịa giá, tồn hay nguyên nhân kỹ thuật.

Terminal: SEND_ELIGIBLE / PASS


## b1-1 / b1-buying-concern

Lịch sử:
- Không có.

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual customer outcome:

> Cả set giá 799k, vừa vặn với ngân sách 900k của chị ạ. 
> 
> Chân váy dùng ren tơ Hàn mềm kết hợp áo thêu form nhẹ và có độ bay tự nhiên nên mặc đi tiệc ban ngày rất nhã nhặn, không bị rườm rà hay nặng nề đâu chị nhé. Chị mặc nguyên set này là vừa xinh và hợp đi tiệc luôn ạ.

Primary: **USABLE** — Trả lời nỗi lo ren/rườm rà cho tiệc ban ngày, khuyên nguyên set và báo đúng giá; suy luận thẩm mỹ hợp lệ. Nhịp catalog và lặp ngân sách được ghi riêng, không chấm bằng số keyword.

Terminal: SEND_ELIGIBLE / PASS

Voice finding: Vẫn lặp ngân sách khách và dựa nhiều vào chuỗi mô tả/nhã nhặn/bay bổng; đủ giải quyết câu hỏi nhưng chưa cho thấy giọng chat cải thiện ổn định.

## b1-1 / b1-search-read

Lịch sử:
- Không có.

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual customer outcome:

> Dạ hiện shop chưa tìm thấy mẫu áo dài mã SD375 này. Chị kiểm tra lại giúp em mã hoặc gửi hình ảnh qua để em kiểm tra chính xác nha!

Primary: **NEEDS_EDIT** — Khách đã cho mã nhưng chưa nhận được giá. Nguồn/capture ở lượt này chưa cung cấp đúng dữ kiện giá; giữ riêng hạn chế acquisition/context, không coi đây là bằng chứng riêng về khả năng diễn đạt. Câu hỏi lại mã/hình làm khách phải bổ sung cho mã đã cung cấp; bot đang xử lý kết quả AMBIGUOUS.

Terminal: SEND_ELIGIBLE / PASS


## b1-2 / b1-changed-occasion

Lịch sử:
- customer: Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.
- shop: Dịp đó mặc set này hợp chị ạ.

Khách: Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

Actual customer outcome:

> Phần này em chưa trả lời được, chị nhé.

Primary: **UNUSABLE** — Khách chỉ nhận câu fallback, không giải quyết được yêu cầu ở lượt này.

Terminal: FALLBACK / FAIL


## b1-2 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual customer outcome:

> Chân váy làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất thoải mái ạ. 
> 
> Riêng về việc mua lẻ chân váy, giá và tình trạng size M hiện shop chưa kiểm tra được thông tin. Chị chờ thêm hoặc xem xét lấy cả set để shop hỗ trợ mình nhé ạ!

Primary: **NEEDS_EDIT** — Trả được chất liệu và nêu phần giá/tồn chưa có, nhưng dẫn khách chờ hoặc mua cả set khi chưa có nguồn giá/tồn hỗ trợ phương án đó. Bước tiếp chưa dùng được.

Terminal: SEND_ELIGIBLE / PASS


## b1-2 / b1-buying-concern

Lịch sử:
- Không có.

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual customer outcome:

> Set này diện đi tiệc ban ngày rất hợp và không bị rườm rà đâu chị nha. Chân váy làm từ ren tơ Hàn mềm với form nhẹ và độ rũ tự nhiên, kết hợp cùng áo tơ thêu thanh thoát nên tổng thể trông rất nhẹ nhàng, bay bổng và sang trọng. 
> 
> Trọn bộ nguyên set có giá 799.000đ, hoàn toàn vừa vặn với ngân sách 900.000đ của chị ạ. Chị có muốn em kiểm tra size phù hợp cho mình luôn không ạ?

Primary: **USABLE** — Trả lời nỗi lo ren/rườm rà cho tiệc ban ngày, khuyên nguyên set và báo đúng giá; suy luận thẩm mỹ hợp lệ. Nhịp catalog và lặp ngân sách được ghi riêng, không chấm bằng số keyword.

Terminal: SEND_ELIGIBLE / PASS

Voice finding: Vẫn lặp ngân sách khách và dựa nhiều vào chuỗi mô tả/nhã nhặn/bay bổng; đủ giải quyết câu hỏi nhưng chưa cho thấy giọng chat cải thiện ổn định.

## b1-2 / b1-search-read

Lịch sử:
- Không có.

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual customer outcome:

> Dạ mẫu áo dài mã SD375 hiện tại em chưa kiểm tra được mức giá chính xác, chị đợi em một lát nhé ạ!

Primary: **NEEDS_EDIT** — Khách đã cho mã nhưng chưa nhận được giá. Nguồn/capture ở lượt này chưa cung cấp đúng dữ kiện giá; giữ riêng hạn chế acquisition/context, không coi đây là bằng chứng riêng về khả năng diễn đạt. Lời chờ một lát không có follow-up executor để thực hiện lời hẹn.

Terminal: SEND_ELIGIBLE / PASS


## b1-3 / b1-changed-occasion

Lịch sử:
- customer: Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.
- shop: Dịp đó mặc set này hợp chị ạ.

Khách: Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

Actual customer outcome:

> Phần này em chưa trả lời được, chị nhé.

Primary: **UNUSABLE** — Khách chỉ nhận câu fallback, không giải quyết được yêu cầu ở lượt này.

Terminal: FALLBACK / FAIL


## b1-3 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual customer outcome:

> Chân váy làm từ ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất thướt tha chị nhé. 
> 
> Hiện tại shop chưa kiểm tra được giá và tồn kho size M, đồng thời mẫu này cũng chưa có thông tin bán lẻ riêng chân váy ạ.

Primary: **USABLE** — Trả đúng chất liệu/dáng đang có và nói đúng phần giá/tồn chưa tra được; không bịa giá, tồn hay nguyên nhân kỹ thuật.

Terminal: SEND_ELIGIBLE / PASS


## b1-3 / b1-buying-concern

Lịch sử:
- Không có.

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual customer outcome:

> Dạ, chân váy dùng ren tơ Hàn mềm có độ rũ tự nhiên kết hợp với áo tơ thêu form nhẹ nhàng, thanh thoát nên mặc đi tiệc ban ngày rất nhã nhặn, không bị rườm rà đâu chị ạ. 
> 
> Nguyên set giá 799.000đ, hoàn toàn trong ngân sách 900.000đ của chị. Nếu chị muốn mua lẻ từng món thì áo là 499.000đ còn chân váy là 449.000đ ạ.

Primary: **USABLE** — Trả lời nỗi lo ren/rườm rà cho tiệc ban ngày, khuyên nguyên set và báo đúng giá; suy luận thẩm mỹ hợp lệ. Nhịp catalog và lặp ngân sách được ghi riêng, không chấm bằng số keyword.

Terminal: SEND_ELIGIBLE / PASS

Voice finding: Vẫn lặp ngân sách khách và dựa nhiều vào chuỗi mô tả/nhã nhặn/bay bổng; đủ giải quyết câu hỏi nhưng chưa cho thấy giọng chat cải thiện ổn định.

## b1-3 / b1-search-read

Lịch sử:
- Không có.

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual customer outcome:

> Mã SD375 hiện có hai lựa chọn:
> - Áo lẻ: 929.000đ
> - Cả set: 1.065.000đ
> 
> Chị muốn lấy áo lẻ hay nguyên set ạ?

Primary: **USABLE** — Báo đúng hai lựa chọn áo lẻ929k/cả set1.065k của SD375; danh sách hai giá phục vụ trực tiếp câu hỏi.

Terminal: SEND_ELIGIBLE / PASS


## advice-1 / b1-changed-occasion

Lịch sử:
- customer: Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.
- shop: Dịp đó mặc set này hợp chị ạ.

Khách: Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

Actual customer outcome:

> Phần này em chưa trả lời được, chị nhé.

Primary: **UNUSABLE** — Khách chỉ nhận câu fallback, không giải quyết được yêu cầu ở lượt này.

Terminal: FALLBACK / FAIL


## advice-1 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual customer outcome:

> Chân váy làm từ chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé. Còn về giá cũng như tồn kho size M của riêng chân váy thì hiện shop chưa kiểm tra được ạ.

Primary: **USABLE** — Trả đúng chất liệu/dáng đang có và nói đúng phần giá/tồn chưa tra được; không bịa giá, tồn hay nguyên nhân kỹ thuật.

Terminal: SEND_ELIGIBLE / PASS


## advice-1 / b1-buying-concern

Lịch sử:
- Không có.

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual customer outcome:

> Dạ set này giá 799k, vừa vặn trong ngân sách 900k của chị ạ. Chất ren tơ Hàn mềm kết hợp form nhẹ và độ rũ tự nhiên nên mặc lên bay bổng, thanh nhã chứ không bị rườm rà, đi tiệc ban ngày rất sang và hợp lý ạ.

Primary: **USABLE** — Trả lời nỗi lo ren/rườm rà cho tiệc ban ngày, khuyên nguyên set và báo đúng giá; suy luận thẩm mỹ hợp lệ. Nhịp catalog và lặp ngân sách được ghi riêng, không chấm bằng số keyword.

Terminal: SEND_ELIGIBLE / PASS

Voice finding: Vẫn lặp ngân sách khách và dựa nhiều vào chuỗi mô tả/nhã nhặn/bay bổng; đủ giải quyết câu hỏi nhưng chưa cho thấy giọng chat cải thiện ổn định.

## advice-1 / b1-search-read

Lịch sử:
- Không có.

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual customer outcome:

> Dạ mẫu áo dài mã SD375 hiện tại em chưa kiểm tra được giá và thông tin sản phẩm này ạ.

Primary: **NEEDS_EDIT** — Khách đã cho mã nhưng chưa nhận được giá. Nguồn/capture ở lượt này chưa cung cấp đúng dữ kiện giá; giữ riêng hạn chế acquisition/context, không coi đây là bằng chứng riêng về khả năng diễn đạt.

Terminal: SEND_ELIGIBLE / PASS


## advice-2 / b1-changed-occasion

Lịch sử:
- customer: Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.
- shop: Dịp đó mặc set này hợp chị ạ.

Khách: Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

Actual customer outcome:

> Phần này em chưa trả lời được, chị nhé.

Primary: **UNUSABLE** — Khách chỉ nhận câu fallback, không giải quyết được yêu cầu ở lượt này.

Terminal: FALLBACK / FAIL


## advice-2 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual customer outcome:

> Dạ, chân váy làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé. Còn giá và tồn kho của size M thì hiện tại em chưa kiểm tra được ạ.

Primary: **USABLE** — Trả đúng chất liệu/dáng đang có và nói đúng phần giá/tồn chưa tra được; không bịa giá, tồn hay nguyên nhân kỹ thuật.

Terminal: SEND_ELIGIBLE / PASS


## advice-2 / b1-buying-concern

Lịch sử:
- Không có.

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual customer outcome:

> Chất ren tơ Hàn mềm với form nhẹ và độ rũ tự nhiên nên lên đồ rất thanh thoát, bay bổng, mặc đi tiệc ban ngày sang trọng mà không bị nặng nề hay rườm rà đâu chị nhé. 
> 
> Cả set này giá 799.000đ, vừa vặn trong ngân sách 900.000đ của chị luôn ạ.

Primary: **USABLE** — Trả lời nỗi lo ren/rườm rà cho tiệc ban ngày, khuyên nguyên set và báo đúng giá; suy luận thẩm mỹ hợp lệ. Nhịp catalog và lặp ngân sách được ghi riêng, không chấm bằng số keyword.

Terminal: SEND_ELIGIBLE / PASS

Voice finding: Vẫn lặp ngân sách khách và dựa nhiều vào chuỗi mô tả/nhã nhặn/bay bổng; đủ giải quyết câu hỏi nhưng chưa cho thấy giọng chat cải thiện ổn định.

## advice-2 / b1-search-read

Lịch sử:
- Không có.

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual customer outcome:

> Dạ, áo dài mã SD375 hiện shop chưa kiểm tra được giá và thông tin sản phẩm ạ.

Primary: **NEEDS_EDIT** — Khách đã cho mã nhưng chưa nhận được giá. Nguồn/capture ở lượt này chưa cung cấp đúng dữ kiện giá; giữ riêng hạn chế acquisition/context, không coi đây là bằng chứng riêng về khả năng diễn đạt.

Terminal: SEND_ELIGIBLE / PASS


## advice-3 / b1-changed-occasion

Lịch sử:
- customer: Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.
- shop: Dịp đó mặc set này hợp chị ạ.

Khách: Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

Actual customer outcome:

> Phần này em chưa trả lời được, chị nhé.

Primary: **UNUSABLE** — Khách chỉ nhận câu fallback, không giải quyết được yêu cầu ở lượt này.

Terminal: FALLBACK / FAIL


## advice-3 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual customer outcome:

> Chân váy làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé. Hiện tại em chưa kiểm tra được chính xác giá cũng như tình trạng còn size M của riêng chân váy này.

Primary: **USABLE** — Trả đúng chất liệu/dáng đang có và nói đúng phần giá/tồn chưa tra được; không bịa giá, tồn hay nguyên nhân kỹ thuật.

Terminal: SEND_ELIGIBLE / PASS


## advice-3 / b1-buying-concern

Lịch sử:
- Không có.

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual customer outcome:

> Chị yên tâm nha, chân váy dùng chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên nên khi mặc lên nhìn rất thanh thoát, kết hợp với áo thêu nổi nhẹ nhàng nên đi tiệc ban ngày trông sang và nhã nhặn chứ không bị rườm rà đâu ạ. 
> 
> Chọn nguyên set giá 799.000đ sẽ vừa vặn trong ngân sách 900 nghìn của mình (mua lẻ áo và chân váy tổng sẽ là 948.000đ), diện cả bộ chuẩn thiết kế mà lại tiết kiệm hơn đó ạ.

Primary: **USABLE** — Trả lời nỗi lo ren/rườm rà cho tiệc ban ngày, khuyên nguyên set và báo đúng giá; suy luận thẩm mỹ hợp lệ. Nhịp catalog và lặp ngân sách được ghi riêng, không chấm bằng số keyword.

Terminal: SEND_ELIGIBLE / PASS

Voice finding: Vẫn lặp ngân sách khách và dựa nhiều vào chuỗi mô tả/nhã nhặn/bay bổng; đủ giải quyết câu hỏi nhưng chưa cho thấy giọng chat cải thiện ổn định.

## advice-3 / b1-search-read

Lịch sử:
- Không có.

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual customer outcome:

> Mẫu áo dài này bên em có hai lựa chọn cho chị:
> - Áo lẻ: 929.000đ
> - Cả set: 1.065.000đ
> 
> Chị xem lấy phương án nào nhé ạ.

Primary: **USABLE** — Báo đúng hai lựa chọn áo lẻ929k/cả set1.065k của SD375; danh sách hai giá phục vụ trực tiếp câu hỏi.

Terminal: SEND_ELIGIBLE / PASS

