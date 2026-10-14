# A3 — human review of actual terminal customer outcomes

This is an unfilled human-review packet, not human acceptance evidence. Separate primary offline reviews are in A3_CONVERSATIONS.md/a3-offline-scores.json. Markdown strips displayed line-end spaces/tabs; exact strings remain in a3-evidence.json.

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
Em chọn cho chị set sơ mi quần suông ST411 size M nhé ạ.

Mẫu này có thiết kế áo dáng rộng kết hợp quần ống suông lưng chun toàn vòng, giúp chị ngồi làm việc máy tính cả ngày thoải mái, không lo bị cấn hay ôm eo. Set có giá 749k (được miễn phí vận chuyển nội thành TP.HCM) với hai lựa chọn màu là be và xanh navy. Chị thích mặc màu nào ạ?
```

## r5-competitor-price:1

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Dạ, với khoản chênh lệch đó, set ST411 rất xứng đáng để đầu tư cho tủ đồ đi làm thường xuyên của chị. Chất liệu 65% polyester và 35% viscose của set ít nhăn hơn linen, giúp chị giữ được vẻ ngoài gọn gàng, chỉn chu suốt cả ngày làm việc ở văn phòng.

Thêm vào đó, thiết kế áo dáng rộng kết hợp quần suông lưng chun mang lại sự thoải mái khi di chuyển, lại rất linh hoạt để chị có thể tách rời áo hoặc quần phối với các trang phục khác, nhân đôi số lượng bộ đồ công sở cho tuần làm việc.
```

## r5-wardrobe-budget:1

Customer: Mua thêm cả set có phí quá không em? Chị ở nội thànhTP.HCM, chỉ muốn mua thứ cần thôi.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, mua cả set sẽ thừa vì chị đã có quần navy rồi và giá 749k vượt ngân sách dưới 600k của chị.

Chị chọn áo sơ mi SM613 giá 499k là hợp lý nhất ạ. Tổng thanh toán gồm ship nội thành là 524k, vừa vặn khoản chị muốn. Áo có màu trắng và xanh nhạt, phối với quần navy sẵn có đi làm rất lịch sự.

Chị ưng màu nào và cho em xin số đo vòng ngực để em chọn đúng size vừa vặn cho mình nhé ạ?
```

## r5-white-opacity:1

Customer: Chị họp trong phòng và có áo lót màu da rồi. Ngực92cm, vậy chọn trắng được chứ?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."}]
```

Actual terminal customer outcome:
```text
Dạ, chị chọn áo trắng size M là chuẩn ạ; size này shop vẫn còn. Chị họp trong phòng và đã có sẵn áo lót màu da thì mình yên tâm chọn mẫu trắng này nha, điều kiện ánh sáng phòng sẽ không bị lộ màu áo đâu ạ.
```

## r5-size-price-stock:1

Customer: Em chọn size rồi tính cả ship giúp chị. Chị ở nội thànhTP.HCM, ngân sách900k.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn váy VA512 rêu đi tiệc. Ngực96, eo77, mông104cm."},{"role":"shop","text":"Màu rêu đang còn S,M,L, giá829k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, mẫu rêu VA512 hợp với size L của chị ạ. Đơn hàng 829k được miễn phí ship nội thành TP.HCM, tổng cộng là 829k chị nhé.
```

## r5-missing-customer-size:1

Customer: Chị ở nội thànhTP.HCM. Tính cả ship và xem còn hàng không, rồi chọn size cho chị với.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cần quần navy mặc với áo sơ mi trắng ở nhà."},{"role":"shop","text":"Quần QU714 navy giá459k, có S,M,L; mẫu này quần suông, chun sau chị nhé."}]
```

Actual terminal customer outcome:
```text
Quần navy hiện đủ size S, M, L chị nhé. Đơn ở nội thành TP.HCM có tổng 484.000đ (gồm 459.000đ tiền quần và 25.000đ phí ship).

Để em chọn chuẩn size cho mình, chị cho em xin số đo eo và mông nhé ạ.
```

## r5-white-variant-alternative:1

Customer: TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k."},{"role":"shop","text":"Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt."}]
```

Actual terminal customer outcome:
```text
Dạ, trắng size L nhà em hết rồi chị ạ. Size L hiện còn màu xanh nhạt, mặc lên nhã nhặn và phối rất hợp với quần đen. Áo giá 499.000đ chị nha.
```

## r5-delivery-timing:1

Customer: Hôm nay thứBa, vậy có chắc trước sáng thứSáu không? Nếu không chắc thì chị nên tính sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn ST411 navyM. Chị ở nội thànhTP.HCM, cần bộ đi làm sáng thứSáu."},{"role":"shop","text":"Set749k, miễnship nội thànhTP.HCM chị nhé. Thời gian giao dự kiến2–3ngày sau xác nhận đơn."}]
```

