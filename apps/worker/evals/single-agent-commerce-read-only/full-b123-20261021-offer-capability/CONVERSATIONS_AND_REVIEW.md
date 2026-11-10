# Toàn bộ 32 hội thoại và đánh giá

## stateful-1 — ca 1 — stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Em thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!
```

**USABLE** — Actual xác nhận thêm áo beM và báo hàng đặt trước; public state có đúng1áo. Không tự suy ra mặc vừa từ số đo.

## stateful-1 — ca 2 — stateful-variant-quantity

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Em đã đổi sang 2 chiếc áo size L cho chị rồi ạ.
```

**USABLE** — Đổi đúng2áo sizeL trong committed cart và xác nhận ngắn.

## stateful-1 — ca 3 — stateful-quote

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang 2 chiếc áo size L cho chị rồi ạ.

Khách: Hai áo cả phí ship là bao nhiêu em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, 2 chiếc áo của chị có giá 998.000đ, phí ship 30.000đ và được ưu đãi giảm 49.900đ, tổng thanh toán là 978.100đ chị nhé.
```

**USABLE** — 998k tiền áo, giảm49.900, ship30k, tổng978.100 khớp quote code; thông tin tiền cần thiết, không phải liệt kê thừa.

## stateful-1 — ca 4 — stateful-correction

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Em thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Em đã đổi sang 2 chiếc áo size L cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, 2 chiếc áo của chị có giá 998.000đ, phí ship 30.000đ và được ưu đãi giảm 49.900đ, tổng thanh toán là 978.100đ chị nhé.

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ vâng, em cập nhật lại số đo của chị rồi ạ. Giỏ hàng của mình vẫn giữ 2 áo size L chị nhé!
```

**USABLE** — State cập nhật eo74/mông96, giữbeL×2 và tổng978.100; lời xác nhận không đọc lại số đo, không khẳng định fit.

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

## stateful-1 — ca 8 — stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Kết quả actual: HANDOFF / CUSTOMER_REQUESTED_HUMAN

```text
[Không gửi thêm tin — ownership control]
```

**OWNERSHIP_CONTROL** — Khách yêu cầu nhân viên trong journey riêng: HUMAN ownership control, không gửi thêm là outcome đúng; không phải fallback.

## b1-1 — ca 1 — b1-changed-occasion

customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.

shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo chất tơ và ren nên khi ngồi ô tô 3 tiếng liên tục có thể sẽ bị hằn nếp nhẹ ở phần tơ và ren đó chị ạ. 

Nếu mình ngại nhăn khi di chuyển đường dài, mẫu **Set quần SQ675** (chất thô hoa laze phối thô ướt cao cấp) sẽ là lựa chọn phù hợp hơn. Set này có thiết kế quần ống rộng và áo dáng suông, chất vải đứng form và ít nhăn hơn, giúp mình ngồi xe thoải mái mà vẫn giữ được nét thanh lịch, sang trọng khi tới nơi. Chị tham khảo qua mẫu này nhé ạ!
```

**USABLE** — Đọc thay đổi đi xe lâu và chọn SQ675 thay Thạch Thảo, có lý do về chất liệu/form. Câu còn nhiều tính từ; inference ít nhăn/cảm giác ngồi cần giữ phạm vi tư vấn, không coi là kết quả phép thử.

## b1-1 — ca 2 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ đơn nhận 10 hôm là mình vẫn đổi kịp nha chị, vì thời hạn đổi hàng bên em là trong vòng 15 ngày kể từ khi nhận ạ. 

Chị đổi màu được nha chị, phí đổi (gồm vận chuyển 2 chiều) là 30.000đ ạ.
```

**USABLE** — Dùng mốc15ngày hiện hành thay thông tin7ngày trong history, trả đủ còn kịp và phí30k hai chiều. Không bắt nhắc lại toàn bộ điều kiện.

