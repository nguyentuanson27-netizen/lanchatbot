# Full Phase B Compact V2 — actual customer outcomes

Markdown chỉ chuẩn hóa khoảng trắng cuối dòng; exact text giữ trong [ACTUAL_TERMINALS.json](ACTUAL_TERMINALS.json) và raw. Public opening-ad phục hồi bằng capture hash; public input của ca envelope lỗi lấy từ actual owner request. Không khôi phục private checkout.

N1, 51 existing native outcomes. B1 is eligibility only; other cohorts use isolated persisted ingress/capture, never live send. HANDOFF is silent. NO_SEND may include a separately code-owned customer question; read actualMessages. Fixture private values remain redacted.

## 1. opening-ad (opening-quotes)

Khách: Bộ này bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ. Chất liệu áo tơ Hàn thêu họa tiết nổi kết hợp chân váy ren tơ Hàn mềm, form nhẹ và có độ bay, rũ tự nhiên. Set hiện có sẵn các size S, M, L, XL chị nhé ạ.

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 2. opening-ad-repeat (opening-quotes)

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, set váy Thạch Thảo (gồm áo tơ Hàn thêu và chân váy ren) có giá 799.000đ ạ. Set có đủ các size S, M, L, XL, chị lấy size nào nhắn em nhé ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 3. opening-organic (opening-quotes)

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo hiện có giá 799.000đ chị nhé. Thiết kế gồm áo tơ Hàn thêu nổi và chân váy ren mềm mại, form nhẹ nhàng, có độ bay và rũ tự nhiên rất đẹp ạ. Mẫu này shop có đủ size S, M, L, XL, chị cần em tư vấn chọn size cứ nhắn em số đo nhé ạ!

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 4. opening-unresolved (opening-quotes)

Khách: Mẫu này giá sao em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ chị gửi giúp em hình ảnh hoặc tên mẫu để em kiểm tra giá và báo chính xác cho mình nhé ạ!

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 5. opening-multipart (opening-quotes)

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ chị nhé. Dạ, mình hoàn toàn có thể mua áo riêng được ạ, áo lẻ giá 499.000đ.

Thiết kế gồm áo tơ Hàn thêu họa tiết nổi form nhẹ, vải mềm thoáng cùng chân váy ren tơ Hàn mềm rũ tự nhiên. Sản phẩm có đủ các size S, M, L, XL ạ.

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

(không có tin gửi khách)

Ảnh: 0. Owner generations: 0; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 8. media-detail-next:ask (media-followup)

Khách: Bộ Thạch Thảo có ảnh khách mặc chưa em?

Terminal: HANDOFF / DEPENDENCY_FAILURE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 9. media-detail-next:continue (media-followup)

Khách: Cho chị xem cận phần thêu ở áo nhé.

Terminal: NO_SEND / HUMAN_OWNS_CONVERSATION. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 0; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 10. media-and-price:ask (media-followup)

Khách: Em gửi chị ảnh khách mặc bộ Thạch Thảo với. Lấy riêng áo thì bao nhiêu?

Terminal: HANDOFF / RESPONSE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 2; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 11. media-and-size:ask (media-followup)

Khách: Cho chị xem gần phần thêu áo Thạch Thảo nhé. Chị cao 1m58, nặng 52kg thì lấy size nào?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, em gửi chị ảnh cận cảnh phần thêu áo ạ. Với chiều cao 1m58 và nặng 52kg, chị mặc size M vừa vặn ạ.

[CODE_IMAGE]

Ảnh: 1. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 12. media-decision:ask (media-followup)

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Chất ren tơ Hàn của chân váy là loại mềm và có độ rũ tự nhiên, lên dáng rất nhẹ nhàng chứ không bị cứng hay cầu kỳ quá, mặc đi ăn cưới buổi trưa rất thanh thoát và nhã nhặn ạ.

Nếu chị vẫn ngại phần ren, mình có thể chọn mua riêng áo thêu tơ Hàn phối với chân váy trơn sẵn có để vừa giữ được nét tinh tế của áo vừa gọn gàng, tối giản hơn nhiều đó ạ.

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

Terminal: NO_SEND / ATTEMPT_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 16. b1-changed-occasion (b1-first)

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị định lấy set Thạch Thảo mặc đi đám cưới."},{"role":"shop","text":"Đi đám cưới mặc bộ này đẹp chị ạ."}]

Set Thạch Thảo dùng chất tơ và ren mềm bay nên ngồi xe 3 tiếng sẽ dễ bị hằn nếp nhăn ạ.

Chị đổi sang **set váy Khánh Trang** giúp em nhé. Bộ này dùng chất liệu thô boi phối ren, vải thô mộc có độ đanh và đứng form hơn tơ nên hạn chế nhăn tốt hơn khi ngồi lâu, mặc đi cưới vừa gọn gàng, thanh lịch lại giữ form đẹp suốt chuyến đi.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 17. b1-current-policy (b1-first)

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày."}]

Dạ đơn của mình mới nhận 10 hôm nên vẫn đổi màu được chị nha, thời hạn đổi hàng bên em là trong vòng 15 ngày kể từ lúc nhận ạ.

