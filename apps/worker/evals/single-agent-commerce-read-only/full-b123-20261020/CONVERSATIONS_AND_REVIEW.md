# Full B1/B2/B3 —32actual outcomes và primary review

Agent self-review trước rejected-draft/verifier diagnosis; không blind human review. Public state/actual text đã redacted; JSON/raw giữ nguyên evidence, Markdown bỏ trailing spaces.

## stateful-1 lượt 1 — stateful-open

Lịch sử:

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual customer outcome:

```text
Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```

Disposition: SEND_ELIGIBLE; reason: RECEIPT_BACKED_CART_SUMMARY.
USABLE: Giỏ đã commit đúng áo be M, một chiếc, số đo76/98; actual receipt-backed summary giữ tổng529.000đ và báo đặt trước. Không tính recovery code-owned thành verifier PASS.

- Tên món chưa cụ thể nhưng trong lượt chỉ có một món khách vừa chọn; chưa coi là lỗi nghiêm trọng.

Committed state: CART_OPEN; total=529000; measurements=[{"kind": "WAIST_CM", "value": 76}, {"kind": "HIPS_CM", "value": 98}]

## stateful-1 lượt 2 — stateful-variant-quantity

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Actual customer outcome:

```text
Em đổi sang 2 chiếc áo size L cho chị rồi ạ. Tổng đơn của mình là 978.100đ, chị nhé.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Đổi đúng hai áo be L; tổng978.100đ khớp state đã commit.

- Câu xác nhận ngắn, dùng được; không cần ép nhắc lại màu khi không thay đổi.

Committed state: CART_OPEN; total=978100; measurements=[{"kind": "WAIST_CM", "value": 76}, {"kind": "HIPS_CM", "value": 98}]

## stateful-1 lượt 3 — stateful-quote

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Em đổi sang 2 chiếc áo size L cho chị rồi ạ. Tổng đơn của mình là 978.100đ, chị nhé.

Khách: Hai áo cả phí ship là bao nhiêu em?

Actual customer outcome:

```text
Dạ, 2 áo giá 998.000đ, sau khi ưu đãi giảm 49.900đ và cộng phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Trả đủ tổng hai áo cùng phí ship và ưu đãi, các số khớp quote do code tính.

- Đây là giải thích tiền theo câu hỏi, không phải liệt kê facts thừa.

Committed state: CART_OPEN; total=978100; measurements=[{"kind": "WAIST_CM", "value": 76}, {"kind": "HIPS_CM", "value": 98}]

## stateful-1 lượt 4 — stateful-correction

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Em đổi sang 2 chiếc áo size L cho chị rồi ạ. Tổng đơn của mình là 978.100đ, chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 áo giá 998.000đ, sau khi ưu đãi giảm 49.900đ và cộng phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé.

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Actual customer outcome:

