# Full Phase B Compact V2 — actual customer outcomes

Bản Markdown chỉ chuẩn hóa khoảng trắng cuối dòng; exact strings giữ trong [ACTUAL_TERMINALS.json](ACTUAL_TERMINALS.json) và raw. Private checkout được masking. Public opening-multipart được phục hồi bằng terminal/capture SHA256 khớp; không viết lại reply.

N1, 51 existing native outcomes. B1 is eligibility only; other cohorts use isolated persisted ingress/capture, never live send. HANDOFF is silent. NO_SEND may include a separately code-owned customer question; read actualMessages. Fixture private values remain redacted.

## 1. opening-ad (opening-quotes)

Khách: Bộ này bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Set váy Thạch Thảo có giá 799.000đ ạ. Set gồm áo tơ Hàn thêu họa tiết nổi kết hợp chân váy ren mềm mại, form nhẹ, bay tự nhiên. Mẫu này hiện có sẵn các size S, M, L, XL chị nhé.

[CODE_IMAGE]

[CODE_IMAGE]

Ảnh: 2. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 2. opening-ad-repeat (opening-quotes)

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, cả bộ set váy Thạch Thảo có giá 799.000đ chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 3. opening-organic (opening-quotes)

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, set váy Thạch Thảo có giá 799.000đ ạ (chị có thể mua lẻ áo 499.000đ hoặc chân váy 449.000đ).

Sản phẩm gồm áo tơ Hàn thêu nổi form nhẹ, mềm và thoáng, kết hợp chân váy ren tơ Hàn mềm rũ tự nhiên. Shop có sẵn các size S, M, L, XL chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 4. opening-unresolved (opening-quotes)

Khách: Mẫu này giá sao em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ chị gửi giúp em hình ảnh hoặc tên mẫu để em báo giá chính xác cho mình nhé ạ!

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 5. opening-multipart (opening-quotes)

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, set váy Thạch Thảo có giá 799.000đ chị nhé. Shop có bán áo riêng ạ, áo lẻ giá 499.000đ. Cả set và áo lẻ hiện đều có đủ size từ S đến XL ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

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

Dạ, em gửi chị hình ảnh cận cảnh phần thêu áo ạ. Với chiều cao 1m58, nặng 52kg, chị lấy size M giúp em nhé ạ!

[CODE_IMAGE]

Ảnh: 1. Owner generations: 3; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 12. media-decision:ask (media-followup)

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, set Thạch Thảo thực tế chỉ có chân váy là chất ren tơ Hàn mềm, còn phần áo là tơ thêu nổi thanh nhã nên tổng thể không bị rườm rà hay quá nhiều ren đâu chị ạ.

Chất ren tơ Hàn có độ rũ và bay bổng tự nhiên, mặc đi ăn cưới buổi trưa rất nhẹ nhàng, sang trọng mà vẫn thoáng mát, lịch sự. Nếu chị vẫn muốn tiết chế thêm phần ren, mình có thể chọn mua lẻ áo tơ thêu kết hợp với chân váy trơn hoặc quần suông để mặc gọn gàng hơn. Chị thấy mặc cả set hay mình chọn áo lẻ phối riêng ạ?

Ảnh: 0. Owner generations: 2; verifier: 1.

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

Dạ set Thạch Thảo chất tơ và ren mềm nên khi ngồi ô tô lâu có thể dễ hằn nếp vải chị ạ.

Nếu chị ngại nhăn khi di chuyển đường dài, em đổi sang set Thanh Sương giúp chị nhé; mẫu này dùng tơ Pháp vân ngang giữ form tốt và có lót habutai bên trong, mặc đi đám cưới vừa sang trọng lại gọn gàng suốt chuyến đi.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 17. b1-current-policy (b1-first)

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày."}]

Dạ, đơn nhận 10 hôm thì vẫn trong thời hạn đổi hàng 15 ngày chị nhé. Phí đổi hàng (gồm vận chuyển 2 chiều) là 30.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 18. b1-price (b1-first)

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, set váy Thạch Thảo có giá 799.000đ ạ. Mẫu này shop có bán lẻ từng món nếu chị muốn linh hoạt:
- Áo thêu: 499.000đ
- Chân váy ren: 449.000đ

