# Toàn bộ 32 hội thoại và đánh giá

## stateful-1 — ca 1 — stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Em đã thêm áo Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!
```

**USABLE** — Đúng thêm áo beM×1 và báo pre-order, không suy ra fit từ số đo.

## stateful-1 — ca 2 — stateful-variant-quantity

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em đã thêm áo Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả actual: SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY

```text
Giỏ của chị: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```

**USABLE** — Actual code-owned receipt-backed cart summary xác nhận2áobeL/tổng978100 đúng committed cart. Không coi đây là model đã nói trơn tru; cần diagnosis recovery sau primary.

## stateful-1 — ca 3 — stateful-quote

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em đã thêm áo Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Giỏ của chị: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

Khách: Hai áo cả phí ship là bao nhiêu em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, tổng thanh toán cho 2 chiếc áo bao gồm 30.000đ phí ship là 978.100đ ạ.
```

**USABLE** — Tổng978100 gồm ship30000 đúng quote code, trả thẳng câu hỏi.

## stateful-1 — ca 4 — stateful-correction

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em đã thêm áo Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Giỏ của chị: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, tổng thanh toán cho 2 chiếc áo bao gồm 30.000đ phí ship là 978.100đ ạ.

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ vâng ạ, em đã cập nhật lại số đo của chị rồi nhé. Áo size L chị chọn vẫn được giữ nguyên ạ!
```

**USABLE** — State sửa số đo và giữbeL×2; actual không đọc lại số đo hoặc bịa fit. Lời xác nhận đúng kết quả.

## stateful-1 — ca 5 — stateful-request-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em đã thêm áo Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Giỏ của chị: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, tổng thanh toán cho 2 chiếc áo bao gồm 30.000đ phí ship là 978.100đ ạ.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng ạ, em đã cập nhật lại số đo của chị rồi nhé. Áo size L chị chọn vẫn được giữ nguyên ạ!

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Kết quả actual: NO_SEND / CHECKOUT_DETAILS_MISSING

```text
Chị gửi thêm [NAME]
```

**USABLE** — ModelNO_SEND nhưng actual có code invitation xin checkout; hành trình tiếp tục. [NAME] là redaction của public capture, không phải literal template lỗi.

## stateful-1 — ca 6 — stateful-private-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em đã thêm áo Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Giỏ của chị: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, tổng thanh toán cho 2 chiếc áo bao gồm 30.000đ phí ship là 978.100đ ạ.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng ạ, em đã cập nhật lại số đo của chị rồi nhé. Áo size L chị chọn vẫn được giữ nguyên ạ!

customer: Chị đặt hai áo này nhé, lên đơn cho chị.

shop: Chị gửi thêm [NAME]

Khách: [Thông tin checkout riêng tư được xử lý trong code]

Kết quả actual: NO_SEND / PRIVATE_CHECKOUT_COMMITTED

```text
2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L: 998.000đ
Tạm tính: 998.000đ
Ưu đãi: -49.900đ
Phí ship: 30.000đ
Tổng: 978.100đ
Set váy Thạch Thảo: hàng đặt trước
Người nhận: Khách thử nghiệm - [PHONE]
[ADDRESS]
Thanh toán: COD
Dự kiến nhận hàng: 8-14 ngày.
Chị xác nhận chốt đơn nhé.
```

**USABLE** — Private code tạo preview đúng2beL/tổng978100/COD/pre-order/ETA8–14, stageORDER_PREVIEW; PII xử lý trong code.

## stateful-1 — ca 7 — stateful-confirm

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em đã thêm áo Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Giỏ của chị: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, tổng thanh toán cho 2 chiếc áo bao gồm 30.000đ phí ship là 978.100đ ạ.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng ạ, em đã cập nhật lại số đo của chị rồi nhé. Áo size L chị chọn vẫn được giữ nguyên ạ!

customer: Chị đặt hai áo này nhé, lên đơn cho chị.

shop: Chị gửi thêm [NAME]

customer: [Thông tin checkout riêng tư được xử lý trong code]

shop: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L: 998.000đ
Tạm tính: 998.000đ
Ưu đãi: -49.900đ
Phí ship: 30.000đ
Tổng: 978.100đ
Set váy Thạch Thảo: hàng đặt trước
Người nhận: Khách thử nghiệm - [PHONE]
[ADDRESS]
Thanh toán: COD
Dự kiến nhận hàng: 8-14 ngày.
Chị xác nhận chốt đơn nhé.

Khách: Chốt đơn cho chị nhé.

Kết quả actual: HANDOFF / PURCHASE_CONFIRMED

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```

