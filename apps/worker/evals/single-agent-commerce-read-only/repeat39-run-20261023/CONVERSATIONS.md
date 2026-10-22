# Full39 — hội thoại actual, 23/10/2026

Source `01e689b4c4f002cfd085b4038837901a14256a3e`; N1. 24 B1 + 8 stateful + 4 openings + 3 negotiation. Captured delivery only, không gửi khách thật. Actual được review trước rejected draft; generic image markers là attachment code đã capture. Private checkout đã redacted, không suy chất lượng toàn bộ lời riêng tư từ bản redacted.


## 1. b1 / b1-changed-occasion

Raw: [attempt](raw/b1-1/attempt-1.json). Terminal: **FALLBACK / OWNER_TOOL_MODE**.

Lịch sử đầu vào:

```text
customer: Chị định lấy set Thạch Thảo mặc đi đám cưới.
```


```text
shop: Đi đám cưới mặc bộ này đẹp chị ạ.
```


Khách:

```text
Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.
```


Kết quả khách nhận:

```text
Phần này em chưa trả lời được, chị nhé.
```


Review: **FALLBACK** — Actual static fallback, OWNER_TOOL_MODE. Sau2toolrounds, owner generation3 vẫn trả functionCall khi modeNONE. Lượt trước gửi được; không có finaldraft hợp lệ để chấm giọng.


## 2. b1 / b1-current-policy

