# Full B1/B2/B3 — toàn32outcomes, lượt20261020-r2

Source `79bda1692667846e0a543a404812ab1daead35c7`. Thu đủ24B1+8stateful, mỗi ca1lần, không dừng vì kết quả chất lượng. Hai nhánh DB28/28mỗi nhánh. Gemini3.5FlashLite HIGH + GPT6.1Sol high.

Review agent toàn actual/history/state/source, không human owner adjudication, không keyword scoring. Primary đã khóa trước rejected-draft/verifier diagnosis. Whitespace cuối dòng chỉ chuẩn hóa ở bản hiển thị này; PRIMARY/raw giữ nguyên.

B1 SEND_ELIGIBLE chưa gửi cho khách thật. Stateful messages đi qua capture transport; private intake/preview là code-owned, các placeholder[NAME]/[PHONE]/[ADDRESS] là public-artifact redaction, không tự coi là câu model đã gửi. Không live send/POS order write.

## B2/B3–1 — stateful-open — USABLE

Khách:
> Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual customer outcome:

```text
Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!
```

Terminal: SEND_ELIGIBLE / PASS; stage: CART_OPEN.

Thêm đúng áo be M, một chiếc vào giỏ và báo đặt trước. ACK tương ứng state/price, không tự chốt fit từ eo/mông.

Readback: tổng 529000; số đo WAIST_CM=76, HIPS_CM=98.

## B2/B3–2 — stateful-variant-quantity — USABLE

Lịch sử trước lượt này:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

Khách:
> Đổi áo sang L cho chị, lấy hai chiếc nhé.

Actual customer outcome:

```text
Dạ, em đã đổi áo sang size L và giữ 2 chiếc trong giỏ cho chị rồi ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: CART_OPEN.

Đổi đúng L và hai chiếc, giữ màu be. Câu xác nhận ngắn; giữ trong giỏ không phải đã giữ tồn kho hay tạo đơn.

Readback: tổng 978100; số đo WAIST_CM=76, HIPS_CM=98.

## B2/B3–3 — stateful-quote — USABLE

Lịch sử trước lượt này:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi áo sang size L và giữ 2 chiếc trong giỏ cho chị rồi ạ.

Khách:
> Hai áo cả phí ship là bao nhiêu em?

Actual customer outcome:

```text
Dạ, 2 áo màu be size L của chị tổng cộng là 978.100đ ạ (đã gồm 30.000đ phí ship và được giảm 49.900đ).
```

Terminal: SEND_ELIGIBLE / PASS; stage: CART_OPEN.

Trả đúng978.100đ gồm ship30k và giảm49,9k. Ngoặc ở đây giải thích tổng tiền khách đang hỏi, không coi mọi ngoặc hoặc lặp biến thể là lỗi.

Readback: tổng 978100; số đo WAIST_CM=76, HIPS_CM=98.

## B2/B3–4 — stateful-correction — NEEDS_EDIT

Lịch sử trước lượt này:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi áo sang size L và giữ 2 chiếc trong giỏ cho chị rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 áo màu be size L của chị tổng cộng là 978.100đ ạ (đã gồm 30.000đ phí ship và được giảm 49.900đ).

Khách:
> Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Actual customer outcome:

```text
Dạ vâng, em đã cập nhật số đo mới và giữ nguyên 2 áo size L cho chị rồi ạ!
```

Terminal: SEND_ELIGIBLE / PASS; stage: CART_OPEN.

Đã sửa đúng74/96 và giữ L, không suy L vừa người. Nhưng cách nói đã cập nhật số đo mới và giữ nguyên nghe như thông báo quản lý dữ liệu; giọng còn cứng theo finding owner đã nêu. Lỗi giọng, không phải ghi state hay trích số đo sai.

Readback: tổng 978100; số đo WAIST_CM=74, HIPS_CM=96.

## B2/B3–5 — stateful-request-checkout — USABLE

Lịch sử trước lượt này:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi áo sang size L và giữ 2 chiếc trong giỏ cho chị rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 áo màu be size L của chị tổng cộng là 978.100đ ạ (đã gồm 30.000đ phí ship và được giảm 49.900đ).
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ vâng, em đã cập nhật số đo mới và giữ nguyên 2 áo size L cho chị rồi ạ!

Khách:
> Chị đặt hai áo này nhé, lên đơn cho chị.

Actual customer outcome:

```text
Chị gửi thêm [NAME]
```

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING; stage: CART_OPEN.

Có actual code-owned invitation trước private intake; public artifact đã redacted nhãn thành[NAME], không kết luận bot gửi placeholder. Không tự gọi NO_SEND model terminal là khách không nhận gì.

Readback: tổng 978100; số đo WAIST_CM=74, HIPS_CM=96.

## B2/B3–6 — stateful-private-checkout — USABLE

Lịch sử trước lượt này:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi áo sang size L và giữ 2 chiếc trong giỏ cho chị rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 áo màu be size L của chị tổng cộng là 978.100đ ạ (đã gồm 30.000đ phí ship và được giảm 49.900đ).
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ vâng, em đã cập nhật số đo mới và giữ nguyên 2 áo size L cho chị rồi ạ!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]

Khách:
> [Thông tin checkout riêng tư được xử lý trong code]

Actual customer outcome:

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

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED; stage: ORDER_PREVIEW.

Private checkout tạo preview đúng2áo beL, tổng978.100đ, đặt trước và ETA dự kiến8–14ngày; có người nhận/phương thức và yêu cầu xác nhận. Đây là reply code-owned, không model đã nhìn dữ liệu riêng tư.

Readback: tổng 978100; số đo WAIST_CM=74, HIPS_CM=96.

## B2/B3–7 — stateful-confirm — USABLE

Lịch sử trước lượt này:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ, em đã đổi áo sang size L và giữ 2 chiếc trong giỏ cho chị rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 áo màu be size L của chị tổng cộng là 978.100đ ạ (đã gồm 30.000đ phí ship và được giảm 49.900đ).
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ vâng, em đã cập nhật số đo mới và giữ nguyên 2 áo size L cho chị rồi ạ!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]
- customer: [Thông tin checkout riêng tư được xử lý trong code]
- shop: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L: 998.000đ
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

Khách:
> Chốt đơn cho chị nhé.

Actual customer outcome:

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```

