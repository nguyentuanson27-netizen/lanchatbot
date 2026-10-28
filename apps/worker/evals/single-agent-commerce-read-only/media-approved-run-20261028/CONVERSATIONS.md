# Full Phase B Compact V2 — actual customer outcomes

N1, 51 existing native outcomes. B1 is eligibility only; other cohorts use isolated persisted ingress/capture, never live send. HANDOFF is silent. NO_SEND may include a separately code-owned customer question; read actualMessages. Fixture private values remain redacted.

## 1. opening-ad (opening-quotes)

Khách: Bộ này bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ chị nhé. 

Thiết kế gồm áo tơ Hàn thêu họa tiết nổi mềm mại, thoáng mát kết hợp chân váy ren tơ Hàn form nhẹ có độ rũ tự nhiên. Mẫu này có sẵn các size S, M, L, XL ạ. Chị cân nặng và chiều cao khoảng bao nhiêu để em tư vấn size vừa vặn nhé!

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 2. opening-ad-repeat (opening-quotes)

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Bộ này bao nhiêu em?"},{"role":"shop","text":"Set váy Thạch Thảo có giá 799.000đ chị nhé. \n\nThiết kế gồm áo tơ Hàn thêu họa tiết nổi mềm mại, thoáng mát kết hợp chân váy ren tơ Hàn form nhẹ có độ rũ tự nhiên. Mẫu này có sẵn các size S, M, L, XL ạ. Chị cân nặng và chiều cao khoảng bao nhiêu để em tư vấn size vừa vặn nhé!"}]

Set váy Thạch Thảo có giá 799.000đ chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 3. opening-organic (opening-quotes)

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo gồm áo tơ Hàn thêu họa tiết nổi form nhẹ và chân váy ren tơ Hàn mềm rũ tự nhiên, giá 799.000đ ạ. Set có đủ size S, M, L, XL chị nhé.

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 4. opening-unresolved (opening-quotes)

Khách: Mẫu này giá sao em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, chị gửi giúp em hình ảnh hoặc tên mẫu để em kiểm tra giá chính xác cho mình nhé ạ!

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 5. opening-multipart (opening-quotes)

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, set váy Thạch Thảo có giá 799.000đ và shop có bán áo riêng chị nhé. Áo lẻ giá 499.000đ ạ. 

Sản phẩm gồm áo tơ Hàn thêu họa tiết nổi mềm mại, thoáng mát và chân váy ren tơ Hàn form nhẹ có độ bay tự nhiên, hiện có đủ size S, M, L, XL ạ. Chị muốn lấy cả set hay chọn mua áo lẻ ạ?

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 6. media-overview-next:ask (media-followup)

Khách: Em có ảnh khách mặc bộ Thạch Thảo không?

Terminal: HANDOFF / RESPONSE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 7. media-overview-next:continue (media-followup)

Khách: Gửi chị ảnh cả bộ nhé.

Terminal: NO_SEND / HUMAN_OWNS_CONVERSATION. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Em có ảnh khách mặc bộ Thạch Thảo không?"}]

(không có tin gửi khách)

Ảnh: 0. Owner generations: 0; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 8. media-detail-next:ask (media-followup)

Khách: Bộ Thạch Thảo có ảnh khách mặc chưa em?

Terminal: HANDOFF / RESPONSE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Draft không gửi (không phải customer outcome):
Dạ, hiện set Thạch Thảo bên em chưa có ảnh feedback khách mặc ạ. Chị có muốn xem ảnh chụp tổng thể hoặc chi tiết thiết kế áo không ạ?

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 9. media-detail-next:continue (media-followup)

Khách: Cho chị xem cận phần thêu ở áo nhé.

Terminal: NO_SEND / HUMAN_OWNS_CONVERSATION. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Bộ Thạch Thảo có ảnh khách mặc chưa em?"}]

(không có tin gửi khách)

Ảnh: 0. Owner generations: 0; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 10. media-and-price:ask (media-followup)

Khách: Em gửi chị ảnh khách mặc bộ Thạch Thảo với. Lấy riêng áo thì bao nhiêu?

Terminal: HANDOFF / RESPONSE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 11. media-and-size:ask (media-followup)

Khách: Cho chị xem gần phần thêu áo Thạch Thảo nhé. Chị cao 1m58, nặng 52kg thì lấy size nào?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, em gửi chị hình ảnh cận cảnh phần họa tiết thêu nổi ở áo ạ. Với chiều cao 1m58 và cân nặng 52kg, mẫu này chị lấy size M giúp em nhé ạ!

