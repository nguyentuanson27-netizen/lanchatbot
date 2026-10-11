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
Chị chọn set sơ mi quần suông ST411 size M nhé ạ, giá 749k. Quần thiết kế lưng chun toàn vòng nên chị ngồi làm việc cả ngày sẽ rất thoải mái, không lo cấn bụng. 

Chị thích mặc màu be hay navy ạ?
```

## r5-competitor-price:1

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Set này gồm cả áo và quần form chuẩn đi làm, chất vải ít nhăn nên chị mặc cả ngày vẫn giữ được độ gọn gàng, phẳng phiu mà không mất công là ủi nhiều ạ.
```

## r5-competitor-price:2

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ, set này dùng chất vải ít nhăn nên chị mặc đi làm cả ngày vẫn giữ phom dáng chỉn chu, tính ra vừa lịch sự lại tiện tách rời phối đồ ạ.
```

## r5-competitor-price:3

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r5-wardrobe-budget:1

Customer: Chị ở nội thành TP.HCM. Lấy áo thôi hay cả set em? Chị không muốn mua thừa quần.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn mua thêm đồ đi làm. Cả ship dưới 600k nhé em."},{"role":"shop","text":"Sơ mi SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 cả áo quần 749k."}]
```

Actual terminal customer outcome:
```text
Chị lấy áo SM613 nhé ạ. Tổng gồm ship nội thành là 524k, vừa vặn ngân sách dưới 600k của chị. Mình đã có quần navy thì lấy áo phối cùng luôn, set ST411 giá 749k sẽ thừa quần và quá ngân sách. 

Chị thích màu trắng hay xanh nhạt ạ? Cho em xin số đo ngực để em chọn size chuẩn nhé.
```

## r5-white-opacity:1

Customer: Ngực chị 92cm. Chị họp trong phòng và mặc áo lót màu da rồi, lấy trắng được em nhỉ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, mà sợ lộ áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng không thấy màu áo lót chị nhé. Ngược sáng vẫn có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ lấy trắng được chị nhé, họp trong phòng mặc áo lót màu da là không thấy màu áo lót ạ. Ngực 92cm mình lấy size M chị nhé, trắng M bên em đang sẵn hàng.
```

## r5-size-price-stock:1

Customer: Chị mặc size nào em? Giao nội thành TP.HCM cả ship bao nhiêu, dưới 900k nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy váy VA512 màu rêu đi tiệc. Ngực 96, eo 77, mông 104cm."},{"role":"shop","text":"Rêu còn S, M, L chị nhé, váy 829k."}]
```

Actual terminal customer outcome:
```text
Chị mặc size L nhé ạ. Đơn nội thành được miễn phí ship, tổng thanh toán là 829k chị nha.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thành TP.HCM, quần này cả ship bao nhiêu? Navy còn không em, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng chị đang có."},{"role":"shop","text":"Em có quần QU714 navy 459k chị nhé. Ống suông, lưng có chun phía sau, còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ, quần navy nhà em còn đủ size S, M, L chị nhé. Tổng thanh toán gồm ship nội thành TP.HCM là 484k ạ. 

Chị cho em xin số đo vòng eo và vòng mông để em chọn size vừa vặn cho mình nha.
```

## r5-white-variant-alternative:1

Customer: Trắng L còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực 98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực 98cm chị xem size L. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Trắng size L hết rồi chị ạ. Chị lấy xanh nhạt size L nhé, mặc với quần đen rất sáng và hợp, giá 499k ạ.
```

## r5-delivery-timing:1

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, nội thành TP.HCM bên em dự kiến giao 2–3 ngày sau xác nhận đơn, nhưng đây là khoảng thời gian dự kiến và không phải cam kết ngày giờ cụ thể nên bên em không dám chắc kịp sáng thứ Sáu cho mình ạ.
```

