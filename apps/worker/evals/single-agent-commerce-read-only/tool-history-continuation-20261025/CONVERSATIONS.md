# Hội thoại — 30 ca tiếp nối và 5 lượt tiền đề mới

Source `e51db388c6dfa95c5e5af7b2b82c21646e1e1933`. N1, retry0. Đọc nguyên câu trả lời; không chấm theo từ khóa. 24 ca B1 là send eligibility, 11 lượt stateful/đàm phán có capture transport. Không phải gửi live.

## 1. b1-changed-occasion

REMAINING_TARGET

Khách: Chị định lấy set Thạch Thảo mặc đi đám cưới.
Shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Terminal: SEND_ELIGIBLE / PASS

```text
Set Thạch Thảo dùng chất tơ Hàn và ren mềm bay tự nhiên nên khi ngồi ô tô gần 3 tiếng di chuyển đường dài sẽ dễ bị hằn nếp nhăn ạ. 

Chị chuyển sang mẫu **Set quần SQ675** giúp em nhé. Bộ này dùng chất liệu thô hoa laze phối thô ướt cao cấp có lót habutai bên trong, đứng form tốt và ít bị nhăn nhàu hơn khi ngồi xe lâu. Thiết kế tông be thanh lịch, điểm xuyết ren hoa nổi và chi tiết tinh tế vừa sang trọng, lịch sự lại vừa mang lại sự thoải mái, nhẹ nhàng suốt chuyến đi dự tiệc cưới.
```

NEEDS_EDIT: Có đổi lựa chọn theo việc ngồi xe lâu, nhưng câu trả lời quá dài, nửa sau dồn mô tả và tính từ quảng cáo; lý do chọn thay bị loãng. Cần kiểm căn cứ các khẳng định ít nhăn/thoải mái sau khóa review.

## 2. b1-current-policy

REMAINING_TARGET

Khách: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, đơn nhận 10 hôm thì vẫn trong thời hạn đổi hàng 15 ngày của shop nên chị vẫn đổi màu kịp ạ. 

Phí đổi hàng (vận chuyển 2 chiều) là 30.000đ chị nhé.
```

USEFUL: Trả trực tiếp mốc hiện tại 15 ngày và phí 30k, xử lý đúng câu hỏi so với lịch sử 7 ngày. Kết luận điều kiện cần đối chiếu snapshot sau review.

## 3. b1-partial-source

REMAINING_TARGET


Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Terminal: SEND_ELIGIBLE / PASS

```text
Set Thạch Thảo có phần áo làm bằng tơ Hàn thêu họa tiết nổi, vải mềm, thoáng và có độ bay tự nhiên; chân váy bằng ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé. Hiện tại thông tin giá và tình trạng tồn kho size M của sản phẩm này chưa có sẵn để tra cứu ạ.
```

USEFUL_WITH_POLISH: Giữ được câu trả lời chất liệu khi POS thiếu và không bịa giá/tồn; câu vẫn giống chép mô tả, kết thúc bằng cách nói tra cứu.

## 4. b1-price

REMAINING_TARGET


Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS

```text
Set váy Thạch Thảo có giá 799.000đ, hiện shop sẵn các size S, M, L, XL chị nhé.
```

USEFUL_WITH_POLISH: Giá nguyên set rõ và ngắn; đưa thêm toàn bộ size dù khách chỉ hỏi giá.

## 5. b1-component-stock-v2

REMAINING_TARGET

Khách: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, chân váy Thạch Thảo size M hiện còn hàng chị nhé. Chân váy mua riêng có giá 449.000đ ạ.
```

USEFUL: Hiểu chân váy rời qua lịch sử, trả gọn đúng giá và tồn M.

## 6. b1-search-read-v2

