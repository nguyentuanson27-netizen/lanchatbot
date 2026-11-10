# Hội thoại và review — ví dụ tư vấn đã duyệt

12 lượt = 6 tình huống × 2 bản prompt × 1 lần. Control: prompt hiện hành. Candidate: prompt có 5 hội thoại minh họa. Đọc cả đoạn, không chấm bằng từ khóa. Đây là review của agent, chưa phải owner duyệt chất lượng từng câu. Raw giữ nguyên byte; bản hiển thị chỉ bỏ khoảng trắng cuối dòng.

## s01 — B1–7 — control

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Bộ này diện đi tiệc ban ngày rất nhã nhặn và sang trọng, không bị rườm rà đâu chị nhé. Áo dùng chất tơ Hàn thêu nổi kết hợp chân váy ren tơ Hàn mềm, form nhẹ với độ bay và rũ tự nhiên nên tổng thể lên dáng rất thanh thoát, nhẹ nhàng.

Giá nguyên set váy là 799.000đ, hoàn toàn nằm trong ngân sách 900.000đ của chị ạ. Chị có muốn em kiểm tra size phù hợp cho mình không ạ?
```

**NEEDS_EDIT** — Chọn bộ nhưng lời giải thích chủ yếu là mềm, bay, rũ và chuỗi lời khen; chưa giải quyết rõ lo ngại về mức độ trang trí. Kết thúc bằng mời kiểm tra size dù B1 không có recommend_size. Không coi nhận xét thẩm mỹ tự nó là unsafe.

## s02 — B1–7 — candidate

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ, chân váy dùng chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên nên tổng thể rất thanh thoát, sang trọng chứ không bị rườm rà đâu chị nhé, mặc đi tiệc ban ngày cực kỳ hợp ạ.

Thêm nữa, cả bộ có giá 799k nên hoàn toàn nằm trong ngân sách 900k của mình luôn nha chị.
```

**NEEDS_EDIT** — Bỏ được lời mời kiểm tra size không dùng được và bớt dài, nhưng vẫn suy từ ren mềm/form nhẹ/rũ sang không rườm rà rồi khen cực kỳ hợp. Lý do chưa giúp khách cân nhắc phần ren đang ngại; không yêu cầu phải chọn áo lẻ hay từ chối set.

## s03 — B1–15 — candidate

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ đi ăn cưới ban ngày thì set Thạch Thảo này rất hợp luôn chị nhé, vừa thanh lịch lại nhã nhặn. Set này form nhẹ, chất tơ và ren có độ bay và rũ tự nhiên chứ không bị bồng bềnh cứng nhắc hay quá cầu kỳ đâu chị, mặc lên không bị điệu quá đâu ạ.

Nếu chị hay mặc đồ trơn, mình lấy cả bộ (799k) diện đi ăn cưới là sang và vừa vặn nhất; hoặc nếu vẫn ngại ren, chị có thể lấy áo tơ thêu (499k) phối với quần suông hoặc chân váy trơn sẵn có ở nhà là gọn gàng và hợp ý chị ngay.
```

**NEEDS_EDIT** — Vẫn trấn an bằng nhiều lời khen và phủ nhận điệu quá; câu nếu chị hay mặc đồ trơn thì lấy cả bộ là sang và vừa vặn nhất chưa có lý do gắn với gu khách. Sau đó lại đưa áo lẻ như lựa chọn thứ hai mà chưa phân định rõ. Vừa vặn trong đoạn này không tự bị chấm là cam kết size.

## s04 — B1–15 — control

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả thực tế (SEND_ELIGIBLE):

```text
Em tư vấn thật lòng là set Thạch Thảo thiên về nét nữ tính, thanh nhã và bay bổng nhờ chất liệu tơ Hàn và chân váy ren mềm, kết hợp họa tiết thêu nổi tinh tế chứ không bị kiểu điệu đà, sến sẩm đâu chị ạ. Đi ăn cưới ban ngày mặc set này sẽ rất sang, lịch sự và nhã nhặn.

Tuy nhiên, vì chị hay mặc đồ trơn ít họa tiết nên khi diện cả set có thể sẽ thấy hơi điệu hơn gu thường ngày một chút. Nếu chị vẫn thích nét thanh lịch của mẫu này nhưng ngại nguyên cây điệu, mình có thể chọn mua lẻ áo thêu (499k) hoặc chân váy ren (449k) để phối với các món đồ trơn sẵn có trong tủ, vừa giữ được sự tối giản quen thuộc lại vừa điểm xuyết nét nổi bật vừa đủ cho buổi tiệc.

