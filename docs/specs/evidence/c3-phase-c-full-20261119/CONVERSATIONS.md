# Phase C — lịch sử 34 ca / 55 lượt

Mỗi ca được chọn một lần trên cùng source và snapshot. Tin shop là nội dung được Outbox test nhận. Ảnh ghi theo mã sản phẩm nếu xác định được. Tên, điện thoại và địa chỉ checkout giả lập đã ẩn.

## P06

**TASK_OK**. Báo 989.000đ cho combo 3 món và 1.019.000đ cả ship. Có ảnh đúng mẫu, không đoán loại của từng món.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Em tính cả ba món cho chị bao nhiêu?

**Shop**

> Cả bộ gồm ba món có giá 989.000đ (tổng cộng gồm phí ship là 1.019.000đ) chị nhé. Sản phẩm hiện sẵn các size S, M, L, chị lấy size nào ạ?

Ảnh đi kèm 1 tấm (SD023).

3 generation request · PASS.

## P07

**MATERIAL_FAIL**. Engine đề xuất M cho cả áo và quần, danh sách size thay thế rỗng. Shop vẫn tư vấn có thể chọn quần L theo thói quen. Verifier PASS.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị cao 1m60, nặng 55kg. Áo chị hay mặc M mà quần lại hay lấy L, em chọn size từng phần giúp chị nhé.

**Shop**

> Dạ, với số đo của chị, áo shop đề xuất size M (đúng với size hay mặc của chị), còn quần đề xuất size M nhưng chị hay lấy size L thì mình có thể chọn size L theo thói quen của mình nha.

Ảnh đi kèm 1 tấm (SQ2447).

3 generation request · PASS.

## P08

**TASK_OK**. Thêm set M lúc đầu, báo đúng 829.000đ. Khi khách đổi sang áo lẻ, code giữ nguyên giỏ và yêu cầu chọn màu. Câu “Em đổi sang” dễ làm khách tưởng giỏ đã đổi.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị lấy cả bộ size M nhé.

**Shop**

> Em thêm set váy Thạch Thảo size M vào giỏ cho chị rồi ạ. Tổng đơn của mình là 829.000đ (gồm 799.000đ tiền sản phẩm và 30.000đ phí ship) chị nhé.

Ảnh đi kèm 1 tấm (SV2447).

3 generation request · PASS.

### Lượt 2 — SEND_ELIGIBLE

**Khách**

> Thôi chị lấy mỗi áo thôi, em đổi lại nhé.

**Shop**

> Em đổi sang áo lẻ size M cho chị nhé. Chị lấy áo màu Trắng hay màu Be ạ?

3 generation request · PASS.

## J1

**TASK_OK**. Giữ hai áo M và L, báo đúng 978.100đ trước khi có giỏ và hỏi màu còn thiếu. Hỏi lại màu ở lượt cuối là cần cho bước mua, có thể gọn hơn.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị lấy áo của bộ váy Thạch Thảo size L nhé.

**Shop**

> Dạ, áo thêu size L có màu trắng sẵn hàng và màu be đặt trước. Chị thích màu nào ạ?

Ảnh đi kèm 1 tấm (SV2447).

3 generation request · PASS.

### Lượt 2 — SEND_ELIGIBLE

**Khách**

> Lấy hai chiếc cho chị, một M một L.

**Shop**

> Dạ, áo size M và size L đều có màu trắng sẵn hàng và màu be đặt trước. Chị chọn màu nào cho từng size ạ?

3 generation request · PASS.

### Lượt 3 — SEND_ELIGIBLE

**Khách**

> Em báo lại tổng cả phí ship cho chị nhé.

**Shop**

> Dạ, 2 áo thêu size M và L có giá 998.000đ, được ưu đãi giảm 49.900đ, phí ship 30.000đ, tổng cộng là 978.100đ chị nhé. Chị lấy màu trắng sẵn hàng hay màu be đặt trước cho từng size ạ?

