# Full B1/B2/B3 + selected connections — 39 lượt

Run source: `a39e45affbd1a8171d8e13ffe2d741cc6624278d`. Mỗi ca1lần, không live send. B1 là exact terminal text đủ điều kiện gửi; các cohort stateful ghi actual dispatcher capture đã redact. Draft bị chặn tách khỏi nội dung khách nhận. Markdown chỉ bỏ khoảng trắng cuối dòng; raw giữ exact bytes.

## 1. b1 / b1-changed-occasion

customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
shop: Đi đám cưới mặc bộ này đẹp chị ạ.
Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Set Thạch Thảo dùng chất liệu tơ và ren mềm nên khi ngồi ô tô gần 3 tiếng di chuyển sẽ dễ bị hằn nếp nhăn chị ạ.
>
> Nếu chị cần mẫu giữ form tốt và ít nhăn hơn khi đi xe xa, em gợi ý **Váy Diệu Thanh** nhé. Mẫu này dùng chất ren Hàn cao cấp và có lớp lót lụa habutai bên trong giúp trang phục đứng dáng, hạn chế nhăn nhàu tốt hơn mà vẫn rất sang trọng, thanh lịch để đi đám cưới.

Review: **NEEDS_EDIT** — Đã chọn mẫu thay nhưng lý do dài, nhiều tính từ và công thức nếu/em gợi ý; chưa gọn theo giọng bán hàng đã chốt.

Raw: [b1\attempt-1.json](b1\attempt-1.json)

## 2. b1 / b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.
Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, shop hỗ trợ đổi hàng trong 15 ngày từ lúc nhận nên đơn của chị 10 hôm vẫn kịp đổi màu chị nhé. Phí đổi (vận chuyển 2 chiều) là 30.000đ ạ.

Review: **USABLE** — Dùng policy15ngày hiện tại thay lịch sử7ngày; trả thời hạn/phí đúng trọng tâm, không bắt lặp mọi điều kiện.

Raw: [b1\attempt-2.json](b1\attempt-2.json)

## 3. b1 / b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, set Thạch Thảo gồm áo làm từ tơ Hàn thêu họa tiết nổi (mềm, thoáng, bay tự nhiên) và chân váy ren tơ Hàn mềm có độ rũ tự nhiên chị nhé. Hiện tại hệ thống bên em chưa tra được giá và tình trạng còn hàng của size M nên em chưa báo chính xác cho chị được ạ.

Review: **USABLE** — Trả chất liệu có nguồn và giới hạn giá/tồn do POS_UNAVAILABLE; không bịa hay hứa theo dõi. Giọng hệ thống còn cần sửa.

Raw: [b1\attempt-3.json](b1\attempt-3.json)

## 4. b1 / b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, set Thạch Thảo mã SV2447 có giá 799.000đ cho cả bộ ạ.
>
> Ngoài ra shop có bán lẻ từng món nếu chị muốn mua rời:
> - Áo lẻ: 499.000đ
> - Chân váy lẻ: 449.000đ
>
> Chị muốn lấy cả bộ hay mua lẻ món nào ạ?

Review: **USABLE** — Giá cả bộ rõ trước; bán lẻ là lựa chọn bán hàng thật, không tự coi upsell là lỗi. Có thể ngắn hơn.

Raw: [b1\attempt-4.json](b1\attempt-4.json)

## 5. b1 / b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ áo Thạch Thảo size M hiện còn hàng chị nhé, áo bán lẻ có giá 499.000đ ạ.

Review: **USABLE** — Trả đúng áo riêng,sizeM,giá và tồn; câu ngắn.

Raw: [b1\attempt-5.json](b1\attempt-5.json)

## 6. b1 / b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, mẫu áo dài SD375 có giá 929.000đ cho áo lẻ và 1.065.000đ nếu chị lấy cả bộ ạ.

Review: **USABLE** — Tìm đúng SD375 và phân biệt giá áo/cả bộ.

Raw: [b1\attempt-6.json](b1\attempt-6.json)

