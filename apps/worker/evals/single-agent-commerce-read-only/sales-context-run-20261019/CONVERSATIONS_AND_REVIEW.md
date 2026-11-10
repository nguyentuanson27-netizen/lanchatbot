# Toàn bộ hội thoại và primary review — sales context run

16 slots N1; review lời khách thực nhận và public state trước rejected-draft/verdict diagnosis. Private checkout được che thông tin. Các lượt advice dùng context của integrated tương ứng, không phải hội thoại độc lập.

## stateful-1 / stateful-open

Lịch sử:
- Không có.

Khách:

> Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả khách thực nhận:

> Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé. Chị có cần xem thêm gì nữa không ạ?

Primary: **USABLE** — Nhận đúng lựa chọn áo lẻ/be/M, đã thêm giỏ và báo hàng đặt trước; không tự kết luận mặc vừa.
Public state: CART_OPEN; tổng 529000đ.
Giọng/cách tư vấn: Có thể bỏ từ pre-order và câu hỏi xem thêm chung chung khi khách đã chọn mua.

## stateful-1 / stateful-variant-quantity

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé. Chị có cần xem thêm gì nữa không ạ?

Khách:

> Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả khách thực nhận:

> Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.

Primary: **USABLE** — Đổi đúng hai áo size L, giữ màu be; xác nhận gọn đúng thao tác và lựa chọn hiện tại.
Public state: CART_OPEN; tổng 978100đ.

## stateful-1 / stateful-quote

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé. Chị có cần xem thêm gì nữa không ạ?
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.

Khách:

> Hai áo cả phí ship là bao nhiêu em?

Kết quả khách thực nhận:

> Dạ hai áo Thạch Thảo màu be size L có tổng tiền hàng là 998.000đ, được giảm 49.900đ và phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé!

Primary: **USABLE** — Trả đúng câu hỏi hai áo cả ship: 998.000đ trừ 49.900đ cộng ship 30.000đ thành 978.100đ. Các số có mục đích giải thích tổng khách đang hỏi.
Public state: CART_OPEN; tổng 978100đ.
Giọng/cách tư vấn: Có thể đưa tổng thanh toán lên trước rồi giải thích ngắn.

## stateful-1 / stateful-correction

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé. Chị có cần xem thêm gì nữa không ạ?
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ hai áo Thạch Thảo màu be size L có tổng tiền hàng là 998.000đ, được giảm 49.900đ và phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé!

Khách:

> Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả khách thực nhận:

> Dạ em đã cập nhật lại số đo vòng eo 74 và mông 96 cho chị rồi ạ. Áo size L chị vẫn giữ nguyên trong giỏ nhé!

Primary: **NEEDS_EDIT** — State sửa đúng eo74/mông96 và giữ hai áo L, nhưng cả lời tiếp nhận vẫn như báo cáo cập nhật hồ sơ, rồi mô tả trạng thái giỏ. Cần viết lại lời xác nhận mua cho tự nhiên theo yêu cầu owner; không loại chỉ vì nhắc hai số đo và không ghi đây là lỗi fit.
Public state: CART_OPEN; tổng 978100đ.
Giọng/cách tư vấn: Câu cập nhật số đo rồi giữ nguyên trong giỏ chưa thoát giọng hành chính; một dẫn chứng ngắn hợp lý vẫn được phép.

## stateful-1 / stateful-request-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé. Chị có cần xem thêm gì nữa không ạ?
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ hai áo Thạch Thảo màu be size L có tổng tiền hàng là 998.000đ, được giảm 49.900đ và phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ em đã cập nhật lại số đo vòng eo 74 và mông 96 cho chị rồi ạ. Áo size L chị vẫn giữ nguyên trong giỏ nhé!

Khách:

> Chị đặt hai áo này nhé, lên đơn cho chị.

Kết quả khách thực nhận:

> Chị gửi thêm [NAME]

