# Rerun 19 fallback — actual terminal conversations

Run source: `24d8ec62457f95865c80719a2e0c08fea697c657`. N1, không retry; 19 target và 4 lượt prerequisite tách riêng.

Bản Markdown bỏ khoảng trắng cuối dòng để dễ đọc; exact text và telemetry giữ trong raw JSON/JSONL.
Owner Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol HIGH. Prompt/config không đổi. Không gửi Meta thật.

Stateless B1 giữ input lịch sử trong corpus. Stateful/negotiation dùng cart và history thật được tạo lại trong DB test; không phải replay byte-identical transcript cũ. Verdict PASS là kết quả boundary, không phải điểm chất lượng tư vấn.

## 1. b1-changed-occasion — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-head\attempt-1.json](b1-head/attempt-1.json).

Khách: Chị định lấy set Thạch Thảo mặc đi đám cưới.

Shop trước đó: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

**Actual terminal customer outcome**

```text
Set Thạch Thảo dùng chất tơ và ren mềm, có độ bay tự nhiên nên ngồi xe ô tô gần 3 tiếng sẽ rất dễ bị hằn nếp nhăn chị ạ.

Nếu chị muốn tìm mẫu ít nhăn để đến nơi vẫn giữ form gọn gàng, chị chuyển sang set quần SQ675 giúp em nhé. Set này may bằng chất thô hoa laze phối thô ướt cao cấp, hạn chế nhăn tốt hơn, thiết kế áo tay lửng phối ren nổi cùng quần ống rộng thanh lịch, mặc đi đám cưới vừa sang trọng lại vừa thoải mái di chuyển đường dài.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `FAIL`.

## 2. b1-partial-source-v2 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-11.json](b1-tail/attempt-11.json).

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

**Actual terminal customer outcome**

```text
Chân váy Thạch Thảo dùng chất liệu ren tơ Hàn mềm mại, form nhẹ với độ rũ tự nhiên rất đẹp ạ. Hiện thông tin giá và tình trạng size M bán lẻ của chân váy chưa có sẵn trên hệ thống nên em chưa tra được chính xác cho chị.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 3. b1-price-v2 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-12.json](b1-tail/attempt-12.json).

Khách: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

**Actual terminal customer outcome**

```text
Dạ, set váy Thạch Thảo có giá 799.000đ chị nha.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 4. b1-component-stock-v2 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-13.json](b1-tail/attempt-13.json).

Khách: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

**Actual terminal customer outcome**

```text
Chân váy Thạch Thảo size M bên em còn hàng chị nhé, giá mua riêng là 449.000đ ạ.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 5. b1-search-read-v2 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-14.json](b1-tail/attempt-14.json).

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

**Actual terminal customer outcome**

```text
Dạ, shop có chị nhé! Set váy Khánh Trang hiện có giá 999.000đ nguyên bộ ạ. Ngoài ra shop có bán lẻ áo hoặc chân váy với giá 499.000đ/món. Chị muốn lấy nguyên set hay món lẻ ạ?
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 6. b1-buying-concern-v2 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-15.json](b1-tail/attempt-15.json).

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

**Actual terminal customer outcome**

```text
Đi ăn cưới ban ngày, diện Set Thạch Thảo rất hợp lý vì chất tơ thêu và ren mềm có độ bay, rũ tự nhiên, mang lại cảm giác thanh lịch, trang nhã mà không bị cứng nhắc.

Do chị hay mặc đồ trơn, set gồm cả áo thêu nổi và chân váy ren có thể sẽ hơi nhiều chi tiết hơn phong cách thường ngày của chị. Tuy nhiên, nhờ form dáng nhẹ nhàng và chất vải mềm, bộ đồ lên người rất dịu dàng chứ không quá phô trương. Nếu chị vẫn lăn tăn, shop có bán rời áo lẻ hoặc chân váy lẻ để chị có thể chọn một món kết hợp cùng đồ trơn sẵn có trong tủ, vừa giữ được sự quen thuộc vừa đủ điểm nhấn cho dịp tiệc cưới nhé ạ.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 7. b1-policy-used-v2 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-16.json](b1-tail/attempt-16.json).

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