## 7. b1 / b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: **HANDOFF / STALE**

Nội dung đủ điều kiện gửi/capture:

*(Không có nội dung khách nhận.)*

Review: **NO_CUSTOMER_REPLY** — Verifier PASS nhưng final readback khác snapshot; STALE và không có reply gửi. Chưa biết trường nguồn nào đã đổi.

Raw: [b1\attempt-7.json](b1\attempt-7.json)

## 8. b1 / b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, sản phẩm mình đã mặc đi làm rồi nên không đáp ứng điều kiện chưa qua sử dụng để đổi hàng, vì vậy shop chưa hỗ trợ đổi sang màu khác được ạ. Chị thông cảm giúp em nhé!

Review: **USABLE** — Khách đã mặc đi làm: từ chối đổi ngay theo tình trạng đã nêu, không bắt thiếu các điều kiện không còn quyết định kết quả.

Raw: [b1\attempt-8.json](b1\attempt-8.json)

## 9. b1 / b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.
shop: Tiệc trưa mặc bộ này xinh chị ạ.
Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Bộ này dùng tơ Hàn thêu và ren tơ Hàn mềm, form nhẹ và thoáng, có độ bay tự nhiên nên mặc khá nhẹ nhàng ạ. Tuy nhiên, vì tiệc ở sân vườn và chị phải ở ngoài trời lâu dễ nóng, chị có thể cân nhắc độ thoáng của chất tơ ren này. Nếu chị cần xem thêm các mẫu chất liệu mỏng mát hơn, chị nhắn em nhé ạ!

Review: **NEEDS_EDIT** — Lặp lại nóng/ngoài trời rồi bảo cân nhắc độ thoáng và nhắn nếu muốn xem thêm; chưa giúp khách quyết định.

Raw: [b1\attempt-9.json](b1\attempt-9.json)

## 10. b1 / b1-current-policy-v2

customer: Lần trước chị nhớ phí đổi là 25 nghìn.
Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ đơn nhận 12 hôm là mình vẫn kịp đổi size chị nha, vì shop hỗ trợ đổi trong vòng 15 ngày kể từ ngày nhận hàng. Phí vận chuyển 2 chiều hiện tại là 30.000đ ạ.
>
> Chị cần đổi sang size mấy để em kiểm tra xem kho còn không nhé?

Review: **USABLE** — Trả thời hạn/phí theo policy hiện tại; hỏi size muốn đổi là bước có thể xử lý tiếp bằng tool.

Raw: [b1\attempt-10.json](b1\attempt-10.json)

## 11. b1 / b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Chân váy của set làm bằng chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên ạ. Riêng giá và tình trạng size M của riêng chân váy thì hệ thống bên em hiện chưa có thông tin, nên em chưa báo chính xác cho chị được ạ.

Review: **USABLE** — Trả đúng chất liệu/dáng chân váy; giá/tồn không có nguồn thì không tạo. Giọng còn thiên về cung cấp thông tin.

Raw: [b1\attempt-11.json](b1\attempt-11.json)

## 12. b1 / b1-price-v2

customer: Chị đang xem bộ Thạch Thảo bên mình.
Khách: Cho chị xin giá cả bộ với em.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, set váy Thạch Thảo nguyên bộ có giá 799.000đ chị nhé.

Review: **USABLE** — Giá nguyên bộ được trả trực tiếp, ngắn.

Raw: [b1\attempt-12.json](b1\attempt-12.json)

## 13. b1 / b1-component-stock-v2

customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.
Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ chân váy Thạch Thảo size M bên em còn hàng chị nhé, giá mua riêng là 449.000đ ạ.

Review: **USABLE** — Giá/tồn đúng chân váy riêng,sizeM; không lẫn áo/set.

Raw: [b1\attempt-13.json](b1\attempt-13.json)

## 14. b1 / b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ shop có chị nhé! Set váy Khánh Trang có giá 999.000đ nguyên bộ ạ. Ngoài ra shop có bán lẻ áo hoặc chân váy với giá 499.000đ/món nha chị.