Áo chất liệu tơ Hàn thêu họa tiết nổi mềm, thoáng, kết hợp chân váy ren tơ Hàn mềm có độ rũ tự nhiên, đủ các size S, M, L, XL chị nha.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 19. b1-component-stock (b1-first)

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ áo lẻ Set váy Thạch Thảo size M hiện còn hàng chị nha, giá 499.000đ ạ. Áo chất liệu tơ Hàn thêu, họa tiết thêu nổi, phom nhẹ mềm thoáng và có độ bay tự nhiên.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 20. b1-search-read (b1-first)

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Áo dài SD375 hiện có hai lựa chọn ạ:
- Áo lẻ: 929.000đ (sẵn size S, M, L)
- Cả bộ: 1.065.000đ (sẵn size S, M, L)

Ảnh: 0. Owner generations: 3; verifier: 1.

## 21. b1-buying-concern (b1-first)

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ set này mặc đi tiệc ban ngày rất hợp và không bị rườm rà đâu chị nha. Chất ren tơ Hàn mềm, form nhẹ với độ rũ và độ bay tự nhiên kết hợp cùng áo tơ thêu tinh tế tạo nét thanh lịch, nhẹ nhàng, rất vừa vặn cho các buổi tiệc ban ngày.

Cả bộ set váy Thạch Thảo có giá 799.000đ, hoàn toàn nằm trong ngân sách 900 nghìn của chị.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 22. b1-policy-used (b1-first)

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, sản phẩm đã qua sử dụng nên shop không hỗ trợ đổi hàng ạ. Trường hợp đổi hàng hợp lệ, tổng phí vận chuyển 2 chiều là 30.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 23. b1-changed-occasion-v2 (b1-rest)

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem set Thạch Thảo để đi tiệc trưa."},{"role":"shop","text":"Tiệc trưa mặc bộ này xinh chị ạ."}]

Dạ, chất tơ Hàn và ren tơ Hàn của set này mềm, thoáng, form nhẹ và có độ bay, rũ tự nhiên nên mặc nhẹ nhàng chứ không bị dày nặng. Tuy nhiên, đứng ngoài trời lâu và dễ nóng thì khó tránh khỏi cảm giác oi bức nhất định, chị có thể kết hợp thêm ô hoặc quạt cầm tay nhỏ khi ở khu vực sân vườn để thoải mái hơn trong suốt buổi tiệc nhé ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 24. b1-current-policy-v2 (b1-rest)

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Lần trước chị nhớ phí đổi là 25 nghìn."}]

Dạ đơn nhận 12 hôm thì mình vẫn đổi size kịp chị nhé, bên em hỗ trợ đổi trong vòng 15 ngày kể từ khi nhận hàng ạ. Phí ship đổi 2 chiều là 30.000đ chị nha.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 25. b1-price-v2 (b1-rest)

Khách: Cho chị xin giá cả bộ với em.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị đang xem bộ Thạch Thảo bên mình."}]

Set váy Thạch Thảo (cả bộ) có giá 799.000đ, gồm áo tơ Hàn thêu nổi form nhẹ và chân váy ren tơ Hàn mềm rũ tự nhiên, hiện shop sẵn các size S, M, L, XL chị nha.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 26. b1-component-stock-v2 (b1-rest)

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị chỉ muốn lấy chân váy của set Thạch Thảo."}]

Dạ, chân váy Thạch Thảo size M hiện còn hàng chị nhé. Chân váy mua riêng có giá 449.000đ ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 27. b1-search-read-v2 (b1-rest)

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, shop có chị nhé! Set váy Khánh Trang làm từ chất liệu thô boi phối ren mềm nhẹ, thoáng mát với áo form suông nhẹ và chân váy cạp chun linh hoạt.

Giá các phiên bản để chị dễ lựa chọn ạ:
- Nguyên set: 999.000đ (size S, M, L)
- Áo lẻ: 499.000đ (size S, M, L)
- Chân váy lẻ: 499.000đ (size S, M, L, XL)

Ảnh: 0. Owner generations: 3; verifier: 1.

## 28. b1-buying-concern-v2 (b1-rest)

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, set Thạch Thảo có chi tiết thêu nổi và chân váy ren nên đúng là sẽ nữ tính và có điểm nhấn hơn các thiết kế trơn thường ngày của chị.

