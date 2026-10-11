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
Chị lấy set ST411 (749k) nhé ạ. Set này áo sơ mi dáng rộng và quần lưng chun toàn vòng, ngồi máy tính cả ngày sẽ rất thoải mái, không bị ôm eo hay siết bụng đúng ý chị. Với số đo của chị (ngực 92, eo 74, mông 96cm), mình mặc size M là vừa chuẩn đẹp ạ.
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
Dạ mua cả set ST411 sẽ hơi quá ngân sách dưới 600k của chị, với lại mình đã có sẵn quần navy rồi nên lấy thêm set sẽ bị dư. 

Chị chọn áo sơ mi SM613 (499k) mặc cùng quần navy sẵn có là hợp lý nhất ạ. Tổng tiền áo cộng phí ship nội thành TP.HCM là 524k, vừa đúng ngân sách của chị luôn. Chị xem lấy áo màu trắng hay xanh nhạt nhé ạ?
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn trắng size M được hoàn toàn yên tâm ạ. Chị họp trong phòng và mặc áo lót màu da thì sẽ không bị thấy màu áo lót đâu chị nhé. Với số đo ngực 92cm, chị mặc size M vừa đẹp, và áo trắng size M hiện shop vẫn còn hàng ạ.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo của chị thì em chọn size L màu rêu nhé ạ. Váy 829k, chị ở nội thành TP.HCM và đơn trên 700k nên được miễn phí ship, tổng thanh toán là 829k, vừa vặn trong ngân sách 900k của chị ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Quần navy hiện còn đủ size S, M, L chị nhé. Giá quần 459k, phí ship nội thành TP.HCM là 25k, tổng thanh toán là 484k ạ. 

Để em chọn size chuẩn cho chị, chị cho em xin số đo vòng eo và vòng mông nhé ạ.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Trắng size L hết rồi chị ạ. Xanh nhạt size L bên em còn, chị lấy màu này mặc với quần đen rất sáng và gọn dáng nhé.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, thời gian giao nội thành dự kiến là 2–3 ngày nên bên em không thể cam kết chắc chắn đơn sẽ đến trước sáng thứ Sáu chị ạ.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 xanh nhạt giá 499k chị nhé. Với vòng ngực 92cm, chị lấy size M giúp em, màu này hiện đang sẵn hàng ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo mới của chị thì size L chuẩn hơn ạ. Đen L vẫn còn hàng, em chuyển sang size L cho mình nhé.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 navy size M nhà em còn sẵn chị nhé.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, với ngân sách 550k gồm ship, áo sơ mi SM613 giá 499k (phí ship nội thành 25k, tổng 524k) rất vừa vặn với mình ạ. Chị có thể chọn áo màu trắng hoặc xanh nhạt để mặc cùng quần navy sẵn có đi làm rất lịch sự. 

Chị cho em xin số đo vòng ngực để em chọn size áo chính xác nhé ạ.
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, cuối tuần mình xem lại nha chị. Cần thông tin gì thêm chị cứ nhắn em ạ!
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà thoải mái ạ, miễn là váy chưa giặt, sạch, không mùi và còn giữ nguyên tem trong vòng 7 ngày. Còn nếu mình mặc ra ngoài đi tiệc rồi thì shop không nhận đổi được chị nhé.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ phí vận chuyển đổi hàng là khách trả chị nha. Nhưng số đo của chị rất chuẩn với size M bên em nên mặc vừa vặn, chị yên tâm chọn set be size M không phải đổi đâu ạ.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, mình có quần đen rồi thì lấy **quần màu navy** nhé chị. Quần navy mặc cùng sơ mi SM613 rất gọn gàng và lịch sự. 

Thêm quần thì tổng đơn hàng là 958k, được **miễn phí ship** ạ. Tính ra mình chỉ bỏ thêm khoảng 434k (trừ đi 25k tiền ship của riêng áo) là có thêm một chiếc quần mới thay vì trả phí vận chuyển.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ, mình lấy trắng size M, 499k chị nhé. Shop không áp dụng hoàn tiền, nhưng mình được đổi size hoặc đổi mẫu khác trong 7 ngày từ nhận hàng nếu áo còn nguyên tem và chưa sử dụng nha chị.
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
Dạ chị cứ xem thêm nhé, cần hỗ trợ thêm gì chị cứ nhắn em nha!
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo của chị (ngực 92, eo 74, mông 96cm), mình mặc **size M** rất vừa vặn ạ (màu navy size M bên em vẫn còn). 

