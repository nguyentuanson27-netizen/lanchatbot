# Các hội thoại còn lại — actual terminal trước chẩn đoán

18B1 và7stateful, mỗi ca một lần, nguồn099ed3ab. B1 chỉ đo eligibility; stateful dùng delivery capture trong test DB đã drop. Sáu ca cũ giữ ở offer-read-run-20261016, không chạy lại.

## B1 7. b1-current-policy

**Khách trước:** Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

**Khách:** Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

**Kết quả SEND_ELIGIBLE:**

Dạ vẫn kịp chị nhé, thời hạn đổi hàng của shop là trong vòng 15 ngày kể từ khi nhận đơn nên chị nhận 10 hôm vẫn trong hạn ạ. Phí đổi hàng (vận chuyển 2 chiều) là 30.000đ và shop hỗ trợ đổi màu chị nha.

**Review:** USABLE — Trả đúng thời hạn và phí hiện hành, sửa thông tin 7 ngày trong lịch sử. Khách hỏi còn kịp theo thời gian, không coi việc thiếu checklist là lỗi cấp quyền.

## B1 8. b1-partial-source

**Khách:** Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

**Kết quả SEND_ELIGIBLE:**

Set váy Thạch Thảo được may kết hợp giữa tơ Hàn thêu cao cấp cho áo và ren tơ Hàn mềm mại cho chân váy, mang lại cảm giác nhẹ nhàng, bay bổng. Hiện tại hệ thống chưa cập nhật được chính xác giá và tình trạng tồn kho size M, chị thông cảm giúp shop nhé ạ.

**Review:** USABLE — Control POS_UNAVAILABLE: trả đúng chất liệu áo/váy, giữ phần đã biết và nói phần giá/tồn chưa tra được. Giọng còn giống catalog và mô tả hệ thống; cùng mức chấp nhận partial answer đã dùng cho ca cũ11, chưa là mua hàng hoàn chỉnh.

## B1 9. b1-price

**Khách:** Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

**Kết quả SEND_ELIGIBLE:**

Set Thạch Thảo có giá 799.000đ cả set ạ. Nếu mua lẻ, áo có giá 499.000đ và chân váy là 449.000đ chị nha.

**Review:** USABLE — Giá cả set đúng; bổ sung giá món lẻ có ích để phân biệt lựa chọn, không tự coi thông tin thêm là lỗi.

## B1 10. b1-component-stock

**Khách:** Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

**Kết quả SEND_ELIGIBLE:**

Áo Thạch Thảo size M còn hàng chị nhé, giá bán riêng là 499.000đ ạ.

**Review:** USABLE — Trả thẳng tồn và giá của riêng áo size M, không gán giá cả set hoặc tự nhận đã thêm giỏ.

## B1 11. b1-policy-used

**Khách:** Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

**Kết quả SEND_ELIGIBLE:**

Dạ quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên vẹn, chưa qua sử dụng và chưa giặt ạ. Do chị đã mặc đi làm rồi nên shop rất tiếc chưa thể hỗ trợ mình đổi sang màu khác được, mong chị thông cảm nhé ạ.

**Review:** USABLE — Từ chối đúng việc khách đã mặc đi làm, không đọc checklist để cho phép lại việc bị cấm. Khi không nhận đổi thì không cần báo một khoản phí như thể sẽ xử lý đổi.

## B1 12. b1-current-policy-v2

**Khách trước:** Lần trước chị nhớ phí đổi là 25 nghìn.

**Khách:** Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

**Kết quả SEND_ELIGIBLE:**

Dạ chị nhận hàng 12 ngày nên vẫn kịp đổi size ạ (thời hạn đổi là 15 ngày). Phí đổi hai chiều hiện là 30.000đ chị nhé.

**Review:** USABLE — Dùng đúng thời hạn 15 ngày và phí hai chiều 30k thay phí cũ, trả đúng phạm vi câu hỏi thời gian/phí.

## B1 13. b1-price-v2

**Khách trước:** Chị đang xem bộ Thạch Thảo bên mình.

**Khách:** Cho chị xin giá cả bộ với em.

**Kết quả SEND_ELIGIBLE:**

Set váy Thạch Thảo nguyên bộ có giá 799.000đ chị nhé.

**Review:** USABLE — Hiểu nguyên bộ qua lịch sử và trả đúng799k, ngắn và tự nhiên.

## B1 14. b1-component-stock-v2

**Khách trước:** Chị chỉ muốn lấy chân váy của set Thạch Thảo.

**Khách:** Chân váy size M còn không em, mua riêng là bao nhiêu?

**Kết quả SEND_ELIGIBLE:**

Chân váy size M còn hàng chị nhé, mua riêng có giá 449.000đ ạ.

**Review:** USABLE — Giữ đúng referent chân váy, size M và giá449k; không lẫn áo/cả set.

## B1 15. b1-search-read-v2