Phí đổi 2 chiều là 30.000đ chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 18. b1-price (b1-first)

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, set váy Thạch Thảo bên em có các mức giá:
- Cả bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ

Mẫu này hiện có sẵn các size từ S đến XL chị nha.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 19. b1-component-stock (b1-first)

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ áo Thạch Thảo size M hiện bên em còn hàng chị nhé! Áo lẻ có giá 499.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 20. b1-search-read (b1-first)

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, áo dài SD375 hiện có giá cụ thể cho từng lựa chọn như sau ạ:

- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Mẫu này đang có sẵn các size S, M, L chị nhé.

Ảnh: 0. Owner generations: 3; verifier: 1.

## 21. b1-buying-concern (b1-first)

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Chất ren tơ Hàn của chân váy mềm, form nhẹ và có độ rũ tự nhiên nên mặc đi tiệc ban ngày rất thanh thoát, nhã nhặn chứ không bị rườm rà đâu chị ạ. Cả bộ váy có giá 799.000đ, vừa vặn trong ngân sách 900 nghìn của chị.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 22. b1-policy-used (b1-first)

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên vẹn, chưa qua sử dụng và chưa mặc ra ngoài ạ. Do chị đã mặc đi làm một buổi rồi nên shop tiếc là không hỗ trợ đổi hàng được, mong chị thông cảm giúp em nhé!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 23. b1-changed-occasion-v2 (b1-rest)

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem set Thạch Thảo để đi tiệc trưa."},{"role":"shop","text":"Tiệc trưa mặc bộ này xinh chị ạ."}]

Dạ, áo làm bằng tơ Hàn mềm, thoáng cùng chân váy ren tơ form nhẹ có độ bay tự nhiên nên mặc nhẹ nhàng, không bị bí nặng người đâu ạ. Thiết kế này giúp chị thoải mái khi di chuyển hay đứng ở ngoài trời nha chị.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 24. b1-current-policy-v2 (b1-rest)

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước chị nhớ phí đổi là 25 nghìn."}]

Dạ đơn nhận 12 hôm thì mình vẫn còn trong thời hạn đổi hàng 15 ngày chị nhé ạ. Phí ship đổi 2 chiều hiện tại là 30.000đ chị nha. Chị muốn đổi sang size nào thì báo em để em kiểm tra xem còn size không ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 25. b1-price-v2 (b1-rest)

Khách: Cho chị xin giá cả bộ với em.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem bộ Thạch Thảo bên mình."}]

Dạ, set váy Thạch Thảo giá 799.000đ ạ.

Thiết kế gồm áo tơ Hàn thêu hoa nổi kết hợp chân váy ren tơ Hàn mềm mại, có độ bay rũ tự nhiên rất xinh. Shop sẵn các size S, M, L, XL, chị chọn size nào nhắn em nhé ạ!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 26. b1-component-stock-v2 (b1-rest)

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị chỉ muốn lấy chân váy của set Thạch Thảo."}]

Dạ chân váy size M set Thạch Thảo bên em còn hàng chị nhé, giá mua lẻ chân váy là 449.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 27. b1-search-read-v2 (b1-rest)

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, shop có sẵn set váy Khánh Trang chị nha. Mẫu này làm từ chất liệu thô boi phối ren mềm nhẹ, thoáng mát; áo thiết kế form suông nhẹ còn chân váy cạp chun linh hoạt, độ rũ tự nhiên.

Giá và size sẵn có:
- Cả set: 999.000đ (có sẵn size S, M, L)
- Áo lẻ: 499.000đ (có sẵn size S, M, L)
- Chân váy lẻ: 499.000đ (có sẵn size S, M, L, XL)

Ảnh: 0. Owner generations: 3; verifier: 1.

## 28. b1-buying-concern-v2 (b1-rest)

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, nếu chị quen mặc đồ trơn thì diện nguyên set Thạch Thảo đúng là sẽ thấy hơi điệu một chút do áo có họa tiết thêu nổi và chân váy ren.

Tuy nhiên, set này sử dụng chất tơ Hàn và ren mềm, form nhẹ với độ bay và rũ tự nhiên nên lên dáng rất nhã nhặn, thanh thoát chứ không bị cứng nhắc hay lồng lộn quá đà, rất vừa vặn để đi ăn cưới ban ngày.

Nếu vẫn lăn tăn việc set có nhiều chi tiết, chị có thể chọn mua lẻ áo thêu để phối cùng quần hoặc chân váy trơn sẵn có trong tủ, vừa giữ được nét tối giản quen thuộc vừa có điểm nhấn thanh lịch vừa đủ ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 29. b1-policy-used-v2 (b1-rest)

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ quy định đổi hàng bên em yêu cầu sản phẩm chưa qua sử dụng và chỉ ướm bên ngoài chứ không mặc trực tiếp vào người. Do sản phẩm đã được mặc thử nên shop chưa hỗ trợ đổi size được ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 30. b1-changed-occasion-v3 (b1-rest)

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị định lấy cả bộ Thạch Thảo đi tiệc tối."},{"role":"shop","text":"Đi tiệc tối mặc cả bộ đẹp chị ạ."}]