REMAINING_TARGET


Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, shop có set váy Khánh Trang chị nhé! Trọn bộ giá 999.000đ ạ. Ngoài ra shop có bán lẻ áo hoặc chân váy với giá 499.000đ mỗi món nha chị.
```

USEFUL_WITH_POLISH: Tìm đúng tên và giá cả bộ; bổ sung giá món rời tuy có ích tùy khách nhưng lượt này chưa cần.

## 7. b1-buying-concern-v2

REMAINING_TARGET


Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: SEND_ELIGIBLE / PASS

```text
Đi ăn cưới ban ngày thì set Thạch Thảo rất hợp không khí trang trọng và tươi tắn ạ. Tuy nhiên, vì chị hay mặc đồ trơn, ít họa tiết, mặc nguyên cả set gồm áo tơ thêu nổi và chân váy ren có thể khiến chị cảm thấy hơi nhiều chi tiết hoặc điệu hơn gu thường ngày.

Nếu chị muốn giữ phong cách tối giản quen thuộc mà vẫn lịch sự đi tiệc, chị có thể chọn mua riêng chân váy ren để phối cùng một chiếc áo trơn đơn giản sẵn có, hoặc lấy riêng áo thêu mặc với quần/chân váy trơn. Còn nếu chị muốn diện trọn set cho đồng bộ, form dáng áo và váy đều có độ rũ, bay tự nhiên nên nhìn rất nhã nhặn, thanh lịch chứ không bị rườm rà hay quá phô trương. 

Chị thích phương án tách lẻ dễ mặc hay lấy cả bộ luôn ạ?
```

NEEDS_EDIT: Hiểu gu đồ trơn nhưng trả nhiều nhánh áo/váy/cả set, rồi hỏi ngược khách chọn. Không chốt giúp khách; gần 200 từ và mô tả quảng cáo làm lựa chọn khó hơn.

## 8. b1-policy-used-v2

REMAINING_TARGET


Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải chưa qua sử dụng và chỉ ướm bên ngoài chứ không mặc thử vào người. Do chị đã mặc thử vào người rồi nên dù còn tem và chưa mang ra ngoài, shop rất tiếc chưa thể hỗ trợ đổi size cho chị được ạ. Mong chị thông cảm nha!
```

USEFUL_WITH_POLISH: Hiểu đã mặc thử khác chỉ ướm, từ chối đúng tình huống thay vì chỉ kiểm tem; giọng quy định dài và nặng.

## 9. b1-changed-occasion-v3

REMAINING_TARGET

Khách: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.
Shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Terminal: SEND_ELIGIBLE / PASS

```text
Đi gặp khách hàng buổi sáng mà cần nhìn gọn gàng và chuyên nghiệp hơn, chị nên lấy **áo lẻ (499.000đ)** để phối cùng quần âu hoặc chân váy ôm gọn. Áo chất tơ Hàn thêu form nhẹ, họa tiết nổi bật vừa đủ sẽ giúp tổng thể lịch sự và sắc sảo hơn.

Còn cả bộ (799.000đ) gồm áo thêu và chân váy ren tơ mềm có độ bay và rũ tự nhiên, thiên về nét thướt tha, mềm mại và rất hợp đi tiệc tối, nhưng độ bay rũ của chân váy ren sẽ không mang lại cảm giác gọn gàng sắc nét bằng việc mặc áo lẻ phối cùng đồ gọn gàng vào buổi sáng ạ.
```

USEFUL_WITH_POLISH: Đã đổi từ cả bộ dự tiệc sang áo lẻ cho gặp khách và nêu cách phối; phần so sánh lặp gọn gàng/bay rũ dài, nhiều tính từ.

## 10. b1-current-policy-v3

REMAINING_TARGET

Khách: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ thời hạn đổi hàng hiện tại của shop là trong vòng 15 ngày kể từ khi nhận hàng nên chị vẫn được hỗ trợ đổi size ạ. Phí vận chuyển đổi hàng 2 chiều là 30.000đ. 

Chị muốn đổi sang size nào ạ?
```

USEFUL: Đáp mốc hiện tại, phí và hỏi size muốn đổi; đi tiếp được trong tư vấn, không nói đã thực hiện đổi.

## 11. b1-partial-source-v3

REMAINING_TARGET


Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, áo của set làm từ chất liệu tơ Hàn thêu với họa tiết thêu nổi, vải mềm, thoáng và có độ bay tự nhiên, còn chân váy là ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nha. Giá và tình trạng còn hàng của set này hiện hệ thống chưa có thông tin nên em chưa báo chính xác được ạ.
```