**Khách:** Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

**Kết quả SEND_ELIGIBLE:**

Dạ shop có sẵn set váy Khánh Trang chị nha. Mẫu này mình có thể mua lẻ áo hoặc chân váy (đều 499.000đ/món) hoặc mua cả set là 999.000đ ạ.

**Review:** USABLE — Tìm đúng Khánh Trang, nêu giá999k cả set và499k từng món từ lựa chọn bán hiện hành. Không dùng kết quả gần giống.

## B1 16. b1-policy-used-v2

**Khách:** Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

**Kết quả SEND_ELIGIBLE:**

Dạ quy định của shop là sản phẩm chỉ hỗ trợ ướm bên ngoài chứ không mặc vào khi thử, nên shop rất tiếc chưa thể hỗ trợ đổi size cho trường hợp đã mặc thử ạ.

**Review:** USABLE — Hiểu mặc vào thử trong phòng khác ướm bên ngoài, từ chối đổi theo nguồn hiện tại; không suy sạch/còn tem thành đủ quyền.

## B1 17. b1-changed-occasion-v3

**Khách trước:** Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

**Shop trước:** Đi tiệc tối mặc cả bộ đẹp chị ạ.

**Khách:** Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

**Kết quả SEND_ELIGIBLE:**

Mặc cả bộ vẫn là lựa chọn lịch sự và chuyên nghiệp nhất khi gặp khách hàng chị ạ. Áo tơ Hàn thêu kết hợp cùng chân váy ren tơ Hàn có form nhẹ nhàng, độ rũ tự nhiên, tạo tổng thể chỉn chu, hài hòa mà vẫn rất thanh thoát, gọn gàng chứ không bị rườm rà.

**Review:** NEEDS_EDIT — Có chọn cả bộ nhưng lý do chủ yếu là lời khen thanh thoát/chuyên nghiệp nhất, chưa giải thích vì sao cả bộ giải quyết mong muốn gọn hơn so với áo lẻ. Lỗi ở độ thuyết phục và giọng catalog; không bắt buộc phải chọn áo lẻ hay coi nhận định thẩm mỹ là lỗi an toàn.

## B1 18. b1-current-policy-v3

**Khách trước:** Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

**Khách:** Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

**Kết quả SEND_ELIGIBLE:**

Dạ, hiện bên em áp dụng thời gian đổi hàng trong vòng 15 ngày kể từ khi nhận hàng nên chị nhận được 9 ngày thì vẫn đổi size được bình thường nha chị.

**Review:** USABLE — Hiểu khách đang hỏi hạn đổi so với policy cũ và trả thời hạn hiện tại; không tự diễn giải thành giấy miễn mọi điều kiện.

## B1 19. b1-partial-source-v3

**Khách:** Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

**Kết quả SEND_ELIGIBLE:**

Áo được làm từ tơ Hàn thêu mềm và thoáng, còn chân váy dùng ren tơ Hàn mang lại độ bay và rũ tự nhiên chị ạ. Hiện hệ thống chưa cập nhật sẵn giá và tình trạng tồn kho của set này, chị có thể nhắn thêm size để em kiểm tra chi tiết hơn khi có dữ liệu nhé!

**Review:** NEEDS_EDIT — Giữ đúng chất liệu và không bịa giá/tồn, nhưng xin thêm size kèm hẹn kiểm tra khi có dữ liệu không khắc phục được nguồn POS đang thiếu. Đây là bước tiếp không dùng được và giọng giải thích hệ thống.

## B1 20. b1-price-v3

**Khách:** Nguyên set Thạch Thảo bao nhiêu tiền em?

**Kết quả SEND_ELIGIBLE:**

Nguyên set Thạch Thảo có giá 799.000đ ạ.

**Review:** USABLE — Đúng giá cả set799k và dừng, không gắn CTA bắt buộc.

## B1 21. b1-component-stock-v3

**Khách:** Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

**Kết quả SEND_ELIGIBLE:**

Áo Thạch Thảo có bán riêng chị nhé. Áo size M đang còn hàng, giá 499.000đ ạ.

**Review:** USABLE — Trả đủ bán riêng, còn áo M và499k; không phát sinh thao tác khách chưa yêu cầu.

## B1 22. b1-search-read-v3

**Khách:** Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

**Kết quả SEND_ELIGIBLE:**

Dạ mẫu Set quần Xuân Thảo (SQ223) nhà em vẫn còn hàng chị nhé. Sản phẩm có các lựa chọn:

- Áo: 429.000đ
- Quần: 429.000đ
- Trọn bộ (cả set): 699.000đ

Chị muốn lấy lẻ hay mua cả set ạ?

**Review:** USABLE — Tìm đúng SQ223, trả tồn cùng giá các lựa chọn. Danh sách ngắn hữu ích cho câu hỏi giá/tồn, không coi bố cục bullet là lỗi tự nhiên mặc định.

