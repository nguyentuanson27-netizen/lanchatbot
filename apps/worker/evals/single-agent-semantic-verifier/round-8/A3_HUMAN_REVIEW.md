# A3 — generated review packet of actual terminal customer outcomes

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
Em chọn cho chị **set ST411 size M, giá 749.000đ**, trong ngân sách chị dự tính. Quần suông có lưng chun toàn vòng nên hợp ưu tiên không thích eo ôm khi ngồi làm việc hơn váy VA512 có eo cố định.

Size M phù hợp với số đo ngực 92, eo 74, mông 96cm của chị. Nếu chọn màu để đi làm, em nghiêng về **navy** vì dễ phối với giày và túi màu trung tính.
```

## r5-competitor-price:1

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Với nhu cầu mặc đi làm thường xuyên, em vẫn nghiêng về **ST411 navy** chị nhé. Áo dáng rộng, quần suông giúp chị có một bộ phối sẵn; chị cũng có thể tách áo phối với quần khác, hoặc dùng quần với áo đang có để đổi cách mặc.

Điểm đáng cân nhắc là vải ST411 **ít nhăn hơn linen trong thử gấp cùng điều kiện**, dù vẫn có thể nhăn — hợp với ưu tiên giữ vẻ gọn gàng khi đi làm. Em thấy khoản thêm 129k có cơ sở nếu chị dùng thường xuyên cả bộ lẫn từng món. Nhưng chỉ nhìn giống nhau thì chưa đủ so chất lượng; em chưa có thông tin vải và phom bộ 620k để khẳng định bên em tốt hơn.

Để xem set navy có hợp số đo của chị không, chị cho em vòng ngực, eo và mông nhé?
```

## r5-wardrobe-budget:1

Customer: Mua thêm cả set có phí quá không em? Chị ở nội thànhTP.HCM, chỉ muốn mua thứ cần thôi.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Em khuyên chị mua riêng sơ mi SM613, không cần thêm cả set. Chị đã có quần navy rồi; em chọn áo xanh nhạt phối cùng để đổi cách mặc đi làm mà không phải mua thêm quần.

Áo giá 499.000đ, ship nội thành TP.HCM 25.000đ, **tổng 524.000đ**, vẫn dưới mức 600.000đ chị muốn. Set ST411 là 749.000đ dù được miễn ship, nên không hợp khoản chi và nhu cầu hiện tại của chị.

Chị cho em số đo vòng ngực để tư vấn size áo nhé.
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Được chị, em chọn SM613 trắng size M cho chị. Với ánh sáng phòng và áo lót màu da như chị nói, mẫu trắng đã được shop thử và không thấy màu áo lót. Vòng ngực 92 cm phù hợp size M, màu trắng size này hiện còn hàng.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn size L cho váy VA512 màu rêu theo số đo ngực 96, eo 77, mông 104 cm của chị. Size này hiện còn hàng.

Một chiếc giá 829.000đ, giao nội thành TP.HCM được miễn phí ship, nên tổng là **829.000đ**, nằm trong ngân sách 900.000đ của chị.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Một chiếc QU714 navy giá 459.000đ, phí ship nội thành TP.HCM 25.000đ, tổng là **484.000đ** chị nhé. Màu navy hiện còn đủ size S, M và L.

Để chọn size cho chị, chị cho em số đo **vòng eo và vòng mông** theo cm nhé.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
SM613 trắng size L hiện hết rồi chị. Em chọn xanh nhạt size L thay thế: màu này phối với quần đen vẫn gọn gàng, sáng nhẹ. Xanh nhạt L còn hàng, đúng size phù hợp với vòng ngực 98cm của chị; giá áo 499.000đ, trong ngân sách chị dự tính.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Chưa thể chắc bộ sẽ đến trước sáng thứ Sáu chị nhé. Mốc 2–3 ngày là dự kiến tính từ lúc xác nhận đơn, không bảo đảm ngày hay giờ nhận, nên chị không nên dựa vào mốc này cho buổi đi làm đó.

Nếu chị mua chủ yếu để mặc sáng thứ Sáu, em khuyên chị chưa chốt ST411 và chuẩn bị bộ có sẵn, hoặc chọn món có thể mua trực tiếp kịp ngày. Nếu vẫn muốn ST411 để mặc đi làm lâu dài, chị có thể cân nhắc, nhưng nên có bộ khác cho sáng thứ Sáu.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Sơ mi SM613 giá 499.000đ chị nhé, bán riêng áo nên hợp để phối với quần chị đã có. Với vòng ngực 92cm, chị chọn size M; màu xanh nhạt size M hiện còn hàng ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo mới em chọn size L cho chị nhé. Mẫu này eo cố định, vải không co giãn nên L phù hợp hơn M. VA512 đen size L hiện còn hàng ạ.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 màu navy còn size M, đúng size theo số đo của chị. Chị chọn riêng quần navy size M, giá 459.000đ nhé.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị **sơ mi SM613 màu xanh nhạt** để phối với quần navy chị đang có. Áo dáng thẳng, cổ bẻ hợp phối đi làm; màu xanh nhạt giúp đổi diện mạo mà không cần mua thêm cả bộ.

