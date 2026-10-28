# Hội thoại — silent handoff, 26/10/2026

Source `8d4a0ab3ff8f65823a2f0bf112658d150a05b58a`; native 51/51; N1/retry0. B1 read-only là eligibility, persisted là capture trong DB thử nghiệm; không gửi khách thật.

## opening-ad

Khách: Bộ này bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, set váy Thạch Thảo có giá 799.000đ chị nhé.
>
> Thiết kế gồm áo tơ Hàn thêu nổi form nhẹ kết hợp chân váy ren tơ mềm mại, có độ bay và rũ tự nhiên ạ. Mẫu này hiện đủ size S, M, L, XL chị nha.

> [CODE_IMAGE]

> [CODE_IMAGE]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## opening-ad-repeat

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, set váy Thạch Thảo (cả bộ gồm áo và chân váy) có giá 799.000đ chị nhé.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## opening-organic

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Set váy Thạch Thảo có giá 799.000đ chị nha. Set gồm áo tơ Hàn thêu nổi form nhẹ mềm thoáng và chân váy ren tơ Hàn mềm có độ rũ tự nhiên, hiện sẵn các size S, M, L, XL ạ.

> [CODE_IMAGE]

> [CODE_IMAGE]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## opening-unresolved

Khách: Mẫu này giá sao em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, chị gửi giúp em hình ảnh hoặc tên mẫu để em kiểm tra giá chính xác cho mình nha ạ!

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## opening-multipart

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, set váy Thạch Thảo có giá 799.000đ ạ.
>
> Chị hoàn toàn có thể mua áo riêng được nha chị, áo lẻ có giá 499.000đ ạ.
>
> Set gồm áo tơ Hàn thêu nổi form nhẹ (vải mềm, thoáng, bay tự nhiên) và chân váy ren tơ Hàn mềm form nhẹ rũ tự nhiên. Sản phẩm hiện có sẵn các size S, M, L, XL ạ.

> [CODE_IMAGE]

> [CODE_IMAGE]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## media-overview-next:ask

Khách: Em có ảnh khách mặc bộ Thạch Thảo không?

Terminal: HANDOFF / DEPENDENCY_FAILURE; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## media-overview-next:continue

Khách: Gửi chị ảnh cả bộ nhé.

Terminal: NO_SEND / HUMAN_OWNS_CONVERSATION; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## media-detail-next:ask

Khách: Bộ Thạch Thảo có ảnh khách mặc chưa em?

Terminal: HANDOFF / DEPENDENCY_FAILURE; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## media-detail-next:continue

Khách: Cho chị xem cận phần thêu ở áo nhé.

Terminal: NO_SEND / HUMAN_OWNS_CONVERSATION; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## media-and-price:ask

Khách: Em gửi chị ảnh khách mặc bộ Thạch Thảo với. Lấy riêng áo thì bao nhiêu?

Terminal: HANDOFF / DEPENDENCY_FAILURE; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## media-and-size:ask

Khách: Cho chị xem gần phần thêu áo Thạch Thảo nhé. Chị cao 1m58, nặng 52kg thì lấy size nào?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, em gửi chị ảnh cận cảnh phần thêu của áo Thạch Thảo ạ. Với chiều cao 1m58 và nặng 52kg, chị lấy size M giúp em nhé!

> [CODE_IMAGE]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## media-decision:ask

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Chân váy của set Thạch Thảo dùng chất ren mềm và có độ rũ tự nhiên nên khi mặc lên form khá thanh thoát, bay bổng chứ không bị cứng hay quá nặng nề đâu ạ.
>
> Nếu chị muốn mặc đi tiệc trưa vừa điệu đà vừa sang trọng thì chọn nguyên bộ (799k) rất hợp lý. Còn nếu chị thích sự gọn gàng, nhã nhặn hơn, mình có thể lấy riêng áo thêu (499k) rồi kết hợp với chân váy trơn hoặc quần suông sẵn có trong tủ cũng rất lịch sự để đi cưới đó ạ.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Terminal: HANDOFF / PRICE_UNAVAILABLE; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Terminal: HANDOFF / PRICE_UNAVAILABLE; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## b1-partial-source-v3

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Terminal: HANDOFF / PRICE_UNAVAILABLE; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## b1-changed-occasion

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, set Thạch Thảo dùng chất tơ và ren tơ nên khi ngồi ô tô di chuyển gần 3 tiếng sẽ dễ bị hằn nếp nhăn ở tơ và ren ạ.
>
> Nếu mình đi xe lâu mà ngại nhăn, chị chuyển sang **SET QUẦN SQ675** giúp em nhé. Set này dùng chất thô hoa laze phối thô ướt cao cấp kèm lót habutai, ít nhăn hơn và giữ form rất đứng dáng, ngồi xe thoải mái mà vẫn lịch sự, thanh lịch đi đám cưới ạ.