```text
Dạ, em ghi nhận số đo mới (eo 74, mông 96) của chị rồi ạ. Áo chị vẫn giữ size L như mình chọn nhé!
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Sửa đúng eo74/mông96 và giữ sizeL khách tự chọn. Không tự khẳng định mặc vừa.

- Nhắc hai số vừa sửa có ích để xác nhận; không tự bắt lỗi chỉ vì có ngoặc hoặc lặp số đo. Có thể trau chuốt giọng ghi nhận.

Committed state: CART_OPEN; total=978100; measurements=[{"kind": "WAIST_CM", "value": 74}, {"kind": "HIPS_CM", "value": 96}]

## stateful-1 lượt 5 — stateful-request-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Em đổi sang 2 chiếc áo size L cho chị rồi ạ. Tổng đơn của mình là 978.100đ, chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 áo giá 998.000đ, sau khi ưu đãi giảm 49.900đ và cộng phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé.
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ, em ghi nhận số đo mới (eo 74, mông 96) của chị rồi ạ. Áo chị vẫn giữ size L như mình chọn nhé!

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Actual customer outcome:

```text
Chị gửi thêm [NAME]
```

Disposition: NO_SEND; reason: CHECKOUT_DETAILS_MISSING.
USABLE: Code phát lời mời bổ sung checkout rồi giữ giỏ, chưa tự tạo đơn hoặc đưa private intake qua model.

- View bị redactAnalyticsMessage thu thành Chị gửi thêm [NAME]; không đánh giá placeholder redaction như câu nguyên văn khách nhận. Renderer nguồn realtime-sales-cycle.ts có đủ nhãn fields. Model terminal NO_SEND không có nghĩa toàn delivery không phát holding reply.

Committed state: CART_OPEN; total=978100; measurements=[{"kind": "WAIST_CM", "value": 74}, {"kind": "HIPS_CM", "value": 96}]

## stateful-1 lượt 6 — stateful-private-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Em đổi sang 2 chiếc áo size L cho chị rồi ạ. Tổng đơn của mình là 978.100đ, chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 áo giá 998.000đ, sau khi ưu đãi giảm 49.900đ và cộng phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé.
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ, em ghi nhận số đo mới (eo 74, mông 96) của chị rồi ạ. Áo chị vẫn giữ size L như mình chọn nhé!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]

Khách: [Thông tin checkout riêng tư được xử lý trong code]

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

Disposition: NO_SEND; reason: PRIVATE_CHECKOUT_COMMITTED.
USABLE: Code-only private checkout tạo ORDER_PREVIEW đúng2áo beL, tiền978.100đ, đặt trước/ETA8–14ngày và yêu cầu xác nhận.

- Public view đã che phone/address; bố cục thông tin đơn hàng phù hợp, không áp quy tắc giọng tư vấn để xóa chi tiết checkout.

Committed state: ORDER_PREVIEW; total=978100; measurements=[{"kind": "WAIST_CM", "value": 74}, {"kind": "HIPS_CM", "value": 96}]

## stateful-1 lượt 7 — stateful-confirm

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Em đổi sang 2 chiếc áo size L cho chị rồi ạ. Tổng đơn của mình là 978.100đ, chị nhé.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 áo giá 998.000đ, sau khi ưu đãi giảm 49.900đ và cộng phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé.
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ, em ghi nhận số đo mới (eo 74, mông 96) của chị rồi ạ. Áo chị vẫn giữ size L như mình chọn nhé!
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

Khách: Chốt đơn cho chị nhé.

Actual customer outcome:

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```

Disposition: HANDOFF; reason: PURCHASE_CONFIRMED.
USABLE: State PURCHASE_CONFIRMED; actual chuyển nhân viên kiểm tra/lên đơn, không báo đã tạo đơn POS thật.

- Quyền/handoff và receipt cần đối chiếu tiếp ở diagnosis, không suy từ lời nói một mình.

Committed state: PURCHASE_CONFIRMED; total=978100; measurements=[{"kind": "WAIST_CM", "value": 74}, {"kind": "HIPS_CM", "value": 96}]

## stateful-1 lượt 8 — stateful-human-request

Lịch sử:

Khách: Cho chị gặp nhân viên shop nhé.

Actual customer outcome:

```text
[Không có tin khách nhận được capture]
```

Disposition: HANDOFF; reason: CUSTOMER_REQUESTED_HUMAN.
OWNERSHIP_CONTROL: Customer request human kết thúc HANDOFF, không có câu gửi khách được capture. Đây là điều khiển ownership theo policy, không một reply model thất bại.

- Không có ACK nhìn thấy là giới hạn trải nghiệm cần ghi rõ; chưa quy thành lỗi ngôn ngữ hoặc tự hứa đã báo khách.

Committed state: DISCOVERY; total=None; measurements=[]

## b1-1 lượt 1 — b1-changed-occasion

Lịch sử:
- customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
- shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Actual customer outcome:

```text
Dạ, set Thạch Thảo có chất tơ Hàn nên khi chị ngồi ô tô 3 tiếng sẽ có thể hằn nếp nhẹ ở phần áo tơ ạ.

Chị xem qua váy Diệu Thanh nha. Mẫu này dùng chất ren Hàn cao cấp kết hợp lớp lót lụa habutai bên trong nên giữ form rất tốt và ít nhăn hơn, mặc đi tiệc vừa sang trọng vừa thoải mái suốt chuyến đi. Váy có giá 799.000đ chị nhé.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Nhận thay đổi hoàn cảnh, nói rủi ro của Thạch Thảo và chọn Diệu Thanh với ren Hàn/lót habutai có nguồn, giá799k đúng. So sánh định tính về nhăn/giữ form giữ ranh giới tư vấn đã chốt.

- Có nhiều lời khen cuối, nhưng có lựa chọn cụ thể và căn cứ sát chuyến đi; không tự bắt thành failure vì suốt chuyến đi.

## b1-1 lượt 2 — b1-current-policy

Lịch sử:
- customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Actual customer outcome:

```text
Dạ đơn nhận 10 hôm thì vẫn trong thời gian đổi hàng của shop (trong vòng 15 ngày) và sản phẩm còn nguyên tem mác, chưa qua sử dụng nên chị vẫn kịp đổi màu nha chị.