Terminal: HANDOFF / PURCHASE_CONFIRMED; stage: PURCHASE_CONFIRMED.

Confirm hiện tại chuyển PURCHASE_CONFIRMED và báo chuyển nhân viên kiểm tra/lên đơn. Đúng quy trình owner chấp nhận, không báo đã tạo đơn POS thật.

Readback: tổng 978100; số đo WAIST_CM=74, HIPS_CM=96.

## B2/B3–8 — stateful-human-request — OWNERSHIP_CONTROL

Khách:
> Cho chị gặp nhân viên shop nhé.

Actual customer outcome:

```text
[Không có tin nhắn khách nhận được capture]
```

Terminal: HANDOFF / CUSTOMER_REQUESTED_HUMAN; stage: DISCOVERY.

Đã chuyển quyền khi khách yêu cầu nhân viên; không có customer ACK trong capture. Ghi nhận giới hạn trải nghiệm, không bịa câu đã gửi hoặc chấm văn phong cho reply không tồn tại.

Readback: tổng None; số đo .

## B1–1 — b1-changed-occasion — USABLE

Lịch sử trước lượt này:

- customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
- shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách:
> Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Actual customer outcome:

```text
Dạ, set Thạch Thảo dùng chất liệu tơ và ren mềm bay bổng nên khi ngồi ô tô gần 3 tiếng sẽ dễ bị hằn nếp nhăn ở phần váy chị nha.

Đi xe đường dài, em gợi ý chị chuyển sang váy Ngọc Trâm nhé. Mẫu này thiết kế váy yếm 2 lớp tơ ống đứng form rất đẹp, ít bị nhăn khi ngồi lâu mà mặc lên vẫn sang trọng, thướt tha rất hợp đi đám cưới ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Đổi đề xuất theo việc đi xe lâu, chọn váy Ngọc Trâm và nêu lý do từ material/form2lớp đã đọc. Giữ phạm vi inference ít nhăn từ chất liệu/giữ form owner đã chấp nhận; không đòi phép thử riêng chỉ vì lời khuyên so sánh. Câu nhiều tính từ nhưng có quyết định hữu ích.

## B1–2 — b1-current-policy — USABLE

Lịch sử trước lượt này:

- customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách:
> Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Actual customer outcome:

```text
Dạ mình đổi màu vẫn kịp chị nhé, thời hạn đổi hàng bên em là trong vòng 15 ngày kể từ ngày nhận ạ. Phí vận chuyển 2 chiều cho đơn đổi là 30.000đ chị nha.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Dùng policy hiện hành15ngày thay lịch sử7ngày, đối chiếu nhận10ngày/chỉ cầm ngắm và trả phí30k. Không ép nhắc toàn checklist.