USEFUL_WITH_POLISH: Giữ được chất liệu có nguồn và không bịa giá/tồn; mô tả dài và ngôn ngữ hệ thống vẫn cứng.

## 12. b1-price-v3

REMAINING_TARGET


Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, nguyên set váy Thạch Thảo có giá 799.000đ, hiện có đủ các size S, M, L, XL chị nhé.
```

USEFUL_WITH_POLISH: Giá cả bộ rõ; thông tin size cộng thêm không phục vụ câu hỏi chính.

## 13. b1-component-stock-v3

REMAINING_TARGET


Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ áo Thạch Thảo có bán riêng chị nhé. Size M hiện còn hàng, áo lẻ có giá 499.000đ ạ.
```

USEFUL: Xác nhận bán áo riêng và trả đủ giá/tồn M tự nhiên, không kéo sang khẳng định fit.

## 14. b1-search-read-v3

REMAINING_TARGET


Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ mẫu Set quần Xuân Thảo (SQ223) hiện shop vẫn còn hàng chị nhé. Sản phẩm có các lựa chọn với giá như sau:

- Cả bộ: 699.000đ
- Áo lẻ: 429.000đ
- Quần lẻ: 429.000đ

Chị muốn lấy theo set hay mua lẻ món nào ạ?
```

USEFUL_WITH_POLISH: Tìm đúng mã, trả tồn/giá và phân biệt lựa chọn bán; bảng ba mức giá hơi nhiều nhưng khách chưa chốt offer nên có lý do dùng.

## 15. b1-buying-concern-v3

REMAINING_TARGET

Khách: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Terminal: SEND_ELIGIBLE / PASS

```text
Với ngân sách tầm 850 nghìn và việc chị đã có sẵn chân váy đen dáng suông, em khuyên chị nên chọn **mua riêng áo** (499.000đ). 

Áo chất liệu tơ Hàn thêu nổi có form nhẹ và độ bay tự nhiên, khi phối cùng chân váy đen sẵn có sẽ tạo nên set đồ thanh lịch, dễ ứng dụng và mặc lại được rất nhiều lần trong các dịp khác nhau mà lại tiết kiệm chi phí. 

Ngoài ra, nếu chị thích diện nguyên set đồng bộ với chân váy ren tơ Hàn mềm mại, **cả bộ** có giá 799.000đ cũng nằm trong khoảng ngân sách của chị để mình cân nhắc thêm nhé ạ!
```

NEEDS_EDIT: Đã chọn áo riêng dựa trên váy khách có, nhưng nửa sau quảng cáo chất liệu rồi mở lại cả bộ mà không có đánh đổi mới. Lời khuyên bị loãng, chưa tập trung cách mặc lại.

## 16. b1-policy-used-v3

REMAINING_TARGET


Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, rất tiếc là sản phẩm đã cắt tem và giặt qua nên không đủ điều kiện đổi hàng theo quy định của shop (yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt), nên bên em không hỗ trợ đổi sang mẫu khác được ạ. Mong chị thông cảm giúp em nhé!
```

USEFUL_WITH_POLISH: Từ chối đúng tình trạng đã giặt/cắt tem; giải thích trong ngoặc lặp điều vừa nói và xin thông cảm dài.

## 17. b1-component-stock

REMAINING_TARGET


Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS

```text
Áo set Thạch Thảo size M hiện vẫn còn chị ạ. Áo bán riêng có giá 499.000đ chị nhé.
```

USEFUL: Đúng phạm vi áo lẻ, báo giá và tồn M ngắn gọn, không tự tư vấn vừa.

## 18. b1-search-read