## b1-1 — ca 3 — b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Set Thạch Thảo có phần áo làm từ tơ Hàn thêu họa tiết nổi, vải mềm, thoáng và bay bổng tự nhiên, kết hợp cùng chân váy ren tơ Hàn mềm mại, rũ nhẹ nhàng chị ạ. 

Dạ hiện tại hệ thống bên em chưa tra được thông tin giá và tình trạng tồn kho của size M, chị tham khảo chất liệu giúp em nhé ạ!
```

**USABLE** — Trả phần chất liệu đã có và không bịa giá/tồn khi POS cố ý unavailable. Chưa hoàn tất bán hàng là giới hạn nguồn trong ca này.

## b1-1 — ca 4 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo (SV2447) có giá **799.000đ** nguyên bộ chị nhé. Ngoài ra shop có bán lẻ áo giá **499.000đ** và chân váy giá **449.000đ** ạ.
```

**USABLE** — Báo giá cả bộ799k trước và không hỏi lại lựa chọn khách đã nói. Hai giá lẻ thêm vào còn thừa nhưng không làm mất câu trả lời hoặc quyết định của khách.

## b1-1 — ca 5 — b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Áo lẻ Thạch Thảo size M nhà em hiện còn hàng chị nhé. Giá áo bán riêng là 499.000đ ạ.
```

**USABLE** — Trả đúng áo bán riêng sizeM còn hàng,499k, gọn.

## b1-1 — ca 6 — b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, mẫu áo dài SD375 shop có sẵn cả áo lẻ và nguyên bộ ạ:
- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Chị muốn lấy áo lẻ hay cả bộ để em tư vấn thêm size cho mình nhé ạ?
```

**USABLE** — Tìm đúng mã SD375; phân biệt929k áo lẻ với1065k cả bộ, hỏi lựa chọn khi tên áo dài chưa chỉ rõ phạm vi mua. Bảng giá phục vụ phân biệt offer.

## b1-1 — ca 7 — b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ set này hoàn toàn vừa với ngân sách 900 nghìn của chị vì nguyên bộ có giá **799.000đ** ạ. 

Chị yên tâm diện đi tiệc ban ngày không bị rườm rà đâu ạ, vì thiết kế dùng chất liệu ren tơ Hàn mềm kết hợp áo tơ thêu form nhẹ, có độ bay và rũ tự nhiên nên lên dáng rất thanh thoát, mềm mại chứ không hề nặng nề hay cứng nhắc.
```

**USABLE** — Giải quyết lo rườm rà bằng nhận xét form/độ rũ, giá799k nằm trong ngân sách. Chưa có cách phối cụ thể nhưng nhận xét thẩm mỹ này dùng được; không fail chỉ vì tính từ.

## b1-1 — ca 8 — b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng bên em áp dụng cho sản phẩm chưa qua sử dụng ạ (chỉ ướm thử bên ngoài và chưa mặc đi làm hay giặt ạ). Do chị đã mặc đi làm rồi nên sản phẩm không đủ điều kiện để đổi màu, em rất tiếc chưa hỗ trợ đổi cho mình được nha chị ơi.
```

**USABLE** — Hiểu đã mặc đi làm là không đủ điều kiện đổi, từ chối thẳng thay vì đồng ý rồi đọc điều kiện. Không cần báo phí cho giao dịch không được đổi.

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

## b1-1 — ca 10 — b1-current-policy-v2

customer: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, mình được đổi trong vòng 15 ngày kể từ khi nhận hàng nên đơn 12 hôm của chị vẫn kịp ạ. Phí ship đổi hai chiều là 30.000đ chị nha.
```

**USABLE** — Đúng mốc15ngày và30k hai chiều cho câu hỏi còn kịp/phí; không fail do thiếu điều kiện không được hỏi lại.

## b1-1 — ca 11 — b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Chân váy của set Thạch Thảo làm từ chất liệu ren tơ Hàn mềm mại, form nhẹ và có độ rũ tự nhiên rất thướt tha chị ạ. Dạ hiện thông tin giá và tồn kho riêng cho phần chân váy size M chưa cập nhật trên hệ thống nên em chưa báo chính xác được cho chị nhé ạ.
```