[CODE_IMAGE]

Ảnh: 1. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 12. media-decision:ask (media-followup)

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Em gửi chị xem tổng thể mẫu set Thạch Thảo nhé ạ. 

Chân váy của set dùng chất ren tơ Hàn mềm và có độ rũ tự nhiên, form nhẹ nhàng chứ không phải ren thô cứng hay rườm rà đâu chị, mặc lên rất bay bổng và thanh nhã. Đi ăn cưới buổi trưa diện bộ này vừa sang trọng lại vừa nhã nhặn, rất vừa vặn ạ. 

Nếu chị vẫn muốn tiết chế thêm phần ren, mình có thể chọn mua riêng áo lẻ tơ thêu nổi phối cùng chân váy khác cũng rất xinh nha chị.

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 13. b1-partial-source (missing-pos)

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Terminal: HANDOFF / PRICE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 2; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 14. b1-partial-source-v2 (missing-pos)

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Terminal: HANDOFF / PRICE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 15. b1-partial-source-v3 (missing-pos)

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Terminal: HANDOFF / PRICE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 2; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 16. b1-changed-occasion (b1-first)

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị định lấy set Thạch Thảo mặc đi đám cưới."},{"role":"shop","text":"Đi đám cưới mặc bộ này đẹp chị ạ."}]

Ngồi ô tô gần 3 tiếng thì set Thạch Thảo chất tơ và ren mềm sẽ dễ bị hằn nếp gấp chị nha. 

Chị tham khảo sang váy Diệp An nhé, mẫu này thiết kế 2 lớp giúp váy đứng form đẹp và giữ nếp tốt hơn khi ngồi lâu, mặc đi đám cưới vừa thanh lịch lại gọn gàng ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 17. b1-current-policy (b1-first)

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày."}]

Dạ vẫn kịp chị nhé, thời gian hỗ trợ đổi hàng của shop là trong 15 ngày kể từ ngày nhận đơn nên mình vẫn trong hạn ạ. Sản phẩm còn nguyên tem mác và chưa sử dụng thì chị đổi màu được nha, phí vận chuyển 2 chiều là 30.000đ chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 18. b1-price (b1-first)

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, set váy Thạch Thảo có giá 799.000đ cho cả bộ (hoặc mua lẻ áo 499.000đ, chân váy 449.000đ ạ). 

Sản phẩm gồm áo chất liệu tơ Hàn thêu nổi và chân váy ren tơ Hàn mềm mại, form nhẹ bay tự nhiên. Mẫu có đủ size S, M, L, XL chị nhé!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 19. b1-component-stock (b1-first)

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Áo Thạch Thảo size M hiện còn ạ, bán riêng có giá 499.000đ chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 20. b1-search-read (b1-first)

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, mẫu áo dài SD375 hiện có sẵn các size S, M, L với hai lựa chọn:
- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Ảnh: 0. Owner generations: 3; verifier: 1.

## 21. b1-buying-concern (b1-first)

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Chân váy dùng ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên kết hợp cùng áo tơ thêu nổi thanh thoát, nên mặc đi tiệc ban ngày rất nhã nhặn, không bị rườm rà hay nặng nề đâu chị nhé. 

Trọn bộ set váy có giá 799.000đ, nằm trong ngân sách của chị ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 22. b1-policy-used (b1-first)

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, chính sách đổi hàng bên em áp dụng cho sản phẩm còn nguyên tem mác, chưa qua sử dụng và chưa mặc ra ngoài ạ. Do chị đã mặc đi làm rồi nên shop rất tiếc không hỗ trợ đổi sản phẩm cho trường hợp này được, mong chị thông cảm giúp em nhé ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 23. b1-changed-occasion-v2 (b1-rest)

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem set Thạch Thảo để đi tiệc trưa."},{"role":"shop","text":"Tiệc trưa mặc bộ này xinh chị ạ."}]

Chất tơ Hàn ở áo có độ thoáng và bay tự nhiên, kết hợp chân váy ren tơ mềm mại, form nhẹ nhàng nên mặc không bị nặng nề hay bí bức đâu chị ạ. Dáng bộ này nhẹ người và thoải mái, di chuyển ở sân vườn cũng rất tiện.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 24. b1-current-policy-v2 (b1-rest)

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước chị nhớ phí đổi là 25 nghìn."}]

