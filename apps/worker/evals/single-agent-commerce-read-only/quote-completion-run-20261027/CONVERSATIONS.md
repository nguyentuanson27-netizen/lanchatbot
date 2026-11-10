# Full Phase B Compact V2 — actual customer outcomes

Bản Markdown chỉ chuẩn hóa khoảng trắng cuối dòng; exact strings giữ trong [ACTUAL_TERMINALS.json](ACTUAL_TERMINALS.json) và raw artifacts. Private checkout được masking, không phải literal customer text.

N1, 51 existing native outcomes. B1 is eligibility only; other cohorts use isolated persisted ingress/capture, never live send. HANDOFF is silent. NO_SEND may include a separately code-owned customer question; read actualMessages. Fixture private values remain redacted.

## 1. opening-ad (opening-quotes)

Khách: Bộ này bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ ạ.

Set gồm áo tơ Hàn thêu họa tiết nổi và chân váy ren mềm mại, form nhẹ nhàng có độ bay và rũ tự nhiên. Sản phẩm có đủ size S, M, L, XL chị nhé!

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 2. opening-ad-repeat (opening-quotes)

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 3. opening-organic (opening-quotes)

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ ạ.

Áo làm từ chất tơ Hàn thêu họa tiết nổi với form nhẹ, vải mềm thoáng và có độ bay tự nhiên; kết hợp cùng chân váy ren tơ Hàn mềm mại, form rũ tự nhiên. Set có sẵn các size S, M, L, XL chị nhé.

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 4. opening-unresolved (opening-quotes)

Khách: Mẫu này giá sao em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ chị gửi em xin hình ảnh hoặc tên mẫu để em báo giá chi tiết cho mình nhé ạ!

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 5. opening-multipart (opening-quotes)

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ set váy Thạch Thảo giá 799.000đ, và shop có bán áo lẻ giá 499.000đ ạ.

Áo làm từ tơ Hàn thêu họa tiết nổi form nhẹ, kết hợp chân váy ren tơ Hàn mềm có độ rũ tự nhiên. Sản phẩm có sẵn các size S, M, L, XL chị nhé!

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

Terminal: HANDOFF / RESPONSE_UNAVAILABLE. Actual isolated capture.

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

Ảnh: 0. Owner generations: 1; verifier: 0.

Handoff evidence: {"conversationOwner":"HUMAN","events":1,"tags":1}

## 11. media-and-size:ask (media-followup)

Khách: Cho chị xem gần phần thêu áo Thạch Thảo nhé. Chị cao 1m58, nặng 52kg thì lấy size nào?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ em gửi chị ảnh cận cảnh phần thêu của áo nhé ạ. Với chiều cao 1m58 và cân nặng 52kg, chị mặc size M vừa đẹp nha chị.

[CODE_IMAGE]

Ảnh: 1. Owner generations: 3; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 12. media-decision:ask (media-followup)

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Chân váy của bộ Thạch Thảo dùng chất ren tơ Hàn mềm mại với độ rũ tự nhiên, kết hợp cùng áo thêu form nhẹ nhàng nên tổng thể rất bay bổng và thanh thoát, không bị cứng hay rườm rà đâu chị ạ. Thiết kế này nhã nhặn và tinh tế, mặc đi ăn cưới buổi trưa vừa lịch sự, xinh xắn lại rất thoải mái.

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

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

Dạ, chất tơ và ren mềm của set Thạch Thảo có độ bay tự nhiên nên ngồi xe ô tô gần 3 tiếng sẽ dễ bị hằn nếp nhăn ạ.

Nếu chị muốn tìm mẫu ít nhăn hơn để di chuyển thoải mái, em gợi ý sang **set váy Thanh Vũ** nhé. Áo của mẫu này làm từ ren dệt sợi cotton kết hợp chân váy tơ crep, vừa giữ nét thanh lịch, nữ tính lại đứng form và hạn chế nhăn tốt hơn khi ngồi xe lâu ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 17. b1-current-policy (b1-first)

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày."}]

Dạ vẫn kịp chị nhé, thời hạn đổi hàng bên em là trong vòng 15 ngày kể từ khi nhận hàng ạ. Phí vận chuyển 2 chiều cho việc đổi hàng là 30.000đ chị nha.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 18. b1-price (b1-first)

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, set váy Thạch Thảo có giá 799.000đ ạ (hoặc mua lẻ áo 499.000đ, chân váy 449.000đ).

Sản phẩm gồm áo tơ Hàn thêu nổi và chân váy ren mềm mại, form nhẹ có độ bay tự nhiên, đủ size S, M, L, XL chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 19. b1-component-stock (b1-first)

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ áo lẻ bộ Thạch Thảo size M hiện còn hàng, giá 499.000đ chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 20. b1-search-read (b1-first)

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, mẫu SD375 bên em có hai lựa chọn ạ:

- Áo lẻ: 929.000đ (sẵn size S, M, L)
- Cả bộ: 1.065.000đ (sẵn size S, M, L)

Ảnh: 0. Owner generations: 3; verifier: 1.

## 21. b1-buying-concern (b1-first)

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ chân váy dùng ren tơ Hàn mềm với form nhẹ và độ rũ tự nhiên, kết hợp cùng áo tơ thêu thanh thoát nên mặc đi tiệc ban ngày rất bay bổng, nhẹ nhàng chứ không bị rườm rà hay nặng nề đâu chị ạ.

Cả bộ có giá 799.000đ, hoàn toàn vừa vặn trong ngân sách 900 nghìn của mình ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 22. b1-policy-used (b1-first)

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, quy định đổi hàng bên em áp dụng cho sản phẩm còn nguyên tem mác, chưa qua sử dụng và chỉ ướm bên ngoài. Do chị đã mặc đi làm nên sản phẩm không đủ điều kiện đổi hàng ạ.

Trường hợp đổi hàng hợp lệ, phí ship 2 chiều là 30.000đ chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 23. b1-changed-occasion-v2 (b1-rest)

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem set Thạch Thảo để đi tiệc trưa."},{"role":"shop","text":"Tiệc trưa mặc bộ này xinh chị ạ."}]

Áo tơ Hàn thêu có form nhẹ, vải mềm và thoáng, nhưng chân váy ren tơ Hàn nếu ở ngoài trời nắng lâu và dễ nóng thì có thể hơi hầm. Nếu ngại nóng, chị có thể chọn lấy áo lẻ phối với trang phục thoáng hơn để thoải mái di chuyển ngoài sân vườn ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 24. b1-current-policy-v2 (b1-rest)

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước chị nhớ phí đổi là 25 nghìn."}]

Dạ, mình đổi size vẫn còn kịp ạ, thời hạn đổi là trong vòng 15 ngày kể từ khi nhận hàng. Phí ship 2 chiều cho đơn đổi là 30.000đ chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 25. b1-price-v2 (b1-rest)

Khách: Cho chị xin giá cả bộ với em.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem bộ Thạch Thảo bên mình."}]

Set váy Thạch Thảo có giá 799.000đ chị nha. Set gồm áo tơ Hàn thêu họa tiết nổi form nhẹ và chân váy ren tơ Hàn mềm có độ rũ tự nhiên, bên em sẵn các size S, M, L, XL ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 26. b1-component-stock-v2 (b1-rest)

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị chỉ muốn lấy chân váy của set Thạch Thảo."}]

Dạ, chân váy Thạch Thảo size M nhà em còn hàng chị nhé. Giá mua riêng chân váy là 449.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 27. b1-search-read-v2 (b1-rest)

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, shop có chị nha. Set váy Khánh Trang được làm từ chất liệu thô boi phối ren mềm nhẹ, thoáng mát; áo thiết kế form suông nhẹ và chân váy cạp chun thoải mái ạ.

Giá chi tiết các phần:
- Set váy: 999.000đ (sẵn size S, M, L)
- Áo lẻ: 499.000đ (sẵn size S, M, L)
- Chân váy lẻ: 499.000đ (sẵn size S, M, L, XL)

Ảnh: 0. Owner generations: 3; verifier: 1.

## 28. b1-buying-concern-v2 (b1-rest)

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Set Thạch Thảo có áo tơ thêu nổi và chân váy ren nên tổng thể có nét mềm mại, nữ tính. Phom áo và váy khá nhẹ, có độ bay rũ tự nhiên chứ không bồng xòe cứng nhắc, mặc đi ăn cưới ban ngày rất trang nhã, lịch sự và không bị quá lộng lẫy.

Chị hoàn toàn có thể chọn nguyên bộ vì thiết kế nhã nhặn này giữ được độ thanh lịch cần thiết; hoặc nếu vẫn quen mặc đồ trơn, mình có thể lấy chân váy ren phối cùng áo trơn sẵn có trong tủ để vừa thoải mái, vừa đúng phong cách quen thuộc của mình.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 29. b1-policy-used-v2 (b1-rest)

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, quy định đổi hàng của shop yêu cầu sản phẩm chưa qua mặc thử vào người (chỉ ướm bên ngoài). Do đó trường hợp chị đã mặc thử thì shop chưa hỗ trợ đổi size được, mong chị thông cảm giúp em nhé ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 30. b1-changed-occasion-v3 (b1-rest)

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị định lấy cả bộ Thạch Thảo đi tiệc tối."},{"role":"shop","text":"Đi tiệc tối mặc cả bộ đẹp chị ạ."}]

