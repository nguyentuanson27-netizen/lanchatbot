# A3 — human review of actual terminal customer outcomes

Score 0/1/2 on the ten frozen dimensions in a3-human-scores.json. No model/judge scores are synthesized.

Trusted truth and required/forbidden behavior per case are in a3-human-review.json. The packet excludes rejected drafts and verifier verdicts.

## r5-workday-comfort:1

Customer: Chị chưa chọn được. Ngực92, eo74, mông96cm, em chọn giúp chị mẫu với size nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần bộ đi làm tầm850k. Chị ngồi máy tính cả ngày, không thích đồ ôm eo."},{"role":"shop","text":"Em có set ST411749k, quần suông lưng chun, và váy VA512829k, eo cố định. Chị thích mặc bộ hay váy hơn?"}]
```

Actual terminal customer outcome:
```text
Chị chọn set sơ mi quần suông ST411 size M nhé ạ. Quần có lưng chun toàn vòng và thiết kế dáng rộng, giúp chị ngồi làm việc máy tính cả ngày thoải mái mà không bị ôm siết eo. Giá set là 749.000đ, chị thích lấy màu be hay navy ạ?
```

## r5-competitor-price:1

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Chị mặc đi làm thường xuyên thì set ST411 rất đáng đầu tư ạ. Chất vải pha 65% polyester và 35% viscose ít nhăn hơn linen, giúp trang phục giữ được độ phẳng phiu và chỉn chu suốt cả ngày dài ở văn phòng. Thêm vào đó, thiết kế áo dáng rộng kết hợp quần ống suông lưng chun toàn vòng mang lại cảm giác dễ chịu khi ngồi làm việc nhiều giờ, lại rất linh hoạt để chị mặc cả bộ hoặc tách rời phối thành nhiều kiểu đi làm khác nhau.
```

## r5-wardrobe-budget:1

Customer: Mua thêm cả set có phí quá không em? Chị ở nội thànhTP.HCM, chỉ muốn mua thứ cần thôi.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, mua cả set ST411 giá 749k sẽ vượt ngân sách dưới 600k của chị, với lại chị đã có sẵn quần navy rồi nên lấy cả set sẽ bị thừa quần ạ.