**USABLE** — Đúng phạm vi chân váy và chất liệu/dáng; giữ giá/tồn unknown trong fault-mode thay vì bịa. Giới hạn nguồn cần tách khỏi chất lượng diễn đạt.

## b1-1 — ca 12 — b1-price-v2

customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo (gồm áo thêu và chân váy ren) có giá 799.000đ chị nha. Set hiện có sẵn hàng, chị cần em tư vấn thêm về size hay chi tiết nào cứ báo em nhé ạ!
```

**USABLE** — Trả giá cả bộ799k đúng phạm vi. Lời mời tư vấn size dùng được trong B1, không hứa thao tác giỏ.

## b1-1 — ca 13 — b1-component-stock-v2

customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, chân váy Thạch Thảo size M nhà em vẫn còn hàng chị ạ. Chân váy mua riêng có giá 449.000đ chị nha.
```

**USABLE** — Chân váyM còn,449k, đúng món và gọn.

## b1-1 — ca 14 — b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ shop có sẵn set váy Khánh Trang chị nha. Mẫu này shop có cả set lẫn bán lẻ áo và chân váy ạ:

- Set váy nguyên bộ: 999.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 499.000đ
```

**USABLE** — Tìm đúng Khánh Trang, báo rõ999k cả set và499k mỗi phần; không lẫn scope của giá.

## b1-1 — ca 15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo này rất hợp để đi ăn cưới ban ngày vì form nhẹ, chất tơ và ren có độ bay rũ tự nhiên, mang lại nét nhã nhặn và sang trọng ạ. 

Tuy nhiên, nếu chị quen mặc đồ trơn và sợ cả bộ ren thêu hơi điệu, em gợi ý chị có thể lấy riêng chiếc áo thêu (499.000đ) phối cùng quần hoặc chân váy trơn tối giản sẵn có trong tủ. Cách này vừa giữ được điểm nhấn tinh tế, vừa đúng với phong cách thường ngày mà vẫn rất lịch sự để đi tiệc. Chị lấy thử áo thêu mặc trước nhé ạ!
```

**USABLE** — Đề xuất áo lẻ499k phối đồ trơn có sẵn để giảm độ điệu; một lựa chọn chính và cách mặc gắn với băn khoăn. Không còn ba lựa chọn rồi để khách tự cân nhắc.

## b1-1 — ca 16 — b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm chưa qua sử dụng và chỉ áp dụng ướm bên ngoài chứ không mặc vào người ạ. Vì chị đã mặc thử vào người nên shop rất tiếc không thể hỗ trợ đổi size cho trường hợp này được ạ.
```

**USABLE** — Phân biệt mặc thử vào người với ướm bên ngoài theo policy hiện hành, không cấp quyền đổi vì còn tem/chưa ra ngoài.

## b1-1 — ca 17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Gặp khách hàng buổi sáng thì lấy cả bộ vẫn là lựa chọn đẹp và lịch sự lắm chị ạ. Set Thạch Thảo có form nhẹ, chất tơ và ren mềm với độ bay và rũ tự nhiên nên tổng thể rất nhã nhặn, gọn gàng chứ không bị rườm rà, vừa đủ độ chỉn chu để gặp đối tác. 

Nếu chị thích tối giản hoàn toàn thì có thể lấy áo lẻ phối cùng đồ gọn gàng sẵn có trong tủ, nhưng shop vẫn nghiêng về lấy cả bộ để giữ trọn sự đồng bộ và nét thanh lịch tinh tế của thiết kế.
```

