# A3 — human review of actual terminal customer outcomes

This is an unfilled human-review packet; a3-human-scores.json still contains null ratings. Completed primary offline review is recorded separately in a3-offline-scores.json and A3_CONVERSATIONS.md; it is not human/owner acceptance.

Score 0/1/2 on the ten frozen dimensions in a3-human-scores.json. Read the complete buyer situation and actual terminal reply first, then assign diagnostic scores using the frozen whole-conversation protocol. Display line-end whitespace is normalized; exact strings remain in raw a3-evidence.json.

Trusted truth and required/forbidden behavior per case are in a3-human-review.json. The packet excludes rejected drafts and verifier verdicts.

## r5-workday-comfort:1

Customer: Chị chưa chọn được. Ngực92, eo74, mông96cm, em chọn giúp chị mẫu với size nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần bộ đi làm tầm850k. Chị ngồi máy tính cả ngày, không thích đồ ôm eo."},{"role":"shop","text":"Em có set ST411749k, quần suông lưng chun, và váy VA512829k, eo cố định. Chị thích mặc bộ hay váy hơn?"}]
```

Actual terminal customer outcome:
```text
Chị chọn set ST411 size M, màu be hoặc navy nhé ạ.

Set này có thiết kế áo dáng rộng và quần lưng chun toàn vòng thoải mái, không gây cấn eo khi chị ngồi làm việc cả ngày, giá lại vừa vặn trong tầm ngân sách của chị.
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
Dạ đúng rồi chị, chị đã có quần navy rồi thì mình chỉ cần lấy áo sơ mi SM613 (499k) thôi ạ. Tổng đơn về nội thành là 524k, vừa vặn trong ngân sách dưới 600k của chị mà không bị thừa đồ.
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị chọn size L màu rêu nhé ạ. Tổng đơn là 829.000đ và được miễn phí ship nội thành TP.HCM ạ.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Quần navy hiện còn đủ size S, M, L chị nhé. Tổng tiền hàng và ship nội thành TP.HCM là 484.000đ ạ. Để em chọn chuẩn size, chị cho em xin số đo vòng eo và mông nhé.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Trắng size L bên em hết rồi, chị chuyển sang màu xanh nhạt size L giúp em nhé. Xanh nhạt mặc với quần đen rất nhã nhặn và sáng da, giá áo 499.000đ ạ.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ shop không dám cam kết chắc chắn vì thời gian giao là dự kiến 2–3 ngày, không phải cam kết cố định ngày giờ ạ. Nếu chị cần tuyệt đối cho lịch sáng thứ Sáu và không muốn có rủi ro trễ, mình nên chuẩn bị phương án trang phục dự phòng khác nha chị.
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ, áo giá 499.000đ chị nhé. Chị lấy size M màu xanh nhạt, hiện shop đang có sẵn hàng ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ vâng, size L sẽ vừa vặn với số đo mới của mình hơn chị ạ. Đen L hiện shop vẫn đang còn hàng.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 navy size M bên em còn sẵn chị nhé.
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Chị chọn sơ mi SM613 giá 499.000đ (phí ship nội thành 25.000đ, tổng 524.000đ) kết hợp với quần navy sẵn có của chị sẽ rất hợp để đi làm ạ.

Chị cho em xin số đo vòng ngực để em chọn size vừa vặn nhé.
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, cuối tuần chị thong thả xem lại nhé ạ.
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà thoải mái nha chị, miễn là sản phẩm còn nguyên tem, chưa giặt, sạch và không có mùi lạ là shop hỗ trợ đổi trong 7 ngày. Còn nếu mình đã mặc đi tiệc hay mang ra ngoài thì shop không nhận đổi ạ.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Không nên chị ạ, vì mua thêm quần 459k chỉ để tiết kiệm 25k tiền ship sẽ thành ra lãng phí nếu chị không có nhu cầu. Quần này ngoài màu đen còn có màu navy để thay đổi, nhưng nếu tủ đồ đã đủ thì chị cứ lấy riêng áo thôi nhé.
```

## r5-refund-distinction:1

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]
```