## b1-current-policy

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, đơn nhận 10 hôm là vẫn còn trong thời hạn đổi 15 ngày chị nhé. Phí đổi hàng (vận chuyển 2 chiều) là 30.000đ ạ.

## b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Set váy Thạch Thảo có giá 799.000đ chị nhé.
>
> Mẫu gồm áo tơ Hàn thêu nổi họa tiết và chân váy ren mềm, form nhẹ có độ bay và rũ tự nhiên. Sản phẩm hiện sẵn các size S, M, L, XL ạ.

## b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, áo Thạch Thảo size M hiện còn hàng chị nhé. Áo bán riêng có giá 499.000đ ạ.

## b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, mẫu áo dài SD375 có giá áo lẻ là 929.000đ và cả bộ là 1.065.000đ chị nhé.

## b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ set này diện đi tiệc ban ngày rất sang và hợp dáng đó chị ạ. Chất ren tơ Hàn mềm có độ rũ tự nhiên kết hợp áo tơ thêu nổi nhẹ nhàng tạo cảm giác bay bổng, thanh thoát chứ không hề bị rườm rà hay nặng nề đâu ạ.
>
> Giá nguyên set là 799.000đ, vừa vặn trong ngân sách của mình luôn chị nhé. Chị mặc size nào để em kiểm tra tư vấn thêm cho mình ạ?

## b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải chưa qua sử dụng và chưa giặt (chỉ ướm thử bên ngoài). Do chị đã mặc đi làm một buổi rồi nên sản phẩm không đủ điều kiện đổi sang màu khác ạ.
>
> Trường hợp đổi hàng hợp lệ, phí vận chuyển 2 chiều là 30.000đ chị nhé.

## b1-changed-occasion-v2

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Áo làm từ tơ Hàn mềm, thoáng, form nhẹ và chân váy ren tơ Hàn có độ rũ tự nhiên, form nhẹ nhàng giúp mình thoải mái khi ở ngoài trời ạ.

## b1-current-policy-v2

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ mình vẫn kịp đổi size vì thời hạn đổi là 15 ngày kể từ khi nhận đơn chị nha. Phí vận chuyển 2 chiều cho việc đổi hàng là 30.000đ ạ.

## b1-price-v2

Khách: Cho chị xin giá cả bộ với em.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, set váy Thạch Thảo có giá 799.000đ, gồm áo tơ Hàn thêu nổi và chân váy ren tơ Hàn mềm, form nhẹ có độ bay tự nhiên ạ. Mẫu này hiện sẵn các size S, M, L, XL chị nhé.

## b1-component-stock-v2

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: HANDOFF / STALE; ELIGIBILITY_ONLY

> [Không có tin khách]

## b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ shop có sẵn set váy Khánh Trang chị nhé. Giá cụ thể từng phần:
>
> - Nguyên set: 999.000đ (có sẵn size S, M, L)
> - Áo lẻ: 499.000đ (size S, M, L)
> - Chân váy lẻ: 499.000đ (size S, M, L, XL)
>
> Mẫu này làm từ chất liệu thô boi phối ren nhẹ nhàng, thoáng mát, áo form suông nhẹ và chân váy cạp chun thoải mái dễ mặc ạ. Chị muốn lấy cả set hay mua rời món nào ạ?

## b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, nếu chị quen mặc đồ trơn và sợ set này bị điệu quá thì hoàn toàn yên tâm nha chị. Set Thạch Thảo có form áo và chân váy nhẹ nhàng, chất tơ và ren mềm tạo độ rũ cùng độ bay tự nhiên, không bị phồng cứng hay rườm rà. Đi ăn cưới ban ngày, set này mang lại cảm giác trang nhã, sang trọng và lịch sự vừa đủ, không bị quá sến hay lấn át phong cách thường ngày của chị đâu ạ.
>
> Mẫu này hiện có giá 799.000đ (đủ size S đến XL), chị lấy diện đi ăn cưới rất hợp đấy ạ.

## b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, quy định của shop là sản phẩm đổi cần chưa qua sử dụng và chỉ ướm bên ngoài chứ không mặc thử vào người. Vì vậy, nếu mình đã mặc thử vào người thì rất tiếc không đủ điều kiện để shop hỗ trợ đổi size ạ.

