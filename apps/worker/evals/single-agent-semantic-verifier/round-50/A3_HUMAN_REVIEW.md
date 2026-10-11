# A3 — human review of actual terminal customer outcomes

Score 0/1/2 on the ten frozen dimensions in a3-human-scores.json. No model/judge scores are synthesized.

Trusted truth and required/forbidden behavior per case are in a3-human-review.json. The packet excludes rejected drafts and verifier verdicts.

## r5-workday-comfort:1

Customer: Chị chưa chọn được. Ngực 92, eo 74, mông 96cm em nhé, em chọn mẫu với size giúp chị.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần đồ đi làm tầm 850k. Ngồi máy tính suốt nên chị không thích đồ ôm eo."},{"role":"shop","text":"Set ST411 749k có quần suông lưng chun chị nhé. Váy VA512 829k thì eo cố định. Chị thích set hay váy?"}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị set ST411 size M, giá 749.000đ nhé. Set gồm áo sơ mi dáng rộng và quần lưng chun toàn vòng, giúp chị ngồi làm việc cả ngày thoải mái mà không bị siết eo. Chị lấy màu be hay navy ạ?
```

## r5-competitor-price:1

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Em vẫn chọn set ST411 này cho chị. Bộ gồm cả áo và quần suông lưng chun, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn giữ được nét chỉn chu, tiện lợi cả khi mặc nguyên set hay tách rời phối đồ ạ.
```

## r5-competitor-price:2

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r5-competitor-price:3

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Em vẫn chọn set này cho nhu cầu đi làm thường xuyên của chị. Thiết kế áo dáng rộng cùng quần lưng chun thoải mái giúp chị ngồi làm việc cả ngày không bị gò bó, lại ít nhăn giúp giữ form chỉn chu suốt buổi; chị mặc cả bộ hay tách rời phối đồ đều rất linh hoạt.
```

## r5-wardrobe-budget:1

Customer: Chị ở nội thành TP.HCM. Lấy áo thôi hay cả set em? Chị không muốn mua thừa quần.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn mua thêm đồ đi làm. Cả ship dưới 600k nhé em."},{"role":"shop","text":"Sơ mi SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 cả áo quần 749k."}]
```

Actual terminal customer outcome:
```text
Em gợi ý chị lấy áo SM613 thôi ạ. Tổng thanh toán gồm ship là 524k, vừa vặn ngân sách dưới 600k của chị, lại không bị thừa quần vì chị đã có sẵn quần navy rồi. Áo này mặc đi làm phối cùng quần của chị rất hợp ạ. 

Chị cho em xin số đo vòng ngực để em chọn size vừa vặn nhất cho chị nhé!
```

## r5-white-opacity:1

Customer: Ngực chị 92cm. Chị họp trong phòng và mặc áo lót màu da rồi, lấy trắng được em nhỉ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, mà sợ lộ áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng không thấy màu áo lót chị nhé. Ngược sáng vẫn có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ chị lấy trắng được ạ! Họp trong phòng và mặc áo lót màu da thì không thấy màu áo lót. Vòng ngực 92cm chị mặc size M vừa vặn, màu trắng size M bên em vẫn còn hàng chị nhé.
```

## r5-size-price-stock:1

Customer: Chị mặc size nào em? Giao nội thành TP.HCM cả ship bao nhiêu, dưới 900k nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy váy VA512 màu rêu đi tiệc. Ngực 96, eo 77, mông 104cm."},{"role":"shop","text":"Rêu còn S, M, L chị nhé, váy 829k."}]
```

Actual terminal customer outcome:
```text
Chị mặc size L vừa chị nhé. Đơn nội thành TP.HCM từ 700.000đ được miễn phí ship, tổng thanh toán là 829.000đ, nằm trọn trong ngân sách dưới 900.000đ của chị ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thành TP.HCM, quần này cả ship bao nhiêu? Navy còn không em, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng chị đang có."},{"role":"shop","text":"Em có quần QU714 navy 459k chị nhé. Ống suông, lưng có chun phía sau, còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Màu navy nhà em còn đủ size S, M, L chị nhé. Tổng đơn giao nội thành TP.HCM là 484.000đ (giá quần 459.000đ cộng 25.000đ phí ship). 

Để em chọn size chuẩn cho chị, chị cho em xin số đo vòng eo và vòng mông nhé ạ!
```