Review: **USABLE** — Tìm đúng KhánhTrang,giá nguyên bộ rõ; bán lẻ là lựa chọn thật, không phạt chỉ vì thêm phương án mua.

Raw: [b1\attempt-14.json](b1\attempt-14.json)

## 15. b1 / b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Set Thạch Thảo dùng chất tơ Hàn thêu nổi và chân váy ren mềm, form rũ tự nhiên chứ không bị bồng cứng hay lòe loẹt, nên diện đi ăn cưới ban ngày rất nhã nhặn và lịch sự ạ.
>
> Nếu chị quen mặc đồ trơn và sợ nguyên set ren thêu hơi rườm rà với mình, chị có thể chọn mua riêng áo (499.000đ) mặc cùng quần hoặc chân váy trơn sẵn có, hoặc lấy riêng chân váy ren (449.000đ) phối với áo đơn giản sẽ dễ mặc và đúng gu thường ngày hơn mà vẫn rất xinh. Chị thấy phương án tách lẻ hay lấy cả bộ (799.000đ) hợp với mình hơn ạ?

Review: **NEEDS_EDIT** — Khách nhờ quyết có nên lấy: reply dài, đưa áo/váy/cả bộ rồi trả lựa chọn về khách; đúng fact nhưng hỗ trợ quyết định yếu.

Raw: [b1\attempt-15.json](b1\attempt-15.json)

## 16. b1 / b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, theo quy định đổi hàng của shop, sản phẩm đổi size cần chưa từng mặc vào người (chỉ ướm bên ngoài) và còn nguyên tem mác ạ. Do mình đã mặc thử vào người rồi nên shop chưa thể hỗ trợ đổi size được, mong chị thông cảm giúp em nhé ạ!

Review: **USABLE** — Hiểu mặc thử khác chỉ ướm và từ chối đúng theo policy đang đọc; không duyệt vì chỉ thử5phút.

Raw: [b1\attempt-16.json](b1\attempt-16.json)

## 17. b1 / b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.
shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.
Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Đi gặp khách hàng buổi sáng, nếu chị muốn nhìn gọn gàng và sắc nét hơn thì lấy áo lẻ (499.000đ) phối với quần hoặc chân váy dáng ôm sẵn có sẽ hợp lý hơn ạ.
>
> Chân váy ren tơ của set có độ rũ và bay tự nhiên nên mặc cả bộ (799.000đ) sẽ thướt tha, bay bổng hơn, hợp đi tiệc hơn là không gian làm việc buổi sáng.

Review: **USABLE** — Chọn áo lẻ khi đổi sang gặp khách buổi sáng, giải thích đánh đổi với cả set. Tư vấn vẫn dùng được dù giọng còn văn viết.

Raw: [b1\attempt-17.json](b1\attempt-17.json)

## 18. b1 / b1-current-policy-v3

customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.
Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ bên mình hiện cho phép đổi hàng trong vòng 15 ngày kể từ khi nhận, nên chị nhận hàng được 9 ngày thì vẫn đổi size được bình thường nha chị. Phí vận chuyển 2 chiều cho đơn đổi là 30.000đ ạ.

Review: **USABLE** — Policy15ngày thắng lịch sử7ngày; trả được đơn9ngày và phí.

Raw: [b1\attempt-18.json](b1\attempt-18.json)

## 19. b1 / b1-partial-source-v3

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, áo trong set làm từ tơ Hàn thêu họa tiết nổi, mềm thoáng và bay tự nhiên, còn chân váy là ren tơ Hàn mềm có độ rũ tự nhiên chị nha. Hiện tại hệ thống bên em chưa tra được giá và tình trạng còn hàng ạ.

Review: **USABLE** — Trả riêng chất liệu áo/váy, không tạo giá/tồn khi nguồn tắt; giọng hệ thống chưa tự nhiên.

Raw: [b1\attempt-19.json](b1\attempt-19.json)