Chị mặc đi làm thường xuyên thì set 749k rất đáng đầu tư vì chất liệu pha polyester và viscose ít nhăn hơn linen, giúp giữ phom dáng gọn gàng, chỉn chu suốt cả ngày ở văn phòng. Thêm vào đó, thiết kế áo dáng rộng cùng quần ống suông lưng chun toàn vòng mang lại cảm giác rất thoải mái, lại linh hoạt để chị diện cả bộ hoặc tách ra phối với các trang phục khác nữa ạ.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thànhTP.HCM. Tổng có dưới600k không? Chọn size thì em cần chị đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."},{"role":"customer","text":"Vậy chị chọn mua riêng áo xanh nhạt thôi."},{"role":"shop","text":"Dạ SM613 xanh nhạt giá499k, có S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ tổng đơn của mình là 524k (gồm 499k tiền áo và 25k phí ship nội thành TP.HCM), tính ra là dưới 600k đúng ý chị nhé. Để chọn size áo, chị cho em xin số đo vòng ngực ạ.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Trắng M hiện còn chị nhé. Riêng với sự kiện có đèn chiếu ngược, như shop thử thì áo trắng vẫn có thể thấy bóng áo lót, nên em không chắc tuyệt đối là không thấy được đâu ạ.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, chính sách đổi trong 7 ngày áp dụng cho hàng chưa sử dụng, nguyên tem và chỉ thử trong nhà thôi chị nhé. Nếu mình mặc ra ngoài đi làm thì shop không nhận đổi ạ. Còn phí ship đổi hàng thì khách trả chị nha.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng, không muốn mua thêm quần. Em chọn giúp chị màu áo nhé, chọn size thì cần số đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt. Set ST411 gồm áo quần giá 749k."}]
```

Actual terminal customer outcome:
```text
Em chọn áo SM613 màu xanh nhạt nhé chị, sắc xanh dịu nhẹ giúp bộ quần navy trông sáng sủa và nhã nhặn hơn. Để chọn size, chị cho em xin số đo vòng ngực nhé ạ.
```

## r12-pants-known-waist:1

Customer: Cả ship hết bao nhiêu? Có eo rồi em chọn size được chưa hay cần đo thêm?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy giá 459k, hiện còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, xanh nhạt size M còn hàng chị nhé, giá 499.000đ ạ. Xanh nhạt mặc cùng quần navy vừa nhã nhặn lại rất hợp tone. Em chốt xanh nhạt size M cho chị nhé ạ.
```

## r12-indoor-exchange-eligible:1

Customer: Nếu ngày thứ 5 từ lúc nhận, chị chỉ thử trong nhà, giữ tem, chưa giặt, váy sạch không mùi, chưa mặc ra ngoài thì đổi mẫu được đúng không? Phí chị trả phải không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị nhé! Trong 7 ngày từ khi nhận hàng (ngày thứ 5), nếu sản phẩm giữ nguyên tem, chưa giặt, chỉ thử trong nhà, sạch sẽ và không mùi, chị hoàn toàn được đổi mẫu ạ. Phí vận chuyển đổi hàng thì chị thanh toán giúp shop nha.
```

## r14-workday-choice:1

Customer: Chị đo được ngực 92, eo 74, mông 96cm. Chị khó quyết quá, em chọn một mẫu với size cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên muốn phần bụng dễ chịu."},{"role":"shop","text":"Shop có set ST411 749k, quần suông lưng chun, và váy VA512 829k, eo cố định chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị lấy set sơ mi quần suông ST411 size M nhé ạ (749k). Quần có lưng chun toàn vòng giúp chị ngồi làm việc cả ngày thoải mái, không bị cấn bụng mà mặc lên vẫn gọn gàng, lịch sự.
```

## r14-price-repeat-wear:1

Customer: Chị mua để mặc đi làm thường xuyên, còn muốn phối với đồ ở nhà. Ngực 92, eo 74, mông 96cm. Chênh 129k thì có đáng lấy bên em không, chọn size giúp chị luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng thấy bên khác bộ nhìn giống giá 620k."},{"role":"shop","text":"Set navy của shop 749k, có thể mặc cả bộ hoặc tách áo và quần để phối."}]
```

Actual terminal customer outcome:
```text
Set này rất đáng để chị đầu tư mặc đi làm thường xuyên ạ. Vải của shop ít nhăn hơn linen, giữ phom tốt và mang lại nét chỉn chu, lịch sự suốt cả ngày làm việc. Ngoài ra, áo sơ mi và quần ống suông có thể tách rời để chị dễ dàng phối linh hoạt với các trang phục sẵn có ở nhà, tính ứng dụng rất cao.

Với số đo ngực 92, eo 74, mông 96cm của chị, mình lấy **size M** là chuẩn nhất ạ (chất liệu không co giãn nhưng phom dáng suông rộng thoải mái, số đo của chị nằm trọn trong khoảng của size M). Size M màu navy hiện tại vẫn đang còn hàng chị nhé.
```

## r14-pants-size-input:1

Customer: Chị giao nội thành TP.HCM. Tính tiền cả ship giúp chị, để chọn size thì em cần chị đo những đâu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy hiện còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, tổng đơn của chị là 484k (quần 459k và phí ship nội thành 25k ạ). Để em chọn size chuẩn cho mình, chị cho em xin số đo vòng eo và vòng mông nhé ạ.
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
Dạ, nếu ở nhà mình có nhiều quần rồi thì chị lấy mình áo thôi ạ. Thêm quần chỉ để được freeship 25k nhưng lại tốn thêm hơn 400k tiền quần mà ít mặc tới thì không tối ưu lắm. Chị lấy chiếc sơ mi tổng 524k là vừa vặn ạ.
```

## r15-value-use:1

