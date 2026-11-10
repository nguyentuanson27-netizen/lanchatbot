# Toàn bộ18 lượt —6ca ×3

Actual outcome được chấm trước rejected draft/verdict diagnostics. Minor polish không tự làm FAIL; không chấm keyword/câu mẫu.

## r1-case02 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ đơn nhận 10 hôm thì vẫn trong thời hạn đổi 15 ngày của shop nên mình đổi màu được chị nhé. Phí vận chuyển 2 chiều cho đơn đổi là 30.000đ ạ.
```

**USABLE** — Trả đúng còn trong15ngày và phí30k hai chiều, thay thông tin7ngày cũ. Không tự tuyên bố đã duyệt hoặc liệt kê điều kiện đủ.

## r1-case04 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo (SV2447) bên em có các lựa chọn giá như sau ạ:

- **Bộ có váy:** 799.000đ
- **Áo lẻ:** 499.000đ
- **Chân váy lẻ:** 449.000đ

Chị muốn lấy cả set hay mình mua lẻ món nào ạ?
```

**NEEDS_EDIT** — Khách hỏi giá set đã rõ; reply mở bảng cả bộ/áo/váy rồi hỏi lại muốn mua phần nào. Giá đúng nhưng shop tự mở lại quyết định, thay vì trả giá món khách hỏi. Không fail vì bản thân danh sách giá.

Giọng/nội dung cần cải thiện: Mã nội bộ và bảng giá lẻ làm câu trả lời dài hơn nhu cầu.

## r1-case09 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Actual: SEND_ELIGIBLE / PASS

```text
Chị yên tâm, áo dùng tơ Hàn mềm thoáng cùng chân váy ren tơ có độ rũ tự nhiên, form nhẹ nên diện ngoài trời vẫn thoải mái ạ.
```

**USABLE** — Trả thẳng lo bí bằng chất tơ mềm/thoáng và form nhẹ. Đây có thể là nhận xét cảm giác thông thường trong ranh giới đã cho phép, không tự coi nhắc ngoài trời là cam kết kỹ thuật. Chưa có phương án phối/món thay, nên sức tư vấn còn mỏng; không ép mọi câu hỏi chất liệu phải đổi món.

Giọng/nội dung cần cải thiện: Trấn an chung, chưa xử lý sâu việc khách dễ nóng và ở ngoài trời lâu.

## r1-case15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, với phong cách quen mặc đồ trơn của chị thì việc ngại set này hơi điệu là dễ hiểu ạ. 

Tuy nhiên, Set Thạch Thảo sử dụng chất liệu tơ Hàn và ren mềm, form dáng nhẹ nhàng với độ bay và rũ tự nhiên chứ không phải dạng bồng xòe cứng nhắc hay rườm rà. Nhờ vậy mà tổng thể lên người rất thanh nhã, lịch sự và rất hợp không gian tiệc cưới ban ngày.

Nếu chị muốn một bộ trang phục đồng bộ, sang trọng mà vẫn nhã nhặn, chị lấy nguyên set (799.000đ) mặc sẽ rất đẹp và lịch sự. Còn nếu chị vẫn muốn giữ nét giản dị quen thuộc, chị có thể chọn mua áo thêu lẻ (499.000đ) kết hợp với quần hoặc chân váy trơn sẵn có trong tủ, vừa có điểm nhấn tinh tế lại vừa thoải mái với phong cách thường ngày của mình. 

Chị thấy phương án nào hợp ý hơn ạ?
```

**NEEDS_EDIT** — Khách nhờ shop nói có nên mua vì quen đồ trơn. Reply diễn giải dài, đưa cả set và áo lẻ rồi hỏi phương án nào hợp ý; shop chưa đưa được một đề xuất chính giải quyết băn khoăn. Vấn đề là phần chọn mua bị trả lại khách, không phải riêng độ dài.

Giọng/nội dung cần cải thiện: Mở đầu nhắc lại lo lắng; nhiều lời khen thanh nhã/lịch sự/sang trọng/tinh tế cùng ý.

## r1-case17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Actual: SEND_ELIGIBLE / PASS

```text
Đi gặp khách hàng buổi sáng cần sự chỉn chu và gọn gàng, chị lấy áo lẻ (499.000đ) phối cùng quần âu hoặc chân váy ôm sẽ là lựa chọn sắc sảo và chuyên nghiệp hơn chị ạ. Áo tơ Hàn thêu form nhẹ, vừa thanh lịch lại giữ được độ gọn gàng cần thiết cho công việc. 

