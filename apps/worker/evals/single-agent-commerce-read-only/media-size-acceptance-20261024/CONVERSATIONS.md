# Phase B — toàn bộ51lượt, actual customer outcomes

Source `af482367aa953486a27f290b658c23ef1200f993`; N1, retry0. B1 là send eligibility; các nhóm persisted là capture transport. Mỗi nhận xét xét cả câu hỏi, lịch sử và kết quả thực tế. Không chấm bằng từ khóa. Private capture đã redacted; không coi marker là câu bot thật sự gửi.

## b1-changed-occasion

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `FALLBACK / OWNER_TOOL_MODE`.

Khách trước: Chị định lấy set Thạch Thảo mặc đi đám cưới.

Shop trước: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Kết quả thực tế:

```text
Phần này em chưa trả lời được, chị nhé.
```

Review `NOT_RESOLVED`: Khách muốn đổi lựa chọn do ngồi xe lâu; fallback không đưa lựa chọn hay bước tiếp theo.

## b1-current-policy

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách trước: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Kết quả thực tế:

```text
Dạ, đơn nhận 10 hôm thì vẫn trong thời hạn đổi hàng 15 ngày của shop chị nhé. Phí đổi hàng 2 chiều là 30.000đ ạ. Chị muốn đổi sang màu nào ạ?
```

Review `USABLE`: Dùng policy hiện hành 15 ngày/30k thay ký ức 7 ngày, trả đúng vấn đề đổi màu rồi hỏi màu cần đổi.

## b1-partial-source

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả thực tế:

```text
Dạ, set Thạch Thảo có áo may bằng tơ Hàn thêu họa tiết nổi, vải mềm, thoáng và có độ bay tự nhiên; chân váy làm từ ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé. Hiện tại thông tin giá và tồn kho size M em chưa tra được ạ.
```

Review `PARTIAL_SOURCE_NOT_FULLY_RESOLVED`: Giữ được chất liệu, không bịa giá/tồn khi nguồn POS bị fault có chủ đích. Nhu cầu giá/tồn chưa hoàn thành; đây là giới hạn nguồn/capability, không quy thành model không hiểu câu hỏi.

## b1-price

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Kết quả thực tế:

```text
Dạ, set váy Thạch Thảo mã SV2447 có giá 799.000đ ạ. Set gồm áo tơ Hàn thêu họa tiết nổi và chân váy ren tơ Hàn mềm, có sẵn các size S, M, L, XL chị nhé.
```

Review `USABLE`: Trả giá cả set, thành phần và các size. Đủ cho lượt hỏi giá, hơi dài nhưng không mở menu món lẻ.

## b1-component-stock

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Kết quả thực tế:

```text
Dạ, áo của bộ Thạch Thảo size M hiện còn hàng chị nhé. Áo bán lẻ có giá 499.000đ ạ.
```

Review `USABLE`: Đúng áo lẻ, size M, còn hàng và giá; ngắn, sát câu hỏi.

## b1-search-read

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Kết quả thực tế:

```text
Áo dài mã SD375 có giá 929.000đ cho áo lẻ và 1.065.000đ cho cả bộ chị nhé.
```

Review `USABLE_WITH_POLISH`: Tìm đúng SD375 và phân biệt giá áo lẻ/cả bộ. Có thể dùng; nên ưu tiên cách mua khách đang hỏi khi đã rõ.

## b1-buying-concern

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `FALLBACK / PROVIDER_ERROR`.

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả thực tế:

```text
Phần này em chưa trả lời được, chị nhé.
```

Review `NOT_RESOLVED`: Fallback làm mất tư vấn về ren/ngân sách/tiệc ban ngày. Chỉ xác định nguyên nhân kỹ thuật sau primary review.

## b1-policy-used

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Kết quả thực tế:

```text
Dạ, sản phẩm đã mặc ra ngoài đi làm nên không đáp ứng điều kiện đổi hàng của shop (yêu cầu sản phẩm còn nguyên tem và chưa qua sử dụng). Tiếc quá shop không hỗ trợ đổi sang màu khác cho chị được ạ. 

Nếu đổi hợp lệ theo quy định, phí ship 2 chiều là 30.000đ do khách chịu chị nhé.
```

