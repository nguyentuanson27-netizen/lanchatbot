# B1 — 24 customer conversations and actual terminal outcomes

Run source: `fec9c51ccf2ead4842f5525b368770b3567217f5`. Raw savepoint: `6110fb7fe1185ac6e49cfccaa473853bde95c36b`. Every case ran once; rejected drafts are diagnostic evidence only and never replace the actual fallback.

## 1. b1-changed-occasion — FALLBACK_OR_NO_SEND

**Khách:** Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.

**Shop:** Dịp đó mặc set này hợp chị ạ.

**Khách:** Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

**Kết quả thực tế (FALLBACK):** Phần này em chưa trả lời được, chị nhé.

**Draft bị chặn (chỉ để chẩn đoán):** Set Thạch Thảo dùng chất liệu tơ Hàn thêu mềm và có độ bay tự nhiên, không ghi rõ lớp lót dày bên trong nên dưới ánh đèn sân khấu rọi mạnh có thể sẽ hơi thấu áo chị ạ.

Nếu cần độ kín đáo và yên tâm tuyệt đối khi lên sân khấu, chị có thể đổi sang **set Diễm Hoa** (áo ren hoa 3D 2 lớp đứng dáng hơn) hoặc **set Thanh Vũ** (áo ren cotton dệt) nhé ạ.

**Verifier:** FAIL — UNSUPPORTED_PROTECTED_ASSERTION (product:SV244); UNSUPPORTED_PROTECTED_ASSERTION (product:SV165)

**Primary whole-turn review:** Khách hỏi áo có dễ lộ dưới đèn sân khấu và sẵn sàng đổi mẫu. Kết quả thực nhận chỉ là fallback, không có quyết định mua hay hướng thay thế dùng được.

## 2. b1-current-policy — FALLBACK_OR_NO_SEND

**Khách:** Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

**Khách:** Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

**Kết quả thực tế (FALLBACK):** Phần này em chưa trả lời được, chị nhé.

**Draft bị chặn (chỉ để chẩn đoán):** Dạ đơn nhận 10 hôm thì vẫn trong thời hạn đổi 15 ngày của shop mình chị nha. Áo còn nguyên tem mác và chưa qua sử dụng là đủ điều kiện đổi màu ạ. Phí đổi hàng (phí ship 2 chiều) là 30.000đ chị nhé.

**Verifier:** FAIL — MATERIAL_CONDITION_LOSS (policy:84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86)

**Primary whole-turn review:** Nguồn có thời hạn và phí hiện tại nhưng khách không nhận được phần nào; fallback không giải quyết quyền đổi màu hay việc còn phải xác nhận.

## 3. b1-partial-source — USABLE

**Khách:** Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

**Kết quả thực tế (SEND_ELIGIBLE):** Set Thạch Thảo được thiết kế với áo làm từ tơ Hàn thêu cao cấp và chân váy ren tơ Hàn mềm mại, mang lại cảm giác nhẹ nhàng và bay bổng chị nha.

Hiện tại hệ thống chưa kiểm tra được chính xác giá và tình trạng còn hàng của size M, chị thông cảm giúp em nhé ạ!

**Primary whole-turn review:** Trả đúng chất liệu và nói rõ giá/tồn chưa kiểm tra được khi POS bị injected unavailable. Câu hơi giống mô tả sản phẩm và kết ‘nhé ạ’ chưa tự nhiên, nhưng phần trả lời thực tế vẫn dùng được.

## 4. b1-price — USABLE

**Khách:** Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

**Kết quả thực tế (SEND_ELIGIBLE):** Set váy Thạch Thảo (mã SV2447) có giá 799.000đ ạ.

**Primary whole-turn review:** Báo đúng giá của đúng mã trong một câu ngắn, không thêm câu hỏi hoặc dữ kiện ngoài nhu cầu.

## 5. b1-component-stock — USABLE

**Khách:** Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

**Kết quả thực tế (SEND_ELIGIBLE):** Áo Thạch Thảo size M bên mình còn hàng bạn nhé, giá bán riêng là 499.000đ.