Phí đổi hàng (gồm vận chuyển 2 chiều) là 30.000đ chị nhé.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Dùng chính sách hiện hành15ngày thay lịch sử7ngày, trả thời hạn và phí30k cho câu hỏi đổi màu sau10ngày.

- Đọc trong ngữ cảnh hỏi còn kịp không; không yêu cầu đọc toàn bộ policy mỗi lần. Không có hành vi trái điều kiện đã được nêu trong ca.

## b1-1 lượt 3 — b1-partial-source

Lịch sử:

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Actual customer outcome:

```text
Set Thạch Thảo có phần áo làm từ tơ Hàn thêu nổi, mềm thoáng và bay bổng, kết hợp cùng chân váy ren tơ Hàn mềm có độ rũ tự nhiên rất đẹp chị ạ.

Hiện tại thông tin giá và tình trạng size M của mẫu này em chưa tra được dữ liệu để báo chính xác cho chị ngay lúc này.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
NEEDS_EDIT: Trả được chất liệu và không bịa giá/tồn do fixture nguồn thiếu; phần chưa trả được lại diễn đạt thành báo cáo tra dữ liệu, kèm đoạn mô tả kéo dài. Cần viết lại phần này trước khi gửi như tư vấn bán hàng.

- Thiếu giá/tồn là source fault đã đăng ký, không phải model làm mất fact. Lỗi ở cách trình bày cả đoạn, không cấm một chữ cụ thể.

## b1-1 lượt 4 — b1-price

Lịch sử:

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Actual customer outcome:

```text
Dạ, set váy Thạch Thảo nhà em có giá cụ thể cho từng lựa chọn như sau ạ:

- Trọn bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ

Chị muốn lấy cả bộ hay chọn mua lẻ món nào ạ?
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Báo đúng giá cả bộ/áo/váy, phân biệt rõ món nhận được.

- Khách hỏi set; có thể đi thẳng799k rồi nêu mua lẻ nếu hữu ích. Danh sách giá không tự là lỗi.

## b1-1 lượt 5 — b1-component-stock

Lịch sử:

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Actual customer outcome:

```text
Dạ, áo lẻ set Thạch Thảo size M nhà em hiện còn hàng chị nhé. Áo bán riêng có giá 499.000đ ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Trả đúng áoM còn và499k theo facts đang có.

- Gọn, đúng phần khách hỏi; không cần thêm câu chốt.

## b1-1 lượt 6 — b1-search-read

Lịch sử:

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual customer outcome:

```text
Dạ, áo dài SD375 có giá tùy theo lựa chọn của chị ạ:

- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Chị muốn lấy áo lẻ hay cả bộ để em hỗ trợ mình tiếp ạ?
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Tìm đúngSD375 và báo giá929k áo lẻ/1.065k cả bộ; phân biệt phạm vi.

- Danh sách hai lựa chọn dễ đọc, lời mời chọn tương ứng khả năng trao đổi tiếp.

## b1-1 lượt 7 — b1-buying-concern

Lịch sử:

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual customer outcome:

```text
Set Thạch Thảo mặc đi tiệc ban ngày rất sang và không bị rườm rà đâu chị nhé. Mẫu này dùng chất tơ Hàn thêu kết hợp chân váy ren tơ Hàn mềm, form nhẹ và có độ bay, rũ tự nhiên nên lên người rất thanh thoát, nhẹ nhàng ạ.

Trọn bộ set váy có giá 799.000đ, hoàn toàn vừa vặn trong ngân sách 900.000đ của chị nha. Chị muốn lấy size nào để em kiểm tra độ vừa cho mình ạ?
```