Dạ, đơn nhận 12 hôm thì vẫn trong thời hạn đổi 15 ngày chị nhé. Phí vận chuyển 2 chiều cho đơn đổi là 30.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 25. b1-price-v2 (b1-rest)

Khách: Cho chị xin giá cả bộ với em.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem bộ Thạch Thảo bên mình."}]

Set váy Thạch Thảo giá 799.000đ chị nhé. Bộ gồm áo tơ Hàn thêu nổi form nhẹ cùng chân váy ren tơ Hàn mềm mại, có độ rũ tự nhiên, hiện đủ size S, M, L, XL ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 26. b1-component-stock-v2 (b1-rest)

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị chỉ muốn lấy chân váy của set Thạch Thảo."}]

Chân váy Thạch Thảo size M hiện còn chị nha, giá mua lẻ chân váy là 449.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 27. b1-search-read-v2 (b1-rest)

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, set váy Khánh Trang chất liệu thô boi phối ren, form suông nhẹ hiện có giá 999.000đ, sẵn size S và L chị nha.

Ảnh: 0. Owner generations: 3; verifier: 1.

## 28. b1-buying-concern-v2 (b1-rest)

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, chị hoàn toàn có thể lấy set này đi ăn cưới ban ngày ạ. Dù có họa tiết thêu nổi và chân váy ren, set Thạch Thảo có form nhẹ cùng độ rũ tự nhiên nên lên dáng rất thanh thoát, nhã nhặn chứ không bị rườm rà hay quá điệu. Thiết kế này vừa đủ trang trọng cho tiệc cưới ban ngày, rất hợp nếu chị muốn đổi gió sang nét mềm mại nhưng vẫn giữ được sự tinh tế, gọn gàng.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 29. b1-policy-used-v2 (b1-rest)

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ theo quy định của shop, đổi size yêu cầu sản phẩm phải nguyên bản chưa từng mặc vào người (chỉ ướm bên ngoài). Do đó nếu chị đã mặc thử vào người thì sản phẩm sẽ không đủ điều kiện đổi hàng nữa ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 30. b1-changed-occasion-v3 (b1-rest)

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị định lấy cả bộ Thạch Thảo đi tiệc tối."},{"role":"shop","text":"Đi tiệc tối mặc cả bộ đẹp chị ạ."}]

Chị lấy cả bộ mặc đi gặp khách buổi sáng vẫn chuẩn và thanh lịch hơn ạ. Thiết kế đồng bộ giữa áo và chân váy có form nhẹ, độ rũ tự nhiên giúp tổng thể vừa chỉn chu, gọn gàng khi làm việc, vừa giữ được nét mềm mại, sang trọng để chuyển sang tiệc tối luôn ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 31. b1-current-policy-v3 (b1-rest)

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày."}]

Dạ, thời gian đổi hàng bên em là trong vòng 15 ngày kể từ ngày nhận hàng nên mình vẫn đổi size được bình thường chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 32. b1-price-v3 (b1-rest)

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Set váy Thạch Thảo có giá 799.000đ chị nhé. Thiết kế gồm áo tơ Hàn thêu nổi form nhẹ kết hợp chân váy ren tơ Hàn mềm mại, có độ rũ tự nhiên, hiện shop có sẵn các size S, M, L, XL ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 33. b1-component-stock-v3 (b1-rest)

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Áo Thạch Thảo nhà em có bán riêng chị nhé. Áo chất liệu tơ Hàn thêu họa tiết nổi, form nhẹ mềm thoáng, giá 499.000đ và hiện sẵn size M ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 34. b1-search-read-v3 (b1-rest)

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, mẫu Set quần Xuân Thảo (SQ223) bên em vẫn còn hàng chị nhé. 

Sản phẩm làm từ chất liệu vải thô đục lỗ in họa tiết hoa thoáng mát, đứng form, kết hợp phối ren tinh tế; áo 1 lớp gọn gàng và quần 2 lớp cạp chun thoải mái. Giá và size sẵn cho chị lựa chọn:
- Cả bộ: 699.000đ (sẵn size S, M, L)
- Áo lẻ: 429.000đ (sẵn size S, M, L, XL)
- Quần lẻ: 429.000đ (sẵn size S, M, L)

Chị muốn lấy cả bộ hay mua lẻ món nào ạ?

