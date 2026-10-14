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
Chị chọn set sơ mi quần suông ST411 size M nhé ạ, giá 749k. 

Set này có quần lưng chun toàn vòng và ống suông rộng, mặc ngồi làm việc cả ngày thoải mái và không bị ôm eo gò bó đúng ý chị. Với số đo ngực 92, eo 74, mông 96 thì size M vừa vặn với chị ạ.
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
Dạ đúng rồi chị, set ST411 giá 749k vượt ngân sách dưới 600k của mình, với lại chị đã có sẵn quần navy rồi nên mua cả set sẽ bị thừa. 

Chị chọn áo sơ mi SM613 giá 499k là hợp lý nhất ạ. Tổng thanh toán gồm phí ship nội thành là 524k, vừa vặn với ngân sách của chị. Áo có màu trắng hoặc xanh nhạt mặc phối với quần navy đi làm vừa lịch sự vừa đổi mới cách mặc. 

Chị cho em xin số đo vòng ngực để em chọn size áo chuẩn cho mình nhé ạ!
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ, chọn trắng được chị nhé. Ngực 92cm mình mặc size M vừa vặn ạ. Đúng điều kiện chị họp trong phòng và mặc áo lót màu da thì áo không bị lộ màu áo lót đâu ạ.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Với số đo của chị, em chọn size L cho váy VA512 màu rêu nhé ạ. Đơn hàng ở nội thành TP.HCM được miễn phí ship, tổng thanh toán là 829.000đ, vừa vặn trong ngân sách 900k của chị luôn nha.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Quần navy hiện còn đủ size S, M, L chị nhé. Giao nội thành TP.HCM phí ship 25k, tổng thanh toán là 484k ạ. Để chọn size chuẩn cho mình, chị cho em xin số đo vòng eo và vòng mông nhé.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, áo trắng size L hết rồi chị ạ. Em đổi sang màu xanh nhạt size L nhé chị; áo xanh nhạt mặc với quần đen rất gọn gàng và nhã nhặn. Áo giá 499.000đ, vừa đúng ngân sách của mình ạ.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, em không dám khẳng định chắc chắn tuyệt đối chị nhé, vì thời gian giao nội thành là dự kiến 2–3 ngày chứ không phải là cam kết cố định ngày giờ đến. Nếu chị cần mặc gấp cho sáng thứ Sáu thì tiến độ giao hàng sẽ có chút rủi ro về thời gian ạ.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ sơ mi SM613 xanh nhạt giá 499k chị nhé. Với vòng ngực 92cm, chị lấy size M là vừa chuẩn ạ, màu này size M hiện còn hàng chị nha.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo ngực 96, eo 77, mông 104cm thì chị mặc size L là vừa vặn chuẩn ạ. Đen size L nhà em vẫn đang còn hàng chị nhé.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 navy size M còn sẵn hàng chị nhé, 459k ạ.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Với ngân sách 550k cả ship, set 749k mình không vừa ngân sách nữa rồi chị ạ. Em đổi sang áo sơ mi SM613 giá 499k, phí ship nội thành 25k, tổng thanh toán 524k vừa khít với số tiền của chị. 

Áo có màu trắng và xanh nhạt, mặc đi làm phối cùng quần navy sẵn có của chị rất gọn gàng và lịch sự. Chị cho em xin số đo vòng ngực để em chọn size áo nhé.
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, cuối tuần chị cứ thong thả xem lại nha chị.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử ở nhà thoải mái ạ, miễn là váy chưa giặt, sạch, không mùi và giữ nguyên tem mác thì shop hỗ trợ đổi được chị nhé. Còn nếu đã mặc đi tiệc hay mặc ra ngoài rồi thì shop không nhận đổi ạ.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, phí vận chuyển khi đổi hàng là khách trả chị nha. Nhưng chị yên tâm chọn size M nhé, vì số đo của chị rất vừa vặn với form này, mặc thoải mái và chuẩn dáng ạ.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ nếu chị không có nhu cầu thêm quần thì mình không nên mua chỉ để lấy freeship ạ, vì thêm 459k tiền quần để đỡ 25k ship thì tính ra mình vẫn tốn thêm tiền. 

Nhưng nếu chị muốn đổi sang màu navy (khác với quần đen chị đang có) để phối cùng sơ mi cho mới mẻ, thì thêm quần QU714 (459k) sẽ nâng tổng đơn lên 958k và được miễn phí ship luôn chị nhé. Chị xem mình có cần thêm quần navy không ạ?
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ, bên em không áp dụng hoàn tiền chị ạ. Nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu áo còn nguyên tem và chưa sử dụng, thử sạch sẽ trong nhà nhé. 

