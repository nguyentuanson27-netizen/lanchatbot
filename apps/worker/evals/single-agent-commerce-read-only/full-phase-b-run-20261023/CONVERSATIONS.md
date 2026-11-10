# Phase B — full39 và7lượt media tiếp nối

Source e1a81192; N1. B1 là isolated eligibility seam; các journey dùng DB cô lập và capture delivery. Không gửi khách thật. Core39 và media7 báo riêng. Hai NO_SEND checkout có actual code reply; không phải silence.

## 1. b1 / b1-changed-occasion

[Raw attempt](b1/attempt-1.json) — SEND_ELIGIBLE / PASS

Lịch sử đầu vào:

```text
customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
shop: Đi đám cưới mặc bộ này đẹp chị ạ.
```

Khách:

```text
Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.
```

Actual terminal customer outcome:

```text
Dạ set Thạch Thảo dùng chất tơ và ren mềm nên khi ngồi ô tô 3 tiếng đi xa có thể dễ bị hằn nếp ở phần tà váy ạ.

Chị chuyển sang Váy Diệp An (699.000đ) sẽ hợp lý hơn cho chuyến đi này nha chị. Mẫu này thiết kế 2 lớp đứng form cùng dáng suông nhẹ, giúp váy giữ form gọn gàng và ít bị nhăn nhúm hơn khi ngồi xe lâu đó ạ.
```

Review: USABLE — Chọn mẫu thay và lý do phù hợp hành trình; còn dài, diễn đạt giữ form/ít nhăn cần đối chiếu nguồn, không mặc định đếm tính từ làm FAIL.

## 2. b1 / b1-current-policy

[Raw attempt](b1/attempt-2.json) — SEND_ELIGIBLE / PASS

Lịch sử đầu vào:

```text
customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.
```

Khách:

```text
Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?
```

Actual terminal customer outcome:

```text
Dạ, mình đổi màu vẫn kịp chị nhé, vì thời hạn đổi hàng bên em là trong vòng 15 ngày kể từ khi nhận hàng. Phí vận chuyển 2 chiều cho việc đổi hàng là 30.000đ ạ. Đơn của chị mới nhận 10 hôm và còn nguyên tem mác nên hoàn toàn được hỗ trợ đổi sang màu khác chị nha.
```

Review: USABLE — Trả đúng phần thời hạn/phí khách hỏi theo nguồn hiện hành; đoạn xác nhận cuối hơi lặp, chưa phải lỗi bỏ điều kiện chỉ vì không đọc toàn policy.

## 3. b1 / b1-partial-source