**Actual terminal customer outcome**

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm chỉ ướm bên ngoài chứ không mặc trực tiếp vào người, nên trường hợp chị đã mặc thử thì shop chưa hỗ trợ đổi size được ạ.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 8. b1-changed-occasion-v3 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-17.json](b1-tail/attempt-17.json).

Khách: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

Shop trước đó: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

**Actual terminal customer outcome**

```text
Đi gặp khách hàng buổi sáng cần sự chỉn chu và gọn gàng, chị lấy áo lẻ (499.000đ) phối cùng quần âu hoặc chân váy ôm sẽ hợp hơn ạ.

Chân váy ren trong set có độ rũ và bay tự nhiên, tạo nét thướt tha mềm mại sẽ hợp với tiệc tối hơn, còn chiếc áo thêu form nhẹ dễ để chị phối đồ gọn gàng, chuyên nghiệp khi gặp đối tác.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 9. b1-current-policy-v3 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-18.json](b1-tail/attempt-18.json).

Khách: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

**Actual terminal customer outcome**

```text
Dạ bên em hiện áp dụng thời gian đổi hàng trong vòng 15 ngày kể từ khi nhận, nên mình nhận hàng 9 ngày thì vẫn đổi size được bình thường chị nha. Phí vận chuyển đổi hàng 2 chiều là 30.000đ ạ.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 10. b1-partial-source-v3 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-19.json](b1-tail/attempt-19.json).

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

**Actual terminal customer outcome**

```text
Dạ, áo của set Thạch Thảo làm bằng chất tơ Hàn thêu nổi, mềm mại, thoáng và có độ bay tự nhiên; còn chân váy là ren tơ Hàn mềm có độ rũ tự nhiên ạ. Về giá và tình trạng còn hàng hiện tại em chưa tra được thông tin, chị tham khảo chất liệu trước giúp em nhé!
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 11. b1-price-v3 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-20.json](b1-tail/attempt-20.json).

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

**Actual terminal customer outcome**

```text
Dạ, nguyên set Thạch Thảo có giá 799.000đ chị nhé.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 12. b1-component-stock-v3 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-21.json](b1-tail/attempt-21.json).

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

**Actual terminal customer outcome**

```text
Dạ áo Thạch Thảo có bán riêng chị nhé. Áo lẻ size M hiện bên em còn hàng, giá 499.000đ ạ.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 13. b1-search-read-v3 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-22.json](b1-tail/attempt-22.json).

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

**Actual terminal customer outcome**

```text
Dạ mẫu Set quần Xuân Thảo (SQ223) nhà em vẫn còn hàng chị nha. Mẫu này shop có cả áo lẻ, quần lẻ và bộ đầy đủ:

- Áo lẻ / Quần lẻ: 429.000đ/món
- Cả bộ có quần: 699.000đ

Chị muốn lấy cả bộ hay mua lẻ món nào ạ?
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 14. b1-buying-concern-v3 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-23.json](b1-tail/attempt-23.json).

Khách: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

**Actual terminal customer outcome**

```text
Chị nên mua riêng **áo Thạch Thảo (499.000đ)** ạ.

Với ngân sách khoảng 850 nghìn và mong muốn mặc lại nhiều lần, chiếc áo tơ thêu nổi form nhẹ này kết hợp cùng chân váy đen dáng suông sẵn có của chị sẽ rất thanh lịch, dễ ứng dụng linh hoạt cho nhiều dịp đi làm hay đi chơi mà vẫn tiết kiệm chi phí.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 15. b1-policy-used-v3 — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [b1-tail\attempt-24.json](b1-tail/attempt-24.json).

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

**Actual terminal customer outcome**

```text
Dạ, chính sách đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem và chưa qua giặt ạ. Do sản phẩm của chị đã cắt tem và giặt rồi nên rất tiếc em không hỗ trợ đổi sang mẫu khác cho mình được, chị thông cảm giúp em nhé!
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 16. sales-discovery-advice:need — TARGET

`FALLBACK` / `FAIL`; evidence: [openings\provider-attempt-1.json](openings/provider-attempt-1.json).

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

**Actual terminal customer outcome**

```text
Phần này em chưa trả lời được, chị nhé.
```

Verifier: `[{"verdict": "FAIL", "violations": [{"kind": "UNSUPPORTED_PROTECTED_ASSERTION", "protectedRef": "product:SQ2447"}]}]`

