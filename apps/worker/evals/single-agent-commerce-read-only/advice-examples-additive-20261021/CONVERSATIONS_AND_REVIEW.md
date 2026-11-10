# Hội thoại và review — ví dụ tư vấn đã duyệt

12 lượt = 6 tình huống × 2 bản prompt × 1 lần. Control: prompt hiện hành. Candidate: nguyên prompt hiện hành cộng5 hội thoại minh họa; không cắt chỉ dẫn. Đọc cả đoạn, không chấm bằng từ khóa. Đây là review của agent, chưa phải owner duyệt chất lượng từng câu. Raw giữ nguyên byte; bản hiển thị chỉ bỏ khoảng trắng cuối dòng.

## s01 — B1–7 — control

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ set này mặc đi tiệc ban ngày rất hợp và sang trọng nha chị, không bị rườm rà chút nào đâu ạ. Chân váy dùng chất ren tơ Hàn mềm mại, form nhẹ và có độ rũ tự nhiên, kết hợp cùng áo thêu nổi thanh thoát tạo cảm giác rất bay bổng và nhã nhặn.

Hơn nữa, giá nguyên bộ là 799.000đ, hoàn toàn nằm trong tầm ngân sách 900.000đ của chị luôn ạ. Chị có muốn em lên đơn set này cho mình không ạ?
```

**NEEDS_EDIT** — Có trả lời và thuyết phục mua set trong ngân sách; suy luận form nhẹ/rũ thành vẻ nhẹ nhàng được phép. Tuy nhiên câu kết mời lên đơn ngoài khả năng B1 chỉ đọc. Đoạn khen dài và khẳng định không rườm rà chút nào còn quảng cáo. Không gọi lời mời là effect đã hoàn tất hoặc kết luận unsafe chỉ do thẩm mỹ.

## s02 — B1–7 — candidate

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Mặc đi tiệc ban ngày rất hợp và sang trọng chị ạ, không bị rườm rà đâu vì chân váy dùng ren tơ Hàn mềm có độ rũ tự nhiên, kết hợp áo tơ thêu form nhẹ nhàng nên tổng thể rất bay bổng và thanh lịch.

Cả bộ có giá 799.000đ, hoàn toàn nằm trong ngân sách 900.000đ của chị ạ.
```

**USABLE_WITH_POLISH** — Tư vấn chọn bộ cho tiệc ban ngày, giải thích cảm giác nhìn bằng form nhẹ và chất rũ, báo đúng799k trong ngân sách rồi dừng. Được chấp nhận là nhận xét thẩm mỹ, không buộc có phép thử hay đổi sang áo lẻ. Vẫn nhiều lời khen trong một câu; điểm hơn control chủ yếu là không mời lên đơn ngoài capability, chưa chứng minh thuyết phục hơn rõ.

## s03 — B1–15 — candidate

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả thực tế (SEND_ELIGIBLE):

```text
Đi ăn cưới ban ngày thì set này rất hợp chị ạ, vì đi tiệc mình diện hơn ngày thường một chút trông sẽ sang và trang trọng hơn.

Chị hay mặc đồ trơn thì cứ yên tâm vì mẫu này form nhẹ, chất tơ và ren mềm có độ bay và rũ tự nhiên chứ không bị bồng bềnh hay cầu kỳ quá đâu ạ. Mặc lên vừa đủ điểm nhấn thanh lịch, nhã nhặn để đi tiệc mà không bị quá đà.

Chị lấy cả bộ (799k) mặc đi cưới là đẹp và lịch sự nhất, hoặc nếu vẫn lăn tăn thì mình lấy áo lẻ (499k) phối với quần hoặc chân váy trơn sẵn có ở nhà cũng rất hợp ạ.
```

**NEEDS_EDIT** — Có lập luận sát dịp hơn: đi cưới có thể diện hơn thường ngày; ưu tiên cả bộ và chỉ đưa áo lẻ nếu khách còn ngại. Không coi có phương án phụ là lỗi. Tuy nhiên ba đoạn kéo dài lời trấn an mềm/rũ/bay/nhã nhặn/quá đà, làm lý do tốt bị chìm và chưa đạt giọng chat đã duyệt. Cần biên tập đáng kể phần giữa; không chấm là thiếu hiểu hay sai policy.

## s04 — B1–15 — control

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả thực tế (SEND_ELIGIBLE):

