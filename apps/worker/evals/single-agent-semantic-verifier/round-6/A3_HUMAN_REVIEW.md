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
Em chọn cho chị **set ST411 màu navy, size M, giá 749.000đ** — nằm trong ngân sách 850k của chị.

Sơ mi dáng rộng, quần suông với lưng chun hợp ưu tiên không thích eo cố định của chị hơn váy VA512. Màu navy cũng dễ phối theo hướng gọn gàng khi đi làm.

Size M phù hợp với số đo ngực 92, eo 74, mông 96cm của chị; màu navy size M hiện còn hàng ạ.
```

## r5-competitor-price:1

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Với nhu cầu đi làm thường xuyên, em nghiêng về ST411 nếu chị sẽ mặc cả bộ lẫn tách áo, quần phối với đồ sẵn có — như vậy khoản thêm 129k có giá trị sử dụng rõ hơn, chứ không chỉ mua vì hình thức.

Một điểm đáng cân nhắc là vải ST411 ít nhăn hơn linen trong thử gấp cùng điều kiện; tuy vậy vẫn có thể nhăn, không phải loại khỏi cần là.

Còn bộ 620k bên kia, em chưa có thông tin về chất liệu và phom nên không khẳng định bên em tốt hơn. Nếu chị chỉ cần bộ có vẻ ngoài tương tự thì chưa đủ cơ sở để khuyên chị trả thêm chỉ vì giá bên em cao hơn ạ.
```

## r5-wardrobe-budget:1

Customer: Mua thêm cả set có phí quá không em? Chị ở nội thànhTP.HCM, chỉ muốn mua thứ cần thôi.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Với nhu cầu của chị, em khuyên **mua riêng sơ mi SM613 màu trắng**, chưa cần thêm set ạ. Phối áo trắng với quần navy chị đã có là một cách đổi diện mạo đi làm mà vẫn tận dụng được đồ sẵn.

Áo **499.000đ**, phí giao nội thành TP.HCM **25.000đ**, tổng **524.000đ**, nằm trong mức dưới 600k của chị.

Set ST411 giá 749.000đ, vượt ngân sách và thêm cả quần khi chị chưa cần. Mua riêng áo hợp lý hơn, không cần mua thêm chỉ để được miễn phí giao hàng chị nhé.
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Được chị, em chọn **SM613 trắng size M** cho chị nhé. Với vòng ngực 92cm, size M phù hợp và hiện còn hàng.

Trong ánh sáng phòng, shop đã thử với áo lót màu da và không thấy màu áo lót, nên màu trắng là lựa chọn phù hợp cho buổi họp của chị. Chỉ lưu ý nếu có ánh sáng chiếu ngược thì vẫn có thể thấy bóng ạ.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Váy VA512 màu rêu, chị chọn size L theo số đo ngực 96, eo 77, mông 104 cm nhé; màu rêu size L hiện còn hàng.

Một váy giá 829.000đ, miễn phí ship nội thành TP.HCM nên tổng là **829.000đ**, còn dư 71.000đ so với ngân sách 900.000đ của chị.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, 1 quần QU714 giá 459.000đ, phí ship nội thành TP.HCM 25.000đ, tổng là **484.000đ** chị nhé.

Màu navy hiện còn cả S, M và L. Để chọn size phù hợp, chị cho em số đo **vòng eo và vòng mông (cm)** nhé.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ SM613 trắng size L hiện hết rồi chị. Em chọn xanh nhạt size L cho chị nhé: màu này còn hàng, phối với quần đen nhẹ nhàng mà vẫn lịch sự. Áo giá 499.000đ, trong mức tiền áo chị dự tính.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, em không thể bảo đảm bộ sẽ đến trước sáng thứ Sáu chị nhé. Thời gian giao nội thành TP.HCM là **dự kiến 2–3 ngày sau khi xác nhận đơn**, nên dù xác nhận hôm nay vẫn có thể không kịp giờ chị cần.

Nếu bắt buộc có đồ mặc sáng thứ Sáu, chị nên chuẩn bị một bộ sẵn có làm phương án chính. Với ST411 navy M, chị chỉ nên đặt nếu vẫn muốn dùng cho những buổi đi làm sau và chấp nhận khả năng nhận hàng sau dịp này.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chuyển sang áo sơ mi SM613 xanh nhạt, giá 499.000đ/áo. Với vòng ngực 92cm, chị chọn size M nhé; màu xanh nhạt size M hiện còn hàng ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo mới ngực 96, eo 77, mông 104cm, em chọn size L cho chị thay cho M nhé. VA512 đen size L hiện còn hàng ạ.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 màu navy size M chị chọn hiện còn hàng, giá 459.000đ/chiếc ạ.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị **sơ mi SM613 màu xanh nhạt**, phối với quần navy chị đã có để đổi cách mặc đi làm mà không cần mua thêm quần. Áo dáng thẳng, cổ bẻ; chị có thể sơ vin để bộ đồ nhìn gọn gàng hơn.

Áo **499.000đ**, ship nội thành TP.HCM **25.000đ**, tổng **524.000đ**, nằm trong ngân sách 550k của chị.

Chị cho em số đo vòng ngực để tư vấn size nhé?
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ chị, cuối tuần chị cân nhắc nhé. Em không giữ hàng hay hỏi thêm ạ.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà vẫn đổi size hoặc mẫu được trong **7 ngày từ khi nhận hàng**, miễn là váy chưa giặt, sạch, không mùi và còn nguyên tem. Phí vận chuyển đổi chị thanh toán ạ.

Nếu chị đã mặc đi tiệc thì shop **không nhận đổi**, dù vẫn trong 7 ngày. Chị nên thử và quyết định có giữ váy trước khi mặc ra ngoài nhé.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ phí vận chuyển đổi do chị thanh toán, shop không bao phí đổi ạ. Để chọn sát số đo ngay từ đầu, em vẫn chọn **size M** cho ST411 be theo số đo ngực, eo và mông chị đã gửi.

Nếu cần đổi size, chị được đổi trong **7 ngày từ khi nhận hàng**, hàng chưa sử dụng và nguyên tem. Chị có thể thử trong nhà, giữ đồ chưa giặt, sạch, không mùi và còn tem; mặc ra ngoài rồi thì không nhận đổi ạ.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Không nên thêm quần chỉ để freeship đâu chị. Chị đã có quần đen và không muốn mua thừa thì em khuyên mua riêng áo SM613, phối với quần sẵn có.

Một áo 499.000đ, cộng 25.000đ ship nội thành TP.HCM là **524.000đ**. Thêm QU714 thì tổng là 958.000đ dù được miễn ship — mua thêm quần 459.000đ chỉ để tiết kiệm 25.000đ phí ship không hợp với nhu cầu của chị.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ, chị vẫn chọn SM613 trắng size M nhé. Shop không áp dụng hoàn tiền chị ạ. Nếu thử không thích, chị có thể đổi size hoặc mẫu trong 7 ngày từ khi nhận hàng, miễn là chỉ thử trong nhà, chưa sử dụng hay giặt, áo sạch, không mùi và còn nguyên tem. Mặc ra ngoài thì không nhận đổi; phí vận chuyển đổi do chị trả.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, sơ mi SM613 giá 499.000đ/áo chị nhé.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ quần QU714 màu navy size M hiện còn hàng chị nhé.
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