Chị thấy phương án này thế nào ạ?
```

**NEEDS_EDIT** — Có thừa nhận cả bộ điệu hơn gu thường ngày, nhưng đoạn dài với nhiều lời quảng cáo rồi đưa cả áo lẻ/váy lẻ và hỏi lại. Chưa giúp khách chọn rõ cho buổi ăn cưới. Không chấm hỏng vì có nhiều hơn một phương án, mà vì không làm rõ phương án nên ưu tiên.

## s05 — B1–23 — control

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Theo em, chị nên mua riêng áo Thạch Thảo (499.000đ).

Vì chị đã có sẵn chân váy đen dáng suông, chiếc áo chất tơ Hàn thêu nổi form nhẹ này sẽ là mảnh ghép cực kỳ linh hoạt để chị dễ dàng phối đồ mặc lại nhiều lần đi làm hay đi chơi. Lựa chọn này vừa giúp chị tận dụng tối đa trang phục sẵn có, vừa gọn gàng và nằm thoải mái trong ngân sách 850 nghìn của mình.
```

**USABLE_WITH_POLISH** — Chọn rõ áo lẻ 499k, dùng được chân váy đen khách đã có và lý do mặc lại nhiều lần; không hỏi lại. Còn cách nói mảnh ghép cực kỳ linh hoạt/tận dụng tối đa khá quảng cáo, nhưng quyết định và lý do chính dùng được. Không bắt buộc upsell mới được đạt.

## s06 — B1–23 — candidate

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Lấy cả bộ 799k vẫn vừa vặn trong ngân sách 850 nghìn của chị đấy ạ.

Thêm 300 nghìn so với mua áo lẻ, chị vừa có trọn bộ chân váy ren tơ Hàn thướt tha để diện đồng bộ, lại vừa có sẵn chiếc áo thêu để phối linh hoạt với chân váy đen dáng suông ở nhà. Nếu chị chưa có dáng váy ren tơ mềm mại này thì em nghiêng về phương án lấy cả bộ luôn nhé ạ!
```

**USABLE_WITH_POLISH** — Upsell cả bộ 799k trong ngân sách, giải thích đúng thêm300k có chân váy và vẫn dùng áo với chân váy đen của khách. Có áp dụng cách so sánh từ ví dụ sang giá thật; không dùng giá giả định. Còn chuỗi lời khen và câu nếu chưa có dáng váy khá giống cấu trúc ví dụ, chưa chứng minh giọng tốt hơn đối chứng.

## s07 — B1–17 — candidate

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả thực tế (SEND_ELIGIBLE):

```text
Gặp khách hàng buổi sáng thì chị lấy áo lẻ (499k) phối với quần âu hoặc chân váy ôm sẵn có ở nhà sẽ nhìn gọn gàng và chuyên nghiệp hơn chị ạ. Áo chất tơ thêu nổi form nhẹ mặc lên vừa thanh lịch lại lịch sự.

Còn nếu chị lấy cả bộ (799k), chất ren tơ của chân váy có độ rũ tự nhiên nên nhìn rất nhã nhặn, sang trọng. Mua cả bộ cũng tiết kiệm hơn vì chân váy lẻ là 449k. Chị thiên về phong cách gọn gàng chuyên nghiệp với áo lẻ hay thích diện cả bộ dịu dàng hơn ạ?
```

**NEEDS_EDIT** — Đầu đoạn chọn áo lẻ hợp buổi gặp khách, nhưng nửa sau lại quảng bá cả bộ rồi hỏi khách thích gọn chuyên nghiệp hay dịu dàng, dù khách đã nói muốn gọn. Ưu tiên đã biết bị trả lại cho khách. Tiết kiệm hơn kèm giá váy lẻ449k không bị đánh đồng với lỗi so set799k rẻ hơn chỉ áo499k của run trước.

## s08 — B1–17 — control

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả thực tế (SEND_ELIGIBLE):

```text
Đi gặp khách hàng buổi sáng, chị nên lấy riêng áo (499.000đ) phối cùng quần âu hoặc chân váy ôm gọn gàng sẽ lịch sự và sắc sảo hơn chị ạ.

