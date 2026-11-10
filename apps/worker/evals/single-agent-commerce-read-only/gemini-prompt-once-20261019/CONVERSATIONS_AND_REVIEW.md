# Toàn bộ 16 lượt và whole-turn review — full Gemini prompt

Run source: `3cff648b0cfce3b68ed5b9d72a2f34fc37f18977`. Một lần mỗi ca; không dùng lại kết quả lịch sử. Primary được khóa trước khi đọc rejected drafts/verifier detail. USABLE không đồng nghĩa văn phong tốt; minor polish ghi riêng.

## stateful-1 / stateful-open

Lịch sử:
- Không có.

Khách:

> Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả khách thực nhận:

> Dạ em đã cập nhật số đo và thêm áo Thạch Thảo màu be size M (499.000đ) vào giỏ hàng cho chị rồi ạ. 
> 
> Mẫu này là hàng đặt trước (pre-order) chị nhé! Chị cần xem thêm gì hay chốt đơn luôn thì báo em ạ.

Terminal: SEND_ELIGIBLE / PASS.
Review: **USABLE** — Thêm đúng áo/be/M và số đo, giá đúng và đã báo đặt trước; câu xác nhận còn dài nhưng khách dùng được.
Public state: stage=CART_OPEN; tổng=529000đ.
Voice finding: Kể thêm cập nhật số đo; đóng bằng câu mời xem thêm/chốt chung chung dù khách đã chọn.

## stateful-1 / stateful-variant-quantity

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã cập nhật số đo và thêm áo Thạch Thảo màu be size M (499.000đ) vào giỏ hàng cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order) chị nhé! Chị cần xem thêm gì hay chốt đơn luôn thì báo em ạ.

Khách:

> Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả khách thực nhận:

> Dạ em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ. 
> 
> Mẫu này là hàng đặt trước (pre-order), chị cần chốt đơn hoặc xem thêm sản phẩm nào khác thì cứ báo em nhé!

Terminal: SEND_ELIGIBLE / PASS.
Review: **USABLE** — Đổi đúng L, số lượng hai, giữ màu be.
Public state: stage=CART_OPEN; tổng=978100đ.
Voice finding: Nhắc lại đặt trước khi trạng thái không đổi; lặp lời mời xem thêm/chốt của tin trước.

## stateful-1 / stateful-quote

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã cập nhật số đo và thêm áo Thạch Thảo màu be size M (499.000đ) vào giỏ hàng cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order) chị nhé! Chị cần xem thêm gì hay chốt đơn luôn thì báo em ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order), chị cần chốt đơn hoặc xem thêm sản phẩm nào khác thì cứ báo em nhé!

Khách:

> Hai áo cả phí ship là bao nhiêu em?

Kết quả khách thực nhận:

> Dạ, 2 chiếc áo Thạch Thảo size L của mình có giá 998.000đ, được giảm 49.900đ, cộng phí ship 30.000đ thì tổng thanh toán là **978.100đ** chị nhé!

Terminal: SEND_ELIGIBLE / PASS.
Review: **USABLE** — Trả đúng câu hỏi tổng thanh toán, nêu đúng tiền hàng, giảm giá và ship. 
Public state: stage=CART_OPEN; tổng=978100đ.

## stateful-1 / stateful-correction

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã cập nhật số đo và thêm áo Thạch Thảo màu be size M (499.000đ) vào giỏ hàng cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order) chị nhé! Chị cần xem thêm gì hay chốt đơn luôn thì báo em ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order), chị cần chốt đơn hoặc xem thêm sản phẩm nào khác thì cứ báo em nhé!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 chiếc áo Thạch Thảo size L của mình có giá 998.000đ, được giảm 49.900đ, cộng phí ship 30.000đ thì tổng thanh toán là **978.100đ** chị nhé!

Khách:

> Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả khách thực nhận:

