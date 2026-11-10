# Wording stability round 1 — actual conversations and primary review

Read whole actual customer outcome before rejected-draft/verifier diagnosis. Public checkout fields are redacted. Captured advice is replay of this round’s context, not a second live shop journey.

## stateful-1 / 1: stateful-open

Customer history:


Customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual terminal customer text:

```text
Chị đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình nhé ạ!
```

Primary: **NEEDS_EDIT** — Giỏ đúng áo be M, nhưng shop nói “Chị đã thêm…cho mình” thay vì xác nhận việc shop vừa làm: sai vai xưng hô trong chính câu xác nhận. Cần sửa câu trước gửi, không phải lỗi mutation.

Voice polish / rewrite reason:
- Sai chủ thể xưng hô; “nhé ạ” gượng.

Public readback: stage=CART_OPEN, grandTotalVnd=529000; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 2: stateful-variant-quantity

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Chị đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình nhé ạ!

Customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Actual terminal customer text:

```text
Dạ em đã đổi sang size L và tăng số lượng thành 2 chiếc áo Thạch Thảo màu be cho mình rồi ạ!
```

Primary: **USABLE** — Đổi đúng size L, số lượng 2 và xác nhận đúng lựa chọn.

Public readback: stage=CART_OPEN, grandTotalVnd=978100; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 3: stateful-quote

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Chị đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình nhé ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang size L và tăng số lượng thành 2 chiếc áo Thạch Thảo màu be cho mình rồi ạ!

Customer: Hai áo cả phí ship là bao nhiêu em?

Actual terminal customer text:

```text
Dạ, 2 chiếc áo Thạch Thảo màu be size L của mình có tổng tiền hàng là 998.000đ (499.000đ/chiếc). Phí ship là 30.000đ, tính cả ưu đãi thì tổng thanh toán (bao gồm cả phí ship) là 978.100đ chị nhé ạ!
```

Primary: **USABLE** — Trả tổng cả ship 978.100đ đúng readback; tiền hàng và ưu đãi không mâu thuẫn.

Voice polish / rewrite reason:
- Dài, nhắc phí ship hai lần; có thể nói gọn.

Public readback: stage=CART_OPEN, grandTotalVnd=978100; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 4: stateful-correction

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Chị đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình nhé ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang size L và tăng số lượng thành 2 chiếc áo Thạch Thảo màu be cho mình rồi ạ!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 chiếc áo Thạch Thảo màu be size L của mình có tổng tiền hàng là 998.000đ (499.000đ/chiếc). Phí ship là 30.000đ, tính cả ưu đãi thì tổng thanh toán (bao gồm cả phí ship) là 978.100đ chị nhé ạ!

Customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Actual terminal customer text:

```text
Dạ vâng, em đã cập nhật lại số đo (eo 74, mông 96) cho mình rồi ạ. Áo chị vẫn giữ size L nhé!
```

Primary: **USABLE** — Cập nhật đúng eo 74/mông 96, giữ L như khách chọn; nhắc đúng hai số vừa sửa là xác nhận hợp lý.

Voice polish / rewrite reason:
- “đã cập nhật” còn hành chính; có thể ngắn hơn.

Public readback: stage=CART_OPEN, grandTotalVnd=978100; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 5: stateful-request-checkout

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Chị đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình nhé ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang size L và tăng số lượng thành 2 chiếc áo Thạch Thảo màu be cho mình rồi ạ!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 chiếc áo Thạch Thảo màu be size L của mình có tổng tiền hàng là 998.000đ (499.000đ/chiếc). Phí ship là 30.000đ, tính cả ưu đãi thì tổng thanh toán (bao gồm cả phí ship) là 978.100đ chị nhé ạ!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ vâng, em đã cập nhật lại số đo (eo 74, mông 96) cho mình rồi ạ. Áo chị vẫn giữ size L nhé!

Customer: Chị đặt hai áo này nhé, lên đơn cho chị.

Actual terminal customer text:

```text
Chị gửi thêm [NAME]
```

Primary: **USABLE** — Mời bổ sung thông tin checkout qua luồng code; chưa nhận là đã tạo đơn.