Còn nếu chị lấy cả bộ (799.000đ), chân váy ren có độ rũ mềm mại sẽ rất duyên dáng nhưng trông sẽ mềm mại, bay bổng hơn chứ không gọn gàng bằng áo mặc cùng đồ công sở.
```

**USABLE** — Chọn áo499k phối đồ công sở, giải thích cả bộ ren có độ bay/rũ điệu hơn. Có so sánh giúp nhu cầu nhìn gọn khi gặp khách; không chỉ nhắc hoàn cảnh.

Giọng/nội dung cần cải thiện: Sắc sảo/chuyên nghiệp/gọn gàng lặp ý; đoạn so sánh có thể gọn hơn.

## r1-case23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Actual: SEND_ELIGIBLE / PASS

```text
Chị lấy **cả bộ (799.000đ)** giúp em nhé, vì mức giá này hoàn toàn vừa vặn trong ngân sách 850 nghìn của mình ạ.

Shop gợi ý cả bộ vì sẽ mang lại cho chị trọn vẹn set áo tơ thêu và chân váy ren tơ mềm mại, diện đi tiệc hay đi chơi rất điệu đà, sang trọng. Đặc biệt, chiếc áo thêu này hoàn toàn có thể tách rời để phối linh hoạt với chân váy đen dáng suông sẵn có của chị, giúp mình nhân đôi cách mặc đi làm hay dạo phố rất tiện. 

Nếu chị muốn tối ưu chi phí hơn nữa thì có thể chọn mua riêng **áo lẻ (499.000đ)** phối cùng chân váy đen cũng rất gọn gàng và hợp mốt ạ. Chị thích phương án nào cứ báo em nha!
```

**USABLE** — Đề xuất chính là bộ799k với thêm cách mặc nguyên set và tách áo phối váy đen; áo499k là lựa chọn tiết giảm chi phí. Upsell có cách dùng, giá hai lựa chọn rõ, không nói bộ rẻ hơn áo. Câu hỏi kết chưa cần nhưng không xóa đề xuất chính.

Giọng/nội dung cần cải thiện: Giúp em, nhắc lại ngân sách và chuỗi tính từ còn gượng; phần mua thêm nên đi vào cách dùng sớm hơn.

## r2-case02 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ mình vẫn đổi được chị nhé! Quy định đổi hàng của shop trong vòng 15 ngày kể từ ngày nhận đơn, nên đơn của mình nhận 10 hôm là vẫn còn trong thời gian hỗ trợ ạ. 

Phí đổi hàng (phí vận chuyển 2 chiều) là 30.000đ chị nha. Chị muốn đổi sang màu nào để em hỗ trợ mình lên đơn đổi ạ?
```

**NEEDS_EDIT** — Mốc15ngày và phí30k đúng, nhưng mời khách chọn màu để bot hỗ trợ lên đơn đổi trong B1 chỉ có công cụ đọc. Đây là bước tiếp theo ngoài khả năng hiện có; không phải lỗi thiếu danh sách điều kiện policy hoặc báo thao tác đã xong.

Giọng/nội dung cần cải thiện: Câu hỏi cuối tạo kỳ vọng shop/bot sẽ thực hiện bước không có tool trong luồng này.

## r2-case04 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo bên em có cả giá mua nguyên bộ lẫn bán lẻ từng món ạ:

- Nguyên bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ

