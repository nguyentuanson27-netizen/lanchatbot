# DEV70 hội thoại bán hàng tự nhiên — R2

> Hội thoại mô phỏng được biên soạn cho benchmark; không phải log khách thật.

R2 dùng cùng 70 DEV ID và fact values của main R2.5, viết lại hội thoại cho tự nhiên hơn. 19 context amendment được giữ có chủ đích để sửa các mâu thuẫn reachability/checkout/intent; xem `coverage.json`.

## 1. V5V4Q001 — Từ quảng cáo vào hỏi giá cả bộ hay riêng áo

- **Khách (lượt đánh giá):** Bộ trong ads này bn em? 849 là cả bộ hay riêng áo?

**Kỳ vọng:**
- Trả giá 849.000đ và làm rõ đây là set áo và quần từ dữ kiện được cấp.
- Giữ sản phẩm quảng cáo đã được xác định; thông tin bổ sung ngắn và liên quan.

## 2. V5V4Q002 — Khách nhắn rất ngắn từ một quảng cáo đã gắn sản phẩm

- **Khách (lượt đánh giá):** shop ơi tư vấn chị bộ này với

**Kỳ vọng:**
- Vào ngay thông tin hữu ích của bộ Tường Vi đã gắn với quảng cáo, không chỉ chào hỏi.
- Có giá đã xác minh và thông tin sản phẩm gọn; tối đa một câu hỏi còn cần thiết.

## 3. V5V4Q003 — Hỏi giá và màu đen chưa phải chọn màu hay mua

- **Khách (lượt đánh giá):** Bộ này bao nhiêu em? Có màu đen ko, chị kiếm đồ đi làm.

**Kỳ vọng:**
- Trả đủ giá và việc catalog có màu đen.
- Hiểu câu hỏi về màu chưa phải xác nhận chọn màu đen, cũng chưa phải cam kết mua.

## 4. V5V4Q004 — Tin nhắn không kèm ảnh nên chưa xác định được bộ nào

- **Khách:** Shop ơi nãy chị lướt thấy một bộ khá ưng mà bấm ra mất rồi.
- **Shop:** Chị gửi lại ảnh hoặc mã nếu còn nha, em tìm đúng bộ cho chị.
- **Khách (lượt đánh giá):** Cái bộ nãy chị xem ấy giá bao nhiêu em?

**Kỳ vọng:**
- Nói ngắn gọn chưa xác định được bộ khách muốn hỏi và xin ảnh, tên hoặc mã.
- Giữ thái độ giúp khách tìm lại thay vì đọc giá một sản phẩm bất kỳ.

## 5. V5V4Q005 — Đã xác định Tường Vi, khách quay lại hỏi giá bằng viết tắt

- **Khách:** Chị hỏi Tường Vi nha, mã SQ9012.
- **Shop:** Dạ chị, em đang xem đúng Tường Vi rồi ạ.
- **Khách (lượt đánh giá):** bn 1 bộ e?

**Kỳ vọng:**
- Hiểu 'bn' là hỏi giá và trả giá của SQ9012.
- Dùng referent đã rõ, không yêu cầu gửi lại mã hay chuyển sang sản phẩm khác.

## 6. V5V4Q006 — So hai lựa chọn và muốn tách rõ giá từng bộ

- **Khách:** Chị đang cân SQ9012 với SV9031, chắc chỉ lấy một bộ thôi.
- **Shop:** Dạ chị, em báo riêng từng bộ nha.
- **Khách:** Ừ em báo từng mã giúp chị nha, chị chọn một trong hai thôi.
- **Khách (lượt đánh giá):** SQ9012 bao nhiêu, còn SV9031 bao nhiêu em?

**Kỳ vọng:**
- Gắn 849.000đ với SQ9012 và 1.099.000đ với SV9031.
- Trả hai giá riêng, đúng nhu cầu chọn một bộ.

## 7. V5V4Q007 — Quay lại sau một hôm nhưng tham chiếu cũ đã hết hiệu lực

- **Khách:** Tối qua chị có xem một bộ bên em mà chưa chốt.
- **Shop:** Chị còn ảnh hay mã nào thì gửi em nha, em tìm lại cho nhanh.
- **Khách (lượt đánh giá):** Cái bộ hôm qua ấy giờ còn hàng ko em?

**Kỳ vọng:**
- Xin lại một dấu hiệu xác định sản phẩm vì binding hiện tại đã stale.
- Không xem câu 'hôm qua' là bằng chứng tồn kho còn hiện hành.

## 8. V5V4Q011 — Đang bàn màu nhưng khách chuyển sang hỏi giá trước

- **Khách:** Chị đang xem SQ9012, chắc ưu tiên màu đen.
- **Shop:** Dạ chị, mình xem màu sau cũng được ạ.
- **Khách (lượt đánh giá):** À báo chị giá cả bộ trước nhé em.

**Kỳ vọng:**
- Ưu tiên câu hỏi giá mới nhất và trả 849.000đ.
- Không ép khách trả lời size của câu trước rồi mới báo giá.

## 9. V5V4Q012 — Xen vài câu về nhu cầu rồi xác nhận lại giá đã báo

- **Khách:** SQ9012 nãy em báo 849k đúng ko?
- **Shop:** Dạ, giá hiện tại là 849.000đ chị nhé.
- **Khách:** Chị đang tính bộ này để đi họp, mà còn muốn mua quà cho mẹ nữa.
- **Shop:** Dạ chị, mình cân khoản chi trước cũng được ạ.
- **Khách:** Ừ để chị tính chung đã, chưa chốt ngân sách riêng bộ này.
- **Khách (lượt đánh giá):** Giờ bộ này vẫn 849 hả em, chưa đổi giá chứ?

**Kỳ vọng:**
- Xác nhận lại giá hiện tại từ nguồn mới, không chỉ lặp giá do khách nhắc.
- Nhắc giá là hợp lý vì khách chủ động hỏi lại.

## 10. V5V4Q013 — Thích bộ đồ nhưng nói giá cao mà chưa rõ nguyên nhân

- **Khách:** Chị tìm bộ mặc đi gặp khách, SQ9012 nhìn khá hợp.
- **Shop:** Dạ, bộ này hiện 849.000đ ạ.
- **Khách:** 849 là cả áo quần luôn đúng không em?
- **Shop:** Dạ đúng chị, giá nguyên set ạ.
- **Khách:** Chị ít mua đồ online lắm, thường phải ra xem tận nơi mới yên tâm.
- **Shop:** Em hiểu, chưa nhìn tận tay thì chị phân vân cũng bình thường ạ.
- **Khách (lượt đánh giá):** Giá hơi cao nhỉ... chị vẫn đang phân vân.

**Kỳ vọng:**
- Nhận ra đây là băn khoăn về quyết định mua, không phải hỏi lại giá.
- Có thể hỏi một điều cụ thể về khoản chi hoặc điều khiến khách chưa yên tâm nếu câu trả lời giúp tư vấn tiếp; không chỉ nhắc lại 'giá cao'.

## 11. V5V4Q014 — Sau hội thoại dài vẫn phải nhớ trần 700k và tôn trọng chưa mua