**USABLE** — PURCHASE_CONFIRMED và tin chuyển nhân viên kiểm tra/lên đơn, không báo POS order đã được tạo.

## stateful-1 — ca 8 — stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Kết quả actual: HANDOFF / CUSTOMER_REQUESTED_HUMAN

```text
[Không gửi thêm tin — ownership control]
```

**OWNERSHIP_CONTROL** — Yêu cầu nhân viên trong journey riêng chuyểnHUMAN và im lặng đúng control.

## b1-1 — ca 1 — b1-changed-occasion

customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.

shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Chị ơi, set Thạch Thảo dùng chất liệu tơ Hàn và ren mềm nên khi ngồi ô tô gần 3 tiếng thì phần tơ và chân váy có thể dễ bị hằn nếp gấp. 

Nếu mình ngại vấn đề này thì chị chuyển sang **Váy Diệp An (V168)** giúp em nhé. Mẫu này có thiết kế 2 lớp đứng form cùng form suông nhẹ, mặc di chuyển đường dài sẽ thoải mái, giữ dáng váy gọn gàng và ít hằn nếp gấp hơn khi ngồi lâu mà diện đi đám cưới vẫn rất thanh lịch, sang trọng ạ.
```

**USABLE** — Chọn V168 thay Thạch Thảo để đi xe lâu, một phương án chính với lý do form2lớp/suông. Không ép cứ thiếu phép thử là không được khuyên; phần ít hằn nếp hơn vẫn cần giữ là inference định tính.

## b1-1 — ca 2 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Kết quả actual: FALLBACK / FAIL

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual chỉ nhận fallback thay câu hỏi còn đổi màu được không/phí. TerminalFAIL cần diagnosis sau primary; không tự kết luận draft sai chỉ vì bị verifier chặn.

## b1-1 — ca 3 — b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo có phần áo làm từ chất liệu tơ Hàn thêu họa tiết nổi, mềm thoáng và bay bổng tự nhiên, kết hợp cùng chân váy ren tơ Hàn mềm rũ nhẹ nhàng chị ạ. 

Về giá và tình trạng còn hàng của size M, hiện em chưa tra cứu được thông tin này trên hệ thống.
```

**USABLE** — Trả chất liệu từng phần, giữ giá/tồnM unknown trong POS fault-mode; không bịa dữ kiện để bán.

## b1-1 — ca 4 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo mã SV2447 có giá 799.000đ chị nhé. 

Ngoài ra shop có bán lẻ từng món nếu chị muốn ghép:
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ
```

**USABLE** — 799k cả bộ trả trước, không hỏi lại bộ/lẻ. Bảng giá lẻ thêm vào còn thừa nhưng không làm mất câu trả lời chính.

## b1-1 — ca 5 — b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ áo tơ thêu Thạch Thảo size M bên em vẫn còn hàng chị nhé. Áo bán riêng có giá 499.000đ ạ.
```

**USABLE** — ÁoM còn499k, đúng món và gọn.

## b1-1 — ca 6 — b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ áo dài mã SD375 có giá 929.000đ cho áo lẻ và 1.065.000đ cho cả bộ chị nhé ạ.
```

**USABLE** — Đúng SD375,929k áo lẻ/1065k cả bộ, phân biệt scope rõ.

## b1-1 — ca 7 — b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ set váy này chân váy làm bằng ren tơ Hàn mềm mại, form nhẹ và có độ rũ tự nhiên nên mặc đi tiệc ban ngày rất thanh thoát, không bị rườm rà đâu chị nha. 

Ngân sách 900 nghìn của mình hoàn toàn thoải mái chọn nguyên set luôn ạ, bộ có váy có giá 799.000đ thôi chị nhé.
```

**USABLE** — Giải thích lo rườm rà bằng form nhẹ/độ rũ,799k trong ngân sách; nhận xét thẩm mỹ dùng được, không đòi phép thử cho từng lợi ích.

