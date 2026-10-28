# Full Phase B Compact V2 — actual customer outcomes

Display export trims end-of-line spaces only; exact final strings and hashes remain in ACTUAL_TERMINALS.json and raw attempts.

N1, 51 existing native outcomes. B1 is eligibility only; other cohorts use isolated persisted ingress/capture, never live send. HANDOFF is silent. NO_SEND may include a separately code-owned customer question; read actualMessages. Fixture private values remain redacted.

## 1. opening-ad (opening-quotes)

Khách: Bộ này bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ ạ. Thiết kế gồm áo tơ Hàn thêu họa tiết nổi form nhẹ, thoáng mát kết hợp chân váy ren tơ mềm mại, có độ rũ tự nhiên. Mẫu này hiện có sẵn các size S, M, L, XL chị nhé!

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 2. opening-ad-repeat (opening-quotes)

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Bộ này bao nhiêu em?"},{"role":"shop","text":"Set váy Thạch Thảo có giá 799.000đ ạ. Thiết kế gồm áo tơ Hàn thêu họa tiết nổi form nhẹ, thoáng mát kết hợp chân váy ren tơ mềm mại, có độ rũ tự nhiên. Mẫu này hiện có sẵn các size S, M, L, XL chị nhé!"}]

Dạ, set váy Thạch Thảo có giá 799.000đ chị nhé!

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 3. opening-organic (opening-quotes)

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, set váy Thạch Thảo có giá 799.000đ ạ.

Thiết kế gồm áo tơ Hàn thêu họa tiết nổi form nhẹ và chân váy ren tơ Hàn mềm có độ bay rũ tự nhiên. Mẫu này hiện có sẵn các size S, M, L, XL chị nhé!

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 4. opening-unresolved (opening-quotes)

Khách: Mẫu này giá sao em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, chị gửi giúp em hình ảnh hoặc tên mẫu chị đang quan tâm để em báo giá chính xác cho mình nhé ạ!

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 5. opening-multipart (opening-quotes)

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, set váy Thạch Thảo giá 799.000đ ạ (gồm áo tơ Hàn thêu nổi form nhẹ và chân váy ren tơ Hàn mềm rũ tự nhiên, đủ size S, M, L, XL).

Chị hoàn toàn mua áo riêng được nha chị, áo lẻ giá 499.000đ ạ! Em gửi chị xem mẫu nhé.

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

Ảnh: 0. Owner generations: 1; verifier: 0.

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

Dạ, em gửi chị ảnh cận cảnh họa tiết thêu ở áo nhé ạ. Với chiều cao 1m58 và nặng 52kg, chị mặc size M là vừa đẹp ạ.

[CODE_IMAGE]

Ảnh: 1. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 12. media-decision:ask (media-followup)

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Chất ren tơ Hàn của chân váy là loại mềm mại, có độ rũ tự nhiên và form nhẹ nhàng chứ không bị cứng hay dày nặng, tạo cảm giác bay bổng và thanh nhã. Chị diện bộ này đi ăn cưới buổi trưa rất lịch sự, sang trọng và không bị rườm rà đâu ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 13. b1-partial-source (missing-pos)

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Terminal: HANDOFF / PRICE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 14. b1-partial-source-v2 (missing-pos)

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Terminal: HANDOFF / PRICE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 2; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 15. b1-partial-source-v3 (missing-pos)

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Terminal: HANDOFF / PRICE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 16. b1-changed-occasion (b1-first)

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị định lấy set Thạch Thảo mặc đi đám cưới."},{"role":"shop","text":"Đi đám cưới mặc bộ này đẹp chị ạ."}]

Set Thạch Thảo dùng chất tơ Hàn và ren mềm, có độ bay tự nhiên nên khi ngồi ô tô 3 tiếng có thể sẽ bị hằn nếp gấp nhẹ ở tà váy ạ.

Các mẫu thiết kế dự tiệc hiện tại của shop đều ưu tiên chất liệu tơ và ren mang lại cảm giác mềm mại, bay bổng nên không thuộc dòng vải chống nhăn chuyên dụng. Nếu chị muốn tìm mẫu giữ form tốt hơn khi di chuyển, Váy Diệp An với thiết kế 2 lớp đứng form gọn gàng sẽ là lựa chọn phù hợp để mình cân nhắc ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 17. b1-current-policy (b1-first)

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày."}]

Dạ, mình nhận hàng 10 hôm là vẫn kịp đổi chị nhé, quy định đổi hàng của shop là trong vòng 15 ngày kể từ khi nhận ạ. Phí đổi (phí vận chuyển 2 chiều) là 30.000đ và shop hỗ trợ mình đổi màu nha chị.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 18. b1-price (b1-first)

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, set váy Thạch Thảo có giá 799.000đ ạ. Ngoài ra shop có bán lẻ từng món để chị dễ lựa chọn:

- Cả bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ

Áo làm từ chất tơ Hàn thêu họa tiết nổi kết hợp chân váy ren tơ Hàn mềm mại, form nhẹ, thoáng mát, đủ size S, M, L, XL chị nhé!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 19. b1-component-stock (b1-first)

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, áo Thạch Thảo size M hiện vẫn còn hàng chị nhé. Áo bán lẻ có giá 499.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 20. b1-search-read (b1-first)

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Áo dài SD375 hiện có sẵn các size S, M, L với hai lựa chọn ạ:
- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Ảnh: 0. Owner generations: 3; verifier: 1.

## 21. b1-buying-concern (b1-first)

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Chân váy dùng ren tơ Hàn mềm với độ rũ tự nhiên kết hợp cùng áo tơ thêu form nhẹ nên mặc đi tiệc ban ngày rất thanh thoát và nhã nhặn, không bị rườm rà đâu chị nhé. Set váy có giá 799.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 22. b1-policy-used (b1-first)

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ chính sách đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem mác, chưa qua sử dụng và chưa giặt (chỉ hỗ trợ ướm thử bên ngoài). Do mình đã mặc đi làm một buổi rồi nên sản phẩm không đủ điều kiện để đổi sang màu khác ạ.

Nếu đổi hàng hợp lệ thì tổng phí vận chuyển 2 chiều là 30.000đ, nhưng trường hợp của chị thì hiện không hỗ trợ đổi được, mong chị thông cảm giúp em nhé ạ!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 23. b1-changed-occasion-v2 (b1-rest)

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem set Thạch Thảo để đi tiệc trưa."},{"role":"shop","text":"Tiệc trưa mặc bộ này xinh chị ạ."}]

Áo làm từ tơ Hàn thêu có độ thoáng và form nhẹ, kết hợp chân váy ren tơ Hàn mềm rũ tự nhiên. Chất vải và phom dáng nhẹ nhàng giúp mặc thoáng người, nhưng đứng ngoài trời lâu chị vẫn có thể cảm thấy hơi ấm ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 24. b1-current-policy-v2 (b1-rest)

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước chị nhớ phí đổi là 25 nghìn."}]

Dạ, mình nhận đồ 12 hôm trước và sản phẩm chưa dùng nên vẫn kịp đổi size trong thời hạn 15 ngày chị nhé. Phí ship đổi hàng 2 chiều là 30.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 25. b1-price-v2 (b1-rest)

Khách: Cho chị xin giá cả bộ với em.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem bộ Thạch Thảo bên mình."}]

Set váy Thạch Thảo có giá 799.000đ chị ạ. Set gồm áo tơ Hàn thêu nổi và chân váy ren mềm form nhẹ, shop sẵn các size từ S đến XL chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 26. b1-component-stock-v2 (b1-rest)

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị chỉ muốn lấy chân váy của set Thạch Thảo."}]

Dạ chân váy size M set Thạch Thảo bên em còn hàng chị nhé, mua riêng giá 449.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 27. b1-search-read-v2 (b1-rest)

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, shop có chị nhé! Set váy Khánh Trang chất liệu thô boi phối ren, form suông nhẹ có giá 999.000đ, hiện sẵn size S và L ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

## 28. b1-buying-concern-v2 (b1-rest)

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, set Thạch Thảo mang lại cảm giác nhẹ nhàng và rất hợp đi ăn cưới ban ngày. Dù có áo thêu nổi và chân váy ren, bộ này dùng chất tơ ren mềm với phom nhẹ và độ rũ tự nhiên, nên lên người tạo sự thanh thoát, tinh tế chứ không bị phồng cứng hay điệu đà quá mức.

Chị hay mặc đồ trơn hoàn toàn có thể chọn set này vì nét nữ tính ở đây rất nhã nhặn, vừa đủ sang trọng cho không gian tiệc ngày mà không làm chị thấy lạ lẫm hay quá sến ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 29. b1-policy-used-v2 (b1-rest)

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, quy định đổi hàng của shop yêu cầu sản phẩm chưa qua sử dụng và chỉ ướm ở bên ngoài chứ không mặc trực tiếp vào người. Do mình đã mặc thử, shop rất tiếc chưa thể hỗ trợ đổi size cho sản phẩm này, mong chị thông cảm giúp em nhé ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 30. b1-changed-occasion-v3 (b1-rest)

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị định lấy cả bộ Thạch Thảo đi tiệc tối."},{"role":"shop","text":"Đi tiệc tối mặc cả bộ đẹp chị ạ."}]

Chị lấy áo lẻ sẽ gọn gàng và lịch sự hơn cho buổi gặp khách hàng buổi sáng. Mẫu áo thêu form nhẹ, tinh tế khi phối cùng quần âu hoặc chân váy gọn gàng sẽ tạo nét chuyên nghiệp; đến tối đi tiệc chị có thể linh hoạt phối lại là rất hợp.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 31. b1-current-policy-v3 (b1-rest)

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày."}]

