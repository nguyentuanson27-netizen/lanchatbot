# Hội thoại — POS refresh và owner wire, 26/10/2026

Source `468d85ea6577c428cf2f6f155c9774926537364b`; native 51/51; N1/retry0. B1 read-only là eligibility, persisted là capture trong DB thử nghiệm; không gửi khách thật.

## opening-ad

Khách: Bộ này bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Set váy Thạch Thảo có giá 799.000đ ạ. Thiết kế gồm áo tơ Hàn thêu nổi form nhẹ và chân váy ren tơ Hàn mềm rũ tự nhiên, sẵn các size S, M, L, XL chị nhé.

> [CODE_IMAGE]

> [CODE_IMAGE]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## opening-ad-repeat

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, set váy Thạch Thảo có giá 799.000đ chị nhé.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## opening-organic

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Set váy Thạch Thảo có giá 799.000đ, chất liệu áo tơ Hàn thêu nổi kết hợp chân váy ren tơ Hàn mềm mại, form nhẹ bay tự nhiên. Set hiện có sẵn các size S, M, L, XL chị nhé ạ.

> [CODE_IMAGE]

> [CODE_IMAGE]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## opening-unresolved

Khách: Mẫu này giá sao em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ chị gửi giúp em hình ảnh hoặc tên mẫu để em kiểm tra giá cho mình nha ạ!

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## opening-multipart

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, set váy Thạch Thảo có giá 799.000đ, và chị hoàn toàn mua áo riêng được với giá 499.000đ ạ. Sản phẩm có sẵn các size S, M, L, XL.
>
> Áo làm từ tơ Hàn thêu nổi, form nhẹ, vải mềm và thoáng tự nhiên; chân váy ren tơ Hàn mềm mại có độ rũ rất đẹp chị nhé. Em gửi chị xem mẫu ạ!

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

> Em gửi chị ảnh cận cảnh họa tiết thêu ở áo nhé ạ. Với chiều cao 1m58 và cân nặng 52kg, chị mặc size M là vừa đẹp ạ.

> [CODE_IMAGE]

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## media-decision:ask

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Chị yên tâm nhé, chân váy Thạch Thảo dùng chất ren tơ Hàn mềm mại, form nhẹ và có độ rũ tự nhiên nên lên dáng rất thanh thoát, bay bổng chứ không bị cứng hay rườm rà, mặc đi tiệc cưới buổi trưa rất sang và lịch sự ạ.
>
> Mẫu này em có bán cả bộ giá 799.000đ, hoặc nếu chị thích gọn gàng hơn thì có thể chọn mua riêng áo thêu (499.000đ) để phối cùng chân váy trơn. Em gửi chị xem hình ảnh của set nhé ạ.

> [CODE_IMAGE]

> [CODE_IMAGE]

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

> Dạ, set Thạch Thảo dùng chất tơ Hàn và ren mềm nên khi ngồi ô tô 3 tiếng liên tục, phần áo tơ có thể để lại nếp gấp nhẹ ạ.
>
> Nếu chị muốn tìm mẫu gọn gàng và giữ form tốt hơn khi di chuyển đường dài, em gợi ý mẫu **Váy Diệu Thanh** (799.000đ). Thiết kế ren Hàn cao cấp có lớp lót lụa habutai bên trong giúp trang phục giữ form tốt hơn, mặc đi tiệc vừa sang trọng lại hạn chế nhăn khi ngồi xe lâu. Chị xem mẫu này có ưng ý hơn không ạ?

## b1-current-policy

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ đơn nhận 10 ngày thì mình vẫn kịp đổi chị nhé, quy định đổi hàng của shop là trong vòng 15 ngày kể từ khi nhận. Phí đổi màu (phí ship 2 chiều) là 30.000đ ạ.

## b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Set váy Thạch Thảo có giá 799.000đ chị nhé.
>
> Thiết kế gồm áo tơ Hàn thêu họa tiết nổi kết hợp chân váy ren tơ Hàn mềm mại, form nhẹ nhàng, có độ bay và rũ tự nhiên. Mẫu này shop sẵn các size S, M, L, XL ạ.

## b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ áo lẻ Thạch Thảo size M hiện còn hàng, giá 499.000đ chị nhé.