**Primary whole-turn review:** Báo đúng áo bán riêng, giá và tồn sau read size M. Đổi đại từ sang ‘bạn’ làm giọng thiếu nhất quán nhẹ nhưng không cản giao dịch.

## 6. b1-search-read — NEEDS_EDIT

**Khách:** Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

**Kết quả thực tế (SEND_ELIGIBLE):** Mã áo dài SD375 hiện em chưa kiểm tra được giá trực tiếp. Chị quan tâm mẫu này theo màu nào hoặc cần em gợi ý thêm các kiểu dáng tương tự không ạ?

**Primary whole-turn review:** Khách hỏi giá SD375 nhưng reply chỉ nói chưa kiểm tra được rồi hỏi màu/gợi ý kiểu tương tự. Nhu cầu chính chưa được giải quyết và câu hỏi màu không tạo được bước tiếp theo cho mã đang hỏi.

## 7. b1-buying-concern — USABLE

**Khách:** Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

**Kết quả thực tế (SEND_ELIGIBLE):** Set váy này có giá 799.000đ, hoàn toàn vừa vặn với ngân sách 900.000đ của chị nhé ạ.

Chị yên tâm diện đi tiệc ban ngày không bị rườm rà đâu ạ. Thiết kế kết hợp giữa áo tơ thêu tinh tế và chân váy ren tơ Hàn mềm mại có độ rũ tự nhiên, mang lại cảm giác bay bổng, nhẹ nhàng và thanh lịch chứ không bị nặng nề hay quá cầu kỳ. Tổng thể rất nhã nhặn và sang trọng cho các buổi tiệc ban ngày.

**Primary whole-turn review:** Trả lời thẳng nỗi lo ren bị rườm rà, xác nhận giá nằm trong ngân sách và giải thích bằng thiết kế/chất liệu. Lời hơi quảng cáo và lặp ý nhưng vẫn giúp khách quyết định mua.

## 8. b1-policy-used — USABLE

**Khách:** Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

**Kết quả thực tế (SEND_ELIGIBLE):** Quy định đổi hàng của shop yêu cầu sản phẩm phải chưa qua sử dụng, chưa giặt, còn nguyên mác và không bị hư hỏng. Do chị đã mặc đi làm một buổi rồi nên shop rất tiếc không hỗ trợ đổi sang màu khác được ạ.

Về phí ship, nếu đổi hàng hợp lệ thì tổng phí ship 2 chiều là 30.000đ, nhưng trường hợp này sản phẩm đã qua sử dụng nên không đủ điều kiện đổi, chị thông cảm giúp shop nhé ạ!

**Primary whole-turn review:** Từ chối đúng vì hàng đã mặc đi làm và trả luôn câu hỏi phí cho trường hợp hợp lệ. Câu kết hơi hành chính nhưng quyết định và lý do rõ.

## 9. b1-changed-occasion-v2 — FALLBACK_OR_NO_SEND

**Khách:** Chị đang xem set Thạch Thảo để đi tiệc trưa.

**Shop:** Tiệc trưa mặc bộ này xinh chị ạ.

**Khách:** Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

**Kết quả thực tế (FALLBACK):** Phần này em chưa trả lời được, chị nhé.

**Draft bị chặn (chỉ để chẩn đoán):** Chị yên tâm nhé, set này áo dùng tơ Hàn thêu còn chân váy là ren tơ Hàn, chất vải mềm, thoáng và có độ bay tự nhiên nên mặc rất thoải mái, không bị bí nóng đâu ạ. Tiệc sân vườn ngoài trời diện mẫu này vừa bay bổng, thanh lịch lại rất thoáng mát.

**Verifier:** FAIL — UNSUPPORTED_PROTECTED_ASSERTION (product:SV2447)

**Primary whole-turn review:** Khách hỏi có bị bí khi tiệc chuyển ra ngoài trời. Actual fallback không đưa ra lựa chọn hay hướng xử lý nào.

## 10. b1-current-policy-v2 — FALLBACK_OR_NO_SEND