Dạ, hiện thời gian hỗ trợ đổi hàng bên em là trong vòng 15 ngày kể từ lúc nhận hàng nên chị nhận hàng được 9 ngày vẫn đổi size được chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 32. b1-price-v3 (b1-rest)

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, nguyên set váy Thạch Thảo có giá 799.000đ ạ. Set gồm áo tơ Hàn thêu nổi phom nhẹ và chân váy ren tơ Hàn mềm rũ tự nhiên, hiện shop sẵn các size S, M, L, XL chị nha.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 33. b1-component-stock-v3 (b1-rest)

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ áo Thạch Thảo có bán riêng chị nhé. Áo chất tơ Hàn thêu họa tiết nổi, form nhẹ mềm mại và bay bổng. Áo lẻ size M hiện còn hàng, giá 499.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 34. b1-search-read-v3 (b1-rest)

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, mẫu Set quần Xuân Thảo bên em vẫn còn hàng chị nhé. Em gửi chị thông tin chi tiết:

- Cả bộ: 699.000đ (sẵn size S, M, L)
- Áo lẻ: 429.000đ (sẵn size S, M, L, XL)
- Quần lẻ: 429.000đ (sẵn size S, M, L)

Sản phẩm làm từ chất liệu vải thô đục lỗ in họa tiết hoa mang lại cảm giác thoáng mát, nhẹ và đứng form đẹp. Áo thiết kế 1 lớp form gọn gàng kết hợp cùng quần 2 lớp cạp chun thoải mái, dễ mặc ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

## 35. b1-buying-concern-v3 (b1-rest)

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị có sẵn chân váy đen dáng suông rồi."}]

Với ngân sách 850 nghìn, cả hai phương án đều vừa vặn với chị ạ:

- **Mua riêng áo (499 nghìn):** Rất hợp để chị phối linh hoạt cùng chân váy đen dáng suông sẵn có, tiện mặc đi làm và dễ tái sử dụng nhiều lần với các trang phục khác.
- **Lấy cả bộ (799 nghìn):** Vẫn nằm trong khoản ngân sách của chị, mang lại vẻ ngoài đồng điệu, thướt tha với chân váy ren cho các dịp đi chơi, sự kiện.

Nếu chị thiên về sự tiện dụng để phối đồ đi làm thường ngày, em gợi ý mình lấy riêng áo Thạch Thảo; còn thích diện nguyên set ren điệu đà thì mình lấy cả bộ luôn chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 36. b1-policy-used-v3 (b1-rest)

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, quy định đổi hàng bên em áp dụng cho sản phẩm còn nguyên tem và chưa qua giặt ạ, nên rất tiếc shop chưa hỗ trợ đổi mẫu trong trường hợp này được chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 37. sales-discovery-advice:need (journey-openings)

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, em gửi chị 2 mẫu set quần áo dưới 1 triệu, thiết kế cạp chun co giãn thoải mái không lo bó bụng rất hợp mặc đi làm hay dạo phố ạ:

1. **Set quần Uyển Hoa (SQ748)** – **799.000đ**
- **Chất liệu & form dáng:** Vải thô đũi cao cấp mềm mịn, thoáng mát; quần short lưng chun suông nhẹ thoải mái, phối họa tiết thổ cẩm ngọt ngào, thanh lịch.
- **Tình trạng:** Hàng có sẵn size S và L.

2. **Set quần SQ629** – **749.000đ**
- **Chất liệu & form dáng:** Ren dệt cotton phối thô boy mềm mại; áo tay cánh dơi dáng rộng đi kèm quần short cạp chun co giãn thoải mái.
- **Tình trạng:** Hàng đặt trước.

Chị ưng mẫu nào hơn ạ?

Ảnh: 0. Owner generations: 3; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 38. sales-product-gallery:overview (journey-openings)

Khách: Cho chị xem ảnh set Thạch Thảo màu be nhé.

Terminal: HANDOFF / DEPENDENCY_FAILURE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 39. sales-size-advice:height-weight (journey-openings)

Khách: Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ với chiều cao 1m58, nặng 52kg và thích mặc rộng thoải mái, bộ Thạch Thảo chị mặc size M là vừa vặn ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 40. sales-southern-delivery:deadline (journey-openings)

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ thời gian vận chuyển về Cần Thơ dự kiến khoảng 4–8 ngày nên shop không kịp giao vào sáng mai cho chị được ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 41. stateful-open (stateful)

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 42. stateful-variant-quantity (stateful)

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé."}]

Em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 43. stateful-quote (stateful)

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé."},{"role":"customer","text":"Đổi áo sang L cho chị, lấy hai chiếc nhé."},{"role":"shop","text":"Em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ."}]