## r5-delivery-timing:2

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, nội thành bên em dự kiến giao 2–3 ngày sau xác nhận đơn nhưng không có cam kết giao đúng ngày giờ cụ thể, nên em không dám đảm bảo kịp sáng thứ Sáu cho lịch của chị ạ.
```

## r5-delivery-timing:3

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Nội thành TP.HCM dự kiến 2–3 ngày sau xác nhận đơn chị ạ, đây là khoảng thời gian dự kiến nên bên em không cam kết giao kịp chính xác sáng thứ Sáu được.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá 749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần 749k. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ, áo sơ mi xanh nhạt giá 499k chị nhé. Vòng ngực 92cm mình mặc size M vừa đẹp ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực 96, eo 77, mông 104cm. Chuyển L nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực 91, eo 72, mông 97cm."},{"role":"shop","text":"Theo số đo đó em chọn M cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, chuyển L chị nhé. Đen size L bên em đang còn hàng và vừa vặn với số đo mới của mình ạ.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó còn M thì chị lấy M nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set 749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quần navy thôi, áo có rồi. Eo74, mông 98cm."},{"role":"shop","text":"Dạ, quần QU714 navy size M theo số đo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 navy size M, 459k chị nhé.
```

## r5-budget-correction:1

Customer: Chị tính lại còn 550k cả ship thôi em. Mua áo nào mặc với quần navy đi làm đẹp?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set 749k, định dành 800k. Chị có quần navy rồi, ở nội thành TP.HCM."},{"role":"shop","text":"Set ST411 có be và navy chị nhé. Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Áo sơ mi SM613 giá 499k, phí ship nội thành 25k tổng là 524k, vừa đúng ngân sách 550k của chị ạ. Mẫu này có màu trắng hoặc xanh nhạt mặc với quần navy đi làm rất lịch sự. Chị cho em xin số đo vòng ngực để em chọn size vừa nhé.
```

## r5-defer:1

Customer: Chị chưa lấy đâu, cuối tuần tính nhé. Đừng giữ hàng cho chị, cũng không cần hỏi thêm đâu.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đen L đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ 829k chị nhé, đen L còn 2 chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng, cuối tuần chị xem lại nhé ạ!
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đen L nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà, giữ nguyên tem, sạch, không mùi và chưa giặt thì đổi được trong 7 ngày chị nhé. Còn mặc đi tiệc ra ngoài rồi thì shop không nhận đổi ạ.
```

## r5-try-exchange:2

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đen L nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà vẫn đổi được nếu trong 7 ngày, sạch, không mùi, chưa giặt và giữ nguyên tem (khách chịu phí ship đổi). Còn mặc đi tiệc ra ngoài rồi thì shop không nhận đổi chị nhé.
```

## r5-try-exchange:3

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đen L nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ thử trong nhà, chưa giặt, sạch, không mùi, giữ nguyên tem trong 7 ngày thì đổi được chị nhé. Còn mặc đi tiệc rồi shop không nhận đổi ạ.
```

## r5-exchange-cost:1

Customer: Lỡ không vừa thì phí đổi bên em chịu chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Chị lấy M nhé, be M đang còn. Set 749k."}]
```

Actual terminal customer outcome:
```text
Dạ phí đổi hàng khách chịu chị nhé.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần cho được freeship không em? Chị có quần đen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613 499k, ở nội thành TP.HCM."},{"role":"shop","text":"Áo cả ship 524k chị nhé, mua từ 700k thì miễn ship. Em có quần QU714 459k nữa."}]
```

Actual terminal customer outcome:
```text
Dạ mình không nên thêm quần chỉ để lấy freeship chị nhé, vì phí ship có 25k trong khi tiền quần là 459k. Chị có quần đen rồi thì cứ lấy áo sơ mi trước (tổng 524k). 

Nếu chị muốn thêm màu navy để đổi qua lại với quần đen sẵn có cho đa dạng đồ đi làm thì hãng lấy thêm, còn không thì mình giữ nguyên đơn áo nhé ạ.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắng M. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực 92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Trắng M 499k chị nhé. Mặc với áo lót màu da trong phòng thì không thấy màu áo lót; ngược sáng vẫn có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ, shop không áp dụng hoàn tiền chị ạ. Nhưng mình được đổi size hoặc đổi mẫu trong 7 ngày (hàng nguyên tem, chưa sử dụng) chị nha.
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
Dạ, navy size M còn hàng chị nhé.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết set ST411 749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, chị cần hỗ trợ thêm cứ nhắn em nha!
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Set này gồm cả áo và quần suông, chất vải ít nhăn hơn linen giúp chị mặc đi làm cả ngày vẫn giữ được độ chỉn chu. Với số đo của chị, mình lấy size M vừa đẹp nhé ạ, navy size M bên em đang có sẵn.
```

## r7-price-ready-fit:2

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Chị mặc size M vừa đẹp ạ. Set này chất vải ít nhăn hơn linen, giữ phom chỉn chu cả ngày đi làm, cùng lưng chun co giãn thoải mái nên mặc rất dễ chịu chị nhé.
```