> Dạ em đã cập nhật lại số đo vòng eo 74 và mông 96 cho chị rồi ạ. Áo Thạch Thảo size L của mình vẫn được giữ nguyên trong giỏ nhé ạ!

Terminal: SEND_ELIGIBLE / PASS.
Review: **NEEDS_EDIT** — State sửa đúng eo74/mông96 và giữ L/hai áo, không thêm kết luận vừa; nhưng cả câu là báo cập nhật hồ sơ và nhắc lại lựa chọn bằng giọng bị động.
Public state: stage=CART_OPEN; tổng=978100đ.
Voice finding: Đọc lại cả hai số đo và nói size vẫn được giữ nguyên trong giỏ; cần chỉnh giọng, không phải thiếu SIZE_FIT.

## stateful-1 / stateful-request-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã cập nhật số đo và thêm áo Thạch Thảo màu be size M (499.000đ) vào giỏ hàng cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order) chị nhé! Chị cần xem thêm gì hay chốt đơn luôn thì báo em ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order), chị cần chốt đơn hoặc xem thêm sản phẩm nào khác thì cứ báo em nhé!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 chiếc áo Thạch Thảo size L của mình có giá 998.000đ, được giảm 49.900đ, cộng phí ship 30.000đ thì tổng thanh toán là **978.100đ** chị nhé!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ em đã cập nhật lại số đo vòng eo 74 và mông 96 cho chị rồi ạ. Áo Thạch Thảo size L của mình vẫn được giữ nguyên trong giỏ nhé ạ!

Khách:

> Chị đặt hai áo này nhé, lên đơn cho chị.

Kết quả khách thực nhận:

> Chị gửi thêm [NAME]

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING.
Review: **USABLE** — Quan sát được lời mời checkout code trước private form; capture đã redacted nên không chấm đủ câu mời.
Public state: stage=CART_OPEN; tổng=978100đ.

## stateful-1 / stateful-private-checkout

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã cập nhật số đo và thêm áo Thạch Thảo màu be size M (499.000đ) vào giỏ hàng cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order) chị nhé! Chị cần xem thêm gì hay chốt đơn luôn thì báo em ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order), chị cần chốt đơn hoặc xem thêm sản phẩm nào khác thì cứ báo em nhé!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 chiếc áo Thạch Thảo size L của mình có giá 998.000đ, được giảm 49.900đ, cộng phí ship 30.000đ thì tổng thanh toán là **978.100đ** chị nhé!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ em đã cập nhật lại số đo vòng eo 74 và mông 96 cho chị rồi ạ. Áo Thạch Thảo size L của mình vẫn được giữ nguyên trong giỏ nhé ạ!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]

Khách:

> [Thông tin checkout riêng tư được xử lý trong code]

Kết quả khách thực nhận:

> Áo SV2447 màu BE, size L ×2: 998.000đ
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

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED.
Review: **USABLE** — Preview đúng hai áo be/L, tổng978100, thông tin riêng tư xử lý bằng code.
Public state: stage=ORDER_PREVIEW; tổng=978100đ.
Voice finding: Formatter dùng mã SV2447 và màu BE; bảng lựa chọn/tiền có ích, không coi danh sách kiểm đơn là lỗi.

## stateful-1 / stateful-confirm

Lịch sử:
- customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
- shop: Dạ em đã cập nhật số đo và thêm áo Thạch Thảo màu be size M (499.000đ) vào giỏ hàng cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order) chị nhé! Chị cần xem thêm gì hay chốt đơn luôn thì báo em ạ.
- customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.
- shop: Dạ em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ. 