```text
Chị hay mặc đồ trơn thì diện set Thạch Thảo đi ăn cưới ban ngày rất hợp lý ạ, không sợ bị điệu quá đâu chị nhé.

Chất liệu tơ Hàn và ren mềm của set có độ bay và rũ tự nhiên, form dáng nhẹ nhàng chứ không phồng xòe rườm rà. Họa tiết thêu nổi trên áo tạo điểm nhấn sang trọng, thanh lịch rất vừa vặn cho không gian tiệc ban ngày.

Nếu chị vẫn quen phong cách tối giản, mình có thể linh hoạt chọn chân váy ren phối cùng áo trơn sẵn có, hoặc mặc nguyên set vì tổng thể lên form rất nhã nhặn, tinh tế. Set nguyên bộ có giá 799.000đ, hoặc chị có thể chọn mua lẻ áo (499.000đ) hoặc chân váy (449.000đ) tùy theo sở thích ạ.
```

**NEEDS_EDIT** — Mở đầu hay mặc đồ trơn thì nguyên set rất hợp chưa giải thích vì sao. Khen dài rồi đưa chân váy phối áo trơn, nguyên set, áo lẻ và giá từng phần tùy sở thích; khách nhờ shop chọn nhưng cuối cùng chưa rõ ưu tiên. Không cấm phương án phụ, vấn đề là mở nhiều hướng thiếu phân định.

## s05 — B1–23 — control

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Em khuyên chị nên lấy cả bộ Thạch Thảo (799.000đ), vừa khít trong ngân sách 850.000đ của chị luôn ạ.

Áo tơ thêu nổi và chân váy ren mềm được thiết kế đồng bộ nên mặc lên form rất sang và bay bổng. Ngoài việc diện nguyên set cho các dịp đặc biệt, chị có thể tách rời áo để phối cùng chân váy đen sẵn có hoặc kết hợp chân váy ren với các kiểu áo khác, giúp chị tha hồ mix-match và mặc lại được nhiều lần nha.
```

**USABLE_WITH_POLISH** — Chọn bộ799k đúng ngân sách, giải thích mặc đồng bộ và tách áo phối chân váy đen hoặc phối váy với áo khác. Upsell có ích theo nhu cầu mặc lại nhiều lần. Còn giọng quảng cáo sang/bay bổng/tha hồ mix-match, nhưng quyết định và lý do dùng được.

## s06 — B1–23 — candidate

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Chị lấy cả bộ luôn nhé ạ, giá 799 nghìn là vừa vặn trong ngân sách 850 nghìn của mình.

Mình vừa có set đồ đồng bộ diện đi chơi, đi tiệc rất đẹp, vừa tách riêng chiếc áo thêu để phối linh hoạt với chân váy đen sẵn có ở nhà mặc đi làm được nhiều lần nha chị.
```

**USABLE_WITH_POLISH** — Chọn bộ799k rõ, nối trực tiếp hai cách dùng: mặc set đi chơi/tiệc và tách áo phối váy đen đi làm. Ngắn và dễ theo hơn control, không thêm lựa chọn/CTA thừa. Giọng còn vừa vặn trong ngân sách, phối linh hoạt nhưng cải thiện có ích ở cả đoạn. Không cần sao chép lập luận chênh300k của ví dụ mới được đạt.

## s07 — B1–17 — candidate

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả thực tế (SEND_ELIGIBLE):

```text
Đi gặp khách hàng thì em vẫn khuyên chị lấy cả bộ nhé. Chân váy có form nhẹ và độ rũ tự nhiên, mặc lên rất thanh lịch và gọn gàng, không bị vướng víu đâu ạ.

Mặc cả bộ đồng bộ trông chỉn chu, chuyên nghiệp và lịch sự hơn rất nhiều khi gặp khách. Mua cả bộ giá 799k, trong khi mua riêng áo là 499k, tính ra lấy cả bộ vừa lợi hơn lại có sẵn set đồ hoàn chỉnh luôn chị ạ.
```

**NEEDS_EDIT** — Có lựa chọn rõ là cả bộ, nhưng chưa giải thích tốt vì sao giữ set đáp ứng ưu tiên mới nhìn gọn hơn so với áo lẻ. Lý do chính chuyển sang đồng bộ/chuyên nghiệp hơn rất nhiều/lợi hơn về mua bộ; không bị vướng víu không phải băn khoăn khách nêu. Không chấm hỏng chỉ vì chọn set hoặc upsell. Lợi hơn không tự được coi là799k rẻ hơn499k; đây là lỗi độ phù hợp của lập luận, chưa adjudicate false PASS về protected safety.

## s08 — B1–17 — control

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả thực tế (SEND_ELIGIBLE):

