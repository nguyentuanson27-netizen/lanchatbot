# Wording stability round 2 — actual conversations and primary review

Read whole actual customer outcome before rejected-draft/verifier diagnosis. Public checkout fields are redacted. Captured advice is replay of this round’s context, not a second live shop journey.

## stateful-1 / 1: stateful-open

Customer history:


Customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual terminal customer text:

```text
Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ!
```

Primary: **USABLE** — Shop xác nhận đúng đã thêm áo be M/hàng đặt trước; readback giỏ khớp.

Public readback: stage=CART_OPEN, grandTotalVnd=529000; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 2: stateful-variant-quantity

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ!

Customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Actual terminal customer text:

```text
Dạ em đã đổi áo Thạch Thảo màu be sang size L và tăng số lượng thành 2 chiếc cho mình rồi ạ!
```

Primary: **USABLE** — Đổi đúng size L, số lượng 2 và xác nhận đúng lựa chọn.

Public readback: stage=CART_OPEN, grandTotalVnd=978100; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 3: stateful-quote

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo Thạch Thảo màu be sang size L và tăng số lượng thành 2 chiếc cho mình rồi ạ!

Customer: Hai áo cả phí ship là bao nhiêu em?

Actual terminal customer text:

```text
Dạ 2 áo có tổng tiền 998.000đ, được giảm 49.900đ, cộng thêm 30.000đ phí ship nên tổng thanh toán của mình là 978.100đ chị nha!
```

Primary: **USABLE** — Trả đủ phép tính tiền hàng 998k, giảm 49.900đ, ship 30k và tổng 978.100đ đúng.

Public readback: stage=CART_OPEN, grandTotalVnd=978100; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 4: stateful-correction

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo Thạch Thảo màu be sang size L và tăng số lượng thành 2 chiếc cho mình rồi ạ!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ 2 áo có tổng tiền 998.000đ, được giảm 49.900đ, cộng thêm 30.000đ phí ship nên tổng thanh toán của mình là 978.100đ chị nha!

Customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Actual terminal customer text:

```text
Dạ em đã cập nhật lại số đo mới cho mình rồi ạ, áo màu be size L chị đang chọn vẫn giữ nguyên nha chị!
```

Primary: **USABLE** — Cập nhật eo 74/mông 96 đúng state, giữ L như khách chọn; không tự đổi size.

Voice polish / rewrite reason:
- Vẫn “đã cập nhật” rồi nhắc lựa chọn; dùng được nhưng có thể ngắn hơn.

Public readback: stage=CART_OPEN, grandTotalVnd=978100; full cart/profile in PRIMARY_REVIEW.json.

## stateful-1 / 5: stateful-request-checkout

Customer history:

- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo Thạch Thảo màu be sang size L và tăng số lượng thành 2 chiếc cho mình rồi ạ!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ 2 áo có tổng tiền 998.000đ, được giảm 49.900đ, cộng thêm 30.000đ phí ship nên tổng thanh toán của mình là 978.100đ chị nha!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ em đã cập nhật lại số đo mới cho mình rồi ạ, áo màu be size L chị đang chọn vẫn giữ nguyên nha chị!

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
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo Thạch Thảo màu be sang size L và tăng số lượng thành 2 chiếc cho mình rồi ạ!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ 2 áo có tổng tiền 998.000đ, được giảm 49.900đ, cộng thêm 30.000đ phí ship nên tổng thanh toán của mình là 978.100đ chị nha!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ em đã cập nhật lại số đo mới cho mình rồi ạ, áo màu be size L chị đang chọn vẫn giữ nguyên nha chị!
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
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho mình rồi ạ!
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo Thạch Thảo màu be sang size L và tăng số lượng thành 2 chiếc cho mình rồi ạ!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ 2 áo có tổng tiền 998.000đ, được giảm 49.900đ, cộng thêm 30.000đ phí ship nên tổng thanh toán của mình là 978.100đ chị nha!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ em đã cập nhật lại số đo mới cho mình rồi ạ, áo màu be size L chị đang chọn vẫn giữ nguyên nha chị!
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
Dạ, set Thạch Thảo dùng chất liệu tơ Hàn và ren tơ Hàn mềm bay nên khi ngồi ô tô gần 3 tiếng di chuyển đường dài sẽ dễ bị hằn nếp gấp nhẹ áo váy đó chị ạ.

Nếu chị muốn mẫu ít nhăn hơn để khi tới nơi trang phục vẫn phẳng phiu, mình có thể chuyển sang **Set váy Khánh Trang** (chất thô boi phối ren form suông nhẹ) hoặc **Set váy Thanh Vũ** (áo ren dệt sợi cotton, chân váy tơ crep). Chất thô boi hoặc ren cotton đứng dáng hơn một chút khi ngồi xe lâu, mặc lên vẫn rất lịch sự, nữ tính và rất hợp để đi tiệc cưới nha chị. Chị xem mình ưng mẫu nào em tư vấn thêm cho ạ!
```

Primary: **NEEDS_EDIT** — Có so sánh chất liệu và tìm được hai mẫu, nhưng khách đã nhờ shop chọn giúp: reply đưa Khánh Trang hoặc Thanh Vũ rồi hỏi khách ưng mẫu nào, chưa có lựa chọn ưu tiên/lý do phân biệt. Cần viết lại để shop dẫn quyết định thay vì trả việc chọn lại cho khách.

Voice polish / rewrite reason:
- Dài; kể thuộc tính hai mẫu rồi kết bằng CTA chung. Không chấm chỉ do có hai mẫu, mà do yêu cầu chọn giúp chưa được giải quyết.

## b1-1 / 2: b1-partial-source-v2

Customer history:


Customer: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual terminal customer text:

```text
Chân váy Thạch Thảo được làm từ chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất bay bổng ạ.