Chị tham khảo xem mình thích lấy nguyên set hay mua lẻ món nào nha chị!
```

**NEEDS_EDIT** — Mở bảng ba lựa chọn và mời khách chọn lại nguyên set hay món lẻ dù khách đã hỏi giá set. Chưa khắc phục lỗi trọng tâm của ca hỏi giá; số tiền vẫn đúng.

Giọng/nội dung cần cải thiện: Phần dẫn và CTA mở thêm lựa chọn không được yêu cầu.

## r2-case09 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Actual: SEND_ELIGIBLE / PASS

```text
Ra ngoài trời lâu và dễ nóng thì chất tơ ren của set Thạch Thảo có thể sẽ hơi bí cho chị. 

Đổi sang **set quần Uyển Hoa (SQ748)** sẽ hợp lý hơn cho không gian sân vườn đấy ạ. Set này dùng vải thô đũi cao cấp có độ thoáng khí và thấm hút rất tốt, giúp chị thoải mái vận động lâu ngoài trời mà vẫn giữ được nét ngọt ngào, thanh lịch với chi tiết áo xếp tầng và họa tiết tinh tế.
```

**USABLE** — Chọn SQ748 thay Thạch Thảo cho sân vườn/dễ nóng. Source capture SQ748 có thô đũi, thoáng khí/thấm hút tốt và quần short; lý do tư vấn gắn với hoàn cảnh mới. Đã xem riêng PUBLIC_CONTEXT_CAPTURE để đối chiếu vật liệu trước khi chấm; không đọc verdict/rejected draft.

Giọng/nội dung cần cải thiện: Phần khen ngọt ngào/thanh lịch cuối tin còn phụ; câu có thể ngắn hơn.

## r2-case15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, nếu chị thường mặc đồ trơn và ngại cảm giác quá điệu đà thì set Thạch Thảo này vẫn là một lựa chọn rất đáng cân nhắc cho dịp đi ăn cưới ban ngày ạ. 

Chất liệu tơ Hàn và ren mềm của set có form nhẹ, độ bay và rũ tự nhiên nên nét đẹp thiên về sự thanh nhã, nhẹ nhàng chứ không bị rườm rà hay phô trương. Họa tiết thêu nổi và ren được tiết chế tinh tế, giữ được nét sang trọng, lịch sự cần có cho tiệc cưới mà không làm chị thấy lạc phong cách thường ngày.

Nếu vẫn lăn tăn, chị có thể chọn mua riêng áo thêu (499.000đ) để phối cùng quần hoặc chân váy trơn sẵn có trong tủ, hoặc chọn chân váy ren (449.000đ) kết hợp với một chiếc áo trơn tối giản. Tuy nhiên, diện nguyên bộ (799.000đ) sẽ mang lại tổng thể đồng điệu và chỉn chu nhất cho buổi tiệc đấy ạ. Chị thấy phương án phối nguyên set hay tách lẻ phù hợp với mình hơn ạ?
```

**NEEDS_EDIT** — Dù nghiêng về cả bộ ở cuối, reply tiếp tục ba cách mua/phối rồi hỏi khách chọn nguyên set hay tách lẻ. Lý do chính vẫn khen form/chất liệu và trấn an không lạc phong cách, chưa giải quyết băn khoăn về gu đồ trơn bằng một đề xuất rõ.

Giọng/nội dung cần cải thiện: Dài, nhiều tính từ và nhắc lại cả nhu cầu trước khi đi vào lựa chọn.

## r2-case17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, gặp khách hàng buổi sáng thì em vẫn khuyên chị lấy **cả bộ** ạ. Áo tơ thêu nổi form nhẹ kết hợp cùng chân váy ren tơ mềm có độ rũ tự nhiên tạo tổng thể vừa thanh lịch, chỉn chu lại rất trang nhã, rất phù hợp khi gặp đối tác. 

