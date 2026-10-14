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
Chị chọn set ST411 màu navy size M nhé. Bộ này quần ống suông lưng chun toàn vòng, ngồi máy tính cả ngày rất thoải mái và không bị cấn eo.
```

## r5-competitor-price:1

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Với nhu cầu mặc đi làm thường xuyên, set ST411 rất đáng đầu tư nhờ sự tiện lợi và linh hoạt: chị vừa có sẵn set đồ đồng bộ lịch sự, vừa có thể tách áo hoặc quần ra để phối nhiều kiểu khác nhau. Chất vải ít nhăn hơn linen cũng giúp chị giữ vẻ ngoài gọn gàng, chỉn chu suốt cả ngày ở văn phòng.
```

## r5-wardrobe-budget:1

Customer: Mua thêm cả set có phí quá không em? Chị ở nội thànhTP.HCM, chỉ muốn mua thứ cần thôi.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ set ST411 giá 749k vượt ngân sách dưới 600k của chị, với lại chị đã có sẵn quần navy rồi thì mua cả set không cần thiết ạ.

Chị chọn sơ mi SM613 giá 499k (cộng 25k phí ship nội thành tổng cộng là 524k) là vừa đúng ngân sách và đúng món chị cần để đổi kiểu đi làm. Chị lấy áo màu trắng hay xanh nhạt ạ?
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ được chị nhé, họp trong phòng ánh sáng văn phòng kết hợp áo lót màu da thì chị chọn áo trắng hoàn toàn yên tâm ạ. Áo trắng size M đang sẵn hàng, dáng thẳng mặc lên lịch sự và gọn gàng cho buổi họp của chị nhé.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ với số đo của chị, mẫu này mình chọn size L vừa đẹp ạ. Đơn hàng ở nội thành TP.HCM được miễn phí ship, tổng thanh toán là 829k, hoàn toàn trong ngân sách 900k của chị nhé.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Màu navy hiện sẵn đủ size S, M, L chị nhé. Tổng cộng gồm quần và phí ship nội thành là 484.000đ. Chị cho em xin số đo eo và mông để em chọn chuẩn size cho chị nhé ạ.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Màu trắng size L nhà em hết rồi chị ạ. Chị chuyển sang màu xanh nhạt size L giúp em nhé; sắc xanh dịu mặc cùng quần đen rất gọn gàng và lịch sự. Áo có giá 499.000đ chị nha.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ nội thành TP.HCM có thời gian giao dự kiến 2–3 ngày sau xác nhận đơn nên bên em không thể cam kết chắc chắn giao kịp trước sáng thứ Sáu chị nha.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ sơ mi SM613 xanh nhạt giá 499k chị nha. Với ngực 92cm, chị lấy size M là chuẩn vừa đẹp ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, với số đo mới của chị thì size L chuẩn nhất ạ. Đen size L hiện vẫn đang còn hàng nha chị.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 navy size M bên em còn sẵn chị nhé!
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Sơ mi SM613 giá 499k, phí ship nội thành 25k, tổng thanh toán 524k vừa vặn ngân sách 550k của chị. Mẫu này có màu trắng và xanh nhạt, phối cùng chiếc quần navy sẵn có là chị có ngay set đồ đi làm mới mẻ, lịch sự. Chị cho em xin số đo ngực hoặc chiều cao cân nặng để em chọn đúng size nhé ạ.
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, em không giữ hàng ạ. Cuối tuần chị xem lại nha chị.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ chị thử trong nhà thoải mái ạ, miễn là sản phẩm chưa giặt, sạch, không mùi và giữ nguyên tem trong vòng 7 ngày từ lúc nhận hàng. Còn trường hợp đã mặc ra ngoài đi tiệc thì shop không nhận đổi được chị nhé.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Phí vận chuyển đổi hàng khách trả chị nhé. Size M chuẩn theo số đo của mình nên chị yên tâm, set be M đang sẵn kho ạ.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị lấy thêm quần QU714 màu navy nhé, vì màu này khác với quần đen chị đang có nên không sợ bị trùng. Mua chung combo áo và quần tổng 958k là được miễn phí ship luôn, thêm một món đồ mặc đi làm chỉn chu vẫn hợp lý hơn là tốn 25k tiền ship lẻ chị ạ.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ shop không áp dụng hoàn tiền chị nhé. Mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày từ khi nhận nếu áo chưa sử dụng, còn nguyên tem và khách chịu phí vận chuyển đổi ạ. Em ghi nhận chị lấy trắng M (499k) nhé!
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Sơ mi SM613 có giá 499.000đ chị nhé.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ mẫu navy size M nhà em vẫn còn hàng chị nhé.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ vâng ạ, chị cứ xem thêm nhé. Cần hỗ trợ gì thêm chị cứ nhắn em nha!
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Chị mặc size M nhé. Set navy bên em dùng chất vải ít nhăn hơn linen, rất hợp để chị mặc đi làm thường xuyên mà vẫn giữ được nét gọn gàng, chỉn chu cả ngày. Áo dáng rộng kết hợp quần lưng chun thoải mái, chị có thể mặc cả bộ hoặc tách rời áo, quần để phối thêm nhiều kiểu đi làm rất linh hoạt.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thànhTP.HCM. Tổng có dưới600k không? Chọn size thì em cần chị đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."},{"role":"customer","text":"Vậy chị chọn mua riêng áo xanh nhạt thôi."},{"role":"shop","text":"Dạ SM613 xanh nhạt giá499k, có S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ tổng đơn là 524k (gồm 499k tiền áo và 25k phí ship nội thành), dưới 600k chị nha. Để chọn size chuẩn, chị cho em xin số đo vòng ngực nhé.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Dạ, với sự kiện có đèn ngược sáng thì áo trắng SM613 có thể thấy bóng áo lót chị nha. Trắng M hiện vẫn còn ạ, chị giữ áo này luôn không ạ?
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng, không muốn mua thêm quần. Em chọn giúp chị màu áo nhé, chọn size thì cần số đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt. Set ST411 gồm áo quần giá 749k."}]
```

Actual terminal customer outcome:
```text
Em chọn áo màu trắng nhé ạ, sắc trắng sáng kết hợp với quần navy sẵn có sẽ mang lại diện mạo đi làm vừa sáng sủa vừa trang nhã, đúng ý nhẹ nhàng của chị. Để em chọn size chuẩn, chị cho em xin số đo vòng ngực nhé.
```

## r12-pants-known-waist:1

Customer: Cả ship hết bao nhiêu? Có eo rồi em chọn size được chưa hay cần đo thêm?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."},{"role":"shop","text":"Quần navy giá 459k, hiện còn S, M, L."}]
```

