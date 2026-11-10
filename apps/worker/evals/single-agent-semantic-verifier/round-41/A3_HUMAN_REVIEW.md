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
Em chọn set sơ mi quần suông ST411 size M cho chị nhé. Quần có lưng chun toàn vòng ngồi làm việc thoải mái không bị ôm eo, giá 749k vừa vặn ngân sách của mình.
```

## r5-competitor-price:1

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Chất vải bên em đứng phom và ít nhăn hơn linen, chị mặc đi làm cả ngày vẫn giữ được độ chỉn chu ạ.
```

## r5-competitor-price:2

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ, chất vải set này ít nhăn, mặc đi làm cả ngày vẫn đứng dáng; mình còn dễ tách áo hoặc quần ra phối với các món khác nên dùng được linh hoạt hơn chị ạ.
```

## r5-competitor-price:3

Customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."},{"role":"shop","text":"Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Set này vải ít nhăn và giữ phom tốt suốt ngày dài ở văn phòng, chị còn dễ tách áo hoặc quần ra phối với đồ khác nên mặc được linh hoạt hơn đó ạ.
```

## r5-wardrobe-budget:1

Customer: Chị ở nội thành TP.HCM. Lấy áo thôi hay cả set em? Chị không muốn mua thừa quần.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn mua thêm đồ đi làm. Cả ship dưới 600k nhé em."},{"role":"shop","text":"Sơ mi SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 cả áo quần 749k."}]
```

Actual terminal customer outcome:
```text
Dạ, chị lấy áo SM613 thôi chị nhé. Chị đã có quần navy rồi thì mua áo phối cùng là hợp lý, tổng kèm ship là 524k vừa vặn ngân sách của mình; còn set ST411 giá 749k sẽ thừa quần và vượt mức ạ.
```

## r5-white-opacity:1

Customer: Ngực chị 92cm. Chị họp trong phòng và mặc áo lót màu da rồi, lấy trắng được em nhỉ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, mà sợ lộ áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng không thấy màu áo lót chị nhé. Ngược sáng vẫn có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ lấy trắng được chị nhé, đúng điều kiện ánh sáng phòng và áo lót màu da nên mình yên tâm không lộ ạ. Chị mặc size M vừa đẹp nha chị.
```

## r5-size-price-stock:1

Customer: Chị mặc size nào em? Giao nội thành TP.HCM cả ship bao nhiêu, dưới 900k nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy váy VA512 màu rêu đi tiệc. Ngực 96, eo 77, mông 104cm."},{"role":"shop","text":"Rêu còn S, M, L chị nhé, váy 829k."}]
```

Actual terminal customer outcome:
```text
Chị mặc size L nhé. Đơn của mình 829k ở nội thành TP.HCM được miễn phí ship nên tổng vẫn là 829k ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thành TP.HCM, quần này cả ship bao nhiêu? Navy còn không em, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Em có quần QU714 navy 459k chị nhé. Ống suông, lưng có chun phía sau, còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ, navy còn đủ S, M, L chị nhé. Tổng đơn kèm ship nội thành TP.HCM là 484.000đ ạ. Chị cho em xin số đo vòng eo và vòng mông để em chọn size vừa nhé.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Trắng size L nhà em hết mất rồi chị. Chị lấy sang màu xanh nhạt size L nhé, mặc với quần đen rất tôn da và lịch sự ạ.
```

## r5-delivery-timing:1

Customer: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."},{"role":"shop","text":"Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, nội thành dự kiến 2–3 ngày nên thường sẽ kịp đến vào sáng thứ Sáu, nhưng đây là khoảng dự kiến chứ bên em không cam kết chắc chắn giờ giao chị nha.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Áo 499k chị nhé, ngực 92cm mình lấy size M vừa đẹp ạ. Xanh nhạt bên em còn đủ hàng nha chị.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, đen L còn chị nhé, em chuyển sang size L cho mình ạ.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, em ghi nhận quần QU714 navy size M của chị nhé. Em cảm ơn chị ạ!
```

## r5-budget-correction:1