3 generation request · PASS.

## P04

**TASK_OK**. Chọn M từ engine, báo đúng 799.000đ khi khách hỏi giá set váy. Lượt tư vấn lặp chiều cao và cân nặng.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị cao 1m60, nặng 55kg, thích mặc rộng một chút. Em chọn size giúp chị nhé.

**Shop**

> Dạ, với chiều cao 1m60 và 55kg, set Thạch Thảo này chị mặc size M là vừa vặn, thoải mái đúng ý thích ạ.

Ảnh đi kèm 1 tấm (SV2447).

3 generation request · PASS.

### Lượt 2 — SEND_ELIGIBLE

**Khách**

> Vậy cả bộ bao nhiêu em?

**Shop**

> Set váy Thạch Thảo có giá 799.000đ chị nhé.

3 generation request · PASS.

## P09

**TASK_OK**. Phân biệt hai set cùng tên, sau đó dùng đúng set quần M và giá 769.000đ. “Em lưu” dễ gợi việc ghi trạng thái khi trace chỉ đọc.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Set Thạch Thảo còn size M không em?

**Shop**

> Dạ nhà em có cả Set quần Thạch Thảo (769k) và Set váy Thạch Thảo (799k), hiện cả hai mẫu đều còn size M chị nhé. Chị thích mẫu quần hay váy hơn ạ?

Ảnh đi kèm 2 tấm (SQ2447, SV2447).

3 generation request · PASS.

### Lượt 2 — SEND_ELIGIBLE

**Khách**

> Bộ quần nhé.

**Shop**

> Dạ em lưu Set quần Thạch Thảo size M (769k) cho chị nhé. Chị lấy mẫu này luôn không ạ?

3 generation request · PASS.

## S03

**EXPECTED_HANDOFF**. Ảnh chi tiết mặt trước thiếu xác nhận chụp gần phần ren. Verifier chặn lời hứa gửi đúng chi tiết. Handoff im lặng.

### Lượt 1 — HANDOFF

**Khách**

> Váy Ngọc Trâm có ảnh chụp gần phần ren không em?

*Khách không nhận tin nhắn ở lượt này.*

3 generation request · RESPONSE_UNAVAILABLE / FAIL.

## S13

**TASK_OK**. Báo 499.000đ tiền áo, 30.000đ phí ship, tổng 529.000đ và hỏi màu, size. Nêu màu be đặt trước sẽ giúp khách quyết dễ hơn.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị lấy một áo Thạch Thảo, gửi về Cần Thơ thì cả ship hết bao nhiêu em?

**Shop**

> Dạ, áo lẻ Thạch Thảo giá 499.000đ, phí ship về Cần Thơ là 30.000đ, tổng cộng là 529.000đ chị nha. Chị lấy áo màu Trắng hoặc Be và mặc size mấy ạ?

Ảnh đi kèm 1 tấm (SQ2447).

3 generation request · PASS.

## S15

**TASK_OK**. Ghi nhận màu be, nói đúng hàng đặt trước và đưa lựa chọn tư vấn size. Chuyển ngay sang giá và hỏi thêm phối đồ làm câu trả lời hơi giống quảng cáo.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.

**Shop**

> Áo Thạch Thảo lẻ giá 499.000đ (màu be là hàng đặt trước ạ). Chị muốn em tính size chuẩn theo số đo hay xem thêm chân váy và quần set mặc cùng không ạ?

Ảnh đi kèm 2 tấm (SQ2447).

3 generation request · PASS.

## S16

**EXPECTED_HANDOFF**. Owner yêu cầu bàn giao im lặng khi nguồn ảnh thiếu xác nhận là khách mặc. Nhu cầu ảnh vẫn cần shop bổ sung nguồn.

### Lượt 1 — HANDOFF

**Khách**

> Shop có ảnh khách mặc áo Thạch Thảo không em?

*Khách không nhận tin nhắn ở lượt này.*