## r7-price-ready-fit:3

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Set này gồm cả áo sơ mi dáng rộng và quần ống suông, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn giữ form chỉn chu, tiện lợi. Chị mặc size M nhé, navy size M bên em còn ạ.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thành TP.HCM. Cả ship có dưới 600k không em? Chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn mua thêm áo đi làm. Cả ship dưới 600k nhé."},{"role":"shop","text":"Áo SM613 499k, có trắng và xanh nhạt. Set ST411 749k chị nhé."},{"role":"customer","text":"Chị lấy riêng áo xanh nhạt thôi nhé."},{"role":"shop","text":"Dạ, xanh nhạt 499k, có S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ tổng 524k chị nhé (499k áo và 25k ship nội thành), dưới 600k ạ. Chị cho em xin số đo vòng ngực để em chọn size vừa nhé.
```

## r7-opacity-context-change:1

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Dạ có đèn chiếu phía sau (ngược sáng) thì áo trắng vẫn có thể thấy bóng áo lót chị nhé. Trắng M hiện shop vẫn còn chị nha.
```

## r7-opacity-context-change:2

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Áo trắng gặp đèn chiếu phía sau (đèn ngược sáng) thì có thể thấy bóng áo lót chị nhé. Trắng M hiện vẫn còn hàng ạ.
```

## r7-opacity-context-change:3

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót chị nhé. Trắng M hiện vẫn còn hàng chị ạ.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong 7 ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo 74, mông 96cm."},{"role":"shop","text":"Em chọn M theo số đo chị nhé, be M đang còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r7-exchange-after-use:2

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong 7 ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo 74, mông 96cm."},{"role":"shop","text":"Em chọn M theo số đo chị nhé, be M đang còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r7-exchange-after-use:3

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong 7 ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo 74, mông 96cm."},{"role":"shop","text":"Em chọn M theo số đo chị nhé, be M đang còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng thôi. Em chọn màu áo giúp chị, quần chị không lấy thêm đâu. Chị mặc size nào em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Áo SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 gồm áo quần 749k."}]
```

Actual terminal customer outcome:
```text
Chị lấy áo xanh nhạt nhé, mặc cùng quần navy rất nhẹ nhàng và sáng người. Chị cho em xin số đo vòng ngực để em chọn size vừa vặn ạ.
```

## r12-pants-known-waist:1

Customer: Eo chị 74, lấy M được không em? Cả ship hết bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy 459k, còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Tổng đơn kèm ship nội thành của mình là 484.000đ chị nhé. Chị cho em xin thêm số đo mông để em kiểm tra chính xác size M có vừa với mình không ạ.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt phối với quần navy chị có nhé. Vẫn M nhỉ? Áo xanh giá bao nhiêu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, xanh nhạt size M chị mặc vừa nhé, áo vẫn 499k ạ. Xanh nhạt phối cùng quần navy nhìn nhã nhặn và rất đồng bộ chị nhé.
```

## r12-indoor-exchange-eligible:1

Customer: Vậy chị đổi qua mẫu khác được đúng không em? Phí gửi đổi chị trả hả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày, hàng chưa dùng và còn tem chị nhé."},{"role":"customer","text":"Ví dụ chị nhận được 5 ngày, chỉ thử ở nhà, chưa giặt, cũng chưa mặc ra ngoài thì sao?"},{"role":"shop","text":"Chị giữ nguyên tem, váy sạch và không mùi nữa nhé."},{"role":"customer","text":"Ừ, tem chị để nguyên, váy vẫn sạch không mùi."},{"role":"shop","text":"Phí vận chuyển đổi chị trả nhé."}]
```

Actual terminal customer outcome:
```text
Dạ được chị nhé, mình đổi mẫu được ạ. Phí vận chuyển đổi chị trả nha.
```

## r14-workday-choice:1

Customer: Ngực 92, eo 74, mông 96cm em nhé. Set hay váy hợp hơn? Em xem size giúp chị luôn.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên sợ cấn bụng."},{"role":"shop","text":"Set ST411 749k có quần suông lưng chun chị nhé. Váy VA512 829k thì eo cố định."}]
```

Actual terminal customer outcome:
```text
Set ST411 hợp với chị hơn ạ, quần có lưng chun toàn vòng giúp ngồi làm việc nhiều thoải mái, không lo cấn bụng như váy VA512 eo cố định. Với số đo của chị, set ST411 mình mặc size M vừa đẹp nhé.
```

## r14-price-repeat-wear:1

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ chị đang có nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
749k là cả set gồm cả áo lẫn quần chị ạ, mình vừa mặc nguyên bộ đi làm vừa tách áo hoặc quần phối đồ khác được. Chị lấy size M mặc vừa đẹp nhé.
```

