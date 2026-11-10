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
Em chọn set ST411 size M nhé chị. Quần lưng chun toàn vòng ngồi làm việc cả ngày rất thoải mái, giá 749k đúng tầm ngân sách chị đang cần.
```

## r5-competitor-price:1

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Chị lấy set ST411 bên em nhé. Mặc đi làm thường xuyên thì set này rất tiện: chất vải ít nhăn hơn linen giúp chị ngồi làm việc cả ngày vẫn gọn gàng, quần lưng chun thoải mái, lại dễ tách áo hoặc quần ra phối với các đồ khác được chị ạ.
```

## r5-competitor-price:2

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Em chọn set ST411 chị nhé. Mua cả bộ vừa nhanh gọn đi làm, vừa tách rời áo hoặc quần để phối linh hoạt với các món khác trong tủ, tính ra dùng được nhiều kiểu chị ạ. Vải ít nhăn và đứng dáng, mặc cả ngày làm việc vẫn giữ form chỉn chu.
```

## r5-competitor-price:3

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Em chọn set ST411 chị nhé. Bộ gồm cả áo và quần suông, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn giữ form chỉn chu. Chị có thể mặc cả bộ hoặc tách rời phối với đồ khác rất linh hoạt, dùng được nhiều dịp.
```

## r5-wardrobe-budget:1

Customer: Chị ở nội thành TP.HCM. Lấy áo thôi hay cả set em? Chị không muốn mua thừa quần.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn mua thêm đồ đi làm. Cả ship dưới 600k nhé em."},{"role":"shop","text":"Sơ mi SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 cả áo quần 749k."}]
```

Actual terminal customer outcome:
```text
Chị lấy áo SM613 thôi nhé ạ. Áo 499k cộng 25k ship nội thành là 524k, vừa vặn ngân sách dưới 600k của chị và không bị thừa quần. Set ST411 giá 749k vượt ngân sách rồi ạ. Áo trắng hoặc xanh nhạt phối với quần navy sẵn có của chị đi làm rất đẹp nha.
```

## r5-white-opacity:1

Customer: Ngực chị 92cm. Chị họp trong phòng và mặc áo lót màu da rồi, lấy trắng được em nhỉ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, mà sợ lộ áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng không thấy màu áo lót chị nhé. Ngược sáng vẫn có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Chị lấy trắng size M nhé chị. Ngồi họp trong phòng và mặc áo lót màu da thì không thấy màu áo, với ngực 92cm chị mặc size M là vừa đẹp ạ.
```

## r5-size-price-stock:1

Customer: Chị mặc size nào em? Giao nội thành TP.HCM cả ship bao nhiêu, dưới 900k nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy váy VA512 màu rêu đi tiệc. Ngực 96, eo 77, mông 104cm."},{"role":"shop","text":"Rêu còn S, M, L chị nhé, váy 829k."}]
```

Actual terminal customer outcome:
```text
Chị mặc size L nhé. Đơn 829k được miễn phí ship nội thành TP.HCM nên tổng thanh toán là 829k, dưới 900k như chị cần ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thành TP.HCM, quần này cả ship bao nhiêu? Navy còn không em, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Em có quần QU714 navy 459k chị nhé. Ống suông, lưng có chun phía sau, còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Tổng thanh toán là 484k (quần 459k và 25k ship nội thành TP.HCM) chị nhé. Quần navy mình còn đủ size S, M, L, chị cho em xin số đo eo và mông để em chọn size vừa chuẩn cho mình ạ.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Trắng size L hết rồi chị ạ. Chị lấy sang xanh nhạt size L nhé, màu này mặc với quần đen rất sáng và lịch sự.
```

## r5-delivery-timing:1

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Em chưa đảm bảo giao kịp sáng thứ Sáu cho chị được nhé ạ, vì thời gian giao dự kiến là 2–3 ngày sau xác nhận đơn và bên em không có cam kết giờ giao cụ thể.
```