Customer: Chị tính lại còn 550k cả ship thôi em. Mua áo nào mặc với quần navy đi làm đẹp?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set 749k, định dành 800k. Chị có quần navy rồi, ở nội thành TP.HCM."},{"role":"shop","text":"Set ST411 có be và navy chị nhé. Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Chị chọn sơ mi SM613 nhé, giá 499k, tổng gồm ship nội thành là 524k vừa đúng ngân sách của chị. Mẫu này có màu trắng hoặc xanh nhạt, mặc với quần navy đi làm rất lịch sự.
```

## r5-defer:1

Customer: Chị chưa lấy đâu, cuối tuần tính nhé. Đừng giữ hàng cho chị, cũng không cần hỏi thêm đâu.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đen L đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ 829k chị nhé, đen L còn 2 chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, cuối tuần chị xem lại nhé ạ. Em cảm ơn chị.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà thoải mái nha chị, miễn là chưa giặt, sạch, không mùi và còn giữ nguyên tem trong 7 ngày đầu. Còn nếu mình mặc đi tiệc ra ngoài rồi thì shop không nhận đổi được ạ.
```

## r5-try-exchange:2

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ chị thử trong nhà thì thoải mái ạ, miễn là chưa giặt, sạch, không mùi và giữ nguyên tem trong 7 ngày chị nha. Còn nếu mình đã mặc ra ngoài đi tiệc rồi thì shop không nhận đổi được ạ.
```

## r5-try-exchange:3

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà thoải mái ạ, miễn là chưa giặt, sạch, không mùi và còn nguyên tem. Còn mặc đi tiệc hoặc mặc ra ngoài rồi thì shop không nhận đổi chị nhé.
```

## r5-exchange-cost:1

Customer: Lỡ không vừa thì phí đổi bên em chịu chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Chị lấy M nhé, be M đang còn. Set 749k."}]
```

Actual terminal customer outcome:
```text
Phí vận chuyển đổi khách trả chị nhé, nhưng size M này chuẩn theo số đo của mình rồi nên chị yên tâm ạ.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần cho được freeship không em? Chị có quần đen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613 499k, ở nội thành TP.HCM."},{"role":"shop","text":"Áo cả ship 524k chị nhé, mua từ 700k thì miễn ship. Em có quần QU714 459k nữa."}]
```

Actual terminal customer outcome:
```text
Chị không cần mua thêm chỉ để được freeship đâu ạ, vì mua thêm quần 459k để đỡ 25k tiền ship thì không tối ưu bằng việc mình chỉ lấy áo. Quần này bên em có cả màu navy, nếu chị thích đổi sang một màu khác với quần đen ở nhà thì hẵng lấy thêm nha.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực 92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Trắng M 499k chị nhé. Mặc với áo lót màu da trong phòng thì không thấy màu áo lót; ngược sáng vẫn có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ, shop không áp dụng hoàn tiền chị nhé. Mình được đổi size hoặc đổi mẫu khác trong 7 ngày nếu hàng còn nguyên tem và chưa sử dụng ạ.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 giá 499.000đ chị nhé.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ navy size M còn chị nhé.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ chị cứ xem thêm nhé, cần hỗ trợ gì chị cứ nhắn em ạ.
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r7-price-ready-fit:2

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Em vẫn chọn mẫu này nhé, chất vải đứng dáng và ít nhăn mặc đi làm rất chỉn chu, áo với quần lại tách ra phối đồ linh hoạt được. Chị mặc size M vừa đẹp chị nha.
```

## r7-price-ready-fit:3

Customer: Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa."}]
```

Actual terminal customer outcome:
```text
Set này gồm cả áo và quần vải ít nhăn, đứng dáng mặc đi làm rất lịch sự và dễ tách phối đồ chị ạ. Với số đo của chị, mình mặc **size M** vừa đẹp nhé.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thành TP.HCM. Cả ship có dưới 600k không em? Chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn mua thêm áo đi làm. Cả ship dưới 600k nhé."},{"role":"shop","text":"Áo SM613 499k, có trắng và xanh nhạt. Set ST411 749k chị nhé."},{"role":"customer","text":"Chị lấy riêng áo xanh nhạt thôi nhé."},{"role":"shop","text":"Dạ, xanh nhạt 499k, có S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ, tổng 524k cả ship chị nhé (499k áo và 25k ship nội thành), dưới 600k ạ. Chị đo vòng ngực gửi em để em chọn size vừa nhé.
```

## r7-opacity-context-change:1

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r7-opacity-context-change:2

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r7-opacity-context-change:3

Customer: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng đi họp, ngại thấy áo lót."},{"role":"shop","text":"SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."},{"role":"customer","text":"Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."},{"role":"shop","text":"Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, shop đổi trong 7 ngày khi hàng còn nguyên tem và chưa sử dụng, mình chỉ thử trong nhà thôi chị nhé; nếu mặc đi làm ra ngoài thì shop không nhận đổi ạ. Còn phí vận chuyển đổi hàng thì khách trả chị nha.
```

## r7-exchange-after-use:2

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, shop đổi trong 7 ngày nếu hàng chưa sử dụng và nguyên tem, còn mặc đi làm vài buổi rồi thì shop không nhận đổi ạ. Phí vận chuyển đổi hàng thì khách trả chị nhé.
```