## B1–3 — b1-partial-source — NEEDS_EDIT

Khách:
> Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Actual customer outcome:

```text
Dạ, set Thạch Thảo được may bằng chất liệu tơ Hàn thêu cho áo (mềm, thoáng, có độ bay tự nhiên và họa tiết thêu nổi) kết hợp cùng chân váy ren tơ Hàn mềm mại, có độ rũ tự nhiên rất thướt tha ạ.

Về giá và tình trạng còn hàng size M, hiện tại hệ thống bên em chưa cập nhật được dữ liệu này nên em chưa báo chính xác cho chị ngay được ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Trả được chất vải nhưng dồn mô tả và ngoặc, rồi viện hệ thống chưa cập nhật. Trong source-fault case, thiếu giá/tồn là đầu vào có chủ đích; finding là cách nói với khách và trọng tâm, không quy mọi unknown thành model bịa.

## B1–4 — b1-price — USABLE

Khách:
> Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Actual customer outcome:

```text
Dạ, set Thạch Thảo (mã SV2447) shop có các lựa chọn và mức giá cụ thể như sau ạ:

- Cả bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Giá cả bộ và hai phần chính xác, ba dòng dễ hiểu. Có thể dẫn cả bộ trước thay phần mở dài; không chấm hỏng chỉ vì dùng danh sách khi so lựa chọn giá.

## B1–5 — b1-component-stock — USABLE

Khách:
> Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Actual customer outcome:

```text
Dạ, áo của bộ Thạch Thảo size M hiện còn hàng chị nhé. Áo bán riêng có giá 499.000đ ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Trả đúng áoM còn và giá499k, ngắn. Chưa có quyết định fit hay effect.

## B1–6 — b1-search-read — USABLE

Khách:
> Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual customer outcome:

```text
Dạ, áo dài SD375 có giá tùy theo lựa chọn của mình chị nhé:

- Mua áo lẻ: 929.000đ
- Mua cả bộ: 1.065.000đ
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Tìm đúngSD375 và trả giááolẻ929k/cảbộ1.065k. Hai lựa chọn liên quan trực tiếp câu hỏi giá.

## B1–7 — b1-buying-concern — NEEDS_EDIT

Khách:
> Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual customer outcome:

```text
Dạ bộ này mặc đi tiệc ban ngày rất hợp và sang trọng, không bị rườm rà đâu chị ạ! Chân váy dùng chất ren tơ Hàn mềm, form nhẹ cùng độ rũ tự nhiên kết hợp với áo tơ thêu nổi thanh nhã, tạo cảm giác bay bổng và rất nhẹ nhàng.

Cả bộ Set váy Thạch Thảo có giá 799.000đ, hoàn toàn nằm trong ngân sách 900.000đ của mình luôn chị nhé. Chị có muốn em kiểm tra size phù hợp cho mình không ạ?
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Trấn an ren không rườm rà nhưng phần thuyết phục thành chuỗi tính từ, đọc lại ngân sách và xin phép kiểm size chung chung. Cần bám lo ren và dẫn bước chọn size rõ hơn; không phải thiếu keyword hay sai giá.

## B1–8 — b1-policy-used — USABLE

Khách:
> Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Actual customer outcome:

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên vẹn, chưa qua sử dụng và chưa mặc ra ngoài ạ. Do mình đã mặc đi làm rồi nên shop rất tiếc không hỗ trợ đổi sang màu khác được cho mình chị nha.

Nếu là các đơn đổi hàng hợp lệ, chi phí vận chuyển 2 chiều là 30.000đ do khách hàng chi trả ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Từ chối đúng trường hợp đã mặc đi làm rồi; phí chỉ được nêu cho đơn đổi hợp lệ, không biến thành quyền được đổi của khách này.

## B1–9 — b1-changed-occasion-v2 — NEEDS_EDIT

Lịch sử trước lượt này:

- customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.
- shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách:
> Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Actual customer outcome:

```text
Dạ áo dùng chất liệu tơ Hàn mềm, thoáng cùng chân váy ren tơ Hàn mềm, form nhẹ và có độ bay tự nhiên nên mặc rất nhẹ nhàng, thoải mái, không sợ bị bí nóng khi ở ngoài trời lâu đâu chị nha.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Khách dễ nóng và phải ở ngoài trời lâu, reply trấn an không sợ bí nóng khi ở ngoài trời lâu từ mô tả mềm/thoáng. Cần sửa độ mạnh của lời thuyết phục; ghi riêng ranh giới comfort theo material so với đảm bảo hoàn cảnh sử dụng. Chưa kết luận unsafe falsePASS hay tự siết verifier vì đây là vùng inference owner từng cho phép rộng.

## B1–10 — b1-current-policy-v2 — USABLE

Lịch sử trước lượt này:

- customer: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách:
> Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Actual customer outcome:

```text
Dạ mình vẫn đổi size kịp chị nhé, thời gian hỗ trợ đổi hàng là trong vòng 15 ngày kể từ khi nhận ạ. Phí ship đổi 2 chiều là 30.000đ chị nha.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Đối chiếu12ngày/chưa dùng với15ngày và sửa phí cũ25k thành30k, ngắn gọn.

## B1–11 — b1-partial-source-v2 — NEEDS_EDIT

Khách:
> Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual customer outcome:

```text
Dạ, chân váy Thạch Thảo làm bằng chất liệu ren tơ Hàn mềm, có form nhẹ và độ rũ tự nhiên rất đẹp chị nha.

Hiện chân váy bên em chưa có thông tin bán lẻ riêng nên em chưa kiểm tra được giá và tình trạng size M ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Chất/dáng trả đúng phần đã có, nhưng chưa có thông tin bán lẻ riêng dễ khiến khách hiểu shop không bán riêng; thực tế đây là unknown do source fault. Cần nói rõ đang chưa kiểm được giá/tồn, tránh diễn đạt như thiếu lựa chọn kinh doanh.

## B1–12 — b1-price-v2 — USABLE

Lịch sử trước lượt này:

- customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách:
> Cho chị xin giá cả bộ với em.

Actual customer outcome:

```text
Dạ, set váy Thạch Thảo cả bộ có giá 799.000đ chị nhé.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Dùng đúng tham chiếu Thạch Thảo từ history, trả cả bộ799k trực tiếp.

## B1–13 — b1-component-stock-v2 — USABLE

Lịch sử trước lượt này:

- customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách:
> Chân váy size M còn không em, mua riêng là bao nhiêu?

Actual customer outcome:

```text
Dạ chân váy Thạch Thảo size M bên em còn hàng chị nhé, giá mua riêng là 449.000đ ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Đúng chân váyM còn và giá449k; không trả nhầm giá áo/cả bộ.

## B1–14 — b1-search-read-v2 — USABLE

Khách:
> Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Actual customer outcome:

```text
Dạ, shop có set váy Khánh Trang chị nhé. Set váy có giá 999.000đ ạ. Ngoài ra shop cũng có bán lẻ áo hoặc chân váy với giá 499.000đ mỗi món nếu mình muốn mua rời nha chị.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Tìm đúng Khánh Trang, trả có mẫu/giáset999k cùng giá mua rời theo source. Không tự tạo ưu đãi từ các giá này.

## B1–15 — b1-buying-concern-v2 — NEEDS_EDIT

Khách:
> Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual customer outcome:

```text
Dạ set Thạch Thảo này rất hợp để đi ăn cưới ban ngày đấy chị ạ. Dù là chất liệu tơ thêu và ren, nhưng nhờ form áo váy nhẹ nhàng, có độ bay và rũ tự nhiên nên lên người rất thanh thoát, sang trọng chứ không bị quá điệu hay phô trương đâu ạ.

Nếu chị vẫn ngại áo thêu nổi có thể hơi điệu so với phong cách thường ngày, mình có thể chọn mua riêng phần chân váy ren (449.000đ) để phối với một chiếc áo trơn đơn giản sẵn có trong tủ. Còn diện trọn bộ (799.000đ) thì tổng thể rất nhã nhặn, lịch sự và vừa vặn cho tiệc cưới ban ngày.

Chị thích lấy nguyên bộ hay mình thử phần chân váy trước ạ?
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Khách cần shop chọn có nên lấy, reply đầu khen cả bộ, giữa đưa váy lẻ, cuối lại giao lựa chọn cho khách. Chưa giải quyết ưu tiên đồ trơn/ngại điệu, lời thuyết phục dài và nhiều tính từ; không chấm chỉ theo có câu em chọn hay không.

## B1–16 — b1-policy-used-v2 — USABLE

Khách:
> Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Actual customer outcome:

```text
Dạ theo quy định đổi hàng của shop, sản phẩm đổi cần ở trạng thái chưa từng mặc thử vào người (chỉ ướm bên ngoài), nên trường hợp chị đã mặc thử thì shop rất tiếc không hỗ trợ đổi size được ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Áp policy vào việc đã mặc vào và từ chối đổi đúng. Đã xử lý nguyên nhân fallback trước; không bắt thiếu các điều kiện khác khi hành động này đã loại trừ.

## B1–17 — b1-changed-occasion-v3 — USABLE

Lịch sử trước lượt này:

- customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.
- shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách:
> Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Actual customer outcome:

```text
Đi gặp khách hàng buổi sáng, để nhìn gọn gàng và lịch sự hơn, em gợi ý chị lấy áo lẻ (499.000đ) để phối với quần âu hoặc chân váy ôm gọn gàng sẵn có. Áo chất tơ Hàn thêu form nhẹ, tinh tế và sắc sảo, rất chuẩn phong cách chuyên nghiệp.

Còn cả bộ (799.000đ) có chân váy ren bay bổng, mềm rũ, hợp với không gian tiệc tối điệu đà hơn chị nha.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Khi chuyển sang gặp khách hàng, chọn áo lẻ và lý giải giảm ren/bay bổng so cả bộ. Quyết định rõ hơn lượt trước; giọng vẫn nhiều tính từ nhưng logic giúp khách chọn.

## B1–18 — b1-current-policy-v3 — USABLE

Lịch sử trước lượt này:

- customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách:
> Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Actual customer outcome:

```text
Dạ, bên em hỗ trợ đổi size trong vòng 15 ngày kể từ khi nhận hàng nên chị đổi được bình thường nha chị. Phí vận chuyển 2 chiều cho đổi hàng là 30.000đ ạ.

Chị muốn đổi sang size nào để em hỗ trợ mình nhé ạ?
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Sửa mốc7thành15ngày theo nguồn và tình huống chỉ mở xem; hỏi size muốn đổi là bước trao đổi tiếp, chưa báo đã đổi hay đã duyệt hồ sơ.

## B1–19 — b1-partial-source-v3 — USABLE

Khách:
> Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Actual customer outcome:

```text
Dạ, áo của set Thạch Thảo làm bằng chất tơ Hàn thêu nổi, vải mềm, thoáng và có độ bay tự nhiên; còn chân váy là chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nha. Hiện tại giá và tình trạng còn hàng của mẫu này em chưa cập nhật được thông tin ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Trả chất áo/váy theo hai phần rồi nói chưa có giá/tồn. Vẫn có thể gọn hơn; không lộ chữ hệ thống như ca3 hoặc biến unknown thành không bán riêng như ca11.