## r5-delivery-timing:2

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Em chưa đảm bảo giao kịp sáng thứ Sáu được chị nhé, nội thành dự kiến 2–3 ngày sau xác nhận đơn nhưng bên em không cam kết giờ đến cụ thể.
```

## r5-delivery-timing:3

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Em chưa đảm bảo giao kịp sáng thứ Sáu được chị nhé, vì thời gian dự kiến là 2–3 ngày sau xác nhận đơn và không có cam kết giờ đến cụ thể.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ áo 499k chị nhé, ngực 92cm chị lấy size M vừa đẹp ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ chị lấy size L chuẩn hơn với số đo này ạ, đen L bên em vẫn còn hàng chị nhé.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 navy size M (459k) chị nhé.
```

## r5-budget-correction:1

Customer: Chị tính lại còn 550k cả ship thôi em. Mua áo nào mặc với quần navy đi làm đẹp?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set 749k, định dành 800k. Chị có quần navy rồi, ở nội thành TP.HCM."},{"role":"shop","text":"Set ST411 có be và navy chị nhé. Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Chị lấy áo sơ mi SM613 màu trắng hoặc xanh nhạt nhé ạ. Tổng thanh toán gồm 499k tiền áo và 25k phí ship nội thành là 524k, vừa khéo trong ngân sách 550k của chị. Dáng áo sơ mi thẳng mặc gọn gàng, phối cùng quần navy sẵn có của chị đi làm rất lịch sự.
```

## r5-defer:1

Customer: Chị chưa lấy đâu, cuối tuần tính nhé. Đừng giữ hàng cho chị, cũng không cần hỏi thêm đâu.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đen L đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ 829k chị nhé, đen L còn 2 chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, cuối tuần chị xem lại nhé ạ.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà thoải mái ạ, miễn là váy chưa giặt, sạch, không mùi và còn nguyên tem trong 7 ngày từ lúc nhận. Còn mặc đi tiệc ra ngoài rồi thì bên em không nhận đổi chị nhé.
```

## r5-try-exchange:2

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà, giữ nguyên tem, sạch, không mùi và chưa giặt thì đổi được chị nhé. Còn mặc đi tiệc ra ngoài rồi thì shop không nhận đổi ạ.
```

## r5-try-exchange:3

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ chị thử trong nhà vẫn đổi được trong 7 ngày nếu chưa giặt, sạch, không mùi và còn nguyên tem ạ. Còn mặc đi tiệc ra ngoài rồi thì shop không nhận đổi chị nhé.
```

## r5-exchange-cost:1

Customer: Lỡ không vừa thì phí đổi bên em chịu chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Chị lấy M nhé, be M đang còn. Set 749k."}]
```

Actual terminal customer outcome:
```text
Dạ phí vận chuyển đổi hàng mình chịu chị nha.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần cho được freeship không em? Chị có quần đen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613 499k, ở nội thành TP.HCM."},{"role":"shop","text":"Áo cả ship 524k chị nhé, mua từ 700k thì miễn ship. Em có quần QU714 459k nữa."}]
```

Actual terminal customer outcome:
```text
Chị lấy thêm quần QU714 màu navy nhé, khác màu đen chị đang có nên không bị trùng đâu ạ. Tổng cả áo và quần là 958.000đ và được miễn phí ship luôn chị nhé.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực 92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Trắng M 499k chị nhé. Mặc với áo lót màu da trong phòng thì không thấy màu áo lót; ngược sáng vẫn có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Sơ mi SM613 giá 499.000đ chị nhé.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ màu navy size M còn hàng chị nhé.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ vâng, chị cứ xem thêm nhé ạ. Cần hỗ trợ thêm thông tin gì chị cứ nhắn em nha!
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Chị lấy size M nhé, vừa vặn và thoải mái. Set 749k gồm cả áo dáng rộng và quần ống suông lưng chun, chất vải ít nhăn giúp chị giữ form chỉn chu suốt ngày dài đi làm. Ngoài mặc chung cả bộ, chị còn tách áo hoặc quần ra phối với các trang phục khác dễ dàng, dùng rất linh hoạt chị nhé.
```

## r7-price-ready-fit:2

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Chị mặc size M nhé. Set 749k gồm cả áo lẫn quần, chất vải ít nhăn và dễ tách rời phối linh hoạt đi làm, chị dùng được nhiều kiểu.
```