Em ghi nhận chị lấy áo trắng size M (499k) ạ!
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, áo sơ mi SM613 giá 499.000đ chị nhé. Áo có hai màu trắng và xanh nhạt, chị thích màu nào ạ?
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ navy size M còn hàng chị nhé!
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ chị cứ xem tự nhiên nhé, cần hỗ trợ thêm gì chị cứ nhắn em nha.
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
Dạ tổng 524k chị nhé (gồm 499k tiền áo và 25k ship nội thành TP.HCM), dưới 600k đúng ý chị ạ. Để chọn size, chị cho em xin số đo vòng ngực nhé.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Dạ, với đèn chiếu ngược thì có thể thấy bóng áo lót chị nha, vì điều kiện này khác với ánh sáng phòng. Còn áo trắng M hiện vẫn còn hàng chị nhé.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, mình đổi trong 7 ngày được với điều kiện hàng chưa sử dụng, nguyên tem và chỉ thử trong nhà thôi chị nhé; nếu mình mặc đi làm ra ngoài rồi thì shop không nhận đổi ạ. Còn phí vận chuyển khi đổi thì khách sẽ trả chị nha.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng, không muốn mua thêm quần. Em chọn giúp chị màu áo nhé, chọn size thì cần số đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt. Set ST411 gồm áo quần giá 749k."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn áo màu trắng nhé. Mặc cùng quần navy vừa sáng sủa, vừa thanh lịch đúng ý nhẹ nhàng của chị; giá áo 499k cộng ship 25k là 524k, vừa vặn trong ngân sách dưới 600k của mình. 

Để chọn size chuẩn, chị cho em xin số đo vòng ngực nhé ạ.
```

## r12-pants-known-waist:1

Customer: Cả ship hết bao nhiêu? Có eo rồi em chọn size được chưa hay cần đo thêm?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy giá 459k, hiện còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Tổng đơn của mình gồm ship nội thành là 484.000đ chị nhé. Với vòng eo 74cm thì quần ở khoảng size M, nhưng để chọn size chuẩn xác nhất thì chị cho em xin thêm số đo vòng mông nhé ạ.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, xanh nhạt size M còn hàng chị nhé, áo giá 499.000đ ạ. Màu này phối với quần navy vừa hợp tone lại rất gọn gàng đó chị.
```

## r12-indoor-exchange-eligible:1

Customer: Nếu ngày thứ 5 từ lúc nhận, chị chỉ thử trong nhà, giữ tem, chưa giặt, váy sạch không mùi, chưa mặc ra ngoài thì đổi mẫu được đúng không? Phí chị trả phải không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r14-workday-choice:1

Customer: Chị đo được ngực 92, eo 74, mông 96cm. Chị khó quyết quá, em chọn một mẫu với size cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên muốn phần bụng dễ chịu."},{"role":"shop","text":"Shop có set ST411 749k, quần suông lưng chun, và váy VA512 829k, eo cố định chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị set ST411 size M nhé ạ (749k). Quần của set có lưng chun toàn vòng nên khi chị ngồi làm việc nhiều sẽ rất dễ chịu, không bị cấn bụng. Với số đo ngực 92, eo 74, mông 96 của chị, mặc size M là vừa vặn thoải mái ạ.
```

## r14-price-repeat-wear:1

Customer: Chị mua để mặc đi làm thường xuyên, còn muốn phối với đồ ở nhà. Ngực 92, eo 74, mông 96cm. Chênh 129k thì có đáng lấy bên em không, chọn size giúp chị luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng thấy bên khác bộ nhìn giống giá 620k."},{"role":"shop","text":"Set navy của shop 749k, có thể mặc cả bộ hoặc tách áo và quần để phối."}]
```

Actual terminal customer outcome:
```text
Đáng với cách dùng đi làm và phối đồ ở nhà của chị ạ. Set gồm áo sơ mi và quần suông, chị có thể mặc cả bộ lịch sự hoặc tách rời phối cùng các món khác rất linh hoạt; chất vải ít nhăn hơn linen giúp bộ đồ luôn gọn gàng, chỉn chu suốt ngày dài làm việc. 

Với số đo ngực 92, eo 74, mông 96cm của chị, size M là vừa đẹp. Set navy size M hiện còn hàng chị nhé.
```

## r14-pants-size-input:1

