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
Em chọn cho chị set ST411 màu be size M nhé. Quần lưng chun toàn vòng sẽ thoải mái khi chị ngồi máy tính cả ngày và vừa vặn với số đo của chị.
```

## r5-competitor-price:1

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r5-wardrobe-budget:1

Customer: Mua thêm cả set có phí quá không em? Chị ở nội thànhTP.HCM, chỉ muốn mua thứ cần thôi.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị, set ST411 giá 749k sẽ vượt ngân sách dưới 600k của chị, với lại chị đã có sẵn quần navy rồi nên mua lẻ áo sẽ vừa đúng nhu cầu lại tiết kiệm hơn ạ.

Chị chọn sơ mi SM613 giá 499k nhé; tính cả 25k phí ship nội thành thì tổng đơn là 524k, vừa khít ngân sách của chị. Áo có màu trắng và xanh nhạt, chị thích màu nào hơn ạ?
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ được chị nhé, ngực 92cm mình chọn trắng size M là vừa vặn ạ. Ánh sáng trong phòng họp kết hợp áo lót màu da thì mình hoàn toàn yên tâm mặc mẫu này nha.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, em chọn size L cho váy rêu nhé ạ. Đơn của chị ở nội thành TP.HCM được miễn phí ship, tổng tiền là 829k, vừa vặn trong ngân sách 900k của chị ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần navy hiện đủ size S, M, L chị nhé. Tổng tiền gồm ship nội thành là 484.000đ ạ. Chị cho em xin số đo eo và mông để em chọn size chuẩn nhất cho mình nhé.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, màu trắng size L hiện hết rồi chị ạ. Em đổi sang màu xanh nhạt size L cho chị nhé, phối với quần đen rất nhã nhặn và lịch sự. Áo giá 499.000đ chị nha.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, thời gian giao nội thành là 2–3 ngày sau khi xác nhận đơn và đây chỉ là khoảng dự kiến chứ bên em không cam kết ngày giờ đến chính xác, nên không thể chắc chắn sẽ nhận được trước sáng thứ Sáu ạ.

Nếu chị cần tuyệt đối chắc chắn có đồ mặc vào sáng hôm đó, mình có thể cân nhắc dùng tạm đồ sẵn có ở nhà để tránh bị động chị nhé.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 xanh nhạt giá 499.000đ chị nhé. Với vòng ngực 92cm, chị lấy size M vừa đẹp ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, em đổi sang size L màu đen cho chị nhé. Đen size L vẫn đang còn sẵn hàng ạ.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần navy size M còn hàng chị nhé.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Với ngân sách 550k và sẵn quần navy, em chọn áo sơ mi SM613 (499k) màu trắng hoặc xanh nhạt mặc đi làm sẽ rất hợp và gọn gàng ạ.

Tổng tiền tính cả ship nội thành là 524.000đ, vừa vặn trong ngân sách của chị. Chị thích màu trắng hay xanh nhạt và khoảng bao nhiêu kg để em chọn size vừa vặn nhé?
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng, cuối tuần chị cứ cân nhắc nhé ạ.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà thoải mái ạ, miễn là hàng chưa giặt, sạch, không mùi và còn nguyên tem là mình vẫn đổi được trong 7 ngày chị nhé. Còn nếu mình đã mặc đi tiệc ra ngoài rồi thì shop không nhận đổi ạ.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, phí vận chuyển đổi hàng thì khách trả chị nhé. Nhưng chị yên tâm, số đo của chị mặc size M là vừa chuẩn đẹp rồi, mình không lo phải đổi đâu ạ.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ chị lấy thêm quần màu navy nhé, vì mình có quần đen rồi ạ. Quần suông navy vừa dễ phối đồ vừa đổi mới. Thêm quần thì tổng đơn là 958k và được miễn phí ship luôn chị nha (thay vì mua áo lẻ 524k tính cả 25k tiền ship).
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 giá 499.000đ chị nhé. Mẫu này có hai màu trắng và xanh nhạt, chất cotton dày dặn đứng dáng đẹp lắm ạ. Chị thích màu nào để em tư vấn size phù hợp cho mình nhé?
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ navy size M còn hàng chị nhé.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ chị, có gì cần thêm chị cứ nhắn em nhé.
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
Dạ tổng đơn của chị là 524.000đ (gồm 499.000đ tiền áo và 25.000đ phí ship nội thành), dưới 600.000đ như chị mong muốn ạ. Để chọn size chuẩn cho chị, em chỉ cần xin số đo vòng ngực nhé.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Dạ, trắng M hiện vẫn còn hàng chị nhé. Riêng về điều kiện đèn chiếu ngược thì đúng như shop có lưu ý, dưới ánh sáng ngược mình vẫn có thể thấy bóng áo lót, nên nếu sự kiện có đèn chiếu ngược nhiều thì chị cân nhắc thêm điểm này giúp em nhé.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, mình đổi trong 7 ngày từ lúc nhận chị nhé, với điều kiện sản phẩm còn nguyên tem và chưa qua sử dụng (chỉ thử trong nhà thôi ạ, nếu đã mặc đi làm ra ngoài thì shop không nhận đổi được). Còn phí vận chuyển đổi hàng thì khách trả giúp shop nha chị.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng, không muốn mua thêm quần. Em chọn giúp chị màu áo nhé, chọn size thì cần số đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt. Set ST411 gồm áo quần giá 749k."}]
```