## r7-price-ready-fit:3

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Chị mặc size M nhé. Set 749k gồm cả áo sơ mi dáng rộng và quần ống suông lưng chun, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn giữ phom chỉn chu, áo và quần đều dễ tách rời phối đồ nên dùng được rất nhiều dịp ạ.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thành TP.HCM. Cả ship có dưới 600k không em? Chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn mua thêm áo đi làm. Cả ship dưới 600k nhé."},{"role":"shop","text":"Áo SM613 499k, có trắng và xanh nhạt. Set ST411 749k chị nhé."},{"role":"customer","text":"Chị lấy riêng áo xanh nhạt thôi nhé."},{"role":"shop","text":"Dạ, xanh nhạt 499k, có S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ tổng gồm ship nội thành là 524.000đ, dưới 600k chị nhé. Áo xanh nhạt hiện đủ S, M, L, chị cho em xin vòng ngực để em chọn size vừa ạ.
```

## r7-opacity-context-change:1

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Trắng M vẫn còn chị nhé. Nhưng đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót, dịp này chị không lấy màu trắng nhé.
```

## r7-opacity-context-change:2

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Trắng M hiện vẫn còn chị nhé, nhưng với sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót. Chị không nên lấy mẫu trắng cho dịp này nha.
```

## r7-opacity-context-change:3

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Trắng M bên em vẫn còn chị nhé. Tuy nhiên đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót, chị không lấy mẫu này cho dịp này nha.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Set mặc ra ngoài đi làm thì shop không nhận đổi được chị nhé. Phí vận chuyển đổi hàng thì khách trả ạ.
```

## r7-exchange-after-use:2

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ mặc đi làm ra ngoài thì shop không nhận đổi được chị nhé, mình chỉ thử trong nhà thôi ạ. Phí vận chuyển đổi thì khách trả chị nha.
```

## r7-exchange-after-use:3

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ mặc đi làm ra ngoài là shop không nhận đổi chị nhé; phí vận chuyển đổi hàng thì khách trả ạ.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng thôi. Em chọn màu áo giúp chị, quần chị không lấy thêm đâu. Chị mặc size nào em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Áo SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 gồm áo quần 749k."}]
```

Actual terminal customer outcome:
```text
Em chọn áo xanh nhạt nhé, mặc với quần navy vừa sáng vừa nhã. Chị cho em xin số đo vòng ngực để em chọn size chuẩn ạ. Tổng áo và ship nội thành của chị là 524k nhé.
```

## r12-pants-known-waist:1

Customer: Eo chị 74, lấy M được không em? Cả ship hết bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy 459k, còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Tổng đơn của chị là 484.000đ gồm 459k tiền quần và 25k ship nội thành chị nhé. Chị cho em xin thêm số đo mông để em kiểm tra xem size M có vừa với mình không nha.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, áo xanh nhạt size M giá 499.000đ chị nhé, size này shop vẫn còn hàng ạ. Xanh nhạt phối với quần navy mặc hợp và đẹp lắm chị.
```

## r12-indoor-exchange-eligible:1

Customer: Vậy chị đổi qua mẫu khác được đúng không em? Phí gửi đổi chị trả hả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày, hàng chưa dùng và còn tem chị nhé."},{"role":"customer","text":"Ví dụ chị nhận được 5 ngày, chỉ thử ở nhà, chưa giặt, cũng chưa mặc ra ngoài thì sao?"},{"role":"shop","text":"Chị giữ nguyên tem, váy sạch và không mùi nữa nhé."},{"role":"customer","text":"Ừ, tem chị để nguyên, váy vẫn sạch không mùi."},{"role":"shop","text":"Phí vận chuyển đổi chị trả nhé."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị, mình đổi sang mẫu khác được và phí vận chuyển đổi chị trả ạ.
```

## r14-workday-choice:1