REMAINING_TARGET


Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, mẫu áo dài SD375 hiện có hai lựa chọn cho chị ạ:
- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Sản phẩm hiện có sẵn các size S, M, L chị nha.
```

USEFUL_WITH_POLISH: Tìm được mã và phân biệt áo lẻ/cả bộ; đoạn size bổ sung không cần cho câu hỏi giá.

## 19. b1-buying-concern

REMAINING_TARGET


Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ set này mặc đi tiệc ban ngày rất hợp và không bị rườm rà đâu chị ạ. Thiết kế áo tơ Hàn thêu kết hợp chân váy ren tơ Hàn mềm có độ bay và rũ tự nhiên, tạo cảm giác thanh thoát, nhẹ nhàng chứ không hề nặng nề hay cứng nhắc. 

Trọn bộ giá 799.000đ, hoàn toàn nằm trong ngân sách 900.000đ của chị ạ.
```

NEEDS_EDIT: Khách ngại nhiều ren/rườm rà, câu trả lời dùng mềm/bay/rũ để phủ định rườm rà; chưa giải thích thuyết phục về mức độ chi tiết của thiết kế, giọng quảng cáo.

## 20. b1-policy-used

REMAINING_TARGET


Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải chưa qua sử dụng và chưa mặc ra ngoài. Do chị đã mặc đi làm một buổi nên sản phẩm không đáp ứng điều kiện đổi, rất tiếc em không thể hỗ trợ đổi sang màu khác cho chị được ạ. Mong chị thông cảm giúp em nhé!
```

USEFUL_WITH_POLISH: Từ chối thẳng theo việc đã mặc đi làm, không mở quyền đổi sai. Đoạn quy định và thông cảm dài hơn cần thiết.

## 21. b1-changed-occasion-v2

REMAINING_TARGET

Khách: Chị đang xem set Thạch Thảo để đi tiệc trưa.
Shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: SEND_ELIGIBLE / PASS

```text
Chất tơ Hàn thêu ở áo và ren tơ Hàn ở chân váy đều mềm, form nhẹ và có độ thoáng, bay tự nhiên nên diện ngoài trời vẫn thoải mái, không bị bí nặng đâu chị ạ.
```

USEFUL_WITH_POLISH: Đáp đúng nỗi lo nóng và khá ngắn; vẫn nhắc dãy chất liệu rồi kết luận thoải mái/không bí. Căn cứ thực dụng phải kiểm riêng, không coi giọng tự tin là lỗi tự động.

## 22. b1-current-policy-v2

REMAINING_TARGET

Khách: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, đơn của chị nhận 12 hôm trước và chưa dùng nên vẫn còn trong thời hạn đổi size ạ (shop hỗ trợ đổi trong vòng 15 ngày kể từ khi nhận hàng). Phí vận chuyển 2 chiều cho việc đổi hàng hiện là 30.000đ chị nhé.
```

USEFUL_WITH_POLISH: Dùng mốc/phí hiện tại, không nhắc phí cũ như luật; câu nhắc 12 hôm và thêm mốc 15 ngày trong ngoặc gây dài.

## 23. b1-partial-source-v2

REMAINING_TARGET


Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Terminal: SEND_ELIGIBLE / PASS

```text
Chân váy làm từ chất liệu ren tơ Hàn mềm mại, form nhẹ và có độ rũ tự nhiên rất đẹp chị nhé. Hiện hệ thống chưa có sẵn thông tin giá cũng như tình trạng size M khi mua riêng chân váy này ạ.
```

USEFUL_WITH_POLISH: Trả chất liệu/dáng và giới hạn giá/tồn đúng phạm vi váy; cách nói hệ thống chưa có sẵn còn mang giọng máy.

## 24. b1-price-v2

REMAINING_TARGET

Khách: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo có giá 799.000đ, hiện shop có sẵn các size S, M, L, XL ạ.
```

USEFUL_WITH_POLISH: Hiểu cả bộ qua lịch sử và báo giá; thêm dãy size không cần thiết.

## 25. negotiation-cart-setup

REMAINING_TARGET


Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS

```text
Em đã thêm áo Thạch Thảo màu be, size M vào giỏ hàng cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé.
```

USEFUL_WITH_POLISH: Có xác nhận áo/biến thể và đặt trước từ trạng thái; pre-order trong ngoặc thừa.

## 26. negotiation-price-objection

REMAINING_TARGET


Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ áo Thạch Thảo hiện tại là 499.000đ và shop đã hỗ trợ miễn phí vận chuyển cho đơn hàng của mình rồi, em chưa giảm thêm được nữa, chị thông cảm giúp em nhé.
```

