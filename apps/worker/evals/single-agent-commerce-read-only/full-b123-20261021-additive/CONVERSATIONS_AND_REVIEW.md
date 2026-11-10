# Toàn bộ B1/B2/B3 — prompt giữ nguyên cộng5ví dụ

32outcomes:24B1 và8lượt stateful, mỗi ca một lần. Primary agent review đã khóa trước diagnosis; USABLE có thể còn polish, không có nghĩa giọng đã hay hoặc đã chứng minh ổn định. Private checkout hiển thị redacted; code reply và ownership silence được phân biệt với model prose.

## stateful-1 — ca1 — stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, em thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi nhé. Mẫu này là hàng đặt trước chị nha.
```

**USABLE** — Giỏ ghi đúng áo beM×1 và báo đặt trước ngay. Xác nhận ngắn, không tự tư vấn fit từ số đo.

## stateful-1 — ca2 — stateful-variant-quantity

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ, em thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi nhé. Mẫu này là hàng đặt trước chị nha.

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, em đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi nhé.
```

**USABLE** — Giỏ thành beL×2 đúng yêu cầu, xác nhận thực hiện có receipt. Cập nhật số lượng còn giọng hệ thống nhẹ, chưa cần viết lại toàn câu.

## stateful-1 — ca3 — stateful-quote

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ, em thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi nhé. Mẫu này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ, em đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi nhé.

Khách: Hai áo cả phí ship là bao nhiêu em?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, 2 áo Thạch Thảo size L của mình là 998.000đ, phí ship 30.000đ (được giảm 49.900đ), tổng thanh toán là 978.100đ chị nhé.
```

**USABLE** — Báo998k,ship30k,giảm49.9k,tổng978.1k khớp quote. Ngoặc giảm đặt sau phí ship dễ đọc nhầm phạm vi, nên trình bày ưu đãi riêng; chưa tự kết luận đã giảm phí ship khi toàn phép tính đúng.

## stateful-1 — ca4 — stateful-correction

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ, em thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi nhé. Mẫu này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ, em đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi nhé.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, 2 áo Thạch Thảo size L của mình là 998.000đ, phí ship 30.000đ (được giảm 49.900đ), tổng thanh toán là 978.100đ chị nhé.

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, em cập nhật lại số đo mới (eo 74, mông 96) và giữ nguyên áo size L cho chị nhé.
```

**NEEDS_EDIT** — State sửa đúng eo74/mông96 và giữL×2, nhưng reply còn kiểu báo cáo cập nhật lại số đo mới kèm ngoặc đọc lại. Theo yêu cầu owner về cách xác nhận sửa hồ sơ, cần viết lại giọng. Không fail chỉ vì trích hai số đo hoặc tự đổi receipt/state để chữa giọng.

## stateful-1 — ca5 — stateful-request-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ, em thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi nhé. Mẫu này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ, em đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi nhé.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, 2 áo Thạch Thảo size L của mình là 998.000đ, phí ship 30.000đ (được giảm 49.900đ), tổng thanh toán là 978.100đ chị nhé.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ, em cập nhật lại số đo mới (eo 74, mông 96) và giữ nguyên áo size L cho chị nhé.

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Kết quả actual (NO_SEND /CHECKOUT_DETAILS_MISSING):

```text
Chị gửi thêm [NAME]
```

**USABLE** — Code tạo yêu cầu bổ sung checkout; model NO_SEND không có nghĩa khách không nhận gì: actual capture có lời mời. Bản hiển thị đã redacted nên không suy câu [NAME] là exact lời khách thực nghe hay chấm mất dữ liệu từ redactor.

## stateful-1 — ca6 — stateful-private-checkout

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ, em thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi nhé. Mẫu này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ, em đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi nhé.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, 2 áo Thạch Thảo size L của mình là 998.000đ, phí ship 30.000đ (được giảm 49.900đ), tổng thanh toán là 978.100đ chị nhé.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ, em cập nhật lại số đo mới (eo 74, mông 96) và giữ nguyên áo size L cho chị nhé.