- **Khách:** Chị cần một bộ đi họp, mà mặc đi làm ngày thường được thì càng tốt.
- **Shop:** Chị tính khoảng nào cho bộ này ạ?
- **Khách:** Tối đa 700k thôi em, chị không muốn vượt khoản đó.
- **Shop:** Dạ chị, mình giữ trong 700k nha.
- **Khách:** Chị thích dáng suông, ngồi làm cả ngày mặc ôm khó chịu.
- **Shop:** Tường Vi SQ9012 là phom suông, quần cạp chun chị nhé.
- **Khách:** À đây là áo với quần đi chung một set hả em?
- **Shop:** Dạ đúng rồi chị.
- **Khách:** Set đó giá bao nhiêu?
- **Shop:** Hiện là 849.000đ ạ.
- **Khách:** Có màu kem không? Chị thấy kem dễ mặc.
- **Shop:** Mẫu có kem và đen chị nhé.
- **Khách:** Chị nghiêng kem hơn, đen ở nhà nhiều rồi.
- **Shop:** Dạ, kem nha chị.
- **Khách:** Để chị mở máy tính xem ảnh cho rõ, điện thoại bé quá.
- **Shop:** Vâng chị, chị xem từ từ nhé.
- **Khách (lượt đánh giá):** Chị xem kỹ rồi, vẫn thích kem mà 849 vượt mức 700 chị nói lúc đầu. Chắc chị chưa lấy đâu.

**Kỳ vọng:**
- Nhớ mức tối đa 700k trong lịch sử, không hỏi lại ngân sách.
- Tôn trọng khách chưa mua; không mở giỏ hoặc ép tăng chi.
- Không tự hứa một mẫu khác khi chưa có kết quả tìm kiếm.

## 12. V5V4Q015 — So với shop khác nhưng chưa có nguồn xác nhận hàng của đối thủ

- **Khách:** SQ9012 bên mình 849k đúng không em?
- **Shop:** Dạ, hiện là 849.000đ ạ.
- **Khách:** Chị thấy bên khác có bộ nhìn gần giống, họ báo tầm 700k.
- **Shop:** Dạ chị. Mình đang so qua ảnh thôi đúng không ạ?
- **Khách:** Ừ, chị chưa sờ tận tay bộ nào.
- **Khách:** Nhìn ảnh thì dáng bên kia cũng suông, chất chị không rõ.
- **Shop:** Ừ, vậy em chỉ nói phần bên mình có thông tin chắc để chị tự so nhé.
- **Khách:** Chị mặc đi làm là chính, muốn dùng được thường xuyên.
- **Khách (lượt đánh giá):** Nhìn na ná mà bên mình cao hơn, có điểm gì để chị cân nhắc thêm không em?

**Kỳ vọng:**
- Tách thông tin khách kể về đối thủ khỏi dữ kiện shop đã xác minh.
- Có thể nêu chất liệu, thiết kế của SQ9012 đã cấp để khách đối chiếu, nhưng không suy ra đối thủ kém hơn.
- Chỉ hỏi tiếp về điều khách ưu tiên nếu chưa có và thật sự giúp chọn.

## 13. V5V4Q016 — Lần mua trước chỉ thấy tạm ổn nên ngại chi cho bộ mới

- **Khách:** Chị từng mua bên em một bộ rồi, giờ đang xem SQ9012.
- **Shop:** Dạ, SQ9012 hiện 849.000đ ạ.
- **Khách:** Bộ trước mặc được nhưng nói thật là chị không mê lắm.
- **Shop:** Chị nhớ nhất lý do gì làm bộ trước ít được mặc vậy ạ?
- **Khách:** Cũng không có lỗi cụ thể, mua về rồi cứ để tủ thôi.
- **Khách:** Nên lần này chị hơi ngại, tiền cũng không ít.
- **Khách (lượt đánh giá):** Giá này chị vẫn lăn tăn, sợ mua xong lại mặc đúng một lần.

**Kỳ vọng:**
- Nối băn khoăn giá với trải nghiệm trước, không quy ngay là thiếu tiền.
- Làm rõ một khía cạnh sử dụng hoặc phần chưa hài lòng để định hướng tư vấn; không mặc định có lỗi hậu mãi.

## 14. V5V4Q017 — Khách trả giá kèm điều kiện mua ngay

- **Khách:** SQ9012 849k hả em?
- **Shop:** Dạ, giá hiện tại là 849.000đ ạ.
- **Khách:** Chị tính mua cuối tháng, đang muốn giữ chi tiêu gọn thôi.
- **Khách (lượt đánh giá):** 690k thì chị lấy luôn 1 bộ, được thì báo chị nha.

**Kỳ vọng:**
- Hiểu mua chỉ có hiệu lực nếu giá 690k được chấp nhận; chưa có chấp thuận giá đó.
- Giữ giá được xác minh và nêu không thể xác nhận mức đề nghị từ dữ kiện hiện có.

## 15. V5V4Q021 — Hỏi giảm thêm khi đã biết giá hiện tại

- **Khách:** Chị đang xem lại SQ9012, giá 849k em vừa báo ấy.
- **Khách (lượt đánh giá):** Có giảm thêm ko em?

**Kỳ vọng:**
- Trả đúng câu hỏi giảm thêm và nói rõ chưa có ưu đãi nào được xác nhận trong dữ kiện.
- Phân biệt chưa có thông tin với khẳng định shop tuyệt đối không có khuyến mãi.

## 16. V5V4Q022 — Khách đã có giỏ và muốn hiểu khoản giảm đang áp dụng

- **Khách:** Chị lấy SQ9012, đang xem lại giỏ trước khi xác nhận.
- **Shop:** Dạ chị, mình nhìn phần tính tiền trước nhé.
- **Khách:** Trên điện thoại chị thấy dòng giảm mà chữ bé quá.
- **Khách (lượt đánh giá):** Dòng ưu đãi trong giỏ đang trừ bao nhiêu vậy em?

**Kỳ vọng:**
- Đọc đúng khoản 50.000đ đã áp dụng cho giỏ hiện tại.
- Làm rõ đây là khoản đang có, không thực hiện thêm lần giảm mới.

## 17. V5V4Q023 — Muốn biết giỏ hiện tại có còn phải trả phí giao không

- **Khách:** Chị chọn SQ9012 rồi, đang rà giỏ trước khi điền nốt.
- **Khách:** Chị muốn chắc phần ship thôi, sợ lúc nhận lại phát sinh.
- **Khách (lượt đánh giá):** Giỏ này đang freeship đúng không em, chị có trả thêm ship nữa ko?

**Kỳ vọng:**
- Trả trực tiếp giỏ hiện tại được miễn phí giao theo readback hợp lệ.
- Giới hạn câu trả lời vào giỏ đang đọc, không áp dụng cho mọi đơn sau này.

## 18. V5V4Q024 — Khách đòi xác nhận miễn ship trong khi binding giỏ bị thiếu

- **Khách:** Chị đang xem SQ9012, chưa rõ phí giao thế nào.
- **Shop:** Dạ, để em kiểm tra đúng giỏ này cho chị nha.
- **Khách:** Ừ, chị hỏi trước cho khỏi tới lúc nhận mới bất ngờ.
- **Khách (lượt đánh giá):** Đơn này có được freeship không em?

**Kỳ vọng:**
- Nói chưa xác nhận được phí hoặc quyền miễn ship của giỏ hiện tại vì thiếu readback hợp lệ.
- Không dùng claim âm không có binding để kết luận chắc chắn không được miễn ship.

## 19. V5V4Q025 — Đọc lại đúng phí giao của giỏ, không chuyển sang tư vấn sản phẩm

- **Khách:** Chị đang mở giỏ SQ9012 trên điện thoại.
- **Khách (lượt đánh giá):** Ship giỏ này bn em?