Review `USABLE_WITH_POLISH`: Từ chối đúng việc đã mặc đi làm. Phần phí cho trường hợp hợp lệ trả lời ý hỏi phí nhưng có thể gọn hơn.

## b1-changed-occasion-v2

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách trước: Chị đang xem set Thạch Thảo để đi tiệc trưa.

Shop trước: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Kết quả thực tế:

```text
Set này sử dụng chất tơ Hàn thêu cho áo và ren tơ Hàn mềm cho chân váy, thiết kế form nhẹ với độ thoáng và bay tự nhiên. Chị đi tiệc sân vườn có thể chọn bộ này để đảm bảo độ mềm mại và thoải mái ạ.
```

Review `NEEDS_EDIT`: Nhận bối cảnh ngoài trời nhưng chủ yếu đọc chất liệu rồi khẳng định đảm bảo thoải mái. Chưa giải thích quyết định đủ sát việc ở ngoài lâu/dễ nóng; giọng bảo đảm mạnh hơn cần thiết.

## b1-current-policy-v2

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách trước: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Kết quả thực tế:

```text
Dạ đơn nhận 12 ngày thì mình vẫn kịp đổi size chị nhé, vì thời gian hỗ trợ đổi là trong vòng 15 ngày kể từ khi nhận hàng ạ. Phí ship đổi hai chiều hiện tại là 30.000đ chị nha. Chị muốn đổi sang size nào để em kiểm tra kho giúp mình ạ?
```

Review `USABLE`: Trả đúng thời hạn/phí hiện hành và hỏi size đổi; bước kiểm kho nằm trong read_product hiện có.

## b1-partial-source-v2

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả thực tế:

```text
Chân váy làm bằng ren tơ Hàn mềm, form nhẹ, có độ rũ tự nhiên ạ. Hiện hệ thống chưa có sẵn thông tin giá và tồn kho riêng cho chân váy size M, chị nha.
```

Review `PARTIAL_SOURCE_NOT_FULLY_RESOLVED`: Giữ đúng vải/dáng chân váy và không bịa giá/tồn. Câu hệ thống chưa có sẵn là văn phong kỹ thuật; nhu cầu mua chưa được giải quyết khi nguồn bị fault.

## b1-price-v2

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách trước: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả thực tế:

```text
Dạ, set váy Thạch Thảo nguyên bộ có giá 799.000đ chị nhé (gồm áo tơ Hàn thêu nổi và chân váy ren). Set hiện có đủ các size từ S đến XL ạ.
```

Review `USABLE`: Trả đúng cả bộ, không đẩy lựa chọn áo/váy lẻ. Ngoặc thành phần không gây khó hiểu.

## b1-component-stock-v2

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách trước: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Kết quả thực tế:

```text
Chân váy size M còn hàng chị nha, mua riêng có giá 449.000đ ạ.
```

Review `USABLE`: Đúng chân váy riêng size M và giá449k, ngắn và dùng được.

## b1-search-read-v2

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Kết quả thực tế:

```text
Dạ shop có chị nhé, set váy Khánh Trang bên em có bán cả bộ lẫn mua lẻ ạ:
- Nguyên set: 999.000đ
- Áo lẻ hoặc chân váy lẻ: 499.000đ/món

Chị muốn lấy cả set hay cần em tư vấn thêm size nào không ạ?
```

Review `USABLE`: Tìm đúng Khánh Trang và phân biệt lựa chọn cả bộ/món lẻ. Có câu hỏi tiếp theo phù hợp.

## b1-buying-concern-v2

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả thực tế:

```text
Dạ, đi ăn cưới ban ngày thì set Thạch Thảo rất hợp lý vì chất tơ Hàn và ren tơ mềm mại, form nhẹ có độ bay và rũ tự nhiên tạo cảm giác rất nhã nhặn, thanh lịch chứ không bị nặng nề hay quá điệu đà. 

Dù áo có họa tiết thêu nổi và chân váy ren, thiết kế form nhẹ nhàng nên lên người rất sang và tinh tế. Nếu chị quen mặc đồ trơn, set này vẫn rất dễ mặc vì các chi tiết thêu và ren hài hòa, tạo điểm nhấn vừa đủ chứ không phô trương. 

Set hiện có giá 799.000đ, đủ size S, M, L, XL. Chị lấy nguyên set để diện đi tiệc luôn rất đẹp và lịch sự ạ.
```

