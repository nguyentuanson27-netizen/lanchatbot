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
Em chọn cho chị **set sơ mi quần suông ST411 size M**, giá **749.000đ** nhé. Áo dáng rộng, quần ống suông với lưng chun toàn vòng nên hợp đi làm, dự kiến thoải mái hơn khi chị ngồi máy tính lâu và không thích ôm eo. So với váy VA512 eo cố định, set này hợp ưu tiên của chị hơn; áo và quần còn có thể mặc tách để đổi cách phối nữa ạ.
```

## r5-competitor-price:1

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Dạ, nếu chị thích dáng set navy này và sẽ mặc đi làm thường xuyên, em thấy thêm 129k là đáng vì chị có thể dùng cả bộ lẫn tách áo phối quần khác, hoặc quần suông phối áo sẵn có. Áo dáng rộng và quần lưng chun cũng thuận tiện cho việc ngồi làm việc.

Vải ST411 đã thử gấp và ít nhăn hơn linen, nhưng vẫn có thể nhăn và cần là khi cần chị nhé. Em chưa có thông tin bộ 620k nên không khẳng định bên em bền hay tốt hơn chỉ qua vẻ ngoài. Điểm đáng tiền của set mình là thiết kế dễ mặc, dễ xoay nhiều cách phối, chứ không chỉ mặc nguyên bộ một kiểu ạ.
```

## r5-wardrobe-budget:1

Customer: Mua thêm cả set có phí quá không em? Chị ở nội thànhTP.HCM, chỉ muốn mua thứ cần thôi.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, chị không nên mua thêm cả set chỉ để được freeship đâu ạ. Chị đã có quần navy, mua riêng sơ mi SM613 là đủ đổi cách mặc đi làm; tổng cả phí giao nội thành TP.HCM là **524.000đ**, vẫn dưới mức chị muốn.

Em chọn **màu xanh nhạt** phối với quần navy: nhẹ nhàng mà vẫn lịch sự, không cần mua thêm quần. Chị cho em vòng ngực để em tư vấn size áo nhé.
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn SM613 trắng size M nhé, hiện còn hàng, giá 499.000đ. Với buổi họp trong phòng và áo lót màu da, màu trắng phù hợp: shop đã thử đúng điều kiện này và không thấy màu áo lót. Chị chỉ lưu ý nếu đứng ngược sáng thì vẫn có thể thấy bóng áo lót ạ.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn **VA512 màu rêu size L** nhé, size này phù hợp số đo của chị. Dáng midi chữ A, cổ vuông hợp mặc đi tiệc; phần eo cố định và vải không co giãn nên L là lựa chọn phù hợp.

Váy **829.000đ**, được miễn phí ship nội thành TP.HCM, nên **tổng là 829.000đ**, còn dư 71.000đ trong ngân sách của chị. Màu rêu size L hiện còn hàng ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ quần QU714 màu navy còn hàng ở cả S, M, L chị nhé. Một quần 459.000đ, ship nội thành TP.HCM 25.000đ, tổng là **484.000đ**.

Để chọn đúng size cho chị, chị cho em số đo vòng eo và vòng mông nhé. Mẫu này ống suông, cạp trước phẳng phối sơ mi trắng gọn gàng, chun sau tiện khi mặc ở nhà ạ.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, SM613 trắng size L hiện hết rồi chị. Em chọn cho chị **xanh nhạt size L**, hiện còn hàng: màu này phối với quần đen nhìn sáng và thanh lịch, size L phù hợp với chị. Giá áo **499.000đ**, trong tầm tiền chị dự tính ạ.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, em chưa thể bảo đảm ST411 navy M đến trước sáng thứ Sáu chị nhé. Lịch giao nội thành TP.HCM dự kiến 2–3 ngày sau xác nhận đơn, nên có thể sát hoặc qua giờ chị cần mặc.