Trường hợp chị thích phối cùng quần âu sẵn có ở nhà để tạo cảm giác gọn gàng, năng động hơn, chị có thể lấy áo lẻ (499.000đ). Nhưng để mặc đẹp đồng bộ mà không cần mất công phối đồ, em vẫn ưu tiên chọn cả bộ (799.000đ) cho mình nha chị.
```

**USABLE** — Có đề xuất cả bộ799k với lý do đồng bộ, không mất công phối; áo499k là tradeoff gọn/năng động hơn. Không mặc định phải chọn áo lẻ để PASS. Đề xuất dùng được nhưng lý do giữ cả bộ chưa bám mạnh ưu tiên nhìn gọn của khách.

Giọng/nội dung cần cải thiện: Còn thiên về nhã nhặn/trang nhã/thanh lịch; nên diễn đạt sát nhu cầu gọn hơn.

## r2-case23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Actual: SEND_ELIGIBLE / PASS

```text
Chị lấy áo lẻ (499.000đ) là hợp lý nhất với nhu cầu của mình nha chị. Áo chất tơ Hàn thêu nổi nhẹ nhàng, khi phối cùng chân váy đen dáng suông sẵn có sẽ tạo thành set đồ thanh lịch, rất dễ mặc lại nhiều lần và biến hóa với nhiều phong cách khác nhau. Lựa chọn này vừa giúp chị tận dụng đồ có sẵn, vừa thoải mái nằm trong ngân sách 850 nghìn. 

Còn nếu chị thích diện trọn bộ thiết kế ren tơ đồng điệu để có vẻ ngoài chỉn chu nhất thì bộ có váy (799.000đ) cũng vẫn vừa vặn trong ngân sách để chị cân nhắc nha!
```

**USABLE** — Chọn áo499k tận dụng váy đen khách có và mặc lại nhiều lần; bộ799k là phương án phụ, không mất lựa chọn chính. Đúng hai giá, không nói tiết kiệm sai comparator.

Giọng/nội dung cần cải thiện: Phần vừa ngân sách và cả bộ chỉn chu nhất cuối tin chưa cần; nhiều ý phối linh hoạt khá chung.

## r3-case02 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ vẫn kịp chị nha, quy định hiện tại của shop cho phép đổi hàng trong vòng 15 ngày kể từ khi nhận (đơn của mình mới nhận 10 hôm và còn nguyên tem mác nên mình đổi màu thoải mái ạ). Phí vận chuyển 2 chiều cho việc đổi hàng là 30.000đ chị nhé.
```

**USABLE** — Trả đúng15ngày và30k cho hỏi còn kịp/phí; trong toàn hội thoại đây là tóm tắt thời hạn cho đồ mới cầm xem, không tự coi là lời xét đủ mọi điều kiện. Không giả định khách đã vi phạm điều chưa nói.

Giọng/nội dung cần cải thiện: Ngoặc dài nhắc lại10ngày/tem; đổi màu thoải mái có thể diễn đạt gọn và chính xác hơn.

## r3-case04 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo (SV2447) bên em có cả nguyên bộ lẫn các món lẻ để chị linh hoạt lựa chọn ạ:

- Nguyên bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ

Chị muốn lấy cả bộ hay mình chọn món lẻ nào ạ?
```

**NEEDS_EDIT** — Lần thứ ba vẫn trả bảng các cách mua rồi hỏi lại mua set hay món lẻ. Lỗi mở lại lựa chọn tái diễn3/3; không phải lỗi dữ kiện giá.

Giọng/nội dung cần cải thiện: Đọc lại mã nội bộ và phần linh hoạt lựa chọn thừa.

## r3-case09 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Actual: HANDOFF / STALE

```text
[Không gửi tin cho khách]
```

**UNUSABLE** — Actual không có tin nhắn do HANDOFF/STALE trong B1 không có khả năng handoff thật. Khách không nhận lời tư vấn. Giữ outcome trong denominator; chưa đọc draft/verdict để suy diễn model sai hay lỗi nào làm snapshot stale.

## r3-case15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual: SEND_ELIGIBLE / PASS

```text
Em hiểu lo lắng của chị. Set Thạch Thảo gồm áo tơ thêu nổi và chân váy ren tơ, khi diện nguyên bộ sẽ khá điệu đà và nổi bật hơn so với phong cách đồ trơn quen thuộc của chị.