Review `NEEDS_EDIT`: Nhiều đoạn và tính từ lặp để khẳng định không quá điệu, thay vì một lý do rõ cho người quen đồ trơn. Chưa thuyết phục hơn dù có chốt mua cả bộ.

## b1-policy-used-v2

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Kết quả thực tế:

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm chưa qua sử dụng và chỉ áp dụng ướm bên ngoài chứ không mặc trực tiếp vào người. Vì mình đã mặc thử vào người, shop rất tiếc chưa thể hỗ trợ đổi size cho chị được ạ.
```

Review `USABLE`: Hiểu đã mặc thử vào người và từ chối đúng HOLD_UP_ONLY; không chỉ dò đủ tem/chưa giặt.

## b1-changed-occasion-v3

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách trước: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

Shop trước: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả thực tế:

```text
Đi gặp khách hàng cần sự gọn gàng và thanh lịch, chị lấy áo lẻ (499.000đ) sẽ hợp lý hơn ạ. Áo tơ Hàn thêu form nhẹ, khi phối cùng quần âu hoặc chân váy ôm sẽ giúp vẻ ngoài sắc sảo và chuyên nghiệp hơn rất nhiều. 

Chân váy ren tơ của set (799.000đ) có chất liệu mềm mại, độ rũ bay bổng nên sẽ hợp với tiệc tối hơn. Nếu lấy cả bộ thì thêm 300.000đ để chị có thêm chân váy mặc linh hoạt cho các dịp khác.
```

Review `USABLE_WITH_POLISH`: Đã đổi quyết định sang áo lẻ khi hoàn cảnh đổi, có cách phối. 799k cần gắn rõ cả bộ, và câu sắc sảo/chuyên nghiệp hơn rất nhiều hơi quảng cáo. Không coi thêm phương án cả bộ là lỗi chỉ vì có upsell.

## b1-current-policy-v3

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách trước: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Kết quả thực tế:

```text
Dạ, bên em hỗ trợ đổi size trong vòng 15 ngày kể từ khi nhận hàng nên chị vẫn đổi được bình thường chị nhé. Phí vận chuyển đổi hàng 2 chiều là 30.000đ ạ.
```

Review `USABLE`: Dùng thời hạn15ngày hiện hành, trả thẳng việc còn đổi được; thêm phí là thông tin liên quan.

## b1-partial-source-v3

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Kết quả thực tế:

```text
Dạ, áo của set được làm từ chất liệu tơ Hàn thêu họa tiết nổi, vải mềm, thoáng và có độ bay tự nhiên, còn chân váy là ren tơ Hàn mềm với form nhẹ, có độ rũ tự nhiên chị nha. Hiện tại thông tin về giá và tình trạng còn hàng của set này em chưa tra được ạ.
```

Review `PARTIAL_SOURCE_NOT_FULLY_RESOLVED`: Trả vải áo/váy, giữ giá/tồn là chưa biết đúng fault source. Chưa hoàn thành toàn nhu cầu mua nhưng không bịa hoặc hứa bước ngoài khả năng.

## b1-price-v3

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Kết quả thực tế:

```text
Dạ, nguyên set váy Thạch Thảo có giá 799.000đ, hiện có sẵn các size S, M, L, XL chị nhé.
```

Review `USABLE`: Giá cả bộ và size, ngắn và rõ.

## b1-component-stock-v3

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Kết quả thực tế:

```text
Dạ, áo Thạch Thảo có bán riêng chị nhé. Áo lẻ size M hiện còn hàng, giá 499.000đ ạ.
```

Review `USABLE`: Đủ bán riêng/còn M/giá499k, giọng bình thường.

## b1-search-read-v3

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Kết quả thực tế:

```text
Dạ mẫu Set quần Xuân Thảo (SQ223) bên em vẫn còn hàng chị nha. Giá chi tiết các lựa chọn:

- Áo lẻ: 429.000đ (sẵn size S, M, L, XL)
- Quần lẻ: 429.000đ (sẵn size S, M, L)
- Cả bộ: 699.000đ (sẵn size S, M, L)
```

Review `USABLE`: Tìm đúng SQ223, giá và size chia đúng áo/quần/cả bộ. Danh sách ở đây giúp phân biệt lựa chọn thay vì đọc lại hồ sơ.

## b1-buying-concern-v3

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách trước: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả thực tế:

```text
Chị nên lấy cả bộ (799.000đ) vì mức giá này nằm trọn trong ngân sách 850 nghìn của chị. 

Chân váy ren tơ Hàn trong set được thiết kế đồng bộ với áo thêu nổi, mang lại vẻ ngoài chỉn chu, sang trọng để chị diện đi làm hay đi tiệc. Hơn nữa, chị vẫn có thể linh hoạt tách chiếc áo ra để phối cùng chân váy đen dáng suông sẵn có ở nhà, giúp thay đổi phong cách và mặc lại được nhiều lần.
```

Review `USABLE_WITH_POLISH`: Chọn cả bộ trong ngân sách và giải thích phối lại áo với chân váy khách đã có. Upsell này có lý do thương mại; không đánh lỗi vì khách đã sở hữu một chân váy. Lý do ngân sách/tính từ còn có thể gọn hơn.

## b1-policy-used-v3

Surface: SEND_ELIGIBILITY_ONLY. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Kết quả thực tế:

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt ạ. Do sản phẩm của chị đã cắt tem và giặt rồi nên shop không hỗ trợ đổi hàng được, chị thông cảm giúp em nhé!
```

Review `USABLE`: Từ chối đúng hàng cắt tem/đã giặt, không kéo khách qua quy trình đổi không hợp lệ.

## stateful-open

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả thực tế:

```text
Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này hiện là hàng đặt trước chị nhé.
```

Review `USABLE`: Nhận áo be M khách tự chọn, báo đã thêm giỏ có receipt và tình trạng đặt trước. Không đọc lại số đo hoặc tự nhận M là size vừa.

## stateful-variant-quantity

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả thực tế:

```text
Em đã đổi thành 2 chiếc áo Thạch Thảo màu be size L cho chị rồi ạ.
```

Review `USABLE`: Đổi đúng be L x2 và xác nhận đúng việc vừa nhờ, không đổi nhầm màu.

## stateful-quote

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Hai áo cả phí ship là bao nhiêu em?

Kết quả thực tế:

```text
Tổng 2 áo Thạch Thảo màu be size L của chị là 978.100đ ạ (tiền hàng 998.000đ, phí ship 30.000đ và được ưu đãi 49.900đ).
```

Review `USABLE_WITH_POLISH`: Tổng978100 và phần ưu đãi/ship rõ, đáp đúng câu hỏi. Cụm liệt kê trong ngoặc dài hơn cần thiết.

## stateful-correction

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả thực tế:

```text
Dạ vâng ạ, em đã ghi nhận số đo mới của chị. 2 áo Thạch Thảo màu be size L của chị vẫn được giữ nguyên trong giỏ nhé ạ!
```

Review `NEEDS_EDIT`: Hồ sơ được sửa nhưng giỏ giữ L đúng yêu cầu. Giọng đã ghi nhận số đo mới/được giữ nguyên trong giỏ vẫn là báo cáo hệ thống, chưa phải lời nhận ngắn tự nhiên.

## stateful-request-checkout

Surface: CAPTURE_TRANSPORT. Terminal: `NO_SEND / CHECKOUT_DETAILS_MISSING`.

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Kết quả thực tế:

```text
Chị cho em [NAME]
```

Review `CODE_CHECKOUT_REDACTED_CAPTURE`: Có tin code xin thông tin nhận hàng. Capture đã redacted thành [NAME], không kết luận bot gửi nguyên marker hay chấm văn phong phần bị che.

## stateful-private-checkout

Surface: CAPTURE_TRANSPORT. Terminal: `NO_SEND / PRIVATE_CHECKOUT_COMMITTED`.

