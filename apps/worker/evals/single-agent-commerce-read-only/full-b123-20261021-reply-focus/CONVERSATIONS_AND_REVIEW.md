# Toàn bộ 32 hội thoại và đánh giá

## stateful-1 — ca 1 — stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!
```

**USABLE** — Thêm đúng áo beM×1 và báo đặt trước ngay; không đọc số đo hoặc tự tư vấn fit.

## stateful-1 — ca 2 — stateful-variant-quantity

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.
```

**USABLE** — Giỏ thànhbeL×2, reply xác nhận hai áo gọn hơn bản cập nhật số lượng trước. Có receipt, không tự đổi màu.

## stateful-1 — ca 3 — stateful-quote

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.

Khách: Hai áo cả phí ship là bao nhiêu em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ 2 áo Thạch Thảo size L của mình tổng cộng là 978.100đ (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi) chị nhé!
```

**USABLE** — Tổng978100đ gồmship30000 vàgiảm49900 khớp quote. Ngoặc dùng cho phân tích số tiền có ích, không tự lỗi vì có ngoặc; không gắn giảm vào ship như cách trình bày cũ.

## stateful-1 — ca 4 — stateful-correction

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ 2 áo Thạch Thảo size L của mình tổng cộng là 978.100đ (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi) chị nhé!

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ vâng chị nhé!
```

**USABLE** — Dạ vâng chị nhé đáp nhận lời ngắn; state thật sửa eo74/mông96 và giữbeL×2. Không đọc lại hồ sơ hay báo cáo cập nhật, không cần lặp lựa chọn khi không đổi.

## stateful-1 — ca 5 — stateful-request-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ 2 áo Thạch Thảo size L của mình tổng cộng là 978.100đ (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi) chị nhé!

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng chị nhé!

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Kết quả actual: NO_SEND / CHECKOUT_DETAILS_MISSING

```text
Chị gửi thêm [NAME]
```

**USABLE** — Code tạo invitation xin thông tin nhận, NO_SEND của model không phải khách không nhận tin. Capture bị redactor thành [NAME], không chấm đoạn đã redacted như nguyên câu bot gửi.

## stateful-1 — ca 6 — stateful-private-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ 2 áo Thạch Thảo size L của mình tổng cộng là 978.100đ (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi) chị nhé!

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng chị nhé!

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

**USABLE** — Code-only private intake tạo previewCOD đúngbeL×2,tổng978100,đặttrước/ETA8–14; không model generation trong private turn, chưa tạo đơnPOS.

## stateful-1 — ca 7 — stateful-confirm

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ 2 áo Thạch Thảo size L của mình tổng cộng là 978.100đ (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi) chị nhé!

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ vâng chị nhé!

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

**USABLE** — Xác nhận mua đi cùng tin chuyển nhân viên kiểm tra/lên đơn. Futurestaffprocess phù hợp luồng được owner chấp nhận, không claimbot tạoPOSorder.

## stateful-1 — ca 8 — stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Kết quả actual: HANDOFF / CUSTOMER_REQUESTED_HUMAN

```text
[Không gửi thêm tin — ownership control]
```

**OWNERSHIP_CONTROL** — Khách xin người thật chuyểnHUMAN và không thêm tin theo control, không phải câu tư vấn bị thiếu hoặc fallback.

## b1-1 — ca 1 — b1-changed-occasion

customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.

shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, đi ô tô gần 3 tiếng thì các dòng chất liệu tơ mỏng như set Thạch Thảo sẽ dễ bị hằn nếp gấp khi ngồi lâu đó chị.

Nếu chị muốn tìm mẫu đỡ nhăn và giữ form tốt hơn cho chuyến đi dài, em đổi sang **váy Diệp An** giúp chị nhé. Mẫu này có thiết kế 2 lớp đứng form cùng chất tơ hoa thêu tinh tế, mặc đi đám cưới vừa sang trọng, thanh lịch lại ít bị nhăn nếp hơn khi ngồi xe.
```

**USABLE** — Xét lại việc ngồi xe ba giờ và tìm váy Diệp An làm phương án thay, có lý do theo form/chất liệu. Giọng còn dài, dùng nếu/giúp chị và chuỗi lời khen. Nhận xét ít nhăn từ giữ form thuộc vùng inference owner đã chấp nhận; mức khẳng định cụ thể cần đối chiếu nguồn sau primary, không tự yêu cầu phép thử cho mọi lời khuyên.

## b1-1 — ca 2 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, đơn nhận 10 hôm là vẫn trong thời hạn 15 ngày đổi hàng của shop mình chị nha. Phí đổi (vận chuyển hai chiều) là 30.000đ ạ.
```