Actual terminal customer outcome:
```text
Em chọn áo màu trắng cho chị nhé, sắc trắng sáng sủa sẽ rất hợp và làm nổi bật chiếc quần navy đi làm. Để chọn size chuẩn, chị cho em xin số đo vòng ngực nhé ạ.
```

## r12-pants-known-waist:1

Customer: Cả ship hết bao nhiêu? Có eo rồi em chọn size được chưa hay cần đo thêm?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy giá 459k, hiện còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ, tổng đơn gồm ship nội thành là 484k chị nhé. Chị cho em xin thêm số đo vòng mông để em chọn size chuẩn cho mình ạ.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, vẫn size M và màu xanh nhạt M bên em còn hàng chị nhé. Áo có giá 499.000đ ạ. Màu xanh nhạt này phối với quần navy ở nhà vừa nhẹ nhàng lại rất hợp tông đấy chị.
```

## r12-indoor-exchange-eligible:1

Customer: Nếu ngày thứ 5 từ lúc nhận, chị chỉ thử trong nhà, giữ tem, chưa giặt, váy sạch không mùi, chưa mặc ra ngoài thì đổi mẫu được đúng không? Phí chị trả phải không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị nhé, trong điều kiện đó mình đổi mẫu được và phí vận chuyển đổi là chị trả ạ.
```

## r14-workday-choice:1

Customer: Chị đo được ngực 92, eo 74, mông 96cm. Chị khó quyết quá, em chọn một mẫu với size cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên muốn phần bụng dễ chịu."},{"role":"shop","text":"Shop có set ST411 749k, quần suông lưng chun, và váy VA512 829k, eo cố định chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn set sơ mi quần suông ST411 size M cho chị nhé.