## r5-white-variant-alternative:1

Customer: Trắng L còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực 98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực 98cm chị xem size L. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Trắng size L hết rồi chị ạ. Em đổi sang xanh nhạt size L nhé, mặc với quần đen rất nhã nhặn và lịch sự, giá áo 499k ạ.
```

## r5-delivery-timing:1

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ nội thành TP.HCM dự kiến 2–3 ngày sau xác nhận đơn chị nhé. Đây là khoảng dự kiến nên bên em không cam kết giao kịp vào sáng thứ Sáu ạ.
```

## r5-delivery-timing:2

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ nội thành TP.HCM dự kiến 2–3 ngày sau xác nhận đơn chị nhé. Đây là khoảng thời gian dự kiến, không phải cam kết ngày giờ đến nên em không đảm bảo chắc chắn kịp sáng thứ Sáu ạ.
```

## r5-delivery-timing:3

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Bên em dự kiến giao 2–3 ngày sau xác nhận đơn nội thành TP.HCM chị nhé. Đây là khoảng thời gian dự kiến, không phải cam kết ngày giờ cụ thể nên em không chắc chắn có kịp sáng thứ Sáu cho chị ạ.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá 749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần 749k. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Áo SM613 xanh nhạt giá 499k chị nhé. Với ngực 92cm, chị lấy size M giúp em, mẫu này xanh nhạt size M đang sẵn hàng ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực 96, eo 77, mông 104cm. Chuyển L nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực 91, eo 72, mông 97cm."},{"role":"shop","text":"Theo số đo đó em chọn M cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, em chuyển sang size L màu đen cho chị nhé, đen L bên em đang còn hàng ạ.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó còn M thì chị lấy M nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set 749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quần navy thôi, áo có rồi. Eo74, mông 98cm."},{"role":"shop","text":"Dạ, quần QU714 navy size M theo số đo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 navy size M còn hàng, em ghi nhận chị lấy mẫu này nhé ạ.
```

## r5-budget-correction:1

Customer: Chị tính lại còn 550k cả ship thôi em. Mua áo nào mặc với quần navy đi làm đẹp?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set 749k, định dành 800k. Chị có quần navy rồi, ở nội thành TP.HCM."},{"role":"shop","text":"Set ST411 có be và navy chị nhé. Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Chị chọn mẫu sơ mi SM613 mặc với quần navy đi làm rất hợp ạ. Áo giá 499.000đ, cộng phí ship nội thành là 524.000đ, vừa vặn trong ngân sách 550.000đ của chị. 

Mẫu này có màu trắng và xanh nhạt, đều dễ phối và lịch sự. Chị cho em xin số đo vòng ngực để em chọn size chuẩn cho chị nhé ạ!
```

## r5-defer:1

Customer: Chị chưa lấy đâu, cuối tuần tính nhé. Đừng giữ hàng cho chị, cũng không cần hỏi thêm đâu.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đen L đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ 829k chị nhé, đen L còn 2 chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng, cuối tuần chị xem lại nhé ạ.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đen L nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà, chưa giặt, sạch, không mùi, giữ tem trong 7 ngày thì đổi được chị nhé. Còn mặc đi tiệc rồi thì bên em không nhận đổi ạ.
```

## r5-try-exchange:2

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đen L nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ chị thử trong nhà, chưa giặt, sạch, không mùi và giữ nguyên tem thì đổi được trong 7 ngày chị nhé. Đồ đã mặc đi tiệc thì bên em không nhận đổi ạ.
```

## r5-try-exchange:3

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đen L nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà, chưa giặt, sạch, không mùi, giữ tem trong 7 ngày thì đổi được chị nhé. Mặc đi tiệc rồi thì bên em không nhận đổi ạ.
```

## r5-exchange-cost:1