customer: Chị đặt hai áo này nhé, lên đơn cho chị.

shop: Chị gửi thêm [NAME]

Khách: [Thông tin checkout riêng tư được xử lý trong code]

Kết quả actual (NO_SEND /PRIVATE_CHECKOUT_COMMITTED):

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

**USABLE** — Private code-only intake tạo preview đúngbeL×2,COD,tổng978.1k,preorder/ETA8–14; không modelgeneration ở lượt riêng tư. Preview là code output, không chấm như giọng model hoặc gọi là đơnPOS đã tạo.

## stateful-1 — ca7 — stateful-confirm

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ, em thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi nhé. Mẫu này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ, em đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi nhé.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, 2 áo Thạch Thảo size L của mình là 998.000đ, phí ship 30.000đ (được giảm 49.900đ), tổng thanh toán là 978.100đ chị nhé.

customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

shop: Dạ, em cập nhật lại số đo mới (eo 74, mông 96) và giữ nguyên áo size L cho chị nhé.

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

Kết quả actual (HANDOFF /PURCHASE_CONFIRMED):

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```

**USABLE** — PURCHASE_CONFIRMED đi cùng actual tin chuyển nhân viên kiểm tra/lên đơn, đúng quy trình owner chấp nhận. Không xem staff action là bot tự tạoPOSorder.

## stateful-1 — ca8 — stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Kết quả actual (HANDOFF /CUSTOMER_REQUESTED_HUMAN):

```text
[Không gửi thêm tin; xem ownership control]
```

**OWNERSHIP_CONTROL** — Yêu cầu người thật chuyểnHUMAN/handoff và actual im lặng theo control; không đánh silent là câu tư vấn thiếu hoặc verifierPASS.

## b1-1 — ca1 — b1-changed-occasion

customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.

shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Set Thạch Thảo chất tơ và ren mềm nên ngồi ô tô gần 3 tiếng sẽ dễ bị hằn nếp nhăn ở tà áo với chân váy đó chị.

Nếu đi xe lâu, chị chuyển sang váy Diệp An giúp em nhé. Mẫu này thiết kế 2 lớp đứng form với dáng suông nhẹ, hạn chế nhăn nhiều và ngồi xe thoải mái hơn, mặc đi đám cưới vừa thanh lịch vừa gọn gàng ạ.
```

**USABLE** — Đổi lời khuyên và tìm váy Diệp An theo việc đi xe lâu, có phương án mua cụ thể; không chỉ từ chối tư vấn. Giọng chuyển sang giúp em còn gượng. Những nhận xét so nhăn/thoải mái mạnh được ghi cần đối chiếu nguồn sau primary, không tự yêu cầu phép thử mọi lợi ích hoặc adjudicate unsafe trước khi đọc source.

## b1-1 — ca2 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, thời gian hỗ trợ đổi hàng bên em là 15 ngày kể từ khi nhận nên đơn của mình vẫn đổi màu được chị nhé. Phí vận chuyển 2 chiều khi đổi là 30.000đ ạ.

Chị muốn đổi sang màu nào để em hỗ trợ mình nhé?
```

**USABLE** — Dùng mốc15ngày hiện tại thắng7ngày trong history, báo30k đúng phần khách hỏi và dựa tình trạng chỉ cầm ngắm/còn tem. Không bắt đọc mọi điều kiện chưa giặt/sạch/không mùi để được đạt; câu hỏi màu là bước làm rõ lựa chọn, chưa báo đã đổi/handoff.

## b1-1 — ca3 — b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Set Thạch Thảo có phần áo may bằng tơ Hàn thêu họa tiết nổi, vải mềm thoáng và có độ bay tự nhiên; chân váy dùng chất liệu ren tơ Hàn mềm mại với độ rũ tự nhiên chị ạ. Dạ phần giá và thông tin tồn kho của size M hiện tại em chưa tra được thông tin.
```