Public readback: stage=CART_OPEN, grandTotalVnd=978100; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 6: stateful-private-checkout

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Chị đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình nhé ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang size L và tăng số lượng thành 2 chiếc áo Thạch Thảo màu be cho mình rồi ạ!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 chiếc áo Thạch Thảo màu be size L của mình có tổng tiền hàng là 998.000đ (499.000đ/chiếc). Phí ship là 30.000đ, tính cả ưu đãi thì tổng thanh toán (bao gồm cả phí ship) là 978.100đ chị nhé ạ!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ vâng, em đã cập nhật lại số đo (eo 74, mông 96) cho mình rồi ạ. Áo chị vẫn giữ size L nhé!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]

Customer: [Thông tin checkout riêng tư được xử lý trong code]

Actual terminal customer text:

```text
2 áo SV2447 màu be, size L: 998.000đ
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
```

Primary: **USABLE** — Preview code có hai áo be L, tổng 978.100đ và thông tin đặt trước/ETA; dữ liệu riêng được che trong bản công khai.

Public readback: stage=ORDER_PREVIEW, grandTotalVnd=978100; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 7: stateful-confirm

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Chị đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình nhé ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang size L và tăng số lượng thành 2 chiếc áo Thạch Thảo màu be cho mình rồi ạ!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 chiếc áo Thạch Thảo màu be size L của mình có tổng tiền hàng là 998.000đ (499.000đ/chiếc). Phí ship là 30.000đ, tính cả ưu đãi thì tổng thanh toán (bao gồm cả phí ship) là 978.100đ chị nhé ạ!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ vâng, em đã cập nhật lại số đo (eo 74, mông 96) cho mình rồi ạ. Áo chị vẫn giữ size L nhé!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]
- customer: [Thông tin checkout riêng tư được xử lý trong code]
- shop: 2 áo SV2447 màu be, size L: 998.000đ
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

Customer: Chốt đơn cho chị nhé.

Actual terminal customer text:

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```

Primary: **USABLE** — Chốt ý mua và chuyển nhân viên theo state; không nhận đã tạo POS order.

Public readback: stage=PURCHASE_CONFIRMED, grandTotalVnd=978100; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 8: stateful-human-request

Customer history:


Customer: Cho chị gặp nhân viên shop nhé.

Actual terminal customer text:

```text
[No bot message; ownership control]
```

Primary: **OWNERSHIP_CONTROL** — Khách xin gặp nhân viên; bot nhường quyền theo control, không chấm là lời tư vấn thiếu.

Public readback: stage=DISCOVERY, grandTotalVnd=None; full cart/profile in PRIMARY_REVIEW.json.

## b1-1 / 1: b1-changed-occasion

Customer history:

- customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
- shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Customer: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Actual terminal customer text:

```text
Phần này em chưa trả lời được, chị nhé.
```

Primary: **UNUSABLE** — Khách cần lựa chọn ít nhăn hơn cho chuyến xe; thực tế chỉ nhận fallback nên chưa được tư vấn.

## b1-1 / 2: b1-partial-source-v2

Customer history:


Customer: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual terminal customer text:

```text
Chân váy Thạch Thảo được làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất thướt tha chị ạ.

Còn về việc mua riêng chân váy size M, hiện em chưa có thông tin giá và mức bán lẻ này nên chưa báo chính xác được cho chị nhé.
```

Primary: **USABLE** — Trả được chất liệu/dáng; không tự báo bán lẻ hay giá khi POS cố ý không available.

Voice polish / rewrite reason:
- “thông tin giá và mức bán lẻ này” khó hiểu; nên nói trực tiếp chưa báo được giá/tình trạng size M.

## b1-1 / 3: b1-buying-concern

Customer history:


Customer: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual terminal customer text:

```text
Dạ set váy Thạch Thảo này nguyên bộ có giá 799.000đ nên hoàn toàn vừa với ngân sách 900k của chị ạ.

Chị yên tâm là phần chân váy dùng ren tơ Hàn mềm, có độ rũ tự nhiên kết hợp cùng áo tơ thêu form nhẹ và bay bổng, không bị cứng hay nặng nề đâu ạ. Thiết kế này tạo cảm giác thanh nhã, nhẹ nhàng nên mặc đi tiệc ban ngày rất sang, không bị rườm rà hay quá chói mắt đâu chị nhé!
```

Primary: **USABLE** — Trả thẳng nỗi lo ren rườm rà, gắn chất liệu/phom với cảm nhận thanh nhã và giá bộ trong ngân sách. Tư vấn thẩm mỹ được phép.

Voice polish / rewrite reason:
- Nhiều tính từ, lặp ngân sách; lời giải thích dài hơn cần thiết.

## b1-1 / 4: b1-search-read

Customer history:


Customer: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual terminal customer text:

```text
Áo dài mã SD375 bên shop có 2 lựa chọn cho chị:
- Mua áo lẻ: 929.000đ
- Mua cả bộ: 1.065.000đ