Tuy nhiên, đi ăn cưới ban ngày thì set này lại rất vừa vặn và hợp cảnh ạ. Nhờ chất liệu tơ và ren mềm có độ bay, rũ tự nhiên, trang phục lên form rất thanh nhã, tươi tắn mà không bị lộng lẫy hay nặng nề như đồ dự tiệc tối. Thiết kế form nhẹ nhàng, không phồng xòe cầu kỳ nên khi diện lên sẽ giữ được sự sang trọng, nhã nhặn chứ không bị "điệu quá mức".

Chị hoàn toàn có thể yên tâm chọn set này để diện đi tiệc ban ngày, vừa lịch sự lại rất vừa vặn với phong cách thanh lịch đấy ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 29. b1-policy-used-v2 (b1-rest)

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, quy định đổi hàng của shop yêu cầu sản phẩm chỉ ướm bên ngoài chứ không mặc thử vào người (dù còn tem, chưa giặt hay chưa mặc ra ngoài). Do chị đã mặc thử nên sản phẩm không đủ điều kiện đổi size ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 30. b1-changed-occasion-v3 (b1-rest)

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị định lấy cả bộ Thạch Thảo đi tiệc tối."},{"role":"shop","text":"Đi tiệc tối mặc cả bộ đẹp chị ạ."}]

Chị lấy cả bộ Thạch Thảo nha chị. Set được thiết kế đồng bộ với áo thêu form nhẹ và chân váy ren có độ rũ tự nhiên, mặc lên vừa chỉn chu, lịch sự để gặp khách hàng buổi sáng, vừa sang trọng, tinh tế cho tiệc tối mà vẫn rất gọn gàng, không mất công phối lại ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

## 31. b1-current-policy-v3 (b1-rest)

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày."}]

Dạ, quy định hiện tại bên em hỗ trợ đổi hàng trong vòng 15 ngày kể từ khi nhận hàng, nên chị nhận hàng 9 ngày thì vẫn đổi size được chị nhé.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 32. b1-price-v3 (b1-rest)

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Set váy Thạch Thảo có giá 799.000đ chị nha. Thiết kế gồm áo tơ Hàn thêu họa tiết nổi form nhẹ nhàng, thoáng mát và chân váy ren tơ Hàn mềm có độ rũ tự nhiên, mẫu này shop sẵn các size S, M, L, XL ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 33. b1-component-stock-v3 (b1-rest)

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, áo Thạch Thảo bên em có bán lẻ chị nhé. Áo lẻ chất liệu tơ Hàn thêu, họa tiết thêu nổi với form nhẹ có giá 499.000đ và hiện còn sẵn size M ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 34. b1-search-read-v3 (b1-rest)

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ, mẫu Set quần Xuân Thảo (SQ223) bên em vẫn còn hàng chị nhé:

- Nguyên set: 699.000đ (có size S, M, L)
- Áo lẻ: 429.000đ (có size S, M, L, XL)
- Quần lẻ: 429.000đ (có size S, M, L)

Sản phẩm làm từ chất liệu vải thô đục lỗ in họa tiết hoa mang lại cảm giác thoáng mát, đứng form đẹp, được phối dây ren tinh tế. Áo thiết kế 1 lớp form gọn gàng kết hợp cùng quần 2 lớp cạp chun thoải mái và dễ mặc ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

## 35. b1-buying-concern-v3 (b1-rest)

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Ngữ cảnh được cấp: [{"role":"customer","text":"Chị có sẵn chân váy đen dáng suông rồi."}]

Chị lấy riêng áo Thạch Thảo (499.000đ) phối với chân váy đen sẵn có sẽ rất hợp và linh hoạt để mặc lại nhiều lần, lại tiết kiệm chi phí. Áo chất tơ Hàn thêu nổi mềm, thoáng, có độ bay tự nhiên nên mặc lên rất thanh thoát và lịch sự.

Nếu chị thích sự đồng bộ để diện đi làm hay đi tiệc, lấy cả bộ (799.000đ) cũng hoàn toàn vừa vặn trong ngân sách 850.000đ của mình ạ. Chị thích lấy riêng áo hay lấy cả bộ để em hỗ trợ tiếp cho chị nhé?