Khách: [Synthetic private checkout fixture: tên/SĐT/địa chỉ/COD; không đưa vào model.]

Kết quả thực tế:

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

Review `CODE_CHECKOUT_REDACTED_CAPTURE`: Code dựng preview riêng tư, tổng978100/ETA/thanh toán; không đưa private fixture vào model. Tên parent Set váy trong dòng áo lẻ còn hơi khó đọc, không lẫn giá cả bộ.

## stateful-confirm

Surface: CAPTURE_TRANSPORT. Terminal: `HANDOFF / PURCHASE_CONFIRMED`.

Khách: Chốt đơn cho chị nhé.

Kết quả thực tế:

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```

Review `EXPECTED_HANDOFF`: Sau preview và xác nhận, thực hiện handoff rồi báo nhân viên kiểm tra/lên đơn; không tự nói đã tạo đơn live.

## stateful-human-request

Surface: CAPTURE_TRANSPORT. Terminal: `HANDOFF / CUSTOMER_REQUESTED_HUMAN`.

Khách: Cho chị gặp nhân viên shop nhé.

Kết quả thực tế:

```text
Em chuyển nhân viên hỗ trợ chị nhé.
```

Review `EXPECTED_HANDOFF`: Yêu cầu gặp người được chuyển và báo đúng, không thêm ảnh/tư vấn ngoài yêu cầu.

## sales-discovery-advice:need

Surface: CAPTURE_TRANSPORT. Terminal: `FALLBACK / OWNER_TOOL_MODE`.

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Kết quả thực tế:

```text
Phần này em chưa trả lời được, chị nhé.
```

Review `NOT_RESOLVED`: Khách cần chọn đồ đi làm, nhưng chỉ nhận câu chưa trả lời được. Không có lựa chọn hoặc bước tiếp theo.

## sales-product-gallery:overview

Surface: CAPTURE_TRANSPORT. Terminal: `FALLBACK / FAIL`.

Khách: Cho chị xem ảnh set Thạch Thảo màu be nhé.

Kết quả thực tế:

```text
Em gửi chị ảnh của mẫu để mình xem trước nhé.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg

Ảnh sequence2: https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg

Review `PARTIAL_RECOVERY`: Khách nhận hai ảnh đúng mẫu và lời dẫn ảnh chung. Đã sửa mất ảnh của recovery; chưa chứng minh ảnh đúng màu be, không coi hoàn thành yêu cầu màu.

## sales-size-advice:height-weight

Surface: CAPTURE_TRANSPORT. Terminal: `HANDOFF / DEPENDENCY_FAILURE`.

Khách: Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.

Kết quả thực tế:

```text
[Không có tin gửi khách]
```

Review `NOT_RESOLVED`: Handoff im lặng, khách không nhận câu trả lời chọn size hoặc câu hỏi bổ sung. Cần chẩn đoán sau primary review; chưa quy nguyên nhân cho model hay chart.

## sales-southern-delivery:deadline

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Kết quả thực tế:

```text
Dạ, set váy Thạch Thảo (mã SV2447) hiện có giá 799.000đ, có các size S, M, L, XL ạ. 

Tuy nhiên, thời gian vận chuyển về Cần Thơ dự kiến từ 4–8 ngày nên không thể kịp giao cho chị vào sáng mai được, shop xin phép không nhận đơn gấp này ạ.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg

Ảnh sequence2: https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg

Review `NEEDS_EDIT`: Đã báo không nhận lịch gấp, nhưng mở đầu bằng giá/mã/danh sách size và ảnh làm loãng câu hỏi thời hạn. Câu không thể kịp giao dễ đọc thành kết luận chắc chắn từ ETA dự kiến; cần giữ riêng giới hạn này.

## media-overview-next:ask

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Em có ảnh khách mặc bộ Thạch Thảo không?

Kết quả thực tế:

```text
Dạ hiện shop chưa có ảnh khách mặc thực tế cho bộ Thạch Thảo này, em gửi chị ảnh mẫu mặc để chị dễ nhìn phom áo tơ thêu và chân váy ren nhé ạ.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg

Ảnh sequence2: https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg

Review `USABLE`: Phân biệt ảnh mẫu với feedback và gửi hai ảnh. Có thể dùng, câu dẫn hơi nhiều mô tả.