## b1-1 — ca 8 — b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên vẹn, chưa qua sử dụng (chỉ ướm thử bên ngoài, chưa mặc ra ngoài hay đi làm ạ). Vì mình đã mặc đi làm một buổi rồi nên shop rất tiếc không hỗ trợ đổi sang màu khác được, chị thông cảm giúp em nhé ạ!
```

**USABLE** — Đã mặc đi làm thì không đổi màu, hiểu hành vi khách trước khi trả lời; không đồng ý rồi đọc điều kiện. Không cần tính phí cho yêu cầu không hợp lệ.

## b1-1 — ca 9 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Áo tơ Hàn thêu và chân váy ren tơ Hàn đều là chất vải mềm, nhẹ và có độ thoáng, không bị dày hay nặng người đâu chị ạ. 

Nếu mình đứng ngoài trời lâu và dễ nóng, chị có thể chọn mặc riêng áo lẻ (499k) phối cùng quần hoặc chân váy gọn gàng để thoải mái hơn, hoặc diện nguyên set nếu không gian tiệc có bóng râm nhé ạ.
```

**USABLE** — Trả lo nóng bằng nhận xét nhẹ/thoáng, đưa cách mua áo499k phối đồ gọn thay vì mặc nguyên set; không còn khẳng định đứng lâu không bí hoặc chỉ khuyên mang quạt. Có hai cách theo hoàn cảnh, dùng được dù chưa chọn dứt khoát một cách.

## b1-1 — ca 10 — b1-current-policy-v2

customer: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, mình nhận hàng 12 hôm thì vẫn còn trong thời hạn đổi size 15 ngày của shop chị nhé. Phí ship 2 chiều cho đơn đổi hàng là 30.000đ ạ.
```

**USABLE** — Đúng15ngày/30k hai chiều, thay25k cũ, không đọc dư toàn policy.

## b1-1 — ca 11 — b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Chân váy Thạch Thảo làm bằng chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên thướt tha lắm chị ạ. 

Hiện hệ thống bên em chưa tra được thông tin giá và tồn kho riêng cho chân váy size M, chị thông cảm giúp em nha.
```

**USABLE** — Trả chất liệu/dáng chân váy và không bịa giá/tồn trong fault-mode. Có phản hồi hữu ích thay fallback của vòng trước.

## b1-1 — ca 12 — b1-price-v2

customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo cả bộ có giá 799.000đ chị nha.
```

**USABLE** — 799k cả bộ, một câu đúng trọng tâm, không thêm CTA hoặc bảng giá lẻ.

## b1-1 — ca 13 — b1-component-stock-v2

customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, chân váy Thạch Thảo size M bên em vẫn còn hàng chị ạ. Chân váy mua riêng có giá 449.000đ chị nha.
```

**USABLE** — Chân váyM còn449k, đúng và ngắn; không còn fallback ở mẫu này.

## b1-1 — ca 14 — b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ shop có sẵn set váy Khánh Trang chị nha. Mẫu này shop bán cả bộ giá 999.000đ, hoặc nếu chị muốn mua lẻ áo hay chân váy thì giá là 499.000đ mỗi món ạ.
```

**USABLE** — Tìm đúng Khánh Trang,999k cả bộ/499k mỗi phần rõ scope; không còn fallback.

## b1-1 — ca 15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo rất hợp để đi ăn cưới ban ngày vì chất tơ Hàn và ren mềm mại mang lại nét thanh lịch, nhẹ nhàng chứ không bị lồng lộn hay sến sẩm đâu chị ạ. 

Tuy nhiên, vì áo có họa tiết thêu nổi và chân váy ren, nếu chị quen mặc đồ trơn và sợ hơi điệu, mình có thể chọn cách mua áo lẻ (499.000đ) để phối cùng chân váy hoặc quần trơn đơn giản sẵn có trong tủ, vừa giữ được nét sang trọng của chất vải lại rất nhã nhặn, đúng phong cách quen thuộc của chị. Hoặc nếu lấy cả set (799.000đ), form dáng phom nhẹ, có độ bay rũ tự nhiên nên mặc lên vẫn rất tinh tế, không hề quá đà đâu ạ. 

Chị cân nhắc xem lấy nguyên set hay chọn áo lẻ phối đồ nhé ạ!
```

**NEEDS_EDIT** — Khách nhờ shop nói có nên mua vì sợ quá điệu. Reply mở bằng lời khen/phủ định lo lắng, thêm cả áo lẻ và cả set rồi kết thúc chị cân nhắc. Đưa lại quyết định cho khách, chưa chọn một hướng có lý do; lỗi cũ quay lại.