1 generation request · RESPONSE_UNAVAILABLE.

## J2

**TASK_OK**. Dùng 51kg thay 56kg, giữ thông số còn lại và RELAXED. Engine trả M cả ba lượt. Câu trả lời vẫn đọc lại số đo và diễn đạt như bảo đảm mặc thoải mái.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị muốn chọn size áo của bộ váy Thạch Thảo, cao 1m62 nặng 56kg.

**Shop**

> Dạ với chiều cao 1m62 và cân nặng 56kg, em tư vấn áo set Thạch Thảo mình mặc size M vừa đẹp chị nha.

Ảnh đi kèm 1 tấm (SV2447).

3 generation request · PASS.

### Lượt 2 — SEND_ELIGIBLE

**Khách**

> Chị nhắn nhầm cân nặng, 51kg thôi em nhé. Ngực 88, eo 70, mông 94.

**Shop**

> Dạ với số đo ngực 88, eo 70 và cân nặng 51kg, áo set Thạch Thảo mình vẫn giữ size M vừa đẹp chị nha.

3 generation request · PASS.

### Lượt 3 — SEND_ELIGIBLE

**Khách**

> Chị thích mặc thoải mái một chút, em chọn size giúp chị nhé.

**Shop**

> Dạ với vòng eo 70 và sở thích mặc thoải mái, áo set Thạch Thảo chị vẫn chọn size M vừa vặn, thoải mái chị nha.

3 generation request · PASS.

## J4

**TASK_OK**. Cả ba lượt có reply. Xét hỗ trợ ở lượt 2, giữ đúng 499.000đ cả ship ở lượt 3. RECORD dư bị từ chối, giỏ vẫn rỗng và không có ưu đãi thứ hai. Câu chốt lặp ở hai lượt cuối.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị lấy áo của bộ váy Thạch Thảo size M.

**Shop**

> Dạ, áo thêu Thạch Thảo size M có hai màu là trắng (có sẵn) và be (đặt trước). Chị lấy màu nào ạ?

Ảnh đi kèm 1 tấm (SV2447).

3 generation request · PASS.

### Lượt 2 — SEND_ELIGIBLE

**Khách**

> Shop hỗ trợ thêm cho chị được chút nào không?

**Shop**

> Dạ áo thêu Thạch Thảo size M có giá 499k, shop hỗ trợ miễn phí vận chuyển 30k thành tổng 499k ạ. Chị chọn lấy màu trắng hay be để em lên đơn luôn nhé ạ?

3 generation request · PASS.

### Lượt 3 — SEND_ELIGIBLE

**Khách**

> Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?

**Shop**

> Dạ một áo thêu Thạch Thảo size M gửi về Cần Thơ có giá 499k, shop hỗ trợ 30k phí vận chuyển nên tổng thanh toán là 499k ạ.
>
> Chị lấy màu trắng (có sẵn) hay be (đặt trước) để em lên đơn luôn nhé ạ?

3 generation request · PASS.

## J6

**TASK_OK**. Giỏ và tổng đúng, giữ COD và hỏi tên còn thiếu bằng code intake. Chưa có thao tác chốt đơn trước khi đủ thông tin.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị lấy set váy Thạch Thảo size M nhé.

**Shop**

> Em đã thêm set váy Thạch Thảo size M vào giỏ cho chị rồi ạ. Tổng thanh toán là 829.000đ, chị gửi giúp em thông tin nhận hàng nhé ạ.

Ảnh đi kèm 2 tấm (SV2447).

3 generation request · PASS.

### Lượt 2 — CODE_OWNED_SEND

**Khách**

> Em lên đơn cho chị đi.

**Shop**

> Chị cho em tên người nhận nhé.

1 generation request · CHECKOUT_DETAILS_MISSING.

### Lượt 3 — CODE_OWNED_SEND

**Khách**

> Chị muốn trả khi nhận hàng.

**Shop**

