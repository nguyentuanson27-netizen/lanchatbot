# Các ca cần sửa và fallback

## b1-1 — ca 2 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Kết quả actual: FALLBACK / FAIL

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual chỉ nhận fallback thay câu hỏi còn đổi màu được không/phí. TerminalFAIL cần diagnosis sau primary; không tự kết luận draft sai chỉ vì bị verifier chặn.

## b1-1 — ca 15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo rất hợp để đi ăn cưới ban ngày vì chất tơ Hàn và ren mềm mại mang lại nét thanh lịch, nhẹ nhàng chứ không bị lồng lộn hay sến sẩm đâu chị ạ. 

Tuy nhiên, vì áo có họa tiết thêu nổi và chân váy ren, nếu chị quen mặc đồ trơn và sợ hơi điệu, mình có thể chọn cách mua áo lẻ (499.000đ) để phối cùng chân váy hoặc quần trơn đơn giản sẵn có trong tủ, vừa giữ được nét sang trọng của chất vải lại rất nhã nhặn, đúng phong cách quen thuộc của chị. Hoặc nếu lấy cả set (799.000đ), form dáng phom nhẹ, có độ bay rũ tự nhiên nên mặc lên vẫn rất tinh tế, không hề quá đà đâu ạ. 

Chị cân nhắc xem lấy nguyên set hay chọn áo lẻ phối đồ nhé ạ!
```

**NEEDS_EDIT** — Khách nhờ shop nói có nên mua vì sợ quá điệu. Reply mở bằng lời khen/phủ định lo lắng, thêm cả áo lẻ và cả set rồi kết thúc chị cân nhắc. Đưa lại quyết định cho khách, chưa chọn một hướng có lý do; lỗi cũ quay lại.

## b1-1 — ca 17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả actual: FALLBACK / FAIL

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual fallback thay lời khuyên cả bộ/áo cho gặp khách; giữ trong denominator, chờ diagnosis draft/verdict sau khóa primary.

## b1-1 — ca 23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Chị lấy cả bộ Thạch Thảo đi ạ! Ngân sách tầm 850 nghìn của chị hoàn toàn vừa vặn vì giá cả bộ là 799.000đ, tính ra tiết kiệm hơn hẳn so với mua lẻ.

Áo tơ thêu nổi kết hợp cùng chân váy ren tơ Hàn mặc lên rất bay bổng và sang, diện đi chơi hay sự kiện đều đẹp. Hơn nữa, chị hoàn toàn có thể tách chiếc áo này ra phối linh hoạt với chân váy đen dáng suông sẵn có để đi làm, vừa thanh lịch lại vừa dễ mặc lại nhiều lần cho nhiều dịp khác nhau ạ.
```

**NEEDS_EDIT** — Khuyên cả bộ với lý do tách phối/mặc nhiều dịp là upsell có thể dùng. Nhưng tiết kiệm hơn hẳn so mua lẻ trong câu hỏi áo499k hay bộ799k không nói rõ comparator là mua riêng cả hai món; dễ làm khách hiểu bộ rẻ hơn lựa chọn áo họ đang cân nhắc. Cần phân biệt đáng mua thêm300k với tiết kiệm tiền, không coi upsell là lỗi.