Mẫu này là hàng đặt trước (pre-order), chị cần chốt đơn hoặc xem thêm sản phẩm nào khác thì cứ báo em nhé!
- customer: Hai áo cả phí ship là bao nhiêu em?
- shop: Dạ, 2 chiếc áo Thạch Thảo size L của mình có giá 998.000đ, được giảm 49.900đ, cộng phí ship 30.000đ thì tổng thanh toán là **978.100đ** chị nhé!
- customer: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
- shop: Dạ em đã cập nhật lại số đo vòng eo 74 và mông 96 cho chị rồi ạ. Áo Thạch Thảo size L của mình vẫn được giữ nguyên trong giỏ nhé ạ!
- customer: Chị đặt hai áo này nhé, lên đơn cho chị.
- shop: Chị gửi thêm [NAME]
- customer: [Thông tin checkout riêng tư được xử lý trong code]
- shop: Áo SV2447 màu BE, size L ×2: 998.000đ
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

> Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.

Terminal: HANDOFF / PURCHASE_CONFIRMED.
Review: **USABLE** — Đã ghi nhận xác nhận mua và chuyển xử lý đúng phạm vi, không báo tạo đơn POS xong.
Public state: stage=PURCHASE_CONFIRMED; tổng=978100đ.
Voice finding: Câu code ghi nhận xác nhận mua hàng còn hành chính; không quy cho prompt.

## stateful-1 / stateful-human-request

Lịch sử:
- Không có.

Khách:

> Cho chị gặp nhân viên shop nhé.

Kết quả khách thực nhận:

Không có tin model; ownership control riêng.

Terminal: HANDOFF / CUSTOMER_REQUESTED_HUMAN.
Review: **OWNERSHIP_CONTROL** — Control riêng: yêu cầu gặp nhân viên dẫn tới ownership handoff, không cần sinh lời tư vấn.

## b1-1 / b1-changed-occasion

Lịch sử:
- customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
- shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách:

> Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả khách thực nhận:

> Phần này em chưa trả lời được, chị nhé.

Terminal: FALLBACK / MALFORMED.
Review: **UNUSABLE** — Khách hỏi lại quyết định mua theo thời gian di chuyển nhưng thực nhận chỉ fallback; chưa phân tích rejected draft ở primary.

## b1-1 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách:

> Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả khách thực nhận:

> Chân váy của set được làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất đẹp và bay bổng chị ạ. 
> 
> Hiện tại, thông tin giá và tình trạng còn hàng riêng cho lựa chọn mua lẻ chân váy size M chưa có sẵn trên hệ thống, chị thông cảm giúp em nhé ạ!

Terminal: SEND_ELIGIBLE / PASS.
Review: **NEEDS_EDIT** — Trả được phần chất liệu, không bịa giá/tồn; không trừ vì nguồn cố ý thiếu. Cả câu còn kể hệ thống và xin thông cảm thay cho cách báo ngắn gọn trong chat.
Voice finding: Mở bằng mô tả hàng; phần thiếu nói chưa có sẵn trên hệ thống và chồng lời lễ phép.

## b1-1 / b1-buying-concern

Lịch sử:
- Không có.

Khách:

> Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả khách thực nhận:

> Dạ set Thạch Thảo này mặc đi tiệc ban ngày rất sang và thanh thoát, không bị rườm rà đâu chị ạ. 
> 
> Chất chân váy là ren tơ Hàn mềm có độ rũ tự nhiên, kết hợp cùng áo tơ thêu form nhẹ nhàng, bay bổng nên diện lên vừa lịch sự, nổi bật lại rất nhã nhặn, phù hợp với không gian tiệc ban ngày. 
> 
> Thêm nữa, giá cả bộ nguyên set là 799.000đ, hoàn toàn vừa vặn trong ngân sách 900.000đ của chị luôn nhé ạ!

Terminal: SEND_ELIGIBLE / PASS.
Review: **NEEDS_EDIT** — Có nhận định và giá đúng, nhưng lời giải thích dùng mềm/rũ cùng chuỗi lời khen để phủ nhận nỗi lo nhiều ren, chưa giúp khách hiểu rõ vì sao nên chọn.
Voice finding: Ba đoạn quảng cáo, nối thêm ngân sách đã biết; vấn đề là lập luận và nhịp chat, không phải một từ riêng lẻ.