Customer: Lỡ không vừa thì phí đổi bên em chịu chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Chị lấy M nhé, be M đang còn. Set 749k."}]
```

Actual terminal customer outcome:
```text
Dạ, phí gửi đổi hàng chị thanh toán giúp em nhé.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần cho được freeship không em? Chị có quần đen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613 499k, ở nội thành TP.HCM."},{"role":"shop","text":"Áo cả ship 524k chị nhé, mua từ 700k thì miễn ship. Em có quần QU714 459k nữa."}]
```

Actual terminal customer outcome:
```text
Chị đã có quần đen thì mình bỏ qua màu đen nhé ạ. Shop có màu navy mặc đổi gió với sơ mi rất đẹp và lịch sự. Thêm quần thì tổng đơn là 958k và được miễn phí ship luôn chị nhé (mua lẻ áo là 524k ạ).
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắng M. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực 92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Trắng M 499k chị nhé. Mặc với áo lót màu da trong phòng thì không thấy màu áo lót; ngược sáng vẫn có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ vâng, sơ mi trắng M chị nhé. Bên em không áp dụng hoàn tiền, nhưng được hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ ngày nhận hàng ạ.
```

## r5-simple-price:1

Customer: Sơ mi SM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 giá 499.000đ ạ.
```

## r5-simple-stock:1

Customer: Navy M còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quần QU714 navy M."},{"role":"shop","text":"Dạ mẫu quần suông 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ màu navy size M bên em vẫn còn chị nhé.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết set ST411 749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ vâng, chị cứ xem thêm nhé ạ. Cần hỗ trợ gì thêm chị cứ nhắn em nha!
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Set 749k gồm cả áo và quần, chất vải ít nhăn giúp chị giữ vẻ chỉn chu suốt ngày đi làm và dễ dàng tách rời phối đồ linh hoạt. Với số đo của chị, mình mặc size M màu navy vừa đẹp nhé ạ.
```

## r7-price-ready-fit:2

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Chị mặc size M vừa vặn ạ. Set 749k gồm áo sơ mi dáng rộng và quần suông lưng chun, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn giữ được sự chỉn chu và thoải mái.
```

## r7-price-ready-fit:3

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Với số đo của chị, em chọn size M vừa đẹp ạ. Mức giá 749k cho cả set áo rộng và quần chun đi làm, chất vải ít nhăn giúp chị luôn giữ được vẻ chỉn chu suốt cả ngày, navy size M nhà em đang sẵn hàng nhé.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thành TP.HCM. Cả ship có dưới 600k không em? Chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn mua thêm áo đi làm. Cả ship dưới 600k nhé."},{"role":"shop","text":"Áo SM613 499k, có trắng và xanh nhạt. Set ST411 749k chị nhé."},{"role":"customer","text":"Chị lấy riêng áo xanh nhạt thôi nhé."},{"role":"shop","text":"Dạ, xanh nhạt 499k, có S, M, L."}]
```

Actual terminal customer outcome:
```text
Áo 499k cộng 25k ship nội thành, tổng thanh toán 524k là dưới 600k chị nhé. Chị cho em xin số đo vòng ngực để em chọn size vừa vặn ạ.
```

## r7-opacity-context-change:1

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Trắng M bên em vẫn còn chị nhé. Đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót, chị cân nhắc thêm nhé ạ.
```

## r7-opacity-context-change:2

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót chị nhé. Trắng M bên em hiện vẫn còn.
```

## r7-opacity-context-change:3

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Trắng M bên em còn chị nhé. Tuy nhiên, đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót chị nha.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong 7 ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo 74, mông 96cm."},{"role":"shop","text":"Em chọn M theo số đo chị nhé, be M đang còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Set đồ đã mặc đi làm thì bên em không nhận đổi chị ạ. Phí đổi hàng khách thanh toán chị nhé.
```

## r7-exchange-after-use:2

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong 7 ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo 74, mông 96cm."},{"role":"shop","text":"Em chọn M theo số đo chị nhé, be M đang còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Dạ set mặc đi làm ngoài thì bên em không nhận đổi chị nhé. Phí gửi đổi hàng chị thanh toán ạ.
```

## r7-exchange-after-use:3

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong 7 ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo 74, mông 96cm."},{"role":"shop","text":"Em chọn M theo số đo chị nhé, be M đang còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Dạ, sản phẩm đã mang đi làm thì bên em không nhận đổi chị nhé. Phí gửi đổi hàng chị thanh toán giúp em ạ.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng thôi. Em chọn màu áo giúp chị, quần chị không lấy thêm đâu. Chị mặc size nào em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Áo SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 gồm áo quần 749k."}]
```