## 20. b1 / b1-price-v3

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, nguyên set Thạch Thảo có giá 799.000đ chị nhé.

Review: **USABLE** — Báo giá nguyên set ngắn,đúng yêu cầu.

Raw: [b1\attempt-20.json](b1\attempt-20.json)

## 21. b1 / b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ áo Thạch Thảo có bán lẻ chị nhé. Áo size M hiện còn hàng, giá 499.000đ chị nha.

Review: **USABLE** — Xác nhận bán riêng,giá/tồn sizeM rõ.

Raw: [b1\attempt-21.json](b1\attempt-21.json)

## 22. b1 / b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ mẫu Set quần Xuân Thảo bên em vẫn còn hàng chị nhé. Mẫu này mình có thể mua nguyên set hoặc mua lẻ từng món:
>
> - Set nguyên bộ: 699.000đ
> - Áo lẻ hoặc quần lẻ: 429.000đ/món

Review: **USABLE** — Tìm SQ223 và giá theo cách mua; không tự coi bảng giá ngắn trong tình huống này là lỗi.

Raw: [b1\attempt-22.json](b1\attempt-22.json)

## 23. b1 / b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.
Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Chị lấy riêng áo Thạch Thảo (499 nghìn) là hợp nhất với nhu cầu của mình ạ. Áo tơ Hàn thêu nổi form nhẹ, phối với chân váy đen dáng suông sẵn có của chị vừa lịch sự đi làm, vừa linh hoạt mix-match lại tiết kiệm chi phí trong ngân sách 850 nghìn.
>
> Còn nếu chị muốn diện trọn bộ chân váy ren tơ Hàn đồng điệu cho các dịp đi chơi, đi tiệc thì lấy cả bộ (799 nghìn) cũng vẫn vừa vặn ngân sách. Chị thích phương án nào hơn ạ?

Review: **NEEDS_EDIT** — Ban đầu chọn áo theo chân váy khách đã có, sau lại mở cả bộ và hỏi chọn lại; lặp ngân sách/nhiều lý do làm yếu quyết định.

Raw: [b1\attempt-23.json](b1\attempt-23.json)

## 24. b1 / b1-policy-used-v3

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, rất tiếc bên em không hỗ trợ đổi sang mẫu khác vì sản phẩm đã cắt tem và giặt ạ. Quy định đổi hàng bên em yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt giủi.

Review: **USABLE** — Từ chối đổi dựa đúng tình trạng cắt tem/giặt, không giả sử còn quyền đổi.

Raw: [b1\attempt-24.json](b1\attempt-24.json)

## 25. stateful / stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho mình rồi ạ. Mẫu này là hàng đặt trước chị nhé!

Review: **USABLE** — Giỏ thật đã tạo theo lựa chọn; preorder đúng nguồn, không nói đã lên đơn POS.

Raw: [stateful\provider-attempt-1.json](stateful\provider-attempt-1.json)

## 26. stateful / stateful-variant-quantity

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho mình rồi ạ.

Review: **USABLE** — State là sizeL/2chiếc, reply xác nhận đúng. Cập nhật số lượng hơi kỹ thuật nhưng là thông tin cần thiết.

Raw: [stateful\provider-attempt-2.json](stateful\provider-attempt-2.json)

## 27. stateful / stateful-quote

Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Tổng tiền 2 chiếc áo (đã gồm 30.000đ phí ship và trừ ưu đãi) là 978.100đ chị nhé.

Review: **USABLE** — Tổng978.100đ đúng quote, gồm ship/ưu đãi; ngoặc giải thích ngắn hữu ích, không chấm fail vì dấu ngoặc.

Raw: [stateful\provider-attempt-3.json](stateful\provider-attempt-3.json)

## 28. stateful / stateful-correction

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ em đã cập nhật lại số đo cho chị rồi ạ, mình giữ size L như vậy chị nhé!

Review: **NEEDS_EDIT** — Không đọc lại toàn số đo nhưng vẫn nói em đã cập nhật/mình giữsizeL như vậy; còn giọng thao tác hệ thống.