Draft bị giữ lại, chỉ dùng chẩn đoán sau actual outcome:

```text
Em gợi ý chị Set quần Thạch Thảo, trọn bộ áo và quần có giá 769.000đ, rất vừa vặn với ngân sách dưới 1 triệu của chị ạ.

Set này may từ chất liệu tơ Hàn thêu cao cấp, bề mặt mềm mịn và có độ rũ nhẹ bay bổng. Thiết kế form áo quần nhẹ nhàng, thoải mái, không lo bị bó bụng mà vẫn giữ được nét thanh lịch, rất hợp để diện đi làm.
```

Lượt trước: `FALLBACK` / `FAIL`.

## 17. stateful-open — PREREQUISITE

`SEND_ELIGIBLE` / `PASS`; evidence: [stateful\provider-attempt-1.json](stateful/provider-attempt-1.json).

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Actual terminal customer outcome**

```text
Em đã thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Áo này là hàng đặt trước, chị nhé!
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

## 18. stateful-variant-quantity — PREREQUISITE

`SEND_ELIGIBLE` / `PASS`; evidence: [stateful\provider-attempt-2.json](stateful/provider-attempt-2.json).

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Actual terminal customer outcome**

```text
Em đã đổi sang size L và cập nhật số lượng thành 2 chiếc áo Thạch Thảo màu be cho chị rồi ạ.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

## 19. stateful-quote — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [stateful\provider-attempt-3.json](stateful/provider-attempt-3.json).

Khách: Hai áo cả phí ship là bao nhiêu em?

**Actual terminal customer outcome**

```text
Dạ, tổng tiền 2 áo sau khi áp ưu đãi và cộng phí ship là 978.100đ chị nhé (trong đó tiền áo 998.000đ, ưu đãi giảm 49.900đ và phí vận chuyển 30.000đ).
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 20. stateful-correction — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [stateful\provider-attempt-4.json](stateful/provider-attempt-4.json).

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Actual terminal customer outcome**

```text
Dạ, em đã ghi nhận số đo mới của chị rồi ạ. 2 chiếc áo size L trong giỏ của chị vẫn được giữ nguyên nha chị!
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.

## 21. negotiation-cart-setup — PREREQUISITE

`SEND_ELIGIBLE` / `PASS`; evidence: [negotiation\provider-attempt-1.json](negotiation/provider-attempt-1.json).

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Actual terminal customer outcome**

```text
Em đã thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

## 22. negotiation-price-objection — PREREQUISITE

`SEND_ELIGIBLE` / `RECEIPT_BACKED_CART_SUMMARY`; evidence: [negotiation\provider-attempt-2.json](negotiation/provider-attempt-2.json).

Khách: Bớt cho chị chút được không?

**Actual terminal customer outcome**

```text
Giỏ của chị: 1 áo (mẫu “Set váy Thạch Thảo”) màu be, size M. Ưu đãi 30.000đ. Tổng 499.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```

Verifier: `[{"verdict": "FAIL", "violations": [{"kind": "UNSUPPORTED_PROTECTED_ASSERTION", "protectedRef": "product:SV2447"}]}]`

Draft bị giữ lại, chỉ dùng chẩn đoán sau actual outcome:

```text
Áo lẻ Thạch Thảo giá 499.000đ chị nhé. Mẫu này chất tơ Hàn thêu nổi thủ công nên form mặc rất mềm và bay ạ.

Nếu chị lấy thêm một sản phẩm nữa trong đơn (từ 2 món trở lên), mình sẽ được giảm thêm 5% tổng đơn theo chương trình ưu đãi của shop đó ạ!
```

## 23. negotiation-total-control — TARGET

`SEND_ELIGIBLE` / `PASS`; evidence: [negotiation\provider-attempt-3.json](negotiation/provider-attempt-3.json).

Khách: Thế một áo cả ship là bao nhiêu em?

**Actual terminal customer outcome**

```text
Áo lẻ có giá 499.000đ, phí vận chuyển 30.000đ và được ưu đãi giảm 30.000đ, nên tổng thanh toán cả ship của mình là 499.000đ chị nhé.
```

Verifier: `[{"verdict": "PASS", "violations": []}]`

Lượt trước: `FALLBACK` / `PROVIDER_ERROR`.