> Chị cho em tên người nhận nhé.

0 generation request · PRIVATE_CHECKOUT_COMMITTED.

## P01

**TASK_OK**. Báo đúng áo lẻ 499.000đ, có ảnh. Cụm “đủ các size … với hai màu” dễ gợi be đang sẵn, dù bước sau còn xác minh màu.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Áo này bán riêng không em, bao nhiêu vậy?

**Shop**

> Dạ, áo có bán riêng chị nhé! Áo lẻ thiết kế tơ Hàn thêu họa tiết nổi, form nhẹ, vải mềm thoáng có độ bay tự nhiên, giá 499.000đ ạ.
>
> Mẫu này có đủ các size S, M, L, XL với hai màu Trắng và Be, chị lấy size nào để em check màu và tư vấn cụ thể ạ?

Ảnh đi kèm 2 tấm (SV2447).

3 generation request · PASS.

## P02

**TASK_OK**. Báo riêng quần 429.000đ, hỏi size và có ảnh. Phần chất liệu thêm dài so với câu hỏi mua quần.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị lấy mỗi quần thôi, quần bao nhiêu em?

**Shop**

> Dạ, quần lẻ Set Thạch Thảo có giá 429.000đ, chất liệu tơ Hàn thêu mềm mịn, bay bổng, đủ size từ S đến XL ạ. Chị lấy size nào để em chuẩn bị nhé ạ?

Ảnh đi kèm 1 tấm (SQ2447).

3 generation request · PASS.

## P03

**TASK_OK**. Đúng chân váy M còn, báo thêm giá 449.000đ và có ảnh.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chân váy này size M còn không em?

**Shop**

> Dạ, chân váy Thạch Thảo size M bên em còn chị nhé (449.000đ ạ).

Ảnh đi kèm 1 tấm (SV2447).

2 generation request · PASS.

## P10

**TASK_OK**. Tìm ra hai ứng viên và hỏi phân biệt mẫu trước khi trả tồn.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Cái bộ hoa chị xem hôm trước còn không em?

**Shop**

> Dạ, bên em có set quần Uyển Hoa và set quần phối ren hoa. Chị đang nhắc đến mẫu nào ạ?

3 generation request · PASS.

## H01

**TASK_OK**. Cho biết trắng sẵn, be đặt trước trước khi yêu cầu khách chọn màu. Giỏ chưa được tạo.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị lấy áo size L nhé.

**Shop**

> Dạ, áo thêu size L bên em có màu Trắng (có sẵn) và màu Be (đặt trước). Chị lấy màu nào ạ?

Ảnh đi kèm 1 tấm (SV2447).

3 generation request · PASS.

## H02

**TASK_OK**. Báo đúng giá set và món lẻ, tồn S và đặt trước các size khác, kèm ảnh. Câu trả lời vẫn dày thông tin.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Bộ Khánh Trang này bao nhiêu em?

**Shop**

> Dạ, set váy Khánh Trang có giá 999.000đ ạ (chị có thể mua áo lẻ hoặc chân váy lẻ với giá 499.000đ/món).
>
> Thiết kế chất liệu thô boi phối ren mềm nhẹ, thoáng mát; áo form suông nhẹ nhàng và chân váy cạp chun thoải mái dễ mặc. Hiện bộ này sẵn size S (các size M, L, XL nhận đặt trước).
>
> Chị muốn lấy bộ này hay cần em tư vấn thêm size nào ạ?

Ảnh đi kèm 2 tấm (SV1561).

3 generation request · PASS.

## S05

**TASK_OK**. Chọn một set hợp bữa ăn gia đình và gửi ảnh đúng set. Mã SKU và chuỗi tính từ làm lời tư vấn giống danh mục.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị cần bộ đồ mặc đi ăn với gia đình, thích đơn giản hơn một chút. Em chọn giúp chị nhé.

**Shop**