Actual terminal customer outcome:
```text
Dạ shop không áp dụng hoàn tiền chị nha, nhưng mình có thể đổi size hoặc đổi mẫu trong 7 ngày đầu nếu áo còn nguyên tem và chưa sử dụng ạ.
```

## r5-simple-price:1

Customer: Sơ miSM613 giá bao nhiêu em?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, áo sơ mi SM613 có giá 499.000đ ạ.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ màu navy size M bên em còn hàng chị nhé.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ chị cứ thoải mái xem thêm nhé, cần hỗ trợ gì thêm chị cứ nhắn em nha!
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
Dạ tổng 524.000đ (gồm 499k áo và 25k ship nội thành), dưới 600k chị nhé. Để chọn size, em chỉ cần chị cho em xin số đo vòng ngực cơ thể ạ.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Dạ, nếu có đèn chiếu ngược thì áo trắng SM613 có thể thấy bóng áo lót chị nha. Size trắng M hiện vẫn còn hàng ạ.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, shop chỉ nhận đổi khi sản phẩm còn nguyên tem và chỉ thử trong nhà, nếu chị mặc ra ngoài đi làm thì sẽ không áp dụng đổi được ạ. Còn phí vận chuyển khi đổi hàng thì khách trả chị nhé.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng, không muốn mua thêm quần. Em chọn giúp chị màu áo nhé, chọn size thì cần số đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt. Set ST411 gồm áo quần giá 749k."}]
```

Actual terminal customer outcome:
```text
Chị chọn màu xanh nhạt nhé, sắc xanh dịu nhẹ vừa giúp bộ đồ đi làm sáng hơn vừa kết hợp rất ăn ý với quần navy sẵn có của chị.

Để shop chọn size chính xác, chị cho em xin số đo vòng ngực cơ thể nhé.
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
Dạ, xanh nhạt size M vẫn còn hàng và giá vẫn là 499.000đ chị nhé. Size M này vừa vặn với ngực 92cm của chị, mặc lên phối cùng quần navy sẽ rất hợp và gọn gàng ạ.
```

## r12-indoor-exchange-eligible:1

Customer: Nếu ngày thứ 5 từ lúc nhận, chị chỉ thử trong nhà, giữ tem, chưa giặt, váy sạch không mùi, chưa mặc ra ngoài thì đổi mẫu được đúng không? Phí chị trả phải không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị, mình đổi mẫu được ạ vì vẫn trong thời gian hỗ trợ và đảm bảo đúng các điều kiện trên; phí vận chuyển đổi hàng thì chị chịu giúp shop nhé.
```

## r14-workday-choice:1

Customer: Chị đo được ngực 92, eo 74, mông 96cm. Chị khó quyết quá, em chọn một mẫu với size cho chị nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên muốn phần bụng dễ chịu."},{"role":"shop","text":"Shop có set ST411 749k, quần suông lưng chun, và váy VA512 829k, eo cố định chị nhé."}]
```

Actual terminal customer outcome:
```text
Em chọn set ST411 size M cho chị nhé. Thiết kế quần lưng chun toàn vòng sẽ giúp phần bụng thoải mái khi ngồi làm việc, giá 749k ạ.
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
Tổng tiền gồm quần và ship nội thành TP.HCM là 484k ạ (459k tiền quần và 25k phí ship).

Để em tư vấn chuẩn size, chị cho em xin số đo vòng eo và vòng mông nhé ạ.
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
Shop không áp dụng hoàn tiền nhưng hỗ trợ đổi size hoặc đổi mẫu khác trong vòng 7 ngày từ lúc nhận hàng, miễn là áo còn nguyên tem và chưa qua sử dụng ạ. Mẫu trắng size M (499k) chị chọn hiện vẫn còn sẵn hàng để gửi cho chị nhé.
```

## r14-freeship-extra-pants:1

Customer: Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM."},{"role":"shop","text":"Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Chị mua áo thôi chị nhé. Ở nhà mình đã có nhiều quần rồi thì không cần mua thêm chỉ để được freeship ạ.
```