Disposition: SEND_ELIGIBLE; reason: PASS.
NEEDS_EDIT: Có nhận định về ren và giá nhưng lời khuyên vẫn khen nhiều; câu hỏi size khách muốn lấy để kiểm tra độ vừa chưa thu đúng dữ kiện phục vụ tư vấn fit. Cần sửa bước tiếp theo theo khả năng recommend_size/hồ sơ, không suy fit từ size mong muốn.

- Khách đang băn khoăn về kiểu dáng; bước xin size chuyển hướng sớm và chưa có số đo. Không đề xuất thêm câu hỏi bắt buộc cho mọi case.

## b1-1 lượt 8 — b1-policy-used

Lịch sử:

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Actual customer outcome:

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên mác, chưa qua sử dụng và chưa giặt ạ. Do chị đã mặc đi làm rồi nên shop tiếc là không hỗ trợ đổi sang màu khác được cho mình nữa chị nha.

Về phí ship đổi hàng (trong các trường hợp đủ điều kiện đổi), tổng phí ship 2 chiều là 30.000đ ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Từ chối đổi đúng vì khách đã mặc đi làm, phí30k chỉ nói cho trường hợp đủ điều kiện.

- Có thể đi thẳng câu từ chối trước, nhưng không mở lại quyền đổi cho hành vi đã dùng.

## b1-1 lượt 9 — b1-changed-occasion-v2

Lịch sử:
- customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.
- shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Actual customer outcome:

```text
Chị yên tâm nha, áo tơ Hàn và chân váy ren tơ Hàn đều mềm, thoáng và có độ bay tự nhiên, form nhẹ nhàng nên mặc ngoài trời thoải mái, không bị bí nóng đâu ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Dùng thông tin mềm/thoáng/form nhẹ để tư vấn cảm giác mặc khi tiệc ngoài trời. Theo boundary hiện hành đây là lời khuyên chất liệu thông thường.

- Cách nói không bí nóng khá tự tin; không tự coi mỗi nhận xét cảm giác là bảo đảm kiểm nghiệm.

## b1-1 lượt 10 — b1-current-policy-v2

Lịch sử:
- customer: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Actual customer outcome:

```text
Dạ shop quy định đổi hàng trong vòng 15 ngày kể từ khi nhận đơn, nên đơn của mình nhận 12 hôm và chưa dùng thì đổi size vẫn kịp chị nhé. Phí đổi hàng hai chiều hiện là 30.000đ ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Trả15ngày và phí30k cho câu hỏi đổi size sau12ngày, cập nhật phí khác lịch sử25k.

- Không có hành vi trái điều kiện trong ca; đánh giá câu còn kịp theo thời hạn, tránh đếm checklist điều kiện.

## b1-1 lượt 11 — b1-partial-source-v2

Lịch sử:

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual customer outcome:

```text
Chân váy Thạch Thảo được làm từ chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé. Còn giá và tồn kho riêng của chân váy size M hiện em chưa tra được ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Giữ đúng chất liệu/dáng váy và báo gọn chưa tra được giá/tồn M; không bịa hoặc hứa theo dõi.

- Cách nói tự nhiên hơn kiểu dữ liệu shop; hạn chế hoàn thành mua do fixture thiếu nguồn.

## b1-1 lượt 12 — b1-price-v2

Lịch sử:
- customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Actual customer outcome:

```text
Dạ, set váy Thạch Thảo cả bộ bên em có giá 799.000đ ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Hiểu history là cả bộ Thạch Thảo, trả799k trực tiếp.

- Không thêm thông tin không cần thiết.

## b1-1 lượt 13 — b1-component-stock-v2

Lịch sử:
- customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Actual customer outcome:

```text
Dạ chân váy Thạch Thảo size M nhà em còn chị nhé, chân váy mua riêng có giá 449.000đ ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Báo đúng váyM còn và449k, đúng lựa chọn mua riêng.

- Gọn, đủ.

## b1-1 lượt 14 — b1-search-read-v2

Lịch sử:

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Actual customer outcome:

```text
Dạ shop có set váy Khánh Trang chị nhé. Set nguyên bộ có giá 999.000đ ạ, ngoài ra bên em có bán cả áo lẻ hoặc chân váy lẻ với giá 499.000đ mỗi món nha chị.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Tìm đúng Khánh Trang,999k bộ/499k mỗi phần lẻ đúng nguồn.