Raw: [stateful\provider-attempt-4.json](stateful\provider-attempt-4.json)

## 29. stateful / stateful-request-checkout

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Terminal: **NO_SEND / CHECKOUT_DETAILS_MISSING**

Nội dung đủ điều kiện gửi/capture:

> Chị cho em [NAME]

Review: **USABLE** — Code enqueue câu hỏi một field. NO_SEND không có nghĩa khách không nhận câu hỏi; capture redact tên.

Raw: [stateful\provider-attempt-5.json](stateful\provider-attempt-5.json)

## 30. stateful / stateful-private-checkout

Khách: [Private checkout fixture: dữ liệu nhận hàng synthetic; không forward model]

Terminal: **NO_SEND / PRIVATE_CHECKOUT_COMMITTED**

Nội dung đủ điều kiện gửi/capture:

> 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L: 998.000đ
> Tạm tính: 998.000đ
> Ưu đãi: -49.900đ
> Phí ship: 30.000đ
> Tổng: 978.100đ
> Set váy Thạch Thảo: hàng đặt trước
> Người nhận: Khách thử nghiệm - [PHONE]
> [ADDRESS]
> Thanh toán: COD
> Dự kiến nhận hàng: 8-14 ngày.
> Chị xác nhận chốt đơn nhé.

Review: **USABLE** — Private code dựng preview đủ tổng/phí/ưu đãi/người nhận/ETA; không forward private input cho model, không tự chốt.

Raw: [stateful\provider-attempt-6.json](stateful\provider-attempt-6.json)

## 31. stateful / stateful-confirm

Khách: Chốt đơn cho chị nhé.

Terminal: **HANDOFF / PURCHASE_CONFIRMED**

Nội dung đủ điều kiện gửi/capture:

> Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.

Review: **USABLE** — Chốt intent và chuyển HUMAN/event/tag/Outbox capture thật trong DB cô lập; không tạo POS order hay hứa nhân viên đã phản hồi.

Raw: [stateful\provider-attempt-7.json](stateful\provider-attempt-7.json)

## 32. stateful / stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Terminal: **HANDOFF / CUSTOMER_REQUESTED_HUMAN**

Nội dung đủ điều kiện gửi/capture:

*(Không có nội dung khách nhận.)*

Review: **OWNERSHIP_CONTROL** — Silent handoff theo policy hiện tại, stateHUMAN; control ownership, không dùng tính giọng tư vấn.

Raw: [stateful\provider-attempt-8.json](stateful\provider-attempt-8.json)

## 33. openings / sales-discovery-advice:need

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Terminal: **FALLBACK / STATE_UPDATE_INCOMPLETE**

Nội dung đủ điều kiện gửi/capture:

> Phần này em chưa trả lời được, chị nhé.

Review: **FALLBACK** — fitPreference tiếng Việt không thuộc FITTED/REGULAR/RELAXED nên reject cả patch; một read SUBJECT_BOUND. STATE_UPDATE_INCOMPLETE trước verifier.

Raw: [openings\provider-attempt-1.json](openings\provider-attempt-1.json)

Draft owner không gửi:

> Em gợi ý chị set quần Uyển Hoa tone kem nhã nhặn, mặc đi làm hay dạo phố đều rất thanh lịch. Set gồm áo kết hợp quần short lưng chun co giãn thoải mái, form suông nhẹ nên chị yên tâm không bị bó bụng chút nào ạ.
>
> Chất vải thô đũi mềm mịn, thoáng mát, giá trọn bộ là 799.000đ (dưới 1 triệu đúng mức ngân sách của chị). Chị xem mẫu này có ưng ý không ạ?

## 34. openings / sales-product-gallery:overview

Khách: Cho chị xem ảnh set Thạch Thảo màu be nhé.

Terminal: **FALLBACK / FAIL**

Nội dung đủ điều kiện gửi/capture:

> Phần này em chưa trả lời được, chị nhé.