Primary: **USABLE** — Khách yêu cầu lên đơn và code thực sự phát lời mời bổ sung thông tin nhận hàng; không để model tự thu PII. Artifact đã redact nên chỉ đánh giá bước mua được nối, không chấm chi tiết literal bị che.
Public state: CART_OPEN; tổng 978100đ.

## stateful-1 / stateful-private-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé. Chị có cần xem thêm gì nữa không ạ?
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ hai áo Thạch Thảo màu be size L có tổng tiền hàng là 998.000đ, được giảm 49.900đ và phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ em đã cập nhật lại số đo vòng eo 74 và mông 96 cho chị rồi ạ. Áo size L chị vẫn giữ nguyên trong giỏ nhé!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]

Khách:

> [Thông tin checkout riêng tư được xử lý trong code]

Kết quả khách thực nhận:

> 2 áo SV2447 màu be, size L: 998.000đ
> Tạm tính: 998.000đ
> Ưu đãi: -49.900đ
> Phí ship: 30.000đ
> Tổng: 978.100đ
> SV2447: hàng đặt trước
> Người nhận: Khách thử nghiệm - [PHONE]
> [ADDRESS]
> Thanh toán: COD
> Dự kiến nhận hàng: 8-14 ngày.
> Chị xác nhận chốt đơn nhé.

Primary: **USABLE** — Private code path tạo preview đúng hai áo be/L, giảm giá/ship/tổng978100 và ETA8–14 ngày; không có model request. Formatter giữ rõ món và cấu hình để khách xác nhận.
Public state: ORDER_PREVIEW; tổng 978100đ.
Giọng/cách tư vấn: Preview vẫn dùng mã SV2447 do chưa có tên đã bind tại formatter.

## stateful-1 / stateful-confirm

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé. Chị có cần xem thêm gì nữa không ạ?
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ hai áo Thạch Thảo màu be size L có tổng tiền hàng là 998.000đ, được giảm 49.900đ và phí ship 30.000đ, tổng thanh toán là 978.100đ chị nhé!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ em đã cập nhật lại số đo vòng eo 74 và mông 96 cho chị rồi ạ. Áo size L chị vẫn giữ nguyên trong giỏ nhé!
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

Khách:

> Chốt đơn cho chị nhé.

Kết quả khách thực nhận:

> Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.

Primary: **USABLE** — Sau preview, khách chốt mua; code ghi nhận PURCHASE_CONFIRMED và phát câu chuyển nhân viên kiểm tra/lên đơn. Không báo đã tạo đơn POS. Câu mới tự nhiên và rõ bước mua hơn câu ghi nhận xác nhận cũ.
Public state: PURCHASE_CONFIRMED; tổng 978100đ.

## stateful-1 / stateful-human-request

Lịch sử:
- Không có.

Khách:

> Cho chị gặp nhân viên shop nhé.

Kết quả khách thực nhận:

Không có tin model; ownership control riêng.

Primary: **OWNERSHIP_CONTROL** — Khách yêu cầu nhân viên; đây là control chuyển ownership, không phải ca tư vấn cần phát một tin model.
Public state: DISCOVERY; tổng Noneđ.

## b1-1 / b1-changed-occasion

Lịch sử:
- customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
- shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách:

> Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả khách thực nhận:

> Set Thạch Thảo dùng vải tơ Hàn và ren tơ mềm, có độ bay bổng nên khi chị ngồi ô tô gần 3 tiếng sẽ dễ bị hằn nếp nhăn ở phần tơ và váy ạ.
>
> Nếu chị muốn hạn chế nhăn khi di chuyển đường dài, shop gợi ý sang **Set váy Khánh Trang** nhé. Mẫu này dùng chất liệu thô boi phối ren, vải đanh và giữ form tốt hơn tơ mềm nên sẽ ít nhăn hơn khi ngồi xe lâu, form suông nhẹ mặc vừa thoải mái lại vừa thanh lịch để đi đám cưới. Chị tham khảo qua mẫu này xem sao nha!