- Có thể bớt nha chị nhưng là góp ý giọng nhỏ.

## b1-1 lượt 15 — b1-buying-concern-v2

Lịch sử:

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual customer outcome:

```text
Chị hay mặc đồ trơn thì diện set Thạch Thảo đi ăn cưới ban ngày rất hợp lý ạ, không bị điệu quá đâu chị nhé.

Chất liệu tơ Hàn và ren mềm của set có form nhẹ cùng độ bay tự nhiên, tạo cảm giác thanh thoát, nhã nhặn chứ không phồng cứng hay rườm rà.

Nếu chị vẫn ngại mặc cả bộ nguyên set, mình có thể chọn mua lẻ áo thêu (499.000đ) phối cùng quần hoặc chân váy trơn tối giản sẵn có trong tủ, hoặc lấy chân váy ren (449.000đ) kết hợp với một chiếc áo trơn. Giá trọn bộ là 799.000đ ạ. Chị muốn lấy nguyên set hay mình thử chọn mua lẻ một món cho quen phong cách mặc hằng ngày ạ?
```

Disposition: SEND_ELIGIBLE; reason: PASS.
NEEDS_EDIT: Khách muốn quyết định có nên mua khi quen đồ trơn; đoạn mở khuyên cả set rồi mở thêm áo lẻ/váy lẻ và trả việc chọn lại. Lý do dựa nhiều vào mềm/nhẹ/nhã nhặn, chưa làm rõ shop ưu tiên phương án nào cho sự ngại điệu.

- Cần viết lại lời khuyên cả đoạn; không ép mua lẻ hoặc giá thấp, không phạt việc shop bán cả bộ.

## b1-1 lượt 16 — b1-policy-used-v2

Lịch sử:

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Actual customer outcome:

```text
Phần này em chưa trả lời được, chị nhé.
```

Disposition: FALLBACK; reason: FAIL.
UNUSABLE: Khách hỏi thử trong phòng có đổi size được không nhưng chỉ nhận fallback chưa trả lời được.

- Chưa đọc draft/verdict khi chấm; không bù credit từ nội dung chưa gửi.

## b1-1 lượt 17 — b1-changed-occasion-v3

Lịch sử:
- customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.
- shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Actual customer outcome:

```text
Đi gặp khách hàng buổi sáng mà mặc nguyên cả bộ Thạch Thảo vẫn rất lịch sự và gọn gàng chị ạ. Chân váy ren tơ Hàn có form nhẹ và độ rũ tự nhiên chứ không bị phồng hay rườm rà, kết hợp cùng áo thêu trông rất thanh lịch và trang nhã.

Nếu chị thích sự linh hoạt để phối cùng quần sẵn có thì có thể lấy áo lẻ (499.000đ), còn lấy cả bộ (799.000đ) vừa đồng bộ, sang trọng lại vừa nhã nhặn, đi gặp khách hàng hay đi tiệc tối đều rất đẹp ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
NEEDS_EDIT: Đổi mục đích từ tiệc tối sang gặp khách, khách nhờ chọn bộ hay áo. Đoạn chỉ khen cả bộ gọn/đẹp và đưa hai hướng với giá, chưa làm rõ căn cứ ưu tiên cho mục tiêu gọn trong hoàn cảnh mới.

- Cần lời lựa chọn và giải thích sát nhu cầu, không bắt chọn áo lẻ hay công thức một câu nhất định.

## b1-1 lượt 18 — b1-current-policy-v3

Lịch sử:
- customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Actual customer outcome:

```text
Dạ, hiện tại bên em hỗ trợ đổi hàng trong vòng 15 ngày kể từ lúc nhận hàng nên chị đổi size thoải mái nha chị. Miễn là sản phẩm vẫn còn nguyên tem mác, chưa qua sử dụng và giặt tẩy là mình đổi được chị nhé!
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Dùng15ngày thay7ngày cũ và nêu điều kiện nguyên tem/chưa sử dụng/chưa giặt cho hành vi chỉ mở xem.