**USABLE** — Trả đúng thời hạn15ngày và phí hai chiều30k hiện tại, vượt thông tin7ngày cũ. Phạm vi câu trả lời là còn trong thời hạn, không cần đọc lại mọi điều kiện khi khách chỉ cầm ngắm/còn tem.

## b1-1 — ca 3 — b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo có áo làm từ tơ Hàn thêu với họa tiết thêu nổi, vải mềm mại, thoáng và có độ bay tự nhiên; chân váy bằng ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nha.

Hiện tại phần giá và tình trạng còn hàng size M thì em chưa tra được ạ.
```

**USABLE** — Trả vải áo/váy và giữ unknown giá/tồn sizeM trong POS_UNAVAILABLE. Còn nhiều mô tả nhưng khách hỏi chất liệu, không bịa giá hoặc hứa theo dõi.

## b1-1 — ca 4 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo có giá cụ thể cho từng lựa chọn như sau ạ:

- Cả bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ

Chị muốn lấy cả bộ hay mua lẻ món nào ạ?
```

**NEEDS_EDIT** — Vẫn mở cả bảng giá bộ/áo/váy rồi hỏi chọn lại dù khách hỏi giá set cụ thể. Thay hướng dẫn chưa sửa được lỗi scope này; không đánh lỗi vì bullet list tự thân.

## b1-1 — ca 5 — b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, áo của set Thạch Thảo size M hiện vẫn còn hàng, áo bán lẻ có giá 499.000đ chị nha.
```

**USABLE** — Trả áo sizeM còn và499k đúng phạm vi, gọn; lượt này không fallback như lỗi stream vòng trước. Một lượt không chứng minh đã sửa provider reliability.

## b1-1 — ca 6 — b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, áo dài mã SD375 có giá 929.000đ cho áo lẻ và 1.065.000đ cho cả bộ chị nhé.
```

**USABLE** — Tìm đúng SD375 và trả929káo/1065kbộ rõ, không lẫn ref hay tự đặt giá. Hai lựa chọn hữu ích khi khách gọi áo dài chưa nói mua bộ.

## b1-1 — ca 7 — b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ bộ này nguyên set có giá 799.000đ, vừa vặn trong ngân sách 900k của mình luôn chị nhé!

Chị yên tâm là chất ren tơ Hàn của chân váy rất mềm, có độ rũ và bay tự nhiên, kết hợp cùng áo tơ thêu form nhẹ nhàng nên tổng thể rất thanh thoát, sang trọng chứ không hề bị nặng nề hay rườm rà đâu ạ. Mặc đi tiệc ban ngày rất tinh tế và lịch sự luôn chị nhé.
```

**USABLE** — Khuyên giữ bộ đi tiệc ban ngày, lý do thẩm mỹ từ ren mềm/form nhẹ và799k trong900k. Dài và khen dồn; ghi polish giống rubric trước, không fail nhận xét rườm rà mang tính thẩm mỹ hay bắt chọn áo lẻ.

## b1-1 — ca 8 — b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm chưa qua sử dụng. Do chị đã mặc bộ này đi làm rồi nên shop rất tiếc không hỗ trợ đổi sang màu khác được ạ. Mong chị thông cảm cho shop nhé!
```

**USABLE** — Từ chối thẳng vì đã mặc đi làm, đúng tình huống. Vì đơn này không được đổi, không cần mở hướng xử lý phí của một lần đổi không thực hiện được; không nói khách được đổi hay đã handoff.

## b1-1 — ca 9 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Chất tơ Hàn và ren tơ Hàn của set này mềm, form nhẹ và có độ thoáng tự nhiên nên không bị dày hay nặng người đâu chị ạ. Tuy nhiên ở ngoài trời lâu và dễ nóng, chị lưu ý phần áo có thêu nổi nha.
```

**NEEDS_EDIT** — Đã bỏ bảo đảm không bí, nhưng thay bằng lưu ý áo có thêu nổi mà không nói điều đó ảnh hưởng gì hoặc nên giữ/đổi/cách mặc nào cho việc ở ngoài trời lâu và dễ nóng. Không giúp ra quyết định dù câu có thông tin chất liệu; không fail chỉ vì không đổi sản phẩm.

## b1-1 — ca 10 — b1-current-policy-v2

customer: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, đơn nhận 12 hôm là mình vẫn trong thời hạn 15 ngày đổi hàng chị nhé. Đồ của mình chưa dùng là đổi size được ạ. Phí ship đổi 2 chiều hiện là 30.000đ chị nha.
```