Set này giá 749k, điểm cộng lớn là quần ống suông có lưng chun toàn vòng giúp ngồi làm việc cả ngày thoải mái, không lo tức bụng. Với số đo ngực 92, eo 74, mông 96 của chị thì size M mặc vừa vặn và chuẩn dáng ạ.
```

## r14-price-repeat-wear:1

Customer: Chị mua để mặc đi làm thường xuyên, còn muốn phối với đồ ở nhà. Ngực 92, eo 74, mông 96cm. Chênh 129k thì có đáng lấy bên em không, chọn size giúp chị luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng thấy bên khác bộ nhìn giống giá 620k."},{"role":"shop","text":"Set navy của shop 749k, có thể mặc cả bộ hoặc tách áo và quần để phối."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r14-pants-size-input:1

Customer: Chị giao nội thành TP.HCM. Tính tiền cả ship giúp chị, để chọn size thì em cần chị đo những đâu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy hiện còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, tổng tiền gồm cả ship nội thành là 484.000đ chị nhé. Để em chọn đúng size, chị gửi giúp em số đo vòng eo và vòng mông nhé ạ.
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
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, nếu ở nhà mình đã có nhiều quần rồi thì chị lấy riêng áo thôi ạ. Tổng áo cộng phí ship nội thành là 524k. Mua thêm quần 459k chỉ để được miễn ship 25k thì tính ra mình phải chi thêm nhiều tiền hơn, nên mình cứ lấy áo trước cho gọn gàng chị nhé.
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
Dạ, chị yên tâm nhé, mẫu này quần dùng lưng chun toàn vòng nên không hề bị cạp cứng đâu ạ. Với số đo của chị, mặc size M rất thoải mái, chun co giãn linh hoạt khi ngồi nhiều, dáng suông lịch sự và nhã nhặn đúng ý đi làm của chị luôn nhé.
```

## r15-known-waist-next:1

Customer: Có eo rồi, em cần thêm số nào để chọn size? Cả tiền giao giúp chị luôn.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn QU714 navy, eo74cm. Chị ở nội thành TP.HCM."},{"role":"shop","text":"Quần459k, navy còn S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, em cần thêm số đo vòng mông của chị để chốt size navy nhé ạ. Tổng tiền là 484k (quần 459k, ship nội thành 25k chị nha).
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]
```

Actual terminal customer outcome:
```text
Dạ giá vẫn vậy chị nhé, 499k xanh nhạt size M ạ.
```

## r16-effort-and-use:1

Customer: Chị muốn mua một bộ dùng được cả đi làm và cuối tuần. Em thuyết phục chị chọn bộ này xem?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, ngân sách 850k."},{"role":"shop","text":"Set 749k, áo dáng rộng và quần suông lưng chun, mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r16-budget-alternative:1

Customer: Chị có 600k thôi. Nếu không thêm quần, em chọn giúp một cách phối khác với đồ chị có nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen, đang định mua sơ mi trắng SM613, giao nội thành TP.HCM."},{"role":"shop","text":"Áo cả giao 524k; QU714 459k, mua cùng tổng hàng 958k và được freeship."}]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi trắng SM613 phối cùng những chiếc quần đen sẵn có của chị là chuẩn và thanh lịch nhất rồi ạ. Tổng tiền áo và ship nội thành là 524.000đ, vừa vặn trong ngân sách 600k của mình luôn ạ.

Để em chọn đúng size vừa vặn cho chị, chị cho em xin số đo vòng ngực nhé ạ?
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi kế hoạch, dự tiệc trong nhà và muốn mặc váy cho gọn. Em chọn màu với size giúp chị, giá có trong 850k không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực92, eo74, mông96cm. Ban đầu định chọn set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 đều có size M theo số đo chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, em chọn váy VA512 màu đen, size M cho chị nhé. Giá váy là 829.000đ, hoàn toàn trong ngân sách 850k của chị ạ. Thiết kế chữ A cổ vuông sẽ giúp diện mạo rất gọn gàng và lịch sự khi đi tiệc trong nhà.
```

## r16-pants-color-alternative:1

Customer: Chị không thêm để freeship đâu, nhưng muốn đổi quần đen ở nhà sang màu khác để phối áo trắng. Em chọn màu cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"QU714 có đen và navy, giá459k, quần suông cạp trước phẳng chun sau."}]
```

Actual terminal customer outcome:
```text
Dạ, em chọn quần QU714 màu navy cho chị nhé. Sắc navy trầm nhẹ phối cùng áo trắng sẽ rất thanh lịch và nhã nhặn ạ.
```