Dạ hiện em chưa tra được thông tin giá và việc shop có hỗ trợ tách lẻ chân váy size M không, chị thông cảm nha!
```

Primary: **USABLE** — Trả được chất liệu/dáng, chưa tra được bán riêng và giá trong fixture POS unavailable; không bịa giá/tồn.

Voice polish / rewrite reason:
- “hỗ trợ tách lẻ chân váy size M” và xin thông cảm hơi hành chính.

## b1-1 / 3: b1-buying-concern

Customer history:


Customer: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual terminal customer text:

```text
Dạ set này mặc đi tiệc ban ngày rất hợp và không bị rườm rà đâu chị nhé. Chân váy dùng chất ren tơ Hàn mềm với form nhẹ và độ rũ tự nhiên, kết hợp cùng áo tơ thêu nổi thanh thoát nên tạo cảm giác bay bổng, nhã nhặn chứ không bị cứng hay nặng nề ạ.

Trọn bộ nguyên set có giá **799.000đ**, hoàn toàn vừa vặn trong ngân sách 900 nghìn của chị. Chị có muốn em chốt đơn set này luôn không ạ?
```

Primary: **USABLE** — Trả thẳng lo ren rườm rà, giải thích cảm giác mềm/nhẹ và báo giá799k; có bước mời mua trong khả năng checkout.

Voice polish / rewrite reason:
- Vẫn nhiều tính từ và nhắc lại ngân sách; lời mời chốt hơi gấp nhưng không sai.

## b1-1 / 4: b1-search-read

Customer history:


Customer: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual terminal customer text:

```text
Dạ, mẫu áo dài SD375 hiện có sẵn hai lựa chọn cho chị ạ:
- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Chị muốn lấy áo lẻ hay nguyên bộ để em hỗ trợ thêm nhé ạ?
```

Primary: **USABLE** — Giá áo/cả bộ đúng; “có sẵn hai lựa chọn” trong cả đoạn là hai offer, không tuyên bố size/stock cụ thể.

Voice polish / rewrite reason:
- “hiện có sẵn” có thể bỏ để tránh khách hiểu nhầm thành tồn.

## advice-1 / 1: b1-changed-occasion

Customer history:

- customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
- shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Customer: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Actual terminal customer text:

```text
Phần này em chưa trả lời được, chị nhé.
```

Primary: **UNUSABLE** — Khách cần shop chọn đồ ít nhăn hơn; thực tế chỉ nhận fallback, không được giải quyết việc mua.

## advice-1 / 2: b1-partial-source-v2

Customer history:


Customer: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual terminal customer text:

```text
Dạ chân váy làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên mặc rất thoáng và bay dáng ạ.

Còn về việc tách mua riêng chân váy, kiểm tra size M và giá thì em chưa thể kiểm tra được lúc này, chị thông cảm giúp em nha!
```

Primary: **USABLE** — Trả chất liệu/dáng và báo chưa kiểm tra được bán riêng/size M/giá theo fixture; không hứa tra sau hoặc bịa dữ kiện.

Voice polish / rewrite reason:
- “bay dáng”, “chị thông cảm giúp em” gượng; có thể nói gọn.

## advice-1 / 3: b1-buying-concern

Customer history:


Customer: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual terminal customer text:

```text
Dạ, set Thạch Thảo dùng chất ren tơ Hàn mềm với form nhẹ và có độ rũ tự nhiên nên mặc đi tiệc ban ngày rất sang và thanh thoát, không bị rườm rà hay nặng nề đâu chị nhé.

Giá nguyên bộ là 799.000đ, hoàn toàn vừa vặn với ngân sách 900k của mình. Chị lấy luôn cả bộ để mặc liền một set đi tiệc luôn không ạ?
```

Primary: **USABLE** — Giải tỏa lo rườm rà, nêu giá bộ đúng và mời mua. Không có claim công năng hay fit mới; nhận xét thẩm mỹ được phép.

Voice polish / rewrite reason:
- Lặp “luôn” trong CTA, nhiều tính từ và nhắc lại ngân sách.

## advice-1 / 4: b1-search-read

Customer history:


Customer: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual terminal customer text:

```text
Dạ, áo dài mã SD375 bên em có hai lựa chọn với mức giá như sau ạ:

- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Chị đang muốn tham khảo dạng áo lẻ hay cả bộ ạ?
```

Primary: **USABLE** — Báo đúng giá áo/cả bộ và hỏi lựa chọn tương ứng; bước tiếp theo dùng được.

Voice polish / rewrite reason:
- “tham khảo dạng” hơi cứng.