Actual terminal customer outcome:
```text
Tổng đơn của chị là 484k gồm 459k tiền quần và 25k ship nội thành. Chị cho em xin thêm số đo mông để em chọn chuẩn size nhé.
```

## r12-change-color-only:1

Customer: Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực 92cm."},{"role":"shop","text":"Em chọn size M cho chị, trắng M còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, xanh nhạt size M mình vẫn còn hàng chị nhé. Áo có giá 499.000đ, sắc xanh này mặc với quần navy ở nhà vừa gọn gàng vừa hợp tone ạ.
```

## r12-indoor-exchange-eligible:1

Customer: Nếu ngày thứ 5 từ lúc nhận, chị chỉ thử trong nhà, giữ tem, chưa giặt, váy sạch không mùi, chưa mặc ra ngoài thì đổi mẫu được đúng không? Phí chị trả phải không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị, trong 7 ngày từ lúc nhận hàng nếu đồ còn nguyên tem, chưa giặt, sạch sẽ và chị chỉ thử trong nhà thì shop hỗ trợ đổi mẫu ạ. Phí vận chuyển đổi hàng mình thanh toán giúp shop nhé.
```

## r14-workday-choice:1

Customer: Chị đo được ngực 92, eo 74, mông 96cm. Chị khó quyết quá, em chọn một mẫu với size cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên muốn phần bụng dễ chịu."},{"role":"shop","text":"Shop có set ST411 749k, quần suông lưng chun, và váy VA512 829k, eo cố định chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn cho chị set sơ mi quần suông ST411 màu be size M nhé. Thiết kế quần lưng chun toàn vòng giúp chị ngồi làm việc cả ngày thoải mái, không lo siết bụng, giá set là 749k.
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
Tổng tiền quần và ship nội thành của mình là 484k chị nhé. Để em chọn size vừa vặn, chị cho em xin số đo vòng eo và vòng mông ạ.
```

## r14-stage-light-change:1

Customer: Lịch đổi rồi em, chị lên sân khấu có đèn phía sau. Chị muốn tránh thấy bóng áo lót, em khuyên còn nên lấy trắng không? Trắng M vẫn còn chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Em chọn SM613 trắng M cho chị. Shop thử ánh sáng phòng không thấy màu áo lót, ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Trắng M bên em vẫn còn 2 chiếc chị nhé. Tuy nhiên, khi chị lên sân khấu có đèn phía sau, phép thử của shop cho thấy áo trắng có thể thấy bóng áo lót. Nếu chị muốn tránh hoàn toàn tình trạng này thì không nên chọn màu trắng ạ.
```