Đi ăn cưới ban ngày thì thiết kế này rất hợp không khí tươi tắn vì chất tơ và ren có form nhẹ, độ bay và rũ tự nhiên nên mặc lên rất thanh thoát, không bị nặng nề hay cứng nhắc. 

Tuy nhiên, nếu chị vẫn ngại mặc cả bộ quá điệu, mình hoàn toàn có thể chọn mua lẻ từng phần để phù hợp hơn với gu tối giản của mình:
- Chị có thể lấy riêng chiếc áo tơ thêu phối cùng quần hoặc chân váy trơn đơn giản sẵn có trong tủ.
- Hoặc lấy chân váy ren kết hợp với một chiếc áo trơn trơn thanh lịch. 

Chị thấy cách phối lẻ này có vừa ý chị hơn không ạ?
```

**NEEDS_EDIT** — Thừa nhận set điệu nhưng sau đó đưa cả áo lẻ lẫn váy lẻ và hỏi khách thấy cách phối có hợp hơn không. Chưa chọn được một phương án mua/outfit cho khách cần đồ đi ăn cưới. Mô tả không thay cho quyết định shop được nhờ đưa ra.

Giọng/nội dung cần cải thiện: Nhắc lại nhu cầu, nhiều đoạn giải thích và ví dụ phối nhưng vẫn để khách tự chọn.

## r3-case17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Actual: SEND_ELIGIBLE / PASS

```text
Chị lấy áo lẻ (499.000đ) sẽ gọn gàng và phù hợp đi gặp khách hàng hơn chị ạ. Áo chất tơ thêu form nhẹ nhàng, lịch sự, khi phối cùng quần âu hoặc chân váy ôm gọn gàng sẵn có sẽ tạo tổng thể đứng dáng và chuyên nghiệp hơn. 

Còn cả bộ váy ren tơ có độ rũ và bay tự nhiên nhiều hơn, mềm mại và hợp đi tiệc tối hơn là gặp khách hàng buổi sáng cần sự sắc sảo, gọn gàng.
```

**USABLE** — Chọn áo499k, giải thích phối quần âu/váy ôm gọn để gặp khách và so với ren bay/rũ đi tiệc. Quyết định phù hợp hoàn cảnh mới; không khẳng định fit với cơ thể.

Giọng/nội dung cần cải thiện: Lặp gọn gàng, câu dài hơn cần thiết.

## r3-case23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Actual: SEND_ELIGIBLE / PASS

```text
Theo em, chị nên lấy cả bộ (799.000đ) vì mức giá này vẫn nằm gọn trong ngân sách 850 nghìn của chị. 

Set váy Thạch Thảo gồm áo tơ Hàn thêu nổi và chân váy ren tơ Hàn mềm mại, mang đến cho chị vẻ ngoài bay bổng, đồng bộ rất đẹp khi đi chơi hay đi tiệc. Đặc biệt, chiếc áo này hoàn toàn có thể tách rời để phối lịch sự cùng chân váy đen dáng suông sẵn có của chị đi làm, giúp chị linh hoạt thay đổi và nhân đôi cách mặc cho nhiều dịp. 

Nếu chị muốn tối ưu chi phí hơn thì mua riêng áo (499.000đ) phối với chân váy đen cũng rất hợp, nhưng lấy cả bộ sẽ trọn vẹn thiết kế và cho chị nhiều lựa chọn phối đồ hơn ạ.
```

**USABLE** — Chọn bộ799k với hai cách mặc, kể cả áo với váy đen khách có; áo499k được nêu như lựa chọn giảm chi phí. Upsell có lý do dùng lại và không tự nói rẻ hơn áo. Không fail chỉ vì có phương án phụ.

Giọng/nội dung cần cải thiện: Lý do ngân sách đi trước lợi ích mua thêm; nhiều tính từ và cụm nhân đôi cách mặc còn quảng cáo.