## b1-changed-occasion-v3

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Chị lấy cả bộ mặc đi gặp khách hàng vẫn đẹp và hợp lý hơn chị ạ. Set có phom dáng nhẹ nhàng cùng độ rũ tự nhiên, diện ban ngày rất nhã nhặn, lịch sự và tạo cảm giác chỉn chu, chuyên nghiệp trước đối tác mà không bị quá lồng lộn.

## b1-current-policy-v3

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, chính sách bên em hỗ trợ đổi hàng trong 15 ngày nên nhận hàng 9 ngày mình vẫn đổi size được chị nha.

## b1-price-v3

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Nguyên set Thạch Thảo có giá 799.000đ chị nhé. Set gồm áo tơ Hàn thêu họa tiết nổi kết hợp chân váy ren tơ Hàn mềm, form nhẹ và có độ bay, rũ tự nhiên, hiện đủ các size S, M, L, XL ạ.

## b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, áo Thạch Thảo có bán lẻ chị nhé. Áo lẻ size M hiện còn hàng, giá 499.000đ ạ.
>
> Áo làm từ chất liệu tơ Hàn thêu, họa tiết thêu nổi với form nhẹ, vải mềm, thoáng và có độ bay tự nhiên. Chị lấy áo size M này em lên đơn luôn cho chị nhé ạ?

## b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Set quần Xuân Thảo hiện có giá 699.000đ, chất liệu vải thô đục lỗ in họa tiết hoa thoáng mát và đứng form. Sản phẩm hiện còn các size S, M, L chị nhé ạ.

## b1-buying-concern-v3

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Chị lấy riêng áo Thạch Thảo (499.000đ) là hợp lý nhất ạ. Áo form nhẹ, chất tơ thêu mềm mại và thoáng, khi phối cùng chân váy đen sẵn có của chị sẽ tạo set đồ rất thanh lịch.
>
> Kiểu áo này cũng dễ mix&match linh hoạt với các quần hoặc chân váy khác để chị thoải mái mặc lại nhiều lần mà vẫn mới mẻ, lại rất vừa vặn với ngân sách của mình ạ.

## b1-policy-used-v3

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, quy định đổi hàng của bên em áp dụng trong vòng 15 ngày kể từ khi nhận và sản phẩm cần còn nguyên tem, chưa qua sử dụng hay giặt ủi ạ. Trường hợp của chị đã cắt tem và giặt rồi nên không đủ điều kiện để đổi sang mẫu khác, chị thông cảm giúp em nhé ạ.

## sales-discovery-advice:need

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Terminal: HANDOFF / RESPONSE_UNAVAILABLE; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## sales-product-gallery:overview

Khách: Cho chị xem ảnh set Thạch Thảo màu be nhé.

Terminal: HANDOFF / DEPENDENCY_FAILURE; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## sales-size-advice:height-weight

Khách: Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ với chiều cao 1m58 và cân nặng 52kg cùng sở thích mặc thoải mái, em tư vấn mình mặc **size M** set Thạch Thảo nhé ạ. Size M sẽ mang lại độ rộng vừa vặn, bay bổng và thoải mái đúng ý chị ạ.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## sales-southern-delivery:deadline

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Terminal: HANDOFF / DEPENDENCY_FAILURE; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY; PERSISTED_CAPTURE

> Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-variant-quantity

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Em đã đổi sang 2 áo size L cho chị rồi ạ. Tổng cộng 978.100đ, đã gồm phí giao hàng, hàng đặt trước chị nhé.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-quote

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, 2 áo là 998.000đ (có ưu đãi 49.900đ), cộng 30.000đ phí ship, tổng thanh toán là 978.100đ chị nhé.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-correction

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ vâng chị, em ghi nhận lại số đo mới của chị nhé. Hai áo size L của chị vẫn được giữ nguyên ạ.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-request-checkout

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING; PERSISTED_CAPTURE

> Chị cho em [NAME]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-private-checkout

Khách: [Thông tin nhận hàng qua luồng riêng]

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED; PERSISTED_CAPTURE

> [Nội dung checkout đã ẩn thông tin nhận hàng]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-confirm

Khách: Chốt đơn cho chị nhé.

Terminal: HANDOFF / PURCHASE_CONFIRMED; PERSISTED_CAPTURE

> Dạ, shop đã nhận yêu cầu đặt hàng của chị. Bên em sẽ kiểm tra rồi báo lại chị nhé.

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Terminal: HANDOFF / CUSTOMER_REQUESTED_HUMAN; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## negotiation-cart-setup

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Em đã thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nha.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## negotiation-price-objection

Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ giá áo lẻ là 499k, mức giá này em không bớt thêm được nữa ạ. Chị ủng hộ em nha!

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## negotiation-total-control

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ tổng đơn áo và phí ship của mình là 499k chị nhé.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`