Nếu bắt buộc có bộ này cho sáng thứ Sáu, chị không nên đặt với kỳ vọng chắc chắn kịp. Nếu chị vẫn muốn mua để đi làm những ngày sau thì navy M hiện còn hàng, giá 749.000đ đã miễn phí giao nội thành ạ.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 xanh nhạt bán riêng áo giá **499.000đ** chị nhé. Em chọn **size M** cho chị, hợp dáng sơ mi thẳng, mặc với quần chị có sẵn sẽ gọn và dễ phối. Màu xanh nhạt size M hiện còn hàng ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo mới em chọn size L cho chị nhé. VA512 có eo cố định, vải không co giãn nên L phù hợp hơn M. Mình chọn VA512 đen size L, hiện còn hàng ạ.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 màu navy còn size M chị nhé. Chị chọn M là phù hợp ạ, giá riêng quần 459.000đ.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị **sơ mi SM613 màu xanh nhạt**, phối với quần navy chị đã có để đổi cách mặc đi làm. Áo dáng thẳng, cổ bẻ gọn gàng; xanh nhạt đi với navy vừa hài hòa vừa tạo nét tươi mới.

Áo **499.000đ**, ship nội thành TP.HCM **25.000đ**, tổng **524.000đ**, nằm trong mức chị muốn chi, không cần mua thêm món nào ạ. Chị cho em vòng ngực để em chọn size phù hợp nhé.
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ chị, chị cứ cân nhắc cuối tuần nhé. Em không giữ hàng hay hỏi thêm ạ.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà vẫn đổi size hoặc mẫu được trong 7 ngày từ khi nhận hàng, miễn váy chưa giặt, sạch, không mùi và còn nguyên tem. Nếu chị đã mặc đi tiệc thì shop không nhận đổi nữa ạ. Chị thử độ vừa và xem có ưng mẫu trước khi mặc ra ngoài nhé.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ phí vận chuyển đổi bên em do khách trả, shop không bao phí này chị nhé. Nếu cần đổi size hoặc mẫu, thời hạn là 7 ngày từ khi nhận hàng, đồ chưa sử dụng và còn nguyên tem; chị có thể thử trong nhà, giữ đồ sạch, không mùi và chưa giặt.

Để hạn chế phải đổi, em chọn **ST411 be size M** cho chị theo số đo đã gửi. Áo dáng rộng, quần ống suông có lưng chun nên dự kiến mặc thoải mái; không cần tăng lên L chị nhé.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Không nên thêm quần chỉ để freeship chị nhé. Mua riêng áo SM613 cả ship là 524.000đ; thêm QU714 thì tổng 958.000đ, tức chị chi thêm 434.000đ để tiết kiệm 25.000đ phí giao.

Chị có quần đen rồi thì tận dụng phối với SM613 là hợp, không cần mua thừa. Nếu chưa chọn màu áo, em nghiêng về xanh nhạt để phối quần đen: nhẹ mắt mà vẫn lịch sự ạ.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn SM613 trắng size M nhé. Shop không áp dụng hoàn tiền ạ. Nếu thử trong nhà chưa ưng, chị có thể đổi size hoặc mẫu trong 7 ngày từ khi nhận hàng, miễn áo chưa giặt, sạch, không mùi và còn nguyên tem. Phí vận chuyển đổi chị thanh toán; áo đã mặc ra ngoài thì shop không nhận đổi nhé.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 giá 499.000đ/áo chị nhé. Mẫu tay dài, dáng thẳng, cổ bẻ, có màu trắng và xanh nhạt, dễ phối với quần tây hoặc jeans ạ.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ quần suông QU714 màu navy size M còn hàng chị nhé, giá 459.000đ ạ.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, em cảm ơn chị ạ.
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Em chọn ST411 navy size M cho chị nhé, hiện còn hàng. Áo dáng rộng, quần suông lưng chun nên với số đo của chị, size M phù hợp và dự kiến mặc thoải mái khi đi làm.