**USABLE** — Trả15ngày và30k hiện tại thay25k cũ, hiểu khách chưa dùng. Câu đồ chưa dùng là đổi size được có thể nghe rộng hơn kết luận về thời hạn; cần đối chiếu scope toàn đoạn/policy sau primary, không tự chấm sai chỉ vì thiếu danh sách điều kiện.

## b1-1 — ca 11 — b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, chân váy Thạch Thảo được làm từ chất liệu ren tơ Hàn mềm, form nhẹ, có độ rũ tự nhiên rất bay bổng và nữ tính ạ.

Hiện tại em chưa có thông tin giá cũng như tình trạng bán riêng chân váy size M này nên chưa báo chính xác cho chị được, chị thông cảm giúp em nhé ạ!
```

**USABLE** — Trả vải/dáng chân váy đúng phần có nguồn; nói chưa biết giá/khả năng bán riêng trong nguồn lỗi, không biến unknown thành không bán lẻ. Giọng xin lỗi/dài còn polish, source fault là giới hạn riêng.

## b1-1 — ca 12 — b1-price-v2

customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo cả bộ có giá 799.000đ chị nha.
```

**USABLE** — Báo799kcả bộ gọn, hiểu referent từ history, không kéo sang lựa chọn khác.

## b1-1 — ca 13 — b1-component-stock-v2

customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ chân váy Thạch Thảo size M bên em còn hàng chị nhé, mua riêng chân váy có giá 449.000đ ạ.
```

**USABLE** — Báo chân váyM còn449k, không kéo về set hoặc suy độ vừa.

## b1-1 — ca 14 — b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ shop có chị nhé! Set váy Khánh Trang có giá 999.000đ ạ. Ngoài ra shop có bán lẻ áo hoặc chân váy (mỗi món 499.000đ) nếu chị muốn mua rời ạ.
```

**USABLE** — Tìm đúng Khánh Trang, giá999kset/499kmỗi món rõ. Thêm giá lẻ chưa cần nhưng ngắn và không hỏi chọn lại; polish chứ không tự fail thêm thông tin.

## b1-1 — ca 15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, nếu bình thường chị hay mặc đồ trơn và sợ set này hơi điệu thì em chia sẻ thật là set Thạch Thảo lên form khá nhẹ nhàng, chất tơ và ren mềm có độ bay và rũ tự nhiên nên tạo cảm giác thanh thoát, sang trọng chứ không bị phồng hay rườm rà quá mức đâu ạ.

Đi ăn cưới ban ngày thì mặc set này rất hợp, vừa nhã nhặn, tươi tắn lại lịch sự. Còn nếu chị vẫn muốn tiết chế bớt cho đúng với phong cách quen thuộc của mình, mình có thể chọn mua lẻ áo thêu phối cùng quần hoặc chân váy trơn sẵn có ở nhà, hoặc lấy chân váy ren phối với áo trơn đơn giản.

Shop có đủ lựa chọn cả bộ (799k), áo lẻ (499k) và chân váy lẻ (449k), chị cứ cân nhắc xem phương án nào thoải mái và đúng ý mình nhất nhé ạ!
```

**NEEDS_EDIT** — Đọc lại gu đồ trơn bằng câu nếu dài, khen nhiều; đưa cả bộ/áo/váy rồi bảo chị tự cân nhắc. Dù có hướng phối đồ trơn, shop chưa đứng vào một lựa chọn để trả câu có nên lấy không. Lỗi quyết định/giọng lặp lại, không phải thiếu keyword.

## b1-1 — ca 16 — b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng bên em yêu cầu sản phẩm phải hoàn toàn chưa qua sử dụng và chỉ ướm bên ngoài chứ không mặc vào người. Vì chị đã mặc thử nên trường hợp này shop không hỗ trợ đổi size được ạ, mong chị thông cảm giúp em nhé!
```

**USABLE** — Từ chối vì khách đã mặc thử vào người dù trong phòng/còn tem, phân biệt đúng chỉướm với mặcthử; giọng dịch vụ hơi dài nhưng đáp đúng nhu cầu.