Dạ, tổng thanh toán cho 2 áo Thạch Thảo màu be size L (đã gồm phí ship 30.000đ và ưu đãi) là 978.100đ chị nhé (tiền hàng 998.000đ, giảm 49.900đ ạ).

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 44. stateful-correction (stateful)

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé."},{"role":"customer","text":"Đổi áo sang L cho chị, lấy hai chiếc nhé."},{"role":"shop","text":"Em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ."},{"role":"customer","text":"Hai áo cả phí ship là bao nhiêu em?"},{"role":"shop","text":"Dạ, tổng thanh toán cho 2 áo Thạch Thảo màu be size L (đã gồm phí ship 30.000đ và ưu đãi) là 978.100đ chị nhé (tiền hàng 998.000đ, giảm 49.900đ ạ)."}]

Dạ vâng ạ, em giữ nguyên áo size L cho chị nhé!

Ảnh: 0. Owner generations: 3; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 45. stateful-request-checkout (stateful)

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé."},{"role":"customer","text":"Đổi áo sang L cho chị, lấy hai chiếc nhé."},{"role":"shop","text":"Em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ."},{"role":"customer","text":"Hai áo cả phí ship là bao nhiêu em?"},{"role":"shop","text":"Dạ, tổng thanh toán cho 2 áo Thạch Thảo màu be size L (đã gồm phí ship 30.000đ và ưu đãi) là 978.100đ chị nhé (tiền hàng 998.000đ, giảm 49.900đ ạ)."},{"role":"customer","text":"Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L."},{"role":"shop","text":"Dạ vâng ạ, em giữ nguyên áo size L cho chị nhé!"}]

Chị cho em [NAME]

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 46. stateful-private-checkout (stateful)

Khách: [PRIVATE_CHECKOUT_INPUT_REDACTED]

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Đổi áo sang L cho chị, lấy hai chiếc nhé."},{"role":"shop","text":"Em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ."},{"role":"customer","text":"Hai áo cả phí ship là bao nhiêu em?"},{"role":"shop","text":"Dạ, tổng thanh toán cho 2 áo Thạch Thảo màu be size L (đã gồm phí ship 30.000đ và ưu đãi) là 978.100đ chị nhé (tiền hàng 998.000đ, giảm 49.900đ ạ)."},{"role":"customer","text":"Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L."},{"role":"shop","text":"Dạ vâng ạ, em giữ nguyên áo size L cho chị nhé!"},{"role":"customer","text":"Chị đặt hai áo này nhé, lên đơn cho chị."},{"role":"shop","text":"Chị cho em [NAME]"}]

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

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Hai áo cả phí ship là bao nhiêu em?"},{"role":"shop","text":"Dạ, tổng thanh toán cho 2 áo Thạch Thảo màu be size L (đã gồm phí ship 30.000đ và ưu đãi) là 978.100đ chị nhé (tiền hàng 998.000đ, giảm 49.900đ ạ)."},{"role":"customer","text":"Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L."},{"role":"shop","text":"Dạ vâng ạ, em giữ nguyên áo size L cho chị nhé!"},{"role":"customer","text":"Chị đặt hai áo này nhé, lên đơn cho chị."},{"role":"shop","text":"Chị cho em [NAME]"},{"role":"customer","text":"[PRIVATE_CHECKOUT_INPUT_REDACTED]"},{"role":"shop","text":"2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L: 998.000đ\nTạm tính: 998.000đ\nƯu đãi: -49.900đ\nPhí ship: 30.000đ\nTổng: 978.100đ\nSet váy Thạch Thảo: hàng đặt trước\nNgười nhận: Khách thử nghiệm - [PHONE]\n[ADDRESS]\nThanh toán: COD\nDự kiến nhận hàng: 8-14 ngày.\nChị xác nhận chốt đơn nhé."}]

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

Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 50. negotiation-price-objection (negotiation)

Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé."}]

Dạ, đơn của mình hiện đã được áp dụng mức ưu đãi sẵn có trên hệ thống rồi ạ, chị ưng thì em lên đơn gửi chị nha.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 51. negotiation-total-control (negotiation)

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Diễn biến trước đó từ capture đã ẩn dữ liệu riêng (không phải bản chép exact model history): [{"role":"customer","text":"Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98."},{"role":"shop","text":"Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé."},{"role":"customer","text":"Bớt cho chị chút được không?"},{"role":"shop","text":"Dạ, đơn của mình hiện đã được áp dụng mức ưu đãi sẵn có trên hệ thống rồi ạ, chị ưng thì em lên đơn gửi chị nha."}]

Dạ, áo lẻ giá 499.000đ, phí ship 30.000đ và được ưu đãi 30.000đ nên tổng thanh toán gồm cả ship của mình là 499.000đ ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}