> Em gợi ý cho chị set quần màu be dịu dàng (SQ675) với thiết kế áo dáng suông tay lửng phối ren tinh tế cùng quần ống rộng thanh lịch, mang lại cảm giác thoải mái và rất nhã nhặn khi mặc đi ăn với gia đình. Chị xem mẫu này có ưng ý không ạ?

Ảnh đi kèm 2 tấm (SQ675).

4 generation request · PASS.

## S06

**TASK_OK**. Trả lời phối được với quần nâu, có lý do về màu sắc. Đoạn giá, tồn và hỏi size kéo dài câu tư vấn phối.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Áo Thạch Thảo phối với quần nâu sẫm chị đang có được không em?

**Shop**

> Dạ áo Thạch Thảo chất tơ Hàn thêu mềm mại, bay bổng phối với quần nâu sẫm rất hợp và sang đó chị ạ! Sắc nâu trầm sẽ làm nổi bật nét nhã nhặn, thanh lịch của áo.
>
> Áo lẻ hiện có giá 499.000đ (đủ size S đến XL), chị lấy áo size mấy để em gửi mẫu phù hợp nhé ạ?

Ảnh đi kèm 2 tấm (SQ2447).

3 generation request · PASS.

## S08

**TASK_OK**. Chọn Diệp An đi lễ, đưa Odette khi cần hàng sớm. Cuối câu hỏi lại chọn mẫu làm lời khuyên bớt dứt khoát.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Váy Odette với Diệp An, em chọn giúp chị một mẫu mặc đi lễ nhé.

**Shop**

> Chị chọn mẫu Váy Diệp An (699.000đ) nhé ạ, thiết kế 2 lớp kín đáo và nhã nhặn rất hợp mặc đi lễ (mẫu này là hàng đặt trước). Nếu chị cần gấp thì có thể lấy Váy Odette (799.000đ) chất ren sang trọng, hiện có sẵn size S ạ.
>
> Chị chọn mẫu nào để em hỗ trợ tiếp nhé?

Ảnh đi kèm 2 tấm (V039, V168).

3 generation request · PASS.

## S09

**TASK_OK**. Đọc đúng customer FAQ. Ưu tiên giặt tay và cho phép giặt máy cùng túi giặt/chế độ nhẹ đúng policy.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Áo Thạch Thảo này có cần giặt tay không hay cho máy được em?

**Shop**

> Dạ, áo mình ưu tiên giặt tay chị nhé. Nếu giặt máy, chị nhớ dùng túi giặt và chọn chế độ giặt nhẹ giúp em nha!

3 generation request · PASS.

## S10

**EXPECTED_HANDOFF**. Handoff im lặng theo nhánh đổi đơn cũ, chưa có xác nhận đổi màu.

### Lượt 1 — HANDOFF

**Khách**

> Áo chị đặt hôm trước chưa nhận, giờ chị muốn đổi màu thì làm thế nào em?

*Khách không nhận tin nhắn ở lượt này.*

2 generation request · EXCHANGE.

## S12

**EXPECTED_HANDOFF**. Handoff im lặng theo nhánh lỗi sản phẩm, giữ thao tác đổi ở đúng thẩm quyền.

### Lượt 1 — HANDOFF

**Khách**

> Chị mới mở hộp, khóa váy bị kẹt. Giờ chị muốn đổi thì làm thế nào em?

*Khách không nhận tin nhắn ở lượt này.*

2 generation request · DEFECT.

## S14

**TASK_OK**. Để khách xem thêm và kết thúc tự nhiên, không kéo sang chốt đơn.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Em để chị xem thêm đã, khi nào lấy chị nhắn nhé.

**Shop**

> Dạ vâng, chị cứ xem thêm nhé, cần gì chị cứ nhắn em ạ.

2 generation request · PASS.

## S01

**TASK_OK**. Báo 999.000đ đúng set, ảnh đi kèm. Bước hỏi size phù hợp, phần mô tả có thể ngắn hơn.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Bộ Khánh Trang này bao nhiêu vậy em?