Chị chỉ cần lấy riêng áo sơ mi SM613 giá 499k (phí ship nội thành 25k, tổng 524k) là vừa vặn đúng ngân sách và đúng món cần để phối cùng quần có sẵn đi làm. Chị muốn chọn áo màu trắng hay xanh nhạt ạ?
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Chị chọn áo trắng size M được ạ! Vòng ngực 92cm của chị rất vừa vặn với size M (phù hợp ngực 88–94cm) và shop đang sẵn hàng. Chị họp trong phòng lại mặc kèm áo lót màu da thì hoàn toàn yên tâm, vì ở điều kiện ánh sáng phòng áo không bị lộ màu áo lót đâu ạ.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị chốt size L màu rêu nhé ạ, số đo của chị mặc size này vừa vặn. Đơn 829.000đ được miễn phí ship nội thành TP.HCM, tổng thanh toán là 829.000đ, vừa vặn trong ngân sách 900k của chị ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Quần navy vẫn còn đủ size S, M, L chị nhé. Phí giao nội thành TP.HCM là 25k, tổng cộng là 484k ạ. Để em chọn đúng size vừa vặn nhất, chị cho em xin số đo eo và mông nhé!
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, trắng size L hết rồi chị ạ. Em chọn cho chị màu xanh nhạt size L nhé, mặc lên cùng quần đen vừa gọn gàng lại lịch sự.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ shop không cam kết chắc chắn ngày giờ đến chị ạ, thời gian giao nội thành dự kiến là 2–3 ngày sau xác nhận đơn. Nếu cần gấp đúng sáng thứ Sáu thì mốc này khá sát nút, chị cân nhắc giúp shop nhé.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ sơ mi SM613 giá 499.000đ chị nhé. Với vòng ngực 92cm, chị lấy **size M** xanh nhạt giúp em ạ, mặc vừa vặn và thoải mái nha chị!
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, em chuyển sang size L màu đen cho chị nha, mẫu này size L đen bên em vẫn còn hàng ạ. Vì phần eo váy cố định không co giãn nên đổi sang size L sẽ vừa vặn và thoải mái hơn cho chị nhé!
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 navy size M nhà em còn sẵn hàng chị nhé, giá 459.000đ ạ. Chị cho em xin địa chỉ và số điện thoại nhận hàng để em lên đơn cho mình nhé.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Sơ mi SM613 giá 499.000đ, phí ship nội thành 25.000đ, tổng 524.000đ vừa vặn ngân sách 550k của chị. Mẫu này phối cùng quần navy sẵn có sẽ tạo set đi làm rất lịch sự và gọn gàng. Chị lấy màu trắng hay xanh nhạt và size nào ạ?
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng ạ, cuối tuần chị cứ thong thả cân nhắc nhé!
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà giữ nguyên tem, sạch sẽ, không mùi và chưa giặt thì đổi được trong 7 ngày từ khi nhận hàng nha chị. Còn nếu đã mặc đi tiệc ra ngoài thì shop không nhận đổi được ạ.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, phí vận chuyển đổi hàng là khách trả theo chính sách của shop ạ. Chị cứ yên tâm chọn size M nha, số đo 92-74-96 của chị nằm chuẩn trong khoảng cơ thể của size M (ngực 88–94, eo 70–76, mông 92–98cm) nên mặc vừa vặn và thoải mái ạ.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, nếu chị lấy thêm quần QU714 màu navy (vì mình đã có quần đen rồi ạ) thì tổng đơn sẽ là 958.000đ và được miễn phí ship luôn chị nhé. Quần navy mặc vừa lịch sự lại rất dễ phối với cả áo sơ mi trắng lẫn xanh nhạt. Chị có muốn thêm chiếc quần này để được freeship luôn không ạ?
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ, bên em không hỗ trợ hoàn tiền, nhưng mình được đổi size hoặc đổi mẫu trong 7 ngày nếu áo còn nguyên tem và chưa sử dụng chị nhé.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 giá 499.000đ ạ.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, mẫu quần suông QU714 màu navy size M bên em hiện vẫn còn hàng chị nhé!
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ chị cứ xem thêm nha, cần hỗ trợ gì chị cứ nhắn em ạ!
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thànhTP.HCM. Tổng có dưới600k không? Chọn size thì em cần chị đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."},{"role":"customer","text":"Vậy chị chọn mua riêng áo xanh nhạt thôi."},{"role":"shop","text":"Dạ SM613 xanh nhạt giá499k, có S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ tổng đơn áo xanh nhạt giao nội thành của mình là 524k (499k tiền áo cộng 25k phí ship), hoàn toàn dưới 600k chị nhé. Để em chọn size chuẩn, chị cho em xin số đo vòng ngực nhé ạ.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Dạ, với đèn ngược sáng thì áo trắng SM613 có thể thấy bóng áo lót chị nha. Size trắng M hiện vẫn còn hàng ạ.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Set này mặc đi làm rất lịch sự và nhã nhặn chị nhé. Shop hỗ trợ đổi size hoặc mẫu trong 7 ngày từ khi nhận nếu sản phẩm còn nguyên tem và chưa sử dụng (chỉ thử trong nhà, nếu đã mặc ra ngoài đi làm rồi shop không nhận đổi ạ). Phí vận chuyển đổi hàng thì khách trả chị nha.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng, không muốn mua thêm quần. Em chọn giúp chị màu áo nhé, chọn size thì cần số đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt. Set ST411 gồm áo quần giá 749k."}]
```

Actual terminal customer outcome:
```text
Em chọn màu xanh nhạt cho chị nhé, vừa dịu dàng lại rất nhã nhặn khi phối cùng quần navy đi làm. Để chọn size chuẩn, chị cho em xin **số đo vòng ngực** nhé ạ.
```

## r12-pants-known-waist:1

Customer: Cả ship hết bao nhiêu? Có eo rồi em chọn size được chưa hay cần đo thêm?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy giá 459k, hiện còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ tổng tiền gồm ship nội thành là 484k chị nhé (quần 459k, phí ship 25k). Với eo 74cm thì đang vừa khoảng eo size M (70–76cm), nhưng chị đo thêm vòng mông giúp em để shop tư vấn chuẩn size nhất ạ.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Áo xanh nhạt giá 499.000đ chị nhé. Size M xanh nhạt vẫn còn hàng và chuẩn phom với số đo ngực 92cm của chị ạ. Tone xanh nhạt này phối với quần navy ở nhà rất nhã nhặn và hài hòa.
```

