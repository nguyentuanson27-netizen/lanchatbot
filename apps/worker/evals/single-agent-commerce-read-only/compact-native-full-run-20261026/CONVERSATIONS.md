# Full Phase B Compact V2 — actual customer outcomes

N1, 51 existing native outcomes. B1 is eligibility only; other cohorts use isolated persisted ingress/capture, never live send. HANDOFF is silent. NO_SEND may include a separately code-owned customer question; read actualMessages. Fixture private values remain redacted.

## 1. opening-ad (opening-quotes)

Khách: Bộ này bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ, gồm áo tơ Hàn thêu nổi phom nhẹ và chân váy ren tơ Hàn mềm mại, có độ bay tự nhiên ạ. 

Mẫu này có sẵn các size S, M, L, XL, chị lấy size nào báo em nhé ạ!

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 2. opening-ad-repeat (opening-quotes)

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, cả bộ Set váy Thạch Thảo có giá 799.000đ chị nhé ạ!

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 3. opening-organic (opening-quotes)

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ chị nhé. Set gồm áo tơ Hàn thêu họa tiết nổi form nhẹ và chân váy ren mềm có độ rũ tự nhiên, hiện sẵn các size S, M, L, XL ạ.

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 4. opening-unresolved (opening-quotes)

Khách: Mẫu này giá sao em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ chị gửi giúp em hình ảnh hoặc tên mẫu chị đang quan tâm ở quảng cáo để em kiểm tra và báo giá chính xác cho mình nhé ạ!

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 5. opening-multipart (opening-quotes)

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, set váy Thạch Thảo giá 799.000đ và chị hoàn toàn có thể mua áo riêng với giá 499.000đ ạ. 

Áo làm từ chất liệu tơ Hàn thêu với họa tiết thêu nổi, form nhẹ, vải mềm thoáng và có độ bay tự nhiên. Cả áo lẻ và set váy đều có đủ các size S, M, L, XL chị nhé ạ.

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 6. media-overview-next:ask (media-followup)

Khách: Em có ảnh khách mặc bộ Thạch Thảo không?

Terminal: HANDOFF / DEPENDENCY_FAILURE. Actual isolated capture.

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

Terminal: HANDOFF / DEPENDENCY_FAILURE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 11. media-and-size:ask (media-followup)

Khách: Cho chị xem gần phần thêu áo Thạch Thảo nhé. Chị cao 1m58, nặng 52kg thì lấy size nào?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, em gửi chị hình ảnh chi tiết phần thêu trên áo ạ. Với chiều cao 1m58 và cân nặng 52kg, chị lấy size M giúp em nhé ạ!

[CODE_IMAGE]

Ảnh: 1. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 12. media-decision:ask (media-followup)

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Terminal: HANDOFF / DEPENDENCY_FAILURE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

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

Ảnh: 0. Owner generations: 1; verifier: 0.

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

Set Thạch Thảo dùng chất tơ và ren mềm nên khi đi ô tô gần 3 tiếng có thể sẽ để lại nếp gấp nhẹ trên vải. 

Nếu chị muốn tìm mẫu thoải mái hơn khi di chuyển xa và giữ phom gọn gàng, em đổi sang váy Diệp An nhé; mẫu này thiết kế 2 lớp đứng phom, hạn chế nhăn khi ngồi xe lâu mà mặc lên vẫn rất thanh lịch và sang trọng ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

## 17. b1-current-policy (b1-first)

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ đơn của mình nhận 10 hôm thì vẫn còn trong thời hạn đổi hàng 15 ngày của shop nên mình đổi màu được chị nhé ạ. Phí vận chuyển 2 chiều khi đổi là 30.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 18. b1-price (b1-first)

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Set váy Thạch Thảo có giá 799.000đ chị nhé. Mẫu gồm áo tơ Hàn thêu nổi phom nhẹ kết hợp chân váy ren mềm có độ rũ tự nhiên, hiện shop sẵn các size S, M, L, XL ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 19. b1-component-stock (b1-first)

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Áo lẻ bộ Thạch Thảo size M còn chị ạ, giá 499.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 20. b1-search-read (b1-first)

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, mẫu áo dài SD375 hiện có hai lựa chọn ạ:
- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Sản phẩm hiện có sẵn các size S, M, L chị nhé.

Ảnh: 0. Owner generations: 3; verifier: 1.

## 21. b1-buying-concern (b1-first)

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ bộ này mặc đi tiệc ban ngày rất sang và nhã nhặn, chị yên tâm không bị rườm rà đâu ạ. Chất vải tơ Hàn và chân váy ren mềm, form nhẹ nhàng có độ bay và rũ tự nhiên nên lên dáng rất thanh thoát.

