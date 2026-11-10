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
Em chọn cho chị **set ST411 size M, giá 749.000đ**, nằm trong ngân sách chị nhé. Áo dáng rộng, quần suông và lưng chun toàn vòng hợp nhu cầu ngồi làm việc nhiều, không thích ôm eo hơn váy VA512 có eo cố định. Size M phù hợp với số đo chị đưa; vải không co giãn nhưng phần lưng quần có chun.

Mẫu này hiện còn size M cả be và navy. Em nghiêng về **navy** cho chị vì dễ phối giày, túi đi làm và nhìn gọn gàng.
```

## r5-competitor-price:1

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Với nhu cầu mặc đi làm thường xuyên, em nghiêng về ST411 chị nhé. Áo dáng rộng, quần suông lưng chun; ngoài mặc cả bộ, chị có thể tách áo phối quần khác hoặc phối quần với áo có sẵn, nên dùng được nhiều cách.

Vải 65% polyester, 35% viscose ít nhăn hơn linen trong thử gấp cùng điều kiện, hợp ưu tiên gọn gàng khi đi làm, nhưng vẫn có thể nhăn. Đó là cơ sở em thấy khoản thêm 129k đáng cân nhắc. Còn bộ 620k, chỉ nhìn giống thì chưa đủ để kết luận chất lượng bên nào hơn chị ạ.
```

## r5-wardrobe-budget:1

Customer: Mua thêm cả set có phí quá không em? Chị ở nội thànhTP.HCM, chỉ muốn mua thứ cần thôi.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Chị không cần mua thêm cả set đâu ạ, vì đã có quần navy rồi. Em chọn áo sơ mi SM613 xanh nhạt để phối với quần chị có: dáng thẳng, cổ bẻ hợp đi làm, màu xanh nhạt giúp bộ đồ nhìn tươi hơn.

Áo giá 499.000đ, ship nội thành TP.HCM 25.000đ, tổng **524.000đ**, dưới mức 600k của chị. Set ST411 giá 749.000đ vừa vượt ngân sách vừa thêm chiếc quần chưa cần thiết.

Chị cho em vòng ngực để em tư vấn size áo nhé.
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Được chị nhé, em chọn **SM613 trắng size M** cho chị. Size M phù hợp vòng ngực của chị; màu trắng khi shop thử dưới ánh sáng phòng với áo lót màu da không thấy màu áo lót, nên hợp nhu cầu mặc họp của chị.

M trắng hiện còn hàng, giá **499.000đ** ạ.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn size L cho váy VA512 màu rêu của chị nhé. Số đo của chị nằm trong khoảng cơ thể dành cho size L, phù hợp với mẫu eo cố định, chất vải không co giãn này; màu rêu size L đang còn hàng.

Váy 829.000đ, giao nội thành TP.HCM được miễn phí ship, nên tổng là **829.000đ**, trong ngân sách 900k của chị ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 màu navy còn đủ size S, M, L chị nhé. Giá quần 459.000đ, ship nội thành TP.HCM 25.000đ, **tổng 484.000đ cho 1 quần**.

Để chọn đúng size, chị cho em số đo **vòng eo và vòng mông** nhé; mẫu này có chun sau nhưng mình chọn theo số đo cơ thể, không theo mức kéo tối đa của chun.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, SM613 trắng size L hết rồi chị. Em chọn xanh nhạt size L đang còn hàng: hợp vòng ngực của chị, phối với quần đen nhìn thanh lịch, sáng nhẹ. Áo giá 499.000đ, trong ngân sách chị nhé.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, em không thể cam kết hàng đến trước sáng thứ Sáu chị nhé. Mốc 2–3 ngày là thời gian **dự kiến sau khi xác nhận đơn**, không bảo đảm giờ nhận.

Nếu bắt buộc phải có đồ mặc sáng thứ Sáu, em khuyên chị chuẩn bị một bộ có sẵn, đừng phụ thuộc vào đơn này. Set ST411 chị đã chọn vẫn có thể mua để mặc những buổi sau, nếu chị chấp nhận khả năng hàng đến không kịp dịp này.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn riêng áo SM613 xanh nhạt nhé. Áo giá **499.000đ**, ngực 92cm em chọn **size M** theo bảng size của mẫu này, hiện còn hàng chị ạ. Áo dáng thẳng, tay dài, chất 100% cotton dệt dày, không co giãn.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo mới em chọn size L cho chị nhé. Số đo của chị nằm trong khoảng cơ thể của L; váy eo cố định, vải không co giãn nên L phù hợp hơn M. VA512 đen size L hiện còn hàng chị ạ.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 chị chọn còn size M, giá 459.000đ nhé. Chị gửi em tên người nhận, số điện thoại và địa chỉ nhận hàng để tính phí giao ạ.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Vậy em chọn cho chị **sơ mi SM613 màu xanh nhạt**, phối với quần navy chị đã có để đổi diện mạo đi làm, không cần mua cả set. Áo dáng thẳng, cổ bẻ, tay dài, chất cotton dệt dày, hợp mặc công sở chị nhé.

Áo **499.000đ + 25.000đ ship nội thành TP.HCM = 524.000đ**, nằm trong ngân sách mới của chị. Màu xanh nhạt hiện còn hàng.

Chị cho em số đo vòng ngực để em tư vấn size nhé.
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ chị, khi nào muốn mua chị nhắn em nhé. Em không giữ hàng ạ.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà vẫn đổi được trong 7 ngày từ khi nhận hàng, miễn váy chưa giặt, sạch, không mùi và còn nguyên tem.

Nếu chị mặc đi tiệc rồi thì shop không nhận đổi nữa ạ. Chị nên thử và quyết định trước khi mặc ra ngoài; nếu đổi size hoặc mẫu, chị trả phí vận chuyển đổi. Shop không áp dụng hoàn tiền.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ phí vận chuyển đổi chị tự trả, shop không bao phí đổi ạ. Chị được đổi size hoặc mẫu trong 7 ngày từ khi nhận hàng, nếu chỉ thử trong nhà, chưa giặt, còn nguyên tem, sạch và không mùi; mặc ra ngoài rồi thì không đổi được.

Để hạn chế phải đổi, em vẫn chọn **ST411 be size M** cho chị: cả ngực, eo và mông của chị đều nằm trong khoảng cơ thể dành cho M, áo dáng rộng và quần suông có lưng chun nên đây là lựa chọn phù hợp theo số đo chị đã gửi.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Không nên thêm quần chỉ để miễn ship chị ạ. Chị đã có quần đen rồi thì mua riêng áo SM613 hợp lý hơn, phối với quần sẵn có là được.

Một áo cả ship là 524.000đ; thêm QU714 thì tổng 958.000đ, tức chi thêm 434.000đ chỉ để tiết kiệm 25.000đ tiền ship. Chọn riêng áo sẽ tránh mua thừa chị nhé.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn trắng M nhé. Shop không áp dụng hoàn tiền nếu thử không thích, nhưng chị có thể đổi size hoặc mẫu trong 7 ngày từ khi nhận hàng. Áo cần chưa sử dụng, nguyên tem; chị được thử trong nhà nhưng chưa giặt, áo sạch và không mùi. Nếu đã mặc ra ngoài thì không nhận đổi, phí vận chuyển đổi chị trả ạ.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 giá 499.000đ/áo chị nhé. Mẫu này dáng thẳng, tay dài, chất 100% cotton dệt dày, có màu trắng và xanh nhạt ạ.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ quần QU714 màu navy size M còn 2 chiếc chị nhé, giá 459.000đ ạ.
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
