# Toàn bộ 32 hội thoại và đánh giá

## stateful-1 — ca 1 — stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Em thêm áo lẻ Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Sản phẩm này là hàng đặt trước chị nha.
```

**USABLE** — Thêm đúng áo beM×1, báo pre-order; không khẳng định fit từ số đo.

## stateful-1 — ca 2 — stateful-variant-quantity

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Sản phẩm này là hàng đặt trước chị nha.

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Em đã đổi sang áo size L và lấy 2 chiếc cho chị rồi ạ.
```

**USABLE** — Đổi đúng2áoL và xác nhận ngắn, committed cart đúng.

## stateful-1 — ca 3 — stateful-quote

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Sản phẩm này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang áo size L và lấy 2 chiếc cho chị rồi ạ.

Khách: Hai áo cả phí ship là bao nhiêu em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, tổng thanh toán cho 2 áo gồm phí ship 30.000đ (đã trừ ưu đãi) là 978.100đ ạ.
```

**USABLE** — Trả tổng978.100đ gồm ship30k/đã giảm đúng quote. Ngoặc phục vụ tổng tiền, không tự fail.

## stateful-1 — ca 4 — stateful-correction

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Sản phẩm này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang áo size L và lấy 2 chiếc cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, tổng thanh toán cho 2 áo gồm phí ship 30.000đ (đã trừ ưu đãi) là 978.100đ ạ.

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ vâng ạ, em giữ nguyên 2 áo size L cho chị nhé!
```

**USABLE** — Xác nhận giữ2áoL, không đọc lại số đo hoặc báo lưu hệ thống; state phải giữ eo74/mông96 theo committed profile.

## stateful-1 — ca 5 — stateful-request-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Sản phẩm này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang áo size L và lấy 2 chiếc cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, tổng thanh toán cho 2 áo gồm phí ship 30.000đ (đã trừ ưu đãi) là 978.100đ ạ.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng ạ, em giữ nguyên 2 áo size L cho chị nhé!

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Kết quả actual: NO_SEND / CHECKOUT_DETAILS_MISSING

```text
Chị gửi thêm [NAME]
```

**USABLE** — Model terminalNO_SEND nhưng actual có code-owned invitation xin checkout, hành trình tiếp tục. Không gộp NO_SEND model thành khách không nhận tin; public copy [NAME] là redaction, không phải template literal.

## stateful-1 — ca 6 — stateful-private-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Sản phẩm này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang áo size L và lấy 2 chiếc cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, tổng thanh toán cho 2 áo gồm phí ship 30.000đ (đã trừ ưu đãi) là 978.100đ ạ.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng ạ, em giữ nguyên 2 áo size L cho chị nhé!

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

**USABLE** — Private code intake tạo ORDER_PREVIEW, đúng2áobeL/tổng978.100/COD/pre-order/ETA8–14; actual gửi preview. Dữ liệu riêng tư xử lý trong code.

## stateful-1 — ca 7 — stateful-confirm

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Sản phẩm này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang áo size L và lấy 2 chiếc cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, tổng thanh toán cho 2 áo gồm phí ship 30.000đ (đã trừ ưu đãi) là 978.100đ ạ.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng ạ, em giữ nguyên 2 áo size L cho chị nhé!

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

**USABLE** — PURCHASE_CONFIRMED và actual chuyển nhân viên kiểm tra/lên đơn, không tự báo tạo POS order thành công.

## stateful-1 — ca 8 — stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Kết quả actual: HANDOFF / CUSTOMER_REQUESTED_HUMAN

```text
[Không gửi thêm tin — ownership control]
```

**OWNERSHIP_CONTROL** — Yêu cầu nhân viên trong journey riêng chuyển ownershipHUMAN và im lặng đúng control; không tính là fallback.

## b1-1 — ca 1 — b1-changed-occasion

customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.

shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ đi ô tô gần 3 tiếng liên tục thì chất tơ Hàn mềm và ren của set Thạch Thảo sẽ dễ để lại nếp gấp ở phần áo và váy đó chị. 