**Shop**

> Set váy Khánh Trang có giá 999.000đ, làm từ chất liệu thô boi phối ren mềm mát với form suông nhẹ và chân váy cạp chun thoải mái chị ạ.
>
> Mẫu này hiện sẵn size S, chị lấy size này hay cần em tư vấn thêm không ạ?

Ảnh đi kèm 2 tấm (SV1561).

3 generation request · PASS.

## S02

**TASK_OK**. Báo đúng áo lẻ 499.000đ, có ảnh. Đặt trắng và be cùng một ngoặc khiến khách khó biết màu nào đang sẵn.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị lấy mỗi áo của Thạch Thảo thôi, báo chị giá áo nhé.

**Shop**

> Áo lẻ Thạch Thảo chất tơ Hàn thêu cao cấp, form nhẹ nhàng có giá 499.000đ ạ. Mẫu này có các size S, M, L, XL (Trắng và Be), chị lấy size và màu nào ạ?

Ảnh đi kèm 1 tấm (SQ2447).

3 generation request · PASS.

## S04

**TASK_OK**. Trả đúng hai màu, phân biệt trắng sẵn và be đặt trước sau khi đọc nguồn.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Áo Thạch Thảo có thêm màu khác nữa không em?

**Shop**

> Dạ, áo Thạch Thảo có 2 màu là Trắng và Be chị nhé. Màu trắng hiện có sẵn các size S, M, L, XL, còn màu be là hàng đặt trước ạ.

4 generation request · PASS.

## S07

**TASK_OK**. Chọn M theo engine và dùng preference mặc rộng. Đọc lại chiều cao/cân nặng và dùng “chị nhé ạ” làm câu cứng.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị cao 1m60, nặng 55kg, thích mặc rộng. Áo Thạch Thảo lấy size nào em?

**Shop**

> Dạ với chiều cao 1m60, nặng 55kg và thích mặc rộng, chị lấy áo Thạch Thảo size M là vừa đẹp và thoải mái chị nhé ạ.

3 generation request · PASS.

## S11

**MATERIAL_FAIL**. Khách hỏi đúng be, L, hai bộ. Hai dòng tồn set chỉ xác nhận L không gắn màu. Trả “đều còn sẵn size L” khiến câu hỏi có thể bị hiểu là đã xác nhận be và số lượng. Câu hỏi set quần hay váy vẫn hữu ích.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Set Thạch Thảo màu be size L còn hai bộ không em?

**Shop**

> Dạ shop có cả Set quần Thạch Thảo (769.000đ) và Set váy Thạch Thảo (799.000đ) đều còn sẵn size L ạ. Chị lấy set quần hay set váy vậy ạ?

Ảnh đi kèm 2 tấm (SQ2447, SV2447).

3 generation request · PASS.

## J3

**MATERIAL_FAIL**. Lượt đầu draft hứa hàm ý tồn be bị verifier chặn. Shop nhận được báo giá tĩnh 529.000đ từ proof nhưng mất phần phối với quần nâu. Hai lượt sau tư vấn phối váy và giữ đúng ý lấy áo.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị có quần nâu ở nhà rồi, đang muốn mua áo của bộ váy Thạch Thảo.

**Shop**

> Dạ 1 áo lẻ của Set váy Thạch Thảo hết 529.000đ chị nhé, đã gồm 30.000đ phí giao hàng.

Ảnh đi kèm 2 tấm (SV2447).

3 generation request · VERIFIED_QUOTE_REPLY.

### Lượt 2 — SEND_ELIGIBLE

**Khách**

> Nếu lấy cả bộ thì phần váy có dễ mặc lại không em?

**Shop**

> Dạ, chân váy ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên nên rất dễ phối đồ ạ; chị có thể kết hợp cùng các kiểu áo trơn đơn giản để mặc đi làm hoặc đi chơi đều rất thanh lịch.

2 generation request · PASS.