- Không phát hiện hành vi làm mất quyền đổi trong câu khách; không chặn vì chưa đọc mọi điều kiện sạch/không hỏng.

## b1-1 lượt 19 — b1-partial-source-v3

Lịch sử:

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Actual customer outcome:

```text
Dạ, áo của set Thạch Thảo được làm bằng tơ Hàn thêu có họa tiết thêu nổi, chất vải mềm, thoáng và có độ bay tự nhiên; còn chân váy là ren tơ Hàn mềm, form nhẹ và rũ tự nhiên chị nha. Về giá và tình trạng hàng của set, hiện em chưa có sẵn thông tin ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Trả riêng chất liệu áo/váy và nhận rõ chưa có giá/tồn do fixture; không bịa.

- Mô tả có thể gọn hơn nhưng khách thực sự hỏi hai phần chất liệu; không gán mọi nhiều facts là liệt kê thừa.

## b1-1 lượt 20 — b1-price-v3

Lịch sử:

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Actual customer outcome:

```text
Dạ, nguyên set Thạch Thảo có giá 799.000đ chị nhé.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Trả799k nguyên set đúng, trực tiếp.

- Không cần thêm CTA.

## b1-1 lượt 21 — b1-component-stock-v3

Lịch sử:

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Actual customer outcome:

```text
Dạ, áo Thạch Thảo bên em có bán riêng chị nhé. Áo size M hiện còn hàng, giá 499.000đ ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Xác nhận bán lẻ áo, M còn,499k theo facts.

- Đủ đúng ba phần khách hỏi.

## b1-1 lượt 22 — b1-search-read-v3

Lịch sử:

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Actual customer outcome:

```text
Dạ, set quần Xuân Thảo vẫn còn hàng chị nha. Mẫu này shop có cả nguyên bộ lẫn bán lẻ từng món ạ:

- Nguyên bộ: 699.000đ
- Áo lẻ: 429.000đ
- Quần lẻ: 429.000đ

Chị muốn lấy nguyên set hay mua lẻ món nào cứ báo em nhé!
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Tìm đúngSQ223, báo còn và699k bộ/429k từng phần theo nguồn.

- Có thể giảm phần giới thiệu mua lẻ nhưng không làm sai phạm vi giá.

## b1-1 lượt 23 — b1-buying-concern-v3

Lịch sử:
- customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Actual customer outcome:

```text
Em khuyên chị nên lấy cả bộ Thạch Thảo ạ.

Ngân sách 850 nghìn của chị hoàn toàn vừa vặn để mua trọn bộ với giá 799 nghìn. Mua cả bộ giúp chị có sẵn thiết kế đồng bộ từ áo thêu nổi và chân váy ren mềm mại, bay bổng để mặc đi tiệc hoặc đi chơi rất sang và chuẩn form.

Đồng thời, chị vẫn có thể linh hoạt tách chiếc áo thêu này ra phối cùng chân váy đen dáng suông sẵn có để đổi kiểu đi làm hàng ngày, giúp chị dễ dàng mặc lại nhiều lần với nhiều phong cách khác nhau mà lại tiết kiệm hơn nhiều so với mua lẻ từng món ạ.
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Shop chọn cả bộ799k trong850k, giải thích dùng cả bộ hoặc tách áo phối váy đen khách có, và so giá với mua lẻ cả hai phần948k. Đây là upsell có lý do, không phạt vì khách có sẵn váy.

- Giọng dài và nhiều lời khen/ngân sách được nhắc lại; nên trau chuốt, nhưng không tự đổi thành lỗi mua thừa hoặc so799k với chỉ áo499k.

## b1-1 lượt 24 — b1-policy-used-v3

Lịch sử:

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Actual customer outcome:

```text
Dạ, quy định đổi hàng bên em áp dụng cho sản phẩm còn nguyên tem mác và chưa qua giặt ạ. Do áo của mình đã cắt tem và giặt rồi nên rất tiếc bên em không hỗ trợ đổi sang mẫu khác được, chị thông cảm giúp em nhé ạ!
```

Disposition: SEND_ELIGIBLE; reason: PASS.
USABLE: Từ chối đổi đúng vì đã cắt tem và giặt; không mở quyền chỉ vì chưa mặc ngoài.

- Có thể bớt lời xin thông cảm; kết luận rõ.