Customer: Chị giao nội thành TP.HCM. Tính tiền cả ship giúp chị, để chọn size thì em cần chị đo những đâu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy hiện còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần 459k cộng 25k phí ship nội thành TP.HCM là 484k chị nhé. Để em chọn size chuẩn, chị cho em xin số đo vòng eo và vòng mông nha.
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
Dạ, mình chốt áo sơ mi trắng size M giá 499k chị nhé. Về chính sách, shop không áp dụng hoàn tiền nhưng hỗ trợ đổi size hoặc đổi mẫu khác trong vòng 7 ngày từ khi nhận hàng, miễn là sản phẩm còn nguyên tem mác, chưa giặt và chị chỉ thử trong nhà ạ.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ nếu ở nhà chị có nhiều quần rồi thì mình mua áo thôi ạ. Thêm quần để được freeship thì chị chỉ đỡ được 25k tiền ship nhưng lại tốn thêm 459k tiền quần, tính ra tổng chi phí bỏ ra sẽ nhiều hơn. Chị lấy áo SM613 nhé chị?
```

## r15-value-use:1

Customer: Chị muốn mặc đi làm rồi tách áo phối đồ cuối tuần nữa. Có điểm nào của hàng mình đáng để chị chi thêm không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, nhưng thấy một bộ nhìn gần giống giá 620k."},{"role":"shop","text":"Set bên em 749k, áo dáng rộng, quần suông lưng chun; mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, rất đáng để chị đầu tư vì tính ứng dụng cao cho cả đi làm lẫn cuối tuần ạ. Set ST411 gồm áo sơ mi dáng rộng và quần ống suông lưng chun, giúp chị có ngay bộ đồ chỉn chu, lịch sự khi mặc trọn bộ đi làm. Cuối tuần mình có thể dễ dàng tách chiếc áo sơ mi đó ra phối với quần jean hoặc chân váy để đi chơi. Quần ống suông lưng chun mặc ngồi làm việc cả ngày cũng rất thoải mái, tiện lợi để xoay vòng nhiều kiểu mặc.
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
Dạ, mình cần thêm số đo vòng mông nữa là em chọn được size chuẩn cho chị nhé. Quần giá 459k, phí ship nội thành TP.HCM là 25k, tổng thanh toán là 484k ạ.
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]
```

Actual terminal customer outcome:
```text
Dạ giá vẫn 499k chị nhé, đổi màu không đổi giá ạ. Áo xanh nhạt mặc cùng quần navy trông vừa sáng vừa nhã nhặn. Em chốt xanh nhạt size M cho mình nhé ạ!
```

## r16-effort-and-use:1

Customer: Chị muốn mua một bộ dùng được cả đi làm và cuối tuần. Em thuyết phục chị chọn bộ này xem?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, ngân sách 850k."},{"role":"shop","text":"Set 749k, áo dáng rộng và quần suông lưng chun, mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị chọn set navy này rất hợp cho cả đi làm lẫn cuối tuần ạ. Áo sơ mi dáng rộng kết hợp quần ống suông mang lại vẻ ngoài lịch sự, chỉn chu cho môi trường công sở; trong khi lưng chun toàn vòng cùng chất vải ít nhăn giúp chị luôn thoải mái, giữ dáng gọn gàng khi dạo phố hay cà phê cuối tuần. 

Bộ này có giá 749k, nằm trọn trong ngân sách 850k của chị. Chị cho em xin số đo vòng ngực, eo và mông để em chọn size chuẩn cho mình nhé ạ.
```

## r16-budget-alternative:1

Customer: Chị có 600k thôi. Nếu không thêm quần, em chọn giúp một cách phối khác với đồ chị có nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen, đang định mua sơ mi trắng SM613, giao nội thành TP.HCM."},{"role":"shop","text":"Áo cả giao 524k; QU714 459k, mua cùng tổng hàng 958k và được freeship."}]
```

Actual terminal customer outcome:
```text
Áo 499k cộng phí giao 25k là 524k, vừa vặn trong ngân sách 600k của chị ạ. 

Với quần đen sẵn có ở nhà, chị có thể sơ vin gọn gàng để tạo vẻ thanh lịch, chỉn chu đi làm, hoặc thả suông thoải mái cho ngày dạo phố. 

Để em chọn đúng size áo cho chị, chị cho em xin số đo vòng ngực nhé ạ!
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi kế hoạch, dự tiệc trong nhà và muốn mặc váy cho gọn. Em chọn màu với size giúp chị, giá có trong 850k không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực92, eo74, mông96cm. Ban đầu định chọn set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 đều có size M theo số đo chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, đi tiệc trong nhà chị chọn váy VA512 hợp ạ. Mẫu này có màu đen sang và gọn, hoặc màu rêu; em chọn sẵn màu đen cho tiệc tối rất tinh tế. Với số đo của chị, mình mặc size M chuẩn nhất. Giá váy là 829.000đ, nằm trong ngân sách 850k của mình luôn nha chị.
```

## r16-pants-color-alternative:1

Customer: Chị không thêm để freeship đâu, nhưng muốn đổi quần đen ở nhà sang màu khác để phối áo trắng. Em chọn màu cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"QU714 có đen và navy, giá459k, quần suông cạp trước phẳng chun sau."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn quần suông QU714 màu navy nhé ạ. Áo trắng SM613 phối cùng quần navy tạo sự tươi tắn, thanh lịch mà vẫn rất nhã nhặn, giúp bộ đồ trông mới mẻ hơn chiếc quần đen quen thuộc ở nhà. Quần navy giá 459k. 

Chị cho em xin số đo vòng eo và mông để em chọn size quần vừa vặn cho mình nhé.
```