**Kỳ vọng:**
- Trả phí giao 30.000đ từ giỏ hiện tại.
- Không đọc lại toàn bộ giá sản phẩm hoặc hỏi khám phá nhu cầu mới.

## 20. V5V4Q026 — Đọc ưu đãi giỏ hai món và hỏi nếu thay một món

- **Khách:** Giỏ chị đang có SQ9012 với SV9031 nè.
- **Shop:** Dạ, giỏ chị đang có hai bộ đó ạ.
- **Khách:** Chị thấy có một dòng giảm giá mà không đọc rõ.
- **Shop:** Dạ, em xem dòng giảm cho chị nha.
- **Khách:** Chị vẫn đang phân vân SV9031, có khi đổi sang bộ khác.
- **Shop:** Dạ, giờ giỏ vẫn đang giữ nguyên ạ.
- **Khách (lượt đánh giá):** Giỏ giờ đang giảm bao nhiêu em? Với lát chị đổi 1 bộ thì còn mức đó ko?

**Kỳ vọng:**
- Trả khoản giảm 100.000đ đã xác minh cho giỏ hiện tại.
- Giữ riêng phần ưu đãi sau thay món chưa được xác minh; không áp mức hiện tại cho một giỏ chưa hình thành.

## 21. V5V4Q027 — Khách quay lại dùng ưu đãi cũ nhưng snapshot đã hết hạn

- **Khách:** Bữa trước chị xem SQ9012 mà bận nên thôi chưa mua.
- **Shop:** Dạ chị, mình xem lại thông tin hiện tại nhé.
- **Khách:** Hôm đó em có nói một ưu đãi, chị không biết giờ còn không.
- **Khách (lượt đánh giá):** Giờ chị mua thì ưu đãi bữa trước còn áp dụng không em?

**Kỳ vọng:**
- Ở frozen candidate replay, chặn trước model vì capture ưu đãi hết hạn.
- Không sử dụng dữ kiện quá hạn để phát biểu ưu đãi hiện tại.

## 22. V5V4Q031 — Gửi cân nặng rồi hỏi size, vẫn thiếu chiều cao

- **Khách:** Chị đang xem SQ9012 mà không biết chọn size.
- **Shop:** Chị cho em xin chiều cao với cân nặng hiện tại nhé.
- **Khách:** Chị 56kg.
- **Khách:** Chiều cao chị lâu rồi không đo nên không nhớ chuẩn.
- **Shop:** Dạ, lúc tiện chị đo lại giúp em chiều cao nhé.
- **Khách:** Giờ chị đang ngoài đường chưa đo được.
- **Khách (lượt đánh giá):** 56kg thôi thì em chọn size cho chị được chưa, hay vẫn cần chiều cao?

**Kỳ vọng:**
- Nhận biết cân nặng đã có, chiều cao còn thiếu; hỏi đúng phần thiếu.
- Không tự đoán size từ 56kg hoặc hỏi lại toàn bộ thông tin đã nhận.

## 23. V5V4Q032 — Sau nhiều lượt vẫn nhớ chiều cao, cân nặng và chỉ hỏi vòng bụng

- **Khách:** Chị 1m58, 57kg, đang xem SQ9012 nha em.
- **Shop:** Dạ, 1m58 57kg em có rồi chị.
- **Khách:** Chị mặc đi làm, ngồi máy tính gần cả ngày.
- **Shop:** Dạ, ngồi lâu mà cấn bụng thì khó chịu thật chị.
- **Khách:** Chị hay bị chật phần bụng lúc ngồi, đứng thì lại bình thường.
- **Shop:** Dạ, vậy mình để ý phần bụng trước nha chị.
- **Khách:** Chị thích dáng suông, không thích bó.
- **Shop:** SQ9012 phom suông, quần cạp chun chị nhé.
- **Khách:** Mẫu này là kem hay trắng vậy em?
- **Shop:** Mẫu có kem và đen ạ.
- **Khách:** Chắc chị chọn đen, dễ phối đồ đi làm hơn.
- **Shop:** Dạ chị. Giá bộ hiện là 849.000đ ạ.
- **Khách:** Giá đó chị cân được, chị chỉ sợ ngồi lâu bị cấn bụng.
- **Shop:** Nếu có thước dây, chị đo thêm vòng bụng giúp em nhé.
- **Khách:** Có thước mà nãy chị đang họp nên chưa tìm.
- **Shop:** Dạ, khi nào tiện mình đo sau cũng được chị.
- **Khách:** Chị tìm thấy rồi nè.
- **Shop:** Dạ, vậy chị đo giúp em vòng bụng nha.
- **Khách (lượt đánh giá):** Cao với cân nặng chị gửi rồi, giờ cần thêm vòng bụng đúng ko em?

**Kỳ vọng:**
- Nhớ chiều cao 158cm và cân nặng 57kg từ đầu lịch sử.
- Yêu cầu số đo vòng bụng hoặc vòng eo liên quan đúng băn khoăn đang dang dở; không hỏi lại hai số đã biết.

## 24. V5V4Q033 — Đã có kết quả tư vấn size, khách muốn câu trả lời dứt khoát

- **Khách:** SQ9012 nhé em. Chị gửi đủ số đo rồi.
- **Shop:** Dạ, em đang đối chiếu đúng mẫu này.
- **Khách:** Lần này chị muốn theo số đo hiện tại, không theo size bộ cũ nữa.
- **Khách (lượt đánh giá):** Vậy em nghiêng M hay L cho chị?

**Kỳ vọng:**
- Trả kết quả có nguồn: M được khuyến nghị, L là lựa chọn có thể cân nhắc.
- Không yêu cầu gửi lại số đo đã đủ hoặc làm như chưa có kết quả.

## 25. V5V4Q034 — Có fit M nhưng khách thích mặc rộng, không hỏi lại số đo

- **Khách:** Nãy em tư vấn M cho SQ9012 theo số đo chị rồi đúng không?
- **Shop:** Dạ, M là khuyến nghị hiện tại; L cũng là phương án có thể cân nhắc ạ.
- **Khách:** Chị không thích mặc sát người, đi làm ngồi nhiều nữa.
- **Khách:** Chị thích rộng nhẹ thôi, chứ lên một size mà thùng thình thì cũng không đẹp.
- **Khách:** Mấy bộ cũ chị tăng size lúc ổn lúc lại rộng quá.
- **Shop:** Bộ cũ khác mẫu nên mình vẫn bám số đo của SQ9012 chị nhé.
- **Khách (lượt đánh giá):** Vậy chị cân L có hợp lý không, hay em vẫn nghiêng M hơn?

**Kỳ vọng:**
- Kết hợp sở thích rộng với kết quả M/L đã được cấp.
- Nói đúng giới hạn nếu không có số đo thành phẩm hoặc dữ kiện về độ rộng thực tế; không làm mất khuyến nghị chính.

## 26. V5V4Q035 — Size thường mặc lớn hơn dải size sản phẩm, cần số đo để tư vấn

- **Khách:** Chị thích Tường Vi SQ9012, mà bình thường hay mặc XXL.
- **Shop:** Mẫu này hiện có dải size tới XL chị nhé.
- **Khách:** Chị chưa gửi số đo, với mỗi hãng chị mặc một kiểu khác nhau.
- **Khách (lượt đánh giá):** XL bên em có khả năng vừa chị không, hay vẫn phải đo mới biết?

**Kỳ vọng:**
- Không kết luận XL vừa hoặc không vừa từ size XXL khách thường mặc.
- Xin số đo đang thiếu để tư vấn, không hỏi khách tự chọn nhãn size thay cho đo.