Customer: Chị muốn mặc đi làm rồi tách áo phối đồ cuối tuần nữa. Có điểm nào của hàng mình đáng để chị chi thêm không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, nhưng thấy một bộ nhìn gần giống giá 620k."},{"role":"shop","text":"Set bên em 749k, áo dáng rộng, quần suông lưng chun; mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, rất đáng để chị đầu tư vì tính linh hoạt cao ạ. Với set này, chị có ngay bộ đồ chỉn chu, lịch sự để mặc đi làm, lại vừa có thể tách áo sơ mi dáng rộng hoặc quần ống suông ra để linh hoạt phối đồ khác vào cuối tuần. Thêm nữa, thiết kế quần có lưng chun toàn vòng mặc rất êm và chất vải ít nhăn giúp chị giữ phom gọn gàng, thanh lịch suốt cả ngày làm việc ở văn phòng ạ.
```

## r15-fit-reassurance:1

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, em ghi nhận chị lấy size M màu be nhé ạ. Chị yên tâm về phần cạp vì quần này thiết kế lưng chun toàn vòng, co giãn thoải mái nên khi ngồi làm việc nhiều sẽ không bị cấn hay cứng bụng đâu ạ. 

Áo dáng rộng kết hợp quần suông vừa gọn gàng, lịch sự để đi làm lại vừa rất dễ chịu cho cả ngày dài ngồi văn phòng nha chị.
```

## r15-known-waist-next:1

Customer: Có eo rồi, em cần thêm số nào để chọn size? Cả tiền giao giúp chị luôn.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn QU714 navy, eo74cm. Chị ở nội thành TP.HCM."},{"role":"shop","text":"Quần459k, navy còn S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, chị cho em xin thêm số đo vòng mông để em chọn size chuẩn cho mình nhé ạ. Phí ship nội thành TP.HCM của đơn này là 25.000đ, tổng thanh toán là 484.000đ chị nha.
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, xanh nhạt size M vẫn 499k chị nhé.
```

## r16-effort-and-use:1

Customer: Chị muốn mua một bộ dùng được cả đi làm và cuối tuần. Em thuyết phục chị chọn bộ này xem?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, ngân sách 850k."},{"role":"shop","text":"Set 749k, áo dáng rộng và quần suông lưng chun, mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Bộ này rất hợp để chị mặc linh hoạt cả đi làm lẫn cuối tuần ạ. Áo sơ mi dáng rộng cùng quần ống suông mang lại vẻ lịch sự, gọn gàng cho môi trường công sở, trong khi thiết kế thoải mái và lưng chun toàn vòng lại rất dễ chịu cho các buổi đi chơi cuối tuần. Giá 749k cũng vừa vặn trong ngân sách 850k của chị.

Chị lấy màu navy nhé ạ? Cho em xin số đo ngực, eo và mông để em chọn size vừa vặn cho chị nha.
```

## r16-budget-alternative:1

Customer: Chị có 600k thôi. Nếu không thêm quần, em chọn giúp một cách phối khác với đồ chị có nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen, đang định mua sơ mi trắng SM613, giao nội thành TP.HCM."},{"role":"shop","text":"Áo cả giao 524k; QU714 459k, mua cùng tổng hàng 958k và được freeship."}]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi trắng SM613 giá 499k, tổng đơn 524k gồm cả ship, hoàn toàn vừa vặn trong ngân sách 600k của chị ạ. 

Với quần đen sẵn có, chị có thể mặc thả suông áo dáng thẳng này bên ngoài để tạo nét phóng khoáng, thoải mái, hoặc sơ vin gọn gàng khi cần chỉn chu đi làm. 

Chị cho em xin số đo vòng ngực để em chọn size áo chuẩn cho mình nhé ạ.
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi kế hoạch, dự tiệc trong nhà và muốn mặc váy cho gọn. Em chọn màu với size giúp chị, giá có trong 850k không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực92, eo74, mông96cm. Ban đầu định chọn set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 đều có size M theo số đo chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, dự tiệc trong nhà mặc chiếc váy midi chữ A (VA512) sẽ rất gọn gàng và thanh lịch ạ. Giá váy là 829.000đ, hoàn toàn trong ngân sách 850k của mình chị nhé. 

Theo số đo của chị, em chọn size M vừa vặn ạ. Váy có màu đen sang trọng hoặc màu rêu nhã nhặn, chị thích tone màu nào hơn ạ?
```

## r16-pants-color-alternative:1

Customer: Chị không thêm để freeship đâu, nhưng muốn đổi quần đen ở nhà sang màu khác để phối áo trắng. Em chọn màu cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"QU714 có đen và navy, giá459k, quần suông cạp trước phẳng chun sau."}]
```

Actual terminal customer outcome:
```text
Dạ, vậy chị lấy quần QU714 màu navy nhé ạ. Ở nhà mình có quần đen rồi thì màu navy mặc với áo trắng SM613 vừa nhã nhặn, lịch sự lại giúp bộ đồ có điểm nhấn hơn. 

Để em chọn đúng size vừa vặn cho mình, chị cho em xin số đo vòng ngực, vòng eo và vòng mông nhé ạ!
```