Review: **FALLBACK** — Chọn ảnh be thiếu binding nên UNAVAILABLE, chọn ảnh chung sau đó OK. Owner suy shop không có riêng màu be từ thiếu ảnh; verifierFAIL, cả text/ảnh draft không gửi.

Raw: [openings\provider-attempt-2.json](openings\provider-attempt-2.json)

Draft owner không gửi:

> Chị ơi, set váy Thạch Thảo (799.000đ) hiện tại bên em là thiết kế này ạ, mẫu này shop không có riêng màu be. Em gửi chị hình ảnh chi tiết của set để mình xem form áo thêu và chân váy ren nhé ạ!

## 35. openings / sales-size-advice:height-weight

Khách: Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.

Terminal: **FALLBACK / OWNER_TOOL_MODE**

Nội dung đủ điều kiện gửi/capture:

> Phần này em chưa trả lời được, chị nhé.

Review: **FALLBACK** — fitPreference tiếng Việt làm patch đầu bị reject; round2 mới ghi cao/nặng. Generation3 gọi recommend_size khi toolsNONE: OWNER_TOOL_MODE; chưa chạy size/chart cho lượt này.

Raw: [openings\provider-attempt-3.json](openings\provider-attempt-3.json)

## 36. openings / sales-southern-delivery:deadline

Khách: Chị cần bộ này sáng thứ Sáu, ship về Cần Thơ có kịp không em?

Terminal: **HANDOFF / ETA_UNAVAILABLE**

Nội dung đủ điều kiện gửi/capture:

*(Không có nội dung khách nhận.)*

Review: **SILENT_HANDOFF** — ETA_DATA_MISSING_OR_EXPIRED khi đọc CầnThơ; ETA_UNAVAILABLE chuyển HUMAN theo rule silent, không có holding reply; không phải verifier reject.

Raw: [openings\provider-attempt-4.json](openings\provider-attempt-4.json)

## 37. negotiation / negotiation-cart-setup

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.

Review: **USABLE** — Tạo giỏ áo beM, preorder đúng nguồn; tổng ban đầu529k.

Raw: [negotiation\provider-attempt-1.json](negotiation\provider-attempt-1.json)

## 38. negotiation / negotiation-price-objection

Khách: Bớt cho chị chút được không?

Terminal: **SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY**

Nội dung đủ điều kiện gửi/capture:

> Giỏ của chị: 1 áo (mẫu “Set váy Thạch Thảo”) màu be, size M. Tổng 499.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.

Review: **NEEDS_EDIT** — Engine ghi1evidence và giảm30k,tổng499k. Draft thêm thêu tay/giá tốt nhất; verifierFAIL unsupported product. Khách nhận receipt-backed cart summary đúng tiền nhưng giọng báo giỏ, chưa nói rõ hỗ trợ30k.

Raw: [negotiation\provider-attempt-2.json](negotiation\provider-attempt-2.json)

Draft owner không gửi:

> Dạ, áo Thạch Thảo lẻ giá 499k và shop đang hỗ trợ sẵn 30k phí giao hàng cho đơn của mình rồi ạ. Mẫu này là hàng thiết kế thêu tay nên giá đó là giá tốt nhất shop gửi chị nha.
>
> Nếu chị lấy thêm một sản phẩm bất kỳ (từ 2 món trở lên), tổng đơn hàng sẽ được giảm thêm 5% nữa đó ạ. Chị có muốn xem thêm chân váy bộ này hoặc món nào khác để ghép đôi không chị?

## 39. negotiation / negotiation-total-control

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: **SEND_ELIGIBLE / PASS**

Nội dung đủ điều kiện gửi/capture:

> Dạ, áo giá 499.000đ, phí ship 30.000đ và được ưu đãi giảm 30.000đ nên tổng thanh toán của chị vẫn là 499.000đ ạ.

Review: **USABLE** — Tổng499k,ship30k/giảm30k đúng quote; tier/version/evidence giữ nguyên, không cấp ưu đãi lần2.

Raw: [negotiation\provider-attempt-3.json](negotiation\provider-attempt-3.json)