## 27. V5V4Q036 — Đủ số đo và đã tư vấn M, khách quay lại nỗi lo bụng sau nhiều lượt

- **Khách:** Chị gửi đủ số đo cho SQ9012 rồi nhé, vẫn lo nhất phần bụng.
- **Shop:** Dạ, kết quả hiện khuyến nghị M và có thể cân nhắc L.
- **Khách:** Hồi trước chị mặc M chỗ khác, đứng thì vừa mà ngồi lại chật.
- **Shop:** Dạ, em hiểu chỗ chị đang ngại rồi.
- **Khách:** Nên lần này chị mới đo lại hết số hiện tại đó.
- **Shop:** Em hiểu, nên lần này mình bám số đo hiện tại của chị.
- **Khách:** Mà bộ này có màu gì em?
- **Shop:** Tường Vi có kem và đen ạ.
- **Khách:** Kem nha, đen chị có nhiều rồi.
- **Shop:** Dạ, kem nha chị.
- **Khách:** Quần nhìn ảnh là cạp chun phải không?
- **Shop:** Đúng chị, quần cạp chun và phom suông ạ.
- **Khách:** Giá cả set vẫn 849 chứ?
- **Shop:** Dạ, hiện 849.000đ ạ.
- **Khách:** Giá thì ok. Chị chỉ sợ mua xong ngồi làm lại bị tức bụng.
- **Shop:** Dạ, em hiểu chị ngại nhất phần bụng lúc ngồi.
- **Khách (lượt đánh giá):** Chị gửi đủ số đo rồi mà vẫn hơi rén phần bụng 😅 Em vẫn nghiêng M như lúc đầu à?

**Kỳ vọng:**
- Nhớ băn khoăn bụng và việc số đo đã đủ; trả kết quả M/L đang được xác nhận.
- Phân biệt kết quả size với bảo đảm thoải mái riêng vùng bụng khi không có dữ kiện chi tiết.

## 28. V5V4Q037 — Hỏi nguyên tắc tách size chứ chưa quyết định mua

- **Khách:** Chị xem SQ9012, người chị trên nhỏ dưới to hơn chút.
- **Khách:** Áo chị thường S, quần thường M. Chị mới hỏi cách chọn thôi nha, chưa chốt.
- **Khách (lượt đánh giá):** Set này có lấy áo S quần M chung một bộ được ko em?

**Kỳ vọng:**
- Trả đúng chính sách cho phép tách size của set.
- Giữ riêng chính sách tách size với stock và fit của tổ hợp S/M.

## 29. V5V4Q041 — Hỏi còn hàng tổng quát trước khi chọn màu và size

- **Khách:** Chị vừa thấy SQ9012 trên trang.
- **Khách (lượt đánh giá):** Còn hàng ko em?

**Kỳ vọng:**
- Trả còn hàng theo stock cấp sản phẩm.
- Có thể hỏi màu hoặc size nếu cần kiểm tiếp đúng biến thể, không tự xác nhận mọi biến thể đều có.

## 30. V5V4Q042 — Quay lại mã đã lưu nhưng sản phẩm hiện hết hàng

- **Khách:** Chị lưu SQ9012 từ tuần trước, giờ mới có thời gian nhắn.
- **Shop:** Dạ chị, em kiểm tra theo tình trạng hiện tại nhé.
- **Khách:** Ừ, lần trước chị chưa kịp mua.
- **Khách (lượt đánh giá):** SQ9012 giờ còn không shop?

**Kỳ vọng:**
- Nói đúng mẫu hiện hết hàng từ dữ kiện mới.
- Không dùng việc khách từng thấy bài đăng làm bằng chứng còn hàng.

## 31. V5V4Q043 — Hỏi đen M nhưng mapping biến thể trong input bị thiếu

- **Khách:** Chị hỏi SQ9012 nha, chị thích màu đen.
- **Shop:** Dạ, chị đang xem size nào ạ?
- **Khách:** M em. Chị hỏi tồn trước thôi, chưa đặt nha.
- **Khách (lượt đánh giá):** đen M còn sẵn ko em?

**Kỳ vọng:**
- Giữ đúng yêu cầu tồn màu đen size M.
- Khi fixture thiếu mapping độc lập của variant, nêu giới hạn xác nhận đúng biến thể, không thay bằng tồn tổng hoặc kết luận hết.

## 32. V5V4Q044 — Đã biết giá, câu tiếp theo chỉ hỏi tồn

- **Khách:** SQ9012 nhìn hợp đó, báo giá chị với.
- **Shop:** Bộ hiện 849.000đ ạ.
- **Khách (lượt đánh giá):** À quên, hàng còn ko em?

**Kỳ vọng:**
- Chuyển đúng sang câu hỏi tồn và trả còn hàng theo nguồn.
- Không đọc lại giá hoặc quay về chào hỏi ban đầu.

## 33. V5V4Q045 — Khách hỏi số lượng vì cần cân nhắc, không yêu cầu giữ hàng

- **Khách:** SQ9012 còn thì chị gửi mẹ xem thêm rồi mới quyết.
- **Shop:** Dạ, chị cứ gửi mẹ xem thêm nha.
- **Khách:** Ừ, mẹ chị đang bận chưa xem được.
- **Khách:** Tối chị mới hỏi được, màu cũng chưa chọn.
- **Khách (lượt đánh giá):** Mẫu này giờ còn nhiều ko em?

**Kỳ vọng:**
- Nêu tồn thấp theo dữ kiện, không thêm sức ép hoặc thời hạn giữ hàng.
- Một câu hỏi tiếp chỉ cần khi thật sự phải làm rõ biến thể để trả phần chưa biết.

## 34. V5V4Q046 — Mẫu hết, khách chủ động xin lựa chọn khác với tiêu chí rõ

- **Khách:** Chị thích SQ9012 vì dáng suông, tính mua mặc đi làm.
- **Shop:** Dạ chị, mẫu đó hiện hết hàng ạ.
- **Khách:** Vậy chị không đợi đâu, đợt này chị cần đồ luôn.
- **Shop:** Dạ, vậy em tìm mẫu khác theo dáng chị thích nha.
- **Khách:** Chị cần dáng suông, đừng ôm bụng.
- **Khách:** Màu thì đen hay sáng đều được, không cần giống y hệt.
- **Shop:** Chị muốn giữ khoảng bao nhiêu để em lọc cho dễ ạ?
- **Khách:** 800k trở xuống thôi em.
- **Khách (lượt đánh giá):** Có bộ nào na ná vậy không em, dáng đừng ôm bụng nha. Tầm 800 đổ lại thôi.

**Kỳ vọng:**
- Hiểu yêu cầu tìm thay thế, nhớ ngân sách và sản phẩm đã từ chối.
- Trong C3 fixture không có kết quả retrieval được xác minh, nói đúng giới hạn thay vì bịa mã mới hoặc chỉ đáp 'dạ vâng'.

## 35. V5V4Q047 — Khách hỏi lại tồn sau khi rời cuộc trò chuyện

- **Khách:** SQ9012 giờ vẫn còn hàng chứ em?
- **Shop:** Dạ, mẫu hiện còn hàng ạ.
- **Khách:** Chị chạy đi đón con chút, chưa quyết đâu nha.
- **Shop:** Dạ chị, lúc nào tiện chị nhắn em nhé.
- **Khách:** Chị quay lại rồi nè, vẫn xem bộ lúc nãy.
- **Khách (lượt đánh giá):** Giờ còn chứ shop?