## r12-indoor-exchange-eligible:1

Customer: Nếu ngày thứ 5 từ lúc nhận, chị chỉ thử trong nhà, giữ tem, chưa giặt, váy sạch không mùi, chưa mặc ra ngoài thì đổi mẫu được đúng không? Phí chị trả phải không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị, trong thời hạn 7 ngày từ lúc nhận, nếu váy giữ nguyên tem, chỉ thử trong nhà, sạch sẽ, không mùi và chưa mặc ra ngoài thì chị được đổi mẫu ạ. Phí vận chuyển đổi hàng do chị thanh toán nhé.
```

## r14-workday-choice:1

Customer: Chị đo được ngực 92, eo 74, mông 96cm. Chị khó quyết quá, em chọn một mẫu với size cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên muốn phần bụng dễ chịu."},{"role":"shop","text":"Shop có set ST411 749k, quần suông lưng chun, và váy VA512 829k, eo cố định chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị set ST411 size M nhé. Mẫu này có quần lưng chun toàn vòng giúp chị ngồi làm việc cả ngày rất thoải mái và vừa vặn ngân sách, lại đúng yêu cầu của chị. Chị lấy màu be hay navy ạ?
```

## r14-price-repeat-wear:1

Customer: Chị mua để mặc đi làm thường xuyên, còn muốn phối với đồ ở nhà. Ngực 92, eo 74, mông 96cm. Chênh 129k thì có đáng lấy bên em không, chọn size giúp chị luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng thấy bên khác bộ nhìn giống giá 620k."},{"role":"shop","text":"Set navy của shop 749k, có thể mặc cả bộ hoặc tách áo và quần để phối."}]
```

Actual terminal customer outcome:
```text
Chị chọn size M vừa vặn và thoải mái nhất nha, set màu navy hiện sẵn kho. Giá chênh lệch hoàn toàn tương xứng với chất vải ít nhăn, đứng phom lịch sự để mặc đi làm, kết hợp lưng chun toàn vòng giúp chị dễ dàng tách rời phối đồ mặc ở nhà rất thoải mái.
```

## r14-pants-size-input:1

Customer: Chị giao nội thành TP.HCM. Tính tiền cả ship giúp chị, để chọn size thì em cần chị đo những đâu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy hiện còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần 459k cộng 25k ship nội thành TP.HCM, tổng đơn của mình là 484.000đ ạ. Để em chọn chuẩn size cho mình, chị gửi giúp em số đo vòng eo và vòng mông nhé ạ.
```

## r14-stage-light-change:1

Customer: Lịch đổi rồi em, chị lên sân khấu có đèn phía sau. Chị muốn tránh thấy bóng áo lót, em khuyên còn nên lấy trắng không? Trắng M vẫn còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Em chọn SM613 trắng M cho chị. Shop thử ánh sáng phòng không thấy màu áo lót, ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r14-refund-before-buy:1

Customer: Chị vẫn chọn trắng M nhé. Nếu thử lên không ưng thì shop hoàn tiền hay chỉ đổi mẫu khác? Chị muốn hiểu phần này trước khi mua.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Em chọn trắng M cho chị, áo 499k và hiện còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, shop không áp dụng hoàn tiền nhưng hỗ trợ đổi size hoặc đổi mẫu khác trong 7 ngày từ khi nhận hàng, với điều kiện áo còn nguyên tem, chưa sử dụng và thử trong nhà sạch sẽ nha chị. Em ghi nhận chị chốt áo trắng size M (499k) ạ.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Nếu ở nhà chị đã có nhiều quần rồi thì mình lấy riêng áo SM613 thôi cho gọn tủ ạ, tổng gồm ship là 524k. Còn nếu chị muốn thêm quần đen QU714 (459k) để dễ phối đồ đi làm và được miễn phí ship thì tổng đơn là 958k, chị cứ cân nhắc xem mình có hay mặc kiểu quần suông cạp chun sau này không nha.
```

## r15-value-use:1

Customer: Chị muốn mặc đi làm rồi tách áo phối đồ cuối tuần nữa. Có điểm nào của hàng mình đáng để chị chi thêm không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, nhưng thấy một bộ nhìn gần giống giá 620k."},{"role":"shop","text":"Set bên em 749k, áo dáng rộng, quần suông lưng chun; mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r15-fit-reassurance:1

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set749k."}]
```