## B1 23. b1-buying-concern-v3

**Khách trước:** Chị có sẵn chân váy đen dáng suông rồi.

**Khách:** Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

**Kết quả SEND_ELIGIBLE:**

Chị nên lấy cả bộ (799.000đ, vừa vặn trong ngân sách 850 nghìn của chị). Áo tơ Hàn thêu cao cấp kết hợp chân váy ren tơ mang lại tổng thể bay bổng, sang trọng khi diện nguyên set; đồng thời chị hoàn toàn có thể tách áo phối cùng chân váy đen dáng suông sẵn có ở nhà để thay đổi linh hoạt cho nhiều dịp.

**Review:** NEEDS_EDIT — Đề xuất cả set799k trong ngân sách và dùng chân váy đen có sẵn để giải thích khả năng phối là hợp lý về bán hàng. Cần sửa giọng vì câu ngoặc ngân sách và chuỗi tơ cao cấp/bay bổng/sang trọng/thay đổi linh hoạt nghe như mô tả quảng cáo; không chấm trượt vì upsell hoặc đã có váy.

## B1 24. b1-policy-used-v3

**Khách:** Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

**Kết quả SEND_ELIGIBLE:**

Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem và chưa qua giặt ạ. Do sản phẩm đã cắt tem và giặt rồi nên shop rất tiếc không hỗ trợ đổi được, chị thông cảm giúp shop nhé ạ.

**Review:** USABLE — Từ chối đúng trường hợp cắt tem và giặt rồi, nêu ngắn hai nguyên nhân thực sự quyết định; không kể đủ mọi điều kiện mới được chấp nhận.

## Stateful 1. stateful-open

**Khách:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Terminal:** FALLBACK

**Tin capture thực tế:** Phần này em chưa trả lời được, chị nhé.

**Review:** FALLBACK_OR_NO_SEND — Khách chọn áo be M và nhờ lấy, nhưng không có dòng giỏ nào được commit; chỉ nhận static fallback. Hồ sơ có nhận eo/mông là thành công một phần, không thay việc thêm hàng.

## Stateful 2. stateful-variant-quantity

**Khách:** Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Terminal:** FALLBACK

**Tin capture thực tế:** Phần này em chưa trả lời được, chị nhé.

**Review:** FALLBACK_OR_NO_SEND — Khách đổi L và lấy hai chiếc nhưng giỏ vẫn null, chỉ nhận static fallback. Đây là lỗi hành trình chưa thực hiện được, chưa quy thành một lỗi verifier riêng.

## Stateful 3. stateful-quote

**Khách:** Hai áo cả phí ship là bao nhiêu em?

**Terminal:** FALLBACK

**Tin capture thực tế:** Phần này em chưa trả lời được, chị nhé.

**Review:** FALLBACK_OR_NO_SEND — Không có quote hoặc tổng tiền trả khách; giỏ vẫn chưa được tạo sau các bước trước và khách nhận static fallback. Không tự cộng tiền để cứu lượt.

## Stateful 4. stateful-correction

**Khách:** Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Terminal:** FALLBACK

**Tin capture thực tế:** Phần này em chưa trả lời được, chị nhé.

**Review:** FALLBACK_OR_NO_SEND — Code sửa eo/mông đúng74/96 và profile revision3 nhưng khách vẫn nhận static fallback, chưa đạt kết quả mua. Không dùng nháp bị chặn để cứu điểm.

## Stateful 5. stateful-private-checkout

**Khách:** [Private checkout fixture, CODE_ONLY; không đưa thông tin riêng tư vào model]

**Terminal:** HANDOFF

**Tin capture thực tế:** [Không có tin]

**Review:** FALLBACK_OR_NO_SEND — Private code path không gọi model và không tạo preview; chuyển người vì dependency failure. Đây là terminal an toàn nhưng hành trình mua chưa hoàn thành; không tính thành lỗi hiểu ngôn ngữ.

## Stateful 6. stateful-confirm

**Khách:** Chốt đơn cho chị nhé.

**Terminal:** NO_SEND

**Tin capture thực tế:** [Không có tin]

**Review:** FALLBACK_OR_NO_SEND — Sau handoff, code không tiếp tục xác nhận mua và không gửi thêm. Giữ authority đúng nhưng khách chưa có đơn/preview hoàn tất; là hệ quả của hành trình chưa hoàn thành.

## Stateful 7. stateful-human-request

**Khách:** Cho chị gặp nhân viên shop nhé.

**Terminal:** HANDOFF

**Tin capture thực tế:** [Không có tin]

**Review:** USABLE — Yêu cầu gặp nhân viên dẫn tới HANDOFF CUSTOMER_REQUESTED_HUMAN. Đánh giá dùng được cho chuyển ownership theo policy trong harness; không có tin capture, không chứng minh nhân viên thật đã nhận hoặc phục vụ khách.
