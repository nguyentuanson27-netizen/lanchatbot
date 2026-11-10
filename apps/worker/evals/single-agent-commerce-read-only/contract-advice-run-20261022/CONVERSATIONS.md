# Toàn bộ39lượt và review actual customer outcome

Source `6e38c54104010c7e137481a560b99da21e961e73`. N1, non-blind manual review; actual được chấm trước rejected draft. Hai NO_SEND có code intake/preview đãcapture; B1 chỉ send eligibility, không live send. Verifier quota429 được giữ trong denominator.

## 1. b1 / b1-changed-occasion

Khách: Chị định lấy set Thạch Thảo mặc đi đám cưới.

Shop: Đi đám cưới mặc bộ này đẹp chị ạ.

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Actual (FALLBACK / FAIL):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — VerifierFAIL; actualstaticfallback không giúp khách giải quyết việc mua. Rejected draft được chẩn đoán riêng sau primary.

[Raw](b1/attempt-1.json)

## 2. b1 / b1-current-policy

Khách: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Actual (SEND_ELIGIBLE / PASS):

```text
Dạ, thời hạn đổi hàng bên em là trong vòng 15 ngày kể từ ngày nhận nên đơn của chị nhận 10 hôm vẫn còn kịp đổi màu chị nhé. Phí đổi (vận chuyển 2 chiều) là 30.000đ ạ.
```

**USABLE** — Trả đúng15ngày và phí30k, xét đúng mốc10ngày thay lịch sử7ngày; không ép khách đọc lại checklist.

[Raw](b1/attempt-2.json)

## 3. b1 / b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Actual (SEND_ELIGIBLE / PASS):

```text
Dạ set Thạch Thảo có áo tơ Hàn thêu mềm thoáng với họa tiết nổi, kết hợp cùng chân váy ren tơ Hàn mềm mại có độ bay và rũ tự nhiên chị ạ. Hiện giá và tình trạng tồn kho size M của set này hệ thống chưa hiển thị thông tin để em báo chính xác cho chị được nha.
```

**USABLE** — Trả phần chất liệu đã có và phân biệt giá/tồn chưa đọc được; có polish giọng hệ thống và mô tả dài, chưa thành lỗi quyết định mua ở ca thiếu nguồn.

[Raw](b1/attempt-3.json)

## 4. b1 / b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Actual (SEND_ELIGIBLE / PASS):

```text
Dạ, set váy Thạch Thảo có giá 799.000đ chị nhé. Ngoài ra shop có bán cả áo lẻ (499.000đ) và chân váy lẻ (449.000đ) nếu mình muốn mua rời ạ.
```

**USABLE** — Giá bộ chính rõ; thêm ngắn hai lựa chọn mua rời thật, không mở lại lựa chọn bằng câu hỏi hoặc ép cheapest. Áp cùng chuẩnT0 với baseline.

[Raw](b1/attempt-4.json)

## 5. b1 / b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Actual (SEND_ELIGIBLE / PASS):

```text
Dạ áo Thạch Thảo size M bên em còn hàng chị ạ. Áo bán riêng có giá 499.000đ chị nhé.
```

**USABLE** — Trả đúng áo lẻ M còn hàng và giá499k, ngắn gọn, không khẳng định mặc vừa.

[Raw](b1/attempt-5.json)

## 6. b1 / b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual (SEND_ELIGIBLE / PASS):

```text
Áo dài SD375 hiện có hai lựa chọn cho chị:
- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ
```

**USABLE** — Tìm đúng mã SD375 và phân biệt giá áo/cảbộ; format danh sách ngắn có ích cho hai cách mua, không xem có list là lỗi.

[Raw](b1/attempt-6.json)

## 7. b1 / b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual (SEND_ELIGIBLE / PASS):

```text
Dạ, bộ này mặc đi tiệc ban ngày rất nhã nhặn và không bị rườm rà đâu chị nhé. Chân váy dùng chất liệu ren tơ Hàn mềm, form nhẹ kết hợp độ rũ tự nhiên cùng áo tơ thêu nổi thanh thoát, mang lại nét sang trọng rất vừa vặn cho các buổi tiệc ban ngày.

Trọn bộ có giá 799.000đ, hoàn toàn nằm trong ngân sách 900.000đ của chị ạ.
```

**USABLE** — Đã giải quyết băn khoăn ren/rườm rà theo dịp tiệc và ngân sách; vẫn dài, nhiều tính từ/material recital. Ghi polish, không nhận giọng thuyết phục đã cải thiện.

[Raw](b1/attempt-7.json)

## 8. b1 / b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Actual (SEND_ELIGIBLE / PASS):

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên vẹn và chưa qua sử dụng (chỉ ướm thử bên ngoài), nên trường hợp chị đã mặc đi làm thì bên em không hỗ trợ đổi được ạ.