Bộ bên kia 620k thì bên em cao hơn 129k; em chưa có thông tin chất liệu và phom bên đó để khẳng định bên nào tốt hơn. Với ST411 giá 749k, điểm đáng chọn là chị có thể mặc nguyên bộ đi làm hoặc tách áo phối quần khác, tách quần phối sơ mi để đổi cách mặc. Vải cũng đã được shop thử gấp và ít nhăn hơn linen trong cùng điều kiện, dù vẫn có thể nhăn và cần là lại.

Nếu chị định mặc thường xuyên và tận dụng cả áo lẫn quần, em nghiêng về ST411 vì dùng được linh hoạt, không chỉ cho một cách phối ạ.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thànhTP.HCM. Tổng có dưới600k không? Chọn size thì em cần chị đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."},{"role":"customer","text":"Vậy chị chọn mua riêng áo xanh nhạt thôi."},{"role":"shop","text":"Dạ SM613 xanh nhạt giá499k, có S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, áo SM613 xanh nhạt 499.000đ, phí giao nội thành TP.HCM 25.000đ, tổng **524.000đ**, dưới 600k chị nhé. Màu xanh nhạt phối với quần navy chị có sẵn rất hợp đi làm.

Để chọn size, chị đo giúp em **vòng ngực cơ thể ở phần đầy nhất**, giữ thước ngang và không siết, rồi gửi em số cm nhé.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Trắng M hiện còn chị nhé, size M cũng phù hợp với chị. Nhưng với sự kiện có đèn chiếu ngược, em không khuyên chị chọn áo này nếu ưu tiên không thấy bóng áo lót: shop thử màu trắng dưới ánh sáng ngược thì vẫn có thể thấy bóng, nên em không thể bảo đảm kín trong điều kiện đó ạ.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ chị, nếu mặc đi làm rồi thì shop không nhận đổi, dù vẫn trong 7 ngày ạ. Chị có thể thử trong nhà; nếu chưa ưng size hoặc mẫu thì đổi trong 7 ngày từ lúc nhận hàng, với đồ chưa giặt, sạch, không mùi và còn nguyên tem. Phí vận chuyển đổi chị trả nhé.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng, không muốn mua thêm quần. Em chọn giúp chị màu áo nhé, chọn size thì cần số đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt. Set ST411 gồm áo quần giá 749k."}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị **SM613 màu xanh nhạt** nhé: phối với quần navy sẽ nhẹ nhàng mà vẫn sáng hơn, hợp đi làm. Áo bán riêng nên chị không cần mua thêm quần; cả ship nội thành TP.HCM là **524.000đ** ạ.

Để chọn size, chị cho em **vòng ngực cơ thể đo ở chỗ đầy nhất** nhé, đo vừa sát, không siết thước ạ.
```

## r12-pants-known-waist:1

Customer: Cả ship hết bao nhiêu? Có eo rồi em chọn size được chưa hay cần đo thêm?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy giá 459k, hiện còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Dạ, 1 quần QU714 màu navy 459.000đ + ship nội thành TP.HCM 25.000đ, tổng là **484.000đ** chị nhé.

Để chọn size, em cần thêm **vòng mông đo ở chỗ nở nhất** nữa ạ. Chỉ có số đo eo thì chưa đủ để chọn quần vừa cả eo và mông cho chị.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, xanh nhạt vẫn chọn size M cho chị, hiện còn hàng ạ. Áo SM613 xanh nhạt giá 499.000đ; phối với quần navy sẽ hài hòa, sáng nhẹ mà vẫn lịch sự chị nhé.
```

## r12-indoor-exchange-eligible:1