**Khách:** Lần trước chị nhớ phí đổi là 25 nghìn.

**Khách:** Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

**Kết quả thực tế (FALLBACK):** Phần này em chưa trả lời được, chị nhé.

**Draft bị chặn (chỉ để chẩn đoán):** Dạ chị nhận hàng 12 ngày là vẫn kịp đổi size trong thời hạn 15 ngày của shop ạ. Phí vận chuyển 2 chiều hiện là 30.000đ chị nha. Đồ mình còn nguyên tem mác, chưa qua sử dụng và giặt là mình đổi được chị nhé.

**Verifier:** FAIL — MATERIAL_CONDITION_LOSS (policy:84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86)

**Primary whole-turn review:** Khách không nhận được thời hạn 15 ngày, phí 30 nghìn hay phần điều kiện cần kiểm tra dù nguồn policy sẵn có.

## 11. b1-partial-source-v2 — FALLBACK_OR_NO_SEND

**Khách:** Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

**Kết quả thực tế (FALLBACK):** Phần này em chưa trả lời được, chị nhé.

**Draft bị chặn (chỉ để chẩn đoán):** Chân váy trong set được làm từ chất liệu ren tơ Hàn mềm mại, nữ tính, có form nhẹ nhàng với độ rũ tự nhiên giúp tạo chuyển động uyển chuyển, bay bổng khi di chuyển.

Tuy nhiên, mẫu Thạch Thảo được bán nguyên set gồm cả áo và chân váy chứ shop không tách rời bán riêng chân váy ạ. Ngoài ra, hiện hệ thống bên em chưa tra được giá và tình trạng tồn kho cụ thể của size M, nên em chưa báo chính xác mức giá cho chị được nha.

**Verifier:** FAIL — UNSUPPORTED_PROTECTED_ASSERTION (product:SV2447)

**Primary whole-turn review:** POS thiếu nhưng mô tả chất liệu/form vẫn có thể trả. Actual fallback bỏ cả phần đã xác minh và không giúp khách mua chân váy.

## 12. b1-price-v2 — NEEDS_EDIT

**Khách:** Chị đang xem bộ Thạch Thảo bên mình.

**Khách:** Cho chị xin giá cả bộ với em.

**Kết quả thực tế (SEND_ELIGIBLE):** Set váy Thạch Thảo có giá 799.000đ chị nhé. Bộ này gồm áo tơ Hàn thêu và chân váy ren tơ Hàn bay bổng, mặc rất nhẹ nhàng và nữ tính ạ. Chị có cần em tư vấn thêm về size không ạ?

**Primary whole-turn review:** Giá đúng nhưng câu hỏi đơn giản bị kéo thành mô tả chất liệu rồi xin tư vấn size. Phần thêm không cần thiết và lặp lại đúng kiểu flow máy móc corpus muốn phát hiện.

## 13. b1-component-stock-v2 — USABLE

**Khách:** Chị chỉ muốn lấy chân váy của set Thạch Thảo.

**Khách:** Chân váy size M còn không em, mua riêng là bao nhiêu?

**Kết quả thực tế (SEND_ELIGIBLE):** Dạ chân váy Thạch Thảo size M bên em vẫn còn hàng ạ, giá mua lẻ chân váy là 449.000đ chị nhé.

**Primary whole-turn review:** Trả đúng chân váy size M còn hàng và giá bán riêng, ngắn và bám đúng câu hỏi.

## 14. b1-search-read-v2 — FALLBACK_OR_NO_SEND

**Khách:** Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

**Kết quả thực tế (FALLBACK):** Phần này em chưa trả lời được, chị nhé.

**Chẩn đoán:** owner hết budget sau tool call thứ ba; không có final draft hoặc verifier.

**Primary whole-turn review:** Khách hỏi giá set Khánh Trang nhưng owner hết generation budget trước khi tạo final text. Kết quả khách nhận chỉ là fallback.

## 15. b1-buying-concern-v2 — FALLBACK_OR_NO_SEND