**Kỳ vọng:**
- Trả lại tình trạng hiện tại từ nguồn còn hiệu lực.
- Không phê khách hỏi lại; đây là kiểm tra tồn có chủ đích.

## 36. V5V4Q051 — Ngại chất liệu nên hỏi cụ thể set ren

- **Khách:** Chị đang xem Miêu Vân SQ9072, nhìn phần áo khá ưng.
- **Khách (lượt đánh giá):** Mẫu này là ren gì em?

**Kỳ vọng:**
- Nêu chất liệu ren Hàn đã được cấp.
- Nếu nguồn không cho biết tỷ lệ hay phạm vi phối ren, giữ rõ giới hạn của phần đó.

## 37. V5V4Q052 — Hỏi ghép giá và dễ nhăn vì phải ngồi xe lâu

- **Khách:** Chị đang xem Tường Vi SQ9012 để mặc đi gặp đối tác.
- **Shop:** Mẫu dùng tơ xước mềm, nhẹ chị nhé.
- **Khách:** Chị thường phải ngồi ô tô gần một tiếng trước khi tới nơi.
- **Khách (lượt đánh giá):** Bộ này bao nhiêu em? Với ngồi xe lâu vậy vải có dễ nhăn ko?

**Kỳ vọng:**
- Trả giá 849.000đ có nguồn và giữ riêng câu hỏi về nhăn.
- Nói chưa có dữ kiện về khả năng nhăn; không trả lời về độ nhẵn, độ bóng hoặc chỉ lặp tên vải.

## 38. V5V4Q053 — Hỏi cấu tạo cạp và dáng quần, chưa xin tư vấn size

- **Khách:** Chị xem SQ9012, quần ở nhà toàn cạp cứng nên mặc lâu khó chịu.
- **Shop:** Dạ chị, mình xem phần thiết kế quần trước nhé.
- **Khách:** Ừ, size để sau. Chị cũng không thích dáng bó.
- **Khách (lượt đánh giá):** Quần bộ này cạp chun hay cạp cứng, dáng có suông ko em?

**Kỳ vọng:**
- Trả quần cạp chun và thông tin phom suông đã được cấp; không tự bổ sung kiểu ống hoặc cấu trúc may chi tiết hơn nguồn.
- Phân biệt phom thiết kế chung với độ vừa cơ thể khách; không bắt đo eo khi khách chỉ hỏi thiết kế.

## 39. V5V4Q054 — Thích dáng suông có nguồn nhưng còn cân nhắc mức giá

- **Khách:** Chị thích Hải Miên CB9055 vì nhìn không ôm eo.
- **Shop:** Mẫu có eo suông, tay lửng; giá hiện 999.000đ ạ.
- **Khách:** Chị có mấy bộ đi làm rồi nên không phải thiếu đồ.
- **Khách:** Chị chỉ mua nếu thấy dùng được nhiều, chứ mặc một lần thì phí.
- **Khách:** Kiểu ôm eo là chị bỏ luôn nha.
- **Shop:** Dạ, dáng suông vẫn là kiểu chị ưu tiên nha.
- **Khách:** Ừ, mặc đi làm là chính.
- **Khách (lượt đánh giá):** Gần 1tr thì chị cũng phải nghĩ em ạ. Bộ này có điểm gì hợp kiểu chị cần để mặc thường xuyên không?

**Kỳ vọng:**
- Dùng đúng sở thích eo suông đã biết để chỉ ra chi tiết liên quan có nguồn.
- Không biến đặc điểm phù hợp sở thích thành chứng minh giá trị vượt trội; có thể làm rõ một tiêu chí còn thiếu giúp khách quyết định.

## 40. V5V4Q055 — Quan tâm giặt máy vì không có thời gian giặt tay

- **Khách:** Chị đang xem set Miêu Vân, thấy ren nên hơi ngại khoản giặt.
- **Khách:** Chị toàn dùng máy giặt, đi làm về muộn chứ không có thời gian giặt tay.
- **Khách:** Đồ nào chăm cầu kỳ quá là chị hay để tủ luôn.
- **Shop:** Dạ, vậy em nói thẳng phần chăm đồ để chị cân nhắc nhé.
- **Khách:** Ừ, đẹp mà chăm mệt quá chị cũng ngại mua.
- **Khách (lượt đánh giá):** Set này giặt máy được ko em, có phải kiêng gì nhiều không?

**Kỳ vọng:**
- Trả hướng dẫn có nguồn: có thể giặt tay hoặc chế độ nhẹ, tránh vắt mạnh, phơi bóng râm.
- Nối câu trả lời với thói quen dùng máy của khách, không hỏi lại thói quen.

## 41. V5V4Q056 — Khách thích mẫu nhưng muốn sửa tay dài hơn

- **Khách:** Chị xem SQ9072, phần thân áo chị ưng rồi.
- **Khách:** Chị chỉ ngại tay hơi ngắn, muốn che tay thêm chút.
- **Shop:** Dạ, em hiểu chị muốn tay dài hơn mẫu gốc.
- **Khách:** Nếu phải mua xong mang đi sửa thì chị không tiện.
- **Khách:** Nên chị hỏi shop làm luôn được không đã.
- **Khách (lượt đánh giá):** Shop may tay dài thêm cho chị được không? Được thì chị mới tính lấy.

**Kỳ vọng:**
- Trả rõ shop không nhận chỉnh sửa theo yêu cầu theo policy đang có.
- Nhận ra điều kiện mua phụ thuộc dịch vụ không được hỗ trợ, không xem đây là mua vô điều kiện.

## 42. V5V4Q057 — Muốn xem ảnh mặt trước lần nữa để quyết định, không phải đổi mẫu

- **Khách:** Chị vẫn xem SQ9012 nha, chưa đổi sang mẫu khác.
- **Khách:** Nãy nhìn trên điện thoại bé quá, chị chưa xem rõ phần áo.
- **Khách (lượt đánh giá):** Gửi lại ảnh mặt trước giúp chị với.

**Kỳ vọng:**
- Giữ đúng sản phẩm và yêu cầu ảnh mặt trước.
- Trong lane chỉ có text và chưa có effect gửi ảnh, nêu giới hạn của lần trả lời này; không tuyên bố ảnh đã được gửi.

## 43. V5V4Q061 — Đã rõ nơi nhận ở Hà Nội, cần thời gian giao dự kiến

- **Khách:** Chị hỏi SQ9012, nhận ở Hà Nội nha em.
- **Shop:** Dạ, Hà Nội chị nha.
- **Khách:** Chị cần biết thời gian giao để sắp xếp người ở nhà nhận.
- **Shop:** Dạ, được chị.
- **Khách:** Ừ, không gấp. Địa chỉ chi tiết chị gửi lúc đặt sau.
- **Khách (lượt đánh giá):** Về HN thường mấy hôm tới em?

**Kỳ vọng:**
- Trả dự kiến 2–4 ngày cho địa bàn đã biết.
- Nói đúng tính ước tính, không lặp lời giới hạn nhiều lần hoặc hỏi lại tỉnh/thành.

## 44. V5V4Q062 — Ngày mai phải mặc nhưng thời gian giao dự kiến dài hơn