## b1-1 — ca 17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Đi gặp khách hàng buổi sáng cần vẻ ngoài gọn gàng và chỉn chu, chị lấy áo thêu (499.000đ) phối cùng quần âu hoặc chân váy dáng ôm sẵn có sẽ sắc nét và lịch sự hơn ạ. Chân váy ren của set có độ rũ và bay tự nhiên, hợp với không gian tiệc tối hơn. Chị lấy áo thêu mặc đi gặp khách là hợp lý nhất chị nhé.
```

**USABLE** — Đổi sang áo499k với quần hoặc váy trơn để gọn hơn khi gặp khách sáng; có lý do so thiết kế với dịp mới. Không lặp so giá799k rẻ hơn499k. Gợi cách phối là giả định dùng được, chưa khẳng định khách đã có một món cụ thể.

## b1-1 — ca 18 — b1-current-policy-v3

customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, bên em hiện áp dụng thời gian đổi hàng trong vòng 15 ngày kể từ ngày nhận nên chị nhận hàng được 9 ngày thì vẫn được hỗ trợ đổi size bình thường chị nhé!
```

**USABLE** — Dùng15ngày hiện tại và hiểu chỉ mở xem/cất, không dùng7ngày cũ hoặc tự báo đã thực hiện đổi; không ép đọc lại điều kiện đã không có dấu hiệu vi phạm.

## b1-1 — ca 19 — b1-partial-source-v3

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, áo của set Thạch Thảo được làm từ chất tơ Hàn thêu với họa tiết thêu nổi, vải mềm, thoáng và có độ bay tự nhiên; còn chân váy là chất ren tơ Hàn mềm form nhẹ, có độ rũ tự nhiên ạ.

Về giá và tình trạng còn hàng của set thì hiện tại hệ thống bên em chưa có sẵn thông tin để báo chính xác cho chị nha.
```

**USABLE** — Trả chất liệu áo/váy và giữ giá/tồn chưa biết trong faultmode. Cụm hệ thống chưa có sẵn thông tin còn giọng phần mềm, cần polish; không biến source thiếu thành lỗi bịa của model.

## b1-1 — ca 20 — b1-price-v3

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Nguyên set Thạch Thảo có giá 799.000đ chị nhé.
```

**USABLE** — Một câu đúng799k nguyên set, tự nhiên và đúng trọng tâm.

## b1-1 — ca 21 — b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ áo Thạch Thảo bên em có bán riêng chị nhé. Áo size M hiện vẫn còn hàng, giá 499.000đ ạ. Chị có muốn em thêm áo này vào giỏ hàng cho mình luôn không ạ?
```

**NEEDS_EDIT** — Giá499k/tồnM/bán riêng đúng; vẫn mời thêm giỏ dù B1 không có add_to_cart. Câu có thể tự nhiên trong bán hàng, nhưng bước hứa chưa làm được. Lỗi capability cũ đổi từ lênđơn sang thêmgiỏ, không phải đã tự thực hiện effect.

## b1-1 — ca 22 — b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, mẫu Set quần Xuân Thảo (SQ223) nhà em vẫn còn hàng chị nhé!

Sản phẩm hiện có đủ các size từ S đến XL với các lựa chọn:
- Nguyên bộ: 699.000đ
- Áo lẻ: 429.000đ
- Quần lẻ: 429.000đ

Chị muốn lấy nguyên bộ hay mua lẻ món nào và cần em tư vấn size nào thì báo em nhé ạ!
```

**USABLE** — Tìm đúng SQ223, báo còn và699kset/429kmỗi món; gợi chọn scope/size còn dài nhưng khách chưa nói mua phần nào nên không mở lại lựa chọn đã chốt như ca4. Không khẳng định mặc vừa.

## b1-1 — ca 23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Chị lấy cả bộ (799.000đ) sẽ hợp lý hơn ạ, vẫn nằm trong ngân sách 850 nghìn của chị mà lại linh hoạt hơn rất nhiều.

Áo tơ Hàn thêu form nhẹ của set khi kết hợp với chân váy đen dáng suông sẵn có sẽ thành đồ đi làm thanh lịch, còn khi diện nguyên set váy ren tơ mềm mại thì rất hợp đi chơi hay dự tiệc. Mua cả bộ giúp chị vừa có thêm chân váy ren để phối đồ, vừa đổi được nhiều kiểu khác nhau cho các dịp đấy ạ.
```

**USABLE** — Chọn bộ799k trong850k, giải thích mặc nguyên bộ đi tiệc và tách áo với váy đen để dùng lại. Upsell hợp lý, không bắt mua rẻ. Vẫn có đọc lại budget và nhiều lời khen nhưng tư vấn giúp quyết định.

## b1-1 — ca 24 — b1-policy-used-v3

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt ạ. Do sản phẩm của chị đã cắt tem và giặt rồi nên shop không hỗ trợ đổi sang mẫu khác được, chị thông cảm giúp em nhé!
```

**USABLE** — Từ chối vì cắt tem và giặt, đúng vấn đề hiện tại, không mở đầu đồng ý hay đọc toàn bộ policy.