## b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Áo dài SD375 hiện có sẵn size S, M, L ạ:
> - Áo lẻ: 929.000đ
> - Cả bộ: 1.065.000đ

## b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ set này giá 799.000đ, hoàn toàn vừa vặn với ngân sách 900.000đ của chị ạ.
>
> Chị yên tâm là set này mặc đi tiệc ban ngày rất hợp và thanh lịch nhé. Chất chân váy là ren tơ Hàn mềm với form nhẹ và độ rũ tự nhiên, kết hợp cùng áo tơ thêu nổi thanh thoát nên tạo cảm giác mềm mại, bay bổng chứ không hề bị nặng nề hay rườm rà đâu ạ.

## b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải chưa qua sử dụng ạ. Do mình đã mặc đi làm rồi nên shop rất tiếc không hỗ trợ đổi sản phẩm này được, chị thông cảm giúp em nhé ạ!

## b1-changed-occasion-v2

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Chất tơ Hàn và ren mềm của bộ này có độ thoáng và bay tự nhiên, form nhẹ nhàng nên mặc không bị bí đâu chị ạ. Ở sân vườn lâu, chị có thể chú ý che chắn thêm chút khi đứng ngoài nắng gắt là yên tâm thoải mái ạ.

## b1-current-policy-v2

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ đơn nhận 12 hôm thì mình vẫn trong thời hạn 15 ngày đổi hàng nên vẫn kịp chị nhé. Tổng phí ship 2 chiều đổi hàng là 30.000đ ạ.

## b1-price-v2

Khách: Cho chị xin giá cả bộ với em.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, set váy Thạch Thảo cả bộ có giá 799.000đ ạ. Set gồm áo tơ Hàn thêu nổi form nhẹ và chân váy ren tơ Hàn mềm rũ tự nhiên, mẫu này bên em sẵn các size S, M, L, XL chị nhé.

## b1-component-stock-v2

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ chân váy size M còn chị ạ, giá chân váy mua riêng là 449.000đ ạ.

## b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, set váy Khánh Trang chất thô boi phối ren form suông nhẹ có giá 999.000đ, hiện có sẵn các size S, M, L chị nhé.

## b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Set Thạch Thảo rất hợp để chị mặc đi ăn cưới ban ngày vì mang lại nét nhã nhặn, thanh lịch mà không bị quá cứng nhắc hay nặng nề. Dù áo có họa tiết thêu nổi và chân váy chất ren, form dáng của set lại rất nhẹ nhàng, chất tơ và ren mềm mại có độ bay và rũ tự nhiên nên khi lên người tạo cảm giác thanh thoát, không bị rườm rà hay điệu đà quá mức.
>
> Nếu chị quen mặc đồ trơn, bộ này sẽ là sự thay đổi vừa vặn để tạo điểm nhấn tinh tế cho dịp tiệc tùng mà vẫn giữ được nét nhã nhặn, sang trọng. Set hiện có giá 799.000đ, sẵn các size từ S đến XL, chị hoàn toàn có thể yên tâm chọn mẫu này ạ.

## b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, quy định đổi size của shop là sản phẩm chỉ ướm bên ngoài chứ không mặc thử vào người ạ. Trường hợp mình đã mặc thử vào người thì không đáp ứng điều kiện đổi hàng, nên shop rất tiếc không hỗ trợ đổi size cho mình được chị nhé.

## b1-changed-occasion-v3

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Chị lấy áo lẻ thôi chị nhé. Áo có họa tiết thêu nổi đứng dáng và lịch sự, rất hợp để gặp khách hàng buổi sáng cần sự gọn gàng, chỉn chu.
>
> Còn chân váy ren tơ có độ bay rũ mềm mại sẽ hợp với không gian tiệc tối hơn; tách áo ra phối cùng quần âu hoặc chân váy cơ bản sẽ giúp tổng thể nhìn gọn gàng và chuyên nghiệp hơn ạ.

## b1-current-policy-v3

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ được chị nhé, bên em hỗ trợ đổi size trong vòng 15 ngày kể từ khi nhận hàng. Đơn của chị nhận được 9 ngày và sản phẩm chưa qua sử dụng thì vẫn trong thời hạn đổi ạ.