Primary: **USABLE** — Đọc cả việc khách đổi ưu tiên vì ngồi xe dài; đề xuất một set Khánh Trang của shop thay cho Thạch Thảo và giải thích bằng so sánh chất liệu, vẫn bám dịp cưới. Đây là lời khuyên bán hàng có lựa chọn rõ, không bắt đổi món chỉ để đạt rubric.
Giọng/cách tư vấn: Câu mở nhắc gần trọn thời gian đi xe và phần giải thích còn dài; có thể vào đề xuất sớm hơn.

## b1-1 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách:

> Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả khách thực nhận:

> Chân váy Thạch Thảo được làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất bay bổng ạ.
>
> Dạ hiện tại hệ thống chưa ghi nhận thông tin bán lẻ riêng chân váy hay giá/tồn kho chi tiết từng phần trong set, nên em chưa thể xác nhận việc tách bán lẻ hoặc báo giá chính xác size M cho chị nha.

Primary: **NEEDS_EDIT** — Trả đúng phần chất liệu/dáng và không tự xác nhận bán lẻ hay bịa giá/tồn khi nguồn bị cố ý ngắt. Đoạn sau lại giải thích hệ thống chưa ghi nhận, chưa thể xác nhận theo giọng nội bộ; cần viết lại câu báo phần chưa tra được cho khách dễ hiểu. Không trừ vì fixture thiếu nguồn.
Giọng/cách tư vấn: Đoạn về hệ thống, giá/tồn từng phần dài và hành chính, chưa giống shop đang nhắn trực tiếp.

## b1-1 / b1-buying-concern

Lịch sử:
- Không có.

Khách:

> Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả khách thực nhận:

> Dạ nguyên bộ này giá 799.000đ, hoàn toàn vừa vặn trong ngân sách 900.000đ của chị ạ.
>
> Chị yên tâm là set này mặc đi tiệc ban ngày không bị rườm rà đâu ạ. Phần chân váy dùng ren tơ Hàn mềm với form nhẹ và độ rũ tự nhiên, kết hợp cùng áo tơ thêu thanh thoát nên tổng thể lên form rất bay bổng, nhã nhặn chứ không bị nặng nề hay cứng nhắc nhé ạ.

Primary: **USABLE** — Shop đưa nhận định rõ bộ này hợp tiệc ban ngày, giải thích tổng thể nhẹ/rũ và giá799k nằm trong khả năng chi. Suy luận thẩm mỹ hợp lệ; không buộc lý do phải theo cách diễn đạt khác của evaluator.
Giọng/cách tư vấn: Mở bằng nhắc lại ngân sách và nối nhiều tính từ; phần thuyết phục/nhịp chat vẫn chưa nổi bật. Xếp là góp ý giọng, không tự đổi nhãn chỉ vì có chữ mềm/rũ.

## b1-1 / b1-search-read

Lịch sử:
- Không có.

Khách:

> Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả khách thực nhận:

> Dạ áo dài mã SD375 hiện có giá 929.000đ nếu mua áo lẻ và 1.065.000đ nếu mua cả bộ chị nha. Cả hai phân loại này đều đang có sẵn hàng ạ.

Primary: **USABLE** — Tra đúng SD375, báo rõ áo lẻ929k/cả bộ1.065k và tồn; không bắt khách nhắc lại mã, không dùng AO/COMPOSITE làm lời tư vấn.
Giọng/cách tư vấn: Phân loại là từ bán hàng hơi máy, có thể bỏ mà vẫn rõ hai lựa chọn.

## advice-1 / b1-changed-occasion

Lịch sử:
- customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
- shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách:

> Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả khách thực nhận:

> Dạ, set Thạch Thảo dùng chất tơ Hàn và ren tơ Hàn bay bổng nên khi ngồi ô tô gần 3 tiếng thì khó tránh khỏi việc bị hằn nếp nhăn nhẹ ạ.
>
> Nếu chị ưu tiên mẫu ít nhăn hơn để thoải mái di chuyển, em đổi sang **Set váy Thanh Vũ** nhé. Mẫu này dùng chân váy chất tơ crep kết hợp áo ren dệt sợi cotton, chất tơ crep có độ đanh và ít nhăn hơn, giúp giữ form gọn gàng hơn trong suốt chuyến đi dài ạ.

Primary: **USABLE** — Trên đúng captured context, chọn một set Thanh Vũ và nối đặc điểm chân váy tơ crep với ưu tiên ít nhăn khi đi xe; vẫn dẫn khách về một món của shop. Đây là quan sát advice phụ thuộc context integrated, không phải một giao dịch live khác.
Giọng/cách tư vấn: Còn lặp thời gian đi xe và dùng lời trấn an dài. Hai surface chọn hai mẫu khác nhau nên không coi đây là phương án tối ưu duy nhất.

## advice-1 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách:

> Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả khách thực nhận:

> Dạ, chân váy Thạch Thảo làm từ chất ren tơ Hàn mềm mại, form nhẹ và có độ rũ tự nhiên rất thướt tha ạ.
>
> Mẫu này thiết kế gồm cả áo và chân váy, hiện hệ thống chưa có thông tin bán lẻ riêng chân váy hay giá và tình trạng size M nên em chưa kiểm tra được chính xác cho mình nha chị ơi.

Primary: **NEEDS_EDIT** — Nêu đúng chất ren/dáng rũ, giữ chưa biết bán lẻ/giá/tồn size M thay vì tự hứa shop có bán. Cần viết lại toàn đoạn giải thích hệ thống theo lời shop trực tiếp, gọn hơn; giới hạn nguồn được ghi riêng.
Giọng/cách tư vấn: Nhắc thiết kế cả set rồi giải thích thiếu thông tin trong hệ thống, thêm nhiều lời đệm ở cuối.

## advice-1 / b1-buying-concern

Lịch sử:
- Không có.

Khách:

> Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả khách thực nhận:

> Dạ, chân váy dùng ren tơ Hàn mềm với form nhẹ và có độ rũ tự nhiên nên mặc đi tiệc ban ngày nhìn rất thanh thoát, không bị cứng hay rườm rà quá đâu chị nhé.
>
> Ngân sách 900 nghìn của mình thoải mái chọn nguyên bộ luôn ạ, giá nguyên set là 799.000đ. Hoặc nếu chị muốn tiết chế bớt ren, mình có thể lấy riêng áo thêu (499.000đ) phối với đồ đơn giản sẵn có ở nhà. Chị thích phương án nguyên bộ hay tách lẻ hơn ạ?

Primary: **USABLE** — Gỡ lo nhiều ren bằng hai lựa chọn mua có mục đích: cả bộ799k hoặc riêng áo thêu499k phối đồ đơn giản sẵn có để bớt ren. Không khuyên lấy riêng chân váy ren như cách giảm ren; câu hỏi cuối phân biệt đúng lựa chọn mua.
Giọng/cách tư vấn: Còn nhắc lại ngân sách và lời khen; không coi hai lựa chọn có lý do rõ là liệt kê thừa.

## advice-1 / b1-search-read

Lịch sử:
- Không có.

Khách:

> Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả khách thực nhận:

> Áo dài mã SD375 hiện có giá 929.000đ cho phần áo lẻ và 1.065.000đ nếu chị lấy cả bộ ạ. Cả hai phân loại này đều đang có sẵn hàng nha chị.

Primary: **USABLE** — Báo đúng hai giá SD375 và diễn giải áo lẻ/cả bộ, giữ tồn có nguồn; không còn mã loại bán nội bộ như replay vòng trước.
Giọng/cách tư vấn: Từ phân loại còn hơi máy nhưng không làm khách hiểu nhầm món mua.