Nếu chị ngại nhăn và muốn giữ form gọn gàng suốt chuyến đi, em gợi ý mình chuyển sang **Váy Diệp An (V168)** nhé. Mẫu này dùng chất tơ ống với thiết kế 2 lớp đứng form đẹp, mặc lên thanh lịch, sang trọng và ít bị hằn nếp hơn hẳn. Hoặc nếu chị thích diện váy yếm điệu đà, nổi bật thì mẫu **Váy Ngọc Trâm (V406)** cũng rất phù hợp cho dịp đi cưới ạ.
```

**USABLE** — Chọn V168 làm phương án chính khi khách ngại nhăn lúc đi xe, có lý do về form/chất liệu; thêm V406 chưa giải thích tradeoff nên không cần thiết. Phần ít hằn nếp hơn hẳn/giữ form suốt chuyến đi là diễn đạt mạnh cần đối chiếu căn cứ, không tự gọi là kết quả thử nghiệm.

## b1-1 — ca 2 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ đơn của mình nhận 10 hôm trước vẫn đổi được chị nha, vì chính sách đổi hàng của shop là trong vòng 15 ngày kể từ lúc nhận hàng ạ. 

Chị đổi sang màu khác được hỗ trợ bình thường, phí ship 2 chiều cho đơn đổi là 30.000đ ạ.
```

**USABLE** — Đúng policy15ngày thay thông tin7ngày cũ, đủ còn kịp/phí30k hai chiều. Không bắt đọc lại toàn bộ điều kiện.

## b1-1 — ca 3 — b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo có áo may bằng tơ Hàn thêu họa tiết thêu nổi, chất vải mềm, thoáng và có độ bay tự nhiên; chân váy làm từ ren tơ Hàn mềm, form nhẹ và rũ tự nhiên chị nhé. 

Còn về giá và tình trạng size M thì hiện tại em chưa tra được thông tin này ạ.
```

**USABLE** — Đủ chất liệu áo/váy và nói rõ chưa tra được giá/tồnM trong fault-mode, không bịa dữ kiện. Gọn hơn văn phong hệ thống/tham khảo giúp em của vòng trước.

## b1-1 — ca 4 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo có giá 799.000đ trọn bộ chị nha. Ngoài ra shop có bán lẻ áo (499.000đ) và chân váy (449.000đ) nếu chị muốn mua rời ạ.
```

**USABLE** — Trả799k nguyên bộ trước, không hỏi lại lựa chọn. Giá lẻ thêm chưa cần nhưng không làm mất câu trả lời chính.

## b1-1 — ca 5 — b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ áo Thạch Thảo size M hiện còn hàng chị nhé, áo bán riêng có giá 499.000đ ạ.
```

**USABLE** — Đúng áoM còn499k, một câu gọn.

## b1-1 — ca 6 — b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, áo dài mã SD375 có giá 929.000đ cho áo lẻ và 1.065.000đ nếu chị lấy cả bộ chị nhé.
```

**USABLE** — Tìm đúng SD375 và phân biệt929k áo lẻ/1065k cả bộ; không hỏi lại để mở thêm tư vấn không cần thiết.

## b1-1 — ca 7 — b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ set váy Thạch Thảo có giá 799.000đ cho cả bộ, hoàn toàn nằm trong ngân sách 900.000đ của chị nhé ạ. 

Chân váy làm từ chất ren tơ Hàn mềm mại với độ rũ tự nhiên kết hợp cùng áo tơ thêu form nhẹ nhàng, mang lại cảm giác bay bổng và thanh nhã chứ không bị rườm rà hay quá điệu đâu chị. Mặc đi tiệc ban ngày rất sang trọng, lịch sự và vừa vặn ạ.
```

**USABLE** — Trả lo rườm rà bằng nhận xét form/độ rũ, giá799k trong ngân sách. Dùng được theo inference thẩm mỹ đã chấp nhận, không tự gọi chữ vừa vặn trong cụm đánh giá diện tiệc là kết quả SIZE_FIT.

## b1-1 — ca 8 — b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng của shop áp dụng cho sản phẩm còn nguyên vẹn và chưa qua sử dụng ạ. Do chị đã mặc đi làm nên rất tiếc shop không hỗ trợ đổi sang màu khác cho mình được. 

Trường hợp đổi hàng hợp lệ, phí ship đổi hai chiều là 30.000đ chị nha.
```

**USABLE** — Hiểu đã mặc đi làm là không đổi được, từ chối đúng; tách phí cho trường hợp hợp lệ, không cấp quyền đổi cho khách này.