## B1–20 — b1-price-v3 — USABLE

Khách:
> Nguyên set Thạch Thảo bao nhiêu tiền em?

Actual customer outcome:

```text
Dạ nguyên set Thạch Thảo có giá 799.000đ chị nha.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Trả đúng799k, ngắn đúng câu hỏi nguyên set.

## B1–21 — b1-component-stock-v3 — USABLE

Khách:
> Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Actual customer outcome:

```text
Dạ áo Thạch Thảo bên em có bán riêng chị nhé. Áo size M hiện sẵn hàng, giá 499.000đ ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Giá499k và M IN_STOCK khớp context B1 cung cấp. Cụm sẵn hàng cần đối chiếu với đặt trước ở luồng stateful trong diagnosis; chưa quy thành model biết nguồn đặt trước nhưng vẫn nói sai khi context B1 không trình bày fulfillment.

## B1–22 — b1-search-read-v3 — USABLE

Khách:
> Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Actual customer outcome:

```text
Dạ, mẫu Set quần Xuân Thảo hiện vẫn còn hàng chị nhé.

Sản phẩm này shop có bán cả bộ lẫn bán lẻ từng món:
- Cả bộ: 699.000đ
- Áo lẻ: 429.000đ
- Quần lẻ: 429.000đ

Chị muốn chọn mua theo set hay mua lẻ món nào thì báo em nhé ạ.
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Tìm đúng Xuân ThảoSQ223, báo tồn và ba lựa chọn giá phù hợp câu hỏi. Có thể dẫn giáset trước; không ép mọi câu chỉ có một con số.

## B1–23 — b1-buying-concern-v3 — NEEDS_EDIT

Lịch sử trước lượt này:

- customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách:
> Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Actual customer outcome:

```text
Chị ơi, với ngân sách tầm 850 nghìn thì cả hai phương án đều vừa vặn với chị ạ:

- **Mua riêng áo lẻ (499.000đ)**: Áo tơ thêu nổi form nhẹ rất dễ phối đồ. Chị có thể kết hợp linh hoạt với chân váy đen sẵn có hoặc các dáng quần, váy khác để mặc lại nhiều lần.
- **Lấy cả bộ (799.000đ)**: Vẫn nằm trong ngân sách của chị, mang lại diện mạo đồng bộ, thướt tha và sang trọng chuẩn thiết kế set váy Thạch Thảo.

Nếu chị ưu tiên sự đa dạng khi mix & match với đồ có sẵn, mua riêng áo là lựa chọn rất tối ưu. Chị thích phương án nào hơn ạ?
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Khách đã nhờ shop chọn để mặc lại nhiều lần, reply phân tích cả hai rồi nếu ưu tiên đa dạng và hỏi chị thích phương án nào. Điều kiện đó khách đã nói; cần shop đứng vào lựa chọn và lý do, giảm trình bày như bài so sánh. Không tự ép mua rẻ hay cấm upsell cả bộ.

## B1–24 — b1-policy-used-v3 — USABLE

Khách:
> Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Actual customer outcome:

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem và chưa qua giặt ạ. Do sản phẩm của mình đã cắt tem và giặt rồi nên shop rất tiếc không hỗ trợ đổi sang mẫu khác được, chị thông cảm giúp em nhé!
```

Terminal: SEND_ELIGIBLE / PASS; stage: read-only.

Từ chối đúng do đã cắt tem và giặt, không bị đánh lạc hướng bởi chưa mặc ra ngoài. Giải thích đúng điều quyết định, dù câu xin thông cảm hơi hành chính.