Chị lấy cả bộ mặc đi gặp khách hàng sẽ gọn gàng, đồng điệu và lịch sự hơn ạ. Thiết kế áo thêu đi kèm chân váy ren tạo nét nhã nhặn, chỉnh chu mà mình không cần mất công phối đồ ngoài.

Áo lẻ có giá 499.000đ, còn lấy cả bộ là 799.000đ (thêm 300.000đ) để mình có trọn bộ trang phục hài hòa nhất. Chị lấy cả bộ nhé ạ?

Ảnh: 0. Owner generations: 2; verifier: 1.

## 31. b1-current-policy-v3 (b1-rest)

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày."}]

Dạ, bên em hỗ trợ đổi hàng trong vòng 15 ngày kể từ khi nhận sản phẩm nên mình nhận hàng được 9 ngày và sản phẩm vẫn nguyên vẹn, chưa sử dụng thì mình vẫn đổi size bình thường được chị nhé!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 32. b1-price-v3 (b1-rest)

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Set váy Thạch Thảo có giá 799.000đ, gồm áo tơ Hàn thêu nổi và chân váy ren mềm với form nhẹ bay tự nhiên ạ. Set hiện có sẵn các size S, M, L, XL chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 33. b1-component-stock-v3 (b1-rest)

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, áo Thạch Thảo có bán riêng chị nhé. Áo size M hiện còn hàng, giá 499.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 34. b1-search-read-v3 (b1-rest)

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, mẫu Set quần Xuân Thảo (SQ223) hiện shop vẫn còn hàng chị nhé.

Em gửi chị thông tin chi tiết các phân loại ạ:
- Cả set: 699.000đ (còn size S, M, L)
- Áo lẻ: 429.000đ (còn size S, M, L, XL)
- Quần lẻ: 429.000đ (còn size S, M, L)

Sản phẩm được làm từ chất liệu vải thô đục lỗ in họa tiết hoa, mang lại cảm giác thoáng mát, nhẹ và đứng form đẹp. Áo thiết kế 1 lớp form gọn gàng, tôn dáng, kết hợp cùng quần 2 lớp cạp chun thoải mái và dễ mặc.

Chị muốn chọn mua cả set hay lấy món lẻ ạ?

Ảnh: 0. Owner generations: 3; verifier: 1.

## 35. b1-buying-concern-v3 (b1-rest)

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị có sẵn chân váy đen dáng suông rồi."}]

Với chân váy đen dáng suông sẵn có, chị mua riêng áo Thạch Thảo (499.000đ) phối cùng là rất hợp lý để mặc lại nhiều lần đi làm hay đi chơi; áo tơ Hàn thêu nổi kết hợp chân váy đen vừa thanh lịch vừa tối ưu được tủ đồ.

Nếu chị thích sự đồng bộ hoàn hảo, bộ Thạch Thảo có giá 799.000đ vẫn nằm trong ngân sách 850.000đ của chị.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 36. b1-policy-used-v3 (b1-rest)

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, sản phẩm đã cắt tem và giặt qua không đủ điều kiện đổi hàng ạ, vì chính sách đổi của shop yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt giủi. Em rất tiếc chưa thể hỗ trợ chị đổi sang mẫu khác được ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 37. sales-discovery-advice:need (journey-openings)

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Terminal: HANDOFF / PRICE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 3; verifier: 0.

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

Với chiều cao 1m58, cân nặng 52kg và sở thích mặc thoải mái, rộng rãi một chút, set váy Thạch Thảo chị mặc size M là vừa đẹp ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 40. sales-southern-delivery:deadline (journey-openings)

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Terminal: HANDOFF / ETA_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 41. stateful-open (stateful)

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Em đã thêm áo lẻ Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 42. stateful-variant-quantity (stateful)

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc (hàng đặt trước) trong giỏ cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 43. stateful-quote (stateful)

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, 2 áo là 998.000đ, phí ship 30.000đ và được ưu đãi 49.900đ, tổng cộng giỏ hàng của chị là 978.100đ ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 44. stateful-correction (stateful)

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ vâng chị, em ghi nhận số đo mới và giữ nguyên size L cho chị nhé ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 45. stateful-request-checkout (stateful)

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING. Actual isolated capture.

Chị cho em [NAME]

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 46. stateful-private-checkout (stateful)

Khách: [PRIVATE_CHECKOUT_INPUT_REDACTED]

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED. Actual isolated capture.

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

Em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 50. negotiation-price-objection (negotiation)

Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ áo lẻ Thạch Thảo có giá 499.000đ chị ạ. Giá này là giá niêm yết của hãng, tuy nhiên nếu chị lấy từ 2 sản phẩm trở lên thì shop sẽ có ưu đãi giảm 5% cho đơn hàng nha chị!

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 51. negotiation-total-control (negotiation)

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ áo 499.000đ, phí ship 30.000đ và đơn của chị được giảm 30.000đ nên tổng cộng cả ship là 499.000đ ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}