Customer: Nếu ngày thứ 5 từ lúc nhận, chị chỉ thử trong nhà, giữ tem, chưa giặt, váy sạch không mùi, chưa mặc ra ngoài thì đổi mẫu được đúng không? Phí chị trả phải không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ đúng chị, ngày thứ 5 tính từ lúc nhận hàng vẫn trong hạn đổi mẫu 7 ngày. Nếu chị chỉ thử trong nhà, giữ nguyên tem, chưa giặt, váy sạch không mùi và chưa mặc ra ngoài như chị nói thì đủ điều kiện đổi mẫu ạ. Phí vận chuyển đổi chị trả nhé.
```

## r14-workday-choice:1

Customer: Chị đo được ngực 92, eo 74, mông 96cm. Chị khó quyết quá, em chọn một mẫu với size cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên muốn phần bụng dễ chịu."},{"role":"shop","text":"Shop có set ST411 749k, quần suông lưng chun, và váy VA512 829k, eo cố định chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị **set sơ mi quần suông ST411 size M**, giá **749.000đ** nhé. Quần lưng chun toàn vòng sẽ dễ chịu ở bụng hơn mẫu váy eo cố định khi chị ngồi làm việc nhiều; áo dáng rộng cùng quần suông cũng hợp mặc đi làm. Chị có thể tách áo và quần phối với đồ sẵn có để đổi kiểu nữa.

Em nghiêng về **màu navy**, dễ phối đồ công sở; hiện màu này còn size M chị ạ.
```

## r14-price-repeat-wear:1

Customer: Chị mua để mặc đi làm thường xuyên, còn muốn phối với đồ ở nhà. Ngực 92, eo 74, mông 96cm. Chênh 129k thì có đáng lấy bên em không, chọn size giúp chị luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng thấy bên khác bộ nhìn giống giá 620k."},{"role":"shop","text":"Set navy của shop 749k, có thể mặc cả bộ hoặc tách áo và quần để phối."}]
```

Actual terminal customer outcome:
```text
Dạ, với nhu cầu đi làm thường xuyên và phối thêm đồ sẵn có, em chọn **ST411 navy size M** cho chị, hiện còn hàng ạ. Áo dáng rộng, quần ống suông lưng chun nên dự kiến mặc thoải mái với số đo của chị.

Em thấy phần chênh **129k đáng cân nhắc** vì chị dùng được cả bộ lẫn mặc tách: áo navy phối quần sáng màu, còn quần phối sơ mi hoặc áo thun sẵn có. Vải được shop thử gấp thấy ít nhăn hơn linen, tiện cho đồ đi làm, nhưng vẫn có thể nhăn và cần là nhẹ. Em chưa có thông tin chất vải, phom của bộ 620k nên không khẳng định bên em tốt hơn chỉ qua hình giống nhau.

Với cách chị định mặc, em nghiêng về **set navy 749k bên em** vì có nhiều cách phối để dùng thường xuyên, không chỉ mặc nguyên bộ ạ.
```

## r14-pants-size-input:1

Customer: Chị giao nội thành TP.HCM. Tính tiền cả ship giúp chị, để chọn size thì em cần chị đo những đâu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có."},{"role":"shop","text":"Quần 459k, navy hiện còn S, M, L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, 1 quần QU714 màu navy giá 459.000đ + ship nội thành TP.HCM 25.000đ, tổng là **484.000đ** chị nhé.

Để chọn size, chị đo giúp em **vòng eo tại chỗ cạp quần chị thường mặc** và **vòng mông ở phần nở nhất**. Chị giữ thước ngang, vừa sát người, không siết; gửi em hai số đo theo cm là em tư vấn size phù hợp ạ.
```

## r14-stage-light-change:1

Customer: Lịch đổi rồi em, chị lên sân khấu có đèn phía sau. Chị muốn tránh thấy bóng áo lót, em khuyên còn nên lấy trắng không? Trắng M vẫn còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Em chọn SM613 trắng M cho chị. Shop thử ánh sáng phòng không thấy màu áo lót, ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Với sân khấu có đèn phía sau, em không khuyên chị lấy SM613 trắng cho dịp này. Shop thử màu trắng dưới đèn ngược sáng vẫn có thể thấy bóng áo lót, nên không phù hợp với ưu tiên của chị.