### Lượt 3 — SEND_ELIGIBLE

**Khách**

> Chị lấy áo thôi, phần váy để lần sau nhé.

**Shop**

> Dạ vâng ạ, chị lấy áo Set Thạch Thảo. Chị mặc size nào để em chuẩn bị ạ?

2 generation request · PASS.

## J5

**EXPECTED_HANDOFF**. Bàn giao đơn cũ ở lượt đầu. Hai lượt sau giữ quyền HUMAN và không phát tin.

### Lượt 1 — HANDOFF

**Khách**

> Chị muốn hỏi về đơn đã đặt hôm trước.

*Khách không nhận tin nhắn ở lượt này.*

1 generation request · ORDER_STATUS.

### Lượt 2 — NO_SEND

**Khách**

> Để chị trao đổi trực tiếp với shop nhé.

*Khách không nhận tin nhắn ở lượt này.*

0 generation request · HUMAN_OWNS_CONVERSATION.

### Lượt 3 — NO_SEND

**Khách**

> Chị gửi thêm thông tin đơn sau.

*Khách không nhận tin nhắn ở lượt này.*

0 generation request · HUMAN_OWNS_CONVERSATION.

## CHECKOUT COMPLETE

**TASK_OK**. Đi đủ bảy lượt, nhận đúng từng trường checkout, đưa preview COD 829.000đ rồi bàn giao sau xác nhận. Dữ liệu riêng tư giả lập được giữ ở code intake.

### Lượt 1 — SEND_ELIGIBLE

**Khách**

> Chị lấy set váy Thạch Thảo size M nhé.

**Shop**

> Dạ em đã thêm set váy Thạch Thảo size M vào giỏ hàng cho chị rồi ạ. Tổng thanh toán là 829.000đ (đã gồm 30.000đ phí ship). Chị gửi em xin địa chỉ và số điện thoại nhận hàng để em lên đơn nhé ạ!

Ảnh đi kèm 1 tấm (SV2447).

3 generation request · PASS.

### Lượt 2 — CODE_OWNED_SEND

**Khách**

> Em lên đơn cho chị nhé.

**Shop**

> Chị cho em tên người nhận nhé.

1 generation request · CHECKOUT_DETAILS_MISSING.

### Lượt 3 — CODE_OWNED_SEND

**Khách**

> [Đã ẩn tên người nhận giả lập]

**Shop**

> Chị cho em số điện thoại nhé.

0 generation request · PRIVATE_CHECKOUT_COMMITTED.

### Lượt 4 — CODE_OWNED_SEND

**Khách**

> [Đã ẩn số điện thoại giả lập]

**Shop**

> Chị cho em địa chỉ nhé.

0 generation request · PRIVATE_CHECKOUT_COMMITTED.

### Lượt 5 — CODE_OWNED_SEND

**Khách**

> [Đã ẩn địa chỉ giả lập]

**Shop**

> Chị cho em COD hoặc chuyển khoản nhé.

0 generation request · PRIVATE_CHECKOUT_COMMITTED.

### Lượt 6 — CODE_OWNED_SEND

**Khách**

> Chị trả tiền khi nhận hàng nhé.

**Shop**

> 1 bộ (mẫu “Set váy Thạch Thảo”) (áo, size M; chân váy, size M): 799.000đ
> Tạm tính: 799.000đ
> Phí ship: 30.000đ
> Tổng: 829.000đ
> Người nhận: [Đã ẩn]
> Địa chỉ: [Đã ẩn]
> Thanh toán: COD
> Dự kiến nhận hàng: 4-8 ngày.
> Chị xác nhận chốt đơn nhé.

0 generation request · PRIVATE_CHECKOUT_COMMITTED.

### Lượt 7 — HANDOFF

**Khách**

> Đúng rồi, chốt đơn cho chị nhé.

*Khách không nhận tin nhắn ở lượt này.*

1 generation request · PURCHASE_CONFIRMED.