**USABLE** — Trả chất liệu cả hai phần, giữ giá/tồn sizeM chưa tra được đúng nguồn bị fault. Giọng còn đọc mô tả nhưng không bịa hoặc hứa theo dõi; nguồn thiếu được ghi riêng với chất lượng tư vấn.

## b1-1 — ca4 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, set váy Thạch Thảo (SV2447) bên em có bán cả bộ lẫn mua lẻ từng món nha chị:
- Cả bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ

Chị muốn lấy cả bộ hay mua lẻ món nào ạ?
```

**NEEDS_EDIT** — Khách hỏi giá set cụ thể; trả thêm cả bảng giá lẻ rồi hỏi mua cả bộ hay lẻ làm mở lại phạm vi khách đã nêu. Đây là thiếu tập trung ở toàn đoạn, không fail chỉ vì danh sách/ngoặc hoặc cấm chủ động bán thêm.

## b1-1 — ca5 — b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Kết quả actual (FALLBACK /PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual chỉ là fallback PROVIDER_ERROR nên chưa trả được giá/tồn khách cần. Giữ nguyên lỗi trong denominator; chưa quy cho owner hay verifier trước diagnosis.

## b1-1 — ca6 — b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, áo dài SD375 có giá 929.000đ cho áo lẻ và 1.065.000đ nếu chị lấy cả bộ ạ.
```

**USABLE** — Tìm đúng mã áo dài rồi báo rõ giá áo lẻ/cả bộ. Cách mua có thể cần phân biệt khi chỉ gọi áo dài; hai giá không tự thành lỗi dư thông tin nghiêm trọng.

## b1-1 — ca7 — b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Mặc đi tiệc ban ngày rất hợp và không bị rườm rà đâu chị nhé. Chân váy dùng chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên nên nhìn rất bay bổng, thanh nhã chứ không bị cứng hay nặng nề.

Cả bộ có giá 799.000đ, hoàn toàn nằm trong ngân sách 900.000đ của chị ạ.
```

**USABLE** — Chọn set đi tiệc, nhận xét form/rũ làm tổng thể nhẹ hơn và báo đúng799k trong ngân sách, không CTA ngoài capability. Suy luận thẩm mỹ được phép; giọng còn bay bổng/thanh nhã nhưng không cần đổi lời khuyên để được đạt.

## b1-1 — ca8 — b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, sản phẩm mình đã qua sử dụng nên shop không hỗ trợ đổi hàng được chị nhé. Trường hợp đổi hàng hợp lệ, phí vận chuyển 2 chiều là 30.000đ do chị chịu ạ.
```

**USABLE** — Từ chối thẳng vì đã mặc đi làm; chỉ báo30k cho trường hợp đổi hợp lệ. Không mở đầu đồng ý rồi đọc điều kiện không đáp ứng.

## b1-1 — ca9 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Áo chất tơ Hàn với chân váy ren tơ mềm và thoáng lắm chị ạ, lại có độ bay tự nhiên nên mặc ngoài trời không bị bí hay nặng nề đâu chị nhé.
```

**NEEDS_EDIT** — Khách dễ nóng và phải ở ngoài trời lâu, reply biến mô tả thoáng thành trấn an không bị bí, không phân định rủi ro theo hoàn cảnh. Giọng ngắn nhưng kết luận mạnh. Giữ đây là finding về mức trấn an/căn cứ; chưa tự adjudicate falsePASS hay cấm suy luận chất liệu.

## b1-1 — ca10 — b1-current-policy-v2

customer: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ vẫn kịp chị nhé, thời hạn đổi là 15 ngày kể từ lúc nhận hàng. Phí ship đổi 2 chiều hiện là 30 nghìn chị ạ. Chị muốn đổi sang size mấy để em kiểm tra nhé.
```

**USABLE** — Trả đúng vẫn kịp về thời hạn15ngày và phí30k hiện tại, không lặp25k cũ. Hỏi size để kiểm tra lựa chọn là bước đọc tiếp có thể làm, không đồng nghĩa tư vấn mặc vừa hay đã đổi hàng.