- **Khách:** Chị ở Hà Nội, đang xem SQ9012 để mặc buổi gặp mặt.
- **Shop:** Dạ chị, mình cần dùng khi nào ạ?
- **Khách:** Ngày mai luôn, bên công ty vừa báo lịch.
- **Shop:** Dạ, em hiểu rồi ạ.
- **Khách:** Ừ, qua ngày mai thì bộ này không giúp được dịp đó nữa.
- **Khách:** Chị hỏi xem có kịp ko thôi, chưa chốt vội.
- **Khách (lượt đánh giá):** Đặt giờ thì mai kịp ko em? Ko kịp chị tìm bộ khác.

**Kỳ vọng:**
- Trả trực tiếp không thể xác nhận kịp ngày mai vì chỉ có ETA dự kiến 2–4 ngày.
- Cho khách thông tin đủ để cân nhắc cách khác, không tiếp tục chốt như đã đáp ứng hạn.

## 45. V5V4Q063 — Hạn dùng còn năm ngày, phải diễn giải đúng khoảng 2–4 ngày

- **Khách:** Chị hỏi SQ9012 giao Hà Nội, cần mặc đi gặp đối tác.
- **Khách:** Còn 5 ngày nữa. Chị chỉ cần nhận trước buổi đó là được.
- **Khách (lượt đánh giá):** Thế ETA hiện tại 2–4 ngày thì mốc 5 ngày của chị có khả năng kịp ko em?

**Kỳ vọng:**
- Diễn giải đúng: khoảng dự kiến 2–4 ngày kết thúc trước mốc 5 ngày khách cần, nhưng không phải bảo đảm đúng hạn.
- Không đảo thành '5 ngày nằm trong khoảng 2–4 ngày'.

## 46. V5V4Q064 — Khách cần sắp lịch ở nhà và đòi ngày nhận chính xác

- **Khách:** SQ9012 về Hà Nội dự kiến 2–4 ngày đúng không em?
- **Shop:** Dạ, hiện em có khoảng dự kiến 2–4 ngày ạ.
- **Khách:** Chị đi làm cả ngày, phải nhờ người nhà nhận giúp.
- **Khách:** Mẹ chị cũng không thể ở nhà cả tuần để chờ.
- **Khách (lượt đánh giá):** Có chốt được chính xác ngày nào tới không em, để chị còn nhờ người?

**Kỳ vọng:**
- Giải thích chưa có ngày nhận chính xác, chỉ có khoảng 2–4 ngày.
- Hiểu lý do khách hỏi và không coi yêu cầu ngày nhận là yêu cầu chốt mua.

## 47. V5V4Q065 — Chưa biết địa bàn nên hỏi tỉnh/thành, không xin địa chỉ đầy đủ

- **Khách:** Chị đang xem SQ9012 để gửi làm quà.
- **Khách:** Chị muốn biết người nhận phải chờ lâu không, mà chưa chốt gửi tỉnh nào.
- **Khách (lượt đánh giá):** Thường bao lâu tới em? Chị cần nói tỉnh/thành trước đúng không?

**Kỳ vọng:**
- Hỏi tỉnh hoặc thành phố nhận hàng vì đó là dữ kiện còn thiếu để tra thời gian.
- Không hỏi tên, số điện thoại, số nhà hoặc địa chỉ đầy đủ ở bước tư vấn này.

## 48. V5V4Q066 — Hỏi lại thời gian vận chuyển nhưng nguồn ước tính đã cũ

- **Khách:** Lần trước chị hỏi SQ9012 nhưng chưa đặt.
- **Shop:** Dạ chị, mình xem lại thông tin hiện tại nhé.
- **Khách:** Chị muốn hỏi lại thời gian giao, bữa trước nghe rồi mà sợ giờ khác.
- **Khách (lượt đánh giá):** Giờ gửi bộ này thì tầm mấy ngày chị nhận được?

**Kỳ vọng:**
- Frozen candidate phải từ chối trước model khi capture ETA đã hết hạn.
- Không dùng thời gian cũ làm cam kết cho lần hỏi hiện tại.

## 49. V5V4Q067 — Phân biệt lúc shop gửi với lúc khách nhận hàng

- **Khách:** SQ9012 giao Hà Nội em nói dự kiến nhận sau 2–4 ngày đúng không?
- **Shop:** Dạ, đó là thời gian giao dự kiến ạ.
- **Khách:** Ừ nhưng chị đang hỏi lúc shop đưa hàng cho bên vận chuyển cơ.
- **Khách (lượt đánh giá):** Hôm nay shop có bàn giao cho bên vận chuyển được không em?

**Kỳ vọng:**
- Nhận ra khách hỏi ngày gửi/bàn giao, không phải ETA nhận hàng.
- Nêu chưa có thông tin xác nhận ngày bàn giao cụ thể, không dùng 2–4 ngày làm ngày gửi.

## 50. V5V4Q071 — Khách lần đầu mua online muốn phân biệt kiểm hàng với mặc thử

- **Khách:** Chị xem SQ9012, trước giờ ít mua quần áo online.
- **Khách:** Chị sợ nhận về màu khác ảnh nên muốn hỏi kỹ trước.
- **Khách (lượt đánh giá):** Lúc nhận chị được mở ra coi đúng màu đúng size chứ? Có mặc thử luôn được ko em?

**Kỳ vọng:**
- Trả phần kiểm đúng mẫu, màu, size theo policy.
- Tách mặc thử là phụ thuộc từng đơn, chưa xác nhận quyền mặc thử cho đơn cụ thể này.

## 51. V5V4Q072 — Lo chọn nhầm size, hỏi cả đổi và phí

- **Khách:** Chị đang cân SQ9012, mua online chị hay lo nhầm size.
- **Khách:** Bộ trước mua chỗ khác đổi rất mệt.
- **Shop:** Dạ chị, hỏi kỹ vụ đổi size trước cũng yên tâm hơn ạ.
- **Khách:** Chị quan tâm cả điều kiện lẫn phí.
- **Khách:** Chị muốn biết rõ trước rồi mới quyết.
- **Khách (lượt đánh giá):** Nhận về ko vừa thì đổi size được ko em? Phí đổi sao?

**Kỳ vọng:**
- Trả đủ thời hạn 15 ngày, điều kiện chưa dùng/còn tag/chưa giặt, phí đổi theo nhu cầu 30.000đ và tối đa một lần.
- Giữ đây là câu hỏi trước mua, không xử lý như khách đang yêu cầu đổi một đơn đã nhận.

## 52. V5V4Q073 — Phân biệt đổi màu/size với đổi mẫu trong nhóm giảm sâu

- **Khách:** Chị đang xem mục sale, chưa chọn bộ cụ thể đâu.
- **Khách:** Chị thấy có nhóm giảm hơn 30%, muốn biết chính sách trước.
- **Khách (lượt đánh giá):** Nhóm giảm hơn 30% thì đổi mẫu khác được không, hay chỉ đổi size/màu thôi em?

**Kỳ vọng:**
- Nêu chính sách nhóm giảm từ 30% trở lên: đổi size/màu, không đổi sang mẫu khác.
- Không tự kết luận sản phẩm đang xem thuộc nhóm giảm sâu nếu chưa có dữ kiện membership.

## 53. V5V4Q074 — Hỏi tình huống shop gửi sai để yên tâm trước khi mua

- **Khách:** Chị đang tính chọn SQ9012 nhưng hỏi chính sách trước cho chắc.
- **Khách:** Nhỡ shop gửi nhầm bộ thì chị muốn biết xử lý sao.
- **Khách (lượt đánh giá):** Nếu giao nhầm mẫu thì chị có được hoàn tiền không, phải báo trong mấy ngày em?

