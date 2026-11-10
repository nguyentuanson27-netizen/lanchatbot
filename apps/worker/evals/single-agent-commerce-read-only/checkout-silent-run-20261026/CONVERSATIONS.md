# Hội thoại — silent handoff, 26/10/2026

Source `a479b9559121d22b969202799dd64791ea5f36ef`; native 7/7; N1/retry0. B1 read-only là eligibility, persisted là capture trong DB thử nghiệm; không gửi khách thật.

## stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Em thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé.
>
> Tổng đơn của chị hiện là 529.000đ (gồm 499.000đ tiền áo và 30.000đ phí vận chuyển). Chị cần em hỗ trợ thêm gì không ạ?

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-variant-quantity

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.
>
> Tổng đơn của chị hiện là 978.100đ (đã gồm phí vận chuyển). Chị cần em hỗ trợ thêm gì không ạ?

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-quote

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, tổng đơn 2 áo của chị gồm phí vận chuyển là 978.100đ ạ (trong đó tiền hàng 998.000đ, ưu đãi 49.900đ và phí ship 30.000đ).

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-correction

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ vâng, em ghi nhận số đo mới của chị ạ. Giỏ hàng 2 áo size L của chị được giữ nguyên nhé ạ!

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-request-checkout

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING; PERSISTED_CAPTURE

> Chị cho em [NAME]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-private-checkout

Khách: [Thông tin nhận hàng qua luồng riêng]

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED; PERSISTED_CAPTURE

> [Nội dung checkout đã ẩn thông tin nhận hàng]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-confirm

Khách: Chốt đơn cho chị nhé.

Terminal: HANDOFF / PURCHASE_CONFIRMED; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`