[Raw attempt](b1/attempt-3.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.
```

Actual terminal customer outcome:

```text
Set Thạch Thảo có áo may bằng tơ Hàn thêu với họa tiết thêu nổi, vải mềm, thoáng và có độ bay tự nhiên; chân váy bằng ren tơ Hàn mềm, form nhẹ, có độ rũ tự nhiên chị ạ.

Về giá và tình trạng size M thì hiện thông tin hệ thống chưa cập nhật nên em chưa báo chính xác cho chị được nhé ạ.
```

Review: NEEDS_EDIT — Giữ phần chất liệu khi POS thiếu đúng, nhưng nói hệ thống chưa cập nhật là suy nguyên nhân và giọng nội bộ; nên chỉ báo phần chưa tra được.

## 4. b1 / b1-price

[Raw attempt](b1/attempt-4.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?
```

Actual terminal customer outcome:

```text
Dạ, set váy Thạch Thảo có giá 799.000đ ạ. Ngoài ra shop có bán lẻ áo 499.000đ và chân váy 449.000đ chị nhé.
```

Review: USABLE — Giá cả bộ và các món lẻ rõ, trả đúng nhu cầu; không có đoạn quảng cáo thừa.

## 5. b1 / b1-component-stock

[Raw attempt](b1/attempt-5.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?
```

Actual terminal customer outcome:

```text
Dạ áo lẻ size M của bộ Thạch Thảo vẫn còn hàng chị nhé, giá bán riêng là 499.000đ ạ.
```

Review: USABLE — Đúng áo lẻ/size/giá, ngắn và đủ.

## 6. b1 / b1-search-read

[Raw attempt](b1/attempt-6.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.
```

Actual terminal customer outcome:

```text
Áo dài mã SD375 có giá 929.000đ cho áo lẻ và 1.065.000đ nếu mua cả bộ chị nhé.
```

Review: USABLE — Tra đúng mã và phân biệt giá áo lẻ/cả bộ.

## 7. b1 / b1-buying-concern

[Raw attempt](b1/attempt-7.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.
```

Actual terminal customer outcome:

```text
Dạ bộ này giá 799.000đ, hoàn toàn nằm trong ngân sách 900.000đ của chị ạ.

Mặc đi tiệc ban ngày không bị rườm rà đâu chị nhé, vì thiết kế kết hợp áo tơ Hàn thêu nổi form nhẹ nhàng, bay bổng với chân váy ren tơ mềm mại có độ rũ tự nhiên, tổng thể rất thanh thoát và nhã nhặn chứ không bị nặng nề hay quá cầu kỳ đâu ạ.
```

Review: NEEDS_EDIT — Hiểu phân vân nhưng mở giá/ngân sách rồi gom nhiều tính từ/material description; chưa giải thích nét tổng thể giúp khách tự tin chọn. Cùng lỗi tư vấn cũ, không chấm fail chỉ vì dài.

## 8. b1 / b1-policy-used

[Raw attempt](b1/attempt-8.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?
```

Actual terminal customer outcome:

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải chưa qua sử dụng và còn nguyên tem mác. Do mình đã mặc đi làm một buổi rồi nên sản phẩm không đáp ứng điều kiện đổi, em rất tiếc không hỗ trợ đổi sang màu khác cho chị được ạ.
```

Review: USABLE — Từ chối đúng đã mặc đi làm; không đọc phí/điều kiện cho việc vốn không được hỗ trợ. Giọng còn trang trọng nhưng rõ.

## 9. b1 / b1-changed-occasion-v2

[Raw attempt](b1/attempt-9.json) — SEND_ELIGIBLE / PASS

Lịch sử đầu vào:

```text
customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.
shop: Tiệc trưa mặc bộ này xinh chị ạ.
```

Khách:

```text
Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?
```

Actual terminal customer outcome:

```text
Set này dùng áo tơ Hàn thêu và chân váy ren tơ Hàn mềm, form nhẹ và có độ thoáng. Tuy nhiên, vì là trang phục dự tiệc có họa tiết thêu nổi và lớp ren, đứng ngoài trời sân vườn lâu và hay dễ nóng thì mình có thể sẽ thấy hơi oi một chút chị ạ.
```

Review: NEEDS_EDIT — Nhận thay đổi hoàn cảnh nhưng chỉ mô tả và dự báo oi; không đưa hướng mua/điều chỉnh có ích dù đây là băn khoăn quyết định mua. Không phải lỗi safety vì dùng nhận xét cảm giác định tính.

## 10. b1 / b1-current-policy-v2

[Raw attempt](b1/attempt-10.json) — SEND_ELIGIBLE / PASS

Lịch sử đầu vào:

```text
customer: Lần trước chị nhớ phí đổi là 25 nghìn.
```

Khách:

```text
Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?
```

Actual terminal customer outcome:

```text
Dạ, đơn nhận 12 hôm thì mình vẫn trong thời hạn đổi hàng 15 ngày chị nhé. Phí vận chuyển 2 chiều cho việc đổi hàng là 30.000đ ạ.
```

Review: USABLE — Đúng phạm vi thời hạn/phí, ngắn, không giả duyệt toàn bộ hồ sơ.

## 11. b1 / b1-partial-source-v2

[Raw attempt](b1/attempt-11.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.
```

Actual terminal customer outcome:

```text
Dạ, chân váy được làm bằng chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất đẹp ạ.

Mẫu này là thiết kế gồm cả áo và chân váy, hiện hệ thống chưa có thông tin về việc tách bán lẻ cũng như giá và tình trạng tồn kho của riêng chân váy size M ạ.
```

Review: NEEDS_EDIT — Trả phần váy đã có đúng, nhưng giải thích bằng trạng thái hệ thống và mô tả dài; chỉ cần nói phần chưa tra được, không bịa nguyên nhân.

## 12. b1 / b1-price-v2

[Raw attempt](b1/attempt-12.json) — SEND_ELIGIBLE / PASS

Lịch sử đầu vào:

```text
customer: Chị đang xem bộ Thạch Thảo bên mình.
```

Khách:

```text
Cho chị xin giá cả bộ với em.
```

Actual terminal customer outcome:

```text
Dạ, set váy Thạch Thảo cả bộ có giá 799.000đ chị nhé.
```

Review: USABLE — Giá cả bộ đúng và ngắn.

## 13. b1 / b1-component-stock-v2

[Raw attempt](b1/attempt-13.json) — SEND_ELIGIBLE / PASS

Lịch sử đầu vào:

```text
customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.
```

Khách:

```text
Chân váy size M còn không em, mua riêng là bao nhiêu?
```

Actual terminal customer outcome:

```text
Dạ, chân váy Thạch Thảo size M hiện bên em còn hàng, giá mua riêng là 449.000đ chị nhé.
```

Review: USABLE — Đúng tồn/giá của riêng chân váy sizeM.

## 14. b1 / b1-search-read-v2

[Raw attempt](b1/attempt-14.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.
```

Actual terminal customer outcome:

```text
Dạ shop có chị nhé ạ. Set váy Khánh Trang có giá 999.000đ cho cả bộ (gồm áo và chân váy). Ngoài ra mình có thể mua lẻ áo hoặc chân váy với giá 499.000đ mỗi món ạ.
```

Review: USABLE — Đúng mẫu/giá và các lựa chọn bán; đủ để mua tiếp.

## 15. b1 / b1-buying-concern-v2

[Raw attempt](b1/attempt-15.json) — FALLBACK / FAIL

Khách:

```text
Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?
```

Actual terminal customer outcome:

```text
Phần này em chưa trả lời được, chị nhé.
```

Review: FALLBACK — Actual generic fallback, chưa giúp khách quyết định; kiểm draft/verdict riêng để xác định nguyên nhân, không chấm draft như đã gửi.

Draft chưa gửi, chỉ để chẩn đoán:

```text
Nếu chị hay mặc đồ trơn và sợ set này hơi điệu, em tư vấn thật là set Thạch Thảo gồm áo tơ Hàn thêu nổi kết hợp chân váy ren mềm, với form nhẹ và độ bay, rũ tự nhiên. Mặc nguyên bộ đi ăn cưới ban ngày sẽ rất hợp, vừa thanh nhã, trang trọng lại tươi tắn chứ không bị quá lộng lẫy hay nặng nề.

Tuy nhiên, vì có cả áo thêu lẫn chân váy ren, tổng thể lên người đúng là sẽ nữ tính và điệu hơn phong cách tối giản quen thuộc của chị một chút.

Nếu chị muốn diện đi ăn cưới mà vẫn giữ được nét nhã nhặn, mình có thể chọn mua riêng áo tơ thêu (499.000đ) phối cùng quần hoặc chân váy trơn sẵn có, vừa có điểm nhấn tinh tế vừa đúng gu thường ngày. Còn nếu chị muốn đổi gió một chút cho ngày vui thì lấy nguyên cả set (799.000đ) mặc lên rất sang và vừa vặn ạ.
```

```text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"SV2447"}]}
```

## 16. b1 / b1-policy-used-v2

[Raw attempt](b1/attempt-16.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?
```

Actual terminal customer outcome:

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải chưa qua sử dụng và chỉ ướm bên ngoài chứ không mặc vào người (dù mặc thử trong phòng, còn tem hay chưa ra ngoài cũng không đáp ứng điều kiện này ạ). Tiếc là shop không hỗ trợ đổi size trong trường hợp này được chị nha.
```

Review: USABLE — Từ chối đúng mặc thử khác ướm; câu dài/ngoặc thừa nhưng không chấm theo số điều kiện.

## 17. b1 / b1-changed-occasion-v3

[Raw attempt](b1/attempt-17.json) — SEND_ELIGIBLE / PASS

Lịch sử đầu vào:

```text
customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.
shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.
```

Khách:

```text
Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?
```

Actual terminal customer outcome:

```text
Mặc đi gặp khách hàng buổi sáng cần sự gọn gàng và chuyên nghiệp, chị lấy áo lẻ (499.000đ) phối cùng quần âu hoặc chân váy cơ bản sẽ hợp hơn ạ. Áo có form nhẹ và họa tiết thêu nổi tinh tế, giúp vẻ ngoài lịch sự mà vẫn mềm mại.

Còn nếu chị muốn sự đồng bộ, nữ tính từ áo thêu và chân váy ren có độ rũ tự nhiên để tiện mặc luôn cho buổi tối, chị có thể lấy cả bộ (799.000đ) ạ.
```

Review: NEEDS_EDIT — Chọn áo lẻ cho gặp khách đúng, nhưng lại mở mua cả bộ cho buổi tối thay vì tập trung lịch mới và quyết định khách nhờ chọn; nhánh thêm chưa có đánh đổi cần thiết.

## 18. b1 / b1-current-policy-v3

[Raw attempt](b1/attempt-18.json) — SEND_ELIGIBLE / PASS

Lịch sử đầu vào:

```text
customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.
```

Khách:

```text
Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?
```

Actual terminal customer outcome:

```text
Dạ, bên em áp dụng thời gian đổi hàng trong vòng 15 ngày kể từ khi nhận hàng nên 9 ngày thì mình vẫn đổi size được bình thường chị nhé. Phí đổi hàng 2 chiều là 30.000đ ạ.
```

Review: USABLE — Trả đúng thời hạn/phí đang áp dụng, không đọc toàn bộ policy.

## 19. b1 / b1-partial-source-v3

[Raw attempt](b1/attempt-19.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?
```

Actual terminal customer outcome:

```text
Dạ, áo trong set làm bằng chất liệu tơ Hàn thêu họa tiết nổi, vải mềm, thoáng và có độ bay tự nhiên ạ. Chân váy là ren tơ Hàn mềm, form nhẹ, có độ rũ tự nhiên.

Dạ hiện tại em chưa có sẵn thông tin về giá và tình trạng còn hàng của set này ạ.
```

Review: USABLE — Trả phần chất liệu đã biết, nói gọn phần giá/tồn chưa có; không đổ lỗi hệ thống.

## 20. b1 / b1-price-v3

[Raw attempt](b1/attempt-20.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Nguyên set Thạch Thảo bao nhiêu tiền em?
```

Actual terminal customer outcome:

```text
Dạ, nguyên set váy Thạch Thảo có giá 799.000đ chị ạ.
```

Review: USABLE — Đúng giá nguyên set và ngắn.

## 21. b1 / b1-component-stock-v3

[Raw attempt](b1/attempt-21.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.
```

Actual terminal customer outcome:

```text
Dạ áo Thạch Thảo nhà em có bán riêng chị nhé. Áo lẻ size M hiện còn hàng, giá 499.000đ ạ.
```

Review: USABLE — Trả đúng bán riêng/tồnM/giá áo.

## 22. b1 / b1-search-read-v3

[Raw attempt](b1/attempt-22.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.
```

Actual terminal customer outcome:

```text
Dạ mẫu Set quần Xuân Thảo (SQ223) hiện vẫn còn hàng chị nhé. Mẫu này shop có bán nguyên bộ lẫn bán lẻ từng món:

- Nguyên bộ: 699.000đ
- Áo lẻ: 429.000đ
- Quần lẻ: 429.000đ
```

Review: USABLE — Tra đúng mã và phân biệt giá bán bộ/món lẻ; danh sách có mục đích so giá, không phải liệt kê fact vô cớ.

## 23. b1 / b1-buying-concern-v3

[Raw attempt](b1/attempt-23.json) — SEND_ELIGIBLE / PASS

Lịch sử đầu vào:

```text
customer: Chị có sẵn chân váy đen dáng suông rồi.
```

Khách:

```text
Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.
```

Actual terminal customer outcome:

```text
Chị lấy cả bộ Thạch Thảo giá 799.000đ đi ạ, mức giá này vừa vặn trong ngân sách 850 nghìn của chị.

Lấy cả bộ sẽ linh hoạt và tối ưu hơn rất nhiều vì chị vừa có áo thêu tơ Hàn để thoải mái phối cùng chân váy đen dáng suông sẵn có cho các dịp đi làm, vừa có sẵn chân váy ren tơ Hàn đồng bộ mặc đi chơi hay đi tiệc điệu đà. Cả set giúp chị dễ dàng biến hóa nhiều phong cách và mặc lại được nhiều lần mà không lo nhàm chán ạ.
```

Review: NEEDS_EDIT — Chọn cả bộ và nêu lợi ích thêm chân váy hợp lệ, nhưng nhiều lời quảng cáo chung và lặp ngân sách; chưa giải thích ngắn vì sao đáng trả thêm so áo lẻ với mục tiêu mặc lại.

## 24. b1 / b1-policy-used-v3

[Raw attempt](b1/attempt-24.json) — SEND_ELIGIBLE / PASS

Khách:

```text
Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?
```

Actual terminal customer outcome:

```text
Dạ, sản phẩm đã cắt tem và giặt rồi nên shop không hỗ trợ đổi hàng được ạ, vì quy định đổi yêu cầu sản phẩm phải còn nguyên tem và chưa qua giặt giũ.
```

Review: USABLE — Từ chối đúng cắt tem/giặt, giải thích gọn lý do quyết định.

## 25. stateful / stateful-open

[Raw attempt](stateful/provider-attempt-1.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
```

Actual terminal customer outcome:

```text
Em đã thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này hiện là hàng đặt trước (pre-order) chị nhé!
```

Review: USABLE — Receipt-backed thêm đúng áo/be/M và báo pre-order; không giả đã lên đơn POS.

## 26. stateful / stateful-variant-quantity

[Raw attempt](stateful/provider-attempt-2.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Đổi áo sang L cho chị, lấy hai chiếc nhé.
```

Actual terminal customer outcome:

```text
Em đã đổi sang 2 chiếc áo lẻ Thạch Thảo màu be size L cho chị rồi ạ.
```

Review: USABLE — Đổi đúng L/2chiếc, giữ màu, ACK theo mutation thực.

## 27. stateful / stateful-quote

[Raw attempt](stateful/provider-attempt-3.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Hai áo cả phí ship là bao nhiêu em?
```

Actual terminal customer outcome:

```text
Tổng đơn 2 áo của chị là 978,100đ (đã gồm 30,000đ phí ship và được áp mã giảm 49,900đ) chị nha.
```

Review: USABLE — Tổng978100/phí30000/giảm49900 đúng quote. Có polish: dùng format Việt và gọi ưu đãi thay vì mã giảm khi không có coupon.

## 28. stateful / stateful-correction

[Raw attempt](stateful/provider-attempt-4.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
```

Actual terminal customer outcome:

```text
Dạ em đã ghi nhận số đo mới của chị ạ. Giỏ hàng của chị vẫn giữ nguyên 2 áo lẻ Thạch Thảo màu be size L nhé!
```

Review: USABLE — Giữ lựa chọn L/2áo, không nhắc lại toàn bộ số đo; câu ghi nhận vẫn hơi hành chính nhưng nội dung dùng được.

## 29. stateful / stateful-request-checkout

[Raw attempt](stateful/provider-attempt-5.json) — NO_SEND / CHECKOUT_DETAILS_MISSING

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Chị đặt hai áo này nhé, lên đơn cho chị.
```

Actual terminal customer outcome:

```text
Chị cho em [NAME]
```

Review: CODE_CHECKOUT — Code tiếp nhận thông tin riêng tư, có capture; NO_SEND ở model không phải khách không nhận tin.

## 30. stateful / stateful-private-checkout

[Raw attempt](stateful/provider-attempt-6.json) — NO_SEND / PRIVATE_CHECKOUT_COMMITTED

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
[PRIVATE CODE CHECKOUT — redacted]
```

Actual terminal customer outcome:

```text
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
```

Review: CODE_CHECKOUT — Preview code có đủ giá/ưu đãi/ship/preorder/ETA và xác nhận; riêng tư redacted, không gửi PII vào model.

## 31. stateful / stateful-confirm

[Raw attempt](stateful/provider-attempt-7.json) — HANDOFF / PURCHASE_CONFIRMED

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Chốt đơn cho chị nhé.
```

Actual terminal customer outcome:

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```

Review: HANDOFF — Xác nhận mua và chuyển nhân viên theo transaction/holding policy, không tự tạo POS order.

## 32. stateful / stateful-human-request

[Raw attempt](stateful/provider-attempt-8.json) — HANDOFF / CUSTOMER_REQUESTED_HUMAN

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Cho chị gặp nhân viên shop nhé.
```

Actual terminal customer outcome:

```text
Em chuyển nhân viên hỗ trợ chị nhé.
```

Review: HANDOFF — Chuyển người theo yêu cầu, có actual holding reply, không tiếp tục tự tư vấn.

## 33. openings / sales-discovery-advice:need

[Raw attempt](openings/provider-attempt-1.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.
```

Actual terminal customer outcome:

```text
Em gợi ý chị mẫu **Set quần SQ629** tone kem sáng thanh lịch, giá **749.000đ** rất hợp yêu cầu của chị ạ.

Set này có thiết kế áo dáng rộng nhẹ kết hợp quần short cạp chun co giãn thoải mái và form suông nhẹ, không hề bị bó bụng nên mặc rất dễ chịu, thích hợp diện đi làm hoặc đi chơi.

Dạ mẫu này hiện là hàng đặt trước (pre-order), chị xem ưng kiểu này không để em hỗ trợ tiếp nhé ạ!
```

Review: USABLE — Chọn được mẫu dưới1tr có cạp chun, báo giá vàpreorder, hỏi cảm nhận đúng bước. Giọng còn nhiều tính từ/Markdown, cần polish nhưng có hướng mua cụ thể.

## 34. openings / sales-product-gallery:overview

[Raw attempt](openings/provider-attempt-2.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Cho chị xem ảnh set Thạch Thảo màu be nhé.
```

Actual terminal customer outcome:

```text
Dạ, shop hiện chưa có hình ảnh xác thực riêng cho màu be của set váy Thạch Thảo, em gửi chị hình ảnh chung của mẫu này nhé:

[asset:1d468b542cef730ec27e5adf3a1fcc4d4a8ff56a3660ac9c875a51b8fd5a8f77]
[asset:dd576b00ea6b3597c810ac34c66dead82235ce5db30bbdd01a3e809e1349604f]
[CODE_IMAGE]
[CODE_IMAGE]
```

Review: NEEDS_EDIT — Ảnh chung gửi được, nhưng exact final lộ hai opaque asset refs và giọng xác thực dữ liệu; gatePASS không bảo đảm output surface hữu ích cho khách.

## 35. openings / sales-size-advice:height-weight

[Raw attempt](openings/provider-attempt-3.json) — HANDOFF / SIZE_RULE_UNAVAILABLE

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.
```

Actual terminal customer outcome:

```text
Em chuyển nhân viên chọn size cho chị nhé.
```

Review: HANDOFF — NO_VERIFIED_CHART đã chuyển nhân viên bằng code/policy thay vì bịa fit; vẫn còn source gap chọn size tự động.

## 36. openings / sales-southern-delivery:deadline

[Raw attempt](openings/provider-attempt-4.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Chị cần bộ này sáng thứ Sáu, ship về Cần Thơ có kịp không em?
```

Actual terminal customer outcome:

```text
Dạ set váy Thạch Thảo ship về Cần Thơ có thời gian vận chuyển từ 4 đến 8 ngày. Do hệ thống không có mốc tính giờ cụ thể, em chưa thể khẳng định đơn sẽ kịp giao vào sáng thứ Sáu, chị cân nhắc thời gian giúp em nhé ạ.
```

Review: NEEDS_EDIT — Giữ ETA dự kiến/không hứa kịp đúng, nhưng kể hệ thống thiếu mốc giờ rồi bảo khách cân nhắc giúp shop; giọng nội bộ và thiếu quyết định nhận hẹn rõ.

## 37. negotiation / negotiation-cart-setup

[Raw attempt](negotiation/provider-attempt-1.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
```

Actual terminal customer outcome:

```text
Em đã thêm áo Thạch Thảo màu be, size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé.
```

Review: USABLE — Thêm đúng áo/be/M và báo preorder, có receipt.

## 38. negotiation / negotiation-price-objection

[Raw attempt](negotiation/provider-attempt-2.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Bớt cho chị chút được không?
```

Actual terminal customer outcome:

```text
Dạ giá áo là 499.000đ và shop hỗ trợ 30.000đ phí vận chuyển nên tổng thanh toán của chị là 499.000đ ạ. Mức giá này đã là tốt nhất cho thiết kế tơ Hàn thêu nổi này rồi, chị yên tâm chốt đơn giúp em nhé ạ!
```

Review: USABLE — Nêu được hỗ trợ ship30k và tổng499k từ quote hiện tại. Lời tốt nhất/chốt giúp em còn quảng cáo và cần polish, không gọi đó là lỗi tính ưu đãi.

## 39. negotiation / negotiation-total-control

[Raw attempt](negotiation/provider-attempt-3.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Thế một áo cả ship là bao nhiêu em?
```

Actual terminal customer outcome:

```text
Dạ tổng thanh toán gồm cả áo và phí ship của chị là 499.000đ ạ (giá áo 499.000đ, phí ship 30.000đ và shop hỗ trợ giảm 30.000đ ưu đãi nên tổng tiền thanh toán giữ nguyên ạ).
```

Review: USABLE — Tổng499k giữ đúng quote sau ưu đãi, không tăng tier khi chỉ hỏi tổng; phần ngoặc tính tiền hơi dài nhưng có mục đích giải thích.

## 40. media / media-overview-next:ask

[Raw attempt](media/provider-attempt-1.json) — FALLBACK / FAIL

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Em có ảnh khách mặc bộ Thạch Thảo không?
```

Actual terminal customer outcome:

```text
Chị muốn xem ảnh tổng thể hay ảnh cận chi tiết của mẫu này ạ?
```

Review: FALLBACK — Verifier chặn lời báo thiếu feedback; actual câu hỏi ảnh không trả thẳng yêu cầu feedback.

Draft chưa gửi, chỉ để chẩn đoán:

```text
Dạ, hiện shop chưa có ảnh khách mặc thực tế của set Thạch Thảo, nhưng em gửi chị ảnh chụp form dáng và chi tiết của bộ này để chị dễ xem ạ.
```

```text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:1611b035e6c22eaed4b3f60aeff24031fbce7ac183536ddca4431eca562a031e"}]}
```

## 41. media / media-overview-next:continue

[Raw attempt](media/provider-attempt-2.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Gửi chị ảnh cả bộ nhé.
```

Actual terminal customer outcome:

```text
Dạ, em gửi chị hình ảnh mặc trọn bộ Thạch Thảo từ góc nhìn trước và sau để mình dễ ngắm dáng áo và chân váy ạ.
[CODE_IMAGE]
[CODE_IMAGE]
```

Review: USABLE — Tiếp nối actualfallback, chọn đúng2ảnh FRONT/BACK của cảbộ, lời dẫn phù hợp.

[Ảnh capture](https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg)

[Ảnh capture](https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg)

## 42. media / media-detail-next:ask

[Raw attempt](media/provider-attempt-3.json) — FALLBACK / FAIL

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Bộ Thạch Thảo có ảnh khách mặc chưa em?
```

Actual terminal customer outcome:

```text
Chị muốn xem ảnh tổng thể hay ảnh cận chi tiết của mẫu này ạ?
```

Review: FALLBACK — Cùng ranh giới negativefeedback, không còn do thiếu observation; không tự gọi chính xác clause nào vì verdict chỉ ref.

Draft chưa gửi, chỉ để chẩn đoán:

```text
Dạ set Thạch Thảo hiện chưa có ảnh khách mặc thực tế ạ. Chị có muốn em gửi ảnh chi tiết và cận cảnh chất liệu của mẫu này không ạ?
```

```text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:1611b035e6c22eaed4b3f60aeff24031fbce7ac183536ddca4431eca562a031e"}]}
```

## 43. media / media-detail-next:continue

[Raw attempt](media/provider-attempt-4.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Cho chị xem cận phần thêu ở áo nhé.
```

Actual terminal customer outcome:

```text
Dạ, em gửi chị ảnh cận cảnh họa tiết thêu nổi trên nền tơ Hàn của áo ạ.
[CODE_IMAGE]
```

Review: USABLE — Gửi đúng ảnh DETAIL/AO theo yêu cầu, không hỏi lại hoặc đọc hồ sơ.

[Ảnh capture](https://content.pancake.vn/1/s3000x3000/30/a6/9a/19/6fb6d83e276b5589a90244897076dc81aff48c462090ab8ff4bffa45-w:2813-h:4220-l:710250-t:image/jpeg.jpeg)

## 44. media / media-and-price:ask

[Raw attempt](media/provider-attempt-5.json) — FALLBACK / FAIL

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Em gửi chị ảnh khách mặc bộ Thạch Thảo với. Lấy riêng áo thì bao nhiêu?
```

Actual terminal customer outcome:

```text
Chị muốn xem ảnh tổng thể hay ảnh cận chi tiết của mẫu này ạ?
```

Review: FALLBACK — Draft có giá đúng499k nhưng lời thiếu feedback bị FAIL, actual bỏ cả phần giá. Mixed-intent residual vẫn tồn tại.

Draft chưa gửi, chỉ để chẩn đoán:

```text
Dạ, áo lẻ set Thạch Thảo có giá 499.000đ chị nhé. Shop hiện chưa có ảnh khách mặc thực tế, em gửi chị ảnh mẫu mặc bộ này ạ.
```

```text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:1611b035e6c22eaed4b3f60aeff24031fbce7ac183536ddca4431eca562a031e"}]}
```

## 45. media / media-and-size:ask

[Raw attempt](media/provider-attempt-6.json) — HANDOFF / SIZE_RULE_UNAVAILABLE

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Cho chị xem gần phần thêu áo Thạch Thảo nhé. Chị cao 1m58, nặng 52kg thì lấy size nào?
```

Actual terminal customer outcome:

```text
Em chuyển nhân viên chọn size cho chị nhé.
```

Review: HANDOFF — No-chart kết thúc bằng code-backed handoff, không có draft bịa fit và không gửi ảnh chọn trước handoff; vẫn thiếu chart để tự chọn size.

## 46. media / media-decision:ask

[Raw attempt](media/provider-attempt-7.json) — SEND_ELIGIBLE / PASS

Journey dùng state và terminal/history thực, không seed câu shop thành công.

Khách:

```text
Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.
```

Actual terminal customer outcome:

```text
Chị sợ phần ren nhiều thì mình chọn mua riêng áo tơ thêu (499.000đ) mặc với chân váy trơn hoặc quần suông sẵn có ở nhà nhé ạ. Áo làm từ chất tơ Hàn mềm thoáng với họa tiết thêu nổi tinh tế, vừa đủ điểm nhấn thanh lịch và nhã nhặn cho tiệc cưới ban trưa mà không bị rườm rà.
[CODE_IMAGE]
```

Review: USABLE — Chọn áo lẻ để giảm phần ren, ảnh DETAIL/AO liên quan món định bán; tốt hơn việc mở hai hướng không chọn. Còn polish tính từ và tránh ngầm giả định đồ khách có ở nhà; N1 không chứng minh giọng đã ổn định.

[Ảnh capture](https://content.pancake.vn/1/s3000x3000/30/a6/9a/19/6fb6d83e276b5589a90244897076dc81aff48c462090ab8ff4bffa45-w:2813-h:4220-l:710250-t:image/jpeg.jpeg)