## media-overview-next:continue

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Gửi chị ảnh cả bộ nhé.

Kết quả thực tế:

```text
Dạ em gửi chị ảnh mẫu mặc cả bộ áo tơ thêu và chân váy ren Thạch Thảo đây ạ, chị xem phom dáng giúp em nhé.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg

Ảnh sequence2: https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg

Review `USABLE_WITH_POLISH`: Thực hiện đúng yêu cầu tiếp nối và gửi cả bộ. Cụm xem phom dáng giúp em hơi gượng; không làm mất kết quả.

## media-detail-next:ask

Surface: CAPTURE_TRANSPORT. Terminal: `HANDOFF / DEPENDENCY_FAILURE`.

Khách: Bộ Thạch Thảo có ảnh khách mặc chưa em?

Kết quả thực tế:

```text
[Không có tin gửi khách]
```

Review `NOT_RESOLVED`: Không có tin hoặc ảnh cho khách, handoff im lặng. Chẩn đoán kỹ thuật giữ riêng sau primary review.

## media-detail-next:continue

Surface: CAPTURE_TRANSPORT. Terminal: `NO_SEND / HUMAN_OWNS_CONVERSATION`.

Khách: Cho chị xem cận phần thêu ở áo nhé.

Kết quả thực tế:

```text
[Không có tin gửi khách]
```

Review `BLOCKED_BY_PRIOR_HANDOFF`: Lượt sau không chạy tư vấn do quyền đã chuyển HUMAN ở lượt trước. Không đếm thành một lỗi model độc lập mới; vẫn giữ trong denominator.

## media-and-price:ask

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Em gửi chị ảnh khách mặc bộ Thạch Thảo với. Lấy riêng áo thì bao nhiêu?

Kết quả thực tế:

```text
Dạ, shop gửi chị ảnh mẫu mặc set Thạch Thảo nha ạ. Áo lẻ có giá 499.000đ, hiện đủ size từ S đến XL chị nhé.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg

Ảnh sequence2: https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg

Review `USABLE`: Gửi ảnh mẫu, giá áo lẻ và tồn size đúng phạm vi. Dùng được; không gọi ảnh mẫu là ảnh khách.

## media-and-size:ask

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Cho chị xem gần phần thêu áo Thạch Thảo nhé. Chị cao 1m58, nặng 52kg thì lấy size nào?

Kết quả thực tế:

```text
Dạ, em gửi chị ảnh chụp cận cảnh chi tiết thêu ở phần áo ạ. Với chiều cao 1m58 và nặng 52kg, chị mặc size M là vừa đẹp chị nhé.
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/30/a6/9a/19/6fb6d83e276b5589a90244897076dc81aff48c462090ab8ff4bffa45-w:2813-h:4220-l:710250-t:image/jpeg.jpeg

Review `USABLE_PENDING_FIT_PROVENANCE`: Có đúng ảnh cận thêu và trả lời size M. Câu nhắc chiều cao/cân nặng để giải thích lựa chọn, không phải đọc lại hồ sơ ba vòng. Chưa xác nhận fit có code claim trước khi xem diagnostics.

Post-primary provenance: SIZE_FIT của chính SV2447 chọn M, chart reference SQ2447 theo owner delegation; đã xác nhận trong PREFIX_DIAGNOSTICS/PREFIX_REVIEW.

## media-decision:ask

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Kết quả thực tế:

```text
Chị yên tâm nha, mẫu này áo làm bằng chất tơ Hàn thêu nổi nhẹ nhàng, thoáng và mềm mại, kết hợp với chân váy ren tơ rũ tự nhiên nên mặc đi ăn cưới buổi trưa rất sang, thanh lịch và không bị nóng bức đâu ạ. Phần ren của chân váy tạo độ bay rủ mềm mại chứ không bị rườm rà hay quá cầu kỳ. 

Nếu mình vẫn thích áo thêu mà muốn tiết chế bớt phần ren, chị có thể chọn mua lẻ áo (499.000đ) để phối với chân váy trơn sẵn có trong tủ, hoặc lấy nguyên set (799.000đ) để diện trọn bộ đồng điệu ạ. Chị xem qua hình ảnh mẫu mặc để dễ hình dung độ bồng bềnh của thiết kế nhé!
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg

Ảnh sequence2: https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg

Review `NEEDS_EDIT`: Dài, nhiều lời khen và hai cách mua rồi để khách tự chọn. Tự giả định khách có chân váy trơn trong tủ. Câu không bị nóng bức chắc hơn thông tin thoáng/mềm; ghi residual, không tự đổi verdict sau run.

## negotiation-cart-setup

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả thực tế:

```text
Dạ, em đã thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order), giá áo là 499.000đ (tổng giỏ hàng hiện tại gồm 30.000đ phí vận chuyển là 529.000đ).
```

Review `USABLE_WITH_POLISH`: Đúng áo be M và giá/tổng; nhiều ngoặc và cụm tổng giỏ hàng nghe hệ thống.

## negotiation-price-objection

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Bớt cho chị chút được không?

Kết quả thực tế:

```text
Dạ, mức giá 499.000đ là giá niêm yết của áo lẻ và shop đã hỗ trợ ưu đãi 30.000đ phí vận chuyển vào tổng giỏ hàng cho chị rồi ạ. Chị yên tâm đặt mẫu này nhé ạ!
```

Review `USABLE_WITH_POLISH`: Dùng hỗ trợ ship có code quote để xử lý phản đối giá, không tự đặt mức giảm. Câu giá niêm yết/tổng giỏ hàng hơi hành chính.

## negotiation-total-control

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Thế một áo cả ship là bao nhiêu em?

Kết quả thực tế:

```text
Dạ, tổng thanh toán gồm cả áo và phí ship của mình là 499.000đ ạ (giá áo 499.000đ, phí ship 30.000đ đã được shop hỗ trợ ưu đãi trừ trực tiếp vào đơn cho chị rồi ạ).
```

Review `USABLE_WITH_POLISH`: Tổng499k trả đúng sau hỗ trợ ship. Ngoặc giải thích ba khoản làm dài câu hỏi tổng tiền đơn giản.

## opening-ad

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Bộ này bao nhiêu em?

Kết quả thực tế:

```text
Dạ, set váy Thạch Thảo có giá 799.000đ ạ. Mẫu này hiện đủ size S, M, L, XL chị nhé.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg

Ảnh sequence2: https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg

Review `USABLE`: Bind đúng mẫu từ ads, báo giá cả set và gửi ảnh đúng mẫu.

## opening-ad-repeat

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Kết quả thực tế:

```text
Dạ, set váy Thạch Thảo có giá 799.000đ chị nhé.
```

Review `USABLE`: Dùng lịch sử thật, chỉ trả lại giá; không gửi ảnh hay khối mở đầu lần nữa.

## opening-organic

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Kết quả thực tế:

```text
Dạ, set váy Thạch Thảo hiện có giá 799.000đ ạ. Sản phẩm có đủ các size S, M, L, XL chị nhé!
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg

Ảnh sequence2: https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg

Review `USABLE`: Đúng sản phẩm do khách nêu, giá cả bộ và ảnh. Không nhầm first contact với ads.

## opening-unresolved

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Mẫu này giá sao em?

Kết quả thực tế:

```text
Dạ chị gửi giúp em hình ảnh hoặc tên mẫu chị đang xem để em kiểm tra và báo giá chính xác cho mình nhé ạ!
```

Review `USABLE`: Không bịa mẫu/giá từ ads chưa bind, xin ảnh hoặc tên để tra; bước dùng được.

## opening-multipart

Surface: CAPTURE_TRANSPORT. Terminal: `SEND_ELIGIBLE / PASS`.

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Kết quả thực tế:

```text
Dạ, set váy Thạch Thảo có giá 799.000đ ạ. 

Chị hoàn toàn có thể mua áo riêng được nhé ạ, áo lẻ có giá 499.000đ ạ.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh sequence1: https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg

Ảnh sequence2: https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg

Review `USABLE`: Trả đủ giá bộ và có bán áo riêng/giá áo, kèm ảnh. Có thể gọn từ hoàn toàn/ạ nhưng vẫn dùng được.