Ảnh: 0. Owner generations: 2; verifier: 1.

## 36. b1-policy-used-v3 (b1-rest)

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: SEND_ELIGIBLE / PASS. Eligibility only; no delivery capture.

Dạ quy định đổi hàng bên em yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt ạ. Do chị đã cắt tem và giặt rồi nên không đủ điều kiện đổi sang mẫu khác, mong chị thông cảm giúp em nhé ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

## 37. sales-discovery-advice:need (journey-openings)

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Terminal: HANDOFF / RESPONSE_UNAVAILABLE. Actual isolated capture.

(không có tin gửi khách)

Draft không gửi (không phải customer outcome):
Em giới thiệu với chị hai mẫu bộ quần áo đi làm vừa xinh, giá dưới 1 triệu lại mặc thoải mái, không lo bị bó bụng nhé ạ:

- **Set quần Thạch Thảo (SQ2447)** - **769.000đ** (Đủ size S, M, L, XL): Set làm từ chất liệu tơ Hàn thêu cao cấp mềm mại, bay bổng và rất thanh lịch. Thiết kế form nhẹ nhàng, quần dễ mặc, phù hợp diện đi làm vừa lịch sự vừa thoải mái.
- **SET QUẦN UYỂN HOA (SQ748)** - **799.000đ** (Còn size S, L): Set chất thô đũi mềm mịn, thoáng khí, gồm áo kết hợp quần short lưng chun thoải mái, không gây cấn bụng, mang nét ngọt ngào và nữ tính.

Chị thích mẫu nào hay cần em tư vấn thêm về size thì báo em nhé ạ!

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

Dạ với chiều cao 1m58, nặng 52kg và sở thích mặc rộng thoải mái một chút, set váy Thạch Thảo chị mặc size M là vừa đẹp ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 40. sales-southern-delivery:deadline (journey-openings)

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ set váy Thạch Thảo ship về Cần Thơ mất khoảng 4–8 ngày nên không kịp giao cho chị vào sáng mai ạ.

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 41. stateful-open (stateful)

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Em đã thêm áo Thạch Thảo màu be, size M (hàng đặt trước) vào giỏ cho chị rồi ạ. Áo lẻ giá 499.000đ, tổng thanh toán hiện tại của mình là 529.000đ (đã gồm 30.000đ phí ship).

Ảnh: 0. Owner generations: 3; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 42. stateful-variant-quantity (stateful)

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Em đã đổi sang size L và lấy 2 chiếc áo Thạch Thảo màu be cho chị rồi ạ. Tổng thanh toán của mình là 978.100đ (đã gồm 30.000đ phí ship).

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 43. stateful-quote (stateful)

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, hai áo giá 998.000đ, phí ship 30.000đ và được giảm 49.900đ ưu đãi nên tổng thanh toán của mình là 978.100đ ạ.

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 44. stateful-correction (stateful)

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, em ghi nhận số đo của chị và giữ nguyên size L ạ.

Ảnh: 0. Owner generations: 3; verifier: 1.

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

Em đã thêm áo Thạch Thảo màu be size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé. Tổng giỏ hàng hiện tại của chị là 529.000đ (gồm 499.000đ tiền áo và 30.000đ phí vận chuyển).

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 50. negotiation-price-objection (negotiation)

Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, giá áo là 499.000đ và shop đã hỗ trợ ưu đãi phí vận chuyển 30.000đ rồi ạ. Mức giá này là tốt nhất rồi chị yên tâm nha, chất tơ Hàn thêu mềm mại, form mặc rất bay và sang ạ. Chị ưng mẫu này thì chốt đơn giúp em nhé!

Ảnh: 0. Owner generations: 2; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}

## 51. negotiation-total-control (negotiation)

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS. Actual isolated capture.

Dạ, tổng tiền áo và phí vận chuyển của mình là 499.000đ chị nha (giá áo 499.000đ, phí ship 30.000đ được shop hỗ trợ ưu đãi giảm đúng 30.000đ ạ).

Ảnh: 0. Owner generations: 1; verifier: 1.

Handoff evidence: {"conversationOwner":"BOT","events":0,"tags":0}