Áo **499.000đ**, ship nội thành TP.HCM **25.000đ**, tổng **524.000đ**, nằm trong ngân sách 550k của chị.

Chị cho em số đo vòng ngực để tư vấn size nhé.
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ chị, cuối tuần chị cân nhắc rồi nhắn em khi tiện nhé.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà vẫn được đổi size hoặc mẫu trong 7 ngày từ khi nhận hàng, miễn là chưa giặt, hàng sạch, không mùi và giữ nguyên tem. Phí vận chuyển đổi chị trả nhé.

Nếu chị mặc đi tiệc rồi thì shop không nhận đổi, dù vẫn trong 7 ngày. Chị nên thử VA512 đen L ở nhà và quyết định có ưng không trước khi mặc ra ngoài nhé.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Phí vận chuyển đổi do khách trả chị nhé, shop không bao phí này.

Để hạn chế chọn sai size, em vẫn đề xuất ST411 màu be size M: đây là size phù hợp theo bảng của mẫu với số đo ngực 92, eo 74, mông 96 cm chị đã gửi.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Không cần thêm quần đâu chị. Chị đã có quần đen thì phối với sơ mi SM613 là hợp, không cần mua thêm chỉ để miễn ship. Mua riêng một áo tổng 524.000đ, đã gồm 25.000đ phí giao nội thành TP.HCM; lấy thêm QU714 thì tổng 958.000đ dù được miễn ship.

Em nghiêng về chỉ lấy áo. Chị cho em số đo vòng ngực để chọn size SM613 nhé.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn SM613 trắng size M nhé. Shop không áp dụng hoàn tiền nếu thử không thích, nhưng chị có thể đổi size hoặc mẫu trong 7 ngày từ khi nhận hàng.

Chị chỉ thử trong nhà, chưa giặt, giữ áo sạch, không mùi và nguyên tem; mặc ra ngoài thì không nhận đổi. Phí vận chuyển đổi do chị trả ạ.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Sơ mi SM613 giá 499.000đ một áo chị nhé.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 màu navy size M hiện còn hàng chị nhé.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, em cảm ơn chị nhé!
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Em chọn **ST411 navy size M** cho chị. Số đo ngực 92, eo 74, mông 96cm phù hợp với hướng dẫn size M của set; màu navy size M hiện còn hàng.

Với nhu cầu mặc đi làm thường xuyên, điểm đáng cân nhắc ở bộ **749.000đ** này là áo dáng rộng và quần suông: mặc nguyên bộ sẽ gọn về phối đồ, còn tách áo hoặc quần ra phối với đồ chị có thì dùng được nhiều cách hơn. Vải cũng đã được thử gấp và ít nhăn hơn linen trong cùng điều kiện, dù vẫn có thể nhăn — điểm này hữu ích nếu chị ngại chăm đồ mỗi ngày.

Em chưa có thông tin chất liệu và phom của bộ 620k nên không khẳng định bên em tốt hơn chỉ vì giá cao hơn. Nhưng với ST411, mình đã có căn cứ chọn size theo số đo của chị, và kiểu bộ này hợp để chị dùng luân phiên đi làm. **Nếu mức 749k vẫn trong ngân sách, em nghiêng về ST411 navy M.**
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thànhTP.HCM. Tổng có dưới600k không? Chọn size thì em cần chị đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."},{"role":"customer","text":"Vậy chị chọn mua riêng áo xanh nhạt thôi."},{"role":"shop","text":"Dạ SM613 xanh nhạt giá499k, có S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ dưới 600k chị nhé. Một áo SM613 xanh nhạt giá 499.000đ, phí giao nội thành TP.HCM 25.000đ, tổng là **524.000đ**.

Để chọn size, chị đo giúp em **vòng ngực cơ thể ở chỗ đầy nhất**, thước ôm vừa và không siết, rồi gửi số cm nhé. Mẫu này chọn size theo vòng ngực, không cần đo eo hay mông chị ạ.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Với đèn chiếu ngược, SM613 trắng **có thể thấy bóng áo lót** chị nhé; kết quả thử với áo lót màu da trong ánh sáng phòng không đảm bảo cho điều kiện này. Nếu chị cần chắc chắn không lộ bóng ở sự kiện, em không khuyên chọn áo trắng này.

Trắng size M hiện vẫn còn hàng chị ạ.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Chị lưu ý là mặc đi làm rồi thì shop không nhận đổi, dù vẫn trong 7 ngày ạ. Shop chỉ nhận đổi size hoặc mẫu trong 7 ngày từ khi nhận hàng, khi chưa sử dụng và còn nguyên tem. Chị có thể thử trong nhà, nhưng cần giữ đồ chưa giặt, sạch, không mùi và giữ tem.

Phí vận chuyển đổi do chị trả. Nếu chị muốn mặc đi làm vài buổi rồi mới quyết định giữ hay đổi thì chính sách này không phù hợp; chị nên thử trong nhà và quyết định trước khi mặc ra ngoài nhé.
```

Owner-authorized offline review completed by CODEX_PRIMARY_AGENT in A3_REVIEW.md/a3-codex-assessment.json; filled scores are not human/independent acceptance.