## b1-1 — ca11 — b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Chân váy được làm từ chất liệu ren tơ Hàn mềm, có form nhẹ và độ rũ tự nhiên ạ. Còn về giá, tình trạng size M hay việc mua riêng chân váy thì hiện em chưa tra được thông tin.
```

**USABLE** — Trả phần vải/dáng có nguồn và nói chưa tra được giá/tồn/offer trong faultmode. Câu về mua riêng còn giống mô tả dữ liệu hơn lời bán hàng nhưng không tự suy thành không bán lẻ; không đánh thiếu nguồn là lỗi bịa của model.

## b1-1 — ca12 — b1-price-v2

customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, set váy Thạch Thảo giá cả bộ là 799.000đ chị nhé (nếu mua lẻ thì áo 499.000đ, chân váy 449.000đ ạ).
```

**USABLE** — Báo đúng799k cả bộ; thêm hai giá lẻ trong ngoặc chưa cần nhưng không lấn át câu trả lời hoặc mở lại lựa chọn. Chỉ là polish, không fail vì có ngoặc.

## b1-1 — ca13 — b1-component-stock-v2

customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Chân váy Thạch Thảo size M nhà em còn hàng chị nhé, mua riêng là 449k ạ.
```

**USABLE** — Báo tồn sizeM và giá449k chân váy rời gọn, đúng phạm vi khách hỏi; không suy mặc vừa.

## b1-1 — ca14 — b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ shop có chị nhé. Set váy Khánh Trang nhà em có bán cả bộ lẫn mua lẻ từng món ạ:

- Cả bộ (gồm áo và chân váy): 999.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 499.000đ

Chị muốn lấy cả set hay mua lẻ món nào ạ?
```

**USABLE** — Tìm đúng set Khánh Trang, có giá cả bộ999k và hai giá lẻ499k được phân biệt rõ. Có thể gọn hơn/không cần hỏi chọn lẻ, nhưng vẫn trả được nhu cầu tìm mẫu và giá; chưa coi mọi phần bán thêm là lỗi.

## b1-1 — ca15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, đi ăn cưới ban ngày thì set này rất hợp chị ạ, vừa trang nhã lại lịch sự.

Set này form nhẹ nhàng, chất tơ thêu và ren có độ bay và rũ tự nhiên chứ không bị bồng bềnh hay cầu kỳ quá mức đâu chị. Chị hay mặc đồ trơn diện set này sẽ thấy vừa đủ điểm nhấn sang trọng, thanh lịch cho ngày vui mà không bị quá điệu hay lố chút nào cả. Mình lấy cả bộ (799k) mặc đi ăn cưới là chuẩn đẹp luôn chị nhé.
```

**NEEDS_EDIT** — Có lựa chọn cả bộ799k rõ, nhưng phần thuyết phục kéo dài chuỗi trang nhã/lịch sự/bay/rũ/sang trọng/thanh lịch/chuẩn đẹp và phủ nhận quá điệu/lố, chưa xử lý gu đồ trơn bằng lập luận có sức nặng. Lỗi là cả đoạn dài và khen chung, không đếm tính từ hay ép đổi món.

## b1-1 — ca16 — b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm chưa được mặc thử vào người (chỉ ướm bên ngoài), nên trường hợp chị đã mặc thử thì shop chưa hỗ trợ đổi size được ạ.
```

**USABLE** — Hiểu đã mặc thử vào người và từ chối theo nguồn chỉ cho ướm ngoài. Không đọc checklist thừa; giọng còn quy định hơi cứng nhưng kết luận phù hợp.

## b1-1 — ca17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả actual (FALLBACK /FAIL):

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual fallback FAIL không giúp chọn áo hay bộ cho hoàn cảnh mới. Chưa đọc draft/verdict để giải thích vì sao; không tính draft chưa gửi thành kết quả bán hàng.

## b1-1 — ca18 — b1-current-policy-v3

customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, bên em hiện áp dụng thời gian đổi trong 15 ngày nên mình vẫn đổi size được bình thường chị nhé. Phí đổi hàng hai chiều là 30.000đ ạ. Chị muốn đổi sang size mấy để em hỗ trợ mình nhé?
```

**USABLE** — Dùng15ngày mới và ngữ cảnh chỉ mở xem/cất để trả lời, nêu30k và hỏi size. Không bắt lặp mọi điều kiện đã ngầm phù hợp; chưa nói đã thực hiện đổi hoặc bàn giao.

## b1-1 — ca19 — b1-partial-source-v3

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, áo của set này làm từ tơ Hàn thêu với họa tiết thêu nổi, chất vải mềm, thoáng và có độ bay tự nhiên chị ạ. Còn chân váy là ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên.

Về giá và tình trạng còn hàng thì hiện em chưa tra được thông tin chi tiết ạ.
```

**USABLE** — Trả vải áo/váy và nói chưa tra được giá/tồn khi POS fault, không bịa số. Giọng còn mô tả nhưng source limitation riêng, chưa hoàn tất bán hàng.

## b1-1 — ca20 — b1-price-v3

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, nguyên set Thạch Thảo có giá 799.000đ chị nhé.
```

**USABLE** — Một câu báo đúng799k nguyên set, dùng được ngay.

## b1-1 — ca21 — b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, áo Thạch Thảo nhà em có bán lẻ chị nhé. Áo size M hiện còn hàng, giá 499k ạ. Chị lấy mẫu này em lên đơn giúp chị nhé!
```

**NEEDS_EDIT** — Giá499k/tồnM và bán lẻ được trả rõ, nhưng câu em lên đơn giúp chị đề nghị bước B1 không có. Không gọi đây là effect đã thực hiện hay câu tự nhiên bị cấm; lỗi nằm ở khả năng thực thi bước tiếp theo.

## b1-1 — ca22 — b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, mẫu Set quần Xuân Thảo (SQ223) bên em vẫn còn hàng chị nhé. Mẫu này mình có thể lấy cả bộ hoặc mua lẻ tùy ý:

- Cả bộ: 699.000đ
- Áo lẻ hoặc quần lẻ: 429.000đ mỗi món

Chị muốn lấy cả bộ hay mua lẻ món nào thì nhắn em nhé ạ.
```

**USABLE** — Tìm đúng SQ223, báo tồn và phân biệt699kset/429kmỗi món; nhiều thông tin hơn cần nhưng có ích cho lựa chọn bán hàng và không làm mất yêu cầu chính.

## b1-1 — ca23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, với ngân sách 850 nghìn thì chị lấy cả bộ 799.000đ vẫn hoàn toàn vừa vặn ạ.

Em nghiêng về phương án lấy cả bộ vì sẽ giúp chị linh hoạt hơn rất nhiều: chị vừa có set váy thêu ren đồng bộ rất đẹp cho những dịp cần chỉn chu, vừa có thể tách áo ra phối với chân váy đen sẵn có ở nhà, hoặc dùng chân váy ren kết hợp với các kiểu áo khác để mặc lại nhiều lần mà không bị nhàm chán.

Chị lấy cả bộ Thạch Thảo luôn nhé ạ?
```

**USABLE** — Upsell set799k trong850k có lý do mặc nguyên bộ và tách áo với váy đen khách có, tách váy với áo khác. Dài và quảng cáo hơn mẫu mong muốn nhưng lời khuyên mua có ích; không bắt rẻ hơn hay CTA mới đạt.

## b1-1 — ca24 — b1-policy-used-v3

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, chị ơi, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem và chưa giặt ạ. Do áo mình đã cắt tem và giặt rồi nên shop không hỗ trợ đổi sang mẫu khác được, chị thông cảm giúp em nhé.
```

**USABLE** — Từ chối do đã cắt tem/giặt, đúng tình trạng khách vừa nói; không làm khách nghe toàn bộ policy. Câu chị thông cảm giúp em là cách nói dịch vụ dùng được, không fail chỉ vì giúp em.