**Khách:** Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

**Kết quả thực tế (FALLBACK):** Phần này em chưa trả lời được, chị nhé.

**Draft bị chặn (chỉ để chẩn đoán):** Set Thạch Thảo thiên về nét bay bổng, nhẹ nhàng nhờ chất liệu tơ Hàn thêu và ren mềm chứ không bị điệu kiểu sến hay rườm rà đâu chị ạ. Các họa tiết thêu nổi và ren được làm rất tinh tế, mang lại cảm giác sang trọng, thanh lịch và rất nhã nhặn.

Đi ăn cưới ban ngày thì bộ này rất hợp vì vừa đủ nổi bật, lịch sự lại tươi tắn, không bị quá nặng nề hay lồng lộn như đồ dự tiệc tối.

Nếu chị muốn thay đổi một chút cho có không khí dự tiệc mà vẫn giữ được sự tinh tế, nhã nhặn thì hoàn toàn có thể yên tâm chọn set này. Còn nếu chị vẫn quen mặc đồ hoàn toàn trơn, shop cũng có sẵn lựa chọn mua riêng áo thêu hoặc chân váy ren để chị dễ phối với các item trơn sẵn có ở nhà đấy ạ.

**Verifier:** FAIL — UNSUPPORTED_PROTECTED_ASSERTION (offer:SV2447:SET_VAY)

**Primary whole-turn review:** Khách cần lời chọn thật cho tiệc ban ngày nhưng actual terminal không có tư vấn; fallback không thể thay quyết định mua.

## 16. b1-policy-used-v2 — USABLE

**Khách:** Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

**Kết quả thực tế (SEND_ELIGIBLE):** Quy định của shop áp dụng hình thức ướm bên ngoài sản phẩm chứ không mặc thử lên người. Do mình đã mặc thử, shop chưa thể hỗ trợ đổi size cho trường hợp này ạ.

**Primary whole-turn review:** Đọc đúng khác biệt giữa ướm và mặc thử, từ chối thẳng tình huống khách vừa nêu mà không kể thêm policy thừa.

## 17. b1-changed-occasion-v3 — NEEDS_EDIT

**Khách:** Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

**Shop:** Đi tiệc tối mặc cả bộ đẹp chị ạ.

**Khách:** Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

**Kết quả thực tế (SEND_ELIGIBLE):** Gặp khách hàng buổi sáng mà chị muốn nhìn gọn gàng, thanh lịch thì chị có thể cân nhắc lấy riêng áo thêu. Áo có form nhẹ nhàng, họa tiết thêu tinh xảo giúp tôn dáng thanh thoát, khi phối cùng quần âu hoặc chân váy cơ bản sẵn có ở nhà sẽ rất chỉn chu và sắc sảo.

Còn nếu chị thích sự đồng bộ, bay bổng và sang trọng cho tổng thể thì lấy cả bộ diện lên vẫn rất lịch sự và cuốn hút ạ.

**Primary whole-turn review:** Nhận ra hoàn cảnh mới và nghiêng về mua riêng áo, nhưng sau đó mở lại cả hai lựa chọn nên chưa thực sự chọn giúp khách. Giọng vẫn giống mô tả catalog hơn một lời khuyên ngắn.

## 18. b1-current-policy-v3 — FALLBACK_OR_NO_SEND

**Khách:** Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

**Khách:** Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

**Kết quả thực tế (FALLBACK):** Phần này em chưa trả lời được, chị nhé.

**Draft bị chặn (chỉ để chẩn đoán):** Dạ bên mình hiện áp dụng chính sách đổi hàng trong vòng 15 ngày kể từ ngày nhận ạ. Chị nhận hàng được 9 ngày và sản phẩm còn nguyên vẹn, chưa qua sử dụng thì mình vẫn đổi size thoải mái nha chị. Phí vận chuyển 2 chiều đổi hàng là 30.000đ, chị cần hỗ trợ đổi size nào cứ nhắn em nhé ạ!

**Verifier:** FAIL — MATERIAL_CONDITION_LOSS (policy:84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86)