Ảnh: 0. Owner generations: 3; verifier: 1.

## 35. b1-buying-concern-v3 (b1-rest)

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị có sẵn chân váy đen dáng suông rồi."}]

Chị lấy riêng áo lẻ (499.000đ) phối cùng chân váy đen sẵn có là hợp lý nhất ạ, vừa dễ kết hợp mặc lại nhiều lần, vừa gọn gàng trong ngân sách. 

Nếu chị thích diện nguyên set ren tơ đồng bộ, bộ có váy (799.000đ) cũng nằm trong ngân sách 850.000đ của mình. Chị ưng phương án nào cứ nhắn em nhé ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 36. b1-policy-used-v3 (b1-rest)

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem và chưa giặt ạ. Do sản phẩm của mình đã cắt tem và giặt rồi nên shop không hỗ trợ đổi được, chị thông cảm giúp em nhé!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 37. sales-discovery-advice:need (journey-openings)

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Terminal: HANDOFF / RESPONSE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Draft không gửi (không phải customer outcome):
Em gợi ý chị set quần Uyển Hoa (mã SQ748) có giá 799.000đ, rất hợp tiêu chí của mình ạ. 

Mẫu này thiết kế quần short lưng chun đồng bộ nên mặc rất thoải mái, không lo bị bó bụng, kết hợp chất vải thô đũi mềm mịn và thoáng khí. Form suông nhẹ nhàng, lịch sự vừa đủ để mặc đi làm hay dạo phố. Sản phẩm hiện có sẵn các size S và L ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 38. sales-product-gallery:overview (journey-openings)

Khách: Cho chị xem ảnh set Thạch Thảo màu be nhé.

Terminal: HANDOFF / DEPENDENCY_FAILURE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 39. sales-size-advice:height-weight (journey-openings)

Khách: Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ với chiều cao 1m58, nặng 52kg và thích mặc rộng thoải mái một chút, set váy Thạch Thảo này em tư vấn chị mặc size M nhé ạ. Form set nhẹ nhàng, chất tơ Hàn mềm bay nên mặc lên vừa thoải mái lại rất thướt tha, bay bổng ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 40. sales-southern-delivery:deadline (journey-openings)

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, thời gian vận chuyển về Cần Thơ dự kiến từ 4 đến 8 ngày nên shop không kịp giao cho chị vào sáng mai ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 41. stateful-open (stateful)

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ hàng cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 42. stateful-variant-quantity (stateful)

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ hàng cho chị rồi ạ."}]

Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 43. stateful-quote (stateful)

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ hàng cho chị rồi ạ."},{"role":"customer","text":"Đổi áo sang L cho chị, lấy hai chiếc nhé."},{"role":"shop","text":"Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ."}]

Dạ, 2 áo của chị có giá 998.000đ, được ưu đãi 49.900đ và phí ship 30.000đ, tổng cộng thanh toán là 978.100đ chị nhé.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 44. stateful-correction (stateful)

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ hàng cho chị rồi ạ."},{"role":"customer","text":"Đổi áo sang L cho chị, lấy hai chiếc nhé."},{"role":"shop","text":"Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ."},{"role":"customer","text":"Hai áo cả phí ship là bao nhiêu em?"},{"role":"shop","text":"Dạ, 2 áo của chị có giá 998.000đ, được ưu đãi 49.900đ và phí ship 30.000đ, tổng cộng thanh toán là 978.100đ chị nhé."}]

Dạ vâng chị, em giữ nguyên 2 áo size L cho chị nhé ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 45. stateful-request-checkout (stateful)

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Dạ em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ hàng cho chị rồi ạ."},{"role":"customer","text":"Đổi áo sang L cho chị, lấy hai chiếc nhé."},{"role":"shop","text":"Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ."},{"role":"customer","text":"Hai áo cả phí ship là bao nhiêu em?"},{"role":"shop","text":"Dạ, 2 áo của chị có giá 998.000đ, được ưu đãi 49.900đ và phí ship 30.000đ, tổng cộng thanh toán là 978.100đ chị nhé."},{"role":"customer","text":"Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L."},{"role":"shop","text":"Dạ vâng chị, em giữ nguyên 2 áo size L cho chị nhé ạ."}]

Chị cho em [NAME]

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 46. stateful-private-checkout (stateful)