Customer: Ngực 92, eo 74, mông 96cm em nhé. Set hay váy hợp hơn? Em xem size giúp chị luôn.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên sợ cấn bụng."},{"role":"shop","text":"Set ST411 749k có quần suông lưng chun chị nhé. Váy VA512 829k thì eo cố định."}]
```

Actual terminal customer outcome:
```text
Set ST411 hợp hơn chị nhé, quần lưng chun toàn vòng ngồi nhiều không lo cấn bụng. Chị lấy size M vừa đẹp ạ.
```

## r14-price-repeat-wear:1

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ ở nhà nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Chị lấy size M mặc vừa đẹp chị nhé. Set 749k gồm cả áo sơ mi và quần ống suông lưng chun, vừa diện đi làm nguyên bộ vừa tách áo phối đồ ở nhà linh hoạt, tính ra tiện dụng hơn nhiều, chị lấy set navy size M nhé.
```

## r14-price-repeat-wear:2

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ ở nhà nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Chị lấy size M nhé, số đo của chị mặc size này vừa vặn và thoải mái ạ. 

Mức giá 749k là cho cả set gồm cả áo sơ mi và quần ống suông, mặc đi làm rất chỉn chu; đồng thời thiết kế này giúp chị dễ dàng tách rời áo hoặc quần để phối linh hoạt với các món đồ sẵn có ở nhà đúng ý thích.
```

## r14-price-repeat-wear:3

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ ở nhà nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Chị lấy size M nhé. Set 749k gồm cả áo sơ mi và quần suông, đi làm vừa lịch sự nguyên bộ lại vừa dễ tách áo ra phối đồ như ý chị thích, tính ra rất linh hoạt và tiện dùng ạ.
```

## r14-pants-size-input:1

Customer: Chị lấy quần navy, giao nội thành TP.HCM nhé. Cả ship bao nhiêu, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Tổng thanh toán là 484.000đ chị nhé (gồm 459k tiền quần và 25k phí ship nội thành). Để em chọn chính xác size, chị cho em xin số đo vòng eo và vòng mông nhé ạ!
```

## r14-stage-light-change:1

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Trắng size M mình vẫn còn chị nhé, nhưng lên sân khấu đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót, chị không lấy màu trắng cho dịp này nha.
```

## r14-stage-light-change:2

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ chị không nên lấy trắng cho dịp này nha, vì đèn chiếu phía sau (ngược sáng) có thể thấy bóng áo lót ạ. 

Size M trắng nhà em vẫn còn hàng, nhưng với nhu cầu lên sân khấu này thì áo trắng không phù hợp với chị nha.
```

## r14-stage-light-change:3

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
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
Phần này em chưa trả lời được, chị nhé.
```

## r14-refund-before-buy:3

Customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Chị lấy trắng M nhé, áo 499k và còn hàng."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Ở nhà đã nhiều quần thì chị lấy mỗi áo thôi cho gọn chị nhé, tổng 524k gồm 25k ship. Còn nếu chị muốn phối trọn bộ sơ mi với quần suông đen mặc đi làm thì lấy thêm quần QU714, tổng cả bộ là 958k và được miễn phí ship luôn ạ.
```

## r15-value-use:1

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối đồ ở nhà."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Chị lấy set navy 749k này nhé. Chất vải ít nhăn hơn linen nên mặc đi làm cả ngày ngồi văn phòng vẫn giữ được phom chỉn chu, quần lưng chun ngồi rất thoải mái. Cuối tuần mình tách áo ra mặc ở nhà hay phối đồ khác đều tiện và linh hoạt hơn.
```

## r15-value-use:2

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối đồ ở nhà."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Set ST411 (749k) vải ít nhăn, áo dáng rộng và quần suông lưng chun mặc đi làm hay tách áo phối đồ cuối tuần đều rất gọn gàng và đứng phom. Chị lấy bộ navy thì cho em xin số đo ngực, eo, mông để em chọn size vừa nhé ạ.
```

## r15-value-use:3

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối đồ ở nhà."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Chị lấy set navy nhé. Chất liệu ít nhăn hơn linen giúp đồ giữ phom chỉn chu khi đi làm, đến cuối tuần tách áo ra phối linh hoạt mặc ở nhà rất tiện ạ.
```

## r15-fit-reassurance:1

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, chị lấy size M be nhé. Mẫu này lưng chun toàn vòng nên không bị cứng đâu chị, eo 74 của mình mặc thoải mái và ngồi nhiều lúc đi làm rất dễ chịu. Áo dáng rộng cùng quần suông lịch sự, rất hợp với chị ạ.
```

## r15-fit-reassurance:2

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set749k."}]
```