Chị lấy cả bộ mặc đi gặp khách sẽ lịch sự và nhã nhặn hơn chị ạ. Set váy có phom nhẹ và độ rũ tự nhiên, tạo tổng thể thanh thoát, chỉn chu mà không bị rườm rà, rất phù hợp để làm việc ban ngày lẫn dự tiệc tối.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 31. b1-current-policy-v3 (b1-rest)

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày."}]

Dạ, quy định đổi hàng bên em hiện tại là trong vòng 15 ngày kể từ ngày nhận hàng ạ. Chị nhận hàng mới 9 ngày nên mình vẫn đổi size được bình thường chị nhé!

Ảnh: 0. Owner generations: 2; verifier: 1.

## 32. b1-price-v3 (b1-rest)

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, nguyên set váy Thạch Thảo có giá 799.000đ ạ. Set gồm áo tơ Hàn thêu nổi form nhẹ và chân váy ren mềm có độ bay, rũ tự nhiên, hiện shop sẵn các size S, M, L, XL chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 33. b1-component-stock-v3 (b1-rest)

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Áo Thạch Thảo có bán lẻ chị nhé. Áo lẻ size M hiện còn hàng, giá 499.000đ, chất liệu tơ Hàn thêu nổi mềm mại, form nhẹ thoải mái ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 34. b1-search-read-v3 (b1-rest)

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Set quần Xuân Thảo bên em hiện vẫn còn hàng chị nhé:
- Cả bộ: 699.000đ (sẵn size S, M, L)
- Áo lẻ: 429.000đ (sẵn size S, M, L, XL)
- Quần lẻ: 429.000đ (sẵn size S, M, L)

Mẫu này dùng chất liệu vải thô đục lỗ in họa tiết hoa thoáng mát, nhẹ và đứng form đẹp, phối ren tinh tế; áo thiết kế 1 lớp gọn gàng kết hợp quần 2 lớp cạp chun thoải mái ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

## 35. b1-buying-concern-v3 (b1-rest)

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị có sẵn chân váy đen dáng suông rồi."}]

Với ngân sách 850 nghìn, chị có thể chọn cả bộ Thạch Thảo giá 799 nghìn hoặc mua riêng áo giá 499 nghìn đều vừa vặn.

Em gợi ý mình lấy cả bộ Thạch Thảo (799 nghìn). Set gồm áo thêu và chân váy ren tơ Hàn mềm mại, mang lại vẻ ngoài đồng bộ, nữ tính rất hợp đi chơi hay dự tiệc. Khi cần, chị hoàn toàn có thể tách rời chân váy ren hoặc áo để phối linh hoạt với các trang phục khác, giúp mặc lại nhiều lần.

Còn nếu chị muốn tận dụng chân váy đen sẵn có để mặc đi làm hàng ngày, mình có thể mua riêng áo thêu (499 nghìn) phối cùng chân váy đen, vừa gọn gàng lại lịch sự ạ. Chị chọn cách nào để em chuẩn bị size cho mình nhé?

Ảnh: 0. Owner generations: 2; verifier: 1.

## 36. b1-policy-used-v3 (b1-rest)

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem và chưa giặt ạ. Do sản phẩm của chị đã cắt tem và giặt qua rồi nên shop không hỗ trợ đổi sang mẫu khác được, chị thông cảm giúp em nhé ạ.

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

Với chiều cao 1m58, nặng 52kg và thích mặc rộng thoải mái, set Thạch Thảo chị mặc size M là vừa đẹp ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 40. sales-southern-delivery:deadline (journey-openings)

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ set này ship về Cần Thơ mất khoảng 4-8 ngày nên không kịp giao cho chị vào sáng mai ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 41. stateful-open (stateful)

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Em thêm áo lẻ Thạch Thảo màu be, size M (hàng đặt trước) vào giỏ cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 42. stateful-variant-quantity (stateful)

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Em đổi áo sang size L và cập nhật 2 chiếc (hàng đặt trước) vào giỏ cho chị rồi ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 43. stateful-quote (stateful)

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, tổng tiền 2 áo của chị là 998.000đ, ưu đãi 49.900đ và phí ship 30.000đ, tổng thanh toán gồm ship là 978.100đ ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 44. stateful-correction (stateful)

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ vâng, em ghi nhận số đo mới của chị ạ; áo size L chị vẫn giữ nguyên nhé.

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

Em đã thêm áo Thạch Thảo màu be, size M (hàng đặt trước) vào giỏ hàng cho chị rồi ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 50. negotiation-price-objection (negotiation)

Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ áo tơ Hàn thêu giá 499k, hiện tại hệ thống chưa có thêm chương trình giảm giá cho món lẻ này chị nha. Chị lấy áo thì chốt đơn giúp em nhé ạ!

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 51. negotiation-total-control (negotiation)

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ áo 499k, phí ship 30k nhưng shop hỗ trợ giảm 30k ưu đãi nên tổng thanh toán của chị vẫn là 499k ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}