**Kỳ vọng:**
- Trả quyền hoàn trong trường hợp shop giao sai hoặc lỗi nhà sản xuất và hạn báo 5 ngày theo nguồn.
- Giữ phạm vi câu hỏi giả định trước mua, không tạo hồ sơ hoàn tiền hiện tại.

## 54. V5V4Q075 — Mua online lần đầu nên hỏi cách trả tiền và đặt cọc

- **Khách:** Chị xem SQ9012, lần đầu mua qua page bên em.
- **Khách (lượt đánh giá):** Bên em có COD với chuyển khoản không? Có cần cọc trước ko em?

**Kỳ vọng:**
- Trả đúng hỗ trợ COD, chuyển khoản và không cần đặt cọc.
- Hiểu thói quen COD không tự là lựa chọn thanh toán cho một giao dịch chưa có.

## 55. V5V4Q076 — Chỉ hỏi chuyển khoản, phủ định rõ việc chốt đơn

- **Khách:** Chị vẫn đang xem SQ9012 thôi, chưa chốt mua nha.
- **Khách:** Chị ít khi cầm tiền mặt nên hỏi cách thanh toán trước.
- **Khách (lượt đánh giá):** Nếu lấy thì chuyển khoản được ko em?

**Kỳ vọng:**
- Trả chính sách nhận chuyển khoản.
- Giữ đúng câu phủ định: đây không phải chọn phương thức hoặc xác nhận mua.

## 56. V5V4Q077 — Muốn tới cửa hàng thử đồ, cần địa chỉ và giờ mở cửa

- **Khách:** Chị ở Hà Nội, đang xem SQ9012 mà muốn qua nhìn tận mắt.
- **Khách:** Chắc chị ghé sau giờ làm, nhưng chưa biết chính xác mấy giờ.
- **Khách (lượt đánh giá):** Shop ở đâu vậy em, mở tới mấy giờ? Qua đó chị thử đồ được chứ?

**Kỳ vọng:**
- Trả đủ địa chỉ 212 Nguyễn Trãi, Hà Nội; giờ 09:00–21:00; có thể thử trực tiếp theo fixture.
- Không ép đặt lịch khi khách chưa xác định giờ tới.

## 57. V5V4Q081 — Chọn giữa hai bộ theo giá, không được đổi thành so trọng lượng

- **Khách:** Chị đang xem SQ9012 với SV9031, chỉ lấy một bộ thôi.
- **Shop:** Dạ chị, mình so từng mã cho dễ ạ.
- **Khách:** Chị so giá trước. Mỗi bộ thì chị thích một điểm khác nhau.
- **Shop:** SQ9012 hiện 849.000đ, SV9031 là 1.099.000đ ạ.
- **Khách:** Chị đang lướt trên điện thoại nên cứ nhầm hai bộ.
- **Khách:** Chị so giá nguyên bộ nha em.
- **Khách (lượt đánh giá):** Hai bộ đó thì bộ nào rẻ hơn?

**Kỳ vọng:**
- Giữ đúng thuộc tính cần so là giá; không trả lời về trọng lượng, độ nhẹ hay chất liệu.
- Trả đúng hai giá gắn với từng mã; nếu có phép so sánh được code xác minh thì SQ9012 rẻ hơn. Khi comparison capability chưa được cấp, không tự tạo claim so sánh nhưng vẫn phải cung cấp hai giá hữu ích.

## 58. V5V4Q082 — Qua nhiều lượt vẫn hiểu 'bộ thứ hai' là SV9031

- **Khách:** Chị đang mở 2 bộ nè: SQ9012 trước, SV9031 sau nha em.
- **Shop:** Dạ chị.
- **Khách:** Chị đang so giá cả bộ, chỉ lấy một bộ thôi.
- **Shop:** SQ9012 hiện 849.000đ, SV9031 là 1.099.000đ ạ.
- **Khách:** Chị mua đi họp cuối năm, sau đó mặc gặp khách nữa.
- **Shop:** Dạ, vậy mình ưu tiên bộ hợp chị hơn nha.
- **Khách:** Hơn một triệu chút cũng được, không nhất thiết phải lấy bộ rẻ nhất.
- **Shop:** Vâng ạ.
- **Khách:** Trong hai bộ chị đang nghiêng bộ sau hơn.
- **Shop:** Ừ chị.
- **Khách:** Chị mặc chắc tháng vài lần, còn muốn hỏi mẹ xem màu nào kín đáo.
- **Shop:** Dạ chị, mình cứ xem thêm rồi quyết.
- **Khách:** Ừ, size để sau, giờ chị chưa muốn đo.
- **Shop:** Size để sau cũng được chị.
- **Khách:** Giờ chị hỏi tồn trước thôi.
- **Shop:** Dạ.
- **Khách:** Màu thì chưa chốt, chị hỏi tình trạng chung nhé.
- **Shop:** Dạ, bộ thứ hai nha chị.
- **Khách (lượt đánh giá):** Bộ thứ hai chị nói lúc đầu ấy giờ còn hàng chứ em?

**Kỳ vọng:**
- Giải đúng 'bộ thứ hai' là SV9031 dựa trên thứ tự đã nêu, dù lịch sử đã dài.
- Trả còn hàng từ RC_STOCK_B_IN; không cần hỏi lại mã hoặc trả tồn SQ9012.

## 59. V5V4Q083 — Sửa mã sau khi shop hỏi nhầm, tiếp tục câu hỏi giá còn dang dở

- **Khách:** Chị đang hỏi giá cả bộ Tường Vi lúc nãy nha, không phải bộ bên cạnh.
- **Shop:** Ý chị là SV9031 hả?
- **Khách:** Không em, nhầm rồi. Để chị mở lại mã.
- **Shop:** Dạ chị, gửi em đúng mã là được ạ.
- **Khách (lượt đánh giá):** SQ9012 em nhé, bộ này bao nhiêu?

**Kỳ vọng:**
- Nhận mã sửa SQ9012 và tiếp tục trả câu hỏi giá cả bộ chưa được giải quyết trong lịch sử.
- Không chỉ 'dạ vâng' rồi bỏ câu hỏi, không giữ giá SV9031.

## 60. V5V4Q084 — Chỉ cần áo Miêu Vân vì đã có quần, hỏi bán lẻ và giá áo

- **Khách:** Chị xem Miêu Vân SQ9072, áo nhìn hợp cái quần chị có sẵn ở nhà.
- **Khách:** Chị chỉ cần áo thôi, không muốn mua thêm quần.
- **Khách (lượt đánh giá):** Áo có bán riêng ko em? Nếu có thì bao nhiêu?

**Kỳ vọng:**
- Trả có bán lẻ áo với giá 549.000đ.
- Ưu tiên đúng phần áo khách cần; không bắt chọn nguyên set hoặc hỏi lại mua phần nào.

## 61. V5V4Q085 — Khách phân biệt bản hai món và ba món, hỏi đúng full combo

- **Khách:** Chị đang xem Bạch Liên SV9088, thấy có ảnh 2 món với 3 món.
- **Khách:** Chị hỏi bản đủ 3 món nha.
- **Khách:** Nãy chị nhìn nhầm giá bản 2 món.
- **Shop:** Dạ chị, bản đủ 3 món nha.
- **Khách:** Ừ nói rõ gồm gì giúp chị luôn.
- **Khách (lượt đánh giá):** Full 3 món gồm gì, giá trọn combo bao nhiêu em?

