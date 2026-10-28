# Tool/history campaign — 21 actual customer outcomes

**STOP.** 21/51 native, 30 NOT_RUN; scoped controls17 complete. Model source9e352f38, post-run privacy fix94cb6b08 was not model-tested.

## 1. sales-discovery-advice:need

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Actual terminal: FALLBACK / FAIL

```text
Phần này em chưa trả lời được, chị nhé.
```

Ảnh capture: 0

FALLBACK: Khách cần chọn bộ đi làm; thực nhận câu chưa trả lời được, không có hướng mua.

## 2. sales-product-gallery:overview

Khách: Cho chị xem ảnh set Thạch Thảo màu be nhé.

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ set váy Thạch Thảo hiện có giá 799.000đ, gồm áo tơ Hàn thêu nổi và chân váy ren mềm mại, có độ rũ tự nhiên ạ. Mẫu này shop sẵn các size từ S đến XL, chị chọn size nào ạ?
```

Ảnh capture: 0

TASK_FAIL: Khách xin ảnh màu be; nhận giá/chất liệu/size và câu hỏi size nhưng không có ảnh hoặc giải thích thiếu ảnh.

## 3. sales-size-advice:height-weight

Khách: Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.

Actual terminal: SEND_ELIGIBLE / PASS

```text
Với chiều cao 1m58, nặng 52kg và sở thích mặc thoải mái, set váy Thạch Thảo chị mặc **size M** là vừa đẹp ạ. 

Set váy hiện có giá 799.000đ và shop đang sẵn hàng, chị cần em hỗ trợ thêm thông tin hoặc lên đơn luôn không ạ?
```

Ảnh capture: 0

USEFUL_WITH_POLISH: Chọn M có SIZE_FIT và giá/tồn đúng nguồn. Tham chiếu chiều cao/cân nặng có liên quan; đoạn nhắc lại nhu cầu và câu hỏi đôi cuối có thể gọn hơn.

## 4. sales-southern-delivery:deadline

Khách: Chị cần bộ này sáng mai, ship về Cần Thơ có kịp không em?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ set váy Thạch Thảo vận chuyển về Cần Thơ dự kiến từ 4 đến 8 ngày nên không kịp giao cho chị vào sáng mai ạ.
```

Ảnh capture: 0

USEFUL: Trả ngay không kịp sáng mai từ ETA 4–8 ngày; không thêm intro/ảnh hoặc khuyên chuẩn bị đồ khác.

## 5. media-overview-next:ask

Khách: Em có ảnh khách mặc bộ Thạch Thảo không?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ bộ Thạch Thảo hiện bên em chưa có ảnh khách mặc thực tế. Em gửi chị xem ảnh mẫu mặc tổng thể của set để mình dễ hình dung form dáng nhé ạ!
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh capture: 2

USEFUL: Nói rõ chưa có feedback của mẫu rồi chủ động gửi ảnh mẫu tổng thể; không giả ảnh shop thành ảnh khách.

## 6. media-overview-next:continue

Khách: Gửi chị ảnh cả bộ nhé.

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ em gửi chị ảnh tổng thể set váy Thạch Thảo ạ!
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh capture: 2

USEFUL: Khách yêu cầu gửi cả bộ; gửi lại đúng ảnh theo yêu cầu. Lịch sử ảnh không thành luật cấm resend.

## 7. media-detail-next:ask

Khách: Bộ Thạch Thảo có ảnh khách mặc chưa em?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ set Thạch Thảo hiện chưa có ảnh feedback khách mặc, em gửi chị ảnh mẫu mặc thực tế để mình dễ hình dung form dáng nhé ạ. Set có giá 799.000đ và đang sẵn các size S, M, L, XL ạ.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh capture: 2

USEFUL_WITH_POLISH: Phân biệt feedback với ảnh mẫu, ảnh được gửi. Giá/size thêm vào chưa cần thiết cho câu hỏi này nhưng câu vẫn dùng được.

## 8. media-detail-next:continue

Khách: Cho chị xem cận phần thêu ở áo nhé.

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ em gửi chị ảnh cận cảnh chi tiết thêu nổi trên áo nhé ạ.
[CODE_IMAGE]
```

Ảnh capture: 1

USEFUL: Đúng ảnh cận TOP theo metadata/capture, lời dẫn ngắn và không kể lại catalog.

## 9. media-and-price:ask

Khách: Em gửi chị ảnh khách mặc bộ Thạch Thảo với. Lấy riêng áo thì bao nhiêu?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ shop chưa có sẵn ảnh feedback khách mặc thực tế, em gửi chị ảnh mẫu mặc set Thạch Thảo nha. Riêng áo lẻ giá 499.000đ, có sẵn các size từ S đến XL ạ.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh capture: 2

USEFUL: Giải quyết cả ảnh thay thế và giá áo lẻ 499k, không vì thiếu feedback mà bỏ phần mua hàng.

## 10. media-and-size:ask

Khách: Cho chị xem gần phần thêu áo Thạch Thảo nhé. Chị cao 1m58, nặng 52kg thì lấy size nào?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Em gửi chị ảnh cận cảnh họa tiết thêu nổi trên áo nhé ạ. Với chiều cao 1m58 và cân nặng 52kg, chị mặc size M là vừa vặn đẹp ạ.
[CODE_IMAGE]
```

Ảnh capture: 1

USEFUL: Có ảnh cận và M từ engine; tham chiếu chiều cao/cân nặng dùng để giải thích size là hợp lý, không tự chấm lỗi vì nhắc fact.

## 11. media-decision:ask

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Actual terminal: SEND_ELIGIBLE / PASS