Actual terminal customer outcome:
```text
Dạ, thời gian giao nội thành TP.HCM là dự kiến 2–3 ngày sau xác nhận đơn chứ không phải cam kết chắc chắn ngày giờ đến, nên em không dám đảm bảo đơn sẽ tới trước sáng thứ Sáu ạ.

Nếu chị cần tuyệt đối chắc chắn có đồ cho lịch sáng thứ Sáu và không muốn mạo hiểm với thời gian vận chuyển dự kiến, chị có thể cân nhắc chuẩn bị một bộ đồ phòng hờ sẵn có để yên tâm hơn. Nếu chị vẫn quyết định lấy set ST411 navy M, em hỗ trợ lên đơn ngay để kho gửi đi sớm nhất cho mình nhé!
```

## r5-correct-product:1

Customer: Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị hỏi set ST411 navy, giá749k đúng không?"},{"role":"shop","text":"Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L."}]
```

Actual terminal customer outcome:
```text
Dạ sơ mi SM613 giá 499.000đ chị nhé. Chị lấy size M ạ.
```

## r5-correct-measurement:1

Customer: Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn VA512 đen, ngực91, eo72, mông97cm."},{"role":"shop","text":"Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng."}]
```

Actual terminal customer outcome:
```text
Dạ vâng, em đổi sang size L cho chị nhé! Đen size L nhà em đang còn sẵn hàng, chất crepe không co giãn nên mặc size L sẽ vừa vặn và thoải mái hơn cho chị ạ.
```

## r5-referent-navy:1

Customer: Ừ, mẫu đó cònM thì chị lấyM nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem set ST411 be với quần QU714 navy."},{"role":"shop","text":"Set749k, quần bán riêng459k chị nhé."},{"role":"customer","text":"Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm."},{"role":"shop","text":"Dạ, quầnQU714navy sizeM theo sốđo của chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, quần QU714 navy size M bên em hiện còn hàng, giá 459.000đ chị nhé. Em cảm ơn chị ạ!
```

## r5-budget-correction:1

Customer: Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM."},{"role":"shop","text":"Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt."}]
```

Actual terminal customer outcome:
```text
Sơ mi dáng thẳng SM613 giá 499k (tổng cả ship nội thành là 524k, vừa vặn ngân sách của chị) rất hợp để phối cùng quần navy chị đang có đi làm. Áo có hai màu trắng và xanh nhạt.

Chị cho em xin số đo vòng ngực để em chọn chuẩn size cho mình nhé ạ!
```

## r5-defer:1

Customer: Chị chưa mua đâu. Cuối tuần tính, đừng giữ hàng hay hỏi thêm nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị xem VA512 đenL đi tiệc,829k đúng không?"},{"role":"shop","text":"Dạ829k chị nhé, đenL hiện còn2chiếc."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, cuối tuần chị xem tiếp nhé ạ. Em chào chị!
```

## r5-try-exchange:1

Customer: Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị chọn VA512 đenL nhưng lo mua về chưa ưng."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ, chị thử trong nhà thoải mái và hoàn toàn được đổi trong 7 ngày từ lúc nhận hàng, miễn là váy chưa giặt, sạch, không mùi và giữ nguyên tem ạ. Còn nếu đã mặc đi tiệc hay mặc ra ngoài thì shop không nhận đổi, chị lưu ý giúp em nhé.
```

## r5-exchange-cost:1

Customer: Nếu không vừa thì bênem bao phí đổi chứ? Chị muốn chọn cho đỡ mất phí.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, phí vận chuyển đổi hàng là khách thanh toán chị nhé.

Tuy nhiên với số đo ngực 92, eo 74, mông 96 của chị thì size M là vừa vặn chuẩn số đo của mình rồi, chị yên tâm chốt size M nha.
```

## r5-shipping-threshold:1

Customer: Có nên thêm quần để freeship không? Chị có quầnđen rồi, không muốn mua thừa.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị định mua SM613499k, ở nội thànhTP.HCM."},{"role":"shop","text":"Mộtáo cộngship524k; mua từ700k miễnship. QuầnQU714459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Quần QU714 ngoài màu đen còn có màu **navy** (xanh đen) rất dễ phối đồ và không bị trùng với chiếc đen chị đang có đâu ạ.

Nếu chỉ mua áo thì tổng thanh toán là 524k (đã gồm 25k phí ship). Khi thêm quần navy 459k, tổng đơn hàng là 958k và được miễn phí ship hoàn toàn; tính ra chị chỉ bỏ thêm 434k tiền chênh lệch thực tế để nhận về một chiếc quần suông chỉn chu.

Chị cân nhắc lấy thêm màu navy này cùng áo luôn nhé ạ!
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
Dạ, sơ mi SM613 có giá 499.000đ chị nha.
```

## r5-simple-stock:1