## b1-1 — ca 9 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Áo làm từ tơ Hàn mềm thoáng cùng chân váy ren tơ nhẹ form, có độ bay tự nhiên nên mặc ra sân vườn đứng lâu cũng dễ chịu, không bị nặng hay bí người chị ạ.
```

**NEEDS_EDIT** — Dùng mềm/thoáng/nhẹ để khẳng định đứng ngoài trời lâu cũng dễ chịu, không bí người, trong khi khách dễ nóng và cần quyết định mua. Chưa giải quyết trang phục theo hoàn cảnh mới, lại biến inference chất liệu thành bảo đảm cảm giác sử dụng cụ thể. Cần đối chiếu trusted source sau primary để đánh giá protected-language gap.

## b1-1 — ca 10 — b1-current-policy-v2

customer: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, mình nhận đồ 12 ngày thì vẫn trong thời hạn đổi hàng 15 ngày của shop nên vẫn kịp chị nhé. Phí ship đổi hàng 2 chiều là 30.000đ ạ.
```

**USABLE** — Đúng15ngày và30k hai chiều, trả câu hỏi còn kịp/phí thay25k cũ.

## b1-1 — ca 11 — b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả actual: FALLBACK / PROVIDER_ERROR

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual chỉ nhận fallback Phần này em chưa trả lời được; không có phần chất liệu/dáng váy mà khách cần. PROVIDER_ERROR cần diagnosis sau primary; không quy cho thiếu nguồn có chủ đích hoặc prompt.

## b1-1 — ca 12 — b1-price-v2

customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo nguyên bộ giá 799.000đ chị nhé. Bộ này gồm áo thêu tơ Hàn và chân váy ren mềm mại, mặc lên bay bổng và rất xinh ạ. Chị có muốn em tư vấn size không ạ?
```

**USABLE** — Trả799k cả bộ đúng phạm vi; lời mời tư vấn size phù hợp chức năng đọc, chưa hứa thêm giỏ.

## b1-1 — ca 13 — b1-component-stock-v2

customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Kết quả actual: FALLBACK / PROVIDER_ERROR

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual fallback thay câu trả tồn/giá chân váyM; chưa có ích để mua. PROVIDER_ERROR chưa xác định role/stage trước diagnosis.

## b1-1 — ca 14 — b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Kết quả actual: FALLBACK / PROVIDER_ERROR

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual fallback, khách không biết shop có Khánh Trang/giá. Giữ lỗi trong denominator; xem provider role sau primary.

## b1-1 — ca 15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo form nhẹ, chất tơ và ren mềm bay tự nhiên nên diện đi ăn cưới ban ngày rất nhã nhặn và lịch sự ạ. 

Tuy nhiên, vì chị quen mặc đồ trơn ít họa tiết, nếu mặc trọn bộ cả áo thêu nổi lẫn chân váy ren thì có thể lúc đầu chị sẽ thấy hơi điệu so với phong cách thường ngày. 

Em khuyên chị vẫn nên lấy cả bộ (799.000đ) vì mua nguyên set sẽ tiết kiệm hơn so với mua lẻ. Hôm đi ăn cưới, chị cứ diện cả set vì dáng váy áo mềm mại, bay nhẹ chứ không bị rườm rà đâu ạ. Còn những ngày thường, mình hoàn toàn có thể tách áo thêu ra phối cùng quần hoặc chân váy trơn sẵn có trong tủ, vừa đúng gu tối giản lại rất dễ mặc nha chị.
```

**USABLE** — Chọn cả bộ799k, thừa nhận khách có thể thấy hơi điệu rồi đưa cách tách phối ngày thường; vẫn có một đề xuất mua và lý do mặc lại. Không ép áo lẻ hoặc coi upsell là lỗi.

## b1-1 — ca 16 — b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ quy định của shop đổi hàng là sản phẩm cần chưa từng mặc thử vào người (chỉ ướm bên ngoài), nên trường hợp chị đã mặc thử thì em rất tiếc không hỗ trợ đổi size được ạ.
```

**USABLE** — Hiểu mặc thử vào người khác ướm bên ngoài, từ chối đổi theo policy hiện hành, không cấp quyền do còn tem/chưa ra ngoài.

## b1-1 — ca 17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Đi gặp khách hàng cần sự gọn gàng, chuyên nghiệp thì chị lấy áo lẻ (499.000đ) thôi chị ạ. 

Áo chất tơ thêu form nhẹ, mình kết hợp với quần âu hoặc chân váy cơ bản sẽ sắc sảo và lịch sự hơn. Cả bộ váy ren có độ bay và rũ tự nhiên mặc đi tiệc sẽ hợp và mềm mại hơn chị nhé.
```