**Kỳ vọng:**
- Trả combo ba món gồm áo, chân váy và quần với giá 1.049.000đ.
- Đặt đúng cấu hình được hỏi lên trước; không làm khách nhầm với bản 829.000đ.

## 62. V5V4Q086 — Muốn set áo S quần M nhưng quyết định mua còn phụ thuộc đủ hàng

- **Khách:** Chị xem nguyên set Miêu Vân, người chị phần trên nhỏ hơn phần dưới.
- **Khách:** Chị tính áo S, quần M; chị hỏi nguyên set chứ không mua lẻ áo nha.
- **Khách (lượt đánh giá):** Nếu đủ áo S quần M thì chị mới lấy nguyên bộ. Shop cho tách vậy không, đã có đủ hàng chưa?

**Kỳ vọng:**
- Trả chính sách cho phép tách size trong nguyên set.
- Giữ riêng phần tồn S/M chưa được cấp dữ kiện; không biến quyền tách size thành xác nhận có đủ hàng.
- Không biến quyết định có điều kiện thành mua vô điều kiện.

## 63. V5V4Q087 — Tìm lại mẫu cũ và hỏi còn sản xuất, không chỉ hỏi hết tạm thời

- **Khách:** Chị tìm lại Bạch Liên SV9088, trước có xem mà chưa mua.
- **Shop:** Dạ, Bạch Liên SV9088 chị nha.
- **Khách (lượt đánh giá):** Mẫu này giờ còn làm nữa ko em?

**Kỳ vọng:**
- Trả mẫu đã ngừng sản xuất theo lifecycle evidence.
- Phân biệt ngừng sản xuất với một biến thể tạm hết hoặc một ngày về hàng chưa có.

## 64. V5V4Q091 — 'Ok' sau khi hỏi giá và giao chỉ là đã hiểu, chưa mua

- **Khách:** SQ9012 849k phải không shop?
- **Shop:** Dạ, hiện là 849.000đ ạ.
- **Khách:** Về Hà Nội tầm mấy ngày? Chị hỏi trước để tính thôi.
- **Shop:** Dự kiến 2–4 ngày, chưa hẹn chính xác ngày nhận được chị nhé.
- **Khách (lượt đánh giá):** ok em, để chị bàn mẹ thêm đã

**Kỳ vọng:**
- Ghi nhận khách đã hiểu và còn cân nhắc.
- Không biến 'ok' thành mua hàng, chọn payment hoặc yêu cầu thu thông tin nhận hàng.

## 65. V5V4Q092 — 'Ok' sau cam kết mua, chỉ hỏi đúng trường checkout còn thiếu

- **Khách:** Chị lấy một bộ SQ9012 size M, mình tiếp tục đặt nhé.
- **Shop:** Dạ, mình còn thiếu ít thông tin thôi chị.
- **Khách:** Tên với SĐT chị gửi rồi. Địa chỉ để chị hỏi chồng xem nhận ở nhà hay công ty.
- **Shop:** Dạ, hiện còn địa chỉ nhận và cách thanh toán chị nhé.
- **Khách (lượt đánh giá):** ok, còn thiếu gì em nhắc chị với

**Kỳ vọng:**
- Giữ cam kết mua đã có trong canonical context.
- Chỉ yêu cầu ADDRESS và PAYMENT_METHOD do checkout completeness xác nhận còn thiếu; không hỏi lại tên và điện thoại.

## 66. V5V4Q093 — Muốn mua nhưng ảnh chưa có nên sản phẩm vẫn chưa rõ

- **Khách:** Chị muốn lấy một bộ shop đang đăng, để chị gửi ảnh.
- **Shop:** Dạ, chị gửi ảnh hoặc mã bộ đó giúp em nhé.
- **Khách:** Ảnh đang tải mãi chưa lên, mạng chị yếu quá.
- **Khách (lượt đánh giá):** Chị lấy một bộ này nhé, chốt cho chị trước được không?

**Kỳ vọng:**
- Ghi nhận mong muốn mua nhưng xin xác định đúng sản phẩm trước.
- Không coi chữ 'bộ này' là đủ binding để mở giỏ hoặc chốt.

## 67. V5V4Q094 — Muốn mua nhưng vẫn thiếu một số đo để xác định size

- **Khách:** Chị muốn lấy SQ9012 mà chưa biết size.
- **Shop:** Chị cho em xin chiều cao với cân nặng hiện tại nhé.
- **Khách:** Chị 56kg, nãy bế con nên quên gửi chiều cao.
- **Khách (lượt đánh giá):** Chị lấy một bộ nhé, giờ còn thiếu chiều cao đúng ko em?

**Kỳ vọng:**
- Giữ ý định mua và blocker size đang thiếu chiều cao.
- Hỏi rõ chiều cao, không nói chung chung 'gửi số đo cần thiết' hoặc hỏi lại cân nặng.

## 68. V5V4Q095 — Khách cảm ơn sau xác nhận nội bộ, không tự thêm cam kết giao

- **Khách:** Chị xem lại phần xác nhận rồi, đúng hết nhé.
- **Shop:** Dạ, em nhận phần chị xác nhận rồi ạ.
- **Khách:** Vậy được rồi, chị không hỏi thêm gì nữa.
- **Khách (lượt đánh giá):** Cảm ơn em nha, chị quay lại làm việc đây 😊

**Kỳ vọng:**
- Kết thúc thân thiện, ngắn gọn và tôn trọng hard stop/canonical confirmed state.
- Không mở thêm chủ đề bán hàng hoặc hỏi lại checkout.

## 69. V5V4Q096 — Đã muốn mua nhưng sửa M thành L trước khi hoàn tất checkout

- **Khách:** Chị lấy một bộ SQ9012 nhé, lúc đầu chị tính size M.
- **Shop:** Dạ chị, mình chốt lại size trước rồi đi tiếp phần nhận hàng nhé.
- **Khách:** Chị gửi lại số đo hiện tại rồi, bộ cũ lâu quá không tính nữa.
- **Shop:** Kết quả tư vấn hiện tại cho mẫu này là size L ạ.
- **Khách:** Chị chưa gửi thông tin nhận hàng, để chốt size trước đã.
- **Khách (lượt đánh giá):** Khoan M nhé, chị chọn L như vừa tư vấn. Mình cần gì nữa em?

**Kỳ vọng:**
- Ghi nhận lựa chọn L, không tuyên bố đã sửa một đơn hoặc giỏ nếu chưa có receipt mutation.
- Theo completeness còn thiếu, yêu cầu đúng checkout fields; không hỏi lại số đo đã được xử lý.

## 70. V5V4Q100 — Đủ checkout và đã xem preview, không hỏi lại phương thức thanh toán

- **Khách:** Chị lấy SQ9012 size M, thông tin nhận hàng chị gửi đủ ở trên rồi.
- **Shop:** Dạ chị, chị xem lại giúp em lần cuối nha.
- **Khách:** Cách thanh toán chị cũng chọn rồi, không đổi nữa.
- **Shop:** Dạ, chị kiểm tra lại giúp em nha.
- **Khách:** Chị xem rồi, sản phẩm với thông tin đều đúng.
- **Khách (lượt đánh giá):** Đúng hết rồi, chị đồng ý theo phần vừa xem nhé.

**Kỳ vọng:**
- Dùng checkout COMPLETE hiện có, không suy thiếu payment hoặc yêu cầu gửi lại thông tin.
- Ghi nhận xác nhận trong giới hạn lane không có effect port; không tự công bố giao dịch bên ngoài đã thành công.