## b1-1 — ca 16 — b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải chưa qua mặc thử vào người (chỉ ướm bên ngoài). Do mình đã mặc thử vào người rồi nên shop tiếc là không hỗ trợ đổi size được, mong chị thông cảm giúp em nhé ạ.
```

**USABLE** — Từ chối đổi đúng do đã mặc thử vào người, phân biệt với ướm bên ngoài. Không bị còn tem/chưa ra ngoài làm lệch policy.

## b1-1 — ca 17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả actual: FALLBACK / FAIL

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual fallback thay lời khuyên cả bộ/áo cho gặp khách; giữ trong denominator, chờ diagnosis draft/verdict sau khóa primary.

## b1-1 — ca 18 — b1-current-policy-v3

customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ bên em hiện đã nâng thời gian hỗ trợ đổi hàng lên 15 ngày kể từ lúc nhận hàng rồi nên chị đổi size thoải mái nha chị!
```

**USABLE** — Mốc15ngày đáp được đơn9ngày chỉ mở xem/cất. Không fail chỉ vì thiếu danh sách điều kiện không được hỏi.

## b1-1 — ca 19 — b1-partial-source-v3

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, áo của set Thạch Thảo được làm từ chất liệu tơ Hàn thêu với họa tiết thêu nổi, mềm mại, thoáng mát và có độ bay tự nhiên; còn chân váy là chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé. 

Về giá và tình trạng còn hàng, hiện tại hệ thống bên em chưa cập nhật được thông tin này nên em chưa báo chính xác cho chị ngay được ạ.
```

**USABLE** — Đủ chất liệu hai phần và giữ giá/tồn unknown khi nguồn POS cố ý unavailable.

## b1-1 — ca 20 — b1-price-v3

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, nguyên set Thạch Thảo có giá 799.000đ chị nhé.
```

**USABLE** — 799k nguyên set, đúng trọng tâm.

## b1-1 — ca 21 — b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, áo Thạch Thảo nhà em có bán riêng chị nhé. Áo size M hiện đang có sẵn, giá 499.000đ ạ.
```

**USABLE** — Bán lẻ/cònM/499k rồi dừng, không mời giỏ ngoài khả năng B1; biểu hiện tốt lặp lại.

## b1-1 — ca 22 — b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, mẫu Set quần Xuân Thảo (SQ223) nhà em vẫn còn hàng chị nhé. Mẫu này hiện có sẵn các lựa chọn:

- Áo lẻ: 429.000đ
- Quần lẻ: 429.000đ
- Nguyên bộ: 699.000đ
```

**USABLE** — Tìm đúng SQ223, trả tồn và429k từng phần/699k bộ, không nhầm scope. Không tự fail bảng giá khi phân biệt offer có ích.

## b1-1 — ca 23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Chị lấy cả bộ Thạch Thảo đi ạ! Ngân sách tầm 850 nghìn của chị hoàn toàn vừa vặn vì giá cả bộ là 799.000đ, tính ra tiết kiệm hơn hẳn so với mua lẻ.

Áo tơ thêu nổi kết hợp cùng chân váy ren tơ Hàn mặc lên rất bay bổng và sang, diện đi chơi hay sự kiện đều đẹp. Hơn nữa, chị hoàn toàn có thể tách chiếc áo này ra phối linh hoạt với chân váy đen dáng suông sẵn có để đi làm, vừa thanh lịch lại vừa dễ mặc lại nhiều lần cho nhiều dịp khác nhau ạ.
```

**NEEDS_EDIT** — Khuyên cả bộ với lý do tách phối/mặc nhiều dịp là upsell có thể dùng. Nhưng tiết kiệm hơn hẳn so mua lẻ trong câu hỏi áo499k hay bộ799k không nói rõ comparator là mua riêng cả hai món; dễ làm khách hiểu bộ rẻ hơn lựa chọn áo họ đang cân nhắc. Cần phân biệt đáng mua thêm300k với tiết kiệm tiền, không coi upsell là lỗi.

## b1-1 — ca 24 — b1-policy-used-v3

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng bên em yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt tẩy ạ. Do sản phẩm của mình đã cắt tem và giặt rồi nên rất tiếc em không hỗ trợ đổi sang mẫu khác được, chị thông cảm giúp em nhé ạ!
```

**USABLE** — Từ chối đổi đúng do cắt tem/giặt, không mở rộng quyền lợi.