```text
Chân váy của bộ Thạch Thảo dùng chất ren tơ Hàn mềm với form nhẹ và độ rũ tự nhiên, nên khi mặc lên người tạo cảm giác rất thanh thoát, mềm mại chứ không bị nặng nề hay quá cầu kỳ đâu ạ. Thiết kế kết hợp cùng áo tơ thêu nổi rất sang trọng và nhã nhặn, hoàn toàn phù hợp để chị diện đi ăn cưới buổi trưa. 

Nếu chị vẫn thích sự tối giản hơn nữa, shop có hỗ trợ bán riêng áo thêu (499.000đ) để chị dễ phối đồ. Tuy nhiên, mặc nguyên bộ (799.000đ) sẽ giữ được trọn vẹn nét đồng điệu và nổi bật nhất cho dịp tiệc tùng. Chị thường mặc size gì để em tư vấn chuẩn hơn cho mình nhé ạ?
```

Ảnh capture: 0

NEEDS_EDIT: Dồn mềm/rũ/thanh thoát/sang trọng để trấn an chuyện ren nhiều, chọn hướng mua muộn rồi chuyển sang size. Chưa gỡ băn khoăn bằng lý do trực tiếp, giọng quảng cáo dài.

## 12. opening-ad

Khách: Bộ này bao nhiêu em?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Set váy Thạch Thảo có giá 799.000đ ạ, mẫu này hiện có đủ các size từ S đến XL.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh capture: 2

USEFUL: Đúng mẫu quảng cáo, giá cả bộ 799k, ảnh được capture cùng nhóm và next step không bị kéo dài.

## 13. opening-ad-repeat

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo có giá 799.000đ ạ.
```

Ảnh capture: 0

USEFUL: Trả đúng 799k, ngắn và không gửi lại ảnh khi khách chỉ hỏi lại giá.

## 14. opening-organic

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo có giá 799.000đ, hiện có sẵn các size S, M, L, XL chị nha.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh capture: 2

USEFUL: Giá cả bộ, size còn và ảnh phù hợp một lượt mở đầu hỏi mẫu cụ thể.

## 15. opening-unresolved

Khách: Mẫu này giá sao em?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ, chị gửi giúp em tên mẫu hoặc hình ảnh sản phẩm đang xem để em kiểm tra giá chính xác cho mình nha ạ!
```

Ảnh capture: 0

USEFUL: Chưa xác định mẫu thì hỏi tên/ảnh, không quote một mẫu gần nghĩa thay thế.

## 16. opening-multipart

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo có giá 799.000đ ạ. Chị hoàn toàn có thể mua áo lẻ riêng với giá 499.000đ chị nhé! Sản phẩm có sẵn các size từ S đến XL ạ.
[CODE_IMAGE]
[CODE_IMAGE]
```

Ảnh capture: 2

USEFUL: Trả cả set 799k và áo lẻ 499k, có ảnh; không bỏ ý mua lẻ. Cụm nhấn mạnh có thể gọn nhưng không làm mất mục tiêu.

## 17. stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Actual terminal: SEND_ELIGIBLE / PASS

```text
Em đã thêm áo lẻ Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước (pre-order) chị nhé.
```

Ảnh capture: 0

USEFUL_WITH_POLISH: Thêm đúng áo be M theo lựa chọn khách, báo đặt trước. Có receipt; cách nói thêm vào giỏ và ngoặc tiếng Anh còn mang giọng giao diện.

## 18. stateful-variant-quantity

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Actual terminal: SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY

```text
Giỏ của chị: 2 áo (mẫu “Set váy Thạch Thảo”) màu be, size L. Tổng 978.100đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```

Ảnh capture: 0

USEFUL_WITH_POLISH: Actual reply/giỏ xác nhận 2 áo L và tổng 978100 có ship. Khối mẫu/tổng/đặt trước đúng nhưng giọng code assembler, không tính là owner tư vấn đã cải thiện.

## 19. stateful-quote

Khách: Hai áo cả phí ship là bao nhiêu em?

Actual terminal: SEND_ELIGIBLE / PASS

```text
Tổng 2 áo của mình bao gồm phí giao hàng là 978.100đ chị ạ (giá áo 998.000đ, ưu đãi 49.900đ và phí ship 30.000đ).
```

Ảnh capture: 0

USEFUL_WITH_POLISH: Tổng 978100 gồm ship đúng giỏ. Phép tính trong ngoặc thừa với câu hỏi chỉ cần tổng; không phải lỗi số học.

## 20. stateful-correction

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Actual terminal: SEND_ELIGIBLE / PASS

```text
Dạ em ghi nhận số đo mới của mình (eo 74, mông 96) và giữ nguyên size L cho 2 chiếc áo nhé ạ.
```

Ảnh capture: 0

NEEDS_EDIT: State sửa 74/96 đúng và giữ 2 áo L. Câu báo ghi nhận với ngoặc hồ sơ cứng; đánh giá toàn câu, không phạt tự động vì nhắc hai số mới sửa.

## 21. stateful-request-checkout

Khách: Chị đặt hai áo này nhé, lên đơn cho chị.

Actual terminal: NO_SEND / CHECKOUT_DETAILS_MISSING

```text
Chị cho em [NAME]
```

Ảnh capture: 0

USEFUL: Code đã gửi câu xin tên người nhận để tiếp tục checkout; NO_SEND là terminal model, không phải im lặng. Exact public text được đối chiếu bằng transport SHA256.

Public code-owned text verified by transport hash: “Chị cho em tên người nhận nhé.” Raw redacted capture retained above.