Nếu sản phẩm đủ điều kiện đổi thông thường, tổng phí vận chuyển 2 chiều là 30.000đ do khách hàng chi trả chị nhé.
```

**USABLE** — Từ chối đúng vì khách đã mặc đi làm và trả câu hỏi phí với phạm vi hàng đủ điều kiện; có thể gọn hơn, không thiếu checklist nào làm sai quyết định.

[Raw](b1/attempt-8.json)

## 9. b1 / b1-changed-occasion-v2

Khách: Chị đang xem set Thạch Thảo để đi tiệc trưa.

Shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Actual (SEND_ELIGIBLE / PASS):

```text
Bộ này dùng chất liệu tơ Hàn và ren tơ mềm, form nhẹ và có độ thoáng tự nhiên nên mặc nhẹ nhàng, không bị nặng nề chị ạ. Tuy nhiên, vì đứng ngoài trời nắng trưa lâu và mình dễ nóng, chị cân nhắc xem có phù hợp với độ chịu nhiệt của mình không nhé ạ.
```

**NEEDS_EDIT** — Không quyết định giúp khách khi chuyển ra sânvườn và dễ nóng; kể chất liệu rồi yêu cầu khách tự cân nhắc độ chịu nhiệt. Lỗi tư vấn cũ, không phải provider/code.

[Raw](b1/attempt-9.json)

## 10. b1 / b1-current-policy-v2

Khách: Lần trước chị nhớ phí đổi là 25 nghìn.

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Actual (SEND_ELIGIBLE / PASS):

```text
Dạ, nhận hàng 12 ngày thì vẫn trong thời hạn 15 ngày đổi hàng chị nha. Với sản phẩm chưa dùng, chị vẫn đổi được size ạ. Phí ship đổi hai chiều là 30.000đ chị nhé.
```

**USABLE** — Xét đúng nhận12ngày còn trong15ngày, hàng chưa dùng; trả phí30k đúng trọng tâm.

[Raw](b1/attempt-10.json)

## 11. b1 / b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-11.json)

## 12. b1 / b1-price-v2

Khách: Chị đang xem bộ Thạch Thảo bên mình.

Khách: Cho chị xin giá cả bộ với em.

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-12.json)

## 13. b1 / b1-component-stock-v2

Khách: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-13.json)

## 14. b1 / b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-14.json)

## 15. b1 / b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-15.json)

## 16. b1 / b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-16.json)

## 17. b1 / b1-changed-occasion-v3

Khách: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

Shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-17.json)

## 18. b1 / b1-current-policy-v3

Khách: Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-18.json)

## 19. b1 / b1-partial-source-v3

Khách: Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-19.json)

## 20. b1 / b1-price-v3

Khách: Nguyên set Thạch Thảo bao nhiêu tiền em?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-20.json)

## 21. b1 / b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-21.json)

## 22. b1 / b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-22.json)

## 23. b1 / b1-buying-concern-v3

Khách: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-23.json)

## 24. b1 / b1-policy-used-v3

Khách: Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](b1/attempt-24.json)

## 25. stateful / stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual (SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY):

```text
Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```

**USABLE** — Owner không được verifier quyết do429 nhưng code phục hồi từ receipt giỏ/tổng/preorder đã ghi. Đây là kết quả code dùng được, không phải owner/verifier PASS.

[Raw](stateful/provider-attempt-1.json)

## 26. stateful / stateful-variant-quantity

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Actual (SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY):

```text
Giỏ của chị: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```

**USABLE** — Giỏ đúng2áo beL/tổng978100 và đặttrước, code recovery sau429; không suy thành model tư vấn tốt hơn.

[Raw](stateful/provider-attempt-2.json)

## 27. stateful / stateful-quote

Khách: Hai áo cả phí ship là bao nhiêu em?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](stateful/provider-attempt-3.json)

## 28. stateful / stateful-correction

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](stateful/provider-attempt-4.json)

## 29. stateful / stateful-request-checkout

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Actual (NO_SEND / CHECKOUT_DETAILS_MISSING):

```text
Chị cho em [NAME]
```

**USABLE** — Actual code intake hỏi một field, không model hóa PII; raw terminal NO_SEND vẫn có câu hỏi đãcapture. Text trong evidence đãredact, không dùng để so giọng tinh tế.

[Raw](stateful/provider-attempt-5.json)

## 30. stateful / stateful-private-checkout

Khách: [Fixture private checkout; synthetic PII được code giữ riêng]

Actual (NO_SEND / PRIVATE_CHECKOUT_COMMITTED):

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

**USABLE** — Actual capture có preview đúng2áo/giảm49900/ship30k/tổng978100/ETApreorder và xácnhận; không gửi PII vào hai model. NO_SEND là model path, không phải khách nhận im lặng.

[Raw](stateful/provider-attempt-6.json)

## 31. stateful / stateful-confirm

Khách: Chốt đơn cho chị nhé.

Actual (HANDOFF / PURCHASE_CONFIRMED):

```text
Dạ, em chuyển nhân viên kiểm tra và lên đơn cho chị nhé.
```

**USABLE** — Handoff đã commit và actual holding reply đưa nhân viên kiểm tra/lên đơn đúng capability; không giả external POS order.

[Raw](stateful/provider-attempt-7.json)

## 32. stateful / stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Actual (HANDOFF / CUSTOMER_REQUESTED_HUMAN):

```text
[Không có reply]
```

**OWNERSHIP_CONTROL** — Đã HUMAN nên im lặng/không gọi model là intended ownership control.

[Raw](stateful/provider-attempt-8.json)

## 33. openings / sales-discovery-advice:need

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Actual (FALLBACK / FAIL):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Khách tìm bộ đi làm dưới1triệu, thực tế chỉ nhận static fallback; chưa được giúp chọn mua. Chưa dùng rejected draft để chấm actual.

[Raw](openings/provider-attempt-1.json)

## 34. openings / sales-product-gallery:overview

Khách: Cho chị xem ảnh set Thạch Thảo màu be nhé.

Actual (SEND_ELIGIBLE / PASS):

```text
Dạ, hiện hệ thống bên em chưa hiển thị được ảnh riêng của set Thạch Thảo màu be này ạ. Set Thạch Thảo có giá 799.000đ (gồm áo tơ Hàn thêu nổi và chân váy ren mềm mại, có độ bay và rũ tự nhiên). Chị cần em tư vấn thêm chi tiết nào về chất liệu hoặc kích thước của set không ạ?
```

**NEEDS_EDIT** — Đã phân biệt chưa có ảnh đúng màu với màu bán, nhưng dùng giọng hệ thống, chen giá/chất liệu không khách hỏi và câu hỏi nối chung chung; yêu cầu ảnh vẫn chưa hoàn thành.

[Raw](openings/provider-attempt-2.json)

## 35. openings / sales-size-advice:height-weight

Khách: Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.

Actual (HANDOFF / SIZE_RULE_UNAVAILABLE):

```text
[Không có reply]
```

**SILENT_HANDOFF** — Đã ghi158cm/52kg vào profile nhưng khách không nhận câu trả lời; handoff SIZE_RULE_UNAVAILABLE cần phân biệt thiếu nguồn size với lỗi hiểu số đo.

[Raw](openings/provider-attempt-3.json)

## 36. openings / sales-southern-delivery:deadline

Khách: Chị cần bộ này sáng thứ Sáu, ship về Cần Thơ có kịp không em?

Actual (SEND_ELIGIBLE / PASS):

```text
Dạ, thời gian vận chuyển set váy Thạch Thảo về Cần Thơ khoảng 4–8 ngày chị nha.
```

**NEEDS_EDIT** — Đã lấy đúng ETA4–8ngày về CầnThơ nhưng chỉ báo khoảng ngày, chưa trả lời rõ yêu cầu cần sáng thứSáu hoặc đưa hướng mua phù hợp. Không phải lỗi resolver còn thiếu dữ kiện.

[Raw](openings/provider-attempt-4.json)

## 37. negotiation / negotiation-cart-setup

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual (SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY):

```text
Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```

**USABLE** — Code receipt recovery xác nhận giỏ529k/preorder sauverifier429, không claim model PASS.

[Raw](negotiation/provider-attempt-1.json)

## 38. negotiation / negotiation-price-objection

Khách: Bớt cho chị chút được không?

Actual (SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY):

```text
Giỏ của chị: 1 áo (mẫu “Set váy Thạch Thảo”) màu be, size M. Ưu đãi 30.000đ. Tổng 499.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```

**USABLE** — Code recovery báo ưuđãi hiệnhành30k và tổng499k saucommit; không gọi giảmthêm/freeship. Giọng giỏhàng vẫn cơhọc làpolish, không bỏ thông tin ưuđãi nhưbaseline.

[Raw](negotiation/provider-attempt-2.json)

## 39. negotiation / negotiation-total-control

Khách: Thế một áo cả ship là bao nhiêu em?

Actual (FALLBACK / PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**FALLBACK** — Verifier429 usage_limit_reached; khách nhận staticfallback. Giữ denominator, không gán thành owner/code regression.

[Raw](negotiation/provider-attempt-3.json)