Khách: [PRIVATE_CHECKOUT_INPUT_REDACTED]

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Đổi áo sang L cho chị, lấy hai chiếc nhé."},{"role":"shop","text":"Dạ em đã đổi sang 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ."},{"role":"customer","text":"Hai áo cả phí ship là bao nhiêu em?"},{"role":"shop","text":"Dạ, 2 áo của chị có giá 998.000đ, được ưu đãi 49.900đ và phí ship 30.000đ, tổng cộng thanh toán là 978.100đ chị nhé."},{"role":"customer","text":"Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L."},{"role":"shop","text":"Dạ vâng chị, em giữ nguyên 2 áo size L cho chị nhé ạ."},{"role":"customer","text":"Chị đặt hai áo này nhé, lên đơn cho chị."},{"role":"shop","text":"Chị cho em [NAME]"}]

2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L: 998.000đ
Tạm tính: 998.000đ
Ưu đãi: -49.900đ
Phí ship: 30.000đ
Tổng: 978.100đ
Set váy Thạch Thảo: hàng đặt trước
Người nhận: Khách thử nghiệm - [PHONE]
[ADDRESS]
Thanh toán: COD
Dự kiến nhận hàng: 8-14 ngày.
Chị xác nhận chốt đơn nhé.

Ảnh: 0. Owner generations: 0; verifier: 0.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 47. stateful-confirm (stateful)

Khách: Chốt đơn cho chị nhé.

Terminal: HANDOFF / PURCHASE_CONFIRMED. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Hai áo cả phí ship là bao nhiêu em?"},{"role":"shop","text":"Dạ, 2 áo của chị có giá 998.000đ, được ưu đãi 49.900đ và phí ship 30.000đ, tổng cộng thanh toán là 978.100đ chị nhé."},{"role":"customer","text":"Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L."},{"role":"shop","text":"Dạ vâng chị, em giữ nguyên 2 áo size L cho chị nhé ạ."},{"role":"customer","text":"Chị đặt hai áo này nhé, lên đơn cho chị."},{"role":"shop","text":"Chị cho em [NAME]"},{"role":"customer","text":"[PRIVATE_CHECKOUT_INPUT_REDACTED]"},{"role":"shop","text":"2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L: 998.000đ\nTạm tính: 998.000đ\nƯu đãi: -49.900đ\nPhí ship: 30.000đ\nTổng: 978.100đ\nSet váy Thạch Thảo: hàng đặt trước\nNgười nhận: Khách thử nghiệm - [PHONE]\n[ADDRESS]\nThanh toán: COD\nDự kiến nhận hàng: 8-14 ngày.\nChị xác nhận chốt đơn nhé."}]

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 48. stateful-human-request (stateful)

Khách: Cho chị gặp nhân viên shop nhé.

Terminal: HANDOFF / CUSTOMER_REQUESTED_HUMAN. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 49. negotiation-cart-setup (negotiation)

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Em đã thêm áo Thạch Thảo màu be, size M (hàng đặt trước) vào giỏ hàng cho chị rồi ạ. Tổng giỏ hàng hiện tại là 529.000đ (đã gồm phí vận chuyển). Chị cần xem thêm gì hay chốt đơn thì báo em nhé ạ!

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 50. negotiation-price-objection (negotiation)

Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Em đã thêm áo Thạch Thảo màu be, size M (hàng đặt trước) vào giỏ hàng cho chị rồi ạ. Tổng giỏ hàng hiện tại là 529.000đ (đã gồm phí vận chuyển). Chị cần xem thêm gì hay chốt đơn thì báo em nhé ạ!"}]

Dạ áo này hiện đang có mức ưu đãi 30.000đ, tổng đơn của chị là 499.000đ (đã gồm phí vận chuyển) ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 51. negotiation-total-control (negotiation)

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Em đã thêm áo Thạch Thảo màu be, size M (hàng đặt trước) vào giỏ hàng cho chị rồi ạ. Tổng giỏ hàng hiện tại là 529.000đ (đã gồm phí vận chuyển). Chị cần xem thêm gì hay chốt đơn thì báo em nhé ạ!"},{"role":"customer","text":"Bớt cho chị chút được không?"},{"role":"shop","text":"Dạ áo này hiện đang có mức ưu đãi 30.000đ, tổng đơn của chị là 499.000đ (đã gồm phí vận chuyển) ạ."}]

Dạ áo có giá 499.000đ, được ưu đãi 30.000đ và phí vận chuyển 30.000đ nên tổng cộng là 499.000đ chị ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}