Customer: NavyM còn hàng không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem quầnQU714navyM."},{"role":"shop","text":"Dạ mẫuquầnsuông459k chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, màu navy size M bên em vẫn còn hàng chị nhé.
```

## r5-simple-ack:1

Customer: Ừ, cảm ơn em.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị biết setST411749k rồi, để chị xem thêm nhé."},{"role":"shop","text":"Dạ chị cứ xem thêm nhé."}]
```

Actual terminal customer outcome:
```text
Dạ, em cảm ơn chị ạ. Chị cứ thoải mái xem thêm nhé!
```

## r7-price-ready-fit:1

Customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]
```

Actual terminal customer outcome:
```text
Chị chọn **size M** set navy nhé ạ.

Set ST411 có giá 749.000đ gồm áo sơ mi dáng rộng và quần ống suông lưng chun toàn vòng, làm từ chất liệu 65% polyester và 35% viscose ít nhăn hơn linen. Thiết kế này mang lại vẻ ngoài gọn gàng, chỉn chu khi đi làm thường xuyên và rất thoải mái, lại linh hoạt để chị có thể mặc cả bộ hoặc tách rời phối đồ.
```

## r7-shirt-missing-measure:1

Customer: Chị vẫn lấy xanh nhạt, giao nội thànhTP.HCM. Tổng có dưới600k không? Chọn size thì em cần chị đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy rồi, muốn đổi cách mặc đi làm. Tổng tiền chị muốn dưới600k."},{"role":"shop","text":"Shop có sơ mi SM613499k bán riêng và set ST411749k. Áo có trắng và xanh nhạt."},{"role":"customer","text":"Vậy chị chọn mua riêng áo xanh nhạt thôi."},{"role":"shop","text":"Dạ SM613 xanh nhạt giá499k, có S,M,L chị nhé."}]
```

Actual terminal customer outcome:
```text
Dạ tổng đơn áo xanh nhạt giao nội thành của mình là 524.000đ (gồm 499k tiền áo và 25k phí ship), hoàn toàn dưới 600k ạ. Để chọn size áo này, em chỉ cần chị cho em xin số đo vòng ngực cơ thể nhé.
```

## r7-opacity-context-change:1

Customer: Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót."},{"role":"shop","text":"SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng."},{"role":"customer","text":"Chị họp trong phòng, áo lót màu da. Ngực92cm."},{"role":"shop","text":"Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn."}]
```

Actual terminal customer outcome:
```text
Trắng M hiện vẫn còn chị nhé. Tuy nhiên, với không gian có đèn chiếu ngược, áo có thể thấy bóng áo lót khi ngược sáng, nên nếu sự kiện dùng đèn mạnh chiếu từ phía sau thì mình cân nhắc điểm này nha chị.
```

## r7-exchange-after-use:1

Customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị thích ST411 be. Ngực92, eo74, mông96cm."},{"role":"shop","text":"Em chọnM theo sốđo chị nhé, beM đang còn; set749k."}]
```

Actual terminal customer outcome:
```text
Dạ, shop hỗ trợ đổi trong 7 ngày với điều kiện hàng chưa sử dụng, còn nguyên tem và mới thử trong nhà thôi chị nhé; nếu mình đã mặc ra ngoài đi làm rồi thì shop không nhận đổi ạ. Phí vận chuyển khi đổi thì khách trả chị nha. Set này chất vải ít nhăn nên mặc đi làm sẽ rất gọn gàng, chỉn chu ạ.
```

## r12-office-color:1

Customer: Chị thích nhẹ nhàng, không muốn mua thêm quần. Em chọn giúp chị màu áo nhé, chọn size thì cần số đo gì?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM."},{"role":"shop","text":"Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt. Set ST411 gồm áo quần giá 749k."}]
```

Actual terminal customer outcome:
```text
Chị chọn màu trắng hoặc xanh nhạt đều rất hợp để phối cùng quần navy, vừa tạo nét tươi sáng lại giữ cảm giác nhẹ nhàng, lịch sự khi đi làm.

Để em chọn đúng size chuẩn, chị cho em xin số đo vòng ngực cơ thể nhé.
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
Dạ đúng rồi chị, size M xanh nhạt mình vẫn chuẩn và đang có sẵn ạ. Áo giá 499.000đ chị nha, màu này phối với quần navy ở nhà sẽ rất gọn gàng và nhã nhặn đó ạ!
```

## r12-indoor-exchange-eligible:1

Customer: Nếu ngày thứ 5 từ lúc nhận, chị chỉ thử trong nhà, giữ tem, chưa giặt, váy sạch không mùi, chưa mặc ra ngoài thì đổi mẫu được đúng không? Phí chị trả phải không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]
```

Actual terminal customer outcome:
```text
Dạ đúng rồi chị, trong thời gian và đúng các điều kiện như chị vừa nêu thì shop hỗ trợ chị đổi mẫu nha. Phí vận chuyển đổi hàng thì chị thanh toán giúp shop ạ.
```