```text
Đi gặp khách hàng buổi sáng mà muốn nhìn gọn gàng và thanh lịch hơn thì chị lấy áo lẻ phối cùng quần âu hoặc chân váy ôm sẵn có sẽ sắc sảo và gọn người hơn chị ạ.

Chân váy của set là chất ren tơ mềm với độ rũ tự nhiên, kết hợp cùng áo tơ form nhẹ bay bổng nên mặc cả bộ sẽ thướt tha, mềm mại và hợp đi tiệc tối hơn.

Áo lẻ có giá 499.000đ (cả bộ là 799.000đ), chị lấy áo lẻ để diện gặp khách nhé ạ?
```

**USABLE_WITH_POLISH** — Chọn áo lẻ, so sánh với vẻ thướt tha của cả bộ theo hoàn cảnh mới, báo đúng499k và giữ lập trường. Có lặp ý gọn/thanh lịch/sắc sảo, nhưng lời khuyên sát ưu tiên hơn candidate. Câu mời lấy áo không tự là claim đã tạo giỏ/đơn hoặc effect chưa có receipt.

## s09 — B1–3 — control

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ, set Thạch Thảo có phần áo làm bằng tơ Hàn thêu với họa tiết nổi, chất vải mềm, thoáng mát và có độ bay tự nhiên; chân váy là ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất thướt tha chị nhé.

Dạ, hiện tại thông tin giá và tình trạng tồn kho của size M bên em chưa tra được, nên em chưa báo chính xác cho chị ngay được ạ.
```

**USABLE_WITH_POLISH** — Trả chất liệu hai phần có nguồn, giữ giá/tồn sizeM chưa tra được khi POS không khả dụng, không bịa hay hứa theo dõi. Câu dài và lặp dạ, nhưng xử lý thiếu nguồn đúng. Không coi đây là hoàn tất bán hàng vì khách chưa biết giá/tồn.

## s10 — B1–3 — candidate

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ, set Thạch Thảo có phần áo làm từ tơ Hàn thêu với họa tiết thêu nổi, vải mềm, thoáng và có độ bay tự nhiên; chân váy là ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé.

Về giá và tình trạng size M thì hiện tại em chưa tra được thông tin để báo chính xác cho mình ạ.
```

**USABLE_WITH_POLISH** — Giữ đủ chất liệu và phần giá/tồn chưa biết, không lấy giá giả định từ ví dụ. Hơi gọn hơn control nhưng vẫn đọc nhiều thuộc tính. Đạt xử lý thiếu nguồn, chưa chứng minh hiệu quả bán hàng hay bước mua đã hoàn tất.

## s11 — B1–12 — candidate

customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ, set váy Thạch Thảo cả bộ có giá 799.000đ chị nhé.
```

**USABLE_WITH_POLISH** — Một câu báo đúng799k cả bộ, không thêm giá lẻ, quảng cáo hay mời size. Dùng ngay; tên nhãn dùng thống nhất không có nghĩa câu bắt buộc cần sửa.

## s12 — B1–12 — control

customer: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Kết quả thực tế (SEND_ELIGIBLE):

```text
Dạ, set váy Thạch Thảo trọn bộ có giá 799.000đ chị nhé.
```

**USABLE_WITH_POLISH** — Một câu báo đúng799k trọn bộ, dùng history đúng, không hỏi lại hay kéo dài. Dùng ngay, tương đương candidate.

## So sánh từng cặp

- B1–7: Candidate dùng được và bỏ lời mời lên đơn ngoài B1; lý do và giọng tương tự control. Không chấm nhẹ hơn để cứu kết quả: ranh giới suy luận thẩm mỹ đã ghi trước run, áp dụng cùng hai arm.

- B1–15: Candidate nêu ưu tiên và lý do theo dịp rõ hơn, nhưng vẫn dài với nhiều lời khen. Cả hai NEEDS_EDIT vì các lý do khác nhau; không dùng nhãn để xóa cải thiện cục bộ.

- B1–23: Cả hai upsell hợp lý; candidate diễn đạt gọn hơn mà giữ hai cách dùng phù hợp. Tiến bộ giọng trong mẫu này, chưa chứng minh ổn định.

- B1–17: Control có lý do so sánh sát ưu tiên nhìn gọn hơn; candidate giữ set bằng lợi ích đồng bộ/giá trị chung. Không yêu cầu đáp án áo lẻ cố định, nhưng chưa thấy lý do tốt để đổi lập trường review.

- B1–3: Cả hai trả phần có nguồn và giữ unknown, candidate hơi gọn hơn. Nguồn thiếu vẫn cản bán hàng, không quy hết cho owner.

- B1–12: Cả hai trả giá một câu. Candidate không lặp đoạn quảng cáo của run trước; đây là quan sát mới, không phải chứng minh đã sửa ổn định.