Trắng M hiện vẫn còn 2 chiếc ạ. Màu xanh nhạt chưa có kết quả thử độ xuyên dưới đèn ngược sáng, nên em cũng chưa thể khuyên chị đổi sang màu đó để tránh lộ bóng.
```

## r14-refund-before-buy:1

Customer: Chị vẫn chọn trắng M nhé. Nếu thử lên không ưng thì shop hoàn tiền hay chỉ đổi mẫu khác? Chị muốn hiểu phần này trước khi mua.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Em chọn trắng M cho chị, áo 499k và hiện còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn SM613 trắng size M nhé. Shop **không áp dụng hoàn tiền**, nhưng có hỗ trợ đổi size hoặc mẫu trong **7 ngày từ khi nhận hàng**.

Chị có thể thử trong nhà, giữ nguyên tem, chưa giặt và giữ áo sạch, không mùi. Nếu đã mặc ra ngoài thì shop không nhận đổi; phí vận chuyển đổi chị thanh toán ạ.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Em nghĩ chị nên mua áo thôi ạ. Một áo cả ship là **524.000đ**; thêm quần thì tổng **958.000đ**, tức chị chi thêm 434.000đ chỉ để tiết kiệm 25.000đ tiền ship, trong khi ở nhà đã nhiều quần rồi.

Về phối đồ, em chọn sơ mi SM613 **xanh nhạt**: phối với quần đen chị đang có sẽ thanh lịch mà vẫn tươi tắn, không cần mua thêm quần đâu chị.
```

## r15-value-use:1

Customer: Chị muốn mặc đi làm rồi tách áo phối đồ cuối tuần nữa. Có điểm nào của hàng mình đáng để chị chi thêm không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 navy, nhưng thấy một bộ nhìn gần giống giá 620k."},{"role":"shop","text":"Set bên em 749k, áo dáng rộng, quần suông lưng chun; mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ có chị. Với nhu cầu đi làm rồi tách áo mặc cuối tuần, điểm đáng chi thêm của ST411 là **thiết kế dùng được theo nhiều cách**, chứ không chỉ mặc nguyên bộ: set navy phối cùng giày kín mũi cho vẻ gọn gàng khi đi làm; cuối tuần chị tách áo dáng rộng phối jeans, xắn tay cho thoải mái hơn. Quần suông cũng có thể phối riêng với áo thun.

Vải bên em đã thử gấp và ít nhăn hơn linen, nên đây cũng là điểm hữu ích khi chị chọn đồ đi làm, dù vẫn có thể nhăn và cần là nhẹ. Em nghiêng về ST411 navy cho nhu cầu của chị; còn bộ 620k chưa có thông tin vải và phom nên em không khẳng định hàng mình bền hay tốt hơn chỉ dựa vào giá nhé.
```

## r15-fit-reassurance:1

Customer: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều."},{"role":"shop","text":"Em chọn size M cho chị, be M còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, set ST411 màu be size M hợp chị ạ. Áo dáng rộng, quần ống suông và cạp chun toàn vòng nên em thấy phù hợp để chị đi làm, ngồi nhiều; phần eo dự kiến dễ chịu hơn kiểu cạp cố định. Vải không co giãn, nhưng cạp có chun nên không phải kiểu lưng cứng chị đang ngại nhé.
```

## r15-known-waist-next:1

Customer: Có eo rồi, em cần thêm số nào để chọn size? Cả tiền giao giúp chị luôn.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn QU714 navy, eo74cm. Chị ở nội thành TP.HCM."},{"role":"shop","text":"Quần459k, navy còn S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị cho em thêm số đo vòng mông để chọn size QU714 navy nhé.