USEFUL_WITH_POLISH: Nói giá hiện tại và hỗ trợ ship thay vì bịa giảm thêm; đoạn xin thông cảm còn sáo.

## 27. negotiation-total-control

REMAINING_TARGET


Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ tổng đơn của mình là 499.000đ ạ (phí ship 30.000đ đã được shop hỗ trợ giảm trừ nên chị chỉ cần thanh toán đúng tiền áo thôi ạ).
```

USEFUL_WITH_POLISH: Tổng thanh toán rõ; giải thích ship giảm trừ trong ngoặc quá dài cho câu hỏi tổng tiền.

## 28. stateful-open

ADDITIONAL_PREREQUISITE


Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, em đã thêm áo lẻ Thạch Thảo màu be, size M vào giỏ cho mình rồi ạ. Mẫu này là hàng đặt trước chị nhé.
```

USEFUL: Xác nhận đúng áo lẻ/be/M đã thêm và báo đặt trước, không đọc lại hai số đo.

## 29. stateful-variant-quantity

ADDITIONAL_PREREQUISITE


Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, em đã đổi sang size L và lấy 2 chiếc áo lẻ Thạch Thảo màu be cho mình rồi ạ.
```

USEFUL: Xác nhận gọn việc đổi L và số lượng hai áo, không kéo sang fit.

## 30. stateful-quote

ADDITIONAL_PREREQUISITE


Khách: Hai áo cả phí ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ, 2 áo lẻ Thạch Thảo màu be có tổng tiền hàng là 998.000đ, phí ship 30.000đ, tổng cộng thanh toán sau ưu đãi là 978.100đ chị nhé.
```

USEFUL_WITH_POLISH: Báo tổng code 978100 và các khoản; ưu đãi chưa hiển thị thành một khoản riêng nên khách phải tự đối chiếu 998k+30k với tổng.

## 31. stateful-correction

ADDITIONAL_PREREQUISITE


Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Terminal: SEND_ELIGIBLE / PASS

```text
Dạ vâng ạ, em ghi nhận số đo mới và giữ nguyên 2 áo size L cho mình chị nhé.
```

USEFUL_WITH_POLISH: Đã nhận sửa số đo mà không đọc lại số; giữ đúng hai áo L. Cụm em ghi nhận vẫn hơi mang giọng xử lý dữ liệu.

## 32. stateful-request-checkout

ADDITIONAL_PREREQUISITE


Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Terminal: NO_SEND / CHECKOUT_DETAILS_MISSING

```text
Chị cho em [NAME]
```

USEFUL: Code hỏi tên người nhận, không phải actual silence; raw capture bị redaction nên public text chỉ được xác nhận bằng hash/code.

Public text được chứng minh bằng hash transport: “Chị cho em tên người nhận nhé.”

## 33. stateful-private-checkout

REMAINING_TARGET


Khách: Thông tin checkout giả lập do code nhận; không đưa model.

Terminal: NO_SEND / PRIVATE_CHECKOUT_COMMITTED

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

USEFUL: Code nhận thông tin riêng và tạo preview đầy đủ tổng/ưu đãi/ship/đặt trước/ETA, hỏi xác nhận. Không gọi model cho PII.

## 34. stateful-confirm

REMAINING_TARGET


Khách: Chốt đơn cho chị nhé.

Terminal: HANDOFF / PURCHASE_CONFIRMED

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```

USEFUL: Xác nhận mua dẫn tới handoff với câu ngắn có bước tiếp theo, không báo đã tạo đơn POS.

## 35. stateful-human-request

REMAINING_TARGET


Khách: Cho chị gặp nhân viên shop nhé.

Terminal: HANDOFF / CUSTOMER_REQUESTED_HUMAN

```text
Em chuyển nhân viên hỗ trợ chị nhé.
```

USEFUL: Yêu cầu gặp nhân viên được chuyển với câu ngắn, không tiếp tục tư vấn vòng vo.