## r14-price-repeat-wear:2

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ chị đang có nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Chị lấy size M nhé, eo 74cm mặc thoải mái vì chun quần size M kéo tối đa 88cm, màu navy đang sẵn hàng ạ. Giá 749k là cho cả set gồm cả áo lẫn quần suông, tính ra mình vừa mặc nguyên bộ đi làm vừa dễ tách áo ra phối đồ linh hoạt rất tiện chị nhé.
```

## r14-price-repeat-wear:3

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ chị đang có nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Chị mặc size M vừa vặn chị nhé. Set gồm cả áo và quần, khoản chi này cho chị cả bộ đồ đi làm chỉn chu lẫn chiếc áo rời để linh hoạt phối với đồ sẵn có, lại thêm chất vải ít nhăn hơn linen giúp chị luôn gọn gàng suốt ngày dài.
```

## r14-pants-size-input:1

Customer: Chị lấy quần navy, giao nội thành TP.HCM nhé. Cả ship bao nhiêu, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Tổng đơn của chị là 484.000đ ạ (459k tiền quần và 25k phí ship nội thành HCM). Để em chọn chuẩn size cho chị, chị cho em xin số đo vòng eo và vòng mông nhé.
```

## r14-stage-light-change:1

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Trắng M nhà mình vẫn còn chị nhé. Nhưng lên sân khấu đèn chiếu phía sau có thể thấy bóng áo lót, mình không nên lấy màu trắng cho dịp này ạ.
```

## r14-stage-light-change:2

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r14-stage-light-change:3

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ, size M trắng nhà em vẫn còn chị nhé. Nhưng với đèn chiếu phía sau trên sân khấu, mẫu này có thể thấy bóng áo lót, chị không nên lấy trắng cho dịp này nha.
```

## r14-refund-before-buy:1

Customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Chị lấy trắng M nhé, áo 499k và còn hàng."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r14-refund-before-buy:2

Customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Chị lấy trắng M nhé, áo 499k và còn hàng."}]
```

Actual terminal customer outcome:
```text
Bên em không áp dụng hoàn tiền, chỉ hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng chị nhé. Điều kiện đổi là sản phẩm sạch, không mùi, chưa giặt, nguyên tem và chỉ thử trong nhà (phí vận chuyển đổi hàng do chị chịu ạ).
```

## r14-refund-before-buy:3

Customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Chị lấy trắng M nhé, áo 499k và còn hàng."}]
```

Actual terminal customer outcome:
```text
Bên em không áp dụng hoàn tiền chị nhé, mình được đổi size hoặc đổi mẫu trong 7 ngày ạ.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Sơ mi SM613 phối cùng quần suông đen QU714 thành bộ công sở gọn gàng, sẵn đồ đi làm. Cả bộ là 958k (miễn phí ship); mua riêng áo tổng 524k. Ở nhà chị đã nhiều quần rồi thì mình lấy mỗi áo trước cũng được chị nhé.
```

## r15-value-use:1

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối với đồ chị đang có."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Dạ, 749k là gồm trọn bộ cả áo sơ mi dáng rộng lẫn quần suông lưng chun chị ạ. Chị vừa có nguyên set chỉnh chu đi làm, vừa tách áo ra phối đồ cuối tuần đúng ý mình luôn ạ.
```

## r15-value-use:2

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối với đồ chị đang có."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Chất vải set này ít nhăn, mặc đi làm giữ phom chỉn chu cả ngày, lại dễ tách áo quần phối đồ linh hoạt nên chị dùng được nhiều dịp ạ.
```

## r15-value-use:3

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối với đồ chị đang có."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Set gồm cả áo rộng và quần suông chun, vải ít nhăn hơn linen nên chị mặc đi làm cả ngày vẫn đứng form chỉn chu. Cuối tuần chị tách áo ra phối linh hoạt với đồ sẵn có, tiện dùng được nhiều dịp chị nha.
```