Actual terminal customer outcome:
```text
Em chọn áo SM613 màu xanh nhạt nhé ạ, mặc cùng quần navy sẽ rất nhã nhặn, nhẹ nhàng và sáng người. Chị cho em xin số đo vòng ngực để em chọn chuẩn size vừa vặn cho mình nha!
```

## r12-pants-known-waist:1

Customer: Eo chị 74, lấy M được không em? Cả ship hết bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy 459k, còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị cho em xin thêm số đo mông để em kiểm tra size M chính xác nhé ạ. Tổng đơn gồm ship nội thành của mình là 484.000đ ạ.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt phối với quần navy chị có nhé. Vẫn M nhỉ? Áo xanh giá bao nhiêu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ vẫn size M chị nhé, xanh nhạt size M bên em còn hàng. Áo giá 499.000đ ạ. Xanh nhạt phối với quần navy nhìn nhã nhặn và rất ăn ý chị nha.
```

## r12-indoor-exchange-eligible:1

Customer: Vậy chị đổi qua mẫu khác được đúng không em? Phí gửi đổi chị trả hả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày, hàng chưa dùng và còn tem chị nhé."},{"role":"customer","text":"Ví dụ chị nhận được 5 ngày, chỉ thử ở nhà, chưa giặt, cũng chưa mặc ra ngoài thì sao?"},{"role":"shop","text":"Chị giữ nguyên tem, váy sạch và không mùi nữa nhé."},{"role":"customer","text":"Ừ, tem chị để nguyên, váy vẫn sạch không mùi."},{"role":"shop","text":"Phí vận chuyển đổi chị trả nhé."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị, bên em đổi mẫu trong thời hạn 7 ngày chị nhé. Phí gửi đổi hàng chị thanh toán ạ.
```

## r14-workday-choice:1

Customer: Ngực 92, eo 74, mông 96cm em nhé. Set hay váy hợp hơn? Em xem size giúp chị luôn.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên sợ cấn bụng."},{"role":"shop","text":"Set ST411 749k có quần suông lưng chun chị nhé. Váy VA512 829k thì eo cố định."}]
```

Actual terminal customer outcome:
```text
Set ST411 hợp hơn với nhu cầu ngồi nhiều không lo cấn bụng của chị nhờ thiết kế lưng chun toàn vòng. Với số đo của chị, mẫu này mặc **size M** là vừa vặn ạ.
```

## r14-price-repeat-wear:1

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ chị đang có nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Với số đo này, chị mặc size M set ST411 là vừa vặn ạ. Giá 749k là cho cả set gồm cả áo lẫn quần, chị vừa có nguyên bộ lịch sự đi làm, vừa tách được áo ra phối thêm với nhiều đồ sẵn có nên dùng được rất linh hoạt ạ.
```

## r14-price-repeat-wear:2

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ chị đang có nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Với số đo của chị, em chọn size **M** vừa vặn ạ. 

Về mức giá 749k, chị nhận được cả set gồm áo sơ mi dáng rộng và quần ống suông lưng chun thoải mái; chị vừa có bộ đồ mặc đi làm chỉn chu, vừa linh hoạt tách áo để phối thêm với đồ sẵn có trong tủ, dùng được nhiều cách hơn ạ. Set navy size M bên em đang sẵn hàng nhé chị.
```

## r14-price-repeat-wear:3

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ chị đang có nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Chị lấy size M vừa đẹp ạ. Với set này, mình vừa có nguyên bộ đi làm chỉnh chu, vừa linh hoạt tách áo hoặc quần để phối với nhiều đồ sẵn có trong tủ, dùng được rất nhiều cách cho trang phục hàng ngày.
```

## r14-pants-size-input:1

