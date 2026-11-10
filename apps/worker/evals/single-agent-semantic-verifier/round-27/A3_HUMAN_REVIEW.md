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
Em chọn set ST411 màu be size M cho chị nhé. Quần ống suông lưng chun toàn vòng sẽ giúp chị ngồi làm việc cả ngày thoải mái, không bị ôm eo, giá 749k ạ.
```

## r5-competitor-price:1

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Dạ, với set ST411, chất liệu pha polyester và viscose giúp vải ít nhăn hơn và giữ phom đứng dáng suốt cả ngày làm việc ở văn phòng. Thiết kế quần ống suông cùng lưng chun toàn vòng tạo sự thoải mái, rất thích hợp để chị mặc đi làm thường xuyên mà vẫn đảm bảo độ chỉn chu.
```

## r5-wardrobe-budget:1

Customer: Mua thêm cả set có phí quá không em? Chị ở nội thànhTP.HCM, chỉ muốn mua thứ cần thôi.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, mình đã có quần rồi thì lấy riêng áo sơ mi SM613 là hợp lý nhất ạ. Tổng đơn là 524k (áo 499k cộng 25k ship nội thành), vẫn vừa đúng ngân sách dưới 600k của chị.

Chị chọn áo màu trắng hay xanh nhạt ạ?
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ chị chọn size M màu trắng được ạ. Chị họp trong phòng và mặc áo lót màu da thì yên tâm, vì đúng với điều kiện thử ánh sáng phòng của shop là không thấy màu áo lót.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, em chọn size L vừa vặn cho số đo của chị nhé. Váy rêu giá 829k được miễn phí ship nội thành, tổng cộng là 829k, vừa đúng ngân sách 900k của chị ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần navy hiện vẫn còn đủ size S, M, L chị nhé. Tổng đơn của chị gồm 459k tiền quần và 25k ship nội thành TP.HCM là 484k ạ.

Để em chọn đúng size vừa vặn cho chị, chị cho em xin số đo vòng eo và mông nhé.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, màu trắng size L hiện hết rồi chị ạ. Em chọn sang màu xanh nhạt size L cho chị nhé, mặc cùng quần đen vừa gọn gàng lại rất sáng màu ạ.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, nội thành dự kiến 2–3 ngày nên shop không cam kết chắc chắn giao kịp trước sáng thứ Sáu chị nhé.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 xanh nhạt giá 499.000đ, chị lấy size M vừa vặn ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, số đo mới của chị sang size L là chuẩn ạ. Đen L đang còn hàng, em chuyển sang size L cho chị nhé.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần navy size M còn sẵn chị nhé.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ chị cứ cân nhắc, cuối tuần mình xem lại nhé ạ.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ phí vận chuyển đổi hàng khách trả chị nhé. Số đo của chị mặc size M chuẩn và vừa vặn rồi ạ, chị yên tâm nhé.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, mình lấy quần QU714 màu **navy** nha chị, vừa không bị trùng với quần đen sẵn có lại rất dễ phối với áo sơ mi. Thêm quần thì tổng đơn là 958.000đ và được **miễn phí ship** luôn ạ.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ, trắng M chị nhé. Bên em không áp dụng hoàn tiền, nhưng chị được hỗ trợ đổi size hoặc mẫu khác trong 7 ngày nếu sản phẩm còn nguyên tem và chưa sử dụng ạ.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 có giá 499.000đ chị nhé. Áo chất cotton dệt đứng phom, dáng thẳng lịch sự nên chị mặc đi làm hay đi chơi đều hợp ạ.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần navy size M còn hàng chị nhé. Chị cho em xin số đo vòng eo và mông để em kiểm tra xem size M có vừa vặn với mình không nha ạ.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ vâng, chị cứ xem thêm nhé. Cần hỗ trợ thêm chị cứ nhắn em ạ.
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Chị chọn size M nhé, các số đo của chị rất vừa vặn với khoảng cơ thể của size này ạ.