Actual terminal customer outcome:
```text
Chị yên tâm lấy size M nhé, quần này lưng chun toàn vòng, giãn tối đa tới 88cm nên chị ngồi nhiều thoải mái không sợ cạp cứng đâu ạ.
```

## r15-fit-reassurance:3

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ chị lấy set be size M nhé. Quần có lưng chun toàn vòng nên không bị cạp cứng đâu chị, ngồi nhiều thoải mái không bị siết. Áo sơ mi dáng rộng mặc đi làm vừa lịch sự vừa dễ chịu, rất hợp với chị ạ.
```

## r15-known-waist-next:1

Customer: Eo chị 74cm, mặc M được không em? Quần cả ship bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn QU714 navy, eo 74cm. Chị ở nội thành TP.HCM."},{"role":"shop","text":"Quần 459k, navy còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Tổng đơn của chị là 484.000đ (giá quần 459.000đ và 25.000đ phí ship nội thành TP.HCM). Chị cho em xin thêm số đo mông để em kiểm tra size chuẩn nhất cho mình nhé.
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]
```

Actual terminal customer outcome:
```text
Xanh nhạt size M vẫn 499k chị nhé. Áo màu này phối cùng quần navy nhìn nhã nhặn và rất hợp mặc ở nhà.
```

## r16-effort-and-use:1

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Áo sơ mi dáng rộng và quần suông mặc đi làm chỉn chu, cuối tuần chị tách rời áo hoặc quần ra phối đi chơi đều thoải mái.
```

## r16-effort-and-use:2

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Set navy mặc đi làm gọn gàng, lịch sự; cuối tuần chị tách áo sơ mi phối đồ đi chơi hoặc mặc riêng quần suông đều thoải mái, dễ ứng dụng.
```

## r16-effort-and-use:3

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Áo sơ mi dáng rộng cùng quần suông tạo nét chỉn chu, lịch sự để đi làm; cuối tuần chị tách áo mặc với jeans hoặc tách quần đi cà phê, dạo phố đều thoải mái và năng động. Chất vải ít nhăn giúp giữ phom gọn gàng suốt cả ngày.
```

## r16-budget-alternative:1

Customer: Chị chỉ có 600k thôi em. Áo trắng với quần đen thì quen quá, em chọn mẫu hoặc màu khác giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen rồi, đang xem sơ mi trắng SM613. Giao nội thành TP.HCM em nhé."},{"role":"shop","text":"Áo cả ship 524k chị nhé. Quần QU714 459k, mua thêm thì cả hai 958k, miễn ship."}]
```

Actual terminal customer outcome:
```text
Em đổi sang sơ mi SM613 màu xanh nhạt nhé chị, mặc lên tươi và đỡ quen thuộc hơn áo trắng. Tổng cả ship là 524k, vừa vặn trong ngân sách 600k của chị ạ.
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi ý mặc váy đi tiệc trong nhà em nhé. Em chọn màu với size giúp chị luôn, dưới 850k là được.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực 92, eo 74, mông 96cm. Ban đầu định lấy set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 chị đều mặc M nhé."}]
```

Actual terminal customer outcome:
```text
Chị lấy váy VA512 màu đen size M nhé ạ. Mẫu này 829k, vừa vặn ngân sách dưới 850k của chị và mặc đi tiệc rất sang.
```

## r16-pants-color-alternative:1

Customer: Không thêm quần chỉ để freeship đâu em. Chị muốn thay chiếc quần đen bằng màu khác, mặc với áo trắng thì nên lấy màu nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"Quần QU714 459k chị nhé, có đen và navy. Cạp trước phẳng, phía sau là chun."}]
```

Actual terminal customer outcome:
```text
Chị lấy quần QU714 màu navy nhé, mặc cùng áo trắng SM613 sẽ rất sáng và nhã nhặn, đổi mới hơn chiếc quần đen sẵn có ở nhà. Tổng áo và quần navy là 958.000đ chị nha.
```