Chị quan tâm mẫu áo lẻ hay cả bộ để em hỗ trợ thêm nhé ạ?
```

Primary: **USABLE** — Giá áo 929k/bộ 1.065k đúng, hỏi khách chọn loại để tiếp tục mua.

Voice polish / rewrite reason:
- “để em hỗ trợ thêm” hơi khuôn.

## advice-1 / 1: b1-changed-occasion

Customer history:

- customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
- shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Customer: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Actual terminal customer text:

```text
Dạ ngồi ô tô gần 3 tiếng thì Set Thạch Thảo chất tơ mềm bay sẽ rất dễ bị hằn nếp nhăn ạ.

Nếu chị muốn tìm mẫu giữ form tốt hơn khi di chuyển dài, em thấy **Váy Diệp An** là lựa chọn hợp lý nhất. Mẫu này có thiết kế 2 lớp giúp váy đứng form đẹp, form suông nhẹ nhàng mặc vừa thoải mái, lịch sự lại hạn chế bị nhàu nếp hơn khi ngồi xe lâu đó chị.
```

Primary: **USABLE** — Đổi lựa chọn sang Diệp An từ mô tả có 2 lớp/đứng form, liên hệ chất tơ mềm với nhu cầu đi xe. Đây là tư vấn so sánh định tính theo rubric hiện hành, không hứa hiệu quả phục hồi nếp nhăn hay kết quả thử nghiệm.

Voice polish / rewrite reason:
- “rất dễ”, “hợp lý nhất” khá tuyệt đối; nên tư vấn vừa phải hơn.

## advice-1 / 2: b1-partial-source-v2

Customer history:


Customer: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual terminal customer text:

```text
Dạ, chân váy được làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên mặc rất thướt tha chị ạ.

Còn về việc tách lẻ chân váy cũng như giá và tình trạng size M, hiện em chưa có thông tin chi tiết cho phần này để báo mình nha chị.
```

Primary: **USABLE** — Trả chất liệu/dáng và nói rõ chưa có thông tin bán riêng/giá/tồn M trong fixture POS unavailable; không hứa tra sau khi không có khả năng.

Voice polish / rewrite reason:
- Hai đoạn cho câu trả lời đơn giản; có thể gọn.

## advice-1 / 3: b1-buying-concern

Customer history:


Customer: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual terminal customer text:

```text
Dạ, set Thạch Thảo này mặc đi tiệc ban ngày rất hợp và không bị rườm rà đâu chị ạ! Thiết kế gồm áo tơ Hàn thêu nổi nhẹ nhàng kết hợp chân váy ren tơ Hàn mềm, form váy có độ rũ và bay tự nhiên nên tạo cảm giác thanh thoát, bay bổng chứ không bị nặng nề hay cứng nhắc.

Hơn nữa, nguyên bộ có giá 799.000đ, hoàn toàn nằm trong ngân sách 900.000đ của chị. Nếu chị vẫn muốn tiết chế bớt phần ren, mình có thể chọn mua riêng áo thêu (499.000đ) để phối cùng các kiểu chân váy trơn sẵn có trong tủ đồ nha chị.
```

Primary: **USABLE** — Giải tỏa lo rườm rà và đưa cách bớt ren bằng áo thêu phối váy trơn; giá bộ/áo khớp nguồn.

Voice polish / rewrite reason:
- Dài, nhiều cụm bay bổng/thanh thoát; lặp ngân sách.

## advice-1 / 4: b1-search-read

Customer history:


Customer: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual terminal customer text:

```text
Dạ, mẫu áo dài SD375 bên em có hai lựa chọn với mức giá như sau ạ:
- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Chị muốn chọn mua áo lẻ hay cả bộ ạ?
```

Primary: **USABLE** — Báo đúng hai giá và hỏi áo lẻ/cả bộ, bước tiếp theo thực hiện được.