Set ST411 bên em dùng chất vải pha polyester và viscose, đứng dáng và ít nhăn hơn linen, giúp chị mặc đi làm cả ngày vẫn giữ được sự chỉn chu, lịch sự mà không lo mất phom. Thiết kế áo dáng rộng kết hợp quần suông lưng chun cũng mang lại sự thoải mái tối đa khi chị di chuyển và ngồi làm việc thường xuyên ạ.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thànhTP.HCM. Tổng có dưới600k không? Chọn size thì em cần chị đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."},{"role":"customer","text":"Vậy chị chọn mua riêng áo xanh nhạt thôi."},{"role":"shop","text":"Dạ SM613 xanh nhạt giá499k, có S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ tổng đơn của chị là 524.000đ (đã gồm 25.000đ phí ship nội thành), dưới 600.000đ đúng ý chị nhé. Để em chọn size chuẩn, chị cho em xin số đo vòng ngực nhé ạ.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Dạ, với sự kiện có đèn chiếu ngược thì áo trắng có thể thấy bóng áo lót chị nha. TrắngM hiện vẫn còn chị nhé.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ set này đổi trong 7 ngày với điều kiện thử trong nhà, nguyên tem và chưa giặt ạ; nếu chị mặc đi làm ra ngoài rồi thì shop không nhận đổi được chị nhé. Phí vận chuyển đổi hàng thì khách trả ạ.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng, không muốn mua thêm quần. Em chọn giúp chị màu áo nhé, chọn size thì cần số đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt. Set ST411 gồm áo quần giá 749k."}]
```

Actual terminal customer outcome:
```text
Em chọn màu xanh nhạt cho chị nhé; sắc xanh dịu nhẹ đi cùng quần navy sẽ rất sáng và nhã nhặn cho đồ đi làm. Để chọn size, chị cho em xin số đo vòng ngực ạ.
```

## r12-pants-known-waist:1

Customer: Cả ship hết bao nhiêu? Có eo rồi em chọn size được chưa hay cần đo thêm?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy giá 459k, hiện còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ, tổng đơn là 484k (đã gồm 25k ship nội thành) chị nhé. Chị cho em xin thêm số đo mông để em chọn size chính xác cho mình ạ.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ vẫn size M chị nhé, áo xanh nhạt size M hiện còn hàng. Áo có giá 499.000đ ạ. Sắc xanh này phối với quần navy ở nhà sẽ rất nhẹ nhàng và hợp ý.
```

## r12-indoor-exchange-eligible:1

Customer: Nếu ngày thứ 5 từ lúc nhận, chị chỉ thử trong nhà, giữ tem, chưa giặt, váy sạch không mùi, chưa mặc ra ngoài thì đổi mẫu được đúng không? Phí chị trả phải không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị, ngày thứ 5 vẫn trong thời hạn đổi và đạt các điều kiện trên ạ. Phí vận chuyển đổi hàng thì khách trả chị nhé.
```

## r14-workday-choice:1

Customer: Chị đo được ngực 92, eo 74, mông 96cm. Chị khó quyết quá, em chọn một mẫu với size cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên muốn phần bụng dễ chịu."},{"role":"shop","text":"Shop có set ST411 749k, quần suông lưng chun, và váy VA512 829k, eo cố định chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn set ST411 màu be size M cho chị nhé. Quần ống suông lưng chun sẽ giúp chị thoải mái khi ngồi làm việc nhiều, giá 749k và số đo của chị mặc size này vừa vặn ạ.
```

## r14-price-repeat-wear:1

Customer: Chị mua để mặc đi làm thường xuyên, còn muốn phối với đồ ở nhà. Ngực 92, eo 74, mông 96cm. Chênh 129k thì có đáng lấy bên em không, chọn size giúp chị luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng thấy bên khác bộ nhìn giống giá 620k."},{"role":"shop","text":"Set navy của shop 749k, có thể mặc cả bộ hoặc tách áo và quần để phối."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo của chị, em chọn size M cho set navy nhé.

Mức chênh lệch này rất đáng đầu tư vì set gồm cả áo và quần ống suông chất liệu ít nhăn, đứng dáng lịch sự để mặc đi làm thường xuyên, lại dễ tách rời áo hoặc quần để phối thoải mái với đồ ở nhà ạ.
```

## r14-pants-size-input:1

Customer: Chị giao nội thành TP.HCM. Tính tiền cả ship giúp chị, để chọn size thì em cần chị đo những đâu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy hiện còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, tổng tiền gồm quần và ship nội thành là 484.000đ chị nhé (quần 459k, phí ship 25k). Để chọn size chuẩn, em cần chị đo giúp em vòng eo và vòng mông ạ.
```

## r14-stage-light-change:1

Customer: Lịch đổi rồi em, chị lên sân khấu có đèn phía sau. Chị muốn tránh thấy bóng áo lót, em khuyên còn nên lấy trắng không? Trắng M vẫn còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Em chọn SM613 trắng M cho chị. Shop thử ánh sáng phòng không thấy màu áo lót, ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ, trắng M vẫn còn chị nhé. Tuy nhiên, lên sân khấu có đèn phía sau (đèn ngược sáng) thì màu trắng có thể thấy bóng áo lót theo thử nghiệm của shop, nên nếu chị muốn tránh hoàn toàn điểm này thì có thể cân nhắc kỹ ạ.
```

## r14-refund-before-buy:1

Customer: Chị vẫn chọn trắng M nhé. Nếu thử lên không ưng thì shop hoàn tiền hay chỉ đổi mẫu khác? Chị muốn hiểu phần này trước khi mua.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Em chọn trắng M cho chị, áo 499k và hiện còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, áo trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng mình được hỗ trợ đổi size hoặc đổi mẫu khác trong 7 ngày từ khi nhận hàng, với điều kiện sản phẩm chưa sử dụng và còn nguyên tem ạ.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ nếu ở nhà chị đã có nhiều quần rồi thì mình cứ lấy một mình áo thôi ạ. Thêm quần chỉ để được miễn ship thì tổng đơn là 958k, tính ra mình vẫn tốn thêm tiền cho món đồ chưa thật sự cần dùng đến.
```