## b1-price-v3

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, set váy Thạch Thảo có giá 799.000đ ạ. Thiết kế gồm áo tơ Hàn thêu nổi và chân váy ren tơ Hàn mềm, form nhẹ bay tự nhiên. Mẫu này hiện có các size S, M, L, XL chị nhé.

## b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Áo Thạch Thảo có bán riêng chị nhé. Áo lẻ chất liệu tơ Hàn thêu họa tiết nổi form nhẹ, size M hiện có sẵn với giá 499.000đ ạ.

## b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, mẫu Set quần Xuân Thảo (SQ223) bên em vẫn còn hàng chị nhé.
>
> Sản phẩm làm từ chất liệu vải thô đục lỗ in họa tiết hoa, thiết kế áo 1 lớp form gọn gàng kết hợp quần 2 lớp cạp chun thoải mái. Giá chi tiết các phân loại ạ:
> - Áo lẻ: 429.000đ (Còn size S, M, L, XL)
> - Quần lẻ: 429.000đ (Còn size S, M, L)
> - Cả bộ: 699.000đ (Còn size S, M, L)
>
> Chị muốn lấy áo lẻ, quần lẻ hay cả bộ và cần em hỗ trợ chọn size nào cứ báo em nhé ạ!

## b1-buying-concern-v3

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Chị lấy riêng áo (499.000đ) là hợp lý nhất ạ. Áo thêu form nhẹ phối cùng chân váy đen dáng suông sẵn có của chị sẽ rất nhã nhặn, lịch sự và dễ mặc lại nhiều lần đi làm hay dạo phố.
>
> Nếu chị thích diện mạo đồng bộ, thướt tha trọn vẹn thì lấy cả bộ (799.000đ) cũng vẫn vừa vặn trong ngân sách 850 nghìn của mình ạ.

## b1-policy-used-v3

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: SEND_ELIGIBLE / PASS; ELIGIBILITY_ONLY

> Dạ, chính sách đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt ạ. Do sản phẩm của chị đã cắt tem và giặt rồi nên shop không hỗ trợ đổi sang mẫu khác được, mong chị thông cảm giúp em nhé ạ.

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

> Dạ, với chiều cao 1m58, nặng 52kg và thích mặc thoải mái một chút, set váy Thạch Thảo mình mặc size M là vừa đẹp chị nha.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## sales-southern-delivery:deadline

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, thời gian giao hàng về Cần Thơ dự kiến từ 4 đến 8 ngày nên bên em không kịp giao vào sáng mai ạ. Em tiếc quá chưa hỗ trợ chị kịp hạn này được.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Em đã thêm áo lẻ Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé!

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-variant-quantity

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Em đã đổi áo sang size L và lấy 2 chiếc cho chị rồi ạ.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-quote

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, tổng tiền 2 chiếc áo của chị là 978.100đ (bao gồm 30.000đ phí ship) chị nhé ạ.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## stateful-correction

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ vâng, em ghi nhận số đo mới của chị rồi ạ. Áo size L chị đang chọn em giữ nguyên cho mình nhé ạ.

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

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Terminal: HANDOFF / CUSTOMER_REQUESTED_HUMAN; PERSISTED_CAPTURE

> [Không có tin khách]

Handoff evidence: `{"conversationOwner": "HUMAN", "events": 1, "tags": 1}`

## negotiation-cart-setup

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho chị rồi ạ. Tổng giỏ hàng hiện tại của mình là 529.000đ ạ.

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## negotiation-price-objection

Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, áo lẻ Thạch Thảo màu be size M có giá 499.000đ (hàng đặt trước), tổng giỏ hàng của mình đã được hỗ trợ phí vận chuyển nên tổng thanh toán là 499.000đ ạ. Chị ưng mẫu này thì em hỗ trợ mình chốt đơn luôn nha!

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`

## negotiation-total-control

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, tổng thanh toán gồm cả áo và phí ship của mình là 499.000đ ạ (phí ship 30.000đ đã được shop hỗ trợ ưu đãi trừ trực tiếp vào đơn hàng rồi ạ).

Handoff evidence: `{"conversationOwner": "BOT", "events": 0, "tags": 0}`