## r14-refund-before-buy:1

Customer: Chị vẫn chọn trắng M nhé. Nếu thử lên không ưng thì shop hoàn tiền hay chỉ đổi mẫu khác? Chị muốn hiểu phần này trước khi mua.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."},{"role":"shop","text":"Em chọn trắng M cho chị, áo 499k và hiện còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ, shop hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ nhận hàng nếu áo chưa sử dụng, nguyên tem và thử sạch sẽ trong nhà; phí vận chuyển đổi khách trả, và shop không áp dụng hoàn tiền chị nha. Áo SM613 trắng size M (499k) hiện sẵn hàng, chị yên tâm chọn ạ.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Nếu ở nhà mình đã có nhiều quần rồi, chị cứ lấy riêng áo thôi ạ. Thêm quần chỉ để được freeship 25k sẽ khiến mình tốn thêm một khoản cho món đồ chưa thực sự cần dùng đến.
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
Dạ chị cho em xin thêm số đo mông để chọn size chuẩn nhất ạ. Tổng tiền hàng và phí giao nội thành TP.HCM của mình là 484.000đ (quần 459.000đ, phí ship 25.000đ).
```

## r15-color-final-confirm:1

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]
```

Actual terminal customer outcome:
```text
Dạ giá vẫn vậy chị nhé, xanh nhạt size M 499k ạ.
```

## r16-effort-and-use:1

Customer: Chị muốn mua một bộ dùng được cả đi làm và cuối tuần. Em thuyết phục chị chọn bộ này xem?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, ngân sách 850k."},{"role":"shop","text":"Set 749k, áo dáng rộng và quần suông lưng chun, mặc cả bộ hoặc tách phối được chị nhé."}]
```

Actual terminal customer outcome:
```text
Set navy này rất hợp để chị mặc linh hoạt cả đi làm lẫn cuối tuần. Áo sơ mi dáng rộng kết hợp quần suông lưng chun mang lại nét thanh lịch, gọn gàng cho công sở nhưng vẫn thoải mái, nhẹ nhàng cho những buổi dạo phố. Tông màu navy sang trọng, dễ mặc, lại có thể linh hoạt tách rời áo hoặc quần để phối với các trang phục khác. Mức giá 749k hoàn toàn vừa vặn, rất đáng để chị chọn cho tủ đồ của mình.
```

## r16-budget-alternative:1

Customer: Chị có 600k thôi. Nếu không thêm quần, em chọn giúp một cách phối khác với đồ chị có nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có nhiều quần đen, đang định mua sơ mi trắng SM613, giao nội thành TP.HCM."},{"role":"shop","text":"Áo cả giao 524k; QU714 459k, mua cùng tổng hàng 958k và được freeship."}]
```

Actual terminal customer outcome:
```text
Chị lấy chiếc sơ mi trắng SM613 phối với các dáng quần đen sẵn có trong tủ là chuẩn nhất ạ. Dáng áo thẳng, cổ bẻ gọn gàng, chị có thể thả suông hoặc sơ vin một nửa với quần đen là có ngay set đồ đi làm thanh lịch, nhã nhặn mà không cần mua thêm quần mới.

Áo 499k cộng phí ship nội thành 25k là 524k, vừa vặn trong ngân sách 600k của chị nhé ạ.
```

## r16-change-to-indoor-dress:1

Customer: Chị đổi kế hoạch, dự tiệc trong nhà và muốn mặc váy cho gọn. Em chọn màu với size giúp chị, giá có trong 850k không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đo ngực92, eo74, mông96cm. Ban đầu định chọn set ST411 đi làm."},{"role":"shop","text":"ST411 và VA512 đều có size M theo số đo chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, đi tiệc thì chị chọn mẫu váy VA512 màu đen, size M giúp em nhé ạ. Màu đen mặc đi tiệc sang trọng và dáng váy rất gọn gàng, lịch sự. Giá váy là 829.000đ, nằm trong mức 850k chị đang cân nhắc ạ.
```

## r16-pants-color-alternative:1

Customer: Chị không thêm để freeship đâu, nhưng muốn đổi quần đen ở nhà sang màu khác để phối áo trắng. Em chọn màu cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Ở nhà chị có quần đen rồi, thích áo trắng SM613."},{"role":"shop","text":"QU714 có đen và navy, giá459k, quần suông cạp trước phẳng chun sau."}]
```

Actual terminal customer outcome:
```text
Chị chọn quần QU714 màu navy nhé. Vì ở nhà mình đã có quần đen rồi, màu navy sẽ tạo độ tương phản lịch sự và gọn gàng khi phối cùng áo trắng SM613.
```