## b1-1 / b1-search-read

Lịch sử:
- Không có.

Khách:

> Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả khách thực nhận:

> Áo dài mã SD375 hiện có 2 lựa chọn cho chị:
> 
> - Áo lẻ: 929.000đ
> - Cả bộ: 1.065.000đ
> 
> Cả hai lựa chọn đều đang có sẵn hàng. Chị muốn chọn mua áo lẻ hay cả bộ ạ?

Terminal: SEND_ELIGIBLE / PASS.
Review: **USABLE** — Tìm đúng SD375, trả rõ áo lẻ929000/cả bộ1065000; nguồn có tồn cho cả hai.
Voice finding: Có thể bỏ lời mời chọn khi khách chỉ hỏi giá; đây là polish, không phải lý do loại câu.

## advice-1 / b1-changed-occasion

Lịch sử:
- customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
- shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách:

> Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả khách thực nhận:

> Phần này em chưa trả lời được, chị nhé.

Terminal: FALLBACK / MALFORMED.
Review: **UNUSABLE** — Lượt replay cũng thực nhận fallback cho nỗi lo đi xe lâu/nhăn; giữ trong denominator.

## advice-1 / b1-partial-source-v2

Lịch sử:
- Không có.

Khách:

> Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả khách thực nhận:

> Chân váy Thạch Thảo làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất bay bổng ạ. 
> 
> Dạ hiện tại hệ thống bên em chưa có sẵn thông tin giá và tình trạng tồn kho riêng cho phần chân váy size M này, chị thông cảm nha.

Terminal: SEND_ELIGIBLE / PASS.
Review: **NEEDS_EDIT** — Trả phần chất liệu và không bịa phần giá/tồn mà capture không có; giọng vẫn báo hệ thống và xin thông cảm.
Voice finding: Lặp cụm ren mềm/form nhẹ/độ rũ/bay bổng; phần thiếu dữ liệu còn dài hơn mức cần thiết.

## advice-1 / b1-buying-concern

Lịch sử:
- Không có.

Khách:

> Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả khách thực nhận:

> Dạ, chân váy của set này dùng ren tơ Hàn mềm với độ rũ tự nhiên nên khi mặc đi tiệc ban ngày rất thanh thoát, nhẹ nhàng chứ không bị rườm rà đâu chị nha. Kết hợp cùng áo tơ thêu form nhẹ tạo cảm giác bay bổng và rất sang. 
> 
> Nguyên set có giá 799.000đ, hoàn toàn nằm trong ngân sách 900 nghìn của mình đó ạ.

Terminal: SEND_ELIGIBLE / PASS.
Review: **NEEDS_EDIT** — Có trả lời băn khoăn và giá, nhưng lý do chưa vượt khỏi mô tả vải và khen chung; không coi tư vấn thẩm mỹ này là vi phạm an toàn.
Voice finding: Vẫn chuỗi nhẹ nhàng/thanh thoát/bay bổng/sang và lặp ngân sách.

## advice-1 / b1-search-read

Lịch sử:
- Không có.

Khách:

> Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả khách thực nhận:

> Áo dài mã SD375 hiện có 2 phiên bản với mức giá như sau ạ:
> 
> - Bản áo: 929.000đ
> - Bản composite: 1.065.000đ
> 
> Cả hai phiên bản đều đang có sẵn hàng. Chị ưng phiên bản nào hoặc cần em tư vấn thêm thông tin gì cứ nhắn em nhé ạ!

Terminal: SEND_ELIGIBLE / PASS.
Review: **NEEDS_EDIT** — Giá và tồn đúng, nhưng gọi lựa chọn là bản composite không cho khách biết gồm những món nào.
Voice finding: Đưa thuật ngữ loại bán nội bộ vào lời tư vấn; kết thúc bằng lời mời chung chung.