**USABLE** — Chọn áo499k phối quần âu/váy cơ bản cho gặp khách, so với cả bộ đi tiệc; đáp đúng thay đổi lịch và nhu cầu gọn hơn.

## b1-1 — ca 18 — b1-current-policy-v3

customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, bên em hỗ trợ đổi hàng trong 15 ngày kể từ ngày nhận nên đơn của chị 9 ngày là vẫn đổi size được nha chị. Phí vận chuyển đổi hàng 2 chiều là 30.000đ ạ. Chị muốn đổi sang size nào để em hỗ trợ mình nhé?
```

**USABLE** — Mốc15ngày đúng cho9ngày mới mở xem/cất; trả được câu hỏi còn đổi được không. Câu hỏi size tiếp nối chưa báo đã đổi hoặc hứa thao tác hoàn tất.

## b1-1 — ca 19 — b1-partial-source-v3

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, áo của set này được làm từ tơ Hàn thêu với họa tiết thêu nổi, vải mềm, thoáng và có độ bay tự nhiên ạ. Còn chân váy là chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nha.

Hiện tại hệ thống bên em chưa có thông tin cụ thể về giá và tình trạng còn hàng của mẫu này ạ.
```

**USABLE** — Trả đúng chất liệu hai phần và giữ giá/tồn unknown trong fault-mode. Không quy thiếu POS cố ý là model bịa.

## b1-1 — ca 20 — b1-price-v3

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, nguyên set Thạch Thảo có giá 799.000đ chị nhé!
```

**USABLE** — 799k nguyên set, ngắn và đúng trọng tâm.

## b1-1 — ca 21 — b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Áo Thạch Thảo bên em có bán riêng chị nhé. Áo size M hiện còn hàng, giá 499.000đ ạ.
```

**USABLE** — Bán lẻ/cònM/499k rồi dừng, không mời giỏ ngoài khả năng B1, lặp lại biểu hiện tốt của vòng trước.

## b1-1 — ca 22 — b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, mẫu Set quần Xuân Thảo (SQ223) nhà em vẫn còn hàng chị nhé. Mẫu này chị có thể mua lẻ áo, quần hoặc mua nguyên bộ tùy ý ạ:

- Áo lẻ: 429.000đ
- Quần lẻ: 429.000đ
- Cả bộ có quần: 699.000đ

Các phân loại hiện đều đang sẵn hàng tại shop. Chị muốn lấy áo, quần hay nguyên bộ thì nhắn em nhé!
```

**USABLE** — Tìm đúng SQ223 và trả đủ tồn/giá từng offer429k/699k. Nhiều giá không sai khi tên mẫu còn có các cách mua.

## b1-1 — ca 23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Chị lấy cả bộ Thạch Thảo (799.000đ) đi ạ, vừa vặn trong ngân sách 850 nghìn của chị mà lại linh hoạt nhất. 

Áo tơ thêu nổi form nhẹ phối với chân váy đen sẵn có của chị sẽ ra nét thanh lịch, gọn gàng để đi làm. Khi cần diện đi chơi hay đi tiệc, chị mặc nguyên set cùng chân váy ren tơ mềm mại là có ngay bộ đồ bay bổng, nữ tính mà không phải tốn công tìm đồ phối ạ.
```

**USABLE** — Chọn bộ799k trong850k với lý do có thêm cách mặc tiệc, vẫn dùng áo phối váy đen sẵn có để đi làm. Upsell có lý do, không tự fail do khách đã có váy.

## b1-1 — ca 24 — b1-policy-used-v3

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ sản phẩm đã cắt tem và giặt qua rồi nên shop không hỗ trợ đổi hàng được, mong chị thông cảm giúp em nhé ạ.
```

**USABLE** — Từ chối đổi đúng vì đã cắt tem/giặt, không đọc thừa điều kiện không liên quan.