Nguyên set váy Thạch Thảo giá 799.000đ, hoàn toàn vừa vặn trong ngân sách 900.000đ của mình ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 22. b1-policy-used (b1-first)

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, sản phẩm đã mặc đi làm rồi thì không đủ điều kiện đổi hàng ạ, vì quy định đổi bên em yêu cầu sản phẩm phải còn nguyên vẹn, chưa qua sử dụng và chưa mặc ra ngoài. 

Nếu các trường hợp đổi hàng hợp lệ khác, tổng phí ship 2 chiều là 30.000đ chị nha.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 23. b1-changed-occasion-v2 (b1-rest)

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Áo chất tơ Hàn mềm, thoáng với độ bay tự nhiên kết hợp chân váy ren tơ Hàn mềm, form nhẹ. Nếu ngại nóng khi đứng ngoài trời lâu, chị có thể chọn mặc riêng chiếc áo tơ Hàn thoáng nhẹ này để thoải mái hơn ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 24. b1-current-policy-v2 (b1-rest)

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ đơn nhận 12 hôm thì mình vẫn kịp đổi size chị nhé, thời hạn hỗ trợ đổi là trong 15 ngày ạ. Phí đổi hàng 2 chiều là 30.000đ chị nha.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 25. b1-price-v2 (b1-rest)

Khách: Cho chị xin giá cả bộ với em.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Set váy Thạch Thảo có giá 799.000đ ạ. Set gồm áo tơ Hàn thêu họa tiết nổi form nhẹ và chân váy ren tơ Hàn mềm, thoáng, có độ bay tự nhiên; hiện đủ size S, M, L, XL chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 26. b1-component-stock-v2 (b1-rest)

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Chân váy size M của set Thạch Thảo hiện còn hàng chị nhé, giá mua lẻ chân váy là 449.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 27. b1-search-read-v2 (b1-rest)

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, shop có chị nhé. Set váy Khánh Trang thiết kế chất liệu thô boi phối ren, áo form suông nhẹ và chân váy cạp chun có giá 999.000đ, sẵn size S, M, L. 

Nếu chị muốn mua rời thì áo lẻ có giá 499.000đ (sẵn size S, M, L) và chân váy lẻ có giá 499.000đ (sẵn size S, M, L, XL) ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

## 28. b1-buying-concern-v2 (b1-rest)

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ đi ăn cưới ban ngày thì diện set này rất hợp lý đó chị ạ. Set mang nét mềm mại, nữ tính nhờ chất liệu tơ và ren rũ tự nhiên, phom dáng nhẹ nhàng nên lên người trông thanh thoát, nhã nhặn chứ không bị cứng nhắc hay quá cầu kỳ đâu ạ. 

Tiệc cưới là dịp rất thích hợp để mình diện những thiết kế điệu đà hơn ngày thường một chút mà không sợ bị quá lố. Chị cứ yên tâm lấy set này mặc đi tiệc vừa xinh xắn lại rất lịch sự ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 29. b1-policy-used-v2 (b1-rest)

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, quy định đổi size của shop yêu cầu sản phẩm phải hoàn toàn chưa qua sử dụng (chỉ ướm bên ngoài, không mặc vào người), còn nguyên tem và chưa giặt ạ. Do chị đã mặc thử vào người, trường hợp này không đáp ứng điều kiện đổi hàng, mong chị thông cảm giúp em nhé ạ!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 30. b1-changed-occasion-v3 (b1-rest)

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Đi gặp khách hàng buổi sáng mà chị muốn nhìn gọn gàng, mình lấy áo lẻ (499.000đ) phối cùng quần âu hoặc chân váy cơ bản sẽ đứng dáng và chuyên nghiệp hơn chị ạ. Set váy có chân váy ren tơ độ rũ bay bổng sẽ hợp với không gian tiệc tối hơn.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 31. b1-current-policy-v3 (b1-rest)

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, hiện tại bên em áp dụng thời gian đổi hàng trong vòng 15 ngày kể từ ngày nhận ạ. Trường hợp của chị nhận hàng được 9 ngày và sản phẩm mới chỉ mở ra xem, chưa qua sử dụng thì vẫn đổi size được bình thường chị nhé. 

Chị muốn đổi sang size nào để em kiểm tra và hỗ trợ mình ạ?

Ảnh: 0. Owner generations: 2; verifier: 1.

## 32. b1-price-v3 (b1-rest)

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, nguyên set váy Thạch Thảo có giá 799.000đ chị nhé. 