Customer: Chị lấy quần navy, giao nội thành TP.HCM nhé. Cả ship bao nhiêu, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Tổng đơn quần navy giao nội thành TP.HCM là 484.000đ chị nhé (gồm 459.000đ tiền quần và 25.000đ phí ship). Để em chọn chuẩn size, chị cho em xin số đo vòng eo và vòng mông nhé ạ.
```

## r14-stage-light-change:1

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Size M trắng vẫn còn chị nhé. Đèn chiếu từ phía sau (ngược sáng) thì áo trắng có thể thấy bóng áo lót, nên với sự kiện sân khấu này em không khuyên chọn màu trắng ạ.
```

## r14-stage-light-change:2

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Size M trắng nhà em vẫn còn chị nhé. Nhưng lên sân khấu có đèn chiếu từ phía sau thì áo trắng có thể thấy bóng áo lót, với dịp này chị không nên lấy màu trắng ạ.
```

## r14-stage-light-change:3

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Trắng M bên em còn chị nhé. Nhưng với đèn sân khấu chiếu từ phía sau, áo trắng có thể thấy bóng áo lót nên chị không nên lấy màu trắng cho dịp này.
```

## r14-refund-before-buy:1

Customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Chị lấy trắng M nhé, áo 499k và còn hàng."}]
```

Actual terminal customer outcome:
```text
Bên em đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng chị nhé, bên em không áp dụng hoàn tiền ạ. Em ghi nhận chị lấy sơ mi trắng size M (499k) ạ.
```

## r14-refund-before-buy:2

Customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Chị lấy trắng M nhé, áo 499k và còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, trắng M chị nhé. Bên em đổi size hoặc đổi mẫu trong 7 ngày từ ngày nhận hàng, không áp dụng hoàn tiền ạ.
```

## r14-refund-before-buy:3

Customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Chị lấy trắng M nhé, áo 499k và còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ chị chốt trắng M ạ. Bên em hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng, shop không áp dụng hoàn tiền ạ.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị mua áo thôi ạ. Ở nhà mình đã có nhiều quần rồi thì không cần thêm, mua thêm quần chỉ để freeship sẽ tốn kém hơn việc thanh toán 25k tiền ship. 

Tổng áo kèm ship là 524k chị nhé.
```

## r15-value-use:1

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối với đồ chị đang có."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Em vẫn chọn set này cho chị nhé. Giá này đổi lại một bộ gồm cả áo dáng rộng lẫn quần suông đứng dáng mặc đi làm rất chỉn chu, cuối tuần mình lại tách áo ra phối linh hoạt được với đồ sẵn có, dùng được rất nhiều cách ạ.
```

## r15-value-use:2

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối với đồ chị đang có."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Mức giá 749k là trọn bộ cả áo sơ mi và quần suông, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn chỉn chu, cuối tuần lại dễ dàng tách áo ra phối đồ đi chơi. Chị gửi em số đo ngực, eo, mông để em chọn size vừa vặn nhé ạ.
```

## r15-value-use:3

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối với đồ chị đang có."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Em vẫn chọn mẫu này cho chị nhé. Với set này, chị vừa có trang phục đi làm chỉn chu, vừa tách được áo ra phối đồ linh hoạt vào cuối tuần, mình tận dụng được nhiều cách mặc rất tiện ạ.
```

## r15-fit-reassurance:1

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Chị yên tâm ạ, mẫu này lưng chun toàn vòng và giãn tối đa tới 88cm nên không bị cứng cạp đâu ạ, eo 74cm của chị ngồi nhiều rất thoải mái. Thiết kế quần ống suông và sơ mi dáng rộng mặc đi làm vừa lịch sự lại dễ chịu.
```

## r15-fit-reassurance:2

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Dạ, em ghi nhận chị chốt set ST411 be size M nhé ạ. Chị yên tâm, quần này dùng lưng chun toàn vòng (độ kéo tối đa 88cm) chứ không phải cạp cứng, rất thoải mái khi chị ngồi nhiều làm việc. Áo dáng rộng kết hợp quần ống suông chuẩn số đo của chị, mặc đi làm vừa gọn gàng vừa dễ chịu ạ.
```