Quần 459.000đ, phí giao nội thành TP.HCM 25.000đ, tổng 484.000đ chị ạ.
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn SM613 xanh nhạt size M nhé. Giá vẫn 499.000đ, không đổi khi đổi màu ạ. Xanh nhạt M hiện còn hàng, phối với quần navy của chị rất hợp.
```

## r16-effort-and-use:1

Customer: Chị muốn mua một bộ dùng được cả đi làm và cuối tuần. Em thuyết phục chị chọn bộ này xem?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, ngân sách 850k."},{"role":"shop","text":"Set 749k, áo dáng rộng và quần suông lưng chun, mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn set ST411 navy cho chị vì một bộ mà đổi được cách mặc theo cả hai dịp: đi làm chị sơ vin áo với quần suông, thêm giày loafer cho gọn gàng; cuối tuần thả áo, phối sneaker sẽ thoải mái và nhẹ nhàng hơn.

Điểm đáng tiền ở mức **749.000đ** là chị còn mặc tách được: áo phối jeans, quần phối áo thun, không bị bó vào một kiểu mặc cả set. Áo dáng rộng, quần lưng chun cũng hợp hướng mặc dễ chịu chị đang tìm. Vải được shop thử gấp thấy ít nhăn hơn linen, dù vẫn có thể cần là lại.

Với nhu cầu đi làm lẫn cuối tuần, em thấy bộ navy này đáng chọn chị ạ. Chị cho em số đo ngực, eo và mông để em tư vấn size phù hợp nhé.
```

## r16-budget-alternative:1

Customer: Chị có 600k thôi. Nếu không thêm quần, em chọn giúp một cách phối khác với đồ chị có nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen, đang định mua sơ mi trắng SM613, giao nội thành TP.HCM."},{"role":"shop","text":"Áo cả giao 524k; QU714 459k, mua cùng tổng hàng 958k và được freeship."}]
```

Actual terminal customer outcome:
```text
Dạ, chị không cần thêm quần chỉ để được freeship đâu ạ. Sơ mi trắng SM613 cả giao là 524k, vẫn trong mức chị dành.

Em chọn phối áo trắng với quần đen chị đang có, sơ vin gọn và xắn nhẹ tay áo cho bớt nghiêm, thêm đôi sneaker nếu có là ra một kiểu mặc trẻ trung hơn. Dáng áo thẳng, cổ bẻ hợp cách phối này, chị tận dụng được đồ sẵn có mà không cần mua thêm quần.
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi kế hoạch, dự tiệc trong nhà và muốn mặc váy cho gọn. Em chọn màu với size giúp chị, giá có trong 850k không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực92, eo74, mông96cm. Ban đầu định chọn set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 đều có size M theo số đo chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị **váy midi chữ A VA512 màu đen** nhé. Cổ vuông, tay ngắn hợp tiệc trong nhà, mặc một chiếc là gọn; lót toàn thân có độ che phủ đã được xác nhận trong ánh sáng phòng thông thường.

Giá váy **829.000đ**, nằm trong mức 850k chị muốn; giá này chưa tính phí giao hàng.

Riêng size, em xin sửa lời tư vấn trước: chưa đủ căn cứ để chốt M cho VA512. Chị đã gửi đủ số đo rồi, không cần đo lại; phần còn thiếu là kết quả đối chiếu size của riêng mẫu váy này từ shop ạ.
```

## r16-pants-color-alternative:1

Customer: Chị không thêm để freeship đâu, nhưng muốn đổi quần đen ở nhà sang màu khác để phối áo trắng. Em chọn màu cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"QU714 có đen và navy, giá459k, quần suông cạp trước phẳng chun sau."}]
```

Actual terminal customer outcome:
```text
Em chọn quần QU714 màu navy cho chị nhé. Phối với áo trắng SM613 vẫn thanh lịch, nhưng sắc xanh navy tạo điểm khác so với quần đen chị đang có. Dáng ống suông, cạp trước phẳng cũng hợp sơ vin áo trắng cho gọn gàng. Mình chọn vì muốn đổi cách phối, không cần mua thêm chỉ để freeship chị ạ.
```