**USABLE** — Chọn cả bộ, có lý do đồng bộ/lịch sự khi gặp khách và nêu áo lẻ cho tradeoff tối giản. Không mặc định phải khuyên áo lẻ; lý do còn chung nhưng đã có lập trường.

## b1-1 — ca 18 — b1-current-policy-v3

customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ quy định hiện tại bên em hỗ trợ đổi hàng trong vòng 15 ngày kể từ khi nhận hàng nên nhận hàng 9 ngày thì chị vẫn đổi size được bình thường nha chị. Phí vận chuyển đổi hàng 2 chiều là 30.000đ ạ.
```

**USABLE** — Dùng policy15ngày hiện hành cho nhận9ngày mới mở xem, không quay lại thông tin7ngày trong history. Phí30k đúng.

## b1-1 — ca 19 — b1-partial-source-v3

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, áo của set Thạch Thảo làm từ chất liệu tơ Hàn thêu mềm mại, thoáng mát với họa tiết thêu nổi và độ bay tự nhiên, còn chân váy là ren tơ Hàn mềm có độ rũ nhẹ nhàng, bay bổng ạ. 

Hiện tại hệ thống bên em chưa có sẵn thông tin giá và tình trạng còn hàng của set này, chị tham khảo chất liệu giúp em nhé ạ!
```

**USABLE** — Trả chất liệu từng phần, không bịa giá/tồn khi nguồn cố ý thiếu. Không coi việc không bán hoàn tất trong fault-mode là lỗi model.

## b1-1 — ca 20 — b1-price-v3

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, nguyên set Thạch Thảo có giá 799.000đ chị nha.
```

**USABLE** — Báo799k nguyên set, một câu đúng trọng tâm.

## b1-1 — ca 21 — b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, áo Thạch Thảo bên em có bán lẻ chị nha. Áo size M hiện còn sẵn hàng, giá áo là 499.000đ ạ!
```

**USABLE** — Đủ bán lẻ/cònM/499k và dừng, không mời giỏ ngoài khả năng B1. Sửa được biểu hiện lỗi ở mẫu này.

## b1-1 — ca 22 — b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, mẫu Set quần Xuân Thảo (SQ223) bên em vẫn còn hàng chị nha. Giá chi tiết từng phân loại ạ:

- Áo lẻ: 429.000đ
- Quần lẻ: 429.000đ
- Cả bộ set: 699.000đ
```

**USABLE** — Tìm đúng SQ223 Xuân Thảo, báo tồn và phân biệt giá429k từng phần/699k cả bộ. Không trộn giá áo vào giá set.

## b1-1 — ca 23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Theo em chị nên lấy riêng áo Thạch Thảo (499.000đ) ạ. Vì chị đã có sẵn chân váy đen dáng suông, chiếc áo tơ Hàn thêu mềm mại, form nhẹ này sẽ rất dễ phối cùng để mặc đi làm hay đi chơi linh hoạt, đúng với tiêu chí mặc lại nhiều lần của chị. 

Ngoài ra, nếu chị thích diện nguyên set điệu đà, thướt tha thì bộ nguyên set (799.000đ) cũng vừa vặn trong ngân sách 850 nghìn, nhưng mua riêng áo sẽ giúp chị tận dụng tối đa đồ sẵn có trong tủ hơn rất nhiều.
```

**USABLE** — Chọn áo499k để phối chân váy đen khách có và mặc lại nhiều lần; bộ799k là lựa chọn phụ trong ngân sách, không làm mất lựa chọn chính.

## b1-1 — ca 24 — b1-policy-used-v3

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng bên em yêu cầu sản phẩm phải còn nguyên tem và chưa qua giặt ạ. Do sản phẩm của chị đã cắt tem và giặt rồi nên em tiếc quá không hỗ trợ đổi sang mẫu khác được, chị thông cảm giúp em nhé ạ.
```

**USABLE** — Từ chối đổi đúng vì đã cắt tem/giặt, không đồng ý trước rồi đọc điều kiện.