Set gồm áo tơ Hàn thêu nổi và chân váy ren mềm, form nhẹ, có độ bay rũ tự nhiên ạ. Sản phẩm hiện có đủ size S, M, L, XL.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 33. b1-component-stock-v3 (b1-rest)

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, áo Thạch Thảo có bán riêng chị nhé. Áo lẻ Thạch Thảo size M hiện còn hàng, giá 499.000đ ạ (chất liệu tơ Hàn thêu, form nhẹ thoáng mát).

Ảnh: 0. Owner generations: 2; verifier: 1.

## 34. b1-search-read-v3 (b1-rest)

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, mẫu Set quần Xuân Thảo bên em vẫn còn hàng chị nha. Set được thiết kế với chất liệu vải thô đục lỗ in họa tiết hoa phối dây ren tinh tế, mang lại cảm giác thoáng mát, nhẹ và đứng form đẹp.

Giá và size sẵn có của mẫu này ạ:
- Set quần: 699.000đ (sẵn size S, M, L)
- Áo lẻ: 429.000đ (sẵn size S, M, L, XL)
- Quần lẻ: 429.000đ (sẵn size S, M, L)

Chị muốn lấy nguyên set hay cần em tư vấn size thế nào cứ nhắn em nhé ạ!

Ảnh: 0. Owner generations: 3; verifier: 1.

## 35. b1-buying-concern-v3 (b1-rest)

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Chị mua riêng áo Thạch Thảo (499.000đ) là hợp lý nhất ạ. Áo tơ thêu nổi form nhẹ kết hợp cùng chân váy đen sẵn có vừa gọn gàng, thanh lịch, vừa giúp chị dễ dàng phối đồ mặc lại nhiều lần. 

Ngân sách 850.000đ của chị cũng đủ để lấy cả bộ (799.000đ) nếu chị thích diện nguyên set ren tơ thướt tha, đồng bộ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 36. b1-policy-used-v3 (b1-rest)

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, shop có hỗ trợ đổi sang mẫu khác trong vòng 15 ngày kể từ khi nhận hàng ạ. Tuy nhiên, quy định đổi hàng yêu cầu sản phẩm phải còn nguyên tem và chưa qua giặt. Do sản phẩm của chị đã cắt tem và giặt qua rồi, tiếc là shop không thể hỗ trợ đổi được, mong chị thông cảm giúp em nhé!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 37. sales-discovery-advice:need (journey-openings)

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, em gửi chị set quần Uyển Hoa (mã SQ748) có giá 799.000đ, vừa vặn ngân sách dưới 1 triệu của mình ạ. Quần thiết kế lưng chun thoải mái, không lo bị bó bụng, chất thô đũi nhẹ nhàng và thanh lịch rất hợp mặc đi làm. 

Mẫu này đang có sẵn size S và L, chị cho em xin chiều cao cân nặng để em tư vấn size vừa vặn nhất cho mình nhé ạ.

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

Terminal: HANDOFF / RESPONSE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 40. sales-southern-delivery:deadline (journey-openings)

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ set này ship về Cần Thơ thời gian vận chuyển dự kiến từ 4 đến 8 ngày nên không kịp giao cho chị vào sáng mai ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 41. stateful-open (stateful)

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ em đã thêm áo Thạch Thảo màu be, size M (hàng đặt trước) vào giỏ cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 42. stateful-variant-quantity (stateful)

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ em đã đổi áo sang size L và cập nhật 2 chiếc (hàng đặt trước) vào giỏ cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 43. stateful-quote (stateful)

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, 2 áo (998.000đ) cộng phí ship 30.000đ, sau ưu đãi tổng cộng là 978.100đ chị nhé ạ!

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 44. stateful-correction (stateful)

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ vâng chị, áo Thạch Thảo màu be size L mình chọn vẫn được giữ nguyên trong giỏ hàng ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 45. stateful-request-checkout (stateful)

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING. Actual isolated capture.

Chị cho em [NAME]

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 46. stateful-private-checkout (stateful)

Khách: Tên: Khách thử nghiệm
SĐT: 0900000000
Địa chỉ: Quận 1, TP Hồ Chí Minh
COD

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

Em đã thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé. Tổng giỏ hàng hiện tại của chị là 529.000đ (gồm 499.000đ tiền áo và 30.000đ phí vận chuyển).

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 50. negotiation-price-objection (negotiation)

Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ áo này giá 499.000đ là giá tốt nhất của shop rồi ạ, đơn của chị được hỗ trợ 30.000đ phí vận chuyển nên tổng thanh toán vẫn là 499.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 51. negotiation-total-control (negotiation)

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ tiền áo là 499.000đ, phí ship 30.000đ nhưng được shop hỗ trợ giảm 30.000đ nên tổng thanh toán của chị đúng 499.000đ ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}