**Primary whole-turn review:** Actual fallback bỏ thời hạn/phí hiện tại và không nói được phần tình trạng nào còn cần xác nhận trước khi đổi size.

## 19. b1-partial-source-v3 — NEEDS_EDIT

**Khách:** Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

**Kết quả thực tế (SEND_ELIGIBLE):** Áo được làm từ tơ Hàn thêu, còn chân váy là chất liệu ren tơ Hàn mềm mại chị nhé. Hiện hệ thống chưa hiển thị sẵn thông tin giá và tình trạng còn hàng của set này, chị quan tâm size nào để em kiểm tra thêm cho mình ạ?

**Primary whole-turn review:** Trả đúng phần chất liệu và trung thực rằng giá/tồn chưa có. Tuy nhiên hỏi size để ‘kiểm tra thêm’ không giải quyết được nguồn POS đang unavailable trong lượt này, nên bước tiếp theo không dùng được.

## 20. b1-price-v3 — USABLE

**Khách:** Nguyên set Thạch Thảo bao nhiêu tiền em?

**Kết quả thực tế (SEND_ELIGIBLE):** Nguyên set Thạch Thảo có giá 799.000đ ạ.

**Primary whole-turn review:** Báo đúng giá nguyên set bằng một câu tự nhiên và dừng đúng lúc.

## 21. b1-component-stock-v3 — NEEDS_EDIT

**Khách:** Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

**Kết quả thực tế (SEND_ELIGIBLE):** Áo Thạch Thảo nhà em có bán riêng chị nhé. Áo size M hiện còn hàng, giá 499.000đ ạ. Chị lấy áo này em lên đơn luôn cho mình nha!

**Primary whole-turn review:** Giá, tồn và khả năng bán riêng đúng, nhưng câu ‘em lên đơn luôn’ hứa bước tiếp theo vượt khả năng B1 chỉ đọc. Bot phải hỏi khách có muốn chốt hoặc hướng sang luồng có khả năng thực hiện, không hứa tự tạo đơn.

## 22. b1-search-read-v3 — USABLE

**Khách:** Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

**Kết quả thực tế (SEND_ELIGIBLE):** Set quần Xuân Thảo (SQ223) bên em vẫn còn hàng chị nhé, giá set là 699.000đ ạ.

**Primary whole-turn review:** Tìm đúng mã SQ223 rồi trả giá và tồn trong một câu rõ, không thay bằng mẫu gần giống.

## 23. b1-buying-concern-v3 — USABLE

**Khách:** Chị có sẵn chân váy đen dáng suông rồi.

**Khách:** Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

**Kết quả thực tế (SEND_ELIGIBLE):** Chị mua riêng áo Thạch Thảo (499k) phối với chân váy đen ở nhà là hợp lý nhất ạ. Áo chất tơ Hàn thêu nổi tinh tế, dễ kết hợp mặc đi làm hay đi chơi nhiều lần mà lại rất tiết kiệm.

Còn nếu chị thích diện nguyên set ren bay bổng, đồng bộ cho các dịp đi chơi, đi tiệc thì lấy cả bộ (799k) vẫn nằm gọn trong ngân sách 850k của mình nha.

**Primary whole-turn review:** Chọn rõ mua riêng áo dựa trên chân váy khách đã có, khả năng mặc lại và ngân sách; vẫn nêu ngắn phương án cả bộ để khách so sánh. Đây là tư vấn bán hàng có quyết định.

## 24. b1-policy-used-v3 — USABLE

**Khách:** Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

**Kết quả thực tế (SEND_ELIGIBLE):** Dạ, chính sách đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt ạ. Do sản phẩm của chị đã cắt tem và giặt rồi nên shop rất tiếc chưa thể hỗ trợ đổi sang mẫu khác được, mong chị thông cảm giúp shop nhé ạ.

**Primary whole-turn review:** Từ chối đúng vì đã cắt tem và giặt; câu ngắn, lý do đủ và không kéo sang điều kiện không liên quan.