Raw: [attempt](raw/b1-2-8/attempt-2.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử đầu vào:

```text
customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.
```


Khách:

```text
Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?
```


Kết quả khách nhận:

```text
Dạ thời hạn đổi hàng của shop là trong vòng 15 ngày kể từ khi nhận hàng, nên đơn nhận 10 hôm của chị vẫn kịp đổi ạ. Phí vận chuyển 2 chiều cho việc đổi hàng là 30.000đ chị nha.
```


Review: **USABLE** — Trả đúng15ngày và phíship2chiều30k cho mốc10ngày; không đọc checklist hoặc tự dùng policy lịch sử.


## 3. b1 / b1-partial-source

Raw: [attempt](raw/b1-2-8/attempt-3.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.
```


Kết quả khách nhận:

```text
Set váy Thạch Thảo có phần áo làm từ tơ Hàn thêu với họa tiết thêu nổi, chất vải mềm, thoáng và có độ bay tự nhiên; chân váy bằng ren tơ Hàn mềm, form nhẹ, có độ rũ tự nhiên chị nhé.

Dạ hiện hệ thống bên em chưa tra cứu được chính xác giá bán và tình trạng tồn kho của size M ạ.
```


Review: **USABLE** — FaultPOS_UNAVAILABLE: trả được chất liệu, không bịa giá/tồn M. Còn câu mô tả dài và chữ hệ thống, cùng polish/source limitation lượt trước; không đổi chuẩn chấm.


## 4. b1 / b1-price

Raw: [attempt](raw/b1-2-8/attempt-4.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?
```


Kết quả khách nhận:

```text
Dạ, set Thạch Thảo có giá 799.000đ cho cả bộ chị nhé. Nếu mình muốn mua lẻ thì áo giá 499.000đ và chân váy giá 449.000đ ạ.
```


Review: **USABLE** — Giá bộ799k trước, thêm giá mua lẻ499/449k ngắn và đúng; không mở lại quyết định khách đang nhờ chọn.


## 5. b1 / b1-component-stock

Raw: [attempt](raw/b1-2-8/attempt-5.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?
```


Kết quả khách nhận:

```text
Dạ áo Thạch Thảo size M bên em còn hàng chị nhé. Áo bán riêng có giá 499.000đ ạ.
```


Review: **USABLE** — Đúng áo M còn hàng,499k; gọn và không khẳng định fit.


## 6. b1 / b1-search-read

Raw: [attempt](raw/b1-2-8/attempt-6.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.
```


Kết quả khách nhận:

```text
Dạ, áo dài mã SD375 có giá 929.000đ cho áo lẻ và 1.065.000đ nếu chị lấy cả bộ ạ.
```


Review: **USABLE** — Đúng SD375, giááo929k/bộ1.065k, phân biệt hai cách mua rõ và ngắn.


## 7. b1 / b1-buying-concern

Raw: [attempt](raw/b1-2-8/attempt-7.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.
```


Kết quả khách nhận:

```text
Dạ set này mặc đi tiệc ban ngày rất hợp và không bị rườm rà đâu chị nhé, vì chất ren tơ Hàn mềm mại kết hợp form nhẹ nhàng và có độ rũ tự nhiên, tạo cảm giác thanh thoát, bay bổng.

Trọn bộ có giá 799.000đ, hoàn toàn vừa vặn trong ngân sách 900 nghìn của mình ạ.
```


Review: **USABLE** — Có hướng lấy bộ cho tiệc ban ngày, đúng giá799k. Vẫn gom mềm/nhẹ/rũ/thanhthoát/baybổng và lặp ngân sách; cùng mức dùngđược/cầnpolish như lượt trước, chưa cải thiện giọng rõ.


## 8. b1 / b1-policy-used

Raw: [attempt](raw/b1-2-8/attempt-8.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?
```


Kết quả khách nhận:

```text
Dạ, sản phẩm mình đã mặc đi làm rồi nên không đủ điều kiện đổi hàng ạ, vì quy định đổi hàng yêu cầu sản phẩm chưa qua sử dụng. Nếu được đổi hợp lệ, tổng phí vận chuyển 2 chiều là 30.000đ chị nhé.
```


Review: **USABLE** — Từ chối đổi đúng vì đã mặc đi làm, tách phí cho trường hợp đổi hợp lệ. Không cho phép trước rồi phủ định sau, không thiếu checklist làm sai quyết định.


## 9. b1 / b1-changed-occasion-v2

Raw: [attempt](raw/b1-9/attempt-9.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử đầu vào:

```text
customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.
```


```text
shop: Tiệc trưa mặc bộ này xinh chị ạ.
```


Khách:

```text
Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?
```


Kết quả khách nhận:

```text
Áo dùng chất tơ Hàn mềm, thoáng cùng độ bay tự nhiên, kết hợp chân váy ren tơ mềm nhẹ nên mặc rất thoải mái, không bị hầm bí ở ngoài trời đâu chị ạ.
```


Review: **USABLE** — Trả trực tiếp về cảm giác mặc từ nguồn vải thoáng/nhẹ và ren mềm, ngắn hơn lượt trước. Cụm không hầm bí ngoài trời khá mạnh nhưng nằm vùng ordinary material inference đã được chấp nhận; không tự chấm thiếu labtest là lỗi. Chưa chứng minh ổn định từ một lượt.


## 10. b1 / b1-current-policy-v2

Raw: [attempt](raw/b1-10-14/attempt-10.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử đầu vào:

```text
customer: Lần trước chị nhớ phí đổi là 25 nghìn.
```


Khách:

```text
Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?
```


Kết quả khách nhận:

```text
Dạ mình đổi size vẫn kịp chị nhé, vì thời hạn đổi hàng là trong vòng 15 ngày kể từ ngày nhận hàng. Phí vận chuyển 2 chiều cho việc đổi hàng là 30.000đ chị nha.
```


Review: **USABLE** — Trả còn trong15ngày và phíshiphai chiều30k, không checklist thừa hay policy cũ.


## 11. b1 / b1-partial-source-v2

Raw: [attempt](raw/b1-10-14/attempt-11.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.
```


Kết quả khách nhận:

```text
Chân váy được làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị ạ. Hiện thông tin giá và tình trạng tồn kho của size M chưa cập nhật nên em chưa báo chính xác được cho chị nhé.
```


Review: **USABLE** — Lượt này trả phần chânváyren/mềm/phom nhẹ và nói chưa báo giá/tồn M trong faultPOS_UNAVAILABLE. Dùngđược với cùng source mode; lỗi transport lượt trước không lặp, không coi prompt đã sửa.


## 12. b1 / b1-price-v2

Raw: [attempt](raw/b1-10-14/attempt-12.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử đầu vào:

```text
customer: Chị đang xem bộ Thạch Thảo bên mình.
```


Khách:

```text
Cho chị xin giá cả bộ với em.
```


Kết quả khách nhận:

```text
Dạ, set váy Thạch Thảo có giá 799.000đ chị nhé.
```


Review: **USABLE** — Đúng giá bộ799k, gọn đúng câu hỏi.


## 13. b1 / b1-component-stock-v2

Raw: [attempt](raw/b1-10-14/attempt-13.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử đầu vào:

```text
customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.
```


Khách:

```text
Chân váy size M còn không em, mua riêng là bao nhiêu?
```


Kết quả khách nhận:

```text
Dạ, chân váy size M set Thạch Thảo nhà em còn hàng chị nhé, mua riêng có giá 449.000đ ạ.
```


Review: **USABLE** — Đúng chânváy M còn và giá449k, không lẫn áo/cảbộ.


## 14. b1 / b1-search-read-v2

Raw: [attempt](raw/b1-10-14/attempt-14.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.
```


Kết quả khách nhận:

```text
Dạ, shop có set váy Khánh Trang chị nhé. Mẫu này có giá 999.000đ cho cả bộ, hoặc chị có thể mua lẻ áo và chân váy với giá 499.000đ mỗi món ạ.

Chị muốn lấy cả set hay mua lẻ món nào ạ?
```


Review: **USABLE** — Tìm đúng KhánhTrang, báo bộ999k và áo/váy499k mỗi món. Câu hỏi chốt dư nhẹ nhưng chưa làm mất câu trả lời; giữ tiêu chí như lượt trước.


## 15. b1 / b1-buying-concern-v2

Raw: [attempt](raw/b1-15/attempt-15.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?
```


Kết quả khách nhận:

```text
Dạ, set Thạch Thảo rất hợp mặc đi ăn cưới ban ngày vì chất liệu tơ Hàn và ren mềm có độ bay, rũ tự nhiên, mang lại vẻ thanh lịch, nhã nhặn chứ không bị cứng hay quá cầu kỳ.

Tuy nhiên, vì áo có họa tiết thêu nổi và chân váy bằng ren, nếu chị quen mặc đồ trơn và sợ tổng thể hơi điệu, mình có thể chọn mua riêng áo lẻ hoặc chân váy lẻ để dễ phối hơn theo sở thích tối giản của mình chị nhé.
```


Review: **NEEDS_EDIT** — Vẫn khen cả bộ rồi mở mua riêng áo hoặc váy; khách hỏi nên lấy không nhưng chưa có hướng mua rõ. Câu dài và nhắc lại thói quen đồtrơn. Cùng lỗi lựa chọn ở lượt trước, dù verifier PASS.


## 16. b1 / b1-policy-used-v2

Raw: [attempt](raw/b1-16-24/attempt-16.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?
```


Kết quả khách nhận:

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải chỉ ướm bên ngoài chứ không mặc trực tiếp vào người. Vì mình đã mặc thử vào người rồi nên shop chưa thể hỗ trợ đổi size trong trường hợp này, mong chị thông cảm giúp em nhé.
```


Review: **USABLE** — Từ chối đổi vì đã mặc thử, không nhầm chỉướm hay cho phép thử trongnhà. Lời xin thông cảm hơi dài nhưng đúng nghĩa policy.


## 17. b1 / b1-changed-occasion-v3

Raw: [attempt](raw/b1-16-24/attempt-17.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử đầu vào:

```text
customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.
```


```text
shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.
```


Khách:

```text
Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?
```


Kết quả khách nhận:

```text
Chị lấy áo lẻ (499.000đ) sẽ gọn gàng và phù hợp hơn cho buổi gặp khách hàng ạ. Áo có form nhẹ, tơ thêu nổi thanh lịch, khi phối cùng quần âu hoặc chân váy ôm sẵn có của mình sẽ tạo nét sắc sảo và chuyên nghiệp hơn.

Chân váy ren trong set có độ rũ và bay tự nhiên nên thiên về nét thướt tha, mềm mại nhiều hơn chị nhé.
```


Review: **USABLE** — Chọn áo lẻ499k theo dịp gặp khách và nhu cầu gọn. Dài hơn lượt trước, nhiều tính từ sắc sảo/chuyênnghiệp/thướttha; lời khuyên dùng được nhưng giọng chưa ổn định.


## 18. b1 / b1-current-policy-v3

Raw: [attempt](raw/b1-16-24/attempt-18.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử đầu vào:

```text
customer: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.
```


Khách:

```text
Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?
```


Kết quả khách nhận:

```text
Dạ, chính sách của bên em hỗ trợ đổi hàng trong vòng 15 ngày kể từ ngày nhận nên mình vẫn đổi size được bình thường chị nhé.
```


Review: **USABLE** — Đúng15ngày cho mốc9ngày/khách chỉmởxem, không tự giả định khách giặt/mặc rồi chặn.


## 19. b1 / b1-partial-source-v3

Raw: [attempt](raw/b1-16-24/attempt-19.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?
```


Kết quả khách nhận:

```text
Dạ, áo của set làm từ tơ Hàn thêu với họa tiết thêu nổi, chất vải mềm, thoáng và có độ bay tự nhiên; chân váy bằng ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé.

Hiện tại thông tin giá và tình trạng còn hàng của set này hệ thống bên em chưa cập nhật ạ.
```


Review: **USABLE** — Đủ phần chất liệu khi POS_UNAVAILABLE, không bịa giá/tồn. Vẫn chép mô tả dài và nói hệ thống chưa cập nhật; cùng mức polish như ca sourcefault trước.


## 20. b1 / b1-price-v3

Raw: [attempt](raw/b1-16-24/attempt-20.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Nguyên set Thạch Thảo bao nhiêu tiền em?
```


Kết quả khách nhận:

```text
Nguyên set Thạch Thảo có giá 799.000đ chị nhé, hiện set đang có sẵn hàng ạ.
```


Review: **USABLE** — Đúng giá799k/có sẵn ở scope cảbộ chưa chọn biến thể, gọn hơn lượt trước.


## 21. b1 / b1-component-stock-v3

Raw: [attempt](raw/b1-16-24/attempt-21.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.
```


Kết quả khách nhận:

```text
Dạ, áo Thạch Thảo có bán lẻ chị nha. Áo size M hiện có sẵn, giá 499.000đ ạ.
```


Review: **USABLE** — Trả đúng có áo lẻM/có sẵn/499k, gọn đúng nhu cầu.


## 22. b1 / b1-search-read-v3

Raw: [attempt](raw/b1-16-24/attempt-22.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.
```


Kết quả khách nhận:

```text
Dạ mẫu Set quần Xuân Thảo (SQ223) bên em hiện vẫn còn hàng chị nhé. Sản phẩm có giá 699.000đ cho nguyên bộ, hoặc chị có thể chọn mua lẻ áo hoặc quần với giá 429.000đ mỗi món ạ.
```


Review: **USABLE** — ĐúngSQ223còn và giá699k/bộ,429k/mónlẻ; không có list dài hoặc hỏi lại vô ích.


## 23. b1 / b1-buying-concern-v3

Raw: [attempt](raw/b1-16-24/attempt-23.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử đầu vào:

```text
customer: Chị có sẵn chân váy đen dáng suông rồi.
```


Khách:

```text
Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.
```


Kết quả khách nhận:

```text
Chị lấy cả bộ Thạch Thảo (799.000đ) giúp em nhé, vừa khít với ngân sách 850 nghìn của chị ạ.

Mua cả bộ giúp chị có sẵn set áo tơ thêu và chân váy ren đồng bộ mặc rất nhã nhặn, sang trọng, đồng thời chiếc áo này chị vẫn dễ dàng phối linh hoạt với chân váy đen dáng suông sẵn có của mình để đổi mới phong cách cho nhiều dịp khác nhau.
```


Review: **USABLE** — Chọn cảbộ799k, giải thích có thêm cách diện đồngbộ và vẫn phối áo với váyđen đã có. Khác lượt trước chọn áo, vẫn hợp lệ vì có lý do mua thêm; còn giúpem/vừakhítngânsách và quảngcáo dài. Không ép đáp án muaáo duy nhất.


## 24. b1 / b1-policy-used-v3

Raw: [attempt](raw/b1-16-24/attempt-24.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?
```


Kết quả khách nhận:

```text
Dạ, quy định đổi hàng bên em yêu cầu sản phẩm còn nguyên tem và chưa giặt ạ. Do sản phẩm của chị đã cắt tem và giặt rồi nên shop không hỗ trợ đổi sang mẫu khác được, chị thông cảm giúp em nhé.
```


Review: **USABLE** — Từ chối đúng vì cắt tem/giặt; không lấy chưa mặc ngoài làm đủ điều kiện. Còn dẫn quy định/thôngcảm nhưng không sai chính sách.


## 25. stateful / stateful-open

Raw: [attempt](raw/stateful/provider-attempt-1.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
```


Kết quả khách nhận:

```text
Em đã thêm áo Thạch Thảo màu be size M (hàng đặt trước) vào giỏ cho chị rồi ạ.
```


Review: **USABLE** — Nhận đúng áo be M khách chọn, nói hàng đặt trước; gọn, không đọc lại số đo hoặc tự khẳng định fit. Khách chưa hỏi tổng nên không bắt buộc chèn quote.


## 26. stateful / stateful-variant-quantity

Raw: [attempt](raw/stateful/provider-attempt-2.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Đổi áo sang L cho chị, lấy hai chiếc nhé.
```


Kết quả khách nhận:

```text
Em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc (hàng đặt trước) trong giỏ cho chị rồi ạ.
```


Review: **USABLE** — Xác nhận đúng đổi L và2chiếc, giữ đặt trước. Cụm cập nhật số lượng hơi văn hệ thống nhưng có ích sau tác vụ khách vừa nhờ; không đánh lỗi chỉ do từ cập nhật.


## 27. stateful / stateful-quote

Raw: [attempt](raw/stateful/provider-attempt-3.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Hai áo cả phí ship là bao nhiêu em?
```


Kết quả khách nhận:

```text
Dạ, 2 chiếc áo Thạch Thảo màu be size L của chị có tổng cộng 978.100đ (đã gồm 30.000đ phí ship và được giảm 49.900đ ưu đãi) chị nhé.
```


Review: **USABLE** — Trả đúng tổng978.100đ gồm ship30k/ưuđãi49.900đ. Ngoặc giúp phân biệt tiền, không đọc lại hồ sơ hoặc chốt fit.


## 28. stateful / stateful-correction

Raw: [attempt](raw/stateful/provider-attempt-4.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.
```


Kết quả khách nhận:

```text
Dạ vâng chị, giỏ hàng 2 áo size L của chị vẫn được giữ nguyên ạ.
```


Review: **USABLE** — Nhận lời và xác nhận giữ hai áo L, không đọc lại eo/mông hay báo cáo cập nhật hồ sơ. Lượt trước malformed fallback, nay dùng được với cùng prompt/code; đây là repeat variation, không treatment improvement.


## 29. stateful / stateful-request-checkout

Raw: [attempt](raw/stateful/provider-attempt-5.json). Terminal: **NO_SEND / CHECKOUT_DETAILS_MISSING**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Chị đặt hai áo này nhé, lên đơn cho chị.
```


Kết quả khách nhận:

```text
Chị cho em [NAME]
```


Review: **USABLE** — Code mở bước xin thông tin đặt hàng, có capture thực; raw NO_SEND không phải im lặng. Bản capture đã redacted thành Chị cho em [NAME], không đủ để chấm toàn bộ wording riêng tư; lượt sau thực đi vào private intake. Actual text giống lượt trước; đã đối chiếu lại lượt này.


## 30. stateful / stateful-private-checkout

Raw: [attempt](raw/stateful/provider-attempt-6.json). Terminal: **NO_SEND / PRIVATE_CHECKOUT_COMMITTED**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
[PRIVATE_CHECKOUT_SYNTHETIC_FORM — CODE ONLY]
```


Kết quả khách nhận:

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


Review: **USABLE** — Private intake code-only tạo preview hai áo L, đúng tổng978.100đ/discount49.900đ/ship30k, trạng thái đặt trước, ETA8–14ngày và xin xác nhận. Danh sách trong preview có ích; identity mẫu set kèm áo còn hơi hệ thống nhưng không nhầm món. Actual text giống lượt trước; đã đối chiếu lại lượt này.


## 31. stateful / stateful-confirm

Raw: [attempt](raw/stateful/provider-attempt-7.json). Terminal: **HANDOFF / PURCHASE_CONFIRMED**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Chốt đơn cho chị nhé.
```


Kết quả khách nhận:

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```


Review: **USABLE** — Chốt preview đi qua PURCHASE_CONFIRMED và tin chuyển nhân viên kiểm tra/lên đơn, không tuyên bố đã tạo đơn POS. Có phản hồi thực sau commit. Actual text giống lượt trước; đã đối chiếu lại lượt này.


## 32. stateful / stateful-human-request

Raw: [attempt](raw/stateful/provider-attempt-8.json). Terminal: **HANDOFF / CUSTOMER_REQUESTED_HUMAN**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Cho chị gặp nhân viên shop nhé.
```


Kết quả khách nhận:

```text
Em chuyển nhân viên hỗ trợ chị nhé.
```


Review: **USABLE** — First handoff theo yêu cầu khách có tin Em chuyển nhân viên hỗ trợ chị nhé sau commit. Đã cải thiện rõ so ca32 trước vốn silent; vẫn không phải receipt nhân viên đã nhận hay xử lý. Actual text giống lượt trước; đã đối chiếu lại lượt này.


## 33. openings / sales-discovery-advice:need

Raw: [attempt](raw/openings/provider-attempt-1.json). Terminal: **FALLBACK / FAIL**.

Khách:

```text
Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.
```


Kết quả khách nhận:

```text
Phần này em chưa trả lời được, chị nhé.
```


Review: **FALLBACK** — Actual static fallback sau verifier FAIL, cùng scenario lỗi lượt trước. Chưa gọi là thiếu source hoặc chặn quá tay trước khi đối chiếu draft/reads; actual không giúp chọn bộ đi làm.


## 34. openings / sales-product-gallery:overview

Raw: [attempt](raw/openings/provider-attempt-2.json). Terminal: **SEND_ELIGIBLE / PASS**.

Khách:

```text
Cho chị xem ảnh set Thạch Thảo màu be nhé.
```


Kết quả khách nhận:

```text
Dạ set Thạch Thảo hiện hệ thống chưa có phân loại màu riêng, em gửi chị ảnh chung của mẫu thiết kế này nhé ạ. Set gồm áo tơ Hàn thêu nổi và chân váy ren tơ Hàn mềm mại, giá 799.000đ và đang sẵn hàng ạ.
[CODE_IMAGE]
[CODE_IMAGE]
```


Review: **NEEDS_EDIT** — Gửi hai ảnh chung hợp lệ nhưng vẫn nói hệ thống chưa có phân loại màu riêng và chèn mô tả/giá. Cùng lỗi dùng ngôn ngữ dữ liệu nội bộ, không đi thẳng việc xin ảnh. Không gọi media authority hỏng.


## 35. openings / sales-size-advice:height-weight

Raw: [attempt](raw/openings/provider-attempt-3.json). Terminal: **HANDOFF / SIZE_RULE_UNAVAILABLE**.

Khách:

```text
Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.
```


Kết quả khách nhận:

```text
Em chuyển nhân viên chọn size cho chị nhé.
```


Review: **USABLE** — Handoff chọn size có lời xác nhận, giữ đúng giới hạn thiếu chart đúng sản phẩm; không đoán fit hoặc xin đủ ba vòng vô ích. Source gap vẫn chưa đóng.


## 36. openings / sales-southern-delivery:deadline

Raw: [attempt](raw/openings/provider-attempt-4.json). Terminal: **FALLBACK / PROVIDER_ERROR**.

Khách:

```text
Chị cần bộ này sáng thứ Sáu, ship về Cần Thơ có kịp không em?
```


Kết quả khách nhận:

```text
Phần này em chưa trả lời được, chị nhé.
```


Review: **FALLBACK** — Actual static fallback PROVIDER_ERROR, khác lượt trước verifierFAIL. Chưa có cơ sở coi deadline boundary đã được sửa hoặc lại chặn cùng draft; kiểm lỗi generation riêng.


## 37. negotiation / negotiation-cart-setup

Raw: [attempt](raw/negotiation/provider-attempt-1.json). Terminal: **SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.
```


Kết quả khách nhận:

```text
Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```


Review: **USABLE** — Actual code receipt summary xác nhận thêm giỏ/tổng529k/đặt trước. Verifier đã trả verdict nhưng final gate phát hiện snapshotSTALE; code phục hồi có receipt/currentquote, không dùng draft cũ làm actual. Không gọi đây providererror.


## 38. negotiation / negotiation-price-objection

Raw: [attempt](raw/negotiation/provider-attempt-2.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Bớt cho chị chút được không?
```


Kết quả khách nhận:

```text
Dạ, em hỗ trợ mình giảm 30.000đ phí vận chuyển, tổng đơn của mình còn 499.000đ chị nhé.
```


Review: **USABLE** — Trả ngay hỗ trợ30k và tổng499k cho giỏ hiện tại, không ép mua2 như lượt trước. Dùng được với cùng prompt/code; cần giữ là repeat variation, không nhận treatment đã chữa root cause.


## 39. negotiation / negotiation-total-control

Raw: [attempt](raw/negotiation/provider-attempt-3.json). Terminal: **SEND_ELIGIBLE / PASS**.

Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.

Khách:

```text
Thế một áo cả ship là bao nhiêu em?
```


Kết quả khách nhận:

```text
Dạ, áo giá 499.000đ, tính cả phí giao hàng sau khi được shop hỗ trợ 30.000đ tiền ship thì tổng đơn của mình là 499.000đ chị nhé.
```


Review: **USABLE** — Trả đúng tổng499k gồm ship sau ưuđãi30k. Nói ưuđãi dưới dạng hỗ trợship, không tự cấp quyền giảm thêm. Đối chiếu ledger version/evidence không tăng để kiểm ordinarytotalcontrol.


# Rejected drafts — chỉ để chẩn đoán, không chấm như đã gửi


## b1-changed-occasion

```text
[KHÔNG CÓ FINAL DRAFT HỢP LỆ]
```


```text
[VERIFIER KHÔNG TRẢ VERDICT / KHÔNG ĐƯỢC GỌI]
```



## sales-discovery-advice:need

```text
Dạ, em gợi ý chị set quần Uyển Hoa giá 799.000đ ạ. Set gồm áo và quần short lưng chun co giãn thoải mái, không lo bị bó bụng, thiết kế nhã nhặn rất hợp mặc đi làm. Chất vải thô đũi mềm mịn, thoáng mát lắm ạ.

Chị xem mình mặc size S, M, L hay XL để em kiểm tra kho cho chị nhé ạ!
```


```text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SQ748"}]}
```



## sales-southern-delivery:deadline

```text
[KHÔNG CÓ FINAL DRAFT HỢP LỆ]
```


```text
[VERIFIER KHÔNG TRẢ VERDICT / KHÔNG ĐƯỢC GỌI]
```



## negotiation-cart-setup

```text
Dạ, em đã thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho mình rồi ạ. Mẫu này hiện là hàng đặt trước chị nhé!
```


```text
{"verdict":"PASS","violations":[]}
```