## r15-fit-reassurance:1

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Quần có lưng chun toàn vòng nên không bị cạp cứng đâu chị nhé, ngồi làm việc nhiều thoải mái lắm ạ. Thiết kế áo dáng rộng với quần ống suông mặc đi làm rất hợp và dễ chịu. 

Set be size M 749k chị nhé.
```

## r15-fit-reassurance:2

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Dạ chị yên tâm, quần này thiết kế lưng chun toàn vòng, co giãn thoải mái (tối đa 88cm cho size M) nên không bị cứng hay cấn bụng khi chị ngồi nhiều đâu ạ. Phom suông rộng lịch sự, rất hợp để chị mặc đi làm, chị lấy size M nhé.
```

## r15-fit-reassurance:3

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set 749k."}]
```

Actual terminal customer outcome:
```text
Dạ, mẫu này lưng chun toàn vòng nên không bị cạp cứng đâu chị nhé; chun M co giãn thoải mái cho eo 74cm nên ngồi nhiều rất dễ chịu ạ. Chị lấy size M set be (749k) nhé ạ.
```

## r15-known-waist-next:1

Customer: Eo chị 74cm, mặc M được không em? Quần cả ship bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn QU714 navy, eo 74cm. Chị ở nội thành TP.HCM."},{"role":"shop","text":"Quần 459k, navy còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Tổng thanh toán là 484k chị nhé (459k quần + 25k phí ship nội thành). Eo 74cm của chị nằm trong khoảng co giãn của size M (tối đa 84cm), chị cho em xin thêm số đo mông để em kiểm tra độ vừa vặn chính xác nhất nhé ạ.
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn trắng size M, 499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy chị có nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, xanh nhạt size M vẫn 499k chị nhé. Xanh nhạt mặc cùng quần navy nhã nhặn và rất hợp ạ.
```

## r16-effort-and-use:1

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Áo dáng rộng cùng quần ống suông tạo nét lịch sự, chỉn chu khi đi làm; cuối tuần chị tách set ra phối đồ đi chơi vừa thoải mái vừa linh hoạt.
```

## r16-effort-and-use:2

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Áo sơ mi dáng rộng mặc cùng quần ống suông rất lịch sự và gọn gàng để đi làm. Cuối tuần chị tách riêng áo để phối đồ hoặc mặc quần suông với áo khác đi chơi đều thoải mái.
```

## r16-effort-and-use:3

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Set navy mặc đi làm lịch sự, cuối tuần đi chơi thoải mái và gọn gàng, chị mặc cả set hay tách rời đều tiện.
```

## r16-budget-alternative:1

Customer: Chị chỉ có 600k thôi em. Áo trắng với quần đen thì quen quá, em chọn mẫu hoặc màu khác giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen rồi, đang xem sơ mi trắng SM613. Giao nội thành TP.HCM em nhé."},{"role":"shop","text":"Áo cả ship 524k chị nhé. Quần QU714 459k, mua thêm thì cả hai 958k, miễn ship."}]
```

Actual terminal customer outcome:
```text
Chị đổi sang sơ mi SM613 màu xanh nhạt nhé ạ; mặc với quần đen sẵn có sẽ dịu và đỡ quen thuộc hơn áo trắng. Tổng cả ship là 524k, vừa vặn ngân sách 600k của mình ạ.
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi ý mặc váy đi tiệc trong nhà em nhé. Em chọn màu với size giúp chị luôn, dưới 850k là được.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực 92, eo 74, mông 96cm. Ban đầu định lấy set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 chị đều mặc M nhé."}]
```

Actual terminal customer outcome:
```text
Chị lấy váy VA512 màu đen, size M chị nhé. Váy giá 829k, dáng chữ A cổ vuông sang trọng, mặc đi tiệc trong nhà rất hợp và vừa ngân sách của chị ạ.
```

## r16-pants-color-alternative:1

Customer: Không thêm quần chỉ để freeship đâu em. Chị muốn thay chiếc quần đen bằng màu khác, mặc với áo trắng thì nên lấy màu nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"Quần QU714 459k chị nhé, có đen và navy. Cạp trước phẳng, phía sau là chun."}]
```

Actual terminal customer outcome:
```text
Dạ, chị lấy quần QU714 màu navy nhé. Áo trắng SM613 kết hợp với quần navy rất lịch sự, nhã nhặn và không bị trùng với chiếc quần đen chị sẵn có ở nhà. Cả bộ 958k được miễn phí giao hàng luôn chị ạ.
```