## r15-fit-reassurance:3

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Em ghi nhận chị lấy set be size M nhé ạ. Chị yên tâm, quần này có lưng chun toàn vòng (độ kéo tối đa 88cm, eo chị 74cm mặc thoải mái), không bị cạp cứng nên ngồi làm việc nhiều cả ngày rất dễ chịu, rất hợp với nhu cầu đi làm của chị ạ.
```

## r15-known-waist-next:1

Customer: Eo chị 74cm, mặc M được không em? Quần cả ship bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn QU714 navy, eo 74cm. Chị ở nội thành TP.HCM."},{"role":"shop","text":"Quần 459k, navy còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị cho em xin thêm số đo vòng mông để em kiểm tra chính xác size M cho mình nhé ạ. Tổng tiền quần và phí ship nội thành của mình là 484.000đ ạ.
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn trắng size M, 499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy chị có nhé."}]
```

Actual terminal customer outcome:
```text
Dạ giá vẫn 499k chị nhé. Áo xanh nhạt mặc cùng quần navy rất nhã nhặn và đồng bộ, size M hiện còn hàng ạ.
```

## r16-effort-and-use:1

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Set này mặc đi làm vừa lịch sự vừa thoải mái, còn cuối tuần mình diện đi chơi hay tách áo, quần ra phối với đồ khác đều rất năng động và tiện dụng.
```

## r16-effort-and-use:2

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Set này mang đến vẻ chỉn chu, lịch sự cho môi trường công sở, đồng thời form áo rộng cùng quần lưng chun thoải mái rất hợp để đi chơi cuối tuần, lại dễ tách rời phối đồ linh hoạt.
```

## r16-effort-and-use:3

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Dạ rất hợp chị nhé. Áo sơ mi dáng rộng kết hợp quần ống suông màu navy mặc đi làm vừa lịch sự vừa gọn gàng. Cuối tuần mình tách ra phối đồ đi chơi rất thoải mái, áo mặc riêng với quần jeans hay quần suông phối cùng áo phông đều rất năng động ạ.
```

## r16-budget-alternative:1

Customer: Chị chỉ có 600k thôi em. Áo trắng với quần đen thì quen quá, em chọn mẫu hoặc màu khác giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen rồi, đang xem sơ mi trắng SM613. Giao nội thành TP.HCM em nhé."},{"role":"shop","text":"Áo cả ship 524k chị nhé. Quần QU714 459k, mua thêm thì cả hai 958k, miễn ship."}]
```

Actual terminal customer outcome:
```text
Chị chuyển sang sơ mi SM613 màu xanh nhạt nhé ạ; sắc xanh dịu mắt giúp tổng thể tươi mới và đỡ quen thuộc hơn màu trắng. 

Áo giá 499k cộng 25k phí ship nội thành, tổng thanh toán là 524k, vừa vặn trong ngân sách 600k của chị ạ.
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi ý mặc váy đi tiệc trong nhà em nhé. Em chọn màu với size giúp chị luôn, dưới 850k là được.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực 92, eo 74, mông 96cm. Ban đầu định lấy set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 chị đều mặc M nhé."}]
```

Actual terminal customer outcome:
```text
Chị lấy váy midi chữ A VA512 màu đen size M nhé ạ. Váy có giá 829.000đ, thiết kế cổ vuông và lót toàn thân rất chỉn chu, sang trọng để đi tiệc trong nhà ạ.
```

## r16-pants-color-alternative:1

Customer: Không thêm quần chỉ để freeship đâu em. Chị muốn thay chiếc quần đen bằng màu khác, mặc với áo trắng thì nên lấy màu nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"Quần QU714 459k chị nhé, có đen và navy. Cạp trước phẳng, phía sau là chun."}]
```

Actual terminal customer outcome:
```text
Dạ, chị lấy quần suông QU714 màu navy nhé. Sắc navy vừa lịch sự, dễ phối cùng áo trắng SM613 lại khác với chiếc quần đen chị đang có ở nhà. Quần có giá 459.000đ ạ. 

Để em chọn chuẩn size cho mình, chị cho em xin số đo vòng eo và vòng mông nhé.
```