## r7-exchange-after-use:3

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, đổi trong 7 ngày áp dụng cho hàng chưa sử dụng, nguyên tem và chỉ thử trong nhà thôi chị nhé; nếu mình mặc ra ngoài đi làm thì shop không nhận đổi ạ. Phí vận chuyển đổi thì khách trả chị nha.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng thôi. Em chọn màu áo giúp chị, quần chị không lấy thêm đâu. Chị mặc size nào em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Áo SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 gồm áo quần 749k."}]
```

Actual terminal customer outcome:
```text
Xanh nhạt chị nhé, mặc cùng quần navy nhìn nhã nhặn và dịu mắt. Chị đo vòng ngực gửi em để em chọn size chuẩn cho mình nha.
```

## r12-pants-known-waist:1

Customer: Eo chị 74, lấy M được không em? Cả ship hết bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy 459k, còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Tổng 484k chị nhé (459k tiền quần và 25k ship nội thành). Chị gửi em xin thêm số đo vòng mông để em kiểm tra chính xác xem size M có vừa với mình không nha.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, áo xanh nhạt giá 499.000đ chị nhé. Xanh nhạt size M vẫn còn hàng, mặc với quần navy hợp và gọn gàng lắm ạ.
```

## r12-indoor-exchange-eligible:1

Customer: Vậy chị đổi qua mẫu khác được đúng không em? Phí gửi đổi chị trả hả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày, hàng chưa dùng và còn tem chị nhé."},{"role":"customer","text":"Ví dụ chị nhận được 5 ngày, chỉ thử ở nhà, chưa giặt, cũng chưa mặc ra ngoài thì sao?"},{"role":"shop","text":"Chị giữ nguyên tem, váy sạch và không mùi nữa nhé."},{"role":"customer","text":"Ừ, tem chị để nguyên, váy vẫn sạch không mùi."},{"role":"shop","text":"Phí vận chuyển đổi chị trả nhé."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị, mình đổi sang mẫu khác được và phí vận chuyển đổi là mình trả nhé.
```

## r14-workday-choice:1

Customer: Ngực 92, eo 74, mông 96cm em nhé. Set hay váy hợp hơn? Em xem size giúp chị luôn.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên sợ cấn bụng."},{"role":"shop","text":"Set ST411 749k có quần suông lưng chun chị nhé. Váy VA512 829k thì eo cố định."}]
```

Actual terminal customer outcome:
```text
Set ST411 hợp hơn chị nhé, quần có lưng chun toàn vòng ngồi nhiều thoải mái, không lo cấn bụng như váy eo cố định. Chị mặc size M vừa ạ.
```

## r14-price-repeat-wear:1

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ ở nhà nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Chị lấy size M nhé. Set gồm cả áo và quần suông, chất vải ít nhăn giúp giữ phom chỉn chu khi đi làm và tiện tách rời phối đồ ở nhà.
```

## r14-price-repeat-wear:2

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ ở nhà nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r14-price-repeat-wear:3

Customer: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ ở nhà nữa."},{"role":"shop","text":"Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được."},{"role":"customer","text":"Ngực chị 92, eo 74, mông 96cm."}]
```

Actual terminal customer outcome:
```text
Chị mặc size M nhé. Set gồm cả áo và quần, chất vải ít nhăn mặc đi làm đứng phom, lại dễ tách áo phối linh hoạt nên rất đáng đầu tư chị ạ.
```

## r14-pants-size-input:1

Customer: Chị lấy quần navy, giao nội thành TP.HCM nhé. Cả ship bao nhiêu, chị mặc size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, tổng đơn là 484.000đ (459k quần và 25k ship nội thành TP.HCM) chị nhé. Chị gửi em xin số đo vòng eo và vòng mông để em chọn size vừa cho mình ạ.
```

## r14-stage-light-change:1

Customer: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
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
Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày từ lúc nhận hàng nếu áo còn nguyên tem, chưa sử dụng và thử trong nhà sạch sẽ chị nhé (phí ship đổi khách trả ạ).
```

## r14-refund-before-buy:2

Customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Chị lấy trắng M nhé, áo 499k và còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, shop không áp dụng hoàn tiền chị nhé, mình được đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng, miễn là áo còn nguyên tem và chưa sử dụng ạ.
```

## r14-refund-before-buy:3

Customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Chị lấy trắng M nhé, áo 499k và còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, shop không áp dụng hoàn tiền chị nhé. Mình được đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng, với điều kiện áo chưa sử dụng và nguyên tem ạ.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị lấy áo thôi ạ, ở nhà mình đã có nhiều quần rồi thì không cần mua thêm chỉ để lấy freeship đâu chị.
```

## r15-value-use:1

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối đồ ở nhà."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
ST411 749k chất vải ít nhăn, mặc đi làm đứng dáng và lịch sự. Cuối tuần chị tách áo ra phối đồ đi chơi hay ở nhà đều tiện.
```

## r15-value-use:2

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối đồ ở nhà."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Dạ, chất vải của set này ít nhăn hơn linen nên chị mặc đi làm cả ngày vẫn giữ phom đứng dáng, chỉn chu. Cuối tuần chị lại dễ dàng tách áo ra phối đồ đi chơi hay ở nhà, tính ra rất tiện và mặc được nhiều dịp ạ.
```

## r15-value-use:3

Customer: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối đồ ở nhà."},{"role":"shop","text":"Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r15-fit-reassurance:1

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set749k."}]
```

Actual terminal customer outcome:
```text
Phần này em chưa trả lời được, chị nhé.
```

## r15-known-waist-next:1

Customer: Eo chị 74cm, mặc M được không em? Quần cả ship bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn QU714 navy, eo 74cm. Chị ở nội thành TP.HCM."},{"role":"shop","text":"Quần 459k, navy còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Tổng đơn của mình là 484k (459k tiền quần và 25k ship nội thành) chị nhé. Chị cho em xin thêm số đo vòng mông để em kiểm tra xem size M mặc vừa vặn không nha.
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]
```

Actual terminal customer outcome:
```text
Xanh nhạt size M vẫn 499k chị nhé, mặc với quần navy lịch sự và hợp lắm ạ.
```

## r16-effort-and-use:1

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Đi làm mặc cả set rất lịch sự, còn cuối tuần mình tách áo hoặc quần ra phối đi chơi thoải mái, năng động lắm ạ.
```

## r16-effort-and-use:2

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Dạ hợp chị nhé. Áo sơ mi dáng rộng cùng quần suông mặc đi làm rất chỉn chu, cuối tuần mình tách rời ra phối đồ đi chơi thoải mái ạ.
```

## r16-effort-and-use:3

Customer: Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa."},{"role":"shop","text":"Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được."}]
```

Actual terminal customer outcome:
```text
Hợp chị nhé. Áo sơ mi dáng rộng và quần ống suông vừa đủ lịch sự để đi làm, form phóng khoáng mặc đi chơi, cà phê cuối tuần rất thoải mái. Chị có thể mặc cả set hoặc tách rời ra phối đồ đều tiện.
```

## r16-budget-alternative:1

Customer: Chị chỉ có 600k thôi em. Áo trắng với quần đen thì quen quá, em chọn mẫu hoặc màu khác giúp chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen rồi, đang xem sơ mi trắng SM613. Giao nội thành TP.HCM em nhé."},{"role":"shop","text":"Áo cả ship 524k chị nhé. Quần QU714 459k, mua thêm thì cả hai 958k, miễn ship."}]
```

Actual terminal customer outcome:
```text
Chị chuyển sang sơ mi xanh nhạt nhé, mặc lên sáng da mà đỡ nhàm hơn áo trắng. Áo 499k, cộng ship nội thành là 524k ạ.
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi ý mặc váy đi tiệc trong nhà em nhé. Em chọn màu với size giúp chị luôn, dưới 850k là được.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực 92, eo 74, mông 96cm. Ban đầu định lấy set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 chị đều mặc M nhé."}]
```

Actual terminal customer outcome:
```text
Chị lấy váy VA512 màu đen, size M nhé chị; giá 829.000đ ạ. Màu đen mặc đi tiệc trong nhà vừa sang trọng lại nhã nhặn.
```

## r16-pants-color-alternative:1

Customer: Không thêm quần chỉ để freeship đâu em. Chị muốn thay chiếc quần đen bằng màu khác, mặc với áo trắng thì nên lấy màu nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"Quần QU714 459k chị nhé, có đen và navy. Cạp trước phẳng, phía sau là chun."}]
```

Actual terminal customer outcome:
```text
Dạ, chị lấy quần QU714 màu navy nhé, vì ở nhà mình đã có sẵn quần đen rồi. Phối navy với áo trắng nhìn sáng và nhã nhặn hơn ạ.
```