Actual terminal customer outcome:
```text
Chị yên tâm nhé, quần của set này dùng lưng chun toàn vòng nên khi ngồi làm việc nhiều sẽ rất thoải mái, không bị cấn hay cứng cạp đâu ạ. Mẫu này thiết kế lịch sự, nhã nhặn và rất hợp để chị mặc đi làm.

Be size M bên em có sẵn, set 749k, chị lấy thì em chốt đơn gửi đi luôn cho mình nhé!
```

## r15-known-waist-next:1

Customer: Có eo rồi, em cần thêm số nào để chọn size? Cả tiền giao giúp chị luôn.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn QU714 navy, eo74cm. Chị ở nội thành TP.HCM."},{"role":"shop","text":"Quần459k, navy còn S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ chị cho em xin thêm số đo mông nhé ạ. Tổng tiền quần 459k cộng phí ship nội thành 25k là 484k chị nha.
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]
```

Actual terminal customer outcome:
```text
Dạ giá vẫn 499k chị nhé, em chốt xanh nhạt size M ạ.
```

## r16-effort-and-use:1

Customer: Chị muốn mua một bộ dùng được cả đi làm và cuối tuần. Em thuyết phục chị chọn bộ này xem?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, ngân sách 850k."},{"role":"shop","text":"Set 749k, áo dáng rộng và quần suông lưng chun, mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Set navy 749k này rất hợp cho cả đi làm lẫn cuối tuần của chị đó ạ. Sắc navy vừa lịch sự, nhã nhặn cho văn phòng lại vừa năng động, thoải mái cho ngày nghỉ. Áo dáng rộng cùng quần suông lưng chun giúp chị ngồi làm việc hay di chuyển cả ngày đều dễ chịu, chất vải lại ít nhăn hơn linen nên giữ phom gọn gàng. Chị có thể mặc nguyên set hoặc tách rời phối đồ linh hoạt, vừa vặn trong ngân sách 850k của mình.
```

## r16-budget-alternative:1

Customer: Chị có 600k thôi. Nếu không thêm quần, em chọn giúp một cách phối khác với đồ chị có nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen, đang định mua sơ mi trắng SM613, giao nội thành TP.HCM."},{"role":"shop","text":"Áo cả giao 524k; QU714 459k, mua cùng tổng hàng 958k và được freeship."}]
```

Actual terminal customer outcome:
```text
Áo sơ mi trắng SM613 giá 499k, cộng phí ship nội thành 25k tổng là 524k, hoàn toàn vừa vặn trong ngân sách 600k của chị ạ.

Sơ mi trắng dáng thẳng kết hợp với những chiếc quần đen sẵn có của chị sẽ tạo nên set đồ tối giản, thanh lịch và rất dễ mặc đi làm hay đi chơi. Mẫu áo trắng này hiện shop còn sẵn size S và M, chị lấy áo này thì báo em size vừa với mình nhé ạ!
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi kế hoạch, dự tiệc trong nhà và muốn mặc váy cho gọn. Em chọn màu với size giúp chị, giá có trong 850k không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực92, eo74, mông96cm. Ban đầu định chọn set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 đều có size M theo số đo chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, váy VA512 có giá 829.000đ, nằm trong ngân sách 850k của chị ạ. Dự tiệc trong nhà, em chọn cho chị size M màu đen thanh lịch và gọn gàng, rất hợp với vóc dáng chị nhé.
```

## r16-pants-color-alternative:1

Customer: Chị không thêm để freeship đâu, nhưng muốn đổi quần đen ở nhà sang màu khác để phối áo trắng. Em chọn màu cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"QU714 có đen và navy, giá459k, quần suông cạp trước phẳng chun sau."}]
```

Actual terminal customer outcome:
```text
Em chọn màu navy cho quần suông QU714 nhé chị. Sắc navy nhã nhặn, khi phối cùng áo trắng sẽ tạo tổng thể thanh lịch và tươi sáng hơn hẳn màu đen quen thuộc. Quần có giá 459.000đ ạ.
```