Set Thạch Thảo dùng chất tơ Hàn thêu và chân váy ren mềm có độ bay, rũ tự nhiên rất hợp đi tiệc tối, nhưng mặc trọn bộ váy ren tơ gặp đối tác sẽ hơi mềm mại và điệu quá. Lấy áo lẻ vừa giúp tổng thể gọn gàng, chuyên nghiệp khi làm việc, lại vẫn giữ được nét sang trọng nhờ các chi tiết thêu nổi trên nền tơ.
```

**USABLE_WITH_POLISH** — Đổi lời khuyên sang áo lẻ rõ ràng, phân biệt cả bộ đi tiệc với gặp đối tác buổi sáng và giải thích theo mong muốn gọn của khách. Đoạn hai vẫn dài và lặp ý, nhưng không quay lại hỏi lựa chọn đã rõ. Nhận xét phong cách là tư vấn định tính được phép.

## s09 — B1–3 — control

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ, set váy Thạch Thảo có phần áo may bằng tơ Hàn thêu họa tiết nổi, chất vải mềm, thoáng và có độ bay tự nhiên; chân váy làm từ ren tơ Hàn mềm, form nhẹ, có độ rũ tự nhiên chị nhé.

Dạ, hiện tại em chưa tra được chính xác giá và tình trạng tồn kho size M của mẫu này ạ.
```

**USABLE_WITH_POLISH** — Trả chất liệu cả áo và váy, nói chưa tra được giá/tồn size M khi POS không khả dụng, không bịa hàng hay hứa theo dõi. Có thể gọn hơn và bỏ một lần dạ, nhưng không mất yêu cầu hoặc đưa bước không thực hiện được.

## s10 — B1–3 — candidate

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ, set Thạch Thảo có áo may bằng tơ Hàn thêu mềm, thoáng và có độ bay tự nhiên, còn chân váy làm bằng ren tơ Hàn mềm form nhẹ rũ tự nhiên chị nha.

Về giá và tình trạng còn hàng size M thì hiện em chưa tra được thông tin ạ.
```

**USABLE_WITH_POLISH** — Giữ đủ phần chất liệu và thông báo giá/tồn size M chưa tra được; không lấy giá trong ví dụ điền vào chỗ thiếu. Giọng và độ dài tương tự đối chứng; không có cải thiện đáng kể.

## s11 — B1–12 — candidate

customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ, set váy Thạch Thảo cả bộ có giá 799.000đ chị nhé (nếu mua lẻ thì áo là 499.000đ và chân váy là 449.000đ ạ). Set gồm áo tơ thêu nổi và chân váy ren mềm mặc rất xinh, nhẹ nhàng và bay bổng, chị có muốn xem thêm thông tin chi tiết về chất liệu hay tư vấn size không ạ?
```

**NEEDS_EDIT** — Khách chỉ hỏi giá cả bộ, reply thêm giá hai món lẻ, đoạn khen chất liệu và câu hỏi xem thêm/tư vấn size. Toàn đoạn làm nặng yêu cầu đơn giản và mời tư vấn size ngoài capability B1. Không chấm hỏng chỉ vì dùng ngoặc; vấn đề là nội dung và bước tiếp theo không cần/không dùng được.

## s12 — B1–12 — control

customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ, set váy Thạch Thảo nguyên bộ có giá 799.000đ chị nhé.
```

**USABLE_WITH_POLISH** — Hiểu cả bộ từ history và báo đúng799k trong một câu dùng được. Không thêm lời quảng cáo hoặc hỏi size. Nhãn USABLE_WITH_POLISH được dùng thống nhất trong phép đo, không có nghĩa câu này bắt buộc phải sửa.

## So sánh từng cặp

- B1–7: Candidate bớt dài và bỏ CTA size, nhưng cả hai vẫn NEEDS_EDIT do lý do chưa giải quyết rõ lo ren. Cải thiện cục bộ, chưa thành whole-turn improvement.

- B1–15: Cả hai vẫn NEEDS_EDIT: lời khen dài và chưa chọn rõ theo gu/dịp. Candidate không tốt hơn rõ.

- B1–23: Hai lựa chọn khác nhau đều bán hàng hợp lý: control chọn áo để dùng cùng váy có sẵn; candidate upsell bằng chênh300k. Không lấy giá trị đơn cao hơn tự động làm điểm chất lượng cao hơn.

- B1–17: Control chọn áo lẻ và giữ lập trường; candidate lại mở set và trả việc chọn cho khách. Candidate kém hơn trên mẫu quan sát này.

- B1–3: Cả hai trả phần có nguồn và giữ unknown giá/tồn; không phát hiện ví dụ làm bịa giá. Chất lượng tương tự.

- B1–12: Control một câu đúng việc; candidate mở rộng sang quảng cáo và size không thực hiện được. Candidate kém hơn.