## r15-value-use:1

Customer: Chị muốn mặc đi làm rồi tách áo phối đồ cuối tuần nữa. Có điểm nào của hàng mình đáng để chị chi thêm không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, nhưng thấy một bộ nhìn gần giống giá 620k."},{"role":"shop","text":"Set bên em 749k, áo dáng rộng, quần suông lưng chun; mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, set ST411 dùng chất vải ít nhăn hơn linen, giữ phom chỉn chu suốt ngày làm việc văn phòng. Áo dáng rộng cùng quần suông lưng chun vừa thoải mái, lại giúp chị dễ tách áo phối đồ linh hoạt cho cuối tuần ạ.
```

## r15-fit-reassurance:1

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set749k."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r15-known-waist-next:1

Customer: Có eo rồi, em cần thêm số nào để chọn size? Cả tiền giao giúp chị luôn.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn QU714 navy, eo74cm. Chị ở nội thành TP.HCM."},{"role":"shop","text":"Quần459k, navy còn S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ chị cho em xin thêm số đo mông để em chốt size chuẩn cho mình nhé (với eo 74cm của chị đang hợp khoảng eo size M ạ). Tổng tiền hàng và phí giao nội thành của mình là 484k chị nhé.
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]
```

Actual terminal customer outcome:
```text
Dạ giá vẫn 499k chị nhé. Áo xanh nhạt mặc cùng quần navy rất hợp tone và gọn gàng ạ.
```

## r16-effort-and-use:1

Customer: Chị muốn mua một bộ dùng được cả đi làm và cuối tuần. Em thuyết phục chị chọn bộ này xem?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, ngân sách 850k."},{"role":"shop","text":"Set 749k, áo dáng rộng và quần suông lưng chun, mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Bộ này rất hợp để chị mặc linh hoạt cả đi làm lẫn cuối tuần ạ. Áo sơ mi dáng rộng kết hợp quần suông tạo tổng thể lịch sự, gọn gàng cho môi trường công sở. Sang cuối tuần, thiết kế quần lưng chun toàn vòng thoải mái cùng chất vải ít nhăn giúp chị dễ dàng di chuyển, lại có thể linh hoạt tách rời áo hoặc quần để phối đồ đi chơi.

Set navy này có giá 749.000đ, nằm trọn trong ngân sách của chị. Chị gửi em số đo ngực, eo, mông để em chọn chính xác size vừa vặn nhé ạ.
```

## r16-budget-alternative:1

Customer: Chị có 600k thôi. Nếu không thêm quần, em chọn giúp một cách phối khác với đồ chị có nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen, đang định mua sơ mi trắng SM613, giao nội thành TP.HCM."},{"role":"shop","text":"Áo cả giao 524k; QU714 459k, mua cùng tổng hàng 958k và được freeship."}]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi trắng SM613 cộng ship nội thành là 524.000đ, hoàn toàn vừa vặn trong ngân sách 600k của chị. Áo thiết kế dáng thẳng phối cùng những chiếc quần đen sẵn có của chị sẽ rất thanh lịch, gọn gàng và dễ mặc.

Chị cho em xin số đo vòng ngực để em chọn size chuẩn vừa cho mình nhé ạ.
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi kế hoạch, dự tiệc trong nhà và muốn mặc váy cho gọn. Em chọn màu với size giúp chị, giá có trong 850k không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực92, eo74, mông96cm. Ban đầu định chọn set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 đều có size M theo số đo chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, em chọn cho chị váy VA512 màu đen, size M nhé. Màu đen sang trọng và gọn gàng, rất hợp đi tiệc trong nhà. Giá váy là 829.000đ, nằm trong ngân sách 850k của chị ạ.
```

## r16-pants-color-alternative:1

Customer: Chị không thêm để freeship đâu, nhưng muốn đổi quần đen ở nhà sang màu khác để phối áo trắng. Em chọn màu cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"QU714 có đen và navy, giá459k, quần suông cạp trước phẳng chun sau."}]
```

Actual terminal customer outcome:
```text
Dạ, vậy em chọn màu navy cho quần QU714 nhé chị. Sắc navy phối cùng áo trắng SM613 sẽ rất nhã nhặn, lịch sự và làm mới tổng thể so với chiếc quần đen chị đang có ở nhà.
```
